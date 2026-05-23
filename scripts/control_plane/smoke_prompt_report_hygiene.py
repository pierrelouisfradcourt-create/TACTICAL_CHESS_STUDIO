import argparse
import json
from pathlib import Path
from typing import Any

from validate_prompt_report_hygiene import check_json_execution_report
from validate_prompt_report_hygiene import check_prompt


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FIXTURES_ROOT = (
    PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "prompt_report_hygiene"
)
VALID_EXECUTION_REPORT = (
    PROJECT_ROOT
    / "docs"
    / "control-plane"
    / "fixtures"
    / "studiopilot_packets"
    / "valid"
    / "valid_execution_report_docs.json"
)


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run deterministic prompt/report hygiene smoke checks."
    )
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing prompt/report hygiene fixtures.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def normalize_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(PROJECT_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def resolve_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def emit_report(report: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    print(json.dumps(report, separators=(",", ":"), sort_keys=True))


def require_file(path: Path) -> Path:
    if not path.exists():
        raise ConfigError(f"fixture_missing: {normalize_path(path)}")
    if not path.is_file():
        raise ConfigError(f"fixture_not_file: {normalize_path(path)}")
    return path


def load_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ConfigError(f"fixture_read_error: {normalize_path(path)}: {exc}") from exc


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ConfigError(f"json_decode_error: {normalize_path(path)}: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"json_read_error: {normalize_path(path)}: {exc}") from exc


def base_report() -> dict[str, Any]:
    return {
        "overall_status": "BLOCKED",
        "valid_prompt_passed": False,
        "invalid_prompt_blocked": False,
        "valid_execution_report_passed": False,
        "errors": [],
    }


def run_smoke(fixtures_root: Path) -> dict[str, Any]:
    if not fixtures_root.exists():
        raise ConfigError(f"fixtures_root_missing: {normalize_path(fixtures_root)}")
    if not fixtures_root.is_dir():
        raise ConfigError(f"fixtures_root_not_directory: {normalize_path(fixtures_root)}")

    report = base_report()

    valid_prompt = require_file(fixtures_root / "valid_prompt_docs.md")
    invalid_prompt = require_file(fixtures_root / "invalid_prompt_missing_output_routing.md")

    valid_prompt_report = check_prompt(load_text(valid_prompt))
    if valid_prompt_report["hygiene_status"] == "PASS":
        report["valid_prompt_passed"] = True
    else:
        report["errors"].append(f"valid_prompt_failed: {valid_prompt_report}")

    invalid_prompt_report = check_prompt(load_text(invalid_prompt))
    if invalid_prompt_report["hygiene_status"] == "BLOCKED":
        report["invalid_prompt_blocked"] = True
    else:
        report["errors"].append(f"invalid_prompt_unexpectedly_passed: {invalid_prompt_report}")

    execution_report_payload = load_json(require_file(VALID_EXECUTION_REPORT))
    execution_report = check_json_execution_report(execution_report_payload)
    if execution_report["hygiene_status"] == "PASS":
        report["valid_execution_report_passed"] = True
    else:
        report["errors"].append(f"valid_execution_report_failed: {execution_report}")

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
