from __future__ import annotations

import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "rocky_error_source_input_v0.json"
FORBIDDEN_CLAIMS = {
    "training_ready",
    "dataset_ready",
    "benchmark_proof",
    "model_promotion",
    "accepted",
    "solved",
}


def _walk_values(value: Any) -> list[Any]:
    if isinstance(value, dict):
        collected: list[Any] = []
        for key, nested in value.items():
            collected.append(key)
            collected.extend(_walk_values(nested))
        return collected
    if isinstance(value, list):
        collected = []
        for nested in value:
            collected.extend(_walk_values(nested))
        return collected
    return [value]


class RockyErrorSourceInputFixtureTest(unittest.TestCase):
    def test_rocky_error_source_input_invariants(self) -> None:
        with FIXTURE_PATH.open("r", encoding="utf-8") as handle:
            source_input = json.load(handle)

        self.assertEqual(source_input["source_type"], "rocky_error_source")
        self.assertIs(source_input["humangate_required"], True)
        self.assertIs(source_input["dataset_admissible"], False)
        self.assertEqual(source_input["replay_status"], "candidate")

        self.assertIsInstance(source_input["source_game_id"], str)
        self.assertGreater(len(source_input["source_game_id"].strip()), 0)
        self.assertIsInstance(source_input["source_ply"], int)
        self.assertGreaterEqual(source_input["source_ply"], 0)
        self.assertIsInstance(source_input["observed_bad_move"], str)
        self.assertGreater(len(source_input["observed_bad_move"].strip()), 0)
        self.assertIsInstance(source_input["candidate_better_move"], str)
        self.assertGreater(len(source_input["candidate_better_move"].strip()), 0)

        self.assertIsInstance(source_input["legal_action_evidence"], dict)
        self.assertIsInstance(source_input["search_evidence"], dict)
        self.assertIsInstance(source_input["neural_context"], dict)
        self.assertIn("provenance", source_input)
        self.assertIsInstance(source_input["provenance"], dict)

        observed_claims = {
            str(value)
            for value in _walk_values(source_input)
            if isinstance(value, str) and str(value) in FORBIDDEN_CLAIMS
        }
        self.assertEqual(observed_claims, set())
        self.assertTrue(FORBIDDEN_CLAIMS.isdisjoint(source_input.keys()))


if __name__ == "__main__":
    unittest.main()
