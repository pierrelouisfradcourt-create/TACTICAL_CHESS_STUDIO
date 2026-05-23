from __future__ import annotations

import hashlib
import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
try:
    import torch
    from torch.utils.data import Dataset
except ImportError:
    class _MissingTorch:
        def __getattr__(self, name: str) -> Any:
            raise ImportError("PyTorch is required for TeacherDataset training paths")

    class Dataset:  # type: ignore[no-redef]
        pass

    torch = _MissingTorch()  # type: ignore[assignment]

try:
    from adaptive_dataset import (
        ensure_support_files,
        load_jsonl_rows as load_adaptive_jsonl_rows,
        material_focus_key,
        material_signature_from_fen,
        refresh_adaptive_artifacts,
    )
except (ModuleNotFoundError, ImportError, AttributeError):
    ensure_support_files = None
    load_adaptive_jsonl_rows = None
    material_focus_key = None
    material_signature_from_fen = None
    refresh_adaptive_artifacts = None
from move_vocab import try_move_to_index, vocab_size


@dataclass(frozen=True)
class AdmissionResult:
    admissible: bool
    reasons: Tuple[str, ...]


class DatasetAdmissionError(ValueError):
    pass


_AM_DATASET_REQUIRED_TEXT_FIELDS: Tuple[str, ...] = (
    "action_id_version",
    "legal_action_version",
    "action_mask_version",
    "move_vocab_fingerprint",
    "legal_move_source",
    "ruleset",
    "variant",
)

_DIAGNOSTIC_MOVE_FIELDS: Tuple[str, ...] = (
    "selected_move",
    "final_selected_move",
    "search_selected_move",
    "search_best_move",
    "neural_predicted_move",
)


def _has_non_empty_text(row: Dict[str, Any], field: str) -> bool:
    value = row.get(field)
    return isinstance(value, str) and bool(value.strip())


def _is_non_empty_mapping(value: Any) -> bool:
    return isinstance(value, dict) and bool(value)


def validate_am_dataset_admission(row: Dict[str, Any]) -> AdmissionResult:
    """Passive AM/HumanGate dataset-admission check.

    This helper is intentionally not wired into training. It captures the
    current fail-closed boundary: metadata may be carried and inspected, but no
    Python row is dataset-label-ready while the admission gate remains blocked.
    """
    reasons: List[str] = []

    if not isinstance(row, dict):
        return AdmissionResult(False, ("invalid_row", "dataset_admission_gate_blocked"))

    for field in _AM_DATASET_REQUIRED_TEXT_FIELDS:
        if not _has_non_empty_text(row, field):
            reasons.append(f"missing_{field}")

    if not _is_non_empty_mapping(row.get("action_id")):
        reasons.append("missing_action_id")

    if not _is_non_empty_mapping(row.get("legal_action")):
        reasons.append("missing_legal_action")

    if not _is_non_empty_mapping(row.get("action_mask_provenance")):
        reasons.append("missing_action_mask_provenance")

    human_gate_state = row.get("human_gate_authorization_state")
    if not _is_non_empty_mapping(human_gate_state):
        reasons.append("missing_humangate_authorization_state")
    else:
        if human_gate_state.get("scope") != "DatasetLabelPromotion":
            reasons.append("humangate_scope_not_dataset_label_promotion")
        if human_gate_state.get("decision") != "approve":
            reasons.append("humangate_decision_not_approve")

    if row.get("human_gate_authorization") is not True:
        reasons.append("missing_humangate_authorization")

    if "legal_mask" in row:
        reasons.append("python_legal_mask_is_helper_only")

    if any(_has_non_empty_text(row, field) for field in _DIAGNOSTIC_MOVE_FIELDS):
        reasons.append("diagnostic_move_fields_are_not_labels")

    if _has_non_empty_text(row, "fallback_reason"):
        reasons.append("fallback_metadata_blocks_promotion")

    rerank_status = row.get("rerank_status")
    if isinstance(rerank_status, str) and rerank_status.strip() not in ("", "not_applied"):
        reasons.append("rerank_metadata_blocks_promotion")

    reasons.append("dataset_admission_gate_blocked")
    return AdmissionResult(False, tuple(dict.fromkeys(reasons)))


def require_am_dataset_admission(row: Dict[str, Any], row_index: int) -> None:
    admission = validate_am_dataset_admission(row)
    if admission.admissible:
        return

    reason_text = ", ".join(admission.reasons) if admission.reasons else "unknown"
    raise DatasetAdmissionError(
        f"Dataset admission rejected row {row_index}: {reason_text}"
    )


def preflight_training_dataset(dataset_path: str | Path) -> AdmissionResult:
    """Lightweight dataset admission preflight without sample construction."""
    dataset_rows, _dataset_meta = load_dataset_rows(str(dataset_path))

    if not dataset_rows:
        return AdmissionResult(False, ("empty_dataset", "dataset_admission_gate_blocked"))

    for row_index, row in enumerate(dataset_rows, start=1):
        try:
            require_am_dataset_admission(row, row_index)
        except DatasetAdmissionError:
            admission = validate_am_dataset_admission(row)
            return AdmissionResult(
                False,
                (f"row_{row_index}", *admission.reasons),
            )

    return AdmissionResult(True, ())


