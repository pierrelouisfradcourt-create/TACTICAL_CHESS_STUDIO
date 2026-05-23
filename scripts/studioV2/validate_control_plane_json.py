import argparse
import fnmatch
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SCHEMA_PATHS: dict[str, Path] = {
    "task_packet": PROJECT_ROOT / "schemas/task_packet.schema.json",
    "agent_profile": PROJECT_ROOT / "schemas/agent_profile.schema.json",
    "agent_scorecard": PROJECT_ROOT / "schemas/agent_scorecard.schema.json",
    "audit_event": PROJECT_ROOT / "schemas/audit_event.schema.json",
    "reward_log": PROJECT_ROOT / "schemas/reward_log.schema.json",
    "block_manifest": PROJECT_ROOT / "schemas/block_manifest.schema.json",
}

FIXTURE_SCHEMA_KEY = {
    "task_packet": "task_packet",
    "agent_profile": "agent_profile",
    "agent_scorecard": "agent_scorecard",
    "audit_event": "audit_event",
    "reward_log": "reward_log",
    "block_manifest": "block_manifest",
}


@dataclass
class Target:
    path: Path
    schema_key: str
    expected_valid: bool
    source: str


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Strict JSON Schema validation for control-plane files.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    parser.add_argument("--paths", nargs="*", help="Specific JSON paths to validate.")
    parser.add_argument(
        "--fixtures-root",
        default="lab/agent_tasks/fixtures",
        help="Root path for valid/invalid fixtures.",
    )
    parser.add_argument(
        "--skip-fixtures",
        action="store_true",
        help="Skip valid/invalid fixture validation.",
    )
    return parser.parse_args(argv)


def normalize_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def rel_path(path: Path) -> str:
    try:
        relative = path.resolve().relative_to(PROJECT_ROOT.resolve())
        return normalize_path(str(relative))
    except ValueError:
        return normalize_path(str(path))


def load_json(path: Path) -> tuple[Any | None, str | None]:
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except FileNotFoundError:
        return None, f"MISSING_JSON_FILE: {rel_path(path)}"
    except json.JSONDecodeError as exc:
        return None, f"INVALID_JSON: {rel_path(path)}: {exc}"
    except OSError as exc:
        return None, f"JSON_READ_FAILED: {rel_path(path)}: {exc}"


def import_jsonschema() -> tuple[Any | None, str | None]:
    try:
        from jsonschema import Draft202012Validator
    except ModuleNotFoundError:
        message = (
            "MISSING_DEPENDENCY: jsonschema is required for strict schema validation. "
            "Install with '.\\.venv312\\Scripts\\python.exe -m pip install -r requirements-control-plane.txt' "
            "or 'python -m pip install -r requirements-control-plane.txt'."
        )
        return None, message
    return Draft202012Validator, None


def format_validation_error(error: Any) -> str:
    location = "/" + "/".join(str(part) for part in list(error.absolute_path))
    if location == "/":
        location = "/"
    return f"{location}: {error.message}"


def validate_payload(validator_cls: Any, schema: dict[str, Any], payload: Any) -> list[str]:
    validator = validator_cls(schema)
    errors = sorted(validator.iter_errors(payload), key=lambda err: (list(err.absolute_path), err.message))
    return [format_validation_error(error) for error in errors]


def classify_path(path: Path) -> str | None:
    relative = rel_path(path)
    file_name = path.name

    if fnmatch.fnmatchcase(relative, "lab/agent_tasks/*.json"):
        if file_name.startswith("block_"):
            return "block_manifest"
        return "task_packet"
    if fnmatch.fnmatchcase(relative, "lab/agent_registry/*.agent.json"):
        return "agent_profile"
    if file_name == "audit_event.json":
        return "audit_event"
    if file_name == "reward_log.json":
        return "reward_log"
    return None


def collect_default_targets(fixtures_root: Path, include_fixtures: bool) -> tuple[list[Target], list[str]]:
    targets: list[Target] = []
    notes: list[str] = []

    for path in sorted((PROJECT_ROOT / "lab/agent_tasks").glob("*.json")):
        schema_key = classify_path(path)
        if not schema_key:
            continue
        targets.append(Target(path=path, schema_key=schema_key, expected_valid=True, source="default"))

    for path in sorted((PROJECT_ROOT / "lab/agent_registry").glob("*.agent.json")):
        targets.append(Target(path=path, schema_key="agent_profile", expected_valid=True, source="default"))

    if include_fixtures:
        valid_dir = fixtures_root / "valid"
        invalid_dir = fixtures_root / "invalid"

        for path in sorted(valid_dir.glob("*.json")):
            prefix = path.name.split(".", 1)[0]
            schema_key = FIXTURE_SCHEMA_KEY.get(prefix)
            if not schema_key:
                notes.append(f"SKIPPED_FIXTURE_UNKNOWN_SCHEMA: {rel_path(path)}")
                continue
            targets.append(Target(path=path, schema_key=schema_key, expected_valid=True, source="fixture-valid"))

        for path in sorted(invalid_dir.glob("*.json")):
            prefix = path.name.split(".", 1)[0]
            schema_key = FIXTURE_SCHEMA_KEY.get(prefix)
            if not schema_key:
                notes.append(f"SKIPPED_FIXTURE_UNKNOWN_SCHEMA: {rel_path(path)}")
                continue
            targets.append(Target(path=path, schema_key=schema_key, expected_valid=False, source="fixture-invalid"))

    return targets, notes


