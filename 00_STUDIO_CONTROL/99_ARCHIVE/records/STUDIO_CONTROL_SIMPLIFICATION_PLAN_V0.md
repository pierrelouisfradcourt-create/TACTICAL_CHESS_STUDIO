# STUDIO CONTROL SIMPLIFICATION PLAN V0

task_id: DOCS-STUDIO-CONTROL-SIMPLIFICATION-PLAN-001
mode: CODEX READ-ONLY STUDIO CONTROL SIMPLIFICATION / REHOME PLAN
status: DOCUMENTED_ONLY
surface: artifacts_runtime_outputs
owner: HumanGate
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true

## codex_runtime

requested_model: gpt-5.5
requested_reasoning_effort: high
actual_runtime: UNKNOWN
runtime_status: BLOCKED
report_actual_runtime: true

Runtime note: actual model identifier is not exposed as verifiable task evidence in this report. Per task policy, unknown runtime status is BLOCKED. This report makes no model capability claim.

## executive_summary

The current `00_STUDIO_CONTROL` visible tree is fragmented across many numbered top-level folders. The target simplification is to retain the numbered Studio Control root while reducing the human-visible conceptual surfaces to:

- `00_STUDIO_CONTROL/00_MASTER_DOCS/`
- `00_STUDIO_CONTROL/01_SYSTEM/`
- `00_STUDIO_CONTROL/02_PIPELINE/`
- `00_STUDIO_CONTROL/99_ARCHIVE/`

This report is an exact migration plan only. No file move, file edit to existing files, deletion, rename, archive creation, registry update, source-index update, upload-checklist update, commit, push, branch, or PR was performed.

## preflight

- pwd: `C:\TACTICAL_CHESS_STUDIO`
- git_root: `C:/TACTICAL_CHESS_STUDIO`
- branch: `master`
- HEAD: `991dbf79f54da392f1ae45100a1dbfe5f9a05762`
- git_status_short_branch:

```text
## master...origin/master
?? 00_STUDIO_CONTROL/05_STATUS/DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md
?? 00_STUDIO_CONTROL/05_STATUS/MAIN_DOCS_CONSOLIDATION_PLAN_V0.md
?? scripts/uxpilote/
```

Pre-existing changed files before this report:

- `00_STUDIO_CONTROL/05_STATUS/DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md`: untracked, pre-existing.
- `00_STUDIO_CONTROL/05_STATUS/MAIN_DOCS_CONSOLIDATION_PLAN_V0.md`: untracked, pre-existing.
- `scripts/uxpilote/`: untracked, pre-existing, UNKNOWN and uninspected.

## source_state

created:

- `00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md`

registered:

- Not registered by this task.
- `00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml` was read as context only.

loaded:

- `AGENTS.md`
- `README.md`
- `MASTER_DOCS/DOCS_STATUS.md`
- `MASTER_DOCS/CURRENT_STATE_INDEX.md`
- `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md`
- `MASTER_DOCS/00_EXEC_SUMMARY.md`
- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`
- `00_STUDIO_CONTROL/05_STATUS/DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md`
- `00_STUDIO_CONTROL/05_STATUS/MAIN_DOCS_CONSOLIDATION_PLAN_V0.md`
- `00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml`
- `docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md`
- `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
- `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md`
- `00_STUDIO_CONTROL/11_PIPELINE_CORE/PIPELINE_CORE_INDEX.md`
- `00_STUDIO_CONTROL/11_PIPELINE_CORE/READ_FIRST_PIPELINE.md`
- `00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY/LEGACY_NOTICE.md`
- `00_STUDIO_CONTROL/13_BOOTSTRAP_PROFILES/PROFILE_INDEX.md`
- `00_STUDIO_CONTROL/13_BOOTSTRAP_PROFILES/KENPACHI/PIPELINE_OPENING_CHECKLIST.md`

enforced:

- Output route restricted to `00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md`.
- Existing file edits blocked.
- File moves, deletes, renames, physical archive creation, registration, source-index update, upload-checklist update, runtime execution, tests, benchmark, training, dataset actions, model actions, Git actions, and PR actions blocked.
- `scripts/uxpilote` kept UNKNOWN and uninspected.

evidenced:

- Git preflight captured.
- Required sources read.
- Inventories captured for `MASTER_DOCS/**`, `00_STUDIO_CONTROL/**`, `docs/gpt-navigator/**`, root docs/text/html/requirements surfaces.
- Old-path reference candidates found with `rg -l`.
- Report readback and token validation planned.

Source anchoring rule preserved:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

## route_check

- produced_file_type: read_only_studio_control_simplification_plan
- intended_surface: artifacts_runtime_outputs
- actual_destination: `00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md`
- temporary_destination: `00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md`
- future_destination_after_apply: `00_STUDIO_CONTROL/99_ARCHIVE/records/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md`
- promotion_gate: HumanGate
- registration_required: false
- project_source_upload_required: false

## output_routing_result

DOCUMENTED_ONLY report created at the requested temporary/status destination. Future rehome destination is planned only and was not created.

## current_tree_problem

Current `00_STUDIO_CONTROL` exposes too many top-level conceptual surfaces:

- `00_INDEX`
- `01_MAPS`
- `02_NAVIGATION`
- `03_REGISTRIES`
- `04_BOUNDARIES`
- `05_STATUS`
- `06_CODEX`
- `07_FORMS`
- `08_MIGRATION`
- `09_CYBERDEFENSE`
- `09_RAG`
- `10_ROADMAP`
- `11_PIPELINE_CORE`
- `12_PIPELINE_OPENING_LEGACY`
- `13_BOOTSTRAP_PROFILES`

The fragmentation makes status reports, roadmap queues, system machinery, and active pipeline files appear as peer navigation surfaces. The target plan restores a PureLab-like readable center while preserving source-state, registry, boundary, and HumanGate discipline.

## target_tree

```text
00_STUDIO_CONTROL/
  00_MASTER_DOCS/
  01_SYSTEM/
    index/
    maps/
    navigation/
    registries/
    boundaries/
    codex/
    forms/
    cyberdefense/
    rag/
  02_PIPELINE/
    core/
    bootstrap/        # only if HumanGate keeps bootstrap profiles active
  99_ARCHIVE/
    records/
    plans/
    migration/
    legacy_pipeline/
    bootstrap/        # only if HumanGate demotes bootstrap profiles
```

## exact_move_plan

No moves performed. Proposed later mappings:

