# DOCS PURELAB VS CURRENT COMPARISON V0

task_id: DOCS-PURELAB-VS-CURRENT-COMPARISON-001
mode: CODEX READ-ONLY PURELAB VS CURRENT DOCS COMPARISON
status: DOCUMENTED_ONLY
surface: canonical_docs
owner: HumanGate
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true

## Purpose

Compare the original PureLab `MASTER_DOCS` model from:

```text
C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab\MASTER_DOCS
```

with the current `C:\TACTICAL_CHESS_STUDIO` documentation structure.

This report classifies documentation routes only. It does not edit, move, delete, rename, archive, register, load as project truth, enforce, execute, test, benchmark, train, commit, push, or claim readiness.

## Preflight

- pwd: `C:\TACTICAL_CHESS_STUDIO`
- git_root: `C:/TACTICAL_CHESS_STUDIO`
- branch: `master`
- HEAD: `991dbf79f54da392f1ae45100a1dbfe5f9a05762`
- git_status_short_branch:

```text
## master...origin/master
?? 00_STUDIO_CONTROL/05_STATUS/MAIN_DOCS_CONSOLIDATION_PLAN_V0.md
?? scripts/uxpilote/
```

Pre-existing changes before this report:

- `00_STUDIO_CONTROL/05_STATUS/MAIN_DOCS_CONSOLIDATION_PLAN_V0.md` was already untracked.
- `scripts/uxpilote/` was already untracked and remains out of scope.

scripts_uxpilote_status: UNKNOWN, uninspected.

## Source State

created:

- `00_STUDIO_CONTROL/05_STATUS/DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md`

registered:

- Not registered by this task.

loaded:

- `AGENTS.md`
- `README.md`
- required current `MASTER_DOCS` files listed by task prompt
- `00_STUDIO_CONTROL/05_STATUS/MAIN_DOCS_CONSOLIDATION_PLAN_V0.md`
- legacy PureLab `MASTER_DOCS` file inventory from the supplied desktop path

enforced:

- Output route restricted to this one status report.
- Existing docs edits blocked.
- Move/delete/rename/archive/register actions blocked.
- Runtime/tests/benchmark/training blocked.
- `scripts/uxpilote` kept UNKNOWN and uninspected.

evidenced:

- Git preflight captured.
- Current root/doc inventories captured with `rg --files`.
- Current `MASTER_DOCS`, `docs`, and `00_STUDIO_CONTROL` doc inventories captured.
- Legacy PureLab `MASTER_DOCS` inventory captured from supplied path.
- Required docs read back before report creation.

Source anchoring rule preserved:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

## Route Check

- requested_output: `00_STUDIO_CONTROL/05_STATUS/DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md`
- output_routing_result: DOCUMENTED_ONLY report created at requested route.
- existing_docs_edit_result: BLOCKED_NO_ACTION
- move_delete_rename_archive_result: BLOCKED_NO_ACTION
- registry_update_result: BLOCKED_NO_ACTION
- scripts_uxpilote_result: UNKNOWN, uninspected.

## Classification Taxonomy

- KEEP_CANONICAL: read-first docs or current authority-order docs that should remain active.
- KEEP_REFERENCE: useful active or historical reference, not first authority.
- PASSIVE_BOUNDARY_DOC: boundary, contract, policy, matrix, schema, or gate doc; no activation by itself.
- ROADMAP_ONLY: future direction, implementation order, concept plan, candidate, or target architecture.
- PASSIVE_REPORT: audit/status/evidence/report file that remains passive unless separately promoted.
- MERGE_CANDIDATE: overlapping role that may merit a bounded HumanGate consolidation task.
- ARCHIVE_CANDIDATE: stale/context doc suitable for later physical archive consideration only.
- ROOT_CLEANUP_CANDIDATE: root-level doc/output better routed under a canonical or passive folder in a later task.
- BLOCKED_NO_ACTION: action explicitly blocked in this task.
- UNKNOWN: out of scope, uninspected, or not revalidated.

