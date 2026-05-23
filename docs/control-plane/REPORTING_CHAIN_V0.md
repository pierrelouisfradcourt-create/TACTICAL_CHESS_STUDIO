# Reporting Chain V0

Reporting Chain V0 defines how information should move through the documented AI organization model. It is documentation only. It does not create active agents, runners, registries, workflows, scripts, schemas, API calls, or autonomous handoffs.

HumanGate remains final authority.

See [CONTROL_PLANE_VISION_MAP_V0.md](CONTROL_PLANE_VISION_MAP_V0.md) as a navigation and mental-model map for macro/data/analysis/director/board/CEO/HumanDecision separation. The Vision Map is a navigation and mental-model document, not an authority layer.

## Upward Reporting

Each layer reports only the information needed by the layer above it:

- Workers / Tools report execution facts: files changed, commands run, results, skipped validation, blockers, and residual risks.
- Specialists report bounded analysis: answer, evidence, uncertainty, owner recommendation, forbidden surface checks, and escalation need.
- Directors report synthesized domain status: conflicts, risk classification, recommended route, and unresolved questions.
- Project Breakdown AI reports packet status: planned packets, dependencies, scope splits, and blocked surfaces.
- CEO Office AI reports compressed decision briefs: topic, status, recommended action, director inputs, risks, and human decision requirement.
- CEO / Producer AI reports strategic options to the Human Founder: recommended product direction, tradeoffs, holds, and decision points.
- Governance Kernel reports boundary violations, missing gates, and authority risks whenever escalation is required.

Raw logs must not go directly to the CEO / Producer AI as a normal path. The CEO Office compresses noise before producer review. Directors synthesize specialist reports before CEO Office intake. Specialists answer bounded questions only. Workers produce execution reports only.

Future specialized readers consume normalized records or summaries. They do not read raw chaotic logs directly, and they may not act, route, schedule, mutate, approve, merge, promote, or decide.

## Downward Intake

Each layer is allowed to receive only bounded direction from the layer above it:

- CEO / Producer AI receives human goals, constraints, and decisions.
- CEO Office AI receives producer priorities, director reports, inbox items, and escalation candidates.
- Project Breakdown AI receives bounded project direction and converts it into reviewable packets.
- Directors receive packetized domain assignments and known constraints.
- Specialists receive domain questions, evidence bundles, and explicit boundaries.
- Workers / Tools receive bounded TaskPackets with permitted files, forbidden surfaces, validation commands, and reporting requirements.

No layer may convert a vague prompt into unrestricted execution. No specialist may self-assign work. No worker may expand its TaskPacket. No free swarm or uncontrolled handoff is authorized.

## Packetization Rule

All communication should eventually be packetized. A packet may be a TaskPacket, ExecutionReport, ReviewPacket, HumanDecision, PRDecisionPacket, LearningEvent, or a future approved local record. Packetization makes routing auditable without turning the control-plane into an autonomous runner.

Macros may produce normalized records or summaries for passive future reader intake. This mapping is a passive readiness map for normalized future inputs; it does not activate agents, analysts, schedulers, permissions, workflows, or autonomous decisions.

## Examples

### Worker to Specialist

Worker report:

- implemented bounded docs change
- changed only declared files
- ran declared validation
- skipped benchmarks and training by scope
- reports residual risk for specialist review

Specialist receives execution facts and checks whether the bounded question was answered.

### Specialist to Director

Specialist report:

- answers the assigned domain question
- lists evidence inspected
- flags uncertainty and forbidden-surface risk
- recommends GO, HOLD, SPLIT, CANCEL, or ESCALATE within its authority

Director receives bounded specialist analysis and synthesizes domain status.

### Director to CEO Office

Director report:

- summarizes domain outcome
- identifies owner conflicts
- classifies risk
- lists required human decisions
- recommends escalation path when needed

CEO Office receives synthesis, not raw specialist logs.

### CEO Office to Producer

CEO Office brief:

- compresses director inputs
- removes duplicate noise
- lists open decisions
- routes escalation
- recommends the next producer action

Producer receives a decision brief, not a stream of logs.

### Producer to Human Founder

Producer report:

- states the decision needed
- offers bounded options
- reports risk and scope
- confirms HumanGate remains required
- makes no autonomous claim or merge decision

Human Founder makes the final decision.

## Current Verdicts

software_verdict: CONTROL_PLANE_AGENT_HIERARCHY_DOCS_ONLY

evidence_verdict: SCALABLE_ORG_STRUCTURE_ONLY

claim_verdict: NO_CLAIM_ALLOWED
