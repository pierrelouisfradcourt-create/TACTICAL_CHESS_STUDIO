"""Sonde bot-joueur `player_loop.gd` (Task 5, lot « game loop », 2026-08-22) : le bot
n'a que les entrées d'un joueur (InputEvent + lecture de Label groupe `hud`) — JAMAIS
Economy/api_*/05_SYSTEMS/runtime.gd (garde anti-contournement non négociable, décision
Pierre). Patron de `test_runtime_alive_probe.py` : source statique + `run_player_loop`
piloté par gpu_runner factice (jamais un vrai process ici, sauf la fixture réelle
explicitement gardée `skipif` en fin de fichier)."""
import json
import os
import subprocess
from pathlib import Path

import pytest

from forge import product_oracle_godot as pog

REPO = Path(__file__).resolve().parents[3]
PROBE = REPO / "scripts" / "forge" / "godot_probes" / "player_loop.gd"
KITTEN = REPO / "games" / "kitten_clicker"


def _line(ok, fails, data):
    return "FORGE_ORACLE player_loop " + json.dumps({"ok": ok, "fails": list(fails), "data": data})


# --- source statique --------------------------------------------------------


def test_la_sonde_existe_et_est_generique():
    src = PROBE.read_text(encoding="utf-8")
    assert "extends SceneTree" in src
    assert "InputEventMouseButton" in src
    assert 'get_nodes_in_group("affordance")' in src
    assert 'get_nodes_in_group("hud")' in src
    assert "run/main_scene" in src


def test_la_sonde_ne_connait_aucune_connaissance_du_jeu():
    src = PROBE.read_text(encoding="utf-8")
    for token in ("Economy", "api_", "05_SYSTEMS", "runtime.gd"):
        assert token not in src, f"token interdit '{token}' trouvé dans la sonde"


# --- run_player_loop : ok / fail / not_measured / muet, via gpu_runner factice ----


def _game_with_loop_json(tmp_path) -> Path:
    game = tmp_path / "game"
    (game / "03_WORLD").mkdir(parents=True)
    (game / "03_WORLD" / "loop.json").write_text('{"steps": []}', encoding="utf-8")
    return game


def test_ok_quand_tous_les_steps_passent(tmp_path):
    game = _game_with_loop_json(tmp_path)
    data = {"steps": [{"role": "PLAYER_GOAL", "ref": "PG1", "pass": True}],
            "reached_role": "META_LOOP", "frames": 500}
    stdout = _line(True, [], data)
    r = pog.run_player_loop(game, binary_resolver=lambda: "godot",
                            gpu_runner=lambda *a, **k: {"returncode": 0, "stdout": stdout, "stderr": ""})
    assert r["status"] == "OK" and r["passed"] is True and r["checked"] is True
    assert r["payload"]["data"]["reached_role"] == "META_LOOP"


def test_fail_quand_un_step_echoue(tmp_path):
    game = _game_with_loop_json(tmp_path)
    data = {"steps": [{"role": "PLAYER_ACTION", "ref": "PA2", "pass": False,
                       "reason": "affordance 'acheter_chaton' introuvable"}],
            "reached_role": "PLAYER_ACTION", "frames": 200}
    stdout = _line(False, ["step PA2 (PLAYER_ACTION) : predicat 'increases' non satisfait"], data)
    r = pog.run_player_loop(game, binary_resolver=lambda: "godot",
                            gpu_runner=lambda *a, **k: {"returncode": 1, "stdout": stdout, "stderr": ""})
    assert r["status"] == "FAIL" and r["passed"] is False
    assert r["payload"]["data"]["reached_role"] == "PLAYER_ACTION"


def test_not_measured_sans_godot(tmp_path):
    game = _game_with_loop_json(tmp_path)
    r = pog.run_player_loop(game, binary_resolver=lambda: None)
    assert r["status"] == "NOT_MEASURED" and r["checked"] is False and r["passed"] is False


def test_fail_sortie_muette(tmp_path):
    game = _game_with_loop_json(tmp_path)
    r = pog.run_player_loop(game, binary_resolver=lambda: "godot",
                            gpu_runner=lambda *a, **k: {"returncode": 1, "stdout": "", "stderr": "crash"})
    assert r["status"] == "FAIL" and r["checked"] is True
    assert "muette" in " ".join(r["fails"])