## Original PureLab Doc Model

Classification: DOCUMENTED_ONLY.

The original PureLab model was centered on `MASTER_DOCS` as the durable restart and doctrine surface.

Observed legacy top-level model:

- `00_EXEC_SUMMARY.md`, `01_CURRENT_STATE.md`, `02_COMMAND_CHEATSHEET.md`, `03_KNOWN_ISSUES.md`, `05_ARCHITECTURE.md`: canonical operating spine.
- `06_DECISION_LOG.md`, `07_PROJECT_HISTORY.md`, `10_AUTOMATION_EVIDENCE_PLANE.md`: reference/history/workflow spine.
- `AAA_TACTICAL_CORE_ARCHITECTURE.md`, `HYBRID_GAME_AI_PLATFORM_PLAN.md`, `02_ROADMAP_90D.md`, `09_ROCKY_VARIANT_FREEZE.md`: roadmap/architecture direction.
- `AUTOMATION_*`, `LEARNING_*`, and `TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md`: passive control, automation, learning, and boundary standards.
- `ARCHIVE/**`: legacy context and stale source-of-truth material.

PureLab model conclusion:

- The original model is still useful as a compact canonical/reference split.
- It is no longer sufficient alone because current Studio has registries, source anchoring, status reports, roadmap queues, and routing policies under `00_STUDIO_CONTROL`.

## Current Studio Doc Model

Classification: DOCUMENTED_ONLY.

The current Studio model has four major documentation planes:

| plane | role | classification |
| --- | --- | --- |
| root docs | entrypoint, security/boundary notes, loose artifacts | KEEP_CANONICAL / ROOT_CLEANUP_CANDIDATE / PASSIVE_BOUNDARY_DOC |
| `MASTER_DOCS/` | durable current-state, architecture, roadmap, and demotion map | KEEP_CANONICAL / KEEP_REFERENCE / ROADMAP_ONLY / PASSIVE_BOUNDARY_DOC |
| `docs/` | control-plane, evidence, GPT navigator, studio tool docs | KEEP_REFERENCE / PASSIVE_BOUNDARY_DOC / ROADMAP_ONLY |
| `00_STUDIO_CONTROL/` | maps, registries, boundaries, status reports, forms, roadmap queues, migration docs | KEEP_CANONICAL / PASSIVE_BOUNDARY_DOC / PASSIVE_REPORT / ROADMAP_ONLY |

Current model conclusion:

- `MASTER_DOCS` should remain the compact human/Codex read-first doctrine layer.
- `00_STUDIO_CONTROL` should remain the routing, registry, boundary, status, and roadmap operating layer.
- `docs/control-plane` should remain reference/passive control-plane documentation unless a specific doc is registered and loaded by HumanGate.
- `docs/evidence` should remain evidence/boundary guidance, not implementation proof.

## Duplicated Roles

