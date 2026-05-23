# PR-07 GPT Audit Examples

These examples are local fixtures for the PR-07 structured audit scaffold.

The valid input example is contract-only and carries:

- software_verdict: NOT_RUN
- evidence_verdict: CONTRACT_ONLY
- claim_verdict: NO_CLAIM_ALLOWED

The valid output example may report anomalies, warnings, and review recommendations, but it does not authorize anything.

The invalid output examples each trigger one named forbidden-authority issue. GPT audit is non-binding. GPT audit cannot authorize merge, promotion, scientific claims, BLOCKED overrides, or claim scope increases.
