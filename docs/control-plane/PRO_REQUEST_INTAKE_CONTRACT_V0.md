# Pro Request Intake Contract V0

## Purpose

Pro Request Intake Contract V0 defines how raw human ideas, strategy notes, Pro
outputs, local review findings, and mega-pack concepts are converted into
bounded Studio requests before any TaskPacket, Codex prompt, patch chain, or
execution lane is considered.

The intake layer preserves the human's words, classifies the request, identifies
source gaps, proposes routing, and asks the HumanGate question. It does not
execute work.

This document is documentation only. It does not create scripts, schemas,
agents, registries, workflows, automation, Codex calls, OpenAI calls, GitHub
calls, runtime behavior, training, dataset generation, benchmark logic, Git
actions, or claim authority.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Authority Boundary

Pro Request intake may recommend:

- `ACCEPT_FOR_FRAMING`
- `HOLD_FOR_SOURCE`
- `SPLIT`
- `ROUTE_TO_REVIEW`
- `ROUTE_TO_TASKPACKET_DRAFT`
- `ESCALATE_TO_HUMANGATE`
- `BLOCKED`

Pro Request intake may not:

- create a TaskPacket as authority
- launch Codex
- apply patches
- mutate repo files
- start runtime work
- start training or fine-tuning
- generate or reset datasets
- run or claim benchmarks
- create branches
- create PRs
- stage, commit, push, ready, or merge
- promote claims
- replace HumanGate

HumanGate remains final authority for turning any request into work.

## Relationship To Existing Objects

| Existing object | Relationship |
| --- | --- |
| Human Command Vocabulary | Explicit human commands can constrain or override intake classification. |
| Project Breakdown | Receives accepted large objectives and decomposes them into epics, PatchGroups, candidates, dependencies, and exit criteria. |
| CampaignPlan | Receives approved larger bounded objectives after decomposition. |
| PRQueue | Sequences approved PR candidates only. |
| TaskPacket | Receives only a bounded request after HumanGate. |
| Codex prompt | Rendered from a validated TaskPacket only; intake cannot launch it. |
| LM Studio review | May critique a Pro Request as passive review only. |
| HumanDecision | The final decision surface. |

The Pro Request is pre-packet intake. It is not a second packet authority.

## Intake Record Shape

Use this shape for future Pro Request intake records:

