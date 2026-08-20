import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator
except ModuleNotFoundError:
    Draft202012Validator = None


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_FIXTURES_ROOT = (
    PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "integration_smoke"
)

INPUT_SCHEMA_VERSION = "studiopilot.control_plane_integration_input.v0"
SUMMARY_SCHEMA_VERSION = "studiopilot.control_plane_integration_summary.v0"
REPORT_SCHEMA_VERSION = "studiopilot.control_plane_integration_smoke_report.v0"

DEFAULT_CASES = (
    (
        "valid_integration_smoke_input_v0.json",
        "expected_integration_smoke_go_v0.json",
    ),
    (
        "blocked_infra_integration_smoke_input_v0.json",
        "expected_integration_smoke_blocked_infra_v0.json",
    ),
)

CLAIM_ORDER = {
    "NO_CLAIM_ALLOWED": 0,
    "HEALTH_ONLY": 1,
    "EVIDENCE_ONLY": 2,
}

FORBIDDEN_SURFACES = {
    "benchmark",
    "ml_training",
    "neural",
    "runtime",
    "search",
    "workflows",
}

COMMAND_PRIORITY = [
    "STOP_AUTOMATION",
    "READ_ONLY_ONLY",
    "PLAN_ONLY",
    "REVIEW_ONLY",
    "FREEZE_SCOPE",
    "BUILD_ALLOWED",
]

FREEZE_TO_SCOPE = {
    "FREEZE_RUNTIME": "RUNTIME",
    "FREEZE_SEARCH": "SEARCH",
    "FREEZE_NEURAL": "NEURAL",
    "FREEZE_ML": "ML",
    "FREEZE_DATASET": "DATASET",
    "FREEZE_CI": "CI",
    "FREEZE_GUARD": "CONTROL_PLANE",
    "FREEZE_CLAIMS": "CLAIMS",
    "FREEZE_AUTOMATION": "AUTOMATION",
}

MINIMAL_INPUT_SCHEMA = {
    "type": "object",
    "required": [
        "schema_version",
        "campaign_plan",
        "pr_queue",
        "human_commands",
        "pr_decision_packet",
        "local_review_pack_input",
    ],
    "properties": {
        "schema_version": {"const": INPUT_SCHEMA_VERSION},
        "campaign_plan": {"type": "object"},
        "pr_queue": {"type": "object"},
        "human_commands": {},
        "pr_decision_packet": {"type": "object"},
        "local_review_pack_input": {"type": "object"},
    },
    "additionalProperties": True,
}


class InputValidationError(Exception):
    pass


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run a deterministic local integration smoke across CampaignPlan, PRQueue, "
            "Human Command, PRDecisionPacket, and Local Review Pack inputs."
        )
    )
    parser.add_argument("--input", help="Optional integration smoke input JSON.")
    parser.add_argument("--expected", help="Optional expected integration summary JSON.")
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing integration smoke fixtures.",
    )
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
        raise ConfigError(f"json_file_missing: {normalize_path(path)}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"json_decode_error: {normalize_path(path)}: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"json_read_error: {normalize_path(path)}: {exc}") from exc


def emit_json(payload: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True))


