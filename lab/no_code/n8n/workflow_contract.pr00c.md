# PR-00C Workflow Contract

This contract defines the intended n8n entry workflow behavior as a reviewable specification. It is not an exported n8n workflow and must not be treated as deployable automation.

## Contract Summary

The workflow accepts a `RunRequest`, validates its shape, applies a fail-closed policy gate, records audit events, and permits only a future dispatch request after policy acceptance.

```txt
Webhook RunRequest
-> Validate request shape
-> Policy Gate
-> if violation: Stop And Error + EVENT_BLOCKED
-> if pass: RUN_INTENT_CREATED
-> dispatch GitHub workflow or local runner later
-> record event
```

## Nodes

### Webhook RunRequest

Purpose: receive a proposed run request from an approved surface.

Required behavior:

- accept JSON only
- reject non-object payloads
- reject missing required fields
- reject unknown actor classes
- reject unknown surfaces
- reject unknown run types
- reject secrets or suspected secrets in payload
- reject holdout contents or suspected holdout contents in payload

Failure behavior: Stop And Error, emit `EVENT_BLOCKED`, and emit a specific block event when applicable.

### Validate Request Shape

Purpose: validate the incoming payload against `run_request_schema.pr00c.json`.

Required behavior:

- enforce all required fields
- enforce opaque `request_id`
- enforce known `actor_class`
- enforce non-empty `policy_refs`
- enforce non-empty `surface_refs`
- enforce declared `dispatch_target`
- treat `claim_scope_requested` as a request only
- allow `dataset_id` and `split_id` to be null only for `BOOTSTRAP_ONLY` or governance/spec tasks

Failure behavior: emit `RUN_REQUEST_SCHEMA_INVALID`, `EVENT_BLOCKED`, and `WORKFLOW_STOPPED_AND_ERRORED`.

### Policy Gate

Purpose: determine whether the request is allowed to become a run intent.

Required behavior:

- require all policy locks to exist
- require all policy locks to be valid
- require the actor to be known
- require every surface to be declared
- require the dispatch target to be declared
- require claim scope compatibility with policy
- require the holdout boundary to be respected
- require no secret or suspected secret in request payload
- forbid silent fallback
- forbid best-effort fallback
- forbid manual override as a policy bypass

Failure behavior: emit `POLICY_GATE_BLOCKED`, `EVENT_BLOCKED`, and `WORKFLOW_STOPPED_AND_ERRORED`.

### RUN_INTENT_CREATED

Purpose: record that a valid request passed the policy gate.

Required behavior:

- record only audit context
- preserve the request meaning without mutation
- include policy references used for acceptance
- include surface references used for acceptance
- include dispatch target declaration
- exclude secrets
- exclude holdout contents

This event is not evidence and does not create claim authority.

### Future Dispatch Request

Purpose: describe a future interface where a GitHub workflow or local runner may be requested after policy acceptance.

Required behavior:

- only allowed after request schema validation passes
- only allowed after policy gate passes
- only allowed after `RUN_INTENT_CREATED` is recorded
- must not create live GitHub Actions workflow files in PR-00C
- must not launch a benchmark in PR-00C
- must not mutate the request meaning during retry

Failure behavior: emit `DISPATCH_BLOCKED`, `EVENT_BLOCKED`, and `WORKFLOW_STOPPED_AND_ERRORED`.

## Retry Rule

Retry may repeat validation or event recording after an infrastructure failure only if it preserves the exact request meaning. Retry must not change actor, surface, run type, dataset, split, claim scope, policy references, dispatch target, or reason.

## Manual Override Rule

Manual override may add a human decision record, but it is not a policy bypass. A request blocked by policy remains blocked until policy itself allows it through a reviewed policy change outside PR-00C.
