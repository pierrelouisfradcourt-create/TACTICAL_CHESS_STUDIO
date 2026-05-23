import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from move_vocab import try_move_to_index


ROUTER_VERSION = "dataset_decision_router_v2_curriculum_brain"
DEFAULT_DATASET = "lab/pedagogy_db/promoted_pedagogy_pack.jsonl"
SUPPORTED_OBJECTIVES = {
    "general",
    "tactics",
    "conversion",
    "champion_reference",
    "aaa_teacher",
}


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


def validate_training_dataset_path(dataset_path: Path) -> Path:
    if not dataset_path.exists():
        raise FileNotFoundError(f"Training dataset does not exist: {dataset_path}")

    if dataset_path.suffix.lower() == ".csv" and dataset_path.name == "promoted_pedagogy_pack.csv":
        raise ValueError(
            "Promoted pedagogy curation CSV is not trainable; routing requires per-position JSONL rows."
        )

    return dataset_path


def resolve_dataset_path(path: Optional[str], active_dataset_path: str = "lab/ACTIVE_DATASET.txt") -> str:
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


def inspect_active_pointer(active_dataset_path: str = "lab/ACTIVE_DATASET.txt") -> Dict[str, Any]:
    pointer_path = Path(active_dataset_path)
    status: Dict[str, Any] = {
        "pointer_path": str(pointer_path.resolve()),
        "exists": pointer_path.exists(),
        "raw_value": None,
        "resolved_candidate": None,
    }

    if not pointer_path.exists():
        return status

    raw_value = pointer_path.read_text(encoding="utf-8").strip()
    status["raw_value"] = raw_value
    if not raw_value:
        return status

    candidate = Path(raw_value)
    if not candidate.exists() and not candidate.is_absolute():
        fallback = pointer_path.parent / raw_value
        if fallback.exists():
            candidate = fallback

    status["resolved_candidate"] = str(candidate.resolve()) if candidate.exists() else str(candidate)
    return status


def first_dataset_row(path: Path) -> Dict[str, Any]:
    for row in iter_dataset_rows(path):
        if isinstance(row, dict):
            return row
    return {}


def iter_dataset_rows(path: Path):
    text = path.read_text(encoding="utf-8")
    decoder = json.JSONDecoder()
    idx = 0

    while idx < len(text):
        while idx < len(text) and text[idx].isspace():
            idx += 1
        if idx >= len(text):
            break

        row, next_idx = decoder.raw_decode(text, idx)
        idx = next_idx
        if isinstance(row, dict):
            yield row


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


def validate_dataset_row(row: Dict[str, Any]) -> bool:
    if not isinstance(row.get("fen"), str) or not row.get("fen", "").strip():
        return False
    if not isinstance(row.get("best_move"), str) or not row.get("best_move", "").strip():
        return False

    has_result = row.get("result") is not None
    has_engine_eval = row.get("engine_eval") is not None
    if not has_result and not has_engine_eval:
        return False

    if has_result and row.get("result") not in {"1-0", "0-1", "1/2-1/2"}:
        return False

    legal_moves = row.get("legal_moves", [])
    if legal_moves and (
        not isinstance(legal_moves, list) or not all(isinstance(mv, str) for mv in legal_moves)
    ):
        return False

    return True


