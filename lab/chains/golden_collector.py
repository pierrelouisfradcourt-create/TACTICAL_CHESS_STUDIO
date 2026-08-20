#!/usr/bin/env python3
"""
golden_collector.py — Archive les charters d'IMPs fermes dans golden_examples.jsonl.
Base du futur fine-tuning LoRA Devstral/Mistral.

Usage:
  python lab/chains/golden_collector.py collect --imp IMP-012
  python lab/chains/golden_collector.py collect --imp IMP-012 --report "rapport..."
  python lab/chains/golden_collector.py list
  python lab/chains/golden_collector.py show --imp IMP-012

Integration kaizen_autoloop.py (apres close_imp) :
  from golden_collector import archive_closed_imp
  archive_closed_imp(imp, charter_path, report)
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

# ── ASCII markers (Windows cp1252 safe) ─────────────────────
OK = "[OK]"
WARN = "[!]"
BLOCK = "[X]"

SCHEMA_VERSION = 1
CHARTER_DIR = Path("lab/chains/charters")
LEDGER_PATH = Path("lab/chains/IMPROVEMENT_LEDGER.yaml")
GOLDEN_PATH = Path("lab/chains/golden_examples.jsonl")


# ── Path resolution ──────────────────────────────────────────

def _repo_root():
    """Racine du repo : 2 niveaux au-dessus du script (lab/chains/ -> root)."""
    return Path(__file__).resolve().parent.parent.parent


def _resolve(path):
    p = Path(path)
    if p.exists():
        return p
    alt = _repo_root() / p
    if alt.exists():
        return alt
    return p


def _charter_path_for(imp_id):
    for base in [CHARTER_DIR, _repo_root() / CHARTER_DIR]:
        candidate = Path(base) / f"{imp_id}_charter.md"
        if candidate.exists():
            return candidate
    return None


# ── JSONL I/O ────────────────────────────────────────────────

def load_examples(output_path=None):
    """Charge golden_examples.jsonl -> liste de dicts."""
    path = _resolve(output_path or GOLDEN_PATH)
    if not path.exists():
        return []
    examples = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    examples.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return examples


def _save_examples(examples, output_path=None):
    path = Path(output_path or _resolve(GOLDEN_PATH))
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")


# ── Core function (appelable depuis autoloop) ────────────────

def archive_closed_imp(imp, charter_path, report="", output_path=None):
    """
    Archive un IMP ferme dans golden_examples.jsonl.
    Idempotente : ne duplique pas si imp_id deja present.

    Args:
        imp         : dict IMP du ledger
        charter_path: str ou Path vers le fichier charter
        report      : texte du rapport final (optionnel)
        output_path : chemin JSONL de sortie (None = defaut GOLDEN_PATH)
    """
    imp_id = imp.get("id", "UNKNOWN")
    resolved_output = Path(output_path) if output_path else _resolve(GOLDEN_PATH)

    # Deduplication
    existing = load_examples(resolved_output) if resolved_output.exists() else []
    if any(ex.get("imp_id") == imp_id for ex in existing):
        return False  # deja archive

    charter_content = ""
    if charter_path:
        p = Path(charter_path)
        if p.exists():
            charter_content = p.read_text(encoding="utf-8")

    entry = {
        "schema_version": SCHEMA_VERSION,
        "imp_id": imp_id,
        "imp_title": imp.get("title", ""),
        "lane": imp.get("lane", ""),
        "impact": imp.get("impact", ""),
        "effort": imp.get("effort", ""),
        "files": imp.get("files", []),
        "acceptance": imp.get("acceptance", ""),
        "charter": charter_content,
        "report_snippet": (report or "")[:500],
        "closed_session": imp.get("closed_session", ""),
        "collected_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "claim_verdict": "NO_CLAIM_ALLOWED",
    }

    existing.append(entry)
    _save_examples(existing, resolved_output)
    return True


# ── Commandes CLI ────────────────────────────────────────────

def cmd_collect(args):
    imp_id = args.imp.upper()
    report = getattr(args, "report", "") or ""

    # Charger le ledger pour les metadonnees IMP
    imp = None
    try:
        import yaml
        ledger_p = _resolve(LEDGER_PATH)
        with open(ledger_p, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        imps = data.get("improvements", [])
        imp = next((i for i in imps if i.get("id") == imp_id), None)
    except Exception as e:
        print(f"{WARN} Ledger inaccessible ({e}). Utilise infos minimales.")

    if imp is None:
        imp = {"id": imp_id, "title": imp_id}

    charter_p = _charter_path_for(imp_id)
    if charter_p is None:
        print(f"{BLOCK} Charter introuvable pour {imp_id} dans {CHARTER_DIR}")
        return 1

    archived = archive_closed_imp(imp, charter_p, report=report)
    if archived:
        print(f"{OK} {imp_id} archive dans golden_examples.jsonl")
    else:
        print(f"{WARN} {imp_id} deja present dans golden_examples.jsonl — ignore")
    return 0


def cmd_list(args):
    examples = load_examples()
    if not examples:
        print(f"{WARN} golden_examples.jsonl vide ou absent.")
        return 0
    print(f"{OK} {len(examples)} exemple(s) collecte(s) :")
    for ex in examples:
        session = ex.get("closed_session", "-")
        title = ex.get("imp_title", "-")
        lane = ex.get("lane", "-")
        print(f"  {ex['imp_id']:10s} | session={session} | lane={lane:15s} | {title[:50]}")
    return 0


def cmd_show(args):
    imp_id = args.imp.upper()
    examples = load_examples()
    ex = next((e for e in examples if e.get("imp_id") == imp_id), None)
    if ex is None:
        print(f"{BLOCK} {imp_id} non trouve dans golden_examples.jsonl")
        return 1
    print(json.dumps(ex, ensure_ascii=False, indent=2))
    return 0


# ── Entry point ──────────────────────────────────────────────

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Archive les charters d'IMPs fermes pour futur LoRA."
    )
    sub = parser.add_subparsers(dest="command")

    p_collect = sub.add_parser("collect", help="Archive un IMP ferme")
    p_collect.add_argument("--imp", required=True, help="ID de l'IMP (ex: IMP-012)")
    p_collect.add_argument("--report", default="", help="Texte du rapport final (optionnel)")

    sub.add_parser("list", help="Liste les exemples collectes")

    p_show = sub.add_parser("show", help="Affiche un exemple specifique")
    p_show.add_argument("--imp", required=True, help="ID de l'IMP a afficher")

    args = parser.parse_args(argv)
    if not args.command:
        parser.print_help()
        return 0

    dispatch = {"collect": cmd_collect, "list": cmd_list, "show": cmd_show}
    return dispatch[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
