# UxPilote 3D World Graph Model V0

Status: DOCUMENTED_ONLY
Surface: canonical_docs
Owner: HumanGate
Runtime authority: NONE
Godot implementation: BLOCKED
Frontend implementation: BLOCKED
Runtime mutation: BLOCKED
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Model promotion: BLOCKED
Claim posture: NO_CLAIM_ALLOWED
HumanGate required: true
No global ready verdict: true

---

## 1. Purpose

This document defines the read-only UxPilote 3D world graph model as a canonical map/specification.

It describes:

- 3D nodes;
- edges;
- Engine, Rocky, Search, Neural, Critic, and Evidence zones;
- visual status mapping;
- zoom levels;
- compatibility with the Rocky boundary guard queue and read-only audits.

This document does not implement a Godot scene, web frontend, runtime module, renderer, data loader, agent, or controller.

---

## 2. Consolidation Posture

This file is the base UX source candidate for UxPilote world maps and cockpit vision.

It consolidates the existing UxPilote chain-control, evidence, routage, HumanGate, and read-only prototype references into one 3D world graph model. It does not create a competing base maps specification and does not supersede any source until HumanGate registration, loading, enforcement, and evidence decisions are made.

```yaml
base_ux_source_candidate:
  target_file: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md"
  status: DOCUMENTED_ONLY
  registered: UNKNOWN
  promoted: false
  canonical_truth_status: "candidate_only_until_HumanGate"
  no_global_ready_verdict: true
```

---

## 3. Base Cockpit Layout

The UxPilote cockpit is a read-only operator view over the Studio world graph.

Base cockpit panels:

| Panel | Purpose | Default authority | Mutation |
| --- | --- | --- | --- |
| World Map Canvas | 3D spatial map of zones, nodes, edges, status tokens, and blocked paths. | read_only | BLOCKED |
| Chain Control Rail | Shows selected chain type, zone, subzone, action mode, authority level, and Qui / Quoi / Quand / Comment / Ou / Pourquoi completeness. | proposal_only | BLOCKED |
| Evidence Board Rail | Shows status by surface, evidence limits, claims, unknowns, blocked claims, and no-global-ready posture. | evidence_only | BLOCKED |
| Routage / Source Truth Rail | Shows output routes, source-state badges, registration gaps, loaded-source status, and destination ambiguity. | evidence_only | BLOCKED |
| Patch Flow / HumanGate Rail | Shows future task-charter candidates, blocked actions, validation plan candidates, and HumanGate decision requirement. | gate_only | BLOCKED |
| Detail Inspector | Shows selected node or edge schema, authority, surface, source state, and evidence limits. | read_only | BLOCKED |

Cockpit invariant:

```yaml
cockpit_invariant:
  displays_state: true
  prepares_candidates: true
  executes_work: false
  mutates_files: false
  activates_agents: false
  promotes_sources: false
  validates_claims: false
  humangate_required: true
```

---

## 4. Map Modes

The 3D world graph supports four base map modes. Map mode changes visibility, grouping, emphasis, and inspector defaults only. A map mode must not change runtime authority, source-state status, mutation rights, or claim posture.

### 4.1 Chain-control World Map

Purpose: show UxPilote as a bounded chain-composition cockpit.

Primary surfaces:

- canonical_docs;
- roadmap_docs_only;
- inference.

Primary zones:

- Engine;
- Rocky;
- Routage;
- Evidence;
- Studio Control;
- HumanGate.

Required overlays:

- chain type;
- target zone and subzone;
- action mode;
- authority level;
- Qui / Quoi / Quand / Comment / Ou / Pourquoi completeness;
- blocked actions;
- HumanGate requirement.

Status:

```yaml
chain_control_world_map:
  status: DOCUMENTED_ONLY
  execution: BLOCKED
  mutation: BLOCKED
  claim_posture: NO_CLAIM_ALLOWED
```

### 4.2 Evidence / Claims Map

Purpose: separate evidence, status, claims, unknowns, blocked claims, and surface boundaries.

Primary displays:

