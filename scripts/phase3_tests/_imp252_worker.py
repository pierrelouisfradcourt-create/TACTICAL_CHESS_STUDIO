#!/usr/bin/env python3
"""Worker autonome pour test_imp252_two_process_lock.py (IMP-252).

Lancé en VRAI sous-processus (subprocess) par le test, jamais importé côté test.
Deux modes :

  hold  <ledger> <ready_file> <release_file> [timeout_s]
      Acquiert le writelock EXACTEMENT comme guarded_write (O_EXCL + pid/ts),
      signale <ready_file>, tient le verrou jusqu'à apparition de <release_file>,
      puis relâche (unlink). Simule le "process 1" qui détient le verrou.

  race  <ledger> <content> <result_file> <go_file> [timeout_s]
      Attend <go_file> puis tente guarded_write(<ledger>, <content>).
      Écrit l'issue dans <result_file> : "OK" | "CONCURRENT" | "ERR:<Type>:<msg>".
      Simule un "process concurrent" dans une course.

Codes de sortie : 0 = nominal, 2 = acquisition impossible, 3 = timeout d'attente.
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime
from pathlib import Path

# ledger_writer vit dans governance/ (pas un package) : ancrage sur __file__.
_ROOT = Path(__file__).resolve().parents[2]
_GOV = _ROOT / "governance"
if str(_GOV) not in sys.path:
    sys.path.insert(0, str(_GOV))
import ledger_writer as lw  # noqa: E402


def _wait_for(flag: Path, timeout_s: float) -> bool:
    """True si <flag> apparaît avant timeout, False sinon."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if flag.exists():
            return True
        time.sleep(0.01)
    return False


def _mode_hold(ledger: Path, ready: Path, release: Path, timeout_s: float) -> int:
    writelock = ledger.with_name(ledger.name + ".writelock")
    fd = lw._acquire_writelock(writelock)
    if fd is None:
        return 2  # quelqu'un tient déjà le verrou — anormal pour le premier writer
    # Contenu identique à guarded_write (l.174) : pid vivant + ts frais.
    os.write(fd, f"pid={os.getpid()} ts={time.time()} iso={datetime.now().isoformat()}\n".encode("utf-8"))
    os.close(fd)
    ready.write_text("held", encoding="utf-8")  # handshake : le verrou est pris
    got_release = _wait_for(release, timeout_s)
    try:
        writelock.unlink()
    except FileNotFoundError:
        pass
    return 0 if got_release else 3


def _mode_race(ledger: Path, content: str, result: Path, go: Path, timeout_s: float) -> int:
    if not _wait_for(go, timeout_s):
        result.write_text("ERR:Timeout:no go signal", encoding="utf-8")
        return 3
    t_enter = time.time()
    try:
        lw.guarded_write(ledger, content)
        outcome = "OK"
    except lw.ConcurrentWriteError:
        outcome = "CONCURRENT"
    except Exception as exc:  # noqa: BLE001 — on veut TOUTE autre issue tracée
        outcome = f"ERR:{type(exc).__name__}:{exc}"
    t_exit = time.time()
    # 1er token = issue (parsé par le test) ; enter/exit = preuve du chevauchement temporel.
    result.write_text(f"{outcome} enter={t_enter:.6f} exit={t_exit:.6f}", encoding="utf-8")
    return 0


def main(argv: list[str]) -> int:
    mode = argv[1] if len(argv) > 1 else ""
    if mode == "hold":
        ledger, ready, release = map(Path, argv[2:5])
        timeout_s = float(argv[5]) if len(argv) > 5 else 30.0
        return _mode_hold(ledger, ready, release, timeout_s)
    if mode == "race":
        ledger = Path(argv[2])
        content = argv[3]
        result, go = Path(argv[4]), Path(argv[5])
        timeout_s = float(argv[6]) if len(argv) > 6 else 30.0
        return _mode_race(ledger, content, result, go, timeout_s)
    sys.stderr.write(f"mode inconnu: {mode!r}\n")
    return 64


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
