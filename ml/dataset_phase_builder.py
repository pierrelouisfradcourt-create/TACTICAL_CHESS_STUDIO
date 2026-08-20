import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import chess

from adaptive_dataset import refresh_adaptive_artifacts


PHASES = ("opening", "midgame", "endgame")
QUALITIES = ("elite", "good", "noisy")
TYPES = ("positive", "negative")
COLORS = ("white", "black")
PIECE_ORDER = ("Q", "R", "B", "N", "P")
PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0,
}
STRONG_TRIAGE = {"STRONG_KEEP", "MASTER_KEEP", "ELITE_KEEP"}
GOOD_TRIAGE = {"KEEP", "SOFT_KEEP", "GOOD_KEEP"} | STRONG_TRIAGE
SCHEMA_VERSION = "reverse_dataset_engine_v2_matrix_strict"


def load_rows(path: Path) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


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


def parse_boolish(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value) != 0.0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off", ""}:
            return False
    return default


def has_aaa_payload(row: Dict[str, Any]) -> bool:
    aaa_fields = [
        "aaa_search_depth",
        "aaa_search_score",
        "aaa_heuristic_score",
        "aaa_policy_score",
        "aaa_decision_score",
        "aaa_second_best_search_gap",
        "aaa_second_best_decision_gap",
        "aaa_nodes",
        "aaa_q_nodes",
        "aaa_beta_cutoffs",
        "aaa_tt_hits",
        "aaa_ordering_cutoff_index",
        "aaa_best_move_initial_rank",
        "aaa_best_move_final_rank",
        "aaa_principal_changed",
        "aaa_confidence",
    ]
    return any(row.get(field) is not None for field in aaa_fields) or bool(
        row.get("aaa_alt_moves")
    ) or bool(row.get("aaa_alt_decision_scores"))


def board_from_fen(fen: str) -> Optional[chess.Board]:
    try:
        return chess.Board(fen)
    except ValueError:
        return None


def game_key(row: Dict[str, Any]) -> str:
    if row.get("game_id"):
        return str(row["game_id"])
    if row.get("source_game_index") is not None:
        return f"{row.get('source_file', 'unknown')}::{row['source_game_index']}"
    return f"standalone::{str(row.get('fen', ''))[:32]}"


def color_name(turn: chess.Color) -> str:
    return "white" if turn == chess.WHITE else "black"


def piece_counts(board: chess.Board, color: chess.Color) -> Dict[str, int]:
    return {
        "Q": len(board.pieces(chess.QUEEN, color)),
        "R": len(board.pieces(chess.ROOK, color)),
        "B": len(board.pieces(chess.BISHOP, color)),
        "N": len(board.pieces(chess.KNIGHT, color)),
        "P": len(board.pieces(chess.PAWN, color)),
    }


def material_signature(board: chess.Board) -> str:
    white = piece_counts(board, chess.WHITE)
    black = piece_counts(board, chess.BLACK)
    white_sig = "".join(f"{piece}{white[piece]}" for piece in PIECE_ORDER)
    black_sig = "".join(f"{piece}{black[piece]}" for piece in PIECE_ORDER)
    return f"W:{white_sig}|B:{black_sig}"


def material_class(board: chess.Board) -> str:
    queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(board.pieces(chess.QUEEN, chess.BLACK))
    rooks = len(board.pieces(chess.ROOK, chess.WHITE)) + len(board.pieces(chess.ROOK, chess.BLACK))
    minor_pieces = (
        len(board.pieces(chess.BISHOP, chess.WHITE))
        + len(board.pieces(chess.BISHOP, chess.BLACK))
        + len(board.pieces(chess.KNIGHT, chess.WHITE))
        + len(board.pieces(chess.KNIGHT, chess.BLACK))
    )
    pawns = len(board.pieces(chess.PAWN, chess.WHITE)) + len(board.pieces(chess.PAWN, chess.BLACK))

    if queens == 0 and rooks == 0 and minor_pieces <= 2:
        return "pawn_endgame"
    if queens == 0 and rooks <= 2 and minor_pieces <= 4:
        return "queenless_endgame"
    if queens == 0 and rooks > 0:
        return "rook_endgame"
    if queens > 0 and rooks <= 2 and minor_pieces <= 3 and pawns <= 10:
        return "reduced_major_piece"
    if queens == 2 and rooks == 4 and minor_pieces >= 6 and pawns >= 12:
        return "full_material"
    return "imbalanced_middlegame"


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


