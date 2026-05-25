# Studio Agentic Pyramid Architecture V0

Status: DOCUMENTED_ONLY
Surface: canonical_docs
Canonical destination: `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_AGENTIC_PYRAMID_ARCHITECTURE_V0.md`
Produced artifact path: sandbox export
Created at UTC: `2026-05-18T07:53:19Z`
Runtime authority: NONE
Codex execution authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Dataset reset: BLOCKED
Model promotion: BLOCKED
Auto-merge: BLOCKED
Auto-post: BLOCKED
Auto-claim: BLOCKED
Claim posture: NO_CLAIM_ALLOWED
HumanGate: REQUIRED

---

## 1. Purpose

This document defines the AAA-style Studio Agentic Pyramid for a solo AI/game studio workflow.

It describes:

- who proposes;
- who frames;
- who executes;
- who verifies;
- who stores evidence;
- who may publish, claim, activate, merge, promote, or spend.

This document is architecture and control documentation only. It does not activate agents, runtime features, datasets, training, benchmarks, model promotion, social posting, publishing, or repository mutation.

---

## 2. Source Posture

This architecture is based on the loaded Studio Control and GPT Navigator sources available in the current production session.

Source state for this canonical integration:

| Source state | Status | Notes |
| --- | --- | --- |
| created | IMPLEMENTED | Markdown artifact copied to the canonical Studio Control destination. |
| registered | IMPLEMENTED | Registered through Studio Control indexes and `GPT_NAVIGATOR_SOURCE_INDEX_V0.md` as a reference source. |
| loaded | UNKNOWN | ChatGPT Project Source upload state was not inspected by this task. |
| enforced | DOCUMENTED_ONLY | Integration follows source anchoring, routing, surface separation, and non-authorization rules. |
| evidenced | TESTED | Readback and grep validation are required in the executor report. |

Core source anchoring rule:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

This document is a docs-only Studio Control source. It does not become runtime, agent, training, benchmark, dataset, model, publishing, or claim authority without a later HumanGate-approved task.

---

## 3. Core Doctrine

```yaml
rust: "runtime truth"
python: "ML / inference / tooling"
search: "final gameplay authority"
neural: "proposes and reranks only"
dataset_labels_require:
  - ActionId
  - LegalAction
  - ActionMask
  - provenance
  - HumanGate
claim_posture: "NO_CLAIM_ALLOWED"
human_gate_required: true
```

Default blocked actions:

```yaml
agent_activation: BLOCKED
training: BLOCKED
benchmark: BLOCKED
dataset_generation: BLOCKED
dataset_reset: BLOCKED
latest_manifest_creation: BLOCKED
run_folder_creation: BLOCKED
model_or_checkpoint_creation: BLOCKED
model_promotion: BLOCKED
chess960_activation: BLOCKED
decision_controller_activation: BLOCKED
commit: BLOCKED
push: BLOCKED
branch_creation: BLOCKED
pull_request_creation: BLOCKED
auto_merge: BLOCKED
auto_post: BLOCKED
auto_claim: BLOCKED
```

---

## 4. Studio Pyramid

```text
Human Founder
↓
Governance Kernel
↓
CEO / Producer AI
↓
CEO Office AI + Project Breakdown AI
↓
Director Council
├── Resource Director
├── Architecture Director
├── Quality Director
├── Product/Game Director
├── Art/Creative Director
├── Commercial/Publishing Director
└── Memory/Evidence Director
↓
Director-owned Specialists
↓
Workers / Tools
↓
Artifacts
↓
Feedback Loop
↓
HumanGate
```

The pyramid is a control model, not an autonomy model.

- Directors are domain owners.
- Specialists are bounded expert roles.
- Workers/tools execute only within explicit scope.
- Artifacts are evidence candidates, not truth by themselves.
- HumanGate remains final authority.

---

## 5. Layer Responsibilities

### 5.1 Human Founder

| Field | Value |
| --- | --- |
| mission | Final authority for strategy, doctrine, budget, merge, publication, claim, activation, promotion, release. |
| inputs | StrategyBrief, Director reports, EvidencePacket, ClaimReviewPacket, ResourceCostPacket, ROIPacket. |
| outputs | HumanDecision. |
| allowed actions | approve, reject, freeze, route, publish, merge, activate, spend, promote. |
| blocked actions | none inside legal/safety limits; cannot outsource final authority to agents. |
| authority level | final. |
| escalation path | none. |
| failure risks | bottleneck, under-specified decisions, approving weak evidence. |
| status | DOCUMENTED_ONLY. |

