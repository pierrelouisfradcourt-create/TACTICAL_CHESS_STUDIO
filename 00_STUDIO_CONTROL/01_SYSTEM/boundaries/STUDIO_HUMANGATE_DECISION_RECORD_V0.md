# STUDIO_HUMANGATE_DECISION_RECORD_V0

Status: DOCUMENTED_ONLY
Surface: canonical_docs
Authority: Human-only decision record for one bounded execution step
Runtime authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Model promotion: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

## Purpose

A HumanGate Decision Record captures a human decision for exactly one bounded execution step.

It exists to prevent ambiguous approvals, chained approvals, implicit execution authority, and automatic promotion of reports, logs, benchmarks, model outputs, runtime artifacts, or generated artifacts into source truth.

A HumanGate Decision Record is documentation and workflow control only. It does not implement runtime enforcement code and does not approve any current or future execution step by itself.

## Authority Boundary

One HumanGate decision may authorize only:

- one requested step
- one authorized surface
- one authorized tool or actor class
- one expected output
- one output route
- one validation posture

The human decision may authorize one explicit surface, one explicit tool/action class, and one explicit expected output.

It does not authorize future steps, adjacent tasks, hidden follow-up work, promotion, activation, training, deployment, broader repo mutation, or artifact promotion by implication.

One human decision authorizes exactly one bounded execution step.

## Non-Authority Rules

ChatGPT Pro may recommend, critique, red-team, draft, or structure a task. It may not authorize execution.

Codex may execute only within a HumanGate-authorized task scope. It may not widen scope, approve its own work, authorize future work, or convert a report into source truth.

LM Studio or any local LLM may classify, summarize, draft task charters, read executor reports, and detect drift. It may not decide, validate, promote, activate, train, deploy, or approve.

Tests may provide evidence. They do not promote claims automatically.

Scripts, reports, logs, benchmark outputs, generated artifacts, model outputs, and runtime outputs may provide evidence. They do not become canonical truth automatically.

UNKNOWN means BLOCKED.

## Decision Scope

A decision is valid only for the exact requested step named in the record.

A decision becomes invalid if:

- the task scope changes
- the authorized surface changes
- the authorized tool or actor changes
- the allowed action class changes
- the expected output changes
- the output route changes
- required evidence is missing
- a contradiction is found in canonical sources
- validation cannot be completed
- the step completes, fails, or is aborted

A decision for one surface does not authorize another surface.

## Expiration Rules

A HumanGate decision expires immediately after the approved step completes, fails, or is aborted.

A record also expires when the approved step changes scope, changes surface, changes actor, changes output route, or loses required evidence.

It cannot be reused for another step.

It cannot authorize a chain of patches, follow-up tasks, dataset generation, training, model promotion, deployment, runtime activation, or artifact promotion unless a new HumanGate Decision Record is created for that exact step.

Approval expires after the task step completes or is aborted.

## Required Record Fields

Each HumanGate Decision Record must include:

```yaml
record_id: ""
task_id: ""
decision_timestamp: ""
decision_maker: ""
requested_step: ""
authorized_surface: ""
authorized_tool_or_actor: ""
allowed_actions: []
blocked_actions: []
expected_output: ""
output_route: ""
source_evidence_reviewed: []
risk_summary: ""
validation_required: []
expiration_condition: ""
rollback_or_abort_condition: ""
decision_type: ""
decision_text: ""
```

If any required field is missing, ambiguous, contradicted, or unverifiable, the decision status is `BLOCKED`.

Any missing or ambiguous required field means the decision is `BLOCKED`.

## Allowed Decision Types

```yaml
allowed_decision_types:
  - APPROVE_SINGLE_STEP
  - REJECT
  - REQUEST_MORE_EVIDENCE
  - HOLD_BLOCKED
```

`APPROVE_SINGLE_STEP` may authorize only the bounded step named in the record.

`REJECT`, `REQUEST_MORE_EVIDENCE`, and `HOLD_BLOCKED` do not authorize execution.

## Blocked Decision Types

```yaml
blocked_decision_types:
  - APPROVE_CHAIN
  - APPROVE_UNBOUNDED_EXECUTION
  - APPROVE_PROMOTION_WITHOUT_EVIDENCE
  - APPROVE_MODEL_TRAINING
  - APPROVE_DATASET_GENERATION
  - APPROVE_RUNTIME_ACTIVATION
  - APPROVE_DEPLOYMENT
```

The phrase `ok go` is blocked when it is not normalized into a complete HumanGate Decision Record with all required fields.

A HumanGate record cannot approve training, fine-tuning, LoRA, checkpointing, dataset generation, runtime activation, or model promotion unless a separate task explicitly scopes that exact step and all higher-order policies allow it.

## Evidence Requirements

A decision must name the evidence reviewed.

Evidence may include canonical docs, source files, diffs, test output, reports, logs, risk notes, or benchmark results.

Evidence does not become truth automatically. Promotion requires a separate HumanGate-authorized promotion step.

Local red-team output may identify risk or contradictions. It may not validate, approve, promote, activate, or authorize execution.

