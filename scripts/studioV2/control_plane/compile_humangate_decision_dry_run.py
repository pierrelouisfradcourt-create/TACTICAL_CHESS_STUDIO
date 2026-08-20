from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "humangate_decision_candidate.schema.json"
DEFAULT_INBOX_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_operator_inbox.schema.json"

CLAIM_POSTURE = "NO_CLAIM_ALLOWED"

DECISIONS = (
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
            "Compile a stdout-only HumanGateDecisionCandidate V0 from a "
            "StudioOperatorInbox JSON file. This never executes or persists anything."
        )
    )
    parser.add_argument("--inbox", required=True, help="Path to a StudioOperatorInbox JSON file.")
    parser.add_argument("--decision", required=True, choices=DECISIONS, help="HumanGate dry-run decision.")
    parser.add_argument(
        "--schema",
        default=None,
        help="Optional HumanGateDecisionCandidate schema path. Defaults to schemas/humangate_decision_candidate.schema.json.",
    )
    parser.add_argument(
        "--inbox-schema",
        default=None,
        help="Optional StudioOperatorInbox schema path. Defaults to schemas/studio_operator_inbox.schema.json.",
    )
    parser.add_argument(
        "--expires-after",
        default="single_operator_review_session",
        help="Human-readable expiry boundary for this dry-run candidate.",
    )
    parser.add_argument("--operator-notes", default=None, help="Optional operator notes override.")
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


def inbox_id(inbox: dict[str, Any]) -> str:
    digest_source = "|".join(
        [
            str(inbox.get("source_current_state_id", "")),
            str(inbox.get("generated_at", "")),
            str(inbox.get("top_decision_type", "")),
            str(inbox.get("next_action_summary", "")),
        ]
    )
    digest = hashlib.sha256(digest_source.encode("utf-8")).hexdigest()[:12]
    return f"studio_operator_inbox:{digest}"


def decision_id(source_inbox_id: str, decision: str) -> str:
    digest = hashlib.sha256(f"{source_inbox_id}|{decision}".encode("utf-8")).hexdigest()[:12]
    return f"humangate_decision_candidate:{digest}"


def build_scope() -> dict[str, Any]:
    return {
        "mode": "DRY_RUN_DECISION_CANDIDATE",
        "source": "studio_operator_inbox",
        "execution_authorized": False,
        "persistent_state_authorized": False,
        "claim_authorized": False,
    }


def approved_actions_for(decision: str, inbox: dict[str, Any]) -> list[dict[str, Any]]:
    if decision != "approve_next_mission_candidate":
        return []

    mission = inbox.get("next_mission_candidate")
    if not isinstance(mission, dict):
        raise ValueError("approve_next_mission_candidate requires inbox.next_mission_candidate")

    goal = mission.get("goal")
    if not isinstance(goal, str) or not goal.strip():
        raise ValueError("approve_next_mission_candidate requires mission goal")

    source = mission.get("source")
    return [
        {
            "action": "approve_next_mission_candidate",
            "scope": "single_next_mission_candidate",
            "mission_goal": goal.strip(),
            "mission_source": str(source).strip() if isinstance(source, str) and source.strip() else "studio_operator_inbox",
            "execution_authorized": False,
        }
    ]


def operator_notes_for(decision: str, inbox: dict[str, Any], override: str | None) -> str:
    if override and override.strip():
        return override.strip()
    if decision == "approve_next_mission_candidate":
        return "HumanGate candidate approves only the bounded next mission candidate; execution remains blocked."
    if decision == "reject_next_mission_candidate":
        return "HumanGate candidate rejects the inbox next mission candidate and approves no execution action."
    if decision == "request_read_only_audit":
        return "HumanGate candidate requests read-only audit only and approves no execution action."
    return "HumanGate candidate defers the inbox decision and approves no execution action."


def build_decision_candidate(
    inbox: dict[str, Any],
    decision: str,
    expires_after: str,
    operator_notes: str | None,
) -> dict[str, Any]:
    if inbox.get("claim_posture") != CLAIM_POSTURE:
        raise ValueError("inbox_claim_posture_invalid")
    if inbox.get("no_global_ready_verdict") is not True:
        raise ValueError("inbox_global_ready_verdict_invalid")

    source_id = inbox_id(inbox)
    blocked_actions = unique_strings(
        [
            *(str(item) for item in inbox.get("blocked_actions", [])),
            *(str(item) for item in inbox.get("forbidden_work", [])),
            *ABSOLUTE_BLOCKED_ACTIONS,
        ]
    )

    return {
        "record_type": "humangate_decision_candidate",
        "contract_version": "V0",
        "generated_at": now_utc(),
        "source_inbox_id": source_id,
        "decision_id": decision_id(source_id, decision),
        "decision": decision,
        "scope": build_scope(),
        "approved_actions": approved_actions_for(decision, inbox),
        "blocked_actions": blocked_actions,
        "expires_after": str(expires_after).strip() or "single_operator_review_session",
        "humangate_required": True,
        "operator_notes": operator_notes_for(decision, inbox, operator_notes),
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
    }


def render_json(payload: dict[str, Any], pretty: bool) -> str:
    if pretty:
        return json.dumps(payload, indent=2, sort_keys=True) + "\n"
    return json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n"


def main() -> int:
    args = parse_args()
    inbox_path = Path(args.inbox).resolve()
    schema_path = Path(args.schema).resolve() if args.schema else DEFAULT_SCHEMA_PATH
    inbox_schema_path = Path(args.inbox_schema).resolve() if args.inbox_schema else DEFAULT_INBOX_SCHEMA_PATH

    try:
        raw_inbox = load_json(inbox_path)
        if not isinstance(raw_inbox, dict):
            print("INPUT_VALIDATION_ERROR: inbox root must be an object", file=sys.stderr)
            return 1
        validate_payload(raw_inbox, inbox_schema_path, "StudioOperatorInbox")

        candidate = build_decision_candidate(
            inbox=raw_inbox,
            decision=args.decision,
            expires_after=args.expires_after,
            operator_notes=args.operator_notes,
        )
        validate_payload(candidate, schema_path, "HumanGateDecisionCandidate")
        sys.stdout.write(render_json(candidate, args.pretty))
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
