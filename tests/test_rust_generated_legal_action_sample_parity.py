from __future__ import annotations

import json
import re
import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "standard_move_vocab_cross_fixture.json"

sys.path.insert(0, str(REPO_ROOT))

import ml.move_vocab as move_vocab  # noqa: E402
from ml.move_vocab import (  # noqa: E402
    index_to_move,
    try_move_to_index,
    vocab_fingerprint,
    vocab_size,
)


EXPECTED_VOCAB_SIZE = 4164
EXPECTED_VOCAB_FINGERPRINT = (
    "690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c"
)
EXPECTED_LEGAL_ACTION_VERSION = "legal_action_v0"
EXPECTED_ACTION_MASK_VERSION = "action_mask_v0_skeleton"
STANDARD_UCI_RE = re.compile(r"^[a-h][1-8][a-h][1-8][qrbn]?$")


class RustGeneratedLegalActionSampleParityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
        cls.samples = cls.fixture["rust_generated_standard_samples"]

    def _sample(self, category: str) -> dict:
        matches = [sample for sample in self.samples if sample["category"] == category]
        self.assertEqual(len(matches), 1, category)
        return matches[0]

    def assert_sample_keys_map_to_python_policy_indices(self, category: str) -> None:
        sample = self._sample(category)
        self.assertTrue(sample["representative_not_exhaustive"], category)

        for row in sample["expected_keys"]:
            key = row["uci"]
            with self.subTest(category=category, key=key):
                self.assertRegex(key, STANDARD_UCI_RE)
                self.assertFalse(key.startswith("~"))

                index = try_move_to_index(key)
                self.assertIsNotNone(index, key)
                self.assertEqual(index, row["policy_index"], key)
                self.assertEqual(index_to_move(index), key)

    def test_rust_generated_start_position_keys_map_to_python_policy_indices(self) -> None:
        self.assert_sample_keys_map_to_python_policy_indices("start")

    def test_rust_generated_capture_keys_map_to_python_policy_indices(self) -> None:
        sample = self._sample("capture")
        self.assertTrue(any(row.get("is_capture_sample") for row in sample["expected_keys"]))
        self.assert_sample_keys_map_to_python_policy_indices("capture")

    def test_rust_generated_promotion_keys_map_to_python_policy_indices(self) -> None:
        sample = self._sample("promotion")
        suffixes = {row["uci"][-1] for row in sample["expected_keys"]}
        self.assertEqual(suffixes, {"q", "r", "b", "n"})
        self.assertTrue(all(row.get("requires_promotion_suffix") for row in sample["expected_keys"]))
        self.assert_sample_keys_map_to_python_policy_indices("promotion")

    def test_rust_generated_classical_castling_keys_map_to_python_policy_indices(self) -> None:
        sample = self._sample("castling")
        keys = {row["uci"] for row in sample["expected_keys"]}
        self.assertEqual(keys, {"e1g1", "e1c1"})
        self.assertTrue(all(row.get("requires_king_destination_uci") for row in sample["expected_keys"]))
        self.assert_sample_keys_map_to_python_policy_indices("castling")

    def test_rust_generated_en_passant_key_maps_to_python_policy_index(self) -> None:
        sample = self._sample("en_passant")
        keys = {row["uci"] for row in sample["expected_keys"]}
        self.assertEqual(keys, {"e5d6"})
        self.assertTrue(any(row.get("is_en_passant_sample") for row in sample["expected_keys"]))
        self.assert_sample_keys_map_to_python_policy_indices("en_passant")

    def test_rust_generated_black_castling_keys_map_to_python_policy_indices(self) -> None:
        sample = self._sample("black_castling")
        keys = {row["uci"] for row in sample["expected_keys"]}
        self.assertEqual(keys, {"e8g8", "e8c8"})
        self.assertTrue(all(row.get("requires_king_destination_uci") for row in sample["expected_keys"]))
        self.assert_sample_keys_map_to_python_policy_indices("black_castling")

    def test_rust_generated_black_promotion_keys_map_to_python_policy_indices(self) -> None:
        sample = self._sample("black_promotion")
        suffixes = {row["uci"][-1] for row in sample["expected_keys"]}
        self.assertEqual(suffixes, {"q", "r", "b", "n"})
        self.assertTrue(all(row.get("requires_promotion_suffix") for row in sample["expected_keys"]))
        self.assert_sample_keys_map_to_python_policy_indices("black_promotion")

    def test_rust_generated_promotion_capture_keys_map_to_python_policy_indices(self) -> None:
        sample = self._sample("promotion_capture")
        suffixes = {row["uci"][-1] for row in sample["expected_keys"]}
        self.assertEqual(suffixes, {"q", "r", "b", "n"})
        self.assertTrue(all(row.get("requires_promotion_suffix") for row in sample["expected_keys"]))
        self.assertTrue(all(row.get("is_capture_sample") for row in sample["expected_keys"]))
        self.assert_sample_keys_map_to_python_policy_indices("promotion_capture")

    def test_rust_generated_pin_and_king_safety_keys_map_to_python_policy_indices(self) -> None:
        self.assert_sample_keys_map_to_python_policy_indices("pin")
        self.assert_sample_keys_map_to_python_policy_indices("king_safety")

    def test_rust_generated_check_evasion_keys_map_to_python_policy_indices(self) -> None:
        self.assert_sample_keys_map_to_python_policy_indices("check_evasion")
        self.assert_sample_keys_map_to_python_policy_indices("check_evasion_block")
        self.assert_sample_keys_map_to_python_policy_indices("check_evasion_capture")

    def test_rust_generated_absent_keys_are_fixture_metadata_only(self) -> None:
        absent_rows = [
            row
            for sample in self.samples
            for row in sample.get("expected_absent_keys", [])
        ]
        absent_keys = {row["uci"] for row in absent_rows}

        self.assertEqual(absent_keys, {"e2d2", "e1f1", "e1e2", "c7d5"})
        for row in absent_rows:
            self.assertRegex(row["uci"], STANDARD_UCI_RE)
            self.assertIn("reason", row)

    def test_rust_generated_debug_fallback_keys_remain_unencodable(self) -> None:
        rejected = [
            row
            for row in self.fixture["rejected_moves"]
            if row["reason"] == "internal_debug_key"
        ]
        self.assertEqual(len(rejected), 1)
        self.assertIsNone(try_move_to_index(rejected[0]["uci"]))

        for sample in self.samples:
            for row in sample["expected_keys"]:
                self.assertFalse(row["uci"].startswith("~"), row)

    def test_rust_generated_fixture_fingerprint_matches_current_vocab(self) -> None:
        metadata = self.fixture["metadata"]

        self.assertEqual(metadata["move_vocab_size"], EXPECTED_VOCAB_SIZE)
        self.assertEqual(metadata["move_vocab_fingerprint"], EXPECTED_VOCAB_FINGERPRINT)
        self.assertEqual(metadata["legal_action_version"], EXPECTED_LEGAL_ACTION_VERSION)
        self.assertEqual(metadata["action_mask_version"], EXPECTED_ACTION_MASK_VERSION)
        self.assertEqual(vocab_size(), EXPECTED_VOCAB_SIZE)
        self.assertEqual(vocab_fingerprint(), EXPECTED_VOCAB_FINGERPRINT)

    def test_rust_generated_samples_do_not_claim_chess960_or_dataset_readiness(self) -> None:
        metadata = self.fixture["metadata"]

        self.assertEqual(metadata["scope"], "representative_standard_sample_only")
        self.assertEqual(metadata["rust_python_actionmask_authority"], "BLOCKED")
        self.assertEqual(metadata["dataset_label_readiness"], "BLOCKED")
        self.assertEqual(metadata["training_readiness"], "BLOCKED")
        self.assertEqual(metadata["chess960"], "EXCLUDED_BLOCKED")
        self.assertFalse(any("chess960" in name.lower() for name in dir(move_vocab)))


if __name__ == "__main__":
    unittest.main()
