# Studio Pipeline State Machine V0

## Purpose

Studio Pipeline State Machine V0 defines the allowed passive-to-execution
states for Pro critique, local truth intake, red-team review, patch-chain risk,
HumanGate, bounded Codex work, executor reporting, and optional passive
analysis.

It prevents critique from becoming execution, reports from becoming truth,
patch-chain planning from becoming patches, and HumanGate decisions from
silently expanding beyond one bounded next step.

This document is documentation only. It does not create scripts, schemas,
agents, workflows, automations, ChatGPT Pro calls, Codex calls, OpenAI calls,
GitHub calls, runtime behavior, training, dataset generation, benchmark logic,
Git actions, or claim authority.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Canonical State Chain

```text
DRAFT_REQUEST
-> PASSIVE_PRO_CRITIQUE
-> SOURCE_ANCHORED_INTAKE
-> PASSIVE_RED_TEAM
-> PASSIVE_PATCH_CHAIN_RISK
-> HUMANGATE_DECISION
-> BOUNDED_TASK_CHARTER
-> EXECUTOR_REPORT
-> OPTIONAL_PASSIVE_ANALYSIS_RECORD
```

Every transition may stop at:

- `HOLD`
- `SPLIT`
- `REORDER`
- `BLOCKED`
- `ESCALATE_TO_HUMANGATE`

No state may infer approval from the previous state.

## State Definitions

| State | Role | Authority |
| --- | --- | --- |
| `DRAFT_REQUEST` | Preserve human words and initial intent. | PASSIVE |
| `PASSIVE_PRO_CRITIQUE` | ChatGPT Pro critique, red-team, and architecture feedback. | PASSIVE |
| `SOURCE_ANCHORED_INTAKE` | Local source-state and truth intake. | PASSIVE |
| `PASSIVE_RED_TEAM` | Local critique of authority drift, misuse, and failure modes. | PASSIVE |
| `PASSIVE_PATCH_CHAIN_RISK` | Ordering, collision, scope, and dependency risk review. | PASSIVE |
| `HUMANGATE_DECISION` | Human decision over one next step. | DECISION |
| `BOUNDED_TASK_CHARTER` | Narrow task candidate with scope, routing, blockers, and validation. | DOCUMENTED_ONLY until executed |
| `EXECUTOR_REPORT` | Report from bounded execution. | EVIDENCE_CANDIDATE |
| `OPTIONAL_PASSIVE_ANALYSIS_RECORD` | Read-only analysis of charter and report. | PASSIVE |

## Transition Requirements

| From | To | Required evidence |
| --- | --- | --- |
| `DRAFT_REQUEST` | `PASSIVE_PRO_CRITIQUE` | Human words preserved; Pro query packet bounded; blocked outputs declared. |
| `PASSIVE_PRO_CRITIQUE` | `SOURCE_ANCHORED_INTAKE` | Pro output captured as advisory input; no truth or task authority claimed. |
| `SOURCE_ANCHORED_INTAKE` | `PASSIVE_RED_TEAM` | Source state reported as created, registered, loaded, enforced, evidenced, unknown, or blocked. |
| `PASSIVE_RED_TEAM` | `PASSIVE_PATCH_CHAIN_RISK` | Red-team findings classified; unsafe or legal/security topics held or blocked. |
| `PASSIVE_PATCH_CHAIN_RISK` | `HUMANGATE_DECISION` | Split/reorder/block findings and HumanGate questions reported. |
| `HUMANGATE_DECISION` | `BOUNDED_TASK_CHARTER` | Human approves exactly one next step, surfaces, paths, output route, blocked actions, and expiry. |
| `BOUNDED_TASK_CHARTER` | `EXECUTOR_REPORT` | Human launches the bounded task separately; executor reports actual work. |
| `EXECUTOR_REPORT` | `OPTIONAL_PASSIVE_ANALYSIS_RECORD` | Report exists; analysis stays read-only and escalation-only. |

Missing required evidence produces `BLOCKED`.

