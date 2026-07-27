"""Les 2 volets de preuve de boucle (R1, contrat `r1-preuves-boucle-mecaniques.yaml`,
2026-07-27) : `check_observable_coverage` et `check_genre_coverage`
(`scripts/forge/standard_oracles.py`).

Le livrable, ce sont les échecs : chaque volet est montré ROUGE sur au moins 2 cas
fabriqués DISTINCTS, puis VERT sur un cas conforme façonné à l'image de Pong (mêmes
identifiants de ligne, même forme de reçu que `product_oracle.run_product_oracle`).
Vocabulaire du patron Art Bible (`check_artbible.mjs`) : `FAIL` = malformé ·
`BLOCKED` = bien formé mais non couvert · `OK` = conforme et couvert.

Ces deux volets sont ADVISORY et branchés dans le reçu de `s10s-oracle-standard` —
le câblage driver est testé séparément (`test_driver_r1_coverage_wiring.py`). Ici,
les fonctions sont testées ISOLÉMENT (mêmes principes que `test_standard_oracles.py`) :
aucune exception sur entrée malformée, `passed`/`verdict` cohérents.
"""
from forge.standard_oracles import check_genre_coverage, check_observable_coverage


# =======================================================================================
# check_observable_coverage
# =======================================================================================


def _observable_line(**overrides) -> dict:
    base = {
        "id": "core.end_condition",
        "observable_by_player": True,
        "observable_proof": "auto_session",
    }
    base.update(overrides)
    return base


def _oracle_receipt(**overrides) -> dict:
    base = {
        "browser_import_safety": {"passed": True, "checked": True},
        "auto_session": {"passed": True, "checked": True, "finished": True},
        "visual_capture": {"status": "OK", "passed": True},
    }
    base.update(overrides)
    return base


# --- robustesse : jamais d'exception, jamais un vert par défaut sur entrée malformée ---


def test_observable_coverage_wiremap_non_dict_fail():
    rep = check_observable_coverage([], {})
    assert rep["passed"] is False
    assert rep["verdict"] == "FAIL"


def test_observable_coverage_receipt_non_dict_traite_comme_vide():
    """Un reçu du mauvais type est traité comme vide (aucun volet disponible), jamais
    une exception : une ligne observable devient alors non couverte (BLOCKED), pas un
    crash — même discipline que les 6 autres oracles du module."""
    wiremap = {"lines": [_observable_line()]}
    rep = check_observable_coverage(wiremap, "pas un dict")
    assert rep["passed"] is False
    assert rep["verdict"] == "BLOCKED"
    assert "core.end_condition:auto_session" in rep["volets_absents"]


def test_observable_coverage_aucune_ligne_observable_ok_par_vacuite():
    wiremap = {"lines": [{"id": "core.boot", "observable_by_player": False}]}
    rep = check_observable_coverage(wiremap, {})
    assert rep["passed"] is True
    assert rep["verdict"] == "OK"


# --- RED #1 : ligne observable SANS observable_proof --------------------------------


def test_observable_coverage_red_ligne_sans_preuve_nommee():
    wiremap = {"lines": [_observable_line(observable_proof=None)]}
    rep = check_observable_coverage(wiremap, _oracle_receipt())
    assert rep["passed"] is False
    assert rep["verdict"] == "BLOCKED"
    assert rep["lignes_sans_preuve"] == ["core.end_condition"]


def test_observable_coverage_red_observable_proof_chaine_vide():
    wiremap = {"lines": [_observable_line(observable_proof="   ")]}
    rep = check_observable_coverage(wiremap, _oracle_receipt())
    assert rep["verdict"] == "BLOCKED"
    assert rep["lignes_sans_preuve"] == ["core.end_condition"]


# --- RED #2 : volet nommé ABSENT du reçu ---------------------------------------------


def test_observable_coverage_red_volet_absent_du_recu():
    wiremap = {"lines": [_observable_line(observable_proof="volet_qui_nexiste_pas")]}
    rep = check_observable_coverage(wiremap, _oracle_receipt())
    assert rep["passed"] is False
    assert rep["verdict"] == "BLOCKED"
    assert rep["volets_absents"] == ["core.end_condition:volet_qui_nexiste_pas"]


# --- RED #3 : volet nommé mais NOT_MEASURED ------------------------------------------


