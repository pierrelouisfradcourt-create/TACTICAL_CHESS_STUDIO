# Studio Deployment Columns V0

## Purpose

Studio Deployment Columns V0 classifies Studio governance ideas before they
become packets, reviews, local tooling, sandbox work, runtime work, agent work,
or blocked work.

The columns are routing labels, not execution authority. They help HumanGate
decide which lane an idea belongs to and which validation or review path is
required before any Codex execution.

This document is documentation only. It does not create a deployment runtime,
does not add active agents, does not create `STUDIO_PIPELINE/`, does not replace
`docs/control-plane/`, and does not authorize Git automation, runtime activation,
training, dataset generation, benchmark proof, or claim promotion.

## Column Summary

| Column | Purpose | Authority posture |
| --- | --- | --- |
| `docs-only` | Canonical or roadmap documentation changes | HumanGate before canonical promotion |
| `tooling-passive` | Local scripts, schemas, validators, and dry-run checks | No authority beyond mechanical checks |
| `local-review` | LM Studio, Mistral, Devstral, and review outputs | Advisory only |
| `sandbox` | Isolated experiments or generated drafts | Non-canonical and explicitly routed |
| `runtime-gated` | Any Rust runtime, search, neural, ML bridge, or game behavior work | Blocked until explicit HumanGate scope |
| `agent-candidate` | Agent, specialist, or automation readiness planning | Non-active unless separately authorized |
| `blocked` | Forbidden, premature, or unsafe work | Stop and report |

## Shared Routing Rules

Every idea must declare:

- source or human wording
- target column
- owner object, if any
- allowed files or surfaces
- forbidden files or surfaces
- validation expectation
- HumanGate condition
- claim posture
- fallback when source state is `UNKNOWN`

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

No column may authorize global ready/not-ready verdicts.

## Column: docs-only

Purpose:

- Record architecture, doctrine, source mapping, policies, runbooks, and passive
  roadmaps.
- Preserve truth separation between implemented behavior and documented plans.

Accepted inputs:

- concept fusion maps
- governance lane maps
- source state notes
- control-plane docs
- Navigator/Codex constraints
- roadmap-only Rocky, gameplay, or agent plans

Allowed outputs:

- Markdown docs
- passive YAML or JSON templates, if explicitly scoped
- readback and `git diff --check` validation

Forbidden outputs:

- runtime code changes
- training or dataset artifacts
- benchmark outputs
- generated run bundles
- `latest.json`
- autonomous agent records that claim activation

HumanGate:

- Required before promoting a docs-only idea into another column.

Examples:

- `STUDIO_GOVERNANCE_LANES_V0.md`
- future concept fusion matrix
- future deployment column index

Status: `DOCUMENTED_ONLY`

## Column: tooling-passive

Purpose:

- Provide local mechanical checks, validators, renderers, and dry-run summaries
  without decision authority.

Accepted inputs:

- schema validators
- report linters
- prompt hygiene checks
- patch-chain analyzers
- ROI scoring helpers
- source-state validators

Allowed outputs:

- stdout summaries
- local non-canonical reports
- deterministic validation results
- PASS/HOLD/BLOCKED style recommendations for HumanGate

Forbidden outputs:

- direct repo mutation unless the specific tool is explicitly scoped for a
  docs/tooling patch
- network calls unless separately authorized
- GitHub/Codex/OpenAI write calls
- final claim or promotion decisions
- runtime activation

HumanGate:

- Required before passive tooling is trusted as a gate for future execution.

Existing anchors:

- `scripts/control_plane/validate_execution_report.py`
- `scripts/control_plane/build_review_packet.py`
- `scripts/control_plane/build_local_review_pack.py`
- `scripts/control_plane/run_full_studio_loop_in_memory_test.py`

Status: `PASSIVE` / `IMPLEMENTED` where existing scripts are already present.

## Column: local-review

Purpose:

- Use local models and review prompts to critique plans, docs, reports, prompts,
  and packet chains.

Accepted inputs:

- Codex Pack drafts
- TaskPackets
- ExecutionReports
- ReviewPackets
- governance docs
- prompt drafts
- architecture proposals
- red-team prompts

Allowed outputs:

- review text under approved output routing
- risk lists
- contradiction notes
- prompt critique
- HumanGate questions
- passive recommendations

Forbidden outputs:

- final validation
- active truth claims
- Git writes outside approved output routing
- runtime authority
- training authority
- benchmark authority
- dataset authority

HumanGate:

- Required before any local-review output changes a task, claim, packet, or
  promotion decision.

Existing anchors:

- `studio_review/`
- `studio_review/run_lmstudio_review.ps1`
- `studio_review/prompts/`
- `docs/control-plane/ONE_COMMAND_LOCAL_REVIEW_PACK_V0.md`

Status: `PASSIVE`

## Column: sandbox

Purpose:

- Hold isolated drafts, experiments, generated examples, or disposable previews
  that must not be treated as canonical evidence.

Accepted inputs:

- generated Codex handoff packs
- local draft outputs
- dry-run artifacts
- exploratory gameplay observations
- non-canonical review outputs

Allowed outputs:

- explicitly routed sandbox files
- stdout-only dry-run output
- disposable local reports

Forbidden outputs:

- canonical doc mutation without HumanGate
- runtime activation
- benchmark proof
- model promotion
- training outputs
- dataset generation or reset
- uncontrolled writes

