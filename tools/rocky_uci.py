#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Adaptateur UCI minimal pour Rocky (IMP-232, chemin leger).

Rocky n'a pas de boucle serveur UCI native : il expose seulement la commande
CLI `play_fen "<FEN>" "<moves>"` qui retourne un JSON {move, score, depth, ...}.
Ce shim Python parle UCI sur stdin/stdout et delegue le choix du coup au
binaire Rocky, sans toucher a src/.

  position -> reconstruit le board en memoire (python-chess)
  go       -> board.fen() -> appel binaire play_fen -> parse .move -> bestmove

Usage (jamais lance a la main en general — pilote par une GUI/un harnais) :
  python tools/rocky_uci.py
  fancy.py -cmd "python tools/rocky_uci.py"
  cross_engine_match.py --white rocky --black sunfish

Env :
  TCS_ROCKY_BIN       chemin du binaire Rocky (defaut: target/release/tactical_chess_pure_lab.exe)
  TCS_ROCKY_UCI_DEBUG si defini, trace les echanges sur stderr
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import chess

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BIN = REPO_ROOT / "target" / "release" / "tactical_chess_pure_lab.exe"

ENGINE_NAME = "Rocky"
DEBUG = bool(os.environ.get("TCS_ROCKY_UCI_DEBUG"))
# Au-dela de ce seuil, le score Rocky designe un mat (play_fen ~899990+).
MATE_THRESHOLD = 100_000


def log(msg: str) -> None:
    """Diagnostic vers stderr (jamais stdout : reserve au protocole UCI)."""
    print(f"[rocky_uci] {msg}", file=sys.stderr, flush=True)


def dbg(msg: str) -> None:
    if DEBUG:
        log(msg)


def send(line: str) -> None:
    """Reponse protocole vers stdout, flush explicite (sinon la GUI bloque)."""
    print(line, flush=True)
    dbg(f">> {line}")


def resolve_bin() -> Path:
    return Path(os.environ.get("TCS_ROCKY_BIN", str(DEFAULT_BIN)))


def parse_position(tokens: list[str]) -> chess.Board:
    """Reconstruit le board depuis une commande `position ...`.

    Formats : `position startpos [moves ...]`
              `position fen <6 champs> [moves ...]`
    """
    board = chess.Board()  # startpos par defaut
    if len(tokens) < 2:
        return board

    idx = 1
    if tokens[1] == "startpos":
        idx = 2
    elif tokens[1] == "fen":
        # FEN = 6 champs apres "fen"
        fen_fields = tokens[2:8]
        if len(fen_fields) < 6:
            log(f"FEN incomplete, fallback startpos: {' '.join(tokens)}")
        else:
            try:
                board = chess.Board(" ".join(fen_fields))
            except ValueError as exc:
                log(f"FEN invalide ({exc}), fallback startpos")
                board = chess.Board()
        idx = 8
    else:
        log(f"position non reconnue, fallback startpos: {' '.join(tokens)}")
        return board

    # Coups eventuels apres "moves"
    if idx < len(tokens) and tokens[idx] == "moves":
        for uci in tokens[idx + 1:]:
            try:
                board.push_uci(uci)
            except (ValueError, AssertionError) as exc:
                log(f"coup historique illegal ignore {uci!r}: {exc}")
                break
    return board


