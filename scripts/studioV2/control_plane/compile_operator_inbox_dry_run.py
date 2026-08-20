from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from compile_next_mission_dry_run import build_mission_candidate, current_state_id
from update_studio_current_state import validate_current_shape


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_operator_inbox.schema.json"
DEFAULT_CURRENT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_current_state.schema.json"

CLAIM_POSTURE = "NO_CLAIM_ALLOWED"

ALLOWED_OPERATOR_ACTIONS = (
    "approve_next_mission_candidate",
    "reject_next_mission_candidate",
    "request_read_only_audit",
    "defer",
)

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
    "agent_activation",
    "Codex_execution",
    "latest.json_creation",
    "lab/runs/RUN_*_creation",
    "lab/puzzles_creation",
    "release_automation",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Compile a stdout-only StudioOperatorInbox V0 from a local "
            "StudioCurrentState JSON file. This never writes .studio_state/inbox.json."
        )
    )
    parser.add_argument("--current-state", required=True, help="Path to a StudioCurrentState JSON file.")
    parser.add_argument(
        "--schema",
        default=None,
        help="Optional StudioOperatorInbox schema path. Defaults to schemas/studio_operator_inbox.schema.json.",
    )
    parser.add_argument(
        "--current-schema",
        default=None,
        help="Optional StudioCurrentState schema path. Defaults to schemas/studio_current_state.schema.json.",
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


def first_summary(items: Any, fallback: str) -> str:
    if isinstance(items, list):
        for item in items:
            if isinstance(item, dict):
                summary = item.get("summary")
                if isinstance(summary, str) and summary.strip():
                    return summary.strip()
    return fallback


def normalize_mission_candidate(raw_candidate: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(raw_candidate, dict):
        return None
    return {
        "task_class": str(raw_candidate.get("task_class") or "control_plane_followup"),
        "goal": str(raw_candidate.get("goal") or "Review current Studio state"),
        "reason": str(raw_candidate.get("reason") or "Derived from StudioCurrentState."),
        "target_files": unique_strings(
            [str(item) for item in raw_candidate.get("target_files", [])]
            if isinstance(raw_candidate.get("target_files"), list)
            else []
        ),
        "validation_plan": unique_strings(
            [str(item) for item in raw_candidate.get("validation_plan", [])]
            if isinstance(raw_candidate.get("validation_plan"), list)
            else ["Run a read-only audit before any state change."]
        ),
        "source": str(raw_candidate.get("source") or "current_state.next_best_mission"),
    }


def choose_decision(current_state: dict[str, Any]) -> tuple[str, str, str]:
    if current_state.get("open_blockers"):
        summary = first_summary(current_state.get("open_blockers"), "Review the first open blocker.")
        return (
            "BLOCKER_REVIEW",
            "Review open blocker before any forward action.",
            f"Inspect blocker: {summary}",
        )
    if current_state.get("humangate_required_items"):
        summary = first_summary(current_state.get("humangate_required_items"), "HumanGate decision required.")
        return (
            "HUMANGATE_REQUIRED",
            "HumanGate decision required before treating local state as canonical.",
            f"Resolve HumanGate item: {summary}",
        )
    if isinstance(current_state.get("next_best_mission"), dict):
        summary = str(current_state["next_best_mission"].get("goal") or "Review next mission candidate.")
        return (
            "NEXT_MISSION",
            "Review next mission candidate.",
            f"Decide whether to approve next mission: {summary}",
        )
    return (
        "PASSIVE_REVIEW",
        "Perform a passive review only.",
        "Request a read-only audit or defer; no activation or claim is authorized.",
    )


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


def build_operator_inbox(current_state: dict[str, Any]) -> dict[str, Any]:
    if current_state.get("claim_posture") != CLAIM_POSTURE:
        raise ValueError("current_state_claim_posture_invalid")
    if current_state.get("no_global_ready_verdict") is not True:
        raise ValueError("current_state_global_ready_verdict_invalid")

    mission_candidate = build_mission_candidate(current_state)
    top_decision_type, top_decision, next_action_summary = choose_decision(current_state)
    forbidden_work = unique_strings(
        [*(str(item) for item in current_state.get("forbidden_next_missions", [])), *ABSOLUTE_BLOCKED_ACTIONS]
    )

    return {
        "record_type": "studio_operator_inbox",
        "contract_version": "V0",
        "generated_at": now_utc(),
        "source_current_state_id": current_state_id(current_state),
        "top_decision": top_decision,
        "top_decision_type": top_decision_type,
        "next_action_summary": next_action_summary,
        "next_mission_candidate": normalize_mission_candidate(current_state.get("next_best_mission"))
        or normalize_mission_candidate(mission_candidate),
        "humangate_required_items": current_state.get("humangate_required_items", []),
        "open_blockers": current_state.get("open_blockers", []),
        "open_risks": current_state.get("open_risks", []),
        "decision_debt": current_state.get("decision_debt", []),
        "forbidden_work": forbidden_work,
        "allowed_operator_actions": list(ALLOWED_OPERATOR_ACTIONS),
        "blocked_actions": unique_strings([*forbidden_work, *ABSOLUTE_BLOCKED_ACTIONS]),
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
    current_schema_path = Path(args.current_schema).resolve() if args.current_schema else DEFAULT_CURRENT_SCHEMA_PATH

    try:
        raw_current_state = load_json(current_state_path)
        if not isinstance(raw_current_state, dict):
            print("INPUT_VALIDATION_ERROR: current state root must be an object", file=sys.stderr)
            return 1
        validate_payload(raw_current_state, current_schema_path, "StudioCurrentState")
        validate_current_shape(raw_current_state, current_state_path)

        inbox = build_operator_inbox(raw_current_state)
        validate_payload(inbox, schema_path, "StudioOperatorInbox")
        sys.stdout.write(render_json(inbox, args.pretty))
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