| role | duplicated surfaces | classification | recommendation |
| --- | --- | --- | --- |
| current state summary | `DOCS_STATUS.md`, `00_EXEC_SUMMARY.md`, `01_CURRENT_STATE.md`, `CURRENT_STATE_INDEX.md`, `CURRENT_TRUTH_MAP_V0.md`, `MAIN_DOCS_CONSOLIDATION_PLAN_V0.md` | MERGE_CANDIDATE | Keep `DOCS_STATUS.md` and `01_CURRENT_STATE.md` canonical; keep status reports passive; decide whether `CURRENT_STATE_INDEX.md` is refreshed or reference-only. |
| architecture direction | `05_ARCHITECTURE.md`, `AAA_TACTICAL_CORE_ARCHITECTURE.md`, `HYBRID_GAME_AI_PLATFORM_PLAN.md`, `ARCHITECTURE_PLANS_INDEX.md`, roadmap files | MERGE_CANDIDATE / ROADMAP_ONLY | Keep `05_ARCHITECTURE.md` canonical; AAA/Hybrid remain ROADMAP_ONLY unless source/test evidence supports a narrow active claim. |
| archive and demotion policy | `DOC_ARCHIVE_DEMOTION_MAP.md`, `MAIN_DOCS_CONSOLIDATION_PLAN_V0.md`, `DOCS_*CLEANUP*`, `ARCHIVE_REGISTRY.md` | MERGE_CANDIDATE | Keep demotion map as proposal authority until HumanGate decides whether this report family supersedes it. |
| control-plane doctrine | `TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md`, `docs/control-plane/*`, `00_STUDIO_CONTROL/00_INDEX`, `01_MAPS`, `04_BOUNDARIES` | PASSIVE_BOUNDARY_DOC / KEEP_REFERENCE | Keep canonization as reference; keep `00_STUDIO_CONTROL` routing docs as current boundaries. |
| automation loop | `10_AUTOMATION_EVIDENCE_PLANE.md`, `AUTOMATION_*`, `docs/control-plane/*LOOP*`, `06_CODEX`, `11_PIPELINE_CORE`, `12_PIPELINE_OPENING_LEGACY` | KEEP_REFERENCE / PASSIVE_BOUNDARY_DOC | Keep current pipeline core active; mark legacy opening pipeline passive. |
| learning trace | `LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md`, `LEARNING_TRACE_V1_STANDARD.md`, `docs/control-plane/LEARNING_EVENT_MINIMAL_V0.md`, gameplay observation PR-LS docs | PASSIVE_BOUNDARY_DOC / ROADMAP_ONLY | Keep standards reference-only/passive; no learning-system implementation claim. |
| UxPilote | `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_*`, `05_STATUS/UXPILOTE_*`, `10_ROADMAP/UXPILOTE_*`, untracked `scripts/uxpilote/` | ROADMAP_ONLY / PASSIVE_REPORT / UNKNOWN | Keep docs passive/roadmap; keep `scripts/uxpilote` UNKNOWN. |

## Root Docs Requiring Routing

| path | classification | recommended route |
| --- | --- | --- |
| `AGENTS.md` | KEEP_CANONICAL | keep root |
| `README.md` | KEEP_CANONICAL | keep root |
| `SECURITY_BOUNDARY.md` | PASSIVE_BOUNDARY_DOC | keep root or later mirror under `00_STUDIO_CONTROL/04_BOUNDARIES` by HumanGate |
| `THREAT_MODEL.md` | PASSIVE_BOUNDARY_DOC | keep root or later mirror/link from `00_STUDIO_CONTROL/04_BOUNDARIES` |
| `SECURITY_AUTOMATION_AUDIT.md` | PASSIVE_REPORT | later route to passive status/audit folder if authorized |
| `requirements.txt` | KEEP_REFERENCE | keep root as dependency manifest |
| `requirements-control-plane.txt` | KEEP_REFERENCE | keep root unless later dependency-doc routing task decides otherwise |
| `viewer.html` | ROOT_CLEANUP_CANDIDATE | later classify as runtime/viewer asset, not canonical docs |
| `ENGINE_SEARCH_NEURAL_SCAN.txt` | ROOT_CLEANUP_CANDIDATE | later route as passive scan/report if still needed |
| `src/*README*.txt`, `src/*PATCH*.txt` | ROOT_CLEANUP_CANDIDATE | later route to `docs/` or archive after source-specific review |
| `outputs/security_pack/SECURITY_PACK_SECRETS_SUPPLYCHAIN.md` | PASSIVE_REPORT | generated/security pack context only |

## MASTER_DOCS Files To Keep Canonical

Classification: KEEP_CANONICAL.

- `MASTER_DOCS/DOCS_STATUS.md`
- `MASTER_DOCS/00_EXEC_SUMMARY.md`
- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/02_COMMAND_CHEATSHEET.md`
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`

