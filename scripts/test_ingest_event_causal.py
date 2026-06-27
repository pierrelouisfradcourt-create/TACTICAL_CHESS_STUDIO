"""IMP-159 — Tracking causal IMP→outcome dans events.jsonl.

Vérifie l'invariant : chaque event écrit dans events.jsonl porte un identifiant
causal (imp_id / oracle_id / system_id) extrait du task_id, et qu'un task_id
sans préfixe causal est rejeté.

Cas couverts :
  - un event imp_closed contient bien le champ imp_id
  - un event oracle contient oracle_id ; un event system contient system_id
  - l'extraction renvoie le bon id pour chaque préfixe
  - un task_id sans préfixe causal lève ValueError (event refusé)
  - la ligne écrite reste HMAC-vérifiable par verify_event_log()

Lecture/écriture isolées : EVENT_LOG est monkeypatché vers tmp_path, le vrai
lab/events.jsonl n'est jamais touché.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import ingest_event  # noqa: E402


def _read_events(path: Path) -> list[dict]:
    lines = [ln for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    return [json.loads(ln) for ln in lines]


def test_imp_closed_event_contains_imp_id(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)

    ingest_event.append_event_log("imp_closed", "imp_closed:IMP-159:2026-06-27T00:00:00Z")

    events = _read_events(log)
    assert len(events) == 1
    ev = events[0]
    assert ev["type"] == "imp_closed"
    assert ev["imp_id"] == "IMP-159"  # invariant IMP-159
    assert "oracle_id" not in ev
    assert "system_id" not in ev


def test_oracle_event_contains_oracle_id(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)

    ingest_event.append_event_log("elo_match", "oracle:elo_match:2026-06-27T00:00:00Z")

    ev = _read_events(log)[0]
    assert ev["oracle_id"] == "elo_match"
    assert "imp_id" not in ev


def test_system_event_contains_system_id(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)

    ingest_event.append_event_log("boot", "system:director:2026-06-27T00:00:00Z")

    ev = _read_events(log)[0]
    assert ev["system_id"] == "director"


@pytest.mark.parametrize(
    "task_id, expected",
    [
        ("imp_closed:IMP-001:ts", {"imp_id": "IMP-001"}),
        ("oracle:lichess_eval:ts", {"oracle_id": "lichess_eval"}),
        ("system:backbone:ts", {"system_id": "backbone"}),
    ],
)
def test_extract_causal_id(task_id, expected):
    assert ingest_event._extract_causal_id(task_id) == expected


@pytest.mark.parametrize(
    "task_id",
    [
        "no_prefix_at_all",
        "unknown:foo:ts",
        "",
        "imp_closed",  # préfixe seul, pas d'id
    ],
)
def test_missing_causal_id_rejected(task_id):
    with pytest.raises(ValueError, match="event_missing_causal_id"):
        ingest_event._extract_causal_id(task_id)


def test_written_event_is_hmac_verifiable(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)

    ingest_event.append_event_log("imp_closed", "imp_closed:IMP-159:2026-06-27T00:00:00Z")

    # verify_event_log lit EVENT_LOG (monkeypatché) et revalide chaque HMAC.
    assert ingest_event.verify_event_log() is True
