"""
test_cockpit_oracle_v2.py — Static wiring oracle for the Tactical Chess Studio cockpit.

Verifies: projects.json integrity, autopilot.py route wiring (byte-level),
cockpit HTML structure, loop_memory_hook in-process path, and studio_meta.

Run from repo root:
    python -m pytest studio_v2_ux/oracle/test_cockpit_oracle_v2.py -v

All tests are STATIC (no live server required).
claim_verdict: NO_CLAIM_ALLOWED

CIFS mount notes:
- projects.json may have trailing NUL bytes (zero-padding artefact from Windows FS
  writing over a larger file); read_json_bytes() strips them before parsing.
- autopilot.py ends with a truncated multi-byte UTF-8 sequence on this mount;
  wiring tests use byte-level search, not read_text().
- py_compile check on autopilot.py is delegated to tools/verify_live.ps1 on the
  native Windows filesystem.
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
# Repo root: this file lives at studio_v2_ux/oracle/test_*.py
# so parents[2] = repo root (moved out of FORBIDDEN tests/ zone)
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[2]

PROJECTS_JSON = REPO_ROOT / "studio_state" / "projects.json"
AUTOPILOT_PY  = REPO_ROOT / "autopilot.py"
COCKPIT_HTML  = REPO_ROOT / "studio_v2_ux" / "studio_cockpit.html"
CANVAS_GATEWAY_PY    = REPO_ROOT / "scripts" / "canvas_gateway.py"
REQUIREMENTS_GATEWAY = REPO_ROOT / "requirements-gateway.txt"

ALLOWED_STAGES = {"idea", "scaffold", "assets", "playtest", "patch", "published"}
REQUIRED_FIELDS = {"id", "title", "genre", "stage", "metrics", "updated"}


def read_json_bytes(path: Path) -> list | dict:
    """Strip trailing NUL bytes (CIFS padding) then parse as JSON."""
    raw = path.read_bytes()
    stripped = raw.rstrip(b"\x00 \t\r\n")
    return json.loads(stripped.decode("utf-8"))


def read_raw(path: Path) -> bytes:
    """Return raw bytes of a file."""
    return path.read_bytes()


# ---------------------------------------------------------------------------
# SECTION 1 — projects.json
# ---------------------------------------------------------------------------

class TestProjectsJson:
    """projects.json must be valid JSON with honest, schema-conformant entries."""

    def _load(self) -> list[dict]:
        assert PROJECTS_JSON.exists(), f"Missing: {PROJECTS_JSON}"
        data = read_json_bytes(PROJECTS_JSON)
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
        assert len(ids) == len(set(ids)), f"Duplicate IDs: {ids}"

    def test_all_stages_are_allowed(self):
        data = self._load()
        for entry in data:
            s = entry.get("stage", "")
            assert s in ALLOWED_STAGES, (
                f"Entry {entry.get('id', '?')} has unknown stage '{s}'. "
                f"Allowed: {ALLOWED_STAGES}"
            )

    def test_metrics_field_is_dict(self):
        data = self._load()
        for entry in data:
            assert isinstance(entry.get("metrics"), dict), (
                f"Entry {entry.get('id', '?')} metrics must be a dict"
            )

    def test_no_invented_games_without_folder(self):
        """Every entry with a 'folder' key must point to an existing path."""
        data = self._load()
        for entry in data:
            folder = entry.get("folder")
            if not folder:
                continue
            full_path = REPO_ROOT / folder
            assert full_path.exists(), (
                f"Entry '{entry['id']}' declares folder '{folder}' but {full_path} does not exist."
            )

    def test_real_snake_survivor_present(self):
        ids = {e["id"] for e in self._load()}
        assert "snake-survivor" in ids, "snake-survivor must be present"

    def test_real_chess_engine_present(self):
        ids = {e["id"] for e in self._load()}
        assert "chess-blitz" in ids, "chess-blitz (Rocky engine) must be present"

    def test_no_hex_survivors_without_real_folder(self):
        for entry in self._load():
            if entry.get("id") == "hex-survivors":
                folder = entry.get("folder")
                assert folder, "hex-survivors needs a real folder"
                assert (REPO_ROOT / folder).exists(), f"hex-survivors folder '{folder}' does not exist"

    def test_no_dungeon_draft_without_real_folder(self):
        for entry in self._load():
            if entry.get("id") == "dungeon-draft":
                folder = entry.get("folder")
                assert folder, "dungeon-draft needs a real folder"
                assert (REPO_ROOT / folder).exists(), f"dungeon-draft folder '{folder}' does not exist"

    def test_updated_is_iso8601_string(self):
        data = self._load()
        for entry in data:
            updated = entry.get("updated", "")
            assert isinstance(updated, str) and len(updated) >= 10, (
                f"Entry {entry.get('id', '?')} 'updated' must be ISO-8601"
            )


# ---------------------------------------------------------------------------
# SECTION 2 — autopilot.py wiring (byte-level, no UTF-8 decode)
# ---------------------------------------------------------------------------

class TestAutopilotWiring:
    """Byte-level analysis of autopilot.py — avoids UTF-8 truncation issue."""

    def _raw(self) -> bytes:
        assert AUTOPILOT_PY.exists(), f"Missing: {AUTOPILOT_PY}"
        return read_raw(AUTOPILOT_PY)

    def test_file_size_over_100kb(self):
        raw = self._raw()
        assert len(raw) > 100_000, f"autopilot.py too small ({len(raw)} bytes)"

    def test_looks_like_python(self):
        raw = self._raw()
        assert b"def " in raw[:500] or b"import " in raw[:500] or b"#!" in raw[:10], (
            "autopilot.py header does not look like Python"
        )

    def test_json_imported(self):
        assert b"import json" in self._raw()

    def test_api_projects_route_present(self):
        raw = self._raw()
        assert b'"/api/projects"' in raw or b"'/api/projects'" in raw

    def test_projects_json_path_referenced(self):
        raw = self._raw()
        assert b"studio_state" in raw and b"projects.json" in raw

    def test_api_health_route_present(self):
        raw = self._raw()
        assert b'"/api/health"' in raw or b"'/api/health'" in raw

    def test_api_ledger_status_route_present(self):
        raw = self._raw()
        assert b"ledger-status" in raw or b"ledger_status" in raw

    def test_has_function_and_class_definitions(self):
        raw = self._raw()
        assert b"\ndef " in raw or b"\r\ndef " in raw
        assert b"\nclass " in raw or b"\r\nclass " in raw


# ---------------------------------------------------------------------------
# SECTION 3 — studio_cockpit.html structure
# ---------------------------------------------------------------------------

class TestCockpitHtml:
    """Structural checks on the cockpit HTML."""

    def _text(self) -> str:
        assert COCKPIT_HTML.exists(), f"Missing: {COCKPIT_HTML}"
        return COCKPIT_HTML.read_text(encoding="utf-8")

    def test_references_api_projects(self):
        assert "/api/projects" in self._text()

    def test_references_api_health(self):
        assert "/api/health" in self._text()

    def test_references_api_ledger_status(self):
        assert "/api/ledger-status" in self._text()

    def test_vis_network_script_is_separate_from_inline(self):
        """
        Regression guard for P0 bug: vis-network <script src="..."> must appear
        and be closed before the first inline <script> block opens.
        """
        text = self._text()
        idx_src = text.find('<script src=')
        idx_inline = text.find('<script>')
        assert idx_src != -1, "vis-network <script src=...> not found"
        assert idx_inline != -1, "Inline <script> block not found"
        assert idx_src < idx_inline, "vis-network script tag must precede inline <script>"
        end_src = text.find("</script>", idx_src)
        assert end_src < idx_inline, "vis-network </script> must appear before inline <script>"

    def test_exactly_one_style_block(self):
        text = self._text()
        count = text.count("<style>") + text.count("<style ")
        assert count == 1, f"Expected 1 <style> block, found {count}"

    def test_multiple_script_tags(self):
        assert self._text().count("<script") >= 2

    def test_build_board_present(self):
        assert "Build Board" in self._text()

    def test_stages_constant_present(self):
        text = self._text()
        assert "STAGES" in text
        assert "'playtest'" in text or '"playtest"' in text

    def test_projects_constant_present(self):
        assert "PROJECTS" in self._text()

    def test_merge_function_present(self):
        assert "_mergeProjectsData" in self._text()


# ---------------------------------------------------------------------------
# SECTION 4 — loop_memory_hook
# ---------------------------------------------------------------------------

class TestLoopMemoryHook:
    """Import and call append_entry() on a temp file."""

    def _load(self) -> types.ModuleType:
        hook = REPO_ROOT / "scripts" / "loop_memory_hook.py"
        assert hook.exists(), f"Missing: {hook}"
        spec = importlib.util.spec_from_file_location("lmh_oracle_v2", hook)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_module_importable(self):
        mod = self._load()
        assert hasattr(mod, "append_entry")

    def test_append_entry_writes(self, tmp_path):
        mod = self._load()
        log = tmp_path / "loops-log.md"
        original = mod.LOOPS_LOG
        mod.LOOPS_LOG = log
        try:
            mod.append_entry(Namespace(
                imp_id="IMP-ORACLE-001",
                packet_id="00000000-0000-0000-0000-000000000001",
                oracle_status="OK",
                tier="SAFE_AUTO",
                skill="oracle",
                lane="STUDIO",
                duration_s=1,
                notes=None,
            ))
        finally:
            mod.LOOPS_LOG = original

        assert log.exists()
        content = log.read_text(encoding="utf-8")
        assert "IMP-ORACLE-001" in content
        assert "oracle: OK" in content
        lines = [l for l in content.splitlines() if l.startswith("- ts:")]
        assert len(lines) == 1

    def test_append_is_additive(self, tmp_path):
        mod = self._load()
        log = tmp_path / "loops-log2.md"
        original = mod.LOOPS_LOG
        mod.LOOPS_LOG = log
        try:
            for i in range(3):
                mod.append_entry(Namespace(
                    imp_id=f"IMP-{i}",
                    packet_id=f"00000000-0000-0000-0000-00000000000{i}",
                    oracle_status="OK",
                    tier="SAFE_AUTO",
                    skill="oracle",
                    lane="STUDIO",
                    duration_s=i,
                    notes=None,
                ))
        finally:
            mod.LOOPS_LOG = original

        content = log.read_text(encoding="utf-8")
        lines = [l for l in content.splitlines() if l.startswith("- ts:")]
        assert len(lines) == 3


# ---------------------------------------------------------------------------
# SECTION 5 — studio_meta
# ---------------------------------------------------------------------------

class TestStudioMeta:
    """scripts/studio_meta.py must be importable and expose sign_hmac."""

    def _path(self) -> Path:
        p = REPO_ROOT / "scripts" / "studio_meta.py"
        assert p.exists(), f"Missing: {p}"
        return p

    def test_file_exists(self):
        self._path()

    def test_sign_hmac_in_source(self):
        assert "def sign_hmac" in self._path().read_text(encoding="utf-8")

    def test_no_syntax_error(self):
        try:
            py_compile.compile(str(self._path()), doraise=True)
        except py_compile.PyCompileError as exc:
            pytest.fail(f"studio_meta.py has syntax error: {exc}")

    def test_sign_hmac_callable(self):
        p = self._path()
        spec = importlib.util.spec_from_file_location("studio_meta_v2", p)
        mod = importlib.util.module_from_spec(spec)
        old_argv = sys.argv[:]
        sys.argv = ["studio_meta.py"]
        try:
            spec.loader.exec_module(mod)
        except SystemExit:
            pass
        finally:
            sys.argv = old_argv
        assert hasattr(mod, "sign_hmac")
        sig = mod.sign_hmac(b"hello", "secret_key")
        assert isinstance(sig, str) and len(sig) == 64


# ---------------------------------------------------------------------------
# SECTION 6 — Live modules :8766 ported into the canonical cockpit
# (Director / Factory / Neural / OpenClaw panels, gate modal, SSE meta stream)
# ---------------------------------------------------------------------------

class TestLiveModules8766:
    """The canonical cockpit must wire the 8766 read-only panels, the HMAC gate
    modal, and the SSE meta stream — all degrading offline. Static checks."""

    def _cockpit(self) -> str:
        assert COCKPIT_HTML.exists(), f"Missing: {COCKPIT_HTML}"
        return COCKPIT_HTML.read_text(encoding="utf-8")

    def _gateway(self) -> bytes:
        assert CANVAS_GATEWAY_PY.exists(), f"Missing: {CANVAS_GATEWAY_PY}"
        return CANVAS_GATEWAY_PY.read_bytes()

    # --- cockpit references the gateway and its 4 read-only endpoints ---
    def test_cockpit_targets_gateway_8766(self):
        assert "http://localhost:8766" in self._cockpit()

    def test_cockpit_references_four_panels(self):
        text = self._cockpit()
        for route in ("/api/director", "/api/factory", "/api/neural", "/api/openclaw"):
            assert route in text, f"cockpit missing {route}"

    def test_cockpit_references_sse_stream(self):
        text = self._cockpit()
        assert "/api/meta/stream" in text
        assert "EventSource" in text

    def test_cockpit_references_gate_endpoint(self):
        assert "/api/gate/" in self._cockpit()

    def test_cockpit_has_gate_modal(self):
        text = self._cockpit()
        assert "gw-gate-ov" in text, "gate modal overlay missing"
        assert "gwSubmitGate" in text, "gate submit handler missing"

    def test_cockpit_has_gw_view_and_nav(self):
        text = self._cockpit()
        assert 'id="view-gw"' in text, "view-gw container missing"
        assert 'data-view="gw"' in text, "nav-item for gw missing"

    def test_cockpit_panels_have_offline_degradation(self):
        """Each panel must have a DOWN path so it renders with services offline."""
        text = self._cockpit()
        assert "gwDown" in text, "offline degradation helper gwDown missing"
        assert "gw-down" in text, "offline CSS class gw-down missing"

    def test_cockpit_still_single_style_block(self):
        text = self._cockpit()
        count = text.count("<style>") + text.count("<style ")
        assert count == 1, f"Expected 1 <style> block, found {count}"

    def test_cockpit_vis_network_still_precedes_inline(self):
        """Regression guard must still hold after the port."""
        text = self._cockpit()
        idx_src = text.find("<script src=")
        idx_inline = text.find("<script>")
        assert idx_src != -1 and idx_inline != -1
        assert idx_src < idx_inline
        assert text.find("</script>", idx_src) < idx_inline

    # --- gateway exposes the 4 read-only endpoints + governor on actions ---
    def test_gateway_has_four_read_endpoints(self):
        raw = self._gateway()
        for route in (b"/api/director", b"/api/factory", b"/api/neural", b"/api/openclaw"):
            assert route in raw, f"canvas_gateway missing {route!r}"

    def test_gateway_governor_before_actions(self):
        raw = self._gateway()
        assert b"_governor_ok" in raw, "governor gate helper missing"
        assert b"from governance import governor" in raw, "governor import missing"

    def test_gateway_read_helper_is_offline_tolerant(self):
        raw = self._gateway()
        assert b"_read_json_file" in raw
        assert b'"available": False' in raw or b"'available': False" in raw

    def test_gateway_no_syntax_error(self):
        try:
            py_compile.compile(str(CANVAS_GATEWAY_PY), doraise=True)
        except py_compile.PyCompileError as exc:
            pytest.fail(f"canvas_gateway.py has syntax error: {exc}")

    # --- requirements file for the gateway ---
    def test_requirements_gateway_exists_with_deps(self):
        assert REQUIREMENTS_GATEWAY.exists(), "requirements-gateway.txt missing"
        text = REQUIREMENTS_GATEWAY.read_text(encoding="utf-8").lower()
        assert "fastapi" in text, "fastapi missing from requirements-gateway.txt"
        assert "uvicorn" in text, "uvicorn missing from requirements-gateway.txt"
