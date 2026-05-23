# PR44 Action Key Identity Coverage

## Tests added

- `action_key_values_are_unique_within_legal_actions_across_categories`
- `promotion_action_keys_preserve_distinct_promotion_suffixes`
- `castling_action_keys_are_distinguishable_from_normal_king_moves`
- `en_passant_action_key_is_uci_like_and_unique_among_legal_actions`
- `repeated_legal_action_generation_does_not_introduce_duplicate_action_keys`

## Position categories covered

- Quiet development position.
- Capture-rich/tactical position.
- Castling-available position.
- Promotion-available position.
- En-passant-available position.

Full FEN lines are intentionally omitted from this report; they remain test fixtures only.

## Action key uniqueness

`action_key` values held unique within `legal_actions` for each covered position category in the added tests.

## Special move identity

- Promotion identity is currently distinguishable through distinct promotion suffixes.
- Castling identity is currently distinguishable from normal king moves by the UCI-like target square.
- En-passant identity is currently UCI-like and unique among legal actions in the covered position.

## Production ActionId

No production `ActionId` system was added.

## Source fix needed

No source fix was needed.

## Unassertable state fields

- Future production `ActionId` semantics because that system does not exist yet.
- Internal legal action generation order before the public `legal_actions` sort.
- Any identity metadata not represented by the current UCI-like `action_key` string.
- Runtime timing, profiling, strength, or promotion-readiness behavior.

## Skipped validation and reason

- Benchmarks were skipped because this PR is mechanical runtime safety coverage only.
- Holdout evaluation was skipped because holdout is not permitted for this task.
- Canonical evidence generation, `lab/runs/RUN_*`, and `latest.json` were skipped because this PR must not create canonical evidence.

## Behavior risk

Low. The change is test-only and asserts current legal action identity behavior without modifying runtime code.

## Evidence risk

Low for mechanical coverage. The tests only cover current `action_key` uniqueness and special-move distinguishability for selected positions.

## Claim risk

Low as long as results are described only as mechanical test coverage. No Elo, strength, promotion, or scientific proof claim is supported.

## Verdict

software_verdict: ACTION_KEY_IDENTITY_COVERAGE_ADDED
evidence_verdict: MECHANICAL_TEST_COVERAGE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
