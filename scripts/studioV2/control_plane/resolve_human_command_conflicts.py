import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CLAIM_ORDER = {
    "NO_CLAIM_ALLOWED": 0,
    "HEALTH_ONLY": 1,
    "EVIDENCE_ONLY": 2,
}
COMMAND_PRIORITY = [
    "STOP_AUTOMATION",
    "READ_ONLY_ONLY",
    "PLAN_ONLY",
    "REVIEW_ONLY",
    "FREEZE_SCOPE",
    "BUILD_ALLOWED",
]
ALLOWED_COMMAND_TYPES = set(COMMAND_PRIORITY)
REQUIRED_FIELDS = {
    "schema_version",
    "command_id",
    "issued_by",
    "command_type",
    "target_scope",
    "freeze_targets",
    "allowed_actions",
    "forbidden_actions",
    "human_gate_required",
    "auto_merge_allowed",
    "auto_ready_allowed",
    "claim_scope",
    "expires_after_task",
    "reason",
}
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
SENSITIVE_BUILD_SCOPES = {"RUNTIME", "SEARCH", "NEURAL", "ML"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Resolve StudioPilot Human Command V0 conflicts with safer-command-wins rules."
    )
    parser.add_argument("--commands", required=True, help="JSON file containing one or more human commands.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print the JSON resolution.")
    return parser.parse_args()


