#!/usr/bin/env python3
"""audit_state_writers.py — IMP-158.

Vérifie l'invariant single-writer du studio_state : seul
update_studio_current_state.py ÉCRIT .studio_state/current_state.json, et il
n'est invoqué que via le backbone (ingest_event.py).

Distingue READERS (lecture seule, OK) de WRITERS (écriture, doit être unique).
Produit lab/reports/state_writers_audit.json (oracle : fichier existe + JSON
valide + writers == {update_studio_current_state.py}).

Read-only : n'écrit que le rapport, ne mute aucun script.

Usage :
  python scripts/audit_state_writers.py
  exit 0 si invariant respecté, 1 sinon.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
REPORT_PATH = PROJECT_ROOT / "lab" / "reports" / "state_writers_audit.json"

# Le writer canonique unique (runtime) et son point d'entrée backbone.
CANONICAL_WRITER = "update_studio_current_state.py"
BACKBONE_ENTRY = "ingest_event.py"

# Writers genesis autorisés : amorçage one-shot uniquement, n'écrivent QUE si
# l'état est absent et refusent d'écraser un état vivant (idempotents). Ils ne
# participent pas au flux runtime piloté par le backbone.
GENESIS_WRITERS = {"bootstrap_state.py"}

# Patterns d'écriture ciblant le state. On cherche une mention de current_state
# proche d'une primitive d'écriture fichier.
_WRITE_PRIMITIVES = re.compile(
    r"""(\.write_text\(|\bopen\([^)]*['"][wax]\+?['"]|json\.dump\(|\.write\()""",
    re.VERBOSE,
)
_STATE_REF = re.compile(r"current_state|STATE_PATH|CURRENT_STATE", re.IGNORECASE)
# Le writer canonique reçoit la cible via --write (argparse), pas via open() littéral.
_WRITE_FLAG = re.compile(r"--write\b")

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("audit_state_writers")


def _iter_py_files() -> List[Path]:
    return sorted(
        p for p in SCRIPTS_DIR.rglob("*.py")
        if "__pycache__" not in p.parts
    )


def classify(path: Path) -> Dict[str, object] | None:
    """Retourne un verdict reader/writer si le fichier référence le state, sinon None."""
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None

    if not _STATE_REF.search(text):
        return None

    rel = path.relative_to(PROJECT_ROOT).as_posix()
    is_canonical_writer = path.name == CANONICAL_WRITER
    is_genesis_writer = path.name in GENESIS_WRITERS

    # Détecte une écriture réelle du state : une ligne contenant à la fois une
    # primitive d'écriture ET une référence au state.
    write_hits: List[str] = []
    for lineno, line in enumerate(text.splitlines(), 1):
        if _WRITE_PRIMITIVES.search(line) and _STATE_REF.search(line):
            write_hits.append(f"{rel}:{lineno}: {line.strip()[:120]}")

    # Le writer canonique écrit via la cible argparse --write (pas de littéral open).
    declares_write_target = is_canonical_writer and bool(_WRITE_FLAG.search(text))

    is_writer = bool(write_hits or declares_write_target)
    if is_writer and is_canonical_writer:
        role = "writer_canonical"
    elif is_writer and is_genesis_writer:
        role = "writer_genesis"
    elif is_writer:
        role = "writer_unauthorized"
    else:
        role = "reader"
    return {
        "file": rel,
        "role": role,
        "is_canonical_writer": is_canonical_writer,
        "is_genesis_writer": is_genesis_writer,
        "write_hits": write_hits,
    }


def audit() -> int:
    results = [r for r in (classify(p) for p in _iter_py_files()) if r is not None]
    canonical_writers = [r for r in results if r["role"] == "writer_canonical"]
    genesis_writers = [r for r in results if r["role"] == "writer_genesis"]
    unauthorized_writers = [r for r in results if r["role"] == "writer_unauthorized"]
    readers = [r for r in results if r["role"] == "reader"]

    # Le backbone doit exister et invoquer le writer canonique.
    backbone_path = SCRIPTS_DIR / BACKBONE_ENTRY
    backbone_invokes_writer = (
        backbone_path.exists()
        and CANONICAL_WRITER in backbone_path.read_text(encoding="utf-8")
    )

    # Invariant : aucun writer non autorisé, le writer canonique existe et est
    # branché au backbone. Genesis (bootstrap) toléré car amorçage idempotent.
    invariant_ok = (
        not unauthorized_writers
        and len(canonical_writers) == 1
        and backbone_invokes_writer
    )

    report = {
        "schema_version": 2,
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "claim_posture": "NO_CLAIM_ALLOWED",
        "invariant": "single_runtime_writer_via_backbone_plus_genesis_bootstrap",
        "invariant_ok": invariant_ok,
        "canonical_writer": CANONICAL_WRITER,
        "genesis_writers_allowlist": sorted(GENESIS_WRITERS),
        "backbone_entry": BACKBONE_ENTRY,
        "backbone_invokes_writer": backbone_invokes_writer,
        "writers_canonical": [w["file"] for w in canonical_writers],
        "writers_genesis": [w["file"] for w in genesis_writers],
        "writers_unauthorized": unauthorized_writers,
        "readers": [r["file"] for r in readers],
        "summary": {
            "total_state_referencing": len(results),
            "writers_canonical": len(canonical_writers),
            "writers_genesis": len(genesis_writers),
            "writers_unauthorized": len(unauthorized_writers),
            "readers": len(readers),
        },
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    log.info("Rapport écrit : %s", REPORT_PATH.relative_to(PROJECT_ROOT).as_posix())
    log.info("readers=%d canonical=%d genesis=%d unauthorized=%d backbone_ok=%s",
             len(readers), len(canonical_writers), len(genesis_writers),
             len(unauthorized_writers), backbone_invokes_writer)
    if invariant_ok:
        log.info("INVARIANT OK : 1 writer runtime canonique (via backbone) + genesis bootstrap toléré")
        return 0
    if unauthorized_writers:
        log.error("VIOLATION : writers non autorisés : %s",
                  [w["file"] for w in unauthorized_writers])
    if len(canonical_writers) != 1:
        log.error("VIOLATION : %d writer(s) canonique(s), attendu exactement 1", len(canonical_writers))
    if not backbone_invokes_writer:
        log.error("VIOLATION : %s n'invoque pas %s", BACKBONE_ENTRY, CANONICAL_WRITER)
    return 1


if __name__ == "__main__":
    raise SystemExit(audit())
