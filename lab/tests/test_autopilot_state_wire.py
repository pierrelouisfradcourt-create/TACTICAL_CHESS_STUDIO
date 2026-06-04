"""
Tests IMP-049 — câblage state_updater dans autopilot.py
Compatible : .venv312/Scripts/python.exe -m pytest lab/tests/test_autopilot_state_wire.py
"""

import sys
import re
import tempfile
import threading
import time
from pathlib import Path
from unittest.mock import patch, MagicMock

# Ajout root repo au path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import autopilot as ap


# ──────────────────────────────────────────────────────────────────────────────
# run_state_updater_async
# ──────────────────────────────────────────────────────────────────────────────

def test_run_state_updater_async_starts_when_script_present(tmp_path):
    """Un thread est démarré si state_updater.py existe."""
    fake_script = tmp_path / "state_updater.py"
    fake_script.write_text("# stub\n", encoding="utf-8")
    called = []
    original_su = ap.STATE_UPDATER
    original_run = subprocess_run_real = None

    def fake_run(*args, **kwargs):
        called.append(args[0])

    try:
        ap.STATE_UPDATER = fake_script
        with patch("autopilot.subprocess.run", side_effect=fake_run):
            ap.run_state_updater_async()
            time.sleep(0.2)  # attendre le thread daemon
        assert len(called) >= 1, "subprocess.run devrait être appelé dans le thread"
    finally:
        ap.STATE_UPDATER = original_su


def test_run_state_updater_async_skips_when_script_missing(tmp_path):
    """Aucun thread démarré si state_updater.py absent."""
    original_su = ap.STATE_UPDATER
    called = []
    try:
        ap.STATE_UPDATER = tmp_path / "does_not_exist.py"
        with patch("autopilot.subprocess.run", side_effect=lambda *a, **k: called.append(1)):
            ap.run_state_updater_async()
            time.sleep(0.1)
        assert len(called) == 0
    finally:
        ap.STATE_UPDATER = original_su


def test_run_state_updater_async_non_blocking():
    """L'appel doit retourner immédiatement sans bloquer."""
    original_su = ap.STATE_UPDATER
    fake_script = Path(tempfile.mktemp(suffix=".py"))
    try:
        fake_script.write_text("import time; time.sleep(5)\n", encoding="utf-8")
        ap.STATE_UPDATER = fake_script
        t0 = time.time()
        with patch("autopilot.subprocess.run", side_effect=lambda *a, **k: time.sleep(0)):
            ap.run_state_updater_async()
        elapsed = time.time() - t0
        assert elapsed < 0.5, f"run_state_updater_async a bloqué {elapsed:.2f}s"
    finally:
        ap.STATE_UPDATER = original_su
        try:
            fake_script.unlink(missing_ok=True)
        except Exception:
            pass


# ──────────────────────────────────────────────────────────────────────────────
# run_chain → run_state_updater_async câblé
# ──────────────────────────────────────────────────────────────────────────────

def test_run_chain_triggers_state_updater(tmp_path):
    """run_chain() doit appeler run_state_updater_async après exécution."""
    triggered = []
    original_write = ap.write_studio_state
    original_run_su = ap.run_state_updater_async

    def fake_state_updater():
        triggered.append(1)

    def fake_write():
        pass  # no-op pour éviter writes dans l'env test

    try:
        ap.write_studio_state = fake_write
        ap.run_state_updater_async = fake_state_updater
        # run_chain avec commande triviale (echo)
        ap.run_chain("echo test_wire")
        assert len(triggered) == 1, "run_state_updater_async devrait être appelé une fois"
    finally:
        ap.write_studio_state = original_write
        ap.run_state_updater_async = original_run_su


# ──────────────────────────────────────────────────────────────────────────────
# close_imp — mise à jour ledger
# ──────────────────────────────────────────────────────────────────────────────

SAMPLE_LEDGER_CONTENT = """\
meta:
  ledger_version: v0
improvements:
- id: IMP-001
  title: Fix foo
  status: OPEN
  lane: SAFE_AUTO
- id: IMP-002
  title: Fix bar
  status: CLOSED
  lane: SAFE_AUTO
- id: IMP-003
  title: Fix baz
  status: DEFERRED
  lane: SAFE_AUTO
"""


