# MAIN DOCS CONSOLIDATION PLAN V0

task_id: MAIN-DOCS-CONSOLIDATION-PLAN-001
mode: CODEX DOCS-ONLY MAIN DOCS CONSOLIDATION PLAN
status: DOCUMENTED_ONLY
surface: artifacts_runtime_outputs
owner: HumanGate
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true

## Purpose

Create one master consolidation plan for main docs, roadmap docs, architecture docs, and archive candidates.

This plan does not move, delete, rename, archive, register, upload, promote, execute, test, benchmark, train, commit, push, or claim readiness. It is a HumanGate decision aid only.

## Preflight

- pwd: `C:\TACTICAL_CHESS_STUDIO`
- git_root: `C:/TACTICAL_CHESS_STUDIO`
- branch: `master`
- HEAD: `991dbf79f54da392f1ae45100a1dbfe5f9a05762`
- git_status_short_branch:

```text
## master...origin/master
?? scripts/uxpilote/
```

- pre_existing_changes:
  - `scripts/uxpilote/` is untracked and out of scope.
- scripts_uxpilote_status: UNKNOWN, uninspected.

## Source State

- created:
  - `00_STUDIO_CONTROL/05_STATUS/MAIN_DOCS_CONSOLIDATION_PLAN_V0.md`
- registered:
  - This plan is not registered by this task.
  - `FILE_REGISTRY.yaml` was read for existing routing and registration context only.
- loaded:
  - `AGENTS.md`
  - `MASTER_DOCS/DOCS_STATUS.md`
  - `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md`
  - `00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md`
  - `00_STUDIO_CONTROL/05_STATUS/DOCS_CLEANUP_FINAL_SYNC_CHECK_V0.md`
  - `00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml`
  - `docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md`
- evidenced:
  - Current `MASTER_DOCS` root file list read by `Get-ChildItem`.
  - Current `MASTER_DOCS/ARCHIVE` file list read by `Get-ChildItem`.
  - Current `docs/control-plane` file list read by `Get-ChildItem`.
  - Current `00_STUDIO_CONTROL/10_ROADMAP` file list read by `Get-ChildItem`.
- enforced:
  - Output route restricted to this status report.
  - No existing docs edited.
  - No physical archive action.
  - `scripts/uxpilote` kept UNKNOWN and uninspected.

Source anchoring rule preserved:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

## Route Check

- requested_output: `00_STUDIO_CONTROL/05_STATUS/MAIN_DOCS_CONSOLIDATION_PLAN_V0.md`
- output_routing_result: DOCUMENTED_ONLY report created at requested route.
- existing_docs_edit_result: BLOCKED_NO_ACTION
- physical_archive_result: BLOCKED_NO_ACTION
- registry_source_index_upload_checklist_result: BLOCKED_NO_ACTION
- scripts_uxpilote_result: UNKNOWN, uninspected.

## Classification Taxonomy

- KEEP_CANONICAL: read-first or authority-order docs that should remain active.
- KEEP_REFERENCE: useful context that should remain discoverable but not first authority.
- MERGE_CANDIDATE: overlapping docs that require a bounded HumanGate merge charter.
- ARCHIVE_CANDIDATE: stale/context docs that may be physically archived later by separate HumanGate action.
- ROADMAP_ONLY: future-direction docs that do not prove implementation or activation.
- PASSIVE_REPORT: audit/status/evidence records that do not become truth by existence.
- BLOCKED_NO_ACTION: surfaces where action is explicitly blocked in this plan.
- UNKNOWN: out-of-scope or uninspected surfaces.

## Canonical Keep List

Classification: KEEP_CANONICAL.

