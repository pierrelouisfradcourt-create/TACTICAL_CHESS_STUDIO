# Studio AutoDev Pipeline I/O Contract V0

Status: DOCUMENTED_ONLY
Owner: HumanGate
Scope: Studio-wide AutoDev task framing, executor reporting, and future read-only analysis-agent input
Runtime authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Model promotion: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

---

## 1. Purpose

This document defines the canonical input/output format for controlled AutoDev work across the studio.

It standardizes communication between:

- human operator
- GPT navigator
- bounded executor such as Codex
- future read-only analysis agent

This contract exists to:

- frame tasks before execution
- prevent scope drift
- separate audits, documentation, tests, runtime patches, tooling, observability, agent work, and data guards
- make executor outputs machine-analyzable
- detect weak prompts, recurring failures, risky task classes, and unsafe shortcuts
- preserve human authority over execution, promotion, activation, and claims

This document does not authorize implementation by itself.

`00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml` is the route, owner, consumer, status, and evidence authority for registered control-room files when a file body omits local metadata.

---

## 2. Language Rule

All canonical machine-facing records must be written in English.

This includes:

- task charter input
- executor final report
- future analysis-agent record
- status fields
- failure types
- verdicts

Human discussion may use another language, but canonical records must stay English.

---

## 3. Canonical Record Flow

Every AutoDev task should produce or consume these records:

```text
1. task_charter_input
   Created before execution.
   Describes the task, scope, allowed actions, blocked actions, validation plan, and expected output.

2. executor_report_output
   Created after execution.
   Reports what was actually done, files touched, commands run, validation, risks, and final verdicts.

3. analysis_agent_record
   Created later by a read-only analysis agent.
   Extracts structured risk and quality signals from the task charter and executor report.
```

Record order is mandatory when all records exist:

```text
task_charter_input -> executor_report_output -> analysis_agent_record
```

The analysis agent must not create, modify, delete, commit, push, promote, activate, train, benchmark, reset, or generate runtime assets.

---

## 4. Controlled Vocabulary

### 4.1 Status Values

Only these status values are valid in canonical status fields:

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

Status meanings:

| Status | Meaning |
| --- | --- |
| IMPLEMENTED | Active runtime code evidence exists for the relevant behavior. |
| TESTED | Validation or test evidence exists for the relevant surface; file existence alone is not test evidence. |
| DOCUMENTED_ONLY | A documentation-only change or record exists with no runtime activation. |
| PASSIVE | Read-only inspection, passive analysis, or non-mutating observation. |
| BLOCKED | Action was not allowed, could not run, or was explicitly forbidden. |
| NOT_FOUND | Expected file, signal, artifact, command, or evidence was absent. |
| UNKNOWN | Status could not be determined from available evidence. |

For control-room coherence work, documentation, policy, registry, template, roadmap, and plan edits are `DOCUMENTED_ONLY`. `IMPLEMENTED` must not be used for docs-only changes, and `TESTED` must not be inferred from readback or path existence alone.

### 4.2 Surface Values

Only these surface values are valid in canonical surface fields:

```yaml
surface_values:
  - active_runtime_code
  - tests
  - artifacts_runtime_outputs
  - canonical_docs
  - roadmap_docs_only
  - inference
```

Surface meanings:

| Surface | Meaning |
| --- | --- |
| active_runtime_code | Runtime source code, build configuration, and executable behavior. |
| tests | Unit, integration, regression, smoke, and validation test files or commands. |
| artifacts_runtime_outputs | Generated runtime outputs, run folders, reports, logs, datasets, checkpoints, models, and manifests. |
| canonical_docs | Stable control documents, contracts, policies, and authoritative documentation. |
| roadmap_docs_only | Planning documents, proposals, future-work notes, and non-authoritative roadmap text. |
| inference | ML inference, reranking, analysis, and model-assisted suggestions that do not decide alone. |

Canonical machine-facing records must use the surface values above. Human-readable reports may summarize `artifacts_runtime_outputs` as `runtime_outputs`, but aliases must not create new surfaces without explicit mapping in the routing policy and registries.

### 4.3 Locked Actions

Unless a human operator explicitly authorizes a task charter to do otherwise, these actions remain blocked:

