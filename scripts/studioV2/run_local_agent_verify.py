import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from pathlib import PurePosixPath
from typing import Any


SCHEMA_VERSION = "local_agent_verify.pr28"
KNOWN_TRACKED_NOISE = {"lab/reports/latest_benchmark_summary.json"}
KNOWN_TRACKED_NOISE_PREFIXES = ("00_STUDIO_CONTROL/00_MASTER_DOCS/",)
SANDBOX_OUTPUT_PREFIX = "lab/gameplay_observation/sandbox_outputs/"
FORBIDDEN_PREFIXES = (
    ".github/workflows/",
    "src/",
    "ml/",
    "00_STUDIO_CONTROL/00_MASTER_DOCS/",
    "lab/runs/",
    "holdout/",
    "lab/holdout/",
)
FORBIDDEN_EXACT = {
    "README.md",
    "latest.json",
    "lab/reports/latest_benchmark_summary.json",
}
COMMON_SCOPE_FORBIDDEN_PREFIXES = (
    ".github/",
    "ml/",
    "lab/runs/",
    "holdout/",
    "lab/holdout/",
)
COMMON_SCOPE_FORBIDDEN_EXACT = {
    "latest.json",
    "lab/reports/latest_benchmark_summary.json",
}
SCOPE_PROFILES: dict[str, dict[str, tuple[str, ...]]] = {
    "default": {
        "allowed_scope_paths": ("<legacy-default>",),
        "forbidden_prefixes": (),
        "forbidden_exact": (),
    },
    "test-only-runtime": {
        "allowed_scope_paths": ("tests/**", "lab/gameplay_observation/PR*.md"),
        "forbidden_prefixes": ("src/",),
        "forbidden_exact": (),
    },
    "core-minimal": {
        "allowed_scope_paths": (
            "src/core/**",
            "src/lib.rs",
            "tests/**",
            "lab/gameplay_observation/PR*.md",
        ),
        "forbidden_prefixes": (
            "src/engine/",
            "src/chess/",
            "src/agents/",
            "src/simulation/",
        ),
        "forbidden_exact": (),
    },
    "telemetry-prep": {
        "allowed_scope_paths": (
            "scripts/run_local_agent_verify.py",
            "src/chess/decision_trace.rs",
            "tests/**",
            "lab/gameplay_observation/PR*.md",
        ),
        "forbidden_prefixes": ("src/chess/",),
        "forbidden_exact": (),
    },
}
DEFAULT_CHECKS = (
    (".\\.venv312\\Scripts\\python.exe", "-m", "py_compile", "scripts/run_local_agent_verify.py"),
    (".\\.venv312\\Scripts\\python.exe", "-m", "py_compile", "scripts/check_workspace_hygiene.py"),
    (".\\.venv312\\Scripts\\python.exe", "scripts/check_workspace_hygiene.py", "--pretty"),
    ("cargo", "check"),
    ("cargo", "test", "fen_round_trip", "--", "--nocapture"),
    ("cargo", "test", "root_decision", "--", "--nocapture"),
)
CLAIM_GATE_CHECK = (
    ".\\.venv312\\Scripts\\python.exe",
    "scripts/check_claim_data_gates.py",
    "--path",
    "AGENTS.md",
    "--pretty",
)
TELEMETRY_SMOKE_CHECK = (
    ".\\.venv312\\Scripts\\python.exe",
    "scripts/run_telemetry_json_dry_run_smoke.py",
    "--pretty",
)


