import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from dataset_decision_router import (
    UnsupportedRouterInput,
    build_dataset_decision,
    validate_router_row_file_path,
    validate_training_dataset_path,
)


class TestValidateTrainingDatasetPath:
    def test_directory_is_accepted(self, tmp_path):
        result = validate_training_dataset_path(tmp_path)
        assert result == tmp_path

    def test_missing_path_raises_file_not_found(self, tmp_path):
        missing = tmp_path / "no_such_file.jsonl"
        with pytest.raises(FileNotFoundError):
            validate_training_dataset_path(missing)

    def test_jsonl_file_is_accepted(self, tmp_path):
        jsonl = tmp_path / "data.jsonl"
        jsonl.write_text("{}\n", encoding="utf-8")
        result = validate_training_dataset_path(jsonl)
        assert result == jsonl

    def test_blocked_csv_raises_value_error(self, tmp_path):
        blocked = tmp_path / "promoted_pedagogy_pack.csv"
        blocked.write_text("a,b\n", encoding="utf-8")
        with pytest.raises(ValueError):
            validate_training_dataset_path(blocked)


class TestValidateRouterRowFilePath:
    def test_directory_raises_unsupported_router_input(self, tmp_path):
        with pytest.raises(UnsupportedRouterInput) as exc_info:
            validate_router_row_file_path(tmp_path)
        assert exc_info.value.reason_code == "unsupported_dataset_root_for_router"

    def test_jsonl_file_is_accepted(self, tmp_path):
        jsonl = tmp_path / "data.jsonl"
        jsonl.write_text("{}\n", encoding="utf-8")
        result = validate_router_row_file_path(jsonl)
        assert result == jsonl

    def test_manifest_json_raises_unsupported(self, tmp_path):
        manifest = tmp_path / "manifest.json"
        manifest.write_text("{}\n", encoding="utf-8")
        with pytest.raises(UnsupportedRouterInput) as exc_info:
            validate_router_row_file_path(manifest)
        assert exc_info.value.reason_code == "unsupported_manifest_for_router"

    def test_non_jsonl_file_raises_unsupported(self, tmp_path):
        txt = tmp_path / "data.txt"
        txt.write_text("hello\n", encoding="utf-8")
        with pytest.raises(UnsupportedRouterInput) as exc_info:
            validate_router_row_file_path(txt)
        assert exc_info.value.reason_code == "unsupported_non_jsonl_for_router"


class TestBuildDatasetDecisionWithDirectory:
    def test_directory_input_returns_blocked_not_error(self, tmp_path):
        nonexistent_pointer = str(tmp_path / "nonexistent_pointer.txt")
        decision = build_dataset_decision(
            explicit_input=str(tmp_path),
            active_dataset_path=nonexistent_pointer,
        )
        assert decision["status"] == "blocked", (
            f"Expected status='blocked' for directory input, got status='{decision['status']}'. "
            f"error={decision.get('error')}"
        )
        assert decision["reason_code"] == "unsupported_dataset_root_for_router"

    def test_directory_input_sets_resolved_path(self, tmp_path):
        nonexistent_pointer = str(tmp_path / "nonexistent_pointer.txt")
        decision = build_dataset_decision(
            explicit_input=str(tmp_path),
            active_dataset_path=nonexistent_pointer,
        )
        assert decision["resolved_dataset_path"] is not None
        assert Path(decision["resolved_dataset_path"]).is_dir()

    def test_directory_input_does_not_raise_permission_error(self, tmp_path):
        nonexistent_pointer = str(tmp_path / "nonexistent_pointer.txt")
        try:
            build_dataset_decision(
                explicit_input=str(tmp_path),
                active_dataset_path=nonexistent_pointer,
            )
        except PermissionError as exc:
            pytest.fail(
                f"PermissionError raised for directory input — bug not fixed: {exc}"
            )
