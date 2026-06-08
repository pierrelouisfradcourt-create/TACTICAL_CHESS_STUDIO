#!/usr/bin/env python3
"""
studio_start.py — Context loader de session.
Lit phi_history.jsonl (derniere entree) + git status + ledger open.
Produit un brief structure en < 2 secondes.

Usage:
  python lab/chains/studio_start.py
  python lab/chains/studio_start.py --verbose
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

try:
    import yaml
except ImportError:
    print("[X] PyYAML manquant. Installer: pip install pyyaml")
    sys.exit(1)

OK = "[OK]"
WARN = "[!]"
BLOCK = "[X]"

REPO_ROOT = Path(__file__).parent.parent.parent
LEDGER_PATH = REPO_ROOT / "lab" / "chains" / "IMPROVEMENT_LEDGER.yaml"
HISTORY_PATH = REPO_ROOT / "lab" / "chains" / "phi_history.jsonl"

ACTIVE_STATUS = {"OPEN", "IN_PROGRESS", "BLOCKED"}


def _last_phi():
    if not HISTORY_PATH.exists():
        return None
    lines = [l.strip() for l in open(HISTORY_PATH, "r", encoding="utf-8") if l.strip()]
    if not lines:
        return None
    try:
        return json.loads(lines[-1])
    except json.JSONDecodeError:
        return None


def _git_status():
    try:
        r = subprocess.run(
            ["git", "status", "--short"],
            capture_output=True, text=True, encoding="utf-8",
            cwd=str(REPO_ROOT), timeout=5,
        )
        lines = [l for l in r.stdout.splitlines() if l.strip()]
        return lines
    except Exception:
        return []


def _git_recent(n=5):
    try:
        r = subprocess.run(
            ["git", "log", "--oneline", f"-{n}"],
            capture_output=True, text=True, encoding="utf-8",
            cwd=str(REPO_ROOT), timeout=5,
        )
        return [l for l in r.stdout.splitlines() if l.strip()]
    except Exception:
        return []


def _ledger_open():
    if not LEDGER_PATH.exists():
        return [], 0
    with open(LEDGER_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    improvements = data.get("improvements", [])
    open_imps = [
        imp for imp in improvements
        if imp.get("status") in ACTIVE_STATUS
    ]
    total_closed = sum(1 for imp in improvements if imp.get("status") == "CLOSED")
    return open_imps, total_closed


def _velocity_label(v):
    if v is None:
        return "N/A"
    if v >= 0.5:
        return f"{v:.3f} [HIGH]"
    if v >= 0.1:
        return f"{v:.3f} [NORMAL]"
    return f"{v:.3f} [LOW - session exploratoire?]"


def build_brief(verbose=False):
    lines = []
    sep = "=" * 56

    lines.append(sep)
    lines.append(f"  STUDIO START — {date.today().isoformat()}")
    lines.append(sep)

    phi = _last_phi()
    if phi:
        lines.append(f"")
        lines.append(f"  Session precedente : {phi.get('session_date', '?')}")
        lines.append(f"  commits            : {phi.get('commits_count', '?')}")
        lines.append(f"  IMPs fermes        : {phi.get('imp_closed_count', '?')}")
        lines.append(f"  velocity           : {_velocity_label(phi.get('velocity'))}")
        if phi.get("notes"):
            lines.append(f"  notes              : {phi['notes']}")
    else:
        lines.append(f"")
        lines.append(f"  {WARN} Aucun historique phi disponible (premiere session ?)")

    open_imps, total_closed = _ledger_open()
    lines.append(f"")
    lines.append(f"  LEDGER")
    lines.append(f"  IMPs OPEN          : {len(open_imps)}")
    lines.append(f"  IMPs CLOSED total  : {total_closed}")

    if open_imps:
        lines.append(f"")
        lines.append(f"  PRIORITES OPEN (top 5)")
        for imp in open_imps[:5]:
            impact = imp.get("impact", "?")
            title = imp.get("title", "?")
            imp_id = imp.get("id", "?")
            lines.append(f"  [{impact:8}] {imp_id} — {title[:48]}")

    status_lines = _git_status()
    lines.append(f"")
    lines.append(f"  GIT STATUS")
    if status_lines:
        lines.append(f"  {len(status_lines)} fichier(s) modifie(s) non commites")
        if verbose:
            for s in status_lines[:10]:
                lines.append(f"    {s}")
    else:
        lines.append(f"  Repo propre")

    recent = _git_recent(3)
    if recent:
        lines.append(f"")
        lines.append(f"  DERNIERS COMMITS")
        for r in recent:
            lines.append(f"  {r}")

    lines.append(f"")
    lines.append(sep)
    lines.append(f"  -> Lancer studio_end.py en fin de session")
    lines.append(sep)

    return "\n".join(lines)


def main(argv=None):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass
    t0 = time.time()
    parser = argparse.ArgumentParser(description="Context loader de session.")
    parser.add_argument("--verbose", action="store_true", help="Afficher git status detaille")
    args = parser.parse_args(argv)

    brief = build_brief(verbose=args.verbose)
    print(brief)

    elapsed = time.time() - t0
    if elapsed > 2.0:
        print(f"\n{WARN} Brief genere en {elapsed:.2f}s (> 2s cible)")
    else:
        print(f"\n{OK} Brief genere en {elapsed:.2f}s")

    return 0


if __name__ == "__main__":
    sys.exit(main())
