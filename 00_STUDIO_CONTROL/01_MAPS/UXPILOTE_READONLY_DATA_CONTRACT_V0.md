# UxPilote Readonly Data Contract V0

Task ID: UXPILOTE_READONLY_DATA_CONTRACT_V0

## Status / Non-Authorization

This file is a docs-only data contract candidate for UxPilote maps and panels.

It defines how UxPilote may consume read-only `studioctl` JSON outputs without becoming runtime authority, claim authority, source-truth authority, or promotion authority.

Status:

```yaml
produced_file_type: uxpilote_readonly_data_contract
intended_surface: canonical_docs
canonical_destination: C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\UXPILOTE_READONLY_DATA_CONTRACT_V0.md
registration_required: false
project_source_upload_required: false
retention_policy: Docs-only data contract candidate. Not runtime truth.
promotion_gate: HumanGate
contract_status: DOCUMENTED_ONLY
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

Non-authorization rules:

- UxPilote must not execute runtime, gameplay, benchmark, training, dataset, model, lab, Git, GitHub, PR, or auto-merge actions through this contract.
- UxPilote must treat JSON from `studioctl` as read-only display data unless a separate HumanGate decision promotes a command, schema, or output route.
- Existence of a local file, generated artifact, untracked document, prototype, or previous conversation is not proof of source authority.
- This contract is not registered, loaded, enforced, or evidenced as final project truth by existence.

## Purpose

This contract defines a stable read-only data model for UxPilote maps and panels:

- nodes
- edges
- views
- selected-node inspectors
- status mapping
- surface mapping
- source-state mapping
- blocked-action mapping
- HumanGate decision questions
- data-source commands

The contract is intended to support these UxPilote surfaces:

- Studio Control Map
- Evidence / Claims Map
- Routage / Source Truth Map
- Patch Flow / HumanGate Map
- Scripts Control View

## Active Root and Stale Path Warning

Active root for this contract:

```text
C:\TACTICAL_CHESS_STUDIO
```

All relative paths in this contract resolve from that active root unless explicitly marked as historical.

Historical nested paths such as:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab
```

are stale or historical unless separately verified in the current task. UxPilote must not infer active source truth, route truth, or runtime truth from that nested path without a fresh read-only route check.

## Read-Only Data Source Commands

UxPilote may treat the following commands as candidate read-only data sources. Presence of a command is not proof that the schema is permanent.

```yaml
source_registry:
  - command: python scripts\studioV2\studioctl.py status --json
    source_role: workspace_status
    expected_mutation: false
    allowed_use: read_only_map_input
    status: DOCUMENTED_ONLY

  - command: python scripts\studioV2\studioctl.py evidence board --json
    source_role: evidence_board
    expected_mutation: false
    allowed_use: read_only_map_input
    status: DOCUMENTED_ONLY

  - command: python scripts\studioV2\studioctl.py surface map --json
    source_role: surface_map
    expected_mutation: false
    allowed_use: read_only_map_input
    status: DOCUMENTED_ONLY

  - command: python scripts\studioV2\studioctl.py uxpilote scripts-control --json
    source_role: scripts_control
    expected_mutation: false
    allowed_use: read_only_map_input
    status: DOCUMENTED_ONLY
```

Commands outside this registry remain out of contract until a separate HumanGate decision adds them.

## Canonical Surface Model

UxPilote must normalize project status into the six canonical surfaces:

```yaml
canonical_surfaces:
  active_runtime_code:
    meaning: Runtime code that can affect engine, gameplay, decision, search, neural, or execution behavior.
    uxpilote_default: PASSIVE

  tests:
    meaning: Test files and test execution evidence.
    uxpilote_default: PASSIVE

  artifacts_runtime_outputs:
    meaning: Generated outputs, command output records, read-only tool output, and runtime artifacts.
    uxpilote_default: PASSIVE

  canonical_docs:
    meaning: Control documents, source maps, routed specs, policy docs, and canonical-doc candidates.
    uxpilote_default: DOCUMENTED_ONLY

  roadmap_docs_only:
    meaning: Roadmap, queue, and planning documents that are not runtime authority.
    uxpilote_default: PASSIVE

  inference:
    meaning: Model, inference, neural, or analytical claims that require separate evidence.
    uxpilote_default: PASSIVE
```

