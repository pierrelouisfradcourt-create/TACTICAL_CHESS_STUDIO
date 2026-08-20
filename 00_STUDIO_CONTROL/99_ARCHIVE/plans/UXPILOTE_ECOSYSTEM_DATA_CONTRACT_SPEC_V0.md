# UxPilote Ecosystem Data Contract Specification V0

Status: DOCUMENTED_ONLY
Surface: roadmap_docs_only
Runtime authority: NONE
Agent activation: BLOCKED
Prototype implementation: BLOCKED
Schema generation: BLOCKED
Frontend/backend code: BLOCKED
Broad filesystem scan: BLOCKED
Cleanup/deletion/archive creation: BLOCKED
Hardware/power control: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

---

## 1. Header

```yaml
title: "UxPilote Ecosystem Data Contract Specification V0"
status: DOCUMENTED_ONLY
surface: roadmap_docs_only
runtime_authority: NONE
agent_activation: BLOCKED
prototype_implementation: BLOCKED
schema_generation: BLOCKED
frontend_backend_code: BLOCKED
broad_filesystem_scan: BLOCKED
cleanup_deletion_archive_creation: BLOCKED
hardware_power_control: BLOCKED
claim_posture: NO_CLAIM_ALLOWED
```

This document is a roadmap-only data contract specification. It has no runtime authority and does not authorize implementation, schema generation, frontend code, backend code, prototype work, broad filesystem scans, cleanup, deletion, archive creation, hardware or power control, process control, Git actions, source promotion, or claims.

## 2. Purpose

This specification defines conceptual read-only data objects and relationships for the UxPilote ecosystem UX. It is a design contract only, not implementation and not schema generation.

`C:/TACTICAL_CHESS_STUDIO` is the full Studio ecosystem root, the base map, and the whole studio.

`C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab` is one imported/recovered studio organism or legacy living zone inside that ecosystem. It is not the ecosystem root and is not the whole ecosystem.

The objects described here may support future UxPilote planning, screen design, review packets, and HumanGate decision framing. They do not define executable schemas, serialization formats, databases, adapters, frontend state stores, backend APIs, runtime behavior, or broad scan authorization.

## 3. Base Map Rule

```yaml
workspace_root: "C:/TACTICAL_CHESS_STUDIO"
repo_zone: "C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab"
workspace_root_authority: PASSIVE
repo_zone_authority: PASSIVE
broad_scan: BLOCKED
```

Rules:

- `workspace_root` is the full Studio ecosystem root, the visual and conceptual base ecosystem map root, the base map, and the whole studio.
- `workspace_root` is read-only by default.
- `repo_zone` is one imported/recovered studio organism or legacy living zone inside the workspace root.
- `repo_zone` is subordinate to `workspace_root`.
- `repo_zone` is not the ecosystem root and is not the whole ecosystem.
- Broad recursive filesystem scanning is BLOCKED unless a later HumanGate task scopes exact read-only paths.
- The workspace root does not authorize cleanup, deletion, file moves, runtime execution, artifact generation, hardware control, power control, process termination, Git actions, source promotion, or claims.
- Any future read must be scoped, bounded, routed, and evidenced.

## 4. Data Contract Rules

- Data objects are read-only planning objects.
- Data objects may describe state.
- Data objects may carry intent.
- Data objects may reference evidence.
- Data objects may reference routes.
- Data objects may reference HumanGate requirements.
- Data objects must not mutate files.
- Data objects must not execute commands.
- Data objects must not run tests or CI.
- Data objects must not activate agents.
- Data objects must not train, benchmark, generate datasets, reset datasets, create models, or create checkpoints.
- Data objects must not control hardware, power, processes, or system settings.
- Data objects must not authorize claims.
- HumanGate remains final for mutation, activation, promotion, claims, costly runs, scoped scans, source promotion, cleanup, deletion, archive creation, and Git actions.

## 5. Controlled Values

Allowed surface values:

```yaml
surface_values:
  - active_runtime_code
  - tests
  - artifacts_runtime_outputs
  - canonical_docs
  - roadmap_docs_only
  - inference
```

