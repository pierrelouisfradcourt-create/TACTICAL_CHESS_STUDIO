# PR74 TacticalEnv Boundary (Passive Skeleton)

## Relation To AAA Tactical Core Architecture

This change adds the next passive architecture boundary under `src/env/`:

- `EnvResetRequest`
- `EnvStepRequest`
- `EnvStepResult`
- `EnvObservation`
- `TacticalEnv` trait

It continues boundary-first extraction for AAA Tactical Core Architecture by defining environment-facing contracts as compile-time interfaces only.

## Relation To SearchBackend, PolicyGuide, and DecisionController Boundaries

PR69 (`SearchBackend`), PR70 (`PolicyGuide`), and PR71 (`DecisionController`) introduced passive AI-side boundaries. PR74 complements those by adding a passive environment boundary that exchanges `ActionId` and `LegalAction` contract values without wiring runtime authority.

## Why This Is Passive

The PR adds only module/type/trait definitions and boundary contract tests. It does not route current runtime execution through `TacticalEnv` and does not invoke chess engine, search, neural, or agent subsystems.

## What It Does Not Change

- No changes to `src/chess/search.rs`
- No changes to `src/chess/root_decision.rs`
- No changes to `src/chess/decision.rs`
- No changes to `src/engine/**`
- No changes to `src/agents/**`
- No changes to `ml/**`
- No changes to `.github/**`
- No changes to `scripts/**`
- No benchmark, holdout, dataset reset, or runtime wiring changes

## Why Current Chess Runtime Remains Authority

`TacticalEnv` is currently an unwired contract boundary. Existing chess runtime modules still own legal move production, search flow, and final decision authority. The new boundary does not intercept, replace, or alter those paths.

## Why This Is Not OpenSpiel Integration

This PR is architecture-inspired only. It defines a generic environment boundary shape but does not integrate OpenSpiel APIs, adapters, game loops, or interoperability surfaces.

## Validation

Commands executed:

- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty`
- `cargo check`
- `cargo test --test tactical_env_contract -- --nocapture`
- `cargo test --test decision_controller_boundary -- --nocapture`
- `cargo test --test policy_guide_boundary -- --nocapture`
- `cargo test --test search_backend_boundary -- --nocapture`
- `cargo test fen_round_trip -- --nocapture`
- `cargo test root_decision -- --nocapture`
- `cargo test`

Result summary:

- All listed commands completed successfully (exit code `0`).
- `cargo check` and all targeted/full test commands passed.
- Existing repository warnings remained warnings only; no new runtime wiring was introduced.

## Risks

- Behavior risk: low, passive and unwired boundary only.
- Evidence risk: low, validation remains mechanical and local.
- Claim risk: controlled, no Elo/strength/promotion/scientific claims.

## Verdicts

- software_verdict: PASSIVE_TACTICAL_ENV_BOUNDARY_ADDED
- evidence_verdict: MECHANICAL_RUNTIME_BOUNDARY_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
