#!/usr/bin/env python3
"""
loop_memory_hook.py — Auto-memory hook pour IMP/loop close
Appelé en fin de boucle @coordinateur pour persister l'entrée dans l'Obsidian vault.

Usage:
    python scripts/loop_memory_hook.py \\
        --imp_id IMP-163 \\
        --packet_id <uuid> \\
        --oracle_status OK \\
        --tier SAFE_AUTO \\
        --skill imp_run \\
        --lane ROCKY_MOTEUR \\
        --duration_s 47 \\
        [--notes "texte libre"]

Sortie:
    Append d'une ligne YAML dans studio_brain/state/loops-log.md
    Format ISO8601 + champs clés.

Règles:
    - Chemins repo-relatifs (resolve depuis ce fichier)
    - encoding='utf-8' explicite sur tout open()
    - Pas de print() → logging
    - Pas d'API externe
    - claim_verdict: NO_CLAIM_ALLOWED
"""

import argparse
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [loop_memory_hook] %(levelname)s %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger(__name__)

# Repo root = deux niveaux au-dessus de ce fichier (scripts/loop_memory_hook.py)
REPO_ROOT = Path(__file__).resolve().parent.parent
LOOPS_LOG = REPO_ROOT / "studio_brain" / "state" / "loops-log.md"


def _ensure_log_file(path: Path) -> None:
    """Crée le fichier et son répertoire parent si absents."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        header = (
            "# loops-log.md — Historique des boucles IMP/loop\n"
            "# Format : entrée YAML par ligne, append-only\n"
            "# claim_verdict: NO_CLAIM_ALLOWED\n\n"
        )
        path.write_text(header, encoding="utf-8")
        log.info("Créé loops-log.md : %s", path)


def _build_entry(args: argparse.Namespace) -> str:
    """Construit la ligne d'entrée à appender."""
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    notes_field = f' notes: "{args.notes}"' if args.notes else ""
    entry = (
        f"- ts: {now}"
        f" imp_id: {args.imp_id}"
        f" packet_id: {args.packet_id}"
        f" oracle: {args.oracle_status}"
        f" tier: {args.tier}"
        f" skill: {args.skill}"
        f" lane: {args.lane}"
        f" duration_s: {args.duration_s}"
        f"{notes_field}\n"
    )
    return entry


def append_entry(args: argparse.Namespace) -> None:
    """Point d'entrée principal — valide, crée si nécessaire, append."""
    # Validation minimale
    if not args.imp_id:
        log.error("--imp_id obligatoire")
        sys.exit(1)
    if args.oracle_status not in ("OK", "FAIL", "BLOCKED", "SKIP"):
        log.warning("oracle_status inattendu : %s", args.oracle_status)
    if args.tier not in ("SAFE_AUTO", "AUDIT", "HUMAN_GATE"):
        log.warning("tier inattendu : %s", args.tier)

    _ensure_log_file(LOOPS_LOG)
    entry = _build_entry(args)

    with open(LOOPS_LOG, "a", encoding="utf-8") as fh:
        fh.write(entry)

    log.info("Entrée écrite dans loops-log.md : imp_id=%s oracle=%s", args.imp_id, args.oracle_status)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Append une entrée de boucle dans studio_brain/state/loops-log.md"
    )
    parser.add_argument("--imp_id",       required=True,  help="Ex: IMP-163")
    parser.add_argument("--packet_id",    required=True,  help="UUID du TaskPacket")
    parser.add_argument("--oracle_status",required=True,  choices=["OK", "FAIL", "BLOCKED", "SKIP"])
    parser.add_argument("--tier",         required=True,  choices=["SAFE_AUTO", "AUDIT", "HUMAN_GATE"])
    parser.add_argument("--skill",        required=True,  help="Ex: imp_run")
    parser.add_argument("--lane",         required=True,  help="Ex: ROCKY_MOTEUR")
    parser.add_argument("--duration_s",   required=True,  type=int, help="Durée en secondes")
    parser.add_argument("--notes",        default=None,   help="Texte libre optionnel")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    append_entry(args)
