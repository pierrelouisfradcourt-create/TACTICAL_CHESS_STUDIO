"""
sunfish_vs_rocky.py — 20 parties sunfish vs Rocky (heuristic)

Usage:
    python lab/sunfish_vs_rocky.py [--games 20] [--movetime 0.1]

Sunfish est lancé comme moteur UCI depuis lab/ (chemin local de tools/uci.py).
Rocky est piloté via play_fen CLI (read-only, aucune modification du moteur).
"""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys

try:
    import chess
    import chess.engine
except ImportError:
    print("[ERROR] python-chess manquant : pip install chess")
    sys.exit(1)

LAB_DIR = pathlib.Path(__file__).resolve().parent
REPO_ROOT = LAB_DIR.parent
ROCKY_BIN = REPO_ROOT / "target" / "release" / "tactical_chess_pure_lab.exe"
SUNFISH_PY = LAB_DIR / "sunfish.py"
MAX_PLIES = 200


def rocky_move(board: chess.Board, initial_fen: str) -> chess.Move | None:
    moves = " ".join(m.uci() for m in board.move_stack)
    try:
        proc = subprocess.run(
            [str(ROCKY_BIN), "play_fen", initial_fen, moves],
            capture_output=True, text=True, timeout=10
        )
        data = json.loads(proc.stdout.strip())
        move = chess.Move.from_uci(data["move"])
        return move if move in board.legal_moves else None
    except Exception as exc:
        print(f"  [WARN] rocky_move échoué : {exc}")
        return None


def play_game(
    sunfish: chess.engine.SimpleEngine,
    sunfish_color: chess.Color,
    movetime: float,
) -> tuple[str, int]:
    """Retourne (résultat, nb_plies)."""
    board = chess.Board()
    initial_fen = board.fen()
    ply = 0

    while not board.is_game_over(claim_draw=True) and ply < MAX_PLIES:
        if board.turn == sunfish_color:
            result = sunfish.play(board, chess.engine.Limit(time=movetime))
            move = result.move
        else:
            move = rocky_move(board, initial_fen)

        if move is None or move not in board.legal_moves:
            # coup illégal ou timeout → nulle forcée
            return "1/2-1/2", ply

        board.push(move)
        ply += 1

    outcome = board.outcome(claim_draw=True)
    if outcome is None:
        return "1/2-1/2", ply
    if outcome.winner == chess.WHITE:
        return "1-0", ply
    if outcome.winner == chess.BLACK:
        return "0-1", ply
    return "1/2-1/2", ply


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--games", type=int, default=20)
    parser.add_argument("--movetime", type=float, default=0.1,
                        help="Temps sunfish par coup (secondes)")
    args = parser.parse_args()

    if not ROCKY_BIN.exists():
        print(f"[ERROR] Rocky binaire introuvable : {ROCKY_BIN}")
        sys.exit(1)
    if not SUNFISH_PY.exists():
        print(f"[ERROR] sunfish.py introuvable : {SUNFISH_PY}")
        sys.exit(1)

    print(f"[INFO] Lancement de sunfish depuis {LAB_DIR}")
    sunfish = chess.engine.SimpleEngine.popen_uci(
        [sys.executable, str(SUNFISH_PY)],
        cwd=str(LAB_DIR),
    )

    results: list[tuple[str, chess.Color]] = []
    plies_list: list[int] = []

    print(f"[INFO] {args.games} parties sunfish vs Rocky (heuristic)\n")
    try:
        for i in range(args.games):
            sunfish_color = chess.WHITE if i % 2 == 0 else chess.BLACK
            color_label = "W" if sunfish_color == chess.WHITE else "B"
            result_str, ply = play_game(sunfish, sunfish_color, args.movetime)
            results.append((result_str, sunfish_color))
            plies_list.append(ply)
            moves_count = ply // 2
            print(f"  Partie {i+1:2d}: sunfish={color_label}  {result_str}  ({moves_count} coups)")
    finally:
        sunfish.quit()

    n = len(results)
    sunfish_wins = sum(
        1 for r, c in results
        if (r == "1-0" and c == chess.WHITE) or (r == "0-1" and c == chess.BLACK)
    )
    rocky_wins = sum(
        1 for r, c in results
        if (r == "1-0" and c == chess.BLACK) or (r == "0-1" and c == chess.WHITE)
    )
    draws = sum(1 for r, _ in results if r == "1/2-1/2")
    draw_rate = draws / n if n else 0.0
    avg_moves = (sum(plies_list) / n / 2) if n else 0.0

    print("\n" + "=" * 38)
    print("  RAPPORT  sunfish vs Rocky (heuristic)")
    print("=" * 38)
    print(f"  Parties jouées    : {n}")
    print(f"  Sunfish wins      : {sunfish_wins}")
    print(f"  Rocky wins        : {rocky_wins}")
    print(f"  Draws             : {draws}")
    print(f"  Draw rate         : {draw_rate:.1%}")
    print(f"  Moy. coups/partie : {avg_moves:.1f}")
    print("=" * 38)


if __name__ == "__main__":
    main()
