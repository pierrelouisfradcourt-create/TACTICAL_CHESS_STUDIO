# Studio Agentic Pyramid Activation Roadmap V0

Status: DOCUMENTED_ONLY
Surface: roadmap_docs_only
Canonical destination: `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/STUDIO_AGENTIC_PYRAMID_ACTIVATION_ROADMAP_V0.md`
Produced artifact path: sandbox export
Created at UTC: `2026-05-18T07:53:19Z`
Runtime authority: NONE
Codex execution authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Dataset reset: BLOCKED
Model promotion: BLOCKED
Auto-merge: BLOCKED
Auto-post: BLOCKED
Auto-claim: BLOCKED
Claim posture: NO_CLAIM_ALLOWED
HumanGate: REQUIRED

---

## 1. Purpose

This roadmap defines a safe activation path for the Studio Agentic Pyramid.

It does not activate anything by itself.

It exists to prevent the studio from enabling agents, Codex execution, runtime changes, training, datasets, benchmarks, publishing, or commercial claims before the required gates and evidence exist.

---

## 2. Core Activation Rule

Do not activate the full studio at once.

Activate by layers:

```text
1. Documentation
2. Source anchoring
3. Output routing
4. Task charter discipline
5. Bounded Codex execution
6. Executor reporting
7. Quality / Evidence gate
8. Read-only analysis
9. Creative / Commercial draft lane
10. Observability / Cost reporting
11. Limited safe automation
12. Future advanced activation
```

Every executable phase requires:

```text
task_charter_input
-> executor_report_output
-> analysis_agent_record when applicable
-> HumanDecision
```

---

## 3. Phase Overview

| Phase | Name | Default status | HumanGate required | Blocked until | Activation level |
| --- | --- | --- | --- | --- | --- |
| 0 | Canonical Documentation Baseline | DOCUMENTED_ONLY | false | none | NONE |
| 1 | Passive GPT Navigator | PASSIVE | false | none | READ_ONLY_REASONING |
| 2 | Manual Task Charter Discipline | DOCUMENTED_ONLY | false | none | HUMAN_WRITTEN_TASKS |
| 3 | Bounded Codex Docs-Only Execution | BLOCKED | true | HumanGate | DOCS_ONLY_EXECUTION |
| 4 | Quality Evidence Gate | DOCUMENTED_ONLY | false | none | REVIEW_REQUIRED |
| 5 | Bounded Repo Task Execution | BLOCKED | true | HumanGate | TARGETED_REPO_TASKS |
| 6 | Read-Only Analysis Agent | BLOCKED | true | HumanGate | PASSIVE_ANALYSIS_ONLY |
| 7 | Creative / Commercial Draft Lane | DOCUMENTED_ONLY | false | none | DRAFT_ONLY |
| 8 | Runtime Observability and Cost Report | BLOCKED | true | HumanGate | REPORT_ONLY |
| 9 | Limited Safe Automation | BLOCKED | true | HumanGate | ASSISTED_AUTOMATION |
| 10 | Advanced Controlled Activation | BLOCKED | true | HumanGate | FUTURE_ONLY |

---

## 4. Phase 0 - Canonical Documentation Baseline

```yaml
phase: 0
name: "Canonical Documentation Baseline"
status: DOCUMENTED_ONLY
activation_level: NONE
```

### Goal

Create stable docs for architecture, roadmap, source anchoring, output routing, and AutoDev interfaces.

### Allowed

- create architecture docs;
- create roadmap docs;
- define status values;
- define surfaces;
- define locked actions;
- define gates;
- define proposed routing.

### Blocked

- agent activation;
- Codex execution;
- runtime code changes;
- test changes;
- training;
- benchmark;
- dataset generation/reset;
- model/checkpoint creation;
- publishing;
- claims;
- commit/push/branch/PR.

### Required outputs

```text
STUDIO_AGENTIC_PYRAMID_ARCHITECTURE_V0.md
STUDIO_AGENTIC_PYRAMID_ACTIVATION_ROADMAP_V0.md
```

### Exit gate

```text
created -> registered -> loaded -> enforced -> evidenced
```

The files must not be treated as operational truth until the full source-state chain is satisfied.

---

## 5. Phase 1 - Passive GPT Navigator

```yaml
phase: 1
name: "Passive GPT Navigator"
status: PASSIVE
activation_level: READ_ONLY_REASONING
```

### Goal

Use GPT as a strategic navigator and critique layer without repo mutation.

### Allowed

