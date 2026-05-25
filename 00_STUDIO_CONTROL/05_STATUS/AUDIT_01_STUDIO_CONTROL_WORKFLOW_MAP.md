# AUDIT-01 Studio Control Workflow Map

record_type: read_only_audit_report
task_id: AUDIT-01-STUDIO-CONTROL-WORKFLOW-MAP
created_by: codex
created_at: 2026-05-23
status: DOCUMENTED_ONLY
intended_surface: artifacts_runtime_outputs
actual_destination: C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md
generated_report_is_not_canonical_truth: true
claim_posture: NO_CLAIM_ALLOWED
human_gate_required: true
no_global_ready_verdict: true

## Executive Finding

This report is passive audit evidence only. It maps the observed Studio Control workflow surfaces from loaded sources, but the task is evidence-limited because five required exact repo-local anchors under `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab` were not found. Root-level alternates were discovered and read, but they are recorded as alternate evidence only, not as replacements for the required exact-path anchors.

## Preflight

| Item | Status | Evidence |
| --- | --- | --- |
| Current directory | PASSIVE | `C:/TACTICAL_CHESS_STUDIO` |
| Inside Git repository | PASSIVE | `git rev-parse --is-inside-work-tree` returned `true`. |
| Branch | PASSIVE | `master...origin/master` |
| HEAD | PASSIVE | `d0ace5ba466ad4e3b07b4cde20dd237ca0a0a248` |
| Worktree before report creation | PASSIVE | `git status --short --branch` showed no changed files beyond the branch header. |
| Sandbox state | BLOCKED | Initial sandboxed PowerShell preflight failed before command execution with `windows sandbox: setup refresh failed`. Read-only commands were rerun with escalation. |
| Runtime identifier | BLOCKED | Exact runtime identifier was not exposed. Per task rule: `actual_runtime: UNKNOWN`; `runtime_status: BLOCKED`; no exact model claim is made. |

Pre-existing changes before editing: none observed by `git status --short --branch`.

## Source State

created != registered
registered != loaded
loaded != enforced
enforced != evidenced

