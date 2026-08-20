# UxPilote Studio Garden Scripts Read-Only Audit V0

Task ID: UXPILOTE-STUDIO-GARDEN-SCRIPTS-READONLY-AUDIT-V0

## Status and authority

- Status: DOCUMENTED_ONLY
- Surface: roadmap_docs_only
- Runtime authority: NONE
- Claim posture: NO_CLAIM_ALLOWED
- Owner authority: HumanGate
- Human gate required: true

This report is a routed roadmap-only, names-only audit of `C:/TACTICAL_CHESS_STUDIO/scripts`. It does not authorize script content reading, script execution, cleanup, deletion, movement, copying, archiving, recursive scan, PureLab inspection, secrets access, runtime execution, Git activity, Godot execution, training, benchmark, dataset generation, model or checkpoint creation, model promotion, agent activation, Chess960 activation, DecisionController activation, or any global ready claim.

## Purpose

Create a read-only names-only audit of:

```text
C:/TACTICAL_CHESS_STUDIO/scripts
```

The purpose is to identify whether the top-level scripts area exists and what top-level script/tool candidates it contains without reading or executing script contents.

## Audit scope

- Only top-level entries inside `scripts` were inspected.
- No recursive scan.
- No script content read.
- No script execution.
- No secrets access.
- No PureLab content inspection.
- No file moves.
- No file copy, rename, delete, archive, cleanup, hash calculation, recursive size calculation, Git command, Godot command, test command, benchmark, training, dataset generation, latest manifest creation, run folder creation, model/checkpoint creation, or model promotion.

## Command used

```powershell
if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/scripts') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/scripts' -Force | Select-Object Name, FullName, PSIsContainer, LastWriteTime }
```

Timestamp formatting was performed on the same allowed top-level inventory command so the report could record stable last-write values:

```powershell
if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/scripts') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/scripts' -Force | Select-Object Name, FullName, PSIsContainer, @{Name='LastWriteTimeText';Expression={$_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss zzz')}} | ConvertTo-Json }
```

Source anchor and control documents were read only from `00_STUDIO_CONTROL` roadmap/control paths. Script files were not opened.

## Scripts path result

- Path: `C:/TACTICAL_CHESS_STUDIO/scripts`
- Exists: true
- Top-level entries observed: 1
- Inspection depth: one bounded level only
- Script content read: none
- Script execution: none

## Entries observed

| name | path | is_directory | last_write_time | initial_classification | evidence_type | human_gate_question |
| --- | --- | --- | --- | --- | --- | --- |
| `security_supplychain_audit.ps1` | `C:/TACTICAL_CHESS_STUDIO/scripts/security_supplychain_audit.ps1` | false | 2026-05-20 18:29:45 +02:00 | tool_script_candidate | name/path/type/last_write_time only | Is this a security supply-chain audit tool that should remain blocked from execution until a dedicated HumanGate tool/security review authorizes content inspection and run conditions? |

## Initial classification

| classification | entries | basis |
| --- | --- | --- |
| tool_script_candidate | `security_supplychain_audit.ps1` | File extension `.ps1` and name suggest a script/tool candidate; no contents inspected and no execution performed. |
| maintenance_script_candidate | none observed | No top-level name clearly indicated ordinary maintenance from names only. |
| godot_or_studio_tool_candidate | none observed | No top-level name clearly indicated Godot or Studio tooling from names only. |
| migration_or_setup_candidate | none observed | No top-level name clearly indicated migration or setup from names only. |
| unknown_script_candidate | none observed | The single observed entry had enough name/type evidence for a script/tool candidate label, but the label remains candidate-only. |
| blocked_do_not_touch | none observed | No entry was promoted to blocked_do_not_touch from name alone; execution remains globally blocked. |

All classifications are initial, names-only, and candidate-only.

## Unknowns and HumanGate questions

- Should `security_supplychain_audit.ps1` be handled under a security-specific review before any content read?
- Should PowerShell scripts in the Studio Garden be marked `blocked_do_not_touch` by default until a tool-zone policy exists?
- What exact future scope would be allowed: filename-only, metadata-only, content read, static review, or controlled execution?
- If content read is later approved, should secrets, PureLab, network, package managers, and external paths remain explicitly blocked?
- Should the next Tool Zone audit inspect `tools` top-level entries before any script content review?

## What was not inspected

- No script contents were read.
- No script was executed.
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
script_execution: BLOCKED
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

Recommended next slice: inspect `tools` top-level entries names-only before opening or executing any script. This would clarify whether `scripts` is standalone or part of a broader Tool Zone. If HumanGate wants to stay with `scripts`, the next narrower step should be a static script-content review of only `security_supplychain_audit.ps1`, but only after a new task explicitly authorizes content read and keeps execution blocked.

Datasets/models should remain names-only later, under separate HumanGate tasks, because their names imply higher risk for dataset/model/checkpoint authority confusion.

## Status by surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Not inspected, modified, executed, or authorized. |
| tests | PASSIVE | Not inspected, modified, or run. |
| artifacts_runtime_outputs | PASSIVE | Not inspected or generated in this slice. |
| canonical_docs | PASSIVE | Source anchors and templates were read as reference only; no canonical docs were modified. |
| roadmap_docs_only | DOCUMENTED_ONLY | This routed audit report was created as the only output. |
| inference | PASSIVE | Classification is candidate-only and requires HumanGate review. |

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

Evidence is limited to explicit source readback, the allowed top-level `Get-ChildItem` command for `scripts`, this report write, and docs-only report validation. It does not include script-content evidence, script-execution evidence, recursive filesystem evidence, secrets evidence, PureLab evidence, Godot evidence, Git evidence, runtime evidence, test evidence, benchmark evidence, dataset evidence, model evidence, or checkpoint evidence.

