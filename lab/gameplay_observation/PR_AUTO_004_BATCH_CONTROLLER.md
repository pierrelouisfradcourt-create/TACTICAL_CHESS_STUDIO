# PR-AUTO-004 Automation Batch Controller

## Objective

Add a docs-only Automation Batch Controller contract defining how automation
may sequence safely from one completed PR to the next.

## Files Changed

Allowed docs-only files:

- `MASTER_DOCS/AUTOMATION_BATCH_CONTROLLER.md`
- `lab/gameplay_observation/PR_AUTO_004_BATCH_CONTROLLER.md`

No source, test, script, CI, guard, ML, runtime, benchmark, holdout, dataset,
run-bundle, or `latest.json` surfaces are changed by this PR.

## Batch Sequence Added

The controller contract requires automation to:

1. verify previous PR state;
2. verify merge commit / main HEAD;
3. fetch origin with prune;
4. switch to `main`;
5. pull with `--ff-only`;
6. require clean `git status --short`;
7. select the next issue/PR from the roadmap;
8. create a fresh branch from `main`;
9. run lane-specific smokes;
10. open a draft PR;
11. run `auto_merge_guard` dry-run;
12. allow merge only if `AUTO_MERGE_READY_DRY_RUN`;
13. resync `main`;
14. continue or stop.

## Controller Outputs

The contract defines these routing outputs:

- `CONTINUE`
- `STOP`
- `HUMAN_REQUIRED`
- `READY_FOR_GUARD`
- `BLOCKED`
- `UNCERTAIN`

These outputs route work only. They are not proof, claim authority, or merge
authority.

## Stop Conditions

The contract requires the batch to stop for:

- previous PR not merged;
- dirty worktree;
- unexpected HEAD;
- pending, failed, or skipped checks;
- guard block;
- policy, guard, or CI change needed;
- forbidden path touched;
- push `main` requested;
- force-push requested;
- benchmark, holdout, or dataset reset requested;
- `lab/runs/RUN_*` or `latest.json` involved;
- `claim_verdict` not exactly `NO_CLAIM_ALLOWED`;
- unavailable or ambiguous PR, check, diff, or head state;
- merge requested outside `auto_merge_guard`;
- mechanical validation being treated as strength, Elo, promotion, holdout,
  benchmark, or scientific proof.

## Batch Limits

The contract records these limits:

- one PR at a time unless write scopes are separate;
- no broad runtime + ML + dataset batch;
- no autonomous policy escalation;
- no automatic policy, guard, CI, script, runtime, ML, or dataset authority
  changes;
- no benchmark, holdout, gameplay loop, dataset reset, `lab/runs/RUN_*`, or
  `latest.json` as batch proof.

## Role Separation

The contract preserves explicit role separation:

- Browser GPT plans.
- Automation Controller coordinates.
- Codex Builder implements.
- GPT Auditor audits/routes.
- `scripts/` and CI verify mechanically.
- `auto_merge_guard` is the only automatic merge authority.
- Human controls policy, guard, CI, claims, merge override, freeze, reject,
  promotion, and claim status.

## OpenAI Platform Boundary

OpenAI Platform may be used later by local scripts for GPT audit/routing only.
It is not Codex itself. It is not merge authority. It is not canonical evidence.
It cannot override `BLOCKED`.

## Validation Plan

Required validation for this docs-only lane:

```powershell
.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty
.\.venv312\Scripts\python.exe scripts\prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty
git diff --check
```

After draft PR creation, run:

```powershell
.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr <PR_NUMBER> --expected-head <HEAD_SHA> --pretty
```

Explicitly skipped validation:

- benchmark;
- holdout;
- gameplay loop.

These are skipped because this PR is documentation-only and must not create
performance, holdout, gameplay, strength, promotion, or proof evidence.

## Risks

- Software risk: low; this PR adds documentation only.
- Evidence risk: low; no runtime, test, script, CI, ML, benchmark, holdout,
  dataset, run-bundle, or `latest.json` behavior is changed.
- Claim risk: low; `claim_verdict` remains `NO_CLAIM_ALLOWED`.

## Required PR Verdicts

software_verdict: AUTOMATION_BATCH_CONTROLLER_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
