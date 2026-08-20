# PR-24 Second Manual Non-Canonical Codex Loop

Claim status: `NO_CLAIM_ALLOWED`

## Scope

- Source execution packet: `lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.json`
- Selected prompt id: `pr17_prompt_002_pr14_pos_002_center_tension`
- Selected source task id: `pr16_task_002_pr14_pos_002_center_tension`
- Selected source position id: `pr14_pos_002_center_tension`
- Branch: `runtime-pr24-second-manual-codex-loop`

## Focused implementation

One focused script update was applied in `scripts/run_gameplay_observation.py` to extend non-canonical depth summaries with:

- `score_sign_by_depth`
- `score_gaps_by_depth`
- `score_sign_changes_across_depths`
- `score_gap_changes_across_depths`

This preserves the existing sandbox-only workflow while making depth-shift diagnostics explicit for manual non-canonical investigation review.

## Local non-canonical run

Command used:

```powershell
.\.venv312\Scripts\python.exe scripts/run_gameplay_observation.py --surface lab/gameplay_observation/non_converting_positions/pr14_gameplay_surface.json --position-id pr14_pos_002_center_tension --depths 1,2 --execute --output-dir lab/gameplay_observation/sandbox_outputs/pr24_second_manual_loop/pr14_pos_002 --pretty
```

Observed descriptive diagnostics for `pr14_pos_002_center_tension`:

- `selected_by_depth`: depth 1 -> `h2h3`, depth 2 -> `d4e5`
- `scores_by_depth`: depth 1 -> `-42`, depth 2 -> `34`
- `score_sign_changes_across_depths`: `true`
- `score_gap_changes_across_depths`: `true`

All generated run outputs remain local sandbox artifacts under `lab/gameplay_observation/sandbox_outputs/pr24_second_manual_loop/` and are not committed.