| old path | proposed new path | classification |
| --- | --- | --- |
| `MASTER_DOCS/**` | `00_STUDIO_CONTROL/00_MASTER_DOCS/**` | MOVE_TO_00_MASTER_DOCS_CANDIDATE / KEEP_MASTER_DOCS |
| `00_STUDIO_CONTROL/00_INDEX/**` | `00_STUDIO_CONTROL/01_SYSTEM/index/**` | MOVE_TO_01_SYSTEM_CANDIDATE |
| `00_STUDIO_CONTROL/01_MAPS/**` | `00_STUDIO_CONTROL/01_SYSTEM/maps/**` | MOVE_TO_01_SYSTEM_CANDIDATE |
| `00_STUDIO_CONTROL/02_NAVIGATION/**` | `00_STUDIO_CONTROL/01_SYSTEM/navigation/**` | MOVE_TO_01_SYSTEM_CANDIDATE |
| `00_STUDIO_CONTROL/03_REGISTRIES/**` | `00_STUDIO_CONTROL/01_SYSTEM/registries/**` | MOVE_TO_01_SYSTEM_CANDIDATE |
| `00_STUDIO_CONTROL/04_BOUNDARIES/**` | `00_STUDIO_CONTROL/01_SYSTEM/boundaries/**` | MOVE_TO_01_SYSTEM_CANDIDATE |
| `00_STUDIO_CONTROL/06_CODEX/**` | `00_STUDIO_CONTROL/01_SYSTEM/codex/**` | MOVE_TO_01_SYSTEM_CANDIDATE |
| `00_STUDIO_CONTROL/07_FORMS/**` | `00_STUDIO_CONTROL/01_SYSTEM/forms/**` | MOVE_TO_01_SYSTEM_CANDIDATE |
| `00_STUDIO_CONTROL/09_CYBERDEFENSE/**` | `00_STUDIO_CONTROL/01_SYSTEM/cyberdefense/**` | MOVE_TO_01_SYSTEM_CANDIDATE |
| `00_STUDIO_CONTROL/09_RAG/**` | `00_STUDIO_CONTROL/01_SYSTEM/rag/**` | MOVE_TO_01_SYSTEM_CANDIDATE |
| `00_STUDIO_CONTROL/11_PIPELINE_CORE/**` | `00_STUDIO_CONTROL/02_PIPELINE/core/**` | MOVE_TO_02_PIPELINE_CANDIDATE / ACTIVE_PIPELINE |
| `00_STUDIO_CONTROL/05_STATUS/**` | `00_STUDIO_CONTROL/99_ARCHIVE/records/**` | MOVE_TO_99_ARCHIVE_CANDIDATE / PASSIVE_RECORD |
| `00_STUDIO_CONTROL/10_ROADMAP/**` | `00_STUDIO_CONTROL/99_ARCHIVE/plans/**` | MOVE_TO_99_ARCHIVE_CANDIDATE / PASSIVE_PLAN |
| `00_STUDIO_CONTROL/08_MIGRATION/**` | `00_STUDIO_CONTROL/99_ARCHIVE/migration/**` | MOVE_TO_99_ARCHIVE_CANDIDATE / PASSIVE_RECORD |
| `00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY/**` | `00_STUDIO_CONTROL/99_ARCHIVE/legacy_pipeline/**` | MOVE_TO_99_ARCHIVE_CANDIDATE / PASSIVE_RECORD |
| `00_STUDIO_CONTROL/13_BOOTSTRAP_PROFILES/PROFILE_INDEX.md` | `00_STUDIO_CONTROL/02_PIPELINE/bootstrap/PROFILE_INDEX.md` or `00_STUDIO_CONTROL/99_ARCHIVE/bootstrap/PROFILE_INDEX.md` | AMBIGUOUS_REQUIRES_HUMANGATE |
| `00_STUDIO_CONTROL/13_BOOTSTRAP_PROFILES/KENPACHI/PIPELINE_OPENING_CHECKLIST.md` | `00_STUDIO_CONTROL/02_PIPELINE/bootstrap/KENPACHI/PIPELINE_OPENING_CHECKLIST.md` or `00_STUDIO_CONTROL/99_ARCHIVE/bootstrap/KENPACHI/PIPELINE_OPENING_CHECKLIST.md` | AMBIGUOUS_REQUIRES_HUMANGATE |

## exact_reference_update_candidates

Files containing old `MASTER_DOCS` or current `00_STUDIO_CONTROL` top-level path references that would need update in a later apply task:

