# PR-AUTO-003 Automation Smoke Matrix

## Objective

Add a docs-only Automation Smoke Matrix defining required local validations and
smokes per automation lane.

## Files Changed

Allowed docs-only files:

- `MASTER_DOCS/AUTOMATION_SMOKE_MATRIX.md`
- `lab/gameplay_observation/PR_AUTO_003_AUTOMATION_SMOKE_MATRIX.md`

No source, test, script, CI, guard, ML, runtime, benchmark, holdout, dataset,
run-bundle, or `latest.json` surfaces are changed by this PR.

## Smoke Levels Added

### SMOKE_LEVEL_0

Docs, fixtures, and specs only.

### SMOKE_LEVEL_1

Passive boundary or code without runtime behavior wiring.

### SMOKE_LEVEL_2

Learning/Puzzle/Train code lane with audit required.

### SMOKE_LEVEL_MANUAL

Scripts, CI, guard, policy, and runtime-critical lanes.

## Lane Requirements

SAFE_AUTO docs/control-plane requires:

```powershell
git status --short
.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty
.\.venv312\Scripts\python.exe scripts\prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty
gh pr view <PR_NUMBER>
gh pr checks <PR_NUMBER>
gh pr diff <PR_NUMBER>
.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr <PR_NUMBER> --expected-head <HEAD_SHA> --pretty
```

SAFE_AUTO fixtures require:

- JSON validation with `.\.venv312\Scripts\python.exe -m json.tool`;
- fixture files only;
- no runtime loop;
- `auto_merge_guard` dry-run only.

AUDIT_REQUIRED Learning/Puzzle/Train requires:

- `cargo check`;
- relevant cargo tests only;
- JSON validation if fixtures exist;
- GPT audit JSON required before guard;
- no benchmark;
- no holdout;
- no dataset reset.

HUMAN_REQUIRED requires:

- no auto-merge;
- manual review required;
- guard, policy, CI, scripts, and runtime-critical changes must not auto-merge.

## Forbidden Proof

This PR records the following forbidden proof boundaries:

- benchmark is not proof;
- holdout is not allowed;
- `latest.json` is not evidence;
- `lab/runs/RUN_*` is forbidden in automation docs lanes;
- tests prove mechanical stability only, not strength/Elo/promotion/scientific
  result.

## Validation Plan

Required validation for this docs-only lane:

```powershell
.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty
.\.venv312\Scripts\python.exe scripts\prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty
git diff --check
```

After the draft PR is opened, run:

```powershell
.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr <PR_NUMBER> --expected-head <HEAD_SHA> --pretty
```

Explicitly skipped validation:

- benchmark;
- holdout;
- gameplay loop.

These are skipped because this PR is documentation-only and must not create
performance, holdout, gameplay, strength, Elo, promotion, or scientific
evidence.

## Risks

- Software risk: low; this PR adds documentation only.
- Evidence risk: low; no benchmark, holdout, gameplay, dataset, runtime,
  script, CI, guard, or ML behavior is changed.
- Claim risk: low; the smoke matrix explicitly preserves `NO_CLAIM_ALLOWED`.

## Required PR Verdicts

software_verdict: AUTOMATION_SMOKE_MATRIX_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