Allowed status values:

```yaml
status_values:
  - IMPLEMENTED
  - TESTED
  - DOCUMENTED_ONLY
  - PASSIVE
  - BLOCKED
  - NOT_FOUND
  - UNKNOWN
```

Allowed chain types:

```yaml
chain_types:
  - Hygiene
  - Truth
  - Upgrade
```

Allowed zones:

```yaml
zones:
  - workspace_root
  - studio_organism_zone
  - repo_zone
  - Engine
  - Rocky
  - Routage
  - Evidence
  - Studio Control
  - Runtime Outputs
  - Models/Datasets
  - Archives
```

Allowed action modes:

```yaml
action_modes:
  - inspect
  - compare
  - diagnose
  - validate_evidence
  - prepare_patch
```

Allowed authority levels:

```yaml
authority_levels:
  - read_only
  - docs_only
  - patch_proposal
  - runtime_locked
  - HumanGate_required
  - forbidden
```

Allowed UI states:

```yaml
ui_states:
  - empty
  - loading_readback
  - source_unknown
  - chain_incomplete
  - chain_blocked
  - ready_for_humangate
  - humangate_blocked
  - candidate_created
  - executor_report_loaded
  - analysis_record_loaded
  - evidence_conflict
  - route_conflict
  - runtime_locked
  - agent_locked
```

Allowed emitted intents:

```yaml
allowed_emitted_intents:
  - open_screen
  - select_context
  - select_node
  - select_zone
  - select_surface
  - open_zone_inspector
  - open_event_tray
  - request_source_readback
  - mark_source_unknown
  - open_source_registry
  - open_route_check_view
  - flag_route_requirement
  - flag_route_conflict
  - open_evidence_packet_view
  - open_readback_view
  - open_validation_view
  - open_blocked_action_view
  - mark_unknown
  - flag_evidence_conflict
  - flag_blocked_claim
  - draft_chain_candidate
  - validate_chain_candidate
  - send_to_fragmented_audit_pipeline
  - create_task_charter_candidate
  - create_patch_plan_candidate
  - create_validation_plan_candidate
  - open_cost_guard_view
  - set_candidate_cost_guard
  - suggest_label
  - suggest_summary
  - suggest_chain_draft
  - flag_ambiguity
  - open_humangate_packet
  - approve_one_bounded_next_step
  - block_next_step
  - request_revision
  - deny_activation
  - defer_next_step
```

Forbidden emitted intents:

```yaml
forbidden_emitted_intents:
  - execute_runtime
  - run_runtime_command
  - run_tests
  - run_ci
  - run_benchmark
  - run_training
  - run_broad_filesystem_scan
  - cleanup_files
  - delete_files
  - move_files
  - create_archive
  - mutate_file
  - write_file
  - patch_code
  - create_schema_file
  - generate_json_schema
  - create_ui_prototype_file
  - activate_agent
  - activate_decision_controller
  - activate_chess960
  - change_neural_search_authority
  - generate_dataset
  - reset_dataset
  - create_model
  - create_checkpoint
  - promote_model
  - promote_checkpoint
  - create_latest_json
  - create_lab_run
  - control_hardware
  - control_power
  - terminate_process
  - change_system_settings
  - git_commit
  - git_push
  - git_branch_create
  - git_pull_request_create
  - promote_claim
  - emit_global_ready_verdict
  - emit_global_not_ready_verdict
```

## 6. workspace_root

Conceptual fields:

```yaml
workspace_root:
  path: "C:/TACTICAL_CHESS_STUDIO"
  role: "ecosystem_root"
  visible_label: "TACTICAL_CHESS_STUDIO"
  child_zones: []
  read_only: true
  mutation: BLOCKED
  broad_scan: BLOCKED
  cleanup: BLOCKED
  deletion: BLOCKED
  archive_creation: BLOCKED
  hardware_control: BLOCKED
  git_actions: BLOCKED
  humangate_required: true
  source_state: source_state
  evidence_state: evidence_packet
```

Contract:

