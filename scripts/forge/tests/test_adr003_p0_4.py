# -*- coding: utf-8 -*-
"""ADR-003 lot 1 — tests des 5 P0, un bloc par sous-lot, causalement attribués.

Source : docs/adr/ADR-003-forge-workflow-coherence-audit.md (GO Pierre 2026-08-15).
Nouveau fichier : n'altère aucun test existant (zone protégée respectée).
"""
from __future__ import annotations

from pathlib import Path
# ---------------------------------------------------------------------------
# P0-4 — la directive de mode GPU devient un champ VÉRIFIÉ (« aucune décision
# dans un commentaire », ratifié 2026-07-23). Avant : les .gd de breakout_v2
# exigeaient la fenêtre GPU en prose seule → routés --headless → rouges
# FABRIQUÉS (« --headless rend une texture nulle »). check_gpu_window_directive
# refuse (BLOCKED, jamais FAIL — réparer l'instrument, pas le jeu).
# ---------------------------------------------------------------------------

from forge.standard_oracles import check_gpu_window_directive


def test_p0_4_prose_sans_directive_est_bloquee(tmp_path: Path):
    # En-tête copié du cas réel : games/breakout_v2/07_TESTS/oracle/core_render_frame.gd:4
    (tmp_path / "core_render_frame.gd").write_text(
        "extends SceneTree\n# Fenetre GPU reelle exigee (charter)\n# demo pixel\n",
        encoding="utf-8")
    r = check_gpu_window_directive(tmp_path)
    assert r["passed"] is False
    assert r["verdict"] == "BLOCKED", "instrument à réparer — jamais FAIL, jamais OK"
    assert r["fichiers_en_defaut"] == ["core_render_frame.gd"]
    assert any("rouge fabriqué" in x for x in r["raisons"])


def test_p0_4_directive_structuree_passe(tmp_path: Path):
    (tmp_path / "core_render_frame.gd").write_text(
        "# forge:run_mode = gpu_window\n# Fenetre GPU reelle exigee (charter)\n",
        encoding="utf-8")
    r = check_gpu_window_directive(tmp_path)
    assert r["passed"] is True and r["verdict"] == "OK"
    assert r["fichiers_avec_directive"] == 1


def test_p0_4_sans_exigence_gpu_rien_a_signaler(tmp_path: Path):
    (tmp_path / "solvability.gd").write_text(
        "extends SceneTree\n# bot deterministe qui doit gagner\n", encoding="utf-8")
    r = check_gpu_window_directive(tmp_path)
    assert r["passed"] is True and r["fichiers_en_defaut"] == []


def test_p0_4_repertoire_absent_ne_fabrique_pas_d_exigence(tmp_path: Path):
    r = check_gpu_window_directive(tmp_path / "n_existe_pas")
    assert r["passed"] is True and r["fichiers_examines"] == 0


def test_p0_4_meme_autorite_que_le_routeur(tmp_path: Path):
    """La détection de la directive doit être LA regex du routeur (source unique) :
    une variante d'espacement acceptée par le routeur doit l'être ici aussi."""
    (tmp_path / "v.gd").write_text(
        "# forge : run_mode=gpu_window\n# fenetre GPU obligatoire\n", encoding="utf-8")
    from forge.product_oracle_godot import _gpu_window_declared
    assert _gpu_window_declared(tmp_path / "v.gd") is True
    r = check_gpu_window_directive(tmp_path)
    assert r["passed"] is True, "désaccord routeur/contrôle = deux vérités, interdit"


