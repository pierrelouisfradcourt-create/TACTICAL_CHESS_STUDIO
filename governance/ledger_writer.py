#!/usr/bin/env python3
"""ledger_writer.py — single-writer gardé pour IMPROVEMENT_LEDGER.yaml (IMP-194).

Tout écrivain du ledger DOIT passer par `guarded_write`, qui impose deux verrous :

  1. Gouvernance  : `governor.check(action)` — BLOCK -> GovernanceError.
  2. Concurrence  : verrou exclusif `<ledger>.writelock` (O_EXCL) + concurrence
                    optimiste par empreinte (sha256). Lock tenu OU empreinte changée
                    sous le writer -> ConcurrentWriteError.

Périmètre (à jour IMP-205) : dans l'arbre principal, TOUS les writers du ledger passent
désormais par `guarded_write` — `kaizen_loop.save_ledger` (IMP-194), `roadmap_to_ledger`
(inject/inject-staged) et les one-shots `ledger_patch_*` (IMP-205). `autopilot.close_imp`
n'écrit plus en direct : il délègue à `kaizen_loop close` en subprocess (IMP-203). L'invariant
« aucun write hors `guarded_write` » est gardé par `scripts/grep_guard_ledger.py` (AST).
Limite restante : les copies sous `worktrees/` ne sont pas scannées (un merge de worktree
peut réintroduire un bypass — relancer le garde sur le résultat). Voir docs/phase0/IMP-194_PLAN.md.
"""
from __future__ import annotations

import hashlib
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

# governor.py est dans le même dossier (governance/), pas un package : on ancre sur __file__.
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))
import governor  # noqa: E402

WRITELOCK_TTL_SECONDS = 60     # un dump ledger prend des ms ; >60s = writer crashé
_REPLACE_RETRIES = 5           # RT-194-6 : sharing violation Windows sur os.replace
_REPLACE_BACKOFF = 0.05

LEDGER_WRITE_ACTION: dict[str, str] = {"lane": "SAFE_AUTO", "mission": "ledger_write"}


class LedgerWriteError(Exception):
    """Base — écriture ledger refusée."""


class GovernanceError(LedgerWriteError):
    """governor.check a refusé l'action."""


class ConcurrentWriteError(LedgerWriteError):
    """Un autre writer tient le verrou, ou le fichier a changé sous le writer."""


# ── empreinte ─────────────────────────────────────────────────────────────────

def fingerprint(path: Path) -> str | None:
    """sha256 hex du contenu du ledger. None si absent."""
    try:
        return hashlib.sha256(Path(path).read_bytes()).hexdigest()
    except FileNotFoundError:
        return None


# ── liveness writelock (dupliqué d'IMP-193 ; refactor partagé = candidat futur) ─

def _pid_alive(pid: int | None) -> bool:
    if pid is None or pid <= 0:
        return False
    try:
        import psutil
    except ImportError:
        return True  # fail-closed : sans psutil on suppose vivant -> on ne vole pas
    try:
        return bool(psutil.pid_exists(pid))
    except Exception:
        return True


def _writelock_is_stale(writelock: Path) -> bool:
    """True si le writelock est orphelin : PID mort OU age > WRITELOCK_TTL_SECONDS."""
    try:
        content = writelock.read_text(encoding="utf-8").strip()
    except OSError:
        return False
    pid = None
    ts = None
    for tok in content.split():
        if tok.startswith("pid="):
            try:
                pid = int(tok[4:])
            except ValueError:
                pass
        elif tok.startswith("ts="):
            try:
                ts = float(tok[3:])
            except ValueError:
                pass
    now = time.time()
    if pid is not None and not _pid_alive(pid):
        return True
    if ts is not None and now - ts > WRITELOCK_TTL_SECONDS:
        return True
    if pid is not None or ts is not None:
        return False
    # contenu illisible : fallback mtime
    try:
        return now - writelock.stat().st_mtime > WRITELOCK_TTL_SECONDS
    except OSError:
        return False


def _acquire_writelock(writelock: Path) -> int | None:
    """O_EXCL ; auto-recycle un writelock stale. fd si acquis, None si tenu (vivant)."""
    for _ in range(3):
        try:
            return os.open(str(writelock), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            if not _writelock_is_stale(writelock):
                return None
            try:
                writelock.unlink()
            except FileNotFoundError:
                pass
            continue
    return None


def _atomic_replace(tmp: Path, dest: Path) -> None:
    """os.replace avec retry borné (RT-194-6 : sharing violation Windows)."""
    last: Exception | None = None
    for _ in range(_REPLACE_RETRIES):
        try:
            os.replace(str(tmp), str(dest))
            return
        except PermissionError as exc:  # destination ouverte par un lecteur concurrent
            last = exc
            time.sleep(_REPLACE_BACKOFF)
    raise LedgerWriteError(f"os.replace a échoué après {_REPLACE_RETRIES} essais: {last}")


# ── writer gardé ────────────────────────────────────────────────────────────

def guarded_write(
    path: str | Path,
    content: str,
    *,
    action: dict[str, Any] | None = None,
    expected_fingerprint: str | None = None,
) -> None:
    """Écrit `content` dans le ledger sous double garde gouvernance + concurrence.

    - `action` : dict gouverné (défaut LEDGER_WRITE_ACTION). Mission FORBIDDEN ou lane
      inconnue -> GovernanceError.
    - `expected_fingerprint` : empreinte attendue du fichier AVANT écriture. Si fournie et
      différente de l'empreinte courante -> ConcurrentWriteError (le fichier a bougé).

    Écriture atomique : tmp dans le MÊME répertoire (même volume) + os.replace.
    Mode texte UTF-8 (politique newline identique à open("w") -> CRLF préservé sous Windows).
    """
    path = Path(path)
    act = LEDGER_WRITE_ACTION if action is None else action

    # 1. Gouvernance.
    decision = governor.check(act)
    if not decision.allowed:
        raise GovernanceError(f"ledger write blocked: {decision.reason}")

    # 2. Verrou exclusif.
    writelock = path.with_name(path.name + ".writelock")
    fd = _acquire_writelock(writelock)
    if fd is None:
        raise ConcurrentWriteError(f"writelock held by a live writer: {writelock}")
    try:
        os.write(fd, f"pid={os.getpid()} ts={time.time()} iso={datetime.now().isoformat()}\n".encode("utf-8"))
        os.close(fd)
        fd = None

        # 3. Concurrence optimiste.
        if expected_fingerprint is not None:
            current = fingerprint(path)
            if current != expected_fingerprint:
                raise ConcurrentWriteError(
                    f"ledger changed under writer (expected {expected_fingerprint!r}, got {current!r})"
                )

        # 4. Écriture atomique (tmp même dossier -> même volume).
        tmp = path.with_name(f"{path.name}.{os.getpid()}.tmp")
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(content)
        _atomic_replace(tmp, path)
    finally:
        if fd is not None:
            os.close(fd)
        try:
            writelock.unlink()
        except FileNotFoundError:
            pass