- `workspace_root` is the visual base map root.
- `workspace_root` is the full Studio ecosystem root, the base map, and the whole studio.
- It may contain child zone references, including repo zones and Studio Control zones.
- It must not authorize broad recursive scans.
- It must not authorize cleanup, deletion, file movement, archive creation, runtime execution, artifact generation, hardware control, power control, process termination, Git actions, source promotion, or claims.

## 7. repo_zone

Conceptual fields:

```yaml
repo_zone:
  path: "C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab"
  role: "studio_organism_zone"
  alias: "repo_zone"
  parent_workspace_root: "C:/TACTICAL_CHESS_STUDIO"
  surfaces_visible:
    - active_runtime_code
    - tests
    - artifacts_runtime_outputs
    - canonical_docs
    - roadmap_docs_only
    - inference
  read_only: true
  repo_inspection_allowed_only_when_scoped: true
  mutation: "BLOCKED unless later HumanGate task authorizes exact file scope"
  runtime_execution: BLOCKED
  tests_execution: BLOCKED
  git_actions: BLOCKED
  source_state: source_state
  evidence_state: evidence_packet
```

Contract:

- `repo_zone` is a child zone of `workspace_root`.
- `repo_zone` means an imported/recovered studio organism zone or legacy living zone inside the full Studio ecosystem.
- `studio_organism_zone` is the preferred conceptual meaning; `repo_zone` remains a compatible alias for this TacticalChessPureLab zone.
- `repo_zone` is subordinate to `workspace_root` and is not the ecosystem root.
- It may be visually represented on the ecosystem map.
- It may be inspected only through scoped, read-only, bounded tasks.
- It does not authorize runtime execution, tests, CI, Git actions, broad scans, source promotion, or claims.

## 8. ecosystem_node

Conceptual fields:

```yaml
ecosystem_node:
  node_id: ""
  label: ""
  node_type: file | directory | chain | evidence | route | humangate | cost | unknown
  zone: ""
  surface: active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  path: ""
  parent_path: ""
  workspace_root_ref: "C:/TACTICAL_CHESS_STUDIO"
  repo_zone_ref: ""
  source_state: source_state
  evidence_state: evidence_packet
  routing_state: output_route
  health_state: PASSIVE | BLOCKED | UNKNOWN
  risk_state: []
  cost_signal_refs: []
  allowed_intents: []
  blocked_intents: []
  human_gate_required: true
```

Contract:

- An ecosystem node is a read-only conceptual map item.
- A node may reference a path, but the reference does not authorize reading outside a scoped task.
- A node may carry allowed and blocked intents, but it must never emit forbidden intents.
- If node source-state is UNKNOWN, evidence and claim use remain BLOCKED.

## 9. zone

Conceptual fields:

```yaml
zone:
  zone_id: ""
  label: ""
  ecosystem_role: ""
  workspace_position: ""
  allowed_surfaces: []
  read_only_inputs: []
  blocked_actions: []
  human_gate_conditions: []
  visible_overlays:
    - source_state
    - route
    - evidence
    - cost
    - blocked_actions
    - unknowns
  default_status: PASSIVE
```

Contract:

- A zone groups ecosystem nodes for navigation.
- Zones do not grant filesystem, runtime, source, or Git authority.
- Workspace zones and repo zones must preserve the base map rule.
- Any zone action that implies mutation, activation, scan, cleanup, deletion, archive creation, costly run, or claim requires HumanGate.

## 10. surface_status

Conceptual fields:

```yaml
surface_status:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
```

Each value must use one controlled status value:

- IMPLEMENTED.
- TESTED.
- DOCUMENTED_ONLY.
- PASSIVE.
- BLOCKED.
- NOT_FOUND.
- UNKNOWN.

Contract:

- Surface status is per surface only.
- No surface status object may collapse into a global ready/not-ready verdict.
- Roadmap-only documents do not imply runtime implementation or test evidence.

## 11. source_state

Conceptual fields:

```yaml
source_state:
  created: UNKNOWN
  registered: UNKNOWN
  loaded: UNKNOWN
  enforced: UNKNOWN
  evidenced: UNKNOWN
  source_path: ""
  source_class: permanent | reference | temporary | task_specific | unknown
  freshness: fresh | stale | unknown
  evidence: []
  missing_reason: ""
  required_action: ""
```

