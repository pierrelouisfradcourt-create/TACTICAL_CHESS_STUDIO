import argparse
import json
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMAS_ROOT = PROJECT_ROOT / "schemas"
CAMPAIGN_PLAN_SCHEMA = SCHEMAS_ROOT / "studiopilot_campaign_plan.schema.json"
PR_QUEUE_SCHEMA = SCHEMAS_ROOT / "studiopilot_pr_queue.schema.json"

CAMPAIGN_PLAN_VERSION = "studiopilot.campaign_plan.v0"
PR_QUEUE_VERSION = "studiopilot.pr_queue.v0"
NEXT_TASKPACKET_VERSION = "studiopilot.next_taskpacket_draft.v0"

BLOCKED_QUEUE_VERDICTS = {"BLOCKED", "BLOCKED_INFRA"}
DEPENDENCY_SATISFIED_STATUSES = {"MERGED"}


class ConfigError(Exception):
    pass


class DecisionBlocked(Exception):
    def __init__(self, code: str, reason: str) -> None:
        super().__init__(reason)
        self.code = code
        self.reason = reason


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build a local dry-run TaskPacket-like draft from a CampaignPlan and PRQueue. "
            "This script reads JSON and writes only to stdout."
        )
    )
    parser.add_argument("--campaign-plan", required=True, help="CampaignPlan JSON path.")
    parser.add_argument("--pr-queue", required=True, help="PRQueue JSON path.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def emit_json(payload: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True))


def explicit_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"json_file_missing: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"json_decode_error: {path}: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"json_read_error: {path}: {exc}") from exc


def import_validator() -> Any:
    try:
        from jsonschema import Draft202012Validator
    except ModuleNotFoundError as exc:
        raise ConfigError("BLOCKED_MISSING_JSONSCHEMA") from exc
    return Draft202012Validator


def load_validator(schema_path: Path, draft_validator: Any) -> Any:
    schema_obj = load_json(schema_path)
    if not isinstance(schema_obj, dict):
        raise ConfigError(f"schema_not_object: {schema_path}")
    draft_validator.check_schema(schema_obj)
    return draft_validator(schema_obj)


def format_validation_error(error: Any) -> str:
    location = ".".join(str(part) for part in error.absolute_path)
    if not location:
        return f"$: {error.message}"
    return f"$.{location}: {error.message}"


def validate_payload(payload: dict[str, Any], validator: Any, label: str) -> None:
    errors = sorted(
        validator.iter_errors(payload),
        key=lambda error: (list(error.absolute_path), error.message),
    )
    if errors:
        raise DecisionBlocked("SCHEMA_VALIDATION_FAILED", f"{label}: {format_validation_error(errors[0])}")


def extract_payload(raw: Any, wrapper_key: str, expected_version: str, label: str) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ConfigError(f"{label}_root_not_object")

    if raw.get("schema_version") == expected_version:
        return raw

    nested = raw.get(wrapper_key)
    if isinstance(nested, dict):
        if nested.get("schema_version") != expected_version:
            raise DecisionBlocked(
                "SCHEMA_VERSION_INVALID",
                f"{label}: expected {expected_version}, got {nested.get('schema_version')!r}",
            )
        return nested

    raise DecisionBlocked(
        "SCHEMA_VERSION_INVALID",
        f"{label}: expected direct {expected_version} object or embedded {wrapper_key}",
    )


def load_campaign_and_queue(campaign_plan_path: str, pr_queue_path: str) -> tuple[dict[str, Any], dict[str, Any]]:
    campaign_raw = load_json(explicit_path(campaign_plan_path))
    queue_raw = load_json(explicit_path(pr_queue_path))
    campaign_plan = extract_payload(
        campaign_raw,
        "campaign_plan",
        CAMPAIGN_PLAN_VERSION,
        "CampaignPlan",
    )
    pr_queue = extract_payload(queue_raw, "pr_queue", PR_QUEUE_VERSION, "PRQueue")
    return campaign_plan, pr_queue