Conditional KEEP_CANONICAL / KEEP_REFERENCE:

- `MASTER_DOCS/CURRENT_STATE_INDEX.md`: keep discoverable, but HumanGate should decide whether to refresh as canonical or demote to KEEP_REFERENCE because it contains historical stack material and duplicates current-state roles.
- `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md`: keep as classification authority/proposal until superseded by HumanGate.

## MASTER_DOCS Files To Demote To Reference Or Passive

Classification: KEEP_REFERENCE.

- `MASTER_DOCS/06_DECISION_LOG.md`
- `MASTER_DOCS/07_PROJECT_HISTORY.md`
- `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
- `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md`
- `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md`
- `MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md`

Classification: PASSIVE_BOUNDARY_DOC.

- `MASTER_DOCS/AUTOMATION_BATCH_CONTROLLER.md`
- `MASTER_DOCS/AUTOMATION_CONTROLLER_CONTRACT.md`
- `MASTER_DOCS/AUTOMATION_GPT_PLATFORM_BRIDGE.md`
- `MASTER_DOCS/AUTOMATION_LANE_MATRIX.md`
- `MASTER_DOCS/AUTOMATION_SMOKE_MATRIX.md`
- `MASTER_DOCS/LEARNING_TRACE_V1_STANDARD.md`

Classification: ROADMAP_ONLY.

- `MASTER_DOCS/02_ROADMAP_90D.md`
- `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md`
- `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`
- `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
- `MASTER_DOCS/LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md`

Classification: PASSIVE_REPORT.

- `MASTER_DOCS/04_BENCHMARK_LEDGER.md`

Classification: ARCHIVE_CANDIDATE.

- `MASTER_DOCS/ARCHIVE/LEGACY_ROOT_DOCS/*`
- `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/*`
- `MASTER_DOCS/ARCHIVE/CONTEXT/*` old prompts, local operator docs, AI council, old audits, and autobattler relecture material

## 00_STUDIO_CONTROL Boundaries

| folder | role | classification |
| --- | --- | --- |
| `00_INDEX` | current control-plane index and read-first surface | KEEP_CANONICAL |
| `01_MAPS` | routing maps, topology, path contracts, legacy boundary, UxPilote maps | KEEP_CANONICAL / PASSIVE_BOUNDARY_DOC / ROADMAP_ONLY |
| `02_NAVIGATION` | source anchoring | KEEP_CANONICAL |
| `03_REGISTRIES` | registry docs and YAML registries | KEEP_REFERENCE / PASSIVE_BOUNDARY_DOC |
| `04_BOUNDARIES` | HumanGate, claim, data, network, path, repo, secret, workspace boundaries | PASSIVE_BOUNDARY_DOC |
| `05_STATUS` | audit/status/report/decision packets | PASSIVE_REPORT |
| `06_CODEX` | Codex loop forms and local parameters | KEEP_REFERENCE / PASSIVE_BOUNDARY_DOC |
| `07_FORMS` | task, report, executor, RAG, prompt templates | KEEP_REFERENCE / PASSIVE_BOUNDARY_DOC |
| `08_MIGRATION` | legacy merge and migration reports | PASSIVE_REPORT / ARCHIVE_CANDIDATE |
| `09_CYBERDEFENSE` | cyberdefense boundary docs | PASSIVE_BOUNDARY_DOC |
| `09_RAG` | RAG route/backend policy | PASSIVE_BOUNDARY_DOC |
| `10_ROADMAP` | roadmap and candidate queues | ROADMAP_ONLY |
| `11_PIPELINE_CORE` | current pipeline opening/core docs | KEEP_REFERENCE |
| `12_PIPELINE_OPENING_LEGACY` | superseded opening pipeline docs | ARCHIVE_CANDIDATE / KEEP_REFERENCE until archived |
| `13_BOOTSTRAP_PROFILES` | bootstrap profiles | KEEP_REFERENCE |