Contract:

- `created != registered != loaded != enforced != evidenced`.
- A source path is not active truth by itself.
- A missing, stale, or UNKNOWN source blocks chain candidates that depend on it.
- Required action may request source readback, route review, or HumanGate review, but it must not mutate files.

## 12. chain_candidate

Conceptual fields:

```yaml
chain_candidate:
  chain_id: ""
  chain_type: Hygiene | Truth | Upgrade
  zone: ""
  subzone: ""
  action_mode: inspect | compare | diagnose | validate_evidence | prepare_patch
  authority_level: read_only | docs_only | patch_proposal | runtime_locked | HumanGate_required | forbidden
  qui: {}
  quoi: {}
  quand: {}
  comment: {}
  ou: {}
  pourquoi: {}
  output_routing: output_route
  blocked_actions: []
  validation_plan: []
  chain_pipeline_required: true
  pipeline:
    - Cartographer
    - HygieneAgent
    - TruthAgent
    - FusionAuditor
    - CartographerRedTeam
    - HumanGate
  status: BLOCKED
  blocking_reasons: []
```

Contract:

- A chain candidate is not executable.
- It must remain BLOCKED until required fields, output routing, cost guard, source-state, and HumanGate requirements are satisfied.
- It may be sent to the fragmented audit pipeline as design/review state only.
- It does not authorize Codex execution or file mutation.

## 13. output_route

Conceptual fields:

```yaml
output_route:
  produced_file_type: ""
  intended_surface: roadmap_docs_only
  canonical_destination: ""
  temporary_destination: ""
  forbidden_destinations: []
  registration_required: false
  project_source_upload_required: false
  retention_policy: ""
  promotion_gate: HumanGate
  route_check_status: UNKNOWN
```

Contract:

- Output routing is mandatory before any file-producing task candidate.
- Missing, ambiguous, forbidden, or duplicate-prone routes are BLOCKED.
- Route data does not write files.
- Route approval does not promote source truth or authorize execution.

## 14. evidence_packet

Conceptual fields:

```yaml
evidence_packet:
  evidence_id: ""
  source_refs: []
  readbacks: []
  commands_run: []
  validation_results: []
  skipped_validation: []
  risks: []
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

Contract:

- Evidence packets collect readbacks, command references, validation references, skipped validation, risks, and verdicts.
- Evidence packets are not proof by default.
- Logs, reports, outputs, and events remain observation unless separately promoted by HumanGate with matching evidence.

## 15. patch_plan_candidate

Conceptual fields:

```yaml
patch_plan_candidate:
  candidate_id: ""
  target_files: []
  non_goals: []
  allowed_actions: []
  blocked_actions: []
  validation_plan: []
  output_routing: output_route
  human_gate_required: true
  status: BLOCKED
```

Contract:

- Patch plan candidates are candidate-only.
- They may describe target files, non-goals, actions, validation, and routes.
- They must not mutate files, create implementation files, create schema files, create prototype files, run commands, or generate artifacts.
- HumanGate is required before any later bounded executor task.

## 16. task_charter_candidate

Conceptual fields:

```yaml
task_charter_candidate:
  record_type: task_charter_candidate
  task_id: ""
  operator_goal: ""
  uxpilote_chain: chain_candidate
  target_surface: roadmap_docs_only
  expected_files: []
  allowed_actions: []
  blocked_actions: []
  output_routing: output_route
  validation_plan: []
  expected_executor_output: []
  claim_posture: NO_CLAIM_ALLOWED
  human_gate_required: true
```

Contract:

- A task charter candidate is not a Codex prompt.
- It may prepare a bounded task framing for HumanGate review.
- It does not authorize execution, mutation, tests, CI, runtime, scan, cleanup, deletion, archive creation, or Git actions.

## 17. executor_report_reference

Conceptual fields:

```yaml
executor_report_reference:
  report_id: ""
  task_id: ""
  path: ""
  source_state: source_state
  uxpilote_chain_report: {}
  route_check: {}
  output_routing_result: {}
  files_changed: []
  validation: []
  risks: []
  status_by_surface: surface_status
  verdicts:
    software_verdict: {}
    evidence_verdict: {}
    claim_verdict: {}
