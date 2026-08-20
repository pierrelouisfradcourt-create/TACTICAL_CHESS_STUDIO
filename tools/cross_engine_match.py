#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Cross-engine match driver for Tactical Chess Studio.

Pilote deux moteurs UCI l'un contre l'autre via python-chess (deja installe).
Ne touche pas a src/ ni aux zones FORBIDDEN. Zone neutre tools/.

Moteurs supportes nativement (UCI) :
  - sunfish   -> python tools/sunfish/sunfish.py
  - stockfish -> tools/vendor_tools/stockfish/stockfish-windows-x86-64-avx2.exe
                 (ou $TCS_STOCKFISH_PATH)

Rocky (play_fen seulement, pas d'UCI) N'EST PAS pilotable ici tant qu'un
adaptateur UCI n'existe pas (cf. gap IMP-233).

Exemples :
  python tools/cross_engine_match.py --white sunfish --black stockfish --games 2 --movetime 100
  python tools/cross_engine_match.py --white stockfish --black sunfish --games 4 --movetime 50
"""
import argparse
import os
import sys
from pathlib import Path

import chess
import chess.engine

# Racine repo = parent de tools/
REPO_ROOT = Path(__file__).resolve().parent.parent

DEFAULT_STOCKFISH = REPO_ROOT / "tools" / "vendor_tools" / "stockfish" / "stockfish-windows-x86-64-avx2.exe"
SUNFISH_PY = REPO_ROOT / "tools" / "sunfish" / "sunfish.py"
ROCKY_UCI = REPO_ROOT / "tools" / "rocky_uci.py"


def resolve_engine_cmd(name: str) -> list[str]:
    """Retourne la commande popen UCI pour un nom de moteur connu."""
    key = name.lower()
    if key == "sunfish":
        if not SUNFISH_PY.exists():
            raise FileNotFoundError(f"sunfish absent: {SUNFISH_PY}")
        return [sys.executable, str(SUNFISH_PY)]
    if key == "stockfish":
        sf = os.environ.get("TCS_STOCKFISH_PATH", str(DEFAULT_STOCKFISH))
        if not Path(sf).exists():
            raise FileNotFoundError(f"stockfish absent: {sf}")
        return [sf]
    if key == "rocky":
        if not ROCKY_UCI.exists():
            raise FileNotFoundError(f"rocky_uci absent: {ROCKY_UCI}")
        return [sys.executable, str(ROCKY_UCI)]
    raise ValueError(f"moteur inconnu: {name!r} (attendu: sunfish | stockfish | rocky)")


def open_engine(name: str) -> chess.engine.SimpleEngine:
    cmd = resolve_engine_cmd(name)
    return chess.engine.SimpleEngine.popen_uci(cmd, timeout=20.0)


def play_game(white_eng, black_eng, limit, max_plies: int) -> str:
    """Joue une partie. Retourne '1-0', '0-1' ou '1/2-1/2'."""
    board = chess.Board()
    plies = 0
    while not board.is_game_over(claim_draw=True) and plies < max_plies:
        eng = white_eng if board.turn == chess.WHITE else black_eng
        result = eng.play(board, limit)
        if result.move is None:
            break
        board.push(result.move)
        plies += 1
    outcome = board.outcome(claim_draw=True)
    if outcome is None:
        return "1/2-1/2"  # plies cap atteint -> nul technique
    if outcome.winner is True:
        return "1-0"
    if outcome.winner is False:
        return "0-1"
    return "1/2-1/2"


def main() -> int:
    parser = argparse.ArgumentParser(description="Match cross-engine UCI (sunfish/stockfish)")
    parser.add_argument("--white", default="sunfish", help="moteur des blancs")
    parser.add_argument("--black", default="stockfish", help="moteur des noirs")
    parser.add_argument("--games", type=int, default=2, help="nombre de parties")
    parser.add_argument("--movetime", type=int, default=100, help="temps par coup (ms)")
    parser.add_argument("--max-plies", type=int, default=300, help="cap demi-coups par partie")
    args = parser.parse_args()

    limit = chess.engine.Limit(time=args.movetime / 1000.0)

    print(f"=== CROSS-ENGINE MATCH ===")
    print(f"white={args.white} black={args.black} games={args.games} movetime={args.movetime}ms")

    try:
        white_eng = open_engine(args.white)
        black_eng = open_engine(args.black)
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERREUR setup moteur: {exc}", file=sys.stderr)
        return 2

    score = {"1-0": 0, "0-1": 0, "1/2-1/2": 0}
    try:
        for g in range(1, args.games + 1):
            res = play_game(white_eng, black_eng, limit, args.max_plies)
            score[res] += 1
            print(f"game {g}/{args.games}: {res}")
    finally:
        white_eng.quit()
        black_eng.quit()

    print("=== RESULT ===")
    print(f"{args.white} (white) wins : {score['1-0']}")
    print(f"{args.black} (black) wins : {score['0-1']}")
    print(f"draws                : {score['1/2-1/2']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
