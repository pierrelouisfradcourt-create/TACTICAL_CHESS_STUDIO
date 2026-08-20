# PR-AUTO-001 Automation Controller Contract

## Objective

Add a docs-only Automation Controller Contract that formalizes:

- auto-push boundaries;
- draft PR defaults;
- audit separation;
- guard-only automated merge authority;
- batch stop conditions;
- `STOP_AUTOMATION` kill switch behavior;
- human policy, guard, CI, merge, promotion, and claim authority.

## Files Changed

Allowed docs-only files:

- `MASTER_DOCS/AUTOMATION_CONTROLLER_CONTRACT.md`
- `lab/gameplay_observation/PR_AUTO_001_AUTOMATION_CONTROLLER_CONTRACT.md`

No runtime, test, script, CI, ML, benchmark, holdout, dataset, run-bundle, or
`latest.json` surfaces are changed by this PR.

## Contract Summary

The contract preserves the project doctrine:

```text
Codex implements bounded diffs.
GPT/Codex auditors critique and route only.
Scripts and CI verify mechanical behavior only.
auto_merge_guard is the only automation merge authority.
The human owns policy, guard interpretation, CI interpretation, merge override,
promotion, freeze, reject, and claim authority.
```

## Automation Rules Captured

- Codex Builder may work only inside the active allowed-file scope.
- Auto-push is allowed only to a dedicated PR branch.
- Pushing `main` is forbidden.
- Force-push is forbidden.
- Draft PR is the default.
- GPT/Codex Auditor has no merge or claim authority.
- Scripts and CI provide mechanical verification only.
- `auto_merge_guard` is the only automated merge path.
- Human decision authority remains final for policy, guard, CI, merge, freeze,
  promotion, reject, and claim questions.
- `claim_verdict` remains `NO_CLAIM_ALLOWED` unless future explicit human claim
  policy changes it.

## Stop Conditions

Batch automation must stop if any of these appear:

- `STOP_AUTOMATION`;
- forbidden path edits;
- files outside the active allowed-file list;
- benchmark, holdout, dataset reset, `lab/runs/RUN_*`, or `latest.json` request;
- failed, skipped, pending, unavailable, or ambiguous validation;
- unavailable GitHub verification;
- missing or invalid PR verdicts;
- any `claim_verdict` other than `NO_CLAIM_ALLOWED`;
- `auto_merge_guard` not merge-ready;
- conflict between human policy, guard policy, and task instructions.

## Validation Plan

Required validation for this docs-only lane:

```powershell
.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty
.\.venv312\Scripts\python.exe scripts\prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty
```

Explicitly skipped validation:

- benchmark;
- holdout;
- gameplay loop.

These are skipped because this PR is documentation-only and must not create
performance or gameplay evidence.

## Risks

- Software risk: low; this PR adds documentation only.
- Evidence risk: low; no benchmark, holdout, gameplay, dataset, runtime, or CI
  behavior is changed.
- Claim risk: low; the contract explicitly preserves `NO_CLAIM_ALLOWED`.

## Required PR Verdicts

software_verdict: AUTOMATION_CONTROLLER_CONTRACT_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED

