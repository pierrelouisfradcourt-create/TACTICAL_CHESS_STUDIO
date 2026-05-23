from __future__ import annotations

import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

import ml.move_vocab as move_vocab  # noqa: E402
from ml.move_vocab import (  # noqa: E402
    INDEX_TO_MOVE,
    MOVE_TO_INDEX,
    MOVE_VOCAB,
    PROMOTIONS,
    index_to_move,
    try_move_to_index,
    vocab_fingerprint,
    vocab_size,
)


FILES = "abcdefgh"
RANKS = "12345678"
EXPECTED_VOCAB_SIZE = 4164
EXPECTED_VOCAB_FINGERPRINT = (
    "690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c"
)
CLASSICAL_CASTLING_KEYS = {"e1g1", "e1c1", "e8g8", "e8c8"}


def _all_squares() -> list[str]:
    return [f"{file}{rank}" for rank in RANKS for file in FILES]


def _promotion_base_pair(src: str, dst: str) -> bool:
    file_delta = abs(ord(src[0]) - ord(dst[0]))
    if file_delta > 1:
        return False
    return (src[1], dst[1]) in {("7", "8"), ("2", "1")}


def _standard_coordinate_pairs_in_current_policy() -> list[str]:
    pairs: list[str] = []
    for src in _all_squares():
        for dst in _all_squares():
            if src == dst or _promotion_base_pair(src, dst):
                continue
            pairs.append(src + dst)
    return pairs


def _standard_promotion_entries_in_current_policy() -> list[str]:
    entries: list[str] = []
    for src_rank, dst_rank in (("7", "8"), ("2", "1")):
        for src_file in FILES:
            for dst_file in FILES:
                if abs(ord(src_file) - ord(dst_file)) > 1:
                    continue
                base = f"{src_file}{src_rank}{dst_file}{dst_rank}"
                for suffix in PROMOTIONS:
                    entries.append(base + suffix)
    return entries


class StandardMoveVocabExhaustiveParityTest(unittest.TestCase):
    def test_standard_move_vocab_contains_all_coordinate_uci_pairs(self) -> None:
        coordinate_pairs = _standard_coordinate_pairs_in_current_policy()

        self.assertEqual(len(coordinate_pairs), 3988)
        for move in coordinate_pairs:
            with self.subTest(move=move):
                self.assertIsNotNone(try_move_to_index(move))

    def test_standard_move_vocab_contains_all_standard_promotion_suffixes(self) -> None:
        promotion_entries = _standard_promotion_entries_in_current_policy()

        self.assertEqual(len(promotion_entries), 176)
        for move in promotion_entries:
            with self.subTest(move=move):
                self.assertIsNotNone(try_move_to_index(move))

    def test_standard_move_vocab_contains_classical_castling_keys(self) -> None:
        for move in sorted(CLASSICAL_CASTLING_KEYS):
            with self.subTest(move=move):
                self.assertIsNotNone(try_move_to_index(move))

    def test_standard_move_vocab_rejects_debug_and_malformed_keys(self) -> None:
        rejected = [
            "",
            "e2e2",
            "z2e4",
            "e9e4",
            "e2z4",
            "e2e9",
            "abc",
            "e2e4extra",
            "~Move(unit_id=1,target=e4)",
            "~debug",
            "a7a8k",
            "h2h1x",
        ]

        for move in rejected:
            with self.subTest(move=move):
                self.assertIsNone(try_move_to_index(move))

    def test_standard_move_vocab_roundtrips_all_entries(self) -> None:
        for index, move in enumerate(MOVE_VOCAB):
            with self.subTest(index=index, move=move):
                self.assertEqual(try_move_to_index(move), index)
                self.assertEqual(index_to_move(index), move)

    def test_standard_move_vocab_has_no_duplicate_indices(self) -> None:
        self.assertEqual(len(MOVE_VOCAB), len(set(MOVE_VOCAB)))
        self.assertEqual(len(MOVE_TO_INDEX), len(MOVE_VOCAB))
        self.assertEqual(len(INDEX_TO_MOVE), len(MOVE_VOCAB))
        self.assertEqual(set(INDEX_TO_MOVE), set(range(len(MOVE_VOCAB))))
        self.assertEqual(len(set(MOVE_TO_INDEX.values())), len(MOVE_VOCAB))

    def test_standard_move_vocab_fingerprint_is_stable(self) -> None:
        self.assertEqual(vocab_fingerprint(), EXPECTED_VOCAB_FINGERPRINT)

    def test_standard_move_vocab_size_is_stable(self) -> None:
        coordinate_pairs = _standard_coordinate_pairs_in_current_policy()
        promotion_entries = _standard_promotion_entries_in_current_policy()

        self.assertEqual(vocab_size(), EXPECTED_VOCAB_SIZE)
        self.assertEqual(len(coordinate_pairs) + len(promotion_entries), EXPECTED_VOCAB_SIZE)

    def test_chess960_is_not_claimed_by_standard_vocab_parity(self) -> None:
        self.assertFalse(
            any("chess960" in name.lower() for name in dir(move_vocab)),
            "move_vocab parity tests cover standard UCI helper policy only",
        )
        self.assertEqual(
            CLASSICAL_CASTLING_KEYS,
            {"e1g1", "e1c1", "e8g8", "e8c8"},
        )


if __name__ == "__main__":
    unittest.main()
