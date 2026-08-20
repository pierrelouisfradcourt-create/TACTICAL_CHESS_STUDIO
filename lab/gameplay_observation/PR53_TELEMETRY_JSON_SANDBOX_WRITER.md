# PR53 Telemetry JSON Sandbox Writer

## Files changed

- `src/chess/decision_trace.rs`
- `tests/telemetry_prep.rs`
- `lab/gameplay_observation/PR53_TELEMETRY_JSON_SANDBOX_WRITER.md`

## Helper added

- Added `decision_trace_to_pretty_json(trace: &DecisionTrace) -> Result<String, serde_json::Error>`.
- The helper delegates to serde pretty JSON serialization for `DecisionTrace`.

## Tests added

- Added deterministic pretty JSON coverage through the helper.
- Added helper JSON deserialization back into the same `DecisionTrace`.
- Added `validate_consistency` coverage after helper round-trip.
- Added string-only contract coverage with no file path or output path contract.

## Safety confirmations

- Helper is string-only.
- Helper does not write files.
- Helper does not emit telemetry.
- Helper does not create lab outputs.
- Helper is not wired into runtime behavior.
- No engine, search, neural, CI, benchmark, holdout, `lab/runs`, or canonical evidence output changes are introduced.

## Skipped validation and reason

- Benchmark validation skipped because performance runs are not proof and are outside telemetry schema tooling scope.
- Holdout validation skipped because holdout must not be used for this task.
- Canonical evidence generation skipped because this is sandbox-only telemetry tooling.

## Risks

- behavior risk: Low; helper serializes an existing data structure to a returned string only.
- evidence risk: Low; output is mechanical schema telemetry only and no canonical evidence is created.
- claim risk: Low; no Elo, strength, promotion, or scientific claim is made.

software_verdict: TELEMETRY_JSON_SANDBOX_WRITER_ADDED
evidence_verdict: MECHANICAL_TELEMETRY_SCHEMA_ONLY
claim_verdict: NO_CLAIM_ALLOWED
