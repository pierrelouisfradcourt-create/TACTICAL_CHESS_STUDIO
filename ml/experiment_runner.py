import argparse
import json
import os
import shutil
import subprocess
import sys
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from experiment_analytics import (
    analyze_tournament_dir,
    build_baseline_comparison,
    build_recommendations,
    build_scientific_summary,
    load_report,
    render_report_text,
)
from dataset_decision_router import build_dataset_decision


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATASET = "lab/pedagogy_db/promoted_pedagogy_pack.jsonl"
DEFAULT_BASELINE_EXPERIMENT = "exp_003_aggressive"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_active_dataset() -> str:
    path = REPO_ROOT / "lab" / "ACTIVE_DATASET.txt"
    if path.exists():
        value = path.read_text(encoding="utf-8").strip()
        if value:
            return value
    return DEFAULT_DATASET


def default_config(experiment_id: str) -> Dict[str, Any]:
    return {
        "experiment_id": experiment_id,
        "description": "",
        "status": "draft",
        "run_classification": "exploration_only",
        "dataset_path": read_active_dataset(),
        "training_objective": None,
        "dataset_preflight": {
            "require_admissible": True,
        },
        "baseline_experiment_id": DEFAULT_BASELINE_EXPERIMENT,
        "tournament_games_per_matchup": 4,
        "train_defaults": {
            "epochs": 20,
            "batch_size": 64,
            "lr": 3e-4,
            "value_weight": 0.2,
            "seed": 42,
        },
        "selfplay_hooks": {
            "enabled": False,
            "mode": "none",
            "notes": "placeholder for future self-play integration",
        },
        "babies": [
            {
                "baby_id": "baby_v2",
                "enabled": True,
                "checkpoint_source": "best",
                "train": {},
            }
        ],
    }


def merge_dict(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    result = deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = merge_dict(result[key], value)
        else:
            result[key] = value
    return result


def load_config(config_path: Path) -> Dict[str, Any]:
    raw = {}
    if config_path.exists():
        raw = json.loads(config_path.read_text(encoding="utf-8"))

    experiment_id = raw.get("experiment_id") or config_path.parent.name
    config = merge_dict(default_config(experiment_id), raw)
    config["experiment_id"] = experiment_id
    config["dataset_path"] = config.get("dataset_path") or read_active_dataset()
    config["_dataset_path_matches_active"] = config["dataset_path"] == read_active_dataset()
    return config


def save_config(config_path: Path, config: Dict[str, Any]) -> None:
    config_path.parent.mkdir(parents=True, exist_ok=True)
    persisted = {key: value for key, value in config.items() if not key.startswith("_")}
    config_path.write_text(json.dumps(persisted, indent=2), encoding="utf-8")


def run_command(
    command: List[str],
    cwd: Path,
    env: Dict[str, str],
    log_path: Path,
) -> subprocess.CompletedProcess:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        command,
        cwd=str(cwd),
        env=env,
        capture_output=True,
        text=True,
    )
    combined = []
    combined.append(f"COMMAND: {' '.join(command)}")
    combined.append("")
    combined.append("STDOUT")
    combined.append(result.stdout)
    combined.append("")
    combined.append("STDERR")
    combined.append(result.stderr)
    combined.append("")
    combined.append(f"EXIT_CODE={result.returncode}")
    log_path.write_text("\n".join(combined), encoding="utf-8")

    if result.returncode != 0:
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(command)}")

    return result


