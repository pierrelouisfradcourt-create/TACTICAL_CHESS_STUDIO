# PR-05 Crash Tests

These are mechanical claim-language and data-lineage gate crash cases. They are not run evidence, benchmark evidence, scientific proof, merge authority, or promotion authority.

| Crash case | Required blocking result |
| --- | --- |
| latest_json_used_as_evidence | BLOCKED_LATEST_AS_EVIDENCE |
| ci_pass_used_as_proof | BLOCKED_CI_AS_PROOF |
| elo_claim_without_strength_scope | BLOCKED_ELO_CLAIM |
| promotion_ready_without_uncertainty | BLOCKED_PROMOTION_CLAIM |
| scientific_proof_language | BLOCKED_SCIENTIFIC_PROOF_CLAIM |
| missing_dataset_id | MISSING_DATASET_ID |
| missing_split_id | MISSING_SPLIT_ID |
| missing_dataset_hash | MISSING_DATASET_HASH |
| missing_baseline | MISSING_BASELINE |
| missing_uncertainty_for_promotion | MISSING_UNCERTAINTY_FOR_PROMOTION |
| contract_only_with_claim | BLOCKED_CLAIM_SCOPE |
| holdout_content_exposed | BLOCKED_HOLDOUT_EXPOSURE |

`holdout_set_id` is allowed by itself.

The gate is not scientific proof.
The gate does not authorize claims.
The gate does not authorize merge.
The gate does not authorize promotion.
