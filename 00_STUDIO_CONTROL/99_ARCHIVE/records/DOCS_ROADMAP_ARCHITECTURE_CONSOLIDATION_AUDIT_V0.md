# Docs Roadmap Architecture Consolidation Audit V0

task_id: DOCS-CONSOLIDATION-AUDIT-001
status: DOCUMENTED_ONLY
surface: artifacts_runtime_outputs
owner: HumanGate
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true

## executive_summary

This is a passive consolidation audit of repository documentation and Studio Control documentation. It creates a decision packet only.

Scoped inventory found 340 Markdown/YAML documentation or control files across `AGENTS.md`, `README.md`, `MASTER_DOCS/`, `docs/`, and `00_STUDIO_CONTROL/`.

Main findings:

- The read-first canonical set is already declared in `README.md`, `MASTER_DOCS/DOCS_STATUS.md`, `GPT_NAVIGATOR_SOURCE_INDEX_V0.md`, and `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md`.
- `MASTER_DOCS/CURRENT_STATE_INDEX.md` contains stale hardcoded local/GitHub branch and SHA claims and should be treated as reference/local-history only until refreshed.
- `MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md` deliberately preserves local-history claims and should remain reference-only, not first-read truth.
- `00_STUDIO_CONTROL/05_STATUS/` contains many passive status/audit reports. They are evidence records by existence, not canonical truth.
- `00_STUDIO_CONTROL/10_ROADMAP/` contains roadmap-only work. None authorizes runtime, agent, model, dataset, benchmark, Git, or claim action.
- One exact duplicate pair was found by SHA256: `docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md` and `00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md`.
- Many old nested repo path references still point at `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab`; current preflight root is `C:/TACTICAL_CHESS_STUDIO`.
- `scripts/uxpilote` was not inspected. Its status remains UNKNOWN and out of scope.

No merge, archive, move, rename, delete, registry edit, source-index edit, upload-checklist edit, runtime command, test command, benchmark, training, commit, push, branch, or PR was performed.

## preflight

codex_runtime:

- requested_model: gpt-5.5
- requested_reasoning_effort: high
- task_class: repo_audit
- actual_runtime: UNKNOWN
- actual_runtime_evidence: Codex did not expose an exact runtime identifier.
- runtime_status: BLOCKED
- runtime_claim_rule: Do not claim the exact runtime model unless Codex exposes it explicitly.

repository:

- location: `C:\TACTICAL_CHESS_STUDIO`
- git_toplevel: `C:/TACTICAL_CHESS_STUDIO`
- branch: `master`
- head: `c7fd41fff55c61d57919759e82196af84573b5ef`
- worktree_status: PASSIVE
- pre_existing_changes:
  - `?? scripts/uxpilote/`

scope notes:

- `scripts/uxpilote` status: UNKNOWN, out of scope, not inspected.
- Target report did not exist before this task.
- `rg` was requested by method but was not available in this shell; PowerShell read-only inventory was used.

## source_state

created:

- `00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md`: DOCUMENTED_ONLY

registered:

- New audit report: NOT_FOUND
- Registration was not required by the task charter and was blocked by scope.

loaded:

- Required read-first sources were loaded by explicit `Get-Content` readback: DOCUMENTED_ONLY
- Full scoped documentation inventory was loaded by path inventory and header/status extraction: PASSIVE
- `scripts/uxpilote`: UNKNOWN, not loaded.

enforced:

- Output routing enforced by creating only the routed audit report under `00_STUDIO_CONTROL/05_STATUS/`: DOCUMENTED_ONLY
- Existing docs modification, archive, move, rename, delete, registry/source-index/checklist updates, runtime execution, tests, benchmark, training, dataset, model, Git, PR, and agent actions remained BLOCKED.

evidenced:

- Preflight, inventory, readback, duplicate detection, stale-pattern search, target-file creation, readback validation, diff validation, and final worktree status are recorded in this report: DOCUMENTED_ONLY

Core rule preserved:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

## route_check

- output_routing_required: true
- output_routing_present: true
- destination_allowed: DOCUMENTED_ONLY
- actual_destination: `00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md`
- forbidden_destination_absent: DOCUMENTED_ONLY
- registration_required: false
- project_source_upload_required: false
- promotion_gate: HumanGate

