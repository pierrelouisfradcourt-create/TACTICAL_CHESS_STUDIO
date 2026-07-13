"""Oracle du driver Forge (P0.1) — machine à états déterministe offline.

Le driver remplace la prose d'orchestration de skill.md par un artefact
exécutable : état persistant (state.json), reprise après interruption, gates
appelés EN CODE, verdict signé en bout de chaîne. Il n'exécute JAMAIS un LLM
lui-même : les étapes LLM passent par un exécuteur injecté (l'orchestrateur
réel en production, un stub ici). Hypothèse inconnue => BLOCKED, jamais un
faux vert. NO_CLAIM_ALLOWED.
"""
import json
import sys
from pathlib import Path

import pytest

from forge.driver import ForgeDriver


def _oracle_config(tmp_path, project, exit_code=0):
    """Config oracle témoin : une commande python qui sort avec exit_code."""
    cfg = tmp_path / "oracles_test.json"
    cfg.write_text(
        json.dumps({project: {
            "cwd": str(tmp_path),
            "command": [sys.executable, "-c", f"import sys; sys.exit({exit_code})"],
        }}),
        encoding="utf-8",
    )
    return cfg


class StubExecutor:
    """Exécuteur LLM factice : trace les appels, rend un artefact ok.

    Peut écrire une wiremap.json à s5 (comme le ferait un vrai producteur),
    échouer sur commande, ou lever (interruption simulée pour tester resume).
    """

    def __init__(self, run_dir=None, wiremap=None, fail_on=(), raise_on=(), blocked_on=None):
        self.calls = []
        self.run_dir = run_dir
        self.wiremap = wiremap
        self.fail_on = set(fail_on)
        self.raise_on = set(raise_on)
        self.blocked_on = blocked_on or {}  # {etape: [findings...]} — panel Prisme, etc.

    def __call__(self, payload, decision, context):
        self.calls.append((payload.etape, context.get("model_override")))
        if payload.etape in self.raise_on:
            raise RuntimeError(f"interruption simulée à {payload.etape}")
        if payload.etape in self.fail_on:
            return {"ok": False, "output": "", "reason": "échec simulé"}
        if payload.etape == "s5-wiremap" and self.wiremap is not None:
            Path(self.run_dir, "wiremap.json").write_text(
                json.dumps(self.wiremap, ensure_ascii=False), encoding="utf-8")
        if payload.etape in self.blocked_on:
            return {"ok": True, "output": f"artefact {payload.etape}",
                    "blocked": True, "findings": self.blocked_on[payload.etape]}
        return {"ok": True, "output": f"artefact {payload.etape}"}


@pytest.fixture
def offline(monkeypatch):
    """Offline strict : aucune sonde LM Studio pendant les tests du driver."""
    monkeypatch.setattr("forge.runtime.qwen_available", lambda *a, **k: False)


def _kwargs(tmp_path, run_dir, project="proj", exit_code=0):
    """Paramètres communs — tout est redirigé sous tmp_path (zéro pollution)."""
    return dict(
        run_dir=run_dir,
        oracle_config=_oracle_config(tmp_path, project, exit_code),
        key_file=tmp_path / "forge_test.key",
        audit_path=tmp_path / "audit.jsonl",
        telemetry_path=tmp_path / "telemetry.jsonl",
        builder_runs_path=tmp_path / "builder_runs.jsonl",
    )


def _oracle_config_flaky_once(tmp_path, project):
    """Oracle qui échoue au 1er appel, passe ensuite (FAIL transitoire simulé) —
    prouve la valeur du pool (Tier 2 #5) : un aléa au tirage n'escalade pas de
    modèle si le MÊME tier suffit au 2e essai."""
    marker = tmp_path / "flaky_marker"
    cfg = tmp_path / "oracles_flaky.json"
    script = (
        f"import sys, pathlib; m = pathlib.Path(r'{marker}'); "
        "sys.exit(0 if m.exists() else (m.write_text('x'), 1)[1])"
    )
    cfg.write_text(
        json.dumps({project: {"cwd": str(tmp_path), "command": [sys.executable, "-c", script]}}),
        encoding="utf-8",
    )
    return cfg


# --- run vert de bout en bout ---------------------------------------------------

