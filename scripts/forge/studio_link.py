"""Connecteurs studio de Forge — ADR-002 §3 (connecteurs 3/4/5/6).

Branche la boucle Forge sur les systèmes vivants du studio, en PROPOSE-ONLY :
tout est écrit sous ``lab/forge_evidence`` ou ``lab/reports/forge_*`` — JAMAIS
dans les mémoires de référence (le ledger, la liste des projets). Une écriture
durable exige un HumanGate séparé (promotion via kaizen_loop / édition Pierre).

- Connecteur 3 : télémétrie coût/tokens par appel + agrégat par run.
- Connecteur 4 : proposition d'entrée ledger en lane AUDIT_REQUIRED.
- Connecteur 5 : proposition d'enregistrement projet.
- Connecteur 6 : journal d'erreurs + pré-mortem (lu par l'étape 0 au run suivant).
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# scripts/forge/studio_link.py -> parents[2] == repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
FORGE_EVIDENCE = REPO_ROOT / "lab" / "forge_evidence"
FORGE_REPORTS = REPO_ROOT / "lab" / "reports"

DEFAULT_TELEMETRY = FORGE_EVIDENCE / "forge_telemetry.jsonl"
DEFAULT_ERROR_JOURNAL = FORGE_REPORTS / "forge_error_journal.jsonl"
DEFAULT_LEDGER_PROPOSALS = FORGE_REPORTS / "forge_ledger_proposals.jsonl"
DEFAULT_PROJECT_PROPOSALS = FORGE_REPORTS / "forge_project_proposals.jsonl"


def _append(path: Path, record: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def _read(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


# --- Connecteur 3 : télémétrie -------------------------------------------------

def record_telemetry(
    run_id: str,
    etape: str,
    model: str,
    tokens: int,
    duration_s: float,
    telemetry_path: Path | None = None,
) -> None:
    """Trace le coût d'un appel (tokens/durée/modèle). Local = 0 €, on ne compte que tokens+durée."""
    _append(
        telemetry_path or DEFAULT_TELEMETRY,
        {"run_id": run_id, "etape": etape, "model": model,
         "tokens": tokens, "duration_s": duration_s, "ts": time.time()},
    )


def run_cost(run_id: str, telemetry_path: Path | None = None) -> dict:
    """Agrège le coût d'un run : nb d'appels, tokens totaux, durée totale."""
    rows = [r for r in _read(telemetry_path or DEFAULT_TELEMETRY) if r.get("run_id") == run_id]
    return {
        "run_id": run_id,
        "calls": len(rows),
        "total_tokens": sum(int(r.get("tokens", 0)) for r in rows),
        "total_duration_s": sum(float(r.get("duration_s", 0.0)) for r in rows),
    }


# --- Connecteur 6 : journal d'erreurs + pré-mortem -----------------------------

# Scope d'une leçon TRANSVERSALE (méthode), lue au pré-mortem de TOUT projet.
# Paie la dette #1 (silo par projet) : la leçon « oracle doit tester la solvabilité »
# apprise sur un jeu doit atteindre les suivants.
GLOBAL_SCOPE = "_global_"


def record_error(
    run_id: str,
    etape: str,
    error: str,
    project: str,
    journal_path: Path | None = None,
) -> None:
    """Journalise une erreur/finding red-team d'un run (best-effort, non bloquant)."""
    _append(
        journal_path or DEFAULT_ERROR_JOURNAL,
        {"run_id": run_id, "etape": etape, "project": project, "error": error, "ts": time.time()},
    )


def record_global_lesson(etape: str, lesson: str, journal_path: Path | None = None) -> None:
    """Consigne une leçon de MÉTHODE transversale (lue au pré-mortem de tout projet)."""
    record_error("_method_", etape, lesson, GLOBAL_SCOPE, journal_path=journal_path)


def premortem(project: str, journal_path: Path | None = None, limit: int = 5) -> list[str]:
    """Erreurs du projet + leçons GLOBALES de méthode — lu à l'étape 0 (« PILOU »).

    Les leçons globales (préfixées ⚑) circulent vers TOUS les projets, ce qui ferme
    le silo par projet : un enseignement appris ailleurs n'est plus perdu ici.
    """
    rows = _read(journal_path or DEFAULT_ERROR_JOURNAL)
    proj = [r for r in rows if r.get("project") == project]
    glob = [r for r in rows if r.get("project") == GLOBAL_SCOPE]
    out = [f"⚑ [{r.get('etape')}] {r.get('error')}" for r in glob[-limit:]]
    out += [f"[{r.get('etape')}] {r.get('error')}" for r in proj[-limit:]]
    return out


# --- Connecteur 4 : proposition ledger (AUDIT_REQUIRED, jamais d'auto-write) ----

def propose_ledger_entry(
    run_id: str,
    project: str,
    verdict: dict,
    proposals_path: Path | None = None,
) -> dict:
    """Propose une entrée ledger issue d'un run Forge. PROPOSE-ONLY, lane AUDIT_REQUIRED.

    N'écrit JAMAIS le ledger : dépose une proposition que Pierre promeut via HumanGate.
    """
    # Signal de promotion CANONIQUE : software_verdict seul ne distingue pas un OK
    # propre d'un OK-avec-objection (survivant trié = software OK mais decision
    # WITH_OBJECTION). La proposition transporte `clean_pass` pour qu'un promoteur
    # futur ne clé JAMAIS sur software_verdict seul. Import local : évite tout cycle.
    from forge.verdict import is_clean_pass
    record = {
        "run_id": run_id,
        "project": project,
        "lane": "AUDIT_REQUIRED",
        "status": "PROPOSED",
        "software_verdict": verdict.get("software_verdict"),
        "decision": verdict.get("decision"),
        "clean_pass": is_clean_pass(verdict),
        "evidence_verdict": verdict.get("evidence_verdict"),
        "claim_verdict": verdict.get("claim_verdict", "NO_CLAIM_ALLOWED"),
        "ts": time.time(),
    }
    _append(proposals_path or DEFAULT_LEDGER_PROPOSALS, record)
    logger.info("proposition ledger déposée (AUDIT_REQUIRED) pour run %s", run_id)
    return record


# --- Connecteur 5 : proposition projet (jamais d'auto-write de la liste) --------

def propose_project_record(
    project: str,
    stage: str,
    folder: str,
    proposals_path: Path | None = None,
) -> dict:
    """Propose l'enregistrement/MAJ d'un projet forgé. PROPOSE-ONLY.

    N'écrit JAMAIS la liste des projets de référence : dépose une proposition.
    """
    record = {"project": project, "stage": stage, "folder": folder,
              "status": "PROPOSED", "ts": time.time()}
    _append(proposals_path or DEFAULT_PROJECT_PROPOSALS, record)
    return record
