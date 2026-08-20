from __future__ import annotations

import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "shared_puzzle_candidate_rng_tutorial_v0.json"


class SharedPuzzleCandidateFixtureTest(unittest.TestCase):
    def test_rng_tutorial_fixture_invariants(self) -> None:
        with FIXTURE_PATH.open("r", encoding="utf-8") as handle:
            candidate = json.load(handle)

        self.assertEqual(candidate["source_type"], "rng_tutorial_source")
        self.assertEqual(candidate["replay_status"], "candidate")
        self.assertIs(candidate["humangate_required"], True)
        self.assertIs(candidate["dataset_admissible"], False)
        self.assertEqual(candidate["solved_count"], 0)
        self.assertEqual(candidate["failed_count"], 0)
        self.assertEqual(candidate["regressed_count"], 0)
        self.assertIsNone(candidate["observed_bad_move"])
        self.assertIsNone(candidate["source_game_id"])
        self.assertIsNone(candidate["source_ply"])
        self.assertIsInstance(candidate["neural_context"], dict)

        solution_line = candidate["solution_line"]
        self.assertIsInstance(solution_line, list)
        self.assertGreater(len(solution_line), 0)
        self.assertIn(candidate["candidate_better_move"], solution_line)

        self.assertIsInstance(candidate["explanation_md"], str)
        self.assertGreater(len(candidate["explanation_md"].strip()), 0)
        self.assertIsInstance(candidate["theme"], str)
        self.assertGreater(len(candidate["theme"].strip()), 0)
        self.assertIsInstance(candidate["difficulty_level"], str)
        self.assertGreater(len(candidate["difficulty_level"].strip()), 0)


if __name__ == "__main__":
    unittest.main()