| Source | Created | Registered | Loaded | Enforced | Evidenced | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Required source loaded by readback. Defines source-state separation. |
| `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Required source loaded by readback. Defines surfaces and route rules. |
| `00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Required source loaded by readback. Defines current unique-prefix topology. |
| `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Required source loaded by readback. Defines record flow and controlled vocabulary. |
| `00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Required source loaded by readback. Carries `uxpilote_chain`. |
| `00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Required source loaded by readback. Carries `uxpilote_chain_report`. |
| `00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Required source loaded by readback. Carries `uxpilote_chain_analysis`. |
| `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md` | DOCUMENTED_ONLY | UNKNOWN | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Required source loaded by readback. Root alternate source index was loaded later and lists many Studio refs, but this exact file was not observed in the loaded index excerpt. |
| `repos/games/TacticalChessPureLab/AGENTS.md` | NOT_FOUND | UNKNOWN | NOT_FOUND | NOT_FOUND | DOCUMENTED_ONLY | Required exact path missing. Alternate `C:/TACTICAL_CHESS_STUDIO/AGENTS.md` was found and loaded as alternate evidence only. |
| `repos/games/TacticalChessPureLab/docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md` | NOT_FOUND | UNKNOWN | NOT_FOUND | NOT_FOUND | DOCUMENTED_ONLY | Required exact path missing. Alternate root `docs/gpt-navigator/...` was found and loaded as alternate evidence only. |
| `repos/games/TacticalChessPureLab/docs/gpt-navigator/GPT_NAVIGATOR_REPO_NOTICE_V0.md` | NOT_FOUND | UNKNOWN | NOT_FOUND | NOT_FOUND | DOCUMENTED_ONLY | Required exact path missing. Alternate root `docs/gpt-navigator/...` was found and loaded as alternate evidence only. |
| `repos/games/TacticalChessPureLab/docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md` | NOT_FOUND | UNKNOWN | NOT_FOUND | NOT_FOUND | DOCUMENTED_ONLY | Required exact path missing. Alternate root source index was found and loaded as alternate evidence only. |
| `repos/games/TacticalChessPureLab/docs/gpt-navigator/GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md` | NOT_FOUND | UNKNOWN | NOT_FOUND | NOT_FOUND | DOCUMENTED_ONLY | Required exact path missing. Alternate root upload checklist was found and loaded as alternate evidence only. |
| `00_STUDIO_CONTROL/05_STATUS/UXPILOTE_PHASE_2_CLOSURE_STATUS_V0.md` | DOCUMENTED_ONLY | UNKNOWN | DOCUMENTED_ONLY | PASSIVE | DOCUMENTED_ONLY | Optional source loaded by readback. |
| `00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | PASSIVE | DOCUMENTED_ONLY | Optional supporting registry loaded because source anchoring names it as route/owner/consumer/status/evidence authority. |

## Route Check

| Check | Status | Evidence |
| --- | --- | --- |
| Output routing required | DOCUMENTED_ONLY | Task creates exactly one file. |
| Output routing present | DOCUMENTED_ONLY | Task route declared `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md`. |
| Destination exists before write | PASSIVE | `Test-Path` returned `False`. |
| Destination allowed | DOCUMENTED_ONLY | Routing policy routes status reports to `05_STATUS`; generated reports are not active truth by default. |
| Forbidden destinations avoided | DOCUMENTED_ONLY | Output was not placed in root, `12_PIPELINE_OPENING_LEGACY`, `lab`, runtime, test, dataset, model, or run directories. |
| Registration required | PASSIVE | Task declared registration not required. |
| Promotion gate | DOCUMENTED_ONLY | HumanGate. |

## Output Routing Result

| Field | Value |
| --- | --- |
| produced_file_type | read_only_audit_report |
| intended_surface | artifacts_runtime_outputs |
| canonical_destination | NONE |
| temporary_destination | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md |
| actual_destination | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md |
| retention_policy | temporary passive audit evidence, not canonical truth |
| promotion_gate | HumanGate |
| output_routing_result | IMPLEMENTED |

## Workflow Map

### Control Workflow Components

| Component | Status | Surface | Observed role |
| --- | --- | --- | --- |
| Source Anchoring | DOCUMENTED_ONLY | canonical_docs | Prevents treating created files, memory, or conversational context as loaded truth. Requires created, registered, loaded, enforced, and evidenced states. |
| Output Routing | DOCUMENTED_ONLY | canonical_docs | Requires surface, owner, destination, authority, duplicate prevention, and HumanGate route decision on ambiguity. |
| Topology Migration | DOCUMENTED_ONLY | canonical_docs | Defines unique-prefix `00_STUDIO_CONTROL` topology and marks legacy opening pipeline passive. |
| AutoDev I/O Contract | DOCUMENTED_ONLY | canonical_docs | Defines `task_charter_input -> executor_report_output -> analysis_agent_record`. |
| Task Charter Template | DOCUMENTED_ONLY | canonical_docs | Pre-execution scope, surfaces, output routing, UxPilote chain, blocked actions, validation, and expected executor output. |
| Executor Report Template | DOCUMENTED_ONLY | canonical_docs | Post-execution evidence: preflight, source state, route check, output result, files changed, commands, validation, risks, verdicts. |
| Analysis Agent Record Template | DOCUMENTED_ONLY | canonical_docs | Future passive analysis of charter/report quality, routing compliance, UxPilote chain consistency, and risks. |
| Prompt Gate | DOCUMENTED_ONLY | canonical_docs | Root alternate source says no source readback, no loaded template, no output routing, and no task charter means no Codex prompt. Required exact repo-local path was not found. |
| UxPilote Chain Control | DOCUMENTED_ONLY | roadmap_docs_only/canonical_docs candidate | Defines chain builder, dependent menus, six-field chain grammar, fragmented audit pipeline, and blocked activation. |
| HumanGate | DOCUMENTED_ONLY | canonical_docs | Final authority for mutation, activation, promotion, claims, costly runs, Git actions, and bounded next steps. |

### Method Chains

| Chain | Status | Evidence |
| --- | --- | --- |
| Hygiene | DOCUMENTED_ONLY | UxPilote defines Hygiene as drift/routing/missing-field/duplicate detection with read-only default authority. |
| Truth | DOCUMENTED_ONLY | UxPilote and source-anchoring docs define separation of evidence, unknowns, blocked surfaces, and claims. |
| Upgrade | DOCUMENTED_ONLY | UxPilote defines Upgrade as bounded improvement proposal, not implementation. |
| HumanGate | DOCUMENTED_ONLY | UxPilote and AGENTS alternate evidence preserve HumanGate as final authority. |
| Prompt Gate | DOCUMENTED_ONLY with NOT_FOUND exact anchor | Root alternate prompt gate loaded; required exact repo-local prompt gate missing. |
| Source Anchoring | DOCUMENTED_ONLY | Required Studio source loaded. |
| Output Routing | DOCUMENTED_ONLY | Required Studio source loaded. |
| AutoDev I/O | DOCUMENTED_ONLY | Contract and templates loaded. |
| UxPilote Fragmented Audit Pipeline | DOCUMENTED_ONLY | Cartographer -> HygieneAgent -> TruthAgent -> FusionAuditor -> CartographerRedTeam -> HumanGate. |

### Workflow Chains

```text
source created -> source registered -> source loaded -> rule enforced -> evidence reported
```

```text
task_charter_input -> executor_report_output -> analysis_agent_record
```

```text
uxpilote_chain -> uxpilote_chain_report -> uxpilote_chain_analysis
```

```text
Chain Candidate -> Cartographer -> HygieneAgent -> TruthAgent -> FusionAuditor -> CartographerRedTeam -> HumanGate
```

```text
No source readback -> no Codex prompt.
No loaded template -> no task charter.
No output routing -> no file-producing task charter.
No task charter -> no Codex patch.
No executor report -> no analysis-agent record.
No source-backed agent -> no agent conclusion.
```

## C4 Text Map

### Context

| System | Status | Description |
| --- | --- | --- |
| Studio Control | DOCUMENTED_ONLY | Local-only control cockpit for routing, source anchoring, forms, status, boundaries, registries, roadmaps, and passive evidence. |
| TacticalChessPureLab runtime | PASSIVE | Runtime truth remains outside this audit. No runtime code was inspected as implementation authority. |
| GPT Navigator | DOCUMENTED_ONLY with NOT_FOUND exact anchors | Prompt/router role depends on source index, prompt gate, repo notice, and upload checklist. Required exact repo-local anchors were missing; root alternates were loaded. |
| Codex bounded executor | PASSIVE | Executes only bounded tasks after explicit HumanGate authorization and AGENTS doctrine. No runtime execution occurred here. |
| Future read-only analysis agent | BLOCKED/PASSIVE | Templates exist, but activation and mutation remain blocked. |
| HumanGate | DOCUMENTED_ONLY | Human authority for merge, reject, freeze, promotion, activation, claim, and Git actions. |

### Containers

| Container | Status | Role |
| --- | --- | --- |
| `00_INDEX` | DOCUMENTED_ONLY | Read-first index and status legend surface. |
| `01_MAPS` | DOCUMENTED_ONLY | Topology, output routing, UxPilote chain control, maps, path contracts. |
| `02_NAVIGATION` | DOCUMENTED_ONLY | Source anchoring and navigation rules. |
| `03_REGISTRIES` | DOCUMENTED_ONLY | File/agent/loop/project registries and route/owner evidence. |
| `04_BOUNDARIES` | DOCUMENTED_ONLY | HumanGate, claims, data, path, repo hygiene, responsible-use boundaries. |
| `05_STATUS` | DOCUMENTED_ONLY/PASSIVE | Status, closure, migration, truth-audit, and passive report records. |
| `06_CODEX` | DOCUMENTED_ONLY | Codex operating documents, prompts, levels, loop docs, reports. |
| `07_FORMS` | DOCUMENTED_ONLY | AutoDev contract and structured templates. |
| `08_MIGRATION` | PASSIVE/DOCUMENTED_ONLY | Migration runbooks and historical evidence. |
| `09_CYBERDEFENSE` | DOCUMENTED_ONLY | CyberSentinel and security boundary docs. |
| `10_ROADMAP` | roadmap_docs_only | UxPilote ecosystem, prototype candidates, garden, datasets/models/scripts names-only audits, future plans. |
| `11_PIPELINE_CORE` | DOCUMENTED_ONLY | Generic pipeline core. |
| `12_PIPELINE_OPENING_LEGACY` | PASSIVE | Legacy opening package; no new active outputs. |
| `13_BOOTSTRAP_PROFILES` | DOCUMENTED_ONLY | Machine bootstrap profiles. |

### Components

| Component | Container | Status | Notes |
| --- | --- | --- | --- |
| `STUDIO_SOURCE_ANCHORING_V0.md` | `02_NAVIGATION` | DOCUMENTED_ONLY | Source-state doctrine. |
| `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | `01_MAPS` | DOCUMENTED_ONLY | Route, surface, duplicate, and forbidden destination rules. |
| `STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` | `05_STATUS` | DOCUMENTED_ONLY | Unique-prefix topology evidence. |
| `STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | `07_FORMS` | DOCUMENTED_ONLY | Canonical I/O and status vocabulary. |
| `TASK_CHARTER_TEMPLATE_V0.yaml` | `07_FORMS` | DOCUMENTED_ONLY | Input contract and UxPilote chain fields. |
| `EXECUTOR_REPORT_TEMPLATE_V0.yaml` | `07_FORMS` | DOCUMENTED_ONLY | Execution evidence contract. |
| `ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` | `07_FORMS` | DOCUMENTED_ONLY | Passive analysis contract. |
| `UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md` | `01_MAPS` | DOCUMENTED_ONLY | Chain grammar, UX model, audit pipeline, lifecycle. |
| `FILE_REGISTRY.yaml` | `03_REGISTRIES` | DOCUMENTED_ONLY | Route/owner/consumer/status/evidence registry. |
| Root `AGENTS.md` alternate | workspace root | DOCUMENTED_ONLY | Loaded as alternate evidence only. Required repo-local AGENTS path was missing. |
| Root `docs/gpt-navigator/*` alternates | workspace root docs | DOCUMENTED_ONLY | Loaded as alternate evidence only. Required repo-local Navigator paths were missing. |

### Code / Files

No active runtime code, test code, datasets, models, checkpoints, lab run folders, or `latest.json` were created or modified. The only created file is this passive report.

## Duplicate Or Overlap Findings

| Finding | Status | Evidence |
| --- | --- | --- |
| Prompt gate and source anchoring overlap intentionally | DOCUMENTED_ONLY | Prompt gate requires source readback; source anchoring defines created/registered/loaded/enforced/evidenced. |
| Output routing appears in multiple layers | DOCUMENTED_ONLY | Routing policy, AutoDev contract, task charter template, executor report template, and UxPilote file-output gate all require routing. This is deliberate but should share one machine-readable schema to avoid drift. |
| UxPilote chain fields duplicate AutoDev envelope concerns | DOCUMENTED_ONLY | Task charter `uxpilote_chain` restates actor, scope, route, blocked actions, validation, and HumanGate. Useful for UI, but it overlaps with the contract envelope. |
| Status/verdict vocabulary repeated across docs/templates | DOCUMENTED_ONLY | Controlled statuses and surfaces appear in AGENTS, routing policy, contract, templates, prompt gate, and UxPilote docs. A single generated enum/source would reduce mismatch risk. |
| Root-level Navigator alternates conflict with required repo-local paths | BLOCKED | Exact `repos/games/TacticalChessPureLab/...` paths are missing while root `docs/gpt-navigator/...` and root `AGENTS.md` exist. Do not silently substitute. |

## Stale Or Passive Findings

| Finding | Status | Evidence |
| --- | --- | --- |
| `12_PIPELINE_OPENING_LEGACY` is passive | PASSIVE | Topology migration and routing policy mark it as legacy traceability only; no new active outputs should route there. |
| UxPilote Phase 3 prototype artifacts are roadmap/candidate-only | PASSIVE | `10_ROADMAP/UXPILOTE_PROTOTYPE_CANDIDATE_ONLY` and Godot candidate files exist under roadmap; activation remains blocked without HumanGate. |
| UxPilote Phase 2 is closed as docs-only | DOCUMENTED_ONLY | Optional Phase 2 closure source states template chain fields exist and runtime/prototype work remains blocked. |
| Future analysis agent remains blocked from mutation | BLOCKED | Analysis-agent template and UxPilote docs explicitly block file updates, runtime execution, tests, training, benchmarks, datasets, models, activation, Git actions. |
| Required TacticalChessPureLab repo path appears stale or moved | NOT_FOUND | `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab` was absent; `repos/games` contained `ChessTCG` and `studioV2_MIGRATED_HOLD`. |

## UxPilote Reuse Candidates

| Candidate | Status | Reuse value | Boundary |
| --- | --- | --- | --- |
| Chain Builder fields | DOCUMENTED_ONLY | Direct UI schema: chain type, zone, subzone, action mode, authority, Qui/Quoi/Quand/Comment/Ou/Pourquoi. | Candidate-only unless HumanGate authorizes implementation. |
| Evidence Board | DOCUMENTED_ONLY | Reusable status-by-surface panel using controlled status values. | Must not produce global ready/not-ready verdict. |
| Route Check panel | DOCUMENTED_ONLY | Can display output routing, destination allowed, forbidden destinations, duplicate checks, route result. | No write without route and HumanGate. |
| Source-State panel | DOCUMENTED_ONLY | Can show created/registered/loaded/enforced/evidenced per source. | Missing required source means BLOCKED or UNKNOWN, not inferred. |
| Fragmented Audit Pipeline visualization | DOCUMENTED_ONLY | Can show Cartographer, HygieneAgent, TruthAgent, FusionAuditor, CartographerRedTeam, HumanGate as passive stages. | Agents are not activated by visualization. |
| Patch Lab candidate view | roadmap_docs_only | Can prepare task-charter and validation-plan candidates. | Must not mutate files by default. |
| File registry-backed navigation | DOCUMENTED_ONLY | `FILE_REGISTRY.yaml` can seed owner/consumer/status/evidence display. | Registry presence does not prove loaded/enforced/evidenced state. |

## Broken Or Ambiguous Routes

| Route | Status | Issue |
| --- | --- | --- |
| Required repo-local Navigator anchors | NOT_FOUND | Exact required paths under `repos/games/TacticalChessPureLab` are absent. Root alternates exist but are not the same route. |
| UxPilote spec registration | UNKNOWN | The loaded root source index excerpt did not show `UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md`; optional Phase 2 closure claims it is registered, but this audit did not verify that claim in the loaded index. |
| Report intended surface vs physical folder | DOCUMENTED_ONLY | Task declares intended surface `artifacts_runtime_outputs` but routes the temporary report to `05_STATUS`. Routing policy allows generated reports/status records there, but the report must remain passive and not canonical truth. |
| Studio Control Git tracking | PASSIVE | Routing policy and registry describe `00_STUDIO_CONTROL` as local-only, GitHub presence not expected. This audit did not stage or commit. |

## Professionalization Next Steps

1. Resolve the source-anchor path split: either restore/register `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/...` or update the task/source index to the current root-level paths through HumanGate.
2. Promote one registry-backed source index for Studio Control that explicitly lists UxPilote, AutoDev forms, routing, source anchoring, prompt gate, and status records with owner/consumer/status/evidence fields.
3. Create one machine-readable schema for controlled statuses, surfaces, locked actions, route checks, and verdicts, then have templates refer to it instead of copying vocabularies.
4. Treat UxPilote as a read-only interface candidate first: Source-State panel, Route Check panel, Evidence Board, Chain Builder, and passive pipeline visualization.
5. Add a HumanGate decision record before any prototype implementation, with exact files, route, validation, and no runtime/test/dataset/model/Git authority.
6. Keep roadmap candidate artifacts under `10_ROADMAP` until promoted; do not treat prototype folders as active UI/runtime.
7. Add a narrow read-only follow-up audit for `FILE_REGISTRY.yaml` coverage gaps, especially whether UxPilote and root Navigator alternates are registered under the intended current paths.

## Status By Surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Not inspected as implementation authority; no runtime code modified. |
| tests | PASSIVE | No tests run or modified. |
| artifacts_runtime_outputs | IMPLEMENTED | One routed passive audit report was created. |
| canonical_docs | PASSIVE | Existing canonical docs were read only. |
| roadmap_docs_only | PASSIVE | Existing roadmap docs/candidates were observed only. |
| inference | PASSIVE | Classifications and reuse candidates are audit inferences, not authority. |

## Files Changed

| Path | Surface | Change status | Operation | Summary |
| --- | --- | --- | --- | --- |
| `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md` | artifacts_runtime_outputs | IMPLEMENTED | create | Created exactly one routed passive audit report. |

## Commands Run

| Command | Purpose | Result |
| --- | --- | --- |
| `Get-Location` | Report current directory. | PASSIVE: returned `C:/TACTICAL_CHESS_STUDIO`. |
| `git rev-parse --is-inside-work-tree` | Check Git repository. | PASSIVE: returned `true`. |
| `git status --short --branch` | Report branch and pre-existing changes. | PASSIVE: returned `## master...origin/master`; no changed files before report creation. |
| `git rev-parse HEAD` | Report HEAD. | PASSIVE: returned `d0ace5ba466ad4e3b07b4cde20dd237ca0a0a248`. |
| `Get-ChildItem -Force -LiteralPath C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL` | List Studio Control directories. | PASSIVE: observed unique-prefix topology from `00_INDEX` through `13_BOOTSTRAP_PROFILES`. |
| `Test-Path -LiteralPath .../AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md` | Route existence check. | PASSIVE: returned `False`. |
| `Get-Content -Raw` for required Studio Control anchors and templates | Load required source anchors. | DOCUMENTED_ONLY: Studio anchors and templates loaded. |
| `Get-Content -Raw` for required repo-local anchors | Load required repo-local anchors. | NOT_FOUND: exact `repos/games/TacticalChessPureLab/...` anchors missing. |
| `Get-ChildItem -Force -LiteralPath C:/TACTICAL_CHESS_STUDIO/repos/games` | Investigate missing required repo path. | PASSIVE: found `ChessTCG` and `studioV2_MIGRATED_HOLD`, not `TacticalChessPureLab`. |
| `rg --files -g ... C:/TACTICAL_CHESS_STUDIO` | Search for missing anchor filenames. | PASSIVE: found root alternates under `C:/TACTICAL_CHESS_STUDIO` and `docs/gpt-navigator`. |
| `Get-Content -Raw` for root alternate Navigator/AGENTS files | Load alternate evidence only. | DOCUMENTED_ONLY: alternates loaded; not substituted for required exact paths. |
| `Get-Content -Raw FILE_REGISTRY.yaml` | Load supporting registry authority. | DOCUMENTED_ONLY: registry loaded. |
| `rg --files C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL` | Inventory Studio Control files. | PASSIVE: file list observed. |
| `rg -n HygieneAgent... C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL` | Search workflow vocabulary. | PASSIVE: matched workflow terms across control docs and roadmap/status files. |
| `Get-Content -Raw .../AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md` | Read back created report. | DOCUMENTED_ONLY: full report readback succeeded. |
| `git diff --check` | Docs-only whitespace validation. | DOCUMENTED_ONLY: command returned no output. |
| `git status --short --branch` | Final changed-file check. | PASSIVE: final status showed only `?? 00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md`. |

## Validation

| Validation item | Status | Evidence |
| --- | --- | --- |
| Report readback | DOCUMENTED_ONLY | Full `Get-Content -Raw` readback of the created report succeeded. |
| Docs-only diff check | DOCUMENTED_ONLY | `git diff --check` returned no output. |
| Final file-change check | PASSIVE | `git status --short --branch` showed the report as the only changed file. |

## Skipped Validation

| Validation item | Surface | Status | Reason |
| --- | --- | --- | --- |
| Runtime execution | active_runtime_code | BLOCKED | Explicitly out of scope. |
| Tests | tests | BLOCKED | Explicitly out of scope. |
| Benchmarks | artifacts_runtime_outputs | BLOCKED | Explicitly forbidden and not proof. |
| Training | inference | BLOCKED | Explicitly forbidden. |
| Dataset generation/reset | artifacts_runtime_outputs | BLOCKED | Explicitly forbidden. |
| Commit/push/branch/PR | canonical_docs | BLOCKED | Explicitly forbidden. |
| Required repo-local source conclusions | canonical_docs | BLOCKED | Exact required paths were `NOT_FOUND`; root alternates cannot replace them without HumanGate/source-index decision. |

## Risks

| Risk | Surface | Status | Mitigation |
| --- | --- | --- | --- |
| Exact required source anchors missing | canonical_docs | BLOCKED | Treat repo-local Navigator/AGENTS evidence as incomplete until route split is resolved. |
| Root alternate substitution risk | canonical_docs | BLOCKED | Alternates were read only as discovered evidence and not promoted to required exact-path truth. |
| Vocabulary drift across repeated templates | canonical_docs | UNKNOWN | Recommend shared schema/enums before interface work. |
| Roadmap prototype mistaken for implementation | roadmap_docs_only | BLOCKED | Keep UxPilote prototype candidates passive until HumanGate implementation task. |
| Runtime/status confusion | active_runtime_code | PASSIVE | No runtime code was inspected or modified; no implementation claim made. |

## Verdicts

software_verdict:

| Surface | Status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | IMPLEMENTED |
| canonical_docs | PASSIVE |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |

evidence_verdict:

| Surface | Status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | DOCUMENTED_ONLY |
| canonical_docs | BLOCKED |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |

claim_verdict:

| Surface | Status |
| --- | --- |
| active_runtime_code | NO_CLAIM_ALLOWED |
| tests | NO_CLAIM_ALLOWED |
| artifacts_runtime_outputs | NO_CLAIM_ALLOWED |
| canonical_docs | NO_CLAIM_ALLOWED |
| roadmap_docs_only | NO_CLAIM_ALLOWED |
| inference | NO_CLAIM_ALLOWED |

No global ready or not-ready verdict is made.
