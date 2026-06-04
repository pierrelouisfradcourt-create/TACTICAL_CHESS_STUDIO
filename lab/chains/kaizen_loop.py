#!/usr/bin/env python3
"""
kaizen_loop.py — Boucle d'amélioration continue pour Tactical Chess Studio

Doctrine:
- Read-only par défaut. Aucune mutation de fichier hors --close.
- HumanGate requis sur toute exécution.
- claim_verdict = NO_CLAIM_ALLOWED toujours.
- 1 improvement = 1 bounded task.

Boucle:
  RECALL  -> lit le ledger + dernières metrics
  PROPOSE -> trie par ROI, propose la prochaine action bornée
  CLOSE   -> marque un improvement fermé (seule mutation autorisée)
  METRICS -> affiche la progression
  ADD     -> ajoute un nouvel improvement (capture un gap)

Usage:
  python kaizen_loop.py recall
  python kaizen_loop.py propose
  python kaizen_loop.py propose --lane SAFE_AUTO
  python kaizen_loop.py close IMP-001 --session 2026-06-01
  python kaizen_loop.py add --title "..." --impact HIGH --effort SMALL --lane SAFE_AUTO
  python kaizen_loop.py metrics
"""

import argparse
import sys
from pathlib import Path
from datetime import date

try:
    import yaml
except ImportError:
    print("[X] PyYAML manquant. Installer: pip install pyyaml --break-system-packages")
    sys.exit(1)

# ----- ASCII markers (Windows cp1252 safe) -----
OK = "[OK]"
WARN = "[!]"
BLOCK = "[X]"
ARROW = "->"

LEDGER_NAME = "IMPROVEMENT_LEDGER.yaml"

IMPACT_WEIGHT = {"LOW": 1, "MEDIUM": 3, "HIGH": 5, "CRITICAL": 8}
EFFORT_WEIGHT = {"TRIVIAL": 1, "SMALL": 2, "MEDIUM": 5, "LARGE": 10, "XLARGE": 20}

VALID_STATUS = {"OPEN", "IN_PROGRESS", "CLOSED", "DEFERRED", "BLOCKED"}
VALID_LANE = {"SAFE_AUTO", "AUDIT_REQUIRED", "HUMAN_REQUIRED", "FORBIDDEN"}
VALID_DOMAIN = {"rocky_moteur", "ia_apprentissage", "studio", "jeux", ""}


def find_ledger() -> Path:
    """Cherche le ledger dans cwd, ./lab/chains, ou via env."""
    candidates = [
        Path(LEDGER_NAME),
        Path("lab/chains") / LEDGER_NAME,
        Path(__file__).parent / LEDGER_NAME,
    ]
    for c in candidates:
        if c.exists():
            return c
    print(f"{BLOCK} Ledger introuvable. Cherché: {[str(c) for c in candidates]}")
    sys.exit(1)


def load_ledger(path: Path) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if not isinstance(data, dict) or "improvements" not in data:
            print(f"{BLOCK} Ledger malformé: clé 'improvements' absente.")
            sys.exit(1)
        return data
    except yaml.YAMLError as e:
        print(f"{BLOCK} Erreur YAML: {e}")
        sys.exit(1)


def save_ledger(path: Path, data: dict):
    """Seule écriture autorisée. Préserve l'ordre et les commentaires impossibles
    avec yaml.dump donc on réécrit proprement avec un header."""
    header = (
        "# IMPROVEMENT_LEDGER.yaml\n"
        "# SSOT amélioration continue (Kaizen Loop) — Tactical Chess Studio\n"
        "# Claim posture: NO_CLAIM_ALLOWED | Read-only sauf --close/--add\n\n"
    )
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(header)
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
    except OSError as e:
        print(f"{BLOCK} Erreur écriture: {e}")
        sys.exit(1)


def roi_score(imp: dict) -> float:
    """ROI = impact / effort. Plus haut = prioritaire."""
    iw = IMPACT_WEIGHT.get(imp.get("impact", "MEDIUM"), 3)
    ew = EFFORT_WEIGHT.get(imp.get("effort", "MEDIUM"), 5)
    if ew == 0:
        ew = 1  # garde division par zéro
    return round(iw / ew, 2)


def is_actionable(imp: dict, improvements: list) -> bool:
    """Un improvement est actionnable si OPEN et tous ses blocked_by sont CLOSED."""
    if imp.get("status") != "OPEN":
        return False
    by_id = {i["id"]: i for i in improvements}
    for dep_id in imp.get("blocked_by") or []:
        dep = by_id.get(dep_id)
        if dep is None or dep.get("status") != "CLOSED":
            return False
    return True


# ---------------- COMMANDS ----------------

