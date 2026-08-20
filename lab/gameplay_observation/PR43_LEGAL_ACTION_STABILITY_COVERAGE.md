# PR43 Legal Action Stability Coverage

## Tests added

- `repeated_legal_actions_calls_return_identical_action_key_order_on_same_engine`
- `legal_actions_are_returned_in_sorted_stable_action_key_order_across_categories`

## FEN categories covered

- Quiet development position.
- Capture-rich/tactical position.
- Castling-available position.
- Promotion-available position.
- En-passant-available position.

Full FEN lines are intentionally omitted from this report; they are test fixtures only.

## Legal action order stability

Legal action ordering was stable in the added tests when represented through the current `action_key` strings. Repeated calls on the same engine returned identical `action_key` ordering, and all covered categories returned sorted `action_key` ordering.

## Source fix needed

No source fix was needed.

## Current action identity

No production `ActionId` system exists yet. The tests document only the current UCI-like `action_key` identity used for deterministic ordering checks.

## Unassertable state fields

- Any future production `ActionId` semantics because that system does not exist yet.
- Internal generation order before the public `legal_actions` sort.
- Runtime timing or profiling fields because they are nondeterministic measurements.
- Private engine internals not exposed through the current deterministic test module.

## Skipped validation and reason

- Benchmarks were skipped because this PR is mechanical runtime safety coverage only.
- Holdout evaluation was skipped because holdout is not permitted for this task.
- Canonical evidence generation, `lab/runs/RUN_*`, and `latest.json` were skipped because this PR must not create canonical evidence.

## Behavior risk

Low. The change is test-only and exercises existing legal action ordering behavior without modifying runtime code.

## Evidence risk

Low for mechanical coverage. These tests do not establish performance, strength, promotion readiness, or scientific proof.

## Claim risk

Low as long as the result is described only as deterministic mechanical test coverage.

## Verdict

software_verdict: LEGAL_ACTION_STABILITY_COVERAGE_ADDED
evidence_verdict: MECHANICAL_TEST_COVERAGE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
