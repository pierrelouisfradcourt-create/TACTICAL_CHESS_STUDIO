# ENGINE CHESS960 IMPACT MAP V0

Status: Planning-only, docs-only
Scope: Engine impact mapping before any runtime mutation
Runtime change authorized here: No

## 1) Purpose

This document maps likely runtime impact surfaces for future Chess960 work in the engine.
It is a planning artifact only and does not authorize implementation.

No runtime behavior is changed by this document.
No ML, inference, training, or benchmark activity is included.

Required claim posture for this document:
- `claim_verdict: NO_CLAIM_ALLOWED`

## 2) Engine Surfaces To Inspect Later

The following areas require targeted inspection before any code patch is proposed:

1. Initial board setup
2. Chess960 back-rank generation
3. King/rook placement constraints
4. Bishop opposite-color constraint
5. Black mirror setup from white back-rank
6. Castling rights representation
7. Castling legality checks
8. Castling destination squares
9. FEN serialization/deserialization contract
10. Legal move generation assumptions
11. Repetition and position key assumptions
12. Attack cache assumptions
13. Search assumptions tied to standard start/castling
14. Testing strategy and regression boundaries
15. Rollback boundaries for variant-specific patches

## 3) Risk Map

Risk labels are planning estimates only.

| Area | Risk | Rationale |
|---|---|---|
| Initial board setup | MEDIUM | Entry-point changes can propagate to many downstream systems. |
| Chess960 back-rank generation | MEDIUM | Constraint logic can fail silently if validation is weak. |
| King/rook placement | MEDIUM | Placement errors directly break castling semantics. |
| Bishop opposite-color constraint | LOW | Localized constraint but must be deterministic and testable. |
| Black mirror setup | MEDIUM | Mirror mismatch can desync turn symmetry and legality. |
| Castling rights | HIGH | Contract changes affect FEN, move legality, and state transitions. |
| Castling legality | HIGH | High branching and rule coupling with attack/occupancy checks. |
| Castling destination squares | HIGH | Chess960-specific endpoints differ from setup assumptions. |
| FEN contract (serialize/deserialize) | HIGH | External/state contract risk; breakage impacts tooling and tests. |
| Legal move generation assumptions | HIGH | Core correctness surface with broad regression risk. |
| Repetition/position key | HIGH | Hash/key drift can invalidate repetition detection and search state. |
| Attack cache assumptions | MEDIUM | Cache invalidation and indexing assumptions may rely on standard setup. |
| Search assumptions | HIGH | Implicit standard-chess assumptions can bias pruning/evaluation flow. |
| Testing strategy | MEDIUM | Missing matrix coverage can hide rule-specific regressions. |
| Rollback boundaries | MEDIUM | Poor isolation raises revert cost and risk of cross-surface breakage. |

Expected high-risk surfaces (must remain explicitly tracked):
- FEN contract
- Castling runtime behavior
- Position/repetition key
- Search assumptions
- Legal move generation assumptions

## 4) Forbidden Implementation List (For This Phase)

This document authorizes no implementation.
Explicitly forbidden under this patch:

- No runtime change is authorized by this document.
- No FEN parser implementation is authorized.
- No castling runtime implementation is authorized.
- No search refactor is authorized.
- No Rocky/ML change is authorized.

## 5) Recommended Future Order (Conceptual Only)

Conceptual sequence for future runtime PatchPacks after approval:

1. Setup-focused tests for Chess960 start constraints
2. Passive initial-state factory surface (no behavior swap)
3. FEN contract specification
4. FEN parser/serializer work only after contract approval
5. Castling rules specification plus test matrix
6. Variant-aware castling runtime only after HumanDecision

## 6) Required Checks Before Runtime Mutation

The following targeted checks should exist before runtime patches mutate behavior:

1. Setup tests (generation + invariants)
2. Standard chess regression tests
3. Castling tests (rights, legality, destination outcomes)
4. FEN tests (round-trip + malformed inputs)
5. Repetition/position key tests
6. Legal move generation tests

## 7) HumanDecision Gate

Any runtime PatchPack related to Chess960 requires explicit HumanDecision before implementation starts.
Without explicit HumanDecision, work remains planning-only and docs-only.

---

software_verdict: DOCS_ONLY_CHESS960_ENGINE_IMPACT_MAP
evidence_verdict: PLANNING_ONLY_NO_RUNTIME_EVIDENCE
claim_verdict: NO_CLAIM_ALLOWED
