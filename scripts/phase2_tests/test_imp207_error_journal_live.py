#!/usr/bin/env python3
"""IMP-207 — error_journal -> boucle : câblage live + HMAC + escalade (réutilise IMP-202).

Acceptance : oracle rouge -> entrée journal HMAC ; même erreur 3x -> escalade proposition
AUDIT_REQUIRED (JAMAIS d'add ledger SAFE_AUTO — RED TEAM C1) ; HMAC valide par ligne ;
câblage best-effort ne lève jamais.

Oracle : .venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp207_error_journal_live.py -v
Offline & déterministe : now_ts fixe, chemins tmp_path.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
sys.path.insert(0, str(_ROOT / "lab" / "chains"))
import error_journal as ej  # noqa: E402
import governor  # noqa: E402

NOW = 1_700_000_000


def _paths(tmp_path):
    return tmp_path / "journal.jsonl", tmp_path / "proposals.jsonl"


# ── HMAC : signe + vérifie par ligne ───────────────────────────────────────────

def test_journal_entry_is_hmac_signed(tmp_path):
    j, p = _paths(tmp_path)
    ej.record_error("brand new failure for hmac alpha", journal_path=j, proposals_path=p, now_ts=NOW)
    entry = json.loads(j.read_text(encoding="utf-8").splitlines()[0])
    assert "hmac" in entry and isinstance(entry["hmac"], str) and len(entry["hmac"]) == 64
    assert ej.verify_entry(entry) is True


def test_known_entry_also_signed(tmp_path):
    j, p = _paths(tmp_path)
    ej.record_error("UnicodeDecodeError: 'charmap' codec can't decode", journal_path=j, proposals_path=p, now_ts=NOW)
    entry = json.loads(j.read_text(encoding="utf-8").splitlines()[0])
    assert ej.verify_entry(entry) is True  # les entrées 'known' aussi sont signées


def test_tampered_entry_fails_verify(tmp_path):
    j, p = _paths(tmp_path)
    ej.record_error("failure to tamper beta", journal_path=j, proposals_path=p, now_ts=NOW)
    entry = json.loads(j.read_text(encoding="utf-8").splitlines()[0])
    entry["excerpt"] = "ALTERED"
    assert ej.verify_entry(entry) is False


def test_verify_journal_all_valid(tmp_path):
    j, p = _paths(tmp_path)
    ej.record_error("alpha err one", journal_path=j, proposals_path=p, now_ts=NOW)
    ej.record_error("beta err two", journal_path=j, proposals_path=p, now_ts=NOW + 1)
    valid, invalid, bad = ej.verify_journal(j)
    assert (valid, invalid, bad) == (2, 0, [])


def test_verify_journal_detects_tamper_per_line(tmp_path):
    j, p = _paths(tmp_path)
    ej.record_error("good signed line", journal_path=j, proposals_path=p, now_ts=NOW)
    with j.open("a", encoding="utf-8", newline="") as fh:
        fh.write(json.dumps({"ts": 1, "signature": "x", "excerpt": "forged", "hmac": "deadbeef"}) + "\n")
    valid, invalid, bad = ej.verify_journal(j)
    assert valid == 1 and invalid == 1 and bad == [2]  # par-ligne, pas de hard-reject global


# ── escalade sur erreur récurrente (>= seuil) — RED TEAM C1 : jamais d'add ledger ─

def test_third_occurrence_escalates(tmp_path):
    j, p = _paths(tmp_path)
    msg = "Recurring widget meltdown during phase 7 sync"
    o1 = ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW)
    o2 = ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW + 1)
    o3 = ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW + 2)
    assert o1.kind == "proposed"
    assert o2.kind == "duplicate"            # 2e : sous le seuil (invariant IMP-202 préservé)
    assert o3.kind == "escalated"            # 3e : escalade
    esc = o3.proposal
    assert esc["escalated"] is True and esc["occurrences"] == 3
    assert esc["lane"] == "AUDIT_REQUIRED"   # jamais SAFE_AUTO -> non auto-pickable
    assert esc["status"] == "PROPOSED" and esc["closed"] is False
    # proposals : 1 PROPOSED initial + 1 escalade = 2 lignes
    lines = [json.loads(x) for x in p.read_text(encoding="utf-8").splitlines() if x.strip()]
    assert len(lines) == 2


def test_escalation_is_idempotent(tmp_path):
    j, p = _paths(tmp_path)
    msg = "Idempotent recurring fault zeta"
    for k in range(5):  # 5 occurrences
        out = ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW + k)
    # une seule escalade malgré 5 passages
    escs = [json.loads(x) for x in p.read_text(encoding="utf-8").splitlines()
            if x.strip() and json.loads(x).get("escalated") is True]
    assert len(escs) == 1
    assert out.kind == "duplicate"  # 5e occurrence : déjà escaladé -> duplicate


def test_escalation_never_mutates_ledger(tmp_path):
    ledger = _ROOT / "lab" / "chains" / "IMPROVEMENT_LEDGER.yaml"
    before = ledger.read_bytes()
    j, p = _paths(tmp_path)
    msg = "Recurring fault that must NOT touch the real ledger"
    for k in range(4):
        ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW + k)
    assert ledger.read_bytes() == before  # RED TEAM C1 : aucune mutation du ledger réel


# ── scrub des secrets (RED TEAM M1) ─────────────────────────────────────────────

def test_secret_env_scrubbed_from_journal(tmp_path, monkeypatch):
    monkeypatch.setenv("STUDIO_TEST_TOKEN", "supersecretvalue123")
    j, p = _paths(tmp_path)
    ej.record_error("crash dumped STUDIO_TEST_TOKEN=supersecretvalue123 in trace",
                    journal_path=j, proposals_path=p, now_ts=NOW)
    raw = j.read_text(encoding="utf-8")
    assert "supersecretvalue123" not in raw
    assert "[SECRET]" in raw


# ── câblage live best-effort (kaizen_autoloop.journal_error) ────────────────────

def test_journal_error_wiring_best_effort(tmp_path, monkeypatch):
    import kaizen_autoloop as ka
    j, p = _paths(tmp_path)
    monkeypatch.setattr(ka, "ERROR_JOURNAL_PATH", j)
    monkeypatch.setattr(ka, "ERROR_PROPOSALS_PATH", p)
    ka.journal_error("autoloop oracle red sample", context="oracle_fail:IMP-999")
    entry = json.loads(j.read_text(encoding="utf-8").splitlines()[0])
    assert ej.verify_entry(entry) and "IMP-999" in entry["excerpt"]


def test_journal_error_never_raises(tmp_path, monkeypatch):
    import kaizen_autoloop as ka
    monkeypatch.setattr(ka, "ERROR_JOURNAL_PATH", tmp_path / "j.jsonl")
    monkeypatch.setattr(ka, "ERROR_PROPOSALS_PATH", tmp_path / "p.jsonl")

    def boom(*a, **k):
        raise RuntimeError("record_error exploded")

    monkeypatch.setattr(ka._ej, "record_error", boom)
    # ne doit PAS lever (best-effort LOUD) — sinon masquerait l'erreur d'origine
    ka.journal_error("anything", context="exception:IMP-1")


def test_journal_error_reentrancy_guard(tmp_path, monkeypatch):
    import kaizen_autoloop as ka
    calls = {"n": 0}

    def recursive(*a, **k):
        calls["n"] += 1
        ka.journal_error("nested", context="reentry")  # tente une réentrée
        from collections import namedtuple
        O = namedtuple("O", "kind proposal")
        return O("known", None)

    monkeypatch.setattr(ka, "ERROR_JOURNAL_PATH", tmp_path / "j.jsonl")
    monkeypatch.setattr(ka, "ERROR_PROPOSALS_PATH", tmp_path / "p.jsonl")
    monkeypatch.setattr(ka._ej, "record_error", recursive)
    ka.journal_error("outer", context="top")
    assert calls["n"] == 1  # la réentrée est court-circuitée (pas de récursion)


# ── régression : invariant 2-occurrences IMP-202 préservé ───────────────────────

def test_two_occurrences_still_duplicate(tmp_path):
    j, p = _paths(tmp_path)
    msg = "Two-occurrence dedup invariant check"
    o1 = ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW)
    o2 = ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW + 1)
    assert o1.kind == "proposed" and o2.kind == "duplicate"
    lines = [x for x in p.read_text(encoding="utf-8").splitlines() if x.strip()]
    assert len(lines) == 1  # toujours 1 proposition à 2 occurrences (pas d'escalade prématurée)
