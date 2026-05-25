# UxPilote Studio Garden Top-Level Read-Only Inventory V0

Task ID: UXPILOTE-STUDIO-GARDEN-TOPLEVEL-READONLY-INVENTORY-V0

## Status and authority

- Status: DOCUMENTED_ONLY
- Surface: roadmap_docs_only
- Runtime authority: NONE
- Claim posture: NO_CLAIM_ALLOWED
- Owner authority: HumanGate
- Human gate required: true

This report is a routed roadmap-only read-only inventory result. It records only first-level entries observed under `C:/TACTICAL_CHESS_STUDIO`. It does not authorize file movement, file deletion, file rename, file copy, recursive scan, repo scan, runtime change, Godot execution, Git activity, training, benchmark, dataset generation, model creation, model promotion, agent activation, Chess960 activation, DecisionController activation, or any global ready claim.

## Purpose

Create the first real truth return for the Studio Garden root by listing and initially classifying only top-level entries under:

```text
C:/TACTICAL_CHESS_STUDIO
```

The purpose is to ground future HumanGate decisions in observed top-level filesystem truth while preserving the rule that TacticalChessPureLab is one component inside the garden, not the root.

## Inventory scope

- Only top-level entries under `C:/TACTICAL_CHESS_STUDIO`.
- No recursive scan.
- No PureLab content inspection.
- No file moves.
- No child-directory contents inspected.
- No size calculation, hash calculation, Git command, Godot command, test command, benchmark, training, dataset generation, or model/checkpoint action.

## Command used

```powershell
Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO' -Force | Select-Object Name, FullName, PSIsContainer, LastWriteTime
```

Constraints enforced:

- `-Recurse` was not used.
- `Get-ChildItem` was not run on child directories.
- TacticalChessPureLab repo contents were not inspected.
- The only write was this routed roadmap report.

## Top-level entries

