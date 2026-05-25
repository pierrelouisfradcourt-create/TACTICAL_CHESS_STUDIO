# PURELAB_LEGACY_DESKTOP_MERGE_REPLACE_EQUAL_REPORT_V0

## preflight
- task_id: STUDIO-PURELAB-LEGACY-DESKTOP-MERGE-REPLACE-EQUAL-V0
- current_directory: `C:\TACTICAL_CHESS_STUDIO`
- target_exists: PASS
  - `C:/Users/Studio-Dev/Desktop/pure lab legacy`
- source_exists: FAIL
  - `C:/TACTICAL_CHESS_STUDIO/local_backups_c/pure lab legacy`
- empty_tree_exists: PASS
  - `C:/Users/La Cigogne Gamer/Desktop/pure lab legacy`
- migration_report_directory_exists: PASS
  - `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/08_MIGRATION`
- report_existed_before_update: NO
  - `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/08_MIGRATION/PURELAB_LEGACY_DESKTOP_MERGE_REPLACE_EQUAL_REPORT_V0.md`
- empty_tree_recursive_file_count: 0
- empty_tree_recursive_directory_count: 176
- empty_tree_directory_count_blocks_deletion: NO
- source_target_distinct: PASS
- source_inside_target: NO
- target_inside_source: NO
- preflight_result: BLOCKED
- blocker:
  - source path is missing
- required_stop_action_taken: YES

## codex_runtime
- requested_model: `gpt-5.5`
- requested_reasoning_effort: `high`
- task_class: `bounded_filesystem_cleanup_and_merge`
- actual_runtime: UNKNOWN
- actual_runtime_evidence: No exact Codex runtime identity was exposed explicitly.
- runtime_status: `BLOCKED_FOR_RUNTIME_IDENTITY_CLAIM_ONLY`
- runtime_claim_rule: Complied; no exact runtime claim made.

## route_check
- produced_file_type: PureLab legacy desktop merge replace-equal report
- intended_surface: roadmap_docs_only
- canonical_destination: `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/08_MIGRATION/PURELAB_LEGACY_DESKTOP_MERGE_REPLACE_EQUAL_REPORT_V0.md`
- actual_destination: `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/08_MIGRATION/PURELAB_LEGACY_DESKTOP_MERGE_REPLACE_EQUAL_REPORT_V0.md`
- actual_destination_within_allowed_route: PASS
- forbidden_destinations_touched: NO
- registration_required: false
- project_source_upload_required: false
- retention_policy: local cleanup evidence until HumanGate review
- promotion_gate: HumanGate

## output_routing_result
- status: PASS
- report_created_or_updated_only_at_canonical_destination: YES
- output_routing_ambiguous: NO

## folders_deleted
- none
- deletion_status: NOT_RUN_BLOCKED_BY_PREFLIGHT
- empty_tree_recursive_file_count_was_zero: YES
- reason_not_deleted: Source path was missing, and the task explicitly required stopping if source is missing.

## files_copied_missing
- none
- copy_status: NOT_RUN
- reason: Source path missing.

## files_replaced_source_larger
- none
- replace_status: NOT_RUN
- reason: Source path missing.

## files_replaced_equal_size
- none
- replace_status: NOT_RUN
- reason: Source path missing.

## files_kept_target_larger
- none
- keep_status: NOT_RUN
- reason: Source path missing.

## source_file_count
- `UNVERIFIED_SOURCE_MISSING`

## target_file_count_before
- 1042

## target_file_count_after
- NOT_RUN
- reason: Merge did not execute.

## source_backup_preserved
- status: PASS_BY_NON_ACTION
- source_backup_folder_deleted: NO
- source_backup_folder_exists_at_requested_path: NO
- note: The requested source path was already missing during preflight; no delete operation was performed.

## commands_run
1. Read-only preflight command from `C:\TACTICAL_CHESS_STUDIO`.
   - result: `windows sandbox: setup refresh failed with status exit code: 1`
2. Escalated read-only preflight command from `C:\TACTICAL_CHESS_STUDIO`.
   - result: BLOCKED
   - evidence:
     - `CURRENT_DIR=C:\TACTICAL_CHESS_STUDIO`
     - `PATH_TARGET=...|EXISTS=True`
     - `PATH_SOURCE=...|EXISTS=False`
     - `PATH_EMPTY=...|EXISTS=True`
     - `PATH_MIGRATION=...|EXISTS=True`
     - `PATH_REPORT=...|EXISTS=False`
     - `EMPTY_TREE_RECURSIVE_FILE_COUNT=0`
     - `EMPTY_TREE_RECURSIVE_DIRECTORY_COUNT=176`
     - `SOURCE_TARGET_DISTINCT=True`
     - `SOURCE_INSIDE_TARGET=False`
     - `TARGET_INSIDE_SOURCE=False`
     - `SOURCE_FILE_COUNT=UNVERIFIED_SOURCE_MISSING`
     - `TARGET_FILE_COUNT_BEFORE=1042`
     - `PREFLIGHT_RESULT=BLOCKED: source path is missing`
3. Routed report creation at canonical destination.
4. Escalated routed report readback from `C:\TACTICAL_CHESS_STUDIO`.
   - result: PASS
   - evidence:
     - `REPORT_EXISTS=True`
     - `REPORT_LENGTH=6205`
5. Final escalated routed report readback after validation update.
   - result: PASS
   - evidence:
     - `REPORT_EXISTS=True`
     - `REPORT_LENGTH=6339`
     - `REPORT_HAS_VALIDATION_PASS=True`

## validation
- empty_tree_no_longer_exists_after_deletion: NOT_RUN
- source_backup_folder_still_exists: FAIL_AT_REQUESTED_PATH
- target_desktop_folder_still_exists: PASS
- copied_missing_files_exist_in_target: NOT_RUN
- replaced_duplicates_followed_policy: NOT_RUN
- kept_duplicates_followed_policy: NOT_RUN
- report_exists: PASS
- report_read_back: PASS

## skipped_validation
- deletion validation skipped because deletion did not execute.
- merge validation skipped because merge did not execute.
- duplicate replacement validation skipped because the requested source path was missing.

## risks
- The requested source backup path does not exist, so the intended merge could not be performed.
- The empty legacy tree has zero files and 176 directories, but it was intentionally left in place because the missing source triggered the required stop condition before deletion.
- No alternate source paths were inferred or scanned because the task bounded operations to exact authorized paths.

## status_by_surface
- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

## software_verdict
- BLOCKED
- No software, repo, runtime, dataset, model, benchmark, or training action was performed.

## evidence_verdict
- PARTIAL_EVIDENCE_ONLY
- Preflight evidence was collected and documented.
- Merge and deletion evidence is absent because preflight blocked execution.

## claim_verdict
- PASS
- No global-ready claim made.
- No exact Codex runtime claim made.
- No merge-success claim made.
- No deletion-success claim made.

## locked_actions_report
- delete_non_empty_folder: BLOCKED
- source_backup_delete: BLOCKED
- target_delete: BLOCKED
- file_move: BLOCKED
- file_rename: BLOCKED
- git: BLOCKED
- repo_scan: BLOCKED
- training: BLOCKED
- benchmark: BLOCKED
- dataset_generation: BLOCKED
- model_loading: BLOCKED
- model_promotion: BLOCKED
- agent_activation: BLOCKED
- commit: BLOCKED
- push: BLOCKED
- branch_creation: BLOCKED
- pull_request_creation: BLOCKED

## no_global_ready_verdict
- true
