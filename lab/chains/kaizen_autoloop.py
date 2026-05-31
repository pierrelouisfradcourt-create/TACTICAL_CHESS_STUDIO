#!/usr/bin/env python3
"""
kaizen_autoloop.py — Boucle Kaizen auto-pilotee

Orchestre : recall -> propose -> generate_charter -> execute -> validate -> close -> metrics -> loop

Modes d execution par lane :
  SAFE_AUTO      -> Claude Code subprocess automatique
  AUDIT_REQUIRED -> Charter genere + affiche + attend HumanGate
  HUMAN_REQUIRED -> Affiche + STOP
  FORBIDDEN      -> STOP immediat

Usage:
  python kaizen_autoloop.py              # boucle complete
  python kaizen_autoloop.py --once       # un seul IMP puis stop
  python kaizen_autoloop.py --lane SAFE_AUTO  # SAFE_AUTO uniquement
  python kaizen_autoloop.py --dry-run    # genere les charters sans executer
"""

import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import argparse
import json
import os
import subprocess
import time
from datetime import date, datetime
from pathlib import Path

# Importer kaizen_loop depuis le meme dossier
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import kaizen_loop as kl
except ImportError as e:
    print(f"[X] Impossible d importer kaizen_loop : {e}")
    sys.exit(1)

# ── Constants ─────────────────────────────────────────────
REPO_ROOT       = Path(__file__).resolve().parent.parent.parent
PYTHON_EXE      = sys.executable
CHARTER_DIR     = REPO_ROOT / "lab/chains/charters"
AUTOLOOP_LOG    = REPO_ROOT / "lab/chains/CHAIN_HISTORY.jsonl"


# ── recall / propose ──────────────────────────────────────

def recall() -> dict:
    """Charge l etat courant du ledger."""
    ledger_path = kl.find_ledger()
    data = kl.load_ledger(ledger_path)
    imps = data["improvements"]
    counts = {}
    for imp in imps:
        s = imp.get("status", "OPEN")
        counts[s] = counts.get(s, 0) + 1
    return {
        "open_count":     counts.get("OPEN", 0),
        "closed_count":   counts.get("CLOSED", 0),
        "blocked_count":  counts.get("BLOCKED", 0),
        "deferred_count": counts.get("DEFERRED", 0),
        "data":           data,
        "ledger_path":    ledger_path,
    }


def propose(lane_filter: str | None = None, data: dict | None = None) -> dict | None:
    """Retourne le prochain IMP actionnable (ROI max). None si aucun."""
    if data is None:
        ledger_path = kl.find_ledger()
        data = kl.load_ledger(ledger_path)
    imps = data["improvements"]
    actionable = [i for i in imps if kl.is_actionable(i, imps)]
    if lane_filter:
        actionable = [i for i in actionable if i.get("lane") == lane_filter]
    if not actionable:
        return None
    actionable.sort(
        key=lambda i: (kl.roi_score(i), kl.IMPACT_WEIGHT.get(i.get("impact"), 0)),
        reverse=True,
    )
    return actionable[0]


# ── Charter generation ────────────────────────────────────

def build_minimal_charter(imp: dict) -> str:
    """Charter minimal depuis le ledger — fallback si run_chain / LM Studio down."""
    files = imp.get("files", [])
    files_str = "\n".join(f"  - {f}" for f in files) if files else "  (aucun fichier specifie)"
    val_lines = [
        rf".\.venv312\Scripts\python.exe -m py_compile {f}"
        for f in files if f.endswith(".py")
    ]
    val_lines.append(r".\.venv312\Scripts\python.exe -m pytest -v")
    val_str = "\n".join(val_lines)

    return "\n".join([
        f"# CHARTER {imp['id']} — {imp['title']}",
        "",
        f"**Lane:** {imp['lane']}",
        "**Fichiers autorises:**",
        files_str,
        "",
        "## REGLES ABSOLUES",
        "",
        "- Aucun git write.",
        "- Tests obligatoires.",
        "- claim_verdict: NO_CLAIM_ALLOWED",
        "",
        "## OBJECTIF",
        "",
        imp.get("acceptance", "Voir ledger."),
        "",
        "## NOTES",
        "",
        imp.get("notes", ""),
        "",
        "## VALIDATION",
        "",
        "```powershell",
        val_str,
        "```",
        "",
        "## RAPPORT FINAL ATTENDU",
        "",
        "software_verdict: <resultat>",
        "evidence_verdict: MECHANICAL_VALIDATION_ONLY",
        "claim_verdict:    NO_CLAIM_ALLOWED",
    ])