```yaml
pro_request_intake:
  request_id:
  human_words:
  normalized_intent:
  source_refs:
  source_state:
  requested_outcome:
  deployment_column:
  owner_surface:
  scope_in:
  scope_out:
  forbidden_surfaces:
  expected_output:
  expected_validation:
  output_routing:
  roi_label:
  review_needed:
  split_needed:
  blocked_actions:
  humangate_question:
  recommended_route:
  claim_posture: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

`human_words` must preserve the human wording or a concise exact fragment. The
system may normalize intent, but it must not erase or replace the human's
meaning.

## Request Classes

| Class | Meaning | Allowed route |
| --- | --- | --- |
| `DISCOVERY_ONLY` | Inspect, map, or understand without changes. | docs-only report or passive review |
| `DOCS_ONLY_REGISTRATION` | Add or adjust documentation only. | docs-only after HumanGate scope |
| `PASSIVE_REVIEW` | Ask LM Studio, specialist, or red-team review. | local-review or tooling-passive |
| `PASSIVE_TOOLING_SPEC` | Specify a future validator, linter, or dry-run tool. | docs-only or tooling-passive |
| `PATCH_CHAIN_PLAN` | Organize future patches without applying them. | patch-chain analyzer and HumanGate |
| `TASKPACKET_CANDIDATE` | Candidate for bounded Codex work. | HumanGate, then TaskPacket draft |
| `RUNTIME_GATED` | Touches Rust/search/neural/ML/game behavior. | BLOCKED until explicit runtime scope |
| `BLOCKED_REQUEST` | Requests forbidden or unsafe work. | stop and report blockers |

## Intake Checks

Each request must be checked for:

- human wording preserved
- source references present
- source state declared
- deployment column declared
- owner surface declared
- scope in/out declared
- forbidden surfaces declared
- output route declared if file-producing
- validation expectation declared
- HumanGate question present
- ROI label or reason for skipping ROI
- local review need
- patch-chain need
- split need
- blocked actions
- claim posture

Missing critical fields produce `HOLD_FOR_SOURCE` or `BLOCKED`, not execution.

## Split Rules

A request should become `SPLIT` when it combines:

- docs-only and runtime work
- local review and file mutation
- prompt generation and patch application
- planning and execution
- multiple repo surfaces with different owners
- model review and final decision
- Git action and implementation
- dataset/training/benchmark work with any other work

Split output should be a list of smaller Pro Requests, not patches.

## Route Rules

| Condition | Recommended route |
| --- | --- |
| source missing | `HOLD_FOR_SOURCE` |
| scope unclear | `HOLD_FOR_SOURCE` |
| multiple surfaces | `SPLIT` |
| docs-only and bounded | `DOCS_ONLY_REGISTRATION` |
| passive critique needed | `ROUTE_TO_REVIEW` |
| patch order question | `PATCH_CHAIN_PLAN` |
| implementation candidate | `ROUTE_TO_TASKPACKET_DRAFT` after HumanGate |
| runtime/search/neural/ML touch | `RUNTIME_GATED` and HumanGate |
| forbidden authority requested | `BLOCKED` |

No route may skip HumanGate.

## Automatic Blockers

Return `BLOCKED` when the request includes:

- autonomous Codex execution
- active agent loop
- runtime activation without explicit scope
- search/neural/ML behavior mutation without explicit scope
- training or fine-tuning
- dataset generation or reset
- benchmark proof
- model promotion
- holdout use as proof
- `latest.json`
- `lab/runs/RUN_*`
- automatic branch, commit, push, PR, ready, or merge
- output writes without routing
- critical source state `UNKNOWN`
- claim escalation beyond `NO_CLAIM_ALLOWED`
- global ready/not-ready verdict
- second source of truth
- replacing `MASTER_DOCS/`
- replacing `docs/control-plane/`
- overwriting `studio_review/`

## HumanGate Questions

Before a Pro Request becomes any downstream packet, HumanGate should answer:

1. Is the preserved human wording accurate?
2. Which deployment column owns the request?
3. Which repo surface owns it?
4. What source state is sufficient?
5. What file paths are allowed?
6. What file paths are forbidden?
7. What output route is allowed?
8. What validation proves only the allowed claim?
9. Does this need local model review first?
10. Does this need patch-chain analysis first?
11. What would make the request `BLOCKED`?

## Local Model Use

LM Studio, Mistral, or Devstral may critique Pro Request intake as passive review
only.

Allowed local model tasks:

- identify missing source state
- flag scope creep
- flag unclear HumanGate question
- flag authority drift
- suggest splits
- suggest blocked surfaces

Forbidden local model tasks:

- authorize a route
- launch Codex
- produce implementation patches
- replace the human wording
- validate claims
- decide HumanGate

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | Intake cannot authorize runtime work. |
| tests | UNKNOWN | This document does not run tests. |
| artifacts_runtime_outputs | BLOCKED | No runtime, dataset, benchmark, run-bundle, or latest output is authorized. |
| canonical_docs | DOCUMENTED_ONLY | Intake may reference canonical docs but cannot promote them. |
| roadmap_docs_only | DOCUMENTED_ONLY | Ideas can become roadmap candidates only. |
| inference | PASSIVE | Local models may critique intake only. |
| local_review_stack | PASSIVE | `studio_review/` may review intake records as advisory input. |
| control_plane | DOCUMENTED_ONLY | This document defines intake vocabulary only. |
| agent_governance | PASSIVE | No active agent or automation is created. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, merge, or Git write authority. |

## Verdicts

software_verdict: CONTROL_PLANE_PRO_REQUEST_INTAKE_DOCS_ONLY

evidence_verdict: PRE_PACKET_INTAKE_CONTRACT_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
