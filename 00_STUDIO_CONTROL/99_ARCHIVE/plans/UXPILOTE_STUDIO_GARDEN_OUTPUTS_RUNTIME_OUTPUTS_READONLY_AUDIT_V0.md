# UxPilote Studio Garden Outputs Runtime Outputs Read-Only Audit V0

Task ID: UXPILOTE-STUDIO-GARDEN-OUTPUTS-RUNTIME-OUTPUTS-READONLY-AUDIT-V0

## Status and authority

- Status: DOCUMENTED_ONLY
- Surface: roadmap_docs_only
- Runtime authority: NONE
- Claim posture: NO_CLAIM_ALLOWED
- Owner authority: HumanGate
- Human gate required: true

This report is a routed roadmap-only, names-only audit of `outputs` and `runtime_outputs`. It does not authorize cleanup, deletion, movement, copying, archiving, content inspection, recursive scan, PureLab inspection, secrets access, runtime execution, Git activity, Godot execution, training, benchmark, dataset generation, model or checkpoint creation, model promotion, agent activation, Chess960 activation, DecisionController activation, or any global ready claim.

## Purpose

Create a read-only names-only audit of:

```text
C:/TACTICAL_CHESS_STUDIO/outputs
C:/TACTICAL_CHESS_STUDIO/runtime_outputs
```

The purpose is to begin artifact hygiene truth work by recording what exists at the top level of these two artifact/output surfaces without reading file contents, opening child directories, or moving anything.

## Audit scope

- Only top-level entries inside `outputs` and `runtime_outputs` were inspected.
- No recursive scan.
- No file content read from `outputs` or `runtime_outputs`.
- No secrets access.
- No PureLab content inspection.
- No file moves.
- No file copy, rename, delete, archive, cleanup, hash calculation, recursive size calculation, Git command, Godot command, test command, benchmark, training, dataset generation, latest manifest creation, run folder creation, model/checkpoint creation, or model promotion.

## Commands used

```powershell
Get-Location
```

```powershell
$paths = @('C:/TACTICAL_CHESS_STUDIO','C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL','C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP','C:/TACTICAL_CHESS_STUDIO/outputs','C:/TACTICAL_CHESS_STUDIO/runtime_outputs','C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_OUTPUTS_RUNTIME_OUTPUTS_READONLY_AUDIT_V0.md'); $paths | ForEach-Object { [PSCustomObject]@{ Path = $_; Exists = Test-Path -LiteralPath $_ } } | ConvertTo-Json
```

```powershell
if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/outputs') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/outputs' -Force | Select-Object Name, FullName, PSIsContainer, LastWriteTime }
```

```powershell
if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/runtime_outputs') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/runtime_outputs' -Force | Select-Object Name, FullName, PSIsContainer, LastWriteTime }
```

```powershell
if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/outputs') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/outputs' -Force | Select-Object Name, FullName, PSIsContainer, @{Name='LastWriteTimeText';Expression={$_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss zzz')}} | ConvertTo-Json }
```

```powershell
if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/runtime_outputs') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/runtime_outputs' -Force | Select-Object Name, FullName, PSIsContainer, @{Name='LastWriteTimeText';Expression={$_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss zzz')}} | ConvertTo-Json }
```

Source anchor and control documents were read only from `00_STUDIO_CONTROL` roadmap/control paths. Artifact/output files were not opened.

## Outputs path result

- Path: `C:/TACTICAL_CHESS_STUDIO/outputs`
- Exists: true
- Top-level entries observed: 2
- Inspection depth: one bounded level only
- Content read: none

## Runtime outputs path result

- Path: `C:/TACTICAL_CHESS_STUDIO/runtime_outputs`
- Exists: true
- Top-level entries observed: 37
- Inspection depth: one bounded level only
- Content read: none

## Entries observed

