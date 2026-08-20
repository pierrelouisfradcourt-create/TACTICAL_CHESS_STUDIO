#!/usr/bin/env python3
"""
studio_context_builder.py — Genere STUDIO_CONTEXT.md depuis ledger + manifest.
Injecte en tete des prompts Mistral/Devstral. Regenere a chaque kaizen metrics.

Usage:
  python lab/chains/studio_context_builder.py build
  python lab/chains/studio_context_builder.py show
  python lab/chains/studio_context_builder.py inject --prompt path/to/prompt.md

Sortie: STUDIO_CONTEXT.md (racine du repo)
"""

import argparse
import sys
from datetime import date
from pathlib import Path

try:
    import yaml
except ImportError:
    print("[X] PyYAML manquant. Installer: pip install pyyaml")
    sys.exit(1)

# ── ASCII markers (Windows cp1252 safe) ─────────────────────
OK = "[OK]"
WARN = "[!]"
BLOCK = "[X]"

LEDGER_PATH = Path("lab/chains/IMPROVEMENT_LEDGER.yaml")
MANIFEST_PATH = Path("FILE_ROUTING_MANIFEST.yaml")
OUTPUT_PATH = Path("STUDIO_CONTEXT.md")

ACTIVE_STATUS = {"OPEN", "IN_PROGRESS", "BLOCKED"}

INJECT_START = "<!-- STUDIO_CONTEXT_INJECTED -->"
INJECT_END = "<!-- /STUDIO_CONTEXT -->"


# ── Path resolution ──────────────────────────────────────────

def _resolve(path):
    """Cherche path depuis cwd, puis depuis la racine du repo (2 niveaux au-dessus du script)."""
    p = Path(path)
    if p.exists():
        return p
    alt = Path(__file__).parent.parent.parent / p
    if alt.exists():
        return alt
    return p  # retourne tel quel pour un message d'erreur coherent


# ── Loaders ──────────────────────────────────────────────────

def load_ledger(ledger_path=None):
    path = _resolve(ledger_path or LEDGER_PATH)
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict) or "improvements" not in data:
        raise ValueError(f"Ledger malforme: {path}")
    return data


def load_manifest(manifest_path=None):
    path = _resolve(manifest_path or MANIFEST_PATH)
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict) or "routing" not in data:
        raise ValueError(f"Manifest malforme: {path}")
    return data


# ── Context builder (fonction pure) ─────────────────────────

def _lane_distribution(manifest):
    counts = {}
    for entry in manifest.get("routing", {}).get("tracked", []):
        lane = entry.get("lane", "NA")
        counts[lane] = counts.get(lane, 0) + 1
    return counts


def _latest_metrics(ledger):
    history = ledger.get("metrics_history", [])
    return history[-1] if history else None


