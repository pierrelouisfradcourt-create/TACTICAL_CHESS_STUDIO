import argparse
import json
import sys
from fnmatch import fnmatch
from pathlib import Path
from typing import Any

try:
    import jsonschema
except ImportError:
    print("BLOCKED_MISSING_JSONSCHEMA")
    raise SystemExit(2)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMAS_ROOT = PROJECT_ROOT / "schemas"
EXECUTION_REPORT_SCHEMA = SCHEMAS_ROOT / "studiopilot_execution_report.schema.json"
TASK_PACKET_SCHEMA = SCHEMAS_ROOT / "studiopilot_task_packet.schema.json"
REVIEW_PACKET_SCHEMA = SCHEMAS_ROOT / "studiopilot_review_packet.schema.json"
RISK_ORDER = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "BLOCKING": 3, "UNKNOWN": 4}
OBVIOUS_RUNTIME_MARKERS = (
    "src/",
    "engine/",
    "search/",
    "neural/",
    "runtime/",
    "ml/",
    "uci/",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a dry-run StudioPilot ReviewPacket from a validated ExecutionReport."
    )
    parser.add_argument("execution_report_path", help="Path to a local ExecutionReport JSON file.")
    parser.add_argument("--task-packet", help="Optional path to a local TaskPacket JSON file.")
    parser.add_argument("--output", help="Optional output path for writing the ReviewPacket JSON.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    parser.add_argument("--review-id", help="Optional override for ReviewPacket review_id.")
    parser.add_argument("--source-pr", help="Optional override for ReviewPacket source_pr.")
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def build_validator(schema_path: Path) -> jsonschema.protocols.Validator:
    schema_obj = load_json(schema_path)
    validator_class = jsonschema.validators.validator_for(schema_obj)
    validator_class.check_schema(schema_obj)
    format_checker = getattr(validator_class, "FORMAT_CHECKER", None)
    if format_checker is None:
        return validator_class(schema_obj)
    return validator_class(schema_obj, format_checker=format_checker)


def validate_payload(payload: Any, validator: jsonschema.protocols.Validator, label: str) -> None:
    errors = sorted(validator.iter_errors(payload), key=lambda e: list(e.path))
    if not errors:
        return

    first = errors[0]
    where = "/".join(str(part) for part in first.path)
    location = where if where else "<root>"
    raise ValueError(f"{label} schema validation failed at {location}: {first.message}")


def max_risk(current: str, candidate: str) -> str:
    if RISK_ORDER[candidate] > RISK_ORDER[current]:
        return candidate
    return current


def is_obvious_runtime_path(path_value: str) -> bool:
    lowered = path_value.replace("\\", "/").lower()
    for marker in OBVIOUS_RUNTIME_MARKERS:
        if lowered.startswith(marker):
            return True
        if f"/{marker}" in lowered:
            return True
    return False


def matches_any_pattern(path_value: str, patterns: list[str]) -> bool:
    normalized = path_value.replace("\\", "/")
    return any(fnmatch(normalized, pattern.replace("\\", "/")) for pattern in patterns)


def build_review_packet(
    execution_report: dict[str, Any],
    task_packet: dict[str, Any] | None,
    review_id_override: str | None,
    source_pr_override: str | None,
) -> dict[str, Any]:
    architecture_risk = "LOW"
    runtime_risk = "LOW"
    evidence_risk = "LOW"
    claim_risk = "LOW"
    scope_risk = "LOW"
    recommendation = "SAFE_TO_READY"
    blocking_questions: list[str] = []

    scope_deviation = execution_report.get("scope_deviation")
    if scope_deviation == "BLOCKING":
        scope_risk = "BLOCKING"
        recommendation = "BLOCKED"
        blocking_questions.append("ExecutionReport declared BLOCKING scope deviation.")
    elif scope_deviation == "MAJOR":
        scope_risk = max_risk(scope_risk, "HIGH")
        recommendation = "REQUEST_CHANGES"
        blocking_questions.append("ExecutionReport declared MAJOR scope deviation.")
    elif scope_deviation == "MINOR":
        scope_risk = max_risk(scope_risk, "MEDIUM")

    claim_verdict = execution_report.get("claim_verdict")
    if claim_verdict == "HEALTH_ONLY":
        claim_risk = max_risk(claim_risk, "MEDIUM")
        blocking_questions.append("ExecutionReport claim_verdict escalated to HEALTH_ONLY.")
    elif claim_verdict == "EVIDENCE_ONLY":
        claim_risk = max_risk(claim_risk, "HIGH")
        blocking_questions.append("ExecutionReport claim_verdict escalated to EVIDENCE_ONLY.")

    changed_files = execution_report.get("changed_files", [])
    runtime_touches = sorted({item for item in changed_files if is_obvious_runtime_path(item)})
    if runtime_touches:
        runtime_risk = max_risk(runtime_risk, "HIGH")
        recommendation = "REQUEST_CHANGES" if recommendation != "BLOCKED" else recommendation
        blocking_questions.append(
            f"ExecutionReport changed obvious runtime paths: {', '.join(runtime_touches)}."
        )

    validation_results = execution_report.get("validation_results", [])
    if not validation_results:
        evidence_risk = max_risk(evidence_risk, "BLOCKING")
        recommendation = "BLOCKED"
        blocking_questions.append("ExecutionReport has no validation_results entries.")
    else:
        statuses = [str(item.get("status", "")).upper() for item in validation_results]
        if any(status == "FAIL" for status in statuses):
            evidence_risk = max_risk(evidence_risk, "BLOCKING")
            recommendation = "BLOCKED"
            blocking_questions.append("ExecutionReport validation_results contains FAIL status.")
        elif any(status in {"UNKNOWN", "SKIPPED"} for status in statuses):
            evidence_risk = max_risk(evidence_risk, "HIGH")
            recommendation = "REQUEST_CHANGES" if recommendation != "BLOCKED" else recommendation
            blocking_questions.append("ExecutionReport validation_results contains SKIPPED/UNKNOWN status.")

    if int(execution_report.get("tests_failed", 0)) > 0:
        evidence_risk = max_risk(evidence_risk, "HIGH")
        recommendation = "REQUEST_CHANGES" if recommendation != "BLOCKED" else recommendation
        blocking_questions.append("ExecutionReport reports failed tests.")

    if task_packet is not None:
        if execution_report.get("task_id") != task_packet.get("task_id"):
            scope_risk = max_risk(scope_risk, "HIGH")
            claim_risk = max_risk(claim_risk, "MEDIUM")
            recommendation = "REQUEST_CHANGES" if recommendation != "BLOCKED" else recommendation
            blocking_questions.append("TaskPacket task_id does not match ExecutionReport task_id.")

        allowed_paths = [str(item) for item in task_packet.get("allowed_paths", [])]
        forbidden_paths = [str(item) for item in task_packet.get("forbidden_paths", [])]

        out_of_scope_changes = sorted(
            {
                changed
                for changed in changed_files
                if allowed_paths and not matches_any_pattern(changed, allowed_paths)
            }
        )
        forbidden_changes = sorted(
            {changed for changed in changed_files if forbidden_paths and matches_any_pattern(changed, forbidden_paths)}
        )

        if out_of_scope_changes:
            scope_risk = max_risk(scope_risk, "HIGH")
            claim_risk = max_risk(claim_risk, "MEDIUM")
            recommendation = "REQUEST_CHANGES" if recommendation != "BLOCKED" else recommendation
            blocking_questions.append(
                f"ExecutionReport changed files outside TaskPacket allowed_paths: {', '.join(out_of_scope_changes)}."
            )

        if forbidden_changes:
            scope_risk = max_risk(scope_risk, "BLOCKING")
            claim_risk = max_risk(claim_risk, "HIGH")
            recommendation = "BLOCKED"
            blocking_questions.append(
                f"ExecutionReport changed files in TaskPacket forbidden_paths: {', '.join(forbidden_changes)}."
            )

    review_id = review_id_override or f"RVW-{execution_report['task_id']}"
    source_pr = source_pr_override or f"local://{execution_report['branch']}"

    # Dry-run review packets are always non-authoritative and require human gate action.
    human_action_required = True

    return {
        "schema_version": execution_report["schema_version"],
        "review_id": review_id,
        "source_pr": source_pr,
        "reviewer_type": "CODEX_REVIEW",
        "architecture_risk": architecture_risk,
        "runtime_risk": runtime_risk,
        "evidence_risk": evidence_risk,
        "claim_risk": claim_risk,
        "scope_risk": scope_risk,
        "blocking_questions": blocking_questions,
        "recommendation": recommendation,
        "human_action_required": human_action_required,
    }


def emit_json(payload: dict[str, Any], pretty: bool) -> str:
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

    try:
        execution_report_path = Path(args.execution_report_path).resolve()
        if not execution_report_path.exists():
            print(f"INPUT_VALIDATION_ERROR: missing execution report: {execution_report_path}", file=sys.stderr)
            return 1

        execution_report = load_json(execution_report_path)
        execution_validator = build_validator(EXECUTION_REPORT_SCHEMA)
        validate_payload(execution_report, execution_validator, "ExecutionReport")

        task_packet: dict[str, Any] | None = None
        if args.task_packet:
            task_packet_path = Path(args.task_packet).resolve()
            if not task_packet_path.exists():
                print(f"INPUT_VALIDATION_ERROR: missing task packet: {task_packet_path}", file=sys.stderr)
                return 1
            task_packet_obj = load_json(task_packet_path)
            task_validator = build_validator(TASK_PACKET_SCHEMA)
            validate_payload(task_packet_obj, task_validator, "TaskPacket")
            if not isinstance(task_packet_obj, dict):
                print("INPUT_VALIDATION_ERROR: task packet root must be an object", file=sys.stderr)
                return 1
            task_packet = task_packet_obj

        if not isinstance(execution_report, dict):
            print("INPUT_VALIDATION_ERROR: execution report root must be an object", file=sys.stderr)
            return 1

        review_packet = build_review_packet(
            execution_report=execution_report,
            task_packet=task_packet,
            review_id_override=args.review_id,
            source_pr_override=args.source_pr,
        )

        review_validator = build_validator(REVIEW_PACKET_SCHEMA)
        validate_payload(review_packet, review_validator, "ReviewPacket")

        rendered = emit_json(review_packet, args.pretty)
        if args.output:
            output_path = Path(args.output).resolve()
            write_output(output_path, rendered)
        else:
            sys.stdout.write(rendered)
        return 0
    except (json.JSONDecodeError, OSError, ValueError) as exc:
        print(f"INPUT_VALIDATION_ERROR: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover - defensive boundary
        print(f"INTERNAL_ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
