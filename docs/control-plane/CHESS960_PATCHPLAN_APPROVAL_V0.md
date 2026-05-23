# CHESS960 PATCHPLAN APPROVAL V0

Status: Planning-only, docs-only approval pack
Scope: Convert existing Chess960 planning artifacts into a decision-ready sequence for future HumanDecision
Implementation authorized by this document: No

## 1) Purpose

This document is planning-only and docs-only.
It is an approval pack, not an implementation patch.

This document does not change runtime behavior, FEN behavior, castling behavior, search behavior, Rocky behavior, neural behavior, ML behavior, or dataset behavior.

No runtime, ML, tests, schemas, scripts, workflows, generated outputs, or source files are modified by this approval pack.

Mandatory claim posture:
- `claim_verdict: NO_CLAIM_ALLOWED`

## 2) Inputs Summarized

This approval pack synthesizes the following planning artifacts:

- `docs/control-plane/CHESS960_CAMPAIGNPLAN_DRAFT_V0.md`
- `docs/control-plane/ENGINE_CHESS960_IMPACT_MAP_V0.md`
- `docs/control-plane/ROCKY_CHESS960_IMPACT_MAP_V0.md`

Conceptual synthesis:
- CampaignPlan establishes planning boundaries, HumanGate discipline, and no-claim posture.
- Engine Impact Map identifies runtime risk surfaces and sequencing constraints.
- Rocky Impact Map identifies neural/ML/bridge surfaces and explicit block conditions.

## 3) Decision Matrix

| Future workstream | Decision | Decision condition |
|---|---|---|
| setup tests only | GO | Allowed only after explicit HumanDecision for first implementation patch scope. |
| passive Chess960 initial state factory | HOLD | Hold until setup tests pass and HumanDecision confirms runtime patch scope. |
| FEN contract spec | GO | Allowed as docs/spec only, under high scrutiny and explicit review. |
| FEN parser/serializer minimal | HOLD | Hold until FEN contract is approved by HumanDecision. |
| castling rules spec + test matrix | GO | Must be prepared before any castling runtime implementation. |
| variant-aware castling runtime minimal | HOLD | Hold until setup tests + FEN contract + castling matrix are approved. |
| Rocky / neural / ML adaptation | BLOCKED | Blocked until Chess960 runtime behavior is stable and explicitly authorized. |
| benchmark / public claim | BLOCKED | Blocked. No benchmark or readiness claim is authorized in this plan. |

## 4) Recommended Execution Order

1. setup tests only
2. passive Chess960 initial state factory
3. FEN contract spec
4. FEN parser/serializer minimal only after contract approval
5. castling rules spec + test matrix
6. variant-aware castling runtime minimal only after HumanDecision
7. Rocky/neural/ML review only after runtime stability

## 5) HumanDecision Requirements

HumanDecision is explicitly required before:

- first runtime patch
- any FEN parser/serializer implementation
- any castling runtime implementation
- any Rocky/neural/ML change
- any benchmark claim
- any public claim

Without these approvals, all related work remains planning-only/docs-only.

## 6) Rollback Boundaries

For future runtime work, rollback expectations are:

- setup tests can be reverted independently
- passive factory must not change standard chess default
- FEN changes must preserve standard FEN behavior
- castling runtime must preserve standard castling behavior
- Rocky/ML must remain disabled or search-only fallback until validated

## 7) Validation Target

Future validation targets (when implementation is later authorized):

- setup targeted tests
- standard chess regression tests
- FEN targeted tests
- castling targeted tests
- legal move targeted tests
- repetition / position key tests
- search smoke only after legal move stability
- no ML tests until Rocky/ML is explicitly authorized

## 8) Claim Policy

Explicit policy:

- Chess960 is not ready.
- Rocky is not Chess960-ready.
- Impact maps are planning artifacts only.
- No benchmark or performance claim is authorized.
- `claim_verdict: NO_CLAIM_ALLOWED`

---

software_verdict: DOCS_ONLY_CHESS960_PATCHPLAN_APPROVAL
evidence_verdict: PLANNING_ONLY_NO_RUNTIME_OR_ML_EVIDENCE
claim_verdict: NO_CLAIM_ALLOWED
