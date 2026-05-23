# 29) Free Clean Operator Pack V0

## Purpose

The free clean operator pack provides a minimal control-plane foundation for local PR operations.
It is designed to accelerate safe tooling and docs workflows without changing runtime behavior.

This pack is intentionally small, reversible, and non-runtime.

## Components

1. GitHub CLI wrappers (`scripts/operator/*.ps1`)
- read-only inspect wrapper
- staged validation smoke wrapper
- aggregate operator smoke wrapper

2. GitHub Actions smoke validation
- `.github/workflows/operator-pack-smoke.yml`
- pull_request and workflow_dispatch triggers
- control-plane checks only

3. JSON artifact validation entrypoint
- `scripts/operator/validate_json_artifacts.py`
- recursive JSON parseability checks on whitelisted folders

4. PR outcome records
- `schemas/pr_outcome_record.schema.json`
- minimal shape for post-PR control-plane outcome capture

5. LearningCards
- `schemas/learning_card.schema.json`
- minimal reusable lesson capture from PR events

6. Future MCP read-only sandbox
- documented below as a phased safety plan

7. Future DatasetQualityAgent
- documented below as a data-quality classification plan

## Safety Boundaries

- no runtime changes
- no gameplay/search/neural logic changes
- no benchmark claims
- no auto-merge
- no training
- no secrets handling
- no destructive commands

## Recommended Usage Modes

1. Codex Suggest
- use for audits, risk review, and bounded planning

2. Codex Auto Edit
- use for small tooling/docs PRs under clear file scope

3. Full Auto
- allowed only on isolated docs-only branches
- not allowed for runtime, engine, search, or ML surfaces

## MCP Read-Only Sandbox Plan (Future)

Phase 1 posture:
- MCP filesystem/git/memory integrations run read-only first.
- no secrets access in MCP tool scope.
- folder whitelist only (control-plane/docs/schemas/operator surfaces).
- no write tools until HumanGate exists and is validated.
- no network tools by default.

Goal:
- improve inspection coverage while preserving deny-by-default mutation controls.

## Dataset Quality Plan (Future DatasetQualityAgent)

Future agent role:
- classify candidate dataset records before any training eligibility decision.

Record classes:
- `RAW`
- `VALIDATED`
- `NOISY`
- `CONTRADICTORY`
- `OBSOLETE`
- `REVOKED`

Eligibility rule:
- `training_eligible` must remain false unless the record is validated, redacted, and human approved.

## Claim Posture

- software_verdict: `TOOLING_CONTROL_PLANE_ONLY`
- evidence_verdict: `LOCAL_OPERATOR_SMOKE_ONLY`
- claim_verdict: `NO_CLAIM_ALLOWED`
