"""Fixtures partagees des tests studio/factory (IMP-188)."""
from __future__ import annotations

import os

import pytest

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SNAKE_IR = os.path.join(_REPO_ROOT, "studio_core", "ir", "example_snake_game.json")


@pytest.fixture
def snake_ir_path() -> str:
    """Chemin de l'IR snake jouable (le seul runtime reel aujourd'hui)."""
    assert os.path.isfile(SNAKE_IR), f"IR snake introuvable : {SNAKE_IR}"
    return SNAKE_IR


@pytest.fixture
def minimal_ir() -> dict:
    """IR minimal valide contre ir_schema_v1 mais NON jouable par le runtime
    snake (sert a tester la voie 'oracle indisponible -> pas de promote')."""
    return {
        "meta": {"name": "Toy Game", "version": "0.1", "game_type": "turn_based_strategy"},
        "entities": [
            {"id": "hero", "type": "unit", "attributes": {"hp": 10}},
        ],
        "rules": [
            {"rule": "attack", "condition": "enemy_adjacent", "effect": "deal_damage"},
        ],
    }
