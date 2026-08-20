# ROCKY CHESS960 IMPACT MAP V0

Status: Planning-only, docs-only
Scope: Rocky/neural/ML impact mapping before any implementation patch
Runtime/ML/bridge/dataset change authorized here: No

## 1) Purpose

This document is a planning artifact only. It maps likely Rocky Chess960 impact surfaces that must be reviewed before any implementation work is considered.

This patch does not change Rocky runtime behavior, neural behavior, ML inference/training behavior, Rust/Python bridge behavior, or dataset behavior.

Required claim posture for this document:
- `claim_verdict: NO_CLAIM_ALLOWED`

Explicit status:
- Rocky is not Chess960-ready.
- No Chess960-ready claim is authorized.
- No Rocky-ready claim is authorized.

Boundary note: Rocky is a product/runtime actor and data producer only. Rocky may play games, produce traces, and emit match outputs. Rocky is not a studio agent, not a reader, not an analyst, not a director, not StudioPilot, and not HumanGate.

Rocky output may be normalized into `ROCKY_MATCH_SUMMARY` or equivalent match summaries. These summaries are context records only. They do not tune Rocky, mutate rules, prove strength, authorize claims, promote variants, or activate future readers.

A future explanation surface may verbalize Rocky decision traces. That surface is separate from Rocky, non-authoritative, and cannot modify runtime, rules, claims, PR state, roadmap, or HumanDecision.

Rocky batch match production means gameplay execution that emits match data. It is not an autonomous tester, not an analyst, and not a control-plane actor.

All interpretation, promotion, claim, merge, roadmap, readiness, and activation decisions remain outside Rocky and require HumanGate / HumanDecision.

## 2) Rocky / Neural Surfaces To Inspect Later

Likely impact surfaces to inspect in future scoped PatchPacks:

1. `src/agents/neural_agent.rs`:
   - UCI move selection path and legality assumptions.
   - `policy_index` flow and selection-source reporting.
   - shortlist/rerank path behavior when legal candidates are constrained.
   - fallback path behavior (`fallback_legal_first`, bridge failure fallback).
2. Rust/Python bridge assumptions:
   - input contract (`fen|move1|move2|...`) and response parsing.
   - error/timeout handling and retry assumptions under variant positions.
3. `ml/infer_policy.py`:
   - `fen_to_tensor` input assumption under Chess960 starts.
   - legal move scoring path and fallback index handling.
4. `ml/move_vocab.py`:
   - UCI normalization and indexing assumptions.
   - legal move mask construction against vocabulary membership.
5. Policy indexing surface:
   - index alignment between Python logits and Rust consumption.
   - semantics of unknown/invalid indices in fallback flows.
6. Legal move mask surface:
   - whether Chess960 castling/legal representations remain mask-compatible.
7. Shortlist/rerank behavior:
   - shortlist pool quality under variant openings.
   - rerank fallback causes and traceability.
8. Fallback behavior:
   - deterministic fallback selection when prediction is absent/invalid.
9. `NEURAL_MOVE_RUNTIME` telemetry:
   - status/reason fields remain interpretable under variant positions.
10. `NEURAL_MATCH_RUNTIME` telemetry (where emitted):
    - fallback contamination counters and status semantics remain valid.
11. Dataset assumptions:
    - move-target distribution and legal-mask fields currently tied to standard assumptions.
12. Training/eval assumptions:
    - policy/value interpretation and evaluation comparability under variant data.
13. FEN/position encoding assumptions:
    - parser/tensor pipeline expectations for start position and castling rights fields.
14. Castling move representation:
    - UCI representation and legality semantics in Chess960 positions.
15. Chess960 start positions vs standard chess assumptions:
    - startup priors and opening heuristics that may be standard-only.

## 3) Strategy Options (Conceptual Comparison)

1. Legal-mask-only compatibility:
   - keep current model outputs but rely on legal mask + fallback.
   - lowest implementation pressure, but unclear quality in Chess960 positions.
2. Variant-aware model:
   - explicit variant conditioning and data/model pipeline updates.
   - highest scope and risk; requires strong contracts and data governance first.
3. Model disabled for Chess960 until validated:
   - force non-neural selection when variant is Chess960.
   - conservative safety posture; preserves claim discipline.
4. Search-only fallback for Chess960:
   - route Chess960 to search/runtime baseline path only.
   - useful baseline for telemetry and stability before neural variance.
