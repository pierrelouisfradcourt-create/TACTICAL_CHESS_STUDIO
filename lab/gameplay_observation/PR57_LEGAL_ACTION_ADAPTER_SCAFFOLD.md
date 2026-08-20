# PR57 LegalAction Adapter Scaffold

## Files Changed
- src/core/legal_action.rs
- src/core/mod.rs
- tests/legal_action_adapter.rs
- lab/gameplay_observation/PR57_LEGAL_ACTION_ADAPTER_SCAFFOLD.md

## Types Added
- `LegalAction` (`src/core/legal_action.rs`)
  - fields:
    - `action_id: ActionId`
    - `action_key: String`

## Helpers Added
- `LegalAction::from_action_key(input: &str) -> Self`
- `sort_legal_actions_by_key(legal_actions: &mut [LegalAction])`
- `duplicate_legal_action_ids(legal_actions: &[LegalAction]) -> Vec<ActionId>`

## Tests Added
- `tests/legal_action_adapter.rs`
  - `legal_action_normalizes_action_key_through_action_id`
  - `sort_legal_actions_by_key_is_deterministic`
  - `duplicate_legal_action_ids_are_detected`
  - `legal_action_adapter_does_not_require_chess_runtime_dependencies`
  - `legal_action_adapter_behavior_is_stable_across_repeated_calls`

## Scope Confirmation
- No spike merge performed.
- No spike branch push performed.
- No runtime wiring added.
- No SearchBackend, PolicyGuide, or DecisionController implemented.
- No search, neural, or engine behavior changes introduced.
- No CI files changed.
- No canonical evidence outputs created.

## Commands Run And Results
- `git fetch origin --prune` -> OK
- `git switch main` -> OK
- `git pull --ff-only origin main` -> OK
- `git status --porcelain` -> local tracked noise present (`MASTER_DOCS/**`, `lab/reports/latest_benchmark_summary.json`)
- `git log --oneline -12` -> OK
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --scope core-minimal --pretty` -> OK
- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty` -> OK
- `cargo check` -> OK (warnings only)
- `cargo test --test legal_action_adapter -- --nocapture` -> OK (5 passed)
- `cargo test --test core_minimal -- --nocapture` -> OK (5 passed)
- `cargo test --test deterministic_engine -- --nocapture` -> OK (121 passed)
- `cargo test --test telemetry_prep -- --nocapture` -> OK (17 passed)
- `cargo test fen_round_trip -- --nocapture` -> OK
- `cargo test root_decision -- --nocapture` -> OK
- `cargo test` -> OK

## Skipped Validation And Reason
- None. All requested validation commands were executed.

## Behavior Risk
- Low. Change is a core scaffold with deterministic helpers and no runtime wiring.

## Evidence Risk
- Low. Outputs are mechanical local validation outputs only; no canonical evidence produced.

## Claim Risk
- Low. No performance, Elo, strength, promotion, or scientific claims made.

software_verdict: LEGAL_ACTION_ADAPTER_SCAFFOLD_ADDED
evidence_verdict: MECHANICAL_CORE_SKELETON_ONLY
claim_verdict: NO_CLAIM_ALLOWED
