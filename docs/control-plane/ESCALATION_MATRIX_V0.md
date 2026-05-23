# Escalation Matrix V0

Escalation Matrix V0 defines conservative routing rules for the documented AI organization model. It is documentation only. It does not create active agents, runners, registries, workflows, scripts, schemas, API calls, or autonomous escalation.

HumanGate remains final authority.

## Escalate to Human Founder

Escalate to the Human Founder when final authority, budget, scope, or claim risk is involved:

- merge decision required
- claim boundary uncertain
- budget or cost risk
- runtime, search, neural, or ML touched
- benchmark or training proposed
- private IP risk
- agent authority conflict
- scope violation
- unresolved director disagreement

Human Founder escalation means the system should pause for human decision. It does not authorize auto-ready, auto-merge, budget activation, benchmark execution, training, claim escalation, or runtime changes.

## Escalate to Governance Kernel

Escalate to the Governance Kernel when boundary enforcement is at risk:

- HumanGate missing
- auto-ready or auto-merge appears
- no-claim boundary violated
- workflow, security, or permission risk
- tool call risk
- evidence mismatch

Governance Kernel escalation should classify the boundary problem and recommend HOLD, BLOCKED, or human review. It does not decide product direction or merge.

## Escalate to Director Layer

Escalate to the Director Layer when domain ownership or technical routing is unclear:

- specialist conflict
- unclear technical owner
- PR split unclear
- risk classification needed

Director escalation should produce a synthesized route, not a new uncontrolled handoff. If directors disagree, escalate to the Human Founder.

## Routing Defaults

- If a question touches authority, claims, budget, runtime, search, neural, ML, benchmarks, training, private IP, or workflow permissions, route upward.
- If a specialist receives an unbounded task, it must request packetization or escalate.
- If a worker receives a task outside its TaskPacket, it must stop and report the scope violation.
- If evidence and claims diverge, route to Governance Kernel before any product or merge decision.
- If a check fails, report the failed check and hold unless a human explicitly scopes a fix.

## Non-Activation Boundary

This matrix does not run escalation. It does not add notifications, bots, background jobs, active agents, tool permissions, GitHub API calls, OpenAI calls, Codex calls, or scripts. It records the intended routing policy for future human-controlled workflows.

## Current Verdicts

software_verdict: CONTROL_PLANE_AGENT_HIERARCHY_DOCS_ONLY

evidence_verdict: SCALABLE_ORG_STRUCTURE_ONLY

claim_verdict: NO_CLAIM_ALLOWED
