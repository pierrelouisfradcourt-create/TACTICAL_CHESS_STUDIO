import hashlib
import json
import math
import os
import random
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Tuple

import chess

from adaptive_dataset import phase_priority_weight, refresh_adaptive_artifacts


PRIORITY_TRAINING_QUEUE_NAME = "priority_training_queue.jsonl"
PRIORITY_TRAINING_QUEUE_MANIFEST_NAME = "priority_training_queue_manifest.json"
ERROR_ALIASES = {
    "promotion_ignored": "promotion_fail",
    "bad_reason": "blunder",
}
ERROR_SEVERITY = {
    "missed_mate": 5,
    "promotion_fail": 5,
    "hanging_piece": 4,
    "bad_trade": 4,
    "blunder": 3,
    "bad_plan": 2,
}
MIX_PATTERN = ["priority"] * 7 + ["elite"] * 2 + ["diversity"]
DEFAULT_DIVERSITY_SOURCE = Path("lab/pedagogy_db/promoted_pedagogy_pack.jsonl")
DEFAULT_MAX_PATTERN_REPEAT = 2
DEFAULT_MIN_PHASE_COVERAGE = 1
PHASE_ORDER = ("opening", "midgame", "endgame")


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


def parse_int_env(name: str, default: int) -> int:
    try:
        value = int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default
    return max(value, 1)


def write_jsonl_rows(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=True) + "\n")


def normalize_error_type(value: Any) -> str:
    normalized = str(value or "blunder").strip().lower()
    normalized = ERROR_ALIASES.get(normalized, normalized)
    if normalized not in ERROR_SEVERITY:
        return "blunder"
    return normalized


def ensure_phase(row: Dict[str, Any]) -> str:
    phase = str(row.get("phase") or "").strip().lower()
    if phase in {"opening", "midgame", "endgame"}:
        return phase
    return phase_from_fen(str(row.get("fen", "") or ""))


def phase_from_fen(fen: str) -> str:
    try:
        board = chess.Board(fen)
    except ValueError:
        return "midgame"

    fullmove = int(board.fullmove_number)
    queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(board.pieces(chess.QUEEN, chess.BLACK))
    non_king_pieces = sum(1 for piece in board.piece_map().values() if piece.piece_type != chess.KING)
    undeveloped = count_undeveloped_minor_pieces(board)
    material_total = total_non_king_material(board)

    if fullmove <= 12 or undeveloped >= 3:
        return "opening"
    if material_total <= 20 or queens == 0 or non_king_pieces <= 10:
        return "endgame"
    return "midgame"


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


def total_non_king_material(board: chess.Board) -> int:
    piece_values = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
        chess.KING: 0,
    }
    total = 0
    for piece in board.piece_map().values():
        if piece.piece_type == chess.KING:
            continue
        total += piece_values[piece.piece_type]
    return total


def legal_moves_from_fen(fen: str) -> List[str]:
    try:
        board = chess.Board(fen)
    except ValueError:
        return []
    return [move.uci() for move in board.legal_moves]


def material_signature_from_row(row: Dict[str, Any]) -> str:
    signature = str(row.get("material_signature") or "").strip()
    if signature:
        return signature
    try:
        board = chess.Board(str(row.get("fen", "") or ""))
    except ValueError:
        return "unknown"
    piece_order = ("Q", "R", "B", "N", "P")
    white = {
        "Q": len(board.pieces(chess.QUEEN, chess.WHITE)),
        "R": len(board.pieces(chess.ROOK, chess.WHITE)),
        "B": len(board.pieces(chess.BISHOP, chess.WHITE)),
        "N": len(board.pieces(chess.KNIGHT, chess.WHITE)),
        "P": len(board.pieces(chess.PAWN, chess.WHITE)),
    }
    black = {
        "Q": len(board.pieces(chess.QUEEN, chess.BLACK)),
        "R": len(board.pieces(chess.ROOK, chess.BLACK)),
        "B": len(board.pieces(chess.BISHOP, chess.BLACK)),
        "N": len(board.pieces(chess.KNIGHT, chess.BLACK)),
        "P": len(board.pieces(chess.PAWN, chess.BLACK)),
    }
    white_sig = "".join(f"{piece}{white[piece]}" for piece in piece_order)
    black_sig = "".join(f"{piece}{black[piece]}" for piece in piece_order)
    return f"W:{white_sig}|B:{black_sig}"