def inspect_dataset(path: str) -> Dict[str, Any]:
    file_path = Path(path).resolve()
    result_counts = {"1-0": 0, "0-1": 0, "1/2-1/2": 0}
    termination_counts: Dict[str, int] = {}
    draw_cause_counts: Dict[str, int] = {}
    schema_version_counts: Dict[str, int] = {}
    source_counts: Dict[str, int] = {}
    unique_fens = set()
    unique_best_moves = set()
    rows = 0
    policy_only_rows = 0
    supervised_value_rows = 0
    engine_eval_rows = 0
    legal_moves_rows = 0
    top_moves_rows = 0
    aaa_rows = 0
    aaa_search_rows = 0
    aaa_valid_alt_total = 0
    aaa_alt_unmapped = 0
    aaa_confidence_total = 0.0
    aaa_confidence_count = 0
    best_move_vocab_mismatch_rows = 0
    hard_cap_draw_rows = 0

    for row in iter_dataset_rows(file_path):
            rows += 1

            fen = row.get("fen")
            best_move = row.get("best_move")
            result = row.get("result")
            source = str(row.get("source", "unknown") or "unknown")
            termination = str(
                row.get("termination_reason", row.get("termination", "")) or ""
            ).strip()
            draw_cause = str(row.get("draw_cause", "") or "").strip()
            schema_version = str(row.get("schema_version", 0))

            if fen:
                unique_fens.add(fen)
            if best_move:
                unique_best_moves.add(best_move)
                if try_move_to_index(best_move) is None:
                    best_move_vocab_mismatch_rows += 1

            if result in result_counts:
                result_counts[result] += 1

            if termination:
                termination_counts[termination] = termination_counts.get(termination, 0) + 1
            if draw_cause:
                draw_cause_counts[draw_cause] = draw_cause_counts.get(draw_cause, 0) + 1
            if result == "1/2-1/2" and (
                termination in {"turn_limit", "lab_hard_turn_cap"} or draw_cause == "turn_limit"
            ):
                hard_cap_draw_rows += 1

            if parse_boolish(row.get("policy_only", False), default=False):
                policy_only_rows += 1
            else:
                supervised_value_rows += 1

            if row.get("engine_eval") is not None:
                engine_eval_rows += 1
            if row.get("legal_moves"):
                legal_moves_rows += 1
            if row.get("top_moves"):
                top_moves_rows += 1

            if has_aaa_payload(row):
                aaa_rows += 1
                valid_alt_count = 0
                for alt_move in row.get("aaa_alt_moves", []) or []:
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

            if parse_boolish(row.get("aaa_used_search", False), default=False):
                aaa_search_rows += 1

            schema_version_counts[schema_version] = schema_version_counts.get(schema_version, 0) + 1
            source_counts[source] = source_counts.get(source, 0) + 1

    avg_valid_alt = aaa_valid_alt_total / max(aaa_rows, 1)
    return {
        "path": str(file_path),
        "rows": rows,
        "unique_fens": len(unique_fens),
        "unique_best_moves": len(unique_best_moves),
        "result_counts": result_counts,
        "termination_counts": termination_counts,
        "draw_cause_counts": draw_cause_counts,
        "hard_cap_draw_rows": hard_cap_draw_rows,
        "policy_only_rows": policy_only_rows,
        "supervised_value_rows": supervised_value_rows,
        "engine_eval_rows": engine_eval_rows,
        "legal_moves_rows": legal_moves_rows,
        "top_moves_rows": top_moves_rows,
        "aaa_rows": aaa_rows,
        "aaa_search_rows": aaa_search_rows,
        "aaa_used_search_proportion": aaa_search_rows / max(aaa_rows, 1),
        "avg_valid_aaa_alternatives_per_aaa_row": avg_valid_alt,
        "aaa_alt_unmapped": aaa_alt_unmapped,
        "best_move_vocab_mismatch_rows": best_move_vocab_mismatch_rows,
        "avg_aaa_confidence": aaa_confidence_total / max(aaa_confidence_count, 1),
        "aaa_signal_status": classify_aaa_signal(aaa_rows, rows, avg_valid_alt),
        "schema_version_counts": schema_version_counts,
        "source_counts": source_counts,
    }


