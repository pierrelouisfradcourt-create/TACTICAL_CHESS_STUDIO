# ROCKY RESTORATION TRUTH AUDIT V0

status: DOCUMENTED_ONLY
report_type: read_only_truth_audit
created_utc: 2026-05-23
no_global_ready_verdict: true
actual_runtime: exact backend model identifier not exposed to this agent; task executed by available Codex reasoning runtime with high reasoning requested. requested GPT-5.3-Codex availability is UNKNOWN => BLOCKED for exact runtime attestation.

## Preflight

| Check | Result | Evidence |
|---|---:|---|
| ACTIVE_RESTORED exists | IMPLEMENTED | `Test-Path C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2` => True |
| SOURCE_CANDIDATE exists | IMPLEMENTED | `Test-Path C:\Users\Studio-Dev\Desktop\studioV2` => True |
| LEGACY_REFERENCE exists | IMPLEMENTED | `Test-Path C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab` => True |
| Recovered_* used as truth | BLOCKED | Not read or compared. |
| installer/templates used as active truth | BLOCKED | Templates were loaded only as mandatory workflow form sources, not as repo truth. |
| secrets inspected | BLOCKED | No secret files were read; `SECRET_BOUNDARY.md` line 7 blocks inspecting secrets. |

## Source State

created: []
registered: []