def cmd_recall(data: dict, args):
    imps = data["improvements"]
    print("=" * 72)
    print("KAIZEN LOOP — RECALL (mémoire du studio)")
    print("=" * 72)

    hist = data.get("metrics_history") or []
    if hist:
        last = hist[-1]
        print(f"\nDernière session: {last.get('session')}")
        print(f"  Total: {last.get('total')} | Open: {last.get('open')} | "
              f"Closed: {last.get('closed')} | Blocked: {last.get('blocked')} | "
              f"Deferred: {last.get('deferred')}")
        print(f"  Spec coverage: {last.get('spec_coverage_pct')}% | "
              f"Tests verts: {last.get('tests_green')}")

    print("\n--- Improvements par statut ---")
    by_status = {}
    for imp in imps:
        by_status.setdefault(imp.get("status", "UNKNOWN"), []).append(imp)

    for status in ["IN_PROGRESS", "OPEN", "BLOCKED", "DEFERRED", "CLOSED"]:
        items = by_status.get(status, [])
        if not items:
            continue
        print(f"\n{status} ({len(items)}):")
        for imp in items:
            roi = roi_score(imp)
            lane = imp.get("lane", "?")
            print(f"  {imp['id']} [{lane}] ROI={roi}  {imp['title']}")
    print()


def cmd_propose(data: dict, args):
    imps = data["improvements"]
    print("=" * 72)
    print("KAIZEN LOOP — PROPOSE (prochaine action bornée)")
    print("=" * 72)

    actionable = [i for i in imps if is_actionable(i, imps)]

    # Filtre lane optionnel
    if args.lane:
        if args.lane not in VALID_LANE:
            print(f"{BLOCK} Lane invalide: {args.lane}. Valides: {VALID_LANE}")
            sys.exit(1)
        actionable = [i for i in actionable if i.get("lane") == args.lane]

    if not actionable:
        print(f"\n{WARN} Aucun improvement actionnable")
        if args.lane:
            print(f"    (filtre lane={args.lane})")
        print("    -> Tous OPEN sont bloqués par des dépendances, ou tout est CLOSED.")
        return

    # Trie par ROI décroissant, puis par impact
    actionable.sort(key=lambda i: (roi_score(i), IMPACT_WEIGHT.get(i.get("impact"), 0)), reverse=True)

    print(f"\n{len(actionable)} action(s) prête(s). Triées par ROI:\n")
    for rank, imp in enumerate(actionable, 1):
        roi = roi_score(imp)
        marker = ARROW if rank == 1 else "  "
        print(f"{marker} #{rank} {imp['id']} ROI={roi} [{imp.get('lane')}]")
        print(f"      {imp['title']}")
        print(f"      impact={imp.get('impact')} effort={imp.get('effort')} "
              f"files={imp.get('files', [])}")
        print(f"      acceptance: {imp.get('acceptance', 'N/A')[:80]}")
        print()

    top = actionable[0]
    print("-" * 72)
    print(f"RECOMMANDATION: commencer par {top['id']} ({top['title']})")
    print(f"  Lane: {top.get('lane')} | HumanGate: "
          f"{'requis' if top.get('lane') in ('AUDIT_REQUIRED','HUMAN_REQUIRED','FORBIDDEN') else 'auto-ok après smoke'}")
    print(f"  claim_verdict: NO_CLAIM_ALLOWED")
    print("-" * 72)


def cmd_close(data: dict, args):
    imps = data["improvements"]
    by_id = {i["id"]: i for i in imps}
    imp = by_id.get(args.id)
    if imp is None:
        print(f"{BLOCK} Improvement {args.id} introuvable.")
        sys.exit(1)
    if imp.get("status") == "CLOSED":
        print(f"{WARN} {args.id} déjà CLOSED.")
        return

    session = args.session or date.today().isoformat()
    imp["status"] = "CLOSED"
    imp["closed_session"] = session

    # Débloque les dépendances
    unblocked = []
    for other in imps:
        deps = other.get("blocked_by") or []
        if args.id in deps and other.get("status") in ("BLOCKED", "OPEN"):
            still_blocked = any(
                by_id.get(d, {}).get("status") != "CLOSED" for d in deps if d != args.id
            )
            if not still_blocked and other.get("status") == "BLOCKED":
                other["status"] = "OPEN"
                unblocked.append(other["id"])

    save_ledger(args.ledger_path, data)
    print(f"{OK} {args.id} fermé (session {session}).")
    if unblocked:
        print(f"{OK} Débloqués: {', '.join(unblocked)}")
    print(f"   -> Pense à lancer 'kaizen_loop.py metrics' puis re-audit.")


