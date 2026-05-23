import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studiopilot_learning_event.schema.json"
INPUT_SCHEMA_VERSION = "studiopilot.learning_event_source.v0"
OUTPUT_SCHEMA_VERSION = "studiopilot.learning_event.v0"

ALLOWED_SOURCE_EVENT_TYPES = {
    "PR_MERGED",
    "PR_BLOCKED",
    "PR_FAILED_CHECKS",
    "DIRTY_WORKTREE",
    "BLOCKED_INFRA",
    "BLOCKED_CODE",
    "HUMAN_DECISION",
    "LOCAL_SMOKE_RESULT",
}

ALLOWED_CLAIM_VERDICTS = {
    "NO_CLAIM_ALLOWED",
    "HEALTH_ONLY",
    "EVIDENCE_ONLY",
}


class InputValidationError(Exception):
    pass


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a LearningEvent Minimal V0 draft from one local source JSON."
    )
    parser.add_argument("--input", required=True, help="Path to a local source event JSON file.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def normalize_path(path: Path) -> str:
    try:
        relative = path.resolve().relative_to(PROJECT_ROOT.resolve())
        return str(relative).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def resolve_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise InputValidationError(f"input_missing: {normalize_path(path)}") from exc
    except json.JSONDecodeError as exc:
        raise InputValidationError(f"json_decode_error: {normalize_path(path)}: {exc}") from exc
    except OSError as exc:
        raise InputValidationError(f"json_read_error: {normalize_path(path)}: {exc}") from exc


def load_schema_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"schema_missing: {normalize_path(path)}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"schema_json_decode_error: {normalize_path(path)}: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"schema_read_error: {normalize_path(path)}: {exc}") from exc


def emit_json(payload: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True))


def import_validator() -> Any:
    try:
        from jsonschema import Draft202012Validator
    except ModuleNotFoundError as exc:
        raise ConfigError(
            "BLOCKED_MISSING_JSONSCHEMA: jsonschema is required in the active Python environment; "
            "package installation was not attempted"
        ) from exc
    return Draft202012Validator


def format_validation_error(error: Any) -> str:
    location = ".".join(str(part) for part in error.absolute_path)
    if not location:
        location = "$"
    else:
        location = f"$.{location}"
    return f"{location}: {error.message}"


