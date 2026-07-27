"""Reçu mutation signé (P0.2) — ferme les trous I1/I2 du chemin critique.

I1 : le gate mutation vivait HORS de l'oracle (`run-oracle.mjs` ne le câble pas,
skill.md le pilotait en prose) — un vert s10a était possible sans mutation.
I2 : un `mutation_triage.json` périmé (écrit pour un ancien code) n'était jamais
invalidé — breakout prétendait 100% quand le run réel disait 21%.

Ce module NE réimplémente NI ne déplace la logique mutation :
  - l'exécution reste `forge.mutation.run_mutation_test` (appelée, pas copiée) ;
  - le juge reste `forge.static_oracles.check_mutation_gate` (100%-ou-triage) ;
  - la signature reste `forge.verdict.make_signed_receipt` (HMAC commun).

Il AJOUTE la liaison de preuve : le reçu scelle (run_id, statut du gate, sha256
des fichiers logiques ET des fichiers de tests, sha256 du triage, évidence).
`verify_mutation_receipt` refuse : preuve absente, signature invalide, run_id
incohérent, statut non vert, hash code/tests divergent (fraîcheur), triage
modifié après la preuve, évidence altérée. Hypothèse inconnue => refus.
claim_verdict: NO_CLAIM_ALLOWED.
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path

from forge.mutation import run_mutation_test
from forge.static_oracles import check_mutation_gate, load_mutation_triage
from forge.verdict import (
    OracleReceipt,
    SignedReceipt,
    make_signed_receipt,
    sha256_file,
    verify_receipt,
)

logger = logging.getLogger(__name__)

# Commande de test par défaut d'un jeu forge (skill.md, gate mutation) —
# surchargée par étape via `test_argv` quand le jeu déclare d'autres suites.
DEFAULT_TEST_ARGV = ("node", "--test", "logic.test.mjs", "properties.test.mjs")

TRIAGE_FILENAME = "mutation_triage.json"


# --- périmètre du gate mutation PAR CATÉGORIE (décision U-2, ratifiée Pierre
# 2026-07-27 : « la mutation ne doit pas essayer de juger ce qu'elle ne peut
# pas atteindre. logique testable -> mutation ; rendu/runtime -> oracle produit.
# Sinon on fabrique un faux indicateur. ») ---------------------------------------

# Catégorie (table figée `standard/repo_map.yaml`) structurellement hors de
# portée du gate mutation : présentation/runtime (06_RUNTIME/adapters/{id}/).
# Preuve mesurée (run pong_r2, évidence signée `mutation_pong_r2.json`) : les 7
# fichiers `system.adapter` de Pong sont 0/65 tués -- la suite scellée
# (07_TESTS/unit/*.test.mjs + 07_TESTS/oracle/solvability.mjs) n'importe AUCUN
# fichier d'adaptateur (vérifié par grep des imports). Les muter mesure un 0%
# GARANTI par construction, jamais un défaut de test -- ce n'est pas une
# métrique, c'est un artefact de topologie.
CATEGORIE_PRESENTATION_RUNTIME = "system.adapter"

MOTIF_EXCLUSION_PRESENTATION_RUNTIME = (
    "catégorie system.adapter (présentation/runtime, 06_RUNTIME/adapters/) : "
    "jamais importée par la suite scellée (07_TESTS/unit/*.test.mjs + "
    "07_TESTS/oracle/solvability.mjs) -- structurellement intuable par mutation "
    "(mesuré pong_r2 : 0/65 tués) -- à couvrir par l'oracle produit ; le juge "
    "change, la couche n'est pas abandonnée"
)


def mutation_scope_from_wiremap(wiremap: dict) -> dict:
    """Périmètre du gate mutation, dérivé de la WireMap -- formule UNIQUE
    (décision U-2), non dupliquée ailleurs (driver.py normalise la FORME,
    jamais la règle).

    Sépare les fichiers `.mjs` non-test cités dans `features[*].fichiers` en :
      - `included`  : jugés par la mutation (catégorie absente -- wiremap
        LEGACY, formule historique inchangée -- ou toute catégorie autre que
        `system.adapter` : `system`, `entity*`, `level`, `world.rules`...) ;
      - `excluded`   : catégorie `system.adapter`, présentation/runtime,
        DÉCLARÉE avec fichier/catégorie/motif -- jamais silencieuse (garde-fou
        2 du contrat n2-perimetre-mutation-categorie) ;
      - `categories` : {fichier inclus: catégorie}, pour les compteurs aval
        (`categorized_mutation_counts`).

    `test.*` reste filtré EN AMONT (c'est de la PREUVE, jamais du code à
    muter -- comportement historique inchangé, cf. commentaire déjà présent
    dans driver.py sur l'échec de l'heuristique de nom en topologie STANDARD).
    """
    included: list[str] = []
    excluded: list[dict] = []
    categories: dict[str, str] = {}
    seen: set[str] = set()
    for feat in (wiremap.get("features", []) if isinstance(wiremap, dict) else []):
        if not isinstance(feat, dict):
            continue
        for f in (feat.get("fichiers") or []):
            if isinstance(f, dict):
                path, category = f.get("path"), f.get("category")
            else:
                path, category = f, None
            if not isinstance(path, str):
                continue
            if isinstance(category, str) and category.startswith("test."):
                continue  # preuve, pas du code -- filtre inchangé
            if not (path.endswith(".mjs") and "test" not in path):
                continue
            if path in seen:
                continue
            seen.add(path)
            if category:
                categories[path] = category
            if category == CATEGORIE_PRESENTATION_RUNTIME:
                excluded.append({"fichier": path, "categorie": category,
                                  "motif": MOTIF_EXCLUSION_PRESENTATION_RUNTIME})
            else:
                included.append(path)
    return {
        "included": sorted(included),
        "excluded": sorted(excluded, key=lambda e: e["fichier"]),
        "categories": categories,
    }


def categorized_mutation_counts(mutation_result: dict, scope: dict) -> dict:
    """Compteurs de mutation PAR CATÉGORIE (décision U-2) : pour chaque
    catégorie JUGÉE (fichiers de `scope["included"]`), agrège killed/total
    depuis `mutation_result["per_file"]` ; pour chaque catégorie EXCLUE
    (`scope["excluded"]`), ne rapporte QUE le nombre de fichiers -- jamais un
    killed/total forgé pour une catégorie non jugée (ce serait exactement le
    faux indicateur que la décision U-2 interdit : une catégorie qu'on n'a
    pas mesurée n'a pas de score, point).
    """
    per_file = mutation_result.get("per_file") or {}
    categories = scope.get("categories") or {}
    counts: dict[str, dict] = {}
    for path in scope.get("included", []):
        cat = categories.get(path, "sans_categorie")
        entry = counts.setdefault(
            cat, {"jugee": True, "fichiers": 0, "killed": 0, "total": 0})
        entry["fichiers"] += 1
        pf = per_file.get(path) or {}
        entry["killed"] += int(pf.get("killed", 0))
        entry["total"] += int(pf.get("total", 0))
    for exc in scope.get("excluded", []):
        cat = exc.get("categorie", "sans_categorie")
        entry = counts.setdefault(cat, {"jugee": False, "fichiers": 0})
        entry["fichiers"] += 1
    return counts


def logic_files_from_wiremap(wiremap: dict) -> list[str]:
    """Fichiers logiques à muter (rétro-compat : signature historique).
    Délègue à `mutation_scope_from_wiremap` -- formule UNIQUE, non dupliquée --
    et ne retourne que les fichiers INCLUS (jugés)."""
    return mutation_scope_from_wiremap(wiremap)["included"]


def fingerprint(game_dir: Path | str, files: list[str]) -> dict[str, str]:
    """{fichier relatif: sha256 du contenu}. '' si illisible (=> divergence à la vérif)."""
    game_dir = Path(game_dir)
    return {f: sha256_file(game_dir / f) for f in sorted(set(files))}


def _default_baseline_runner(test_argv: list[str], cwd: Path | str,
                             timeout: int = 120) -> bool:
    """La suite passe-t-elle sur le code NON muté ? Même résolution d'exécutable
    que forge.mutation (Windows : `node` -> node.exe via which)."""
    import shutil
    import subprocess
    exe = shutil.which(test_argv[0]) or test_argv[0]
    try:
        proc = subprocess.run([exe, *test_argv[1:]], cwd=str(Path(cwd).resolve()),
                              capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.SubprocessError):
        return False  # suite inexécutable = baseline non prouvée, jamais un vert
    return proc.returncode == 0


def run_mutation_for_game(
    game_dir: Path | str,
    logic_files: list[str],
    test_argv: list[str] | tuple[str, ...] | None = None,
    runner=None,
    baseline_runner=None,
) -> dict:
    """Agrège la mutation sur tous les fichiers logiques (même agrégat que skill.md).

    `runner` est injectable pour les tests ; par défaut c'est le VRAI
    `forge.mutation.run_mutation_test` — jamais une réimplémentation.

    P0.3 — baseline verte OBLIGATOIRE : une suite déjà rouge sur le code non muté
    « tue » tout mutant artificiellement (returncode != 0 partout) — 100% de
    score sans rien prouver. `baseline_ok` est mesuré AVANT la mutation et scellé
    dans le reçu ; baseline rouge => la mutation n'est même pas lancée.
    """
    game_dir = Path(game_dir)
    argv = list(test_argv or DEFAULT_TEST_ARGV)
    baseline = baseline_runner or _default_baseline_runner
    baseline_ok = bool(baseline(argv, game_dir))
    survivors: list[dict] = []
    total = killed = 0
    per_file: dict[str, dict] = {}
    if baseline_ok:
        run = runner or run_mutation_test
        for f in logic_files:
            r = run(game_dir / f, argv, cwd=game_dir)
            survivors += list(r.get("survivors", []))
            total += int(r.get("total", 0))
            killed += int(r.get("killed", 0))
            per_file[f] = {"total": int(r.get("total", 0)),
                           "killed": int(r.get("killed", 0))}
    else:
        logger.warning("baseline ROUGE sur code non muté — mutation non lancée "
                       "(le score serait un artefact)")
    return {
        "total": total,
        "killed": killed,
        "survived": len(survivors),
        "survivors": survivors,
        "per_file": per_file,
        "test_argv": argv,
        "baseline_ok": baseline_ok,
    }


def emit_mutation_receipt(
    run_id: str,
    game_dir: Path | str,
    logic_files: list[str],
    mutation_result: dict,
    *,
    key_file: Path | None = None,
    evidence_dir: Path | str | None = None,
    mutation_scope: dict | None = None,
) -> SignedReceipt:
    """Juge (check_mutation_gate, inchangé) puis scelle la preuve dans un reçu signé.

    Le sceau couvre le code mutable ET les fichiers de tests présents dans la
    commande de test : affaiblir la suite après la preuve invalide la preuve.

    `mutation_scope` (décision U-2, optionnel -- absent pour les appelants
    historiques qui passent un `logic_files` explicite sans wiremap) : le
    reçu porte alors les exclusions de catégorie DÉCLARÉES (fichier,
    catégorie, motif -- jamais silencieuses) et des compteurs par catégorie.
    Sans scope, la structure reste stable (categories_exclues=[], une seule
    catégorie "sans_categorie") -- le reçu ne dépend pas du chemin d'appel.
    """
    game_dir = Path(game_dir)
    scope = mutation_scope or {"included": list(logic_files), "excluded": [],
                                "categories": {}}
    gate = check_mutation_gate(mutation_result, load_mutation_triage(game_dir))
    # P0.3 : sans baseline verte MESURÉE (True explicite — un résultat sans le
    # champ n'est pas une preuve), le gate ne peut pas être vert.
    baseline_ok = mutation_result.get("baseline_ok") is True
    status = "OK" if (gate["passed"] and baseline_ok) else "FAIL"
    argv = list(mutation_result.get("test_argv") or DEFAULT_TEST_ARGV)
    test_files = [a for a in argv if (game_dir / a).exists()]
    # Le harnais e2e fait partie du code jugé : présent, il est scellé (l'échanger
    # après la preuve invalide la preuve, même classe de menace que les tests).
    harness_files = [f for f in ("run-oracle.mjs", "e2e.mjs") if (game_dir / f).exists()]
    detail = {
        "game_dir": str(game_dir),
        "logic_files": sorted(set(logic_files)),
        "test_argv": argv,
        "test_files_scelles": sorted(test_files),
        "baseline_ok": baseline_ok,
        "total": int(mutation_result.get("total", 0)),
        "killed": int(mutation_result.get("killed", 0)),
        "survived": int(mutation_result.get("survived", 0)),
        "survivants_non_tries": gate["survivants_non_tries"],
        "gate_checked": gate["checked"],
        # Doctrine P0.3 : un survivant trié franchit le gate mais reste une exception
        # tracée — propagée au verdict, qui refuse alors un OK propre (HumanGate).
        "mutation_exception": gate.get("exception", False),
        "triaged_survivors": gate.get("triaged_survivors", []),
        "code_sha256": fingerprint(game_dir,
                                   list(logic_files) + test_files + harness_files),
        "triage_sha256": sha256_file(game_dir / TRIAGE_FILENAME),
        # décision U-2 : le périmètre restreint est DÉCLARÉ, jamais silencieux.
        "categories_exclues": scope.get("excluded", []),
        "compteurs_par_categorie": categorized_mutation_counts(mutation_result, scope),
    }
    evidence_path = ""
    if evidence_dir is not None:
        evidence_dir = Path(evidence_dir)
        evidence_dir.mkdir(parents=True, exist_ok=True)
        evidence = evidence_dir / f"mutation_{run_id}.json"
        evidence.write_text(
            json.dumps({"mutation_result": mutation_result, "gate": gate,
                        "detail": detail},
                       ensure_ascii=False, sort_keys=True, indent=1),
            encoding="utf-8",
        )
        evidence_path = str(evidence)
    logger.info("reçu mutation %s: %s (%s/%s tués)", run_id, status,
                detail["killed"], detail["total"])
    return make_signed_receipt(
        "mutation", run_id, status, detail,
        evidence_path=evidence_path, ts=time.time(), key_file=key_file,
    )


def verify_mutation_receipt(
    receipt_dict: dict | None,
    signature: str,
    run_id: str,
    game_dir: Path | str,
    *,
    key_file: Path | None = None,
    require_green: bool = True,
) -> dict:
    """Vérifie une preuve mutation CONTRE l'état PRÉSENT du jeu.

    Retourne {passed, raisons[], status}. `status` (valeur brute de
    ``receipt.status``, "" quand aucun reçu n'a pu être construit) est TOUJOURS
    présent : aucun appelant ne doit parser une chaîne française pour connaître
    le statut (V1, design imposé pt.1).

    Refus si : preuve absente/malformée, signature invalide (provenance), run_id
    incohérent, empreinte absente, hash code/tests divergent, triage modifié
    après la preuve, évidence altérée — INCONDITIONNEL, quel que soit
    `require_green`.

    `require_green` (KEYWORD-ONLY, défaut True = comportement historique
    inchangé — c'est le gate mutation DUR du driver, driver.py:846, qui ne
    passe jamais ce paramètre) : quand True, un statut différent de "OK" est
    AUSSI un refus ("gate mutation non vert"). Quand False (utilisé par
    `verify_run` pour distinguer authenticité et verdict logiciel, V1), cette
    seule raison est omise — un reçu mutation FAIL authentique et à jour reste
    `passed=True` (il ne ment sur rien), seul le statut rapporté (`status`)
    dit que le gate est rouge.
    """
    if not isinstance(receipt_dict, dict) or not signature:
        return {"passed": False, "raisons": ["preuve mutation absente ou malformée"],
                "status": ""}
    try:
        receipt = OracleReceipt(**receipt_dict)
    except TypeError:
        return {"passed": False, "raisons": ["reçu mutation malformé (champs inattendus)"],
                "status": ""}
    if not verify_receipt(receipt, signature, key_file):
        # Contenu non fiable : inutile (et trompeur) d'énumérer d'autres raisons.
        return {"passed": False,
                "raisons": ["provenance rompue: signature du reçu mutation invalide"],
                "status": receipt.status}

    raisons: list[str] = []
    if receipt.oracle_id != "mutation":
        raisons.append(f"oracle_id inattendu ({receipt.oracle_id!r} != 'mutation')")
    if receipt.run_id != run_id:
        raisons.append(f"run_id incohérent ({receipt.run_id!r} != {run_id!r})")
    if require_green and receipt.status != "OK":
        raisons.append(f"gate mutation non vert (status={receipt.status})")

    detail = receipt.detail or {}
    game_dir = Path(game_dir)
    prints = detail.get("code_sha256") or {}
    if not prints:
        raisons.append("empreinte code absente du reçu mutation")
    if not detail.get("test_files_scelles"):
        raisons.append(
            "aucun fichier de test scellé (commande de test indirecte ?) — "
            "fraîcheur de la suite non prouvable ; nommer les fichiers de test "
            "dans test_argv")
    if detail.get("baseline_ok") is not True:
        raisons.append(
            "baseline verte non prouvée (suite rouge sur code non muté, ou reçu "
            "sans mesure de baseline) — le score de mutation est un artefact")
    for f, expected in sorted(prints.items()):
        if not expected:
            raisons.append(
                f"empreinte illisible/absente au moment de la preuve: {f} "
                "(fichier inexistant scellé '' — jamais un vert)")
        elif sha256_file(game_dir / f) != expected:
            raisons.append(
                f"hash code divergent: {f} (le code testé n'est plus le code présent)")
    if sha256_file(game_dir / TRIAGE_FILENAME) != detail.get("triage_sha256", ""):
        raisons.append(
            "triage modifié après la preuve mutation (mutation_triage.json divergent)")
    if receipt.evidence_path and sha256_file(receipt.evidence_path) != receipt.evidence_sha256:
        raisons.append(f"évidence mutation altérée/absente ({receipt.evidence_path})")

    return {"passed": not raisons, "raisons": raisons, "status": receipt.status}
