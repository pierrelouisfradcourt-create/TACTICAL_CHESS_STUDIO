# TacticalChessPureLab No-Code Trust Root

Status: PR-00B draft specification only.

This directory documents the no-code trust root for TacticalChessPureLab Research OS V9.2. It defines how a Supabase registry/cockpit may support governance, visibility, request tracking, decision logging, surface tracking, and policy indexing without becoming evidence, proof, or scientific authority.

Required verdict for PR-00B:

```txt
software_verdict: NOT_RUN
evidence_verdict: NO_CODE_SPEC_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

Central doctrine:

```txt
No-code cockpit, yes.
No-code primary proof, no.
```

```txt
The cockpit can stop a bad experiment.
It cannot turn incomplete evidence into proof.
```

## Scope

PR-00B may create no-code trust-root documentation and Supabase draft schema/RLS files only. It does not deploy Supabase, create n8n workflows, create CI, change runtime behavior, modify the engine, modify tests, run benchmarks, or make scientific claims.

Supabase is defined as:

- registry
- cockpit
- decision log
- surface tracker
- policy index

Supabase is explicitly not:

- primary evidence
- scientific proof
- claim authority
- merge authority
- promotion authority
- benchmark authority

## Documents

- [PR00B_NO_CODE_TRUST_ROOT.md](PR00B_NO_CODE_TRUST_ROOT.md): main doctrine, actor model, table semantics, RLS principles, and fail-closed rules.
- [supabase/README.md](supabase/README.md): Supabase registry/cockpit boundary.
- [supabase/schema.pr00b.sql](supabase/schema.pr00b.sql): draft SQL schema only.
- [supabase/rls.pr00b.sql](supabase/rls.pr00b.sql): draft RLS and permission rules only.
- [supabase/policies.pr00b.md](supabase/policies.pr00b.md): policy registry boundary.
- [supabase/decision_model.pr00b.md](supabase/decision_model.pr00b.md): decision channels and human-only decision rules.
- [supabase/holdout_boundary.pr00b.md](supabase/holdout_boundary.pr00b.md): holdout secrecy and agent-facing API boundary.

## Authority Chain

The repository policy lock files remain the trust root. The Supabase policy registry is an index of policy versions, not the policy authority. If Supabase disagrees with the repository lock files, the repository lock files win and execution blocks until reviewed.