def validate_training_dataset_path(dataset_path: Path) -> Path:
    if not dataset_path.exists():
        raise FileNotFoundError(f"Training dataset does not exist: {dataset_path}")

    if dataset_path.is_dir():
        return dataset_path

    if (
        dataset_path.suffix.lower() == ".csv"
        and dataset_path.name == "promoted_pedagogy_pack.csv"
    ):
        raise ValueError(
            "Promoted pedagogy curation CSV is not trainable under the current contract: "
            "it preserves per-game provenance and moves_pgn, but training requires per-position "
            "JSONL rows with fen, best_move, legal_moves, and a value target. "
            "No bridge was generated because that would require truthful PGN expansion/sample "
            "extraction from the source games rather than fabricating rows from curation metadata."
        )

    return dataset_path


def resolve_dataset_path(path: str | None, active_dataset_path: str = "lab/ACTIVE_DATASET.txt") -> str:
    if path is not None and str(path).strip():
        return str(validate_training_dataset_path(Path(str(path).strip())))

    pointer_path = Path(active_dataset_path)
    if not pointer_path.exists():
        raise FileNotFoundError(
            f"Training input not provided and active dataset pointer is missing: {pointer_path}"
        )

    pointed_value = pointer_path.read_text(encoding="utf-8").strip()
    if not pointed_value:
        raise ValueError(f"Active dataset pointer is empty: {pointer_path}")

    dataset_path = Path(pointed_value)
    if not dataset_path.exists() and not dataset_path.is_absolute():
        fallback_path = pointer_path.parent / pointed_value
        if fallback_path.exists():
            dataset_path = fallback_path

    try:
        dataset_path = validate_training_dataset_path(dataset_path)
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Active dataset pointer {pointer_path} points to missing dataset: {pointed_value}"
        ) from None

    return str(dataset_path)


def validate_dataset_row(row: Dict[str, Any]) -> None:
    """Validate that a dataset row has the required structure for training."""
    # Required fields
    if "fen" not in row or not isinstance(row["fen"], str) or not row["fen"].strip():
        raise ValueError("Missing or invalid 'fen' field")

    if "best_move" not in row or not isinstance(row["best_move"], str) or not row["best_move"].strip():
        raise ValueError("Missing or invalid 'best_move' field")

    policy_only = parse_boolish(row.get("policy_only", False), default=False)

    # Check value target - policy-only rows can omit it.
    has_result = "result" in row and row["result"] is not None
    has_engine_eval = "engine_eval" in row and row["engine_eval"] is not None

    if not policy_only and not has_result and not has_engine_eval:
        raise ValueError("Missing value target: must have 'result' or 'engine_eval'")

    # Validate result format if present
    if has_result:
        result = row["result"]
        if not isinstance(result, str) or result not in ["1-0", "0-1", "1/2-1/2"]:
            raise ValueError(f"Invalid 'result' value: {result}")

    # Validate optional fields structure
    if "legal_moves" in row:
        legal_moves = row["legal_moves"]
        if not isinstance(legal_moves, list):
            raise ValueError("'legal_moves' must be a list")
        if not all(isinstance(mv, str) for mv in legal_moves):
            raise ValueError("'legal_moves' must contain only strings")

    if "top_moves" in row:
        top_moves = row["top_moves"]
        if not isinstance(top_moves, list):
            raise ValueError("'top_moves' must be a list")
        if not all(isinstance(mv, str) for mv in top_moves):
            raise ValueError("'top_moves' must contain only strings")

    if "top_scores" in row:
        top_scores = row["top_scores"]
        if not isinstance(top_scores, list):
            raise ValueError("'top_scores' must be a list")
        if not all(isinstance(s, (int, float)) for s in top_scores):
            raise ValueError("'top_scores' must contain only numbers")

    if "aaa_alt_moves" in row:
        aaa_alt_moves = row["aaa_alt_moves"]
        if not isinstance(aaa_alt_moves, list):
            raise ValueError("'aaa_alt_moves' must be a list")
        if not all(isinstance(mv, str) for mv in aaa_alt_moves):
            raise ValueError("'aaa_alt_moves' must contain only strings")

    if "aaa_alt_decision_scores" in row:
        aaa_alt_decision_scores = row["aaa_alt_decision_scores"]
        if not isinstance(aaa_alt_decision_scores, list):
            raise ValueError("'aaa_alt_decision_scores' must be a list")
        if not all(isinstance(s, (int, float)) for s in aaa_alt_decision_scores):
            raise ValueError("'aaa_alt_decision_scores' must contain only numbers")

    # Validate top_moves/top_scores consistency
    if "top_moves" in row and "top_scores" in row:
        if len(row["top_moves"]) != len(row["top_scores"]):
            raise ValueError("'top_moves' and 'top_scores' must have same length")

    if "aaa_alt_moves" in row and "aaa_alt_decision_scores" in row:
        if len(row["aaa_alt_moves"]) != len(row["aaa_alt_decision_scores"]):
            raise ValueError("'aaa_alt_moves' and 'aaa_alt_decision_scores' must have same length")

    # Validate player_to_move if present
    if "player_to_move" in row:
        ptm = row["player_to_move"]
        if not isinstance(ptm, int) or ptm not in [1, 2]:
            raise ValueError("'player_to_move' must be 1 or 2")


