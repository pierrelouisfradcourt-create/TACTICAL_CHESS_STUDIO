#!/usr/bin/env python3
"""test_council_cockpit.py — etape 7 : vue read-only Council->Factory (anti-mensonge).

Prouve : la vue lit le ledger et affiche le DECOMPTE REEL des IMP source=council, l'etat du
dernier run council si artefact, RIEN d'invente. 0 aujourd'hui -> correct ; passe a 1 des qu'un
vrai item source=council apparait au ledger, sans retoucher la vue.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parents[1]
sys.path.insert(0, str(REPO / "scripts"))

cockpit = pytest.importorskip("cockpit_server")  # fastapi/uvicorn dans .venv312


def test_empty_ledger_shows_zero(monkeypatch):
    monkeypatch.setattr(cockpit, "load_ledger", lambda: {"available": True, "improvements": []})
    monkeypatch.setattr(cockpit, "council_latest", lambda: {"available": False, "error": "aucun"})
    flow = cockpit.council_factory_flow()
    assert flow["council_item_count"] == 0
    assert flow["council_items"] == []
    assert flow["last_council_run"]["available"] is False


def test_counts_only_council_source(monkeypatch):
    ledger = {"available": True, "improvements": [
        {"id": "IMP-001", "title": "a", "status": "OPEN", "source": "council"},
        {"id": "IMP-002", "title": "b", "status": "OPEN", "source": "manual"},
        {"id": "IMP-003", "title": "c", "status": "OPEN", "source": "council"},
        {"id": "IMP-004", "title": "d", "status": "OPEN", "source": "error_journal"},
    ]}
    monkeypatch.setattr(cockpit, "load_ledger", lambda: ledger)
    monkeypatch.setattr(cockpit, "council_latest", lambda: {"available": False})
    flow = cockpit.council_factory_flow()
    assert flow["council_item_count"] == 2
    assert {i["id"] for i in flow["council_items"]} == {"IMP-001", "IMP-003"}


def test_zero_to_one_transition(monkeypatch):
    # avant : aucun item council. apres : un item source=council -> le decompte passe a 1, sans
    # retoucher la vue (meme fonction, ledger different).
    monkeypatch.setattr(cockpit, "council_latest", lambda: {"available": False})
    monkeypatch.setattr(cockpit, "load_ledger", lambda: {"available": True, "improvements": []})
    assert cockpit.council_factory_flow()["council_item_count"] == 0
    monkeypatch.setattr(cockpit, "load_ledger", lambda: {"available": True, "improvements": [
        {"id": "IMP-999", "title": "premier vrai contrat", "status": "OPEN", "source": "council"}]})
    assert cockpit.council_factory_flow()["council_item_count"] == 1


def test_reflects_last_run_artifact(monkeypatch):
    monkeypatch.setattr(cockpit, "load_ledger", lambda: {"available": True, "improvements": []})
    monkeypatch.setattr(cockpit, "council_latest", lambda: {
        "available": True, "consensus_md": "## CONSENSUS ...", "source_file": "run.json", "result": {}})
    flow = cockpit.council_factory_flow()
    assert flow["last_council_run"]["available"] is True
    assert flow["last_council_run"]["source_file"] == "run.json"
    assert flow["last_council_run"]["has_consensus"] is True


def test_no_invented_data_ledger_unavailable(monkeypatch):
    monkeypatch.setattr(cockpit, "load_ledger",
                        lambda: {"available": False, "error": "ledger absent"})
    monkeypatch.setattr(cockpit, "council_latest", lambda: {"available": False})
    flow = cockpit.council_factory_flow()
    assert flow["available"] is False
    assert flow["ledger_error"] == "ledger absent"
    assert flow["council_item_count"] == 0            # jamais de donnee inventee


def test_real_canonical_ledger_no_crash():
    # lecture REELLE du ledger canonique (read-only) : ne crashe pas, decompte = entier (0 aujourd'hui).
    flow = cockpit.council_factory_flow()
    assert isinstance(flow["council_item_count"], int)
    assert flow["council_item_count"] >= 0
    assert isinstance(flow["council_items"], list)


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