| name | path | is_directory | last_write_time | initial_classification | evidence_type | human_gate_question |
| --- | --- | --- | --- | --- | --- | --- |
| `security_audit` | `C:/TACTICAL_CHESS_STUDIO/outputs/security_audit` | true | 2026-05-20 18:29:58 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this a passive security report output that may be reviewed later under a security-specific read-only task? |
| `security_pack` | `C:/TACTICAL_CHESS_STUDIO/outputs/security_pack` | true | 2026-05-20 18:20:56 +02:00 | generated_output_candidate | name/path/type/last_write_time only | Is this a generated output package, and should its contents remain blocked until a security-specific HumanGate task? |
| `app_settings_accessible_backup_20260520_190226` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/app_settings_accessible_backup_20260520_190226` | true | 2026-05-20 19:03:27 +02:00 | runtime_artifact_candidate | name/path/type/last_write_time only | Is this backup evidence to preserve, and what later read-only scope may inspect it? |
| `app_settings_targeted_acl_20260520_190651` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/app_settings_targeted_acl_20260520_190651` | true | 2026-05-20 19:06:51 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this an ACL report/log candidate requiring security review before content inspection? |
| `attach_recovered_data_to_studio_20260520_212043` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/attach_recovered_data_to_studio_20260520_212043` | true | 2026-05-20 21:21:00 +02:00 | generated_output_candidate | name/path/type/last_write_time only | Does HumanGate consider this recovered-data attachment evidence, and should content remain blocked until a recovery audit? |
| `attach_recovered_data_to_studio_20260520_212136` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/attach_recovered_data_to_studio_20260520_212136` | true | 2026-05-20 21:22:02 +02:00 | generated_output_candidate | name/path/type/last_write_time only | Is this a second recovered-data attachment output, duplicate candidate, or separate evidence bundle? |
| `browser_bookmarks_acl_20260520_173105` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/browser_bookmarks_acl_20260520_173105` | true | 2026-05-20 17:31:05 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Does this contain browser-related ACL evidence requiring privacy/security HumanGate review before opening? |
| `codex_documents_merge_20260520_173853` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/codex_documents_merge_20260520_173853` | true | 2026-05-20 17:38:53 +02:00 | runtime_artifact_candidate | name/path/type/last_write_time only | Is this a merge artifact to keep as evidence, or a candidate for a later document-work audit? |
| `codex_profile_acl_20260520_173529` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/codex_profile_acl_20260520_173529` | true | 2026-05-20 17:35:29 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Should Codex profile ACL evidence be treated as security-sensitive until a dedicated review? |
| `codex_profile_copy_20260520_173625` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/codex_profile_copy_20260520_173625` | true | 2026-05-20 17:36:29 +02:00 | generated_output_candidate | name/path/type/last_write_time only | Is this profile-copy material blocked_do_not_touch until HumanGate decides privacy handling? |
| `codex_soft_session_merge_20260520_173838` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/codex_soft_session_merge_20260520_173838` | true | 2026-05-20 17:38:38 +02:00 | runtime_artifact_candidate | name/path/type/last_write_time only | Is this a session-merge artifact, and should it be included in a future Codex profile recovery audit? |
| `current_user_duplicate_audit_20260520_210026` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/current_user_duplicate_audit_20260520_210026` | true | 2026-05-20 21:01:39 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this a duplicate-audit report candidate that may be read later under a hygiene task? |
| `disk_200gb_audit_20260520_202020` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/disk_200gb_audit_20260520_202020` | true | 2026-05-20 20:26:35 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this a storage audit report that may guide later cleanup only after HumanGate approval? |
| `git_recovery_bundles_20260520_201334` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/git_recovery_bundles_20260520_201334` | true | 2026-05-20 20:13:34 +02:00 | runtime_artifact_candidate | name/path/type/last_write_time only | Does this contain Git recovery evidence that must remain untouched without a Git-authorized task? |
| `idees_recovered_from_notepad` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/idees_recovered_from_notepad` | true | 2026-05-20 17:25:22 +02:00 | unknown_artifact | name/path/type/last_write_time only | Is this personal/recovered note material, and what privacy boundary applies before any content read? |
| `idees_shadow_recovery_20260520_171957` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/idees_shadow_recovery_20260520_171957` | true | 2026-05-20 17:19:57 +02:00 | runtime_artifact_candidate | name/path/type/last_write_time only | Is this shadow recovery evidence that should be handled by a recovery-specific audit? |
| `kanali_settings_restore_20260520_190736` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/kanali_settings_restore_20260520_190736` | true | 2026-05-20 19:07:36 +02:00 | runtime_artifact_candidate | name/path/type/last_write_time only | Is this restore evidence, and should it remain untouched until a settings recovery review? |
| `la_cigogne_consolidation_20260520_203816` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/la_cigogne_consolidation_20260520_203816` | true | 2026-05-20 20:40:09 +02:00 | runtime_artifact_candidate | name/path/type/last_write_time only | Is this consolidation output part of a known recovery/hygiene chain? |
| `la_cigogne_consolidation_20260520_204027` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/la_cigogne_consolidation_20260520_204027` | true | 2026-05-20 20:47:43 +02:00 | runtime_artifact_candidate | name/path/type/last_write_time only | Is this a separate consolidation artifact or duplicate candidate? |
| `la_cigogne_duplicate_cleanup_20260520_205010` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/la_cigogne_duplicate_cleanup_20260520_205010` | true | 2026-05-20 20:51:00 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Does this record a cleanup dry run, actual cleanup evidence, or something unknown from name alone? |
| `la_cigogne_duplicate_cleanup_20260520_205112` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/la_cigogne_duplicate_cleanup_20260520_205112` | true | 2026-05-20 20:52:03 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this a second cleanup report/log candidate, and should it be compared only under a later bounded task? |
| `llm_duplicate_audit_20260520_202955` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/llm_duplicate_audit_20260520_202955` | true | 2026-05-20 20:31:37 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this an LLM duplicate audit report requiring later content review, or should it remain passive evidence? |
| `lmstudio_acl_recovery_20260520_170019` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/lmstudio_acl_recovery_20260520_170019` | true | 2026-05-20 17:00:19 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Should LM Studio ACL recovery evidence be marked security-sensitive until HumanGate review? |
| `lmstudio_admin_acl_recovery_20260520_170306` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/lmstudio_admin_acl_recovery_20260520_170306` | true | 2026-05-20 17:03:13 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Does the admin ACL name require elevated privacy/security handling before content inspection? |
| `lmstudio_model_copy_20260520_170527` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/lmstudio_model_copy_20260520_170527` | true | 2026-05-20 17:05:37 +02:00 | blocked_do_not_touch | name/path/type/last_write_time only | Does this contain model-related copied material that must stay blocked until a model-storage HumanGate task? |
| `lmstudio_profile_recovery_20260520_165932` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/lmstudio_profile_recovery_20260520_165932` | true | 2026-05-20 16:59:32 +02:00 | runtime_artifact_candidate | name/path/type/last_write_time only | Is this profile recovery evidence with privacy constraints? |
| `lmstudio_safe_profile_copy_20260520_173202` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/lmstudio_safe_profile_copy_20260520_173202` | true | 2026-05-20 17:32:02 +02:00 | generated_output_candidate | name/path/type/last_write_time only | Is this safe-profile copy material, and what future task may inspect it without promoting or moving it? |
| `lmstudio_takeown_recovery_20260520_170043` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/lmstudio_takeown_recovery_20260520_170043` | true | 2026-05-20 17:00:43 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Should takeown recovery evidence be treated as security-sensitive and blocked from ordinary hygiene scans? |
| `lmstudio_takeown_recovery_20260520_170100` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/lmstudio_takeown_recovery_20260520_170100` | true | 2026-05-20 17:01:00 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this a second takeown recovery artifact or duplicate candidate? |
| `notepad_state_acl_recovery_20260520_172352` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/notepad_state_acl_recovery_20260520_172352` | true | 2026-05-20 17:23:52 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Does this contain recovered Notepad state or ACL evidence requiring privacy review? |
| `old_desktop_acl_recovery_20260520_171647` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/old_desktop_acl_recovery_20260520_171647` | true | 2026-05-20 17:16:48 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Should old desktop ACL evidence be excluded from general audit until a privacy/security task? |
| `safe_duplicate_cleanup_20260520_210347` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/safe_duplicate_cleanup_20260520_210347` | true | 2026-05-20 21:03:58 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Does this describe a prior cleanup action, dry run, or report-only artifact? |
| `safe_duplicate_cleanup_20260520_210425` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/safe_duplicate_cleanup_20260520_210425` | true | 2026-05-20 21:04:37 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this a companion cleanup report/log candidate that should be compared later only by explicit approval? |
| `shadow_copy_check_20260520_171803` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/shadow_copy_check_20260520_171803` | true | 2026-05-20 17:18:04 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this shadow-copy check evidence that should remain read-only? |
| `standard_user_folders_acl_20260520_172934` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/standard_user_folders_acl_20260520_172934` | true | 2026-05-20 17:29:35 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Does this include user-folder ACL evidence requiring privacy/security handling? |
| `standard_user_folders_copy_20260520_173011` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/standard_user_folders_copy_20260520_173011` | true | 2026-05-20 17:30:13 +02:00 | generated_output_candidate | name/path/type/last_write_time only | Is this copied user-folder output blocked_do_not_touch until HumanGate decides privacy handling? |
| `studio_shadow_compare_20260520_211255` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/studio_shadow_compare_20260520_211255` | true | 2026-05-20 21:12:57 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this a studio shadow comparison report candidate for a later recovery audit? |
| `robocopy_legacy_to_active_purelab_dryrun.log` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/robocopy_legacy_to_active_purelab_dryrun.log` | false | 2026-05-20 21:08:30 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | This references PureLab by name; should it remain blocked from content read until a PureLab-specific HumanGate task? |
| `robocopy_shadow1_to_current_studio_dryrun.log` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs/robocopy_shadow1_to_current_studio_dryrun.log` | false | 2026-05-21 01:57:08 +02:00 | report_or_log_candidate | name/path/type/last_write_time only | Is this a dry-run log that may be read later under a recovery/hygiene task, or should it remain passive evidence? |

## Initial classification

| classification | entries | basis |
| --- | --- | --- |
| runtime_artifact_candidate | `app_settings_accessible_backup_20260520_190226`, `codex_documents_merge_20260520_173853`, `codex_soft_session_merge_20260520_173838`, `git_recovery_bundles_20260520_201334`, `idees_shadow_recovery_20260520_171957`, `kanali_settings_restore_20260520_190736`, `la_cigogne_consolidation_20260520_203816`, `la_cigogne_consolidation_20260520_204027`, `lmstudio_profile_recovery_20260520_165932` | Name suggests runtime/recovery/merge artifact; no contents inspected. |
| generated_output_candidate | `security_pack`, `attach_recovered_data_to_studio_20260520_212043`, `attach_recovered_data_to_studio_20260520_212136`, `codex_profile_copy_20260520_173625`, `lmstudio_safe_profile_copy_20260520_173202`, `standard_user_folders_copy_20260520_173011` | Name suggests generated package/copy/attachment output; no contents inspected. |
| report_or_log_candidate | `security_audit`, `app_settings_targeted_acl_20260520_190651`, `browser_bookmarks_acl_20260520_173105`, `codex_profile_acl_20260520_173529`, `current_user_duplicate_audit_20260520_210026`, `disk_200gb_audit_20260520_202020`, `la_cigogne_duplicate_cleanup_20260520_205010`, `la_cigogne_duplicate_cleanup_20260520_205112`, `llm_duplicate_audit_20260520_202955`, `lmstudio_acl_recovery_20260520_170019`, `lmstudio_admin_acl_recovery_20260520_170306`, `lmstudio_takeown_recovery_20260520_170043`, `lmstudio_takeown_recovery_20260520_170100`, `notepad_state_acl_recovery_20260520_172352`, `old_desktop_acl_recovery_20260520_171647`, `safe_duplicate_cleanup_20260520_210347`, `safe_duplicate_cleanup_20260520_210425`, `shadow_copy_check_20260520_171803`, `standard_user_folders_acl_20260520_172934`, `studio_shadow_compare_20260520_211255`, `robocopy_legacy_to_active_purelab_dryrun.log`, `robocopy_shadow1_to_current_studio_dryrun.log` | Name includes audit, ACL, cleanup, check, compare, dryrun, or `.log`; no contents inspected. |
| cache_or_temp_candidate | none observed | No top-level name clearly indicated cache/temp from names only. Category preserved for future HumanGate classification. |
| unknown_artifact | `idees_recovered_from_notepad` | Name-only evidence is insufficient and may involve privacy-sensitive recovered notes. |
| blocked_do_not_touch | `lmstudio_model_copy_20260520_170527` | Name includes model-copy material; model/checkpoint handling is blocked without separate HumanGate authorization. |

All classifications are initial, names-only, and candidate-only.

## Unknowns and HumanGate questions

- Which entries are privacy-sensitive or security-sensitive and should remain `blocked_do_not_touch` before any content review?
- Should `outputs/security_audit` and `outputs/security_pack` be handled under a security-specific audit before ordinary artifact hygiene?
- Should `runtime_outputs` entries with `acl`, `profile`, `browser`, `notepad`, `desktop`, or `user_folders` in the name be excluded from general content inspection?
- Should entries whose names include `copy`, `backup`, `restore`, `recovery`, or `shadow` be preserved as evidence before any cleanup discussion?
- Does `lmstudio_model_copy_20260520_170527` contain model/checkpoint-like material requiring a dedicated model-storage task?
- Should `robocopy_legacy_to_active_purelab_dryrun.log` remain blocked from content read until a PureLab-specific task authorizes it?
- Are any observed entries allowed to be opened in the next narrow audit slice, or should the next slice remain names-only with one additional metadata field?

## What was not inspected

- No file contents were read under `outputs`.
- No file contents were read under `runtime_outputs`.
- No child directory contents were inspected.
- No recursive scan was performed.
- No secrets path was inspected.
- No TacticalChessPureLab repo contents were inspected.
- No files under `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab` were read, listed, modified, copied, moved, renamed, deleted, or executed.
- No Godot `.gd` or `.tscn` files were inspected or modified.
- No file hashes, recursive sizes, dependency graphs, Git status, Git history, tests, builds, benchmarks, training, datasets, run folders, manifests, models, or checkpoints were inspected or generated.

## Blocked actions

```yaml
file_move: BLOCKED
file_delete: BLOCKED
file_rename: BLOCKED
file_copy: BLOCKED
recursive_scan: BLOCKED
content_read: BLOCKED
secrets_access: BLOCKED
repo_scan: BLOCKED
runtime_change: BLOCKED
agent_activation: BLOCKED
training: BLOCKED
benchmark: BLOCKED
dataset_generation: BLOCKED
dataset_reset: BLOCKED
latest_manifest_creation: BLOCKED
run_folder_creation: BLOCKED
model_or_checkpoint_creation: BLOCKED
model_promotion: BLOCKED
chess960_activation: BLOCKED
decision_controller_activation: BLOCKED
real_approval_workflow: BLOCKED
decision_persistence: BLOCKED
real_audit_execution: BLOCKED
real_hygiene_scan: BLOCKED
real_truth_agent: BLOCKED
real_build_execution: BLOCKED
real_archive_action: BLOCKED
real_tool_launch: BLOCKED
commit: BLOCKED
push: BLOCKED
branch_creation: BLOCKED
pull_request_creation: BLOCKED
```

## Next recommended audit slice

Recommended next slice: inspect `runtime_outputs` more narrowly by HumanGate-approved subcategory, starting with report/log candidates only if HumanGate allows content read. If content read remains blocked, a safer next slice is names-only plus top-level file-vs-directory metadata for security/privacy-sensitive entries. `outputs` can be handled in a separate security-specific audit because its two observed entries both include `security` in the name.

Do not inspect PureLab-related log contents, secrets, model-copy material, user/profile/browser/notepad/desktop entries, or child directory contents unless HumanGate explicitly authorizes a narrower follow-up task.

## Status by surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Not inspected, modified, executed, or authorized. |
| tests | PASSIVE | Not inspected, modified, or run. |
| artifacts_runtime_outputs | PASSIVE | Top-level output/runtime-output entries were listed by name/path/type/time only; no contents inspected or generated. |
| canonical_docs | PASSIVE | Source anchors and templates were read as reference only; no canonical docs were modified. |
| roadmap_docs_only | DOCUMENTED_ONLY | This routed audit report was created as the only output. |
| inference | PASSIVE | Classifications are candidate-only and require HumanGate review. |

## Software verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

## Evidence verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

Evidence is limited to explicit source readback, allowed top-level `Get-ChildItem` commands for `outputs` and `runtime_outputs`, this report write, and docs-only report validation. It does not include recursive filesystem evidence, secrets evidence, PureLab evidence, Godot evidence, Git evidence, runtime evidence, test evidence, benchmark evidence, dataset evidence, model evidence, or checkpoint evidence.

## Claim verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

Claim posture remains `NO_CLAIM_ALLOWED`. This report claims only that a top-level names-only read-only audit of `outputs` and `runtime_outputs` was performed and documented under the routed roadmap destination.

## No global ready verdict

no_global_ready_verdict: true

No global ready or not-ready verdict is made. Verdicts are split by surface only.

## Executor report

```yaml
record_type: "executor_report_output"
contract_version: "V0"
language: "English"
task_id: "UXPILOTE-STUDIO-GARDEN-OUTPUTS-RUNTIME-OUTPUTS-READONLY-AUDIT-V0"
created_by: "Codex bounded local executor"
preflight:
  current_directory: "C:/TACTICAL_CHESS_STUDIO"
  studio_root_exists: DOCUMENTED_ONLY
  studio_control_exists: DOCUMENTED_ONLY
  roadmap_dir_exists: DOCUMENTED_ONLY
  outputs_exists: DOCUMENTED_ONLY
  runtime_outputs_exists: DOCUMENTED_ONLY
  target_report_existed_before_write: NOT_FOUND
  output_routing_ambiguous: false
  purelab_content_inspection_required: false
  secrets_inspection_required: false
  recursive_scan_required: false
