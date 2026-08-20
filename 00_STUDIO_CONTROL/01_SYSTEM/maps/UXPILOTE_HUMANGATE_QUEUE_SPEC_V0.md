# UxPilote HumanGate Queue Spec V0

Task ID: UXPILOTE_HUMANGATE_QUEUE_SPEC_V0

## Status / Non-Authorization

This file is a docs-only visual and data specification for the UxPilote HumanGate Queue.

```yaml
produced_file_type: uxpilote_humangate_queue_spec
intended_surface: canonical_docs
canonical_destination: C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\UXPILOTE_HUMANGATE_QUEUE_SPEC_V0.md
temporary_destination: ""
registration_required: false
project_source_upload_required: false
retention_policy: Docs-only UX decision-queue spec candidate. Not runtime truth.
promotion_gate: HumanGate
spec_status: DOCUMENTED_ONLY
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

Non-authorization:

- This spec does not make, approve, block, defer, register, freeze, discard, promote, activate, or execute any HumanGate decision.
- This spec does not modify runtime code, scripts, tests, CI, CODEOWNERS, MASTER_DOCS, ROADMAP_INDEX, registries, source indexes, lab outputs, datasets, models, checkpoints, or `latest.json`.
- This spec does not create prototypes, run scripts, run Godot, run frontend tooling, run cargo, run tests, run benchmarks, run training, stage Git changes, commit, push, create branches, or open pull requests.
- This spec remains `DOCUMENTED_ONLY` until a later HumanGate action explicitly registers, loads, enforces, and evidences it.

## Purpose

The HumanGate Queue defines how UxPilote displays pending decisions before any mutation, activation, promotion, cleanup, prototype, training, or Git action.

The queue exists to make decision pressure visible:

- approve one bounded step
- block
- request revision
- defer
- register, freeze, or discard source candidates
- resolve path authority
- decide prototype authorization
- decide blocked runner visibility
- decide future LLM/LoRA charter posture

It is an operator-facing decision inbox, not an authority engine.

## HumanGate Queue Principle

The HumanGate Queue displays pending human decisions; it never makes them.

```yaml
humangate_queue_principle:
  displays_pending_decisions: true
  makes_decisions: false
  mutates_files: false
  executes_tools: false
  authorizes_runtime: false
  authorizes_git: false
  source_truth_status: DOCUMENTED_ONLY
  no_global_ready_verdict: true
