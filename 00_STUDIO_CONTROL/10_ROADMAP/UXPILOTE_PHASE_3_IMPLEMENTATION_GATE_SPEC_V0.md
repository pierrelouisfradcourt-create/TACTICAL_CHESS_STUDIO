# UxPilote Phase 3 Implementation Gate Specification V0

Status: DOCUMENTED_ONLY
Surface: roadmap_docs_only
Runtime authority: NONE
Prototype implementation: BLOCKED
Frontend/backend code: BLOCKED
Schema generation: BLOCKED
Broad filesystem scan: BLOCKED
Agent activation: BLOCKED
Hardware/power/process/system control: BLOCKED
Cleanup/deletion/archive creation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation/reset: BLOCKED
Model/checkpoint creation or promotion: BLOCKED
Chess960 activation: BLOCKED
DecisionController activation: BLOCKED
Commit/push/branch/PR: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

---

## 1. Header

```yaml
title: "UxPilote Phase 3 Implementation Gate Specification V0"
status: DOCUMENTED_ONLY
surface: roadmap_docs_only
runtime_authority: NONE
prototype_implementation: BLOCKED
frontend_backend_code: BLOCKED
schema_generation: BLOCKED
broad_filesystem_scan: BLOCKED
agent_activation: BLOCKED
hardware_power_process_system_control: BLOCKED
cleanup_deletion_archive_creation: BLOCKED
training: BLOCKED
benchmark: BLOCKED
dataset_generation_reset: BLOCKED
model_checkpoint_creation_or_promotion: BLOCKED
chess960_activation: BLOCKED
decision_controller_activation: BLOCKED
commit_push_branch_pr: BLOCKED
claim_posture: NO_CLAIM_ALLOWED
```

This document is a roadmap-only implementation gate specification. It defines the minimum gate before a future UxPilote read-only local prototype implementation task may be proposed.

This document does not authorize implementation, prototype files, frontend code, backend code, schema generation, runtime execution, broad filesystem scans, agent activation, hardware control, power control, process control, system setting changes, cleanup, deletion, archive creation, Git actions, source promotion, or claims.

## 2. Purpose

This specification defines the gate that must be satisfied before any future HumanGate-approved implementation task for a read-only local UxPilote prototype can be proposed.

The gate exists to prevent roadmap language from becoming implementation authority. It requires exact scope, exact files, exact read-only inputs, explicit output routing, validation, security limits, cost guard, and an executor report before a future bounded task may proceed.

This document does not implement the prototype and does not authorize any implementation step by itself.

## 3. Current Baseline

```yaml
workspace_root: "C:/TACTICAL_CHESS_STUDIO"
workspace_root_role: "full Studio ecosystem root and base map"
repo_zone: "C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab"
repo_zone_role: "imported/recovered studio organism or legacy living zone"
repo_zone_is_ecosystem_root: false
uxpilote_roadmap_stack: DOCUMENTED_ONLY
runtime_authority: NONE
agent_activation: BLOCKED
broad_filesystem_scan: BLOCKED
hardware_power_process_system_control: BLOCKED
git_actions: BLOCKED
claim_posture: NO_CLAIM_ALLOWED
```

`C:/TACTICAL_CHESS_STUDIO` is the full Studio ecosystem root, the visual base map, the base map, and the whole studio.

`C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab` is an imported/recovered studio organism or legacy living zone inside the ecosystem. It is not the ecosystem root and is not the whole ecosystem.

The UxPilote roadmap UX stack exists as docs-only planning. Runtime execution, agent activation, broad scans, hardware or process control, Git actions, and source promotion remain blocked unless a later explicit HumanGate task authorizes one bounded next step.

## 4. Minimum HumanGate Preconditions

A future implementation task requires an explicit HumanGate decision record with:

- one bounded objective.
- exact target files.
- exact read-only paths.
- exact output routing.
- exact forbidden actions.
- implementation language and framework.
- validation plan.
- rollback or stop condition.
- cost guard.
- executor report requirement.
- no global ready verdict.

The HumanGate decision must approve one bounded next step only. Approval of a planning gate does not approve future implementation, execution, activation, publishing, network exposure, persistence, or claims.

## 5. Allowed Future Prototype Class

The only future prototype class this gate may prepare is:

- local read-only UI prototype.
- docs/control visualization only.
- no mutation by default.
- no runtime execution.
- no agent execution.
- no broad scan.
- no background daemon.
- no network exposure unless separately authorized.
- no system, hardware, power, or process control.

Any future prototype outside this class is `BLOCKED` until a separate HumanGate task defines a narrower gate.

## 6. Required Implementation Boundaries For Future Task

A future implementation task must state:

- target project directory.
- UI framework and language.
- files to create.
- files to read.
- files forbidden to touch.
- directories forbidden to scan.
- whether the app runs locally.
- whether the app persists data.
- whether the app reads Git.
- whether the app reads a file tree.
- whether the app reads reports.
- whether any process execution is needed.

If any item is missing, ambiguous, or broader than the HumanGate decision, the future implementation task is `BLOCKED`.

## 7. Read-Only Adapter Gate

Future adapters must be explicitly declared before use:

- `file_tree_adapter`.
- `source_index_adapter`.
- `routing_policy_adapter`.
- `git_status_adapter`.
- `autodev_template_adapter`.
- `evidence_report_adapter`.
- `cost_signal_adapter`.
- `llm_link_adapter`.

Each adapter declaration must specify:

- read scope.
- maximum depth if file tree read is allowed.
- allowed extensions.
- forbidden paths.
- no-write rule.
- no-command-execution rule.
- evidence limits.

Adapter rules:

- Adapters are read-only by default.
- Adapters must not mutate files.
- Adapters must not execute commands.
- Adapters must not infer source promotion.
- Adapter output is observation only unless a later HumanGate record explicitly promotes it with matching evidence.

## 8. Broad-Scan Prohibition

`C:/TACTICAL_CHESS_STUDIO` is the visual base map root and full Studio ecosystem root.

This does not authorize recursive scanning.

A future scan must be bounded by:

- explicit paths.
- maximum depth.
- allowed file types.
- maximum file count.
- maximum time.
- HumanGate approval.

Scan output remains observation only. It must not become source truth by default and must not authorize cleanup, deletion, archive creation, runtime execution, source promotion, artifact generation, hardware control, Git actions, or claims.

## 9. Persistence Gate

A future prototype must declare one of:

- no persistence.
- exact persistence file.

Persistence rules:

- No database is authorized unless separately approved by HumanGate.
- No schema generation is authorized unless separately approved by HumanGate.
- No logs are proof by default.
- No `latest.json` is authorized.
- No `lab/runs/RUN_*` is authorized.
- No state store, cache, generated manifest, or telemetry file is authorized unless exact path, retention, and route are approved.

## 10. Runtime And Process Gate

A future prototype must not:

- run game runtime.
- run tests or CI.
- run training or benchmark.
- start background services.
- terminate processes.
- control hardware.
- change power settings.
- change system settings.

If future implementation appears to require any of these actions, the task must stop and return to HumanGate with a narrower proposal.

## 11. Security And Exposure Gate

A future prototype must declare whether it is local-only or networked.

Default posture:

- local-only.
- no external exposure.
- no credential collection.
- no telemetry upload.
- no remote control.

If networked behavior is requested, status is `BLOCKED` pending separate security review and HumanGate authorization. Network exposure cannot be inferred from this document.

## 12. LLM Link Layer Gate

Future LLM integration must remain:

- passive.
- suggestion-only.
- no final authority.
- no mutation.
- no execution.
- no claim approval.
- no agent activation.
- HumanGate final.

LLM output may suggest labels, summaries, options, chain drafts, or ambiguity flags only. Accepted LLM text becomes candidate text only and does not authorize execution or file mutation.

## 13. Patch Lab Gate

Patch Lab may only:

- display candidates.
- generate task-charter candidates.
- copy text for review.
- request HumanGate.

Patch Lab must not:

- write files.
- run Codex directly.
- run Git.
- apply patches.
- create branches or pull requests.

Patch Lab remains candidate-only. Any future task that turns a Patch Lab candidate into an executor task requires a separate HumanGate decision with exact files, route, validation, and report requirements.

## 14. HumanGate Decision Record Requirement

Future implementation requires a HumanGate decision record containing:

- approve one bounded step.
- exact files.
- exact allowed actions.
- denied actions.
- expiry.
- cost guard.
- validation requirement.
- executor report requirement.

The decision record must preserve all denied actions after expiry and outside exact scope. HumanGate approval does not create global approval, runtime authority, agent authority, network authority, source promotion, or claim authority.

## 15. Validation Gate For Future Implementation

Minimum validation for a future implementation task:

- static readback.
- file list check.
- no forbidden files touched.
- no forbidden commands run.
- no hidden mutation.
- no broad scan.
- no runtime execution.
- no agent activation.
- no hardware or process control.
- `git diff --check` if repo-tracked files are touched.
- manual UI inspection if prototype exists.

Validation evidence must be reported by surface. It must not collapse into a global ready or not-ready verdict.

## 16. Stop Conditions

A future task must stop if:

- required source is missing.
- output routing is unclear.
- file scope is unclear.
- broad scan is needed but not authorized.
- runtime execution is needed.
- network exposure is needed.
- persistence is needed but not scoped.
- security boundary is unclear.
- HumanGate is absent.

Stop means no placeholder implementation, no partial scaffold, no hidden setup, no dependency install, no runtime command, and no file mutation outside a separately approved route.

## 17. Minimal Future Task Charter Checklist

A future task charter must include:

- `task_id`.
- `uxpilote_chain`.
- `source_state`.
- `output_routing`.
- target files.
- reference-only paths.
- allowed actions.
- blocked actions.
- read-only adapter scopes.
- validation plan.
- cost guard.
- HumanGate decision id.
- final report requirements.

Any missing checklist item keeps the future implementation task `BLOCKED`.

## 18. Non-Authorization

This document does not authorize:

- implementation.
- prototype.
- code generation.
- schema generation.
- runtime.
- tests.
- CI.
- agents.
- training.
- benchmark.
- datasets.
- models.
- broad scan.
- cleanup/deletion/archive.
- hardware/power/process/system control.
- network exposure.
- Git actions.
- claims.

Any such action requires a separate explicit HumanGate-approved task with exact scope, output route, source-state, validation, executor reporting, security boundary, and non-authorization boundaries.

## 19. Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE
```

## 20. Verdicts

```yaml
software_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

evidence_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

claim_verdict:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: PASSIVE
  roadmap_docs_only: DOCUMENTED_ONLY
  inference: PASSIVE

no_global_ready_verdict: true
```
