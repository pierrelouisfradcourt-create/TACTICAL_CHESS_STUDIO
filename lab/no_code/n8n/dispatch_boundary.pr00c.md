# PR-00C Dispatch Boundary

Dispatch is a future interface only. PR-00C does not implement live dispatch, does not create GitHub Actions workflow files, does not launch a benchmark, and does not create a local runner integration.

## Dispatch Doctrine

```txt
n8n orchestrates.
n8n does not prove.
n8n does not authorize scientific claims.
```

Dispatch may request that some future runner start work only after the entry workflow has already accepted the request as a run intent. Dispatch does not create evidence by itself and does not authorize claims.

## Dispatch Is Allowed Only After

- request schema valid
- policy gate passed
- `RUN_INTENT_CREATED` event recorded
- dispatch target declared
- no secret leak
- no holdout exposure

## Dispatch Is Forbidden If

- policy missing
- policy invalid
- request invalid
- actor unknown
- surface unknown
- dispatch target unknown
- holdout content present
- secret present
- claim scope incompatible

## Future Dispatch Targets

The schema permits only declared future target classes:

- `GITHUB_WORKFLOW_FUTURE`
- `LOCAL_RUNNER_FUTURE`
- `NO_LIVE_DISPATCH_PR00C`

These are declarations for review. They are not executable workflow definitions.

## No Live Implementation

PR-00C must not create:

- `.github/workflows/` files
- n8n JSON exports intended for import
- benchmark launch scripts
- runtime dispatch code
- real n8n credentials
- `.env` files
- secrets

## Dispatch Event Boundary

`DISPATCH_REQUESTED` is audit context only. It is not evidence. It cannot be cited as proof that a run occurred, proof that a model improved, proof that a benchmark passed, or proof that a scientific claim is authorized.

`DISPATCH_BLOCKED` is the required safe path when any dispatch precondition fails.
