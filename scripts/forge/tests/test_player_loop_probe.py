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
# Build du RUN 7 ARCHIVÉ = fixture des mesures figées ci-dessous ; `games/kitten_clicker/` est
# le build courant (remplacé à chaque run) et ne vaut pas comme fixture.
KITTEN = REPO / "lab" / "forge_runs" / "kitten_clicker" / "_run7_20260821g" / "game_build7"  # build du run 7 (hud "ronrons" existe)
KITTEN_RUN6 = (REPO / "lab" / "forge_runs" / "kitten_clicker" / "_run6_20260821f"
               / "game_build6")  # baseline run 6 : aucun groupe hud/affordance
# Build du run 8b ARCHIVÉ (T2, 2026-08-23) : loop.json réel porte les steps A..J du
# contrat s1 (schéma DECISION à venir dans T1) ; ce build lui-même ne porte PAS encore
# de step DECISION — on en fabrique un synthétique dans le loop.json de test.
KITTEN_RUN8 = (REPO / "lab" / "forge_runs" / "kitten_clicker" / "_run8_20260821h2"
               / "game_build8")


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


def test_la_sonde_porte_les_nouveaux_predicats():
    src = PROBE.read_text(encoding="utf-8")
    for token in ("new_distinct", "appears", "increases_more_than", "decreases", "resets", "replay"):
        assert token in src, f"predicat/mecanisme '{token}' absent de la sonde"


def test_la_sonde_porte_le_role_decision():
    src = PROBE.read_text(encoding="utf-8")
    for token in ("DECISION", "policies", "_reset_scene", "nondominance"):
        assert token in src, f"token '{token}' absent de la sonde (role DECISION)"


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
# NE COPIE PAS le build (nombreux fichiers) — lance la sonde SUR LE JEU TEL QUEL,
# avec un loop.json TEMPORAIRE (tmp_path, jamais sous games/**) transmis par la
# variable d'environnement KC_LOOP_JSON_OVERRIDE que la sonde lit — UNIQUEMENT pour
# ces tests. games/kitten_clicker/ EST maintenant le build du run 7 (hud "ronrons"
# existe) : la baseline "aucun groupe hud/affordance" du run 6 vit désormais sous
# lab/forge_runs/kitten_clicker/_run6_20260821f/game_build6 (skip propre si absent —
# preuve reconstituée, jamais déplacée hors de lab/forge_evidence/forge_runs).


def _godot_binary():
    try:
        return pog._default_binary_resolver()
    except Exception:
        return None


def _run_probe(game_dir: Path, loop_spec: dict, tmp_path: Path, *, timeout: int = 120) -> dict:
    binary = _godot_binary()
    loop_json_path = tmp_path / "loop.json"
    loop_json_path.write_text(json.dumps(loop_spec), encoding="utf-8")
    env = dict(os.environ)
    env["KC_LOOP_JSON_OVERRIDE"] = str(loop_json_path)
    proc = subprocess.run(
        [binary, *pog.GPU_WINDOW_FLAGS, "--path", str(game_dir), "--script", str(PROBE)],
        capture_output=True, text=True, timeout=timeout, encoding="utf-8", errors="replace", env=env,
    )
    line = next((l for l in proc.stdout.splitlines() if l.startswith("FORGE_ORACLE player_loop")), None)
    assert line is not None, f"sortie muette. stdout={proc.stdout!r} stderr={proc.stderr!r}"
    return json.loads(line.split(" ", 2)[2])


_RUN6_SKIP_REASON = "binaire Godot non configuré sur ce poste" if _godot_binary() is None \
    else ("build run 6 absent (lab/forge_runs/kitten_clicker/_run6_20260821f/game_build6)"
          if not KITTEN_RUN6.is_dir() else "")