```text
README.md
docs/gpt-navigator/GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md
docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md
docs/gpt-navigator/GPT_NAVIGATOR_REPO_NOTICE_V0.md
docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md
MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md
MASTER_DOCS/LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md
MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md
MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md
MASTER_DOCS/DOCS_STATUS.md
MASTER_DOCS/CURRENT_STATE_INDEX.md
MASTER_DOCS/AUTOMATION_LANE_MATRIX.md
MASTER_DOCS/05_ARCHITECTURE.md
MASTER_DOCS/03_KNOWN_ISSUES.md
MASTER_DOCS/02_ROADMAP_90D.md
MASTER_DOCS/01_CURRENT_STATE.md
MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md
MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md
MASTER_DOCS/07_PROJECT_HISTORY.md
MASTER_DOCS/06_DECISION_LOG.md
MASTER_DOCS/00_EXEC_SUMMARY.md
MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/V2_SOURCE_OF_TRUTH.md
MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/SOURCE_ARCHIVE_MAP.md
MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/PROJECT_HISTORY.md
MASTER_DOCS/ARCHIVE/CONTEXT/README.md
MASTER_DOCS/ARCHIVE/CONTEXT/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md
MASTER_DOCS/ARCHIVE/CONTEXT/AUTOBATTLER_RELECTURE_2026_04_26/00_INDEX.md
MASTER_DOCS/ARCHIVE/CONTEXT/17_PR_AGENT_TUTORIAL.md
MASTER_DOCS/ARCHIVE/CONTEXT/11_GPT55_BROWSER_REPRISE_PROMPT.md
MASTER_DOCS/ARCHIVE/CONTEXT/08_REPRISE_PROMPT.md
00_STUDIO_CONTROL/00_INDEX/READ_FIRST.md
00_STUDIO_CONTROL/01_MAPS/ARCHITECTURE_PLANS_INDEX.md
00_STUDIO_CONTROL/01_MAPS/PATH_CONTRACT.md
00_STUDIO_CONTROL/01_MAPS/STUDIO_AGENTIC_PYRAMID_ARCHITECTURE_V0.md
00_STUDIO_CONTROL/01_MAPS/STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md
00_STUDIO_CONTROL/01_MAPS/STUDIO_MAP.md
00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md
00_STUDIO_CONTROL/01_MAPS/SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md
00_STUDIO_CONTROL/01_MAPS/UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md
00_STUDIO_CONTROL/01_MAPS/UXPILOTE_AUDIT_CHAIN_CATALOG_V0.md
00_STUDIO_CONTROL/01_MAPS/UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0.md
00_STUDIO_CONTROL/01_MAPS/UXPILOTE_HUMANGATE_QUEUE_SPEC_V0.md
00_STUDIO_CONTROL/01_MAPS/UXPILOTE_READONLY_DATA_CONTRACT_V0.md
00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md
00_STUDIO_CONTROL/03_REGISTRIES/AGENT_REGISTRY.yaml
00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml
00_STUDIO_CONTROL/03_REGISTRIES/LOOP_REGISTRY.yaml
00_STUDIO_CONTROL/04_BOUNDARIES/CLAIMS_LEDGER.yaml
00_STUDIO_CONTROL/04_BOUNDARIES/REPO_HYGIENE.md
00_STUDIO_CONTROL/04_BOUNDARIES/STUDIO_HUMANGATE_DECISION_RECORD_V0.md
00_STUDIO_CONTROL/05_STATUS/*.md
00_STUDIO_CONTROL/05_STATUS/*.yaml
00_STUDIO_CONTROL/06_CODEX/TASK_CHARTER_ERROR_TO_PUZZLE_ONE_PASS_V0.yaml
00_STUDIO_CONTROL/07_FORMS/CODEX_FINAL_VALIDATION_TEMPLATE.yaml
00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml
00_STUDIO_CONTROL/07_FORMS/LOCAL_RAG_SOURCE_PACK_V0.md
00_STUDIO_CONTROL/07_FORMS/NEXT_STEP_PROPOSAL_TEMPLATE_V0.yaml
00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md
00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml
00_STUDIO_CONTROL/08_MIGRATION/*.md
00_STUDIO_CONTROL/09_RAG/RAG_INDEX_ROUTE_AND_BACKEND_POLICY_V0.md
00_STUDIO_CONTROL/10_ROADMAP/*.md
00_STUDIO_CONTROL/10_ROADMAP/*.yaml
00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_GODOT_GARDEN_CANDIDATE_ONLY/README.md
00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_GODOT_GARDEN_CANDIDATE_ONLY/scripts/GardenData.gd
00_STUDIO_CONTROL/11_PIPELINE_CORE/PIPELINE_CORE_INDEX.md
00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY/READ_FIRST_PIPELINE.md
```

The `00_STUDIO_CONTROL/05_STATUS/*.md`, `00_STUDIO_CONTROL/05_STATUS/*.yaml`, `00_STUDIO_CONTROL/10_ROADMAP/*.md`, and `00_STUDIO_CONTROL/10_ROADMAP/*.yaml` entries are grouped because the reference search returned many passive reports and roadmap records. A later apply task should use `rg -l` again immediately before editing.

## root_files_to_keep

| path | classification | reason |
| --- | --- | --- |
| `AGENTS.md` | KEEP_ROOT | Agent doctrine and repo rules. |
| `README.md` | KEEP_ROOT | Root entrypoint; references must be updated later if `MASTER_DOCS` is rehomed. |
| `SECURITY_BOUNDARY.md` | KEEP_ROOT | Root boundary document unless HumanGate separately mirrors it. |
| `THREAT_MODEL.md` | KEEP_ROOT | Root threat model unless HumanGate separately mirrors it. |
| `requirements.txt` | KEEP_ROOT | Root dependency manifest. |
| `requirements-control-plane.txt` | KEEP_ROOT | Root control-plane dependency manifest. |

