"""
rebuild_levels.py — Reconstruit L2 et L3 avec la bonne longueur de solution.

L2 : Moves.len() == 4 (2 coups Rocky : opp_setup + rocky1 + opp_reply + rocky2)
L3 : Moves.len() == 6 (3 coups Rocky : opp_setup + rocky1 + opp_reply + rocky2 + opp_reply2 + rocky3)
"""

import csv
import json
import chess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CSV = REPO_ROOT / "lab" / "puzzles" / "lichess_db_puzzle.csv"

LEVEL2_THEMES = {"fork", "pin", "skewer", "discoveredAttack", "mateIn2", "promotion"}
LEVEL3_THEMES = {
    "anastasiasMate", "smotheredMate", "backRankMate", "hookMate",
    "arabianMate", "bodensMate", "mateIn3", "rookEndgame",
    "queenEndgame", "pawnEndgame", "trappedPiece",
}

THEME_MAP = {
    "mateIn2":          "mate_in_2",
    "mateIn3":          "mate_in_3",
    "fork":             "fork",
    "pin":              "pin",
    "skewer":           "skewer",
    "discoveredAttack": "discovered_attack",
    "promotion":        "promotion",
    "anastasiasMate":   "anastasias_mate",
    "smotheredMate":    "smothered_mate",
    "backRankMate":     "back_rank_mate",
    "hookMate":         "hook_mate",
    "arabianMate":      "arabian_mate",
    "bodensMate":       "bodens_mate",
    "rookEndgame":      "rook_endgame",
    "queenEndgame":     "queen_endgame",
    "pawnEndgame":      "pawn_endgame",
    "trappedPiece":     "trapped_piece",
}

MAX_PER_LEVEL = 2000


def apply_move(fen, uci):
    try:
        b = chess.Board(fen)
        m = chess.Move.from_uci(uci)
        if m not in b.legal_moves:
            return None
        b.push(m)
        return b.fen()
    except Exception:
        return None


def side_to_move_int(fen):
    try:
        return 1 if chess.Board(fen).turn == chess.WHITE else 2
    except Exception:
        return 1


def pick_theme(themes_set, level):
    priority = {
        2: ["mateIn2", "fork", "pin", "skewer", "discoveredAttack", "promotion"],
        3: ["anastasiasMate", "smotheredMate", "backRankMate", "hookMate",
            "arabianMate", "mateIn3", "rookEndgame", "queenEndgame"],
    }
    for t in priority.get(level, []):
        if t in themes_set:
            return THEME_MAP.get(t, t)
    for t in themes_set:
        if t in THEME_MAP:
            return THEME_MAP[t]
    return "unknown"


def build_case(row, level, expected_moves_len):
    pid = row.get("PuzzleId", "")
    fen = row.get("FEN", "").strip()
    moves = row.get("Moves", "").strip().split()
    themes_s = set(row.get("Themes", "").split())

    if not pid or not fen:
        return None
    # Filtrer par longueur exacte de solution (critere principal du fix)
    if len(moves) != expected_moves_len:
        return None

    try:
        rating = int(row.get("Rating", "0"))
    except ValueError:
        return None

    puzzle_fen = apply_move(fen, moves[0])
    if puzzle_fen is None:
        return None

    # Solution = coups Rocky (index impairs : 1, 3, 5...)
    solution = [moves[i] for i in range(1, len(moves), 2)]
    if not solution:
        return None

    is_mate = any(t in themes_s for t in ["mateIn1", "mateIn2", "mateIn3"])

    return {
        "case_id":      "lichess_" + pid,
        "fen":          puzzle_fen,
        "side_to_move": side_to_move_int(puzzle_fen),
        "theme":        pick_theme(themes_s, level),
        "best_moves":   solution,
        "seed":         0,
        "difficulty":   level,
        "validation": {
            "mate":               is_mate,
            "fork_targets":       [],
            "material_gain_hint": 0,
        },
        "lichess_id":     pid,
        "lichess_rating": rating,
        "lichess_themes": list(themes_s),
    }


def rebuild_level(level, themes, elo_min, elo_max, expected_moves_len):
    out_path = REPO_ROOT / "lab" / "puzzles" / f"level{level}.jsonl"
    puzzles = []
    total_read = 0

    print(f"[L{level}] Reconstruction depuis {CSV}...")
    with CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if len(puzzles) >= MAX_PER_LEVEL:
                break
            total_read += 1
            if total_read % 1_000_000 == 0:
                print(f"  {total_read:,} lus, {len(puzzles)} puzzles L{level}")

            themes_s = set(row.get("Themes", "").split())
            if not themes_s & themes:
                continue

            try:
                rating = int(row.get("Rating", "0"))
            except ValueError:
                continue
            if not (elo_min <= rating < elo_max):
                continue

            case = build_case(row, level, expected_moves_len)
            if case:
                puzzles.append(case)

    with out_path.open("w", encoding="utf-8") as f:
        for c in puzzles:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    print(f"[L{level}] {len(puzzles)} puzzles -> {out_path}")
    return len(puzzles)


if __name__ == "__main__":
    # L2 : solution 2 coups Rocky = Moves.len() == 4
    n2 = rebuild_level(2, LEVEL2_THEMES, 1200, 1800, expected_moves_len=4)
    # L3 : solution 3 coups Rocky = Moves.len() == 6
    n3 = rebuild_level(3, LEVEL3_THEMES, 1800, 9999, expected_moves_len=6)
    print(f"Done. L2={n2} L3={n3}")
