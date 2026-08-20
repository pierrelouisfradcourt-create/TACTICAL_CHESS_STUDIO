"""
test_scripts_route_chain.py — Tests pytest pour scripts_route_chain.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import pytest
from pathlib import Path
from unittest.mock import patch

import scripts_route_chain as src


# ── Helpers ───────────────────────────────────────────────

def _write(path: Path, content: str) -> Path:
    path.write_text(content, encoding="utf-8")
    return path


# ── 1 : scan_scripts_dir ──────────────────────────────────

def test_scan_scripts_dir_returns_py_files(tmp_path):
    _write(tmp_path / "foo.py", "# foo")
    _write(tmp_path / "bar.py", "# bar")
    (tmp_path / "not_python.txt").write_text("ignored")

    result = src.scan_scripts_dir(tmp_path)
    names = [p.name for p in result]
    assert "foo.py" in names
    assert "bar.py" in names
    assert "not_python.txt" not in names


def test_scan_scripts_dir_missing_dir_returns_empty(tmp_path):
    result = src.scan_scripts_dir(tmp_path / "nonexistent")
    assert result == []


# ── 2 : classify_route_role ───────────────────────────────

def test_classify_route_role_implementation(tmp_path):
    for prefix in ("run_loop.py", "build_packet.py", "compile_mission.py",
                   "render_report.py", "prepare_handoff.py"):
        p = tmp_path / prefix
        assert src.classify_route_role(p) == "official_implementation_candidate", prefix


def test_classify_route_role_validation(tmp_path):
    for prefix in ("smoke_loop.py", "validate_packet.py", "check_hygiene.py"):
        p = tmp_path / prefix
        assert src.classify_route_role(p) == "validation_candidate", prefix


def test_classify_route_role_unknown(tmp_path):
    assert src.classify_route_role(tmp_path / "studioctl.py") == "UNKNOWN"


# ── 3 : detect_path_drift ─────────────────────────────────

def test_detect_path_drift_same_content(tmp_path):
    dir_a = tmp_path / "a"
    dir_b = tmp_path / "b"
    dir_a.mkdir(); dir_b.mkdir()
    _write(dir_a / "foo.py", "# identical")
    _write(dir_b / "foo.py", "# identical")

    scripts = {"dir_a": [dir_a / "foo.py"], "dir_b": [dir_b / "foo.py"]}
    drift = src.detect_path_drift(scripts, tmp_path)

    assert len(drift) == 1
    assert drift[0]["filename"] == "foo.py"
    assert drift[0]["status"] == "matching_sha256"


def test_detect_path_drift_different_content(tmp_path):
    dir_a = tmp_path / "a"
    dir_b = tmp_path / "b"
    dir_a.mkdir(); dir_b.mkdir()
    _write(dir_a / "foo.py", "# version A")
    _write(dir_b / "foo.py", "# version B")

    scripts = {"dir_a": [dir_a / "foo.py"], "dir_b": [dir_b / "foo.py"]}
    drift = src.detect_path_drift(scripts, tmp_path)

    assert len(drift) == 1
    assert drift[0]["status"] == "drifted"


def test_detect_path_drift_no_overlap(tmp_path):
    dir_a = tmp_path / "a"
    dir_b = tmp_path / "b"
    dir_a.mkdir(); dir_b.mkdir()
    _write(dir_a / "alpha.py", "# a")
    _write(dir_b / "beta.py", "# b")

    scripts = {"dir_a": [dir_a / "alpha.py"], "dir_b": [dir_b / "beta.py"]}
    drift = src.detect_path_drift(scripts, tmp_path)
    assert drift == []


def test_detect_path_drift_humangate_question(tmp_path):
    dir_a = tmp_path / "a"; dir_a.mkdir()
    dir_b = tmp_path / "b"; dir_b.mkdir()
    _write(dir_a / "foo.py", "x"); _write(dir_b / "foo.py", "y")

    scripts = {"a": [dir_a / "foo.py"], "b": [dir_b / "foo.py"]}
    drift = src.detect_path_drift(scripts, tmp_path)
    assert "foo.py" in drift[0]["humangate_question"]


# ── 4 : detect_stale_refs ────────────────────────────────

def test_detect_stale_refs_finds_stale(tmp_path):
    script = _write(
        tmp_path / "bad.py",
        'path = "scripts/control_plane/compile_next_mission_dry_run.py"',
    )
    stale = src.detect_stale_refs({"d": [script]}, tmp_path)
    assert len(stale) == 1
    assert "scripts/control_plane" in stale[0]["stale_ref"]
    assert stale[0]["status"] == "not_found"


def test_detect_stale_refs_ignores_studiov2_path(tmp_path):
    script = _write(
        tmp_path / "good.py",
        'path = "scripts/studioV2/control_plane/compile_next_mission_dry_run.py"',
    )
    stale = src.detect_stale_refs({"d": [script]}, tmp_path)
    assert stale == []


def test_detect_stale_refs_no_refs(tmp_path):
    script = _write(tmp_path / "clean.py", "# nothing here\nprint('hello')")
    stale = src.detect_stale_refs({"d": [script]}, tmp_path)
    assert stale == []


# ── 5 : build_scripts_route_packet ───────────────────────

REQUIRED_TOP_KEYS = {
    "schema_version", "chain_id", "authority", "claim_verdict",
    "blocked_actions", "content", "path_drift_candidates", "stale_refs", "summary",
}

def test_packet_has_required_keys():
    packet = src.build_scripts_route_packet()
    assert REQUIRED_TOP_KEYS.issubset(set(packet.keys()))


def test_packet_claim_verdict_is_no_claim():
    packet = src.build_scripts_route_packet()
    assert packet["claim_verdict"] == "NO_CLAIM_ALLOWED"


def test_packet_authority_is_read_only():
    packet = src.build_scripts_route_packet()
    assert packet["authority"] == "read_only"


def test_packet_blocked_actions_complete():
    packet = src.build_scripts_route_packet()
    for action in src.BLOCKED_ACTIONS:
        assert action in packet["blocked_actions"]


def test_packet_summary_counts_are_integers():
    packet = src.build_scripts_route_packet()
    s = packet["summary"]
    for key in ("scripts_uxpilote_count", "scripts_studioV2_count",
                "scripts_control_plane_count", "path_drift_count", "stale_refs_count"):
        assert isinstance(s[key], int), f"{key} should be int"


def test_packet_content_has_three_dirs():
    packet = src.build_scripts_route_packet()
    scripts = packet["content"]["scripts"]
    assert set(scripts.keys()) == {"uxpilote", "studioV2", "control_plane"}


def test_packet_schema_version():
    packet = src.build_scripts_route_packet()
    assert packet["schema_version"] == src.SCHEMA_VERSION


def test_packet_chain_id():
    packet = src.build_scripts_route_packet()
    assert packet["chain_id"] == src.CHAIN_ID
