import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


SOFTWARE_VERDICTS = {"PASS", "FAIL", "BLOCKED", "UNCERTAIN", "NOT_RUN", "PARSER_ADDED"}
EVIDENCE_VERDICTS = {
    "COMPLETE",
    "INCOMPLETE",
    "INVALID",
    "CORRUPT",
    "CONTAMINATED",
    "UNCERTAIN",
    "CONTRACT_ONLY",
    "BOOTSTRAP_ONLY",
    "MECHANICAL_PARSER_ONLY",
}
CLAIM_VERDICTS = {
    "NO_CLAIM_ALLOWED",
    "HEALTH_ONLY",
    "TARGETED_BEHAVIOR_ONLY",
    "EXPLORATORY_ONLY",
    "PROMOTION_REVIEW_CANDIDATE",
    "STRENGTH_CLAIM_CANDIDATE",
}

REQUIRED_RUN_FILES = (
    "evidence.json",
    "environment.json",
    "git_context.json",
    "artifact_hashes.json",
    "machine_verdict.json",
    "human_decision.json",
    "claim_decision.json",
)
REQUIRED_RUN_DIRS = ("commands", "artifacts")
REQUIRED_MACHINE_VERDICT = (
    "software_verdict",
    "evidence_verdict",
    "claim_verdict",
    "human_review_required",
    "blocking_issues",
    "warnings",
    "policy_refs",
    "schema_version",
)
CONTRACT_EXAMPLE_FILES = (
    "evidence.example.json",
    "machine_verdict.example.json",
    "artifact_hashes.example.json",
)
CONTRACT_EXAMPLE_MARKERS = {
    "CONTRACT_EXAMPLE_ONLY",
    "NOT_A_RUN",
    "NOT_EVIDENCE",
    "NO_CLAIM_ALLOWED",
}
HEX = set("0123456789abcdefABCDEF")
SCHEMA_DIR = Path(__file__).resolve().parents[1] / "lab" / "run_contracts"
SCHEMA_BY_FILE = {
    "evidence.json": "evidence_schema.pr02.json",
    "environment.json": "environment_schema.pr02.json",
    "git_context.json": "git_context_schema.pr02.json",
    "artifact_hashes.json": "artifact_hashes_schema.pr02.json",
    "machine_verdict.json": "machine_verdict_schema.pr02.json",
}
COMMAND_SCHEMA_FILE = "command_record_schema.pr02.json"
COMMAND_COMPLETENESS_KEYS = {
    "exit_code",
    "stdout_path",
    "stderr_path",
    "stdout_sha256",
    "stderr_sha256",
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
)


@dataclass
class ParserResult:
    software_verdict: str
    evidence_verdict: str
    claim_verdict: str
    blocking_issues: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    parsed_path: str = ""

    def failed(self) -> bool:
        return bool(self.blocking_issues) or self.software_verdict in {"FAIL", "BLOCKED"}

    def as_dict(self) -> dict[str, Any]:
        out = {
            "software_verdict": self.software_verdict,
            "evidence_verdict": self.evidence_verdict,
            "claim_verdict": self.claim_verdict,
            "blocking_issues": self.blocking_issues,
            "warnings": self.warnings,
        }
        if self.parsed_path:
            out["parsed_path"] = self.parsed_path
        return out


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def is_sha256(value: Any) -> bool:
    return isinstance(value, str) and len(value) == 64 and all(char in HEX for char in value)


def load_schema(name: str) -> dict[str, Any]:
    data = load_json(SCHEMA_DIR / name)
    if not isinstance(data, dict):
        raise ValueError(f"{name} must be a JSON object")
    return data


def command_shape_schema(schema: dict[str, Any]) -> dict[str, Any]:
    copied = json.loads(json.dumps(schema))
    copied["required"] = [key for key in copied.get("required", []) if key not in COMMAND_COMPLETENESS_KEYS]
    return copied


def json_type_matches(value: Any, expected: str) -> bool:
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    return True


