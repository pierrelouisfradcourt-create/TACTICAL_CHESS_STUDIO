# PR-02 Immutable Run Rules

PR-02 defines a contract for future immutable run bundles.
It does not create scientific evidence.
It does not authorize claims.

Expected PR-02 verdict:

```txt
software_verdict: NOT_RUN
evidence_verdict: CONTRACT_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

## Rules

1. RUN_ID/ is append-only after RUN_COMPLETED.
2. Modifying a RUN_ID after human_decision = BLOCKED.
3. latest.json is a pointer, never evidence.
4. An example must never live in lab/runs/.
5. Every executed command must have stdout/stderr/exit_code/duration.
6. Every required evidence artifact must have sha256.
7. Every run intent must be settled.
8. Every DISCARD must have justification.
9. Missing log = EVIDENCE_INCOMPLETE.
10. Missing policy/protocol = NO_CLAIM_ALLOWED.

## Crash Tests

- example_created_inside_lab_runs -> BLOCKED_FALSE_EVIDENCE
- latest_json_used_as_evidence -> BLOCKED_LATEST_AS_EVIDENCE
- machine_verdict_missing_claim_verdict -> SCHEMA_INVALID
- machine_verdict_claim_not_allowed_in_contract_only -> BLOCKED_CLAIM_SCOPE
- artifact_hashes_uses_md5 -> BLOCKED_WEAK_HASH
- artifact_without_sha256 -> EVIDENCE_INCOMPLETE
- command_record_without_exit_code -> EVIDENCE_INCOMPLETE
- command_record_without_stdout -> EVIDENCE_INCOMPLETE
- command_record_without_stderr -> EVIDENCE_INCOMPLETE
- protocol_created_after_first_command -> INVALID_PROTOCOL
- run_bundle_modified_after_human_decision -> BLOCKED_RUN_MUTATION
- discarded_run_without_reason -> BLOCKED_RUN_COMPLETENESS_UNKNOWN
- untracked_attempt_not_recorded -> BLOCKED_CHERRY_PICKING
- example_file_without_example_only_true -> BLOCKED_FALSE_EVIDENCE
- example_file_with_real_claim -> BLOCKED_CLAIM_SCOPE
