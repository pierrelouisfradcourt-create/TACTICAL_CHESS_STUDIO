import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


AUTOMATION_TOOL_PATHS = (
    "scripts/run_local_agent_verify.py",
    "scripts/check_workspace_hygiene.py",
    "scripts/check_pr_readiness.py",
    "scripts/run_manual_codex_loop_once.py",
    "scripts/run_telemetry_json_dry_run.py",
    "scripts/run_telemetry_json_dry_run_smoke.py",
)

RUNTIME_FOUNDATION_PATHS = (
    "src/core/action_id.rs",
    "src/core/legal_action.rs",
    "src/chess/decision_trace.rs",
    "src/chess/decision_trace_bridge.rs",
    "tests/legal_action_adapter.rs",
    "tests/decision_trace_bridge.rs",
)

KNOWN_TRACKED_NOISE = {"lab/reports/latest_benchmark_summary.json"}
KNOWN_TRACKED_NOISE_PREFIXES = ("00_STUDIO_CONTROL/00_MASTER_DOCS/",)
SPIKE_BRANCH_NAME = "spike-aaa-search-neural-engine-split"
PR60_AUDIT_PATH = "lab/gameplay_observation/PR60_PUSH_AND_AUTOMATION_CLEANUP_AUDIT.md"
PR63_AUDIT_PATH = "lab/gameplay_observation/PR63_STALE_BRANCH_CLEANUP_AUDIT.md"

TRUTH_PR60_TOKENS = ("pr60", "pr #119", "#119")
TRUTH_PR61_TOKENS = ("pr61", "pr #120", "#120")
PR116_TOKEN_RE = re.compile(r"(?:pr\s*#?\s*116|#116|pr116)", re.IGNORECASE)
STALE_OPEN_TOKENS = ("stale", "open", "draft", "keep_open_pr_stale", "should not be merged as-is")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Report local agent session state in one command.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args(argv)


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


def normalize_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def parse_porcelain(stdout: str) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    for raw_line in stdout.splitlines():
        if len(raw_line) < 4:
            continue
        status = raw_line[:2]
        payload = raw_line[3:].strip()
        if not payload:
            continue
        if " -> " in payload:
            _, payload = payload.split(" -> ", 1)
        entries.append({"status": status, "path": normalize_path(payload)})
    return entries


def is_known_tracked_noise(path: str) -> bool:
    return path in KNOWN_TRACKED_NOISE or any(path.startswith(prefix) for prefix in KNOWN_TRACKED_NOISE_PREFIXES)


def git_stdout(args: list[str], *, strip: bool = True) -> tuple[str, dict[str, Any]]:
    result = run_command(["git", *args])
    stdout = str(result.get("stdout", ""))
    return (stdout.strip() if strip else stdout), result


def detect_spike_branch_present() -> bool:
    local_result = run_command(["git", "show-ref", "--verify", f"refs/heads/{SPIKE_BRANCH_NAME}"])
    if local_result["returncode"] == 0:
        return True
    remote_result = run_command(["git", "show-ref", "--verify", f"refs/remotes/origin/{SPIKE_BRANCH_NAME}"])
    return remote_result["returncode"] == 0


def safe_read_lower(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="replace").lower()


def has_any_token(text: str, tokens: tuple[str, ...]) -> bool:
    return any(token in text for token in tokens)


def collect_active_master_docs_paths() -> list[Path]:
    root = Path("MASTER_DOCS")
    if not root.exists():
        return []
    return sorted(
        (path for path in root.rglob("*.md") if "ARCHIVE" not in path.parts),
        key=lambda path: path.as_posix(),
    )


def detect_docs_freshness() -> dict[str, Any]:
    readme_text = safe_read_lower(Path("README.md"))
    master_docs_paths = collect_active_master_docs_paths()
    master_docs_text = "\n".join(safe_read_lower(path) for path in master_docs_paths)

    readme_has_pr60 = has_any_token(readme_text, TRUTH_PR60_TOKENS)
    readme_has_pr61 = has_any_token(readme_text, TRUTH_PR61_TOKENS)
    master_docs_have_pr60 = has_any_token(master_docs_text, TRUTH_PR60_TOKENS)
    master_docs_have_pr61 = has_any_token(master_docs_text, TRUTH_PR61_TOKENS)

    docs_current = all(
        (
            readme_has_pr60,
            readme_has_pr61,
            master_docs_have_pr60,
            master_docs_have_pr61,
        )
    )
    docs_freshness_status = (
        "CURRENT_PR60_PR61_TRUTH_PRESENT"
        if docs_current
        else "DOCS_NEED_PR60_PR61_TRUTH_SYNC"
    )
    return {
        "docs_freshness_status": docs_freshness_status,
        "docs_truth_signals": {
            "readme_has_pr60_truth": readme_has_pr60,
            "readme_has_pr61_truth": readme_has_pr61,
            "master_docs_has_pr60_truth": master_docs_have_pr60,
            "master_docs_has_pr61_truth": master_docs_have_pr61,
        },
    }