```yaml
locked_actions:
  agent_activation: BLOCKED
  training: BLOCKED
  benchmark: BLOCKED
  dataset_generation: BLOCKED
  dataset_reset: BLOCKED
  latest_manifest_creation: BLOCKED
  run_folder_creation: BLOCKED
  model_or_checkpoint_creation: BLOCKED
  model_promotion: BLOCKED
  chess960_activation: BLOCKED
  decision_controller_activation: BLOCKED
  commit: BLOCKED
  push: BLOCKED
  branch_creation: BLOCKED
  pull_request_creation: BLOCKED
```

---

## 5. Common Record Envelope

Every canonical record must include these fields:

```yaml
record_type: ""
contract_version: "V0"
language: "English"
task_id: ""
created_at_utc: ""
created_by: ""
codex_runtime:
  requested_model: ""
  requested_reasoning_effort: ""
  task_class: ""
  fallback_policy:
    if_requested_model_unavailable: "STOP_AND_REPORT"
    if_actual_model_identifier_hidden: "actual_runtime: UNKNOWN"
    unknown_runtime_status: "BLOCKED"
  actual_runtime: UNKNOWN
  actual_runtime_evidence: "Exact runtime identifier not exposed by Codex unless replaced with explicit evidence."
  runtime_status: BLOCKED
  runtime_claim_rule: "Do not claim the exact runtime model unless Codex exposes it explicitly."
repo_reference:
  path: ""
  branch: ""
  head: ""
  worktree_status: UNKNOWN
pre_existing_changes:
  status: UNKNOWN
  files: []
```

Rules:

- `record_type` must be one of `task_charter_input`, `executor_report_output`, or `analysis_agent_record`.
- `contract_version` must be `V0` for this document.
- `language` must be `English`.
- `codex_runtime` must appear in every Codex task charter and executor report.
- `requested_model`, `requested_reasoning_effort`, and `task_class` describe the requested runtime posture only.
- If Codex does not expose the exact runtime model or runtime identifier, `actual_runtime` must be `UNKNOWN`, `runtime_status` must be `BLOCKED`, and no exact runtime model claim is allowed.
- `worktree_status` must use the controlled status values.
- `pre_existing_changes.files` must list known modified, untracked, staged, or deleted files before executor edits.
- If repository status cannot be inspected, use `UNKNOWN` and explain in the record body.

---

## 6. task_charter_input

### 6.1 Purpose

`task_charter_input` is the canonical pre-execution task record.

It defines:

- what is requested
- why it is requested
- which files or surfaces are in scope
- which files or surfaces are out of scope
- which actions are allowed
- which actions are blocked
- how validation should be performed
- what the executor must report

### Output Routing Requirement

Any task that may create, update, move, rename, delete, archive, or generate a file must include `output_routing`.

Required shape:

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

Rules:

- `intended_surface` must use a controlled surface value.
- `canonical_destination` must be explicit for file creation or update.
- `temporary_destination` must be explicit for generated temporary artifacts.
- File-producing tasks without `output_routing` are `BLOCKED`.
- `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` is the routing authority during the topology freeze.

### 6.2 Required Fields

```yaml
record_type: "task_charter_input"
contract_version: "V0"
language: "English"
task_id: ""
created_at_utc: ""
created_by: ""
codex_runtime:
  requested_model: ""
  requested_reasoning_effort: ""
  task_class: ""
  fallback_policy:
    if_requested_model_unavailable: "STOP_AND_REPORT"
    if_actual_model_identifier_hidden: "actual_runtime: UNKNOWN"
    unknown_runtime_status: "BLOCKED"
  actual_runtime: UNKNOWN
  actual_runtime_evidence: "Exact runtime identifier not exposed by Codex unless replaced with explicit evidence."
  runtime_status: BLOCKED
  runtime_claim_rule: "Do not claim the exact runtime model unless Codex exposes it explicitly."
goal: ""
non_goals: []
target_files: []
reference_only_paths: []
surfaces_in_scope: []
surfaces_out_of_scope: []
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
allowed_actions: []
blocked_actions: []
locked_actions:
  agent_activation: BLOCKED
  training: BLOCKED
  benchmark: BLOCKED
  dataset_generation: BLOCKED
  dataset_reset: BLOCKED
  latest_manifest_creation: BLOCKED
  run_folder_creation: BLOCKED
  model_or_checkpoint_creation: BLOCKED
  model_promotion: BLOCKED
  chess960_activation: BLOCKED
  decision_controller_activation: BLOCKED
  commit: BLOCKED
  push: BLOCKED
  branch_creation: BLOCKED
  pull_request_creation: BLOCKED
validation_plan:
  expected_level: DOCUMENTED_ONLY
  commands: []
  readback_required: true
expected_executor_output:
  files_touched_required: true
  commands_run_required: true
  skipped_validation_required: true
  risks_required: true
  software_verdict_required: true
  evidence_verdict_required: true
  claim_verdict_required: true
claim_posture: "NO_CLAIM_ALLOWED"
human_gate_required: true
```

