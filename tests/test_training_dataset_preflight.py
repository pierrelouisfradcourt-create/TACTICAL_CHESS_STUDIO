from __future__ import annotations

import ast
import json
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]
ML_ROOT = REPO_ROOT / "ml"
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(ML_ROOT))

from ml.dataset_loader import preflight_training_dataset  # noqa: E402


FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
DATASET_LOADER_PATH = REPO_ROOT / "ml" / "dataset_loader.py"


def future_unsupported_am_row() -> dict[str, Any]:
    return {
        "fen": FEN,
        "best_move": "e2e4",
        "policy_only": True,
        "legal_moves": ["e2e4"],
        "action_id_version": "action_id_v0",
        "legal_action_version": "legal_action_v0",
        "action_mask_version": "action_mask_v0",
        "move_vocab_fingerprint": "fixture-fingerprint",
        "legal_move_source": "rust_engine",
        "ruleset": "standard",
        "variant": "classical",
        "action_id": {"uci": "e2e4", "version": "action_id_v0"},
        "legal_action": {"uci": "e2e4", "action_id": "e2e4"},
        "action_mask_provenance": {
            "policy_indices": [0],
            "unencodable_action_ids": [],
        },
        "human_gate_authorization": True,
        "human_gate_authorization_state": {
            "scope": "DatasetLabelPromotion",
            "decision": "approve",
            "reason": "future unsupported preflight fixture only",
        },
    }


class TrainingDatasetPreflightTest(unittest.TestCase):
    def write_jsonl(self, rows: Iterable[Any]) -> str:
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        path = Path(tmpdir.name) / "preflight_fixture.jsonl"
        path.write_text(
            "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows),
            encoding="utf-8",
        )
        return str(path)

    def assert_preflight_rejects(self, row: Any, reason: str) -> None:
        result = preflight_training_dataset(self.write_jsonl([row]))

        self.assertFalse(result.admissible)
        self.assertIn("row_1", result.reasons)
        self.assertIn(reason, result.reasons)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)

    def test_preflight_rejects_fen_best_move_only(self) -> None:
        self.assert_preflight_rejects(
            {"fen": FEN, "best_move": "e2e4"},
            "missing_action_id",
        )

    def test_preflight_rejects_missing_legal_action_version(self) -> None:
        row = future_unsupported_am_row()
        del row["legal_action_version"]

        self.assert_preflight_rejects(row, "missing_legal_action_version")

    def test_preflight_rejects_missing_action_mask_version(self) -> None:
        row = future_unsupported_am_row()
        del row["action_mask_version"]

        self.assert_preflight_rejects(row, "missing_action_mask_version")

    def test_preflight_rejects_missing_move_vocab_fingerprint(self) -> None:
        row = future_unsupported_am_row()
        del row["move_vocab_fingerprint"]

        self.assert_preflight_rejects(row, "missing_move_vocab_fingerprint")

    def test_preflight_rejects_missing_action_mask_provenance(self) -> None:
        row = future_unsupported_am_row()
        del row["action_mask_provenance"]

        self.assert_preflight_rejects(row, "missing_action_mask_provenance")

    def test_preflight_rejects_missing_humangate(self) -> None:
        row = future_unsupported_am_row()
        del row["human_gate_authorization"]
        del row["human_gate_authorization_state"]

        self.assert_preflight_rejects(row, "missing_humangate_authorization")

    def test_preflight_rejects_fallback_and_rerank_contaminated_rows(self) -> None:
        fallback_row = future_unsupported_am_row()
        fallback_row["fallback_reason"] = "search_no_selection"
        rerank_row = future_unsupported_am_row()
        rerank_row["rerank_status"] = "reranked_by_neural"

        with self.subTest("fallback"):
            self.assert_preflight_rejects(
                fallback_row,
                "fallback_metadata_blocks_promotion",
            )
        with self.subTest("rerank"):
            self.assert_preflight_rejects(
                rerank_row,
                "rerank_metadata_blocks_promotion",
            )

    def test_preflight_future_complete_metadata_still_fails_without_allow_path(self) -> None:
        result = preflight_training_dataset(self.write_jsonl([future_unsupported_am_row()]))

        self.assertFalse(result.admissible)
        self.assertEqual(result.reasons, ("row_1", "dataset_admission_gate_blocked"))

    def test_preflight_creates_no_files_in_project_output_paths(self) -> None:
        output_paths = [
            REPO_ROOT / "lab" / "runs",
            REPO_ROOT / "lab" / "gameplay_observation" / "sandbox_outputs",
            REPO_ROOT / "models" / "latest.pt",
            REPO_ROOT / "models" / "best.pt",
        ]
        before = self.snapshot_paths(output_paths)

        result = preflight_training_dataset(self.write_jsonl([{"fen": FEN, "best_move": "e2e4"}]))

        self.assertFalse(result.admissible)
        self.assertEqual(before, self.snapshot_paths(output_paths))

    def test_preflight_does_not_import_train_or_model_architecture(self) -> None:
        for module_name in ("ml.train", "train", "ml.model", "model"):
            sys.modules.pop(module_name, None)

        result = preflight_training_dataset(self.write_jsonl([{"fen": FEN, "best_move": "e2e4"}]))

        self.assertFalse(result.admissible)
        for module_name in ("ml.train", "train", "ml.model", "model"):
            self.assertNotIn(module_name, sys.modules)

    def test_preflight_source_stays_lightweight(self) -> None:
        source = DATASET_LOADER_PATH.read_text(encoding="utf-8")
        tree = ast.parse(source)
        preflight_node = next(
            node
            for node in ast.walk(tree)
            if isinstance(node, ast.FunctionDef)
            and node.name == "preflight_training_dataset"
        )
        preflight_source = ast.get_source_segment(source, preflight_node)
        self.assertIsNotNone(preflight_source)

        blocked_markers = [
            "TeacherDataset(",
            "fen_to_tensor",
            "torch.tensor",
            "Dataset(",
            "DataLoader",
            "PolicyValueNet",
            "os.makedirs",
            "torch.save",
        ]
        for marker in blocked_markers:
            with self.subTest(marker=marker):
                self.assertNotIn(marker, preflight_source)

        self.assertIn("load_dataset_rows", preflight_source)
        self.assertIn("require_am_dataset_admission", preflight_source)
        self.assertIn("validate_am_dataset_admission", preflight_source)

    @staticmethod
    def snapshot_paths(paths: list[Path]) -> dict[str, list[str] | bool]:
        snapshot: dict[str, list[str] | bool] = {}
        for path in paths:
            key = str(path.relative_to(REPO_ROOT))
            if path.is_dir():
                snapshot[key] = sorted(
                    str(child.relative_to(path))
                    for child in path.rglob("*")
                    if child.is_file()
                )
            else:
                snapshot[key] = path.exists()
        return snapshot


if __name__ == "__main__":
    unittest.main()
