# PR-07 Crash Tests

These crash tests document policy and schema violations for simulated GPT audit outputs.

| Crash test | Expected issue |
| --- | --- |
| gpt_truth_established_true | GPT_TRUTH_ESTABLISHED_FORBIDDEN |
| gpt_merge_authorized_true | GPT_MERGE_AUTH_FORBIDDEN |
| gpt_promotion_authorized_true | GPT_PROMOTION_AUTH_FORBIDDEN |
| gpt_claim_authorized_true | GPT_CLAIM_AUTH_FORBIDDEN |
| gpt_blocked_to_pass | GPT_UNBLOCK_FORBIDDEN |
| gpt_claim_scope_increased | GPT_CLAIM_SCOPE_INCREASE_FORBIDDEN |
| gpt_missing_audit_verdict | GPT_SCHEMA_INVALID |
| gpt_scientific_proof_language | GPT_SCIENTIFIC_PROOF_FORBIDDEN |
| gpt_latest_json_as_evidence | GPT_LATEST_AS_EVIDENCE_FORBIDDEN |
| gpt_codex_report_alone_as_evidence | GPT_CODEX_REPORT_AS_EVIDENCE_FORBIDDEN |

GPT audit is non-binding. More reasoning does not increase authority, permissions, or claim scope.
