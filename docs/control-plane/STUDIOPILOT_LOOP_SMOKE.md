# StudioPilot Loop Smoke (Dry-Run Only)

`scripts/control_plane/run_studiopilot_loop_smoke.py` is a local end-to-end smoke check for StudioPilot manual-loop wiring.

This smoke run is dry-run only:

- It chains local validators/builders only.
- It uses fixture inputs plus temporary output files.
- It does not call Codex.
- It does not call OpenAI.
- It does not call the GitHub API.
- It does not execute generated prompts.
- It does not execute tasks.
- It does not create PRs.
- It does not merge, promote, or claim.
- It does not create canonical evidence.

The purpose is wiring verification for the manual loop, not AI capability proof.

## Pipeline

The smoke script runs this local sequence:

1. Validate StudioPilot packet fixtures.
2. Render Codex prompt from a valid TaskPacket fixture.
3. Validate ExecutionReport intake against schema and TaskPacket boundary checks.
4. Build ReviewPacket from fixture ExecutionReport + TaskPacket.
5. Build HumanDecision draft from generated ReviewPacket.
6. Validate final HumanDecision schema.

## Outputs and Lifecycle

- Default output location is a temp directory created with `tempfile`.
- Temp outputs are disposable and deleted by default.
- `--keep-temp` keeps temp outputs for inspection.
- `--output-dir` is optional and must respect path guardrails in the script.
- The script prints a JSON summary with step statuses and dry-run verdict boundaries.

## Usage

```powershell
python scripts/control_plane/run_studiopilot_loop_smoke.py --pretty
```

Optional temp retention:

```powershell
python scripts/control_plane/run_studiopilot_loop_smoke.py --pretty --keep-temp
```

## Verdict Boundaries

- software_verdict: CONTROL_PLANE_LOOP_SMOKE_ONLY
- evidence_verdict: DRY_RUN_SMOKE_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
