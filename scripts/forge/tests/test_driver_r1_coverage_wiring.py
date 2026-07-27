"""Câblage driver des 2 volets de preuve de boucle (R1, contrat
`r1-preuves-boucle-mecaniques.yaml`, 2026-07-27) — `ForgeDriver._run_standard_oracle`
porte `check_observable_coverage`/`check_genre_coverage` dans
`detail["observable_coverage"]`/`detail["genre_coverage"]`, ADVISORY : ni l'un ni
l'autre ne participe au calcul du statut du pas `s10s-oracle-standard` (même patron
que `product_oracle` dans `_run_code_oracle`, s10a — cf. `test_driver_product_oracle.py`).

Ce fichier vérifie UNIQUEMENT le CÂBLAGE : que le driver (a) lit le reçu `product_oracle`
déjà posé par s10a (persisté dans l'état, jamais recalculé), (b) lit `01_DESIGN/genre_bible.json`
depuis `game_dir`, (c) porte les deux résultats dans le reçu de s10s, (d) ne les fait
JAMAIS gager le statut du pas. La couverture RED/GREEN des fonctions elles-mêmes vit
dans `test_standard_oracles_r1_coverage.py`.
"""
import json

import yaml

from forge.driver import ForgeDriver


def _standard_game(root, *, observable_proof="auto_session", genre_refs=None):
    """Squelette STANDARD minimal accepté par les six oracles historiques (au
    placement près, non regardé ici) + une ligne observable et une Genre Bible
    machine-lisible, à l'image de Pong."""
    (root / "00_CHARTER").mkdir(parents=True)
    (root / "00_CHARTER" / "game_contract.yaml").write_text(
        yaml.safe_dump({"schema_version": 1, "game_id": "g", "node": 1,
                        "runtimes": ["rules"], "budget": {"reuses": [], "adds": []},
                        "assets": {"plan": "cc0"}}), encoding="utf-8")
    (root / "05_SYSTEMS" / "game_loop").mkdir(parents=True)
    (root / "05_SYSTEMS" / "game_loop" / "loop.mjs").write_text("export const t=1;\n",
                                                                encoding="utf-8")
    (root / "09_WIREMAP").mkdir(parents=True)
    (root / "09_WIREMAP" / "wiremap.json").write_text(json.dumps({
        "schema_version": 2,
        "lines": [{
            "id": "core.boot", "category": "system", "provides": ["game.boot"],
            "requires": [], "owner": True, "state": "IMPLEMENTED",
            "address": "05_SYSTEMS/game_loop/",
            "observable_by_player": True,
            "observable_proof": observable_proof,
            "genre_refs": genre_refs or ["genre.g.some_rule"],
            "fichiers": [{"path": "05_SYSTEMS/game_loop/loop.mjs", "category": "system"}],
        }],
        "genre_refusals": [],
    }), encoding="utf-8")
    (root / "01_DESIGN").mkdir(parents=True)
    (root / "01_DESIGN" / "genre_bible.json").write_text(json.dumps({
        "genre_rules": [{"id": "genre.g.some_rule", "applies_to_wiremap_line": "core.boot"}],
    }), encoding="utf-8")
    return root


def _run_standard_step(tmp_path, game_dir, *, product_oracle_detail=None):
    d = ForgeDriver("g", "r1", run_dir=tmp_path / "run", profile="standard",
                    game_dir=game_dir, key_file=tmp_path / "k.key",
                    audit_path=tmp_path / "audit.jsonl")
    state = {"steps": {e: {"status": "PENDING", "attempts": 0, "detail": {}}
                       for e in d.order},
             "catalog_brick_ids_snapshot": []}
    # s10a s'exécute AVANT s10s dans l'ORDER du profil standard — son reçu (déjà
    # persisté) est ce que s10s doit lire, jamais recalculer.
    if product_oracle_detail is not None:
        state["steps"]["s10a-oracle-code"]["detail"] = {"product_oracle": product_oracle_detail}
    d._run_deterministic(state, "s10s-oracle-standard")
    return state["steps"]["s10s-oracle-standard"]


# --- câblage : les deux volets sont posés dans le reçu -------------------------------


def test_les_deux_volets_sont_portes_dans_le_recu(tmp_path):
    game = _standard_game(tmp_path / "game")
    entry = _run_standard_step(tmp_path, game, product_oracle_detail={
        "auto_session": {"passed": True, "checked": True},
    })
    assert "observable_coverage" in entry["detail"]
    assert "genre_coverage" in entry["detail"]
    assert entry["detail"]["observable_coverage"]["verdict"] == "OK"
    assert entry["detail"]["genre_coverage"]["verdict"] == "OK"


