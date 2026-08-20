#!/usr/bin/env python3
"""dispatch_bridge.py — pont observe→agir (IMP-181).

Lit `lab/reports/director_schedule.json` (produit par scripts/director.py),
prend le PREMIER IMP recommandé et lance
`lab/chains/kaizen_autoloop.py --imp-id <id> --lane SAFE_AUTO` — mais
uniquement si les services studio requis sont UP.

Anti-Skynet : **dry-run par défaut**. Sans `--execute`, le bridge se contente
d'afficher ce qu'il LANCERAIT (plan) et n'exécute rien. L'exécution réelle exige
le flag explicite `--execute` — sign-off opérateur, pas d'auto-activation
silencieuse depuis un daemon. Read-only sur le ledger côté bridge : la clôture
d'IMP reste le travail de kaizen_autoloop/kaizen_loop.

Tolérance de schéma : le fichier schedule peut exposer la liste sous la clé
`recommended` (schéma historique) ou `recommended_imps` (director v1). Les deux
sont acceptés.

Usage :
    python scripts/dispatch_bridge.py                 # plan (dry-run), n'exécute rien
    python scripts/dispatch_bridge.py --execute       # lance kaizen_autoloop sur le 1er IMP
    python scripts/dispatch_bridge.py --schedule-path lab/reports/director_schedule.json
    python scripts/dispatch_bridge.py --require claude_proxy,lmstudio

Codes de sortie :
    0  plan affiché, ou no-op légitime (rien à dispatcher / services down), ou
       dispatch réussi.
    1  dispatch tenté (--execute) mais kaizen_autoloop a échoué / timeout.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import socket
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent

SCHEDULE_PATH   = REPO_ROOT / "lab/reports/director_schedule.json"
KAIZEN_AUTOLOOP = REPO_ROOT / "lab/chains/kaizen_autoloop.py"
PYTHON_EXE      = sys.executable
LOCK_PATH       = REPO_ROOT / "lab/.autoloop.lock"

# Services studio (nom -> port) — alignés sur director.py / healthcheck.py.
SERVICE_PORTS = {
    "claude_proxy":     8765,
    "canvas_gateway":   8766,
    "openclaw_gateway": 18789,
    "lmstudio":         1234,
    "autopilot":        7331,
}
# Services qui DOIVENT être UP pour qu'un dispatch ait un sens : kaizen_autoloop
# exécute via le claude_proxy local et génère le charter via LM Studio.
DEFAULT_REQUIRED = ("claude_proxy", "lmstudio")

CONNECT_TIMEOUT_S = 2
# kaizen_autoloop enchaîne charter + exécution Claude Code + validation : long.
DISPATCH_TIMEOUT_S = 1800

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("dispatch_bridge")


# ---------------------------------------------------------------------------
# Lock inter-process (lab/.autoloop.lock) — un seul autoloop/bridge à la fois
# ---------------------------------------------------------------------------

def acquire_lock(lock_path: Path = LOCK_PATH) -> bool:
    """Crée le lock atomiquement (O_EXCL). False si déjà détenu (autre process)."""
    try:
        fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return False
    try:
        os.write(fd, f"pid={os.getpid()} {datetime.now().isoformat()}\n".encode("utf-8"))
    finally:
        os.close(fd)
    return True


def release_lock(lock_path: Path = LOCK_PATH) -> None:
    """Supprime le lock. No-op s'il a déjà disparu."""
    try:
        lock_path.unlink()
    except FileNotFoundError:
        pass


# ---------------------------------------------------------------------------
# Lecture du schedule (défensive — jamais de crash sur fichier absent/corrompu)
# ---------------------------------------------------------------------------

def load_schedule(path: Path = SCHEDULE_PATH) -> dict[str, Any]:
    """Charge le schedule. Fichier absent / JSON invalide => available:false."""
    if not path.exists():
        return {"available": False, "reason": "schedule absent"}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        return {"available": False, "reason": f"schedule illisible: {exc}"}
    if not isinstance(data, dict):
        return {"available": False, "reason": "schedule n'est pas un objet JSON"}
    data.setdefault("available", True)
    return data