### 5.2 Governance Kernel

| Field | Value |
| --- | --- |
| mission | Apply cross-cutting gates before execution, publication, activation, spending, or claims. |
| inputs | TaskPacket, EvidencePacket, ClaimReviewPacket, MediaBrief, ResourceCostPacket. |
| outputs | gate_result, block_reason, required_human_decision. |
| allowed actions | inspect, block, require missing evidence, route to HumanGate. |
| blocked actions | execute, publish, merge, activate, spend. |
| authority level | veto / gate only. |
| escalation path | Human Founder. |
| failure risks | excessive blocking, vague gates, gate bypass. |
| status | DOCUMENTED_ONLY. |

Governance subgates:

```text
HumanGate
GuardPlane
EvidencePlane
ClaimGate
IP Boundary
BudgetGate
ActivationGate
MergeGate
ReleaseGate
```

### 5.3 CEO / Producer AI

| Field | Value |
| --- | --- |
| mission | Propose priorities, roadmap order, lane allocation, and decision memos. |
| inputs | Human goals, current state, Director reports, constraints. |
| outputs | StrategyBrief, priority memo, lane plan. |
| allowed actions | propose, synthesize, prioritize, escalate. |
| blocked actions | final decision, repository mutation, publication, spending, activation. |
| authority level | recommendation. |
| escalation path | Governance Kernel -> Human Founder. |
| failure risks | acting like autonomous CEO, optimizing for activity instead of product. |
| status | DOCUMENTED_ONLY. |

### 5.4 CEO Office AI

| Field | Value |
| --- | --- |
| mission | Maintain task context, triage, agenda, follow-up, source compression. |
| inputs | project sources, conversation state, reports, decisions. |
| outputs | brief, agenda, context packet, escalation note. |
| allowed actions | summarize, classify, prepare. |
| blocked actions | source invention, repo mutation, final decision. |
| authority level | administrative support. |
| escalation path | CEO / Producer AI. |
| failure risks | stale memory, false continuity, missing source state. |
| status | DOCUMENTED_ONLY. |

### 5.5 Project Breakdown AI

| Field | Value |
| --- | --- |
| mission | Convert a StrategyBrief into bounded task candidates. |
| inputs | StrategyBrief, constraints, source posture, roadmap. |
| outputs | TaskPacket, dependency graph, primary_owner. |
| allowed actions | decompose, size, define non-goals, route to Director. |
| blocked actions | Codex prompt without gate, patch, runtime activation. |
| authority level | planning. |
| escalation path | Director Council / HumanGate. |
| failure risks | oversized tasks, hidden scope expansion, unclear output routing. |
| status | DOCUMENTED_ONLY. |

### 5.6 Director Council

| Field | Value |
| --- | --- |
| mission | Produce bounded domain assessments and GO/HOLD/BLOCKED recommendations. |
| inputs | StrategyBrief, TaskPacket, EvidencePacket, resource constraints. |
| outputs | Director memos, risks, handoff requirements. |
| allowed actions | analyze, block within domain, request evidence. |
| blocked actions | final approval, execution, publication, activation. |
| authority level | recommendation / domain gate. |
| escalation path | CEO / Producer AI -> HumanGate. |
| failure risks | duplicated authority, handoff loops, too many opinions for solo dev. |
| status | DOCUMENTED_ONLY. |

### 5.7 Director-owned Specialists

| Field | Value |
| --- | --- |
| mission | Provide narrow expert analysis for one owning Director. |
| inputs | Specialist-specific packet. |
| outputs | specialist memo. |
| allowed actions | analyze, flag risk, propose constraints. |
| blocked actions | autonomous handoff, execution, final decision. |
| authority level | consultative. |
| escalation path | owning Director. |
| failure risks | hidden autonomous behavior, overloaded specialist roles. |
| status | DOCUMENTED_ONLY. |

### 5.8 Workers / Tools

| Field | Value |
| --- | --- |
| mission | Execute bounded mechanical work when explicitly authorized. |
| inputs | TaskPacket, Task Charter, commands, validation plan. |
| outputs | diff, draft, generated output, Executor Report. |
| allowed actions | only actions explicitly authorized in the task charter. |
| blocked actions | decide, claim, publish, merge, activate, promote, spend. |
| authority level | mechanical execution. |
| escalation path | Quality Director -> HumanGate. |
| failure risks | treating output as truth, silent side effects. |
| status | PASSIVE. |

