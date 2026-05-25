# Pipeline Usage

status: DOCUMENTED_ONLY

Operator guide for the generic auto-pipeline core in a studio workspace.

## Common Final Report Fields
Every recipe must report:
- commands_run
- files_created
- files_modified
- files_copied
- repo_mutation_status
- validation
- skipped_validation
- risks
- surface_status
- software_verdict
- evidence_verdict
- claim_verdict

Default `claim_verdict`: NO_CLAIM_ALLOWED.

## Recipe: Read-Only Audit
Allowed actions: read files, inspect status, summarize evidence.
Forbidden actions: edits, tests, CI, commits, pushes, dataset/model movement.
Expected output location: chat final report only, unless HumanGate authorizes a docs path.
Final report fields: use the common final report fields.

## Recipe: Docs-Only Update
Allowed actions: create or edit explicitly scoped docs.
Forbidden actions: runtime code edits, tests, CI, commits, pushes, generated outputs, dataset/model movement.
Expected output location: HumanGate-approved docs folder only.
Validation: docs readback and diff checks when repo docs are changed.
Final report fields: use the common final report fields and include docs readback status.

## Recipe: Bounded Repo Patch
Allowed actions: minimal scoped code patch inside authorized files.
Forbidden actions: broad refactor, runtime authority changes, training, benchmarks as proof, commits, pushes.
Expected output location: authorized target repo files only.
Validation: smallest relevant targeted test.
Final report fields: use the common final report fields and list targeted tests.

## Recipe: Targeted Test
Allowed actions: smallest relevant test or compile check approved by HumanGate.
Forbidden actions: full benchmark, training, holdout, dataset reset, CI unless explicitly authorized.
Expected output location: terminal output summarized in final report; no runtime artifact unless authorized.
Final report fields: use the common final report fields and include exact command result.

## Recipe: Package/Archive Handling
Allowed actions: package approved docs, manifests, source notes, or explicitly named materials inside authorized package paths.
Forbidden actions: copying datasets, models, venvs, toolchains, caches, target directories, logs, or runtime outputs unless explicitly authorized.
Expected output location: HumanGate-approved archive or transfer folder.
Final report fields: use the common final report fields and include source and destination paths.

## Recipe: Toolchain Verification
Allowed actions: verify explicitly approved tools on the target machine.
Forbidden actions: installs, upgrades, network downloads, CI payment, or privilege changes unless explicitly authorized.
Expected output location: command summaries in final report.
Final report fields: use the common final report fields and mark unknown tools UNKNOWN.

## Recipe: Run Output Placement
Allowed actions: place authorized observation outputs in approved observation locations.
Forbidden actions: benchmark proof claims, log proof claims, `latest.json` proof claims, canonical proof claims.
Expected output location: HumanGate-approved observation path only.
Final report fields: use the common final report fields and mark outputs/runtime artifacts as PASSIVE observation.

## Recipe: Dataset Quarantine
Allowed actions: identify and quarantine only with explicit HumanGate destination.
Forbidden actions: dataset reset, dataset label promotion, training, importing datasets into target repo.
Expected output location: HumanGate-approved quarantine path only.
Final report fields: use the common final report fields and report dataset status separately.

## Recipe: Model Quarantine
Allowed actions: identify and quarantine only with explicit HumanGate destination.
Forbidden actions: model promotion, runtime activation, importing models into target repo, benchmark proof claims.
Expected output location: HumanGate-approved quarantine path only.
Final report fields: use the common final report fields and report model status separately.

## Recipe: Final Report
Allowed actions: produce concise, structured, evidence-bound final report.
Forbidden actions: global ready/not-ready claims, unsupported scientific or strength claims.
Expected output location: chat final response or approved report doc.
Final report fields: use the common final report fields.

## Recipe: Session Reprise
Allowed actions: read session state, re-check current status, continue only within active HumanGate scope.
Forbidden actions: assuming stale authorization, continuing blocked actions, mutating unknown paths.
Expected output location: chat final response or approved session state doc.
Final report fields: include prior state, current state, and next safe action.
