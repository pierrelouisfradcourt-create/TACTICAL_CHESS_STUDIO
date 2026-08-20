import argparse
import fnmatch
import json
import re
import subprocess
import sys
from typing import Any


SCHEMA_VERSION = "auto_merge_guard.pr72.v1"
NO_CLAIM_ALLOWED = "NO_CLAIM_ALLOWED"
EVIDENCE_VERDICT = "MECHANICAL_PR_GATE_ONLY"
PASSIVE_RUNTIME_TITLE_PREFIX = "runtime: Add passive"

ALLOWED_TITLE_PREFIXES = (
    PASSIVE_RUNTIME_TITLE_PREFIX,
    "automation:",
    "docs:",
)

LEARNING_FIXTURE_SPEC_PATTERNS = (
    "lab/learning/fixtures/**",
    "lab/learning/schemas/**",
    "lab/learning/specs/**",
)

LEARNING_FORBIDDEN_PATTERNS = (
    "lab/learning/generated/**",
    "lab/learning/runs/**",
    "lab/learning/datasets/**",
    "lab/learning/models/**",
)

DOCS_CONTROL_PLANE_PATTERNS = (
    "00_STUDIO_CONTROL/00_MASTER_DOCS/**",
    "lab/gameplay_observation/PR_AUTO_*.md",
)

ALLOWED_PASSIVE_PATTERNS = (
    "src/ai/**",
    "src/env/**",
    "src/core/**",
    "src/lib.rs",
    "tests/*_boundary.rs",
    "tests/*_contract.rs",
    "lab/gameplay_observation/PR*.md",
    "00_STUDIO_CONTROL/00_MASTER_DOCS/**",
    "README.md",
    *LEARNING_FIXTURE_SPEC_PATTERNS,
)

PROTECTED_CONTROL_PLANE_PATTERNS = (
    "scripts/auto_merge_guard.py",
    "scripts/check_pr_readiness.py",
    "scripts/check_workspace_hygiene.py",
    "scripts/report_local_agent_session.py",
    "scripts/prepare_docs_update_pr.py",
    "scripts/check_*guard*.py",
    "scripts/*gate*.py",
)

FORBIDDEN_PATTERNS = (
    "src/chess/search.rs",
    "src/chess/root_decision.rs",
    "src/chess/decision.rs",
    "src/engine/**",
    "src/agents/**",
    "ml/**",
    ".github/**",
    "lab/reports/latest_benchmark_summary.json",
    "lab/runs/**",
    "latest.json",
    *LEARNING_FORBIDDEN_PATTERNS,
)

BEHAVIOR_RISK_PATTERNS = (
    "src/chess/**",
    "src/engine/**",
    "src/agents/**",
)

BEHAVIOR_RISK_KEYWORDS = (
    "behavior change",
    "changes runtime behavior",
    "modifies engine",
    "rewires search",
    "updates neural",
    "uses benchmark as proof",
    "search tuning",
    "search change",
    "engine change",
    "elo",
    "strength",
    "promotion",
    "scientific proof",
    "benchmark proof",
    "holdout",
    "dataset reset",
    "training",
    "neural",
    "ml",
)

NEGATED_SAFETY_TEXT_MARKERS = (
    "no ",
    "not ",
    "without ",
    "does not ",
    "must not ",
    "no changes to ",
    "no runtime wiring",
)

PASS_CHECK_BUCKETS = {"pass", "passed"}
FAIL_CHECK_BUCKETS = {"fail", "failed"}
PENDING_CHECK_BUCKETS = {"pending"}
CANCEL_CHECK_BUCKETS = {"cancel", "canceled", "cancelled"}
SKIPPED_CHECK_BUCKETS = {"skip", "skipped", "skipping"}

