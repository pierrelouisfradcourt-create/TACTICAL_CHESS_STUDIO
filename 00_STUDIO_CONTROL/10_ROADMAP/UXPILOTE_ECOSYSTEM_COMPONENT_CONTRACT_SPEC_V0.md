# UxPilote Ecosystem Component Contract Specification V0

Status: DOCUMENTED_ONLY
Surface: roadmap_docs_only
Runtime authority: NONE
Agent activation: BLOCKED
Prototype implementation: BLOCKED
Frontend/backend code: BLOCKED
Hardware/power control: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

---

## 1. Header

```yaml
title: "UxPilote Ecosystem Component Contract Specification V0"
status: DOCUMENTED_ONLY
surface: roadmap_docs_only
runtime_authority: NONE
agent_activation: BLOCKED
prototype_implementation: BLOCKED
frontend_backend_code: BLOCKED
hardware_power_control: BLOCKED
claim_posture: NO_CLAIM_ALLOWED
```

This document is a roadmap-only component contract. It defines passive UI/component contracts and emitted intent boundaries only. It does not authorize implementation, prototype files, frontend code, backend code, runtime behavior, agent activation, hardware control, process control, Git actions, or claims.

## 2. Purpose

This specification defines the component-level contract for the planned UxPilote ecosystem screens, shell components, passive audit roles, read-only data objects, and read-only adapters.

It answers:

- which named components exist in the roadmap UX.
- what each component may display.
- what each component may emit as passive or candidate intent.
- which emitted intents are forbidden everywhere.
- how HumanGate remains the final authority before mutation, activation, promotion, claims, costly runs, and Git actions.

This document is not executable. It is not an API contract, schema implementation, UI implementation, adapter implementation, agent activation record, or runtime permission grant.

## 3. Source And Routing Posture

Source-state separation remains mandatory:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

Routing posture:

```yaml
produced_file_type: "UxPilote ecosystem component contract specification"
intended_surface: roadmap_docs_only
canonical_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_ECOSYSTEM_COMPONENT_CONTRACT_SPEC_V0.md"
registration_required: false
project_source_upload_required: false
promotion_gate: HumanGate
```

This contract may be read as roadmap evidence only. It must not be treated as loaded active runtime truth, implementation evidence, source registration, or execution authority.

## 4. Component Contract Principles

- Components display source-state before claims.
- Components emit intent, not execution.
- Components separate evidence, route, cost, and HumanGate state.
- Components preserve surface separation: active_runtime_code, tests, artifacts_runtime_outputs, canonical_docs, roadmap_docs_only, and inference.
- Components must not emit forbidden intents.
- Components must not hide mutation behind navigation, preview, summary, suggestion, or event display.
- Components must not include run-all, execute-all, validate-all, train-all, benchmark-all, or activate-all behavior.
- Components must keep Patch Lab candidate-only.
- Components must keep LLM Link Layer passive-only.
- Components must keep Cost / Heat / Energy observation-only.
- HumanGate remains final for bounded next-step decisions.

## 5. Component Categories

| Category | Named components | Default authority | Mutation |
| --- | --- | --- | --- |
| Global shell | Global Shell, Top Bar, Left Navigation, Ecosystem Canvas, Right Inspector, HumanGate Action Strip | PASSIVE | BLOCKED |
| Screens | Ecosystem Map, Chain Builder, Zone Inspector, Evidence Board, Patch Lab, Cost / Heat / Energy, Source Registry, HumanGate, LLM Link Layer, Event / Evidence Tray | PASSIVE or candidate-only | BLOCKED |
| Passive audit roles | Fragmented Audit Pipeline, Cartographer, HygieneAgent, TruthAgent, FusionAuditor, CartographerRedTeam | PASSIVE | BLOCKED |
| Data object components | ecosystem_node, zone, surface, source_state, chain_candidate, output_route, evidence_packet, patch_plan_candidate, human_gate_decision, cost_signal, blocked_action, uxpilote_view_state | PASSIVE design object | BLOCKED |
| Read-only adapters | file_tree_adapter, git_status_adapter, source_index_adapter, source_anchoring_adapter, output_routing_adapter, autodev_template_adapter, executor_report_adapter, analysis_record_adapter, cost_signal_adapter, llm_link_adapter | PASSIVE read-only | BLOCKED |

