import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


SCHEMA_VERSION = "pr10.runtime_dry_run_packet.v1"
ALLOWED_PACKET_TYPES = {"RUNTIME_DRY_RUN"}
ALLOWED_STATUS = {"contract_only", "dry_run_only"}
ALLOWED_RUNTIME_THEMES = {
    "dry_run_runtime_validation_harness",
    "conversion_benchmark_discipline",
    "search_behavior_non_converting",
    "conversion_row_semantic_cleanup",
    "fast_daily_iteration_harness",
}
ALLOWED_CLAIM_VERDICTS = {"NO_CLAIM_ALLOWED", "HEALTH_ONLY"}
ALLOWED_SOFTWARE_VERDICTS = {"PASS", "BLOCKED", "UNCERTAIN"}
ALLOWED_EVIDENCE_VERDICTS = {"INCOMPLETE", "INVALID", "COMPLETE"}

REQUIRED_TOP_LEVEL_KEYS = {
    "schema_version",
    "packet_type",
    "status",
    "runtime_theme",
    "not_scientific_evidence",
    "not_promotion",
    "non_destructive",
    "commands",
    "artifact_policy",
    "claim_control",
    "authority_boundaries",
    "expected_verdict",
}
REQUIRED_COMMAND_KEYS = {
    "command_id",
    "command",
    "purpose",
    "writes_allowed",
    "may_access_holdout",
    "may_reset_dataset",
    "may_make_claim",
}
REQUIRED_AUTHORITY_KEYS = {
    "codex_may_promote",
    "codex_may_authorize_claim",
    "gpt55_may_authorize_claim",
    "ci_may_authorize_claim",
    "human_review_required",
}
REQUIRED_ARTIFACT_KEYS = {
    "may_create_real_run_bundle",
    "may_update_latest_json",
    "output_location_kind",
}

FORBIDDEN_CLAIM_PHRASES = (
    "run proves",
    "evidence proves improvement",
    "benchmark validates",
    "ready for promotion",
    "promotion candidate",
    "strength improved",
    "elo improved",
    "search improved",
    "neural improved",
    "conversion proves strength",
    "ci proves correctness",
    "latest proves",
    "validated engine",
    "scientific proof",
    "aaa validated",
)
FORBIDDEN_PATH_PATTERNS = (
    "holdout/",
    "lab/runs/RUN_",
    "lab/runs/latest.json",
)


@dataclass
class RuntimeDryRunResult:
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


def collect_strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            out.extend(collect_strings(item))
        return out
    if isinstance(value, dict):
        out = []
        for item in value.values():
            out.extend(collect_strings(item))
        return out
    return []


