"""
test_fusion_matrix_chain.py — Tests pytest pour fusion_matrix_chain.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import pytest
import fusion_matrix_chain as fmc


# ── Fixtures ───────────────────────────────────────────────

def _doc_ok():
    return {
        "software_verdict": "DOCS_OK",
        "evidence_verdict": "MECHANICAL_VALIDATION_ONLY",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "lane": "SAFE_AUTO",
        "routing_audit": {"orphaned": []},
    }


def _doc_blocked():
    return {
        "software_verdict": "BLOCKED_UNROUTED_FILES",
        "evidence_verdict": "DOCUMENTATION_ALIGNMENT_REQUIRED",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "lane": "HUMAN_REQUIRED",
        "routing_audit": {"orphaned": ["foo.py"]},
    }


def _run_proceed():
    return {
        "software_verdict": "CHAIN_COMPLETE",
        "redteam_output": {
            "verdict": "PROCEED",
            "critical_flaws": [],
            "scope_violations": [],
            "missing_validation": [],
        },
    }


def _run_blocked():
    return {
        "software_verdict": "CHAIN_BLOCKED",
        "redteam_output": {
            "verdict": "BLOCKED",
            "critical_flaws": ["no tests"],
            "scope_violations": ["modified wrong file"],
            "missing_validation": [],
        },
    }


def _scripts_clean():
    return {
        "summary": {"path_drift_count": 0, "stale_refs_count": 0},
        "blocked_actions": ["script_execution"],
    }


def _scripts_dirty():
    return {
        "summary": {"path_drift_count": 2, "stale_refs_count": 3},
        "blocked_actions": ["script_execution", "file_move_or_rename"],
    }


# ── ingest_doc_hygiene ─────────────────────────────────────

def test_ingest_doc_hygiene_ok_verdict():
    row = fmc.ingest_doc_hygiene(_doc_ok())
    assert row.chain == "doc_hygiene"
    assert row.verdict == "DOCS_OK"
    assert row.evidence == "MECHANICAL_VALIDATION_ONLY"
    assert row.risk == "none"


def test_ingest_doc_hygiene_blocked_lane_and_orphans():
    row = fmc.ingest_doc_hygiene(_doc_blocked())
    assert row.verdict == "BLOCKED_UNROUTED_FILES"
    assert "lane:HUMAN_REQUIRED" in row.risk
    assert "orphans:1" in row.risk


# ── ingest_run_chain ───────────────────────────────────────

def test_ingest_run_chain_proceed():
    row = fmc.ingest_run_chain(_run_proceed())
    assert row.chain == "run_chain"
    assert row.verdict == "PROCEED"
    assert row.evidence == "no critical flaws"
    assert row.risk == "none"


def test_ingest_run_chain_blocked_evidence_and_risk():
    row = fmc.ingest_run_chain(_run_blocked())
    assert row.verdict == "BLOCKED"
    assert "1 critical_flaw(s)" in row.evidence
    assert "scope_violations:1" in row.risk


def test_ingest_run_chain_missing_redteam_falls_back_to_software_verdict():
    row = fmc.ingest_run_chain({"software_verdict": "CHAIN_COMPLETE"})
    assert row.verdict == "CHAIN_COMPLETE"


# ── ingest_scripts_route ───────────────────────────────────

def test_ingest_scripts_route_clean():
    row = fmc.ingest_scripts_route(_scripts_clean())
    assert row.chain == "scripts_route"
    assert row.verdict == "PASS"
    assert row.evidence == "clean"
    assert "1 blocked_action(s)" in row.risk


def test_ingest_scripts_route_dirty_verdict_and_evidence():
    row = fmc.ingest_scripts_route(_scripts_dirty())
    assert row.verdict == "REVIEW_REQUIRED"
    assert "2 path_drift" in row.evidence
    assert "3 stale_ref(s)" in row.evidence


# ── detect_contradictions ──────────────────────────────────

def test_no_contradiction_all_ok():
    rows = [
        fmc.FusionRow("doc_hygiene",   "DOCS_OK",  "e", "none", ""),
        fmc.FusionRow("run_chain",     "PROCEED",  "e", "none", ""),
        fmc.FusionRow("scripts_route", "PASS",     "e", "none", ""),
    ]
    rows = fmc.detect_contradictions(rows)
    for row in rows:
        assert row.contradiction == "none"


def test_contradiction_doc_ok_vs_run_blocked():
    rows = [
        fmc.FusionRow("doc_hygiene",   "DOCS_OK", "e", "none", ""),
        fmc.FusionRow("run_chain",     "BLOCKED", "e", "none", ""),
        fmc.FusionRow("scripts_route", "PASS",    "e", "none", ""),
    ]
    rows = fmc.detect_contradictions(rows)
    doc = next(r for r in rows if r.chain == "doc_hygiene")
    assert "run_chain:BLOCKED" in doc.contradiction


def test_contradiction_doc_ok_vs_scripts_review():
    rows = [
        fmc.FusionRow("doc_hygiene",   "DOCS_OK",         "e", "none", ""),
        fmc.FusionRow("run_chain",     "PROCEED",         "e", "none", ""),
        fmc.FusionRow("scripts_route", "REVIEW_REQUIRED", "e", "none", ""),
    ]
    rows = fmc.detect_contradictions(rows)
    doc = next(r for r in rows if r.chain == "doc_hygiene")
    assert "scripts_route:REVIEW_REQUIRED" in doc.contradiction


def test_problem_rows_get_none_contradiction():
    rows = [
        fmc.FusionRow("doc_hygiene",   "BLOCKED", "e", "none", ""),
        fmc.FusionRow("run_chain",     "PROCEED", "e", "none", ""),
        fmc.FusionRow("scripts_route", "PASS",    "e", "none", ""),
    ]
    rows = fmc.detect_contradictions(rows)
    doc = next(r for r in rows if r.chain == "doc_hygiene")
    assert doc.contradiction == "none"


# ── render_markdown_table ──────────────────────────────────

def test_markdown_table_contains_all_columns():
    rows = [fmc.FusionRow("doc_hygiene", "DOCS_OK", "e", "none", "none")]
    md = fmc.render_markdown_table(rows)
    for col in fmc.TABLE_COLS:
        assert col in md


def test_markdown_table_separator_line():
    rows = [fmc.FusionRow("doc_hygiene", "DOCS_OK", "e", "none", "none")]
    md = fmc.render_markdown_table(rows)
    lines = md.split("\n")
    assert "---" in lines[1]


def test_markdown_table_data_row_present():
    rows = [fmc.FusionRow("doc_hygiene", "DOCS_OK", "evidence_x", "none", "none")]
    md = fmc.render_markdown_table(rows)
    assert "doc_hygiene" in md
    assert "DOCS_OK" in md
    assert "evidence_x" in md


def test_markdown_table_pipe_delimited():
    rows = [fmc.FusionRow("c", "v", "e", "r", "x")]
    md = fmc.render_markdown_table(rows)
    for line in md.split("\n"):
        assert line.startswith("|")
        assert line.endswith("|")


# ── build_fusion_matrix_packet ─────────────────────────────

REQUIRED_KEYS = {
    "schema_version", "chain_id", "authority", "claim_verdict",
    "global_verdict", "problem_chains", "fusion_matrix", "rows",
}


def test_packet_has_required_keys():
    packet = fmc.build_fusion_matrix_packet(_doc_ok(), _run_proceed(), _scripts_clean())
    assert REQUIRED_KEYS.issubset(set(packet.keys()))


def test_packet_claim_verdict_no_claim():
    assert fmc.build_fusion_matrix_packet()["claim_verdict"] == "NO_CLAIM_ALLOWED"


def test_packet_authority_read_only():
    assert fmc.build_fusion_matrix_packet()["authority"] == "read_only"


def test_packet_global_verdict_pass_all_ok():
    packet = fmc.build_fusion_matrix_packet(_doc_ok(), _run_proceed(), _scripts_clean())
    assert packet["global_verdict"] == "PASS"
    assert packet["problem_chains"] == []


def test_packet_global_verdict_blocked_when_run_blocked():
    packet = fmc.build_fusion_matrix_packet(_doc_ok(), _run_blocked(), _scripts_clean())
    assert packet["global_verdict"] == "BLOCKED"
    assert "run_chain" in packet["problem_chains"]


def test_packet_global_verdict_blocked_when_scripts_dirty():
    packet = fmc.build_fusion_matrix_packet(_doc_ok(), _run_proceed(), _scripts_dirty())
    assert packet["global_verdict"] == "BLOCKED"
    assert "scripts_route" in packet["problem_chains"]


def test_packet_rows_count_is_three():
    packet = fmc.build_fusion_matrix_packet(_doc_ok(), _run_proceed(), _scripts_clean())
    assert len(packet["rows"]) == 3


def test_packet_no_inputs_produces_unknown_rows():
    packet = fmc.build_fusion_matrix_packet()
    for row in packet["rows"]:
        assert row["verdict"] == "UNKNOWN"


def test_packet_schema_version():
    assert fmc.build_fusion_matrix_packet()["schema_version"] == fmc.SCHEMA_VERSION


def test_packet_fusion_matrix_is_pipe_table():
    packet = fmc.build_fusion_matrix_packet(_doc_ok(), _run_proceed(), _scripts_clean())
    md = packet["fusion_matrix"]
    assert "|" in md
    assert "chain" in md
    assert "verdict" in md
