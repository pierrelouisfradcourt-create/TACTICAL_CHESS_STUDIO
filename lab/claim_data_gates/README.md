# Claim Data Gates

PR-05 adds mechanical claim-language and data-lineage gates for future `RUN_ID` bundles and reports.

Expected PR-05 verdict:

```txt
software_verdict: GATE_ADDED
evidence_verdict: CLAIM_DATA_GATE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

The gate is not scientific proof.
The gate does not authorize claims.
The gate does not authorize merge.
The gate does not authorize promotion.
Gate PASS only means configured claim/data checks passed.
Gate PASS does not imply engine improvement.
Gate PASS does not imply benchmark validity.
Gate PASS does not imply promotion readiness.
A human claim decision remains separate from merge decision.
MERGE_DECISION is not CLAIM_DECISION.

The gate entry point is:

```txt
scripts/check_claim_data_gates.py
```

Examples stay in `lab/claim_data_gates/examples/`.
They are mechanical fixtures only, not run evidence, benchmark evidence, promotion evidence, or scientific claims.