def summarize_loaded_dataset(path: str) -> Dict[str, Any]:
    file_path = Path(path).resolve()
    loaded_samples = 0
    policy_only_samples = 0
    value_supervised_samples = 0
    schema_version_counts: Dict[str, int] = {}
    conversion_focus_samples = 0
    nonzero_soft_policy_samples = 0
    legal_mask_nonempty_samples = 0
    aaa_search_samples = 0
    aaa_samples = 0
    avg_aaa_confidence = 0.0

    for row in iter_dataset_rows(file_path):

            if not validate_dataset_row(row):
                continue
            if try_move_to_index(row.get("best_move", "")) is None:
                continue

            loaded_samples += 1
            schema_version = str(row.get("schema_version", 0))
            schema_version_counts[schema_version] = schema_version_counts.get(schema_version, 0) + 1

            if parse_boolish(row.get("policy_only", False), default=False):
                policy_only_samples += 1
            else:
                value_supervised_samples += 1

            if row.get("top_moves"):
                nonzero_soft_policy_samples += 1
            if row.get("legal_moves"):
                legal_mask_nonempty_samples += 1
            if parse_boolish(row.get("conversion_focus", False), default=False) or str(
                row.get("candidate_family_guess", "")
            ).lower() == "conversion":
                conversion_focus_samples += 1
            if parse_boolish(row.get("aaa_used_search", False), default=False):
                aaa_search_samples += 1
            if has_aaa_payload(row):
                aaa_samples += 1
                raw_conf = row.get("aaa_confidence")
                try:
                    avg_aaa_confidence += float(raw_conf) if raw_conf is not None else 1.0
                except (TypeError, ValueError):
                    avg_aaa_confidence += 1.0

    return {
        "loaded_samples": loaded_samples,
        "policy_only_samples": policy_only_samples,
        "value_supervised_samples": value_supervised_samples,
        "schema_version_counts": schema_version_counts,
        "conversion_focus_samples": conversion_focus_samples,
        "nonzero_soft_policy_samples": nonzero_soft_policy_samples,
        "legal_mask_nonempty_samples": legal_mask_nonempty_samples,
        "aaa_search_samples": aaa_search_samples,
        "aaa_samples": aaa_samples,
        "aaa_used_search_proportion": aaa_search_samples / max(aaa_samples, 1),
        "avg_aaa_confidence": avg_aaa_confidence / max(aaa_samples, 1),
        "aaa_signal_status": classify_aaa_signal(
            aaa_samples,
            loaded_samples,
            1.0 if aaa_samples > 0 else 0.0,
        ),
    }