def classify_phase(row: Dict[str, Any], board: chess.Board) -> str:
    fullmove = parse_int(board.fullmove_number, default=1)
    undeveloped = count_undeveloped_minor_pieces(board)
    non_king_pieces = sum(1 for piece in board.piece_map().values() if piece.piece_type != chess.KING)
    queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(board.pieces(chess.QUEEN, chess.BLACK))
    material_total = total_non_king_material(board)

    if fullmove <= 12 or undeveloped >= 3:
        return "opening"
    if material_total <= 20 or queens == 0 or non_king_pieces <= 10:
        return "endgame"
    return "midgame"


def is_winner_side(row: Dict[str, Any], board: chess.Board) -> bool:
    result = str(row.get("result", "") or "")
    if result == "1/2-1/2":
        return True
    return (result == "1-0" and board.turn == chess.WHITE) or (
        result == "0-1" and board.turn == chess.BLACK
    )


def opening_move_quality(move_uci: str) -> bool:
    if len(move_uci) < 4:
        return False
    if len(move_uci) == 5:
        return True
    if move_uci in {"e1g1", "e1c1", "e8g8", "e8c8"}:
        return True
    if move_uci[:2] in {"b1", "g1", "b8", "g8", "c1", "f1", "c8", "f8"}:
        return True
    return move_uci[2:4] in {"d4", "e4", "d5", "e5", "c4", "c5", "f4", "f5"}


def evaluation_gap(row: Dict[str, Any]) -> float:
    top_gap = abs(parse_float(row.get("top_gap"), default=0.0))
    if top_gap > 0.0:
        return top_gap

    top_scores = row.get("top_scores")
    if isinstance(top_scores, list) and len(top_scores) >= 2:
        return abs(parse_float(top_scores[0]) - parse_float(top_scores[1]))

    aaa_gap = abs(parse_float(row.get("aaa_second_best_decision_gap"), default=0.0))
    if aaa_gap > 0.0:
        return aaa_gap

    return abs(parse_float(row.get("aaa_second_best_search_gap"), default=0.0))


def evaluation_value(row: Dict[str, Any]) -> Optional[float]:
    for field in ("engine_eval", "aaa_search_score", "aaa_decision_score"):
        if row.get(field) is not None:
            return parse_float(row.get(field), default=0.0)
    return None


def build_sequence(game_rows: List[Dict[str, Any]], index: int) -> List[str]:
    sequence: List[str] = []
    upper = min(len(game_rows), index + 5)
    for offset in range(index, upper):
        move = str(game_rows[offset].get("best_move", "") or "").strip()
        if move:
            sequence.append(move)
    return sequence


def classify_quality(
    row: Dict[str, Any],
    board: chess.Board,
    phase: str,
    sequence: List[str],
    repeated_shuffle: int,
) -> Tuple[str, List[str]]:
    tags: List[str] = []
    triage = str(row.get("triage", "") or "").strip().upper()
    gap = evaluation_gap(row)
    aaa_confidence = parse_float(row.get("aaa_confidence"), default=0.0)
    strong_source = triage in STRONG_TRIAGE or str(row.get("promotion_candidate", "")).lower() == "yes"
    trusted_source = triage in GOOD_TRIAGE or strong_source or str(row.get("source", "")).strip() != ""
    stable_eval = gap >= 0.35 or aaa_confidence >= 0.60 or strong_source
    aligned_with_result = is_winner_side(row, board)
    move = str(row.get("best_move", "") or "")

    if phase == "opening" and not opening_move_quality(move):
        tags.append("quality:noisy:opening_noise")
        return "noisy", tags
    if repeated_shuffle >= 3:
        tags.append("quality:noisy:shuffle")
        return "noisy", tags
    if len(sequence) < 2:
        tags.append("quality:noisy:short_sequence")
        return "noisy", tags
    if not row.get("legal_moves"):
        tags.append("quality:noisy:missing_legal_moves")
        return "noisy", tags

    if not aligned_with_result:
        tags.append("quality:result_mismatch")

    if aligned_with_result and stable_eval and trusted_source:
        tags.append("quality:elite:stable_eval")
        return "elite", tags

    if trusted_source:
        tags.append("quality:good:trusted_source")
        return "good", tags

    tags.append("quality:noisy:unverified")
    return "noisy", tags


def transform_move_uci(uci: str) -> str:
    move = chess.Move.from_uci(uci)
    return chess.Move(
        chess.square_mirror(move.from_square),
        chess.square_mirror(move.to_square),
        promotion=move.promotion,
    ).uci()


def legal_move_list(row: Dict[str, Any], board: chess.Board) -> List[str]:
    raw = row.get("legal_moves") or row.get("all_legal_moves") or []
    if isinstance(raw, list):
        moves = [str(move) for move in raw if isinstance(move, str)]
        if moves:
            return moves
    return [move.uci() for move in board.legal_moves]


def piece_value_from_move(board: chess.Board, move: chess.Move) -> int:
    piece = board.piece_at(move.from_square)
    if piece is None:
        return 0
    return PIECE_VALUES[piece.piece_type]


def captured_piece_value(board: chess.Board, move: chess.Move) -> int:
    if board.is_en_passant(move):
        return PIECE_VALUES[chess.PAWN]
    piece = board.piece_at(move.to_square)
    if piece is None:
        return 0
    return PIECE_VALUES[piece.piece_type]


def move_gives_mate(board: chess.Board, move: chess.Move) -> bool:
    probe = board.copy(stack=False)
    probe.push(move)
    return probe.is_checkmate()


def move_hangs_piece(board: chess.Board, move: chess.Move) -> bool:
    piece_value = piece_value_from_move(board, move)
    if piece_value < 3:
        return False
    probe = board.copy(stack=False)
    probe.push(move)
    moved_piece = probe.piece_at(move.to_square)
    if moved_piece is None:
        return False
    opponent = probe.turn
    mover = not opponent
    return probe.is_attacked_by(opponent, move.to_square) and not probe.is_attacked_by(
        mover, move.to_square
    )


def move_is_bad_trade(board: chess.Board, move: chess.Move) -> bool:
    capture_value = captured_piece_value(board, move)
    if capture_value <= 0:
        return False
    moved_value = piece_value_from_move(board, move)
    if moved_value <= capture_value:
        return False
    probe = board.copy(stack=False)
    probe.push(move)
    opponent = probe.turn
    mover = not opponent
    return probe.is_attacked_by(opponent, move.to_square) and not probe.is_attacked_by(
        mover, move.to_square
    )


def allows_opponent_mate_in_one(board: chess.Board, move: chess.Move) -> bool:
    probe = board.copy(stack=False)
    probe.push(move)
    for reply in probe.legal_moves:
        reply_board = probe.copy(stack=False)
        reply_board.push(reply)
        if reply_board.is_checkmate():
            return True
    return False


def classify_bad_move_reason(board: chess.Board, best_move: str, move_uci: str, phase: str) -> Tuple[str, int]:
    move = chess.Move.from_uci(move_uci)
    best = chess.Move.from_uci(best_move)

    if best.promotion and not move.promotion:
        return "promotion_ignored", 6

    if any(legal_move.promotion for legal_move in board.legal_moves) and not move.promotion:
        return "promotion_ignored", 5

    if move_gives_mate(board, best) and not move_gives_mate(board, move):
        return "missed_mate", 6

    if allows_opponent_mate_in_one(board, move):
        return "missed_mate", 5

    if move_is_bad_trade(board, move):
        return "bad_trade", 4

    if move_hangs_piece(board, move):
        return "hanging_piece", 4

    if phase == "opening" and not opening_move_quality(move_uci):
        return "bad_plan", 2

    return "bad_plan", 1


