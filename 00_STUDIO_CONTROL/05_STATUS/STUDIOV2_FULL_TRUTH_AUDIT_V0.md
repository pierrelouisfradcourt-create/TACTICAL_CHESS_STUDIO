# STUDIOV2 FULL TRUTH AUDIT V0

status: DOCUMENTED_ONLY
created_at: 2026-05-23
target: `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2`
source_candidate: `C:\Users\Studio-Dev\Desktop\studioV2`
report_surface: `canonical_docs/status_report`
no_global_ready_verdict: true

## Preflight

- ACTIVE_PROJECT exists: IMPLEMENTED.
  - Evidence: `Test-Path C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2` returned `True`.
- SOURCE_CANDIDATE exists: IMPLEMENTED.
  - Evidence: `Test-Path C:\Users\Studio-Dev\Desktop\studioV2` returned `True`.
- Runtime identity: BLOCKED for exact requested runtime claim.
  - Requested: GPT-5.5-Codex or strongest available Codex reasoning model, high reasoning.
  - Actual runtime exposed to this session: Codex based on GPT-5 per system identity; exact deployment/model identifier is not exposed.
  - Runtime claim rule from `EXECUTOR_REPORT_TEMPLATE_V0.yaml`: do not claim exact runtime unless Codex exposes it.
- Mutation boundary: enforced.
  - No source, test, lab, runtime output, Git, dependency, or secret surface was changed.
  - This report is the only produced file, routed to `00_STUDIO_CONTROL\05_STATUS` by the task and routing policy.
- Secret boundary: enforced.
  - `SECRET_BOUNDARY.md` lines 5-11 forbid inspecting/printing secrets; no secret-like file contents were read.
- Recovered/template boundary: enforced.
  - No `Recovered_*` material was used as active truth.
  - Installer/template material was not used as active truth; only `db\migrations\002_create_unit_templates.sql` matched a template-like filename during passive name inventory.

## Source State

