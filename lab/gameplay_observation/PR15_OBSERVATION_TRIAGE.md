# PR-15 Observation Triage (Non-Canonical)

Status: non-canonical triage only  
Claim status: `NO_CLAIM_ALLOWED`

## Goal

Convert PR-14 gameplay observation output into one coherent triage batch that:

- preserves strict non-canonical boundaries;
- classifies each position for follow-up readiness;
- emits machine-readable `task_next` investigation packets for future Codex work.

## Input

Default source report:

```text
lab/gameplay_observation/sandbox_outputs/pr14_gameplay_surface/observation_report.pr14_gameplay_surface.json
```

CLI override:

```text
--report <path>
```

## Output

Default triage report:

```text
lab/gameplay_observation/sandbox_outputs/pr15_triage/triage_report.pr15.json
```

The script enforces that output remains under:

```text
lab/gameplay_observation/sandbox_outputs/
```

## Labels

- `STABLE_OBSERVATION`: selected move is stable across observed depths.
- `DEPTH_SENSITIVE_OBSERVATION`: selected move changes across depths with moderate score variation.
- `NEEDS_TARGETED_INVESTIGATION`: selected move changes and diagnostics show stronger depth sensitivity.
- `DISCARD_LOW_SIGNAL`: not enough clean depth signal to support follow-up.
- `INVALID_OBSERVATION`: malformed or failing rows in the source report.

## TASK_NEXT packet contract

Investigation packets are produced only for `NEEDS_TARGETED_INVESTIGATION`:

```json
{
  "task_kind": "NON_CANONICAL_RUNTIME_INVESTIGATION",
  "source_position_id": "...",
  "objective": "...",
  "claim_verdict": "NO_CLAIM_ALLOWED",
  "allowed_files_hint": ["..."],
  "forbidden": ["..."]
}
```

## Usage

```powershell
..\venv312\Scripts\python.exe scripts/triage_gameplay_observation.py --pretty
```

Or with explicit report path:

```powershell
..\venv312\Scripts\python.exe scripts/triage_gameplay_observation.py --report lab/gameplay_observation/sandbox_outputs/pr14_gameplay_surface/observation_report.pr14_gameplay_surface.json --pretty
```

## Boundaries

- no `lab/runs/RUN_*`;
- no `lab/runs/latest.json`;
- no holdout access;
- no benchmark interpretation;
- no promotion or strength claim.