def is_safe_relative_path(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    candidate = value.replace("\\", "/")
    if PureWindowsPath(candidate).is_absolute() or PurePosixPath(candidate).is_absolute():
        return False
    return ".." not in PurePosixPath(candidate).parts


def missing_keys(label: str, value: Any, required: set[str], issues: list[str]) -> None:
    if not isinstance(value, dict):
        issues.append(f"SCHEMA_INVALID: {label} must be object")
        return
    for key in sorted(required - set(value)):
        issues.append(f"SCHEMA_INVALID: {label} missing {key}")


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
        issues.append("BLOCKED_CLAIM_SCOPE: expected claim_verdict above HEALTH_ONLY")


def validate_packet(path: Path) -> RuntimeDryRunResult:
    issues: list[str] = []
    warnings: list[str] = []

    try:
        data = load_json(path)
    except (OSError, json.JSONDecodeError) as exc:
        return RuntimeDryRunResult("BLOCKED", "INVALID", blocking_issues=[f"CORRUPT_JSON: {exc}"], parsed_path=str(path))

    if not isinstance(data, dict):
        return RuntimeDryRunResult("BLOCKED", "INVALID", blocking_issues=["SCHEMA_INVALID: packet must be object"], parsed_path=str(path))

    for key in sorted(REQUIRED_TOP_LEVEL_KEYS - set(data)):
        issues.append(f"SCHEMA_INVALID: missing {key}")

    if data.get("schema_version") != SCHEMA_VERSION:
        issues.append("SCHEMA_INVALID: schema_version")
    if data.get("packet_type") not in ALLOWED_PACKET_TYPES:
        issues.append("SCHEMA_INVALID: packet_type")
    if data.get("status") not in ALLOWED_STATUS:
        issues.append("SCHEMA_INVALID: status")
    if data.get("runtime_theme") not in ALLOWED_RUNTIME_THEMES:
        issues.append("BLOCKED_SCOPE: runtime_theme must be one approved PR10 theme")
    if data.get("not_scientific_evidence") is not True:
        issues.append("BLOCKED_FALSE_EVIDENCE: not_scientific_evidence must be true")
    if data.get("not_promotion") is not True:
        issues.append("BLOCKED_PROMOTION_AUTHORITY: not_promotion must be true")
    if data.get("non_destructive") is not True:
        issues.append("BLOCKED_RUNTIME_MUTATION: non_destructive must be true")

    artifact_policy = data.get("artifact_policy")
    missing_keys("artifact_policy", artifact_policy, REQUIRED_ARTIFACT_KEYS, issues)
    if isinstance(artifact_policy, dict):
        if artifact_policy.get("may_create_real_run_bundle") is not False:
            issues.append("BLOCKED_REAL_RUN_BUNDLE: PR10 dry-run may not create real RUN_* bundles")
        if artifact_policy.get("may_update_latest_json") is not False:
            issues.append("BLOCKED_LATEST_AS_EVIDENCE: dry-run may not update latest.json")
        if artifact_policy.get("output_location_kind") != "non_canonical_sandbox":
            issues.append("BLOCKED_FALSE_EVIDENCE: output_location_kind must be non_canonical_sandbox")

    authority = data.get("authority_boundaries")
    missing_keys("authority_boundaries", authority, REQUIRED_AUTHORITY_KEYS, issues)
    if isinstance(authority, dict):
        for key in ("codex_may_promote", "codex_may_authorize_claim", "gpt55_may_authorize_claim", "ci_may_authorize_claim"):
            if authority.get(key) is not False:
                issues.append(f"BLOCKED_AUTHORITY: {key} must be false")
        if authority.get("human_review_required") is not True:
            issues.append("BLOCKED_AUTHORITY: human_review_required must be true")

    claim_control = data.get("claim_control")
    if not isinstance(claim_control, dict):
        issues.append("SCHEMA_INVALID: claim_control must be object")
    else:
        claim_verdict = claim_control.get("claim_verdict")
        if claim_verdict not in ALLOWED_CLAIM_VERDICTS:
            issues.append("BLOCKED_CLAIM_SCOPE: PR10 dry-run claim scope cannot exceed HEALTH_ONLY")
        if claim_control.get("requires_human_claim_decision") is not True:
            issues.append("BLOCKED_CLAIM_SCOPE: requires_human_claim_decision must be true")

    commands = data.get("commands")
    if not isinstance(commands, list) or not commands:
        issues.append("SCHEMA_INVALID: commands must be a non-empty list")
        commands = []
    seen_ids: set[str] = set()
    for index, command in enumerate(commands):
        if not isinstance(command, dict):
            issues.append(f"SCHEMA_INVALID: commands[{index}] must be object")
            continue
        for key in sorted(REQUIRED_COMMAND_KEYS - set(command)):
            issues.append(f"SCHEMA_INVALID: commands[{index}] missing {key}")
        command_id = command.get("command_id")
        if not isinstance(command_id, str) or not command_id.strip():
            issues.append(f"SCHEMA_INVALID: commands[{index}].command_id")
        elif command_id in seen_ids:
            issues.append(f"SCHEMA_INVALID: duplicate command_id {command_id}")
        else:
            seen_ids.add(command_id)
        if command.get("writes_allowed") is not False:
            issues.append(f"BLOCKED_RUNTIME_MUTATION: commands[{index}] writes_allowed must be false")
        if command.get("may_access_holdout") is not False:
            issues.append(f"BLOCKED_HOLDOUT_ACCESS: commands[{index}] may_access_holdout must be false")
        if command.get("may_reset_dataset") is not False:
            issues.append(f"BLOCKED_DATASET_RESET: commands[{index}] may_reset_dataset must be false")
        if command.get("may_make_claim") is not False:
            issues.append(f"BLOCKED_CLAIM_SCOPE: commands[{index}] may_make_claim must be false")

    for text in collect_strings(data):
        lowered = text.lower()
        if any(phrase in lowered for phrase in FORBIDDEN_CLAIM_PHRASES):
            issues.append("BLOCKED_CLAIM_SCOPE: forbidden claim language")
        if any(pattern.lower() in lowered for pattern in FORBIDDEN_PATH_PATTERNS):
            issues.append("BLOCKED_PROTECTED_SURFACE: packet references protected evidence or holdout path")
        if re.search(r"\blatest\.json\b", lowered):
            issues.append("BLOCKED_LATEST_AS_EVIDENCE: packet references latest.json")

    for location_key in ("output_path", "sandbox_output_path"):
        value = data.get(location_key)
        if value is not None and not is_safe_relative_path(value):
            issues.append(f"SCHEMA_INVALID: unsafe {location_key}")

    validate_expected_verdict(data, issues)

    if issues:
        return RuntimeDryRunResult(
            "BLOCKED",
            "INVALID",
            blocking_issues=sorted(set(issues)),
            warnings=warnings,
            parsed_path=str(path),
        )

    return RuntimeDryRunResult(
        "PASS",
        "INCOMPLETE",
        claim_control.get("claim_verdict", "NO_CLAIM_ALLOWED") if isinstance(claim_control, dict) else "NO_CLAIM_ALLOWED",
        warnings=warnings + ["PR10_DRY_RUN_ONLY: no scientific run evidence was created"],
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
        "evidence_verdict": "INCOMPLETE" if all_matched else "INVALID",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "examples_checked": outputs,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PR-10 runtime dry-run packet validator.")
    parser.add_argument("--path", required=True, help="Runtime dry-run packet JSON or examples directory.")
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