loaded:
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\00_INDEX\READ_FIRST.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\02_NAVIGATION\STUDIO_SOURCE_ANCHORING_V0.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\04_BOUNDARIES\REPO_HYGIENE.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\04_BOUNDARIES\PATH_BOUNDARY.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\04_BOUNDARIES\SECRET_BOUNDARY.md`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\07_FORMS\EXECUTOR_REPORT_TEMPLATE_V0.yaml`
- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\07_FORMS\TASK_CHARTER_TEMPLATE_V0.yaml`
- `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\AGENTS.md`
- `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\Cargo.toml`
- `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\README.md`
- `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\src`
- `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\tests`
- `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\docs\control-plane`
- `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\docs\evidence`
- `C:\Users\Studio-Dev\Desktop\studioV2\AGENTS.md`
- `C:\Users\Studio-Dev\Desktop\studioV2\Cargo.toml`
- `C:\Users\Studio-Dev\Desktop\studioV2\src`
- `C:\Users\Studio-Dev\Desktop\studioV2\tests`
- `C:\Users\Studio-Dev\Desktop\studioV2\docs\control-plane`
- `C:\Users\Studio-Dev\Desktop\studioV2\docs\evidence`
- `C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab\Cargo.toml`
- `C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab\src`
- `C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab\tests`
- `C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab\docs\control-plane`
- `C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab\docs\evidence`

enforced:
- Output routing: status reports belong under `00_STUDIO_CONTROL\05_STATUS`; evidence `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` line 66.
- Generated reports are not active truth by default; evidence `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` lines 127-138.
- Missing destination/source certainty blocks action; evidence `READ_FIRST.md` lines 32 and 55.
- Source anchoring requires loaded/enforced/evidenced reporting; evidence `STUDIO_SOURCE_ANCHORING_V0.md` lines 44-47 and 184-186.
- No archives/caches/runs inside active repo; evidence `REPO_HYGIENE.md` lines 13-14.
- Runtime activation/code/test/model/dataset changes are blocked; evidence `REPO_HYGIENE.md` line 102.
- Secrets must not be inspected; evidence `SECRET_BOUNDARY.md` line 7.

## Route Check

| Item | Result |
|---|---|
| Output is status/audit report | true |
| Allowed destination | `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS` |
| Destination exists | true |
| Target existed before write | false |
| Repo source directories touched | false |
| Runtime outputs touched | false |
| Archives touched | false |

output_routing_result: IMPLEMENTED

## Files Changed

- `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\ROCKY_RESTORATION_TRUTH_AUDIT_V0.md` created as the requested routed status report.
- No repo source, test, doc, legacy, runtime output, archive, secret, Recovered_*, or installer-template file was modified.

## Commands Run

- `Test-Path` for required ACTIVE_RESTORED, SOURCE_CANDIDATE, LEGACY_REFERENCE paths.
- `Get-Content` for mandatory workflow docs and approved repo/source/legacy files.
- `Get-ChildItem` for approved `src`, `tests`, `docs\control-plane`, and `docs\evidence` inventories.
- `Get-FileHash -Algorithm SHA256` for active/source/legacy comparison.
- `cargo --version`, `rustc --version`, `python --version`, `py --version` availability checks.
- `Test-Path` for `.venv` in ACTIVE_RESTORED and SOURCE_CANDIDATE.
- `git status --short` only where `.git` existed; SOURCE_CANDIDATE and LEGACY_REFERENCE returned dubious ownership errors; ACTIVE_RESTORED has no `.git` directory.
- `Set-Content` only for this routed report file.

Note: initial sandboxed `Test-Path` failed before PowerShell execution due Windows sandbox setup failure. Read-only commands were rerun with escalation. No destructive command was run.

## Skipped Validation

| Validation | Status | Reason | Future command when available |
|---|---|---|---|
| Rust compile/tests | BLOCKED | `cargo --version` and `rustc --version` unavailable. | `cargo test` from `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2` |
| Python tests | BLOCKED | `python --version` and `py --version` unavailable. ACTIVE_RESTORED `.venv` not found; SOURCE_CANDIDATE `.venv` exists but was not activated or inspected as runtime truth. | `.\.venv\Scripts\python -m pytest` only after explicit runtime/toolchain authorization and active repo venv policy is clear |
| Git cleanliness | BLOCKED | ACTIVE_RESTORED has no `.git`; source and legacy `.git` status blocked by dubious ownership. | `git status --short` after Git safe.directory policy is explicitly approved |

## Pass 1 Surface Inventory

| Surface | Status | Evidence |
|---|---|---|
| `src\engine` | IMPLEMENTED | Directory exists; 17 files. Not Rocky core for this audit; engine is legality/state transition layer. |
| `src\agents` | IMPLEMENTED | Directory exists; 14 files, including `neural_agent.rs`, `neural_bridge.rs`, `neural_legal.rs`, `neural_selection.rs`. |
| `src\ai` | IMPLEMENTED | Directory exists; 4 files: `decision_controller.rs`, `mod.rs`, `policy_guide.rs`, `search_backend.rs`. |
| `src\chess\search_backend_adapter.rs` | IMPLEMENTED | SHA256 `DAAD125E6FA7CACE78226B00B64CCC4E7457BC96C126EE28B3AB953F3E712B2A`; lines 10-24 define adapter over `Engine`; lines 55-60 expose `search_root_via_adapter`. |
| `src\chess\search_mirror_ordering.rs` | IMPLEMENTED | SHA256 `919C0E8BE285AF5820BEFA65ED8310ACC02E8AF382A35536B5B0FF449A3ACBC2`. |
| `src\chess\practical_policy.rs` | IMPLEMENTED | SHA256 `6591F52EF225A16600D13FE02A47DA5E5E3611AB045967CB699204BCE4FCDAE6`. |
| `src\chess\policy_guide.rs` | NOT_FOUND | No file at that path. Actual policy guide surface is `src\ai\policy_guide.rs`. |
| `src\ai\policy_guide.rs` | PASSIVE | `POLICY_GUIDE_CONTRACT_VERSION` is `policy_guide_v0_passive` line 4; `can_drive_runtime` false lines 134-136 and 189-191. |
| `tests\search_backend_boundary.rs` | IMPLEMENTED | SHA256 `90CC5A2953D6EE4408D4AE92AB2A64D0E1B08020E9FDE57553E403A623223D8B`. |
| `tests\search_backend_passive_adapter.rs` | IMPLEMENTED | SHA256 `0AFB822E4C1E3C74EAE6A6BFACED30B7F79251880D9F23954E327DF9D182C84F`; lines 238-258 assert Search authority for Heuristic/Hybrid/Neural/Minimax. |
| `tests\policy_guide_boundary.rs` | IMPLEMENTED | SHA256 `47EC3579EF28BCFA3D28EAC3F3B24EE96088088C4E444847CD33034F77F5C147`; lines 161-184 assert proposal-only/search-required/not-authoritative posture. |
| `docs\control-plane\ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md` | DOCUMENTED_ONLY | SHA256 `6AF4F2ED9EE88D8D984767B3F41E7C60390B03986FC30FFFBB107F43D7772522`. |
| `docs\control-plane\ENGINE_SEARCH_NEURAL_DECISION_ROUTING_CONTRACT_PLAN_V0.md` | DOCUMENTED_ONLY | SHA256 `0C62E2DDCB30E6EFE0216E095D04D8E8F1CD5143BB0EF843FFDDE0D58E505152`; line 16 says no runtime routing mutation; lines 87-90 bound neural/proposal authority. |
| `docs\evidence\ROCKY_OBSERVATION_PROTOCOL_V0.md` | DOCUMENTED_ONLY | SHA256 `651CAAA9E6499FF3CFF7FA5928363A8BD84756E9872951A01618866CD3F79372`; lines 42-68 separate engine/search/neural/runtime/HumanGate layers. |

## Pass 2 Restoration Comparison

Comparison scope: `AGENTS.md`, `Cargo.toml`, `README.md`, `src`, `tests`, `docs\control-plane`, `docs\evidence`.

| Comparison | Result |
|---|---|
| ACTIVE_RESTORED file count in scoped comparison | 387 |
| SOURCE_CANDIDATE file count in scoped comparison | 403 |
| Hash differences | 16 |
| Source/test/doc semantic differences | 0 found |
| Differences found | 16 files under `tests\__pycache__` missing from ACTIVE_RESTORED |

Restoration verdict for Rocky/chess AI surfaces: IMPLEMENTED for source, tests, and docs in scope. The only hash differences were Python bytecode cache artifacts in SOURCE_CANDIDATE, not source-of-truth code or docs. Exact byte-for-byte restoration including caches is not claimed.

Missing from ACTIVE_RESTORED relative to SOURCE_CANDIDATE:
- `tests\__pycache__\test_check_workspace_hygiene.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_dataset_builder_legacy_rows_rejected.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_dataset_router_cannot_bypass_am_gate.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_python_dataset_admission_fail_closed.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_python_dataset_admission_wiring_expectations.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_rocky_error_source_input_fixture.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_rust_generated_legal_action_sample_parity.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_shared_puzzle_candidate_fixture.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_smoke_passive_control_plane_gates.cpython-312.pyc`
- `tests\__pycache__\test_smoke_passive_control_plane_gates.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_standard_move_vocab_cross_fixture.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_standard_move_vocab_exhaustive_parity.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_train_fail_closed_no_outputs.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_training_dataset_preflight.cpython-312-pytest-9.0.3.pyc`
- `tests\__pycache__\test_validate_prompt_report_hygiene.cpython-312.pyc`
- `tests\__pycache__\test_validate_prompt_report_hygiene.cpython-312-pytest-9.0.3.pyc`

## Pass 3 Legacy Delta

Filtered comparison: SOURCE_CANDIDATE versus LEGACY_REFERENCE for paths matching Rocky/search/neural/policy/action-mask/controller/agent/AI terms.

| Metric | Result |
|---|---:|
| SOURCE_CANDIDATE filtered files | 109 |
| LEGACY_REFERENCE filtered files | 93 |
| Filtered deltas | 27 |

Classified deltas:

| Class | Files/evidence | Status |
|---|---|---|
| boundary hardening | `tests\neural_policy_guide_passive_adapter.rs` new; `tests\neural_agent_selection_boundary_current.rs` new; `tests\policy_guide_boundary.rs` different; `tests\search_backend_passive_adapter.rs` different; `tests\decision_controller_passive_adapter.rs` different. | IMPLEMENTED |
| policy/search passive authority | `src\ai\policy_guide.rs` different; `src\ai\mod.rs` different; `src\chess\search_backend_adapter.rs` different; `src\agents\mod.rs` different. | IMPLEMENTED |
| neural proposal | `src\agents\neural_config.rs`, `neural_context.rs`, `neural_fallback.rs`, `neural_legal.rs`, `neural_selection.rs` new in SOURCE_CANDIDATE; `src\agents\neural_agent.rs` different. | IMPLEMENTED |
| engine coupling | `src\chess\search_backend_adapter.rs` imports `Engine` at line 6 and delegates to root search at lines 20-24; `src\agents\neural_agent.rs` accepts `&Engine` at line 434. | IMPLEMENTED |
| docs-only | `ENGINE_SEARCH_NEURAL_DECISION_ROUTING_CONTRACT_PLAN_V0.md`, `ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md`, `ENGINE_SEARCH_NEURAL_SPLIT_INVENTORY_GATE_PACKET_V0.md` different; `PATCH_CHAIN_ANALYZER_CONTRACT_V0.md`, `STUDIO_AGENT_BREATHING_POLICY_V0.md`, semantic fixture docs new. | DOCUMENTED_ONLY |
| unknown | Git chronology is blocked by dubious ownership; no timestamp-based recency claim is made. | BLOCKED |

Legacy conclusion: SOURCE_CANDIDATE is demonstrably more boundary-hardened than LEGACY_REFERENCE for the filtered Rocky/search/neural/policy surfaces. A stronger chronological "more recent" claim is BLOCKED because git status/history was not available and timestamp inference was not used.

## Pass 4 Coupling Audit

| Claim | Verdict | Evidence |
|---|---|---|
| Rocky/neural proposal can drive runtime | BLOCKED as a runtime claim; PASSIVE for `NeuralProposal` specifically | `src\ai\policy_guide.rs` lines 189-191 return false for `NeuralProposal::can_drive_runtime`. However `src\agents\neural_agent.rs` still has a callable `select_action(&Engine, ..., &[Action]) -> Action` at line 434, so broad "neural" runtime coupling cannot be denied globally. |
| Rocky/neural proposal is final authority | PASSIVE / denied for `NeuralProposal`; BLOCKED for broad neural runtime | `src\ai\policy_guide.rs` lines 193-195 return false for proposal final authority. `decision.rs` routes `DecisionMode::Neural` through search at lines 119-122 and records `SelectionAuthority::Search` lines 153-158. NeuralAgent still owns a final-selection entrypoint in its own tests lines 3288-3290, so broad claims must distinguish proposal from legacy agent. |
| Rocky grants action-mask authority | PASSIVE / denied for policy guide/proposal | `PolicyGuideActionMaskAuthority::NotAuthoritative` lines 46-49; suggestion field set to not authoritative lines 126-130; `grants_action_mask_authority` false lines 158-160 and 213-215. |
| Search/controller remains required authority | IMPLEMENTED for active chess decision route; PASSIVE for DecisionController trait | `decision.rs` routes Heuristic/Neural/Minimax/Hybrid to `search_authority_trace` lines 119-122. That helper calls `search_root_via_adapter` and marks `SelectionAuthority::Search` lines 153-158. `DecisionController` is only trait/types in `src\ai\decision_controller.rs` lines 5-32 and not active in `decision.rs`; test `search_backend_passive_adapter.rs` lines 292-303 guards against DecisionController/ActionMask/NeuralAgent in active route. |
| Engine applies actions, not neural policy | IMPLEMENTED for observed simulation route | `simulation_runner.rs` selects action through `choose_best_action_with_trace_and_context` lines 1199-1204, then applies via `engine.execute(Command { player_id, action })` lines 1361-1365. `engine.rs` owns `execute` lines 288-305 and validates moves before applying line 301. |
| Rocky/neural/policy/search directly coupled to game engine | MIXED | Search adapter is directly coupled to `Engine` (`search_backend_adapter.rs` lines 6, 10-24). NeuralAgent is directly coupled to `Engine` (`neural_agent.rs` lines 434, 461-464). PolicyGuide/NeuralProposal is not directly coupled to `Engine` (`policy_guide.rs` imports only `ActionId`/`LegalAction` at line 1). |

## Pass 5 Validation Feasibility

| Tool/runtime | Status | Evidence |
|---|---|---|
| Cargo | BLOCKED | `cargo --version` unavailable. |
| rustc | BLOCKED | `rustc --version` unavailable. |
| Python launcher | BLOCKED | `python --version` unavailable; `py --version` unavailable. |
| ACTIVE_RESTORED `.venv` | NOT_FOUND | `Test-Path C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\.venv` => False. |
| SOURCE_CANDIDATE `.venv` | IMPLEMENTED | `Test-Path C:\Users\Studio-Dev\Desktop\studioV2\.venv` => True, but not used as active runtime truth. |

Suggested future commands after toolchain/environment authorization:
- `cargo test`
- `cargo test search_backend_boundary`
- `cargo test search_backend_passive_adapter`
- `cargo test policy_guide_boundary`
- `cargo test neural_policy_guide_passive_adapter`
- `cargo test neural_agent_selection_boundary_current`
- `.\.venv\Scripts\python -m pytest` only if a sanctioned active repo Python environment exists and Python is available.

## Risks

- Rust behavior is not runtime-validated in this audit because Cargo/rustc are unavailable.
- Python behavior is not runtime-validated because Python/py are unavailable and ACTIVE_RESTORED lacks `.venv`.
- Git chronology and cleanliness are blocked: ACTIVE_RESTORED has no `.git`; SOURCE_CANDIDATE and LEGACY_REFERENCE `.git` status returned dubious ownership errors.
- `docs\evidence\ROCKY_OBSERVATION_PROTOCOL_V0.md` contains older snapshot lines 91-102 that say Neural/Hybrid exceptions remain, while current code and routing plan show Neural/Hybrid now route through Search authority. Treat that doc as historical evidence unless reconciled by a future docs-only cleanup.
- Broad "neural" claims are risky unless they distinguish `src\ai\NeuralProposal`/PolicyGuide from `src\agents\NeuralAgent`, because NeuralAgent still has engine-coupled action selection code even though active `decision.rs` does not call it.

## Status By Surface

| Surface | Status |
|---|---|
| Active restored repo surface | IMPLEMENTED |
| Active/source restoration for core Rocky surfaces | IMPLEMENTED |
| Python cache parity | NOT_FOUND in ACTIVE_RESTORED |
| Legacy comparison | IMPLEMENTED |
| Legacy chronological recency | BLOCKED |
| Legacy boundary-hardening delta | IMPLEMENTED |
| PolicyGuide / NeuralProposal runtime authority | PASSIVE |
| SearchBackend trait/types | PASSIVE |
| PassiveSearchBackendAdapter decision boundary | IMPLEMENTED |
| DecisionController trait/types | PASSIVE |
| PassiveDecisionControllerAdapter | PASSIVE |
| ActionMask authority | PASSIVE / NOT_FOUND as active Rust authority |
| Engine state/action application | IMPLEMENTED |
| NeuralAgent monolith/legacy runtime coupling | IMPLEMENTED |
| Rust validation | BLOCKED |
| Python validation | BLOCKED |

## Software Verdicts By Surface

| Surface | Verdict | Evidence |
|---|---|---|
| `src\ai\policy_guide.rs` | PASSIVE | Explicit false-returning authority methods lines 134-160 and 189-215. |
| `src\ai\search_backend.rs` | PASSIVE | Trait/types only lines 4-26. |
| `src\ai\decision_controller.rs` | PASSIVE | Trait/types only lines 5-32. |
| `src\chess\search_backend_adapter.rs` | IMPLEMENTED | Active adapter boundary over engine/root search lines 10-24 and 55-60. |
| `src\chess\decision.rs` | IMPLEMENTED | Active router lines 95-123; Search authority helper lines 147-160. |
| `src\agents\neural_agent.rs` | IMPLEMENTED | Engine-coupled `select_action` line 434; tests preserve entrypoint lines 3288-3290. |
| `src\engine\engine.rs` | IMPLEMENTED | `execute` owns action application lines 288-305. |

## Evidence Verdicts By Surface

| Surface | Verdict | Evidence |
|---|---|---|
| Search authority evidence | IMPLEMENTED | `tests\search_backend_passive_adapter.rs` lines 238-258 asserts Search authority for Neural/Hybrid/Heuristic/Minimax. |
| Decision boundary evidence | IMPLEMENTED | `tests\search_backend_passive_adapter.rs` lines 277-303 asserts adapter route and absence of DecisionController/ActionMask/NeuralAgent in `decision.rs`. |
| Policy guide passive evidence | IMPLEMENTED | `tests\policy_guide_boundary.rs` lines 161-184 asserts passive/search-required/not-authoritative semantics. |
| Neural proposal passive evidence | IMPLEMENTED | `tests\neural_policy_guide_passive_adapter.rs` lines 195-225 asserts no runtime, no final authority, no action-mask authority. |
| Current docs evidence | DOCUMENTED_ONLY | Routing contract plan lines 87-90 says neural never sole final authority and PolicyGuide/NeuralProposal remain passive. |
| Historical docs evidence | DOCUMENTED_ONLY | Observation protocol lines 91-102 conflict with current code on Neural/Hybrid search-final status; treat as stale/historical until reconciled. |

## Claim Verdicts By Surface

| Specific claim | Verdict | Evidence |
|---|---|---|
| ACTIVE_RESTORED contains the restored chess/Rocky repo surface | IMPLEMENTED | Required path exists; active key source/test/docs files present with hashes listed above. |
| ACTIVE_RESTORED matches SOURCE_CANDIDATE for core Rocky surfaces | IMPLEMENTED | Scoped hash compare: 387 active vs 403 source; only 16 missing files are `tests\__pycache__` bytecode caches. |
| SOURCE_CANDIDATE is more recent or more boundary-hardened than LEGACY_REFERENCE | IMPLEMENTED for boundary-hardened; BLOCKED for chronological recency | 27 filtered deltas include new/different boundary tests and passive authority files. Git chronology unavailable. |
| `policy_guide.rs` is passive and cannot drive runtime | PASSIVE | Actual path `src\ai\policy_guide.rs`; lines 134-160 and 189-215 deny runtime/final/action-mask authority. |
| neural proposals are not final authority | PASSIVE | `NeuralProposal::is_final_authority` false lines 193-195; tests lines 222-224 assert it. |
| action-mask authority is not granted by neural/policy guide | PASSIVE | `PolicyGuideActionMaskAuthority::NotAuthoritative` lines 46-49; false methods lines 158-160 and 213-215. |
| search/controller authority remains required | IMPLEMENTED / PASSIVE split | Search authority active in `decision.rs` lines 119-122 and 153-158. DecisionController remains passive trait/adapter, not active route. |
| `src\engine` is present but should not be treated as Rocky core | IMPLEMENTED | Directory exists with 17 files; observation protocol separates Engine Layer lines 42-46 from Neural/Search/Runtime layers lines 48-68. |
| installer templates are not active truth | BLOCKED as active truth | No installer/template path used for repo evidence; form templates loaded only because mandatory workflow sources required them. |
| Recovered_* is not active truth | BLOCKED as active truth | No Recovered_* path was read, hashed, diffed, or cited as source evidence. |

## No Global Ready Verdict

no_global_ready_verdict: true

This report intentionally does not state a global ready/not-ready verdict. It records surface-specific evidence only.
