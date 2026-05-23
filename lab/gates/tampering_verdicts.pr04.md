# PR-04 Gate Verdicts

The gate emits these channels separately:

```txt
software_verdict
evidence_verdict
claim_verdict
gate_verdict
```

PR-04 expected gate-only verdict:

```txt
software_verdict: GATE_ADDED
evidence_verdict: MECHANICAL_GATE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

For a future bundle path, a mechanical pass may emit:

```txt
software_verdict: PASS
evidence_verdict: COMPLETE
claim_verdict: NO_CLAIM_ALLOWED
gate_verdict: INPUT_BOUNDARY_AND_TAMPERING_PASSED
```

A mechanical pass is not scientific proof.
A mechanical pass is not a scientific claim.
A mechanical pass does not authorize claims.
A mechanical pass does not authorize merge.
A mechanical pass is not promotion authority.
Gate PASS only means configured mechanical boundary checks passed.
Gate PASS does not imply engine improvement.
Gate PASS does not imply benchmark validity.
Gate PASS does not imply promotion readiness.

Blocking issue names include:

- INVALID_PROTOCOL
- EVIDENCE_INCOMPLETE
- BLOCKED_LATEST_AS_EVIDENCE
- BLOCKED_UNDECLARED_CRITICAL_READ
- BLOCKED_UNDECLARED_WRITE
- BLOCKED_WEAK_HASH
- BLOCKED_RUN_MUTATION
- BLOCKED_RUN_COMPLETENESS_UNKNOWN
- BLOCKED_SECRET_LEAK
- BLOCKED_HOLDOUT_EXPOSURE
- BLOCKED_PATH_TRAVERSAL
- BLOCKED_SYMLINK_ESCAPE