```

Each queue item must preserve:

- the source-state boundary: `created != registered; registered != loaded; loaded != enforced; enforced != evidenced`
- the claim boundary: `claim_posture: NO_CLAIM_ALLOWED`
- the surface boundary: one of the canonical six surfaces
- the action boundary: blocked actions stay blocked unless a later explicit HumanGate decision changes them

## Queue Screen Mockup

```text
+----------------------------------------------------------------------------------+
| UxPilote HumanGate Queue                                         DOCUMENTED_ONLY |
+----------------------------------------------------------------------------------+
| Filters: [surface] [decision category] [source_state] [risk] [zone]              |
+------+-------------------------------+----------------------+----------+---------+
| ID   | Title                         | Category             | Default  | Status  |
+------+-------------------------------+----------------------+----------+---------+
| HGQ1 | scripts/uxpilote candidate    | source_registration  | defer    | UNKNOWN |
| HGQ2 | scripts/studioV2 route lane   | route_authority      | defer    | UNKNOWN |
| HGQ3 | CI/CODEOWNERS path alignment  | docs_drift_resolution| block    | BLOCKED |
| HGQ4 | blocked runner visibility     | blocked_runner_visib.| defer    | BLOCKED |
| HGQ5 | read-only prototype preflight | prototype_authoriz.  | defer    | UNKNOWN |
| HGQ6 | LLM/LoRA future charter       | LLM_LoRA_future_char.| block    | BLOCKED |
| HGQ7 | stale nested path docs drift  | docs_drift_resolution| request  | UNKNOWN |
+------+-------------------------------+----------------------+----------+---------+
| Selected: HGQ1 scripts/uxpilote candidate                                        |
| zone: scripts/uxpilote                                                           |
| surface: artifacts_runtime_outputs                                               |
| source_state: created UNKNOWN, registered UNKNOWN, loaded UNKNOWN,               |
|               enforced UNKNOWN, evidenced UNKNOWN                                |
| requested_action: register/freeze/discard candidate                              |
| evidence: scripts/uxpilote README exists; route charter says UNKNOWN             |
| risk: presence could be mistaken for source authority                            |
| allowed_decisions: register_candidate, freeze_candidate, discard_candidate,       |
|                    request_revision, defer                                       |
| blocked_actions: execute unknown scripts, commit/push/branch/PR                  |
| links: Fusion Matrix, Scripts Control View, Readonly Data Contract, Studio Map  |
|        Evidence / Claims Map                                                    |
+----------------------------------------------------------------------------------+
```

## Decision Categories

```yaml
decision_categories:
  source_registration:
    purpose: Decide whether a source candidate should be registered, frozen, discarded, or revised.
    default_status: UNKNOWN
  route_authority:
    purpose: Decide which path is authoritative for future references.
    default_status: UNKNOWN
  prototype_authorization:
    purpose: Decide whether a prototype charter or preflight may proceed.
    default_status: UNKNOWN
  cleanup_authorization:
    purpose: Decide whether cleanup, deletion, cache removal, archive, move, or rename can be proposed.
    default_status: BLOCKED
  runtime_patch_authorization:
    purpose: Decide whether one bounded runtime or test patch may proceed.
    default_status: BLOCKED
  blocked_runner_visibility:
    purpose: Decide which blocked runner classes may be shown as disabled controls.
    default_status: BLOCKED
  docs_drift_resolution:
    purpose: Decide how stale docs, stale paths, or reference drift should be handled.
    default_status: UNKNOWN
  LLM_LoRA_future_charter:
    purpose: Decide whether future LLM or LoRA planning may be chartered without dataset, model, or training action.
    default_status: BLOCKED
  Git_action_request:
    purpose: Decide whether a bounded Git action is allowed.
    default_status: BLOCKED
```

## Queue Item Schema

Every queue item must include these fields:

```yaml
queue_item_schema:
  decision_id:
    type: string
    required: true
  title:
    type: string
    required: true
  zone:
    type: string
    required: true
  surface:
    type: enum
    values:
      - active_runtime_code
      - tests
      - artifacts_runtime_outputs
      - canonical_docs
      - roadmap_docs_only
      - inference
    required: true
  source_state:
    type: object
    required: true
    fields:
      created: controlled_status
      registered: controlled_status
      loaded: controlled_status
      enforced: controlled_status
      evidenced: controlled_status
  requested_action:
    type: string
    required: true
  evidence:
    type: list
    required: true
  risk:
    type: list
    required: true
  blocked_actions:
    type: list
    required: true
  allowed_decisions:
    type: list
    required: true
  recommended_default:
    type: enum
    values:
      - approve_one_bounded_step
      - block
      - request_revision
      - defer
      - register_candidate
      - freeze_candidate
      - discard_candidate
    required: true
  required_readbacks:
    type: list
    required: true
  expires_or_recheck_condition:
    type: string
    required: true
  no_global_ready_verdict:
    type: boolean
    required: true
    value: true
```

`controlled_status` values are limited to:

```yaml
allowed_status_values:
  - IMPLEMENTED
  - TESTED
  - DOCUMENTED_ONLY
  - PASSIVE
  - BLOCKED
  - NOT_FOUND
  - UNKNOWN
```

## Decision Payload Schema

The queue may display a decision payload shape, but this spec does not create any actual decision payload.

```yaml
decision_payload_schema:
  decision_id:
    type: string
    required: true
  selected_decision:
    type: enum
    values:
      - approve_one_bounded_step
      - block
      - request_revision
      - defer
      - register_candidate
      - freeze_candidate
      - discard_candidate
    required: true
  selected_by:
    type: string
    required: true
    allowed_value: HumanGate
  decision_scope:
    type: string
    required: true
  bounded_next_step:
    type: string
    required: false
  preserved_blocked_actions:
    type: list
    required: true
  required_validation:
    type: list
    required: true
  source_state_after_decision:
    type: object
    required: true
  claim_posture:
    type: string
    required: true
    allowed_value: NO_CLAIM_ALLOWED
  no_global_ready_verdict:
    type: boolean
    required: true
    value: true
