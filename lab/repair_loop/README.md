# PR-08 Limited Repair Loop

Status: mechanical orchestration contract only  
Scope: bounded repair-plan validation for future Codex repair attempts  
Claim status: no claim allowed

## Purpose

PR-08 adds a policy-bound limited repair-loop validator and task-packet contract.

The validator checks whether a proposed Codex repair attempt is allowed before any repair work is trusted. It does not execute repairs, prove correctness, authorize merge, authorize promotion, or create scientific evidence.

## Operating model

```text
failed mechanical check
  -> produce TASK_PACKET / repair plan JSON
  -> validate repair plan against repair policy and scope rules
  -> allow or block the bounded repair attempt
  -> human still decides merge / reject / freeze / promote
```

## Required constraints

A repair plan must:

- use schema `pr08.limited_repair_loop.v1`;
- declare the failed command and failure summary;
- set `max_attempts` to 1 or 2;
- declare allowed paths and intended modified files;
- keep all modified files inside allowed paths;
- acknowledge forbidden paths;
- keep Codex merge, promotion, policy, and measurement-surface authority disabled;
- require human review;
- keep `claim_verdict` at `NO_CLAIM_ALLOWED`.

A repair plan is blocked if it attempts to modify policy, gate, measurement, protected evidence, workflow, holdout, or other forbidden surfaces listed in `lab/policies/repair_policy.lock.json`.

GPT-5.5 audit output may critique anomalies, but it cannot lift `BLOCKED`, cannot increase claim scope, cannot authorize merge, and cannot authorize promotion.

## Task packet contract

```text
lab/repair_loop/TASK_PACKET_CONTRACT.pr08.json
```

The task-packet contract defines the minimum future handoff shape for `TASK_NEXT`: objective, source failure, write scope, max repair loops, fail-closed behavior, authority limits, required report fields, and default verdicts.

It is contract-only. It is not a repair execution and not evidence.

## Current examples

```text
lab/repair_loop/examples/valid_limited_repair_plan.pr08.json
lab/repair_loop/examples/invalid_forbidden_path.pr08.json
```

The examples are contract/control examples only. They are not real repair attempts and are not evidence of runtime behavior.

## Expected PR-08 interpretation

```text
software_verdict: REPAIR_LOOP_CONTRACT_ADDED
evidence_verdict: MECHANICAL_ORCHESTRATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
