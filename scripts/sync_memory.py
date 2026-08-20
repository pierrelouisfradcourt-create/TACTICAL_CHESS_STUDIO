#!/usr/bin/env python3
"""
sync_memory.py — Synchronise la section "## Métriques" de MEMORY.md
avec les vraies valeurs produites par les oracles.

Sources (lecture seule) :
  - lab/reports/elo_match_latest.json      -> ELO neural/hybrid/heuristic/teacher
  - lab/reports/lichess_eval_latest.json   -> puzzles L1/L2/L3
  - lab/chains/IMPROVEMENT_LEDGER.yaml     -> compte CLOSED/OPEN/...

Cible (réécriture chirurgicale) :
  - studio/openclaw-workspace/MEMORY.md
    Seule la section "## Métriques" est remplacée. Tout le reste du
    fichier (Fog, Ancres, Stack, Règle mémoire, ...) est préservé tel quel.

Usage :
  python scripts/sync_memory.py
  python scripts/sync_memory.py --check   # n'écrit pas, exit 1 si désynchro

Convention : ce script ne produit AUCUN claim. Il recopie des valeurs déjà
vérifiées par oracle (avec leur propre verdict) dans une section auto-générée.
"""
from __future__ import annotations

import argparse
import datetime
import json
import logging
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

ELO_REPORT = REPO_ROOT / "lab/reports/elo_match_latest.json"
PZL_REPORT = REPO_ROOT / "lab/reports/lichess_eval_latest.json"
LEDGER = REPO_ROOT / "lab/chains/IMPROVEMENT_LEDGER.yaml"
MEMORY = REPO_ROOT / "studio/openclaw-workspace/MEMORY.md"

SECTION_TITLE = "## Métriques"
AUTOGEN_MARK = "<!-- AUTO-GÉNÉRÉ par scripts/sync_memory.py — ne pas éditer à la main -->"

log = logging.getLogger("sync_memory")


# ── Lecture des sources ────────────────────────────────────────────────────

def load_json(path: Path) -> dict | None:
    """Charge un rapport JSON. Renvoie None si absent ou illisible."""
    if not path.exists():
        log.warning("source absente : %s", path.relative_to(REPO_ROOT))
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        log.warning("source illisible %s : %s", path.name, exc)
        return None


def count_ledger_status(path: Path) -> dict[str, int]:
    """Compte les IMP par statut. Utilise PyYAML si dispo, sinon regex.

    Le fallback regex compte les lignes ``status: <VALEUR>`` au niveau des
    items de la liste ``improvements`` — validé identique au parse YAML.
    """
    if not path.exists():
        log.warning("ledger absent : %s", path)
        return {}
    text = path.read_text(encoding="utf-8")

    try:
        import yaml  # type: ignore

        data = yaml.safe_load(text) or {}
        imps = data.get("improvements", []) or []
        counts: dict[str, int] = {}
        for imp in imps:
            st = str(imp.get("status", "UNKNOWN")).upper()
            counts[st] = counts.get(st, 0) + 1
        return counts
    except ImportError:
        counts = {}
        for m in re.finditer(r"(?m)^\s{0,6}status:\s*([A-Za-z_]+)\s*$", text):
            st = m.group(1).upper()
            counts[st] = counts.get(st, 0) + 1
        return counts


# ── Formatage des valeurs ──────────────────────────────────────────────────

def _fmt_elo(v: object) -> str:
    return f"{float(v):.1f}" if isinstance(v, (int, float)) else "n/a"


