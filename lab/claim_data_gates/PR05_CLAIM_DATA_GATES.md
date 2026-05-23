# PR-05 Claim Data Gates

PR-05 adds mechanical claim-language and data-lineage gates.

Scope:

- Standard library Python gate only.
- Contract-only documentation and examples only.
- No benchmark execution.
- No engine, search, neural, runtime, CI, dataset, or test behavior changes.
- No real `RUN_ID` evidence.
- No `lab/runs/RUN_*`.
- No `lab/runs/latest.json`.

Expected verdict:

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

Claim scope mapping is mechanical:

| Input scope | Maximum mechanical claim verdict |
| --- | --- |
| `smoke_benchmark` | `HEALTH_ONLY` |
| `conversion_suite` | `TARGETED_BEHAVIOR_ONLY` |
| `small_n` | `EXPLORATORY_ONLY` |
| `missing_dataset_lineage` | `NO_CLAIM_ALLOWED` |
| `missing_baseline` | `EXPLORATORY_ONLY` |
| `missing_uncertainty_for_promotion` | `NO_CLAIM_ALLOWED` |

Contract-only, parser-only, gate-only, and bootstrap-only material always maps to `NO_CLAIM_ALLOWED`.