def priority_pattern_key(row: Dict[str, Any]) -> str:
    return "|".join(
        [
            normalize_error_type(row.get("bad_reason")),
            ensure_phase(row),
            material_signature_from_row(row),
        ]
    )


def queue_pattern_key(row: Dict[str, Any]) -> str:
    explicit = str(row.get("pattern_key") or "").strip()
    if explicit:
        return explicit
    if str(row.get("queue_bucket") or "") == "priority" or row.get("error_type") or row.get("bad_reason"):
        return priority_pattern_key(row)
    return "|".join(
        [
            str(row.get("queue_bucket") or row.get("source") or "general"),
            ensure_phase(row),
            material_signature_from_row(row),
        ]
    )


def rarity_bonus(pattern_count: int) -> int:
    if pattern_count <= 1:
        return 3
    if pattern_count <= 3:
        return 2
    if pattern_count <= 6:
        return 1
    return 0


def stable_queue_sample_id(bucket: str, row: Dict[str, Any], index: int) -> str:
    existing = str(row.get("sample_id") or "").strip()
    if existing:
        return f"{bucket}::{existing}"
    digest = hashlib.sha1(
        f"{bucket}|{row.get('fen', '')}|{row.get('best_move', '')}|{index}".encode("utf-8")
    ).hexdigest()[:16]
    return f"{bucket}::{index:06d}::{digest}"


def build_priority_entry(
    row: Dict[str, Any],
    pattern_count: int,
    queue_rank: int,
) -> Dict[str, Any]:
    fen = str(row.get("fen", "") or "").strip()
    best_move = str(row.get("good_move") or row.get("best_move") or "").strip()
    error_type = normalize_error_type(row.get("bad_reason"))
    severity = ERROR_SEVERITY[error_type]
    rare_bonus = rarity_bonus(pattern_count)
    repetition_count = int(row.get("repetition_count", pattern_count))
    cp_drop = abs(float(row.get("cp_drop", 0.0) or 0.0))
    phase_weight = float(row.get("phase_weight", phase_priority_weight(row.get("phase"))))
    priority_score = round(cp_drop + repetition_count + phase_weight, 4)
    solved_decay_factor = float(row.get("solved_decay_factor", 1.0) or 1.0)
    sampling_weight = round(priority_score * solved_decay_factor, 4)

    try:
        board = chess.Board(fen)
        player_to_move = 1 if board.turn == chess.WHITE else 2
    except ValueError:
        player_to_move = 1

    return {
        "sample_id": stable_queue_sample_id("priority", row, queue_rank),
        "schema_version": "priority_training_queue_v1",
        "fen": fen,
        "best_move": best_move,
        "good_move": best_move,
        "bad_moves": [str(move) for move in (row.get("bad_moves") or []) if str(move).strip()],
        "legal_moves": legal_moves_from_fen(fen),
        "all_legal_moves": legal_moves_from_fen(fen),
        "top_moves": [best_move] if best_move else [],
        "top_scores": [1.0] if best_move else [],
        "player_to_move": player_to_move,
        "policy_only": True,
        "phase": ensure_phase(row),
        "material_signature": material_signature_from_row(row),
        "pattern_key": priority_pattern_key(row),
        "candidate_family_guess": "priority_error_recovery",
        "source": "priority_training_queue",
        "source_reverse_sample_id": row.get("sample_id"),
        "source_reverse_quality": row.get("quality"),
        "source_reverse_type": row.get("type"),
        "sequence": list(row.get("sequence") or []),
        "error_type": error_type,
        "severity": severity,
        "rarity_bonus": rare_bonus,
        "cp_drop": cp_drop,
        "repetition_count": repetition_count,
        "phase_weight": phase_weight,
        "priority_score": priority_score,
        "solved_decay_factor": solved_decay_factor,
        "sampling_weight": sampling_weight,
        "is_critical": severity >= 4,
        "is_repeat_error": repetition_count > 1,
        "is_rare_pattern": rare_bonus > 0,
        "is_hard_negative": bool(row.get("is_hard_negative", False)),
        "queue_bucket": "priority",
        "queue_rank": queue_rank,
        "queue_mix_weight": 0.7,
    }


