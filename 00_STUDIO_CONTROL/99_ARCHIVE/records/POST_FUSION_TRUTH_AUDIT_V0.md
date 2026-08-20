# POST FUSION TRUTH AUDIT V0

status: DOCUMENTED_ONLY
created_at: 2026-05-23
task_class: audit_repo
root: `C:\TACTICAL_CHESS_STUDIO`
no_global_ready_verdict: true

## Codex Runtime

| Field | Result |
| --- | --- |
| requested_model | GPT-5.5-Codex or strongest available Codex reasoning model |
| requested_reasoning_effort | high |
| actual_runtime | UNKNOWN exact model identifier |
| actual_runtime_evidence | Current session identifies as Codex, a coding agent based on GPT-5; exact deployment/model identifier and GPT-5.5 availability are not exposed. |
| runtime_status | BLOCKED for exact runtime/model attestation |

## Preflight

| Check | Status | Evidence |
| --- | --- | --- |
| ROOT exists | IMPLEMENTED | `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO'` returned `True`. |
| ROOT is intended final studioV2 root | TESTED | Root has `Cargo.toml`, `Cargo.lock`, `src`, `tests`, `docs`, `MASTER_DOCS`, `schemas`, `scripts\studioV2`, `ml`, `lab`, `db`, and `memory_core`; `STUDIOV2_ROOT_FUSION_VERIFIED_V0.md` states root fusion `TESTED`. |
| Old staging path `repos\games\studioV2` active | NOT_FOUND | `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2'` returned `False`. |
| HOLD path | PASSIVE | `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2_MIGRATED_HOLD'` returned `True`; not used as active truth. |
| Worktree before write | TESTED | Branch `master`, HEAD `c549c75bfed924880db8d22f71b40bf9325ae866`, `git status --short` returned empty before this routed report was created. |
| Mutation boundary | DOCUMENTED_ONLY | No source, test, runtime, dependency, secret, staging, Git mutation, install, copy, move, delete, cleanup, test, benchmark, or training command was run. |
| Single permitted write | DOCUMENTED_ONLY | This report is the only created file, routed to `00_STUDIO_CONTROL\05_STATUS` by the task. |
| Secret boundary | BLOCKED | Secret contents were not listed, read, hashed, copied, printed, or inspected. |
| Recovered / legacy / installer-template truth | PASSIVE | No `Recovered_*`, pure lab legacy, or installer template path was used as active truth. |

## Source State

created:
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\POST_FUSION_TRUTH_AUDIT_V0.md`

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
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_FULL_TRUTH_AUDIT_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_ROOT_FUSION_MANIFEST_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_ROOT_FUSION_APPLIED_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_ROOT_FUSION_VERIFIED_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\RUST_VALIDATION_STATUS_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\RUNTIME_VALIDATION_STATUS_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\ROCKY_RESTORATION_TRUTH_AUDIT_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\ROCKY_RESTORATION_TRUTH_SNAPSHOT_CURRENT.md`
- `C:\TACTICAL_CHESS_STUDIO\Cargo.toml`
- `C:\TACTICAL_CHESS_STUDIO\README.md`
- Inventoried or checked: `Cargo.lock`, `src`, `tests`, `docs`, `MASTER_DOCS`, `schemas`, `scripts`, `ml`, `lab`, `db`, `memory_core`, `.github`, `.cargo`, `.gitignore`

enforced:
- Output routing to `00_STUDIO_CONTROL\05_STATUS`.
- Source anchoring rule: `created != registered != loaded != enforced != evidenced`.
- Secret boundary: no secret contents inspected.
- Git safety: no add, commit, reset, clean, rm, init, push, tag, branch, PR, or readiness promotion.
- Runtime doctrine: Rust runtime truth, Python tooling/ML/inference, Search final authority, Neural proposal/rerank only, HumanGate final claim authority.
- Unknown-means-blocked for decisions depending on missing evidence.

evidenced:
- Concrete command outputs, path checks, line evidence, Git status/tag/log/ignore checks, tracked-file checks, runtime availability checks, and readback/diff validation are recorded in this report.

