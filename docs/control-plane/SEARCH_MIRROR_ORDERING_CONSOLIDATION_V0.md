# Search Mirror Ordering Consolidation V0

Status: DOCUMENTED_ONLY

Scope: AM-MIRROR root ordering consolidation note.

Claim verdict: NO_CLAIM_ALLOWED

This document is docs-only. It makes no runtime behavior changes, does not change Search behavior, does not enable `TCS_MIRROR_ORDERING` by default, and does not modify Rust, Python, tests, datasets, training, benchmarks, or runtime artifacts.

## Consolidated Chain

The AM-MIRROR root ordering chain is:

1. Engine legal truth: Rust engine legality remains the source of legal actions.
2. Candidate simulation: each root candidate can be simulated in a cloned/candidate state.
3. Opponent response ActionMask: the opponent response helper derives an `ActionMask` from legal opponent replies after the candidate.
4. MirrorRiskSummary: the response mask is summarized into advisory mirror risk signals.
5. Root-only ordering penalty: Search may apply a bounded ordering penalty at the root when `TCS_MIRROR_ORDERING=1`.
6. Search remains final authority: mirror ordering only changes candidate order; Search still decides by search result.

## Active Implementation Status

| Surface | Status | Notes |
| --- | --- | --- |
| Opponent response ActionMask helper | IMPLEMENTED / TESTED | Active Rust helper builds opponent response masks from legal replies after candidate simulation. |
| Check reply signal | TESTED | Response summaries include tested check reply signal coverage. |
| Mate reply signal | TESTED | Response summaries include tested mate reply signal coverage. |
| MirrorRiskSummary | IMPLEMENTED / TESTED | Advisory summary exists over opponent response mask features. |
| Root-only Search ordering integration | IMPLEMENTED / TESTED | Integration is root-only and gated by `TCS_MIRROR_ORDERING=1`. |
| Mirror runtime diagnostics | IMPLEMENTED / TESTED | Diagnostics count enabled roots, candidate evals, simulations, failures, and elapsed nanos. |
| Root ordering regression fixtures | IMPLEMENTED / TESTED | Regression fixtures cover default-off, bounded penalty, no pruning, root-only placement, and tactical preservation surfaces. |

## Hard Boundaries

- No hard pruning: mirror risk may demote ordering only; it must not remove legal moves.
- No negamax integration: mirror risk is not integrated into recursive negamax scoring.
- No quiescence integration: mirror risk is not integrated into quiescence.
- No default ON: `TCS_MIRROR_ORDERING` remains default OFF unless explicitly set to `1`.
- No neural authority: neural surfaces may propose or rerank only and do not decide.
- No Python authority: Python remains ML, inference, and tooling; it is not Search authority.
- No dataset labels: AM-MIRROR does not promote dataset labels.
- No training: AM-MIRROR does not authorize or run training.
- No HumanGate use: HumanGate is not connected to this runtime path.
- No Chess960 activation: this work does not activate Chess960 runtime.
- No DecisionController activation: this work does not activate DecisionController.

## Compute And Cost Status

- Root-only: mirror ordering work is limited to the root ordering surface.
- Cached/precomputed: root penalties are computed before root move ordering and reused for ordering decisions.
- Diagnostics exist: runtime diagnostics can observe candidate evals, simulations, failures, enabled roots, and elapsed nanos.
- Performance not proven: no benchmark, report, or log proves compute-debt reduction.
- Strength not proven: no benchmark, report, or log proves strength, Elo, readiness, promotion, or product value.
- Observation only: future benchmark/log/report output would be observation only unless a separate explicit evidence protocol and human decision changes claim scope.

## Intended Next Steps

- Optionally review cache/cost diagnostics for observation-only compute visibility.
- Expand root ordering fixtures if a specific uncovered root-ordering case is identified.
- Extract Search module structure later under a separate explicit pack.
- Keep default ON blocked until an explicit human decision and separate validation scope.

## Divergence From Older Docs

Older docs and roadmap notes describe some `ActionMask`, Search mirror, or modular Search work as absent, incomplete, or planning-only. The local repo now has implementation and test surfaces for the AM-MIRROR root ordering chain listed above.

This divergence does not grant dataset or training authority. Dataset labels remain BLOCKED because they require ActionId, LegalAction, ActionMask, provenance, and HumanGate. Training remains BLOCKED. Python authority remains BLOCKED for Search decisions. Chess960 runtime remains BLOCKED.

## Status Matrix

| Component | Status | Claim boundary |
| --- | --- | --- |
| Active runtime code | IMPLEMENTED | Rust AM-MIRROR helper and root ordering surfaces exist. |
| Tests | TESTED | Targeted Rust test surfaces exist for helper, summary, diagnostics, and ordering behavior. |
| Runtime outputs/artifacts | PASSIVE | Diagnostics are observation-only and do not prove performance. |
| Canonical docs | DOCUMENTED_ONLY | This note consolidates current repo state without activating behavior. |
| Roadmap/docs-only | DOCUMENTED_ONLY | Future extraction/default-on work remains separate. |
| Inference | UNKNOWN | No claim is made beyond local code/doc/test surfaces. |

## Verdicts

- mirror_ordering_doc_status: DOCUMENTED_ONLY
- mirror_ordering_runtime_status: IMPLEMENTED / TESTED
- mirror_diagnostics_status: IMPLEMENTED / TESTED
- compute_debt_status: UNKNOWN
- default_on_readiness: BLOCKED
- hard_pruning_status: NOT_FOUND
- search_authority_status: IMPLEMENTED
- dataset_label_readiness: BLOCKED
- training_readiness: BLOCKED
- chess960_runtime_readiness: BLOCKED
- software_verdict: DOCUMENTED_ONLY
- evidence_verdict: OBSERVATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
- training_allowed_now: NO
- dataset_label_promotion_allowed_now: NO
- strength_claim_allowed_now: NO
