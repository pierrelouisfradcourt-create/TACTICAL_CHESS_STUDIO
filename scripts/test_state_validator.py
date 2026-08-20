"""Tests pour state_validator.py.

Stale detection (3 cas : absent, stale, fresh) + schema drift (IMP-157).
"""

import json
import os
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
from state_validator import validate, validate_schema, validate_all  # noqa: E402

# Réutilise le bootstrap genesis comme état valide de référence.
from bootstrap_state import genesis_state  # noqa: E402


def _write_state(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('{"claim_posture": "NO_CLAIM_ALLOWED"}', encoding="utf-8")


def _write_valid_state(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(genesis_state()), encoding="utf-8")


# ── stale detection ───────────────────────────────────────────────────────────

def test_absent(tmp_path: Path) -> None:
    state = tmp_path / ".studio_state" / "current_state.json"
    assert validate(state) == 1


def test_stale(tmp_path: Path) -> None:
    state = tmp_path / ".studio_state" / "current_state.json"
    _write_state(state)
    old_ts = time.time() - 3 * 3600  # 3h ago
    os.utime(state, (old_ts, old_ts))
    assert validate(state) == 1


def test_fresh(tmp_path: Path) -> None:
    state = tmp_path / ".studio_state" / "current_state.json"
    _write_state(state)
    assert validate(state) == 0


# ── schema drift ──────────────────────────────────────────────────────────────

def test_schema_absent(tmp_path: Path) -> None:
    state = tmp_path / ".studio_state" / "current_state.json"
    assert validate_schema(state) == 1


def test_schema_drift_missing_keys(tmp_path: Path) -> None:
    state = tmp_path / ".studio_state" / "current_state.json"
    _write_state(state)  # dict minimal → clés requises manquantes
    assert validate_schema(state) == 1


def test_schema_drift_invalid_json(tmp_path: Path) -> None:
    state = tmp_path / ".studio_state" / "current_state.json"
    state.parent.mkdir(parents=True, exist_ok=True)
    state.write_text("{not valid json", encoding="utf-8")
    assert validate_schema(state) == 1


def test_schema_ok(tmp_path: Path) -> None:
    state = tmp_path / ".studio_state" / "current_state.json"
    _write_valid_state(state)
    assert validate_schema(state) == 0


def test_validate_all_ok(tmp_path: Path) -> None:
    state = tmp_path / ".studio_state" / "current_state.json"
    _write_valid_state(state)  # fraîchement écrit → frais + conforme
    assert validate_all(state) == 0
