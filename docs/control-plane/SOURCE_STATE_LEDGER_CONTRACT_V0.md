# Source State Ledger Contract V0

## Purpose

Source State Ledger Contract V0 defines how Studio records whether a source,
contract, prompt, template, report, review, or generated document is created,
registered, loaded, enforced, and evidenced.

The ledger prevents new documents, local model outputs, generated reports, or
conversation memory from being treated as active project truth before their
authority state is explicit.

This document is documentation only. It does not create scripts, schemas,
agents, registries, workflows, automation, Codex calls, OpenAI calls, GitHub
calls, runtime behavior, training, dataset generation, benchmark logic, Git
actions, or claim authority.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Core Rule

Source states are not interchangeable:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

A newly created file is only `created`. It is not loaded project truth, not an
enforced gate, and not evidence of behavior.

## Source State Definitions

| State | Meaning | Does not mean |
| --- | --- | --- |
| `created` | The file, report, prompt, or output exists locally. | It is indexed, loaded, enforced, or true. |
| `registered` | The source is listed in an approved index, reading order, packet, or routing map. | It was read in the current context. |
| `loaded` | The source content was read into the active review or prompt context. | It governs the task or proves behavior. |
| `enforced` | A prompt, checker, script, policy, or HumanGate explicitly applies the source. | The source proved the result. |
| `evidenced` | There is scoped evidence that the source governed an output or behavior. | Global readiness or broad truth. |
| `UNKNOWN` | The current task cannot establish the state. | Safe to assume. |
| `BLOCKED` | Required source state is missing for the requested claim or action. | Failure of the repo. |

`UNKNOWN` defaults to `BLOCKED` when the source is required for authority,
claims, runtime, Git, training, dataset, benchmark, or output routing.

## Ledger Record Shape

Use this shape when a prompt, report, review, or future passive tool needs to
record source state:

```yaml
source_state_ledger:
  source_id:
  source_path_or_ref:
  source_type:
  owner_surface:
  required_for:
  state:
    created:
    registered:
    loaded:
    enforced:
    evidenced:
  evidence_refs:
  gaps:
  authority_limit:
  humangate_required:
  claim_posture: NO_CLAIM_ALLOWED
```

`evidence_refs` must point to concrete local files, commands, reports, or
HumanGate decisions. Conversation memory alone is not an evidence ref.

## Required Use

Source state should be reported for:

- Codex prompt generation
- TaskPacket drafts
- ExecutionReport intake
- ReviewPacket or LocalReviewPack annex material
- LM Studio review context packets
- patch chain reviews
- concept fusion maps
- docs-only registrations
- any claim about source authority
- any prompt asking Codex to rely on a newly created file

## Claim Rules

Source state controls claim scope:

| Source state | Allowed claim |
| --- | --- |
| created only | File exists locally. |
| registered | File is listed as a known source. |
| loaded | File was read for this task. |
| enforced | File was applied by a named gate or HumanGate decision. |
| evidenced | The scoped output includes evidence the source governed it. |
| UNKNOWN | No authority claim. |
| BLOCKED | Stop until source state is resolved. |

No source state allows a global ready/not-ready verdict.

No source state promotes `claim_verdict` above `NO_CLAIM_ALLOWED` without a
separate explicit HumanGate claim decision and matching evidence scope.

## Prompt Requirements

Any Codex prompt that depends on source authority should include:

```yaml
source_state_required:
  - source:
    required_state:
    current_state:
    blocker_if_missing:
```

The prompt should be `BLOCKED` when:

- a required source is only `created`
- a required source is not loaded in the current context
- output routing policy is not loaded for file-producing work
- source authority is inferred from memory
- a generated report is treated as evidence without validation
- a local model review is treated as final authority

## Report Requirements

Any Codex report that created, used, or relied on source documents should include
a source state section:

```yaml
source_state:
  created:
  registered:
  loaded:
  enforced:
  evidenced:
  unknown:
  blocked:
```

The report must not say a source was enforced or evidenced unless it names the
gate, command, review, HumanGate decision, or output that proves the state.

## Promotion Rules

A source may move forward only through explicit transition:

| Transition | Required proof |
| --- | --- |
| `created -> registered` | It is added to an approved index, reading order, or packet. |
| `registered -> loaded` | The content is read in the active context. |
| `loaded -> enforced` | A named gate, checker, prompt, or HumanGate decision applies it. |
| `enforced -> evidenced` | A scoped output demonstrates the gate affected the result. |

Skipping states is not allowed.

## Automatic Blockers

Return `BLOCKED` when:

- a task treats newly created docs as loaded truth
- a prompt omits required source state
- a report omits source state for new control-plane docs
- source authority depends on memory or conversational context only
- `created`, `registered`, `loaded`, `enforced`, and `evidenced` are collapsed
- evidence is claimed without command, artifact, report, or HumanGate reference
- local model output is treated as final evidence
- runtime, training, dataset, benchmark, Git, or claim authority depends on
  `UNKNOWN` source state

## Local Model Use

LM Studio, Mistral, or Devstral may critique source state as passive review only.

Allowed local model tasks:

- identify missing source states
- flag unsupported evidence claims
- flag conversation-memory authority
- flag created-only docs being used as truth
- suggest HumanGate questions

Forbidden local model tasks:

- declare a source evidenced without concrete evidence refs
- promote a source to canonical truth
- validate runtime truth
- validate external facts without Search
- approve claims

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | Source state ledger cannot authorize runtime work. |
| tests | UNKNOWN | This document does not run tests. |
| artifacts_runtime_outputs | BLOCKED | No runtime, dataset, benchmark, run-bundle, or latest output is authorized. |
| canonical_docs | DOCUMENTED_ONLY | This contract protects canonical docs but does not promote them. |
| roadmap_docs_only | DOCUMENTED_ONLY | Roadmap sources require explicit state before use. |
| inference | PASSIVE | Local models may critique source state only. |
| local_review_stack | PASSIVE | `studio_review/` outputs remain advisory source material. |
| control_plane | DOCUMENTED_ONLY | This document defines source-state vocabulary only. |
| agent_governance | PASSIVE | No active agent or automation is created. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, merge, or Git write authority. |

## Verdicts

software_verdict: CONTROL_PLANE_SOURCE_STATE_LEDGER_DOCS_ONLY

evidence_verdict: SOURCE_STATE_VOCABULARY_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