- status_by_surface;
- software_verdict;
- evidence_verdict;
- claim_verdict;
- evidence packets;
- validation records;
- blocked claim paths;
- no_global_ready_verdict.

Evidence rule:

```yaml
evidence_claims_map:
  evidence_is_observation: true
  evidence_is_not_claim_validation: true
  benchmark_proof_claims: BLOCKED
  runtime_strength_claims: BLOCKED
  promotion_claims: BLOCKED
  humangate_required_for_claim: true
```

### 4.3 Routage / Source Truth Map

Purpose: display where sources, reports, queues, maps, and generated candidates belong, and whether they are created, registered, loaded, enforced, and evidenced.

Required source-state badges:

- created;
- registered;
- loaded;
- enforced;
- evidenced.

Required route displays:

- intended_surface;
- produced_file_type;
- canonical_destination;
- temporary_destination;
- forbidden destinations;
- registration_required;
- project_source_upload_required;
- promotion_gate.

Source truth rule:

```yaml
routage_source_truth_map:
  created_is_not_registered: true
  registered_is_not_loaded: true
  loaded_is_not_enforced: true
  enforced_is_not_evidenced: true
  ambiguous_destination: BLOCKED
  root_duplicate_risk: BLOCKED
```

### 4.4 Patch Flow / HumanGate Map

Purpose: display bounded patch-flow candidates without executing them.

Required displays:

- selected target files;
- non-goals;
- allowed actions;
- blocked actions;
- validation plan candidate;
- output routing;
- source-state gaps;
- HumanGate required;
- commit / push / branch / PR blocked status.

Patch flow rule:

```yaml
patch_flow_humangate_map:
  prepares_task_charter_candidates: true
  prepares_patch_plan_candidates: true
  executes_patch: false
  stages_git: false
  commits: false
  pushes: false
  opens_pr: false
  promotion_gate: HumanGate
```

---

## 5. First Zone To Model: scripts/

The first concrete map zone to model is `scripts/`.

Reason:

- `scripts/` contains tooling boundaries that can be inspected without changing runtime gameplay code;
- `scripts/studioV2/studioctl.py` is the intended read-only data source provider for UxPilote cockpit views;
- `scripts/uxpilote` exists as local prototype material but remains UNKNOWN for source truth until HumanGate decides whether to register, keep, quarantine, or discard it.

Initial `scripts/` node candidates:

| Node id | Path | Surface | Status | Notes |
| --- | --- | --- | --- | --- |
| `SCRIPTS_ROOT` | `scripts/` | inference | DOCUMENTED_ONLY | First map zone to model. |
| `STUDIOCTL_TOOLING` | `scripts/studioV2/studioctl.py` | inference | PASSIVE | Read-only output provider intent only in this document. |
| `UXPILOTE_SCRIPT_PROTOTYPE` | `scripts/uxpilote/` | inference | UNKNOWN | Candidate-only until HumanGate registration decision. |

This section does not authorize script modification, script execution, prototype execution, code promotion, source registration, or runtime activation.

---

## 6. Scripts Control View

The Scripts Control View is the first concrete UxPilote zone model. It displays the `scripts/` tooling surface as a read-only control screen so the operator can inspect known tooling families, path drift, read-only entrypoints, blocked runners, and HumanGate questions before any script execution or registration decision.

This view is documentation-only. It does not execute scripts, modify scripts, register `scripts/uxpilote`, run validators, start prototypes, run benchmarks, run gameplay, create datasets, create models, create lab runs, create `latest.json`, automate GitHub, or perform Git actions.

### 6.1 Scripts Control Screen Mockup

