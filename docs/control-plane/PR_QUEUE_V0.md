# PRQueue V0

PRQueue V0 is a sequencing object, not an executor. It orders PR candidates produced by a CampaignPlan and records whether a candidate is queued, ready for handoff, in progress, waiting for checks, blocked, safe to ready, merged, closed, or cancelled.

The queue does not create branches, call Codex, call OpenAI, call GitHub, ready PRs, merge PRs, or mutate repository files. Queue entries can become TaskPackets or Codex handoff packs later, after human approval.

## Queue Decisions

The queue-level verdict is one of:

- GO: the next queued candidate can be prepared for bounded handoff
- HOLD: stop for human review or missing local evidence
- BLOCKED: stop because scope, validation, or policy failed
- BLOCKED_INFRA: stop because infrastructure failed before content evaluation

`current_index` points at the next candidate under consideration. It is planning state only.

## Merge And Human Gates

`merge_allowed` defaults to false in valid fixtures. `human_gate_required` remains true at the queue and candidate levels.

The merge policy keeps:

- `auto_merge_allowed` false
- `ready_requires_human` true
- `merge_requires_human` true
- `match_head_commit_required` true

This means PRQueue can help plan order, but cannot mark ready, cannot merge, and cannot bypass a human decision.

## Local-First Reports

Local-first reports feed the next queue step. A candidate can become ready for handoff only after local validation is understood and the human accepts the scope.

GitHub Actions is a final short gate after local validation. Naive path-filter changes are outside this pack, because skipped required workflows can remain pending.

LearningEvent integration is future work. `learning_event_required` can record that a learning event should be produced later, but `auto_mutation_allowed` remains false.

## Verdicts

software_verdict: CONTROL_PLANE_PATCHPACK_SCHEMA_TOOLING_ONLY

evidence_verdict: LOCAL_FIRST_PATCHPACK_PLANNING_ONLY

claim_verdict: NO_CLAIM_ALLOWED
