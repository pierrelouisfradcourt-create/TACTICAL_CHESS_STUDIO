# Supabase Registry/Cockpit Boundary

Status: PR-00B draft specification only. This directory does not deploy Supabase and does not create workflows, CI, benchmark logic, runtime behavior, or scientific claims.

Supabase is allowed as:

- registry
- cockpit
- decision log
- surface tracker
- policy index

Supabase is not:

- primary evidence
- scientific proof
- claim authority
- merge authority
- promotion authority
- benchmark authority

## Boundary Summary

The Supabase cockpit may show whether a run request exists, whether policy accepted a run intent, whether a RUN_ID pointer was registered, which surfaces were used, which policy versions were indexed, and which human decisions were logged.

The Supabase cockpit must not store or replace primary RUN_ID evidence. It must not authorize scientific claims. It must not turn dashboard visibility into proof.

```txt
No-code cockpit, yes.
No-code primary proof, no.
```

```txt
The cockpit can stop a bad experiment.
It cannot turn incomplete evidence into proof.
```

## Draft Files

- `schema.pr00b.sql`: minimal table draft.
- `rls.pr00b.sql`: draft row-level security and permission rules.
- `policies.pr00b.md`: policy registry boundary.
- `decision_model.pr00b.md`: decision-channel model.
- `holdout_boundary.pr00b.md`: holdout secrecy boundary.

## Non-Deployment Notice

The SQL files are drafts for review. PR-00B does not apply migrations, provision Supabase, run seed scripts, create application credentials, create agent APIs, or connect automation.