codex_runtime:
  requested_model: "gpt-5.5"
  requested_reasoning_effort: "high"
  task_class: "read_only_audit"
  fallback_policy:
    if_requested_model_unavailable: "STOP_AND_REPORT"
    if_actual_model_identifier_hidden: "REPORT_UNKNOWN_AND_CONTINUE_WITH_ROUTED_LOCAL_TASK"
    unknown_runtime_status: "BLOCKED_FOR_RUNTIME_IDENTITY_CLAIM_ONLY"
  actual_runtime: "UNKNOWN"
  actual_runtime_evidence: "Exact runtime identifier was not exposed explicitly by Codex in-session."
  runtime_status: "BLOCKED"
  runtime_claim_rule: "Do not claim exact Codex runtime unless exposed explicitly."
source_state:
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md"
    created: DOCUMENTED_ONLY
    registered: DOCUMENTED_ONLY
    loaded: DOCUMENTED_ONLY
    enforced: DOCUMENTED_ONLY
    evidenced: DOCUMENTED_ONLY
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md"
    created: DOCUMENTED_ONLY
    registered: DOCUMENTED_ONLY
    loaded: DOCUMENTED_ONLY
    enforced: DOCUMENTED_ONLY
    evidenced: DOCUMENTED_ONLY
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md"
    created: DOCUMENTED_ONLY
    registered: DOCUMENTED_ONLY
    loaded: DOCUMENTED_ONLY
    enforced: DOCUMENTED_ONLY
    evidenced: DOCUMENTED_ONLY
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md"
    created: DOCUMENTED_ONLY
    registered: DOCUMENTED_ONLY
    loaded: DOCUMENTED_ONLY
    enforced: DOCUMENTED_ONLY
    evidenced: DOCUMENTED_ONLY
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml"
    created: DOCUMENTED_ONLY
    registered: DOCUMENTED_ONLY
    loaded: DOCUMENTED_ONLY
    enforced: DOCUMENTED_ONLY
    evidenced: DOCUMENTED_ONLY
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml"
    created: DOCUMENTED_ONLY
    registered: DOCUMENTED_ONLY
    loaded: DOCUMENTED_ONLY
    enforced: DOCUMENTED_ONLY
    evidenced: DOCUMENTED_ONLY
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_TOPLEVEL_READONLY_INVENTORY_V0.md"
    created: DOCUMENTED_ONLY
    registered: DOCUMENTED_ONLY
    loaded: DOCUMENTED_ONLY
    enforced: DOCUMENTED_ONLY
    evidenced: DOCUMENTED_ONLY
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_READONLY_INVENTORY_PLAN_V0.md"
    created: DOCUMENTED_ONLY
    registered: DOCUMENTED_ONLY
    loaded: DOCUMENTED_ONLY
    enforced: DOCUMENTED_ONLY
    evidenced: DOCUMENTED_ONLY