Examples:

```text
Codex
scripts
checks
parsers
report generators
media generators
social draft generators
CI/local commands when explicitly authorized
```

### 5.9 Artifacts

| Field | Value |
| --- | --- |
| mission | Preserve outputs and evidence candidates. |
| inputs | tool outputs, reports, logs, drafts. |
| outputs | EvidencePacket candidates, review material. |
| allowed actions | store, classify, cite provenance. |
| blocked actions | self-promotion to proof or claim. |
| authority level | none. |
| escalation path | Memory/Evidence Director. |
| failure risks | evidence laundering, stale reports, benchmark-as-proof. |
| status | PASSIVE. |

### 5.10 Feedback Loop

| Field | Value |
| --- | --- |
| mission | Turn reviewed artifacts into memory and preventive-rule proposals. |
| inputs | Executor Report, EvidencePacket, failures, reviews. |
| outputs | LearningEvent, PreventiveRuleProposal. |
| allowed actions | propose learning, propose rule changes. |
| blocked actions | auto-mutate rules, auto-activate agents. |
| authority level | recommendation. |
| escalation path | HumanGate. |
| failure risks | over-documentation, fake productivity. |
| status | DOCUMENTED_ONLY. |

---

## 6. Director Council Matrix

| Director | Owns | Does not own | Specialists | Metrics | Blocked actions |
| --- | --- | --- | --- | --- | --- |
| Resource Director | budget, compute, time, scope, ROI, CostGuard | code architecture, gameplay truth, public claims | Finance, Compute, Time/Scope, CostGuard, ROI Analyst | cost/task, compute burn, time, expected value, uncertainty | spend money, approve ROI claims |
| Architecture Director | Rust/Python boundaries, integration, determinism, security/IP technical boundary | product promise, marketing, art final | Runtime/Rust, ML/Python, Security/IP, Determinism, Integration | touched modules, determinism risk, integration risk | merge, runtime activation, training |
| Quality Director | QA, review, regression, benchmark interpretation, evidence quality | product roadmap, business claims | QA/Review, Regression, Benchmark, Evidence Quality | validation strength, regression risk, evidence strength | use benchmark as proof, approve public claim |
| Product/Game Director | gameplay, balance, simulation goals, content, puzzle/curriculum | implementation authority, publishing | Game Design, Balance, Simulation, Content, Puzzle/Curriculum | clarity, fun hypothesis, balance risk, learning value | runtime change alone, player-outcome claim |
| Art/Creative Director | art direction, UI visual, concept art, brand, trailer/media drafts | public posting, final legal clearance | Art Direction, UI/UX Visual, Concept Art, Brand Identity, Trailer/Media | readability, brand consistency, provenance | final asset approval, publication |
| Commercial/Publishing Director | market, business model, Steam/storefront, pitch, community, social drafts, launch calendar | product truth, runtime truth, art final | Market, Business Model, Storefront/Steam, Pitch/Sales, Community/Social, SocialDraft, Launch/Comms Calendar | claim safety, audience fit, schedule risk | autopost, publisher contact, release, revenue claim |
| Memory/Evidence Director | docs, source anchoring, learning events, dataset gates, redaction, evidence/claims mapping | runtime execution, product decision, marketing strategy | Docs, LearningEvent, Dataset, Redaction, Evidence/Claims, Source Anchoring | traceability, source state, drift risk, redaction quality | dataset promotion, training, auto-rule mutation |

---

## 7. Specialist Ownership Rules

```yaml
specialist_rules:
  exactly_one_owning_director: true
  autonomous_behavior: BLOCKED
  decision_authority: BLOCKED
  execution_authority: BLOCKED
  must_output: "specialist_memo"
  must_escalate_to: "owning_director"
```

Specialists are role lenses, not independent agents.

A specialist may say:

```text
This task has determinism risk.
This claim is unsupported.
This social draft needs ClaimGate.
This media draft needs IP Boundary.
```

A specialist may not:

```text
Patch the repo.
Publish content.
Merge a PR.
Activate a feature.
Approve a claim.
Spend money.
Promote a dataset/model/runtime.
```

---

## 8. AutoDev Pipeline Integration