def classify_dataset_fitness(dataset_info: Dict[str, Any], loaded_dataset_info: Dict[str, Any]) -> Dict[str, Any]:
    min_rows_for_ab = int(os.environ.get("TCS_DATASET_MIN_ROWS_FOR_AB", "500"))
    min_loaded_samples_for_ab = int(os.environ.get("TCS_DATASET_MIN_LOADED_SAMPLES_FOR_AB", "500"))
    result_skew_threshold = float(os.environ.get("TCS_DATASET_RESULT_SKEW_THRESHOLD", "0.85"))
    hard_cap_draw_ratio_limit = float(os.environ.get("TCS_HARD_CAP_DRAW_RATIO", "0.05"))
    min_source_confidence = float(os.environ.get("TCS_MIN_SOURCE_CONFIDENCE", "0.80"))

    rows = int(dataset_info["rows"])
    loaded_samples = int(loaded_dataset_info["loaded_samples"])
    result_counts = dataset_info["result_counts"]
    source_counts = dataset_info["source_counts"]
    termination_counts = dataset_info.get("termination_counts", {})
    draw_cause_counts = dataset_info.get("draw_cause_counts", {})

    white_wins = int(result_counts.get("1-0", 0))
    black_wins = int(result_counts.get("0-1", 0))
    draws = int(result_counts.get("1/2-1/2", 0))
    known_result_total = white_wins + black_wins + draws
    max_result_ratio = (
        max(white_wins, black_wins, draws) / known_result_total if known_result_total > 0 else 0.0
    )
    source_unknown_only = bool(source_counts) and all(source == "unknown" for source in source_counts)
    known_source_rows = sum(count for source, count in source_counts.items() if source != "unknown")
    source_confidence = (known_source_rows / rows) if rows > 0 else 0.0
    hard_cap_rows = int(dataset_info.get("hard_cap_draw_rows", 0))
    hard_cap_draw_ratio = (hard_cap_rows / draws) if draws > 0 else 0.0

    reject_reasons = []
    warning_reasons = []

    if rows < min_rows_for_ab:
        reject_reasons.append("too_few_rows")
    if loaded_samples < min_loaded_samples_for_ab:
        reject_reasons.append("too_few_loaded_samples")
    if white_wins == 0:
        reject_reasons.append("no_white_wins")
    if black_wins == 0:
        reject_reasons.append("no_black_wins")
    if source_confidence < min_source_confidence:
        reject_reasons.append("low_source_confidence")
    if hard_cap_draw_ratio > hard_cap_draw_ratio_limit:
        reject_reasons.append("hard_cap_draw_ratio_too_high")

    if source_unknown_only:
        warning_reasons.append("source_unknown_only")
    if known_result_total > 0 and max_result_ratio >= result_skew_threshold:
        warning_reasons.append("result_distribution_skewed")

    dataset_fitness = "admissible"
    if reject_reasons:
        dataset_fitness = "reject_for_ab"
    elif warning_reasons:
        dataset_fitness = "warning"

    return {
        "dataset_fitness": dataset_fitness,
        "reasons": reject_reasons + warning_reasons,
        "reject_reasons": reject_reasons,
        "warning_reasons": warning_reasons,
        "signals": {
            "rows": rows,
            "loaded_samples": loaded_samples,
            "loaded_sample_ratio": (loaded_samples / rows) if rows > 0 else 0.0,
            "result_counts": {"1-0": white_wins, "0-1": black_wins, "1/2-1/2": draws},
            "has_white_win": white_wins > 0,
            "has_black_win": black_wins > 0,
            "source_unknown_only": source_unknown_only,
            "source_confidence": source_confidence,
            "max_result_ratio": max_result_ratio,
            "hard_cap_rows": hard_cap_rows,
            "hard_cap_draw_ratio": hard_cap_draw_ratio,
            "min_rows_for_ab": min_rows_for_ab,
            "min_loaded_samples_for_ab": min_loaded_samples_for_ab,
            "result_skew_threshold": result_skew_threshold,
            "hard_cap_draw_ratio_limit": hard_cap_draw_ratio_limit,
            "min_source_confidence": min_source_confidence,
            "termination_counts": termination_counts,
            "draw_cause_counts": draw_cause_counts,
        },
    }


def text_markers(candidate: Dict[str, Any]) -> str:
    row = candidate.get("first_row", {})
    parts = [
        candidate.get("path", ""),
        row.get("source", ""),
        row.get("source_file", ""),
        row.get("source_path", ""),
        row.get("source_event", ""),
        row.get("csv_event", ""),
        row.get("notes", ""),
        row.get("candidate_family_guess", ""),
        row.get("theme", ""),
        row.get("family", ""),
    ]
    return " ".join(str(part).lower() for part in parts if part is not None)


def build_candidate_flags(candidate: Dict[str, Any]) -> Dict[str, bool]:
    row = candidate.get("first_row", {})
    markers = text_markers(candidate)
    dataset_info = candidate.get("dataset") or {}
    loaded_info = candidate.get("loaded_dataset") or {}

    return {
        "is_admissible": (candidate.get("dataset_admission") or {}).get("dataset_fitness") == "admissible",
        "is_warning_only": (candidate.get("dataset_admission") or {}).get("dataset_fitness") == "warning",
        "is_teacher": "teacher" in markers,
        "has_aaa_rows": int(dataset_info.get("aaa_rows", 0)) > 0,
        "is_exercise_or_puzzle": ("exercise" in markers) or ("puzzle" in markers),
        "has_tactics_markers": any(
            marker in markers for marker in ["tactic", "attack", "fork", "exercise", "puzzle"]
        ) or bool(row.get("tactical_flag")),
        "has_conversion_markers": any(
            marker in markers for marker in ["conversion", "endgame", "finisher", "simplify"]
        ) or int(loaded_info.get("conversion_focus_samples", 0)) > 0,
        "has_champion_markers": any(
            marker in markers
            for marker in ["world championship", "world cup", "champion", "reference", "gukesh", "ding"]
        ),
        "is_promoted_pedagogy": "promoted_pedagogy_pack.jsonl" in markers,
        "has_required_training_fields": bool(row.get("fen")) and bool(row.get("best_move")),
    }


