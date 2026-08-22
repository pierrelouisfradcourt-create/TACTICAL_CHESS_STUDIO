"""Garde anti-contournement V4 (Task 5, lot « game loop », décision Pierre
2026-08-22) : `player_loop` n'a que `InputEvent`+lecture d'écran — un volet ou
`solvability.gd` qui prouve la boucle par un AUTRE canal (Economy, api_*,
05_SYSTEMS, runtime.gd) valide un jeu que le joueur ne peut pas traverser.
Deux pièces : (1) `run_godot_product_oracle` rejette CE volet, SANS spawn ;
(2) `check_loop_bypass(game_dir)` — garde STANDALONE, mapping de violations."""
import pytest
from pathlib import Path

from forge import product_oracle_godot as pog

REPO = Path(__file__).resolve().parents[3]
# Le build du run 6 est ARCHIVÉ (fixture du défaut : volets qui appellent api_buy_kitten / Economy) ;
# `games/kitten_clicker/` porte le build courant (run 7+, 0 violation) et ne vaut plus comme fixture.
KITTEN = REPO / "lab" / "forge_runs" / "kitten_clicker" / "_run6_20260821f" / "game_build6"

_REAL_SCENE = 'load("res://main.tscn")\n'


def _oracle_file(game_dir: Path, name: str, body: str) -> Path:
    d = game_dir / "07_TESTS" / "oracle"
    d.mkdir(parents=True, exist_ok=True)
    p = d / name
    p.write_text("extends SceneTree\n# FORGE_ORACLE\n" + _REAL_SCENE + body, encoding="utf-8")
    return p


# --- garde par volet dans run_godot_product_oracle --------------------------


def test_volet_avec_api_buy_kitten_fail_static_guard_sans_spawn(tmp_path):
    game = tmp_path / "game"
    _oracle_file(game, "cheat.gd", "func _init():\n\t_main.api_buy_kitten()\n")
    calls = []
    r = pog.run_godot_product_oracle(
        game, binary_resolver=lambda: "godot",
        runner=lambda *a, **k: calls.append(a) or {"returncode": 0, "stdout": "", "stderr": ""})
    assert calls == [], "aucun process ne doit être lancé pour un volet contournant la boucle"
    assert r["cheat"]["status"] == "FAIL"
    assert r["cheat"]["mode_execution"] == "static_guard"
    assert "api_buy_kitten" in r["cheat"]["fails"][0]


def test_mention_en_commentaire_seule_est_executee(tmp_path):
    game = tmp_path / "game"
    _oracle_file(game, "clean.gd", "# jadis on appelait api_buy_kitten() ici — retire\nfunc _init():\n\tpass\n")
    calls = []
    stdout = 'FORGE_ORACLE clean {"ok": true, "fails": []}'
    r = pog.run_godot_product_oracle(
        game, binary_resolver=lambda: "godot",
        runner=lambda *a, **k: calls.append(a) or {"returncode": 0, "stdout": stdout, "stderr": ""})
    assert len(calls) == 1, "un volet dont le token n'est qu'en commentaire doit être exécuté"
    assert r["clean"]["status"] == "OK"


def test_economy_declenche_aussi_la_garde(tmp_path):
    game = tmp_path / "game"
    _oracle_file(game, "economy_cheat.gd", "const Economy = preload(\"res://05_SYSTEMS/economy/economy.gd\")\n")
    r = pog.run_godot_product_oracle(
        game, binary_resolver=lambda: "godot",
        runner=lambda *a, **k: (_ for _ in ()).throw(AssertionError("jamais appelé")))
    assert r["economy_cheat"]["status"] == "FAIL"
    assert r["economy_cheat"]["mode_execution"] == "static_guard"


# --- check_loop_bypass standalone -------------------------------------------


def test_check_loop_bypass_passe_quand_aucun_token(tmp_path):
    game = tmp_path / "game"
    _oracle_file(game, "clean.gd", "func _init():\n\tpass\n")
    r = pog.check_loop_bypass(game)
    assert r == {"passed": True, "violations": []}


def test_check_loop_bypass_detecte_api_buy_kitten(tmp_path):
    game = tmp_path / "game"
    _oracle_file(game, "cheat.gd", "func _init():\n\t_main.api_buy_kitten()\n")
    r = pog.check_loop_bypass(game)
    assert r["passed"] is False
    assert any(v["fichier"].endswith("cheat.gd") and v["token"] == "api_buy_kitten" for v in r["violations"])


def test_check_loop_bypass_lit_aussi_solvability_racine(tmp_path):
    game = tmp_path / "game"
    game.mkdir()
    (game / "solvability.gd").write_text(
        'const Economy = preload("res://05_SYSTEMS/economy/economy.gd")\n', encoding="utf-8")
    r = pog.check_loop_bypass(game)
    assert r["passed"] is False
    assert any(v["fichier"].endswith("solvability.gd") and v["token"] == "Economy" for v in r["violations"])


# --- mesure RÉELLE sur le build du run 6 (baseline, kitten_clicker) ---------
# Vérifié par grep AVANT d'écrire ces assertions (pas une supposition) :
#   07_TESTS/oracle/main_screen_render.gd:82  -> _main.api_buy_kitten()
#   07_TESTS/oracle/core_audio.gd             -> api_buy_kitten / api_prestige / 05_SYSTEMS
#   games/kitten_clicker/solvability.gd       -> Economy (+ 05_SYSTEMS)


@pytest.mark.skipif(not (KITTEN / "project.godot").exists(), reason="archive du build run 6 introuvable")
def test_check_loop_bypass_sur_run6_mesure_les_violations_connues():
    r = pog.check_loop_bypass(KITTEN)
    assert r["passed"] is False
    fichiers_violations = {Path(v["fichier"]).name: v["token"] for v in r["violations"]}
    assert "main_screen_render.gd" in fichiers_violations
    assert fichiers_violations["main_screen_render.gd"] == "api_buy_kitten"
    assert "core_audio.gd" in fichiers_violations
    assert "solvability.gd" in fichiers_violations