created:
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_FULL_TRUTH_AUDIT_V0.md` created as routed status report.

registered:
- BLOCKED. No registry update was authorized or performed.

loaded:
- Workflow sources loaded: `READ_FIRST.md`, `STUDIO_OUTPUT_ROUTING_POLICY_V0.md`, `STUDIO_SOURCE_ANCHORING_V0.md`, `REPO_HYGIENE.md`, `PATH_BOUNDARY.md`, `SECRET_BOUNDARY.md`, `EXECUTOR_REPORT_TEMPLATE_V0.yaml`, `TASK_CHARTER_TEMPLATE_V0.yaml`.
- Active project sources loaded/read or inventoried: `AGENTS.md`, `README.md`, `Cargo.toml`, `requirements*.txt`, `src`, `tests`, `docs`, `MASTER_DOCS`, `lab`, `schemas`, `scripts`, `ml`, `memory_core`, `db`, `patches`, `AI_MEMORY`, `.studio_state`, `.github`.

enforced:
- Output routing enforced from `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` lines 28-31 and 59-67.
- Source-state separation enforced from `STUDIO_SOURCE_ANCHORING_V0.md` lines 20-37.
- Surface separation enforced from `AGENTS.md` lines 13-19 and `README.md` lines 16-27.
- Claim boundary enforced from `README.md` lines 38-49 and `MASTER_DOCS\DOCS_STATUS.md` lines 152-157.

evidenced:
- File/path evidence, line evidence, Git/ignore evidence, runtime availability evidence, and SHA256 restore-comparison evidence are recorded below.

## Route Check

- Output type: status/audit report.
- Intended destination: `00_STUDIO_CONTROL\05_STATUS`.
- Destination allowed: IMPLEMENTED.
  - Evidence: routing policy maps status reports to `05_STATUS` at lines 59-67.
- Forbidden destinations avoided: IMPLEMENTED.
  - No file was written into `studioV2`, runtime outputs, archives, lab, runs, source, tests, or `.github`.
- Generated report authority: PASSIVE / DOCUMENTED_ONLY.
  - Evidence: routing policy lines 127-133 state generated reports are not active truth by default.

output_routing_result:
- produced_file_type: audit/status report
- intended_surface: canonical_docs/status_report
- actual_destination: `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_FULL_TRUTH_AUDIT_V0.md`
- registration_required: UNKNOWN
- project_source_upload_required: UNKNOWN
- promotion_gate: HumanGate

## Pass 1 - Topology Inventory

Whole-tree count, read-only:

| Surface | Paths | Count / status |
| --- | --- | --- |
| code_active | `src` | 136 files |
| tests | `tests` | 57 files total; 25 `.rs`, 14 `.py`, fixtures/cache also present |
| docs_canonical | `README.md`, `AGENTS.md`, `MASTER_DOCS`, `docs\gpt-navigator`, selected `docs\control-plane` | DOCUMENTED_ONLY |
| roadmap_docs_only | `MASTER_DOCS\*ROADMAP*`, `docs\control-plane\ENGINE_SEARCH_NEURAL_*ROADMAP*`, planning docs | DOCUMENTED_ONLY |
| runtime_artifacts | `.pytest_cache`, `__pycache__`, generated/cached files | PASSIVE |
| lab_outputs | `lab` | 375 files; PASSIVE unless separately promoted |
| schemas | `schemas` | 35 JSON schema files; PASSIVE contracts |
| scripts/tooling | `scripts`, root Python/BAT/PS1 tools | 93 script-tree files including caches; tooling implemented but not activated by this audit |
| ml | `ml`, `src\ml` | Python ML/inference/training tooling and one Rust ML module |
| memory/state | `.studio_state`, `AI_MEMORY`, `memory_core` | PASSIVE / local state; `.studio_state\current_state.json` NOT_FOUND |
| db/migrations | `db\migrations` | 9 SQL migration files |
| ci/github | `.github` | CODEOWNERS plus 6 workflow files |
| passive/imported | `patches`, `MASTER_DOCS\ARCHIVE`, `lab\project_genesis` | PASSIVE |
| unknown | cached/runtime residue, old local docs whose current authority was not revalidated | UNKNOWN/BLOCKED for decisions |

Top-level counts:

| Directory | Files |
| --- | ---: |
| `.cargo` | 1 |
| `.github` | 7 |
| `.pytest_cache` | 4 |
| `.studio_state` | 2 |
| `AI_MEMORY` | 1 |
| `db` | 9 |
| `docs` | 210 |
| `lab` | 375 |
| `MASTER_DOCS` | 58 |
| `memory_core` | 5 |
| `ml` | 23 |
| `patches` | 1 |
| `schemas` | 35 |
| `scripts` | 93 |
| `src` | 136 |
| `tests` | 57 |

Source subdirectory inventory:

| `src` directory | Files |
| --- | ---: |
| `agents` | 14 |
| `ai` | 4 |
| `analytics` | 2 |
| `chess` | 29 |
| `compiler` | 2 |
| `core` | 15 |
| `db` | 5 |
| `engine` | 17 |
| `env` | 2 |
| `experiment` | 4 |
| `integration` | 2 |
| `ml` | 1 |
| `orchestrator` | 2 |
| `prototype` | 3 |
| `rules` | 3 |
| `simulation` | 9 |
| `telemetry` | 3 |
| `tool` | 11 |
| `tournament` | 3 |

## Pass 2 - Project Identity

Evidence-bound identity:

- `studioV2` is a mixed project: game/runtime repo + lab + studio/control-plane + agent/control-plane platform + engine/search/neural sandbox.
- This is an inference from files and docs, not a global readiness verdict.

Evidence:

- Package identity is Rust crate `tactical_chess_pure_lab` in `Cargo.toml` lines 1-13.
- README says current source code, tests, and committed runtime artifacts outrank stale docs (`README.md` lines 16-18).
- README doctrine says Rust owns runtime truth, Python owns ML/inference/tooling, Search remains final move authority, Neural proposes/reranks only, and HumanGate remains final authority (`README.md` lines 29-36).
- `MASTER_DOCS\DOCS_STATUS.md` lines 24-40 classifies active docs, control-plane tooling, passive schemas, blocked activation, and no global ready verdict.
- `MASTER_DOCS\05_ARCHITECTURE.md` lines 28-34 states the implemented runtime remains chess-first while generic tactical/card-game architecture should grow beside it.

Active/canonical surfaces:

- Active runtime code: `src\engine`, `src\chess`, `src\core`, `src\agents`, plus related Rust modules.
- Active test surfaces: Rust integration tests and Python tests under `tests`.
- Canonical docs: `AGENTS.md`, `README.md`, `MASTER_DOCS\DOCS_STATUS.md`, `MASTER_DOCS\01_CURRENT_STATE.md`, `MASTER_DOCS\05_ARCHITECTURE.md`, `docs\gpt-navigator`.
- Control-plane docs: `docs\control-plane`; mostly DOCUMENTED_ONLY.
- Evidence docs: `docs\evidence`; observation/evidence guidance only.

Docs-only/passive surfaces:

- Roadmaps and fusion docs remain DOCUMENTED_ONLY.
- Schemas remain PASSIVE contracts.
- Lab outputs, trace outputs, caches, `.studio_state`, and memory are PASSIVE unless HumanGate promotes narrower artifacts.
- `NeuralPolicyValue` is paper-only per `ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` lines 65-78.

## Pass 3 - Rocky / Engine / Search / Neural / Policy Boundary

### Current Active Code Evidence

- `src\engine` is present and implemented as a general engine/game-state surface, not Rocky core by itself.
  - Inventory found 17 files under `src\engine`.
  - Control-plane inventory identifies board/state authority in `src\engine\engine.rs` and active search in `src\chess\search.rs` (`ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md` lines 42-68).
- Active decision routing is in `src\chess\decision.rs`.
  - `DecisionMode` includes Random, Heuristic, Neural, Minimax, Hybrid at lines 10-17.
  - `DecisionTrace` carries `selection_authority`, `used_search`, and `root_search` at lines 41-49.
  - Heuristic, Neural, Minimax, and Hybrid all route through `search_authority_trace(...)` at lines 119-122.
  - `search_authority_trace(...)` calls `search_root_via_adapter(...)`, records `SelectionAuthority::Search`, `used_search: true`, and stores `root_search` at lines 147-160.
- Active search implementation is in `src\chess\search.rs`.
  - `search_root_with_context(...)` calls `search_root_in_place(...)` at lines 124-141.
  - Search consumes `engine.legal_actions(player)` at lines 147-150.
  - Root scoring uses negamax and root decision selection at lines 204-244 and 306-344.
  - Returned `RootSearchResult` carries `best_action`, search score, policy score, decision score, trace, and diagnostics at lines 387-396.
- `src\chess\search_backend_adapter.rs` is an active wrapper to existing root search, not a wholesale replacement.
  - Adapter owns `Engine`/`PlayerId` references at lines 10-18.
  - It calls `run_search_root_with_context(...)` at lines 20-25.
  - It implements `SearchBackend` and maps root search output to `SearchResult` at lines 28-53.
- `src\ai\search_backend.rs` is a passive trait/types surface.
  - `SearchBackend` trait only defines `search(...)` at lines 25-27.
- `src\ai\decision_controller.rs` is passive interface surface.
  - `DecisionController` trait only defines `decide(...)` at lines 32-34.
- `src\ai\policy_guide.rs` is explicitly passive.
  - Contract version is `policy_guide_v0_passive` at line 4.
  - `PolicyGuideAuthority` is `ProposalOnlyRequiresSearchAuthority` at lines 31-34.
  - `PolicyGuideSuggestion::passive(...)` sets not-dataset-admissible, label truth not established, and action mask not authoritative at lines 114-131.
  - `can_drive_runtime()` and `is_final_authority()` return false at lines 134-140.
  - `NeuralProposal` also cannot drive runtime and is not final authority at lines 189-199.
- `src\agents\neural_agent.rs` is an active neural monolith/runtime surface but not final decision authority through current `decision.rs`.
  - It owns Python/script/model/project paths and `NeuralBridge` at lines 130-150.
  - It exposes `select_action(...)` at line 434, but active `decision.rs` does not call `choose_neural` or `agent.select_action`.

### Test Evidence

Boundary tests are present, but not rerun in this audit.

- `tests\policy_guide_boundary.rs` verifies PolicyGuide result contains no selected final action and passive suggestions cannot drive runtime or become final authority at lines 127-185.
- `tests\search_backend_boundary.rs` verifies SearchBackend boundary types and selected action stays within legal action IDs at lines 75-129.
- `tests\decision_authority_boundary_current.rs` verifies:
  - selection authority exists in active trace at lines 28-40;
  - Search authority helper records `SelectionAuthority::Search`, selected root search action, `used_search: true`, and retained root search at lines 42-83;
  - active decision route does not invoke `DecisionController` at lines 106-118;
  - active search route goes through `search_root_via_adapter(...)` and not raw `search_root_with_context(...)` directly at lines 120-140;
  - active search does not consume `ActionMask` as authority at lines 142-158;
  - Neural mode routes through Search authority and does not call `choose_neural` or `agent.select_action` at lines 160-189.

### Docs/Evidence Cross-Check

- `ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md` lines 81-95 matches active routing: decision router active, Search-authority modes route through `search_root_via_adapter(...)`, DecisionController passive, SearchBackend contract passive.
- Same doc lines 99-114 explicitly state current active routing no longer supports Neural direct final selection or Hybrid heuristic final-selection exceptions, and `NeuralAgent::select_action` is no longer final authority through `decision.rs`.
- `ENGINE_SEARCH_NEURAL_POLICY_VALUE_PASSIVE_INTERFACE_DECISION_V0.md` lines 7-24 says the passive interface decision is docs-only, no implementation, no runtime wiring, no activation, no neural authority expansion.
- `ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` lines 79-89 preserves invariants: Search final tactical authority, Neural never decides alone, runtime/source truth outranks docs, HumanGate final authority.
- `ROCKY_OBSERVATION_PROTOCOL_V0.md` lines 13-24 defines Rocky observation as bounded trace observation and dataset-safety guidance only, not architecture or implementation authority.
- `ROCKY_OBSERVATION_PROTOCOL_V0.md` lines 70-103 contains a volatile implementation snapshot that still describes older Neural/Hybrid exceptions. Because README and architecture docs say active code outranks stale docs, this older snapshot is PASSIVE and superseded for current active routing by source code plus `ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md` lines 99-114.

Rocky authority verdict:

- Rocky/runtime evidence docs are PASSIVE observation guidance.
- Rocky is not proven as runtime authority by this audit.
- Search is active final tactical authority in current `decision.rs` for Heuristic, Neural, Minimax, and Hybrid modes.
- Neural remains active as a runtime component surface, but final decision authority through current `decision.rs` is Search, not Neural.
- PolicyGuide, DecisionController, SearchBackend contract, ActionMask authority, and NeuralPolicyValue remain PASSIVE unless separate HumanGate activation occurs.

## Pass 4 - Tests And Validation State

Inventory:

- Rust integration tests: 25 root `.rs` test files.
- Python tests: 14 root `test_*.py` files.
- Fixtures: `tests\fixtures` plus extensive `docs\control-plane\fixtures`.
- Schema tests/tooling: JSON schemas in `schemas`; validators/smokes under `scripts\control_plane`.
- Smoke scripts: `scripts\control_plane\smoke_*`, `run_full_studio_loop_in_memory_test.py`, `run_semi_auto_studio_loop_dry_run.py`, `run_studiopilot_loop_smoke.py`, and related validators.

Runtime availability checks:

- `cargo --version`: BLOCKED, `cargo` not recognized.
- `rustc --version`: BLOCKED, `rustc` not recognized.
- `python --version`: BLOCKED, Microsoft Store alias reported Python not found.
- `py --version`: BLOCKED, `py` not recognized.

Validation status:

- Rust validation: BLOCKED because cargo/rustc are unavailable locally.
- Python validation: TESTED only as external/source-context evidence provided in task: `101 passed, 8436 subtests passed` in restored/source `.venv`.
- Local Python rerun: BLOCKED because Python runtime is unavailable in this shell.
- No tests were rerun.

Skipped validation:

- `cargo test`: BLOCKED; cargo/rustc missing.
- `pytest`: BLOCKED; Python/py missing, and task instructed not to rerun unless runtime already available.
- Benchmarks/training/inference: BLOCKED by scope.

## Pass 5 - Git And Routing

Git state:

- `studioV2\.git`: NOT_FOUND.
- Git top-level from inside `studioV2`: `C:/TACTICAL_CHESS_STUDIO`.
- Root branch/status: `## master`, with untracked `00_STUDIO_CONTROL/`, `ENGINE_SEARCH_NEURAL_SCAN.txt`, `document_work/`, `tools/`.
- `studioV2` is ignored by root Git.
  - Evidence: `git check-ignore -v repos/games/studioV2/Cargo.toml` returned `.gitignore:14:repos/`.
  - Evidence: root `.gitignore` has `repos/` at line 14.
  - Evidence: `git status --short --ignored repos/games/studioV2/Cargo.toml` returned `!! repos/`.

