from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
STUDIOCTL_PATH = PROJECT_ROOT / "scripts" / "studioV2" / "studioctl.py"
FORBIDDEN_WRITE_SAMPLE = PROJECT_ROOT / "src" / "SHOULD_NOT_WRITE.md"
FORBIDDEN_SECRET_SAMPLE = PROJECT_ROOT / "secrets" / "SHOULD_NOT_READ.md"


def load_studioctl():
    spec = importlib.util.spec_from_file_location("studioctl_under_test", STUDIOCTL_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {STUDIOCTL_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


studioctl = load_studioctl()


class StudioctlCliTests(unittest.TestCase):
    def run_cli_json(self, argv: list[str]) -> tuple[int, dict]:
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            exit_code = studioctl.main(argv)
        return exit_code, json.loads(stdout.getvalue())

    def test_status_json_reports_runtime_claim_gate(self) -> None:
        exit_code, payload = self.run_cli_json(["status", "--json"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["schema_version"], "studioctl_status.v0")
        self.assertEqual(payload["command"], "status")
        self.assertEqual(payload["claim_posture"], "NO_CLAIM_ALLOWED")
        self.assertIs(payload["no_global_ready_verdict"], True)
        self.assertEqual(payload["runtime_claim_gate"]["actual_runtime"], "UNKNOWN")
        self.assertEqual(payload["runtime_claim_gate"]["runtime_status"], "BLOCKED")
        self.assertIs(payload["runtime_claim_gate"]["exact_runtime_claim_allowed"], False)

    def test_routes_check_allows_roadmap_status_destination(self) -> None:
        exit_code, payload = self.run_cli_json(
            [
                "routes",
                "check",
                "--surface",
                "roadmap_docs_only",
                "--output",
                "00_STUDIO_CONTROL/05_STATUS/EXAMPLE.md",
                "--json",
            ]
        )

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["schema_version"], "studioctl_route_check.v0")
        self.assertIs(payload["destination_allowed"], True)
        self.assertEqual(payload["forbidden_destination_hits"], [])
        self.assertIs(payload["creates_file"], False)
        self.assertIs(payload["creates_directory"], False)
        self.assertIs(payload["would_create_file"], False)
        self.assertEqual(payload["promotion_gate"], "HumanGate")
        self.assertEqual(payload["claim_posture"], "NO_CLAIM_ALLOWED")

    def test_routes_check_blocks_runtime_source_destination_without_writing(self) -> None:
        if FORBIDDEN_WRITE_SAMPLE.exists():
            self.fail(f"Forbidden sample already exists before test: {FORBIDDEN_WRITE_SAMPLE}")

        exit_code, payload = self.run_cli_json(
            [
                "routes",
                "check",
                "--surface",
                "roadmap_docs_only",
                "--output",
                "src/SHOULD_NOT_WRITE.md",
                "--json",
            ]
        )

        self.assertEqual(exit_code, 2)
        self.assertIs(payload["destination_allowed"], False)
        self.assertIn("runtime_source_directory", payload["forbidden_destination_hits"])
        self.assertIn("FORBIDDEN_DESTINATION", payload["reasons"])
        self.assertIs(payload["creates_file"], False)
        self.assertIs(payload["creates_directory"], False)
        self.assertIs(payload["would_create_file"], False)
        self.assertFalse(FORBIDDEN_WRITE_SAMPLE.exists())

    def test_sources_scan_json_reports_source_state_dimensions(self) -> None:
        exit_code, payload = self.run_cli_json(["sources", "scan", "--json"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["schema_version"], "studioctl_sources_scan.v0")
        self.assertEqual(payload["command"], "sources scan")
        self.assertEqual(payload["claim_posture"], "NO_CLAIM_ALLOWED")
        self.assertIs(payload["no_global_ready_verdict"], True)
        self.assertGreater(len(payload["sources"]), 0)
        for source in payload["sources"]:
            self.assertIn("created", source)
            self.assertIn("registered", source)
            self.assertIn("loaded", source)
            self.assertIn("enforced", source)
            self.assertIn("evidenced", source)

    def test_evidence_board_json_keeps_claim_boundary(self) -> None:
        exit_code, payload = self.run_cli_json(["evidence", "board", "--json"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["schema_version"], "studioctl_evidence_board.v0")
        self.assertEqual(payload["command"], "evidence board")
        self.assertEqual(payload["claim_posture"], "NO_CLAIM_ALLOWED")
        self.assertIs(payload["no_global_ready_verdict"], True)
        self.assertEqual(payload["runtime_claim_gate"]["runtime_status"], "BLOCKED")
        self.assertEqual(payload["route_state_summary"]["candidate_output"], "00_STUDIO_CONTROL/05_STATUS/EXAMPLE.md")
        self.assertEqual(payload["source_state_summary"]["evidence_source_type"], "source_readback")

    def test_report_inspect_blocks_secrets_path_without_read_attempt(self) -> None:
        exit_code, payload = self.run_cli_json(
            ["report", "inspect", "secrets/SHOULD_NOT_READ.md", "--json"]
        )

        self.assertEqual(exit_code, 2)
        self.assertEqual(payload["schema_version"], "studioctl_report_inspect.v0")
        self.assertIs(payload["forbidden_path"], True)
        self.assertIn("secrets", payload["forbidden_path_hits"])
        self.assertIs(payload["read_attempted"], False)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("FORBIDDEN_PATH_NOT_READ", payload["reasons"])

    def test_charter_render_json_is_stdout_only(self) -> None:
        exit_code, payload = self.run_cli_json(
            [
                "charter",
                "render",
                "--profile",
                "hygiene",
                "--task-id",
                "TASK-HYGIENE-001",
                "--title",
                "Check route hygiene",
                "--target",
                "00_STUDIO_CONTROL/05_STATUS",
                "--surface",
                "roadmap_docs_only",
                "--json",
            ]
        )

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["schema_version"], "studioctl_charter_render.v0")
        self.assertIs(payload["writes_file"], False)
        self.assertIs(payload["executes_charter"], False)
        self.assertEqual(payload["task_charter_candidate"]["output_routing"]["actual_destination"], "STDOUT_ONLY")
        self.assertEqual(payload["task_charter_candidate"]["claim_posture"], "NO_CLAIM_ALLOWED")
        self.assertIs(payload["no_global_ready_verdict"], True)

    def test_forbidden_sample_files_are_not_created(self) -> None:
        self.assertFalse(FORBIDDEN_WRITE_SAMPLE.exists())
        self.assertFalse(FORBIDDEN_SECRET_SAMPLE.exists())


if __name__ == "__main__":
    unittest.main()
