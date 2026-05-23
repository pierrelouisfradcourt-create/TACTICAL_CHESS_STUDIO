# PR-21 Automation Status Report (Non-Canonical)

Status: non-canonical scaffold status only  
Claim status: `NO_CLAIM_ALLOWED`

## Purpose

PR-21 adds a human-readable and machine-readable installation status report for the
non-canonical Codex automation scaffold built across PR-14 to PR-20.

The report answers:

`Is the non-canonical Codex automation scaffold installed enough to use?`

It does not run Codex live, does not call GitHub live, does not create canonical
evidence, and does not authorize any claim or promotion.

## Inputs

- Default smoke report:
  `lab/gameplay_observation/sandbox_outputs/pr20_orchestration_smoke/orchestration_smoke.pr20.json`
- Optional override:
  `--smoke-report <path>`
- Pretty stdout mode:
  `--pretty`

## Outputs

The script writes sandbox-only outputs:

- JSON:
  `lab/gameplay_observation/sandbox_outputs/pr21_automation_status/automation_status.pr21.json`
- Markdown:
  `lab/gameplay_observation/sandbox_outputs/pr21_automation_status/automation_status.pr21.md`

## Component coverage

PR-21 reports status for:

- `gameplay_observation_runner`
- `observation_triage`
- `codex_task_queue`
- `codex_prompt_pack`
- `codex_execution_packet`
- `codex_result_intake`
- `orchestration_smoke_runner`

Component status values:

- `INSTALLED`
- `MISSING`
- `BLOCKED`
- `UNKNOWN`

Overall status values:

- `READY_FOR_MANUAL_NON_CANONICAL_CODEX_LOOP`
- `PARTIAL`
- `BLOCKED`

## Required interpretation boundaries

- The scaffold is for manual non-canonical Codex loops only.
- It is not autonomous production automation.
- It is not scientific proof.
- It does not authorize claims or promotion.
- Human still decides merge/reject.
- Generated sandbox outputs must remain untracked.

## Usage

```powershell
..\venv312\Scripts\python.exe scripts/report_codex_automation_status.py --pretty
..\venv312\Scripts\python.exe scripts/report_codex_automation_status.py --smoke-report lab/gameplay_observation/sandbox_outputs/pr20_orchestration_smoke/orchestration_smoke.pr20.json --pretty
```
