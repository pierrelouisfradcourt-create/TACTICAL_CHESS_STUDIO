# PR42 Simulate/Undo Coverage

## Tests added

- `simulate_action_for_search_restores_state_for_quiet_non_capture_move`
- `simulate_action_for_search_restores_state_for_normal_capture_move`
- `simulate_action_for_search_restores_state_for_kingside_castling_move`
- `simulate_action_for_search_restores_state_for_queenside_castling_move`

## Files changed

- `tests/deterministic_engine.rs`
- `lab/gameplay_observation/PR42_SIMULATE_UNDO_COVERAGE.md`

## Restore cases covered

- Quiet non-capture move: verifies source/target board occupancy, unchanged unit count, en passant clearing shape, halfmove increment, and full snapshot restoration after undo.
- Normal capture move: verifies captured unit removal during simulation, source/target board occupancy, en passant clearing shape, halfmove reset, captured unit restoration, and full snapshot restoration after undo.
- Kingside castling: verifies king and rook relocation during simulation, castling rights clearing, halfmove increment, and full snapshot restoration after undo.
- Queenside castling: verifies king and rook relocation during simulation, castling rights clearing, halfmove increment, and full snapshot restoration after undo.

## Source fix needed

No source fix was needed.

## Unassertable state fields

- Internal consumed `SearchMoveUndo` payload after `undo_action_for_search`.
- Runtime profiling duration fields because they are nondeterministic timing measurements.
- Private engine internals not exposed through the current deterministic test module snapshot.

## Skipped validation and reason

- No requested validation is intentionally skipped.
- Benchmarks, holdout evaluation, canonical evidence generation, `lab/runs/RUN_*`, and `latest.json` are intentionally not used because PR-42 is mechanical runtime safety coverage only.

## Behavior risk

Low. The change is test-only and exercises existing simulate/undo behavior without changing runtime code.

## Evidence risk

Low for mechanical coverage. These tests do not establish performance, strength, promotion readiness, or scientific proof.

## Claim risk

Low as long as the result is described only as added deterministic mechanical test coverage.

## Verdict

software_verdict: SIMULATE_UNDO_COVERAGE_ADDED
evidence_verdict: MECHANICAL_TEST_COVERAGE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