5. Telemetry-first approach:
   - instrument and validate runtime + bridge observability before enabling neural changes.
   - supports evidence quality without premature capability claims.

## 4) Risk Map

Risk labels are planning estimates only.

| Area | Risk | Rationale |
|---|---|---|
| `src/agents/neural_agent.rs` selection/fallback paths | MEDIUM | Broad integration surface with many branch outcomes. |
| Rust/Python bridge contract | MEDIUM | Contract drift can create silent incompatibilities. |
| `ml/infer_policy.py` inference path | MEDIUM | Depends on FEN/tensor and policy-index stability. |
| `ml/move_vocab.py` assumptions | HIGH | Vocabulary coverage assumptions can fail on variant-specific representations. |
| Policy indexing | HIGH | Misalignment causes incorrect selection and false confidence. |
| Legal move mask compatibility | MEDIUM | May work mechanically but degrade silently if assumptions differ. |
| Shortlist/rerank behavior | MEDIUM | Candidate pruning and rerank heuristics may be standard-biased. |
| Fallback behavior | MEDIUM | Safety net exists but can hide variant incompatibility. |
| `NEURAL_MOVE_RUNTIME` telemetry semantics | MEDIUM | Telemetry fields may remain syntactically valid but semantically drift. |
| `NEURAL_MATCH_RUNTIME` telemetry semantics | MEDIUM | Aggregated fallback status can obscure variant root causes. |
| Dataset assumptions | HIGH | Data generation/labels may not represent Chess960 distributions. |
| Training/eval assumptions | HIGH | Comparability and interpretation risk without variant governance. |
| FEN/position encoding | HIGH | Contract mismatch can invalidate inference inputs. |
| Castling move representation | HIGH | Chess960 castling semantics are a core compatibility risk. |
| Chess960-ready / Rocky-ready claims | HIGH | Claim risk is critical without runtime + evidence gates. |
| Neural capability claims | HIGH | Not supported by planning-only documentation. |

Expected high-risk areas that must stay explicitly tracked:
- move vocabulary assumptions
- policy indexing
- dataset assumptions
- castling move representation
- FEN/position encoding
- neural claims
- Rocky-ready claims

## 5) Forbidden Implementation List (For This Phase)

This document authorizes no implementation.

Explicitly forbidden under this patch:

- No Rocky code change is authorized by this document.
- No ML code change is authorized.
- No move_vocab change is authorized.
- No dataset change is authorized.
- No inference change is authorized.
- No bridge change is authorized.
- No Chess960-ready claim is authorized.
- No Rocky-ready claim is authorized.

## 6) Recommended Future Order (Conceptual Only)

1. Stabilize Chess960 runtime setup first.
2. Stabilize FEN contract.
3. Stabilize castling/legal move behavior.
4. Then inspect legal move mask compatibility.
5. Then evaluate search-only baseline for Chess960.
6. Then review telemetry (`NEURAL_MOVE_RUNTIME`, `NEURAL_MATCH_RUNTIME`) for variant-specific behavior.
7. Then consider variant-aware neural support.
8. No ML/training mutation before DatasetQuality and HumanDecision gates.

## 7) Required Checks For Future Rocky/ML PatchPacks

Targeted checks that should exist before neural/ML mutation:

1. Runtime Chess960 setup tests.
2. FEN contract tests (including parse/serialize expectations).
3. Castling behavior tests for Chess960 legality/outcomes.
4. Legal move mask compatibility tests.
5. Rust/Python bridge smoke for Chess960 payload flow.
6. Move vocabulary compatibility check for Chess960-relevant legal move forms.
7. Telemetry check for `NEURAL_MOVE_RUNTIME` and `NEURAL_MATCH_RUNTIME` field consistency.
8. Search-only baseline comparison for Chess960 runtime stability.
9. No-claim check to block Chess960-ready/Rocky-ready/neural-strength claims.

## 8) HumanDecision Gate

Any PatchPack touching Rocky/neural/ML surfaces requires explicit HumanDecision after Chess960 runtime stability is established.

Without explicit HumanDecision, work remains planning-only and docs-only.

---

software_verdict: DOCS_ONLY_CHESS960_ROCKY_IMPACT_MAP
evidence_verdict: PLANNING_ONLY_NO_RUNTIME_OR_ML_EVIDENCE
claim_verdict: NO_CLAIM_ALLOWED
