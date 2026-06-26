from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "authorized_next_action_plan.schema.json"
DEFAULT_DECISION_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "humangate_decision_candidate.schema.json"

CLAIM_POSTURE = "NO_CLAIM_ALLOWED"

ABSOLUTE_BLOCKED_ACTIONS = (
    "runtime_activation",
    "dataset_generation",
    "training",
    "benchmark",
    "model_promotion",
    "public_claim",
    "push",
    "branch",
    "pr",
    "codex_auto_execution",
    "agent_activation",
    "dataset_reset",
    "model_checkpoint_creation",
    "latest.json_creation",
    "lab/runs/RUN_*_creation",
    "lab/puzzles_creation",
    "release_automation",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Apply a HumanGateDecisionCandidate as a stdout-only dry-run "
            "AuthorizedNextActionPlan. This never executes the action."
        )
    )
    parser.add_argument("--decision-packet", required=True, help="Path to a HumanGateDecisionCandidate JSON file.")
    parser.add_argument(
        "--schema",
        default=None,
        help="Optional AuthorizedNextActionPlan schema path. Defaults to schemas/authorized_next_action_plan.schema.json.",
    )
    parser.add_argument(
        "--decision-schema",
        default=None,
        help="Optional HumanGateDecisionCandidate schema path. Defaults to schemas/humangate_decision_candidate.schema.json.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def unique_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for raw_value in values:
        value = str(raw_value).strip()
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def build_validator(schema_path: Path) -> Any:
    try:
        import jsonschema
    except ImportError as exc:
        raise RuntimeError("BLOCKED_MISSING_JSONSCHEMA") from exc

    schema_obj = load_json(schema_path)
    validator_class = jsonschema.validators.validator_for(schema_obj)
    validator_class.check_schema(schema_obj)
    format_checker = getattr(validator_class, "FORMAT_CHECKER", None)
    if format_checker is None:
        return validator_class(schema_obj)
    return validator_class(schema_obj, format_checker=format_checker)


def validate_payload(payload: dict[str, Any], schema_path: Path, label: str) -> None:
    validator = build_validator(schema_path)
    errors = sorted(validator.iter_errors(payload), key=lambda error: (list(error.absolute_path), error.message))
    if not errors:
        return

    first = errors[0]
    location = ".".join(str(part) for part in first.absolute_path) or "$"
    raise ValueError(f"{label} schema validation failed at {location}: {first.message}")


def blocked_actions_from(decision_packet: dict[str, Any]) -> list[str]:
    return unique_strings([*(str(item) for item in decision_packet.get("blocked_actions", [])), *ABSOLUTE_BLOCKED_ACTIONS])


def normalize_approved_action(raw_action: dict[str, Any]) -> dict[str, Any]:
    mission_goal = raw_action.get("mission_goal")
    summary = str(mission_goal).strip() if isinstance(mission_goal, str) and mission_goal.strip() else "Approved next mission candidate"
    action = raw_action.get("action")
    result = dict(raw_action)
    result["action"] = str(action).strip() if isinstance(action, str) and action.strip() else "approve_next_mission_candidate"
    result["summary"] = summary
    result["execution_allowed"] = False
    return result


def approved_plan_action(decision_packet: dict[str, Any]) -> dict[str, Any] | None:
    approved_actions = decision_packet.get("approved_actions")
    if not isinstance(approved_actions, list) or not approved_actions:
        return None
    first = approved_actions[0]
    if not isinstance(first, dict):
        return None
    return normalize_approved_action(first)


def read_only_audit_action(decision_packet: dict[str, Any]) -> dict[str, Any]:
    return {
        "action": "request_read_only_audit",
        "summary": "Prepare a read-only audit candidate for the inbox decision; do not execute or persist changes.",
        "source_decision_id": str(decision_packet.get("decision_id", "UNKNOWN")),
        "execution_allowed": False,
    }


def action_status_for(decision: str, next_action: dict[str, Any] | None) -> str:
    if decision == "approve_next_mission_candidate":
        return "AUTHORIZED_DRY_RUN_ONLY" if next_action is not None else "BLOCKED"
    if decision == "reject_next_mission_candidate":
        return "REJECTED"
    if decision == "request_read_only_audit":
        return "AUDIT_REQUESTED"
    if decision == "defer":
        return "DEFERRED"
    return "BLOCKED"


def build_plan(decision_packet: dict[str, Any]) -> dict[str, Any]:
    if decision_packet.get("claim_posture") != CLAIM_POSTURE:
        raise ValueError("decision_packet_claim_posture_invalid")
    if decision_packet.get("no_global_ready_verdict") is not True:
        raise ValueError("decision_packet_global_ready_verdict_invalid")

    decision = str(decision_packet.get("decision"))
    next_action: dict[str, Any] | None = None
    allowed_actions: list[dict[str, Any]] = []

    if decision == "approve_next_mission_candidate":
        next_action = approved_plan_action(decision_packet)
        if next_action is not None:
            allowed_actions.append(next_action)
    elif decision == "request_read_only_audit":
        next_action = read_only_audit_action(decision_packet)
        allowed_actions.append(next_action)

    return {
        "record_type": "authorized_next_action_plan",
        "contract_version": "V0",
        "generated_at": now_utc(),
        "source_decision_id": str(decision_packet.get("decision_id", "UNKNOWN")),
        "decision": decision,
        "action_status": action_status_for(decision, next_action),
        "next_action": next_action,
        "codex_prompt_candidate": decision_packet.get("codex_prompt_candidate")
        if isinstance(decision_packet.get("codex_prompt_candidate"), dict)
        else None,
        "allowed_actions": allowed_actions,
        "blocked_actions": blocked_actions_from(decision_packet),
        "expires_after": str(decision_packet.get("expires_after") or "single_operator_review_session"),
        "execution_allowed": False,
        "codex_execution_allowed": False,
        "persistence_allowed": False,
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
    }


def render_json(payload: dict[str, Any], pretty: bool) -> str:
    if pretty:
        return json.dumps(payload, indent=2, sort_keys=True) + "\n"
    return json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n"


def main() -> int:
    args = parse_args()
    decision_packet_path = Path(args.decision_packet).resolve()
    schema_path = Path(args.schema).resolve() if args.schema else DEFAULT_SCHEMA_PATH
    decision_schema_path = Path(args.decision_schema).resolve() if args.decision_schema else DEFAULT_DECISION_SCHEMA_PATH

    try:
        raw_decision_packet = load_json(decision_packet_path)
        if not isinstance(raw_decision_packet, dict):
            print("INPUT_VALIDATION_ERROR: decision packet root must be an object", file=sys.stderr)
            return 1
        validate_payload(raw_decision_packet, decision_schema_path, "HumanGateDecisionCandidate")

        plan = build_plan(raw_decision_packet)
        validate_payload(plan, schema_path, "AuthorizedNextActionPlan")
        sys.stdout.write(render_json(plan, args.pretty))
        return 0
    except FileNotFoundError as exc:
        print(f"INPUT_VALIDATION_ERROR: missing file: {exc.filename or exc}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as exc:
        print(f"INPUT_VALIDATION_ERROR: invalid JSON: {exc}", file=sys.stderr)
        return 1
    except (OSError, ValueError) as exc:
        print(f"INPUT_VALIDATION_ERROR: {exc}", file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    except Exception as exc:  # pragma: no cover - defensive boundary
        print(f"INTERNAL_ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