def build_non_priority_entry(
    row: Dict[str, Any],
    bucket: str,
    queue_rank: int,
) -> Dict[str, Any]:
    cloned = dict(row)
    cloned["sample_id"] = stable_queue_sample_id(bucket, cloned, queue_rank)
    cloned["schema_version"] = cloned.get("schema_version", "priority_training_queue_v1")
    cloned["phase"] = ensure_phase(cloned)
    cloned["material_signature"] = material_signature_from_row(cloned)
    cloned["pattern_key"] = queue_pattern_key(cloned)
    cloned["priority_score"] = 0
    cloned["severity"] = 0
    cloned["rarity_bonus"] = 0
    cloned["repetition_count"] = 0
    cloned["is_critical"] = False
    cloned["is_repeat_error"] = False
    cloned["is_rare_pattern"] = False
    cloned["queue_bucket"] = bucket
    cloned["queue_rank"] = queue_rank
    cloned["queue_mix_weight"] = 0.2 if bucket == "elite" else 0.1
    cloned.setdefault("source", f"priority_training_queue_{bucket}")
    return cloned


def phase_sort_key(phase: str) -> Tuple[int, str]:
    try:
        return (PHASE_ORDER.index(phase), phase)
    except ValueError:
        return (len(PHASE_ORDER), phase)