@dataclass
class StatusEntry:
    status: str
    path: str
    staged: bool
    unstaged: bool
    untracked: bool


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a local Codex agent verification report.")
    parser.add_argument(
        "--scope",
        default="default",
        choices=sorted(SCOPE_PROFILES),
        help="Explicit path scope profile to validate.",
    )
    parser.add_argument("--run-checks", action="store_true", help="Run local mechanical validation commands.")
    parser.add_argument("--output", help="Optional JSON output path.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args(argv)


def normalize_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")
    if normalized.startswith("./"):
        return normalized[2:]
    return normalized


def run_command(argv: tuple[str, ...] | list[str]) -> dict[str, Any]:
    command = list(argv)
    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return {
        "command": command,
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }


def output_text(result: dict[str, Any]) -> str:
    return f"{result.get('stdout', '')}\n{result.get('stderr', '')}"


def git_stdout(args: list[str], *, strip: bool = True) -> tuple[str, dict[str, Any]]:
    result = run_command(["git", *args])
    stdout = str(result["stdout"])
    return (stdout.strip() if strip else stdout), result


def parse_porcelain_line(line: str) -> StatusEntry | None:
    if len(line) < 4:
        return None
    status = line[:2]
    payload = line[3:].strip()
    if not payload:
        return None
    if " -> " in payload:
        _, payload = payload.split(" -> ", 1)
    path = normalize_path(payload)
    return StatusEntry(
        status=status,
        path=path,
        staged=status[0] not in (" ", "?", "!"),
        unstaged=status[1] not in (" ", "?", "!"),
        untracked=status == "??",
    )


def parse_status(stdout: str) -> list[StatusEntry]:
    entries: list[StatusEntry] = []
    for line in stdout.splitlines():
        entry = parse_porcelain_line(line)
        if entry is not None:
            entries.append(entry)
    return entries


def is_sandbox_output(path: str) -> bool:
    return path.startswith(SANDBOX_OUTPUT_PREFIX)


def is_known_tracked_noise_path(path: str) -> bool:
    return path in KNOWN_TRACKED_NOISE or any(path.startswith(prefix) for prefix in KNOWN_TRACKED_NOISE_PREFIXES)


def is_local_tracked_noise(entry: StatusEntry) -> bool:
    return (
        not entry.untracked
        and not entry.staged
        and entry.unstaged
        and is_known_tracked_noise_path(entry.path)
    )


def is_pr_observation_report(path: str) -> bool:
    parsed = PurePosixPath(path)
    return (
        str(parsed.parent) == "lab/gameplay_observation"
        and parsed.name.startswith("PR")
        and parsed.suffix == ".md"
    )


def is_benchmark_output(path: str) -> bool:
    file_name = PurePosixPath(path).name.lower()
    return (
        path.startswith("lab/benchmarks/")
        or path.startswith("lab/benchmark_outputs/")
        or path.startswith("benchmark_outputs/")
        or path.startswith("benchmarks/")
        or file_name.startswith("bench_topk_")
        or file_name.startswith("benchmark_")
    )


def is_forbidden_path(path: str, *, branch_diff: bool) -> bool:
    if is_known_tracked_noise_path(path) and not branch_diff:
        return False
    if is_sandbox_output(path):
        return branch_diff
    if path in FORBIDDEN_EXACT:
        return True
    return any(path.startswith(prefix) for prefix in FORBIDDEN_PREFIXES)


def is_allowed_in_scope(path: str, scope: str) -> bool:
    if scope == "default":
        return True
    if scope == "test-only-runtime":
        return path.startswith("tests/") or is_pr_observation_report(path)
    if scope == "core-minimal":
        return (
            path.startswith("src/core/")
            or path == "src/lib.rs"
            or path.startswith("tests/")
            or is_pr_observation_report(path)
        )
    if scope == "telemetry-prep":
        return (
            path == "scripts/run_local_agent_verify.py"
            or path == "src/chess/decision_trace.rs"
            or path.startswith("tests/")
            or is_pr_observation_report(path)
        )
    raise ValueError(f"Unsupported scope: {scope}")


def is_scope_forbidden_path(path: str, scope: str) -> bool:
    if scope == "default":
        return is_forbidden_path(path, branch_diff=True)
    if is_allowed_in_scope(path, scope):
        return False
    profile = SCOPE_PROFILES[scope]
    forbidden_prefixes = COMMON_SCOPE_FORBIDDEN_PREFIXES + profile["forbidden_prefixes"]
    forbidden_exact = COMMON_SCOPE_FORBIDDEN_EXACT | set(profile["forbidden_exact"])
    return (
        path in forbidden_exact
        or is_sandbox_output(path)
        or is_benchmark_output(path)
        or any(path.startswith(prefix) for prefix in forbidden_prefixes)
    )


def list_changed_files(diff_stdout: str, status_entries: list[StatusEntry]) -> list[str]:
    changed = {normalize_path(path) for path in diff_stdout.splitlines() if path.strip()}
    changed.update(entry.path for entry in status_entries if not is_local_tracked_noise(entry))
    return sorted(changed)


def list_branch_diff_files(diff_stdout: str) -> list[str]:
    return sorted(normalize_path(path) for path in diff_stdout.splitlines() if path.strip())


def list_local_tracked_noise(status_entries: list[StatusEntry]) -> list[dict[str, str]]:
    return sorted(
        (
            {"path": entry.path, "status": entry.status, "category": "LOCAL_TRACKED_NOISE_PRESENT"}
            for entry in status_entries
            if is_local_tracked_noise(entry)
        ),
        key=lambda item: item["path"],
    )


def list_sandbox_output_noise(status_entries: list[StatusEntry]) -> list[dict[str, str]]:
    return sorted(
        (
            {"path": entry.path, "status": entry.status, "category": "SANDBOX_OUTPUT_NOISE"}
            for entry in status_entries
            if is_sandbox_output(entry.path)
        ),
        key=lambda item: item["path"],
    )


def command_summary(result: dict[str, Any]) -> dict[str, Any]:
    stdout = str(result.get("stdout", ""))
    stderr = str(result.get("stderr", ""))
    return {
        "command": result["command"],
        "returncode": result["returncode"],
        "stdout_tail": stdout[-4000:],
        "stderr_tail": stderr[-4000:],
    }


def parse_json_stdout(result: dict[str, Any]) -> dict[str, Any] | None:
    stdout = str(result.get("stdout", "")).strip()
    if not stdout:
        return None
    try:
        parsed = json.loads(stdout)
    except json.JSONDecodeError:
        return None
    if not isinstance(parsed, dict):
        return None
    return parsed


def telemetry_smoke_summary(result: dict[str, Any]) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "command": result["command"],
        "returncode": result["returncode"],
    }
    parsed = parse_json_stdout(result)
    if parsed is None:
        return summary
    for key in ("software_verdict", "evidence_verdict", "claim_verdict"):
        value = parsed.get(key)
        if isinstance(value, str):
            summary[key] = value
    return summary


