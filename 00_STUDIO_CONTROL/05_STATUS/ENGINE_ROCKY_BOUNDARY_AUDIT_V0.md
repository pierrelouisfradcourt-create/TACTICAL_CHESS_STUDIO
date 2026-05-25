# ENGINE ROCKY BOUNDARY AUDIT V0

Status: DOCUMENTED_ONLY
Task: ENGINE-ROCKY-BOUNDARY-AUDIT-01
Created by: Codex
Created local time: 2026-05-23T23:07:43.7256124+02:00
Claim posture: NO_CLAIM_ALLOWED
HumanGate required: true

## purpose

Prepare a read-only boundary map for Engine, Rocky, Search, Neural, ActionId, LegalAction, ActionMask, DecisionController, and Chess960 before any future chess player improvement work.

This report is a routed documentation output only. It does not authorize runtime changes, tests, gameplay execution, benchmarks, training, dataset generation, model/checkpoint creation, Chess960 activation, DecisionController activation, commits, pushes, branches, pull requests, or claims.

## preflight

- current_directory: `C:\TACTICAL_CHESS_STUDIO`
- branch: `master`
- HEAD: `5e48ed310a5047eb21bd4825da858e3a08e0c950`
- initial_worktree_status: dirty, with pre-existing untracked status reports only
- actual_runtime: UNKNOWN
- runtime_status: BLOCKED for exact runtime model claim
- exact_runtime_claim: BLOCKED

Pre-existing untracked files observed before this report:

- `00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md`
- `00_STUDIO_CONTROL/05_STATUS/AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md`
- `00_STUDIO_CONTROL/05_STATUS/AUDIT_03_STUDIO_DEV_WORKBENCH_UXPILOTE_REQUIREMENTS.md`
- `00_STUDIO_CONTROL/05_STATUS/AUDIT_04_STUDIOCTL_PHASE1_TASK_CHARTER.md`
- `00_STUDIO_CONTROL/05_STATUS/LOCAL_LOGISTIC_AGENT_PIPELINE_CLOSURE_STATUS_V0.md`
- `00_STUDIO_CONTROL/05_STATUS/PIPELINE_FORMS_INTEGRATION_AUDIT_V0.md`
- `00_STUDIO_CONTROL/05_STATUS/PIPELINE_FORMS_REGISTRATION_READINESS_AUDIT_V0.md`

## source_state

Required sources:

| Source | Created | Registered | Loaded | Enforced | Evidenced |
| --- | --- | --- | --- | --- | --- |
| `AGENTS.md` | IMPLEMENTED | DOCUMENTED_ONLY | PASSIVE | PASSIVE | DOCUMENTED_ONLY |
| `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | IMPLEMENTED | DOCUMENTED_ONLY | PASSIVE | PASSIVE | DOCUMENTED_ONLY |
| `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` | IMPLEMENTED | DOCUMENTED_ONLY | PASSIVE | PASSIVE | DOCUMENTED_ONLY |
| `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | IMPLEMENTED | DOCUMENTED_ONLY | PASSIVE | PASSIVE | DOCUMENTED_ONLY |
| `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md` | IMPLEMENTED | UNKNOWN | PASSIVE | PASSIVE | DOCUMENTED_ONLY |

Optional sources loaded:

- `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_SPLIT_INVENTORY_GATE_PACKET_V0.md`
- `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`

Source-state rule preserved:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

This newly created report is created and read back only after validation. It is not registered, uploaded, promoted, or treated as active runtime truth.

## route_check

- produced_file_type: read-only boundary audit report
- intended_surface: canonical_docs
- canonical_destination: `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/ENGINE_ROCKY_BOUNDARY_AUDIT_V0.md`
- actual_destination: `00_STUDIO_CONTROL/05_STATUS/ENGINE_ROCKY_BOUNDARY_AUDIT_V0.md`
- destination_allowed: DOCUMENTED_ONLY
- registration_required: false
- project_source_upload_required: false
- promotion_gate: HumanGate

Routing note: the task listed `00_STUDIO_CONTROL/` as a broad forbidden destination while also explicitly authorizing this exact `05_STATUS` canonical destination. The Studio Output Routing Policy routes status reports to `00_STUDIO_CONTROL/05_STATUS`, so the specific target route is treated as the governing HumanGate-scoped exception for this task.

## Engine boundary findings

Status: IMPLEMENTED / TESTED / PASSIVE

Code evidence:

- `src/engine/engine.rs` defines `Engine`.
- `src/engine/engine.rs` exposes `legal_actions` and `legal_actions_for_unit`.
- `src/engine/engine.rs` owns search simulation and rollback helpers: `simulate_action_for_search`, `undo_action_for_search`, `simulate_null_move_for_search`, and `undo_null_move_for_search`.
- `src/engine` contains board, action, entity, event, and turn modules.

