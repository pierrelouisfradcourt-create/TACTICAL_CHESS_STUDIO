#!/usr/bin/env python3
"""
studio_end.py — Capture phi(T) en fin de session.
Calcule 4 scalaires deterministes depuis git log + ledger.
Ecrit 1 ligne JSON dans lab/chains/phi_history.jsonl.

Usage:
  python lab/chains/studio_end.py
  python lab/chains/studio_end.py --notes "session productive"
  python lab/chains/studio_end.py --dry-run
"""

import argparse
import json
import subprocess
import sys
from datetime import date, datetime
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
SCHEMA_PATH = REPO_ROOT / "lab" / "chains" / "phi_schema.yaml"
HISTORY_PATH = REPO_ROOT / "lab" / "chains" / "phi_history.jsonl"

ACTIVE_STATUS = {"OPEN", "IN_PROGRESS", "BLOCKED"}
SCHEMA_VERSION = "v1.0"


def _git_commits_today():
    today_str = date.today().isoformat() + " 00:00:00"
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", f"--since={today_str}"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            cwd=str(REPO_ROOT),
        )
        lines = [l for l in result.stdout.splitlines() if l.strip()]
        return len(lines)
    except Exception:
        return 0


def _ledger_stats():
    if not LEDGER_PATH.exists():
        return 0, 0
    with open(LEDGER_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    improvements = data.get("improvements", [])
    today = date.today().isoformat()
    closed_today = sum(
        1 for imp in improvements
        if str(imp.get("closed_session", "") or "").startswith(today)
    )
    open_count = sum(
        1 for imp in improvements
        if imp.get("status") in ACTIVE_STATUS
    )
    return closed_today, open_count


def compute_phi(notes=""):
    commits = _git_commits_today()
    imp_closed, open_count = _ledger_stats()
    velocity = round(imp_closed / max(commits, 1), 3)
    return {
        "session_date": date.today().isoformat(),
        "captured_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "schema_version": SCHEMA_VERSION,
        "commits_count": commits,
        "imp_closed_count": imp_closed,
        "open_imp_count": open_count,
        "velocity": velocity,
        "notes": notes,
    }


def cmd_run(args):
    phi = compute_phi(notes=args.notes or "")

    print(f"{'='*50}")
    print(f"phi(T) - {phi['session_date']}")
    print(f"{'='*50}")
    print(f"  commits_today     : {phi['commits_count']}")
    print(f"  imp_closed_today  : {phi['imp_closed_count']}")
    print(f"  open_imp_count    : {phi['open_imp_count']}")
    print(f"  velocity          : {phi['velocity']}")
    if phi["notes"]:
        print(f"  notes             : {phi['notes']}")
    print(f"{'='*50}")

    if args.dry_run:
        print(f"{WARN} Dry-run : phi calcule mais non ecrit dans phi_history.jsonl")
        return 0

    with open(HISTORY_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(phi, ensure_ascii=False) + "\n")

    entries = sum(1 for _ in open(HISTORY_PATH, "r", encoding="utf-8"))
    print(f"{OK} phi appende dans {HISTORY_PATH.relative_to(REPO_ROOT)} (total : {entries} session(s))")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Capture phi(T) en fin de session.")
    parser.add_argument("--notes", default="", help="Commentaire libre sur la session")
    parser.add_argument("--dry-run", action="store_true", help="Calcule sans ecrire")
    args = parser.parse_args(argv)
    return cmd_run(args)


if __name__ == "__main__":
    sys.exit(main())