def require_object(payload: Any, label: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise InputValidationError(f"{label}_must_be_object")
    return payload


def require_bool_false(payload: dict[str, Any], field: str, reasons: list[str]) -> None:
    if payload.get(field) is not False:
        reasons.append(f"POLICY: {field} must remain false")


def require_human_gate(payload: dict[str, Any], label: str, reasons: list[str]) -> None:
    if payload.get("human_gate_required") is not True:
        reasons.append(f"POLICY: {label} must preserve human_gate_required=true")


def schema_validation_errors(payload: dict[str, Any]) -> list[str]:
    if Draft202012Validator is None:
        return minimal_schema_validation_errors(payload)
    Draft202012Validator.check_schema(MINIMAL_INPUT_SCHEMA)
    validator = Draft202012Validator(MINIMAL_INPUT_SCHEMA)
    errors = sorted(
        validator.iter_errors(payload),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    return [format_validation_error(error) for error in errors]


def minimal_schema_validation_errors(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["$: input must be object"]

    for field in MINIMAL_INPUT_SCHEMA["required"]:
        if field not in payload:
            errors.append(f"$.{field}: required property missing")

    if payload.get("schema_version") != INPUT_SCHEMA_VERSION:
        errors.append(
            f"$.schema_version: expected {INPUT_SCHEMA_VERSION!r}, got {payload.get('schema_version')!r}"
        )

    object_fields = (
        "campaign_plan",
        "pr_queue",
        "pr_decision_packet",
        "local_review_pack_input",
    )
    for field in object_fields:
        if field in payload and not isinstance(payload[field], dict):
            errors.append(f"$.{field}: must be object")

    return errors


def format_validation_error(error: Any) -> str:
    location = ".".join(str(part) for part in error.absolute_path)
    if not location:
        location = "$"
    else:
        location = f"$.{location}"
    return f"{location}: {error.message}"


def command_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        commands = payload
    elif isinstance(payload, dict) and isinstance(payload.get("commands"), list):
        commands = payload["commands"]
    elif isinstance(payload, dict):
        commands = [payload]
    else:
        raise InputValidationError("human_commands_must_be_object_array_or_commands_object")

    if not commands:
        raise InputValidationError("human_commands_empty")
    for index, command in enumerate(commands):
        require_object(command, f"human_command_{index}")
    return commands


def highest_priority_command(command_types: set[str]) -> str:
    for command_type in COMMAND_PRIORITY:
        if command_type in command_types:
            return command_type
    return "BLOCKED"


def command_claim_scope(commands: list[dict[str, Any]]) -> str:
    scopes = [command.get("claim_scope") for command in commands]
    if any(scope not in CLAIM_ORDER for scope in scopes):
        return "NO_CLAIM_ALLOWED"
    return min(scopes, key=lambda scope: CLAIM_ORDER[scope])


def resolve_human_commands(commands: list[dict[str, Any]], target_scope: str) -> dict[str, Any]:
    reasons: list[str] = []
    command_types = {str(command.get("command_type", "")) for command in commands}
    allowed_actions: set[str] = set()
    blocked_scopes: set[str] = set()
    forbidden_actions: set[str] = set()

    for index, command in enumerate(commands):
        if command.get("schema_version") != "studiopilot.human_command.v0":
            reasons.append(f"BLOCKED: human command {index} has unsupported schema_version")
        if command.get("issued_by") != "HUMAN_FOUNDER":
            reasons.append(f"BLOCKED: human command {index} must be issued_by HUMAN_FOUNDER")
        if command.get("command_type") not in COMMAND_PRIORITY:
            reasons.append(f"BLOCKED: human command {index} has unsupported command_type")
        if command.get("claim_scope") not in CLAIM_ORDER:
            reasons.append(f"BLOCKED: human command {index} has unsupported claim_scope")
        if command.get("human_gate_required") is not True:
            reasons.append("POLICY: human command must preserve human_gate_required=true")
        if command.get("auto_merge_allowed") is not False:
            reasons.append("POLICY: human command auto_merge_allowed must remain false")
        if command.get("auto_ready_allowed") is not False:
            reasons.append("POLICY: human command auto_ready_allowed must remain false")

        allowed_actions.update(str(action) for action in command.get("allowed_actions", []))
        forbidden_actions.update(str(action) for action in command.get("forbidden_actions", []))
        for freeze_target in command.get("freeze_targets", []):
            blocked_scope = FREEZE_TO_SCOPE.get(str(freeze_target))
            if blocked_scope:
                blocked_scopes.add(blocked_scope)
            else:
                reasons.append(f"BLOCKED: human command {index} has unsupported freeze_target")

    decision = "GO"
    effective_command_type = highest_priority_command(command_types)
    if "STOP_AUTOMATION" in command_types:
        decision = "BLOCKED"
        blocked_scopes.add("AUTOMATION")
        forbidden_actions.add("automation_continue")
        reasons.append("STOP_AUTOMATION blocks automatic continuation")
    elif "READ_ONLY_ONLY" in command_types:
        decision = "HOLD" if "BUILD_ALLOWED" in command_types else "GO"
        allowed_actions = {action for action in allowed_actions if action.startswith("read")}
        forbidden_actions.add("write")
        forbidden_actions.add("patch")
        reasons.append("READ_ONLY_ONLY restricts the target to read-only work")

    if target_scope in blocked_scopes or "GLOBAL" in blocked_scopes:
        decision = "BLOCKED"
        reasons.append(f"Human command resolution blocks target scope {target_scope}")

    if any(reason.startswith("BLOCKED:") or reason.startswith("POLICY:") for reason in reasons):
        decision = "BLOCKED"

    return {
        "decision": decision,
        "effective_command_type": effective_command_type,
        "claim_scope": command_claim_scope(commands),
        "human_gate_required": all(command.get("human_gate_required") is True for command in commands),
        "auto_ready_allowed": False,
        "auto_merge_allowed": False,
        "blocked_scopes": sorted(blocked_scopes),
        "allowed_actions": sorted(allowed_actions),
        "forbidden_actions": sorted(forbidden_actions),
        "reasons": sorted(reasons),
    }


def selected_candidate(campaign_plan: dict[str, Any], pr_queue: dict[str, Any]) -> dict[str, Any]:
    if campaign_plan.get("campaign_id") != pr_queue.get("campaign_id"):
        raise InputValidationError("campaign_queue_id_mismatch")
    candidates = pr_queue.get("pr_candidates")
    if not isinstance(candidates, list):
        raise InputValidationError("pr_queue_candidates_must_be_array")
    for candidate in candidates:
        candidate_obj = require_object(candidate, "pr_candidate")
        if candidate_obj.get("status") == "READY_FOR_HANDOFF":
            return candidate_obj
    raise InputValidationError("no_ready_for_handoff_candidate")


def touched_forbidden_surface(touched_surfaces: dict[str, Any]) -> bool:
    return any(touched_surfaces.get(surface) is True for surface in FORBIDDEN_SURFACES)


def component_decision_from_pr_packet(packet: dict[str, Any]) -> str:
    touched_surfaces = require_object(packet.get("touched_surfaces"), "touched_surfaces")
    if packet.get("checks_status") == "BLOCKED_INFRA":
        return "BLOCKED_INFRA"
    if packet.get("software_verdict") == "BLOCKED_INFRA":
        return "BLOCKED_INFRA"
    if packet.get("forbidden_surface_touched") is True or touched_forbidden_surface(touched_surfaces):
        return "BLOCKED"
    if packet.get("checks_status") == "FAILED":
        return "BLOCKED"
    if packet.get("scope_status") == "VIOLATION":
        return "BLOCKED"
    if packet.get("software_verdict") == "BLOCKED":
        return "BLOCKED"
    if packet.get("checks_status") == "PENDING":
        return "HOLD"
    if packet.get("checks_status") != "SUCCESS":
        return "HOLD"
    if packet.get("scope_status") != "OK":
        return "HOLD"
    if packet.get("software_verdict") != "SAFE":
        return "HOLD"
    if packet.get("merge_verdict") == "MERGE_ALLOWED":
        return "GO_READY_AND_MERGE"
    if packet.get("merge_verdict") == "READY_ALLOWED":
        return "GO"
    return "HOLD"


def check_packet_recommended_decision(
    packet: dict[str, Any],
    label: str,
    computed_decision: str,
    reasons: list[str],
) -> None:
    declared_decision = packet.get("recommended_decision")
    if declared_decision != computed_decision:
        reasons.append(
            "POLICY: "
            f"{label} recommended_decision mismatch: expected "
            f"{computed_decision}, got {declared_decision}"
        )


def local_review_decision(local_review_pack_input: dict[str, Any]) -> str:
    if local_review_pack_input.get("schema_version") != "studiopilot.local_review_pack_input.v0":
        raise InputValidationError("local_review_pack_input_schema_version_mismatch")
    pr_packet = require_object(
        local_review_pack_input.get("pr_decision_packet"),
        "local_review_pack_input.pr_decision_packet",
    )
    return component_decision_from_pr_packet(pr_packet)


def campaign_decision(pr_queue: dict[str, Any]) -> str:
    queue_status = pr_queue.get("queue_status")
    verdict = pr_queue.get("verdict")
    if "BLOCKED_INFRA" in {queue_status, verdict}:
        return "BLOCKED_INFRA"
    if "BLOCKED" in {queue_status, verdict}:
        return "BLOCKED"
    if queue_status == "PENDING" or verdict == "PENDING":
        return "HOLD"
    if queue_status == "GO" and verdict == "GO":
        return "GO"
    return "HOLD"


def compact_decision(components: list[str], human_gate_required: bool) -> str:
    if "BLOCKED_INFRA" in components:
        return "BLOCKED_INFRA"
    if "BLOCKED" in components:
        return "BLOCKED"
    if "HOLD" in components or not human_gate_required:
        return "HOLD"
    if all(component in {"GO", "GO_READY_AND_MERGE"} for component in components):
        return "GO_READY_AND_MERGE"
    return "HOLD"


def allowed_claim_verdict(values: list[Any], reasons: list[str]) -> str:
    claim_values = [value for value in values if value is not None]
    if any(value not in CLAIM_ORDER for value in claim_values):
        reasons.append("POLICY: claim_verdict escalation refused")
        return "NO_CLAIM_ALLOWED"
    if not claim_values:
        return "NO_CLAIM_ALLOWED"
    return min(claim_values, key=lambda value: CLAIM_ORDER[value])


def taskpacket_summary(
    campaign_plan: dict[str, Any],
    pr_queue: dict[str, Any],
    candidate: dict[str, Any],
) -> dict[str, Any]:
    return {
        "schema_version": "studiopilot.next_taskpacket_draft.v0",
        "source_campaign_id": campaign_plan["campaign_id"],
        "source_queue_id": pr_queue["queue_id"],
        "selected_pr_candidate_id": candidate["pr_candidate_id"],
        "human_gate_required": candidate.get("human_gate_required") is True,
        "merge_allowed": candidate.get("merge_allowed") is True,
        "claim_scope": candidate.get("claim_scope", "NO_CLAIM_ALLOWED"),
    }


def build_summary(payload: dict[str, Any]) -> dict[str, Any]:
    validation_errors = schema_validation_errors(payload)
    if validation_errors:
        raise InputValidationError(f"schema_validation_failed: {validation_errors[0]}")

    campaign_plan = require_object(payload["campaign_plan"], "campaign_plan")
    pr_queue = require_object(payload["pr_queue"], "pr_queue")
    pr_packet = require_object(payload["pr_decision_packet"], "pr_decision_packet")
    local_review_input = require_object(
        payload["local_review_pack_input"], "local_review_pack_input"
    )
    candidate = selected_candidate(campaign_plan, pr_queue)
    taskpacket = taskpacket_summary(campaign_plan, pr_queue, candidate)

    reasons: list[str] = []
    require_human_gate(campaign_plan, "campaign_plan", reasons)
    require_human_gate(pr_queue, "pr_queue", reasons)
    require_human_gate(candidate, "selected_pr_candidate", reasons)
    require_human_gate(pr_packet, "pr_decision_packet", reasons)
    require_bool_false(pr_packet, "auto_ready_allowed", reasons)
    require_bool_false(pr_packet, "auto_merge_allowed", reasons)
    if candidate.get("merge_allowed") is not False:
        reasons.append("POLICY: selected PR candidate merge_allowed must remain false")

    local_pr_packet = require_object(
        local_review_input.get("pr_decision_packet"),
        "local_review_pack_input.pr_decision_packet",
    )
    require_human_gate(local_pr_packet, "local_review_pack_input.pr_decision_packet", reasons)
    require_bool_false(local_pr_packet, "auto_ready_allowed", reasons)
    require_bool_false(local_pr_packet, "auto_merge_allowed", reasons)

    target_scope = str(candidate.get("pr_type", "CONTROL_PLANE"))
    human_resolution = resolve_human_commands(command_list(payload["human_commands"]), target_scope)
    reasons.extend(human_resolution["reasons"])

    campaign_status = campaign_decision(pr_queue)
    pr_decision = component_decision_from_pr_packet(pr_packet)
    review_decision = local_review_decision(local_review_input)
    human_decision = human_resolution["decision"]
    check_packet_recommended_decision(
        pr_packet,
        "pr_decision_packet",
        pr_decision,
        reasons,
    )
    check_packet_recommended_decision(
        local_pr_packet,
        "local_review_pack_input.pr_decision_packet",
        review_decision,
        reasons,
    )

    claim_verdict = allowed_claim_verdict(
        [
            campaign_plan.get("verdicts", {}).get("claim_verdict"),
            candidate.get("claim_scope"),
            pr_packet.get("claim_verdict"),
            local_pr_packet.get("claim_verdict"),
            human_resolution["claim_scope"],
        ],
        reasons,
    )

    touched_surfaces = require_object(pr_packet.get("touched_surfaces"), "touched_surfaces")
    if touched_forbidden_surface(touched_surfaces):
        reasons.append("POLICY: forbidden runtime/search/neural/ML/benchmark/workflow surface touched")

    components = [campaign_status, human_decision, pr_decision, review_decision]
    if any(reason.startswith("POLICY:") for reason in reasons):
        components.append("BLOCKED")
    overall_decision = compact_decision(
        components,
        all(
            item is True
            for item in [
                campaign_plan.get("human_gate_required"),
                pr_queue.get("human_gate_required"),
                candidate.get("human_gate_required"),
                pr_packet.get("human_gate_required"),
                local_pr_packet.get("human_gate_required"),
                human_resolution["human_gate_required"],
            ]
        ),
    )

    if overall_decision == "BLOCKED_INFRA":
        reasons.append("Infrastructure must be fixed first; no automatic execution is allowed.")
    elif overall_decision == "HOLD":
        reasons.append("Pending or uncertain checks require waiting before merge.")
    elif overall_decision == "BLOCKED":
        reasons.append("A blocking control-plane condition must be resolved before merge.")
    else:
        reasons.append("All local control-plane components report GO under HumanGate.")

    summary_lines = [
        f"Campaign {campaign_plan['campaign_id']} uses queue {pr_queue['queue_id']}.",
        f"Selected {candidate['pr_candidate_id']} and drafted {taskpacket['schema_version']}.",
        f"Human command resolution: {human_decision}.",
        f"PRDecisionPacket decision: {pr_decision}.",
        f"Local Review Pack decision: {review_decision}.",
        f"Overall decision: {overall_decision}.",
        "HumanGate remains required; auto-ready and auto-merge remain false.",
        f"Claim verdict: {claim_verdict}.",
    ]

    return {
        "schema_version": SUMMARY_SCHEMA_VERSION,
        "integration_id": str(payload.get("integration_id", "integration.control_plane_smoke_v0")),
        "campaign_id": campaign_plan["campaign_id"],
        "queue_id": pr_queue["queue_id"],
        "selected_pr_candidate_id": candidate["pr_candidate_id"],
        "human_command_decision": human_decision,
        "pr_decision": pr_decision,
        "local_review_decision": review_decision,
        "overall_decision": overall_decision,
        "human_gate_required": True,
        "auto_ready_allowed": False,
        "auto_merge_allowed": False,
        "claim_verdict": claim_verdict,
        "touched_surfaces": touched_surfaces,
        "summary_lines": summary_lines[:8],
        "reasons": sorted(dict.fromkeys(reason for reason in reasons if reason)),
    }


def build_summary_from_path(input_path: Path) -> dict[str, Any]:
    return build_summary(require_object(load_json(input_path), "input"))


def compare_expected(actual: dict[str, Any], expected_path: Path) -> list[str]:
    expected = require_object(load_json(expected_path), "expected")
    if actual == expected:
        return []
    return [f"summary_mismatch: expected {normalize_path(expected_path)}"]


def run_default_smoke(fixtures_root: Path) -> dict[str, Any]:
    if not fixtures_root.exists():
        raise ConfigError(f"fixtures_root_missing: {normalize_path(fixtures_root)}")
    if not fixtures_root.is_dir():
        raise ConfigError(f"fixtures_root_not_directory: {normalize_path(fixtures_root)}")

    cases = []
    errors = []
    for input_name, expected_name in DEFAULT_CASES:
        input_path = fixtures_root / input_name
        expected_path = fixtures_root / expected_name
        actual = build_summary_from_path(input_path)
        case_errors = compare_expected(actual, expected_path)
        errors.extend(f"{input_name}: {error}" for error in case_errors)
        cases.append(
            {
                "input": input_name,
                "expected": expected_name,
                "overall_decision": actual["overall_decision"],
                "status": "PASS" if not case_errors else "FAIL",
            }
        )

    return {
        "schema_version": REPORT_SCHEMA_VERSION,
        "overall_status": "PASS" if not errors else "BLOCKED",
        "cases": cases,
        "errors": sorted(errors),
    }


def policy_blocked(summary: dict[str, Any]) -> bool:
    return any(str(reason).startswith("POLICY:") for reason in summary.get("reasons", []))


def main() -> int:
    args = parse_args()
    try:
        if args.input:
            summary = build_summary_from_path(resolve_path(args.input))
            errors = []
            if args.expected:
                errors = compare_expected(summary, resolve_path(args.expected))
            emit_json(summary, args.pretty)
            if errors:
                for error in errors:
                    print(error, file=sys.stderr)
                return 1
            return 1 if policy_blocked(summary) else 0

        report = run_default_smoke(resolve_path(args.fixtures_root))
        emit_json(report, args.pretty)
        return 0 if report["overall_status"] == "PASS" else 1
    except InputValidationError as exc:
        report = {
            "schema_version": REPORT_SCHEMA_VERSION,
            "overall_status": "BLOCKED",
            "cases": [],
            "errors": [str(exc)],
        }
        emit_json(report, args.pretty)
        return 1
    except ConfigError as exc:
        report = {
            "schema_version": REPORT_SCHEMA_VERSION,
            "overall_status": "BLOCKED",
            "cases": [],
            "errors": [str(exc)],
        }
        emit_json(report, args.pretty)
        return 2
    except Exception as exc:  # pragma: no cover - defensive hard stop
        report = {
            "schema_version": REPORT_SCHEMA_VERSION,
            "overall_status": "BLOCKED",
            "cases": [],
            "errors": [f"internal_error: {exc}"],
        }
        emit_json(report, args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
