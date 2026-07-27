"""Périmètre du gate mutation par CATÉGORIE (décision U-2, ratifiée Pierre
2026-07-27, contrat n2-perimetre-mutation-categorie).

Le gate mutation ne doit juger que les catégories que la suite scellée peut
ATTEINDRE. Preuve mesurée (run pong_r2, évidence signée) : les 3 fichiers
`system` (game_loop/loop.mjs, game_state/state.mjs, input/input.mjs) sont
58/61 tués (95 %) ; les 7 fichiers `system.adapter`
(06_RUNTIME/adapters/presentation/*.mjs) sont 0/65 (0 %) — STRUCTUREL, la
suite scellée (07_TESTS/unit/*.test.mjs + 07_TESTS/oracle/solvability.mjs)
n'importe AUCUN fichier d'adaptateur. Moyenner les deux (58/126 ≈ 46 %)
fabrique un faux indicateur (une métrique qui moyenne deux populations
incomparables).

Cette suite prouve :
  (a) la dérivation isole les 3 `system` et EXCLUT les 7 `system.adapter` ;
  (b) le reçu porte l'exclusion DÉCLARÉE (fichier, catégorie, motif) ET des
      compteurs par catégorie (jamais un killed/total forgé pour une
      catégorie non jugée) ;
  (c) TEST INVERSE — une catégorie jugeable (`system`, `entity`...) ne peut
      JAMAIS sortir du périmètre ;
  (d) recalcul du score sur la SEULE population testable (58/61), distinct
      de l'agrégat historique (58/126) — à partir de l'évidence SIGNÉE réelle
      du run pong_r2 (aucune ré-exécution du gate mutation).
"""
import json
from pathlib import Path

