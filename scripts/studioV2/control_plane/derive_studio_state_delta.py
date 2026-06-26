from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_state_delta.schema.json"

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

SURFACES = (
    "active_runtime_code",
    "tests",
    "tools_scripts",
    "artifacts_runtime_outputs",
    "canonical_docs",
    "roadmap_docs_only",
    "inference",
)

FORBIDDEN_NEXT_MISSIONS = (
    "runtime_activation",
    "agent_activation",
    "decision_controller_activation",
    "search_backend_activation",
    "neural_agent_activation",
    "dataset_generation",
    "dataset_reset",
    "training",
    "benchmark",
    "model_checkpoint_creation",
    "model_promotion",
    "latest_json_creation",
    "lab_runs_creation",
    "lab_puzzles_creation",
    "public_claim",
    "release_automation",
)

HUMANGATE_TERMS = (
    "activation",
    "activate",
    "agent",
    "benchmark",
    "claim",
    "dataset",
    "decisioncontroller",
    "latest.json",
    "model",
    "neuralagent",
    "promotion",
    "public claim",
    "runtime authority",
    "searchbackend",
    "training",
)

STUDIOPILOT_REQUIRED_FIELDS = (
    "schema_version",
    "task_id",
    "branch",
    "changed_files",
    "commands_run",
    "commands_skipped",
    "validation_results",
    "tests_passed",
    "tests_failed",
    "known_risks",
    "scope_deviation",
    "claim_verdict",
)

