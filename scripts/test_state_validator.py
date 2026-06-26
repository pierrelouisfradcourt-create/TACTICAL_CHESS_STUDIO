"""Tests pour state_validator.py — 3 cas : absent, stale, fresh."""

import os
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
from state_validator import validate  # noqa: E402


def _write_state(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('{"claim_posture": "NO_CLAIM_ALLOWED"}', encoding="utf-8")


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