## output_routing_result

- produced_file_type: read-only docs consolidation audit report
- intended_surface: artifacts_runtime_outputs
- canonical_destination: NONE
- temporary_destination: `00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md`
- actual_destination: `00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md`
- retention_policy: passive audit evidence only; not canonical truth unless HumanGate promotes
- registration_required: false
- project_source_upload_required: false
- promotion_gate: HumanGate

## inventory_method

Read-first sources were read before writing this report:

- `AGENTS.md`
- `README.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md`
- `docs/gpt-navigator/GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md`
- `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md`
- `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
- `00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md`
- `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md`
- `00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml`
- `00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml`
- `00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml`
- `00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml`
- `MASTER_DOCS/DOCS_STATUS.md`
- `MASTER_DOCS/00_EXEC_SUMMARY.md`
- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`

Additional family readback:

- `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md`
- `MASTER_DOCS/CURRENT_STATE_INDEX.md`
- `MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md`
- `00_STUDIO_CONTROL/00_INDEX/CONTROL_INDEX.md`
- `00_STUDIO_CONTROL/10_ROADMAP/ROADMAP_INDEX.md`

Inventory classification used:

- path family
- first heading
- declared status line where present
- source-index/checklist/registry references where evidenced
- authority language
- claim posture language
- source-state language
- overlap groups and duplicate names
- stale path and hardcoded claim search patterns

## inventory_counts_by_directory

Top-level scoped counts:

| directory | count |
| --- | ---: |
| `00_STUDIO_CONTROL` | 184 |
| `docs` | 99 |
| `MASTER_DOCS` | 55 |
| `AGENTS.md` | 1 |
| `README.md` | 1 |
| total | 340 |

Subdirectory counts:

| directory | count |
| --- | ---: |
| `00_STUDIO_CONTROL/00_INDEX` | 3 |
| `00_STUDIO_CONTROL/01_MAPS` | 16 |
| `00_STUDIO_CONTROL/02_NAVIGATION` | 1 |
| `00_STUDIO_CONTROL/03_REGISTRIES` | 14 |
| `00_STUDIO_CONTROL/04_BOUNDARIES` | 13 |
| `00_STUDIO_CONTROL/05_STATUS` | 49 |
| `00_STUDIO_CONTROL/06_CODEX` | 13 |
| `00_STUDIO_CONTROL/07_FORMS` | 17 |
| `00_STUDIO_CONTROL/08_MIGRATION` | 6 |
| `00_STUDIO_CONTROL/09_CYBERDEFENSE` | 3 |
| `00_STUDIO_CONTROL/09_RAG` | 1 |
| `00_STUDIO_CONTROL/10_ROADMAP` | 36 |
| `00_STUDIO_CONTROL/11_PIPELINE_CORE` | 2 |
| `00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY` | 8 |
| `00_STUDIO_CONTROL/13_BOOTSTRAP_PROFILES` | 2 |
| `docs/control-plane` | 81 |
| `docs/evidence` | 12 |
| `docs/gpt-navigator` | 5 |
| `docs/studioV2` | 1 |
| `MASTER_DOCS/ARCHIVE` | 29 |
| `MASTER_DOCS root files` | 26 |

## inventory_counts_by_surface

| surface | count | status |
| --- | ---: | --- |
| active_runtime_code | 0 | PASSIVE |
| tests | 0 | PASSIVE |
| artifacts_runtime_outputs | 56 | DOCUMENTED_ONLY |
| canonical_docs | 187 | PASSIVE |
| roadmap_docs_only | 68 | PASSIVE |
| inference | 0 | PASSIVE |
| reference_or_archive_docs | 29 | PASSIVE |

Notes:

- Counts are documentation-surface classifications, not runtime implementation claims.
- `artifacts_runtime_outputs` includes passive status/audit/evidence report files, primarily `00_STUDIO_CONTROL/05_STATUS` plus evidence seed docs.
- `reference_or_archive_docs` is reported separately for clarity; it maps to PASSIVE documentation context, not a separate controlled surface.