def candidate_summary(candidate: Dict[str, Any]) -> Dict[str, Any]:
    dataset_info = candidate.get("dataset") or {}
    loaded_info = candidate.get("loaded_dataset") or {}
    admission = candidate.get("dataset_admission") or {}
    return {
        "path": candidate.get("path"),
        "rows": dataset_info.get("rows"),
        "loaded_samples": loaded_info.get("loaded_samples"),
        "dataset_fitness": admission.get("dataset_fitness"),
        "admissible": candidate.get("flags", {}).get("is_admissible", False),
        "aaa_rows": dataset_info.get("aaa_rows"),
        "conversion_focus_samples": loaded_info.get("conversion_focus_samples"),
        "source": (candidate.get("first_row") or {}).get("source"),
        "source_event": (candidate.get("first_row") or {}).get("source_event")
        or (candidate.get("first_row") or {}).get("csv_event"),
        "flags": candidate.get("flags"),
        "reasons": admission.get("reasons", []),
    }


def inspect_candidate(path: Path) -> Dict[str, Any]:
    dataset_info = inspect_dataset(str(path))
    loaded_dataset_info = summarize_loaded_dataset(str(path))
    admission = classify_dataset_fitness(dataset_info, loaded_dataset_info)
    candidate = {
        "path": str(path.resolve()),
        "first_row": first_dataset_row(path),
        "dataset": dataset_info,
        "loaded_dataset": loaded_dataset_info,
        "dataset_admission": admission,
    }
    candidate["flags"] = build_candidate_flags(candidate)
    return candidate


def discover_candidate_paths(active_dataset_path: str) -> List[Path]:
    pointer_info = inspect_active_pointer(active_dataset_path)
    discovered: List[Path] = []
    seen = set()

    for raw_path in [pointer_info.get("resolved_candidate"), DEFAULT_DATASET]:
        if not raw_path:
            continue
        candidate = Path(raw_path)
        if candidate.exists():
            resolved = candidate.resolve()
            if resolved not in seen:
                seen.add(resolved)
                discovered.append(resolved)

    for root in [Path("lab/datasets"), Path("lab/pedagogy_db")]:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.jsonl")):
            resolved = path.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            discovered.append(resolved)

    return discovered


def find_candidate(candidates: Iterable[Dict[str, Any]], predicate) -> Optional[Dict[str, Any]]:
    for candidate in candidates:
        if predicate(candidate) and candidate["flags"].get("is_admissible"):
            return candidate
    return None


def objective_missing_requirements(objective: str) -> List[str]:
    mapping = {
        "general": ["admissible_general_dataset"],
        "tactics": ["admissible_tactics_dataset"],
        "conversion": ["admissible_conversion_dataset", "conversion_like_metadata"],
        "champion_reference": ["admissible_champion_reference_dataset"],
        "aaa_teacher": ["admissible_teacher_dataset", "aaa_rows_present"],
    }
    return mapping.get(objective, ["admissible_dataset"])