def select_diverse_rows(
    rows: List[Dict[str, Any]],
    *,
    max_per_pattern: int,
    min_phase_coverage: int,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    if not rows:
        return [], {
            "max_per_pattern": max_per_pattern,
            "min_phase_coverage": min_phase_coverage,
            "dropped_for_pattern_cap": 0,
            "phase_counts": {},
            "material_counts": {},
            "pattern_counts": {},
        }

    remaining = list(rows)
    selected: List[Dict[str, Any]] = []
    selected_indices = set()
    pattern_counts = Counter()
    phase_counts = Counter()
    material_counts = Counter()

    available_phase_counts = Counter(str(row.get("phase") or "midgame") for row in remaining)
    coverage_targets = {
        phase: min(min_phase_coverage, count)
        for phase, count in available_phase_counts.items()
        if count > 0
    }

    while len(selected_indices) < len(remaining):
        unmet_phases = [
            phase for phase, target in coverage_targets.items()
            if phase_counts[phase] < target
        ]
        if unmet_phases:
            preferred_phases = sorted(unmet_phases, key=phase_sort_key)
        else:
            available_phases = {str(row.get("phase") or "midgame") for idx, row in enumerate(remaining) if idx not in selected_indices}
            if not available_phases:
                break
            preferred_phases = sorted(
                available_phases,
                key=lambda phase: (phase_counts[phase],) + phase_sort_key(phase),
            )

        choice_index = None
        choice_sort_key = None
        for phase in preferred_phases:
            for idx, row in enumerate(remaining):
                if idx in selected_indices:
                    continue
                row_phase = str(row.get("phase") or "midgame")
                if row_phase != phase:
                    continue
                pattern_key = str(row.get("pattern_key") or queue_pattern_key(row))
                if pattern_counts[pattern_key] >= max_per_pattern:
                    continue
                material_key = str(row.get("material_signature") or "unknown")
                sort_key = (
                    material_counts[material_key],
                    pattern_counts[pattern_key],
                    -float(row.get("sampling_weight", row.get("priority_score", 0.0)) or 0.0),
                    -float(row.get("priority_score", 0.0) or 0.0),
                    -int(row.get("severity", 0) or 0),
                    str(row.get("sample_id") or ""),
                )
                if choice_sort_key is None or sort_key < choice_sort_key:
                    choice_sort_key = sort_key
                    choice_index = idx
            if choice_index is not None:
                break

        if choice_index is None:
            break

        row = dict(remaining[choice_index])
        pattern_key = str(row.get("pattern_key") or queue_pattern_key(row))
        phase = str(row.get("phase") or "midgame")
        material_key = str(row.get("material_signature") or "unknown")
        row["pattern_key"] = pattern_key
        selected.append(row)
        selected_indices.add(choice_index)
        pattern_counts[pattern_key] += 1
        phase_counts[phase] += 1
        material_counts[material_key] += 1

    dropped_for_pattern_cap = sum(
        1
        for idx, row in enumerate(remaining)
        if idx not in selected_indices
        and pattern_counts[str(row.get("pattern_key") or queue_pattern_key(row))] >= max_per_pattern
    )

    return selected, {
        "max_per_pattern": max_per_pattern,
        "min_phase_coverage": min_phase_coverage,
        "dropped_for_pattern_cap": dropped_for_pattern_cap,
        "phase_counts": dict(phase_counts),
        "material_counts": dict(material_counts),
        "pattern_counts": dict(pattern_counts),
    }


def shannon_entropy(counts: Counter) -> float:
    total = sum(counts.values())
    if total <= 0:
        return 0.0
    entropy = 0.0
    for count in counts.values():
        if count <= 0:
            continue
        probability = count / total
        entropy -= probability * math.log2(probability)
    return round(entropy, 6)


def summarize_queue_metrics(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    phase_counts = Counter(str(row.get("phase") or "midgame") for row in rows)
    material_counts = Counter(str(row.get("material_signature") or "unknown") for row in rows)
    pattern_counts = Counter(str(row.get("pattern_key") or queue_pattern_key(row)) for row in rows)
    bucket_counts = Counter(str(row.get("queue_bucket") or "unknown") for row in rows)
    total = len(rows)

    normalized_pattern_entropy = 0.0
    if pattern_counts:
        max_entropy = math.log2(len(pattern_counts)) if len(pattern_counts) > 1 else 0.0
        if max_entropy > 0:
            normalized_pattern_entropy = round(shannon_entropy(pattern_counts) / max_entropy, 6)

    return {
        "queue_entropy": {
            "pattern_shannon_entropy": shannon_entropy(pattern_counts),
            "normalized_pattern_shannon_entropy": normalized_pattern_entropy,
            "phase_shannon_entropy": shannon_entropy(phase_counts),
            "material_shannon_entropy": shannon_entropy(material_counts),
        },
        "pattern_distribution": {
            "total_patterns": len(pattern_counts),
            "max_pattern_count": max(pattern_counts.values(), default=0),
            "counts": dict(pattern_counts.most_common()),
        },
        "phase_distribution": {
            "counts": {phase: phase_counts.get(phase, 0) for phase in PHASE_ORDER},
            "ratios": {
                phase: round((phase_counts.get(phase, 0) / total), 6) if total else 0.0
                for phase in PHASE_ORDER
            },
        },
        "material_distribution": {
            "unique_material_signatures": len(material_counts),
            "top_counts": dict(material_counts.most_common(12)),
        },
        "bucket_distribution": {
            "counts": dict(bucket_counts),
        },
    }


def unique_rows_by_key(rows: List[Dict[str, Any]], key_fn) -> List[Dict[str, Any]]:
    seen = set()
    unique_rows: List[Dict[str, Any]] = []
    for row in rows:
        key = key_fn(row)
        if key in seen:
            continue
        seen.add(key)
        unique_rows.append(row)
    return unique_rows


def repeat_or_trim_rows(rows: List[Dict[str, Any]], target_count: int) -> List[Dict[str, Any]]:
    if target_count <= 0 or not rows:
        return []
    if len(rows) >= target_count:
        return rows[:target_count]
    out: List[Dict[str, Any]] = []
    idx = 0
    while len(out) < target_count:
        out.append(dict(rows[idx % len(rows)]))
        idx += 1
    return out


def load_priority_source_rows(reverse_root: Path) -> List[Dict[str, Any]]:
    flat_negatives = reverse_root / "negatives.jsonl"
    rows = load_jsonl_rows(flat_negatives)
    if rows:
        return rows

    combined: List[Dict[str, Any]] = []
    for phase in ("opening", "midgame", "endgame"):
        combined.extend(load_jsonl_rows(reverse_root / phase / "negative.jsonl"))
    return combined


def resolve_diversity_source(dataset_root: Path) -> Path:
    manifest_path = dataset_root / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        raw_input = str(manifest.get("input") or "").strip()
        if raw_input:
            candidate = Path(raw_input)
            if candidate.exists():
                return candidate
            cwd_candidate = Path.cwd() / raw_input
            if cwd_candidate.exists():
                return cwd_candidate
    if DEFAULT_DIVERSITY_SOURCE.exists():
        return DEFAULT_DIVERSITY_SOURCE
    return dataset_root / "elite_mixed.jsonl"


def target_mix_counts(priority_count: int) -> Dict[str, int]:
    if priority_count <= 0:
        return {"priority": 0, "elite": 0, "diversity": 0, "total": 0}

    total = int(math.ceil(priority_count / 0.70))
    elite = int(round(total * 0.20))
    diversity = total - priority_count - elite
    if diversity < 0:
        diversity = 0
        elite = total - priority_count
    return {
        "priority": priority_count,
        "elite": elite,
        "diversity": diversity,
        "total": total,
    }


def interleave_rows(
    priority_rows: List[Dict[str, Any]],
    elite_rows: List[Dict[str, Any]],
    diversity_rows: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    buckets = {
        "priority": list(priority_rows),
        "elite": list(elite_rows),
        "diversity": list(diversity_rows),
    }
    queue: List[Dict[str, Any]] = []

    while any(buckets.values()):
        moved = False
        for bucket in MIX_PATTERN:
            if buckets[bucket]:
                queue.append(buckets[bucket].pop(0))
                moved = True
        if not moved:
            break

    queue_ranked: List[Dict[str, Any]] = []
    for index, row in enumerate(queue, start=1):
        cloned = dict(row)
        cloned["queue_rank"] = index
        queue_ranked.append(cloned)
    return queue_ranked


def build_priority_training_queue(dataset_root: Path) -> Dict[str, Any]:
    dataset_root = dataset_root.resolve()
    reverse_root = (dataset_root.parent / "reverse_dataset").resolve()
    adaptive_refresh = refresh_adaptive_artifacts(reverse_root)
    queue_path = dataset_root / PRIORITY_TRAINING_QUEUE_NAME
    manifest_path = dataset_root / PRIORITY_TRAINING_QUEUE_MANIFEST_NAME

    negative_rows = [
        row
        for row in load_priority_source_rows(reverse_root)
        if str(row.get("fen", "") or "").strip()
        and str(row.get("good_move") or row.get("best_move") or "").strip()
        and bool(row.get("trainable", True))
    ]

    max_per_pattern = parse_int_env("TCS_PRIORITY_QUEUE_MAX_PER_PATTERN", DEFAULT_MAX_PATTERN_REPEAT)
    min_phase_coverage = parse_int_env("TCS_PRIORITY_QUEUE_MIN_PHASE_COVERAGE", DEFAULT_MIN_PHASE_COVERAGE)
    pattern_counts = Counter(priority_pattern_key(row) for row in negative_rows)
    priority_entries = [
        build_priority_entry(row, pattern_counts[priority_pattern_key(row)], index)
        for index, row in enumerate(negative_rows, start=1)
    ]
    priority_entries.sort(
        key=lambda row: (
            -float(row.get("sampling_weight", 0.0)),
            -float(row["priority_score"]),
            -int(row["severity"]),
            -int(row["repetition_count"]),
            str(row.get("source_reverse_sample_id") or ""),
        )
    )
    priority_entries, priority_selection_summary = select_diverse_rows(
        priority_entries,
        max_per_pattern=max_per_pattern,
        min_phase_coverage=min_phase_coverage,
    )
    for index, row in enumerate(priority_entries, start=1):
        row["queue_rank"] = index

    elite_source_rows = unique_rows_by_key(
        load_jsonl_rows(dataset_root / "elite_mixed.jsonl"),
        lambda row: (str(row.get("fen") or ""), str(row.get("best_move") or "")),
    )

    diversity_source = resolve_diversity_source(dataset_root)
    diversity_rows = unique_rows_by_key(
        load_jsonl_rows(diversity_source),
        lambda row: (str(row.get("fen") or ""), str(row.get("best_move") or "")),
    )

    used_keys = {
        (str(row.get("fen") or ""), str(row.get("best_move") or ""))
        for row in priority_entries
    }
    elite_keys = {
        (str(row.get("fen") or ""), str(row.get("best_move") or ""))
        for row in elite_source_rows
    }
    diversity_rows = [
        row
        for row in diversity_rows
        if (str(row.get("fen") or ""), str(row.get("best_move") or "")) not in used_keys
        and (str(row.get("fen") or ""), str(row.get("best_move") or "")) not in elite_keys
    ]

    deterministic_rng = random.Random(42)
    deterministic_rng.shuffle(elite_source_rows)
    deterministic_rng.shuffle(diversity_rows)

    mix_counts = target_mix_counts(len(priority_entries))
    elite_entries = [
        build_non_priority_entry(row, "elite", index)
        for index, row in enumerate(repeat_or_trim_rows(elite_source_rows, mix_counts["elite"]), start=1)
    ]
    diversity_entries = [
        build_non_priority_entry(row, "diversity", index)
        for index, row in enumerate(repeat_or_trim_rows(diversity_rows, mix_counts["diversity"]), start=1)
    ]
    elite_entries, elite_selection_summary = select_diverse_rows(
        elite_entries,
        max_per_pattern=max_per_pattern,
        min_phase_coverage=min_phase_coverage,
    )
    diversity_entries, diversity_selection_summary = select_diverse_rows(
        diversity_entries,
        max_per_pattern=max_per_pattern,
        min_phase_coverage=min_phase_coverage,
    )

    final_queue = interleave_rows(priority_entries, elite_entries, diversity_entries)
    write_jsonl_rows(queue_path, final_queue)
    queue_metrics = summarize_queue_metrics(final_queue)

    manifest = {
        "schema_version": "priority_training_queue_v1",
        "queue_path": str(queue_path),
        "formula": "priority_score = abs(cp_drop) + repetition_count + phase_weight",
        "sampling_weight_formula": "sampling_weight = priority_score * solved_decay_factor",
        "severity_mapping": ERROR_SEVERITY,
        "rarity_bonus_rules": {
            "count<=1": 3,
            "count<=3": 2,
            "count<=6": 1,
            "count>6": 0,
        },
        "pattern_definition": "error_type + phase + material_signature",
        "mix": {
            "priority": 0.70,
            "elite": 0.20,
            "diversity": 0.10,
        },
        "source_paths": {
            "priority_negatives": str(reverse_root / "negatives.jsonl"),
            "elite_dataset": str(dataset_root / "elite_mixed.jsonl"),
            "diversity_dataset": str(diversity_source),
            "learning_progress": str(reverse_root.parent / "reports" / "learning_progress.json"),
        },
        "counts": {
            "priority": len(priority_entries),
            "elite": len(elite_entries),
            "diversity": len(diversity_entries),
            "total": len(final_queue),
        },
        "diversity_policy": {
            "max_per_pattern": max_per_pattern,
            "min_phase_coverage": min_phase_coverage,
            "pattern_definition": "error_type + phase + material_signature for priority; bucket + phase + material_signature otherwise",
        },
        "selection_summary": {
            "priority": priority_selection_summary,
            "elite": elite_selection_summary,
            "diversity": diversity_selection_summary,
        },
        "queue_entropy": queue_metrics["queue_entropy"],
        "pattern_distribution": queue_metrics["pattern_distribution"],
        "phase_distribution": queue_metrics["phase_distribution"],
        "material_distribution": queue_metrics["material_distribution"],
        "bucket_distribution": queue_metrics["bucket_distribution"],
        "adaptive_refresh": adaptive_refresh,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    return {
        "queue_path": str(queue_path),
        "manifest_path": str(manifest_path),
        "priority_queue_entries": len(priority_entries),
        "elite_entries": len(elite_entries),
        "diversity_entries": len(diversity_entries),
        "queue_entries": len(final_queue),
        "mix": manifest["mix"],
        "adaptive_refresh": adaptive_refresh,
    }
