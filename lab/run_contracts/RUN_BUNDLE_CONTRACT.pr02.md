# PR-02 Immutable RUN_ID Bundle Contract

PR-02 defines a contract for future immutable run bundles.
It does not create scientific evidence.
It does not authorize claims.

Expected PR-02 verdict:

```txt
software_verdict: NOT_RUN
evidence_verdict: CONTRACT_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

## Future RUN_ID Structure

Future run bundles must live under a single immutable `RUN_ID/` directory. The `RUN_ID` must start with `RUN_`.

Required future bundle paths are:

- `evidence.json`
- `environment.json`
- `git_context.json`
- `commands/`
- `artifacts/`
- `artifact_hashes.json`
- `machine_verdict.json`
- `human_decision.json`
- `claim_decision.json`

The bundle schema is `run_bundle_schema.pr02.json`.

## Machine-Readable Schemas

PR-02 defines these schemas:

- `run_bundle_schema.pr02.json`
- `evidence_schema.pr02.json`
- `environment_schema.pr02.json`
- `git_context_schema.pr02.json`
- `command_record_schema.pr02.json`
- `artifact_hashes_schema.pr02.json`
- `machine_verdict_schema.pr02.json`

The schemas define contract shape only. They do not validate any real run in PR-02.

## Artifact Hashing Rules

Future required artifacts must be listed in `artifact_hashes.json`.

The only allowed hash algorithm is `sha256`. MD5 and SHA1 are forbidden.

Every required artifact entry must record:

- path
- sha256
- size_bytes
- role
- required
- created_by_command_id

Examples use explicit placeholders only:

```txt
EXAMPLE_SHA256_PLACEHOLDER
EXAMPLE_BUNDLE_HASH_PLACEHOLDER
EXAMPLE_TIMESTAMP
```

## Machine Verdict Contract

Future `machine_verdict.json` files must include:

- software_verdict
- evidence_verdict
- claim_verdict
- human_review_required
- blocking_issues
- warnings
- policy_refs
- schema_version

For PR-02 examples, the machine verdict is:

```txt
software_verdict: NOT_RUN
evidence_verdict: CONTRACT_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

## Command Record Contract

Every executed command must have a command record. A command mentioned without `exit_code` is `EVIDENCE_INCOMPLETE`. A command mentioned without stdout or stderr is `EVIDENCE_INCOMPLETE`.

Required command fields are:

- command_id
- name
- cmd
- started_at
- ended_at
- duration_sec
- exit_code
- stdout_path
- stderr_path
- stdout_sha256
- stderr_sha256
- working_directory
- environment_snapshot_ref
- allowed_failure

## Environment Capture Contract

Future environment snapshots must store selected, allowed environment facts and redaction status. They must not store all raw environment variables.

## Git Context Contract

Future git context records must include commit, branch, base branch, diff paths, diff hash, untracked files, and `dirty_state`. Dirty state must be recorded, not hidden.

## Immutability Rules

The immutable run rules are defined in `immutable_run_rules.pr02.md`.

## latest.json Pointer Rules

Future `latest.json` files are pointer metadata only. They are never evidence, never proof, and cannot be cited in claim decisions.

PR-02 does not create `lab/runs/latest.json`.

## Claim Guards

The following phrases are forbidden as claim language unless quoted solely as blocked language in a policy, schema, audit, or guard list:

- run proves
- evidence proves improvement
- benchmark validates
- ready for promotion
- promotion candidate
- strength improved
- Elo improved
- search improved
- neural improved
- conversion proves strength
- CI proves correctness
- latest proves
- validated engine
- scientific proof

Allowed contract phrase:

```txt
PR-02 defines a contract for future immutable run bundles.
It does not create scientific evidence.
It does not authorize claims.
```

## Crash Tests

- example_created_inside_lab_runs -> BLOCKED_FALSE_EVIDENCE
- latest_json_used_as_evidence -> BLOCKED_LATEST_AS_EVIDENCE
- machine_verdict_missing_claim_verdict -> SCHEMA_INVALID
- machine_verdict_claim_not_allowed_in_contract_only -> BLOCKED_CLAIM_SCOPE
- artifact_hashes_uses_md5 -> BLOCKED_WEAK_HASH
- artifact_without_sha256 -> EVIDENCE_INCOMPLETE
- command_record_without_exit_code -> EVIDENCE_INCOMPLETE
- command_record_without_stdout -> EVIDENCE_INCOMPLETE
- command_record_without_stderr -> EVIDENCE_INCOMPLETE
- protocol_created_after_first_command -> INVALID_PROTOCOL
- run_bundle_modified_after_human_decision -> BLOCKED_RUN_MUTATION
- discarded_run_without_reason -> BLOCKED_RUN_COMPLETENESS_UNKNOWN
- untracked_attempt_not_recorded -> BLOCKED_CHERRY_PICKING
- example_file_without_example_only_true -> BLOCKED_FALSE_EVIDENCE
- example_file_with_real_claim -> BLOCKED_CLAIM_SCOPE
