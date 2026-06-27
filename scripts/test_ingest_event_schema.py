"""IMP-154 + IMP-155 — schema lock & idempotence du backbone events.jsonl.

IMP-154 — verrou de schéma :
  - chaque event écrit porte un champ `version`
  - un event sans `version` est rejeté en lecture (verify_event_log → False)
  - un event avec un champ hors schéma est rejeté en lecture
  - migrate_event_log() estampille les lignes legacy et reste HMAC-vérifiable

IMP-155 — idempotence :
  - _is_already_ingested détecte un task_id déjà journalisé
  - ré-écrire le même task_id ne crée pas de doublon (état final identique)

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


# ── IMP-154 — schema lock ──────────────────────────────────────────────────────

def test_written_event_carries_version(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)

    ingest_event.append_event_log("elo_match", "oracle:elo_match:2026-06-27T00:00:00Z")

    ev = _read_events(log)[0]
    assert ev["version"] == ingest_event.SCHEMA_VERSION


def test_event_without_version_rejected_on_read(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)
    # Ligne legacy sans version, mais HMAC valide → doit quand même être rejetée.
    entry = {"ts": "2026-06-27T00:00:00Z", "type": "elo_match",
             "task_id": "oracle:elo_match:t", "oracle_id": "elo_match"}
    payload = json.dumps(entry, separators=(",", ":"), sort_keys=True)
    entry["hmac"] = ingest_event._hmac(payload)
    log.write_text(json.dumps(entry, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")

    assert ingest_event.verify_event_log() is False


def test_event_with_unknown_field_rejected_on_read(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)
    entry = {"ts": "t", "type": "elo_match", "task_id": "oracle:elo_match:t",
             "oracle_id": "elo_match", "version": ingest_event.SCHEMA_VERSION,
             "rogue_field": "drift"}
    payload = json.dumps(entry, separators=(",", ":"), sort_keys=True)
    entry["hmac"] = ingest_event._hmac(payload)
    log.write_text(json.dumps(entry, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")

    assert ingest_event.verify_event_log() is False


def test_validate_event_schema_raises():
    with pytest.raises(ValueError, match="event_missing_version"):
        ingest_event._validate_event_schema({"ts": "t", "type": "x", "task_id": "y"})
    with pytest.raises(ValueError, match="event_unknown_fields"):
        ingest_event._validate_event_schema(
            {"ts": "t", "type": "x", "task_id": "y", "version": 1, "bogus": 1}
        )


def test_versioned_event_is_hmac_verifiable(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)

    ingest_event.append_event_log("imp_closed", "imp_closed:IMP-154:2026-06-27T00:00:00Z")

    assert ingest_event.verify_event_log() is True


def test_migrate_stamps_legacy_and_stays_verifiable(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)
    # Deux lignes legacy sans version (format pré-IMP-154).
    legacy = {"ts": "t", "type": "elo_match", "task_id": "oracle:elo_match:t", "oracle_id": "elo_match"}
    payload = json.dumps(legacy, separators=(",", ":"), sort_keys=True)
    legacy["hmac"] = ingest_event._hmac(payload)
    line = json.dumps(legacy, separators=(",", ":"), sort_keys=True)
    log.write_text(line + "\n" + line.replace(":t", ":t2") + "\n", encoding="utf-8")

    assert ingest_event.verify_event_log() is False  # avant migration : rejeté
    n = ingest_event.migrate_event_log()
    assert n == 2
    assert ingest_event.verify_event_log() is True   # après migration : OK
    for ev in _read_events(log):
        assert ev["version"] == ingest_event.SCHEMA_VERSION


# ── IMP-155 — idempotence ──────────────────────────────────────────────────────

def test_is_already_ingested_detects_duplicate(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)
    task_id = "oracle:elo_match:2026-06-27T00:00:00Z"

    assert ingest_event._is_already_ingested(task_id) is False
    ingest_event.append_event_log("elo_match", task_id)
    assert ingest_event._is_already_ingested(task_id) is True


def test_is_already_ingested_false_for_new_task(tmp_path, monkeypatch):
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)
    ingest_event.append_event_log("elo_match", "oracle:elo_match:A")

    assert ingest_event._is_already_ingested("oracle:elo_match:B") is False


def test_no_duplicate_when_guard_applied(tmp_path, monkeypatch):
    """Simule la garde d'ingest_event : on n'ajoute pas si déjà présent → état identique."""
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ingest_event, "EVENT_LOG", log)
    task_id = "oracle:elo_match:2026-06-27T00:00:00Z"

    for _ in range(3):
        if not ingest_event._is_already_ingested(task_id):
            ingest_event.append_event_log("elo_match", task_id)

    assert len(_read_events(log)) == 1
