# Director Report V0

Director Report V0 is a single generic schema used by all director types to review Project Breakdown outputs and PR candidates.

## Key Fields

- Identity and source: `schema_version`, `report_id`, `director_type`, `source_objective`, `source_project_breakdown_ref`.
- Reviewed scope: `reviewed_scope.allowed_paths`, `reviewed_scope.forbidden_paths`, `reviewed_scope.scope_summary`.
- PR candidate review: `reviewed_pr_candidates` entries with `pr_candidate_id`, `pr_type`, risk, decision, and reasons.
- Governance controls: `risk_level`, `director_verdict`, `required_conditions`, `blocked_reasons`, `escalation_required`, `escalation_targets`.
- Safety gates: `touched_surfaces`, `forbidden_surface_touched`, `human_gate_required`, `auto_ready_allowed`, `auto_merge_allowed`.
- Evidence boundaries: `claim_verdict`, `evidence_verdict`, `status`.

## Attachment Model

- Project Breakdown report: director reports reference `source_project_breakdown_ref` and evaluate its candidate scope.
- PR candidates: each candidate receives director decisions and reasons before human approval.
- TaskPacket: director-required conditions become execution prerequisites in bounded task packets.
- PRDecisionPacket: director verdict and risk rationale are carried into human decision packets.
- LearningEvent: blocked reasons and evidence boundaries are captured for memory hygiene.

## Verdict Usage

- `GO`: candidate class is acceptable if required conditions stay satisfied.
- `HOLD`: candidate requires further review, split, or evidence before progression.
- `BLOCKED`: candidate violates hard policy or safety boundary.
- `BLOCKED_INFRA`: candidate is blocked by infrastructure/operational readiness.

## Risk and Conditions

- `risk_level` summarizes the highest governance risk perceived by the director.
- `required_conditions` list must be concrete and testable for human review.
- `blocked_reasons` explain why progress is paused or prohibited.
- `escalation_required` and `escalation_targets` route unresolved risk to governance or human escalation.

software_verdict: CONTROL_PLANE_DIRECTOR_REPORT_ONLY
evidence_verdict: LOCAL_DIRECTOR_REVIEW_STRUCTURE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
