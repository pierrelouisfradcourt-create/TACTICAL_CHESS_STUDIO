# PR-AUTO-020 AI Review Council

## Objective

Add a docs-only AI Review Council control-plane contract that formalizes
multi-agent review routing while preserving merge and claim authority
boundaries.

## Files Changed

Allowed docs-only files:

- `MASTER_DOCS/28_AI_REVIEW_COUNCIL.md`
- `lab/gameplay_observation/PR_AUTO_020_AI_REVIEW_COUNCIL.md`

No source, test, script, CI, model, runtime, benchmark, holdback-set, dataset,
run-bundle, or `latest.json` surfaces are changed.

## Role And Authority Summary

The new contract defines the Council as advisory routing only.

The Council may:

- review bounded PR-local artifacts;
- classify risks and route next action;
- enforce fail-closed stop conditions.

The Council may not:

- merge;
- override guard;
- override checks;
- widen claim scope;
- produce implementation proof claims.

## Inputs And Outputs

Required inputs include PR metadata, changed files, local mechanical reports,
guard dry-run output, and explicit task constraints.

Required output is structured routing JSON including:

- `council_verdict`
- `scope_ok`
- `forbidden_files_touched`
- `checks_ok`
- `claim_discipline_ok`
- `remaining_risks`

This output is route-only and not evidence authority.

## Stop Conditions Recorded

The contract requires stop/block/human route for:

- forbidden files touched;
- changed files outside approved lane;
- pending/failed checks;
- non-empty guard blocked reasons;
- missing/failed required local validation;
- claim verdict drift from `NO_CLAIM_ALLOWED`;
- non-doc implementation scope entry;
- benchmark/smoke/holdback-set being treated as proof.

## Claim Discipline

Hard discipline is explicit:

- Runtime ownership is unchanged.
- Tactical authority ownership is unchanged.
- Model suggestions remain advisory only.
- Benchmark is not proof.
- Smoke is not Elo.
- `latest.json` is not evidence.
- `claim_verdict` remains `NO_CLAIM_ALLOWED`.

## Validation Plan

Required local commands:

```powershell
.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty
.\.venv312\Scripts\python.exe scripts\prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty
```

After draft PR creation:

```powershell
.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr <PR_NUMBER> --expected-head <HEAD_SHA> --pretty
```

Explicitly skipped validation:

- benchmark;
- holdback-set;
- gameplay loop.

Skipped because this is docs/control-plane only and must not create runtime
performance or scientific claims.

## Risks

- Software risk: low; docs-only changes.
- Evidence risk: low if route-only interpretation is respected.
- Claim risk: low if `claim_verdict` remains `NO_CLAIM_ALLOWED`.

## Required PR Verdicts

software_verdict: DOCUMENTATION_ONLY_UPDATED  
evidence_verdict: DOCUMENTATION_ONLY  
claim_verdict: NO_CLAIM_ALLOWED
