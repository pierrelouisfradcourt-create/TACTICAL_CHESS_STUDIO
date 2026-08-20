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
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studiopilot_pr_decision_packet.schema.json"
PACKET_SCHEMA_VERSION = "studiopilot.pr_decision_packet.v0"
SUMMARY_SCHEMA_VERSION = "studiopilot.pr_decision_summary.v0"


class InputValidationError(Exception):
    pass


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a compact local PRDecisionPacket summary."
    )
    parser.add_argument("--input", required=True, help="Path to a PRDecisionPacket JSON file.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise InputValidationError(f"input_missing: {normalize_path(path)}") from exc
    except json.JSONDecodeError as exc:
        raise InputValidationError(f"json_decode_error: {normalize_path(path)}: {exc}") from exc
    except OSError as exc:
        raise InputValidationError(f"json_read_error: {normalize_path(path)}: {exc}") from exc


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


def schema_validation_errors(payload: Any) -> list[str]:
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


def enforce_safety_invariants(packet: dict[str, Any]) -> None:
    if packet.get("schema_version") != PACKET_SCHEMA_VERSION:
        raise InputValidationError("schema_version_mismatch")
    if packet.get("human_gate_required") is not True:
        raise InputValidationError("human_gate_required_must_be_true")
    if packet.get("auto_merge_allowed") is not False:
        raise InputValidationError("auto_merge_allowed_must_be_false")
    if packet.get("auto_ready_allowed") is not False:
        raise InputValidationError("auto_ready_allowed_must_be_false")
    if packet.get("claim_verdict") not in {
        "NO_CLAIM_ALLOWED",
        "HEALTH_ONLY",
        "EVIDENCE_ONLY",
    }:
        raise InputValidationError("claim_verdict_escalation_refused")


def objective_status(packet: dict[str, Any]) -> str:
    if packet["forbidden_surface_touched"]:
        return "BLOCKED_FORBIDDEN_SURFACE"
    if packet["checks_status"] == "BLOCKED_INFRA":
        return "BLOCKED_INFRA"
    if packet["checks_status"] == "FAILED":
        return "BLOCKED_CHECKS_FAILED"
    if packet["checks_status"] == "PENDING":
        return "PENDING_CHECKS"
    if packet["checks_status"] == "UNKNOWN":
        return "UNKNOWN_CHECKS"
    if packet["scope_status"] != "OK":
        return f"SCOPE_{packet['scope_status']}"
    if packet["software_verdict"] != "SAFE":
        return f"SOFTWARE_{packet['software_verdict']}"
    if packet["merge_verdict"] == "MERGE_BLOCKED":
        return "MERGE_BLOCKED"
    return "READY_FOR_HUMANGATE"


def computed_decision(packet: dict[str, Any]) -> str:
    if packet["forbidden_surface_touched"]:
        return "BLOCKED"
    if packet["checks_status"] == "FAILED":
        return "BLOCKED"
    if packet["checks_status"] == "BLOCKED_INFRA":
        return "BLOCKED_INFRA"
    if packet["checks_status"] == "PENDING":
        return "HOLD"
    if packet["checks_status"] != "SUCCESS":
        return "HOLD"
    if packet["scope_status"] != "OK":
        return "HOLD" if packet["scope_status"] in {"WARNING", "UNKNOWN"} else "BLOCKED"
    if packet["software_verdict"] == "BLOCKED_INFRA":
        return "BLOCKED_INFRA"
    if packet["software_verdict"] == "BLOCKED":
        return "BLOCKED"
    if packet["software_verdict"] != "SAFE":
        return "HOLD"
    if packet["merge_verdict"] == "MERGE_ALLOWED":
        return "GO_READY_AND_MERGE"
    if packet["merge_verdict"] == "READY_ALLOWED":
        return "GO"
    return "HOLD"


def build_summary(packet: dict[str, Any]) -> dict[str, Any]:
    decision = computed_decision(packet)
    if packet["recommended_decision"] != decision:
        raise InputValidationError(
            "recommended_decision_mismatch: "
            f"expected {decision}, got {packet['recommended_decision']}"
        )

    return {
        "schema_version": SUMMARY_SCHEMA_VERSION,
        "pr_number": packet["pr_number"],
        "head_sha": packet["head_sha"],
        "recommended_decision": decision,
        "scope": packet["scope_status"],
        "checks": packet["checks_status"],
        "verdict": packet["software_verdict"],
        "claim": packet["claim_verdict"],
        "objective_status": objective_status(packet),
        "next_action": packet["next_action"],
        "reasons": packet["reasons"],
    }


def emit_json(payload: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True))


def load_and_build_summary(input_path: Path) -> dict[str, Any]:
    packet = load_json(input_path)
    if not isinstance(packet, dict):
        raise InputValidationError("packet_root_must_be_object")

    validation_errors = schema_validation_errors(packet)
    if validation_errors:
        raise InputValidationError(f"schema_validation_failed: {validation_errors[0]}")

    enforce_safety_invariants(packet)
    return build_summary(packet)


def main() -> int:
    args = parse_args()

    try:
        summary = load_and_build_summary(resolve_path(args.input))
        emit_json(summary, args.pretty)
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
