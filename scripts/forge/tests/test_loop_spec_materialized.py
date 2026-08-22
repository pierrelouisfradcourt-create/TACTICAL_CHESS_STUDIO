"""Matérialisation de `loop.json` (Gameplay Contract V2, GO Pierre 2026-08-22).

VERROU ABSOLU : `loop.json` est une PROJECTION DÉTERMINISTE de `prisme.json`,
écrite par l'EXÉCUTEUR (`run_real._materialize_loop_spec`) APRÈS que
`prisme.json` soit déjà sur disque — jamais par un LLM. Ce test vérifie que
cette matérialisation fonctionne sur un run_dir tmp synthétique (boucle
complète -> OK) ET sur la fixture RÉELLE du run 7 (kitten_clicker-20260821g,
commit 3843d7b : 8 exigences portent `loop_role`, boucle A..I atteinte, H et J
n'existent pas encore comme maillons -> steps non vides, verdict FAIL nommé,
JAMAIS une exception). Chemin non archivé (dernière run non déplacée sous
`_runN_...`) — la fixture a évolué depuis le run 6 d'origine (0 exigence
`loop_role`) ; ce test date du 2026-08-22 (lot Gameplay Contract T1) et mesure
l'état réel de ce fichier, pas un état figé.

    PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest \
        scripts/forge/tests/test_loop_spec_materialized.py -v
"""
from __future__ import annotations

import json
from pathlib import Path

import forge.run_real as run_real

REPO_ROOT = Path(__file__).resolve().parents[3]
RUN7_PRISME = REPO_ROOT / "lab" / "forge_runs" / "kitten_clicker" / "prisme.json"


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
    # Gameplay Contract V2 (GO Pierre 2026-08-22) : 10 maillons A..J (C porte
    # par B) — G porte >= 2 exigences new_distinct sur le meme hud, H (REPEAT)
    # rejoue des refs B..F, J (ADVANTAGE) reference une ref B avec un predicat
    # increases_more_than: coherent, F porte observe.appears.
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
                       observe={"hud": "taux", "predicate": "increases", "appears": "affordance"}),
            _exigence("NG1", "NEXT_GOAL", observe={"hud": "objectif", "predicate": "new_distinct"}),
            _exigence("NG2", "NEXT_GOAL", observe={"hud": "objectif", "predicate": "new_distinct"}),
            _exigence("RP1", "REPEAT", replay=["PA1", "UN1"],
                       observe={"hud": "ronrons", "predicate": "increases"}),
            _exigence("ML1", "META_LOOP", acteur="PLAYER", affordance="prestige",
                       observe={"hud": "prestige", "predicate": "increases"}),
            _exigence("AD1", "ADVANTAGE", replay_ref="PA1",
                       observe={"hud": "ronrons", "predicate": "increases_more_than:PA1"}),
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
    assert len(data["steps"]) == 11
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
        "REWARD", "UNLOCK", "NEXT_GOAL", "NEXT_GOAL", "REPEAT", "META_LOOP",
        "ADVANTAGE",
    ]


# --- (b) fixture RÉELLE run 7 : boucle incomplete -> steps non vides, FAIL, jamais une exception --

def test_run7_reel_materialise_loop_json_fail_sans_exception(tmp_path):
    assert RUN7_PRISME.exists(), f"fixture reelle absente : {RUN7_PRISME}"
    run_dir = tmp_path / "run"
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "prisme.json").write_bytes(RUN7_PRISME.read_bytes())

    recu = run_real._materialize_loop_spec("s1-prisme", run_dir)  # ne doit JAMAIS lever

    assert recu is not None
    assert recu["written"] is True, recu
    loop_path = run_dir / "loop.json"
    assert loop_path.exists()
    data = json.loads(loop_path.read_text(encoding="utf-8"))
    assert len(data["steps"]) == 8  # EX01..EX07 + EX18, cf. prisme.json reel
    assert recu["check"]["verdict"] == "FAIL"
    problems = recu["check"]["problems"]
    assert any("REWARD" in p and "EX04" in p for p in problems), problems
    assert any("NEXT_GOAL" in p and "1 trouvee" in p for p in problems), problems
    assert any("REPEAT" in p and "0 trouvee" in p for p in problems), problems
    assert any("ADVANTAGE" in p and "0 trouvee" in p for p in problems), problems
    assert any("UNLOCK" in p and "appears" in p for p in problems), problems


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
