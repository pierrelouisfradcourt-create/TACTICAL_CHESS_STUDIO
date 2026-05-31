"""
lichess_importer.py — Décompresse et importe les puzzles Lichess.

Usage :
    python ml/lichess_importer.py

Produit :
    lab/puzzles/level1.jsonl  — ELO < 1200  (mateIn1, hangingPiece)
    lab/puzzles/level2.jsonl  — ELO 1200–1800 (fork, pin, skewer, mateIn2)
    lab/puzzles/level3.jsonl  — ELO > 1800  (anastasiasMate, rookEndgame...)
"""

import csv
import json
import sys
import pathlib

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
ZST_SOURCE = pathlib.Path(r"C:\Users\Studio-Dev\Desktop\lichess_db_puzzle.csv.zst")
CSV_PATH   = REPO_ROOT / "lab" / "puzzles" / "lichess_db_puzzle.csv"
OUTPUT_DIR = REPO_ROOT / "lab" / "puzzles"

MAX_PER_LEVEL = 2000

THEME_MAP = {
    "mateIn1":          "mate_in_1",
    "mateIn2":          "mate_in_2",
    "mateIn3":          "mate_in_3",
    "fork":             "fork",
    "pin":              "pin",
    "skewer":           "skewer",
    "discoveredAttack": "discovered_attack",
    "hangingPiece":     "hanging_piece",
    "defensiveMove":    "defensive_move",
    "promotion":        "promotion",
    "underPromotion":   "under_promotion",
    "backRankMate":     "back_rank_mate",
    "anastasiasMate":   "anastasias_mate",
    "smotheredMate":    "smothered_mate",
    "hookMate":         "hook_mate",
    "arabianMate":      "arabian_mate",
    "bodensMate":       "bodens_mate",
    "doubleBishopMate": "double_bishop_mate",
    "rookEndgame":      "rook_endgame",
    "queenEndgame":     "queen_endgame",
    "pawnEndgame":      "pawn_endgame",
    "trappedPiece":     "trapped_piece",
    "endgame":          "endgame",
}

LEVEL1_THEMES = {"mateIn1", "hangingPiece", "defensiveMove"}
LEVEL2_THEMES = {"fork", "pin", "skewer", "discoveredAttack", "mateIn2", "promotion"}
LEVEL3_THEMES = {
    "anastasiasMate", "smotheredMate", "backRankMate", "hookMate",
    "arabianMate", "bodensMate", "doubleBishopMate",
    "rookEndgame", "queenEndgame", "pawnEndgame",
    "mateIn3", "underPromotion", "trappedPiece",
}


def decompress_zst():
    if CSV_PATH.exists():
        print(f"[SKIP] CSV déjà présent ({CSV_PATH.stat().st_size // 1_000_000} MB)")
        return
    if not ZST_SOURCE.exists():
        print(f"[ERROR] Fichier ZST introuvable : {ZST_SOURCE}")
        sys.exit(1)
    try:
        import zstandard
    except ImportError:
        print("[INFO] Installation de zstandard...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "zstandard", "--quiet"])
        import zstandard

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[INFO] Décompression de {ZST_SOURCE} ...")
    dctx = zstandard.ZstdDecompressor()
    with ZST_SOURCE.open("rb") as f_in, CSV_PATH.open("wb") as f_out:
        dctx.copy_stream(f_in, f_out)
    print(f"[OK] Décompressé : {CSV_PATH.stat().st_size // 1_000_000} MB")


def apply_move(fen: str, uci: str) -> str | None:
    try:
        import chess
        board = chess.Board(fen)
        move = chess.Move.from_uci(uci)
        if move not in board.legal_moves:
            return None
        board.push(move)
        return board.fen()
    except Exception:
        return None


def side_to_move_int(fen: str) -> int:
    try:
        import chess
        return 1 if chess.Board(fen).turn == chess.WHITE else 2
    except Exception:
        return 1


def detect_level(themes_set: set, rating: int) -> int | None:
    if themes_set & LEVEL1_THEMES and rating < 1200:
        return 1
    if themes_set & LEVEL2_THEMES and 1200 <= rating < 1800:
        return 2
    if themes_set & LEVEL3_THEMES and rating >= 1800:
        return 3
    return None


def pick_theme(themes_set: set, level: int) -> str:
    priority = {
        1: ["mateIn1", "hangingPiece", "defensiveMove"],
        2: ["mateIn2", "fork", "pin", "skewer", "discoveredAttack", "promotion"],
        3: ["anastasiasMate", "smotheredMate", "backRankMate", "hookMate",
            "arabianMate", "bodensMate", "mateIn3", "rookEndgame", "queenEndgame"],
    }
    for t in priority.get(level, []):
        if t in themes_set:
            return THEME_MAP.get(t, t)
    for t in themes_set:
        if t in THEME_MAP:
            return THEME_MAP[t]
    return "unknown"


def build_case(row: dict, level: int) -> dict | None:
    pid      = row.get("PuzzleId", "")
    fen      = row.get("FEN", "").strip()
    moves    = row.get("Moves", "").strip().split()
    themes_s = set(row.get("Themes", "").split())

    if not pid or not fen or len(moves) < 2:
        return None
    try:
        rating = int(row.get("Rating", "0"))
    except ValueError:
        return None

    # Appliquer le coup adversaire → position réelle du puzzle
    puzzle_fen = apply_move(fen, moves[0])
    if puzzle_fen is None:
        return None

    # Solution = coups impairs (Rocky joue Moves[1], Moves[3]...)
    solution = [moves[i] for i in range(1, len(moves), 2)]
    if not solution:
        return None

    is_mate = any(t in themes_s for t in ["mateIn1", "mateIn2", "mateIn3"])

    return {
        "case_id":      f"lichess_{pid}",
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


def import_puzzles():
    import chess  # vérifier que python-chess est dispo
    buckets = {1: [], 2: [], 3: []}
    counts  = {1: 0,  2: 0,  3: 0}
    skipped = 0
    total   = 0

    print(f"[INFO] Lecture de {CSV_PATH} ...")
    with CSV_PATH.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total += 1
            if total % 500_000 == 0:
                print(f"  {total:,} lus | L1={counts[1]} L2={counts[2]} L3={counts[3]}")
            if all(counts[lvl] >= MAX_PER_LEVEL for lvl in [1, 2, 3]):
                break

            try:
                rating = int(row.get("Rating", "0"))
            except ValueError:
                skipped += 1
                continue

            themes_set = set(row.get("Themes", "").split())
            level = detect_level(themes_set, rating)
            if level is None or counts[level] >= MAX_PER_LEVEL:
                continue

            case = build_case(row, level)
            if case is None:
                skipped += 1
                continue

            buckets[level].append(case)
            counts[level] += 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for lvl in [1, 2, 3]:
        out = OUTPUT_DIR / f"level{lvl}.jsonl"
        with out.open("w", encoding="utf-8") as f:
            for c in buckets[lvl]:
                f.write(json.dumps(c, ensure_ascii=False) + "\n")
        print(f"[OK] level{lvl}.jsonl -> {counts[lvl]} puzzles")

    print(f"\n[DONE] Total: {total:,} | Skipped: {skipped} | "
          f"L1={counts[1]} L2={counts[2]} L3={counts[3]}")


if __name__ == "__main__":
    try:
        import chess
    except ImportError:
        print("[INFO] Installation de python-chess...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "chess", "--quiet"])

    decompress_zst()
    import_puzzles()
