from __future__ import annotations

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

from ml.dataset_loader import (  # noqa: E402
    TeacherDataset,
    validate_am_dataset_admission,
)


FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
TRAIN_PATH = REPO_ROOT / "ml" / "train.py"
DATASET_LOADER_PATH = REPO_ROOT / "ml" / "dataset_loader.py"


def future_am_policy_row() -> dict[str, Any]:
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
            "reason": "future wiring expectation fixture only",
        },
    }


def fen_best_move_only_row() -> dict[str, Any]:
    return {"fen": FEN, "best_move": "e2e4"}


def python_legal_mask_only_row() -> dict[str, Any]:
    return {
        "fen": FEN,
        "best_move": "e2e4",
        "policy_only": True,
        "legal_moves": ["e2e4"],
        "legal_mask": [0.0, 1.0],
    }


class PythonDatasetAdmissionWiringExpectationsTest(unittest.TestCase):
    def write_jsonl(self, rows: Iterable[dict[str, Any]]) -> str:
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        path = Path(tmpdir.name) / "unsafe_fixture.jsonl"
        path.write_text(
            "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows),
            encoding="utf-8",
        )
        return str(path)

    def assert_teacher_dataset_rejects_non_admissible_row(
        self,
        row: dict[str, Any],
        reason: str,
    ) -> None:
        admission = validate_am_dataset_admission(row)
        self.assertFalse(admission.admissible)
        self.assertIn(reason, admission.reasons)

        with self.assertRaisesRegex(
            (RuntimeError, ValueError, SystemExit),
            "admission|ActionMask|HumanGate|dataset_admission",
        ):
            TeacherDataset(self.write_jsonl([row]))

    def test_teacher_dataset_uses_am_admission_helper_before_loading_samples(self) -> None:
        source = DATASET_LOADER_PATH.read_text(encoding="utf-8")
        teacher_start = source.index("class TeacherDataset")
        helper_use = source.index("require_am_dataset_admission", teacher_start)
        sample_append = source.index("self.samples.append", teacher_start)

        self.assertLess(helper_use, sample_append)

    def test_teacher_dataset_rejects_fen_best_move_only_without_am_admission(self) -> None:
        self.assert_teacher_dataset_rejects_non_admissible_row(
            fen_best_move_only_row(),
            "missing_action_id",
        )

    def test_teacher_dataset_requires_legal_action_version_before_training(self) -> None:
        row = future_am_policy_row()
        del row["legal_action_version"]

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "missing_legal_action_version",
        )

    def test_teacher_dataset_requires_action_mask_version_before_training(self) -> None:
        row = future_am_policy_row()
        del row["action_mask_version"]

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "missing_action_mask_version",
        )

    def test_teacher_dataset_requires_move_vocab_fingerprint_before_training(self) -> None:
        row = future_am_policy_row()
        del row["move_vocab_fingerprint"]

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "missing_move_vocab_fingerprint",
        )

    def test_teacher_dataset_requires_action_mask_provenance_before_training(self) -> None:
        row = future_am_policy_row()
        del row["action_mask_provenance"]

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "missing_action_mask_provenance",
        )

    def test_teacher_dataset_requires_humangate_before_training(self) -> None:
        row = future_am_policy_row()
        del row["human_gate_authorization"]
        del row["human_gate_authorization_state"]

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "missing_humangate_authorization",
        )

    def test_teacher_dataset_rejects_humangate_without_action_mask_provenance(
        self,
    ) -> None:
        row = future_am_policy_row()
        del row["action_mask_provenance"]

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "missing_action_mask_provenance",
        )

    def test_teacher_dataset_rejects_wrong_move_vocab_fingerprint(self) -> None:
        row = future_am_policy_row()
        row["move_vocab_fingerprint"] = "wrong-fixture-fingerprint"

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "dataset_admission_gate_blocked",
        )

    def test_teacher_dataset_rejects_policy_index_minus_one(self) -> None:
        row = future_am_policy_row()
        row["policy_index"] = -1
        row["action_mask_provenance"]["policy_indices"] = [-1]

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "dataset_admission_gate_blocked",
        )

    def test_teacher_dataset_rejects_unencodable_action_ids(self) -> None:
        row = future_am_policy_row()
        row["action_mask_provenance"]["unencodable_action_ids"] = ["not-a-uci-action"]

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "dataset_admission_gate_blocked",
        )

    def test_fallback_or_rerank_rows_are_not_training_admissible(self) -> None:
        fallback_row = future_am_policy_row()
        fallback_row["fallback_reason"] = "search_no_selection"

        rerank_row = future_am_policy_row()
        rerank_row["rerank_status"] = "reranked_by_neural"

        self.assert_teacher_dataset_rejects_non_admissible_row(
            fallback_row,
            "fallback_metadata_blocks_promotion",
        )
        self.assert_teacher_dataset_rejects_non_admissible_row(
            rerank_row,
            "rerank_metadata_blocks_promotion",
        )

    def test_python_legal_mask_does_not_satisfy_training_admission(self) -> None:
        self.assert_teacher_dataset_rejects_non_admissible_row(
            python_legal_mask_only_row(),
            "python_legal_mask_is_helper_only",
        )

    def test_teacher_dataset_rejects_neural_predicted_move_without_authority(self) -> None:
        row = future_am_policy_row()
        row["neural_predicted_move"] = "e2e4"

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "diagnostic_move_fields_are_not_labels",
        )

    def test_teacher_dataset_rejects_search_best_move_without_humangate(
        self,
    ) -> None:
        row = future_am_policy_row()
        row["search_best_move"] = "e2e4"
        del row["human_gate_authorization"]
        del row["human_gate_authorization_state"]

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "missing_humangate_authorization",
        )

    def test_teacher_dataset_rejects_python_legal_mask_without_rust_am_provenance(
        self,
    ) -> None:
        row = future_am_policy_row()
        row["legal_mask"] = [0.0, 1.0]
        del row["action_mask_provenance"]

        self.assert_teacher_dataset_rejects_non_admissible_row(
            row,
            "python_legal_mask_is_helper_only",
        )

    def test_teacher_dataset_rejects_future_complete_metadata_fixture(self) -> None:
        self.assert_teacher_dataset_rejects_non_admissible_row(
            future_am_policy_row(),
            "dataset_admission_gate_blocked",
        )

    def test_checkpoint_write_requires_prior_admission_gate_contract(self) -> None:
        source = TRAIN_PATH.read_text(encoding="utf-8")
        teacher_dataset_load = source.index("dataset = TeacherDataset(dataset_path)")
        run_dir_create = source.index("os.makedirs(run_dir")
        model_dir_create = source.index("os.makedirs(model_dir")
        latest_path = source.index("latest_path =")
        best_path = source.index("best_path =")

        self.assertLess(teacher_dataset_load, run_dir_create)
        self.assertLess(teacher_dataset_load, model_dir_create)
        self.assertLess(teacher_dataset_load, latest_path)
        self.assertLess(teacher_dataset_load, best_path)


if __name__ == "__main__":
    unittest.main()
