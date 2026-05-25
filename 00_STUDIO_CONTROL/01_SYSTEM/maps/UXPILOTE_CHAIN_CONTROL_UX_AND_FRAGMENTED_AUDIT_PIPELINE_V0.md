# UxPilote Chain Control UX and Fragmented Audit Pipeline V0

Status: DOCUMENTED_ONLY  
Scope: Studio control UX, bounded chain composition, and fragmented audit pipeline design  
Runtime authority: NONE  
Agent activation: BLOCKED  
Training: BLOCKED  
Benchmark: BLOCKED  
Dataset generation: BLOCKED  
Dataset reset: BLOCKED  
Model or checkpoint creation: BLOCKED  
Model promotion: BLOCKED  
Chess960 activation: BLOCKED  
DecisionController activation: BLOCKED  
Claim posture: NO_CLAIM_ALLOWED  

---

## 1. Purpose

UxPilote is the Studio control UX/cockpit for bounded chain composition.

It helps the human operator frame, diagnose, prepare, and visualize controlled work before any execution.

UxPilote does not execute, mutate files, activate agents, promote models, run training, run benchmarks, generate datasets, create run folders, create `latest.json`, commit, push, create branches, or create pull requests.

UxPilote produces controlled intent and task-charter candidates. Execution remains external and requires explicit HumanGate authorization.

---

## 2. Core Principle

```text
Engine owns the world.
Rocky acts on the world.
Neural proposes and reranks.
Search decides.
Routage records.
Evidence qualifies.
HumanGate authorizes.
````

UxPilote frames.
Cartographer maps.
HygieneAgent checks.
TruthAgent qualifies.
FusionAuditor merges.
CartographerRedTeam challenges.
HumanGate authorizes.
Codex executes only after explicit bounded authorization.

---

## 3. Engine / Rocky Separation

### Engine

Engine is the playable world layer.

It owns:

* games
* rules
* playable state
* legal actions
* simulation
* future game modes

Engine is not Rocky.

### Rocky

Rocky is the AI action layer over the Engine.

Rocky is composed of:

* Neural
* Search
* Neural/Search fusion
* observability

Rocky acts on the world but does not contain the world.

### Neural

Neural may:

* propose
* rank
* rerank
* provide candidate signals

Neural must not be treated as final tactical authority by itself.

### Search

Search remains final tactical authority for gameplay decisions unless a later explicit HumanGate task changes the architecture with matching active code and tests.

### HumanGate

HumanGate is final authority for:

* mutation
* activation
* promotion
* claim
* costly run
* runtime authority change
* model or checkpoint promotion
* dataset promotion
* branch, commit, push, or pull request

---

## 4. UxPilote UX Model

UxPilote uses dependent menus to compose a bounded chain.

### 4.1 Chain Type

Allowed values:

* Hygiene
* Truth
* Upgrade

Meaning:

| Chain type | Primary intent                                                            | Default authority |
| ---------- | ------------------------------------------------------------------------- | ----------------- |
| Hygiene    | Detect noise, drift, routing ambiguity, missing fields, duplicate outputs | read_only         |
| Truth      | Separate evidence, claim, unknown, and blocked surfaces                   | read_only         |
| Upgrade    | Prepare a bounded improvement proposal                                    | patch_proposal    |

Upgrade does not mean implementation.

### 4.2 Target Zone

Allowed values:

* Engine
* Rocky
* Routage
* Evidence
* Studio Control

### 4.3 Contextual Subzones

If zone is Engine:

* Games
* Rules
* Simulation
* Actions
* State

If zone is Rocky:

* Neural
* Search
* Fusion Neural/Search
* Observability

If zone is Routage:

* Output routing
* File registry
* Reports
* Archives
* Quarantine

If zone is Evidence:

* Evidence packet
* Claims
* Status by surface
* Validation

If zone is Studio Control:

* Source anchoring
* Output routing policy
* AutoDev forms
* Prompt gate
* HumanGate records
* Roadmap-only records

### 4.4 Action Mode

Allowed values:

* Inspect
* Compare
* Diagnose
* Validate evidence
* Prepare patch

### 4.5 Authority Level

Allowed values:

* Read-only
* Docs-only
* Patch proposal
* Runtime change locked

Authority mapping:

| Authority level       | Meaning                                               | Mutation           |
| --------------------- | ----------------------------------------------------- | ------------------ |
| Read-only             | Inspect and report only                               | BLOCKED            |
| Docs-only             | Produce or update routed canonical documentation only | HumanGate required |
| Patch proposal        | Prepare task-charter or patch-plan candidate only     | proposal_only      |
| Runtime change locked | Runtime is explicitly out of scope                    | BLOCKED            |

---

## 5. Mandatory Chain Grammar

A chain does not exist until it answers:

* Qui
* Quoi
* Quand
* Comment
* Où
* Pourquoi

### 5.1 Qui

Required fields:

```yaml
qui:
  actor: human | codex | local_llm | tool | rocky | future_agent
  role: planner | inspector | verifier | executor | reviewer
  authority: read_only | docs_only | patch_proposal | runtime_locked
