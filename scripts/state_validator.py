#!/usr/bin/env python3
"""state_validator.py — IMP-157/IMP-167.

Validation runtime de .studio_state/current_state.json :
  1. stale detection  — exit 1 si absent ou âge mtime > 2h  (validate)
  2. schema drift     — exit 1 si JSON invalide ou non conforme au schema (validate_schema)

`validate()` reste stale-only (rétro-compat + tests existants).
`validate_schema()` est la nouvelle détection de dérive de schema.
`validate_all()` combine les deux et sert d'entrée CLI.
"""

import json
import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = Path(".studio_state/current_state.json")
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studio_current_state.schema.json"
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


def validate_schema(state_path: Optional[Path] = None) -> int:
    """Return 0 if state is JSON-valid and conforms to studio_current_state.schema.json, 1 otherwise.

    Détecte la dérive de schema (clés ajoutées/supprimées, types incohérents).
    Dégrade en vérification required-keys si jsonschema n'est pas installé.
    """
    path = state_path if state_path is not None else STATE_PATH

    if not path.exists():
        log.error("ABSENT: %s introuvable (schema drift check)", path)
        return 1

    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        log.error("SCHEMA DRIFT: %s — JSON invalide: %s", path, exc)
        return 1

    try:
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        log.error("SCHEMA INTROUVABLE/INVALIDE: %s — %s", SCHEMA_PATH, exc)
        return 1

    try:
        import jsonschema
    except ImportError:
        missing = [k for k in schema.get("required", []) if k not in state]
        if missing:
            log.error("SCHEMA DRIFT (fallback required-keys): clés manquantes %s", missing)
            return 1
        log.info("OK (fallback required-keys): %s — toutes les clés requises présentes", path)
        return 0

    try:
        jsonschema.validate(state, schema)
    except jsonschema.ValidationError as exc:
        log.error("SCHEMA DRIFT: %s — %s @ %s", path, exc.message, list(exc.absolute_path))
        return 1

    log.info("OK schema: %s conforme", path)
    return 0


def validate_all(state_path: Optional[Path] = None) -> int:
    """Return 0 only if both stale check AND schema drift check pass."""
    stale_rc = validate(state_path)
    schema_rc = validate_schema(state_path)
    return 1 if (stale_rc or schema_rc) else 0


if __name__ == "__main__":
    sys.exit(validate_all())