## files_to_keep_outside_00_STUDIO_CONTROL

| path or surface | classification | reason |
| --- | --- | --- |
| `docs/gpt-navigator/**` | KEEP_OUTSIDE_STUDIO_CONTROL | ChatGPT Navigator project-source and upload workflow docs. References need later update. |
| `docs/control-plane/**` | KEEP_OUTSIDE_STUDIO_CONTROL | Repo-local control-plane reference docs, not part of this Studio Control rehome scope. |
| `docs/evidence/**` | KEEP_OUTSIDE_STUDIO_CONTROL | Evidence/protocol docs; not active implementation proof. |
| `docs/studioV2/**` | KEEP_OUTSIDE_STUDIO_CONTROL | Studio tooling docs outside requested Studio Control tree. |
| `lab/**` | KEEP_OUTSIDE_STUDIO_CONTROL | Lab outputs and generated evidence remain non-canonical/passive. |
| `AI_MEMORY/README.md` | KEEP_OUTSIDE_STUDIO_CONTROL | Separate memory workspace note. |
| `viewer.html` | KEEP_OUTSIDE_STUDIO_CONTROL | Runtime/viewer asset, not Studio Control documentation. |
| `ENGINE_SEARCH_NEURAL_SCAN.txt` | KEEP_OUTSIDE_STUDIO_CONTROL | Root passive scan unless separately routed. |
| `src/*.txt` | KEEP_OUTSIDE_STUDIO_CONTROL | Source-adjacent notes require separate source-specific review. |
| `ml/requirements.txt` | KEEP_OUTSIDE_STUDIO_CONTROL | ML dependency manifest. |

## ambiguous_cases

- `00_STUDIO_CONTROL/13_BOOTSTRAP_PROFILES/**`: AMBIGUOUS_REQUIRES_HUMANGATE. Readback says bootstrap profiles are machine-specific setup notes, separate from generic pipeline core. Kenpachi is preparation only, with machine availability still not present in the profile. It may belong under `02_PIPELINE/bootstrap/` if HumanGate treats machine bootstrap as active pipeline support, or under `99_ARCHIVE/bootstrap/` if HumanGate treats it as passive historical preparation.
- `MASTER_DOCS/CURRENT_STATE_INDEX.md`: KEEP_MASTER_DOCS candidate but contains historical stack material and duplicates current-state roles. Later apply task should rehome it with `MASTER_DOCS/**`, then optionally refresh or demote by separate HumanGate decision.
- `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md`: KEEP_MASTER_DOCS candidate and planning/reference authority until superseded. It should not be silently demoted by this plan.
- UxPilote roadmap/status docs: PASSIVE_PLAN or PASSIVE_RECORD depending on current folder. `scripts/uxpilote` remains UNKNOWN and uninspected.

## bootstrap_profiles_decision

Readback result:

- `PROFILE_INDEX.md` says bootstrap profiles contain machine-specific setup notes and are separate from generic pipeline core.
- `KENPACHI/PIPELINE_OPENING_CHECKLIST.md` says scope is machine bootstrap profile, not pipeline core; current PC package is preparation only; Kenpachi machine is not available yet.
- `11_PIPELINE_CORE/PIPELINE_CORE_INDEX.md` says bootstrap profiles are machine-specific and stored outside the generic core.

Decision: AMBIGUOUS_REQUIRES_HUMANGATE.

Recommended HumanGate choices:

- If machine bootstrap remains active support for pipeline use: move `13_BOOTSTRAP_PROFILES/**` to `00_STUDIO_CONTROL/02_PIPELINE/bootstrap/**`.
- If machine bootstrap is historical preparation only: move `13_BOOTSTRAP_PROFILES/**` to `00_STUDIO_CONTROL/99_ARCHIVE/bootstrap/**`.

No classification beyond this is evidenced by the readback.

## status_and_roadmap_demotion_logic

