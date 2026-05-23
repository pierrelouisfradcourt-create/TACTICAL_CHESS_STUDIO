# PR-05 Gate Verdicts

The PR-05 gate emits separate verdict channels:

```json
{
  "schema_version": "claim_data_gate.pr05",
  "software_verdict": "PASS|FAIL|BLOCKED|UNCERTAIN|NOT_RUN",
  "evidence_verdict": "COMPLETE|INCOMPLETE|INVALID|CORRUPT|CONTAMINATED|UNCERTAIN|CONTRACT_ONLY|CLAIM_DATA_GATE_ONLY",
  "claim_verdict": "NO_CLAIM_ALLOWED|HEALTH_ONLY|TARGETED_BEHAVIOR_ONLY|EXPLORATORY_ONLY|PROMOTION_REVIEW_CANDIDATE|STRENGTH_CLAIM_CANDIDATE",
  "human_review_required": true,
  "blocking_issues": [],
  "warnings": [],
  "inspected_path": "...",
  "gate_version": "pr05"
}
```

Gate PASS only means configured claim/data checks passed.
Gate PASS does not imply engine improvement.
Gate PASS does not imply benchmark validity.
Gate PASS does not imply promotion readiness.

A human claim decision remains separate from merge decision.
MERGE_DECISION is not CLAIM_DECISION.
