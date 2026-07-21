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

import argparse
import json
import logging
import time
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

# scripts/forge/studio_link.py -> parents[2] == repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
FORGE_EVIDENCE = REPO_ROOT / "lab" / "forge_evidence"
FORGE_REPORTS = REPO_ROOT / "lab" / "reports"
FORGE_RUNS = REPO_ROOT / "lab" / "forge_runs"

DEFAULT_TELEMETRY = FORGE_EVIDENCE / "forge_telemetry.jsonl"
# Journal MONOLITHE historique (pré-refactor par domaine). Conservé INTACT : il
# contient les vraies leçons (collect_runner/breakout/shmup, tous jeux HTML) + les
# leçons globales de méthode. On ne le RÉÉCRIT jamais — il sert de FALLBACK-LECTURE
# (voir `premortem`) pour ne rien perdre pendant la migration.
DEFAULT_ERROR_JOURNAL = FORGE_REPORTS / "forge_error_journal.jsonl"
# Refactor connecteur 6 : journaux PAR DOMAINE sous lab/reports/error_journal/.
# Isole les leçons par nature de cible (un run rust ne lit pas les leçons html) pour
# éviter qu'un agent tire une leçon hors-sujet d'un monolithe indifférencié.
DOMAIN_JOURNAL_DIR = FORGE_REPORTS / "error_journal"
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

# Domaines de journal connus (extensible : ajouter une entrée suffit). Chaque domaine
# a son propre fichier error_journal/<domaine>.jsonl. `GLOBAL_SCOPE` est un domaine à
# part entière : les leçons de MÉTHODE transversales y vivent et sont lues quel que
# soit le domaine demandé.
KNOWN_DOMAINS: list[str] = ["html", "python", "rust", "godot", "forge", "playtest", GLOBAL_SCOPE]

# Domaines pour lesquels on lit AUSSI le monolithe historique en fallback. Ses vraies
# entrées sont TOUTES des jeux HTML (collect_runner/breakout/shmup) : on ne les rejoue
# que pour un run html/forge, JAMAIS pour un run rust/godot (sinon on polluerait un run
# d'un autre domaine avec des leçons hors-sujet). Choix NON-DESTRUCTIF : fallback-lecture
# plutôt que migration ponctuelle du fichier (voir note de migration dans premortem).
LEGACY_FALLBACK_DOMAINS: frozenset[str] = frozenset({"html", "forge"})

# Domaine par défaut d'un run Forge quand aucun n'est précisé. `forge` = plomberie de
# la boucle elle-même (contrats, oracles, driver) — cohérent avec l'ancien défaut.
DEFAULT_DOMAIN = "forge"

# Domaine dédié aux retours de playtest Pierre (R2, FORGE_V2_CONSOLIDATION.md §4-A).
# Servi comme GLOBAL_SCOPE — TOUJOURS lu au pré-mortem, quel que soit le `domain`
# demandé par l'appelant (voir `premortem`) : un retour de playtest ne doit jamais
# dépendre du domaine (html/forge/rust/godot...) du run qui consulte, sinon il
# s'évapore silencieusement (constat P6 : 0 fichier de playtest, jamais consigné).
PLAYTEST_DOMAIN = "playtest"


def _domain_journal_path(domain: str) -> Path:
    """Chemin du journal d'un domaine sous error_journal/<domaine>.jsonl."""
    return DOMAIN_JOURNAL_DIR / f"{domain}.jsonl"


def record_error(
    run_id: str,
    etape: str,
    error: str,
    project: str,
    journal_path: Path | None = None,
    resolution: str | None = None,
    domain: str = DEFAULT_DOMAIN,
) -> None:
    """Journalise une erreur/finding red-team d'un run (best-effort, non bloquant).

    2 colonnes : l'échec (`error`) ET, si connue, sa réparation (`resolution` — la
    « 2e colonne » : COMMENT on a réparé). Une entrée avec `resolution` non vide est
    marquée ``status="fixed"`` ; sans, ``status="open"``. Ces deux champs sont
    RÉTROCOMPATIBLES : les entrées historiques du journal (sans `resolution`/`status`)
    restent lisibles telles quelles par `premortem`.

    Routage : `domain` route vers error_journal/<domain>.jsonl (isolation par nature de
    cible). Un `journal_path` EXPLICITE PRIME toujours sur le routage par domaine — c'est
    la garantie de rétrocompat : les appels existants qui passent `journal_path=` écrivent
    exactement où avant, `domain` est simplement ignoré dans ce cas.
    """
    target = journal_path or _domain_journal_path(domain)
    _append(
        target,
        # `date` = date LISIBLE ISO (recherche/tri/purge humaine, ex. « voir les fixes
        # d'il y a un an ») ; `ts` = timestamp machine conservé pour l'ordre exact.
        {"run_id": run_id, "etape": etape, "project": project, "error": error,
         "resolution": resolution, "status": "fixed" if resolution else "open",
         "date": datetime.now().isoformat(timespec="seconds"), "ts": time.time()},
    )