def generate_charter(imp: dict) -> str:
    """Genere le charter via run_chain --mode charter. Fallback si indisponible."""
    CHARTER_DIR.mkdir(parents=True, exist_ok=True)
    charter_path = CHARTER_DIR / f"{imp['id']}_charter.md"

    try:
        result = subprocess.run(
            [PYTHON_EXE, str(REPO_ROOT / "lab/chains/run_chain.py"),
             "--mode", "charter", "--imp", imp["id"]],
            capture_output=True,
            text=True,
            cwd=str(REPO_ROOT),
            timeout=60,
        )
        if result.returncode == 0 and charter_path.exists():
            return str(charter_path)
    except Exception:
        pass

    # Fallback : charter minimal depuis le ledger
    content = build_minimal_charter(imp)
    charter_path.write_text(content, encoding="utf-8")
    return str(charter_path)


def display_charter_summary(imp: dict, charter_path: str) -> None:
    print(f"[OK] CHARTER genere : {charter_path}")
    print(f"  IMP       : {imp['id']} — {imp['title']}")
    print(f"  Lane      : {imp['lane']}")
    print(f"  Acceptance: {str(imp.get('acceptance', ''))[:80]}")


# ── Execution ─────────────────────────────────────────────

def execute_via_claude_code(charter_path: str, imp: dict) -> str:
    """Lance Claude Code CLI en non-interactif avec le charter. Fallback HumanGate."""
    charter_content = Path(charter_path).read_text(encoding="utf-8")

    for cmd in [
        ["claude", "--print", charter_content],
        ["npx", "@anthropic-ai/claude-code", "--print", charter_content],
    ]:
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(REPO_ROOT),
                timeout=300,
            )
            if result.returncode == 0:
                return result.stdout
        except FileNotFoundError:
            continue
        except subprocess.TimeoutExpired:
            return "TIMEOUT"

    print("[!] Claude Code CLI non disponible. Mode manuel.")
    return request_humangate(imp, charter_path)


def request_humangate(imp: dict, charter_path: str) -> str:
    """Affiche le charter et attend que HumanGate colle le rapport."""
    charter_content = Path(charter_path).read_text(encoding="utf-8")

    print("\n" + "=" * 72)
    print(f"HUMANGATE REQUIS — {imp['id']} [{imp['lane']}]")
    print("=" * 72)
    print(f"Charter : {charter_path}")
    print("\nContenu :")
    preview = charter_content[:2000] + "..." if len(charter_content) > 2000 else charter_content
    print(preview)
    print("\n" + "=" * 72)
    print("Lance Claude Code avec ce charter.")
    print("Colle le rapport final ci-dessous (ligne vide x2 pour terminer) :")
    print("=" * 72 + "\n")

    lines = []
    empty_count = 0
    while True:
        try:
            line = input()
            if line == "":
                empty_count += 1
                if empty_count >= 2:
                    break
            else:
                empty_count = 0
                lines.append(line)
        except EOFError:
            break

    return "\n".join(lines)


# ── Validation ────────────────────────────────────────────

def validate_report(report: str, imp: dict) -> bool:
    """Valide que le rapport indique un succes. Pur, sans I/O sauf cas ambigu."""
    if not report or report == "TIMEOUT":
        return False

    success_signals = [
        "software_verdict: DOCS_OK",
        "software_verdict: AUDIT_REQUIRED_CHANGES",
        "passed",
        "[ok]",
    ]
    fail_signals = [
        "software_verdict: BLOCKED",
        "TIMEOUT",
        "FAILED",
    ]

    report_lower = report.lower()

    for sig in fail_signals:
        if sig.lower() in report_lower:
            return False
    for sig in success_signals:
        if sig.lower() in report_lower:
            return True

    # Ambigu : demander HumanGate
    print("[!] Rapport ambigu. Validation manuelle (o/n) ?")
    try:
        answer = input().strip().lower()
        return answer in ("o", "oui", "y", "yes")
    except EOFError:
        return False