```

Contract:

- An executor report reference is observation, not proof by default.
- It may link to report evidence when loaded.
- It must not be treated as source truth unless source-state, route, validation, and HumanGate context support that use.
- It does not authorize mutation, rerun, promotion, or claims.

## 18. analysis_record_reference

Conceptual fields:

```yaml
analysis_record_reference:
  analysis_id: ""
  task_id: ""
  path: ""
  source_state: source_state
  uxpilote_chain_analysis: {}
  routing_compliance_analysis: {}
  blocked_actions_preserved: UNKNOWN
  runtime_activation_risk: UNKNOWN
  humangate_preserved: UNKNOWN
  recommendations: []
```

Contract:

- Analysis record references are read-only.
- Analysis may inspect task/report posture, routing compliance, blocked action preservation, runtime activation risk, and HumanGate preservation.
- Recommendations are passive and require HumanGate before any action.
- Analysis must not write files, run commands, activate agents, or promote claims.

## 19. human_gate_decision

Conceptual fields:

```yaml
human_gate_decision:
  decision_id: ""
  decision: approve_one_bounded_next_step | block | request_revision | deny_activation | defer
  allowed_next_step: ""
  denied_actions: []
  exact_files: []
  route_check: {}
  evidence_packet_ref: ""
  redteam_objections: []
  cost_guard: low | medium | high | blocked | unknown
  expiry: ""
  one_step_boundary: ""
  claim_boundary: NO_CLAIM_ALLOWED
```

Contract:

- HumanGate remains final.
- A HumanGate decision records one bounded decision state.
- `approve_one_bounded_next_step` does not execute the step by itself.
- Denied actions remain denied after expiry or outside exact scope.

## 20. cost_signal

Conceptual fields:

```yaml
cost_signal:
  signal_id: ""
  source: ""
  observed_or_estimated: observed | estimated | unknown
  cpu_pressure: UNKNOWN
  gpu_pressure: UNKNOWN
  memory_pressure: UNKNOWN
  time_cost: UNKNOWN
  validation_cost: UNKNOWN
  runaway_loop_risk: UNKNOWN
  confidence: UNKNOWN
  status: PASSIVE
```

Contract:

- Cost signals are observation-only.
- Cost signals do not prove benchmark, model, runtime, or claim status.
- Cost signals do not authorize hardware control, power control, process termination, process start, system setting changes, runtime execution, training, benchmark, or dataset/model work.

## 21. blocked_action

Conceptual fields:

```yaml
blocked_action:
  action_id: ""
  action_type: ""
  reason: ""
  surface: active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  status: BLOCKED
  required_humangate_condition: ""
  evidence: []
```

Contract:

- A blocked action records why an action is not allowed.
- It may identify the HumanGate condition required for a later separate task.
- It does not create an exception and does not authorize the action.

## 22. ui_view_state

Conceptual fields:

```yaml
ui_view_state:
  view_id: ""
  active_screen: ""
  selected_node: ecosystem_node
  selected_chain: chain_candidate
  selected_evidence: evidence_packet
  source_state_summary: source_state
  status_by_surface: surface_status
  visible_overlays: []
  blocking_messages: []
  available_intents: []
```

Contract:

- UI view state is display state only.
- Available intents must be drawn from allowed emitted intents.
- If a forbidden intent is requested, the state must show a blocking message instead of carrying the intent.
- UI state does not persist data by default.

## 23. emitted_intent

Conceptual fields:

```yaml
emitted_intent:
  intent_id: ""
  intent_type: ""
  source_component: ""
  target_component: ""
  payload_summary: ""
  allowed: true
  blocked_reason: ""
  humangate_required: true