def choose_negative_candidates(
    row: Dict[str, Any],
    board: chess.Board,
    phase: str,
) -> List[Dict[str, Any]]:
    best_move = str(row.get("best_move", "") or "").strip()
    legal_moves = legal_move_list(row, board)
    top_moves = [str(move) for move in row.get("top_moves", []) if isinstance(move, str)]
    excluded = {best_move}
    excluded.update(top_moves[:2])

    candidates: List[Tuple[int, str, str]] = []
    for move_uci in legal_moves:
        if move_uci in excluded:
            continue
        try:
            reason, severity = classify_bad_move_reason(board, best_move, move_uci, phase)
        except ValueError:
            continue
        candidates.append((severity, reason, move_uci))

    if not candidates:
        for move_uci in legal_moves:
            if move_uci != best_move:
                return [{"bad_move": move_uci, "bad_reason": "bad_plan", "severity": 1}]
        return []

    candidates.sort(key=lambda item: (-item[0], item[1], item[2]))

    picked: List[Dict[str, Any]] = []
    seen_reasons = set()
    for severity, reason, move_uci in candidates:
        if reason not in seen_reasons or len(picked) == 0:
            picked.append({"bad_move": move_uci, "bad_reason": reason, "severity": severity})
            seen_reasons.add(reason)
        if len(picked) >= 3:
            break

    if not picked:
        severity, reason, move_uci = candidates[0]
        picked.append({"bad_move": move_uci, "bad_reason": reason, "severity": severity})

    return picked


def negative_quality(base_quality: str, bad_reason: str, severity: int) -> str:
    if base_quality == "noisy":
        return "noisy"
    if severity >= 4 and bad_reason in {"missed_mate", "promotion_ignored", "hanging_piece", "bad_trade"}:
        return base_quality
    if base_quality == "elite":
        return "good"
    return base_quality


def build_base_tags(
    row: Dict[str, Any],
    phase: str,
    quality: str,
    material_bucket: str,
    base_quality_tags: List[str],
) -> List[str]:
    tags = [
        f"phase:{phase}",
        f"quality:{quality}",
        f"family:{str(row.get('candidate_family_guess', 'unknown') or 'unknown')}",
        f"triage:{str(row.get('triage', 'none') or 'none').lower()}",
        f"material:{material_bucket}",
        f"source:{str(row.get('source_file', row.get('source', 'unknown')) or 'unknown')}",
    ]
    tags.extend(base_quality_tags)
    return sorted({tag for tag in tags if tag})


def build_sample_id(game_id: str, ply_index: int, sample_type: str, index: int) -> str:
    return f"{game_id}::ply{ply_index:04d}::{sample_type}::{index}"


def make_positive_sample(
    row: Dict[str, Any],
    board: chess.Board,
    phase: str,
    quality: str,
    sequence: List[str],
    negatives: List[Dict[str, Any]],
    base_tags: List[str],
) -> Dict[str, Any]:
    bad_moves = [candidate["bad_move"] for candidate in negatives]
    sample_id = build_sample_id(game_key(row), parse_int(row.get("ply_index"), 0), "positive", 0)
    value = evaluation_value(row)

    return {
        "sample_id": sample_id,
        "schema_version": SCHEMA_VERSION,
        "fen": row.get("fen"),
        "good_move": row.get("best_move"),
        "bad_moves": bad_moves,
        "sequence": sequence,
        "phase": phase,
        "quality": quality,
        "type": "positive",
        "color": color_name(board.turn),
        "material_signature": material_signature(board),
        "material_class": material_class(board),
        "engine_eval": value,
        "tags": sorted(set(base_tags + ["type:positive"])),
        "trainable": quality != "noisy",
        "mirror_of": None,
        "bad_reason": None,
    }


