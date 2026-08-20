import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Sequence


@dataclass(frozen=True)
class RunPlan:
    objective: str
    dataset: List[str]
    command: str
    metrics: List[str]
    success_rule: str
    notes: List[str]
    priority: str
    estimated_runtime_sec: int

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "objective": self.objective,
            "dataset": self.dataset,
            "command": self.command,
            "metrics": self.metrics,
            "success_rule": self.success_rule,
            "notes": self.notes,
            "priority": self.priority,
            "estimated_runtime_sec": self.estimated_runtime_sec,
        }
        return payload


def supported_objectives() -> List[str]:
    return [
        "conversion",
        "benchmark",
        "smoke_benchmark",
        "python_runtime",
        "neural_tournament",
        "docs_close",
    ]


def build_plan(objective: str) -> RunPlan:
    obj = objective.strip().lower()

    if obj == "conversion":
        return RunPlan(
            objective="conversion",
            dataset=["lab/suites/conversion_suite_v1.jsonl"],
            command="cargo run --quiet -- conversion_suite",
            metrics=["improved_pct", "stagnated_pct", "regressed_pct"],
            success_rule="improved_pct >= 70 and regressed_pct == 0",
            notes=[
                "If the suite file is missing, build it with: python scripts/build_conversion_suite_v1.py",
                "Command runs the Rust CLI conversion suite; metrics are expected from its report output.",
            ],
            priority="A",
            estimated_runtime_sec=180,
        )

    if obj == "benchmark":
        return RunPlan(
            objective="benchmark",
            dataset=[
                "benchmark_runner.py",
                "scripts/run_benchmark.ps1",
                "scripts/python_runtime.ps1",
                "lab/reports/latest_benchmark_summary.json",
                "lab/tournaments/",
            ],
            command="scripts/run_benchmark.ps1 -Fast -Games 6 -RunClass exploration_only",
            metrics=["draw_rate", "neural_rank", "timeout_status", "fallback_used"],
            success_rule="no timeout and fallback_used=false",
            notes=[
                "Fast mode continuously writes lab/reports/latest_benchmark_summary.json during the run.",
                "Tournament CSV outputs are written under lab/tournaments/ (or a configured experiment dir).",
            ],
            priority="A",
            estimated_runtime_sec=600,
        )

    if obj == "smoke_benchmark":
        return RunPlan(
            objective="smoke_benchmark",
            dataset=[
                "benchmark_runner.py",
                "scripts/run_benchmark.ps1",
                "scripts/python_runtime.ps1",
                "lab/reports/latest_benchmark_summary.json",
                "lab/tournaments/",
            ],
            command="scripts/run_benchmark.ps1 -Smoke -RunClass exploration_only -TimeoutSeconds 180",
            metrics=[
                "completed_games",
                "planned_games",
                "avg_turns",
                "timeout_status",
                "fallback_used",
                "inference_confirmed",
            ],
            success_rule="completed_games >= 2 and fallback_used=false and timeout_status=false",
            notes=[
                "Uses smoke mode to keep daily iteration quick: exactly 2 games (neural white once, neural black once), capped at 40 turns each.",
                "If inference_confirmed is false, inspect games_detailed.csv under lab/smoke_benchmark/tournaments/.",
            ],
            priority="S",
            estimated_runtime_sec=120,
        )

    if obj == "python_runtime":
        return RunPlan(
            objective="python_runtime",
            dataset=["scripts/python_runtime.ps1"],
            command="powershell -ExecutionPolicy Bypass -File scripts/python_runtime.ps1 python --version",
            metrics=["exit_code", "python_version"],
            success_rule="exit_code == 0",
            notes=[
                "Uses the repo's Python runtime wrapper to ensure the expected interpreter is used.",
            ],
            priority="S",
            estimated_runtime_sec=15,
        )

    if obj == "neural_tournament":
        return RunPlan(
            objective="neural_tournament",
            dataset=["lab/tournaments/"],
            command="cargo run -- neural_tournament 1",
            metrics=["exit_code", "games_played", "errors"],
            success_rule="exit_code == 0 and errors == 0",
            notes=[
                "Runs a minimal tournament run; increase the final integer to scale games.",
                "Outputs are typically written under lab/tournaments/ (or TCS_EXPERIMENT_DIR).",
            ],
            priority="B",
            estimated_runtime_sec=240,
        )

    if obj == "docs_close":
        return RunPlan(
            objective="docs_close",
            dataset=["README.md", "00_STUDIO_CONTROL/00_MASTER_DOCS/"],
            command="python doctor.py",
            metrics=["missing_items_count"],
            success_rule="missing_items_count == 0",
            notes=[
                "Treat this as a checklist objective: update docs, then re-run until the report is clean.",
                "Extend doctor.py if you want stricter doc checks (links, registry consistency, etc.).",
            ],
            priority="B",
            estimated_runtime_sec=30,
        )

    raise ValueError(f"Unsupported objective: {objective}")


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Agent Run Planner V2: central lab operator (plan + run + report)."
    )
    parser.add_argument(
        "objective",
        nargs="?",
        default="",
        help="Objective name (example: conversion).",
    )
    parser.add_argument(
        "--objective",
        default="",
        dest="legacy_objective",
        help="Objective name (legacy flag; also supported).",
    )
    parser.add_argument(
        "--list-objectives",
        action="store_true",
        help="Print supported objectives and exit.",
    )
    parser.add_argument(
        "--json-only",
        "--json",
        dest="json_only",
        action="store_true",
        help="Emit only JSON (no human-readable text).",
    )
    parser.add_argument(
        "--run",
        action="store_true",
        help="Execute the suggested command for the objective.",
    )
    parser.add_argument(
        "--report",
        action="store_true",
        help="Attach the latest known report (if available) to the JSON output.",
    )
    return parser.parse_args(list(argv))


