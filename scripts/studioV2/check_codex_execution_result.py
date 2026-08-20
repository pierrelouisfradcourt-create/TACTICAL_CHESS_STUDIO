import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from fnmatch import fnmatch
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


DEFAULT_RESULT_PATH = Path(
    "lab/gameplay_observation/codex_execution_result/examples/valid_result.pr19.json"
)
REQUIRED_FIELDS = {
    "schema_version",
    "source_execution_packet",
    "source_prompt_id",
    "codex_pr_url",
    "codex_branch",
    "codex_commit",
    "changed_files",
    "commands_run",
    "command_results",
    "skipped_validation_and_reason",
    "behavior_risk",
    "evidence_risk",
    "claim_risk",
    "software_verdict",
    "evidence_verdict",
    "claim_verdict",
    "human_review_required",
}
FORBIDDEN_TEXT_PATTERNS = (
    re.compile(r"\bbenchmark\b", re.IGNORECASE),
    re.compile(r"\bpromotion\b", re.IGNORECASE),
    re.compile(r"\belo\b", re.IGNORECASE),
    re.compile(r"\bstrength\b", re.IGNORECASE),
    re.compile(r"\bscientific\s+claim\b", re.IGNORECASE),
    re.compile(r"\bscientific\s+proof\b", re.IGNORECASE),
)


@dataclass
class IntakeResult:
    software_verdict: str
    evidence_verdict: str
    claim_verdict: str
    intake_verdict: str
    blocked_reasons: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "software_verdict": self.software_verdict,
            "evidence_verdict": self.evidence_verdict,
            "claim_verdict": self.claim_verdict,
            "intake_verdict": self.intake_verdict,
            "blocked_reasons": sorted(set(self.blocked_reasons)),
            "warnings": sorted(set(self.warnings)),
        }


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def collect_strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        output: list[str] = []
        for item in value:
            output.extend(collect_strings(item))
        return output
    if isinstance(value, dict):
        output = []
        for item in value.values():
            output.extend(collect_strings(item))
        return output
    return []


def normalize_path(raw_path: str) -> str:
    return raw_path.replace("\\", "/").strip().lower()


def is_safe_relative_path(raw_path: str) -> bool:
    candidate = raw_path.replace("\\", "/")
    if PureWindowsPath(candidate).is_absolute() or PurePosixPath(candidate).is_absolute():
        return False
    return ".." not in PurePosixPath(candidate).parts


def is_nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def is_list_of_nonempty_strings(value: Any) -> bool:
    if not isinstance(value, list):
        return False
    return all(is_nonempty_string(item) for item in value)


def matches_any_scope(path: str, scopes: list[str]) -> bool:
    lowered = normalize_path(path)
    for scope in scopes:
        pattern = normalize_path(scope)
        if fnmatch(lowered, pattern):
            return True
        if pattern.endswith("/**") and lowered.startswith(pattern[:-3]):
            return True
    return False


def load_source_prompt_scopes(
    source_execution_packet: str,
    warnings: list[str],
) -> tuple[list[str], list[str]]:
    if not is_safe_relative_path(source_execution_packet):
        warnings.append("SOURCE_PACKET_SKIPPED: source_execution_packet path is unsafe")
        return [], []

    source_path = Path(source_execution_packet)
    if not source_path.exists():
        warnings.append("SOURCE_PACKET_SKIPPED: source_execution_packet does not exist locally")
        return [], []

    try:
        payload = load_json(source_path)
    except (OSError, json.JSONDecodeError) as exc:
        warnings.append(f"SOURCE_PACKET_SKIPPED: cannot parse source_execution_packet ({exc})")
        return [], []

    if not isinstance(payload, dict):
        warnings.append("SOURCE_PACKET_SKIPPED: source_execution_packet is not a JSON object")
        return [], []

    expected_scope = payload.get("expected_changed_files_scope")
    forbidden_files = payload.get("forbidden_files")
    normalized_scope = [entry for entry in expected_scope if is_nonempty_string(entry)] if isinstance(expected_scope, list) else []
    normalized_forbidden = [entry for entry in forbidden_files if is_nonempty_string(entry)] if isinstance(forbidden_files, list) else []
    return normalized_scope, normalized_forbidden


