# Studio Governance Lanes V0

## Purpose

Studio Governance Lanes V0 maps the recent mega-pack concepts onto the
existing StudioPilot control-plane instead of creating a second pipeline.

The goal is to preserve the human wording and intention, route it through
truth, architecture, risk, ROI, HumanGate, bounded Codex packets, local review,
and final HumanGate decision without activating autonomous execution.

This document is documentation only. It does not create `STUDIO_PIPELINE/`, does
not replace `docs/control-plane/`, does not overwrite `studio_review/`, and does
not authorize runtime activation, training, dataset generation, benchmark proof,
Git automation, agent activation, or claim promotion.

## Authority Boundary

The existing authority order remains unchanged:

- `MASTER_DOCS/` remains the canonical truth layer.
- `docs/control-plane/` remains the governance and packetization layer.
- `docs/gpt-navigator/` remains the Navigator/Codex constraint layer.
- `studio_review/` remains a passive local review layer.
- Mega packs remain concept and backlog inputs only.
- HumanGate remains final authority.
- Claim posture remains `NO_CLAIM_ALLOWED`.
- Global ready/not-ready verdicts remain forbidden.

## Existing Packet Backbone

The repo already contains a mature local-first control-plane backbone:

```text
Human intention
-> TaskPacket
-> rendered Codex prompt
-> ExecutionReport
-> ReviewPacket
-> HumanDecision
-> LocalReviewPack
-> LearningEvent
```

The mega-pack terms should be mapped into that backbone:

| Mega-pack concept | Existing repo equivalent | Integration posture |
| --- | --- | --- |
| Truth Packet | source anchoring, TaskPacket source fields, final report source state | Adapt as framing only |
| Codex Pack | TaskPacket plus rendered Codex prompt | Merge with existing packet model |
| Patch Chain | CampaignPlan, PRQueue, TaskPacket sequencing | Adapt as planning vocabulary |
| Source State Ledger | source state fields and report discipline | Merge into report and source checks |
| Pro Request | human work order / TaskPacket intake | Adapt before HumanGate |
| ROI Scorer | PRQueue priority, CampaignPlan prioritization, director/resource review | Add passive scoring only |
| Prompt Hygiene Checker | GPT Navigator prompt gate and rendered prompt checks | Adapt as pre-handoff lint |
| Red Team Runner | ReviewPacket, LocalReviewPack, `studio_review/` prompts | Passive review only |
| Report Linter | ExecutionReport intake and LocalReviewPack checks | Merge with existing validators |
| Patch Chain Analyzer | CampaignPlan/PRQueue review and local review pack | Passive analyzer only |
| V2 Requirements Traceability Matrix | source index, source state, master docs anchors | Reference map only |
| Local AI review stack | `studio_review/` LM Studio review | Preserve without authority |

## Lane 1 - Truth Chain

Purpose:

- Separate what is requested, known, unknown, blocked, documented, tested, and
  implemented.
- Preserve source state as `created`, `registered`, `loaded`, `enforced`, and
  `evidenced`.
- Prevent conversational context, mega-pack files, local outputs, or model
  responses from becoming active truth by themselves.

Existing repo anchors:

- `AGENTS.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_PROJECT_INSTRUCTIONS_V0.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md`
- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`

Status: `DOCUMENTED_ONLY`

Missing piece:

- A compact concept-fusion truth matrix for mega-pack concepts.

First safe follow-up:

- Draft a docs-only concept fusion matrix.

## Lane 2 - Architecture Chain

Purpose:

- Place each idea in the existing architecture before any execution packet is
  produced.
- Decide whether the idea belongs to canonical docs, control-plane docs,
  Navigator constraints, local review, sandbox planning, runtime-gated work,
  agent-candidate work, or `BLOCKED`.

Existing repo anchors:

- `docs/control-plane/LOOP_CONTRACT.md`
- `docs/control-plane/CONTROL_PLANE_VISION_MAP_V0.md`
- `docs/control-plane/AI_ORG_CHART_V0.md`
- `docs/control-plane/AUTHORITY_MATRIX.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`

Status: `DOCUMENTED_ONLY`

Missing piece:

- A short map from mega-pack concepts to existing control-plane objects.

First safe follow-up:

- Extend the concept fusion matrix with architecture owner and duplicate risk.

## Lane 3 - ROI Chain

Purpose:

- Rank ideas by value, cost, risk, dependency load, blast radius, validation
  burden, and reuse.
- Keep ROI as decision support, not decision authority.

Existing repo anchors:

- `docs/control-plane/PATCHPACK_CAMPAIGN_PLAN_V0.md`
- `docs/control-plane/PR_QUEUE_V0.md`
- `docs/control-plane/DIRECTOR_LAYER_V0.md`
- `docs/control-plane/DIRECTOR_REPORT_V0.md`
- `scripts/agent_run_planner.py`

Status: `PASSIVE`

Missing piece:

- A shared ROI scoring vocabulary for governance work.

First safe follow-up:

- Draft a passive `STUDIO_ROI_SCORING_V0.md` after this lane map is accepted.

## Lane 4 - Risk / Red-Team Chain

Purpose:

- Attack claims, scope, authority, output routing, prompt drift, runtime drift,
  dataset/training drift, benchmark-proof drift, and hidden autonomy.
- Produce blocking questions before HumanGate.

Existing repo anchors:

- `docs/control-plane/REVIEW_PACKET_DRY_RUN.md`
- `docs/control-plane/ONE_COMMAND_LOCAL_REVIEW_PACK_V0.md`
- `docs/control-plane/DIRECTOR_REVIEW_POLICY_V0.md`
- `scripts/check_claim_data_gates.py`
- `studio_review/prompts/RED_TEAM_REVIEW.md`

Status: `PASSIVE`

Missing piece:

- A repeatable LM Studio review contract for governance packets.

First safe follow-up:

- Draft a local review contract that keeps LM Studio advisory only.

## Lane 5 - Patch Chain Factory

Purpose:

- Convert accepted intent into bounded execution packets.
- Keep Codex work local, scoped, validated, and report-driven.
- Preserve HumanGate before execution and after review.

Existing repo anchors:

- `schemas/studiopilot_task_packet.schema.json`
- `schemas/studiopilot_execution_report.schema.json`
- `schemas/studiopilot_review_packet.schema.json`
- `schemas/studiopilot_human_decision.schema.json`
- `scripts/control_plane/render_codex_prompt.py`
- `scripts/control_plane/prepare_codex_handoff.py`
- `scripts/control_plane/validate_execution_report.py`
- `scripts/control_plane/build_review_packet.py`
- `scripts/control_plane/build_human_decision.py`
- `docs/control-plane/CODEX_HANDOFF_PACK.md`
- `docs/control-plane/EXECUTION_REPORT_INTAKE.md`

Status: `IMPLEMENTED` for dry-run tooling, `PASSIVE` for authority.

Missing piece:

- A vocabulary bridge from mega-pack "Patch Chain" to existing CampaignPlan,
  PRQueue, TaskPacket, and handoff pack objects.

First safe follow-up:

- Do not create a new patch-chain executor. Add a vocabulary adapter only if
  HumanGate approves.

## Lane 6 - Deployment Columns Chain

Purpose:

- Route each idea to the correct column before any patch exists.
- Avoid mixing docs-only work, passive tooling, local review, sandbox work,
  runtime-gated work, agent-candidate work, and blocked work.

Recommended columns:

- `docs-only`
- `tooling-passive`
- `local-review`
- `sandbox`
- `runtime-gated`
- `agent-candidate`
- `blocked`

Existing repo anchors:

- `docs/control-plane/PATCHPACK_CAMPAIGN_PLAN_V0.md`
- `docs/control-plane/PR_QUEUE_V0.md`
- `docs/control-plane/ONE_COMMAND_LOCAL_REVIEW_PACK_V0.md`
- `docs/control-plane/CI_LOCAL_FIRST_POLICY.md`
- `schemas/studiopilot_pr_queue.schema.json`
- `schemas/studiopilot_local_review_pack.schema.json`

Status: `DOCUMENTED_ONLY`

Missing piece:

- A single deployment-column table for Studio governance work.

First safe follow-up:

- Draft `STUDIO_DEPLOYMENT_COLUMNS_V0.md` after lane acceptance.

## Lane 7 - Agent Breathing Chain

Purpose:

- Keep the agent system alive but not noisy.
- Decide which reviewers, specialists, or local agents are active now,
  suspended, waiting for a wake condition, irrelevant, or blocked.
- Preserve the human's words and route agent output back to the living human
  instead of letting agents become self-authorizing.

Existing repo anchors:

- `docs/control-plane/AI_ORG_CHART_V0.md`
- `docs/control-plane/SPECIALIST_ROLE_CHARTER_V0.md`
- `docs/control-plane/SPECIALIST_FREEZE_POLICY_V0.md`
- `docs/control-plane/SPECIALIST_REPORTING_POLICY_V0.md`
- `schemas/agent_profile.schema.json`
- `schemas/agent_scorecard.schema.json`
- `schemas/freeze_rules.schema.json`
- `schemas/strike_rules.schema.json`

Status: `DOCUMENTED_ONLY` / `PASSIVE`

Missing piece:

- A concrete suspend/wake/audit policy for agents and specialists.

First safe follow-up:

- Draft `AGENT_BREATHING_POLICY_V0.md` as docs-only before any agent activation.

## HumanGate Questions

Before any repo modification derived from this lane model, HumanGate should
answer:

1. Is this work docs-only, passive tooling, local review, sandbox,
   runtime-gated, agent-candidate, or blocked?
2. Which existing control-plane object owns the work?
3. What source state is created, registered, loaded, enforced, and evidenced?
4. What files may be changed?
5. What files or surfaces are forbidden?
6. What validation is required?
7. What claim language is forbidden?
8. What should be suspended or ignored if it becomes noise?

## Blocked Actions

This lane model does not authorize:

- runtime activation
- runtime/search/neural refactor
- training
- fine-tuning
- dataset generation or reset
- benchmark proof
- model promotion
- automatic branch creation
- automatic commit
- automatic push
- automatic PR
- auto-ready
- auto-merge
- autonomous agent loops
- output writes outside approved routing
- `latest.json`
- `lab/runs/RUN_*`
- `STUDIO_PIPELINE/` as a second source of truth
- overwriting `studio_review/`
- global ready/not-ready verdicts

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | No runtime behavior is changed or authorized. |
| tests | UNKNOWN | This document is docs-only and does not inspect behavior. |
| artifacts_runtime_outputs | BLOCKED | No runtime outputs, benchmark outputs, run bundles, datasets, or model artifacts are authorized. |
| canonical_docs | DOCUMENTED_ONLY | `MASTER_DOCS/` remains the canonical truth layer. |
| roadmap_docs_only | DOCUMENTED_ONLY | Mega-pack concepts remain roadmap/concept inputs until separately gated. |
| inference | PASSIVE | LM Studio and local LLMs may critique only. |
| local_review_stack | PASSIVE | `studio_review/` remains advisory and local. |
| control_plane | DOCUMENTED_ONLY | This document maps governance lanes; it does not execute them. |
| concept_backlog | DOCUMENTED_ONLY | Concepts are retained as backlog material, not applied in bulk. |
| agent_governance | PASSIVE | Agent breathing is a proposed governance policy, not activation. |

## Verdicts

software_verdict: CONTROL_PLANE_GOVERNANCE_LANES_DOCS_ONLY

evidence_verdict: REPO_MAPPING_AND_CONCEPT_ALIGNMENT_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
