import argparse
import contextlib
import io
import json
from pathlib import Path
from typing import Any

from build_learning_event import InputValidationError
from build_learning_event import load_and_build_learning_event
from validate_learning_events import main as validate_main


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_FIXTURES_ROOT = PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "learning_event"
SOURCE_FIXTURE = "source_local_review_pack_blocked_infra_v0.json"
EXPECTED_FIXTURE = "expected_built_learning_event_blocked_infra_v0.json"


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run deterministic LearningEvent Minimal V0 smoke tests."
    )
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing LearningEvent smoke fixtures.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print the JSON summary.")
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
        raise ConfigError(f"json_file_missing: {normalize_path(path)}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"json_decode_error: {normalize_path(path)}: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"json_read_error: {normalize_path(path)}: {exc}") from exc


def base_report() -> dict[str, Any]:
    return {
        "overall_status": "BLOCKED",
        "validation_passed": False,
        "builder_passed": False,
        "errors": [],
    }


def emit_report(report: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    print(json.dumps(report, separators=(",", ":"), sort_keys=True))


def require_fixture(root: Path, name: str) -> Path:
    path = root / name
    if not path.exists():
        raise ConfigError(f"fixture_missing: {normalize_path(path)}")
    return path


def validation_passes(fixtures_root: Path) -> bool:
    return validate_main_for_root(fixtures_root) == 0


def validate_main_for_root(fixtures_root: Path) -> int:
    import sys

    original_argv = sys.argv[:]
    buffer = io.StringIO()
    try:
        sys.argv = [
            "validate_learning_events.py",
            "--fixtures-root",
            str(fixtures_root),
        ]
        with contextlib.redirect_stdout(buffer):
            return validate_main()
    finally:
        sys.argv = original_argv


def run_smoke(fixtures_root: Path) -> dict[str, Any]:
    if not fixtures_root.exists():
        raise ConfigError(f"fixtures_root_missing: {normalize_path(fixtures_root)}")
    if not fixtures_root.is_dir():
        raise ConfigError(f"fixtures_root_not_directory: {normalize_path(fixtures_root)}")

    report = base_report()
    if validation_passes(fixtures_root):
        report["validation_passed"] = True
    else:
        report["errors"].append("validation_mismatch: validate_learning_events did not pass")

    source_path = require_fixture(fixtures_root, SOURCE_FIXTURE)
    expected_path = require_fixture(fixtures_root, EXPECTED_FIXTURE)
    actual = load_and_build_learning_event(source_path)
    expected = load_json(expected_path)
    if actual == expected:
        report["builder_passed"] = True
    else:
        report["errors"].append(
            f"builder_mismatch: {SOURCE_FIXTURE}: expected {expected}, got {actual}"
        )

    report["errors"] = sorted(report["errors"])
    if not report["errors"]:
        report["overall_status"] = "PASS"
    return report


def main() -> int:
    args = parse_args()
    try:
        report = run_smoke(resolve_path(args.fixtures_root))
        emit_report(report, args.pretty)
        return 0 if report["overall_status"] == "PASS" else 1
    except (ConfigError, InputValidationError) as exc:
        report = base_report()
        report["errors"] = [str(exc)]
        emit_report(report, args.pretty)
        return 2
    except Exception as exc:  # pragma: no cover - defensive hard stop
        report = base_report()
        report["errors"] = [f"internal_error: {exc}"]
        emit_report(report, args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
