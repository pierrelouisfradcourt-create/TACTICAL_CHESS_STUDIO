# PURELAB_LEGACY_DESKTOP_MERGE_KEEP_LARGER_REPORT_V0

## preflight
- task_id: STUDIO-PURELAB-LEGACY-DESKTOP-MERGE-KEEP-LARGER-V0
- current_directory: `C:\TACTICAL_CHESS_STUDIO`
- target_exists: PASS
  - `C:/Users/Studio-Dev/Desktop/pure lab legacy`
- source_exists: FAIL
  - `C:/TACTICAL_CHESS_STUDIO/local_backups_c/pure lab legacy`
- empty_folder_candidate_exists: PASS
  - `C:/Users/La Cigogne Gamer/Desktop/pure lab legacy`
- migration_report_directory_exists: PASS
  - `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/08_MIGRATION`
- report_existed_before_update: NO
  - `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/08_MIGRATION/PURELAB_LEGACY_DESKTOP_MERGE_KEEP_LARGER_REPORT_V0.md`
- empty_folder_files_recursive_count: 0
- empty_folder_dirs_recursive_count: 176
- empty_folder_non_empty_directories_count: 50
- source_target_distinct: PASS
- source_inside_target: NO
- target_inside_source: NO
- preflight_result: BLOCKED
- blockers:
  - source missing
  - empty-folder candidate did not satisfy strict `non_empty_directories_count: 0`

## codex_runtime
- requested_model: `gpt-5.5`
- requested_reasoning_effort: `high`
- task_class: `bounded_filesystem_cleanup_and_merge`
- actual_runtime: UNKNOWN
- actual_runtime_evidence: No exact Codex runtime identity was exposed explicitly.
- runtime_status: `BLOCKED_FOR_RUNTIME_IDENTITY_CLAIM_ONLY`
- runtime_claim_rule: Complied; no exact runtime claim made.

## route_check
- produced_file_type: PureLab legacy desktop merge keep-larger report
- intended_surface: roadmap_docs_only
- canonical_destination: `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/08_MIGRATION/PURELAB_LEGACY_DESKTOP_MERGE_KEEP_LARGER_REPORT_V0.md`
- actual_destination: `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/08_MIGRATION/PURELAB_LEGACY_DESKTOP_MERGE_KEEP_LARGER_REPORT_V0.md`
- actual_destination_within_allowed_route: PASS
- forbidden_destinations_touched: NO
- registration_required: false
- project_source_upload_required: false
- promotion_gate: HumanGate

## output_routing_result
- status: PASS
- report_created_or_updated_only_at_canonical_destination: YES
- output_routing_ambiguous: NO

## folders_deleted
- none
- deletion_status: BLOCKED_BY_PREFLIGHT
- reason: Source path missing and strict empty-directory preflight did not pass.

## files_copied_missing
- none
- copy_status: NOT_RUN
- reason: Source path missing.

## files_replaced_by_larger_source
- none
- replace_status: NOT_RUN
- reason: Source path missing.

## files_skipped_target_larger_or_equal
- none
- skip_status: NOT_RUN
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
   - initial sandbox result: `windows sandbox: setup refresh failed with status exit code: 1`
2. Escalated read-only preflight command from `C:\TACTICAL_CHESS_STUDIO`.
   - result: FAILED as designed on missing source
   - evidence: `PATH_SOURCE=...|EXISTS=False`
3. Escalated read-only completion preflight command from `C:\TACTICAL_CHESS_STUDIO`.
   - result: BLOCKED
   - evidence:
     - `EMPTY_FILES_RECURSIVE_COUNT=0`
     - `EMPTY_DIRS_RECURSIVE_COUNT=176`
     - `EMPTY_NON_EMPTY_DIRECTORIES_COUNT=50`
     - `SOURCE_TARGET_DISTINCT=True`
     - `SOURCE_INSIDE_TARGET=False`
     - `TARGET_INSIDE_SOURCE=False`
     - `TARGET_FILE_COUNT_BEFORE=1042`
4. Routed report creation at canonical destination.
5. Escalated routed report readback from `C:\TACTICAL_CHESS_STUDIO`.
   - result: PASS
   - evidence:
     - `REPORT_EXISTS=True`
     - `REPORT_LENGTH=5936`
6. Final escalated routed report readback after validation update.
   - result: PASS
   - evidence:
     - `REPORT_EXISTS=True`
     - `REPORT_LENGTH=6070`
     - `REPORT_HAS_VALIDATION_PASS=True`

## validation
- empty_folder_no_longer_exists_after_deletion: NOT_RUN
- source_backup_folder_still_exists: FAIL_AT_REQUESTED_PATH
- target_desktop_folder_still_exists: PASS
- copied_missing_files_exist_in_target: NOT_RUN
- replaced_duplicates_used_larger_source_files_only: NOT_RUN
- skipped_duplicates_kept_target_because_target_size_ge_source_size: NOT_RUN
- report_exists: PASS
- report_read_back: PASS

## skipped_validation
- merge validation skipped because merge did not execute.
- deletion validation skipped because deletion did not execute.
- duplicate policy validation skipped because no source files were available at the requested source path.

## risks
- The requested source backup path does not exist, so the intended merge could not be performed.
- The empty-folder candidate contains no files, but strict directory emptiness validation found 50 directories with child entries. It was not deleted.
- No attempt was made to infer alternate backup locations because the task bounded operations to the requested paths.

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