ALLOWED_EVIDENCE_VERDICTS = {
    "DOCUMENTATION_ONLY",
    "MECHANICAL_PR_GATE_ONLY",
    "MECHANICAL_RUNTIME_BOUNDARY_ONLY",
    "MECHANICAL_CONTROL_PLANE_ONLY",
    "MECHANICAL_CONTROL_PLANE_AUDIT_ONLY",
    "MECHANICAL_AUDIT_AND_CODE_INSPECTION_ONLY",
    "NON_CANONICAL_SANDBOX_ONLY",
}

SOFTWARE_VERDICTS_BY_LANE = {
    "docs": {
        "DOCS_SYNC_THROUGH_PR60",
        "LOCAL_MASTER_DOCS_UPDATES_SALVAGED",
        "AAA_ARCHITECTURE_DOC_CONSOLIDATED",
        "DOCUMENTATION_ONLY_UPDATED",
        "DOCS_UPDATE_ADDED",
        "LEARNING_FOUNDATIONS_EVIDENCE_INDEX_ADDED",
        "LEARNING_TRACE_SCHEMA_STANDARD_ADDED",
        "LEARNING_CONCEPT_DRILL_FIXTURES_ADDED",
        "LEARNING_TRACE_FIXTURES_ADDED",
        "LEARNING_PROMOTION_STATIC_FIXTURES_ADDED",
        "AUTOMATION_CONTROLLER_CONTRACT_ADDED",
        "AUTOMATION_LANE_MATRIX_ADDED",
        "AUTOMATION_SMOKE_MATRIX_ADDED",
        "AUTOMATION_BATCH_CONTROLLER_ADDED",
        "AUTOMATION_GPT_PLATFORM_BRIDGE_ADDED",
    },
    "automation": {
        "AUTO_MERGE_GUARD_ADDED",
        "AUTO_MERGE_GUARD_GH_CONTEXT_FIXED",
        "AUTO_MERGE_GUARD_PASSIVE_BOUNDARY_FIXED",
        "AUTO_MERGE_GUARD_SELF_MODIFICATION_HARDENED",
        "AUTO_MERGE_GUARD_VERDICT_CHECK_POLICY_HARDENED",
        "AUTO_MERGE_GUARD_LEARNING_FIXTURE_LANE_ADDED",
        "DOCS_UPDATE_PR_GUARD_READY",
        "LOCAL_AGENT_SESSION_RECOMMENDATION_FIXED",
        "STALE_BRANCH_CLEANUP_AUDIT_ADDED",
        "AUTOMATION_CLEANUP_READY_FOR_RUNTIME",
        "AUTO_MERGE_COMPLETED",
        "AUTO_MERGE_READY_DRY_RUN",
    },
    "passive_runtime": {
        "PASSIVE_SEARCH_BACKEND_BOUNDARY_ADDED",
        "PASSIVE_POLICY_GUIDE_BOUNDARY_ADDED",
        "PASSIVE_DECISION_CONTROLLER_BOUNDARY_ADDED",
        "PASSIVE_TACTICAL_ENV_BOUNDARY_ADDED",
        "PASSIVE_INITIAL_STATE_FACTORY_BOUNDARY_ADDED",
        "PASSIVE_OBSERVATION_BOUNDARY_ADDED",
    },
}

VERDICT_RE = re.compile(
    r"(?im)^\s*(software_verdict|evidence_verdict|claim_verdict)\s*:\s*([A-Za-z0-9_\-]+)\s*$"
)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fail-closed local guard that allows auto-merge only for safe passive bounded PRs."
    )
    parser.add_argument("--pr", required=True, type=int, help="Pull request number.")
    parser.add_argument("--repo", help="Optional GitHub repository in owner/name format.")
    parser.add_argument("--expected-head", required=True, help="Expected head SHA for match-head safety.")
    parser.add_argument(
        "--allow-merge",
        action="store_true",
        help="Actually perform merge when all safety gates pass. Default is report-only dry run.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON report.")
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


def gh_command(args: argparse.Namespace, pr_subcommand: list[str]) -> list[str]:
    command = ["gh", "pr", *pr_subcommand]
    if args.repo:
        command.extend(["--repo", args.repo])
    return command


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
    if bucket in SKIPPED_CHECK_BUCKETS:
        return "skipped"
    return "unknown"