HumanGate:

- Required before any sandbox artifact is copied, summarized, promoted, or used
  as evidence.

Existing anchors:

- `lab/gameplay_observation/sandbox_outputs/`
- `docs/control-plane/CODEX_HANDOFF_PACK.md`
- `docs/control-plane/STUDIOPILOT_LOOP_SMOKE.md`

Status: `PASSIVE`

## Column: runtime-gated

Purpose:

- Classify any proposed change to Rust runtime, search, neural, ML bridge,
  dataset admission behavior, gameplay behavior, or execution behavior as
  requiring explicit HumanGate.

Accepted inputs:

- narrowly scoped runtime proposals
- search/neural boundary plans
- gameplay behavior proposals
- ML bridge proposals
- dataset admission proposals

Allowed outputs before HumanGate:

- read-only audit
- docs-only impact map
- bounded task proposal
- risk analysis

Forbidden outputs without separate explicit authorization:

- Rust runtime code changes
- search refactors
- neural authority changes
- DecisionController activation
- ActionMask authority activation
- Chess960 activation
- training
- dataset generation or reset
- benchmark proof
- model promotion

HumanGate:

- Required before any task leaves read-only/docs-only planning.

Existing anchors:

- `MASTER_DOCS/05_ARCHITECTURE.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_*`
- `docs/control-plane/ALPHASTAR_LIKE_PASSIVE_BOUNDARY_TRACEABILITY_V0.md`

Status: `BLOCKED` until explicitly scoped.

## Column: agent-candidate

Purpose:

- Classify future agents, specialists, directors, automation loops, or local
  reviewer roles before any activation.

Accepted inputs:

- specialist role proposals
- agent breathing policy drafts
- local reviewer profiles
- director/specialist routing concepts
- autonomy risk assessments

Allowed outputs:

- docs-only charters
- scorecards
- freeze or strike policy proposals
- passive reports
- wake/suspend criteria

Forbidden outputs:

- active agent activation
- autonomous loops
- self-assigned work
- auto-ready
- auto-merge
- auto-training
- auto-rule mutation
- unrestricted tool permissions

HumanGate:

- Required before any agent profile becomes runnable or operational.

Existing anchors:

- `docs/control-plane/AI_ORG_CHART_V0.md`
- `docs/control-plane/SPECIALIST_ROLE_CHARTER_V0.md`
- `docs/control-plane/SPECIALIST_FREEZE_POLICY_V0.md`
- `schemas/agent_profile.schema.json`
- `schemas/agent_scorecard.schema.json`
- `schemas/freeze_rules.schema.json`
- `schemas/strike_rules.schema.json`

Status: `DOCUMENTED_ONLY` / `PASSIVE`

## Column: blocked

Purpose:

- Stop work that is forbidden, premature, insufficiently sourced, too broad,
  unrouted, or claim-risky.

Automatic blockers:

- missing source state for critical claims
- unclear owner object
- broad repo rewrite
- duplicate control-plane authority
- `STUDIO_PIPELINE/` as a second source of truth
- overwriting `studio_review/`
- unbounded Codex prompt
- runtime or ML changes without explicit scope
- training or fine-tuning
- dataset generation or reset
- benchmark proof
- holdout use
- `latest.json`
- `lab/runs/RUN_*`
- autonomous agent loop
- auto-commit, auto-push, auto-PR, auto-ready, or auto-merge
- global ready/not-ready verdict

Allowed outputs:

- blocked report
- HumanGate questions
- reduced-scope proposal
- source request

HumanGate:

- Required to unblock, and only for a narrower task with explicit scope.

Status: `BLOCKED`

## HumanGate Decision Table

| Question | If yes | If no |
| --- | --- | --- |
| Is this source-backed? | Continue routing | `blocked` |
| Does it map to an existing control-plane object? | Use that object | `docs-only` mapping or `blocked` |
| Is output routing explicit? | Continue routing | `blocked` |
| Does it touch runtime/search/neural/ML/data? | `runtime-gated` | Continue routing |
| Is it reviewer-only? | `local-review` | Continue routing |
| Is it a passive validator or dry-run helper? | `tooling-passive` | Continue routing |
| Is it an agent or specialist idea? | `agent-candidate` | Continue routing |
| Is it too broad or autonomous? | `blocked` | Continue routing |

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | Columns do not authorize runtime edits. |
| tests | UNKNOWN | This docs-only map does not inspect behavior. |
| artifacts_runtime_outputs | BLOCKED | No runtime, benchmark, model, dataset, run-bundle, or latest output is authorized. |
| canonical_docs | DOCUMENTED_ONLY | Canonical promotion still requires HumanGate and source anchoring. |
| roadmap_docs_only | DOCUMENTED_ONLY | Mega-pack and governance ideas remain planning unless separately gated. |
| inference | PASSIVE | Local LLM review is advisory only. |
| local_review_stack | PASSIVE | `studio_review/` output cannot validate or promote claims. |
| control_plane | DOCUMENTED_ONLY | This document defines routing vocabulary only. |
| concept_backlog | DOCUMENTED_ONLY | Concepts must be routed before they become packets or patches. |
| agent_governance | PASSIVE | Agent-candidate work remains non-active. |

## Verdicts

software_verdict: CONTROL_PLANE_DEPLOYMENT_COLUMNS_DOCS_ONLY

evidence_verdict: ROUTING_VOCABULARY_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