## inventory_counts_by_status

| status | count | meaning in this audit |
| --- | ---: | --- |
| DOCUMENTED_ONLY | 243 | docs/control/report/form/policy/roadmap file exists or declares docs-only status |
| PASSIVE | 84 | archive, reference, legacy, generated report, fixture, or evidence context only |
| BLOCKED | 9 | action authority blocked in the document family or source state |
| UNKNOWN | 4 | incomplete or out-of-scope status, including `scripts/uxpilote` |
| IMPLEMENTED | 0 | no implementation claim made from docs in this audit |
| TESTED | 0 | no test claim made from docs in this audit |
| NOT_FOUND | 0 | no scoped required doc was missing from readback |

## canonical_keep_candidates

Recommendation class: KEEP_CANONICAL.

| path | status | registered/listed state | authority_boundary |
| --- | --- | --- | --- |
| `AGENTS.md` | DOCUMENTED_ONLY | listed in SOURCE_INDEX | repository doctrine; no runtime proof |
| `README.md` | DOCUMENTED_ONLY | listed in SOURCE_INDEX | read-first entrypoint; no runtime proof |
| `MASTER_DOCS/DOCS_STATUS.md` | DOCUMENTED_ONLY | listed in SOURCE_INDEX | current docs classification anchor |
| `MASTER_DOCS/00_EXEC_SUMMARY.md` | DOCUMENTED_ONLY | listed in SOURCE_INDEX | current summary; must not override live code/Git |
| `MASTER_DOCS/01_CURRENT_STATE.md` | DOCUMENTED_ONLY | listed in SOURCE_INDEX | current state summary; live Git required for branch/HEAD |
| `MASTER_DOCS/03_KNOWN_ISSUES.md` | DOCUMENTED_ONLY | listed in SOURCE_INDEX | canonical active issue list |
| `MASTER_DOCS/05_ARCHITECTURE.md` | DOCUMENTED_ONLY | listed in SOURCE_INDEX | architecture boundary; code outranks docs |
| `docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md` | DOCUMENTED_ONLY | self-listed | source classification anchor |
| `docs/gpt-navigator/GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md` | DOCUMENTED_ONLY | listed in SOURCE_INDEX | upload workflow guard; listing is not loaded state |
| `docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md` | DOCUMENTED_ONLY | listed in SOURCE_INDEX | prompt gate; no execution authority |
| `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | DOCUMENTED_ONLY | registered/listed | routing policy; no runtime authority |
| `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` | DOCUMENTED_ONLY | registered/listed | source-state rule; no runtime authority |
| `00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` | DOCUMENTED_ONLY | listed | current topology migration status |
| `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | DOCUMENTED_ONLY | registered/listed | canonical I/O contract |
| `00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | registered/listed | form template; no execution authority |
| `00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | registered/listed | form template; no execution authority |
| `00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | listed; not found in FILE_REGISTRY excerpt | form template; no agent activation |
| `00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml` | DOCUMENTED_ONLY | self-registered | route/owner/consumer/evidence registry |
| `00_STUDIO_CONTROL/00_INDEX/CONTROL_INDEX.md` | DOCUMENTED_ONLY | registered | Studio Control entrypoint |
| `00_STUDIO_CONTROL/10_ROADMAP/ROADMAP_INDEX.md` | DOCUMENTED_ONLY | registered | roadmap grouping only |

## merge_candidates

Recommendation class: MERGE_CANDIDATE or REVIEW_REQUIRED. No merge performed.

| group | candidate paths | reason | HumanGate next decision |
| --- | --- | --- | --- |
| Master current-state family | `MASTER_DOCS/DOCS_STATUS.md`, `MASTER_DOCS/00_EXEC_SUMMARY.md`, `MASTER_DOCS/01_CURRENT_STATE.md`, `MASTER_DOCS/05_ARCHITECTURE.md`, `MASTER_DOCS/CURRENT_STATE_INDEX.md`, `MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md` | overlapping branch/local-stack/state surfaces; `CURRENT_STATE_INDEX` has stale hardcoded local/GitHub claims | Decide whether to refresh `CURRENT_STATE_INDEX` or demote it to reference-only |
| Known issues lineage | `MASTER_DOCS/03_KNOWN_ISSUES.md`, `MASTER_DOCS/ARCHIVE/CONTEXT/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md` | active issue list has a historical predecessor pointer | Keep active canonical issue list; preserve predecessor as archive context |
| Architecture roadmap family | `MASTER_DOCS/05_ARCHITECTURE.md`, `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`, `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`, `docs/control-plane/ENGINE_SEARCH_NEURAL_*` | architecture and roadmap material overlaps but has different authority levels | Do not collapse without a bounded docs charter |
| Automation/control-plane family | `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`, `MASTER_DOCS/AUTOMATION_*`, `docs/control-plane/*`, `00_STUDIO_CONTROL/11_PIPELINE_CORE/*`, `00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY/*` | several control-plane layers repeat loop, gate, HumanGate, and report semantics | Decide one active control-plane map; keep legacy package passive |
| UxPilote Phase 3 family | `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_*`, `00_STUDIO_CONTROL/05_STATUS/UXPILOTE_*`, `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_*` | roadmap/status/spec/report split is broad and easy to misread as active authority | Create a follow-up HumanGate charter for an index-only consolidation |
| RAG family | `00_STUDIO_CONTROL/05_STATUS/RAG_SOURCE_PACK_MANIFEST_V0.yaml`, `00_STUDIO_CONTROL/09_RAG/RAG_INDEX_ROUTE_AND_BACKEND_POLICY_V0.md`, `00_STUDIO_CONTROL/07_FORMS/LOCAL_RAG_SOURCE_PACK_V0.md` | manifest/policy/source-pack overlap; all deny activation | Keep reference-only until a separate RAG task is approved |

## archive_candidates

Recommendation class: ARCHIVE_CANDIDATE. No physical archive performed.

| path_or_family | status | reason |
| --- | --- | --- |
| `MASTER_DOCS/ARCHIVE/LEGACY_ROOT_DOCS/*.md` | PASSIVE | legacy root docs can conflict with current root docs |
| `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/*.md` | PASSIVE | legacy source-of-truth and runtime-update wording can mislead |
| `MASTER_DOCS/ARCHIVE/CONTEXT/08_REPRISE_PROMPT.md` | PASSIVE | old reprise prompt |
| `MASTER_DOCS/ARCHIVE/CONTEXT/11_GPT55_BROWSER_REPRISE_PROMPT.md` | PASSIVE | old browser handoff prompt; exact model claims are not current runtime evidence |
| `MASTER_DOCS/ARCHIVE/CONTEXT/16_MULTI_AGENT_STUDIO_CONSTITUTION.md` | PASSIVE | older multi-agent concept surface |
| `MASTER_DOCS/ARCHIVE/CONTEXT/17_PR_AGENT_TUTORIAL.md` | PASSIVE | older tutorial context |
| `MASTER_DOCS/ARCHIVE/CONTEXT/18_AGENT_REGISTRY.md` | PASSIVE | older registry context |
| `MASTER_DOCS/ARCHIVE/CONTEXT/19_AGENT_GUARDRAIL_POLICY.md` | PASSIVE | older guardrail context |
| `MASTER_DOCS/ARCHIVE/CONTEXT/20_LOCAL_AGENT_PR_OPERATOR.md` | PASSIVE | older operator context |
| `MASTER_DOCS/ARCHIVE/CONTEXT/28_AI_REVIEW_COUNCIL.md` | PASSIVE | review-council context only |
| `MASTER_DOCS/ARCHIVE/CONTEXT/29_FREE_CLEAN_OPERATOR_PACK.md` | PASSIVE | old future operator-pack direction |
| `MASTER_DOCS/ARCHIVE/CONTEXT/AUTOBATTLER_RELECTURE_2026_04_26/*.md` | PASSIVE | product-roadmap/idea context only |

Physical archive is BLOCKED without a separate HumanGate decision.

## reference_only_candidates

Recommendation class: KEEP_REFERENCE.

- `MASTER_DOCS/06_DECISION_LOG.md`
- `MASTER_DOCS/07_PROJECT_HISTORY.md`
- `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
- `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md`
- `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md`
- `MASTER_DOCS/LEARNING_TRACE_V1_STANDARD.md`
- `MASTER_DOCS/LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md`
- `docs/control-plane/README.md`
- `docs/control-plane/*CONTRACT*`
- `docs/control-plane/*POLICY*`
- `docs/control-plane/*MATRIX*`
- `docs/control-plane/*BOUNDARY*`
- `docs/control-plane/*PACKET*`
- `docs/control-plane/*SCHEMA*`
- `docs/evidence/ACTIONMASK_AUTHORITY_CONTRACT_V0.md`
- `docs/evidence/ACTIONMASK_PROVENANCE_CARRY_CONTRACT_V0.md`
- `docs/evidence/HUMANGATE_AUTHORIZATION_CONTRACT_V0.md`
- `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`
- `00_STUDIO_CONTROL/04_BOUNDARIES/*`
- `00_STUDIO_CONTROL/06_CODEX/*`
- `00_STUDIO_CONTROL/07_FORMS/*`
- `00_STUDIO_CONTROL/09_RAG/RAG_INDEX_ROUTE_AND_BACKEND_POLICY_V0.md`
- `00_STUDIO_CONTROL/11_PIPELINE_CORE/*`
- `00_STUDIO_CONTROL/13_BOOTSTRAP_PROFILES/*`

## passive_report_candidates

Recommendation class: PASSIVE_REPORT.

- `00_STUDIO_CONTROL/05_STATUS/*.md`
- `00_STUDIO_CONTROL/05_STATUS/*.yaml`
- `MASTER_DOCS/04_BENCHMARK_LEDGER.md`
- `docs/evidence/ROCKY_TRACE_EVIDENCE_SEED_V0/*`
- `docs/control-plane/*_AUDIT*.md`
- `docs/control-plane/*DRY_RUN*.md`
- `docs/control-plane/*SMOKE*.md`
- `docs/control-plane/*REPORT*.md`
- `docs/control-plane/fixtures/**`

Generated reports are not canonical truth by existence.

## roadmap_only_candidates

Recommendation class: ROADMAP_ONLY.

- `MASTER_DOCS/02_ROADMAP_90D.md`
- `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md`
- `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`
- `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_DECOMPOSITION_ROADMAP_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md`
- `docs/control-plane/CHESS960_CAMPAIGNPLAN_DRAFT_V0.md`
- `docs/control-plane/CHESS960_PATCHPLAN_APPROVAL_V0.md`
- `docs/control-plane/PATCHPACK_CAMPAIGN_PLAN_V0.md`
- `00_STUDIO_CONTROL/10_ROADMAP/**`

Roadmap docs remain useful planning context, not implementation or activation proof.

## unknown_or_blocked_candidates

Recommendation class: BLOCKED_NO_ACTION or UNKNOWN_REQUIRES_READBACK.

| item | status | reason |
| --- | --- | --- |
| `scripts/uxpilote/` | UNKNOWN | out of scope and not inspected |
| Any physical archive | BLOCKED | requires separate HumanGate |
| Any registry/source-index/checklist update | BLOCKED | not authorized by this audit |
| Any runtime/test/source inspection outside docs scope | BLOCKED | not authorized |
| Exact Codex runtime model | UNKNOWN/BLOCKED | not exposed by Codex |
| `MASTER_DOCS/CURRENT_STATE_INDEX.md` current branch/HEAD claims | UNKNOWN | file contains hardcoded older local/GitHub claims |
| Any `IMPLEMENTED_AND_TESTED` or `IMPLEMENTED_AND_TARGET_TESTED` doc claim | UNKNOWN until live code/test readback | outside this docs-only audit |

## duplicate_overlap_groups

Exact duplicate:

- `docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md`
- `00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md`
- SHA256: `EB6901A533526E8B24988206F4BEF6DA8A814F001B2A7923DC2066A1B4516986`
- recommendation_class: MERGE_CANDIDATE or ARCHIVE_CANDIDATE after HumanGate chooses the canonical route.

Duplicate filenames:

- `README.md`: 7 files
- `SESSION_STATE_TEMPLATE.md`: 2 files
- `PIPELINE_USAGE.md`: 2 files
- `PIPELINE_OPENING_CHECKLIST.md`: 2 files
- `READ_FIRST_PIPELINE.md`: 2 files
- `CODEX_LEVELS.md`: 2 files
- `KENPACHI_CODEX_LOCAL_PARAMETERS.md`: 2 files
- `HUMANGATE_DECISION_TEMPLATE.md`: 2 files
- `CODEX_STOP_CONDITIONS.md`: 2 files

Overlap groups:

- Master docs state/index/history overlap
- Engine/search/neural roadmap and passive adapter overlap
- Automation/control-plane loop and report-chain overlap
- UxPilote specs/status/reports/roadmaps overlap
- RAG manifest/source-pack/backend-policy overlap
- Pipeline core vs legacy opening pipeline overlap

## stale_or_conflicting_claims

Detected stale or conflict-prone patterns:

- `MASTER_DOCS/CURRENT_STATE_INDEX.md` hardcodes local `main` ahead of `origin/main`, `eddf4fac`, and `6a3314b573cb33350ad3a08a97112683d1ce4112`. Current preflight is branch `master`, HEAD `c7fd41fff55c61d57919759e82196af84573b5ef`.
- `MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md` intentionally preserves local-history claims. Keep reference-only.
- Several docs contain `IMPLEMENTED_AND_TESTED`, `IMPLEMENTED_AND_TARGET_TESTED`, or sample-test language. This audit did not inspect code/tests, so those claims remain historical documentation claims only.
- Several docs mention GPT-5.5/browser GPT-5.5. This audit cannot confirm actual runtime model; actual_runtime remains UNKNOWN/BLOCKED.
- Several docs mention `latest.json` and `lab/runs`; these are usually blocked or observation-only. No such outputs were created.
- Roadmap docs can read like active truth unless surfaced as ROADMAP_ONLY.
- Status/audit reports can read like canonical truth unless surfaced as PASSIVE_REPORT.

## source_registration_gaps

- `FILE_REGISTRY.yaml` registers a focused subset of Studio Control files, not all 184 Studio Control documentation files.
- `GPT_NAVIGATOR_SOURCE_INDEX_V0.md` lists a permanent and reference source set, not the full repo doc tree.
- `GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md` instructs manual upload and explicitly says listing/upload does not prove loaded state.
- `00_STUDIO_CONTROL/10_ROADMAP` contains many roadmap files; only `ROADMAP_INDEX.md` and selected architecture-plan entries were evidenced as registered in the registry excerpt.
- The new audit report is created but not registered, not uploaded, and not promoted.

## old_path_or_legacy_repo_references

Current preflight root:

- `C:\TACTICAL_CHESS_STUDIO`

Legacy/stale path references found:

- `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab`
- `C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab`
- `repos/games/TacticalChessPureLab`

Representative files with legacy path references:

- `MASTER_DOCS/DOCS_STATUS.md`
- `docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md`
- `00_STUDIO_CONTROL/06_CODEX/TASK_CHARTER_ERROR_TO_PUZZLE_ONE_PASS_V0.yaml`
- multiple `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_STUDIO_GARDEN_*` docs

Recommendation:

- Do not edit during this audit.
- Create a separate HumanGate docs charter to refresh path references where they are meant to describe the current active repo.

## HumanGate_decision_queue

1. Decide whether `MASTER_DOCS/CURRENT_STATE_INDEX.md` should be refreshed or demoted to reference-only because it hardcodes stale branch/HEAD/local-stack claims.
2. Decide the canonical home for `KENPACHI_CODEX_LOCAL_PARAMETERS.md`; one exact duplicate exists.
3. Decide whether to create a compact `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_INDEX_V0.md` or update `ROADMAP_INDEX.md` in a separate charter.
4. Decide whether `00_STUDIO_CONTROL/05_STATUS` needs a status-report index to prevent passive reports from becoming implied truth.
5. Decide whether `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md` should be the active archive-decision source or whether a newer Studio Control archive plan should supersede it.
6. Decide whether old nested repo path references should be refreshed globally or only in read-first docs.
7. Decide whether `FILE_REGISTRY.yaml` should register selected missing control-room docs or stay intentionally selective.

## recommended_next_actions

Recommended bounded follow-up tasks:

- `DOCS-CURRENT-STATE-INDEX-REFRESH-001`: refresh or demote `MASTER_DOCS/CURRENT_STATE_INDEX.md`; no runtime/test inspection unless explicitly authorized.
- `DOCS-KENPACHI-DUPLICATE-ROUTE-001`: decide canonical route for the exact duplicate `KENPACHI_CODEX_LOCAL_PARAMETERS.md`; no deletion without HumanGate.
- `DOCS-STATUS-INDEX-001`: create or update a passive index for `00_STUDIO_CONTROL/05_STATUS` reports.
- `DOCS-UXPILOTE-INDEX-001`: index UxPilote docs by surface and authority without reading or modifying `scripts/uxpilote`.
- `DOCS-OLD-PATH-REFRESH-001`: refresh current-root path references in active docs only.
- `DOCS-FILE-REGISTRY-GAP-REVIEW-001`: review registry gaps and decide whether registration should expand.

## files_changed

| path | surface | change_status | operation |
| --- | --- | --- | --- |
| `00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md` | artifacts_runtime_outputs | DOCUMENTED_ONLY | created |

No existing docs were modified.

## commands_run

Preflight:

- `Get-Location` -> DOCUMENTED_ONLY
- `git rev-parse --show-toplevel` -> DOCUMENTED_ONLY
- `git rev-parse --abbrev-ref HEAD` -> DOCUMENTED_ONLY
- `git rev-parse HEAD` -> DOCUMENTED_ONLY
- `git status --short --branch` -> DOCUMENTED_ONLY

Inventory and readback:

- `Test-Path 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md` -> DOCUMENTED_ONLY; target absent before creation.
- `rg --files -g "*.md" -g "*.yaml" -g "*.yml" ...` -> BLOCKED; `rg` not installed.
- `Get-Content AGENTS.md` -> DOCUMENTED_ONLY
- `Get-Content README.md` -> DOCUMENTED_ONLY
- `Get-Content docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md` -> DOCUMENTED_ONLY
- `Get-Content docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md` -> DOCUMENTED_ONLY
- `Get-Content docs/gpt-navigator/GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md` -> DOCUMENTED_ONLY
- `Get-Content 00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` -> DOCUMENTED_ONLY
- `Get-Content 00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` -> DOCUMENTED_ONLY
- `Get-Content 00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` -> DOCUMENTED_ONLY
- `Get-Content 00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` -> DOCUMENTED_ONLY
- `Get-Content 00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml` -> DOCUMENTED_ONLY
- `Get-Content 00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml` -> DOCUMENTED_ONLY
- `Get-Content 00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` -> DOCUMENTED_ONLY
- `Get-ChildItem -Path AGENTS.md,README.md,MASTER_DOCS,docs,00_STUDIO_CONTROL -Recurse -File -Include *.md,*.yaml,*.yml` -> DOCUMENTED_ONLY
- `Get-ChildItem ... | ForEach-Object { relative paths }` -> DOCUMENTED_ONLY
- `Get-ChildItem ... | Group-Object top-level` -> DOCUMENTED_ONLY
- `Get-ChildItem ... | Group-Object subdirectory` -> DOCUMENTED_ONLY
- `Get-ChildItem ... | header/status extraction` -> DOCUMENTED_ONLY
- `Select-String -Path FILE_REGISTRY.yaml -Pattern ...` -> DOCUMENTED_ONLY
- `Select-String -Path GPT_NAVIGATOR_SOURCE_INDEX_V0.md -Pattern ...` -> DOCUMENTED_ONLY
- `Select-String -Path GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md -Pattern ...` -> DOCUMENTED_ONLY
- `Select-String -Path scoped docs -Pattern stale/legacy claims` -> DOCUMENTED_ONLY
- `Get-ChildItem ... | Group-Object Name` -> DOCUMENTED_ONLY
- `Get-FileHash ... | Group-Object Hash` -> DOCUMENTED_ONLY
- `Get-Content MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md` -> DOCUMENTED_ONLY
- `Get-Content MASTER_DOCS/CURRENT_STATE_INDEX.md` -> DOCUMENTED_ONLY
- `Get-Content MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md` -> DOCUMENTED_ONLY
- `Get-Content 00_STUDIO_CONTROL/00_INDEX/CONTROL_INDEX.md` -> DOCUMENTED_ONLY
- `Get-Content 00_STUDIO_CONTROL/10_ROADMAP/ROADMAP_INDEX.md` -> DOCUMENTED_ONLY

Validation:

- `Test-Path 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md` -> DOCUMENTED_ONLY; returned `True`.
- `Get-Content 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md -TotalCount 80` -> DOCUMENTED_ONLY; readback succeeded.
- `Select-String -Path 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md -Pattern "merge_candidates|archive_candidates|canonical_keep_candidates|HumanGate|NO_CLAIM_ALLOWED|no_global_ready_verdict|scripts/uxpilote"` -> DOCUMENTED_ONLY; required patterns found.
- `git diff --check` -> DOCUMENTED_ONLY; no whitespace errors reported.
- `git diff -- 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md` -> PASSIVE; no patch output because the report is untracked and was not staged.
- `git status --short --branch` -> DOCUMENTED_ONLY; target report appears as untracked, and pre-existing `scripts/uxpilote/` remains untracked.

## validation

Expected level: DOCUMENTED_ONLY.

Validation results:

| command | result_status | evidence |
| --- | --- | --- |
| `Test-Path 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md` | DOCUMENTED_ONLY | returned `True` |
| `Get-Content 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md -TotalCount 80` | DOCUMENTED_ONLY | first 80 lines read back successfully |
| `Select-String -Path 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md -Pattern "merge_candidates|archive_candidates|canonical_keep_candidates|HumanGate|NO_CLAIM_ALLOWED|no_global_ready_verdict|scripts/uxpilote"` | DOCUMENTED_ONLY | required report tokens found |
| `git diff --check` | DOCUMENTED_ONLY | no whitespace errors reported |
| `git diff -- 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md` | PASSIVE | no patch output because file is untracked and was not staged |
| `git status --short --branch` | DOCUMENTED_ONLY | `?? 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md`; pre-existing `?? scripts/uxpilote/` still present |

## skipped_validation

- Runtime commands: BLOCKED by task scope.
- Tests: BLOCKED by task scope.
- Benchmarks: BLOCKED by task scope.
- Training: BLOCKED by task scope.
- RAG indexing, embeddings, vector DB, LLM/model calls: BLOCKED by task scope.
- Dataset commands: BLOCKED by task scope.
- `scripts/uxpilote` inspection: BLOCKED by task scope; status UNKNOWN.
- Physical archive validation: BLOCKED because no archive action was authorized or performed.

## risks

- The audit used family-level classification for 340 docs; deeper per-file semantic readback would require a longer follow-up task.
- Header/status extraction cannot prove implementation, tests, loading, enforcement, or promotion.
- Several docs preserve historical local-stack claims by design; they can be misread if used without live preflight.
- `FILE_REGISTRY`, `SOURCE_INDEX`, and `UPLOAD_CHECKLIST` provide registration/listing evidence only; they do not prove loaded/enforced/evidenced state.
- Exact runtime model is UNKNOWN.
- `scripts/uxpilote` remains UNKNOWN and out of scope.

## status_by_surface

| surface | status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | DOCUMENTED_ONLY |
| canonical_docs | PASSIVE |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |

## software_verdict

| surface | status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | DOCUMENTED_ONLY |
| canonical_docs | PASSIVE |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |

## evidence_verdict

| surface | status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | DOCUMENTED_ONLY |
| canonical_docs | PASSIVE |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |

## claim_verdict

| surface | status |
| --- | --- |
| active_runtime_code | NO_CLAIM_ALLOWED |
| tests | NO_CLAIM_ALLOWED |
| artifacts_runtime_outputs | NO_CLAIM_ALLOWED |
| canonical_docs | NO_CLAIM_ALLOWED |
| roadmap_docs_only | NO_CLAIM_ALLOWED |
| inference | NO_CLAIM_ALLOWED |

## no_global_ready_verdict

true

No global ready or not-ready verdict is made.