@pytest.mark.skipif(bool(_RUN6_SKIP_REASON), reason=_RUN6_SKIP_REASON)
def test_sonde_reelle_sur_baseline_run6(tmp_path):
    loop_spec = {
        "schema_version": 1, "game_id": "kitten_clicker",
        "steps": [
            {"role": "PLAYER_ACTION", "ref": "PA1", "affordance": "pelote", "repeat": 15,
             "observe": {"hud": "ronrons", "predicate": "increases"}},
            {"role": "PLAYER_ACTION", "ref": "PA2", "affordance": "acheter_chaton",
             "observe": {"hud": "collection", "predicate": "increases"}},
        ],
    }
    payload = _run_probe(KITTEN_RUN6, loop_spec, tmp_path)
    assert payload["ok"] is False
    assert payload["data"]["reached_role"] == "NONE"
    assert any("ronrons" in f and "introuvable" in f for f in payload["fails"])


# --- fixtures réelles : contrat A-J synthétique sur le build du run 7 --------
# Économie réelle du run 7 (games/kitten_clicker) mesurée par exécution directe le
# 2026-08-22 : clic pelote = +1.0 ronrons/cumul (multiplicateur 1.0), amélioration
# coûte 5 (plate +0.5 taux), chaton coûte 10 (+0.2 taux) MAIS `acheter_chaton`
# n'ajoute JAMAIS le chaton spawné au groupe "affordance" (render.gd:_spawn_prochain_
# chaton n'appelle pas add_to_group) — mesuré : aucune affordance ni hud n'apparaît
# jamais dans ce build après F. C'est une PROPRIÉTÉ MESURÉE du run 7, pas un bug de
# sonde : reportée telle quelle (rupture localisée au step F, `appears`).

_SYNTHETIC_PREFIX_STEPS = [
    {"role": "PLAYER_GOAL", "ref": "SA1", "observe": {"hud": "objectif", "predicate": "nonempty"}},
    {"role": "PLAYER_ACTION", "ref": "SB1", "affordance": "pelote", "repeat": 15,
     "observe": {"hud": "ronrons", "predicate": "increases"}},
    {"role": "PLAYER_ACTION", "ref": "SB2", "affordance": "acheter_amelioration", "repeat": 1,
     "observe": {"hud": "production_par_seconde", "predicate": "increases"}},
    {"role": "GAME_RESPONSE", "ref": "SD1", "wait_frames": 30,
     "observe": {"hud": "ronrons", "predicate": "increases"}},
    {"role": "REWARD", "ref": "SE1", "wait_frames": 30,
     "observe": {"hud": "ronrons", "predicate": "increases"}},
]


@pytest.mark.skipif(_godot_binary() is None or not (KITTEN / "project.godot").exists(),
                    reason="binaire Godot non configuré ou archive du build run 7 absente")
