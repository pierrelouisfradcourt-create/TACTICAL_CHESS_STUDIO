# AUTOMATION OPERATING NOTICE

This notice is the practical recovery guide for automation lanes in TacticalChessPureLab.

## A. Current automation status

- Automation cleanup is complete through PR #138.
- Passive runtime boundaries merged: SearchBackend, PolicyGuide, DecisionController, TacticalEnv.
- Guard hardening merged: PR #134 and PR #135.
- Forensic guard evidence comment support merged: PR #138.
- claim_verdict remains `NO_CLAIM_ALLOWED`.

## B. What auto_merge_guard may auto-merge

- Passive boundaries may auto-merge only through guard.
- Docs/control-plane PRs with valid verdicts and successful required checks may be considered.
- Guard auto-merge requires dry-run success before allow-merge is attempted.

## C. What auto_merge_guard must never auto-merge

- Protected control-plane scripts must not auto-merge.
- Any PR changing scripts/auto_merge_guard.py requires manual merge.
- Runtime behavior wiring requires human review.
- Any PR touching forbidden runtime/test/CI/dataset-reset surfaces must not auto-merge.

## D. Manual-review-required PRs

- Any PR that edits `scripts/**`.
- Any PR that edits `.github/**`.
- Any PR that changes runtime behavior wiring under `src/**`.
- Any PR that changes benchmark/claim control surfaces.
- Any PR where guard returns a verdict other than `AUTO_MERGE_READY_DRY_RUN`.

## E. Required PR body verdicts

Required fields:

- `software_verdict: <value>`
- `evidence_verdict: <value>`
- `claim_verdict: <value>`

Hard policy:

- Any missing or invalid verdict blocks auto-merge.
- claim_verdict must be NO_CLAIM_ALLOWED.

## F. Required command pattern

Run this sequence:

```powershell
git fetch origin --prune
git status --short
git branch --show-current
git log --oneline -30

# verify PR truth and open PR count
gh pr view <PR_ID> --json state,mergedAt,mergeCommit,title,url
gh pr list --state open --json number,title,headRefName,baseRefName,url

# run required local validation
.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty
.\.venv312\Scripts\python.exe scripts/prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty

# guard dry-run
.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo <owner/repo> --pr <PR_NUMBER> --expected-head <HEAD_SHA> --pretty

# guard merge (only when dry-run verdict is AUTO_MERGE_READY_DRY_RUN)
.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo <owner/repo> --pr <PR_NUMBER> --expected-head <HEAD_SHA> --allow-merge --pretty
```

## G. What to do if auto_merge_guard blocks

- Read guard JSON output completely.
- Do not manually merge while guard returns a blocking verdict.
- Fix only the bounded issue reported by guard.
- Re-run dry-run after each fix.
- Escalate to human decision if policy conflict remains.

## H. What to do if GitHub CLI config access fails

Symptom example:

- `failed to read configuration: ... GitHub CLI\config.yml: Access is denied`

Recovery:

- Run with proper user permissions in the active shell context.
- Confirm `gh auth status` succeeds before PR queries.
- If access is still denied, stop automation and request human intervention.
- Do not bypass policy checks by skipping GitHub verification.

## I. What to do if checks are pending/skipped/failed

- Pending: wait and re-check.
- Failed: treat as blocked, fix cause, re-run checks.
- Skipped: treat as blocked.
- Any skipped check blocks auto-merge.

## J. What to do if branch is stale

- Fetch remote state.
- Compare branch head with `origin/main`.
- Rebase or recreate the branch from current `origin/main`.
- Re-run validation and guard dry-run on the refreshed head.

## K. What to do with local tracked noise

- Known noisy tracked file: `lab/reports/latest_benchmark_summary.json`.
- Do not stage, revert, stash, or commit it in docs/control-plane PRs.
- lab/reports/latest_benchmark_summary.json must never be committed as proof.
- If branch switching is blocked by local noise, use clean worktree protocol.

## L. Worktree protocol

- If local tracked noise blocks switching to `main`, do not force-reset.
- Create a clean temporary worktree from `origin/main`.
- Implement the bounded PR in that clean worktree.
- Report the worktree path in the final report.
- Do not delete a worktree unless it was created for the task and is confirmed safe/clean.

## M. Forensic evidence marker

- AUTO_MERGED_BY_GUARD marks guard-performed merges.
- Verify this marker in PR comments/history for auto-merged passive boundary lanes.

## N. Stop conditions

Stop immediately and keep merge manual if any condition appears:

- forbidden path changes
- runtime behavior wiring changes
- missing/invalid verdict block
- skipped or failed checks
- GitHub verification unavailable
- guard verdict not ready for auto-merge

## O. Next safe runtime lane

- Next lane: runtime passive `InitialStateFactory` boundary for 960-readiness preparation.
- Keep this lane passive and bounded.
- Keep active chess runtime authority unchanged.
- Keep claim_verdict at `NO_CLAIM_ALLOWED`.
