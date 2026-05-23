# CHESS960 FEN CONTRACT SPEC V0

Status: Docs-only contract specification
Scope: Contract definition only; no runtime implementation
Implementation authorized by this document: No

## 1) Purpose

This document defines a docs-only contract for future Chess960 FEN behavior.
No FEN parser implementation is authorized by this document.
No FEN serializer implementation is authorized by this document.
Standard FEN behavior in the repository remains frozen unless a future HumanDecision explicitly approves changes.

Mandatory claim posture:
- `claim_verdict: NO_CLAIM_ALLOWED`

## 2) Non-goals

This document does not authorize and does not perform:

- FEN implementation
- FEN parser work
- FEN serializer work
- castling runtime work
- gameplay activation for Chess960 FEN
- search/engine/Rocky/ML work
- any Chess960-ready claim

## 3) Current repo FEN assumptions

Current repository assumptions are:

- `src/chess/fen.rs` owns current FEN parse and serialize behavior.
- Castling rights encoding is classical `KQkq` (or `-` when absent).
- Current moved-state inference in `src/chess/fen.rs` assumes classical anchor files:
  - king anchor inference on file `e` (`x == 4`)
  - rook anchor inference on files `a` or `h` (`x == 0` or `x == 7`)
- Current code does not implement an explicit format mode switch for Standard FEN vs X-FEN vs Shredder-FEN/SMK-FEN.

Related contextual surfaces (not modified here):

- `src/chess/chess960.rs` (Chess960 back-rank generator)
- `src/prototype/minimal_ruleset.rs` (passive Chess960 ruleset factory)

## 4) Standard FEN invariants

Future work must preserve all of the following:

- Classical standard FEN remains backward compatible.
- `KQkq` remains valid for standard chess positions.
- Existing standard FEN tests continue to pass.
- No Chess960 extension may break parsing/serialization of existing standard positions.

## 5) Chess960 FEN candidate formats

Chess960 requires an explicit format contract because standard castling rights tokens are ambiguous once rook start files are non-classical.

Candidate contracts to be evaluated before implementation:

- Shredder-FEN / SMK-FEN: castling rights use rook-file letters.
- X-FEN: compatibility-oriented approach using `KQkq`-style signaling with Chess960-aware interpretation.
- Internal-only transitional format: repository-local encoding if external compatibility is intentionally deferred.

No candidate is approved for implementation in this document.

## 6) Contract decision

Conservative contract posture for PatchPack 7 Phase 1:

- Standard FEN contract remains unchanged.
- Chess960 FEN parser/serializer work remains BLOCKED until HumanDecision.
- Any future implementation must select exactly one explicit external contract before code:
  - Shredder-FEN/SMK-FEN, or
  - X-FEN, or
  - internal-only transitional contract.
- If no explicit choice is approved, parser/serializer implementation remains blocked.

## 7) Castling rights policy

Policy boundaries for future work:

- Castling rights encoding is not equivalent to castling legality.
- Chess960 castling requires rook-origin awareness beyond classical `a/h` assumptions.
- Future FEN work must not infer Chess960 rights from classical `a/h` rook anchors unless that position is explicitly classical-valid.
- Future parser/serializer behavior must avoid desynchronizing:
  - castling-rights encoding,
  - moved-state inference,
  - repetition-key behavior.

## 8) Compatibility boundaries

Until implementation is approved:

- Unsupported Chess960 FEN inputs should fail closed under the future contract.
- Standard FEN input must remain accepted as before.
- No public claim of Chess960 FEN support is allowed before HumanDecision and targeted tests pass.

## 9) Required test matrix before implementation

The following tests are required before any parser/serializer patch can be considered complete:

- standard FEN round-trip unchanged
- standard castling rights `KQkq` unchanged
- unsupported Chess960 FEN fail-closed behavior
- chosen Chess960 format parse tests
- chosen Chess960 format serialize tests
- castling-rights rook-file mapping tests
- repetition-key compatibility tests
- malformed-input handling tests
- no cross-contamination between standard and Chess960 modes

## 10) HumanDecision gates

HumanDecision is required before any of the following:

- choosing X-FEN vs Shredder-FEN/SMK-FEN vs internal-only
- implementing parser changes
- implementing serializer changes
- changing castling-rights encoding
- changing repetition-key behavior
- making any public claim of Chess960 FEN support

## 11) Stop conditions

Stop immediately and do not proceed if any of the following occurs:

- any `src/` file is touched in this docs-only phase
- FEN format choice remains ambiguous but implementation is attempted
- parser or serializer implementation is attempted
- standard FEN protections are not explicit
- castling runtime changes are implied or introduced
- readiness/support claim language is added

---

software_verdict: DOCS_ONLY_CONTRACT_DEFINED
evidence_verdict: SPEC_ONLY_REPO_BEHAVIOR_REFERENCED
claim_verdict: NO_CLAIM_ALLOWED
