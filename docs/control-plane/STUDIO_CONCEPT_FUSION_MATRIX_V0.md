# Studio Concept Fusion Matrix V0

## Purpose

Studio Concept Fusion Matrix V0 maps the mega-pack concepts discussed during
Studio governance planning onto existing Studio repo surfaces.

The matrix is a collision-control document. It prevents the mega-pack concepts
from becoming a second source of truth, a parallel control-plane, an overwrite
of `studio_review/`, or an autonomous execution system.

This document is documentation only. It does not apply patches, create scripts,
activate agents, create `STUDIO_PIPELINE/`, modify runtime behavior, train
models, generate datasets, run benchmarks, create branches, commit, push, open
PRs, ready PRs, merge, or promote claims.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Source Posture

The matrix uses three inputs:

- human-provided concept wording from the planning discussion
- local control-plane anchors already present in the repo
- local `studio_review/` outputs as passive review context

The mega packs are treated as concept reservoirs, not truth sources.

`MASTER_DOCS/` remains the canonical truth surface. `docs/control-plane/`
remains the governance surface. `docs/gpt-navigator/` remains Navigator/Codex
constraint context. `studio_review/` remains passive local review.

## Fusion Rules

Every concept must follow these rules before any future work packet can exist:

- map to an existing repo owner surface
- declare deployment column
- declare current status
- declare allowed output
- declare forbidden output
- preserve HumanGate
- preserve `NO_CLAIM_ALLOWED`
- avoid global ready/not-ready verdicts
- avoid creating a second truth
- avoid replacing `docs/control-plane/`
- avoid overwriting `studio_review/`

If no owner surface exists, the concept is `UNKNOWN` and defaults to `BLOCKED`
until HumanGate decides whether a docs-only placeholder is allowed.

## Fusion Matrix

| Concept | Repo owner surface | Deployment column | Current status | Fusion action | Forbidden output |
| --- | --- | --- | --- | --- | --- |
| Truth Packet | `MASTER_DOCS/`, source anchoring, TaskPacket source fields | `docs-only` | DOCUMENTED_ONLY | Adapt as framing envelope that points to truth | New canonical truth |
| Codex Pack | TaskPacket, rendered Codex prompt, Codex handoff pack | `docs-only` | DOCUMENTED_ONLY | Merge as bounded execution packet vocabulary | Autonomous Codex authority |
| Patch Chain | CampaignPlan, PRQueue, PatchPack, TaskPacket sequencing | `tooling-passive` | PASSIVE | Adapt as proposed sequence and dependency map | Auto-apply patch chain |
| Source State Ledger | ExecutionReport intake, source state fields, source anchoring | `docs-only` | DOCUMENTED_ONLY | Merge as source-state section in reports | Parallel ledger as truth |
| Pro Request | Human work order, TaskPacket intake, HumanGate decision | `docs-only` | DOCUMENTED_ONLY | Adapt as pre-packet request shape | Direct execution request |
| ROI Scorer | `STUDIO_ROI_SCORING_V0.md`, PRQueue, campaign priority | `docs-only` | DOCUMENTED_ONLY | Preserve as advisory priority language | Decision authority |
| Prompt Hygiene Checker | GPT Navigator rules, rendered prompt checks, pre-handoff lint | `tooling-passive` | PASSIVE | Adapt as passive prompt lint contract | Prompt auto-correction with authority |
| Red Team Runner | ReviewPacket, LocalReviewPack, `studio_review/` prompts | `local-review` | PASSIVE | Preserve as adversarial review role | Final validation |
| Report Linter | ExecutionReport intake, local review pack, validators | `tooling-passive` | PASSIVE | Merge as report completeness check | Claim promotion |
| Patch Chain Analyzer | CampaignPlan review, PRQueue review, local review | `tooling-passive` | PASSIVE | Adapt as passive chain-risk analyzer | Applying patches |
| V2 Requirements Traceability Matrix | source anchors, control-plane docs, master-doc links | `docs-only` | DOCUMENTED_ONLY | Adapt as reference map only | Requirements as new truth |
| Local AI review stack | `studio_review/`, LM Studio scripts/prompts/outputs | `local-review` | PASSIVE | Preserve as advisory critique layer | Runtime/Git authority |
| Agent Breathing | `STUDIO_AGENT_BREATHING_POLICY_V0.md`, AI org chart, reporting chain | `agent-candidate` | PASSIVE | Use as attention and pause/resume policy | Active agent loop |
| Deployment Columns | `STUDIO_DEPLOYMENT_COLUMNS_V0.md` | `docs-only` | DOCUMENTED_ONLY | Use as routing vocabulary | Deployment authority |
| Governance Lanes | `STUDIO_GOVERNANCE_LANES_V0.md` | `docs-only` | DOCUMENTED_ONLY | Use as concept organization map | Parallel control-plane |

