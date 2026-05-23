# Control-Plane Vision Map V0

Control-Plane Vision Map V0 clarifies the mental model for the existing StudioPilot control-plane documents. It is documentation only. It does not create a new architecture, active agents, runners, schemas, scripts, workflows, permissions, automation, runtime behavior, benchmark evidence, or claims.

Status: DRAFT / CONTROL_PLANE_VISION_ONLY

Canonical effect: Clarifies existing documents only

Activation effect: NONE

Supersedes: NONE

HumanGate remains final authority.

## Canonical Vision

Macros produce normalized records or summaries.

Future specialized readers consume normalized records or summaries.

Responsible directors synthesize.

The board confronts domain reports.

The CEO / StudioPilot arbitrates future direction.

The human decides.

This is a compression path, not an execution path. Lower layers may produce records or advisory analysis. Higher layers may frame options. Only the human can make the final HumanDecision.

## Layer Map

### 1. Macro Mechanical Layer

The macro mechanical layer is the lowest control-plane surface. It includes deterministic helpers, local review pack builders, smoke helpers, validators, and other bounded routines that turn scoped inputs into repeatable outputs.

Macros may:

- collect local facts
- normalize inputs
- build local packets
- emit deterministic summaries
- expose missing fields or blocked states

Macros may not analyze intent, self-assign work, launch agents, call external APIs, mark ready, merge, train, benchmark, mutate runtime systems, or decide claims.

Macro output is data for review, not agent judgment. Macro output is data, not proof. Future readers consume normalized records or summaries, not raw chaotic logs.

This mapping is a passive readiness map for normalized future inputs; it does not activate agents, analysts, schedulers, permissions, workflows, or autonomous decisions.

| normalized_record | future_reader | allowed_use | forbidden_use |
|---|---|---|---|
| PATCH_SUMMARY | future_qa_pipeline_reader | Read normalized patch scope, validation, and risk summaries. | May not act, route, schedule, mutate, approve, merge, promote, or decide. |
| BENCHMARK_SUMMARY | future_evidence_reader | Read normalized benchmark-result summaries as evidence context only. | May not claim proof, promote evidence, act, route, schedule, mutate, approve, merge, or decide. |
| ROCKY_MATCH_SUMMARY | future_balance_reader | Read normalized match summaries for passive balance context. | May not alter runtime, tune behavior, act, route, schedule, mutate, approve, merge, promote, or decide. |
| RULE_MUTATION_SUMMARY | future_mutation_reader | Read normalized rule-change summaries as memory or policy context. | May not mutate rules, promote memory, act, route, schedule, approve, merge, promote, or decide. |

Rocky boundary note: Rocky is a product/runtime actor and data producer only. Rocky may play games, produce traces, and emit match outputs. Rocky is not a studio agent, not a reader, not an analyst, not a director, not StudioPilot, and not HumanGate.

Rocky output may be normalized into `ROCKY_MATCH_SUMMARY` or equivalent match summaries. These summaries are context records only. They do not tune Rocky, mutate rules, prove strength, authorize claims, promote variants, or activate future readers.

A future explanation surface may verbalize Rocky decision traces. That surface is separate from Rocky, non-authoritative, and cannot modify runtime, rules, claims, PR state, roadmap, or HumanDecision.

Rocky batch match production means gameplay execution that emits match data. It is not an autonomous tester, not an analyst, and not a control-plane actor.

### 2. Normalized Data Layer

The normalized data layer contains packetized records such as TaskPacket, ExecutionReport, ReviewPacket, HumanDecision draft, PRDecisionPacket, LearningEvent, LocalReviewPack, DirectorReport, and future approved local records.

Data may:

- preserve scope
- preserve evidence references
- preserve validation status
- preserve review status
- preserve decision axes
- make routing auditable

Data may not interpret itself, choose product direction, approve execution, merge, promote, or create proof. Data is an input to analysis and decision surfaces.

### 3. Specialized AI Analyst Layer

The specialized AI analyst layer contains bounded domain analysts. A specialist reads normalized data and answers a narrow question within its role boundary.

Specialized analysts may:

- inspect packets, diffs, reports, and evidence bundles
- identify domain risks
- explain uncertainty
- recommend advisory GO, SPLIT, HOLD, CANCEL, or ESCALATE only
- report forbidden-surface concerns to the owning director

Specialized analysts may not self-assign work, dispatch workers, create agents, merge, mark ready, spend budget, call external APIs, train models, promote memory, or replace HumanDecision.

Analysis is advisory domain interpretation, not final authority.

### 4. Responsible Director Layer

The responsible director layer owns domain synthesis. Directors receive specialist analysis and normalized records, resolve domain ownership, classify risk, and prepare bounded Director Reports.

Directors may:

- synthesize multiple specialist reports
- identify owner conflicts
- classify domain risk
- state required conditions
- recommend a route upward
- escalate boundary issues

Directors may not act as CEO, choose full product direction alone, execute work, merge, mark ready, promote claims, override HumanGate, or turn advisory analysis into final HumanDecision.

Director output is responsible synthesis, not company direction.