route_check:
  status: DOCUMENTED_ONLY
  output_routing_required: true
  output_routing_present: true
  destination_allowed: true
  evidence: "Canonical destination is inside C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP and matches the task charter."
output_routing_result:
  produced_file_type: "Read-only outputs/runtime_outputs audit report for the Studio Garden"
  intended_surface: "roadmap_docs_only"
  canonical_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_OUTPUTS_RUNTIME_OUTPUTS_READONLY_AUDIT_V0.md"
  temporary_destination: ""
  actual_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_OUTPUTS_RUNTIME_OUTPUTS_READONLY_AUDIT_V0.md"
  registration_required: false
  project_source_upload_required: false
  retention_policy: "roadmap_docs_only_until_HumanGate_promotion"
  promotion_gate: "HumanGate"
files_changed:
  - path: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_OUTPUTS_RUNTIME_OUTPUTS_READONLY_AUDIT_V0.md"
    surface: "roadmap_docs_only"
    change_status: DOCUMENTED_ONLY
    operation: "create"
    summary: "Created routed names-only read-only audit report for outputs and runtime_outputs."
files_not_touched:
  - "C:/TACTICAL_CHESS_STUDIO/secrets/**"
  - "C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/**"
  - "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_GODOT_GARDEN_CANDIDATE_ONLY/**"
