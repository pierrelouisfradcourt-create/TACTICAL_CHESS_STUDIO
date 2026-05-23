from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_state_snapshot.schema.json"
DEFAULT_DELTA_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_state_delta.schema.json"

STATUSES = (
    "IMPLEMENTED",
    "TESTED",
    "DOCUMENTED_ONLY",
    "PASSIVE",
    "BLOCKED",
    "NOT_FOUND",
    "UNKNOWN",
)
STATUS_SET = set(STATUSES)
STATUS_PRECEDENCE = (
    "BLOCKED",
    "UNKNOWN",
    "NOT_FOUND",
    "PASSIVE",
    "DOCUMENTED_ONLY",
    "IMPLEMENTED",
    "TESTED",
)

SURFACES = (
    "active_runtime_code",
    "tests",
    "tools_scripts",
    "artifacts_runtime_outputs",
    "canonical_docs",
    "roadmap_docs_only",
    "inference",
)

DELTA_REQUIRED_FIELDS = (
    "record_type",
    "contract_version",
    "source_report_id",
    "source_task_id",
    "generated_at",
    "risks_created",
    "blockers_opened",
    "decision_debt_opened",
    "proven_surfaces",
    "blocked_surfaces",
    "next_best_mission",
    "forbidden_next_missions",
    "humangate_required",
    "status_by_surface",
    "claim_posture",
    "no_global_ready_verdict",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Dry-run aggregate one or more StudioStateDelta V0 JSON files into "
            "a proposed StudioStateSnapshot V0 written to stdout."
        )
    )
    parser.add_argument(
        "--delta",
        action="append",
        required=True,
        help="Path to a StudioStateDelta JSON file. Repeat for multiple deltas.",
    )
    parser.add_argument(
        "--schema",
        default=None,
        help="Optional StudioStateSnapshot schema path. When provided, the snapshot is validated.",
    )
    parser.add_argument(
        "--delta-schema",
        default=None,
        help="Optional StudioStateDelta schema path. Defaults to schemas/studio_state_delta.schema.json.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_status(value: Any, default: str = "UNKNOWN") -> str:
    text = str(value).strip() if value is not None else ""
    if text in STATUS_SET:
        return text
    return default


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


def make_surface_map(default: str = "UNKNOWN") -> dict[str, str]:
    return {surface: default for surface in SURFACES}


def validate_delta_shape(delta: dict[str, Any], path: Path) -> None:
    missing = [field for field in DELTA_REQUIRED_FIELDS if field not in delta]
    if missing:
        raise ValueError(f"delta_missing_required_fields: {path}: {missing}")
    if delta.get("record_type") != "studio_state_delta":
        raise ValueError(f"delta_record_type_invalid: {path}")
    if delta.get("contract_version") != "V0":
        raise ValueError(f"delta_contract_version_invalid: {path}")
    if delta.get("claim_posture") != "NO_CLAIM_ALLOWED":
        raise ValueError(f"delta_claim_posture_invalid: {path}")
    if delta.get("no_global_ready_verdict") is not True:
        raise ValueError(f"delta_global_ready_verdict_invalid: {path}")


def item_key(item: dict[str, Any]) -> tuple[str, str, str, str, str]:
    return (
        str(item.get("source_delta_id", "")),
        str(item.get("source_task_id", "")),
        str(item.get("summary", "")),
        str(item.get("status", "")),
        str(item.get("surface", "")),
    )


def add_item_once(items: list[dict[str, Any]], item: dict[str, Any]) -> None:
    key = item_key(item)
    for existing in items:
        if item_key(existing) == key:
            return
    items.append(item)


def copy_snapshot_item(raw_item: dict[str, Any], delta: dict[str, Any]) -> dict[str, Any]:
    item: dict[str, Any] = {
        "summary": str(raw_item.get("summary") or raw_item.get("risk") or raw_item.get("reason") or "state item"),
        "status": normalize_status(raw_item.get("status"), default="UNKNOWN"),
        "source_delta_id": str(delta["source_report_id"]),
        "source_task_id": str(delta["source_task_id"]),
    }
    for key in ("surface", "source"):
        value = raw_item.get(key)
        if isinstance(value, str) and value.strip():
            item[key] = value.strip()
    evidence = raw_item.get("evidence")
    if isinstance(evidence, list):
        normalized_evidence = unique_strings([str(value) for value in evidence])
        if normalized_evidence:
            item["evidence"] = normalized_evidence
    return item


def add_items_from_delta(target: list[dict[str, Any]], raw_items: Any, delta: dict[str, Any]) -> None:
    if not isinstance(raw_items, list):
        return
    for raw_item in raw_items:
        if isinstance(raw_item, dict):
            add_item_once(target, copy_snapshot_item(raw_item, delta))


def status_by_surface_from(delta: dict[str, Any]) -> dict[str, str]:
    raw_map = delta.get("status_by_surface")
    if not isinstance(raw_map, dict):
        return make_surface_map()
    result = make_surface_map()
    for surface in SURFACES:
        result[surface] = normalize_status(raw_map.get(surface), default="UNKNOWN")
    return result


def conservative_status(statuses: list[str]) -> str:
    normalized = [normalize_status(status) for status in statuses]
    for candidate in STATUS_PRECEDENCE:
        if candidate in normalized:
            return candidate
    return "UNKNOWN"


def merge_status_by_surface(deltas: list[dict[str, Any]]) -> dict[str, str]:
    surface_statuses: dict[str, list[str]] = {surface: [] for surface in SURFACES}
    for delta in deltas:
        delta_map = status_by_surface_from(delta)
        for surface in SURFACES:
            surface_statuses[surface].append(delta_map[surface])
    return {surface: conservative_status(statuses) for surface, statuses in surface_statuses.items()}


def mission_key(mission: dict[str, Any] | None) -> str:
    if not isinstance(mission, dict):
        return ""
    return json.dumps(mission, sort_keys=True, separators=(",", ":"))


def choose_next_best_mission(deltas: list[dict[str, Any]], decision_debt: list[dict[str, Any]]) -> dict[str, Any] | None:
    missions: list[tuple[str, str, dict[str, Any]]] = []
    for delta in deltas:
        mission = delta.get("next_best_mission")
        if isinstance(mission, dict):
            missions.append((str(delta["source_report_id"]), str(delta["source_task_id"]), mission))

    if not missions:
        return None

    unique_missions = {mission_key(mission) for _, _, mission in missions}
    selected_delta_id, selected_task_id, selected = missions[0]
    if len(unique_missions) > 1:
        add_item_once(
            decision_debt,
            {
                "summary": "multiple next_best_mission candidates require HumanGate selection",
                "status": "UNKNOWN",
                "source": "next_best_mission",
                "source_delta_id": selected_delta_id,
                "source_task_id": selected_task_id,
            },
        )
    return selected


def surface_is_tested(delta: dict[str, Any], surface: str) -> bool:
    if status_by_surface_from(delta).get(surface) == "TESTED":
        return True
    evidence_verdict = delta.get("evidence_verdict")
    if isinstance(evidence_verdict, dict) and normalize_status(evidence_verdict.get(surface)) == "TESTED":
        return True
    evidence_added = delta.get("evidence_added")
    if isinstance(evidence_added, list):
        return any(
            isinstance(item, dict)
            and item.get("surface") == surface
            and normalize_status(item.get("status")) == "TESTED"
            for item in evidence_added
        )
    return False


def aggregate_snapshot(deltas: list[dict[str, Any]]) -> dict[str, Any]:
    source_delta_ids = unique_strings([str(delta["source_report_id"]) for delta in deltas])
    proven_surfaces: list[str] = []
    blocked_surfaces: list[str] = []
    open_blockers: list[dict[str, Any]] = []
    open_risks: list[dict[str, Any]] = []
    decision_debt: list[dict[str, Any]] = []
    humangate_required_items: list[dict[str, Any]] = []
    forbidden_next_missions: list[str] = []

    for delta in deltas:
        delta_id = str(delta["source_report_id"])
        task_id = str(delta["source_task_id"])

        for surface in delta.get("proven_surfaces", []):
            if surface in SURFACES and surface_is_tested(delta, surface):
                proven_surfaces.append(surface)

        for surface in delta.get("blocked_surfaces", []):
            if surface in SURFACES:
                blocked_surfaces.append(surface)

        add_items_from_delta(open_blockers, delta.get("blockers_opened"), delta)
        add_items_from_delta(open_risks, delta.get("risks_created"), delta)
        add_items_from_delta(decision_debt, delta.get("decision_debt_opened"), delta)

        for item in delta.get("blockers_opened", []):
            if isinstance(item, dict) and normalize_status(item.get("status")) == "BLOCKED":
                surface = item.get("surface")
                if surface in SURFACES:
                    blocked_surfaces.append(surface)

        if delta.get("humangate_required") is True:
            add_item_once(
                humangate_required_items,
                {
                    "summary": "HumanGate required by source delta",
                    "status": "BLOCKED",
                    "source_delta_id": delta_id,
                    "source_task_id": task_id,
                },
            )

        raw_forbidden = delta.get("forbidden_next_missions")
        if isinstance(raw_forbidden, list):
            forbidden_next_missions.extend(str(item) for item in raw_forbidden)

    next_best_mission = choose_next_best_mission(deltas, decision_debt)

    return {
        "record_type": "studio_state_snapshot",
        "contract_version": "V0",
        "generated_at": now_utc(),
        "source_delta_ids": source_delta_ids,
        "proven_surfaces": unique_strings(proven_surfaces),
        "blocked_surfaces": unique_strings(blocked_surfaces),
        "open_blockers": open_blockers,
        "open_risks": open_risks,
        "decision_debt": decision_debt,
        "humangate_required_items": humangate_required_items,
        "next_best_mission": next_best_mission,
        "forbidden_next_missions": unique_strings(forbidden_next_missions),
        "status_by_surface": merge_status_by_surface(deltas),
        "claim_posture": "NO_CLAIM_ALLOWED",
        "no_global_ready_verdict": True,
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


def validate_snapshot(snapshot: dict[str, Any], schema_path: Path) -> None:
    validate_payload(snapshot, schema_path, "StudioStateSnapshot")


def validate_payload(payload: dict[str, Any], schema_path: Path, label: str) -> None:
    validator = build_validator(schema_path)
    errors = sorted(validator.iter_errors(payload), key=lambda error: (list(error.absolute_path), error.message))
    if not errors:
        return

    first = errors[0]
    location = ".".join(str(part) for part in first.absolute_path) or "$"
    raise ValueError(f"{label} schema validation failed at {location}: {first.message}")


def render_json(payload: dict[str, Any], pretty: bool) -> str:
    if pretty:
        return json.dumps(payload, indent=2, sort_keys=True) + "\n"
    return json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n"


def main() -> int:
    args = parse_args()
    schema_path = Path(args.schema).resolve() if args.schema else DEFAULT_SCHEMA_PATH
    delta_schema_path = Path(args.delta_schema).resolve() if args.delta_schema else DEFAULT_DELTA_SCHEMA_PATH

    try:
        deltas: list[dict[str, Any]] = []
        for raw_path in args.delta:
            delta_path = Path(raw_path).resolve()
            raw_delta = load_json(delta_path)
            if not isinstance(raw_delta, dict):
                print(f"INPUT_VALIDATION_ERROR: delta root must be an object: {delta_path}", file=sys.stderr)
                return 1
            validate_payload(raw_delta, delta_schema_path, "StudioStateDelta")
            validate_delta_shape(raw_delta, delta_path)
            deltas.append(raw_delta)

        snapshot = aggregate_snapshot(deltas)
        validate_snapshot(snapshot, schema_path)
        sys.stdout.write(render_json(snapshot, args.pretty))
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
