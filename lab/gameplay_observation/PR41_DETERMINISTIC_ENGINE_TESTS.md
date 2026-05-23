# PR-41 Deterministic Engine Tests

Status: bounded Phase 1 deterministic engine test coverage
Claim status: `NO_CLAIM_ALLOWED`

## Objective

Start Phase 1 deterministic engine work with narrow mechanical tests only. This PR does not change engine runtime behavior, neural code, search code, CI, docs, datasets, benchmarks, holdout paths, canonical evidence, or promotion/strength claims.

## Prerequisite check

- Latest `main` includes PR-40 via `a2b28218 Merge pull request #98 from pierrelouisfradcourt-create/automation-pr40-close-noncanonical-loop-cycle`.
- `lab/gameplay_observation/PR40_NONCANONICAL_LOOP_CYCLE_CLOSE.md` exists.
- Local tracked noise was present at `lab/reports/latest_benchmark_summary.json` and was not reverted, deleted, staged, or committed.

## Tests added

- `legal_actions_are_returned_in_sorted_action_key_order`
- `legal_action_keys_are_stable_after_simulate_undo_round_trip`
- `action_key_investigation_documents_current_uci_identity`
- `simulate_action_for_search_restores_state_for_en_passant_capture`
- `simulate_action_for_search_restores_state_for_promotion_move`

## Files changed

- `tests/deterministic_engine.rs`
- `lab/gameplay_observation/PR41_DETERMINISTIC_ENGINE_TESTS.md`

## Deterministic behavior notes

- Legal action ordering appears deterministic for the covered mixed FEN: returned legal action keys match sorted current action keys.
- Legal action ordering is stable after a simulate/undo round trip for the covered en passant position.
- Current stable action identity investigation is limited to the existing UCI-style `action_key` surface, including promotion suffixes. No production `ActionId` system was added.

## Simulate/undo restoration coverage

The new tests cover restoration after:

- en passant capture
- promotion move
- legal action order snapshot before and after simulate/undo

The snapshot asserts public mechanical state that is relevant to restore safety:

- `to_fen()`
- current player
- turn index
- repetition counts
- en passant target
- halfmove clock
- castling-right booleans
- action log length
- board occupants
- unit owner, kind, position, template name, hp, cooldown, moved flag, and stats

## Unassertable state fields

- `Engine::current_repetition_key` remains private to `src/engine/engine.rs`; the external test asserts `repetition_counts` and `to_fen()` instead.
- Search runtime profile nanosecond fields are intentionally not asserted because they are timing measurements.
- `SearchMoveUndo` internals are not asserted directly; the tests assert state before simulation, state during simulation where relevant, and full public snapshot restoration after undo.

## Commands run

