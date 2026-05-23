import argparse
import json
from pathlib import Path
from typing import Any

from validate_project_breakdown_report import (
    DEFAULT_FIXTURES_ROOT,
    ConfigError,
    explicit_path,
    run_validation,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run deterministic smoke checks for Project Breakdown Report V0 fixtures "
            "using in-process validation logic."
        )
    )
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing Project Breakdown fixtures.",
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
        "validation_passed": False,
        "invalids_blocked": False,
        "errors": [],
    }


def run_smoke(fixtures_root: Path) -> dict[str, Any]:
    validation_report = run_validation(fixtures_root)
    report = base_report()

    report["validation_passed"] = (
        validation_report["valid_passed"] > 0
        and validation_report["valid_failed"] == 0
        and validation_report["semantic_checks_passed"] is True
    )
    report["invalids_blocked"] = (
        validation_report["invalid_failed_as_expected"] > 0
        and validation_report["invalid_unexpectedly_passed"] == 0
    )
    report["errors"] = sorted(validation_report["errors"])

    if report["validation_passed"] and report["invalids_blocked"] and not report["errors"]:
        report["overall_status"] = "PASS"
    return report


def main() -> int:
    args = parse_args()
    fixtures_root = explicit_path(args.fixtures_root)
    try:
        report = run_smoke(fixtures_root)
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
