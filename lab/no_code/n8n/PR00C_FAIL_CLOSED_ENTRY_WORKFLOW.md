# PR-00C Fail-Closed Entry Workflow

PR-00C documents the n8n fail-closed entry workflow for TacticalChessPureLab Research OS V9.2. It is a draft specification for review. It is not a deployment artifact and must not be imported as a live n8n workflow.

## Authority Boundary

PR-00C authority is limited to the n8n entry workflow specification.

It does not:

- deploy n8n
- create real n8n credentials
- create CI
- create GitHub Actions workflows
- modify runtime code
- modify the engine
- modify tests
- run benchmarks
- make scientific claims
- promote a model
- merge code

The workflow may block unsafe requests, log audit events, and describe a future dispatch boundary. It must not convert a request into evidence or a claim.

```txt
n8n orchestrates.
n8n does not prove.
n8n does not authorize scientific claims.
```

```txt
Stop And Error is the safe default.
Best-effort fallback is forbidden.
```

## Entry Workflow Shape

```txt
Webhook RunRequest
-> Validate request shape
-> Policy Gate
-> if violation: Stop And Error + EVENT_BLOCKED
-> if pass: RUN_INTENT_CREATED
-> dispatch GitHub workflow or local runner later
-> record event
```

## Required Request Handling

1. Receive a `RunRequest` through the n8n webhook entrypoint.
2. Record `RUN_REQUEST_RECEIVED` as audit context only.
3. Validate the request against `run_request_schema.pr00c.json`.
4. If schema validation fails, record `RUN_REQUEST_SCHEMA_INVALID`, record `EVENT_BLOCKED`, emit `WORKFLOW_STOPPED_AND_ERRORED`, and stop.
5. If schema validation passes, record `RUN_REQUEST_SCHEMA_VALIDATED`.
6. Start the policy gate and record `POLICY_GATE_STARTED`.
7. Check all required policy locks, actor declarations, surface declarations, dispatch declarations, claim compatibility, secret boundary, and holdout boundary.
8. If any policy gate check fails, record `POLICY_GATE_BLOCKED`, record the specific block event when applicable, record `EVENT_BLOCKED`, emit `WORKFLOW_STOPPED_AND_ERRORED`, and stop.
9. If all policy gate checks pass, record `POLICY_GATE_PASSED`.
10. Record `RUN_INTENT_CREATED`.
11. Future dispatch may be requested only after `RUN_INTENT_CREATED` is recorded and the dispatch boundary still passes.
12. Record dispatch audit context if a future implementation requests dispatch.

## Policy Gate Checks

The policy gate must verify:

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
- `actor is known`
- `surface is declared`
- `dispatch target is declared`
- `claim_scope_requested is policy-compatible`
- `holdout boundary respected`
- `no secret in request`
- `no silent fallback`

Missing policy is Stop And Error. Invalid policy is Stop And Error. Unknown actor, unknown surface, unknown run type, unknown dispatch target, incompatible claim scope, suspected secret, or suspected holdout exposure is Stop And Error.

## Claim Boundary

`claim_scope_requested` is a request, not authorization. No n8n event, RunRequest, or Run Intent is scientific evidence. No n8n workflow output authorizes a strength claim, promotion claim, benchmark claim, or generalization claim.

PR-00C itself has:

```txt
claim_verdict: NO_CLAIM_ALLOWED
```
## Holdout Boundary

Codex may see `holdout_set_id` only. Codex must not see holdout positions, individual holdout IDs, individual holdout hashes, or descriptive holdout names. n8n must not pass holdout contents to GPT or Codex. Holdout exposure triggers Stop And Error.

## Expected Verdict

```txt
software_verdict: NOT_RUN
evidence_verdict: ORCHESTRATION_SPEC_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