- `AGENTS.md`
- `README.md`
- `MASTER_DOCS/DOCS_STATUS.md`
- `MASTER_DOCS/00_EXEC_SUMMARY.md`
- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/02_COMMAND_CHEATSHEET.md`
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md`
- `00_STUDIO_CONTROL/00_INDEX/CONTROL_INDEX.md`
- `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
- `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md`
- `00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml`
- `00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md`
- `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md`
- `00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml`
- `00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml`
- `00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml`
- `00_STUDIO_CONTROL/10_ROADMAP/ROADMAP_INDEX.md`

Plan posture:

- Keep as active docs/navigation/control references.
- Do not collapse them into one file in this plan.
- Any rewrite requires a separate bounded docs task with readback and `git diff --check`.

## Reference-Only List

Classification: KEEP_REFERENCE.

- `MASTER_DOCS/06_DECISION_LOG.md`
- `MASTER_DOCS/07_PROJECT_HISTORY.md`
- `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
- `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md`
- `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md`
- `MASTER_DOCS/CURRENT_STATE_INDEX.md`
- `MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md`
- `MASTER_DOCS/LEARNING_TRACE_V1_STANDARD.md`
- `MASTER_DOCS/LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md`
- `docs/control-plane/README.md`
- `docs/control-plane/*CONTRACT*.md`
- `docs/control-plane/*POLICY*.md`
- `docs/control-plane/*MATRIX*.md`
- `docs/control-plane/*BOUNDARY*.md`
- `docs/control-plane/*PACKET*.md`
- `docs/control-plane/*SCHEMA*.md`
- `docs/evidence/*.md`
- `00_STUDIO_CONTROL/04_BOUNDARIES/*`
- `00_STUDIO_CONTROL/06_CODEX/*`
- `00_STUDIO_CONTROL/07_FORMS/*`
- `00_STUDIO_CONTROL/09_RAG/RAG_INDEX_ROUTE_AND_BACKEND_POLICY_V0.md`
- `00_STUDIO_CONTROL/11_PIPELINE_CORE/*`
- `00_STUDIO_CONTROL/13_BOOTSTRAP_PROFILES/*`

Plan posture:

- Keep discoverable.
- Do not use as first authority when a canonical keep doc or live source/test evidence conflicts.
- Treat hardcoded branch, SHA, local-stack, model, and implementation/test claims as historical until reverified.

## Merge Candidate Groups

Classification: MERGE_CANDIDATE. No merge performed.

| group | candidate docs | recommended consolidation shape | HumanGate decision needed |
| --- | --- | --- | --- |
| Current state and docs status | `MASTER_DOCS/DOCS_STATUS.md`, `MASTER_DOCS/00_EXEC_SUMMARY.md`, `MASTER_DOCS/01_CURRENT_STATE.md`, `MASTER_DOCS/CURRENT_STATE_INDEX.md`, `MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md` | Keep `DOCS_STATUS.md` as docs classification anchor; keep `01_CURRENT_STATE.md` as current summary; keep `CURRENT_STATE_INDEX.md` as navigation/reference unless separately refreshed. | Decide whether to refresh `CURRENT_STATE_INDEX.md` or keep it reference-only. |
| Architecture and roadmap doctrine | `MASTER_DOCS/05_ARCHITECTURE.md`, `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`, `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`, `MASTER_DOCS/02_ROADMAP_90D.md`, `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md` | Keep `05_ARCHITECTURE.md` canonical; demote AAA/Hybrid/90D/Rocky freeze to ROADMAP_ONLY unless code/test evidence supports a narrow claim. | Decide whether to create a one-page architecture-roadmap bridge. |
| Engine/search/neural roadmap family | `docs/control-plane/ENGINE_SEARCH_NEURAL_DECOMPOSITION_ROADMAP_V0.md`, `ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md`, `ENGINE_SEARCH_NEURAL_DECISION_ROUTING_CONTRACT_PLAN_V0.md`, `ENGINE_SEARCH_NEURAL_SPLIT_INVENTORY_GATE_PACKET_V0.md`, `ENGINE_SEARCH_NEURAL_POLICY_VALUE_PASSIVE_INTERFACE_DECISION_V0.md`, `ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` | Keep PP19 fusion as roadmap/reference entrypoint; keep earlier PP9-PP18 docs as supporting references. | Decide whether to add a short index pointer instead of merging content. |
| Automation and control-plane family | `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`, `MASTER_DOCS/AUTOMATION_*`, `docs/control-plane/*LOOP*`, `docs/control-plane/*REPORT*`, `00_STUDIO_CONTROL/11_PIPELINE_CORE/*`, `00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY/*` | Keep control-plane docs reference-only unless registered canonical; preserve legacy opening pipeline as passive. | Decide one active map and one legacy boundary note. |
| Archive/demotion family | `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md`, `MASTER_DOCS/ARCHIVE/**`, `00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md` | Keep demotion map as current proposal source; use this plan as follow-up queue. | Decide whether this plan supersedes or complements the demotion map. |
| UxPilote docs family | `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_*`, `00_STUDIO_CONTROL/05_STATUS/UXPILOTE_*`, `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_*`, `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_*_CANDIDATE_ONLY/*` | Keep docs as ROADMAP_ONLY or PASSIVE_REPORT; do not inspect `scripts/uxpilote`. | Decide whether to create a docs-only UxPilote index in a separate task. |
| RAG policy/source-pack family | `00_STUDIO_CONTROL/05_STATUS/RAG_SOURCE_PACK_MANIFEST_V0.yaml`, `00_STUDIO_CONTROL/09_RAG/RAG_INDEX_ROUTE_AND_BACKEND_POLICY_V0.md`, `00_STUDIO_CONTROL/07_FORMS/LOCAL_RAG_SOURCE_PACK_V0.md` | Keep reference-only; no indexing, embedding, vector DB, model call, or source promotion. | Decide whether RAG docs need a compact source-state index. |