def collect_selected_targets(raw_paths: list[str]) -> tuple[list[Target], list[str]]:
    targets: list[Target] = []
    notes: list[str] = []

    for raw_path in raw_paths:
        path = Path(raw_path)
        if not path.is_absolute():
            path = PROJECT_ROOT / path
        schema_key = classify_path(path)
        if not schema_key:
            notes.append(f"SKIPPED_NON_CONTROL_PLANE_JSON: {normalize_path(raw_path)}")
            continue
        targets.append(Target(path=path, schema_key=schema_key, expected_valid=True, source="selected"))

    return targets, notes


def run_validation(
    *,
    selected_paths: list[str] | None = None,
    include_fixtures: bool = True,
    fixtures_root: Path | None = None,
) -> dict[str, Any]:
    validator_cls, dep_error = import_jsonschema()
    if dep_error:
        return {
            "ok": False,
            "errors": [dep_error],
            "notes": [],
            "summary": {
                "schemas_checked": 0,
                "valid_files_checked": 0,
                "invalid_fixtures_checked": 0,
                "invalid_fixtures_rejected": 0,
            },
        }

    schema_payloads: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    notes: list[str] = []

    for schema_key, schema_path in SCHEMA_PATHS.items():
        payload, load_error = load_json(schema_path)
        if load_error:
            errors.append(load_error)
            continue
        if not isinstance(payload, dict):
            errors.append(f"SCHEMA_NOT_OBJECT: {rel_path(schema_path)}")
            continue
        try:
            validator_cls.check_schema(payload)
        except Exception as exc:  # pragma: no cover - defensive for jsonschema internals
            errors.append(f"INVALID_SCHEMA: {rel_path(schema_path)}: {exc}")
            continue
        schema_payloads[schema_key] = payload

    target_fixtures_root = fixtures_root or (PROJECT_ROOT / "lab/agent_tasks/fixtures")
    if selected_paths:
        targets, selected_notes = collect_selected_targets(selected_paths)
    else:
        targets, selected_notes = collect_default_targets(target_fixtures_root, include_fixtures)
    notes.extend(selected_notes)

    valid_files_checked = 0
    invalid_fixtures_checked = 0
    invalid_fixtures_rejected = 0

    for target in targets:
        schema = schema_payloads.get(target.schema_key)
        if schema is None:
            errors.append(
                f"SCHEMA_NOT_AVAILABLE_FOR_TARGET: {target.schema_key} required by {rel_path(target.path)}"
            )
            continue

        payload, load_error = load_json(target.path)
        if load_error:
            errors.append(load_error)
            continue

        validation_errors = validate_payload(validator_cls, schema, payload)
        if target.expected_valid:
            valid_files_checked += 1
            if validation_errors:
                errors.append(
                    f"SCHEMA_VALIDATION_FAILED: {rel_path(target.path)} ({target.schema_key}): {validation_errors[0]}"
                )
        else:
            invalid_fixtures_checked += 1
            if validation_errors:
                invalid_fixtures_rejected += 1
            else:
                errors.append(f"EXPECTED_INVALID_FIXTURE_ACCEPTED: {rel_path(target.path)}")

    return {
        "ok": not errors,
        "errors": sorted(set(errors)),
        "notes": sorted(set(notes)),
        "summary": {
            "schemas_checked": len(schema_payloads),
            "valid_files_checked": valid_files_checked,
            "invalid_fixtures_checked": invalid_fixtures_checked,
            "invalid_fixtures_rejected": invalid_fixtures_rejected,
        },
    }


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    include_fixtures = not args.skip_fixtures
    selected_paths = list(args.paths) if args.paths else None
    fixtures_root = Path(args.fixtures_root)
    if not fixtures_root.is_absolute():
        fixtures_root = PROJECT_ROOT / fixtures_root
    result = run_validation(
        selected_paths=selected_paths,
        include_fixtures=include_fixtures,
        fixtures_root=fixtures_root,
    )
    print(json.dumps(result, indent=2 if args.pretty else None, sort_keys=True))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
