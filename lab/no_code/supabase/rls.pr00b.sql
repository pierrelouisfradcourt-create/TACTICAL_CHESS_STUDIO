-- PR-00B Supabase draft RLS and permission rules.
-- Specification only: do not deploy as part of PR-00B.
-- Missing explicit policy means blocked.
-- Service role is operational power, not scientific authority.

alter table pr00b_no_code.run_requests enable row level security;
alter table pr00b_no_code.run_intents enable row level security;
alter table pr00b_no_code.runs enable row level security;
alter table pr00b_no_code.events enable row level security;
alter table pr00b_no_code.decisions enable row level security;
alter table pr00b_no_code.surfaces enable row level security;
alter table pr00b_no_code.policies enable row level security;

alter table pr00b_no_code.run_requests force row level security;
alter table pr00b_no_code.run_intents force row level security;
alter table pr00b_no_code.runs force row level security;
alter table pr00b_no_code.events force row level security;
alter table pr00b_no_code.decisions force row level security;
alter table pr00b_no_code.surfaces force row level security;
alter table pr00b_no_code.policies force row level security;

revoke all on schema pr00b_no_code from public;
revoke all on all tables in schema pr00b_no_code from public;
revoke all on all sequences in schema pr00b_no_code from public;
revoke all on all functions in schema pr00b_no_code from public;

create or replace function pr00b_no_code.current_actor_class()
returns pr00b_no_code.actor_class
language sql
stable
as $$
  select nullif(current_setting('app.actor_class', true), '')::pr00b_no_code.actor_class
$$;

create or replace function pr00b_no_code.is_actor(allowed pr00b_no_code.actor_class[])
returns boolean
language sql
stable
as $$
  select pr00b_no_code.current_actor_class() = any(allowed)
$$;

create or replace function pr00b_no_code.fail_closed_known_actor()
returns boolean
language sql
stable
as $$
  select pr00b_no_code.current_actor_class() is not null
$$;

-- Default deny is achieved by enabling RLS and defining only explicit policies.
-- Unknown actor blocks because current_actor_class() returns null or cast failure.
-- Invalid policy blocks must be enforced by application/policy-gate validation before writes.

create policy run_requests_select_governance_read
on pr00b_no_code.run_requests
for select
using (
  pr00b_no_code.is_actor(array[
    'human_owner',
    'dashboard_reader',
    'gpt_auditor',
    'automation_runner'
  ]::pr00b_no_code.actor_class[])
);

create policy run_requests_insert_human_only
on pr00b_no_code.run_requests
for insert
with check (
  pr00b_no_code.current_actor_class() = 'human_owner'
  and requested_by = 'human_owner'
);

create policy run_requests_update_limited_human
on pr00b_no_code.run_requests
for update
using (pr00b_no_code.current_actor_class() = 'human_owner')
with check (pr00b_no_code.current_actor_class() = 'human_owner');

create policy run_intents_select_governance_read
on pr00b_no_code.run_intents
for select
using (
  pr00b_no_code.is_actor(array[
    'human_owner',
    'automation_runner',
    'dashboard_reader',
    'gpt_auditor'
  ]::pr00b_no_code.actor_class[])
);

create policy run_intents_insert_policy_gated
on pr00b_no_code.run_intents
for insert
with check (
  pr00b_no_code.is_actor(array['human_owner', 'automation_runner']::pr00b_no_code.actor_class[])
  and accepted_by = pr00b_no_code.current_actor_class()
);

create policy run_intents_settle_automation_limited
on pr00b_no_code.run_intents
for update
using (
  pr00b_no_code.is_actor(array['human_owner', 'automation_runner']::pr00b_no_code.actor_class[])
)
with check (
  pr00b_no_code.is_actor(array['human_owner', 'automation_runner']::pr00b_no_code.actor_class[])
);

