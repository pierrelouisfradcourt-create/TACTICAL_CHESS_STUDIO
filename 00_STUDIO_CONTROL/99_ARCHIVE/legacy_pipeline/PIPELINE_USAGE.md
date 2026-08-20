# Pipeline Usage

status: DOCUMENTED_ONLY

Daily operator guide for Codex auto-pipeline opening on Kenpachi.

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
MODEL: GPT-5.5 Thinking
REASONING: Medium
PLAN_MODE: OFF
Allowed actions: read files, inspect git status, summarize evidence.
Forbidden actions: edits, tests, CI, commits, pushes, dataset/model movement.
Expected output location: chat final report only, unless HumanGate authorizes a docs path.
Final report fields: use the common final report fields.

## Recipe: Docs-Only Update
MODEL: GPT-5.5 Thinking
REASONING: Medium
PLAN_MODE: OFF
Allowed actions: create or edit explicitly scoped docs.
Forbidden actions: runtime code edits, tests, CI, commits, pushes, generated outputs, dataset/model movement.
Expected output location: HumanGate-approved docs folder only.
Final report fields: use the common final report fields and include docs readback status.

## Recipe: Bounded Patch
MODEL: GPT-5.5 Thinking
REASONING: Medium
PLAN_MODE: OFF unless planning is requested.
Allowed actions: minimal scoped code patch inside authorized files.
Forbidden actions: broad refactor, runtime authority changes, training, benchmarks as proof, commits, pushes.
Expected output location: authorized repo files only.
Final report fields: use the common final report fields and list targeted tests.

## Recipe: Targeted Test
MODEL: GPT-5.5 Thinking
REASONING: Medium
PLAN_MODE: OFF
Allowed actions: smallest relevant test or compile check approved by HumanGate.
Forbidden actions: full benchmark, training, holdout, dataset reset, CI unless explicitly authorized.
Expected output location: terminal output summarized in final report; no runtime artifact unless authorized.
Final report fields: use the common final report fields and include exact command result.

## Recipe: GitHub Download/Archive
MODEL: GPT-5.5 Thinking
REASONING: Medium
PLAN_MODE: OFF
Allowed actions: download or archive explicitly named GitHub source materials.
Forbidden actions: PR creation, push, merge, mark ready, CI billing changes, auto-fix security.
Expected output location: HumanGate-approved archive folder.
Final report fields: use the common final report fields and include source URL or ref.

## Recipe: Run Output Placement
MODEL: GPT-5.5 Thinking
REASONING: Medium
PLAN_MODE: OFF
Allowed actions: place authorized observation outputs in one of the approved observation locations.
Forbidden actions: benchmark proof claims, log proof claims, `latest.json` proof claims, canonical proof claims.
Expected output location:
- Repo legacy observation output: `lab/gameplay_observation/sandbox_outputs/`
- Studio-level observation output: `C:\TACTICAL_CHESS_STUDIO\runs\<domain>\<run_id>\`
Final report fields: use the common final report fields and mark both output classes as PASSIVE observation.

## Recipe: Dataset Quarantine
MODEL: GPT-5.5 Thinking
REASONING: Medium
PLAN_MODE: OFF
Allowed actions: identify and quarantine only with explicit HumanGate destination.
Forbidden actions: dataset reset, dataset label promotion, training, importing datasets into repo.
Expected output location: HumanGate-approved quarantine path only.
Final report fields: use the common final report fields and report dataset/model status separately.

## Recipe: Model Quarantine
MODEL: GPT-5.5 Thinking
REASONING: Medium
PLAN_MODE: OFF
Allowed actions: identify and quarantine only with explicit HumanGate destination.
Forbidden actions: model promotion, runtime activation, importing models into repo, benchmark proof claims.
Expected output location: HumanGate-approved quarantine path only.
Final report fields: use the common final report fields and report model status separately.

## Recipe: Report Final
MODEL: GPT-5.5 Thinking
REASONING: Medium
PLAN_MODE: OFF
Allowed actions: produce concise, structured, evidence-bound final report.
Forbidden actions: global ready/not-ready claims, unsupported scientific or strength claims.
Expected output location: chat final response or approved report doc.
Final report fields: use the common final report fields.

