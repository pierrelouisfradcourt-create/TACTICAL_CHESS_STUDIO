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
FORGE_RUNS = REPO_ROOT / "lab" / "forge_runs"

DEFAULT_TELEMETRY = FORGE_EVIDENCE / "forge_telemetry.jsonl"
DEFAULT_ERROR_JOURNAL = FORGE_REPORTS / "forge_error_journal.jsonl"
DEFAULT_LEDGER_PROPOSALS = FORGE_REPORTS / "forge_ledger_proposals.jsonl"
DEFAULT_PROJECT_PROPOSALS = FORGE_REPORTS / "forge_project_proposals.jsonl"
DEFAULT_BIBLE_PROPOSALS = FORGE_REPORTS / "forge_bible_proposals.jsonl"
# Tier 2.5 étape 2 : observabilité dédiée du pool de builders (Tier 2 #5) — sans ça,
# le pool reste une boîte noire. Un enregistrement par TENTATIVE s9-build (pas un
# agrégat par run) : c'est la granularité qui répond à « le pool sauve-t-il des
# tâches ? », « quels builders échouent toujours ? », « quelles stratégies marchent ? ».
DEFAULT_BUILDER_RUNS = FORGE_EVIDENCE / "forge_builder_runs.jsonl"


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


# --- Tier 2.5 étape 2 : observabilité du pool de builders (extension connecteur 3) --

def record_builder_run(
    run_id: str,
    *,
    tier: str | None,
    builder_id: str,
    strategy: str,
    duration_s: float,
    oracle_result: str,
    retry_number: int,
    tokens: int,
    cost_usd: float,
    telemetry_path: Path | None = None,
) -> None:
    """Trace UNE tentative s9-build : tier/modèle/stratégie/résultat d'oracle/coût.

    `strategy` ∈ {"tier_attempt", "pool_retry"} — premier essai à ce tier, ou retry
    du pool (Tier 2 #5) au MÊME tier. `oracle_result` = statut réel de s10a-oracle-code
    pour CETTE tentative (OK/FAIL/BLOCKED/""). Best-effort, jamais bloquant.
    """
    _append(
        telemetry_path or DEFAULT_BUILDER_RUNS,
        {
            "task_id": run_id, "tier": tier, "builder_id": builder_id,
            "strategy": strategy, "duration_s": duration_s, "oracle_result": oracle_result,
            "retry_number": retry_number, "tokens_estimated": tokens,
            "cost_estimated": cost_usd, "ts": time.time(),
        },
    )


def pool_stats(run_id: str, telemetry_path: Path | None = None) -> dict:
    """Agrège les tentatives s9-build d'un run : ce que le pool a réellement fait.

    - `pool_saves` : nb de retries du pool (Tier 2 #5) qui ont fini par OK — une
      tâche que l'escalade de modèle (plus chère) n'a pas eu besoin de traiter.
    - `escalations_avoided_cost_usd` : coût des tentatives pool_retry réussies —
      un ordre de grandeur de ce qu'une escalade aurait coûté en plus si le pool
      n'existait pas (approximation : pas un contrefactuel exact).
    - `by_builder` : {builder_id: {"OK":n, "FAIL":n, "BLOCKED":n}} — quels builders
      échouent toujours, sur CE run.
    """
    rows = [r for r in _read(telemetry_path or DEFAULT_BUILDER_RUNS) if r.get("task_id") == run_id]
    pool_rows = [r for r in rows if r.get("strategy") == "pool_retry"]
    pool_saves = sum(1 for r in pool_rows if r.get("oracle_result") == "OK")
    saved_cost = sum(float(r.get("cost_estimated", 0.0)) for r in pool_rows if r.get("oracle_result") == "OK")

    by_builder: dict[str, dict[str, int]] = {}
    for r in rows:
        b = by_builder.setdefault(r.get("builder_id", "?"), {})
        res = r.get("oracle_result") or "UNKNOWN"
        b[res] = b.get(res, 0) + 1

    return {
        "run_id": run_id,
        "attempts": len(rows),
        "pool_saves": pool_saves,
        "escalations_avoided_cost_usd": saved_cost,
        "by_builder": by_builder,
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


# --- Project Bible : mémoire de DÉCISION par projet (persistante entre runs) ----

# Où vit la bible d'un projet : à côté de son state.json, dans le run_dir stable par
# projet. C'est une mémoire de RÉFÉRENCE — un agent ne l'écrit jamais (il PROPOSE via
# propose_bible_entry ; Pierre ratifie). Le lecteur ci-dessous est branché en s0
# (mandatory_read) : la vision cesse d'être reconstruite à zéro à chaque run.

BIBLE_FILENAME = "PROJECT_BIBLE.md"


def project_bible(project: str, runs_root: Path | None = None) -> str:
    """Texte de la Project Bible d'un projet, ou "" si aucune (jamais une exception).

    Lu par l'étape 0 (s0-contrat) pour injecter vision/piliers/décisions validées et
    ABANDONNÉES (+ raisons) du projet dans le cadrage du run suivant. Absent = "" :
    un projet neuf n'a pas encore de bible, ce n'est pas une erreur.
    """
    path = (runs_root or FORGE_RUNS) / project / BIBLE_FILENAME
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def propose_bible_entry(
    project: str,
    kind: str,
    decision: str,
    rationale: str,
    proposals_path: Path | None = None,
) -> dict:
    """Propose une entrée de Project Bible issue d'un run. PROPOSE-ONLY.

    N'écrit JAMAIS la bible de référence : dépose une proposition que Pierre promeut
    (HumanGate) dans `lab/forge_runs/<projet>/PROJECT_BIBLE.md`. `kind` ∈
    {"validated","abandoned"} — une décision actée, ou une voie écartée + sa raison
    (la mémoire la plus précieuse : empêche un run futur de re-proposer un cul-de-sac).
    """
    if kind not in ("validated", "abandoned"):
        raise ValueError(f"kind doit valoir 'validated' ou 'abandoned', reçu {kind!r}")
    record = {
        "project": project,
        "kind": kind,
        "decision": decision,
        "rationale": rationale,
        "status": "PROPOSED",
        "ts": time.time(),
    }
    _append(proposals_path or DEFAULT_BIBLE_PROPOSALS, record)
    logger.info("proposition Project Bible déposée (%s) pour %s", kind, project)
    return record


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