```

### 5.2 Quoi

Required fields:

```yaml
quoi:
  target_object: ""
  task_intent: inspect | diagnose | validate | prepare_patch | execute_bounded
  expected_output: none | summary | evidence_packet | patch_plan | task_charter
```

### 5.3 Quand

Required fields:

```yaml
quand:
  duration_limit: "5m | 15m | 30m | 1h"
  loop_limit: 1
  retry_limit: 0
  stop_condition: ""
  cost_guard: low | medium | high | blocked
```

### 5.4 Comment

Required fields:

```yaml
comment:
  allowed_actions: []
  blocked_actions: []
  validation_mode: readback | targeted_check | test | none
  mutation_policy: forbidden | proposal_only | humangate_required
```

### 5.5 Où

Required fields:

```yaml
ou:
  zone: engine | rocky | routage | evidence | studio_control
  subzone: ""
  target_path: ""
  output_route: ""
```

If a file may be produced, updated, moved, renamed, archived, or generated, `output_route` is mandatory.

### 5.6 Pourquoi

Required fields:

```yaml
pourquoi:
  reason: ""
  implementation_rule: ""
  success_condition: ""
  human_gate_required: true
```

---

## 6. CREATE_CHAIN Gate

```yaml
CREATE_CHAIN:
  status: BLOCKED
  reason: "Chain creation is blocked unless all mandatory fields are complete."
  required:
    - qui.actor
    - qui.role
    - qui.authority
    - quoi.target_object
    - quoi.task_intent
    - quoi.expected_output
    - quand.duration_limit
    - quand.loop_limit
    - quand.retry_limit
    - quand.stop_condition
    - quand.cost_guard
    - comment.allowed_actions
    - comment.blocked_actions
    - comment.validation_mode
    - comment.mutation_policy
    - ou.zone
    - ou.subzone
    - pourquoi.reason
    - pourquoi.implementation_rule
    - pourquoi.success_condition
```

Additional gate:

```yaml
file_output_gate:
  if_file_is_produced_or_modified: output_route_required
  if_output_route_missing: BLOCKED
  if_destination_unclear: BLOCKED
  authority: HumanGate
