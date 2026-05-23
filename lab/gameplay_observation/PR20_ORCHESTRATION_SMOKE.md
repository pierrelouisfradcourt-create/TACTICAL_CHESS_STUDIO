# PR-20 Codex Orchestration Smoke Runner Batch (Non-Canonical)

Status: non-canonical orchestration only  
Claim status: `NO_CLAIM_ALLOWED`

## Objective

PR-20 adds one local end-to-end smoke runner that executes the non-canonical orchestration chain from PR-14 through PR-19 and records results in sandbox-only reports.

This batch does not call Codex live, does not call GitHub live, does not create canonical evidence, and does not authorize claims or promotion.

## Script

```text
scripts/run_codex_orchestration_smoke.py
```

## Chain executed

The smoke runner executes this sequence in order:

1. `scripts/run_gameplay_observation.py` with PR-14 surface and `--depths 1,2`
2. `scripts/triage_gameplay_observation.py`
3. `scripts/generate_codex_task_queue.py`
4. `scripts/generate_codex_prompt_pack.py`
5. `scripts/prepare_codex_execution_packet.py`
6. `scripts/check_codex_execution_result.py` on:
   - `valid_result.pr19.json` (must PASS)
   - `blocked_result.pr19.json` (must be recorded as `EXPECTED_BLOCKED`)

Any unexpected non-zero command fails the smoke report.

## Outputs (sandbox-only)

```text
lab/gameplay_observation/sandbox_outputs/pr20_orchestration_smoke/orchestration_smoke.pr20.json
lab/gameplay_observation/sandbox_outputs/pr20_orchestration_smoke/orchestration_smoke.pr20.md
```

Generated outputs must remain untracked.

## Smoke report fields

The JSON report includes:

- `schema_version`
- `created_at`
- `steps_run`
- `command_list`
- `exit_codes`
- `stdout_stderr_excerpts`
- `generated_artifacts`
- `blocked_expected_results`
- `final_status`
- `software_verdict`
- `evidence_verdict`
- `claim_verdict`
- `canonical_evidence: false`
- `promotion_eligible: false`
- `human_review_required: true`

## Usage

```powershell
..\venv312\Scripts\python.exe -m py_compile scripts/run_codex_orchestration_smoke.py
..\venv312\Scripts\python.exe scripts/run_codex_orchestration_smoke.py --pretty
```

## Non-canonical boundaries

- no `lab/runs/`
- no `latest.json`
- no benchmark interpretation
- no claim
- no promotion
- no holdout
- no dataset reset
