# PR-17 Codex Prompt Pack Batch (Non-Canonical)

Status: non-canonical orchestration only  
Claim status: `NO_CLAIM_ALLOWED`

## Objective

PR-17 turns the PR-16 Codex task queue into a ready-to-run Codex Code Mode prompt pack for reviewable, focused, one-PR-at-a-time execution.

This batch does not run benchmark workloads, does not produce canonical evidence, and does not authorize claims or promotion decisions.

## Input

Default queue input:

```text
lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.json
```

Override input:

```text
--queue <path>
```

## Outputs (sandbox-only)

```text
lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.json
lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.md
```

Generated outputs must remain untracked.

## Script

```text
scripts/generate_codex_prompt_pack.py
```

## Prompt item contract

Each generated prompt item includes:

- `prompt_id`
- `source_task_id`
- `source_position_id`
- `task_kind: CODEX_CODE_MODE_PROMPT`
- `recommended_branch`
- `prompt_title`
- `prompt_body`
- `expected_changed_files_scope`
- `forbidden_files`
- `forbidden_actions`
- `validation_commands`
- `expected_verdict`
- `human_review_required: true`
- `canonical_evidence: false`
- `promotion_allowed: false`
- `claim_verdict: NO_CLAIM_ALLOWED`

## Prompt body guardrails

Every prompt body enforces:

- exactly one focused PR;
- stop and report `BLOCKED` if work expands into broad engine/search/neural refactor scope;
- no claims;
- sandbox output stays untracked;
- final report template fields:
  - `Objective:`
  - `Modified files:`
  - `Commands run:`
  - `Command results:`
  - `Skipped validation and reason:`
  - `Behavior risk:`
  - `Evidence risk:`
  - `Claim risk:`
  - `Verdict:`

## Top-level prompt pack metadata

The JSON pack includes:

- `schema_version`
- `created_at`
- `source_queue`
- `canonical_evidence: false`
- `promotion_eligible: false`
- `claim_verdict: NO_CLAIM_ALLOWED`
- `total_prompts`
- `recommended_execution_mode: CODEX_CODE_MODE_REVIEWABLE_PR`
- `human_review_required: true`

## Non-canonical boundaries

- no `lab/runs/` writes
- no `latest.json`
- no benchmark interpretation
- no claim
- no promotion
- no holdout access
- no dataset reset
