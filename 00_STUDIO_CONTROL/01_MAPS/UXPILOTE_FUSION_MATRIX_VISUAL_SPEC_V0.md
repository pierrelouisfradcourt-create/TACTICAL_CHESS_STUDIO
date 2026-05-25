# UxPilote Fusion Matrix Visual Spec V0

Task ID: UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0

## Status / Non-Authorization

This file is a docs-only visual specification candidate for the UxPilote Fusion Matrix.

It defines how UxPilote displays fragmented audit results before HumanGate decision. It does not implement a UI, prototype, renderer, data loader, agent, script, workflow, runtime patch, test patch, or automation.

```yaml
produced_file_type: uxpilote_fusion_matrix_visual_spec
intended_surface: canonical_docs
canonical_destination: C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0.md
registration_required: false
project_source_upload_required: false
retention_policy: Docs-only UX visual spec candidate. Not runtime truth.
promotion_gate: HumanGate
spec_status: DOCUMENTED_ONLY
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

Non-authorization:

- No runtime implementation.
- No prototype.
- No agent activation.
- No script execution.
- No source registration or promotion.
- No mutation of `UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md`, `UXPILOTE_READONLY_DATA_CONTRACT_V0.md`, or `SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md`.
- No mutation of scripts, src, tests, `.github`, CI, CODEOWNERS, MASTER_DOCS, ROADMAP_INDEX, registries, source indexes, lab, datasets, models, or `latest.json`.
- No staging, commit, push, branch, or PR.

This spec remains `DOCUMENTED_ONLY` until HumanGate decides otherwise.

## Purpose

The Fusion Matrix makes fragmented audit results visible before HumanGate decision.

It structures and displays:

- Cartographer findings
- HygieneAgent findings
- TruthAgent findings
- FusionAuditor synthesis
- CartographerRedTeam objections
- HumanGate decision input

The matrix is a read-only decision-preparation surface. It helps the human see scope, route, evidence, unknowns, blocked actions, claims, drift, hidden activation risk, and the next HumanGate question in one place.

## Fusion Matrix Principle

```text
Fragmented agents do not decide.
FusionAuditor synthesizes before RedTeam.
RedTeam challenges after synthesis.
HumanGate decides after RedTeam.
```

Core display rules:

- The matrix must preserve the order of the audit pipeline.
- The matrix must show contradictions instead of resolving them silently.
- The matrix must separate evidence from claims.
- The matrix must keep blocked actions visible.
- The matrix must show source-state gaps when unregistered or unloaded material is used as truth.
- The matrix must never show a global ready or not-ready verdict.

## Pipeline Display

The displayed pipeline is:

```text
Chain Candidate
-> Cartographer
-> HygieneAgent
-> TruthAgent
-> FusionAuditor
-> CartographerRedTeam
-> HumanGate
```

Each stage has a row/card in the matrix and may emit findings into the same columns. A later stage can add findings but cannot erase earlier evidence.

```yaml
pipeline_display:
  chain_candidate:
    status: DOCUMENTED_ONLY
    role: proposed bounded task, question, or route candidate
  cartographer:
    status: PASSIVE
    role: map scope, route, surfaces, missing anchors
  hygiene_agent:
    status: PASSIVE
    role: check required fields, controlled vocabulary, blocked actions, output route
  truth_agent:
    status: PASSIVE
    role: separate evidence, unknowns, claims, and source-state gaps
  fusion_auditor:
    status: PASSIVE
    role: synthesize packet and identify unresolved conflicts
  cartographer_redteam:
    status: PASSIVE
    role: object to missing surfaces, hidden activation, bad claims, and authority drift
  humangate:
    status: DOCUMENTED_ONLY
    role: approve one bounded step, block, or request revision
