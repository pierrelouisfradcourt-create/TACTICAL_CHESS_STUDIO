# ALPHASTAR_LIKE_PASSIVE_BOUNDARY_TRACEABILITY_V0

## Scope

This document is a docs-only traceability map for current local passive AlphaStar-like boundaries.
It is not runtime authority and does not authorize gameplay, dataset generation, training, benchmark, Chess960 activation, general SearchBackend runtime replacement beyond the current adapter boundary, DecisionController activation, agent activation, readiness claims, benchmark proof, model promotion, or publication claims.

## Passive Boundary Inventory

| Boundary | Implementation Status | Evidence Status | Authority Status | Traceability |
| --- | --- | --- | --- | --- |
| ObservationView | IMPLEMENTED | TESTED | PASSIVE | `ObservationView` carries `DatasetAdmissibility::RequiresHumanGate` and `ActionMaskAuthority::NotAuthoritative`; tests keep observation metadata non-authoritative. |
| ObservationEncoder | IMPLEMENTED | TESTED | PASSIVE | `ObservationEncoder` and `EncodedObservation` return `PassiveOnly`, require HumanGate, and cannot drive runtime. |
| ActionSubmission / StepResult | IMPLEMENTED | TESTED | PASSIVE | `ActionSubmission` and `StepResult` preserve action/result metadata without legality authority, ActionMask authority, dataset admissibility, or training readiness. |
| DatasetAdmissionCandidate | IMPLEMENTED | TESTED | PASSIVE | `DatasetAdmissionCandidate` defaults to `BlockedRequiresHumanGate`, `dataset_admissible: false`, label truth not established, and no training/benchmark/model-promotion flags. |
| EpisodeTraceCandidate / EpisodeStepRecord | IMPLEMENTED | TESTED | PASSIVE | `EpisodeTraceCandidate` and `EpisodeStepRecord` preserve passive replay metadata while blocking replay admission, dataset admission, label truth, runtime authority, runtime outputs, training, benchmark, and model promotion. |
| LegalAction / ActionId | IMPLEMENTED | TESTED | PASSIVE | `ActionId` normalizes stable identity; `LegalAction` maps action keys to identity and duplicate detection without becoming runtime authority. |
| ActionMask provenance | IMPLEMENTED | TESTED | PASSIVE | `ActionMask` and `ActionMaskProvenance` snapshot policy projection metadata, vocab fingerprint, legal source, ruleset, variant, diagnostics, and HumanGate state while `blocks_dataset_use()` remains true. |
| HumanGate | IMPLEMENTED | TESTED | PASSIVE | `HumanGateAuthorization` records human decisions and scopes; wrong scope, false authorization, reject/defer/revoke, observation-only, dataset-candidate-only, Chess960, training, and claim scopes remain fail-closed for downstream use. |
| Decision authority trace | IMPLEMENTED | TESTED | PASSIVE | `DecisionTrace` records `SelectionAuthority`; current boundary tests keep `DecisionMode::Heuristic`, `DecisionMode::Neural`, `DecisionMode::Minimax`, and `DecisionMode::Hybrid` under `SelectionAuthority::Search`, keep Random as Fallback, preserve `RootSearchResult`, route through `search_root_via_adapter`, and keep ActionMask out of active search authority. |
| Neural split modules | IMPLEMENTED | TESTED | PASSIVE | `neural_bridge`, `neural_config`, `neural_context`, `neural_fallback`, `neural_legal`, `neural_protocol`, `neural_selection`, and `neural_telemetry` are extracted support modules; final active selection remains owned by `NeuralAgent::select_action`. |

## Explicit Blocked Items

| Item | Status | Notes |
| --- | --- | --- |
| Active Search wiring to ObservationView / ObservationEncoder | BLOCKED | Search still uses current direct engine paths unless separately changed. |
| Active Neural wiring to ObservationView / ObservationEncoder | BLOCKED | Neural still uses current direct engine/FEN/legal-action paths unless separately changed. |
| Active Engine wiring to ObservationView / ObservationEncoder | BLOCKED | Passive observation contracts are not engine runtime authority. |
| Active TacticalEnv wiring to ObservationView / ObservationEncoder | BLOCKED | Existing environment boundaries remain observation-only unless separately changed. |
| ActionMask authority | BLOCKED | ActionMask and provenance are metadata/projection boundaries, not final decision authority. |
| dataset admission | BLOCKED | DatasetAdmissionCandidate is a blocked candidate contract only. |
| label truth | BLOCKED | Selected move, Search best move, Neural predicted move, and ActionMask projection do not establish label truth. |
| training readiness | BLOCKED | Passive contracts carry no training admission. |
| benchmark proof | BLOCKED | Runtime outputs and tests here are not benchmark proof. |
| model promotion | BLOCKED | No passive boundary promotes a model. |
| self-play / league | BLOCKED | No self-play or league activation is authorized by this map. |
| Chess960 activation | BLOCKED | Chess960 activation remains outside this passive traceability map. |

