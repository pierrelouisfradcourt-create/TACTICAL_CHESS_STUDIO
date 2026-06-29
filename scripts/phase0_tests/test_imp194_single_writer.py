#!/usr/bin/env python3
"""IMP-194 — single-writer gardé du ledger (AUDIT_REQUIRED, non fermé).

Acceptance ledger: pytest: ecriture concurrente -> exception.

Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase0_tests/test_imp194_single_writer.py -v
Tous les tests opèrent sur un ledger temporaire (jamais le vrai IMPROVEMENT_LEDGER.yaml).
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
sys.path.insert(0, str(_ROOT / "lab" / "chains"))
import ledger_writer as lw  # noqa: E402


# ── guarded_write : gouvernance ───────────────────────────────────────────────

def test_normal_write(tmp_path):
    p = tmp_path / "L.yaml"
    lw.guarded_write(p, "improvements: []\n")
    assert p.read_text(encoding="utf-8").strip() == "improvements: []"
    assert not (tmp_path / "L.yaml.writelock").exists()  # writelock nettoyé


def test_forbidden_mission_raises(tmp_path):
    p = tmp_path / "L.yaml"
    with pytest.raises(lw.GovernanceError):
        lw.guarded_write(p, "x", action={"lane": "SAFE_AUTO", "mission": "dataset_reset"})
    assert not p.exists()  # rien écrit


def test_unknown_lane_raises(tmp_path):
    p = tmp_path / "L.yaml"
    with pytest.raises(lw.GovernanceError):
        lw.guarded_write(p, "x", action={"lane": "WAT", "mission": "ledger_write"})


# ── guarded_write : concurrence ───────────────────────────────────────────────

def test_held_writelock_raises(tmp_path):
    """Un writelock tenu par un process VIVANT -> ConcurrentWriteError."""
    p = tmp_path / "L.yaml"
    wl = tmp_path / "L.yaml.writelock"
    wl.write_text(f"pid={os.getpid()} ts={time.time()}\n", encoding="utf-8")  # vivant + frais
    with pytest.raises(lw.ConcurrentWriteError):
        lw.guarded_write(p, "data")
    assert wl.exists()  # on n'a pas touché au writelock d'autrui


def test_fingerprint_mismatch_raises(tmp_path):
    p = tmp_path / "L.yaml"
    p.write_text("improvements: []\n", encoding="utf-8")
    fp = lw.fingerprint(p)
    p.write_text("improvements: [changed]\n", encoding="utf-8")  # bouge sous le writer
    with pytest.raises(lw.ConcurrentWriteError):
        lw.guarded_write(p, "improvements: [new]\n", expected_fingerprint=fp)


def test_matching_fingerprint_writes(tmp_path):
    p = tmp_path / "L.yaml"
    p.write_text("improvements: []\n", encoding="utf-8")
    fp = lw.fingerprint(p)
    lw.guarded_write(p, "improvements: [ok]\n", expected_fingerprint=fp)
    assert "ok" in p.read_text(encoding="utf-8")


# ── orphan writelock recovery (RT-194-4) ──────────────────────────────────────

def test_orphan_writelock_recovered(tmp_path):
    """Writelock laissé par un PID mort -> recyclé, l'écriture passe."""
    p = tmp_path / "L.yaml"
    wl = tmp_path / "L.yaml.writelock"
    wl.write_text(f"pid={2**31 - 1} ts={time.time()}\n", encoding="utf-8")  # pid mort
    lw.guarded_write(p, "recovered\n")
    assert p.read_text(encoding="utf-8").strip() == "recovered"


def test_old_writelock_recovered(tmp_path):
    p = tmp_path / "L.yaml"
    wl = tmp_path / "L.yaml.writelock"
    old = time.time() - (lw.WRITELOCK_TTL_SECONDS + 30)
    wl.write_text(f"pid={os.getpid()} ts={old}\n", encoding="utf-8")  # vivant mais trop vieux
    lw.guarded_write(p, "recovered\n")
    assert p.read_text(encoding="utf-8").strip() == "recovered"


# ── byte-for-byte idempotence (RT-194-6) ──────────────────────────────────────

def test_byte_for_byte_idempotent(tmp_path):
    p = tmp_path / "L.yaml"
    content = "improvements:\n- id: IMP-001\n  status: OPEN\n"
    lw.guarded_write(p, content)
    b1 = p.read_bytes()
    lw.guarded_write(p, content, expected_fingerprint=lw.fingerprint(p))
    b2 = p.read_bytes()
    assert b1 == b2


# ── RT-194-1 : la garantie est PARTIELLE (autopilot bypasse) ──────────────────

def test_documents_autopilot_bypass_hole(tmp_path):
    """Documente le trou : un write_text direct (façon autopilot.py:1684) IGNORE le
    writelock. C'est exactement la décision d'architecture laissée à la gate Pierre."""
    p = tmp_path / "L.yaml"
    wl = tmp_path / "L.yaml.writelock"
    wl.write_text(f"pid={os.getpid()} ts={time.time()}\n", encoding="utf-8")  # verrou tenu
    # Un écrivain non gardé écrit quand même -> lost update non empêché.
    p.write_text("autopilot wrote through the lock\n", encoding="utf-8")
    assert p.exists()  # le bypass réussit : garantie partielle, pas totale


# ── intégration kaizen_loop.save_ledger ───────────────────────────────────────

def test_kaizen_loop_stale_fingerprint_raises(tmp_path):
    import kaizen_loop as kl
    p = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    p.write_text("improvements: []\n", encoding="utf-8")
    data = kl.load_ledger(p)              # capture l'empreinte dans le cache
    p.write_text("improvements: []\n# muté par un tiers\n", encoding="utf-8")
    with pytest.raises(kl.LedgerWriteError):
        kl.save_ledger(p, data)           # empreinte cache != fichier courant


def test_kaizen_loop_round_trip(tmp_path):
    import yaml
    import kaizen_loop as kl
    p = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    p.write_text(yaml.dump({"improvements": [{"id": "IMP-001", "status": "OPEN"}]}), encoding="utf-8")
    data = kl.load_ledger(p)
    data["improvements"][0]["status"] = "CLOSED"
    kl.save_ledger(p, data)
    reloaded = kl.load_ledger(p)
    assert reloaded["improvements"][0]["status"] == "CLOSED"