| name | path | is_directory | last_write_time | initial_classification | evidence_type | HumanGate question |
| --- | --- | --- | --- | --- | --- | --- |
| `.git` | `C:/TACTICAL_CHESS_STUDIO/.git` | true | 2026-05-22 13:30:33 | unknown_or_legacy_slice | top-level metadata only | Should the garden root Git metadata be treated as a studio wrapper concern, ignored for inventory, or handled by a separate Git-authorized task? |
| `00_STUDIO_CONTROL` | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL` | true | 2026-05-17 17:57:43 | studio_control_slice | top-level name plus loaded routing/source docs | Should the next narrow slice inventory only the immediate Studio Control topology, or stay at roadmap report review first? |
| `archives` | `C:/TACTICAL_CHESS_STUDIO/archives` | true | 2026-05-16 13:09:08 | archives_slice | top-level name only | Is this the intended Archive Zone root, and should a later audit list only its immediate children? |
| `datasets` | `C:/TACTICAL_CHESS_STUDIO/datasets` | true | 2026-05-16 13:09:08 | unknown_or_legacy_slice | top-level name only | Is this an inactive artifact surface, a blocked dataset zone, or legacy material requiring a separate read-only audit? |
| `document_work` | `C:/TACTICAL_CHESS_STUDIO/document_work` | true | 2026-05-20 19:40:04 | unknown_or_legacy_slice | top-level name only | Is this temporary document work, canonical candidate material, or a scratch area that should remain out of authority? |
| `inbox_import_quarantine` | `C:/TACTICAL_CHESS_STUDIO/inbox_import_quarantine` | true | 2026-05-16 11:26:01 | unknown_or_legacy_slice | top-level name only | Is this a quarantine/intake holding area, and what read-only evidence is allowed before any classification changes? |
| `local_backups_optional` | `C:/TACTICAL_CHESS_STUDIO/local_backups_optional` | true | 2026-05-20 21:21:45 | archive_or_backup_candidate | top-level name only | Should this be treated as backup evidence, excluded from ordinary audits, or inspected in a backup-specific read-only slice? |
| `models` | `C:/TACTICAL_CHESS_STUDIO/models` | true | 2026-05-20 21:21:45 | unknown_or_legacy_slice | top-level name only | Is this a blocked model/checkpoint zone, legacy placeholder, or passive storage requiring a separate HumanGate task? |
| `outputs` | `C:/TACTICAL_CHESS_STUDIO/outputs` | true | 2026-05-20 18:20:56 | unknown_or_legacy_slice | top-level name only | Is this a passive artifact-output surface, temporary output area, or legacy folder that should not be interpreted yet? |
| `repos` | `C:/TACTICAL_CHESS_STUDIO/repos` | true | 2026-05-16 13:09:08 | repos_slice | top-level name plus loaded PureLab-root distinction | Should the next repo slice remain top-level-only, with PureLab contents still excluded until a separate task? |
| `runs` | `C:/TACTICAL_CHESS_STUDIO/runs` | true | 2026-05-16 13:09:08 | unknown_or_legacy_slice | top-level name only | Is this a blocked run-artifact zone, legacy folder, or passive surface requiring a separate artifact audit? |
| `runtime_outputs` | `C:/TACTICAL_CHESS_STUDIO/runtime_outputs` | true | 2026-05-20 21:21:36 | unknown_or_legacy_slice | top-level name only | Is this the intended artifacts_runtime_outputs root, and should it be audited separately without opening generated run content? |
| `scripts` | `C:/TACTICAL_CHESS_STUDIO/scripts` | true | 2026-05-20 18:23:59 | unknown_or_legacy_slice | top-level name only | Are these local tooling scripts, passive support files, or blocked execution material needing a tool-zone audit? |
| `secrets` | `C:/TACTICAL_CHESS_STUDIO/secrets` | true | 2026-05-18 01:02:10 | unknown_or_legacy_slice | top-level name only | Should this be marked blocked_do_not_touch except under a security-specific HumanGate task? |
| `tmp` | `C:/TACTICAL_CHESS_STUDIO/tmp` | true | 2026-05-19 16:25:15 | unknown_or_legacy_slice | top-level name only | Is this disposable scratch material, preserved evidence, or a temporary area excluded from authority? |
| `tools` | `C:/TACTICAL_CHESS_STUDIO/tools` | true | 2026-05-20 21:20:30 | tools_slice | top-level name only | Is this the intended Tool Zone root, and should a later audit list only immediate children first? |
| `.gitignore` | `C:/TACTICAL_CHESS_STUDIO/.gitignore` | false | 2026-05-20 18:41:55 | unknown_or_legacy_slice | top-level file metadata only | Should root-level control files be inventoried in a separate root-file slice, with Git commands still blocked? |

## Initial classification

| classification | entries | basis |
| --- | --- | --- |
| studio_control_slice | `00_STUDIO_CONTROL` | Explicit Studio Control root and loaded routing/source anchors. |
| repos_slice | `repos` | Top-level repo container; PureLab remains excluded from content inspection. |
| tools_slice | `tools` | Name matches likely tool zone. No child contents inspected. |
| archives_slice | `archives` | Name matches likely archive zone. No archive action authorized. |
| build_zone_slice | none observed | No top-level `build` or `builds` entry observed. |
| godot_candidate_slice_or_tool_zone | none observed | No top-level `godot` entry observed. Godot candidate files were not touched. |
| archive_or_backup_candidate | `local_backups_optional` | Name suggests backup candidate; no contents inspected. |
| unknown_or_legacy_slice | `.git`, `datasets`, `document_work`, `inbox_import_quarantine`, `models`, `outputs`, `runs`, `runtime_outputs`, `scripts`, `secrets`, `tmp`, `.gitignore` | Name-only evidence was insufficient for stronger classification. |

## Unknowns and HumanGate questions

- Should `.git` and `.gitignore` be included in future garden inventory, or excluded unless a Git-authorized task is opened?
- Should `datasets`, `models`, `runs`, `outputs`, and `runtime_outputs` be treated as blocked artifact surfaces until a dedicated artifact audit exists?
- Should `secrets` be marked blocked_do_not_touch by default?
- Is `document_work` a temporary authoring surface, roadmap-only surface, or candidate extraction source?
- Is `inbox_import_quarantine` an intake/quarantine zone with stricter read rules?
- Should `scripts` be grouped with `tools_slice`, or treated as execution material requiring a separate tool-zone boundary review?
- Should the next audit inspect only immediate children of `00_STUDIO_CONTROL`, or only immediate children of `tools` and `archives`?

## What was not inspected

- No child directory contents were inspected.
- No TacticalChessPureLab repo contents were inspected.
- No files under `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab` were read, listed, modified, copied, moved, renamed, deleted, or executed.
- No Godot `.gd` or `.tscn` files were inspected or modified.
- No file hashes, sizes, recursive counts, dependency graphs, Git status, Git history, tests, builds, benchmarks, training, datasets, run folders, manifests, models, or checkpoints were inspected or generated.

## Blocked actions

```yaml
file_move: BLOCKED
file_delete: BLOCKED
file_rename: BLOCKED
file_copy: BLOCKED
recursive_scan: BLOCKED
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