def test_micro_run_vert_produit_un_verdict_signe(tmp_path, offline):
    run_dir = tmp_path / "run"
    ex = StubExecutor(run_dir=run_dir)
    report = ForgeDriver("proj", "proj-1", profile="micro", executor=ex,
                         **_kwargs(tmp_path, run_dir)).run()

    assert report["status"] == "DONE"
    assert report["software_verdict"] == "OK"
    assert report["evidence_verdict"] == "MECHANICAL_VALIDATION_ONLY"
    assert report["claim_verdict"] == "NO_CLAIM_ALLOWED"
    assert report["decision"] == "HUMANGATE_READY"

    record = json.loads((run_dir / "verdict.json").read_text(encoding="utf-8"))
    assert record["hmac"]
    assert record["provenance_ok"] is True

    state = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
    assert state["run_status"] == "DONE"
    for etape in ("s9-build", "s10a-oracle-code", "s12-verdict"):
        assert state["steps"][etape]["status"] == "OK"


def test_chaque_etape_passe_par_la_porte_de_dispatch(tmp_path, offline):
    """Toutes les étapes (LLM ET déterministes) laissent une ligne d'audit signée."""
    run_dir = tmp_path / "run"
    kw = _kwargs(tmp_path, run_dir)
    ForgeDriver("proj", "proj-1", profile="micro",
                executor=StubExecutor(run_dir=run_dir), **kw).run()
    lines = [json.loads(l) for l in
             kw["audit_path"].read_text(encoding="utf-8").strip().splitlines()]
    etapes = {rec["etape"] for rec in lines}
    assert {"s9-build", "s10a-oracle-code", "s12-verdict"} <= etapes
    assert all(rec["run_id"] == "proj-1" for rec in lines)


def test_telemetrie_tracee_pour_les_etapes_llm(tmp_path, offline):
    run_dir = tmp_path / "run"
    kw = _kwargs(tmp_path, run_dir)
    ForgeDriver("proj", "proj-1", profile="micro",
                executor=StubExecutor(run_dir=run_dir), **kw).run()
    rows = [json.loads(l) for l in
            kw["telemetry_path"].read_text(encoding="utf-8").strip().splitlines()]
    assert any(r["etape"] == "s9-build" for r in rows)


# --- reprise après interruption --------------------------------------------------

def test_resume_ne_rejoue_pas_les_etapes_terminees(tmp_path, offline):
    run_dir = tmp_path / "run"
    kw = _kwargs(tmp_path, run_dir)

    ex1 = StubExecutor(run_dir=run_dir, raise_on={"s11-redteam-code"})
    with pytest.raises(RuntimeError):
        ForgeDriver("proj", "proj-1", profile="patch", executor=ex1, **kw).run()

    state = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
    assert state["steps"]["s9-build"]["status"] == "OK"
    assert state["steps"]["s10a-oracle-code"]["status"] == "OK"
    assert state["steps"]["s11-redteam-code"]["status"] == "RUNNING"  # interrompue

    ex2 = StubExecutor(run_dir=run_dir)
    report = ForgeDriver("proj", "proj-1", profile="patch", executor=ex2, **kw).run()
    assert report["status"] == "DONE"
    assert report["software_verdict"] == "OK"
    # reprise : seule l'étape interrompue est rejouée — jamais s9 (déjà OK).
    assert [c[0] for c in ex2.calls] == ["s11-redteam-code"]


def test_state_d_un_autre_run_refuse_sans_ecraser(tmp_path, offline):
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    (run_dir / "state.json").write_text(
        json.dumps({"run_id": "autre-999"}), encoding="utf-8")
    report = ForgeDriver("proj", "proj-1", profile="micro",
                         executor=StubExecutor(run_dir=run_dir),
                         **_kwargs(tmp_path, run_dir)).run()
    assert report["status"] == "HALTED"
    assert report["software_verdict"] == "BLOCKED"
    # le state étranger n'est PAS écrasé (hypothèse inconnue => refus)
    kept = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
    assert kept["run_id"] == "autre-999"


# --- hypothèse inconnue => BLOCKED ------------------------------------------------

def test_sans_executeur_l_etape_llm_est_blocked_puis_recuperable(tmp_path, offline):
    run_dir = tmp_path / "run"
    kw = _kwargs(tmp_path, run_dir)

    report = ForgeDriver("proj", "proj-1", profile="micro",
                         executor=None, **kw).run()
    assert report["status"] == "HALTED"
    assert report["software_verdict"] == "BLOCKED"
    assert report["decision"] == "BLOCKED"
    assert not (run_dir / "verdict.json").exists()
    state = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
    assert state["steps"]["s9-build"]["status"] == "BLOCKED"

    # récupération : relancer AVEC un exécuteur reprend et termine (retry tracé).
    report2 = ForgeDriver("proj", "proj-1", profile="micro",
                          executor=StubExecutor(run_dir=run_dir), **kw).run()
    assert report2["status"] == "DONE"
    assert report2["software_verdict"] == "OK"