- inspect loaded sources;
- classify by surfaces;
- report statuses;
- explain divergence;
- prepare plans;
- prepare task candidates;
- identify missing evidence.

### Blocked

- patching files;
- running commands;
- generating Codex prompts unless explicitly needed and gated;
- claiming implementation;
- publication;
- activation.

### Exit gate

A Navigator response must consistently separate:

```text
active_runtime_code
tests
artifacts_runtime_outputs
canonical_docs
roadmap_docs_only
inference
```

and must use only:

```text
IMPLEMENTED
TESTED
DOCUMENTED_ONLY
PASSIVE
BLOCKED
NOT_FOUND
UNKNOWN
```

---

## 6. Phase 2 - Manual Task Charter Discipline

```yaml
phase: 2
name: "Manual Task Charter Discipline"
status: DOCUMENTED_ONLY
activation_level: HUMAN_WRITTEN_TASKS
```

### Goal

Require a task charter before any file-producing or repo-affecting task.

### Allowed

- write `task_charter_input`;
- define `goal`;
- define `non_goals`;
- define `target_files`;
- define `reference_only_paths`;
- define `surfaces_in_scope`;
- define `surfaces_out_of_scope`;
- define `output_routing`;
- define `allowed_actions`;
- define `blocked_actions`;
- define `validation_plan`.

### Blocked

- task execution without charter;
- file output without routing;
- ambiguous destination;
- implicit scope.

### Exit gate

A docs-only task can be described with:

```yaml
record_type: "task_charter_input"
contract_version: "V0"
language: "English"
surfaces_in_scope:
  - canonical_docs
human_gate_required: true
claim_posture: "NO_CLAIM_ALLOWED"
```

---

## 7. Phase 3 - Bounded Codex Docs-Only Execution

```yaml
phase: 3
name: "Bounded Codex Docs-Only Execution"
status: BLOCKED
human_gate_required: true
blocked_until: "HumanGate"
activation_level: DOCS_ONLY_EXECUTION
```

### Goal

Allow Codex only for bounded documentation tasks after explicit HumanGate.

### Allowed after HumanGate

- create or update explicitly targeted docs;
- run docs-only validation;
- read back target files;
- produce `executor_report_output`.

### Blocked

```yaml
runtime_code_changes: BLOCKED
test_changes: BLOCKED
training: BLOCKED
benchmark: BLOCKED
dataset_generation: BLOCKED
dataset_reset: BLOCKED
latest_json_creation: BLOCKED
lab_run_creation: BLOCKED
model_or_checkpoint_creation: BLOCKED
model_promotion: BLOCKED
agent_activation: BLOCKED
chess960_activation: BLOCKED
decision_controller_activation: BLOCKED
commit: BLOCKED
push: BLOCKED
branch_creation: BLOCKED
pull_request_creation: BLOCKED
```

### Exit gate

Codex must produce an executor report with:

```text
files_touched
files_not_touched
commands_run
validation
skipped_validation
risks
status_by_surface
software_verdict
evidence_verdict
claim_verdict
```

---

## 8. Phase 4 - Quality Evidence Gate

```yaml
phase: 4
name: "Quality Evidence Gate"
status: DOCUMENTED_ONLY
activation_level: REVIEW_REQUIRED
```

### Goal

Do not accept executor output without evidence classification.

### Allowed

- inspect diff;
- inspect route check;
- inspect validation;
- inspect skipped validation;
- classify evidence;
- flag drift;
- block claims.

### Blocked

- treating a log as proof;
- treating benchmark as marketing evidence;
- treating `latest.json` as truth;
- giving global ready/not-ready verdict;
- claim promotion without HumanGate.

### Exit gate

Each report must include three verdict groups split by surface:

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
  canonical_docs: TESTED
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

claim_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