UxPilote must display component-level status by surface and must not compress these surfaces into a global ready verdict.

## Studioctl Extension Surface Mapping

`studioctl` may expose additional surfaces. UxPilote must map or label them as extensions instead of silently treating them as canonical surfaces.

```yaml
extension_surface_mapping:
  scripts_tooling:
    canonical_surface: artifacts_runtime_outputs
    display_role: scripts_and_tooling
    status_rule: display_as_extension

  lab:
    canonical_surface: artifacts_runtime_outputs
    display_role: lab_outputs
    status_rule: blocked_for_creation_unless_HumanGate

  schemas:
    canonical_surface: canonical_docs
    display_role: schema_docs_or_contracts
    status_rule: documented_or_unknown_until_registered

  models_datasets:
    canonical_surface: inference
    display_role: model_dataset_surfaces
    status_rule: blocked_for_generation_or_promotion

  secrets:
    canonical_surface: artifacts_runtime_outputs
    display_role: secret_inventory_or_policy_signal
    status_rule: never_display_secret_values
```

Extension surfaces must preserve their original label in the UxPilote inspector so operators can distinguish canonical-surface status from source-specific grouping.

## Status Model

UxPilote status values are limited to:

```yaml
allowed_statuses:
  - IMPLEMENTED
  - TESTED
  - DOCUMENTED_ONLY
  - PASSIVE
  - BLOCKED
  - NOT_FOUND
  - UNKNOWN
```

Status semantics:

- `IMPLEMENTED`: a bounded command, file, or feature exists, but this does not imply promotion or claim authority.
- `TESTED`: targeted validation evidence exists for the bounded item.
- `DOCUMENTED_ONLY`: defined in docs, maps, contracts, or specs only.
- `PASSIVE`: present or observed but not active for the current task.
- `BLOCKED`: intentionally unavailable until HumanGate or a separate authorized task.
- `NOT_FOUND`: expected item was searched for and not found.
- `UNKNOWN`: not decided, not verified, or not registered.

Any source status outside this list must be mapped to `UNKNOWN` and reported as a data gap.

## Source-State Model

UxPilote must display source state as separate fields:

```yaml
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: DOCUMENTED_ONLY
  evidenced: DOCUMENTED_ONLY
```

Rules:

- `created != registered`
- `registered != loaded`
- `loaded != enforced`
- `enforced != evidenced`

UxPilote must not treat creation of this contract as registration. It must not treat registration as runtime loading. It must not treat loading as enforcement. It must not treat enforcement as evidence.

## Node Schema

Each UxPilote node must conform to this contract shape:

```yaml
node:
  id: string
  label: string
  kind: string
  view_ids:
    - string
  family: string
  path: string
  active_root: C:\TACTICAL_CHESS_STUDIO
  source_command: string
  source_role: string
  canonical_surface: active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  extension_surface: string | null
  status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  source_state:
    created: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    registered: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    loaded: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    enforced: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    evidenced: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  authority:
    runtime_authority: false
    claim_authority: false
    source_truth_authority: false
    promotion_authority: false
  evidence:
    command: string
    path: string
    summary: string
  risk:
    level: PASSIVE | BLOCKED | UNKNOWN
    notes:
      - string
  allowed_actions:
    - inspect
    - readback
    - prepare_charter
  blocked_actions:
    - blocked_action_id
  humangate_questions:
    - question_id
  no_global_ready_verdict: true
```

Node IDs must be stable within one JSON payload. Cross-command identity should use path, family, source command, and view ID together until a registered ID scheme exists.

## Edge Schema

Each UxPilote edge must conform to this contract shape:

```yaml
edge:
  id: string
  from_node_id: string
  to_node_id: string
  relation: string
  view_ids:
    - string
  source_command: string
  canonical_surface: active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  evidence:
    command: string
    path: string
    summary: string
  authority:
    can_execute: false
    can_mutate: false
    can_promote: false
  risk:
    level: PASSIVE | BLOCKED | UNKNOWN
    notes:
      - string
```

Allowed relations include:

- `contains`
- `depends_on`
- `routes_to`
- `evidences`
- `claims`
- `blocks`
- `requires_HumanGate`
- `extends_surface`
- `path_drift_pair`

## View Schema