## 6. Named Component Registry

Every named component below is in scope for this contract.

| Component | Component type | May display | May emit |
| --- | --- | --- | --- |
| Global Shell | shell | shared workspace, repo, source-state, HumanGate, evidence, cost, runtime, and agent lock indicators | `open_screen`, `select_context`, `open_event_tray` |
| Top Bar | shell | workspace, repo, active chain id, source-state, HumanGate status, evidence level, cost guard, runtime authority, agent activation status | `open_source_registry`, `open_humangate_packet`, `open_cost_guard_view` |
| Left Navigation | shell | screen list and current screen | `open_screen` |
| Ecosystem Canvas | shell | read-only map or selected workspace | `select_node`, `open_zone_inspector`, `open_evidence_packet_view` |
| Right Inspector | shell | selected node, source state, routing, evidence, risks, blocked actions, HumanGate requirement | `select_node`, `draft_chain_candidate`, `open_source_registry` |
| HumanGate Action Strip | shell | bounded decision controls and expiry | `open_humangate_packet`, `request_revision`, `block_next_step`, `defer_next_step`, `deny_activation`, `approve_one_bounded_next_step` |
| Ecosystem Map | screen | zones, nodes, overlays, blocked/unknown signals | `select_node`, `open_zone_inspector`, `draft_chain_candidate` |
| Chain Builder | screen | chain grammar, route panel, cost guard, blocked actions, preview | `draft_chain_candidate`, `validate_chain_candidate`, `send_to_fragmented_audit_pipeline` |
| Zone Inspector | screen | selected node details, source state, evidence, routing, risks | `draft_chain_candidate`, `open_evidence_packet_view`, `open_route_check_view` |
| Evidence Board | screen | software/evidence/claim verdicts by surface, unknowns, conflicts | `open_evidence_packet_view`, `mark_unknown`, `request_revision` |
| Patch Lab | screen | target files, non-goals, allowed/blocked actions, validation, output routing | `create_task_charter_candidate`, `create_patch_plan_candidate`, `create_validation_plan_candidate` |
| Cost / Heat / Energy | screen | observed or estimated cost, CPU/GPU pressure, memory, time, runaway-loop risk, cost guard | `open_cost_guard_view`, `set_candidate_cost_guard`, `request_revision` |
| Source Registry | screen | created, registered, loaded, enforced, evidenced, stale/unknown flags | `request_source_readback`, `mark_source_unknown`, `open_route_check_view` |
| HumanGate | screen | evidence packet, route check, red-team objections, cost guard, exact files, expiry | `approve_one_bounded_next_step`, `block_next_step`, `request_revision`, `deny_activation`, `defer_next_step` |
| LLM Link Layer | screen | passive labels, summaries, options, ambiguity flags | `suggest_label`, `suggest_summary`, `suggest_chain_draft`, `flag_ambiguity` |
| Event / Evidence Tray | screen | latest readback, validation, blocked action, route check, HumanGate decision, report links | `open_readback_view`, `open_validation_view`, `open_blocked_action_view`, `open_route_check_view`, `open_humangate_packet` |
| Fragmented Audit Pipeline | passive audit lane | staged Cartographer, HygieneAgent, TruthAgent, FusionAuditor, RedTeam, HumanGate review state | `map_chain_candidate`, `check_chain_hygiene`, `qualify_truth_packet`, `merge_audit_packet`, `challenge_audit_packet`, `open_humangate_packet` |
| Cartographer | passive audit role | chain map, surface map, route requirement, missing sources | `map_chain_candidate`, `flag_missing_source`, `flag_route_requirement` |
| HygieneAgent | passive audit role | missing fields, invalid statuses, blocked actions, routing findings | `check_chain_hygiene`, `flag_invalid_status`, `flag_blocked_action`, `flag_route_conflict` |
| TruthAgent | passive audit role | knowns, unknowns, blocked claims, evidence limits, drift candidates | `qualify_truth_packet`, `mark_unknown`, `flag_evidence_conflict`, `flag_blocked_claim` |
| FusionAuditor | passive audit role | fusion packet, status by surface, unresolved risks, bounded next-step candidate | `merge_audit_packet`, `prepare_bounded_next_step_candidate`, `flag_unresolved_risk` |
| CartographerRedTeam | passive audit role | objections, missing triggers, hidden activation risk, bad route risk | `challenge_audit_packet`, `flag_hidden_activation`, `flag_route_conflict`, `request_revision` |
| ecosystem_node | data object | id, label, node type, zone, surface, path, evidence refs, route refs, risk refs | `select_node` |
| zone | data object | zone id, visible meaning, allowed inputs, blocked actions, HumanGate conditions | `select_zone` |
| surface | data object | surface name, status, software/evidence/claim verdicts | `select_surface`, `open_evidence_packet_view` |
| source_state | data object | created, registered, loaded, enforced, evidenced | `request_source_readback`, `mark_source_unknown` |
| chain_candidate | data object | chain type, zone, subzone, action mode, authority, Qui, Quoi, Quand, Comment, Ou, Pourquoi | `validate_chain_candidate`, `send_to_fragmented_audit_pipeline` |
| output_route | data object | produced file type, surface, destination, forbidden destinations, registration requirement, promotion gate | `open_route_check_view`, `flag_route_conflict` |
| evidence_packet | data object | source refs, readback refs, validation refs, claim limits, unknowns | `open_evidence_packet_view`, `flag_evidence_conflict` |
| patch_plan_candidate | data object | target files, non-goals, allowed actions, blocked actions, validation plan, output routing | `create_task_charter_candidate`, `request_revision` |
| human_gate_decision | data object | decision, exact scope, expiry, one-step boundary, preserved blocked actions | `open_humangate_packet` |
| cost_signal | data object | observed cost, estimated cost, CPU/GPU pressure, memory pressure, time cost, guard state | `open_cost_guard_view`, `set_candidate_cost_guard` |
| blocked_action | data object | action, surface, reason, required HumanGate condition | `open_blocked_action_view`, `request_revision` |
| uxpilote_view_state | data object | active view, selected node, chain state, evidence state, route state, runtime lock, agent lock | `open_screen`, `select_context` |
| file_tree_adapter | read-only adapter | file tree references only | `request_source_readback` |
| git_status_adapter | read-only adapter | branch, HEAD, worktree status references only | `request_source_readback` |
| source_index_adapter | read-only adapter | source index references only | `request_source_readback`, `mark_source_unknown` |
| source_anchoring_adapter | read-only adapter | source anchoring posture only | `request_source_readback`, `mark_source_unknown` |
| output_routing_adapter | read-only adapter | output routing policy references only | `open_route_check_view`, `flag_route_conflict` |
| autodev_template_adapter | read-only adapter | task charter, executor report, analysis record template references only | `request_source_readback` |
| executor_report_adapter | read-only adapter | executor report references only | `open_evidence_packet_view`, `open_validation_view` |
| analysis_record_adapter | read-only adapter | analysis record references only | `open_evidence_packet_view` |
| cost_signal_adapter | read-only adapter | passive cost or estimate references only | `open_cost_guard_view` |
| llm_link_adapter | read-only adapter | passive suggestion context only | `suggest_label`, `suggest_summary`, `suggest_chain_draft`, `flag_ambiguity` |

