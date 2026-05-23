-- PR-00B Supabase registry/cockpit draft schema.
-- Specification only: do not deploy as part of PR-00B.
-- Scientific verdict: NOT_RUN / NO_CODE_SPEC_ONLY / NO_CLAIM_ALLOWED.

create schema if not exists pr00b_no_code;

create type pr00b_no_code.actor_class as enum (
  'human_owner',
  'automation_runner',
  'dashboard_reader',
  'gpt_auditor',
  'codex_executor',
  'service_role'
);

create type pr00b_no_code.request_status as enum (
  'DRAFT',
  'REQUESTED',
  'REJECTED',
  'ACCEPTED',
  'SUPERSEDED'
);

create type pr00b_no_code.intent_status as enum (
  'ACCEPTED',
  'RUNNING',
  'SETTLED_SUCCESS',
  'SETTLED_FAILED',
  'SETTLED_BLOCKED',
  'SETTLED_SUPERSEDED'
);

create type pr00b_no_code.run_status as enum (
  'REGISTERED',
  'COMPLETE',
  'FAILED',
  'BLOCKED',
  'SUPERSEDED'
);

create type pr00b_no_code.decision_channel as enum (
  'MERGE_DECISION',
  'CLAIM_DECISION'
);

create type pr00b_no_code.decision_result as enum (
  'APPROVE',
  'REJECT',
  'REQUEST_CHANGES',
  'BLOCKED'
);

create type pr00b_no_code.surface_kind as enum (
  'automation',
  'repair',
  'dashboard',
  'dataset',
  'runner',
  'agent_api',
  'policy',
  'other'
);

create table if not exists pr00b_no_code.run_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by pr00b_no_code.actor_class not null,
  requested_at timestamptz not null default now(),
  status pr00b_no_code.request_status not null default 'REQUESTED',
  title text not null,
  requested_scope jsonb not null default '{}'::jsonb,
  policy_version_id uuid,
  notes text,
  supersedes_request_id uuid references pr00b_no_code.run_requests(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint run_requests_human_or_ui_only check (requested_by = 'human_owner')
);

comment on table pr00b_no_code.run_requests is
  'Human or approved UI request for a future run. Must not authorize science or create claims.';
comment on column pr00b_no_code.run_requests.requested_scope is
  'Request metadata only. Not evidence and not benchmark authority.';

create table if not exists pr00b_no_code.run_intents (
  id uuid primary key default gen_random_uuid(),
  run_request_id uuid not null references pr00b_no_code.run_requests(id),
  accepted_by pr00b_no_code.actor_class not null,
  accepted_at timestamptz not null default now(),
  status pr00b_no_code.intent_status not null default 'ACCEPTED',
  policy_version_id uuid not null,
  settlement_event_id uuid,
  settled_at timestamptz,
  settlement_reason text,
  created_at timestamptz not null default now(),
  constraint run_intents_known_acceptor check (accepted_by in ('human_owner', 'automation_runner', 'service_role')),
  constraint run_intents_settlement_required_when_terminal check (
    (status in ('SETTLED_SUCCESS', 'SETTLED_FAILED', 'SETTLED_BLOCKED', 'SETTLED_SUPERSEDED') and settled_at is not null)
    or
    (status in ('ACCEPTED', 'RUNNING') and settled_at is null)
  )
);

comment on table pr00b_no_code.run_intents is
  'Policy-gated accepted run intent. Every intent must eventually be settled.';

create table if not exists pr00b_no_code.runs (
  id uuid primary key default gen_random_uuid(),
  run_intent_id uuid not null references pr00b_no_code.run_intents(id),
  run_id text not null unique,
  status pr00b_no_code.run_status not null default 'REGISTERED',
  evidence_uri text not null,
  evidence_hash text not null,
  evidence_hash_algorithm text not null default 'sha256',
  evidence_size_bytes bigint,
  policy_version_id uuid not null,
  produced_by pr00b_no_code.actor_class not null,
  registered_at timestamptz not null default now(),
  correction_of_run_id text references pr00b_no_code.runs(run_id),
  correction_reason text,
  constraint runs_metadata_only_hash_present check (length(evidence_hash) >= 32),
  constraint runs_automation_limited_writer check (produced_by in ('automation_runner', 'service_role'))
);

comment on table pr00b_no_code.runs is
  'Registry pointer to raw RUN_ID evidence. Stores pointer/hash metadata only and must not replace RUN_ID evidence.';
