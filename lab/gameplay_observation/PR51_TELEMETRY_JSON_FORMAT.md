# PR51 Telemetry JSON Format

## Scope

This PR adds JSON serialization and deserialization support for the existing `DecisionTrace` telemetry schema.

This is telemetry format work only.

No runtime telemetry emission was added.

No engine, search, neural, CI, docs, benchmark, holdout, canonical evidence, `lab/runs/RUN_*`, or `latest.json` changes were made.

## Files Changed

- `src/chess/decision_trace.rs`
- `tests/telemetry_prep.rs`
- `lab/gameplay_observation/PR51_TELEMETRY_JSON_FORMAT.md`

## Tests Added

- `decision_trace_serializes_to_stable_json_fields`
- `decision_trace_json_round_trip_preserves_trace_and_validation`
- `decision_trace_json_deserialization_normalizes_action_ids`
- `invalid_deserialized_decision_trace_still_fails_consistency_validation`

## Serialization Behavior

- `DecisionTrace` supports serde JSON serialization and deserialization with stable field names:
  `state_key`, `legal_action_ids`, `selected_action_id`, `decision_mode`, `used_search`,
  `used_neural`, `neural_latency_ms`, `search_nodes`, `search_depth`, and `fallback_reason`.
- `DecisionTrace` action ID fields serialize as normalized action key strings.
- `DecisionTrace` action ID fields deserialize through the existing `ActionId` normalization constructor so decoded telemetry preserves normalized action IDs.
- Deserialization does not imply trace validity; callers must still use `validate_consistency()`.
- Invalid decoded traces remain invalid under `validate_consistency()`.

## Runtime Wiring

No runtime telemetry wiring was added.

No telemetry files are written.

No runtime emission path was modified.

## Behavior Boundaries

No engine behavior changed.

No search behavior changed.

No neural behavior changed.

No CI behavior changed.

## Skipped Validation

- Benchmark validation skipped because benchmark output is not proof for telemetry format work.
- Holdout validation skipped because holdout must not be used for this task.
- Canonical evidence generation skipped because this is mechanical telemetry schema format work only.
- Runtime telemetry dry-run skipped because this PR must not wire telemetry into runtime behavior or emit telemetry files.

## Risks

- behavior risk: LOW, limited to serde support for existing telemetry schema types and telemetry prep tests.
- evidence risk: LOW, no benchmark, holdout, canonical evidence, or telemetry output was created.
- claim risk: LOW, no Elo, strength, promotion, scientific proof, or performance claim is made.

## Verdict

software_verdict: TELEMETRY_JSON_FORMAT_ADDED

evidence_verdict: MECHANICAL_TELEMETRY_SCHEMA_ONLY

claim_verdict: NO_CLAIM_ALLOWED
