import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BASE_REF = "origin/main"
DEFAULT_HEAD_REF = "HEAD"


def normalize_path(path: str) -> str:
    return path.strip().lstrip("\ufeff").replace("\\", "/")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Classify changed paths to support local-first CI throttling decisions."
    )
    parser.add_argument("--base-ref", default=DEFAULT_BASE_REF, help="Base git ref for diff comparison.")
    parser.add_argument("--head-ref", default=DEFAULT_HEAD_REF, help="Head git ref for diff comparison.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    parser.add_argument(
        "--files-from",
        help="Optional file containing changed paths (one path per line) for local testing.",
    )
    return parser.parse_args()


def read_changed_files_from_git(base_ref: str, head_ref: str) -> list[str]:
    cmd = ["git", "diff", "--name-only", f"{base_ref}...{head_ref}"]
    run = subprocess.run(
        cmd,
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=False,
        check=False,
    )
    if run.returncode != 0:
        stderr_text = run.stderr.strip() or run.stdout.strip() or "unknown git diff error"
        raise RuntimeError(f"git_diff_failed: {stderr_text}")

    return [normalize_path(line) for line in run.stdout.splitlines() if line.strip()]


def read_changed_files_from_file(path: str) -> list[str]:
    file_path = Path(path)
    if not file_path.is_absolute():
        file_path = (PROJECT_ROOT / file_path).resolve()
    if not file_path.exists():
        raise FileNotFoundError(f"files_from_missing: {file_path}")

    lines = file_path.read_text(encoding="utf-8").splitlines()
    return [normalize_path(line) for line in lines if line.strip()]


def is_docs_only_path(path: str) -> bool:
    return (
        path == "README.md"
        or path.startswith("docs/")
        or path.startswith("MASTER_DOCS/")
        or path.endswith(".md")
    )


def classify_groups(paths: list[str]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {
        "docs_only": [],
        "control_plane_docs": [],
        "control_plane_scripts": [],
        "schemas": [],
        "workflows": [],
        "runtime_src": [],
        "ml": [],
        "benchmarks": [],
        "lab_agent_tasks": [],
    }

    for path in paths:
        if is_docs_only_path(path):
            groups["docs_only"].append(path)
        if path.startswith("docs/control-plane/"):
            groups["control_plane_docs"].append(path)
        if (
            path.startswith("scripts/control_plane/")
            or path.startswith("scripts/operator/")
            or path == "scripts/agent_pr_operator.py"
            or path == "scripts/validate_control_plane_json.py"
            or path == "requirements-control-plane.txt"
        ):
            groups["control_plane_scripts"].append(path)
        if (
            (path.startswith("schemas/") and path.endswith(".json"))
            or (path.startswith("lab/agent_tasks/") and path.endswith(".json"))
        ):
            groups["schemas"].append(path)
        if path.startswith(".github/workflows/"):
            groups["workflows"].append(path)
        if (
            path.startswith("src/")
            or path.startswith("tests/")
            or path == "Cargo.toml"
            or path == "Cargo.lock"
        ):
            groups["runtime_src"].append(path)
        if path.startswith("ml/"):
            groups["ml"].append(path)
        if (
            path.startswith("benchmarks/")
            or path.startswith("lab/benchmarks/")
            or path.startswith("lab/benchmark_outputs/")
            or (path.startswith("scripts/") and "benchmark" in path.lower())
        ):
            groups["benchmarks"].append(path)
        if path.startswith("lab/agent_tasks/"):
            groups["lab_agent_tasks"].append(path)

    for key in groups:
        groups[key] = sorted(set(groups[key]))

    return groups


def choose_profile(groups: dict[str, list[str]], docs_only: bool) -> str:
    if groups["workflows"]:
        return "WORKFLOW"
    if groups["benchmarks"]:
        return "BENCHMARK_BLOCKED"
    if groups["runtime_src"]:
        return "RUNTIME"
    if groups["ml"]:
        return "ML"
    if groups["control_plane_scripts"] or groups["schemas"]:
        return "CONTROL_PLANE"
    if docs_only or groups["control_plane_docs"]:
        return "DOCS_ONLY"
    return "MIXED"


def build_report(changed_files: list[str]) -> dict[str, Any]:
    normalized = sorted(set(normalize_path(path) for path in changed_files if path.strip()))
    groups = classify_groups(normalized)
    docs_only = bool(normalized) and all(is_docs_only_path(path) for path in normalized)

    recommended_remote_profile = choose_profile(groups, docs_only)

    return {
        "changed_files": normalized,
        "groups": groups,
        "docs_only": docs_only,
        "control_plane_docs": bool(groups["control_plane_docs"]),
        "control_plane_scripts": bool(groups["control_plane_scripts"]),
        "schemas": bool(groups["schemas"]),
        "workflows": bool(groups["workflows"]),
        "runtime_src": bool(groups["runtime_src"]),
        "ml": bool(groups["ml"]),
        "benchmarks": bool(groups["benchmarks"]),
        "lab_agent_tasks": bool(groups["lab_agent_tasks"]),
        "requires_runtime_check": bool(groups["runtime_src"]),
        "requires_control_plane_check": bool(groups["control_plane_scripts"] or groups["schemas"]),
        "requires_workflow_review": bool(groups["workflows"]),
        "requires_benchmark_manual_only": bool(groups["benchmarks"]),
        "recommended_remote_profile": recommended_remote_profile,
    }


def main() -> int:
    args = parse_args()
    try:
        if args.files_from:
            changed_files = read_changed_files_from_file(args.files_from)
        else:
            changed_files = read_changed_files_from_git(args.base_ref, args.head_ref)

        report = build_report(changed_files)
        if args.pretty:
            print(json.dumps(report, indent=2, sort_keys=True))
        else:
            print(json.dumps(report, sort_keys=True))
        return 0
    except Exception as exc:
        error = {
            "status": "ERROR",
            "error": str(exc),
            "recommended_remote_profile": "MIXED",
        }
        print(json.dumps(error, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
