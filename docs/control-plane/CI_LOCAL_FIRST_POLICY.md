# CI Local-First Policy

## Purpose

This policy defines `CI_THROTTLE_PACK_V0`: local-first validation with a lightweight, always-running final gate in GitHub Actions.

Current objective: reduce remote CI minutes safely without removing existing workflows or changing required checks yet.

## Local-First Doctrine

- Local/Codex is the workshop for iterative validation.
- GitHub Actions is the final short gate.
- The final gate is intentionally lightweight and always runs on every PR.
- Benchmark workflows are not automatic evidence and remain manual-only.

## Validation Routing

- `DOCS_ONLY`: docs-focused changes should not need heavy runtime checks long-term.
- `CONTROL_PLANE`: run local smoke plus Python compile checks for control-plane scripts.
- `RUNTIME`: runtime/source changes rely on existing Rust/chess validation workflows.
- `ML`: ML changes route to ML-specific checks.
- `WORKFLOW`: workflow changes receive explicit workflow review attention.
- `BENCHMARK_BLOCKED`: benchmark paths require manual review and must not auto-pass as proof.

## Why Not Naive Path Filters

Naive `paths-ignore` strategies can leave required checks in a pending state when workflows do not trigger. Pending required checks can block merges and produce unstable branch-protection behavior.

A single always-running final gate is safer because it always reports a conclusive status while still allowing path-aware logic inside the workflow.

## Scope of This PR

- Adds path classification tooling.
- Adds an always-running lightweight final gate workflow.
- Adds policy documentation.
- Does not remove existing workflows.
- Does not remove required checks.
- Does not implement heavy throttling yet.

## Planned Follow-Ups

- Make docs-only remote checks minimal after final-gate behavior is proven.
- Add safe path-gating to Chess Test without creating pending required checks.
- Convert operator smoke coverage to Ubuntu where possible.
- Move benchmark workflows to `workflow_dispatch` only.

software_verdict: CI_THROTTLE_TOOLING_AND_DOCS_ONLY

evidence_verdict: LOCAL_FIRST_CI_POLICY_ONLY

claim_verdict: NO_CLAIM_ALLOWED