Boundary conclusion:

- `00_STUDIO_CONTROL` should not be collapsed into `MASTER_DOCS`.
- It should be treated as the active routing/control overlay, with status reports remaining passive by default.

## Recommended Final Documentation Tree

```text
AGENTS.md                                      KEEP_CANONICAL
README.md                                      KEEP_CANONICAL
SECURITY_BOUNDARY.md                           PASSIVE_BOUNDARY_DOC
THREAT_MODEL.md                                PASSIVE_BOUNDARY_DOC
requirements*                                  KEEP_REFERENCE

MASTER_DOCS/
  DOCS_STATUS.md                               KEEP_CANONICAL
  00_EXEC_SUMMARY.md                           KEEP_CANONICAL
  01_CURRENT_STATE.md                          KEEP_CANONICAL
  02_COMMAND_CHEATSHEET.md                     KEEP_CANONICAL
  03_KNOWN_ISSUES.md                           KEEP_CANONICAL
  05_ARCHITECTURE.md                           KEEP_CANONICAL
  CURRENT_STATE_INDEX.md                       KEEP_REFERENCE or refreshed KEEP_CANONICAL by HumanGate
  DOC_ARCHIVE_DEMOTION_MAP.md                  KEEP_REFERENCE / MERGE_CANDIDATE
  06_DECISION_LOG.md                           KEEP_REFERENCE
  07_PROJECT_HISTORY.md                        KEEP_REFERENCE
  10_AUTOMATION_EVIDENCE_PLANE.md              KEEP_REFERENCE
  AUTOMATION_*.md                              PASSIVE_BOUNDARY_DOC
  LEARNING_TRACE_V1_STANDARD.md                PASSIVE_BOUNDARY_DOC
  AAA_TACTICAL_CORE_ARCHITECTURE.md            ROADMAP_ONLY
  HYBRID_GAME_AI_PLATFORM_PLAN.md              ROADMAP_ONLY
  LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md ROADMAP_ONLY
  ARCHIVE/**                                   ARCHIVE_CANDIDATE / KEEP_REFERENCE until moved

docs/
  gpt-navigator/**                             KEEP_REFERENCE
  control-plane/**                             PASSIVE_BOUNDARY_DOC / ROADMAP_ONLY / KEEP_REFERENCE
  evidence/**                                  PASSIVE_BOUNDARY_DOC / PASSIVE_REPORT
  studioV2/**                                  KEEP_REFERENCE

00_STUDIO_CONTROL/
  00_INDEX/**                                  KEEP_CANONICAL
  01_MAPS/**                                   KEEP_CANONICAL / PASSIVE_BOUNDARY_DOC / ROADMAP_ONLY
  02_NAVIGATION/**                             KEEP_CANONICAL
  03_REGISTRIES/**                             KEEP_REFERENCE / PASSIVE_BOUNDARY_DOC
  04_BOUNDARIES/**                             PASSIVE_BOUNDARY_DOC
  05_STATUS/**                                 PASSIVE_REPORT
  06_CODEX/**                                  KEEP_REFERENCE / PASSIVE_BOUNDARY_DOC
  07_FORMS/**                                  KEEP_REFERENCE / PASSIVE_BOUNDARY_DOC
  08_MIGRATION/**                              PASSIVE_REPORT / ARCHIVE_CANDIDATE
  09_CYBERDEFENSE/**                           PASSIVE_BOUNDARY_DOC
  09_RAG/**                                    PASSIVE_BOUNDARY_DOC
  10_ROADMAP/**                                ROADMAP_ONLY
  11_PIPELINE_CORE/**                          KEEP_REFERENCE
  12_PIPELINE_OPENING_LEGACY/**                ARCHIVE_CANDIDATE
  13_BOOTSTRAP_PROFILES/**                     KEEP_REFERENCE
```

## First Safe Apply Batch

Classification: BLOCKED_NO_ACTION in this task.

