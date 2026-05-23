# Project Breakdown Report V0

Project Breakdown Report V0 defines a planning-only decomposition contract for large objectives.

## Core Fields

- Identity and source: `schema_version`, `report_id`, `source_objective`, `objective_summary`.
- Scope model: `scope_model.parent_scope`, `scope_model.included_scope`, `scope_model.excluded_scope`, `scope_model.coverage_rule`.
- Decomposition units: `epics`, `patch_groups`, `pr_candidates`.
- Coordination: `dependency_graph`, `required_director_reviews`, `recommended_first_action`.
- Safety and control gates: `stop_conditions`, `human_gate_required`, `auto_pr_creation_allowed`, `auto_ready_allowed`, `auto_merge_allowed`, `claim_verdict`, `status`.

## Integration With Existing Control-Plane Artifacts

- CampaignPlan: uses this report to sequence approved patch objectives.
- PRQueue: receives concrete PR candidates after producer prioritization.
- TaskPacket: translates selected PR candidate scope into execution instructions.
- PRDecisionPacket: records GO/HOLD/BLOCKED decisions against candidate scope and risk.
- LearningEvent: captures blocked conditions and process failures without claim escalation.

## What Makes A Breakdown Valid

- 100% scope model is explicit (`WBS_100_PERCENT_RULE`) with included and excluded surfaces.
- Every patch group references an existing epic.
- Every PR candidate references an existing patch group.
- Dependency edges only point to declared nodes.
- Recommended first action references an existing PR candidate.
- HumanGate is true and all auto-PR/ready/merge flags are false.
- Claim scope stays inside `NO_CLAIM_ALLOWED`, `HEALTH_ONLY`, or `EVIDENCE_ONLY`.

## What Blocks A Breakdown

- Scope gap or duplicate scope.
- Forbidden path touch intent.
- Missing required director review.
- Claim escalation beyond allowed scope.
- Auto PR attempt, runtime mutation without architecture review, or benchmark automation attempt.
- Invalid schema structure or unresolved dependency graph references.

software_verdict: CONTROL_PLANE_PROJECT_BREAKDOWN_ONLY
evidence_verdict: LOCAL_PLANNING_STRUCTURE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