def test_genre_bible_absente_rend_genre_coverage_fail_motive_sans_crash(tmp_path):
    game = _standard_game(tmp_path / "game")
    (game / "01_DESIGN" / "genre_bible.json").unlink()
    entry = _run_standard_step(tmp_path, game, product_oracle_detail={
        "auto_session": {"passed": True, "checked": True},
    })
    assert entry["detail"]["genre_coverage"]["verdict"] == "FAIL"
    assert entry["detail"]["genre_coverage"]["passed"] is False


def test_product_oracle_absent_rend_observable_coverage_bloque_sans_crash(tmp_path):
    """s10a n'a pas encore tourné (ou n'a rien produit pour product_oracle) : le
    reçu combiné est vide, la ligne observable reste non couverte (BLOCKED), jamais
    une exception."""
    game = _standard_game(tmp_path / "game")
    entry = _run_standard_step(tmp_path, game, product_oracle_detail=None)
    cov = entry["detail"]["observable_coverage"]
    assert cov["verdict"] == "BLOCKED"
    assert cov["volets_absents"] == ["core.boot:auto_session"]


# --- ADVISORY : un volet ROUGE ne fait JAMAIS échouer s10s à lui seul ----------------


def test_observable_coverage_rouge_ne_gate_pas_le_pas(tmp_path):
    game = _standard_game(tmp_path / "game", observable_proof="volet_absent")
    entry = _run_standard_step(tmp_path, game, product_oracle_detail={
        "auto_session": {"passed": True, "checked": True},
    })
    assert entry["detail"]["observable_coverage"]["verdict"] == "BLOCKED"
    # les 6 volets CORE (contract/line_states/placement/index/collisions/budget)
    # décident seuls du statut — observable_coverage/genre_coverage n'y entrent pas.
    assert entry["status"] in ("OK", "FAIL", "BLOCKED")  # jamais une exception
    core_facets_all_green = all(
        entry["detail"][k].get("passed") for k in
        ("contract_completeness", "line_states", "placement", "index", "collisions")
    )
    if core_facets_all_green and entry["detail"]["budget"].get("measured"):
        assert entry["status"] == (
            "OK" if entry["detail"]["budget"].get("passed") else "FAIL")


def test_genre_coverage_rouge_ne_gate_pas_le_pas(tmp_path):
    game = _standard_game(tmp_path / "game", genre_refs=["genre.g.autre_regle_non_dans_la_bible"])
    entry = _run_standard_step(tmp_path, game, product_oracle_detail={
        "auto_session": {"passed": True, "checked": True},
    })
    # citation vers un id absent de la bible -> FAIL du volet genre_coverage lui-même
    assert entry["detail"]["genre_coverage"]["verdict"] == "FAIL"
    # mais le pas ne crashe jamais et son statut reste dérivé des 6 volets CORE seuls
    assert entry["status"] in ("OK", "FAIL", "BLOCKED")


def test_statut_du_pas_identique_que_les_2_volets_soient_verts_ou_rouges(tmp_path):
    """Non-régression du câblage historique C1..C6 (`test_standard_wiring_corrections.py`) :
    le statut du pas (`entry["status"]`) ne varie PAS selon que `observable_coverage`/
    `genre_coverage` soient verts ou rouges — seuls les 6 volets CORE existants (via
    `_CORE_FACETS`) et le budget mesuré en décident, exactement comme avant l'ajout
    des 2 volets R1."""
    game_ok = _standard_game(tmp_path / "game_ok")
    entry_ok = _run_standard_step(tmp_path, game_ok, product_oracle_detail={
        "auto_session": {"passed": True, "checked": True},
    })
    game_red = _standard_game(tmp_path / "game_red", observable_proof="volet_absent",
                              genre_refs=["genre.g.id_inexistant"])
    entry_red = _run_standard_step(tmp_path, game_red, product_oracle_detail={
        "auto_session": {"passed": True, "checked": True},
    })
    assert entry_ok["detail"]["observable_coverage"]["verdict"] == "OK"
    assert entry_ok["detail"]["genre_coverage"]["verdict"] == "OK"
    assert entry_red["detail"]["observable_coverage"]["verdict"] == "BLOCKED"
    assert entry_red["detail"]["genre_coverage"]["verdict"] == "FAIL"
    # même 6 volets CORE (squelette identique par ailleurs) -> même statut de pas,
    # quel que soit le rouge/vert des 2 volets ADVISORY R1.
    assert entry_ok["status"] == entry_red["status"]
