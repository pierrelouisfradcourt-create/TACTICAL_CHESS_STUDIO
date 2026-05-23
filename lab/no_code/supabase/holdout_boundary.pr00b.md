# PR-00B Holdout Boundary

Status: draft no-code specification only.

The holdout boundary is fail-closed. Supabase agent-facing APIs must not expose holdout contents.

Required rule:

```txt
Codex may see holdout_set_id only.
Codex must not see holdout positions.
Codex must not see individual holdout IDs.
Codex must not see individual holdout hashes.
Codex must not see descriptive holdout names.
Supabase agent-facing APIs must not expose holdout contents.
```

## Allowed Agent-Facing Field

Allowed:

- `holdout_set_id`

The identifier must be opaque. It must not reveal descriptive names, positions, hashes, row IDs, puzzle IDs, source names, or content-derived labels.

## Forbidden Agent-Facing Fields

Forbidden:

- holdout positions
- individual holdout IDs
- individual holdout hashes
- descriptive holdout names
- FENs or position encodings
- move lists
- puzzle IDs
- source-row IDs
- content-derived labels
- exports that allow reconstruction of holdout contents

## Supabase API Boundary

The following surfaces must not expose holdout contents to Codex, GPT auditors, dashboards intended for agent inspection, n8n, automation repair flows, or any agent-facing API:

- tables
- views
- RPC functions
- edge functions
- generated REST endpoints
- realtime subscriptions
- storage buckets
- dashboard exports
- audit bundles
- workflow payloads

If a surface needs holdout information, it must use an opaque `holdout_set_id` and resolve protected contents only inside policy-authorized evaluation infrastructure that is not exposed to Codex or GPT auditors.

## Repair And Promotion Boundary

Surfaces used for repair cannot become promotion-grade evidence. If an agent, repair loop, dashboard, or automation surface can observe holdout contents, the affected evidence path is contaminated for promotion and must block.

## Fail-Closed Rules

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

Unknown holdout exposure status blocks. Unknown API surface blocks. Missing explicit policy blocks.