def test_jeu_sans_preuve_mutation_jamais_vert(tmp_path, offline):
    """P0.2 (remplace le placeholder v0 « jeu = HALTED ») : un JEU sans preuve
    mutation possible (ni logic_files ni wiremap) finit BLOCKED au verdict signé
    — le trou I1 reste fermé, plus par blocage total mais par preuve exigée."""
    run_dir = tmp_path / "run"
    src = tmp_path / "game"
    src.mkdir()
    report = ForgeDriver("proj", "proj-1", profile="micro", is_game=True,
                         executor=StubExecutor(run_dir=run_dir), src_root=src,
                         **_kwargs(tmp_path, run_dir)).run()
    assert report["status"] == "DONE"
    assert report["software_verdict"] == "BLOCKED"
    assert report["decision"] == "BLOCKED"


def test_full_sans_blueprint_va_au_bout_mais_verdict_blocked(tmp_path, offline):
    """Artefact d'entrée manquant pour un oracle déterministe : reçu BLOCKED,
    la chaîne va au bout et le verdict signé dit BLOCKED (pas de faux vert)."""
    run_dir = tmp_path / "run"
    src = tmp_path / "src"
    src.mkdir()
    (src / "main.py").write_text("def boot():\n    pass\n", encoding="utf-8")
    wiremap = {"features": [{"feature": "R1 boot", "fonction": "",
                             "fichiers": ["main.py"], "preuve": "test_boot"}]}
    ex = StubExecutor(run_dir=run_dir, wiremap=wiremap)
    report = ForgeDriver("proj", "proj-1", profile="full", executor=ex,
                         src_root=src, **_kwargs(tmp_path, run_dir)).run()

    assert report["status"] == "DONE"                 # la chaîne va au bout
    assert report["software_verdict"] == "BLOCKED"    # archi non prouvée
    assert report["decision"] == "BLOCKED"

    state = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
    assert state["steps"]["s10b-oracle-archi"]["status"] == "BLOCKED"
    assert state["steps"]["s10c-oracle-wiremap"]["status"] == "OK"
    # le gel du jeu de règles est posé par le driver à s5 (plus de prose manuelle)
    frozen = json.loads((run_dir / "wiremap_frozen.json").read_text(encoding="utf-8"))
    assert frozen["features"] == ["R1 boot"]


def test_prisme_detecte_mais_ne_decide_jamais(tmp_path, offline):
    """Tier 2.5 étape 3 : le panel Prisme (s1) DÉTECTE des violations (via
    forge.panel/check_prisme.mjs, remontées ici par un executor qui simule un
    finding), mais ne les gate JAMAIS — software_verdict reste identique à un
    run sans finding, seule la décision/humangate_flags en portent la trace."""
    wiremap = {"features": [{"feature": "R1 boot", "fonction": "",
                             "fichiers": ["main.py"], "preuve": "test_boot"}]}

    def _run(blocked_on):
        run_dir = tmp_path / f"run-{len(blocked_on)}"
        src = tmp_path / f"src-{len(blocked_on)}"
        src.mkdir()
        (src / "main.py").write_text("def boot():\n    pass\n", encoding="utf-8")
        ex = StubExecutor(run_dir=run_dir, wiremap=wiremap, blocked_on=blocked_on)
        kw = dict(_kwargs(tmp_path, run_dir))
        kw["audit_path"] = tmp_path / f"audit-{len(blocked_on)}.jsonl"
        kw["telemetry_path"] = tmp_path / f"tel-{len(blocked_on)}.jsonl"
        kw["builder_runs_path"] = tmp_path / f"br-{len(blocked_on)}.jsonl"
        report = ForgeDriver("proj", "proj-1", profile="full", executor=ex,
                             src_root=src, **kw).run()
        record = json.loads((run_dir / "verdict.json").read_text(encoding="utf-8"))
        return report, record

    report_clean, record_clean = _run({})
    report_flagged, record_flagged = _run(
        {"s1-prisme": ["section manquante : ressent"]})

    # même verdict logiciel avec ou sans finding Prisme — il ne décide jamais,
    # seul humangate_flags porte la trace du finding (visible, jamais tu).
    assert report_clean["software_verdict"] == report_flagged["software_verdict"]
    assert any("Prisme" in f for f in record_flagged["humangate_flags"])
    assert not any("Prisme" in f for f in record_clean["humangate_flags"])