def select_dataset_for_objective(
    objective: str,
    candidates: List[Dict[str, Any]],
    active_candidate_path: Optional[str],
) -> Dict[str, Any]:
    if objective not in SUPPORTED_OBJECTIVES:
        raise ValueError(
            f"Unsupported objective '{objective}'. Supported objectives: {sorted(SUPPORTED_OBJECTIVES)}"
        )

    active_candidate_path = str(Path(active_candidate_path).resolve()) if active_candidate_path else None

    def is_active(candidate: Dict[str, Any]) -> bool:
        return active_candidate_path is not None and candidate.get("path") == active_candidate_path

    selection: Optional[Dict[str, Any]] = None
    reason = ""
    fallback_used = False

    if objective == "general":
        selection = find_candidate(
            candidates,
            lambda candidate: candidate["flags"]["is_promoted_pedagogy"] and is_active(candidate),
        )
        if selection is not None:
            reason = "selected active promoted pedagogy dataset for general objective"
        else:
            selection = find_candidate(candidates, lambda candidate: candidate["flags"]["is_promoted_pedagogy"])
            if selection is not None:
                reason = "active promoted pedagogy dataset was not admissible; used another admissible promoted pedagogy dataset"
                fallback_used = True
            else:
                selection = find_candidate(candidates, lambda candidate: True)
                if selection is not None:
                    reason = "no admissible promoted pedagogy dataset found; used first admissible dataset"
                    fallback_used = True

    elif objective == "tactics":
        selection = find_candidate(candidates, lambda candidate: candidate["flags"]["is_exercise_or_puzzle"])
        if selection is not None:
            reason = "selected admissible exercise or puzzle dataset for tactics objective"
        else:
            selection = find_candidate(candidates, lambda candidate: candidate["flags"]["has_tactics_markers"])
            if selection is not None:
                reason = "no admissible exercise or puzzle dataset found; used admissible tactics-marked dataset"
                fallback_used = True

    elif objective == "conversion":
        selection = find_candidate(
            candidates,
            lambda candidate: (
                candidate["flags"]["has_conversion_markers"]
                and candidate["flags"]["has_required_training_fields"]
            ),
        )
        if selection is not None:
            reason = "selected admissible conversion-marked dataset with trainable position rows"

    elif objective == "champion_reference":
        selection = find_candidate(candidates, lambda candidate: candidate["flags"]["has_champion_markers"])
        if selection is not None:
            reason = "selected admissible champion or world-championship reference dataset"

    elif objective == "aaa_teacher":
        selection = find_candidate(
            candidates,
            lambda candidate: candidate["flags"]["is_teacher"] and candidate["flags"]["has_aaa_rows"],
        )
        if selection is not None:
            reason = "selected admissible teacher dataset containing AAA rows"

    if selection is None:
        return {
            "selected_dataset": None,
            "reason": f"no suitable admissible dataset found for objective '{objective}'",
            "fallback_used": False,
            "missing_requirements": objective_missing_requirements(objective),
            "candidate": None,
        }

    return {
        "selected_dataset": selection["path"],
        "reason": reason,
        "fallback_used": fallback_used,
        "missing_requirements": [],
        "candidate": selection,
    }


def build_default_decision(
    explicit_input: Optional[str],
    active_dataset_path: str,
    pointer_info: Dict[str, Any],
) -> Dict[str, Any]:
    route_source = "explicit_input" if explicit_input and str(explicit_input).strip() else "active_pointer"
    decision: Dict[str, Any] = {
        "router_version": ROUTER_VERSION,
        "objective": None,
        "route_source": route_source,
        "explicit_input": explicit_input,
        "active_pointer": pointer_info,
        "status": "pending",
        "resolved_dataset_path": None,
        "selected_dataset": None,
        "dataset": None,
        "loaded_dataset": None,
        "dataset_admission": None,
        "admissible": False,
        "reason": (
            "explicit input preserved"
            if route_source == "explicit_input"
            else "active dataset pointer resolved without curriculum objective"
        ),
        "fallback_used": False,
        "available_candidates": [],
        "missing_requirements": [],
        "operational": False,
        "error": None,
    }

    try:
        dataset_path = resolve_dataset_path(explicit_input, active_dataset_path=active_dataset_path)
        candidate = inspect_candidate(Path(dataset_path))
        decision["resolved_dataset_path"] = candidate["path"]
        decision["selected_dataset"] = candidate["path"]
        decision["dataset"] = candidate["dataset"]
        decision["loaded_dataset"] = candidate["loaded_dataset"]
        decision["dataset_admission"] = candidate["dataset_admission"]
        decision["available_candidates"] = [candidate_summary(candidate)]
        decision["status"] = "ok"
        decision["admissible"] = candidate["flags"]["is_admissible"]
        decision["operational"] = candidate["dataset_admission"]["dataset_fitness"] != "reject_for_ab"
        return decision
    except Exception as exc:
        decision["status"] = "error"
        decision["error"] = str(exc)
        return decision