```text
+ UxPilote / Scripts Control View ---------------------------------------+
| Zone: scripts/                         Status: DOCUMENTED_ONLY         |
| Source: base UX candidate              no_global_ready_verdict: true    |
+------------------------------------------------------------------------+
| Families                         | Path Drift                           |
| [studioctl] PASSIVE              | scripts/                             |
| [validators] PASSIVE             | scripts/studioV2/                    |
| [control_plane] UNKNOWN          | scripts/control_plane/               |
| [operator] UNKNOWN               | scripts/studioV2/control_plane/      |
| [uxpilote] UNKNOWN               | scripts/operator/                    |
| [blocked runners] BLOCKED        | scripts/studioV2/operator/           |
| [legacy/root compatibility] UNKNOWN                                   |
+------------------------------------------------------------------------+
| Read-only entrypoints                                                   |
| - python scripts\studioV2\studioctl.py status                           |
| - python scripts\studioV2\studioctl.py evidence board                   |
| - python scripts\studioV2\studioctl.py surface map                      |
+------------------------------------------------------------------------+
| Selected node inspector                                                 |
| path: scripts/studioV2/studioctl.py                                     |
| family: studioctl                                                       |
| surface: inference                                                      |
| status: PASSIVE                                                         |
| evidence: readback candidate only                                       |
| risk: execution authority must stay blocked                             |
| allowed_actions: inspect, readback, prepare charter                     |
| blocked_actions: execute unknown scripts, benchmark, gameplay, GitHub   |
| next_humangate_question: register, load, enforce, or keep passive?      |
+------------------------------------------------------------------------+
```

### 6.2 Node Families

| Family | Display purpose | Surface | Status | Rule |
| --- | --- | --- | --- | --- |
| `studioctl` | Show known read-only command families that can feed cockpit views after separate authorization. | inference | PASSIVE | Display only; no execution from this document. |
| `validators` | Show validation helpers as possible future readback targets. | inference | PASSIVE | Inspect and prepare charter only. |
| `control_plane` | Show control-plane script locations and path drift. | inference | UNKNOWN | HumanGate must decide source truth before use. |
| `operator` | Show operator script locations and path drift. | inference | UNKNOWN | HumanGate must decide source truth before use. |
| `uxpilote` | Show local UxPilote prototype material. | inference | UNKNOWN | `scripts/uxpilote` remains UNKNOWN until HumanGate registration decision. |
| `blocked runners` | Show runner classes that are explicitly blocked in this view. | artifacts_runtime_outputs | BLOCKED | No runner execution. |
| `legacy/root compatibility paths` | Show compatibility or drift paths without promoting them. | inference | UNKNOWN | Created or discovered paths are not source truth by existence. |

Allowed status values in this view are only:

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

### 6.3 Known Read-only Entrypoints

These entrypoints are displayed as intended read-only `studioctl` data providers. This document does not run them.

```text
python scripts\studioV2\studioctl.py status
python scripts\studioV2\studioctl.py evidence board
python scripts\studioV2\studioctl.py surface map
```

```yaml
known_read_only_entrypoints:
  studio_status:
    command_display: "python scripts\\studioV2\\studioctl.py status"
    status: DOCUMENTED_ONLY
    execution_authorized: false
  evidence_board:
    command_display: "python scripts\\studioV2\\studioctl.py evidence board"
    status: DOCUMENTED_ONLY
    execution_authorized: false
  surface_map:
    command_display: "python scripts\\studioV2\\studioctl.py surface map"
    status: DOCUMENTED_ONLY
    execution_authorized: false
```

### 6.4 Path Drift Display

The Scripts Control View must show path drift without resolving it silently.

| Path | Display role | Status | HumanGate question |
| --- | --- | --- | --- |
| `scripts/` | scripts root surface | DOCUMENTED_ONLY | Which subpaths should be modeled first? |
| `scripts/studioV2/` | known Studio tooling lane | PASSIVE | Which entrypoints are approved for read-only display? |
| `scripts/control_plane/` | possible root compatibility path | UNKNOWN | Is this active, legacy, absent, or drift? |
| `scripts/studioV2/control_plane/` | possible Studio V2 control-plane path | UNKNOWN | Is this the preferred control-plane location? |
| `scripts/operator/` | possible root operator path | UNKNOWN | Is this active, legacy, absent, or drift? |
| `scripts/studioV2/operator/` | possible Studio V2 operator path | UNKNOWN | Is this the preferred operator location? |
| `scripts/uxpilote/` | local UxPilote prototype material | UNKNOWN | Should HumanGate register, load, enforce, evidence, archive, quarantine, or discard it? |

