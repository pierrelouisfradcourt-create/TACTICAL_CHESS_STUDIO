# PR45 Core Minimal Identity

## Files Added

- `src/core/mod.rs`
- `src/core/ids.rs`
- `src/core/action_id.rs`
- `src/core/game_result.rs`
- `src/core/deterministic.rs`
- `src/lib.rs`
- `tests/core_minimal.rs`

## Tests Added

- `tests/core_minimal.rs`
  - ActionId normalization is deterministic.
  - ActionId ordering is stable.
  - duplicate ActionId detection works.
  - GameResult represents ongoing, draw, and winner states.
  - core identifiers do not require chess runtime types.

## Scope Confirmation

- No chess runtime rewiring.
- No replacement of existing action_key usage.
- No engine behavior changes.
- No neural changes.
- No search changes.
- No CI changes.
- No dataset reset.
- No benchmark used as proof.
- No holdout used.
- No canonical evidence outputs created.

## Skipped Validation

- Performance validation skipped because this PR is a compile-tested core skeleton only.
- Holdout validation skipped because holdout use is prohibited for this task.
- Benchmark validation skipped because benchmarks must not be used as proof.

## Validation Results

- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --pretty`
  - Result: FAIL, `software_verdict: BLOCKED_FORBIDDEN_PATHS_CHANGED`.
  - Reason: local guardrail reported pre-existing `MASTER_DOCS/**` tracked noise and did not accept the new `src/core/` and `src/lib.rs` paths in its path gate.
- `.\.venv312\Scripts\python.exe scripts\run_local_agent_verify.py --run-checks --pretty`
  - Result: FAIL, `software_verdict: BLOCKED_FORBIDDEN_PATHS_CHANGED`.
  - Nested checks: `cargo check`, `cargo test fen_round_trip -- --nocapture`, `cargo test root_decision -- --nocapture`, and claim data gate passed.
- `.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty`
  - Result: PASS, `software_verdict: PASS`, `hygiene_verdict: LOCAL_NOISE_PRESENT`.
- `cargo check`
  - Result: PASS.
- `cargo test --test core_minimal -- --nocapture`
  - Result: PASS, 5 passed.
- `cargo test --test deterministic_engine -- --nocapture`
  - Result: PASS, 121 passed.
- `cargo test fen_round_trip -- --nocapture`
  - Result: PASS, filtered test run passed.
- `cargo test root_decision -- --nocapture`
  - Result: PASS, filtered test run passed.
- `cargo test`
  - Result: PASS, full suite passed.

## Risks

- behavior risk: LOW. The new module is isolated behind `src/lib.rs` and is not wired into runtime behavior.
- evidence risk: LOW. Validation is mechanical only and does not create canonical evidence.
- claim risk: LOW. This report makes no Elo, strength, promotion, or scientific claim.

software_verdict: CORE_MINIMAL_IDENTITY_ADDED
evidence_verdict: MECHANICAL_CORE_SKELETON_ONLY
claim_verdict: NO_CLAIM_ALLOWED
