import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studiopilot_director_report.schema.json"
DEFAULT_FIXTURES_ROOT = PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "director_report"

RUNTIME_REVIEW_DIRECTORS = {"ARCHITECTURE_DIRECTOR"}
ML_REVIEW_DIRECTORS = {"ARCHITECTURE_DIRECTOR", "QUALITY_DIRECTOR"}
WORKFLOW_RISK_LEVELS = {"HIGH", "BLOCKED"}
ALLOWED_CLAIM_VERDICTS = {"NO_CLAIM_ALLOWED", "HEALTH_ONLY", "EVIDENCE_ONLY"}

DIRECTOR_CONDITION_KEYWORDS = {
    "RESOURCE_DIRECTOR": ["resource", "cost", "scope", "budget"],
    "MEMORY_EVIDENCE_DIRECTOR": ["evidence", "memory", "claim"],
    "QUALITY_DIRECTOR": ["validation", "test", "review"],
    "ARCHITECTURE_DIRECTOR": ["layer", "runtime", "architecture"],
    "PRODUCT_GAME_DIRECTOR": ["product", "gameplay", "player value", "player-value", "player"],
}


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate Director Report V0 fixtures against schema and semantic control-plane constraints."
    )
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing valid_* and invalid_* Director Report fixtures.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def emit_json(payload: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True))


def base_report() -> dict[str, Any]:
    return {
        "overall_status": "BLOCKED",
        "valid_passed": 0,
        "valid_failed": 0,
        "invalid_failed_as_expected": 0,
        "invalid_unexpectedly_passed": 0,
        "semantic_checks_passed": False,
        "errors": [],
    }


def explicit_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def normalize_path(path: Path) -> str:
    try:
        relative = path.resolve().relative_to(PROJECT_ROOT.resolve())
        return str(relative).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"json_file_missing: {normalize_path(path)}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"json_decode_error: {normalize_path(path)}: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"json_read_error: {normalize_path(path)}: {exc}") from exc


def import_validator() -> Any:
    try:
        from jsonschema import Draft202012Validator
    except ModuleNotFoundError as exc:
        raise ConfigError("BLOCKED_MISSING_JSONSCHEMA") from exc
    return Draft202012Validator


def load_schema_validator(draft_validator: Any) -> Any:
    schema_obj = load_json(SCHEMA_PATH)
    if not isinstance(schema_obj, dict):
        raise ConfigError(f"schema_not_object: {normalize_path(SCHEMA_PATH)}")
    draft_validator.check_schema(schema_obj)
    return draft_validator(schema_obj)


def collect_fixture_paths(fixtures_root: Path) -> tuple[list[Path], list[Path]]:
    if not fixtures_root.exists():
        raise ConfigError(f"fixtures_root_missing: {normalize_path(fixtures_root)}")
    if not fixtures_root.is_dir():
        raise ConfigError(f"fixtures_root_not_directory: {normalize_path(fixtures_root)}")

    valid_paths = sorted(fixtures_root.glob("valid_*.json"))
    invalid_paths = sorted(fixtures_root.glob("invalid_*.json"))
    if not valid_paths:
        raise ConfigError(f"no_valid_fixtures_found: {normalize_path(fixtures_root)}")
    if not invalid_paths:
        raise ConfigError(f"no_invalid_fixtures_found: {normalize_path(fixtures_root)}")
    return valid_paths, invalid_paths


def format_validation_error(error: Any) -> str:
    location = ".".join(str(part) for part in error.absolute_path)
    if location:
        return f"$.{location}: {error.message}"
    return f"$: {error.message}"


def schema_errors(validator: Any, payload: Any) -> list[str]:
    errors = sorted(
        validator.iter_errors(payload),
        key=lambda entry: (list(entry.absolute_path), entry.message),
    )
    return [format_validation_error(error) for error in errors]


def _conditions_blob(payload: dict[str, Any]) -> str:
    values: list[str] = []
    for key in ("required_conditions", "blocked_reasons"):
        raw = payload.get(key)
        if isinstance(raw, list):
            values.extend(str(item).lower() for item in raw if isinstance(item, str))
    return " ".join(values)


def _has_director_specific_condition(payload: dict[str, Any], director_type: str) -> bool:
    keywords = DIRECTOR_CONDITION_KEYWORDS.get(director_type)
    if not keywords:
        return True
    blob = _conditions_blob(payload)
    return any(keyword in blob for keyword in keywords)


def _build_ml_review_map(valid_payloads: dict[Path, dict[str, Any]]) -> dict[str, set[str]]:
    ml_review_map: dict[str, set[str]] = {}
    for payload in valid_payloads.values():
        director_type = payload.get("director_type")
        candidates = payload.get("reviewed_pr_candidates")
        if not isinstance(candidates, list) or not isinstance(director_type, str):
            continue
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            if candidate.get("pr_type") != "ML":
                continue
            pr_candidate_id = candidate.get("pr_candidate_id")
            if not isinstance(pr_candidate_id, str) or not pr_candidate_id:
                continue
            ml_review_map.setdefault(pr_candidate_id, set()).add(director_type)
    return ml_review_map


