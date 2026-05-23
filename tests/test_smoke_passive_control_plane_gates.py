import importlib.util
import sys
from pathlib import Path
from unittest import TestCase


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts" / "control_plane"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = SCRIPT_DIR / "smoke_passive_control_plane_gates.py"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

SPEC = importlib.util.spec_from_file_location("smoke_passive_control_plane_gates", SCRIPT_PATH)
assert SPEC is not None
smoke_passive_control_plane_gates = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(smoke_passive_control_plane_gates)

SENSITIVE_ARTIFACT_PATHS = (
    PROJECT_ROOT / ".studio_state" / "inbox.json",
    PROJECT_ROOT / ".studio_state" / "latest.json",
    PROJECT_ROOT / "latest.json",
    PROJECT_ROOT / "lab" / "latest.json",
)


def artifact_snapshot() -> dict[Path, tuple[bool, int | None, int | None]]:
    snapshot = {}
    for path in SENSITIVE_ARTIFACT_PATHS:
        if not path.exists():
            snapshot[path] = (False, None, None)
            continue
        stat = path.stat()
        snapshot[path] = (True, stat.st_size, stat.st_mtime_ns)
    return snapshot


class PassiveControlPlaneGatesSmokeTests(TestCase):
    def test_aggregate_passive_gates_pass_and_keep_authorities_blocked(self) -> None:
        report = smoke_passive_control_plane_gates.run_passive_gates()

        self.assertEqual("PASS", report["overall_status"])
        self.assertEqual("PASS", report["integration_smoke_status"])
        self.assertEqual("PASS", report["hygiene_smoke_status"])
        self.assertEqual("BLOCKED", report["runtime_authority"])
        self.assertEqual("BLOCKED", report["git_authority"])
        self.assertEqual("BLOCKED", report["training_authority"])
        self.assertEqual("BLOCKED", report["dataset_authority"])
        self.assertEqual("BLOCKED", report["benchmark_authority"])
        self.assertEqual([], report["errors"])

    def test_aggregate_passive_gates_do_not_create_or_modify_runtime_artifacts(self) -> None:
        before = artifact_snapshot()

        smoke_passive_control_plane_gates.run_passive_gates()

        self.assertEqual(before, artifact_snapshot())


if __name__ == "__main__":
    import unittest

    unittest.main()
