# Automation Batch Controller

Status: batch controller contract
Scope: safe sequencing from one completed automation PR to the next
Evidence status: documentation only

This contract defines how automation may coordinate a batch of bounded PRs
without collapsing planning, implementation, audit, validation, merge, or claim
authority. It does not authorize runtime behavior changes, benchmark claims,
holdout use, dataset resets, promotion, Elo claims, strength claims, or
scientific proof.

The Automation Batch Controller coordinates sequence state only. It is not a
merge authority, claim authority, policy authority, guard authority, CI
authority, or canonical evidence source.

## 1. Role Separation

Required role separation:

- Browser GPT plans.
- Automation Controller coordinates.
- Codex Builder implements.
- GPT Auditor audits/routes.
- `scripts/` and CI verify mechanically.
- `auto_merge_guard` is the only automatic merge authority.
- The human controls policy, guard, CI, claims, merge override, freeze, reject,
  promotion, and claim status.

Role boundaries:

- Browser GPT may draft plans, identify next roadmap candidates, and summarize
  risks. It does not implement, merge, validate, or claim.
- Automation Controller may track the current PR, previous PR, main HEAD,
  branch state, validation state, guard state, and next route. It does not edit
  files directly, merge, or override blocked output.
- Codex Builder may implement one bounded diff inside the active allowed-file
  list, run approved mechanical validation, commit to a dedicated PR branch,
  push that branch, and open a draft PR.
- GPT Auditor may critique the diff, PR body, validation, and guard output. It
  audits and routes only.
- Scripts and CI may verify mechanical behavior only.
- `auto_merge_guard` may perform an automatic merge only when explicitly
  invoked, expected head matches, allowed paths match, required checks pass,
  verdicts are valid, and the guard returns the merge-ready verdict.
- The human owns all policy, guard, CI, claim, promotion, freeze, reject, and
  override decisions.

## 2. Batch Sequence

The controller must process automation work in this order:

1. Verify previous PR state.
2. Verify merge commit / main HEAD.
3. Run `git fetch origin --prune`.
4. Run `git switch main`.
5. Run `git pull --ff-only`.
6. Require clean `git status --short`.
7. Select the next issue/PR from the roadmap.
8. Create a fresh branch from `main`.
9. Run lane-specific smokes.
10. Open a draft PR.
11. Run `auto_merge_guard` dry-run.
12. Allow merge only if the guard returns `AUTO_MERGE_READY_DRY_RUN`.
13. Resync `main`.
14. Continue or stop.

The controller must never skip directly from a local diff to merge. It must
observe the PR state, checks, changed files, verdicts, expected head, and guard
dry-run result before any merge-mode guard invocation.

## 3. Controller Outputs

The controller may produce only these route outputs:

- `CONTINUE`: the previous PR is complete, `main` is resynced, the workspace is
  clean, and the next bounded task may start.
- `STOP`: the batch must stop cleanly without additional write actions.
- `HUMAN_REQUIRED`: human decision is required before automation may continue.
- `READY_FOR_GUARD`: the draft PR is ready for guard dry-run.
- `BLOCKED`: a stop condition or policy boundary prevents progress.
- `UNCERTAIN`: required state is unavailable, ambiguous, or contradictory.

Output meanings are routing decisions only. They are not proof, claim approval,
or merge authority.

## 4. Stop Conditions

The controller must stop and report if any condition appears:

- previous PR is not merged;
- dirty worktree;
- unexpected HEAD;
- checks are pending, failed, or skipped;
- guard blocks;
- policy, guard, or CI change is needed;
- forbidden path is touched;
- push `main` is requested;
- force-push is requested;
- benchmark, holdout, or dataset reset is requested;
- `lab/runs/RUN_*` or `latest.json` is involved;
- `claim_verdict` is not exactly `NO_CLAIM_ALLOWED`;
- GitHub PR state, checks, diff, or expected head cannot be verified;
- PR verdicts are missing or invalid;
- a merge is requested outside `auto_merge_guard`;
- a task attempts to turn mechanical validation into strength, Elo, promotion,
  holdout, benchmark, or scientific proof.

After a stop condition:

- do not continue the batch;
- do not create the next branch;
- do not push additional commits unless the human requests a bounded repair;
- do not invoke merge mode;
- report current branch, changed files, validation state, guard state, skipped
  validation, risks, and verdicts.

## 5. Batch Limits

Batch automation is deliberately narrow:

- one PR at a time unless write scopes are separate;
- no broad runtime + ML + dataset batch;
- no autonomous policy escalation;
- no automatic guard, CI, script, runtime, ML, or dataset authority change;
- no benchmark, holdout, gameplay loop, dataset reset, `lab/runs/RUN_*`, or
  `latest.json` as part of batch proof;
- no force-push;
- no push to `main`.

Separate write scopes may be handled in parallel only when the human explicitly
allows the batch shape and the files cannot conflict. Even then, every PR keeps
its own expected head, checks, changed-file list, verdicts, and guard dry-run.

## 6. OpenAI Platform Boundary

OpenAI Platform may be used later by local scripts for GPT audit/routing only.

It is not Codex itself. It is not merge authority. It is not canonical
evidence. It cannot override `BLOCKED`.

Any OpenAI Platform output must remain advisory and non-canonical unless a
future explicit human policy changes that boundary. It must not override guard
output, CI state, forbidden path rules, stop conditions, or
`claim_verdict: NO_CLAIM_ALLOWED`.

## 7. Evidence and Claim Rules

Allowed batch evidence is mechanical and PR-local:

- Git state;
- PR state;
- changed-file list;
- lane-specific smoke output;
- CI check status;
- guard dry-run output;
- guard merge output when merge mode is explicitly allowed and invoked;
- non-canonical observation reports.

Forbidden evidence uses:

- benchmark as proof;
- holdout as proof;
- gameplay loop as proof;
- `latest.json` as canonical evidence;
- `lab/runs/RUN_*` as an automation-created proof bundle;
- GPT audit as canonical evidence;
- OpenAI Platform output as canonical evidence;
- CI pass as strength, Elo, promotion, or scientific proof.

The claim posture remains:

```text
claim_verdict: NO_CLAIM_ALLOWED
```

## 8. Required Verdicts

For this batch controller contract:

```text
software_verdict: AUTOMATION_BATCH_CONTROLLER_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