commands_run:
  - command: "Get-Location"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Report current directory."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "Returned C:/TACTICAL_CHESS_STUDIO."
  - command: "Test-Path on studio root, Studio Control, roadmap destination, outputs, runtime_outputs, and target report"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Run bounded preflight path checks."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "Required roots existed; target report did not exist before creation."
  - command: "Get-Content on explicitly listed source anchors, templates, top-level inventory report, and inventory plan"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Load source state and routing constraints."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "All explicitly listed available source files returned content."
  - command: "if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/outputs') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/outputs' -Force | Select-Object Name, FullName, PSIsContainer, LastWriteTime }"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "List only top-level children of outputs."
    surface: "artifacts_runtime_outputs"
    result_status: DOCUMENTED_ONLY
    evidence: "Returned 2 first-level entries; no -Recurse used."
  - command: "if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/runtime_outputs') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/runtime_outputs' -Force | Select-Object Name, FullName, PSIsContainer, LastWriteTime }"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "List only top-level children of runtime_outputs."
    surface: "artifacts_runtime_outputs"
    result_status: DOCUMENTED_ONLY
    evidence: "Returned 37 first-level entries; no -Recurse used."
  - command: "Timestamp-formatting variants of the same two allowed inventory commands"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Record stable last_write_time values in the report."
    surface: "artifacts_runtime_outputs"
    result_status: DOCUMENTED_ONLY
    evidence: "Returned same top-level entries with formatted timestamps."
