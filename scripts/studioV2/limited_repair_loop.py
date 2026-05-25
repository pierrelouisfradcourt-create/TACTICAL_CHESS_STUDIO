import argparse
import fnmatch
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


POLICY_PATH = Path(__file__).resolve().parents[1] / "lab" / "policies" / "repair_policy.lock.json"

REQUIRED_TOP_LEVEL_KEYS = {
    "schema_version",
    "repair_loop_kind",
    "trigger",
    "scope",
    "authority",
    "claim_control",
    "expected_verdict",
}

REQUIRED_TRIGGER_KEYS = {"source", "failed_command", "failure_summary"}
REQUIRED_SCOPE_KEYS = {
    "max_attempts",
    "allowed_paths",
    "modified_files",
    "validation_commands",
    "forbidden_paths_acknowledged",
}
REQUIRED_AUTHORITY_KEYS = {
    "codex_may_edit",
    "codex_may_merge",
    "codex_may_promote",
    "codex_may_modify_policy",
    "codex_may_modify_measurement_surfaces",
    "human_review_required",
}
REQUIRED_CLAIM_KEYS = {"claim_verdict", "forbidden_claim_phrases_acknowledged"}

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
)

ADDITIONAL_REPAIR_FORBIDDEN_PATTERNS = (
    "lab/runs/**",
    "lab/runs/*",
    "lab/gpt_audit/**",
    "lab/gpt_audit/*",
    "00_STUDIO_CONTROL/00_MASTER_DOCS/**",
    "00_STUDIO_CONTROL/00_MASTER_DOCS/*",
)

ALLOWED_SOFTWARE_VERDICTS = {"PASS", "BLOCKED"}
ALLOWED_EVIDENCE_VERDICTS = {"CONTROL_SURFACE_ONLY", "INVALID"}
ALLOWED_CLAIM_VERDICTS = {"NO_CLAIM_ALLOWED"}


