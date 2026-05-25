# Read First Pipeline

status: DOCUMENTED_ONLY

## Purpose
This is the first file Codex must read before using the generic auto-pipeline core for a studio workspace.

## Opening Order
1. Read this file.
2. Identify the target machine, target repo, target profile, and authorized studio workspace paths.
3. Read `PIPELINE_CORE_INDEX.md` to confirm core/profile separation.
4. If machine bootstrap is in scope, read the selected bootstrap profile checklist.
5. Select the correct level from `../06_CODEX/CODEX_LEVELS.md`.
6. Check `../06_CODEX/CODEX_STOP_CONDITIONS.md` before any action.
7. Use `../06_CODEX/HUMANGATE_DECISION_TEMPLATE.md` before scoped authorization.
8. Use `../06_CODEX/CODEX_REPORT_TEMPLATE.md` for final reports.
9. Use `../06_CODEX/SESSION_STATE_TEMPLATE.md` for reprise state.

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
