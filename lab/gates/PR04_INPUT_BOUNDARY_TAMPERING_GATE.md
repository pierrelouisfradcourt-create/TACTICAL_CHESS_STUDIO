# PR-04 Input Boundary + Tampering Gate

PR-04 adds the first mechanical input-boundary and tampering gate for future immutable `RUN_ID` bundles.

It does not run benchmarks.
It does not modify engine, search, neural, or runtime behavior.
It does not create scientific evidence.
It is not scientific proof.
It does not authorize claims.
It does not authorize merge.
It does not authorize promotion.

Expected PR-04 verdict:

```txt
software_verdict: GATE_ADDED
evidence_verdict: MECHANICAL_GATE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

## Gate Entry Point

```txt
scripts/check_input_boundary.py
```

The gate reads a future run bundle path and emits separate verdict channels:

```txt
software_verdict
evidence_verdict
claim_verdict
gate_verdict
blocking_issues
warnings
```

## Input Boundary Rules

1. `latest.json` cannot enter the gate as evidence.
2. The gated directory name must start with `RUN_`.
3. Required PR-02 run surfaces must be present before tampering checks can proceed.
4. Artifact, command stdout, command stderr, critical read, and critical write paths must be relative paths contained inside the bundle.
5. Absolute paths, `..` traversal, and symlink files are blocked.
6. `evidence.json` must not report undeclared critical reads or undeclared writes.
7. Any `latest.json` reference on evidence surfaces blocks the gate.

## Tampering Rules

1. `artifact_hashes.json` must use `sha256`.
2. Each declared artifact path must be unique.
3. Each required declared artifact must exist.
4. Each declared artifact hash must match the file bytes.
5. Each declared artifact size must match the file size.
6. Every bundle file except `artifact_hashes.json` must be declared in `artifact_hashes.json`.
7. Command stdout and stderr paths must be declared in `artifact_hashes.json`.
8. Command stdout and stderr hashes must match file bytes when those files exist.
9. `bundle_hash` is a deterministic sha256 over sorted non-`artifact_hashes.json` bundle files, using path, file sha256, and size.

## Non-Authority

Passing this gate is mechanical boundary status only.
Gate PASS only means configured mechanical boundary checks passed.
It does not prove benchmark quality.
It does not prove engine strength.
Gate PASS does not imply engine improvement.
Gate PASS does not imply benchmark validity.
Gate PASS does not imply promotion readiness.
It does not authorize merge.
It does not authorize promotion.
It does not override human review.

## Crash Cases

- latest_pointer_as_input -> BLOCKED_LATEST_AS_EVIDENCE
- path_escape -> BLOCKED_INPUT_BOUNDARY
- hash_mismatch -> BLOCKED_TAMPERING
- undeclared_critical_read -> BLOCKED_UNDECLARED_CRITICAL_READ
- undeclared_write -> BLOCKED_UNDECLARED_WRITE
- undeclared_bundle_file -> BLOCKED_TAMPERING
- command_stdout_not_declared -> BLOCKED_TAMPERING
- weak_hash_algorithm -> BLOCKED_TAMPERING
- symlink_file -> BLOCKED_INPUT_BOUNDARY