validation:
  status: DOCUMENTED_ONLY
  commands:
    - command: "Test-Path target report"
      result_status: DOCUMENTED_ONLY
      evidence: "Target report exists after creation."
    - command: "Get-Content target report"
      result_status: DOCUMENTED_ONLY
      evidence: "Target report readback completed."
    - command: "Select-String target report for outputs, runtime_outputs, no recursive scan, no file content read, no secrets access"
      result_status: DOCUMENTED_ONLY
      evidence: "Required scope-control phrases found."
    - command: "Select-String target report for runtime_artifact_candidate, generated_output_candidate, report_or_log_candidate, cache_or_temp_candidate, unknown_artifact"
      result_status: DOCUMENTED_ONLY
      evidence: "Required classification labels found."
    - command: "Verify no Godot .gd or .tscn files were modified"
      result_status: DOCUMENTED_ONLY
      evidence: "Verified by command scope and file-touch list; no commands targeted Godot candidate files and only the routed report was written."
    - command: "Verify no TacticalChessPureLab repo files were modified or inspected"
      result_status: DOCUMENTED_ONLY
      evidence: "Verified by command scope and file-touch list; no commands targeted C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab."
    - command: "Verify secrets was not inspected"
      result_status: DOCUMENTED_ONLY
      evidence: "Verified by command scope and file-touch list; no commands targeted C:/TACTICAL_CHESS_STUDIO/secrets."
  readback:
    - path: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_OUTPUTS_RUNTIME_OUTPUTS_READONLY_AUDIT_V0.md"
      status: DOCUMENTED_ONLY
      evidence: "Readback required and completed."
