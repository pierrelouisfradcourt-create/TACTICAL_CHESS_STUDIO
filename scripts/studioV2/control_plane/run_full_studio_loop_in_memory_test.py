from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import apply_humangate_decision_dry_run as action_plan
import compile_humangate_decision_dry_run as humangate
import compile_next_mission_dry_run as mission
import compile_operator_inbox_dry_run as inbox
import run_semi_auto_studio_loop_dry_run as semi_auto
import run_studio_state_pipeline_dry_run as state_pipeline


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DELTA_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_state_delta.schema.json"
DEFAULT_SNAPSHOT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_state_snapshot.schema.json"
DEFAULT_CURRENT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_current_state.schema.json"
DEFAULT_REPORT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studiopilot_execution_report.schema.json"
DEFAULT_MISSION_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_mission_candidate.schema.json"
DEFAULT_INBOX_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_operator_inbox.schema.json"
DEFAULT_HUMANGATE_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "humangate_decision_candidate.schema.json"
DEFAULT_ACTION_PLAN_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "authorized_next_action_plan.schema.json"
DEFAULT_SEMI_AUTO_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "semi_auto_studio_loop_dry_run.schema.json"

CURRENT_STATE_PATH = PROJECT_ROOT / ".studio_state" / "current_state.json"
INBOX_PATH = PROJECT_ROOT / ".studio_state" / "inbox.json"
LATEST_PATH = PROJECT_ROOT / "latest.json"
LAB_RUNS_PATH = PROJECT_ROOT / "lab" / "runs"
LAB_PUZZLES_PATH = PROJECT_ROOT / "lab" / "puzzles"

CLAIM_POSTURE = "NO_CLAIM_ALLOWED"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run the read-only in-memory full Studio loop integration harness: "
            "ExecutionReport -> StudioStateDelta -> StudioStateSnapshot -> "
            "StudioCurrentState preview -> StudioMissionCandidate -> "
            "OperatorInbox -> HumanGateDecisionCandidate -> "
            "AuthorizedNextActionPlan -> SemiAutoStudioLoopDryRun."
        )
    )
    parser.add_argument("--report", required=True, help="Path to a StudioPilot ExecutionReport JSON file.")
    parser.add_argument("--decision", required=True, choices=humangate.DECISIONS, help="HumanGate dry-run decision.")
    parser.add_argument(
        "--schema",
        default=None,
        help="Optional FullStudioLoopInMemoryResult schema path for validating the final stdout JSON.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print final JSON output.")
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def render_json(payload: dict[str, Any], pretty: bool) -> str:
    if pretty:
        return json.dumps(payload, indent=2, sort_keys=True) + "\n"
    return json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n"


def read_optional_bytes(path: Path) -> bytes | None:
    if not path.exists():
        return None
    return path.read_bytes()


def lab_run_artifacts() -> list[Path]:
    if not LAB_RUNS_PATH.exists():
        return []
    return sorted(path for path in LAB_RUNS_PATH.glob("RUN_*") if path.exists())


def assert_forbidden_artifacts_absent() -> None:
    if INBOX_PATH.exists():
        raise ValueError(".studio_state/inbox.json was created or already exists")
    if LATEST_PATH.exists():
        raise ValueError("latest.json was created or already exists")
    if lab_run_artifacts():
        raise ValueError("lab/runs/RUN_* artifact exists")
    if LAB_PUZZLES_PATH.exists():
        raise ValueError("lab/puzzles artifact exists")


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


def require_no_execution_or_persistence(plan: dict[str, Any], loop: dict[str, Any]) -> None:
    if plan.get("execution_allowed") is not False:
        raise ValueError("authorized_action_plan_execution_allowed_drift")
    if plan.get("codex_execution_allowed") is not False:
        raise ValueError("authorized_action_plan_codex_execution_allowed_drift")
    if plan.get("persistence_allowed") is not False:
        raise ValueError("authorized_action_plan_persistence_allowed_drift")
    if loop.get("execution_performed") is not False:
        raise ValueError("semi_auto_loop_execution_performed_drift")
    if loop.get("codex_execution_performed") is not False:
        raise ValueError("semi_auto_loop_codex_execution_performed_drift")
    if loop.get("persistence_performed") is not False:
        raise ValueError("semi_auto_loop_persistence_performed_drift")