def test_contrat_synthetique_avec_appears_echoue_sur_F(tmp_path):
    """F (UNLOCK) porte `observe.appears:"affordance"` (contrat T5) : MESURÉ sur le
    build réel du run 7, `acheter_chaton` fait bien progresser `production_par_seconde`
    mais ne fait apparaître AUCUNE nouvelle affordance -> F échoue sur `appears`, la
    boucle s'arrête là (reached_role reste au dernier step PASS, REWARD). C'est la
    divergence mesurée annoncée par le plan T3 (« F échoue sur appears OU G échoue sur
    new_distinct ») : sur ce build, c'est F qui échoue, avant que G ne soit atteint."""
    steps = _SYNTHETIC_PREFIX_STEPS + [
        {"role": "UNLOCK", "ref": "SF1", "affordance": "acheter_chaton", "repeat": 1, "wait_frames": 30,
         "observe": {"hud": "production_par_seconde", "predicate": "increases", "appears": "affordance"}},
        {"role": "NEXT_GOAL", "ref": "SG1", "wait_frames": 30,
         "observe": {"hud": "objectif", "predicate": "new_distinct"}},
        {"role": "NEXT_GOAL", "ref": "SG2", "wait_frames": 30,
         "observe": {"hud": "objectif", "predicate": "new_distinct"}},
        {"role": "REPEAT", "ref": "SH1", "replay": ["SB1"], "observe": {"hud": "ronrons", "predicate": "increases"}},
        {"role": "META_LOOP", "ref": "SI1", "affordance": "prestige", "repeat": 1, "wait_frames": 30,
         "observe": {"hud": "ronrons", "predicate": "decreases"}},
        {"role": "ADVANTAGE", "ref": "SJ1", "replay_ref": "SB1",
         "observe": {"hud": "ronrons", "predicate": "increases_more_than:SB1"}},
    ]
    loop_spec = {"schema_version": 1, "game_id": "kitten_clicker", "steps": steps}
    payload = _run_probe(KITTEN, loop_spec, tmp_path)

    # Mesuré le 2026-08-22 sur games/kitten_clicker (run 7) :
    # FORGE_ORACLE player_loop {"data":{"deltas":{"SA1":0.0,"SB1":15.0,"SB2":0.5,
    #  "SD1":15.0,"SE1":15.0},"frames":280,"reached_role":"REWARD", ...},
    #  "fails":["step SF1 (UNLOCK) : appears 'affordance' : 4 -> 4, aucun nouvel element"],
    #  "ok":false}
    assert payload["ok"] is False
    assert payload["data"]["reached_role"] == "REWARD"
    assert "deltas" in payload["data"] and "seen" in payload["data"]
    assert payload["data"]["deltas"]["SB1"] == 15.0
    fail_step = next(s for s in payload["data"]["steps"] if s["ref"] == "SF1")
    assert fail_step["pass"] is False
    assert fail_step["appears_before"] == fail_step["appears_after"]
    assert "appears 'affordance'" in fail_step["reason"]
    assert "aucun nouvel element" in fail_step["reason"]
    assert not any(s["ref"] in ("SG1", "SG2", "SH1", "SI1", "SJ1") for s in payload["data"]["steps"])


@pytest.mark.skipif(_godot_binary() is None or not (KITTEN / "project.godot").exists(),
                    reason="binaire Godot non configuré ou archive du build run 7 absente")
def test_contrat_synthetique_sans_appears_atteint_J(tmp_path):
    """Même préfixe A-E, mais F SANS la clause `appears` (contrainte que le build du
    run 7 ne peut structurellement pas satisfaire, cf. test précédent) : MESURE le
    mécanisme complet G (new_distinct), H (REPEAT, rejoue SB1), I (META_LOOP, prestige
    -> `ronrons` decreases), J (ADVANTAGE, delta strictement supérieur au delta de
    SB1) sur une VRAIE exécution Godot, jusqu'au bout de la chaîne."""
    steps = _SYNTHETIC_PREFIX_STEPS + [
        {"role": "UNLOCK", "ref": "SF1", "affordance": "acheter_chaton", "repeat": 1, "wait_frames": 30,
         "observe": {"hud": "production_par_seconde", "predicate": "increases"}},
        {"role": "NEXT_GOAL", "ref": "SG1", "wait_frames": 30,
         "observe": {"hud": "objectif", "predicate": "new_distinct"}},
        {"role": "REPEAT", "ref": "SH1", "replay": ["SB1"], "observe": {"hud": "ronrons", "predicate": "increases"}},
        {"role": "META_LOOP", "ref": "SI1", "affordance": "prestige", "repeat": 1, "wait_frames": 30,
         "observe": {"hud": "ronrons", "predicate": "decreases"}},
        {"role": "ADVANTAGE", "ref": "SJ1", "replay_ref": "SB1",
         "observe": {"hud": "ronrons", "predicate": "increases_more_than:SB1"}},
    ]
    loop_spec = {"schema_version": 1, "game_id": "kitten_clicker", "steps": steps}
    payload = _run_probe(KITTEN, loop_spec, tmp_path)

    # Mesuré le 2026-08-22 sur games/kitten_clicker (run 7), reached_role="ADVANTAGE",
    # ok=true, "fails":[] ; deltas contient SB1:15.0, "SB1@replay":57.0, SJ1:31.4
    # (31.4 > 15.0 -> increases_more_than:SB1 PASS) ; seen["objectif"] contient les 2
    # textes distincts ("Atteins 5 ronrons cumules (palier 1)" puis le texte final).
    assert payload["ok"] is True
    assert payload["data"]["reached_role"] == "ADVANTAGE"
    assert payload["fails"] == []
    deltas = payload["data"]["deltas"]
    assert deltas["SB1"] == 15.0
    assert "SB1@replay" in deltas
    assert deltas["SJ1"] > deltas["SB1"]
    seen_objectif = payload["data"]["seen"]["objectif"]
    assert len(set(seen_objectif)) >= 2

    g1 = next(s for s in payload["data"]["steps"] if s["ref"] == "SG1")
    assert g1["pass"] is True

    h1 = next(s for s in payload["data"]["steps"] if s["ref"] == "SH1")
    assert h1["pass"] is True
    assert h1["role"] == "REPEAT"
    assert len(h1["replays"]) == 1
    assert h1["replays"][0]["ref"] == "SB1"
    assert h1["replays"][0]["pass"] is True

    i1 = next(s for s in payload["data"]["steps"] if s["ref"] == "SI1")
    assert i1["pass"] is True
    assert i1["role"] == "META_LOOP"

    j1 = next(s for s in payload["data"]["steps"] if s["ref"] == "SJ1")
    assert j1["pass"] is True
    assert j1["role"] == "ADVANTAGE"


