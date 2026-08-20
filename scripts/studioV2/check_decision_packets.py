import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


ALLOWED_PACKET_TYPES = {"MERGE_DECISION", "CLAIM_DECISION"}
ALLOWED_MERGE_DECISIONS = {"MERGE", "REJECT", "FREEZE", "DEFER"}
ALLOWED_CLAIM_DECISIONS = {"NO_CLAIM_ALLOWED", "HEALTH_ONLY", "TARGETED_BEHAVIOR_ONLY", "EXPLORATORY_ONLY"}
FORBIDDEN_CLAIM_DECISIONS = {"PROMOTION_REVIEW_CANDIDATE", "STRENGTH_CLAIM_CANDIDATE"}
ALLOWED_SOFTWARE_VERDICTS = {"PASS", "BLOCKED"}
ALLOWED_EVIDENCE_VERDICTS = {"HUMAN_GOVERNANCE_CONTRACT_ONLY", "INVALID"}
ALLOWED_CLAIM_VERDICTS = {"NO_CLAIM_ALLOWED"}

REQUIRED_TOP_LEVEL_KEYS = {
    "schema_version",
    "packet_type",
    "status",
    "not_evidence",
    "not_promotion",
    "human_decision_required",
    "merge_decision",
    "claim_decision",
    "authority_boundaries",
    "expected_verdict",
}

REQUIRED_AUTHORITY_KEYS = {
    "codex_may_decide_merge",
    "codex_may_decide_claim",
    "gpt55_may_decide_merge",
    "gpt55_may_decide_claim",
    "ci_may_decide_claim",
    "human_final_authority",
}


@dataclass
class DecisionPacketResult:
    software_verdict: str
    evidence_verdict: str
    claim_verdict: str = "NO_CLAIM_ALLOWED"
    blocking_issues: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    parsed_path: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "software_verdict": self.software_verdict,
            "evidence_verdict": self.evidence_verdict,
            "claim_verdict": self.claim_verdict,
            "blocking_issues": self.blocking_issues,
            "warnings": self.warnings,
            "parsed_path": self.parsed_path,
        }


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_expected_verdict(data: dict[str, Any], issues: list[str]) -> None:
    expected = data.get("expected_verdict")
    if not isinstance(expected, dict):
        issues.append("SCHEMA_INVALID: expected_verdict must be object")
        return
    if expected.get("software_verdict") not in ALLOWED_SOFTWARE_VERDICTS:
        issues.append("SCHEMA_INVALID: expected software_verdict")
    if expected.get("evidence_verdict") not in ALLOWED_EVIDENCE_VERDICTS:
        issues.append("SCHEMA_INVALID: expected evidence_verdict")
    if expected.get("claim_verdict") not in ALLOWED_CLAIM_VERDICTS:
        issues.append("BLOCKED_CLAIM_SCOPE: expected claim_verdict must be NO_CLAIM_ALLOWED")


