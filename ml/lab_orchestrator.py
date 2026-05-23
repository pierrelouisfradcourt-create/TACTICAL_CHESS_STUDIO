import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from experiment_runner import (
    REPO_ROOT,
    analyze_baby,
    build_experiment_report,
    checkpoints_dir_for_baby,
    load_baseline_metrics,
    load_baby_state,
    load_config,
    read_active_dataset,
    report_path_for_baby,
    run_tournament_for_baby,
    run_training_for_baby,
    save_baby_state,
    save_config,
    state_path_for_baby,
    tournaments_dir_for_baby,
    training_dir_for_baby,
    write_experiment_report,
)


LAB_STATE_DIR = REPO_ROOT / "lab" / "state"
LAB_REGISTRY_PATH = LAB_STATE_DIR / "lab_registry.json"
EXPERIMENTS_DIR = REPO_ROOT / "lab" / "experiments"

CANONICAL_EXPERIMENT_STATUSES = {
    "validated",
    "rejected",
    "active",
    "failed",
    "smoke",
    "archived",
}

CANONICAL_BABY_STATUSES = {
    "candidate",
    "promoted",
    "rejected",
    "baseline",
    "archived",
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def path_timestamp_iso(path: Path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).replace(
        microsecond=0
    ).isoformat()


def load_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def default_registry() -> Dict[str, Any]:
    active_dataset = read_active_dataset()
    return {
        "updated_at": utc_now_iso(),
        "active_experiment_id": None,
        "baseline_experiment_id": None,
        "active_baseline_experiment": None,
        "active_baseline_baby": None,
        "active_official_dataset": active_dataset,
        "official_datasets": [active_dataset],
        "latest_run": None,
        "latest_failed_run": None,
        "structural_alerts": [],
        "selfplay_hooks": {
            "enabled": False,
            "mode": "none",
            "notes": "placeholder for future self-play orchestration",
        },
        "experiments": [],
        "babies": [],
    }


def normalize_experiment_status(
    raw_status: Optional[str],
    experiment_id: str,
) -> str:
    status = (raw_status or "").strip().lower()
    if status in CANONICAL_EXPERIMENT_STATUSES:
        return status
    if "smoke" in experiment_id.lower():
        return "smoke"
    if status in {"completed", "ready", "ok", "done"}:
        return "validated"
    if status in {"error", "broken"}:
        return "failed"
    if status in {"draft", "running", "partial", "pending"}:
        return "active"
    return "active"


def normalize_baby_status(raw_status: Optional[str]) -> str:
    status = (raw_status or "").strip().lower()
    if status in CANONICAL_BABY_STATUSES:
        return status
    if status in {"completed", "ready", "ok"}:
        return "candidate"
    if status in {"failed", "error"}:
        return "rejected"
    if status in {"pending", "running", "partial"}:
        return "candidate"
    return "candidate"


def normalize_registry(registry: Dict[str, Any]) -> Dict[str, Any]:
    normalized = default_registry()
    normalized.update({k: v for k, v in registry.items() if k not in {"experiments", "babies"}})

    official_datasets = normalized.get("official_datasets") or []
    if not isinstance(official_datasets, list):
        official_datasets = [official_datasets]
    active_dataset = normalized.get("active_official_dataset") or read_active_dataset()
    if active_dataset and active_dataset not in official_datasets:
        official_datasets.append(active_dataset)
    normalized["active_official_dataset"] = active_dataset
    normalized["official_datasets"] = official_datasets

    raw_experiments = registry.get("experiments", [])
    experiments: List[Dict[str, Any]] = []
    experiment_ids_seen = set()

    if isinstance(raw_experiments, dict):
        for experiment_id, entry in raw_experiments.items():
            item = dict(entry)
            item["experiment_id"] = item.get("experiment_id") or experiment_id
            experiments.append(item)
    elif isinstance(raw_experiments, list):
        experiments = [dict(item) for item in raw_experiments if isinstance(item, dict)]

    raw_babies = registry.get("babies", [])
    babies: List[Dict[str, Any]] = []
    baby_keys_seen = set()

    if isinstance(raw_babies, list):
        babies.extend(dict(item) for item in raw_babies if isinstance(item, dict))

    for item in experiments:
        experiment_id = item.get("experiment_id")
        if not experiment_id or experiment_id in experiment_ids_seen:
            continue
        experiment_ids_seen.add(experiment_id)
        item.setdefault("created_at", normalized["updated_at"])
        item.setdefault("updated_at", normalized["updated_at"])
        item["status"] = normalize_experiment_status(item.get("status"), experiment_id)

        nested_babies = item.pop("babies", None)
        if isinstance(nested_babies, dict):
            for baby_id, baby_entry in nested_babies.items():
                baby = dict(baby_entry)
                baby["baby_id"] = baby.get("baby_id") or baby_id
                baby["origin_experiment"] = baby.get("origin_experiment") or experiment_id
                babies.append(baby)

    normalized_experiments: List[Dict[str, Any]] = []
    for item in experiments:
        experiment_id = item["experiment_id"]
        if any(existing["experiment_id"] == experiment_id for existing in normalized_experiments):
            continue
        item.setdefault("config_path", str((EXPERIMENTS_DIR / experiment_id / "config.json").resolve()))
        item.setdefault("report_path", str((EXPERIMENTS_DIR / experiment_id / "report.json").resolve()))
        item.setdefault("checkpoint_path", None)
        normalized_experiments.append(item)

    normalized_babies: List[Dict[str, Any]] = []
    for item in babies:
        experiment_id = item.get("origin_experiment")
        baby_id = item.get("baby_id")
        if not experiment_id or not baby_id:
            continue
        key = (experiment_id, baby_id)
        if key in baby_keys_seen:
            continue
        baby_keys_seen.add(key)
        item.setdefault("created_at", normalized["updated_at"])
        item.setdefault("updated_at", normalized["updated_at"])
        item["status"] = normalize_baby_status(item.get("status"))
        item.setdefault("checkpoint_path", item.get("artifacts", {}).get("checkpoint_path"))
        item.setdefault("parent_baby", None)
        normalized_babies.append(item)

    normalized["experiments"] = normalized_experiments
    normalized["babies"] = normalized_babies
    normalized["baseline_experiment_id"] = normalized.get("active_baseline_experiment") or normalized.get(
        "baseline_experiment_id"
    )
    normalized["active_baseline_experiment"] = normalized.get("baseline_experiment_id")
    return normalized


def experiment_map(registry: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    return {item["experiment_id"]: item for item in registry.get("experiments", [])}


def baby_map(registry: Dict[str, Any]) -> Dict[Tuple[str, str], Dict[str, Any]]:
    return {
        (item["origin_experiment"], item["baby_id"]): item
        for item in registry.get("babies", [])
    }


def find_experiment_entry(registry: Dict[str, Any], experiment_id: str) -> Optional[Dict[str, Any]]:
    for item in registry.get("experiments", []):
        if item["experiment_id"] == experiment_id:
            return item
    return None


def find_baby_entry(
    registry: Dict[str, Any], experiment_id: str, baby_id: str
) -> Optional[Dict[str, Any]]:
    for item in registry.get("babies", []):
        if item["origin_experiment"] == experiment_id and item["baby_id"] == baby_id:
            return item
    return None


def upsert_experiment_entry(
    registry: Dict[str, Any],
    experiment_id: str,
    defaults: Dict[str, Any],
) -> Dict[str, Any]:
    entry = find_experiment_entry(registry, experiment_id)
    if entry is None:
        entry = {"experiment_id": experiment_id, "created_at": utc_now_iso()}
        registry.setdefault("experiments", []).append(entry)
    entry.update(defaults)
    entry["experiment_id"] = experiment_id
    entry["status"] = normalize_experiment_status(entry.get("status"), experiment_id)
    entry.setdefault("created_at", utc_now_iso())
    entry["updated_at"] = utc_now_iso()
    return entry


def upsert_baby_entry(
    registry: Dict[str, Any],
    experiment_id: str,
    baby_id: str,
    defaults: Dict[str, Any],
) -> Dict[str, Any]:
    entry = find_baby_entry(registry, experiment_id, baby_id)
    if entry is None:
        entry = {
            "baby_id": baby_id,
            "origin_experiment": experiment_id,
            "created_at": utc_now_iso(),
        }
        registry.setdefault("babies", []).append(entry)
    entry.update(defaults)
    entry["baby_id"] = baby_id
    entry["origin_experiment"] = experiment_id
    entry["status"] = normalize_baby_status(entry.get("status"))
    entry.setdefault("created_at", utc_now_iso())
    entry["updated_at"] = utc_now_iso()
    return entry


def pick_baby_checkpoint(exp_dir: Path, baby_id: str) -> Optional[str]:
    checkpoints_dir = checkpoints_dir_for_baby(exp_dir, baby_id)
    for candidate in ["best.pt", "latest.pt"]:
        path = checkpoints_dir / candidate
        if path.exists():
            return str(path.resolve())
    return None


def choose_baseline_baby(registry: Dict[str, Any]) -> Optional[str]:
    experiment_id = registry.get("active_baseline_experiment")
    if not experiment_id:
        return None
    babies = [
        item for item in registry.get("babies", []) if item["origin_experiment"] == experiment_id
    ]
    if not babies:
        return None
    for preferred in ["baseline_clone", "baby_v2", "low_lr"]:
        for baby in babies:
            if baby["baby_id"] == preferred:
                return baby["baby_id"]
    for baby in babies:
        if baby.get("status") == "baseline":
            return baby["baby_id"]
    return babies[0]["baby_id"]


def collect_drift_alerts(registry: Dict[str, Any]) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []
    existing_experiments = experiment_map(registry)
    existing_babies = baby_map(registry)

    if not EXPERIMENTS_DIR.exists():
        return alerts

    for exp_dir in sorted(EXPERIMENTS_DIR.iterdir()):
        if not exp_dir.is_dir():
            continue
        experiment_id = exp_dir.name
        config_path = exp_dir / "config.json"
        report_path = exp_dir / "report.json"
        config = load_config(config_path) if config_path.exists() else None

        if experiment_id not in existing_experiments:
            alerts.append(
                {
                    "kind": "disk_experiment_missing_registry",
                    "level": "warning",
                    "experiment_id": experiment_id,
                    "message": f"Experiment exists on disk but was missing from registry: {experiment_id}",
                }
            )

        entry = upsert_experiment_entry(
            registry,
            experiment_id,
            {
                "status": normalize_experiment_status(
                    (config or {}).get("status") or existing_experiments.get(experiment_id, {}).get("status"),
                    experiment_id,
                ),
                "config_path": str(config_path.resolve()),
                "report_path": str(report_path.resolve()),
                "path": str(exp_dir.resolve()),
                "dataset_path": (config or {}).get("dataset_path"),
                "baseline_experiment_id": (config or {}).get("baseline_experiment_id"),
                "checkpoint_path": existing_experiments.get(experiment_id, {}).get("checkpoint_path"),
                "created_at": existing_experiments.get(experiment_id, {}).get("created_at")
                or path_timestamp_iso(exp_dir),
            },
        )

        if config and config.get("dataset_path"):
            dataset_path = config["dataset_path"]
            if dataset_path not in registry["official_datasets"]:
                registry["official_datasets"].append(dataset_path)

        babies_root = exp_dir / "babies"
        if not babies_root.exists():
            continue

        for baby_dir in sorted(babies_root.iterdir()):
            if not baby_dir.is_dir():
                continue
            baby_id = baby_dir.name
            if (experiment_id, baby_id) not in existing_babies:
                alerts.append(
                    {
                        "kind": "disk_baby_missing_registry",
                        "level": "warning",
                        "experiment_id": experiment_id,
                        "baby_id": baby_id,
                        "message": f"Baby exists on disk but was missing from registry: {experiment_id}/{baby_id}",
                    }
                )

            state = load_json(state_path_for_baby(exp_dir, baby_id)) or {}
            checkpoint_path = pick_baby_checkpoint(exp_dir, baby_id)
            baby_entry = upsert_baby_entry(
                registry,
                experiment_id,
                baby_id,
                {
                    "status": normalize_baby_status(state.get("status")),
                    "checkpoint_path": checkpoint_path,
                    "report_path": str(report_path_for_baby(exp_dir, baby_id).resolve()),
                    "parent_baby": state.get("parent_baby"),
                    "created_at": existing_babies.get((experiment_id, baby_id), {}).get("created_at")
                    or path_timestamp_iso(baby_dir),
                },
            )

            if checkpoint_path and not entry.get("checkpoint_path"):
                entry["checkpoint_path"] = checkpoint_path

            if registry.get("active_baseline_experiment") == experiment_id and baby_id == "baseline_clone":
                baby_entry["status"] = "baseline"

    return alerts


def build_structural_alerts(
    registry: Dict[str, Any], additional_alerts: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = list(additional_alerts or [])

    experiments = experiment_map(registry)
    for experiment in registry.get("experiments", []):
        experiment_id = experiment["experiment_id"]
        path = Path(experiment.get("path", EXPERIMENTS_DIR / experiment_id))
        config_path = Path(experiment.get("config_path", path / "config.json"))
        report_path = Path(experiment.get("report_path", path / "report.json"))
        checkpoint_path = experiment.get("checkpoint_path")

        if not path.exists():
            alerts.append(
                {
                    "kind": "registry_missing_experiment_dir",
                    "level": "error",
                    "experiment_id": experiment_id,
                    "message": f"Registry points to missing experiment directory: {path}",
                }
            )
        if not config_path.exists():
            alerts.append(
                {
                    "kind": "missing_config",
                    "level": "error",
                    "experiment_id": experiment_id,
                    "message": f"Missing config.json for experiment: {experiment_id}",
                }
            )
        if not report_path.exists():
            alerts.append(
                {
                    "kind": "missing_report",
                    "level": "warning",
                    "experiment_id": experiment_id,
                    "message": f"Missing report.json for experiment: {experiment_id}",
                }
            )
        if checkpoint_path and not Path(checkpoint_path).exists():
            alerts.append(
                {
                    "kind": "registry_missing_checkpoint",
                    "level": "warning",
                    "experiment_id": experiment_id,
                    "message": f"Registry points to missing experiment checkpoint: {checkpoint_path}",
                }
            )

    for baby in registry.get("babies", []):
        experiment_id = baby["origin_experiment"]
        baby_id = baby["baby_id"]
        if experiment_id not in experiments:
            alerts.append(
                {
                    "kind": "baby_origin_missing_experiment",
                    "level": "error",
                    "experiment_id": experiment_id,
                    "baby_id": baby_id,
                    "message": f"Baby points to missing experiment entry: {experiment_id}/{baby_id}",
                }
            )
        checkpoint_path = baby.get("checkpoint_path")
        report_path = baby.get("report_path")
        if checkpoint_path and not Path(checkpoint_path).exists():
            alerts.append(
                {
                    "kind": "missing_checkpoint",
                    "level": "warning",
                    "experiment_id": experiment_id,
                    "baby_id": baby_id,
                    "message": f"Missing checkpoint for baby: {experiment_id}/{baby_id}",
                }
            )
        if report_path and not Path(report_path).exists():
            alerts.append(
                {
                    "kind": "missing_baby_report",
                    "level": "warning",
                    "experiment_id": experiment_id,
                    "baby_id": baby_id,
                    "message": f"Missing baby report for: {experiment_id}/{baby_id}",
                }
            )

    deduped: List[Dict[str, Any]] = []
    seen = set()
    for alert in alerts:
        key = (
            alert.get("kind"),
            alert.get("experiment_id"),
            alert.get("baby_id"),
            alert.get("message"),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(alert)
    return deduped


def refresh_registry(registry: Dict[str, Any]) -> Dict[str, Any]:
    normalized = normalize_registry(registry)
    drift_alerts = collect_drift_alerts(normalized)
    normalized["active_baseline_baby"] = choose_baseline_baby(normalized)
    normalized["baseline_experiment_id"] = normalized.get("active_baseline_experiment")
    normalized["structural_alerts"] = build_structural_alerts(normalized, drift_alerts)
    normalized["updated_at"] = utc_now_iso()
    return normalized


def save_registry(registry: Dict[str, Any]) -> None:
    LAB_STATE_DIR.mkdir(parents=True, exist_ok=True)
    refreshed = refresh_registry(registry)
    LAB_REGISTRY_PATH.write_text(json.dumps(refreshed, indent=2), encoding="utf-8")


def ensure_registry() -> Dict[str, Any]:
    LAB_STATE_DIR.mkdir(parents=True, exist_ok=True)
    if LAB_REGISTRY_PATH.exists():
        raw = load_json(LAB_REGISTRY_PATH) or default_registry()
    else:
        raw = default_registry()
    registry = refresh_registry(raw)
    LAB_REGISTRY_PATH.write_text(json.dumps(registry, indent=2), encoding="utf-8")
    return registry


def experiment_entry(config: Dict[str, Any], exp_dir: Path) -> Dict[str, Any]:
    return {
        "experiment_id": config["experiment_id"],
        "status": normalize_experiment_status(config.get("status"), config["experiment_id"]),
        "config_path": str((exp_dir / "config.json").resolve()),
        "report_path": str((exp_dir / "report.json").resolve()),
        "checkpoint_path": None,
        "created_at": utc_now_iso(),
    }


def baby_entry(exp_dir: Path, experiment_id: str, baby_id: str) -> Dict[str, Any]:
    return {
        "baby_id": baby_id,
        "status": "candidate",
        "checkpoint_path": pick_baby_checkpoint(exp_dir, baby_id),
        "parent_baby": None,
        "origin_experiment": experiment_id,
        "report_path": str(report_path_for_baby(exp_dir, baby_id).resolve()),
        "created_at": utc_now_iso(),
        "updated_at": utc_now_iso(),
    }


def sync_registry_experiment(
    registry: Dict[str, Any], config: Dict[str, Any], exp_dir: Path
) -> Dict[str, Any]:
    entry = upsert_experiment_entry(
        registry,
        config["experiment_id"],
        {
            **experiment_entry(config, exp_dir),
            "path": str(exp_dir.resolve()),
            "dataset_path": config.get("dataset_path"),
            "baseline_experiment_id": config.get("baseline_experiment_id"),
            "selfplay_hooks": config.get("selfplay_hooks", {}),
        },
    )

    for baby_cfg in config.get("babies", []):
        baby_id = baby_cfg["baby_id"]
        upsert_baby_entry(
            registry,
            config["experiment_id"],
            baby_id,
            baby_entry(exp_dir, config["experiment_id"], baby_id),
        )

    registry["active_experiment_id"] = config["experiment_id"]
    registry["active_baseline_experiment"] = config.get("baseline_experiment_id")
    registry["baseline_experiment_id"] = config.get("baseline_experiment_id")
    registry["selfplay_hooks"] = config.get("selfplay_hooks", {})

    dataset_path = config.get("dataset_path")
    if dataset_path:
        registry["active_official_dataset"] = dataset_path
        if dataset_path not in registry["official_datasets"]:
            registry["official_datasets"].append(dataset_path)

    save_registry(registry)
    return entry


def _step_completed(state: Dict[str, Any], step: str) -> bool:
    return state.get("steps", {}).get(step) == "completed"


def _has_training_artifacts(state: Dict[str, Any]) -> bool:
    artifacts = state.get("artifacts", {})
    checkpoint_path = artifacts.get("checkpoint_path")
    manifest_path = artifacts.get("training_manifest_path")
    return bool(
        checkpoint_path
        and Path(checkpoint_path).exists()
        and manifest_path
        and Path(manifest_path).exists()
    )


def _has_tournament_artifacts(exp_dir: Path, baby_id: str) -> bool:
    tdir = tournaments_dir_for_baby(exp_dir, baby_id)
    return all((tdir / name).exists() for name in ["games.csv", "matches.csv", "elo.csv"])


def resolve_execution_plan(
    exp_dir: Path,
    baby_id: str,
    state: Dict[str, Any],
    force: bool = False,
) -> Dict[str, bool]:
    if force:
        return {"training": True, "tournament": True, "analysis": True}

    run_training = not (_step_completed(state, "training") and _has_training_artifacts(state))
    run_tournament = not (
        _step_completed(state, "tournament") and _has_tournament_artifacts(exp_dir, baby_id)
    )
    run_analysis = not (
        _step_completed(state, "analysis") and report_path_for_baby(exp_dir, baby_id).exists()
    )
    return {
        "training": run_training,
        "tournament": run_tournament,
        "analysis": run_analysis,
    }


def _mark_step(
    state: Dict[str, Any], step: str, status: str, error: Optional[str] = None
) -> None:
    state.setdefault("steps", {})[step] = status
    state["status"] = status if status != "completed" else state.get("status", "running")
    state["last_error"] = error


def _finalize_baby_state(state: Dict[str, Any]) -> None:
    steps = state.get("steps", {})
    if all(steps.get(step) == "completed" for step in ["training", "tournament", "analysis"]):
        state["status"] = "completed"
        state["last_error"] = None
    elif any(steps.get(step) == "failed" for step in ["training", "tournament", "analysis"]):
        state["status"] = "failed"
    else:
        state["status"] = "partial"


def _canonical_baby_status_for_state(
    registry: Dict[str, Any],
    experiment_id: str,
    baby_id: str,
    state: Dict[str, Any],
) -> str:
    if registry.get("active_baseline_experiment") == experiment_id and registry.get(
        "active_baseline_baby"
    ) == baby_id:
        return "baseline"
    if state.get("status") == "failed":
        return "rejected"
    return "candidate"


def _update_registry_baby(
    registry: Dict[str, Any],
    experiment_id: str,
    baby_id: str,
    state: Dict[str, Any],
) -> None:
    baby = upsert_baby_entry(
        registry,
        experiment_id,
        baby_id,
        {
            "status": _canonical_baby_status_for_state(registry, experiment_id, baby_id, state),
            "checkpoint_path": state.get("artifacts", {}).get("checkpoint_path"),
            "parent_baby": state.get("parent_baby"),
            "report_path": state.get("artifacts", {}).get("report_path")
            or str(report_path_for_baby(EXPERIMENTS_DIR / experiment_id, baby_id).resolve()),
        },
    )

    experiment = find_experiment_entry(registry, experiment_id)
    if experiment is not None and baby.get("checkpoint_path"):
        experiment["checkpoint_path"] = baby["checkpoint_path"]

    save_registry(registry)


def _record_latest_run(
    registry: Dict[str, Any],
    experiment_id: str,
    baby_id: Optional[str],
    step: str,
    status: str,
    error: Optional[str] = None,
) -> None:
    payload = {
        "experiment_id": experiment_id,
        "baby_id": baby_id,
        "step": step,
        "status": status,
        "updated_at": utc_now_iso(),
    }
    if error:
        payload["error"] = error
        registry["latest_failed_run"] = payload
    registry["latest_run"] = payload
    save_registry(registry)


def run_or_resume(config_path: Path, force: bool = False) -> Dict[str, Any]:
    config = load_config(config_path)
    exp_dir = config_path.parent
    exp_dir.mkdir(parents=True, exist_ok=True)
    save_config(config_path, config)

    registry = ensure_registry()
    sync_registry_experiment(registry, config, exp_dir)
    baseline = load_baseline_metrics(config)

    baby_reports: List[Dict[str, Any]] = []
    experiment_id = config["experiment_id"]
    _record_latest_run(registry, experiment_id, None, "experiment", "running")

    for baby_cfg in config.get("babies", []):
        if not baby_cfg.get("enabled", True):
            continue

        baby_id = baby_cfg["baby_id"]
        state = load_baby_state(exp_dir, baby_id)
        execution_plan = resolve_execution_plan(exp_dir, baby_id, state, force=force)

        training_summary = state.get("training_summary")
        tournament_summary = state.get("tournament_summary")

        try:
            state["status"] = "running"
            save_baby_state(exp_dir, baby_id, state)
            _record_latest_run(registry, experiment_id, baby_id, "start", "running")
            _update_registry_baby(registry, experiment_id, baby_id, state)

            if execution_plan["training"]:
                _mark_step(state, "training", "running")
                save_baby_state(exp_dir, baby_id, state)
                _record_latest_run(registry, experiment_id, baby_id, "training", "running")
                training_summary = run_training_for_baby(config, exp_dir, baby_cfg)
                state["training_summary"] = training_summary
                state.setdefault("artifacts", {}).update(training_summary)
                _mark_step(state, "training", "completed")
                save_baby_state(exp_dir, baby_id, state)
                _record_latest_run(registry, experiment_id, baby_id, "training", "completed")
                _update_registry_baby(registry, experiment_id, baby_id, state)

            if execution_plan["tournament"]:
                checkpoint_path = Path(
                    (training_summary or {}).get("checkpoint_path")
                    or state.get("artifacts", {}).get("checkpoint_path", "")
                )
                if not checkpoint_path.exists():
                    raise FileNotFoundError(
                        f"Missing checkpoint for tournament resume: {checkpoint_path}"
                    )
                _mark_step(state, "tournament", "running")
                save_baby_state(exp_dir, baby_id, state)
                _record_latest_run(registry, experiment_id, baby_id, "tournament", "running")
                tournament_summary = run_tournament_for_baby(
                    config,
                    exp_dir,
                    baby_cfg,
                    checkpoint_path,
                )
                state["tournament_summary"] = tournament_summary
                state.setdefault("artifacts", {}).update(tournament_summary)
                _mark_step(state, "tournament", "completed")
                save_baby_state(exp_dir, baby_id, state)
                _record_latest_run(
                    registry, experiment_id, baby_id, "tournament", "completed"
                )
                _update_registry_baby(registry, experiment_id, baby_id, state)

            if execution_plan["analysis"]:
                _mark_step(state, "analysis", "running")
                save_baby_state(exp_dir, baby_id, state)
                _record_latest_run(registry, experiment_id, baby_id, "analysis", "running")
                baby_report = analyze_baby(
                    config,
                    exp_dir,
                    baby_cfg,
                    training_summary or state.get("training_summary"),
                    tournament_summary or state.get("tournament_summary"),
                    baseline,
                )
                _mark_step(state, "analysis", "completed")
                _finalize_baby_state(state)
                state.setdefault("artifacts", {})["report_path"] = str(
                    report_path_for_baby(exp_dir, baby_id).resolve()
                )
                save_baby_state(exp_dir, baby_id, state)
                _record_latest_run(registry, experiment_id, baby_id, "analysis", "completed")
                _update_registry_baby(registry, experiment_id, baby_id, state)
            else:
                existing_report = report_path_for_baby(exp_dir, baby_id)
                if existing_report.exists():
                    baby_report = json.loads(existing_report.read_text(encoding="utf-8"))
                else:
                    baby_report = analyze_baby(
                        config,
                        exp_dir,
                        baby_cfg,
                        training_summary or state.get("training_summary"),
                        tournament_summary or state.get("tournament_summary"),
                        baseline,
                    )
                    _mark_step(state, "analysis", "completed")
                    _finalize_baby_state(state)
                    save_baby_state(exp_dir, baby_id, state)
                    _update_registry_baby(registry, experiment_id, baby_id, state)

            baby_reports.append(baby_report)
        except Exception as exc:
            current_step = next(
                (
                    step
                    for step in ["training", "tournament", "analysis"]
                    if state.get("steps", {}).get(step) == "running"
                ),
                "training",
            )
            _mark_step(state, current_step, "failed", error=str(exc))
            _finalize_baby_state(state)
            save_baby_state(exp_dir, baby_id, state)
            _record_latest_run(
                registry, experiment_id, baby_id, current_step, "failed", error=str(exc)
            )
            _update_registry_baby(registry, experiment_id, baby_id, state)
            experiment = find_experiment_entry(registry, experiment_id)
            if experiment is not None:
                experiment["status"] = "failed"
                save_registry(registry)
            raise

    report = build_experiment_report(config, baby_reports, baseline)
    write_experiment_report(exp_dir, report)

    experiment_status = "smoke" if "smoke" in experiment_id.lower() else "validated"
    experiment = upsert_experiment_entry(
        registry,
        experiment_id,
        {
            "status": experiment_status,
            "config_path": str((exp_dir / "config.json").resolve()),
            "report_path": str((exp_dir / "report.json").resolve()),
            "checkpoint_path": next(
                (
                    baby.get("checkpoint_path")
                    for baby in registry.get("babies", [])
                    if baby["origin_experiment"] == experiment_id and baby.get("checkpoint_path")
                ),
                None,
            ),
        },
    )
    experiment["updated_at"] = utc_now_iso()
    _record_latest_run(registry, experiment_id, None, "experiment", "completed")
    save_registry(registry)
    return report


def status(config_path: Optional[Path] = None) -> Dict[str, Any]:
    registry = ensure_registry()
    if config_path is None:
        return registry

    config = load_config(config_path)
    exp_entry = find_experiment_entry(registry, config["experiment_id"])
    if exp_entry is None:
        exp_entry = experiment_entry(config, config_path.parent)
    return exp_entry


def registry_view() -> Dict[str, Any]:
    registry = ensure_registry()
    return {
        "updated_at": registry.get("updated_at"),
        "active_experiment_id": registry.get("active_experiment_id"),
        "active_baseline_experiment": registry.get("active_baseline_experiment"),
        "active_baseline_baby": registry.get("active_baseline_baby"),
        "active_official_dataset": registry.get("active_official_dataset"),
        "official_datasets": registry.get("official_datasets", []),
        "latest_run": registry.get("latest_run"),
        "latest_failed_run": registry.get("latest_failed_run"),
        "experiment_count": len(registry.get("experiments", [])),
        "baby_count": len(registry.get("babies", [])),
        "structural_alert_count": len(registry.get("structural_alerts", [])),
        "experiments": registry.get("experiments", []),
        "babies": registry.get("babies", []),
    }


def doctor() -> Dict[str, Any]:
    registry = ensure_registry()
    alerts = registry.get("structural_alerts", [])
    severity_counts = {"error": 0, "warning": 0}
    for alert in alerts:
        level = alert.get("level", "warning")
        severity_counts[level] = severity_counts.get(level, 0) + 1

    return {
        "ok": len(alerts) == 0,
        "updated_at": registry.get("updated_at"),
        "active_experiment_id": registry.get("active_experiment_id"),
        "active_baseline_experiment": registry.get("active_baseline_experiment"),
        "active_baseline_baby": registry.get("active_baseline_baby"),
        "active_official_dataset": registry.get("active_official_dataset"),
        "experiment_count": len(registry.get("experiments", [])),
        "baby_count": len(registry.get("babies", [])),
        "severity_counts": severity_counts,
        "structural_alerts": alerts,
    }


def resume(config_path: Path) -> Dict[str, Any]:
    return run_or_resume(config_path, force=False)


def run(config_path: Path, force: bool = False) -> Dict[str, Any]:
    return run_or_resume(config_path, force=force)


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--config", required=True)
    run_parser.add_argument("--force", action="store_true")

    resume_parser = subparsers.add_parser("resume")
    resume_parser.add_argument("--config", required=True)

    status_parser = subparsers.add_parser("status")
    status_parser.add_argument("--config", required=False)

    subparsers.add_parser("registry")
    subparsers.add_parser("doctor")

    args = parser.parse_args()

    if args.command == "status":
        config_path = None
        if args.config:
            config_path = (REPO_ROOT / args.config).resolve()
        print(json.dumps(status(config_path), indent=2))
        return

    if args.command == "registry":
        print(json.dumps(registry_view(), indent=2))
        return

    if args.command == "doctor":
        print(json.dumps(doctor(), indent=2))
        return

    config_path = (REPO_ROOT / args.config).resolve()
    if args.command == "run":
        result = run(config_path, force=args.force)
    else:
        result = resume(config_path)

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


if __name__ == "__main__":
    main()
