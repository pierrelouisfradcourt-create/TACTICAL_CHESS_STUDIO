#!/usr/bin/env python3
"""ecg_migrate.py — matérialise oracle_type + blocked_by depuis `notes` (IMP-195).

Écrit EXCLUSIVEMENT via le single-writer IMP-194 (kaizen_loop.save_ledger ->
ledger_writer.guarded_write : governor.check + writelock + empreinte optimiste).

  --dry-run (défaut) : rapporte le diff + le delta actionable, sans écrire.
  --write            : applique (idempotent).

RT-195-3 : peupler blocked_by retire les IMPs dont les deps sont OPEN de l'actionable set
de l'autoloop — comportement plus correct (anti-pickup prématuré) mais immédiat. Le rapport
montre le delta avant/après pour la gate.
RT-195-5 : lancer --write studio quiescé. Si autopilot écrit le ledger entre load et save,
guarded_write lève ConcurrentWriteError (fail-closed) -> relancer.
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parent
sys.path.insert(0, str(REPO / "lab" / "chains"))
sys.path.insert(0, str(_HERE))

import kaizen_loop as kl  # noqa: E402
import ecg  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
_log = logging.getLogger("ecg_migrate")


def _actionable_ids(imps: list[dict]) -> set[str]:
    return {i["id"] for i in imps if kl.is_actionable(i, imps)}


def run(write: bool) -> int:
    path = kl.find_ledger()
    data = kl.load_ledger(path)
    before = _actionable_ids(data["improvements"])

    migrated, changed = ecg.materialize_ledger(data)
    after = _actionable_ids(migrated["improvements"])

    _log.info("[ecg_migrate] %d IMP(s) a materialiser : %s", len(changed), changed or "(aucun)")
    removed = sorted(before - after)
    added = sorted(after - before)
    _log.info("[ecg_migrate] actionable RETIRES (deps OPEN) : %s", removed or "(aucun)")
    _log.info("[ecg_migrate] actionable AJOUTES             : %s", added or "(aucun)")

    if not write:
        _log.info("[ecg_migrate] DRY-RUN — aucune ecriture. Utiliser --write pour appliquer.")
        return 0
    if not changed:
        _log.info("[ecg_migrate] rien a ecrire (deja materialise).")
        return 0
    kl.save_ledger(path, migrated)  # -> ledger_writer.guarded_write (single-writer IMP-194)
    _log.info("[ecg_migrate] ECRIT via single-writer : %d IMP(s) materialises.", len(changed))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Matérialise oracle_type + blocked_by (IMP-195).")
    ap.add_argument("--write", action="store_true", help="Applique (defaut: dry-run).")
    args = ap.parse_args()
    return run(args.write)


if __name__ == "__main__":
    raise SystemExit(main())