## 7. Emitted Intent Vocabulary

Allowed emitted intents are passive, candidate-only, or HumanGate decision intents:

```yaml
emitted_intent_vocabulary:
  passive_navigation:
    - open_screen
    - select_context
    - select_node
    - select_zone
    - select_surface
    - open_zone_inspector
    - open_event_tray
  source_and_route:
    - request_source_readback
    - mark_source_unknown
    - open_source_registry
    - open_route_check_view
    - flag_route_requirement
    - flag_route_conflict
  evidence:
    - open_evidence_packet_view
    - open_readback_view
    - open_validation_view
    - open_blocked_action_view
    - mark_unknown
    - flag_evidence_conflict
    - flag_blocked_claim
  chain_candidate:
    - draft_chain_candidate
    - validate_chain_candidate
    - send_to_fragmented_audit_pipeline
    - map_chain_candidate
    - check_chain_hygiene
    - qualify_truth_packet
    - merge_audit_packet
    - challenge_audit_packet
    - prepare_bounded_next_step_candidate
  patch_lab_candidate:
    - create_task_charter_candidate
    - create_patch_plan_candidate
    - create_validation_plan_candidate
  cost:
    - open_cost_guard_view
    - set_candidate_cost_guard
  llm_passive:
    - suggest_label
    - suggest_summary
    - suggest_chain_draft
    - flag_ambiguity
  humangate_decision:
    - open_humangate_packet
    - approve_one_bounded_next_step
    - block_next_step
    - request_revision
    - deny_activation
    - defer_next_step
  risk:
    - flag_missing_source
    - flag_invalid_status
    - flag_blocked_action
    - flag_hidden_activation
    - flag_unresolved_risk
```

