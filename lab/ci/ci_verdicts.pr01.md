# PR-01 CI Verdicts

PR-01 keeps software status, evidence status, and claim status separate.

## software_verdict

```txt
software_verdict: CI_CONFIG_ADDED
```

Meaning: the canonical CI configuration has been added.

Limit: this verdict says nothing about runtime behavior or scientific correctness.

## evidence_verdict

```txt
evidence_verdict: MECHANICAL_CHECKS_ONLY
```

Meaning: the CI evidence is limited to configured mechanical checks such as file presence, JSON syntax, workflow guardrails, and manifest detection.

Limit: this verdict does not authorize benchmark interpretation, holdout interpretation, or scientific interpretation.

## claim_verdict

```txt
claim_verdict: NO_CLAIM_ALLOWED
```

Meaning: PR-01 authorizes no scientific, engine, Elo, search, neural, benchmark, merge, or promotion claim.

Limit: CI pass and scientific claim remain separate.

## Required Statement

CI pass does not imply scientific proof.

CI pass does not imply engine improvement.

CI pass does not imply promotion readiness.

CI pass does not imply benchmark validity.
