# PR-AUTO-005 GPT Platform Bridge

## Objective

Add a docs-only GPT Platform Bridge contract defining how OpenAI Platform/API
may later be used by local automation scripts for GPT audit/routing, without
giving GPT merge authority, claim authority, or canonical evidence authority.

## Files Changed

Allowed docs-only files:

- `MASTER_DOCS/AUTOMATION_GPT_PLATFORM_BRIDGE.md`
- `lab/gameplay_observation/PR_AUTO_005_GPT_PLATFORM_BRIDGE.md`

No source, test, script, CI, guard, ML, runtime, benchmark, holdout, dataset,
run-bundle, or `latest.json` surfaces are changed by this PR.

## Platform Boundary Added

The contract defines OpenAI Platform/API as a future local audit/routing service
only.

It states that OpenAI Platform/API:

- is not Codex itself;
- is not merge authority;
- is not claim authority;
- is not canonical evidence;
- cannot override `BLOCKED`;
- cannot override `HUMAN_REQUIRED`;
- cannot override failed checks;
- cannot override skipped checks;
- cannot override forbidden paths;
- cannot override guard blocks.

## GPT Auditor Input Packet

The contract defines the future GPT Auditor input packet with these required
fields:

- PR metadata;
- changed files;
- guard dry-run JSON;
- checks state;
- local validation report;
- lane classification;
- smoke matrix result;
- Codex Builder report.

The packet must be minimal, inspectable, PR-local, and free of secrets, API
keys, hidden policy changes, benchmark proof, holdout proof, dataset reset
material, `lab/runs/RUN_*`, `latest.json`, and canonical evidence claims.

## GPT Auditor Output JSON

The contract defines the future GPT Auditor output JSON with these required
fields:

- `audit_verdict`;
- `scope_ok`;
- `forbidden_files_touched`;
- `checks_ok`;
- `claims_ok`;
- `lane_ok`;
- `policy_change_detected`;
- `recommended_next_action`;
- `remaining_risks`.

Allowed `audit_verdict` values:

- `READY_FOR_GUARD`
- `STOP`
- `HUMAN_REQUIRED`
- `BLOCKED`
- `UNCERTAIN`

These outputs route work only. They are not proof, merge authority, claim
authority, policy authority, guard authority, CI authority, or canonical
evidence.

## Fail-Closed Rules

The contract records these fail-closed rules:

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

## Privacy and Security

The contract records privacy/security requirements:

- no secrets in the audit packet;
- no API keys in the repository;
- no hidden policy change through prompt text;
- audit packet should be minimal and inspectable;
- API failures, malformed responses, or unavailable responses must not become
  approval.

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

software_verdict: AUTOMATION_GPT_PLATFORM_BRIDGE_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
