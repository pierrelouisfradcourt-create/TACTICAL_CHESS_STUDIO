# CHESS960 FEN FORMAT DECISION V0

Status: Docs-only HumanDecision-ready format decision
Scope: Decision record only; no runtime implementation
Implementation authorized by this document: No
implementation_allowed_now: NO

## 1) Purpose

This document records a docs-only format decision for Chess960 FEN direction.
It does not implement parser behavior, serializer behavior, or any runtime FEN changes.
Parser and serializer work remain blocked in this phase.

Mandatory claim posture:
- `claim_verdict: NO_CLAIM_ALLOWED`

## 2) Decision

Selected immediate path:
- internal-only transitional

External interoperability formats remain future candidates only:
- X-FEN
- Shredder-FEN / SMK-FEN

No external Chess960 FEN support claim is allowed in this phase.

## 3) Rationale

- Lowest immediate runtime risk by keeping this phase docs-only.
- Preserves standard FEN behavior unchanged.
- Avoids premature external interoperability commitment.
- Keeps parser/serializer blocked until HumanDecision and targeted tests.
- Preserves a clean path for future contract revision if external interoperability becomes a product need.

## 4) Explicit Non-goals

- no parser
- no serializer
- no standard FEN behavior change
- no castling runtime change
- no legal move behavior change
- no engine/search change
- no Rocky/ML change
- no benchmark
- no readiness or support claim

## 5) Compatibility Boundary

- Standard FEN remains authoritative for standard chess.
- Classical `KQkq` remains unchanged for standard chess.
- Internal-only transitional means no external Chess960 FEN import/export support yet.
- Unsupported Chess960 FEN inputs must fail closed until implementation is explicitly approved.

## 6) Future Format Gates

HumanDecision is required before any of the following:

- selecting X-FEN
- selecting Shredder-FEN/SMK-FEN
- implementing parser
- implementing serializer
- changing castling-rights encoding
- changing repetition-key behavior
- making any public support claim

## 7) Required Future Test Matrix

Before any implementation is allowed, all of the following are required:

- standard FEN round-trip unchanged
- standard castling rights `KQkq` unchanged
- internal-only Chess960 format fail-closed tests
- chosen future external format parse tests
- chosen future external format serialize tests
- castling rights rook-origin mapping tests
- repetition-key compatibility tests
- malformed input tests
- no cross-contamination between standard and Chess960 modes

## 8) Stop Conditions

Stop immediately if any of the following occurs:

- any `src/` file touched
- any parser/serializer implementation attempted
- external format ambiguity reintroduced
- standard FEN behavior not protected
- castling runtime implied
- readiness/support claim added
- PatchPack 9 started

---

software_verdict: DOCS_ONLY_DECISION_RECORDED
evidence_verdict: DECISION_ONLY_WITH_CONTRACT_ALIGNMENT
claim_verdict: NO_CLAIM_ALLOWED
