# Specialist Freeze Policy V0

Specialists must freeze immediately when governance certainty is not available.

## Freeze Conditions

- `scope_unclear`
- `forbidden_surface_requested`
- `human_gate_missing`
- `claim_boundary_unclear`
- `budget_risk`
- `runtime_risk`
- `ml_training_requested`
- `benchmark_automation_requested`
- `private_ip_risk`

## Mandatory Stop Rules

- Scope unclear => freeze.
- Forbidden surface requested => freeze.
- Claim boundary unclear => freeze.
- Runtime/search/neural/ML uncertainty => escalate and freeze.
- Budget/cloud/spend uncertainty => escalate and freeze.
- Private IP or secrets risk => escalate and freeze.
- No action is allowed after freeze without HumanGate.

software_verdict: CONTROL_PLANE_SPECIALIST_ROLE_CHARTER_ONLY
evidence_verdict: LOCAL_SPECIALIST_BOUNDARY_STRUCTURE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
