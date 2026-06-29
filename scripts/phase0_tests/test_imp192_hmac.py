#!/usr/bin/env python3
"""IMP-192 — HMAC compare_digest enforcement + hard reject (exception).

Acceptance ledger: forge HMAC invalide -> exception (rejet dur signature invalide).

Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase0_tests/test_imp192_hmac.py -v
Tous les tests opèrent sur un events.jsonl temporaire (jamais le vrai lab/events.jsonl).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pytest

# scripts/ sur le path pour importer le module cible.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ingest_event as ie  # noqa: E402


def _signed_line(entry: dict[str, Any]) -> str:
    """Reproduit append_event_log : signe `entry` et renvoie la ligne JSON complète."""
    payload = json.dumps(entry, separators=(",", ":"), sort_keys=True)
    signed = dict(entry)
    signed["hmac"] = ie._hmac(payload)
    return json.dumps(signed, separators=(",", ":"), sort_keys=True)


def _valid_entry() -> dict[str, Any]:
    return {
        "ts": "2026-06-29T00:00:00Z",
        "type": "elo_match",
        "task_id": "oracle:elo_match:2026-06-29T00:00:00Z",
        "version": ie.SCHEMA_VERSION,
        "oracle_id": "elo_match",
    }


@pytest.fixture
def event_log(tmp_path, monkeypatch):
    """Redirige ingest_event.EVENT_LOG vers un fichier temporaire."""
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ie, "EVENT_LOG", log)
    return log


def _write_lines(log: Path, raw_lines: list[str]) -> None:
    log.write_text("\n".join(raw_lines) + "\n", encoding="utf-8")


# ── log absent / sain ────────────────────────────────────────────────────────

def test_missing_file_is_ok(event_log):
    assert ie.verify_event_log() is True
    assert ie.verify_event_log(raise_on_fail=True) is True


def test_valid_log_passes(event_log):
    _write_lines(event_log, [_signed_line(_valid_entry())])
    assert ie.verify_event_log() is True
    assert ie.verify_event_log(raise_on_fail=True) is True


# ── forge HMAC invalide -> exception (acceptance) ─────────────────────────────

def test_forged_hmac_raises(event_log):
    line = json.loads(_signed_line(_valid_entry()))
    # Flip un caractère de l'HMAC (reste hex/ascii, donc passe le type-guard).
    h = line["hmac"]
    line["hmac"] = ("0" if h[0] != "0" else "1") + h[1:]
    _write_lines(event_log, [json.dumps(line, separators=(",", ":"), sort_keys=True)])
    with pytest.raises(ie.EventLogIntegrityError):
        ie.verify_event_log(raise_on_fail=True)
    # Mode rétro-compatible : pas d'exception, renvoie False.
    assert ie.verify_event_log() is False


def test_tampered_payload_raises(event_log):
    """HMAC valide pour l'ancien payload, mais le payload a changé -> mismatch."""
    line = json.loads(_signed_line(_valid_entry()))
    line["ts"] = "2099-01-01T00:00:00Z"  # falsifie le contenu, garde l'ancien hmac
    _write_lines(event_log, [json.dumps(line, separators=(",", ":"), sort_keys=True)])
    with pytest.raises(ie.EventLogIntegrityError):
        ie.verify_event_log(raise_on_fail=True)


def test_missing_hmac_raises(event_log):
    entry = _valid_entry()  # pas de champ hmac
    _write_lines(event_log, [json.dumps(entry, separators=(",", ":"), sort_keys=True)])
    with pytest.raises(ie.EventLogIntegrityError):
        ie.verify_event_log(raise_on_fail=True)


# ── RT-192-2 : compare_digest ne doit jamais lever TypeError ──────────────────

@pytest.mark.parametrize("bad_hmac", [
    123,                 # int
    ["a", "b"],          # list
    {"k": "v"},          # dict
    None,                # null explicite (devient missing après pop)
    "café_non_ascii",    # str non-ASCII -> TypeError si passé tel quel à compare_digest
    "",                  # str vide
])
def test_malformed_hmac_raises_not_typeerror(event_log, bad_hmac):
    line = json.loads(_signed_line(_valid_entry()))
    line["hmac"] = bad_hmac
    _write_lines(event_log, [json.dumps(line, separators=(",", ":"), sort_keys=True, ensure_ascii=False)])
    # Doit être un rejet dur typé, jamais un TypeError nu.
    with pytest.raises(ie.EventLogIntegrityError):
        ie.verify_event_log(raise_on_fail=True)
    assert ie.verify_event_log() is False


# ── preuve que la comparaison constante est bien empruntée ────────────────────

def test_uses_compare_digest(event_log, monkeypatch):
    _write_lines(event_log, [_signed_line(_valid_entry())])
    calls = {"n": 0}
    real = ie.hmac.compare_digest

    def _spy(a, b):
        calls["n"] += 1
        return real(a, b)

    monkeypatch.setattr(ie.hmac, "compare_digest", _spy)
    assert ie.verify_event_log() is True
    assert calls["n"] == 1  # comparaison timing-safe empruntée pour la ligne valide


# ── le pipeline garde son contrat (rc=6 sur log corrompu) ─────────────────────

def test_pipeline_returns_6_on_tamper(event_log, tmp_path, monkeypatch):
    """ingest_event() avale l'exception et renvoie 6 (contrat pipeline inchangé)."""
    line = json.loads(_signed_line(_valid_entry()))
    h = line["hmac"]
    line["hmac"] = ("0" if h[0] != "0" else "1") + h[1:]
    _write_lines(event_log, [json.dumps(line, separators=(",", ":"), sort_keys=True)])
    report = tmp_path / "elo.json"
    report.write_text(json.dumps({"verdict": "PASS", "delta_hybrid_vs_heuristic": 30.0}), encoding="utf-8")
    rc = ie.ingest_event("elo_match", report)
    assert rc == 6