```

## FusionAuditor vs RedTeam vs HumanGate Boundary

The Fusion Matrix must display three different decision layers:

| Layer | Position | Can synthesize | Can object | Can decide | Mutation |
| --- | --- | --- | --- | --- | --- |
| FusionAuditor packet | before RedTeam | yes | limited to conflict flags | no | BLOCKED |
| CartographerRedTeam objections | after FusionAuditor | no replacement of packet | yes | no | BLOCKED |
| HumanGate input | after RedTeam | reads both packet and objections | may select next action | yes, human only | separate authorization required |

Boundary rule:

```yaml
fusion_boundary:
  fusion_auditor_before_redteam: true
  redteam_after_fusion_auditor: true
  humangate_after_redteam: true
  redteam_cannot_promote_claims: true
  fusion_auditor_cannot_approve_execution: true
  humangate_decision_required_for_next_step: true
```

## Matrix Screen Mockup

```text
+ UxPilote / Fusion Matrix ---------------------------------------------+
| Chain: SEARCH-003 authority trace        no_global_ready_verdict: true |
| Phase: pre-HumanGate fusion packet       Claim posture: NO_CLAIM_ALLOWED|
+------------------------------------------------------------------------+
| Pipeline                                                               |
| Chain Candidate -> Cartographer -> HygieneAgent -> TruthAgent          |
| -> FusionAuditor -> CartographerRedTeam -> HumanGate                   |
+------------------------------------------------------------------------+
| Agent Row          | Scope | Route | Evidence | Unknowns | Blocked     |
| Cartographer       | DOC   | OK    | refs     | source?  | runtime     |
| HygieneAgent       | OK    | OK    | fields   | none     | benchmark   |
| TruthAgent         | DOC   | gap   | readback | runtime  | claim       |
| FusionAuditor      | MIX   | OK    | packet   | conflict | activation  |
| CartographerRedTeam| RISK  | drift | objects  | hidden   | authority   |
| HumanGate          | Q     | Q     | packet   | asks     | all locked  |
+------------------------------------------------------------------------+
| Columns: scope | route | evidence | unknowns | blocked actions | claims |
|          drift | hidden activation risk | HumanGate question            |
+------------------------------------------------------------------------+
| Selected Conflict Inspector                                            |
| id: conflict.search003.authority_trace                                 |
| rule: Neural/Critic/LLM as final authority => blocked_authority_shift   |
| status: BLOCKED                                                        |
| surfaces: active_runtime_code, tests, canonical_docs                   |
| question: approve one bounded Search authority trace patch, block, or   |
|           request revision?                                            |
+------------------------------------------------------------------------+
```

## Matrix Columns

The Fusion Matrix columns are fixed:

| Column | Purpose | Allowed status values |
| --- | --- | --- |
| `scope` | Shows task boundary, files, zones, and non-goals. | IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN |
| `route` | Shows output routing, target path, duplicate risk, and destination clarity. | IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN |
| `evidence` | Shows source readback, command output references, and evidence limits. | IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN |
| `unknowns` | Shows uninspected, unregistered, stale, or undecided items. | IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN |
| `blocked_actions` | Shows all forbidden actions that remain locked. | IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN |
| `claims` | Shows whether a claim is allowed, blocked, or unsupported. | IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN |
| `drift` | Shows source, route, doc, path, or authority drift. | IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN |
| `hidden_activation_risk` | Shows hidden runtime, prototype, agent, gameplay, model, or CI activation risk. | IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN |
| `HumanGate_question` | Shows the next human decision question. | IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN |

## Agent Rows / Cards

Each row/card must preserve the agent's role and limits:

| Row/Card | Display purpose | Status | Cannot do |
| --- | --- | --- | --- |
| Cartographer | Map the candidate to surfaces, paths, zones, and route questions. | PASSIVE | execute, mutate, validate claims, authorize work |
| HygieneAgent | Check required fields, controlled statuses, surfaces, route presence, and blocked actions. | PASSIVE | decide truth, repair silently, execute |
| TruthAgent | Separate evidence from claims, unknowns, source-state gaps, and blocked surfaces. | PASSIVE | promote docs to implementation, promote logs to proof, authorize claims |
| FusionAuditor | Merge Cartographer, HygieneAgent, and TruthAgent into one pre-RedTeam packet. | PASSIVE | approve execution, activate runtime, self-validate |
| CartographerRedTeam | Challenge the FusionAuditor packet and expose objections. | PASSIVE | replace HumanGate, mutate, approve |
| HumanGate | Select one bounded next step, block, or request revision. | DOCUMENTED_ONLY | silently mutate repo through this spec |

Row/card schema:

```yaml
agent_card:
  agent_id: cartographer | hygiene_agent | truth_agent | fusion_auditor | cartographer_redteam | humangate
  row_status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  scope: ""
  route: ""
  evidence: ""
  unknowns: []
  blocked_actions: []
  claims: []
  drift: []
  hidden_activation_risk: []
  humangate_question: ""