def semantic_errors(payload: Any, ml_review_map: dict[str, set[str]] | None = None) -> list[str]:
    if not isinstance(payload, dict):
        return ["semantic_payload_not_object"]

    errors: list[str] = []
    director_type = payload.get("director_type")

    if payload.get("human_gate_required") is not True:
        errors.append("human_gate_required_not_true")
    if payload.get("auto_ready_allowed") is not False:
        errors.append("auto_ready_allowed_not_false")
    if payload.get("auto_merge_allowed") is not False:
        errors.append("auto_merge_allowed_not_false")

    claim_verdict = payload.get("claim_verdict")
    if claim_verdict not in ALLOWED_CLAIM_VERDICTS:
        errors.append(f"claim_verdict_invalid:{claim_verdict}")

    if payload.get("forbidden_surface_touched") is True and payload.get("director_verdict") != "BLOCKED":
        errors.append("forbidden_surface_requires_blocked_verdict")

    candidates = payload.get("reviewed_pr_candidates")
    if not isinstance(candidates, list):
        errors.append("reviewed_pr_candidates_not_array")
        return sorted(set(errors))

    for candidate in candidates:
        if not isinstance(candidate, dict):
            errors.append("reviewed_pr_candidate_not_object")
            continue

        pr_type = candidate.get("pr_type")
        candidate_risk = candidate.get("risk_level")
        candidate_verdict = candidate.get("director_decision")
        pr_candidate_id = candidate.get("pr_candidate_id")

        if pr_type == "RUNTIME" and director_type not in RUNTIME_REVIEW_DIRECTORS:
            errors.append("runtime_candidate_requires_architecture_director")

        if pr_type == "ML":
            if director_type not in ML_REVIEW_DIRECTORS:
                errors.append("ml_candidate_requires_architecture_or_quality_director")
            if isinstance(pr_candidate_id, str) and ml_review_map is not None:
                ml_directors = ml_review_map.get(pr_candidate_id, set())
                if not ML_REVIEW_DIRECTORS.issubset(ml_directors):
                    errors.append(f"ml_candidate_missing_required_reviews:{pr_candidate_id}")

        if pr_type == "BENCHMARK_BLOCKED":
            if payload.get("director_verdict") == "GO":
                errors.append("benchmark_blocked_candidate_forbids_go_director_verdict")
            if candidate_verdict == "GO":
                errors.append("benchmark_blocked_candidate_forbids_go_candidate_verdict")

        if pr_type == "WORKFLOW" and candidate_risk not in WORKFLOW_RISK_LEVELS:
            errors.append("workflow_candidate_requires_high_or_blocked_risk")

    if isinstance(director_type, str) and not _has_director_specific_condition(payload, director_type):
        if director_type == "RESOURCE_DIRECTOR":
            errors.append("resource_director_missing_resource_cost_scope_condition")
        elif director_type == "MEMORY_EVIDENCE_DIRECTOR":
            errors.append("memory_evidence_director_missing_evidence_memory_claim_condition")
        elif director_type == "QUALITY_DIRECTOR":
            errors.append("quality_director_missing_validation_test_review_condition")
        elif director_type == "ARCHITECTURE_DIRECTOR":
            errors.append("architecture_director_missing_layering_runtime_architecture_condition")
        elif director_type == "PRODUCT_GAME_DIRECTOR":
            errors.append("product_game_director_missing_product_gameplay_player_value_condition")

    return sorted(set(errors))


def run_validation(fixtures_root: Path) -> dict[str, Any]:
    report = base_report()

    draft_validator = import_validator()
    validator = load_schema_validator(draft_validator)
    valid_paths, invalid_paths = collect_fixture_paths(fixtures_root)

    valid_schema_ok: dict[Path, dict[str, Any]] = {}
    for path in valid_paths:
        payload = load_json(path)
        errors = schema_errors(validator, payload)
        if errors:
            report["valid_failed"] += 1
            report["errors"].append(f"valid_failed:{normalize_path(path)}:{errors[0]}")
            continue
        if not isinstance(payload, dict):
            report["valid_failed"] += 1
            report["errors"].append(f"valid_failed:{normalize_path(path)}:semantic_payload_not_object")
            continue
        valid_schema_ok[path] = payload

    ml_review_map = _build_ml_review_map(valid_schema_ok)

    for path, payload in valid_schema_ok.items():
        semantic = semantic_errors(payload, ml_review_map)
        if semantic:
            report["valid_failed"] += 1
            report["errors"].append(f"valid_failed_semantic:{normalize_path(path)}:{semantic[0]}")
            continue
        report["valid_passed"] += 1

    for path in invalid_paths:
        payload = load_json(path)
        errors = schema_errors(validator, payload)
        semantic = semantic_errors(payload, ml_review_map) if not errors else []

        if errors or semantic:
            report["invalid_failed_as_expected"] += 1
            continue

        report["invalid_unexpectedly_passed"] += 1
        report["errors"].append(f"invalid_unexpectedly_passed:{normalize_path(path)}")

    report["errors"] = sorted(report["errors"])
    report["semantic_checks_passed"] = report["valid_failed"] == 0 and report["valid_passed"] > 0

    if report["valid_failed"] or report["invalid_unexpectedly_passed"] or not report["semantic_checks_passed"]:
        report["overall_status"] = "BLOCKED"
    else:
        report["overall_status"] = "PASS"
    return report


def main() -> int:
    args = parse_args()
    fixtures_root = explicit_path(args.fixtures_root)
    try:
        report = run_validation(fixtures_root)
        emit_json(report, args.pretty)
        if report["overall_status"] == "PASS":
            return 0
        return 1
    except ConfigError as exc:
        report = base_report()
        report["errors"] = [str(exc)]
        emit_json(report, args.pretty)
        return 2
    except Exception as exc:  # pragma: no cover - defensive hard stop
        report = base_report()
        report["errors"] = [f"internal_error: {exc}"]
        emit_json(report, args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