# --- fixture réelle : step DECISION synthétique sur le build du run 8b ------
# Préfixe = les steps réels du loop.json du run 8b jusqu'à `s_reward_kitten` inclus
# (g_goal_first, p_buy_kitten, p_click_pelote, s_auto_production, s_upgrade_rate,
# s_reward_kitten), puis un step DECISION synthétique. Le build 8b ne porte AUCUN
# Label `cout_*`/`effet_*` (mesuré : 06_RUNTIME/adapters/input_adapters/*.gd n'en
# créent aucun, seul `main.gd:_build_cost_ladder` crée des Labels "cout_<montant>"
# dans le groupe "cost_ladder", jamais "hud") -> INFORMATION doit échouer pour A et B.
# 4 affordances au total dans ce build (pelote, acheter_chaton, acheter_amelioration,
# prestige), aucune n'apparaît/disparaît selon l'achat -> FUTURE probablement en échec
# (4 -> 4, aucun `cout_*` hud non plus). Valeurs figées ci-dessous = MESURE, pas
# ajustement de la sonde au plan (cf. consigne T2 : jamais l'inverse).

_RUN8_PREFIX_STEPS = [
    {"role": "PLAYER_GOAL", "ref": "g_goal_first", "repeat": 1,
     "observe": {"hud": "objectif", "predicate": "nonempty"}},
    {"role": "PLAYER_ACTION", "ref": "p_buy_kitten", "affordance": "acheter_chaton", "repeat": 1,
     "observe": {"hud": "collection", "predicate": "increases"}},
    {"role": "PLAYER_ACTION", "ref": "p_click_pelote", "affordance": "pelote", "repeat": 5,
     "observe": {"hud": "ronrons", "predicate": "increases"}},
    {"role": "GAME_RESPONSE", "ref": "s_auto_production", "repeat": 1,
     "observe": {"hud": "ronrons", "predicate": "increases"}, "wait_frames": 120},
    {"role": "GAME_RESPONSE", "ref": "s_upgrade_rate", "repeat": 1,
     "observe": {"hud": "taux_production", "predicate": "increases"}},
    {"role": "REWARD", "ref": "s_reward_kitten", "repeat": 1,
     "observe": {"hud": "taux_production", "predicate": "increases"}},
]