Versioning options, not executed:

- Option A: initialize `studioV2` as its own Git repo only with explicit HumanGate authorization.
- Option B: change root ignore policy and track `repos/games/studioV2` under root only with explicit HumanGate authorization.
- Option C: keep `studioV2` local/ignored and create an external bundle/archive under a routed, approved backup policy.
- No `git add`, `git init`, `git commit`, `git reset`, branch, push, or PR action was executed.

## Pass 6 - Restore Completeness

Important-surface SHA256 comparison against `C:\Users\Studio-Dev\Desktop\studioV2`:

| Surface | Active exists | Source exists | Active files | Source files | Same | Missing active | Missing source | Divergent |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `Cargo.toml` | true | true | 1 | 1 | 1 | 0 | 0 | 0 |
| `Cargo.lock` | true | true | 1 | 1 | 1 | 0 | 0 | 0 |
| `AGENTS.md` | true | true | 1 | 1 | 1 | 0 | 0 | 0 |
| `src` | true | true | 136 | 136 | 136 | 0 | 0 | 0 |
| `tests` | true | true | 43 | 43 | 43 | 0 | 0 | 0 |
| `docs\control-plane` | true | true | 192 | 192 | 192 | 0 | 0 | 0 |
| `docs\evidence` | true | true | 13 | 13 | 13 | 0 | 0 | 0 |
| `schemas` | true | true | 35 | 35 | 35 | 0 | 0 | 0 |
| `scripts` | true | true | 88 | 88 | 88 | 0 | 0 | 0 |
| `ml` | true | true | 20 | 20 | 20 | 0 | 0 | 0 |
| `lab` | true | true | 375 | 375 | 375 | 0 | 0 | 0 |
| `MASTER_DOCS` | true | true | 58 | 58 | 58 | 0 | 0 | 0 |

