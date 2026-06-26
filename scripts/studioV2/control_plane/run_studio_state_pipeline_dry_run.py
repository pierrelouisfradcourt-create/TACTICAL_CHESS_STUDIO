from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from apply_studio_state_delta_dry_run import aggregate_snapshot, validate_snapshot
from derive_studio_state_delta import derive_delta, validate_delta
from update_studio_current_state import build_current_state, validate_current_state


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DELTA_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_state_delta.schema.json"
DEFAULT_SNAPSHOT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_state_snapshot.schema.json"
DEFAULT_CURRENT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_current_state.schema.json"
DEFAULT_REPORT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studiopilot_execution_report.schema.json"

CLAIM_POSTURE = "NO_CLAIM_ALLOWED"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run the stdout-only Studio State Pipeline dry-run: "
            "ExecutionReport JSON -> StudioStateDelta -> StudioStateSnapshot -> "
            "StudioCurrentState preview."
        )
    )
    parser.add_argument("--report", required=True, help="Path to a StudioPilot ExecutionReport JSON file.")
    parser.add_argument(
        "--delta-schema",
        default=None,
        help="Optional StudioStateDelta schema path. Defaults to schemas/studio_state_delta.schema.json.",
    )
    parser.add_argument(
        "--snapshot-schema",
        default=None,
        help="Optional StudioStateSnapshot schema path. Defaults to schemas/studio_state_snapshot.schema.json.",
    )
    parser.add_argument(
        "--current-schema",
        default=None,
        help="Optional StudioCurrentState schema path. Defaults to schemas/studio_current_state.schema.json.",
    )
    parser.add_argument(
        "--report-schema",
        default=None,
        help="Optional StudioPilot ExecutionReport schema path. Defaults to schemas/studiopilot_execution_report.schema.json when present.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print final dry-run JSON output.")
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def render_json(payload: dict[str, Any], pretty: bool) -> str:
    if pretty:
        return json.dumps(payload, indent=2, sort_keys=True) + "\n"
    return json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n"


def require_execution_report_shape(report: dict[str, Any], report_path: Path) -> None:
    if report.get("record_type") == "studio_state_delta":
        raise ValueError(f"expected ExecutionReport JSON, got StudioStateDelta: {report_path}")

    task_id = report.get("task_id")
    if not isinstance(task_id, str) or not task_id.strip():
        raise ValueError(f"report_missing_required_identity: {report_path}: task_id")


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


def require_pipeline_contract(payload: dict[str, Any], label: str) -> None:
    if payload.get("claim_posture") != CLAIM_POSTURE:
        raise ValueError(f"{label}_claim_posture_invalid")
    if payload.get("no_global_ready_verdict") is not True:
        raise ValueError(f"{label}_global_ready_verdict_invalid")


def source_report_summary(report: dict[str, Any], report_path: Path, delta: dict[str, Any]) -> dict[str, Any]:
    return {
        "path": str(report_path),
        "task_id": report.get("task_id"),
        "source_report_id": delta.get("source_report_id"),
        "source_task_id": delta.get("source_task_id"),
    }


def build_pipeline_dry_run(
    report_path: Path,
    delta_schema_path: Path,
    snapshot_schema_path: Path,
    current_schema_path: Path,
    report_schema_path: Path | None,
    report_schema_explicit: bool = False,
) -> dict[str, Any]:
    raw_report = load_json(report_path)
    if not isinstance(raw_report, dict):
        raise ValueError("report root must be an object")
    looks_like_studiopilot = "schema_version" in raw_report or "validation_results" in raw_report
    if report_schema_path is not None and (report_schema_explicit or looks_like_studiopilot):
        validate_payload(raw_report, report_schema_path, "StudioPilot ExecutionReport")
    require_execution_report_shape(raw_report, report_path)

    delta = derive_delta(raw_report)
    validate_delta(delta, delta_schema_path)
    require_pipeline_contract(delta, "delta")

    snapshot = aggregate_snapshot([delta])
    validate_snapshot(snapshot, snapshot_schema_path)
    require_pipeline_contract(snapshot, "snapshot")

    current_state_preview = build_current_state(snapshot, current=None, explicit_write=False)
    validate_current_state(current_state_preview, current_schema_path)
    require_pipeline_contract(current_state_preview, "current_state_preview")

    return {
        "record_type": "studio_state_pipeline_dry_run",
        "contract_version": "V0",
        "source_report": source_report_summary(raw_report, report_path, delta),
        "delta_status": "TESTED",
        "snapshot_status": "TESTED",
        "current_state_preview_status": "TESTED",
        "current_state_written": False,
        "next_best_mission": current_state_preview.get("next_best_mission"),
        "forbidden_next_missions": current_state_preview.get("forbidden_next_missions", []),
        "humangate_required_items": current_state_preview.get("humangate_required_items", []),
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
        "studio_state_delta": delta,
        "studio_state_snapshot": snapshot,
        "studio_current_state_preview": current_state_preview,
    }


def main() -> int:
    args = parse_args()
    report_path = Path(args.report).resolve()
    delta_schema_path = Path(args.delta_schema).resolve() if args.delta_schema else DEFAULT_DELTA_SCHEMA_PATH
    snapshot_schema_path = (
        Path(args.snapshot_schema).resolve() if args.snapshot_schema else DEFAULT_SNAPSHOT_SCHEMA_PATH
    )
    current_schema_path = Path(args.current_schema).resolve() if args.current_schema else DEFAULT_CURRENT_SCHEMA_PATH
    if args.report_schema:
        report_schema_path = Path(args.report_schema).resolve()
    else:
        report_schema_path = DEFAULT_REPORT_SCHEMA_PATH if DEFAULT_REPORT_SCHEMA_PATH.exists() else None

    try:
        payload = build_pipeline_dry_run(
            report_path=report_path,
            delta_schema_path=delta_schema_path,
            snapshot_schema_path=snapshot_schema_path,
            current_schema_path=current_schema_path,
            report_schema_path=report_schema_path,
            report_schema_explicit=bool(args.report_schema),
        )
        sys.stdout.write(render_json(payload, pretty=args.pretty))
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