_RUN8_DECISION_STEP = {
    "role": "DECISION", "ref": "d_first_spend",
    "options": ["p_buy_kitten", "p_unlock_location"],
    "metric": "ronrons", "horizon_frames": 300,
    "policies": [
        {"name": "idle", "click": None, "every_frames": 0},
        {"name": "actif", "click": "pelote", "every_frames": 3},
    ],
    "observe": {"hud": "objectif", "predicate": "changes"}, "wait_frames": 30,
}

# Définition réelle du step (loop.json du run 8b) portant l'affordance de l'option B —
# placée APRÈS le step DECISION dans `steps` : `_option_affordance` la résout par ref
# (elle scanne tout `_steps`) mais `_decision_prefix` s'arrête au step DECISION, donc
# elle ne fait PAS partie du préfixe rejoué (seul `p_buy_kitten`, déjà dans le préfixe,
# y est). Si le step DECISION PASS, cette définition redevient un step F normal joué
# pour de vrai par la continuation — mesuré non atteint ici (DECISION échoue avant).
_RUN8_UNLOCK_LOCATION_STEP = {
    "role": "UNLOCK", "ref": "p_unlock_location", "affordance": "acheter_amelioration", "repeat": 1,
    "observe": {"hud": "lieux", "predicate": "changes", "appears": "jardin"},
}


@pytest.mark.skipif(_godot_binary() is None or not (KITTEN_RUN8 / "project.godot").exists(),
                    reason="binaire Godot non configuré ou archive du build run 8b absente")
def test_decision_reelle_sur_run8(tmp_path):
    """Step DECISION synthétique après le préfixe réel A..E du run 8b. Note (prompt T2) :
    `p_buy_kitten` est déjà dans le préfixe -> cliquer cette option au step DECISION
    reste une dépense réelle sur l'état courant (achat supplémentaire), pas un no-op."""
    steps = list(_RUN8_PREFIX_STEPS) + [_RUN8_DECISION_STEP, _RUN8_UNLOCK_LOCATION_STEP]
    loop_spec = {"schema_version": 1, "game_id": "kitten_clicker", "steps": steps}
    payload = _run_probe(KITTEN_RUN8, loop_spec, tmp_path, timeout=180)

    decision = payload["data"].get("decision")
    assert decision is not None, "data.decision absent du payload"
    assert decision["ref"] == "d_first_spend"
    assert decision["options"] == ["p_buy_kitten", "p_unlock_location"]

    # MESURÉ 2026-08-23 sur lab/forge_runs/kitten_clicker/_run8_20260821h2/game_build8
    # (~50 s, exécution GPU réelle) :
    #   boot_reproducible=true ; INFORMATION A=false B=false (aucun Label "cout_*"/
    #   "effet_*" dans le groupe "hud" sur ce build — seul un groupe "cost_ladder" non
    #   lisible par la sonde existe) ; états A'/B' distincts -> CHOICE PASS (implicite,
    #   pas de champ dédié dans le payload) ; IMMEDIATE A=true B=true ; FUTURE=false
    #   (4 affordances identiques des deux côtés : acheter_amelioration/acheter_chaton/
    #   pelote/prestige — aucun Label "cout_*" hud non plus) ; NONDOMINANCE=false : les
    #   deux politiques (idle/actif) favorisent la MÊME option (p_buy_kitten) sur ce
    #   build à ce palier -> aucune paire de politiques ne diverge (c'est une mesure de
    #   balance du jeu, pas un défaut de sonde — cf. plan T4) ; PLAYER_GOAL=true
    #   (objectifs des 2 branches distincts entre eux et de l'objectif avant décision) ;
    #   pass=false (4 des 6 preuves échouent : INFORMATION x2, FUTURE, NONDOMINANCE).
    assert decision["boot_reproducible"] is True
    assert decision["information"] == {"A": False, "B": False}
    assert decision["immediate"] == {"A": True, "B": True}
    assert decision["future"] is False
    assert decision["player_goal"] is True
    assert decision["nondominance"]["pass"] is False
    assert decision["pass"] is False
    reasons_joined = " | ".join(decision["reasons"])
    assert "INFORMATION" in reasons_joined
    assert "FUTURE" in reasons_joined
    assert "NONDOMINANCE" in reasons_joined

    states = decision["states"]
    assert set(states.keys()) == {"p_buy_kitten", "p_unlock_location"}
    for key in ("p_buy_kitten", "p_unlock_location"):
        assert sorted(states[key]["affordances"]) == [
            "acheter_amelioration", "acheter_chaton", "pelote", "prestige"]
        assert states[key]["objectif"] != ""
    assert states["p_buy_kitten"]["hud"] != states["p_unlock_location"]["hud"]  # CHOICE : S_A != S_B

    matrix = decision["nondominance"]["matrix"]
    assert set(matrix.keys()) == {"p_buy_kitten", "p_unlock_location"}
    for key in ("p_buy_kitten", "p_unlock_location"):
        assert set(matrix[key].keys()) == {"idle", "actif"}
        assert matrix[key]["actif"] > matrix[key]["idle"] > 0  # 4 nombres mesurés, cliquer rapporte plus qu'idle

    print("DECISION MESURE:", json.dumps(decision, indent=2))


