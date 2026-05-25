# LearningTrace V1 Standard (PR-LS-002)

## Purpose

Define the minimal schema standard for the V1 verified learning-trace pipeline in TacticalChessPureLab.

This standard is documentation/specification only.

## Scope

This document defines minimal schema objects for:

- OutcomeTrace
- EvidenceEvent
- AssessmentInput
- PostPlayAssessment
- LearningTrace
- TraceAdmissionDecision
- NextTrainingRecommendation stub

Core invariant:

```text
observable_event
-> failure_tag
-> skill_id
-> concept_id
-> feedback_key
-> trace_admission_decision
-> next_training_key
```

## Non-goals

- No runtime behavior implementation.
- No puzzle or training implementation.
- No classifier implementation.
- No ML/training pipeline rewrite.
- No benchmark, holdout execution, or dataset reset policy change.

## Schema Objects

### OutcomeTrace

Purpose:
Record what happened after an action or scripted sequence.

Fields:

- `schema_version`
- `trace_id`
- `source`
- `initial_state_ref`
- `action_sequence`
- `terminal_state_ref`
- `outcome_status`
- `outcome_tags`
- `deterministic_context`
- `notes`

### EvidenceEvent

Purpose:
Atomic observable event used for post-play assessment.

Fields:

- `event_id`
- `event_type`
- `ply_or_step`
- `actor`
- `action_id`
- `legal_action_context`
- `concept_id`
- `skill_id`
- `success_tag`
- `failure_tag`
- `evidence_weight`
- `notes`

### AssessmentInput

Purpose:
Input object consumed by post-play logic.

Fields:

- `assessment_id`
- `outcome_trace_ref`
- `decision_trace_ref`
- `evidence_events`
- `objective_id`
- `concept_id`
- `skill_ids`
- `allowed_assessment_modes`
- `notes`

### PostPlayAssessment

Purpose:
Explain what happened without mutating runtime.

Fields:

- `assessment_id`
- `result`
- `critical_moment`
- `observed_successes`
- `observed_failures`
- `missed_skill_ids`
- `feedback_key`
- `agent_diagnostics`
- `next_training_key`
- `trace_admission_hint`

### LearningTrace

Purpose:
Final learning trace record.

Fields:

- `learning_trace_id`
- `source_assessment_id`
- `concept_id`
- `skill_ids`
- `objective_id`
- `selected_action_id`
- `observable_events`
- `feedback_key`
- `trace_admission_decision`
- `next_training_key`
- `non_canonical`
- `claim_verdict`

### TraceAdmissionDecision

Purpose:
Decision on how the trace may be used.

Allowed values:

- `discard`
- `positive_example`
- `negative_for_classifier`
- `counterfactual_candidate`
- `regression_case`
- `holdout_candidate_label_only`

Important:
`holdout_candidate_label_only` is only a label. It must not trigger actual holdout use.

### NextTrainingRecommendation stub

Purpose:
Recommendation pointer only, not a scheduler.

Fields:

- `next_training_key`
- `reason`
- `concept_id`
- `skill_ids`
- `difficulty_hint`
- `blocking_missing_evidence`

## Field Ownership: Evidence vs Feedback vs Dataset Decision

Evidence ownership (observables and context):

- `OutcomeTrace`: `source`, `initial_state_ref`, `action_sequence`, `terminal_state_ref`, `outcome_status`, `outcome_tags`, `deterministic_context`
- `EvidenceEvent`: `event_type`, `ply_or_step`, `actor`, `action_id`, `legal_action_context`, `concept_id`, `skill_id`, `success_tag`, `failure_tag`, `evidence_weight`
- `AssessmentInput`: `outcome_trace_ref`, `decision_trace_ref`, `evidence_events`, `objective_id`, `concept_id`, `skill_ids`

Feedback ownership (post-play interpretation/output):

- `PostPlayAssessment`: `result`, `critical_moment`, `observed_successes`, `observed_failures`, `missed_skill_ids`, `feedback_key`, `agent_diagnostics`, `next_training_key`, `trace_admission_hint`
- `LearningTrace`: `feedback_key`, `next_training_key`
- `NextTrainingRecommendation`: `next_training_key`, `reason`, `difficulty_hint`, `blocking_missing_evidence`

Dataset decision ownership (admission and dataset-routing intent):

- `LearningTrace`: `trace_admission_decision`, `non_canonical`, `claim_verdict`
- `TraceAdmissionDecision`: value selection itself
- `NextTrainingRecommendation`: pointer only, no scheduler side effects

Cross-cutting identity/metadata ownership:

- `schema_version`, `trace_id`, `event_id`, `assessment_id`, `learning_trace_id`, `notes`

## Determinism Rules

- `schema_version` must be explicit on serialized schema-bearing objects.
- IDs must be stable and reproducible from deterministic inputs.
- `action_sequence` order must be preserved and never re-sorted.
- `evidence_events` ordering must be deterministic (for example by `ply_or_step`, then `event_id`).
- `deterministic_context` must capture deterministic replay anchors (for example seed, scenario key, fixture key, version tag).
- Null or missing optional information must be represented explicitly rather than inferred.

## Runtime Mutation Rule

PostPlay consumes traces and never mutates runtime.

Operational interpretation:

- no runtime authority transfer
- no move legality mutation
- no engine/search/neural wiring change through post-play objects

## Dataset Safety Rules

- `holdout_candidate_label_only` is a label only and must not execute holdout flows.
- No dataset reset action is implied by any schema field.
- `non_canonical` must be available to keep traces outside canonical training ingestion by default.
- `trace_admission_decision` captures policy intent, not automatic irreversible dataset mutation.
- No proof may rely on `latest.json` or `lab/runs/**` artifacts.

## Claim Restrictions

- No benchmark-as-proof claims.
- No holdout-as-proof claims.
- No strength, Elo, promotion, or scientific-proof claims.
- `claim_verdict` remains `NO_CLAIM_ALLOWED` for this V1 schema-spec phase.

## Relationship To PR-LS-001

PR-LS-001 established the foundations evidence index and identified missing learning-system building blocks.

This PR-LS-002 document defines the minimal schema contract for those missing trace objects without implementing runtime behavior.

## Next Issue

Next issue: PR-LS-003 fork concept/drill fixtures (#143).