@dataclass
class RepairLoopResult:
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

    def failed(self) -> bool:
        return bool(self.blocking_issues) or self.software_verdict == "BLOCKED"


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def normalize_path(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    candidate = value.replace("\\", "/").strip()
    if PureWindowsPath(candidate).is_absolute() or PurePosixPath(candidate).is_absolute():
        return None
    parts = PurePosixPath(candidate).parts
    if ".." in parts:
        return None
    return candidate


def load_repair_policy() -> dict[str, Any]:
    data = load_json(POLICY_PATH)
    if not isinstance(data, dict):
        raise ValueError("repair policy must be a JSON object")
    return data


def path_matches_pattern(path: str, pattern: str) -> bool:
    normalized_pattern = pattern.replace("\\", "/")
    if normalized_pattern.endswith("/**"):
        prefix = normalized_pattern[:-3]
        return path == prefix or path.startswith(prefix + "/")
    if normalized_pattern.endswith("/*"):
        prefix = normalized_pattern[:-2]
        return path.startswith(prefix + "/")
    return fnmatch.fnmatch(path, normalized_pattern)


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
        issues.append("BLOCKED_CLAIM_SCOPE: expected claim_verdict must be NO_CLAIM_ALLOWED")


def validate_repair_plan(path: Path) -> RepairLoopResult:
    issues: list[str] = []
    warnings: list[str] = []

    try:
        data = load_json(path)
    except (OSError, json.JSONDecodeError) as exc:
        return RepairLoopResult(
            "BLOCKED",
            "INVALID",
            blocking_issues=[f"CORRUPT_JSON: {exc}"],
            parsed_path=str(path),
        )

    if not isinstance(data, dict):
        return RepairLoopResult(
            "BLOCKED",
            "INVALID",
            blocking_issues=["SCHEMA_INVALID: repair plan must be object"],
            parsed_path=str(path),
        )

    for key in sorted(REQUIRED_TOP_LEVEL_KEYS - set(data)):
        issues.append(f"SCHEMA_INVALID: missing {key}")

    if data.get("schema_version") != "pr08.limited_repair_loop.v1":
        issues.append("SCHEMA_INVALID: schema_version")
    if data.get("repair_loop_kind") != "policy_bound_limited_repair":
        issues.append("SCHEMA_INVALID: repair_loop_kind")

    trigger = data.get("trigger")
    scope = data.get("scope")
    authority = data.get("authority")
    claim_control = data.get("claim_control")
    missing_keys("trigger", trigger, REQUIRED_TRIGGER_KEYS, issues)
    missing_keys("scope", scope, REQUIRED_SCOPE_KEYS, issues)
    missing_keys("authority", authority, REQUIRED_AUTHORITY_KEYS, issues)
    missing_keys("claim_control", claim_control, REQUIRED_CLAIM_KEYS, issues)
    validate_expected_verdict(data, issues)

    try:
        policy = load_repair_policy()
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        return RepairLoopResult(
            "BLOCKED",
            "INVALID",
            blocking_issues=[f"POLICY_LOAD_FAILED: {exc}"],
            parsed_path=str(path),
        )

    policy_patterns = policy.get("repair_loop_forbidden_paths", [])
    if not isinstance(policy_patterns, list) or not all(isinstance(item, str) for item in policy_patterns):
        issues.append("POLICY_INVALID: repair_loop_forbidden_paths")
        policy_patterns = []
    forbidden_patterns = tuple(policy_patterns) + ADDITIONAL_REPAIR_FORBIDDEN_PATTERNS

    if isinstance(scope, dict):
        max_attempts = scope.get("max_attempts")
        if not isinstance(max_attempts, int) or isinstance(max_attempts, bool) or max_attempts < 1 or max_attempts > 2:
            issues.append("BLOCKED_REPAIR_SCOPE: max_attempts must be 1 or 2")

        allowed_paths_raw = scope.get("allowed_paths", [])
        modified_files_raw = scope.get("modified_files", [])
        validation_commands = scope.get("validation_commands", [])
        if not isinstance(allowed_paths_raw, list) or not allowed_paths_raw:
            issues.append("BLOCKED_REPAIR_SCOPE: allowed_paths must be a non-empty list")
            allowed_paths_raw = []
        if not isinstance(modified_files_raw, list):
            issues.append("SCHEMA_INVALID: modified_files must be list")
            modified_files_raw = []
        if not isinstance(validation_commands, list) or not validation_commands:
            issues.append("BLOCKED_REPAIR_SCOPE: validation_commands must be a non-empty list")
        if scope.get("forbidden_paths_acknowledged") is not True:
            issues.append("BLOCKED_REPAIR_SCOPE: forbidden_paths_acknowledged must be true")

        allowed_paths = []
        for raw_path in allowed_paths_raw:
            normalized = normalize_path(raw_path)
            if normalized is None:
                issues.append(f"SCHEMA_INVALID: unsafe allowed path {raw_path!r}")
            else:
                allowed_paths.append(normalized)

        for raw_path in modified_files_raw:
            normalized = normalize_path(raw_path)
            if normalized is None:
                issues.append(f"SCHEMA_INVALID: unsafe modified path {raw_path!r}")
                continue
            for pattern in forbidden_patterns:
                if path_matches_pattern(normalized, pattern):
                    issues.append(f"BLOCKED_FORBIDDEN_REPAIR_PATH: {normalized} matches {pattern}")
            if allowed_paths and not any(
                normalized == allowed or normalized.startswith(allowed.rstrip("/") + "/")
                for allowed in allowed_paths
            ):
                issues.append(f"BLOCKED_REPAIR_SCOPE: {normalized} outside allowed_paths")

    if isinstance(authority, dict):
        if authority.get("codex_may_edit") is not True:
            issues.append("BLOCKED_AUTHORITY: codex_may_edit must be true for a repair attempt")
        for key in (
            "codex_may_merge",
            "codex_may_promote",
            "codex_may_modify_policy",
            "codex_may_modify_measurement_surfaces",
        ):
            if authority.get(key) is not False:
                issues.append(f"BLOCKED_AUTHORITY: {key} must be false")
        if authority.get("human_review_required") is not True:
            issues.append("BLOCKED_AUTHORITY: human_review_required must be true")

    if isinstance(claim_control, dict):
        if claim_control.get("claim_verdict") != "NO_CLAIM_ALLOWED":
            issues.append("BLOCKED_CLAIM_SCOPE: claim_verdict must be NO_CLAIM_ALLOWED")
        if claim_control.get("forbidden_claim_phrases_acknowledged") is not True:
            issues.append("BLOCKED_CLAIM_SCOPE: forbidden claim phrases not acknowledged")

    for text in collect_strings(data):
        lowered = text.lower()
        if any(phrase in lowered for phrase in FORBIDDEN_CLAIM_PHRASES):
            issues.append("BLOCKED_CLAIM_SCOPE: forbidden claim language")
        if re.search(r"\blatest\.json\b", lowered):
            issues.append("BLOCKED_LATEST_AS_EVIDENCE: repair plan cites latest.json")

    if issues:
        return RepairLoopResult(
            "BLOCKED",
            "INVALID",
            blocking_issues=sorted(set(issues)),
            warnings=warnings,
            parsed_path=str(path),
        )

    return RepairLoopResult(
        "PASS",
        "CONTROL_SURFACE_ONLY",
        warnings=["PR08_CONTROL_SURFACE_ONLY: no repair was executed"],
        parsed_path=str(path),
    )


def validate_examples(path: Path) -> dict[str, Any]:
    example_files = sorted(p for p in path.glob("*.json") if p.is_file())
    outputs = []
    all_matched = True
    for example in example_files:
        data = load_json(example)
        expected = data.get("expected_verdict", {}) if isinstance(data, dict) else {}
        actual = validate_repair_plan(example).as_dict()
        matched = (
            actual.get("software_verdict") == expected.get("software_verdict")
            and actual.get("evidence_verdict") == expected.get("evidence_verdict")
            and actual.get("claim_verdict") == expected.get("claim_verdict")
        )
        all_matched = all_matched and matched
        outputs.append(
            {
                "example": example.name,
                "matched_expected": matched,
                "actual": actual,
                "expected_verdict": expected,
            }
        )
    return {
        "software_verdict": "PASS" if all_matched else "BLOCKED",
        "evidence_verdict": "CONTROL_SURFACE_ONLY" if all_matched else "INVALID",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "examples_checked": outputs,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PR-08 policy-bound limited repair loop validator.")
    parser.add_argument("--path", required=True, help="Repair plan JSON or examples directory.")
    parser.add_argument("--example-mode", action="store_true", help="Validate example files against embedded expected verdicts.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    path = Path(args.path)
    if args.example_mode:
        output = validate_examples(path)
    else:
        output = validate_repair_plan(path).as_dict()
    print(json.dumps(output, indent=2 if args.pretty else None, sort_keys=True))
    return 1 if output.get("software_verdict") == "BLOCKED" else 0


if __name__ == "__main__":
    raise SystemExit(main())