# --- mécanisme REPEAT/deltas au niveau product_oracle_godot, sans Godot ------


def test_run_player_loop_accepte_payload_avec_decision(tmp_path):
    game = _game_with_loop_json(tmp_path)
    data = {
        "steps": [{"role": "DECISION", "ref": "d1", "pass": True, "before": "", "after": "", "reason": ""}],
        "reached_role": "DECISION", "frames": 3000, "deltas": {}, "seen": {},
        "decision": {
            "ref": "d1", "options": ["p_a", "p_b"], "boot_reproducible": True,
            "information": {"A": True, "B": True},
            "states": {
                "p_a": {"hud": {"objectif": "A"}, "affordances": ["p_a"], "objectif": "A"},
                "p_b": {"hud": {"objectif": "B"}, "affordances": ["p_b"], "objectif": "B"},
            },
            "immediate": {"A": True, "B": True}, "future": True,
            "nondominance": {"matrix": {"p_a": {"idle": 1.0}, "p_b": {"idle": 2.0}}, "pass": True},
            "player_goal": True, "pass": True, "reasons": [],
        },
    }
    stdout = _line(True, [], data)
    r = pog.run_player_loop(game, binary_resolver=lambda: "godot",
                            gpu_runner=lambda *a, **k: {"returncode": 0, "stdout": stdout, "stderr": ""})
    assert r["status"] == "OK" and r["passed"] is True
    assert r["payload"]["data"]["decision"] == data["decision"]
    assert r["payload"]["data"]["reached_role"] == "DECISION"


def test_run_player_loop_accepte_payload_avec_replays_et_deltas(tmp_path):
    game = _game_with_loop_json(tmp_path)
    data = {
        "steps": [
            {"role": "REPEAT", "ref": "H1", "pass": True,
             "replays": [{"ref": "B1", "pass": True, "before": "0", "after": "5"}]},
        ],
        "reached_role": "ADVANTAGE", "frames": 900,
        "deltas": {"B1": 5.0, "B1@replay": 7.0, "J1": 9.0},
        "seen": {"objectif": ["a", "b"]},
    }
    stdout = _line(True, [], data)
    r = pog.run_player_loop(game, binary_resolver=lambda: "godot",
                            gpu_runner=lambda *a, **k: {"returncode": 0, "stdout": stdout, "stderr": ""})
    assert r["status"] == "OK" and r["passed"] is True
    assert r["payload"]["data"]["deltas"] == {"B1": 5.0, "B1@replay": 7.0, "J1": 9.0}
    assert r["payload"]["data"]["seen"] == {"objectif": ["a", "b"]}
    assert r["payload"]["data"]["steps"][0]["replays"][0]["ref"] == "B1"
