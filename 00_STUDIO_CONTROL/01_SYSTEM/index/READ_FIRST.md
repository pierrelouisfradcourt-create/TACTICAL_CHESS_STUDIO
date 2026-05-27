# Studio Control Read First

status: DOCUMENTED_ONLY

## Purpose
This is the first Studio Control entrypoint. It selects the active control-plane anchors and then delegates generic pipeline rules to `11_PIPELINE_CORE`.

## Main Read-First Truth Set
Daily Studio Control navigation starts from this compact source-backed nucleus. Do not treat all non-archive Markdown as main truth.

| Status | Source | Role |
| --- | --- | --- |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/01_SYSTEM/index/READ_FIRST.md` | Studio Control opening order and source-set compression rule. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/00_MASTER_DOCS/DOCS_STATUS.md` | Current documentation classification anchor. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/00_MASTER_DOCS/CURRENT_STATE_INDEX.md` | Current-state navigation and demotion index. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/00_MASTER_DOCS/01_CURRENT_STATE.md` | Current project state summary. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/00_MASTER_DOCS/03_KNOWN_ISSUES.md` | Canonical active issue list. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/00_MASTER_DOCS/05_ARCHITECTURE.md` | Architecture authority order and runtime boundary. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/01_SYSTEM/navigation/STUDIO_SOURCE_ANCHORING_V0.md` | Source-state separation and source loading rules. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/01_SYSTEM/maps/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | Output routing and duplicate-prevention authority. |
| DOCUMENTED_ONLY | `00_STUDIO_CONTROL/01_SYSTEM/index/CONTROL_INDEX.md` | Compact Studio Control topology index. |

## Reference / On-Demand Sources
Most contracts, forms, registries, policies, passive specs, and roadmaps are on-demand reference sources.

Use these only when the task needs them:
- `00_STUDIO_CONTROL/00_MASTER_DOCS/00_EXEC_SUMMARY.md`
- `00_STUDIO_CONTROL/00_MASTER_DOCS/02_COMMAND_CHEATSHEET.md`
- `00_STUDIO_CONTROL/00_MASTER_DOCS/06_DECISION_LOG.md`
- `00_STUDIO_CONTROL/00_MASTER_DOCS/07_PROJECT_HISTORY.md`
- `00_STUDIO_CONTROL/00_MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md`

Temporary task reports and Codex audit reports remain task-specific unless HumanGate promotes them.

## Opening Order
1. Read this file.
2. Identify the target machine, target repo, target profile, and authorized studio workspace paths.
3. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/DOCS_STATUS.md`.
4. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/CURRENT_STATE_INDEX.md`.
5. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/01_CURRENT_STATE.md`.
6. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/03_KNOWN_ISSUES.md`.
7. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/05_ARCHITECTURE.md`.
8. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/navigation/STUDIO_SOURCE_ANCHORING_V0.md`.
9. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/maps/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`.
10. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/index/CONTROL_INDEX.md`.
11. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/99_ARCHIVE/records/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` only when topology drift or path rewrite questions are in scope.
12. Read contracts, forms, registries, policies, passive specs, roadmap docs, Codex operating docs, and pipeline packages only when the task requires them.

## Generic Pipeline
AUDIT -> DECISION -> ACTION_BOUNDED -> VALIDATION -> REPORT -> NEXT

## Target Resolution Rule
Resolve these before action:
- studio workspace
- target machine
- target repo or package path
- target profile
- HumanGate authorization

If any required target is missing: STOP and report `target_status: NOT_FOUND` or `target_status: UNKNOWN`.

## Status Tags
Use only: IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN.

## Surface Separation
Report separately:
- active runtime code
- tests
- outputs and runtime artifacts
- canonical docs
- roadmap or docs-only materials
- inference

## Verdict Discipline
Do not issue a global ready or not-ready verdict. Verdicts must be component-level and evidence-bound.

Default `claim_verdict`: NO_CLAIM_ALLOWED.

`no_global_ready_verdict: true`

Classic/Rocky runtime claims require code/test evidence, not docs-only evidence.

## Source State Discipline
For control-doc, Navigator, or source-registration work, always separate:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

Listing a source here does not prove it is loaded in a ChatGPT Project, enforced by a task, evidenced in a final report, or promoted by HumanGate.

Created != registered != loaded != enforced != evidenced.

## Duplicate Prevention
Do not use files under `08_MIGRATION/SNAPSHOTS`, `copied_sources`, `SOURCE_IMPORTS`, `BACKUPS`, or `LOCAL_ARCHIVE` as active sources. For file-producing work, apply the duplicate-prevention fields in `07_FORMS`.

## Uncertainty Rule
If destination, authority, source status, or scope is uncertain: STOP.
If a file is useful but not authorized, place it in quarantine only when a HumanGate decision explicitly allows quarantine.
