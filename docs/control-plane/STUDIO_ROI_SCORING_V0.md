# Studio ROI Scoring V0

## Purpose

Studio ROI Scoring V0 defines a passive scoring vocabulary for deciding which
Studio governance ideas should be inspected, documented, packetized, parked, or
blocked first.

ROI scoring is advisory only. It does not authorize Codex execution, runtime
changes, agent activation, Git actions, training, dataset generation, benchmark
proof, model promotion, or claim promotion.

This document is documentation only. It does not add scripts, schemas, active
agents, automation, or runtime behavior.

## Authority Boundary

ROI scoring may propose priority. It may not decide.

HumanGate remains final authority for:

- turning an idea into a TaskPacket
- approving Codex execution
- promoting documentation
- unblocking runtime-gated work
- activating agents
- accepting claims
- committing, pushing, creating branches, opening PRs, readying, or merging

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Inputs

Each scored item should include:

- human wording or source reference
- deployment column
- current source state
- expected output
- expected validation
- affected surfaces
- known blockers
- HumanGate question
- duplicate or collision risk

Valid deployment columns are defined by
`docs/control-plane/STUDIO_DEPLOYMENT_COLUMNS_V0.md`:

- `docs-only`
- `tooling-passive`
- `local-review`
- `sandbox`
- `runtime-gated`
- `agent-candidate`
- `blocked`

## Score Dimensions

Use a 0-3 score for each positive dimension and a 0-3 score for each penalty.

Positive dimensions:

| Dimension | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| value | unclear | useful later | useful soon | unlocks multiple lanes |
| urgency | no timing pressure | can wait | near-term blocker | blocks current decision |
| reusability | one-off | limited reuse | reusable pattern | reusable control-plane primitive |
| clarity | vague | partially scoped | mostly scoped | fully scoped and source-backed |
| validation ease | unknown | manual readback only | local mechanical check | deterministic existing check |
| human leverage | low | saves minor effort | reduces repeated review | preserves human attention at scale |

Penalty dimensions:

| Dimension | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| implementation cost | none | low | medium | high |
| scope risk | none | small | moderate | broad |
| authority risk | none | advisory only | could confuse authority | could bypass HumanGate |
| collision risk | none | minor duplicate | overlaps existing system | creates competing truth |
| validation burden | none | readback | targeted tests | broad tests or unavailable proof |
| blocked-surface risk | none | adjacent | touches gated surface | directly blocked |

## Formula

```text
positive_score =
  value
  + urgency
  + reusability
  + clarity
  + validation_ease
  + human_leverage

penalty_score =
  implementation_cost
  + scope_risk
  + authority_risk
  + collision_risk
  + validation_burden
  + blocked_surface_risk

roi_score = positive_score - penalty_score
```

This is a sorting heuristic, not evidence and not authority.

## Priority Labels

| Label | Rule | Meaning |
| --- | --- | --- |
| `P0` | `roi_score >= 9` and no penalty is 3 | High leverage, low enough risk, good next candidate |
| `P1` | `roi_score >= 4` | Useful after P0 or after clarification |
| `P2` | `roi_score >= 0` | Keep in backlog, not urgent |
| `PARKED` | `roi_score < 0` and no automatic blocker | Preserve idea, do not spend attention now |
| `BLOCKED` | any automatic blocker | Stop until HumanGate narrows or unblocks |

Automatic blockers override score.

## Automatic Blockers

An item is `BLOCKED` regardless of ROI score if it includes:

- runtime activation
- runtime/search/neural refactor without explicit HumanGate scope
- training or fine-tuning
- dataset generation or reset
- benchmark proof
- model promotion
- holdout use
- `latest.json`
- `lab/runs/RUN_*`
- autonomous agent loop
- automatic branch, commit, push, PR, ready, or merge
- output writes without routing
- global ready/not-ready verdict
- second source of truth
- replacing `docs/control-plane/`
- overwriting `studio_review/`
- missing critical source state

## Example Scores

| Candidate | Column | Score posture | Priority | Rationale |
| --- | --- | --- | --- | --- |
| Concept fusion matrix | `docs-only` | high value, low cost, low authority risk | `P0` | Prevents duplicate pipeline and preserves repo truth. |
| Deployment columns | `docs-only` | high routing value, low cost | `P0` | Classifies work before packets or patches. |
| ROI scoring vocabulary | `docs-only` | high prioritization value, low cost | `P0` | Reduces attention waste and scope drift. |
| Agent Breathing policy | `agent-candidate` | high human leverage, moderate authority risk | `P0/P1` | Needed before more agents, but must be tightly bounded. |
| LM Studio review contract | `local-review` | high review value, low runtime risk | `P1` | Makes local review repeatable without authority. |
| Patch Chain vocabulary adapter | `tooling-passive` | useful, but overlaps existing packet model | `P1` | Must avoid duplicating TaskPacket/CampaignPlan. |
| Rocky discovery report | `docs-only` | potentially valuable, source clarity unknown | `P1/P2` | Safe only as discovery after truth/hygiene. |
| Gameplay bricks map | `docs-only` | product value, scope still broad | `P2` | Needs clearer constraints and metrics. |
| Runtime patch | `runtime-gated` | possible future value, blocked-surface risk | `BLOCKED` | Requires separate explicit HumanGate and tests. |
| Training or dataset generation | `blocked` | automatic blocker | `BLOCKED` | Forbidden in this governance phase. |

## HumanGate Questions

Before a `P0` or `P1` item becomes work, HumanGate should answer:

1. Is the candidate source-backed enough to proceed?
2. Which deployment column owns it?
3. Which existing control-plane object owns it?
4. What files may change?
5. What files and surfaces are forbidden?
6. What validation proves only the allowed claim?
7. What would make the item `BLOCKED`?
8. What human wording must be preserved?

## Recommended Early Backlog

Based on the current governance discussion, the likely order is:

1. `P0` - Concept fusion matrix.
2. `P0` - Deployment columns.
3. `P0` - ROI scoring vocabulary.
4. `P0/P1` - Agent Breathing policy.
5. `P1` - LM Studio review contract.
6. `P1` - Patch Chain vocabulary adapter.
7. `P1/P2` - Rocky discovery only.
8. `P2` - Gameplay bricks map.
9. `BLOCKED` - runtime, training, dataset, benchmark, and active agent work.

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | ROI scoring cannot authorize runtime work. |
| tests | UNKNOWN | This document is docs-only and does not inspect behavior. |
| artifacts_runtime_outputs | BLOCKED | No runtime, model, dataset, benchmark, run-bundle, or latest output is authorized. |
| canonical_docs | DOCUMENTED_ONLY | This is a control-plane scoring vocabulary, not canonical runtime truth. |
| roadmap_docs_only | DOCUMENTED_ONLY | Scores can rank roadmap ideas but cannot prove them. |
| inference | PASSIVE | Local LLMs may critique scores but cannot decide. |
| local_review_stack | PASSIVE | `studio_review/` may review scored items only as advisory input. |
| control_plane | DOCUMENTED_ONLY | This document defines priority language only. |
| concept_backlog | DOCUMENTED_ONLY | Backlog priority is advisory until HumanGate. |
| agent_governance | PASSIVE | Agent scoring does not activate agents. |

## Verdicts

software_verdict: CONTROL_PLANE_ROI_SCORING_DOCS_ONLY

evidence_verdict: PRIORITY_VOCABULARY_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
