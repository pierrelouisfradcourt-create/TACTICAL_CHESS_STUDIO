#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lanceur de jeu humain unifie pour Tactical Chess Studio.

Delegue a tools/sunfish/tools/fancy.py (interface terminale Unicode) en
forcant l'encodage UTF-8 (sinon la console Windows cp1252 crashe sur les
pieces Unicode) et en resolvant les chemins moteurs.

Usage :
  python tools/play.py sunfish               # humain vs Sunfish
  python tools/play.py stockfish             # humain vs Stockfish
  python tools/play.py rocky                 # humain vs Rocky (via shim UCI, IMP-232)
  python tools/play.py stockfish --movetime 1000

Rocky est jouable via tools/rocky_uci.py (adaptateur UCI wrappant play_fen).
"""
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FANCY = REPO_ROOT / "tools" / "sunfish" / "tools" / "fancy.py"
SUNFISH_PY = REPO_ROOT / "tools" / "sunfish" / "sunfish.py"
ROCKY_UCI = REPO_ROOT / "tools" / "rocky_uci.py"
DEFAULT_STOCKFISH = REPO_ROOT / "tools" / "vendor_tools" / "stockfish" / "stockfish-windows-x86-64-avx2.exe"

USAGE = "usage: python tools/play.py <sunfish|stockfish|rocky> [extra fancy.py args]"


def engine_cmd(name: str) -> str:
    key = name.lower()
    if key == "sunfish":
        if not SUNFISH_PY.exists():
            sys.exit(f"sunfish absent: {SUNFISH_PY}")
        return f"{sys.executable} {SUNFISH_PY}"
    if key == "stockfish":
        sf = os.environ.get("TCS_STOCKFISH_PATH", str(DEFAULT_STOCKFISH))
        if not Path(sf).exists():
            sys.exit(f"stockfish absent: {sf}")
        return sf
    if key == "rocky":
        if not ROCKY_UCI.exists():
            sys.exit(f"rocky_uci absent: {ROCKY_UCI}")
        return f"{sys.executable} {ROCKY_UCI}"
    sys.exit(f"moteur inconnu: {name!r}\n{USAGE}")


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(USAGE)
        return 0 if len(sys.argv) >= 2 else 2

    if not FANCY.exists():
        sys.exit(f"fancy.py absent: {FANCY} (git clone sunfish manquant ?)")

    name = sys.argv[1]
    extra = sys.argv[2:]
    cmd = engine_cmd(name)

    # Defaut raisonnable si l'utilisateur n'impose pas de cadence.
    if not any(a in ("-movetime", "-nodes") for a in extra):
        extra = ["-movetime", "1000", *extra]

    child_env = dict(os.environ, PYTHONIOENCODING="utf-8")
    argv = [sys.executable, str(FANCY), "-cmd", cmd, *extra]
    print(f"Lancement: humain vs {name} (Ctrl+C pour quitter)")
    return subprocess.call(argv, env=child_env)


if __name__ == "__main__":
    raise SystemExit(main())
