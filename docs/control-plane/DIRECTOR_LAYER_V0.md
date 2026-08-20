# Director Layer V0

Director Layer V0 is a control-plane review layer that sits below Project Breakdown and above specialist execution packets.

See [CONTROL_PLANE_VISION_MAP_V0.md](CONTROL_PLANE_VISION_MAP_V0.md) as a navigation and mental-model map only. Directors synthesize bounded specialist and policy signals; they do not become CEO / StudioPilot or replace HumanGate.

## Placement

- Upstream input: Project Breakdown reports and PR candidate slices.
- Director role: compress specialist and policy signals into bounded recommendations.
- Downstream consumers: CEO Office, Governance Kernel, and HumanGate decision flow.
- Directors do not execute code, call APIs, run agents, or mutate runtime systems.

## Director Responsibilities

- `RESOURCE_DIRECTOR`: reviews resource, budget, scope pressure, and CI cost boundaries.
- `ARCHITECTURE_DIRECTOR`: reviews layering, runtime boundaries, and system mutation risk.
- `PRODUCT_GAME_DIRECTOR`: reviews product/gameplay relevance and player-value alignment.
- `QUALITY_DIRECTOR`: reviews validation sufficiency, testability, and policy checks.
- `MEMORY_EVIDENCE_DIRECTOR`: reviews evidence hygiene, claim boundaries, and memory safety.

## Output Contract

- Directors publish bounded Director Reports that include scope review, PR-candidate review, risk level, required conditions, blocked reasons, and escalation routing.
- Director reports are planning/control-plane artifacts only.
- HumanGate remains mandatory for any ready/merge path.

software_verdict: CONTROL_PLANE_DIRECTOR_REPORT_ONLY
evidence_verdict: LOCAL_DIRECTOR_REVIEW_STRUCTURE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
