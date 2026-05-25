# CURRENT TRUTH MAP V0

status: DOCUMENTED_ONLY
created_at: 2026-05-23
root: `C:\TACTICAL_CHESS_STUDIO`
task_class: docs/workflow
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true

## Purpose

This map records the current post-fusion studioV2 truth state for navigation and reporting.

It is a docs-only status map. It does not authorize runtime changes, tests, benchmark runs, training, dataset generation, model promotion, Git mutation, secret inspection, cleanup, or readiness claims.

## Current Root Truth

| Claim | Status | Evidence |
| --- | --- | --- |
| `C:\TACTICAL_CHESS_STUDIO` is the active studioV2 root. | TESTED | `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO'` returned `True`; `STUDIOV2_ROOT_FUSION_VERIFIED_V0.md` records `ROOT: C:\TACTICAL_CHESS_STUDIO` and `Root fusion: TESTED`. |
| GitHub remote exists for `TACTICAL_CHESS_STUDIO`. | TESTED | `git remote -v` returned `origin https://github.com/pierrelouisfradcourt-create/TACTICAL_CHESS_STUDIO.git` for fetch and push. |
| Worktree was clean before this docs-only change. | TESTED | Pre-write `git status --short` returned empty on branch `master` at HEAD `7c39133`. |
| `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2` is no longer the active root. | NOT_FOUND | `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2'` returned `False`. Older docs that name this path are stale or historical for active-root decisions. |
| `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2_MIGRATED_HOLD` is passive. | PASSIVE | `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2_MIGRATED_HOLD'` returned `True`; no file under it was used as active truth. |
| studioV2 is a mixed lab/studio/runtime project, not merely a game repo. | DOCUMENTED_ONLY | Loaded docs and fusion reports identify active runtime code, tests, docs, control-plane docs, lab, schemas, scripts, ML, models/datasets, and local runtime artifacts as separate surfaces. |

## Authority And Claim Rules

| Rule | Status | Evidence |
| --- | --- | --- |
| Rust is runtime truth. | DOCUMENTED_ONLY | `README.md:31` states Rust owns runtime truth. |
| Python is ML, inference, and tooling. | DOCUMENTED_ONLY | `README.md` doctrine and loaded architecture docs separate Python from Rust runtime truth. |
| Search remains tactical/final move authority. | DOCUMENTED_ONLY / TESTED from loaded prior evidence | `README.md:33` states Search remains final move authority; `ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md:85-87` records Search-authority routing through `search_authority_trace(...)` and `search_root_via_adapter(...)`. |
| Neural and policy surfaces do not decide alone. | DOCUMENTED_ONLY / TESTED from loaded prior evidence | `README.md:34` says Neural may propose or rerank and does not decide alone; `ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md:101-112` records no Neural direct final selection and passive `PolicyGuide` / `NeuralProposal`. |
| `src\engine` is engine/reference surface, not Rocky core. | DOCUMENTED_ONLY | `ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md:45` says board/state authority is concentrated in `src/engine/engine.rs`; Rocky protocol says it is not architecture or implementation authority. |
| Rocky observation docs are observation guidance, not source truth. | DOCUMENTED_ONLY | `ROCKY_OBSERVATION_PROTOCOL_V0.md:17` says the protocol is not a new architecture, SSOT, or implementation authority; line 72 marks the implementation snapshot volatile. |
| HumanGate remains final authority for activation, promotion, merge, reject, freeze, and claim status. | DOCUMENTED_ONLY | `README.md:36` states this boundary. |
| Default claim posture is `NO_CLAIM_ALLOWED`. | DOCUMENTED_ONLY | `AGENTS.md` and `README.md` require separated verdicts and default `claim_verdict: NO_CLAIM_ALLOWED`. |

## Current Active Surface Map

