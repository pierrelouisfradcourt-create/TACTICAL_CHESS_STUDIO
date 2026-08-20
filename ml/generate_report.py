import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from experiment_analytics import analyze_tournament_dir, load_report


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
        return {}
    return registry


def iter_experiments(registry: Dict[str, Any]) -> List[Dict[str, Any]]:
    experiments = registry.get("experiments", [])
    if isinstance(experiments, dict):
        rows = []
        for experiment_id, entry in experiments.items():
            item = dict(entry)
            item["experiment_id"] = item.get("experiment_id") or experiment_id
            rows.append(item)
        return rows
    if isinstance(experiments, list):
        return [dict(item) for item in experiments if isinstance(item, dict)]
    return []


def iter_babies(registry: Dict[str, Any]) -> List[Dict[str, Any]]:
    babies = registry.get("babies", [])
    if isinstance(babies, list):
        return [dict(item) for item in babies if isinstance(item, dict)]
    return []


def find_experiment(registry: Dict[str, Any], experiment_id: str) -> Optional[Dict[str, Any]]:
    for experiment in iter_experiments(registry):
        if experiment.get("experiment_id") == experiment_id:
            return experiment
    return None


def find_baby(
    registry: Dict[str, Any], experiment_id: str, baby_id: Optional[str]
) -> Optional[Dict[str, Any]]:
    if baby_id is None:
        return None
    for baby in iter_babies(registry):
        if baby.get("origin_experiment") == experiment_id and baby.get("baby_id") == baby_id:
            return baby
    return None


