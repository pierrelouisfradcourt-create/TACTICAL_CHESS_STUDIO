#!/usr/bin/env python3
"""test_council_corpus.py — etape 6a : rejoue le corpus Qwen REEL fige, hors ligne.

Les fixtures sous fixtures/ sont des sorties council REELLES gelees (LM Studio up au moment du gel).
Elles rendent la validation + le round-trip REPRODUCTIBLES quand LM Studio est down, et servent de
BASELINE de calibration future (si le comportement du garde/normalisation change, ces fixtures le revelent).

Regenerer / ajouter un echantillon : voir scripts/council_factory_oracle.py --help (ou le script de gel).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
import yaml

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parents[1]
for p in (REPO / "scripts", REPO / "governance", REPO / "lab" / "chains"):
    sys.path.insert(0, str(p))

import council_contract as cc  # noqa: E402
import council_router as cr  # noqa: E402

FIXTURES = _HERE / "fixtures"
_REAL_CONTRACTS = sorted(FIXTURES.glob("council_contract_qwen_real_*.json"))


def test_corpus_present():
    assert _REAL_CONTRACTS, "au moins une fixture de contrat Qwen reel doit etre gelee (etape 6a)"


@pytest.mark.parametrize("path", _REAL_CONTRACTS, ids=lambda p: p.name)
def test_frozen_real_contract_validates(path, tmp_path):
    contract = json.loads(path.read_text(encoding="utf-8"))
    # reproductible offline : la fixture reelle passe le validateur v1 (structure + write-path).
    cc.validate_contract(contract, journal_path=tmp_path / "j", proposals_path=tmp_path / "p")


@pytest.mark.parametrize("path", _REAL_CONTRACTS, ids=lambda p: p.name)
def test_frozen_real_contract_round_trips_to_ledger(path, tmp_path):
    contract = json.loads(path.read_text(encoding="utf-8"))
    ledger = tmp_path / "ledger.yaml"
    ledger.write_text(yaml.dump({"improvements": []}, allow_unicode=True), encoding="utf-8")
    result, new_ids = cr.apply_contract(contract, ledger_path=ledger)
    imps = yaml.safe_load(ledger.read_text(encoding="utf-8"))["improvements"]
    # round-trip exact : autant d'IMP crees que d'items acceptes, tous council/AUDIT_REQUIRED/OPEN.
    assert len(new_ids) == len(result.accepted) == len(imps)
    for imp in imps:
        assert imp["lane"] == "AUDIT_REQUIRED"
        assert imp["source"] == "council"
        assert imp["status"] == "OPEN"
    # aucun titre dict-repr n'a survecu (normalisation prouvee sur donnee reelle).
    assert all("{'description'" not in imp["title"] for imp in imps)


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
