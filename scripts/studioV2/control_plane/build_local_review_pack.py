import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator
except ModuleNotFoundError:
    print("BLOCKED_MISSING_JSONSCHEMA", file=sys.stderr)
    raise SystemExit(2)


PROJECT_ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studiopilot_local_review_pack.schema.json"
INPUT_SCHEMA_VERSION = "studiopilot.local_review_pack_input.v0"
PACK_SCHEMA_VERSION = "studiopilot.local_review_pack.v0"

SECTION_SCHEMA_VERSIONS = {
    "execution_report": "studiopilot.execution_report.v0",
    "review_packet": "studiopilot.review_packet.v0",
    "human_decision": "studiopilot.human_decision.v0",
    "pr_decision_packet": "studiopilot.pr_decision_packet.v0",
}

ALLOWED_CLAIM_VERDICTS = {
    "NO_CLAIM_ALLOWED",
    "HEALTH_ONLY",
    "EVIDENCE_ONLY",
}

FORBIDDEN_SURFACES = {
    "workflows",
    "runtime",
    "search",
    "neural",
    "ml_training",
    "benchmark",
}


class InputValidationError(Exception):
    pass


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a compact local review pack from local control-plane inputs."
    )
    parser.add_argument("--input", required=True, help="Path to a local review input JSON file.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def normalize_path(path: Path) -> str:
    try:
        relative = path.resolve().relative_to(PROJECT_ROOT.resolve())
        return str(relative).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def resolve_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise InputValidationError(f"input_missing: {normalize_path(path)}") from exc
    except json.JSONDecodeError as exc:
        raise InputValidationError(f"json_decode_error: {normalize_path(path)}: {exc}") from exc
    except OSError as exc:
        raise InputValidationError(f"json_read_error: {normalize_path(path)}: {exc}") from exc


def emit_json(payload: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True))


