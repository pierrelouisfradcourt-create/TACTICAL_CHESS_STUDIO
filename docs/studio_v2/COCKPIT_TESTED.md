# COCKPIT_TESTED.md — Static Oracle Results & Live Runbook

> **MAJ 2026-06-28 — l'oracle a été déplacé hors de la zone FORBIDDEN `tests/`.**
> Nouveau chemin : `studio_v2_ux/oracle/test_cockpit_oracle_v2.py` (désormais **50 tests**,
> +14 pour les panels live :8766 / modal gate HMAC / SSE meta stream).
> Commande à jour : `python -m pytest studio_v2_ux/oracle -q`.
> Le transcript 36/36 ci-dessous est l'enregistrement historique du run du 2026-06-28 (conservé tel quel).

## Summary

This document records the result of the static test pass (run by the subagent in the
Cowork Linux sandbox on 2026-06-28) and gives the two commands Claude Code must run on
the native Windows machine.

---

## Static tests (run in Cowork sandbox — 36/36 PASS)

**Test file:** `tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py`

Run command (from repo root):
```
.venv312\Scripts\python.exe -m pytest tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py -v
```

### Full passing output (sandbox run)

```
============================= test session starts ==============================
platform linux -- Python 3.10.12, pytest-9.1.1, pluggy-1.6.0
rootdir: /sessions/…/TACTICAL_CHESS_STUDIO
collected 36 items

tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_valid_json_and_is_list PASSED [  2%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_every_entry_has_required_fields PASSED [  5%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_all_ids_are_unique PASSED [  8%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_all_stages_are_allowed PASSED [ 11%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_metrics_field_is_dict PASSED [ 13%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_no_invented_games_without_folder PASSED [ 16%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_real_snake_survivor_present PASSED [ 19%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_real_chess_engine_present PASSED [ 22%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_no_hex_survivors_without_real_folder PASSED [ 25%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_no_dungeon_draft_without_real_folder PASSED [ 27%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestProjectsJson::test_updated_is_iso8601_string PASSED [ 30%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestAutopilotWiring::test_file_size_over_100kb PASSED [ 33%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestAutopilotWiring::test_looks_like_python PASSED [ 36%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestAutopilotWiring::test_json_imported PASSED [ 38%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestAutopilotWiring::test_api_projects_route_present PASSED [ 41%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestAutopilotWiring::test_projects_json_path_referenced PASSED [ 44%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestAutopilotWiring::test_api_health_route_present PASSED [ 47%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestAutopilotWiring::test_api_ledger_status_route_present PASSED [ 50%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestAutopilotWiring::test_has_function_and_class_definitions PASSED [ 52%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestCockpitHtml::test_references_api_projects PASSED [ 55%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestCockpitHtml::test_references_api_health PASSED [ 58%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestCockpitHtml::test_references_api_ledger_status PASSED [ 61%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestCockpitHtml::test_vis_network_script_is_separate_from_inline PASSED [ 63%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestCockpitHtml::test_exactly_one_style_block PASSED [ 66%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestCockpitHtml::test_multiple_script_tags PASSED [ 69%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestCockpitHtml::test_build_board_present PASSED [ 72%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestCockpitHtml::test_stages_constant_present PASSED [ 75%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestCockpitHtml::test_projects_constant_present PASSED [ 77%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestCockpitHtml::test_merge_function_present PASSED [ 80%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestLoopMemoryHook::test_module_importable PASSED [ 83%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestLoopMemoryHook::test_append_entry_writes PASSED [ 86%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestLoopMemoryHook::test_append_is_additive PASSED [ 88%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestStudioMeta::test_file_exists PASSED [ 91%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestStudioMeta::test_sign_hmac_in_source PASSED [ 94%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestStudioMeta::test_no_syntax_error PASSED [ 97%]
tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py::TestStudioMeta::test_sign_hmac_callable PASSED [100%]

============================== 36 passed in 0.16s ==============================
```

---

## What is tested (static)

| Section | Tests | What they guard |
|---|---|---|
| `TestProjectsJson` (11) | projects.json valid JSON, all required fields present, unique IDs, valid stages, metrics dicts, folder entries exist on disk, no invented games (hex-survivors, dungeon-draft) without real folders, snake-survivor and chess-blitz present | Data honesty + schema |
| `TestAutopilotWiring` (8) | File > 100KB, Python-like header, `import json` present, `/api/projects` route, `studio_state/projects.json` referenced, `/api/health` route, `/api/ledger-status` route, class/function defs present | autopilot.py wiring |
| `TestCockpitHtml` (10) | `/api/projects`, `/api/health`, `/api/ledger-status` referenced; vis-network `<script src>` is a separate tag before inline `<script>` (P0 regression guard); exactly 1 `<style>` block; Build Board present; STAGES, PROJECTS, `_mergeProjectsData` defined | HTML structure & regressions |
| `TestLoopMemoryHook` (3) | Module importable, `append_entry()` writes a `- ts:` line to a temp file, second call appends (not overwrites) | In-process F1 path |
| `TestStudioMeta` (4) | File exists, `sign_hmac` in source, no syntax error, `sign_hmac(b"hello","key")` returns 64-char hex | Module integrity |

---

## Note on autopilot.py py_compile

The Cowork Linux sandbox reads `autopilot.py` via a CIFS mount. The last byte of
the file is a truncated multi-byte UTF-8 sequence (box-drawing char in an f-string
at line 7857). On the native Windows filesystem the file is complete. The sandbox
wiring tests use byte-level search and skip py_compile to avoid this false-fail.
`verify_live.ps1` runs `py_compile` on the real file.

---

## What the user must run via Claude Code

### 1. Re-run static oracle (native Windows, with .venv312)

```powershell
cd C:\TACTICAL_CHESS_STUDIO
.venv312\Scripts\python.exe -m pytest tests/studioV2/cockpit_oracle/test_cockpit_oracle_v2.py -v
```

Expected: **36 passed**.

### 2. Live endpoint verification (requires autopilot + agents running)

Start the studio first:
```powershell
cd C:\TACTICAL_CHESS_STUDIO
python autopilot.py
```

Then in a second terminal:
```powershell
cd C:\TACTICAL_CHESS_STUDIO
.\tools\verify_live.ps1
```

Expected checks:
- `PASS  /api/health          http://localhost:7331/api/health`
- `PASS  /api/projects        http://localhost:7331/api/projects` — 3 entries: snake-survivor, snake-genesis, chess-blitz
- `PASS  /api/ledger-status   http://localhost:7331/api/ledger-status`
- `PASS  openclaw :8765/health`
- `PASS  brain    :8766/health`
- `PASS  py_compile: C:\TACTICAL_CHESS_STUDIO\autopilot.py`

Agents on :8765/:8766 may be FAIL if not started — that is expected and acceptable.
The P0 checks are the first three (studio server).

---

## projects.json summary (as of 2026-06-28)

| id | title | stage | folder | platform |
|---|---|---|---|---|
| `snake-survivor` | Snake: Survivor — Genesis | `playtest` | `games/snake_survivor` | Godot 4 |
| `snake-genesis` | Snake: Genesis (HTML proto) | `scaffold` | `games/snake_genesis` | Browser / HTML5 |
| `chess-blitz` | Chess Blitz: Tactics (Rocky engine) | `patch` | `src/chess` | Rust / WASM |

Removed invented entries with no real folders: hex-survivors, gravity-maze, forest-idle, dungeon-draft.

---

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
