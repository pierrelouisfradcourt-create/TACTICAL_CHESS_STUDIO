# PR-10 Runtime Dry-Run Under Gates

Status: dry-run / contract only  
Scope: first runtime-facing harness shape under evidence-plane gates  
Claim status: no claim allowed by default; health-only maximum requires explicit human claim decision

## Purpose

PR-10 defines the first runtime-facing dry-run packet contract under the evidence-plane gates.

It does not modify chess runtime code, engine/search/neural code, datasets, benchmark logic, holdout data, or promotion rules.

## Theme

This PR uses one theme only:

```text
dry_run_runtime_validation_harness
```

The goal is to define the dry-run command packet shape before any real runtime evidence bundle exists.

## Required boundaries

A PR-10 dry-run packet must:

- be non-destructive;
- avoid holdout access;
- avoid dataset reset;
- avoid real `RUN_*` bundle creation;
- avoid `latest.json` updates;
- use a non-canonical sandbox output location;
- keep Codex, GPT-5.5, and CI from authorizing claims;
- require human review;
- keep claim scope at `NO_CLAIM_ALLOWED` unless a future human claim decision explicitly allows `HEALTH_ONLY`.

## Forbidden interpretations

Do not interpret PR-10 dry-run packets as:

- benchmark evidence;
- promotion evidence;
- strength evidence;
- Elo evidence;
- search improvement evidence;
- neural improvement evidence;
- AAA validation.

## Current validator

```text
scripts/check_runtime_dry_run_packet.py
```

## Current examples

```text
lab/runtime_dry_run/examples/valid_runtime_dry_run_packet.pr10.json
lab/runtime_dry_run/examples/invalid_claim_runtime_packet.pr10.json
```

The examples are packet examples only. They are not real runtime evidence.

## Expected PR-10 interpretation

```text
software_verdict: PASS
evidence_verdict: INCOMPLETE
claim_verdict: NO_CLAIM_ALLOWED
```