The Studio Pyramid links to the AutoDev contract through this flow:

```text
Human goal
→ StrategyBrief
→ Project Breakdown
→ TaskPacket
→ task_charter_input
→ bounded executor / Codex
→ executor_report_output
→ Quality + Evidence review
→ analysis_agent_record
→ HumanDecision
```

Required canonical record order:

```text
task_charter_input -> executor_report_output -> analysis_agent_record
```

No file-producing task may proceed without `output_routing`.

No Codex patch may proceed without a valid task charter and loaded source anchors.

No analysis-agent conclusion may be trusted without source-backed input records.

---

## 9. Packet Contracts

| Packet | Purpose | Producer | Consumer | Required fields | Blocked uses |
| --- | --- | --- | --- | --- | --- |
| StrategyBrief | frame strategic decision | Human / CEO Office | CEO, Directors | goal, context, constraints, success_condition, human_gate_required, claim_posture | execution alone |
| TaskPacket | frame bounded task | Project Breakdown | Director / Codex | task_id, surface, scope, non_goals, inputs, outputs, blocked_actions, validation_plan | patch without charter |
| ResourceCostPacket | estimate cost | Resource Director | CEO / Human | cost_type, estimate, cap, uncertainty, stop_condition, evidence | auto-spend |
| ROIPacket | compare cost/value | ROI Analyst | CEO / Human | expected_value, cost, assumptions, confidence, risk, evidence_status | claim ROI validated |
| MarketingDraftPacket | draft marketing content | Commercial | ClaimGate / Human | audience, message, evidence_links, claims, risk_flags, draft_status | publication auto |
| SocialDraftPacket | draft social post | SocialDraft Specialist | Commercial / Human | platform, copy, media_refs, claim_refs, approval_state, post_status | autopost |
| MediaBrief | frame image/video/trailer work | Product or Art | Art/Media | purpose, style, references, provenance, usage, ip_boundary, human_gate_required | final asset without review |
| EvidencePacket | group evidence | Quality / Memory | Governance / ClaimGate | source, surface, status, commands, results, limitations, provenance | external claim alone |
| LearningEvent | record learning candidate | Memory | HumanGate | trigger, failure_type, evidence, lesson, proposed_rule, risk | auto-mutation |
| PreventiveRuleProposal | propose future rule | Memory | Governance / Human | rule, scope, reason, evidence, side_effects, rollback | enforcement auto |
| ClaimReviewPacket | review claim | Evidence/Claims | ClaimGate / Human | claim_text, evidence_refs, surface, allowed_level, blocked_phrases, decision_needed | auto-claim |
| HumanDecision | final decision | Human Founder | all | decision, scope, approved_actions, blocked_actions, expiry, notes | outsource finality |

---

## 10. Authority Boundaries

| Boundary | Can suggest | Can execute | Can verify | Can publish | Can claim | Can activate | Can spend | Can promote data/model/runtime |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| strategy | CEO / Directors | Human only | Governance | Human only | Human only | Human only | Human only | Human only |
| code task | Architecture / Project Breakdown | Codex within TaskPacket | Quality | n/a | no | Human only | no | Human only |
| tests | Quality | scripts/CI if authorized | Quality | n/a | no | no | no | no |
| runtime | Architecture suggests | authorized Rust change only | tests + Quality | Human release | no | Human only | no | Human only |
| ML/inference | ML/Python suggests | authorized Python tooling only | Quality + Memory | no | no | Human only | no | Human only |
| dataset | Dataset Specialist suggests | blocked unless explicit | Memory + Quality | no | no | Human only | no | Human only |
| art/media | Art suggests | media generator draft | Art + IP Boundary | Human only | no | no | Human only | no |
| marketing/social | Commercial suggests | draft only | ClaimGate | Human only | Human only | no | Human only | no |
| storefront/release | Storefront suggests | draft checklist/copy | Commercial + ClaimGate | Human only | Human only | Human only | Human only | no |
| claims | Evidence/Claims suggests | no | ClaimGate | Human only | Human only | no | no | no |

---

## 11. Interaction Flows

### 11.1 Strategy decision

```text
Human Founder
→ Governance Kernel
→ CEO / Producer AI
→ Director Council
→ HumanGate
```

### 11.2 Dev task

```text
Project Breakdown AI
→ Architecture Director
→ owning Specialist
→ Task Charter
→ Codex
→ Executor Report
→ Quality Director
→ HumanGate
```

