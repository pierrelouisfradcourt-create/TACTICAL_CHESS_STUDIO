# PR-35 Next Manual Codex Loop - Prompt 007

## Scope
- source_execution_packet: `lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.json`
- source_prompt_id: `pr17_prompt_007_pr14_pos_010_pawn_break_or_hold`
- source_task_id: `pr16_task_007_pr14_pos_010_pawn_break_or_hold`
- source_position_id: `pr14_pos_010_pawn_break_or_hold`
- selected index: `6`
- mode: non-canonical targeted investigation only

## Action taken
- Ran the PR-32 `--next` dispatcher and selected the first prompt-pack id not present in committed manual-loop reports.
- Ran `scripts/run_gameplay_observation.py` with `--position-id pr14_pos_010_pawn_break_or_hold` at depths `1,2`.
- Kept generated runtime artifacts under `lab/gameplay_observation/sandbox_outputs/pr35_next_manual_loop/` as local sandbox outputs only.
- Made no runtime, search, neural, CI, dataset, `lab/runs/RUN_*`, or `latest.json` changes.

## Descriptive observations (non-canonical)
- Depth 1 selected move: `c2d3`
- Depth 2 selected move: `c2h7`
- Selected move changed across the shallow sampled depths.
- scores_by_depth: depth 1 = `-346`, depth 2 = `354`
- score_sign_by_depth: depth 1 = `NEGATIVE`, depth 2 = `POSITIVE`
- score_gap_by_depth: depth 1 = `0`, depth 2 = `0`
- score_sign_changes_across_depths: `true`
- score_gap_changes_across_depths: `false`
- unique_selected_moves: `c2d3`, `c2h7`

These observations are local descriptive telemetry only. No claim authority is created by this report.

## Commands run
- `git fetch origin --prune`
- `git switch main`
- `git pull --ff-only origin main`
- `git status --porcelain`
- `git log --oneline -8`
- `Test-Path lab\gameplay_observation\PR34_NEXT_MANUAL_CODEX_LOOP.md`
- `Select-String -Path scripts\run_manual_codex_loop_once.py -Pattern '--next'`
- `git switch -c runtime-pr35-next-manual-codex-loop`
- `.\.venv312\Scripts\python.exe scripts/run_manual_codex_loop_once.py --next --output lab/gameplay_observation/sandbox_outputs/pr35_next_manual_loop/manual_loop_once.pr35.json --pretty`
- `Get-Content lab\gameplay_observation\sandbox_outputs\pr18_codex_execution_packet\codex_execution_packet.pr18.json`
- `Get-Content lab\gameplay_observation\PR34_NEXT_MANUAL_CODEX_LOOP.md`
- `Get-Content lab\gameplay_observation\PR33_NEXT_MANUAL_CODEX_LOOP.md`
- `Get-Content lab\gameplay_observation\PR31_FOURTH_MANUAL_CODEX_LOOP.md`
- `.\.venv312\Scripts\python.exe scripts/run_gameplay_observation.py --surface lab/gameplay_observation/non_converting_positions/pr14_gameplay_surface.json --position-id pr14_pos_010_pawn_break_or_hold --depths 1,2 --execute --output-dir lab/gameplay_observation/sandbox_outputs/pr35_next_manual_loop/pr14_pos_010 --pretty`

## Command results
- `main` included merge PR `#92` (`315bd154 Merge pull request #92 from pierrelouisfradcourt-create/runtime-pr34-next-manual-codex-loop`).
- PR-34 report file was present.
- `scripts/run_manual_codex_loop_once.py` supported `--next`.
- Local tracked noise was present at `lab/reports/latest_benchmark_summary.json` and was not touched.
- The first dispatcher attempt timed out before writing the packet; the rerun completed.
- Next dispatcher returned `software_verdict: MANUAL_CODEX_LOOP_PACKET_READY`.
- Next dispatcher returned `evidence_verdict: NON_CANONICAL_ORCHESTRATION_ONLY`.
- Next dispatcher returned `claim_verdict: NO_CLAIM_ALLOWED`.
- Selected packet values matched prompt `pr17_prompt_007_pr14_pos_010_pawn_break_or_hold` and task `pr16_task_007_pr14_pos_010_pawn_break_or_hold`.
- Observation command returned `software_verdict: PASS`.
- Observation command kept `canonical_evidence: false` and `claim_verdict: NO_CLAIM_ALLOWED`.

## Skipped validation and reason
- None.

## Risks
- behavior_risk: Low. Single non-canonical observation report only.
- evidence_risk: Low. Sandbox-only observation; no canonical evidence written.
- claim_risk: Low. Claim authority remains disabled.

## Verdict
- software_verdict: NEXT_MANUAL_CODEX_LOOP_ADDED
- evidence_verdict: NON_CANONICAL_ORCHESTRATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
