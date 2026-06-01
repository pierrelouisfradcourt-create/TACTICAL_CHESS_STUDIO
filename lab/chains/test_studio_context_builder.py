"""
test_studio_context_builder.py — Tests pytest pour studio_context_builder.py (IMP-012)
"""

import sys
import os
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(__file__))

import studio_context_builder as scb


# ── Fixtures ──────────────────────────────────────────────────

def _ledger():
    return {
        "meta": {"ledger_version": "v0", "last_updated_session": "2026-06-01"},
        "improvements": [
            {
                "id": "IMP-007",
                "title": "Fix draw structurel",
                "status": "OPEN",
                "impact": "HIGH",
                "effort": "MEDIUM",
                "lane": "AUDIT_REQUIRED",
            },
            {
                "id": "IMP-008",
                "title": "Dataset rebuild",
                "status": "BLOCKED",
                "impact": "CRITICAL",
                "effort": "LARGE",
                "lane": "FORBIDDEN",
            },
            {
                "id": "IMP-001",
                "title": "Closed fix",
                "status": "CLOSED",
                "impact": "LOW",
                "effort": "TRIVIAL",
                "lane": "SAFE_AUTO",
            },
        ],
        "metrics_history": [
            {
                "session": "2026-05-31",
                "total": 11,
                "open": 8,
                "closed": 3,
                "tests_green": 54,
                "commits": 8,
            }
        ],
    }


def _manifest():
    return {
        "routing": {
            "tracked": [
                {"pattern": "src/**/*.rs", "lane": "AUDIT_REQUIRED"},
                {"pattern": "ml/*.py", "lane": "AUDIT_REQUIRED"},
                {"pattern": "lab/chains/*.py", "lane": "SAFE_AUTO"},
            ]
        }
    }


# ── Tests build_context (pure function) ──────────────────────

def test_build_context_title_present():
    ctx = scb.build_context(_ledger(), _manifest())
    assert "STUDIO_CONTEXT" in ctx


def test_build_context_open_improvement_appears():
    ctx = scb.build_context(_ledger(), _manifest())
    assert "IMP-007" in ctx
    assert "Fix draw structurel" in ctx


def test_build_context_blocked_improvement_appears():
    ctx = scb.build_context(_ledger(), _manifest())
    assert "IMP-008" in ctx


def test_build_context_closed_improvement_excluded():
    ctx = scb.build_context(_ledger(), _manifest())
    assert "Closed fix" not in ctx
    assert "IMP-001" not in ctx


def test_build_context_claim_verdict_present():
    ctx = scb.build_context(_ledger(), _manifest())
    assert "NO_CLAIM_ALLOWED" in ctx


def test_build_context_metrics_session_present():
    ctx = scb.build_context(_ledger(), _manifest())
    assert "2026-05-31" in ctx
    assert "54" in ctx


def test_build_context_lane_distribution_present():
    ctx = scb.build_context(_ledger(), _manifest())
    assert "AUDIT_REQUIRED" in ctx
    assert "SAFE_AUTO" in ctx


def test_build_context_in_progress_is_active():
    ledger = _ledger()
    ledger["improvements"].append({
        "id": "IMP-099",
        "title": "En cours",
        "status": "IN_PROGRESS",
        "impact": "MEDIUM",
        "effort": "SMALL",
        "lane": "SAFE_AUTO",
    })
    ctx = scb.build_context(ledger, _manifest())
    assert "IMP-099" in ctx


def test_build_context_empty_metrics_no_crash():
    ledger = _ledger()
    ledger["metrics_history"] = []
    ctx = scb.build_context(ledger, _manifest())
    assert "STUDIO_CONTEXT" in ctx
    assert "NO_CLAIM_ALLOWED" in ctx


def test_build_context_no_active_improvements_fallback():
    ledger = _ledger()
    for imp in ledger["improvements"]:
        imp["status"] = "CLOSED"
    ctx = scb.build_context(ledger, _manifest())
    assert "Aucune amelioration active" in ctx


def test_build_context_returns_string():
    ctx = scb.build_context(_ledger(), _manifest())
    assert isinstance(ctx, str)
    assert len(ctx) > 100


# ── Tests cmd_inject ─────────────────────────────────────────

def test_cmd_inject_prepends_context(tmp_path):
    prompt_file = tmp_path / "prompt.md"
    prompt_file.write_text("Original content here", encoding="utf-8")

    class FakeArgs:
        prompt = str(prompt_file)

    with patch("studio_context_builder.load_ledger", return_value=_ledger()):
        with patch("studio_context_builder.load_manifest", return_value=_manifest()):
            result = scb.cmd_inject(FakeArgs())

    assert result == 0
    content = prompt_file.read_text(encoding="utf-8")
    assert scb.INJECT_START in content
    assert "Original content here" in content
    assert content.index(scb.INJECT_START) < content.index("Original content here")


def test_cmd_inject_replaces_previous_injection(tmp_path):
    prompt_file = tmp_path / "prompt.md"
    old_ctx = f"{scb.INJECT_START}\nOLD CONTEXT\n{scb.INJECT_END}\n\nOriginal"
    prompt_file.write_text(old_ctx, encoding="utf-8")

    class FakeArgs:
        prompt = str(prompt_file)

    with patch("studio_context_builder.load_ledger", return_value=_ledger()):
        with patch("studio_context_builder.load_manifest", return_value=_manifest()):
            scb.cmd_inject(FakeArgs())

    content = prompt_file.read_text(encoding="utf-8")
    assert "OLD CONTEXT" not in content
    assert "Original" in content


def test_cmd_inject_missing_prompt_returns_error(tmp_path):
    class FakeArgs:
        prompt = str(tmp_path / "nonexistent.md")

    result = scb.cmd_inject(FakeArgs())
    assert result == 1


# ── Tests cmd_build ──────────────────────────────────────────

def test_cmd_build_writes_file(tmp_path):
    output = tmp_path / "STUDIO_CONTEXT.md"
    with patch("studio_context_builder.load_ledger", return_value=_ledger()):
        with patch("studio_context_builder.load_manifest", return_value=_manifest()):
            with patch("studio_context_builder.OUTPUT_PATH", output):
                result = scb.cmd_build(None)

    assert result == 0
    assert output.exists()
    content = output.read_text(encoding="utf-8")
    assert "STUDIO_CONTEXT" in content


# ── Tests main ───────────────────────────────────────────────

def test_main_no_command_returns_zero():
    result = scb.main([])
    assert result == 0