```

## Status, Severity, and Surface Legend

Status and severity display must use only:

```yaml
allowed_status_and_severity_values:
  - IMPLEMENTED
  - TESTED
  - DOCUMENTED_ONLY
  - PASSIVE
  - BLOCKED
  - NOT_FOUND
  - UNKNOWN
```

Severity mapping:

| Visual severity | Meaning |
| --- | --- |
| BLOCKED | A forbidden action, unsupported claim, activation risk, or authority shift is present. |
| UNKNOWN | Required evidence, source registration, route authority, or decision is missing. |
| NOT_FOUND | Expected source, path, or evidence was checked and absent. |
| DOCUMENTED_ONLY | The item exists only as documentation or planning material. |
| PASSIVE | Read-only observation or inactive surface. |
| TESTED | Targeted validation evidence exists for a bounded item. |
| IMPLEMENTED | A bounded implementation exists, without implying promotion or claim authority. |

Canonical surface display must use only:

```yaml
canonical_surfaces:
  - active_runtime_code
  - tests
  - artifacts_runtime_outputs
  - canonical_docs
  - roadmap_docs_only
  - inference
```

## Extra Surface Mapping

Extra studioctl or UxPilote surfaces must be displayed as mapped extensions:

```yaml
extra_surface_mapping:
  scripts_tooling:
    canonical_surface: artifacts_runtime_outputs
    display_rule: show extension label and mapped canonical surface
    default_status: PASSIVE
  lab:
    canonical_surface: artifacts_runtime_outputs
    display_rule: show as runtime artifact surface, creation blocked by default
    default_status: PASSIVE
  schemas:
    canonical_surface: canonical_docs or artifacts_runtime_outputs depending context
    display_rule: schema docs map to canonical_docs; generated schema outputs map to artifacts_runtime_outputs
    default_status: UNKNOWN
  models_datasets:
    canonical_surface: inference or artifacts_runtime_outputs
    display_rule: planning maps to inference; generated files map to artifacts_runtime_outputs; blocked by default
    default_status: BLOCKED
  secrets:
    canonical_surface: artifacts_runtime_outputs
    display_rule: never show secret values; display policy boundary only
    default_status: BLOCKED
```

## Matrix Input Schema

```yaml
fusion_matrix_input:
  schema_version: uxpilote_fusion_matrix_input.v0
  chain_candidate:
    chain_id: string
    title: string
    zone: string
    subzone: string
    authority_level: read_only | docs_only | patch_proposal | runtime_locked
    target_files:
      - string
    reference_only_paths:
      - string
    expected_output: string
    output_route: string
  cartographer_findings:
    scope: []
    route: []
    surfaces:
      - active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
    missing_sources: []
  hygiene_findings:
    missing_fields: []
    invalid_status_values: []
    invalid_surface_values: []
    blocked_action_findings: []
    route_findings: []
  truth_findings:
    evidence: []
    unknowns: []
    blocked_claims: []
    source_state_gaps: []
    drift: []
  fusion_auditor_packet:
    synthesis: string
    unresolved_conflicts: []
    status_by_surface: {}
    proposed_next_step: string
  redteam_objections:
    objections: []
    missing_surfaces: []
    hidden_activation_risks: []
    blocked_authority_shift_risks: []
  humangate_input:
    decision_options:
      - approve_one_bounded_step
      - block
      - request_revision
    question: string