### 5. Board / Council Layer

The board / council layer is the cross-domain confrontation surface. It receives director reports and forces architecture, quality, product/game, resource, memory/evidence, security, and governance tradeoffs into one visible review space.

The board / council may:

- compare director reports
- expose unresolved conflicts
- identify which tradeoffs need CEO framing
- identify which items must go directly to HumanDecision
- preserve dissent instead of flattening it into false consensus

The board / council may not execute, merge, mark ready, activate budgets, create claims, create agents, or bypass the CEO / StudioPilot layer when strategic direction is needed.

The board confronts domain reports. It does not become the human.

### 6. CEO / StudioPilot Layer

The CEO / StudioPilot layer arbitrates future direction from compressed board and director signals. It frames product intent, priorities, sequence, and tradeoffs for the human founder.

CEO / StudioPilot is a future framing role, not an operational executive agent.

The CEO / StudioPilot layer may:

- convert domain reports into strategic options
- propose priorities
- identify sequencing
- request more director synthesis
- prepare a decision brief for the human

The CEO / StudioPilot layer may not execute code, call Codex, call OpenAI, call GitHub, create active agents, mark ready, merge, spend budget, train, benchmark, mutate runtime systems, promote claims, or replace HumanDecision.

StudioPilot remains a documented control-plane role and manual dry-run surface unless a future human-approved scope explicitly changes that status.

### 7. HumanDecision Layer

The HumanDecision layer is the human authority surface. It is the only layer that may finalize merge, ready, rejection, freeze removal, budget activation, claim status, promotion, runtime scope, benchmark interpretation, training authorization, or future activation of control-plane capabilities.

HumanDecision may use macro outputs, normalized data, specialist analysis, director synthesis, board confrontation, and CEO / StudioPilot framing.

HumanDecision is not produced automatically by those layers. It is made by the human founder or designated human approver.

## Required Separations

- Macro is not Agent.
- Bot is not AI.
- Data is not Analysis.
- Analysis is not Decision.
- Director is not CEO.
- Board is not HumanDecision.
- CEO is not HumanDecision.
- Codex is not StudioPilot.
- Rocky/runtime agents are not studio agents.

## Boundary Interpretations

Macro is not Agent means mechanical routines can produce local artifacts, but they do not gain intent, authority, self-direction, or delegation rights.

Bot is not AI means a chat, notification, automation shell, or command wrapper is not automatically an analyst or decision maker.

Data is not Analysis means a packet, JSON object, local review pack, log, or report field is a record. It does not interpret itself.

Analysis is not Decision means even strong specialist or director reasoning remains advisory until the authorized decision layer accepts, rejects, or routes it.

Director is not CEO means domain synthesis cannot silently become product strategy or final company direction.

CEO is not HumanDecision means StudioPilot or a CEO / Producer AI may frame direction, but cannot replace the human founder's final authority.

Codex is not StudioPilot means Codex may execute bounded tasks when separately invoked by a human, but Codex is not the planner, CEO, board, director, or HumanDecision layer.

Rocky/runtime agents are not studio agents means runtime chess engines, gameplay agents, neural/search components, and Rocky-related execution surfaces belong to product/runtime scope, not StudioPilot control-plane authority. All interpretation, promotion, claim, merge, roadmap, readiness, and activation decisions remain outside Rocky and require HumanGate / HumanDecision.

## Existing Documents This Map Clarifies

- `AI_ORG_CHART_V0.md`: hierarchy and role boundaries.
- `REPORTING_CHAIN_V0.md`: upward compression and downward bounded intake.
- `SPECIALIST_ROLE_BOUNDARIES_V0.md`: specialist advisory limits.
- `DIRECTOR_LAYER_V0.md`: director synthesis limits.
- `PR_DECISION_PACKET_V0.md`: compact local decision-summary data.
- `ONE_COMMAND_LOCAL_REVIEW_PACK_V0.md`: local normalized review-pack output.
- `LEARNING_EVENT_MINIMAL_V0.md`: structured memory draft boundaries.
- `HUMAN_DECISION_DRY_RUN.md`: HumanDecision draft tooling limits.

This map clarifies those docs. It does not supersede them, widen them, or activate any capability.

## Non-Activation Boundary

This document is not a Single Source of Truth for TaskPacket, RoleRegistry, EvidenceManifest, HumanDecision, PRDecisionPacket, DirectorReport, or any executable schema.

No layer described here can become active through documentation presence, naming, folder placement, repeated use, or local dry-run output.

This document does not create PatchSummaryMacro. It does not activate StudioPilot. It does not create a new agent, bot, script, schema, CI job, benchmark, dataset, model, runtime path, lab output, or generated artifact.

This document does not authorize runtime/search/neural/ML work, Rocky changes, training, benchmark claims, API calls, auto-ready, auto-merge, memory promotion, or claim escalation.

## Current Verdicts

software_verdict: CONTROL_PLANE_VISION_DOCS_ONLY

evidence_verdict: CONTROL_PLANE_MENTAL_MODEL_ONLY

claim_verdict: NO_CLAIM_ALLOWED
