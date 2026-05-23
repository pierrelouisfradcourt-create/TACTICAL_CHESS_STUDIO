import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from experiment_analytics import load_report
from experiment_runner import REPO_ROOT
from lab_orchestrator import doctor, registry_view, run, status


EXPERIMENTS_DIR = REPO_ROOT / "lab" / "experiments"


def config_path_for_experiment(exp_id: str) -> Path:
    return EXPERIMENTS_DIR / exp_id / "config.json"


def report_path_for_experiment(exp_id: str) -> Path:
    return EXPERIMENTS_DIR / exp_id / "report.json"


def load_experiment_report(exp_id: str) -> Dict[str, Any]:
    report_path = report_path_for_experiment(exp_id)
    report = load_report(report_path)
    if report is None:
        raise FileNotFoundError(f"Missing report.json for experiment: {exp_id}")
    return report


def command_status() -> None:
    print(json.dumps(status(), indent=2))


def command_run(exp_id: str) -> None:
    config_path = config_path_for_experiment(exp_id)
    if not config_path.exists():
        raise FileNotFoundError(f"Missing config.json for experiment: {exp_id}")

    result = run(config_path)
    print(
        json.dumps(
            {
                "experiment_id": result["experiment_id"],
                "baby_count": result["experiment_summary"]["baby_count"],
                "ready_for_comparison": result["experiment_summary"]["ready_for_comparison"],
            },
            indent=2,
        )
    )


def build_leaderboard_rows() -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    if not EXPERIMENTS_DIR.exists():
        return rows

    for exp_dir in sorted(EXPERIMENTS_DIR.iterdir()):
        if not exp_dir.is_dir():
            continue

        report = load_report(exp_dir / "report.json")
        if report is None:
            continue

        for baby in report.get("babies", []):
            scientific_summary = baby.get("scientific_summary", {})
            tournament_analysis = baby.get("tournament_analysis", {})
            elo = tournament_analysis.get("elo", {})
            summary = tournament_analysis.get("summary", {})

            rows.append(
                {
                    "experiment_id": report.get("experiment_id", exp_dir.name),
                    "baby_id": baby.get("baby_id", "unknown"),
                    "neural_elo": elo.get("neural_elo"),
                    "draw_rate": summary.get("draw_rate"),
                    "turn_limit_rate": summary.get("turn_limit_rate"),
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


def command_leaderboard() -> None:
    rows = build_leaderboard_rows()
    print(json.dumps(rows, indent=2))


def command_inspect(exp_id: str, baby_id: str) -> None:
    report = load_experiment_report(exp_id)

    for baby in report.get("babies", []):
        if baby.get("baby_id") == baby_id:
            print(json.dumps(baby, indent=2))
            return

    raise FileNotFoundError(f"Missing baby report for {exp_id}/{baby_id}")


def command_registry() -> None:
    registry = registry_view()

    print("TACTICAL CHESS PURE LAB REGISTRY")
    print("================================")
    print(f"Updated: {registry.get('updated_at')}")
    print(f"Active experiment: {registry.get('active_experiment_id')}")
    print(f"Active baseline: {registry.get('active_baseline_experiment')}")
    print(f"Active baseline baby: {registry.get('active_baseline_baby')}")
    print(f"Active official dataset: {registry.get('active_official_dataset')}")
    print(f"Experiments: {registry.get('experiment_count')}")
    print(f"Babies: {registry.get('baby_count')}")
    print(f"Structural alerts: {registry.get('structural_alert_count')}")
    print()

    print("Official Datasets")
    print("-----------------")
    for dataset in registry.get("official_datasets", []):
        print(dataset)
    print()

    print("Experiments")
    print("-----------")
    for experiment in registry.get("experiments", []):
        print(
            f"{experiment['experiment_id']:32s} "
            f"status={experiment.get('status', '-'):<10s} "
            f"config={Path(experiment.get('config_path', '-')).name}"
        )
    print()

    print("Babies")
    print("------")
    for baby in registry.get("babies", []):
        print(
            f"{baby['origin_experiment']}/{baby['baby_id']:20s} "
            f"status={baby.get('status', '-'):<10s} "
            f"checkpoint={'yes' if baby.get('checkpoint_path') else 'no'}"
        )


def command_doctor() -> None:
    report = doctor()

    print("TACTICAL CHESS PURE LAB DOCTOR")
    print("==============================")
    print(f"OK: {report.get('ok')}")
    print(f"Updated: {report.get('updated_at')}")
    print(f"Active experiment: {report.get('active_experiment_id')}")
    print(f"Active baseline: {report.get('active_baseline_experiment')}")
    print(f"Active baseline baby: {report.get('active_baseline_baby')}")
    print(f"Active official dataset: {report.get('active_official_dataset')}")
    print(f"Experiments: {report.get('experiment_count')}")
    print(f"Babies: {report.get('baby_count')}")
    print(
        "Severity counts: "
        f"errors={report.get('severity_counts', {}).get('error', 0)} "
        f"warnings={report.get('severity_counts', {}).get('warning', 0)}"
    )
    print()

    alerts = report.get("structural_alerts", [])
    if not alerts:
        print("No structural problems detected.")
        return

    print("Structural Problems")
    print("-------------------")
    for alert in alerts:
        scope = alert.get("experiment_id") or "-"
        if alert.get("baby_id"):
            scope = f"{scope}/{alert['baby_id']}"
        print(
            f"[{alert.get('level', 'warning').upper():7s}] "
            f"{alert.get('kind', 'unknown'):32s} "
            f"{scope} :: {alert.get('message', '')}"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("status")
    subparsers.add_parser("registry")
    subparsers.add_parser("doctor")

    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("exp_id")

    subparsers.add_parser("leaderboard")

    inspect_parser = subparsers.add_parser("inspect")
    inspect_parser.add_argument("exp_id")
    inspect_parser.add_argument("baby_id")

    args = parser.parse_args()

    if args.command == "status":
        command_status()
        return

    if args.command == "registry":
        command_registry()
        return

    if args.command == "doctor":
        command_doctor()
        return

    if args.command == "run":
        command_run(args.exp_id)
        return

    if args.command == "leaderboard":
        command_leaderboard()
        return

    if args.command == "inspect":
        command_inspect(args.exp_id, args.baby_id)
        return


if __name__ == "__main__":
    main()