Test evidence:

- `src/engine/engine.rs` contains internal tests for stable legal-action order and simulate/undo restoration.
- `tests/deterministic_engine.rs`, `tests/engine_legal_action_adapter.rs`, and `tests/tactical_env_contract.rs` exist as boundary and contract tests.

Docs evidence:

- `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md` identifies `src/engine/engine.rs` as board/state/legal-action and simulate/undo authority.
- `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md` states that Engine owns the world and Rocky acts on the world.

Inference:

- Engine is implemented as the world/rules/state/legal-action surface.
- This audit did not prove full engine correctness because no runtime execution or tests were run.

## Rocky boundary findings

Status: DOCUMENTED_ONLY / PASSIVE

Code evidence:

- No `src/rocky` module was found in the static file inventory.
- Rocky is represented as a conceptual AI action layer over Engine, with active implementation surfaces spread across decision, search, neural, simulation, telemetry, and evidence paths.

Docs evidence:

- `UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md` defines Rocky as the AI action layer over Engine, composed of Neural, Search, Neural/Search fusion, and observability.
- `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md` defines Rocky observation and dataset-safety protocol, not implementation authority.

Artifacts/log/report observations:

- `docs/evidence/ROCKY_TRACE_EVIDENCE_SEED_V0` exists as a bounded trace evidence format/example set.
- Those artifacts remain observation only and are not proof of strength, readiness, benchmark value, dataset truth, or Chess960 readiness.

Inference:

- Rocky is currently a documented role/layer, not a single active code module.
- Underlying components exist, but the name Rocky should not be treated as an implemented monolithic runtime authority.

## Search authority findings

Status: IMPLEMENTED / TESTED / PASSIVE

Code evidence:

- `src/chess/search.rs` defines `RootSearchResult`, `search_best_action`, `search_root`, and `search_root_with_context`.
- `src/chess/search.rs` consumes `engine.legal_actions(player)` directly at root and recursive search surfaces.
- `src/chess/search_backend_adapter.rs` defines `PassiveSearchBackendAdapter` and `search_root_via_adapter`, wrapping current root search.
- `src/chess/decision.rs` routes `DecisionMode::Heuristic`, `DecisionMode::Neural`, `DecisionMode::Minimax`, and `DecisionMode::Hybrid` through `search_authority_trace(...)`.
- `search_authority_trace(...)` records `SelectionAuthority::Search`, `used_search: true`, and preserves `RootSearchResult`.
- `DecisionMode::Random` remains explicit fallback authority with no root search result.

Test evidence:

- `tests/decision_authority_boundary_current.rs` guards explicit selection authority, Search authority for non-random modes, no active DecisionController route, no active ActionMask search authority, no direct NeuralAgent final selection through `decision.rs`, and Random fallback.
- `tests/search_backend_passive_adapter.rs` guards adapter delegation, root result preservation, deterministic adapter selection, no engine mutation, and Search authority traces for Minimax, Heuristic, Hybrid, and Neural modes.
- `tests/search_backend_boundary.rs` guards passive `SearchBackend` contract behavior.

Docs evidence:

- AGENTS.md and Studio docs state Search remains final authority and Neural proposes/reranks only.
- Current static code evidence supports Search authority for non-random decision modes in `src/chess/decision.rs`.

Inference:

- Search is the implemented tactical decision authority for active non-random decision modes observed in `decision.rs`.
- Random remains fallback, not Search.
- This audit does not claim global gameplay readiness or strength.

## Neural authority findings

Status: IMPLEMENTED / TESTED / PASSIVE

Code evidence:

- `src/agents/neural_agent.rs` defines `NeuralAgent` and `select_action`.
- Extracted neural support modules exist: `neural_bridge`, `neural_config`, `neural_context`, `neural_fallback`, `neural_legal`, `neural_protocol`, `neural_selection`, and `neural_telemetry`.
- `src/ai/policy_guide.rs` defines passive `NeuralProposal` / policy guide surfaces whose methods return false for runtime authority, final authority, dataset admissibility, label truth, training readiness, and action-mask authority.
- `src/chess/decision.rs` does not import or call `NeuralAgent`, `choose_neural`, `agent.select_action`, `NeuralProposal`, or `PolicyGuideCandidate`.

Test evidence:

- `tests/neural_policy_guide_passive_adapter.rs` guards passive proposal posture and verifies policy guide surfaces do not activate NeuralAgent, Python bridge, SearchBackend, ActionMask, or DecisionController.
- `tests/neural_agent_selection_boundary_current.rs` exists and characterizes current neural agent selection boundary.
- `tests/decision_authority_boundary_current.rs` guards that `DecisionMode::Neural` routes through Search authority in `decision.rs`.

