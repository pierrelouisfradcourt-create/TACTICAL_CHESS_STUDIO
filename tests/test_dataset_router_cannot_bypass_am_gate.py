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
    DatasetAdmissionError,
    TeacherDataset,
    preflight_training_dataset,
    validate_am_dataset_admission,
)


FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
DATASET_LOADER_PATH = REPO_ROOT / "ml" / "dataset_loader.py"


def legacy_router_admissible_row() -> dict[str, Any]:
    return {
        "fen": FEN,
        "best_move": "e2e4",
        "policy_only": True,
        "legal_moves": ["e2e4"],
        "top_moves": ["e2e4"],
        "top_scores": [1.0],
        "admissible": True,
        "is_admissible": True,
        "trainable": True,
        "operational": True,
        "dataset_fitness": "admissible",
        "dataset_admission": {
            "dataset_fitness": "admissible",
            "reasons": [],
        },
        "router_version": "dataset_decision_router_v2_curriculum_brain",
    }


class DatasetRouterCannotBypassAmGateTest(unittest.TestCase):
    def write_jsonl(self, rows: Iterable[dict[str, Any]]) -> str:
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        path = Path(tmpdir.name) / "router_admissible_fixture.jsonl"
        path.write_text(
            "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows),
            encoding="utf-8",
        )
        return str(path)

    @staticmethod
    def snapshot_output_paths() -> dict[str, list[str] | bool]:
        paths = [
            REPO_ROOT / "lab" / "runs",
            REPO_ROOT / "lab" / "gameplay_observation" / "sandbox_outputs",
            REPO_ROOT / "models" / "latest.pt",
            REPO_ROOT / "models" / "best.pt",
        ]
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

    def test_router_admissible_field_does_not_satisfy_am_admission(self) -> None:
        result = validate_am_dataset_admission(legacy_router_admissible_row())

        self.assertFalse(result.admissible)
        self.assertIn("missing_action_id", result.reasons)
        self.assertIn("missing_legal_action", result.reasons)
        self.assertIn("missing_action_mask_provenance", result.reasons)
        self.assertIn("missing_humangate_authorization_state", result.reasons)
        self.assertIn("missing_humangate_authorization", result.reasons)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)

    def test_router_trainable_field_does_not_satisfy_am_admission(self) -> None:
        row = legacy_router_admissible_row()
        row["trainable"] = True

        result = validate_am_dataset_admission(row)

        self.assertFalse(result.admissible)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)
        self.assertIn("missing_action_mask_provenance", result.reasons)

    def test_router_fitness_admissible_does_not_satisfy_preflight(self) -> None:
        result = preflight_training_dataset(
            self.write_jsonl([legacy_router_admissible_row()])
        )

        self.assertFalse(result.admissible)
        self.assertIn("row_1", result.reasons)
        self.assertIn("missing_action_id", result.reasons)
        self.assertIn("missing_action_mask_provenance", result.reasons)
        self.assertIn("missing_humangate_authorization", result.reasons)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)

    def test_teacher_dataset_rejects_router_admissible_row(self) -> None:
        before = self.snapshot_output_paths()

        with self.assertRaisesRegex(
            DatasetAdmissionError,
            "missing_action_id|missing_action_mask_provenance|dataset_admission_gate_blocked",
        ):
            TeacherDataset(self.write_jsonl([legacy_router_admissible_row()]))

        self.assertEqual(before, self.snapshot_output_paths())

    def test_router_admissible_does_not_replace_humangate_or_provenance(self) -> None:
        row = legacy_router_admissible_row()
        row.update(
            {
                "action_id_version": "action_id_v0",
                "legal_action_version": "legal_action_v0",
                "action_mask_version": "action_mask_v0_skeleton",
                "move_vocab_fingerprint": "fixture-fingerprint",
                "legal_move_source": "rust_engine",
                "ruleset": "standard",
                "variant": "classical",
            }
        )

        result = validate_am_dataset_admission(row)

        self.assertFalse(result.admissible)
        self.assertIn("missing_action_id", result.reasons)
        self.assertIn("missing_legal_action", result.reasons)
        self.assertIn("missing_action_mask_provenance", result.reasons)
        self.assertIn("missing_humangate_authorization_state", result.reasons)
        self.assertIn("missing_humangate_authorization", result.reasons)

    def test_router_admissible_does_not_replace_versioned_am_fields(self) -> None:
        result = validate_am_dataset_admission(legacy_router_admissible_row())

        self.assertFalse(result.admissible)
        self.assertIn("missing_action_id_version", result.reasons)
        self.assertIn("missing_legal_action_version", result.reasons)
        self.assertIn("missing_action_mask_version", result.reasons)
        self.assertIn("missing_move_vocab_fingerprint", result.reasons)

    def test_no_admission_allow_path_is_introduced_for_router_fields(self) -> None:
        source = DATASET_LOADER_PATH.read_text(encoding="utf-8")

        self.assertNotIn("allow_dataset_use", source)
        self.assertNotIn('row.get("admissible")', source)
        self.assertNotIn("row.get('admissible')", source)
        self.assertNotIn("dataset_fitness", source)


if __name__ == "__main__":
    unittest.main()
