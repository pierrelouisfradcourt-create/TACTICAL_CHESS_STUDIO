"""
ORPHAN-GATE SIM V0.3 -- PHASE 1 ajoute une classification de STATUT par-dessus le
detecteur V02, SANS toucher a sa logique de detection (import direct de V02, aucune
copie divergente). SIMULATION UNIQUEMENT, aucune autorite reelle activee.

Ne modifie AUCUN fichier hors lab/forge_evidence/ORPHAN_GATE_SIM_V03/. Ne modifie PAS
ORPHAN_GATE_SIM_V01/ ni ORPHAN_GATE_SIM_V02/ (baselines intactes, importees telles
quelles). Ne cree aucun registre global, aucune liste manuelle nouvelle : tous les
signaux mecaniques utilises proviennent de fichiers deja presents dans le depot
(declaration_watchlist.json) ou de commandes git executees a la volee (jamais ecrites
dans un fichier de suivi permanent).

Usage:
    python orphan_gate_sim_v3.py            -> sweep_worktree V02 + classification V03
"""
from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
V03_DIR = Path(__file__).resolve().parent
V02_PATH = REPO / "lab" / "forge_evidence" / "ORPHAN_GATE_SIM_V02" / "orphan_gate_sim_v2.py"

# ---------------------------------------------------------------------------
# Import V02 SANS le modifier -- reutilisation directe de son code, pas une copie.
# ---------------------------------------------------------------------------
_spec = importlib.util.spec_from_file_location("orphan_gate_sim_v2", V02_PATH)
v2 = importlib.util.module_from_spec(_spec)
sys.modules["orphan_gate_sim_v2"] = v2
_spec.loader.exec_module(v2)