- `00_STUDIO_CONTROL/05_STATUS/**` should become `00_STUDIO_CONTROL/99_ARCHIVE/records/**` because status reports are passive records unless a narrow document is explicitly promoted later by HumanGate.
- `00_STUDIO_CONTROL/10_ROADMAP/**` should become `00_STUDIO_CONTROL/99_ARCHIVE/plans/**` because roadmap queues and candidate prototypes are passive plans, not active top-level navigation surfaces.
- `00_STUDIO_CONTROL/08_MIGRATION/**` should become `00_STUDIO_CONTROL/99_ARCHIVE/migration/**` because migration reports/runbooks are passive history unless a future migration task explicitly loads one.
- `00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY/**` should become `00_STUDIO_CONTROL/99_ARCHIVE/legacy_pipeline/**` because `LEGACY_NOTICE.md` marks it PASSIVE and says not to use it as active pipeline source.

## first_safe_apply_batch

BLOCKED_NO_ACTION in this task. Proposed later first apply batch:

1. Create only the four target folders and subfolders needed for moved content.
2. Move `MASTER_DOCS/**` to `00_STUDIO_CONTROL/00_MASTER_DOCS/**`.
3. Move `00_STUDIO_CONTROL/00_INDEX/**`, `01_MAPS/**`, `02_NAVIGATION/**`, `03_REGISTRIES/**`, `04_BOUNDARIES/**`, `06_CODEX/**`, `07_FORMS/**`, `09_CYBERDEFENSE/**`, and `09_RAG/**` into `00_STUDIO_CONTROL/01_SYSTEM/**`.
4. Move `00_STUDIO_CONTROL/11_PIPELINE_CORE/**` to `00_STUDIO_CONTROL/02_PIPELINE/core/**`.
5. Defer bootstrap profiles until HumanGate decides active pipeline bootstrap versus archive bootstrap.
6. Do not move `05_STATUS`, `10_ROADMAP`, `08_MIGRATION`, or `12_PIPELINE_OPENING_LEGACY` in the first batch unless the apply task is explicitly an archive rehome task.
7. Run reference updates only after moves and immediately rerun `rg -l` for old paths.

## rollback_plan

For a later apply task only:

- Use a manifest of every source and destination path before moving.
- Move files back from proposed destination to original path if validation fails.
- Restore references from the pre-apply diff if path update validation fails.
- Do not use `git reset --hard` or `git clean`.
- Do not delete empty directories unless HumanGate explicitly authorizes cleanup.

## HumanGate_decision_queue

1. Approve or reject the target four-surface tree.
2. Decide whether `MASTER_DOCS/**` should be physically rehomed under `00_STUDIO_CONTROL/00_MASTER_DOCS/**` or mirrored with root pointers first.
3. Decide whether bootstrap profiles go to `02_PIPELINE/bootstrap/**` or `99_ARCHIVE/bootstrap/**`.
4. Decide whether `05_STATUS/**`, `10_ROADMAP/**`, `08_MIGRATION/**`, and `12_PIPELINE_OPENING_LEGACY/**` should be moved in the same apply task or a later archive-only task.
5. Decide whether `docs/gpt-navigator/**` references should be updated in the same apply task.
6. Decide whether `FILE_REGISTRY.yaml`, source index, and upload checklist updates are authorized after physical moves.
7. Decide whether this plan remains unregistered passive evidence or becomes registered passive status evidence.

## blocked_actions

```yaml
file_moves: BLOCKED
file_edits_to_existing_files: BLOCKED
file_deletes: BLOCKED
file_renames: BLOCKED
physical_archive_creation: BLOCKED
registry_update: BLOCKED
source_index_update: BLOCKED
upload_checklist_update: BLOCKED
scripts_uxpilote_inspection: BLOCKED
runtime_execution: BLOCKED
tests: BLOCKED
benchmark: BLOCKED
training: BLOCKED
dataset_generation: BLOCKED
dataset_reset: BLOCKED
model_or_checkpoint_creation: BLOCKED
model_promotion: BLOCKED
rag_indexing: BLOCKED
embedding_generation: BLOCKED
vector_database_creation: BLOCKED
llm_model_call: BLOCKED
commit: BLOCKED
push: BLOCKED
branch_creation: BLOCKED
pull_request_creation: BLOCKED
```

## files_changed

created:

- `00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md`

modified:

- none

moved:

- none

deleted:

- none

renamed:

- none

archived:

- none

registry/source-index/upload-checklist updates:

- none

## commands_run

```text
Get-Location
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --short --branch
Get-Content AGENTS.md
Get-Content README.md
Get-Content MASTER_DOCS\DOCS_STATUS.md
Get-Content MASTER_DOCS\CURRENT_STATE_INDEX.md
Get-Content MASTER_DOCS\DOC_ARCHIVE_DEMOTION_MAP.md
Get-Content MASTER_DOCS\00_EXEC_SUMMARY.md
Get-Content MASTER_DOCS\01_CURRENT_STATE.md
Get-Content MASTER_DOCS\05_ARCHITECTURE.md
Get-Content 00_STUDIO_CONTROL\05_STATUS\DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md
Get-Content 00_STUDIO_CONTROL\05_STATUS\MAIN_DOCS_CONSOLIDATION_PLAN_V0.md
Get-Content 00_STUDIO_CONTROL\03_REGISTRIES\FILE_REGISTRY.yaml
Get-Content docs\gpt-navigator\GPT_NAVIGATOR_SOURCE_INDEX_V0.md
Get-Content docs\gpt-navigator\GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md
Get-Content 00_STUDIO_CONTROL\01_MAPS\STUDIO_OUTPUT_ROUTING_POLICY_V0.md
Get-Content 00_STUDIO_CONTROL\02_NAVIGATION\STUDIO_SOURCE_ANCHORING_V0.md
rg --files MASTER_DOCS
rg --files 00_STUDIO_CONTROL
rg --files docs\gpt-navigator
rg --files -g "*.md" -g "*.txt" -g "*.html" -g "requirements*"
rg -n "00_STUDIO_CONTROL/(00_INDEX|01_MAPS|02_NAVIGATION|03_REGISTRIES|04_BOUNDARIES|05_STATUS|06_CODEX|07_FORMS|08_MIGRATION|09_CYBERDEFENSE|09_RAG|10_ROADMAP|11_PIPELINE_CORE|12_PIPELINE_OPENING_LEGACY|13_BOOTSTRAP_PROFILES)|00_STUDIO_CONTROL\\(00_INDEX|01_MAPS|02_NAVIGATION|03_REGISTRIES|04_BOUNDARIES|05_STATUS|06_CODEX|07_FORMS|08_MIGRATION|09_CYBERDEFENSE|09_RAG|10_ROADMAP|11_PIPELINE_CORE|12_PIPELINE_OPENING_LEGACY|13_BOOTSTRAP_PROFILES)|MASTER_DOCS/|MASTER_DOCS\\" AGENTS.md README.md MASTER_DOCS 00_STUDIO_CONTROL docs\gpt-navigator
rg -l "00_STUDIO_CONTROL/(00_INDEX|01_MAPS|02_NAVIGATION|03_REGISTRIES|04_BOUNDARIES|05_STATUS|06_CODEX|07_FORMS|08_MIGRATION|09_CYBERDEFENSE|09_RAG|10_ROADMAP|11_PIPELINE_CORE|12_PIPELINE_OPENING_LEGACY|13_BOOTSTRAP_PROFILES)|00_STUDIO_CONTROL\\(00_INDEX|01_MAPS|02_NAVIGATION|03_REGISTRIES|04_BOUNDARIES|05_STATUS|06_CODEX|07_FORMS|08_MIGRATION|09_CYBERDEFENSE|09_RAG|10_ROADMAP|11_PIPELINE_CORE|12_PIPELINE_OPENING_LEGACY|13_BOOTSTRAP_PROFILES)|MASTER_DOCS/|MASTER_DOCS\\" AGENTS.md README.md MASTER_DOCS 00_STUDIO_CONTROL docs\gpt-navigator
Get-Content 00_STUDIO_CONTROL\13_BOOTSTRAP_PROFILES\PROFILE_INDEX.md
Get-Content 00_STUDIO_CONTROL\13_BOOTSTRAP_PROFILES\KENPACHI\PIPELINE_OPENING_CHECKLIST.md
Get-Content 00_STUDIO_CONTROL\11_PIPELINE_CORE\PIPELINE_CORE_INDEX.md
Get-Content 00_STUDIO_CONTROL\11_PIPELINE_CORE\READ_FIRST_PIPELINE.md
Get-Content 00_STUDIO_CONTROL\12_PIPELINE_OPENING_LEGACY\LEGACY_NOTICE.md
Test-Path 00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md
Get-Content 00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md -TotalCount 120
Select-String 00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md -Pattern "00_MASTER_DOCS|01_SYSTEM|02_PIPELINE|99_ARCHIVE|exact_move_plan|reference_update|bootstrap|UNKNOWN|NO_CLAIM_ALLOWED|no_global_ready_verdict"
git diff --check
git status --short --branch
```

