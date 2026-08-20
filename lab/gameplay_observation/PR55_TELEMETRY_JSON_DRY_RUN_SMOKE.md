# PR55 Telemetry JSON Dry-Run Smoke

## Files changed

- `scripts/run_telemetry_json_dry_run_smoke.py`
- `lab/gameplay_observation/PR55_TELEMETRY_JSON_DRY_RUN_SMOKE.md`

## Smoke behavior

- Adds a sandbox-only smoke runner for `scripts/run_telemetry_json_dry_run.py`.
- Runs the PR-54 script with an output directory under `lab/gameplay_observation/sandbox_outputs/`.
- Validates `telemetry_trace.pr54.json` exists in the selected output directory.
- Validates the generated JSON has `schema_version`, `canonical_evidence: false`, `claim_verdict: NO_CLAIM_ALLOWED`, `evidence_verdict: NON_CANONICAL_SANDBOX_ONLY`, and `trace`.
- Validates `trace` has `state_key`, `legal_action_ids`, `selected_action_id`, `decision_mode`, `used_search`, `used_neural`, `neural_latency_ms`, `search_nodes`, `search_depth`, and `fallback_reason`.
- Validates `selected_action_id` is either `null` or present in `legal_action_ids`.
- Validates the output path remains under `lab/gameplay_observation/sandbox_outputs/`.
- Prints a JSON smoke summary with `software_verdict`, `evidence_verdict`, `claim_verdict`, `smoke_output_path`, and `sandbox_only: true`.

## Output path

- Default output directory: `lab/gameplay_observation/sandbox_outputs/pr55_telemetry_json_dry_run_smoke`
- Default output file: `lab/gameplay_observation/sandbox_outputs/pr55_telemetry_json_dry_run_smoke/telemetry_trace.pr54.json`

## Sandbox output tracking

- Generated sandbox output is non-canonical and remains untracked.
- Generated sandbox output is not part of the intended commit.
- `git ls-files lab/gameplay_observation/sandbox_outputs` confirms no sandbox output is tracked.

## Runtime wiring

- No runtime telemetry emission is added.
- No engine behavior is modified.
- No search behavior is modified.
- No neural code is modified.
- No CI configuration is modified.
- No canonical evidence output is created.

## Skipped validation and reason

- Benchmark validation skipped because performance runs are not proof and this task is tooling only.
- Holdout validation skipped because holdout must not be used for this task.
- Canonical evidence generation skipped because the output is explicitly sandbox-only and non-canonical.

## Risks

- behavior risk: LOW. The smoke runner is standalone tooling and does not wire telemetry into runtime behavior.
- evidence risk: LOW. The smoke output is constrained to sandbox outputs and remains non-canonical.
- claim risk: LOW. No Elo, strength, promotion, or scientific claim is made.

software_verdict: TELEMETRY_JSON_DRY_RUN_SMOKE_ADDED
evidence_verdict: NON_CANONICAL_SANDBOX_ONLY
claim_verdict: NO_CLAIM_ALLOWED