Path drift rule:

```yaml
path_drift_display:
  silent_path_substitution: BLOCKED
  root_compatibility_assumption: BLOCKED
  studioV2_preference_claim: BLOCKED
  humangate_required_for_resolution: true
```

### 6.5 Blocked Runners

The blocked runners panel displays runner classes that must remain unavailable from this view.

| Runner class | Surface | Status | Blocked action |
| --- | --- | --- | --- |
| `benchmark` | artifacts_runtime_outputs | BLOCKED | benchmark |
| `gameplay` | active_runtime_code | BLOCKED | gameplay execution |
| `PR/GitHub` | canonical_docs | BLOCKED | PR/GitHub automation |
| `auto-merge` | canonical_docs | BLOCKED | auto-merge |
| `dataset/model/lab/latest.json surfaces` | artifacts_runtime_outputs | BLOCKED | dataset generation/reset, model/checkpoint creation or promotion, lab/runs creation, latest.json creation |

### 6.6 Selected Script Tool Inspector

Every selected script or tool node must expose these inspector fields:

```yaml
selected_script_tool_inspector:
  path: ""
  family: studioctl | validators | control_plane | operator | uxpilote | blocked_runners | legacy_root_compatibility_paths
  surface: active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  evidence: ""
  risk: ""
  allowed_actions:
    - inspect
    - readback
    - prepare charter
  blocked_actions:
    - execute unknown scripts
    - benchmark
    - gameplay execution
    - PR/GitHub automation
    - auto-merge
    - dataset generation/reset
    - model/checkpoint creation or promotion
    - lab/runs creation
    - latest.json creation
    - commit/push/branch/PR
  next_humangate_question: ""
```

### 6.7 Scripts Control Authorization

```yaml
scripts_control_view:
  task_id: UXPILOTE_SCRIPTS_CONTROL_VIEW_SPEC_V0
  status: DOCUMENTED_ONLY
  scripts_uxpilote_status: UNKNOWN
  allowed_actions:
    - inspect
    - readback
    - prepare charter
  blocked_actions:
    - execute unknown scripts
    - benchmark
    - gameplay execution
    - PR/GitHub automation
    - auto-merge
    - dataset generation/reset
    - model/checkpoint creation or promotion
    - lab/runs creation
    - latest.json creation
    - commit/push/branch/PR
  humangate_required: true
  no_global_ready_verdict: true
```

---

## 7. Read-only Data Source Intent

UxPilote cockpit data should be read from existing `studioctl` outputs when a later HumanGate-approved task authorizes implementation or prototype work.

Intended read-only `studioctl` output families:

| Data view | Intended command family | Cockpit use | Status |
| --- | --- | --- | --- |
| Studio status | `studioctl status --json` | world summary and blocked-action posture | DOCUMENTED_ONLY |
| Evidence board | `studioctl evidence board --json` | Evidence / Claims Map panels | DOCUMENTED_ONLY |
| Surface map | `studioctl surface map --json` | status_by_surface and surface overlays | DOCUMENTED_ONLY |

Data source rules:

```yaml
read_only_data_source_intent:
  source_provider: "scripts/studioV2/studioctl.py"
  allowed_intent: "read existing structured outputs"
  writes_allowed: false
  script_changes_allowed: false
  prototype_execution_authorized_by_this_doc: false
  future_loader_authorization_required: HumanGate
```

This document does not assert that a cockpit loader is implemented. It records the intended data-source shape for a future separately authorized task.

---

## 8. Non-Canonical Prototype Material

Prototype material is visual or candidate evidence only. It must not be treated as canonical truth, runtime implementation, registered source, loaded project truth, or claim validation.

```yaml
non_canonical_prototype_material:
  static_web_prototype:
    status: PASSIVE
    use: "visual_reference_only"
    canonical_truth: false
    implementation_authority: BLOCKED
  godot_garden_candidate:
    status: UNKNOWN
    use: "candidate_only"
    risk: "HIGH"
    canonical_truth: false
    implementation_authority: BLOCKED
  scripts_uxpilote:
    status: UNKNOWN
    use: "candidate_only_until_HumanGate_registration_decision"
    registered: UNKNOWN
    loaded: UNKNOWN
    enforced: UNKNOWN
    evidenced: UNKNOWN
```