comment on column pr00b_no_code.runs.evidence_uri is
  'Pointer to governed raw evidence location. Supabase is not primary evidence.';

create table if not exists pr00b_no_code.events (
  id uuid primary key default gen_random_uuid(),
  event_time timestamptz not null default now(),
  actor pr00b_no_code.actor_class not null,
  event_type text not null,
  run_request_id uuid references pr00b_no_code.run_requests(id),
  run_intent_id uuid references pr00b_no_code.run_intents(id),
  run_id text references pr00b_no_code.runs(run_id),
  surface_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table pr00b_no_code.events is
  'Append-only event log. Automation may insert events. Events must not be updated silently.';

create table if not exists pr00b_no_code.decisions (
  id uuid primary key default gen_random_uuid(),
  decision_channel pr00b_no_code.decision_channel not null,
  decision_result pr00b_no_code.decision_result not null,
  decided_by pr00b_no_code.actor_class not null,
  decided_at timestamptz not null default now(),
  run_request_id uuid references pr00b_no_code.run_requests(id),
  run_intent_id uuid references pr00b_no_code.run_intents(id),
  run_id text references pr00b_no_code.runs(run_id),
  policy_version_id uuid not null,
  rationale text not null,
  evidence_summary text,
  supersedes_decision_id uuid references pr00b_no_code.decisions(id),
  created_at timestamptz not null default now(),
  constraint decisions_human_only check (decided_by = 'human_owner')
);

comment on table pr00b_no_code.decisions is
  'Human-only decision log. MERGE_DECISION and CLAIM_DECISION are separate channels; a merge decision is not a claim decision.';

create table if not exists pr00b_no_code.surfaces (
  id uuid primary key default gen_random_uuid(),
  surface_key text not null unique,
  surface_kind pr00b_no_code.surface_kind not null,
  declared_by pr00b_no_code.actor_class not null,
  declared_at timestamptz not null default now(),
  policy_version_id uuid not null,
  promotion_grade_allowed boolean not null default false,
  repair_surface boolean not null default false,
  exposes_holdout_contents boolean not null default false,
  description text not null,
  supersedes_surface_id uuid references pr00b_no_code.surfaces(id),
  created_at timestamptz not null default now(),
  constraint surfaces_unknown_not_allowed check (surface_kind <> 'other'),
  constraint surfaces_repair_not_promotion_grade check (
    not (repair_surface and promotion_grade_allowed)
  ),
  constraint surfaces_holdout_not_agent_api check (
    not (surface_kind = 'agent_api' and exposes_holdout_contents)
  )
);

comment on table pr00b_no_code.surfaces is
  'Tracks automation, repair, dashboard, dataset, runner, and agent API surfaces. Repair surfaces cannot become promotion-grade evidence.';

create table if not exists pr00b_no_code.policies (
  id uuid primary key default gen_random_uuid(),
  policy_name text not null,
  policy_version text not null,
  repo_path text not null,
  lock_file_hash text not null,
  lock_file_hash_algorithm text not null default 'sha256',
  indexed_by pr00b_no_code.actor_class not null,
  indexed_at timestamptz not null default now(),
  supersedes_policy_id uuid references pr00b_no_code.policies(id),
  active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  constraint policies_restricted_indexer check (indexed_by in ('human_owner', 'service_role')),
  constraint policies_hash_present check (length(lock_file_hash) >= 32)
);

comment on table pr00b_no_code.policies is
  'Registry index of policy versions. The policy registry is not the policy authority; repo lock files remain the trust root.';

alter table pr00b_no_code.run_requests
  add constraint run_requests_policy_fk
  foreign key (policy_version_id) references pr00b_no_code.policies(id);

alter table pr00b_no_code.run_intents
  add constraint run_intents_policy_fk
  foreign key (policy_version_id) references pr00b_no_code.policies(id);

alter table pr00b_no_code.runs
  add constraint runs_policy_fk
  foreign key (policy_version_id) references pr00b_no_code.policies(id);

alter table pr00b_no_code.events
  add constraint events_surface_fk
  foreign key (surface_id) references pr00b_no_code.surfaces(id);

alter table pr00b_no_code.decisions
  add constraint decisions_policy_fk
  foreign key (policy_version_id) references pr00b_no_code.policies(id);

alter table pr00b_no_code.surfaces
  add constraint surfaces_policy_fk
  foreign key (policy_version_id) references pr00b_no_code.policies(id);