def test_observable_coverage_red_volet_not_measured_forme_status():
    wiremap = {"lines": [_observable_line(observable_proof="visual_capture")]}
    receipt = _oracle_receipt(visual_capture={"status": "NOT_MEASURED", "passed": False,
                                              "reason": "godot indisponible"})
    rep = check_observable_coverage(wiremap, receipt)
    assert rep["passed"] is False
    assert rep["verdict"] == "BLOCKED"
    assert rep["volets_non_mesures"] == ["core.end_condition:visual_capture"]


def test_observable_coverage_red_volet_not_measured_forme_checked():
    wiremap = {"lines": [_observable_line(observable_proof="browser_import_safety")]}
    receipt = _oracle_receipt(browser_import_safety={"passed": False, "checked": False,
                                                      "reason": "entrée absente"})
    rep = check_observable_coverage(wiremap, receipt)
    assert rep["verdict"] == "BLOCKED"
    assert rep["volets_non_mesures"] == ["core.end_condition:browser_import_safety"]


# --- volet mesuré mais en ÉCHEC : non couvert (BLOCKED), pas une exception -----------


def test_observable_coverage_volet_mesure_en_echec_reste_bloque():
    wiremap = {"lines": [_observable_line(observable_proof="auto_session")]}
    receipt = _oracle_receipt(auto_session={"passed": False, "checked": True,
                                            "finished": False, "score_evolves": False})
    rep = check_observable_coverage(wiremap, receipt)
    assert rep["passed"] is False
    assert rep["verdict"] == "BLOCKED"
    assert rep["volets_en_echec"] == ["core.end_condition:auto_session"]


# --- GREEN : conforme et couvert, façonné à l'image de Pong (mêmes ids/volets) -------


def test_observable_coverage_green_pong_shape_ok():
    wiremap = {"lines": [
        _observable_line(id="core.end_condition", observable_proof="auto_session"),
        _observable_line(id="play.score", observable_proof="auto_session"),
        _observable_line(id="core.exit", observable_proof="browser_import_safety"),
        {"id": "core.boot", "observable_by_player": False},  # ligne non observable, ignorée
    ]}
    rep = check_observable_coverage(wiremap, _oracle_receipt())
    assert rep["passed"] is True
    assert rep["verdict"] == "OK"
    assert rep["couvertes"] == [
        "core.end_condition:auto_session",
        "play.score:auto_session",
        "core.exit:browser_import_safety",
    ]
    assert rep["lignes_sans_preuve"] == []
    assert rep["volets_absents"] == []
    assert rep["volets_non_mesures"] == []
    assert rep["volets_en_echec"] == []


# =======================================================================================
# check_genre_coverage
# =======================================================================================


def _genre_bible(**overrides) -> dict:
    base = {"genre_rules": [
        {"id": "genre.pong.two_paddles_vertical", "applies_to_wiremap_line": "play.paddle"},
        {"id": "genre.pong.playable_speed_range", "applies_to_wiremap_line": "play.playable_speed"},
    ]}
    base.update(overrides)
    return base


# --- robustesse -----------------------------------------------------------------------


def test_genre_coverage_wiremap_non_dict_fail():
    rep = check_genre_coverage([], _genre_bible())
    assert rep["passed"] is False
    assert rep["verdict"] == "FAIL"


def test_genre_coverage_genre_bible_non_dict_fail():
    rep = check_genre_coverage({"lines": []}, "pas un dict")
    assert rep["passed"] is False
    assert rep["verdict"] == "FAIL"


def test_genre_coverage_genre_rules_pas_une_liste_fail():
    rep = check_genre_coverage({"lines": []}, {"genre_rules": "pas une liste"})
    assert rep["passed"] is False
    assert rep["verdict"] == "FAIL"


def test_genre_coverage_genre_rules_vide_ok_par_vacuite():
    rep = check_genre_coverage({"lines": []}, {"genre_rules": []})
    assert rep["passed"] is True
    assert rep["verdict"] == "OK"


# --- RED #1 : règle applicable NI citée NI refusée ------------------------------------


def test_genre_coverage_red_regle_ni_citee_ni_refusee():
    wiremap = {"lines": [{"id": "play.paddle", "genre_refs": ["genre.pong.two_paddles_vertical"]}]}
    rep = check_genre_coverage(wiremap, _genre_bible())
    assert rep["passed"] is False
    assert rep["verdict"] == "BLOCKED"
    assert rep["regles_non_couvertes"] == ["genre.pong.playable_speed_range"]


def test_genre_coverage_red_aucune_ligne_aucune_citation():
    wiremap = {"lines": [{"id": "core.boot"}]}
    rep = check_genre_coverage(wiremap, _genre_bible())
    assert rep["verdict"] == "BLOCKED"
    assert set(rep["regles_non_couvertes"]) == {
        "genre.pong.two_paddles_vertical", "genre.pong.playable_speed_range",
    }