# --- boucle d'escalade fermée EN CODE ---------------------------------------------

def test_escalade_bornee_sur_oracle_rouge(tmp_path, offline):
    """Oracle rouge -> pool reactif au meme tier (Tier 2 #5, pool_size=2 par
    defaut) PUIS re-spawn s9 haiku->sonnet->opus, cap 2, puis verdict FAIL
    signe (l'echec est documente, jamais masque, jamais de boucle infinie)."""
    run_dir = tmp_path / "run"
    ex = StubExecutor(run_dir=run_dir)
    report = ForgeDriver("proj", "proj-1", profile="micro", executor=ex,
                         **_kwargs(tmp_path, run_dir, exit_code=1)).run()

    s9_calls = [c for c in ex.calls if c[0] == "s9-build"]
    # pool_size=2 : 2 essais par tier (le pool est epuise) avant chaque escalade.
    assert [c[1] for c in s9_calls] == [None, None, "sonnet", "sonnet", "opus", "opus"]

    state = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
    assert state["escalations"] == 2

    assert report["status"] == "DONE"
    assert report["software_verdict"] == "FAIL"        # rouge signé, pas masqué
    assert report["decision"] == "BLOCKED"


def test_pool_rattrape_un_fail_transitoire_sans_escalader_de_modele(tmp_path, offline):
    """Valeur centrale du Concept A (Tier 2 #5) : un oracle rouge au 1er essai
    puis vert au 2e (même tier) rattrape le run SANS jamais bumper le modèle —
    un FAIL peut être un aléa du tirage, pas une preuve que le tier est trop
    faible. Zéro escalade coûteuse pour un cas que le pool résout seul."""
    run_dir = tmp_path / "run"
    ex = StubExecutor(run_dir=run_dir)
    kw = dict(
        run_dir=run_dir,
        oracle_config=_oracle_config_flaky_once(tmp_path, "proj"),
        key_file=tmp_path / "forge_test.key",
        audit_path=tmp_path / "audit.jsonl",
        telemetry_path=tmp_path / "telemetry.jsonl",
        builder_runs_path=tmp_path / "builder_runs.jsonl",
    )
    report = ForgeDriver("proj", "proj-1", profile="micro", executor=ex, **kw).run()

    s9_calls = [c for c in ex.calls if c[0] == "s9-build"]
    assert [c[1] for c in s9_calls] == [None, None]    # 2 essais, MÊME tier (jamais "sonnet")

    state = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
    assert state["escalations"] == 0                   # aucune escalade de modèle
    assert state["pool_attempts"] == 1                 # 1 retry consommé, budget pas repartagé

    assert report["status"] == "DONE"
    assert report["software_verdict"] == "OK"          # rattrapé par le pool, pas par un tier +fort

    # Tier 2.5 étape 2 : observabilité — le builder_run enregistré confirme
    # mécaniquement que c'est le POOL qui a sauvé la tâche, jamais une escalade.
    from forge.studio_link import pool_stats
    stats = pool_stats("proj-1", telemetry_path=kw["builder_runs_path"])
    assert stats["attempts"] == 2
    assert stats["pool_saves"] == 1
    assert stats["escalations_avoided_cost_usd"] >= 0.0


def test_pool_size_un_desactive_le_pool_escalade_directe(tmp_path, offline):
    """pool_size=1 restaure le comportement pré-Tier-2 : chaque FAIL escalade
    directement de modèle, aucun retry au même tier."""
    run_dir = tmp_path / "run"
    ex = StubExecutor(run_dir=run_dir)
    report = ForgeDriver("proj", "proj-1", profile="micro", executor=ex, pool_size=1,
                         **_kwargs(tmp_path, run_dir, exit_code=1)).run()

    s9_calls = [c for c in ex.calls if c[0] == "s9-build"]
    assert [c[1] for c in s9_calls] == [None, "sonnet", "opus"]
    assert report["software_verdict"] == "FAIL"


# --- doctrine : le driver orchestre, il ne pense pas et ne spawn pas ---------------

def test_driver_ne_spawn_pas_directement():
    """Le spawn de process appartient à oracle.py ; l'inférence aux exécuteurs.
    Le driver lui-même reste une machine à états pure (offline-capable)."""
    source = (Path(__file__).resolve().parents[1] / "driver.py").read_text(encoding="utf-8")
    for interdit in ("subprocess", "Popen", "os.system", "anthropic"):
        assert interdit not in source, f"interdit dans driver.py : {interdit}"
