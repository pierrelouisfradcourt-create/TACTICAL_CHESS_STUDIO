# PR-36 Task Source Refresh

Status: non-canonical orchestration only
Claim status: `NO_CLAIM_ALLOWED`

## Objective

Prepare the next non-canonical Codex work queue after the current prompt pack is exhausted.

## Current exhausted prompt ids

- `pr17_prompt_001_pr14_pos_001_quiet_development`
- `pr17_prompt_002_pr14_pos_002_center_tension`
- `pr17_prompt_003_pr14_pos_003_minor_piece_activity`
- `pr17_prompt_004_pr14_pos_005_pawn_or_piece_choice`
- `pr17_prompt_005_pr14_pos_006_checking_resource_available`
- `pr17_prompt_006_pr14_pos_008_open_file_activity`
- `pr17_prompt_007_pr14_pos_010_pawn_break_or_hold`

## Why `--next` blocks

`scripts/run_manual_codex_loop_once.py --next` regenerates the PR-16 task queue and PR-17 prompt pack, reads candidate prompt ids from the prompt pack, then scans committed manual-loop reports under `lab/gameplay_observation/`.

The current default prompt pack contains 7 candidate prompt ids. All 7 appear in committed manual-loop reports, including PR-35 for `pr17_prompt_007_pr14_pos_010_pawn_break_or_hold`, so selection stops with:

`software_verdict: BLOCKED_NO_UNEXECUTED_PROMPTS`

## Source inspected

- `lab/gameplay_observation/sandbox_outputs/pr15_triage/triage_report.pr15.json`
- `lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.json`
- `lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.json`
- `lab/gameplay_observation/non_converting_positions/pr14_gameplay_surface.json`
- committed manual-loop reports under `lab/gameplay_observation/`

The PR-15 triage source has 10 non-canonical positions:

- `NEEDS_TARGETED_INVESTIGATION`: 7
- `STABLE_OBSERVATION`: 3

The generator was not capped by a numeric limit. It only emitted the 7 default eligible investigation tasks. No `DEPTH_SENSITIVE_OBSERVATION` rows are present in the current PR-15 source.

## Refresh implemented

Added an explicit opt-in queue refresh path:

```powershell
.\.venv312\Scripts\python.exe scripts\run_manual_codex_loop_once.py --next --include-extra-noncanonical-positions --pretty
```

The flag appends lower-priority, already-triaged non-canonical `STABLE_OBSERVATION` positions after the default queue. This preserves the original 7 prompt ids and avoids reclassifying or inventing tasks.

## New non-canonical tasks available

Yes. With `--include-extra-noncanonical-positions`, the prompt pack contains 10 prompts. The 3 newly available appended prompts are:

- `pr17_prompt_008_pr14_pos_004_king_safety_tension`
- `pr17_prompt_009_pr14_pos_007_tactical_tension_simple`
- `pr17_prompt_010_pr14_pos_009_check_response_shape`

The first next selectable prompt is:

`pr17_prompt_008_pr14_pos_004_king_safety_tension`

## Exact next command

```powershell
.\.venv312\Scripts\python.exe scripts\run_manual_codex_loop_once.py --next --include-extra-noncanonical-positions --pretty
```

Expected preparation result:

- `software_verdict: MANUAL_CODEX_LOOP_PACKET_READY`
- `source_prompt_id: pr17_prompt_008_pr14_pos_004_king_safety_tension`
- `claim_verdict: NO_CLAIM_ALLOWED`

## Commands run for investigation

- `git fetch origin --prune`
- `git switch main`
- `git pull --ff-only origin main`
- `git status --porcelain`
- `git log --oneline -8`
- `git switch -c automation-pr36-refresh-noncanonical-task-source`
- `git ls-files lab/gameplay_observation/sandbox_outputs`
- `.\.venv312\Scripts\python.exe scripts\run_manual_codex_loop_once.py --next --pretty`
- `.\.venv312\Scripts\python.exe scripts\run_manual_codex_loop_once.py --next --include-extra-noncanonical-positions --pretty`

## Command results

- PR-35 is present on main via merge `770d2ab2 Merge pull request #93 from pierrelouisfradcourt-create/runtime-pr35-next-manual-codex-loop`.
- `scripts/run_manual_codex_loop_once.py --next` exists.
- Default `--next` blocks with `BLOCKED_NO_UNEXECUTED_PROMPTS`.
- Opt-in `--next --include-extra-noncanonical-positions` prepares `pr17_prompt_008_pr14_pos_004_king_safety_tension`.
- `lab/reports/latest_benchmark_summary.json` is present as local tracked noise and was not reverted, deleted, staged, or committed.
- Sandbox outputs remain untracked.

## Validation commands

- `.\.venv312\Scripts\python.exe -m py_compile scripts/generate_codex_task_queue.py`
- `.\.venv312\Scripts\python.exe -m py_compile scripts/generate_codex_prompt_pack.py`
- `.\.venv312\Scripts\python.exe -m py_compile scripts/prepare_codex_execution_packet.py`
- `.\.venv312\Scripts\python.exe -m py_compile scripts/run_manual_codex_loop_once.py`
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --run-checks --pretty`
- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`
- `cargo check`
- `cargo test fen_round_trip -- --nocapture`
- `cargo test root_decision -- --nocapture`

## Validation results

- Python compile checks passed.
- `run_local_agent_verify.py --pretty` returned `LOCAL_AGENT_VERIFY_READY`.
- `run_local_agent_verify.py --run-checks --pretty` returned `LOCAL_AGENT_VERIFY_READY`.
- `check_workspace_hygiene.py --pretty` returned `software_verdict: PASS` with local noise expected while this report was untracked.
- `cargo check` passed with pre-existing warnings.
- `cargo test fen_round_trip -- --nocapture` passed: 2 passed, 0 failed.
- `cargo test root_decision -- --nocapture` passed: 14 passed, 0 failed.

## Skipped validation

- No gameplay loop was executed.
- No benchmark was run or interpreted.
- No holdout path was used.
- No canonical evidence was created.

## Risks

- behavior_risk: Low. The change only adds an explicit opt-in orchestration path and report.
- evidence_risk: Low. Sources and generated outputs remain non-canonical sandbox orchestration surfaces.
- claim_risk: Low. `claim_verdict` remains `NO_CLAIM_ALLOWED`.
- queue_risk: Low to medium. The appended `STABLE_OBSERVATION` tasks are lower priority than the default investigation set, so future consumers must keep the opt-in flag visible in handoff and review.

## Verdict

- software_verdict: TASK_SOURCE_REFRESHED
- evidence_verdict: NON_CANONICAL_ORCHESTRATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