## Archive Candidate Groups

Classification: ARCHIVE_CANDIDATE. No physical action authorized.

- `MASTER_DOCS/ARCHIVE/LEGACY_ROOT_DOCS/*`
- `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/*`
- `MASTER_DOCS/ARCHIVE/CONTEXT/08_REPRISE_PROMPT.md`
- `MASTER_DOCS/ARCHIVE/CONTEXT/11_GPT55_BROWSER_REPRISE_PROMPT.md`
- `MASTER_DOCS/ARCHIVE/CONTEXT/16_MULTI_AGENT_STUDIO_CONSTITUTION.md`
- `MASTER_DOCS/ARCHIVE/CONTEXT/17_PR_AGENT_TUTORIAL.md`
- `MASTER_DOCS/ARCHIVE/CONTEXT/18_AGENT_REGISTRY.md`
- `MASTER_DOCS/ARCHIVE/CONTEXT/19_AGENT_GUARDRAIL_POLICY.md`
- `MASTER_DOCS/ARCHIVE/CONTEXT/20_LOCAL_AGENT_PR_OPERATOR.md`
- `MASTER_DOCS/ARCHIVE/CONTEXT/28_AI_REVIEW_COUNCIL.md`
- `MASTER_DOCS/ARCHIVE/CONTEXT/29_FREE_CLEAN_OPERATOR_PACK.md`
- `MASTER_DOCS/ARCHIVE/CONTEXT/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md`
- `MASTER_DOCS/ARCHIVE/CONTEXT/AUTOBATTLER_RELECTURE_2026_04_26/*`

Plan posture:

- Keep in place until a separate HumanGate physical archive charter.
- Any later archive task must prove target path, move list, and non-overlap with active canonical docs before action.

## Roadmap-Only Groups

Classification: ROADMAP_ONLY.

