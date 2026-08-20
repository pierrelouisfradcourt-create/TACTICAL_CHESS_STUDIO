# ENGINE SEARCH NEURAL DECISION ROUTING CONTRACT PLAN V0

Status: docs-only routing contract plan
Scope: PatchPack 15 Phase 1 only
implementation_allowed_now: NO
behavior_change_allowed_now: NO
activation_allowed_now: NO
search_tuning_allowed_now: NO
claim_verdict: NO_CLAIM_ALLOWED
pp16_allowed_now: NO
master_roadmap_fusion_allowed_now: NO

## 1) Purpose and non-goals

This document is a docs-only decision routing contract plan for PP15, updated to match current routing truth after `26174dea5ad036160cf99d983dd7fe3e0a439671`.
It does not authorize implementation, runtime routing mutation, gameplay, training, benchmark, dataset generation, or new contract activation.
It does not activate `DecisionController` or `ActionMask` authority.
The current Search-authority route uses `search_root_via_adapter(...)` / `PassiveSearchBackendAdapter` as the active decision-to-search routing boundary.

Required posture:
- `implementation_allowed_now: NO`
- `behavior_change_allowed_now: NO`
- `activation_allowed_now: NO`
- `search_tuning_allowed_now: NO`
- `claim_verdict: NO_CLAIM_ALLOWED`
- `pp16_allowed_now: NO`
- `master_roadmap_fusion_allowed_now: NO`

Non-goals:
- no implementation work
- no runtime decision routing change
- no `DecisionController` activation
- no general `SearchBackend` runtime replacement beyond the current adapter boundary
- no source/test/ml/script/schema/workflow/lab mutation
- no benchmark or readiness or strength or scientific-proof claim

## 2) Preflight snapshot

- branch: main
- main_synced: YES
- working_tree_clean_before: YES
- latest_main_sha: 4e8575366c1984aaaff18b91afef4ac5f1195ce5
- PR_242_present: YES
- PP14_adapter_present: YES

## 3) Current active decision routing map

- active router: `src/chess/decision.rs`
- owner function: `choose_best_action_with_trace_and_context(...)`
- mode source: `DecisionMode::from_env()` or explicit mode input
- modes:
  - Random
  - Heuristic
  - Neural
  - Minimax
  - Hybrid

## 4) Mode-by-mode contract table

| Mode | Current source of decision | Search usage | Neural usage | Final authority | Must-preserve invariant | Forbidden PP15/PP16 drift |
| --- | --- | --- | --- | --- | --- | --- |
| `DecisionMode::Random` / Random | `choose_random(...)` in `src/chess/decision.rs` | None | None | `SelectionAuthority::Fallback`; current fallback legal-action route | Random is Fallback authority, not Search authority and not Neural authority | Any activation/wiring or behavior rewrite under PP15/PP16 |
| `DecisionMode::Heuristic` / Heuristic | `search_authority_trace(...)` -> `search_root_via_adapter(...)` | Active through `PassiveSearchBackendAdapter` | None | `SelectionAuthority::Search`; Search result selected by current root search | Heuristic routes through Search authority and preserves `RootSearchResult` in `DecisionTrace` | Any DecisionController activation or behavior rewrite |
| `DecisionMode::Neural` / Neural | `search_authority_trace(...)` -> `search_root_via_adapter(...)` | Active through `PassiveSearchBackendAdapter` | None through `decision.rs` final authority | `SelectionAuthority::Search`; Search result selected by current root search | Neural mode remains visible but no longer calls `NeuralAgent::select_action` as final authority through `decision.rs` | Any Neural final-authority expansion, training, model, or dataset claim |
| `DecisionMode::Minimax` / Minimax | `search_authority_trace(...)` -> `search_root_via_adapter(...)` | Active through `PassiveSearchBackendAdapter` | None | `SelectionAuthority::Search`; Search result selected by current root search | Minimax routes through Search authority and preserves `RootSearchResult` in `DecisionTrace` | Any DecisionController activation or behavior rewrite |
| `DecisionMode::Hybrid` / Hybrid | `search_authority_trace(...)` -> `search_root_via_adapter(...)` | Active through `PassiveSearchBackendAdapter` | None | `SelectionAuthority::Search`; Search result selected by current root search | Hybrid no longer has a `should_use_search(...)` heuristic final-selection exception in `decision.rs` | Any reintroduction of Hybrid non-search final authority |

Current routing truth note:
- This contract reflects current routing truth after commits through `26174dea5ad036160cf99d983dd7fe3e0a439671`.
- It is DOCUMENTED_ONLY alignment against current source and boundary guards.
- It does not authorize `DecisionController` activation, `ActionMask` authority, Neural refactor, training, benchmark, dataset generation, or Chess960.
- Current `decision.rs` active routing sends Heuristic, Neural, Minimax, and Hybrid through Search authority via the SearchBackend adapter boundary; Random remains Fallback.
- No global readiness, strength, benchmark, dataset, label-truth, training, or model-promotion claim is made.

## 5) Search authority invariants

