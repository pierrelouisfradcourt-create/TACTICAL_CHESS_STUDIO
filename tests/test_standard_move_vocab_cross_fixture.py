from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "standard_move_vocab_cross_fixture.json"

sys.path.insert(0, str(REPO_ROOT))

from ml.move_vocab import index_to_move, normalize_uci_move, try_move_to_index  # noqa: E402


CASTLING_UCI = {"e1g1", "e1c1", "e8g8", "e8c8"}
PROMOTION_SUFFIXES = {"q", "r", "b", "n"}


class StandardMoveVocabCrossFixtureTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    def assert_positive_fixture_row_valid(self, row: dict) -> None:
        label = row["label"]
        uci = row["uci"]
        expected_index = row["policy_index"]

        if expected_index == -1:
            raise AssertionError(f"{label}: policy_index -1 is forbidden in fixture context")

        normalized = normalize_uci_move(uci)
        self.assertEqual(normalized, uci, label)

        index = try_move_to_index(uci)
        self.assertIsNotNone(index, label)
        self.assertEqual(index, expected_index, label)
        self.assertEqual(index_to_move(index), uci, label)

        if row.get("requires_promotion_suffix"):
            self.assertEqual(len(uci), 5, label)
            self.assertIn(uci[-1], PROMOTION_SUFFIXES, label)
            self.assertEqual(index_to_move(index)[-1], uci[-1], label)

        if row.get("requires_king_destination_uci"):
            self.assertIn(uci, CASTLING_UCI, label)

    def test_valid_standard_moves_roundtrip_to_stable_policy_index(self) -> None:
        for row in self.fixture["valid_moves"]:
            with self.subTest(row=row["label"]):
                self.assert_positive_fixture_row_valid(row)

    def test_rejected_moves_do_not_enter_python_move_vocab(self) -> None:
        for row in self.fixture["rejected_moves"]:
            with self.subTest(row=row["label"]):
                index = try_move_to_index(row["uci"])
                self.assertIsNone(index, row["label"])

                if row.get("normalizes_but_missing_from_vocab"):
                    self.assertEqual(normalize_uci_move(row["uci"]), row["uci"])

    def test_policy_index_minus_one_is_hard_failure_in_fixture_context(self) -> None:
        for row in self.fixture["invalid_fixture_rows"]:
            with self.subTest(row=row["label"]):
                with self.assertRaisesRegex(AssertionError, "policy_index -1"):
                    self.assert_positive_fixture_row_valid(row)


if __name__ == "__main__":
    unittest.main()