def parse_movetime_ms(tokens: list[str]) -> int:
    """Extrait un budget temps (ms) d'une commande `go ...`. Defaut 1000."""
    def val_after(key: str):
        if key in tokens:
            i = tokens.index(key)
            if i + 1 < len(tokens):
                try:
                    return int(tokens[i + 1])
                except ValueError:
                    return None
        return None

    mt = val_after("movetime")
    if mt is not None:
        return max(1, mt)

    # Cadence a l'horloge : alloue une fraction du temps restant.
    wtime = val_after("wtime")
    btime = val_after("btime")
    # On ne connait pas la couleur au trait ici de facon fiable cote tokens ;
    # le board (passe separement) tranche. Approx : min des deux si presents.
    clock = None
    if wtime is not None and btime is not None:
        clock = min(wtime, btime)
    elif wtime is not None:
        clock = wtime
    elif btime is not None:
        clock = btime
    if clock is not None:
        return max(50, clock // 30)

    return 1000  # defaut raisonnable


def ask_rocky(board: chess.Board, movetime_ms: int) -> dict | None:
    """Appelle le binaire Rocky play_fen sur la position courante.

    Retourne {move, score, depth} (move = UCI valide pour `board`),
    ou None si echec/illegal.
    """
    binary = resolve_bin()
    if not binary.exists():
        log(f"binaire Rocky introuvable: {binary}")
        return None

    fen = board.fen()
    env = dict(os.environ, TCS_MOVE_TIME_MS=str(movetime_ms))
    # play_fen "<FEN>" "<moves>" — on passe la FEN resolue, moves vide.
    cmd = [str(binary), "play_fen", fen, ""]
    timeout_s = movetime_ms / 1000.0 + 10.0

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            env=env,
            timeout=timeout_s,
        )
    except subprocess.TimeoutExpired:
        log(f"play_fen timeout ({timeout_s:.1f}s) sur {fen}")
        return None
    except OSError as exc:
        log(f"play_fen lancement echoue: {exc}")
        return None

    if proc.returncode != 0:
        log(f"play_fen exit={proc.returncode} stderr={proc.stderr.strip()[:200]}")
        # On tente quand meme de parser stdout : Rocky peut sortir un coup malgre tout.

    payload = extract_payload(proc.stdout)
    if payload is None:
        log(f"aucun coup parse depuis stdout: {proc.stdout.strip()[:200]}")
        return None

    move_uci = payload["move"]
    # Validation : le coup doit etre legal pour le board reconstruit.
    try:
        move = board.parse_uci(move_uci)
    except (ValueError, AssertionError) as exc:
        log(f"coup Rocky {move_uci!r} non parsable/illegal: {exc}")
        return None
    if move not in board.legal_moves:
        log(f"coup Rocky {move_uci!r} illegal sur {fen}")
        return None
    return {
        "move": move.uci(),
        "score": payload.get("score", 0),
        "depth": payload.get("depth", 1),
    }


def extract_payload(stdout: str) -> dict | None:
    """Trouve le dernier JSON {.. "move": ..} valide dans stdout (robuste au bruit)."""
    chosen = None
    for line in stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            if "error" in payload and "move" not in payload:
                log(f"play_fen error: {payload['error']}")
                continue
            mv = payload.get("move")
            if isinstance(mv, str) and mv and mv != "?":
                chosen = payload  # garde le dernier JSON valide
    return chosen


def fallback_move(board: chess.Board) -> str | None:
    """Filet de securite : premier coup legal, pour ne pas crasher le harnais."""
    for move in board.legal_moves:
        return move.uci()
    return None


def emit_info(move: str, score: int, depth: int) -> None:
    """Ligne info UCI : indispensable, des GUIs (fancy.py) lisent info[pv]."""
    if abs(score) >= MATE_THRESHOLD:
        mate_n = 1 if score > 0 else -1
        send(f"info depth {depth} score mate {mate_n} pv {move}")
    else:
        send(f"info depth {depth} score cp {score} pv {move}")


def handle_go(board: chess.Board, tokens: list[str]) -> None:
    if board.is_game_over(claim_draw=True):
        send("bestmove (none)")
        return

    movetime_ms = parse_movetime_ms(tokens)
    result = ask_rocky(board, movetime_ms)
    if result is None:
        fb = fallback_move(board)
        if fb is None:
            send("bestmove (none)")
            return
        log(f"FALLBACK coup legal {fb} (Rocky n'a pas fourni de coup valide)")
        result = {"move": fb, "score": 0, "depth": 1}

    emit_info(result["move"], int(result["score"]), int(result["depth"]))
    send(f"bestmove {result['move']}")


def main() -> int:
    board = chess.Board()
    log(f"demarre — binaire={resolve_bin()}")

    for raw in sys.stdin:
        line = raw.strip()
        if not line:
            continue
        dbg(f"<< {line}")
        tokens = line.split()
        cmd = tokens[0]

        if cmd == "uci":
            send(f"id name {ENGINE_NAME}")
            send("id author Tactical Chess Studio")
            send("uciok")
        elif cmd == "isready":
            send("readyok")
        elif cmd == "ucinewgame":
            board = chess.Board()
        elif cmd == "position":
            board = parse_position(tokens)
        elif cmd == "go":
            handle_go(board, tokens)
        elif cmd == "stop":
            # Recherche synchrone : rien a stopper. Ignore.
            pass
        elif cmd == "quit":
            break
        else:
            dbg(f"commande ignoree: {line}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
