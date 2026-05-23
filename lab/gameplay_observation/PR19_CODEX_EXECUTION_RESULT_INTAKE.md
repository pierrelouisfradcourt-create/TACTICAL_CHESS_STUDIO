# PR-19 Codex Execution Result Intake Batch (Non-Canonical)

Status: non-canonical orchestration only  
Claim status: `NO_CLAIM_ALLOWED`

## Objective

PR-19 adds one sandbox-only intake validator for Codex execution result summaries generated from a manually run PR-18 execution packet.

This batch does not create canonical evidence, does not modify GitHub PRs, and does not merge or promote anything.

## Script

```text
scripts/check_codex_execution_result.py
```

## Input

Default result packet:

```text
lab/gameplay_observation/codex_execution_result/examples/valid_result.pr19.json
```

Supported flags:

```text
--result <path>
--example-mode
--pretty
```

## Required result packet fields

- `schema_version`
- `source_execution_packet`
- `source_prompt_id`
- `codex_pr_url`
- `codex_branch`
- `codex_commit`
- `changed_files`
- `commands_run`
- `command_results`
- `skipped_validation_and_reason`
- `behavior_risk`
- `evidence_risk`
- `claim_risk`
- `software_verdict`
- `evidence_verdict`
- `claim_verdict`
- `human_review_required`

## Intake behavior

PASS only if all of the following are true:

- `claim_verdict == NO_CLAIM_ALLOWED`
- `human_review_required == true`
- no forbidden files are changed
- no `lab/runs/RUN_*` path appears
- no `latest.json` path appears
- no holdout path appears
- no benchmark / promotion / Elo / strength / scientific claim language appears

BLOCKED if any of the following are true:

- changed files include protected areas (for example `src/tool/cli.rs`, `engine/search/neural`, workflows, `scripts/parse_run_bundle.py`, policy files, `lab/runs`, holdout, `latest.json`, dataset reset paths) unless explicitly allowed by the source prompt scope
- `claim_verdict` is not `NO_CLAIM_ALLOWED`
- `human_review_required` is false

INVALID if required fields are missing or malformed.

## Output

The validator prints machine-readable JSON containing:

- `software_verdict`
- `evidence_verdict`
- `claim_verdict`
- `intake_verdict`
- `blocked_reasons`
- `warnings`

No canonical evidence is written.

## Examples

```text
lab/gameplay_observation/codex_execution_result/examples/valid_result.pr19.json
lab/gameplay_observation/codex_execution_result/examples/blocked_result.pr19.json
```

## Usage

```powershell
..\venv312\Scripts\python.exe scripts/check_codex_execution_result.py --result lab/gameplay_observation/codex_execution_result/examples/valid_result.pr19.json --pretty
..\venv312\Scripts\python.exe scripts/check_codex_execution_result.py --result lab/gameplay_observation/codex_execution_result/examples/blocked_result.pr19.json --pretty
```

## Non-canonical boundaries

- no `lab/runs/`
- no `latest.json`
- no benchmark interpretation
- no claim
- no promotion
- no holdout
- no dataset reset