HumanGate must decide whether any prototype material is registered, loaded, enforced, evidenced, archived, quarantined, or discarded.

---

## 9. Source State

```yaml
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY
  enforced: DOCUMENTED_ONLY
  evidenced: DOCUMENTED_ONLY
  rule: "created != registered; registered != loaded; loaded != enforced; enforced != evidenced"
```

Loaded sources for this task:

- `AGENTS.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md`
- `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
- `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md`
- `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md`
- `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md`
- `00_STUDIO_CONTROL/05_STATUS/UXPILOTE_PHASE_2_CLOSURE_STATUS_V0.md`
- `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md`
- `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_3D_UX_PATCH_CHAIN_QUEUE_V0.yaml`
- `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_3D_UX_QUEUE_POPULATION_V0.yaml`
- `00_STUDIO_CONTROL/05_STATUS/UXPILOTE_READ_ONLY_ACCEPTANCE_AUDIT_V0.md`
- `00_STUDIO_CONTROL/05_STATUS/UXPILOTE_READ_ONLY_PROTOTYPE_REPORT_V0.md`
- `scripts/uxpilote/README.md`

This file is updated locally as documentation only. It is not registered, promoted, uploaded, activated, or treated as runtime truth by existence or update alone.

---

## 10. Authority Boundary

```yaml
authority_boundary:
  uxpilote_3d_world_graph_model:
    authority: docs_only
    mutation: BLOCKED
    execution: BLOCKED
    implementation: BLOCKED
  humangate:
    authority: decision_authority
    required_for:
      - implementation
      - runtime mutation
      - frontend creation
      - Godot scene creation
      - source registration
      - activation
      - claims
  search:
    role: final_tactical_authority
    status: DOCUMENTED_ONLY
  neural:
    role: proposal_rerank_helper_only
    status: DOCUMENTED_ONLY
  critic:
    role: guard_helper_only
    status: DOCUMENTED_ONLY
  decision_controller:
    activation: BLOCKED
```

Search remains the final gameplay decision authority. Neural may propose, rank, rerank, or provide helper signals only. Critic may guard, flag, annotate, or warn only. No LLM, Critic, Neural, or 3D UI node may select a final move.

---

## 11. Zone Model

The 3D world graph uses six primary zones.

| Zone | Purpose | Authority posture | Default status |
| --- | --- | --- | --- |
| Engine | World, rules, playable state, legal actions, simulation. | Runtime truth, not modified by this map. | PASSIVE |
| Rocky | AI action layer over Engine. | Acts on the world only through bounded authorized runtime paths. | PASSIVE |
| Search | Final tactical decision authority. | Final authority for gameplay action selection. | DOCUMENTED_ONLY |
| Neural | Candidate proposal, ranking, reranking, helper signals. | Proposal/helper only. | DOCUMENTED_ONLY |
| Critic | Risk guard, anomaly flagger, evidence helper. | Guard/helper only. | DOCUMENTED_ONLY |
| Evidence | Reports, traces, validation, status by surface, claims. | Qualifies evidence; does not promote claims. | DOCUMENTED_ONLY |

Additional contextual zones may be displayed as secondary shells:

- Studio Control;
- Routage;
- Datasets;
- Models;
- Runs;
- Archives.

Secondary shells are visual context only. They do not authorize writes, execution, promotion, or activation.

---

## 12. Node Model

Each 3D node must be represented as data before any future renderer consumes it.

```yaml
node_schema:
  id: ""
  label: ""
  zone: engine | rocky | search | neural | critic | evidence | studio_control | routage | datasets | models | runs | archives
  node_type: authority | subsystem | artifact | evidence | gate | risk | status
  surface: active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference
  status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  authority: final | helper | proposal_only | evidence_only | gate_only | blocked
  mutation_allowed: false
  execution_allowed: false
  humangate_required: true
  source_state:
    created: UNKNOWN
    registered: UNKNOWN
    loaded: UNKNOWN
    enforced: UNKNOWN
    evidenced: UNKNOWN
