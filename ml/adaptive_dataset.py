import json
import os
import hashlib
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

import chess


WEAKNESS_LOG_NAME = "weakness_log.jsonl"
PRIORITY_QUEUE_NAME = "priority_training_queue.jsonl"
ADAPTIVE_STATE_NAME = "adaptive_state.json"
WEAKNESS_CLUSTER_NAME = "weakness_clusters.json"
NEGATIVES_NAME = "negatives.jsonl"
LEARNING_PROGRESS_REPORT_NAME = "learning_progress.json"
PHASES = ("opening", "midgame", "endgame")
PIECE_ORDER = ("Q", "R", "B", "N", "P")
PHASE_SEVERITY_MULTIPLIER = {
    "opening": 1.0,
    "midgame": 1.15,
    "endgame": 1.35,
}
PHASE_PRIORITY_WEIGHT = {
    "opening": 1.0,
    "midgame": 2.0,
    "endgame": 3.0,
}
DEFAULT_MAX_DUPLICATES_PER_FEN_ERROR = 3
ERROR_ALIASES = {
    "promotion_ignored": "promotion_fail",
    "bad_plan": "blunder",
}
SUPPORTED_ERROR_TYPES = {
    "hanging_piece",
    "bad_trade",
    "missed_mate",
    "promotion_fail",
    "blunder",
}
DEFAULT_MIN_TRAINING_CP_DROP = 120.0
PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0,
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def parse_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return value != 0
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "n", "off"}:
        return False
    return default


def parse_timestamp(value: Any, fallback_rank: int) -> Tuple[float, str]:
    if isinstance(value, str) and value.strip():
        normalized = value.strip().replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(normalized)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.timestamp(), parsed.astimezone(timezone.utc).replace(microsecond=0).isoformat()
        except ValueError:
            pass
    synthetic = datetime.fromtimestamp(float(fallback_rank), tz=timezone.utc)
    return float(fallback_rank), synthetic.replace(microsecond=0).isoformat()


def load_jsonl_rows(path: Path) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    if not path.exists():
        return rows
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def write_jsonl_rows(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=True) + "\n")


def empty_cluster_payload() -> Dict[str, Any]:
    return {
        "schema_version": "weakness_clusters_v1",
        "generated_at": utc_now_iso(),
        "source": WEAKNESS_LOG_NAME,
        "dedup": {
            "max_duplicates_per_fen_error": DEFAULT_MAX_DUPLICATES_PER_FEN_ERROR,
            "raw_entries": 0,
            "kept_entries": 0,
            "dropped_entries": 0,
            "unique_fen_error_pairs": 0,
        },
        "stats": {
            "top_10_errors": [],
            "most_repeated_error_type": None,
            "error_type_totals": {},
            "phase_totals": {},
            "cluster_count": 0,
            "unique_weaknesses": 0,
        },
        "clusters": [],
    }


