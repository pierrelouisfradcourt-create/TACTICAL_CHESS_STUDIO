#!/usr/bin/env python3
"""IMP-196 — event log append-only HMAC + projection model (AUDIT_REQUIRED, non fermé).

Acceptance: pytest replay depuis zero = meme etat.
Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase1_tests/test_imp196_projection.py -v
Tout opère sur des logs temporaires signés (jamais d'écriture du vrai lab/events.jsonl).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
sys.path.insert(0, str(_ROOT / "scripts"))
import ingest_event as ie  # noqa: E402
import projection as pj  # noqa: E402


def _sign(entry: dict) -> str:
    """Signe une entry comme append_event_log (HMAC sur payload sans hmac)."""
    payload = json.dumps(entry, separators=(",", ":"), sort_keys=True)
    signed = dict(entry)
    signed["hmac"] = ie._hmac(payload)
    return json.dumps(signed, separators=(",", ":"), sort_keys=True)


def _oracle_ev(ts: str, oracle_id: str = "elo_match") -> dict:
    return {"ts": ts, "type": "elo_match", "task_id": f"oracle:elo_match:{ts}",
            "version": ie.SCHEMA_VERSION, "oracle_id": oracle_id}


def _imp_closed_ev(imp_id: str, ts: str) -> dict:
    return {"ts": ts, "type": "imp_closed", "task_id": f"imp_closed:{imp_id}:{ts}",
            "version": ie.SCHEMA_VERSION, "imp_id": imp_id}


def _write_log(path: Path, entries: list[dict], trailing_newline: bool = True) -> None:
    lines = [_sign(e) for e in entries]
    text = "\n".join(lines)
    if trailing_newline and lines:
        text += "\n"
    path.write_text(text, encoding="utf-8")


# ── log vide / absent ─────────────────────────────────────────────────────────

def test_missing_log_is_initial_state(tmp_path):
    assert pj.replay(tmp_path / "nope.jsonl") == pj.initial_state()


def test_empty_log_is_initial_state(tmp_path):
    p = tmp_path / "events.jsonl"
    p.write_text("", encoding="utf-8")
    assert pj.replay(p) == pj.initial_state()


# ── ACCEPTANCE : replay depuis zéro == projection complète, déterministe ───────

def test_replay_equals_full_projection(tmp_path):
    p = tmp_path / "events.jsonl"
    evs = [_oracle_ev("2026-06-29T00:00:00Z"), _imp_closed_ev("IMP-042", "2026-06-29T01:00:00Z")]
    _write_log(p, evs)
    assert pj.replay(p) == pj.project(pj.load_events(p))


def test_determinism_byte_identical(tmp_path):
    p = tmp_path / "events.jsonl"
    _write_log(p, [_oracle_ev("2026-06-29T00:00:00Z"), _imp_closed_ev("IMP-1", "2026-06-29T02:00:00Z")])
    evs = pj.load_events(p)
    assert pj.canonical(pj.project(evs)) == pj.canonical(pj.project(evs))
    # replay deux fois aussi
    assert pj.canonical(pj.replay(p)) == pj.canonical(pj.replay(p))


# ── projection des types ──────────────────────────────────────────────────────

def test_oracle_event_projected(tmp_path):
    p = tmp_path / "events.jsonl"
    _write_log(p, [_oracle_ev("2026-06-29T00:00:00Z")])
    st = pj.replay(p)
    assert st["oracles"]["elo_match"]["last_ts"] == "2026-06-29T00:00:00Z"


def test_oracle_last_write_wins(tmp_path):
    p = tmp_path / "events.jsonl"
    _write_log(p, [_oracle_ev("2026-06-29T00:00:00Z"), _oracle_ev("2026-06-29T05:00:00Z")])
    st = pj.replay(p)
    assert st["oracles"]["elo_match"]["last_ts"] == "2026-06-29T05:00:00Z"  # dernier gagne


def test_imp_closed_forward_ready(tmp_path):
    p = tmp_path / "events.jsonl"
    _write_log(p, [_imp_closed_ev("IMP-042", "2026-06-29T00:00:00Z")])
    st = pj.replay(p)
    assert st["imps"]["IMP-042"]["ecg_state"] == "CLOSED"


def test_reopen_reclose_last_wins(tmp_path):
    p = tmp_path / "events.jsonl"
    _write_log(p, [_imp_closed_ev("IMP-9", "2026-06-29T00:00:00Z"),
                   _imp_closed_ev("IMP-9", "2026-06-29T09:00:00Z")])
    st = pj.replay(p)
    assert st["imps"]["IMP-9"]["last_event_ts"] == "2026-06-29T09:00:00Z"


def test_duplicate_line_idempotent_state(tmp_path):
    p = tmp_path / "events.jsonl"
    ev = _imp_closed_ev("IMP-7", "2026-06-29T00:00:00Z")
    _write_log(p, [ev, ev])  # ligne dupliquée
    once = pj.project([pj.load_events(p)[0]])
    twice = pj.replay(p)
    assert pj.canonical(once) == pj.canonical(twice)  # même entité -> état identique


def test_unknown_type_skipped_ordered(tmp_path):
    p = tmp_path / "events.jsonl"
    unk = {"ts": "2026-06-29T00:00:00Z", "type": "system", "task_id": "system:boot:1",
           "version": ie.SCHEMA_VERSION, "system_id": "boot"}
    _write_log(p, [unk])
    st = pj.replay(p)
    assert st["_skipped"] == ["system:boot:1"]
    assert isinstance(st["_skipped"], list)


# ── intégrité : tamper / off-schema -> exception (pas de projection) ──────────

def test_tampered_hmac_midfile_raises(tmp_path):
    p = tmp_path / "events.jsonl"
    good = _sign(_oracle_ev("2026-06-29T00:00:00Z"))
    bad = json.loads(_sign(_oracle_ev("2026-06-29T01:00:00Z")))
    h = bad["hmac"]
    bad["hmac"] = ("0" if h[0] != "0" else "1") + h[1:]
    p.write_text(good + "\n" + json.dumps(bad, separators=(",", ":"), sort_keys=True) + "\n",
                 encoding="utf-8")
    with pytest.raises(pj.ProjectionError):
        pj.replay(p)


def test_missing_version_raises(tmp_path):
    p = tmp_path / "events.jsonl"
    entry = {"ts": "2026-06-29T00:00:00Z", "type": "elo_match",
             "task_id": "oracle:elo_match:x", "oracle_id": "elo_match"}  # pas de version
    p.write_text(_sign(entry) + "\n", encoding="utf-8")
    with pytest.raises(pj.ProjectionError):
        pj.replay(p)


# ── RT-196-2 : ligne partielle finale tolérée (≠ tamper) ──────────────────────

def test_trailing_partial_line_tolerated(tmp_path):
    p = tmp_path / "events.jsonl"
    good = _sign(_oracle_ev("2026-06-29T00:00:00Z"))
    # ligne complète + début d'un append (pas de '\n' terminal) -> queue partielle
    p.write_text(good + "\n" + '{"ts":"2026-06-29T01:00:00Z","type":"elo_ma',
                 encoding="utf-8")
    st = pj.replay(p)  # ne doit PAS lever
    assert st["oracles"]["elo_match"]["last_ts"] == "2026-06-29T00:00:00Z"


# ── RT-196-5 : précondition log réel 100% v1 (garde-fou "no re-migration") ────

def test_real_event_log_is_all_v1():
    p = pj.DEFAULT_EVENT_LOG
    if not p.exists():
        pytest.skip("pas de lab/events.jsonl")
    for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        assert json.loads(line).get("version") == ie.SCHEMA_VERSION, f"ligne {i} pas v1"
