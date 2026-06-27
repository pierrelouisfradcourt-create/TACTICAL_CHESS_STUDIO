"""IMP-179 — filtre nulles du dataset value head.

Vérifie que TCS_VALUE_DECISIVE_ONLY exclut les parties nulles (result == "1/2-1/2")
du target value, ne garde que les décisives (1-0 / 0-1), et logge le compte décisif.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import dataset_loader  # noqa: E402

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def _row(result: str) -> dict:
    return {
        "fen": START_FEN,
        "best_move": "e2e4",
        "legal_moves": ["e2e4", "d2d4", "g1f3"],
        "top_moves": [],
        "top_scores": [],
        "result": result,
        "player_to_move": 1,
    }


def _write_pool(tmp_path: Path) -> str:
    rows = [_row("1/2-1/2"), _row("1/2-1/2"), _row("1/2-1/2"), _row("1-0"), _row("0-1")]
    path = tmp_path / "pool.jsonl"
    with path.open("w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")
    return str(path)


def test_draws_kept_by_default(tmp_path, monkeypatch):
    monkeypatch.delenv("TCS_VALUE_DECISIVE_ONLY", raising=False)
    ds = dataset_loader.TeacherDataset(_write_pool(tmp_path), skip_am_gate=True)
    assert len(ds) == 5  # 3 nulles + 2 décisives


def test_draws_excluded_when_flag_set(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("TCS_VALUE_DECISIVE_ONLY", "1")
    ds = dataset_loader.TeacherDataset(_write_pool(tmp_path), skip_am_gate=True)
    assert len(ds) == 2  # seules les 2 décisives survivent

    out = capsys.readouterr().out
    assert "skipped_draws         : 3" in out
    assert "decisive_positions    : 2" in out
    assert "value_decisive_only   : True" in out
