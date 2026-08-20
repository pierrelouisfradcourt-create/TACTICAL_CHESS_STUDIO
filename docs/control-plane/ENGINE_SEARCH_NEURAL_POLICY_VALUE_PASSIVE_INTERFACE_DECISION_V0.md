# ENGINE SEARCH NEURAL POLICY VALUE PASSIVE INTERFACE DECISION V0

Status: docs-only passive interface decision
Scope: PatchPack 18 Phase 1 only
Primary source: PATCHPACK_18_PREFLIGHT_REPORT (provided for this phase)

## 1. Purpose and non-goals

This document is docs-only.
This is a passive interface decision for `NeuralPolicyValue` on paper only, not implementation.
It does not authorize neural, ML, bridge, protocol, or runtime changes.
It does not authorize activation of `DecisionController` or `SearchBackend`.
It does not authorize PP19 roadmap fusion or master roadmap fusion.

Required gates:
- implementation_allowed_now: NO
- behavior_change_allowed_now: NO
- activation_allowed_now: NO
- neural_changes_allowed_now: NO
- ml_changes_allowed_now: NO
- neural_authority_expansion_allowed_now: NO
- pp19_roadmap_fusion_allowed_now: NO
- master_roadmap_fusion_allowed_now: NO
- claim_verdict: NO_CLAIM_ALLOWED

Non-goals:
- no `NeuralPolicyValue` implementation
- no runtime wiring
- no model loading changes
- no dataset/training/inference changes
- no bridge/protocol changes
- no readiness/strength/performance/scientific-proof claim

## 2. Preflight snapshot

- branch: main
- main_synced: YES
- working_tree_clean_before: YES
- latest_main_sha: 91d0d92c73b5e7b8670f0f49e18ea44fd4c4c5d8
- PR_245_present: YES
- PP17_gate_packet_present: YES

## 3. Current active neural boundary

Current active boundary remains unchanged:
- `src/agents/neural_agent.rs` remains active neural monolith (`NeuralAgent`)
- `src/chess/decision.rs` remains active router
- `ml/infer_policy.py` remains current Python bridge service
- `ml/move_vocab.py` remains move-index identity surface
- `ml/dataset_loader.py` / `ml/train.py` / `ml/dataset_decision_router.py` remain coupled ML/data surfaces
- current bridge/protocol remains unchanged

## 4. Existing passive boundary context

Existing passive boundaries already merged:
- PP12 passive `LegalAction` / `ActionId` adapter
- PP14 passive `SearchBackend` adapter
- PP16 passive `DecisionController` adapter
- PP17 neural split inventory and gate packet

Boundary invariant:
- none of these activate neural or replace active routing

## 5. Candidate NeuralPolicyValue boundary decision

Paper decision only:
- a future passive `NeuralPolicyValue` interface is conceptually admissible only if it remains passive
- no implementation is authorized in PP18
- no runtime wiring is authorized in PP18
- no model loading or Python bridge change is authorized in PP18
- no training or dataset change is authorized in PP18

## 6. Candidate passive interface contract

Candidate contract (paper level only):
- input: observation/state descriptor
- input: `legal_action_ids` / `ActionMask` equivalent
- optional input: context/profile metadata
- output: policy priors over legal `ActionId` values
- output: optional value estimate
- output: diagnostics/provenance metadata
- output must never include final move authority
- output must be bounded guidance only

## 7. Authority invariants

- Search remains final tactical authority.
- Neural never decides alone.
- `DecisionController` may orchestrate only under later HumanDecision.
- `NeuralPolicyValue`, if later implemented, may only provide guidance.
- Any future use must preserve legal action mask and `ActionId` identity.
- Any future activation requires separate HumanDecision and tests.

## 8. Required blockers before implementation

Blockers that must be resolved before any future implementation:
- stable `ActionId`
- stable `LegalAction`
- stable `ActionMask` / `legal_action_ids`
- stable observation contract
- typed/versioned bridge schema decision
- telemetry contract decision
- model identity manifest
- dataset manifest
- evaluation baseline
- no silent fallback masking
- no runtime route activation without gate

## 9. Forbidden surfaces

Explicitly forbidden in PP18 Phase 1:
- `src/agents/neural_agent.rs`
- `src/chess/decision.rs`
- `src/chess/decision_controller_adapter.rs`
- `src/chess/search_backend_adapter.rs`
- `src/chess/legal_action_adapter.rs`
- `src/ai/decision_controller.rs`
- `src/ai/search_backend.rs`
- `ml/infer_policy.py`
- `ml/move_vocab.py`
- `ml/dataset_loader.py`
- `ml/train.py`
- `ml/dataset_decision_router.py`
- `tests/**`
- `scripts/**`
- `.github/workflows/**`
- `lab/**`
- generated outputs

## 10. PP19 roadmap fusion handoff

- PP19/master roadmap fusion remains HOLD during PP18.
- PP19 may be considered only after PP18 is reviewed and merged.
- PP19 must consolidate PP9-PP18 outcomes into one roadmap.
- PP19 must not retroactively claim implementation or performance.
- PP19 requires separate HumanDecision.

## 11. Stop conditions

Stop immediately if any of the following occurs:
- any non-doc file touched
- any `src/` / `ml/` / `tests/` / `scripts/` / workflow / `lab` change
- any `NeuralPolicyValue` implementation
- any neural bridge/protocol/model/dataset/training/inference change
- any decision routing change
- any `SearchBackend` / `DecisionController` activation
- any neural authority expansion
- any runtime behavior change
- any benchmark/performance/readiness/scientific claim
- any PP19 roadmap fusion work

## 12. Validation policy

Docs-safe validation only:
- `git status --porcelain`
- `git diff --name-only`
- `git diff --name-only --cached`
- `git diff --check`
- readback of `docs/control-plane/ENGINE_SEARCH_NEURAL_POLICY_VALUE_PASSIVE_INTERFACE_DECISION_V0.md`
- forbidden-surface check
- `rg` marker checks

Forbidden validation for this phase:
- no `cargo test`
- no benchmarks
- no ML/training/inference
- no GitHub Actions

## 13. Final verdicts

software_verdict: DOCS_ONLY_NEURALPOLICYVALUE_DECISION_ALLOWED
evidence_verdict: PLANNING_ALIGNMENT_ONLY
claim_verdict: NO_CLAIM_ALLOWED
human_gate_required: YES
implementation_allowed_now: NO
behavior_change_allowed_now: NO
activation_allowed_now: NO
neural_changes_allowed_now: NO
ml_changes_allowed_now: NO
neural_authority_expansion_allowed_now: NO
pp19_roadmap_fusion_allowed_now: NO
master_roadmap_fusion_allowed_now: NO
