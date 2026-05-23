import json
from pathlib import Path
from typing import Any, Dict, List, Optional


REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = REPO_ROOT / "lab" / "state" / "lab_registry.json"
EXPERIMENTS_DIR = REPO_ROOT / "lab" / "experiments"


def load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def load_registry() -> Dict[str, Any]:
    registry = load_json(REGISTRY_PATH)
    if registry is None:
        return {
            "updated_at": None,
            "active_experiment_id": None,
            "active_baseline_experiment": None,
            "experiments": [],
            "babies": [],
        }
    return registry


def iter_experiments(registry: Dict[str, Any]) -> List[Dict[str, Any]]:
    experiments = registry.get("experiments", [])
    if isinstance(experiments, dict):
        rows = []
        for exp_id, entry in experiments.items():
            item = dict(entry)
            item["experiment_id"] = item.get("experiment_id") or exp_id
            rows.append(item)
        return rows
    if isinstance(experiments, list):
        return [item for item in experiments if isinstance(item, dict)]
    return []


def collect_experiment_rows(registry: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    for exp_entry in iter_experiments(registry):
        exp_id = exp_entry.get("experiment_id", "unknown")
        exp_dir = Path(exp_entry.get("path", EXPERIMENTS_DIR / exp_id))
        report = load_json(exp_dir / "report.json")
        experiment_summary = (report or {}).get("experiment_summary", {})
        scientific_summary = (report or {}).get("scientific_summary", {})

        rows.append(
            {
                "experiment_id": exp_id,
                "status": exp_entry.get("status", "unknown"),
                "path": str(exp_dir),
                "report_exists": (exp_dir / "report.json").exists(),
                "report_txt_exists": (exp_dir / "report.txt").exists(),
                "baby_count": experiment_summary.get("baby_count"),
                "ready_for_comparison": experiment_summary.get("ready_for_comparison"),
                "best_candidate_baby_id": scientific_summary.get("best_candidate_baby_id"),
                "updated_at": exp_entry.get("updated_at"),
            }
        )

    rows.sort(key=lambda row: (row.get("updated_at") or "", row["experiment_id"]), reverse=True)
    return rows


def collect_baby_rows(registry: Dict[str, Any]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    for exp_entry in iter_experiments(registry):
        exp_id = exp_entry.get("experiment_id", "unknown")
        exp_dir = Path(exp_entry.get("path", EXPERIMENTS_DIR / exp_id))
        report = load_json(exp_dir / "report.json")
        if report is None:
            continue

        for baby in report.get("babies", []):
            tournament_analysis = baby.get("tournament_analysis", {})
            elo = tournament_analysis.get("elo", {})
            summary = tournament_analysis.get("summary", {})
            runtime = tournament_analysis.get("runtime", {})
            scientific_summary = baby.get("scientific_summary", {})

            rows.append(
                {
                    "experiment_id": exp_id,
                    "baby_id": baby.get("baby_id", "unknown"),
                    "neural_elo": elo.get("neural_elo"),
                    "draw_rate": summary.get("draw_rate"),
                    "turn_limit_rate": summary.get("turn_limit_rate"),
                    "runtime_status": runtime.get("status"),
                    "fallback_events": runtime.get("fallback_events", 0),
                    "validity": scientific_summary.get("validity"),
                    "signal_quality": scientific_summary.get("signal_quality"),
                }
            )

    rows.sort(
        key=lambda row: (
            row["neural_elo"] if row["neural_elo"] is not None else -10_000.0,
            row["experiment_id"],
            row["baby_id"],
        ),
        reverse=True,
    )
    return rows


def collect_alerts(experiments: List[Dict[str, Any]], babies: List[Dict[str, Any]]) -> List[str]:
    alerts: List[str] = []

    for exp in experiments:
        if not exp["report_exists"]:
            alerts.append(f"[MISSING REPORT] {exp['experiment_id']} has no report.json")
        if exp["status"] in {"failed", "rejected"}:
            alerts.append(f"[REJECTED/FAILED] {exp['experiment_id']} status={exp['status']}")

    for baby in babies:
        if baby.get("runtime_status") == "fallback_contaminated" or (baby.get("fallback_events", 0) > 0):
            alerts.append(
                f"[RUNTIME CONTAMINATION] {baby['experiment_id']}/{baby['baby_id']} fallback_events={baby.get('fallback_events', 0)}"
            )
        turn_limit_rate = baby.get("turn_limit_rate")
        if isinstance(turn_limit_rate, (float, int)) and float(turn_limit_rate) > 0.45:
            alerts.append(
                f"[HIGH TURN LIMIT] {baby['experiment_id']}/{baby['baby_id']} turn_limit_rate={float(turn_limit_rate):.4f}"
            )
        if baby.get("validity") in {"runtime_contaminated", "missing_tournament_data"}:
            alerts.append(
                f"[INVALID SCIENCE] {baby['experiment_id']}/{baby['baby_id']} validity={baby.get('validity')}"
            )

    return alerts


def fmt(value: Any, default: str = "-") -> str:
    if value is None:
        return default
    if isinstance(value, float):
        return f"{value:.4f}"
    return str(value)


def section(title: str) -> None:
    print(title)
    print("-" * len(title))


def print_experiments(experiments: List[Dict[str, Any]]) -> None:
    section("Experiments")
    if not experiments:
        print("No experiments registered.\n")
        return

    for exp in experiments:
        print(
            f"{exp['experiment_id']:28s} "
            f"status={exp['status']:10s} "
            f"babies={fmt(exp.get('baby_count')):>3s} "
            f"ready={fmt(exp.get('ready_for_comparison')):>5s} "
            f"best={fmt(exp.get('best_candidate_baby_id'))}"
        )
    print()


def print_top_babies(babies: List[Dict[str, Any]], limit: int = 8) -> None:
    section("Top Babies")
    if not babies:
        print("No baby reports available.\n")
        return

    for row in babies[:limit]:
        print(
            f"{row['experiment_id']}/{row['baby_id']:20s} "
            f"elo={fmt(row.get('neural_elo')):>8s} "
            f"draw={fmt(row.get('draw_rate')):>7s} "
            f"turn_limit={fmt(row.get('turn_limit_rate')):>7s} "
            f"validity={fmt(row.get('validity'))}"
        )
    print()


def print_alerts(alerts: List[str]) -> None:
    section("Alerts")
    if not alerts:
        print("No active alerts.\n")
        return

    for alert in alerts:
        print(alert)
    print()


def main() -> None:
    registry = load_registry()
    experiments = collect_experiment_rows(registry)
    babies = collect_baby_rows(registry)
    alerts = collect_alerts(experiments, babies)

    print("TACTICAL CHESS PURE LAB DASHBOARD")
    print("=================================")
    print(f"Registry: {REGISTRY_PATH}")
    print(f"Updated:  {fmt(registry.get('updated_at'))}")
    print(f"Active baseline: {fmt(registry.get('active_baseline_experiment') or registry.get('baseline_experiment_id'))}")
    print(f"Latest experiment: {fmt(registry.get('active_experiment_id'))}")
    print()

    print_experiments(experiments)
    print_top_babies(babies)
    print_alerts(alerts)


if __name__ == "__main__":
    main()
