# Learning System Foundations Evidence Index (PR-LS-001)

## 1. Purpose

Learning System V1 scope is explicitly narrow:

- V1 is not a tutorial platform.
- V1 is a verified learning-trace pipeline.

This document is a docs-only evidence index of what exists now, what is partial, and what is still missing before Learning System V1 implementation work.

## 2. Current Doctrine

- error-observable-first
- skill-backed
- vocabulary-facing
- evidence-driven
- trace-admission-gated

## 3. Target Pipeline

```
Runtime / Engine
-> LegalAction
-> DecisionTrace
-> OutcomeTrace
-> EvidenceEvent[]
-> AssessmentInput
-> PostPlayAssessment
-> LearningTrace final
-> TraceAdmissionGate
-> Report
-> NextTrainingRecommendation stub
```

## 4. Existing Repo Primitives (Evidence Classification)

Classification vocabulary:

- EXISTS_READY
- EXISTS_PARTIAL
- MISSING
- DO_NOT_USE_AS_PROOF

| Primitive | Classification | Evidence pointers | Notes |
| --- | --- | --- | --- |
| LegalAction | EXISTS_READY | `src/core/legal_action.rs`, `tests/legal_action_adapter.rs` | Normalized action contract exists and has deterministic helper coverage. |
| DecisionTrace | EXISTS_PARTIAL | `src/chess/decision_trace.rs`, `src/chess/decision.rs`, `tests/telemetry_prep.rs` | Decision trace surfaces exist, but currently split across telemetry/runtime-oriented structs and not yet unified into the V1 learning-trace pipeline. |
| DecisionTraceBridge | EXISTS_PARTIAL | `src/chess/decision_trace_bridge.rs`, `tests/decision_trace_bridge.rs` | Passive bridge exists from legal actions to trace fields, but it is not a final post-play learning pipeline stage. |
| Puzzle lab / PuzzleTheme | EXISTS_PARTIAL | `src/chess/puzzle.rs`, `src/tool/puzzle_rng.rs` | Deterministic puzzle themes exist (`mate1`, `fork`) and are useful fixtures, but not a full learning-trace system. |
| dataset_decision_router | DO_NOT_USE_AS_PROOF | `ml/dataset_decision_router.py`, `MASTER_DOCS/03_KNOWN_ISSUES.md` | Router utility exists, but must not be treated as proof of learning-system correctness or admission quality. |
| pedagogical DB doctrine | EXISTS_PARTIAL | `lab/pedagogy_db/PEDAGOGICAL_DB_DATASET_GOVERNANCE.md`, `lab/datasets/human_pedagogical_master_db.md` | Governance doctrine exists, but V1 trace admission wiring is not yet implemented. |
| automation guard / evidence policy | EXISTS_READY | `scripts/auto_merge_guard.py`, `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md` | Fail-closed policy and verdict gating exist for bounded delivery and claim control. |
| SearchBackend boundary | EXISTS_READY | `src/ai/search_backend.rs`, `tests/search_backend_boundary.rs` | Passive contract boundary is merged and validated as interface-only surface. |
| PolicyGuide boundary | EXISTS_READY | `src/ai/policy_guide.rs`, `tests/policy_guide_boundary.rs` | Passive contract boundary is merged and validated as guidance-only surface. |
| DecisionController boundary | EXISTS_READY | `src/ai/decision_controller.rs`, `tests/decision_controller_boundary.rs` | Passive contract boundary is merged and validated as orchestration-only surface. |
| TacticalEnv boundary | EXISTS_READY | `src/env/tactical_env.rs`, `tests/tactical_env_contract.rs` | Passive environment contract is merged and validated as non-authoritative boundary surface. |

## 5. Missing Pieces (Learning System V1 Work Not Yet Implemented)

Current status: MISSING (not present as implemented V1 pipeline components).

- OutcomeTrace
- EvidenceEvent
- AssessmentInput
- PostPlayAssessment
- LearningTrace final
- TraceAdmissionDecision
- NextTrainingRecommendation stub
- fork fixtures
- promotion fixtures
- fork-only classifier
- fork-only trace admission gate
- promotion scripted smoke

## 6. V1A / V1B / Later Order

- V1A: fork-only verified trace pipeline
- V1B: promotion scripted smoke
- V1.1: capture_free_piece / hanging_piece detector
- V1.5: mate/stalemate/threat/passed_pawn
- V2: king escort / opposition / conversion

## 7. Pedagogical Order vs Implementation Order

Required explicit rule:

- pedagogical order != implementation order

Pedagogical-natural first concept:

- capture_free_piece

Repo-realistic implementation first target:

- fork

## 8. StarCraft-like Analogy (Architecture/Product Analogy Only)

Analogy scope (no integration claim):

micro-skill -> controlled situation -> objective -> observable failure -> feedback -> harder tutorial

This is architecture/product language only. It does not claim integration with StarCraft, SC2LE, or any external game platform.

## 9. Evidence / Claim Restrictions

- no benchmark as proof
- no holdout
- no dataset reset
- no latest.json proof
- no strength/Elo/scientific claim
- claim_verdict remains NO_CLAIM_ALLOWED

## 10. PR-LS Issue Map

- #140 Learning System V1 epic
- #141 PR-LS-001 (this PR)
- #142 PR-LS-002
- #143 PR-LS-003
- #144 PR-LS-004
- #145 PR-LS-005
- #146 PR-LS-006
- #147 PR-LS-007
- #148 PR-LS-008

## 11. Next Recommended PR

PR-LS-002: Define minimal LearningTrace schema standard.
