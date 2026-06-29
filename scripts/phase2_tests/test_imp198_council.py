#!/usr/bin/env python3
"""IMP-198 — Council multi-LLM async (AUDIT_REQUIRED, non fermé).

Acceptance: 3 rôles tournent (mocks LLM) + output schema valide ; désaccords -> HumanGate ;
fallback proxy-down ; timeout respecté ; artefacts append-only.
Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp198_council.py -v
Aucun réseau : tous les LLM sont mockés (sauf tests de garde sécurité sans appel).
"""
from __future__ import annotations

import asyncio
import json
import threading
import time
import sys
from pathlib import Path

import jsonschema
import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
sys.path.insert(0, str(_ROOT / "scripts"))
import council as C  # noqa: E402

NOW = "2026-06-29T00:00:00Z"


def _resp(stance="APPROUVE", plan="step1", risks=None, hypotheses=None, evidence=None) -> str:
    return json.dumps({"stance": stance, "rationale": "ok", "plan": plan,
                       "risks": risks or [], "hypotheses": hypotheses or [],
                       "evidence_files": evidence or []})


class MockAdapter:
    def __init__(self, model, available=True, response="", delay=0.0, error=None, capture=None):
        self.model = model
        self._available = available
        self._response = response
        self._delay = delay
        self._error = error
        self.capture = capture

    def is_available(self):
        return self._available

    def complete(self, prompt, *, read_timeout=110):
        if self.capture is not None:
            self.capture.append(prompt)
        if self._delay:
            time.sleep(self._delay)
        if self._error:
            raise self._error
        return self._response


def _adapters(claude=None, qwen=None, gemini=None):
    return {
        C.ModelId.CLAUDE: claude if claude is not None else MockAdapter(C.ModelId.CLAUDE, response=_resp()),
        C.ModelId.QWEN14B: qwen if qwen is not None else MockAdapter(C.ModelId.QWEN14B, response=_resp(stance="BLOQUE")),
        C.ModelId.GEMINI_FLASH: gemini if gemini is not None else MockAdapter(C.ModelId.GEMINI_FLASH, response=_resp(hypotheses=["alt X"])),
    }


def _run(task, adapters, **kw):
    return asyncio.run(C.run_council(task, adapters, now=NOW, write=False, **kw))


def _task(brief="approche A ou B pour un planificateur generique ?"):
    return C.CouncilTask(brief=brief, task_id="council-test")


# ── 3 rôles tournent ──────────────────────────────────────────────────────────

def test_three_roles_run():
    res = _run(_task(), _adapters(qwen=MockAdapter(C.ModelId.QWEN14B, response=_resp(stance="APPROUVE"))))
    assert len(res.opinions) == 3
    assert {o.role for o in res.opinions} == set(C.CouncilRole)
    assert res.distinct_models == 3


# ── fallback proxy-down ───────────────────────────────────────────────────────

def test_proxy_down_fallback_qwen():
    res = _run(_task(), _adapters(claude=MockAdapter(C.ModelId.CLAUDE, available=False)))
    plan_op = next(o for o in res.opinions if o.role is C.CouncilRole.PLAN_REVIEW)
    assert plan_op.model is C.ModelId.QWEN14B and plan_op.fallback_used is True


def test_gemini_absent_fallback_qwen():
    res = _run(_task(), _adapters(gemini=MockAdapter(C.ModelId.GEMINI_FLASH, available=False)))
    div_op = next(o for o in res.opinions if o.role is C.CouncilRole.DIVERGENCE)
    assert div_op.model is C.ModelId.QWEN14B and div_op.fallback_used is True


# ── timeout respecté (wait_for libère l'orchestrateur) ────────────────────────

def test_timeout_role_degrades():
    # RED_TEAM = Qwen lent, sans fallback -> timeout -> ESCALADE/indispo.
    slow_qwen = MockAdapter(C.ModelId.QWEN14B, response=_resp(), delay=0.4)
    res = asyncio.run(C.run_council(_task(), _adapters(qwen=slow_qwen), now=NOW, write=False, timeout=0.05))
    red = next(o for o in res.opinions if o.role is C.CouncilRole.RED_TEAM)
    assert red.timed_out is True and red.available is False