```

## Matrix Output Schema

```yaml
fusion_matrix_output:
  schema_version: uxpilote_fusion_matrix_output.v0
  matrix_id: string
  claim_posture: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
  rows:
    - agent_card
  columns:
    - scope
    - route
    - evidence
    - unknowns
    - blocked_actions
    - claims
    - drift
    - hidden_activation_risk
    - HumanGate_question
  conflicts:
    - conflict_id: string
      conflict_type: unresolved_conflict | blocked_claim | source_state_gap | blocked_activation_risk | blocked_authority_shift
      status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
      surfaces:
        - active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
      summary: string
      humangate_question: string
  humangate_payload:
    decision_options:
      - approve_one_bounded_step
      - block
      - request_revision
    recommended_default: request_revision
    mutation_authorized_by_matrix: false
```

## Selected Conflict Inspector

The selected conflict inspector must display:

```yaml
selected_conflict_inspector:
  conflict_id: string
  conflict_type: unresolved_conflict | blocked_claim | source_state_gap | blocked_activation_risk | blocked_authority_shift
  triggered_by:
    - cartographer
    - hygiene_agent
    - truth_agent
    - fusion_auditor
    - cartographer_redteam
  status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  severity: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  surfaces:
    - active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  source_state:
    created: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    registered: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    loaded: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    enforced: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    evidenced: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  evidence_refs:
    - string
  blocked_actions:
    - string
  claim_posture: NO_CLAIM_ALLOWED
  next_humangate_question: string
```

## Contradiction Rules

Contradiction rules must be computed as display classifications only:

```yaml
contradiction_rules:
  hygiene_ok_truth_docs_only_redteam_risk:
    if: Hygiene OK + Truth docs-only + RedTeam risk
    then: unresolved_conflict
    status: UNKNOWN

  report_log_benchmark_as_proof:
    if: report/log/benchmark used as proof
    then: blocked_claim
    status: BLOCKED

  unregistered_source_used_as_truth:
    if: unregistered source used as truth
    then: source_state_gap
    status: UNKNOWN

  hidden_runtime_prototype_agent_activation:
    if: hidden runtime/prototype/agent activation
    then: blocked_activation_risk
    status: BLOCKED

  neural_critic_llm_as_final_authority:
    if: Neural/Critic/LLM as final authority
    then: blocked_authority_shift
    status: BLOCKED
```

## HumanGate Decision Payload

HumanGate receives the FusionAuditor packet plus RedTeam objections.

```yaml
humangate_decision_payload:
  schema_version: uxpilote_humangate_decision_payload.v0
  input_order:
    - fusion_auditor_packet
    - cartographer_redteam_objections
    - selected_conflicts
  allowed_decisions:
    approve_one_bounded_step:
      status: DOCUMENTED_ONLY
      meaning: Approve one explicitly scoped next task only.
      mutation_by_matrix: false
    block:
      status: BLOCKED
      meaning: Stop the proposed chain or patch path.
      mutation_by_matrix: false
    request_revision:
      status: DOCUMENTED_ONLY
      meaning: Return the candidate for scope, route, evidence, claim, or source-state repair.
      mutation_by_matrix: false
  required_fields:
    - decision
    - bounded_scope
    - blocked_actions_preserved
    - source_state_gaps
    - route_check
    - no_global_ready_verdict
```

## SEARCH-003 Example

Example display for SEARCH-003 authority trace:

```yaml
search_003_example:
  chain_candidate:
    title: DecisionTrace serializable authority field and Search-authority consistency check
    status: DOCUMENTED_ONLY
    scope: future bounded patch only
    no_runtime_behavior_claim: true
  cartographer:
    scope: src/chess/decision_trace.rs, src/chess/decision_trace_bridge.rs, tests/decision_trace_bridge.rs, tests/telemetry_prep.rs
    route: 00_STUDIO_CONTROL/05_STATUS SEARCH-003 charter and HumanGate decision records
    surfaces:
      - active_runtime_code
      - tests
      - canonical_docs
    status: PASSIVE
  hygiene_agent:
    blocked_actions:
      - benchmark
      - gameplay_execution
      - training
      - dataset_generation
      - model_checkpoint_creation_promotion
      - commit_push_branch_PR
    status: PASSIVE
  truth_agent:
    evidence: docs-only charter and HumanGate decision record
    claim_limit: no new runtime behavior is claimed
    status: PASSIVE
  fusion_auditor:
    synthesis: one later bounded Search authority trace patch may be prepared only if HumanGate authorizes execution separately
    unresolved_conflicts:
      - runtime/test mutation is outside this visual spec
    status: PASSIVE
  cartographer_redteam:
    objections:
      - Neural/Critic/LLM final authority must stay blocked
      - benchmark or gameplay output must not be used as proof
      - DecisionController activation remains blocked
    status: PASSIVE
  humangate:
    question: approve one bounded SEARCH-003 patch prompt, block, or request revision?
    decision_options:
      - approve_one_bounded_step
      - block
      - request_revision
    status: DOCUMENTED_ONLY
