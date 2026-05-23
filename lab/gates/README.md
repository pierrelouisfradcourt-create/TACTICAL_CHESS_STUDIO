# Input Boundary

PR-04 adds a mechanical input-boundary and tampering gate for future `RUN_ID` bundles.

Expected PR-04 verdict:

```txt
software_verdict: GATE_ADDED
evidence_verdict: MECHANICAL_GATE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

This directory contains gate documentation and contract-only examples.
It does not contain real runs, benchmark outputs, runtime behavior changes, promotion decisions, or scientific claims.

The gate is not scientific proof.
The gate does not authorize claims.
The gate does not authorize merge.
The gate does not authorize promotion.
Gate PASS only means configured mechanical boundary checks passed.
Gate PASS does not imply engine improvement.
Gate PASS does not imply benchmark validity.
Gate PASS does not imply promotion readiness.

The gate entry point is:

```txt
scripts/check_input_boundary.py
```

Examples must stay in `lab/gates/examples/`.
They must never be placed in `lab/runs/`.