PHASE_ORDER = ["midgame", "endgame", "opening"]


def phase_mode_weights(mode: str | None) -> Dict[str, float]:
    normalized = (mode or "").strip().lower()
    if normalized == "endgame_focus":
        return {"opening": 0.15, "midgame": 0.25, "endgame": 0.60}
    return {"opening": 0.25, "midgame": 0.40, "endgame": 0.35}


def candidate_phase_paths(dataset_dir: Path, phase: str) -> List[Path]:
    return [
        dataset_dir / f"elite_{phase}.jsonl",
        dataset_dir / phase / f"elite_{phase}.jsonl",
    ]


def load_jsonl_rows(path: Path) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def repeat_or_trim_rows(rows: List[Dict[str, Any]], target_count: int) -> List[Dict[str, Any]]:
    if target_count <= 0 or not rows:
        return []
    if len(rows) >= target_count:
        return rows[:target_count]

    out: List[Dict[str, Any]] = []
    idx = 0
    while len(out) < target_count:
        out.append(rows[idx % len(rows)])
        idx += 1
    return out


def stable_row_order_key(row: Dict[str, Any]) -> str:
    payload = "|".join(
        [
            str(row.get("sample_id") or ""),
            str(row.get("fen") or ""),
            str(row.get("best_move") or row.get("good_move") or ""),
            str(row.get("phase") or ""),
            str(row.get("result") or ""),
            str(row.get("adaptive_bucket") or ""),
        ]
    )
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()


