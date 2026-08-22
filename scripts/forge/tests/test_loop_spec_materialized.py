"""Matérialisation de `loop.json` (V4 GAME LOOP, GO Pierre 2026-08-22).

VERROU ABSOLU : `loop.json` est une PROJECTION DÉTERMINISTE de `prisme.json`,
écrite par l'EXÉCUTEUR (`run_real._materialize_loop_spec`) APRÈS que
`prisme.json` soit déjà sur disque — jamais par un LLM. Ce test vérifie que
cette matérialisation fonctionne sur un run_dir tmp synthétique (boucle
complète -> OK) ET sur la fixture RÉELLE du run 6 (0 exigence porte
`loop_role` -> steps vides, verdict FAIL, JAMAIS une exception).

    PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest \
        scripts/forge/tests/test_loop_spec_materialized.py -v
"""
from __future__ import annotations

import json
from pathlib import Path

import forge.run_real as run_real

REPO_ROOT = Path(__file__).resolve().parents[3]
RUN6_PRISME = REPO_ROOT / "lab" / "forge_runs" / "kitten_clicker" / "prisme.json"


def _exigence(id_, role, **extra):
    return {
        "id": id_,
        "source": "ADDITIONS",
        "source_role": "prisme",
        "reference": None,
        "observation": f"observation {id_}",
        "claim": f"claim {id_}",
        "enonce": f"enonce {id_} distinct",
        "expected_proof": {"kind": "bot_action", "statement": f"preuve {id_}"},
        "destination": "s9-build",
        "loop_role": role,
        **extra,
    }


def _prisme_synthetique_complet() -> dict:
    return {
        "game_id": "kitten_clicker",
        "exigences": [
            _exigence("PG1", "PLAYER_GOAL", observe={"hud": "objectif", "predicate": "nonempty"}),
            _exigence("PA1", "PLAYER_ACTION", acteur="PLAYER", affordance="pelote", repeat=15,
                       observe={"hud": "ronrons", "predicate": "increases"}),
            _exigence("PA2", "PLAYER_ACTION", acteur="PLAYER", affordance="acheter_chaton",
                       observe={"hud": "collection", "predicate": "increases"}),
            _exigence("GR1", "GAME_RESPONSE", observe={"hud": "taux", "predicate": "increases", "wait_frames": 120}),
            _exigence("RW1", "REWARD", observe={"hud": "ronrons", "predicate": "increases", "wait_frames": 120}),
            _exigence("UN1", "UNLOCK", acteur="PLAYER", affordance="acheter_amelioration",
                       observe={"hud": "taux", "predicate": "increases"}),
            _exigence("NG1", "NEXT_GOAL", observe={"hud": "objectif", "predicate": "changes"}),
            _exigence("ML1", "META_LOOP", acteur="PLAYER", affordance="prestige",
                       observe={"hud": "prestige", "predicate": "increases"}),
        ],
    }


def _ecrit_prisme(run_dir: Path, data: dict) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "prisme.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


# --- (a) run_dir tmp synthétique : boucle complète -> loop.json OK -----------------

def test_prisme_synthetique_complet_materialise_loop_json_ok(tmp_path):
    run_dir = tmp_path / "run"
    _ecrit_prisme(run_dir, _prisme_synthetique_complet())

    recu = run_real._materialize_loop_spec("s1-prisme", run_dir)

    assert recu is not None
    assert recu["written"] is True, recu
    loop_path = run_dir / "loop.json"
    assert loop_path.exists()
    data = json.loads(loop_path.read_text(encoding="utf-8"))
    assert isinstance(data, dict)
    assert isinstance(data.get("steps"), list)
    assert len(data["steps"]) == 8
    assert recu["check"]["verdict"] == "OK"
    assert recu["check"]["problems"] == []


def test_ordre_des_etapes_respecte_la_sequence_imposee(tmp_path):
    run_dir = tmp_path / "run"
    _ecrit_prisme(run_dir, _prisme_synthetique_complet())
    run_real._materialize_loop_spec("s1-prisme", run_dir)
    data = json.loads((run_dir / "loop.json").read_text(encoding="utf-8"))
    roles = [s["role"] for s in data["steps"]]
    assert roles == [
        "PLAYER_GOAL", "PLAYER_ACTION", "PLAYER_ACTION", "GAME_RESPONSE",
        "REWARD", "UNLOCK", "NEXT_GOAL", "META_LOOP",
    ]


# --- (b) fixture RÉELLE run 6 : 0 exigence loop_role -> steps vides, FAIL, jamais une exception --

def test_run6_reel_materialise_loop_json_vide_et_fail_sans_exception(tmp_path):
    assert RUN6_PRISME.exists(), f"fixture reelle absente : {RUN6_PRISME}"
    run_dir = tmp_path / "run"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "prisme.json").write_bytes(RUN6_PRISME.read_bytes())

    recu = run_real._materialize_loop_spec("s1-prisme", run_dir)  # ne doit JAMAIS lever

    assert recu is not None
    assert recu["written"] is True, recu
    loop_path = run_dir / "loop.json"
    assert loop_path.exists()
    data = json.loads(loop_path.read_text(encoding="utf-8"))
    assert data["steps"] == []
    assert recu["check"]["verdict"] == "FAIL"
    assert len(recu["check"]["problems"]) == 5  # tronque a 5 (7 roles manquants reels)


# --- (c) garde-fous ------------------------------------------------------------------

def test_etape_non_s1_prisme_ne_produit_aucun_recu(tmp_path):
    run_dir = tmp_path / "run"
    _ecrit_prisme(run_dir, _prisme_synthetique_complet())
    assert run_real._materialize_loop_spec("s3-decompo", run_dir) is None
    assert not (run_dir / "loop.json").exists()


def test_prisme_absent_recu_honnete_sans_ecriture(tmp_path):
    run_dir = tmp_path / "run"
    run_dir.mkdir(parents=True, exist_ok=True)
    recu = run_real._materialize_loop_spec("s1-prisme", run_dir)
    assert recu is not None
    assert recu["written"] is False
    assert not (run_dir / "loop.json").exists()
