import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


PASS = "PASS"
HOLD = "HOLD"
BLOCKED = "BLOCKED"
ESCALATE = "ESCALATE_TO_HUMANGATE"

PROMPT_REQUIRED_TOKENS = {
    "human_words": ("human", "intent", "demande", "user"),
    "task_class": ("task_class",),
    "sources_to_read": ("sources_to_read", "read first", "sources a lire"),
    "scope_in": ("scope_in", "allowed paths", "in scope"),
    "scope_out": ("scope_out", "forbidden paths", "out of scope"),
    "output_routing": ("output_routing", "output routing"),
    "blocked_actions": ("blocked_actions", "blocked actions", "actions bloquees"),
    "validation": ("validation",),
    "final_report": ("final_report", "required final report"),
    "claim_posture": ("NO_CLAIM_ALLOWED",),
    "no_global_ready_verdict": ("no_global_ready_verdict",),
}

REPORT_REQUIRED_TOKENS = {
    "repo_state": ("branch", "head", "worktree"),
    "files_changed": ("files_changed", "changed_files", "files changed"),
    "commands_run": ("commands_run", "commands run"),
    "results": ("results", "resultats"),
    "skipped_validation": ("skipped_validation", "commands_skipped", "skipped validation"),
    "risks": ("risks", "known_risks"),
    "status_by_surface": ("status_by_surface", "active_runtime_code"),
    "software_verdict": ("software_verdict",),
    "evidence_verdict": ("evidence_verdict",),
    "claim_verdict": ("claim_verdict",),
    "no_global_ready_verdict": ("no_global_ready_verdict",),
}

SURFACE_TOKENS = {
    "active_runtime_code": ("active_runtime_code", "runtime code"),
    "tests": ("tests",),
    "artifacts_runtime_outputs": ("artifacts_runtime_outputs", "runtime artifacts"),
    "canonical_docs": ("canonical_docs",),
    "roadmap_docs_only": ("roadmap_docs_only", "docs-only"),
    "inference": ("inference",),
}

FORBIDDEN_AUTHORITY_PATTERNS = (
    r"\bauto(?:matic)?\s+(?:commit|push|pr|merge|branch)\b",
    r"\bcommit\s+automatique\b",
    r"\bpush\s+automatique\b",
    r"\bready\s+to\s+merge\b",
    r"\bglobal(?:ly)?\s+ready\b",
    r"\btraining\b",
    r"\bfine[- ]?tuning\b",
    r"\bdataset\s+generation\b",
    r"\bbenchmark\s+proof\b",
)

IMPLEMENTATION_CLAIM_PATTERNS = (
    r"\bfully\s+implemented\b",
    r"\bvalidated\b",
    r"\bproven\b",
    r"\bbenchmark\s+passed\b",
)

