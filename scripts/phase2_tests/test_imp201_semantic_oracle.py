#!/usr/bin/env python3
"""IMP-201 — Oracle semantic / HumanGate obligatoire (AUDIT_REQUIRED, gating testable en code).

Acceptance: checklist JSON schema validée + transition ORACLE_PENDING->VERDICT_SIGNED bloquée
sans ratification (pas d'auto-pass).
Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp201_semantic_oracle.py -v

Inclut les cas RED TEAM (sous-agent Factory) : F1 bypass design-as-code, F2/F4 binding imp_id,
F3 parité fallback, F6 items vides, F7 contradiction d'état, F9 fail-closed.
NB: software_verdict mécanique = OK ; le claim final reste HumanGate (Pierre) -> commit, NE FERME PAS.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
import ecg  # noqa: E402
import semantic_oracle as so  # noqa: E402

TS = 1_700_000_000


def _imp(oracle_type="humangate", state="ORACLE_PENDING", imp_type="design", iid="IMP-999", **kw):
    title = "design tweak balance" if imp_type == "design" else "router impl"
    d = {"id": iid, "title": title, "type": imp_type,
         "domain": "studio", "ecg_state": state, "oracle_type": oracle_type}
    d.update(kw)
    return d


def _checklist(checked=True, oracle_type="humangate", imp_id="IMP-999", **kw):
    d = {
        "imp_id": imp_id,
        "oracle_type": oracle_type,
        "ratified_by": "Pierre",
        "ratified_ts": TS,
        "items": [
            {"id": "c1", "question": "design cohérent ?", "checked": checked, "evidence": "ok"},
            {"id": "c2", "question": "pas de régression UX ?", "checked": checked, "evidence": "ok"},
        ],
    }
    d.update(kw)
    return d


# ── checklist JSON schema ─────────────────────────────────────────────────────

def test_valid_checklist_passes():
    so.validate_checklist(_checklist())


def test_checklist_missing_field_rejected():
    bad = _checklist()
    del bad["ratified_by"]
    with pytest.raises(so.SemanticOracleError):
        so.validate_checklist(bad)


def test_checklist_empty_items_rejected():
    with pytest.raises(so.SemanticOracleError):
        so.validate_checklist(_checklist(items=[]))


def test_checklist_item_checked_non_bool_rejected():
    bad = _checklist()
    bad["items"][0]["checked"] = "yes"
    with pytest.raises(so.SemanticOracleError):
        so.validate_checklist(bad)


def test_checklist_non_dict_rejected():
    with pytest.raises(so.SemanticOracleError):
        so.validate_checklist("nope")


# ── RT-201-3 : parité du validateur fallback (verdict indépendant de jsonschema) ──

def test_fallback_validator_parity_accepts_valid():
    so.validate_checklist(_checklist(), prefer_fallback=True)


def test_fallback_validator_rejects_bad_imp_id():
    bad = _checklist(imp_id="IMP-abc")   # le schema exige ^IMP-\d+$
    with pytest.raises(so.SemanticOracleError):
        so.validate_checklist(bad, prefer_fallback=True)


def test_fallback_validator_rejects_empty_item_id():
    bad = _checklist()
    bad["items"][0]["id"] = ""
    with pytest.raises(so.SemanticOracleError):
        so.validate_checklist(bad, prefer_fallback=True)


# ── RT-201-1 : humangate sans ratification → BLOCK (pas d'auto-pass) ───────────

def test_humangate_without_ratification_blocked():
    d = so.can_sign_verdict(_imp("humangate"), ratification=None)
    assert not d.allowed and "auto-pass" in d.reason


def test_humangate_incomplete_checklist_blocked():
    d = so.can_sign_verdict(_imp("humangate"), ratification=_checklist(checked=False))
    assert not d.allowed and "incomplète" in d.reason


def test_humangate_ratified_complete_allowed():
    d = so.can_sign_verdict(_imp("humangate"), ratification=_checklist(checked=True))
    assert d.allowed


def test_humangate_missing_ratified_by_blocked():
    cl = _checklist()
    cl["ratified_by"] = ""
    d = so.can_sign_verdict(_imp("humangate"), ratification=cl)
    assert not d.allowed


# ── RT-201-1 (CRITIQUE) : design/balance déclaré code → BLOCK au GATE ──────────

def test_design_declared_as_code_blocked_at_gate():
    # IMP non-automatable (design) mal déclaré oracle_type=code : doit être refusé à la signature.
    d = so.can_sign_verdict(_imp("code", imp_type="design"),
                            ratification={"oracle_passed": True, "imp_id": "IMP-999"})
    assert not d.allowed and "humangate" in d.reason


# ── RT-201-2 / RT-201-4 (CRITIQUE) : binding imp_id (anti-replay cross-IMP) ────

def test_humangate_imp_id_mismatch_blocked():
    # checklist ratifiée pour IMP-999 rejouée sur IMP-777 -> BLOCK
    d = so.can_sign_verdict(_imp("humangate", iid="IMP-777"), ratification=_checklist(imp_id="IMP-999"))
    assert not d.allowed and "imp_id" in d.reason


def test_code_proof_imp_id_mismatch_blocked():
    d = so.can_sign_verdict(_imp("code", imp_type="feature", iid="IMP-777"),
                            ratification={"oracle_passed": True, "imp_id": "IMP-999"})
    assert not d.allowed and "imp_id" in d.reason


# ── RT-201-2 : oracle_type none / absent → BLOCK / violation ───────────────────

def test_oracle_type_none_blocked():
    d = so.can_sign_verdict(_imp("none"), ratification=_checklist(oracle_type="none"))
    assert not d.allowed and "humangate" in d.reason


def test_oracle_type_missing_raises():
    imp = {"id": "IMP-1", "title": "x", "type": "feature"}
    with pytest.raises(so.OracleTypeError):
        so.exactly_one_oracle_type(imp)


def test_oracle_type_divergent_raises():
    imp = {"id": "IMP-2", "oracle_type": "code",
           "notes": "blah | oracle_type=humangate | blocked_by=none"}
    with pytest.raises(so.OracleTypeError):
        so.exactly_one_oracle_type(imp)


def test_oracle_type_from_notes_only():
    imp = {"id": "IMP-3", "notes": "x | oracle_type=structure | blocked_by=none"}
    assert so.exactly_one_oracle_type(imp) == "structure"


def test_non_automatable_without_humangate_is_violation():
    data = {"improvements": [
        {"id": "IMP-A", "type": "design", "title": "balance tuning", "oracle_type": "code"},
        {"id": "IMP-B", "type": "feature", "title": "router", "oracle_type": "code"},
        {"id": "IMP-C", "type": "feature", "title": "x"},
    ]}
    viols = {v["id"] for v in so.oracle_type_violations(data)}
    assert "IMP-A" in viols and "IMP-C" in viols and "IMP-B" not in viols


# ── RT-201-3 (garde ECG) : transition hors ORACLE_PENDING → BLOCK ─────────────

def test_sign_blocked_when_not_oracle_pending():
    d = so.can_sign_verdict(_imp("humangate", state="IN_PROGRESS"), ratification=_checklist())
    assert not d.allowed and "ECG" in d.reason


def test_sign_blocked_when_closed():
    d = so.can_sign_verdict(_imp("humangate", state="CLOSED"), ratification=_checklist())
    assert not d.allowed


# ── RT-201-7 : ecg_state explicite contredisant status legacy → BLOCK ─────────

def test_ecg_state_contradicts_closed_status_blocked():
    imp = _imp("humangate", state="ORACLE_PENDING", status="CLOSED")  # CLOSED mais ecg_state=OP
    d = so.can_sign_verdict(imp, ratification=_checklist())
    assert not d.allowed and "incohérent" in d.reason


# ── RT-201-6 : items vides au gate → BLOCK ────────────────────────────────────

def test_gate_empty_items_blocked():
    d = so.can_sign_verdict(_imp("humangate"), ratification=_checklist(items=[]))
    assert not d.allowed


# ── RT-201-4 : code/structure sans preuve / preuve truthy-non-True → BLOCK ─────

def test_code_without_proof_blocked():
    d = so.can_sign_verdict(_imp("code", imp_type="feature"), ratification=None)
    assert not d.allowed and "mécanique" in d.reason


def test_code_with_bound_proof_allowed():
    d = so.can_sign_verdict(_imp("code", imp_type="feature"),
                            ratification={"oracle_passed": True, "imp_id": "IMP-999"})
    assert d.allowed


def test_oracle_passed_truthy_not_true_blocked():
    # 1 est truthy mais n'est pas True -> pas d'auto-pass laxiste
    d = so.can_sign_verdict(_imp("code", imp_type="feature"),
                            ratification={"oracle_passed": 1, "imp_id": "IMP-999"})
    assert not d.allowed


def test_structure_with_false_proof_blocked():
    d = so.can_sign_verdict(_imp("structure", imp_type="feature"),
                            ratification={"oracle_passed": False, "imp_id": "IMP-999"})
    assert not d.allowed


# ── RT-201-9 : entrée adverse → fail-closed (BLOCK, jamais de raise) ───────────

def test_unhashable_oracle_type_fail_closed():
    imp = _imp(imp_type="feature")
    imp["oracle_type"] = ["code"]   # type aberrant
    d = so.can_sign_verdict(imp, ratification={"oracle_passed": True, "imp_id": "IMP-999"})
    assert not d.allowed  # BLOCK, pas d'exception


def test_imp_non_dict_fail_closed():
    d = so.can_sign_verdict("nope", ratification=None)
    assert not d.allowed


# ── smoke : audit du vrai ledger (informational) ──────────────────────────────

def test_real_ledger_audit_runs():
    import yaml
    data = yaml.safe_load((_ROOT / "lab" / "chains" / "IMPROVEMENT_LEDGER.yaml").read_text(
        encoding="utf-8"))
    assert isinstance(so.oracle_type_violations(data), list)
