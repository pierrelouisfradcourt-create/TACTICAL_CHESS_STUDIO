from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CURRENT_STATE_PATH = PROJECT_ROOT / ".studio_state" / "current_state.json"
DEFAULT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_current_state.schema.json"
DEFAULT_SNAPSHOT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_state_snapshot.schema.json"

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

SNAPSHOT_REQUIRED_FIELDS = (
    "record_type",
    "contract_version",
    "generated_at",
    "source_delta_ids",
    "proven_surfaces",
    "blocked_surfaces",
    "open_blockers",
    "open_risks",
    "decision_debt",
    "humangate_required_items",
    "next_best_mission",
    "forbidden_next_missions",
    "status_by_surface",
    "claim_posture",
    "no_global_ready_verdict",
)

CURRENT_REQUIRED_FIELDS = (
    "record_type",
    "contract_version",
    "updated_at",
    "source_snapshot_ids",
    "applied_delta_ids",
    "proven_surfaces",
    "blocked_surfaces",
    "open_blockers",
    "open_risks",
    "decision_debt",
    "humangate_required_items",
    "next_best_mission",
    "forbidden_next_missions",
    "status_by_surface",
    "state_history",
    "claim_posture",
    "no_global_ready_verdict",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Preview or explicitly write a StudioCurrentState V0 object from a "
            "StudioStateSnapshot V0. Default mode is stdout-only."
        )
    )
    parser.add_argument("--snapshot", required=True, help="Path to a StudioStateSnapshot JSON file.")
    parser.add_argument(
        "--current",
        default=None,
        help=(
            "Optional current state path. In preview mode it is read if present. "
            "In --write mode it is the write target; otherwise .studio_state/current_state.json is used."
        ),
    )
    parser.add_argument(
        "--schema",
        default=None,
        help="Optional StudioCurrentState schema path. When provided, the candidate state is validated.",
    )
    parser.add_argument(
        "--snapshot-schema",
        default=None,
        help="Optional StudioStateSnapshot schema path. Defaults to schemas/studio_state_snapshot.schema.json.",
    )
    parser.add_argument("--write", action="store_true", help="Explicitly write the candidate current state.")
    parser.add_argument(
        "--allow-overwrite",
        action="store_true",
        help="Allow --write to replace an existing current state path.",
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


def status_by_surface_from(payload: dict[str, Any]) -> dict[str, str]:
    raw_map = payload.get("status_by_surface")
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


def merge_status_by_surface(current: dict[str, Any] | None, snapshot: dict[str, Any]) -> dict[str, str]:
    snapshot_status = status_by_surface_from(snapshot)
    if current is None:
        return snapshot_status
    current_status = status_by_surface_from(current)
    return {
        surface: conservative_status([current_status[surface], snapshot_status[surface]])
        for surface in SURFACES
    }


def validate_snapshot_shape(snapshot: dict[str, Any], path: Path) -> None:
    missing = [field for field in SNAPSHOT_REQUIRED_FIELDS if field not in snapshot]
    if missing:
        raise ValueError(f"snapshot_missing_required_fields: {path}: {missing}")
    if snapshot.get("record_type") != "studio_state_snapshot":
        raise ValueError(f"snapshot_record_type_invalid: {path}")
    if snapshot.get("contract_version") != "V0":
        raise ValueError(f"snapshot_contract_version_invalid: {path}")
    if snapshot.get("claim_posture") != "NO_CLAIM_ALLOWED":
        raise ValueError(f"snapshot_claim_posture_invalid: {path}")
    if snapshot.get("no_global_ready_verdict") is not True:
        raise ValueError(f"snapshot_global_ready_verdict_invalid: {path}")


def validate_current_shape(current: dict[str, Any], path: Path) -> None:
    missing = [field for field in CURRENT_REQUIRED_FIELDS if field not in current]
    if missing:
        raise ValueError(f"current_missing_required_fields: {path}: {missing}")
    if current.get("record_type") != "studio_current_state":
        raise ValueError(f"current_record_type_invalid: {path}")
    if current.get("contract_version") != "V0":
        raise ValueError(f"current_contract_version_invalid: {path}")
    if current.get("claim_posture") != "NO_CLAIM_ALLOWED":
        raise ValueError(f"current_claim_posture_invalid: {path}")
    if current.get("no_global_ready_verdict") is not True:
        raise ValueError(f"current_global_ready_verdict_invalid: {path}")


def snapshot_id(snapshot: dict[str, Any]) -> str:
    delta_ids = unique_strings([str(item) for item in snapshot.get("source_delta_ids", [])])
    delta_fragment = ",".join(delta_ids) if delta_ids else "no-deltas"
    return f"studio_state_snapshot:{snapshot.get('generated_at', 'UNKNOWN')}:{delta_fragment}"


def item_key(item: dict[str, Any]) -> tuple[str, str, str, str, str]:
    return (
        str(item.get("source_snapshot_id", "")),
        str(item.get("source_delta_id", "")),
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


def copy_state_item(raw_item: dict[str, Any], source_snapshot_id: str) -> dict[str, Any]:
    item: dict[str, Any] = {
        "summary": str(raw_item.get("summary") or raw_item.get("risk") or raw_item.get("reason") or "state item"),
        "status": normalize_status(raw_item.get("status"), default="UNKNOWN"),
        "source_snapshot_id": source_snapshot_id,
    }
    for key in ("surface", "source", "source_delta_id", "source_task_id"):
        value = raw_item.get(key)
        if isinstance(value, str) and value.strip():
            item[key] = value.strip()
    evidence = raw_item.get("evidence")
    if isinstance(evidence, list):
        normalized_evidence = unique_strings([str(value) for value in evidence])
        if normalized_evidence:
            item["evidence"] = normalized_evidence
    return item


def copy_humangate_item(raw_item: dict[str, Any], source_snapshot_id: str) -> dict[str, Any]:
    item: dict[str, Any] = {
        "summary": str(raw_item.get("summary") or "HumanGate required by source snapshot"),
        "status": normalize_status(raw_item.get("status"), default="BLOCKED"),
        "source_snapshot_id": source_snapshot_id,
    }
    for key in ("source_delta_id", "source_task_id"):
        value = raw_item.get(key)
        if isinstance(value, str) and value.strip():
            item[key] = value.strip()
    return item


def merge_items(current_items: Any, snapshot_items: Any, source_snapshot_id: str) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    if isinstance(current_items, list):
        for raw_item in current_items:
            if isinstance(raw_item, dict):
                add_item_once(merged, raw_item)
    if isinstance(snapshot_items, list):
        for raw_item in snapshot_items:
            if isinstance(raw_item, dict):
                add_item_once(merged, copy_state_item(raw_item, source_snapshot_id))
    return merged


def merge_humangate_items(current_items: Any, snapshot_items: Any, source_snapshot_id: str) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    if isinstance(current_items, list):
        for raw_item in current_items:
            if isinstance(raw_item, dict):
                add_item_once(merged, raw_item)
    if isinstance(snapshot_items, list):
        for raw_item in snapshot_items:
            if isinstance(raw_item, dict):
                add_item_once(merged, copy_humangate_item(raw_item, source_snapshot_id))
    return merged


def proven_surfaces_from(current: dict[str, Any] | None, snapshot: dict[str, Any]) -> list[str]:
    surfaces: list[str] = []
    if current is not None:
        surfaces.extend(str(surface) for surface in current.get("proven_surfaces", []))
    snapshot_status = status_by_surface_from(snapshot)
    for surface in snapshot.get("proven_surfaces", []):
        if surface in SURFACES and snapshot_status.get(surface) == "TESTED":
            surfaces.append(surface)
    return unique_strings(surfaces)


def blocked_surfaces_from(current: dict[str, Any] | None, snapshot: dict[str, Any]) -> list[str]:
    surfaces: list[str] = []
    if current is not None:
        surfaces.extend(str(surface) for surface in current.get("blocked_surfaces", []))
    surfaces.extend(str(surface) for surface in snapshot.get("blocked_surfaces", []))
    snapshot_status = status_by_surface_from(snapshot)
    for surface, status in snapshot_status.items():
        if status == "BLOCKED":
            surfaces.append(surface)
    return unique_strings([surface for surface in surfaces if surface in SURFACES])


def choose_next_best_mission(current: dict[str, Any] | None, snapshot: dict[str, Any], decision_debt: list[dict[str, Any]], source_snapshot_id: str) -> dict[str, Any] | None:
    current_mission = current.get("next_best_mission") if current else None
    snapshot_mission = snapshot.get("next_best_mission")
    if isinstance(current_mission, dict) and isinstance(snapshot_mission, dict) and current_mission != snapshot_mission:
        add_item_once(
            decision_debt,
            {
                "summary": "current and snapshot next_best_mission differ; HumanGate selection required",
                "status": "UNKNOWN",
                "source": "next_best_mission",
                "source_snapshot_id": source_snapshot_id,
            },
        )
        return current_mission
    if isinstance(snapshot_mission, dict):
        return snapshot_mission
    if isinstance(current_mission, dict):
        return current_mission
    return None


def build_state_history(current: dict[str, Any] | None, snapshot: dict[str, Any], source_snapshot_id: str, applied_at: str, explicit_write: bool) -> list[dict[str, Any]]:
    history: list[dict[str, Any]] = []
    if current is not None and isinstance(current.get("state_history"), list):
        history.extend(item for item in current["state_history"] if isinstance(item, dict))
    history.append(
        {
            "source_snapshot_id": source_snapshot_id,
            "source_snapshot_generated_at": str(snapshot["generated_at"]),
            "applied_at": applied_at,
            "applied_delta_ids": unique_strings([str(item) for item in snapshot.get("source_delta_ids", [])]),
            "mode": "EXPLICIT_WRITE" if explicit_write else "DRY_RUN_PREVIEW",
        }
    )
    return history


def build_current_state(snapshot: dict[str, Any], current: dict[str, Any] | None, explicit_write: bool) -> dict[str, Any]:
    applied_at = now_utc()
    source_snapshot_id = snapshot_id(snapshot)
    source_delta_ids = unique_strings([str(item) for item in snapshot.get("source_delta_ids", [])])

    current_snapshot_ids = []
    current_delta_ids = []
    if current is not None:
        current_snapshot_ids.extend(str(item) for item in current.get("source_snapshot_ids", []))
        current_delta_ids.extend(str(item) for item in current.get("applied_delta_ids", []))

    open_blockers = merge_items(current.get("open_blockers") if current else None, snapshot.get("open_blockers"), source_snapshot_id)
    open_risks = merge_items(current.get("open_risks") if current else None, snapshot.get("open_risks"), source_snapshot_id)
    decision_debt = merge_items(current.get("decision_debt") if current else None, snapshot.get("decision_debt"), source_snapshot_id)

    return {
        "record_type": "studio_current_state",
        "contract_version": "V0",
        "updated_at": applied_at,
        "source_snapshot_ids": unique_strings([*current_snapshot_ids, source_snapshot_id]),
        "applied_delta_ids": unique_strings([*current_delta_ids, *source_delta_ids]),
        "proven_surfaces": proven_surfaces_from(current, snapshot),
        "blocked_surfaces": blocked_surfaces_from(current, snapshot),
        "open_blockers": open_blockers,
        "open_risks": open_risks,
        "decision_debt": decision_debt,
        "humangate_required_items": merge_humangate_items(
            current.get("humangate_required_items") if current else None,
            snapshot.get("humangate_required_items"),
            source_snapshot_id,
        ),
        "next_best_mission": choose_next_best_mission(current, snapshot, decision_debt, source_snapshot_id),
        "forbidden_next_missions": unique_strings(
            [
                *(str(item) for item in (current.get("forbidden_next_missions", []) if current else [])),
                *(str(item) for item in snapshot.get("forbidden_next_missions", [])),
            ]
        ),
        "status_by_surface": merge_status_by_surface(current, snapshot),
        "state_history": build_state_history(current, snapshot, source_snapshot_id, applied_at, explicit_write),
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


def validate_current_state(current_state: dict[str, Any], schema_path: Path) -> None:
    validate_payload(current_state, schema_path, "StudioCurrentState")


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


def write_current_state(path: Path, content: str, allow_overwrite: bool) -> None:
    if path.exists() and not allow_overwrite:
        raise FileExistsError(f"Refusing to overwrite existing current state without --allow-overwrite: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f"{path.name}.tmp")
    if temp_path.exists():
        raise FileExistsError(f"Refusing to overwrite existing temp file: {temp_path}")
    temp_path.write_text(content, encoding="utf-8")
    temp_path.replace(path)


def main() -> int:
    args = parse_args()
    snapshot_path = Path(args.snapshot).resolve()
    current_path = Path(args.current).resolve() if args.current else None
    schema_path = Path(args.schema).resolve() if args.schema else DEFAULT_SCHEMA_PATH
    snapshot_schema_path = (
        Path(args.snapshot_schema).resolve() if args.snapshot_schema else DEFAULT_SNAPSHOT_SCHEMA_PATH
    )

    try:
        raw_snapshot = load_json(snapshot_path)
        if not isinstance(raw_snapshot, dict):
            print("INPUT_VALIDATION_ERROR: snapshot root must be an object", file=sys.stderr)
            return 1
        validate_payload(raw_snapshot, snapshot_schema_path, "StudioStateSnapshot")
        validate_snapshot_shape(raw_snapshot, snapshot_path)

        current_state: dict[str, Any] | None = None
        if current_path and current_path.exists():
            raw_current = load_json(current_path)
            if not isinstance(raw_current, dict):
                print("INPUT_VALIDATION_ERROR: current root must be an object", file=sys.stderr)
                return 1
            validate_payload(raw_current, schema_path, "StudioCurrentState")
            validate_current_shape(raw_current, current_path)
            current_state = raw_current
        elif current_path and not args.write:
            print(f"INPUT_VALIDATION_ERROR: current state path does not exist: {current_path}", file=sys.stderr)
            return 1

        candidate = build_current_state(raw_snapshot, current_state, explicit_write=args.write)
        validate_current_state(candidate, schema_path)
        rendered = render_json(candidate, args.pretty)

        if args.write:
            target_path = current_path or DEFAULT_CURRENT_STATE_PATH
            write_current_state(target_path, rendered, args.allow_overwrite)
        else:
            sys.stdout.write(rendered)
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
