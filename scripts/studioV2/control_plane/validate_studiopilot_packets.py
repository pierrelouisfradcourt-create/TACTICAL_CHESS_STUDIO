import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import jsonschema
except ImportError:
    print("BLOCKED_MISSING_JSONSCHEMA")
    raise SystemExit(2)


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_FIXTURES_ROOT = PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "studiopilot_packets"
SCHEMAS_ROOT = PROJECT_ROOT / "schemas"

FIXTURE_SCHEMA_MAP: dict[str, str] = {
    "valid/valid_task_packet_docs.json": "studiopilot_task_packet.schema.json",
    "invalid/invalid_task_packet_missing_human_gate.json": "studiopilot_task_packet.schema.json",
    "invalid/invalid_task_packet_unbounded_paths.json": "studiopilot_task_packet.schema.json",
    "valid/valid_execution_report_docs.json": "studiopilot_execution_report.schema.json",
    "invalid/invalid_execution_report_claim_escalation.json": "studiopilot_execution_report.schema.json",
    "valid/valid_review_packet_safe_to_ready.json": "studiopilot_review_packet.schema.json",
    "invalid/invalid_review_packet_authorizes_merge.json": "studiopilot_review_packet.schema.json",
    "valid/valid_human_decision_hold.json": "studiopilot_human_decision.schema.json",
    "invalid/invalid_human_decision_missing_rollback.json": "studiopilot_human_decision.schema.json",
}

REQUIRED_SCHEMAS = (
    "studiopilot_task_packet.schema.json",
    "studiopilot_execution_report.schema.json",
    "studiopilot_review_packet.schema.json",
    "studiopilot_human_decision.schema.json",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate StudioPilot V0 schemas against V0 fixtures (valid must pass, invalid must fail)."
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print the summary output as indented JSON.")
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory for StudioPilot packet fixtures.",
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def make_validator(schema_obj: dict[str, Any]) -> jsonschema.protocols.Validator:
    validator_class = jsonschema.validators.validator_for(schema_obj)
    validator_class.check_schema(schema_obj)
    format_checker = getattr(validator_class, "FORMAT_CHECKER", None)
    if format_checker is None:
        return validator_class(schema_obj)
    return validator_class(schema_obj, format_checker=format_checker)


def print_report(report: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    print(json.dumps(report, separators=(",", ":"), sort_keys=True))


def relative_fixture_path(path: Path, fixtures_root: Path) -> str:
    return str(path.resolve().relative_to(fixtures_root.resolve())).replace("\\", "/")


def main() -> int:
    args = parse_args()
    fixtures_root = Path(args.fixtures_root).resolve()

    errors: list[str] = []
    valid_passed = 0
    valid_failed = 0
    invalid_failed_as_expected = 0
    invalid_unexpectedly_passed = 0

    try:
        if not fixtures_root.exists():
            errors.append(f"fixtures_root_missing: {fixtures_root}")
            report = {
                "overall_status": "BLOCKED",
                "valid_passed": valid_passed,
                "valid_failed": valid_failed,
                "invalid_failed_as_expected": invalid_failed_as_expected,
                "invalid_unexpectedly_passed": invalid_unexpectedly_passed,
                "errors": errors,
            }
            print_report(report, args.pretty)
            return 2

        validators: dict[str, jsonschema.protocols.Validator] = {}
        for schema_name in REQUIRED_SCHEMAS:
            schema_path = SCHEMAS_ROOT / schema_name
            if not schema_path.exists():
                errors.append(f"schema_missing: {schema_path}")
                continue
            schema_obj = load_json(schema_path)
            validators[schema_name] = make_validator(schema_obj)

        expected_fixture_rel_paths = set(FIXTURE_SCHEMA_MAP.keys())
        discovered_fixture_rel_paths: set[str] = set()

        for subset in ("valid", "invalid"):
            subset_dir = fixtures_root / subset
            if not subset_dir.exists():
                errors.append(f"fixtures_subdir_missing: {subset_dir}")
                continue
            for path in sorted(subset_dir.glob("*.json")):
                discovered_fixture_rel_paths.add(relative_fixture_path(path, fixtures_root))

        missing_fixtures = sorted(expected_fixture_rel_paths - discovered_fixture_rel_paths)
        unexpected_fixtures = sorted(discovered_fixture_rel_paths - expected_fixture_rel_paths)

        for rel_path in missing_fixtures:
            errors.append(f"mapped_fixture_missing: {rel_path}")
        for rel_path in unexpected_fixtures:
            errors.append(f"unexpected_fixture_without_explicit_mapping: {rel_path}")

        if errors:
            report = {
                "overall_status": "BLOCKED",
                "valid_passed": valid_passed,
                "valid_failed": valid_failed,
                "invalid_failed_as_expected": invalid_failed_as_expected,
                "invalid_unexpectedly_passed": invalid_unexpectedly_passed,
                "errors": errors,
            }
            print_report(report, args.pretty)
            return 2

        for rel_path, schema_name in FIXTURE_SCHEMA_MAP.items():
            validator = validators.get(schema_name)
            if validator is None:
                errors.append(f"validator_unavailable_for_schema: {schema_name}")
                continue

            fixture_path = fixtures_root / rel_path
            try:
                payload = load_json(fixture_path)
            except (json.JSONDecodeError, OSError) as exc:
                errors.append(f"fixture_load_error: {rel_path}: {exc}")
                continue

            validation_errors = list(validator.iter_errors(payload))
            is_valid_fixture = rel_path.startswith("valid/")

            if is_valid_fixture:
                if validation_errors:
                    valid_failed += 1
                    first_error = validation_errors[0]
                    errors.append(
                        f"valid_fixture_failed: {rel_path}: {first_error.message}"
                    )
                else:
                    valid_passed += 1
            else:
                if validation_errors:
                    invalid_failed_as_expected += 1
                else:
                    invalid_unexpectedly_passed += 1
                    errors.append(f"invalid_fixture_unexpectedly_passed: {rel_path}")

        if any(
            (
                valid_failed > 0,
                invalid_unexpectedly_passed > 0,
            )
        ):
            overall_status = "BLOCKED"
            exit_code = 1
        elif errors:
            overall_status = "BLOCKED"
            exit_code = 2
        else:
            overall_status = "PASS"
            exit_code = 0

        report = {
            "overall_status": overall_status,
            "valid_passed": valid_passed,
            "valid_failed": valid_failed,
            "invalid_failed_as_expected": invalid_failed_as_expected,
            "invalid_unexpectedly_passed": invalid_unexpectedly_passed,
            "errors": errors,
        }
        print_report(report, args.pretty)
        return exit_code
    except Exception as exc:  # pragma: no cover - hard guard for internal failures
        report = {
            "overall_status": "BLOCKED",
            "valid_passed": valid_passed,
            "valid_failed": valid_failed,
            "invalid_failed_as_expected": invalid_failed_as_expected,
            "invalid_unexpectedly_passed": invalid_unexpectedly_passed,
            "errors": [f"internal_error: {exc}"],
        }
        print_report(report, args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
