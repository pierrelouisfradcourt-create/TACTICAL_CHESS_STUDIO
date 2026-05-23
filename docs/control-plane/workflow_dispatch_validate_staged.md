# Manual workflow_dispatch Validate-Staged Bridge (PR #199)

## Purpose

`Agent Operator Validate Staged` adds a manual GitHub Actions entrypoint for control-plane `validate-staged` checks only.

Scope is control-plane validation only:

- manual trigger only
- `validate-staged` mode only
- no commit/push/PR creation
- no ready/merge
- no deployment
- no runtime/gameplay scope
- no ML/training
- no benchmarks

## Trigger model

Workflow file:

- `.github/workflows/agent-operator-validate-staged.yml`

Workflow name:

- `Agent Operator Validate Staged`

Trigger:

- `workflow_dispatch` only
- no `push` trigger
- no `pull_request` trigger

Inputs:

- `task_packet` (default `lab/agent_tasks/example_task_packet.json`)
- `pretty` (`true`/`false`)

## Relationship to inspect workflow

The inspect bridge (`Agent Operator Inspect`) remains an inspect-only workflow.
This workflow is the second manual bridge and is limited to `validate-staged`.

## Cross-platform invocation fix (PR #200)

PR #199 smoke validation exposed a platform-specific operator invocation path:

- root cause: `scripts/agent_pr_operator.py` launched subprocess checks via hardcoded Windows `.venv312\Scripts\python.exe`
- impact: path exists on local Windows but not on GitHub-hosted Ubuntu runners

PR #200 updates control-plane tooling to relaunch Python with the current interpreter (`sys.executable`, fallback `python`) instead of a Windows-only path.

- GitHub Actions keeps using `setup-python` and `python` from `PATH`
- local Windows behavior remains intact when scripts are started from `.venv312` (so `sys.executable` resolves to that venv interpreter)
- scope remains control-plane tooling only (no runtime, ML/training, or benchmark changes)

## Permission model

The workflow uses read-only `GITHUB_TOKEN` permissions:

```yaml
permissions:
  contents: read
  actions: read
```

No write permissions are granted (`contents: write`, `pull-requests: write`, `issues: write`, `deployments: write`, `id-token: write`, `packages: write` are not used).

## Task packet path restrictions

Before invoking Python, the workflow blocks suspicious paths. Allowed form is only:

- `lab/agent_tasks/*.json`

It rejects:

- absolute paths
- any path containing `..`
- any path containing `:`
- non-`.json` paths
- missing files

This keeps dispatch runs bounded to intended task packets.

## Commands run

Dependency install:

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements-control-plane.txt
```

Validation and operator run:

```bash
python scripts/validate_control_plane_json.py --pretty
python scripts/agent_pr_operator.py --mode validate-staged --task-packet "<task_packet>" [--pretty]
```

Only `--mode validate-staged` is used in this workflow.

## Output and artifact posture

Operator output remains non-canonical control-plane output.
This workflow does not upload artifacts.

## Out-of-scope actions

The workflow does not:

- commit
- push
- create PRs
- mark PRs ready
- merge PRs
- deploy
- run training
- run benchmarks

## Future work

Future PRs may add a gated manual dry-run/prepare workflow, but that is intentionally out of scope here.
