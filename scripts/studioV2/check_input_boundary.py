import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


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
COMMAND_REQUIRED_FIELDS = (
    "command_id",
    "name",
    "cmd",
    "started_at",
    "ended_at",
    "duration_sec",
    "exit_code",
    "stdout_path",
    "stderr_path",
    "stdout_sha256",
    "stderr_sha256",
    "working_directory",
    "environment_snapshot_ref",
    "allowed_failure",
)
HASH_EXEMPT_FILES = {"artifact_hashes.json"}
HEX = set("0123456789abcdefABCDEF")
SECRET_MARKERS = ("BEGIN PRIVATE KEY", "api_key", "password", "secret", "token")
HOLDOUT_EXPOSURE_KEYS = {
    "holdout_position",
    "holdout_positions",
    "holdout_hash",
    "holdout_hashes",
    "holdout_ids",
    "fen",
    "move_list",
}
ALLOWED_HOLDOUT_KEYS = {"holdout_set_id"}


@dataclass
class GateResult:
    software_verdict: str
    evidence_verdict: str
    claim_verdict: str = "NO_CLAIM_ALLOWED"
    gate_verdict: str = ""
    blocking_issues: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    gated_path: str = ""

    def as_dict(self) -> dict[str, Any]:
        output = {
            "software_verdict": self.software_verdict,
            "evidence_verdict": self.evidence_verdict,
            "claim_verdict": self.claim_verdict,
        }
        if self.gate_verdict:
            output["gate_verdict"] = self.gate_verdict
        output["blocking_issues"] = self.blocking_issues
        output["warnings"] = self.warnings
        if self.gated_path:
            output["gated_path"] = self.gated_path
        return output


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def is_sha256(value: Any) -> bool:
    return isinstance(value, str) and len(value) == 64 and all(char in HEX for char in value)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_time(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def is_latest_path(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    return any(part.lower() == "latest.json" for part in value.replace("\\", "/").split("/"))


def path_issue(value: Any) -> str | None:
    if not isinstance(value, str) or value == "":
        return "EVIDENCE_INCOMPLETE"
    if is_latest_path(value):
        return "BLOCKED_LATEST_AS_EVIDENCE"
    normalized = value.replace("\\", "/").split("/")
    if ".." in normalized:
        return "BLOCKED_PATH_TRAVERSAL"
    if PureWindowsPath(value).is_absolute() or PurePosixPath(value).is_absolute():
        return "BLOCKED_PATH_TRAVERSAL"
    return None


def is_relative_safe_path(value: Any) -> bool:
    return path_issue(value) is None


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


def walk_json(value: Any, path: tuple[str, ...] = ()) -> list[tuple[tuple[str, ...], Any]]:
    out = [(path, value)]
    if isinstance(value, dict):
        for key, item in value.items():
            out.extend(walk_json(item, path + (str(key),)))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            out.extend(walk_json(item, path + (str(index),)))
    return out


def dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            output.append(item)
    return output


def result(
    software: str,
    evidence: str,
    gate: str,
    issues: list[str] | None = None,
    warnings: list[str] | None = None,
    path: Path | None = None,
) -> GateResult:
    return GateResult(
        software_verdict=software,
        evidence_verdict=evidence,
        gate_verdict=gate,
        blocking_issues=dedupe(issues or []),
        warnings=dedupe(warnings or []),
        gated_path=str(path) if path is not None else "",
    )


def gate_from_issues(issues: list[str]) -> str:
    if not issues:
        return "INPUT_BOUNDARY_AND_TAMPERING_PASSED"
    priority = (
        "INVALID_PROTOCOL",
        "EVIDENCE_INCOMPLETE",
        "BLOCKED_LATEST_AS_EVIDENCE",
        "BLOCKED_UNDECLARED_CRITICAL_READ",
        "BLOCKED_UNDECLARED_WRITE",
        "BLOCKED_WEAK_HASH",
        "BLOCKED_RUN_MUTATION",
        "BLOCKED_RUN_COMPLETENESS_UNKNOWN",
        "BLOCKED_SECRET_LEAK",
        "BLOCKED_HOLDOUT_EXPOSURE",
        "BLOCKED_PATH_TRAVERSAL",
        "BLOCKED_SYMLINK_ESCAPE",
    )
    for name in priority:
        if any(issue.startswith(name) for issue in issues):
            return name
    return "INPUT_BOUNDARY_FAILED"


def bundle_files(bundle_path: Path, issues: list[str], warnings: list[str]) -> dict[str, Path]:
    files: dict[str, Path] = {}
    base = bundle_path.resolve()
    try:
        items = sorted(bundle_path.rglob("*"))
    except OSError:
        warnings.append("UNCERTAIN_SYMLINK_CHECK")
        return files
    for item in items:
        try:
            if item.is_symlink():
                try:
                    item.resolve().relative_to(base)
                except (OSError, ValueError):
                    issues.append(f"BLOCKED_SYMLINK_ESCAPE: {item}")
                continue
            if item.is_dir():
                continue
            if item.is_file():
                resolved = item.resolve()
                try:
                    resolved.relative_to(base)
                except ValueError:
                    issues.append(f"BLOCKED_SYMLINK_ESCAPE: {item}")
                    continue
                rel = item.relative_to(bundle_path).as_posix()
                files[rel] = item
        except OSError:
            warnings.append("UNCERTAIN_SYMLINK_CHECK")
    return files


def canonical_bundle_hash(files: dict[str, Path]) -> str:
    digest = hashlib.sha256()
    for rel_path, file_path in sorted(files.items()):
        if rel_path in HASH_EXEMPT_FILES:
            continue
        file_hash = sha256_file(file_path)
        size_bytes = file_path.stat().st_size
        digest.update(rel_path.encode("utf-8"))
        digest.update(b"\0")
        digest.update(file_hash.encode("ascii"))
        digest.update(b"\0")
        digest.update(str(size_bytes).encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest()


def resolved_inside(base: Path, value: str) -> bool:
    try:
        (base / value).resolve().relative_to(base.resolve())
        return True
    except (OSError, ValueError):
        return False


def safe_json_path_for_read(base: Path, candidate: Path, label: str, issues: list[str], warnings: list[str]) -> bool:
    try:
        base_resolved = base.resolve(strict=True)
    except OSError:
        warnings.append("UNCERTAIN_SYMLINK_CHECK")
        return False
    if not candidate.exists() and not candidate.is_symlink():
        issues.append(f"EVIDENCE_INCOMPLETE: missing {label}")
        return False
    try:
        resolved = candidate.resolve(strict=True)
    except OSError:
        warnings.append("UNCERTAIN_SYMLINK_CHECK")
        return False
    try:
        resolved.relative_to(base_resolved)
    except ValueError:
        issues.append(f"BLOCKED_SYMLINK_ESCAPE: {label}")
        return False
    if not candidate.is_file():
        issues.append(f"EVIDENCE_INCOMPLETE: missing {label}")
        return False
    return True


def safe_dir_for_scan(base: Path, candidate: Path, label: str, issues: list[str], warnings: list[str]) -> bool:
    try:
        base_resolved = base.resolve(strict=True)
    except OSError:
        warnings.append("UNCERTAIN_SYMLINK_CHECK")
        return False
    if not candidate.exists() and not candidate.is_symlink():
        issues.append(f"EVIDENCE_INCOMPLETE: missing {label}/")
        return False
    try:
        resolved = candidate.resolve(strict=True)
    except OSError:
        warnings.append("UNCERTAIN_SYMLINK_CHECK")
        return False
    try:
        resolved.relative_to(base_resolved)
    except ValueError:
        issues.append(f"BLOCKED_SYMLINK_ESCAPE: {label}/")
        return False
    if not candidate.is_dir():
        issues.append(f"EVIDENCE_INCOMPLETE: missing {label}/")
        return False
    return True


def check_boundary_paths(label: str, values: Any, issues: list[str]) -> None:
    if not isinstance(values, list):
        issues.append(f"EVIDENCE_INCOMPLETE: missing or invalid {label}")
        return
    for value in values:
        issue = path_issue(value)
        if issue:
            issues.append(f"{issue}: {label}")


def check_json_markers(label: str, value: Any, issues: list[str]) -> None:
    for json_path, item in walk_json(value):
        if isinstance(item, str):
            if is_latest_path(item):
                issues.append(f"BLOCKED_LATEST_AS_EVIDENCE: {label}")
            lowered = item.lower()
            if any(marker.lower() in lowered for marker in SECRET_MARKERS):
                issues.append(f"BLOCKED_SECRET_LEAK: {label}")
            tokens = set(re.findall(r"[a-z0-9_]+", lowered))
            if tokens.intersection(HOLDOUT_EXPOSURE_KEYS):
                issues.append(f"BLOCKED_HOLDOUT_EXPOSURE: {label}")
        if json_path:
            key = json_path[-1]
            if key in HOLDOUT_EXPOSURE_KEYS:
                issues.append(f"BLOCKED_HOLDOUT_EXPOSURE: {label}")


def check_protocol_timing(evidence: dict[str, Any], commands: list[dict[str, Any]], issues: list[str]) -> None:
    protocol_time = parse_time(evidence.get("protocol_lock_created_at"))
    command_times = [parse_time(command.get("started_at")) for command in commands]
    command_times = [item for item in command_times if item is not None]
    first_command = min(command_times) if command_times else parse_time(evidence.get("first_command_started_at"))
    if protocol_time is not None and first_command is not None and protocol_time >= first_command:
        issues.append("INVALID_PROTOCOL: protocol_lock_created_at must be before first_command_started_at")


def check_discard_reason(surface: dict[str, Any], label: str, issues: list[str]) -> None:
    status = str(surface.get("bundle_status", surface.get("status", ""))).upper()
    if status == "DISCARDED":
        reason = surface.get("discard_reason", surface.get("reason", ""))
        if not isinstance(reason, str) or not reason.strip():
            issues.append(f"BLOCKED_RUN_COMPLETENESS_UNKNOWN: discarded {label} requires reason")


def check_modified_after_decision(loaded: dict[str, dict[str, Any]], commands: list[dict[str, Any]], artifact_entries: list[dict[str, Any]], issues: list[str]) -> None:
    decided_at = parse_time(loaded.get("human_decision.json", {}).get("decided_at"))
    if decided_at is None:
        return
    surfaces: list[tuple[str, Any]] = []
    surfaces.extend((name, data) for name, data in loaded.items())
    surfaces.extend((f"commands/{index}", data) for index, data in enumerate(commands))
    surfaces.extend((f"artifact_hashes.files/{index}", data) for index, data in enumerate(artifact_entries))
    for label, surface in surfaces:
        if not isinstance(surface, dict):
            continue
        modified_at = parse_time(surface.get("modified_at"))
        if modified_at is not None and modified_at > decided_at:
            issues.append(f"BLOCKED_RUN_MUTATION: {label} modified after human_decision")


def load_command_records(path: Path, issues: list[str], warnings: list[str]) -> list[dict[str, Any]]:
    commands: list[dict[str, Any]] = []
    commands_dir = path / "commands"
    if not safe_dir_for_scan(path, commands_dir, "commands", issues, warnings):
        return commands
    for command_path in sorted(commands_dir.glob("*.json")):
        if path_issue(command_path.name):
            issues.append(f"BLOCKED_PATH_TRAVERSAL: commands/{command_path.name}")
            continue
        if not safe_json_path_for_read(path, command_path, f"commands/{command_path.name}", issues, warnings):
            continue
        try:
            command = load_json(command_path)
        except (OSError, json.JSONDecodeError) as exc:
            issues.append(f"CORRUPT_JSON: commands/{command_path.name}: {exc}")
            continue
        if not isinstance(command, dict):
            issues.append(f"SCHEMA_INVALID: commands/{command_path.name} must be JSON object")
            continue
        command["_record_path"] = f"commands/{command_path.name}"
        commands.append(command)
    return commands


def check_command_record(command: dict[str, Any], declared_paths: set[str], path: Path, issues: list[str]) -> None:
    label = str(command.get("_record_path", "commands/*.json"))
    for field_name in COMMAND_REQUIRED_FIELDS:
        if field_name not in command:
            issues.append(f"EVIDENCE_INCOMPLETE: missing {field_name} in {label}")

    if "duration_sec" in command and not isinstance(command.get("duration_sec"), (int, float)):
        issues.append(f"EVIDENCE_INCOMPLETE: invalid duration_sec in {label}")

    for key in ("stdout_path", "stderr_path"):
        command_artifact = command.get(key)
        issue = path_issue(command_artifact)
        if issue:
            issues.append(f"{issue}: command {key}")
        else:
            rel_path = str(command_artifact).replace("\\", "/")
            if not resolved_inside(path, rel_path):
                issues.append(f"BLOCKED_PATH_TRAVERSAL: command {key}")
            elif rel_path not in declared_paths:
                issues.append(f"EVIDENCE_INCOMPLETE: command {key} is not declared in artifact_hashes")

    for path_key, hash_key in (("stdout_path", "stdout_sha256"), ("stderr_path", "stderr_sha256")):
        if hash_key in command and not is_sha256(command.get(hash_key)):
            issues.append(f"EVIDENCE_INCOMPLETE: invalid {hash_key} in {label}")
        command_artifact = command.get(path_key)
        if is_relative_safe_path(command_artifact) and is_sha256(command.get(hash_key)):
            command_file = path / str(command_artifact)
            if command_file.is_file() and sha256_file(command_file) != str(command[hash_key]).lower():
                issues.append(f"BLOCKED_TAMPERING: command {hash_key} mismatch")


def check_input_boundary(path: Path) -> GateResult:
    issues: list[str] = []
    warnings: list[str] = []

    if path.name.lower() == "latest.json" or is_latest_path(str(path)):
        return result(
            "BLOCKED",
            "INVALID",
            "BLOCKED_LATEST_AS_EVIDENCE",
            issues=["BLOCKED_LATEST_AS_EVIDENCE: latest.json cannot enter the gate as evidence"],
            path=path,
        )
    try:
        if path.is_symlink():
            issues.append("BLOCKED_SYMLINK_ESCAPE: gated path is a symlink")
    except OSError:
        warnings.append("UNCERTAIN_SYMLINK_CHECK")
    if not path.is_dir():
        return result(
            "FAIL",
            "INCOMPLETE",
            "MISSING_BUNDLE_DIRECTORY",
            issues=[f"MISSING_BUNDLE_DIRECTORY: {path}"],
            warnings=warnings,
            path=path,
        )
    if not path.name.startswith("RUN_"):
        issues.append("BLOCKED_PATH_TRAVERSAL: run directory must start with RUN_")

    safe_required_files: dict[str, Path] = {}
    for name in REQUIRED_RUN_FILES:
        candidate = path / name
        if safe_json_path_for_read(path, candidate, name, issues, warnings):
            safe_required_files[name] = candidate
    for name in REQUIRED_RUN_DIRS:
        safe_dir_for_scan(path, path / name, name, issues, warnings)
    if issues:
        return result("BLOCKED", "INVALID", gate_from_issues(issues), issues=issues, warnings=warnings, path=path)

    loaded: dict[str, dict[str, Any]] = {}
    for name, safe_path in safe_required_files.items():
        try:
            data = load_json(safe_path)
        except (OSError, json.JSONDecodeError) as exc:
            issues.append(f"CORRUPT_JSON: {name}: {exc}")
            continue
        if not isinstance(data, dict):
            issues.append(f"SCHEMA_INVALID: {name} must be JSON object")
            continue
        loaded[name] = data
        check_json_markers(name, data, issues)
    if issues:
        return result("BLOCKED", "INVALID", gate_from_issues(issues), issues=issues, warnings=warnings, path=path)

    evidence = loaded.get("evidence.json", {})
    for field_name in ("critical_reads", "critical_writes", "undeclared_critical_reads", "undeclared_writes"):
        if field_name not in evidence:
            issues.append(f"EVIDENCE_INCOMPLETE: missing {field_name} in evidence.json")
    check_boundary_paths("critical_reads", evidence.get("critical_reads", []), issues)
    check_boundary_paths("critical_writes", evidence.get("critical_writes", []), issues)
    if evidence.get("undeclared_critical_reads"):
        issues.append("BLOCKED_UNDECLARED_CRITICAL_READ: undeclared_critical_reads must be empty")
    if evidence.get("undeclared_writes"):
        issues.append("BLOCKED_UNDECLARED_WRITE: undeclared_writes must be empty")
    check_discard_reason(evidence, "evidence.json", issues)

    git_context = loaded.get("git_context.json", {})
    if "dirty_state" not in git_context:
        issues.append("EVIDENCE_INCOMPLETE: missing dirty_state in git_context.json")
    elif str(git_context.get("dirty_state")).upper() == "UNKNOWN":
        warnings.append("DIRTY_STATE_UNKNOWN: git_context.json")

    for name in ("machine_verdict.json", "human_decision.json", "claim_decision.json"):
        check_discard_reason(loaded.get(name, {}), name, issues)

    files = bundle_files(path, issues, warnings)
    artifact_hashes = loaded.get("artifact_hashes.json", {})
    algorithm = str(artifact_hashes.get("hash_algorithm", "")).lower()
    if algorithm and algorithm != "sha256":
        issues.append("BLOCKED_WEAK_HASH: artifact_hashes must use sha256")
    elif not algorithm:
        issues.append("EVIDENCE_INCOMPLETE: missing hash_algorithm in artifact_hashes.json")
    if not is_sha256(artifact_hashes.get("bundle_hash")):
        issues.append("EVIDENCE_INCOMPLETE: bundle_hash must be 64 hex sha256")
    if "diff_patch_sha256" in artifact_hashes and not is_sha256(artifact_hashes.get("diff_patch_sha256")):
        issues.append("EVIDENCE_INCOMPLETE: diff_patch_sha256 must be 64 hex sha256")
    artifact_entries = artifact_hashes.get("files", [])
    if not isinstance(artifact_entries, list):
        issues.append("SCHEMA_INVALID: artifact_hashes.files must be a list")
        artifact_entries = []

    declared_paths: set[str] = set()
    for entry in artifact_entries:
        if not isinstance(entry, dict):
            issues.append("SCHEMA_INVALID: artifact entry must be object")
            continue
        check_json_markers("artifact_hashes.files", entry, issues)
        artifact_path = entry.get("path")
        issue = path_issue(artifact_path)
        if issue:
            issues.append(f"{issue}: artifact path")
            continue
        rel_path = str(artifact_path).replace("\\", "/")
        if rel_path in declared_paths:
            issues.append(f"BLOCKED_TAMPERING: duplicate artifact path {rel_path}")
        declared_paths.add(rel_path)
        if not resolved_inside(path, rel_path):
            issues.append(f"BLOCKED_PATH_TRAVERSAL: artifact path escapes bundle {rel_path}")
            continue
        file_path = path / rel_path
        if not file_path.is_file():
            if entry.get("required") is True:
                issues.append(f"EVIDENCE_INCOMPLETE: missing required artifact {rel_path}")
            else:
                warnings.append(f"OPTIONAL_ARTIFACT_MISSING: {rel_path}")
            continue
        if not is_sha256(entry.get("sha256")):
            issues.append(f"EVIDENCE_INCOMPLETE: artifact sha256 invalid {rel_path}")
        elif sha256_file(file_path) != str(entry["sha256"]).lower():
            issues.append(f"BLOCKED_TAMPERING: hash mismatch {rel_path}")
        if not isinstance(entry.get("size_bytes"), int) or entry.get("size_bytes") < 0:
            issues.append(f"BLOCKED_TAMPERING: artifact size invalid {rel_path}")
        elif file_path.stat().st_size != entry["size_bytes"]:
            issues.append(f"BLOCKED_TAMPERING: size mismatch {rel_path}")
        if "diff_patch_sha256" in entry and not is_sha256(entry.get("diff_patch_sha256")):
            issues.append(f"EVIDENCE_INCOMPLETE: diff_patch_sha256 invalid {rel_path}")

    for rel_path in files:
        if rel_path in HASH_EXEMPT_FILES:
            continue
        if rel_path not in declared_paths:
            issues.append(f"BLOCKED_TAMPERING: undeclared bundle file {rel_path}")

    commands = load_command_records(path, issues, warnings)
    for command in commands:
        check_json_markers(str(command.get("_record_path", "commands/*.json")), command, issues)
        check_command_record(command, declared_paths, path, issues)

    check_protocol_timing(evidence, commands, issues)
    check_modified_after_decision(loaded, commands, [entry for entry in artifact_entries if isinstance(entry, dict)], issues)

    if not issues and canonical_bundle_hash(files) != str(artifact_hashes["bundle_hash"]).lower():
        issues.append("BLOCKED_TAMPERING: bundle_hash mismatch")

    if issues:
        return result("BLOCKED", "INVALID", gate_from_issues(issues), issues=issues, warnings=warnings, path=path)

    return result(
        "PASS",
        "COMPLETE",
        "INPUT_BOUNDARY_AND_TAMPERING_PASSED",
        warnings=warnings,
        path=path,
    )


def check_example_case(case_type: str, case: dict[str, Any]) -> GateResult:
    issues: list[str] = []
    warnings: list[str] = []

    if case_type in {"valid_contract_only_expected_output", "valid_gate_contract_only_expected_output"}:
        return result("GATE_ADDED", "MECHANICAL_GATE_ONLY", "PR04_GATE_CONTRACT_ADDED")

    check_json_markers("example", case, issues)

    if case_type == "protocol_created_after_first_command":
        evidence = {
            "protocol_lock_created_at": case.get("protocol_lock_created_at"),
            "first_command_started_at": case.get("first_command_started_at"),
        }
        check_protocol_timing(evidence, [], issues)
    elif case_type in {"latest_json_used_as_evidence", "latest_pointer_as_input"}:
        for value in find_strings(case):
            if is_latest_path(value):
                issues.append("BLOCKED_LATEST_AS_EVIDENCE: example")
    elif case_type == "undeclared_critical_read":
        if case.get("undeclared_critical_reads"):
            issues.append("BLOCKED_UNDECLARED_CRITICAL_READ: undeclared_critical_reads must be empty")
    elif case_type == "undeclared_write":
        if case.get("undeclared_writes"):
            issues.append("BLOCKED_UNDECLARED_WRITE: undeclared_writes must be empty")
    elif case_type == "command_record_without_exit_code":
        check_command_record(case.get("command", {}), set(), Path("."), issues)
    elif case_type == "command_record_without_stdout":
        check_command_record(case.get("command", {}), set(), Path("."), issues)
    elif case_type == "command_record_without_stderr":
        check_command_record(case.get("command", {}), set(), Path("."), issues)
    elif case_type == "command_record_without_stdout_sha256":
        check_command_record(case.get("command", {}), set(), Path("."), issues)
    elif case_type == "command_record_without_stderr_sha256":
        check_command_record(case.get("command", {}), set(), Path("."), issues)
    elif case_type == "command_record_without_duration_sec":
        check_command_record(case.get("command", {}), set(), Path("."), issues)
    elif case_type in {"artifact_without_sha256", "bad_hash", "hash_mismatch"}:
        if not is_sha256(case.get("sha256")):
            issues.append("EVIDENCE_INCOMPLETE: artifact sha256 invalid")
    elif case_type == "artifact_hashes_uses_md5":
        if str(case.get("hash_algorithm", "")).lower() != "sha256":
            issues.append("BLOCKED_WEAK_HASH: artifact_hashes must use sha256")
    elif case_type == "run_bundle_modified_after_human_decision":
        loaded = {"human_decision.json": {"decided_at": case.get("decided_at")}, "evidence.json": {"modified_at": case.get("modified_at")}}
        check_modified_after_decision(loaded, [], [], issues)
    elif case_type == "discarded_run_without_reason":
        check_discard_reason(case, "example", issues)
    elif case_type in {"path_traversal_attempt", "path_escape"}:
        issue = path_issue(case.get("path", case.get("artifact_path")))
        if issue:
            issues.append(f"{issue}: example")
    elif case_type == "symlink_escape_attempt":
        if case.get("symlink_target_outside_bundle") is True:
            issues.append("BLOCKED_SYMLINK_ESCAPE: example")
        else:
            warnings.append("UNCERTAIN_SYMLINK_CHECK")
    elif case_type == "secret_in_payload":
        if not any(issue.startswith("BLOCKED_SECRET_LEAK") for issue in issues):
            issues.append("BLOCKED_SECRET_LEAK: example")
    elif case_type == "holdout_content_exposed":
        if not any(issue.startswith("BLOCKED_HOLDOUT_EXPOSURE") for issue in issues):
            issues.append("BLOCKED_HOLDOUT_EXPOSURE: example")
    else:
        issues.append(f"SCHEMA_INVALID: unknown gate example {case_type}")

    if issues:
        return result("BLOCKED", "INVALID", gate_from_issues(issues), issues=issues, warnings=warnings)
    return result("PASS", "COMPLETE", "INPUT_BOUNDARY_AND_TAMPERING_PASSED", warnings=warnings)


def parse_gate_example_file(path: Path) -> dict[str, Any]:
    try:
        data = load_json(path)
    except (OSError, json.JSONDecodeError) as exc:
        actual = result("BLOCKED", "INVALID", "CORRUPT_GATE_EXAMPLE", issues=[f"CORRUPT_JSON: {exc}"])
        expected: dict[str, Any] = {}
    else:
        if not isinstance(data, dict):
            actual = result("BLOCKED", "INVALID", "CORRUPT_GATE_EXAMPLE", issues=["SCHEMA_INVALID: example must be object"])
            expected = {}
        else:
            expected = data.get("expected_verdict", {})
            case = data.get("case", {})
            if not isinstance(case, dict):
                case = {}
            actual = check_example_case(str(data.get("case_type", "")), case)

    expected_issues = expected.get("blocking_issues", []) if isinstance(expected, dict) else []
    matched_issues = all(
        any(str(actual_issue).startswith(str(expected_issue)) for actual_issue in actual.blocking_issues)
        for expected_issue in expected_issues
    )
    matched = (
        actual.software_verdict == expected.get("software_verdict")
        and actual.evidence_verdict == expected.get("evidence_verdict")
        and actual.claim_verdict == expected.get("claim_verdict")
        and (not expected.get("gate_verdict") or actual.gate_verdict == expected.get("gate_verdict"))
        and matched_issues
    )
    return {
        "example": path.name,
        "matched_expected": matched,
        "actual": actual.as_dict(),
        "expected_verdict": expected,
    }


def parse_gate_examples(path: Path) -> dict[str, Any]:
    outputs = [parse_gate_example_file(p) for p in sorted(path.glob("*.json")) if p.is_file()]
    all_matched = bool(outputs) and all(item["matched_expected"] for item in outputs)
    return {
        "software_verdict": "GATE_ADDED" if all_matched else "BLOCKED",
        "evidence_verdict": "MECHANICAL_GATE_ONLY" if all_matched else "INVALID",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "gate_verdict": "PR04_EXAMPLE_MODE_VALIDATED" if all_matched else "PR04_EXAMPLE_MODE_FAILED",
        "examples_checked": outputs,
    }


def has_gate_examples(path: Path) -> bool:
    for item in sorted(path.glob("*.json")):
        if not item.is_file():
            continue
        try:
            data = load_json(item)
        except (OSError, json.JSONDecodeError):
            return True
        if isinstance(data, dict) and "case_type" in data:
            return True
    return False


def contract_only_example(path: Path) -> dict[str, Any]:
    return result(
        "GATE_ADDED",
        "MECHANICAL_GATE_ONLY",
        "PR04_CONTRACT_EXAMPLE_ONLY",
        warnings=["EXAMPLE_MODE_ONLY: not run evidence"],
        path=path,
    ).as_dict()


def write_output(payload: dict[str, Any], output_path: Path, inspected_path: Path, pretty: bool) -> int:
    issues: list[str] = []
    try:
        resolved_output = output_path.resolve()
        resolved_inspected = inspected_path.resolve()
        try:
            resolved_output.relative_to(resolved_inspected)
            issues.append("BLOCKED_OUTPUT_PATH: output must not mutate inspected bundle")
        except ValueError:
            pass
        if is_latest_path(str(output_path)):
            issues.append("BLOCKED_LATEST_AS_EVIDENCE: output path")
        parts = [part.lower() for part in output_path.parts]
        if "lab" in parts and "runs" in parts:
            issues.append("BLOCKED_OUTPUT_PATH: output must not be written under lab/runs")
    except OSError as exc:
        issues.append(f"BLOCKED_OUTPUT_PATH: {exc}")
    if issues:
        blocked = result("BLOCKED", "INVALID", "BLOCKED_OUTPUT_PATH", issues=issues).as_dict()
        sys.stdout.write(json.dumps(blocked, indent=2 if pretty else None, sort_keys=True) + "\n")
        return 1
    rendered = json.dumps(payload, indent=2 if pretty else None, sort_keys=True) + "\n"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(rendered, encoding="utf-8")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PR-04 input-boundary and tampering gate for future RUN_ID bundles.")
    parser.add_argument("--path", required=True, help="Run bundle directory or PR-04 gate examples directory.")
    parser.add_argument("--output", help="Write JSON output to this path instead of stdout.")
    parser.add_argument("--example-mode", action="store_true", help="Validate PR-04 contract-only examples without treating them as run evidence.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    path = Path(args.path)

    if args.example_mode:
        if path.is_dir() and has_gate_examples(path):
            output = parse_gate_examples(path)
        else:
            output = contract_only_example(path)
    elif path.is_dir() and any(p.name.startswith("invalid_") or p.name.startswith("valid_") for p in path.glob("*.json")):
        output = parse_gate_examples(path)
    else:
        output = check_input_boundary(path).as_dict()

    if args.output:
        return write_output(output, Path(args.output), path, args.pretty)
    sys.stdout.write(json.dumps(output, indent=2 if args.pretty else None, sort_keys=True) + "\n")
    return 1 if output.get("software_verdict") in {"FAIL", "BLOCKED"} else 0


if __name__ == "__main__":
    raise SystemExit(main())