### 6.3 Field Rules

| Field | Rule |
| --- | --- |
| `goal` | Must be specific enough for execution and verification. |
| `codex_runtime` | Must declare requested runtime posture and the actual-runtime fallback rule. |
| `non_goals` | Must list excluded task classes when relevant. |
| `target_files` | Must contain exact paths when the task is file-scoped. |
| `reference_only_paths` | May be read but not modified. |
| `surfaces_in_scope` | Must use only controlled surface values. |
| `surfaces_out_of_scope` | Must use only controlled surface values. |
| `output_routing` | Required for any task that may produce, update, move, rename, delete, archive, or generate a file. |
| `allowed_actions` | Must describe concrete authorized actions. |
| `blocked_actions` | Must describe concrete forbidden actions. |
| `locked_actions` | Must use controlled status values. |
| `validation_plan.expected_level` | Must use controlled status values. |
| `claim_posture` | Must prevent unsupported claims unless a later human-approved contract changes it. |
| `human_gate_required` | Must remain true for activation, promotion, claim, dataset, training, benchmark, and agent decisions. |

---

## 7. executor_report_output

### 7.1 Purpose

`executor_report_output` is the canonical post-execution report.

It must report actual behavior, not intent.

It must separate:

- active runtime code
- tests
- artifacts and runtime outputs
- canonical docs
- roadmap docs only
- inference

It must not give a single global readiness verdict.

### 7.2 Required Fields

```yaml
record_type: "executor_report_output"
contract_version: "V0"
language: "English"
task_id: ""
created_at_utc: ""
created_by: ""
codex_runtime:
  requested_model: ""
  requested_reasoning_effort: ""
  task_class: ""
  fallback_policy:
    if_requested_model_unavailable: "STOP_AND_REPORT"
    if_actual_model_identifier_hidden: "actual_runtime: UNKNOWN"
    unknown_runtime_status: "BLOCKED"
  actual_runtime: UNKNOWN
  actual_runtime_evidence: "Exact runtime identifier not exposed by Codex unless replaced with explicit evidence."
  runtime_status: BLOCKED
  runtime_claim_rule: "Do not claim the exact runtime model unless Codex exposes it explicitly."
repo_reference:
  path: ""
  branch: ""
  head: ""
  worktree_status: UNKNOWN
pre_existing_changes:
  status: UNKNOWN
  files: []
scope_result:
  status: UNKNOWN
  summary: ""
route_check:
  status: UNKNOWN
  output_routing_required: UNKNOWN
  output_routing_present: UNKNOWN
  destination_allowed: UNKNOWN
  evidence: ""
output_routing_result:
  produced_file_type: ""
  intended_surface: ""
  canonical_destination: ""
  temporary_destination: ""
  actual_destination: ""
  registration_required: UNKNOWN
  project_source_upload_required: UNKNOWN
  promotion_gate: "HumanGate"
files_touched: []
files_not_touched: []
commands_run: []
validation:
  status: UNKNOWN
  commands: []
  readback: []
skipped_validation: []
surface_status:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE
runtime_activation:
  agent_activation: BLOCKED
  training: BLOCKED
  benchmark: BLOCKED
  dataset_generation: BLOCKED
  dataset_reset: BLOCKED
  latest_manifest_creation: BLOCKED
  run_folder_creation: BLOCKED
  model_or_checkpoint_creation: BLOCKED
  model_promotion: BLOCKED
  chess960_activation: BLOCKED
  decision_controller_activation: BLOCKED
risks: []
document_drift: []
software_verdict:
  active_runtime_code: UNKNOWN
  tests: UNKNOWN
  artifacts_runtime_outputs: UNKNOWN
  canonical_docs: UNKNOWN
  roadmap_docs_only: UNKNOWN
  inference: UNKNOWN
evidence_verdict:
  active_runtime_code: UNKNOWN
  tests: UNKNOWN
  artifacts_runtime_outputs: UNKNOWN
  canonical_docs: UNKNOWN
  roadmap_docs_only: UNKNOWN
  inference: UNKNOWN
claim_verdict:
  active_runtime_code: UNKNOWN
  tests: UNKNOWN
  artifacts_runtime_outputs: UNKNOWN
  canonical_docs: UNKNOWN
  roadmap_docs_only: UNKNOWN
  inference: UNKNOWN
```