skipped_validation:
  - validation_item: "Recursive scan proof of unchanged files"
    surface: "roadmap_docs_only"
    status: BLOCKED
    reason: "Recursive scan is explicitly forbidden."
  - validation_item: "Git-based proof of unchanged repo/Godot files"
    surface: "roadmap_docs_only"
    status: BLOCKED
    reason: "Git commands are explicitly forbidden."
  - validation_item: "Runtime/test/benchmark validation"
    surface: "tests"
    status: BLOCKED
    reason: "Runtime execution, tests, benchmarks, and training are out of scope and forbidden."
risks:
  - risk: "Some entries may be privacy-sensitive or security-sensitive."
    surface: "artifacts_runtime_outputs"
    status: DOCUMENTED_ONLY
    mitigation: "No contents were read; HumanGate questions flag sensitive-looking names."
  - risk: "Classifications are based on names only."
    surface: "inference"
    status: DOCUMENTED_ONLY
    mitigation: "Ambiguous entries remain unknown_artifact or candidate-only."
  - risk: "Sandbox setup failed, requiring escalated PowerShell for read-only checks."
    surface: "roadmap_docs_only"
    status: DOCUMENTED_ONLY
    mitigation: "Commands were limited to explicit path checks, source reads, allowed top-level inventory commands, report creation, and readback validation."