Recommended first apply batch for a later HumanGate task:

1. Decide whether this report should be registered as PASSIVE_REPORT.
2. Reaffirm `MASTER_DOCS/DOCS_STATUS.md`, `00_EXEC_SUMMARY.md`, `01_CURRENT_STATE.md`, `02_COMMAND_CHEATSHEET.md`, `03_KNOWN_ISSUES.md`, and `05_ARCHITECTURE.md` as KEEP_CANONICAL.
3. Decide whether `CURRENT_STATE_INDEX.md` should be refreshed as canonical or left KEEP_REFERENCE.
4. Add a small pointer note, if authorized, that `00_STUDIO_CONTROL/05_STATUS/*.md` and `*.yaml` are PASSIVE_REPORT unless separately registered, loaded, enforced, and evidenced.
5. Add no file moves in the first batch.
6. Keep all archive candidates physically in place until a separate archive charter lists exact source and destination paths.

## HumanGate Decision Queue

1. Should this comparison report be registered as PASSIVE_REPORT or remain local/unregistered?
2. Should `MASTER_DOCS/CURRENT_STATE_INDEX.md` be refreshed as KEEP_CANONICAL or explicitly demoted to KEEP_REFERENCE?
3. Should `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md` remain the demotion proposal authority, or should a newer consolidation plan supersede it?
4. Should root cleanup candidates receive a separate routing-only task?
5. Should `MASTER_DOCS/ARCHIVE/**` remain in place or move under a later physical archive charter?
6. Should `00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY/**` remain discoverable or become a physical archive candidate in a later task?
7. Should UxPilote docs receive a docs-only index while keeping `scripts/uxpilote` UNKNOWN?
8. Should status reports in `00_STUDIO_CONTROL/05_STATUS` get a lightweight passive-report registry without promotion?
9. Should a compact architecture-roadmap bridge be created to reduce duplication among `05_ARCHITECTURE`, AAA, Hybrid, and roadmap docs?

## Files Changed

- created:
  - `00_STUDIO_CONTROL/05_STATUS/DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md`
- modified:
  - none
- moved/deleted/renamed/archived:
  - none

## Commands Run

```text
Get-Location
git rev-parse --show-toplevel
git status --short --branch
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
rg --files -g "*.md" -g "*.txt" -g "*.html" -g "requirements*"
rg --files MASTER_DOCS docs 00_STUDIO_CONTROL -g "*.md" -g "*.yaml" -g "*.yml"
Get-ChildItem -Path "C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab\MASTER_DOCS" -Recurse -File -Filter *.md | Select-Object FullName
Get-Content AGENTS.md
Get-Content README.md
Get-Content MASTER_DOCS\DOCS_STATUS.md
Get-Content MASTER_DOCS\CURRENT_STATE_INDEX.md
Get-Content MASTER_DOCS\DOC_ARCHIVE_DEMOTION_MAP.md
Get-Content MASTER_DOCS\00_EXEC_SUMMARY.md
Get-Content MASTER_DOCS\01_CURRENT_STATE.md
Get-Content MASTER_DOCS\02_COMMAND_CHEATSHEET.md
Get-Content MASTER_DOCS\03_KNOWN_ISSUES.md
Get-Content MASTER_DOCS\05_ARCHITECTURE.md
Get-Content MASTER_DOCS\06_DECISION_LOG.md
Get-Content MASTER_DOCS\07_PROJECT_HISTORY.md
Get-Content MASTER_DOCS\10_AUTOMATION_EVIDENCE_PLANE.md
Get-Content MASTER_DOCS\AAA_TACTICAL_CORE_ARCHITECTURE.md
Get-Content MASTER_DOCS\HYBRID_GAME_AI_PLATFORM_PLAN.md
Get-Content MASTER_DOCS\LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md
Get-Content MASTER_DOCS\LEARNING_TRACE_V1_STANDARD.md
Get-Content MASTER_DOCS\TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md
Get-Content 00_STUDIO_CONTROL\05_STATUS\MAIN_DOCS_CONSOLIDATION_PLAN_V0.md
Get-FileHash MASTER_DOCS\*.md
Get-FileHash "C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab\MASTER_DOCS\*.md"
rg --files 00_STUDIO_CONTROL -g "*.md" -g "*.yaml" -g "*.yml"
rg --files docs -g "*.md"
Test-Path 00_STUDIO_CONTROL\05_STATUS\DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md
Get-Content 00_STUDIO_CONTROL\05_STATUS\DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md -TotalCount 100
Select-String 00_STUDIO_CONTROL\05_STATUS\DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md -Pattern "KEEP_CANONICAL|KEEP_REFERENCE|PASSIVE_BOUNDARY_DOC|ROADMAP_ONLY|MERGE_CANDIDATE|ARCHIVE_CANDIDATE|ROOT_CLEANUP_CANDIDATE|UNKNOWN|NO_CLAIM_ALLOWED|no_global_ready_verdict"
git diff --check
git status --short --branch
```