```

Required primary nodes:

| Node id | Label | Zone | Node type | Authority | Status |
| --- | --- | --- | --- | --- | --- |
| `ENGINE_WORLD` | Engine World | engine | subsystem | final_runtime_truth | PASSIVE |
| `ENGINE_RULES` | Rules | engine | subsystem | final_runtime_truth | PASSIVE |
| `ENGINE_STATE` | Playable State | engine | subsystem | final_runtime_truth | PASSIVE |
| `ENGINE_ACTIONS` | Legal Actions | engine | subsystem | final_runtime_truth | PASSIVE |
| `ROCKY_LAYER` | Rocky | rocky | subsystem | bounded_actor | PASSIVE |
| `SEARCH_AUTHORITY` | Search Authority | search | authority | final | DOCUMENTED_ONLY |
| `NEURAL_PROPOSER` | Neural Proposer | neural | subsystem | proposal_only | DOCUMENTED_ONLY |
| `NEURAL_RERANKER` | Neural Reranker | neural | subsystem | helper | DOCUMENTED_ONLY |
| `CRITIC_GUARD` | Critic Guard | critic | subsystem | helper | DOCUMENTED_ONLY |
| `DECISION_CONTROLLER` | DecisionController | rocky | gate | blocked | BLOCKED |
| `EVIDENCE_BOARD` | Evidence Board | evidence | evidence | evidence_only | DOCUMENTED_ONLY |
| `CLAIM_GATE` | Claim Gate | evidence | gate | gate_only | BLOCKED |
| `HUMANGATE` | HumanGate | studio_control | gate | final_human_authority | DOCUMENTED_ONLY |

Required status nodes:

| Node id | Label | Status |
| --- | --- | --- |
| `STATUS_IMPLEMENTED` | Implemented | IMPLEMENTED |
| `STATUS_TESTED` | Tested | TESTED |
| `STATUS_DOCUMENTED_ONLY` | Documented Only | DOCUMENTED_ONLY |
| `STATUS_PASSIVE` | Passive | PASSIVE |
| `STATUS_BLOCKED` | Blocked | BLOCKED |
| `STATUS_NOT_FOUND` | Not Found | NOT_FOUND |
| `STATUS_UNKNOWN` | Unknown | UNKNOWN |

---

## 13. Edge Model

Edges describe dependency, authority, evidence, and blocked-flow relationships.

```yaml
edge_schema:
  id: ""
  from: ""
  to: ""
  edge_type: authority | proposal | rerank | guard | evidence | route | blocked | humangate
  direction: directed
  status: IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN
  rule: ""
  mutation_allowed: false
  execution_allowed: false