Inference:

- Neural implementation exists, but code evidence from active `decision.rs` does not support Neural as final tactical authority.
- Neural surfaces are implemented/proposal-capable and include active agent code, but their authority is bounded by Search-authority routing in the inspected decision layer.

## ActionId findings

Status: IMPLEMENTED / TESTED / PASSIVE

Code evidence:

- `src/core/action_id.rs` defines `ActionId` and `ACTION_ID_VERSION = "action_id_v0"`.
- `ActionId::from_normalized_key` normalizes action keys through `normalize_action_key`.
- `src/core/mod.rs` exports `ActionId` and `ACTION_ID_VERSION`.

Test evidence:

- `tests/legal_action_adapter.rs`, `tests/search_backend_boundary.rs`, `tests/policy_guide_boundary.rs`, `tests/tactical_env_contract.rs`, and related tests use `ActionId` as stable identity.

Limit:

- This audit did not verify version governance beyond static code existence and existing tests.

## LegalAction findings

Status: IMPLEMENTED / TESTED / PASSIVE

Code evidence:

- `src/core/legal_action.rs` defines `LegalAction` and `LEGAL_ACTION_VERSION = "legal_action_v0"`.
- `LegalAction::from_action_key` derives `ActionId` and canonical `action_key` from normalized input.
- `sort_legal_actions_by_key` and `duplicate_legal_action_ids` exist.
- `src/chess/legal_action_adapter.rs` maps engine `Action` values into `LegalAction` and `ActionId`.

Test evidence:

- `tests/legal_action_adapter.rs` checks normalization, deterministic sorting, duplicate detection, debug fallback handling, helper encodability, and repeated-call stability.
- `tests/engine_legal_action_adapter.rs` exists for engine integration boundary.

Limit:

- LegalAction is implemented as an adapter/identity surface; it is not evidence of dataset-label authorization.

## ActionMask findings

Status: IMPLEMENTED / TESTED / PASSIVE

Code evidence:

- `src/core/action_mask.rs` defines `ActionMask`, `ActionMaskError`, and `ACTION_MASK_VERSION = "action_mask_v0_skeleton"`.
- `ActionMask::from_legal_actions` builds masks from `LegalAction` inputs, detects duplicate ActionIds, stores policy-index projections, tracks unencodable actions, and carries optional move-vocab fingerprint.
- `to_policy_bitvec` fails closed on out-of-bounds policy indices.
- `src/chess/legal_action_adapter.rs` can build an ActionMask from engine legal actions.

Test evidence:

- `tests/action_mask.rs` checks deterministic order, duplicate fail-closed behavior, projection, unencodable actions, policy bitvec output, promotion/castling key distinction, and no dataset/training/Chess960 activation without projection.
- `tests/decision_authority_boundary_current.rs` guards that active search does not consume ActionMask as authority.

Limit:

- ActionMask exists and is tested as a skeleton/helper, but active Search still consumes engine legal actions directly.
- ActionMask is not active tactical authority and does not authorize dataset labels or training.

## DecisionController status

Status: IMPLEMENTED / TESTED / PASSIVE

Code evidence:

- `src/ai/decision_controller.rs` defines `DecisionController`, `DecisionRequest`, `DecisionChoice`, and `DecisionControllerInput`.
- `src/ai/mod.rs` exports the DecisionController types.
- `src/chess/decision.rs` does not import or invoke DecisionController.

Test evidence:

- `tests/decision_controller_boundary.rs` validates passive controller types and policy-result-only fallback behavior.
- `tests/decision_authority_boundary_current.rs` and `tests/search_backend_passive_adapter.rs` guard that the active decision route does not activate DecisionController.

Conclusion:

- DecisionController is implemented as a passive contract surface.
- DecisionController activation is BLOCKED.

## Chess960 status

Status: IMPLEMENTED / TESTED / BLOCKED

Code evidence:

- `src/chess/chess960.rs` implements setup/back-rank helpers such as `generate_start_position`, `mirror_black_backrank_if_needed`, `validate_backrank`, bishop color validation, and king-between-rooks validation.
- `src/chess/chess_variant.rs` includes a `Chess960 { id: u16 }` variant.
- `src/prototype/minimal_ruleset.rs` includes `minimal_runtime_ruleset_chess960`.

Test evidence:

- `src/chess/chess960.rs` contains internal tests for 960 unique valid backranks, bishop colors, king-between-rooks, mirroring, out-of-range rejection, and representative IDs.
- `src/prototype/minimal_ruleset.rs` contains internal tests for passive opt-in factory behavior and standard-default separation.
- `src/chess/fen.rs` contains a fail-closed test for Chess960 backrank with classical castling rights.
- Python vocabulary tests explicitly avoid Chess960 claims.

