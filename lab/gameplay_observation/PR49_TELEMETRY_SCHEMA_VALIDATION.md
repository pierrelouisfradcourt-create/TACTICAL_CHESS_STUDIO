# PR49 Telemetry Schema Validation

## Files Changed

- `src/chess/decision_trace.rs`
- `tests/telemetry_prep.rs`
- `lab/gameplay_observation/PR49_TELEMETRY_SCHEMA_VALIDATION.md`

## Tests Added

- blank `state_key` is rejected
- empty `legal_action_ids` is rejected
- `validate_consistency` accepts a valid selected action
- `validate_consistency` accepts fallback/no selected action when legal actions exist
- `validate_consistency` rejects a selected action outside legal actions

## Validation Helpers Added

- `DecisionTraceValidationError::EmptyStateKey`
- `DecisionTraceValidationError::EmptyLegalActionIds`
- `DecisionTrace::validate_state_key()`
- `DecisionTrace::validate_legal_actions_present()`
- `DecisionTrace::validate_consistency()`

## Runtime Wiring

No runtime telemetry emission was added.

No runtime telemetry wiring was added.

No engine/search/neural behavior changes were made.

No decision, engine, search, neural, simulation, or agent execution path was modified.

## Skipped Validation

- Benchmark validation skipped because this PR is telemetry schema validation only, and benchmark output is not valid proof for this task.
- Holdout validation skipped because this task must not use holdout or create canonical evidence.
- Canonical evidence generation skipped because this PR adds mechanical schema validation only.

## Risks

- behavior risk: LOW, standalone schema helpers and focused tests only; no runtime wiring.
- evidence risk: LOW, mechanical telemetry schema validation only; no canonical evidence generated.
- claim risk: LOW, no Elo, strength, promotion, or scientific claim is made.

## Verdict

software_verdict: TELEMETRY_SCHEMA_VALIDATION_ADDED

evidence_verdict: MECHANICAL_TELEMETRY_SCHEMA_ONLY

claim_verdict: NO_CLAIM_ALLOWED