# ── Close + metrics + log ─────────────────────────────────

def close_imp(imp: dict) -> None:
    """Ferme l IMP dans le ledger via kaizen_loop.py close."""
    result = subprocess.run(
        [PYTHON_EXE, str(REPO_ROOT / "lab/chains/kaizen_loop.py"),
         "close", imp["id"], "--session", str(date.today())],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
    )
    if result.returncode == 0:
        print(f"[OK] {imp['id']} ferme dans le ledger.")
        if result.stdout:
            print(result.stdout.strip())
    else:
        print(f"[!] Erreur fermeture {imp['id']} : {result.stderr.strip()}")


def metrics() -> None:
    """Affiche les metrics via kaizen_loop.py metrics."""
    subprocess.run(
        [PYTHON_EXE, str(REPO_ROOT / "lab/chains/kaizen_loop.py"), "metrics"],
        cwd=str(REPO_ROOT),
    )


def log_autoloop_event(imp: dict, status: str, report: str) -> None:
    """Logue un event dans CHAIN_HISTORY.jsonl."""
    entry = {
        "chain":        "kaizen_autoloop",
        "timestamp":    datetime.now().strftime("%Y%m%d_%H%M%S"),
        "imp_id":       imp["id"],
        "imp_title":    imp.get("title", ""),
        "lane":         imp.get("lane", ""),
        "status":       status,
        "report_snippet": (report or "")[:200],
        "claim_verdict": "NO_CLAIM_ALLOWED",
    }
    AUTOLOOP_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(AUTOLOOP_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ── Main loop ─────────────────────────────────────────────

def run_loop(args) -> None:
    """Boucle principale Kaizen auto-pilotee."""
    dry_run = getattr(args, "dry_run", False)
    once    = getattr(args, "once", False)
    lane_filter = getattr(args, "lane", None)

    while True:
        # 1. Etat
        state = recall()
        print(f"[OK] RECALL : {state['closed_count']} closed, {state['open_count']} open")

        if not state["open_count"]:
            print("[OK] Backlog vide. Boucle terminee.")
            break

        # 2. Prochain IMP
        imp = propose(lane_filter=lane_filter, data=state["data"])
        if not imp:
            print("[!] Aucun IMP actionnable. Arret.")
            break
        print(f"[OK] PROPOSE : {imp['id']} [{imp['lane']}]")

        # 3. Gate FORBIDDEN
        if imp["lane"] == "FORBIDDEN":
            print(f"[X] FORBIDDEN : {imp['id']} — arret autoloop.")
            break

        # 4. Generer charter
        charter_path = generate_charter(imp)
        display_charter_summary(imp, charter_path)

        # 5. Dry-run : stop avant execution
        if dry_run:
            print(f"[DRY-RUN] Pas d execution. HumanGate requis pour {imp['lane']}.")
            break

        # 6. Executer selon lane
        if imp["lane"] == "SAFE_AUTO":
            report = execute_via_claude_code(charter_path, imp)
        elif imp["lane"] == "AUDIT_REQUIRED":
            report = request_humangate(imp, charter_path)
        else:
            print(f"[!] Lane {imp['lane']} necessite HumanGate. Arret.")
            break

        # 7. Valider rapport
        success = validate_report(report, imp)

        # 8. Close ou signaler echec
        if success:
            close_imp(imp)
            metrics()
            log_autoloop_event(imp, "SUCCESS", report)
        else:
            print(f"[X] Echec sur {imp['id']}. HumanGate requis.")
            log_autoloop_event(imp, "FAIL", report)
            break

        # 9. Stop si --once
        if once:
            break

        time.sleep(2)


def main():
    parser = argparse.ArgumentParser(
        description="Kaizen Autoloop — boucle Kaizen auto-pilotee"
    )
    parser.add_argument("--once", action="store_true",
                        help="Un seul IMP puis stop")
    parser.add_argument("--lane", default=None,
                        help="Filtrer par lane (SAFE_AUTO, AUDIT_REQUIRED, ...)")
    parser.add_argument("--dry-run", dest="dry_run", action="store_true",
                        help="Genere les charters sans executer")
    args = parser.parse_args()
    run_loop(args)


if __name__ == "__main__":
    main()