def parse_checks(stdout: str) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "pending": 0,
        "canceled": 0,
        "skipped": 0,
        "unknown": 0,
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
        bucket = classify_check_bucket(str(item.get("bucket", "") or ""))
        summary["total"] += 1
        summary[bucket] += 1
    return summary


def format_evidence_comment_body(
    *,
    pr_number: int,
    expected_head: str,
    actual_head: str,
    changed_files: list[str],
    checks_passed: bool,
    checks_pending: int,
    checks_failed: int,
    checks_skipped: int,
    software_verdict_before_merge: str,
    evidence_verdict: str,
    claim_verdict: str,
    merge_result: str,
) -> str:
    changed_files_json = json.dumps(changed_files, sort_keys=True, ensure_ascii=True)
    return "\n".join(
        [
            "AUTO_MERGED_BY_GUARD",
            f"pr_number: {pr_number}",
            f"expected_head: {expected_head}",
            f"actual_head: {actual_head}",
            f"changed_files: {changed_files_json}",
            f"checks_passed: {checks_passed}",
            f"checks_pending: {checks_pending}",
            f"checks_failed: {checks_failed}",
            f"checks_skipped: {checks_skipped}",
            f"software_verdict_before_merge: {software_verdict_before_merge}",
            f"evidence_verdict: {evidence_verdict}",
            f"claim_verdict: {claim_verdict}",
            f"merge_result: {merge_result}",
        ]
    )


def matches_pattern(path: str, pattern: str) -> bool:
    normalized = normalize_path(path)
    normalized_pattern = normalize_path(pattern)
    if normalized_pattern.endswith("/**"):
        return normalized.startswith(normalized_pattern[:-3])
    return fnmatch.fnmatch(normalized, normalized_pattern)


def matches_any(path: str, patterns: tuple[str, ...]) -> bool:
    return any(matches_pattern(path, pattern) for pattern in patterns)


def extract_body_verdicts(body: str) -> dict[str, str]:
    verdicts: dict[str, str] = {}
    for key, value in VERDICT_RE.findall(body or ""):
        verdicts[key.strip().lower()] = value.strip().upper()
    return verdicts


def title_prefix_allowed(title: str) -> bool:
    return any(title.startswith(prefix) for prefix in ALLOWED_TITLE_PREFIXES)


def software_lane_from_title(title: str) -> str:
    if title.startswith("docs:"):
        return "docs"
    if title.startswith("automation:"):
        return "automation"
    if title.startswith(PASSIVE_RUNTIME_TITLE_PREFIX):
        return "passive_runtime"
    return "unknown"


def line_ignored_for_behavior_keyword_scan(line: str) -> bool:
    lower_line = line.strip().lower()
    if not lower_line:
        return True
    return any(marker in lower_line for marker in NEGATED_SAFETY_TEXT_MARKERS)


def docs_control_plane_keyword_scan_allowed(
    *,
    title: str,
    changed_files: list[str],
    protected_control_plane_files: list[str],
    forbidden_files: list[str],
    body_verdicts_valid: bool,
) -> bool:
    return (
        title.startswith("docs:")
        and bool(changed_files)
        and all(matches_any(path, DOCS_CONTROL_PLANE_PATTERNS) for path in changed_files)
        and not protected_control_plane_files
        and not forbidden_files
        and body_verdicts_valid
    )


