import importlib.util
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "check_workspace_hygiene.py"
SPEC = importlib.util.spec_from_file_location("check_workspace_hygiene", SCRIPT_PATH)
assert SPEC is not None
check_workspace_hygiene = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(check_workspace_hygiene)


class TmpAccessProbeTests(TestCase):
    def test_reports_permission_denied_for_tmp_workspace(self) -> None:
        repo_root = Path("repo")
        lab_dir = repo_root / "lab"
        blocked_tmp = lab_dir / "tmp_blocked"
        allowed_tmp = lab_dir / "tmp_ok"
        ignored_path = lab_dir / "notes"

        def fake_iterdir(path: Path):
            if path == lab_dir:
                return iter([blocked_tmp, allowed_tmp, ignored_path])
            if path == blocked_tmp:
                raise PermissionError("denied")
            return iter([])

        with patch.object(check_workspace_hygiene.Path, "iterdir", fake_iterdir):
            issues = check_workspace_hygiene.probe_inaccessible_tmp_paths(repo_root)

        self.assertEqual(1, len(issues))
        self.assertTrue(issues[0].startswith("lab/tmp_blocked:"))


if __name__ == "__main__":
    import unittest

    unittest.main()
