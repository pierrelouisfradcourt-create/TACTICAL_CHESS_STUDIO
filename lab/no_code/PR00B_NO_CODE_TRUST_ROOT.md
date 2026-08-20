# PR-00B No-Code Trust Root Bootstrap Spec

Status: draft no-code specification only.

This document defines the no-code trust root boundary for TacticalChessPureLab Research OS V9.2. It is a governance and registry specification. It does not deploy Supabase, create n8n workflows, create CI, modify runtime code, modify the engine, modify tests, run benchmarks, or make scientific claims.

PR-00B preserves the scientific restriction established by PR-00A:

```txt
software_verdict: NOT_RUN
evidence_verdict: NO_CODE_SPEC_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

## Core Doctrine

```txt
No-code cockpit, yes.
No-code primary proof, no.
```

```txt
The cockpit can stop a bad experiment.
It cannot turn incomplete evidence into proof.
```

The no-code cockpit is allowed to display status, block unsafe paths, track requests, log decisions, and index policy versions. It must not promote evidence, manufacture claims, replace raw RUN_ID evidence, or override repository policy locks.

## Supabase Boundary

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

The Supabase database may store pointers, hashes, request metadata, policy index rows, surface declarations, events, and human decisions. Raw RUN_ID evidence remains outside Supabase in the governed evidence locations defined by repository policy. Supabase may point to RUN_ID evidence; it must not replace it.

## Trust Root

The repository policy lock files remain the trust root. The Supabase `policies` table is only a registry index of known policy versions.

If the policy registry is missing, stale, inconsistent, invalid, or conflicts with repository policy locks, the result is blocked. A missing explicit policy never falls back to permissive behavior.

## Minimal Tables

### run_requests

Purpose: capture a human or approved UI request for a future run.

Allowed writers: `human_owner` and approved UI paths acting under human ownership.

Allowed readers: `human_owner`, `dashboard_reader`, `gpt_auditor`, and policy-gated automation reading request metadata.

Forbidden uses: authorizing science, creating claims, bypassing policy gates, launching benchmarks by itself, or converting a request into proof.

Append-only or mutable behavior: mutable only while draft or rejected; accepted requests should be superseded by a new row or linked correction rather than silently rewritten.

Relationship to RUN_ID evidence: no RUN_ID evidence exists yet. A request may reference desired scope but is not evidence.

### run_intents

Purpose: record that a policy gate accepted a run request and created a governed intent to run.

Allowed writers: policy-gated automation or `human_owner` when explicitly allowed by policy.

Allowed readers: `human_owner`, `automation_runner`, `dashboard_reader`, and `gpt_auditor`.

Forbidden uses: skipping settlement, treating intent as evidence, creating claims, or launching outside policy.

Append-only or mutable behavior: append-only for creation; settlement fields may move through explicit terminal states. Every run intent must eventually be settled.

Relationship to RUN_ID evidence: links a future or completed run to the request chain. It is not evidence and does not replace RUN_ID artifacts.

### runs

Purpose: registry pointer to raw RUN_ID evidence.

Allowed writers: `automation_runner` for metadata inserts and explicit settlement updates; `human_owner` only for policy-permitted corrections with audit trail.

Allowed readers: `human_owner`, `automation_runner`, `dashboard_reader`, and `gpt_auditor`.

Forbidden uses: storing primary evidence, replacing RUN_ID evidence, storing benchmark authority, claim promotion, or silently editing evidence metadata.

Append-only or mutable behavior: insert-only for run registration; correction requires a new event and explicit correction metadata.

Relationship to RUN_ID evidence: stores pointer/hash metadata only. Raw RUN_ID evidence remains authoritative outside Supabase.

### events

Purpose: append-only event log for requests, policy gates, runs, surfaces, and cockpit activity.

Allowed writers: `automation_runner` and `service_role` for operational event insertion; `human_owner` may insert human audit annotations when policy allows.

Allowed readers: `human_owner`, `automation_runner`, `dashboard_reader`, and `gpt_auditor`.

Forbidden uses: silent updates, claim creation, decision substitution, or evidence replacement.

Append-only or mutable behavior: append-only. Events must not be updated silently. Corrections require new events.

Relationship to RUN_ID evidence: may point to RUN_ID evidence or metadata events. Event rows are audit context, not primary evidence.

### decisions

Purpose: human-only decision log with separated decision channels.

Allowed writers: `human_owner` only.

Allowed readers: `human_owner`, `dashboard_reader`, and `gpt_auditor`.

Forbidden uses: automation-written decisions, service-role claim approval, merging claim and merge channels, or treating merge decisions as claim decisions.

Append-only or mutable behavior: append-only. Revisions require a superseding decision row.

Relationship to RUN_ID evidence: decisions may cite RUN_ID evidence pointers, but do not replace the evidence. A decision without valid evidence and policy support blocks.

Required decision channels:

```txt
MERGE_DECISION
CLAIM_DECISION
```

A merge decision is not a claim decision.

### surfaces

Purpose: track surfaces used by automation, repair, dashboards, datasets, runners, agent APIs, and no-code cockpit views.

Allowed writers: `human_owner` and policy-gated automation for observed surface registration.

Allowed readers: `human_owner`, `automation_runner`, `dashboard_reader`, and `gpt_auditor`.

Forbidden uses: hiding surfaces, promoting repair surfaces to proof, exposing holdout content, or treating unknown surfaces as safe.

Append-only or mutable behavior: append-only for surface observations; deprecation or correction requires a new row or explicit state transition.

Relationship to RUN_ID evidence: surfaces may identify where RUN_ID evidence was generated, displayed, or checked. Surfaces used for repair cannot become promotion-grade evidence.

### policies

Purpose: registry index of policy versions and lock-file hashes.

Allowed writers: `human_owner` or policy maintenance automation explicitly authorized by repository policy.

Allowed readers: `human_owner`, `automation_runner`, `dashboard_reader`, `gpt_auditor`, and `codex_executor` for read-only policy orientation when allowed.

Forbidden uses: replacing policy lock files, overriding repository trust root, inventing policy authority, or silently accepting missing policy.

Append-only or mutable behavior: append-only policy version index. Corrections require superseding rows.

Relationship to RUN_ID evidence: policy rows can identify which policy version governed a RUN_ID. They are not evidence.

## Actor Classes

### human_owner

Read permissions: full governance read access, excluding holdout contents unless separately authorized outside PR-00B.

Write permissions: may create run requests, make `MERGE_DECISION`, make `CLAIM_DECISION`, and maintain policy/surface metadata only within repository policy.

Forbidden actions: bypassing policy locks, treating cockpit rows as proof, exposing holdout contents to agents, silently rewriting audit history, or making claims without valid evidence.

Scientific authority: limited by policy. Human ownership is required for decisions, but it is not enough by itself to create a scientific claim.

### automation_runner

Read permissions: policy-gated metadata needed to execute accepted intents and write run/event metadata.

Write permissions: insert events and runs metadata only; may settle run intents only through explicit policy-gated paths.

Forbidden actions: writing decisions, approving claims, merging, promoting, exposing holdout contents, or authorizing science.

Scientific authority: none.

### dashboard_reader

Read permissions: read-only cockpit views and approved metadata.

Write permissions: none.

Forbidden actions: writing events, runs, policies, surfaces, decisions, claims, or evidence.

Scientific authority: none. Dashboard read does not imply proof.

### gpt_auditor

Read permissions: audit input, selected metadata, policy index rows, decision logs, and run pointers as allowed by policy.

Write permissions: none in PR-00B.

Forbidden actions: writing claims, writing decisions, promoting evidence, changing policies, direct holdout access, or acting as merge authority.

Scientific authority: none.

### codex_executor

Read permissions: repository files and PR-00B docs/specs. Supabase read access is not required for PR-00B and would need explicit later authorization.

Write permissions: no direct Supabase write authority in PR-00B.

Forbidden actions: deploying Supabase, creating n8n workflows, creating CI, modifying runtime code, writing database rows, exposing holdout contents, or making scientific claims.

Scientific authority: none.

### service_role

Read permissions: operational database access required for maintenance and automation.

Write permissions: operational power only, under explicit policy-bound use.

Forbidden actions: creating scientific authority, approving claims, approving merges, bypassing decision channels, silently rewriting audit history, or exposing holdout contents to agent APIs.

Scientific authority: none. The service role is operational power, not scientific authority.

## RLS And Permission Principles

Required principles:

```txt
default deny
least privilege
events insert-only for automation
decisions human-only
policies restricted
runs automation-limited
holdout never exposed to agent API
missing explicit policy means blocked
service role is not a scientific authority
dashboard read does not imply proof
```

RLS must be enabled on all PR-00B tables. The absence of an explicit policy means no access. Any helper function that cannot identify a known actor must return blocked behavior. The service role may have operational ability in Supabase, but that ability does not carry scientific, merge, benchmark, or promotion authority.

## Holdout Boundary

Codex may see `holdout_set_id` only.

Codex must not see:

- holdout positions
- individual holdout IDs
- individual holdout hashes
- descriptive holdout names

Supabase agent-facing APIs must not expose holdout contents. Any view, RPC, edge function, export, dashboard, workflow, or agent API that exposes holdout contents to Codex or GPT auditors is blocked.

## Fail-Closed Rules

Required fail-closed rules:

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

No PR-00B component may convert unknown or invalid governance state into permissive execution. The only acceptable default for missing authority is blocked.

## Scientific Claim Restriction

PR-00B is no-code governance specification. It does not evaluate engine strength, benchmark results, model quality, dataset quality, tactical performance, statistical significance, or scientific conclusions.

Expected verdict:

```txt
software_verdict: NOT_RUN
evidence_verdict: NO_CODE_SPEC_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