def detect_behavior_risk(
    title: str,
    body: str,
    changed_files: list[str],
    *,
    skip_keyword_scan: bool = False,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    is_passive_runtime_title = title.startswith(PASSIVE_RUNTIME_TITLE_PREFIX)
    keyword_scan_lines = [title, *body.splitlines()]

    if title.startswith("runtime:") and not is_passive_runtime_title:
        reasons.append("RUNTIME_TITLE_NOT_PASSIVE")
    keyword_hit = (
        False
        if skip_keyword_scan
        else any(
            keyword in line.strip().lower()
            for line in keyword_scan_lines
            if not line_ignored_for_behavior_keyword_scan(line)
            for keyword in BEHAVIOR_RISK_KEYWORDS
        )
    )
    if keyword_hit:
        reasons.append("BEHAVIOR_RISK_KEYWORDS_PRESENT")
    if any(matches_any(path, BEHAVIOR_RISK_PATTERNS) for path in changed_files):
        reasons.append("BEHAVIOR_RISK_PATHS_PRESENT")
    if any(path.startswith("src/") for path in changed_files) and not is_passive_runtime_title:
        reasons.append("SRC_CHANGE_WITHOUT_PASSIVE_RUNTIME_TITLE")
    if any(normalize_path(path) == "src/lib.rs" for path in changed_files) and not is_passive_runtime_title:
        reasons.append("SRC_LIB_CHANGED_WITHOUT_PASSIVE_RUNTIME_TITLE")

    reasons = sorted(set(reasons))
    return bool(reasons), reasons


def derive_pre_merge_software_verdict(
    *,
    gh_read_failure: bool,
    protected_control_plane_files: list[str],
    body_verdicts_blocked: bool,
    forbidden_files: list[str],
    behavior_risk: bool,
    safe_by_gates: bool,
) -> str:
    if gh_read_failure:
        return "AUTO_MERGE_BLOCKED_GH_READ_FAILURE"
    if protected_control_plane_files:
        return "AUTO_MERGE_BLOCKED_PROTECTED_CONTROL_PLANE"
    if body_verdicts_blocked:
        return "AUTO_MERGE_BLOCKED_BODY_VERDICTS"
    if forbidden_files:
        return "AUTO_MERGE_BLOCKED_FORBIDDEN_PATH"
    if behavior_risk:
        return "AUTO_MERGE_BLOCKED_BEHAVIOR_RISK"
    if safe_by_gates:
        return "AUTO_MERGE_READY_DRY_RUN"
    return "AUTO_MERGE_BLOCKED_GUARD"


def build_report(args: argparse.Namespace) -> dict[str, Any]:
    view_result = run_command(
        gh_command(args, ["view", str(args.pr), "--json", "state,isDraft,mergeable,headRefOid,title,body,url"])
    )
    checks_result = run_command(
        gh_command(args, ["checks", str(args.pr), "--json", "name,state,bucket,workflow,link"])
    )
    diff_result = run_command(gh_command(args, ["diff", str(args.pr), "--name-only"]))

    pr_view, view_parse_error = load_json_result(view_result)
    view_read_ok = view_result["returncode"] == 0 and not view_parse_error
    checks_read_ok = checks_result["returncode"] == 0
    diff_read_ok = diff_result["returncode"] == 0

    checks_summary = parse_checks(str(checks_result.get("stdout", ""))) if checks_read_ok else {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "pending": 0,
        "canceled": 0,
        "skipped": 0,
        "unknown": 0,
    }
    changed_files = parse_changed_files(str(diff_result.get("stdout", ""))) if diff_read_ok else []

    title = str(pr_view.get("title", "") or "")
    body = str(pr_view.get("body", "") or "")
    pr_url = str(pr_view.get("url", "") or "")
    state = str(pr_view.get("state", "") or "")
    is_draft = bool(pr_view.get("isDraft", False))
    mergeable = str(pr_view.get("mergeable", "") or "")
    actual_head = str(pr_view.get("headRefOid", "") or "")

    allowed_files = sorted([path for path in changed_files if matches_any(path, ALLOWED_PASSIVE_PATTERNS)])
    forbidden_files = sorted([path for path in changed_files if matches_any(path, FORBIDDEN_PATTERNS)])
    learning_fixture_files = sorted([path for path in changed_files if matches_any(path, LEARNING_FIXTURE_SPEC_PATTERNS)])
    learning_forbidden_files = sorted([path for path in changed_files if matches_any(path, LEARNING_FORBIDDEN_PATTERNS)])
    protected_control_plane_files = sorted(
        [path for path in changed_files if matches_any(path, PROTECTED_CONTROL_PLANE_PATTERNS)]
    )
    unexpected_files = sorted([path for path in changed_files if not matches_any(path, ALLOWED_PASSIVE_PATTERNS)])
    human_review_required = bool(protected_control_plane_files)
    checks_failed = int(checks_summary.get("failed", 0))
    checks_pending = int(checks_summary.get("pending", 0))
    checks_skipped = int(checks_summary.get("skipped", 0))
    checks_unknown = int(checks_summary.get("unknown", 0))
    checks_passed = (
        checks_read_ok
        and int(checks_summary.get("total", 0)) > 0
        and checks_failed == 0
        and checks_pending == 0
        and checks_skipped == 0
        and checks_unknown == 0
        and int(checks_summary.get("canceled", 0)) == 0
    )

    body_verdicts = extract_body_verdicts(body) if view_read_ok else {}
    body_software_verdict = body_verdicts.get("software_verdict", "")
    body_evidence_verdict = body_verdicts.get("evidence_verdict", "")
    body_claim_verdict = body_verdicts.get("claim_verdict", "")
    software_lane = software_lane_from_title(title)
    software_verdict_allowed_for_lane = (
        body_software_verdict in SOFTWARE_VERDICTS_BY_LANE.get(software_lane, set()) if view_read_ok else False
    )
    evidence_verdict_allowed = body_evidence_verdict in ALLOWED_EVIDENCE_VERDICTS if view_read_ok else False
    missing_body_verdicts = (
        sorted(
            key
            for key in ("software_verdict", "evidence_verdict", "claim_verdict")
            if key not in body_verdicts
        )
        if view_read_ok
        else []
    )
    body_verdicts_valid = (
        view_read_ok
        and not missing_body_verdicts
        and body_claim_verdict == NO_CLAIM_ALLOWED
        and software_verdict_allowed_for_lane
        and evidence_verdict_allowed
    )

    skip_behavior_keyword_scan = docs_control_plane_keyword_scan_allowed(
        title=title,
        changed_files=changed_files,
        protected_control_plane_files=protected_control_plane_files,
        forbidden_files=forbidden_files,
        body_verdicts_valid=body_verdicts_valid,
    )
    behavior_risk, behavior_risk_reasons = detect_behavior_risk(
        title,
        body,
        changed_files,
        skip_keyword_scan=skip_behavior_keyword_scan,
    )
    evidence_risk = (not checks_passed) or (view_read_ok and not evidence_verdict_allowed)
    claim_risk = (
        bool(missing_body_verdicts) or body_claim_verdict != NO_CLAIM_ALLOWED
        if view_read_ok
        else True
    )

    blocked_reasons: list[str] = []
    if view_result["returncode"] != 0:
        blocked_reasons.append("PR_VIEW_FAILED")
    if view_parse_error:
        blocked_reasons.append(view_parse_error)
    if not diff_read_ok:
        blocked_reasons.append("PR_DIFF_FAILED")
    if not checks_read_ok:
        blocked_reasons.append("PR_CHECKS_FAILED")
    if view_read_ok:
        if state != "OPEN":
            blocked_reasons.append("PR_NOT_OPEN")
        if mergeable != "MERGEABLE":
            blocked_reasons.append("PR_MERGEABLE_NOT_MERGEABLE")
        if actual_head != args.expected_head:
            blocked_reasons.append("EXPECTED_HEAD_MISMATCH")
        if not title_prefix_allowed(title):
            blocked_reasons.append("TITLE_PREFIX_NOT_ALLOWED")
        if missing_body_verdicts:
            blocked_reasons.append("PR_BODY_VERDICTS_MISSING")
        if body_claim_verdict != NO_CLAIM_ALLOWED:
            blocked_reasons.append("CLAIM_VERDICT_NOT_NO_CLAIM_ALLOWED")
        if body_software_verdict and not software_verdict_allowed_for_lane:
            blocked_reasons.append("SOFTWARE_VERDICT_NOT_ALLOWED_FOR_LANE")
        if body_evidence_verdict and not evidence_verdict_allowed:
            blocked_reasons.append("EVIDENCE_VERDICT_NOT_ALLOWED")
    if checks_read_ok:
        if not checks_passed:
            blocked_reasons.append("CHECKS_NOT_ALL_PASSED")
        if checks_pending > 0:
            blocked_reasons.append("CHECKS_PENDING")
        if checks_failed > 0:
            blocked_reasons.append("CHECKS_FAILED")
        if checks_skipped > 0:
            blocked_reasons.append("CHECKS_SKIPPED")
        if checks_unknown > 0:
            blocked_reasons.append("CHECKS_UNKNOWN")
    if diff_read_ok:
        if protected_control_plane_files:
            blocked_reasons.append("PROTECTED_CONTROL_PLANE_SCRIPT_CHANGED")
        if unexpected_files:
            blocked_reasons.append("CHANGED_FILE_OUTSIDE_ALLOWED_PASSIVE_SET")
        if forbidden_files:
            blocked_reasons.append("FORBIDDEN_FILES_CHANGED")
    if behavior_risk:
        blocked_reasons.append("BEHAVIOR_RISK_DETECTED")
    blocked_reasons = sorted(set(blocked_reasons))

    safe_by_gates = not blocked_reasons
    auto_merge_allowed = safe_by_gates and args.allow_merge
    merge_attempted = False
    merge_result = "NOT_ATTEMPTED_DRY_RUN"
    merge_errors: list[str] = []
    evidence_comment_required = auto_merge_allowed
    evidence_comment_attempted = False
    evidence_comment_result = "NOT_REQUIRED_DRY_RUN"

    gh_read_failure = (
        view_result["returncode"] != 0
        or bool(view_parse_error)
        or not checks_read_ok
        or not diff_read_ok
    )
    body_verdicts_blocked = view_read_ok and (
        bool(missing_body_verdicts)
        or body_claim_verdict != NO_CLAIM_ALLOWED
        or not software_verdict_allowed_for_lane
        or not evidence_verdict_allowed
    )
    software_verdict_before_merge = derive_pre_merge_software_verdict(
        gh_read_failure=gh_read_failure,
        protected_control_plane_files=protected_control_plane_files,
        body_verdicts_blocked=body_verdicts_blocked,
        forbidden_files=forbidden_files,
        behavior_risk=behavior_risk,
        safe_by_gates=safe_by_gates,
    )

    if args.allow_merge and not safe_by_gates:
        merge_result = "NOT_ATTEMPTED_BLOCKED"
        evidence_comment_result = "NOT_REQUIRED_BLOCKED"
    elif auto_merge_allowed:
        evidence_comment_attempted = True
        comment_body = format_evidence_comment_body(
            pr_number=args.pr,
            expected_head=args.expected_head,
            actual_head=actual_head,
            changed_files=changed_files,
            checks_passed=checks_passed,
            checks_pending=checks_pending,
            checks_failed=checks_failed,
            checks_skipped=checks_skipped,
            software_verdict_before_merge=software_verdict_before_merge,
            evidence_verdict=EVIDENCE_VERDICT,
            claim_verdict=NO_CLAIM_ALLOWED,
            merge_result="MERGE_PENDING_PRE_MERGE",
        )
        comment_result = run_command(gh_command(args, ["comment", str(args.pr), "--body", comment_body]))
        if comment_result["returncode"] != 0:
            merge_result = "NOT_ATTEMPTED_EVIDENCE_COMMENT_FAILED"
            evidence_comment_result = "COMMENT_FAILED_PRE_MERGE"
            merge_errors.append("EVIDENCE_COMMENT_FAILED_PRE_MERGE")
        else:
            evidence_comment_result = "COMMENT_CREATED_PRE_MERGE"
    if auto_merge_allowed and not merge_errors:
        merge_attempted = True
        ready_result = run_command(gh_command(args, ["ready", str(args.pr)]))
        if ready_result["returncode"] != 0:
            ready_text = f"{ready_result.get('stdout', '')}\n{ready_result.get('stderr', '')}".lower()
            if "already ready for review" not in ready_text:
                merge_errors.append("PR_READY_FAILED")
        if not merge_errors:
            merge_exec = run_command(
                gh_command(args, ["merge", str(args.pr), "--merge", "--match-head-commit", args.expected_head])
            )
            if merge_exec["returncode"] == 0:
                merge_result = "MERGE_OK"
            else:
                merge_result = "MERGE_FAILED"
                merge_errors.append("PR_MERGE_FAILED")
        else:
            merge_result = "MERGE_FAILED"
    if auto_merge_allowed and merge_result == "MERGE_OK":
        software_verdict = "AUTO_MERGE_COMPLETED"
    elif safe_by_gates and not args.allow_merge:
        software_verdict = "AUTO_MERGE_READY_DRY_RUN"
    else:
        software_verdict = software_verdict_before_merge
        if auto_merge_allowed and merge_result != "MERGE_OK":
            software_verdict = "AUTO_MERGE_BLOCKED_GUARD"

    return {
        "schema_version": SCHEMA_VERSION,
        "pr_number": args.pr,
        "pr_url": pr_url,
        "title": title,
        "state": state,
        "is_draft": is_draft,
        "mergeable": mergeable,
        "gh_view_returncode": view_result["returncode"],
        "gh_view_stderr": str(view_result.get("stderr", "") or ""),
        "gh_checks_returncode": checks_result["returncode"],
        "gh_checks_stderr": str(checks_result.get("stderr", "") or ""),
        "gh_diff_returncode": diff_result["returncode"],
        "gh_diff_stderr": str(diff_result.get("stderr", "") or ""),
        "expected_head": args.expected_head,
        "actual_head": actual_head,
        "checks_passed": checks_passed,
        "checks_pending": checks_pending,
        "checks_failed": checks_failed,
        "checks_skipped": checks_skipped,
        "body_software_verdict": body_software_verdict,
        "body_evidence_verdict": body_evidence_verdict,
        "body_claim_verdict": body_claim_verdict,
        "software_verdict_allowed_for_lane": software_verdict_allowed_for_lane,
        "evidence_verdict_allowed": evidence_verdict_allowed,
        "changed_files": changed_files,
        "allowed_files": allowed_files,
        "forbidden_files": forbidden_files,
        "learning_fixture_files": learning_fixture_files,
        "learning_forbidden_files": learning_forbidden_files,
        "protected_control_plane_files": protected_control_plane_files,
        "human_review_required": human_review_required,
        "auto_merge_allowed": auto_merge_allowed,
        "merge_attempted": merge_attempted,
        "merge_result": merge_result,
        "evidence_comment_required": evidence_comment_required,
        "evidence_comment_attempted": evidence_comment_attempted,
        "evidence_comment_result": evidence_comment_result,
        "blocked_reasons": blocked_reasons + merge_errors,
        "behavior_risk": behavior_risk,
        "behavior_risk_reasons": behavior_risk_reasons,
        "behavior_keyword_scan_skipped": skip_behavior_keyword_scan,
        "evidence_risk": evidence_risk,
        "claim_risk": claim_risk,
        "software_verdict": software_verdict,
        "evidence_verdict": EVIDENCE_VERDICT,
        "claim_verdict": NO_CLAIM_ALLOWED,
    }


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    report = build_report(args)
    print(json.dumps(report, indent=2 if args.pretty else None, sort_keys=True))
    if args.allow_merge and report.get("software_verdict") != "AUTO_MERGE_COMPLETED":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