def ensure_support_files(reverse_root: Path) -> Dict[str, Path]:
    reverse_root.mkdir(parents=True, exist_ok=True)
    weakness_log_path = reverse_root / WEAKNESS_LOG_NAME
    priority_queue_path = reverse_root / PRIORITY_QUEUE_NAME
    adaptive_state_path = reverse_root / ADAPTIVE_STATE_NAME
    weakness_cluster_path = reverse_root / WEAKNESS_CLUSTER_NAME

    if not weakness_log_path.exists():
        weakness_log_path.write_text("", encoding="utf-8")
    if not priority_queue_path.exists():
        priority_queue_path.write_text("", encoding="utf-8")
    if not adaptive_state_path.exists():
        adaptive_state_path.write_text(
            json.dumps(
                {
                    "generated_at": utc_now_iso(),
                    "weakness_entries": 0,
                    "priority_queue_entries": 0,
                    "recent_material_signatures": [],
                    "mastered_material_signatures": [],
                    "most_repeated_error_type": None,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    if not weakness_cluster_path.exists():
        weakness_cluster_path.write_text(json.dumps(empty_cluster_payload(), indent=2), encoding="utf-8")

    return {
        "weakness_log": weakness_log_path,
        "priority_queue": priority_queue_path,
        "adaptive_state": adaptive_state_path,
        "weakness_clusters": weakness_cluster_path,
    }


def piece_counts(board: chess.Board, color: chess.Color) -> Dict[str, int]:
    return {
        "Q": len(board.pieces(chess.QUEEN, color)),
        "R": len(board.pieces(chess.ROOK, color)),
        "B": len(board.pieces(chess.BISHOP, color)),
        "N": len(board.pieces(chess.KNIGHT, color)),
        "P": len(board.pieces(chess.PAWN, color)),
    }


def material_signature_from_fen(fen: str) -> str:
    try:
        board = chess.Board(fen)
    except ValueError:
        return "unknown"

    white = piece_counts(board, chess.WHITE)
    black = piece_counts(board, chess.BLACK)
    white_sig = "".join(f"{piece}{white[piece]}" for piece in PIECE_ORDER)
    black_sig = "".join(f"{piece}{black[piece]}" for piece in PIECE_ORDER)
    return f"W:{white_sig}|B:{black_sig}"


def total_non_king_material(board: chess.Board) -> int:
    total = 0
    for piece in board.piece_map().values():
        if piece.piece_type == chess.KING:
            continue
        total += PIECE_VALUES[piece.piece_type]
    return total


def count_undeveloped_minor_pieces(board: chess.Board) -> int:
    home_squares = {
        chess.B1: chess.Piece(chess.KNIGHT, chess.WHITE),
        chess.G1: chess.Piece(chess.KNIGHT, chess.WHITE),
        chess.C1: chess.Piece(chess.BISHOP, chess.WHITE),
        chess.F1: chess.Piece(chess.BISHOP, chess.WHITE),
        chess.B8: chess.Piece(chess.KNIGHT, chess.BLACK),
        chess.G8: chess.Piece(chess.KNIGHT, chess.BLACK),
        chess.C8: chess.Piece(chess.BISHOP, chess.BLACK),
        chess.F8: chess.Piece(chess.BISHOP, chess.BLACK),
    }
    undeveloped = 0
    for square, piece in home_squares.items():
        if board.piece_at(square) == piece:
            undeveloped += 1
    return undeveloped


def phase_from_fen(fen: str) -> str:
    try:
        board = chess.Board(fen)
    except ValueError:
        return "midgame"

    fullmove = int(board.fullmove_number)
    undeveloped = count_undeveloped_minor_pieces(board)
    non_king_pieces = sum(1 for piece in board.piece_map().values() if piece.piece_type != chess.KING)
    queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(board.pieces(chess.QUEEN, chess.BLACK))
    material_total = total_non_king_material(board)

    if fullmove <= 12 or undeveloped >= 3:
        return "opening"
    if material_total <= 20 or queens == 0 or non_king_pieces <= 10:
        return "endgame"
    return "midgame"


def normalize_error_type(value: Any) -> str:
    normalized = str(value or "blunder").strip().lower()
    normalized = ERROR_ALIASES.get(normalized, normalized)
    if normalized not in SUPPORTED_ERROR_TYPES:
        return "blunder"
    return normalized


def material_focus_key(phase: str, material_signature: str) -> str:
    return f"{phase}|{material_signature}"


def phase_priority_weight(phase: Any) -> float:
    return float(PHASE_PRIORITY_WEIGHT.get(str(phase or "midgame"), 2.0))


def weakness_dedup_key(row: Dict[str, Any]) -> str:
    return "|".join(
        [
            str(row.get("fen") or "").strip(),
            normalize_error_type(row.get("error_type")),
        ]
    )


def weakness_cluster_key(row: Dict[str, Any]) -> str:
    return "|".join(
        [
            str(row.get("material_signature") or "unknown"),
            str(row.get("phase") or "midgame"),
            normalize_error_type(row.get("error_type")),
        ]
    )


def weakness_pattern_key(row: Dict[str, Any]) -> str:
    return weakness_dedup_key(row)


def normalize_logged_weakness(row: Dict[str, Any], fallback_rank: int) -> Dict[str, Any] | None:
    normalized = dict(row)
    fen = str(normalized.get("fen", "") or "").strip()
    if not fen:
        return None

    normalized["fen"] = fen
    normalized["phase"] = str(normalized.get("phase") or phase_from_fen(fen))
    normalized["material_signature"] = str(
        normalized.get("material_signature") or material_signature_from_fen(fen)
    )
    normalized["error_type"] = normalize_error_type(normalized.get("error_type"))
    normalized["cp_drop"] = parse_float(normalized.get("cp_drop"), default=0.0)
    normalized["move_played"] = str(
        normalized.get("move_played") or normalized.get("bad_move") or ""
    ).strip()
    normalized["best_move"] = str(
        normalized.get("best_move") or normalized.get("good_move") or ""
    ).strip()
    normalized["reply_scan_penalty"] = parse_int(normalized.get("reply_scan_penalty"), 0)
    normalized["tactical_penalty"] = parse_int(normalized.get("tactical_penalty"), 0)
    normalized["has_reply_scan_evidence"] = parse_bool(
        normalized.get("has_reply_scan_evidence"),
        default=normalized["reply_scan_penalty"] > 0,
    )
    normalized["has_tactical_evidence"] = parse_bool(
        normalized.get("has_tactical_evidence"),
        default=normalized["tactical_penalty"] > 0,
    )
    normalized["has_evidence"] = bool(
        normalized["has_reply_scan_evidence"] or normalized["has_tactical_evidence"]
    )

    timestamp_value, logged_at = parse_timestamp(
        normalized.get("logged_at") or normalized.get("created_at"),
        fallback_rank=fallback_rank,
    )
    normalized["timestamp"] = timestamp_value
    normalized["logged_at"] = logged_at
    normalized["pattern_key"] = weakness_pattern_key(normalized)
    normalized["cluster_key"] = weakness_cluster_key(normalized)
    return normalized


def max_logged_duplicates_per_key() -> int:
    return max(
        parse_int(
            os.environ.get("TCS_WEAKNESS_MAX_DUPLICATES_PER_FEN_ERROR"),
            DEFAULT_MAX_DUPLICATES_PER_FEN_ERROR,
        ),
        1,
    )


def stabilize_weakness_log(rows: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    normalized_rows: List[Dict[str, Any]] = []
    raw_counts = Counter()

    for line_index, row in enumerate(rows, start=1):
        normalized = normalize_logged_weakness(row, fallback_rank=line_index)
        if normalized is None:
            continue
        raw_counts[str(normalized["pattern_key"])] += 1
        normalized_rows.append(normalized)

    max_duplicates = max_logged_duplicates_per_key()
    kept_counts = Counter()
    dropped_counts = Counter()
    stabilized_rows: List[Dict[str, Any]] = []

    sorted_rows = sorted(
        normalized_rows,
        key=lambda current: (float(current.get("timestamp", 0.0)), str(current.get("logged_at", ""))),
        reverse=True,
    )
    for row in sorted_rows:
        key = str(row["pattern_key"])
        if kept_counts[key] >= max_duplicates:
            dropped_counts[key] += 1
            continue
        kept_counts[key] += 1
        stabilized = dict(row)
        stabilized["dedup_rank"] = kept_counts[key]
        stabilized["raw_repeat_count"] = raw_counts[key]
        stabilized_rows.append(stabilized)

    stabilized_rows.sort(
        key=lambda current: (float(current.get("timestamp", 0.0)), str(current.get("pattern_key", "")))
    )
    for row in stabilized_rows:
        key = str(row["pattern_key"])
        row["kept_repeat_count"] = kept_counts[key]
        row["dropped_repeat_count"] = dropped_counts[key]

    summary = {
        "max_duplicates_per_fen_error": max_duplicates,
        "raw_entries": len(normalized_rows),
        "kept_entries": len(stabilized_rows),
        "dropped_entries": max(len(normalized_rows) - len(stabilized_rows), 0),
        "unique_fen_error_pairs": len(raw_counts),
        "raw_counts": dict(raw_counts),
        "kept_counts": dict(kept_counts),
        "dropped_counts": dict(dropped_counts),
    }
    return stabilized_rows, summary


def weakness_repetition_factor(raw_repeat_count: int) -> float:
    effective_repeat_count = max(1, min(int(raw_repeat_count), max_logged_duplicates_per_key()))
    return float(max(0, effective_repeat_count - 1) * 15)


def weakness_severity(row: Dict[str, Any]) -> Tuple[float, float, float]:
    abs_cp_drop = abs(parse_float(row.get("cp_drop"), default=0.0))
    repetition_factor = weakness_repetition_factor(int(row.get("raw_repeat_count", row.get("count", 1))))
    phase_multiplier = PHASE_SEVERITY_MULTIPLIER.get(str(row.get("phase") or "midgame"), 1.0)
    severity = round((abs_cp_drop + repetition_factor) * phase_multiplier, 4)
    return severity, repetition_factor, phase_multiplier


def load_reverse_negative_rows(reverse_root: Path) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for phase in PHASES:
        path = reverse_root / phase / "negative.jsonl"
        for row in load_jsonl_rows(path):
            normalized = dict(row)
            normalized.setdefault("phase", phase)
            normalized["error_type"] = normalize_error_type(normalized.get("bad_reason"))
            normalized.setdefault(
                "material_signature",
                material_signature_from_fen(str(normalized.get("fen", "") or "")),
            )
            rows.append(normalized)
    return rows


def aggregate_weaknesses(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[str, Dict[str, Any]] = {}

    for row in rows:
        normalized = dict(row)
        fen = str(normalized.get("fen", "") or "").strip()
        if not fen:
            continue

        key = str(normalized.get("pattern_key") or weakness_pattern_key(normalized))
        timestamp_value = parse_float(normalized.get("timestamp"), default=0.0)
        logged_at = str(normalized.get("logged_at") or "")
        current = grouped.get(key)

        if current is None:
            move_variants = Counter()
            move_played = str(normalized.get("move_played") or "").strip()
            if move_played:
                move_variants[move_played] += 1
            grouped[key] = {
                "pattern_key": key,
                "cluster_key": str(normalized.get("cluster_key") or weakness_cluster_key(normalized)),
                "fen": fen,
                "move_played": move_played,
                "best_move": str(normalized.get("best_move") or "").strip(),
                "error_type": normalize_error_type(normalized.get("error_type")),
                "cp_drop": parse_float(normalized.get("cp_drop"), default=0.0),
                "phase": str(normalized.get("phase") or phase_from_fen(fen)),
                "material_signature": str(
                    normalized.get("material_signature") or material_signature_from_fen(fen)
                ),
                "count": 1,
                "raw_repeat_count": parse_int(normalized.get("raw_repeat_count"), 1),
                "kept_repeat_count": parse_int(normalized.get("kept_repeat_count"), 1),
                "dropped_repeat_count": parse_int(normalized.get("dropped_repeat_count"), 0),
                "timestamp": timestamp_value,
                "logged_at": logged_at,
                "move_played_variants": move_variants,
                "reply_scan_penalty": parse_int(normalized.get("reply_scan_penalty"), 0),
                "tactical_penalty": parse_int(normalized.get("tactical_penalty"), 0),
                "has_reply_scan_evidence": bool(normalized.get("has_reply_scan_evidence", False)),
                "has_tactical_evidence": bool(normalized.get("has_tactical_evidence", False)),
            }
            continue

        current["count"] += 1
        current["raw_repeat_count"] = max(
            int(current["raw_repeat_count"]),
            parse_int(normalized.get("raw_repeat_count"), 1),
        )
        current["kept_repeat_count"] = max(
            int(current["kept_repeat_count"]),
            parse_int(normalized.get("kept_repeat_count"), 1),
        )
        current["dropped_repeat_count"] = max(
            int(current["dropped_repeat_count"]),
            parse_int(normalized.get("dropped_repeat_count"), 0),
        )

        candidate_cp_drop = parse_float(normalized.get("cp_drop"), default=0.0)
        if abs(candidate_cp_drop) >= abs(float(current["cp_drop"])):
            current["cp_drop"] = candidate_cp_drop

        current["reply_scan_penalty"] = max(
            int(current.get("reply_scan_penalty", 0)),
            parse_int(normalized.get("reply_scan_penalty"), 0),
        )
        current["tactical_penalty"] = max(
            int(current.get("tactical_penalty", 0)),
            parse_int(normalized.get("tactical_penalty"), 0),
        )
        current["has_reply_scan_evidence"] = bool(
            current.get("has_reply_scan_evidence", False)
            or bool(normalized.get("has_reply_scan_evidence", False))
        )
        current["has_tactical_evidence"] = bool(
            current.get("has_tactical_evidence", False)
            or bool(normalized.get("has_tactical_evidence", False))
        )

        if timestamp_value >= float(current["timestamp"]):
            current["fen"] = fen
            current["move_played"] = str(normalized.get("move_played") or "").strip()
            current["best_move"] = str(normalized.get("best_move") or "").strip()
            current["timestamp"] = timestamp_value
            current["logged_at"] = logged_at

        move_played = str(normalized.get("move_played") or "").strip()
        if move_played:
            current["move_played_variants"][move_played] += 1

    aggregated = list(grouped.values())
    recent_order = sorted(
        aggregated,
        key=lambda current: (float(current["timestamp"]), int(current["raw_repeat_count"])),
        reverse=True,
    )
    for recency_rank, row in enumerate(recent_order):
        row["recency_rank"] = recency_rank

    for row in aggregated:
        severity, repetition_factor, phase_multiplier = weakness_severity(row)
        repetition_count = int(row.get("raw_repeat_count", row.get("count", 1)))
        cp_drop_value = abs(parse_float(row.get("cp_drop"), default=0.0))
        phase_weight = phase_priority_weight(row.get("phase"))
        row["severity"] = severity
        row["repetition_count"] = repetition_count
        row["phase_weight"] = phase_weight
        row["has_evidence"] = bool(
            row.get("has_reply_scan_evidence", False) or row.get("has_tactical_evidence", False)
        )
        row["evidence_summary"] = {
            "reply_scan_penalty": int(row.get("reply_scan_penalty", 0)),
            "tactical_penalty": int(row.get("tactical_penalty", 0)),
            "has_reply_scan_evidence": bool(row.get("has_reply_scan_evidence", False)),
            "has_tactical_evidence": bool(row.get("has_tactical_evidence", False)),
        }
        row["severity_components"] = {
            "abs_cp_drop": cp_drop_value,
            "repetition_factor": repetition_factor,
            "phase_multiplier": phase_multiplier,
        }
        row["move_played_variants"] = [
            {"move": move, "count": count}
            for move, count in row["move_played_variants"].most_common(3)
        ]
        priority_score = cp_drop_value + repetition_count + phase_weight
        if repetition_count <= 1:
            priority_score *= 0.5
        row["priority_score"] = round(priority_score, 4)

    aggregated.sort(
        key=lambda row: (
            parse_float(row.get("priority_score"), default=0.0),
            parse_float(row.get("severity"), default=0.0),
            int(row.get("repetition_count", row.get("raw_repeat_count", 1))),
            float(row.get("timestamp", 0.0)),
        ),
        reverse=True,
    )
    return aggregated


def build_weakness_clusters(
    weaknesses: List[Dict[str, Any]],
    dedup_summary: Dict[str, Any],
) -> Dict[str, Any]:
    clusters: Dict[str, Dict[str, Any]] = {}
    error_type_totals = Counter()
    phase_totals = Counter()

    for weakness in weaknesses:
        cluster_key = str(weakness.get("cluster_key") or weakness_cluster_key(weakness))
        error_type = normalize_error_type(weakness.get("error_type"))
        phase = str(weakness.get("phase") or "midgame")
        raw_repeat_count = int(weakness.get("raw_repeat_count", weakness.get("count", 1)))
        kept_repeat_count = int(weakness.get("kept_repeat_count", weakness.get("count", 1)))
        severity = parse_float(weakness.get("severity"), default=0.0)

        error_type_totals[error_type] += raw_repeat_count
        phase_totals[phase] += raw_repeat_count

        cluster = clusters.get(cluster_key)
        if cluster is None:
            cluster = {
                "cluster_key": cluster_key,
                "material_signature": str(weakness.get("material_signature") or "unknown"),
                "phase": phase,
                "error_type": error_type,
                "weakness_count": 0,
                "raw_occurrences": 0,
                "kept_occurrences": 0,
                "total_severity": 0.0,
                "max_severity": 0.0,
                "top_examples": [],
            }
            clusters[cluster_key] = cluster

        cluster["weakness_count"] += 1
        cluster["raw_occurrences"] += raw_repeat_count
        cluster["kept_occurrences"] += kept_repeat_count
        cluster["total_severity"] = round(cluster["total_severity"] + severity, 4)
        cluster["max_severity"] = round(max(cluster["max_severity"], severity), 4)
        cluster["top_examples"].append(
            {
                "pattern_key": str(weakness.get("pattern_key") or ""),
                "fen": str(weakness.get("fen") or ""),
                "move_played": str(weakness.get("move_played") or ""),
                "best_move": str(weakness.get("best_move") or ""),
                "cp_drop": parse_float(weakness.get("cp_drop"), default=0.0),
                "severity": severity,
                "raw_repeat_count": raw_repeat_count,
                "kept_repeat_count": kept_repeat_count,
            }
        )

    sorted_clusters: List[Dict[str, Any]] = []
    for cluster in clusters.values():
        cluster["avg_severity"] = round(
            cluster["total_severity"] / max(cluster["weakness_count"], 1),
            4,
        )
        cluster["top_examples"].sort(
            key=lambda row: (
                parse_float(row.get("severity"), default=0.0),
                int(row.get("raw_repeat_count", 1)),
            ),
            reverse=True,
        )
        cluster["top_examples"] = cluster["top_examples"][:3]
        sorted_clusters.append(cluster)

    sorted_clusters.sort(
        key=lambda row: (
            parse_float(row.get("total_severity"), default=0.0),
            int(row.get("raw_occurrences", 0)),
            int(row.get("weakness_count", 0)),
        ),
        reverse=True,
    )

    top_10_errors = [
        {
            "pattern_key": str(row.get("pattern_key") or ""),
            "fen": str(row.get("fen") or ""),
            "error_type": str(row.get("error_type") or ""),
            "phase": str(row.get("phase") or ""),
            "material_signature": str(row.get("material_signature") or ""),
            "cp_drop": parse_float(row.get("cp_drop"), default=0.0),
            "severity": parse_float(row.get("severity"), default=0.0),
            "raw_repeat_count": int(row.get("raw_repeat_count", row.get("count", 1))),
            "kept_repeat_count": int(row.get("kept_repeat_count", row.get("count", 1))),
        }
        for row in sorted(
            weaknesses,
            key=lambda current: (
                parse_float(current.get("severity"), default=0.0),
                int(current.get("raw_repeat_count", 1)),
                float(current.get("timestamp", 0.0)),
            ),
            reverse=True,
        )[:10]
    ]

    most_repeated_error_type = None
    if error_type_totals:
        top_error, top_count = max(error_type_totals.items(), key=lambda item: (item[1], item[0]))
        most_repeated_error_type = {
            "error_type": top_error,
            "raw_occurrences": int(top_count),
            "unique_positions": sum(
                1 for row in weaknesses if normalize_error_type(row.get("error_type")) == top_error
            ),
        }

    return {
        "schema_version": "weakness_clusters_v1",
        "generated_at": utc_now_iso(),
        "source": WEAKNESS_LOG_NAME,
        "dedup": {
            "max_duplicates_per_fen_error": int(
                dedup_summary.get("max_duplicates_per_fen_error", DEFAULT_MAX_DUPLICATES_PER_FEN_ERROR)
            ),
            "raw_entries": int(dedup_summary.get("raw_entries", 0)),
            "kept_entries": int(dedup_summary.get("kept_entries", 0)),
            "dropped_entries": int(dedup_summary.get("dropped_entries", 0)),
            "unique_fen_error_pairs": int(dedup_summary.get("unique_fen_error_pairs", 0)),
        },
        "stats": {
            "top_10_errors": top_10_errors,
            "most_repeated_error_type": most_repeated_error_type,
            "error_type_totals": dict(sorted(error_type_totals.items())),
            "phase_totals": dict(sorted(phase_totals.items())),
            "cluster_count": len(sorted_clusters),
            "unique_weaknesses": len(weaknesses),
        },
        "clusters": sorted_clusters,
    }


def weakness_similarity_score(weakness: Dict[str, Any], candidate: Dict[str, Any]) -> float:
    score = 0.0

    if str(candidate.get("fen") or "") == str(weakness.get("fen") or ""):
        score += 500.0

    if str(candidate.get("phase") or "") == str(weakness.get("phase") or ""):
        score += 45.0

    if str(candidate.get("material_signature") or "") == str(weakness.get("material_signature") or ""):
        score += 35.0

    if normalize_error_type(candidate.get("error_type")) == normalize_error_type(weakness.get("error_type")):
        score += 80.0

    move_played = str(weakness.get("move_played") or "").strip()
    if move_played and move_played in list(candidate.get("bad_moves") or []):
        score += 70.0

    best_move = str(weakness.get("best_move") or "").strip()
    if best_move and best_move == str(candidate.get("good_move") or "").strip():
        score += 40.0

    if move_played and best_move and move_played != best_move:
        score += 5.0

    return score


def build_priority_queue_entry(
    weakness: Dict[str, Any],
    candidate: Dict[str, Any],
) -> Dict[str, Any]:
    best_move = str(candidate.get("good_move") or weakness.get("best_move") or "").strip()
    candidate_bad_moves = [str(move) for move in (candidate.get("bad_moves") or []) if str(move).strip()]
    weakness_move = str(weakness.get("move_played") or "").strip()
    bad_moves: List[str] = []
    if weakness_move and weakness_move != best_move:
        bad_moves.append(weakness_move)
    for move in candidate_bad_moves:
        if move not in bad_moves and move != best_move:
            bad_moves.append(move)

    repeat_count = int(weakness.get("repetition_count", weakness.get("raw_repeat_count", weakness.get("count", 1))))
    recency_rank = int(weakness.get("recency_rank", 0))
    severity = parse_float(weakness.get("severity"), default=0.0)
    solved_decay_factor = parse_float(weakness.get("solved_decay_factor"), default=1.0)
    priority_score = parse_float(weakness.get("priority_score"), default=0.0)
    adaptive_weight = 1.0
    adaptive_weight += min(repeat_count - 1, 4) * 0.25
    adaptive_weight += max(0.0, 1.0 - (recency_rank / 8.0)) * 0.75
    adaptive_weight += min(abs(parse_float(weakness.get("cp_drop"), default=0.0)) / 400.0, 0.5)
    adaptive_weight += min(severity / 800.0, 0.5)
    adaptive_weight *= max(solved_decay_factor, 0.1)

    return {
        "sample_id": f"adaptive::{candidate.get('sample_id', 'unknown')}::{weakness.get('pattern_key', 'unknown')}",
        "fen": candidate.get("fen"),
        "best_move": best_move,
        "good_move": best_move,
        "bad_moves": bad_moves,
        "sequence": list(candidate.get("sequence") or []),
        "phase": str(candidate.get("phase") or weakness.get("phase") or "midgame"),
        "material_signature": str(
            candidate.get("material_signature") or weakness.get("material_signature") or "unknown"
        ),
        "policy_only": True,
        "top_moves": [best_move] if best_move else [],
        "top_scores": [1.0] if best_move else [],
        "error_type": normalize_error_type(weakness.get("error_type")),
        "cp_drop": parse_float(weakness.get("cp_drop"), default=0.0),
        "repetition_count": repeat_count,
        "phase_weight": parse_float(weakness.get("phase_weight"), default=phase_priority_weight(weakness.get("phase"))),
        "priority_score": priority_score,
        "solved_decay_factor": solved_decay_factor,
        "is_solved": bool(weakness.get("is_solved", False)),
        "confidence_score": parse_float(weakness.get("confidence_score"), default=0.0),
        "is_uncertain": bool(weakness.get("is_uncertain", False)),
        "adaptive_source": "recent_weakness",
        "adaptive_bucket": "priority",
        "adaptive_weight": round(adaptive_weight, 4),
        "weakness_repeat_count": repeat_count,
        "weakness_kept_repeat_count": int(weakness.get("kept_repeat_count", weakness.get("count", 1))),
        "weakness_logged_at": weakness.get("logged_at"),
        "weakness_pattern_key": weakness.get("pattern_key"),
        "weakness_severity": severity,
        "source_reverse_sample_id": candidate.get("sample_id"),
        "source_reverse_quality": candidate.get("quality"),
        "source_reverse_type": candidate.get("type"),
    }


def weakness_solved_decay(weakness: Dict[str, Any], recent_window: int) -> Tuple[bool, float]:
    repetition_count = int(weakness.get("repetition_count", weakness.get("raw_repeat_count", weakness.get("count", 1))))
    recency_rank = int(weakness.get("recency_rank", 0))
    if repetition_count > 1 or recency_rank < recent_window:
        return False, 1.0

    solved_age = recency_rank - recent_window + 1
    decay_factor = max(0.25, round(1.0 - min(solved_age, 15) * 0.05, 4))
    return True, decay_factor


def stable_hard_negative_id(weakness: Dict[str, Any]) -> str:
    payload = "|".join(
        [
            str(weakness.get("pattern_key") or ""),
            str(weakness.get("fen") or ""),
            str(weakness.get("move_played") or ""),
            str(weakness.get("best_move") or ""),
        ]
    )
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]
    return f"hard-negative::{digest}"


def build_hard_negative_entry(
    weakness: Dict[str, Any],
    candidate: Dict[str, Any] | None,
    recent_window: int,
) -> Dict[str, Any]:
    fen = str((candidate or {}).get("fen") or weakness.get("fen") or "").strip()
    bad_move = str(weakness.get("move_played") or "").strip()
    punishment_move = str((candidate or {}).get("good_move") or weakness.get("best_move") or "").strip()
    phase = str((candidate or {}).get("phase") or weakness.get("phase") or "midgame")
    material_signature = str(
        (candidate or {}).get("material_signature") or weakness.get("material_signature") or "unknown"
    )
    is_solved, solved_decay_factor = weakness_solved_decay(weakness, recent_window)
    priority_score = parse_float(weakness.get("priority_score"), default=0.0)

    return {
        "sample_id": stable_hard_negative_id(weakness),
        "schema_version": "reverse_dataset_hard_negative_v4",
        "fen": fen,
        "good_move": punishment_move,
        "best_move": punishment_move,
        "bad_move": bad_move,
        "punishment_move": punishment_move,
        "bad_moves": [bad_move] if bad_move and bad_move != punishment_move else [],
        "sequence": list((candidate or {}).get("sequence") or []),
        "phase": phase,
        "quality": "adaptive",
        "type": "negative",
        "material_signature": material_signature,
        "engine_eval": None,
        "trainable": bool(fen and punishment_move),
        "mirror_of": None,
        "bad_reason": normalize_error_type(weakness.get("error_type")),
        "error_type": normalize_error_type(weakness.get("error_type")),
        "cp_drop": parse_float(weakness.get("cp_drop"), default=0.0),
        "repetition_count": int(weakness.get("repetition_count", 1)),
        "phase_weight": parse_float(weakness.get("phase_weight"), default=phase_priority_weight(phase)),
        "priority_score": priority_score,
        "solved_decay_factor": solved_decay_factor,
        "is_solved": is_solved,
        "confidence_score": parse_float(weakness.get("confidence_score"), default=0.0),
        "is_uncertain": bool(weakness.get("is_uncertain", False)),
        "is_hard_negative": True,
        "adaptive_source": "weakness_log",
        "weakness_pattern_key": str(weakness.get("pattern_key") or ""),
        "weakness_logged_at": weakness.get("logged_at"),
        "tags": [
            "type:negative",
            "adaptive:hard_negative",
            f"phase:{phase}",
            f"error:{normalize_error_type(weakness.get('error_type'))}",
        ],
    }


def hard_negative_row_key(row: Dict[str, Any]) -> str:
    bad_moves = list(row.get("bad_moves") or [])
    bad_move = str(row.get("bad_move") or (bad_moves[0] if bad_moves else "")).strip()
    return "|".join(
        [
            str(row.get("fen") or "").strip(),
            str(row.get("good_move") or row.get("best_move") or "").strip(),
            bad_move,
            normalize_error_type(row.get("bad_reason") or row.get("error_type")),
        ]
    )


def build_hard_negative_rows(
    weaknesses: List[Dict[str, Any]],
    reverse_negatives: List[Dict[str, Any]],
    recent_window: int,
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for weakness in weaknesses:
        ranked_candidates = sorted(
            reverse_negatives,
            key=lambda candidate: (
                weakness_similarity_score(weakness, candidate),
                str(candidate.get("sample_id") or ""),
            ),
            reverse=True,
        )
        candidate = ranked_candidates[0] if ranked_candidates and weakness_similarity_score(weakness, ranked_candidates[0]) > 0 else None
        rows.append(build_hard_negative_entry(weakness, candidate, recent_window))
    return rows


def weakness_training_filter(
    weakness: Dict[str, Any],
    min_cp_drop: float,
) -> Tuple[bool, List[str], float, bool]:
    reasons: List[str] = []
    score = 1.0

    best_move = str(weakness.get("best_move") or "").strip()
    move_played = str(weakness.get("move_played") or "").strip()
    abs_cp_drop = abs(parse_float(weakness.get("cp_drop"), default=0.0))
    repetition_count = max(
        int(weakness.get("repetition_count", weakness.get("raw_repeat_count", weakness.get("count", 1)))),
        1,
    )
    has_evidence = bool(
        weakness.get("has_reply_scan_evidence", False) or weakness.get("has_tactical_evidence", False)
    )
    is_uncertain = False

    if not best_move:
        reasons.append("missing_best_move")
        score -= 0.6

    if move_played and best_move and move_played == best_move:
        reasons.append("played_move_equals_best_move")
        score -= 0.9

    if abs_cp_drop < min_cp_drop:
        reasons.append("cp_drop_below_threshold")
        score -= 0.35

    if not has_evidence:
        reasons.append("missing_reply_scan_or_tactical_evidence")
        score -= 0.75

    if not move_played:
        score -= 0.1
        is_uncertain = True

    if repetition_count <= 1:
        score -= 0.15
        is_uncertain = True
    if has_evidence and repetition_count > 1:
        score += 0.05

    confidence_score = round(max(min(score, 1.0), 0.0), 4)
    if confidence_score < 0.75:
        is_uncertain = True

    return len(reasons) == 0, reasons, confidence_score, is_uncertain


def partition_weaknesses_for_training(
    weaknesses: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    accepted: List[Dict[str, Any]] = []
    rejected: List[Dict[str, Any]] = []
    rejection_reasons = Counter()
    uncertain_count = 0
    confidence_scores: List[float] = []
    min_cp_drop = max(
        parse_float(
            os.environ.get("TCS_WEAKNESS_MIN_TRAINING_CP_DROP"),
            DEFAULT_MIN_TRAINING_CP_DROP,
        ),
        0.0,
    )

    for weakness in weaknesses:
        accepted_for_training, reasons, confidence_score, is_uncertain = weakness_training_filter(
            weakness,
            min_cp_drop=min_cp_drop,
        )
        annotated = dict(weakness)
        annotated["confidence_score"] = confidence_score
        annotated["training_confidence"] = confidence_score
        annotated["is_uncertain"] = is_uncertain
        annotated["single_occurrence"] = int(
            weakness.get("repetition_count", weakness.get("raw_repeat_count", weakness.get("count", 1)))
        ) <= 1
        annotated["accepted_for_training"] = accepted_for_training
        annotated["training_filter_reasons"] = reasons
        if is_uncertain:
            uncertain_count += 1
        confidence_scores.append(confidence_score)

        if accepted_for_training:
            accepted.append(annotated)
            continue

        rejected.append(annotated)
        for reason in reasons:
            rejection_reasons[reason] += 1

    return accepted, rejected, {
        "min_cp_drop": round(min_cp_drop, 4),
        "accepted": len(accepted),
        "rejected": len(rejected),
        "uncertain": uncertain_count,
        "rejection_reasons": dict(sorted(rejection_reasons.items())),
        "avg_training_confidence": round(
            sum(confidence_scores) / max(len(confidence_scores), 1),
            4,
        ),
    }


def queue_pattern_concentration(priority_queue: List[Dict[str, Any]]) -> Dict[str, Any]:
    pattern_counts = Counter(
        str(row.get("weakness_pattern_key") or "") for row in priority_queue
    )
    pattern_counts.pop("", None)

    top_patterns = [
        {"pattern_key": pattern_key, "rows": int(count)}
        for pattern_key, count in pattern_counts.most_common(10)
    ]
    max_rows = top_patterns[0]["rows"] if top_patterns else 0
    return {
        "unique_patterns": len(pattern_counts),
        "max_rows_per_pattern": int(max_rows),
        "top_patterns": top_patterns,
        "overfit_risk": bool(max_rows >= 4),
    }


def repeated_error_reduction(
    weaknesses: List[Dict[str, Any]],
    recent_window: int,
) -> Dict[str, Any]:
    recent_counts = Counter()
    historical_counts = Counter()

    for weakness in weaknesses:
        error_type = normalize_error_type(weakness.get("error_type"))
        repetitions = max(
            int(weakness.get("repetition_count", weakness.get("raw_repeat_count", 1))) - 1,
            0,
        )
        if repetitions <= 0:
            continue
        if int(weakness.get("recency_rank", 0)) < recent_window:
            recent_counts[error_type] += repetitions
        else:
            historical_counts[error_type] += repetitions

    error_types = sorted(set(recent_counts) | set(historical_counts))
    by_error_type = {}
    for error_type in error_types:
        recent = int(recent_counts.get(error_type, 0))
        historical = int(historical_counts.get(error_type, 0))
        reduction = historical - recent
        reduction_rate = round(reduction / historical, 4) if historical > 0 else None
        by_error_type[error_type] = {
            "recent_repeats": recent,
            "historical_repeats": historical,
            "reduction": reduction,
            "reduction_rate": reduction_rate,
        }

    return {
        "recent_total": int(sum(recent_counts.values())),
        "historical_total": int(sum(historical_counts.values())),
        "by_error_type": by_error_type,
    }


def build_learning_progress_report(
    weaknesses: List[Dict[str, Any]],
    accepted_weaknesses: List[Dict[str, Any]],
    rejected_weaknesses: List[Dict[str, Any]],
    priority_queue: List[Dict[str, Any]],
    hard_negative_rows: List[Dict[str, Any]],
    recent_window: int,
) -> Dict[str, Any]:
    error_type_frequency = Counter()
    accepted_error_type_frequency = Counter()
    rejected_error_type_frequency = Counter()
    repeated_mistakes = Counter()
    recent_scores: List[float] = []
    older_scores: List[float] = []
    solved_positions = 0
    accepted_phase_counts = Counter(str(row.get("phase") or "midgame") for row in accepted_weaknesses)
    queue_phase_counts = Counter(str(row.get("phase") or "midgame") for row in priority_queue)
    rejection_reason_counts = Counter()
    uncertain_accepted = 0
    uncertain_rejected = 0

    for weakness in weaknesses:
        error_type = normalize_error_type(weakness.get("error_type"))
        repetition_count = int(weakness.get("repetition_count", weakness.get("raw_repeat_count", 1)))
        priority_score = parse_float(weakness.get("priority_score"), default=0.0)
        error_type_frequency[error_type] += repetition_count
        if repetition_count > 1:
            repeated_mistakes[error_type] += repetition_count
        if bool(weakness.get("is_solved", False)):
            solved_positions += 1
        if int(weakness.get("recency_rank", 0)) < recent_window:
            recent_scores.append(priority_score)
        else:
            older_scores.append(priority_score)

    recent_avg = sum(recent_scores) / max(len(recent_scores), 1)
    older_avg = sum(older_scores) / max(len(older_scores), 1)
    if older_scores:
        improvement_rate = round((older_avg - recent_avg) / max(older_avg, 1.0), 4)
    else:
        improvement_rate = 0.0

    for weakness in accepted_weaknesses:
        accepted_error_type_frequency[normalize_error_type(weakness.get("error_type"))] += int(
            weakness.get("repetition_count", weakness.get("raw_repeat_count", 1))
        )
        if bool(weakness.get("is_uncertain", False)):
            uncertain_accepted += 1

    for weakness in rejected_weaknesses:
        rejected_error_type_frequency[normalize_error_type(weakness.get("error_type"))] += int(
            weakness.get("repetition_count", weakness.get("raw_repeat_count", 1))
        )
        if bool(weakness.get("is_uncertain", False)):
            uncertain_rejected += 1
        for reason in weakness.get("training_filter_reasons", []):
            rejection_reason_counts[str(reason)] += 1

    queue_concentration = queue_pattern_concentration(priority_queue)
    repeat_reduction = repeated_error_reduction(weaknesses, recent_window)
    top_error_classes = []
    for error_type, total in error_type_frequency.most_common(10):
        top_error_classes.append(
            {
                "error_type": error_type,
                "total": int(total),
                "accepted": int(accepted_error_type_frequency.get(error_type, 0)),
                "rejected": int(rejected_error_type_frequency.get(error_type, 0)),
                "queued_rows": int(
                    sum(
                        1
                        for row in priority_queue
                        if normalize_error_type(row.get("error_type")) == error_type
                    )
                ),
            }
        )

    return {
        "schema_version": "learning_progress_v2",
        "generated_at": utc_now_iso(),
        "summary": {
            "weakness_count": len(weaknesses),
            "accepted_training_weakness_count": len(accepted_weaknesses),
            "rejected_training_weakness_count": len(rejected_weaknesses),
            "active_weakness_count": sum(1 for row in weaknesses if not bool(row.get("is_solved", False))),
            "solved_weakness_count": solved_positions,
            "recent_window": recent_window,
            "improvement_rate": improvement_rate,
            "priority_queue_rows": len(priority_queue),
            "hard_negative_rows": len(hard_negative_rows),
        },
        "error_type_frequency": dict(sorted(error_type_frequency.items())),
        "top_error_classes_frequency": top_error_classes,
        "repeated_mistakes": {
            "total": int(sum(repeated_mistakes.values())),
            "by_error_type": dict(sorted(repeated_mistakes.items())),
        },
        "repeated_error_reduction_over_runs": repeat_reduction,
        "priority_score_trend": {
            "recent_average": round(recent_avg, 4),
            "historical_average": round(older_avg, 4),
        },
        "accepted_vs_rejected_weaknesses": {
            "accepted": len(accepted_weaknesses),
            "rejected": len(rejected_weaknesses),
            "uncertain_accepted": uncertain_accepted,
            "uncertain_rejected": uncertain_rejected,
            "accepted_by_error_type": dict(sorted(accepted_error_type_frequency.items())),
            "rejected_by_error_type": dict(sorted(rejected_error_type_frequency.items())),
            "rejected_by_reason": dict(sorted(rejection_reason_counts.items())),
        },
        "phase_balance": {
            "accepted_training_weaknesses": dict(sorted(accepted_phase_counts.items())),
            "priority_queue_rows": dict(sorted(queue_phase_counts.items())),
        },
        "priority_queue_concentration": queue_concentration,
    }


def build_adaptive_state(
    weaknesses: List[Dict[str, Any]],
    priority_queue: List[Dict[str, Any]],
) -> Dict[str, Any]:
    recent_window = max(int(os.environ.get("TCS_WEAKNESS_RECENT_WINDOW", "32")), 1)
    recent_material = []
    mastered_material = []
    repeated_patterns = {}

    for row in weaknesses:
        focus_key = material_focus_key(
            str(row.get("phase") or "midgame"),
            str(row.get("material_signature") or "unknown"),
        )
        if int(row.get("recency_rank", 0)) < recent_window and focus_key not in recent_material:
            recent_material.append(focus_key)
        if bool(row.get("is_solved", False)):
            if focus_key not in mastered_material:
                mastered_material.append(focus_key)
        if int(row.get("raw_repeat_count", row.get("count", 1))) > 1:
            repeated_patterns[str(row.get("pattern_key"))] = int(
                row.get("raw_repeat_count", row.get("count", 1))
            )

    repeated_error_types = Counter()
    for row in weaknesses:
        repeated_error_types[str(row.get("error_type") or "blunder")] += int(
            row.get("raw_repeat_count", row.get("count", 1))
        )

    most_repeated_error_type = None
    if repeated_error_types:
        error_type, total = max(repeated_error_types.items(), key=lambda item: (item[1], item[0]))
        most_repeated_error_type = {
            "error_type": error_type,
            "raw_occurrences": int(total),
        }

    return {
        "generated_at": utc_now_iso(),
        "weakness_entries": len(weaknesses),
        "priority_queue_entries": len(priority_queue),
        "recent_window": recent_window,
        "recent_material_signatures": recent_material,
        "mastered_material_signatures": mastered_material,
        "repeated_patterns": repeated_patterns,
        "most_repeated_error_type": most_repeated_error_type,
        "priority_error_type_counts": dict(
            sorted(Counter(str(row.get("error_type") or "blunder") for row in priority_queue).items())
        ),
        "solved_pattern_count": sum(1 for row in weaknesses if bool(row.get("is_solved", False))),
    }


def refresh_adaptive_artifacts(reverse_root: Path) -> Dict[str, Any]:
    paths = ensure_support_files(reverse_root)
    weakness_rows = load_jsonl_rows(paths["weakness_log"])
    stabilized_rows, dedup_summary = stabilize_weakness_log(weakness_rows)
    write_jsonl_rows(paths["weakness_log"], stabilized_rows)

    aggregated = aggregate_weaknesses(stabilized_rows)
    recent_window = max(int(os.environ.get("TCS_WEAKNESS_RECENT_WINDOW", "32")), 1)
    for weakness in aggregated:
        is_solved, solved_decay_factor = weakness_solved_decay(weakness, recent_window)
        weakness["is_solved"] = is_solved
        weakness["solved_decay_factor"] = solved_decay_factor

    accepted_weaknesses, rejected_weaknesses, training_filter_stats = partition_weaknesses_for_training(
        aggregated
    )

    cluster_payload = build_weakness_clusters(aggregated, dedup_summary)
    paths["weakness_clusters"].write_text(json.dumps(cluster_payload, indent=2), encoding="utf-8")

    reverse_negatives = load_reverse_negative_rows(reverse_root)
    hard_negative_rows = build_hard_negative_rows(accepted_weaknesses, reverse_negatives, recent_window)
    preserved_negative_rows = [
        dict(row, is_hard_negative=bool(row.get("is_hard_negative", False)))
        for row in reverse_negatives
    ]
    merged_negative_rows = hard_negative_rows[:]
    seen_negative_keys = {hard_negative_row_key(row) for row in hard_negative_rows}
    for row in preserved_negative_rows:
        key = hard_negative_row_key(row)
        if key in seen_negative_keys:
            continue
        merged_negative_rows.append(row)
        seen_negative_keys.add(key)
    write_jsonl_rows(reverse_root / NEGATIVES_NAME, merged_negative_rows)

    max_per_weakness = max(int(os.environ.get("TCS_PRIORITY_MAX_PER_WEAKNESS", "6")), 1)
    max_total = max(int(os.environ.get("TCS_PRIORITY_QUEUE_MAX_ROWS", "2048")), 1)

    seen_candidate_ids = set()
    priority_queue: List[Dict[str, Any]] = []
    candidate_pool = hard_negative_rows + reverse_negatives

    for weakness in accepted_weaknesses:
        ranked_candidates = sorted(
            candidate_pool,
            key=lambda candidate: (
                weakness_similarity_score(weakness, candidate),
                str(candidate.get("sample_id") or ""),
            ),
            reverse=True,
        )

        taken = 0
        for candidate in ranked_candidates:
            similarity = weakness_similarity_score(weakness, candidate)
            if similarity <= 0.0:
                continue

            candidate_id = str(candidate.get("sample_id") or "")
            if candidate_id in seen_candidate_ids:
                continue

            priority_queue.append(build_priority_queue_entry(weakness, candidate))
            seen_candidate_ids.add(candidate_id)
            taken += 1

            if taken >= max_per_weakness or len(priority_queue) >= max_total:
                break

        if len(priority_queue) >= max_total:
            break

    write_jsonl_rows(paths["priority_queue"], priority_queue)
    adaptive_state = build_adaptive_state(accepted_weaknesses, priority_queue)
    adaptive_state["training_filter"] = training_filter_stats
    paths["adaptive_state"].write_text(json.dumps(adaptive_state, indent=2), encoding="utf-8")
    learning_progress = build_learning_progress_report(
        aggregated,
        accepted_weaknesses,
        rejected_weaknesses,
        priority_queue,
        hard_negative_rows,
        recent_window,
    )
    learning_progress_path = reverse_root.parent / "reports" / LEARNING_PROGRESS_REPORT_NAME
    learning_progress_path.parent.mkdir(parents=True, exist_ok=True)
    learning_progress_path.write_text(json.dumps(learning_progress, indent=2), encoding="utf-8")

    return {
        "weakness_log_path": str(paths["weakness_log"]),
        "priority_queue_path": str(paths["priority_queue"]),
        "adaptive_state_path": str(paths["adaptive_state"]),
        "weakness_cluster_path": str(paths["weakness_clusters"]),
        "negatives_path": str(reverse_root / NEGATIVES_NAME),
        "learning_progress_path": str(learning_progress_path),
        "weakness_entries": len(aggregated),
        "raw_weakness_entries": int(dedup_summary.get("raw_entries", 0)),
        "dropped_weakness_duplicates": int(dedup_summary.get("dropped_entries", 0)),
        "accepted_training_weaknesses": len(accepted_weaknesses),
        "rejected_training_weaknesses": len(rejected_weaknesses),
        "training_filter": training_filter_stats,
        "weakness_cluster_count": int(cluster_payload["stats"]["cluster_count"]),
        "most_repeated_error_type": cluster_payload["stats"]["most_repeated_error_type"],
        "hard_negative_entries": len(hard_negative_rows),
        "priority_queue_entries": len(priority_queue),
        "recent_material_signatures": adaptive_state["recent_material_signatures"],
        "mastered_material_signatures": adaptive_state["mastered_material_signatures"],
    }
