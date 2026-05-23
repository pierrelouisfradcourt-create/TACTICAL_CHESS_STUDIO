# Studio Control Read First

status: DOCUMENTED_ONLY

## Purpose
This is the first Studio Control entrypoint. It selects the active control-plane anchors and then delegates generic pipeline rules to `11_PIPELINE_CORE`.

## Opening Order
1. Read this file.
2. Identify the target machine, target repo, target profile, and authorized studio workspace paths.
3. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`.
4. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md`.
5. Read `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/11_PIPELINE_CORE/PIPELINE_CORE_INDEX.md` to confirm core/profile separation.
6. If machine bootstrap is in scope, read the selected bootstrap profile checklist under `13_BOOTSTRAP_PROFILES`.
7. Select the correct level from `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/06_CODEX/CODEX_LEVELS.md`.
8. Check `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/06_CODEX/CODEX_STOP_CONDITIONS.md` before any action.
9. Use `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/06_CODEX/HUMANGATE_DECISION_TEMPLATE.md` before scoped authorization.
10. Use `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/06_CODEX/CODEX_REPORT_TEMPLATE.md` for final reports.
11. Use `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/06_CODEX/SESSION_STATE_TEMPLATE.md` for reprise state.

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

## Duplicate Prevention
Do not use files under `08_MIGRATION/SNAPSHOTS`, `copied_sources`, `SOURCE_IMPORTS`, `BACKUPS`, or `LOCAL_ARCHIVE` as active sources. For file-producing work, apply the duplicate-prevention fields in `07_FORMS`.

## Uncertainty Rule
If destination, authority, source status, or scope is uncertain: STOP.
If a file is useful but not authorized, place it in quarantine only when a HumanGate decision explicitly allows quarantine.