- `git fetch origin --prune`
- `git switch main`
- `git pull --ff-only origin main`
- `git status --porcelain`
- `git log --oneline -12`
- `Test-Path lab\gameplay_observation\PR40_NONCANONICAL_LOOP_CYCLE_CLOSE.md`
- `git switch -c runtime-pr41-deterministic-engine-tests`
- `cargo test legal_actions_are_returned_in_sorted_action_key_order -- --nocapture`
- `cargo test simulate_action_for_search_restores_state_for_en_passant_capture -- --nocapture`
- `cargo test simulate_action_for_search_restores_state_for_promotion_move -- --nocapture`
- `cargo test legal_action_keys_are_stable_after_simulate_undo_round_trip -- --nocapture`
- `cargo test action_key_investigation_documents_current_uci_identity -- --nocapture`
- `cargo fmt`
- `git restore -- src\agents\neural_agent.rs src\chess\root_decision.rs src\chess\search.rs src\chess\transition_reply.rs src\chess\uci.rs src\simulation\simulation_runner.rs`
- `git restore -- src\engine\engine.rs`
- `cargo test --test deterministic_engine -- --nocapture`
- `rustfmt tests\deterministic_engine.rs`
- `git restore -- src\chess\root_decision.rs src\chess\search.rs src\chess\transition_reply.rs src\chess\uci.rs src\engine\engine.rs`
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --pretty`
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --run-checks --pretty`
- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`
- `cargo check`
- `cargo test fen_round_trip -- --nocapture`
- `cargo test root_decision -- --nocapture`
- `cargo test`
- `git status --porcelain`
- `git ls-files lab\gameplay_observation\sandbox_outputs`

## Command results

- `git fetch origin --prune` initially failed with `.git/FETCH_HEAD` permission denied, then succeeded when rerun with approval.
- `git switch main` initially hit `.git/index.lock` permission denied, then succeeded when rerun with approval.
- `git pull --ff-only origin main` reported `Already up to date.`
- `git status --porcelain` reported the known local tracked noise at `lab/reports/latest_benchmark_summary.json`.
- `git log --oneline -12` showed PR-40 present via merge `a2b28218`.
- `Test-Path lab\gameplay_observation\PR40_NONCANONICAL_LOOP_CYCLE_CLOSE.md` returned `True`.
- The first implementation pass placed tests in `src/engine/engine.rs`; `run_local_agent_verify.py --pretty` returned `BLOCKED_FORBIDDEN_PATHS_CHANGED` because the generic verifier forbids `src/` changes. The tests were moved to `tests/deterministic_engine.rs`, and source formatting side effects were restored.
- The five targeted cargo test filters passed.
- `cargo test --test deterministic_engine -- --nocapture` passed, with `111` passed and `0` failed.
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --pretty` passed with `software_verdict: LOCAL_AGENT_VERIFY_READY`.
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --run-checks --pretty` passed with `software_verdict: LOCAL_AGENT_VERIFY_READY`.
- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty` passed with `software_verdict: PASS` and `hygiene_verdict: LOCAL_NOISE_PRESENT`; intended files were still untracked and `lab/reports/latest_benchmark_summary.json` remained local tracked noise.
- `cargo check` passed with existing warnings.
- `cargo test fen_round_trip -- --nocapture` passed for both the binary test target and deterministic-engine integration target: `2` passed and `0` failed in each target.
- `cargo test root_decision -- --nocapture` passed for both the binary test target and deterministic-engine integration target: `14` passed and `0` failed in each target.
- `cargo test` passed: binary test target `123` passed and `0` failed; deterministic-engine integration target `111` passed and `0` failed.
- `git ls-files lab\gameplay_observation\sandbox_outputs` returned no tracked sandbox outputs.

## Validation

- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --pretty`: passed, `software_verdict: LOCAL_AGENT_VERIFY_READY`.
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --run-checks --pretty`: passed, `software_verdict: LOCAL_AGENT_VERIFY_READY`.
- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty`: passed, `software_verdict: PASS`, `hygiene_verdict: LOCAL_NOISE_PRESENT`.
- `cargo check`: passed with existing warnings.
- `cargo test fen_round_trip -- --nocapture`: passed with duplicate target coverage due the integration test path inclusion.
- `cargo test root_decision -- --nocapture`: passed with duplicate target coverage due the integration test path inclusion.
- `cargo test`: passed, `123` binary target tests and `111` deterministic-engine integration target tests.

## Skipped validation and reason

- No benchmark was run or interpreted.
- No holdout path was used.
- No gameplay loop was executed.
- No canonical evidence was created.

## Risks

- behavior_risk: Low. This PR adds mechanical tests only and does not alter runtime behavior.
- evidence_risk: Low. The report is mechanical test coverage only, not canonical evidence.
- claim_risk: Low. `claim_verdict` remains `NO_CLAIM_ALLOWED`.

## Verdict

- software_verdict: DETERMINISTIC_ENGINE_TESTS_ADDED
- evidence_verdict: MECHANICAL_TEST_COVERAGE_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