# ---------------------------------------------------------------------------
# Signaux mecaniques (aucun n'est un jugement -- tous nommes, tous reproductibles)
# ---------------------------------------------------------------------------
def sh(args):
    r = subprocess.run(args, cwd=REPO, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stdout


def git_symbol_history(symbol_name: str, filepath: str):
    """git log -S<symbol> sur <filepath> : dates (les plus recentes en premier).
    Retourne (first_seen_date, last_touched_date, commit_count) ou (None, None, 0)
    si git ne trouve rien (fichier non suivi, symbole jamais introduit via un diff
    textuel visible -- rare mais possible pour un fichier tout juste cree non commite)."""
    out = sh(["git", "log", f"-S{symbol_name}", "--format=%ad", "--date=short", "--", filepath])
    dates = [l.strip() for l in out.splitlines() if l.strip()]
    if not dates:
        return None, None, 0
    return dates[-1], dates[0], len(dates)


def has_test_mention(symbol_name: str) -> list[str]:
    """Grep mecanique du nom du symbole dans les fichiers de test connus du depot
    (tests/, *_test.py, *.test.mjs) -- meme convention de detection de chemin de test
    que is_test_path() de V02, reutilisee telle quelle (pas de nouvelle regle)."""
    hits = []
    for p in v2.iter_repo_files({".py", ".mjs"}, roots=[REPO / "scripts"]):
        rel = str(p.relative_to(REPO)).replace("\\", "/")
        if not v2.is_test_path(rel):
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if re.search(r"(^|[^A-Za-z0-9_$])" + re.escape(symbol_name) + r"([^A-Za-z0-9_$]|$)", text):
            hits.append(rel)
    return hits


_WATCHLIST_TEXT_CACHE = None


def watchlist_mentions(symbol_name: str) -> bool:
    """Le symbole est-il cite NOMMEMENT dans scripts/forge/declaration_watchlist.json
    (fichier DEJA existant, deja ratifie, pas une creation V03) ? Lecture seule."""
    global _WATCHLIST_TEXT_CACHE
    if _WATCHLIST_TEXT_CACHE is None:
        wl = REPO / "scripts" / "forge" / "declaration_watchlist.json"
        _WATCHLIST_TEXT_CACHE = wl.read_text(encoding="utf-8", errors="replace") if wl.exists() else ""
    return symbol_name in _WATCHLIST_TEXT_CACHE


def days_between(d1: str, d2: str) -> int | None:
    if not d1 or not d2:
        return None
    from datetime import date
    y1, m1, day1 = (int(x) for x in d1.split("-"))
    y2, m2, day2 = (int(x) for x in d2.split("-"))
    return abs((date(y2, m2, day2) - date(y1, m1, day1)).days)


TODAY = "2026-08-07"  # date de session declaree (currentDate), pas une horloge devinee


# ---------------------------------------------------------------------------
# PHASE 1 -- classification de statut par symbole signale
# ---------------------------------------------------------------------------
def classify_status(flagged_result: dict) -> dict:
    artifact = flagged_result["artifact"]
    filepath = flagged_result["file"].rsplit(":", 1)[0]

    # --- declared_status : UNIQUEMENT depuis un marqueur explicite trouve dans le code
    not_wired = flagged_result.get("not_wired_self_declared", False)
    evidence = flagged_result.get("not_wired_evidence", [])
    if not_wired:
        declared_status = "EXPERIMENT"
        declared_basis = [f'prose auto-declaree: "{e["phrase"]}" -> {e["verbatim"]}' for e in evidence]
    else:
        declared_status = "UNKNOWN"
        declared_basis = ["aucun marqueur NOT_WIRED/PROOF_STATES/prose equivalente trouve dans docstring+commentaire"]

    # --- signaux mecaniques nommes (Phase 1, barème de confiance) ---
    test_hits = has_test_mention(artifact)
    first_seen, last_touched, n_commits = git_symbol_history(artifact, filepath)
    age_days = days_between(last_touched, TODAY) if last_touched else None
    life_span_days = days_between(first_seen, last_touched) if (first_seen and last_touched) else None
    in_watchlist = watchlist_mentions(artifact)

    signals = []
    if not_wired:
        signals.append("prose_marker")
    if in_watchlist:
        signals.append("declaration_watchlist_mention")
    if test_hits:
        signals.append("exercised_by_test_only")
    if age_days is not None and age_days <= 14:
        signals.append(f"recent_last_touch<=14d({age_days}d)")
    if age_days is not None and age_days > 60 and not test_hits and not not_wired and not in_watchlist:
        signals.append(f"old_and_silent>60d({age_days}d)")
    if n_commits <= 1 and first_seen is not None:
        signals.append("single_commit_introduction")

    # --- inferred_status : derive UNIQUEMENT des signaux ci-dessus, jamais du texte ---
    if not_wired or in_watchlist:
        inferred_status = "EXPERIMENT"
    elif test_hits and age_days is not None and age_days <= 30:
        inferred_status = "EXPERIMENT"
    elif test_hits and (age_days is None or age_days > 30):
        # teste mais dormant depuis >30j sans marqueur ni watchlist : signal ambigu,
        # ni assez fort pour OPERATIONAL (personne ne l'utilise en prod) ni pour
        # affirmer DEPRECATED (aucune preuve mecanique de suppression d'un appelant).
        inferred_status = "UNKNOWN"
    elif not test_hits and age_days is not None and age_days > 60:
        inferred_status = "UNKNOWN"  # silence total + ancien : signal faible, pas une preuve de "oublie"
    else:
        inferred_status = "UNKNOWN"

    # --- confidence : nombre de signaux concordants, barème documente ---
    n = len(signals)
    if n == 0:
        confidence = "none"
    elif n == 1:
        confidence = "low"
    elif n == 2:
        confidence = "medium"
    else:
        confidence = "high"

    # --- action : jamais une autorite reelle, une recommandation de revue humaine ---
    if inferred_status == "EXPERIMENT" and confidence in ("medium", "high"):
        action = "leave_as_experiment_no_block"
    elif inferred_status == "UNKNOWN" and (test_hits or in_watchlist):
        action = "needs_owner_review_signal_present_but_thin"
    elif inferred_status == "UNKNOWN":
        action = "needs_owner_review_no_signal"
    else:
        action = "needs_owner_review"

    return {
        "artifact": artifact,
        "artifact_type": flagged_result["file"].rsplit(".", 1)[-1].split(":")[0] if False else Path(filepath).suffix.lstrip("."),
        "producer": filepath,
        "consumer": "aucun (production) ; " + (f"{len(test_hits)} fichier(s) test: {', '.join(test_hits[:3])}" if test_hits else "aucun test non plus"),
        "declared_status": declared_status,
        "declared_status_basis": declared_basis,
        "inferred_status": inferred_status,
        "inferred_status_signals": signals,
        "confidence": confidence,
        "action": action,
        "_mechanical": {
            "first_seen": first_seen, "last_touched": last_touched,
            "commits_touching_symbol": n_commits, "age_days_since_last_touch": age_days,
            "life_span_days": life_span_days, "in_declaration_watchlist": in_watchlist,
            "test_files": test_hits,
        },
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    results, exclusion_counts = v2.mode_sweep_worktree()
    flagged = [r for r in results if r["would_block"]]
    classified = [classify_status(r) for r in flagged]
    out = {
        "results": results,
        "exclusion_counts": exclusion_counts,
        "status_classification": classified,
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
