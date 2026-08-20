# PR-01 Canonical CI

PR-01 adds a canonical mechanical CI gate for TacticalChessPureLab Research OS V9.2.

The workflow is `.github/workflows/canonical-ci.yml`.

The contract is `lab/ci/canonical_ci_contract.pr01.json`.

## Scope

PR-01 is mechanical CI only. It adds no runtime scripts, changes no runtime behavior, runs no benchmarks, and does not access holdout data.

The workflow runs on pull requests, pushes to `main`, and manual dispatch. It uses read-only repository contents permission and does not require secrets or service credentials.

## Required Checks

- `trust-root-json-check`: validates JSON syntax for required trust-root JSON files, the PR-00C run request schema, and the PR-01 CI contract.
- `trust-root-presence-check`: verifies required trust-root files exist.
- `no-code-spec-presence-check`: verifies required PR-00B and PR-00C no-code specification files exist.
- `no-benchmark-guard`: checks the canonical workflow content for forbidden benchmark-launch commands.
- `optional-language-detection`: detects Rust and Python manifests without dependency installation or runtime execution.

## Evidence Boundary

CI is evidence that checks ran, not scientific proof.

CI pass and scientific claim remain separate.

CI must not run benchmarks in PR-01.

CI must not use secrets.

CI must not access holdout data.

CI must not authorize claims.

CI must not authorize merge.

CI must not authorize promotion.

CI pass does not imply scientific proof.

CI pass does not imply engine improvement.

CI pass does not imply promotion readiness.

CI pass does not imply benchmark validity.

## Expected Verdict

```txt
software_verdict: CI_CONFIG_ADDED
evidence_verdict: MECHANICAL_CHECKS_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
