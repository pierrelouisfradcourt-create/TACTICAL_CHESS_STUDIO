"""
sf_dataset_generator.py — Stockfish vs Stockfish → pool_sf.jsonl

Usage:
    python ml/sf_dataset_generator.py [--games 500] [--depth 14]

Requires:
    TCS_STOCKFISH_PATH env var pointing to stockfish executable
    python-chess  (pip install chess)

Output:
    lab/datasets/pool/pool_sf.jsonl
    lab/datasets/pool/pool_sf_manifest.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import random
import sys
import uuid
from typing import Dict, List, Optional, Tuple

try:
    import chess
    import chess.engine
except ImportError:
    print("[ERROR] python-chess manquant : pip install chess")
    sys.exit(1)

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / "lab" / "datasets" / "pool" / "pool_sf.jsonl"
SOURCE_TAG = "stockfish_sf14"
MAX_PLIES_PER_GAME = 400

MIN_OPENING_PLIES = 8   # demi-coups aléatoires minimum (4 coups)
MAX_OPENING_PLIES = 16  # demi-coups aléatoires maximum (8 coups)


# ---------------------------------------------------------------------------
# Phase detection
# ---------------------------------------------------------------------------

def detect_phase(board: chess.Board) -> str:
    if board.fullmove_number <= 10:
        return "opening"
    piece_count = len(board.piece_map())
    if piece_count <= 14:
        return "endgame"
    return "midgame"


# ---------------------------------------------------------------------------
# Random opening generation
# ---------------------------------------------------------------------------

def generate_random_opening_boards(
    n: int,
    rng: random.Random,
    min_plies: int = MIN_OPENING_PLIES,
    max_plies: int = MAX_OPENING_PLIES,
) -> List[chess.Board]:
    """Génère n positions d'ouverture par coups aléatoires légaux depuis la position initiale.

    Les positions aléatoires sont typiquement déséquilibrées, ce qui réduit
    fortement le draw_rate dans les parties SF vs SF (asymétrie tactique).
    """
    boards: List[chess.Board] = []
    attempts = 0
    max_attempts = n * 20
    while len(boards) < n and attempts < max_attempts:
        attempts += 1
        board = chess.Board()
        n_plies = rng.randint(min_plies, max_plies)
        for _ in range(n_plies):
            if board.is_game_over():
                break
            legal = list(board.legal_moves)
            if not legal:
                break
            board.push(rng.choice(legal))
        if not board.is_game_over():
            boards.append(board.copy())
    if len(boards) < n:
        print(f"[WARN] Seulement {len(boards)}/{n} positions générées après {attempts} tentatives")
    return boards


# ---------------------------------------------------------------------------
# Score extraction
# ---------------------------------------------------------------------------

def parse_score_cp(info: chess.engine.InfoDict, board: chess.Board) -> Optional[int]:
    """Retourne le score en centipions depuis le point de vue des Blancs."""
    score = info.get("score")
    if score is None:
        return None
    pov = score.white()
    if pov.is_mate():
        return 30000 if (pov.mate() or 0) > 0 else -30000
    return pov.score()


# ---------------------------------------------------------------------------
# Game simulation
# ---------------------------------------------------------------------------

def play_one_game(
    engine: chess.engine.SimpleEngine,
    opening_board: chess.Board,
    limit_white: chess.engine.Limit,
    limit_black: chess.engine.Limit,
) -> Tuple[List[Dict], str]:
    """
    Joue une partie SF vs SF depuis une position d'ouverture.
    Retourne (liste de records positionnels, résultat '1-0'/'0-1'/'1/2-1/2').
    """
    board = opening_board.copy()
    opening_fen = opening_board.fen()

    records: List[Dict] = []
    game_id = str(uuid.uuid4())
    ply = 0

    while not board.is_game_over(claim_draw=True) and ply < MAX_PLIES_PER_GAME:
        fen_before = board.fen()
        phase = detect_phase(board)
        player_to_move = 1 if board.turn == chess.WHITE else 2
        limit = limit_white if board.turn == chess.WHITE else limit_black

        try:
            info = engine.analyse(board, limit)
        except Exception as exc:
            print(f"[WARN] analyse échouée sur {fen_before}: {exc}")
            break

        score_cp = parse_score_cp(info, board)
        pv = info.get("pv", [])
        if not pv:
            break
        best_move = pv[0]

        legal_moves = [m.uci() for m in board.legal_moves]

        records.append({
            "game_id": game_id,
            "fen": fen_before,
            "best_move": best_move.uci(),
            "legal_moves": legal_moves,
            "engine_eval": score_cp,
            "phase": phase,
            "player_to_move": player_to_move,
            "source": SOURCE_TAG,
            "opening_fen": opening_fen,
        })

        board.push(best_move)
        ply += 1

    # Résultat final
    outcome = board.outcome(claim_draw=True)
    if outcome is None:
        return [], None  # partie non résolue → ignorée
    elif outcome.winner == chess.WHITE:
        result_str = "1-0"
    elif outcome.winner == chess.BLACK:
        result_str = "0-1"
    else:
        result_str = "1/2-1/2"

    for rec in records:
        rec["result"] = result_str

    return records, result_str


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------

def compute_sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def write_manifest(out_path: pathlib.Path, nb_lignes: int, results: List[str]) -> None:
    draws = sum(1 for r in results if r == "1/2-1/2")
    draw_rate = draws / len(results) if results else 0.0
    checksum = compute_sha256(out_path) if out_path.exists() else ""

    manifest = {
        "source": SOURCE_TAG,
        "output": str(out_path),
        "nb_lignes": nb_lignes,
        "nb_games": len(results),
        "draw_rate": round(draw_rate, 4),
        "checksum_sha256": checksum,
        "result_counts": {
            "1-0": results.count("1-0"),
            "0-1": results.count("0-1"),
            "1/2-1/2": results.count("1/2-1/2"),
        },
    }
    manifest_path = out_path.parent / (out_path.stem + "_manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[MANIFEST] {manifest_path}")
    print(f"  nb_lignes  : {nb_lignes}")
    print(f"  nb_games   : {len(results)}")
    print(f"  draw_rate  : {draw_rate:.4f}")
    print(f"  checksum   : {checksum[:16]}...")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Génère pool_sf.jsonl via SF vs SF")
    parser.add_argument("--games", type=int, default=500)
    parser.add_argument("--depth", type=int, default=14, help="Depth du côté fort")
    parser.add_argument("--out", type=str, default=str(DEFAULT_OUT))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    limit_strong = chess.engine.Limit(depth=args.depth)
    limit_weak = chess.engine.Limit(time=1.0)

    rng = random.Random(args.seed)

    sf_path = os.environ.get("TCS_STOCKFISH_PATH", "")
    if not sf_path or not pathlib.Path(sf_path).exists():
        print(f"[ERROR] TCS_STOCKFISH_PATH non défini ou introuvable : {sf_path!r}")
        sys.exit(1)

    # Génère un pool de positions aléatoires uniques (8–16 demi-coups = 4–8 coups)
    pool_size = max(args.games, 200)
    openings = generate_random_opening_boards(pool_size, rng)
    print(f"[INFO] {len(openings)} positions d'ouverture aléatoires générées (8–16 demi-coups)")
    if not openings:
        print("[ERROR] Aucune position d'ouverture générée")
        sys.exit(1)

    out_path = pathlib.Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"[INFO] Démarrage de Stockfish : {sf_path}")
    engine = chess.engine.SimpleEngine.popen_uci(sf_path)
    engine.configure({"Skill Level": 15})

    all_results: List[str] = []
    nb_lignes = 0

    try:
        with out_path.open("w", encoding="utf-8") as fout:
            for game_idx in range(1, args.games + 1):
                opening_board = openings[(game_idx - 1) % len(openings)]
                if game_idx % 2 == 0:
                    lw, lb = limit_strong, limit_weak   # pairs : Blanc fort, Noir faible
                else:
                    lw, lb = limit_weak, limit_strong   # impairs : Blanc faible, Noir fort
                try:
                    records, result_str = play_one_game(engine, opening_board, lw, lb)
                    if result_str is None:
                        continue
                except Exception as exc:
                    print(f"[WARN] Partie {game_idx} échouée : {exc}")
                    continue

                for rec in records:
                    fout.write(json.dumps(rec, ensure_ascii=False) + "\n")
                    nb_lignes += 1

                all_results.append(result_str)

                if game_idx % 50 == 0 or game_idx == args.games:
                    draws = all_results.count("1/2-1/2")
                    dr = draws / len(all_results) if all_results else 0.0
                    print(
                        f"  [{game_idx:4d}/{args.games}] "
                        f"positions={nb_lignes:6d}  "
                        f"draw_rate={dr:.3f}  "
                        f"last={result_str}"
                    )
    finally:
        engine.quit()

    write_manifest(out_path, nb_lignes, all_results)
    print(f"\n[DONE] {nb_lignes} positions → {out_path}")


if __name__ == "__main__":
    main()