```

Required authority edges:

| Edge id | From | To | Type | Status | Rule |
| --- | --- | --- | --- | --- | --- |
| `ENGINE_TO_ROCKY_CONTEXT` | `ENGINE_WORLD` | `ROCKY_LAYER` | evidence | PASSIVE | Engine provides world context; this map does not mutate Engine. |
| `NEURAL_TO_SEARCH_PROPOSAL` | `NEURAL_PROPOSER` | `SEARCH_AUTHORITY` | proposal | DOCUMENTED_ONLY | Neural may provide candidates only. |
| `NEURAL_RERANK_TO_SEARCH` | `NEURAL_RERANKER` | `SEARCH_AUTHORITY` | rerank | DOCUMENTED_ONLY | Reranking may inform but not decide. |
| `CRITIC_TO_SEARCH_GUARD` | `CRITIC_GUARD` | `SEARCH_AUTHORITY` | guard | DOCUMENTED_ONLY | Critic may flag risk; Search remains final authority. |
| `SEARCH_TO_ACTIONS_FINAL` | `SEARCH_AUTHORITY` | `ENGINE_ACTIONS` | authority | DOCUMENTED_ONLY | Final selected action must be Search-authorized. |
| `SEARCH_TO_EVIDENCE` | `SEARCH_AUTHORITY` | `EVIDENCE_BOARD` | evidence | DOCUMENTED_ONLY | Search authority traces may be represented as evidence. |
| `CRITIC_TO_EVIDENCE` | `CRITIC_GUARD` | `EVIDENCE_BOARD` | evidence | DOCUMENTED_ONLY | Critic findings are evidence signals, not final decisions. |
| `HUMANGATE_TO_ACTIVATION` | `HUMANGATE` | `DECISION_CONTROLLER` | humangate | BLOCKED | Activation requires separate HumanGate authorization. |

Required blocked edges:

| Edge id | From | To | Status | Rule |
| --- | --- | --- | --- |
| `BLOCK_NEURAL_FINAL_MOVE` | `NEURAL_PROPOSER` | `ENGINE_ACTIONS` | BLOCKED | Neural must not select final gameplay actions. |
| `BLOCK_CRITIC_FINAL_MOVE` | `CRITIC_GUARD` | `ENGINE_ACTIONS` | BLOCKED | Critic must not select final gameplay actions. |
| `BLOCK_LLM_FINAL_MOVE` | `ROCKY_LAYER` | `ENGINE_ACTIONS` | BLOCKED | LLM authority must stay outside the critical gameplay decision loop. |
| `BLOCK_DECISION_CONTROLLER_ACTIVATION` | `DECISION_CONTROLLER` | `ENGINE_ACTIONS` | BLOCKED | DecisionController stays inactive until separately authorized. |
| `BLOCK_EVIDENCE_TO_CLAIM` | `EVIDENCE_BOARD` | `CLAIM_GATE` | BLOCKED | Evidence does not become claim validation without HumanGate. |

---

## 14. Visual Status Mapping

The visual model must preserve controlled status values. Color names are semantic; exact palette selection belongs to a future UI task.

| Status | Visual token | Shape | Motion | Meaning |
| --- | --- | --- | --- | --- |
| IMPLEMENTED | implemented_green | solid cube | stable | Active implementation evidence exists. |
| TESTED | tested_blue | solid cube with ring | stable pulse | Validation evidence exists. |
| DOCUMENTED_ONLY | documented_white | flat panel | static | Documentation-only source or rule. |
| PASSIVE | passive_gray | translucent node | slow idle | Read-only or inactive observation. |
| BLOCKED | blocked_red | locked prism | none | Explicitly forbidden or gated action. |
| NOT_FOUND | not_found_black | hollow node | none | Expected source or evidence absent. |
| UNKNOWN | unknown_yellow | dashed sphere | low flicker | Evidence insufficient or not inspected. |

Authority visual rules:

- final authority nodes use a crown/ring marker only for Search and HumanGate within their separate scopes;
- helper/proposal nodes use smaller satellites around the authority node;
- blocked final-move paths use red dashed edges with lock markers;
- evidence-only paths use thin neutral edges;
- HumanGate gates use a visible stop marker before any activation, promotion, or claim edge.

---

## 15. Zoom Levels

The 3D graph uses bounded zoom levels. Zoom changes visibility only; zoom must not change authority, execution, or mutation state.

| Level | Name | Visible content | Purpose |
| --- | --- | --- | --- |
| 0 | Studio Globe | Primary zones only. | Quick orientation across Engine, Rocky, Search, Neural, Critic, and Evidence. |
| 1 | Zone Shell | Zone labels, status summary, blocked gates. | Show which zones are active, passive, documented, blocked, or unknown. |
| 2 | Authority Map | Search, Neural, Critic, DecisionController, HumanGate, Evidence Board. | Inspect authority relationships and blocked final-move paths. |
| 3 | Node Detail | Node schema fields, source state, status, authority, edge list. | Inspect one node without executing any action. |
| 4 | Evidence Trace | Evidence and route edges with source-state badges. | Inspect evidence limits and claim gates. |
| 5 | Patch Candidate Preview | Candidate task-charter or patch-plan placeholder nodes only. | Prepare bounded future work for HumanGate review. |

Zoom level 5 remains proposal-only. It must not create files, execute chains, run tests, activate agents, or mutate runtime.

---

## 16. Read-Only Interaction Model

Allowed future read-only interactions:

- rotate world graph;
- pan and zoom;
- select node;
- inspect edge;
- filter by zone;
- filter by status;
- filter by surface;
- show blocked paths;
- show source-state badges;
- export no files by default;
- prepare candidate text only after HumanGate authorizes a separate task.

Blocked interactions:

- execute chain;
- run runtime commands;
- write files;
- patch code;
- patch tests;
- start training;
- run benchmark;
- generate dataset;
- reset dataset;
- create `latest.json`;
- create `lab/runs/RUN_*`;
- create model or checkpoint;
- promote model;
- activate Chess960;
- activate DecisionController;
- activate agents;
- commit;
- push;
- create branch;
- open pull request.

---

## 17. Compatibility

```yaml
compatible_with:
  ROCKY_BOUNDARY_GUARD_QUEUE_V0:
    status: DOCUMENTED_ONLY
    reason: "This model preserves Search final authority, Neural helper-only role, Critic helper-only role, and DecisionController blocked status."
  read_only_audits:
    status: DOCUMENTED_ONLY
    reason: "This model exposes node, edge, source-state, and status fields for passive audit inspection."
