#!/usr/bin/env python3
"""Tests cockpit_server.py (IMP-210) — hermetiques, sans reseau ni vrai subprocess.

Couvre :
  - /health 200
  - lecture tolerante : fichier source absent -> 200 {"available": false}
  - governor BLOCK sur mutation (AUDIT_REQUIRED sans audit_passed) -> 403
  - SSE : au moins un event/heartbeat emis
  - 422 sur payload POST vide
  - bornes : verdict gate invalide -> 400, idempotence gate, ELO hmac
"""
from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

import pytest

# Le module vit dans scripts/ ; l'exposer a l'import.
_SCRIPTS = Path(__file__).resolve().parent.parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from fastapi.testclient import TestClient  # noqa: E402

import cockpit_server  # noqa: E402


@pytest.fixture()
def client():
    with TestClient(cockpit_server.app) as c:
        yield c


# --------------------------------------------------------------------------
# Sante
# --------------------------------------------------------------------------

def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# --------------------------------------------------------------------------
# Lecture tolerante : fichier absent -> 200 {"available": false}, JAMAIS 500
# --------------------------------------------------------------------------

def test_director_missing_file_returns_available_false(client, monkeypatch, tmp_path):
    monkeypatch.setattr(cockpit_server, "DIRECTOR_PATH", tmp_path / "nope.json")
    r = client.get("/api/director")
    assert r.status_code == 200
    assert r.json()["available"] is False


def test_council_missing_returns_available_false(client, monkeypatch, tmp_path):
    monkeypatch.setattr(cockpit_server, "COUNCIL_DIR", tmp_path / "no_council")
    monkeypatch.setattr(cockpit_server, "CONSENSUS_PATH", tmp_path / "no_council" / "CONSENSUS.md")
    r = client.get("/api/council")
    assert r.status_code == 200
    assert r.json()["available"] is False


def test_elo_missing_returns_available_false(client, monkeypatch, tmp_path):
    monkeypatch.setattr(cockpit_server, "ELO_PATH", tmp_path / "no_elo.json")
    r = client.get("/api/elo")
    assert r.status_code == 200
    body = r.json()
    assert body["available"] is False
    assert body["hmac_valid"] is False


def test_ledger_missing_returns_available_false(client, monkeypatch, tmp_path):
    monkeypatch.setattr(cockpit_server, "LEDGER_PATH", tmp_path / "no_ledger.yaml")
    r = client.get("/api/ledger")
    assert r.status_code == 200
    assert r.json()["available"] is False


def test_events_missing_returns_available_false(client, monkeypatch, tmp_path):
    monkeypatch.setattr(cockpit_server, "EVENTS_PATH", tmp_path / "no_events.jsonl")
    r = client.get("/api/events?limit=10")
    assert r.status_code == 200
    assert r.json()["available"] is False


# --------------------------------------------------------------------------
# Lecture nominale (fixtures tmp)
# --------------------------------------------------------------------------

