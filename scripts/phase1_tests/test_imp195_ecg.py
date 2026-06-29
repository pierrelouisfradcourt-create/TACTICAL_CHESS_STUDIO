#!/usr/bin/env python3
"""IMP-195 — ECG state machine 7 états, transitions gardées (AUDIT_REQUIRED, non fermé).

Acceptance: schema JSON + pytest transitions (PROPOSED->...->CLOSED).
Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase1_tests/test_imp195_ecg.py -v
Tout opère sur des données / ledgers temporaires (jamais le vrai ledger).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
sys.path.insert(0, str(_ROOT / "lab" / "chains"))
import ecg  # noqa: E402

_SCHEMA = json.loads((_ROOT / "schemas" / "ecg.schema.json").read_text(encoding="utf-8"))


# ── transitions légales : chaîne forward complète ─────────────────────────────

def test_full_forward_chain_legal():
    chain = ["PROPOSED", "PLANNED", "TEST_SPECCED", "IN_PROGRESS",
             "ORACLE_PENDING", "VERDICT_SIGNED", "CLOSED"]
    for src, dst in zip(chain, chain[1:]):
        assert ecg.can_transition(src, dst).allowed, f"{src}->{dst} devrait être légal"


def test_rework_edges_legal():
    assert ecg.can_transition("ORACLE_PENDING", "IN_PROGRESS").allowed   # oracle rouge
    assert ecg.can_transition("VERDICT_SIGNED", "IN_PROGRESS").allowed   # gate reject


# ── transitions illégales : rejet dur ─────────────────────────────────────────

@pytest.mark.parametrize("src,dst", [
    ("PROPOSED", "CLOSED"),        # saut total
    ("PROPOSED", "IN_PROGRESS"),   # saut d'étapes
    ("PLANNED", "PROPOSED"),       # marche arrière non prévue
    ("IN_PROGRESS", "CLOSED"),     # contourne l'oracle
    ("ORACLE_PENDING", "CLOSED"),  # contourne VERDICT_SIGNED
    ("CLOSED", "PROPOSED"),        # terminal -> rien
    ("CLOSED", "IN_PROGRESS"),
])
def test_illegal_transitions_rejected(src, dst):
    d = ecg.can_transition(src, dst)
    assert not d.allowed
    assert "interdite" in d.reason or "inconnu" in d.reason


def test_oracle_never_skippable():
    # Seule arête entrante de CLOSED = VERDICT_SIGNED -> CLOSED.
    into_closed = [s for s, dsts in ecg.TRANSITIONS.items() if "CLOSED" in dsts]
    assert into_closed == ["VERDICT_SIGNED"]


def test_unknown_states_rejected():
    assert not ecg.can_transition("WAT", "CLOSED").allowed
    assert not ecg.can_transition("PROPOSED", "WAT").allowed
    assert not ecg.can_transition(ecg.UNKNOWN, "PROPOSED").allowed


# ── current_state : mapping legacy + fail-closed (RT-195-1) ───────────────────

@pytest.mark.parametrize("status,expected", [
    ("OPEN", "PROPOSED"),
    ("CLOSED", "CLOSED"),
    ("IN_PROGRESS", "IN_PROGRESS"),
    ("FAIL", "IN_PROGRESS"),     # IMP-175 réel — ne doit PAS crasher
    ("DONE", "CLOSED"),
    ("BLOCKED", "PROPOSED"),
    ("DEFERRED", "PROPOSED"),
])
def test_current_state_legacy_mapping(status, expected):
    assert ecg.current_state({"status": status}) == expected


def test_current_state_unknown_status_failclosed():
    assert ecg.current_state({"status": "WEIRD"}) == ecg.UNKNOWN
    assert ecg.current_state({}) == ecg.UNKNOWN  # pas de status du tout


def test_current_state_explicit_field():
    assert ecg.current_state({"status": "OPEN", "ecg_state": "IN_PROGRESS"}) == "IN_PROGRESS"
    # ecg_state invalide -> UNKNOWN (fail-closed), n'hérite pas du status
    assert ecg.current_state({"status": "OPEN", "ecg_state": "BOGUS"}) == ecg.UNKNOWN


# ── parse_notes_meta : oracle_type + blocked_by ancré IMP-\d+ (RT-195-4) ──────

def test_parse_notes_blocked_none():
    meta = ecg.parse_notes_meta("x | oracle_type=code | blocked_by=none | ex-label=IMP-193")
    assert meta["oracle_type"] == "code"
    assert meta["blocked_by"] == []          # 'none' -> [], jamais ['none']


def test_parse_notes_blocked_multi():
    meta = ecg.parse_notes_meta("oracle_type=structure | blocked_by=IMP-192,IMP-193,IMP-194 | ex")
    assert meta["blocked_by"] == ["IMP-192", "IMP-193", "IMP-194"]
    assert meta["oracle_type"] == "structure"


def test_parse_notes_humangate_and_no_blocked():
    meta = ecg.parse_notes_meta("oracle_type=humangate | ex-label=IMP-201")
    assert meta["oracle_type"] == "humangate"
    assert "blocked_by" not in meta          # pas de segment blocked_by=


def test_parse_notes_empty():
    assert ecg.parse_notes_meta("") == {}
    assert ecg.parse_notes_meta(None) == {}


# ── materialize_entry : additif, anti-clobber, idempotent ─────────────────────

def test_materialize_adds_oracle_type():
    imp = {"id": "IMP-X", "status": "OPEN", "blocked_by": [],
           "notes": "oracle_type=code | blocked_by=none"}
    out = ecg.materialize_entry(imp)
    assert out["oracle_type"] == "code"
    assert out["blocked_by"] == []           # none -> reste vide


def test_materialize_populates_blocked_by():
    imp = {"id": "IMP-Y", "status": "OPEN", "blocked_by": [],
           "notes": "oracle_type=code | blocked_by=IMP-001,IMP-002"}
    out = ecg.materialize_entry(imp)
    assert out["blocked_by"] == ["IMP-001", "IMP-002"]


def test_materialize_never_clobbers_existing_blocked_by():
    imp = {"id": "IMP-Z", "status": "OPEN", "blocked_by": ["IMP-999"],
           "notes": "blocked_by=IMP-001"}
    out = ecg.materialize_entry(imp)
    assert out["blocked_by"] == ["IMP-999"]   # champ existant préservé


def test_materialize_idempotent():
    imp = {"id": "IMP-I", "status": "OPEN", "blocked_by": [],
           "notes": "oracle_type=code | blocked_by=IMP-001"}
    once = ecg.materialize_entry(imp)
    twice = ecg.materialize_entry(once)
    assert once == twice


def test_materialize_no_notes_meta_no_change():
    imp = {"id": "IMP-N", "status": "OPEN", "blocked_by": [], "notes": "rien d'utile"}
    assert ecg.materialize_entry(imp) == imp


# ── schema JSON (acceptance) ──────────────────────────────────────────────────

def test_schema_valid_fragments():
    import jsonschema
    for frag in [
        {"ecg_state": "IN_PROGRESS", "oracle_type": "code", "blocked_by": ["IMP-192"]},
        {"ecg_state": "CLOSED"},
        {},  # tout optionnel (additif)
    ]:
        jsonschema.validate(frag, _SCHEMA)


def test_schema_rejects_bad_state():
    import jsonschema
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate({"ecg_state": "BOGUS"}, _SCHEMA)


def test_schema_rejects_bad_oracle_type():
    import jsonschema
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate({"oracle_type": "magic"}, _SCHEMA)


def test_schema_transition_record():
    import jsonschema
    tdef = {"$schema": _SCHEMA["$schema"], **_SCHEMA["definitions"]["transition"],
            "definitions": _SCHEMA["definitions"]}
    jsonschema.validate(
        {"imp_id": "IMP-195", "from": "ORACLE_PENDING", "to": "VERDICT_SIGNED",
         "ts": "2026-06-29T00:00:00Z", "actor": "reviewer"}, tdef)
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate({"imp_id": "IMP-195", "from": "X", "to": "CLOSED",
                             "ts": "t", "actor": "a"}, tdef)


# ── migration round-trip (RT-195-7 : reader autopilot tolère) ─────────────────

def test_migration_only_touches_meta_and_reader_compatible(tmp_path):
    import yaml
    import kaizen_loop as kl
    p = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    ledger = {"improvements": [
        {"id": "IMP-001", "title": "legacy done", "status": "CLOSED",
         "blocked_by": [], "notes": "rien"},
        {"id": "IMP-200", "title": "orch", "status": "OPEN", "lane": "SAFE_AUTO",
         "blocked_by": [], "notes": "oracle_type=code | blocked_by=IMP-199 | ex"},
    ]}
    p.write_text(yaml.dump(ledger, default_flow_style=False, sort_keys=False), encoding="utf-8")

    data = kl.load_ledger(p)
    migrated, changed = ecg.materialize_ledger(data)
    assert changed == ["IMP-200"]            # IMP-001 intact
    kl.save_ledger(p, migrated)

    text = p.read_text(encoding="utf-8")
    # reader autopilot : blocked_by populé doit matcher la regex bloc-liste
    block = re.split(r'\n- id:\s*', "\n" + text)[-1]
    m_blocked = re.search(r'blocked_by:\n((?:\s*- .+\n?)*)', block)
    assert m_blocked is not None
    ids = [re.sub(r'^\s*-\s*', '', ln).strip()
           for ln in m_blocked.group(1).strip().split("\n") if ln.strip()]
    assert ids == ["IMP-199"]
    # status toujours lisible (get_ledger_counts compte ce substring)
    assert "status: OPEN" in text and "status: CLOSED" in text
    # oracle_type matérialisé
    assert "oracle_type: code" in text