## Collision Matrix

| Collision | Cause | Required response | Status |
| --- | --- | --- | --- |
| second source of truth | Truth Packet or RTM becomes canonical | Stop and point back to `MASTER_DOCS/` | BLOCKED |
| parallel control-plane | mega-pack control logic replaces existing docs | Stop and map into `docs/control-plane/` only | BLOCKED |
| `studio_review/` overwrite | local review stack imports over existing scaffold | Stop and preserve existing folder | BLOCKED |
| autonomous Codex | Codex Pack skips HumanGate | Stop and require bounded TaskPacket | BLOCKED |
| auto patch chain | Patch Chain becomes execution queue | Stop and keep as passive plan | BLOCKED |
| model-as-authority | LM Studio/Mistral/Devstral validates truth | Stop and mark advisory only | BLOCKED |
| false claim | report says implemented/tested without evidence | Stop and require evidence verdict | BLOCKED |
| prompt drift | prompt lacks sources, scope, output routing, blockers | Stop or lint before handoff | BLOCKED |
| noise lane | agent/review output has no consumer or HumanGate question | Pause lane | PASSIVE |

## Allowed Fusion Outputs

Allowed outputs are limited to:

- docs-only control-plane maps
- passive review prompts
- passive scoring language
- passive report templates
- dry-run or stdout-only future tooling specs
- HumanGate questions
- bounded TaskPacket drafts that still require HumanGate

These outputs may not claim runtime behavior, test coverage, benchmark results,
model quality, dataset quality, production readiness, or implementation status.

## Blocked Outputs

Always blocked in this fusion phase:

- runtime activation
- Rust/search/neural behavior changes
- training or fine-tuning
- dataset generation or reset
- benchmark proof
- model promotion
- holdout use
- `latest.json`
- `lab/runs/RUN_*`
- autonomous agent loop
- automatic branch, commit, push, PR, ready, or merge
- replacing `MASTER_DOCS/`
- replacing `docs/control-plane/`
- overwriting `studio_review/`
- global ready/not-ready verdict

## Recommended Merge Order

The safe conceptual merge order is:

1. `DOCUMENTED_ONLY` - concept fusion matrix.
2. `DOCUMENTED_ONLY` - deployment columns.
3. `DOCUMENTED_ONLY` - ROI scoring vocabulary.
4. `PASSIVE` - agent breathing policy.
5. `PASSIVE` - LM Studio review contract.
6. `PASSIVE` - prompt hygiene and report lint contracts.
7. `PASSIVE` - patch-chain analyzer vocabulary.
8. `DOCUMENTED_ONLY` - Rocky and gameplay discovery maps.
9. `BLOCKED` - runtime, training, dataset, benchmark, active agents.

This order does not authorize execution. It only orders future HumanGate
decisions.

## HumanGate Questions

Before any concept moves beyond this matrix, HumanGate should answer:

1. Which repo surface owns the concept?
2. Which deployment column applies?
3. Is the source state sufficient?
4. What file paths are allowed?
5. What file paths are forbidden?
6. What output route is allowed?
7. What validation proves only the allowed claim?
8. What would make this concept `BLOCKED`?
9. Which human wording must be preserved?

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | Fusion matrix cannot authorize runtime work. |
| tests | UNKNOWN | This document is docs-only and does not inspect behavior. |
| artifacts_runtime_outputs | BLOCKED | No runtime, dataset, benchmark, run-bundle, or latest output is authorized. |
| canonical_docs | DOCUMENTED_ONLY | `MASTER_DOCS/` remains truth; this matrix only references it. |
| roadmap_docs_only | DOCUMENTED_ONLY | Mega-pack concepts can become roadmap entries only. |
| inference | PASSIVE | Local models may critique concepts but cannot decide. |
| local_review_stack | PASSIVE | `studio_review/` remains advisory and non-authoritative. |
| control_plane | DOCUMENTED_ONLY | This document maps concepts into existing governance. |
| concept_backlog | DOCUMENTED_ONLY | Concepts are backlog candidates until HumanGate. |
| agent_governance | PASSIVE | Agent concepts remain inactive. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, merge, or Git write authority. |

## Verdicts

software_verdict: CONTROL_PLANE_CONCEPT_FUSION_DOCS_ONLY

evidence_verdict: CONCEPT_MAPPING_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
