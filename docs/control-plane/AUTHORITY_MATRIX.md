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

## Rocky Runtime Decision Chain

This section is documentation-only. It does not activate runtime behavior, authorize DecisionController behavior, promote Neural authority, or change Search authority.

Rocky's intended decision chain is:

```text
Neural -> Search -> Critic -> Authority -> Executor
```

Role boundaries:

- `NeuralProposal`: Neural may propose or rerank candidate actions only.
- `SearchResult`: Search remains tactical authority and provides the tactical reference.
- `CriticVerdict`: Critic may `PASS`, `WARN`, `BLOCK`, or `ESCALATE`, but does not choose the final action. This vocabulary remains escalation-related; `ESCALATION_MATRIX_V0.md` is reference-only for this task.
- `AuthorityDecision`: Authority selects exactly one final validated action when the available signals and current state are coherent.
- `ValidatedAction`: the only valid input to Executor.
- `ExecutorResult`: Executor applies only a validated action bound to the current state, or refuses it.
- `TelemetryEvent`: telemetry is observation only and does not prove readiness, strength, promotion, or activation.

Required future records before implementation planning:

- `NeuralProposal`
- `SearchResult`
- `CriticVerdict`
- `AuthorityInput`
- `AuthorityDecision`
- `ValidatedAction`
- `ExecutorResult`
- `TelemetryEvent`
- `LegalActionSetSnapshot`
- `DecisionBudget`
- `StateSnapshotRef`
- `CriticReasonCode`

Safe defaults:

- Unknown authority conditions block future implementation until HumanGate and repo evidence resolve them.
- `CriticVerdict: BLOCK` means no direct execution.
- `CriticVerdict: ESCALATE` stops direct action and requires higher-level review.
- State mismatch before execution requires Executor refusal and telemetry.
- No invented fallback move is allowed.
- Claims remain bounded by evidence and HumanGate.

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

