"""
hg_queue.py — HumanGate Decision Log reader/writer.
Usage:
  python hg_queue.py list              # toutes les decisions
  python hg_queue.py list --pending    # PENDING uniquement
  python hg_queue.py add               # ajout interactif
"""

import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import argparse
from datetime import date
from pathlib import Path

try:
    import yaml as _yaml
except ImportError:
    print("pyyaml manquant — lancer: .\\.venv312\\Scripts\\python.exe -m pip install pyyaml")
    sys.exit(1)

LOG_PATH = Path("lab/chains/HUMANGATE_DECISION_LOG.yaml")

VALID_CATEGORIES = {
    "improvement_close", "routing_decision", "charter_approved",
    "lane_override", "manifest_update", "architecture_decision",
}
VALID_VERDICTS = {"APPROVED", "DEFERRED", "BLOCKED", "PENDING"}
SOURCE_STATE_FIELDS = ("created", "registered", "loaded", "enforced", "evidenced")


def load_log() -> dict:
    if not LOG_PATH.exists():
        print(f"[X] HUMANGATE_DECISION_LOG.yaml introuvable : {LOG_PATH}")
        sys.exit(1)
    try:
        with open(LOG_PATH, encoding="utf-8") as f:
            data = _yaml.safe_load(f)
        if not isinstance(data, dict):
            print("[X] YAML malformé : racine n'est pas un dictionnaire")
            sys.exit(1)
        return data
    except Exception as e:
        print(f"[X] Erreur lecture YAML : {e}")
        sys.exit(1)


def _fmt_source_state(ss: dict) -> str:
    if not ss:
        return "  source_state: (vide)"
    lines = ["  source_state:"]
    for field in SOURCE_STATE_FIELDS:
        val = ss.get(field) or "-"
        lines.append(f"    {field:<12}: {val}")
    return "\n".join(lines)


def cmd_list(pending_only: bool = False) -> None:
    data = load_log()
    decisions = data.get("decisions", [])

    if pending_only:
        decisions = [d for d in decisions if d.get("verdict") == "PENDING"]

    if not decisions:
        label = "PENDING " if pending_only else ""
        print(f"[OK] Aucune decision {label}trouvee.")
        return

    label = "PENDING " if pending_only else ""
    print(f"[OK] {len(decisions)} decision(s) {label}trouvee(s)\n")
    print("=" * 60)

    for d in decisions:
        vid = d.get("decision_id", "?")
        vtitle = d.get("title", "")
        vcat = d.get("category", "")
        vzone = d.get("zone", "")
        vverdict = d.get("verdict", "")
        vat = d.get("approved_at", "")
        vby = d.get("approved_by", "")
        vss = d.get("source_state") or {}
        vevs = d.get("evidence_refs") or []

        print(f"{vid} — {vtitle}")
        print(f"  category  : {vcat}")
        print(f"  zone      : {vzone}")
        print(f"  verdict   : {vverdict}")
        print(f"  approved  : {vby} @ {vat}")
        print(_fmt_source_state(vss))
        if vevs:
            print("  evidence:")
            for e in vevs:
                print(f"    - {e}")
        print()


def cmd_add() -> None:
    data = load_log()
    decisions = data.get("decisions", [])

    nums = []
    for d in decisions:
        try:
            nums.append(int(str(d.get("decision_id", "")).replace("HGD-", "")))
        except (ValueError, TypeError):
            pass
    new_id = f"HGD-{max(nums, default=0) + 1:03d}"

    print(f"[add] Nouvelle decision : {new_id}")
    title = input("  title > ").strip()
    if not title:
        print("[X] Titre vide — abandon")
        sys.exit(1)

    print(f"  categories : {', '.join(sorted(VALID_CATEGORIES))}")
    category = input("  category > ").strip()
    if category not in VALID_CATEGORIES:
        print(f"[!] Categorie '{category}' non standard — enregistree quand meme")

    zone = input("  zone (ex: lab/chains) > ").strip()

    print(f"  verdicts : {', '.join(sorted(VALID_VERDICTS))}")
    verdict = input("  verdict > ").strip().upper()
    if verdict not in VALID_VERDICTS:
        print(f"[!] Verdict '{verdict}' inconnu — PENDING par defaut")
        verdict = "PENDING"

    evidence = input("  evidence_ref (une ligne, laisser vide pour ignorer) > ").strip()
    today = str(date.today())

    new_decision = {
        "decision_id": new_id,
        "title": title,
        "category": category,
        "zone": zone,
        "surface": "canonical_docs",
        "source_state": {
            "created": today,
            "registered": today,
            "loaded": None,
            "enforced": None,
            "evidenced": None,
        },
        "verdict": verdict,
        "evidence_refs": [evidence] if evidence else [],
        "blocked_actions": [],
        "approved_by": "HumanGate",
        "approved_at": today,
    }

    decisions.append(new_decision)
    data["decisions"] = decisions

    with open(LOG_PATH, "w", encoding="utf-8") as f:
        _yaml.dump(data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)

    print(f"[OK] {new_id} ajoute dans {LOG_PATH}")


def main():
    parser = argparse.ArgumentParser(description="HumanGate Decision Log")
    sub = parser.add_subparsers(dest="cmd")

    p_list = sub.add_parser("list", help="Lister les decisions")
    p_list.add_argument("--pending", action="store_true", help="Filtrer PENDING uniquement")

    sub.add_parser("add", help="Ajouter une decision (interactif)")

    args = parser.parse_args()

    if args.cmd == "list":
        cmd_list(pending_only=args.pending)
    elif args.cmd == "add":
        cmd_add()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