def make_negative_sample(
    row: Dict[str, Any],
    board: chess.Board,
    phase: str,
    quality: str,
    sequence: List[str],
    candidate: Dict[str, Any],
    index: int,
    base_tags: List[str],
) -> Dict[str, Any]:
    sample_id = build_sample_id(game_key(row), parse_int(row.get("ply_index"), 0), "negative", index)
    value = evaluation_value(row)

    return {
        "sample_id": sample_id,
        "schema_version": SCHEMA_VERSION,
        "fen": row.get("fen"),
        "good_move": row.get("best_move"),
        "bad_moves": [candidate["bad_move"]],
        "sequence": sequence,
        "phase": phase,
        "quality": quality,
        "type": "negative",
        "color": color_name(board.turn),
        "material_signature": material_signature(board),
        "material_class": material_class(board),
        "engine_eval": value,
        "tags": sorted(set(base_tags + [f"type:negative", f"negative:{candidate['bad_reason']}"])),
        "trainable": quality != "noisy",
        "mirror_of": None,
        "bad_reason": candidate["bad_reason"],
    }


def build_mirror_sample(sample: Dict[str, Any]) -> Dict[str, Any]:
    board = chess.Board(str(sample["fen"]))
    mirror_board = board.mirror()
    mirrored = dict(sample)
    mirrored["sample_id"] = f"{sample['sample_id']}::mirror"
    mirrored["mirror_of"] = sample["sample_id"]
    mirrored["fen"] = mirror_board.fen()
    mirrored["good_move"] = transform_move_uci(str(sample["good_move"]))
    mirrored["bad_moves"] = [transform_move_uci(move) for move in sample.get("bad_moves", [])]
    mirrored["sequence"] = [transform_move_uci(move) for move in sample.get("sequence", [])]
    mirrored["color"] = color_name(mirror_board.turn)
    mirrored["material_signature"] = material_signature(mirror_board)
    mirrored["material_class"] = material_class(mirror_board)
    mirrored["tags"] = sorted(set(list(sample.get("tags", [])) + ["mirrored"]))
    if sample.get("engine_eval") is not None:
        mirrored["engine_eval"] = -parse_float(sample["engine_eval"], default=0.0)
    return mirrored


def write_jsonl(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=True) + "\n")


def count_by(rows: List[Dict[str, Any]], key: str) -> Dict[str, int]:
    counts = Counter(str(row.get(key, "unknown")) for row in rows)
    return dict(sorted(counts.items()))


def full_matrix_coverage(rows: List[Dict[str, Any]]) -> Dict[str, int]:
    coverage: Dict[str, int] = {}
    counter = Counter(
        (
            str(row.get("phase", "")),
            str(row.get("quality", "")),
            str(row.get("type", "")),
            str(row.get("color", "")),
        )
        for row in rows
    )
    for phase in PHASES:
        for quality in QUALITIES:
            for sample_type in TYPES:
                for color in COLORS:
                    key = f"{phase}|{quality}|{sample_type}|{color}"
                    coverage[key] = counter.get((phase, quality, sample_type, color), 0)
    return coverage