def load_adaptive_state(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def allocate_target_counts(
    total_target: int,
    weighted_sizes: List[Tuple[str, int, float]],
) -> Dict[str, int]:
    if total_target <= 0:
        return {name: 0 for name, _, _ in weighted_sizes}

    present = [(name, size, weight) for name, size, weight in weighted_sizes if size > 0 and weight > 0.0]
    if not present:
        return {name: 0 for name, _, _ in weighted_sizes}

    weight_total = sum(weight for _, _, weight in present)
    target_counts = {
        name: int(round(total_target * (weight / weight_total)))
        for name, _, weight in present
    }

    diff = total_target - sum(target_counts.values())
    for name, _, weight in sorted(present, key=lambda item: item[2], reverse=True):
        if diff == 0:
            break
        target_counts[name] += 1 if diff > 0 else -1
        diff += -1 if diff > 0 else 1

    for name, _, _ in weighted_sizes:
        target_counts.setdefault(name, 0)
    return target_counts


def mix_rows_by_phase(
    rows: List[Dict[str, Any]],
    target_count: int,
    weights: Dict[str, float],
) -> List[Dict[str, Any]]:
    if target_count <= 0 or not rows:
        return []

    phase_rows: Dict[str, List[Dict[str, Any]]] = {}
    for row in rows:
        phase = str(row.get("phase", "midgame") or "midgame")
        phase_rows.setdefault(phase, []).append(row)

    for phase in list(phase_rows.keys()):
        phase_rows[phase] = sorted(phase_rows[phase], key=stable_row_order_key)

    present_phases = [phase for phase, phase_items in phase_rows.items() if phase_items]
    if not present_phases:
        return repeat_or_trim_rows(rows, target_count)

    weight_total = sum(weights.get(phase, 0.0) for phase in present_phases)
    normalized_weights = {
        phase: ((weights.get(phase, 0.0) / weight_total) if weight_total > 0 else (1.0 / len(present_phases)))
        for phase in present_phases
    }
    phase_target_counts = {
        phase: int(round(target_count * normalized_weights[phase]))
        for phase in present_phases
    }

    diff = target_count - sum(phase_target_counts.values())
    for phase in sorted(
        present_phases,
        key=lambda name: (normalized_weights[name], len(phase_rows[name])),
        reverse=True,
    ):
        if diff == 0:
            break
        phase_target_counts[phase] += 1 if diff > 0 else -1
        diff += -1 if diff > 0 else 1

    mixed_rows: List[Dict[str, Any]] = []
    for phase in PHASE_ORDER:
        if phase in phase_rows:
            mixed_rows.extend(repeat_or_trim_rows(phase_rows[phase], phase_target_counts[phase]))

    extras = [phase for phase in present_phases if phase not in PHASE_ORDER]
    for phase in extras:
        mixed_rows.extend(repeat_or_trim_rows(phase_rows[phase], phase_target_counts[phase]))
    return mixed_rows


def default_adaptive_weight(
    phase: str,
    material_signature: str,
    adaptive_bucket: str,
    adaptive_state: Dict[str, Any],
) -> float:
    focus_key = (
        material_focus_key(phase, material_signature)
        if material_focus_key is not None
        else f"{phase}|{material_signature}"
    )
    recent_focus = set(adaptive_state.get("recent_material_signatures", []) or [])
    mastered_focus = set(adaptive_state.get("mastered_material_signatures", []) or [])

    base = 1.0
    if adaptive_bucket == "priority":
        base = 1.75
    elif adaptive_bucket in {"general", "diversity"}:
        base = 0.90
    elif adaptive_bucket == "elite":
        base = 1.0

    if focus_key in recent_focus:
        base *= 1.15
    if focus_key in mastered_focus:
        base *= 0.70
    return round(base, 4)


def normalize_elite_row(
    row: Dict[str, Any],
    phase: str,
    adaptive_state: Dict[str, Any],
) -> Dict[str, Any]:
    normalized = dict(row)
    fen = str(normalized.get("fen", "") or "")
    normalized["phase"] = str(normalized.get("phase") or phase)
    normalized["material_signature"] = str(
        normalized.get("material_signature")
        or (material_signature_from_fen(fen) if material_signature_from_fen is not None else "unknown")
    )
    normalized.setdefault("adaptive_bucket", "elite")
    normalized.setdefault("adaptive_source", "elite_dataset")
    normalized.setdefault(
        "adaptive_weight",
        default_adaptive_weight(
            normalized["phase"],
            normalized["material_signature"],
            "elite",
            adaptive_state,
        ),
    )
    return normalized


def normalize_reverse_row(
    row: Dict[str, Any],
    phase: str,
    adaptive_bucket: str,
    adaptive_state: Dict[str, Any],
) -> Dict[str, Any] | None:
    normalized = dict(row)
    fen = str(normalized.get("fen", "") or "").strip()
    best_move = str(
        normalized.get("best_move") or normalized.get("good_move") or ""
    ).strip()

    if not fen or not best_move:
        return None

    normalized["fen"] = fen
    normalized["best_move"] = best_move
    normalized["phase"] = str(normalized.get("phase") or phase or "midgame")
    normalized["material_signature"] = str(
        normalized.get("material_signature")
        or (material_signature_from_fen(fen) if material_signature_from_fen is not None else "unknown")
    )
    normalized["policy_only"] = parse_boolish(normalized.get("policy_only"), default=True)
    normalized.setdefault("top_moves", [best_move])
    normalized.setdefault("top_scores", [1.0])
    normalized.setdefault(
        "adaptive_source",
        "recent_weakness" if adaptive_bucket == "priority" else "general_reverse",
    )
    normalized.setdefault("adaptive_bucket", adaptive_bucket)
    normalized.setdefault(
        "adaptive_weight",
        default_adaptive_weight(
            normalized["phase"],
            normalized["material_signature"],
            adaptive_bucket,
            adaptive_state,
        ),
    )
    return normalized


def load_reverse_rows(
    reverse_root: Path,
    adaptive_state: Dict[str, Any],
    adaptive_bucket: str,
    include_priority_queue: bool = False,
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    adaptive_jsonl_loader = load_adaptive_jsonl_rows or load_jsonl_rows

    if include_priority_queue:
        for row in adaptive_jsonl_loader(reverse_root / "priority_training_queue.jsonl"):
            normalized = normalize_reverse_row(row, str(row.get("phase") or "midgame"), adaptive_bucket, adaptive_state)
            if normalized is not None:
                rows.append(normalized)
        return rows

    for phase in ["opening", "midgame", "endgame"]:
        for sample_type in ["positive", "negative", "mirror"]:
            path = reverse_root / phase / f"{sample_type}.jsonl"
            for row in adaptive_jsonl_loader(path):
                if not parse_boolish(row.get("trainable", True), default=True):
                    continue
                normalized = normalize_reverse_row(row, phase, adaptive_bucket, adaptive_state)
                if normalized is not None:
                    rows.append(normalized)
    return rows


def load_dataset_rows(path: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    dataset_path = Path(path)
    if dataset_path.is_file():
        return load_jsonl_rows(dataset_path), {"mode": "single_file", "path": str(dataset_path)}

    if (
        ensure_support_files is None
        or refresh_adaptive_artifacts is None
        or material_signature_from_fen is None
    ):
        phase_rows: Dict[str, List[Dict[str, Any]]] = {}
        phase_sources: Dict[str, str] = {}
        for phase in ["opening", "midgame", "endgame"]:
            for candidate in candidate_phase_paths(dataset_path, phase):
                if candidate.exists():
                    loaded = load_jsonl_rows(candidate)
                    for row in loaded:
                        row.setdefault("phase", phase)
                    phase_rows[phase] = loaded
                    phase_sources[phase] = str(candidate)
                    break

        if not phase_rows:
            raise FileNotFoundError(
                f"Dataset directory {dataset_path} does not contain elite phase JSONL files"
            )

        weights = phase_mode_weights(os.environ.get("TCS_DATA_PHASE_MODE"))
        present_phases = [phase for phase, rows in phase_rows.items() if rows]
        total_target = sum(len(phase_rows[phase]) for phase in present_phases)
        weight_total = sum(weights[phase] for phase in present_phases)
        normalized_weights = {
            phase: (weights[phase] / weight_total) if weight_total > 0 else 0.0
            for phase in present_phases
        }
        target_counts = {
            phase: int(round(total_target * normalized_weights[phase]))
            for phase in present_phases
        }

        diff = total_target - sum(target_counts.values())
        for phase in sorted(
            present_phases,
            key=lambda name: (normalized_weights[name], len(phase_rows[name])),
            reverse=True,
        ):
            if diff == 0:
                break
            target_counts[phase] += 1 if diff > 0 else -1
            diff += -1 if diff > 0 else 1

        rows: List[Dict[str, Any]] = []
        for phase in PHASE_ORDER:
            if phase in present_phases:
                rows.extend(repeat_or_trim_rows(phase_rows[phase], target_counts[phase]))

        return rows, {
            "mode": "phase_mix_fallback",
            "path": str(dataset_path),
            "phase_mode": (os.environ.get("TCS_DATA_PHASE_MODE") or "default"),
            "phase_sources": phase_sources,
            "phase_counts": {phase: len(phase_rows[phase]) for phase in present_phases},
            "phase_target_counts": target_counts,
        }

    reverse_root = dataset_path.parent / "reverse_dataset"
    support_paths = ensure_support_files(reverse_root)
    adaptive_refresh = refresh_adaptive_artifacts(reverse_root)
    adaptive_state = load_adaptive_state(Path(support_paths["adaptive_state"]))

    elite_rows: List[Dict[str, Any]] = []
    phase_sources: Dict[str, str] = {}
    for phase in ["opening", "midgame", "endgame"]:
        for candidate in candidate_phase_paths(dataset_path, phase):
            if candidate.exists():
                loaded = load_jsonl_rows(candidate)
                for row in loaded:
                    elite_rows.append(normalize_elite_row(row, phase, adaptive_state))
                phase_sources[phase] = str(candidate)
                break

    if not elite_rows:
        raise FileNotFoundError(
            f"Dataset directory {dataset_path} does not contain elite phase JSONL files"
        )

    priority_rows = load_reverse_rows(
        reverse_root=reverse_root,
        adaptive_state=adaptive_state,
        adaptive_bucket="priority",
        include_priority_queue=True,
    )
    general_rows = load_reverse_rows(
        reverse_root=reverse_root,
        adaptive_state=adaptive_state,
        adaptive_bucket="general",
    )

    weights = phase_mode_weights(os.environ.get("TCS_DATA_PHASE_MODE"))
    total_target = max(len(elite_rows), 1)

    source_target_counts = allocate_target_counts(
        total_target,
        [
            ("priority", len(priority_rows), 0.70),
            ("elite", len(elite_rows), 0.20),
            ("general", len(general_rows), 0.10),
        ],
    )

    rows: List[Dict[str, Any]] = []
    rows.extend(mix_rows_by_phase(priority_rows, source_target_counts["priority"], weights))
    rows.extend(mix_rows_by_phase(elite_rows, source_target_counts["elite"], weights))
    rows.extend(mix_rows_by_phase(general_rows, source_target_counts["general"], weights))

    return rows, {
        "mode": "adaptive_mix",
        "path": str(dataset_path),
        "phase_mode": (os.environ.get("TCS_DATA_PHASE_MODE") or "default"),
        "phase_sources": phase_sources,
        "pool_counts": {
            "priority": len(priority_rows),
            "elite": len(elite_rows),
            "general": len(general_rows),
        },
        "pool_target_counts": source_target_counts,
        "adaptive_paths": {key: str(value) for key, value in support_paths.items()},
        "adaptive_refresh": adaptive_refresh,
    }


PIECE_TO_CHANNEL = {
    "P": 0,
    "N": 1,
    "B": 2,
    "R": 3,
    "Q": 4,
    "K": 5,
    "p": 6,
    "n": 7,
    "b": 8,
    "r": 9,
    "q": 10,
    "k": 11,
}


def compute_king_danger(board: List[List[str]], king_char: str) -> float:
    king_pos = None
    for r in range(8):
        for c in range(8):
            if board[r][c] == king_char:
                king_pos = (r, c)
                break
        if king_pos is not None:
            break

    if king_pos is None:
        return 0.0

    kr, kc = king_pos
    danger = 0.0

    for r in range(8):
        for c in range(8):
            piece = board[r][c]
            if piece == ".":
                continue

            if king_char == "K" and piece.islower():
                if abs(r - kr) <= 1 and abs(c - kc) <= 1:
                    danger += 0.25
            elif king_char == "k" and piece.isupper():
                if abs(r - kr) <= 1 and abs(c - kc) <= 1:
                    danger += 0.25

    return min(danger, 1.0)


def fen_to_tensor(fen: str) -> np.ndarray:
    parts = fen.strip().split()
    if len(parts) < 2:
        raise ValueError(f"Invalid FEN: {fen}")

    board_part = parts[0]
    side_to_move = parts[1]

    x = np.zeros((15, 8, 8), dtype=np.float32)

    ranks = board_part.split("/")
    if len(ranks) != 8:
        raise ValueError(f"Invalid FEN board: {fen}")

    for row_idx, rank in enumerate(ranks):
        col_idx = 0
        for ch in rank:
            if ch.isdigit():
                col_idx += int(ch)
            else:
                channel = PIECE_TO_CHANNEL.get(ch)
                if channel is None:
                    raise ValueError(f"Unknown piece in FEN: {ch}")
                if col_idx >= 8:
                    raise ValueError(f"Invalid FEN row overflow: {fen}")
                x[channel, row_idx, col_idx] = 1.0
                col_idx += 1

        if col_idx != 8:
            raise ValueError(f"Invalid FEN row width: {fen}")

    board: List[List[str]] = []
    for rank in ranks:
        row: List[str] = []
        for ch in rank:
            if ch.isdigit():
                row.extend(["."] * int(ch))
            else:
                row.append(ch)
        board.append(row)

    white_danger = compute_king_danger(board, "K")
    black_danger = compute_king_danger(board, "k")

    x[12, :, :] = 1.0 if side_to_move == "w" else 0.0
    x[13, :, :] = white_danger
    x[14, :, :] = black_danger

    return x


def result_to_value(result: str, player_to_move: int) -> float:
    if result == "1-0":
        return 1.0 if player_to_move == 1 else -1.0
    if result == "0-1":
        return -1.0 if player_to_move == 1 else 1.0
    if result == "1/2-1/2":
        return 0.0
    return 0.0


def eval_to_value(eval_cp_or_pawn: float) -> float:
    # clamp au lieu de tanh : signal plus utile
    v = float(eval_cp_or_pawn)
    return max(min(v / 3.0, 1.0), -1.0)


def normalize_soft_scores(scores: List[float]) -> List[float]:
    if not scores:
        return []

    arr = np.asarray(scores, dtype=np.float32)
    arr = arr - np.max(arr)

    # plus agressif pour mieux séparer les bons coups
    exp_arr = np.exp(arr * 2.0)
    denom = np.sum(exp_arr)

    if denom <= 0.0 or not np.isfinite(denom):
        return []

    probs = exp_arr / denom
    return probs.astype(np.float32).tolist()


def build_soft_policy_target(top_moves: List[str], top_scores: List[float]) -> np.ndarray:
    target = np.zeros((vocab_size(),), dtype=np.float32)

    if not top_moves or not top_scores:
        return target

    usable_indices: List[int] = []
    usable_scores: List[float] = []

    for mv, sc in zip(top_moves, top_scores):
        idx = try_move_to_index(mv)
        if idx is None:
            continue
        usable_indices.append(idx)
        usable_scores.append(float(sc))

    if not usable_indices:
        return target

    probs = normalize_soft_scores(usable_scores)
    if not probs:
        return target

    for idx, p in zip(usable_indices, probs):
        target[idx] = float(p)

    return target


def build_legal_move_mask(legal_moves: List[str]) -> np.ndarray:
    mask = np.zeros((vocab_size(),), dtype=np.float32)

    for mv in legal_moves:
        idx = try_move_to_index(mv)
        if idx is not None:
            mask[idx] = 1.0

    return mask


def derive_legal_moves_from_fen(fen: str) -> List[str]:
    try:
        import chess

        board = chess.Board(fen)
    except ValueError:
        return []
    except ModuleNotFoundError:
        return []
    return [move.uci() for move in board.legal_moves]


def is_interesting_position(engine_eval: float, neutral_threshold: float) -> bool:
    try:
        return abs(float(engine_eval)) >= neutral_threshold
    except Exception:
        return False


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
    return default


def parse_teacher_v2_meta(row: Dict[str, Any]) -> Tuple[int, torch.Tensor, torch.Tensor]:
    """Optional TeacherSampleV2 fields; missing keys use legacy defaults."""
    raw_sv = row.get("schema_version", 0)
    try:
        schema_version = int(raw_sv) if raw_sv is not None else 0
    except (TypeError, ValueError):
        schema_version = 0

    raw_smp = row.get("side_material_plus", 0.0)
    try:
        side_material_plus = float(raw_smp) if raw_smp is not None else 0.0
    except (TypeError, ValueError):
        side_material_plus = 0.0

    raw_cf = row.get("conversion_focus", False)
    conv = 1.0 if parse_boolish(raw_cf, default=False) else 0.0

    return (
        schema_version,
        torch.tensor([side_material_plus], dtype=torch.float32),
        torch.tensor([conv], dtype=torch.float32),
    )


def build_aaa_policy_target(
    alt_moves: List[str],
    alt_decision_scores: List[float],
) -> np.ndarray:
    return build_soft_policy_target(alt_moves, alt_decision_scores)


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


def classify_aaa_signal(aaa_rows: int, total_rows: int, avg_valid_alt: float) -> str:
    if aaa_rows <= 0:
        return "absent"
    density = aaa_rows / max(total_rows, 1)
    if density < 0.05 or avg_valid_alt <= 0.0:
        return "sparse"
    return "usable"


def parse_aaa_meta(row: Dict[str, Any]) -> Tuple[torch.Tensor, torch.Tensor]:
    raw_conf = row.get("aaa_confidence", 1.0)
    try:
        aaa_confidence = float(raw_conf) if raw_conf is not None else 1.0
    except (TypeError, ValueError):
        aaa_confidence = 1.0

    raw_used_search = row.get("aaa_used_search", False)
    used_search = 1.0 if parse_boolish(raw_used_search, default=False) else 0.0

    return (
        # Keep AAA weighting conservative: uncertain rows can be downweighted,
        # but we avoid amplifying them above the baseline policy loss.
        torch.tensor([max(0.25, min(aaa_confidence, 1.0))], dtype=torch.float32),
        torch.tensor([used_search], dtype=torch.float32),
    )


class TeacherDataset(Dataset):
    def __init__(self, path: str):
        self.samples: List[Tuple[torch.Tensor, torch.Tensor, torch.Tensor]] = []
        self.extra_samples: List[Dict[str, Any]] = []
        aaa_influence_enabled = not parse_boolish(
            os.environ.get("TCS_DISABLE_AAA_INFLUENCE"),
            default=False,
        )

        kept = 0
        skipped_invalid_json = 0
        skipped_missing_core = 0
        skipped_unmapped = 0
        skipped_invalid_fen = 0
        skipped_uninteresting = 0
        total = 0
        aaa_rows = 0
        aaa_used_search_rows = 0
        aaa_valid_alt_total = 0
        aaa_alt_total = 0
        aaa_alt_unmapped = 0
        aaa_confidence_total = 0.0
        aaa_confidence_count = 0
        dataset_rows, dataset_meta = load_dataset_rows(path)
        self.dataset_meta = dataset_meta

        neutral_threshold = 1.5

        for row_index, row in enumerate(dataset_rows, start=1):
            total += 1
            require_am_dataset_admission(row, row_index)

            row_has_aaa = has_aaa_payload(row)
            if row_has_aaa:
                aaa_rows += 1
                if parse_boolish(row.get("aaa_used_search", False), default=False):
                    aaa_used_search_rows += 1

                alt_moves_for_stats = row.get("aaa_alt_moves", []) or []
                valid_alt_count = 0
                for alt_move in alt_moves_for_stats:
                    aaa_alt_total += 1
                    if try_move_to_index(alt_move) is None:
                        aaa_alt_unmapped += 1
                    else:
                        valid_alt_count += 1
                aaa_valid_alt_total += valid_alt_count

                raw_conf = row.get("aaa_confidence")
                if raw_conf is not None:
                    try:
                        aaa_confidence_total += float(raw_conf)
                        aaa_confidence_count += 1
                    except (TypeError, ValueError):
                        pass

            # Validate row structure before processing
            try:
                validate_dataset_row(row)
            except ValueError as e:
                print(f"Skipping invalid row: {e}")
                skipped_invalid_json += 1
                continue

            fen = row.get("fen")
            best_move = row.get("best_move")

            if not fen or not best_move:
                skipped_missing_core += 1
                continue

            move_idx = try_move_to_index(best_move)
            if move_idx is None:
                skipped_unmapped += 1
                continue

            try:
                x = fen_to_tensor(fen)
            except Exception:
                skipped_invalid_fen += 1
                continue

            player_to_move = int(row.get("player_to_move", 1))
            policy_only = parse_boolish(row.get("policy_only", False), default=False)
            result = row.get("result", None)
            engine_eval = row.get("engine_eval", None)

            if result is not None:
                y_value = result_to_value(result, player_to_move)
            elif engine_eval is not None:
                if not is_interesting_position(engine_eval, neutral_threshold):
                    skipped_uninteresting += 1
                    continue
                y_value = eval_to_value(engine_eval)
            elif policy_only:
                y_value = 0.0
            else:
                skipped_uninteresting += 1
                continue

            legal_moves = row.get("legal_moves", []) or derive_legal_moves_from_fen(fen)
            top_moves = row.get("top_moves", []) or []
            top_scores = row.get("top_scores", []) or []
            aaa_alt_moves = row.get("aaa_alt_moves", []) or []
            aaa_alt_decision_scores = row.get("aaa_alt_decision_scores", []) or []

            legal_mask = np.asarray(
                build_legal_move_mask(legal_moves),
                dtype=np.float32,
            )

            y_policy_soft = build_soft_policy_target(top_moves, top_scores)
            aaa_policy_soft = (
                build_aaa_policy_target(aaa_alt_moves, aaa_alt_decision_scores)
                if aaa_influence_enabled
                else np.zeros((vocab_size(),), dtype=np.float32)
            )

            if float(np.sum(y_policy_soft)) <= 0.0 and float(np.sum(aaa_policy_soft)) > 0.0:
                y_policy_soft = aaa_policy_soft
            elif float(np.sum(y_policy_soft)) > 0.0 and float(np.sum(aaa_policy_soft)) > 0.0:
                y_policy_soft = 0.75 * y_policy_soft + 0.25 * aaa_policy_soft

            if float(np.sum(y_policy_soft)) <= 0.0:
                y_policy_soft[move_idx] = 1.0

                # sécurité : projection finale sur coups légaux
            y_policy_soft = y_policy_soft * legal_mask
            if float(np.sum(y_policy_soft)) <= 0.0:
                if legal_mask[move_idx] > 0:
                    y_policy_soft[move_idx] = 1.0
                else:
                    legal_indices = np.where(legal_mask > 0)[0]
                    if len(legal_indices) > 0:
                        y_policy_soft[legal_indices[0]] = 1.0
                    else:
                        skipped_uninteresting += 1
                        continue

            y_policy_soft = y_policy_soft / max(float(np.sum(y_policy_soft)), 1e-8)

            x_tensor = torch.tensor(x, dtype=torch.float32)
            y_policy_tensor = torch.tensor(move_idx, dtype=torch.long)
            y_value_tensor = torch.tensor([y_value], dtype=torch.float32)

            schema_version, side_material_plus_t, conversion_focus_t = parse_teacher_v2_meta(row)
            aaa_confidence_t, aaa_used_search_t = parse_aaa_meta(row)
            if not aaa_influence_enabled:
                aaa_confidence_t = torch.tensor([1.0], dtype=torch.float32)

            self.samples.append(
                (
                    x_tensor,
                    y_policy_tensor,
                    y_value_tensor,
                )
            )

            self.extra_samples.append(
                {
                    "y_policy_soft": torch.tensor(y_policy_soft, dtype=torch.float32),
                    "legal_mask": torch.tensor(legal_mask, dtype=torch.float32),
                    "best_move": best_move,
                    "fen": fen,
                    "schema_version": schema_version,
                    "policy_only": policy_only,
                    "side_material_plus": side_material_plus_t,
                    "conversion_focus": conversion_focus_t,
                    "aaa_confidence": aaa_confidence_t,
                    "aaa_used_search": aaa_used_search_t,
                    "aaa_has_payload": row_has_aaa,
                    "phase": row.get("phase", "unknown"),
                    "adaptive_weight": float(row.get("adaptive_weight", 1.0) or 1.0),
                    "adaptive_bucket": row.get("adaptive_bucket", "unknown"),
                    "adaptive_source": row.get("adaptive_source", "unknown"),
                    "material_signature": row.get("material_signature", "unknown"),
                }
            )

            kept += 1

        print("TeacherDataset loaded")
        print(f"  dataset_mode          : {dataset_meta.get('mode')}")
        if dataset_meta.get('mode') == 'adaptive_mix':
            print(f"  phase_mode            : {dataset_meta.get('phase_mode')}")
            print(f"  pool_counts           : {dataset_meta.get('pool_counts')}")
            print(f"  pool_target_counts    : {dataset_meta.get('pool_target_counts')}")
            print(f"  adaptive_refresh      : {dataset_meta.get('adaptive_refresh')}")
        print(f"  kept                  : {kept}")
        print(f"  total                 : {total}")
        print(f"  skipped_invalid_json  : {skipped_invalid_json}")
        print(f"  skipped_missing_core  : {skipped_missing_core}")
        print(f"  skipped_best_move_unmapped: {skipped_unmapped}")
        print(f"  skipped_invalid_fen   : {skipped_invalid_fen}")
        print(f"  skipped_uninteresting : {skipped_uninteresting}")
        avg_valid_alt = aaa_valid_alt_total / max(aaa_rows, 1)
        avg_confidence = aaa_confidence_total / max(aaa_confidence_count, 1)
        print(f"  aaa_influence_enabled : {aaa_influence_enabled}")
        print(f"  aaa_status            : {classify_aaa_signal(aaa_rows, total, avg_valid_alt)}")
        print(f"  aaa_rows              : {aaa_rows}")
        print(f"  aaa_used_search_ratio : {aaa_used_search_rows / max(aaa_rows, 1):.4f}")
        print(f"  avg_valid_aaa_alts    : {avg_valid_alt:.4f}")
        print(f"  aaa_alt_unmapped      : {aaa_alt_unmapped}")
        print(f"  avg_aaa_confidence    : {avg_confidence:.4f}")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        x, y_policy, y_value = self.samples[idx]
        extra = self.extra_samples[idx]

        return (
            x,
            y_policy,
            y_value,
            extra["y_policy_soft"],
            extra["legal_mask"],
            extra["aaa_confidence"],
        )

    def get_extra(self, idx: int) -> Dict[str, Any]:
        return self.extra_samples[idx]
