import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


DEFAULT_SMOKE_REPORT_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr20_orchestration_smoke/orchestration_smoke.pr20.json"
)
STATUS_OUTPUT_DIR = Path(
    "lab/gameplay_observation/sandbox_outputs/pr21_automation_status"
)
STATUS_JSON_PATH = STATUS_OUTPUT_DIR / "automation_status.pr21.json"
STATUS_MD_PATH = STATUS_OUTPUT_DIR / "automation_status.pr21.md"

FORBIDDEN_OUTPUT_FRAGMENTS = (
    "lab/runs/",
    "lab/runs\\",
    "latest.json",
    "holdout/",
    "holdout\\",
)

COMPONENTS = [
    "gameplay_observation_runner",
    "observation_triage",
    "codex_task_queue",
    "codex_prompt_pack",
    "codex_execution_packet",
    "codex_result_intake",
    "orchestration_smoke_runner",
]

STATUS_INSTALLED = "INSTALLED"
STATUS_MISSING = "MISSING"
STATUS_BLOCKED = "BLOCKED"
STATUS_UNKNOWN = "UNKNOWN"
READY_STATUS = "READY_FOR_MANUAL_NON_CANONICAL_CODEX_LOOP"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_path(path: Path) -> str:
    return str(path).replace("\\", "/")


def is_safe_relative_path(path: Path) -> bool:
    raw = normalize_path(path)
    if PureWindowsPath(raw).is_absolute() or PurePosixPath(raw).is_absolute():
        return False
    return ".." not in PurePosixPath(raw).parts


def assert_noncanonical_output_path(path: Path) -> None:
    normalized = normalize_path(path).lower()
    if not is_safe_relative_path(path):
        raise ValueError(f"unsafe path: {path}")
    if any(fragment in normalized for fragment in FORBIDDEN_OUTPUT_FRAGMENTS):
        raise ValueError(f"forbidden output path: {path}")
    if not normalized.startswith("lab/gameplay_observation/sandbox_outputs/"):
        raise ValueError(
            "output path must remain under lab/gameplay_observation/sandbox_outputs/"
        )


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def step_status_map(smoke_report: dict[str, Any]) -> dict[str, str]:
    raw_steps = smoke_report.get("steps_run")
    if not isinstance(raw_steps, list):
        return {}

    mapping: dict[str, str] = {}
    for item in raw_steps:
        if not isinstance(item, dict):
            continue
        step_id = item.get("step_id")
        status = item.get("status")
        if isinstance(step_id, str) and isinstance(status, str):
            mapping[step_id] = status
    return mapping


def classify_step(
    steps: dict[str, str],
    step_id: str,
    installed_statuses: set[str],
) -> str:
    status = steps.get(step_id)
    if status is None:
        return STATUS_MISSING
    if status in installed_statuses:
        return STATUS_INSTALLED
    if status == "FAIL":
        return STATUS_BLOCKED
    return STATUS_UNKNOWN


def classify_result_intake(steps: dict[str, str]) -> str:
    f1 = steps.get("F1")
    f2 = steps.get("F2")
    if f1 is None or f2 is None:
        return STATUS_MISSING
    if f1 == "PASS" and f2 in {"EXPECTED_BLOCKED", "PASS"}:
        return STATUS_INSTALLED
    if f1 == "FAIL" or f2 == "FAIL":
        return STATUS_BLOCKED
    return STATUS_UNKNOWN


def classify_orchestration(smoke_report: dict[str, Any]) -> str:
    final_status = smoke_report.get("final_status")
    if not isinstance(final_status, str):
        return STATUS_UNKNOWN
    if final_status == "PASS":
        return STATUS_INSTALLED
    if final_status == "FAIL":
        return STATUS_BLOCKED
    return STATUS_UNKNOWN


def compute_component_status(smoke_report: dict[str, Any]) -> dict[str, str]:
    steps = step_status_map(smoke_report)
    component_status = {
        "gameplay_observation_runner": classify_step(steps, "A", {"PASS"}),
        "observation_triage": classify_step(steps, "B", {"PASS"}),
        "codex_task_queue": classify_step(steps, "C", {"PASS"}),
        "codex_prompt_pack": classify_step(steps, "D", {"PASS"}),
        "codex_execution_packet": classify_step(steps, "E", {"PASS"}),
        "codex_result_intake": classify_result_intake(steps),
        "orchestration_smoke_runner": classify_orchestration(smoke_report),
    }
    return component_status


def compute_overall_status(component_status: dict[str, str]) -> str:
    statuses = list(component_status.values())
    if any(status == STATUS_BLOCKED for status in statuses):
        return "BLOCKED"
    if all(status == STATUS_INSTALLED for status in statuses):
        return READY_STATUS
    return "PARTIAL"


def next_human_action_for_status(overall_status: str) -> str:
    if overall_status == READY_STATUS:
        return (
            "Run a human-reviewed manual non-canonical Codex loop and decide merge/reject; "
            "do not treat outputs as canonical evidence."
        )
    if overall_status == "BLOCKED":
        return (
            "Inspect blocked components in the PR-20 smoke chain, fix them in scoped PR work, "
            "and re-run PR-20 then PR-21 reports."
        )
    return (
        "Complete missing scaffold components, re-run PR-20 smoke, then regenerate this PR-21 status report."
    )


