# Automation Controller Contract

Status: controller contract  
Scope: automation push, PR, audit, guard, stop-condition, and claim-control boundaries  
Evidence status: documentation only

This contract formalizes how bounded automation may operate in TacticalChessPureLab.
It does not authorize runtime behavior changes, benchmark claims, holdout use,
dataset resets, promotion, Elo claims, strength claims, or scientific proof.

Core doctrine:

```text
Codex implements bounded diffs.
GPT/Codex auditors critique and route only.
Scripts and CI verify mechanical behavior only.
auto_merge_guard is the only automation merge authority.
The human owns policy, guard interpretation, CI interpretation, merge override,
promotion, freeze, reject, and claim authority.
```

## 1. Roles

### Codex Builder

Codex Builder may:

- implement the bounded task requested by the human;
- edit only the explicitly allowed files for the active task;
- run local mechanical validation commands approved for the task;
- commit to a dedicated PR branch;
- push only the dedicated PR branch;
- open a draft PR by default;
- report commands, results, skipped validation, risks, and verdicts.

Codex Builder must not:

- modify files outside the approved task scope;
- push directly to `main`;
- force-push;
- use benchmark or holdout runs as proof;
- reset datasets;
- create `lab/runs/RUN_*`;
- create `latest.json`;
- declare Elo, strength, promotion, scientific proof, or claim status.

### GPT/Codex Auditor

GPT/Codex Auditor may:

- review diffs, PR bodies, validation reports, and guard output;
- identify risks, missing evidence, policy conflicts, or stop conditions;
- recommend route choices such as fix, close, manual review, or retry validation.

GPT/Codex Auditor must not:

- merge PRs;
- override failed or skipped checks;
- override `auto_merge_guard`;
- widen claim scope;
- convert mechanical validation into scientific evidence;
- treat audit opinion as policy authority.

### Scripts and CI

Scripts and CI provide mechanical verification only.

They may:

- check workspace hygiene;
- report local agent session state;
- inspect docs-only PR readiness;
- classify checks as passed, pending, failed, skipped, or blocked;
- produce machine-readable guard or validation output.

They must not be treated as:

- evidence of engine strength;
- evidence of Elo;
- evidence of promotion readiness;
- evidence of scientific proof;
- a replacement for human claim policy.

### auto_merge_guard

`auto_merge_guard` is the only authority allowed to perform an automated merge.

Automation may merge only when:

- the guard is invoked explicitly in merge mode;
- the guard verifies the expected head;
- the guard sees only allowed paths;
- all required checks pass;
- no checks are pending, failed, or skipped;
- required PR verdicts are present and policy-valid;
- `claim_verdict` is exactly `NO_CLAIM_ALLOWED`;
- the guard reaches its merge-ready verdict.

Any automation merge outside `auto_merge_guard` is forbidden.

### Human

The human is the final authority for:

- policy interpretation;
- guard policy changes;
- CI policy changes;
- manual merge or reject decisions;
- freeze decisions;
- promotion decisions;
- claim decisions;
- changes to this contract.

Human authority does not convert mechanical validation into scientific evidence.
It only decides whether the project accepts, rejects, freezes, promotes, or
changes policy.

## 2. Push and PR Contract

Automation may push only to a dedicated PR branch created for the bounded task.

Rules:

- pushing `main` is forbidden;
- force-push is forbidden;
- branch names should identify the task or PR lane;
- draft PR is the default PR state;
- one coherent PR is preferred over micro-PRs;
- PR body must include `software_verdict`, `evidence_verdict`, and
  `claim_verdict`;
- `claim_verdict` must remain `NO_CLAIM_ALLOWED` unless a future explicit human
  claim policy changes this rule.

## 3. Audit Separation

Audit is separate from implementation, validation, and merge.

Required separation:

- Builder output is a proposed diff, not a final judgment.
- GPT/Codex audit is critique/routing, not merge authority.
- Scripts and CI are mechanical checks, not scientific proof.
- `auto_merge_guard` is the only automation merge path.
- Human policy remains above automation and audit recommendations.

Forbidden role collapse:

- Codex writes a diff and declares it proven.
- GPT/Codex audit approves a claim.
- CI pass is treated as strength evidence.
- A benchmark or holdout result is treated as PR proof.
- A pointer such as `latest.json` is treated as canonical evidence.
- A manual merge decision is treated as a claim decision.

## 4. Batch Automation Stop Conditions

Batch automation must stop immediately if any stop condition appears.

Stop conditions:

- `STOP_AUTOMATION` appears in task instructions, PR comments, commit messages,
  branch names, validation output, or guard output;
- a requested edit touches forbidden paths;
- a diff includes files outside the active allowed-file list;
- a task requires benchmark, holdout, dataset reset, `lab/runs/RUN_*`, or
  `latest.json`;
- workspace hygiene is not clean for the active task;
- validation fails, is skipped, or cannot run;
- GitHub verification is unavailable;
- branch/head state is ambiguous;
- a PR is not draft when draft was required;
- any check is pending, failed, skipped, or missing;
- PR verdicts are missing or invalid;
- `claim_verdict` is not exactly `NO_CLAIM_ALLOWED`;
- `auto_merge_guard` does not return an explicit merge-ready verdict;
- human policy, guard policy, and task instructions conflict.

After a stop condition:

- do not continue the batch;
- do not push additional commits unless the human requests a bounded repair;
- do not merge;
- report the stop condition, current branch, changed files, validation state,
  and verdicts.

## 5. Kill Switch

`STOP_AUTOMATION` is the project kill switch.

When observed, all automation must become report-only and stop before any new
write action, push, PR update, merge attempt, benchmark, holdout, or gameplay
loop.

The kill switch may be cleared only by explicit future human instruction.

## 6. Claim Policy

Default and current claim policy:

```text
claim_verdict: NO_CLAIM_ALLOWED
```

This remains true for docs-only, automation, runtime boundary, validation,
audit, and gameplay-observation lanes unless a future human claim policy
explicitly changes it.

No automation output may claim:

- Elo;
- engine strength;
- promotion readiness;
- scientific proof;
- holdout proof;
- benchmark proof;
- production readiness beyond the exact mechanical verdict reported.

## 7. Required Verdict Separation

Every final report for automation-controller work must separate judgment into:

```text
software_verdict: <software-scope result>
evidence_verdict: <evidence-scope result>
claim_verdict: NO_CLAIM_ALLOWED
```

For this contract:

```text
software_verdict: AUTOMATION_CONTROLLER_CONTRACT_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