def test_skipped_sans_loop_json(tmp_path):
    game = tmp_path / "game"
    game.mkdir()
    calls = []
    r = pog.run_player_loop(
        game, binary_resolver=lambda: "godot",
        gpu_runner=lambda *a, **k: calls.append(a) or (_ for _ in ()).throw(AssertionError("jamais appelé")))
    assert calls == []
    assert r["status"] == "SKIPPED" and r["checked"] is False and r["passed"] is False


def test_fail_sans_spawn_quand_sha_altere(tmp_path):
    game = _game_with_loop_json(tmp_path)
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    (run_dir / "loop.json").write_text('{"steps": [1]}', encoding="utf-8")  # sha != celui du jeu
    r = pog.run_player_loop(
        game, run_dir=run_dir, binary_resolver=lambda: "godot",
        gpu_runner=lambda *a, **k: (_ for _ in ()).throw(AssertionError("jamais appelé — sha altéré")))
    assert r["status"] == "FAIL" and r["checked"] is True
    assert "altéré" in " ".join(r["fails"])


def test_pas_de_fail_sha_quand_identique(tmp_path):
    game = _game_with_loop_json(tmp_path)
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    (run_dir / "loop.json").write_text('{"steps": []}', encoding="utf-8")  # même contenu, même sha
    stdout = _line(True, [], {"steps": [], "reached_role": "NONE", "frames": 60})
    r = pog.run_player_loop(
        game, run_dir=run_dir, binary_resolver=lambda: "godot",
        gpu_runner=lambda *a, **k: {"returncode": 0, "stdout": stdout, "stderr": ""})
    assert r["status"] == "OK"


# --- fixture réelle : la sonde sur le build du run 6 (baseline) --------------
# NE COPIE PAS games/kitten_clicker/ (65 fichiers) — lance la sonde SUR LE JEU
# TEL QUEL, avec un loop.json TEMPORAIRE (tmp_path, jamais sous games/**) transmis
# par la variable d'environnement KC_LOOP_JSON_OVERRIDE que la sonde lit — UNIQUEMENT
# pour ce test. Le run 6 n'a AUCUN groupe hud/affordance : la sonde doit donc
# s'arrêter dès le premier step, avec exactement le diagnostic mesuré du run 6.


def _godot_binary():
    try:
        return pog._default_binary_resolver()
    except Exception:
        return None


@pytest.mark.skipif(_godot_binary() is None, reason="binaire Godot non configuré sur ce poste")
def test_sonde_reelle_sur_baseline_run6(tmp_path):
    binary = _godot_binary()
    loop_spec = {
        "schema_version": 1, "game_id": "kitten_clicker",
        "steps": [
            {"role": "PLAYER_ACTION", "ref": "PA1", "affordance": "pelote", "repeat": 15,
             "observe": {"hud": "ronrons", "predicate": "increases"}},
            {"role": "PLAYER_ACTION", "ref": "PA2", "affordance": "acheter_chaton",
             "observe": {"hud": "collection", "predicate": "increases"}},
        ],
    }
    loop_json_path = tmp_path / "loop.json"
    loop_json_path.write_text(json.dumps(loop_spec), encoding="utf-8")
    env = dict(os.environ)
    env["KC_LOOP_JSON_OVERRIDE"] = str(loop_json_path)
    proc = subprocess.run(
        [binary, *pog.GPU_WINDOW_FLAGS, "--path", str(KITTEN), "--script", str(PROBE)],
        capture_output=True, text=True, timeout=90, encoding="utf-8", errors="replace", env=env,
    )
    line = next((l for l in proc.stdout.splitlines() if l.startswith("FORGE_ORACLE player_loop")), None)
    assert line is not None, f"sortie muette. stdout={proc.stdout!r} stderr={proc.stderr!r}"
    payload = json.loads(line.split(" ", 2)[2])
    assert payload["ok"] is False
    assert payload["data"]["reached_role"] == "NONE"
    assert any("ronrons" in f and "introuvable" in f for f in payload["fails"])