Recommended narrow next slices for HumanGate review:

1. `00_STUDIO_CONTROL` immediate-children topology read-only slice only, with no recursive scan and no file content reads unless explicitly listed.
2. `tools` and `archives` immediate-children read-only slice, run as separate bounded tasks or one tightly scoped two-root inventory, with no tool launch and no archive action.

Do not start with `repos` or TacticalChessPureLab contents unless a separate PureLab-specific read-only task authorizes that scope.

## Status by surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Not inspected, modified, executed, or authorized. |
| tests | PASSIVE | Not inspected, modified, or run. |
| artifacts_runtime_outputs | PASSIVE | Top-level artifact-like names were observed only as names; no artifact contents inspected or generated. |
| canonical_docs | PASSIVE | Source anchors and templates were read as reference only; no canonical docs were modified. |
| roadmap_docs_only | DOCUMENTED_ONLY | This routed inventory report was created as the only output. |
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

Evidence is limited to explicit source readback, the allowed top-level `Get-ChildItem` inventory command, this report write, and docs-only report validation. It does not include recursive filesystem evidence, PureLab evidence, Godot evidence, Git evidence, runtime evidence, test evidence, benchmark evidence, dataset evidence, model evidence, or checkpoint evidence.

## Claim verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

Claim posture remains `NO_CLAIM_ALLOWED`. This report claims only that a top-level read-only inventory was performed and documented under the routed roadmap destination.

## No global ready verdict

no_global_ready_verdict: true

No global ready or not-ready verdict is made. Verdicts are split by surface only.

## Executor report