# ── Gemini ne valide rien (stance forcée) ─────────────────────────────────────

def test_gemini_validates_nothing():
    # Gemini renvoie APPROUVE mais le rôle DIVERGENCE force la stance.
    res = _run(_task(), _adapters(gemini=MockAdapter(C.ModelId.GEMINI_FLASH, response=_resp(stance="APPROUVE"))))
    div = next(o for o in res.opinions if o.role is C.CouncilRole.DIVERGENCE)
    assert div.stance is C.Stance.DIVERGENCE and div.stance is not C.Stance.APPROUVE


# ── never_internal_studio : genericize + refus fail-closed ────────────────────

def test_genericize_strips_internal_markers():
    g = C.genericize("Voir IMP-203 dans lab/chains/kaizen_loop.py (charter)")
    assert "IMP-203" not in g and "kaizen_loop.py" not in g and "charter" not in g.lower()


def test_council_sends_genericized_brief_to_gemini():
    cap: list[str] = []
    gemini = MockAdapter(C.ModelId.GEMINI_FLASH, response=_resp(hypotheses=["x"]), capture=cap)
    _run(_task(brief="analyse IMP-203 charter dans governance/ecg.py"),
         _adapters(gemini=gemini))
    assert cap, "Gemini n'a pas été appelé"
    assert "IMP-203" not in cap[0] and "ecg.py" not in cap[0] and "governance/" not in cap[0]


