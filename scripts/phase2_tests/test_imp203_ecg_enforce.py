#!/usr/bin/env python3
"""IMP-203 — ECG enforcing : close routé via ecg.can_transition + ledger_writer +
producteur imp_closed (AUDIT_REQUIRED, non fermé).

Acceptance: close legale OK / close illegale rejetee / event imp_closed emis + projection
reflete / legacy tolere / non-regression.

Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp203_ecg_enforce.py -v
Tout opère sur ledger + event-log temporaires (jamais le vrai ledger / le vrai events.jsonl).
"""
from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
import yaml

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
sys.path.insert(0, str(_ROOT / "scripts"))
sys.path.insert(0, str(_ROOT / "lab" / "chains"))
import ingest_event as ie  # noqa: E402
import ecg  # noqa: E402
import projection as pj  # noqa: E402
import kaizen_loop as kl  # noqa: E402


@pytest.fixture
def event_log(tmp_path, monkeypatch):
    """Redirige le log d'events vers tmp (in-process : kaizen_loop._ingest EST ie)."""
    log = tmp_path / "events.jsonl"
    monkeypatch.setattr(ie, "EVENT_LOG", log)
    return log


def _mk_ledger(tmp_path, imps: list[dict]) -> Path:
    p = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    p.write_text(yaml.dump({"improvements": imps}, default_flow_style=False, sort_keys=False),
                 encoding="utf-8")
    return p


def _close(ledger_path: Path, imp_id: str, ratify: bool = False):
    data = kl.load_ledger(ledger_path)
    args = SimpleNamespace(id=imp_id, session="2026-06-29", ledger_path=ledger_path, ratify=ratify)
    kl.cmd_close(data, args)


def _status(ledger_path: Path, imp_id: str) -> dict:
    for i in kl.load_ledger(ledger_path)["improvements"]:
        if i["id"] == imp_id:
            return i
    raise AssertionError("imp introuvable")


# ── legacy toléré + event émis + projection ───────────────────────────────────

def test_legacy_close_ok_and_event_and_projection(tmp_path, event_log):
    led = _mk_ledger(tmp_path, [{"id": "IMP-001", "title": "legacy", "status": "OPEN",
                                 "blocked_by": [], "notes": ""}])
    _close(led, "IMP-001")
    imp = _status(led, "IMP-001")
    assert imp["status"] == "CLOSED"
    assert "ecg_state" not in imp                 # legacy : aucun champ ajouté
    # event émis -> projection reflète le close
    st = pj.replay(event_log)
    assert st["imps"]["IMP-001"]["ecg_state"] == "CLOSED"


# ── ECG-managed : transition légale ───────────────────────────────────────────

def test_managed_legal_close(tmp_path, event_log):
    led = _mk_ledger(tmp_path, [{"id": "IMP-002", "title": "managed", "status": "OPEN",
                                 "ecg_state": "VERDICT_SIGNED", "blocked_by": [], "notes": ""}])
    _close(led, "IMP-002")
    imp = _status(led, "IMP-002")
    assert imp["status"] == "CLOSED" and imp["ecg_state"] == "CLOSED"
    assert pj.replay(event_log)["imps"]["IMP-002"]["ecg_state"] == "CLOSED"


# ── ECG-managed : transition illégale -> refus dur, rien écrit ────────────────

@pytest.mark.parametrize("bad_state", ["PROPOSED", "IN_PROGRESS", "PLANNED", "ORACLE_PENDING"])
def test_managed_illegal_close_rejected(tmp_path, event_log, bad_state):
    led = _mk_ledger(tmp_path, [{"id": "IMP-003", "title": "x", "status": "OPEN",
                                 "ecg_state": bad_state, "blocked_by": [], "notes": ""}])
    with pytest.raises(SystemExit) as exc:
        _close(led, "IMP-003")
    assert exc.value.code == 2
    assert _status(led, "IMP-003")["status"] == "OPEN"   # close avorté avant save
    assert pj.replay(event_log)["imps"] == {}            # aucun event émis


# ── --ratify : override HumanGate ─────────────────────────────────────────────

def test_ratify_overrides_illegal(tmp_path, event_log):
    led = _mk_ledger(tmp_path, [{"id": "IMP-004", "title": "ratify", "status": "OPEN",
                                 "ecg_state": "PROPOSED", "blocked_by": [], "notes": ""}])
    _close(led, "IMP-004", ratify=True)                  # PROPOSED->CLOSED sauté par override
    imp = _status(led, "IMP-004")
    assert imp["status"] == "CLOSED" and imp["ecg_state"] == "CLOSED"


# ── robustesse fail-open : desync / corrompu -> legacy toléré (pas brické) ────

def test_desync_closed_state_but_reopened_status_tolerated(tmp_path, event_log):
    # status rouvert (OPEN) mais ecg_state stale CLOSED -> desync -> traité legacy, close OK.
    led = _mk_ledger(tmp_path, [{"id": "IMP-005", "title": "desync", "status": "OPEN",
                                 "ecg_state": "CLOSED", "blocked_by": [], "notes": ""}])
    _close(led, "IMP-005")                               # ne doit PAS lever (pas brické)
    assert _status(led, "IMP-005")["status"] == "CLOSED"


def test_corrupt_ecg_state_tolerated(tmp_path, event_log):
    led = _mk_ledger(tmp_path, [{"id": "IMP-006", "title": "corrupt", "status": "OPEN",
                                 "ecg_state": "bogus", "blocked_by": [], "notes": ""}])
    _close(led, "IMP-006")                               # hors-enum -> legacy toléré
    assert _status(led, "IMP-006")["status"] == "CLOSED"


# ── idempotence : déjà CLOSED -> no-op, pas d'exit, pas d'event ───────────────

def test_already_closed_noop(tmp_path, event_log):
    led = _mk_ledger(tmp_path, [{"id": "IMP-007", "title": "done", "status": "CLOSED",
                                 "blocked_by": [], "notes": ""}])
    _close(led, "IMP-007")                               # retourne sans exit
    assert pj.replay(event_log)["imps"] == {}            # aucun event


# ── emit best-effort LOUD : log tampered -> warning, close persiste ───────────

def test_emit_best_effort_on_tampered_log(tmp_path, event_log, capsys):
    # log pré-pollué avec une ligne au HMAC invalide -> emit lève, mais le close persiste.
    event_log.write_text(
        '{"ts":"2026-06-29T00:00:00Z","type":"elo_match","task_id":"oracle:elo_match:x",'
        '"version":1,"oracle_id":"elo_match","hmac":"deadbeef"}\n', encoding="utf-8")
    led = _mk_ledger(tmp_path, [{"id": "IMP-008", "title": "legacy", "status": "OPEN",
                                 "blocked_by": [], "notes": ""}])
    _close(led, "IMP-008")                               # ne lève PAS (best-effort)
    assert _status(led, "IMP-008")["status"] == "CLOSED"  # close persiste
    err = capsys.readouterr().err
    assert "NON emis" in err or "reconciliation" in err   # ERROR loud


# ── routage autopilot.close_imp -> subprocess kaizen_loop (contrat) ───────────

class _FakeProc:
    def __init__(self, rc=0, stdout="", stderr=""):
        self.returncode, self.stdout, self.stderr = rc, stdout, stderr


def test_autopilot_delegates_to_kaizen_loop(monkeypatch):
    import autopilot as ap
    calls: list = []

    def fake_run(cmd, **kw):
        calls.append((list(cmd), kw))
        return _FakeProc(0)

    monkeypatch.setattr(ap.subprocess, "run", fake_run)
    monkeypatch.setattr(ap, "run_state_updater_async", lambda *a, **k: None)
    res = ap.close_imp("IMP-TEST-203")

    cmd0, kw0 = calls[0]                                  # 1ère sous-commande = le close
    joined = " ".join(cmd0)
    assert "kaizen_loop.py" in joined and ".venv312" in joined
    assert "close" in cmd0 and "IMP-TEST-203" in cmd0 and "--session" in cmd0
    assert kw0.get("timeout") == 30
    assert res["ok"] is True
    # plus aucun write_text direct du ledger dans close_imp (vérifié par la source) :
    src = (Path(ap.__file__).read_text(encoding="utf-8"))
    close_src = src[src.index("def close_imp("):src.index("def close_imp(") + 1800]
    assert "LEDGER.write_text" not in close_src


def test_autopilot_maps_close_failure(monkeypatch):
    import autopilot as ap

    def fake_run(cmd, **kw):
        if "kaizen_loop.py" in " ".join(cmd):
            return _FakeProc(2, stderr="[X] ECG: transition illegale PROPOSED->CLOSED")
        return _FakeProc(0)

    monkeypatch.setattr(ap.subprocess, "run", fake_run)
    monkeypatch.setattr(ap, "run_state_updater_async", lambda *a, **k: None)
    res = ap.close_imp("IMP-BAD")
    assert res["ok"] is False
    assert "illegale" in res["error"]