def validate_schema(packet: Any) -> list[str]:
    issues: list[str] = []
    if not isinstance(packet, dict):
        return ["SCHEMA_INVALID: result packet must be a JSON object"]

    for key in sorted(REQUIRED_FIELDS - set(packet)):
        issues.append(f"SCHEMA_INVALID: missing {key}")

    for key in (
        "schema_version",
        "source_execution_packet",
        "source_prompt_id",
        "codex_pr_url",
        "codex_branch",
        "codex_commit",
        "skipped_validation_and_reason",
        "behavior_risk",
        "evidence_risk",
        "claim_risk",
        "software_verdict",
        "evidence_verdict",
        "claim_verdict",
    ):
        if key in packet and not is_nonempty_string(packet.get(key)):
            issues.append(f"SCHEMA_INVALID: {key} must be a non-empty string")

    if "changed_files" in packet and not is_list_of_nonempty_strings(packet.get("changed_files")):
        issues.append("SCHEMA_INVALID: changed_files must be a list of non-empty strings")
    if "commands_run" in packet and not is_list_of_nonempty_strings(packet.get("commands_run")):
        issues.append("SCHEMA_INVALID: commands_run must be a list of non-empty strings")
    if "command_results" in packet and not isinstance(packet.get("command_results"), (list, dict)):
        issues.append("SCHEMA_INVALID: command_results must be a list or object")
    if "human_review_required" in packet and not isinstance(packet.get("human_review_required"), bool):
        issues.append("SCHEMA_INVALID: human_review_required must be true or false")

    return issues


def evaluate_packet(packet: dict[str, Any]) -> IntakeResult:
    blocked_reasons: list[str] = []
    warnings: list[str] = []

    changed_files = packet.get("changed_files", [])
    assert isinstance(changed_files, list)
    changed_files_list = [entry for entry in changed_files if isinstance(entry, str)]

    expected_scope, source_forbidden = load_source_prompt_scopes(
        str(packet.get("source_execution_packet", "")),
        warnings,
    )

    claim_verdict = str(packet.get("claim_verdict", "NO_CLAIM_ALLOWED"))
    if claim_verdict != "NO_CLAIM_ALLOWED":
        blocked_reasons.append("BLOCKED_CLAIM_SCOPE: claim_verdict must be NO_CLAIM_ALLOWED")

    if packet.get("human_review_required") is not True:
        blocked_reasons.append("BLOCKED_HUMAN_REVIEW: human_review_required must be true")

    for changed_path in changed_files_list:
        normalized = normalize_path(changed_path)

        if not is_safe_relative_path(changed_path):
            blocked_reasons.append(f"BLOCKED_PATH_SCOPE: unsafe path {changed_path}")

        if "lab/runs/run_" in normalized or normalized.startswith("lab/runs/"):
            blocked_reasons.append(f"BLOCKED_RUNS_PATH: {changed_path}")
        if "latest.json" in normalized:
            blocked_reasons.append(f"BLOCKED_LATEST_JSON: {changed_path}")
        if "holdout/" in normalized:
            blocked_reasons.append(f"BLOCKED_HOLDOUT_PATH: {changed_path}")

        blocked_patterns: list[tuple[str, bool]] = [
            ("BLOCKED_FORBIDDEN_FILE: src/tool/cli.rs", normalized == "src/tool/cli.rs"),
            ("BLOCKED_ENGINE_SCOPE: engine/search/neural", "engine/search/neural" in normalized),
            ("BLOCKED_WORKFLOW_SCOPE: workflows", "/workflows/" in f"/{normalized}" or normalized.startswith(".github/workflows/")),
            ("BLOCKED_FORBIDDEN_FILE: scripts/parse_run_bundle.py", normalized == "scripts/parse_run_bundle.py"),
            ("BLOCKED_POLICY_SCOPE: policy file", "/policy/" in f"/{normalized}" or normalized.endswith("/policy.rs") or normalized.endswith("/policy.py") or "_policy" in normalized),
            ("BLOCKED_DATASET_RESET_SCOPE: dataset reset path", "dataset_reset" in normalized or "reset_dataset" in normalized or "/datasets/reset" in f"/{normalized}" or "scripts/reset_" in normalized),
        ]

        for reason, is_match in blocked_patterns:
            if not is_match:
                continue
            if matches_any_scope(changed_path, expected_scope):
                warnings.append(f"EXPLICITLY_ALLOWED_BY_SOURCE_PROMPT: {changed_path}")
                continue
            blocked_reasons.append(f"{reason}: {changed_path}")

        for forbidden_entry in source_forbidden:
            forbidden_normalized = normalize_path(forbidden_entry)
            if fnmatch(normalized, forbidden_normalized):
                blocked_reasons.append(
                    f"BLOCKED_SOURCE_PACKET_FORBIDDEN_FILE: {changed_path}"
                )
                break

    for text in collect_strings(packet):
        normalized_text = text.lower()
        if "lab/runs/run_" in normalized_text:
            blocked_reasons.append("BLOCKED_RUNS_PATH: lab/runs/RUN_* reference detected")
        if "latest.json" in normalized_text:
            blocked_reasons.append("BLOCKED_LATEST_JSON: latest.json reference detected")
        if "holdout/" in normalized_text or "holdout\\" in text.lower():
            blocked_reasons.append("BLOCKED_HOLDOUT_PATH: holdout reference detected")
        for pattern in FORBIDDEN_TEXT_PATTERNS:
            if pattern.search(normalized_text):
                blocked_reasons.append("BLOCKED_CLAIM_LANGUAGE: forbidden claim language detected")
                break

    if blocked_reasons:
        return IntakeResult(
            software_verdict=str(packet.get("software_verdict", "BLOCKED")),
            evidence_verdict=str(packet.get("evidence_verdict", "INVALID")),
            claim_verdict=claim_verdict,
            intake_verdict="BLOCKED",
            blocked_reasons=blocked_reasons,
            warnings=warnings,
        )

    return IntakeResult(
        software_verdict=str(packet.get("software_verdict", "PASS")),
        evidence_verdict=str(packet.get("evidence_verdict", "INCOMPLETE")),
        claim_verdict=claim_verdict,
        intake_verdict="PASS",
        blocked_reasons=[],
        warnings=warnings,
    )