## HumanGate Decision Record

HumanGate decisions should use this minimum shape:

```yaml
human_gate_decision:
  decision_id:
  human_words_ref:
  approved_next_step_only:
  denied_actions:
  surfaces_in_scope:
  paths_in_scope:
  paths_out_of_scope:
  output_routing:
  validation_allowed:
  expires_after_task: true
  legal_security_review_required:
  claim_posture: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

If `approved_next_step_only`, scope, routing, validation, or blocked actions are
missing, the decision cannot unlock a Task Charter.

## Legal And Security Trigger

Any state touching these topics must route to `BLOCKED` or
`ESCALATE_TO_HUMANGATE` pending legal/security review:

- personal data
- public release
- external systems
- cyber or security operations
- surveillance
- coercion
- biometric identification
- social scoring
- military or police use
- critical infrastructure control
- credential handling
- secret extraction
- autonomous real-world action

Legal/security review required does not mean approved.

## Forbidden Transition Shortcuts

These shortcuts are always `BLOCKED`:

| Shortcut | Reason |
| --- | --- |
| `PASSIVE_PRO_CRITIQUE -> BOUNDED_TASK_CHARTER` | Pro cannot create work authority. |
| `PASSIVE_PRO_CRITIQUE -> EXECUTOR_REPORT` | Critique is not execution. |
| `SOURCE_ANCHORED_INTAKE -> EXECUTOR_REPORT` | Intake is not execution. |
| `PASSIVE_RED_TEAM -> BOUNDED_TASK_CHARTER` | Red-team can ask questions, not authorize work. |
| `PASSIVE_PATCH_CHAIN_RISK -> EXECUTOR_REPORT` | Patch-chain review cannot apply patches. |
| `HUMANGATE_DECISION -> multiple unbounded tasks` | HumanGate unlocks one bounded next step only. |
| `EXECUTOR_REPORT -> claim promotion` | Reports require review and HumanGate before promotion. |
| `OPTIONAL_PASSIVE_ANALYSIS_RECORD -> execution` | Analysis is read-only and escalation-only. |

## Automatic Blockers

Return `BLOCKED` when a state or transition includes:

- missing human words
- missing source state
- missing output routing for file-producing work
- missing HumanGate question
- global ready/not-ready verdict
- Pro output treated as truth
- model output treated as final authority
- Codex execution without a bounded charter
- runtime activation
- training or fine-tuning
- dataset generation or reset
- benchmark proof
- model or checkpoint creation
- model promotion
- agent activation
- `latest.json`
- `lab/runs/RUN_*`
- automatic branch, commit, push, PR, ready, or merge
- public release without review
- personal data processing without review
- external system integration without review
- cyber-offense, surveillance, coercion, military/police, biometric/social scoring, or infrastructure-control work

## Output Routing

Any produced record must declare:

- produced file type
- intended surface
- canonical destination or stdout-only status
- temporary destination, if any
- forbidden destinations
- retention policy
- promotion gate

Unrouted output is `BLOCKED`.

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | This state machine cannot authorize runtime work. |
| tests | UNKNOWN | Test execution or modification requires a separate bounded task. |
| artifacts_runtime_outputs | BLOCKED | No run folder, latest output, dataset, benchmark, or model artifact is authorized. |
| canonical_docs | DOCUMENTED_ONLY | This is a control-plane state contract. |
| roadmap_docs_only | DOCUMENTED_ONLY | Roadmap items can be classified, not executed. |
| inference | PASSIVE | Pro and local models critique only. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, or merge authority. |
| training_authority | BLOCKED | No training or fine-tuning authority. |
| dataset_authority | BLOCKED | No dataset generation or reset authority. |
| benchmark_authority | BLOCKED | No benchmark proof authority. |

## Verdicts

software_verdict: CONTROL_PLANE_PIPELINE_STATE_MACHINE_DOCS_ONLY

evidence_verdict: STATE_MACHINE_CONTRACT_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