def validate_json_schema_subset(
    value: Any,
    schema: dict[str, Any],
    label: str,
    issues: list[str],
    pointer: str = "$",
) -> None:
    schema_type = schema.get("type")
    if isinstance(schema_type, str) and not json_type_matches(value, schema_type):
        issues.append(f"SCHEMA_INVALID: {label} {pointer} must be {schema_type}")
        return

    if "const" in schema and value != schema["const"]:
        issues.append(f"SCHEMA_INVALID: {label} {pointer} must equal {schema['const']}")
    if "enum" in schema and value not in schema["enum"]:
        issues.append(f"SCHEMA_INVALID: {label} {pointer} not in enum")
    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            issues.append(f"SCHEMA_INVALID: {label} {pointer} below minLength")
        if "pattern" in schema and re.search(schema["pattern"], value) is None:
            issues.append(f"SCHEMA_INVALID: {label} {pointer} pattern")
        not_schema = schema.get("not")
        if isinstance(not_schema, dict) and "pattern" in not_schema and re.search(not_schema["pattern"], value):
            issues.append(f"SCHEMA_INVALID: {label} {pointer} forbidden pattern")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            issues.append(f"SCHEMA_INVALID: {label} {pointer} below minimum")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            issues.append(f"SCHEMA_INVALID: {label} {pointer} below minItems")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                validate_json_schema_subset(item, item_schema, label, issues, f"{pointer}[{index}]")
    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                issues.append(f"SCHEMA_INVALID: {label} missing {key}")
        properties = schema.get("properties", {})
        additional = schema.get("additionalProperties", True)
        for key, item in value.items():
            child_pointer = f"{pointer}.{key}"
            if key in properties:
                validate_json_schema_subset(item, properties[key], label, issues, child_pointer)
            elif additional is False:
                issues.append(f"SCHEMA_INVALID: {label} unexpected {key}")
            elif isinstance(additional, dict):
                validate_json_schema_subset(item, additional, label, issues, child_pointer)


def find_strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            out.extend(find_strings(item))
        return out
    if isinstance(value, dict):
        out = []
        for item in value.values():
            out.extend(find_strings(item))
        return out
    return []


def has_key_recursive(value: Any, forbidden_keys: set[str]) -> bool:
    if isinstance(value, dict):
        for key, item in value.items():
            if key.lower() in forbidden_keys or has_key_recursive(item, forbidden_keys):
                return True
    if isinstance(value, list):
        return any(has_key_recursive(item, forbidden_keys) for item in value)
    return False


