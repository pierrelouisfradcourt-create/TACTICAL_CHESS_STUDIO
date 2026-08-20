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


def builder_positive_row() -> dict[str, Any]:
    return {
        "fen": FEN,
        "good_move": "e2e4",
        "bad_moves": ["e2e3", "g1h3"],
        "trainable": True,
        "phase": "opening",
        "quality": "builder_fixture",
        "type": "positive",
    }


def builder_negative_row() -> dict[str, Any]:
    row = builder_positive_row()
    row.update(
        {
            "good_move": "e2e3",
            "bad_moves": ["e2e4"],
            "type": "negative",
            "quality": "builder_negative_fixture",
        }
    )
    return row


def builder_mirror_row() -> dict[str, Any]:
    row = builder_positive_row()
    row.update(
        {
            "type": "mirror",
            "mirror_of": "builder_positive_fixture",
            "quality": "builder_mirror_fixture",
        }
    )
    return row


def builder_bad_reason_row() -> dict[str, Any]:
    row = builder_negative_row()
    row["bad_reason"] = "legacy_builder_negative_label"
    return row


def elite_best_move_copy_without_am_metadata() -> dict[str, Any]:
    return {
        "fen": FEN,
        "best_move": "e2e4",
        "legal_moves": ["e2e4"],
        "policy_only": True,
        "phase": "opening",
        "source": "elite_copy_fixture",
    }


class DatasetBuilderLegacyRowsRejectedTest(unittest.TestCase):
    def write_jsonl(self, rows: Iterable[dict[str, Any]]) -> str:
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        path = Path(tmpdir.name) / "builder_legacy_fixture.jsonl"
        path.write_text(
            "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows),
            encoding="utf-8",
        )
        return str(path)

    def assert_row_rejected_by_admission(
        self,
        row: dict[str, Any],
        expected_reason: str = "missing_action_id",
    ) -> None:
        result = validate_am_dataset_admission(row)

        self.assertFalse(result.admissible)
        self.assertIn(expected_reason, result.reasons)
        self.assertIn("missing_legal_action", result.reasons)
        self.assertIn("missing_action_mask_provenance", result.reasons)
        self.assertIn("missing_humangate_authorization", result.reasons)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)

    def assert_row_rejected_by_preflight(
        self,
        row: dict[str, Any],
        expected_reason: str = "missing_action_id",
    ) -> None:
        result = preflight_training_dataset(self.write_jsonl([row]))

        self.assertFalse(result.admissible)
        self.assertIn("row_1", result.reasons)
        self.assertIn(expected_reason, result.reasons)
        self.assertIn("missing_action_mask_provenance", result.reasons)
        self.assertIn("missing_humangate_authorization", result.reasons)
        self.assertIn("dataset_admission_gate_blocked", result.reasons)

    def assert_row_rejected_by_teacher_dataset(
        self,
        row: dict[str, Any],
        expected_reason: str = "missing_action_id",
    ) -> None:
        with self.assertRaisesRegex(
            DatasetAdmissionError,
            f"{expected_reason}|missing_action_mask_provenance|dataset_admission_gate_blocked",
        ):
            TeacherDataset(self.write_jsonl([row]))

    def test_builder_positive_row_is_not_am_admissible(self) -> None:
        self.assert_row_rejected_by_admission(builder_positive_row())

    def test_builder_positive_row_is_rejected_by_preflight(self) -> None:
        self.assert_row_rejected_by_preflight(builder_positive_row())

    def test_builder_positive_row_is_rejected_by_teacher_dataset(self) -> None:
        self.assert_row_rejected_by_teacher_dataset(builder_positive_row())

    def test_builder_negative_row_is_rejected(self) -> None:
        self.assert_row_rejected_by_admission(builder_negative_row())
        self.assert_row_rejected_by_preflight(builder_negative_row())
        self.assert_row_rejected_by_teacher_dataset(builder_negative_row())

    def test_builder_mirror_row_is_rejected(self) -> None:
        row = builder_mirror_row()

        self.assertIn("mirror_of", row)
        self.assert_row_rejected_by_admission(row)
        self.assert_row_rejected_by_preflight(row)
        self.assert_row_rejected_by_teacher_dataset(row)

    def test_builder_bad_reason_row_is_rejected(self) -> None:
        row = builder_bad_reason_row()

        self.assertIn("bad_reason", row)
        self.assert_row_rejected_by_admission(row)
        self.assert_row_rejected_by_preflight(row)
        self.assert_row_rejected_by_teacher_dataset(row)

    def test_elite_best_move_copy_without_am_metadata_is_rejected(self) -> None:
        self.assert_row_rejected_by_admission(elite_best_move_copy_without_am_metadata())
        self.assert_row_rejected_by_preflight(elite_best_move_copy_without_am_metadata())
        self.assert_row_rejected_by_teacher_dataset(
            elite_best_move_copy_without_am_metadata()
        )

    def test_router_admissible_fields_do_not_rescue_builder_row(self) -> None:
        for router_fields in (
            {"admissible": True},
            {"dataset_fitness": "admissible"},
            {"admissible": True, "dataset_fitness": "admissible"},
        ):
            with self.subTest(router_fields=router_fields):
                row = builder_positive_row()
                row.update(router_fields)

                self.assert_row_rejected_by_admission(row)
                self.assert_row_rejected_by_preflight(row)
                self.assert_row_rejected_by_teacher_dataset(row)

    def test_builder_legacy_rows_create_no_project_outputs(self) -> None:
        output_paths = [
            REPO_ROOT / "lab" / "runs",
            REPO_ROOT / "lab" / "gameplay_observation" / "sandbox_outputs",
            REPO_ROOT / "models" / "latest.pt",
            REPO_ROOT / "models" / "best.pt",
            REPO_ROOT / "datasets",
        ]
        before = self.snapshot_paths(output_paths)

        self.assert_row_rejected_by_admission(builder_positive_row())
        self.assert_row_rejected_by_preflight(builder_negative_row())
        self.assert_row_rejected_by_teacher_dataset(builder_mirror_row())

        self.assertEqual(before, self.snapshot_paths(output_paths))

    def test_no_admission_allow_path_is_introduced_for_builder_rows(self) -> None:
        source = DATASET_LOADER_PATH.read_text(encoding="utf-8")

        self.assertNotIn("allow_dataset_use", source)
        self.assertNotIn('row.get("admissible")', source)
        self.assertNotIn("row.get('admissible')", source)
        self.assertNotIn("dataset_fitness", source)

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
