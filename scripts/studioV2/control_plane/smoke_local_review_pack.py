import argparse
import json
from pathlib import Path
from typing import Any

from build_local_review_pack import InputValidationError
from build_local_review_pack import load_and_build_pack


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_FIXTURES_ROOT = (
    PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "local_review_pack"
)

VALID_CASES = (
    (
        "valid_local_review_pack_input_go_v0.json",
        "expected_local_review_pack_go_v0.json",
    ),
    (
        "valid_local_review_pack_input_hold_v0.json",
        "expected_local_review_pack_hold_v0.json",
    ),
    (
        "valid_local_review_pack_input_blocked_infra_v0.json",
        "expected_local_review_pack_blocked_infra_v0.json",
    ),
)


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run deterministic local review pack V0 smoke tests."
    )
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing local review pack smoke fixtures.",
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
        "valid_passed": 0,
        "invalid_failed_as_expected": 0,
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


def compare_expected(
    report: dict[str, Any],
    fixtures_root: Path,
    fixture_name: str,
    expected_name: str,
) -> None:
    fixture_path = require_fixture(fixtures_root, fixture_name)
    expected_path = require_fixture(fixtures_root, expected_name)
    actual = load_and_build_pack(fixture_path)
    expected = load_json(expected_path)
    if actual != expected:
        report["errors"].append(
            f"pack_mismatch: {fixture_name}: expected {expected}, got {actual}"
        )
        return
    report["valid_passed"] += 1


def check_invalid_fixtures(report: dict[str, Any], fixtures_root: Path) -> None:
    invalid_paths = sorted(fixtures_root.glob("invalid_*.json"))
    if not invalid_paths:
        raise ConfigError(f"no_invalid_fixtures_found: {normalize_path(fixtures_root)}")

    for path in invalid_paths:
        try:
            load_and_build_pack(path)
        except InputValidationError:
            report["invalid_failed_as_expected"] += 1
            continue
        report["errors"].append(f"invalid_unexpectedly_passed: {normalize_path(path)}")


def run_smoke(fixtures_root: Path) -> dict[str, Any]:
    if not fixtures_root.exists():
        raise ConfigError(f"fixtures_root_missing: {normalize_path(fixtures_root)}")
    if not fixtures_root.is_dir():
        raise ConfigError(f"fixtures_root_not_directory: {normalize_path(fixtures_root)}")

    report = base_report()
    for fixture_name, expected_name in VALID_CASES:
        compare_expected(report, fixtures_root, fixture_name, expected_name)
    check_invalid_fixtures(report, fixtures_root)

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
    except ConfigError as exc:
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