def validate_campaign_and_queue(campaign_plan: dict[str, Any], pr_queue: dict[str, Any]) -> None:
    draft_validator = import_validator()
    validate_payload(
        campaign_plan,
        load_validator(CAMPAIGN_PLAN_SCHEMA, draft_validator),
        "CampaignPlan",
    )
    validate_payload(
        pr_queue,
        load_validator(PR_QUEUE_SCHEMA, draft_validator),
        "PRQueue",
    )


def normalize_pattern(path: str) -> str:
    return path.replace("\\", "/").strip()


def path_is_within(path: str, pattern: str) -> bool:
    normalized_path = normalize_pattern(path).strip("/")
    normalized_pattern = normalize_pattern(pattern).strip("/")
    if normalized_path == normalized_pattern:
        return True
    if normalized_pattern.endswith("/"):
        normalized_pattern = normalized_pattern.rstrip("/")
    return normalized_path.startswith(f"{normalized_pattern}/")


def path_touches_forbidden(path: str, forbidden_paths: list[str]) -> bool:
    return any(path_is_within(path, forbidden_path) for forbidden_path in forbidden_paths)


def path_allowed_by_campaign(path: str, allowed_paths: list[str]) -> bool:
    return any(path_is_within(path, allowed_path) or path_is_within(allowed_path, path) for allowed_path in allowed_paths)


def dependency_statuses(pr_queue: dict[str, Any]) -> dict[str, str]:
    return {
        candidate["pr_candidate_id"]: candidate["status"]
        for candidate in pr_queue["pr_candidates"]
    }


def dependencies_satisfied(candidate: dict[str, Any], statuses: dict[str, str]) -> bool:
    return all(statuses.get(dependency) in DEPENDENCY_SATISFIED_STATUSES for dependency in candidate["dependencies"])


def selected_pr_candidate(pr_queue: dict[str, Any]) -> dict[str, Any]:
    for candidate in pr_queue["pr_candidates"]:
        if candidate["status"] == "READY_FOR_HANDOFF":
            return candidate

    statuses = dependency_statuses(pr_queue)
    for candidate in pr_queue["pr_candidates"]:
        if candidate["status"] == "QUEUED" and dependencies_satisfied(candidate, statuses):
            return candidate

    raise DecisionBlocked("NO_ACTIONABLE_PR_CANDIDATE", "No READY_FOR_HANDOFF candidate or dependency-satisfied QUEUED candidate")


def assert_global_gates(campaign_plan: dict[str, Any], pr_queue: dict[str, Any]) -> None:
    if campaign_plan["campaign_id"] != pr_queue["campaign_id"]:
        raise DecisionBlocked("CAMPAIGN_QUEUE_MISMATCH", "CampaignPlan campaign_id does not match PRQueue campaign_id")

    if campaign_plan["human_gate_required"] is not True or pr_queue["human_gate_required"] is not True:
        raise DecisionBlocked("MISSING_HUMAN_GATE", "CampaignPlan and PRQueue must require HumanGate")

    if pr_queue["verdict"] in BLOCKED_QUEUE_VERDICTS:
        raise DecisionBlocked(pr_queue["verdict"], f"PRQueue verdict is {pr_queue['verdict']}")

    if pr_queue["ci_policy"]["local_first_required"] is not True:
        raise DecisionBlocked("LOCAL_FIRST_NOT_REQUIRED", "PRQueue must require local-first validation")
    if pr_queue["ci_policy"]["benchmark_automatic_allowed"] is not False:
        raise DecisionBlocked("BENCHMARK_AUTOMATION_ALLOWED", "Benchmark automation must remain disabled")
    if pr_queue["merge_policy"]["auto_merge_allowed"] is not False:
        raise DecisionBlocked("AUTO_MERGE_ALLOWED", "Auto-merge must remain disabled")
    if pr_queue["merge_policy"]["ready_requires_human"] is not True:
        raise DecisionBlocked("READY_HUMAN_GATE_MISSING", "Ready-for-review must require a human")
    if pr_queue["merge_policy"]["merge_requires_human"] is not True:
        raise DecisionBlocked("MERGE_HUMAN_GATE_MISSING", "Merge must require a human")
    if pr_queue["learning_policy"]["auto_mutation_allowed"] is not False:
        raise DecisionBlocked("AUTO_MUTATION_ALLOWED", "Learning auto-mutation must remain disabled")