Allowed emitted intents do not execute. They create UI state, candidate state, review state, or HumanGate decision state only.

## 8. Forbidden Emitted Intent Vocabulary

Forbidden emitted intents are blocked for every component:

```yaml
forbidden_emitted_intent_vocabulary:
  runtime_and_execution:
    - execute_runtime
    - run_runtime_command
    - run_all
    - execute_chain
    - execute_candidate
    - start_process
    - terminate_process
  implementation:
    - mutate_file
    - write_file
    - patch_code
    - create_implementation_file
    - create_frontend_file
    - create_backend_file
    - create_ui_prototype_file
  validation_execution:
    - run_tests
    - run_ci
    - run_benchmark
  agent_and_authority:
    - activate_agent
    - activate_decision_controller
    - activate_chess960
    - change_neural_search_authority
    - grant_final_llm_authority
  data_model_artifacts:
    - generate_dataset
    - reset_dataset
    - create_model
    - create_checkpoint
    - promote_model
    - promote_checkpoint
    - create_latest_json
    - create_lab_run
  hardware_power_process:
    - control_hardware
    - control_power
    - change_system_settings
  git:
    - git_commit
    - git_push
    - git_branch_create
    - git_pull_request_create
  claims:
    - emit_global_ready_verdict
    - emit_global_not_ready_verdict
    - promote_claim
    - treat_log_as_proof
```

No component may emit any forbidden intent.

## 9. Emission Rules

1. A component may emit only intents listed in the allowed emitted intent vocabulary.
2. A component must emit candidate or passive intent only unless it is HumanGate emitting a bounded decision state.
3. `approve_one_bounded_next_step` records a bounded HumanGate decision only; it does not execute the step.
4. Any intent that would require file mutation, runtime execution, tests, CI, training, benchmark, dataset/model work, hardware/power/process control, Git action, or claim promotion must be blocked before emission.
5. LLM-derived intents must remain suggestions until accepted, edited, or rejected by the user; acceptance creates candidate text only.
6. Patch Lab emitted intents may create task-charter, patch-plan, or validation-plan candidates only.
7. Cost / Heat / Energy emitted intents may display or set candidate cost guard state only.

## 10. Screen Component Contracts