```yaml
record_type: "executor_report_output"
contract_version: "V0"
language: "English"
task_id: "UXPILOTE-STUDIO-GARDEN-TOPLEVEL-READONLY-INVENTORY-V0"
created_by: "Codex bounded local executor"
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
preflight:
  current_directory: "C:/TACTICAL_CHESS_STUDIO"
  studio_root_exists: DOCUMENTED_ONLY
  studio_control_exists: DOCUMENTED_ONLY
  roadmap_dir_exists: DOCUMENTED_ONLY
  target_report_existed_before_write: NOT_FOUND
  output_routing_ambiguous: false
  purelab_content_inspection_required: false
  recursive_scan_required: false
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
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_READONLY_INVENTORY_PLAN_V0.md"
    created: DOCUMENTED_ONLY
    registered: DOCUMENTED_ONLY
    loaded: DOCUMENTED_ONLY
    enforced: DOCUMENTED_ONLY
    evidenced: DOCUMENTED_ONLY
  - source: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_PURELAB_REINTEGRATION_MAP_V0.md"
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
  produced_file_type: "Read-only top-level inventory report for the Studio Garden"
  intended_surface: "roadmap_docs_only"
  canonical_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_TOPLEVEL_READONLY_INVENTORY_V0.md"
  temporary_destination: ""
  actual_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_TOPLEVEL_READONLY_INVENTORY_V0.md"
  registration_required: false
  project_source_upload_required: false
  promotion_gate: "HumanGate"
files_changed:
  - path: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_TOPLEVEL_READONLY_INVENTORY_V0.md"
    surface: "roadmap_docs_only"
    change_status: DOCUMENTED_ONLY
    operation: "create"
    summary: "Created routed top-level read-only Studio Garden inventory report."
files_not_touched:
  - "C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/**"
  - "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_GODOT_GARDEN_CANDIDATE_ONLY/**"
commands_run:
  - command: "Get-Location"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Report current directory."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "Returned C:/TACTICAL_CHESS_STUDIO."
  - command: "Test-Path -LiteralPath 'C:/TACTICAL_CHESS_STUDIO'"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Verify studio root exists."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "True."
  - command: "Test-Path -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL'"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Verify Studio Control exists."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "True."
  - command: "Test-Path -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP'"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Verify roadmap destination exists."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "True."
  - command: "Test-Path -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_TOPLEVEL_READONLY_INVENTORY_V0.md'"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Verify whether target report existed before writing."
    surface: "roadmap_docs_only"
    result_status: NOT_FOUND
    evidence: "False before creation."
  - command: "Get-Content on explicitly listed source anchors, templates, inventory plan, and reintegration map"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "Load source state and routing constraints."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "All explicitly read source files returned content."
  - command: "Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO' -Force | Select-Object Name, FullName, PSIsContainer, LastWriteTime"
    working_directory: "C:/TACTICAL_CHESS_STUDIO"
    purpose: "List only top-level children of the Studio Garden root."
    surface: "roadmap_docs_only"
    result_status: DOCUMENTED_ONLY
    evidence: "Returned 17 first-level entries; no -Recurse used."
validation:
  status: DOCUMENTED_ONLY
  commands:
    - command: "Test-Path -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_TOPLEVEL_READONLY_INVENTORY_V0.md'"
      result_status: DOCUMENTED_ONLY
      evidence: "Target report exists after creation."
    - command: "Get-Content -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_TOPLEVEL_READONLY_INVENTORY_V0.md'"
      result_status: DOCUMENTED_ONLY
      evidence: "Target report readback completed."
    - command: "Select-String target report for required phrases"
      result_status: DOCUMENTED_ONLY
      evidence: "Required phrases checked: C:/TACTICAL_CHESS_STUDIO, top-level, no recursive scan, no PureLab content inspection, studio_control_slice, repos_slice, unknown_or_legacy_slice."
  readback_required: true
skipped_validation:
  - validation_item: "Verify no Godot .gd or .tscn files were modified using recursive scan or Git diff."
    surface: "roadmap_docs_only"
    status: BLOCKED
    reason: "Recursive scan and Git are explicitly forbidden. The task made no edits in Godot candidate paths."
  - validation_item: "Verify no TacticalChessPureLab repo files were modified or inspected using Git status or repo scan."
    surface: "roadmap_docs_only"
    status: BLOCKED
    reason: "Git and PureLab repo inspection are explicitly forbidden. No commands targeted the PureLab repo path."
risks:
  - risk: "Some classifications are based on top-level names only."
    surface: "inference"
    status: DOCUMENTED_ONLY
    mitigation: "Ambiguous entries were marked unknown_or_legacy_slice with HumanGate questions."
  - risk: "Sandbox setup failed, requiring escalated PowerShell for read-only checks."
    surface: "roadmap_docs_only"
    status: DOCUMENTED_ONLY
    mitigation: "Commands were limited to the explicit source reads, path checks, one top-level inventory command, and report validation."
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
```