JSON_EXECUTION_REQUIRED_FIELDS = (
    "schema_version",
    "task_id",
    "branch",
    "changed_files",
    "commands_run",
    "commands_skipped",
    "validation_results",
    "known_risks",
    "scope_deviation",
    "claim_verdict",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Passive prompt/report hygiene checker. It reads one file and emits a JSON gate report."
    )
    parser.add_argument("path", help="Prompt or report file to inspect.")
    parser.add_argument(
        "--mode",
        choices=("prompt", "report", "auto"),
        default="auto",
        help="Check as prompt, report, or infer from content.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def print_report(report: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(report, indent=2, sort_keys=True))
        return
    print(json.dumps(report, separators=(",", ":"), sort_keys=True))


def normalize_text(text: str) -> str:
    return (
        text.lower()
        .replace("é", "e")
        .replace("è", "e")
        .replace("ê", "e")
        .replace("à", "a")
        .replace("ç", "c")
    )


def has_any_token(normalized_text: str, tokens: tuple[str, ...]) -> bool:
    return any(token.lower() in normalized_text for token in tokens)


def missing_token_groups(normalized_text: str, required: dict[str, tuple[str, ...]]) -> list[str]:
    return [name for name, tokens in required.items() if not has_any_token(normalized_text, tokens)]


def regex_matches(text: str, patterns: tuple[str, ...]) -> list[str]:
    return [pattern for pattern in patterns if re.search(pattern, text, flags=re.IGNORECASE)]


def unsafe_forbidden_authority_mentions(text: str) -> list[str]:
    unsafe_patterns: list[str] = []
    safe_context = re.compile(
        r"\b(blocked|prohibited|forbidden|interdit|bloque|do not|no |without humangate|scope_out)\b",
        flags=re.IGNORECASE,
    )
    for pattern in FORBIDDEN_AUTHORITY_PATTERNS:
        for line in text.splitlines():
            if not re.search(pattern, line, flags=re.IGNORECASE):
                continue
            if safe_context.search(line):
                continue
            unsafe_patterns.append(pattern)
            break
    return unsafe_patterns


def load_payload(path: Path) -> tuple[str, Any | None, list[str]]:
    text = path.read_text(encoding="utf-8")
    errors: list[str] = []
    payload: Any | None = None
    if path.suffix.lower() == ".json":
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            errors.append(f"json_parse_error: {exc}")
    return text, payload, errors


def infer_mode(requested_mode: str, text: str, payload: Any | None) -> str:
    if requested_mode != "auto":
        return requested_mode
    if isinstance(payload, dict) and ("changed_files" in payload or "commands_run" in payload):
        return "report"
    normalized = normalize_text(text)
    if "final_report" in normalized or "sources_to_read" in normalized or "scope_in" in normalized:
        return "prompt"
    return "report"


def check_prompt(text: str) -> dict[str, Any]:
    normalized = normalize_text(text)
    missing = missing_token_groups(normalized, PROMPT_REQUIRED_TOKENS)
    forbidden = unsafe_forbidden_authority_mentions(text)

    if forbidden:
        status = BLOCKED
    elif missing:
        status = BLOCKED
    else:
        status = PASS

    return {
        "hygiene_status": status,
        "mode": "prompt",
        "missing_required_groups": missing,
        "forbidden_authority_patterns": forbidden,
        "claim_posture_result": PASS if "no_claim_allowed" in normalized else BLOCKED,
        "human_gate_result": PASS if "humangate" in normalized or "human gate" in normalized else HOLD,
        "errors": [],
    }


def check_json_execution_report(payload: dict[str, Any]) -> dict[str, Any]:
    missing = [field for field in JSON_EXECUTION_REQUIRED_FIELDS if field not in payload]
    errors: list[str] = []

    if payload.get("claim_verdict") != "NO_CLAIM_ALLOWED":
        errors.append("claim_verdict_must_be_NO_CLAIM_ALLOWED")
    if not payload.get("commands_run"):
        errors.append("commands_run_missing_or_empty")
    if "validation_results" not in payload or not isinstance(payload.get("validation_results"), list):
        errors.append("validation_results_missing_or_not_list")
    if "known_risks" not in payload:
        errors.append("known_risks_missing")

    status = BLOCKED if missing or errors else PASS
    return {
        "hygiene_status": status,
        "mode": "report",
        "json_execution_report": True,
        "missing_required_groups": missing,
        "surface_status_result": HOLD,
        "forbidden_claim_patterns": [],
        "errors": errors,
    }


def check_text_report(text: str) -> dict[str, Any]:
    normalized = normalize_text(text)
    missing = missing_token_groups(normalized, REPORT_REQUIRED_TOKENS)
    missing_surfaces = missing_token_groups(normalized, SURFACE_TOKENS)
    forbidden_claims = regex_matches(text, IMPLEMENTATION_CLAIM_PATTERNS)

    errors: list[str] = []
    if "claim_verdict" in normalized and "no_claim_allowed" not in normalized:
        errors.append("claim_verdict_present_without_NO_CLAIM_ALLOWED")

    if forbidden_claims:
        status = BLOCKED
    elif missing or missing_surfaces or errors:
        status = BLOCKED
    else:
        status = PASS

    return {
        "hygiene_status": status,
        "mode": "report",
        "json_execution_report": False,
        "missing_required_groups": missing,
        "missing_surface_groups": missing_surfaces,
        "forbidden_claim_patterns": forbidden_claims,
        "errors": errors,
    }


def main() -> int:
    args = parse_args()
    path = Path(args.path).resolve()

    if not path.exists():
        print_report(
            {
                "hygiene_status": BLOCKED,
                "mode": args.mode,
                "errors": [f"path_not_found: {path}"],
            },
            args.pretty,
        )
        return 2

    try:
        text, payload, load_errors = load_payload(path)
    except OSError as exc:
        print_report(
            {
                "hygiene_status": BLOCKED,
                "mode": args.mode,
                "errors": [f"io_error: {exc}"],
            },
            args.pretty,
        )
        return 2

    if load_errors:
        print_report(
            {
                "hygiene_status": BLOCKED,
                "mode": args.mode,
                "errors": load_errors,
            },
            args.pretty,
        )
        return 2

    mode = infer_mode(args.mode, text, payload)
    if mode == "prompt":
        report = check_prompt(text)
    elif isinstance(payload, dict):
        report = check_json_execution_report(payload)
    else:
        report = check_text_report(text)

    report["path"] = str(path)
    print_report(report, args.pretty)

    if report["hygiene_status"] == PASS:
        return 0
    if report["hygiene_status"] in (HOLD, ESCALATE):
        return 1
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
