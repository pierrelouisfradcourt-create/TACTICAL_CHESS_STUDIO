import argparse
import fnmatch
import json
import posixpath
import sys
from pathlib import Path
from typing import Any

try:
    import jsonschema
except ImportError:
    print("BLOCKED_MISSING_JSONSCHEMA")
    raise SystemExit(2)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMAS_ROOT = PROJECT_ROOT / "schemas"

EXECUTION_REPORT_SCHEMA = "studiopilot_execution_report.schema.json"
TASK_PACKET_SCHEMA = "studiopilot_task_packet.schema.json"

CLAIM_ORDER = {
    "NO_CLAIM_ALLOWED": 0,
    "HEALTH_ONLY": 1,
    "EVIDENCE_ONLY": 2,
}

BLOCKED = "BLOCKED"
PASS = "PASS"
UNKNOWN = "UNKNOWN"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Dry-run intake validation for a StudioPilot ExecutionReport JSON."
    )
    parser.add_argument("execution_report_path", help="Path to a StudioPilot ExecutionReport JSON file.")
    parser.add_argument(
        "--task-packet",
        dest="task_packet_path",
        default=None,
        help="Optional path to a StudioPilot TaskPacket JSON file for boundary checks.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print output JSON.")
    return parser.parse_args()


def print_report(report: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    print(json.dumps(report, separators=(",", ":"), sort_keys=True))


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_validator(schema_name: str) -> jsonschema.protocols.Validator:
    schema_path = SCHEMAS_ROOT / schema_name
    if not schema_path.exists():
        raise FileNotFoundError(f"schema_missing: {schema_path}")
    schema_obj = load_json(schema_path)
    validator_class = jsonschema.validators.validator_for(schema_obj)
    validator_class.check_schema(schema_obj)
    format_checker = getattr(validator_class, "FORMAT_CHECKER", None)
    if format_checker is None:
        return validator_class(schema_obj)
    return validator_class(schema_obj, format_checker=format_checker)


def normalize_path(raw_path: str) -> str:
    normalized = raw_path.replace("\\", "/").strip()
    while normalized.startswith("./"):
        normalized = normalized[2:]
    if normalized.startswith("/"):
        normalized = normalized[1:]
    collapsed = posixpath.normpath(normalized) if normalized else ""
    if collapsed == ".":
        return ""
    return collapsed


def is_pattern_supported(pattern: str) -> bool:
    # V0 intentionally keeps matching conservative and explicit.
    return "[" not in pattern and "]" not in pattern


def path_matches_pattern(path_value: str, pattern: str) -> bool:
    if pattern.endswith("/**"):
        prefix = pattern[:-3]
        if not prefix:
            return True
        if path_value == prefix.rstrip("/"):
            return True
        return path_value.startswith(prefix)
    return fnmatch.fnmatchcase(path_value, pattern)


def evaluate_match(
    changed_files: list[str],
    patterns: list[str],
    check_name: str,
    errors: list[str],
) -> tuple[str, list[str]]:
    normalized_patterns = [normalize_path(item) for item in patterns]
    unsupported = [item for item in normalized_patterns if not is_pattern_supported(item)]
    if unsupported:
        errors.append(f"{check_name}_unsupported_patterns: {unsupported}")
        return UNKNOWN, []

    matched_files: list[str] = []
    for raw_file in changed_files:
        normalized_file = normalize_path(raw_file)
        if any(path_matches_pattern(normalized_file, pattern) for pattern in normalized_patterns):
            matched_files.append(raw_file)
    return PASS, matched_files


def as_bool_text(value: bool | None) -> bool | str:
    if value is None:
        return UNKNOWN
    return value


def main() -> int:
    args = parse_args()
    execution_report_path = Path(args.execution_report_path).resolve()
    task_packet_path = Path(args.task_packet_path).resolve() if args.task_packet_path else None

    errors: list[str] = []
    schema_valid = False
    task_packet_checked = task_packet_path is not None
    task_id_match: bool | None = None
    allowed_path_result = UNKNOWN
    forbidden_path_result = PASS
    claim_scope_result = PASS
    scope_deviation_result = UNKNOWN

    try:
        execution_validator = load_validator(EXECUTION_REPORT_SCHEMA)
        task_validator = load_validator(TASK_PACKET_SCHEMA)
    except Exception as exc:
        report = {
            "overall_status": BLOCKED,
            "schema_valid": schema_valid,
            "task_packet_checked": task_packet_checked,
            "task_id_match": as_bool_text(task_id_match),
            "allowed_path_result": allowed_path_result,
            "forbidden_path_result": forbidden_path_result,
            "claim_scope_result": claim_scope_result,
            "scope_deviation_result": scope_deviation_result,
            "errors": [f"internal_error: {exc}"],
        }
        print_report(report, args.pretty)
        return 2

    try:
        execution_report = load_json(execution_report_path)
    except Exception as exc:
        report = {
            "overall_status": BLOCKED,
            "schema_valid": schema_valid,
            "task_packet_checked": task_packet_checked,
            "task_id_match": as_bool_text(task_id_match),
            "allowed_path_result": allowed_path_result,
            "forbidden_path_result": forbidden_path_result,
            "claim_scope_result": claim_scope_result,
            "scope_deviation_result": scope_deviation_result,
            "errors": [f"execution_report_load_error: {exc}"],
        }
        print_report(report, args.pretty)
        return 2

    execution_errors = list(execution_validator.iter_errors(execution_report))
    if execution_errors:
        for validation_error in execution_errors:
            location = "/".join(str(item) for item in validation_error.path)
            if location:
                errors.append(f"execution_report_schema_error[{location}]: {validation_error.message}")
            else:
                errors.append(f"execution_report_schema_error: {validation_error.message}")
    else:
        schema_valid = True

    if task_packet_checked and schema_valid:
        try:
            task_packet = load_json(task_packet_path)
        except Exception as exc:
            errors.append(f"task_packet_load_error: {exc}")
            task_packet = None

        if task_packet is not None:
            task_errors = list(task_validator.iter_errors(task_packet))
            if task_errors:
                for validation_error in task_errors:
                    location = "/".join(str(item) for item in validation_error.path)
                    if location:
                        errors.append(f"task_packet_schema_error[{location}]: {validation_error.message}")
                    else:
                        errors.append(f"task_packet_schema_error: {validation_error.message}")
            else:
                execution_task_id = execution_report.get("task_id")
                packet_task_id = task_packet.get("task_id")
                task_id_match = execution_task_id == packet_task_id
                if not task_id_match:
                    errors.append(
                        f"task_id_mismatch: execution_report.task_id={execution_task_id!r} task_packet.task_id={packet_task_id!r}"
                    )

                changed_files = execution_report.get("changed_files", [])
                if not isinstance(changed_files, list):
                    changed_files = []

                forbidden_eval_result, forbidden_matches = evaluate_match(
                    changed_files=changed_files,
                    patterns=task_packet.get("forbidden_paths", []),
                    check_name="forbidden_path",
                    errors=errors,
                )
                if forbidden_eval_result == UNKNOWN:
                    forbidden_path_result = BLOCKED
                    errors.append("forbidden_path_match_result_unknown")
                elif forbidden_matches:
                    forbidden_path_result = BLOCKED
                    errors.append(f"forbidden_paths_touched: {forbidden_matches}")
                else:
                    forbidden_path_result = PASS

                allowed_eval_result, _ = evaluate_match(
                    changed_files=changed_files,
                    patterns=task_packet.get("allowed_paths", []),
                    check_name="allowed_path",
                    errors=errors,
                )
                if allowed_eval_result == UNKNOWN:
                    allowed_path_result = UNKNOWN
                    errors.append("allowed_path_match_result_unknown")
                else:
                    outside_allowed = []
                    normalized_allowed = [normalize_path(item) for item in task_packet.get("allowed_paths", [])]
                    for changed_file in changed_files:
                        normalized_file = normalize_path(changed_file)
                        if any(path_matches_pattern(normalized_file, pattern) for pattern in normalized_allowed):
                            continue
                        outside_allowed.append(changed_file)

                    if outside_allowed:
                        allowed_path_result = BLOCKED
                        errors.append(f"paths_outside_allowed_paths: {outside_allowed}")
                    else:
                        allowed_path_result = PASS

                report_claim_verdict = execution_report.get("claim_verdict")
                packet_claim_scope = task_packet.get("claim_scope")
                report_rank = CLAIM_ORDER.get(report_claim_verdict)
                packet_rank = CLAIM_ORDER.get(packet_claim_scope)
                if report_rank is None or packet_rank is None:
                    claim_scope_result = BLOCKED
                    errors.append(
                        f"claim_scope_unrecognized_values: execution_report={report_claim_verdict!r} task_packet={packet_claim_scope!r}"
                    )
                elif report_rank > packet_rank:
                    claim_scope_result = BLOCKED
                    errors.append(
                        f"claim_scope_exceeded: execution_report={report_claim_verdict} task_packet={packet_claim_scope}"
                    )
                else:
                    claim_scope_result = PASS

                validation_results = execution_report.get("validation_results")
                if not isinstance(validation_results, list) or len(validation_results) == 0:
                    errors.append("validation_results_missing_or_empty")

                if forbidden_path_result == BLOCKED:
                    if execution_report.get("scope_deviation") == "BLOCKING":
                        scope_deviation_result = PASS
                    else:
                        scope_deviation_result = BLOCKED
                        errors.append("scope_deviation_must_be_BLOCKING_when_forbidden_paths_touched")
                else:
                    scope_deviation_result = UNKNOWN

    if task_packet_checked and not schema_valid:
        errors.append("task_packet_checks_skipped_due_to_execution_report_schema_failure")

    if not schema_valid:
        overall_status = BLOCKED
        exit_code = 1
    elif errors:
        overall_status = BLOCKED
        exit_code = 1
    elif task_packet_checked and (
        task_id_match is not True
        or allowed_path_result in (BLOCKED, UNKNOWN)
        or forbidden_path_result != PASS
        or claim_scope_result != PASS
    ):
        overall_status = BLOCKED
        exit_code = 1
    else:
        overall_status = PASS
        exit_code = 0

    report = {
        "overall_status": overall_status,
        "schema_valid": schema_valid,
        "task_packet_checked": task_packet_checked,
        "task_id_match": as_bool_text(task_id_match),
        "allowed_path_result": allowed_path_result,
        "forbidden_path_result": forbidden_path_result,
        "claim_scope_result": claim_scope_result,
        "scope_deviation_result": scope_deviation_result,
        "errors": errors,
    }
    print_report(report, args.pretty)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
