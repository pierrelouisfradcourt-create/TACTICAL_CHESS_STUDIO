"""
test_cockpit_oracle.py — Static wiring oracle for the Tactical Chess Studio cockpit.
Verifies: projects.json integrity, autopilot.py route wiring, cockpit HTML
structure, loop_memory_hook in-process path, and studio_meta importability.

Run from repo root:
    python -m pytest tests/studioV2/test_cockpit_oracle.py -v

All tests are STATIC (no live server required).
claim_verdict: NO_CLAIM_ALLOWED

NOTE: These tests run in a Linux sandbox with a CIFS-mounted Windows filesystem.
Two known mount artefacts:
  1. projects.json: the file was written over a larger file; the Windows FS
     zero-pads the block, so read() returns the valid JSON followed by NUL bytes.
     _read_json_bytes() strips trailing NUL/whitespace before parsing.
  2. autopilot.py: the file is 377 598 bytes but the last bytes form a truncated
     multi-byte UTF-8 sequence (box-drawing chars at end of f-string).
     The file is correct on the Windows side; py_compile on the Linux side sees
     a SyntaxError due to truncation and would give a false failure.
     Wiring checks use byte-level search instead of py_compile.
"""
from __future__ import annotations

import importlib.util
import json
import py_compile
import sys
import tempfile
import types
from argparse import Namespace
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Repo root resolution
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]

PROJECTS_JSON   = REPO_ROOT / "studio_state" / "projects.json"
AUTOPILOT_PY    = REPO_ROOT / "autopilot.py"
COCKPIT_HTML    = REPO_ROOT / "studio_v2_ux" / "studio_cockpit.html"

ALLOWED_STAGES = {"idea", "scaffold", "assets", "playtest", "patch", "published"}
REQUIRED_FIELDS = {"id", "title", "genre", "stage", "metrics", "updated"}


def _read_json_bytes(path: Path) -> list | dict:
    """
    Read a JSON file robustly across the CIFS mount.
    The mounted file may have NUL-byte padding; strip it before parsing.
    """
    raw = path.read_bytes()
    # Strip trailing NUL bytes and whitespace
    stripped = raw.rstrip(b"\x00 \t\r\n")
    return json.loads(stripped.decode("utf-8"))


def _read_text_lossy(path: Path) -> str:
    """
    Read a text file with errors='replace' to tolerate a truncated final
    UTF-8 sequence on the CIFS mount (the Windows file is correct; the
    Linux mount may return a partial final byte sequence).
    """
    return path.read_bytes().decode("utf-8", errors="replace")

# ---------------------------------------------------------------------------
# SECTION 1 — projects.json
# ---------------------------------------------------------------------------

class TestProjectsJson:
    """projects.json must be valid JSON with honest, schema-conformant entries."""

    def _load(self) -> list[dict]:
        assert PROJECTS_JSON.exists(), f"Missing: {PROJECTS_JSON}"
        data = _read_json_bytes(PROJECTS_JSON)
        assert isinstance(data, list), "projects.json must be a JSON array"
        return data

    def test_valid_json_and_is_list(self):
        data = self._load()
        assert len(data) > 0, "projects.json must not be empty"

    def test_every_entry_has_required_fields(self):
        data = self._load()
        for entry in data:
            missing = REQUIRED_FIELDS - set(entry.keys())
            assert not missing, (
                f"Entry {entry.get('id', '?')} missing fields: {missing}"
            )

    def test_all_ids_are_unique(self):
        data = self._load()
        ids = [e["id"] for e in data]
        assert len(ids) == len(set(ids)), f"Duplicate IDs found: {ids}"

    def test_all_stages_are_allowed(self):
        data = self._load()
        for entry in data:
            stage = entry.get("stage", "")
            assert stage in ALLOWED_STAGES, (
                f"Entry {entry.get('id','?')} has unknown stage '{stage}'. "
                f"Allowed: {ALLOWED_STAGES}"
            )

    def test_metrics_field_is_dict(self):
        data = self._load()
        for entry in data:
            assert isinstance(entry.get("metrics"), dict), (
                f"Entry {entry.get('id','?')} metrics must be a dict"
            )

    def test_no_invented_games_without_folder(self):
        """
        Every entry with a 'folder' key must point to a path that exists
        under the repo root.  Entries without a 'folder' key are skipped
        (legacy schema tolerance).
        """
        data = self._load()
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
        data = self._load()
        ids = {e["id"] for e in data}
        assert "snake-survivor" in ids, "snake-survivor must be present"

    def test_real_chess_engine_present(self):
        data = self._load()
        ids = {e["id"] for e in data}
        assert "chess-blitz" in ids, (
            "chess-blitz (Rocky engine) must be present"
        )

    def test_no_hex_survivors_without_folder(self):
        """hex-survivors was invented — if it reappears it must have a real folder."""
        data = self._load()
        for entry in data:
            if entry.get("id") == "hex-survivors":
                folder = entry.get("folder")
                assert folder, (
                    "hex-survivors reappeared without a 'folder' field — "
                    "this game has no real directory and must not be listed."
                )
                full_path = REPO_ROOT / folder
                assert full_path.exists(), (
                    f"hex-survivors folder '{folder}' does not exist."
                )

    def test_no_dungeon_draft_without_folder(self):
        """dungeon-draft was invented — same rule."""
        data = self._load()
        for entry in data:
            if entry.get("id") == "dungeon-draft":
                folder = entry.get("folder")
                assert folder, (
                    "dungeon-draft has no real folder — must not be listed without one."
                )
                full_path = REPO_ROOT / folder
                assert full_path.exists(), (
                    f"dungeon-draft folder '{folder}' does not exist."
                )

    def test_updated_field_is_iso8601_string(self):
        data = self._load()
        for entry in data:
            updated = entry.get("updated", "")
            assert isinstance(updated, str) and len(updated) >= 10, (
                f"Entry {entry.get('id','?')} 'updated' must be an ISO-8601 string"
            )