```

The queue must show incomplete payload fields as `UNKNOWN`, not infer them.

## Source-State Display

The queue must display source state as five separate fields.

```yaml
source_state_display:
  created: controlled_status
  registered: controlled_status
  loaded: controlled_status
  enforced: controlled_status
  evidenced: controlled_status
  invariant: created != registered; registered != loaded; loaded != enforced; enforced != evidenced
```

Display rules:

- `created: DOCUMENTED_ONLY` means a local file or candidate record exists; it does not mean source truth.
- `registered: UNKNOWN` means no source-registration evidence is loaded into the queue item.
- `loaded: DOCUMENTED_ONLY` means the queue read the file for display only.
- `enforced: DOCUMENTED_ONLY` means the spec documents a rule but does not make it active.
- `evidenced: DOCUMENTED_ONLY` means readback exists, not runtime proof.

## Evidence and Risk Display

Evidence display must separate file presence, readback, tests, runtime output, and claims.

```yaml
evidence_display:
  file_presence: PASSIVE
  readback: DOCUMENTED_ONLY
  command_output: PASSIVE
  runtime_output: PASSIVE
  tests: PASSIVE
  claims: BLOCKED
```

Risk display must flag:

- hidden activation risk
- source-state gap
- route-authority drift
- stale path reference
- unregistered candidate used as truth
- prototype mistaken for source authority
- report, log, benchmark, or output mistaken for proof
- Git action requested before HumanGate

## Allowed Decision Values

```yaml
allowed_decision_values:
  approve_one_bounded_step:
    meaning: HumanGate approves exactly one bounded next step with named files, named commands, and blocked actions preserved.
  block:
    meaning: HumanGate blocks the requested action.
  request_revision:
    meaning: HumanGate asks for a narrower or clearer proposal.
  defer:
    meaning: HumanGate leaves the item pending until more readback or context exists.
  register_candidate:
    meaning: HumanGate registers a source candidate through a separate authorized source-registration action.
  freeze_candidate:
    meaning: HumanGate freezes a source candidate from further promotion or mutation pending later review.
  discard_candidate:
    meaning: HumanGate rejects or discards a source candidate through a separate authorized action.
```

The queue can display these values, but cannot select them.

## Blocked Actions

```yaml
blocked_actions:
  mutation: BLOCKED
  activation: BLOCKED
  promotion: BLOCKED
  cleanup: BLOCKED
  prototype_creation_or_execution: BLOCKED
  runtime_patch_without_bounded_HumanGate: BLOCKED
  script_execution: BLOCKED
  unknown_script_execution: BLOCKED
  Godot_frontend_cargo_tests_benchmark_training: BLOCKED
  dataset_generation_reset: BLOCKED
  model_checkpoint_creation_promotion: BLOCKED
  lab_runs_creation: BLOCKED
  latest_json_creation: BLOCKED
  source_registration_by_spec: BLOCKED
  registry_or_source_index_update: BLOCKED
  CI_mutation: BLOCKED
  CODEOWNERS_mutation: BLOCKED
  Git_action: BLOCKED
  GitHub_PR_automation: BLOCKED
  auto_merge: BLOCKED
  readiness_release_benchmark_model_dataset_scientific_claim: BLOCKED
```

Generated cache folders, including `__pycache__`, are `PASSIVE` artifacts unless an explicit cleanup task is authorized by HumanGate.

## Integration With Fusion Matrix

The Fusion Matrix produces conflict and decision inputs. The HumanGate Queue displays those inputs as pending decision items after RedTeam objections and before any HumanGate outcome.

```yaml
fusion_matrix_integration:
  input_from: UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0
  accepted_inputs:
    - unresolved_conflict
    - blocked_claim
    - source_state_gap
    - blocked_activation_risk
    - blocked_authority_shift
  queue_output: pending_humangate_decision_item
  execution_authority: false
