import csv
import os
from collections import defaultdict

MOVES_PATH = "lab/experiments/exp_003_aggressive/tournaments/moves_detailed.csv"
GAMES_PATH = "lab/experiments/exp_003_aggressive/tournaments/games.csv"
OUTPUT_DIR = "lab/experiments/exp_003_aggressive/analysis"
OUTPUT_CSV = os.path.join(OUTPUT_DIR, "move_profile_summary.csv")


def to_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def to_float(num, den):
    return 0.0 if den == 0 else num / den


def load_game_outcomes(path):
    game_outcomes = {}

    if not os.path.exists(path):
        print(f"[WARN] Missing {path} -> game-level stats will be partial.")
        return game_outcomes

    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            game_id = str(row.get("game_id", "")).strip()
            if not game_id:
                continue

            winner_raw = str(row.get("winner", "")).strip()
            termination = str(row.get("termination", "")).strip()
            white = str(row.get("white", "")).strip()
            black = str(row.get("black", "")).strip()

            winner = None
            if winner_raw not in ("", "None", "none", "null"):
                try:
                    winner = int(winner_raw)
                except Exception:
                    winner = None

            game_outcomes[game_id] = {
                "winner": winner,
                "termination": termination,
                "white": white,
                "black": black,
            }

    return game_outcomes


def analyze():
    if not os.path.exists(MOVES_PATH):
        raise FileNotFoundError(f"Missing file: {MOVES_PATH}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    game_outcomes = load_game_outcomes(GAMES_PATH)

    stats = defaultdict(lambda: {
        "total_moves": 0,
        "capture_moves": 0,
        "promotion_moves": 0,
        "repetition_moves": 0,
        "no_progress_moves": 0,
        "sum_legal_move_count": 0,
        "sum_no_capture_streak": 0,
        "sum_material_abs": 0,
        "games": set(),
        "draw_games": set(),
        "turn_limit_games": set(),
        "won_games": set(),
        "lost_games": set(),
    })

    with open(MOVES_PATH, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)

        has_no_capture_streak = "no_capture_streak" in reader.fieldnames
        has_material_diff = "material_diff" in reader.fieldnames

        for row in reader:
            agent = str(row.get("profile_used", "")).strip()
            game_id = str(row.get("game_id", "")).strip()

            if not agent or not game_id:
                continue

            s = stats[agent]
            s["total_moves"] += 1
            s["games"].add(game_id)

            capture_flag = to_int(row.get("capture_flag", 0))
            promotion_flag = to_int(row.get("promotion_flag", 0))
            repetition_flag = to_int(row.get("repetition_flag", 0))
            no_progress_flag = to_int(row.get("no_progress_flag", 0))
            legal_move_count = to_int(row.get("legal_move_count", 0))

            s["capture_moves"] += capture_flag
            s["promotion_moves"] += promotion_flag
            s["repetition_moves"] += repetition_flag
            s["no_progress_moves"] += no_progress_flag
            s["sum_legal_move_count"] += legal_move_count

            if has_no_capture_streak:
                s["sum_no_capture_streak"] += to_int(row.get("no_capture_streak", 0))

            if has_material_diff:
                s["sum_material_abs"] += abs(to_int(row.get("material_diff", 0)))

            outcome = game_outcomes.get(game_id)
            if outcome:
                winner = outcome["winner"]
                termination = outcome["termination"]
                white = outcome["white"]
                black = outcome["black"]

                if winner is None:
                    s["draw_games"].add(game_id)

                if termination == "turn_limit":
                    s["turn_limit_games"].add(game_id)

                if (winner == 1 and white == agent) or (winner == 2 and black == agent):
                    s["won_games"].add(game_id)
                elif winner is not None:
                    s["lost_games"].add(game_id)

    rows = []
    for agent, s in sorted(stats.items()):
        total_moves = s["total_moves"]
        total_games = len(s["games"])

        row = {
            "agent": agent,
            "total_games": total_games,
            "total_moves": total_moves,
            "capture_rate": round(to_float(s["capture_moves"], total_moves), 4),
            "promotion_rate": round(to_float(s["promotion_moves"], total_moves), 4),
            "repetition_rate": round(to_float(s["repetition_moves"], total_moves), 4),
            "no_progress_rate": round(to_float(s["no_progress_moves"], total_moves), 4),
            "avg_legal_move_count": round(to_float(s["sum_legal_move_count"], total_moves), 2),
            "avg_no_capture_streak": round(to_float(s["sum_no_capture_streak"], total_moves), 2),
            "avg_abs_material_diff": round(to_float(s["sum_material_abs"], total_moves), 2),
            "draw_game_rate": round(to_float(len(s["draw_games"]), total_games), 4),
            "turn_limit_rate": round(to_float(len(s["turn_limit_games"]), total_games), 4),
            "win_game_rate": round(to_float(len(s["won_games"]), total_games), 4),
            "loss_game_rate": round(to_float(len(s["lost_games"]), total_games), 4),
        }
        rows.append(row)

    with open(OUTPUT_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "agent",
                "total_games",
                "total_moves",
                "capture_rate",
                "promotion_rate",
                "repetition_rate",
                "no_progress_rate",
                "avg_legal_move_count",
                "avg_no_capture_streak",
                "avg_abs_material_diff",
                "draw_game_rate",
                "turn_limit_rate",
                "win_game_rate",
                "loss_game_rate",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print("\nMOVE PROFILE SUMMARY\n")
    for row in rows:
        print(
            f"{row['agent']:10s} "
            f"games={row['total_games']:3d} "
            f"moves={row['total_moves']:4d} "
            f"capture_rate={row['capture_rate']:.3f} "
            f"draw_rate={row['draw_game_rate']:.3f} "
            f"turn_limit_rate={row['turn_limit_rate']:.3f} "
            f"avg_legal={row['avg_legal_move_count']:.2f} "
            f"avg_no_capture_streak={row['avg_no_capture_streak']:.2f}"
        )

    print(f"\nSaved: {OUTPUT_CSV}")


if __name__ == "__main__":
    analyze()