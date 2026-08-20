# Patch Chain Analyzer Contract V0

## Purpose

Patch Chain Analyzer Contract V0 defines how Studio may analyze a proposed
sequence of patches, PatchGroups, PR candidates, or Codex handoff packets
without applying them automatically.

The analyzer is a passive planning and collision tool. It checks ordering,
dependencies, scope boundaries, output routing, validation fit, and authority
risks before a human chooses whether any bounded TaskPacket should exist.

This document is documentation only. It does not create scripts, schemas,
agents, runners, workflows, automation, Codex calls, OpenAI calls, GitHub calls,
branches, PRs, commits, merges, runtime behavior, training, dataset generation,
benchmark logic, or claim authority.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Authority Boundary

Patch chain analysis may recommend:

- `PASS`
- `HOLD`
- `BLOCKED`
- `SPLIT`
- `REORDER`
- `ESCALATE_TO_HUMANGATE`

Patch chain analysis may not:

- apply a patch
- generate code changes
- launch Codex
- create or mutate TaskPackets
- create branches
- create PRs
- ready PRs
- merge PRs
- run runtime validation
- run benchmarks
- train or fine-tune models
- generate or reset datasets
- promote claims
- replace CampaignPlan or PRQueue
- decide HumanGate

HumanGate remains final authority for turning any chain item into execution.

## Relationship To Existing Objects

| Existing object | Relationship |
| --- | --- |
| CampaignPlan | Defines campaign objective, PatchGroups, allowed paths, forbidden paths, stop conditions, validation expectations, and claim boundaries. |
| PRQueue | Sequences PR candidates and records candidate readiness, dependencies, local-first CI policy, merge policy, and HumanGate requirements. |
| TaskPacket | A future bounded handoff shape that may be produced only after HumanGate. |
| ExecutionReport | Future source material for checking whether a completed item matched the planned chain. |
| ReviewPacket | Non-binding review guidance after execution or dry-run review. |
| LocalReviewPack | Main solo summary for the human; patch-chain analysis can be annex material only. |
| LM Studio review | Optional passive critique of chain risks; never authority. |

The analyzer is a view over these objects, not a replacement.

## Input Shape

A patch chain review should receive:

```yaml
patch_chain_review_input:
  human_words:
  source_state:
  chain_goal:
  deployment_column:
  chain_items:
    - id:
      title:
      type:
      allowed_paths:
      forbidden_paths:
      dependencies:
      expected_validation:
      expected_output_route:
      blocked_actions:
      claim_scope: NO_CLAIM_ALLOWED
      humangate_required: true
  current_repo_state:
    branch:
    head:
    tracked_diff:
    staged_diff:
    untracked_non_ignored:
  no_global_ready_verdict: true
```

If `human_words`, `source_state`, `allowed_paths`, `forbidden_paths`,
`expected_validation`, or `humangate_required` are missing, the review should
return `BLOCKED`.

## Analysis Checks

The analyzer should check:

- source anchors are present and not critical-`UNKNOWN`
- each item has one owner surface
- dependencies point only to earlier or explicitly external items
- forbidden paths are not included in allowed paths
- runtime, ML, dataset, benchmark, and Git-authority surfaces are blocked unless
  a separate explicit HumanGate scope exists
- docs-only items do not claim runtime or test behavior
- passive tooling items do not become decision authority
- local-review items route outputs only through approved review routes
- validation matches the claimed surface
- claims stay at `NO_CLAIM_ALLOWED`
- chain items are small enough for bounded Codex work
- chain order reduces risk instead of hiding it later
- no item creates a second source of truth
- no item replaces `docs/control-plane/`, `MASTER_DOCS/`, or `studio_review/`

## Chain Verdicts

| Verdict | Meaning | Allowed next step |
| --- | --- | --- |
| `PASS` | Chain is coherent as a plan. | Human may choose a bounded next packet. |
| `HOLD` | More source, scope, validation, or owner clarity is needed. | Gather context or revise plan. |
| `BLOCKED` | Forbidden action, missing gate, source gap, or claim problem. | Stop until HumanGate resolves. |
| `SPLIT` | Item is too broad or crosses surfaces. | Break into smaller chain items. |
| `REORDER` | Dependency or risk order is wrong. | Re-sequence before any handoff. |
| `ESCALATE_TO_HUMANGATE` | Human decision is required before classification. | Pause chain. |

These verdicts are planning guidance only.

## Output Shape

Patch chain analyzer output should use:

```yaml
patch_chain_review:
  reviewed_chain:
  source_state:
  overall_hygiene_status:
  item_findings:
    - id:
      status:
      ordering_risk:
      dependency_risk:
      scope_risk:
      validation_risk:
      authority_risk:
      claim_risk:
      recommended_action:
  required_splits:
  required_reorders:
  blocked_items:
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

## Automatic Blockers

Any chain item is `BLOCKED` when it includes:

- runtime activation without explicit HumanGate runtime scope
- search/neural/ML behavior mutation without explicit scope
- training or fine-tuning
- dataset generation or reset
- benchmark proof
- model promotion
- holdout use as proof
- `latest.json`
- `lab/runs/RUN_*`
- automatic branch, commit, push, PR, ready, or merge
- Codex auto-execution
- output writes without routing
- source state critical-`UNKNOWN`
- claim escalation beyond `NO_CLAIM_ALLOWED`
- global ready/not-ready verdict
- second source of truth
- replacing `MASTER_DOCS/`
- replacing `docs/control-plane/`
- overwriting `studio_review/`

## Local Model Use

LM Studio, Mistral, or Devstral may review a patch chain as passive critique
only.

Allowed local model tasks:

- spot missing dependencies
- flag broad patches
- flag authority drift
- flag validation mismatch
- suggest HumanGate questions
- suggest `SPLIT`, `REORDER`, `HOLD`, or `BLOCKED`

Forbidden local model tasks:

- rewrite the chain as executable authority
- create patches
- choose final order as authority
- launch Codex
- approve implementation
- validate runtime truth
- promote claims

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | Patch chain analysis cannot authorize runtime work. |
| tests | UNKNOWN | This document does not run tests. |
| artifacts_runtime_outputs | BLOCKED | No runtime, dataset, benchmark, run-bundle, or latest output is authorized. |
| canonical_docs | DOCUMENTED_ONLY | This is a control-plane analysis contract, not runtime truth. |
| roadmap_docs_only | DOCUMENTED_ONLY | Chains may organize roadmap work only. |
| inference | PASSIVE | Local models may critique chain risk but cannot decide. |
| local_review_stack | PASSIVE | `studio_review/` may review chains as advisory input. |
| control_plane | DOCUMENTED_ONLY | This document defines passive planning vocabulary. |
| agent_governance | PASSIVE | No active agent or automation is created. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, merge, or Git write authority. |

## Verdicts

software_verdict: CONTROL_PLANE_PATCH_CHAIN_ANALYZER_DOCS_ONLY

evidence_verdict: PASSIVE_CHAIN_ANALYSIS_CONTRACT_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
