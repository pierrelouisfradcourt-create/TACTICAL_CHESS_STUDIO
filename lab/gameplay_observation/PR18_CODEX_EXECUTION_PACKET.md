# PR-18 Codex Execution Packet Batch (Non-Canonical)

Status: non-canonical orchestration only  
Claim status: `NO_CLAIM_ALLOWED`

## Objective

PR-18 adds one local executor scaffold that selects exactly one PR-17 prompt and packages it for manual Codex execution review.

This batch does not produce canonical evidence, does not run benchmark interpretation, and does not authorize claims or promotion.

## Input

Default prompt pack input:

```text
lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.json
```

Optional selectors:

```text
--prompt-pack <path>
--prompt-id <id>
--index <N>
```

Selection mode is exactly one item:

- by `--prompt-id`, or
- by `--index`, or
- first prompt when neither selector is provided.

## Outputs (sandbox-only)

```text
lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.json
lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.md
```

Generated outputs must remain untracked.

## Script

```text
scripts/prepare_codex_execution_packet.py
```

## Execution packet fields

The JSON packet includes:

- `schema_version`
- `created_at`
- `source_prompt_pack`
- `selected_prompt_id`
- `selected_source_task_id`
- `selected_source_position_id`
- `prompt_title`
- `prompt_body`
- `recommended_branch`
- `validation_commands`
- `expected_changed_files_scope`
- `forbidden_files`
- `forbidden_actions`
- `manual_execution_checklist`
- `canonical_evidence: false`
- `promotion_eligible: false`
- `claim_verdict: NO_CLAIM_ALLOWED`
- `human_review_required: true`

## Manual execution checklist

- paste prompt into Codex Code Mode
- wait for draft PR
- verify diff scope
- verify checks
- human decides ready/merge/reject

## Guardrails preserved

- non-canonical investigation only
- no benchmark
- no dataset reset
- no holdout
- no `lab/runs/RUN_*`
- no `latest.json`
- no Elo / strength / promotion / scientific claim
- `claim_verdict: NO_CLAIM_ALLOWED`
- `human_review_required: true`

## Usage

```powershell
.\.venv312\Scripts\python.exe scripts/prepare_codex_execution_packet.py --pretty
```

Explicit prompt selection example:

```powershell
.\.venv312\Scripts\python.exe scripts/prepare_codex_execution_packet.py --prompt-pack lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.json --index 0 --pretty
```

## Non-canonical boundaries

- no `lab/runs/` writes
- no `latest.json`
- no benchmark interpretation
- no claim
- no promotion
- no holdout
- no dataset reset