def build_context(ledger, manifest):
    """Construit le texte STUDIO_CONTEXT.md depuis ledger + manifest. Fonction pure."""
    improvements = ledger.get("improvements", [])
    active = [imp for imp in improvements if imp.get("status") in ACTIVE_STATUS]
    meta = ledger.get("meta", {})
    metrics = _latest_metrics(ledger)
    lane_dist = _lane_distribution(manifest)

    lines = [
        "# STUDIO_CONTEXT — Tactical Chess Studio",
        "<!-- AUTO-GENERATED — ne pas modifier manuellement -->",
        f"<!-- Regenere le {date.today()} depuis IMPROVEMENT_LEDGER.yaml + FILE_ROUTING_MANIFEST.yaml -->",
        "",
        f"**Ledger version:** {meta.get('ledger_version', 'v0')}  ",
        f"**Derniere mise a jour:** {meta.get('last_updated_session', '-')}  ",
        "**claim_verdict:** NO_CLAIM_ALLOWED",
        "",
        "## Ameliorations actives",
        "",
        "| ID | Titre | Statut | Impact | Effort | Lane |",
        "|---|---|---|---|---|---|",
    ]

    for imp in active:
        lines.append(
            f"| {imp.get('id', '-')} "
            f"| {imp.get('title', '-')} "
            f"| {imp.get('status', '-')} "
            f"| {imp.get('impact', '-')} "
            f"| {imp.get('effort', '-')} "
            f"| {imp.get('lane', '-')} |"
        )

    if not active:
        lines.append("| -- | Aucune amelioration active | -- | -- | -- | -- |")

    lines += [
        "",
        "## Distribution des lanes (manifest tracked)",
        "",
    ]
    for lane, count in sorted(lane_dist.items()):
        lines.append(f"- **{lane}**: {count} patterns")

    if metrics:
        lines += [
            "",
            "## Dernieres metriques (kaizen)",
            "",
            f"- **Session:** {metrics.get('session', '-')}",
            f"- **Total:** {metrics.get('total', '-')}",
            f"- **Open:** {metrics.get('open', '-')}",
            f"- **Closed:** {metrics.get('closed', '-')}",
            f"- **Tests verts:** {metrics.get('tests_green', '-')}",
            f"- **Commits:** {metrics.get('commits', '-')}",
        ]

    lines += [
        "",
        "## Regles absolues",
        "",
        "- claim_verdict: NO_CLAIM_ALLOWED",
        "- Aucun git write sans HumanGate",
        "- FORBIDDEN: push main, force push, dataset reset, broad refactor engine/search/neural",
        "- Lane FORBIDDEN: lab/datasets/teacher_samples.jsonl, lab/runs/, ml/train.py",
        "",
        "---",
        "*Genere par studio_context_builder.py (IMP-012)*",
    ]

    return "\n".join(lines) + "\n"


# ── Commandes CLI ────────────────────────────────────────────

def cmd_build(args):
    try:
        ledger = load_ledger()
        manifest = load_manifest()
    except (FileNotFoundError, ValueError, OSError) as e:
        print(f"{BLOCK} {e}")
        return 1

    context = build_context(ledger, manifest)
    OUTPUT_PATH.write_text(context, encoding="utf-8")
    print(f"{OK} STUDIO_CONTEXT.md ecrit ({len(context)} chars) -> {OUTPUT_PATH}")
    return 0


def cmd_show(args):
    try:
        ledger = load_ledger()
        manifest = load_manifest()
    except (FileNotFoundError, ValueError, OSError) as e:
        print(f"{BLOCK} {e}")
        return 1

    print(build_context(ledger, manifest), end="")
    return 0


def cmd_inject(args):
    prompt_path = Path(args.prompt)
    if not prompt_path.exists():
        print(f"{BLOCK} Prompt introuvable: {prompt_path}")
        return 1

    try:
        ledger = load_ledger()
        manifest = load_manifest()
    except (FileNotFoundError, ValueError, OSError) as e:
        print(f"{BLOCK} {e}")
        return 1

    context = build_context(ledger, manifest)
    original = prompt_path.read_text(encoding="utf-8")

    # Retire une injection precedente si presente
    if INJECT_START in original and INJECT_END in original:
        start = original.index(INJECT_START)
        end = original.index(INJECT_END) + len(INJECT_END)
        original = original[end:].lstrip("\n")

    injected = f"{INJECT_START}\n{context}{INJECT_END}\n\n{original}"
    prompt_path.write_text(injected, encoding="utf-8")
    print(f"{OK} Contexte injecte dans {prompt_path}")
    return 0


# ── Entry point ──────────────────────────────────────────────

def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Genere STUDIO_CONTEXT.md depuis ledger + manifest."
    )
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("build", help="Genere STUDIO_CONTEXT.md dans la racine du repo")
    sub.add_parser("show", help="Affiche le contexte sur stdout")
    p_inject = sub.add_parser("inject", help="Injecte le contexte en tete d'un prompt")
    p_inject.add_argument("--prompt", required=True, help="Chemin du fichier prompt cible")

    args = parser.parse_args(argv)
    if not args.command:
        parser.print_help()
        return 0

    dispatch = {"build": cmd_build, "show": cmd_show, "inject": cmd_inject}
    return dispatch[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
