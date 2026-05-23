# PR-12 Fast Daily Iteration Harness

Status: non-canonical iteration surface  
Scope: fast daily iteration packet contract and mechanical validation  
Claim status: no claim allowed by default

## Purpose

PR-12 defines a fast daily iteration harness shape that can help future development move faster without pretending to create scientific evidence.

The harness is intended for quick local or CI-friendly checks that remain non-canonical.

## Theme

This PR uses one theme only:

```text
fast_daily_iteration_harness
```

## Boundaries

A daily iteration packet must:

- avoid holdout access;
- avoid dataset reset;
- avoid real `RUN_*` evidence bundle creation;
- avoid `latest.json` updates;
- avoid canonical evidence output;
- avoid claim or promotion authority;
- require human review;
- keep default `claim_verdict` at `NO_CLAIM_ALLOWED`.

## Current validator

```text
scripts/check_daily_iteration_packet.py
```

## Current examples

```text
lab/daily_iteration/examples/valid_daily_iteration_packet.pr12.json
lab/daily_iteration/examples/invalid_claim_daily_iteration_packet.pr12.json
```

The examples are packet examples only. They are not real runtime evidence and not benchmark results.

## Expected PR-12 interpretation

```text
software_verdict: PASS
evidence_verdict: INCOMPLETE
claim_verdict: NO_CLAIM_ALLOWED
```