create policy runs_select_governance_read
on pr00b_no_code.runs
for select
using (
  pr00b_no_code.is_actor(array[
    'human_owner',
    'automation_runner',
    'dashboard_reader',
    'gpt_auditor'
  ]::pr00b_no_code.actor_class[])
);

create policy runs_insert_automation_metadata_only
on pr00b_no_code.runs
for insert
with check (
  pr00b_no_code.current_actor_class() = 'automation_runner'
  and produced_by = 'automation_runner'
);

create policy runs_update_human_correction_or_automation_settlement
on pr00b_no_code.runs
for update
using (
  pr00b_no_code.is_actor(array['human_owner', 'automation_runner']::pr00b_no_code.actor_class[])
)
with check (
  pr00b_no_code.is_actor(array['human_owner', 'automation_runner']::pr00b_no_code.actor_class[])
);

create policy events_select_governance_read
on pr00b_no_code.events
for select
using (
  pr00b_no_code.is_actor(array[
    'human_owner',
    'automation_runner',
    'dashboard_reader',
    'gpt_auditor'
  ]::pr00b_no_code.actor_class[])
);

create policy events_insert_automation_or_human_annotation
on pr00b_no_code.events
for insert
with check (
  pr00b_no_code.is_actor(array['human_owner', 'automation_runner']::pr00b_no_code.actor_class[])
  and actor = pr00b_no_code.current_actor_class()
);

-- No update/delete policy for events: events are insert-only.

create policy decisions_select_human_audit_read
on pr00b_no_code.decisions
for select
using (
  pr00b_no_code.is_actor(array[
    'human_owner',
    'dashboard_reader',
    'gpt_auditor'
  ]::pr00b_no_code.actor_class[])
);

create policy decisions_insert_human_only
on pr00b_no_code.decisions
for insert
with check (
  pr00b_no_code.current_actor_class() = 'human_owner'
  and decided_by = 'human_owner'
  and decision_channel in ('MERGE_DECISION', 'CLAIM_DECISION')
);

-- No update/delete policy for decisions: decisions are append-only.
-- A MERGE_DECISION is not a CLAIM_DECISION.

create policy surfaces_select_governance_read
on pr00b_no_code.surfaces
for select
using (
  pr00b_no_code.is_actor(array[
    'human_owner',
    'automation_runner',
    'dashboard_reader',
    'gpt_auditor'
  ]::pr00b_no_code.actor_class[])
);

create policy surfaces_insert_human_or_policy_gated_automation
on pr00b_no_code.surfaces
for insert
with check (
  pr00b_no_code.is_actor(array['human_owner', 'automation_runner']::pr00b_no_code.actor_class[])
  and declared_by = pr00b_no_code.current_actor_class()
  and surface_kind <> 'other'
  and not (repair_surface and promotion_grade_allowed)
  and not (surface_kind = 'agent_api' and exposes_holdout_contents)
);

create policy surfaces_update_human_only
on pr00b_no_code.surfaces
for update
using (pr00b_no_code.current_actor_class() = 'human_owner')
with check (pr00b_no_code.current_actor_class() = 'human_owner');

create policy policies_select_governance_read
on pr00b_no_code.policies
for select
using (
  pr00b_no_code.is_actor(array[
    'human_owner',
    'automation_runner',
    'dashboard_reader',
    'gpt_auditor',
    'codex_executor'
  ]::pr00b_no_code.actor_class[])
);

create policy policies_insert_restricted
on pr00b_no_code.policies
for insert
with check (
  pr00b_no_code.current_actor_class() = 'human_owner'
  and indexed_by = 'human_owner'
);

create policy policies_update_human_only
on pr00b_no_code.policies
for update
using (pr00b_no_code.current_actor_class() = 'human_owner')
with check (pr00b_no_code.current_actor_class() = 'human_owner');

-- Holdout rule for every agent-facing API:
-- Codex may see holdout_set_id only.
-- Do not expose holdout positions, individual holdout IDs, individual holdout hashes,
-- descriptive holdout names, or holdout contents through Supabase views/RPC/API.