from forge.driver import ForgeDriver
from forge.mutation_proof import (
    categorized_mutation_counts,
    emit_mutation_receipt,
    logic_files_from_wiremap,
    mutation_scope_from_wiremap,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
PONG_WIREMAP = REPO_ROOT / "games" / "pong" / "09_WIREMAP" / "wiremap.json"
PONG_EVIDENCE = (REPO_ROOT / "lab" / "forge_runs" / "pong" / "evidence"
                 / "mutation_pong_r2.json")

ADAPTER_FILES = {
    "06_RUNTIME/adapters/presentation/audio.mjs",
    "06_RUNTIME/adapters/presentation/browser/main.mjs",
    "06_RUNTIME/adapters/presentation/capture_browser.mjs",
    "06_RUNTIME/adapters/presentation/capture_godot.mjs",
    "06_RUNTIME/adapters/presentation/draw.mjs",
    "06_RUNTIME/adapters/presentation/exit.mjs",
    "06_RUNTIME/adapters/presentation/raster.mjs",
}
SYSTEM_FILES = {
    "05_SYSTEMS/game_loop/loop.mjs",
    "05_SYSTEMS/game_state/state.mjs",
    "05_SYSTEMS/input/input.mjs",
}


def _real_wiremap() -> dict:
    return json.loads(PONG_WIREMAP.read_text(encoding="utf-8"))


def _real_evidence_per_file() -> dict:
    payload = json.loads(PONG_EVIDENCE.read_text(encoding="utf-8"))
    return payload["mutation_result"]["per_file"]


# =======================================================================================
# (a) wiremap Pong RÉELLE : 3 `system` inclus, 7 `system.adapter` exclus (déclarés)
# =======================================================================================

def test_a_wiremap_pong_reelle_isole_system_exclut_adapters():
    wiremap = _real_wiremap()
    scope = ForgeDriver._mutation_scope_from_wiremap_any(wiremap)
    assert set(scope["included"]) == SYSTEM_FILES
    excluded_paths = {e["fichier"] for e in scope["excluded"]}
    assert excluded_paths == ADAPTER_FILES
    assert len(scope["excluded"]) == 7
    assert all(e["categorie"] == "system.adapter" for e in scope["excluded"])
    # exclusion DÉCLARÉE, jamais silencieuse : motif non vide et explicite
    assert all(e["motif"] for e in scope["excluded"])
    assert all("adapter" in e["motif"] or "présentation" in e["motif"]
               or "presentation" in e["motif"] for e in scope["excluded"])


def test_logic_files_from_wiremap_egale_les_inclus_pong():
    """`logic_files_from_wiremap` (signature historique) doit rester la SEULE
    liste des fichiers JUGÉS -- rétro-compatible, pas de fichier dupliqué."""
    wiremap = _real_wiremap()
    scope = ForgeDriver._mutation_scope_from_wiremap_any(wiremap)
    assert sorted(scope["included"]) == sorted(SYSTEM_FILES)


# =======================================================================================
# (b) compteurs par catégorie + exclusions dans le REÇU (jamais un score forgé)
# =======================================================================================

def test_b_compteurs_par_categorie_sur_evidence_reelle_pong_r2():
    wiremap = _real_wiremap()
    scope = ForgeDriver._mutation_scope_from_wiremap_any(wiremap)
    per_file = _real_evidence_per_file()
    mutation_result = {"per_file": per_file}
    counts = categorized_mutation_counts(mutation_result, scope)

    assert counts["system"] == {"jugee": True, "fichiers": 3, "killed": 58, "total": 61}
    assert counts["system.adapter"]["jugee"] is False
    assert counts["system.adapter"]["fichiers"] == 7
    # jamais de killed/total FORGÉ pour une catégorie non jugée (ce serait le
    # faux indicateur exact que la décision U-2 interdit)
    assert "killed" not in counts["system.adapter"]
    assert "total" not in counts["system.adapter"]


def test_b_emit_mutation_receipt_embarque_exclusions_et_compteurs(tmp_path):
    g = tmp_path / "game"
    (g / "05_SYSTEMS").mkdir(parents=True)
    (g / "05_SYSTEMS" / "loop.mjs").write_text("export const ok = 1 >= 0;\n",
                                               encoding="utf-8")
    (g / "06_RUNTIME").mkdir(parents=True)
    (g / "06_RUNTIME" / "draw.mjs").write_text("export const noop = () => {};\n",
                                               encoding="utf-8")
    (g / "logic.test.mjs").write_text("// suite\n", encoding="utf-8")
    scope = {
        "included": ["05_SYSTEMS/loop.mjs"],
        "excluded": [{"fichier": "06_RUNTIME/draw.mjs", "categorie": "system.adapter",
                      "motif": "présentation/runtime -- non couverte par la suite scellée"}],
        "categories": {"05_SYSTEMS/loop.mjs": "system"},
    }
    result = {
        "total": 4, "killed": 4, "survived": 0, "survivors": [], "baseline_ok": True,
        "per_file": {"05_SYSTEMS/loop.mjs": {"total": 4, "killed": 4}},
        "test_argv": ["node", "--test", "logic.test.mjs"],
    }
    receipt = emit_mutation_receipt("run-cat", g, ["05_SYSTEMS/loop.mjs"], result,
                                    key_file=tmp_path / "key",
                                    evidence_dir=tmp_path / "evidence",
                                    mutation_scope=scope)
    detail = receipt.receipt.detail
    assert detail["categories_exclues"] == scope["excluded"]
    assert detail["compteurs_par_categorie"]["system"] == {
        "jugee": True, "fichiers": 1, "killed": 4, "total": 4}
    assert detail["compteurs_par_categorie"]["system.adapter"]["jugee"] is False
    assert detail["compteurs_par_categorie"]["system.adapter"]["fichiers"] == 1
    # draw.mjs n'a jamais été passé au mutateur : ni scellé, ni jugé
    assert "06_RUNTIME/draw.mjs" not in detail["code_sha256"]


def test_b_receipt_sans_scope_garde_une_structure_stable(tmp_path):
    """Sans `mutation_scope` (appelants historiques, override `logic_files`
    explicite) : les clés existent toujours, juste sans exclusion déclarée --
    la structure du reçu ne dépend pas du chemin d'appel."""
    g = tmp_path / "game"
    g.mkdir()
    (g / "logic.mjs").write_text("export const ok = 1 >= 0;\n", encoding="utf-8")
    (g / "logic.test.mjs").write_text("// suite\n", encoding="utf-8")
    result = {"total": 4, "killed": 4, "survived": 0, "survivors": [], "baseline_ok": True,
              "per_file": {"logic.mjs": {"total": 4, "killed": 4}},
              "test_argv": ["node", "--test", "logic.test.mjs"]}
    receipt = emit_mutation_receipt("run-x", g, ["logic.mjs"], result,
                                    key_file=tmp_path / "key",
                                    evidence_dir=tmp_path / "evidence")
    detail = receipt.receipt.detail
    assert detail["categories_exclues"] == []
    assert detail["compteurs_par_categorie"]["sans_categorie"]["killed"] == 4


# =======================================================================================
# (c) TEST INVERSE -- une catégorie jugeable ne peut JAMAIS sortir du périmètre
# =======================================================================================

def test_c_categorie_system_et_entity_jamais_dans_les_exclusions():
    """DOIT échouer si une future modification élargissait l'exclusion à
    `system` (ou toute autre catégorie jugeable). C'est ce test -- pas un
    commentaire -- qui distingue « restreindre » de « affaiblir » (garde-fou 3
    du contrat n2-perimetre-mutation-categorie)."""
    wiremap = {"features": [{"fichiers": [
        {"path": "05_SYSTEMS/game_loop/loop.mjs", "category": "system"},
        {"path": "02_ENTITIES/hero/hero.mjs", "category": "entity"},
        {"path": "03_WORLD/rules/gravity.mjs", "category": "world.rules"},
        {"path": "06_RUNTIME/adapters/presentation/audio.mjs", "category": "system.adapter"},
    ]}]}
    scope = mutation_scope_from_wiremap(wiremap)
    excluded_categories = {e["categorie"] for e in scope["excluded"]}
    excluded_paths = {e["fichier"] for e in scope["excluded"]}

    assert "system" not in excluded_categories
    assert "entity" not in excluded_categories
    assert "world.rules" not in excluded_categories
    assert "05_SYSTEMS/game_loop/loop.mjs" not in excluded_paths
    assert "02_ENTITIES/hero/hero.mjs" not in excluded_paths
    assert "03_WORLD/rules/gravity.mjs" not in excluded_paths

    assert "05_SYSTEMS/game_loop/loop.mjs" in scope["included"]
    assert "02_ENTITIES/hero/hero.mjs" in scope["included"]
    assert "03_WORLD/rules/gravity.mjs" in scope["included"]
    assert excluded_paths == {"06_RUNTIME/adapters/presentation/audio.mjs"}


# =======================================================================================
# (d) score testable RECALCULÉ, distinct de l'agrégat historique (évidence RÉELLE pong_r2)
# =======================================================================================

def test_d_score_testable_distinct_de_lagrege_historique_pong_r2():
    per_file = _real_evidence_per_file()
    wiremap = _real_wiremap()
    scope = ForgeDriver._mutation_scope_from_wiremap_any(wiremap)

    testable_total = sum(per_file[f]["total"] for f in scope["included"])
    testable_killed = sum(per_file[f]["killed"] for f in scope["included"])
    assert (testable_killed, testable_total) == (58, 61)

    agrege_total = sum(v["total"] for v in per_file.values())
    agrege_killed = sum(v["killed"] for v in per_file.values())
    assert (agrege_killed, agrege_total) == (58, 126)

    # les deux scores sont mathématiquement DIFFÉRENTS -- exactement ce que la
    # décision U-2 interdit de confondre en un seul agrégat
    testable_pct = round(testable_killed / testable_total * 100)
    agrege_pct = round(agrege_killed / agrege_total * 100)
    assert testable_pct == 95
    assert agrege_pct == 46
    assert testable_pct != agrege_pct


# =======================================================================================
# rétro-compatibilité : wiremap LEGACY sans catégorie -- comportement inchangé
# =======================================================================================

def test_legacy_sans_categorie_tout_inclus_rien_exclu():
    wiremap = {"features": [{"fichiers": ["game.mjs", "logic.test.mjs", "notes.md"]}]}
    scope = mutation_scope_from_wiremap(wiremap)
    assert scope["included"] == ["game.mjs"]
    assert scope["excluded"] == []


def test_logic_files_from_wiremap_egale_les_inclus_du_scope_synthetique():
    wiremap = {"features": [{"fichiers": [
        {"path": "05_SYSTEMS/a.mjs", "category": "system"},
        {"path": "06_RUNTIME/adapters/presentation/b.mjs", "category": "system.adapter"},
    ]}]}
    scope = mutation_scope_from_wiremap(wiremap)
    assert logic_files_from_wiremap(wiremap) == scope["included"]
    assert logic_files_from_wiremap(wiremap) == ["05_SYSTEMS/a.mjs"]


def test_categorie_test_reste_filtree_avant_toute_classification():
    """`test.*` reste hors formule (preuve, pas du code) -- comportement
    historique inchangé, ne doit apparaître ni en inclus ni en exclus."""
    wiremap = {"features": [{"fichiers": [
        {"path": "05_SYSTEMS/game_loop/loop.mjs", "category": "system"},
        {"path": "07_TESTS/oracle/solvability.mjs", "category": "test.solvability"},
    ]}]}
    scope = mutation_scope_from_wiremap(wiremap)
    assert scope["included"] == ["05_SYSTEMS/game_loop/loop.mjs"]
    assert scope["excluded"] == []
    assert not any("solvability" in f for f in scope["included"])


def test_entrees_malformees_ne_crashent_pas():
    for bad in (None, [], {"features": "pas une liste"},
                {"features": [{"fichiers": [None, 42, {"pas_de_path": 1}]}]}):
        scope = mutation_scope_from_wiremap(bad)
        assert scope == {"included": [], "excluded": [], "categories": {}}
