# Read First Pipeline

status: DOCUMENTED_ONLY

## Legacy Notice
This file belongs to 12_PIPELINE_OPENING_LEGACY, a passive legacy opening package. It must not override STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md, STUDIO_OUTPUT_ROUTING_POLICY_V0.md, STUDIO_SOURCE_ANCHORING_V0.md, or the AutoDev pipeline contract.

## Purpose
This is the first file Codex must read before using the auto-pipeline opening package on Kenpachi.

## Opening Order
1. Read this file.
2. Read `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md`.
3. Read `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\STUDIO_OUTPUT_ROUTING_POLICY_V0.md`.
4. Read `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\02_NAVIGATION\STUDIO_SOURCE_ANCHORING_V0.md`.
5. Read `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIO_CONTROL_CLEANUP_APPLY_V0.md`.
6. Read `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md`.
7. Read `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\07_FORMS\STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md`.
8. Read `PIPELINE_OPENING_CHECKLIST.md` before opening automation.
9. Select the correct level from `CODEX_LEVELS.md`.
10. Check `CODEX_STOP_CONDITIONS.md` before any action.
11. Use `HUMANGATE_DECISION_TEMPLATE.md` before scoped authorization.
12. Use `CODEX_REPORT_TEMPLATE.md` for final reports.
13. Use `SESSION_STATE_TEMPLATE.md` for reprise state.

## Current Topology And Routing Rule
Use these current canonical sources instead of legacy root placement-contract paths:

1. `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md`
2. `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
3. `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\02_NAVIGATION\STUDIO_SOURCE_ANCHORING_V0.md`
4. `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIO_CONTROL_CLEANUP_APPLY_V0.md`
5. `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md`
6. `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\07_FORMS\STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md`

If any current source is missing: STOP and report `current_source_status: NOT_FOUND`.

## Anti-Recurrence Rule
Do not create root-level Studio Control Markdown files. New produced files require `output_routing` and must follow STUDIO_OUTPUT_ROUTING_POLICY_V0.md.

Root-level duplicate canonical files are BLOCKED. 12_PIPELINE_OPENING_LEGACY remains PASSIVE legacy traceability and must not be used to recreate old root-level placement behavior.

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

## Runtime Doctrine
- Rust is runtime truth.
- Python is ML, inference, and tooling.
- Search remains final gameplay authority.
- Neural proposes and reranks only.
- Dataset labels require ActionId, LegalAction, ActionMask, provenance, and HumanGate.
- Logs, reports, latest.json, benchmarks, and runs are observations only.
- HumanGate decides activation, promotion, merge, reject, freeze, push, PR, CI, datasets, models, and claims.

## Uncertainty Rule
If destination, authority, source status, or scope is uncertain: STOP.
If a file is useful but not authorized, place it in quarantine only when a HumanGate decision explicitly allows quarantine.

