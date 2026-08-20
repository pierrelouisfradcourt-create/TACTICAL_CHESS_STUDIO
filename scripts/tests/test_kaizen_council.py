"""test_kaizen_council.py — IMP-208 : gate council multi-LLM dans kaizen_autoloop.

Hermétique : run_council / oracle / subprocess monkeypatchés, ledger en tmp, AUCUN
réseau / LM / sleep réel. Vérifie le contrat IMP-208 sans régresser l'existant :
  - SAFE_AUTO       -> council appelé AVANT l'exécuteur (ordre des appels)
  - council timeout -> IMP exécuté quand même, WARNING loggé
  - CONSENSUS injecté dans le prompt de l'exécuteur (pas le brief brut)
  - AUDIT_REQUIRED  -> council PAS appelé (route HumanGate)
  - governor BLOCK  -> council PAS exécuté
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

import pytest

# kaizen_autoloop vit dans lab/chains/ ; il ajoute lui-même scripts/ + governance/ au path.
_REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO / "lab" / "chains"))

import kaizen_autoloop as ka  # noqa: E402

# council est importé par ka (optionnel). On exige sa présence pour ces tests.
council = ka.council
if council is None:  # pragma: no cover - infra
    pytest.skip("council indisponible — gate non testable", allow_module_level=True)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _imp(id_="IMP-TEST", lane="SAFE_AUTO", acceptance="Faire la chose.", notes=""):
    return {
        "id": id_, "title": f"Title {id_}", "type": "feature", "lane": lane,
        "impact": "HIGH", "effort": "SMALL", "status": "OPEN", "blocked_by": [],
        "acceptance": acceptance, "notes": notes,
        "files": [f"lab/chains/{id_.lower().replace('-', '_')}.py"],
    }


def _ledger(improvements):
    return {"meta": {"ledger_version": "v0", "claim_verdict": "NO_CLAIM_ALLOWED"},
            "improvements": improvements, "metrics_history": []}


def _clean_result(task_id="IMP-TEST"):
    """CouncilResult « consensus propre » : 3 modèles, aucun désaccord, pas de humangate."""
    Op, Role, Stance, MId = (council.ModelOpinion, council.CouncilRole,
                             council.Stance, council.ModelId)
    opinions = (
        Op(model=MId.CLAUDE, role=Role.PLAN_REVIEW, stance=Stance.APPROUVE,
           rationale="plan ok", plan="Etape 1: faire X de maniere bornee."),
        Op(model=MId.QWEN14B, role=Role.RED_TEAM, stance=Stance.APPROUVE,
           rationale="aucun angle mort critique"),
        Op(model=MId.GEMINI_FLASH, role=Role.DIVERGENCE, stance=Stance.DIVERGENCE,
           rationale="hypothese alternative"),
    )
    return council.CouncilResult(
        task_id=task_id, generated_at="2026-06-29T00:00:00Z",
        plan_md="Etape 1: faire X.", opinions=opinions, disagreements=(),
        divergences=(), requires_humangate=False, collapsed=False, distinct_models=3,
    )


def _hg_result(task_id="IMP-TEST"):
    """CouncilResult avec désaccord réel -> requires_humangate=True, non collapsed."""
    Op, Role, Stance, MId = (council.ModelOpinion, council.CouncilRole,
                             council.Stance, council.ModelId)
    dis = council.Disagreement(
        topic="risque non couvert",
        side_a={"role": "PLAN_REVIEW", "model": "claude", "claim": "plan propose"},
        side_b={"role": "RED_TEAM", "model": "qwen2.5-14b", "claim": "risque non couvert"},
    )
    opinions = (
        Op(model=MId.CLAUDE, role=Role.PLAN_REVIEW, stance=Stance.APPROUVE, rationale="ok"),
        Op(model=MId.QWEN14B, role=Role.RED_TEAM, stance=Stance.BLOQUE,
           rationale="faille", risks=("risque non couvert",)),
        Op(model=MId.GEMINI_FLASH, role=Role.DIVERGENCE, stance=Stance.DIVERGENCE, rationale="alt"),
    )
    return council.CouncilResult(
        task_id=task_id, generated_at="2026-06-29T00:00:00Z", plan_md="plan",
        opinions=opinions, disagreements=(dis,), divergences=(), requires_humangate=True,
        collapsed=False, distinct_models=3,
    )


@pytest.fixture
def loop_env(monkeypatch, tmp_path):
    """Neutralise les effets de bord I/O de run_loop (ledger close, cost, metrics, logs)."""
    monkeypatch.setattr(ka, "CHARTER_DIR", tmp_path / "charters")
    monkeypatch.setattr(ka, "_archive", None)
    monkeypatch.setattr(ka, "close_imp", lambda imp: None)
    monkeypatch.setattr(ka, "metrics", lambda: None)
    monkeypatch.setattr(ka, "log_cost", lambda *a, **k: None)
    monkeypatch.setattr(ka, "_ingest_imp_closed", lambda imp: None)
    monkeypatch.setattr(ka, "log_autoloop_event", lambda *a, **k: None)
    # Hermétique : journal_error écrit dans le vrai lab/reports/ — on le neutralise.
    monkeypatch.setattr(ka, "journal_error", lambda *a, **k: None)

    def _charter(imp):
        d = tmp_path / "charters"
        d.mkdir(parents=True, exist_ok=True)
        p = d / f"{imp['id']}_charter.md"
        p.write_text(f"# CHARTER {imp['id']}\nacceptance: {imp.get('acceptance', '')}\n",
                     encoding="utf-8")
        return str(p)

    monkeypatch.setattr(ka, "generate_charter", _charter)
    return tmp_path


class _Args:
    def __init__(self, lane=None):
        self.once = True
        self.dry_run = False
        self.lane = lane
        self.imp_id = None


def _patch_recall(monkeypatch, imp):
    data = _ledger([imp])
    monkeypatch.setattr(ka, "recall", lambda: {
        "open_count": 1, "closed_count": 0, "blocked_count": 0, "deferred_count": 0,
        "data": data, "ledger_path": "ledger.yaml"})


# ── Test 1 : SAFE_AUTO -> council AVANT l'exécuteur ─────────────────────────────

def test_safe_auto_council_called_before_exec(monkeypatch, loop_env):
    imp = _imp(lane="SAFE_AUTO")
    _patch_recall(monkeypatch, imp)
    calls = []

    async def fake_run_council(task, adapters, **kwargs):
        calls.append("council")
        return _clean_result(task.task_id)

    def fake_exec(charter_path, imp_, consensus=None):
        calls.append("execute")
        return "software_verdict: DOCS_OK\npassed"

    monkeypatch.setattr(council, "run_council", fake_run_council)
    monkeypatch.setattr(ka, "execute_via_claude_code", fake_exec)

    ka.run_loop(_Args())

    assert calls == ["council", "execute"], f"ordre attendu council->execute, recu {calls}"


# ── Test 2 : council timeout -> IMP exécuté quand même + WARNING ────────────────

def test_council_timeout_executes_anyway(monkeypatch, loop_env, caplog):
    imp = _imp(lane="SAFE_AUTO")
    _patch_recall(monkeypatch, imp)
    executed = {}

    async def timeout_run_council(task, adapters, **kwargs):
        raise asyncio.TimeoutError()  # pas de sleep réel — simule le dépassement de budget

    def fake_exec(charter_path, imp_, consensus=None):
        executed["called"] = True
        executed["consensus"] = consensus
        return "passed"

    monkeypatch.setattr(council, "run_council", timeout_run_council)
    monkeypatch.setattr(ka, "execute_via_claude_code", fake_exec)

    with caplog.at_level(logging.WARNING, logger="kaizen_autoloop"):
        ka.run_loop(_Args())

    assert executed.get("called") is True, "l'IMP doit être exécuté malgré le timeout council"
    assert executed.get("consensus") is None, "skip guardrail -> aucun consensus injecté"
    assert any("timeout" in r.getMessage().lower() for r in caplog.records), \
        "un WARNING timeout doit être loggé"


# ── Test 3 : CONSENSUS injecté dans le prompt de l'exécuteur (pas le brief brut) ─

def test_consensus_injected_into_executor(monkeypatch, loop_env):
    imp = _imp(lane="SAFE_AUTO")
    _patch_recall(monkeypatch, imp)
    seen = {}

    async def fake_run_council(task, adapters, **kwargs):
        seen["brief"] = task.brief  # le brief brut ne doit PAS atteindre l'exécuteur
        return _clean_result(task.task_id)

    def fake_exec(charter_path, imp_, consensus=None):
        seen["consensus"] = consensus
        return "passed"

    monkeypatch.setattr(council, "run_council", fake_run_council)
    monkeypatch.setattr(ka, "execute_via_claude_code", fake_exec)

    ka.run_loop(_Args())

    assert seen.get("consensus") is not None
    assert "CONSENSUS" in seen["consensus"], "l'exécuteur reçoit le CONSENSUS rendu"
    # Le brief brut (en-tête WRA / contenu) ne doit pas être ce qui est injecté.
    assert seen["consensus"] != seen.get("brief")


def test_execute_prompt_prepends_consensus(monkeypatch, tmp_path):
    """Unit : execute_via_claude_code place le CONSENSUS EN TÊTE du prompt CLI."""
    charter = tmp_path / "c.md"
    charter.write_text("# CHARTER BODY UNIQUE_MARKER", encoding="utf-8")
    captured = {}

    class _R:
        returncode = 0
        stdout = "passed"

    def fake_run(cmd, **kwargs):
        captured["cmd"] = cmd
        return _R()

    monkeypatch.setattr(ka.subprocess, "run", fake_run)
    out = ka.execute_via_claude_code(str(charter), _imp(),
                                     consensus="## CONSENSUS BLOCK uniq")
    assert out == "passed"
    prompt = captured["cmd"][-1]
    assert "CONSENSUS BLOCK uniq" in prompt
    assert "UNIQUE_MARKER" in prompt
    assert prompt.index("CONSENSUS BLOCK uniq") < prompt.index("UNIQUE_MARKER"), \
        "le CONSENSUS doit précéder le corps du charter"


# ── Test 4 : AUDIT_REQUIRED -> council PAS appelé (HumanGate) ────────────────────

def test_audit_required_skips_council(monkeypatch, loop_env):
    imp = _imp(id_="IMP-AUD", lane="AUDIT_REQUIRED")
    _patch_recall(monkeypatch, imp)
    calls = []

    async def fake_run_council(task, adapters, **kwargs):
        calls.append("council")
        return _clean_result(task.task_id)

    monkeypatch.setattr(council, "run_council", fake_run_council)
    monkeypatch.setattr(ka, "request_humangate",
                        lambda imp_, cp: calls.append("humangate") or "software_verdict: DOCS_OK")

    ka.run_loop(_Args())

    assert "council" not in calls, "AUDIT_REQUIRED ne doit JAMAIS déclencher le council auto"
    assert "humangate" in calls, "AUDIT_REQUIRED route vers HumanGate"


# ── Test 5 : governor BLOCK -> council PAS exécuté ──────────────────────────────

def test_governor_block_skips_council(monkeypatch, tmp_path):
    called = {"council": False}

    async def fake_run_council(task, adapters, **kwargs):
        called["council"] = True
        return _clean_result(task.task_id)

    monkeypatch.setattr(council, "run_council", fake_run_council)
    monkeypatch.setattr(ka.governor, "check",
                        lambda action: ka.governor.Decision(ka.governor.BLOCK, "test block"))

    consensus, stop = ka.run_council_gate(_imp(), str(tmp_path / "c.md"))

    assert called["council"] is False, "governor BLOCK -> council non exécuté"
    assert (consensus, stop) == (None, False), "BLOCK -> skip guardrail (exécute quand même)"


# ── Bonus : requires_humangate réel -> ESCALADE (stop), pas d'exécution ─────────

def test_requires_humangate_escalates(monkeypatch, loop_env):
    imp = _imp(lane="SAFE_AUTO")
    _patch_recall(monkeypatch, imp)
    executed = {"exec": False}

    async def fake_run_council(task, adapters, **kwargs):
        return _hg_result(task.task_id)

    monkeypatch.setattr(council, "run_council", fake_run_council)
    monkeypatch.setattr(ka, "execute_via_claude_code",
                        lambda *a, **k: executed.__setitem__("exec", True) or "passed")

    ka.run_loop(_Args())

    assert executed["exec"] is False, "requires_humangate -> l'IMP ne doit PAS être exécuté"


def test_confidence_proxy_no_field_on_result():
    """CouncilResult n'expose pas de confidence : le proxy reste dérivé, pas inventé."""
    assert not hasattr(_clean_result(), "confidence")
    assert ka._council_confidence_proxy(_clean_result()) >= ka.COUNCIL_CONFIDENCE_THRESHOLD
    # collapsed -> 0.0 (infra dégradée)
    collapsed = council.CouncilResult(
        task_id="X", generated_at="t", plan_md="", opinions=(), disagreements=(),
        divergences=(), requires_humangate=True, collapsed=True, distinct_models=1)
    assert ka._council_confidence_proxy(collapsed) == 0.0