# --- RED #2 : citation qui ne RÉSOUT PAS (id inexistant) -> FAIL, priorité sur BLOCKED -


def test_genre_coverage_red_citation_id_inexistant_fail():
    wiremap = {"lines": [
        {"id": "play.paddle", "genre_refs": ["genre.pong.two_paddles_vertical"]},
        {"id": "play.playable_speed", "genre_refs": ["genre.pong.id_qui_nexiste_pas"]},
    ]}
    rep = check_genre_coverage(wiremap, _genre_bible())
    assert rep["passed"] is False
    assert rep["verdict"] == "FAIL"
    assert rep["citations_non_resolues"] == ["play.playable_speed:genre.pong.id_qui_nexiste_pas"]


def test_genre_coverage_citation_fail_prioritaire_sur_blocked():
    """Même si une AUTRE règle est aussi non couverte, une citation cassée rend FAIL,
    pas BLOCKED — une preuve d'échec l'emporte sur une absence de preuve (même
    arbitrage que `_run_standard_oracle` pour budget/autres volets)."""
    wiremap = {"lines": [
        {"id": "play.playable_speed", "genre_refs": ["genre.pong.id_fantome"]},
    ]}
    rep = check_genre_coverage(wiremap, _genre_bible())
    assert rep["verdict"] == "FAIL"


# --- refus explicite : couvre une règle SANS citation, si la raison est non vide ------


def test_genre_coverage_refus_explicite_avec_raison_couvre_la_regle():
    wiremap = {
        "lines": [{"id": "play.paddle", "genre_refs": ["genre.pong.two_paddles_vertical"]}],
        "genre_refusals": [
            {"rule_id": "genre.pong.playable_speed_range",
             "reason": "hors périmètre de ce nœud du curriculum, décision Pierre 2026-07-27"},
        ],
    }
    rep = check_genre_coverage(wiremap, _genre_bible())
    assert rep["passed"] is True
    assert rep["verdict"] == "OK"
    assert rep["refusees"] == ["genre.pong.playable_speed_range"]


def test_genre_coverage_refus_sans_raison_ne_couvre_pas():
    wiremap = {
        "lines": [{"id": "play.paddle", "genre_refs": ["genre.pong.two_paddles_vertical"]}],
        "genre_refusals": [{"rule_id": "genre.pong.playable_speed_range", "reason": ""}],
    }
    rep = check_genre_coverage(wiremap, _genre_bible())
    assert rep["verdict"] == "BLOCKED"
    assert rep["regles_non_couvertes"] == ["genre.pong.playable_speed_range"]


# --- GREEN : conforme et couvert, façonné à l'image de Pong (mêmes ids réels) ---------


def test_genre_coverage_green_pong_shape_ok():
    wiremap = {"lines": [
        {"id": "play.paddle", "genre_refs": ["genre.pong.two_paddles_vertical"]},
        {"id": "play.playable_speed", "genre_refs": ["genre.pong.playable_speed_range"]},
    ]}
    rep = check_genre_coverage(wiremap, _genre_bible())
    assert rep["passed"] is True
    assert rep["verdict"] == "OK"
    assert rep["regles_non_couvertes"] == []
    assert rep["citations_non_resolues"] == []
    assert set(rep["citees"]) == {
        "play.paddle:genre.pong.two_paddles_vertical",
        "play.playable_speed:genre.pong.playable_speed_range",
    }


# --- preuve n°1 de la boucle (critère (c) du contrat) : lu sur les VRAIS artefacts ----


def test_genre_coverage_preuve_n1_sur_les_vrais_artefacts_pong():
    """Charge le VRAI wiremap.json et la VRAIE genre_bible.json de Pong (pas des
    fixtures) : au moins une citation RÉSOUT — la preuve que la Genre Bible a été lue
    avant/pendant la conception plutôt que d'être une bible que personne ne cite."""
    import json
    from pathlib import Path

    root = Path(__file__).resolve().parents[3]
    wiremap = json.loads((root / "games/pong/09_WIREMAP/wiremap.json").read_text(encoding="utf-8"))
    genre_bible = json.loads((root / "games/pong/01_DESIGN/genre_bible.json").read_text(encoding="utf-8"))

    rep = check_genre_coverage(wiremap, genre_bible)
    assert rep["verdict"] == "OK", rep
    assert len(rep["citees"]) >= 1
    assert rep["citations_non_resolues"] == []
