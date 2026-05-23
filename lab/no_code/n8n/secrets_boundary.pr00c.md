# PR-00C Secrets And Holdout Boundary

This document defines the n8n entry workflow boundary for secrets and holdout content. It applies to webhook payloads, audit events, future cockpit rows, future dispatch requests, and any future interaction with GPT or Codex.

## Secrets Boundary

n8n workflows must not print secrets.

n8n workflows must not store secrets in reports.

n8n workflows must not send secrets to GPT or Codex.

n8n workflows must not include credentials in exported JSON.

Secret detection blocks.

Suspected secret blocks.

Redaction is not enough to continue scientific flow.

Secret leak triggers Stop And Error.

## Secret-Like Content

The workflow must block content that appears to include:

- API keys
- bearer tokens
- passwords
- private keys
- service role secrets
- database connection strings with credentials
- cloud credentials
- n8n credential payloads
- `.env` contents

When secret-like content is detected, the workflow must emit `SECRET_LEAK_BLOCKED`, `EVENT_BLOCKED`, and `WORKFLOW_STOPPED_AND_ERRORED`.

## Holdout Boundary

Codex may see `holdout_set_id` only.

Codex must not see holdout positions.

Codex must not see individual holdout IDs.

Codex must not see individual holdout hashes.

Codex must not see descriptive holdout names.

n8n must not pass holdout contents to GPT or Codex.

Holdout exposure triggers Stop And Error.

## Holdout-Like Content

The workflow must block content that appears to include:

- holdout positions
- holdout FEN strings
- holdout PGN fragments
- individual holdout IDs
- individual holdout hashes
- descriptive holdout names
- lists or samples of withheld examples

When holdout-like content is detected, the workflow must emit `HOLDOUT_EXPOSURE_BLOCKED`, `EVENT_BLOCKED`, and `WORKFLOW_STOPPED_AND_ERRORED`.

## Audit Boundary

Events may record detection classes and payload location classes. Events must not store the secret or holdout content itself.

Allowed examples:

- `secret_detection_class: suspected_bearer_token`
- `payload_location_class: reason_field`
- `holdout_detection_class: suspected_holdout_position`

Forbidden examples:

- the actual token
- the actual password
- the actual holdout position
- the actual holdout ID
- the actual holdout hash
- the descriptive holdout name

## Claim Boundary

A secret leak or holdout exposure blocks the scientific flow. Redacting the payload after exposure does not allow the same request to continue into evidence, benchmark, promotion, or claim review.
