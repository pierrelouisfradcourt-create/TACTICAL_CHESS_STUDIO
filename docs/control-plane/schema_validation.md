# Strict Schema Validation (PR #195)

## Purpose

`scripts/validate_control_plane_json.py` enforces strict JSON Schema validation for local control-plane JSON.
`requirements-control-plane.txt` tracks its tooling dependency (`jsonschema`) so validation is reproducible outside a local-only `.venv312` state.

This is stronger than plain `json.load` parsing:

- JSON parsing only proves syntax.
- JSON Schema validation proves required fields, enums, array contracts, and object shape.

## Validated surfaces

- `lab/agent_tasks/*.json`
  - task packets: `schemas/task_packet.schema.json`
  - block manifests (`block_*.json`): `schemas/block_manifest.schema.json`
- `lab/agent_registry/*.agent.json`
  - agent profiles: `schemas/agent_profile.schema.json`
- fixtures under `lab/agent_tasks/fixtures/`
  - `valid/*.json` must pass
  - `invalid/*.json` must fail

The validator also checks schema integrity with `Draft202012Validator.check_schema`.

## Tooling dependency install

Install control-plane tooling dependencies with:

```powershell
.\.venv312\Scripts\python.exe -m pip install -r requirements-control-plane.txt
```

Generic alternative:

```powershell
python -m pip install -r requirements-control-plane.txt
```

Scope notes:

- This requirements file is control-plane/tooling only.
- It is not a runtime dependency setup (`requirements.txt`).
- It is not an ML/training dependency setup (`ml/requirements.txt`).
- `.venv312` is local environment state and must not be committed.

## Commands

Use the repo-local interpreter:

```powershell
.\.venv312\Scripts\python.exe scripts/validate_control_plane_json.py --pretty
```

Validate only specific staged/task paths (used by `agent_pr_operator --mode validate-staged`):

```powershell
.\.venv312\Scripts\python.exe scripts/validate_control_plane_json.py --paths lab/agent_tasks/example_task_packet.json --skip-fixtures --pretty
```

## Fixture intent

Invalid fixtures prove strict failures for:

- free-form verdict strings
- empty safety-critical arrays (for example `allowed_files`)
- missing required fields (for example `required_checks`)
- malformed agent registry profiles

## Scope statement

- Control-plane/tooling only.
- No runtime, ML/training, benchmark, or CI claim.
- No deployment or promotion claim.

Related:

- `docs/control-plane/prepare_draft_pr_authorization.md` documents explicit authorization gates for `prepare-draft-pr`.

## Future work

- Add semantic policy checks beyond JSON Schema (for example cross-file consistency and policy coupling constraints).