def first_recommended(schedule: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Premier IMP recommandé. Tolère `recommended` ou `recommended_imps`.

    Retourne None si la liste est absente, vide, ou si le premier élément n'a
    pas d'`id` exploitable.
    """
    rec = schedule.get("recommended")
    if rec is None:
        rec = schedule.get("recommended_imps")
    if not isinstance(rec, list) or not rec:
        return None
    first = rec[0]
    if not isinstance(first, dict) or not first.get("id"):
        return None
    return first


# ---------------------------------------------------------------------------
# Probe services (TCP non bloquant, read-only)
# ---------------------------------------------------------------------------

def _port_up(port: int, timeout: float = CONNECT_TIMEOUT_S) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except OSError:
        return False


def probe_services(required: tuple[str, ...] = DEFAULT_REQUIRED) -> list[dict[str, Any]]:
    """Probe chaque service requis. Un nom inconnu est reporté up:false (fail-closed)."""
    results: list[dict[str, Any]] = []
    for name in required:
        port = SERVICE_PORTS.get(name)
        up = _port_up(port) if port is not None else False
        results.append({"name": name, "port": port, "up": up})
    return results


def services_all_up(probe: list[dict[str, Any]]) -> bool:
    return bool(probe) and all(s["up"] for s in probe)


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

def build_command(imp_id: str, execute: bool) -> list[str]:
    """Commande kaizen_autoloop pour cibler un IMP. `execute=False` => --dry-run."""
    cmd = [PYTHON_EXE, str(KAIZEN_AUTOLOOP), "--imp-id", imp_id, "--lane", "SAFE_AUTO"]
    if not execute:
        cmd.append("--dry-run")
    return cmd


def run_dispatch(imp_id: str, execute: bool,
                 timeout: int = DISPATCH_TIMEOUT_S) -> dict[str, Any]:
    """Lance kaizen_autoloop sur `imp_id`. Retourne un dict de résultat structuré.

    N'élève jamais : un timeout / une erreur process est encodé dans le retour.
    """
    cmd = build_command(imp_id, execute)
    log.info("dispatch %s : %s", imp_id, " ".join(cmd))
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True,
            cwd=str(REPO_ROOT), timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return {"imp_id": imp_id, "dispatched": True, "ok": False,
                "reason": f"timeout > {timeout}s"}
    except OSError as exc:
        return {"imp_id": imp_id, "dispatched": False, "ok": False,
                "reason": f"lancement impossible: {exc}"}
    return {
        "imp_id": imp_id,
        "dispatched": True,
        "ok": proc.returncode == 0,
        "returncode": proc.returncode,
        "stdout_tail": (proc.stdout or "")[-1000:],
        "stderr_tail": (proc.stderr or "")[-500:],
    }


def maybe_dispatch(schedule_path: Path = SCHEDULE_PATH,
                   required: tuple[str, ...] = DEFAULT_REQUIRED,
                   execute: bool = False,
                   timeout: int = DISPATCH_TIMEOUT_S) -> dict[str, Any]:
    """Décide et (éventuellement) lance. Coeur réutilisable, importable par director.

    Retourne un dict `action` décrivant la décision :
      action ∈ {no_schedule, nothing_recommended, services_down, planned, dispatched}
    `execute=False` (défaut) => action 'planned' (dry-run), aucun IMP exécuté.
    """
    schedule = load_schedule(schedule_path)
    if not schedule.get("available"):
        return {"action": "no_schedule", "reason": schedule.get("reason")}

    imp = first_recommended(schedule)
    if imp is None:
        return {"action": "nothing_recommended",
                "reason": "aucun IMP recommandé dans le schedule"}

    imp_id = imp["id"]
    probe = probe_services(required)
    if not services_all_up(probe):
        down = [s["name"] for s in probe if not s["up"]]
        return {"action": "services_down", "imp_id": imp_id,
                "down": down, "probe": probe,
                "reason": f"services requis DOWN: {', '.join(down)}"}

    if not execute:
        return {"action": "planned", "imp_id": imp_id, "execute": False,
                "command": build_command(imp_id, execute=True),
                "reason": "dry-run — relancer avec --execute pour dispatcher"}

    result = run_dispatch(imp_id, execute=True, timeout=timeout)
    return {"action": "dispatched", "imp_id": imp_id, "result": result}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: Optional[list[str]] = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(
        description="Dispatch bridge — director_schedule.json -> kaizen_autoloop.py (IMP-181)")
    parser.add_argument("--schedule-path", default=str(SCHEDULE_PATH),
                        help=f"chemin du schedule (défaut {SCHEDULE_PATH})")
    parser.add_argument("--require", default=",".join(DEFAULT_REQUIRED),
                        help="services requis UP, séparés par des virgules "
                             f"(défaut {','.join(DEFAULT_REQUIRED)})")
    parser.add_argument("--execute", action="store_true",
                        help="EXÉCUTE réellement (défaut : dry-run / plan seulement)")
    parser.add_argument("--timeout", type=int, default=DISPATCH_TIMEOUT_S,
                        help=f"timeout du dispatch en secondes (défaut {DISPATCH_TIMEOUT_S})")
    args = parser.parse_args(argv)

    required = tuple(s.strip() for s in args.require.split(",") if s.strip())

    # Lock inter-process — seul le chemin --execute lance réellement kaizen_autoloop.
    # L'enfant hérite du lock via AUTOLOOP_LOCK_INHERITED (pas de double prise).
    lock_held = False
    if args.execute:
        if not acquire_lock():
            try:
                holder = LOCK_PATH.read_text(encoding="utf-8").strip()
            except OSError:
                holder = "?"
            log.error("LOCK : %s existe deja (%s) — un autre autoloop/bridge tourne. "
                      "Abort. (si stale : supprimer le fichier)", LOCK_PATH, holder)
            return 1
        lock_held = True
        os.environ["AUTOLOOP_LOCK_INHERITED"] = "1"

    try:
        outcome = maybe_dispatch(
            schedule_path=Path(args.schedule_path),
            required=required or DEFAULT_REQUIRED,
            execute=args.execute,
            timeout=args.timeout,
        )

        action = outcome.get("action")
        if action == "no_schedule":
            log.info("rien à dispatcher — %s", outcome.get("reason"))
            return 0
        if action == "nothing_recommended":
            log.info("rien à dispatcher — %s", outcome.get("reason"))
            return 0
        if action == "services_down":
            log.info("dispatch suspendu (%s) pour %s — no-op",
                     outcome.get("reason"), outcome.get("imp_id"))
            return 0
        if action == "planned":
            log.info("PLAN (dry-run) — lancerait : %s", " ".join(outcome["command"]))
            log.info("relancer avec --execute pour dispatcher %s", outcome["imp_id"])
            return 0
        if action == "dispatched":
            result = outcome["result"]
            if result.get("ok"):
                log.info("dispatch %s OK", outcome["imp_id"])
                return 0
            log.error("dispatch %s ÉCHEC — %s",
                      outcome["imp_id"], result.get("reason") or result.get("returncode"))
            return 1
        log.error("action inattendue: %s", action)
        return 1
    finally:
        if lock_held:
            os.environ.pop("AUTOLOOP_LOCK_INHERITED", None)
            release_lock()


if __name__ == "__main__":
    sys.exit(main())
