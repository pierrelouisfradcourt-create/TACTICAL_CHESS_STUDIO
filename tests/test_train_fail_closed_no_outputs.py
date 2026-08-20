from __future__ import annotations

import ast
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
ML_ROOT = REPO_ROOT / "ml"
TRAIN_PATH = ML_ROOT / "train.py"


class TrainFailClosedNoOutputsTest(unittest.TestCase):
    def test_train_constructs_teacher_dataset_before_output_or_training_boundaries(self) -> None:
        source = TRAIN_PATH.read_text(encoding="utf-8")
        teacher_dataset_load = source.index("dataset = TeacherDataset(dataset_path)")

        output_and_training_boundaries = [
            "run_id = time.strftime",
            "run_dir = os.path.join",
            "model_dir = os.environ.get",
            "os.makedirs(run_dir",
            "os.makedirs(model_dir",
            "indexed_dataset = IndexedTeacherDataset",
            "loader = DataLoader",
            "model = PolicyValueNet().to(device)",
            "optimizer = torch.optim.Adam",
            "best_path =",
            "latest_path =",
            "registry_path =",
            "epoch_log_path =",
            "for epoch in range",
            "torch.save(",
        ]

        for marker in output_and_training_boundaries:
            with self.subTest(marker=marker):
                self.assertLess(teacher_dataset_load, source.index(marker))

    def test_train_does_not_catch_dataset_admission_error_and_continue(self) -> None:
        source = TRAIN_PATH.read_text(encoding="utf-8")
        tree = ast.parse(source)
        main_node = next(
            node
            for node in ast.walk(tree)
            if isinstance(node, ast.FunctionDef) and node.name == "main"
        )
        teacher_call = next(
            node
            for node in ast.walk(main_node)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "TeacherDataset"
        )

        enclosing_try_nodes = []
        for node in ast.walk(main_node):
            if not isinstance(node, ast.Try):
                continue
            start = getattr(node, "lineno", -1)
            end = getattr(node, "end_lineno", -1)
            if start <= teacher_call.lineno <= end:
                enclosing_try_nodes.append(node)

        self.assertEqual(enclosing_try_nodes, [])
        self.assertNotIn("DatasetAdmissionError", source)

    def test_runtime_invocation_is_blocked_by_train_dependency_boundary(self) -> None:
        source = TRAIN_PATH.read_text(encoding="utf-8")

        self.assertIn("import torch.nn.functional as F", source)
        self.assertIn("model = PolicyValueNet().to(device)", source)
        self.assertIn("optimizer = torch.optim.Adam", source)


if __name__ == "__main__":
    unittest.main()
