# PR-AUTO-002 Automation Lane Matrix

## Objective

Add a docs-only Automation Lane Matrix that defines automation lanes for:

- automation surfaces;
- Learning/Puzzle/Train surfaces;
- runtime surfaces;
- scripts;
- CI;
- guard;
- ML;
- datasets;
- evidence surfaces.

## Files Changed

Allowed docs-only files:

- `MASTER_DOCS/AUTOMATION_LANE_MATRIX.md`
- `lab/gameplay_observation/PR_AUTO_002_AUTOMATION_LANE_MATRIX.md`

No runtime, source, test, script, CI, guard, ML, benchmark, holdout, dataset,
run-bundle, or `latest.json` surfaces are changed by this PR.

## Lane Summary

### SAFE_AUTO

SAFE_AUTO includes:

- docs/control-plane docs;
- `lab/learning/fixtures/**`;
- `lab/learning/schemas/**`;
- `lab/learning/specs/**`;
- non-canonical observation reports.

SAFE_AUTO remains bounded by explicit task scope, clean workspace state,
mechanical validation, draft PR defaults, and `NO_CLAIM_ALLOWED`.

### AUDIT_REQUIRED

AUDIT_REQUIRED includes:

- `src/learning/**`;
- `src/puzzle/**`;
- `src/train/**`;
- learning validators, parsers, and classifiers;
- scripted smokes that do not touch protected `scripts/**` or `.github/**`
  surfaces.

Automation may prepare a bounded proposal, but audit is required before merge
because these surfaces can affect behavior interpretation.

### HUMAN_REQUIRED

HUMAN_REQUIRED includes:

- `scripts/**`;
- `.github/**`;
- `scripts/auto_merge_guard.py`;
- policy, guard, and CI changes;
- runtime behavior wiring.

The human controls policy, guard, CI, claims, merge override, freeze, reject,
promotion, and claim status.

### FORBIDDEN

FORBIDDEN unless future explicit human policy includes:

- push `main`;
- force push;
- benchmark as proof;
- holdout;
- dataset reset;
- `lab/runs/RUN_*`;
- `latest.json` as evidence;
- strength, Elo, promotion, or scientific claims.

## Role Separation

```text
Browser GPT plans.
Automation Controller coordinates.
Codex Builder implements bounded diffs.
GPT Auditor audits and routes only.
Scripts and CI verify mechanical behavior only.
auto_merge_guard merges only when its policy allows it.
The human controls policy, guard, CI, claims, merge override, freeze, reject,
promotion, and claim status.
```

OpenAI Platform and GPT audit are routing and audit surfaces only. They are not
merge authority, not claim authority, and not canonical evidence.

## Validation Plan

Required validation for this docs-only lane:

```powershell
.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty
.\.venv312\Scripts\python.exe scripts\prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty
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
- Evidence risk: low; no benchmark, holdout, gameplay, dataset, runtime, script,
  CI, guard, or ML behavior is changed.
- Claim risk: low; the lane matrix explicitly preserves `NO_CLAIM_ALLOWED`.

## Required PR Verdicts

software_verdict: AUTOMATION_LANE_MATRIX_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
