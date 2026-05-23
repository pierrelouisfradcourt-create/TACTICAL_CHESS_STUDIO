# Specialist Role Charter V0

Specialist Role Charter V0 defines one generic control-plane schema for narrow experts. Specialists are not autonomous workers and are not active agents.

## Core Boundaries

- Specialists are narrow experts with bounded task scope.
- Specialists do not self-assign tasks.
- Specialists do not execute directly.
- Specialists do not merge pull requests.
- Specialists do not mark pull requests ready.
- Specialists report upward to Director ownership.
- Specialists answer bounded inputs with bounded outputs.

## Required Charter Fields

Every SpecialistRoleCharter entry must define:

- `mission`
- `inputs`
- `outputs`
- `forbidden_actions`
- `authority_level`
- `escalation_path`
- `freeze_conditions`
- `human_gate_required`

Each charter is also required to keep governance booleans locked to non-autonomous settings (`active_agent_allowed=false`, `auto_ready_allowed=false`, `auto_merge_allowed=false`, `auto_training_allowed=false`, `auto_rule_mutation_allowed=false`).

## Integration Note

Future Agent Registry V2 may reference Specialist Role Charter artifacts. This patch does not modify the agent registry.

software_verdict: CONTROL_PLANE_SPECIALIST_ROLE_CHARTER_ONLY
evidence_verdict: LOCAL_SPECIALIST_BOUNDARY_STRUCTURE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