### 7.3 files_touched Entry Format

Each `files_touched` entry must use this shape:

```yaml
path: ""
surface: canonical_docs
change_status: DOCUMENTED_ONLY
summary: ""
```

Rules:

- `surface` must use controlled surface values.
- `change_status` must use controlled status values.
- Generated runtime assets must be listed under `artifacts_runtime_outputs`.
- Reference-only paths must not appear in `files_touched` unless the charter explicitly authorized edits.

### 7.4 route_check Entry Format

Each file-producing executor report must include:

```yaml
route_check:
  status: DOCUMENTED_ONLY
  output_routing_required: true
  output_routing_present: true
  destination_allowed: true
  evidence: ""
```

Rules:

- If files were created, updated, moved, renamed, deleted, archived, or generated, `output_routing_required` must be `true`.
- If `output_routing` was required but absent from the task charter, report `status: BLOCKED`.
- `output_routing_result.actual_destination` must match the allowed destination or report the mismatch.

### 7.5 commands_run Entry Format

Each `commands_run` entry must use this shape:

```yaml
command: ""
purpose: ""
surface: canonical_docs
result_status: UNKNOWN
evidence: ""
```

Rules:

- `surface` must use controlled surface values.
- `result_status` must use controlled status values.
- Commands that fail due to scope restrictions must be reported as `BLOCKED`.
- Commands that are not run must appear in `skipped_validation`, not `commands_run`.

### 7.6 skipped_validation Entry Format

Each `skipped_validation` entry must use this shape:

```yaml
validation_item: ""
surface: canonical_docs
status: BLOCKED
reason: ""
```

Rules:

- Skipped validation must not be hidden.
- If validation is not applicable to a docs-only task, use `DOCUMENTED_ONLY`.
- If validation was forbidden by the charter, use `BLOCKED`.

### 7.7 document_drift Entry Format

Each `document_drift` entry must use this shape:

```yaml
source_path: ""
target_path: ""
surface: canonical_docs
status: UNKNOWN
drift_summary: ""
```

Rules:

- Drift between active code and canonical docs must be reported when discovered.
- Drift not inspected must be reported as `UNKNOWN` if relevant.
- Roadmap-only statements must not be promoted to runtime claims.

---

## 8. analysis_agent_record

### 8.1 Purpose

`analysis_agent_record` is the canonical future read-only analysis record.

It may analyze:

- the task charter
- the executor report
- reported commands
- reported file changes
- reported validation
- reported skipped validation
- reported risks
- reported drift

It must remain read-only.

### 8.2 Required Fields

```yaml
record_type: "analysis_agent_record"
contract_version: "V0"
language: "English"
task_id: ""
created_at_utc: ""
created_by: ""
analysis_mode: PASSIVE
write_access: BLOCKED
repo_mutation: BLOCKED
tool_execution: BLOCKED
allowed_inputs:
  task_charter_input: PASSIVE
  executor_report_output: PASSIVE
routing_compliance_analysis:
  output_routing_present: UNKNOWN
  route_check_present: UNKNOWN
  destination_allowed: UNKNOWN
  undeclared_output_detected: UNKNOWN
  status: UNKNOWN
blocked_actions:
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
  model_or_checkpoint_creation: BLOCKED
  model_promotion: BLOCKED
  agent_activation: BLOCKED
  chess960_activation: BLOCKED
  decision_controller_activation: BLOCKED
  commit: BLOCKED
  push: BLOCKED
  pull_request_creation: BLOCKED
input_completeness:
  task_charter_input: UNKNOWN
  executor_report_output: UNKNOWN
signals:
  scope_control: UNKNOWN
  surface_separation: UNKNOWN
  validation_quality: UNKNOWN
  evidence_quality: UNKNOWN
  claim_quality: UNKNOWN
  routing_quality: UNKNOWN
  recurring_failure_risk: UNKNOWN
  unsafe_shortcut_risk: UNKNOWN
  document_drift_risk: UNKNOWN
findings: []
recommendations_for_human: []
```

