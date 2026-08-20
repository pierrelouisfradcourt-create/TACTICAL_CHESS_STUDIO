# PR-03 Mechanical Parser

PR-03 adds a mechanical parser for PR-02 run bundle contracts.

The parser entry point is:

```txt
scripts/parse_run_bundle.py
```

It keeps verdict channels separate:

```txt
software_verdict
evidence_verdict
claim_verdict
```

For run bundles, the parser mechanically reads and inspects these JSON surfaces when present:

```txt
machine_verdict.json
artifact_hashes.json
evidence.json
environment.json
git_context.json
human_decision.json
claim_decision.json
commands/*.json
```

Expected PR-03 parser verdict:

```txt
software_verdict: PARSER_ADDED
evidence_verdict: MECHANICAL_PARSER_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