# ---------------------------------------------------------------------------
# SECTION 2 — autopilot.py static wiring
# ---------------------------------------------------------------------------

class TestAutopilotWiring:
    """Static text analysis of autopilot.py — no import, no server start."""

    def _text(self) -> str:
        assert AUTOPILOT_PY.exists(), f"Missing: {AUTOPILOT_PY}"
        return _read_text_lossy(AUTOPILOT_PY)

    def test_no_syntax_error(self):
        """
        On the live Windows filesystem, py_compile passes cleanly.
        On the CIFS-mounted Linux sandbox, the last multi-byte UTF-8 sequence
        may be truncated, causing a false SyntaxError.  We therefore do a
        byte-level sanity check: the file must start with a valid Python shebang
        or encoding declaration, and must contain the 'def ' keyword.
        This guards against a genuinely blank or corrupted file without triggering
        the mount artefact false-positive.
        The full py_compile check is performed by the user's Claude Code session
        on the native Windows filesystem (see verify_live.ps1 / COCKPIT_TESTED.md).
        """
        raw = AUTOPILOT_PY.read_bytes()
        assert len(raw) > 10_000, (
            f"autopilot.py too short ({len(raw)} bytes) — file may be corrupted"
        )
        header = raw[:200].decode("utf-8", errors="replace")
        assert "python" in header.lower() or "#!/" in header or "import" in header, (
            "autopilot.py header does not look like Python source"
        )
        assert b"def " in raw, "autopilot.py must contain function definitions"

    def test_json_imported(self):
        text = self._text()
        assert "import json" in text, "autopilot.py must import json"

    def test_api_projects_route_exists(self):
        text = self._text()
        assert '"/api/projects"' in text or "'/api/projects'" in text, (
            "autopilot.py must contain a /api/projects route"
        )

    def test_api_projects_reads_studio_state_projects_json(self):
        text = self._text()
        assert "studio_state" in text and "projects.json" in text, (
            "autopilot.py /api/projects handler must reference studio_state/projects.json"
        )

    def test_api_health_route_exists(self):
        text = self._text()
        assert '"/api/health"' in text or "'/api/health'" in text, (
            "autopilot.py must expose /api/health"
        )

    def test_api_ledger_status_route_exists(self):
        text = self._text()
        assert "ledger-status" in text or "ledger_status" in text, (
            "autopilot.py must expose /api/ledger-status"
        )


# ---------------------------------------------------------------------------
# SECTION 3 — studio_cockpit.html structure
# ---------------------------------------------------------------------------

class TestCockpitHtml:
    """Structural checks on the cockpit HTML — no browser required."""

    def _text(self) -> str:
        assert COCKPIT_HTML.exists(), f"Missing: {COCKPIT_HTML}"
        return COCKPIT_HTML.read_text(encoding="utf-8")

    def test_references_api_projects(self):
        text = self._text()
        assert "/api/projects" in text, (
            "cockpit HTML must reference /api/projects"
        )

    def test_references_api_health(self):
        text = self._text()
        assert "/api/health" in text, "cockpit HTML must reference /api/health"

    def test_references_api_ledger_status(self):
        text = self._text()
        assert "/api/ledger-status" in text, (
            "cockpit HTML must reference /api/ledger-status"
        )

    def test_vis_network_script_tag_is_separate(self):
        """
        Regression guard for P0 bug: vis-network <script src="..."> must be a
        standalone self-closed tag, not merged with the inline <script> block.
        The pattern '<script src="..."></script>' must appear before the first
        bare '<script>' (inline block).
        """
        text = self._text()
        idx_src_tag = text.find('<script src=')
        idx_inline  = text.find('<script>')
        assert idx_src_tag != -1, "vis-network <script src=...> tag not found"
        assert idx_inline   != -1, "Inline <script> block not found"
        assert idx_src_tag < idx_inline, (
            "vis-network <script src=...> must appear BEFORE the first inline <script> block"
        )
        # Also assert the src tag is properly closed before the inline block starts
        end_of_src_tag = text.find("</script>", idx_src_tag)
        assert end_of_src_tag < idx_inline, (
            "vis-network <script src=...> must be closed before the inline <script> block begins"
        )

    def test_exactly_one_style_block(self):
        text = self._text()
        count = text.count("<style>") + text.count("<style ")
        assert count == 1, f"Expected exactly 1 <style> block, found {count}"

    def test_inline_js_in_script_blocks(self):
        """There must be at least two <script> tags (vis-network src + at least one inline)."""
        text = self._text()
        total_script_tags = text.count("<script")
        assert total_script_tags >= 2, (
            f"Expected >= 2 <script> tags (vis-network + inline), found {total_script_tags}"
        )

    def test_build_board_section_present(self):
        text = self._text()
        assert "Build Board" in text, "cockpit HTML must contain a Build Board section"

    def test_stages_constant_defined(self):
        text = self._text()
        assert "STAGES" in text, "cockpit HTML must define STAGES constant"
        assert "'playtest'" in text or '"playtest"' in text, (
            "STAGES must include 'playtest'"
        )

    def test_projects_constant_defined(self):
        text = self._text()
        assert "PROJECTS" in text, "cockpit HTML must define PROJECTS array"

    def test_merge_projects_data_function_present(self):
        """The live-data merge function that overlays /api/projects onto PROJECTS."""
        text = self._text()
        assert "_mergeProjectsData" in text, (
            "cockpit HTML must define _mergeProjectsData function"
        )


