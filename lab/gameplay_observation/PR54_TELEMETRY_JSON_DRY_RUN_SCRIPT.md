# PR54 Telemetry JSON Dry-Run Script

## Files changed

- `scripts/run_telemetry_json_dry_run.py`
- `lab/gameplay_observation/PR54_TELEMETRY_JSON_DRY_RUN_SCRIPT.md`

## Script behavior

- Adds a standalone Python dry-run script for deterministic telemetry JSON fixture creation.
- Writes `telemetry_trace.pr54.json` only under `lab/gameplay_observation/sandbox_outputs/`.
- Supports `--output-dir` for sandbox output subdirectories.
- Supports `--pretty` for pretty JSON fixture and summary output.
- Validates `selected_action_id` is either `null` or present in `legal_action_ids`.
- Exits nonzero when `--output-dir` resolves outside `lab/gameplay_observation/sandbox_outputs/`.
- Prints a JSON summary containing `software_verdict`, `evidence_verdict`, `claim_verdict`, `output_path`, and `sandbox_only: true`.

## Output path

- Default output directory: `lab/gameplay_observation/sandbox_outputs/pr54_telemetry_json_dry_run`
- Default output file: `lab/gameplay_observation/sandbox_outputs/pr54_telemetry_json_dry_run/telemetry_trace.pr54.json`

## Sandbox-only confirmation

- The script writes only below `lab/gameplay_observation/sandbox_outputs/`.
- The script does not create `latest.json`.
- The script does not create `lab/runs/RUN_*`.
- The script does not read benchmark outputs.
- The script does not use holdout data.
- The script is not wired into runtime behavior.
- No engine, search, neural, CI, docs, benchmark, holdout, canonical evidence, or runtime code is modified.

## Generated output tracking

- Generated sandbox output remains untracked and is not part of the intended commit.

## Skipped validation and reason

- Benchmark validation skipped because performance runs are not proof and this task is tooling only.
- Holdout validation skipped because holdout must not be used for this task.
- Canonical evidence generation skipped because the output is explicitly sandbox-only and non-canonical.

## Risks

- behavior risk: LOW. The script is standalone tooling and is not called by runtime code.
- evidence risk: LOW. Generated output is under sandbox outputs only and is non-canonical.
- claim risk: LOW. No Elo, strength, promotion, or scientific claim is made.

software_verdict: TELEMETRY_JSON_DRY_RUN_SCRIPT_ADDED
evidence_verdict: NON_CANONICAL_SANDBOX_ONLY
claim_verdict: NO_CLAIM_ALLOWED