```

Boundary:

- FusionAuditor synthesis can produce a packet.
- CartographerRedTeam can add objections.
- HumanGate Queue can display the resulting question.
- Only HumanGate can decide.

## Integration With Scripts Control View

The Scripts Control View sends script-route and blocked-runner questions into the HumanGate Queue.

```yaml
scripts_control_integration:
  input_view: Scripts Control View
  candidate_questions:
    - scripts/uxpilote registration posture
    - scripts/studioV2 route authority
    - scripts/control_plane compatibility posture
    - scripts/studioV2/operator authority
    - blocked runner visibility
    - CI and CODEOWNERS path alignment
  scripts_uxpilote_status: UNKNOWN
  blocked_runners_display: BLOCKED
  execution_authority: false
```

The queue must not convert a Scripts Control node into an execution control. It may link back to node inspectors for path, family, surface, status, evidence, risk, allowed actions, blocked actions, and next HumanGate question.

## Integration With Readonly Data Contract

The Readonly Data Contract supplies schema conventions for nodes, edges, views, inspectors, status mapping, surface mapping, source-state mapping, blocked-action mapping, HumanGate questions, and data-source commands.

```yaml
readonly_data_contract_integration:
  input_contract: UXPILOTE_READONLY_DATA_CONTRACT_V0
  canonical_surfaces:
    - active_runtime_code
    - tests
    - artifacts_runtime_outputs
    - canonical_docs
    - roadmap_docs_only
    - inference
  status_values:
    - IMPLEMENTED
    - TESTED
    - DOCUMENTED_ONLY
    - PASSIVE
    - BLOCKED
    - NOT_FOUND
    - UNKNOWN
  queue_authority: display_only
```

Extra studioctl or UX surfaces must map back to the canonical six surfaces before appearing in a queue item.

## Integration With Studio Control Map

The Studio Control Map supplies route, source-state, control-document, and dashboard context for HumanGate Queue items.

```yaml
studio_control_map_integration:
  input_view: Studio Control Map
  queue_links:
    - source registration decisions
    - docs drift decisions
    - route authority decisions
    - registry or source-index update requests
    - Git action requests
  displayed_fields:
    - active_root
    - target_path
    - produced_file_type
    - intended_surface
    - canonical_destination
    - source_state
    - route_check
    - output_routing_result
  blocked_authority:
    source_registration_by_queue: BLOCKED
    registry_update_by_queue: BLOCKED
    source_index_update_by_queue: BLOCKED
    git_action_by_queue: BLOCKED
  execution_authority: false
```

The queue must use the Studio Control Map to show where a decision would land, which source-state fields are missing, and which routing facts must be rechecked. It must not use the Studio Control Map to register, promote, move, delete, stage, commit, push, branch, or open a pull request.

## Integration With Evidence / Claims Map

The Evidence / Claims Map supplies evidence limits, claim posture, unknowns, blocked claims, and surface-level verdict context for HumanGate Queue items.

```yaml
evidence_claims_map_integration:
  input_view: Evidence / Claims Map
  queue_links:
    - blocked claim decisions
    - evidence sufficiency decisions
    - no-claim posture decisions
    - benchmark/log/report proof objections
    - surface verdict review
  displayed_fields:
    - evidence
    - risk
    - status_by_surface
    - software_verdict
    - evidence_verdict
    - claim_verdict
    - no_global_ready_verdict
  claim_authority: false
  proof_authority: false
  execution_authority: false
```

The queue must show evidence and claim context as decision input only. It must not convert reports, logs, benchmarks, readback, command output, or prototype behavior into proof, promotion, source authority, runtime readiness, model quality, dataset quality, or scientific claims.

## Current Decision Examples

These examples are display candidates only. They do not make or record decisions.

### scripts/uxpilote register/freeze/discard

```yaml
decision_id: HGQ-SCRIPTS-UXPILOTE-REGISTRATION
title: scripts/uxpilote candidate registration posture
zone: scripts/uxpilote
surface: artifacts_runtime_outputs
source_state:
  created: UNKNOWN
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: UNKNOWN
  evidenced: DOCUMENTED_ONLY
requested_action: Decide whether scripts/uxpilote should be registered, frozen, discarded, or revised.
evidence:
  - scripts/uxpilote/README.md read as optional context.
  - Scripts Route Alignment Charter displays scripts/uxpilote as UNKNOWN / candidate-only.
risk:
  - Candidate prototype material could be mistaken for source authority.
