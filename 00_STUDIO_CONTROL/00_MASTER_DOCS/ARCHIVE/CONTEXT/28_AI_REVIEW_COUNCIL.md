# AI Review Council

Status: control-plane contract  
Scope: multi-agent review governance for docs and bounded PR routing  
Evidence status: documentation only

This document defines the AI Review Council as a review and routing surface only.
It permits documentation and routing guidance only. Non-doc implementation
work, benchmark claims, holdback-set usage, dataset refresh actions, ranking
upgrade claims, rating claims, capability claims, and empirical-proof claims
are out of scope.

Core doctrine:

```text
Runtime execution remains owned by Rust code.
Tactical decision authority remains in search code.
Model policy/value suggestions remain advisory only.
Benchmark is not proof.
Smoke is not Elo.
latest.json is not evidence.
claim_verdict must remain NO_CLAIM_ALLOWED.
```

## 1. Role

The AI Review Council is a structured multi-agent critique layer used to review
bounded changes and route next actions.

The Council may:

- review PR-local docs, reports, and mechanical outputs;
- identify policy conflicts, scope drift, and claim-discipline violations;
- classify risk and recommend `CONTINUE`, `STOP`, `BLOCKED`, or
  `HUMAN_REQUIRED`;
- require explicit human decision when boundaries are ambiguous.

The Council must not:

- merge PRs;
- make implementation behavior changes;
- modify policy or guard files directly;
- treat benchmark/smoke output as proof;
- widen claim scope.

## 2. Authority Limits

The AI Review Council has no merge authority and no claim authority.

Authority remains separated:

- Codex Builder implements bounded diffs;
- scripts and CI provide mechanical checks only;
- `auto_merge_guard` is the only automation merge authority;
- human is final authority for merge/reject/freeze/upgrade/claim decisions.

Council outputs are advisory only and cannot override:

- failed/pending/skipped checks;
- forbidden paths;
- guard blocks;
- `claim_verdict` policy.

## 3. Inputs

Required council inputs are PR-local and inspectable:

- PR metadata, branch, expected head;
- changed file list and path-lane classification;
- workspace hygiene report;
- local agent session report;
- docs update readiness report;
- guard dry-run output when available;
- explicit task constraints and forbidden surfaces.

Forbidden inputs:

- holdback-set outputs;
- benchmark results used as proof;
- `latest.json` as evidence;
- private secrets or unreviewable hidden prompts.

## 4. Outputs

The Council must produce structured routing output only:

```json
{
  "council_verdict": "CONTINUE|STOP|BLOCKED|HUMAN_REQUIRED|UNCERTAIN",
  "scope_ok": true,
  "forbidden_files_touched": [],
  "checks_ok": false,
  "claim_discipline_ok": true,
  "required_human_decision": false,
  "remaining_risks": []
}
```

Output rules:

- deterministic, PR-local, and auditable;
- no runtime claims;
- no strength/Elo/promotion/scientific claims;
- never escalate claim scope.

## 5. Stop Conditions

The Council must route `STOP`, `BLOCKED`, or `HUMAN_REQUIRED` when any of the
following is true:

- files outside approved docs/control-plane scope are touched;
- `blocked_reasons` is non-empty in guard output;
- `checks_pending > 0` or `checks_failed > 0`;
- forbidden files are present in diff;
- required local validations are missing or failed;
- `claim_verdict` is not exactly `NO_CLAIM_ALLOWED`;
- task attempts non-doc implementation scope changes;
- benchmark/smoke/holdback-set output is framed as proof.

## 6. Examples

Example A (allowed):

- docs-only PR edits one `MASTER_DOCS` file and one
  `lab/gameplay_observation` report;
- all required local checks pass;
- guard dry-run is clean;
- claim remains `NO_CLAIM_ALLOWED`.

Expected council route: `CONTINUE` (advisory), then guard/human flow.

Example B (blocked):

- docs PR includes `.github/workflows` change or `src/**` change.

Expected council route: `BLOCKED`.

Example C (stop):

- docs PR keeps doc-only files but guard shows pending checks.

Expected council route: `STOP` until checks are resolved.

## 7. Risks

- Software risk: low for docs-only scope.
- Evidence risk: low if role separation is preserved; high if review output is
  misread as proof.
- Claim risk: controlled only if `claim_verdict` stays
  `NO_CLAIM_ALLOWED`.

## 8. Required Output Format

Every council summary must end with:

```text
software_verdict: <mechanical software scope result>
evidence_verdict: <documentation/evidence scope result>
claim_verdict: NO_CLAIM_ALLOWED
```

For this contract document:

```text
software_verdict: DOCUMENTATION_ONLY_UPDATED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

## 9. Claim Discipline

The AI Review Council cannot authorize claims. It can only preserve discipline.

Required discipline:

- no Elo claims;
- no strength claims;
- no promotion claims;
- no scientific proof claims;
- no claim-scope escalation from automation or audit text.

Default and required state:

```text
claim_verdict: NO_CLAIM_ALLOWED
```
