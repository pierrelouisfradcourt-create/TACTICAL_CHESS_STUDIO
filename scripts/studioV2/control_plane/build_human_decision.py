import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import jsonschema
except ImportError:
    print("BLOCKED_MISSING_JSONSCHEMA")
    raise SystemExit(2)


PROJECT_ROOT = Path(__file__).resolve().parents[3]
SCHEMAS_ROOT = PROJECT_ROOT / "schemas"
REVIEW_PACKET_SCHEMA = SCHEMAS_ROOT / "studiopilot_review_packet.schema.json"
HUMAN_DECISION_SCHEMA = SCHEMAS_ROOT / "studiopilot_human_decision.schema.json"

DEFAULT_APPROVER = "HUMAN_FOUNDER_REQUIRED"
DEFAULT_RATIONALE = (
    "Dry-run HumanDecision draft generated from local ReviewPacket. "
    "This record is human-owned and non-automatic; it does not execute merge, "
    "promotion, claims, or any repository action."
)
DEFAULT_ROLLBACK_PLAN = (
    "If a later human decision requires reversal, revert the candidate change set "
    "and rerun required validations before issuing a new HumanDecision."
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a dry-run StudioPilot HumanDecision draft from a validated ReviewPacket."
    )
    parser.add_argument("review_packet_path", help="Path to a local ReviewPacket JSON file.")
    parser.add_argument("--output", help="Optional output path for writing the HumanDecision JSON.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    parser.add_argument("--decision-id", help="Optional override for HumanDecision decision_id.")
    parser.add_argument("--approver", help="Optional human approver name.")
    parser.add_argument(
        "--merge-decision",
        choices=("MERGE", "REJECT", "HOLD", "REQUEST_CHANGES"),
        help="Optional explicit merge decision override.",
    )
    parser.add_argument(
        "--claim-decision",
        choices=("NO_CLAIM", "HEALTH_ONLY", "EVIDENCE_ONLY"),
        help="Optional explicit claim decision override.",
    )
    parser.add_argument(
        "--promotion-decision",
        choices=("NO_PROMOTION", "CANDIDATE", "PROMOTE"),
        help="Optional explicit promotion decision override.",
    )
    parser.add_argument("--rationale", help="Optional rationale override.")
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


def default_merge_decision(recommendation: str) -> str:
    if recommendation == "BLOCKED":
        return "HOLD"
    if recommendation == "REQUEST_CHANGES":
        return "REQUEST_CHANGES"
    if recommendation in {"SAFE_TO_READY", "SAFE_TO_MERGE_AFTER_HUMAN_CONFIRMATION"}:
        return "HOLD"
    return "HOLD"


def to_utc_timestamp() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def build_human_decision(
    review_packet: dict[str, Any],
    review_packet_path: Path,
    decision_id_override: str | None,
    approver_override: str | None,
    merge_decision_override: str | None,
    claim_decision_override: str | None,
    promotion_decision_override: str | None,
    rationale_override: str | None,
) -> dict[str, Any]:
    recommendation = str(review_packet.get("recommendation", ""))
    review_id = str(review_packet.get("review_id", ""))
    source_pr = str(review_packet.get("source_pr", ""))

    decision_id = decision_id_override or f"HD-{review_id}"
    subject = f"ReviewPacket {review_id} for {source_pr}"
    approver = approver_override or DEFAULT_APPROVER
    merge_decision = merge_decision_override or default_merge_decision(recommendation)
    claim_decision = claim_decision_override or "NO_CLAIM"
    promotion_decision = promotion_decision_override or "NO_PROMOTION"
    rationale = rationale_override or DEFAULT_RATIONALE
    rollback_plan = DEFAULT_ROLLBACK_PLAN

    evidence_ref = (
        f"local_review_packet:{review_packet_path.as_posix()} "
        "(non-canonical review input only)"
    )
    evidence_refs = [evidence_ref]

    if not rollback_plan.strip():
        raise ValueError("rollback_plan must be non-empty")

    return {
        "schema_version": review_packet["schema_version"],
        "decision_id": decision_id,
        "subject": subject,
        "approver": approver,
        "merge_decision": merge_decision,
        "claim_decision": claim_decision,
        "promotion_decision": promotion_decision,
        "rationale": rationale,
        "evidence_refs": evidence_refs,
        "rollback_plan": rollback_plan,
        "timestamp": to_utc_timestamp(),
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
        review_packet_path = Path(args.review_packet_path).resolve()
        if not review_packet_path.exists():
            print(f"INPUT_VALIDATION_ERROR: missing review packet: {review_packet_path}", file=sys.stderr)
            return 1

        review_packet_obj = load_json(review_packet_path)
        if not isinstance(review_packet_obj, dict):
            print("INPUT_VALIDATION_ERROR: review packet root must be an object", file=sys.stderr)
            return 1

        review_validator = build_validator(REVIEW_PACKET_SCHEMA)
        validate_payload(review_packet_obj, review_validator, "ReviewPacket")

        human_decision = build_human_decision(
            review_packet=review_packet_obj,
            review_packet_path=review_packet_path,
            decision_id_override=args.decision_id,
            approver_override=args.approver,
            merge_decision_override=args.merge_decision,
            claim_decision_override=args.claim_decision,
            promotion_decision_override=args.promotion_decision,
            rationale_override=args.rationale,
        )

        human_validator = build_validator(HUMAN_DECISION_SCHEMA)
        validate_payload(human_decision, human_validator, "HumanDecision")

        rendered = emit_json(human_decision, args.pretty)
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
