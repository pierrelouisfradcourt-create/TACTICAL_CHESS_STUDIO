#!/usr/bin/env python3
"""PR-07 structured GPT-5.5 audit scaffold.

This script is intentionally local-only. It does not import OpenAI, call a
network endpoint, install packages, or make scientific claims.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "pr07.gpt55_structured_audit.v1"
CLAIM_VERDICT = "NO_CLAIM_ALLOWED"
SOFTWARE_VERDICT = "AUDIT_LAYER_ADDED"
EVIDENCE_VERDICT = "STRUCTURED_AUDIT_ONLY"

WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
LAB_RUNS_ROOT = WORKSPACE_ROOT / "lab" / "runs"

INPUT_REQUIRED_FIELDS = (
    "schema_version",
    "source_kind",
    "mechanical_verdicts",
    "parser_output",
    "input_boundary_gate_output",
    "claim_data_gate_output",
    "artifact_refs",
)

OUTPUT_REQUIRED_FIELDS = (
    "schema_version",
    "audit_verdict",
    "anomalies",
    "blocking_observations",
    "warnings",
    "claim_language_findings",
    "evidence_quality_findings",
    "recommended_human_review",
    "forbidden_authority_attempts",
    "model_role",
    "reasoning_effort",
    "authority_boundary",
    "software_verdict",
    "evidence_verdict",
    "claim_verdict",
)

ALLOWED_AUDIT_VERDICTS = {
    "NO_ANOMALY_FOUND",
    "ANOMALY_FOUND",
    "AUDIT_INVALID",
    "SCHEMA_OR_POLICY_VIOLATION",
    "INSUFFICIENT_INPUT",
}

FORBIDDEN_TRUE_FIELDS = {
    "truth_established": "GPT_TRUTH_ESTABLISHED_FORBIDDEN",
    "merge_authorized": "GPT_MERGE_AUTH_FORBIDDEN",
    "promotion_authorized": "GPT_PROMOTION_AUTH_FORBIDDEN",
    "claim_authorized": "GPT_CLAIM_AUTH_FORBIDDEN",
    "blocked_converted_to_pass": "GPT_UNBLOCK_FORBIDDEN",
    "claim_scope_increased": "GPT_CLAIM_SCOPE_INCREASE_FORBIDDEN",
}


class AuditError(ValueError):
    """Expected local validation failure."""


def is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def resolve_workspace_path(raw_path: str, *, must_exist: bool, for_output: bool) -> Path:
    path = Path(raw_path)
    if any(part == ".." for part in path.parts):
        raise AuditError(f"PATH_TRAVERSAL_REJECTED: {raw_path}")

    candidate = path if path.is_absolute() else WORKSPACE_ROOT / path
    resolved = candidate.resolve(strict=must_exist)

    if not is_relative_to(resolved, WORKSPACE_ROOT):
        raise AuditError(f"PATH_OUTSIDE_WORKSPACE_REJECTED: {raw_path}")

    if for_output and is_relative_to(resolved, LAB_RUNS_ROOT):
        raise AuditError(f"LAB_RUNS_OUTPUT_REJECTED: {raw_path}")

    return resolved


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def emit_json(payload: dict[str, Any], *, pretty: bool, output_path: Path | None) -> None:
    text = json.dumps(
        payload,
        indent=2 if pretty else None,
        sort_keys=True,
        ensure_ascii=True,
    )
    if pretty:
        text += "\n"

    if output_path is None:
        sys.stdout.write(text)
        if not pretty:
            sys.stdout.write("\n")
        return

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
        if not text.endswith("\n"):
            handle.write("\n")


def authority_boundary() -> dict[str, Any]:
    return {
        "binding": False,
        "may_critique_anomalies": True,
        "may_authorize_merge": False,
        "may_authorize_promotion": False,
        "may_authorize_scientific_claims": False,
        "may_override_blocked": False,
        "may_increase_claim_scope": False,
        "may_transform_weak_evidence_into_proof": False,
        "reasoning_increases_authority": False,
        "reasoning_increases_permissions": False,
        "reasoning_increases_claim_scope": False,
    }


def base_payload(mode: str) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "mode": mode,
        "model_role": "non_binding_anomaly_critic",
        "reasoning_effort": "does_not_increase_authority",
        "authority_boundary": authority_boundary(),
        "software_verdict": SOFTWARE_VERDICT,
        "evidence_verdict": EVIDENCE_VERDICT,
        "claim_verdict": CLAIM_VERDICT,
    }


def issue(name: str, detail: str) -> dict[str, str]:
    return {"issue": name, "detail": detail}


def validate_input_contract(data: Any) -> list[dict[str, str]]:
    issues: list[dict[str, str]] = []
    if not isinstance(data, dict):
        return [issue("GPT_SCHEMA_INVALID", "Audit input must be a JSON object.")]

    for field in INPUT_REQUIRED_FIELDS:
        if field not in data:
            issues.append(issue("GPT_SCHEMA_INVALID", f"Missing required input field: {field}"))

    if "mechanical_verdicts" in data and not isinstance(data["mechanical_verdicts"], dict):
        issues.append(issue("GPT_SCHEMA_INVALID", "mechanical_verdicts must be an object."))

    if "artifact_refs" in data and not isinstance(data["artifact_refs"], list):
        issues.append(issue("GPT_SCHEMA_INVALID", "artifact_refs must be an array."))

    return issues


def walk_values(value: Any) -> list[Any]:
    values = [value]
    if isinstance(value, dict):
        for child in value.values():
            values.extend(walk_values(child))
    elif isinstance(value, list):
        for child in value:
            values.extend(walk_values(child))
    return values


def truthy(value: Any) -> bool:
    return value is True or (isinstance(value, str) and value.strip().lower() == "true")


def find_truthy_field(data: Any, field_name: str) -> bool:
    if isinstance(data, dict):
        for key, value in data.items():
            if key == field_name and truthy(value):
                return True
            if find_truthy_field(value, field_name):
                return True
    elif isinstance(data, list):
        return any(find_truthy_field(item, field_name) for item in data)
    return False


def contains_forbidden_scientific_proof_language(text: str) -> bool:
    lowered = text.lower()
    forbidden_fragments = (
        "scientific proof",
        "scientifically proven",
        "proves the claim",
        "proof established",
        "truth established",
        "establishes truth",
        "conclusive proof",
    )
    return any(fragment in lowered for fragment in forbidden_fragments)


def contains_latest_as_evidence(text: str) -> bool:
    lowered = text.lower()
    return "latest.json" in lowered and "evidence" in lowered


def contains_codex_report_as_evidence(text: str) -> bool:
    lowered = text.lower()
    return (
        "codex report alone is evidence" in lowered
        or "codex report is evidence" in lowered
        or "codex report as evidence" in lowered
        or "codex report is canonical evidence" in lowered
    )


def validate_output_contract(data: Any) -> list[dict[str, str]]:
    issues: list[dict[str, str]] = []
    if not isinstance(data, dict):
        return [issue("GPT_SCHEMA_INVALID", "Audit output must be a JSON object.")]

    for field in OUTPUT_REQUIRED_FIELDS:
        if field not in data:
            issues.append(issue("GPT_SCHEMA_INVALID", f"Missing required output field: {field}"))

    audit_verdict = data.get("audit_verdict")
    if audit_verdict not in ALLOWED_AUDIT_VERDICTS:
        issues.append(issue("GPT_SCHEMA_INVALID", "audit_verdict is missing or not allowed."))

    if data.get("claim_verdict") != CLAIM_VERDICT:
        issues.append(issue("GPT_SCHEMA_INVALID", "claim_verdict must remain NO_CLAIM_ALLOWED."))

    for field, issue_name in FORBIDDEN_TRUE_FIELDS.items():
        if find_truthy_field(data, field):
            issues.append(issue(issue_name, f"Forbidden authority field was true: {field}"))

    for value in walk_values(data):
        if not isinstance(value, str):
            continue
        if contains_forbidden_scientific_proof_language(value):
            issues.append(
                issue(
                    "GPT_SCIENTIFIC_PROOF_FORBIDDEN",
                    "Audit output used forbidden scientific proof or truth-establishing language.",
                )
            )
        if contains_latest_as_evidence(value):
            issues.append(
                issue(
                    "GPT_LATEST_AS_EVIDENCE_FORBIDDEN",
                    "Audit output treated latest.json as evidence.",
                )
            )
        if contains_codex_report_as_evidence(value):
            issues.append(
                issue(
                    "GPT_CODEX_REPORT_AS_EVIDENCE_FORBIDDEN",
                    "Audit output treated a Codex report alone as evidence.",
                )
            )

    if find_truthy_field(data, "codex_report_alone_as_evidence"):
        issues.append(
            issue(
                "GPT_CODEX_REPORT_AS_EVIDENCE_FORBIDDEN",
                "codex_report_alone_as_evidence was true.",
            )
        )

    return dedupe_issues(issues)


def dedupe_issues(issues: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[tuple[str, str]] = set()
    deduped: list[dict[str, str]] = []
    for item in issues:
        key = (item["issue"], item["detail"])
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped


def scaffold_from_input(data: Any, input_path: Path) -> dict[str, Any]:
    issues = validate_input_contract(data)
    payload = base_payload("audit_scaffold")
    payload.update(
        {
            "input_path": str(input_path.relative_to(WORKSPACE_ROOT)),
            "input_valid": not issues,
            "audit_verdict": "INSUFFICIENT_INPUT" if not issues else "SCHEMA_OR_POLICY_VIOLATION",
            "anomalies": [],
            "blocking_observations": [],
            "warnings": [
                "GPT audit scaffold only; no model was called.",
                "Mechanical parser and gate outputs remain the primary inputs.",
            ],
            "claim_language_findings": [],
            "evidence_quality_findings": [],
            "recommended_human_review": True,
            "forbidden_authority_attempts": [],
            "issues": issues,
        }
    )
    return payload


def validation_from_output(data: Any, output_path: Path) -> dict[str, Any]:
    issues = validate_output_contract(data)
    payload = base_payload("validate_output")
    payload.update(
        {
            "validated_path": str(output_path.relative_to(WORKSPACE_ROOT)),
            "valid": not issues,
            "audit_verdict": "NO_ANOMALY_FOUND" if not issues else "SCHEMA_OR_POLICY_VIOLATION",
            "issues": issues,
            "forbidden_authority_attempts": [
                item["issue"] for item in issues if item["issue"] != "GPT_SCHEMA_INVALID"
            ],
        }
    )
    return payload


def example_payload() -> dict[str, Any]:
    payload = base_payload("example_mode")
    payload.update(
        {
            "audit_verdict": "INSUFFICIENT_INPUT",
            "examples": {
                "valid_input": "lab/gpt_audit/examples/valid_audit_input_contract_only.json",
                "valid_output": "lab/gpt_audit/examples/valid_audit_output_anomalies_only.json",
                "invalid_outputs": [
                    "lab/gpt_audit/examples/invalid_gpt_truth_established.json",
                    "lab/gpt_audit/examples/invalid_gpt_raises_claim_scope.json",
                    "lab/gpt_audit/examples/invalid_gpt_unblocks_blocked.json",
                    "lab/gpt_audit/examples/invalid_gpt_authorizes_claim.json",
                    "lab/gpt_audit/examples/invalid_gpt_authorizes_merge.json",
                ],
            },
            "claim_verdict": CLAIM_VERDICT,
        }
    )
    return payload


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PR-07 local structured GPT-5.5 audit scaffold.")
    parser.add_argument("--input", help="Path to an audit input JSON contract.")
    parser.add_argument("--validate-output", help="Path to a simulated GPT audit output JSON.")
    parser.add_argument("--output", help="Optional path for writing the JSON result.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    parser.add_argument("--example-mode", action="store_true", help="Emit example contract locations.")
    args = parser.parse_args(argv)

    selected = [bool(args.input), bool(args.validate_output), bool(args.example_mode)]
    if sum(selected) != 1:
        parser.error("Choose exactly one of --input, --validate-output, or --example-mode.")

    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        output_path = (
            resolve_workspace_path(args.output, must_exist=False, for_output=True)
            if args.output
            else None
        )

        if args.input:
            input_path = resolve_workspace_path(args.input, must_exist=True, for_output=False)
            payload = scaffold_from_input(load_json(input_path), input_path)
        elif args.validate_output:
            validate_path = resolve_workspace_path(args.validate_output, must_exist=True, for_output=False)
            payload = validation_from_output(load_json(validate_path), validate_path)
        else:
            payload = example_payload()

        payload["claim_verdict"] = CLAIM_VERDICT
        emit_json(payload, pretty=args.pretty, output_path=output_path)
        return 0
    except (AuditError, json.JSONDecodeError, OSError) as exc:
        payload = base_payload("error")
        payload.update(
            {
                "audit_verdict": "SCHEMA_OR_POLICY_VIOLATION",
                "valid": False,
                "issues": [issue("GPT_SCHEMA_INVALID", str(exc))],
            }
        )
        emit_json(payload, pretty=True, output_path=None)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
