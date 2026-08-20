# ENGINE SEARCH NEURAL MASTER ROADMAP FUSION V0

Status: docs-only master roadmap fusion
Scope: PatchPack 19 Phase 1 only
Primary source: PATCHPACK_19_PREFLIGHT_REPORT

## 1. Purpose and non-goals

This document is a docs-only roadmap fusion for PP9 through PP18.
It consolidates existing planning and boundary outcomes into one alignment view.
It does not authorize implementation.
It does not authorize activation.
It does not create a new control-plane, a new SSOT object family, or a new active agent layer.

Required posture:
- implementation_allowed_now: NO
- runtime_changes_allowed_now: NO
- neural_changes_allowed_now: NO
- ml_changes_allowed_now: NO
- new_control_plane_allowed_now: NO
- claim_verdict: NO_CLAIM_ALLOWED

## 2. Preflight snapshot

- branch: main
- main_synced: YES
- working_tree_clean_before: YES
- latest_main_sha: bde6208a13e369e59321b52ddb34cf39fdfa5638
- PR_246_present: YES
- PP9_to_PP18_track_closed: YES

## 3. Source set

Fusion source set and role:
- PP9 decomposition roadmap: sequencing doctrine and no-activation roadmap baseline.
- PP10 surface inventory: active runtime ownership map and passive-surface inventory baseline.
- PP15 decision routing contract: search/neural routing invariants and non-activation routing boundary.
- PP17 neural split gate packet: neural split inventory and non-implementation gate model.
- PP18 NeuralPolicyValue passive interface decision: paper-only candidate interface posture and gate handoff to PP19.
- Control-plane canonization V1.1: docs-only control-plane interpretation and HumanGate authority.
- HYBRID_GAME_AI_PLATFORM_PLAN: long-horizon implementation ordering doctrine under runtime-authority-first rule.
- AAA_TACTICAL_CORE_ARCHITECTURE: tactical-core migration doctrine with extract/isolate/encapsulate/stabilize/redirect posture.
- 05_ARCHITECTURE: authority order and runtime-over-docs truth ordering.
- DOCS_STATUS: roadmap-language discipline and claim boundary discipline.
- 03_KNOWN_ISSUES: active risk register and no-proof/no-overclaim posture.

Normalization note:
- duplicate doctrine is consolidated here as one planning index; runtime truth remains in source code and current validated artifacts.

## 4. PP9-PP18 merged timeline/status table

| PatchPack | Type | Status | Active/Passive/Docs-only | Claim status | Next dependency |
| --- | --- | --- | --- | --- | --- |
| PP9 roadmap | docs-only roadmap | MERGED | docs-only | NO_CLAIM_ALLOWED | PP10 inventory |
| PP10 inventory | docs-only inventory | MERGED | docs-only | NO_CLAIM_ALLOWED | PP11 determinism tests |
| PP11 determinism tests | tests-only characterization | MERGED | passive (tests-only, no runtime activation) | NO_CLAIM_ALLOWED | PP12 passive LegalAction/ActionId adapter |
| PP12 passive LegalAction/ActionId adapter | code-bounded passive adapter | MERGED | passive | NO_CLAIM_ALLOWED | PP13 search root tests |
| PP13 search root tests | tests-only characterization | MERGED | passive (tests-only, no runtime activation) | NO_CLAIM_ALLOWED | PP14 passive SearchBackend adapter |
| PP14 passive SearchBackend adapter | code-bounded passive adapter | MERGED | passive | NO_CLAIM_ALLOWED | PP15 routing contract |
| PP15 routing contract | docs-only contract plan | MERGED | docs-only | NO_CLAIM_ALLOWED | PP16 passive DecisionController adapter |
| PP16 passive DecisionController adapter | code-bounded passive adapter | MERGED | passive | NO_CLAIM_ALLOWED | PP17 neural split gate packet |
| PP17 neural split inventory | docs-only inventory/gate packet | MERGED | docs-only | NO_CLAIM_ALLOWED | PP18 NeuralPolicyValue passive interface decision |
| PP18 NeuralPolicyValue decision | docs-only passive-interface decision | MERGED | docs-only | NO_CLAIM_ALLOWED | PP19 master roadmap fusion |