| Screen | Required contract | Allowed emitted intent families | Forbidden emitted intent result |
| --- | --- | --- | --- |
| Ecosystem Map | Orient and select read-only nodes. | passive_navigation, evidence, chain_candidate | BLOCKED |
| Chain Builder | Draft and validate chain candidates. | chain_candidate, source_and_route, cost | BLOCKED |
| Zone Inspector | Inspect one selected node or zone. | passive_navigation, evidence, source_and_route, chain_candidate | BLOCKED |
| Evidence Board | Review evidence by surface. | evidence, source_and_route, humangate_decision via open only | BLOCKED |
| Patch Lab | Generate candidates only. | patch_lab_candidate, source_and_route, humangate_decision via open only | BLOCKED |
| Cost / Heat / Energy | Display observation-only cost signals. | cost, humangate_decision via open only | BLOCKED |
| Source Registry | Display source-state and request readback. | source_and_route, evidence | BLOCKED |
| HumanGate | Record one bounded decision state. | humangate_decision, evidence, source_and_route | BLOCKED |
| LLM Link Layer | Suggest passive labels, summaries, and draft fields. | llm_passive | BLOCKED |
| Event / Evidence Tray | Display latest passive evidence events. | evidence, source_and_route, humangate_decision via open only | BLOCKED |

## 11. Global Shell Component Contracts

| Component | Required contract | Allowed emitted intents |
| --- | --- | --- |
| Global Shell | Preserve global lock visibility and route the user between passive screens. | `open_screen`, `select_context`, `open_event_tray` |
| Top Bar | Display source, evidence, HumanGate, runtime, cost, and agent posture. | `open_source_registry`, `open_humangate_packet`, `open_cost_guard_view` |
| Left Navigation | Switch visible screen only. | `open_screen` |
| Ecosystem Canvas | Display read-only map or selected workspace. | `select_node`, `open_zone_inspector`, `open_evidence_packet_view` |
| Right Inspector | Display selected-node detail and passive chain entry points. | `select_node`, `draft_chain_candidate`, `open_source_registry` |
| HumanGate Action Strip | Display bounded HumanGate options without execution. | `open_humangate_packet`, `request_revision`, `block_next_step`, `defer_next_step`, `deny_activation`, `approve_one_bounded_next_step` |

## 12. Passive Audit Role Contracts

| Role | Required contract | Allowed emitted intents | Forbidden authority |
| --- | --- | --- | --- |
| Fragmented Audit Pipeline | Coordinate passive staged review only. | `map_chain_candidate`, `check_chain_hygiene`, `qualify_truth_packet`, `merge_audit_packet`, `challenge_audit_packet`, `open_humangate_packet` | execution, mutation, activation, claim approval |
| Cartographer | Map chain candidate to zone, surface, route, and missing sources. | `map_chain_candidate`, `flag_missing_source`, `flag_route_requirement` | execution, mutation, truth decision |
| HygieneAgent | Check required fields, statuses, routes, and blocked actions. | `check_chain_hygiene`, `flag_invalid_status`, `flag_blocked_action`, `flag_route_conflict` | repair by mutation, execution |
| TruthAgent | Separate evidence, claim, unknown, and blocked surfaces. | `qualify_truth_packet`, `mark_unknown`, `flag_evidence_conflict`, `flag_blocked_claim` | claim promotion, mutation |
| FusionAuditor | Merge audit outputs into a bounded next-step candidate. | `merge_audit_packet`, `prepare_bounded_next_step_candidate`, `flag_unresolved_risk` | final approval, execution |
| CartographerRedTeam | Challenge hidden activation, bad route, missing surfaces, and unsupported claims. | `challenge_audit_packet`, `flag_hidden_activation`, `flag_route_conflict`, `request_revision` | HumanGate replacement, execution |

## 13. Data Object Component Contracts

Data object components are design targets only. They are not executable schemas.

| Data object | Required contract | Allowed emitted intents |
| --- | --- | --- |
| ecosystem_node | Hold passive node references. | `select_node` |
| zone | Hold zone classification and HumanGate conditions. | `select_zone` |
| surface | Hold per-surface verdict posture. | `select_surface`, `open_evidence_packet_view` |
| source_state | Hold created, registered, loaded, enforced, evidenced separately. | `request_source_readback`, `mark_source_unknown` |
| chain_candidate | Hold candidate fields only. | `validate_chain_candidate`, `send_to_fragmented_audit_pipeline` |
| output_route | Hold route candidate and forbidden destinations. | `open_route_check_view`, `flag_route_conflict` |
| evidence_packet | Hold evidence refs, readbacks, validations, claim limits, unknowns. | `open_evidence_packet_view`, `flag_evidence_conflict` |
| patch_plan_candidate | Hold target files, non-goals, actions, validation, output routing. | `create_task_charter_candidate`, `request_revision` |
| human_gate_decision | Hold decision state, exact scope, expiry, one-step boundary. | `open_humangate_packet` |
| cost_signal | Hold passive cost and pressure signals. | `open_cost_guard_view`, `set_candidate_cost_guard` |
| blocked_action | Hold blocked action reason and required HumanGate condition. | `open_blocked_action_view`, `request_revision` |
| uxpilote_view_state | Hold active view, selected node, chain/evidence/route state, locks. | `open_screen`, `select_context` |

