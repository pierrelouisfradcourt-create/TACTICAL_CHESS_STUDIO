# PR Learning Lane Guard Policy

software_verdict: AUTO_MERGE_GUARD_LEARNING_FIXTURE_LANE_ADDED
evidence_verdict: MECHANICAL_PR_GATE_ONLY
claim_verdict: NO_CLAIM_ALLOWED

## Scope

This note records the bounded guard policy update for Learning System fixture/spec PRs.

Allowed Learning paths:
- `lab/learning/fixtures/**`
- `lab/learning/schemas/**`
- `lab/learning/specs/**`

Forbidden Learning paths:
- `lab/learning/generated/**`
- `lab/learning/runs/**`
- `lab/learning/datasets/**`
- `lab/learning/models/**`

Source-code Learning verdicts remain blocked until `src/learning/**` policy is explicitly reviewed.