## 5. Consolidated boundary map

Consolidated runtime and passive-boundary map:
- active runtime router remains `src/chess/decision.rs`
- active search path remains `search_root_with_context`
- `NeuralAgent` remains current neural runtime path
- `SearchBackend` remains passive
- `DecisionController` remains passive
- `LegalAction`/`ActionId` adapter remains passive
- `NeuralPolicyValue` remains paper-only candidate

Boundary implication:
- PP19 does not alter active runtime routing, active search authority path, neural runtime behavior, or ML surfaces.

## 6. Authority invariants

Mandatory invariants preserved by this fusion:
- Search remains final tactical authority.
- Neural never decides alone.
- Runtime/source truth outranks docs.
- HumanGate/HumanDecision remains final authority.
- Docs are planning alignment, not proof.
- claim_verdict: NO_CLAIM_ALLOWED by default.

Rocky observation and dataset-safety guidance now lives in `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`; it is observation/evidence guidance only and does not alter these authority invariants.

## 7. Consolidated gates and forbidden surfaces

Consolidated PP19 gates:
- no source edits
- no ML edits
- no runtime activation
- no neural authority expansion
- no benchmark claims
- no new control-plane
- no new SSOT object family

Forbidden surfaces for PP19 execution:
- no `src/`
- no `tests/`
- no `ml/`
- no `scripts/`
- no `schemas/`
- no `.github/workflows/`
- no `lab/`
- no generated outputs

## 8. Post-PP19 roadmap

Planning-level candidates only, all future implementation remains gated:
- PP20 candidate: current-state index and stale-doc demotion map.
- PP21 candidate: evidence manifest alignment packet.
- PP22 candidate: implementation gate packet for future passive `NeuralPolicyValue` or telemetry schema, only after separate HumanDecision.

Authorization boundary:
- none of PP20, PP21, or PP22 are authorized by this document.
- future implementation remains gated behind separate HumanDecision.

## 9. Conflict / duplication normalization rules

Normalization rules:
- duplicate doctrine should be consolidated, not multiplied.
- old docs may remain context unless separately archived by explicit human direction.
- PP19 does not delete or supersede runtime truth.
- PP19 is convergence synthesis, not execution authority.

## 10. Stop conditions

Stop immediately if any of the following occurs:
- any non-doc change
- any `src/tests/ml/scripts/workflow/lab` change
- any runtime activation
- any claim language suggesting readiness/strength/performance/scientific proof
- any new control-plane object
- any ambiguity around HumanDecision

## 11. Validation policy

Docs-safe validation only:
- `git status --porcelain`
- `git diff --name-only`
- `git diff --name-only --cached`
- `git diff --check`
- readback of this file
- forbidden-surface check
- `rg` marker checks

Required marker strings:
- `implementation_allowed_now: NO`
- `runtime_changes_allowed_now: NO`
- `neural_changes_allowed_now: NO`
- `ml_changes_allowed_now: NO`
- `new_control_plane_allowed_now: NO`
- `claim_verdict: NO_CLAIM_ALLOWED`
- `Search remains final tactical authority`
- `Neural never decides alone`
- `HumanDecision`
- `SearchBackend`
- `DecisionController`
- `NeuralPolicyValue`
- `docs-only`
- `no new control-plane`

## 12. Final verdicts

software_verdict: DOCS_ONLY_MASTER_ROADMAP_FUSION_ALLOWED
evidence_verdict: PLANNING_ALIGNMENT_ONLY
claim_verdict: NO_CLAIM_ALLOWED
human_gate_required: YES
implementation_allowed_now: NO
runtime_changes_allowed_now: NO
neural_changes_allowed_now: NO
ml_changes_allowed_now: NO
new_control_plane_allowed_now: NO
master_roadmap_fusion_allowed_now: DOCS_ONLY
