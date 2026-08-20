# PR-AUTO-GUARD-001 Automation Doc Lane Policy

## Context
PR175 is a docs-only automation controller contract update. Its changed files are limited to:
- `MASTER_DOCS/AUTOMATION_CONTROLLER_CONTRACT.md`
- `lab/gameplay_observation/PR_AUTO_001_AUTOMATION_CONTROLLER_CONTRACT.md`

The guard previously blocked that PR in dry-run because:
- `AUTOMATION_CONTROLLER_CONTRACT_ADDED` was not accepted in the docs lane.
- Docs text containing control-plane terms could trigger `BEHAVIOR_RISK_DETECTED`.

## Policy Added
The docs lane now accepts these automation control-plane documentation verdicts:
- `AUTOMATION_CONTROLLER_CONTRACT_ADDED`
- `AUTOMATION_LANE_MATRIX_ADDED`
- `AUTOMATION_SMOKE_MATRIX_ADDED`
- `AUTOMATION_BATCH_CONTROLLER_ADDED`

The behavior keyword scan is skipped only when all of these are true:
- The PR title starts with `docs:`.
- Every changed file is under `MASTER_DOCS/**` or matches `lab/gameplay_observation/PR_AUTO_*.md`.
- No protected control-plane script is changed.
- No forbidden path is changed.
- The PR body verdicts are present and valid for the lane.

## Safety Boundaries
This does not allow auto-merge for:
- `scripts/**`
- `.github/**`
- `src/**` runtime behavior changes
- `ml/**`
- `lab/runs/**`
- `latest.json`

Protected control-plane scripts remain manual-review-required. A PR modifying `scripts/auto_merge_guard.py` is blocked from auto-merge by the protected control-plane gate.

## Validation
Required validation for this policy change:
- `.\.venv312\Scripts\python.exe -m py_compile scripts\auto_merge_guard.py`
- `.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr 175 --expected-head 672fb5b3f44c68dbc6e61e999521e12819b0d19c --pretty`
- `.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty`
- `.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty`
- `.\.venv312\Scripts\python.exe scripts\prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty`

software_verdict: AUTO_MERGE_GUARD_AUTOMATION_DOC_LANE_ADDED
evidence_verdict: MECHANICAL_PR_GATE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
