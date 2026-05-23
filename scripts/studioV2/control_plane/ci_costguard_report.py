import argparse
import json
import sys
from pathlib import Path
from typing import Any


CHANGED_PATHS_SCHEMA = "studiopilot.changed_paths.v0"
USAGE_PROFILE_SCHEMA = "studiopilot.ci_usage_observed.v0"
REPORT_SCHEMA = "studiopilot.ci_costguard_report.v0"

VALID_PROFILES = {
    "DOCS_ONLY",
    "CONTROL_PLANE",
    "RUNTIME",
    "ML",
    "WORKFLOW",
    "BENCHMARK",
    "MIXED",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a local CI CostGuard risk report from changed paths and observed CI usage."
    )
    parser.add_argument("--changed-paths", required=True, help="JSON fixture with changed paths.")
    parser.add_argument("--usage-profile", required=True, help="JSON fixture with observed CI usage.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def normalize_path(path: str) -> str:
    normalized = path.strip().lstrip("\ufeff").replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def read_json(path_text: str) -> Any:
    path = Path(path_text)
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"missing_json_file: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid_json: {path}: {exc}") from exc
    except OSError as exc:
        raise ValueError(f"json_read_failed: {path}: {exc}") from exc


def require_object(payload: Any, label: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError(f"{label}_must_be_object")
    return payload


def load_changed_paths(path_text: str) -> list[str]:
    payload = require_object(read_json(path_text), "changed_paths")
    if payload.get("schema_version") != CHANGED_PATHS_SCHEMA:
        raise ValueError(f"unexpected_changed_paths_schema: {payload.get('schema_version')}")
    paths = payload.get("paths")
    if not isinstance(paths, list) or not all(isinstance(item, str) for item in paths):
        raise ValueError("changed_paths_paths_must_be_string_array")
    return sorted(set(normalize_path(item) for item in paths if item.strip()))


def load_usage_profile(path_text: str) -> dict[str, Any]:
    payload = require_object(read_json(path_text), "usage_profile")
    if payload.get("schema_version") != USAGE_PROFILE_SCHEMA:
        raise ValueError(f"unexpected_usage_profile_schema: {payload.get('schema_version')}")
    top_workflows = payload.get("top_workflows")
    if not isinstance(top_workflows, list):
        raise ValueError("usage_profile_top_workflows_must_be_array")
    for workflow in top_workflows:
        if not isinstance(workflow, dict):
            raise ValueError("usage_profile_top_workflows_entries_must_be_objects")
        if not isinstance(workflow.get("workflow"), str):
            raise ValueError("usage_profile_top_workflow_missing_workflow")
    return payload


def is_docs_path(path: str) -> bool:
    return path.startswith("docs/") or path.endswith(".md") or path == "README.md"


def is_control_plane_path(path: str) -> bool:
    return (
        path.startswith("docs/control-plane/")
        or path.startswith("scripts/control_plane/")
        or path.startswith("scripts/operator/")
        or path == "requirements-control-plane.txt"
        or path == "scripts/validate_control_plane_json.py"
        or path == "scripts/agent_pr_operator.py"
    )


def path_categories(path: str) -> set[str]:
    categories: set[str] = set()
    lower_path = path.lower()

    if path.startswith(".github/workflows/"):
        categories.add("WORKFLOW")
    if (
        path.startswith("src/")
        or path.startswith("crates/")
        or path.startswith("tests/")
        or path == "Cargo.toml"
        or path == "Cargo.lock"
    ):
        categories.add("RUNTIME")
    if (
        path.startswith("ml/")
        or path.startswith("training/")
        or path.startswith("train/")
        or "training" in lower_path
    ):
        categories.add("ML")
    if (
        path.startswith("benchmarks/")
        or path.startswith("benchmark/")
        or path.startswith("lab/runs/")
        or path.startswith("lab/benchmarks/")
        or path.startswith("lab/benchmark_outputs/")
        or "benchmark" in lower_path
    ):
        categories.add("BENCHMARK")
    if is_control_plane_path(path):
        categories.add("CONTROL_PLANE")
    elif is_docs_path(path):
        categories.add("DOCS_ONLY")

    if not categories:
        categories.add("MIXED")
    return categories


def classify_change_profile(paths: list[str]) -> tuple[str, dict[str, list[str]]]:
    grouped: dict[str, list[str]] = {profile: [] for profile in VALID_PROFILES}
    active_categories: set[str] = set()

    for path in paths:
        categories = path_categories(path)
        for category in categories:
            grouped[category].append(path)
            active_categories.add(category)

    for key in grouped:
        grouped[key] = sorted(set(grouped[key]))

    if not paths:
        return "DOCS_ONLY", grouped
    if active_categories == {"CONTROL_PLANE"}:
        return "CONTROL_PLANE", grouped
    if active_categories == {"DOCS_ONLY"}:
        return "DOCS_ONLY", grouped
    if len(active_categories) == 1:
        return next(iter(active_categories)), grouped
    return "MIXED", grouped


def likely_expensive_workflows(usage_profile: dict[str, Any]) -> list[dict[str, Any]]:
    workflows: list[dict[str, Any]] = []
    for entry in usage_profile.get("top_workflows", []):
        workflow = {
            "workflow": entry.get("workflow"),
            "minutes": entry.get("minutes"),
            "workflow_runs": entry.get("workflow_runs"),
            "jobs_per_run": entry.get("jobs_per_run"),
        }
        workflows.append(workflow)
    return sorted(
        workflows,
        key=lambda item: (
            -(item.get("minutes") if isinstance(item.get("minutes"), int | float) else 0),
            str(item.get("workflow")),
        ),
    )


def policy_for_profile(profile: str) -> tuple[str, str, str]:
    if profile == "DOCS_ONLY":
        return (
            "LOW",
            "local validation plus final gate only",
            "Batch docs changes locally, then use the final gate as the remote confirmation.",
        )
    if profile == "CONTROL_PLANE":
        return (
            "MEDIUM",
            "local control-plane validation plus final gate only",
            "Run local control-plane checks before push; keep remote CI narrow until throttle evidence is reviewed.",
        )
    if profile == "RUNTIME":
        return (
            "HIGH",
            "targeted runtime checks before push",
            "Run focused runtime validation locally and expect heavier remote checks after human approval.",
        )
    if profile == "WORKFLOW":
        return (
            "HIGH",
            "isolated workflow PR",
            "Keep workflow edits isolated and review branch-protection behavior before relying on path filters.",
        )
    if profile == "ML":
        return (
            "HIGH",
            "no automatic training",
            "Run only explicit local ML validation approved by the human; do not launch training automatically.",
        )
    if profile == "BENCHMARK":
        return (
            "BLOCKED",
            "workflow_dispatch/manual only",
            "Do not automate benchmark validation or treat performance runs as proof.",
        )
    return (
        "HIGH",
        "split PatchPack or human approval",
        "Split unrelated change categories where possible, otherwise require explicit HumanGate approval.",
    )


def build_reasons(paths: list[str], profile: str, grouped: dict[str, list[str]], usage_profile: dict[str, Any]) -> list[str]:
    reasons = [
        f"classified {len(paths)} changed path(s) as {profile}",
        "report is fixture-driven and local-only",
        "no_claim_allowed doctrine is active",
    ]

    for category in sorted(grouped):
        if grouped[category]:
            reasons.append(f"{category}: {len(grouped[category])} path(s)")

    total_minutes = usage_profile.get("observed_total_minutes")
    total_job_runs = usage_profile.get("observed_total_job_runs")
    workflow_runs = usage_profile.get("observed_workflow_runs")
    if isinstance(total_minutes, int | float):
        reasons.append(f"observed total GitHub Actions minutes: {total_minutes}")
    if isinstance(total_job_runs, int):
        reasons.append(f"observed total job runs: {total_job_runs}")
    if isinstance(workflow_runs, int):
        reasons.append(f"observed workflow runs: {workflow_runs}")

    for workflow in likely_expensive_workflows(usage_profile)[:1]:
        name = workflow.get("workflow")
        minutes = workflow.get("minutes")
        runs = workflow.get("workflow_runs")
        jobs = workflow.get("jobs_per_run")
        reasons.append(f"top observed workflow: {name} used {minutes} minutes across {runs} runs at {jobs} jobs/run")

    return reasons


def build_report(paths: list[str], usage_profile: dict[str, Any]) -> dict[str, Any]:
    profile, grouped = classify_change_profile(paths)
    risk, policy, action = policy_for_profile(profile)

    return {
        "schema_version": REPORT_SCHEMA,
        "overall_risk": risk,
        "change_profile": profile,
        "likely_expensive_workflows": likely_expensive_workflows(usage_profile),
        "recommended_ci_policy": policy,
        "recommended_human_action": action,
        "reasons": build_reasons(paths, profile, grouped, usage_profile),
        "no_claim_allowed": True,
    }


def main() -> int:
    args = parse_args()
    try:
        paths = load_changed_paths(args.changed_paths)
        usage_profile = load_usage_profile(args.usage_profile)
        report = build_report(paths, usage_profile)
        print(json.dumps(report, indent=2 if args.pretty else None, sort_keys=True))
        return 1 if report["overall_risk"] == "BLOCKED" else 0
    except Exception as exc:
        error = {
            "schema_version": REPORT_SCHEMA,
            "overall_risk": "BLOCKED",
            "change_profile": "MIXED",
            "likely_expensive_workflows": [],
            "recommended_ci_policy": "fix local fixture or script configuration",
            "recommended_human_action": "HOLD until the local CI CostGuard input error is resolved.",
            "reasons": [str(exc)],
            "no_claim_allowed": True,
        }
        print(json.dumps(error, indent=2 if args.pretty else None, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