def test_close_imp_updates_status_to_closed(tmp_path):
    fake_ledger = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    fake_ledger.write_text(SAMPLE_LEDGER_CONTENT, encoding="utf-8")
    original_ledger = ap.LEDGER

    triggered = []
    def fake_run_su():
        triggered.append(1)

    try:
        ap.LEDGER = fake_ledger
        ap.run_state_updater_async = fake_run_su
        result = ap.close_imp("IMP-001")
        assert result["ok"] is True
        updated = fake_ledger.read_text(encoding="utf-8")
        # IMP-001 doit maintenant être CLOSED
        assert re.search(r"- id:\s*IMP-001.*?status:\s*CLOSED", updated, re.DOTALL)
        # IMP-002 ne doit pas changer
        assert re.search(r"- id:\s*IMP-002.*?status:\s*CLOSED", updated, re.DOTALL)
    finally:
        ap.LEDGER = original_ledger
        ap.run_state_updater_async = ap.__class__.run_state_updater_async if hasattr(ap.__class__, "run_state_updater_async") else ap.run_state_updater_async


def test_close_imp_deferred_becomes_closed(tmp_path):
    fake_ledger = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    fake_ledger.write_text(SAMPLE_LEDGER_CONTENT, encoding="utf-8")
    original_ledger = ap.LEDGER
    ap.run_state_updater_async = lambda: None
    try:
        ap.LEDGER = fake_ledger
        result = ap.close_imp("IMP-003")
        assert result["ok"] is True
        updated = fake_ledger.read_text(encoding="utf-8")
        assert re.search(r"- id:\s*IMP-003.*?status:\s*CLOSED", updated, re.DOTALL)
    finally:
        ap.LEDGER = original_ledger


def test_close_imp_not_found_returns_error(tmp_path):
    fake_ledger = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    fake_ledger.write_text(SAMPLE_LEDGER_CONTENT, encoding="utf-8")
    original_ledger = ap.LEDGER
    ap.run_state_updater_async = lambda: None
    try:
        ap.LEDGER = fake_ledger
        result = ap.close_imp("IMP-999")
        assert result["ok"] is False
        assert "not found" in result["error"].lower() or "already" in result["error"].lower()
    finally:
        ap.LEDGER = original_ledger


def test_close_imp_already_closed_returns_error(tmp_path):
    fake_ledger = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    fake_ledger.write_text(SAMPLE_LEDGER_CONTENT, encoding="utf-8")
    original_ledger = ap.LEDGER
    ap.run_state_updater_async = lambda: None
    try:
        ap.LEDGER = fake_ledger
        result = ap.close_imp("IMP-002")
        assert result["ok"] is False
    finally:
        ap.LEDGER = original_ledger


def test_close_imp_calls_state_updater(tmp_path):
    """close_imp doit toujours appeler run_state_updater_async même si pas trouvé."""
    fake_ledger = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    fake_ledger.write_text(SAMPLE_LEDGER_CONTENT, encoding="utf-8")
    original_ledger = ap.LEDGER
    triggered = []
    original_run_su = ap.run_state_updater_async

    def fake_run_su():
        triggered.append(1)

    try:
        ap.LEDGER = fake_ledger
        ap.run_state_updater_async = fake_run_su
        ap.close_imp("IMP-001")
        assert len(triggered) == 1
        triggered.clear()
        ap.close_imp("IMP-999")
        assert len(triggered) == 1
    finally:
        ap.LEDGER = original_ledger
        ap.run_state_updater_async = original_run_su


def test_close_imp_missing_ledger(tmp_path):
    """close_imp avec LEDGER absent retourne error sans crash."""
    original_ledger = ap.LEDGER
    ap.run_state_updater_async = lambda: None
    try:
        ap.LEDGER = tmp_path / "nonexistent.yaml"
        result = ap.close_imp("IMP-001")
        assert result["ok"] is False
        assert "not found" in result["error"].lower() or "LEDGER" in result["error"]
    finally:
        ap.LEDGER = original_ledger


# ──────────────────────────────────────────────────────────────────────────────
# Vérification structure autopilot — fonctions exportées
# ──────────────────────────────────────────────────────────────────────────────

def test_autopilot_has_run_state_updater_async():
    assert callable(getattr(ap, "run_state_updater_async", None)), \
        "run_state_updater_async doit être défini dans autopilot.py"


def test_autopilot_has_close_imp():
    assert callable(getattr(ap, "close_imp", None)), \
        "close_imp doit être défini dans autopilot.py"


def test_autopilot_has_state_updater_constant():
    assert hasattr(ap, "STATE_UPDATER"), "STATE_UPDATER doit être défini dans autopilot.py"
    assert isinstance(ap.STATE_UPDATER, Path)
