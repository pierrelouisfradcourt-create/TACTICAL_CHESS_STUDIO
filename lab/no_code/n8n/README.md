# n8n Fail-Closed Entry Workflow

Status: PR-00C draft specification only. This directory does not deploy n8n, create n8n credentials, create CI, create GitHub Actions workflows, run benchmarks, modify runtime code, modify engine code, modify tests, or authorize scientific claims.

PR-00C defines the no-code orchestration entrypoint for TacticalChessPureLab Research OS V9.2. It specifies how a `RunRequest` may enter the system and how unsafe or invalid requests are blocked before any future runner dispatch interface is allowed.

```txt
n8n orchestrates.
n8n does not prove.
n8n does not authorize scientific claims.
```

```txt
Stop And Error is the safe default.
Best-effort fallback is forbidden.
```

## Workflow Shape

```txt
Webhook RunRequest
-> Validate request shape
-> Policy Gate
-> if violation: Stop And Error + EVENT_BLOCKED
-> if pass: RUN_INTENT_CREATED
-> dispatch GitHub workflow or local runner later
-> record event
```

This shape is a specification only. PR-00C does not implement live dispatch, create importable n8n workflow JSON, provision credentials, or launch benchmarks.

## Draft Files

- `PR00C_FAIL_CLOSED_ENTRY_WORKFLOW.md`: primary PR-00C entry workflow specification.
- `workflow_contract.pr00c.md`: node-level contract and fail-closed behavior.
- `run_request_schema.pr00c.json`: JSON Schema draft for `RunRequest`.
- `events.pr00c.md`: audit event definitions.
- `fail_closed_rules.pr00c.md`: mandatory Stop And Error rules.
- `dispatch_boundary.pr00c.md`: future dispatch interface boundary.
- `secrets_boundary.pr00c.md`: secrets and holdout exposure boundary.

## Expected Verdict

```txt
software_verdict: NOT_RUN
evidence_verdict: ORCHESTRATION_SPEC_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