def format_human(payload: Dict[str, Any]) -> str:
    dataset_list = payload.get("dataset", []) or []
    metrics_list = payload.get("metrics", []) or []
    notes_list = payload.get("notes", []) or []

    dataset = ", ".join(dataset_list) if dataset_list else "(none)"
    metrics = ", ".join(metrics_list) if metrics_list else "(none)"
    notes = "\n".join(f"- {note}" for note in notes_list) if notes_list else "- (none)"
    blocked_by = ", ".join(payload.get("blocked_by", []) or []) or "none"
    next_best = payload.get("next_best_objective") or "none"

    return "\n".join(
        [
            "AGENT RUN PLANNER V2",
            f"Objective: {payload.get('objective', '')}",
            f"Priority: {payload.get('priority', 'n/a')}",
            f"Estimated runtime (sec): {payload.get('estimated_runtime_sec', 'n/a')}",
            f"Blocked by: {blocked_by}",
            f"Next best objective: {next_best}",
            f"Dataset: {dataset}",
            f"Command: {payload.get('command', '')}",
            f"Metrics: {metrics}",
            f"Success rule: {payload.get('success_rule', '')}",
            "Notes:",
            notes,
        ]
    )


def any_missing_dataset(paths: List[str]) -> bool:
    for raw in paths:
        if not raw:
            continue
        path = Path(raw.rstrip("/\\"))
        if raw.endswith(("/", "\\")):
            if not path.is_dir():
                return True
        else:
            if not path.exists():
                return True
    return False


_PYTHON_RUNTIME_OK: bool | None = None


