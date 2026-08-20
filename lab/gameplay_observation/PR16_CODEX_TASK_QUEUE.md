# PR-16 Codex Task Queue Batch (Non-Canonical)

Status: non-canonical orchestration only  
Claim status: `NO_CLAIM_ALLOWED`

## Goal

Convert PR-15 triage output into one coherent Codex task queue batch with:

- machine-readable queue JSON;
- human-readable Markdown handoff;
- explicit non-canonical boundaries and no-claim policy.

## Input

Default triage report:

```text
lab/gameplay_observation/sandbox_outputs/pr15_triage/triage_report.pr15.json
```

CLI override:

```text
--triage-report <path>
```

## Outputs

Queue JSON:

```text
lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.json
```

Handoff Markdown:

```text
lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.md
```

Both outputs are enforced under:

```text
lab/gameplay_observation/sandbox_outputs/
```

## Label selection rules

Included as tasks:

- `NEEDS_TARGETED_INVESTIGATION`
- `DEPTH_SENSITIVE_OBSERVATION`

Skipped and documented:

- `STABLE_OBSERVATION`
- `DISCARD_LOW_SIGNAL`
- `INVALID_OBSERVATION`

## Task contract

Each emitted task includes:

- `task_id`
- `task_kind: NON_CANONICAL_CODEX_INVESTIGATION`
- `source_position_id`
- `fen`
- `triage_label`
- `selected_by_depth`
- `scores_by_depth`
- `candidate_summary`
- `objective`
- `allowed_files_hint`
- `forbidden_files`
- `forbidden_actions`
- `validation_commands`
- `claim_verdict: NO_CLAIM_ALLOWED`
- `promotion_allowed: false`
- `canonical_evidence: false`

## Queue metadata contract

Top-level queue metadata includes:

- `schema_version`
- `created_at`
- `source_triage_report`
- `canonical_evidence: false`
- `promotion_eligible: false`
- `claim_verdict: NO_CLAIM_ALLOWED`
- `total_tasks`
- `skipped_count`
- `recommended_execution_mode`
- `human_review_required: true`

The queue also includes explicit review notes:

- Codex may implement a future investigation PR.
- Codex may not make claims.
- Codex may not touch holdout.
- Codex may not create canonical RUN evidence.
- Human must review and merge or reject.

## Usage

```powershell
.\.venv312\Scripts\python.exe scripts/generate_codex_task_queue.py --pretty
```

Or with explicit triage report:

```powershell
.\.venv312\Scripts\python.exe scripts/generate_codex_task_queue.py --triage-report lab/gameplay_observation/sandbox_outputs/pr15_triage/triage_report.pr15.json --pretty
```

## Boundaries

- no `lab/runs/` outputs;
- no `latest.json`;
- no holdout access;
- no benchmark interpretation;
- no claim or promotion authority;
- no canonical evidence creation.
