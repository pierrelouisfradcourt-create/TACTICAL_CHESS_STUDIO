# PR-03 Parser Verdicts

The parser emits these channels separately:

```txt
software_verdict
evidence_verdict
claim_verdict
```

PR-03 expected parser-only verdict:

```txt
software_verdict: PARSER_ADDED
evidence_verdict: MECHANICAL_PARSER_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

Contract-only PR-02 examples remain:

```txt
software_verdict: NOT_RUN
evidence_verdict: CONTRACT_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