def print_report(report: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    print(json.dumps(report, separators=(",", ":"), sort_keys=True))


def explicit_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def base_report() -> dict[str, Any]:
    return {
        "schema_version": "studiopilot.human_command_resolution.v0",
        "overall_decision": "BLOCKED",
        "effective_command_type": "BLOCKED",
        "blocked_scopes": [],
        "allowed_actions": [],
        "forbidden_actions": [],
        "reasons": [],
        "human_gate_required": True,
        "claim_scope": "NO_CLAIM_ALLOWED",
        "auto_merge_allowed": False,
        "auto_ready_allowed": False,
    }


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def command_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        commands = payload
    elif isinstance(payload, dict) and isinstance(payload.get("commands"), list):
        commands = payload["commands"]
    elif isinstance(payload, dict):
        commands = [payload]
    else:
        raise ValueError("commands_payload_must_be_object_array_or_commands_object")

    if not commands:
        raise ValueError("commands_payload_empty")
    for index, command in enumerate(commands):
        if not isinstance(command, dict):
            raise ValueError(f"command_not_object: index={index}")
    return commands


def sorted_strings(values: set[str]) -> list[str]:
    return sorted(value for value in values if value)


def most_restrictive_claim_scope(commands: list[dict[str, Any]]) -> str:
    scopes = [command.get("claim_scope") for command in commands]
    if any(scope not in CLAIM_ORDER for scope in scopes):
        return "NO_CLAIM_ALLOWED"
    return min(scopes, key=lambda scope: CLAIM_ORDER[scope])


def highest_priority_command(command_types: set[str]) -> str:
    for command_type in COMMAND_PRIORITY:
        if command_type in command_types:
            return command_type
    return "BLOCKED"


def scope_is_frozen(scope: str, blocked_scopes: set[str]) -> bool:
    return "GLOBAL" in blocked_scopes or scope in blocked_scopes


def resolve(commands: list[dict[str, Any]]) -> dict[str, Any]:
    report = base_report()
    reasons: list[str] = []
    command_types = {str(command.get("command_type", "")) for command in commands}
    target_scopes = {str(command.get("target_scope", "")) for command in commands}
    forbidden_actions: set[str] = set()
    allowed_actions: set[str] = set()
    blocked_scopes: set[str] = set()

    for index, command in enumerate(commands):
        missing_fields = sorted(REQUIRED_FIELDS.difference(command))
        if missing_fields:
            reasons.append(f"BLOCKED: command {index} missing required fields: {','.join(missing_fields)}")
        if command.get("schema_version") != "studiopilot.human_command.v0":
            reasons.append(f"BLOCKED: command {index} has unsupported schema_version")
        if command.get("issued_by") != "HUMAN_FOUNDER":
            reasons.append(f"BLOCKED: command {index} must be issued_by HUMAN_FOUNDER")
        if command.get("command_type") not in ALLOWED_COMMAND_TYPES:
            reasons.append(f"BLOCKED: command {index} has unsupported command_type")
        if command.get("claim_scope") not in CLAIM_ORDER:
            reasons.append(f"BLOCKED: command {index} has unsupported claim_scope")
        forbidden_actions.update(str(action) for action in command.get("forbidden_actions", []))
        allowed_actions.update(str(action) for action in command.get("allowed_actions", []))
        for freeze_target in command.get("freeze_targets", []):
            blocked_scope = FREEZE_TO_SCOPE.get(str(freeze_target))
            if blocked_scope:
                blocked_scopes.add(blocked_scope)
            else:
                reasons.append(f"BLOCKED: command {index} has unsupported freeze_target")

    report["claim_scope"] = most_restrictive_claim_scope(commands)
    report["human_gate_required"] = all(command.get("human_gate_required") is True for command in commands)
    report["auto_merge_allowed"] = False
    report["auto_ready_allowed"] = False

    if not report["human_gate_required"]:
        reasons.append("BLOCKED: every command must preserve human_gate_required=true")
    if any(command.get("auto_merge_allowed") is not False for command in commands):
        reasons.append("BLOCKED: auto_merge_allowed must remain false")
    if any(command.get("auto_ready_allowed") is not False for command in commands):
        reasons.append("BLOCKED: auto_ready_allowed must remain false")

    if "STOP_AUTOMATION" in command_types:
        blocked_scopes.add("AUTOMATION")
        allowed_actions.clear()
        forbidden_actions.add("automation_continue")
        reasons.append("STOP_AUTOMATION overrides every other command")
        report["overall_decision"] = "BLOCKED"
        report["effective_command_type"] = "STOP_AUTOMATION"
    elif "READ_ONLY_ONLY" in command_types:
        allowed_actions = {action for action in allowed_actions if action.startswith("read")}
        forbidden_actions.add("write")
        forbidden_actions.add("patch")
        reasons.append("READ_ONLY_ONLY overrides BUILD_ALLOWED")
        report["overall_decision"] = "HOLD" if "BUILD_ALLOWED" in command_types else "GO"
        report["effective_command_type"] = "READ_ONLY_ONLY"
    else:
        report["effective_command_type"] = highest_priority_command(command_types)
        report["overall_decision"] = "GO"

    if "BUILD_ALLOWED" in command_types:
        frozen_build_scopes = sorted(
            scope for scope in target_scopes if scope in SENSITIVE_BUILD_SCOPES and scope_is_frozen(scope, blocked_scopes)
        )
        if frozen_build_scopes:
            reasons.append(
                "BUILD_ALLOWED intersects frozen sensitive scope: " + ",".join(frozen_build_scopes)
            )
            report["overall_decision"] = "BLOCKED"
        elif any(scope_is_frozen(scope, blocked_scopes) for scope in target_scopes):
            reasons.append("BUILD_ALLOWED intersects a frozen scope and is held for human review")
            if report["overall_decision"] == "GO":
                report["overall_decision"] = "HOLD"

    if blocked_scopes:
        reasons.append("FREEZE_* blocks actions touching frozen scopes")

    if reasons and any(reason.startswith("BLOCKED:") for reason in reasons):
        report["overall_decision"] = "BLOCKED"
        if report["effective_command_type"] == "BLOCKED":
            report["effective_command_type"] = highest_priority_command(command_types)

    report["blocked_scopes"] = sorted_strings(blocked_scopes)
    report["allowed_actions"] = sorted_strings(allowed_actions)
    report["forbidden_actions"] = sorted_strings(forbidden_actions)
    report["reasons"] = sorted(reasons)
    return report


def main() -> int:
    args = parse_args()
    try:
        payload = load_json(explicit_path(args.commands))
        report = resolve(command_list(payload))
        print_report(report, args.pretty)
        return 0 if report["overall_decision"] in {"GO", "HOLD", "BLOCKED"} else 2
    except Exception as exc:
        report = base_report()
        report["reasons"] = [f"internal_or_config_error: {exc}"]
        print_report(report, args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
