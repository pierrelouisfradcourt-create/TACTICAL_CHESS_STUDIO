# PR70 PolicyGuide Boundary (Passive Skeleton)

## Relation To AAA Tactical Core V2

This change adds a second passive architecture boundary under `src/ai/` for policy guidance contracts:

- `PolicyGuideRequest`
- `PolicyPrior`
- `PolicyValueHint`
- `PolicyGuideResult`
- `PolicyGuide` trait

It reinforces AAA Tactical Core V2 separation by introducing a compile-time interface for guidance signals without altering runtime authority.

## Relation To PR69 SearchBackend Boundary

PR69 introduced the passive SearchBackend boundary for search contracts. PR70 extends the same boundary-first approach with a dedicated policy guidance contract, keeping final decision authority outside this interface.

## Why This Is Passive

This PR defines boundary types and trait shape only. It does not wire PolicyGuide into current chess decision flow and does not alter legality authority or action selection behavior.

## What This Does Not Change

- No changes to `src/chess/search.rs`
- No changes to `src/chess/root_decision.rs`
- No changes to `src/chess/decision.rs`
- No changes to `src/engine/**`
- No changes to `src/agents/**`
- No changes to `ml/**`
- No changes to runtime action selection routing
- No neural inference wiring
- No benchmark, holdout, dataset reset, or promotion claim paths

## Why PolicyGuide Does Not Own Legality Or Final Decision

`PolicyGuideRequest` receives already-formed legal `ActionId` values, and `PolicyGuideResult` returns priors plus optional value hint only. There is no selected final action field in the boundary result, preserving final decision authority for SearchBackend/future DecisionController layers.

## Validation

Validation executed with hygiene/session/doc checks, targeted boundary tests, existing focused tests, and full suite:

- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty`
- `cargo check`
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

- software_verdict: PASSIVE_POLICY_GUIDE_BOUNDARY_ADDED
- evidence_verdict: MECHANICAL_RUNTIME_BOUNDARY_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
