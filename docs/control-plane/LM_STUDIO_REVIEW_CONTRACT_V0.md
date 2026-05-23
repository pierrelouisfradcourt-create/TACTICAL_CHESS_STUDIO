# LM Studio Review Contract V0

## Purpose

LM Studio Review Contract V0 defines how local LM Studio models such as Mistral
and Devstral may review Studio pipeline material without becoming authority.

This contract exists so local models can become useful passive reviewers of the
Studio pipeline, control-plane, mega-pack concepts, Codex reports, and repo
documentation by reading bounded context packets. It does not train, fine-tune,
benchmark, store datasets, activate agents, mutate files, execute runtime code,
or promote claims.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Authority Boundary

LM Studio review is advisory only.

LM Studio may:

- read routed source bundles
- critique architecture and doctrine drift
- detect contradictions
- red-team prompts and reports
- compare initial request, planned packet, and final output
- suggest HumanGate questions
- recommend `HOLD`, `BLOCKED`, or follow-up review

LM Studio may not:

- validate truth
- decide HumanGate
- approve Codex execution
- approve runtime activation
- mark software implemented or tested
- create, stage, commit, push, branch, open PRs, ready PRs, or merge
- train or fine-tune models
- generate or reset datasets
- run or claim benchmarks
- write outside approved review output routing
- replace ReviewPacket, LocalReviewPack, PRDecisionPacket, or HumanDecision

Search remains final authority for external facts. Rust remains runtime truth.
Neural review may propose and rerank only.

## Relationship To Existing Packets

LM Studio output is source or annex material only.

| Existing object | Relationship |
| --- | --- |
| TaskPacket | LM Studio may critique scope, sources, blockers, and output routing. |
| ExecutionReport | LM Studio may critique claims, skipped validation, and risk reporting. |
| ReviewPacket | LM Studio may provide advisory objections before or after review-pack generation. |
| LocalReviewPack | LM Studio may feed a local review annex, but LocalReviewPack remains the main solo review summary. |
| PRDecisionPacket | LM Studio may flag contradictions, but cannot alter encoded decision fields. |
| HumanDecision | LM Studio may propose questions only; HumanGate decides. |

## Model Roles

| Model | Passive role | Forbidden role |
| --- | --- | --- |
| Mistral 7B Instruct | architecture review, red-team review, contradiction detection, prompt critique | final validator |
| Devstral Small | code/docs review, patch-chain critique, repo navigation critique | Codex executor |
| Nomic Embed Text | retrieval or indexing support if separately authorized | decision model |

Model names are operational conveniences, not authority classes.

## Context Packet

To make a local model useful without training, give it a context packet instead
of asking it to learn permanently.

A review context packet should contain:

```yaml
lmstudio_review_context:
  human_words:
  review_question:
  model_role:
  deployment_column:
  source_bundle:
    - path_or_summary:
      source_state:
  initial_request:
  planned_output:
  actual_output:
  allowed_surfaces:
  forbidden_surfaces:
  expected_verdicts:
  output_route:
  humangate_question:
  claim_posture: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

If the packet lacks the human wording, source bundle, review question, output
route, or HumanGate question, the model should return `BLOCKED` rather than
inventing missing context.

## Review Modes

| Mode | Input | Output | Status |
| --- | --- | --- | --- |
| `architecture_review` | architecture docs, concept plans, repo summaries | risks, contradictions, missing anchors | PASSIVE |
| `red_team_review` | prompts, packets, proposed automation | abuse paths, authority drift, false claims | PASSIVE |
| `prompt_critique` | Codex/Navigator prompts | missing preflight, scope, blockers, report fields | PASSIVE |
| `codex_report_critique` | ExecutionReport-like material | claim gaps, validation gaps, surface drift | PASSIVE |
| `patch_chain_review` | proposed sequence of patches | ordering risk, dependency risk, collision risk | PASSIVE |
| `truth_drift_review` | source bundle plus output | source mismatch and contradiction notes | PASSIVE |

No review mode creates execution authority.

## Required Output Shape

LM Studio review output should be plain text or YAML-compatible text and include:

```yaml
lmstudio_review:
  model:
  mode:
  reviewed_sources:
  source_state:
  findings:
  contradictions:
  missing_context:
  blocked_surfaces:
  suggested_humangate_questions:
  status_by_surface:
    active_runtime_code:
    tests:
    artifacts_runtime_outputs:
    canonical_docs:
    roadmap_docs_only:
    inference:
  software_verdict:
  evidence_verdict:
  claim_verdict: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

Allowed status values:

- `IMPLEMENTED`
- `TESTED`
- `DOCUMENTED_ONLY`
- `PASSIVE`
- `BLOCKED`
- `NOT_FOUND`
- `UNKNOWN`

The model must not emit a global ready/not-ready verdict.

## Output Routing

Approved local review output route:

- `studio_review/output/`

LM Studio review scripts may write review text only under that route.

They may not write:

- `MASTER_DOCS/`
- `docs/control-plane/`
- `docs/gpt-navigator/`
- runtime source trees
- `.studio_state/`
- `latest.json`
- `lab/runs/RUN_*`
- Git metadata

## Expert Without Training

Mistral and Devstral become useful for Studio by repeated bounded context, not
by training.

Allowed expertise mechanism:

- read the current source bundle
- read the human wording
- read the intended packet or report
- compare initial request against actual output
- emit bounded objections
- preserve uncertainty as `UNKNOWN`
- return questions to HumanGate

Forbidden expertise mechanism:

- fine-tuning
- synthetic dataset generation
- benchmark-driven promotion
- persistent autonomous memory
- model self-updating
- hidden background agents
- model-to-Git or model-to-runtime authority

## Stop Conditions

LM Studio review must stop or return `BLOCKED` when:

- source state is missing or critical-`UNKNOWN`
- the prompt asks for final approval
- the prompt asks for implementation claims without evidence
- the prompt asks for runtime activation
- the prompt asks for training, fine-tuning, datasets, or benchmarks
- the prompt asks to write outside `studio_review/output/`
- the prompt asks to commit, push, branch, open PRs, ready PRs, or merge
- the prompt asks to replace `MASTER_DOCS/`, `docs/control-plane/`, or
  `studio_review/`
- the prompt erases or rewrites the human intent

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | LM Studio review cannot authorize runtime work. |
| tests | UNKNOWN | Reviews may critique test claims but do not execute tests. |
| artifacts_runtime_outputs | BLOCKED | No run-bundle, benchmark, latest, dataset, or model artifact is authorized. |
| canonical_docs | DOCUMENTED_ONLY | LM Studio may review docs but cannot promote canonical truth. |
| roadmap_docs_only | DOCUMENTED_ONLY | LM Studio may critique roadmap concepts only. |
| inference | PASSIVE | Local models are advisory reviewers. |
| local_review_stack | PASSIVE | `studio_review/` is the approved output route. |
| control_plane | DOCUMENTED_ONLY | This document defines a review contract only. |
| agent_governance | PASSIVE | No agent is activated. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, merge, or Git write authority. |

## Verdicts

software_verdict: CONTROL_PLANE_LM_STUDIO_REVIEW_CONTRACT_DOCS_ONLY

evidence_verdict: LOCAL_REVIEW_CONTRACT_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