## validation

- `Test-Path 00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md`: PASS, returned `True`.
- `Get-Content 00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md -TotalCount 120`: PASS, readback showed report header, runtime block, executive summary, preflight, source state, route check, and output routing result.
- `Select-String ... -Pattern "00_MASTER_DOCS|01_SYSTEM|02_PIPELINE|99_ARCHIVE|exact_move_plan|reference_update|bootstrap|UNKNOWN|NO_CLAIM_ALLOWED|no_global_ready_verdict"`: PASS, required target tree, move-plan, reference-update, bootstrap, UNKNOWN, claim, and no-global-ready tokens found.
- `git diff --check`: PASS, no whitespace errors reported.
- `git status --short --branch`: PASS, showed this new untracked report plus pre-existing untracked files.

```text
## master...origin/master
?? 00_STUDIO_CONTROL/05_STATUS/DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md
?? 00_STUDIO_CONTROL/05_STATUS/MAIN_DOCS_CONSOLIDATION_PLAN_V0.md
?? 00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_SIMPLIFICATION_PLAN_V0.md
?? scripts/uxpilote/
```

## skipped_validation

- Runtime commands: BLOCKED by task scope.
- Tests: BLOCKED by task scope.
- Benchmarks: BLOCKED by task scope.
- Training: BLOCKED by task scope.
- RAG indexing, embeddings, vector DB, and LLM/model calls: BLOCKED by task scope.
- Dataset commands and dataset reset: BLOCKED by task scope.
- `scripts/uxpilote` inspection: BLOCKED by task scope; status remains UNKNOWN.
- Registry/source-index/upload-checklist validation as edited files: BLOCKED because no such edits were authorized.
- Physical archive validation: BLOCKED because no archive or move was authorized.

## risks

- `00_STUDIO_CONTROL/05_STATUS/**` and `00_STUDIO_CONTROL/10_ROADMAP/**` can look authoritative if left as top-level conceptual surfaces.
- Moving `MASTER_DOCS/**` will break read-first references unless references are updated in the same apply task.
- `docs/gpt-navigator/**` contains many absolute Studio Control references and must be updated after any physical rehome.
- `FILE_REGISTRY.yaml` contains absolute paths; any physical migration requires explicit registry update authorization.
- Bootstrap profiles are ambiguous and should not be silently archived or promoted.
- `scripts/uxpilote` remains UNKNOWN and uninspected.

## status_by_surface

| surface | status | note |
| --- | --- | --- |
| active_runtime_code | PASSIVE | not inspected or changed |
| tests | PASSIVE | not run or changed |
| artifacts_runtime_outputs | DOCUMENTED_ONLY | this report only |
| canonical_docs | PASSIVE | read-only context |
| roadmap_docs_only | PASSIVE | planned demotion only |
| inference | PASSIVE | no inference/model action |
| scripts_uxpilote | UNKNOWN | uninspected and out of scope |

## software_verdict

```yaml
active_runtime_code: PASSIVE
tests: PASSIVE
artifacts_runtime_outputs: DOCUMENTED_ONLY
canonical_docs: PASSIVE
roadmap_docs_only: PASSIVE
inference: PASSIVE
scripts_uxpilote: UNKNOWN
```

## evidence_verdict

```yaml
active_runtime_code: PASSIVE
tests: PASSIVE
artifacts_runtime_outputs: DOCUMENTED_ONLY
canonical_docs: PASSIVE
roadmap_docs_only: PASSIVE
inference: PASSIVE
scripts_uxpilote: UNKNOWN
```

## claim_verdict

NO_CLAIM_ALLOWED

## no_global_ready_verdict

true
