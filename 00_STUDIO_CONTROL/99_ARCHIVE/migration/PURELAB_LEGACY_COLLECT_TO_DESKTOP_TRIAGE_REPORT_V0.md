# PURELAB_LEGACY_COLLECT_TO_DESKTOP_TRIAGE_REPORT_V0

## preflight
- task_id: STUDIO-PURELAB-LEGACY-COLLECT-TO-DESKTOP-TRIAGE-V0
- current_directory: C:\TACTICAL_CHESS_STUDIO
- destination: C:/Users/Studio-Dev/Desktop/PURELAB_LEGACY_TRIAGE
- destination_existed_before_this_successful_copy_pass: True
- destination_routing_clear: true
- migration_report_directory_exists: True
- report_existed_before_update: False
- discovery_scope: exact candidate paths plus immediate children of C:/TACTICAL_CHESS_STUDIO/local_backups_c only
- global_scan_performed: false

## exact_candidate_paths_found_not_found
- Studio-Dev desktop: exists=True path=C:/Users/Studio-Dev/Desktop/pure lab legacy
- La Cigogne Gamer desktop: exists=True path=C:/Users/La Cigogne Gamer/Desktop/pure lab legacy
- local_backups_c root: exists=False path=C:/TACTICAL_CHESS_STUDIO/local_backups_c
- local_backups_c exact pure lab legacy: exists=False path=C:/TACTICAL_CHESS_STUDIO/local_backups_c/pure lab legacy

## local_backups_c_immediate_children
- none; C:/TACTICAL_CHESS_STUDIO/local_backups_c was missing or had no listed children

## destination_folder_created_existed
- destination_exists_after: True
- existed_before_successful_copy_pass: True
- note: a prior copy attempt failed before copying files because this PowerShell lacks System.IO.Path.GetRelativePath; partial empty triage directories were preserved, not deleted.

## folders_copied
- source_key=Studio-Dev desktop source=C:\Users\Studio-Dev\Desktop\pure lab legacy target=C:\Users\Studio-Dev\Desktop\PURELAB_LEGACY_TRIAGE\Studio-Dev_Desktop_pure_lab_legacy__SOURCE_1 source_files=1042 source_dirs=176 target_root_exists=True root_preexisted=True
- source_key=La Cigogne Gamer desktop source=C:\Users\La Cigogne Gamer\Desktop\pure lab legacy target=C:\Users\Studio-Dev\Desktop\PURELAB_LEGACY_TRIAGE\La_Cigogne_Gamer_Desktop_pure_lab_legacy source_files=0 source_dirs=176 target_root_exists=True root_preexisted=False

## files_copied_count
- 1042

## files_skipped_count
- 0

## duplicate_handling
- policy: no overwrites; source-larger duplicates copied beside existing file with __SOURCE_LARGER; equal-or-smaller duplicates skipped
- duplicate_target_roots_handled_with_source_suffix: true
- duplicates_source_larger_copied_beside_existing: 0
- duplicates_equal_or_smaller_skipped: 0
- duplicate_file_events: none

## originals_preserved
- exists=True path=C:/Users/Studio-Dev/Desktop/pure lab legacy
- exists=True path=C:/Users/La Cigogne Gamer/Desktop/pure lab legacy
- exists=False path=C:/TACTICAL_CHESS_STUDIO/local_backups_c
- exists=False path=C:/TACTICAL_CHESS_STUDIO/local_backups_c/pure lab legacy
- originals_deleted: false
- originals_moved: false
- originals_renamed: false

## commands_run
1. Bounded preflight command from C:\TACTICAL_CHESS_STUDIO.
   - sandbox result: windows sandbox: setup refresh failed with status exit code: 1
2. Escalated bounded preflight command from C:\TACTICAL_CHESS_STUDIO.
   - result: PASS
3. Escalated copy/report command attempt from C:\TACTICAL_CHESS_STUDIO.
   - result: FAILED before file copy on missing System.IO.Path.GetRelativePath; no delete/move/overwrite performed.
4. Escalated copy-only triage and report command with compatibility relative path from C:\TACTICAL_CHESS_STUDIO.
   - result: PASS
5. Escalated validation readback of routed report and copied roots.
   - result: PASS
   - evidence:
     - REPORT_EXISTS=True
     - REPORT_LENGTH=5897
     - DESTINATION_EXISTS=True
     - ROOT_STUDIO_EXISTS=True
     - ROOT_CIGOGNE_EXISTS=True
     - ORIGINAL_STUDIO_EXISTS=True
     - ORIGINAL_CIGOGNE_EXISTS=True
6. Final escalated routed report readback after validation update.
   - result: PASS
   - evidence:
     - REPORT_EXISTS=True
     - REPORT_LENGTH=6187
     - REPORT_HAS_VALIDATION_PASS=True
     - REPORT_HAS_PENDING=False

## validation
- destination_exists: True
- copied_folder_root_exists: True path=C:\Users\Studio-Dev\Desktop\PURELAB_LEGACY_TRIAGE\Studio-Dev_Desktop_pure_lab_legacy__SOURCE_1
- copied_folder_root_exists: True path=C:\Users\Studio-Dev\Desktop\PURELAB_LEGACY_TRIAGE\La_Cigogne_Gamer_Desktop_pure_lab_legacy
- original_still_exists_or_was_missing_preflight: True path=C:/Users/Studio-Dev/Desktop/pure lab legacy
- original_still_exists_or_was_missing_preflight: True path=C:/Users/La Cigogne Gamer/Desktop/pure lab legacy
- original_still_exists_or_was_missing_preflight: False path=C:/TACTICAL_CHESS_STUDIO/local_backups_c
- original_still_exists_or_was_missing_preflight: False path=C:/TACTICAL_CHESS_STUDIO/local_backups_c/pure lab legacy
- report_exists: PASS
- report_read_back: PASS
- git_run: false
- global_scan_run: false

## skipped_validation
- Git status/diff not run by instruction.
- Repo tests, runtime tests, training, benchmarks, model loading, dataset operations, and agent activation not run by instruction.

## risks
- C:/TACTICAL_CHESS_STUDIO/local_backups_c was missing, so no backup candidate from that root could be copied.
- A failed copy attempt created at least the triage destination and an initial source-labeled root before stopping; these were preserved rather than deleted. The successful pass used source-suffixed roots where needed to avoid overwrites.

## status_by_surface
- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: TESTED
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

## software_verdict
- PASSIVE
- No repo, runtime, dataset, model, benchmark, training, or test action was performed.

## evidence_verdict
- PASS
- Bounded candidates were checked, found candidates were copied into the desktop triage folder, originals were preserved, and validation evidence was recorded.

## claim_verdict
- PASS
- No global-ready claim made.
- No claim made for missing backup paths.

## locked_actions_report
- delete: BLOCKED
- move: BLOCKED
- rename_originals: BLOCKED
- overwrite_files: BLOCKED
- archive: BLOCKED
- git: BLOCKED
- repo_scan: BLOCKED
- global_scan: BLOCKED
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