```

---

## 7. Fragmented Audit Pipeline

UxPilote does not validate its own chains. Every chain must pass through the fragmented audit pipeline before execution.

```text
Chain Candidate
-> Cartographer
-> HygieneAgent
-> TruthAgent
-> FusionAuditor
-> CartographerRedTeam
-> HumanGate
```

### 7.1 Cartographer

Role:

* map the chain candidate to one primary zone and one primary surface;
* identify secondary surfaces;
* identify target path and output route when applicable;
* identify missing source anchors.

Input:

* chain candidate
* loaded source index
* output routing policy
* topology map
* task goal

Output:

* chain map
* surface map
* owner surface
* route requirement
* missing source list

Cannot:

* execute
* mutate
* validate claims
* authorize work
* self-validate

Status:

```yaml
cartographer: PASSIVE
```

### 7.2 HygieneAgent

Role:

* verify required fields;
* verify allowed status values;
* verify allowed surface values;
* verify blocked actions;
* verify output routing presence;
* detect root duplicates and ambiguous destinations.

Input:

* chain map
* task-charter candidate
* output routing policy
* AutoDev contract

Output:

* hygiene report
* missing field list
* invalid status list
* blocked-action findings
* routing findings

Cannot:

* decide truth
* approve execution
* repair scope silently
* mutate files
* self-validate

Status:

```yaml
hygiene_agent: PASSIVE
```

### 7.3 TruthAgent

Role:

* separate evidence from claims;
* classify unknowns and blocked surfaces;
* check whether docs, code, tests, reports, logs, and outputs are being confused;
* keep benchmark/log/report evidence as observation only unless explicitly promoted by HumanGate.

Input:

* chain map
* hygiene report
* source readback
* evidence packets if provided

Output:

* truth packet
* knowns
* unknowns
* blocked claims
* evidence limits
* document drift candidates

Cannot:

* promote docs to implementation
* promote logs to proof
* authorize claims
* mutate files
* self-validate

Status:

```yaml
truth_agent: PASSIVE
```

### 7.4 FusionAuditor

Role:

* merge Cartographer, HygieneAgent, and TruthAgent outputs into one decision packet;
* identify unresolved contradictions;
* identify HumanGate questions;
* prepare the bounded next-step proposal.

Input:

* chain map
* hygiene report
* truth packet

Output:

* fusion packet
* status_by_surface
* unresolved risks
* allowed next-step candidate
* blocked actions

Cannot:

* execute
* mutate
* approve claims
* activate runtime
* self-validate

Status:

```yaml
fusion_auditor: PASSIVE
```

### 7.5 CartographerRedTeam

Role:

* attack the fusion packet;
* detect missing surfaces;
* detect hidden runtime activation;
* detect bad routing;
* detect unsupported claims;
* detect unbounded loops or retries;
* detect Neural/Search authority drift.

Input:

* fusion packet

Output:

* red-team report
* objections
* missing-trigger list
* blocked escalation notes

Cannot:

* execute
* mutate
* approve HumanGate
* replace the fusion packet as authority
* self-validate

Status:

```yaml
cartographer_redteam: PASSIVE
```

### 7.6 HumanGate

Role:

* make the final human decision over one bounded next step.

Input:

* fusion packet
* red-team report
* source-state gaps
* route check
* cost guard
* proposed output route

Output:

* approve
* block
* request revision
* authorize one bounded next step

HumanGate controls:

* mutation
* activation
* promotion
* claim
* commit
* push
* branch
* pull request
* costly run

Status:

```yaml
humangate: DOCUMENTED_ONLY
```

---

## 8. Chain Lifecycle

```yaml
chain_lifecycle:
  1_draft:
    actor: human
    tool: UxPilote
    output: chain_candidate
    status: DOCUMENTED_ONLY

  2_map:
    actor: Cartographer
    output: chain_map
    status: PASSIVE

  3_hygiene:
    actor: HygieneAgent
    output: hygiene_report
    status: PASSIVE

  4_truth:
    actor: TruthAgent
    output: truth_packet
    status: PASSIVE

  5_fusion:
    actor: FusionAuditor
    output: fusion_packet
    status: PASSIVE

  6_redteam:
    actor: CartographerRedTeam
    output: redteam_report
    status: PASSIVE

  7_humangate:
    actor: human
    output: approve | block | request_revision | authorize_one_step
    status: DOCUMENTED_ONLY
```

---

## 9. Anti-Loop, Anti-Cost, Anti-Activation Rules

Every chain must be bounded.

Blocked by default:

* infinite loop
* unbounded retry
* unauthorized benchmark
* training
* dataset generation
* dataset reset
* model or checkpoint creation
* model promotion
* `latest.json` creation
* unauthorized run folder creation
* DecisionController activation
* Chess960 activation
* agent activation
* Neural/Search authority change
* write without output routing
* file creation in ambiguous destination
* root-level Studio Control Markdown creation
* commit
* push
* branch creation
* pull request creation

Cost guard:

```yaml
cost_guard:
  low: "readback, static inspection, small docs-only validation"
  medium: "bounded repo audit or targeted docs validation"
  high: "requires explicit HumanGate"
  blocked: "not allowed in this chain"
```

---

## 10. UxPilote Views

### 10.1 World Map

Displays:

* Engine
* Rocky
* Routage
* Evidence
* Studio Control
* Runs
* Models
* Datasets
* Archives

Purpose:

* global orientation;
* no execution;
* no mutation.

### 10.2 Chain Builder

Displays dependent menus for:

* chain type
* target zone
* subzone
* action mode
* authority level
* Qui / Quoi / Quand / Comment / Où / Pourquoi fields

Purpose:

* create chain candidates only.

### 10.3 Zone Inspector

Displays details by zone.

Engine:

* Games
* Rules
* Simulation
* Actions
* State

Rocky:

* Neural
* Search
* Fusion Neural/Search
* Observability

Routage:

* Output routing
* File registry
* Reports
* Archives
* Quarantine

Evidence:

* Evidence packet
* Claims
* Status by surface
* Validation

Studio Control:

* source anchors
* forms
* prompt gates
* topology
* routing
* HumanGate records

### 10.4 Evidence Board

Displays status by surface:

* active_runtime_code
* tests
* artifacts_runtime_outputs
* canonical_docs
* roadmap_docs_only
* inference

Allowed status values:

* IMPLEMENTED
* TESTED
* DOCUMENTED_ONLY
* PASSIVE
* BLOCKED
* NOT_FOUND
* UNKNOWN

No global ready or not-ready verdict is allowed.

### 10.5 Patch Lab

Patch Lab prepares candidates only.

It may generate:

* task-charter candidate
* patch-plan candidate
* validation-plan candidate
* non-goals list
* blocked-actions list

It must always display:

* target files
* non-goals
* allowed actions
* blocked actions
* validation plan
* output routing
* HumanGate required

Patch Lab must not mutate files by default.

---

## 11. Chain Examples

### 11.1 Truth Chain: Search Authority

```yaml
chain:
  type: truth
  zone: rocky
  subzone: search
  mode: validate_evidence
  authority: read_only
  question: "Does Search remain final tactical authority?"
  rule: "Neural proposes/reranks only. Search decides."
  expected_output: evidence_packet
  mutation_policy: forbidden
  human_gate_required: true