def schema_validation_errors(payload: dict[str, Any]) -> list[str]:
    validator_cls = import_validator()
    schema_obj = load_schema_json(SCHEMA_PATH)
    if not isinstance(schema_obj, dict):
        raise ConfigError(f"schema_not_object: {normalize_path(SCHEMA_PATH)}")
    validator_cls.check_schema(schema_obj)
    validator = validator_cls(schema_obj)
    errors = sorted(
        validator.iter_errors(payload),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    return [format_validation_error(error) for error in errors]


def require_object(payload: Any, label: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise InputValidationError(f"{label}_must_be_object")
    return payload


def require_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value:
        raise InputValidationError(f"{key}_must_be_non_empty_string")
    return value


def require_int(payload: dict[str, Any], key: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or value < 0:
        raise InputValidationError(f"{key}_must_be_non_negative_integer")
    return value


def optional_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key, "")
    if not isinstance(value, str):
        raise InputValidationError(f"{key}_must_be_string")
    return value


def string_list(payload: dict[str, Any], key: str) -> list[str]:
    value = payload.get(key, [])
    if not isinstance(value, list):
        raise InputValidationError(f"{key}_must_be_array")
    result: list[str] = []
    for item in value:
        if not isinstance(item, str) or not item:
            raise InputValidationError(f"{key}_items_must_be_non_empty_strings")
        result.append(item)
    return result


def normalized_text(*values: str) -> str:
    return " ".join(values).lower()


def classify_failure(payload: dict[str, Any]) -> tuple[str, str]:
    source_event_type = require_string(payload, "source_event_type")
    source_status = str(payload.get("source_status", "")).upper()
    checks_status = str(payload.get("checks_status", "")).upper()
    root_cause = require_string(payload, "root_cause")
    text = normalized_text(
        source_event_type,
        source_status,
        checks_status,
        root_cause,
        optional_string(payload, "observed_symptom"),
        optional_string(payload, "trigger_summary"),
    )

    if source_event_type == "PR_MERGED" or source_status == "MERGED":
        return "SUCCESS", "NONE"
    if "dirty worktree" in text or source_event_type == "DIRTY_WORKTREE":
        return "BLOCKED", "DIRTY_WORKTREE"
    if "checks pending" in text or checks_status == "PENDING":
        return "HOLD", "CHECKS_PENDING"
    if "jsonschema" in text or "final-gate dependency" in text:
        return "BLOCKED_INFRA", "FINAL_GATE_DEPENDENCY_MISSING"
    if source_event_type == "BLOCKED_INFRA" or source_status == "BLOCKED_INFRA":
        return "BLOCKED_INFRA", "BLOCKED_INFRA"
    if checks_status == "FAILED":
        return "BLOCKED", "CHECKS_FAILED"
    if source_event_type == "BLOCKED_CODE":
        return "BLOCKED", "BLOCKED_CODE"
    return "HOLD", "VALIDATION_MISMATCH"


def rule_candidate(payload: dict[str, Any]) -> dict[str, Any]:
    candidate = require_object(payload.get("preventive_rule_candidate"), "preventive_rule_candidate")
    return {
        "rule_id": require_string(candidate, "rule_id"),
        "proposal": require_string(candidate, "proposal"),
        "applies_to": require_string(candidate, "applies_to"),
        "requires_human_approval": True,
        "auto_apply_allowed": False,
    }


def validate_source(payload: dict[str, Any]) -> None:
    if payload.get("schema_version") != INPUT_SCHEMA_VERSION:
        raise InputValidationError("input_schema_version_mismatch")
    source_event_type = require_string(payload, "source_event_type")
    if source_event_type not in ALLOWED_SOURCE_EVENT_TYPES:
        raise InputValidationError("source_event_type_not_allowed")
    claim_verdict = payload.get("claim_verdict", "NO_CLAIM_ALLOWED")
    if claim_verdict not in ALLOWED_CLAIM_VERDICTS:
        raise InputValidationError("claim_verdict_escalation_refused")
    if payload.get("human_gate_required") is False:
        raise InputValidationError("human_gate_required_must_not_be_false")
    for key in (
        "auto_mutation_allowed",
        "auto_rule_promotion_allowed",
        "auto_training_allowed",
    ):
        if payload.get(key) is True:
            raise InputValidationError(f"{key}_must_not_be_true")


def build_learning_event(payload: dict[str, Any]) -> dict[str, Any]:
    validate_source(payload)
    event_outcome, failure_taxonomy = classify_failure(payload)
    source_pr_number = require_int(payload, "source_pr_number")
    source_head_sha = require_string(payload, "source_head_sha")

    event = {
        "schema_version": OUTPUT_SCHEMA_VERSION,
        "learning_event_id": f"LE-{source_pr_number}-{source_head_sha[:12]}",
        "source_event_type": require_string(payload, "source_event_type"),
        "source_pr_number": source_pr_number,
        "source_head_sha": source_head_sha,
        "source_merge_sha": optional_string(payload, "source_merge_sha"),
        "event_outcome": event_outcome,
        "failure_taxonomy": failure_taxonomy,
        "trigger_summary": require_string(payload, "trigger_summary"),
        "observed_symptom": require_string(payload, "observed_symptom"),
        "root_cause": require_string(payload, "root_cause"),
        "impact": require_string(payload, "impact"),
        "corrective_action_taken": require_string(payload, "corrective_action_taken"),
        "preventive_rule_candidate": rule_candidate(payload),
        "evidence_refs": string_list(payload, "evidence_refs"),
        "software_verdict": require_string(payload, "software_verdict"),
        "evidence_verdict": require_string(payload, "evidence_verdict"),
        "claim_verdict": payload.get("claim_verdict", "NO_CLAIM_ALLOWED"),
        "human_gate_required": True,
        "auto_mutation_allowed": False,
        "auto_rule_promotion_allowed": False,
        "auto_training_allowed": False,
        "created_by": payload.get("created_by", "LOCAL_TOOL_DRY_RUN"),
        "status": payload.get("status", "DRAFT"),
    }

    errors = schema_validation_errors(event)
    if errors:
        raise ConfigError(f"output_schema_validation_failed: {errors[0]}")
    return event


def load_and_build_learning_event(input_path: Path) -> dict[str, Any]:
    payload = load_json(input_path)
    return build_learning_event(require_object(payload, "input"))


def main() -> int:
    args = parse_args()
    try:
        event = load_and_build_learning_event(resolve_path(args.input))
        emit_json(event, args.pretty)
        return 0
    except InputValidationError as exc:
        emit_json(
            {
                "overall_status": "BLOCKED",
                "error_type": "INPUT_VALIDATION_ERROR",
                "errors": [str(exc)],
            },
            args.pretty,
        )
        return 1
    except ConfigError as exc:
        emit_json(
            {
                "overall_status": "BLOCKED",
                "error_type": "CONFIG_ERROR",
                "errors": [str(exc)],
            },
            args.pretty,
        )
        return 2
    except Exception as exc:  # pragma: no cover - defensive hard stop
        emit_json(
            {
                "overall_status": "BLOCKED",
                "error_type": "INTERNAL_ERROR",
                "errors": [str(exc)],
            },
            args.pretty,
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
