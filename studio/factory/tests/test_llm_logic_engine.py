"""Tests llm_logic_engine — remplissage logique, degradation, structure (IMP-188)."""
from __future__ import annotations

import urllib.error

import pytest

from studio.factory.llm_logic_engine import FALLBACK, LogicEngineError, fill_logic
from studio.factory.template_engine import build_scaffold


def _fixed_lm(_: str) -> str:
    return "if condition: apply(effect)"


def _raising_lm(_: str) -> str:
    raise urllib.error.URLError("proxy down")


def _empty_lm(_: str) -> str:
    return "   "


def test_fill_logic_fills_all_slots(minimal_ir):
    sc = build_scaffold(minimal_ir)
    out = fill_logic(sc, lm_call=_fixed_lm)
    assert all(r["logic"] == "if condition: apply(effect)" for r in out["rules"])
    assert out["logic_complete"] is True
    assert out["logic_report"]["filled"] == len(out["rules"])
    assert out["logic_report"]["fallback"] == 0


def test_fill_logic_graceful_fallback(minimal_ir):
    """Proxy injoignable : pas de crash, slots FALLBACK, logic_complete False."""
    sc = build_scaffold(minimal_ir)
    out = fill_logic(sc, lm_call=_raising_lm)
    assert all(r["logic"] == FALLBACK for r in out["rules"])
    assert out["logic_complete"] is False
    assert out["logic_report"]["fallback"] == len(out["rules"])


def test_fill_logic_does_not_mutate_input(minimal_ir):
    sc = build_scaffold(minimal_ir)
    fill_logic(sc, lm_call=_fixed_lm)
    # L'entree garde ses slots vides (copie profonde en interne).
    assert all(r["logic"] is None for r in sc["rules"])


def test_fill_logic_preserves_structure(snake_ir_path):
    from studio.factory.template_engine import load_ir
    sc = build_scaffold(load_ir(snake_ir_path))
    out = fill_logic(sc, lm_call=_fixed_lm)
    assert [r["rule"] for r in out["rules"]] == [r["rule"] for r in sc["rules"]]
    assert [e["id"] for e in out["entities"]] == [e["id"] for e in sc["entities"]]
    assert out["project"] == sc["project"]


def test_fill_logic_empty_response_raises(minimal_ir):
    sc = build_scaffold(minimal_ir)
    with pytest.raises(LogicEngineError):
        fill_logic(sc, lm_call=_empty_lm)


def test_fill_logic_idempotent(minimal_ir):
    sc = build_scaffold(minimal_ir)
    once = fill_logic(sc, lm_call=_fixed_lm)
    twice = fill_logic(once, lm_call=_fixed_lm)
    assert once["rules"] == twice["rules"]
    assert twice["logic_report"]["filled"] == 0  # rien a refaire
