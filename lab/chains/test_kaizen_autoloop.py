"""
test_kaizen_autoloop.py — Tests pytest pour kaizen_autoloop.py
Couvre les 8 cas obligatoires du charter.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import kaizen_autoloop as ka
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock


# ── Données de test partagées ─────────────────────────────

def _make_ledger(improvements):
    """Construit un dict ledger minimal pour les tests."""
    return {
        "meta": {"ledger_version": "v0", "claim_verdict": "NO_CLAIM_ALLOWED"},
        "improvements": improvements,
        "metrics_history": [],
    }


def _imp(id_, lane="SAFE_AUTO", impact="HIGH", effort="SMALL",
         status="OPEN", blocked_by=None, acceptance="Test acceptance.", notes=""):
    return {
        "id": id_,
        "title": f"Title {id_}",
        "type": "feature",
        "lane": lane,
        "impact": impact,
        "effort": effort,
        "status": status,
        "blocked_by": blocked_by or [],
        "acceptance": acceptance,
        "notes": notes,
        "files": [f"lab/chains/{id_.lower().replace('-','_')}.py"],
    }


# ── Test 1 : propose retourne le ROI max ─────────────────

def test_propose_returns_highest_roi_imp():
    """propose() retourne l IMP avec le ROI le plus eleve."""
    low_roi  = _imp("IMP-A", impact="LOW",  effort="LARGE")   # ROI = 1/10 = 0.1
    high_roi = _imp("IMP-B", impact="HIGH", effort="SMALL")   # ROI = 5/2  = 2.5
    data = _make_ledger([low_roi, high_roi])

    result = ka.propose(data=data)
    assert result is not None
    assert result["id"] == "IMP-B"


def test_propose_returns_none_when_no_actionable():
    """propose() retourne None si tout est CLOSED ou BLOCKED."""
    closed  = _imp("IMP-A", status="CLOSED")
    blocked = _imp("IMP-B", status="BLOCKED")
    data = _make_ledger([closed, blocked])

    result = ka.propose(data=data)
    assert result is None


def test_propose_respects_lane_filter():
    """propose() avec lane_filter ne retourne que les IMP de cette lane."""
    safe = _imp("IMP-S", lane="SAFE_AUTO",      impact="LOW", effort="SMALL")
    audit = _imp("IMP-A", lane="AUDIT_REQUIRED", impact="HIGH", effort="TRIVIAL")
    data = _make_ledger([safe, audit])

    result = ka.propose(lane_filter="SAFE_AUTO", data=data)
    assert result is not None
    assert result["id"] == "IMP-S"


# ── Test 2 : FORBIDDEN lane stoppe la boucle ─────────────

def test_forbidden_lane_stops_loop(capsys, tmp_path, monkeypatch):
    """run_loop() s arrete immediatement sur un IMP FORBIDDEN."""
    forbidden_imp = _imp("IMP-F", lane="FORBIDDEN")
    data = _make_ledger([forbidden_imp])

    # Patcher recall pour retourner nos donnees de test
    def mock_recall():
        return {
            "open_count": 1,
            "closed_count": 0,
            "blocked_count": 0,
            "deferred_count": 0,
            "data": data,
            "ledger_path": tmp_path / "ledger.yaml",
        }

    monkeypatch.setattr(ka, "recall", mock_recall)

    class Args:
        dry_run = True
        once = True
        lane = None

    ka.run_loop(Args())
    captured = capsys.readouterr()
    assert "[X] FORBIDDEN" in captured.out
    assert "IMP-F" in captured.out


# ── Test 3 : AUDIT_REQUIRED affiche le charter en dry-run ─

def test_audit_required_dry_run_shows_charter(capsys, tmp_path, monkeypatch):
    """En dry-run, AUDIT_REQUIRED genere le charter et affiche [DRY-RUN] sans executer."""
    audit_imp = _imp("IMP-AU", lane="AUDIT_REQUIRED",
                     acceptance="Creer un module audit.")
    data = _make_ledger([audit_imp])

    def mock_recall():
        return {
            "open_count": 1, "closed_count": 0,
            "blocked_count": 0, "deferred_count": 0,
            "data": data, "ledger_path": tmp_path / "ledger.yaml",
        }

    monkeypatch.setattr(ka, "recall", mock_recall)
    # generate_charter ecrit dans CHARTER_DIR — on redirige vers tmp_path
    monkeypatch.setattr(ka, "CHARTER_DIR", tmp_path / "charters")

    # Simuler que run_chain.py echoue (forcer le fallback)
    with patch("subprocess.run") as mock_sub:
        mock_sub.return_value = MagicMock(returncode=1, stdout="", stderr="")
        class Args:
            dry_run = True
            once = True
            lane = None
        ka.run_loop(Args())

    captured = capsys.readouterr()
    assert "[DRY-RUN]" in captured.out
    assert "AUDIT_REQUIRED" in captured.out
    # Le charter doit avoir ete cree
    charters = list((tmp_path / "charters").glob("*.md"))
    assert len(charters) == 1


# ── Test 4 : validate_report succes sur DOCS_OK ──────────

def test_validate_report_success_on_docs_ok():
    """validate_report() retourne True si le rapport contient DOCS_OK."""
    report = "software_verdict: DOCS_OK\nevidence_verdict: MECHANICAL_VALIDATION_ONLY"
    imp = _imp("IMP-X")
    assert ka.validate_report(report, imp) is True


def test_validate_report_success_on_passed():
    """validate_report() retourne True si le rapport mentionne 'passed'."""
    report = "[OK] 60 passed in 0.15s\nsoftware_verdict: something"
    imp = _imp("IMP-X")
    assert ka.validate_report(report, imp) is True


# ── Test 5 : validate_report echec sur BLOCKED ───────────

def test_validate_report_fail_on_blocked():
    """validate_report() retourne False si le rapport mentionne BLOCKED."""
    report = "software_verdict: BLOCKED_INVALID_COMMIT\n[X] arret"
    imp = _imp("IMP-X")
    assert ka.validate_report(report, imp) is False


# ── Test 6 : validate_report echec sur TIMEOUT ───────────

def test_validate_report_fail_on_timeout():
    """validate_report() retourne False sur le signal TIMEOUT."""
    assert ka.validate_report("TIMEOUT", _imp("IMP-X")) is False
    assert ka.validate_report("", _imp("IMP-X")) is False
    assert ka.validate_report(None, _imp("IMP-X")) is False


# ── Test 7 : generate_charter fallback si run_chain down ──

def test_generate_charter_fallback_when_lm_studio_down(tmp_path, monkeypatch):
    """Si run_chain.py echoue, generate_charter() utilise le fallback minimal."""
    monkeypatch.setattr(ka, "CHARTER_DIR", tmp_path / "charters")
    imp = _imp("IMP-T", acceptance="Objectif de test important.")

    with patch("subprocess.run") as mock_sub:
        # Simuler echec run_chain.py
        mock_sub.side_effect = FileNotFoundError("run_chain.py introuvable")
        charter_path = ka.generate_charter(imp)

    assert Path(charter_path).exists()
    content = Path(charter_path).read_text(encoding="utf-8")
    # Le charter fallback doit etre du markdown lisible
    assert "IMP-T" in content
    assert "REGLES ABSOLUES" in content or "OBJECTIF" in content


# ── Test 8 : charter minimal contient l acceptance ────────

def test_minimal_charter_contains_acceptance():
    """build_minimal_charter() inclut l acceptance de l IMP dans le contenu."""
    acceptance = "Ajouter flag --output a puzzle_eval pour ecrire le rapport JSON."
    imp = _imp("IMP-006",
               lane="AUDIT_REQUIRED",
               acceptance=acceptance,
               notes="Rust, lane AUDIT_REQUIRED.")

    charter = ka.build_minimal_charter(imp)

    assert "IMP-006" in charter
    assert acceptance in charter
    assert "NO_CLAIM_ALLOWED" in charter
    assert "AUDIT_REQUIRED" in charter
    assert "VALIDATION" in charter