def load_latest_run_manifest() -> Dict[str, Any]:
    path = REPO_ROOT / "models" / "latest_run.json"
    if not path.exists():
        raise FileNotFoundError(f"Missing latest_run.json: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def baby_dir(exp_dir: Path, baby_id: str) -> Path:
    return exp_dir / "babies" / baby_id


def training_dir_for_baby(exp_dir: Path, baby_id: str) -> Path:
    return baby_dir(exp_dir, baby_id) / "training"


def checkpoints_dir_for_baby(exp_dir: Path, baby_id: str) -> Path:
    return baby_dir(exp_dir, baby_id) / "checkpoints"


def tournaments_dir_for_baby(exp_dir: Path, baby_id: str) -> Path:
    return baby_dir(exp_dir, baby_id) / "tournaments"


def report_path_for_baby(exp_dir: Path, baby_id: str) -> Path:
    return baby_dir(exp_dir, baby_id) / "report.json"


def state_path_for_baby(exp_dir: Path, baby_id: str) -> Path:
    return baby_dir(exp_dir, baby_id) / "state.json"


def write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def copy_checkpoint(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def load_baby_state(exp_dir: Path, baby_id: str) -> Dict[str, Any]:
    path = state_path_for_baby(exp_dir, baby_id)
    if not path.exists():
        return {
            "baby_id": baby_id,
            "status": "pending",
            "steps": {
                "training": "pending",
                "tournament": "pending",
                "analysis": "pending",
            },
            "artifacts": {},
            "timestamps": {},
            "last_error": None,
        }
    return json.loads(path.read_text(encoding="utf-8"))


def save_baby_state(exp_dir: Path, baby_id: str, state: Dict[str, Any]) -> None:
    state["timestamps"]["updated_at"] = utc_now_iso()
    write_json(state_path_for_baby(exp_dir, baby_id), state)


def should_skip_step(state: Dict[str, Any], step: str, required_artifacts: List[Path]) -> bool:
    if state.get("steps", {}).get(step) != "completed":
        return False
    return all(path.exists() for path in required_artifacts)


def run_training_for_baby(
    config: Dict[str, Any],
    exp_dir: Path,
    baby_cfg: Dict[str, Any],
) -> Dict[str, Any]:
    baby_id = baby_cfg["baby_id"]
    train_cfg = merge_dict(config.get("train_defaults", {}), baby_cfg.get("train", {}))
    tag = baby_cfg.get("tag") or f"{config['experiment_id']}_{baby_id}"
    training_dir = training_dir_for_baby(exp_dir, baby_id)
    log_path = training_dir / "train.log"
    preflight_path = training_dir / "dataset_decision.json"
    dataset_preflight = config.get("dataset_preflight", {})
    require_admissible = bool(dataset_preflight.get("require_admissible", True))
    training_objective = (config.get("training_objective") or "").strip() or None

    explicit_dataset_input = config.get("dataset_path")
    if training_objective and config.get("_dataset_path_matches_active", False):
        explicit_dataset_input = None

    decision = build_dataset_decision(
        explicit_input=explicit_dataset_input,
        objective=training_objective,
    )
    training_dir.mkdir(parents=True, exist_ok=True)
    preflight_path.write_text(json.dumps(decision, indent=2), encoding="utf-8")

    if decision["status"] != "ok":
        raise RuntimeError(
            "Dataset Decision Router failed before training: "
            + str(decision.get("error") or "unknown error")
        )

    dataset_admission = decision.get("dataset_admission") or {}
    dataset_fitness = dataset_admission.get("dataset_fitness")
    if require_admissible and dataset_fitness != "admissible":
        reasons = ",".join(dataset_admission.get("reasons", [])) or "unknown"
        raise RuntimeError(
            "Dataset Decision Router blocked experiment training because the dataset "
            f"is not admissible: fitness={dataset_fitness} reasons={reasons}"
        )

    dataset_path = decision["resolved_dataset_path"]

    env = os.environ.copy()
    env["TCS_TRAIN_SEED"] = str(train_cfg.get("seed", 42))

    command = [
        sys.executable,
        "ml/train.py",
        "--input",
        dataset_path,
        "--epochs",
        str(train_cfg.get("epochs", 20)),
        "--batch-size",
        str(train_cfg.get("batch_size", 64)),
        "--lr",
        str(train_cfg.get("lr", 3e-4)),
        "--value-weight",
        str(train_cfg.get("value_weight", 0.2)),
        "--tag",
        tag,
    ]

    run_command(command, REPO_ROOT, env, log_path)
    manifest = load_latest_run_manifest()

    checkpoints_dir = checkpoints_dir_for_baby(exp_dir, baby_id)
    checkpoints_dir.mkdir(parents=True, exist_ok=True)

    best_model = Path(manifest["best_model"])
    latest_model = Path(manifest["latest_model"])
    best_copy = checkpoints_dir / "best.pt"
    latest_copy = checkpoints_dir / "latest.pt"
    copy_checkpoint(best_model, best_copy)
    copy_checkpoint(latest_model, latest_copy)

    training_dir = training_dir_for_baby(exp_dir, baby_id)
    training_dir.mkdir(parents=True, exist_ok=True)
    training_manifest_path = training_dir / "training_manifest.json"
    training_manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    checkpoint_source = (baby_cfg.get("checkpoint_source") or "best").lower()
    selected_checkpoint = best_copy if checkpoint_source == "best" else latest_copy

    return {
        "log_path": str(log_path.resolve()),
        "dataset_decision_path": str(preflight_path.resolve()),
        "training_manifest_path": str(training_manifest_path.resolve()),
        "best_checkpoint_path": str(best_copy.resolve()),
        "latest_checkpoint_path": str(latest_copy.resolve()),
        "checkpoint_path": str(selected_checkpoint.resolve()),
        "checkpoint_source": checkpoint_source,
        "run_id": manifest.get("run_id"),
    }


def run_tournament_for_baby(
    config: Dict[str, Any],
    exp_dir: Path,
    baby_cfg: Dict[str, Any],
    checkpoint_path: Path,
) -> Dict[str, Any]:
    baby_id = baby_cfg["baby_id"]
    games = int(config.get("tournament_games_per_matchup", 4))
    target_dir = baby_dir(exp_dir, baby_id)
    log_path = target_dir / "tournament.log"

    env = os.environ.copy()
    env["TCS_EXPERIMENT_ID"] = config["experiment_id"]
    env["TCS_EXPERIMENT_DIR"] = str(target_dir)
    env["TCS_MODEL_PATH"] = str(checkpoint_path)

    command = ["cargo", "run", "--", "neural_tournament", str(games)]
    run_command(command, REPO_ROOT, env, log_path)

    return {
        "log_path": str(log_path.resolve()),
        "tournament_dir": str(tournaments_dir_for_baby(exp_dir, baby_id).resolve()),
    }


def baseline_path_for_config(config: Dict[str, Any]) -> Optional[Path]:
    baseline_exp_id = (config.get("baseline_experiment_id") or "").strip()
    if not baseline_exp_id or baseline_exp_id == config["experiment_id"]:
        return None
    return REPO_ROOT / "lab" / "experiments" / baseline_exp_id


def load_baseline_metrics(config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    baseline_dir = baseline_path_for_config(config)
    if baseline_dir is None or not baseline_dir.exists():
        return None

    report = load_report(baseline_dir / "report.json")
    if report:
        babies = report.get("babies", [])
        if babies:
            return {
                "experiment_id": baseline_dir.name,
                "source": "report.json",
                "metrics": babies[0].get("tournament_analysis", {}),
            }
        if "tournament_analysis" in report:
            return {
                "experiment_id": baseline_dir.name,
                "source": "report.json",
                "metrics": report.get("tournament_analysis", {}),
            }

    tournaments_dir = baseline_dir / "tournaments"
    if tournaments_dir.exists():
        return {
            "experiment_id": baseline_dir.name,
            "source": "raw_csv",
            "metrics": analyze_tournament_dir(baseline_dir),
        }

    return None


def analyze_baby(
    config: Dict[str, Any],
    exp_dir: Path,
    baby_cfg: Dict[str, Any],
    training_summary: Optional[Dict[str, Any]],
    tournament_summary: Optional[Dict[str, Any]],
    baseline: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    baby_id = baby_cfg["baby_id"]
    target_dir = baby_dir(exp_dir, baby_id)
    tournament_log = target_dir / "tournament.log"
    tournament_analysis = analyze_tournament_dir(target_dir, tournament_log)

    baby_report = {
        "baby_id": baby_id,
        "training": training_summary or {},
        "tournament": tournament_summary or {},
        "checkpoint_path": (training_summary or {}).get("checkpoint_path")
        or baby_cfg.get("checkpoint_path"),
        "tournament_analysis": tournament_analysis,
    }

    if baseline:
        baby_report["baseline_comparison"] = build_baseline_comparison(
            tournament_analysis,
            baseline["metrics"],
        )

    baby_report["scientific_summary"] = build_scientific_summary(baby_report, baseline)
    baby_report["recommendations"] = build_recommendations(
        baby_report["scientific_summary"],
        baby_report,
    )

    write_json(report_path_for_baby(exp_dir, baby_id), baby_report)
    return baby_report


def analyze_root_experiment(
    config: Dict[str, Any],
    exp_dir: Path,
    baseline: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    tournament_log = exp_dir / "tournament.log"
    tournament_analysis = analyze_tournament_dir(
        exp_dir,
        tournament_log if tournament_log.exists() else None,
    )

    report = {
        "baby_id": "root_experiment",
        "training": {},
        "tournament": {},
        "checkpoint_path": None,
        "tournament_analysis": tournament_analysis,
    }

    if baseline:
        report["baseline_comparison"] = build_baseline_comparison(
            tournament_analysis,
            baseline["metrics"],
        )

    report["scientific_summary"] = build_scientific_summary(report, baseline)
    report["recommendations"] = build_recommendations(report["scientific_summary"], report)
    return report


def build_experiment_report(
    config: Dict[str, Any],
    babies: List[Dict[str, Any]],
    baseline: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    validity_counts: Dict[str, int] = {}
    for baby in babies:
        validity = baby.get("scientific_summary", {}).get("validity", "unknown")
        validity_counts[validity] = validity_counts.get(validity, 0) + 1

    experiment_summary = {
        "baby_count": len(babies),
        "validity_counts": validity_counts,
        "baseline_experiment_id": baseline.get("experiment_id") if baseline else None,
        "run_classification": config.get("run_classification", "exploration_only"),
        "promotion_eligible": config.get("run_classification", "exploration_only")
        == "promotion_eligible",
        "ready_for_comparison": any(
            baby.get("scientific_summary", {}).get("validity") == "valid" for baby in babies
        ),
    }

    promotable = [
        baby for baby in babies if baby.get("scientific_summary", {}).get("validity") == "valid"
    ]
    promotable.sort(
        key=lambda baby: (
            baby.get("scientific_summary", {}).get("baseline_delta", {}).get("neural_elo_delta")
            if baby.get("scientific_summary", {}).get("baseline_delta", {}).get("neural_elo_delta") is not None
            else -10_000.0
        ),
        reverse=True,
    )
    best_candidate = promotable[0]["baby_id"] if promotable else None

    scientific_summary = {
        "best_candidate_baby_id": best_candidate,
        "ready_for_comparison": experiment_summary["ready_for_comparison"],
        "valid_babies": [baby["baby_id"] for baby in promotable],
        "invalid_babies": [
            baby["baby_id"]
            for baby in babies
            if baby.get("scientific_summary", {}).get("validity") != "valid"
        ],
    }

    recommendations: List[str] = []
    if best_candidate:
        recommendations.append(
            f"Promote {best_candidate} to a larger confirmation tournament if resources allow."
        )
    else:
        recommendations.append(
            "No baby is benchmark-valid yet; resolve runtime or environment quality issues first."
        )

    return {
        "experiment_id": config["experiment_id"],
        "generated_at": utc_now_iso(),
        "config": config,
        "baseline": baseline,
        "experiment_summary": experiment_summary,
        "scientific_summary": scientific_summary,
        "recommendations": recommendations,
        "babies": babies,
    }


def write_experiment_report(exp_dir: Path, report: Dict[str, Any]) -> None:
    report_json_path = exp_dir / "report.json"
    report_txt_path = exp_dir / "report.txt"
    report_json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    report_txt_path.write_text(
        render_report_text(
            report["experiment_id"],
            report["config"],
            report["babies"],
            report.get("baseline"),
        ),
        encoding="utf-8",
    )


def run_experiment(
    config_path: Path,
    analyze_only: bool = False,
    training_objective_override: Optional[str] = None,
) -> Dict[str, Any]:
    config = load_config(config_path)
    if training_objective_override is not None:
        config["training_objective"] = training_objective_override
    exp_dir = config_path.parent
    exp_dir.mkdir(parents=True, exist_ok=True)
    save_config(config_path, config)

    baseline = load_baseline_metrics(config)
    baby_reports = []

    if analyze_only and (exp_dir / "tournaments").exists() and not (exp_dir / "babies").exists():
        baby_reports.append(analyze_root_experiment(config, exp_dir, baseline))
        report = build_experiment_report(config, baby_reports, baseline)
        write_experiment_report(exp_dir, report)
        return report

    for baby_cfg in config.get("babies", []):
        if not baby_cfg.get("enabled", True):
            continue

        training_summary = None
        tournament_summary = None

        if not analyze_only:
            if baby_cfg.get("checkpoint_path"):
                training_summary = {
                    "checkpoint_path": str((REPO_ROOT / baby_cfg["checkpoint_path"]).resolve())
                }
            else:
                training_summary = run_training_for_baby(config, exp_dir, baby_cfg)

            checkpoint_path = Path(training_summary["checkpoint_path"])
            tournament_summary = run_tournament_for_baby(
                config,
                exp_dir,
                baby_cfg,
                checkpoint_path,
            )

        baby_reports.append(
            analyze_baby(
                config,
                exp_dir,
                baby_cfg,
                training_summary,
                tournament_summary,
                baseline,
            )
        )

    report = build_experiment_report(config, baby_reports, baseline)
    write_experiment_report(exp_dir, report)
    return report


def analyze_existing_experiment(config_path: Path) -> Dict[str, Any]:
    return run_experiment(config_path, analyze_only=True)


def init_config(config_path: Path, experiment_id: str, force: bool = False) -> Path:
    if config_path.exists() and not force:
        raise FileExistsError(f"Config already exists: {config_path}")

    config = default_config(experiment_id)
    save_config(config_path, config)
    return config_path


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init")
    init_parser.add_argument("--config", required=True)
    init_parser.add_argument("--experiment-id", required=False, default="")
    init_parser.add_argument("--force", action="store_true")

    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--config", required=True)
    run_parser.add_argument("--objective", default=None)

    analyze_parser = subparsers.add_parser("analyze")
    analyze_parser.add_argument("--config", required=True)

    args = parser.parse_args()

    config_path = (REPO_ROOT / args.config).resolve()

    if args.command == "init":
        experiment_id = args.experiment_id or config_path.parent.name
        path = init_config(config_path, experiment_id, force=args.force)
        print(f"Created config: {path}")
        return

    if args.command == "run":
        report = run_experiment(config_path, training_objective_override=args.objective)
        print(
            json.dumps(
                {
                    "experiment_id": report["experiment_id"],
                    "babies": len(report["babies"]),
                    "ready_for_comparison": report["experiment_summary"]["ready_for_comparison"],
                },
                indent=2,
            )
        )
        return

    if args.command == "analyze":
        report = analyze_existing_experiment(config_path)
        print(
            json.dumps(
                {
                    "experiment_id": report["experiment_id"],
                    "babies": len(report["babies"]),
                    "ready_for_comparison": report["experiment_summary"]["ready_for_comparison"],
                },
                indent=2,
            )
        )
        return


if __name__ == "__main__":
    main()
