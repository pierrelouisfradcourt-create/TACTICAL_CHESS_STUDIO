# Automation GPT Platform Bridge

Status: future platform bridge contract
Scope: OpenAI Platform/API use by local automation scripts for GPT audit and
routing only
Evidence status: documentation only

This contract defines how OpenAI Platform/API may later be used by local
automation scripts for GPT audit and routing. It does not authorize live API
wiring, runtime behavior changes, benchmark claims, holdout use, dataset
resets, promotion, Elo claims, strength claims, scientific proof, autonomous
merge, or canonical evidence.

OpenAI Platform/API is a future local audit/routing service only. It is not
Codex itself. It is not merge authority. It is not claim authority. It is not
canonical evidence.

OpenAI Platform/API output cannot override `BLOCKED`, `HUMAN_REQUIRED`, failed
checks, skipped checks, forbidden paths, guard blocks, CI state, stop
conditions, or `claim_verdict: NO_CLAIM_ALLOWED`.

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

- Browser GPT may draft plans, critique options, and summarize risks. It does
  not implement, validate, merge, or claim.
- Automation Controller may assemble inspectable state, coordinate the bounded
  sequence, and route stop/continue decisions. It does not edit files directly,
  merge, or override blocked output.
- Codex Builder may implement one bounded diff inside the active allowed-file
  list, run approved mechanical validation, commit to a dedicated PR branch,
  push that branch, and open a draft PR.
- GPT Auditor may inspect the audit packet and return route advice only. It is
  not merge authority, claim authority, policy authority, guard authority, CI
  authority, or canonical evidence.
- Scripts and CI verify mechanical behavior only.
- `auto_merge_guard` may perform an automatic merge only when explicitly
  invoked, expected head matches, allowed paths match, required checks pass,
  verdicts are valid, and the guard returns the merge-ready verdict.
- The human owns all policy, guard, CI, claim, promotion, freeze, reject, and
  override decisions.

## 2. GPT Auditor Input Packet

Local automation scripts may later assemble a minimal, inspectable GPT Auditor
input packet. The packet must contain only PR-local, non-secret information.

Required packet fields:

```json
{
  "pr_metadata": {},
  "changed_files": [],
  "guard_dry_run_json": {},
  "checks_state": {},
  "local_validation_report": {},
  "lane_classification": {},
  "smoke_matrix_result": {},
  "codex_builder_report": {}
}
```

Field meanings:

- `pr_metadata`: PR number, title, branch, base branch, head SHA, draft state,
  author/actor metadata available to local automation, and PR verdict text.
- `changed_files`: complete changed-file list used for lane and forbidden-path
  evaluation.
- `guard_dry_run_json`: raw JSON object produced by `auto_merge_guard` dry-run,
  if available.
- `checks_state`: GitHub/CI check conclusions, including pending, failed, and
  skipped states.
- `local_validation_report`: commands run, results, skipped validation, and
  local risks from the Codex Builder session.
- `lane_classification`: SAFE_AUTO, AUDIT_REQUIRED, HUMAN_REQUIRED, FORBIDDEN,
  or UNCERTAIN classification with the local rationale.
- `smoke_matrix_result`: lane-specific smoke level and result, including any
  skipped smoke that must stop automation.
- `codex_builder_report`: branch, commit, changed files, validations, skipped
  validation, risks, and the three verdicts.

The audit packet must not include secrets, API keys, tokens, private
credentials, hidden prompt policy, benchmark proof, holdout data, dataset reset
material, `lab/runs/RUN_*`, `latest.json`, or any canonical evidence claim.

## 3. GPT Auditor Output JSON

GPT Auditor output must be a single JSON object with these required fields:

```json
{
  "audit_verdict": "READY_FOR_GUARD",
  "scope_ok": true,
  "forbidden_files_touched": false,
  "checks_ok": true,
  "claims_ok": true,
  "lane_ok": true,
  "policy_change_detected": false,
  "recommended_next_action": "run auto_merge_guard dry-run or stop",
  "remaining_risks": []
}
```

Allowed `audit_verdict` values:

- `READY_FOR_GUARD`
- `STOP`
- `HUMAN_REQUIRED`
- `BLOCKED`
- `UNCERTAIN`

Field requirements:

- `scope_ok`: true only when the diff is limited to the active allowed-file
  list.
- `forbidden_files_touched`: true when any forbidden or unexpected file is
  present.
- `checks_ok`: true only when required checks are present and successful, with
  no pending, failed, skipped, or unavailable required state.
- `claims_ok`: true only when verdicts are present and `claim_verdict` remains
  exactly `NO_CLAIM_ALLOWED`.
- `lane_ok`: true only when lane classification permits the requested route.
- `policy_change_detected`: true when the PR changes or appears to require
  policy, guard, CI, claim, merge, evidence, or authority boundaries.
- `recommended_next_action`: a route recommendation only; it cannot authorize
  merge, claim, evidence, or guard override.
- `remaining_risks`: explicit residual risks, ambiguities, missing validation,
  or stop conditions.

## 4. Fail-Closed Rules

The bridge is fail-closed:

- malformed GPT output => `STOP`;
- missing required fields => `STOP`;
- API unavailable => `STOP` or `HUMAN_REQUIRED`;
- disagreement with guard => guard wins;
- audit says ready but guard blocks => `STOP`, no override;
- audit says ready but checks are failed, skipped, pending, or unavailable =>
  `STOP`;
- audit says ready but forbidden paths are touched => `STOP`;
- audit says ready but policy change is detected => `HUMAN_REQUIRED`;
- audit says ready but `claim_verdict` is not exactly `NO_CLAIM_ALLOWED` =>
  `STOP`;
- audit says ready but the lane is HUMAN_REQUIRED, FORBIDDEN, or UNCERTAIN =>
  `STOP` or `HUMAN_REQUIRED`.

GPT Auditor output may make automation more cautious. It may not make
automation less cautious than scripts, CI, guard, allowed-file lists, lane
rules, or human policy.

## 5. Guard and Evidence Boundaries

Allowed uses:

- critique PR scope;
- identify forbidden paths;
- detect missing or skipped validation;
- detect claim wording risk;
- compare lane classification against changed files;
- recommend `READY_FOR_GUARD`, `STOP`, `HUMAN_REQUIRED`, `BLOCKED`, or
  `UNCERTAIN`.

Forbidden uses:

- merge authority;
- claim authority;
- canonical evidence;
- proof of strength, Elo, promotion, holdout quality, benchmark quality, or
  scientific result;
- override of `auto_merge_guard`;
- override of failed, skipped, pending, or unavailable checks;
- override of forbidden paths, guard blocks, stop conditions, or
  `HUMAN_REQUIRED`;
- hidden policy changes through prompts.

## 6. Privacy and Security

Privacy and security requirements:

- no secrets in the audit packet;
- no API keys in the repository;
- no hidden policy change through prompt text;
- audit packet should be minimal and inspectable;
- local scripts must keep prompt, packet, response, and route mapping visible
  enough for human review;
- API failures, malformed responses, or unavailable responses must not be
  converted into approval;
- OpenAI Platform/API output must remain advisory and non-canonical unless a
  future explicit human policy changes that boundary.

## 7. Required Verdicts

For this GPT Platform Bridge contract:

```text
software_verdict: AUTOMATION_GPT_PLATFORM_BRIDGE_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