## Route Check

| Item | Status | Evidence |
| --- | --- | --- |
| Output type | DOCUMENTED_ONLY | Post-fusion status/audit report. |
| Intended surface | DOCUMENTED_ONLY | `canonical_docs/status_report`. |
| Required destination | IMPLEMENTED | `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS`. |
| Destination allowed | IMPLEMENTED | `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` routes status reports to `05_STATUS`. |
| Forbidden destinations avoided | IMPLEMENTED | No output was written to `src`, `tests`, `lab`, runtime outputs, archives, models, datasets, secrets, or `repos`. |
| Existing target before write | TESTED | `Test-Path ...POST_FUSION_TRUTH_AUDIT_V0.md` returned `False`. |

output_routing_result:
- produced_file: true
- actual_destination: `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\POST_FUSION_TRUTH_AUDIT_V0.md`
- output_routing_result: IMPLEMENTED
- registration_required: UNKNOWN
- project_source_upload_required: UNKNOWN
- promotion_gate: HumanGate

## Pass 1 - Git State

| Check | Status | Evidence |
| --- | --- | --- |
| Git available | IMPLEMENTED | Read-only Git commands executed. |
| Current branch | TESTED | `git branch --show-current` returned `master`. |
| HEAD | TESTED | `git rev-parse HEAD` returned `c549c75bfed924880db8d22f71b40bf9325ae866`. |
| Worktree cleanliness before this report | TESTED | `git status --short` returned empty. |
| Recent commits | TESTED | `git log --oneline -5` returned `c549c75`, `d748d04`, `4fe0cdd`, `dd820f1`. |
| Fusion commit exists | TESTED | `4fe0cdd Restore and fuse studioV2 into studio root` present in recent log. |
| Runtime validation commit exists | TESTED | `c549c75 Document runtime validation and script routing shims` present at HEAD. |
| Rust target-dir documentation commit exists | TESTED | `d748d04 Document Rust validation target-dir requirement` present in recent log. |
| Security baseline commit exists | TESTED | `dd820f1 Initialize local security baseline (secrets+supplychain pack)` present in recent log. |
| Fusion tag exists | TESTED | `git tag --list studioV2-root-fusion-verified-2026-05-23` returned the tag. |
| `.gitignore` excludes requested heavy/local paths | TESTED | `.venv/`, `target/`, `repos/`, `models/`, `datasets/`, `secrets/`, `runs/`, `tmp/`, `local_backups_optional/`, `runtime_outputs/`, and `archives/` are ignored by `git check-ignore -v`. |
| Script routing tracked | TESTED | `git ls-files -- scripts/studioV2 ...` returned `scripts\studioV2` files and all five compatibility shims. |

## Pass 2 - Root Topology

| Surface | Status | Evidence |
| --- | --- | --- |
| code_active | IMPLEMENTED | `src` exists; `src\engine`, `src\chess`, `src\agents`, and `src\ai` exist. |
| tests | IMPLEMENTED | `tests` exists, including requested boundary test files. |
| docs_canonical | DOCUMENTED_ONLY | `README.md`, `AGENTS.md`, `docs`, `MASTER_DOCS`, and `00_STUDIO_CONTROL` sources exist/read. |
| roadmap_docs_only | DOCUMENTED_ONLY | Roadmap/planning docs remain docs-only by README and control policy. |
| lab_outputs | PASSIVE | `lab` exists; not used as active truth. |
| schemas | PASSIVE | `schemas` exists; schema enforcement not rerun. |
| scripts/tooling | IMPLEMENTED | `scripts\studioV2` exists and is tracked; compatibility shims exist and are tracked. |
| ml | PASSIVE | `ml` exists; training/inference not run. |
| memory/state | PASSIVE | `memory_core`, `AI_MEMORY`, and `.studio_state` exist; memory is not source truth by default. |
| db/migrations | IMPLEMENTED | `db` exists. |
| ci/github | IMPLEMENTED | `.github` exists; CI not run. |
| passive/imported | PASSIVE | `repos\games\studioV2_MIGRATED_HOLD`, `patches`, `tools`, `document_work`, `outputs`, and ignored heavy surfaces are not active truth. |
| blocked/secrets | BLOCKED | `secrets` exists but contents were not inspected. |
| unknown | UNKNOWN | Any surface not explicitly loaded, tracked, or validated remains UNKNOWN and BLOCKED for decisions. |