Root-file hashes:

- `Cargo.toml`: `201070DB7ABB241157B3D2FE7F2C5083A62C6C7F3E6BF9F2115FF65344A9274D`
- `Cargo.lock`: `D524FFF5F5991D27D1AAEB8E544A269626FC5C2C7343B6008A7BE4DAA56498FE`
- `AGENTS.md`: `8007A0496498B56EDFB5B45F8FE46D4CBF3ADC1480C0B2E08BE0641BA6309F7B`

Completeness verdict:

- Important surfaces compared are byte-identical by SHA256: TESTED.
- Historical/Git completeness is BLOCKED because restored `studioV2` has no `.git`.
- No `Recovered_*` or installer-template material was used as source truth.

## Specific Claim Verdicts

| Claim | Verdict | Evidence |
| --- | --- | --- |
| `studioV2` is the restored full pre-migration lab/studio project | TESTED for requested important surfaces matching source candidate; BLOCKED for full historical/Git completeness | SHA256 table all requested surfaces match; `.git` absent |
| `studioV2` contains the chess engine surface | IMPLEMENTED | `src\chess` has 29 files; `src\chess\search.rs`, `decision.rs`, adapters present |
| `studioV2` contains Rocky/search/neural/policy surfaces | IMPLEMENTED/PASSIVE split | `src\agents\neural_agent.rs`, `src\chess\search.rs`, `src\ai\policy_guide.rs`, docs/evidence Rocky protocol |
| `studioV2` contains tests for search/policy/engine boundaries | IMPLEMENTED; local execution BLOCKED | Boundary test files present; cargo/rustc missing |
| `studioV2` contains docs/control-plane and evidence docs | DOCUMENTED_ONLY | `docs\control-plane` 192 files, `docs\evidence` 13 files |
| `studioV2` is not currently a standalone Git repo | IMPLEMENTED | `Test-Path studioV2\.git` returned False |
| Root Git ignores `repos/` | IMPLEMENTED | `.gitignore:14:repos/`; `git check-ignore` confirms |
| Rust validation is blocked by missing cargo/rustc | BLOCKED | version checks failed |
| Python validation passed only through external/source `.venv` | TESTED with limitation; local rerun BLOCKED | task-provided result only; local Python unavailable |
| `Recovered_*` and installer templates are passive, not truth | PASSIVE | no `Recovered_*` active use; template-like migration filename only inventoried |
| `src\engine` is present but should not be confused with Rocky core | IMPLEMENTED | `src\engine` 17 files; Rocky docs are observation/evidence guidance |
| Rocky/neural/policy must not be treated as direct runtime authority unless evidence proves it | IMPLEMENTED boundary / PASSIVE authority | source and tests show current final authority routes through Search; policy guide cannot drive runtime |

