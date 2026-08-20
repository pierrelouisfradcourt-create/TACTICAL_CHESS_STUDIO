"""Tests template_engine — structure deterministe, slots logique vides (IMP-188)."""
from __future__ import annotations

import pytest

from studio.factory.template_engine import (
    LOGIC_UNFILLED,
    TemplateError,
    build_scaffold,
    load_ir,
)


def test_build_scaffold_minimal(minimal_ir):
    sc = build_scaffold(minimal_ir)
    assert sc["project"]["name"] == "Toy Game"
    assert sc["project"]["version"] == "0.1"
    assert len(sc["entities"]) == 1
    assert len(sc["rules"]) == 1
    # Slot logique strictement vide a ce stade.
    assert all(r["logic"] is LOGIC_UNFILLED for r in sc["rules"])
    assert sc["logic_complete"] is False


def test_scaffold_preserves_rule_count_snake(snake_ir_path):
    ir = load_ir(snake_ir_path)
    sc = build_scaffold(ir)
    assert len(sc["rules"]) == len(ir["rules"])
    assert [r["rule"] for r in sc["rules"]] == [r["rule"] for r in ir["rules"]]


def test_scaffold_is_deterministic(snake_ir_path):
    ir = load_ir(snake_ir_path)
    assert build_scaffold(ir) == build_scaffold(ir)


def test_scaffold_does_not_invent_logic(snake_ir_path):
    """Le moteur de template ne fabrique aucune logique."""
    sc = build_scaffold(load_ir(snake_ir_path))
    assert all(r["logic"] is None for r in sc["rules"])


def test_structure_layout_present(minimal_ir):
    sc = build_scaffold(minimal_ir)
    struct = sc["structure"]
    assert struct["root"] == "games/toy_game"
    assert len(struct["entity_scenes"]) == 1


@pytest.mark.parametrize("bad", [
    {},
    {"meta": {"name": "x", "version": "1"}, "entities": [], "rules": [{"rule": "r", "condition": "c", "effect": "e"}]},
    {"meta": {"name": "x", "version": "1"}, "entities": [{"id": "a", "type": "t", "attributes": {}}], "rules": []},
])
def test_build_scaffold_rejects_incomplete(bad):
    with pytest.raises(TemplateError):
        build_scaffold(bad)


def test_load_ir_missing_file():
    with pytest.raises(TemplateError):
        load_ir("does/not/exist.json")