Docs evidence:

- Chess960 docs in `docs/control-plane` and evidence contracts repeatedly mark Chess960 runtime/data/training/readiness claims as blocked.
- `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md` says Chess960 readiness depends on decomposition stability and explicit metadata.

Conclusion:

- Chess960 setup/factory surfaces are implemented and tested in limited/passive contexts.
- Chess960 runtime activation, evidence activation, dataset use, training use, and readiness claims remain BLOCKED.

## tests evidence

Static test files observed for legal move/action/search/neural boundaries include:

- `tests/action_mask.rs`
- `tests/action_mask_provenance.rs`
- `tests/action_submission.rs`
- `tests/deterministic_engine.rs`
- `tests/engine_legal_action_adapter.rs`
- `tests/legal_action_adapter.rs`
- `tests/decision_authority_boundary_current.rs`
- `tests/decision_controller_boundary.rs`
- `tests/decision_controller_passive_adapter.rs`
- `tests/search_backend_boundary.rs`
- `tests/search_backend_passive_adapter.rs`
- `tests/neural_agent_selection_boundary_current.rs`
- `tests/neural_policy_guide_passive_adapter.rs`
- `tests/observation_boundary_current.rs`
- `tests/observation_view.rs`
- `tests/passive_alphastar_pipeline.rs`
- `tests/policy_guide_boundary.rs`
- `tests/tactical_env_contract.rs`
- `tests/telemetry_prep.rs`

Validation limit: this audit did not run tests. Test evidence is file and source readback evidence only.

## docs-only claims

Docs-only claims observed:

- Engine owns world/state/rules/legal actions.
- Rocky acts over Engine and is composed of Neural, Search, fusion, and observability.
- Search remains final tactical authority.
- Neural proposes/reranks and does not decide alone.
- DecisionController activation is blocked.
- Chess960 activation is blocked.
- Dataset labels require ActionId, LegalAction, ActionMask, provenance, and HumanGate.
- Reports, logs, traces, benchmarks, and latest manifests are not proof by default.

These claims are documentation posture unless supported by active code/test evidence above.

## unknowns

- Full runtime call graph outside the statically inspected decision/search/neural surfaces remains UNKNOWN because no runtime execution or full static call analysis was performed.
- Whether all downstream CLI/simulation paths are fully aligned with the current Search-authority doctrine remains UNKNOWN from this audit; `src/tool/cli.rs` and `src/simulation/simulation_runner.rs` reference `NeuralAgent`.
- Current CI status is UNKNOWN.
- Current benchmark/performance status is BLOCKED, not inspected.
- Project source upload state is UNKNOWN.
- Full source registry coverage for `UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md` is UNKNOWN.

## blocked claims

- No Elo, strength, benchmark, scientific, promotion, readiness, model, dataset, or product claim is allowed.
- No global ready/not-ready verdict is allowed.
- No Chess960 readiness or Rocky Chess960 readiness claim is allowed.
- No DecisionController activation claim is allowed.
- No ActionMask authority or dataset-label authority claim is allowed.
- No exact Codex runtime model claim is allowed.

## recommended next tasks

1. Run a targeted read-only call-graph audit for `NeuralAgent` references in CLI and simulation paths, with no runtime execution.
2. Run a targeted docs-only drift audit between `ROCKY_OBSERVATION_PROTOCOL_V0.md` older routing snapshot and current `decision.rs` Search-authority routing.
3. Run targeted tests later only under explicit HumanGate authorization: decision authority, search backend adapter, legal action adapter, action mask, and passive policy guide.
4. Prepare a HumanGate decision packet before any Chess960, DecisionController, ActionMask authority, dataset, training, or runtime-route changes.

## status_by_surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Read-only static inspection only; no code changed. |
| tests | PASSIVE | Test files read; no tests changed or run. |
| artifacts_runtime_outputs | PASSIVE | Existing evidence/docs observed only; no runtime outputs generated. |
| canonical_docs | DOCUMENTED_ONLY | This routed report was created under `05_STATUS`. |
| roadmap_docs_only | PASSIVE | Roadmap docs read as planning context only. |
| inference | PASSIVE | Inferences are explicitly separated from code/test/doc evidence. |
| scripts_tooling | PASSIVE | No script files changed or executed. |
| secrets | BLOCKED | Secret paths and `.env` files were not inspected. |

## software_verdict

| Surface | Verdict |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | PASSIVE |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |

## evidence_verdict

| Surface | Verdict |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | PASSIVE |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |

Evidence supports a bounded static boundary map only. It does not support runtime readiness, performance, strength, dataset, model, promotion, or activation claims.

## claim_verdict

NO_CLAIM_ALLOWED

## no_global_ready_verdict

true
