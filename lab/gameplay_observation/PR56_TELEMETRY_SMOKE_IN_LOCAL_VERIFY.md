# PR56 Telemetry Smoke In Local Verify

## Files Changed

- `scripts/run_local_agent_verify.py`
- `lab/gameplay_observation/PR56_TELEMETRY_SMOKE_IN_LOCAL_VERIFY.md`

## Verifier Behavior Added

- Added telemetry-prep scoped local verifier integration for the PR-55 telemetry JSON dry-run smoke.
- Default verifier behavior remains unchanged: the default scope does not schedule telemetry smoke and does not add a telemetry smoke report section.
- `--scope telemetry-prep --pretty` remains report-only unless `--run-checks` is passed.
- `--scope telemetry-prep --run-checks --pretty` now includes a `telemetry_smoke` section with command, returncode, and parsed verdict fields when available.
- A nonzero telemetry smoke return code is included in normal command failure handling, causing verifier failure.

## Command Added To `--run-checks`

```text
.\.venv312\Scripts\python.exe scripts/run_telemetry_json_dry_run_smoke.py --pretty
```

## Sandbox Output Handling

- The smoke script continues to write generated output under:

```text
lab/gameplay_observation/sandbox_outputs/
```

- Sandbox output is non-canonical and remains untracked.
- `git ls-files lab/gameplay_observation/sandbox_outputs` returned no tracked files.

## Validation

- `.\.venv312\Scripts\python.exe -m py_compile scripts/run_local_agent_verify.py`: pass
- `.\.venv312\Scripts\python.exe -m py_compile scripts/run_telemetry_json_dry_run.py`: pass
- `.\.venv312\Scripts\python.exe -m py_compile scripts/run_telemetry_json_dry_run_smoke.py`: pass
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --scope telemetry-prep --pretty`: pass
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --scope telemetry-prep --run-checks --pretty`: pass
- `.\.venv312\Scripts\python.exe scripts/run_telemetry_json_dry_run_smoke.py --pretty`: pass
- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`: pass
- `cargo check`: pass with existing warnings
- `cargo test --test telemetry_prep -- --nocapture`: pass
- `cargo test --test core_minimal -- --nocapture`: pass
- `cargo test --test deterministic_engine -- --nocapture`: pass
- `cargo test fen_round_trip -- --nocapture`: pass
- `cargo test root_decision -- --nocapture`: pass
- `cargo test`: pass

## Skipped Validation And Reason

- No requested validation was skipped.
- Benchmark, holdout, performance, and proof-oriented validation were not run because this is automation guardrail work only and those validation types are forbidden or non-proof for this scope.

## Risks

- behavior risk: Low. This changes local verifier automation only and does not wire telemetry into runtime behavior.
- evidence risk: Low. Generated smoke output remains sandbox-only and non-canonical.
- claim risk: Low. No Elo, strength, promotion, or scientific claim is made.

software_verdict: TELEMETRY_SMOKE_IN_LOCAL_VERIFY_ADDED
evidence_verdict: NON_CANONICAL_SANDBOX_ONLY
claim_verdict: NO_CLAIM_ALLOWED