| Surface | Current status | Current truth boundary |
| --- | --- | --- |
| `src` | IMPLEMENTED | Active runtime/code surface. Rust runtime truth lives here, but this docs task did not inspect or change source code beyond loaded docs evidence. |
| `tests` | IMPLEMENTED | Test surface. Prior reports record targeted validation; this task did not run cargo or pytest and did not change tests. |
| `docs` | DOCUMENTED_ONLY | Repo docs and control-plane docs. Active source/test truth outranks stale docs. |
| `MASTER_DOCS` | DOCUMENTED_ONLY | Canonical/current docs surface with known historical drift; live Git and current source evidence must be checked before publication claims. |
| `00_STUDIO_CONTROL` | DOCUMENTED_ONLY / PASSIVE local control | Local control-room surface. Status reports route to `00_STUDIO_CONTROL\05_STATUS`; control-room GitHub presence is not expected unless HumanGate changes policy. |
| `lab` | PASSIVE | Lab outputs and observations are not active truth unless a narrow artifact is promoted by HumanGate. |
| `schemas` | PASSIVE | Contracts and shape-validation references only unless explicitly validated in a task. |
| `scripts\studioV2` | IMPLEMENTED | Routed studioV2 tooling surface. `RUNTIME_VALIDATION_STATUS_V0.md` records studioV2 scripts routed under this path. |
| `scripts\control_plane` and `scripts\check_workspace_hygiene.py` | IMPLEMENTED / compatibility | Compatibility shim surface recorded by runtime validation status. No script execution was run by this task. |
| `ml` | PASSIVE / tooling | ML, inference, and training tooling. No training or inference was run by this task. |
| `models` | PASSIVE | Heavy assets, ignored/local by default, not Git truth and not model-proof evidence. |
| `datasets` | PASSIVE | Heavy/data assets, ignored/local by default, not dataset promotion evidence. |
| `secrets` | BLOCKED | Secret boundary forbids reading, printing, copying, or inspecting secrets. |
| `target` | PASSIVE / BLOCKED default Rust target | Local build artifact. Prior reports record default Rust target under root as blocked by Windows Security/file creation interruption. |
| `.venv` | PASSIVE | Local Python runtime artifact. Prior reports record local Python validation, but `.venv` is not source truth. |
| `repos\games\studioV2` | NOT_FOUND | Not present in current root; stale references to it are not active-root truth. |
| `repos\games\studioV2_MIGRATED_HOLD` | PASSIVE | Present as migrated hold only; not active truth. |
| Recovered material, pure lab legacy, installer templates | PASSIVE | Historical or passive context only; not active truth. |

## Runtime Validation State From Loaded Reports

| Validation claim | Status | Evidence |
| --- | --- | --- |
| Python validation is TESTED from runtime report. | TESTED from prior report | `RUNTIME_VALIDATION_STATUS_V0.md:30-31` records pytest local result `TESTED` with `101 passed, 8436 subtests passed in 1.95s`. |
| Rust validation is TESTED with `CARGO_TARGET_DIR` override. | TESTED from prior report | `RUNTIME_VALIDATION_STATUS_V0.md:20-21` and `RUST_VALIDATION_STATUS_V0.md` record cargo test with `CARGO_TARGET_DIR=%TEMP%\tactical_chess_target` as `TESTED`. |
| Default Rust target under root is blocked. | BLOCKED | `RUNTIME_VALIDATION_STATUS_V0.md:18` and `:46` record default target under `C:\TACTICAL_CHESS_STUDIO\target` as `BLOCKED`. |
| Current task validation is docs-only. | DOCUMENTED_ONLY | Cargo and pytest were explicitly forbidden and were not run. |

## Stale Or Passive Wording Reconciliation

| Wording source | Current treatment |
| --- | --- |
| Docs that name `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2` as the active project/root. | PASSIVE or stale for active-root decisions. The current active root is `C:\TACTICAL_CHESS_STUDIO`; the old nested path is `NOT_FOUND`. |
| Docs that imply Rocky/neural is final runtime authority. | PASSIVE or stale for current authority decisions. Current doctrine and inventory say Search remains final move authority and Neural proposes/reranks only. |
| `ROCKY_OBSERVATION_PROTOCOL_V0.md:102`, which says current routing must not be described as universally Search-final. | Historical/volatile snapshot. The same protocol marks snapshots volatile, and newer loaded inventory records removal of Neural direct final selection in current active routing. |
| PureLab legacy, `Recovered_*`, installer templates, local archives, copied sources, and migration snapshots. | PASSIVE context only. They are not active truth unless separately registered, loaded, enforced, and evidenced under HumanGate scope. |
| Lab reports, benchmark outputs, generated reports, and runtime traces. | PASSIVE observations by default. They do not prove strength, promotion, model quality, runtime activation, or dataset truth. |

## Source State For This Map

