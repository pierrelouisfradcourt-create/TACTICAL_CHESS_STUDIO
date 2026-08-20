# V2 Requirements Traceability Matrix Contract V0

## Purpose

V2 Requirements Traceability Matrix Contract V0 defines how Studio may trace
human requests, Pro outputs, mega-pack concepts, source anchors, control-plane
contracts, HumanGate decisions, expected outputs, and evidence references
without creating a second source of truth.

The RTM is a reference map. It links requirements to sources and decisions. It
does not replace `MASTER_DOCS/`, `docs/control-plane/`, `docs/gpt-navigator/`,
`studio_review/`, TaskPacket, ExecutionReport, ReviewPacket, LocalReviewPack,
or HumanDecision.

This document is documentation only. It does not create scripts, schemas,
agents, registries, workflows, automation, Codex calls, OpenAI calls, GitHub
calls, runtime behavior, training, dataset generation, benchmark logic, Git
actions, or claim authority.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Authority Boundary

The RTM may:

- map a human request to known source anchors
- map a concept to an owner surface
- record source state
- record deployment column
- record HumanGate question and decision state
- record expected output and validation
- record evidence references after validation
- reveal gaps, duplicate concepts, and blocked surfaces

The RTM may not:

- become canonical truth
- prove implementation
- prove tests
- prove runtime behavior
- validate external facts
- launch Codex
- authorize TaskPackets
- create branches, PRs, commits, pushes, ready states, or merges
- activate agents
- train or fine-tune models
- generate or reset datasets
- run or claim benchmarks
- promote claims
- replace HumanGate

HumanGate remains final authority for execution, promotion, activation, merge,
freeze, and claim decisions.

## Relationship To Existing Contracts

| Existing contract | RTM relationship |
| --- | --- |
| `PRO_REQUEST_INTAKE_CONTRACT_V0.md` | RTM can link raw human words to normalized request records. |
| `SOURCE_STATE_LEDGER_CONTRACT_V0.md` | RTM records created, registered, loaded, enforced, evidenced states. |
| `STUDIO_CONCEPT_FUSION_MATRIX_V0.md` | RTM references concept-owner mappings and collision blockers. |
| `STUDIO_DEPLOYMENT_COLUMNS_V0.md` | RTM records the deployment column for each requirement. |
| `STUDIO_ROI_SCORING_V0.md` | RTM records advisory ROI label, not decision authority. |
| `PROMPT_AND_REPORT_HYGIENE_CONTRACT_V0.md` | RTM records prompt/report hygiene gates and report fields. |
| `PATCH_CHAIN_ANALYZER_CONTRACT_V0.md` | RTM records dependency and ordering analysis links. |
| `LM_STUDIO_REVIEW_CONTRACT_V0.md` | RTM can link passive local model review outputs as annex material. |
| `STUDIO_AGENT_BREATHING_POLICY_V0.md` | RTM can link lane state and pause/resume decisions. |

The RTM links these contracts. It does not enforce them by itself.

## RTM Row Shape

Use this row shape for future RTM records:

```yaml
rtm_row:
  requirement_id:
  human_words:
  normalized_requirement:
  source_refs:
  source_state:
    created:
    registered:
    loaded:
    enforced:
    evidenced:
    unknown:
    blocked:
  owner_surface:
  deployment_column:
  related_contracts:
  scope_in:
  scope_out:
  forbidden_surfaces:
  expected_output:
  expected_validation:
  output_route:
  roi_label:
  review_refs:
  patch_chain_refs:
  humangate_question:
  humangate_state:
  evidence_refs:
  current_status:
  blockers:
  claim_posture: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

`human_words` must preserve the user's wording or a concise exact fragment.

`evidence_refs` must point to concrete local files, commands, reports, or
HumanGate decisions. The RTM row itself is not evidence.

## Requirement Status

Use these RTM requirement states:

| State | Meaning |
| --- | --- |
| `CAPTURED` | Human wording or source concept was recorded. |
| `MAPPED` | Owner surface and deployment column were identified. |
| `SOURCE_GAP` | Required source state is missing or `UNKNOWN`. |
| `REVIEW_NEEDED` | Passive local, specialist, prompt, report, or red-team review is needed. |
| `SPLIT_NEEDED` | Requirement crosses surfaces and must be decomposed. |
| `HUMANGATE_PENDING` | Human decision is required before the next state. |
| `PACKET_CANDIDATE` | Could become a bounded TaskPacket after HumanGate. |
| `DOCUMENTED_ONLY` | Valid docs-only record or roadmap item. |
| `PASSIVE` | Advisory review, tooling spec, or non-authoritative analysis. |
| `BLOCKED` | Stop until blocker is resolved. |

These are RTM states, not implementation proof.

## Trace Rules

Each requirement must trace:

1. from human wording or source concept
2. to source references
3. to source state
4. to owner surface
5. to deployment column
6. to allowed and forbidden surfaces
7. to output route
8. to expected validation
9. to HumanGate question
10. to evidence references only after validation exists

Missing critical links produce `SOURCE_GAP`, `SPLIT_NEEDED`,
`HUMANGATE_PENDING`, or `BLOCKED`.

## Automatic Blockers

An RTM row is `BLOCKED` when it includes:

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
- output writes without routing
- critical source state `UNKNOWN`
- claim escalation beyond `NO_CLAIM_ALLOWED`
- global ready/not-ready verdict
- second source of truth
- replacing `MASTER_DOCS/`
- replacing `docs/control-plane/`
- overwriting `studio_review/`

## Evidence Rules

The RTM may reference evidence only when evidence already exists.

Allowed evidence references:

- exact command outputs in a report
- validated ExecutionReport or intake output
- ReviewPacket or LocalReviewPack as non-binding review material
- HumanDecision or explicit HumanGate decision
- readback and `git diff --check` for docs-only work
- targeted tests for code work
- local model review outputs as advisory annexes only

Forbidden evidence references:

- the RTM row itself
- conversation memory alone
- generated report without validation
- benchmark summary as proof without explicit benchmark scope
- local model output as final truth
- old docs that conflict with live repo state

## Local Model Use

LM Studio, Mistral, or Devstral may review RTM rows as passive critique only.

Allowed local model tasks:

- flag missing source links
- flag unclear owner surface
- flag missing HumanGate question
- flag claim or evidence overreach
- flag duplicate or conflicting requirements
- suggest split or blocker classification

Forbidden local model tasks:

- mark a requirement implemented
- validate truth
- decide HumanGate
- promote claims
- create patches
- launch Codex
- approve runtime, Git, dataset, training, or benchmark work

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | RTM cannot authorize runtime work. |
| tests | UNKNOWN | This document does not run tests. |
| artifacts_runtime_outputs | BLOCKED | No runtime, dataset, benchmark, run-bundle, or latest output is authorized. |
| canonical_docs | DOCUMENTED_ONLY | RTM references canonical docs but cannot replace them. |
| roadmap_docs_only | DOCUMENTED_ONLY | RTM can map roadmap items only. |
| inference | PASSIVE | Local models may critique RTM rows only. |
| local_review_stack | PASSIVE | `studio_review/` outputs can be advisory RTM refs. |
| control_plane | DOCUMENTED_ONLY | This document defines traceability vocabulary only. |
| concept_backlog | DOCUMENTED_ONLY | Concepts remain candidates until HumanGate. |
| agent_governance | PASSIVE | No active agent or automation is created. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, merge, or Git write authority. |

## Verdicts

software_verdict: CONTROL_PLANE_V2_RTM_CONTRACT_DOCS_ONLY

evidence_verdict: TRACEABILITY_CONTRACT_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