claim_posture: "NO_CLAIM_ALLOWED"
```

---

## 9. Phase 5 - Bounded Repo Task Execution

```yaml
phase: 5
name: "Bounded Repo Task Execution"
status: BLOCKED
human_gate_required: true
blocked_until: "HumanGate"
activation_level: TARGETED_REPO_TASKS
```

### Goal

Move from docs-only tasks to targeted low-risk repo tasks.

### Allowed after HumanGate

- exact target files;
- exact tests;
- small scoped patch;
- no broad refactor;
- no runtime authority change;
- complete executor report.

### Blocked unless separately authorized

- Search authority changes;
- DecisionController activation;
- Chess960 activation;
- ActionMask expansion;
- neural authority change;
- dataset generation;
- dataset reset;
- training;
- model promotion;
- benchmark proof.

### Exit gate

A successful repo task must have:

```text
preflight git state
target files
targeted tests
executor report
quality review
HumanDecision
```

---

## 10. Phase 6 - Read-Only Analysis Agent

```yaml
phase: 6
name: "Read-Only Analysis Agent"
status: BLOCKED
human_gate_required: true
blocked_until: "HumanGate"
activation_level: PASSIVE_ANALYSIS_ONLY
```

### Goal

Analyze prior task charters and executor reports without touching files or running commands.

### Allowed

- read `task_charter_input`;
- read `executor_report_output`;
- produce `analysis_agent_record`;
- detect recurring failure patterns;
- recommend HumanGate actions.

### Blocked

```yaml
file_create: BLOCKED
file_update: BLOCKED
file_delete: BLOCKED
code_patch: BLOCKED
test_patch: BLOCKED
runtime_execution: BLOCKED
training: BLOCKED
benchmark: BLOCKED
dataset_generation: BLOCKED
dataset_reset: BLOCKED
latest_json_creation: BLOCKED
lab_run_creation: BLOCKED
model_or_checkpoint_creation: BLOCKED
model_promotion: BLOCKED
agent_activation: BLOCKED
chess960_activation: BLOCKED
decision_controller_activation: BLOCKED
commit: BLOCKED
push: BLOCKED
branch_creation: BLOCKED
pull_request_creation: BLOCKED
```

### Exit gate

First analysis record must report:

```text
scope_control
surface_separation
routing_compliance
blocked_actions_respected
validation_quality
evidence_quality
claim_quality
document_drift_risk
human_gate_preserved
```

---

## 11. Phase 7 - Creative / Commercial Draft Lane

```yaml
phase: 7
name: "Creative Commercial Draft Lane"
status: DOCUMENTED_ONLY
activation_level: DRAFT_ONLY
```

### Goal

Enable art, trailer, pitch, Steam, and social content as drafts only.

### Allowed

- MediaBrief;
- concept art draft;
- UI visual draft;
- trailer brief;
- Steam page draft;
- pitch draft;
- social draft;
- ClaimReviewPacket;
- IP Boundary review.

### Blocked

- autopost;
- publication by AI;
- publisher outreach automation;
- claim marketing;
- final asset usage without IP Boundary;
- Steam release;
- revenue/performance claims.

### Required flow

```text
Product evidence
-> Commercial/Publishing Director
-> Art/Creative Director
-> ClaimGate
-> IP Boundary
-> HumanGate
```

---

## 12. Phase 8 - Runtime Observability and Cost Report

```yaml
phase: 8
name: "Runtime Observability and Cost Report"
status: BLOCKED
human_gate_required: true
blocked_until: "HumanGate"
activation_level: REPORT_ONLY
```

### Goal

Understand what Rocky consumes and does during a bounded run.

### Allowed after HumanGate

- inspect one explicitly scoped game/run;
- measure wall time;
- measure CPU/GPU/API/CI when available;
- detect clone/process/action count if observable;
- produce passive cost report.

### Blocked

- optimization auto-patch;
- runtime behavior change;
- massive unbounded runs;
- benchmark proof;
- creation of `latest.json`;
- creation of `lab/runs/RUN_*` unless explicitly authorized;
- training/dataset/model outputs.

### Exit gate

Cost report must remain:

```yaml
surface: artifacts_runtime_outputs
status: PASSIVE
claim_posture: NO_CLAIM_ALLOWED
```

---

## 13. Phase 9 - Limited Safe Automation

```yaml
phase: 9
name: "Limited Safe Automation"
status: BLOCKED
human_gate_required: true
blocked_until: "HumanGate"
activation_level: ASSISTED_AUTOMATION
```

### Potentially allowed after HumanGate

- task charter skeleton generation;
- checklist generation;
- report skeleton generation;
- social draft generation;
- read-only diff summary;
- read-only risk extraction;
- prompt preparation after Codex Prompt Gate.

### Always blocked by this roadmap

```yaml
auto_merge: BLOCKED
auto_post: BLOCKED
auto_claim: BLOCKED
auto_spend: BLOCKED
auto_train: BLOCKED
auto_promote_model: BLOCKED
auto_generate_dataset: BLOCKED
auto_release: BLOCKED
auto_contact_publisher: BLOCKED
```

---

## 14. Phase 10 - Advanced Controlled Activation

```yaml
phase: 10
name: "Advanced Controlled Activation"
status: BLOCKED
human_gate_required: true
blocked_until: "HumanGate"
activation_level: FUTURE_ONLY
```

### Future candidates

- recurring read-only analysis;
- PR assistant with narrow target files;
- observability dashboard;
- evidence scoring;
- recurring failure detection;
- cost trend analysis.

### Not authorized

- autonomous agents;
- runtime authority;
- training;
- model promotion;
- dataset promotion;
- release automation;
- social autopost;
- publisher outreach.

---

## 15. Recommended Activation Timeline

```text
Week 1:
  Phase 0 + Phase 1
  Architecture + roadmap + passive Navigator discipline.