## Status By Surface

| Surface | Status |
| --- | --- |
| active_runtime_code | IMPLEMENTED |
| tests | IMPLEMENTED locally present; TESTED only by external/prior evidence where stated; local execution BLOCKED |
| docs_canonical | DOCUMENTED_ONLY |
| roadmap_docs_only | DOCUMENTED_ONLY |
| artifacts_runtime_outputs | PASSIVE |
| lab_outputs | PASSIVE |
| schemas | PASSIVE |
| scripts/tooling | IMPLEMENTED/PASSIVE split; activation BLOCKED |
| ml | IMPLEMENTED/PASSIVE split; training/inference execution BLOCKED |
| memory/state | PASSIVE; `.studio_state\current_state.json` NOT_FOUND |
| db/migrations | IMPLEMENTED |
| ci/github | IMPLEMENTED as files; execution BLOCKED |
| passive/imported | PASSIVE |
| unknown | UNKNOWN; becomes BLOCKED for decisions |

## Software Verdicts By Surface

| Surface | Verdict |
| --- | --- |
| active_runtime_code | IMPLEMENTED |
| tests | IMPLEMENTED; local execution BLOCKED |
| artifacts_runtime_outputs | PASSIVE |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | DOCUMENTED_ONLY |
| inference | PASSIVE |
| schemas | PASSIVE |
| scripts/tooling | IMPLEMENTED for files; activation BLOCKED |
| ml | IMPLEMENTED/PASSIVE; training/inference BLOCKED |