Each UxPilote view must conform to this contract shape:

```yaml
view:
  id: string
  name: string
  purpose: string
  source_commands:
    - string
  canonical_surfaces:
    - active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  extension_surfaces:
    - string
  node_filters:
    families:
      - string
    statuses:
      - IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  edge_filters:
    relations:
      - string
  inspector_schema: selected_node_inspector_v0
  allowed_actions:
    - inspect
    - readback
    - prepare_charter
  blocked_actions:
    - blocked_action_id
  status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  no_global_ready_verdict: true
```

Views may compose nodes from multiple commands, but must preserve each node's original source command.

## Selected Node Inspector Schema

The selected-node inspector must display:

```yaml
selected_node_inspector:
  path: string
  family: string
  surface: active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  extension_surface: string | null
  status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  source_state:
    created: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    registered: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    loaded: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    enforced: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
    evidenced: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  evidence:
    command: string
    path: string
    summary: string
  risk:
    level: PASSIVE | BLOCKED | UNKNOWN
    notes:
      - string
  allowed_actions:
    - inspect
    - readback
    - prepare_charter
  blocked_actions:
    - blocked_action_id
  next_humangate_question:
    question_id: string
    question: string
    status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
```

Allowed actions are display or planning actions only. They do not authorize execution.

## HumanGate Question Schema

HumanGate questions must use this shape:

```yaml
humangate_question:
  question_id: string
  question: string
  source_node_id: string
  decision_surface: active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  decision_type: register | promote | block | route | source_anchor | schema_freeze
  required_for:
    - string
  options:
    - label: string
      result_status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  default_status: BLOCKED
  status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
```

HumanGate questions must be shown as decision requests, not as completed decisions.

## Blocked Action Schema

Blocked actions must use this shape:

```yaml
blocked_action:
  action_id: string
  label: string
  canonical_surface: active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  extension_surface: string | null
  status: BLOCKED
  reason: string
  humangate_required: true
  examples:
    - string
```

Default blocked actions:

```yaml
blocked_actions:
  - action_id: execute_unknown_scripts
    status: BLOCKED
  - action_id: benchmark
    status: BLOCKED
  - action_id: gameplay_execution
    status: BLOCKED
  - action_id: PR_GitHub_automation
    status: BLOCKED
  - action_id: auto_merge
    status: BLOCKED
  - action_id: dataset_generation_reset
    status: BLOCKED
  - action_id: model_checkpoint_creation_promotion
    status: BLOCKED
  - action_id: lab_runs_creation
    status: BLOCKED
  - action_id: latest_json_creation
    status: BLOCKED
  - action_id: commit_push_branch_PR
    status: BLOCKED
```

## View Contracts

### Studio Control Map

```yaml
view:
  id: studio_control_map
  name: Studio Control Map
  source_commands:
    - python scripts\studioV2\studioctl.py status --json
    - python scripts\studioV2\studioctl.py surface map --json
  primary_surfaces:
    - canonical_docs
    - roadmap_docs_only
    - artifacts_runtime_outputs
  purpose: Show routed control surfaces and passive workspace state.
  status: DOCUMENTED_ONLY
```

### Evidence / Claims Map

```yaml
view:
  id: evidence_claims_map
  name: Evidence / Claims Map
  source_commands:
    - python scripts\studioV2\studioctl.py evidence board --json
  primary_surfaces:
    - canonical_docs
    - artifacts_runtime_outputs
    - inference
  purpose: Separate evidence records from claims and keep claim posture visible.
  claim_posture: NO_CLAIM_ALLOWED
  status: DOCUMENTED_ONLY
```

### Routage / Source Truth Map

```yaml
view:
  id: routage_source_truth_map
  name: Routage / Source Truth Map
  source_commands:
    - python scripts\studioV2\studioctl.py status --json
    - python scripts\studioV2\studioctl.py surface map --json
  primary_surfaces:
    - canonical_docs
    - roadmap_docs_only
  purpose: Display route policy, source anchoring, and created/registered/loaded/enforced/evidenced separation.
  status: DOCUMENTED_ONLY
```

### Patch Flow / HumanGate Map

