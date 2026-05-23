import argparse
import fnmatch
import json
import subprocess
import sys
from dataclasses import dataclass
from typing import Any


SCHEMA_VERSION = "docs_update_pr_guard.pr66.v1"
NO_CLAIM_ALLOWED = "NO_CLAIM_ALLOWED"
SCRIPT_PATH = "scripts/prepare_docs_update_pr.py"
LOCAL_BENCHMARK_PATH = "lab/reports/latest_benchmark_summary.json"
SANDBOX_OUTPUT_PREFIX = "lab/gameplay_observation/sandbox_outputs/"
RUN_PREFIX = "lab/runs/"
RUN_BLOCK_PATTERN = "lab/runs/RUN_*"
LATEST_JSON_PATH = "latest.json"

ALLOWED_DOCS_PATTERNS = (
    "README.md",
    "MASTER_DOCS/**",
    "lab/gameplay_observation/PR*_*.md",
)

FORBIDDEN_EXACT = {
    LOCAL_BENCHMARK_PATH,
    LATEST_JSON_PATH,
}

FORBIDDEN_PREFIXES = (
    "src/",
    "tests/",
    ".github/",
    "ml/",
    "scripts/",
    RUN_PREFIX,
)


@dataclass
class StatusEntry:
    status: str
    path: str
    staged: bool
    unstaged: bool
    untracked: bool


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Guarded local preparation for docs-update PR pushes."
    )
    parser.add_argument("--allow-push", action="store_true", help="Attempt guarded push when safety checks pass.")
    parser.add_argument(
        "--ignore-local-benchmark-noise",
        action="store_true",
        help="Allow unstaged local benchmark report noise when it is not staged and not in branch diff.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args(argv)


def normalize_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def run_command(command: list[str]) -> dict[str, Any]:
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
    untracked = status == "??"
    staged = status[0] not in (" ", "?", "!")
    unstaged = status[1] not in (" ", "?", "!")
    return StatusEntry(status=status, path=path, staged=staged, unstaged=unstaged, untracked=untracked)


def parse_porcelain(stdout: str) -> list[StatusEntry]:
    entries: list[StatusEntry] = []
    for line in stdout.splitlines():
        parsed = parse_porcelain_line(line)
        if parsed is not None:
            entries.append(parsed)
    return entries


def command_stdout_lines(result: dict[str, Any]) -> list[str]:
    stdout = str(result.get("stdout", ""))
    return [normalize_path(line) for line in stdout.splitlines() if line.strip()]


def is_allowed_docs_path(path: str) -> bool:
    normalized = normalize_path(path)
    return any(fnmatch.fnmatch(normalized, pattern) for pattern in ALLOWED_DOCS_PATTERNS)


def is_allowed_for_this_pr(path: str) -> bool:
    normalized = normalize_path(path)
    if normalized == SCRIPT_PATH:
        return True
    return is_allowed_docs_path(normalized)


def is_forbidden_file(path: str) -> bool:
    normalized = normalize_path(path)
    if normalized == SCRIPT_PATH:
        return False
    if normalized in FORBIDDEN_EXACT:
        return True
    return any(normalized.startswith(prefix) for prefix in FORBIDDEN_PREFIXES)


def is_run_block_file(path: str) -> bool:
    normalized = normalize_path(path)
    return fnmatch.fnmatch(normalized, RUN_BLOCK_PATTERN) or normalized.startswith(RUN_PREFIX)


def unique_sorted(values: list[str]) -> list[str]:
    return sorted(set(values))


def build_report(args: argparse.Namespace) -> dict[str, Any]:
    blocked_reasons: list[str] = []

    branch_result = run_command(["git", "branch", "--show-current"])
    head_result = run_command(["git", "rev-parse", "HEAD"])
    status_result = run_command(["git", "status", "--porcelain"])
    diff_result = run_command(["git", "diff", "--name-only", "origin/main...HEAD"])
    sandbox_result = run_command(["git", "ls-files", "lab/gameplay_observation/sandbox_outputs"])

    current_branch = str(branch_result.get("stdout", "")).strip()
    head_sha = str(head_result.get("stdout", "")).strip()
    status_entries = parse_porcelain(str(status_result.get("stdout", "")))
    branch_diff_files = command_stdout_lines(diff_result)
    working_tree_files = [entry.path for entry in status_entries]
    changed_files = unique_sorted(branch_diff_files + working_tree_files)
    sandbox_outputs_tracked = command_stdout_lines(sandbox_result)

    staged_files = unique_sorted([entry.path for entry in status_entries if entry.staged])
    unstaged_files = unique_sorted([entry.path for entry in status_entries if entry.unstaged])
    allowed_files = unique_sorted([path for path in changed_files if is_allowed_for_this_pr(path)])
    forbidden_files = unique_sorted([path for path in changed_files if is_forbidden_file(path)])

    staged_forbidden_files = unique_sorted([path for path in staged_files if is_forbidden_file(path)])
    disallowed_branch_diff_files = [path for path in branch_diff_files if not is_allowed_for_this_pr(path)]
    forbidden_branch_diff_files = [path for path in branch_diff_files if is_forbidden_file(path)]
    local_benchmark_noise_present = any(
        entry.path == LOCAL_BENCHMARK_PATH and (entry.staged or entry.unstaged)
        for entry in status_entries
    )
    benchmark_report_staged = LOCAL_BENCHMARK_PATH in staged_files
    benchmark_report_in_branch_diff = LOCAL_BENCHMARK_PATH in branch_diff_files
    local_benchmark_noise_ignorable = (
        local_benchmark_noise_present
        and LOCAL_BENCHMARK_PATH in unstaged_files
        and not benchmark_report_staged
        and not benchmark_report_in_branch_diff
    )

    if branch_result["returncode"] != 0:
        blocked_reasons.append("BLOCKED_BRANCH_QUERY_FAILED")
    if head_result["returncode"] != 0:
        blocked_reasons.append("BLOCKED_HEAD_QUERY_FAILED")
    if status_result["returncode"] != 0:
        blocked_reasons.append("BLOCKED_GIT_STATUS_FAILED")
    if diff_result["returncode"] != 0:
        blocked_reasons.append("BLOCKED_BRANCH_DIFF_FAILED")
    if sandbox_result["returncode"] != 0:
        blocked_reasons.append("BLOCKED_SANDBOX_SCAN_FAILED")

    if current_branch == "main":
        blocked_reasons.append("BLOCKED_ON_MAIN_BRANCH")

    if disallowed_branch_diff_files:
        blocked_reasons.append("BLOCKED_DISALLOWED_CHANGED_FILES_PRESENT")
    if forbidden_branch_diff_files:
        blocked_reasons.append("BLOCKED_FORBIDDEN_FILES_CHANGED")
    if staged_forbidden_files:
        blocked_reasons.append("BLOCKED_STAGED_FORBIDDEN_FILES_PRESENT")
    if sandbox_outputs_tracked:
        blocked_reasons.append("BLOCKED_SANDBOX_OUTPUTS_TRACKED")
    if any(path == LATEST_JSON_PATH for path in branch_diff_files + staged_files):
        blocked_reasons.append("BLOCKED_LATEST_JSON_PRESENT")
    if any(is_run_block_file(path) for path in branch_diff_files + staged_files):
        blocked_reasons.append("BLOCKED_LAB_RUNS_PRESENT")

    if benchmark_report_staged:
        blocked_reasons.append("BLOCKED_STAGED_LOCAL_BENCHMARK_REPORT")
    if benchmark_report_in_branch_diff:
        blocked_reasons.append("BLOCKED_BENCHMARK_REPORT_IN_BRANCH_DIFF")

    local_benchmark_noise_blocking = False
    if local_benchmark_noise_present:
        if benchmark_report_staged or benchmark_report_in_branch_diff:
            local_benchmark_noise_blocking = True
        elif not args.ignore_local_benchmark_noise:
            blocked_reasons.append("BLOCKED_LOCAL_BENCHMARK_NOISE_PRESENT")
            local_benchmark_noise_blocking = True
        elif not local_benchmark_noise_ignorable:
            blocked_reasons.append("BLOCKED_LOCAL_BENCHMARK_NOISE_NOT_IGNORABLE")
            local_benchmark_noise_blocking = True

    blocked_reasons = unique_sorted(blocked_reasons)
    push_allowed = not blocked_reasons
    push_attempted = False
    push_result = "NOT_ATTEMPTED_DRY_RUN"

    if args.allow_push:
        if push_allowed:
            push_attempted = True
            push_exec = run_command(["git", "push", "-u", "origin", current_branch])
            if push_exec["returncode"] == 0:
                push_result = "PUSH_OK"
            else:
                push_result = "PUSH_FAILED"
                blocked_reasons.append("BLOCKED_GIT_PUSH_FAILED")
                blocked_reasons = unique_sorted(blocked_reasons)
                push_allowed = False
        else:
            push_result = "NOT_ATTEMPTED_BLOCKED"

    software_verdict = "DOCS_UPDATE_PR_GUARD_READY" if not blocked_reasons else "DOCS_UPDATE_PR_GUARD_BLOCKED"

    report = {
        "schema_version": SCHEMA_VERSION,
        "mode": "allow-push" if args.allow_push else "dry-run",
        "ignore_local_benchmark_noise": bool(args.ignore_local_benchmark_noise),
        "current_branch": current_branch,
        "head_sha": head_sha,
        "changed_files": unique_sorted(changed_files),
        "allowed_files": allowed_files,
        "forbidden_files": forbidden_files,
        "staged_files": staged_files,
        "sandbox_outputs_tracked": unique_sorted(sandbox_outputs_tracked),
        "local_benchmark_noise_present": local_benchmark_noise_present,
        "local_benchmark_noise_blocking": local_benchmark_noise_blocking,
        "push_allowed": push_allowed,
        "push_attempted": push_attempted,
        "push_result": push_result,
        "blocked_reasons": blocked_reasons,
        "software_verdict": software_verdict,
        "evidence_verdict": "MECHANICAL_CONTROL_PLANE_ONLY",
        "claim_verdict": NO_CLAIM_ALLOWED,
    }
    return report


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    report = build_report(args)
    print(json.dumps(report, indent=2 if args.pretty else None, sort_keys=True))
    if args.allow_push and report.get("push_attempted") and report.get("push_result") == "PUSH_FAILED":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