def test_gemini_adapter_refuses_internal_content(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    ad = C.GeminiAdapter()
    with pytest.raises(C.CouncilCallError):       # refused_internal_content, sans appel réseau
        ad.complete("contient IMP-203 et autopilot.py")


# ── désaccords structurés -> HumanGate, pas d'auto-résolution ─────────────────

def test_redteam_bloque_creates_disagreement_humangate():
    red = MockAdapter(C.ModelId.QWEN14B,
                      response=_resp(stance="BLOQUE", risks=["race condition"], evidence=["CLAUDE.md"]))
    res = _run(_task(), _adapters(qwen=red))
    assert res.disagreements and res.requires_humangate is True
    d = res.disagreements[0]
    assert d.route == "HUMANGATE"                 # pas d'auto-résolution v1
    assert d.arbitrating_file == "CLAUDE.md"      # fichier repo existant qui tranche


def test_divergence_advisory_not_escalating():
    # 3 modèles distincts, pas de BLOQUE : divergences enregistrées mais PAS d'escalade auto.
    res = _run(_task(), _adapters(
        qwen=MockAdapter(C.ModelId.QWEN14B, response=_resp(stance="APPROUVE")),
        gemini=MockAdapter(C.ModelId.GEMINI_FLASH, response=_resp(hypotheses=["alternative Y"]))))
    assert res.divergences == ("alternative Y",)
    assert not res.disagreements and res.requires_humangate is False


# ── collapse mono-modèle ──────────────────────────────────────────────────────

def test_single_model_collapse_forces_humangate():
    res = _run(_task(), _adapters(
        claude=MockAdapter(C.ModelId.CLAUDE, available=False),
        gemini=MockAdapter(C.ModelId.GEMINI_FLASH, available=False),
        qwen=MockAdapter(C.ModelId.QWEN14B, response=_resp(stance="APPROUVE"))))
    assert res.distinct_models == 1 and res.collapsed is True and res.requires_humangate is True


# ── schéma de sortie validé ───────────────────────────────────────────────────

def test_output_schema_valid():
    res = _run(_task(), _adapters(qwen=MockAdapter(C.ModelId.QWEN14B, response=_resp(stance="APPROUVE"))))
    C.validate_output(res.to_dict())              # ne lève pas


def test_output_schema_rejects_bad():
    schema = json.loads((_ROOT / "schemas" / "council_output.schema.json").read_text(encoding="utf-8"))
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate({"task_id": "x"}, schema)


# ── governor.check avant écriture (action bloquante -> rien écrit) ────────────

def test_governor_blocks_write(tmp_path):
    with pytest.raises(C.GovernanceError):
        asyncio.run(C.run_council(_task(), _adapters(), now=NOW, write=True, out_dir=tmp_path,
                                  write_action={"lane": "SAFE_AUTO", "mission": "dataset_reset"}))
    assert not (tmp_path / "PLAN.md").exists() and not (tmp_path / "CONSENSUS.md").exists()


# ── artefacts append-only (figés) ─────────────────────────────────────────────

def test_artifacts_append_only(tmp_path):
    a = _adapters(qwen=MockAdapter(C.ModelId.QWEN14B, response=_resp(stance="APPROUVE")))
    asyncio.run(C.run_council(_task(), a, now="2026-06-29T01:00:00Z", write=True, out_dir=tmp_path))
    asyncio.run(C.run_council(_task(), a, now="2026-06-29T02:00:00Z", write=True, out_dir=tmp_path))
    consensus = (tmp_path / "CONSENSUS.md").read_text(encoding="utf-8")
    assert consensus.count("CONSENSUS council-test") == 2          # 2 sections
    assert "01:00:00Z" in consensus and "02:00:00Z" in consensus   # 1re préservée


def test_concurrent_append_no_corruption(tmp_path):
    path = tmp_path / "CONSENSUS.md"
    act = C.COUNCIL_WRITE_ACTION

    def worker(i):
        C._governed_append(path, f"\n## section-{i}\nbody-{i}\n", act)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    text = path.read_text(encoding="utf-8")
    for i in range(8):
        assert f"## section-{i}" in text and f"body-{i}" in text


# ── secret : clé Gemini jamais dans un artefact (scrub exception) ─────────────

def test_gemini_key_never_in_artifacts(monkeypatch, tmp_path):
    import requests
    secret = "SECRETKEY_DO_NOT_LEAK_123"
    monkeypatch.setenv("GEMINI_API_KEY", secret)

    def boom(*a, **k):
        raise RuntimeError(f"connreset https://generativelanguage.googleapis.com/?key={secret}")

    monkeypatch.setattr(requests, "post", boom)
    a = _adapters(gemini=C.GeminiAdapter(),
                  qwen=MockAdapter(C.ModelId.QWEN14B, response=_resp(stance="APPROUVE")))
    asyncio.run(C.run_council(_task(), a, now=NOW, write=True, out_dir=tmp_path))
    blob = (tmp_path / "CONSENSUS.md").read_text(encoding="utf-8") + (tmp_path / "PLAN.md").read_text(encoding="utf-8")
    assert secret not in blob                       # clé jamais rendue


# ── parsing tolérant ──────────────────────────────────────────────────────────

def test_extract_json_dirty():
    assert C._extract_json('```json\n{"stance":"APPROUVE"}\n```')["stance"] == "APPROUVE"
    assert C._extract_json('Voici: {"stance":"BLOQUE",}')["stance"] == "BLOQUE"   # virgule traînante
    assert C._extract_json("texte sans json") is None


def test_unparseable_response_escalades():
    res = _run(_task(), _adapters(claude=MockAdapter(C.ModelId.CLAUDE, response="pas du json"),
                                  qwen=MockAdapter(C.ModelId.QWEN14B, response="aussi pas du json")))
    plan = next(o for o in res.opinions if o.role is C.CouncilRole.PLAN_REVIEW)
    assert plan.parsed is False and plan.stance is C.Stance.ESCALADE


# ── Claude proxy : local uniquement (jamais l'API externe) ────────────────────

def test_claude_adapter_local_only():
    C.ClaudeProxyAdapter("http://127.0.0.1:8765/v1")          # OK
    with pytest.raises(C.CouncilError):
        C.ClaudeProxyAdapter("https://api.anthropic.com/v1")  # refusé
