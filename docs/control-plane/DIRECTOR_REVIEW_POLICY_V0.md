# Director Review Policy V0

Director Review Policy V0 defines when each director review is required and how escalations remain bounded.

## Required Review Routing

- Runtime-class work (`pr_type=RUNTIME`) requires `ARCHITECTURE_DIRECTOR` review.
- ML-class work (`pr_type=ML`) requires both `ARCHITECTURE_DIRECTOR` and `QUALITY_DIRECTOR` review.
- Workflow-class work (`pr_type=WORKFLOW`) requires `RESOURCE_DIRECTOR` and `QUALITY_DIRECTOR` review with governance attention.
- Benchmark-class work (`pr_type=BENCHMARK_BLOCKED`) requires `QUALITY_DIRECTOR` plus `MEMORY_EVIDENCE_DIRECTOR` and remains manual/non-claim.
- Product/gameplay relevance checks require `PRODUCT_GAME_DIRECTOR` review.

## Director-Specific Minimum Conditions

- `RESOURCE_DIRECTOR`: include at least one resource/cost/scope condition.
- `ARCHITECTURE_DIRECTOR`: include at least one layering/runtime/architecture condition.
- `QUALITY_DIRECTOR`: include at least one validation/test/review condition.
- `MEMORY_EVIDENCE_DIRECTOR`: include at least one evidence/memory/claim-boundary condition.
- `PRODUCT_GAME_DIRECTOR`: include at least one product/gameplay/player-value condition.

## Escalation and Guardrails

- Any forbidden surface touch must yield `director_verdict=BLOCKED`.
- `human_gate_required` must always be true.
- `auto_ready_allowed` and `auto_merge_allowed` must always be false.
- Claim boundaries remain within `NO_CLAIM_ALLOWED`, `HEALTH_ONLY`, or `EVIDENCE_ONLY`.
- Memory/Evidence review covers claims, LearningEvent hygiene, dataset handling, and private IP sensitivity.

software_verdict: CONTROL_PLANE_DIRECTOR_REPORT_ONLY
evidence_verdict: LOCAL_DIRECTOR_REVIEW_STRUCTURE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
