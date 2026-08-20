# PR Split Policy V0

PR Split Policy V0 governs when decomposition should produce multiple PR candidates and when one coherent PatchPack is preferable.

## When To Split PRs

- Split when risk isolation is required.
- Split when ownership or director review routes differ materially.
- Split when runtime, ML, or workflow surfaces are touched, because these require stricter isolation and review.

## When To Batch Into One PatchPack

- Batch docs, control-plane schemas, fixtures, and local tooling together when they form one coherent planning change.
- Keep batching limited to a single bounded objective with clear validation coverage.

## Special Restrictions

- Runtime/ML/workflow PRs require stricter isolation and cannot be mixed casually with broad doc edits.
- Benchmark and training activities remain isolated and manual.
- Micro-PR spam is forbidden unless explicit risk boundaries require isolation.

software_verdict: CONTROL_PLANE_PROJECT_BREAKDOWN_ONLY
evidence_verdict: LOCAL_PLANNING_STRUCTURE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