def record_fix(
    run_id: str,
    etape: str,
    error: str,
    resolution: str,
    project: str,
    journal_path: Path | None = None,
    domain: str = DEFAULT_DOMAIN,
) -> None:
    """Consigne en UNE entrée l'erreur ET sa réparation — la « 2e colonne ».

    À utiliser quand un échec d'étape a été RÉPARÉ dans le run : le journal apprend
    ainsi la RÉPARATION (pas seulement l'échec), et le pré-mortem du run suivant peut
    surfacer « voici comment on a corrigé ce problème la dernière fois ». Équivaut à
    `record_error(..., resolution=resolution)` : `status="fixed"`, `resolution` renseigné.
    `domain` route comme dans `record_error` ; `journal_path` explicite prime.
    """
    record_error(run_id, etape, error, project, journal_path=journal_path,
                 resolution=resolution, domain=domain)


def record_playtest(
    project: str,
    constat: str,
    regle_observable: str,
    run_id: str = "playtest",
    journal_path: Path | None = None,
) -> None:
    """Capture un playtest Pierre (R2, FORGE_V2_CONSOLIDATION.md §4-A) : `constat`
    (ce qui a été observé en jeu) -> `regle_observable` (la contrainte que le run
    SUIVANT doit respecter). Avant R2, un retour de playtest était une conversation
    qui s'évaporait (0 fichier — constat P6). Ce helper route CE type de
    connaissance vers le canal DÉJÀ prouvé (error_journal + pré-mortem, card_engine)
    plutôt que d'inventer un nouveau mécanisme : réutilise `record_error` (même
    signature, mêmes garanties best-effort), domaine dédié `PLAYTEST_DOMAIN`.

    `regle_observable` est passée comme `resolution` de `record_error` : la 2e
    colonne du journal (affichée « → ✅ RÉPARÉ: <règle> » par `_format_entry`) porte
    ainsi la contrainte actionnable, pas seulement le constat — exactement le
    mécanisme déjà prouvé pour une réparation d'erreur, réutilisé tel quel pour un
    playtest (même esprit que `record_fix`).
    """
    record_error(
        run_id, "playtest", constat, project,
        journal_path=journal_path, resolution=regle_observable, domain=PLAYTEST_DOMAIN,
    )


def record_global_lesson(etape: str, lesson: str, journal_path: Path | None = None) -> None:
    """Consigne une leçon de MÉTHODE transversale (lue au pré-mortem de tout projet).

    Écrit dans le domaine `_global_` (error_journal/_global_.jsonl) : ces leçons sont
    relues quel que soit le domaine demandé au pré-mortem. `journal_path` explicite prime.
    """
    record_error("_method_", etape, lesson, GLOBAL_SCOPE,
                 journal_path=journal_path, domain=GLOBAL_SCOPE)


def _format_entry(row: dict, prefix: str = "") -> str:
    """Ligne de pré-mortem pour une entrée de journal, réparation incluse si connue.

    Tolère les vieilles entrées SANS clé `resolution`/`status` (accès via .get). Une
    résolution non vide ajoute « → ✅ RÉPARÉ: <resolution> » (la 2e colonne).
    """
    base = f"{prefix}[{row.get('etape')}] {row.get('error')}"
    resolution = row.get("resolution")
    if resolution:
        return f"{base} → ✅ RÉPARÉ: {resolution}"
    return base


def premortem(
    project: str,
    domain: str | None = None,
    journal_path: Path | None = None,
    limit: int = 5,
) -> list[str]:
    """Erreurs du projet + leçons GLOBALES de méthode — lu à l'étape 0 (« PILOU »).

    Les leçons globales (préfixées ⚑) circulent vers TOUS les projets, ce qui ferme
    le silo par projet : un enseignement appris ailleurs n'est plus perdu ici. Quand
    une entrée porte une réparation (`resolution`), le pré-mortem la fait apparaître
    (« → ✅ RÉPARÉ: … ») pour que le run suivant apprenne la RÉPARATION, pas juste
    l'échec. Les vieilles entrées sans `resolution`/`status` restent surfacées inchangées.

    Deux modes :
    - `journal_path` fourni → mode RÉTROCOMPAT : lit ce SEUL fichier (projet + global
      dedans), comportement identique à l'ancien pré-mortem. `domain` est ignoré.
    - `journal_path=None` → mode DOMAINE : lit TOUJOURS le journal `_global_` (leçons
      transversales) PLUS, si `domain` est fourni, le journal de ce domaine (entrées du
      `project`). Pour un domaine à fallback (html/forge) ET pour les leçons globales, on
      relit AUSSI le monolithe historique (NON-DESTRUCTIF) afin de ne perdre aucune leçon
      déjà accumulée. Un run rust/godot ne voit jamais les vieilles leçons html du monolithe.

    Note de migration (choix assumé) : FALLBACK-LECTURE, pas migration ponctuelle. Le
    monolithe `forge_error_journal.jsonl` reste intact et lisible ; on ne le réécrit ni ne
    le déplace. Avantage : zéro risque de perte/corruption de données réelles, réversible.
    Coût : une lecture de plus pour les domaines html/forge — négligeable.
    """
    if journal_path is not None:
        rows = _read(journal_path)
        proj = [r for r in rows if r.get("project") == project]
        glob = [r for r in rows if r.get("project") == GLOBAL_SCOPE]
        out = [_format_entry(r, prefix="⚑ ") for r in glob[-limit:]]
        out += [_format_entry(r) for r in proj[-limit:]]
        return out

    # Mode domaine : leçons globales (journal dédié + fallback monolithe global).
    glob = list(_read(_domain_journal_path(GLOBAL_SCOPE)))
    glob += [r for r in _read(DEFAULT_ERROR_JOURNAL) if r.get("project") == GLOBAL_SCOPE]

    proj: list[dict] = []
    if domain is not None:
        proj += [r for r in _read(_domain_journal_path(domain)) if r.get("project") == project]
        if domain in LEGACY_FALLBACK_DOMAINS:
            proj += [r for r in _read(DEFAULT_ERROR_JOURNAL) if r.get("project") == project]

    # R2 : le domaine `playtest` est TOUJOURS servi (même traitement que
    # GLOBAL_SCOPE) — le driver n'appelle premortem qu'avec UN SEUL domaine à la
    # fois (ForgeDriver._domain -> "html" ou "forge"), donc sans cet ajout un
    # retour de playtest resterait filtré hors de la vue du run suivant et
    # s'évaporerait quand même. Pas de double-lecture si `playtest` est déjà le
    # domaine explicitement demandé.
    if domain != PLAYTEST_DOMAIN:
        proj += [r for r in _read(_domain_journal_path(PLAYTEST_DOMAIN)) if r.get("project") == project]

    out = [_format_entry(r, prefix="⚑ ") for r in glob[-limit:]]
    out += [_format_entry(r) for r in proj[-limit:]]
    return out