def cmd_add(data: dict, args):
    imps = data["improvements"]
    # Génère prochain ID
    nums = []
    for i in imps:
        try:
            nums.append(int(i["id"].split("-")[1]))
        except (IndexError, ValueError):
            pass
    next_num = max(nums) + 1 if nums else 1
    new_id = f"IMP-{next_num:03d}"

    if args.impact not in IMPACT_WEIGHT:
        print(f"{BLOCK} Impact invalide: {args.impact}. Valides: {list(IMPACT_WEIGHT)}")
        sys.exit(1)
    if args.effort not in EFFORT_WEIGHT:
        print(f"{BLOCK} Effort invalide: {args.effort}. Valides: {list(EFFORT_WEIGHT)}")
        sys.exit(1)
    if args.lane not in VALID_LANE:
        print(f"{BLOCK} Lane invalide: {args.lane}. Valides: {VALID_LANE}")
        sys.exit(1)
    domain = getattr(args, "domain", "") or ""
    if domain and domain not in VALID_DOMAIN - {""}:
        print(f"{BLOCK} Domain invalide: {domain}. Valides: rocky_moteur / ia_apprentissage / studio / jeux")
        sys.exit(1)

    session = args.session or date.today().isoformat()
    new_imp = {
        "id": new_id,
        "title": args.title,
        "type": args.type,
        "source": args.source or f"manual add {session}",
        "status": "OPEN",
        "impact": args.impact,
        "effort": args.effort,
        "lane": args.lane,
        "domain": domain,
        "files": args.files.split(",") if args.files else [],
        "acceptance": args.acceptance or "TBD",
        "blocked_by": [],
        "opened_session": session,
        "closed_session": None,
        "notes": args.notes or "",
    }
    imps.append(new_imp)
    save_ledger(args.ledger_path, data)
    print(f"{OK} Ajouté {new_id}: {args.title} (ROI={roi_score(new_imp)})")


def cmd_metrics(data: dict, args):
    imps = data["improvements"]
    print("=" * 72)
    print("KAIZEN LOOP — METRICS (progression)")
    print("=" * 72)

    counts = {s: 0 for s in VALID_STATUS}
    for imp in imps:
        counts[imp.get("status", "OPEN")] = counts.get(imp.get("status", "OPEN"), 0) + 1

    total = len(imps)
    closed = counts.get("CLOSED", 0)
    pct = round(100 * closed / total) if total else 0

    print(f"\nTotal improvements : {total}")
    print(f"  OPEN        : {counts.get('OPEN', 0)}")
    print(f"  IN_PROGRESS : {counts.get('IN_PROGRESS', 0)}")
    print(f"  CLOSED      : {closed}  ({pct}% du backlog)")
    print(f"  BLOCKED     : {counts.get('BLOCKED', 0)}")
    print(f"  DEFERRED    : {counts.get('DEFERRED', 0)}")

    # Progression historique
    hist = data.get("metrics_history") or []
    if len(hist) >= 2:
        prev, last = hist[-2], hist[-1]
        delta_closed = last.get("closed", 0) - prev.get("closed", 0)
        print(f"\nDepuis session {prev.get('session')}:")
        print(f"  Closed delta : +{delta_closed}")
        print(f"  Coverage     : {prev.get('spec_coverage_pct')}% {ARROW} {last.get('spec_coverage_pct')}%")

    # Lane breakdown des OPEN actionnables
    print("\n--- Backlog actionnable par lane ---")
    by_lane = {}
    for imp in imps:
        if is_actionable(imp, imps):
            by_lane.setdefault(imp.get("lane", "?"), []).append(imp["id"])
    for lane in ["SAFE_AUTO", "AUDIT_REQUIRED", "HUMAN_REQUIRED", "FORBIDDEN"]:
        ids = by_lane.get(lane, [])
        if ids:
            print(f"  {lane}: {len(ids)} ({', '.join(ids)})")
    print(f"\nclaim_verdict: NO_CLAIM_ALLOWED")
    print()


def main():
    parser = argparse.ArgumentParser(description="Kaizen Loop — amélioration continue")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("recall", help="Lit le ledger et la mémoire")

    p_prop = sub.add_parser("propose", help="Propose la prochaine action bornée")
    p_prop.add_argument("--lane", help="Filtre par lane (SAFE_AUTO, etc)")

    p_close = sub.add_parser("close", help="Ferme un improvement (mutation)")
    p_close.add_argument("id", help="ID de l'improvement (ex IMP-001)")
    p_close.add_argument("--session", help="Session de fermeture (défaut: aujourd'hui)")

    p_add = sub.add_parser("add", help="Ajoute un improvement")
    p_add.add_argument("--title", required=True)
    p_add.add_argument("--impact", required=True, help="LOW/MEDIUM/HIGH/CRITICAL")
    p_add.add_argument("--effort", required=True, help="TRIVIAL/SMALL/MEDIUM/LARGE/XLARGE")
    p_add.add_argument("--lane", required=True, help="SAFE_AUTO/AUDIT_REQUIRED/HUMAN_REQUIRED/FORBIDDEN")
    p_add.add_argument("--type", default="feature")
    p_add.add_argument("--source", default="")
    p_add.add_argument("--files", default="", help="Liste séparée par virgules")
    p_add.add_argument("--acceptance", default="")
    p_add.add_argument("--domain", default="", help="rocky_moteur/ia_apprentissage/studio/jeux")
    p_add.add_argument("--notes", default="")
    p_add.add_argument("--session", default="")

    sub.add_parser("metrics", help="Affiche la progression")

    args = parser.parse_args()

    ledger_path = find_ledger()
    args.ledger_path = ledger_path
    data = load_ledger(ledger_path)

    dispatch = {
        "recall": cmd_recall,
        "propose": cmd_propose,
        "close": cmd_close,
        "add": cmd_add,
        "metrics": cmd_metrics,
    }
    dispatch[args.command](data, args)


if __name__ == "__main__":
    main()