def test_ledger_parse_and_stats(client, monkeypatch, tmp_path):
    ledger = tmp_path / "ledger.yaml"
    ledger.write_text(
        "meta:\n  ledger_version: v0\n"
        "improvements:\n"
        "- id: IMP-001\n  title: A\n  status: OPEN\n  lane: SAFE_AUTO\n"
        "- id: IMP-002\n  title: B\n  status: CLOSED\n  lane: SAFE_AUTO\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(cockpit_server, "LEDGER_PATH", ledger)
    r = client.get("/api/ledger")
    assert r.status_code == 200
    body = r.json()
    assert body["available"] is True
    assert body["count"] == 2

    r2 = client.get("/api/ledger?status=OPEN")
    assert r2.json()["count"] == 1

    r3 = client.get("/api/ledger/IMP-001")
    assert r3.json()["available"] is True
    assert r3.json()["improvement"]["title"] == "A"

    r4 = client.get("/api/ledger/IMP-999")
    assert r4.json()["available"] is False


def test_elo_hmac_valid_with_key(client, monkeypatch, tmp_path):
    import hashlib
    import hmac as hmac_lib
    elo = tmp_path / "elo.json"
    payload = '{"verdict": "FAIL", "ratings": {}}'
    elo.write_text(payload, encoding="utf-8")
    key = "test-key"
    sig = hmac_lib.new(key.encode(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    (tmp_path / "elo.json.hmac").write_text(f"HMAC-SHA2-256(elo.json)= {sig}\n", encoding="utf-8")
    monkeypatch.setattr(cockpit_server, "ELO_PATH", elo)
    monkeypatch.setattr(cockpit_server, "ELO_HMAC_PATH", tmp_path / "elo.json.hmac")
    monkeypatch.setattr(cockpit_server, "HMAC_KEY", key)
    r = client.get("/api/elo")
    assert r.status_code == 200
    body = r.json()
    assert body["available"] is True
    assert body["hmac_valid"] is True


def test_services_probe_never_hangs(client):
    r = client.get("/api/services")
    assert r.status_code == 200
    names = {s["name"] for s in r.json()["services"]}
    assert {"autopilot", "claude_proxy", "canvas_gateway", "lm_studio"}.issubset(names)


# --------------------------------------------------------------------------
# Gouvernance : BLOCK -> 403
# --------------------------------------------------------------------------

def test_council_run_blocked_audit_required_without_audit(client):
    # AUDIT_REQUIRED sans audit_passed -> governor BLOCK -> 403.
    r = client.post("/api/council/run", json={
        "brief": "test brief", "lane": "AUDIT_REQUIRED", "audit_passed": False,
    })
    assert r.status_code == 403
    assert "BLOCK" in r.json()["detail"]


def test_factory_run_blocked_forbidden_lane(client):
    r = client.post("/api/factory/run", json={"lane": "FORBIDDEN"})
    assert r.status_code == 403


def test_gate_blocked_when_audit_required_without_audit(client, monkeypatch, tmp_path):
    monkeypatch.setattr(cockpit_server, "GATE_LOG_PATH", tmp_path / "gate.yaml")
    r = client.post("/api/gate/HGD-001", json={
        "verdict": "APPROVE", "lane": "AUDIT_REQUIRED", "audit_passed": False,
    })
    assert r.status_code == 403


# --------------------------------------------------------------------------
# Mutations : monkeypatch create_subprocess_exec (pas de vrai subprocess)
# --------------------------------------------------------------------------

def test_council_run_allowed_spawns_via_monkeypatch(client, monkeypatch, tmp_path):
    monkeypatch.setattr(cockpit_server, "STATE_DIR", tmp_path / "state")
    monkeypatch.setattr(cockpit_server, "LOCK_PATH", tmp_path / "state" / "cockpit_runs.lock")
    monkeypatch.setattr(cockpit_server, "COUNCIL_SCRIPT", tmp_path / "council.py")
    (tmp_path / "council.py").write_text("print('fake')\n", encoding="utf-8")

    class _FakeStdout:
        def __aiter__(self):
            async def _gen():
                yield b"hello\n"
            return _gen()

    class _FakeProc:
        def __init__(self):
            self.stdout = _FakeStdout()
            self.returncode = 0
            self.pid = 4242

        async def wait(self):
            self.returncode = 0
            return 0

    async def _fake_exec(*args, **kwargs):
        return _FakeProc()

    monkeypatch.setattr(cockpit_server.asyncio, "create_subprocess_exec", _fake_exec)

    r = client.post("/api/council/run", json={
        "brief": "idee X", "lane": "AUDIT_REQUIRED", "audit_passed": True,
    })
    assert r.status_code == 200
    assert "run_id" in r.json()


# --------------------------------------------------------------------------
# Validation Pydantic : 422 sur payload vide
# --------------------------------------------------------------------------

def test_council_run_empty_payload_422(client):
    r = client.post("/api/council/run", json={})
    assert r.status_code == 422


def test_gate_empty_payload_422(client):
    r = client.post("/api/gate/HGD-001", json={})
    assert r.status_code == 422


def test_gate_invalid_verdict_400(client, monkeypatch, tmp_path):
    monkeypatch.setattr(cockpit_server, "GATE_LOG_PATH", tmp_path / "gate.yaml")
    r = client.post("/api/gate/HGD-001", json={"verdict": "MAYBE", "audit_passed": True})
    assert r.status_code == 400


def test_gate_approve_and_idempotent(client, monkeypatch, tmp_path):
    gate = tmp_path / "gate.yaml"
    monkeypatch.setattr(cockpit_server, "GATE_LOG_PATH", gate)
    r = client.post("/api/gate/HGD-077", json={
        "verdict": "APPROVE", "decision_id": "HGD-077", "audit_passed": True,
    })
    assert r.status_code == 200
    assert r.json()["verdict"] == "APPROVE"
    assert r.json()["idempotent"] is False
    assert gate.exists()
    # Rejouer la meme decision -> idempotent.
    r2 = client.post("/api/gate/HGD-077", json={
        "verdict": "APPROVE", "decision_id": "HGD-077", "audit_passed": True,
    })
    assert r2.status_code == 200
    assert r2.json()["idempotent"] is True


# --------------------------------------------------------------------------
# SSE : au moins un event/heartbeat
#
# On pilote directement le body_iterator de la StreamingResponse avec un
# timeout asyncio : deterministe, pas de portal TestClient sur une boucle
# infinie (qui pourrait hang sur close). Verifie le format `data:` / `:ping`.
# --------------------------------------------------------------------------

def _first_sse_chunk(coro_factory) -> str:
    """Appelle l'endpoint SSE, tire le 1er chunk du body_iterator (timeout)."""
    import asyncio as _aio

    async def _run() -> str:
        resp = await coro_factory()
        agen = resp.body_iterator
        try:
            raw = await _aio.wait_for(agen.__anext__(), timeout=5.0)
        finally:
            aclose = getattr(agen, "aclose", None)
            if aclose is not None:
                try:
                    await aclose()
                except Exception:  # noqa: BLE001
                    pass
        return raw.decode("utf-8") if isinstance(raw, (bytes, bytearray)) else str(raw)

    return _aio.run(_run())


def test_sse_meta_yields_initial_event(monkeypatch, tmp_path):
    monkeypatch.setattr(cockpit_server, "STUDIO_META_PATH", tmp_path / "meta.json")
    chunk = _first_sse_chunk(cockpit_server.stream_meta)
    assert chunk.startswith("data:") or chunk.startswith(":")


def test_sse_events_yields_initial_event(monkeypatch, tmp_path):
    ev = tmp_path / "events.jsonl"
    ev.write_text('{"type":"x","ts":"now"}\n', encoding="utf-8")
    monkeypatch.setattr(cockpit_server, "EVENTS_PATH", ev)
    chunk = _first_sse_chunk(cockpit_server.stream_events)
    assert chunk.startswith("data:") or chunk.startswith(":")


def test_sse_run_drains_queue():
    import asyncio as _aio

    async def _run() -> str:
        run_id = "testrun01"
        q: _aio.Queue = _aio.Queue()
        await q.put("hello line")
        cockpit_server.RUNS[run_id] = {
            "kind": "council", "status": "running", "returncode": None, "queue": q,
        }
        try:
            resp = await cockpit_server.stream_run(run_id)
            agen = resp.body_iterator
            raw = await _aio.wait_for(agen.__anext__(), timeout=5.0)
            await agen.aclose()
        finally:
            cockpit_server.RUNS.pop(run_id, None)
        return raw.decode("utf-8") if isinstance(raw, (bytes, bytearray)) else str(raw)

    chunk = _aio.run(_run())
    assert chunk.startswith("data:")


def test_sse_run_unknown_404(client):
    r = client.get("/api/stream/runs/doesnotexist")
    assert r.status_code == 404
