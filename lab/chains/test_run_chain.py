"""
test_run_chain.py — Tests pytest pour les 4 optimisations IMP-009 de run_chain.py
"""

import sys
import os
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(__file__))

import run_chain as rc


# ── Opt2 : _quick_lane_check ──────────────────────────────

def test_quick_lane_check_forbidden_auto_merge():
    assert rc._quick_lane_check("fix auto_merge_guard script") == "FORBIDDEN"

def test_quick_lane_check_forbidden_force_push():
    assert rc._quick_lane_check("We need to force push the branch") == "FORBIDDEN"

def test_quick_lane_check_forbidden_push_main():
    assert rc._quick_lane_check("push main after merge") == "FORBIDDEN"

def test_quick_lane_check_forbidden_dataset_reset():
    assert rc._quick_lane_check("dataset reset the training data") == "FORBIDDEN"

def test_quick_lane_check_forbidden_github():
    assert rc._quick_lane_check("modify .github/workflows") == "FORBIDDEN"

def test_quick_lane_check_human_required_src_chess():
    result = rc._quick_lane_check("modify src/chess/position.rs")
    assert result == "HUMAN_REQUIRED"

def test_quick_lane_check_human_required_search_rs():
    result = rc._quick_lane_check("update search.rs for better pruning")
    assert result == "HUMAN_REQUIRED"

def test_quick_lane_check_audit_required_src():
    result = rc._quick_lane_check("add a method in src/utils.py")
    assert result == "AUDIT_REQUIRED"

def test_quick_lane_check_safe_auto_lab():
    assert rc._quick_lane_check("add a test in lab/chains/") == "SAFE_AUTO"

def test_quick_lane_check_safe_auto_docs():
    assert rc._quick_lane_check("update documentation for the chain") == "SAFE_AUTO"

def test_quick_lane_check_case_insensitive():
    assert rc._quick_lane_check("AUTO_MERGE_GUARD needs a fix") == "FORBIDDEN"


# ── Opt3 : _inject_readback_hint ─────────────────────────

def test_inject_readback_hint_read_keyword():
    result = rc._inject_readback_hint("read the run_chain.py file")
    assert "READBACK_AUTO" in result

def test_inject_readback_hint_audit_keyword():
    result = rc._inject_readback_hint("audit the ml/ directory")
    assert "READBACK_AUTO" in result

def test_inject_readback_hint_check_keyword():
    result = rc._inject_readback_hint("check the imports in doc_hygiene")
    assert "READBACK_AUTO" in result

def test_inject_readback_hint_no_keyword():
    idea = "add a new test for the chain"
    assert rc._inject_readback_hint(idea) == idea

def test_inject_readback_hint_preserves_original_idea():
    idea = "read the config file"
    result = rc._inject_readback_hint(idea)
    assert result.startswith(idea)

def test_inject_readback_hint_keyword_uppercase():
    result = rc._inject_readback_hint("READ the file carefully")
    assert "READBACK_AUTO" in result


# ── Opt4 : _log_unbounded_creates ────────────────────────

def test_log_unbounded_creates_bounded_lab(tmp_path):
    eng = {"files_to_create": ["lab/chains/foo.py"]}
    with patch.object(rc, "CHAIN_HISTORY_RC", tmp_path / "history.jsonl"):
        unbounded = rc._log_unbounded_creates("abc", eng, "2026-01-01")
    assert unbounded == []
    assert not (tmp_path / "history.jsonl").exists()

def test_log_unbounded_creates_bounded_ml(tmp_path):
    eng = {"files_to_create": ["ml/train_helper.py"]}
    with patch.object(rc, "CHAIN_HISTORY_RC", tmp_path / "history.jsonl"):
        unbounded = rc._log_unbounded_creates("abc", eng, "2026-01-01")
    assert unbounded == []

def test_log_unbounded_creates_unbounded_path(tmp_path):
    eng = {"files_to_create": ["src/new_feature.rs"]}
    with patch.object(rc, "CHAIN_HISTORY_RC", tmp_path / "history.jsonl"):
        unbounded = rc._log_unbounded_creates("abc", eng, "2026-01-01")
    assert "src/new_feature.rs" in unbounded

def test_log_unbounded_creates_writes_history(tmp_path):
    eng = {"files_to_create": ["src/new_feature.rs"]}
    history_file = tmp_path / "history.jsonl"
    with patch.object(rc, "CHAIN_HISTORY_RC", history_file):
        rc._log_unbounded_creates("chain123", eng, "2026-05-31_120000")
    assert history_file.exists()
    event = json.loads(history_file.read_text(encoding="utf-8").strip())
    assert event["event"] == "UNBOUNDED_CREATE_DETECTED"
    assert event["chain_id"] == "chain123"
    assert event["claim_verdict"] == "NO_CLAIM_ALLOWED"
    assert "src/new_feature.rs" in event["files"]

