# Truth Packet And Codex Pack Contract V0

## Purpose

Truth Packet And Codex Pack Contract V0 defines how Studio turns a captured
human request into a source-backed framing packet and then into a bounded Codex
handoff candidate without granting execution authority.

The Truth Packet frames what is known, unknown, blocked, source-backed, and
allowed. It is not truth by itself.

The Codex Pack packages a bounded work candidate for Codex. It is not Codex
execution authority by itself.

This document is documentation only. It does not create scripts, schemas,
agents, registries, workflows, automation, Codex calls, OpenAI calls, GitHub
calls, runtime behavior, training, dataset generation, benchmark logic, Git
actions, or claim authority.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Authority Boundary

Truth Packet may:

- preserve the human wording
- list canonical and reference sources
- report source state
- separate known, unknown, blocked, documented-only, passive, implemented, and
  tested surfaces
- frame assumptions and HumanGate questions
- identify allowed and forbidden surfaces

Truth Packet may not:

- become canonical truth
- replace `MASTER_DOCS/`
- prove implementation
- prove tests
- prove runtime behavior
- validate external facts without Search
- authorize Codex work

Codex Pack may:

- package bounded scope for a future Codex prompt
- list files in scope and files out of scope
- list blocked actions
- include output routing
- include expected validation
- include final report requirements
- point to the Truth Packet and RTM row that framed it

Codex Pack may not:

- launch Codex
- authorize execution
- mutate files
- create branches, PRs, commits, pushes, ready states, or merges
- activate runtime behavior
- train or fine-tune models
- generate or reset datasets
- run or claim benchmarks
- promote claims
- replace TaskPacket, ExecutionReport, ReviewPacket, LocalReviewPack, or
  HumanDecision

HumanGate remains final authority for deciding whether a Codex Pack can become a
TaskPacket or rendered Codex prompt.

## Intended Flow

```text
human words
-> Pro Request Intake
-> V2 RTM row
-> Truth Packet
-> HumanGate pre-execution decision
-> Codex Pack candidate
-> TaskPacket / rendered Codex prompt / handoff pack
-> human launches Codex separately, if approved
-> ExecutionReport
-> prompt/report hygiene and source-state checks
-> ReviewPacket / LocalReviewPack / LM Studio passive review
-> HumanGate final decision
```

Every arrow can stop at `HOLD`, `SPLIT`, `BLOCKED`, or
`ESCALATE_TO_HUMANGATE`.

## Relationship To Existing Objects

| Existing object | Relationship |
| --- | --- |
| Pro Request Intake | Captures and normalizes human intent before Truth Packet. |
| V2 RTM | Links human words, sources, source state, contracts, HumanGate, and evidence refs. |
| Source State Ledger | Supplies created, registered, loaded, enforced, evidenced state. |
| Deployment Columns | Classifies the request before any packet exists. |
| ROI Scoring | Provides advisory priority only. |
| Patch Chain Analyzer | Reviews sequencing before bounded work candidates. |
| Prompt And Report Hygiene | Checks prompt and report completeness. |
| TaskPacket | Existing bounded work object; Codex Pack may become or wrap a TaskPacket after HumanGate. |
| Render Codex Prompt | Dry-run renderer for a validated TaskPacket only. |
| Codex Handoff Pack | Dry-run packaging tool for validated TaskPacket; not execution authority. |
| ExecutionReport | Required structured report after any approved Codex work. |
| ReviewPacket / LocalReviewPack | Non-binding review and solo summary surfaces. |
| HumanDecision | Final authority record. |

The new terms are framing vocabulary. They do not supersede existing packet
schemas.

## Truth Packet Shape

Use this shape for future Truth Packet records:

```yaml
truth_packet:
  truth_packet_id:
  human_words:
  normalized_intent:
  rtm_refs:
  canonical_sources:
  reference_sources:
  excluded_sources:
  source_state:
    created:
    registered:
    loaded:
    enforced:
    evidenced:
    unknown:
    blocked:
  known_facts:
  unknowns:
  assumptions:
  contradictions:
  owner_surface:
  deployment_column:
  allowed_surfaces:
  forbidden_surfaces:
  expected_output:
  expected_validation:
  output_routing:
  humangate_question:
  blockers:
  claim_posture: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

The Truth Packet must name what it does not know. Missing critical source state
defaults to `BLOCKED`.

## Codex Pack Shape

Use this shape for future Codex Pack candidates:

```yaml
codex_pack:
  codex_pack_id:
  truth_packet_ref:
  rtm_ref:
  human_words:
  task_class:
  requested_model:
  reasoning_effort:
  sources_to_read:
  source_state_required:
  scope_in:
  scope_out:
  reference_only:
  allowed_paths:
  forbidden_paths:
  output_routing:
  blocked_actions:
  validation:
  final_report_required_fields:
    - repo_state
    - files_changed
    - commands_run
    - results
    - skipped_validation
    - risks
    - source_state
    - status_by_surface
    - software_verdict
    - evidence_verdict
    - claim_verdict
  humangate_precondition:
  claim_posture: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

A Codex Pack without `truth_packet_ref`, source state, scope in/out, output
routing, blocked actions, validation, and HumanGate precondition is `BLOCKED`.

## HumanGate Conditions

Before a Codex Pack can become a TaskPacket or rendered Codex prompt, HumanGate
should confirm:

1. The preserved human wording is accurate.
2. Required sources are loaded or gaps are accepted as blockers.
3. The Truth Packet does not create a second source of truth.
4. The deployment column is correct.
5. Runtime, Git, training, dataset, benchmark, and agent activation are not
   accidentally included.
6. Scope in/out and allowed/forbidden paths are explicit.
7. Output routing is explicit.
8. Validation matches the claimed surface.
9. Final report fields are complete.
10. `NO_CLAIM_ALLOWED` remains the claim posture.
11. Codex execution, if any, will be separately launched by the human.

## Automatic Blockers

Truth Packet or Codex Pack is `BLOCKED` when it includes:

- missing human wording
- missing critical source state
- source authority inferred from conversation memory only
- second source of truth
- replacing `MASTER_DOCS/`
- replacing `docs/control-plane/`
- overwriting `studio_review/`
- missing output routing for file-producing work
- broad or implicit scope
- runtime activation without explicit HumanGate runtime scope
- search/neural/ML behavior mutation without explicit scope
- training or fine-tuning
- dataset generation or reset
- benchmark proof
- model promotion
- holdout use as proof
- `latest.json`
- `lab/runs/RUN_*`
- autonomous Codex execution
- active agent loop
- automatic branch, commit, push, PR, ready, or merge
- claim escalation beyond `NO_CLAIM_ALLOWED`
- global ready/not-ready verdict

## Local Model Use

LM Studio, Mistral, or Devstral may review Truth Packets and Codex Packs as
passive critique only.

Allowed local model tasks:

- flag missing sources
- flag source-state gaps
- flag scope creep
- flag authority drift
- flag missing output routing
- flag missing final report fields
- suggest HumanGate questions
- recommend `HOLD`, `SPLIT`, or `BLOCKED`

Forbidden local model tasks:

- declare the Truth Packet true
- authorize Codex Pack execution
- create patches
- launch Codex
- validate runtime truth
- validate external facts without Search
- approve claims
- decide HumanGate

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | This contract cannot authorize runtime work. |
| tests | UNKNOWN | This document does not run tests. |
| artifacts_runtime_outputs | BLOCKED | No runtime, dataset, benchmark, run-bundle, or latest output is authorized. |
| canonical_docs | DOCUMENTED_ONLY | Truth Packet references canonical docs but cannot replace them. |
| roadmap_docs_only | DOCUMENTED_ONLY | Codex Pack candidates can frame roadmap work only. |
| inference | PASSIVE | Local models may critique packets only. |
| local_review_stack | PASSIVE | `studio_review/` outputs can be advisory packet reviews. |
| control_plane | DOCUMENTED_ONLY | This document defines packet vocabulary only. |
| concept_backlog | DOCUMENTED_ONLY | Concepts remain candidates until HumanGate. |
| agent_governance | PASSIVE | No active agent or automation is created. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, merge, or Git write authority. |

## Verdicts

software_verdict: CONTROL_PLANE_TRUTH_CODEX_PACK_CONTRACT_DOCS_ONLY

evidence_verdict: PACKET_FRAMING_CONTRACT_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