- Current active Search authority is explicit for `DecisionMode::Minimax`, explicit `DecisionMode::Heuristic`, `DecisionMode::Hybrid`, and `DecisionMode::Neural`.
- These four modes use `search_authority_trace(...)` in `decision.rs`.
- `search_authority_trace(...)` calls `search_root_via_adapter(...)`.
- `search_root_via_adapter(...)` constructs `PassiveSearchBackendAdapter` and delegates to existing root search.
- `RootSearchResult` is preserved in `DecisionTrace` as `root_search: Some(root_search)`.
- The `SearchBackend` trait/types remain passive contracts; the adapter is active only as the routing boundary.
- No search tuning is allowed in PP15 or PP16.

## 6) Neural authority invariants

- Neural never becomes sole final authority through this plan.
- Current `DecisionMode::Neural` records `SelectionAuthority::Search` through the shared Search-authority helper.
- `NeuralAgent` still exists, and `NeuralAgent::select_action` still exists, but it is no longer reached as final authority through `decision.rs`.
- `NeuralProposal` / `PolicyGuide` remain PASSIVE and proposal-only; they cannot drive runtime, establish label truth, grant dataset admissibility, imply training readiness, or grant ActionMask authority.
- This plan does not alter `NeuralAgent`, fallback, rerank, telemetry, lock behavior, bridge protocol, Python, model, training, or datasets.
- Any future neural routing change requires separate HumanDecision.

## 7) Passive boundary map

- `DecisionController`: `src/ai/decision_controller.rs` (PASSIVE trait/types only)
- `SearchBackend`: `src/ai/search_backend.rs` (PASSIVE trait/types only)
- `PassiveSearchBackendAdapter`: `src/chess/search_backend_adapter.rs` (active decision-to-search routing boundary; delegates to root search)
- `LegalAction` / `ActionId` adapter: `src/chess/legal_action_adapter.rs` (PASSIVE canonical ID bridge)
- `PolicyGuide` / `NeuralProposal`: `src/ai/policy_guide.rs` (PASSIVE proposal-only)
- `ActionMask` authority: PASSIVE; active search still consumes engine legal actions directly.
- Existing boundary tests:
  - `tests/decision_controller_boundary.rs`
  - `tests/search_backend_boundary.rs`
  - `tests/search_backend_passive_adapter.rs`
  - `tests/decision_authority_boundary_current.rs`

## 8) Current gaps

- no single active `DecisionController` runtime path
- active `decision.rs` still owns routing
- dual `DecisionMode` namespaces risk
- `SearchBackend` trait/types remain passive even though `PassiveSearchBackendAdapter` is now active as the decision-to-search routing boundary
- `ActionMask` exists as helper surface but is not active search authority
- `NeuralAgent` path remains monolithic and must not be expanded
- Neural direct final selection through `decision.rs` is not current runtime truth
- Hybrid heuristic final-selection exception through `decision.rs` is not current runtime truth
- PP16 must not become activation

## 9) PP15 -> PP16 migration sequence

- PP15: docs-only contract plan
- PP16: passive `DecisionController` adapter only
- PP16 must not change default Hybrid behavior
- PP16 must not route active runtime through `DecisionController`
- PP16 must preserve search authority
- PP16 must preserve neural-bounded role
- Later activation requires separate HumanDecision after passive tests

## 10) Forbidden surfaces

Explicitly forbidden in PP15:
- `src/chess/decision.rs` edits
- `src/chess/search.rs` edits
- `src/chess/search_backend_adapter.rs` edits
- `src/chess/legal_action_adapter.rs` edits
- `src/ai/decision_controller.rs` edits
- `src/ai/search_backend.rs` edits
- `src/agents/neural_agent.rs` edits
- `ml/**`
- `tests/**`
- `scripts/**`
- `.github/workflows/**`
- `lab/**`
- generated outputs

## 11) Stop conditions

Stop and escalate if any of the following occur:
- any non-doc file touched
- any `src/` / `tests/` / `ml/` / `scripts/` / workflow / `lab/` change
- any routing logic change
- any direct `SearchBackend` trait dependency in active decision routing
- any `DecisionController` runtime wiring
- any neural authority expansion
- any search tuning
- any behavior change
- any benchmark/performance/readiness/scientific claim
- any PP16 implementation
- any roadmap fusion

## 12) Validation policy

Docs-safe validation only:
- `git status --porcelain`
- `git diff --name-only`
- `git diff --check`
- readback of `docs/control-plane/ENGINE_SEARCH_NEURAL_DECISION_ROUTING_CONTRACT_PLAN_V0.md`
- forbidden-surface check
- `rg` marker checks

Forbidden validation for this phase:
- no `cargo test`
- no benchmarks
- no ML/training/inference
- no GitHub Actions

## 13) Final verdicts

software_verdict: DOCS_ONLY_DECISION_ROUTING_CONTRACT_ALLOWED
evidence_verdict: PLANNING_ALIGNMENT_ONLY
claim_verdict: NO_CLAIM_ALLOWED
human_gate_required: YES
implementation_allowed_now: NO
behavior_change_allowed_now: NO
activation_allowed_now: NO
search_tuning_allowed_now: NO
pp16_allowed_now: NO
master_roadmap_fusion_allowed_now: NO