def schema_validation_errors(payload: dict[str, Any]) -> list[str]:
    schema_obj = load_json(SCHEMA_PATH)
    if not isinstance(schema_obj, dict):
        raise ConfigError(f"schema_not_object: {normalize_path(SCHEMA_PATH)}")
    Draft202012Validator.check_schema(schema_obj)
    validator = Draft202012Validator(schema_obj)
    errors = sorted(
        validator.iter_errors(payload),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    return [format_validation_error(error) for error in errors]


def format_validation_error(error: Any) -> str:
    location = ".".join(str(part) for part in error.absolute_path)
    if not location:
        location = "$"
    else:
        location = f"$.{location}"
    return f"{location}: {error.message}"


def require_object(payload: Any, label: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise InputValidationError(f"{label}_must_be_object")
    return payload


def section_status(section: Any, present_value: str, missing_value: str) -> str:
    if section is None:
        return missing_value
    return present_value


def validate_schema_versions(payload: dict[str, Any]) -> None:
    if payload.get("schema_version") != INPUT_SCHEMA_VERSION:
        raise InputValidationError("input_schema_version_mismatch")
    for section_name, expected in SECTION_SCHEMA_VERSIONS.items():
        section = payload.get(section_name)
        if section is None:
            continue
        require_object(section, section_name)
        actual = section.get("schema_version")
        if actual != expected:
            raise InputValidationError(
                f"{section_name}_schema_version_mismatch: expected {expected}, got {actual}"
            )


def validate_safety_invariants(payload: dict[str, Any]) -> None:
    pr_packet = require_object(payload.get("pr_decision_packet"), "pr_decision_packet")
    human_decision = payload.get("human_decision")
    if human_decision is not None:
        require_object(human_decision, "human_decision")

    if pr_packet.get("human_gate_required") is not True:
        raise InputValidationError("human_gate_required_must_be_true")
    if pr_packet.get("auto_merge_allowed") is True:
        raise InputValidationError("auto_merge_allowed_must_be_false")
    if pr_packet.get("auto_ready_allowed") is True:
        raise InputValidationError("auto_ready_allowed_must_be_false")
    if pr_packet.get("auto_merge_allowed") is not False:
        raise InputValidationError("auto_merge_allowed_must_be_false")
    if pr_packet.get("auto_ready_allowed") is not False:
        raise InputValidationError("auto_ready_allowed_must_be_false")

    claim_verdict = pr_packet.get("claim_verdict")
    if claim_verdict not in ALLOWED_CLAIM_VERDICTS:
        raise InputValidationError("claim_verdict_escalation_refused")

    if human_decision is not None:
        claim_decision = human_decision.get("claim_decision")
        if claim_decision == "NO_CLAIM":
            return
        if claim_decision not in {"HEALTH_ONLY", "EVIDENCE_ONLY"}:
            raise InputValidationError("human_claim_decision_escalation_refused")


def touched_forbidden_surface(touched_surfaces: dict[str, Any]) -> bool:
    return any(touched_surfaces.get(surface) is True for surface in FORBIDDEN_SURFACES)


def computed_decision(pr_packet: dict[str, Any]) -> str:
    checks_status = pr_packet["checks_status"]
    scope_status = pr_packet["scope_status"]
    software_verdict = pr_packet["software_verdict"]
    merge_verdict = pr_packet.get("merge_verdict")
    touched_surfaces = require_object(pr_packet.get("touched_surfaces"), "touched_surfaces")
    forbidden_surface_touched = (
        pr_packet.get("forbidden_surface_touched") is True
        or touched_forbidden_surface(touched_surfaces)
    )

    if checks_status == "BLOCKED_INFRA" or software_verdict == "BLOCKED_INFRA":
        return "BLOCKED_INFRA"
    if checks_status == "PENDING":
        return "HOLD"
    if checks_status == "FAILED":
        return "BLOCKED"
    if scope_status == "VIOLATION" or forbidden_surface_touched:
        return "BLOCKED"
    if checks_status != "SUCCESS":
        return "HOLD"
    if scope_status != "OK":
        return "HOLD"
    if software_verdict == "BLOCKED":
        return "BLOCKED"
    if software_verdict != "SAFE":
        return "HOLD"
    if pr_packet["claim_verdict"] != "NO_CLAIM_ALLOWED":
        return "HOLD"
    if merge_verdict == "MERGE_ALLOWED":
        return "GO_READY_AND_MERGE"
    if merge_verdict == "READY_ALLOWED":
        return "GO"
    return "HOLD"


def next_action_for_decision(decision: str) -> str:
    if decision == "GO_READY_AND_MERGE":
        return "Human founder may decide whether to ready and merge after confirming required checks."
    if decision == "GO":
        return "Human founder may decide whether to ready after confirming required checks."
    if decision == "HOLD":
        return "Wait for checks or resolve non-blocking uncertainty before merge."
    if decision == "BLOCKED_INFRA":
        return "Fix infra before merge."
    return "Resolve blockers before merge."


def collect_risks(payload: dict[str, Any], decision: str) -> list[str]:
    risks: list[str] = []
    execution_report = payload.get("execution_report")
    review_packet = payload.get("review_packet")
    pr_packet = require_object(payload.get("pr_decision_packet"), "pr_decision_packet")

    if isinstance(execution_report, dict):
        risks.extend(str(item) for item in execution_report.get("known_risks", []))
        if execution_report.get("scope_deviation") not in {None, "NONE"}:
            risks.append(f"execution_scope_deviation: {execution_report.get('scope_deviation')}")
    if isinstance(review_packet, dict):
        risks.extend(str(item) for item in review_packet.get("blocking_questions", []))
        for field in (
            "architecture_risk",
            "runtime_risk",
            "evidence_risk",
            "claim_risk",
            "scope_risk",
        ):
            value = review_packet.get(field)
            if value in {"HIGH", "BLOCKING", "UNKNOWN"}:
                risks.append(f"{field}: {value}")
    if decision in {"HOLD", "BLOCKED", "BLOCKED_INFRA"}:
        risks.extend(str(item) for item in pr_packet.get("reasons", []))

    return sorted(dict.fromkeys(item for item in risks if item))


def build_summary_lines(
    payload: dict[str, Any],
    decision: str,
    execution_status: str,
    review_status: str,
    human_status: str,
) -> list[str]:
    pr_packet = require_object(payload.get("pr_decision_packet"), "pr_decision_packet")
    lines = [
        f"PR {pr_packet['pr_number']} at {pr_packet['head_sha']} summarized from local control-plane inputs.",
        f"ExecutionReport {execution_status}; ReviewPacket {review_status}; HumanDecision {human_status}.",
        f"Checks {pr_packet['checks_status']}; scope {pr_packet['scope_status']}; software {pr_packet['software_verdict']}.",
        f"Claim verdict {pr_packet['claim_verdict']}; HumanGate required.",
        f"Recommendation {decision}.",
    ]
    if decision == "HOLD":
        lines.append("Pending or uncertain checks/scope require waiting before merge.")
    elif decision == "BLOCKED_INFRA":
        lines.append("Infrastructure must be fixed before merge.")
    elif decision == "BLOCKED":
        lines.append("A blocking status must be resolved before merge.")
    return lines[:8]


def build_pack(payload: dict[str, Any]) -> dict[str, Any]:
    validate_schema_versions(payload)
    validate_safety_invariants(payload)

    pr_packet = require_object(payload.get("pr_decision_packet"), "pr_decision_packet")
    touched_surfaces = require_object(pr_packet.get("touched_surfaces"), "touched_surfaces")
    decision = computed_decision(pr_packet)
    expected_decision = pr_packet.get("recommended_decision")
    if expected_decision != decision:
        raise InputValidationError(
            f"recommended_decision_mismatch: expected {decision}, got {expected_decision}"
        )

    execution_status = section_status(payload.get("execution_report"), "PRESENT", "MISSING")
    review_status = section_status(payload.get("review_packet"), "PRESENT", "MISSING")
    human_status = section_status(payload.get("human_decision"), "PRESENT", "MISSING")

    pack = {
        "schema_version": PACK_SCHEMA_VERSION,
        "pack_id": f"LRP-{pr_packet['pr_number']}-{pr_packet['head_sha'][:12]}",
        "source_pr_number": pr_packet["pr_number"],
        "source_head_sha": pr_packet["head_sha"],
        "execution_report_status": execution_status,
        "review_packet_status": review_status,
        "human_decision_status": human_status,
        "pr_decision_packet_status": "PRESENT",
        "scope_status": pr_packet["scope_status"],
        "checks_status": pr_packet["checks_status"],
        "software_verdict": pr_packet["software_verdict"],
        "evidence_verdict": pr_packet["evidence_verdict"],
        "claim_verdict": pr_packet["claim_verdict"],
        "recommended_decision": decision,
        "next_action": next_action_for_decision(decision),
        "human_gate_required": True,
        "auto_ready_allowed": False,
        "auto_merge_allowed": False,
        "touched_surfaces": touched_surfaces,
        "risks": collect_risks(payload, decision),
        "summary_lines": build_summary_lines(
            payload,
            decision,
            execution_status,
            review_status,
            human_status,
        ),
    }

    validation_errors = schema_validation_errors(pack)
    if validation_errors:
        raise ConfigError(f"output_schema_validation_failed: {validation_errors[0]}")
    return pack


def load_and_build_pack(input_path: Path) -> dict[str, Any]:
    payload = load_json(input_path)
    return build_pack(require_object(payload, "input"))


def main() -> int:
    args = parse_args()
    try:
        pack = load_and_build_pack(resolve_path(args.input))
        emit_json(pack, args.pretty)
        if pack["recommended_decision"] in {"BLOCKED", "BLOCKED_INFRA"}:
            return 1
        return 0
    except InputValidationError as exc:
        print(f"INPUT_VALIDATION_ERROR: {exc}", file=sys.stderr)
        return 1
    except ConfigError as exc:
        print(f"CONFIG_ERROR: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # pragma: no cover - defensive boundary
        print(f"INTERNAL_ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