Top-level inventory included `.cargo`, `.git`, `.github`, `.pytest_cache`, `.studio_state`, `.venv`, `00_STUDIO_CONTROL`, `AI_MEMORY`, `datasets`, `db`, `docs`, `document_work`, `inbox_import_quarantine`, `lab`, `MASTER_DOCS`, `memory_core`, `ml`, `models`, `outputs`, `patches`, `repos`, `runs`, `schemas`, `scripts`, `secrets`, `src`, `target`, `tests`, `tmp`, `tools`, root project files, and security docs.

## Pass 3 - Fusion Integrity

| Claim | Status | Evidence |
| --- | --- | --- |
| `C:\TACTICAL_CHESS_STUDIO` is now active studioV2 root | TESTED | Current root has project manifest, lockfile, runtime source, tests, docs, scripts, ML/lab/db/memory surfaces; fusion verified report says root fusion `TESTED`. |
| `repos\games\studioV2` is not active | NOT_FOUND | Path existence check returned `False`. |
| `repos\games\studioV2_MIGRATED_HOLD` is passive if present | PASSIVE | Path exists; no file under it was used as active truth. |
| Required root surfaces exist | TESTED | `Cargo.toml`, `Cargo.lock`, `src`, `tests`, `docs`, `MASTER_DOCS`, `schemas`, `scripts\studioV2`, `ml`, `lab`, `db`, and `memory_core` all returned `True` or were read. |
| Compatibility shims exist | TESTED | `scripts\check_workspace_hygiene.py`; `scripts\control_plane\smoke_passive_control_plane_gates.py`; `validate_prompt_report_hygiene.py`; `smoke_control_plane_integration.py`; `smoke_prompt_report_hygiene.py` exist. |
| Compatibility shims tracked | TESTED | `git ls-files` returned all five shim paths. |
| `scripts\studioV2` tracked | TESTED | `git ls-files -- scripts/studioV2` returned routed script files. |

## Pass 4 - Runtime Validation Evidence

Current availability checks:

| Check | Status | Evidence |
| --- | --- | --- |
| `cargo --version` | BLOCKED | Command not recognized in current shell. |
| `rustc --version` | BLOCKED | Command not recognized in current shell. |
| `rustup --version` | BLOCKED | Command not recognized in current shell. |
| `python --version` | BLOCKED | Microsoft Store alias reported Python not found. |
| `py --version` | BLOCKED | Command not recognized in current shell. |
| `.venv\Scripts\python.exe --version` | TESTED | Returned `Python 3.12.10`. |

Prior loaded validation evidence:

| Claim | Status | Evidence |
| --- | --- | --- |
| Rust validation with `CARGO_TARGET_DIR=%TEMP%\tactical_chess_target` | TESTED | `RUST_VALIDATION_STATUS_V0.md` records cargo/rustc/rustup `TESTED`, default target `BLOCKED`, override target `TESTED`, and test result groups `19 passed`, `212 passed`, `9 passed`, `19 passed`. |
| Default Rust target under root | BLOCKED | `RUST_VALIDATION_STATUS_V0.md` and `RUNTIME_VALIDATION_STATUS_V0.md` record Windows Security/file creation interruption under `C:\TACTICAL_CHESS_STUDIO\target`. |
| Python local validation | TESTED | `RUNTIME_VALIDATION_STATUS_V0.md` records system Python, py launcher, `.venv`, dependencies, pytest implemented, and `101 passed, 8436 subtests passed in 1.95s`. |
| Current runtime execution availability | BLOCKED | Current cargo/rustc/rustup/system Python/py checks are unavailable in this shell; tests were not rerun by this audit. |