## Evidence Verdicts By Surface

| Surface | Verdict |
| --- | --- |
| active_runtime_code | DOCUMENTED_ONLY audit evidence plus file inventory; no local compile/test |
| tests | TESTED only by external/source-context Python result; Rust local execution BLOCKED |
| artifacts_runtime_outputs | PASSIVE; not source truth |
| canonical_docs | DOCUMENTED_ONLY with line evidence |
| roadmap_docs_only | DOCUMENTED_ONLY |
| inference | PASSIVE |
| restore_comparison | TESTED by SHA256 for requested important surfaces |
| Git routing | IMPLEMENTED evidence for ignored/non-standalone state |

## Claim Verdicts By Surface

| Surface | Verdict |
| --- | --- |
| active_runtime_code | NO_GLOBAL_READY_CLAIM; narrow code-presence and boundary claims only |
| tests | NO_LOCAL_TEST_PASS_CLAIM; external Python pass recorded with limitation |
| artifacts_runtime_outputs | NO_CLAIM_ALLOWED |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | DOCUMENTED_ONLY / planning only |
| inference | PASSIVE; Neural proposes/reranks only |
| Rocky evidence | PASSIVE observation only; no strength/readiness/benchmark claim |
| restore completeness | TESTED for requested surfaces; BLOCKED for historical Git completeness |