def detect_python_runtime_ok() -> bool:
    global _PYTHON_RUNTIME_OK
    if _PYTHON_RUNTIME_OK is not None:
        return _PYTHON_RUNTIME_OK

    env_cmd = (os.environ.get("TCS_PYTHON_CMD") or "").strip()
    env_exe = (os.environ.get("TCS_PYTHON_EXE") or "").strip()

    candidates: List[List[str]] = []
    if env_cmd:
        candidates.append(env_cmd.split())
    if env_exe:
        candidates.append([env_exe])

    repo_candidates = [
        Path(".venv312") / "Scripts" / "python.exe",
        Path(".python312") / "python.exe",
        Path(".python312") / "Scripts" / "python.exe",
    ]
    for path in repo_candidates:
        if path.exists():
            candidates.append([str(path)])

    for name in ("py", "python", "python3"):
        found = shutil.which(name)
        if found:
            if name == "py":
                candidates.append([found, "-3.12"])
            else:
                candidates.append([found])

    for base in candidates:
        try:
            completed = subprocess.run(
                base + ["--version"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=4,
                check=False,
            )
        except Exception:
            continue
        if completed.returncode == 0:
            _PYTHON_RUNTIME_OK = True
            return True

    _PYTHON_RUNTIME_OK = False
    return False


def is_benchmark_busy() -> bool:
    summary = Path("lab/reports/latest_benchmark_summary.json")
    if not summary.exists():
        return False
    try:
        age_sec = time.time() - summary.stat().st_mtime
    except OSError:
        return False
    return age_sec <= 20.0


def report_for_objective(objective: str) -> Dict[str, Any]:
    obj = objective.strip().lower()

    if obj in {"benchmark", "smoke_benchmark"}:
        path = Path("lab/reports/latest_benchmark_summary.json")
        if not path.exists():
            return {"status": "missing", "path": str(path)}
        try:
            return {"status": "ok", "path": str(path), "data": json.loads(path.read_text(encoding="utf-8"))}
        except Exception as exc:
            return {"status": "error", "path": str(path), "error": str(exc)}

    if obj == "conversion":
        path = Path("lab/reports/conversion_suite_v1_latest.json")
        if not path.exists():
            return {"status": "missing", "path": str(path)}
        try:
            return {"status": "ok", "path": str(path), "data": json.loads(path.read_text(encoding="utf-8"))}
        except Exception as exc:
            return {"status": "error", "path": str(path), "error": str(exc)}

    if obj == "neural_tournament":
        base = Path("lab/tournaments")
        if not base.exists():
            return {"status": "missing", "path": str(base)}
        try:
            direct = base / "elo.csv"
            if direct.exists():
                return {"status": "ok", "path": str(base), "hint": "Found lab/tournaments/elo.csv"}

            best: Path | None = None
            best_mtime = -1.0
            for entry in base.glob("*"):
                if not entry.is_dir():
                    continue
                if (entry / "elo.csv").exists():
                    mtime = entry.stat().st_mtime
                    if mtime > best_mtime:
                        best_mtime = mtime
                        best = entry
            if best is None:
                return {"status": "missing", "path": str(base), "hint": "No elo.csv found under lab/tournaments/"}
            return {"status": "ok", "path": str(best), "hint": "Latest tournament dir by mtime"}
        except Exception as exc:
            return {"status": "error", "path": str(base), "error": str(exc)}

    return {"status": "unavailable", "reason": f"No known report mapping for objective '{objective}'"}


def run_argv_for_objective(objective: str) -> List[str]:
    obj = objective.strip().lower()

    if obj == "conversion":
        return ["cargo", "run", "--quiet", "--", "conversion_suite"]

    if obj == "benchmark":
        return [
            "powershell",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            "scripts/run_benchmark.ps1",
            "-Fast",
            "-Games",
            "6",
            "-RunClass",
            "exploration_only",
        ]

    if obj == "smoke_benchmark":
        return [
            "powershell",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            "scripts/run_benchmark.ps1",
            "-Smoke",
            "-RunClass",
            "exploration_only",
            "-TimeoutSeconds",
            "180",
        ]

    if obj == "python_runtime":
        return [
            "powershell",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            "scripts/python_runtime.ps1",
            "python",
            "--version",
        ]

    if obj == "neural_tournament":
        return ["cargo", "run", "--", "neural_tournament", "1"]

    if obj == "docs_close":
        return ["python", "doctor.py"]

    raise ValueError(f"Unsupported objective: {objective}")


def build_payload(plan: RunPlan, include_report: bool) -> Dict[str, Any]:
    payload = plan.to_dict()

    blocked_by: List[str] = []
    if any_missing_dataset(plan.dataset):
        blocked_by.append("missing_dataset")

    needs_python = plan.objective in {"benchmark", "smoke_benchmark", "python_runtime", "docs_close"}
    if needs_python and not detect_python_runtime_ok():
        blocked_by.append("python_runtime")

    if plan.objective in {"benchmark", "smoke_benchmark"} and is_benchmark_busy():
        blocked_by.append("benchmark_busy")

    payload["blocked_by"] = blocked_by

    if include_report:
        payload["report"] = report_for_objective(plan.objective)

    payload["next_best_objective"] = None
    return payload


def recommend_next_objective(current: str, payloads: Dict[str, Dict[str, Any]]) -> str | None:
    order = {"S": 0, "A": 1, "B": 2}

    candidates: List[Dict[str, Any]] = []
    for obj, payload in payloads.items():
        if obj == current:
            continue
        blocked = payload.get("blocked_by", []) or []
        candidates.append(
            {
                "objective": obj,
                "blocked": len(blocked) > 0,
                "priority": payload.get("priority", "B"),
                "runtime": payload.get("estimated_runtime_sec", 10**9),
            }
        )

    candidates.sort(
        key=lambda c: (
            c["blocked"],
            order.get(str(c["priority"]), 9),
            int(c["runtime"]),
            str(c["objective"]),
        )
    )
    if not candidates:
        return None
    return str(candidates[0]["objective"])


def maybe_run(objective: str) -> Dict[str, Any]:
    argv = run_argv_for_objective(objective)
    started = time.time()
    try:
        completed = subprocess.run(argv, check=False)
        exit_code = int(completed.returncode)
        ok = exit_code == 0
        return {
            "status": "ok" if ok else "failed",
            "argv": argv,
            "exit_code": exit_code,
            "duration_sec": round(time.time() - started, 3),
        }
    except Exception as exc:
        return {
            "status": "error",
            "argv": argv,
            "error": str(exc),
            "duration_sec": round(time.time() - started, 3),
        }


def main(argv: Sequence[str]) -> int:
    args = parse_args(argv)

    if args.list_objectives:
        for obj in supported_objectives():
            print(obj)
        return 0

    objective = (args.objective or "").strip() or (args.legacy_objective or "").strip()
    if not objective:
        print("Missing objective.", file=sys.stderr)
        print("Supported objectives:", ", ".join(supported_objectives()), file=sys.stderr)
        return 2

    try:
        plan = build_plan(objective)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        print("Supported objectives:", ", ".join(supported_objectives()), file=sys.stderr)
        return 2

    payload = build_payload(plan, include_report=bool(args.report))

    all_payloads: Dict[str, Dict[str, Any]] = {}
    for obj in supported_objectives():
        all_payloads[obj] = build_payload(build_plan(obj), include_report=False)
    payload["next_best_objective"] = recommend_next_objective(plan.objective, all_payloads)

    if args.run:
        payload["run"] = maybe_run(plan.objective)
        if args.report:
            payload["report_after_run"] = report_for_objective(plan.objective)

    if not args.json_only:
        print(format_human(payload))
        print()
        print("---")
        print()

    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
