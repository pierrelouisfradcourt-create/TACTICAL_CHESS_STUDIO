# Studio State Chain Semantic Fixtures

These fixtures exercise the stdout-only dry-run chain:

ExecutionReport -> StudioStateDelta -> StudioStateSnapshot -> StudioCurrentState preview -> StudioMissionCandidate.

## Semantic Rule

`evidence_added` is supporting evidence text. It records what was observed, but it is not the structured state authority for proving a surface.

`proven_surfaces` is structured state. A surface may only appear in downstream `proven_surfaces` when the delta explicitly lists that surface and the relevant status or evidence verdict for that surface is `TESTED`.

Therefore, `evidence_added` alone cannot promote a surface.

## Fixtures

- `valid_semantic_delta.json` includes evidence, risks, blockers, decision debt, a next mission, forbidden missions, `claim_posture: NO_CLAIM_ALLOWED`, and `no_global_ready_verdict: true`.
- `invalid_bad_status_delta.json` contains `status: READY`, which is not in the allowed status taxonomy and must fail strict schema validation.
