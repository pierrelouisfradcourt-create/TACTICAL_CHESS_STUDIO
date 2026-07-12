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

    def __init__(self, run_dir=None, wiremap=None, fail_on=(), raise_on=()):
        self.calls = []
        self.run_dir = run_dir
        self.wiremap = wiremap
        self.fail_on = set(fail_on)
        self.raise_on = set(raise_on)

    def __call__(self, payload, decision, context):
        self.calls.append((payload.etape, context.get("model_override")))
        if payload.etape in self.raise_on:
            raise RuntimeError(f"interruption simulée à {payload.etape}")
        if payload.etape in self.fail_on:
            return {"ok": False, "output": "", "reason": "échec simulé"}
        if payload.etape == "s5-wiremap" and self.wiremap is not None:
            Path(self.run_dir, "wiremap.json").write_text(
                json.dumps(self.wiremap, ensure_ascii=False), encoding="utf-8")
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
    )


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


# --- boucle d'escalade fermée EN CODE ---------------------------------------------

def test_escalade_bornee_sur_oracle_rouge(tmp_path, offline):
    """Oracle rouge -> ré-spawn s9 haiku->sonnet->opus, cap 2, puis verdict
    FAIL signé (l'échec est documenté, jamais masqué, jamais de boucle infinie)."""
    run_dir = tmp_path / "run"
    ex = StubExecutor(run_dir=run_dir)
    report = ForgeDriver("proj", "proj-1", profile="micro", executor=ex,
                         **_kwargs(tmp_path, run_dir, exit_code=1)).run()

    s9_calls = [c for c in ex.calls if c[0] == "s9-build"]
    assert len(s9_calls) == 3                          # contrat + 2 escalades
    assert [c[1] for c in s9_calls] == [None, "sonnet", "opus"]

    state = json.loads((run_dir / "state.json").read_text(encoding="utf-8"))
    assert state["escalations"] == 2

    assert report["status"] == "DONE"
    assert report["software_verdict"] == "FAIL"        # rouge signé, pas masqué
    assert report["decision"] == "BLOCKED"


# --- doctrine : le driver orchestre, il ne pense pas et ne spawn pas ---------------

def test_driver_ne_spawn_pas_directement():
    """Le spawn de process appartient à oracle.py ; l'inférence aux exécuteurs.
    Le driver lui-même reste une machine à états pure (offline-capable)."""
    source = (Path(__file__).resolve().parents[1] / "driver.py").read_text(encoding="utf-8")
    for interdit in ("subprocess", "Popen", "os.system", "anthropic"):
        assert interdit not in source, f"interdit dans driver.py : {interdit}"
