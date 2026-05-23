import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studiopilot_specialist_role_charter.schema.json"
DEFAULT_FIXTURES_ROOT = PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "specialist_role"

ALLOWED_CLAIM_VERDICTS = {"NO_CLAIM_ALLOWED", "HEALTH_ONLY", "EVIDENCE_ONLY"}
REQUIRED_FORBIDDEN_ACTIONS = {
    "auto_merge",
    "auto_ready",
    "claim_escalation",
    "benchmark_as_proof",
    "training_without_scope",
    "runtime_change_without_scope",
}
SECURITY_REQUIRED_ESCALATIONS = {"GOVERNANCE_KERNEL", "HUMAN_FOUNDER"}


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate Specialist Role Charter V0 fixtures against schema and semantic control-plane constraints."
    )
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing valid_* and invalid_* Specialist Role Charter fixtures.",
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


def _surface_enabled(payload: dict[str, Any], surface_name: str) -> bool:
    surfaces = payload.get("permitted_surfaces")
    if not isinstance(surfaces, dict):
        return False
    return surfaces.get(surface_name) is True


def semantic_errors(payload: Any) -> list[str]:
    if not isinstance(payload, dict):
        return ["semantic_payload_not_object"]

    errors: list[str] = []
    specialist_type = payload.get("specialist_type")
    director_owner = payload.get("director_owner")
    escalation_path = payload.get("escalation_path")
    forbidden_actions = payload.get("forbidden_actions")
    allowed_actions = payload.get("allowed_actions")
    freeze_conditions = payload.get("freeze_conditions")
    required_evidence = payload.get("required_evidence")

    if payload.get("human_gate_required") is not True:
        errors.append("human_gate_required_not_true")
    if payload.get("active_agent_allowed") is not False:
        errors.append("active_agent_allowed_not_false")
    if payload.get("auto_ready_allowed") is not False:
        errors.append("auto_ready_allowed_not_false")
    if payload.get("auto_merge_allowed") is not False:
        errors.append("auto_merge_allowed_not_false")
    if payload.get("auto_training_allowed") is not False:
        errors.append("auto_training_allowed_not_false")
    if payload.get("auto_rule_mutation_allowed") is not False:
        errors.append("auto_rule_mutation_allowed_not_false")

    claim_verdict = payload.get("claim_verdict")
    if claim_verdict not in ALLOWED_CLAIM_VERDICTS:
        errors.append(f"claim_verdict_invalid:{claim_verdict}")

    if isinstance(forbidden_actions, list):
        forbidden_set = {item for item in forbidden_actions if isinstance(item, str)}
        missing = sorted(REQUIRED_FORBIDDEN_ACTIONS - forbidden_set)
        if missing:
            errors.append(f"missing_required_forbidden_actions:{','.join(missing)}")
    else:
        errors.append("forbidden_actions_not_array")

    if isinstance(allowed_actions, list):
        allowed_set = {item for item in allowed_actions if isinstance(item, str)}
        if "claim_escalation" in allowed_set:
            errors.append("allowed_actions_contains_claim_escalation")
    else:
        errors.append("allowed_actions_not_array")

    if not isinstance(freeze_conditions, list) or len(freeze_conditions) < 1:
        errors.append("freeze_conditions_missing_or_empty")
    if not isinstance(required_evidence, list) or len(required_evidence) < 1:
        errors.append("required_evidence_missing_or_empty")

    if _surface_enabled(payload, "runtime") or _surface_enabled(payload, "search") or _surface_enabled(payload, "neural"):
        if director_owner != "ARCHITECTURE_DIRECTOR":
            errors.append("runtime_search_neural_surface_requires_architecture_director")

    if _surface_enabled(payload, "ml_training"):
        if director_owner != "ARCHITECTURE_DIRECTOR":
            errors.append("ml_training_surface_requires_architecture_director")
        if not isinstance(escalation_path, list) or "QUALITY_DIRECTOR" not in escalation_path:
            errors.append("ml_training_surface_requires_quality_director_escalation")

    if _surface_enabled(payload, "benchmark"):
        if not isinstance(forbidden_actions, list) or "benchmark_as_proof" not in forbidden_actions:
            errors.append("benchmark_surface_requires_benchmark_as_proof_forbidden")

    if specialist_type == "FINANCE_COMPUTE_SPECIALIST" and director_owner != "RESOURCE_DIRECTOR":
        errors.append("finance_compute_specialist_requires_resource_director")

    if specialist_type == "MEMORY_LEARNING_SPECIALIST" and director_owner != "MEMORY_EVIDENCE_DIRECTOR":
        errors.append("memory_learning_specialist_requires_memory_evidence_director")

    if specialist_type in {"GAME_DESIGN_SPECIALIST", "BALANCE_SIMULATION_SPECIALIST"}:
        if not isinstance(escalation_path, list) or "PRODUCT_GAME_DIRECTOR" not in escalation_path:
            errors.append("game_or_balance_specialist_requires_product_game_director_escalation")

    if specialist_type == "QA_REVIEW_SPECIALIST" and director_owner != "QUALITY_DIRECTOR":
        errors.append("qa_review_specialist_requires_quality_director")

    if specialist_type == "SECURITY_IP_SPECIALIST":
        if not isinstance(escalation_path, list) or not SECURITY_REQUIRED_ESCALATIONS.intersection(
            {item for item in escalation_path if isinstance(item, str)}
        ):
            errors.append("security_ip_specialist_requires_governance_or_human_founder_escalation")

    return sorted(set(errors))


def run_validation(fixtures_root: Path) -> dict[str, Any]:
    report = base_report()

    draft_validator = import_validator()
    validator = load_schema_validator(draft_validator)
    valid_paths, invalid_paths = collect_fixture_paths(fixtures_root)

    for path in valid_paths:
        payload = load_json(path)
        errors = schema_errors(validator, payload)
        if errors:
            report["valid_failed"] += 1
            report["errors"].append(f"valid_failed:{normalize_path(path)}:{errors[0]}")
            continue

        semantic = semantic_errors(payload)
        if semantic:
            report["valid_failed"] += 1
            report["errors"].append(f"valid_failed_semantic:{normalize_path(path)}:{semantic[0]}")
            continue

        report["valid_passed"] += 1

    for path in invalid_paths:
        payload = load_json(path)
        errors = schema_errors(validator, payload)
        semantic = semantic_errors(payload) if not errors else []

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