def validate_result_packet(path: Path) -> IntakeResult:
    try:
        payload = load_json(path)
    except (OSError, json.JSONDecodeError) as exc:
        return IntakeResult(
            software_verdict="INVALID",
            evidence_verdict="INVALID",
            claim_verdict="NO_CLAIM_ALLOWED",
            intake_verdict="INVALID",
            blocked_reasons=[f"CORRUPT_JSON: {exc}"],
        )

    schema_issues = validate_schema(payload)
    if schema_issues:
        software_verdict = payload.get("software_verdict", "INVALID") if isinstance(payload, dict) else "INVALID"
        evidence_verdict = payload.get("evidence_verdict", "INVALID") if isinstance(payload, dict) else "INVALID"
        claim_verdict = payload.get("claim_verdict", "NO_CLAIM_ALLOWED") if isinstance(payload, dict) else "NO_CLAIM_ALLOWED"
        return IntakeResult(
            software_verdict=str(software_verdict),
            evidence_verdict=str(evidence_verdict),
            claim_verdict=str(claim_verdict),
            intake_verdict="INVALID",
            blocked_reasons=schema_issues,
        )

    assert isinstance(payload, dict)
    return evaluate_packet(payload)


def validate_examples(path: Path) -> dict[str, Any]:
    example_dir = path if path.is_dir() else path.parent
    example_files = sorted(p for p in example_dir.glob("*.json") if p.is_file())
    example_results: list[dict[str, Any]] = []
    mismatch = False
    blocked = False

    for example_path in example_files:
        result = validate_result_packet(example_path)
        actual = result.as_dict()
        expected = None
        try:
            payload = load_json(example_path)
            if isinstance(payload, dict):
                expected = payload.get("expected_intake_verdict")
        except Exception:
            expected = None

        matched = expected in (None, actual["intake_verdict"]) if isinstance(expected, str) else True
        mismatch = mismatch or not matched
        blocked = blocked or actual["intake_verdict"] != "PASS"
        example_results.append(
            {
                "example": str(example_path).replace("\\", "/"),
                "expected_intake_verdict": expected,
                "actual": actual,
                "matched_expected": matched,
            }
        )

    if mismatch:
        top = IntakeResult(
            software_verdict="INVALID",
            evidence_verdict="INVALID",
            claim_verdict="NO_CLAIM_ALLOWED",
            intake_verdict="INVALID",
            blocked_reasons=["EXAMPLE_MISMATCH: expected_intake_verdict mismatch detected"],
        )
    elif blocked:
        top = IntakeResult(
            software_verdict="BLOCKED",
            evidence_verdict="INVALID",
            claim_verdict="NO_CLAIM_ALLOWED",
            intake_verdict="BLOCKED",
            blocked_reasons=["EXAMPLE_SET_CONTAINS_BLOCKED_CASES"],
            warnings=["Example-mode includes intentionally blocked samples."],
        )
    else:
        top = IntakeResult(
            software_verdict="PASS",
            evidence_verdict="INCOMPLETE",
            claim_verdict="NO_CLAIM_ALLOWED",
            intake_verdict="PASS",
        )

    output = top.as_dict()
    output["example_results"] = example_results
    return output


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="PR-19 sandbox-only Codex execution result intake validator."
    )
    parser.add_argument(
        "--result",
        default=str(DEFAULT_RESULT_PATH),
        help="Result packet JSON path (or examples directory when using --example-mode).",
    )
    parser.add_argument(
        "--example-mode",
        action="store_true",
        help="Validate all JSON example files in the target directory.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print output JSON.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    target = Path(args.result)

    if args.example_mode:
        output = validate_examples(target)
    else:
        output = validate_result_packet(target).as_dict()

    print(json.dumps(output, indent=2 if args.pretty else None, sort_keys=True))
    return 1 if output.get("intake_verdict") in {"BLOCKED", "INVALID"} else 0


if __name__ == "__main__":
    raise SystemExit(main())
