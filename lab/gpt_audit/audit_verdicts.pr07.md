# PR-07 Audit Verdicts

Allowed audit_verdict values:

- NO_ANOMALY_FOUND
- ANOMALY_FOUND
- AUDIT_INVALID
- SCHEMA_OR_POLICY_VIOLATION
- INSUFFICIENT_INPUT

The validator emits SCHEMA_OR_POLICY_VIOLATION when a simulated GPT audit output claims forbidden authority or violates the output contract.

The validator always keeps claim_verdict as NO_CLAIM_ALLOWED. GPT audit is non-binding and cannot authorize merge, promotion, or scientific claims.

Expected PR-07 scaffold verdict:

- software_verdict: AUDIT_LAYER_ADDED
- evidence_verdict: STRUCTURED_AUDIT_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
