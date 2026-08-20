from __future__ import annotations

import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
ML_ROOT = REPO_ROOT / "ml"
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(ML_ROOT))

from ml.dataset_loader import validate_am_dataset_admission  # noqa: E402


FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def future_unsupported_am_row() -> dict:
    return {
        "fen": FEN,
        "best_move": "e2e4",
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
            "reason": "future unsupported fixture only",
        },
    }


class PythonDatasetAdmissionFailClosedTest(unittest.TestCase):
    def assert_not_admissible(self, row: dict, reason: str) -> None:
        result = validate_am_dataset_admission(row)
        self.assertFalse(result.admissible)
        self.assertIn(reason, result.reasons)

    def test_fen_best_move_only_is_not_am_dataset_admissible(self) -> None:
        result = validate_am_dataset_admission({"fen": FEN, "best_move": "e2e4"})

        self.assertFalse(result.admissible)
        self.assertIn("missing_action_id", result.reasons)
        self.assertIn("missing_legal_action", result.reasons)
        self.assertIn("missing_action_mask_provenance", result.reasons)
        self.assertIn("missing_humangate_authorization_state", result.reasons)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)

    def test_missing_legal_action_version_blocks_dataset_admission(self) -> None:
        row = future_unsupported_am_row()
        del row["legal_action_version"]

        self.assert_not_admissible(row, "missing_legal_action_version")

    def test_missing_action_mask_version_blocks_dataset_admission(self) -> None:
        row = future_unsupported_am_row()
        del row["action_mask_version"]

        self.assert_not_admissible(row, "missing_action_mask_version")

    def test_missing_move_vocab_fingerprint_blocks_dataset_admission(self) -> None:
        row = future_unsupported_am_row()
        del row["move_vocab_fingerprint"]

        self.assert_not_admissible(row, "missing_move_vocab_fingerprint")

    def test_missing_action_mask_provenance_blocks_dataset_admission(self) -> None:
        row = future_unsupported_am_row()
        del row["action_mask_provenance"]

        self.assert_not_admissible(row, "missing_action_mask_provenance")

    def test_missing_humangate_blocks_dataset_admission(self) -> None:
        row = future_unsupported_am_row()
        del row["human_gate_authorization"]
        del row["human_gate_authorization_state"]

        result = validate_am_dataset_admission(row)
        self.assertFalse(result.admissible)
        self.assertIn("missing_humangate_authorization", result.reasons)
        self.assertIn("missing_humangate_authorization_state", result.reasons)

    def test_humangate_without_action_mask_provenance_remains_blocked(self) -> None:
        row = future_unsupported_am_row()
        del row["action_mask_provenance"]

        result = validate_am_dataset_admission(row)
        self.assertFalse(result.admissible)
        self.assertIn("missing_action_mask_provenance", result.reasons)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)

    def test_wrong_move_vocab_fingerprint_remains_non_admissible(self) -> None:
        row = future_unsupported_am_row()
        row["move_vocab_fingerprint"] = "wrong-fixture-fingerprint"

        result = validate_am_dataset_admission(row)
        self.assertFalse(result.admissible)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)

    def test_policy_index_minus_one_remains_non_admissible(self) -> None:
        row = future_unsupported_am_row()
        row["policy_index"] = -1
        row["action_mask_provenance"]["policy_indices"] = [-1]

        result = validate_am_dataset_admission(row)
        self.assertFalse(result.admissible)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)

    def test_unencodable_action_ids_remain_non_admissible(self) -> None:
        row = future_unsupported_am_row()
        row["action_mask_provenance"]["unencodable_action_ids"] = ["not-a-uci-action"]

        result = validate_am_dataset_admission(row)
        self.assertFalse(result.admissible)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)

    def test_python_legal_mask_alone_is_not_authority(self) -> None:
        row = {
            "fen": FEN,
            "best_move": "e2e4",
            "legal_mask": [0.0, 1.0],
        }

        self.assert_not_admissible(row, "python_legal_mask_is_helper_only")

    def test_neural_or_selected_move_fields_do_not_become_labels_without_admission(self) -> None:
        for field in (
            "selected_move",
            "final_selected_move",
            "search_selected_move",
            "search_best_move",
            "neural_predicted_move",
        ):
            with self.subTest(field=field):
                row = {"fen": FEN, field: "e2e4"}

                self.assert_not_admissible(row, "diagnostic_move_fields_are_not_labels")

    def test_fallback_or_rerank_metadata_blocks_label_promotion(self) -> None:
        fallback_row = future_unsupported_am_row()
        fallback_row["fallback_reason"] = "search_no_selection"
        rerank_row = future_unsupported_am_row()
        rerank_row["rerank_status"] = "reranked_by_neural"

        self.assert_not_admissible(fallback_row, "fallback_metadata_blocks_promotion")
        self.assert_not_admissible(rerank_row, "rerank_metadata_blocks_promotion")

    def test_neural_predicted_move_without_authority_is_not_label(self) -> None:
        row = future_unsupported_am_row()
        row["neural_predicted_move"] = "e2e4"

        result = validate_am_dataset_admission(row)
        self.assertFalse(result.admissible)
        self.assertIn("diagnostic_move_fields_are_not_labels", result.reasons)

    def test_search_best_move_without_humangate_promotion_is_not_label(self) -> None:
        row = future_unsupported_am_row()
        row["search_best_move"] = "e2e4"
        del row["human_gate_authorization"]
        del row["human_gate_authorization_state"]

        result = validate_am_dataset_admission(row)
        self.assertFalse(result.admissible)
        self.assertIn("diagnostic_move_fields_are_not_labels", result.reasons)
        self.assertIn("missing_humangate_authorization", result.reasons)

    def test_python_legal_mask_with_no_rust_am_provenance_is_not_authority(self) -> None:
        row = future_unsupported_am_row()
        row["legal_mask"] = [0.0, 1.0]
        del row["action_mask_provenance"]

        result = validate_am_dataset_admission(row)
        self.assertFalse(result.admissible)
        self.assertIn("python_legal_mask_is_helper_only", result.reasons)
        self.assertIn("missing_action_mask_provenance", result.reasons)

    def test_future_complete_metadata_is_still_unsupported_and_blocked(self) -> None:
        result = validate_am_dataset_admission(future_unsupported_am_row())

        self.assertFalse(result.admissible)
        self.assertEqual(result.reasons, ("dataset_admission_gate_blocked",))


if __name__ == "__main__":
    unittest.main()
