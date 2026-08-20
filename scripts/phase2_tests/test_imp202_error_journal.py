#!/usr/bin/env python3
"""IMP-202 — error_journal pattern matcher + IMP auto-propose (SAFE_AUTO, oracle code).

Acceptance: pytest — erreur inconnue → IMP créé ; pattern connu → fix rappelé.
Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp202_error_journal.py -v

Tout offline & déterministe : now_ts fixe, chemins tmp_path, governor monkeypatché si besoin.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
import error_journal as ej  # noqa: E402
import governor  # noqa: E402

NOW = 1_700_000_000


def _paths(tmp_path):
    return tmp_path / "journal.jsonl", tmp_path / "proposals.jsonl"


# ── acceptance : pattern connu → fix rappelé ──────────────────────────────────

def test_known_pattern_recalls_fix(tmp_path):
    j, p = _paths(tmp_path)
    out = ej.record_error("UnicodeDecodeError: 'charmap' codec can't decode byte",
                          journal_path=j, proposals_path=p, now_ts=NOW)
    assert out.kind == "known"
    assert out.match.pattern_id == "missing-utf8-encoding"
    assert "utf-8" in out.match.fix
    assert not p.exists()  # aucune proposition pour un pattern connu


def test_known_pattern_qwen(tmp_path):
    j, p = _paths(tmp_path)
    out = ej.record_error("Qwen3.6 returned empty json content in thinking mode",
                          journal_path=j, proposals_path=p, now_ts=NOW)
    assert out.kind == "known" and out.match.pattern_id == "qwen36-json-empty"


# ── acceptance : erreur inconnue → IMP proposé (PROPOSED, jamais auto-close) ───

def test_unknown_error_creates_proposal(tmp_path):
    j, p = _paths(tmp_path)
    out = ej.record_error("ZorbleQuux exploded at frobnicator stage 42 unexpectedly",
                          journal_path=j, proposals_path=p, now_ts=NOW)
    assert out.kind == "proposed"
    assert out.proposal["status"] == "PROPOSED"
    assert out.proposal["closed"] is False
    assert out.proposal["ecg_state"] == "PROPOSED"
    assert out.proposal["proposal_id"].startswith("PROP-")
    # persisté sur disque
    lines = p.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 1
    assert json.loads(lines[0])["status"] == "PROPOSED"


def test_proposal_never_closed_invariant():
    prop = ej.build_proposal("totally novel failure mode xyzzy", NOW)
    assert prop["status"] == "PROPOSED" and prop["closed"] is False
    # le module n'expose aucune fonction de close
    assert not any(name for name in dir(ej) if "close" in name.lower())


# ── RT-202-3 : dédup (2× inconnue → 1 proposition) ────────────────────────────

def test_unknown_error_deduplicated(tmp_path):
    j, p = _paths(tmp_path)
    msg = "Plonkler subsystem returned code 9981 during handshake"
    o1 = ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW)
    o2 = ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW + 5)
    assert o1.kind == "proposed"
    assert o2.kind == "duplicate"
    assert len(p.read_text(encoding="utf-8").splitlines()) == 1  # une seule proposition


def test_signature_generic_over_numbers():
    # mêmes erreurs à nombres près -> même signature (dédup robuste)
    a = ej.signature("timeout after 1234 ms on socket 0xABCDEF01")
    b = ej.signature("timeout after 5678 ms on socket 0x12345678")
    assert a == b


# ── RT-202-2 : écriture gardée par governor ───────────────────────────────────

def test_governor_block_writes_nothing(tmp_path, monkeypatch):
    j, p = _paths(tmp_path)
    monkeypatch.setattr(ej.governor, "check",
                        lambda action: governor.Decision(governor.BLOCK, "test-block"))
    with pytest.raises(ej.JournalWriteBlocked):
        ej.record_error("anything at all", journal_path=j, proposals_path=p, now_ts=NOW)
    assert not j.exists() and not p.exists()  # side-effect nul


def test_missions_not_forbidden():
    assert ej.JOURNAL_MISSION not in governor.FORBIDDEN_MISSIONS
    assert ej.PROPOSE_MISSION not in governor.FORBIDDEN_MISSIONS


# ── RT-202-6 : journal append-only ────────────────────────────────────────────

def test_journal_is_append_only(tmp_path):
    j, p = _paths(tmp_path)
    ej.record_error("first novel error alpha", journal_path=j, proposals_path=p, now_ts=NOW)
    ej.record_error("second novel error beta", journal_path=j, proposals_path=p, now_ts=NOW + 1)
    lines = j.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    assert json.loads(lines[0])["ts"] == NOW  # la 1re ligne préservée


# ── RT-202-7 : input invalide → erreur propre ─────────────────────────────────

def test_empty_input_rejected(tmp_path):
    j, p = _paths(tmp_path)
    with pytest.raises(ej.ErrorJournalError):
        ej.record_error("   ", journal_path=j, proposals_path=p, now_ts=NOW)


def test_non_string_signature_rejected():
    with pytest.raises(ej.ErrorJournalError):
        ej.signature(12345)  # type: ignore[arg-type]


# ── déterminisme du matcher ───────────────────────────────────────────────────

def test_classify_deterministic_order():
    msg = "called `Result::unwrap()` on an `Err` value"
    m1 = ej.classify(msg)
    m2 = ej.classify(msg)
    assert m1 == m2 and m1.pattern_id == "rust-unwrap-no-safety"


def test_no_ledger_mutation(tmp_path):
    # le module ne touche jamais IMPROVEMENT_LEDGER.yaml
    ledger = _ROOT / "lab" / "chains" / "IMPROVEMENT_LEDGER.yaml"
    before = ledger.read_bytes()
    j, p = _paths(tmp_path)
    ej.record_error("yet another unseen failure gamma", journal_path=j, proposals_path=p, now_ts=NOW)
    assert ledger.read_bytes() == before  # ledger réel intact


# ── RT-202-1 (CRITIQUE) : pas de faux positif qui supprimerait une proposition ─

def test_incidental_substring_not_misclassified():
    # erreurs NOUVELLES contenant un sous-mot connu, mais sans le discriminant -> doivent proposer
    assert ej.classify("Cache returned empty content for key foo") is None
    assert ej.classify("JS bug: cannot unwrap() a promise in the worker") is None
    assert ej.classify("access denied to the kitchen pantry resource") is None


def test_incidental_substring_creates_proposal(tmp_path):
    j, p = _paths(tmp_path)
    out = ej.record_error("Cache returned empty content for key foo",
                          journal_path=j, proposals_path=p, now_ts=NOW)
    assert out.kind == "proposed"  # nouvelle classe d'erreur -> proposée, PAS suppated


def test_anchored_known_still_matches():
    # les vraies erreurs de la classe matchent toujours (pas de faux négatif sur le cœur)
    assert ej.classify("called `Result::unwrap()` on an `Err`").pattern_id == "rust-unwrap-no-safety"
    assert ej.classify("Qwen3.6 thinking mode left empty content").pattern_id == "qwen36-json-empty"


# ── RT-202-3 : ordering — propose-BLOCK ne laisse AUCUN effet de bord ──────────

def test_propose_block_leaves_no_journal(tmp_path, monkeypatch):
    j, p = _paths(tmp_path)

    def fake_check(action):
        if action["mission"] == ej.PROPOSE_MISSION:
            return governor.Decision(governor.BLOCK, "no-propose")
        return governor.Decision(governor.ALLOW, "ok")

    monkeypatch.setattr(ej.governor, "check", fake_check)
    with pytest.raises(ej.ProposeBlocked):
        ej.record_error("a brand new unseen failure delta", journal_path=j, proposals_path=p, now_ts=NOW)
    assert not j.exists() and not p.exists()  # side-effect nul (journal NON écrit non plus)


def test_journal_only_block(tmp_path, monkeypatch):
    j, p = _paths(tmp_path)

    def fake_check(action):
        if action["mission"] == ej.JOURNAL_MISSION:
            return governor.Decision(governor.BLOCK, "no-journal")
        return governor.Decision(governor.ALLOW, "ok")

    monkeypatch.setattr(ej.governor, "check", fake_check)
    with pytest.raises(ej.JournalWriteBlocked):
        ej.record_error("known UnicodeDecodeError occurred", journal_path=j, proposals_path=p, now_ts=NOW)
    assert not j.exists()


# ── RT-202-6 : proposition non auto-sélectionnable (lane AUDIT_REQUIRED) ───────

def test_proposal_lane_not_auto_pickable():
    prop = ej.build_proposal("an entirely novel failure epsilon", NOW)
    assert prop["lane"] == "AUDIT_REQUIRED"  # autoloop ne prend que SAFE_AUTO -> pas d'auto-pick


# ── RT-202-7 : ligne corrompue dans proposals -> dédup robuste, pas de doublon ─

def test_corrupted_proposal_line_handled(tmp_path):
    j, p = _paths(tmp_path)
    msg = "Wibble subsystem fault during sync"
    ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW)        # 1re proposition
    with p.open("a", encoding="utf-8") as fh:
        fh.write("{ this is not valid json\n")                                 # corruption injectée
    out = ej.record_error(msg, journal_path=j, proposals_path=p, now_ts=NOW + 1)
    assert out.kind == "duplicate"  # dédup tient malgré la ligne corrompue
    # une seule proposition valide subsiste
    valid = [ln for ln in p.read_text(encoding="utf-8").splitlines()
             if ln.strip().startswith("{") and "error_signature" in ln]
    assert len(valid) == 1


# ── RT-202-8 : append-only byte-level (newline verbatim) ──────────────────────

def test_journal_newline_is_lf(tmp_path):
    j, p = _paths(tmp_path)
    ej.record_error("novel failure zeta", journal_path=j, proposals_path=p, now_ts=NOW)
    raw = j.read_bytes()
    assert b"\r\n" not in raw and raw.endswith(b"\n")  # LF verbatim, pas de CRLF Windows


# ── RT-202-9 : chemins absolus variés rappelés ────────────────────────────────

def test_absolute_path_variants_recalled():
    assert ej.classify("FileNotFound: /home/User1/data.txt").pattern_id == "absolute-path"
    assert ej.classify("error at /Users/bob/project/x.py").pattern_id == "absolute-path"
    assert ej.classify(r"C:\Users\Studio\file.txt missing").pattern_id == "absolute-path"
