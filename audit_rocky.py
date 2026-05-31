#!/usr/bin/env python3
"""
audit_rocky.py — Audit READ-ONLY de l'état réel du repo vs les claims des docs.

But : produire la vérité terrain pour trancher le chantier (EvaluationSystem ?),
parce que les docs ont pu drifter après la migration PC + switch GPT->Claude.

Ce script NE FAIT QUE :
  - lire l'état git (rev-parse, status, log, branch)  -> read-only
  - vérifier l'existence de fichiers                  -> read-only
  - grep des symboles dans les sources               -> read-only
  - lire des artefacts JSON                           -> read-only

Il N'EXÉCUTE PAS ton runtime, ne touche AUCUN fichier, ne push rien.

Usage (Windows, depuis la racine du repo) :
    .\.venv312\Scripts\python.exe audit_rocky.py
ou  python audit_rocky.py --root C:\chemin\vers\repo

Colle-moi la sortie complète et on attaque sur du concret.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def hr(title=""):
    line = "=" * 72
    if title:
        print(f"\n{line}\n  {title}\n{line}")
    else:
        print(line)

def run_git(args, root):
    try:
        out = subprocess.run(
            ["git", *args],
            cwd=root, capture_output=True, text=True, timeout=20
        )
        return (out.stdout or out.stderr).strip()
    except Exception as e:
        return f"<git error: {e}>"

def exists(root, rel):
    return (root / rel).exists()

def grep_count(root, rel, pattern, flags=re.IGNORECASE):
    """Compte les lignes matchant un pattern dans un fichier. -1 si absent."""
    p = root / rel
    if not p.exists():
        return -1
    try:
        txt = p.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return -2
    return len(re.findall(pattern, txt, flags))

def grep_tree(root, subdir, pattern, exts, flags=re.IGNORECASE):
    """Cherche un pattern dans une arbo. Retourne liste (fichier, n_matches)."""
    base = root / subdir
    hits = []
    if not base.exists():
        return hits
    rx = re.compile(pattern, flags)
    for p in base.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in exts:
            continue
        try:
            txt = p.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        n = len(rx.findall(txt))
        if n:
            hits.append((str(p.relative_to(root)), n))
    return sorted(hits, key=lambda x: -x[1])

def status_mark(b):
    return "OUI " if b else "NON "

# --------------------------------------------------------------------------
# Sections d'audit
# --------------------------------------------------------------------------

def audit_git(root):
    hr("1. VÉRITÉ GIT (les docs disent 'verify live')")
    print("HEAD              :", run_git(["rev-parse", "HEAD"], root))
    print("Branche/ahead     :", run_git(["status", "--short", "--branch"], root).splitlines()[:1])
    dirty = run_git(["status", "--porcelain"], root)
    n_dirty = len([l for l in dirty.splitlines() if l.strip()])
    print(f"Fichiers modifiés : {n_dirty}")
    print("5 derniers commits:")
    for line in run_git(["log", "--oneline", "-5"], root).splitlines():
        print("   ", line)
    # Commit de stabilisation cité dans les docs
    stab = "da0a86d0c922f79fa4fbbd955058b5a51df1fee9"
    found = run_git(["cat-file", "-t", stab], root)
    print(f"Commit stabilisation docs ({stab[:10]}…) présent : {found == 'commit'}")

def audit_files(root):
    hr("2. FICHIERS CLAMÉS PAR LES DOCS (existent-ils vraiment ?)")
    claimed = [
        # Rust runtime
        "src/engine/engine.rs",
        "src/chess/search.rs",
        "src/chess/decision.rs",
        "src/chess/search_diagnostics_builders.rs",  # créé via AM-SEARCH-12
        "src/chess/fen.rs",
        "src/tool/cli.rs",
        "src/agents/neural_agent.rs",
        "src/simulation/teacher_uci_runner.rs",
        "src/ml/dataset_export.rs",
        # Python ML
        "ml/dataset_loader.py",
        "ml/dataset_decision_router.py",
        "ml/adaptive_dataset.py",
        "ml/dataset_audit.py",
        "ml/export_dataset_check.py",
        "ml/train.py",
        "ml/infer_policy.py",
        "ml/move_vocab.py",
        # Artefacts
        "lab/ACTIVE_DATASET.txt",
        "lab/reports/latest_benchmark_summary.json",
        "lab/reports/learning_progress.json",
        "lab/reports/conversion_suite_v1_latest.json",
    ]
    for rel in claimed:
        print(f"  [{status_mark(exists(root, rel))}] {rel}")

def audit_eval_system(root):
    hr("3. SYSTÈME D'ÉVALUATION (Issue #12 dit qu'il N'EXISTE PAS en first-class)")
    print("Recherche arena / rating / Elo / regression-guard dans tout le repo :")
    pats = {
        "arena":            r"\barena\b",
        "rating/elo":       r"\b(elo|rating)\b",
        "regression guard": r"regression[_-]?guard",
        "EvaluationSystem": r"evaluation[_-]?system|EvaluationSystem",
    }
    any_hit = False
    for label, pat in pats.items():
        hits = grep_tree(root, ".", pat, {".rs", ".py"})
        # on ignore les .md (docs) pour ne mesurer que le CODE
        hits = [h for h in hits if not h[0].endswith(".md")]
        if hits:
            any_hit = True
            print(f"\n  '{label}' -> {len(hits)} fichier(s) code:")
            for f, n in hits[:8]:
                print(f"      {n:>3}x  {f}")
        else:
            print(f"\n  '{label}' -> AUCUN match dans le code")
    print("\n  >> Si surtout des scripts épars et pas de module dédié,")
    print("     l'Issue #12 tient : pas d'EvaluationSystem first-class. C'est LE chantier.")

def audit_learning_reality(root):
    hr("4. RÉALITÉ DE L'APPRENTISSAGE (Issue #4 : amélioration jamais démontrée)")
    lp = root / "lab/reports/learning_progress.json"
    if lp.exists():
        try:
            data = json.loads(lp.read_text(encoding="utf-8", errors="replace"))
            for key in ("solved_weakness_count", "improvement_rate"):
                print(f"  learning_progress.{key} = {data.get(key, '<absent>')}")
            print("  >> Si solved=0 et rate=0.0, la boucle adaptative n'a rien prouvé.")
        except Exception as e:
            print(f"  <lecture impossible: {e}>")
    else:
        print("  learning_progress.json absent — claim de progrès non vérifiable.")

def audit_benchmark(root):
    hr("5. BENCHMARK (Issue #6 : dernier run = timeout)")
    bm = root / "lab/reports/latest_benchmark_summary.json"
    if bm.exists():
        try:
            data = json.loads(bm.read_text(encoding="utf-8", errors="replace"))
            for key in ("benchmark_status", "run_classification",
                        "promotion_eligible", "games", "timeout_seconds"):
                print(f"  {key} = {data.get(key, '<absent>')}")
        except Exception as e:
            print(f"  <lecture impossible: {e}>")
    else:
        print("  latest_benchmark_summary.json absent.")

def audit_engine_drift(root):
    hr("6. RÉCONCILIATION 01 vs 07 (FEN / Zobrist / make_move)")
    eng = "src/engine/engine.rs"
    print(f"  Dans {eng} :")
    checks = {
        "current_repetition_key (Zobrist attendu en 07)": r"current_repetition_key",
        "zobrist":                                        r"zobrist",
        "make_move (le 'next ceiling')":                  r"\bmake_move\b",
        "unmake_move":                                    r"\bunmake_move\b",
        "engine.clone() (le root clone d'Issue #2)":      r"\.clone\(\)",
    }
    for label, pat in checks.items():
        n = grep_count(root, eng, pat)
        tag = "absent fichier" if n < 0 else f"{n} occurrence(s)"
        print(f"    {label:<48} -> {tag}")
    print("  >> Confirme si 07 (FEN fidèle + Zobrist) est vrai et 01 périmé.")

def audit_training_gate(root):
    hr("7. PORTE DE TRAINING (docs : BLOCKED, aucune ligne admissible)")
    for rel, pat, label in [
        ("ml/train.py", r"def\s+\w*train\w*\s*\(", "fonctions train()"),
        ("ml/train.py", r"optimizer|\.backward\(|loss", "backprop/optimizer/loss"),
        ("ml/dataset_loader.py", r"validate_\w*admission|TeacherDataset", "gate admission"),
    ]:
        n = grep_count(root, rel, pat)
        tag = "absent fichier" if n < 0 else f"{n} match"
        print(f"  {rel:<28} {label:<26} -> {tag}")
    print("  >> Vérifie que la plomberie de training existe mais est passive/gated.")

def audit_selfplay(root):
    hr("8. SELF-PLAY (le plan d'avant : existe-t-il déjà un embryon ?)")
    hits = grep_tree(root, ".", r"self[_-]?play", {".rs", ".py"})
    hits = [h for h in hits if not h[0].endswith(".md")]
    if hits:
        for f, n in hits[:10]:
            print(f"  {n:>3}x  {f}")
    else:
        print("  Aucune mention 'self_play' dans le code (.rs/.py).")
    print("  >> Confirme que la boucle self-play est à construire from scratch.")

# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Audit read-only du repo Rocky.")
    ap.add_argument("--root", default=".", help="Racine du repo (defaut: dossier courant)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    hr("AUDIT ROCKY — READ-ONLY")
    print("Racine          :", root)
    print("Est un repo git :", (root / ".git").exists())
    if not (root / ".git").exists():
        print("\n[!] Pas de .git ici. Lance depuis la racine du repo ou passe --root.")

    audit_git(root)
    audit_files(root)
    audit_eval_system(root)
    audit_learning_reality(root)
    audit_benchmark(root)
    audit_engine_drift(root)
    audit_training_gate(root)
    audit_selfplay(root)

    hr("FIN — colle toute cette sortie dans le chat")

if __name__ == "__main__":
    main()