# --- Index des journaux par domaine (déterministe, non-LLM) --------------------

INDEX_FILENAME = "INDEX.generated.md"


def _count_entries(path: Path) -> int:
    """Nombre de lignes JSON non vides d'un journal (0 si absent)."""
    return len(_read(path))


def list_journals(reports_dir: Path | None = None) -> list[dict]:
    """Index léger des journaux par domaine : un dict par domaine, trié par nom.

    Recense les `KNOWN_DOMAINS` PLUS tout autre `error_journal/*.jsonl` déjà présent
    (domaines ajoutés sans toucher au code). `reports_dir` = racine des rapports (défaut
    `lab/reports`) ; le sous-dossier `error_journal/` en est déduit — pratique pour isoler
    dans un tmp_path de test. Chaque entrée : {domaine, chemin(str), entries(int), existe(bool)}.
    """
    root = reports_dir or FORGE_REPORTS
    jdir = root / "error_journal"

    domaines = set(KNOWN_DOMAINS)
    if jdir.exists():
        domaines.update(p.stem for p in jdir.glob("*.jsonl"))

    out: list[dict] = []
    for domaine in sorted(domaines):
        path = jdir / f"{domaine}.jsonl"
        out.append({
            "domaine": domaine,
            "chemin": str(path),
            "entries": _count_entries(path),
            "existe": path.exists(),
        })
    return out


def generate_journal_index(reports_dir: Path | None = None) -> str:
    """Rend l'index des journaux en Markdown DÉTERMINISTE (aucun horodatage).

    Sortie stable à contenu constant : ré-générable au pré-commit sans diff parasite.
    Le monolithe historique est signalé en note (lu en fallback, jamais réécrit).
    """
    lignes = ["# Journaux d'erreurs Forge par domaine", ""]
    lignes.append("| domaine | entries | existe | chemin |")
    lignes.append("|---|---:|:---:|---|")
    for j in list_journals(reports_dir):
        existe = "oui" if j["existe"] else "non"
        lignes.append(f"| {j['domaine']} | {j['entries']} | {existe} | {j['chemin']} |")
    lignes.append("")
    lignes.append("> Note : `forge_error_journal.jsonl` (monolithe historique) est lu en "
                  "fallback pour les domaines html/forge et jamais réécrit (migration "
                  "non-destructive).")
    lignes.append("")
    return "\n".join(lignes)


def write_journal_index(reports_dir: Path | None = None) -> Path:
    """Écrit l'index Markdown dans error_journal/INDEX.generated.md. Renvoie le chemin."""
    root = reports_dir or FORGE_REPORTS
    jdir = root / "error_journal"
    jdir.mkdir(parents=True, exist_ok=True)
    path = jdir / INDEX_FILENAME
    path.write_text(generate_journal_index(reports_dir), encoding="utf-8")
    return path


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


# --- CLI : index des journaux (déterministe) -----------------------------------

def main(argv: list[str] | None = None) -> int:
    """Petit CLI : affiche l'index des journaux, ou l'écrit avec ``--write``."""
    parser = argparse.ArgumentParser(description="Index des journaux d'erreurs Forge par domaine.")
    parser.add_argument("--write", action="store_true",
                        help="écrit error_journal/INDEX.generated.md (sinon affiche seulement)")
    args = parser.parse_args(argv)
    if args.write:
        path = write_journal_index()
        logger.info("index des journaux écrit : %s", path)
        print(str(path))
    else:
        print(generate_journal_index())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