def compute_validation(
    base_rows: List[Dict[str, Any]],
    combined_rows: List[Dict[str, Any]],
    per_phase: Dict[str, Dict[str, List[Dict[str, Any]]]],
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    remaining_imbalance: List[Dict[str, Any]] = []
    combined_color = Counter(row["color"] for row in combined_rows)
    trainable_base = [row for row in base_rows if row.get("trainable")]
    trainable_phase = Counter(row["phase"] for row in trainable_base)
    base_quality = Counter(row["quality"] for row in base_rows)
    mirror_expected = sum(len(per_phase[phase]["positive"]) + len(per_phase[phase]["negative"]) for phase in PHASES)
    mirror_actual = sum(len(per_phase[phase]["mirror"]) for phase in PHASES)

    color_diff = abs(combined_color.get("white", 0) - combined_color.get("black", 0))
    if color_diff > 1:
        remaining_imbalance.append(
            {
                "kind": "color_bias",
                "detail": f"combined color diff is {color_diff}",
            }
        )

    if trainable_phase:
        max_phase = max(trainable_phase.values())
        min_phase = min(trainable_phase.values())
        if min_phase == 0 or max_phase / max(min_phase, 1) > 2.0:
            remaining_imbalance.append(
                {
                    "kind": "phase_imbalance",
                    "detail": dict(sorted(trainable_phase.items())),
                }
            )

    noisy_share = base_quality.get("noisy", 0) / max(len(base_rows), 1)
    if noisy_share > 0.35:
        remaining_imbalance.append(
            {
                "kind": "noisy_dominance",
                "detail": f"noisy_share={noisy_share:.4f}",
            }
        )

    if mirror_actual != mirror_expected:
        remaining_imbalance.append(
            {
                "kind": "mirror_symmetry",
                "detail": f"expected {mirror_expected} mirror rows but found {mirror_actual}",
            }
        )

    matrix_coverage = full_matrix_coverage(combined_rows)
    empty_cells = [key for key, value in matrix_coverage.items() if value == 0]
    if empty_cells:
        remaining_imbalance.append(
            {
                "kind": "matrix_empty_cells",
                "detail": empty_cells[:24],
                "truncated": len(empty_cells) > 24,
            }
        )

    validation = {
        "no_color_bias": color_diff <= 1,
        "no_phase_imbalance": not any(item["kind"] == "phase_imbalance" for item in remaining_imbalance),
        "no_noisy_dominance": noisy_share <= 0.35,
        "mirror_symmetry_consistent": mirror_actual == mirror_expected,
        "combined_color_counts": dict(sorted(combined_color.items())),
        "trainable_phase_counts": dict(sorted(trainable_phase.items())),
        "base_quality_counts": dict(sorted(base_quality.items())),
        "mirror_expected": mirror_expected,
        "mirror_actual": mirror_actual,
    }
    return validation, remaining_imbalance


def collect_examples(
    per_phase: Dict[str, Dict[str, List[Dict[str, Any]]]],
) -> Dict[str, Dict[str, Dict[str, Any]]]:
    examples: Dict[str, Dict[str, Dict[str, Any]]] = {}
    for phase in PHASES:
        examples[phase] = {}
        for sample_type in ("positive", "negative", "mirror"):
            rows = per_phase[phase][sample_type]
            if rows:
                examples[phase][sample_type] = rows[0]
    return examples


def build_outputs(
    rows: List[Dict[str, Any]]
) -> Tuple[
    Dict[str, List[Dict[str, Any]]],
    Dict[str, Dict[str, List[Dict[str, Any]]]],
    Dict[str, Any],
]:
    grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[game_key(row)].append(row)

    elite_positives: Dict[str, List[Dict[str, Any]]] = {phase: [] for phase in PHASES}
    reverse_dataset: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
        phase: {"positive": [], "negative": [], "mirror": []} for phase in PHASES
    }
    rejected = Counter()
    quality_counts = Counter()

    for game_rows in grouped.values():
        game_rows.sort(key=lambda current: parse_int(current.get("ply_index"), 0))
        repeated_shuffle = 0
        previous_move = None

        for index, row in enumerate(game_rows):
            fen = str(row.get("fen", "") or "").strip()
            board = board_from_fen(fen)
            if board is None:
                rejected["invalid_fen"] += 1
                continue

            move = str(row.get("best_move", "") or "").strip()
            if not move:
                rejected["missing_best_move"] += 1
                continue

            if previous_move == move:
                repeated_shuffle += 1
            else:
                repeated_shuffle = 0
            previous_move = move

            phase = classify_phase(row, board)
            sequence = build_sequence(game_rows, index)
            quality, quality_tags = classify_quality(row, board, phase, sequence, repeated_shuffle)
            quality_counts[quality] += 1
            material_bucket = material_class(board)
            negative_candidates = choose_negative_candidates(row, board, phase)

            if len(sequence) < 2:
                rejected["short_sequence"] += 1
                continue
            if not negative_candidates:
                rejected["no_negative_candidate"] += 1
                continue

            base_tags = build_base_tags(row, phase, quality, material_bucket, quality_tags)
            positive_sample = make_positive_sample(
                row=row,
                board=board,
                phase=phase,
                quality=quality,
                sequence=sequence,
                negatives=negative_candidates,
                base_tags=base_tags,
            )
            reverse_dataset[phase]["positive"].append(positive_sample)
            reverse_dataset[phase]["mirror"].append(build_mirror_sample(positive_sample))

            primary_candidate = negative_candidates[0]
            neg_quality = negative_quality(quality, primary_candidate["bad_reason"], primary_candidate["severity"])
            negative_sample = make_negative_sample(
                row=row,
                board=board,
                phase=phase,
                quality=neg_quality,
                sequence=sequence,
                candidate=primary_candidate,
                index=1,
                base_tags=base_tags,
            )
            reverse_dataset[phase]["negative"].append(negative_sample)
            reverse_dataset[phase]["mirror"].append(build_mirror_sample(negative_sample))

            if quality == "elite" and is_winner_side(row, board):
                row_copy = dict(row)
                row_copy["phase"] = phase
                elite_positives[phase].append(row_copy)

    base_rows: List[Dict[str, Any]] = []
    combined_rows: List[Dict[str, Any]] = []
    for phase in PHASES:
        base_rows.extend(reverse_dataset[phase]["positive"])
        base_rows.extend(reverse_dataset[phase]["negative"])
        combined_rows.extend(reverse_dataset[phase]["positive"])
        combined_rows.extend(reverse_dataset[phase]["negative"])
        combined_rows.extend(reverse_dataset[phase]["mirror"])

    validation, remaining_imbalance = compute_validation(base_rows, combined_rows, reverse_dataset)

    balance_stats = {
        "base_counts": {
            "phase": count_by(base_rows, "phase"),
            "quality": count_by(base_rows, "quality"),
            "type": count_by(base_rows, "type"),
            "color": count_by(base_rows, "color"),
            "material_class": count_by(base_rows, "material_class"),
        },
        "combined_counts": {
            "phase": count_by(combined_rows, "phase"),
            "quality": count_by(combined_rows, "quality"),
            "type": count_by(combined_rows, "type"),
            "color": count_by(combined_rows, "color"),
            "material_class": count_by(combined_rows, "material_class"),
        },
        "per_phase_files": {
            phase: {
                "positive": len(reverse_dataset[phase]["positive"]),
                "negative": len(reverse_dataset[phase]["negative"]),
                "mirror": len(reverse_dataset[phase]["mirror"]),
                "negative_ratio": (
                    len(reverse_dataset[phase]["negative"])
                    / max(len(reverse_dataset[phase]["positive"]), 1)
                ),
            }
            for phase in PHASES
        },
        "full_matrix_coverage": full_matrix_coverage(combined_rows),
    }

    report = {
        "rows_before": len(rows),
        "elite_phase_counts": {phase: len(elite_positives[phase]) for phase in PHASES},
        "reverse_dataset_counts": {
            phase: {
                sample_type: len(reverse_dataset[phase][sample_type])
                for sample_type in ("positive", "negative", "mirror")
            }
            for phase in PHASES
        },
        "rejected": dict(sorted(rejected.items())),
        "quality_counts_raw": dict(sorted(quality_counts.items())),
        "balance_stats": balance_stats,
        "validation": validation,
        "remaining_imbalance": remaining_imbalance,
        "examples": collect_examples(reverse_dataset),
    }
    return elite_positives, reverse_dataset, report


