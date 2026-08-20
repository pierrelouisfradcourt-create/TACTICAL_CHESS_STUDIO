import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "pr_readiness.pr29"
READY_TO_MERGE = "READY_TO_MERGE"
PAS_READY = "PAS_READY"
NO_CLAIM_ALLOWED = "NO_CLAIM_ALLOWED"

FORBIDDEN_EXACT = {
    "scripts/parse_run_bundle.py",
    "latest.json",
    "lab/reports/latest_benchmark_summary.json",
}
FORBIDDEN_PREFIXES = (
    ".github/workflows/",
    "src/",
    "ml/",
    "lab/runs/",
    "lab/gameplay_observation/sandbox_outputs/",
    "holdout/",
)
PASS_CHECK_BUCKETS = {"pass", "skipping"}
FAIL_CHECK_BUCKETS = {"fail"}
PENDING_CHECK_BUCKETS = {"pending"}
CANCEL_CHECK_BUCKETS = {"cancel"}


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Mechanically check local GitHub PR readiness before human merge.")
    parser.add_argument("--pr", required=True, type=int, help="GitHub pull request number to inspect.")
    parser.add_argument("--expected-head", help="Expected PR head SHA.")
    parser.add_argument("--allowed-path", action="append", default=[], help="Changed path to allow explicitly.")
    parser.add_argument("--allowed-prefix", action="append", default=[], help="Changed path prefix to allow explicitly.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    parser.add_argument("--output", help="Optional JSON output path.")
    parser.add_argument("--allow-draft", action="store_true", help="Allow draft PRs to pass mechanical readiness.")
    parser.add_argument("--expect-not-ready", action="store_true", help="Exit 0 only when the PR is not ready.")
    return parser.parse_args(argv)


def normalize_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def normalize_prefix(prefix: str) -> str:
    normalized = normalize_path(prefix)
    if normalized and not normalized.endswith("/"):
        normalized += "/"
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


def command_summary(result: dict[str, Any]) -> dict[str, Any]:
    stdout = str(result.get("stdout", ""))
    stderr = str(result.get("stderr", ""))
    return {
        "command": result["command"],
        "returncode": result["returncode"],
        "stdout_tail": stdout[-4000:],
        "stderr_tail": stderr[-4000:],
    }


def load_json_result(result: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
    try:
        payload = json.loads(str(result.get("stdout", "") or "{}"))
    except json.JSONDecodeError as exc:
        return {}, f"PR_VIEW_JSON_PARSE_FAILED: {exc}"
    if not isinstance(payload, dict):
        return {}, "PR_VIEW_JSON_PARSE_FAILED: top-level JSON was not an object"
    return payload, None


def parse_changed_files(stdout: str) -> list[str]:
    return sorted({normalize_path(line) for line in stdout.splitlines() if line.strip()})


def is_forbidden_path(path: str) -> bool:
    normalized = normalize_path(path)
    return normalized in FORBIDDEN_EXACT or any(normalized.startswith(prefix) for prefix in FORBIDDEN_PREFIXES)


def is_allowed_path(path: str, allowed_paths: set[str], allowed_prefixes: list[str]) -> bool:
    normalized = normalize_path(path)
    return normalized in allowed_paths or any(normalized.startswith(prefix) for prefix in allowed_prefixes)


def forbidden_changed_files(changed_files: list[str], allowed_paths: set[str], allowed_prefixes: list[str]) -> list[str]:
    return [
        path
        for path in changed_files
        if is_forbidden_path(path) and not is_allowed_path(path, allowed_paths, allowed_prefixes)
    ]


def unexpected_changed_files(changed_files: list[str], allowed_paths: set[str], allowed_prefixes: list[str]) -> list[str]:
    if not allowed_paths and not allowed_prefixes:
        return []
    return [
        path
        for path in changed_files
        if not is_allowed_path(path, allowed_paths, allowed_prefixes)
    ]


def classify_check_bucket(raw_bucket: str) -> str:
    bucket = raw_bucket.strip().lower().replace(" ", "_")
    if bucket in PASS_CHECK_BUCKETS:
        return "passed"
    if bucket in FAIL_CHECK_BUCKETS:
        return "failed"
    if bucket in PENDING_CHECK_BUCKETS:
        return "pending"
    if bucket in CANCEL_CHECK_BUCKETS:
        return "canceled"
    return "unknown"


def parse_checks(stdout: str) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    summary = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "pending": 0,
        "skipping": 0,
        "canceled": 0,
        "unknown": 0,
        "checks": checks,
    }

    try:
        payload = json.loads(stdout or "[]")
    except json.JSONDecodeError:
        summary["unknown"] = 1
        return summary

    if not isinstance(payload, list):
        summary["unknown"] = 1
        return summary

    for item in payload:
        if not isinstance(item, dict):
            summary["unknown"] += 1
            continue
        raw_bucket = str(item.get("bucket", "") or "")
        bucket = classify_check_bucket(raw_bucket)
        if raw_bucket.strip().lower().replace(" ", "_") == "skipping":
            summary["skipping"] += 1
        checks.append(
            {
                "name": item.get("name", ""),
                "state": item.get("state", ""),
                "bucket": raw_bucket,
                "workflow": item.get("workflow", ""),
                "link": item.get("link", ""),
                "classification": bucket,
            }
        )
        summary["total"] += 1
        summary[bucket] += 1

    return summary


def checks_blocking_reasons(checks_summary: dict[str, Any], checks_result: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    failed = int(checks_summary.get("failed", 0))
    pending = int(checks_summary.get("pending", 0))
    canceled = int(checks_summary.get("canceled", 0))
    unknown = int(checks_summary.get("unknown", 0))

    if failed:
        reasons.append("CHECKS_FAILED")
    if pending:
        reasons.append("CHECKS_PENDING")
    if canceled:
        reasons.append("CHECKS_CANCELED")
    if unknown:
        reasons.append("CHECKS_UNKNOWN")
    if checks_result["returncode"] != 0 and not (failed or pending or canceled or unknown):
        reasons.append("CHECKS_COMMAND_FAILED")
    return reasons


def build_report(args: argparse.Namespace) -> dict[str, Any]:
    commands = [
        ["gh", "pr", "view", str(args.pr), "--json", "state,isDraft,mergeable,headRefOid,url"],
        ["gh", "pr", "checks", str(args.pr), "--json", "name,state,bucket,workflow,link"],
        ["gh", "pr", "diff", str(args.pr), "--name-only"],
    ]
    view_result, checks_result, diff_result = [run_command(command) for command in commands]
    command_results = [command_summary(result) for result in (view_result, checks_result, diff_result)]

    pr_view, view_parse_error = load_json_result(view_result)
    checks_summary = parse_checks(str(checks_result.get("stdout", "")))
    changed_files = parse_changed_files(str(diff_result.get("stdout", ""))) if diff_result["returncode"] == 0 else []
    allowed_paths = {normalize_path(path) for path in args.allowed_path}
    allowed_prefixes = [normalize_prefix(prefix) for prefix in args.allowed_prefix]
    blocked_paths = forbidden_changed_files(changed_files, allowed_paths, allowed_prefixes)
    unexpected_paths = unexpected_changed_files(changed_files, allowed_paths, allowed_prefixes)

    state = str(pr_view.get("state", "") or "")
    is_draft = bool(pr_view.get("isDraft", False))
    mergeable = str(pr_view.get("mergeable", "") or "")
    head_sha = str(pr_view.get("headRefOid", "") or "")
    blocking_reasons: list[str] = []

    if view_result["returncode"] != 0:
        blocking_reasons.append("PR_VIEW_FAILED")
    if view_parse_error is not None:
        blocking_reasons.append(view_parse_error)
    if state and state != "OPEN":
        blocking_reasons.append("PR_NOT_OPEN")
    elif not state and view_result["returncode"] == 0:
        blocking_reasons.append("PR_STATE_UNKNOWN")
    if is_draft and not args.allow_draft:
        blocking_reasons.append("PR_IS_DRAFT")
    if args.expected_head and head_sha != args.expected_head:
        blocking_reasons.append("EXPECTED_HEAD_MISMATCH")
    if mergeable != "MERGEABLE":
        blocking_reasons.append("PR_MERGEABLE_NOT_MERGEABLE")
    if diff_result["returncode"] != 0:
        blocking_reasons.append("PR_DIFF_FAILED")
    if blocked_paths:
        blocking_reasons.append("FORBIDDEN_CHANGED_PATHS")
    if unexpected_paths:
        blocking_reasons.append("UNEXPECTED_CHANGED_PATHS")
    blocking_reasons.extend(checks_blocking_reasons(checks_summary, checks_result))
    blocking_reasons = sorted(set(blocking_reasons))

    readiness_verdict = READY_TO_MERGE if not blocking_reasons else PAS_READY
    software_verdict = "PR_READY_TO_MERGE" if readiness_verdict == READY_TO_MERGE else "PR_NOT_READY"

    return {
        "schema_version": SCHEMA_VERSION,
        "pr_number": args.pr,
        "pr_url": pr_view.get("url", ""),
        "head_sha": head_sha,
        "expected_head_sha": args.expected_head or "",
        "is_draft": is_draft,
        "mergeable": mergeable,
        "checks_summary": checks_summary,
        "changed_files": changed_files,
        "forbidden_changed_files": blocked_paths,
        "unexpected_changed_files": unexpected_paths,
        "readiness_verdict": readiness_verdict,
        "blocking_reasons": blocking_reasons,
        "software_verdict": software_verdict,
        "evidence_verdict": "MECHANICAL_PR_REVIEW_ONLY",
        "claim_verdict": NO_CLAIM_ALLOWED,
        "human_review_required": True,
        "commands_run": [result["command"] for result in command_results],
        "command_results": command_results,
    }


def write_output(path_text: str, payload: dict[str, Any], pretty: bool) -> None:
    path = Path(path_text)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2 if pretty else None, sort_keys=True) + "\n", encoding="utf-8")


def exit_code_for(report: dict[str, Any], expect_not_ready: bool) -> int:
    readiness_verdict = report.get("readiness_verdict")
    if expect_not_ready:
        return 0 if readiness_verdict == PAS_READY else 1
    return 0 if readiness_verdict == READY_TO_MERGE else 1


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    report = build_report(args)
    rendered = json.dumps(report, indent=2 if args.pretty else None, sort_keys=True)
    if args.output:
        write_output(args.output, report, args.pretty)
    print(rendered)
    return exit_code_for(report, args.expect_not_ready)


if __name__ == "__main__":
    raise SystemExit(main())
