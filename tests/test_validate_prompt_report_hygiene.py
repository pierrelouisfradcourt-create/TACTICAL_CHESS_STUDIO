import importlib.util
import io
import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch


SCRIPT_PATH = (
    Path(__file__).resolve().parents[1]
    / "scripts"
    / "control_plane"
    / "validate_prompt_report_hygiene.py"
)
SPEC = importlib.util.spec_from_file_location("validate_prompt_report_hygiene", SCRIPT_PATH)
assert SPEC is not None
validate_prompt_report_hygiene = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(validate_prompt_report_hygiene)


class PromptReportHygieneTests(TestCase):
    def test_prompt_with_required_boundaries_passes(self) -> None:
        prompt = """
        human intent: register docs only
        task_class: docs
        sources_to_read: AGENTS.md
        scope_in: docs/control-plane/**
        scope_out: src/**
        output_routing: docs/control-plane/
        blocked_actions: do not commit, do not push, no training, no benchmark proof
        validation: git diff --check
        final_report: commands_run, results, skipped_validation, risks
        claim_posture: NO_CLAIM_ALLOWED
        no_global_ready_verdict: true
        HumanGate required.
        """

        report = validate_prompt_report_hygiene.check_prompt(prompt)

        self.assertEqual("PASS", report["hygiene_status"])
        self.assertEqual([], report["missing_required_groups"])

    def test_prompt_missing_output_routing_blocks(self) -> None:
        prompt = """
        human intent: register docs only
        task_class: docs
        sources_to_read: AGENTS.md
        scope_in: docs/control-plane/**
        scope_out: src/**
        blocked_actions: commit, push, runtime activation
        validation: git diff --check
        final_report: commands_run, results, skipped_validation, risks
        claim_posture: NO_CLAIM_ALLOWED
        no_global_ready_verdict: true
        """

        report = validate_prompt_report_hygiene.check_prompt(prompt)

        self.assertEqual("BLOCKED", report["hygiene_status"])
        self.assertIn("output_routing", report["missing_required_groups"])

    def test_json_execution_report_fixture_passes_passive_hygiene(self) -> None:
        payload = {
            "schema_version": "sp-202-v0",
            "task_id": "SP202-DOCS-001",
            "branch": "main",
            "changed_files": ["docs/control-plane/example.md"],
            "commands_run": ["git diff --check"],
            "commands_skipped": ["runtime tests"],
            "validation_results": [{"name": "diff_check", "status": "PASS"}],
            "tests_passed": 0,
            "tests_failed": 0,
            "known_risks": ["docs-only evidence"],
            "scope_deviation": "NONE",
            "claim_verdict": "NO_CLAIM_ALLOWED",
        }

        report = validate_prompt_report_hygiene.check_json_execution_report(payload)

        self.assertEqual("PASS", report["hygiene_status"])
        self.assertEqual([], report["missing_required_groups"])

    def test_cli_blocks_missing_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            missing = Path(tmp_dir) / "missing.md"
            with patch(
                "sys.argv",
                ["validate_prompt_report_hygiene.py", str(missing)],
            ), patch("sys.stdout", new_callable=io.StringIO):
                self.assertEqual(2, validate_prompt_report_hygiene.main())


if __name__ == "__main__":
    import unittest

    unittest.main()