def assert_candidate_safe(
    campaign_plan: dict[str, Any],
    candidate: dict[str, Any],
) -> None:
    if candidate["human_gate_required"] is not True:
        raise DecisionBlocked("MISSING_HUMAN_GATE", "Selected PR candidate must require HumanGate")
    if candidate["merge_allowed"] is not False:
        raise DecisionBlocked("MERGE_ALLOWED", "Selected PR candidate must not allow merge")
    if candidate["claim_scope"] != "NO_CLAIM_ALLOWED":
        raise DecisionBlocked("CLAIM_ESCALATION", "Selected PR candidate must keep NO_CLAIM_ALLOWED")
    if candidate["status"] == "READY_FOR_HANDOFF" and candidate["handoff_codex_ready"] is not True:
        raise DecisionBlocked("HANDOFF_NOT_READY", "READY_FOR_HANDOFF candidate must be handoff_codex_ready")

    campaign_allowed = campaign_plan["scope"]["allowed_paths"]
    campaign_forbidden = campaign_plan["scope"]["forbidden_paths"]
    for allowed_path in candidate["allowed_paths"]:
        if path_touches_forbidden(allowed_path, campaign_forbidden + candidate["forbidden_paths"]):
            raise DecisionBlocked("FORBIDDEN_PATH_VIOLATION", f"Allowed path touches forbidden path: {allowed_path}")
        if not path_allowed_by_campaign(allowed_path, campaign_allowed):
            raise DecisionBlocked("SCOPE_VIOLATION", f"Candidate path is outside campaign scope: {allowed_path}")


def build_next_taskpacket_draft(campaign_plan: dict[str, Any], pr_queue: dict[str, Any]) -> dict[str, Any]:
    validate_campaign_and_queue(campaign_plan, pr_queue)
    assert_global_gates(campaign_plan, pr_queue)
    candidate = selected_pr_candidate(pr_queue)
    assert_candidate_safe(campaign_plan, candidate)

    return {
        "schema_version": NEXT_TASKPACKET_VERSION,
        "source_campaign_id": campaign_plan["campaign_id"],
        "source_queue_id": pr_queue["queue_id"],
        "selected_pr_candidate_id": candidate["pr_candidate_id"],
        "title": candidate["title"],
        "pr_type": candidate["pr_type"],
        "allowed_paths": candidate["allowed_paths"],
        "forbidden_paths": candidate["forbidden_paths"],
        "validation_commands": candidate["validation_commands"],
        "expected_outputs": candidate["expected_outputs"],
        "claim_scope": candidate["claim_scope"],
        "human_gate_required": candidate["human_gate_required"],
        "merge_allowed": candidate["merge_allowed"],
        "execution_mode": "LOCAL_FIRST_DRY_RUN",
        "codex_handoff_ready": candidate["handoff_codex_ready"],
        "stop_conditions": campaign_plan["stop_conditions"],
    }


def blocked_report(code: str, reason: str) -> dict[str, Any]:
    return {
        "overall_status": "BLOCKED",
        "error_code": code,
        "reasons": [reason],
    }


def main() -> int:
    args = parse_args()
    try:
        campaign_plan, pr_queue = load_campaign_and_queue(args.campaign_plan, args.pr_queue)
        emit_json(build_next_taskpacket_draft(campaign_plan, pr_queue), args.pretty)
        return 0
    except DecisionBlocked as exc:
        emit_json(blocked_report(exc.code, exc.reason), args.pretty)
        return 1
    except ConfigError as exc:
        emit_json(blocked_report("INTERNAL_CONFIG_ERROR", str(exc)), args.pretty)
        return 2
    except Exception as exc:  # pragma: no cover - defensive hard stop
        emit_json(blocked_report("INTERNAL_ERROR", str(exc)), args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
