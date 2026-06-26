from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from update_studio_current_state import validate_current_shape


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CURRENT_STATE_PATH = PROJECT_ROOT / ".studio_state" / "current_state.json"
DEFAULT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_current_state.schema.json"

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

FORBIDDEN_OUTPUT_PATHS = (
    ".studio_state/current_state.json",
    ".studio_state/inbox.json",
    "latest.json",
    "lab/runs/RUN_*",
    "lab/puzzles",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Render a stdout-only human Studio status report from "
            ".studio_state/current_state.json. This command is read-only."
        )
    )
    parser.add_argument(
        "--current-state",
        default=str(DEFAULT_CURRENT_STATE_PATH.relative_to(PROJECT_ROOT)),
        help="Path to a StudioCurrentState JSON file. Defaults to .studio_state/current_state.json.",
    )
    parser.add_argument(
        "--schema",
        default=str(DEFAULT_SCHEMA_PATH.relative_to(PROJECT_ROOT)),
        help=(
            "Optional StudioCurrentState schema path. Defaults to "
            "schemas/studio_current_state.schema.json when present."
        ),
    )
    parser.add_argument("--format", choices=("text", "json"), default="text", help="Output format.")
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_path(path_text: str) -> Path:
    path = Path(path_text)
    if path.is_absolute():
        return path
    return (PROJECT_ROOT / path).resolve()


