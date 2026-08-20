import argparse
import json
from pathlib import Path
from typing import Any

import smoke_control_plane_integration
import smoke_prompt_report_hygiene


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run stdout-only passive control-plane gate smokes."
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def emit_report(report: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    print(json.dumps(report, separators=(",", ":"), sort_keys=True))


def run_passive_gates() -> dict[str, Any]:
    errors: list[str] = []

    integration_report = smoke_control_plane_integration.run_default_smoke(
        smoke_control_plane_integration.DEFAULT_FIXTURES_ROOT
    )
    if integration_report.get("overall_status") != "PASS":
        errors.append(f"integration_smoke_failed: {integration_report.get('errors', [])}")

    hygiene_report = smoke_prompt_report_hygiene.run_smoke(
        smoke_prompt_report_hygiene.DEFAULT_FIXTURES_ROOT
    )
    if hygiene_report.get("overall_status") != "PASS":
        errors.append(f"hygiene_smoke_failed: {hygiene_report.get('errors', [])}")

    return {
        "schema_version": "studiopilot.passive_control_plane_gates_smoke.v0",
        "overall_status": "PASS" if not errors else "BLOCKED",
        "integration_smoke_status": integration_report.get("overall_status", "UNKNOWN"),
        "hygiene_smoke_status": hygiene_report.get("overall_status", "UNKNOWN"),
        "runtime_authority": "BLOCKED",
        "git_authority": "BLOCKED",
        "training_authority": "BLOCKED",
        "dataset_authority": "BLOCKED",
        "benchmark_authority": "BLOCKED",
        "errors": sorted(errors),
    }


def main() -> int:
    args = parse_args()
    try:
        report = run_passive_gates()
        emit_report(report, args.pretty)
        return 0 if report["overall_status"] == "PASS" else 1
    except Exception as exc:  # pragma: no cover - defensive hard stop
        report = {
            "schema_version": "studiopilot.passive_control_plane_gates_smoke.v0",
            "overall_status": "BLOCKED",
            "integration_smoke_status": "UNKNOWN",
            "hygiene_smoke_status": "UNKNOWN",
            "runtime_authority": "BLOCKED",
            "git_authority": "BLOCKED",
            "training_authority": "BLOCKED",
            "dataset_authority": "BLOCKED",
            "benchmark_authority": "BLOCKED",
            "errors": [f"internal_error: {exc}"],
        }
        emit_report(report, args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