```yaml
view:
  id: patch_flow_humangate_map
  name: Patch Flow / HumanGate Map
  source_commands:
    - python scripts\studioV2\studioctl.py status --json
    - python scripts\studioV2\studioctl.py evidence board --json
  primary_surfaces:
    - tests
    - canonical_docs
    - artifacts_runtime_outputs
  purpose: Show bounded patch state, validation evidence, and unresolved HumanGate decisions.
  status: DOCUMENTED_ONLY
```

### Scripts Control View

```yaml
view:
  id: scripts_control_view
  name: Scripts Control View
  source_commands:
    - python scripts\studioV2\studioctl.py uxpilote scripts-control --json
  primary_surfaces:
    - artifacts_runtime_outputs
    - canonical_docs
  extension_surfaces:
    - scripts_tooling
  purpose: Display scripts/tooling families, path drift, blocked runners, and selected script/tool inspector fields.
  status: DOCUMENTED_ONLY
```

## Scripts Control Contract

The Scripts Control View consumes `python scripts\studioV2\studioctl.py uxpilote scripts-control --json` as a read-only data-source candidate.

Expected top-level fields:

```yaml
scripts_control_payload:
  schema_version: string
  command: uxpilote scripts-control
  cwd: string
  generated_by: studioctl.py
  node_families:
    - studioctl
    - validators
    - control_plane
    - operator
    - uxpilote
    - blocked_runners
    - legacy_root_compatibility
  path_drift:
    - scripts/ vs scripts/studioV2/
    - scripts/control_plane/ vs scripts/studioV2/control_plane/
    - scripts/operator/ vs scripts/studioV2/operator/
    - scripts/uxpilote/ status UNKNOWN until HumanGate registration decision
  known_readonly_entrypoints:
    - python scripts\studioV2\studioctl.py status
    - python scripts\studioV2\studioctl.py evidence board
    - python scripts\studioV2\studioctl.py surface map
    - python scripts\studioV2\studioctl.py status --json
    - python scripts\studioV2\studioctl.py evidence board --json
    - python scripts\studioV2\studioctl.py surface map --json
  blocked_runners:
    benchmark: BLOCKED
    gameplay_execution: BLOCKED
    PR_GitHub_automation: BLOCKED
    auto_merge: BLOCKED
    dataset_generation_reset: BLOCKED
    model_checkpoint_creation_promotion: BLOCKED
    lab_runs_creation: BLOCKED
    latest_json_creation: BLOCKED
    commit_push_branch_PR: BLOCKED
    unknown_script_execution: BLOCKED
  selected_node_inspector_schema:
    - path
    - family
    - surface
    - status
    - evidence
    - risk
    - allowed_actions
    - blocked_actions
    - next_humangate_question
  scripts_uxpilote_status: UNKNOWN
  next_humangate_questions:
    - string
  status_by_surface:
    active_runtime_code: PASSIVE
    tests: PASSIVE
    artifacts_runtime_outputs: IMPLEMENTED
    canonical_docs: DOCUMENTED_ONLY
    roadmap_docs_only: PASSIVE
    inference: PASSIVE
  claim_posture: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

UxPilote must display `scripts/uxpilote` as `UNKNOWN` until HumanGate decides whether it is registered, loaded, enforced, or evidenced.

## Non-Canonical Prototype Material

Non-canonical material handling:

- `scripts/uxpilote` remains `UNKNOWN` until HumanGate registration decision.
- Static web prototype material is visual reference only unless separately routed and registered.
- Godot garden candidate remains candidate-only and risky until separately verified, routed, and approved.
- Untracked status documents, roadmap documents, generated reports, and local prototypes are not source truth by existence.
- Generated cache folders, including `__pycache__`, are passive artifacts unless HumanGate authorizes cleanup.

## Future Data Gaps

Known gaps before this contract can govern UxPilote implementation:

- Registered schema version policy for every `studioctl` JSON source.
- Stable cross-command node identity rules.
- Explicit edge generation rules for source anchoring and route policy.
- HumanGate decision record source command.
- Read-only duplicate-source and stale-path audit command.
- Contracted handling for extension surfaces from `studioctl`.
- Evidence quality levels for evidence-board records.
- Explicit non-secret display rules for secret-related metadata.
- A registered source index entry, if HumanGate later promotes this contract.

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

This contract intentionally provides no global ready or not-ready verdict. UxPilote must report component-level status by surface and preserve blocked HumanGate questions separately.
