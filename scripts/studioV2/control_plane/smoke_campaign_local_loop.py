import argparse
import json
from pathlib import Path
from typing import Any

from build_next_taskpacket_from_pr_queue import (
    ConfigError,
    DecisionBlocked,
    PROJECT_ROOT,
    build_next_taskpacket_draft,
    load_campaign_and_queue,
)
from summarize_campaign_decision import build_summary


DEFAULT_FIXTURES_ROOT = PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "campaign_loop"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a deterministic local smoke for CampaignPlan + PRQueue -> next task draft "
            "-> decision summary. This script reads fixtures and writes only to stdout."
        )
    )
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing campaign loop smoke fixtures.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def emit_json(payload: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True))


def explicit_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"json_file_missing: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"json_decode_error: {path}: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"json_read_error: {path}: {exc}") from exc


def base_report() -> dict[str, Any]:
    return {
        "overall_status": "BLOCKED",
        "valid_loop_passed": False,
        "blocked_loop_failed_as_expected": False,
        "errors": [],
    }


def assert_equal(report: dict[str, Any], label: str, actual: Any, expected: Any) -> None:
    if actual != expected:
        report["errors"].append(f"{label}_mismatch")


def run_smoke(fixtures_root: Path) -> dict[str, Any]:
    report = base_report()

    valid_input = fixtures_root / "valid_campaign_loop_input_v0.json"
    blocked_input = fixtures_root / "blocked_campaign_loop_input_v0.json"
    expected_taskpacket = fixtures_root / "expected_next_taskpacket_v0.json"
    expected_summary = fixtures_root / "expected_campaign_decision_summary_v0.json"

    campaign_plan, pr_queue = load_campaign_and_queue(str(valid_input), str(valid_input))
    taskpacket = build_next_taskpacket_draft(campaign_plan, pr_queue)
    summary = build_summary(campaign_plan, pr_queue)

    assert_equal(report, "next_taskpacket", taskpacket, load_json(expected_taskpacket))
    assert_equal(report, "campaign_decision_summary", summary, load_json(expected_summary))
    report["valid_loop_passed"] = not report["errors"]

    blocked_campaign, blocked_queue = load_campaign_and_queue(str(blocked_input), str(blocked_input))
    try:
        blocked_summary = build_summary(blocked_campaign, blocked_queue)
        if blocked_summary["overall_decision"] in {"BLOCKED", "BLOCKED_INFRA"}:
            report["blocked_loop_failed_as_expected"] = True
        else:
            report["errors"].append("blocked_loop_unexpected_decision")
    except DecisionBlocked:
        report["blocked_loop_failed_as_expected"] = True

    if report["valid_loop_passed"] and report["blocked_loop_failed_as_expected"]:
        report["overall_status"] = "PASS"

    report["errors"] = sorted(report["errors"])
    return report


def main() -> int:
    args = parse_args()
    try:
        report = run_smoke(explicit_path(args.fixtures_root))
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