def detect_stale_pr116_status() -> str:
    docs_paths: list[Path] = [Path("README.md"), Path(PR60_AUDIT_PATH), Path(PR63_AUDIT_PATH)]
    docs_paths.extend(collect_active_master_docs_paths())
    corpus = "\n".join(safe_read_lower(path) for path in docs_paths)

    mentions_pr116 = bool(PR116_TOKEN_RE.search(corpus))
    mentions_stale_open = has_any_token(corpus, STALE_OPEN_TOKENS)
    if mentions_pr116 and mentions_stale_open:
        return "PR116_STALE_OPEN_REFERENCED_IN_LOCAL_DOCS"
    if mentions_pr116:
        return "PR116_REFERENCED_WITHOUT_STALE_OPEN_SIGNAL"
    return "PR116_NOT_REFERENCED_IN_LOCAL_DOCS"


def derive_recommendation(docs_freshness_status: str, stale_pr116_status: str) -> tuple[str, str]:
    if docs_freshness_status != "CURRENT_PR60_PR61_TRUTH_PRESENT":
        return ("DOCS", "SYNC_ACTIVE_DOCS_WITH_PR60_PR61_TRUTH")
    if stale_pr116_status == "PR116_STALE_OPEN_REFERENCED_IN_LOCAL_DOCS":
        return ("CONTROL_PLANE", "HUMAN_DECISION_ON_STALE_PR116")
    return ("AUTOMATION", "ADD_SPIKE_EXTRACTION_PACKET_GENERATOR_OR_FIX_CONTROL_PLANE")


def build_report() -> dict[str, Any]:
    blocked_reasons: list[str] = []

    current_branch, current_branch_result = git_stdout(["branch", "--show-current"])
    if current_branch_result["returncode"] != 0:
        blocked_reasons.append("GIT_BRANCH_QUERY_FAILED")

    head_sha, head_sha_result = git_stdout(["rev-parse", "HEAD"])
    if head_sha_result["returncode"] != 0:
        blocked_reasons.append("GIT_HEAD_QUERY_FAILED")

    commits_stdout, commits_result = git_stdout(["log", "--oneline", "-12"])
    if commits_result["returncode"] != 0:
        blocked_reasons.append("GIT_RECENT_COMMITS_QUERY_FAILED")
    recent_commits = [line for line in commits_stdout.splitlines() if line.strip()]

    status_stdout, status_result = git_stdout(["status", "--porcelain"], strip=False)
    if status_result["returncode"] != 0:
        blocked_reasons.append("GIT_STATUS_QUERY_FAILED")
    porcelain_status = parse_porcelain(status_stdout)

    local_tracked_noise = sorted(
        [
            {
                "path": item["path"],
                "status": item["status"],
                "category": "LOCAL_TRACKED_NOISE_PRESENT",
            }
            for item in porcelain_status
            if item["status"] != "??" and is_known_tracked_noise(item["path"])
        ],
        key=lambda item: item["path"],
    )

    tracked_sandbox_outputs_stdout, tracked_sandbox_outputs_result = git_stdout(
        ["ls-files", "lab/gameplay_observation/sandbox_outputs"],
        strip=False,
    )
    if tracked_sandbox_outputs_result["returncode"] != 0:
        blocked_reasons.append("GIT_SANDBOX_OUTPUT_SCAN_FAILED")
    sandbox_outputs_tracked = sorted(
        normalize_path(line)
        for line in tracked_sandbox_outputs_stdout.splitlines()
        if line.strip()
    )

    automation_tools_present = {
        path: Path(path).exists() for path in AUTOMATION_TOOL_PATHS
    }
    runtime_foundations_present = {
        path: Path(path).exists() for path in RUNTIME_FOUNDATION_PATHS
    }
    spike_present = detect_spike_branch_present()
    spike_branches_present = {SPIKE_BRANCH_NAME: spike_present}
    spike_status = "PRESENT_READ_ONLY" if spike_present else "ABSENT"

    docs_freshness = detect_docs_freshness()
    docs_freshness_status = str(docs_freshness["docs_freshness_status"])
    stale_pr116_status = detect_stale_pr116_status()
    recommended_next_lane, recommended_next_action = derive_recommendation(
        docs_freshness_status,
        stale_pr116_status,
    )

    if not all(automation_tools_present.values()):
        blocked_reasons.append("AUTOMATION_TOOLS_MISSING")
    if not all(runtime_foundations_present.values()):
        blocked_reasons.append("RUNTIME_FOUNDATIONS_MISSING")

    return {
        "current_branch": current_branch,
        "head_sha": head_sha,
        "recent_commits": recent_commits,
        "porcelain_status": porcelain_status,
        "local_tracked_noise": local_tracked_noise,
        "sandbox_outputs_tracked": sandbox_outputs_tracked,
        "automation_tools_present": automation_tools_present,
        "runtime_foundations_present": runtime_foundations_present,
        "spike_branches_present": spike_branches_present,
        "spike_status": spike_status,
        "docs_freshness_status": docs_freshness_status,
        "stale_pr116_status": stale_pr116_status,
        "recommended_next_lane": recommended_next_lane,
        "recommended_next_action": recommended_next_action,
        "blocked_reasons": sorted(set(blocked_reasons)),
        "software_verdict": "LOCAL_AGENT_SESSION_RECOMMENDATION_FIXED",
        "evidence_verdict": "MECHANICAL_CONTROL_PLANE_ONLY",
        "claim_verdict": "NO_CLAIM_ALLOWED",
    }


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    report = build_report()
    print(json.dumps(report, indent=2 if args.pretty else None, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
