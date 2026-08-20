# PR48 Telemetry Prep Schema

## Files Added/Changed

- Added `src/chess/decision_trace.rs`
- Changed `src/chess/mod.rs`
- Added `tests/telemetry_prep.rs`
- Added `lab/gameplay_observation/PR48_TELEMETRY_PREP_SCHEMA.md`

## Tests Added

- `tests/telemetry_prep.rs`
  - constructs the schema without engine or chess runtime execution
  - validates selected `ActionId` membership in legal `ActionId` values
  - allows missing selected `ActionId` for fallback/no-decision traces
  - represents search-only, neural-guided, and fallback flags
  - compares optional latency/node/depth fields deterministically

## Telemetry Fields Covered

- `state_key: String`
- `legal_action_ids: Vec<ActionId>`
- `selected_action_id: Option<ActionId>`
- `decision_mode: String`
- `used_search: bool`
- `used_neural: bool`
- `neural_latency_ms: Option<u64>`
- `search_nodes: Option<u64>`
- `search_depth: Option<u32>`
- `fallback_reason: Option<String>`

## Runtime Wiring

`decision_trace` is exposed through `src/chess/mod.rs` as a module only.

`tests/telemetry_prep.rs` keeps the direct path import because the crate library surface currently exposes `core` only; `src/lib.rs` does not publicly expose `chess`, and changing `src/lib.rs` is outside the PR48 allowed files.

No runtime telemetry emission was added.

No decision, engine, search, neural, simulation, or agent execution path was rewired.

## Behavior Changes

No engine behavior changes.

No search behavior changes.

No neural behavior changes.

No decision runtime behavior changes.

## Skipped Validation

- Benchmark validation skipped because PR48 is a telemetry schema skeleton and benchmark output is not valid proof for this task.
- Holdout validation skipped because this task must not use holdout or create canonical evidence.

## Risks

- behavior risk: LOW, standalone schema and tests only; no runtime wiring.
- evidence risk: LOW, mechanical schema validation only; no canonical evidence generated.
- claim risk: LOW, no Elo, strength, promotion, or scientific claim is made.

## Verdict

software_verdict: TELEMETRY_PREP_SCHEMA_ADDED

evidence_verdict: MECHANICAL_TELEMETRY_SCHEMA_ONLY

claim_verdict: NO_CLAIM_ALLOWED
