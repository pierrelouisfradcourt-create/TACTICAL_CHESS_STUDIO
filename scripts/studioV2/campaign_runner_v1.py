from __future__ import annotations

import argparse
import csv
import os
import statistics
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List


PROJECT_ROOT = Path(__file__).resolve().parent.parent
LAB_EXPERIMENTS_DIR = PROJECT_ROOT / "lab" / "experiments"
DEFAULT_GAMES_PER_MATCHUP = 12
DEFAULT_REPEATS = 3

VARIANT_MATRIX: Dict[str, Dict[str, str]] = {
    "baseline": {
        "TCS_RULE_ANTI_REPETITION": "0",
        "TCS_RULE_CONVERSION_BONUS": "0",
        "TCS_RULE_OPENING_TEMPO": "0",
    },
    "A": {
        "TCS_RULE_ANTI_REPETITION": "1",
        "TCS_RULE_CONVERSION_BONUS": "0",
        "TCS_RULE_OPENING_TEMPO": "0",
    },
    "B": {
        "TCS_RULE_ANTI_REPETITION": "0",
        "TCS_RULE_CONVERSION_BONUS": "1",
        "TCS_RULE_OPENING_TEMPO": "0",
    },
    "C": {
        "TCS_RULE_ANTI_REPETITION": "0",
        "TCS_RULE_CONVERSION_BONUS": "0",
        "TCS_RULE_OPENING_TEMPO": "1",
    },
    "AB": {
        "TCS_RULE_ANTI_REPETITION": "1",
        "TCS_RULE_CONVERSION_BONUS": "1",
        "TCS_RULE_OPENING_TEMPO": "0",
    },
    "AC": {
        "TCS_RULE_ANTI_REPETITION": "1",
        "TCS_RULE_CONVERSION_BONUS": "0",
        "TCS_RULE_OPENING_TEMPO": "1",
    },
    "BC": {
        "TCS_RULE_ANTI_REPETITION": "0",
        "TCS_RULE_CONVERSION_BONUS": "1",
        "TCS_RULE_OPENING_TEMPO": "1",
    },
    "ABC": {
        "TCS_RULE_ANTI_REPETITION": "1",
        "TCS_RULE_CONVERSION_BONUS": "1",
        "TCS_RULE_OPENING_TEMPO": "1",
    },
}


@dataclass
class RunResult:
    campaign_id: str
    variant: str
    repeat_index: int
    experiment_id: str
    games_per_matchup: int
    model_path: str
    wins: int
    losses: int
    draws: int
    elo: float
    draw_pct: float
    repetition_draw_pct: float
    turn_limit_pct: float
    losses_pct: float


@dataclass
class SummaryRow:
    variant: str
    repeats: int
    mean_wins: float
    std_wins: float
    mean_losses: float
    std_losses: float
    mean_draws: float
    std_draws: float
    mean_elo: float
    std_elo: float
    mean_draw_pct: float
    std_draw_pct: float
    mean_repetition_draw_pct: float
    std_repetition_draw_pct: float
    mean_turn_limit_pct: float
    std_turn_limit_pct: float
    mean_losses_pct: float
    std_losses_pct: float


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run modular rerank campaign matrix.")
    parser.add_argument("--repeats", type=int, default=DEFAULT_REPEATS)
    parser.add_argument(
        "--games-per-matchup",
        type=int,
        default=DEFAULT_GAMES_PER_MATCHUP,
    )
    parser.add_argument(
        "--campaign-id",
        type=str,
        default=datetime.now().strftime("campaign_run_v1_%Y%m%d_%H%M%S"),
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Defaults to lab/experiments/<campaign-id>",
    )
    parser.add_argument(
        "--python-exe",
        type=str,
        default=os.environ.get(
            "TCS_PYTHON_EXE",
            str(PROJECT_ROOT / ".venv312" / "Scripts" / "python.exe"),
        ),
    )
    parser.add_argument(
        "--model-path",
        type=str,
        default=os.environ.get("TCS_MODEL_PATH", "models/latest.pt"),
    )
    return parser.parse_args()


def run_command(command: List[str], env: Dict[str, str]) -> None:
    completed = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        env=env,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        sys.stderr.write(completed.stdout)
        sys.stderr.write(completed.stderr)
        raise RuntimeError(
            f"command failed with exit code {completed.returncode}: {' '.join(command)}"
        )