### 8.3 Read-Only Rules

The analysis agent must not:

- modify files
- run runtime commands
- run tests
- run benchmarks
- run training
- generate datasets
- reset datasets
- create run folders
- create `latest.json`
- create models or checkpoints
- promote models or checkpoints
- activate Chess960
- activate DecisionController
- activate agents
- commit
- push
- create branches
- create pull requests

The analysis agent may only produce a structured read-only record for human review.

### 8.4 Routing Compliance Rules

The analysis agent record must inspect routing evidence when the executor report includes file creation, update, move, rename, delete, archive, or generated output.

Required checks:

- task charter contains `output_routing`;
- executor report contains `route_check`;
- executor report contains `output_routing_result`;
- actual destination is allowed by `STUDIO_OUTPUT_ROUTING_POLICY_V0.md`;
- no undeclared output is reported or detected from executor evidence.

If routing evidence is missing, use `BLOCKED` or `UNKNOWN` and preserve HumanGate authority.

---

## 9. Verdict Rules

Executor reports must include these verdict groups:

- `software_verdict`
- `evidence_verdict`
- `claim_verdict`

Each verdict group must be split by surface:

```yaml
software_verdict:
  active_runtime_code: UNKNOWN
  tests: UNKNOWN
  artifacts_runtime_outputs: UNKNOWN
  canonical_docs: UNKNOWN
  roadmap_docs_only: UNKNOWN
  inference: UNKNOWN
```

Rules:

- A global ready or not-ready verdict is not allowed.
- Each surface must receive its own controlled status value.
- If a surface was out of scope and not inspected, use `UNKNOWN` or `PASSIVE` with an explanation.
- If a surface was intentionally not changed in a docs-only task, use `PASSIVE` or `DOCUMENTED_ONLY` as supported by evidence.
- Claims must not exceed reported evidence.

---

## 10. Validation Rules

Validation must be the smallest targeted validation that fits the authorized task.

For docs-only tasks, the expected minimum validation is:

```yaml
docs_only_validation:
  diff_check: DOCUMENTED_ONLY
  readback: DOCUMENTED_ONLY
```

For code tasks, the expected validation is:

```yaml
code_validation:
  targeted_test: TESTED
  broader_test: UNKNOWN
```

Rules:

- If validation is skipped, the executor must report why.
- If validation is blocked by scope, report `BLOCKED`.
- If validation is not applicable, report `DOCUMENTED_ONLY`.
- Benchmarking is not validation unless explicitly authorized.
- Training is not validation unless explicitly authorized.
- Dataset generation is not validation unless explicitly authorized.

---

## 11. Claim Rules

Claims must be bounded by evidence.

The following are not allowed without explicit human authorization and supporting evidence:

- runtime activation claims
- benchmark claims
- training claims
- dataset quality claims
- model performance claims
- model promotion claims
- Chess960 activation claims
- DecisionController activation claims
- agent autonomy claims

For this contract, the default claim posture is:

```yaml
claim_posture: "NO_CLAIM_ALLOWED"
```

Executor and analysis records may report what was observed, changed, tested, blocked, not found, or unknown.

---

## 12. Canonical Minimal Examples

### 12.1 Minimal task_charter_input

