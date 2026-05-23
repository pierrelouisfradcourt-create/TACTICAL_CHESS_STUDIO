# Prepare-Draft-PR Authorization Gates (PR #197)

## Why this gate exists

`prepare-draft-pr` is a write-capable control-plane mode that can perform:

- `git commit`
- `git push`
- `gh pr create --draft`

Unlike `inspect` and `validate-staged`, those actions can mutate local and remote state. This mode must stay deny-by-default and require explicit human authorization.

## Required TaskPacket authorization fields

Task packets now include an explicit `authorization` object:

```json
"authorization": {
  "human_authorized": true,
  "allow_commit": true,
  "allow_push": true,
  "allow_create_pr": true,
  "allow_ready": false,
  "allow_merge": false
}
```

Required booleans:

- `human_authorized`
- `allow_commit`
- `allow_push`
- `allow_create_pr`
- `allow_ready` (must remain `false`)
- `allow_merge` (must remain `false`)

## Prepare mode blockers

When `--mode prepare-draft-pr` is used, the operator blocks before any commit/push/PR action if one or more of the following blockers is present:

- `missing_authorization`
- `commit_not_authorized`
- `push_not_authorized`
- `create_pr_not_authorized`
- `human_review_required`

No authorization is inferred from mode alone.

## Not in scope

- No ready automation.
- No merge automation.
- No runtime, ML/training, benchmark, or CI behavior changes.

## Examples

Blocked:

- missing `authorization`
- `authorization.allow_push = false`
- `authorization.human_authorized = false`

Authorized:

- all required authorization booleans present
- `human_authorized = true`
- `allow_commit = true`
- `allow_push = true`
- `allow_create_pr = true`
- `allow_ready = false`
- `allow_merge = false`

## Relationship to existing controls

- `scripts/validate_control_plane_json.py` enforces strict schema shape for task packets and fixtures.
- `scripts/agent_block_runner.py` remains sequential and safe-mode oriented (`inspect` / `validate-staged` / `dry-run`) and does not introduce ready/merge authority.
