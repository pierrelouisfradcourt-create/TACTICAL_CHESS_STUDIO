#!/usr/bin/env python3
"""healthcheck.py — Daemon de surveillance des 4 services studio.

Usage (WSL) :
    python3 scripts/healthcheck.py &

Services surveillés :
    8765  claude_proxy      → restart auto
    8766  canvas_gateway    → restart auto
    18789 openclaw_gateway  → log only
    7331  autopilot         → log only
"""

import logging
import os
import socket
import subprocess
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Paramètres
# ---------------------------------------------------------------------------

POLL_INTERVAL_S = 30          # délai entre chaque cycle de check
RESTART_COOLDOWN_S = 120      # délai minimum entre deux restarts du même service
LOG_PATH = Path("lab/reports/healthcheck.log")
CONNECT_TIMEOUT_S = 2

# ---------------------------------------------------------------------------
# Définition des services
# ---------------------------------------------------------------------------

@dataclass
class Service:
    name: str
    port: int
    restart_cmd: Optional[str] = None   # None = log only
    _last_restart: float = field(default=0.0, repr=False)
    _proc: Optional[subprocess.Popen] = field(default=None, repr=False)


SERVICES = [
    Service(
        name="claude_proxy",
        port=8765,
        restart_cmd=(
            "cd /mnt/c/TACTICAL_CHESS_STUDIO && "
            "CLAUDE_PROXY_SYSTEM_FILE=studio/openclaw-workspace/BOOTSTRAP.md "
            "python3 scripts/claude_proxy.py"
        ),
    ),
    Service(
        name="canvas_gateway",
        port=8766,
        restart_cmd=(
            "cd /mnt/c/TACTICAL_CHESS_STUDIO && "
            "STUDIO_HMAC_KEY=$STUDIO_HMAC_KEY "
            "python3 scripts/canvas_gateway.py"
        ),
    ),
    Service(name="openclaw_gateway", port=18789),
    Service(name="autopilot",        port=7331),
]

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def _setup_logging() -> logging.Logger:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("healthcheck")
    logger.setLevel(logging.DEBUG)

    fmt = logging.Formatter(
        "%(asctime)s UTC  %(levelname)-7s  %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    # Convertit les timestamps en UTC
    fmt.converter = time.gmtime

    fh = logging.FileHandler(LOG_PATH, encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    sh = logging.StreamHandler()
    sh.setFormatter(fmt)
    logger.addHandler(sh)

    return logger


log = _setup_logging()

# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

def is_up(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=CONNECT_TIMEOUT_S):
            return True
    except OSError:
        return False


def _proc_still_running(svc: Service) -> bool:
    return svc._proc is not None and svc._proc.poll() is None


def maybe_restart(svc: Service) -> None:
    now = time.monotonic()

    if _proc_still_running(svc):
        log.warning("[%s] port %d DOWN mais process enfant toujours actif (pid %d) — attente",
                    svc.name, svc.port, svc._proc.pid)
        return

    if now - svc._last_restart < RESTART_COOLDOWN_S:
        remaining = int(RESTART_COOLDOWN_S - (now - svc._last_restart))
        log.warning("[%s] port %d DOWN — cooldown actif, prochain restart dans %ds",
                    svc.name, svc.port, remaining)
        return

    log.error("[%s] port %d DOWN — restart en cours", svc.name, svc.port)
    try:
        svc._proc = subprocess.Popen(
            ["bash", "-c", svc.restart_cmd],
            env=os.environ.copy(),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        svc._last_restart = now
        log.info("[%s] process relancé (pid %d)", svc.name, svc._proc.pid)
    except OSError as exc:
        log.error("[%s] échec du restart : %s", svc.name, exc)

# ---------------------------------------------------------------------------
# Boucle principale
# ---------------------------------------------------------------------------

def run() -> None:
    log.info("healthcheck démarré — poll toutes les %ds", POLL_INTERVAL_S)
    log.info("services : %s", ", ".join(f"{s.name}:{s.port}" for s in SERVICES))

    while True:
        for svc in SERVICES:
            if is_up(svc.port):
                log.debug("[%s] :%d OK", svc.name, svc.port)
            elif svc.restart_cmd:
                maybe_restart(svc)
            else:
                log.warning("[%s] port %d DOWN — restart manuel requis", svc.name, svc.port)

        time.sleep(POLL_INTERVAL_S)


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        log.info("healthcheck arrêté (KeyboardInterrupt)")