def is_latest_path(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    return any(part.lower() == "latest.json" for part in value.replace("\\", "/").split("/"))


def is_relative_safe_path(value: Any) -> bool:
    if not isinstance(value, str) or value == "":
        return False
    if PureWindowsPath(value).is_absolute() or PurePosixPath(value).is_absolute():
        return False
    return ".." not in value.replace("\\", "/").split("/")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


def result(
    software: str,
    evidence: str,
    claim: str = "NO_CLAIM_ALLOWED",
    issues: list[str] | None = None,
    warnings: list[str] | None = None,
    path: Path | None = None,
) -> ParserResult:
    return ParserResult(
        software,
        evidence,
        claim,
        issues or [],
        warnings or [],
        str(path) if path is not None else "",
    )


def parse_contract_example(path: Path) -> ParserResult:
    issues: list[str] = []
    loaded: dict[str, dict[str, Any]] = {}

    for name in CONTRACT_EXAMPLE_FILES:
        file_path = path / name
        if not file_path.is_file():
            issues.append(f"EVIDENCE_INCOMPLETE: missing {name}")
            continue
        try:
            data = load_json(file_path)
        except (OSError, json.JSONDecodeError) as exc:
            issues.append(f"CORRUPT_JSON: {name}: {exc}")
            continue
        if not isinstance(data, dict):
            issues.append(f"SCHEMA_INVALID: {name} must be object")
            continue
        loaded[name] = data

    for name, data in loaded.items():
        if data.get("example_only") is not True:
            issues.append(f"BLOCKED_FALSE_EVIDENCE: {name} missing example_only=true")
        if data.get("not_evidence") is not True:
            issues.append(f"BLOCKED_FALSE_EVIDENCE: {name} missing not_evidence=true")
        if data.get("claim_verdict") != "NO_CLAIM_ALLOWED":
            issues.append(f"BLOCKED_CLAIM_SCOPE: {name} claim_verdict")
        if not CONTRACT_EXAMPLE_MARKERS.issubset(set(data.get("markers", []))):
            issues.append(f"BLOCKED_FALSE_EVIDENCE: {name} missing contract markers")

    machine = loaded.get("machine_verdict.example.json", {})
    for key in REQUIRED_MACHINE_VERDICT:
        if key not in machine:
            issues.append(f"SCHEMA_INVALID: machine_verdict.example.json missing {key}")
    if machine.get("software_verdict") != "NOT_RUN":
        issues.append("SCHEMA_INVALID: contract example software_verdict")
    if machine.get("evidence_verdict") != "CONTRACT_ONLY":
        issues.append("SCHEMA_INVALID: contract example evidence_verdict")
    if machine.get("claim_verdict") != "NO_CLAIM_ALLOWED":
        issues.append("BLOCKED_CLAIM_SCOPE: contract example claim_verdict")

    if issues:
        return result("BLOCKED", "INVALID", issues=issues, path=path)
    return result(
        "NOT_RUN",
        "CONTRACT_ONLY",
        warnings=["CONTRACT_ONLY_EXAMPLE: not run evidence"],
        path=path,
    )


def parse_run_bundle(path: Path) -> ParserResult:
    issues: list[str] = []
    if path.name.lower() == "latest.json":
        return result("BLOCKED", "INVALID", issues=["BLOCKED_LATEST_AS_EVIDENCE"], path=path)
    if not path.is_dir():
        return result("FAIL", "INCOMPLETE", issues=[f"MISSING_BUNDLE_DIRECTORY: {path}"], path=path)
    if not path.name.startswith("RUN_"):
        issues.append("SCHEMA_INVALID: run directory must start with RUN_")

    for name in REQUIRED_RUN_FILES:
        if not (path / name).is_file():
            issues.append(f"EVIDENCE_INCOMPLETE: missing {name}")
    for name in REQUIRED_RUN_DIRS:
        if not (path / name).is_dir():
            issues.append(f"EVIDENCE_INCOMPLETE: missing {name}/")
    if issues:
        return result("FAIL", "INCOMPLETE", issues=issues, path=path)

    loaded: dict[str, dict[str, Any]] = {}
    for name in REQUIRED_RUN_FILES:
        try:
            data = load_json(path / name)
        except (OSError, json.JSONDecodeError) as exc:
            issues.append(f"CORRUPT_JSON: {name}: {exc}")
            continue
        if not isinstance(data, dict):
            issues.append(f"SCHEMA_INVALID: {name} must be JSON object")
            continue
        loaded[name] = data

    command_records: list[dict[str, Any]] = []
    for command_path in sorted((path / "commands").glob("*.json")):
        try:
            data = load_json(command_path)
        except (OSError, json.JSONDecodeError) as exc:
            issues.append(f"CORRUPT_JSON: commands/{command_path.name}: {exc}")
            continue
        if not isinstance(data, dict):
            issues.append(f"SCHEMA_INVALID: commands/{command_path.name} must be JSON object")
            continue
        command_records.append(data)

    try:
        schemas = {name: load_schema(schema_name) for name, schema_name in SCHEMA_BY_FILE.items()}
        command_schema = load_schema(COMMAND_SCHEMA_FILE)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        return result("BLOCKED", "INVALID", issues=[f"SCHEMA_INVALID: parser schema load failed: {exc}"], path=path)

    for name, schema in schemas.items():
        if name in loaded:
            validate_json_schema_subset(loaded[name], schema, name, issues)
    for index, command in enumerate(command_records):
        command_id = command.get("command_id", f"index_{index}")
        validate_json_schema_subset(command, command_shape_schema(command_schema), f"commands/{command_id}", issues)

    if issues and any(issue.startswith("CORRUPT_JSON") for issue in issues):
        return result("FAIL", "CORRUPT", issues=dedupe(issues), path=path)

    machine = loaded.get("machine_verdict.json", {})
    artifact_hashes = loaded.get("artifact_hashes.json", {})
    evidence = loaded.get("evidence.json", {})
    environment = loaded.get("environment.json", {})
    git_context = loaded.get("git_context.json", {})
    human_decision = loaded.get("human_decision.json", {})
    claim_decision = loaded.get("claim_decision.json", {})

    for key in REQUIRED_MACHINE_VERDICT:
        if key not in machine:
            issues.append(f"SCHEMA_INVALID: machine_verdict.json missing {key}")
    if machine.get("software_verdict") not in SOFTWARE_VERDICTS:
        issues.append("SCHEMA_INVALID: software_verdict")
    if machine.get("evidence_verdict") not in EVIDENCE_VERDICTS:
        issues.append("SCHEMA_INVALID: evidence_verdict")
    if machine.get("claim_verdict") not in CLAIM_VERDICTS:
        issues.append("SCHEMA_INVALID: claim_verdict")
    if evidence.get("protocol_time_order_valid") is not True:
        issues.append("INVALID_PROTOCOL")
    if artifact_hashes.get("hash_algorithm") != "sha256":
        issues.append("BLOCKED_WEAK_HASH")
    if not is_sha256(artifact_hashes.get("bundle_hash")):
        issues.append("EVIDENCE_INCOMPLETE: bundle_hash")
    if has_key_recursive(artifact_hashes, {"md5", "sha1"}):
        issues.append("BLOCKED_WEAK_HASH")
    if has_key_recursive(environment, {"environ", "environment_variables", "raw_environment"}):
        issues.append("SCHEMA_INVALID: raw environment dump is forbidden")
    if not isinstance(human_decision, dict):
        issues.append("SCHEMA_INVALID: human_decision.json must be object")
    if not isinstance(claim_decision, dict):
        issues.append("SCHEMA_INVALID: claim_decision.json must be object")
    for value in find_strings(claim_decision):
        lower = value.lower()
        if is_latest_path(value):
            issues.append("BLOCKED_LATEST_AS_EVIDENCE: claim_decision cites latest.json")
        if any(phrase in lower for phrase in FORBIDDEN_CLAIM_PHRASES):
            issues.append("BLOCKED_CLAIM_SCOPE: forbidden claim language")
    if human_decision.get("bundle_modified_after_human_decision") is True:
        issues.append("BLOCKED_RUN_MUTATION")

    for item in artifact_hashes.get("files", []):
        if not isinstance(item, dict):
            issues.append("SCHEMA_INVALID: artifact entry")
            continue
        if not is_sha256(item.get("sha256")):
            issues.append("EVIDENCE_INCOMPLETE: artifact sha256")
        artifact_path = item.get("path")
        if is_latest_path(artifact_path):
            issues.append("BLOCKED_LATEST_AS_EVIDENCE")
        if not is_relative_safe_path(artifact_path):
            issues.append("SCHEMA_INVALID: artifact path must be relative and contained")
            continue
        resolved_artifact = (path / str(artifact_path)).resolve()
        try:
            resolved_artifact.relative_to(path.resolve())
        except ValueError:
            issues.append("SCHEMA_INVALID: artifact path escapes run bundle")
            continue
        if item.get("required") is True:
            if not resolved_artifact.is_file():
                issues.append(f"EVIDENCE_INCOMPLETE: missing artifact {artifact_path}")
            elif is_sha256(item.get("sha256")) and sha256_file(resolved_artifact) != item["sha256"].lower():
                issues.append(f"CORRUPT_ARTIFACT: hash mismatch {artifact_path}")

    command_ids: set[str] = set()
    for command in command_records:
        command_id = command.get("command_id")
        if isinstance(command_id, str):
            if command_id in command_ids:
                issues.append(f"SCHEMA_INVALID: duplicate command_id {command_id}")
            command_ids.add(command_id)
        if "exit_code" not in command:
            issues.append("EVIDENCE_INCOMPLETE: command exit_code")
        if not command.get("stdout_path"):
            issues.append("EVIDENCE_INCOMPLETE: command stdout")
        if not command.get("stderr_path"):
            issues.append("EVIDENCE_INCOMPLETE: command stderr")
        for key in ("stdout_sha256", "stderr_sha256"):
            if not is_sha256(command.get(key)):
                issues.append(f"EVIDENCE_INCOMPLETE: command {key}")

    evidence_commands = evidence.get("commands", [])
    if isinstance(evidence_commands, list):
        if evidence_commands and not command_records:
            issues.append("EVIDENCE_INCOMPLETE: evidence commands without command records")
        command_file_stems = {p.stem for p in (path / "commands").glob("*.json")}
        for command_ref in evidence_commands:
            if isinstance(command_ref, str) and command_ref not in command_ids and command_ref not in command_file_stems:
                issues.append(f"EVIDENCE_INCOMPLETE: missing command record {command_ref}")

    for surface_name, surface in loaded.items():
        for value in find_strings(surface):
            if is_latest_path(value) and surface_name != "git_context.json":
                issues.append(f"BLOCKED_LATEST_AS_EVIDENCE: {surface_name}")

    if git_context.get("dirty_state") == "UNKNOWN" and not git_context.get("untracked_files"):
        issues.append("BLOCKED_CHERRY_PICKING: unknown dirty state without untracked record")

    if machine.get("claim_verdict") != "NO_CLAIM_ALLOWED" and machine.get("evidence_verdict") != "COMPLETE":
        issues.append("BLOCKED_CLAIM_SCOPE: non-complete evidence cannot carry claims")
    if claim_decision.get("claim_verdict") not in (None, machine.get("claim_verdict")):
        issues.append("BLOCKED_CLAIM_SCOPE: claim_decision disagrees with machine_verdict")

    if issues:
        issues = dedupe(issues)
        if any(issue.startswith("CORRUPT") for issue in issues):
            return result("FAIL", "CORRUPT", issues=issues, path=path)
        evidence_verdict = "INVALID" if any("BLOCKED" in issue or "INVALID" in issue for issue in issues) else "INCOMPLETE"
        software_verdict = "BLOCKED" if evidence_verdict == "INVALID" else "FAIL"
        return result(software_verdict, evidence_verdict, issues=issues, path=path)

    return result(
        machine["software_verdict"],
        machine["evidence_verdict"],
        machine["claim_verdict"],
        path=path,
    )


def parse_parser_example_file(path: Path) -> dict[str, Any]:
    data = load_json(path)
    if not isinstance(data, dict):
        actual = result("BLOCKED", "INVALID", issues=["SCHEMA_INVALID: example must be object"], path=path)
        expected = {}
    else:
        expected = data.get("expected_verdict", {})
        case = data.get("case", {})
        if case.get("latest_json_used_as_evidence") is True:
            actual = result("BLOCKED", "INVALID", issues=["BLOCKED_LATEST_AS_EVIDENCE"], path=path)
        elif data.get("case_type") == "missing_claim_verdict":
            actual = result("BLOCKED", "INVALID", issues=["SCHEMA_INVALID: missing claim_verdict"], path=path)
        elif data.get("case_type") == "bad_sha256":
            actual = result("FAIL", "INCOMPLETE", issues=["EVIDENCE_INCOMPLETE: artifact sha256"], path=path)
        elif data.get("case_type") == "valid_contract_only_expected_output":
            actual = result("NOT_RUN", "CONTRACT_ONLY", path=path)
        elif data.get("case_type") == "bad_environment_surface":
            issues: list[str] = []
            environment = case.get("environment", {})
            validate_json_schema_subset(environment, load_schema("environment_schema.pr02.json"), "environment.json", issues)
            if has_key_recursive(environment, {"environ", "environment_variables", "raw_environment"}):
                issues.append("SCHEMA_INVALID: raw environment dump is forbidden")
            actual = result("BLOCKED", "INVALID", issues=issues, path=path)
        elif data.get("case_type") == "bad_git_context_surface":
            issues = []
            validate_json_schema_subset(case.get("git_context", {}), load_schema("git_context_schema.pr02.json"), "git_context.json", issues)
            actual = result("BLOCKED", "INVALID", issues=issues, path=path)
        elif data.get("case_type") == "bad_command_record_surface":
            issues = []
            command = case.get("command_record", {})
            validate_json_schema_subset(command, command_shape_schema(load_schema(COMMAND_SCHEMA_FILE)), "commands/example", issues)
            if "exit_code" not in command:
                issues.append("EVIDENCE_INCOMPLETE: command exit_code")
            if not command.get("stdout_path"):
                issues.append("EVIDENCE_INCOMPLETE: command stdout")
            if not command.get("stderr_path"):
                issues.append("EVIDENCE_INCOMPLETE: command stderr")
            actual = result("FAIL", "INCOMPLETE", issues=issues, path=path)
        elif data.get("case_type") == "claim_decision_latest_reference":
            issues = [
                "BLOCKED_LATEST_AS_EVIDENCE: claim_decision cites latest.json"
                for value in find_strings(case.get("claim_decision", {}))
                if is_latest_path(value)
            ]
            actual = result("BLOCKED", "INVALID", issues=issues, path=path)
        elif data.get("case_type") == "human_decision_bundle_mutation":
            actual = result("BLOCKED", "INVALID", issues=["BLOCKED_RUN_MUTATION"], path=path)
        else:
            actual = result("BLOCKED", "INVALID", issues=["SCHEMA_INVALID: unknown parser example"], path=path)

    matched = (
        actual.software_verdict == expected.get("software_verdict")
        and actual.evidence_verdict == expected.get("evidence_verdict")
        and actual.claim_verdict == expected.get("claim_verdict")
    )
    return {
        "example": path.name,
        "matched_expected": matched,
        "actual": actual.as_dict(),
        "expected_verdict": expected,
    }


def parse_parser_examples(path: Path) -> dict[str, Any]:
    example_files = sorted(p for p in path.glob("*.json") if p.is_file())
    outputs = [parse_parser_example_file(p) for p in example_files]
    all_matched = all(item["matched_expected"] for item in outputs)
    return {
        "software_verdict": "PARSER_ADDED" if all_matched else "BLOCKED",
        "evidence_verdict": "MECHANICAL_PARSER_ONLY" if all_matched else "INVALID",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "examples_checked": outputs,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PR-03 mechanical parser for PR-02 run bundle contracts.")
    parser.add_argument("--path", required=True, help="Run bundle, PR-02 contract example, or parser examples directory.")
    parser.add_argument("--contract-example-mode", action="store_true", help="Parse a PR-02 contract-only example.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    path = Path(args.path)

    if args.contract_example_mode:
        output: dict[str, Any] = parse_contract_example(path).as_dict()
    elif path.is_dir() and any(p.name.startswith("invalid_") or p.name.startswith("valid_") for p in path.glob("*.json")):
        output = parse_parser_examples(path)
    else:
        output = parse_run_bundle(path).as_dict()

    print(json.dumps(output, indent=2 if args.pretty else None, sort_keys=True))
    failed = output.get("software_verdict") in {"FAIL", "BLOCKED"}
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