EXECUTOR_REQUIRED_FIELDS = (
    "record_type",
    "contract_version",
    "task_id",
    "commands_run",
    "validation",
    "risks",
    "status_by_surface",
    "final_verdicts",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Derive a read-only StudioStateDelta V0 JSON object from an "
            "executor_report_output or StudioPilot ExecutionReport."
        )
    )
    parser.add_argument("--report", required=True, help="Path to an execution report JSON file.")
    parser.add_argument(
        "--schema",
        default=None,
        help="Optional StudioStateDelta schema path. When provided, the derived delta is validated.",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional output path. Without this flag, JSON is written only to stdout.",
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


def make_surface_map(default: str = "UNKNOWN") -> dict[str, str]:
    return {surface: default for surface in SURFACES}


def surface_status_map_from(value: Any, default: str = "UNKNOWN") -> dict[str, str]:
    result = make_surface_map(default)
    if not isinstance(value, dict):
        return result
    for surface in SURFACES:
        if surface in value:
            result[surface] = normalize_status(value.get(surface), default=default)
    return result


def unique_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        text = str(value).strip()
        if not text or text in seen:
            continue
        seen.add(text)
        result.append(text)
    return result


def text_contains_humangate_term(value: Any) -> bool:
    lowered = json.dumps(value, sort_keys=True).lower() if isinstance(value, (dict, list)) else str(value).lower()
    return any(term in lowered for term in HUMANGATE_TERMS)


def delta_item(
    summary: str,
    status: str,
    *,
    source: str | None = None,
    surface: str | None = None,
    evidence: list[str] | None = None,
) -> dict[str, Any]:
    item: dict[str, Any] = {
        "summary": summary,
        "status": normalize_status(status, default="UNKNOWN"),
    }
    if source:
        item["source"] = source
    if surface in SURFACES:
        item["surface"] = surface
    if evidence:
        item["evidence"] = unique_strings(evidence)
    return item


def add_item_once(items: list[dict[str, Any]], item: dict[str, Any]) -> None:
    signature = (
        item.get("summary"),
        item.get("status"),
        item.get("surface"),
        item.get("source"),
    )
    for existing in items:
        existing_signature = (
            existing.get("summary"),
            existing.get("status"),
            existing.get("surface"),
            existing.get("source"),
        )
        if existing_signature == signature:
            return
    items.append(item)


def report_kind(report: dict[str, Any]) -> str:
    if report.get("record_type") == "studio_state_delta":
        return "studio_state_delta"
    if report.get("record_type") == "executor_report_output":
        return "executor_report_output"
    if "schema_version" in report and "validation_results" in report:
        return "studiopilot_execution_report"
    return "unknown_report"


def required_fields_for(kind: str) -> tuple[str, ...]:
    if kind == "executor_report_output":
        return EXECUTOR_REQUIRED_FIELDS
    if kind == "studiopilot_execution_report":
        return STUDIOPILOT_REQUIRED_FIELDS
    if kind == "unknown_report":
        return ("task_id",)
    return ()


def source_report_id(report: dict[str, Any], kind: str) -> str:
    for key in ("source_report_id", "report_id", "execution_report_id", "review_id"):
        value = report.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    task_id = report.get("task_id") or report.get("source_task_id")
    if isinstance(task_id, str) and task_id.strip():
        return f"{kind}:{task_id.strip()}"
    return "UNKNOWN"


def source_task_id(report: dict[str, Any]) -> str:
    for key in ("source_task_id", "task_id"):
        value = report.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return "UNKNOWN"


def final_verdict_map(report: dict[str, Any], key: str, default: str) -> dict[str, str]:
    final_verdicts = report.get("final_verdicts")
    if isinstance(final_verdicts, dict):
        nested = final_verdicts.get(key)
        if isinstance(nested, dict):
            return surface_status_map_from(nested, default=default)

    direct = report.get(key)
    if isinstance(direct, dict):
        return surface_status_map_from(direct, default=default)

    return make_surface_map(default)


def validation_entries(report: dict[str, Any]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []

    studio_entries = report.get("validation_results")
    if isinstance(studio_entries, list):
        for raw_entry in studio_entries:
            if isinstance(raw_entry, dict):
                entries.append(raw_entry)

    validation = report.get("validation")
    if isinstance(validation, dict):
        commands = validation.get("commands")
        if isinstance(commands, list):
            for raw_entry in commands:
                if isinstance(raw_entry, dict):
                    entries.append(
                        {
                            "name": raw_entry.get("command", "validation_command"),
                            "status": raw_entry.get("result_status", raw_entry.get("status", "UNKNOWN")),
                            "details": raw_entry.get("evidence", ""),
                        }
                    )

    return entries


def command_entries(report: dict[str, Any]) -> list[dict[str, Any]]:
    commands = report.get("commands_run")
    if not isinstance(commands, list):
        return []

    entries: list[dict[str, Any]] = []
    for raw_command in commands:
        if isinstance(raw_command, str):
            entries.append({"command": raw_command, "result_status": "UNKNOWN"})
        elif isinstance(raw_command, dict):
            entries.append(raw_command)
    return entries


def skipped_validation_entries(report: dict[str, Any]) -> list[dict[str, Any]]:
    skipped = report.get("skipped_validation")
    if isinstance(skipped, list):
        return [item for item in skipped if isinstance(item, dict)]
    return []


def command_skips(report: dict[str, Any]) -> list[str]:
    skipped = report.get("commands_skipped")
    if not isinstance(skipped, list):
        return []
    return [str(item) for item in skipped if str(item).strip()]


def string_items(raw_items: Any, primary_key: str) -> list[tuple[str, str]]:
    if not isinstance(raw_items, list):
        return []

    result: list[tuple[str, str]] = []
    for raw_item in raw_items:
        if isinstance(raw_item, str):
            result.append((raw_item, "UNKNOWN"))
        elif isinstance(raw_item, dict):
            summary = (
                raw_item.get(primary_key)
                or raw_item.get("summary")
                or raw_item.get("risk")
                or raw_item.get("reason")
                or raw_item.get("validation_item")
            )
            if summary:
                result.append((str(summary), normalize_status(raw_item.get("status"), default="UNKNOWN")))
    return result


def validation_status_to_delta_status(status: Any) -> str:
    normalized = str(status).upper()
    if normalized == "PASS":
        return "TESTED"
    if normalized == "FAIL":
        return "BLOCKED"
    if normalized in {"SKIPPED", "UNKNOWN"}:
        return "UNKNOWN"
    return normalize_status(status, default="UNKNOWN")


def has_justification(entry: dict[str, Any]) -> bool:
    for key in ("details", "reason", "evidence"):
        value = entry.get(key)
        if isinstance(value, str) and value.strip():
            return True
    return False


def derive_next_best_mission(report: dict[str, Any]) -> dict[str, Any] | None:
    source_key = None
    candidate = None
    for key in ("next_unblocked_patch", "recommended_next_patch"):
        if key in report:
            source_key = key
            candidate = report.get(key)
            break

    if candidate is None:
        return None

    if isinstance(candidate, str):
        text = candidate.strip()
        if not text:
            return None
        return {
            "goal": text,
            "reason": "Forwarded from source report recommendation.",
            "source": f"report.{source_key}",
        }

    if not isinstance(candidate, dict):
        return None

    goal = candidate.get("goal") or candidate.get("title") or candidate.get("summary")
    if not isinstance(goal, str) or not goal.strip():
        return None

    mission: dict[str, Any] = {
        "goal": goal.strip(),
        "reason": str(candidate.get("reason") or "Forwarded from source report recommendation."),
        "source": f"report.{source_key}",
    }
    for key in ("task_class",):
        value = candidate.get(key)
        if isinstance(value, str) and value.strip():
            mission[key] = value.strip()
    for key in ("target_files", "blocked_actions", "validation_plan"):
        value = candidate.get(key)
        if isinstance(value, list):
            mission[key] = unique_strings([str(item) for item in value])
    return mission


def surfaces_with_status(*maps: dict[str, str], status: str) -> list[str]:
    surfaces: list[str] = []
    for surface in SURFACES:
        if any(surface_map.get(surface) == status for surface_map in maps):
            surfaces.append(surface)
    return surfaces


def append_status_debt(
    decision_debt_opened: list[dict[str, Any]],
    status_by_surface: dict[str, str],
    software_verdict: dict[str, str],
    evidence_verdict: dict[str, str],
) -> None:
    for label, surface_map in (
        ("status_by_surface", status_by_surface),
        ("software_verdict", software_verdict),
        ("evidence_verdict", evidence_verdict),
    ):
        for surface, status in surface_map.items():
            if status == "UNKNOWN":
                add_item_once(
                    decision_debt_opened,
                    delta_item(
                        f"{label}.{surface} remains UNKNOWN",
                        "UNKNOWN",
                        source=label,
                        surface=surface,
                    ),
                )
            elif status in {"PASSIVE", "DOCUMENTED_ONLY"}:
                add_item_once(
                    decision_debt_opened,
                    delta_item(
                        f"{label}.{surface} is {status}, not active proof",
                        status,
                        source=label,
                        surface=surface,
                    ),
                )


def derive_delta(report: dict[str, Any]) -> dict[str, Any]:
    kind = report_kind(report)
    if kind == "studio_state_delta":
        return report

    required_fields = required_fields_for(kind)
    missing_required = [field for field in required_fields if field not in report]

    status_by_surface = surface_status_map_from(report.get("status_by_surface"), default="UNKNOWN")
    software_verdict = final_verdict_map(report, "software_verdict", "UNKNOWN")
    evidence_verdict = final_verdict_map(report, "evidence_verdict", "UNKNOWN")
    claim_verdict = final_verdict_map(report, "claim_verdict", "BLOCKED")

    evidence_added: list[dict[str, Any]] = []
    risks_reduced: list[dict[str, Any]] = []
    risks_created: list[dict[str, Any]] = []
    blockers_opened: list[dict[str, Any]] = []
    blockers_closed: list[dict[str, Any]] = []
    decision_debt_opened: list[dict[str, Any]] = []
    decision_debt_closed: list[dict[str, Any]] = []

    for field in missing_required:
        add_item_once(
            blockers_opened,
            delta_item(f"missing required source report field: {field}", "BLOCKED", source="required_fields"),
        )
        add_item_once(
            decision_debt_opened,
            delta_item(f"source report field could not be inspected: {field}", "UNKNOWN", source="required_fields"),
        )

    for entry in validation_entries(report):
        name = str(entry.get("name") or entry.get("command") or "validation")
        raw_status = entry.get("status", entry.get("result_status", "UNKNOWN"))
        delta_status = validation_status_to_delta_status(raw_status)
        if delta_status == "TESTED":
            add_item_once(
                evidence_added,
                delta_item(
                    f"validation passed: {name}",
                    "TESTED",
                    source="validation_results",
                    evidence=[str(entry.get("details", "")).strip()] if entry.get("details") else None,
                ),
            )
        elif str(raw_status).upper() == "FAIL":
            add_item_once(
                blockers_opened,
                delta_item(f"validation failed: {name}", "BLOCKED", source="validation_results"),
            )
        elif str(raw_status).upper() in {"SKIPPED", "UNKNOWN"}:
            debt = delta_item(
                f"validation {str(raw_status).upper()}: {name}",
                "UNKNOWN",
                source="validation_results",
            )
            add_item_once(decision_debt_opened, debt)
            if not has_justification(entry):
                add_item_once(
                    blockers_opened,
                    delta_item(
                        f"validation skipped or unknown without justification: {name}",
                        "BLOCKED",
                        source="validation_results",
                    ),
                )

    for command in command_entries(report):
        status = normalize_status(command.get("result_status"), default="UNKNOWN")
        if status == "TESTED":
            add_item_once(
                evidence_added,
                delta_item(
                    f"command evidence: {command.get('command', 'command')}",
                    "TESTED",
                    source="commands_run",
                    evidence=[str(command.get("evidence", "")).strip()] if command.get("evidence") else None,
                ),
            )

    for summary, status in string_items(report.get("risks_reduced"), "risk"):
        add_item_once(risks_reduced, delta_item(summary, status, source="risks_reduced"))

    for summary, status in string_items(report.get("known_risks"), "risk"):
        add_item_once(risks_created, delta_item(summary, status, source="known_risks"))
    for summary, status in string_items(report.get("risks"), "risk"):
        add_item_once(risks_created, delta_item(summary, status, source="risks"))

    for summary, status in string_items(report.get("blockers_closed"), "summary"):
        add_item_once(blockers_closed, delta_item(summary, status, source="blockers_closed"))
    for summary, status in string_items(report.get("decision_debt_closed"), "summary"):
        add_item_once(decision_debt_closed, delta_item(summary, status, source="decision_debt_closed"))

    for entry in skipped_validation_entries(report):
        summary = str(entry.get("validation_item") or entry.get("item") or "skipped validation")
        if has_justification(entry):
            add_item_once(
                decision_debt_opened,
                delta_item(f"validation skipped with justification: {summary}", "UNKNOWN", source="skipped_validation"),
            )
        else:
            add_item_once(
                blockers_opened,
                delta_item(f"validation skipped without justification: {summary}", "BLOCKED", source="skipped_validation"),
            )

    for skipped in command_skips(report):
        add_item_once(
            decision_debt_opened,
            delta_item(f"command skipped requires operator review: {skipped}", "UNKNOWN", source="commands_skipped"),
        )

    tests_failed = report.get("tests_failed")
    if isinstance(tests_failed, int) and tests_failed > 0:
        add_item_once(blockers_opened, delta_item(f"tests_failed reported as {tests_failed}", "BLOCKED", source="tests_failed"))

    scope_deviation = str(report.get("scope_deviation", "UNKNOWN"))
    if scope_deviation in {"MAJOR", "BLOCKING"}:
        add_item_once(
            blockers_opened,
            delta_item(f"scope_deviation is {scope_deviation}", "BLOCKED", source="scope_deviation"),
        )
    elif scope_deviation in {"MINOR", "UNKNOWN"}:
        add_item_once(
            decision_debt_opened,
            delta_item(f"scope_deviation is {scope_deviation}", "UNKNOWN", source="scope_deviation"),
        )

    source_claim_verdict = str(report.get("claim_verdict", "NO_CLAIM_ALLOWED"))
    if source_claim_verdict != "NO_CLAIM_ALLOWED":
        add_item_once(
            blockers_opened,
            delta_item(
                f"source report claim_verdict is {source_claim_verdict}; delta claim_posture remains NO_CLAIM_ALLOWED",
                "BLOCKED",
                source="claim_verdict",
            ),
        )

    proven_surfaces = surfaces_with_status(status_by_surface, evidence_verdict, status="TESTED")
    blocked_surfaces = surfaces_with_status(status_by_surface, software_verdict, evidence_verdict, status="BLOCKED")
    for surface in blocked_surfaces:
        add_item_once(
            blockers_opened,
            delta_item(f"{surface} has BLOCKED surface status", "BLOCKED", source="surface_verdicts", surface=surface),
        )

    append_status_debt(decision_debt_opened, status_by_surface, software_verdict, evidence_verdict)

    explicit_humangate_signal = any(
        text_contains_humangate_term(value)
        for value in (
            report.get("changed_files", []),
            report.get("commands_run", []),
            report.get("known_risks", []),
            report.get("risks", []),
            report.get("recommended_next_patch"),
            report.get("next_unblocked_patch"),
        )
    )
    unknown_status_present = any(
        "UNKNOWN" in surface_map.values()
        for surface_map in (status_by_surface, software_verdict, evidence_verdict)
    )
    humangate_required = bool(
        blockers_opened
        or unknown_status_present
        or explicit_humangate_signal
        or source_claim_verdict != "NO_CLAIM_ALLOWED"
    )

    return {
        "record_type": "studio_state_delta",
        "contract_version": "V0",
        "source_report_id": source_report_id(report, kind),
        "source_task_id": source_task_id(report),
        "generated_at": now_utc(),
        "evidence_added": evidence_added,
        "risks_reduced": risks_reduced,
        "risks_created": risks_created,
        "blockers_opened": blockers_opened,
        "blockers_closed": blockers_closed,
        "decision_debt_opened": decision_debt_opened,
        "decision_debt_closed": decision_debt_closed,
        "proven_surfaces": proven_surfaces,
        "blocked_surfaces": blocked_surfaces,
        "next_best_mission": derive_next_best_mission(report),
        "forbidden_next_missions": list(FORBIDDEN_NEXT_MISSIONS),
        "humangate_required": humangate_required,
        "status_by_surface": status_by_surface,
        "software_verdict": software_verdict,
        "evidence_verdict": evidence_verdict,
        "claim_verdict": claim_verdict,
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


def validate_delta(delta: dict[str, Any], schema_path: Path) -> None:
    validator = build_validator(schema_path)
    errors = sorted(validator.iter_errors(delta), key=lambda error: (list(error.absolute_path), error.message))
    if not errors:
        return

    first = errors[0]
    location = ".".join(str(part) for part in first.absolute_path) or "$"
    raise ValueError(f"StudioStateDelta schema validation failed at {location}: {first.message}")


def render_json(payload: dict[str, Any], pretty: bool) -> str:
    if pretty:
        return json.dumps(payload, indent=2, sort_keys=True) + "\n"
    return json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n"


def write_output(path: Path, content: str) -> None:
    if path.exists():
        raise FileExistsError(f"Refusing to overwrite existing file: {path}")
    if not path.parent.exists():
        raise FileNotFoundError(f"Parent directory does not exist: {path.parent}")
    path.write_text(content, encoding="utf-8")


def main() -> int:
    args = parse_args()
    report_path = Path(args.report).resolve()
    schema_path = Path(args.schema).resolve() if args.schema else DEFAULT_SCHEMA_PATH

    try:
        raw_report = load_json(report_path)
        if not isinstance(raw_report, dict):
            print("INPUT_VALIDATION_ERROR: report root must be an object", file=sys.stderr)
            return 1

        delta = derive_delta(raw_report)
        validate_delta(delta, schema_path)

        rendered = render_json(delta, args.pretty)
        if args.output:
            write_output(Path(args.output).resolve(), rendered)
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
