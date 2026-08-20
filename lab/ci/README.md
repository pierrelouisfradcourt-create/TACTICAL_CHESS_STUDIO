# Canonical CI

This directory records PR-01, the first canonical mechanical CI gate for TacticalChessPureLab Research OS V9.2.

PR-01 adds configuration and documentation only. The canonical CI workflow checks file presence, JSON syntax, workflow guardrails, and language-manifest detection. These checks are evidence that configured checks ran; they are not scientific proof.

PR-06 wires existing evidence-plane scripts into canonical CI in example-mode only. The PR-06 job runs parser, input-boundary, tampering, and claim/data gate examples without creating RUN_ID evidence, writing repository files, running benchmarks, running engine tests, or authorizing claims.

## Verdicts

```txt
software_verdict: CI_CONFIG_ADDED
evidence_verdict: MECHANICAL_CHECKS_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

```txt
software_verdict: CI_GATE_WIRING_ADDED
evidence_verdict: MECHANICAL_CI_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

## Limits

CI pass and scientific claim remain separate.

CI must not run benchmarks in PR-01.

CI must not run benchmarks in PR-06.

CI must not run engine tests in PR-06.

CI must not create real RUN_ID evidence in PR-06.

CI must not use secrets.

CI must not access holdout data.

CI must not authorize claims.

CI must not authorize merge.

CI must not authorize promotion.

CI pass does not imply scientific proof.

CI pass does not imply engine improvement.

CI pass does not imply promotion readiness.

CI pass does not imply benchmark validity.