```

Contract:

- Allowed intents must be listed in `allowed_emitted_intents`.
- Forbidden intents must be listed in `forbidden_emitted_intents`.
- `allowed: true` means the intent may update passive UI, candidate, evidence, route, cost, or HumanGate decision state only.
- `allowed: false` must include a blocked reason.
- No emitted intent executes commands, mutates files, creates schemas, runs scans, controls hardware, activates agents, performs Git actions, or promotes claims.

## 24. Relationships

Conceptual relationships:

```yaml
relationships:
  - workspace_root -> studio_organism_zone / repo_zone
  - workspace_root -> ecosystem_node
  - repo_zone -> ecosystem_node
  - ecosystem_node -> source_state
  - ecosystem_node -> surface_status
  - ecosystem_node -> evidence_packet
  - chain_candidate -> output_route
  - chain_candidate -> patch_plan_candidate
  - patch_plan_candidate -> task_charter_candidate
  - task_charter_candidate -> executor_report_reference
  - executor_report_reference -> analysis_record_reference
  - human_gate_decision -> allowed_next_step
  - cost_signal -> chain_candidate
  - emitted_intent -> component contract
```

Relationship rules:

- Relationships are conceptual and read-only.
- Relationships do not imply database joins, persistence, runtime models, schemas, or graph storage.
- Relationships do not authorize traversal beyond a scoped read-only task.
- `workspace_root -> studio_organism_zone / repo_zone` preserves that TacticalChessPureLab is one imported/recovered studio organism or legacy living zone inside the full Studio ecosystem.
- `repo_zone -> ecosystem_node` is subordinate to `workspace_root -> ecosystem_node`.

## 25. Non-Persistence Rule

- Data contracts do not imply persistence.
- No database is authorized.
- No schema files are authorized.
- No JSON schema generation is authorized.
- No serialization format is authorized.
- No state store is authorized.
- No cache is authorized.
- Future persistence requires a separate HumanGate task with exact files, route, validation, source-state, and non-authorization boundaries.

## 26. Broad-Scan Boundary

`C:/TACTICAL_CHESS_STUDIO` is the full Studio ecosystem root, the visual base map root, the base map, and the whole studio.

`C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab` is an imported/recovered studio organism or legacy living zone inside the ecosystem. It is not the ecosystem root.

This does not authorize broad recursive filesystem scanning.

Any future scan must be:

- read-only.
- scoped to exact paths.
- bounded by depth, file type, and purpose.
- routed.
- HumanGate-approved.
- evidenced by readback.

Scan output must not become active truth by default. It must not authorize cleanup, deletion, archive creation, runtime execution, source promotion, artifact generation, hardware control, Git actions, or claims.

## 27. Acceptance Criteria

- all named data objects are defined.
- `workspace_root` and `repo_zone` are defined.
- `repo_zone` is defined as an imported/recovered studio organism zone or legacy living zone inside the ecosystem.
- `workspace_root` uses `C:/TACTICAL_CHESS_STUDIO`.
- `repo_zone` uses `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab`.
- TacticalChessPureLab is not defined as the ecosystem root.
- controlled values are listed.
- relationships are defined.
- broad-scan boundary exists.
- non-persistence rule exists.
- no object authorizes mutation.
- no object authorizes runtime.
- no object authorizes agent activation.
- no object authorizes hardware, power, or process control.
- cleanup, deletion, and archive creation remain blocked.
- HumanGate remains final.
- no implementation is authorized.
- no schema generation is authorized.
- no global ready/not-ready verdict is authorized.

## 28. Non-Authorization

This data contract does not authorize:

- implementation.
- prototype.
- schema generation.
- schema files.
- JSON schema generation.
- frontend code.
- backend code.
- runtime execution.
- tests.
- CI.
- agents.
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
- cleanup.
- deletion.
- file movement.
- archive creation.
- broad recursive filesystem scans.
- Chess960 activation.
- DecisionController activation.
- Neural/Search authority change.
- AutoDev template mutation.
- UxPilote spec, plan, inventory, flow, or component contract mutation.
- GPT Navigator source index mutation.
- Git commit.
- Git push.
- branch creation.
- pull request creation.
- claims.

Any such action requires a separate explicit HumanGate-approved task with exact scope, output route, source-state, validation, executor reporting, and non-authorization boundaries.

## 29. Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
```

## 30. Verdicts

```yaml
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
