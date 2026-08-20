# PR58 Passive DecisionTrace Bridge

## Files changed
- src/chess/decision_trace_bridge.rs
- src/chess/mod.rs
- tests/decision_trace_bridge.rs
- lab/gameplay_observation/PR58_PASSIVE_DECISION_TRACE_BRIDGE.md

## Helper added
- Added `build_decision_trace_from_legal_actions` as a passive bridge from already-known `LegalAction` data to `DecisionTrace`.
- The helper copies `LegalAction.action_id` values into `DecisionTrace.legal_action_ids`.
- The helper copies the optional selected `LegalAction.action_id` into `DecisionTrace.selected_action_id`.

## Tests added
- Bridge builds `DecisionTrace` from a `LegalAction` list.
- Selected `LegalAction` becomes `selected_action_id`.
- `validate_consistency` passes for a valid selected action.
- Fallback/no selected action is valid when legal actions exist.
- A constructed invalid trace rejects a selected action outside the legal action list.
- Bridge construction does not require engine/search/neural runtime dependencies.
- JSON serialization still works after bridge construction.

## Scope confirmations
- No spike merge.
- No runtime wiring.
- No engine/search/neural behavior change.
- No telemetry file writing.
- No canonical evidence outputs.

## Skipped validation and reason
- No benchmark validation was run because performance runs are not proof for this bounded telemetry/core bridge.
- No holdout validation was run because holdout usage is forbidden for this task.

## Risks
- behavior risk: Low; helper only constructs an in-memory telemetry struct and is not wired into runtime decision execution.
- evidence risk: Low; tests are mechanical and no canonical evidence is created.
- claim risk: Low; this PR makes no Elo, strength, promotion, or scientific proof claim.

software_verdict: PASSIVE_DECISION_TRACE_BRIDGE_ADDED
evidence_verdict: MECHANICAL_TELEMETRY_BRIDGE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