locked_actions:
  file_move: BLOCKED
  file_delete: BLOCKED
  file_rename: BLOCKED
  file_copy: BLOCKED
  recursive_scan: BLOCKED
  content_read: BLOCKED
  secrets_access: BLOCKED
  repo_scan: BLOCKED
  runtime_change: BLOCKED
  agent_activation: BLOCKED
  training: BLOCKED
  benchmark: BLOCKED
  dataset_generation: BLOCKED
  dataset_reset: BLOCKED
  latest_manifest_creation: BLOCKED
  run_folder_creation: BLOCKED
  model_or_checkpoint_creation: BLOCKED
  model_promotion: BLOCKED
  chess960_activation: BLOCKED
  decision_controller_activation: BLOCKED
  real_approval_workflow: BLOCKED
  decision_persistence: BLOCKED
  real_audit_execution: BLOCKED
  real_hygiene_scan: BLOCKED
  real_truth_agent: BLOCKED
  real_build_execution: BLOCKED
  real_archive_action: BLOCKED
  real_tool_launch: BLOCKED
  commit: BLOCKED
  push: BLOCKED
  branch_creation: BLOCKED
  pull_request_creation: BLOCKED
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
software_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
evidence_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
claim_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
no_global_ready_verdict: true
manual_check_after_codex:
  - "Verify the report inspected only outputs/runtime_outputs."
  - "Verify no secrets were accessed."
  - "Verify no file contents were read."
  - "Verify the initial classifications make sense."
  - "Verify the next recommended audit slice is acceptable."
  - "Verify no cleanup or file moves happened."
```