def latest_target(registry: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    latest_run = registry.get("latest_run") or {}
    experiment_id = latest_run.get("experiment_id") or registry.get("active_experiment_id")
    baby_id = latest_run.get("baby_id")

    experiment = find_experiment(registry, experiment_id) if experiment_id else None
    baby = find_baby(registry, experiment_id, baby_id) if experiment_id else None

    if experiment is None and experiment_id:
        experiment_path = EXPERIMENTS_DIR / experiment_id
        experiment = {
            "experiment_id": experiment_id,
            "path": str(experiment_path.resolve()),
            "report_path": str((experiment_path / "report.json").resolve()),
        }

    if baby is None and experiment_id and baby_id:
        experiment_path = (
            Path(experiment["path"])
            if experiment is not None and experiment.get("path")
            else (EXPERIMENTS_DIR / experiment_id)
        )
        baby_path = experiment_path / "babies" / baby_id
        baby = {
            "baby_id": baby_id,
            "origin_experiment": experiment_id,
            "report_path": str((baby_path / "report.json").resolve()),
        }

    return experiment, baby


def tournament_base_dir(experiment: Optional[Dict[str, Any]], baby: Optional[Dict[str, Any]]) -> Optional[Path]:
    if experiment is None:
        return None

    experiment_path = Path(experiment.get("path", EXPERIMENTS_DIR / experiment["experiment_id"]))
    if baby is not None:
        return experiment_path / "babies" / baby["baby_id"]
    return experiment_path


def tournament_log_path(base_dir: Optional[Path]) -> Optional[Path]:
    if base_dir is None:
        return None

    candidate = base_dir / "tournament.log"
    return candidate if candidate.exists() else None


def infer_policy_index_status(log_path: Optional[Path]) -> str:
    if log_path is None or not log_path.exists():
        return "unknown"

    observed_values: List[int] = []

    try:
        with log_path.open("r", encoding="utf-8", errors="ignore") as handle:
            for raw in handle:
                line = raw.strip()
                candidates: List[str] = []

                if "policy_index=" in line:
                    for part in line.split("|"):
                        if "policy_index=" in part:
                            candidates.append(part.split("policy_index=", 1)[1].strip())

                if line.startswith("NEURAL_POLICY_INDEX="):
                    candidates.append(line.split("=", 1)[1].strip())

                for value in candidates:
                    if value == "":
                        continue
                    try:
                        observed_values.append(int(value))
                    except Exception:
                        continue

        if any(value >= 0 for value in observed_values):
            return "valid"
        if observed_values and all(value == -1 for value in observed_values):
            return "invalid"
        return "unknown"
    except Exception:
        return "unknown"


def load_tournament_analysis(
    experiment: Optional[Dict[str, Any]], baby: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    base_dir = tournament_base_dir(experiment, baby)
    if base_dir is None or not base_dir.exists():
        return {}
    return analyze_tournament_dir(base_dir, tournament_log_path(base_dir))


def load_baby_report(experiment: Optional[Dict[str, Any]], baby: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if experiment is None:
        return None
    report_path: Optional[Path] = None
    if baby is not None and baby.get("report_path"):
        report_path = Path(baby["report_path"])
    elif experiment.get("report_path"):
        report_path = Path(experiment["report_path"])
    if report_path is None:
        return None
    return load_report(report_path)


def format_matchup(matchups: List[Dict[str, Any]], opponent: str) -> str:
    for matchup in matchups:
        if (matchup.get("opponent") or "").strip() == opponent:
            wins = matchup.get("wins", "unknown")
            losses = matchup.get("losses", "unknown")
            draws = matchup.get("draws", "unknown")
            games = matchup.get("games", "unknown")
            return f"{wins}-{losses}-{draws} over {games} games"
    return "unknown"


def format_elo_section(leaderboard: List[Dict[str, Any]]) -> str:
    if not leaderboard:
        return "unknown"
    lines = []
    for row in leaderboard:
        agent = row.get("agent", "unknown")
        elo = row.get("elo", "unknown")
        lines.append(f"{agent}: {elo}")
    return "\n".join(lines)


def format_runtime(runtime: Dict[str, Any], log_path: Optional[Path]) -> Tuple[str, str, str]:
    status = runtime.get("status", "unknown")
    fallback_events = runtime.get("fallback_events", "unknown")
    policy_index = runtime.get("policy_index_status") or infer_policy_index_status(log_path)
    return str(status), str(policy_index), str(fallback_events)


def diagnosis_text(
    runtime_status: str,
    draw_rate: Any,
    turn_limit_games: Any,
    long_games: Any,
) -> str:
    notes: List[str] = []

    try:
        draw_rate_value = float(draw_rate)
    except Exception:
        draw_rate_value = None

    try:
        turn_limit_value = int(turn_limit_games)
    except Exception:
        turn_limit_value = None

    try:
        long_games_value = int(long_games)
    except Exception:
        long_games_value = None

    if runtime_status == "fallback_contaminated":
        notes.append("runtime contamination detected")
    elif runtime_status == "clean":
        notes.append("runtime looks clean")
    else:
        notes.append("runtime status unknown")

    if draw_rate_value is not None:
        if draw_rate_value >= 0.75:
            notes.append("environment is highly draw-heavy")
        elif draw_rate_value >= 0.45:
            notes.append("draw rate is elevated")

    if turn_limit_value is not None and turn_limit_value > 0:
        notes.append("turn-limit games present")

    if long_games_value is not None and long_games_value > 0:
        notes.append("long-game conversion should be reviewed")

    if not notes:
        return "unknown"
    return "; ".join(notes)


def generate_report_string() -> str:
    registry = load_registry()
    experiment, baby = latest_target(registry)
    analysis = load_tournament_analysis(experiment, baby)
    baby_report = load_baby_report(experiment, baby)

    runtime = analysis.get("runtime", {})
    summary = analysis.get("summary", {})
    matchups = analysis.get("neural_matchups", [])
    leaderboard = analysis.get("elo", {}).get("leaderboard", [])

    base_dir = tournament_base_dir(experiment, baby)
    log_path = tournament_log_path(base_dir)
    runtime_status, policy_index, fallback_events = format_runtime(runtime, log_path)

    experiment_id = "unknown"
    baseline_id = "unknown"
    dataset = registry.get("active_official_dataset", "unknown")

    if experiment is not None:
        experiment_id = experiment.get("experiment_id", "unknown")
        baseline_id = experiment.get(
            "baseline_experiment_id",
            registry.get("active_baseline_experiment", "unknown"),
        ) or "unknown"
        dataset = experiment.get("dataset_path") or dataset or "unknown"

    total_games = summary.get("total_games", "unknown")
    draw_rate = summary.get("draw_rate", "unknown")
    turn_limit_games = "unknown"
    long_games = "unknown"

    games_csv = None
    if base_dir is not None:
        games_csv = base_dir / "tournaments" / "games.csv"

    if games_csv is not None and games_csv.exists():
        try:
            rows = games_csv.read_text(encoding="utf-8").splitlines()
            if len(rows) > 1:
                import csv
                from io import StringIO

                parsed = list(csv.DictReader(StringIO("\n".join(rows))))
                turn_limit_games = sum(
                    1 for row in parsed if (row.get("termination") or "").strip() == "turn_limit"
                )
                long_games = sum(
                    1 for row in parsed if int((row.get("turns") or "0").strip() or "0") >= 120
                )
        except Exception:
            turn_limit_games = "unknown"
            long_games = "unknown"

    if baby_report and isinstance(baby_report, dict):
        tournament_analysis = baby_report.get("tournament_analysis", {})
        if tournament_analysis and not analysis:
            analysis = tournament_analysis

    diagnosis = diagnosis_text(runtime_status, draw_rate, turn_limit_games, long_games)

    report = (
        "=== RUNTIME ===\n"
        f"status: {runtime_status}\n"
        f"policy_index: {policy_index}\n"
        f"fallback_events: {fallback_events}\n\n"
        "=== EXPERIMENT ===\n"
        f"experiment_id: {experiment_id or 'unknown'}\n"
        f"baseline_id: {baseline_id or 'unknown'}\n"
        f"dataset: {dataset or 'unknown'}\n\n"
        "=== TOURNAMENT SUMMARY ===\n"
        f"random_vs_neural: {format_matchup(matchups, 'random')}\n"
        f"heuristic_vs_neural: {format_matchup(matchups, 'heuristic')}\n"
        f"hybrid_vs_neural: {format_matchup(matchups, 'hybrid')}\n\n"
        "=== METRICS ===\n"
        f"total_games: {total_games}\n"
        f"draw_rate: {draw_rate}\n"
        f"turn_limit_games: {turn_limit_games}\n"
        f"long_games: {long_games}\n\n"
        "=== ELO ===\n"
        f"{format_elo_section(leaderboard)}\n\n"
        "=== DIAGNOSIS ===\n"
        f"{diagnosis}"
    )
    return report


def main() -> None:
    print(generate_report_string())


if __name__ == "__main__":
    main()
