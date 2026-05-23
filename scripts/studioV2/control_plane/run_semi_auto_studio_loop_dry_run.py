from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from apply_humangate_decision_dry_run import build_plan
from compile_humangate_decision_dry_run import DECISIONS, build_decision_candidate
from compile_operator_inbox_dry_run import build_operator_inbox
from compile_next_mission_dry_run import current_state_id
from update_studio_current_state import validate_current_shape


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "semi_auto_studio_loop_dry_run.schema.json"
DEFAULT_CURRENT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_current_state.schema.json"
DEFAULT_INBOX_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_operator_inbox.schema.json"
DEFAULT_DECISION_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "humangate_decision_candidate.schema.json"
DEFAULT_PLAN_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "authorized_next_action_plan.schema.json"

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
    "latest.json_creation",
    "lab/runs/RUN_*_creation",
    "lab/puzzles_creation",
    "release_automation",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run the stdout-only semi-auto Studio loop dry-run: "
            "current_state -> operator inbox -> HumanGate decision candidate -> authorized next action plan."
        )
    )
    parser.add_argument("--current-state", required=True, help="Path to a StudioCurrentState JSON file.")
    parser.add_argument("--decision", required=True, choices=DECISIONS, help="Requested HumanGate dry-run decision.")
    parser.add_argument(
        "--schema",
        default=None,
        help="Optional SemiAutoStudioLoopDryRun schema path. Defaults to schemas/semi_auto_studio_loop_dry_run.schema.json.",
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


def require_claim_safe(payload: dict[str, Any], label: str) -> None:
    if payload.get("claim_posture") != CLAIM_POSTURE:
        raise ValueError(f"{label}_claim_posture_invalid")
    if payload.get("no_global_ready_verdict") is not True:
        raise ValueError(f"{label}_global_ready_verdict_invalid")


def build_loop_payload(current_state: dict[str, Any], decision: str) -> dict[str, Any]:
    require_claim_safe(current_state, "current_state")

    inbox = build_operator_inbox(current_state)
    validate_payload(inbox, DEFAULT_INBOX_SCHEMA_PATH, "StudioOperatorInbox")
    require_claim_safe(inbox, "inbox")

    decision_candidate = build_decision_candidate(
        inbox=inbox,
        decision=decision,
        expires_after="single_operator_review_session",
        operator_notes=None,
    )
    validate_payload(decision_candidate, DEFAULT_DECISION_SCHEMA_PATH, "HumanGateDecisionCandidate")
    require_claim_safe(decision_candidate, "decision_candidate")

    plan = build_plan(decision_candidate)
    validate_payload(plan, DEFAULT_PLAN_SCHEMA_PATH, "AuthorizedNextActionPlan")
    require_claim_safe(plan, "authorized_next_action_plan")

    blocked_actions = unique_strings(
        [
            *(str(item) for item in inbox.get("blocked_actions", [])),
            *(str(item) for item in decision_candidate.get("blocked_actions", [])),
            *(str(item) for item in plan.get("blocked_actions", [])),
            *ABSOLUTE_BLOCKED_ACTIONS,
        ]
    )

    return {
        "record_type": "semi_auto_studio_loop_dry_run",
        "contract_version": "V0",
        "generated_at": now_utc(),
        "source_current_state_id": current_state_id(current_state),
        "requested_decision": decision,
        "inbox": inbox,
        "decision_candidate": decision_candidate,
        "authorized_next_action_plan": plan,
        "execution_performed": False,
        "codex_execution_performed": False,
        "persistence_performed": False,
        "blocked_actions": blocked_actions,
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
    }


def render_json(payload: dict[str, Any], pretty: bool) -> str:
    if pretty:
        return json.dumps(payload, indent=2, sort_keys=True) + "\n"
    return json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n"


def main() -> int:
    args = parse_args()
    current_state_path = Path(args.current_state).resolve()
    schema_path = Path(args.schema).resolve() if args.schema else DEFAULT_SCHEMA_PATH

    try:
        raw_current_state = load_json(current_state_path)
        if not isinstance(raw_current_state, dict):
            print("INPUT_VALIDATION_ERROR: current state root must be an object", file=sys.stderr)
            return 1
        validate_payload(raw_current_state, DEFAULT_CURRENT_SCHEMA_PATH, "StudioCurrentState")
        validate_current_shape(raw_current_state, current_state_path)

        payload = build_loop_payload(raw_current_state, args.decision)
        validate_payload(payload, schema_path, "SemiAutoStudioLoopDryRun")
        sys.stdout.write(render_json(payload, args.pretty))
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
