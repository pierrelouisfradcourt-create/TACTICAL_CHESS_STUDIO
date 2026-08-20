# PR-00B Policy Registry Boundary

Status: draft no-code specification only.

The Supabase `policies` table is a policy index. It is not the policy authority.

Repository lock files remain the trust root. The registry may record policy names, versions, paths, and lock-file hashes so a cockpit can show which policy version was expected to govern a request, intent, run, surface, or decision.

## Allowed Uses

- Index repository policy versions.
- Record lock-file hashes for traceability.
- Link run requests, run intents, runs, decisions, and surfaces to the policy version that governed them.
- Support dashboards and audit queries.

## Forbidden Uses

- Replacing repository policy lock files.
- Overriding repository policy lock files.
- Treating a database row as policy authority.
- Using stale or missing registry entries as implicit approval.
- Allowing the service role to become scientific authority.
- Creating merge, promotion, benchmark, or claim authority.

## Fail-Closed Policy Rules

```txt
missing policy blocks
invalid policy blocks
unknown actor blocks
unknown surface blocks
unknown run_intent blocks
invalid decision channel blocks
silent fallback forbidden
best effort fallback forbidden
```

If the policy registry is unavailable, incomplete, stale, inconsistent, or invalid, no workflow may assume approval. The result is blocked until a human owner resolves the policy mismatch within repository policy.

## Read/Write Rules

Allowed writers: `human_owner` only in PR-00B draft RLS. A later implementation may allow tightly scoped policy maintenance automation only if repository policy explicitly authorizes it.

Allowed readers: `human_owner`, `automation_runner`, `dashboard_reader`, `gpt_auditor`, and `codex_executor` for read-only orientation.

Forbidden readers: any actor path that would expose protected holdout contents or secret material through policy metadata.

Append-only behavior: policy version rows should be append-only. Corrections require superseding rows.

Relationship to RUN_ID evidence: policy rows identify expected governance context for a RUN_ID. They are not evidence and do not prove the RUN_ID is valid.