Runtime execution is marked TESTED only from loaded prior evidence reports, not from a new test run.

## Pass 5 - Rocky / Engine Boundary

Required source layout:

| Path | Status |
| --- | --- |
| `src\engine` | IMPLEMENTED |
| `src\chess` | IMPLEMENTED |
| `src\agents` | IMPLEMENTED |
| `src\ai` | IMPLEMENTED |
| `tests\decision_authority_boundary_current.rs` | IMPLEMENTED |
| `tests\policy_guide_boundary.rs` | IMPLEMENTED |
| `tests\search_backend_boundary.rs` | IMPLEMENTED |
| `docs\control-plane\ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md` | DOCUMENTED_ONLY |
| `docs\evidence\ROCKY_OBSERVATION_PROTOCOL_V0.md` | DOCUMENTED_ONLY |

Line evidence:

- `README.md:31` says Rust owns runtime truth.
- `README.md:33` says Search remains final move authority.
- `README.md:34` says Neural components may propose or rerank and do not decide alone.
- `README.md:36` says HumanGate remains final authority for activation, promotion, merge, reject, freeze, and claim status.
- `src\chess\decision.rs:119-122` routes Heuristic, Neural, Minimax, and Hybrid through `search_authority_trace(...)`.
- `src\chess\decision.rs:153-157` calls `search_root_via_adapter(...)`, records `SelectionAuthority::Search`, and sets `used_search: true`.
- `src\ai\policy_guide.rs:4` declares `policy_guide_v0_passive`.
- `src\ai\policy_guide.rs:33`, `126`, and `129` record proposal-only/search-required/not-authoritative policy posture.
- `src\ai\policy_guide.rs:134-193` exposes false-returning runtime/final-authority methods for suggestions/proposals.
- `tests\decision_authority_boundary_current.rs:47`, `71-72`, `94`, `111-112`, `151-152`, `173`, and `178-182` guard Search authority, used-search trace, adapter routing, no DecisionController, no ActionMask authority, and no NeuralAgent final selection call.
- `tests\policy_guide_boundary.rs:128`, `164`, `176`, and `178-179` guard no selected final action, proposal-only/search-required authority, not-authoritative action mask, and no runtime/final authority.
- `tests\search_backend_boundary.rs:50-93` verifies legal action IDs and selected legal action behavior for boundary types.
- `docs\control-plane\ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md:45` says board/state authority remains in `src/engine/engine.rs`.
- `docs\control-plane\ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md:85`, `101`, `105`, `111-112`, and `154` say Search-authority modes route through search, Neural direct final selection is no longer supported in current active routing, DecisionController remains passive, PolicyGuide/NeuralProposal remain passive, and contract/helper surfaces do not become final runtime authority.
- `docs\evidence\ROCKY_OBSERVATION_PROTOCOL_V0.md:17` says the protocol is not an architecture, SSOT, or implementation authority.
- `docs\evidence\ROCKY_OBSERVATION_PROTOCOL_V0.md:42-68` separates engine, search, neural, runtime, and HumanGate observation layers.
- `docs\evidence\ROCKY_OBSERVATION_PROTOCOL_V0.md:102` contains an older statement that current active routing must not be described as universally Search-final. Because active source and newer inventory evidence now show Neural/Hybrid route through Search authority, this line is treated as stale/historical observation context, not active runtime truth.

Boundary conclusions:

| Claim | Status | Evidence |
| --- | --- | --- |
| Search remains tactical authority | TESTED by source/test evidence | Active `decision.rs` routes non-random modes through Search authority and boundary tests guard this. |
| PolicyGuide is passive | TESTED by source/test evidence | Passive contract constant, proposal-only/search-required authority, false runtime/final methods, boundary tests. |
| Neural proposal is not final runtime authority | TESTED by source/test evidence | README doctrine, active `decision.rs` routing, PolicyGuide/NeuralProposal passive methods, and boundary tests. |
| `src\engine` is engine/reference surface, not Rocky core | DOCUMENTED_ONLY / IMPLEMENTED split | `src\engine` exists and inventory says board/state authority remains there; Rocky observation protocol is observation guidance, not implementation authority. |
| Broad NeuralAgent runtime surface | IMPLEMENTED / PASSIVE authority split | `src\agents` exists, but active `decision.rs` does not call `agent.select_action` for final action selection per test guard. |

