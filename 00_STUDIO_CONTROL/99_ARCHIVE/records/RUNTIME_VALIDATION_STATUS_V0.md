# RUNTIME VALIDATION STATUS V0

Date: 05/23/2026 15:25:27

Project:
C:\TACTICAL_CHESS_STUDIO

Git baseline:
- Root fusion commit: 4fe0cdd
- Root fusion tag: studioV2-root-fusion-verified-2026-05-23
- Worktree was clean after fusion commit.

Rust:
- cargo: TESTED
- rustc: TESTED
- rustup: TESTED
- cargo sanity check outside project: TESTED
- cargo test with default target under C:\TACTICAL_CHESS_STUDIO\target: BLOCKED
- cause: Windows Security / file creation interruption under project target directory
- cargo test with CARGO_TARGET_DIR=%TEMP%\tactical_chess_target: TESTED
- observed result: test result ok, including 19 passed, 212 passed, 9 passed, 19 passed groups

Python:
- Python system: IMPLEMENTED
- py launcher: IMPLEMENTED
- local .venv: IMPLEMENTED
- dependencies from requirements.txt: IMPLEMENTED
- dependencies from requirements-control-plane.txt: IMPLEMENTED
- pytest: IMPLEMENTED
- pytest local result: TESTED
- observed result: 101 passed, 8436 subtests passed in 1.95s

Script routing:
- studioV2 scripts are routed under scripts\studioV2
- compatibility shims copied into scripts and scripts\control_plane for tests:
  - scripts\check_workspace_hygiene.py
  - scripts\control_plane\smoke_passive_control_plane_gates.py
  - scripts\control_plane\validate_prompt_report_hygiene.py
  - scripts\control_plane\smoke_control_plane_integration.py
  - scripts\control_plane\smoke_prompt_report_hygiene.py

Status by surface:
- Root studioV2 fusion: TESTED
- Rust runtime validation: TESTED with CARGO_TARGET_DIR override
- Python runtime validation: TESTED
- Default Rust target inside studio root: BLOCKED
- .venv: PASSIVE, ignored by Git
- target: PASSIVE, ignored by Git

No global ready verdict:
true