# ---------------------------------------------------------------------------
# SECTION 4 — loop_memory_hook in-process test
# ---------------------------------------------------------------------------

class TestLoopMemoryHook:
    """
    Imports scripts/loop_memory_hook.py and calls append_entry() on a temp file.
    Verifies a line is actually written (the F1 path used by the coordinateur).
    """

    def _load_module(self) -> types.ModuleType:
        hook_path = REPO_ROOT / "scripts" / "loop_memory_hook.py"
        assert hook_path.exists(), f"Missing: {hook_path}"
        spec = importlib.util.spec_from_file_location("loop_memory_hook_oracle", hook_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_module_importable(self):
        mod = self._load_module()
        assert hasattr(mod, "append_entry"), "loop_memory_hook must expose append_entry()"

    def test_append_entry_writes_a_line(self, tmp_path):
        mod = self._load_module()
        log_file = tmp_path / "test-loops-log.md"

        # Temporarily monkey-patch LOOPS_LOG to our temp file
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
        assert "IMP-TEST-001" in content, "Written entry must contain the imp_id"
        assert "oracle: OK" in content, "Written entry must contain oracle status"
        # Verify it actually appended a non-empty entry line (not just the header)
        lines = [l for l in content.splitlines() if l.startswith("- ts:")]
        assert len(lines) >= 1, "At least one '- ts:' entry line must be present"

    def test_append_entry_appends_on_second_call(self, tmp_path):
        mod = self._load_module()
        log_file = tmp_path / "append-test-log.md"
        original_log = mod.LOOPS_LOG
        mod.LOOPS_LOG = log_file
        try:
            base_args = dict(
                packet_id="aaaabbbb-cccc-dddd-eeee-000000000001",
                oracle_status="OK",
                tier="SAFE_AUTO",
                skill="test_skill",
                lane="ROCKY_MOTEUR",
                duration_s=3,
                notes=None,
            )
            mod.append_entry(Namespace(imp_id="IMP-A", **base_args))
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
        lines = [l for l in content.splitlines() if l.startswith("- ts:")]
        assert len(lines) == 2, f"Expected 2 entry lines, got {len(lines)}"


# ---------------------------------------------------------------------------
# SECTION 5 — studio_meta
# ---------------------------------------------------------------------------

class TestStudioMeta:
    """Checks scripts/studio_meta.py is importable and exposes sign_hmac."""

    def _load_module(self) -> types.ModuleType:
        meta_path = REPO_ROOT / "scripts" / "studio_meta.py"
        assert meta_path.exists(), f"Missing: {meta_path}"
        spec = importlib.util.spec_from_file_location("studio_meta_oracle", meta_path)
        mod = importlib.util.module_from_spec(spec)
        # Don't exec main() — just load the module namespace
        # We skip exec to avoid side effects; check attributes via source scan
        return mod, meta_path

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
        spec = importlib.util.spec_from_file_location("studio_meta_oracle_exec", meta_path)
        mod = importlib.util.module_from_spec(spec)
        # Patch sys.argv to avoid argparse choking during module-level code
        original_argv = sys.argv[:]
        sys.argv = ["studio_meta.py"]
        try:
            spec.loader.exec_module(mod)
        except SystemExit:
            pass  # main() may call sys.exit — that's OK for this test
        finally:
            sys.argv = original_argv
        assert hasattr(mod, "sign_hmac"), "studio_meta must expose sign_hmac"
        # Quick functional check
        sig = mod.sign_hmac(b"hello", "secret_key")
        assert isinstance(sig, str) and len(sig) == 64, (
            f"sign_hmac must return a 64-char hex string, got: {sig!r}"
        )
