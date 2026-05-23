# PR-06 Evidence-Plane Gate CI

PR-06 wires the existing evidence-plane scripts into canonical CI in example-mode only.

The CI job is named `evidence-plane-gates-check` and runs inside `.github/workflows/canonical-ci.yml` on the same canonical CI triggers.

## Scope

PR-06 adds mechanical CI wiring only.

The job checks:

- PR-03 parser examples.
- PR-03 contract-only example parse.
- PR-04 input-boundary and tampering gate examples.
- PR-04 contract-only gate check.
- PR-05 claim and data gate examples.

## Commands

```bash
python -m py_compile scripts/parse_run_bundle.py scripts/check_input_boundary.py scripts/check_claim_data_gates.py
python scripts/parse_run_bundle.py --path lab/parsers/examples --pretty
python scripts/parse_run_bundle.py --path lab/run_contracts/example_run_bundle_contract_only --contract-example-mode --pretty
python scripts/check_input_boundary.py --path lab/gates/examples --example-mode --pretty
python scripts/check_input_boundary.py --path lab/run_contracts/example_run_bundle_contract_only --example-mode --pretty
python scripts/check_claim_data_gates.py --path lab/claim_data_gates/examples --example-mode --pretty
```

## Guardrails

PR-06 does not run benchmarks.

PR-06 does not run engine tests.

PR-06 does not run the full test suite.

PR-06 does not modify engine, search, neural, runtime, benchmark, or dataset behavior.

PR-06 does not create real RUN_ID evidence.

PR-06 does not create `lab/runs/RUN_*`.

PR-06 does not create `lab/runs/latest.json`.

PR-06 does not require secrets.

PR-06 does not upload artifacts.

PR-06 does not dispatch other workflows.

PR-06 does not make scientific claims.

## Verdicts

```txt
software_verdict: CI_GATE_WIRING_ADDED
evidence_verdict: MECHANICAL_CI_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
