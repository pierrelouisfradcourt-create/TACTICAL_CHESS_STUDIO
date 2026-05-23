# Sequential Block Runner (PR #194)

## Purpose

`scripts/agent_block_runner.py` adds a local, control-plane-only way to execute a list of PR operator tasks sequentially from a manifest.

This follows PR #192 (single-task operator flow) and PR #193 (transient output hygiene) by adding safe block execution without removing human control.
PR #195 adds strict JSON Schema validation for task packets/registry/fixtures in `scripts/validate_control_plane_json.py` (see `docs/control-plane/schema_validation.md`).

## Scope and safety

- Sequential only (no parallel execution).
- Stop-on-fail is required.
- Default mode is safe (`dry-run`).
- Ready/merge are forbidden.
- Deploy/training/benchmark-claim intent is forbidden.
- Local control-plane only (no runtime, ML/training, benchmark, or CI scope).
- No autonomous promotion decisions.

## Manifest format

Example manifest path:

- `lab/agent_tasks/block_pr194_example.json`

Required top-level fields:

- `schema_version`
- `block_id`
- `tasks`

Safe defaults:

- `default_mode`: `dry-run`
- `stop_on_fail`: `true`
- `allow_commit`: `false`
- `allow_push`: `false`
- `allow_create_pr`: `false`
- `allow_ready`: `false`
- `allow_merge`: `false`

Current allowed task modes:

- `inspect`
- `validate-staged`
- `dry-run` (mapped to operator `inspect`)

## Runner command

Use the repo-local interpreter:

```powershell
.\.venv312\Scripts\python.exe scripts/agent_block_runner.py --block-manifest lab/agent_tasks/block_pr194_example.json --pretty
```

## Gates per task

The runner enforces gates on every task:

- `workspace_clean_before`
- `task_packet_exists`
- `mode_allowed`
- `no_ready`
- `no_merge`
- `no_deploy`
- `no_training`
- `no_benchmark_claim`
- `scope_allowed`
- `validation_passed`
- `workspace_clean_after`

If any required gate fails, task status is `FAIL`.

## Stop-on-fail behavior

- Tasks are processed in manifest order.
- On first failed task, the block stops immediately.
- Exit code is non-zero when any task fails or when manifest validation is blocked.

## Block report

Report path (transient, ignored):

- `lab/agent_runs/operator_latest/block_report.json`

Report includes:

- block metadata (`block_id`, times, status)
- safety flags (`stop_on_fail`, `allow_ready`, `allow_merge`)
- task counters (`tasks_total`, `tasks_passed`, `tasks_failed`)
- `stopped_at_task_id`
- per-task gate results
- fixed verdicts:
  - `software_verdict: CONTROL_PLANE_TOOLING_ONLY`
  - `evidence_verdict: LOCAL_BLOCK_RUNNER_DRY_RUN_VALIDATION_ONLY`
  - `claim_verdict: NO_CLAIM_ALLOWED`

## Intentionally not implemented

- No auto-ready.
- No auto-merge.
- No deploy.
- No training.
- No PR chain auto-merge.
