# PR69 SearchBackend Boundary (Passive Skeleton)

## Relation To AAA Tactical Core V2

This change introduces a first passive architecture boundary under `src/ai/` for search-facing contracts:

- `SearchBudget`
- `SearchRequest`
- `SearchResult`
- `SearchBackend` trait

The boundary aligns with AAA Tactical Core V2 consolidation by separating an interface contract from the existing runtime implementation authority.

## Why This Is Passive

This PR only adds compile-time boundary types and trait shape. It does not wire the boundary into runtime decision-making, does not alter legality authority, and does not invoke neural systems.

## What This Does Not Change

- No changes to `src/chess/search.rs`
- No changes to `src/chess/root_decision.rs`
- No changes to `src/chess/decision.rs`
- No changes to `src/engine/**`
- No changes to `src/agents/**`
- No changes to `ml/**`
- No runtime behavior routing changes
- No benchmark, holdout, dataset reset, or promotion claim paths

## Current Runtime Authority

Current chess search and root decision flow remain the runtime authority. This boundary is intentionally non-authoritative until a future, explicit wiring PR is approved.

## Validation

Validation was executed with workspace hygiene checks, docs/session checks, targeted boundary tests, existing focused tests, and full test suite:

- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty`
- `cargo check`
- `cargo test --test search_backend_boundary -- --nocapture`
- `cargo test fen_round_trip -- --nocapture`
- `cargo test root_decision -- --nocapture`
- `cargo test`

## Risks

- Behavior risk: low, because boundary is passive and unwired.
- Evidence risk: low, bounded to compile/test and non-canonical local noise awareness.
- Claim risk: controlled; no strength, Elo, or scientific claim is introduced.

## Verdicts

- software_verdict: BOUNDARY_PASSIVE_READY
- evidence_verdict: LOCAL_VALIDATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
