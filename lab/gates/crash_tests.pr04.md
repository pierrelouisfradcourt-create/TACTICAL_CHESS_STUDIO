# PR-04 Crash Tests

These are mechanical input-boundary and tampering gate crash cases. They are not run evidence, benchmark evidence, scientific proof, merge authority, or promotion authority.

| Crash case | Required blocking result |
| --- | --- |
| protocol_created_after_first_command | INVALID_PROTOCOL |
| latest_json_used_as_evidence | BLOCKED_LATEST_AS_EVIDENCE |
| undeclared_critical_read | BLOCKED_UNDECLARED_CRITICAL_READ |
| undeclared_write | BLOCKED_UNDECLARED_WRITE |
| command_record_without_exit_code | EVIDENCE_INCOMPLETE |
| command_record_without_stdout | EVIDENCE_INCOMPLETE |
| command_record_without_stderr | EVIDENCE_INCOMPLETE |
| artifact_without_sha256 | EVIDENCE_INCOMPLETE |
| artifact_hashes_uses_md5 | BLOCKED_WEAK_HASH |
| run_bundle_modified_after_human_decision | BLOCKED_RUN_MUTATION |
| discarded_run_without_reason | BLOCKED_RUN_COMPLETENESS_UNKNOWN |
| path_traversal_attempt | BLOCKED_PATH_TRAVERSAL |
| symlink_escape_attempt | BLOCKED_SYMLINK_ESCAPE |
| secret_in_payload | BLOCKED_SECRET_LEAK |
| holdout_content_exposed | BLOCKED_HOLDOUT_EXPOSURE |

`holdout_set_id` is an allowed identifier field by itself. It must not expose holdout positions, hashes, IDs, FENs, or move lists.