Week 2:
  Phase 2
  Manual task charters for small docs-only tasks.

Week 3:
  Phase 3 + Phase 4
  First bounded Codex docs-only execution after HumanGate.

Week 4:
  Phase 5
  First low-risk targeted repo task if HumanGate approves.

Week 5:
  Phase 6
  First read-only analysis_agent_record.

Week 6:
  Phase 7
  Creative/Commercial drafts, no publication.

Later:
  Phase 8-10 only after stable evidence and explicit HumanGate.
```

---

## 16. Priority Order

```text
1. Source anchoring
2. Output routing
3. Task Charter
4. Executor Report
5. Quality Review
6. HumanGate record
7. Read-only analysis
8. Creative/Commercial drafts
9. Observability/Cost
10. Limited automation
11. Advanced activation
```

---

## 17. Promotion Gates

| Promotion | Required gate |
| --- | --- |
| document candidate -> canonical source | created -> registered -> loaded -> enforced -> evidenced |
| task idea -> executable task | task_charter_input + HumanGate |
| Codex output -> accepted output | executor_report_output + Quality review |
| report -> evidence | EvidencePacket + surface status |
| evidence -> public claim | ClaimReviewPacket + ClaimGate + HumanGate |
| media draft -> public asset | IP Boundary + HumanGate |
| social draft -> post | ClaimGate + HumanGate + human publication |
| dataset candidate -> dataset | Dataset gate + HumanGate |
| model/checkpoint -> promoted model | explicit HumanGate + evidence + separate contract |
| runtime change -> active runtime | tests + review + HumanGate |

---

## 18. Stop Conditions

Stop the activation path and report `BLOCKED` if any of these occur:

```text
missing source readback
missing output routing for file-producing task
unknown destination
dirty worktree not classified
unscoped target files
unsupported claim
benchmark used as proof
generated media without provenance
dataset labels missing ActionId / LegalAction / ActionMask / provenance / HumanGate
training requested without explicit charter
runtime authority change hidden in docs task
Codex prompt requested without required anchors
publication requested without ClaimGate
```

---

## 19. Current Usable Operating Mode

The currently usable operating mode is limited to:

| Phase | Mode | Usable status | Boundary |
| --- | --- | --- | --- |
| 1 | Passive GPT Navigator | PASSIVE | Read-only reasoning and planning only. |
| 2 | Manual Task Charter Discipline | DOCUMENTED_ONLY | Human-written task framing only. |
| 4 | Quality Evidence Gate | DOCUMENTED_ONLY | Evidence classification and claim blocking only. |

This roadmap alone authorizes no agent activation, runtime activation, repo mutation, training, benchmark, dataset generation, model promotion, auto-post, auto-claim, or auto-merge.

---

## 20. Dormant Agent Layer

Dormant agents are predefined passive review roles, not active autonomous agents.

Dormant agents may be referenced in task charters, define review responsibilities, and produce review sections or recommendations through the human/GPT/Codex reporting flow. They may not execute, patch, publish, claim, merge, activate, train, benchmark, generate datasets, promote models, spend money, or contact publishers. HumanGate remains final authority.

| Dormant role | Status | Allowed use | Blocked authority |
| --- | --- | --- | --- |
| Producer / Planner | PASSIVE | Frame task order, scope, routing, and HumanGate questions. | No execution, approval, merge, publication, claim, or activation authority. |
| Architecture Director | PASSIVE | Review architecture consistency and surface boundaries. | No runtime implementation, refactor authority, or activation authority. |
| Quality / Evidence Director | PASSIVE | Review validation strength, evidence quality, and claim safety. | No benchmark proof, public claim approval, or release authority. |
| Memory / Evidence Director | PASSIVE | Review source anchoring, provenance, drift, and evidence records. | No dataset promotion, training approval, or source mutation authority. |
| Resource Director | PASSIVE | Review compute, time, cost, and scope exposure. | No spend authority, ROI claim approval, or automation authority. |
| Puzzle / Curriculum Specialist | DOCUMENTED_ONLY | Review one-pass error-to-puzzle RNG curriculum framing. | No dataset row creation, training signal, benchmark proof, or puzzle promotion authority. |
| Error Extraction Specialist | DOCUMENTED_ONLY | Review error source selection and diagnostic extraction criteria. | No runtime mutation, dataset generation, label authority, or `lab/runs/RUN_*` creation. |
| Dataset Gate Specialist | PASSIVE | Review ActionId, LegalAction, ActionMask, provenance, and HumanGate prerequisites. | No dataset promotion, dataset reset, training, or model promotion authority. |
| Runtime Rust Specialist | PASSIVE | Review Rust runtime boundary risks for Search / Neural / Engine split tasks. | No runtime patch, Chess960 activation, ActionMask activation, or DecisionController activation. |
| Search Authority Specialist | PASSIVE | Review that Search remains final gameplay authority. | No authority transfer, SearchBackend activation, or runtime routing change. |
| Neural Boundary Specialist | PASSIVE | Review that Neural remains propose/rerank only. | No neural decision authority, training, model promotion, or final move authority. |
| Action Identity Specialist | PASSIVE | Review ActionId, LegalAction, and ActionMask identity requirements. | No ActionMask implementation, dataset labeling, or runtime authority change. |
| Observability / Cost Specialist | DOCUMENTED_ONLY | Review later Rocky observability and cost report charter scope. | No runtime run creation, telemetry activation, `latest.json`, or `lab/runs/RUN_*` creation. |
| Resource Cost Specialist | PASSIVE | Review compute and cost evidence for later reporting. | No spend authority, automation, benchmark proof, or cost claim authority. |
| Quality Evidence Specialist | PASSIVE | Review evidence sufficiency for later observability reporting. | No claim approval, benchmark proof, auto-post, or auto-claim authority. |

---

## 21. Next Workstream Order

The next concrete work is ordered as follows:

1. Dormant agent layer registration in roadmap.
2. One-pass error-to-puzzle RNG pipeline task charter.
3. Search / Neural / Engine split completion task charter.
4. Rocky observability / cost report task charter.
5. Limited safe automation only after evidence is stable.

Required task constraints:

- target must be explicit;
- output routing must be explicit;
- executor report must be required;
- roadmap remains planning authority only.
- one-pass puzzle RNG is not dataset promotion;
- no training;
- no benchmark proof;
- no `latest.json`;
- no `lab/runs/RUN_*` unless separately authorized;
- Search remains final gameplay authority;
- Neural remains propose/rerank only;
- no DecisionController activation;
- no agent activation.

---

## 22. Validation and Encoding Hygiene

Docs-only validation requires:

- readback of the modified roadmap;
- search for invalid status values;
- search for `NO_CLAIM_ALLOWED` inside `claim_verdict` blocks;
- verify dormant agents are described with PASSIVE or DOCUMENTED_ONLY status only;
- verify no phrase implies active agent execution;
- verify no phrase implies runtime authorization;
- search for mojibake artifacts corresponding to corrupted arrow, dash, quote, A-tilde, and spacing-marker sequences;
- report any UTF-8 BOM if detected;
- report whether cleanup was required.

---

## 23. Status by Surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | No runtime code change authorized. |
| tests | PASSIVE | No test change authorized. |
| artifacts_runtime_outputs | PASSIVE | No runtime artifacts authorized. |
| canonical_docs | DOCUMENTED_ONLY | Architecture doc may become canonical after source-state chain. |
| roadmap_docs_only | DOCUMENTED_ONLY | This roadmap is roadmap-only. |
| inference | PASSIVE | No inference authority activated. |

---

## 24. Final Verdicts

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
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

claim_posture: "NO_CLAIM_ALLOWED"
```

No global ready/not-ready verdict is made.

---

## 25. Non-Authorization

This roadmap does not authorize:

- runtime implementation;
- runtime activation;
- test modification;
- training;
- benchmarking;
- dataset generation;
- dataset reset;
- model or checkpoint creation;
- model or checkpoint promotion;
- Chess960 activation;
- DecisionController activation;
- agent activation;
- social autopost;
- marketing claims;
- Steam release;
- publisher outreach;
- commits;
- pushes;
- branch creation;
- pull request creation.

Any such action requires a separate explicit HumanGate-approved task charter.
