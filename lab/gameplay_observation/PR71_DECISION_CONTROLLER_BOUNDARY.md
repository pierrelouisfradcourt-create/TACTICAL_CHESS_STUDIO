# PR71 DecisionController Boundary (Passive Skeleton)

## Relation To AAA Tactical Core V2

This change adds a third passive architecture boundary under `src/ai/` for final coordination contracts:

- `DecisionMode`
- `DecisionRequest`
- `DecisionChoice`
- `DecisionControllerInput`
- `DecisionController` trait

It continues the AAA Tactical Core V2 boundary-first extraction by introducing a compile-time coordinator interface without changing runtime authority.

## Relation To PR69 SearchBackend Boundary

PR69 defined the passive SearchBackend contract and SearchResult output shape. PR71 consumes that already-produced `SearchResult` as boundary input only, preserving SearchBackend as final authority when a selected legal action exists.

## Relation To PR70 PolicyGuide Boundary

PR70 defined the passive PolicyGuide contract and guidance output shape. PR71 consumes `PolicyGuideResult` as optional guidance input only and does not elevate policy guidance to final action authority.

## Why This Is Passive

This PR introduces only types, trait shape, module exposure, and compile-time boundary tests. It does not wire DecisionController into current chess decision runtime behavior and does not invoke search or neural systems.

## What It Does Not Change

- No changes to `src/chess/search.rs`
- No changes to `src/chess/root_decision.rs`
- No changes to `src/chess/decision.rs`
- No changes to `src/engine/**`
- No changes to `src/agents/**`
- No changes to `ml/**`
- No runtime behavior routing changes
- No search wiring or neural inference wiring
- No benchmark, holdout, dataset reset, or promotion claim paths

## Why DecisionController Does Not Own Legality

`DecisionRequest` accepts already-produced legal `ActionId` values and does not create or validate legality. Legality remains owned by existing runtime/legal-move production layers.

## Why PolicyGuide Does Not Own Final Decision

`PolicyGuideResult` remains guidance-only input. The DecisionController boundary receives policy output optionally and can produce fallback/no-selection outcomes, preserving that policy guidance does not force final action selection.

## Validation

Validation executed with hygiene/session/doc checks, targeted boundary tests, existing focused tests, and full suite:

- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty`
- `cargo check`
- `cargo test --test decision_controller_boundary -- --nocapture`
- `cargo test --test policy_guide_boundary -- --nocapture`
- `cargo test --test search_backend_boundary -- --nocapture`
- `cargo test fen_round_trip -- --nocapture`
- `cargo test root_decision -- --nocapture`
- `cargo test`

## Risks

- Behavior risk: low; boundary is passive and unwired.
- Evidence risk: low; validation is mechanical and local.
- Claim risk: controlled; no strength, Elo, or scientific claim.

## Verdicts

- software_verdict: PASSIVE_DECISION_CONTROLLER_BOUNDARY_ADDED
- evidence_verdict: MECHANICAL_RUNTIME_BOUNDARY_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