## Specific Claims

| Claim | Verdict | Evidence |
| --- | --- | --- |
| `C:\TACTICAL_CHESS_STUDIO` is now active studioV2 root | TESTED | Root topology and fusion verified report. |
| Git worktree is clean | TESTED before report creation | `git status --short` returned empty before this report. After this report, one new routed status file is expected. |
| Fusion commit exists | TESTED | `4fe0cdd` present. |
| Runtime validation commit exists | TESTED | `c549c75` present at HEAD. |
| Python local validation is TESTED | TESTED from prior report | `RUNTIME_VALIDATION_STATUS_V0.md` records `101 passed, 8436 subtests passed in 1.95s`; not rerun. |
| Rust validation is TESTED with target-dir override | TESTED from prior report | `RUST_VALIDATION_STATUS_V0.md` records override validation `TESTED`; not rerun. |
| Default Rust target under root remains BLOCKED | BLOCKED | Prior reports record Windows Security/file creation interruption in root target. |
| `scripts\studioV2` exists and is tracked | TESTED | Path exists; `git ls-files` returns routed script files. |
| Compatibility shims exist and are tracked | TESTED | Path checks and `git ls-files` evidence. |
| `repos\games\studioV2` | NOT_FOUND | Path check returned `False`. |
| `repos\games\studioV2_MIGRATED_HOLD` | PASSIVE | Path exists; not used as active truth. |
| `.venv` and `target` ignored | TESTED | `git check-ignore -v` reports `.gitignore:29:.venv/` and `.gitignore:40:target/`. |
| models, datasets, secrets, runs, tmp not active truth | PASSIVE / BLOCKED split | All are ignored by `.gitignore`; `secrets` is BLOCKED from inspection; no surface used as active truth. |
| Search remains tactical authority | TESTED by source/test evidence | See Rocky boundary section. |
| Neural/policy does not become direct runtime authority | TESTED by source/test evidence | See Rocky boundary section. |
| `src\engine` is not Rocky core | DOCUMENTED_ONLY / IMPLEMENTED split | Engine exists as board/state authority; Rocky protocol is observation guidance only. |

## Status By Surface

| Surface | Status |
| --- | --- |
| active_runtime_code | IMPLEMENTED |
| tests | IMPLEMENTED; TESTED only from prior evidence and boundary source reads, not rerun |
| docs_canonical | DOCUMENTED_ONLY |
| roadmap_docs_only | DOCUMENTED_ONLY |
| lab_outputs | PASSIVE |
| schemas | PASSIVE |
| scripts/tooling | IMPLEMENTED |
| ml | PASSIVE |
| memory/state | PASSIVE |
| db/migrations | IMPLEMENTED |
| ci/github | IMPLEMENTED as files; execution BLOCKED |
| passive/imported | PASSIVE |
| blocked/secrets | BLOCKED |
| unknown | UNKNOWN; blocked for decisions |

## Software Verdicts By Surface

| Surface | software_verdict |
| --- | --- |
| active_runtime_code | IMPLEMENTED |
| tests | IMPLEMENTED |
| artifacts_runtime_outputs | PASSIVE |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | DOCUMENTED_ONLY |
| inference | PASSIVE |
| schemas | PASSIVE |
| scripts/tooling | IMPLEMENTED |
| ml | PASSIVE |
| memory/state | PASSIVE |
| db/migrations | IMPLEMENTED |
| ci/github | IMPLEMENTED |
| blocked/secrets | BLOCKED |

## Evidence Verdicts By Surface

