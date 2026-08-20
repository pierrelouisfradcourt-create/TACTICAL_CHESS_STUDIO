#!/usr/bin/env python3
"""Jouer une partie interactive contre Rocky (moteur Rust).

Le plateau, la legalite des coups et la detection de fin de partie
(mat / pat / nulles) sont geres par python-chess. Rocky n'est consulte
que pour SES coups, via la commande CLI `play_fen "<FEN>"` du binaire Rust.

Usage :
    python scripts/rocky_play.py [--color white|black] [--time-ms 2000]
                                 [--bin <chemin>] [--fen "<FEN depart>"]

En partie, au prompt tu peux taper :
    - un coup en UCI (e2e4, g1f3, e7e8q) ou en SAN (e4, Nf3, O-O, exd5)
    - hint   : demande a Rocky le meilleur coup pour TON camp
    - board  : reaffiche le plateau
    - fen    : affiche la FEN courante
    - undo   : annule le dernier aller-retour (ton coup + celui de Rocky)
    - moves  : liste tes coups legaux
    - quit   : abandonne et quitte
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

try:
    import chess
except ImportError:
    sys.exit(
        "python-chess est requis. Installe-le dans le venv :\n"
        "    .venv312/Scripts/python.exe -m pip install chess"
    )

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BIN = REPO_ROOT / "target" / "release" / "tactical_chess_pure_lab.exe"
# Marge au-dela du temps de reflexion avant de considerer Rocky bloque.
SEARCH_TIMEOUT_MARGIN_MS = 15_000


def rocky_best_move(binary: Path, fen: str, time_ms: int) -> dict:
    """Interroge Rocky sur la position FEN. Retourne le dict JSON de play_fen.

    Cle "move" (UCI) en cas de succes, "error" sinon. Leve RuntimeError si le
    process echoue ou ne produit aucun JSON exploitable.
    """
    env = os.environ.copy()
    env["TCS_MOVE_TIME_MS"] = str(time_ms)
    timeout_s = (time_ms + SEARCH_TIMEOUT_MARGIN_MS) / 1000.0
    try:
        proc = subprocess.run(
            [str(binary), "play_fen", fen],
            capture_output=True,
            text=True,
            encoding="utf-8",
            env=env,
            timeout=timeout_s,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f"Rocky n'a pas repondu en {timeout_s:.0f}s") from exc

    # play_fen imprime une ligne JSON ; on prend la derniere ligne JSON valide
    # (robustesse si un eventuel log de debug precede).
    payload = None
    for line in reversed(proc.stdout.splitlines()):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                payload = json.loads(line)
                break
            except json.JSONDecodeError:
                continue
    if payload is None:
        raise RuntimeError(
            f"Sortie Rocky illisible (code {proc.returncode}).\n"
            f"stdout: {proc.stdout[-400:]!r}\nstderr: {proc.stderr[-400:]!r}"
        )
    return payload


def announce_result(board: chess.Board) -> None:
    outcome = board.outcome(claim_draw=True)
    print("\n=== Partie terminee ===")
    if outcome is None:
        print("Etat final indetermine.")
        return
    if outcome.winner is chess.WHITE:
        print("Resultat : 1-0 (les Blancs gagnent)")
    elif outcome.winner is chess.BLACK:
        print("Resultat : 0-1 (les Noirs gagnent)")
    else:
        print("Resultat : 1/2-1/2 (nulle)")
    reasons = {
        chess.Termination.CHECKMATE: "echec et mat",
        chess.Termination.STALEMATE: "pat",
        chess.Termination.INSUFFICIENT_MATERIAL: "materiel insuffisant",
        chess.Termination.SEVENTYFIVE_MOVES: "regle des 75 coups",
        chess.Termination.FIVEFOLD_REPETITION: "quintuple repetition",
        chess.Termination.FIFTY_MOVES: "regle des 50 coups",
        chess.Termination.THREEFOLD_REPETITION: "triple repetition",
    }
    print(f"Cause  : {reasons.get(outcome.termination, outcome.termination.name)}")


def show_board(board: chess.Board, human_color: chess.Color) -> None:
    # Plateau ASCII oriente du cote du joueur (majuscule=Blancs, minuscule=Noirs).
    # ASCII volontaire : robuste sur tout terminal Windows (pas de glyphes unicode).
    print()
    ranks = range(7, -1, -1) if human_color == chess.WHITE else range(8)
    files = range(8) if human_color == chess.WHITE else range(7, -1, -1)
    for r in ranks:
        cells = []
        for f in files:
            piece = board.piece_at(chess.square(f, r))
            cells.append(piece.symbol() if piece else ".")
        print(f"{r + 1}  " + " ".join(cells))
    file_labels = "abcdefgh" if human_color == chess.WHITE else "hgfedcba"
    print("   " + " ".join(file_labels))
    side = "Blancs" if board.turn == chess.WHITE else "Noirs"
    check = " (echec !)" if board.is_check() else ""
    print(f"Trait aux {side}{check}  |  coup n.{board.fullmove_number}")


def parse_human_move(board: chess.Board, raw: str) -> chess.Move | None:
    """Accepte UCI ou SAN. Retourne un Move legal, ou None si invalide/illegal."""
    for parser in (board.parse_uci, board.parse_san):
        try:
            move = parser(raw)
        except (chess.InvalidMoveError, chess.IllegalMoveError, chess.AmbiguousMoveError, ValueError):
            continue
        if move in board.legal_moves:
            return move
    return None


def human_turn(board: chess.Board, binary: Path, time_ms: int, human_color: chess.Color) -> bool:
    """Gere le tour du joueur. Retourne False si le joueur veut quitter."""
    show_board(board, human_color)
    while True:
        try:
            raw = input("Ton coup > ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return False
        if not raw:
            continue
        cmd = raw.lower()
        if cmd in ("quit", "q", "exit"):
            return False
        if cmd == "board":
            show_board(board, human_color)
            continue
        if cmd == "fen":
            print(board.fen())
            continue
        if cmd == "moves":
            print(" ".join(sorted(board.san(m) for m in board.legal_moves)))
            continue
        if cmd == "undo":
            if len(board.move_stack) >= 2:
                board.pop()
                board.pop()
                print("Dernier aller-retour annule.")
                show_board(board, human_color)
            elif board.move_stack:
                board.pop()
                print("Dernier coup annule.")
                show_board(board, human_color)
            else:
                print("Rien a annuler.")
            continue
        if cmd == "hint":
            try:
                res = rocky_best_move(binary, board.fen(), time_ms)
            except RuntimeError as exc:
                print(f"[hint indisponible] {exc}")
                continue
            mv = res.get("move")
            if mv:
                try:
                    print(f"Suggestion Rocky : {board.san(chess.Move.from_uci(mv))} "
                          f"(score={res.get('score')}, depth={res.get('depth')})")
                except ValueError:
                    print(f"Suggestion Rocky : {mv}")
            else:
                print(f"[hint] {res.get('error', 'pas de coup')}")
            continue

        move = parse_human_move(board, raw)
        if move is None:
            print("Coup invalide ou illegal. (UCI: e2e4 / SAN: Nf3 / 'moves' pour la liste)")
            continue
        board.push(move)
        return True


def rocky_turn(board: chess.Board, binary: Path, time_ms: int) -> bool:
    """Fait jouer Rocky. Retourne False sur erreur fatale."""
    print("\nRocky reflechit...")
    try:
        res = rocky_best_move(binary, board.fen(), time_ms)
    except RuntimeError as exc:
        print(f"[ERREUR] {exc}")
        return False
    if "error" in res:
        # Ne devrait pas arriver : on n'appelle Rocky que si la partie n'est pas finie.
        print(f"[ERREUR] Rocky : {res['error']}")
        return False
    uci = res.get("move", "")
    try:
        move = chess.Move.from_uci(uci)
    except ValueError:
        print(f"[ERREUR] coup Rocky illisible : {uci!r}")
        return False
    if move not in board.legal_moves:
        print(f"[ERREUR] Rocky a propose un coup illegal ({uci}) sur {board.fen()}")
        return False
    san = board.san(move)
    board.push(move)
    print(f"Rocky joue : {san}   (score={res.get('score')}, depth={res.get('depth')})")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Jouer contre Rocky (moteur Rust).")
    parser.add_argument("--color", choices=["white", "black"], default="white",
                        help="Ta couleur (defaut: white).")
    parser.add_argument("--time-ms", type=int, default=2000,
                        help="Temps de reflexion de Rocky par coup, en ms (defaut: 2000). "
                             "Aussi pris depuis TCS_MOVE_TIME_MS si --time-ms absent.")
    parser.add_argument("--bin", default=str(DEFAULT_BIN),
                        help=f"Chemin du binaire Rocky (defaut: {DEFAULT_BIN}).")
    parser.add_argument("--fen", default=None,
                        help="Position de depart (defaut: position initiale).")
    args = parser.parse_args()

    binary = Path(args.bin)
    if not binary.exists():
        print(f"Binaire introuvable : {binary}\n"
              f"Compile d'abord :  cargo build --release", file=sys.stderr)
        return 1

    # --time-ms l'emporte ; sinon on respecte TCS_MOVE_TIME_MS de l'environnement.
    time_ms = args.time_ms
    if "--time-ms" not in sys.argv and os.environ.get("TCS_MOVE_TIME_MS"):
        try:
            time_ms = int(os.environ["TCS_MOVE_TIME_MS"])
        except ValueError:
            pass

    try:
        board = chess.Board(args.fen) if args.fen else chess.Board()
    except ValueError as exc:
        print(f"FEN invalide : {exc}", file=sys.stderr)
        return 1

    human_color = chess.WHITE if args.color == "white" else chess.BLACK
    print("=== Rocky — partie interactive ===")
    print(f"Tu joues les {'Blancs' if human_color == chess.WHITE else 'Noirs'} | "
          f"Rocky reflechit {time_ms} ms/coup | binaire: {binary.name}")
    print("Commandes : hint / board / fen / moves / undo / quit\n")

    while not board.is_game_over(claim_draw=True):
        if board.turn == human_color:
            if not human_turn(board, binary, time_ms, human_color):
                print("Tu as quitte la partie.")
                return 0
        else:
            if not rocky_turn(board, binary, time_ms):
                return 1

    show_board(board, human_color)
    announce_result(board)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
