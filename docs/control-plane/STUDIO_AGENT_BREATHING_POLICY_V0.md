# Studio Agent Breathing Policy V0

## Purpose

Studio Agent Breathing Policy V0 defines how future Studio agents, reviewers,
specialists, and automation candidates may be opened, paused, resumed, or closed
without creating noise, autonomy, or a broken chain back to the human.

This document is documentation only. It does not create agents, runners,
registries, schedules, API calls, workflows, scripts, permissions, runtime
behavior, training, benchmark logic, dataset generation, Git automation, or
claim authority.

The goal is not to run more agents. The goal is to keep the system breathable:
only useful lanes stay open, stale lanes are paused, and every lane remains tied
to the human words that created it.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Authority Boundary

Agent breathing is an intake and attention policy. It may recommend whether a
lane should stay active, pause, resume, or close. It may not decide.

HumanGate remains final authority for:

- opening an active execution lane
- allowing Codex execution
- allowing repo mutation
- allowing runtime work
- activating agents
- accepting or promoting claims
- committing, pushing, branching, opening PRs, readying, or merging

No breathing rule may bypass `AI_ORG_CHART_V0.md`,
`REPORTING_CHAIN_V0.md`, `SPECIALIST_FREEZE_POLICY_V0.md`, or
`STUDIO_DEPLOYMENT_COLUMNS_V0.md`.

## Breathing States

| State | Meaning | Authority |
| --- | --- | --- |
| `OPEN_PASSIVE` | A bounded reader, reviewer, scorer, or planner may inspect and report. | PASSIVE |
| `OPEN_MUTATING` | A bounded executor may modify explicitly allowed files. | BLOCKED until HumanGate |
| `PAUSED` | The lane is preserved but should receive no new prompts or work. | PASSIVE |
| `CLOSED` | The lane has produced its summary or is no longer useful. | DOCUMENTED_ONLY |
| `ESCALATED` | The lane hit an authority, source, risk, or collision issue. | HumanGate required |
| `BLOCKED` | The lane requests or implies forbidden work. | BLOCKED |

`OPEN_MUTATING` is not authorized by this document. It is listed only to define
the boundary.

## Lane Budget

The safe default is:

- active runtime lanes: `0`
- active Git-authority lanes: `0`
- active training/dataset/benchmark lanes: `0`
- active repo-mutating Codex lanes: `0` unless explicitly approved
- passive analysis lanes: up to `4` when each lane has a different question
- local model review lanes: up to `2` when outputs are routed and advisory

More than two lanes can be useful when the lanes are passive and genuinely
different. More than four passive lanes usually creates attention debt unless a
CEO Office or Director layer is explicitly compressing results.

Parallel passive lanes are allowed only when all of the following are true:

- each lane has a clear HumanGate question
- each lane has a source bundle or stated source gap
- each lane has a declared deployment column
- each lane has an output route
- no lane can mutate files, state, Git, runtime, datasets, or benchmarks
- no lane can promote claims
- no lane depends on a result from another lane that is not complete

## Human Words Preservation

Every opened lane must preserve the human wording that started it.

A lane packet should carry:

- `human_words`: the user's exact wording or concise quoted fragment
- `interpretation`: the system's bounded interpretation
- `source_refs`: local docs, repo paths, reports, or explicit source gaps
- `question`: the exact question the lane must answer
- `forbidden_outputs`: actions or claims the lane may not produce
- `return_path`: where the lane reports back for human review

The system may compress and structure, but it must not erase the human intent.
If compression changes meaning, the lane must pause and ask for HumanGate
clarification.

## Open Rules

A lane may be opened as `OPEN_PASSIVE` when:

- ROI is `P0`, `P1`, or explicitly requested by the human
- deployment column is `docs-only`, `tooling-passive`, `local-review`, or
  `agent-candidate`
- source state is not critical-`UNKNOWN`
- output routing is explicit
- the lane has a bounded question
- the lane has a close condition

A lane must not be opened when:

- it requires runtime activation
- it requires training, fine-tuning, dataset generation, or benchmark proof
- it requires Git automation
- it would overwrite `docs/control-plane/`, `MASTER_DOCS/`, or
  `studio_review/`
- it creates a second source of truth
- it has no consumer
- it has no HumanGate return path

## Pause Rules

A lane should move to `PAUSED` when:

- the output is not being consumed
- the same objection has been repeated twice
- the source bundle is missing or stale
- the lane is waiting on HumanGate
- the lane depends on another lane that is blocked
- the ROI priority drops below current work
- the lane creates more noise than decision value
- the lane's question has drifted

Paused lanes should keep a short summary:

```yaml
lane:
  state: PAUSED
  human_words:
  last_useful_output:
  pause_reason:
  resume_condition:
  blocked_surfaces:
  return_path:
```

## Resume Rules

A paused lane may resume only when a new HumanGate or source event changes the
state.

Resume requires:

- original human wording or a replacement approved by the human
- updated source bundle
- updated question
- updated output route
- explicit scope in/out
- current ROI label
- close condition

No paused lane should self-resume.

## Close Rules

A lane should move to `CLOSED` when:

- it answered the bounded question
- it produced a summary consumed by the next layer
- it was superseded by a better lane
- it is no longer relevant to current HumanGate decisions
- it is permanently blocked by doctrine

Closed lanes may be referenced later, but they should not keep receiving prompts.

## Pipeline Split

The pipeline may be split into multiple passive columns when the goal is
analysis, compression, or collision detection:

| Column | Role | Breathing posture |
| --- | --- | --- |
| truth intake | source anchoring, source gaps, contradiction detection | OPEN_PASSIVE |
| architecture review | system shape, layer collisions, authority risks | OPEN_PASSIVE |
| ROI review | priority and attention cost | OPEN_PASSIVE |
| red-team review | abuse, drift, false claims, autonomy risk | OPEN_PASSIVE |
| patch-chain review | proposed sequence and dependency risk | OPEN_PASSIVE |
| local model review | Mistral/Devstral critique and objections | PASSIVE |
| Codex execution | bounded file changes after HumanGate | BLOCKED until explicit approval |
| runtime validation | Rust/runtime behavior checks | BLOCKED until explicit approval |

This split is a review topology, not an automation topology.

## Useless Flow Detection

A flow is considered low-value when it shows one or more of:

- no downstream consumer
- no HumanGate question
- no source delta since last review
- no new risk, contradiction, or decision
- repeated generic advice
- output cannot be routed
- output cannot be validated even as docs-only
- output bypasses the reporting chain
- output expands scope instead of reducing uncertainty

Low-value flows should be paused before opening new lanes.

## Required Report Shape

Any future breathing report should use:

```yaml
breathing_report:
  lane_id:
  human_words:
  current_state:
  recommended_state:
  deployment_column:
  roi_label:
  source_state:
  useful_output:
  noise_or_collision:
  human_decision_needed:
  blocked_surfaces:
  no_global_ready_verdict: true
```

This report is advisory and does not activate agents.

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | Breathing policy cannot authorize runtime work. |
| tests | UNKNOWN | This document defines policy only and does not inspect behavior. |
| artifacts_runtime_outputs | BLOCKED | No runtime, dataset, benchmark, run-bundle, or latest output is authorized. |
| canonical_docs | DOCUMENTED_ONLY | This is control-plane policy, not runtime truth. |
| roadmap_docs_only | DOCUMENTED_ONLY | Agent breathing can organize roadmap attention only. |
| inference | PASSIVE | Local models may critique lanes but cannot decide. |
| local_review_stack | PASSIVE | `studio_review/` can review lane packets only as advisory input. |
| control_plane | DOCUMENTED_ONLY | This document extends governance vocabulary only. |
| agent_governance | PASSIVE | Agents remain inactive unless separately authorized. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, merge, or Git write authority. |

## Verdicts

software_verdict: CONTROL_PLANE_AGENT_BREATHING_DOCS_ONLY

evidence_verdict: ATTENTION_ROUTING_POLICY_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
