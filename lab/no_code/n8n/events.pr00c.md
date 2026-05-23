# PR-00C Events

Events are audit context, not proof. They may support traceability for a future no-code cockpit, but they do not replace primary `RUN_ID` evidence and do not authorize scientific claims.

## Common Event Contract

Allowed emitters:

- n8n entry workflow spec
- future policy gate adapter
- future dispatch adapter
- future human decision surface

Required common fields:

- `event_name`
- `event_time`
- `request_id`
- `actor_class`
- `surface_refs`
- `policy_refs`
- `workflow_spec`
- `software_verdict`
- `evidence_verdict`
- `claim_verdict`

Forbidden common fields:

- secrets
- credentials
- environment variables containing secrets
- holdout positions
- individual holdout IDs
- individual holdout hashes
- descriptive holdout names
- primary evidence payloads
- benchmark result payloads
- claim authorization text

Relationship to Supabase events table: PR-00C events may be represented as rows in a future Supabase events table defined outside this PR. That table is registry/audit context only.

Relationship to `RUN_ID` evidence: PR-00C events may point to a `RUN_ID` after a separate validated run exists. They are not themselves `RUN_ID` evidence and must not be used as proof.

## Event Definitions

### RUN_REQUEST_RECEIVED

Purpose: records that the webhook received a proposed `RunRequest`.

Allowed emitter: n8n entry workflow.

Required fields: common fields plus `received_payload_digest`, `schema_version`.

Forbidden fields: raw secret values, holdout contents, raw benchmark outputs.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: no `RUN_ID` exists yet.

### RUN_REQUEST_SCHEMA_VALIDATED

Purpose: records that the `RunRequest` shape matched `run_request_schema.pr00c.json`.

Allowed emitter: n8n entry workflow.

Required fields: common fields plus `schema_id`, `schema_digest`.

Forbidden fields: policy acceptance, dispatch proof, scientific claim.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: not evidence.

### RUN_REQUEST_SCHEMA_INVALID

Purpose: records that the `RunRequest` shape failed validation.

Allowed emitter: n8n entry workflow.

Required fields: common fields plus `schema_id`, `failure_reason_class`.

Forbidden fields: full invalid payload if it may contain secrets or holdout contents.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: no `RUN_ID` is created.

### POLICY_GATE_STARTED

Purpose: records that policy checks began after schema validation.

Allowed emitter: policy gate.

Required fields: common fields plus `policy_gate_version`.

Forbidden fields: policy bypass instruction, claim authorization.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: not evidence.

### POLICY_GATE_PASSED

Purpose: records that all required policy gate checks passed.

Allowed emitter: policy gate.

Required fields: common fields plus `policy_checks_passed`, `policy_digest_set`.

Forbidden fields: proof language, promotion language, strength claim authorization.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: permits only a run intent, not evidence.

### POLICY_GATE_BLOCKED

Purpose: records that at least one policy gate check failed.

Allowed emitter: policy gate.

Required fields: common fields plus `blocked_check`, `failure_reason_class`.

Forbidden fields: secret values, holdout contents, fallback dispatch target.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: no `RUN_ID` is created.

### RUN_INTENT_CREATED

Purpose: records that a request passed schema validation and policy gate checks.

Allowed emitter: policy gate.

Required fields: common fields plus `run_intent_id`, `dispatch_target`, `policy_digest_set`.

Forbidden fields: live credentials, benchmark results, scientific claim approval.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: may precede a future run, but is not run evidence.

### DISPATCH_REQUESTED

Purpose: records that a future dispatch interface was requested after `RUN_INTENT_CREATED`.

Allowed emitter: future dispatch adapter.

Required fields: common fields plus `run_intent_id`, `dispatch_target`, `dispatch_mode`.

Forbidden fields: live credential values, workflow secrets, benchmark outputs.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: dispatch request is not evidence.

### DISPATCH_BLOCKED

Purpose: records that dispatch was refused.

Allowed emitter: future dispatch adapter.

Required fields: common fields plus `run_intent_id`, `blocked_reason_class`.

Forbidden fields: fallback target, secret values, holdout contents.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: no evidence is created by blocked dispatch.

### EVENT_BLOCKED

Purpose: records that the workflow intentionally blocked unsafe continuation.

Allowed emitter: n8n entry workflow, policy gate, or future dispatch adapter.

Required fields: common fields plus `blocked_event_name`, `blocked_reason_class`.

Forbidden fields: raw secret, raw holdout content, retry mutation.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: not evidence.

### SECRET_LEAK_BLOCKED

Purpose: records that a secret or suspected secret was detected and blocked.

Allowed emitter: n8n entry workflow or policy gate.

Required fields: common fields plus `secret_detection_class`, `payload_location_class`.

Forbidden fields: the secret itself, reversible redaction, credential metadata sufficient to reconstruct the secret.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: no scientific flow may continue.

### HOLDOUT_EXPOSURE_BLOCKED

Purpose: records that holdout content or suspected holdout content was detected and blocked.

Allowed emitter: n8n entry workflow or policy gate.

Required fields: common fields plus `holdout_detection_class`, `payload_location_class`.

Forbidden fields: holdout positions, individual holdout IDs, individual holdout hashes, descriptive holdout names.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: no scientific flow may continue.

### WORKFLOW_STOPPED_AND_ERRORED

Purpose: records that the safe terminal state was Stop And Error.

Allowed emitter: n8n entry workflow, policy gate, or future dispatch adapter.

Required fields: common fields plus `terminal_reason_class`, `last_safe_event`.

Forbidden fields: fallback continuation, success claim, proof claim.

Relationship to Supabase events table: audit row only.

Relationship to `RUN_ID` evidence: confirms no valid run evidence was created by the stopped workflow.