created:
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\CURRENT_TRUTH_MAP_V0.md`

registered:
- BLOCKED. No registry update was authorized or performed.

loaded:
- `C:\TACTICAL_CHESS_STUDIO\AGENTS.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\00_INDEX\READ_FIRST.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\02_NAVIGATION\STUDIO_SOURCE_ANCHORING_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\04_BOUNDARIES\PATH_BOUNDARY.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\04_BOUNDARIES\REPO_HYGIENE.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\04_BOUNDARIES\SECRET_BOUNDARY.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\07_FORMS\EXECUTOR_REPORT_TEMPLATE_V0.yaml`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\07_FORMS\TASK_CHARTER_TEMPLATE_V0.yaml`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\POST_FUSION_TRUTH_AUDIT_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\RUNTIME_VALIDATION_STATUS_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\RUST_VALIDATION_STATUS_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_ROOT_FUSION_VERIFIED_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_FULL_TRUTH_AUDIT_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\README.md`
- `C:\TACTICAL_CHESS_STUDIO\MASTER_DOCS\DOCS_STATUS.md`
- `C:\TACTICAL_CHESS_STUDIO\MASTER_DOCS\01_CURRENT_STATE.md`
- `C:\TACTICAL_CHESS_STUDIO\MASTER_DOCS\05_ARCHITECTURE.md`
- `C:\TACTICAL_CHESS_STUDIO\docs\control-plane\ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\docs\evidence\ROCKY_OBSERVATION_PROTOCOL_V0.md`

enforced:
- Docs-only patch boundary.
- Output routing to `00_STUDIO_CONTROL\05_STATUS`.
- Source-state separation: `created != registered != loaded != enforced != evidenced`.
- No source-code or test modification.
- No cargo, pytest, runtime execution, training, benchmark, dataset, model, cleanup, deletion, move, copy, push, branch, PR, or secret inspection.
- Unknown-means-blocked for decisions depending on missing evidence.

evidenced:
- Root/path checks, Git status/log/remote checks, readback of listed docs, Select-String line evidence, docs-only diff validation, and final readback must be recorded in the executor report for this task.

## Route Check

| Item | Status | Evidence |
| --- | --- | --- |
| Produced file | DOCUMENTED_ONLY | This file is a current truth/status map. |
| Intended route | IMPLEMENTED | `STUDIO_OUTPUT_ROUTING_POLICY_V0.md:66-67` routes status reports and topology migration status to `05_STATUS`. |
| Actual path | IMPLEMENTED | `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\CURRENT_TRUTH_MAP_V0.md`. |
| Forbidden destinations avoided | IMPLEMENTED | No output was written to `src`, `tests`, `lab`, `models`, `datasets`, `secrets`, `target`, `.venv`, or `repos`. |
| Generated report authority | PASSIVE / DOCUMENTED_ONLY | `STUDIO_OUTPUT_ROUTING_POLICY_V0.md:129` states generated reports are not active truth by default. |

## Status By Surface

| Surface | Status |
| --- | --- |
| active_runtime_code | IMPLEMENTED |
| tests | IMPLEMENTED |
| artifacts_runtime_outputs | PASSIVE |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | DOCUMENTED_ONLY |
| inference | PASSIVE |
| lab | PASSIVE |
| schemas | PASSIVE |
| scripts/tooling | IMPLEMENTED |
| ml | PASSIVE |
| models/datasets | PASSIVE |
| secrets | BLOCKED |
| old nested `repos\games\studioV2` root | NOT_FOUND |
| migrated hold path | PASSIVE |
| unknown surfaces | UNKNOWN, blocked for decisions |

## Verdicts By Surface

software_verdict:
- active_runtime_code: IMPLEMENTED
- tests: IMPLEMENTED
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE
- lab: PASSIVE
- schemas: PASSIVE
- scripts/tooling: IMPLEMENTED
- ml: PASSIVE
- models/datasets: PASSIVE
- secrets: BLOCKED
- old nested root: NOT_FOUND

evidence_verdict:
- root fusion/current root: TESTED
- Git remote: TESTED
- pre-write worktree cleanliness: TESTED
- Python validation: TESTED from loaded prior report, not rerun
- Rust validation: TESTED from loaded prior report with target-dir override, not rerun
- default Rust root target: BLOCKED from loaded prior report
- active authority doctrine: DOCUMENTED_ONLY / TESTED from loaded prior evidence
- this map: DOCUMENTED_ONLY, readback and `git diff --check` validation passed in this task

claim_verdict:
- default: NO_CLAIM_ALLOWED
- no Elo, strength, promotion, benchmark proof, model proof, runtime activation, dataset promotion, scientific proof, or global readiness claim is made.

no_global_ready_verdict: true