## 14. Read-Only Adapter Component Contracts

Adapters are read-only by contract. They may expose references or readback state only.

| Adapter | Required contract | Allowed emitted intents |
| --- | --- | --- |
| file_tree_adapter | Provide file tree references only. | `request_source_readback` |
| git_status_adapter | Provide branch, HEAD, and worktree status references only. | `request_source_readback` |
| source_index_adapter | Provide source index references only. | `request_source_readback`, `mark_source_unknown` |
| source_anchoring_adapter | Provide source anchoring references only. | `request_source_readback`, `mark_source_unknown` |
| output_routing_adapter | Provide output routing policy references only. | `open_route_check_view`, `flag_route_conflict` |
| autodev_template_adapter | Provide AutoDev template references only. | `request_source_readback` |
| executor_report_adapter | Provide executor report references only. | `open_evidence_packet_view`, `open_validation_view` |
| analysis_record_adapter | Provide analysis record references only. | `open_evidence_packet_view` |
| cost_signal_adapter | Provide passive cost signal references only. | `open_cost_guard_view` |
| llm_link_adapter | Provide passive suggestion context only. | `suggest_label`, `suggest_summary`, `suggest_chain_draft`, `flag_ambiguity` |

## 15. Patch Lab Candidate-Only Contract

Patch Lab may emit:

- `create_task_charter_candidate`
- `create_patch_plan_candidate`
- `create_validation_plan_candidate`
- `open_route_check_view`
- `open_humangate_packet`
- `request_revision`

Patch Lab must not emit:

- `mutate_file`
- `write_file`
- `patch_code`
- `create_implementation_file`
- `create_frontend_file`
- `create_backend_file`
- `create_ui_prototype_file`
- `execute_runtime`
- `run_tests`
- `run_ci`
- `git_commit`
- `git_push`
- `git_branch_create`
- `git_pull_request_create`

Patch Lab output is candidate-only and stops before Codex prompts or executor tasks unless a separate HumanGate-approved task authorizes one bounded next step.

## 16. LLM Link Layer Passive-Only Contract

LLM Link Layer may emit:

- `suggest_label`
- `suggest_summary`
- `suggest_chain_draft`
- `flag_ambiguity`

LLM Link Layer must not emit:

- `grant_final_llm_authority`
- `mutate_file`
- `execute_runtime`
- `activate_agent`
- `promote_claim`
- `treat_log_as_proof`
- `emit_global_ready_verdict`
- `emit_global_not_ready_verdict`

LLM output is suggestion, draft, explanation, or ambiguity signal only. Repo inspection, source readback, route policy, evidence records, and HumanGate remain higher authority.

## 17. Cost / Heat / Energy Observation-Only Contract

Cost / Heat / Energy may emit:

- `open_cost_guard_view`
- `set_candidate_cost_guard`
- `request_revision`

Cost / Heat / Energy must not emit:

- `control_hardware`
- `control_power`
- `terminate_process`
- `start_process`
- `change_system_settings`
- `run_benchmark`
- `run_training`
- `execute_runtime`

Cost signals are observation only. They are not benchmark proof, model evidence, claim validation, or runtime authorization.

## 18. HumanGate Final Authority Contract

HumanGate may emit decision-state intents:

- `approve_one_bounded_next_step`
- `block_next_step`
- `request_revision`
- `deny_activation`
- `defer_next_step`

