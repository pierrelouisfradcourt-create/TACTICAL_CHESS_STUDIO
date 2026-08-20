from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import sys
import tempfile
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

    def run_cli_text(self, argv: list[str]) -> tuple[int, str]:
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            exit_code = studioctl.main(argv)
        return exit_code, stdout.getvalue()

    def write_temp_report(self, text: str) -> Path:
        temp_dir = tempfile.TemporaryDirectory(dir=PROJECT_ROOT)
        self.addCleanup(temp_dir.cleanup)
        report_path = Path(temp_dir.name) / "executor_report.md"
        report_path.write_text(text, encoding="utf-8")
        return report_path

    def complete_executor_report(self) -> str:
        return """
task_id: TASK-MATRIX-PARSER-SAMPLE-001
codex_runtime:
  requested_model: gpt-5.5
  actual_runtime: UNKNOWN
  runtime_status: BLOCKED
preflight:
  cwd: C:/TACTICAL_CHESS_STUDIO
  branch: master
  HEAD: 5e48ed310a5047eb21bd4825da858e3a08e0c950
  worktree_status: dirty
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: DOCUMENTED_ONLY
  evidenced: DOCUMENTED_ONLY
route_check:
  status: DOCUMENTED_ONLY
output_routing_result:
  actual_destination: stdout/final_response_only
files_changed:
  - scripts/studioV2/studioctl.py
commands_run:
  - .\\.venv312\\Scripts\\python.exe -m unittest tests.studioV2.test_studioctl
validation:
  status: TESTED
skipped_validation:
  - broader_validation: BLOCKED
risks:
  - bounded parser only
status_by_surface:
  active_runtime_code: IMPLEMENTED
  tests: TESTED
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE
software_verdict:
  active_runtime_code: IMPLEMENTED
  tests: TESTED
  canonical_docs: DOCUMENTED_ONLY
evidence_verdict:
  active_runtime_code: TESTED
  tests: TESTED
  canonical_docs: TESTED
claim_verdict:
  active_runtime_code: NO_CLAIM_ALLOWED
  tests: NO_CLAIM_ALLOWED
  canonical_docs: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
recommended_next_tasks:
  - HumanGate may review the candidate output before any matrix write.
"""

    def repo_reference_alias_report(self) -> str:
        return """
task_id: REPORT-PARSER-ALIAS-SAMPLE-001
codex_runtime:
  requested_model: gpt-5.5
  actual_runtime: UNKNOWN
  runtime_status: BLOCKED
repo_reference:
  path: C:/TACTICAL_CHESS_STUDIO
  branch: master
  head: 5e48ed310a5047eb21bd4825da858e3a08e0c950
  worktree_status_before_changes: dirty_with_pre_existing_changes
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: DOCUMENTED_ONLY
  evidenced: DOCUMENTED_ONLY
route_check:
  status: DOCUMENTED_ONLY
output_routing_result:
  actual_destination: stdout/final_response_only
files_changed:
  by_this_task:
    - scripts/studioV2/studioctl.py
commands_run:
  - command: git status --short
  - command: .\\.venv312\\Scripts\\python.exe -m unittest tests.studioV2.test_studioctl
validation:
  result: TESTED
skipped_validation:
  - broader_validation: BLOCKED
risks:
  - alias parser only
status_by_surface:
  active_runtime_code: IMPLEMENTED
  tests: TESTED
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE
software_verdict:
  active_runtime_code: IMPLEMENTED
  tests: TESTED
  canonical_docs: DOCUMENTED_ONLY
evidence_verdict:
  active_runtime_code: TESTED
  tests: TESTED
  canonical_docs: TESTED
claim_verdict:
  active_runtime_code: NO_CLAIM_ALLOWED
  tests: NO_CLAIM_ALLOWED
  canonical_docs: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
next_tasks:
  - HumanGate reviews the alias-hardened candidate.
"""

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

    def test_surface_map_json_reports_controlled_surface_boundaries(self) -> None:
        exit_code, payload = self.run_cli_json(["surface", "map", "--json"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["schema_version"], "studioctl_surface_map.v0")
        self.assertEqual(payload["command"], "surface map")
        self.assertEqual(payload["claim_posture"], "NO_CLAIM_ALLOWED")
        self.assertIs(payload["no_global_ready_verdict"], True)
        self.assertEqual(payload["runtime_claim_gate"]["runtime_status"], "BLOCKED")
        self.assertIs(payload["secrets_boundary"]["content_read_attempted"], False)
        self.assertIs(payload["secrets_boundary"]["recursive_scan_attempted"], False)
        self.assertEqual(payload["secrets_boundary"]["status"], "BLOCKED")

        surfaces = {item["surface"]: item for item in payload["surfaces"]}
        expected_surfaces = {
            "active_runtime_code",
            "tests",
            "artifacts_runtime_outputs",
            "canonical_docs",
            "roadmap_docs_only",
            "scripts_tooling",
            "inference",
            "lab",
            "schemas",
            "models_datasets",
            "secrets",
        }
        self.assertEqual(set(surfaces), expected_surfaces)
        for surface in surfaces.values():
            for field in (
                "surface",
                "path",
                "exists",
                "status",
                "owner_hint",
                "authority_boundary",
                "read_policy",
                "write_policy",
            ):
                self.assertIn(field, surface)
        self.assertEqual(surfaces["secrets"]["read_policy"], "path_exists_only_no_recurse_no_content_read")
        self.assertEqual(surfaces["secrets"]["write_policy"], "BLOCKED")
        self.assertEqual(surfaces["models_datasets"]["read_policy"], "path_exists_only_no_content_read")

    def test_surface_map_text_reports_without_writing(self) -> None:
        exit_code, output = self.run_cli_text(["surface", "map"])

        self.assertEqual(exit_code, 0)
        self.assertIn("studioctl surface map", output)
        self.assertIn("active_runtime_code", output)
        self.assertIn("secrets_boundary", output)
        self.assertIn("NO_CLAIM_ALLOWED", output)
        self.assertIn("no_global_ready_verdict: True", output)
        self.assertFalse(FORBIDDEN_WRITE_SAMPLE.exists())
        self.assertFalse(FORBIDDEN_SECRET_SAMPLE.exists())

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

    def test_logistic_propose_next_json_is_passive_stdout_only(self) -> None:
        matrix_path = PROJECT_ROOT / "00_STUDIO_CONTROL/05_STATUS/STUDIO_MASTER_TASK_MATRIX_V0.yaml"
        registry_path = PROJECT_ROOT / "00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml"
        matrix_before = matrix_path.read_text(encoding="utf-8") if matrix_path.exists() else None
        registry_before = registry_path.read_text(encoding="utf-8") if registry_path.exists() else None

        exit_code, payload = self.run_cli_json(["logistic", "propose-next", "--json"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["schema_version"], "studioctl_logistic_proposal.v0")
        self.assertEqual(payload["command"], "logistic propose-next")
        self.assertEqual(payload["mode"], "PASSIVE")
        self.assertEqual(payload["write_access"], "BLOCKED")
        self.assertEqual(payload["agent_activation"], "BLOCKED")
        self.assertEqual(payload["task_matrix_write"], "BLOCKED")
        self.assertEqual(payload["source_registration_write"], "BLOCKED")
        self.assertEqual(payload["claim_posture"], "NO_CLAIM_ALLOWED")
        self.assertIs(payload["HumanGate_required"], True)
        self.assertIs(payload["no_global_ready_verdict"], True)
        self.assertIsInstance(payload["next_step_candidates"], list)
        self.assertGreater(len(payload["next_step_candidates"]), 0)
        for candidate in payload["next_step_candidates"]:
            for field in (
                "candidate_id",
                "title",
                "surface",
                "status",
                "reason",
                "blocked_actions",
                "HumanGate_required",
                "suggested_task_class",
                "validation_level",
            ):
                self.assertIn(field, candidate)
            self.assertIs(candidate["HumanGate_required"], True)
            self.assertIn(candidate["status"], studioctl.STATUS_VALUES)
        self.assertEqual(
            set(payload["claim_verdict"].values()),
            {"NO_CLAIM_ALLOWED"},
        )
        if matrix_before is not None:
            self.assertEqual(matrix_path.read_text(encoding="utf-8"), matrix_before)
        if registry_before is not None:
            self.assertEqual(registry_path.read_text(encoding="utf-8"), registry_before)

    def test_logistic_propose_next_handles_missing_inputs_without_crash(self) -> None:
        original_root = studioctl.PROJECT_ROOT
        temp_dir = tempfile.TemporaryDirectory(dir=PROJECT_ROOT)
        self.addCleanup(temp_dir.cleanup)
        studioctl.PROJECT_ROOT = Path(temp_dir.name)
        self.addCleanup(setattr, studioctl, "PROJECT_ROOT", original_root)

        exit_code, payload = self.run_cli_json(["logistic", "propose-next", "--json"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["inputs"]["task_matrix"]["status"], "NOT_FOUND")
        self.assertEqual(payload["inputs"]["file_registry"]["status"], "NOT_FOUND")
        self.assertEqual(payload["matrix_snapshot"]["status"], "NOT_FOUND")
        self.assertEqual(payload["registry_snapshot"]["status"], "NOT_FOUND")
        self.assertIsInstance(payload["next_step_candidates"], list)
        self.assertIn("registry-not-found-review", {item["candidate_id"] for item in payload["next_step_candidates"]})
        self.assertEqual(payload["write_access"], "BLOCKED")
        self.assertIs(payload["no_global_ready_verdict"], True)

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

    def test_report_parse_json_extracts_executor_report_fields(self) -> None:
        report_path = self.write_temp_report(self.complete_executor_report())

        exit_code, payload = self.run_cli_json(["report", "parse", str(report_path), "--json"])

        self.assertEqual(exit_code, 2)
        self.assertEqual(payload["schema_version"], "studioctl_report_parse.v0")
        self.assertEqual(payload["command"], "report parse")
        self.assertEqual(payload["fields"]["task_id"], "TASK-MATRIX-PARSER-SAMPLE-001")
        self.assertEqual(payload["fields"]["codex_runtime"]["runtime_status"], "BLOCKED")
        self.assertEqual(payload["fields"]["route_check"]["status"], "DOCUMENTED_ONLY")
        self.assertEqual(payload["fields"]["files_changed"], ["scripts/studioV2/studioctl.py"])
        self.assertEqual(payload["fields"]["validation"]["status"], "TESTED")
        self.assertEqual(payload["fields"]["software_verdict"]["active_runtime_code"], "IMPLEMENTED")
        self.assertEqual(payload["fields"]["claim_verdict"]["active_runtime_code"], "NO_CLAIM_ALLOWED")
        self.assertIn("ACTUAL_RUNTIME_UNKNOWN", payload["reasons"])
        self.assertIs(payload["writes_file"], False)
        self.assertEqual(payload["task_matrix_write"], "BLOCKED")

    def test_report_parse_repo_reference_aliases_fill_preflight_fields(self) -> None:
        report_path = self.write_temp_report(self.repo_reference_alias_report())

        exit_code, payload = self.run_cli_json(["report", "parse", str(report_path), "--json"])

        self.assertEqual(exit_code, 2)
        self.assertEqual(payload["fields"]["task_id"], "REPORT-PARSER-ALIAS-SAMPLE-001")
        self.assertEqual(payload["fields"]["preflight"]["cwd"], "C:/TACTICAL_CHESS_STUDIO")
        self.assertEqual(payload["fields"]["preflight"]["repo_root"], "C:/TACTICAL_CHESS_STUDIO")
        self.assertEqual(payload["fields"]["preflight"]["branch"], "master")
        self.assertEqual(payload["fields"]["preflight"]["HEAD"], "5e48ed310a5047eb21bd4825da858e3a08e0c950")
        self.assertEqual(payload["fields"]["preflight"]["worktree_status"], "dirty_with_pre_existing_changes")
        self.assertEqual(payload["fields"]["codex_runtime"]["actual_runtime"], "UNKNOWN")
        self.assertEqual(payload["fields"]["codex_runtime"]["runtime_status"], "BLOCKED")
        self.assertIn("ACTUAL_RUNTIME_UNKNOWN", payload["reasons"])

    def test_report_parse_accepts_file_and_command_alias_variants(self) -> None:
        report_path = self.write_temp_report(self.repo_reference_alias_report())

        _exit_code, payload = self.run_cli_json(["report", "parse", str(report_path), "--json"])

        self.assertEqual(payload["fields"]["files_changed"], ["scripts/studioV2/studioctl.py"])
        self.assertEqual(
            payload["fields"]["commands_run"],
            [
                "git status --short",
                ".\\.venv312\\Scripts\\python.exe -m unittest tests.studioV2.test_studioctl",
            ],
        )
        self.assertEqual(payload["fields"]["validation"]["status"], "TESTED")
        self.assertEqual(payload["fields"]["recommended_next_tasks"], ["HumanGate reviews the alias-hardened candidate."])

    def test_report_matrix_candidate_json_contains_guarded_candidate_fields(self) -> None:
        report_path = self.write_temp_report(self.complete_executor_report())

        exit_code, payload = self.run_cli_json(["report", "matrix-candidate", str(report_path), "--json"])

        self.assertEqual(exit_code, 2)
        self.assertEqual(payload["schema_version"], "studioctl_task_matrix_candidate.v0")
        self.assertEqual(payload["command"], "report matrix-candidate")
        self.assertEqual(payload["task_id"], "TASK-MATRIX-PARSER-SAMPLE-001")
        self.assertEqual(payload["primary_surface"], "active_runtime_code")
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertEqual(payload["evidence_strength"], "TESTED")
        self.assertIs(payload["HumanGate_required"], True)
        self.assertIs(payload["no_global_ready_verdict"], True)
        self.assertEqual(payload["task_matrix_write"], "BLOCKED")
        self.assertIn("HumanGate", payload["next_step_candidate"])

    def test_report_matrix_candidate_preserves_alias_fields_without_matrix_write(self) -> None:
        report_path = self.write_temp_report(self.repo_reference_alias_report())
        matrix_path = PROJECT_ROOT / "00_STUDIO_CONTROL/05_STATUS/STUDIO_MASTER_TASK_MATRIX_V0.yaml"
        before = matrix_path.read_text(encoding="utf-8") if matrix_path.exists() else None

        exit_code, payload = self.run_cli_json(["report", "matrix-candidate", str(report_path), "--json"])

        self.assertEqual(exit_code, 2)
        self.assertEqual(payload["task_id"], "REPORT-PARSER-ALIAS-SAMPLE-001")
        self.assertEqual(payload["primary_surface"], "active_runtime_code")
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertEqual(payload["task_matrix_write"], "BLOCKED")
        self.assertEqual(payload["source_registration_write"], "BLOCKED")
        self.assertIn("HumanGate", payload["next_step_candidate"])
        if before is not None:
            self.assertEqual(matrix_path.read_text(encoding="utf-8"), before)

    def test_report_parse_missing_no_global_ready_verdict_blocks_safely(self) -> None:
        report_path = self.write_temp_report(
            self.complete_executor_report().replace("no_global_ready_verdict: true\n", "")
        )

        exit_code, payload = self.run_cli_json(["report", "parse", str(report_path), "--json"])

        self.assertEqual(exit_code, 2)
        self.assertEqual(payload["fields"]["no_global_ready_verdict"], "UNKNOWN")
        self.assertIn("no_global_ready_verdict", payload["missing_required_fields"])
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("MISSING_NO_GLOBAL_READY_VERDICT", payload["reasons"])

    def test_report_parse_file_producing_without_route_or_output_blocks(self) -> None:
        report_text = self.complete_executor_report()
        report_text = report_text.replace("route_check:\n  status: DOCUMENTED_ONLY\n", "")
        report_text = report_text.replace("output_routing_result:\n  actual_destination: stdout/final_response_only\n", "")
        report_path = self.write_temp_report(report_text)

        exit_code, payload = self.run_cli_json(["report", "parse", str(report_path), "--json"])

        self.assertEqual(exit_code, 2)
        self.assertEqual(payload["status"], "BLOCKED")
        self.assertIn("FILE_PRODUCING_WITHOUT_ROUTE_CHECK", payload["reasons"])
        self.assertIn("FILE_PRODUCING_WITHOUT_OUTPUT_ROUTING_RESULT", payload["reasons"])

    def test_report_parse_does_not_modify_source_report_file(self) -> None:
        report_path = self.write_temp_report(self.complete_executor_report())
        before = report_path.read_text(encoding="utf-8")

        _exit_code, payload = self.run_cli_json(["report", "parse", str(report_path), "--json"])

        self.assertEqual(report_path.read_text(encoding="utf-8"), before)
        self.assertIs(payload["read_attempted"], True)
        self.assertIs(payload["writes_file"], False)

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

    def test_uxpilote_scripts_control_json_reports_read_only_contract(self) -> None:
        exit_code, payload = self.run_cli_json(["uxpilote", "scripts-control", "--json"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["schema_version"], "studioctl_uxpilote_scripts_control.v0")
        self.assertEqual(payload["command"], "uxpilote scripts-control")
        self.assertEqual(payload["generated_by"], "scripts/studioV2/studioctl.py")
        self.assertEqual(payload["claim_posture"], "NO_CLAIM_ALLOWED")
        self.assertIs(payload["no_global_ready_verdict"], True)
        self.assertEqual(payload["scripts_uxpilote_status"], "UNKNOWN")

        self.assertEqual(
            set(payload["node_families"]),
            {
                "studioctl",
                "validators",
                "control_plane",
                "operator",
                "uxpilote",
                "blocked_runners",
                "legacy_root_compatibility",
            },
        )
        self.assertEqual(payload["node_families"]["uxpilote"]["status"], "UNKNOWN")
        self.assertEqual(payload["node_families"]["blocked_runners"]["status"], "BLOCKED")

        self.assertEqual(
            payload["blocked_runners"],
            {
                "benchmark": "BLOCKED",
                "gameplay_execution": "BLOCKED",
                "PR_GitHub_automation": "BLOCKED",
                "auto_merge": "BLOCKED",
                "dataset_generation_reset": "BLOCKED",
                "model_checkpoint_creation_promotion": "BLOCKED",
                "lab_runs_creation": "BLOCKED",
                "latest_json_creation": "BLOCKED",
                "commit_push_branch_PR": "BLOCKED",
                "unknown_script_execution": "BLOCKED",
            },
        )
        self.assertIn("python scripts\\studioV2\\studioctl.py status", payload["known_readonly_entrypoints"])
        self.assertIn("python scripts\\studioV2\\studioctl.py status --json", payload["known_readonly_entrypoints"])
        drift_ids = {entry["id"] for entry in payload["path_drift"]}
        self.assertIn("scripts_root_vs_studioV2", drift_ids)
        self.assertIn("control_plane_root_vs_studioV2", drift_ids)
        self.assertIn("operator_root_vs_studioV2", drift_ids)
        self.assertIn("scripts_uxpilote_registration", drift_ids)
        inspector_schema = payload["selected_node_inspector_schema"]
        for field in (
            "path",
            "family",
            "surface",
            "status",
            "evidence",
            "risk",
            "allowed_actions",
            "blocked_actions",
            "next_humangate_question",
        ):
            self.assertIn(field, inspector_schema)
        self.assertFalse(FORBIDDEN_WRITE_SAMPLE.exists())
        self.assertFalse(FORBIDDEN_SECRET_SAMPLE.exists())

    def test_uxpilote_audit_chains_json_reports_read_only_catalog(self) -> None:
        exit_code, payload = self.run_cli_json(["uxpilote", "audit-chains", "--json"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["schema_version"], "studioctl_uxpilote_audit_chains.v0")
        self.assertEqual(payload["command"], "uxpilote audit-chains")
        self.assertEqual(payload["generated_by"], "scripts/studioV2/studioctl.py")
        self.assertEqual(payload["claim_posture"], "NO_CLAIM_ALLOWED")
        self.assertIs(payload["no_global_ready_verdict"], True)
        self.assertEqual(
            payload["source_catalog"],
            {
                "path": "00_STUDIO_CONTROL/01_MAPS/UXPILOTE_AUDIT_CHAIN_CATALOG_V0.md",
                "exists": True,
                "status": "DOCUMENTED_ONLY",
                "registered": "UNKNOWN",
            },
        )

        expected_chain_ids = {
            "system_truth_chain",
            "scripts_route_chain",
            "fusion_matrix_chain",
            "humangate_queue_chain",
            "tool_catalog_chain",
            "llm_lora_guard_chain",
            "runtime_guard_chain",
        }
        self.assertEqual({chain["id"] for chain in payload["chains"]}, expected_chain_ids)
        self.assertEqual(
            payload["chain_groups"],
            {
                "truth": ["system_truth_chain"],
                "routing": ["scripts_route_chain"],
                "fusion": ["fusion_matrix_chain"],
                "humangate": ["humangate_queue_chain"],
                "tools": ["tool_catalog_chain"],
                "inference": ["llm_lora_guard_chain"],
                "runtime_guard": ["runtime_guard_chain"],
            },
        )

        allowed_authorities = {"read_only", "docs_only", "patch_proposal", "runtime_locked"}
        canonical_surfaces = {
            "active_runtime_code",
            "tests",
            "artifacts_runtime_outputs",
            "canonical_docs",
            "roadmap_docs_only",
            "inference",
        }
        required_fields = {
            "id",
            "label",
            "purpose",
            "authority",
            "primary_surface",
            "status",
            "reads",
            "produces",
            "ux_targets",
            "blocked_actions",
            "humangate_question",
            "risk",
            "safe_to_run_now",
        }
        for chain in payload["chains"]:
            self.assertTrue(required_fields.issubset(chain))
            self.assertIn(chain["authority"], allowed_authorities)
            self.assertIn(chain["primary_surface"], canonical_surfaces)
            self.assertIn(chain["status"], studioctl.STATUS_VALUES)
            self.assertIs(chain["safe_to_run_now"], False)
            self.assertGreaterEqual(len(chain["reads"]), 1)
            self.assertGreaterEqual(len(chain["produces"]), 1)
            for produced in chain["produces"]:
                self.assertIn(produced["surface"], canonical_surfaces)
                self.assertIs(produced["canonical"], False)

        self.assertEqual(
            payload["blocked_actions"],
            {
                "runtime_execution": "BLOCKED",
                "training": "BLOCKED",
                "benchmark": "BLOCKED",
                "dataset_generation": "BLOCKED",
                "dataset_reset": "BLOCKED",
                "latest_json_creation": "BLOCKED",
                "lab_run_creation": "BLOCKED",
                "model_or_checkpoint_creation": "BLOCKED",
                "model_promotion": "BLOCKED",
                "agent_activation": "BLOCKED",
                "chess960_activation": "BLOCKED",
                "decision_controller_activation": "BLOCKED",
                "commit_push_branch_PR": "BLOCKED",
                "unknown_script_execution": "BLOCKED",
            },
        )
        self.assertEqual(payload["status_by_surface"]["artifacts_runtime_outputs"], "IMPLEMENTED")
        self.assertEqual(payload["status_by_surface"]["canonical_docs"], "DOCUMENTED_ONLY")
        self.assertFalse(FORBIDDEN_WRITE_SAMPLE.exists())
        self.assertFalse(FORBIDDEN_SECRET_SAMPLE.exists())

    def test_uxpilote_audit_chains_text_reports_without_writing(self) -> None:
        exit_code, output = self.run_cli_text(["uxpilote", "audit-chains"])

        self.assertEqual(exit_code, 0)
        self.assertIn("studioctl uxpilote audit-chains", output)
        self.assertIn("system_truth_chain", output)
        self.assertIn("Runtime Guard Chain", output)
        self.assertIn("safe_to_run_now", output)
        self.assertIn("NO_CLAIM_ALLOWED", output)
        self.assertFalse(FORBIDDEN_WRITE_SAMPLE.exists())
        self.assertFalse(FORBIDDEN_SECRET_SAMPLE.exists())

    def test_uxpilote_graph_json_reports_read_only_graph_backend(self) -> None:
        exit_code, payload = self.run_cli_json(["uxpilote", "graph", "--json"])

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["schema_version"], "studioctl_uxpilote_graph.v0")
        self.assertEqual(payload["command"], "uxpilote graph")
        self.assertEqual(payload["generated_by"], "scripts/studioV2/studioctl.py")
        self.assertEqual(payload["claim_posture"], "NO_CLAIM_ALLOWED")
        self.assertIs(payload["no_global_ready_verdict"], True)
        self.assertEqual(
            payload["graph_planes"],
            ["physical", "authority", "evidence", "routing", "tools"],
        )

        for field in (
            "nodes",
            "edges",
            "blocked_edges",
            "unsafe_edges",
            "source_state_gaps",
            "humangate_questions",
            "status_by_surface",
        ):
            self.assertIn(field, payload)
        self.assertGreater(len(payload["nodes"]), 0)
        self.assertGreater(len(payload["edges"]), 0)
        self.assertGreater(len(payload["blocked_edges"]), 0)
        self.assertGreater(len(payload["unsafe_edges"]), 0)
        self.assertGreater(len(payload["source_state_gaps"]), 0)
        self.assertGreater(len(payload["humangate_questions"]), 0)

        node_ids = {node["id"] for node in payload["nodes"]}
        required_nodes = {
            "physical_00_studio_control",
            "physical_scripts_studiov2",
            "physical_scripts_uxpilote",
            "authority_humangate",
            "authority_search",
            "authority_neural",
            "evidence_studioctl_json",
            "routing_scripts_uxpilote",
            "tool_graph",
            "tool_chain_system_truth_chain",
            "tool_chain_runtime_guard_chain",
        }
        self.assertTrue(required_nodes.issubset(node_ids))

        allowed_surfaces = {
            "active_runtime_code",
            "tests",
            "artifacts_runtime_outputs",
            "canonical_docs",
            "roadmap_docs_only",
            "inference",
        }
        for node in payload["nodes"]:
            self.assertIn(node["graph_plane"], payload["graph_planes"])
            self.assertIn(node["surface"], allowed_surfaces)
            self.assertIn(node["status"], studioctl.STATUS_VALUES)
            for field in ("created", "registered", "loaded", "enforced", "evidenced"):
                self.assertIn(field, node["source_state"])
            self.assertIs(node["humangate_required"], True)

        truth_levels = {edge["truth_level"] for edge in payload["edges"]}
        self.assertIn("blocked", truth_levels)
        self.assertIn("unknown", truth_levels)
        self.assertIn("documented", truth_levels)
        self.assertIn("tested", truth_levels)
        edge_ids = {edge["id"] for edge in payload["edges"]}
        self.assertIn("edge_uxpilote_executes_audits_blocked", edge_ids)
        self.assertIn("edge_scripts_uxpilote_registered_truth_unknown", edge_ids)
        self.assertIn("edge_graph_reads_status", edge_ids)
        for edge in payload["blocked_edges"]:
            self.assertTrue(edge["truth_level"] == "blocked" or edge["status"] == "BLOCKED")
        for edge in payload["unsafe_edges"]:
            self.assertIs(edge["unsafe_to_render_as_active"], True)

        self.assertEqual(payload["status_by_surface"]["artifacts_runtime_outputs"], "IMPLEMENTED")
        self.assertEqual(payload["status_by_surface"]["canonical_docs"], "DOCUMENTED_ONLY")
        self.assertFalse(FORBIDDEN_WRITE_SAMPLE.exists())
        self.assertFalse(FORBIDDEN_SECRET_SAMPLE.exists())

    def test_uxpilote_graph_text_reports_without_writing(self) -> None:
        exit_code, output = self.run_cli_text(["uxpilote", "graph"])

        self.assertEqual(exit_code, 0)
        self.assertIn("studioctl uxpilote graph", output)
        self.assertIn("studioctl_uxpilote_graph.v0", output)
        self.assertIn("blocked_edges", output)
        self.assertIn("unsafe_edges", output)
        self.assertIn("NO_CLAIM_ALLOWED", output)
        self.assertFalse(FORBIDDEN_WRITE_SAMPLE.exists())
        self.assertFalse(FORBIDDEN_SECRET_SAMPLE.exists())

    def test_forbidden_sample_files_are_not_created(self) -> None:
        self.assertFalse(FORBIDDEN_WRITE_SAMPLE.exists())
        self.assertFalse(FORBIDDEN_SECRET_SAMPLE.exists())


if __name__ == "__main__":
    unittest.main()
