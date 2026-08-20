# PR-00C Fail-Closed Rules

Stop And Error is the safe default. Best-effort fallback is forbidden.

## Mandatory Stop And Error Rules

- missing policy = Stop And Error
- invalid policy = Stop And Error
- invalid request schema = Stop And Error
- unknown actor = Stop And Error
- unknown surface = Stop And Error
- unknown run type = Stop And Error
- missing required RunRequest field = Stop And Error
- invalid decision channel = Stop And Error
- secret detected in payload = Stop And Error
- holdout content detected in payload = Stop And Error
- best effort fallback forbidden
- silent fallback forbidden
- retry must not mutate request meaning
- manual override is not a policy bypass

## Policy Missing Or Invalid

If any required policy lock is missing or invalid, the workflow must emit `POLICY_GATE_BLOCKED`, `EVENT_BLOCKED`, and `WORKFLOW_STOPPED_AND_ERRORED`.

Required policy checks:

- `root_policy exists`
- `root_policy valid`
- `claim_policy exists`
- `claim_policy valid`
- `repair_policy exists`
- `repair_policy valid`
- `surface_policy exists`
- `surface_policy valid`
- `data_policy exists`
- `data_policy valid`
- `reasoning_policy exists`
- `reasoning_policy valid`

## Unknown Actor, Surface, Run Type, Or Decision Channel

Unknown identity or routing context is not a warning. It blocks the workflow.

The allowed `actor_class` values are:

- `human_owner`
- `automation_runner`
- `dashboard_reader`
- `gpt_auditor`
- `codex_executor`
- `service_role`

The surface must be declared in policy. The run type must be known to the schema and policy gate. The decision channel must be declared before it can be used.

## Secret Boundary Rule

Secret detection blocks. Suspected secret detection blocks. Redaction is not enough to continue a scientific flow. A secret leak triggers `SECRET_LEAK_BLOCKED`, `EVENT_BLOCKED`, and `WORKFLOW_STOPPED_AND_ERRORED`.

## Holdout Boundary Rule

Codex may see `holdout_set_id` only. Codex must not see holdout positions, individual holdout IDs, individual holdout hashes, or descriptive holdout names. n8n must not pass holdout contents to GPT or Codex. Holdout exposure triggers `HOLDOUT_EXPOSURE_BLOCKED`, `EVENT_BLOCKED`, and `WORKFLOW_STOPPED_AND_ERRORED`.

## Fallback Rule

The workflow must never silently continue with a different policy, actor, surface, run type, dataset, split, dispatch target, or claim scope. If the requested route is unavailable or invalid, the workflow stops and errors.

## Retry Rule

Retry may preserve delivery semantics. Retry must not mutate request meaning. A retry that changes the request is a new request and must receive a new opaque `request_id`.

## Manual Override Rule

Manual override is not a policy bypass. It may create an audit decision, but it cannot convert a blocked request into an accepted run intent unless the governing policy permits that path.
