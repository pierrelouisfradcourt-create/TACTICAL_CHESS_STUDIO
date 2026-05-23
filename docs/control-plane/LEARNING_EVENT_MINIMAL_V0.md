# LearningEvent Minimal V0

LearningEvent Minimal V0 records workflow experience as a local structured memory draft.

It captures what happened, the observed symptom, a root cause, impact, evidence references, corrective action, and a proposed preventive rule. It does not execute anything.

## Boundaries

LearningEvent Minimal V0 does not mutate rules automatically. Preventive rules are proposals only.

LearningEvent Minimal V0 does not train models, create datasets, call GitHub APIs, call Codex APIs, call OpenAI APIs, auto-ready a PR, auto-merge a PR, run benchmark automation, or change runtime, search, neural, ML, or training code.

HumanGate remains final authority. Accepted memory is future work and requires human review before any future action.

## Examples

- `BLOCKED_INFRA`: a control-plane check failed because infrastructure setup was missing.
- `DIRTY_WORKTREE`: startup stopped because local files were already modified.
- `CHECKS_PENDING`: a draft PR stayed on hold while remote checks were incomplete.
- `FINAL_GATE_DEPENDENCY_MISSING`: final-gate did not install required control-plane dependencies before smoke execution.

## Relation To Control-Plane Packets

LearningEvent can summarize incidents observed around `CampaignPlan`, `PRQueue`, `PRDecisionPacket`, and `LocalReviewPack`.

It does not mutate `CampaignPlan`, `PRQueue`, `TaskPacket`, `PRDecisionPacket`, or `LocalReviewPack`. It only produces a draft event that a human may later accept, reject, supersede, or route into a future memory system.

As a macro-adjacent record, LearningEvent may be consumed later as a normalized summary by passive future readers. Those readers do not read raw chaotic logs directly and do not act, route, schedule, mutate, approve, merge, promote, or decide.

## Verdicts

software_verdict: CONTROL_PLANE_LEARNING_EVENT_MINIMAL_ONLY

evidence_verdict: STRUCTURED_MEMORY_DRAFT_ONLY

claim_verdict: NO_CLAIM_ALLOWED