```yaml
record_type: "task_charter_input"
contract_version: "V0"
language: "English"
task_id: "STUDIO-AUTODEV-EXAMPLE"
created_at_utc: "1970-01-01T00:00:00Z"
created_by: "human_operator"
goal: "Create or update one canonical documentation file."
non_goals:
  - "No runtime implementation."
  - "No tests."
  - "No training."
target_files:
  - "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md"
reference_only_paths: []
surfaces_in_scope:
  - canonical_docs
surfaces_out_of_scope:
  - active_runtime_code
  - tests
  - artifacts_runtime_outputs
  - roadmap_docs_only
  - inference
allowed_actions:
  - "Create the target documentation file."
blocked_actions:
  - "Do not modify runtime code."
  - "Do not run training."
locked_actions:
  agent_activation: BLOCKED
  training: BLOCKED
  benchmark: BLOCKED
  dataset_generation: BLOCKED
  dataset_reset: BLOCKED
  latest_manifest_creation: BLOCKED
  run_folder_creation: BLOCKED
  model_or_checkpoint_creation: BLOCKED
  model_promotion: BLOCKED
  chess960_activation: BLOCKED
  decision_controller_activation: BLOCKED
  commit: BLOCKED
  push: BLOCKED
  branch_creation: BLOCKED
  pull_request_creation: BLOCKED
validation_plan:
  expected_level: DOCUMENTED_ONLY
  commands:
    - "git diff --check"
  readback_required: true
expected_executor_output:
  files_touched_required: true
  commands_run_required: true
  skipped_validation_required: true
  risks_required: true
  software_verdict_required: true
  evidence_verdict_required: true
  claim_verdict_required: true
claim_posture: "NO_CLAIM_ALLOWED"
human_gate_required: true
```

### 12.2 Minimal executor_report_output

```yaml
record_type: "executor_report_output"
contract_version: "V0"
language: "English"
task_id: "STUDIO-AUTODEV-EXAMPLE"
created_at_utc: "1970-01-01T00:00:00Z"
created_by: "bounded_executor"
repo_reference:
  path: ""
  branch: ""
  head: ""
  worktree_status: UNKNOWN
pre_existing_changes:
  status: UNKNOWN
  files: []
scope_result:
  status: DOCUMENTED_ONLY
  summary: "Only the target canonical documentation file was changed."
files_touched:
  - path: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md"
    surface: canonical_docs
    change_status: DOCUMENTED_ONLY
    summary: "Created canonical AutoDev I/O contract."
files_not_touched: []
commands_run: []
validation:
  status: UNKNOWN
  commands: []
  readback: []
skipped_validation: []
surface_status:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE
runtime_activation:
  agent_activation: BLOCKED
  training: BLOCKED
  benchmark: BLOCKED
  dataset_generation: BLOCKED
  dataset_reset: BLOCKED
  latest_manifest_creation: BLOCKED
  run_folder_creation: BLOCKED
  model_or_checkpoint_creation: BLOCKED
  model_promotion: BLOCKED
  chess960_activation: BLOCKED
  decision_controller_activation: BLOCKED
risks: []
document_drift: []
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
```

### 12.3 Minimal analysis_agent_record

```yaml
record_type: "analysis_agent_record"
contract_version: "V0"
language: "English"
task_id: "STUDIO-AUTODEV-EXAMPLE"
created_at_utc: "1970-01-01T00:00:00Z"
created_by: "read_only_analysis_agent"
analysis_mode: PASSIVE
write_access: BLOCKED
repo_mutation: BLOCKED
tool_execution: BLOCKED
allowed_inputs:
  task_charter_input: PASSIVE
  executor_report_output: PASSIVE
blocked_actions:
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
  model_or_checkpoint_creation: BLOCKED
  model_promotion: BLOCKED
  agent_activation: BLOCKED
  chess960_activation: BLOCKED
  decision_controller_activation: BLOCKED
  commit: BLOCKED
  push: BLOCKED
  pull_request_creation: BLOCKED
input_completeness:
  task_charter_input: UNKNOWN
  executor_report_output: UNKNOWN
signals:
  scope_control: UNKNOWN
  surface_separation: UNKNOWN
  validation_quality: UNKNOWN
  evidence_quality: UNKNOWN
  claim_quality: UNKNOWN
  recurring_failure_risk: UNKNOWN
  unsafe_shortcut_risk: UNKNOWN
  document_drift_risk: UNKNOWN
findings: []
recommendations_for_human: []
```

---

## 13. Non-Authorization Clause

This contract is a documentation and reporting contract only.

It does not authorize:

- runtime implementation
- runtime activation
- test modification
- training
- benchmarking
- dataset generation
- dataset reset
- model or checkpoint creation
- model or checkpoint promotion
- Chess960 activation
- DecisionController activation
- agent activation
- commits
- pushes
- branch creation
- pull request creation

Any such action requires a separate explicit human-approved task charter.