| Surface | evidence_verdict |
| --- | --- |
| active_runtime_code | DOCUMENTED_ONLY / TESTED for targeted line evidence; no compile rerun |
| tests | DOCUMENTED_ONLY / TESTED from prior validation reports; not rerun |
| artifacts_runtime_outputs | PASSIVE |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | DOCUMENTED_ONLY |
| inference | PASSIVE |
| scripts/tooling | TESTED for existence/tracking; execution not rerun |
| runtime_tool_availability_current | BLOCKED except local `.venv` Python |
| Rust prior validation | TESTED from loaded reports |
| Python prior validation | TESTED from loaded reports |
| Git baseline | TESTED before report creation |
| blocked/secrets | BLOCKED |

## Claim Verdicts By Surface

| Surface | claim_verdict |
| --- | --- |
| active_runtime_code | NO_CLAIM_ALLOWED beyond narrow evidenced topology/boundary claims |
| tests | NO_CLAIM_ALLOWED beyond prior-reported validation and source-level boundary evidence |
| artifacts_runtime_outputs | NO_CLAIM_ALLOWED |
| canonical_docs | NO_CLAIM_ALLOWED / DOCUMENTED_ONLY |
| roadmap_docs_only | NO_CLAIM_ALLOWED / DOCUMENTED_ONLY |
| inference | NO_CLAIM_ALLOWED / PASSIVE |
| scripts/tooling | NO_CLAIM_ALLOWED beyond existence/tracking |
| ml | NO_CLAIM_ALLOWED; no training/inference run |
| models/datasets | NO_CLAIM_ALLOWED |
| secrets | NO_CLAIM_ALLOWED / BLOCKED |

## Risks

| Risk | Surface | Status | Mitigation |
| --- | --- | --- | --- |
| Exact requested GPT-5.5-Codex runtime cannot be attested. | codex_runtime | BLOCKED | Report actual exposed runtime as UNKNOWN exact model identifier. |
| Current shell cannot find cargo/rustc/rustup or system Python/py. | runtime_tool_availability_current | BLOCKED | Treat prior test results as loaded evidence only; rerun validation only under a separate HumanGate task. |
| Prior runtime reports and current availability checks differ. | runtime_validation | UNKNOWN/BLOCKED for current execution | Keep separate: prior validation TESTED, current command availability BLOCKED. |
| Older Rocky observation protocol line conflicts with current Search-final evidence. | canonical_docs | DOCUMENTED_ONLY risk | Treat older line as historical/passive until a docs-only cleanup reconciles it. |
| HOLD path exists and could be confused with active truth. | passive/imported | PASSIVE | Keep HOLD out of active truth; do not propose deletion. |
| Heavy ignored surfaces exist: `.venv`, `target`, models, datasets, runs, tmp, repos. | artifacts_runtime_outputs | PASSIVE/BLOCKED | Keep ignored/passive; no promotion or cleanup in this task. |
| Secret surface exists but cannot be inspected. | blocked/secrets | BLOCKED | No action without explicit HumanGate secret handling authorization. |
| Output report is created but not registered. | canonical_docs | BLOCKED for governance promotion | Registry update requires separate authorization. |

## Next Actions By Class

read_only:
- Re-read this report and loaded status chain before any future post-fusion decision.
- If HumanGate wants current validation status, run a new read-only/toolchain preflight first and record whether the environment changed.

patch_allowed_later:
- Docs-only reconciliation for stale Rocky observation text versus current active Search-authority routing.
- Registry/source-index update for this report only if HumanGate authorizes source registration.

blocked:
- No cargo test, pytest, benchmark, training, inference, dataset generation/reset, model/checkpoint creation, or runtime activation was authorized here.
- No Git add, commit, reset, clean, rm, init, push, tag, branch, PR, or readiness/promotion claim.
- No secret inspection.

passive_cleanup_later:
- Keep `repos\games\studioV2_MIGRATED_HOLD` passive; do not delete or propose deletion in this audit.
- Keep ignored heavy/runtime/local surfaces passive unless a future HumanGate task narrows a cleanup scope.

## Commands Run

Read-only commands were run with escalation because initial sandboxed PowerShell setup failed before execution.

