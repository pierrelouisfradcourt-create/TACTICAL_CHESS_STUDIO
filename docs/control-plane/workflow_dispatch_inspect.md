# Manual workflow_dispatch Inspect Bridge (PR #198)

## Purpose

`Agent Operator Inspect` adds the first manual GitHub Actions entrypoint for the local agent PR operator in inspect-only mode.

Scope is control-plane validation only:

- manual trigger only
- inspect mode only
- no commit/push/PR creation
- no ready/merge
- no runtime/gameplay changes
- no ML/training
- no benchmark/deployment actions

## Trigger model

Workflow file:

- `.github/workflows/agent-operator-inspect.yml`

Workflow name:

- `Agent Operator Inspect`

Trigger:

- `workflow_dispatch` only
- no `push` trigger
- no `pull_request` trigger

Inputs:

- `task_packet` (default `lab/agent_tasks/example_task_packet.json`)
- `pretty` (`true`/`false`)

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

This keeps inspect runs bounded to the intended task packet surface.

## Commands run

Dependency install:

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements-control-plane.txt
```

Validation and inspect:

```bash
python scripts/validate_control_plane_json.py --pretty
python scripts/agent_pr_operator.py --mode inspect --task-packet "<task_packet>" [--pretty]
```

Only `--mode inspect` is used in this workflow.

## Outputs and artifact posture

Operator outputs under `lab/agent_runs/operator_latest/` are non-canonical control-plane artifacts and must not be used as gameplay/runtime evidence.

This PR does not upload artifacts from Actions. If artifact upload is added in a future PR, uploaded files must remain non-canonical.

## Relationship to block runner

`scripts/agent_block_runner.py` is local sequential orchestration over task manifests.
`Agent Operator Inspect` is a manual GitHub-hosted inspect bridge for a single task packet.

`Agent Operator Validate Staged` is now documented separately in `docs/control-plane/workflow_dispatch_validate_staged.md`.
Inspect remains intentionally scoped to inspect-only mode.