## Claim verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

Claim posture remains `NO_CLAIM_ALLOWED`. This report claims only that a top-level names-only read-only audit of `scripts` was performed and documented under the routed roadmap destination.

## No global ready verdict

no_global_ready_verdict: true

No global ready or not-ready verdict is made. Verdicts are split by surface only.

## Executor report

```yaml
record_type: "executor_report_output"
contract_version: "V0"
language: "English"
task_id: "UXPILOTE-STUDIO-GARDEN-SCRIPTS-READONLY-AUDIT-V0"
created_by: "Codex bounded local executor"
preflight:
  current_directory: "C:/TACTICAL_CHESS_STUDIO"
  studio_root_exists: DOCUMENTED_ONLY
  studio_control_exists: DOCUMENTED_ONLY
  roadmap_dir_exists: DOCUMENTED_ONLY
  scripts_exists: DOCUMENTED_ONLY
  target_report_existed_before_write: NOT_FOUND
  output_routing_ambiguous: false
  script_content_read_required: false
  script_execution_required: false
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
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_OUTPUTS_RUNTIME_OUTPUTS_READONLY_AUDIT_V0.md"
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
  produced_file_type: "Read-only scripts audit report for the Studio Garden"
  intended_surface: "roadmap_docs_only"
  canonical_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_SCRIPTS_READONLY_AUDIT_V0.md"
  temporary_destination: ""
  actual_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_SCRIPTS_READONLY_AUDIT_V0.md"
  registration_required: false
  project_source_upload_required: false
  retention_policy: "roadmap_docs_only_until_HumanGate_promotion"
  promotion_gate: "HumanGate"
files_changed:
  - path: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_SCRIPTS_READONLY_AUDIT_V0.md"
    surface: "roadmap_docs_only"
    change_status: DOCUMENTED_ONLY
    operation: "create"
    summary: "Created routed names-only read-only audit report for scripts."
files_not_touched:
  - "C:/TACTICAL_CHESS_STUDIO/scripts/security_supplychain_audit.ps1"
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
  - command: "Test-Path on studio root, Studio Control, roadmap destination, scripts, and target report"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Run bounded preflight path checks."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "Required roots existed; scripts existed; target report did not exist before creation."
  - command: "Get-Content on explicitly listed source anchors, templates, top-level inventory report, inventory plan, and previous outputs/runtime_outputs audit"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Load source state and routing constraints."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "All explicitly listed available source files returned content."
  - command: "if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/scripts') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/scripts' -Force | Select-Object Name, FullName, PSIsContainer, LastWriteTime }"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "List only top-level children of scripts."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "Returned 1 first-level entry; no -Recurse used; script content was not read."
  - command: "Timestamp-formatting variant of the same allowed scripts inventory command"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Record stable last_write_time value in the report."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "Returned same top-level entry with formatted timestamp."
validation:
  status: DOCUMENTED_ONLY
  commands:
    - command: "Test-Path target report"
      result_status: DOCUMENTED_ONLY
      evidence: "Target report exists after creation."
    - command: "Get-Content target report"
      result_status: DOCUMENTED_ONLY
      evidence: "Target report readback completed."
    - command: "Select-String target report for scripts, no recursive scan, no script content read, no script execution, no secrets access"
      result_status: DOCUMENTED_ONLY
      evidence: "Required scope-control phrases found."
    - command: "Select-String target report for tool_script_candidate, maintenance_script_candidate, godot_or_studio_tool_candidate, migration_or_setup_candidate, unknown_script_candidate"
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
    - path: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_SCRIPTS_READONLY_AUDIT_V0.md"
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
  - validation_item: "Script content review"
    surface: "active_runtime_code"
    status: BLOCKED
    reason: "Reading script contents is explicitly forbidden in this task."
  - validation_item: "Script execution"
    surface: "active_runtime_code"
    status: BLOCKED
    reason: "Script execution is explicitly forbidden."
  - validation_item: "Runtime/test/benchmark validation"
    surface: "tests"
    status: BLOCKED
    reason: "Runtime execution, tests, benchmarks, and training are out of scope and forbidden."
risks:
  - risk: "The observed PowerShell script may be security-sensitive or capable of broad filesystem inspection if executed."
    surface: "inference"
    status: DOCUMENTED_ONLY
    mitigation: "No content was read and no execution occurred; future content review or execution requires HumanGate authorization."
  - risk: "Classification is based on one filename only."
    surface: "inference"
    status: DOCUMENTED_ONLY
    mitigation: "Classification remains candidate-only with explicit HumanGate questions."
  - risk: "Sandbox setup failed, requiring escalated PowerShell for read-only checks."
    surface: "roadmap_docs_only"
    status: DOCUMENTED_ONLY
    mitigation: "Commands were limited to explicit path checks, source reads, allowed top-level scripts inventory, report creation, and readback validation."
locked_actions:
  file_move: BLOCKED
  file_delete: BLOCKED
  file_rename: BLOCKED
  file_copy: BLOCKED
  recursive_scan: BLOCKED
  content_read: BLOCKED
  script_execution: BLOCKED
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
  - "Verify the report inspected only scripts top-level."
  - "Verify no script contents were read."
  - "Verify no scripts were executed."
  - "Verify no secrets were accessed."
  - "Verify the initial classifications make sense."
  - "Verify the next recommended audit slice is acceptable."
  - "Verify no cleanup or file moves happened."
```