def load_csv_rows(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: Iterable[dict], fieldnames: List[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def compute_run_metrics(
    campaign_id: str,
    variant: str,
    repeat_index: int,
    experiment_id: str,
    games_per_matchup: int,
    model_path: str,
    experiment_dir: Path,
) -> RunResult:
    games_rows = load_csv_rows(experiment_dir / "tournaments" / "games.csv")
    move_rows = load_csv_rows(experiment_dir / "tournaments" / "moves_detailed.csv")
    elo_rows = load_csv_rows(experiment_dir / "tournaments" / "elo.csv")

    main_eval_games = [row for row in games_rows if row["match_block"] == "MAIN_EVAL"]
    if not main_eval_games:
        raise RuntimeError(f"no MAIN_EVAL games found in {experiment_dir}")

    last_move_by_game: Dict[str, Dict[str, str]] = {}
    for row in move_rows:
        last_move_by_game[row["game_id"]] = row

    wins = 0
    losses = 0
    draws = 0
    repetition_draws = 0
    turn_limit_draws = 0

    for game in main_eval_games:
        winner = game["winner"]
        game_id = game["game_id"]
        last_move = last_move_by_game.get(game_id)

        if winner == "draw":
            draws += 1
            if game["termination"] == "turn_limit":
                turn_limit_draws += 1
            if last_move and int(last_move["repetition_flag"]) == 1:
                repetition_draws += 1
        elif (
            (winner == "white" and game["white"] == "neural")
            or (winner == "black" and game["black"] == "neural")
        ):
            wins += 1
        else:
            losses += 1

    total_games = len(main_eval_games)
    neural_elo = next((float(row["elo"]) for row in elo_rows if row["agent"] == "neural"), 0.0)

    return RunResult(
        campaign_id=campaign_id,
        variant=variant,
        repeat_index=repeat_index,
        experiment_id=experiment_id,
        games_per_matchup=games_per_matchup,
        model_path=model_path,
        wins=wins,
        losses=losses,
        draws=draws,
        elo=neural_elo,
        draw_pct=round(100.0 * draws / total_games, 2),
        repetition_draw_pct=round(100.0 * repetition_draws / total_games, 2),
        turn_limit_pct=round(100.0 * turn_limit_draws / total_games, 2),
        losses_pct=round(100.0 * losses / total_games, 2),
    )


def compute_mean(values: List[float]) -> float:
    return round(sum(values) / len(values), 4)


def compute_std(values: List[float]) -> float:
    if len(values) <= 1:
        return 0.0
    return round(statistics.stdev(values), 4)


def build_summary(results: List[RunResult]) -> List[SummaryRow]:
    rows: List[SummaryRow] = []

    for variant in VARIANT_MATRIX:
        variant_runs = [row for row in results if row.variant == variant]
        rows.append(
            SummaryRow(
                variant=variant,
                repeats=len(variant_runs),
                mean_wins=compute_mean([float(r.wins) for r in variant_runs]),
                std_wins=compute_std([float(r.wins) for r in variant_runs]),
                mean_losses=compute_mean([float(r.losses) for r in variant_runs]),
                std_losses=compute_std([float(r.losses) for r in variant_runs]),
                mean_draws=compute_mean([float(r.draws) for r in variant_runs]),
                std_draws=compute_std([float(r.draws) for r in variant_runs]),
                mean_elo=compute_mean([r.elo for r in variant_runs]),
                std_elo=compute_std([r.elo for r in variant_runs]),
                mean_draw_pct=compute_mean([r.draw_pct for r in variant_runs]),
                std_draw_pct=compute_std([r.draw_pct for r in variant_runs]),
                mean_repetition_draw_pct=compute_mean(
                    [r.repetition_draw_pct for r in variant_runs]
                ),
                std_repetition_draw_pct=compute_std(
                    [r.repetition_draw_pct for r in variant_runs]
                ),
                mean_turn_limit_pct=compute_mean([r.turn_limit_pct for r in variant_runs]),
                std_turn_limit_pct=compute_std([r.turn_limit_pct for r in variant_runs]),
                mean_losses_pct=compute_mean([r.losses_pct for r in variant_runs]),
                std_losses_pct=compute_std([r.losses_pct for r in variant_runs]),
            )
        )

    return rows


def select_best_stable_variant(summary_rows: List[SummaryRow]) -> SummaryRow:
    ranked = sorted(
        summary_rows,
        key=lambda row: (
            -row.mean_elo,
            row.std_elo,
            row.mean_losses_pct,
            row.mean_draw_pct,
            row.mean_repetition_draw_pct,
        ),
    )
    return ranked[0]


def print_compact_report(summary_rows: List[SummaryRow], best_variant: SummaryRow) -> None:
    ranked = sorted(
        summary_rows,
        key=lambda row: (
            -row.mean_elo,
            row.std_elo,
            row.mean_losses_pct,
            row.mean_draw_pct,
            row.mean_repetition_draw_pct,
        ),
    )

    print("CAMPAIGN_RUNNER_V1")
    print("variant | mean_elo +/- std | mean_draw_pct | mean_losses_pct | mean_rep_draw_pct")
    for row in ranked:
        print(
            f"{row.variant} | "
            f"{row.mean_elo:.2f} +/- {row.std_elo:.2f} | "
            f"{row.mean_draw_pct:.2f} | "
            f"{row.mean_losses_pct:.2f} | "
            f"{row.mean_repetition_draw_pct:.2f}"
        )
    print()
    print(
        f"BEST STABLE VARIANT: {best_variant.variant} "
        f"(mean_elo={best_variant.mean_elo:.2f}, std_elo={best_variant.std_elo:.2f})"
    )


def main() -> None:
    args = parse_args()

    if args.repeats < 3:
        raise ValueError("CAMPAIGN_RUNNER_V1 requires at least 3 repeats per variant")

    output_dir = args.output_dir or (LAB_EXPERIMENTS_DIR / args.campaign_id)
    output_dir.mkdir(parents=True, exist_ok=True)

    results: List[RunResult] = []

    base_env = os.environ.copy()
    base_env["TCS_PYTHON_EXE"] = args.python_exe
    base_env["TCS_MODEL_PATH"] = args.model_path
    base_env["TCS_NEURAL_VALUE_DEBUG"] = "0"
    base_env["RUSTFLAGS"] = "-Awarnings"

    cargo_cmd = ["cargo", "run", "--quiet", "--", "neural_tournament", str(args.games_per_matchup)]

    for variant, variant_env in VARIANT_MATRIX.items():
        for repeat_index in range(1, args.repeats + 1):
            experiment_id = f"{args.campaign_id}__{variant}__r{repeat_index:02d}"
            env = base_env.copy()
            env["TCS_EXPERIMENT_ID"] = experiment_id
            env.update(variant_env)

            print(f"[RUN] variant={variant} repeat={repeat_index} experiment_id={experiment_id}")
            run_command(cargo_cmd, env)

            experiment_dir = LAB_EXPERIMENTS_DIR / experiment_id
            results.append(
                compute_run_metrics(
                    campaign_id=args.campaign_id,
                    variant=variant,
                    repeat_index=repeat_index,
                    experiment_id=experiment_id,
                    games_per_matchup=args.games_per_matchup,
                    model_path=args.model_path,
                    experiment_dir=experiment_dir,
                )
            )

    summary_rows = build_summary(results)
    best_variant = select_best_stable_variant(summary_rows)

    results_csv = output_dir / "campaign_results.csv"
    summary_csv = output_dir / "campaign_summary.csv"

    write_csv(
        results_csv,
        [row.__dict__ for row in results],
        [
            "campaign_id",
            "variant",
            "repeat_index",
            "experiment_id",
            "games_per_matchup",
            "model_path",
            "wins",
            "losses",
            "draws",
            "elo",
            "draw_pct",
            "repetition_draw_pct",
            "turn_limit_pct",
            "losses_pct",
        ],
    )

    write_csv(
        summary_csv,
        [row.__dict__ for row in summary_rows],
        [
            "variant",
            "repeats",
            "mean_wins",
            "std_wins",
            "mean_losses",
            "std_losses",
            "mean_draws",
            "std_draws",
            "mean_elo",
            "std_elo",
            "mean_draw_pct",
            "std_draw_pct",
            "mean_repetition_draw_pct",
            "std_repetition_draw_pct",
            "mean_turn_limit_pct",
            "std_turn_limit_pct",
            "mean_losses_pct",
            "std_losses_pct",
        ],
    )

    print()
    print(f"Saved results: {results_csv}")
    print(f"Saved summary: {summary_csv}")
    print()
    print_compact_report(summary_rows, best_variant)


if __name__ == "__main__":
    main()
