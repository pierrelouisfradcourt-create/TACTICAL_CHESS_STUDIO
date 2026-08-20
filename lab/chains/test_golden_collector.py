"""
test_golden_collector.py — Tests pytest pour golden_collector.py (IMP-013)
"""

import sys
import os
import json
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(__file__))

import golden_collector as gc


# ── Fixtures ──────────────────────────────────────────────────

def _imp(imp_id="IMP-012", status="CLOSED"):
    return {
        "id": imp_id,
        "title": "STUDIO_CONTEXT.md auto-genere",
        "lane": "SAFE_AUTO",
        "impact": "HIGH",
        "effort": "SMALL",
        "files": ["lab/chains/studio_context_builder.py"],
        "acceptance": "Script qui derive STUDIO_CONTEXT.md",
        "closed_session": "2026-06-01",
        "status": status,
    }


def _write_charter(tmp_path, imp_id="IMP-012"):
    charter = tmp_path / f"{imp_id}_charter.md"
    charter.write_text(f"# CHARTER {imp_id}\n## OBJECTIF\nTest.", encoding="utf-8")
    return charter


# ── archive_closed_imp ────────────────────────────────────────

def test_archive_creates_jsonl(tmp_path):
    charter = _write_charter(tmp_path)
    output = tmp_path / "golden_examples.jsonl"

    result = gc.archive_closed_imp(_imp(), str(charter), output_path=output)

    assert result is True
    assert output.exists()


def test_archive_writes_correct_imp_id(tmp_path):
    charter = _write_charter(tmp_path)
    output = tmp_path / "golden_examples.jsonl"

    gc.archive_closed_imp(_imp("IMP-099"), str(charter), output_path=output)
    examples = gc.load_examples(output)

    assert len(examples) == 1
    assert examples[0]["imp_id"] == "IMP-099"


def test_archive_claim_verdict_is_no_claim(tmp_path):
    charter = _write_charter(tmp_path)
    output = tmp_path / "golden_examples.jsonl"

    gc.archive_closed_imp(_imp(), str(charter), output_path=output)
    examples = gc.load_examples(output)

    assert examples[0]["claim_verdict"] == "NO_CLAIM_ALLOWED"


def test_archive_schema_version(tmp_path):
    charter = _write_charter(tmp_path)
    output = tmp_path / "golden_examples.jsonl"

    gc.archive_closed_imp(_imp(), str(charter), output_path=output)
    examples = gc.load_examples(output)

    assert examples[0]["schema_version"] == gc.SCHEMA_VERSION


def test_archive_charter_content_stored(tmp_path):
    charter = _write_charter(tmp_path)
    output = tmp_path / "golden_examples.jsonl"

    gc.archive_closed_imp(_imp(), str(charter), output_path=output)
    examples = gc.load_examples(output)

    assert "CHARTER IMP-012" in examples[0]["charter"]


def test_archive_report_snippet_stored(tmp_path):
    charter = _write_charter(tmp_path)
    output = tmp_path / "golden_examples.jsonl"

    gc.archive_closed_imp(_imp(), str(charter), report="174 passed", output_path=output)
    examples = gc.load_examples(output)

    assert "174 passed" in examples[0]["report_snippet"]


def test_archive_deduplication_skips_second_call(tmp_path):
    charter = _write_charter(tmp_path)
    output = tmp_path / "golden_examples.jsonl"

    gc.archive_closed_imp(_imp(), str(charter), output_path=output)
    result2 = gc.archive_closed_imp(_imp(), str(charter), output_path=output)

    assert result2 is False
    examples = gc.load_examples(output)
    assert len(examples) == 1


def test_archive_multiple_imps_stored(tmp_path):
    charter1 = _write_charter(tmp_path, "IMP-012")
    charter2 = _write_charter(tmp_path, "IMP-013")
    output = tmp_path / "golden_examples.jsonl"

    gc.archive_closed_imp(_imp("IMP-012"), str(charter1), output_path=output)
    gc.archive_closed_imp(_imp("IMP-013"), str(charter2), output_path=output)
    examples = gc.load_examples(output)

    assert len(examples) == 2
    ids = {e["imp_id"] for e in examples}
    assert ids == {"IMP-012", "IMP-013"}


def test_archive_missing_charter_still_archives(tmp_path):
    output = tmp_path / "golden_examples.jsonl"

    result = gc.archive_closed_imp(_imp(), charter_path=None, output_path=output)

    assert result is True
    examples = gc.load_examples(output)
    assert examples[0]["charter"] == ""


# ── load_examples ─────────────────────────────────────────────

def test_load_examples_empty_file(tmp_path):
    output = tmp_path / "golden_examples.jsonl"
    output.write_text("", encoding="utf-8")
    assert gc.load_examples(output) == []


def test_load_examples_nonexistent_file(tmp_path):
    output = tmp_path / "nonexistent.jsonl"
    assert gc.load_examples(output) == []


def test_load_examples_skips_malformed_lines(tmp_path):
    output = tmp_path / "golden_examples.jsonl"
    output.write_text('{"imp_id": "IMP-012"}\nNOT JSON\n{"imp_id": "IMP-013"}\n', encoding="utf-8")
    examples = gc.load_examples(output)
    assert len(examples) == 2


# ── cmd_list ──────────────────────────────────────────────────

def test_cmd_list_empty(tmp_path, capsys):
    with patch("golden_collector.GOLDEN_PATH", tmp_path / "golden_examples.jsonl"):
        result = gc.cmd_list(None)
    assert result == 0
    out = capsys.readouterr().out
    assert "vide" in out.lower() or "absent" in out.lower()


def test_cmd_list_shows_entries(tmp_path, capsys):
    charter = _write_charter(tmp_path)
    output = tmp_path / "golden_examples.jsonl"
    gc.archive_closed_imp(_imp(), str(charter), output_path=output)

    with patch("golden_collector.load_examples", return_value=gc.load_examples(output)):
        result = gc.cmd_list(None)

    assert result == 0


# ── cmd_show ──────────────────────────────────────────────────

def test_cmd_show_not_found_returns_error(tmp_path):
    with patch("golden_collector.load_examples", return_value=[]):
        class FakeArgs:
            imp = "IMP-999"
        result = gc.cmd_show(FakeArgs())
    assert result == 1


def test_cmd_show_found_returns_zero(tmp_path):
    charter = _write_charter(tmp_path)
    output = tmp_path / "golden_examples.jsonl"
    gc.archive_closed_imp(_imp("IMP-012"), str(charter), output_path=output)
    examples = gc.load_examples(output)

    with patch("golden_collector.load_examples", return_value=examples):
        class FakeArgs:
            imp = "IMP-012"
        result = gc.cmd_show(FakeArgs())

    assert result == 0


# ── cmd_collect ───────────────────────────────────────────────

def test_cmd_collect_missing_charter_returns_error(tmp_path):
    class FakeArgs:
        imp = "IMP-999"
        report = ""

    with patch("golden_collector._charter_path_for", return_value=None):
        result = gc.cmd_collect(FakeArgs())

    assert result == 1


# ── main ──────────────────────────────────────────────────────

def test_main_no_command_returns_zero():
    result = gc.main([])
    assert result == 0
