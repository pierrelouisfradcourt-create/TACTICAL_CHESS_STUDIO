# PR-38 Next Manual Codex Loop - Prompt 009

## Scope
- source_execution_packet: `lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.json`
- source_prompt_id: `pr17_prompt_009_pr14_pos_007_tactical_tension_simple`
- source_task_id: `pr16_task_009_pr14_pos_007_tactical_tension_simple`
- source_position_id: `pr14_pos_007_tactical_tension_simple`
- selected index: `8`
- mode: non-canonical targeted investigation only

## Action taken
- Ran the refreshed opt-in `--next` dispatcher with extra non-canonical positions enabled.
- Confirmed the selected prompt matched `pr17_prompt_009_pr14_pos_007_tactical_tension_simple`.
- Ran `scripts/run_gameplay_observation.py` with `--position-id pr14_pos_007_tactical_tension_simple` at depths `1,2`.
- Kept generated runtime artifacts under `lab/gameplay_observation/sandbox_outputs/pr38_next_manual_loop/` as local sandbox outputs only.
- Made no runtime, search, neural, CI, dataset, `lab/runs/RUN_*`, or `latest.json` changes.

## Descriptive observations (non-canonical)
- Depth 1 selected move: `c6d4`
- Depth 2 selected move: `c6d4`
- Selected move remained the same across the shallow sampled depths.
- scores_by_depth: depth 1 = `-336`, depth 2 = `-336`
- score_sign_by_depth: depth 1 = `NEGATIVE`, depth 2 = `NEGATIVE`
- score_gap_by_depth: depth 1 = `0`, depth 2 = `0`
- score_sign_changes_across_depths: `false`
- score_gap_changes_across_depths: `false`
- unique_selected_moves: `c6d4`

These observations are local descriptive telemetry only. No claim authority is created by this report.

## Commands run
- `git fetch origin --prune`
- `git switch main`
- `git pull --ff-only origin main`
- `git status --porcelain`
- `git log --oneline -8`
- `Test-Path lab\gameplay_observation\PR37_NEXT_MANUAL_CODEX_LOOP.md`
- `rg --line-number "include-extra-noncanonical-positions" scripts\run_manual_codex_loop_once.py`
- `git switch -c runtime-pr38-next-manual-codex-loop`
- `.\.venv312\Scripts\python.exe scripts\run_manual_codex_loop_once.py --next --include-extra-noncanonical-positions --output lab/gameplay_observation/sandbox_outputs/pr38_next_manual_loop/manual_loop_once.pr38.json --pretty`
- `Get-Content lab\gameplay_observation\PR37_NEXT_MANUAL_CODEX_LOOP.md`
- `Get-Content lab\gameplay_observation\PR35_NEXT_MANUAL_CODEX_LOOP.md`
- `.\.venv312\Scripts\python.exe scripts\run_gameplay_observation.py --surface lab/gameplay_observation/non_converting_positions/pr14_gameplay_surface.json --position-id pr14_pos_007_tactical_tension_simple --depths 1,2 --execute --output-dir lab/gameplay_observation/sandbox_outputs/pr38_next_manual_loop/pr14_pos_007 --pretty`
- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --pretty`
- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --run-checks --pretty`
- `.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty`
- `cargo check`
- `cargo test fen_round_trip -- --nocapture`
- `cargo test root_decision -- --nocapture`
- `git diff --name-only origin/main...HEAD`
- `git diff --stat origin/main...HEAD`
- `git status --porcelain`
- `git ls-files lab/gameplay_observation/sandbox_outputs`

## Command results
- `main` included merge PR `#95` (`ffa233a9 Merge pull request #95 from pierrelouisfradcourt-create/runtime-pr37-next-manual-codex-loop`).
- `lab/gameplay_observation/PR37_NEXT_MANUAL_CODEX_LOOP.md` was present.
- `scripts/run_manual_codex_loop_once.py` supported `--include-extra-noncanonical-positions`.
- Local tracked noise was present at `lab/reports/latest_benchmark_summary.json` and was not touched.
- The first dispatcher attempt timed out before writing the packet; the rerun completed.
- Next dispatcher returned `software_verdict: MANUAL_CODEX_LOOP_PACKET_READY`.
- Next dispatcher returned `evidence_verdict: NON_CANONICAL_ORCHESTRATION_ONLY`.
- Next dispatcher returned `claim_verdict: NO_CLAIM_ALLOWED`.
- Selected packet values matched prompt `pr17_prompt_009_pr14_pos_007_tactical_tension_simple` and task `pr16_task_009_pr14_pos_007_tactical_tension_simple`.
- Observation command returned `software_verdict: PASS`.
- Observation command kept `canonical_evidence: false` and `claim_verdict: NO_CLAIM_ALLOWED`.
- `run_local_agent_verify.py --pretty` returned `software_verdict: LOCAL_AGENT_VERIFY_READY`.
- `run_local_agent_verify.py --run-checks --pretty` returned `software_verdict: LOCAL_AGENT_VERIFY_READY`.
- `check_workspace_hygiene.py --pretty` returned `software_verdict: PASS` with local noise limited to the untracked PR-38 report before staging and the known tracked report noise.
- `cargo check` completed successfully with existing warnings.
- `cargo test fen_round_trip -- --nocapture` passed `2` tests.
- `cargo test root_decision -- --nocapture` passed `14` tests.
- Pre-commit `git diff --name-only origin/main...HEAD` and `git diff --stat origin/main...HEAD` were empty because the report was still unstaged and uncommitted.
- `git status --porcelain` showed the known modified `lab/reports/latest_benchmark_summary.json` plus untracked `lab/gameplay_observation/PR38_NEXT_MANUAL_CODEX_LOOP.md`.
- `git ls-files lab/gameplay_observation/sandbox_outputs` returned no tracked sandbox output files.

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
