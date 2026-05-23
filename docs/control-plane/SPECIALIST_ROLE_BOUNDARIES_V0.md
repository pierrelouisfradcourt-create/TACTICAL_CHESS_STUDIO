# Specialist Role Boundaries V0

Specialist Role Boundaries V0 defines specialists as narrow experts inside the documented AI organization model. It is documentation only. It does not create active agents, runners, profiles, registries, workflows, scripts, schemas, API calls, model training, or autonomous execution.

HumanGate remains final authority.

See [CONTROL_PLANE_VISION_MAP_V0.md](CONTROL_PLANE_VISION_MAP_V0.md) for the distinction between specialized AI analysis, responsible director synthesis, CEO framing, and HumanDecision.

## Specialist Contract

Specialists are not autonomous agents. They do not self-assign work, dispatch workers, launch tools, merge, mark ready, spend budget, train models, promote memory, mutate rules, or make claims. They answer bounded questions and report uncertainty.

Each specialist must have:

- mission
- inputs
- outputs
- forbidden_actions
- authority_level
- escalation_path
- HumanGate requirement
- freeze conditions

If any required field is missing, the specialist role is not sufficiently scoped for execution.

## Required Boundaries

### Mission

The mission defines the narrow domain of expertise. It must be small enough that another layer can audit whether the specialist stayed in scope.

### Inputs

Inputs must be packetized or otherwise bounded. A specialist should receive questions, evidence bundles, paths, diffs, or reports. It should not receive an unrestricted mandate.

Future passive reader surfaces should consume normalized records or summaries, not raw chaotic logs. Passive `future_*_reader` names describe possible future intake surfaces only; they are not active analyst roles, agents, schedulers, permissions models, workflows, schemas, or decision makers.

### Outputs

Outputs should be concise domain reports. A specialist may recommend GO, SPLIT, HOLD, CANCEL, or ESCALATE when that recommendation is advisory and within scope.

### Forbidden Actions

Forbidden actions must be explicit. At minimum, specialists cannot merge, mark ready, activate spending, call external APIs, run benchmarks, train models, weaken HumanGate, weaken `NO_CLAIM_ALLOWED`, or expand their own authority.

### Authority Level

Specialists are advisory unless a future human-approved policy grants a mechanical check role. Advisory status means their output can inform a director or human decision, but cannot replace it.

### Escalation Path

Each specialist reports to a named director domain. If the specialist sees scope violation, forbidden-surface risk, claim uncertainty, budget risk, or missing HumanGate, it escalates through the director or Governance Kernel as appropriate.

### HumanGate Requirement

HumanGate is required for merge, ready, promotion, freeze removal, budget activation, claim status, benchmark proof, training, runtime/search/neural/ML scope, and authority changes.

### Freeze Conditions

A specialist must freeze its own action and report when:

- scope is ambiguous
- a forbidden surface appears
- evidence does not support the requested claim
- director ownership is unclear
- tool permissions are insufficient or unsafe
- HumanGate is missing

## Example Specialists

### Runtime/Rust Specialist

- mission: inspect bounded Rust runtime or architecture questions.
- inputs: scoped diffs, file paths, local command results, risk questions.
- outputs: architecture report, risk classification, validation gap list, advisory recommendation.
- forbidden_actions: cannot merge, cannot mark ready, cannot claim benchmark proof, cannot touch ML/training, cannot run benchmarks without explicit human scope, cannot weaken runtime safeguards.
- authority_level: advisory to Architecture Director.
- escalation_path: reports to Architecture Director; escalates runtime uncertainty, search/neural coupling, or forbidden-surface risk.
- HumanGate requirement: required for runtime scope, merge, ready, benchmark interpretation, claim language, and freeze removal.
- freeze conditions: runtime uncertainty, cross-surface ML/training interaction, missing tests for risky runtime behavior, or claim pressure.

### Finance/Compute Specialist

- mission: assess budget, compute, queue, and cost implications.
- inputs: planned jobs, estimated resource use, cloud/local distinction, spending constraints.
- outputs: GO, SPLIT, HOLD, or CANCEL recommendation with cost risk and assumptions.
- forbidden_actions: cannot activate spending, cannot launch cloud jobs, cannot add secrets, cannot provision infrastructure, cannot approve budget.
- authority_level: advisory to Resource Director.
- escalation_path: reports to Resource Director; escalates budget or cost risk to Human Founder.
- HumanGate requirement: required for any budget activation, cloud job, paid service, or sustained compute commitment.
- freeze conditions: unclear cost, missing cap, private IP risk, or job scope beyond local dry-run.

### Memory/Learning Specialist

- mission: review memory, evidence, and learning-record proposals.
- inputs: local records, evidence summaries, learning event drafts, policy constraints.
- outputs: evidence integrity report, memory promotion recommendation, uncertainty list.
- forbidden_actions: cannot auto-mutate rules, cannot train models, cannot promote memory without HumanGate, cannot create canonical evidence without scope, cannot claim proof.
- authority_level: advisory to Memory/Evidence Director.
- escalation_path: reports to Memory/Evidence Director; escalates evidence mismatch to Governance Kernel and promotion decisions to Human Founder.
- HumanGate requirement: required for memory promotion, policy mutation, canonical evidence, and claim status.
- freeze conditions: evidence mismatch, unsupported claim, conflicting memory, or missing human approval.

### QA/Review Specialist

- mission: review diffs, tests, risk, and validation gaps.
- inputs: patch, changed paths, local validation output, skipped validation list.
- outputs: findings, risk flags, test gaps, advisory readiness recommendation.
- forbidden_actions: cannot merge, cannot mark ready, cannot rerun failed CI without scope, cannot patch unless explicitly assigned implementation scope, cannot claim product proof.
- authority_level: advisory to Quality Director.
- escalation_path: reports to Quality Director; escalates unresolved risk, failed checks, or forbidden-surface contact.
- HumanGate requirement: required for ready, merge, ignored-risk acceptance, and claim language.
- freeze conditions: failed required check, unreviewed risky surface, missing validation, or unclear ownership.

## Non-Activation Boundary

These examples are role boundaries only. They are not profiles, registry entries, active agents, prompts for execution, or authorization to create workers. Any future implementation must be separately scoped, reviewed, and gated by HumanGate.

## Current Verdicts

software_verdict: CONTROL_PLANE_AGENT_HIERARCHY_DOCS_ONLY

evidence_verdict: SCALABLE_ORG_STRUCTURE_ONLY

claim_verdict: NO_CLAIM_ALLOWED