blocked_actions:
  - execute unknown scripts
  - prototype execution
  - commit/push/branch/PR
allowed_decisions:
  - register_candidate
  - freeze_candidate
  - discard_candidate
  - request_revision
  - defer
recommended_default: defer
required_readbacks:
  - scripts/uxpilote/README.md
  - UXPILOTE_READONLY_DATA_CONTRACT_V0.md
  - SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md
expires_or_recheck_condition: Recheck after HumanGate source-registration decision or after scripts/uxpilote changes.
no_global_ready_verdict: true
```

### scripts/studioV2 route authority

```yaml
decision_id: HGQ-SCRIPTS-STUDIOV2-ROUTE-AUTHORITY
title: scripts/studioV2 official implementation candidate route
zone: scripts/studioV2
surface: artifacts_runtime_outputs
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: UNKNOWN
  evidenced: DOCUMENTED_ONLY
requested_action: Decide whether scripts/studioV2/** should become the registered scripts implementation lane.
evidence:
  - SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0 declares scripts/studioV2/** as official implementation candidate.
risk:
  - Candidate route could be mistaken for enforced route authority.
blocked_actions:
  - silent docs rewrite
  - CI mutation
  - CODEOWNERS mutation
  - shim creation
allowed_decisions:
  - approve_one_bounded_step
  - request_revision
  - defer
  - block
recommended_default: defer
required_readbacks:
  - SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md
  - STUDIO_OUTPUT_ROUTING_POLICY_V0.md
expires_or_recheck_condition: Recheck after any path, CI, CODEOWNERS, or docs-control-plane reference change.
no_global_ready_verdict: true
```

### CI/CODEOWNERS alignment decision

```yaml
decision_id: HGQ-CI-CODEOWNERS-ALIGNMENT
title: CI and CODEOWNERS path alignment
zone: .github
surface: canonical_docs
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: UNKNOWN
  evidenced: DOCUMENTED_ONLY
requested_action: Decide whether a future bounded patch may align CI and CODEOWNERS path references.
evidence:
  - Scripts route charter identifies legacy CI and CODEOWNERS references as drift candidates.
risk:
  - Workflow mutation can change automation behavior.
blocked_actions:
  - CI mutation
  - CODEOWNERS mutation
  - Git action
allowed_decisions:
  - approve_one_bounded_step
  - request_revision
  - defer
  - block
recommended_default: block
required_readbacks:
  - .github/CODEOWNERS
  - .github/workflows
  - SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md
expires_or_recheck_condition: Recheck after HumanGate authorizes a CI or CODEOWNERS proposal.
no_global_ready_verdict: true
```

### blocked runner visibility decision

```yaml
decision_id: HGQ-BLOCKED-RUNNER-VISIBILITY
title: blocked runner display policy
zone: scripts blocked runners
surface: artifacts_runtime_outputs
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: DOCUMENTED_ONLY
  evidenced: DOCUMENTED_ONLY
requested_action: Decide which blocked runner classes may remain visible as disabled UxPilote controls.
evidence:
  - Scripts Route Alignment Charter defines blocked runners as display-only BLOCKED controls.
risk:
  - Disabled controls could be mistaken for executable controls.
blocked_actions:
  - benchmark
  - gameplay execution
  - PR/GitHub automation
  - auto-merge
  - dataset generation/reset
  - model/checkpoint creation or promotion
  - lab/runs creation
  - latest.json creation
  - commit/push/branch/PR
  - unknown script execution
allowed_decisions:
  - approve_one_bounded_step
  - request_revision
  - defer
  - block
recommended_default: defer
required_readbacks:
  - UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md
  - SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md
expires_or_recheck_condition: Recheck after UxPilote control design changes or blocked-runner policy changes.
no_global_ready_verdict: true
```

### UxPilote read-only prototype preflight decision

```yaml
decision_id: HGQ-UXPILOTE-READONLY-PROTOTYPE-PREFLIGHT
title: UxPilote read-only prototype preflight
zone: UxPilote prototype
surface: inference
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: UNKNOWN
  evidenced: DOCUMENTED_ONLY
requested_action: Decide whether a later prototype preflight charter may be prepared.
evidence:
  - UxPilote world graph and read-only data contract define display-only posture.
  - scripts/uxpilote remains UNKNOWN until HumanGate registration decision.
risk:
  - Prototype work could drift into runtime implementation or source authority.
blocked_actions:
  - prototype creation
  - prototype execution
  - local server execution
  - source registration by spec
allowed_decisions:
  - approve_one_bounded_step
  - request_revision
  - defer
  - block
recommended_default: defer
required_readbacks:
  - UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md
  - UXPILOTE_READONLY_DATA_CONTRACT_V0.md
  - scripts/uxpilote/README.md
expires_or_recheck_condition: Recheck after HumanGate decides scripts/uxpilote registration or prototype route posture.
no_global_ready_verdict: true
```

### LLM/LoRA future charter decision

```yaml
decision_id: HGQ-LLM-LORA-FUTURE-CHARTER
title: Future LLM/LoRA charter posture
zone: inference
surface: inference
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: DOCUMENTED_ONLY
  evidenced: UNKNOWN
requested_action: Decide whether future LLM/LoRA planning may be chartered without dataset, model, checkpoint, or training action.
evidence:
  - AGENTS doctrine blocks dataset/model/training/promotion claims without HumanGate.
risk:
  - Planning could drift into dataset generation, model creation, or authority shift.
blocked_actions:
  - dataset generation/reset
  - training
  - model/checkpoint creation or promotion
  - LLM as final authority
allowed_decisions:
  - approve_one_bounded_step
  - request_revision
  - defer
  - block
recommended_default: block
required_readbacks:
  - AGENTS.md
  - STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md
expires_or_recheck_condition: Recheck only after HumanGate authorizes a docs-only LLM/LoRA charter.
no_global_ready_verdict: true
```

### stale nested path docs drift decision

```yaml
decision_id: HGQ-STALE-NESTED-PATH-DRIFT
title: Stale nested path docs drift
zone: path references
surface: canonical_docs
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: UNKNOWN
  evidenced: DOCUMENTED_ONLY
requested_action: Decide whether stale nested path references should be revised, blocked, or left pending.
evidence:
  - UXPILOTE_READONLY_DATA_CONTRACT_V0 warns that old nested paths like C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab are historical or stale unless separately verified.
risk:
  - Stale path references could route future work outside the active root.
blocked_actions:
  - silent path rewrite
  - file move or rename
  - cleanup
allowed_decisions:
  - approve_one_bounded_step
  - request_revision
  - defer
  - block
recommended_default: request_revision
required_readbacks:
  - UXPILOTE_READONLY_DATA_CONTRACT_V0.md
  - STUDIO_SOURCE_ANCHORING_V0.md
expires_or_recheck_condition: Recheck after path references are separately audited.
no_global_ready_verdict: true
```

## HumanGate Does Not Execute

The queue must separate decision display from execution.

```yaml
humangate_does_not_execute:
  displays_decision_options: true
  records_actual_decisions: false
  executes_decisions: false
  mutates_files: false
  triggers_tools: false
  creates_prs: false
  promotes_sources: false
```

After HumanGate makes a decision outside this spec, a separate bounded executor prompt or decision record must define exact route, files, commands, validation, blocked actions, source state, and claim posture.

## Future Data Gaps

```yaml
future_data_gaps:
  stable_decision_record_registry: UNKNOWN
  queue_item_ids_from_studioctl_json: UNKNOWN
  source_registration_state_api: UNKNOWN
  CI_CODEOWNERS_route_drift_feed: UNKNOWN
  prototype_authorization_feed: UNKNOWN
  cleanup_authorization_feed: UNKNOWN
  Git_action_authorization_feed: UNKNOWN
  LLM_LoRA_charter_feed: UNKNOWN
```

Until these gaps are closed, UxPilote must display missing fields as `UNKNOWN` or `NOT_FOUND` and must not infer authority from absence.

## Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE
```

## Software / Evidence / Claim Verdicts

```yaml
software_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

evidence_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

claim_verdict: NO_CLAIM_ALLOWED
```

## No Global Ready Verdict

```yaml
no_global_ready_verdict: true
```

This spec gives no global ready or not-ready verdict. It defines a docs-only HumanGate Queue candidate for displaying pending decisions and preserving blocked actions until HumanGate acts separately.