### 11.3 Cost/ROI decision

```text
Resource Director
→ ROI Analyst Specialist
→ CEO / Producer AI
→ Director Council
→ HumanGate
```

### 11.4 Marketing/social content

```text
Product evidence
→ Commercial/Publishing Director
→ SocialDraft Specialist
→ Art/Creative review
→ ClaimGate
→ Human approval
→ publication by human
```

### 11.5 Art/media generation

```text
Product/Game Director
→ Art/Creative Director
→ Trailer/Media Specialist or Concept Art Specialist
→ IP Boundary
→ Human approval
```

### 11.6 Learning/memory loop

```text
Artifacts
→ Memory/Evidence Director
→ LearningEvent draft
→ PreventiveRuleProposal
→ HumanGate
```

### 11.7 CostSearch / observability loop

```text
Rocky runtime diagnostics
→ Observability/Cost report
→ Resource Director + Quality Director
→ CEO / Producer AI
→ HumanGate
```

Observability remains report-only unless a separate task charter authorizes more.

---

## 12. Solo-Dev Operating Model

The full architecture should not be run as dozens of active agents.

Minimum viable solo-dev roles:

```text
1. Human Founder / HumanGate
2. Producer / Planner
3. Build / Architecture
4. Quality / Evidence
5. Creative / Commercial Draft
6. Resource Check
```

Safe merges:

```text
CEO Office + Project Breakdown
Quality + Memory/Evidence
Art/Creative + Commercial/Publishing for drafts only
Resource + Producer for low-cost estimates
```

Never merge:

```text
HumanGate with any AI role
ClaimGate with Commercial/Publishing
Quality Director with Codex/worker
Dataset Specialist with training execution
Storefront/Steam Specialist with release authority
```

Recommended weekly rhythm:

```text
Monday: StrategyBrief + resource cap
Tuesday-Wednesday: one or two bounded TaskPackets
Thursday: Quality/Evidence review
Friday: Memory/Evidence + draft creative/commercial review
Weekend: HumanGate decisions only if evidence is clean
```

---

## 13. Failure Modes and Corrections

| Problem | Why it matters | Correction | Remaining risk |
| --- | --- | --- | --- |
| Too many agents | solo dev overload | roles are modes, not active agents | bureaucracy |
| CEO AI becomes autonomous | hidden authority drift | recommendation only | human may over-trust |
| Specialists float between domains | handoff loops | exactly one owning Director | cross-domain friction |
| Marketing outruns product truth | unsafe claims | ClaimGate + evidence mapping | subtle overclaim |
| Generated media treated as final | IP risk | IP Boundary + HumanGate | external legal uncertainty |
| Benchmarks become proof | evidence laundering | benchmark = internal observation only | pressure to market |
| Codex acts without charter | scope drift | no charter, no patch | manual bypass |
| Docs become fake progress | over-documentation | task-size and output limits | under-building |
| Cost/ROI is guessed | bad allocation | assumptions + confidence + cap | ROI remains uncertain |
| Analysis agent mutates repo | unsafe automation | read-only blocked actions | future tool drift |

---

## 14. Status by Surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | No runtime code changed or activated by this document. |
| tests | PASSIVE | No tests changed or executed by this document. |
| artifacts_runtime_outputs | PASSIVE | No runtime output, run folder, checkpoint, dataset, or `latest.json` created. |
| canonical_docs | DOCUMENTED_ONLY | This architecture document is a canonical-doc candidate. |
| roadmap_docs_only | PASSIVE | Roadmap is separate. |
| inference | PASSIVE | Reasoning only; no ML authority. |

---

## 15. Final Verdicts

```yaml
software_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

evidence_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

claim_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

claim_posture: "NO_CLAIM_ALLOWED"
```

No global ready/not-ready verdict is made.

---

## 16. Non-Authorization

This architecture does not authorize:

- runtime implementation;
- runtime activation;
- test modification;
- training;
- benchmarking;
- dataset generation;
- dataset reset;
- model or checkpoint creation;
- model or checkpoint promotion;
- Chess960 activation;
- DecisionController activation;
- agent activation;
- social autopost;
- marketing claims;
- Steam release;
- publisher outreach;
- commits;
- pushes;
- branch creation;
- pull request creation.

Any such action requires a separate explicit HumanGate-approved task charter.