```

### 11.2 Hygiene Chain: Output Routing

```yaml
chain:
  type: hygiene
  zone: routage
  subzone: output_routing
  mode: diagnose
  authority: read_only
  question: "Are there floating outputs or ambiguous destinations?"
  rule: "No produced file without explicit surface, owner, route, and authority."
  expected_output: summary
  mutation_policy: forbidden
  human_gate_required: true
```

### 11.3 Upgrade Chain: Neural/Search Cooperation

```yaml
chain:
  type: upgrade
  zone: rocky
  subzone: fusion_neural_search
  mode: prepare_patch
  authority: patch_proposal
  question: "How can Neural/Search cooperation improve without changing final authority?"
  rule: "Neural proposes. Search decides. No DecisionController activation without HumanGate."
  expected_output: task_charter
  mutation_policy: proposal_only
  human_gate_required: true
```

---

## 12. Future Phases

### Phase 0 — Mental Model Stabilization

Status: DOCUMENTED_ONLY

No implementation.
No file mutation beyond this specification.
No runtime activation.

### Phase 1 — Docs-Only Spec

Status: DOCUMENTED_ONLY

Create this UxPilote specification and register it as a reference source.

### Phase 2 — Task Charter Field Extension

Status: DOCUMENTED_ONLY

Add chain fields to task-charter templates:

* chain_id
* chain_type
* zone
* subzone
* qui
* quoi
* quand
* comment
* ou
* pourquoi
* chain_pipeline_required

No runtime activation.

### Phase 3 — Read-Only Local Prototype

Status: BLOCKED
Blocked until: HumanGate

A local prototype may later read Studio Control docs and display zones/statuses.

It must not write files by default.

### Phase 4 — Patch Lab Candidate Generator

Status: BLOCKED
Blocked until: HumanGate

Patch Lab may later generate task-charter candidates.

It must not execute them.

### Phase 5 — Bounded Activation

Status: BLOCKED
Blocked until: HumanGate

Any activation requires:

* explicit target files
* output routing
* validation plan
* executor report
* HumanGate decision record
* no global ready verdict

---

## 13. Source-State Requirements

UxPilote must preserve source-state separation:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

A chain, report, generated artifact, or roadmap note does not become active truth because it exists.

Required source state for UxPilote-controlled work:

```yaml
source_state:
  created: UNKNOWN
  registered: UNKNOWN
  loaded: UNKNOWN
  enforced: UNKNOWN
  evidenced: UNKNOWN
```

If any required source is missing, stale, or unknown, the relevant chain is BLOCKED.

---

## 14. Output Routing Requirements

Any UxPilote chain that may produce, update, move, rename, archive, delete, or generate a file must declare:

```yaml
output_routing:
  produced_file_type: ""
  intended_surface: ""
  canonical_destination: ""
  temporary_destination: ""
  forbidden_destinations: []
  registration_required: false
  project_source_upload_required: false
  retention_policy: ""
  promotion_gate: "HumanGate"
```

If output routing is missing:

```yaml
status: BLOCKED
reason: output routing unclear
required_action: HumanGate routing decision
```

---

## 15. Status by Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
```

---

## 16. Verdict Posture

```yaml
software_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

evidence_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

claim_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

no_global_ready_verdict: true
```

---

## 17. Non-Authorization

This document does not authorize:

* runtime implementation
* runtime execution
* test modification
* CI execution
* agent activation
* training
* benchmarking
* dataset generation
* dataset reset
* `latest.json` creation
* `lab/runs/RUN_*` creation
* model or checkpoint creation
* model or checkpoint promotion
* Chess960 activation
* DecisionController activation
* Neural/Search authority change
* commit
* push
* branch creation
* pull request creation

Any such action requires a separate explicit HumanGate-approved task charter.
