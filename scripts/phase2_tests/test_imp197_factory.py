#!/usr/bin/env python3
"""IMP-197 — Agent Factory : capabilities.lock.json + 5 templates, governor-validated.

Acceptance: schema valide + instanciation testee (Planner/Executor/RedTeam/Explorer/Reviewer).
Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp197_factory.py -v
"""
from __future__ import annotations

import copy
import re
import sys
from pathlib import Path

import jsonschema
import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
import agent_factory as af  # noqa: E402

CAPS = af.load_capabilities()   # valide le lock contre le schéma à l'import (lève si invalide)


# ── schéma + structure ────────────────────────────────────────────────────────

def test_lock_validates_against_schema():
    # load_capabilities a déjà validé ; re-valide explicitement.
    schema = __import__("json").loads((_ROOT / "schemas" / "capabilities.schema.json").read_text(encoding="utf-8"))
    jsonschema.validate(CAPS, schema)


def test_five_roles_present():
    assert set(af.roles(CAPS)) == set(af.ROLE_NAMES)


def test_claim_posture():
    assert CAPS["claim_posture"] == "NO_CLAIM_ALLOWED"


@pytest.mark.parametrize("role", af.ROLE_NAMES)
def test_each_role_has_required_shape(role):
    t = CAPS["roles"][role]
    assert t["goal"] and t["constraints"] and t["failure_policy"]
    assert isinstance(t["output_schema"], dict) and len(t["output_schema"]) >= 1
    assert {"lane", "mission"} <= set(t["default_action"])


# ── instanciation : les 5 rôles s'instancient (default_action SAFE_AUTO) ───────

@pytest.mark.parametrize("role", af.ROLE_NAMES)
def test_each_role_instantiates(role):
    inst = af.instantiate(role, CAPS)
    assert inst.role == role and inst.decision.allowed


def test_unknown_role_raises():
    with pytest.raises(af.FactoryError):
        af.instantiate("Wizard", CAPS)


# ── governor.check NON tautologique (RT-197-1) : vrais BLOCKs runtime ─────────

def test_forbidden_mission_action_refused():
    with pytest.raises(af.CapabilityViolation):
        af.instantiate("Executor", CAPS, action={"lane": "SAFE_AUTO", "mission": "dataset_reset"})


def test_human_required_action_refused():
    with pytest.raises(af.CapabilityViolation):
        af.instantiate("Reviewer", CAPS, action={"lane": "HUMAN_REQUIRED", "mission": "humangate_ratify"})


def test_audit_required_without_pass_refused():
    with pytest.raises(af.CapabilityViolation):
        af.instantiate("Executor", CAPS, action={"lane": "AUDIT_REQUIRED", "mission": "imp_close"})


def test_audit_required_with_pass_allowed():
    inst = af.instantiate("Executor", CAPS,
                          action={"lane": "AUDIT_REQUIRED", "mission": "imp_close", "audit_passed": True})
    assert inst.decision.allowed


def test_reviewer_ratification_is_gate_only():
    # L'action de ratification du Reviewer (gated_action HUMAN_REQUIRED) est refusée en autonome
    # -> DREAMS.md / ratification = gate-only (RT-197-4).
    gated = CAPS["roles"]["Reviewer"]["gated_action"]
    assert gated["lane"] == "HUMAN_REQUIRED"
    with pytest.raises(af.CapabilityViolation):
        af.instantiate("Reviewer", CAPS, action=gated)


# ── forbidden_globs ⊇ zones FORBIDDEN du pre-commit hook (RT-197-3) ───────────

def test_forbidden_globs_superset_of_precommit_hook():
    hook = (_ROOT / ".claude" / "hooks" / "pre-commit").read_text(encoding="utf-8")
    m = re.search(r'FORBIDDEN="([^"]+)"', hook)
    assert m, "FORBIDDEN introuvable dans le hook"
    hook_zones = [z.rstrip("/") for z in m.group(1).split()]
    lock_zones = {g.replace("**", "").rstrip("/") for g in CAPS["forbidden_globs"]}
    missing = [z for z in hook_zones if z not in lock_zones]
    assert not missing, f"zones du hook absentes du lock: {missing}"
    assert ".github" in lock_zones   # surensemble doctrinal (non enforce par le hook)


# ── garde runtime des write targets (RT-197-3) ────────────────────────────────

def test_validate_write_target_blocks_forbidden():
    with pytest.raises(af.CapabilityViolation):
        af.validate_write_target(CAPS, ["tests/foo.py"])
    with pytest.raises(af.CapabilityViolation):
        af.validate_write_target(CAPS, [".github/workflows/ci.yml"])


def test_validate_write_target_allows_docs():
    af.validate_write_target(CAPS, ["docs/phase2/PLAN.md", "governance/x.py"])  # pas d'exception


# ── le schéma rejette le garbage (RT-197-2) ───────────────────────────────────

def _schema():
    import json
    return json.loads((_ROOT / "schemas" / "capabilities.schema.json").read_text(encoding="utf-8"))


def test_schema_rejects_empty_output_schema():
    bad = copy.deepcopy(CAPS)
    bad["roles"]["Planner"]["output_schema"] = {}     # minProperties >= 1 viole
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad, _schema())


def test_schema_rejects_missing_role_specific_key():
    bad = copy.deepcopy(CAPS)
    bad["roles"]["Executor"]["output_schema"] = {"imp_id": "str"}   # 'closed' requis manquant
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad, _schema())


def test_schema_rejects_wrong_claim_posture():
    bad = copy.deepcopy(CAPS)
    bad["claim_posture"] = "OK"
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad, _schema())