def build_full_loop_result(report_path: Path, decision: str) -> dict[str, Any]:
    before_current_state = read_optional_bytes(CURRENT_STATE_PATH)
    if before_current_state is not None:
        load_json(CURRENT_STATE_PATH)
    assert_forbidden_artifacts_absent()

    pipeline = state_pipeline.build_pipeline_dry_run(
        report_path=report_path,
        delta_schema_path=DEFAULT_DELTA_SCHEMA_PATH,
        snapshot_schema_path=DEFAULT_SNAPSHOT_SCHEMA_PATH,
        current_schema_path=DEFAULT_CURRENT_SCHEMA_PATH,
        report_schema_path=DEFAULT_REPORT_SCHEMA_PATH if DEFAULT_REPORT_SCHEMA_PATH.exists() else None,
        report_schema_explicit=False,
    )
    current_state = pipeline["studio_current_state_preview"]
    require_claim_safe(pipeline["studio_state_delta"], "delta")
    require_claim_safe(pipeline["studio_state_snapshot"], "snapshot")
    require_claim_safe(current_state, "current_state_preview")

    mission_candidate = mission.build_mission_candidate(current_state)
    mission.validate_mission_candidate(mission_candidate, DEFAULT_MISSION_SCHEMA_PATH)
    require_claim_safe(mission_candidate, "mission_candidate")

    operator_inbox = inbox.build_operator_inbox(current_state)
    inbox.validate_payload(operator_inbox, DEFAULT_INBOX_SCHEMA_PATH, "StudioOperatorInbox")
    require_claim_safe(operator_inbox, "operator_inbox")

    decision_candidate = humangate.build_decision_candidate(
        inbox=operator_inbox,
        decision=decision,
        expires_after="single_operator_review_session",
        operator_notes=None,
    )
    humangate.validate_payload(decision_candidate, DEFAULT_HUMANGATE_SCHEMA_PATH, "HumanGateDecisionCandidate")
    require_claim_safe(decision_candidate, "humangate_decision_candidate")

    authorized_plan = action_plan.build_plan(decision_candidate)
    action_plan.validate_payload(authorized_plan, DEFAULT_ACTION_PLAN_SCHEMA_PATH, "AuthorizedNextActionPlan")
    require_claim_safe(authorized_plan, "authorized_action_plan")

    semi_auto_loop = semi_auto.build_loop_payload(current_state, decision)
    semi_auto.validate_payload(semi_auto_loop, DEFAULT_SEMI_AUTO_SCHEMA_PATH, "SemiAutoStudioLoopDryRun")
    require_claim_safe(semi_auto_loop, "semi_auto_loop")
    require_no_execution_or_persistence(authorized_plan, semi_auto_loop)

    after_current_state = read_optional_bytes(CURRENT_STATE_PATH)
    current_state_modified = before_current_state != after_current_state
    assert_forbidden_artifacts_absent()
    if current_state_modified:
        raise ValueError(".studio_state/current_state.json changed during in-memory harness")

    return {
        "record_type": "full_studio_loop_in_memory_result",
        "contract_version": "V0",
        "source_report": pipeline["source_report"],
        "decision": decision,
        "delta_status": "TESTED",
        "snapshot_status": "TESTED",
        "current_state_preview_status": "TESTED",
        "mission_candidate_status": "TESTED",
        "operator_inbox_status": "TESTED",
        "humangate_decision_status": "TESTED",
        "authorized_action_plan_status": "TESTED",
        "semi_auto_loop_status": "TESTED",
        "execution_performed": False,
        "codex_execution_performed": False,
        "persistence_performed": False,
        "current_state_modified": False,
        "inbox_persisted": False,
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
    }


def main() -> int:
    args = parse_args()
    report_path = Path(args.report).resolve()
    schema_path = Path(args.schema).resolve() if args.schema else None

    try:
        result = build_full_loop_result(report_path=report_path, decision=args.decision)
        if schema_path is not None:
            validate_payload(result, schema_path, "FullStudioLoopInMemoryResult")
        sys.stdout.write(render_json(result, args.pretty))
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
