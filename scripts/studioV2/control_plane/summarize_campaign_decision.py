import argparse
import json
from typing import Any

from build_next_taskpacket_from_pr_queue import (
    ConfigError,
    DecisionBlocked,
    assert_global_gates,
    blocked_report,
    build_next_taskpacket_draft,
    load_campaign_and_queue,
    path_touches_forbidden,
    selected_pr_candidate,
    validate_campaign_and_queue,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Summarize the local CampaignPlan + PRQueue decision. This script reads JSON "
            "and writes only to stdout."
        )
    )
    parser.add_argument("--campaign-plan", required=True, help="CampaignPlan JSON path.")
    parser.add_argument("--pr-queue", required=True, help="PRQueue JSON path.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def emit_json(payload: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True))


def safe_candidate_exists(campaign_plan: dict[str, Any], pr_queue: dict[str, Any]) -> tuple[bool, str | None]:
    try:
        build_next_taskpacket_draft(campaign_plan, pr_queue)
        return True, None
    except DecisionBlocked as exc:
        if exc.code == "NO_ACTIONABLE_PR_CANDIDATE":
            return False, exc.reason
        raise


def forbidden_path_violation(campaign_plan: dict[str, Any], pr_queue: dict[str, Any]) -> str | None:
    campaign_forbidden = campaign_plan["scope"]["forbidden_paths"]
    for candidate in pr_queue["pr_candidates"]:
        for allowed_path in candidate["allowed_paths"]:
            if path_touches_forbidden(allowed_path, campaign_forbidden + candidate["forbidden_paths"]):
                return allowed_path
    return None


def build_summary(campaign_plan: dict[str, Any], pr_queue: dict[str, Any]) -> dict[str, Any]:
    validate_campaign_and_queue(campaign_plan, pr_queue)

    if pr_queue["verdict"] == "BLOCKED_INFRA":
        return {
            "overall_decision": "BLOCKED_INFRA",
            "scope_status": "NOT_EVALUATED",
            "checks_status": "BLOCKED_INFRA",
            "claim_status": campaign_plan["verdicts"]["claim_verdict"],
            "human_gate_status": "REQUIRED" if campaign_plan["human_gate_required"] else "MISSING",
            "next_action": "STOP_FOR_INFRA_REVIEW",
            "reasons": ["PRQueue verdict is BLOCKED_INFRA"],
        }

    if pr_queue["verdict"] == "BLOCKED":
        return {
            "overall_decision": "BLOCKED",
            "scope_status": "NOT_EVALUATED",
            "checks_status": "BLOCKED",
            "claim_status": campaign_plan["verdicts"]["claim_verdict"],
            "human_gate_status": "REQUIRED" if campaign_plan["human_gate_required"] else "MISSING",
            "next_action": "STOP_FOR_HUMAN_REVIEW",
            "reasons": ["PRQueue verdict is BLOCKED"],
        }

    assert_global_gates(campaign_plan, pr_queue)

    violation = forbidden_path_violation(campaign_plan, pr_queue)
    if violation is not None:
        return {
            "overall_decision": "BLOCKED",
            "scope_status": "BLOCKED_FORBIDDEN_PATH",
            "checks_status": "NOT_EVALUATED",
            "claim_status": campaign_plan["verdicts"]["claim_verdict"],
            "human_gate_status": "REQUIRED",
            "next_action": "STOP_FOR_SCOPE_REVIEW",
            "reasons": [f"Allowed path touches forbidden path: {violation}"],
        }

    selected = None
    actionable = False
    hold_reason = None
    try:
        selected = selected_pr_candidate(pr_queue)
        actionable, hold_reason = safe_candidate_exists(campaign_plan, pr_queue)
    except DecisionBlocked as exc:
        if exc.code != "NO_ACTIONABLE_PR_CANDIDATE":
            raise
        hold_reason = exc.reason

    if not actionable:
        next_action = "CAMPAIGN_COMPLETE" if pr_queue["queue_status"] == "COMPLETED" else "HOLD_FOR_HUMAN_OR_DEPENDENCIES"
        return {
            "overall_decision": "HOLD",
            "scope_status": "PASS",
            "checks_status": "NO_ACTIONABLE_CANDIDATE",
            "claim_status": campaign_plan["verdicts"]["claim_verdict"],
            "human_gate_status": "REQUIRED",
            "next_action": next_action,
            "reasons": [hold_reason or "No candidate is ready for local handoff"],
        }

    return {
        "overall_decision": "GO",
        "scope_status": "PASS",
        "checks_status": "LOCAL_FIRST_REQUIRED",
        "claim_status": selected["claim_scope"] if selected else campaign_plan["verdicts"]["claim_verdict"],
        "human_gate_status": "REQUIRED",
        "next_action": "PREPARE_NEXT_TASKPACKET_DRAFT",
        "reasons": ["At least one PR candidate is safe for local dry-run handoff"],
    }


def main() -> int:
    args = parse_args()
    try:
        campaign_plan, pr_queue = load_campaign_and_queue(args.campaign_plan, args.pr_queue)
        emit_json(build_summary(campaign_plan, pr_queue), args.pretty)
        return 0
    except DecisionBlocked as exc:
        emit_json(blocked_report(exc.code, exc.reason), args.pretty)
        return 1
    except ConfigError as exc:
        emit_json(blocked_report("INTERNAL_CONFIG_ERROR", str(exc)), args.pretty)
        return 2
    except Exception as exc:  # pragma: no cover - defensive hard stop
        emit_json(blocked_report("INTERNAL_ERROR", str(exc)), args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
