#!/usr/bin/env python3
"""state_validator.py — Exit 1 si .studio_state/current_state.json absent ou stale > 2h."""

import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

STATE_PATH = Path(".studio_state/current_state.json")
STALE_THRESHOLD_H = 2

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("state_validator")


def validate(state_path: Optional[Path] = None) -> int:
    """Return 0 if state exists and is fresh (< 2h), 1 otherwise."""
    path = state_path if state_path is not None else STATE_PATH

    if not path.exists():
        log.error("ABSENT: %s introuvable", path)
        return 1

    mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    age = datetime.now(tz=timezone.utc) - mtime
    threshold = timedelta(hours=STALE_THRESHOLD_H)

    if age > threshold:
        log.error("STALE: %s — âge %s dépasse le seuil de %dh", path, age, STALE_THRESHOLD_H)
        return 1

    log.info("OK: %s — âge %s", path, age)
    return 0


if __name__ == "__main__":
    sys.exit(validate())