## Current Runtime Truth

| Runtime Surface | Status | Current Truth |
| --- | --- | --- |
| Search authority route | IMPLEMENTED | `DecisionMode::Heuristic`, `DecisionMode::Neural`, `DecisionMode::Minimax`, and `DecisionMode::Hybrid` route through `search_authority_trace(...)` to `search_root_via_adapter(...)` / `PassiveSearchBackendAdapter`; `DecisionTrace` stores `RootSearchResult` and records `SelectionAuthority::Search`. |
| Random fallback route | IMPLEMENTED | `DecisionMode::Random` uses the fallback legal-action route, records `SelectionAuthority::Fallback`, does not use Search, and does not attach `RootSearchResult`. |
| Search engine legality source | IMPLEMENTED | Active search currently consumes `Engine` and `engine.legal_actions(...)` directly; ObservationView, ObservationEncoder, and ActionMask are not active Search authority inputs. |
| Neural direct path | PASSIVE | `NeuralAgent` and `NeuralAgent::select_action` still exist, but `NeuralAgent::select_action` is no longer reached as final authority through `decision.rs`. |
| PolicyGuide / NeuralProposal | PASSIVE | `PolicyGuide` / `NeuralProposal` remain proposal-only and cannot drive runtime, become final authority, establish label truth, grant dataset admissibility, imply training readiness, or grant ActionMask authority. |
| Passive contracts | PASSIVE | ObservationView, ObservationEncoder, ActionSubmission, StepResult, DatasetAdmissionCandidate, EpisodeTraceCandidate, EpisodeStepRecord, LegalAction, ActionId, ActionMask provenance, HumanGate, DecisionController, and PolicyGuide are not final runtime authority. |
| Runtime outputs | PASSIVE | Runtime logs, traces, counters, or lab outputs are not readiness, label truth, benchmark proof, dataset admission, or model promotion evidence. |

## Daily Push Policy

| Policy Item | Status | Rule |
| --- | --- | --- |
| Local commits | IMPLEMENTED | Local commits are allowed for reviewed scoped changes. |
| Remote push | BLOCKED | Remote push is daily backup only and requires explicit HumanGate approval. |
| Backup push | PASSIVE | A backup push is not promotion, readiness, benchmark proof, dataset admission, label truth, or model validation. |
| Branch or PR creation | BLOCKED | Branch creation, PR creation, and ready-for-review state require separate explicit HumanGate approval. |

## Evidence Map

| Evidence | Status | Coverage |
| --- | --- | --- |
| `tests/observation_view.rs` | TESTED | ObservationView and ObservationEncoder passive contracts. |
| `tests/action_submission.rs` | TESTED | ActionSubmission and StepResult passive metadata boundaries. |
| `tests/dataset_admission.rs` | TESTED | DatasetAdmissionCandidate blocked defaults, provenance, no label truth, no dataset admission, no training/benchmark/model promotion. |
| `tests/episode_trace.rs` | TESTED | EpisodeTraceCandidate and EpisodeStepRecord blocked defaults, provenance, no label truth, no runtime authority, no runtime outputs, no promotion claims. |
| `tests/action_mask_provenance.rs` | TESTED | ActionMask provenance metadata, HumanGate state, fail-closed dataset-use posture. |
| `tests/decision_authority_boundary_current.rs` | TESTED | Current Decision authority trace: Heuristic, Neural, Minimax, and Hybrid route through Search authority; Random remains Fallback; DecisionController and ActionMask remain passive. |
| `tests/search_backend_passive_adapter.rs` | TESTED | SearchBackend adapter boundary, `search_root_via_adapter`, `RootSearchResult` preservation in DecisionTrace, and Random Fallback trace. |
| `tests/neural_policy_guide_passive_adapter.rs` | TESTED | NeuralProposal / PolicyGuide passive posture: no runtime authority, no label truth, no dataset/training readiness, no ActionMask authority. |
| `tests/neural_agent_selection_boundary_current.rs` | TESTED | Neural split module extraction while final selection remains in NeuralAgent. |

## Verdicts

| Verdict | Status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | TESTED |
| outputs_runtime_artifacts | NOT_FOUND |
| canonical_docs | IMPLEMENTED |
| roadmap_docs_only | DOCUMENTED_ONLY |
| inference | PASSIVE |

## Claim Posture

- claim_verdict: NO_CLAIM_ALLOWED
- claim_posture: NO_CLAIM_ALLOWED