def test_log_unbounded_creates_empty_list(tmp_path):
    eng = {"files_to_create": []}
    with patch.object(rc, "CHAIN_HISTORY_RC", tmp_path / "history.jsonl"):
        unbounded = rc._log_unbounded_creates("abc", eng, "2026-01-01")
    assert unbounded == []

def test_log_unbounded_creates_missing_key(tmp_path):
    eng = {}
    with patch.object(rc, "CHAIN_HISTORY_RC", tmp_path / "history.jsonl"):
        unbounded = rc._log_unbounded_creates("abc", eng, "2026-01-01")
    assert unbounded == []


# ── Opt1 : load_chain_history_summary ────────────────────

def test_load_chain_history_summary_no_file(tmp_path):
    with patch.object(rc, "CHAIN_HISTORY_RC", tmp_path / "nonexistent.jsonl"):
        result = rc.load_chain_history_summary(3)
    assert isinstance(result, str)
    assert "aucun" in result.lower() or "historique" in result.lower()

def test_load_chain_history_summary_reads_last_n(tmp_path):
    history_file = tmp_path / "history.jsonl"
    events = [
        {"timestamp": f"2026-01-0{i}", "chain": f"c{i}", "software_verdict": "PASS"}
        for i in range(1, 6)
    ]
    history_file.write_text(
        "\n".join(json.dumps(e) for e in events), encoding="utf-8"
    )
    with patch.object(rc, "CHAIN_HISTORY_RC", history_file):
        result = rc.load_chain_history_summary(3)
    # Les 3 derniers : c3, c4, c5
    assert "c3" in result or "c4" in result or "c5" in result
    assert "c1" not in result

def test_load_chain_history_summary_returns_string(tmp_path):
    history_file = tmp_path / "h.jsonl"
    history_file.write_text(
        json.dumps({"timestamp": "T1", "chain": "cx", "software_verdict": "PASS"}),
        encoding="utf-8"
    )
    with patch.object(rc, "CHAIN_HISTORY_RC", history_file):
        result = rc.load_chain_history_summary(3)
    assert isinstance(result, str)
    assert len(result) > 0


# ── Opt1+2+3 : intégration dans run_chain ────────────────

def test_run_chain_blocks_forbidden_idea():
    """Opt2 : run_chain doit bloquer sans appeler LM Studio si idée FORBIDDEN."""
    with patch.object(rc, "call_lm_studio") as mock_lm:
        result = rc.run_chain(idea="please force push to main now")
    mock_lm.assert_not_called()
    assert result["status"] == "BLOCKED_FORBIDDEN"
    assert result["claim_verdict"] == "NO_CLAIM_ALLOWED"
    assert result["software_verdict"] == "CHAIN_BLOCKED"

def test_run_chain_forbidden_auto_merge_guard_blocks():
    """Opt2 : auto_merge_guard est FORBIDDEN."""
    with patch.object(rc, "call_lm_studio") as mock_lm:
        result = rc.run_chain(idea="fix the auto_merge_guard.py script")
    mock_lm.assert_not_called()
    assert result["status"] == "BLOCKED_FORBIDDEN"

def test_run_translator_injects_history():
    """Opt1 : run_translator avec history_ctx inclut le contexte."""
    captured = {}
    def fake_lm(system, user_content, temperature=0.2):
        captured["user"] = user_content
        return json.dumps({"task_summary": "t", "claim_verdict": "NO_CLAIM_ALLOWED"})
    with patch.object(rc, "call_lm_studio", side_effect=fake_lm):
        rc.run_translator("my idea", history_ctx="recent: chain=c1 verdict=PASS")
    assert "CONTEXTE SESSIONS RECENTES" in captured["user"]
    assert "recent: chain=c1" in captured["user"]
    assert "my idea" in captured["user"]

def test_run_translator_no_history_passes_idea_directly():
    """Opt1 : sans history_ctx, l'idée est passée directement."""
    captured = {}
    def fake_lm(system, user_content, temperature=0.2):
        captured["user"] = user_content
        return json.dumps({"task_summary": "t", "claim_verdict": "NO_CLAIM_ALLOWED"})
    with patch.object(rc, "call_lm_studio", side_effect=fake_lm):
        rc.run_translator("plain idea")
    assert captured["user"] == "plain idea"
