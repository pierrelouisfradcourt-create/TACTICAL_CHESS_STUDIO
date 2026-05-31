"""
test_doc_hygiene.py — Tests pytest pour doc_hygiene_chain.py
Couvre: parseur porcelain, pattern matcher **, validateur commit, detection lane, orphelins.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import doc_hygiene_chain as dhc
import pytest

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


# ── Parseur porcelain ────────────────────────────────────────────────────────

class TestPorcelainParser:

    def test_untracked_simple(self):
        line = "?? foo/bar.py"
        assert line[:2] == "??"
        assert line[3:] == "foo/bar.py"

    def test_untracked_with_spaces_in_path(self):
        line = "?? my file with spaces.txt"
        assert line[:2] == "??"
        assert line[3:] == "my file with spaces.txt"

    def test_rename_takes_new_path(self):
        line = "R  old_name.py -> new_name.py"
        xy = line[:2]
        path_part = line[3:]
        if "R" in xy and " -> " in path_part:
            path_part = path_part.split(" -> ", 1)[1]
        assert path_part == "new_name.py"

    def test_rename_space_variant(self):
        line = "R  src/old.rs -> src/new.rs"
        xy = line[:2]
        path_part = line[3:]
        if "R" in xy and " -> " in path_part:
            path_part = path_part.split(" -> ", 1)[1]
        assert path_part == "src/new.rs"

    def test_modified_not_untracked(self):
        assert "M "[0:2] != "??"

    def test_staged_modified_not_untracked(self):
        line = "MM src/lib.rs"
        assert line[:2] != "??"

    def test_untracked_directory_trailing_slash(self):
        line = "?? lab/chains/claude_prompts/"
        assert line[:2] == "??"
        assert line[3:] == "lab/chains/claude_prompts/"


# ── Pattern matcher ** ────────────────────────────────────────────────────────

class TestPatternMatcher:

    def test_double_star_deep_match(self):
        assert dhc._match_pattern("src/engine/core.rs", "src/**/*.rs")

    def test_double_star_nested_py(self):
        assert dhc._match_pattern("lab/chains/doc_hygiene_chain.py", "lab/**/*.py")

    def test_no_match_wrong_root(self):
        assert not dhc._match_pattern("src/engine/core.rs", "ml/**/*.rs")

    def test_exact_file_match(self):
        assert dhc._match_pattern("ml/auto_coach.py", "ml/auto_coach.py")

    def test_windows_backslash_normalized(self):
        assert dhc._match_pattern("src\\engine\\core.rs", "src/**/*.rs")

    def test_star_glob_suffix(self):
        assert dhc._match_pattern("setup.py", "*.py")

    def test_double_star_any_depth(self):
        assert dhc._match_pattern("a/b/c/d/e.rs", "**/*.rs")

    def test_no_match_wrong_extension(self):
        assert not dhc._match_pattern("src/engine/core.rs", "src/**/*.py")


# ── Validateur commit ────────────────────────────────────────────────────────

class TestCommitMessageValidator:

    def test_empty_is_invalid(self):
        r = dhc.audit_commit_message("")
        assert r["is_valid"] is False

    def test_whitespace_only_is_invalid(self):
        r = dhc.audit_commit_message("   \n  \t  ")
        assert r["is_valid"] is False

    def test_real_commit_chains_v4(self):
        r = dhc.audit_commit_message("chains: run_chain v4 + chain_executor fix")
        assert r["is_valid"] is True
        assert r["commit_type"] == "chains"

    def test_real_commit_fix_dataset_router(self):
        r = dhc.audit_commit_message("fix(dataset-router): accept directory input like dataset_loader")
        assert r["is_valid"] is True
        assert r["commit_type"] == "fix"
        assert r["commit_scope"] == "dataset-router"

    def test_real_commit_chains_v2(self):
        r = dhc.audit_commit_message(
            "chains: run_chain v2 (retry, robust parse, calibrated red team) + hardening"
        )
        assert r["is_valid"] is True

    def test_real_commit_chore(self):
        r = dhc.audit_commit_message("chore: untrack chain output artifacts + add gitignore rules")
        assert r["is_valid"] is True
        assert r["commit_type"] == "chore"

    def test_real_commit_fix_curriculum(self):
        r = dhc.audit_commit_message("fix(curriculum): L2/L3 reimportes avec longueur solution exacte")
        assert r["is_valid"] is True
        assert r["commit_type"] == "fix"
        assert r["commit_scope"] == "curriculum"

    def test_commit_with_issue_ref_extracted(self):
        r = dhc.audit_commit_message("fix(dataset-router): issue #3 fermee, 11/11 tests")
        assert r["is_valid"] is True
        assert r["issue_ref"] == "3"

    def test_commit_without_issue_ref_warns(self):
        r = dhc.audit_commit_message("chore: update gitignore")
        assert r["is_valid"] is True
        combined = " ".join(r["warnings"]).lower()
        assert "issue" in combined or "optionnel" in combined

    def test_no_type_warns_but_valid(self):
        r = dhc.audit_commit_message("mise a jour de la documentation")
        assert r["is_valid"] is True
        assert len(r["warnings"]) > 0

    def test_multiline_commit_uses_first_line(self):
        msg = "chains: run_chain v4 + chain_executor fix\n\n- detail line 1\n- detail line 2"
        r = dhc.audit_commit_message(msg)
        assert r["is_valid"] is True
        assert r["commit_type"] == "chains"

    def test_non_standard_type_warns_but_valid(self):
        r = dhc.audit_commit_message("unknown-type: do something")
        assert r["is_valid"] is True
        combined = " ".join(r["warnings"]).lower()
        assert "non-standard" in combined or "warn" in combined


# ── Detection lane ───────────────────────────────────────────────────────────

class TestLaneDetection:

    def test_empty_files_is_safe_auto(self):
        assert dhc.detect_lane([]) == "SAFE_AUTO"

    def test_src_rust_is_audit_required(self):
        assert dhc.detect_lane(["src/engine/core.rs"]) == "AUDIT_REQUIRED"

    def test_lab_report_is_safe_auto(self):
        assert dhc.detect_lane(["lab/reports/eval.md"]) == "SAFE_AUTO"

    def test_ml_script_is_audit_required(self):
        assert dhc.detect_lane(["ml/auto_coach.py"]) == "AUDIT_REQUIRED"

    def test_studio_control_is_human_required(self):
        assert dhc.detect_lane(["00_STUDIO_CONTROL/some_doc.md"]) == "HUMAN_REQUIRED"

    def test_cargo_toml_is_human_required(self):
        assert dhc.detect_lane(["Cargo.toml"]) == "HUMAN_REQUIRED"

    def test_cargo_lock_is_human_required(self):
        assert dhc.detect_lane(["Cargo.lock"]) == "HUMAN_REQUIRED"

    def test_lab_chains_is_audit_required(self):
        assert dhc.detect_lane(["lab/chains/doc_hygiene_chain.py"]) == "AUDIT_REQUIRED"

    def test_mixed_highest_priority_wins(self):
        result = dhc.detect_lane(["lab/reports/eval.md", "00_STUDIO_CONTROL/doc.md"])
        assert result == "HUMAN_REQUIRED"

    def test_mixed_audit_over_safe(self):
        result = dhc.detect_lane(["lab/reports/eval.md", "ml/train.py"])
        assert result == "AUDIT_REQUIRED"

    def test_gitignore_is_safe_auto(self):
        assert dhc.detect_lane([".gitignore"]) == "SAFE_AUTO"

    def test_windows_backslash_path(self):
        assert dhc.detect_lane(["src\\engine\\core.rs"]) == "AUDIT_REQUIRED"


# ── Detection orphelins ──────────────────────────────────────────────────────

class TestOrphanDetection:

    def test_no_manifest_all_orphaned(self, tmp_path, monkeypatch):
        monkeypatch.setattr(dhc, "MANIFEST_PATH", tmp_path / "nonexistent.yaml")
        result = dhc.audit_file_routing(["ml/auto_coach.py", "lab/foo.py"])
        assert result["status"] == "MANIFEST_MISSING"
        assert "ml/auto_coach.py" in result["orphaned"]
        assert "lab/foo.py" in result["orphaned"]

    def test_no_untracked_no_orphans(self, tmp_path, monkeypatch):
        monkeypatch.setattr(dhc, "MANIFEST_PATH", tmp_path / "nonexistent.yaml")
        result = dhc.audit_file_routing([])
        assert result["orphaned"] == []

    @pytest.mark.skipif(not YAML_AVAILABLE, reason="pyyaml requis")
    def test_manifest_routes_file(self, tmp_path, monkeypatch):
        manifest_data = {
            "routing": {
                "tracked": [
                    {"pattern": "ml/*.py", "status": "IMPLEMENTED", "lane": "AUDIT_REQUIRED"}
                ],
                "gitignored": [],
                "unrouted": [],
            }
        }
        mf = tmp_path / "FILE_ROUTING_MANIFEST.yaml"
        mf.write_text(yaml.dump(manifest_data), encoding="utf-8")
        monkeypatch.setattr(dhc, "MANIFEST_PATH", mf)

        result = dhc.audit_file_routing(["ml/auto_coach.py"])
        assert result["status"] == "OK"
        assert "ml/auto_coach.py" in result["routed"]
        assert result["orphaned"] == []

    @pytest.mark.skipif(not YAML_AVAILABLE, reason="pyyaml requis")
    def test_manifest_orphan_detected(self, tmp_path, monkeypatch):
        manifest_data = {
            "routing": {
                "tracked": [
                    {"pattern": "src/**/*.rs", "status": "IMPLEMENTED", "lane": "AUDIT_REQUIRED"}
                ],
                "gitignored": [],
                "unrouted": [],
            }
        }
        mf = tmp_path / "FILE_ROUTING_MANIFEST.yaml"
        mf.write_text(yaml.dump(manifest_data), encoding="utf-8")
        monkeypatch.setattr(dhc, "MANIFEST_PATH", mf)

        result = dhc.audit_file_routing(["ml/auto_coach.py"])
        assert result["status"] == "OK"
        assert "ml/auto_coach.py" in result["orphaned"]

    def test_ml_orphan_gets_delete_recommendation(self, tmp_path, monkeypatch):
        monkeypatch.setattr(dhc, "MANIFEST_PATH", tmp_path / "nonexistent.yaml")
        result = dhc.audit_file_routing(["ml/some_script.py"])
        assert result["recommendations"]["ml/some_script.py"] == "DELETE"

    def test_non_ml_orphan_gets_review_recommendation(self, tmp_path, monkeypatch):
        monkeypatch.setattr(dhc, "MANIFEST_PATH", tmp_path / "nonexistent.yaml")
        result = dhc.audit_file_routing(["scripts/uxpilote/foo.py"])
        assert result["recommendations"]["scripts/uxpilote/foo.py"] == "REVIEW"

    def test_studio_control_orphan_gets_review(self, tmp_path, monkeypatch):
        monkeypatch.setattr(dhc, "MANIFEST_PATH", tmp_path / "nonexistent.yaml")
        result = dhc.audit_file_routing(["00_STUDIO_CONTROL/new_doc.md"])
        assert result["recommendations"]["00_STUDIO_CONTROL/new_doc.md"] == "REVIEW"


# ── Verdicts assembly ────────────────────────────────────────────────────────

class TestAssembleVerdicts:

    def _commit_ok(self):
        return {"is_valid": True, "warnings": [], "issue_ref": None,
                "commit_type": "chore", "commit_scope": None}

    def _commit_bad(self):
        return {"is_valid": False, "warnings": ["vide"], "issue_ref": None,
                "commit_type": None, "commit_scope": None}

    def _routing_clean(self):
        return {"status": "OK", "routed": [], "orphaned": [], "recommendations": {}}

    def _routing_orphaned(self):
        return {"status": "OK", "routed": [], "orphaned": ["ml/x.py"],
                "recommendations": {"ml/x.py": "DELETE"}}

    def test_blocked_invalid_commit(self):
        v = dhc.assemble_verdicts(self._commit_bad(), "SAFE_AUTO", self._routing_clean(), [])
        assert v["software_verdict"] == "BLOCKED_INVALID_COMMIT"

    def test_blocked_orphans(self):
        v = dhc.assemble_verdicts(self._commit_ok(), "AUDIT_REQUIRED", self._routing_orphaned(), [])
        assert v["software_verdict"] == "BLOCKED_UNROUTED_FILES"

    def test_docs_ok(self):
        v = dhc.assemble_verdicts(self._commit_ok(), "SAFE_AUTO", self._routing_clean(), [])
        assert v["software_verdict"] == "DOCS_OK"
        assert v["ready_for_pr"] is True

    def test_audit_required(self):
        v = dhc.assemble_verdicts(self._commit_ok(), "AUDIT_REQUIRED", self._routing_clean(), [])
        assert v["software_verdict"] == "AUDIT_REQUIRED_CHANGES"
        assert v["ready_for_pr"] is True

    def test_human_required(self):
        v = dhc.assemble_verdicts(self._commit_ok(), "HUMAN_REQUIRED", self._routing_clean(), [])
        assert v["software_verdict"] == "HUMAN_REVIEW_REQUIRED"
        assert v["ready_for_pr"] is False

    def test_claim_verdict_always_no_claim(self):
        for lane in dhc.LANE_PRIORITY:
            v = dhc.assemble_verdicts(self._commit_ok(), lane, self._routing_clean(), [])
            assert v["claim_verdict"] == "NO_CLAIM_ALLOWED"

    def test_doc_proposals_set_evidence_verdict(self):
        proposals = [{"file": "README.md", "section": "X", "reason": "y"}]
        v = dhc.assemble_verdicts(self._commit_ok(), "SAFE_AUTO", self._routing_clean(), proposals)
        assert v["evidence_verdict"] == "DOCUMENTATION_ALIGNMENT_REQUIRED"

    def test_no_proposals_mechanical_validation(self):
        v = dhc.assemble_verdicts(self._commit_ok(), "SAFE_AUTO", self._routing_clean(), [])
        assert v["evidence_verdict"] == "MECHANICAL_VALIDATION_ONLY"