If required evidence is missing, contradictory, unverifiable, or outside the routed source set, the decision status is `BLOCKED` or `UNKNOWN` and the action must not proceed.

## Risk Requirements

Each record must include a risk summary covering relevant items:

- scope creep
- source laundering
- prompt injection
- patch-chain creep
- unauthorized promotion
- runtime activation
- dataset contamination
- model-training side effects
- contradiction with canonical sources
- missing validation

The risk summary must not convert risk acceptance into broader authority.

## Surface Authorization

The authorized surface must be one of:

```yaml
surfaces:
  - active_code
  - tests
  - artifacts_runtime_outputs
  - canonical_docs
  - roadmap_docs_only
  - inference
```

For compatibility with the Studio AutoDev controlled vocabulary, `active_runtime_code` is the canonical runtime-code surface value in executor reports. If a HumanGate record uses `active_code`, it must map explicitly to `active_runtime_code` before execution.

A decision for one surface does not authorize another surface.

## Output Routing Link

Any file produced or modified under a HumanGate-authorized task must follow `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`.

If the output route is unknown, the task is `BLOCKED`.

A HumanGate decision cannot override forbidden destinations, duplicate-root prevention, source anchoring, or registration requirements from the routing policy.

Reports, logs, benchmarks, runtime outputs, generated artifacts, and executor reports remain evidence unless a separate routed HumanGate promotion step exists.

## HumanGate Record Template

```yaml
human_gate_decision_record:
  record_id: ""
  task_id: ""
  decision_timestamp: ""
  decision_maker: ""
  requested_step: ""
  authorized_surface: ""
  authorized_tool_or_actor: ""
  allowed_actions: []
  blocked_actions: []
  expected_output: ""
  output_route: ""
  source_evidence_reviewed: []
  risk_summary: ""
  validation_required: []
  expiration_condition: "expires when the approved step completes, fails, is aborted, changes scope, changes surface, changes actor, changes output route, or loses required evidence"
  rollback_or_abort_condition: ""
  decision_type: "APPROVE_SINGLE_STEP | REJECT | REQUEST_MORE_EVIDENCE | HOLD_BLOCKED"
  decision_text: ""
  no_chain_authority: true
  no_automatic_promotion: true
  pro_cannot_authorize: true
  codex_cannot_authorize: true
  local_llm_cannot_authorize: true
  unknown_means_blocked: true
```

## Minimal Examples

### Valid Single-Step Approval

```yaml
decision_type: APPROVE_SINGLE_STEP
requested_step: "Create canonical docs/workflow file STUDIO_HUMANGATE_DECISION_RECORD_V0.md only."
authorized_surface: canonical_docs
authorized_tool_or_actor: Codex
allowed_actions:
  - "Create or update the routed canonical workflow document."
  - "Update an existing canonical source registry only if required by routing policy."
blocked_actions:
  - "Modify active code."
  - "Modify tests."
  - "Generate dataset."
  - "Train or fine-tune a model."
  - "Promote runtime outputs."
  - "Authorize any future step."
expected_output: "One canonical HumanGate decision record document plus executor report."
output_route: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/04_BOUNDARIES/STUDIO_HUMANGATE_DECISION_RECORD_V0.md"
status: DOCUMENTED_ONLY
```

This example is illustrative only. It does not authorize the current task or any future task.

### Invalid Chained Approval

```yaml
decision_type: APPROVE_CHAIN
decision_text: "Ok go, do the HumanGate doc and then continue with Pro packet, red-team, memory, dataset, and LoRA."
status: BLOCKED
reason: "A HumanGate decision cannot authorize a chain of future steps."
```

### Invalid Pro Authorization

```yaml
actor: ChatGPT Pro
decision_text: "Approved to execute."
status: BLOCKED
reason: "Pro may advise or draft but cannot authorize execution."
```

### Invalid Runtime Output Promotion

```yaml
actor: benchmark_report
decision_text: "The run passed, so promote the claim and activate runtime behavior."
status: BLOCKED
reason: "Reports, logs, benchmarks, and runtime outputs may provide evidence but cannot authorize or promote claims automatically."
```

### Allowed Rejection

```yaml
decision_type: REJECT
requested_step: "Start dataset generation from generated puzzle candidates."
status: BLOCKED
reason: "The decision rejects the requested step and grants no execution authority."
```

## Status Semantics

Status values must use only:

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

No global ready/not-ready verdict is allowed.

`UNKNOWN` means `BLOCKED` for authorization decisions.

## Failure Modes

The task is `BLOCKED` when:

- required sources are missing
- output route is unknown
- approval scope is ambiguous
- a required record field is missing
- a required record field is ambiguous, contradicted, or unverifiable
- the decision attempts to authorize multiple steps
- the decision attempts to authorize future chains of work
- the decision attempts to promote artifacts automatically
- the decision delegates approval to Pro, Codex, LM Studio, local LLMs, scripts, reports, tests, or runtime output
- the decision crosses from docs into code, datasets, training, deployment, or runtime activation without a separate HumanGate record
- canonical sources contradict the requested authorization
- validation required by the record cannot be completed