HumanGate decisions must include:

- source-state review.
- route check.
- evidence packet review.
- red-team objections.
- cost guard.
- exact files.
- one-step boundary.
- expiry.

`approve_one_bounded_next_step` does not execute anything by itself. It records a bounded decision state. Execution, mutation, activation, promotion, claims, costly runs, and Git actions still require a separate explicit task with exact scope, route, validation, and reporting.

## 19. Source And Evidence Contract

Components must display source-state as separate fields:

- created.
- registered.
- loaded.
- enforced.
- evidenced.

Evidence components must separate:

- software_verdict by surface.
- evidence_verdict by surface.
- claim_verdict by surface.
- unknowns.
- blocked claims.
- conflicts.

No component may emit global ready/not-ready verdicts. Logs, reports, events, benchmark summaries, and artifacts remain observation unless separately promoted by HumanGate with matching evidence.

## 20. Output Routing Contract

Any component that helps form a file-producing candidate must require:

- produced file type.
- intended surface.
- canonical destination.
- forbidden destinations.
- registration requirement.
- project source upload requirement.
- retention policy.
- promotion gate.

If route is missing, ambiguous, forbidden, or duplicate-prone, the component must emit `flag_route_conflict` or `request_revision`, not a write intent.

Forbidden destinations remain blocked:

- `00_STUDIO_CONTROL` root Markdown files.
- legacy opening pipeline.
- lab.
- latest.json.
- lab/runs/RUN_*.
- runtime source directories.
- test directories.
- dataset directories.
- model or checkpoint directories.

## 21. Blocking And Error Contract

Components must block and explain:

| Condition | Required emitted intent | Required message posture |
| --- | --- | --- |
| missing source | `flag_missing_source` or `mark_source_unknown` | Source must be loaded or read back before use. |
| missing route | `flag_route_conflict` | Output routing is required before file-producing candidates. |
| invalid status | `flag_invalid_status` | Use IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, or UNKNOWN. |
| blocked action | `flag_blocked_action` | The blocked action cannot proceed in this contract. |
| hidden activation | `flag_hidden_activation` | Activation remains blocked. |
| evidence conflict | `flag_evidence_conflict` | Claim exceeds loaded evidence. |
| high or unknown cost | `request_revision` or `open_humangate_packet` | Cost guard requires narrowing or HumanGate review. |

Blocking must preserve the forbidden emitted intent vocabulary. No block resolution may silently emit mutation, execution, activation, training, benchmark, dataset/model, hardware/power/process, Git, or claim-promotion intents.

## 22. Acceptance Criteria

- Sections 1 through 23 are present.
- Every named component from the planned UxPilote ecosystem is present.
- Emitted intent vocabulary is present.
- Forbidden emitted intent vocabulary is present.
- No component emits forbidden intent.
- Patch Lab is candidate-only.
- LLM Link Layer is passive-only.
- Cost / Heat / Energy is observation-only.
- HumanGate remains final.
- No runtime activation is authorized.
- No agent activation is authorized.
- No training, benchmark, dataset, model, or checkpoint activation is authorized.
- No Git action is authorized.
- No global ready/not-ready verdict is authorized.

## 23. Non-Authorization And Verdicts

This component contract does not authorize:

- implementation.
- prototype.
- frontend code.
- backend code.
- runtime execution.
- tests.
- CI.
- agent activation.
- training.
- benchmark.
- dataset generation.
- dataset reset.
- latest.json creation.
- lab/runs/RUN_* creation.
- model creation.
- checkpoint creation.
- model or checkpoint promotion.
- hardware control.
- power control.
- process termination.
- system settings changes.
- Chess960 activation.
- DecisionController activation.
- Neural/Search authority change.
- AutoDev template mutation.
- UxPilote spec, plan, inventory, or flow mutation.
- GPT Navigator source index mutation.
- Git commit.
- Git push.
- branch creation.
- pull request creation.
- claims.

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

software_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

evidence_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

claim_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

no_global_ready_verdict: true
```
