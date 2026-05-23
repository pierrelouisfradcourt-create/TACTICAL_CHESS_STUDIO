# StudioPilot Authority Matrix (SP-201)

This matrix documents who may propose, execute, validate, block, merge, promote, claim authority, and mutate system surfaces.

`Y` = allowed, `N` = not allowed, `A` = advisory/non-binding only, `M` = mechanical block capability only.

## Authority Table

| Actor | propose | execute | validate | block | merge | promote | claim authority | modify prompts | modify policies | modify runtime |
|---|---|---|---|---|---|---|---|---|---|---|
| Human Founder | Y | Y | Y | Y | Y | Y | Y | Y | Y | N* |
| ChatGPT Browser / Architect Producer | Y | N | A | N | N | N | N | A | A | N |
| StudioPilot Planner | Y | N | N | N | N | N | N | N | N | N |
| Codex Worker | Y | Y (bounded tasks) | N | N | N | N | N | N | N | N |
| GuardPlane | N | N | Y (mechanical) | M | N | N | N | N | N | N |
| EvidencePlane | N | N | Y (recording integrity) | N | N | N | N | N | N | N |
| BoosterSystem | Y | N | N | N | N | N | N | N | N | N |
| PromotionGate | N | N | Y (promotion gate checks) | M | N | N** | N | N | N | N |
| GitHub Actions | N | Y (declared workflows) | Y (declared checks) | M | N | N | N | N | N | N |

\* Runtime modification is forbidden in this SP-201 scope and requires explicit future scoping.

\** PromotionGate can gate and recommend promotion outcomes, but final promotion authority remains human.

## Required Interpretations

- Human Founder has final merge, promotion, and claim authority.
- ChatGPT can advise and review; it cannot authorize.
- Codex can execute bounded tasks; it cannot approve.
- GuardPlane can block mechanically; it does not own product judgment.
- EvidencePlane records evidence; it does not decide outcomes.
- BoosterSystem proposes learning or changes; it does not apply them directly.
- PromotionGate requires human approval for any promotion decision.
- Runtime modification remains forbidden unless explicitly scoped in future PRs.

## Explicit Near-Term Forbiddance

- active StudioPilot runtime
- Codex SDK adapter
- MCP write tools
- auto-ready
- auto-merge
- prompt auto-mutation
- ML training
- fine-tuning
- runtime/search/neural refactor through StudioPilot

## Verdict Boundaries

- software_verdict: CONTROL_PLANE_DOCS_ONLY
- evidence_verdict: LOOP_CONTRACT_DOCUMENTATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