| Command | Purpose | Result |
| --- | --- | --- |
| `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO'` | Confirm ROOT exists. | `True` |
| `git branch --show-current` | Verify current branch. | `master` |
| `git rev-parse HEAD` | Verify HEAD. | `c549c75bfed924880db8d22f71b40bf9325ae866` |
| `git status --short` | Verify pre-output cleanliness. | empty |
| `git log --oneline -5` | Verify recent commits. | `c549c75`, `d748d04`, `4fe0cdd`, `dd820f1` present |
| `git tag --list studioV2-root-fusion-verified-2026-05-23` | Verify fusion tag. | tag present |
| `Get-Content` on workflow/status/root docs | Load sources. | DOCUMENTED_ONLY |
| `Get-ChildItem -LiteralPath 'C:\TACTICAL_CHESS_STUDIO' -Force` | Root topology inventory. | Completed without secret content inspection |
| `git check-ignore -v ...` | Verify ignored local/heavy paths. | Requested ignore entries verified |
| `Test-Path` on required root/staging/HOLD/script paths | Fusion integrity checks. | Required root paths true; old staging false; HOLD true |
| `git ls-files -- scripts/studioV2 ...` | Verify script routing and shims tracked. | Routed scripts and shims listed |
| `cargo --version` | Tool availability. | BLOCKED, command not recognized |
| `rustc --version` | Tool availability. | BLOCKED, command not recognized |
| `rustup --version` | Tool availability. | BLOCKED, command not recognized |
| `python --version` | Tool availability. | BLOCKED, Microsoft Store alias message |
| `py --version` | Tool availability. | BLOCKED, command not recognized |
| `.\\.venv\\Scripts\\python.exe --version` | Local venv availability. | `Python 3.12.10` |
| `Select-String` on README/source/tests/docs | Line evidence extraction. | Completed |
| `Test-Path ...POST_FUSION_TRUTH_AUDIT_V0.md` | Output collision check. | `False` before write |
| `git diff --check` | Docs-only whitespace validation. | Passed with no output. |
| `Get-Content -LiteralPath ...POST_FUSION_TRUTH_AUDIT_V0.md` | Report readback. | Passed. |
| `git status --short` after report creation | Confirm resulting worktree delta. | `?? 00_STUDIO_CONTROL/05_STATUS/POST_FUSION_TRUTH_AUDIT_V0.md` only. |

## Skipped Validation

| Validation | Status | Reason |
| --- | --- | --- |
| `cargo test` | BLOCKED | Explicitly forbidden by task. |
| `pytest` | BLOCKED | Explicitly forbidden by task. |
| Runtime execution | BLOCKED | Task is post-fusion truth map, not repair or rerun. |
| Benchmark/performance run | BLOCKED | Forbidden by doctrine and task scope. |
| Training/inference/model/dataset operations | BLOCKED | Forbidden by doctrine and task scope. |
| Secret inventory/hash/read | BLOCKED | Secret boundary forbids inspection. |
| Git mutation | BLOCKED | Explicitly forbidden. |

## Files Changed

| Path | Operation | Surface | Status |
| --- | --- | --- | --- |
| `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\POST_FUSION_TRUTH_AUDIT_V0.md` | created | canonical_docs/status_report | DOCUMENTED_ONLY |

No source, test, lab, runtime output, staging, HOLD, model, dataset, secret, dependency, or Git state mutation was performed.

## Final Verdicts

software_verdict:
- active_runtime_code: IMPLEMENTED
- tests: IMPLEMENTED
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE
- secrets: BLOCKED

evidence_verdict:
- fusion/root topology: TESTED
- Git baseline before report creation: TESTED
- runtime validation prior reports: TESTED
- runtime availability current shell: BLOCKED except `.venv\Scripts\python.exe`
- Rocky/Search/Policy boundary: TESTED by source/test/docs line evidence
- generated report registration: BLOCKED

claim_verdict:
- default: NO_CLAIM_ALLOWED
- no Elo, strength, promotion, benchmark proof, model proof, runtime activation, dataset promotion, or global readiness claim is made.

no_global_ready_verdict: true