```

This model is compatible with future read-only audit planning because all nodes and edges can be inspected as passive evidence candidates. It is not a validation result, benchmark result, gameplay proof, model proof, or activation proof.

---

## 18. Future Validation Candidates

These are future candidates only. They are not executed by this document.

| Candidate id | Purpose | Status |
| --- | --- | --- |
| `WORLD_GRAPH_SCHEMA_CHECK` | Check that each node and edge includes required schema fields. | DOCUMENTED_ONLY |
| `STATUS_TOKEN_CHECK` | Check that every visual status maps to an allowed status value. | DOCUMENTED_ONLY |
| `SEARCH_AUTHORITY_EDGE_CHECK` | Check that final gameplay action edges originate from Search authority. | DOCUMENTED_ONLY |
| `NEURAL_HELPER_ONLY_EDGE_CHECK` | Check that Neural edges are proposal or rerank only. | DOCUMENTED_ONLY |
| `CRITIC_HELPER_ONLY_EDGE_CHECK` | Check that Critic edges are guard or evidence only. | DOCUMENTED_ONLY |
| `DECISION_CONTROLLER_BLOCK_CHECK` | Check that DecisionController activation edges remain blocked. | DOCUMENTED_ONLY |
| `NO_CLAIM_EDGE_CHECK` | Check that evidence edges do not bypass HumanGate into claim validation. | DOCUMENTED_ONLY |
| `NO_IMPLEMENTATION_ARTIFACT_CHECK` | Check that no Godot, frontend, runtime, test, dataset, model, run, or latest manifest artifact is created by a docs-only task. | DOCUMENTED_ONLY |

---

## 19. Output Routing Evidence

```yaml
route_check:
  status: DOCUMENTED_ONLY
  output_routing_required: true
  output_routing_present: true
  destination_allowed: true
  target_under_00_STUDIO_CONTROL_01_MAPS: true
  target_file_existed_before_update: true
  target_path: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md"
  route_reason: "Studio maps, topology, and routing policy belong under 00_STUDIO_CONTROL/01_MAPS."
  root_duplicate_check: "No competing UXPILOTE_BASE_WORLD_MAPS_SPEC_V0.md was created by this update."
```

```yaml
output_routing_result:
  produced_file_type: "map_spec_update"
  intended_surface: "canonical_docs"
  canonical_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md"
  temporary_destination: ""
  actual_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md"
  registration_required: false
  project_source_upload_required: false
  retention_policy: "Docs-only UX source candidate. Not runtime truth."
  promotion_gate: "HumanGate"
```

---

## 20. Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE
```

---

## 21. Verdicts

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

claim_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

No Elo, strength, promotion, benchmark proof, scientific proof, runtime activation, dataset quality, model proof, Godot implementation, frontend implementation, or player-improvement claim is made.