def find_command_result(results: list[dict[str, Any]], command: tuple[str, ...]) -> dict[str, Any] | None:
    command_list = list(command)
    for result in results:
        if result.get("command") == command_list:
            return result
    return None


def build_telemetry_smoke_section(
    run_checks: bool,
    scope: str,
    validation_results: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if scope != "telemetry-prep":
        return None
    if not run_checks:
        return {
            "command": list(TELEMETRY_SMOKE_CHECK),
            "returncode": None,
            "skipped": True,
            "reason": "Checks were not requested; rerun with --run-checks.",
        }

    result = find_command_result(validation_results, TELEMETRY_SMOKE_CHECK)
    if result is None:
        return {
            "command": list(TELEMETRY_SMOKE_CHECK),
            "returncode": None,
            "skipped": True,
            "reason": "Telemetry smoke check was not scheduled.",
        }
    return telemetry_smoke_summary(result)


def list_tracked_sandbox_outputs(ls_files_stdout: str) -> list[str]:
    return sorted(normalize_path(path) for path in ls_files_stdout.splitlines() if path.strip())


def list_warnings(results: list[dict[str, Any]], status_stdout: str) -> list[str]:
    warnings: list[str] = []
    for result in results:
        stderr = str(result.get("stderr", "")).strip()
        if stderr and result.get("returncode") == 0:
            warnings.append(f"{' '.join(result['command'])}: {stderr}")
    for raw_line in status_stdout.splitlines():
        if parse_porcelain_line(raw_line) is None:
            warnings.append(f"UNPARSED_STATUS_LINE: {raw_line}")
    return warnings


def validation_commands(scope: str) -> list[tuple[str, ...]]:
    checks = list(DEFAULT_CHECKS)
    if scope == "telemetry-prep":
        checks.append(TELEMETRY_SMOKE_CHECK)
    if Path("scripts/check_claim_data_gates.py").exists() and Path("AGENTS.md").exists():
        checks.append(CLAIM_GATE_CHECK)
    return checks


def run_validation(scope: str) -> tuple[list[dict[str, Any]], str]:
    results = [run_command(command) for command in validation_commands(scope)]
    return results, ""


def build_report(run_checks: bool, scope: str) -> dict[str, Any]:
    commands_run: list[list[str]] = []
    command_results: list[dict[str, Any]] = []

    branch, branch_result = git_stdout(["branch", "--show-current"])
    head_commit, head_result = git_stdout(["rev-parse", "HEAD"])
    main_ref, main_ref_result = git_stdout(["rev-parse", "origin/main"])
    diff_names, diff_names_result = git_stdout(["diff", "--name-only", "origin/main...HEAD"])
    status_stdout, status_result = git_stdout(["status", "--porcelain"], strip=False)
    tracked_sandbox_outputs_stdout, tracked_sandbox_outputs_result = git_stdout(
        ["ls-files", f"{SANDBOX_OUTPUT_PREFIX}*"],
        strip=False,
    )

    git_results = [
        branch_result,
        head_result,
        main_ref_result,
        diff_names_result,
        status_result,
        tracked_sandbox_outputs_result,
    ]
    commands_run.extend(result["command"] for result in git_results)
    command_results.extend(command_summary(result) for result in git_results)

    status_entries = parse_status(status_stdout)
    branch_diff_files = list_branch_diff_files(diff_names)
    changed_files = list_changed_files(diff_names, status_entries)
    local_tracked_noise = list_local_tracked_noise(status_entries)
    sandbox_output_noise = list_sandbox_output_noise(status_entries)
    tracked_sandbox_outputs = list_tracked_sandbox_outputs(tracked_sandbox_outputs_stdout)
    validation_results: list[dict[str, Any]] = []
    if scope == "default":
        scope_changed_files = sorted(
            {
                *branch_diff_files,
                *(entry.path for entry in status_entries if not is_local_tracked_noise(entry)),
            }
        )
    else:
        scope_changed_files = branch_diff_files
    forbidden_changed_files = sorted(path for path in scope_changed_files if is_scope_forbidden_path(path, scope))
    unexpected_changed_files = sorted(
        path
        for path in scope_changed_files
        if scope != "default"
        and path not in forbidden_changed_files
        and not is_allowed_in_scope(path, scope)
    )
    warnings = list_warnings(git_results, status_stdout)

    skipped_validation_and_reason = "Checks were not requested; rerun with --run-checks."
    if run_checks:
        validation_results, skipped_validation_and_reason = run_validation(scope)
        commands_run.extend(result["command"] for result in validation_results)
        command_results.extend(command_summary(result) for result in validation_results)
        warnings.extend(list_warnings(validation_results, ""))
    telemetry_smoke = build_telemetry_smoke_section(run_checks, scope, validation_results)

    failed_commands = [result for result in command_results if result["returncode"] != 0]
    git_failed = [result for result in git_results if result["returncode"] != 0]
    required_checks_failed = bool(run_checks and failed_commands)

    if forbidden_changed_files:
        software_verdict = "BLOCKED_FORBIDDEN_PATHS_CHANGED"
    elif unexpected_changed_files:
        software_verdict = "BLOCKED_UNEXPECTED_PATHS_CHANGED"
    elif tracked_sandbox_outputs:
        software_verdict = "BLOCKED_TRACKED_SANDBOX_OUTPUTS"
    elif git_failed:
        software_verdict = "BLOCKED_GIT_INSPECTION_FAILED"
    elif required_checks_failed:
        software_verdict = "BLOCKED_REQUIRED_CHECK_FAILED"
    else:
        software_verdict = "LOCAL_AGENT_VERIFY_READY"

    report = {
        "schema_version": SCHEMA_VERSION,
        "scope": scope,
        "allowed_scope_paths": list(SCOPE_PROFILES[scope]["allowed_scope_paths"]),
        "software_verdict": software_verdict,
        "evidence_verdict": "MECHANICAL_GUARDRAIL_ONLY",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "human_review_required": True,
        "branch": branch,
        "head_commit": head_commit,
        "main_ref": main_ref,
        "branch_diff_files": branch_diff_files,
        "changed_files": changed_files,
        "forbidden_changed_files": forbidden_changed_files,
        "unexpected_changed_files": unexpected_changed_files,
        "local_tracked_noise": local_tracked_noise,
        "sandbox_output_noise": sandbox_output_noise,
        "tracked_sandbox_outputs": tracked_sandbox_outputs,
        "warnings": sorted(set(warnings)),
        "commands_run": commands_run,
        "command_results": command_results,
        "skipped_validation_and_reason": skipped_validation_and_reason,
        "behavior_risk": "Low: local automation guardrail only; no runtime files are intended.",
        "evidence_risk": "Low: report is mechanical local state only and is not canonical evidence.",
        "claim_risk": "Low: claim_verdict remains NO_CLAIM_ALLOWED.",
    }
    if telemetry_smoke is not None:
        report["telemetry_smoke"] = telemetry_smoke
    return report


def write_report(path_text: str, payload: dict[str, Any], pretty: bool) -> None:
    path = Path(path_text)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2 if pretty else None, sort_keys=True) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    report = build_report(args.run_checks, args.scope)
    rendered = json.dumps(report, indent=2 if args.pretty else None, sort_keys=True)
    if args.output:
        write_report(args.output, report, args.pretty)
    print(rendered)
    if report["forbidden_changed_files"]:
        return 1
    if report["unexpected_changed_files"]:
        return 1
    if report["tracked_sandbox_outputs"]:
        return 1
    if args.run_checks and any(result["returncode"] != 0 for result in report["command_results"]):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
