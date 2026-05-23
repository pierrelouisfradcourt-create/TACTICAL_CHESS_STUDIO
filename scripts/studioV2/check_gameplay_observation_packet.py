import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


SCHEMA_VERSION = "pr13b.gameplay_observation_packet.v1"
ALLOWED_PACKET_TYPES = {"GAMEPLAY_OBSERVATION"}
ALLOWED_STATUS = {"non_canonical_observation"}
ALLOWED_THEMES = {"search_behavior_non_converting_positions"}
ALLOWED_SOFTWARE_VERDICTS = {"PASS", "BLOCKED", "UNCERTAIN"}
ALLOWED_EVIDENCE_VERDICTS = {"INCOMPLETE", "INVALID"}
ALLOWED_CLAIM_VERDICTS = {"NO_CLAIM_ALLOWED"}

REQUIRED_TOP_LEVEL_KEYS = {
    "schema_version",
    "packet_type",
    "status",
    "theme",
    "learning_value",
    "discard_if",
    "next_decision_enabled",
    "observation_surface",
    "commands",
    "output_policy",
    "authority_boundaries",
    "claim_control",
    "expected_verdict",
}
REQUIRED_SURFACE_KEYS = {
    "surface_id",
    "surface_path",
    "surface_kind",
    "canonical_evidence",
    "promotion_eligible",
    "contains_holdout",
}
REQUIRED_COMMAND_KEYS = {
    "command_id",
    "command",
    "purpose",
    "required",
    "writes_allowed",
    "writes_path_kind",
    "may_access_holdout",
    "may_reset_dataset",
    "may_update_latest_json",
    "may_create_run_bundle",
    "may_make_claim",
}
REQUIRED_OUTPUT_POLICY_KEYS = {
    "canonical_evidence",
    "output_location_kind",
    "may_write_lab_runs",
    "may_update_latest_json",
    "report_required",
}
REQUIRED_AUTHORITY_KEYS = {
    "codex_may_promote",
    "codex_may_authorize_claim",
    "gpt55_may_authorize_claim",
    "ci_may_authorize_claim",
    "human_review_required",
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
FORBIDDEN_PATH_FRAGMENTS = (
    "holdout/",
    "lab/runs/run_",
    "lab/runs/latest.json",
    "latest.json",
)


@dataclass
class GameplayObservationResult:
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


def validate_nonempty_text(label: str, value: Any, issues: list[str]) -> None:
    if not isinstance(value, str) or not value.strip():
        issues.append(f"SCHEMA_INVALID: {label} must be non-empty string")


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
        issues.append("BLOCKED_CLAIM_SCOPE: expected claim_verdict must remain NO_CLAIM_ALLOWED")


def validate_packet(path: Path) -> GameplayObservationResult:
    issues: list[str] = []
    warnings: list[str] = []

    try:
        data = load_json(path)
    except (OSError, json.JSONDecodeError) as exc:
        return GameplayObservationResult("BLOCKED", "INVALID", blocking_issues=[f"CORRUPT_JSON: {exc}"], parsed_path=str(path))

    if not isinstance(data, dict):
        return GameplayObservationResult("BLOCKED", "INVALID", blocking_issues=["SCHEMA_INVALID: packet must be object"], parsed_path=str(path))

    for key in sorted(REQUIRED_TOP_LEVEL_KEYS - set(data)):
        issues.append(f"SCHEMA_INVALID: missing {key}")

    if data.get("schema_version") != SCHEMA_VERSION:
        issues.append("SCHEMA_INVALID: schema_version")
    if data.get("packet_type") not in ALLOWED_PACKET_TYPES:
        issues.append("SCHEMA_INVALID: packet_type")
    if data.get("status") not in ALLOWED_STATUS:
        issues.append("SCHEMA_INVALID: status")
    if data.get("theme") not in ALLOWED_THEMES:
        issues.append("BLOCKED_SCOPE: only search_behavior_non_converting_positions is allowed in PR13B")

    validate_nonempty_text("learning_value", data.get("learning_value"), issues)
    validate_nonempty_text("discard_if", data.get("discard_if"), issues)
    validate_nonempty_text("next_decision_enabled", data.get("next_decision_enabled"), issues)

    surface = data.get("observation_surface")
    missing_keys("observation_surface", surface, REQUIRED_SURFACE_KEYS, issues)
    if isinstance(surface, dict):
        if surface.get("surface_kind") != "non_canonical_position_set":
            issues.append("BLOCKED_FALSE_EVIDENCE: surface_kind must be non_canonical_position_set")
        if surface.get("canonical_evidence") is not False:
            issues.append("BLOCKED_FALSE_EVIDENCE: observation surface is not canonical evidence")
        if surface.get("promotion_eligible") is not False:
            issues.append("BLOCKED_PROMOTION_AUTHORITY: observation surface is not promotion eligible")
        if surface.get("contains_holdout") is not False:
            issues.append("BLOCKED_HOLDOUT_ACCESS: observation surface must not contain holdout")
        if not is_safe_relative_path(surface.get("surface_path")):
            issues.append("SCHEMA_INVALID: unsafe observation surface_path")

    output_policy = data.get("output_policy")
    missing_keys("output_policy", output_policy, REQUIRED_OUTPUT_POLICY_KEYS, issues)
    if isinstance(output_policy, dict):
        if output_policy.get("canonical_evidence") is not False:
            issues.append("BLOCKED_FALSE_EVIDENCE: output is not canonical evidence")
        if output_policy.get("output_location_kind") != "non_canonical_sandbox":
            issues.append("BLOCKED_FALSE_EVIDENCE: output location must be non_canonical_sandbox")
        if output_policy.get("may_write_lab_runs") is not False:
            issues.append("BLOCKED_REAL_RUN_BUNDLE: observation may not write lab/runs")
        if output_policy.get("may_update_latest_json") is not False:
            issues.append("BLOCKED_LATEST_AS_EVIDENCE: observation may not update latest.json")
        if output_policy.get("report_required") is not True:
            issues.append("SCHEMA_INVALID: report_required must be true")
        output_path = output_policy.get("sandbox_output_path")
        if output_path is not None and not is_safe_relative_path(output_path):
            issues.append("SCHEMA_INVALID: unsafe sandbox_output_path")

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
        if claim_control.get("default_claim_verdict") != "NO_CLAIM_ALLOWED":
            issues.append("BLOCKED_CLAIM_SCOPE: default_claim_verdict must be NO_CLAIM_ALLOWED")
        if claim_control.get("claim_verdict") != "NO_CLAIM_ALLOWED":
            issues.append("BLOCKED_CLAIM_SCOPE: PR13B claim_verdict must be NO_CLAIM_ALLOWED")
        if claim_control.get("human_claim_decision_id") not in (None, ""):
            issues.append("BLOCKED_CLAIM_SCOPE: PR13B must not carry human claim decision id")

    commands = data.get("commands")
    if not isinstance(commands, list) or not commands:
        issues.append("SCHEMA_INVALID: commands must be non-empty list")
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
        if command.get("writes_path_kind") != "none":
            issues.append(f"BLOCKED_RUNTIME_MUTATION: commands[{index}] writes_path_kind must be none")
        if command.get("may_access_holdout") is not False:
            issues.append(f"BLOCKED_HOLDOUT_ACCESS: commands[{index}] may_access_holdout must be false")
        if command.get("may_reset_dataset") is not False:
            issues.append(f"BLOCKED_DATASET_RESET: commands[{index}] may_reset_dataset must be false")
        if command.get("may_update_latest_json") is not False:
            issues.append(f"BLOCKED_LATEST_AS_EVIDENCE: commands[{index}] may_update_latest_json must be false")
        if command.get("may_create_run_bundle") is not False:
            issues.append(f"BLOCKED_REAL_RUN_BUNDLE: commands[{index}] may_create_run_bundle must be false")
        if command.get("may_make_claim") is not False:
            issues.append(f"BLOCKED_CLAIM_SCOPE: commands[{index}] may_make_claim must be false")

    for text in collect_strings(data):
        lowered = text.lower()
        if any(phrase in lowered for phrase in FORBIDDEN_CLAIM_PHRASES):
            issues.append("BLOCKED_CLAIM_SCOPE: forbidden claim language")
        if any(fragment in lowered for fragment in FORBIDDEN_PATH_FRAGMENTS):
            issues.append("BLOCKED_PROTECTED_SURFACE: packet references protected evidence or holdout path")
        if re.search(r"\blatest\.json\b", lowered):
            issues.append("BLOCKED_LATEST_AS_EVIDENCE: packet references latest.json")

    validate_expected_verdict(data, issues)

    if issues:
        return GameplayObservationResult(
            "BLOCKED",
            "INVALID",
            blocking_issues=sorted(set(issues)),
            warnings=warnings,
            parsed_path=str(path),
        )

    return GameplayObservationResult(
        "PASS",
        "INCOMPLETE",
        "NO_CLAIM_ALLOWED",
        warnings=warnings + ["PR13B_OBSERVATION_PACKET_ONLY: no runtime command was executed"],
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
    parser = argparse.ArgumentParser(description="PR-13B gameplay observation packet validator.")
    parser.add_argument("--path", required=True, help="Gameplay observation packet JSON or examples directory.")
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