def build_section(elo: dict | None, pzl: dict | None,
                  ledger: dict[str, int], today: str) -> str:
    """Construit le bloc Markdown complet de la section "## Métriques"."""
    lines: list[str] = [f"{SECTION_TITLE} (sync oracle — {today})", AUTOGEN_MARK, ""]

    # ELO
    if elo:
        r = elo.get("ratings", {}) or {}
        ts = elo.get("timestamp", "?")
        delta = elo.get("delta_hybrid_vs_heuristic")
        verdict = elo.get("verdict", "?")
        delta_str = f"+{delta}" if isinstance(delta, (int, float)) and delta >= 0 else str(delta)
        lines += [
            f"### ELO — elo_match_latest.json ({ts})",
            f"- Teacher (UCI) : {_fmt_elo(r.get('teacher_uci'))}",
            f"- Hybride : {_fmt_elo(r.get('hybrid'))}",
            f"- Heuristique : {_fmt_elo(r.get('heuristic'))}",
            f"- Neural : {_fmt_elo(r.get('neural'))}",
            f"- Δ hybride−heuristique : {delta_str} (cible ≥ +20) — verdict **{verdict}**",
            "",
        ]
    else:
        lines += ["### ELO — elo_match_latest.json", "- _rapport indisponible_", ""]

    # Puzzles Lichess
    if pzl:
        ts = pzl.get("timestamp", "?")
        lines.append(f"### Puzzles Lichess — lichess_eval_latest.json ({ts})")
        for lvl in pzl.get("levels", []) or []:
            n = lvl.get("level", "?")
            pct = lvl.get("solved_pct", "?")
            thr = lvl.get("threshold_pct", "?")
            vd = lvl.get("verdict", "?")
            lines.append(f"- L{n} : {pct}% (seuil ≥{thr}%) — {vd}")
        lines.append(f"- verdict global : **{pzl.get('verdict', '?')}**")
        lines.append("")
    else:
        lines += ["### Puzzles Lichess — lichess_eval_latest.json", "- _rapport indisponible_", ""]

    # Ledger IMP
    lines.append("### Ledger IMP — IMPROVEMENT_LEDGER.yaml")
    if ledger:
        total = sum(ledger.values())
        ordered = sorted(ledger.items(), key=lambda kv: (-kv[1], kv[0]))
        parts = " / ".join(f"{st} : {n}" for st, n in ordered)
        lines.append(f"- {parts} / total : {total}")
    else:
        lines.append("- _ledger indisponible_")
    lines.append("")

    return "\n".join(lines)


# ── Réécriture chirurgicale de MEMORY.md ───────────────────────────────────

def replace_section(content: str, new_section: str) -> str:
    """Remplace le bloc "## Métriques" ; l'insère après le H1 sinon.

    La section va de sa ligne d'en-tête jusqu'au prochain H2 (``## ``) ou EOF.
    Les sous-titres ``### `` ne ferment pas la section.
    """
    lines = content.splitlines()
    start: int | None = None
    for i, ln in enumerate(lines):
        if ln.strip().startswith(SECTION_TITLE):
            start = i
            break

    new_block = new_section.rstrip("\n").splitlines()

    if start is not None:
        end = len(lines)
        for j in range(start + 1, len(lines)):
            if lines[j].startswith("## "):
                end = j
                break
        # Conserve une ligne vide de séparation avant le H2 suivant.
        rebuilt = lines[:start] + new_block
        if end < len(lines):
            rebuilt += [""]
        rebuilt += lines[end:]
        return "\n".join(rebuilt) + ("\n" if content.endswith("\n") else "")

    # Pas de section existante : insérer après le premier H1.
    insert_at = 0
    for i, ln in enumerate(lines):
        if ln.startswith("# "):
            insert_at = i + 1
            break
    rebuilt = lines[:insert_at] + ["", *new_block, ""] + lines[insert_at:]
    return "\n".join(rebuilt) + ("\n" if content.endswith("\n") else "")


# ── Entrée ─────────────────────────────────────────────────────────────────

def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    logging.basicConfig(level=logging.INFO, format="[sync_memory] %(message)s")

    parser = argparse.ArgumentParser(description="Sync MEMORY.md ## Métriques")
    parser.add_argument("--check", action="store_true",
                        help="ne pas écrire ; exit 1 si MEMORY.md serait modifié")
    args = parser.parse_args()

    if not MEMORY.exists():
        log.error("cible introuvable : %s", MEMORY)
        return 1

    elo = load_json(ELO_REPORT)
    pzl = load_json(PZL_REPORT)
    ledger = count_ledger_status(LEDGER)
    today = datetime.date.today().isoformat()

    section = build_section(elo, pzl, ledger, today)
    original = MEMORY.read_text(encoding="utf-8")
    updated = replace_section(original, section)

    if updated == original:
        log.info("MEMORY.md déjà à jour (aucun changement)")
        return 0

    if args.check:
        log.warning("MEMORY.md désynchronisé (--check : non écrit)")
        return 1

    MEMORY.write_text(updated, encoding="utf-8")
    log.info("MEMORY.md mis à jour : section '%s' (%s)", SECTION_TITLE, today)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