## Validation Results

- `Test-Path 00_STUDIO_CONTROL\05_STATUS\DOCS_PURELAB_VS_CURRENT_COMPARISON_V0.md`: `True`
- `Get-Content ... -TotalCount 100`: PASS; report header, preflight, source state, route check, and classification taxonomy read back.
- `Select-String ...`: PASS; required classification and claim tokens found.
- `git diff --check`: PASS; no whitespace errors reported.
- `git status --short --branch`: PASS; current status shows this new report plus pre-existing untracked `MAIN_DOCS_CONSOLIDATION_PLAN_V0.md` and `scripts/uxpilote/`.

## Skipped Validation

- Runtime/tests/benchmark/training/dataset/model validation: BLOCKED by task scope.
- `scripts/uxpilote` inspection: BLOCKED by task scope; status remains UNKNOWN.
- Physical archive validation: BLOCKED because no move/archive action was authorized.
- Registry/source-index/upload-checklist validation as edited files: BLOCKED because no edits were authorized.
- Full semantic line-by-line review of every doc in inventory: skipped; this is a route/classification comparison, not an exhaustive content audit.

## Risks

- Some docs contain stale branch, SHA, path, implementation, test, benchmark, local-stack, or readiness language; these claims require fresh source/test/evidence readback before use.
- `00_STUDIO_CONTROL/05_STATUS` files can look authoritative, but report creation alone does not make them registered, loaded, enforced, evidenced, or canonical.
- Roadmap and candidate folders under `00_STUDIO_CONTROL/10_ROADMAP` can be mistaken for active implementation unless kept ROADMAP_ONLY.
- Legacy PureLab docs remain useful for structure comparison but are not current project truth by location or age.
- `scripts/uxpilote/` remains UNKNOWN, uninspected, and out of scope.

## Status By Surface

| surface | status | note |
| --- | --- | --- |
| active_runtime_code | UNKNOWN | not inspected |
| tests | UNKNOWN | not run |
| generated_runtime_outputs | BLOCKED | not touched |
| canonical_docs | DOCUMENTED_ONLY | classification comparison only |
| roadmap_docs_only | DOCUMENTED_ONLY | ROADMAP_ONLY groups identified |
| passive_boundary_docs | PASSIVE | boundary docs classified, not activated |
| passive_reports | PASSIVE | status/evidence reports remain passive |
| archive_candidates | BLOCKED_NO_ACTION | no physical archive |
| root_cleanup_candidates | BLOCKED_NO_ACTION | no routing action taken |
| registry | PASSIVE | no registry update |
| scripts_uxpilote | UNKNOWN | uninspected and out of scope |
| inference | PASSIVE | no model/runtime inference inspected |

## Verdicts

software_verdict: DOCUMENTED_ONLY

evidence_verdict: PASSIVE

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
