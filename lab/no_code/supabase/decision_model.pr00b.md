# PR-00B Decision Model

Status: draft no-code specification only.

The `decisions` table is human-only. It records governance decisions; it does not create scientific proof.

## Required Decision Channels

```txt
MERGE_DECISION
CLAIM_DECISION
```

A merge decision is not a claim decision.

A `MERGE_DECISION` may decide whether repository changes may merge under policy. It does not approve scientific claims, benchmark conclusions, promotion, or proof.

A `CLAIM_DECISION` may decide whether a claim is allowed only within policy and only when valid evidence exists outside Supabase. Supabase cannot transform incomplete evidence into proof.

## Allowed Writers

Only `human_owner` may insert decisions.

Automation, dashboards, GPT auditors, Codex executors, and service-role processes must not insert claim or merge decisions. The service role is operational power, not scientific authority.

## Allowed Readers

Allowed readers:

- `human_owner`
- `dashboard_reader`
- `gpt_auditor`

Read access is not proof. Dashboard read does not imply proof.

## Forbidden Uses

- Writing decisions by automation.
- Writing decisions by GPT auditors.
- Writing decisions by Codex.
- Writing decisions by dashboard users.
- Treating service-role writes as scientific authority.
- Treating a merge decision as a claim decision.
- Treating a claim decision as benchmark authority.
- Treating a decision row as primary evidence.
- Silently updating or deleting decisions.

## Append-Only Rule

Decision rows are append-only. If a decision needs correction, a new row must supersede the previous decision. The old row remains part of the audit history.

## Relationship To RUN_ID Evidence

A decision may cite a RUN_ID pointer and evidence hash metadata from the `runs` table. The raw RUN_ID evidence remains authoritative outside Supabase. A decision that lacks valid RUN_ID evidence and valid policy context blocks claim use.

## Claim Restriction

PR-00B creates no claim. Expected verdict:

```txt
software_verdict: NOT_RUN
evidence_verdict: NO_CODE_SPEC_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

