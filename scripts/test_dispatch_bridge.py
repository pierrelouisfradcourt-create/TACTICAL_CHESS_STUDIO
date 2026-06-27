"""test_dispatch_bridge.py — tests pour scripts/dispatch_bridge.py (IMP-181).

Couvre : lecture défensive du schedule, tolérance de schéma
(`recommended` / `recommended_imps`), gate services, construction de commande,
et les 5 branches de maybe_dispatch — sans jamais lancer kaizen_autoloop pour de
vrai (subprocess et sockets mockés).
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import dispatch_bridge as db
import pytest
from pathlib import Path


# ── Lecture du schedule ───────────────────────────────────

def test_load_schedule_absent(tmp_path):
    out = db.load_schedule(tmp_path / "nope.json")
    assert out["available"] is False
    assert "absent" in out["reason"]


def test_load_schedule_corrupt(tmp_path):
    p = tmp_path / "sched.json"
    p.write_text("{ pas du json", encoding="utf-8")
    out = db.load_schedule(p)
    assert out["available"] is False
    assert "illisible" in out["reason"]


def test_load_schedule_not_object(tmp_path):
    p = tmp_path / "sched.json"
    p.write_text("[1, 2, 3]", encoding="utf-8")
    out = db.load_schedule(p)
    assert out["available"] is False


def test_load_schedule_ok(tmp_path):
    p = tmp_path / "sched.json"
    p.write_text(json.dumps({"recommended": []}), encoding="utf-8")
    out = db.load_schedule(p)
    assert out["available"] is True


# ── Tolérance de schéma sur la liste recommandée ──────────

def test_first_recommended_legacy_key():
    sched = {"recommended": [{"id": "IMP-132", "title": "x"}, {"id": "IMP-137"}]}
    assert db.first_recommended(sched)["id"] == "IMP-132"


def test_first_recommended_v1_key():
    sched = {"recommended_imps": [{"id": "IMP-200"}]}
    assert db.first_recommended(sched)["id"] == "IMP-200"


def test_first_recommended_empty():
    assert db.first_recommended({"recommended": []}) is None
    assert db.first_recommended({}) is None


def test_first_recommended_no_id():
    assert db.first_recommended({"recommended": [{"title": "sans id"}]}) is None


# ── Gate services ─────────────────────────────────────────

def test_services_all_up_true():
    probe = [{"name": "a", "up": True}, {"name": "b", "up": True}]
    assert db.services_all_up(probe) is True


def test_services_all_up_false_on_one_down():
    probe = [{"name": "a", "up": True}, {"name": "b", "up": False}]
    assert db.services_all_up(probe) is False


def test_services_all_up_false_on_empty():
    assert db.services_all_up([]) is False


def test_probe_unknown_service_is_down(monkeypatch):
    # Un nom de service inconnu => up:false (fail-closed), sans tenter de socket.
    probe = db.probe_services(("service_inexistant",))
    assert probe[0]["up"] is False


# ── Construction de commande ──────────────────────────────

def test_build_command_execute():
    cmd = db.build_command("IMP-181", execute=True)
    assert "--imp-id" in cmd and "IMP-181" in cmd
    assert "--lane" in cmd and "SAFE_AUTO" in cmd
    assert "--dry-run" not in cmd


def test_build_command_dry_run():
    cmd = db.build_command("IMP-181", execute=False)
    assert "--dry-run" in cmd


# ── maybe_dispatch : les 5 branches ───────────────────────

def test_maybe_dispatch_no_schedule(tmp_path):
    out = db.maybe_dispatch(schedule_path=tmp_path / "absent.json")
    assert out["action"] == "no_schedule"


def test_maybe_dispatch_nothing_recommended(tmp_path):
    p = tmp_path / "sched.json"
    p.write_text(json.dumps({"recommended": []}), encoding="utf-8")
    out = db.maybe_dispatch(schedule_path=p)
    assert out["action"] == "nothing_recommended"


def test_maybe_dispatch_services_down_no_subprocess(tmp_path, monkeypatch):
    p = tmp_path / "sched.json"
    p.write_text(json.dumps({"recommended": [{"id": "IMP-181"}]}), encoding="utf-8")
    monkeypatch.setattr(db, "probe_services",
                        lambda required=db.DEFAULT_REQUIRED:
                        [{"name": "claude_proxy", "port": 8765, "up": False}])

    def _boom(*a, **k):
        raise AssertionError("subprocess ne doit pas être lancé si services down")
    monkeypatch.setattr(db.subprocess, "run", _boom)

    out = db.maybe_dispatch(schedule_path=p, execute=True)
    assert out["action"] == "services_down"
    assert out["imp_id"] == "IMP-181"
    assert "claude_proxy" in out["down"]


def test_maybe_dispatch_planned_does_not_execute(tmp_path, monkeypatch):
    p = tmp_path / "sched.json"
    p.write_text(json.dumps({"recommended": [{"id": "IMP-181"}]}), encoding="utf-8")
    monkeypatch.setattr(db, "probe_services",
                        lambda required=db.DEFAULT_REQUIRED:
                        [{"name": "claude_proxy", "port": 8765, "up": True}])

    def _boom(*a, **k):
        raise AssertionError("dry-run ne doit jamais lancer kaizen_autoloop")
    monkeypatch.setattr(db.subprocess, "run", _boom)

    out = db.maybe_dispatch(schedule_path=p, execute=False)
    assert out["action"] == "planned"
    assert out["execute"] is False
    assert "--imp-id" in out["command"]


def test_maybe_dispatch_execute_calls_kaizen(tmp_path, monkeypatch):
    p = tmp_path / "sched.json"
    p.write_text(json.dumps({"recommended": [{"id": "IMP-181"}]}), encoding="utf-8")
    monkeypatch.setattr(db, "probe_services",
                        lambda required=db.DEFAULT_REQUIRED:
                        [{"name": "claude_proxy", "port": 8765, "up": True}])

    calls = {}

    class _Proc:
        returncode = 0
        stdout = "[OK] IMP-181 ferme dans le ledger."
        stderr = ""

    def _fake_run(cmd, **kwargs):
        calls["cmd"] = cmd
        return _Proc()
    monkeypatch.setattr(db.subprocess, "run", _fake_run)

    out = db.maybe_dispatch(schedule_path=p, execute=True)
    assert out["action"] == "dispatched"
    assert out["result"]["ok"] is True
    # La commande lancée cible bien l'IMP en exécution réelle (pas de --dry-run).
    assert "IMP-181" in calls["cmd"] and "--dry-run" not in calls["cmd"]


def test_maybe_dispatch_execute_reports_failure(tmp_path, monkeypatch):
    p = tmp_path / "sched.json"
    p.write_text(json.dumps({"recommended": [{"id": "IMP-181"}]}), encoding="utf-8")
    monkeypatch.setattr(db, "probe_services",
                        lambda required=db.DEFAULT_REQUIRED:
                        [{"name": "claude_proxy", "port": 8765, "up": True}])

    class _Proc:
        returncode = 1
        stdout = "[X] echec"
        stderr = "boom"

    monkeypatch.setattr(db.subprocess, "run", lambda cmd, **k: _Proc())
    out = db.maybe_dispatch(schedule_path=p, execute=True)
    assert out["action"] == "dispatched"
    assert out["result"]["ok"] is False


# ── CLI ───────────────────────────────────────────────────

def test_main_plan_returns_zero(tmp_path, monkeypatch):
    p = tmp_path / "sched.json"
    p.write_text(json.dumps({"recommended": [{"id": "IMP-181"}]}), encoding="utf-8")
    monkeypatch.setattr(db, "probe_services",
                        lambda required=db.DEFAULT_REQUIRED:
                        [{"name": "claude_proxy", "port": 8765, "up": True}])
    rc = db.main(["--schedule-path", str(p)])   # défaut = dry-run
    assert rc == 0