def unique_strings(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    seen: set[str] = set()
    result: list[str] = []
    for raw_value in values:
        value = str(raw_value).strip()
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def status_text(value: Any) -> str:
    text = str(value).strip() if value is not None else ""
    if text in {"IMPLEMENTED", "TESTED", "DOCUMENTED_ONLY", "PASSIVE", "BLOCKED", "NOT_FOUND", "UNKNOWN"}:
        return text
    return "UNKNOWN"


def current_state_id(current_state: dict[str, Any]) -> str:
    snapshot_ids = unique_strings(current_state.get("source_snapshot_ids"))
    fragment = ",".join(snapshot_ids) if snapshot_ids else "no-snapshots"
    return f"studio_current_state:{current_state.get('updated_at', 'UNKNOWN')}:{fragment}"


def build_validator(schema_path: Path) -> Any | None:
    if not schema_path.exists():
        return None
    try:
        import jsonschema
    except ImportError:
        return None

    schema_obj = load_json(schema_path)
    validator_class = jsonschema.validators.validator_for(schema_obj)
    validator_class.check_schema(schema_obj)
    format_checker = getattr(validator_class, "FORMAT_CHECKER", None)
    if format_checker is None:
        return validator_class(schema_obj)
    return validator_class(schema_obj, format_checker=format_checker)


def validate_against_schema(current_state: dict[str, Any], schema_path: Path) -> dict[str, str]:
    if not schema_path.exists():
        return {
            "status": "PASSIVE",
            "schema_path": str(schema_path),
            "summary": "schema path not found; schema validation skipped",
        }

    validator = build_validator(schema_path)
    if validator is None:
        return {
            "status": "PASSIVE",
            "schema_path": str(schema_path),
            "summary": "jsonschema unavailable; schema validation skipped",
        }

    errors = sorted(validator.iter_errors(current_state), key=lambda error: (list(error.absolute_path), error.message))
    if not errors:
        return {
            "status": "TESTED",
            "schema_path": str(schema_path),
            "summary": "StudioCurrentState schema validation passed",
        }

    first = errors[0]
    location = ".".join(str(part) for part in first.absolute_path) or "$"
    raise ValueError(f"StudioCurrentState schema validation failed at {location}: {first.message}")


def surface_status(current_state: dict[str, Any]) -> dict[str, str]:
    raw_status = current_state.get("status_by_surface")
    if not isinstance(raw_status, dict):
        return {surface: "UNKNOWN" for surface in SURFACES}
    return {surface: status_text(raw_status.get(surface)) for surface in SURFACES}


def item_summary(item: Any) -> dict[str, Any]:
    if not isinstance(item, dict):
        return {"summary": str(item), "status": "UNKNOWN"}
    result: dict[str, Any] = {
        "summary": str(item.get("summary") or "state item"),
        "status": status_text(item.get("status")),
    }
    for key in ("surface", "source", "source_task_id", "source_snapshot_id", "source_delta_id"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            result[key] = value.strip()
    evidence = unique_strings(item.get("evidence"))
    if evidence:
        result["evidence"] = evidence
    return result


def item_summaries(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []
    return [item_summary(item) for item in items]


def mission_summary(raw_mission: Any) -> dict[str, Any] | None:
    if raw_mission is None:
        return None
    if not isinstance(raw_mission, dict):
        return {
            "task_class": "UNKNOWN",
            "goal": str(raw_mission),
            "reason": "next_best_mission was not an object",
            "source": "current_state.next_best_mission",
        }
    return {
        "task_class": str(raw_mission.get("task_class") or "UNKNOWN"),
        "goal": str(raw_mission.get("goal") or "UNKNOWN"),
        "reason": str(raw_mission.get("reason") or "UNKNOWN"),
        "target_files": unique_strings(raw_mission.get("target_files")),
        "blocked_actions": unique_strings(raw_mission.get("blocked_actions")),
        "validation_plan": unique_strings(raw_mission.get("validation_plan")),
        "source": str(raw_mission.get("source") or "current_state.next_best_mission"),
    }


def build_report(current_state: dict[str, Any], current_state_path: Path, schema_validation: dict[str, str]) -> dict[str, Any]:
    claim_posture = str(current_state.get("claim_posture") or "UNKNOWN")
    no_global_ready_verdict = current_state.get("no_global_ready_verdict") is True
    return {
        "record_type": "studio_status_report",
        "contract_version": "V0",
        "source_current_state_id": current_state_id(current_state),
        "source_current_state_path": str(current_state_path),
        "source_updated_at": str(current_state.get("updated_at") or "UNKNOWN"),
        "source_snapshot_count": len(unique_strings(current_state.get("source_snapshot_ids"))),
        "applied_delta_count": len(unique_strings(current_state.get("applied_delta_ids"))),
        "schema_validation": schema_validation,
        "status_by_surface": surface_status(current_state),
        "proven_surfaces": unique_strings(current_state.get("proven_surfaces")),
        "blocked_surfaces": unique_strings(current_state.get("blocked_surfaces")),
        "open_risks": item_summaries(current_state.get("open_risks")),
        "open_blockers": item_summaries(current_state.get("open_blockers")),
        "decision_debt": item_summaries(current_state.get("decision_debt")),
        "next_best_mission": mission_summary(current_state.get("next_best_mission")),
        "forbidden_next_missions": unique_strings(current_state.get("forbidden_next_missions")),
        "humangate_required_items": item_summaries(current_state.get("humangate_required_items")),
        "claim_posture": claim_posture,
        "no_global_ready_verdict": no_global_ready_verdict,
        "safety_flags": {
            "stdout_only": True,
            "current_state_write_allowed": False,
            "inbox_write_allowed": False,
            "latest_json_write_allowed": False,
            "lab_runs_write_allowed": False,
            "lab_puzzles_write_allowed": False,
            "codex_execution_allowed": False,
            "runtime_activation_allowed": False,
            "agent_activation_allowed": False,
            "dataset_generation_allowed": False,
            "training_allowed": False,
            "benchmark_allowed": False,
            "model_promotion_allowed": False,
            "public_claim_allowed": False,
            "forbidden_output_paths": list(FORBIDDEN_OUTPUT_PATHS),
        },
    }


def render_lines_for_list(values: list[str]) -> list[str]:
    if not values:
        return ["- none"]
    return [f"- {value}" for value in values]


def render_lines_for_items(items: list[dict[str, Any]]) -> list[str]:
    if not items:
        return ["- none"]
    lines: list[str] = []
    for item in items:
        parts = [f"status={item.get('status', 'UNKNOWN')}", f"summary={item.get('summary', 'UNKNOWN')}"]
        for key in ("surface", "source", "source_task_id"):
            if key in item:
                parts.append(f"{key}={item[key]}")
        lines.append(f"- {'; '.join(parts)}")
    return lines


def render_text(report: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.extend(
        [
            "Studio Status",
            f"- record_type: {report['record_type']}",
            f"- contract_version: {report['contract_version']}",
            f"- source_current_state_id: {report['source_current_state_id']}",
            f"- source_current_state_path: {report['source_current_state_path']}",
            f"- source_updated_at: {report['source_updated_at']}",
            f"- source_snapshot_count: {report['source_snapshot_count']}",
            f"- applied_delta_count: {report['applied_delta_count']}",
            f"- schema_validation: {report['schema_validation']['status']} ({report['schema_validation']['summary']})",
            "",
            "Surface Status",
        ]
    )
    for surface, status in report["status_by_surface"].items():
        lines.append(f"- {surface}: {status}")

    sections: tuple[tuple[str, str], ...] = (
        ("Proven Surfaces", "proven_surfaces"),
        ("Blocked Surfaces", "blocked_surfaces"),
        ("Open Risks", "open_risks"),
        ("Open Blockers", "open_blockers"),
        ("Decision Debt", "decision_debt"),
    )
    for title, key in sections:
        lines.extend(["", title])
        values = report[key]
        if values and isinstance(values[0], dict):
            lines.extend(render_lines_for_items(values))
        else:
            lines.extend(render_lines_for_list(values))

    lines.extend(["", "Next Best Mission"])
    mission = report["next_best_mission"]
    if mission is None:
        lines.append("- none")
    else:
        lines.extend(
            [
                f"- task_class: {mission.get('task_class', 'UNKNOWN')}",
                f"- goal: {mission.get('goal', 'UNKNOWN')}",
                f"- reason: {mission.get('reason', 'UNKNOWN')}",
                f"- source: {mission.get('source', 'current_state.next_best_mission')}",
            ]
        )
        if mission.get("target_files"):
            lines.append(f"- target_files: {', '.join(mission['target_files'])}")
        if mission.get("validation_plan"):
            lines.append(f"- validation_plan: {'; '.join(mission['validation_plan'])}")

    lines.extend(["", "Forbidden Next Missions"])
    lines.extend(render_lines_for_list(report["forbidden_next_missions"]))

    lines.extend(["", "HumanGate Required Items"])
    lines.extend(render_lines_for_items(report["humangate_required_items"]))

    lines.extend(
        [
            "",
            "Claim Posture",
            f"- claim_posture: {report['claim_posture']}",
            f"- no_global_ready_verdict: {str(report['no_global_ready_verdict']).lower()}",
            "- global_verdict: omitted_by_policy",
            "",
            "Safety Flags",
        ]
    )
    for key, value in report["safety_flags"].items():
        if key == "forbidden_output_paths":
            lines.append("- forbidden_output_paths:")
            lines.extend(f"  - {path}" for path in value)
        else:
            lines.append(f"- {key}: {str(value).lower()}")
    return "\n".join(lines) + "\n"


def render_json(report: dict[str, Any]) -> str:
    return json.dumps(report, indent=2, sort_keys=True) + "\n"


def main() -> int:
    args = parse_args()
    current_state_path = normalize_path(args.current_state)
    schema_path = normalize_path(args.schema) if args.schema else DEFAULT_SCHEMA_PATH

    try:
        raw_current_state = load_json(current_state_path)
        if not isinstance(raw_current_state, dict):
            print("INPUT_VALIDATION_ERROR: current state root must be an object", file=sys.stderr)
            return 1
        schema_validation = validate_against_schema(raw_current_state, schema_path)
        validate_current_shape(raw_current_state, current_state_path)
        if raw_current_state.get("claim_posture") != CLAIM_POSTURE:
            raise ValueError("current_state_claim_posture_invalid")
        if raw_current_state.get("no_global_ready_verdict") is not True:
            raise ValueError("current_state_global_ready_verdict_invalid")

        report = build_report(raw_current_state, current_state_path, schema_validation)
        if args.format == "json":
            sys.stdout.write(render_json(report))
        else:
            sys.stdout.write(render_text(report))
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
    except Exception as exc:  # pragma: no cover - defensive boundary
        print(f"INTERNAL_ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