```

This example does not claim new runtime behavior, test passage, benchmark proof, gameplay proof, model proof, or authority promotion.

## Scripts Route Alignment Example

Example display for scripts route alignment:

```yaml
scripts_route_alignment_example:
  chain_candidate:
    title: scripts route alignment before docs/CI/CODEOWNERS edits
    status: DOCUMENTED_ONLY
  cartographer:
    scope:
      - scripts/
      - scripts/studioV2/
      - scripts/control_plane/
      - scripts/studioV2/control_plane/
      - scripts/operator/
      - scripts/studioV2/operator/
      - scripts/uxpilote/
    route: 00_STUDIO_CONTROL/01_MAPS/SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md
    status: PASSIVE
  hygiene_agent:
    blocked_actions:
      - physical_deletion
      - move_rename
      - shim_creation
      - CI_mutation
      - CODEOWNERS_mutation
      - script_execution
      - Git_actions
    status: PASSIVE
  truth_agent:
    knowns:
      - scripts/studioV2/** is official implementation candidate
      - scripts/control_plane/* are compatibility copies when byte-identical
      - scripts/operator/ is NOT_FOUND when absent
    unknowns:
      - scripts/studioV2/operator/* authority
      - scripts/uxpilote/* registration decision
    status: PASSIVE
  fusion_auditor:
    synthesis: route policy candidate exists, later alignment patches remain gated
    status: PASSIVE
  cartographer_redteam:
    objections:
      - scripts/uxpilote remains UNKNOWN and candidate-only
      - root scripts references must not be silently rewritten
      - blocked runners are visible only as BLOCKED controls
    status: PASSIVE
  humangate:
    question: approve one bounded docs/CI/CODEOWNERS alignment proposal, block, or request revision?
    decision_options:
      - approve_one_bounded_step
      - block
      - request_revision
    status: DOCUMENTED_ONLY
```

This example preserves `scripts/studioV2/**` as the official implementation candidate and `scripts/uxpilote/*` as `UNKNOWN` until HumanGate registration decision.

## Blocked Actions

```yaml
blocked_actions:
  runtime_implementation: BLOCKED
  prototype_creation: BLOCKED
  prototype_execution: BLOCKED
  agent_activation: BLOCKED
  script_execution: BLOCKED
  src_modification: BLOCKED
  test_modification: BLOCKED
  CI_or_CODEOWNERS_modification: BLOCKED
  ROADMAP_INDEX_registry_source_index_modification: BLOCKED
  benchmark: BLOCKED
  gameplay_execution: BLOCKED
  training: BLOCKED
  dataset_generation_reset: BLOCKED
  model_checkpoint_creation_promotion: BLOCKED
  lab_runs_creation: BLOCKED
  latest_json_creation: BLOCKED
  commit_push_branch_PR: BLOCKED
  readiness_strength_Elo_benchmark_scientific_model_claims: BLOCKED
```

## Future Data Gaps

Known gaps before this visual spec can drive implementation:

- Registered input schema for FusionAuditor packets.
- Registered input schema for CartographerRedTeam objections.
- Stable conflict ID generation.
- Stable mapping between `studioctl` JSON payloads and Fusion Matrix rows.
- HumanGate decision record source command.
- Visual severity rendering rules for a future UI.
- Source registration decision for UxPilote docs and scripts.
- A HumanGate-approved route for any future prototype.

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

The Fusion Matrix does not produce a global ready or not-ready verdict. It preserves component-level status, conflicts, RedTeam objections, HumanGate questions, and blocked actions separately.