def write_reverse_dataset(root: Path, reverse_dataset: Dict[str, Dict[str, List[Dict[str, Any]]]]) -> List[str]:
    files: List[str] = []
    for phase in PHASES:
        for sample_type in ("positive", "negative", "mirror"):
            path = root / phase / f"{sample_type}.jsonl"
            write_jsonl(path, reverse_dataset[phase][sample_type])
            files.append(str(path))
    return files


def write_support_files(root: Path, report: Dict[str, Any], input_path: Path, generated_files: List[str]) -> None:
    schema = {
        "schema_version": SCHEMA_VERSION,
        "required_fields": [
            "sample_id",
            "schema_version",
            "fen",
            "good_move",
            "bad_moves",
            "sequence",
            "phase",
            "quality",
            "type",
            "color",
            "material_signature",
            "material_class",
            "tags",
            "trainable",
        ],
        "axes": {
            "phase": list(PHASES),
            "quality": list(QUALITIES),
            "type": list(TYPES),
            "color": list(COLORS),
        },
        "notes": {
            "trainable": "false for noisy samples; noisy samples are stored for audit but should not be used for training",
            "mirror": "mirror rows live in phase/mirror.jsonl and preserve phase/quality/type while swapping color and board orientation",
            "negative_contract": "negative rows keep the same good_move but expose one selected bad move in bad_moves[0]",
            "sequence_contract": "sequence contains 2 to 5 consecutive best moves from the source game starting at the sample ply",
        },
    }
    balance_stats = report["balance_stats"]
    examples = report["examples"]
    remaining_imbalance = report["remaining_imbalance"]
    validation = report["validation"]

    manifest = {
        "schema_version": SCHEMA_VERSION,
        "input": str(input_path),
        "files": generated_files,
        "rows_before": report["rows_before"],
        "elite_phase_counts": report["elite_phase_counts"],
        "reverse_dataset_counts": report["reverse_dataset_counts"],
        "rejected": report["rejected"],
        "validation": validation,
    }

    (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (root / "schema.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")
    (root / "balance_stats.json").write_text(json.dumps(balance_stats, indent=2), encoding="utf-8")
    (root / "examples.json").write_text(json.dumps(examples, indent=2), encoding="utf-8")
    (root / "remaining_imbalance.json").write_text(
        json.dumps(remaining_imbalance, indent=2), encoding="utf-8"
    )
    (root / "validation.json").write_text(json.dumps(validation, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-root", default="lab/dataset")
    parser.add_argument("--reverse-root", default="lab/reverse_dataset")
    args = parser.parse_args()

    input_path = Path(args.input)
    rows = load_rows(input_path)
    elite_positives, reverse_dataset, report = build_outputs(rows)

    output_root = Path(args.output_root)
    reverse_root = Path(args.reverse_root)
    output_root.mkdir(parents=True, exist_ok=True)
    reverse_root.mkdir(parents=True, exist_ok=True)

    mixed_rows: List[Dict[str, Any]] = []
    for phase in PHASES:
        phase_rows = elite_positives[phase]
        mixed_rows.extend(phase_rows)
        write_jsonl(output_root / f"elite_{phase}.jsonl", phase_rows)
        write_jsonl(output_root / phase / f"elite_{phase}.jsonl", phase_rows)

    write_jsonl(output_root / "elite_mixed.jsonl", mixed_rows)

    generated_files = write_reverse_dataset(reverse_root, reverse_dataset)
    flat_negatives: List[Dict[str, Any]] = []
    for phase in PHASES:
        flat_negatives.extend(reverse_dataset[phase]["negative"])
    write_jsonl(reverse_root / "negatives.jsonl", flat_negatives)
    generated_files.append(str(reverse_root / "negatives.jsonl"))

    adaptive_refresh = refresh_adaptive_artifacts(reverse_root)
    generated_files.extend(
        [
            adaptive_refresh["weakness_log_path"],
            adaptive_refresh["priority_queue_path"],
            adaptive_refresh["adaptive_state_path"],
        ]
    )
    write_support_files(reverse_root, report, input_path, generated_files)

    output_manifest = {
        "input": str(input_path),
        "rows_before": report["rows_before"],
        "rows_after": len(mixed_rows),
        "phase_counts": {phase: len(elite_positives[phase]) for phase in PHASES},
        "negative_rows": len(flat_negatives),
        "rejected": report["rejected"],
        "adaptive_refresh": adaptive_refresh,
    }
    (output_root / "manifest.json").write_text(json.dumps(output_manifest, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "schema_version": SCHEMA_VERSION,
                "reverse_root": str(reverse_root),
                "rows_before": report["rows_before"],
                "elite_phase_counts": report["elite_phase_counts"],
                "reverse_dataset_counts": report["reverse_dataset_counts"],
                "validation": report["validation"],
                "remaining_imbalance": report["remaining_imbalance"],
                "adaptive_refresh": adaptive_refresh,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
