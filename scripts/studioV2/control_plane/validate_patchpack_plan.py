import argparse
import json
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_FIXTURES_ROOT = PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "patchpack"
SCHEMAS_ROOT = PROJECT_ROOT / "schemas"

SCHEMA_FILES = {
    "campaign_plan": "studiopilot_campaign_plan.schema.json",
    "pr_queue": "studiopilot_pr_queue.schema.json",
}


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate PatchPack CampaignPlan and PRQueue schemas plus local fixtures."
    )
    parser.add_argument("--campaign-plan", help="Specific CampaignPlan JSON file to validate.")
    parser.add_argument("--pr-queue", help="Specific PRQueue JSON file to validate.")
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing valid_* and invalid_* PatchPack fixtures.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print the JSON summary.")
    return parser.parse_args()


def print_report(report: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    print(json.dumps(report, separators=(",", ":"), sort_keys=True))


def base_report() -> dict[str, Any]:
    return {
        "overall_status": "BLOCKED",
        "valid_passed": 0,
        "valid_failed": 0,
        "invalid_failed_as_expected": 0,
        "invalid_unexpectedly_passed": 0,
        "errors": [],
    }


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"json_file_missing: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"json_decode_error: {path}: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"json_read_error: {path}: {exc}") from exc


def import_validator() -> Any:
    try:
        from jsonschema import Draft202012Validator
    except ModuleNotFoundError as exc:
        raise ConfigError(
            "missing_dependency: jsonschema is required in the active Python environment; "
            "package installation was not attempted"
        ) from exc
    return Draft202012Validator


def load_validators(draft_validator: Any) -> dict[str, Any]:
    validators: dict[str, Any] = {}
    for schema_key, schema_name in sorted(SCHEMA_FILES.items()):
        schema_path = SCHEMAS_ROOT / schema_name
        schema_obj = load_json(schema_path)
        if not isinstance(schema_obj, dict):
            raise ConfigError(f"schema_not_object: {schema_path}")
        draft_validator.check_schema(schema_obj)
        validators[schema_key] = draft_validator(schema_obj)
    return validators


def normalize_path(path: Path) -> str:
    try:
        relative = path.resolve().relative_to(PROJECT_ROOT.resolve())
        return str(relative).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def schema_key_for_fixture(path: Path) -> str:
    name = path.name
    if "campaign_plan" in name:
        return "campaign_plan"
    if "pr_queue" in name:
        return "pr_queue"
    raise ConfigError(f"fixture_schema_unknown: {normalize_path(path)}")


def format_validation_error(error: Any) -> str:
    location = ".".join(str(part) for part in error.absolute_path)
    if not location:
        location = "$"
    else:
        location = f"$.{location}"
    return f"{location}: {error.message}"


def validation_errors(validator: Any, payload: Any) -> list[str]:
    errors = sorted(
        validator.iter_errors(payload),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    return [format_validation_error(error) for error in errors]


def validate_expected_valid(
    *,
    report: dict[str, Any],
    validators: dict[str, Any],
    path: Path,
    schema_key: str,
) -> None:
    payload = load_json(path)
    errors = validation_errors(validators[schema_key], payload)
    if errors:
        report["valid_failed"] += 1
        report["errors"].append(f"valid_failed: {normalize_path(path)}: {errors[0]}")
        return
    report["valid_passed"] += 1


def validate_expected_invalid(
    *,
    report: dict[str, Any],
    validators: dict[str, Any],
    path: Path,
    schema_key: str,
) -> None:
    payload = load_json(path)
    errors = validation_errors(validators[schema_key], payload)
    if errors:
        report["invalid_failed_as_expected"] += 1
        return
    report["invalid_unexpectedly_passed"] += 1
    report["errors"].append(f"invalid_unexpectedly_passed: {normalize_path(path)}")


def explicit_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def collect_default_fixtures(fixtures_root: Path) -> tuple[list[Path], list[Path]]:
    if not fixtures_root.exists():
        raise ConfigError(f"fixtures_root_missing: {fixtures_root}")
    if not fixtures_root.is_dir():
        raise ConfigError(f"fixtures_root_not_directory: {fixtures_root}")

    valid_paths = sorted(fixtures_root.glob("valid_*.json"))
    invalid_paths = sorted(fixtures_root.glob("invalid_*.json"))
    if not valid_paths:
        raise ConfigError(f"no_valid_fixtures_found: {fixtures_root}")
    if not invalid_paths:
        raise ConfigError(f"no_invalid_fixtures_found: {fixtures_root}")
    return valid_paths, invalid_paths


def main() -> int:
    args = parse_args()
    report = base_report()

    try:
        draft_validator = import_validator()
        validators = load_validators(draft_validator)

        explicit_targets: list[tuple[Path, str]] = []
        if args.campaign_plan:
            explicit_targets.append((explicit_path(args.campaign_plan), "campaign_plan"))
        if args.pr_queue:
            explicit_targets.append((explicit_path(args.pr_queue), "pr_queue"))

        if explicit_targets:
            for path, schema_key in explicit_targets:
                validate_expected_valid(
                    report=report,
                    validators=validators,
                    path=path,
                    schema_key=schema_key,
                )
        else:
            fixtures_root = explicit_path(args.fixtures_root)
            valid_paths, invalid_paths = collect_default_fixtures(fixtures_root)

            for path in valid_paths:
                validate_expected_valid(
                    report=report,
                    validators=validators,
                    path=path,
                    schema_key=schema_key_for_fixture(path),
                )
            for path in invalid_paths:
                validate_expected_invalid(
                    report=report,
                    validators=validators,
                    path=path,
                    schema_key=schema_key_for_fixture(path),
                )

        report["errors"] = sorted(report["errors"])
        if report["valid_failed"] or report["invalid_unexpectedly_passed"]:
            report["overall_status"] = "BLOCKED"
            print_report(report, args.pretty)
            return 1

        report["overall_status"] = "PASS"
        print_report(report, args.pretty)
        return 0
    except ConfigError as exc:
        report["overall_status"] = "BLOCKED"
        report["errors"] = [str(exc)]
        print_report(report, args.pretty)
        return 2
    except Exception as exc:  # pragma: no cover - defensive hard stop
        report["overall_status"] = "BLOCKED"
        report["errors"] = [f"internal_error: {exc}"]
        print_report(report, args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