def next_codex_action_for_status(overall_status: str) -> str:
    if overall_status == READY_STATUS:
        return (
            "Await one focused, human-reviewed non-canonical implementation prompt from the execution packet."
        )
    if overall_status == "BLOCKED":
        return (
            "Prepare a focused remediation PR for blocked steps only, without claims, promotion, or canonical evidence."
        )
    return (
        "Do not proceed with loop execution; first add or repair missing non-canonical scaffold components."
    )


def build_status_report(
    smoke_report_path: Path,
    smoke_payload: dict[str, Any],
) -> dict[str, Any]:
    component_status = compute_component_status(smoke_payload)
    overall_status = compute_overall_status(component_status)
    return {
        "schema_version": "pr21.noncanonical_automation_status.v1",
        "created_at": utc_now(),
        "source_smoke_report": normalize_path(smoke_report_path),
        "installed_components": COMPONENTS,
        "component_status": component_status,
        "overall_status": overall_status,
        "next_human_action": next_human_action_for_status(overall_status),
        "next_codex_action": next_codex_action_for_status(overall_status),
        "canonical_evidence": False,
        "promotion_eligible": False,
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "human_review_required": True,
        "software_verdict": "AUTOMATION_STATUS_REPORT_BATCH_ADDED",
        "evidence_verdict": "NON_CANONICAL_ORCHESTRATION_ONLY",
    }


def build_blocked_status_report(smoke_report_path: Path, error: str) -> dict[str, Any]:
    component_status = {component: STATUS_UNKNOWN for component in COMPONENTS}
    return {
        "schema_version": "pr21.noncanonical_automation_status.v1",
        "created_at": utc_now(),
        "source_smoke_report": normalize_path(smoke_report_path),
        "installed_components": COMPONENTS,
        "component_status": component_status,
        "overall_status": "BLOCKED",
        "next_human_action": (
            "Fix smoke report availability/format, then re-run PR-20 smoke and regenerate PR-21 status."
        ),
        "next_codex_action": (
            "Do not execute non-canonical loop actions until smoke status input is readable and valid."
        ),
        "canonical_evidence": False,
        "promotion_eligible": False,
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "human_review_required": True,
        "software_verdict": "AUTOMATION_STATUS_REPORT_BATCH_ADDED",
        "evidence_verdict": "NON_CANONICAL_ORCHESTRATION_ONLY",
        "error": error,
    }


def write_markdown_report(report: dict[str, Any], destination: Path) -> None:
    lines = [
        "# PR-21 Codex Automation Installation Status (Non-Canonical)",
        "",
        "Status: manual non-canonical Codex loop scaffold check only",
        "",
        "## Metadata",
        "",
        f"- `schema_version`: `{report['schema_version']}`",
        f"- `created_at`: `{report['created_at']}`",
        f"- `source_smoke_report`: `{report['source_smoke_report']}`",
        f"- `overall_status`: `{report['overall_status']}`",
        "- `canonical_evidence`: `false`",
        "- `promotion_eligible`: `false`",
        "- `claim_verdict`: `NO_CLAIM_ALLOWED`",
        "- `human_review_required`: `true`",
        "",
        "## Component status",
        "",
        "| component | status |",
        "|---|---|",
    ]

    component_status = report.get("component_status", {})
    if isinstance(component_status, dict):
        for component in COMPONENTS:
            value = component_status.get(component, STATUS_UNKNOWN)
            lines.append(f"| {component} | {value} |")

    lines.extend(
        [
            "",
            "## Next actions",
            "",
            f"- Human: {report.get('next_human_action', '')}",
            f"- Codex: {report.get('next_codex_action', '')}",
            "",
            "## Critical interpretation boundaries",
            "",
            "- This scaffold is for manual non-canonical Codex loops only.",
            "- It is not autonomous production automation.",
            "- It is not scientific proof.",
            "- It does not authorize claims or promotion.",
            "- Human review still decides merge or reject.",
            "- Generated sandbox outputs must remain untracked.",
        ]
    )

    if isinstance(report.get("error"), str):
        lines.extend(
            [
                "",
                "## Error",
                "",
                f"- `{report['error']}`",
            ]
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def generate_status_report(smoke_report_path: Path) -> dict[str, Any]:
    assert_noncanonical_output_path(STATUS_OUTPUT_DIR)
    assert_noncanonical_output_path(STATUS_JSON_PATH)
    assert_noncanonical_output_path(STATUS_MD_PATH)

    try:
        payload = load_json(smoke_report_path)
    except Exception as exc:
        report = build_blocked_status_report(smoke_report_path, str(exc))
    else:
        if not isinstance(payload, dict):
            report = build_blocked_status_report(
                smoke_report_path, "smoke report must be a JSON object"
            )
        else:
            report = build_status_report(smoke_report_path, payload)

    STATUS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    STATUS_JSON_PATH.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    write_markdown_report(report, STATUS_MD_PATH)
    return report


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "PR-21 non-canonical Codex automation installation status report generator "
            "from PR-20 smoke output."
        )
    )
    parser.add_argument(
        "--smoke-report",
        default=str(DEFAULT_SMOKE_REPORT_PATH),
        help="PR-20 orchestration smoke report JSON path.",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print status report JSON to stdout.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    report = generate_status_report(Path(args.smoke_report))
    print(json.dumps(report, indent=2 if args.pretty else None, sort_keys=True))
    return 1 if report.get("overall_status") == "BLOCKED" else 0


if __name__ == "__main__":
    raise SystemExit(main())