def build_objective_decision(
    objective: str,
    active_dataset_path: str,
    pointer_info: Dict[str, Any],
) -> Dict[str, Any]:
    decision: Dict[str, Any] = {
        "router_version": ROUTER_VERSION,
        "objective": objective,
        "route_source": "objective_selector",
        "explicit_input": None,
        "active_pointer": pointer_info,
        "status": "pending",
        "resolved_dataset_path": None,
        "selected_dataset": None,
        "dataset": None,
        "loaded_dataset": None,
        "dataset_admission": None,
        "admissible": False,
        "reason": None,
        "fallback_used": False,
        "available_candidates": [],
        "missing_requirements": [],
        "operational": False,
        "error": None,
    }

    try:
        candidates = [inspect_candidate(path) for path in discover_candidate_paths(active_dataset_path)]
        decision["available_candidates"] = [candidate_summary(candidate) for candidate in candidates]
        selection = select_dataset_for_objective(
            objective,
            candidates,
            pointer_info.get("resolved_candidate"),
        )

        decision["selected_dataset"] = selection["selected_dataset"]
        decision["resolved_dataset_path"] = selection["selected_dataset"]
        decision["reason"] = selection["reason"]
        decision["fallback_used"] = selection["fallback_used"]
        decision["missing_requirements"] = selection["missing_requirements"]

        candidate = selection.get("candidate")
        if candidate is None:
            decision["status"] = "error"
            decision["error"] = selection["reason"]
            return decision

        decision["dataset"] = candidate["dataset"]
        decision["loaded_dataset"] = candidate["loaded_dataset"]
        decision["dataset_admission"] = candidate["dataset_admission"]
        decision["admissible"] = candidate["flags"]["is_admissible"]
        decision["status"] = "ok"
        decision["operational"] = candidate["flags"]["is_admissible"]
        return decision
    except Exception as exc:
        decision["status"] = "error"
        decision["error"] = str(exc)
        return decision


def build_dataset_decision(
    explicit_input: Optional[str] = None,
    active_dataset_path: str = "lab/ACTIVE_DATASET.txt",
    objective: Optional[str] = None,
) -> Dict[str, Any]:
    pointer_info = inspect_active_pointer(active_dataset_path)
    normalized_objective = (objective or "").strip().lower() or None

    if explicit_input and str(explicit_input).strip():
        return build_default_decision(explicit_input, active_dataset_path, pointer_info)
    if normalized_objective is None:
        return build_default_decision(None, active_dataset_path, pointer_info)
    return build_objective_decision(normalized_objective, active_dataset_path, pointer_info)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=None)
    parser.add_argument("--objective", default=None)
    parser.add_argument("--active-dataset-path", default="lab/ACTIVE_DATASET.txt")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    decision = build_dataset_decision(
        explicit_input=args.input,
        active_dataset_path=args.active_dataset_path,
        objective=args.objective,
    )

    if args.json:
        print(json.dumps(decision, indent=2))
        return

    print(f"router_version={decision['router_version']}")
    print(f"objective={decision['objective']}")
    print(f"route_source={decision['route_source']}")
    print(f"status={decision['status']}")
    print(f"admissible={decision['admissible']}")
    print(f"operational={decision['operational']}")
    print(f"resolved_dataset_path={decision['resolved_dataset_path']}")
    print(f"fallback_used={decision['fallback_used']}")
    print(f"reason={decision['reason']}")

    if decision["missing_requirements"]:
        print("missing_requirements=" + ",".join(decision["missing_requirements"]))

    if decision["error"]:
        print(f"error={decision['error']}")
        return

    dataset = decision["dataset"] or {}
    loaded = decision["loaded_dataset"] or {}
    admission = decision["dataset_admission"] or {}
    print(
        "dataset_summary="
        f"rows:{dataset.get('rows')} "
        f"loaded_samples:{loaded.get('loaded_samples')} "
        f"fitness:{admission.get('dataset_fitness')}"
    )
    print(
        "dataset_reasons="
        + ",".join(admission.get("reasons", []))
        if admission.get("reasons")
        else "dataset_reasons=none"
    )


if __name__ == "__main__":
    main()