- Master roadmap:
  - `MASTER_DOCS/02_ROADMAP_90D.md`
  - `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md`
  - `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`
  - `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
  - `MASTER_DOCS/LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md`
- Engine/search/neural roadmap:
  - `docs/control-plane/ENGINE_SEARCH_NEURAL_DECOMPOSITION_ROADMAP_V0.md`
  - `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md`
  - supporting PP10-PP18 control-plane docs
- Chess960 and Rocky roadmap:
  - `docs/control-plane/CHESS960_CAMPAIGNPLAN_DRAFT_V0.md`
  - `docs/control-plane/CHESS960_PATCHPLAN_APPROVAL_V0.md`
  - `docs/control-plane/ROCKY_*`
  - `00_STUDIO_CONTROL/10_ROADMAP/ROCKY_*`
- UxPilote roadmap/prototype:
  - `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_*`
  - `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_GODOT_GARDEN_CANDIDATE_ONLY/*`
  - `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_PROTOTYPE_CANDIDATE_ONLY/*`
- Studio activation roadmap:
  - `00_STUDIO_CONTROL/10_ROADMAP/STUDIO_AGENTIC_PYRAMID_ACTIVATION_ROADMAP_V0.md`
  - `00_STUDIO_CONTROL/10_ROADMAP/FUTURE_PROJECTS.md`
  - `00_STUDIO_CONTROL/10_ROADMAP/ROADMAPATCH_MASTER.md`

Plan posture:

- Use target, candidate, passive, roadmap-only, future, and blocked language.
- Do not convert roadmap docs into implementation, runtime, benchmark, model, dataset, or readiness claims.

## Passive Report Groups

Classification: PASSIVE_REPORT.

- `00_STUDIO_CONTROL/05_STATUS/*.md`
- `00_STUDIO_CONTROL/05_STATUS/*.yaml`
- `MASTER_DOCS/04_BENCHMARK_LEDGER.md`
- `docs/control-plane/*_AUDIT*.md`
- `docs/control-plane/*DRY_RUN*.md`
- `docs/control-plane/*SMOKE*.md`
- `docs/control-plane/*REPORT*.md`
- `docs/evidence/ROCKY_TRACE_EVIDENCE_SEED_V0/*`
- lab/report/evidence docs if brought into scope by a later task

Plan posture:

- Passive reports are discoverability/evidence records only.
- Report creation does not imply registration, loading, enforcement, evidence promotion, or canonical truth.
- Benchmark ledgers or report summaries must not be used as proof of strength, Elo, model promotion, or scientific claims.

## Blocked No Action

Classification: BLOCKED_NO_ACTION.

- Existing docs edits: BLOCKED in this task.
- Move/delete/rename/archive: BLOCKED in this task.
- Registry/source-index/upload-checklist updates: BLOCKED in this task.
- Runtime/test/benchmark/training/dataset/model actions: BLOCKED in this task.
- Commit/push/branch/PR: BLOCKED in this task.
- `scripts/uxpilote` inspection: BLOCKED in this task.
- Physical archive folder creation: BLOCKED in this task.
- Global ready/not-ready verdict: BLOCKED by doctrine.

## Unknown

Classification: UNKNOWN.

- `scripts/uxpilote/`: UNKNOWN, uninspected and out of scope.
- Exact runtime/model identity for Codex: UNKNOWN unless exposed by environment.
- Any implementation/test claim inside docs not revalidated by current source/test readback: UNKNOWN.
- Any generated or local-only report not read in this task: UNKNOWN.

## HumanGate Decision Queue

1. Decide whether `MAIN_DOCS_CONSOLIDATION_PLAN_V0.md` should be registered as passive status evidence or kept local only.
2. Decide whether `MASTER_DOCS/CURRENT_STATE_INDEX.md` should remain KEEP_REFERENCE or receive a bounded refresh task.
3. Decide whether `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md` remains the archive proposal authority or is superseded by this plan.
4. Decide whether to create a compact active-docs index that points to canonical keep docs and reference-only docs without duplicating content.
5. Decide whether to create a separate architecture-roadmap bridge that keeps `MASTER_DOCS/05_ARCHITECTURE.md` canonical and marks AAA/Hybrid/90D/Rocky as ROADMAP_ONLY.
6. Decide whether the engine/search/neural PP9-PP19 family needs a one-page index rather than content merging.
7. Decide whether UxPilote roadmap/status docs need a docs-only index while leaving `scripts/uxpilote` UNKNOWN.
8. Decide whether archive candidates should be moved later, and if so require a separate physical archive charter.
9. Decide whether selected passive reports should be registered for discoverability without promotion.

## Recommended Order Of Application

1. Register or explicitly decline registration of this plan as PASSIVE_REPORT.
2. Refresh or reaffirm `MASTER_DOCS/CURRENT_STATE_INDEX.md` as KEEP_REFERENCE.
3. Add a minimal active-docs index update only if HumanGate authorizes it.
4. Add a minimal architecture-roadmap bridge only if HumanGate authorizes it.
5. Add PP9-PP19 engine/search/neural index pointers only if HumanGate authorizes it.
6. Add UxPilote docs-only index only if HumanGate authorizes it, without inspecting `scripts/uxpilote`.
7. Revisit archive candidates in a separate physical archive task with explicit move list.
8. Re-run docs status closure validation after any approved edits.

## No Physical Action Yet

- No file was moved.
- No file was deleted.
- No file was renamed.
- No archive folder was created.
- No existing documentation file was edited.
- No registry/source-index/upload-checklist file was edited.
- No runtime/test/benchmark/training/dataset/model command was run.
- No commit, push, branch, or PR was made.

## Files Changed

- created:
  - `00_STUDIO_CONTROL/05_STATUS/MAIN_DOCS_CONSOLIDATION_PLAN_V0.md`
- modified:
  - none
- deleted:
  - none

## Commands Run

```text
Get-Location
git rev-parse --show-toplevel
git status --short --branch
git log -1 --format=%H
Get-Content AGENTS.md
Get-Content MASTER_DOCS\DOCS_STATUS.md
Get-Content MASTER_DOCS\DOC_ARCHIVE_DEMOTION_MAP.md
Get-Content 00_STUDIO_CONTROL\05_STATUS\DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md
Get-Content 00_STUDIO_CONTROL\05_STATUS\DOCS_CLEANUP_FINAL_SYNC_CHECK_V0.md
Get-Content 00_STUDIO_CONTROL\03_REGISTRIES\FILE_REGISTRY.yaml
Get-Content docs\gpt-navigator\GPT_NAVIGATOR_SOURCE_INDEX_V0.md
Get-ChildItem -Path MASTER_DOCS -File -Force | Select-Object FullName
Get-ChildItem -Path MASTER_DOCS\ARCHIVE -Recurse -File -Force | Select-Object FullName
Get-ChildItem -Path docs\control-plane -File -Force | Select-Object FullName
Get-ChildItem -Path 00_STUDIO_CONTROL\10_ROADMAP -Recurse -File -Force | Select-Object FullName
Test-Path 00_STUDIO_CONTROL\05_STATUS\MAIN_DOCS_CONSOLIDATION_PLAN_V0.md
```

## Skipped Validation

- Runtime/tests/benchmark/training/dataset/model validation: BLOCKED by task scope.
- `scripts/uxpilote` inspection: BLOCKED by task scope; status remains UNKNOWN.
- Physical archive validation: BLOCKED because no archive action was authorized.
- Registry/source-index/upload-checklist validation as edited files: BLOCKED because no edits were authorized.

## Risks

- This plan is a classification plan, not a complete semantic review of every docs line.
- Some docs contain historical branch, SHA, path, runtime, implementation, or test claims; those claims require live readback before use.
- `00_STUDIO_CONTROL/10_ROADMAP` contains prototype/candidate folders that can be mistaken for active implementation unless kept ROADMAP_ONLY.
- `00_STUDIO_CONTROL/05_STATUS` contains passive reports that can be mistaken for canonical truth unless kept PASSIVE_REPORT.
- `scripts/uxpilote/` remains untracked, UNKNOWN, and uninspected.

## Status By Surface

| surface | status | note |
| --- | --- | --- |
| active_runtime_code | UNKNOWN | not inspected |
| tests | UNKNOWN | not run |
| generated_runtime_outputs | BLOCKED | not touched |
| canonical_docs | DOCUMENTED_ONLY | classification plan only |
| roadmap_docs_only | DOCUMENTED_ONLY | ROADMAP_ONLY groups identified |
| passive_reports | PASSIVE | status/evidence reports remain passive |
| archive_candidates | BLOCKED_NO_ACTION | no physical archive |
| registry | PASSIVE | read-only context |
| source_index | PASSIVE | read-only context |
| scripts_uxpilote | UNKNOWN | uninspected and out of scope |
| inference | PASSIVE | classification only |

## Verdicts

- software_verdict: DOCUMENTED_ONLY
- evidence_verdict: PASSIVE
- claim_verdict: NO_CLAIM_ALLOWED
- no_global_ready_verdict: true