def validate_packet(path: Path) -> DecisionPacketResult:
    issues: list[str] = []
    warnings: list[str] = []

    try:
        data = load_json(path)
    except (OSError, json.JSONDecodeError) as exc:
        return DecisionPacketResult("BLOCKED", "INVALID", blocking_issues=[f"CORRUPT_JSON: {exc}"], parsed_path=str(path))

    if not isinstance(data, dict):
        return DecisionPacketResult("BLOCKED", "INVALID", blocking_issues=["SCHEMA_INVALID: packet must be object"], parsed_path=str(path))

    for key in sorted(REQUIRED_TOP_LEVEL_KEYS - set(data)):
        issues.append(f"SCHEMA_INVALID: missing {key}")

    if data.get("schema_version") != "pr09.decision_packet.v1":
        issues.append("SCHEMA_INVALID: schema_version")
    if data.get("packet_type") not in ALLOWED_PACKET_TYPES:
        issues.append("SCHEMA_INVALID: packet_type")
    if data.get("status") != "contract_only":
        issues.append("SCHEMA_INVALID: status must be contract_only")
    if data.get("not_evidence") is not True:
        issues.append("BLOCKED_FALSE_EVIDENCE: not_evidence must be true")
    if data.get("not_promotion") is not True:
        issues.append("BLOCKED_PROMOTION_AUTHORITY: not_promotion must be true")
    if data.get("human_decision_required") is not True:
        issues.append("BLOCKED_AUTHORITY: human_decision_required must be true")

    authority = data.get("authority_boundaries")
    if not isinstance(authority, dict):
        issues.append("SCHEMA_INVALID: authority_boundaries must be object")
    else:
        for key in sorted(REQUIRED_AUTHORITY_KEYS - set(authority)):
            issues.append(f"SCHEMA_INVALID: authority_boundaries missing {key}")
        for key in (
            "codex_may_decide_merge",
            "codex_may_decide_claim",
            "gpt55_may_decide_merge",
            "gpt55_may_decide_claim",
            "ci_may_decide_claim",
        ):
            if authority.get(key) is not False:
                issues.append(f"BLOCKED_AUTHORITY: {key} must be false")
        if authority.get("human_final_authority") is not True:
            issues.append("BLOCKED_AUTHORITY: human_final_authority must be true")

    merge_decision = data.get("merge_decision")
    claim_decision = data.get("claim_decision")
    packet_type = data.get("packet_type")

    if not isinstance(merge_decision, dict):
        issues.append("SCHEMA_INVALID: merge_decision must be object")
    else:
        value = merge_decision.get("decision")
        if packet_type == "MERGE_DECISION" and value not in ALLOWED_MERGE_DECISIONS:
            issues.append("SCHEMA_INVALID: merge decision")
        if merge_decision.get("separate_from_claim_decision") is not True:
            issues.append("BLOCKED_ROLE_COLLAPSE: MERGE_DECISION must be separate from CLAIM_DECISION")

    if not isinstance(claim_decision, dict):
        issues.append("SCHEMA_INVALID: claim_decision must be object")
    else:
        value = claim_decision.get("claim_verdict")
        if value in FORBIDDEN_CLAIM_DECISIONS:
            issues.append("BLOCKED_CLAIM_SCOPE: promotion or strength claim candidate is forbidden in PR09 packets")
        if value not in ALLOWED_CLAIM_DECISIONS:
            issues.append("BLOCKED_CLAIM_SCOPE: unsupported claim decision")
        if claim_decision.get("separate_from_merge_decision") is not True:
            issues.append("BLOCKED_ROLE_COLLAPSE: CLAIM_DECISION must be separate from MERGE_DECISION")
        if packet_type == "CLAIM_DECISION" and value != "NO_CLAIM_ALLOWED":
            warnings.append("CLAIM_DECISION_PACKET_NON_DEFAULT_SCOPE: human review would be required outside PR09 examples")

    if packet_type == "MERGE_DECISION" and isinstance(claim_decision, dict):
        if claim_decision.get("claim_verdict") != "NO_CLAIM_ALLOWED":
            issues.append("BLOCKED_ROLE_COLLAPSE: merge packet cannot carry non-default claim scope")

    validate_expected_verdict(data, issues)

    if issues:
        return DecisionPacketResult(
            "BLOCKED",
            "INVALID",
            blocking_issues=sorted(set(issues)),
            warnings=warnings,
            parsed_path=str(path),
        )

    return DecisionPacketResult(
        "PASS",
        "HUMAN_GOVERNANCE_CONTRACT_ONLY",
        warnings=warnings + ["PR09_CONTRACT_ONLY: packet is not evidence and not promotion"],
        parsed_path=str(path),
    )


def validate_examples(path: Path) -> dict[str, Any]:
    example_files = sorted(p for p in path.glob("*.json") if p.is_file())
    outputs = []
    all_matched = True
    for example in example_files:
        data = load_json(example)
        expected = data.get("expected_verdict", {}) if isinstance(data, dict) else {}
        actual = validate_packet(example).as_dict()
        matched = (
            actual.get("software_verdict") == expected.get("software_verdict")
            and actual.get("evidence_verdict") == expected.get("evidence_verdict")
            and actual.get("claim_verdict") == expected.get("claim_verdict")
        )
        all_matched = all_matched and matched
        outputs.append({"example": example.name, "matched_expected": matched, "actual": actual, "expected_verdict": expected})
    return {
        "software_verdict": "PASS" if all_matched else "BLOCKED",
        "evidence_verdict": "HUMAN_GOVERNANCE_CONTRACT_ONLY" if all_matched else "INVALID",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "examples_checked": outputs,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PR-09 decision packet validator.")
    parser.add_argument("--path", required=True, help="Decision packet JSON or examples directory.")
    parser.add_argument("--example-mode", action="store_true", help="Validate examples against embedded expected verdicts.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    path = Path(args.path)
    if args.example_mode:
        output = validate_examples(path)
    else:
        output = validate_packet(path).as_dict()
    print(json.dumps(output, indent=2 if args.pretty else None, sort_keys=True))
    return 1 if output.get("software_verdict") == "BLOCKED" else 0


if __name__ == "__main__":
    raise SystemExit(main())
