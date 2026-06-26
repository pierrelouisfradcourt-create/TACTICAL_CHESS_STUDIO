from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from update_studio_current_state import validate_current_shape


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_mission_candidate.schema.json"
DEFAULT_CURRENT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_current_state.schema.json"

CLAIM_POSTURE = "NO_CLAIM_ALLOWED"

SURFACES = (
    "active_runtime_code",
    "tests",
    "tools_scripts",
    "artifacts_runtime_outputs",
    "canonical_docs",
    "roadmap_docs_only",
    "inference",
)

ABSOLUTE_BLOCKED_ACTIONS = (
    "commit",
    "push",
    "branch_creation",
    "pull_request_creation",
    "runtime_activation",
    "DecisionController_activation",
    "SearchBackend_activation",
    "NeuralAgent_activation",
    "dataset_generation",
    "dataset_reset",
    "training",
    "benchmark",
    "latest.json_creation",
    "lab/runs/RUN_*_creation",
    "lab/puzzles_creation",
    "model_checkpoint_creation",
    "model_promotion",
    "public_claim",
    "release_automation",
    "Codex_execution",
)

REFERENCE_ONLY_PATHS = (
    "AGENTS.md",
    "schemas/studio_current_state.schema.json",
    "schemas/studio_mission_candidate.schema.json",
    "scripts/control_plane/compile_next_mission_dry_run.py",
    "docs/control-plane/LOOP_CONTRACT.md",
    "docs/control-plane/LOOP_STATES.md",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Compile one conservative StudioMissionCandidate V0 from a "
            "StudioCurrentState preview. This is stdout-only and never executes Codex."
        )
    )
    parser.add_argument("--current-state", required=True, help="Path to a StudioCurrentState JSON preview.")
    parser.add_argument(
        "--schema",
        default=None,
        help="Optional StudioMissionCandidate schema path. Defaults to schemas/studio_mission_candidate.schema.json.",
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


def normalize_status(value: Any) -> str:
    text = str(value).strip() if value is not None else ""
    if text in {"IMPLEMENTED", "TESTED", "DOCUMENTED_ONLY", "PASSIVE", "BLOCKED", "NOT_FOUND", "UNKNOWN"}:
        return text
    return "UNKNOWN"


def current_state_id(current_state: dict[str, Any]) -> str:
    snapshot_ids = unique_strings([str(item) for item in current_state.get("source_snapshot_ids", [])])
    fragment = ",".join(snapshot_ids) if snapshot_ids else "no-snapshots"
    return f"studio_current_state:{current_state.get('updated_at', 'UNKNOWN')}:{fragment}"


def blocked_status_surfaces(current_state: dict[str, Any]) -> list[dict[str, str]]:
    status_by_surface = current_state.get("status_by_surface")
    if not isinstance(status_by_surface, dict):
        return [{"summary": "status_by_surface missing or invalid", "status": "UNKNOWN", "surface": "inference"}]

    blockers: list[dict[str, str]] = []
    for surface in SURFACES:
        status = normalize_status(status_by_surface.get(surface))
        if status in {"BLOCKED", "UNKNOWN"}:
            blockers.append(
                {
                    "summary": f"status_by_surface.{surface} is {status}",
                    "status": status,
                    "surface": surface,
                }
            )
    return blockers


def first_dict(items: Any) -> dict[str, Any] | None:
    if not isinstance(items, list):
        return None
    for item in items:
        if isinstance(item, dict):
            return item
    return None


def infer_surfaces_from_target_files(target_files: list[str]) -> list[str]:
    surfaces: list[str] = []
    for path in target_files:
        normalized = path.replace("\\", "/")
        if normalized.startswith("scripts/"):
            surfaces.append("tools_scripts")
        elif normalized.startswith("schemas/") or normalized.startswith("docs/"):
            surfaces.append("canonical_docs")
        elif normalized.startswith("tests/"):
            surfaces.append("tests")
    return unique_strings(surfaces)


def select_mission(current_state: dict[str, Any]) -> dict[str, Any]:
    next_best = current_state.get("next_best_mission")
    if isinstance(next_best, dict):
        goal = str(next_best.get("goal") or "Review next_best_mission from StudioCurrentState")
        target_files = unique_strings([str(item) for item in next_best.get("target_files", [])]) if isinstance(next_best.get("target_files"), list) else []
        return {
            "task_class": str(next_best.get("task_class") or "control_plane_followup"),
            "goal": goal,
            "reason": str(next_best.get("reason") or "Selected from current_state.next_best_mission."),
            "target_files": target_files,
            "validation_plan": unique_strings([str(item) for item in next_best.get("validation_plan", [])])
            if isinstance(next_best.get("validation_plan"), list)
            else ["Run the smallest validation scoped to the selected mission."],
            "selection_source": "current_state.next_best_mission",
        }

    open_blocker = first_dict(current_state.get("open_blockers"))
    if open_blocker is not None:
        summary = str(open_blocker.get("summary") or "Open blocker requires audit")
        surface = str(open_blocker.get("surface") or "inference")
        return {
            "task_class": "control_plane_audit",
            "goal": f"Audit and route blocker: {summary}",
            "reason": "Selected from current_state.open_blockers; blockers prevent forward transition.",
            "target_files": [],
            "validation_plan": ["Read current state and produce a bounded blocker diagnosis only."],
            "selection_source": "current_state.open_blockers",
            "surface": surface if surface in SURFACES else "inference",
        }

    status_blockers = blocked_status_surfaces(current_state)
    if status_blockers:
        blocker = status_blockers[0]
        surface = blocker["surface"]
        return {
            "task_class": "control_plane_audit",
            "goal": f"Audit unresolved surface status: {surface}",
            "reason": f"{blocker['summary']}; BLOCKED and UNKNOWN are treated as blockers.",
            "target_files": [],
            "validation_plan": ["Read current state and identify the smallest evidence needed to resolve UNKNOWN/BLOCKED status."],
            "selection_source": "current_state.status_by_surface",
            "surface": surface,
        }

    decision_debt = first_dict(current_state.get("decision_debt"))
    if decision_debt is not None:
        summary = str(decision_debt.get("summary") or "Decision debt requires review")
        surface = str(decision_debt.get("surface") or "inference")
        return {
            "task_class": "control_plane_decision_debt_review",
            "goal": f"Review decision debt: {summary}",
            "reason": "Selected from current_state.decision_debt after no blockers were found.",
            "target_files": [],
            "validation_plan": ["Read current state and summarize the HumanGate decision needed."],
            "selection_source": "current_state.decision_debt",
            "surface": surface if surface in SURFACES else "inference",
        }

    return {
        "task_class": "control_plane_passive_review",
        "goal": "Perform a passive StudioCurrentState review",
        "reason": "No next_best_mission, open blockers, blocked statuses, or decision debt were found.",
        "target_files": [],
        "validation_plan": ["Read current state and report PASSIVE findings only."],
        "selection_source": "passive_review_fallback",
        "surface": "inference",
    }


def surfaces_for_mission(mission: dict[str, Any]) -> list[str]:
    target_files = mission.get("target_files")
    surfaces = infer_surfaces_from_target_files(target_files if isinstance(target_files, list) else [])
    surface = mission.get("surface")
    if isinstance(surface, str) and surface in SURFACES:
        surfaces.append(surface)
    if not surfaces:
        surfaces.append("inference")
    return unique_strings(surfaces)


def mission_id(source_current_state_id: str, mission: dict[str, Any]) -> str:
    digest_source = f"{source_current_state_id}|{mission.get('selection_source')}|{mission.get('goal')}"
    digest = hashlib.sha256(digest_source.encode("utf-8")).hexdigest()[:12]
    return f"studio_mission_candidate:{digest}"


def build_output_routing() -> dict[str, Any]:
    return {
        "mode": "DRY_RUN_STDOUT_ONLY",
        "stdout_only": True,
        "files_written": False,
        "current_state_written": False,
        "allowed_output_paths": [],
        "forbidden_output_paths": [
            ".studio_state/current_state.json",
            "latest.json",
            "lab/runs/RUN_*",
            "lab/puzzles",
            "models",
            "datasets",
        ],
    }


def build_prompt_candidate(
    mission: dict[str, Any],
    target_files: list[str],
    reference_only_paths: list[str],
    blocked_actions: list[str],
    validation_plan: list[str],
    output_routing: dict[str, Any],
) -> dict[str, Any]:
    return {
        "codex_runtime": {
            "requested_model": "gpt-5.5-codex",
            "reasoning_effort": "high",
            "task_class": str(mission["task_class"]),
            "fallback": "UNKNOWN => BLOCKED",
            "dry_run_only": "true",
        },
        "preflight": [
            "git status --short --branch",
            "git rev-parse HEAD",
            "git diff --name-status",
        ],
        "sources_to_read": reference_only_paths,
        "scope_in": target_files,
        "scope_out": [
            "persistent .studio_state/current_state.json writes",
            "runtime Rust changes",
            "ML changes",
            "dataset generation or reset",
            "training",
            "benchmark",
            "latest.json creation",
            "lab/runs/RUN_* creation",
            "lab/puzzles creation",
            "agent activation",
            "Codex execution by this compiler",
        ],
        "output_routing": {
            "mode": [str(output_routing["mode"])],
            "stdout_only": [str(output_routing["stdout_only"]).lower()],
            "files_written": [str(output_routing["files_written"]).lower()],
            "current_state_written": [str(output_routing["current_state_written"]).lower()],
        },
        "blocked_actions": blocked_actions,
        "validation": validation_plan,
        "final_report_requirements": [
            "preflight",
            "source_state",
            "route_check",
            "output_routing_result",
            "files_changed",
            "commands_run",
            "skipped_validation",
            "risks",
            "status_by_surface",
            "software_verdict",
            "evidence_verdict",
            "claim_verdict",
            "no_global_ready_verdict: true",
            "claim_posture: NO_CLAIM_ALLOWED",
        ],
        "no_global_ready_verdict": True,
        "claim_posture": CLAIM_POSTURE,
    }


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


def validate_mission_candidate(candidate: dict[str, Any], schema_path: Path) -> None:
    validate_payload(candidate, schema_path, "StudioMissionCandidate")


def validate_payload(payload: dict[str, Any], schema_path: Path, label: str) -> None:
    validator = build_validator(schema_path)
    errors = sorted(validator.iter_errors(payload), key=lambda error: (list(error.absolute_path), error.message))
    if not errors:
        return

    first = errors[0]
    location = ".".join(str(part) for part in first.absolute_path) or "$"
    raise ValueError(f"{label} schema validation failed at {location}: {first.message}")


def build_mission_candidate(current_state: dict[str, Any]) -> dict[str, Any]:
    if current_state.get("claim_posture") != CLAIM_POSTURE:
        raise ValueError("current_state_claim_posture_invalid")
    if current_state.get("no_global_ready_verdict") is not True:
        raise ValueError("current_state_global_ready_verdict_invalid")

    source_id = current_state_id(current_state)
    mission = select_mission(current_state)
    target_files = unique_strings([str(item) for item in mission.get("target_files", [])])
    validation_plan = unique_strings([str(item) for item in mission.get("validation_plan", [])])
    reference_only_paths = unique_strings([*REFERENCE_ONLY_PATHS, "CURRENT_STATE_INPUT"])
    forbidden_missions = unique_strings(
        [*(str(item) for item in current_state.get("forbidden_next_missions", [])), *ABSOLUTE_BLOCKED_ACTIONS]
    )
    blocked_actions = unique_strings([*forbidden_missions, *(str(item) for item in mission.get("blocked_actions", []))])
    surfaces_in_scope = surfaces_for_mission(mission)
    surfaces_out_of_scope = [surface for surface in SURFACES if surface not in set(surfaces_in_scope)]
    output_routing = build_output_routing()

    return {
        "record_type": "studio_mission_candidate",
        "contract_version": "V0",
        "generated_at": now_utc(),
        "source_current_state_id": source_id,
        "mission_id": mission_id(source_id, mission),
        "task_class": str(mission["task_class"]),
        "goal": str(mission["goal"]),
        "reason": str(mission["reason"]),
        "target_files": target_files,
        "reference_only_paths": reference_only_paths,
        "surfaces_in_scope": surfaces_in_scope,
        "surfaces_out_of_scope": surfaces_out_of_scope,
        "blocked_actions": blocked_actions,
        "validation_plan": validation_plan,
        "output_routing": output_routing,
        "humangate_required": True,
        "codex_prompt_candidate": build_prompt_candidate(
            mission=mission,
            target_files=target_files,
            reference_only_paths=reference_only_paths,
            blocked_actions=blocked_actions,
            validation_plan=validation_plan,
            output_routing=output_routing,
        ),
        "forbidden_missions": forbidden_missions,
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

        candidate = build_mission_candidate(raw_current_state)
        validate_mission_candidate(candidate, schema_path)
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
