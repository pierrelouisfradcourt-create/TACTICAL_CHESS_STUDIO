#!/usr/bin/env python3
"""IMP-199 — SOA execution router (SAFE_AUTO, oracle code).

Acceptance: pytest sur-orchestration détectée → refus ; routing nominal → OK.
Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp199_soa.py -v
Lecture seule du vrai capabilities.yaml ; le reste sur registres synthétiques.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
import soa_router as soa  # noqa: E402


def _reg(agents: dict[str, list[str]]) -> soa.Registry:
    return soa.Registry(agents={a: frozenset(c) for a, c in agents.items()})


# ── routing nominal ───────────────────────────────────────────────────────────

def test_nominal_single_agent():
    reg = _reg({"claude": ["code_review", "plan", "gate"], "qwen": ["estimate"]})
    plan = soa.route({"required_capabilities": ["code_review", "plan"],
                      "requested_agents": 1}, reg)
    assert plan.agents == ("claude",)
    assert plan.covered == frozenset({"code_review", "plan"})


def test_cover_two_agents():
    reg = _reg({"claude": ["code_review"], "qwen": ["estimate"]})
    plan = soa.route({"required_capabilities": ["code_review", "estimate"],
                      "requested_agents": 2}, reg)
    assert set(plan.agents) == {"claude", "qwen"} and len(plan.agents) == 2


# ── anti sur-orchestration : refus dur ────────────────────────────────────────

def test_over_orchestration_refused():
    reg = _reg({"claude": ["code_review", "plan"]})
    with pytest.raises(soa.OverOrchestrationError):
        soa.route({"required_capabilities": ["code_review", "plan"],
                   "requested_agents": 3}, reg)   # 1 suffit


def test_trivial_task_with_agents_refused():
    reg = _reg({"claude": ["x"]})
    with pytest.raises(soa.OverOrchestrationError):
        soa.route({"required_capabilities": [], "requested_agents": 2}, reg)  # 0 nécessaire


def test_insufficient_agents_refused():
    reg = _reg({"claude": ["code_review"], "qwen": ["estimate"]})
    with pytest.raises(soa.InsufficientAgentsError):
        soa.route({"required_capabilities": ["code_review", "estimate"],
                   "requested_agents": 1}, reg)   # 2 nécessaires


# ── RT-199-1 : requested_agents obligatoire (pas de skip silencieux) ──────────

def test_requested_agents_mandatory():
    reg = _reg({"claude": ["plan"]})
    with pytest.raises(soa.SoaError):
        soa.route({"required_capabilities": ["plan"]}, reg)   # pas de requested_agents


def test_malformed_task_refused():
    reg = _reg({"claude": ["plan"]})
    with pytest.raises(soa.SoaError):
        soa.route({"requested_agents": 1}, reg)               # pas de required_capabilities
    with pytest.raises(soa.SoaError):
        soa.route("nope", reg)


# ── capacité indisponible / inexistante ───────────────────────────────────────

def test_unavailable_capability_refused():
    reg = _reg({"claude": ["plan"]})
    with pytest.raises(soa.UnavailableCapabilityError):
        soa.route({"required_capabilities": ["nonexistent"], "requested_agents": 1}, reg)


def test_case_sensitive_capability():
    reg = _reg({"claude": ["plan"]})
    with pytest.raises(soa.UnavailableCapabilityError):
        soa.route({"required_capabilities": ["Plan"], "requested_agents": 1}, reg)  # casse


# ── RT-199-2 : minimisation prouvée sur registre multi-provider ──────────────

def test_greedy_minimization_multi_provider():
    # 'shared' offerte par 2 agents ; 'a' seulement par A1, 'b' seulement par B1.
    reg = _reg({"A1": ["a", "shared"], "B1": ["b", "shared"], "BIG": ["a", "b", "shared"]})
    plan = soa.route({"required_capabilities": ["a", "b", "shared"],
                      "requested_agents": 1}, reg)
    assert plan.agents == ("BIG",)   # 1 agent couvre tout (minimal), pas 2


# ── RT-199-3 : déterminisme malgré l'ordre d'insertion ────────────────────────

def test_determinism_shuffled_insertion_order():
    a1 = _reg({"Z": ["x"], "A": ["x"]})   # deux agents couvrent 'x' ; tie-break -> 'A'
    a2 = _reg({"A": ["x"], "Z": ["x"]})   # ordre inverse
    p1 = soa.route({"required_capabilities": ["x"], "requested_agents": 1}, a1)
    p2 = soa.route({"required_capabilities": ["x"], "requested_agents": 1}, a2)
    assert p1.agents == p2.agents == ("A",)   # tie-break (-couverture, id) déterministe


# ── RT-199-4 : parsing du vrai registre, statut filtré ────────────────────────

def test_load_real_registry_smoke():
    reg = soa.load_registry()
    caps = reg.capabilities
    # roles réels présents
    assert "code_review" in caps and "director" in caps
    # skill UNKNOWN (fog/gate_check/reanchor : provider UNKNOWN) -> drop
    assert "fog" not in caps
    # claude-code-cli (AVAILABLE) présent comme agent
    assert any("claude" in a for a in reg.agents)


def test_skill_dropped_when_provider_model_unknown(tmp_path):
    import yaml
    reg_yaml = {
        "models": [
            {"id": "good", "status": "AVAILABLE", "roles": ["r1"]},
            {"id": "ghost", "status": "UNKNOWN", "roles": ["r2"]},
        ],
        "skills": [
            {"id": "s_ok", "provider": "good", "status": "AVAILABLE"},
            {"id": "s_ghost", "provider": "ghost", "status": "AVAILABLE"},  # modèle UNKNOWN
            {"id": "s_unres", "provider": "nope", "status": "AVAILABLE"},   # provider inconnu
        ],
    }
    p = tmp_path / "caps.yaml"
    p.write_text(yaml.dump(reg_yaml), encoding="utf-8")
    reg = soa.load_registry(p)
    assert "s_ok" in reg.capabilities and "r1" in reg.capabilities
    assert "s_ghost" not in reg.capabilities   # provider UNKNOWN -> drop
    assert "s_unres" not in reg.capabilities   # provider non résolu -> drop
    assert "r2" not in reg.capabilities        # modèle UNKNOWN -> agent absent


def test_missing_registry_raises(tmp_path):
    with pytest.raises(soa.SoaError):
        soa.load_registry(tmp_path / "absent.yaml")
