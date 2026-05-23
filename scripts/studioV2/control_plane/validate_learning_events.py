import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FIXTURES_ROOT = PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "learning_event"
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studiopilot_learning_event.schema.json"


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate LearningEvent Minimal V0 fixtures.")
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing valid_learning_event_* and invalid_learning_event_* fixtures.",
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
        raise ConfigError(f"json_file_missing: {normalize_path(path)}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"json_decode_error: {normalize_path(path)}: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"json_read_error: {normalize_path(path)}: {exc}") from exc


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


def validation_errors(validator: Any, payload: Any) -> list[str]:
    errors = sorted(
        validator.iter_errors(payload),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    return [format_validation_error(error) for error in errors]


def collect_fixtures(fixtures_root: Path) -> tuple[list[Path], list[Path]]:
    if not fixtures_root.exists():
        raise ConfigError(f"fixtures_root_missing: {normalize_path(fixtures_root)}")
    if not fixtures_root.is_dir():
        raise ConfigError(f"fixtures_root_not_directory: {normalize_path(fixtures_root)}")

    valid_paths = sorted(fixtures_root.glob("valid_learning_event_*.json"))
    invalid_paths = sorted(fixtures_root.glob("invalid_learning_event_*.json"))
    if not valid_paths:
        raise ConfigError(f"no_valid_fixtures_found: {normalize_path(fixtures_root)}")
    if not invalid_paths:
        raise ConfigError(f"no_invalid_fixtures_found: {normalize_path(fixtures_root)}")
    return valid_paths, invalid_paths


def validate_expected_valid(report: dict[str, Any], validator: Any, path: Path) -> None:
    payload = load_json(path)
    errors = validation_errors(validator, payload)
    if errors:
        report["valid_failed"] += 1
        report["errors"].append(f"valid_failed: {normalize_path(path)}: {errors[0]}")
        return
    report["valid_passed"] += 1


def validate_expected_invalid(report: dict[str, Any], validator: Any, path: Path) -> None:
    payload = load_json(path)
    errors = validation_errors(validator, payload)
    if errors:
        report["invalid_failed_as_expected"] += 1
        return
    report["invalid_unexpectedly_passed"] += 1
    report["errors"].append(f"invalid_unexpectedly_passed: {normalize_path(path)}")


def main() -> int:
    args = parse_args()
    report = base_report()

    try:
        validator_cls = import_validator()
        schema_obj = load_json(SCHEMA_PATH)
        if not isinstance(schema_obj, dict):
            raise ConfigError(f"schema_not_object: {normalize_path(SCHEMA_PATH)}")
        validator_cls.check_schema(schema_obj)
        validator = validator_cls(schema_obj)

        valid_paths, invalid_paths = collect_fixtures(resolve_path(args.fixtures_root))
        for path in valid_paths:
            validate_expected_valid(report, validator, path)
        for path in invalid_paths:
            validate_expected_invalid(report, validator, path)

        report["errors"] = sorted(report["errors"])
        if report["valid_failed"] or report["invalid_unexpectedly_passed"]:
            print_report(report, args.pretty)
            return 1

        report["overall_status"] = "PASS"
        print_report(report, args.pretty)
        return 0
    except ConfigError as exc:
        report["errors"] = [str(exc)]
        print_report(report, args.pretty)
        return 2
    except Exception as exc:  # pragma: no cover - defensive hard stop
        report["errors"] = [f"internal_error: {exc}"]
        print_report(report, args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