## Risks

- Exact runtime model identifier is hidden: BLOCKED for exact GPT-5.5 runtime claim.
- Local Rust toolchain unavailable: BLOCKED for local Rust validation.
- Local Python unavailable: BLOCKED for local Python validation.
- `studioV2` has no `.git`: BLOCKED for historical commit/branch provenance inside restored project.
- Root Git ignores `repos/`: ignored project will not be versioned by root Git without a future policy change.
- Some docs contain volatile or stale snapshots; active source code and newer boundary docs outrank those docs.
- Lab/runtime outputs and caches are present; they must remain PASSIVE unless HumanGate promotes a specific artifact.
- `.studio_state\current_state.json` is NOT_FOUND in restored active project despite docs discussing local state; decisions depending on current local state are BLOCKED.

## Commands Run

Read-only inspection commands were run with escalation because sandbox setup failed before PowerShell execution. Command classes:

- `Test-Path` for active project, source candidate, `.git`, output path, `.studio_state\current_state.json`.
- `Get-Content` on non-secret workflow docs, active docs, manifests, and targeted source/test/docs evidence files.
- `Get-ChildItem` for recursive inventories, directory counts, schema/script/test/doc/ML/memory lists, Recovered/template name search.
- `Get-FileHash` SHA256 comparison for requested important surfaces.
- `git status --short --branch`, `git rev-parse --show-toplevel`, `git check-ignore -v`, and `git status --short --ignored` for Git/routing classification.
- `cargo --version`, `rustc --version`, `python --version`, `py --version` for runtime availability only.

No destructive, install, mutation, copy, move, delete, Git add/commit/init/reset, test, benchmark, training, or secret-inspection commands were run.

## Files Changed

| Path | Operation | Surface | Status |
| --- | --- | --- | --- |
| `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_FULL_TRUTH_AUDIT_V0.md` | created | status/audit report | DOCUMENTED_ONLY |

No `studioV2` files were changed.

## Skipped Validation

| Item | Status | Reason |
| --- | --- | --- |
| `cargo test` | BLOCKED | `cargo` and `rustc` unavailable |
| `pytest` | BLOCKED | `python` and `py` unavailable locally; external/source pass recorded separately |
| benchmarks | BLOCKED | out of scope and claim boundary |
| training/inference | BLOCKED | out of scope and claim boundary |
| Git mutation/versioning | BLOCKED | out of scope; HumanGate required |

## No Global Verdict

No global ready/not-ready verdict is issued. All findings above are component-level and evidence-bound.
