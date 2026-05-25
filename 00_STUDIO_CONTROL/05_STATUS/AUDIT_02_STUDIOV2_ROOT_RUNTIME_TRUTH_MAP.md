# AUDIT-02 StudioV2 Root Runtime Truth Map

record_type: read_only_root_runtime_truth_audit_report
task_id: AUDIT-02-STUDIOV2-ROOT-RUNTIME-TRUTH-MAP
created_by: codex
created_at: 2026-05-23
status: DOCUMENTED_ONLY
intended_surface: artifacts_runtime_outputs
actual_destination: C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md
generated_report_is_not_canonical_truth: true
claim_posture: NO_CLAIM_ALLOWED
human_gate_required: true
no_global_ready_verdict: true

## Preflight

| Item | Status | Evidence |
| --- | --- | --- |
| Current directory | PASSIVE | `Get-Location` returned `C:\TACTICAL_CHESS_STUDIO`. |
| Branch | PASSIVE | `git status --short --branch` returned `## master...origin/master`. |
| HEAD | PASSIVE | `git rev-parse HEAD` returned `d0ace5ba466ad4e3b07b4cde20dd237ca0a0a248`. |
| Remote | PASSIVE | `git remote -v` returned `origin https://github.com/pierrelouisfradcourt-create/TACTICAL_CHESS_STUDIO.git` for fetch and push. |
| Worktree before report creation | PASSIVE | Pre-write status showed one pre-existing untracked file: `00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md`. |
| Sandbox state | BLOCKED | Initial sandboxed PowerShell preflight failed with `windows sandbox: setup refresh failed`; read-only commands were rerun with escalation. |
| Runtime identifier | BLOCKED | Exact Codex runtime identifier was not exposed. Per task rule: `actual_runtime: UNKNOWN`; `runtime_status: BLOCKED`; no exact model claim is made. |

Pre-existing changes before this report:

- `?? 00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md`

## Source State

Core rule applied:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

| Source | Created | Registered | Loaded | Enforced | Evidenced | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AGENTS.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded first; defines reporting, Git safety, runtime doctrine, validation, and claim boundary. |
| `README.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded; confirms source/test/artifact/docs/inference separation and Search/Neural doctrine. |
| `MASTER_DOCS/DOCS_STATUS.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded; classifies DecisionController, SearchBackend, LegalAction/ActionId, and NeuralPolicyValue as passive or docs-only. |
| `MASTER_DOCS/00_EXEC_SUMMARY.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded; gives high-level runtime/lab/tooling posture and non-claim boundaries. |
| `MASTER_DOCS/01_CURRENT_STATE.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded; records current local split, AM stack boundaries, engine status, benchmark artifact posture, and blocked claims. |
| `MASTER_DOCS/03_KNOWN_ISSUES.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded; current risk register. |
| `MASTER_DOCS/05_ARCHITECTURE.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded; runtime split and architecture boundary. |
| `docs/gpt-navigator/*` required files | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded prompt gate, repo notice, source index, and upload checklist. |
| `00_STUDIO_CONTROL/05_STATUS/CURRENT_TRUTH_MAP_V0.md` | DOCUMENTED_ONLY | UNKNOWN | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded before conclusions as required. |
| `00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md` | DOCUMENTED_ONLY | UNKNOWN | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded before conclusions as required; file is pre-existing untracked local evidence. |
| `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded; routes status reports to `05_STATUS` and marks generated reports passive by default. |
| `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded; source-state chain enforced. |
| `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded; controlled status/surface vocabulary enforced. |
| `00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded. |
| `00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | DOCUMENTED_ONLY | Loaded. |
| This report | IMPLEMENTED | BLOCKED | DOCUMENTED_ONLY after readback | DOCUMENTED_ONLY | DOCUMENTED_ONLY after validation | Created as one routed passive audit report only; not registered or canonical unless HumanGate promotes it later. |

## Route Check

| Check | Status | Evidence |
| --- | --- | --- |
| Output routing required | DOCUMENTED_ONLY | Task declares a single routed report output. |
| Output routing present | DOCUMENTED_ONLY | Target route declared as `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md`. |
| Destination allowed | DOCUMENTED_ONLY | `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` routes status reports to `00_STUDIO_CONTROL/05_STATUS`. |
| Destination existed before write | NOT_FOUND | `Test-Path` for the AUDIT-02 target returned `False`. |
| Route collision check | NOT_FOUND | Bounded `05_STATUS` name check found no existing `AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP`. |
| Forbidden destinations avoided | IMPLEMENTED | No output was written to root, `src`, `tests`, `lab`, `latest.json`, `lab/runs/RUN_*`, `secrets`, dataset, model, or checkpoint paths. |
| Registration required | PASSIVE | Task declares registration not required. |
| Promotion gate | DOCUMENTED_ONLY | HumanGate. |

## Output Routing Result

| Field | Value |
| --- | --- |
| produced_file_type | read_only_root_runtime_truth_audit_report |
| intended_surface | artifacts_runtime_outputs |
| canonical_destination | NONE |
| temporary_destination | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md |
| actual_destination | C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md |
| retention_policy | temporary passive audit evidence, not canonical truth |
| promotion_gate | HumanGate |
| output_routing_result | IMPLEMENTED |

## Root Truth Summary

`C:/TACTICAL_CHESS_STUDIO` is the active inspected root for this audit. The old nested roots `repos/games/studioV2` and `repos/games/TacticalChessPureLab` were not found. `repos/games/studioV2_MIGRATED_HOLD` exists and is classified as PASSIVE migrated material.

The active codebase is a Rust chess/tactical runtime with Python ML, inference, and tooling surfaces. Rust source files exist under `src`; Python ML/tooling exists under `ml`; control-plane and studioV2 automation tooling exists under `scripts`, `scripts/studioV2`, and `scripts/studioV2/control_plane`; schemas exist under `schemas`; passive lab artifacts exist under `lab`; local heavy/passive assets exist under `datasets`, `models`, `runs`, `outputs`, and ignored folders.

No runtime code, tests, lab assets, datasets, models, checkpoints, secrets, Git state, branches, commits, pushes, PRs, training, benchmarks, runtime execution, or `latest.json` were modified or created by this task.

## C4 Text Map

### Context

| System | Status | Description |
| --- | --- | --- |
| Fused StudioV2 root | PASSIVE | Current filesystem/Git root at `C:/TACTICAL_CHESS_STUDIO`. |
| Rust runtime | IMPLEMENTED/PASSIVE | Source files exist in `src`; this audit inventories only and does not validate runtime behavior. |
| Python ML/inference/tooling | PASSIVE | Files exist in `ml`; no training, inference, or tooling execution occurred. |
| Lab/artifact plane | PASSIVE | `lab`, `outputs`, `runs`, `datasets`, and `models` contain passive/local outputs or assets unless separately promoted. |
| Studio Control | DOCUMENTED_ONLY/PASSIVE | `00_STUDIO_CONTROL` contains local control docs, routing, templates, roadmaps, registries, and passive status reports. |
| GPT Navigator | DOCUMENTED_ONLY | Repo-local navigator docs loaded; source anchors classify prompt generation and source upload rules. |
| HumanGate | DOCUMENTED_ONLY | Final authority for activation, promotion, merge, reject, freeze, Git actions, datasets, models, and claims. |

### Containers

| Container | Status | Role |
| --- | --- | --- |
| `src` | IMPLEMENTED/PASSIVE | Rust runtime, chess engine, search, neural bridge caller, simulation, tournament, telemetry, core identity/mask/admission helpers. |
| `tests` | IMPLEMENTED/PASSIVE | Rust integration tests and Python tests/fixtures; commands identified but not run. |
| `ml` | PASSIVE | Dataset loading/admission, training, model, inference, adaptive dataset, experiment and lab UI tooling. |
| `scripts` | PASSIVE | StudioV2 tooling, control-plane dry-runs, validators, orchestration, operator scripts, hygiene checks. |
| `schemas` | PASSIVE | JSON schemas for control-plane, StudioPilot, state, decisions, agents, audit events, and authorization packets. |
| `docs` and `MASTER_DOCS` | DOCUMENTED_ONLY/PASSIVE | Canonical docs, reference docs, roadmap docs, evidence protocols, and archived docs. |
| `00_STUDIO_CONTROL` | DOCUMENTED_ONLY/PASSIVE | Local control-room topology, forms, boundaries, status, roadmap, registries, and passive reports. |
| `lab` | PASSIVE | Reports, gameplay observations, datasets, reverse dataset, telemetry, tournaments, and local lab outputs. |
| `datasets`, `models`, `runs`, `outputs` | PASSIVE | Ignored/local heavy or generated surfaces; not inspected deeply and not promoted. |
| `secrets` | BLOCKED | Path exists; contents were not listed or read. |
| `repos/games/studioV2_MIGRATED_HOLD` | PASSIVE | Migrated hold material only; not active root truth. |

### Components

| Component | Status | Evidence |
| --- | --- | --- |
| Runtime entrypoint | IMPLEMENTED/PASSIVE | `Cargo.toml`, `src/main.rs`; commands route through `tool::cli::run_cli`, with special `teacher_uci` path. |
| Public Rust library surface | IMPLEMENTED/PASSIVE | `src/lib.rs` exports `ai`, `core`, and `env`. |
| Engine/world/rules/state/action | IMPLEMENTED/PASSIVE | `src/engine/*`, `src/rules/*`, `src/core/*`, `src/env/*`, `src/prototype/*`. |
| Chess engine and rules | IMPLEMENTED/PASSIVE | `src/chess/*`, `src/engine/engine.rs`, `src/chess/fen.rs`, `src/chess/legal_action_adapter.rs`. |
| Search | IMPLEMENTED/PASSIVE | `src/chess/search.rs`, `src/chess/search_backend_adapter.rs`, `src/ai/search_backend.rs`; Search remains final authority by doctrine/docs. |
| Decision routing | IMPLEMENTED/PASSIVE | `src/chess/decision.rs`, `src/ai/decision_controller.rs`, `src/chess/decision_controller_adapter.rs`; DecisionController remains passive unless HumanGate activates. |
| Neural bridge and rerank | IMPLEMENTED/PASSIVE | `src/agents/neural_*`, `ml/infer_policy.py`; neural proposes/reranks and does not decide alone by doctrine. |
| Simulation/tournament | IMPLEMENTED/PASSIVE | `src/simulation/*`, `src/tournament/*`. |
| ML/dataset/training | PASSIVE | `ml/dataset_loader.py`, `ml/train.py`, `ml/infer_policy.py`, `ml/move_vocab.py`, adaptive dataset tooling; no training or inference run. |
| Studio control-plane tooling | PASSIVE | `scripts/studioV2/control_plane/*`, `scripts/control_plane/*`, schemas, fixtures, dry-run scripts. |
| Rocky/control-plane docs | DOCUMENTED_ONLY/PASSIVE | `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`, `docs/control-plane/ROCKY_*`, `ENGINE_SEARCH_NEURAL_*`. |

### Code Files

Representative active/runtime source files observed:

- `src/main.rs`, `src/lib.rs`, `Cargo.toml`
- `src/engine/engine.rs`, `src/engine/action/*`, `src/engine/board/*`, `src/engine/entity/*`, `src/engine/event/*`, `src/engine/turn/*`
- `src/chess/search.rs`, `src/chess/decision.rs`, `src/chess/root_decision.rs`, `src/chess/fen.rs`, `src/chess/practical_policy.rs`, `src/chess/legal_action_adapter.rs`, `src/chess/chess960.rs`, `src/chess/chess_variant.rs`
- `src/chess/search_backend_adapter.rs`, `src/chess/decision_controller_adapter.rs`, `src/chess/cost_search_observability.rs`, `src/chess/search_diagnostics*.rs`
- `src/agents/neural_agent.rs`, `src/agents/neural_bridge.rs`, `src/agents/neural_protocol.rs`, `src/agents/neural_selection.rs`, `src/agents/neural_legal.rs`, `src/agents/neural_fallback.rs`, `src/agents/neural_telemetry.rs`
- `src/core/action_id.rs`, `src/core/legal_action.rs`, `src/core/action_mask.rs`, `src/core/action_mask_provenance.rs`, `src/core/human_gate.rs`, `src/core/dataset_admission.rs`
- `src/ai/search_backend.rs`, `src/ai/decision_controller.rs`, `src/ai/policy_guide.rs`
- `src/simulation/*`, `src/tournament/*`, `src/tool/*`, `src/telemetry/*`

## Active Runtime Code Inventory

| Surface | Status | Inventory |
| --- | --- | --- |
| Rust manifest | IMPLEMENTED/PASSIVE | `Cargo.toml` package `tactical_chess_pure_lab`, edition 2021, dependencies `uuid`, `serde`, `serde_json`, `rand`. |
| Runtime entrypoint | IMPLEMENTED/PASSIVE | `src/main.rs` declares modules and CLI/teacher UCI entrypoint. |
| Engine/world/state/action | IMPLEMENTED/PASSIVE | `src/engine/engine.rs`, board/entity/event/turn/action modules, `src/rules`, `src/prototype`, `src/env`. |
| Chess runtime | IMPLEMENTED/PASSIVE | Chess-specific move legality, FEN, search, decision, legal action adapter, transition analysis, opponent response masks, practical policy, castling spec. |
| Search | IMPLEMENTED/PASSIVE | `search_best_action`, `search_root`, `search_root_with_context`, negamax, quiescence, transposition/killer/history references found in `src/chess/search.rs`; not executed. |
| Decision authority route | IMPLEMENTED/PASSIVE | `src/chess/decision.rs` routes Search-authority modes through `search_authority_trace(...)` and `search_root_via_adapter(...)` per targeted text search. |
| Neural bridge | IMPLEMENTED/PASSIVE | Rust neural agent/bridge/protocol/selection files and Python `ml/infer_policy.py` exist; no inference run. |
| Core identity/mask/HumanGate | IMPLEMENTED/PASSIVE | `ActionId`, `LegalAction`, `ActionMask`, `ActionMaskProvenance`, `HumanGateAuthorization` definitions found in `src/core`. |
| Chess960 surfaces | IMPLEMENTED/PASSIVE/BLOCKED activation | `src/chess/chess960.rs`, `src/chess/chess_variant.rs`, and FEN fail-closed tests/logic exist; activation remains BLOCKED. |

## Tests Inventory

| Test surface | Status | Inventory |
| --- | --- | --- |
| Rust integration tests | PASSIVE | `tests/*.rs` includes action mask/provenance, dataset admission, decision authority, decision controller boundary, deterministic engine, legal action adapter, neural boundary, observation boundary, search backend boundary, tactical env, telemetry prep. |
| Python tests | PASSIVE | `tests/test_*.py` includes dataset admission, dataset router bypass, move vocab parity, Rust-generated legal-action sample parity, prompt/report hygiene, train fail-closed, workspace hygiene. |
| Test fixtures | PASSIVE | `tests/fixtures/*.json`, `*.jsonl`. |
| In-source Rust tests | PASSIVE | Targeted text search found tests inside `src/engine/engine.rs`, `src/chess/search.rs`, `src/agents/neural_*`, and other modules. |
| Commands identified, not run | BLOCKED | Likely commands include `cargo test`, Python test invocations through `.\.venv312\Scripts\python.exe`, and control-plane validation scripts; all execution was forbidden in this audit. |

## Artifacts Runtime Outputs Inventory

| Path/surface | Status | Inventory |
| --- | --- | --- |
| `lab/reports` | PASSIVE | Observed `.gitkeep`, `latest_benchmark_summary.json`, `conversion_suite_v1_latest.*`, `learning_progress.json`, `search_profile_latest.json`, `puzzle_eval_latest.*`, and conversion audit outputs. |
| `lab/gameplay_observation` | PASSIVE | Many PR-named observation/status reports and examples; non-canonical unless promoted. |
| `lab/runs` | PASSIVE | Shallow listing showed `.gitkeep`; no new run folder created. |
| `outputs` | PASSIVE | Shallow listing showed `git_bundles`, `security_audit`, `security_pack`. |
| `runs` | PASSIVE | Shallow listing showed `bootstrap`, `chess`, `ci_observation`, `cyberdefense`. |
| `target`, `.pytest_cache`, `.venv`, `.studio_state`, `tmp` | PASSIVE | Local/runtime/cache state; not source truth. |
| This report | IMPLEMENTED | Single routed report created under `00_STUDIO_CONTROL/05_STATUS`. |

## Canonical Docs Inventory

| Surface | Status | Inventory |
| --- | --- | --- |
| Root doctrine | DOCUMENTED_ONLY | `AGENTS.md`, `README.md`. |
| Master docs | DOCUMENTED_ONLY | Required `MASTER_DOCS/DOCS_STATUS.md`, `00_EXEC_SUMMARY.md`, `01_CURRENT_STATE.md`, `03_KNOWN_ISSUES.md`, `05_ARCHITECTURE.md`; additional master docs and archives observed. |
| GPT Navigator | DOCUMENTED_ONLY | `docs/gpt-navigator/GPT_NAVIGATOR_*`. |
| Control plane docs | DOCUMENTED_ONLY/PASSIVE | `docs/control-plane/*`, including StudioPilot, governance, Rocky, Chess960, engine/search/neural, prompt/report hygiene, specialist roles, and fixtures. |
| Evidence docs | DOCUMENTED_ONLY/PASSIVE | `docs/evidence/*`, including Rocky trace format and ActionMask/HumanGate evidence contracts. |
| Studio Control | DOCUMENTED_ONLY/PASSIVE | `00_STUDIO_CONTROL/00_INDEX` through `13_BOOTSTRAP_PROFILES`. |

## Roadmap Docs-Only Inventory

| Surface | Status | Inventory |
| --- | --- | --- |
| `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md` | DOCUMENTED_ONLY | Roadmap/architecture direction only. |
| `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md` | DOCUMENTED_ONLY | Roadmap plan; does not activate runtime routes. |
| `MASTER_DOCS/02_ROADMAP_90D.md` | DOCUMENTED_ONLY | Roadmap. |
| `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md` | DOCUMENTED_ONLY | Variant freeze planning/status. |
| `docs/control-plane/ENGINE_SEARCH_NEURAL_*` | DOCUMENTED_ONLY/PASSIVE | PP9-PP19 decomposition, inventory, split, and fusion docs; no active runtime mutation by themselves. |
| `docs/control-plane/ROCKY_*` | DOCUMENTED_ONLY/PASSIVE | Rocky observability/error-to-puzzle docs; no runtime authority or claim authority. |
| `00_STUDIO_CONTROL/10_ROADMAP` | DOCUMENTED_ONLY/PASSIVE | UxPilote, Godot garden, model/dataset/script names-only audits, future plans; prototype candidates remain non-active. |

## Inference Inventory

| Surface | Status | Inventory |
| --- | --- | --- |
| Rust neural caller | PASSIVE | `src/agents/neural_agent.rs` and split helper modules exist; no active authority claim. |
| Python inference | PASSIVE | `ml/infer_policy.py` exists; no inference run. |
| Retrieval/adaptive hints | PASSIVE | `src/agents/retrieval.rs`, `ml/adaptive_dataset.py`, reverse dataset/lab memory surfaces exist; not proof of improvement. |
| Model-assisted reports | PASSIVE | Lab reports, generated reports, and local analyses remain passive observations. |

## Lab Inventory

| Lab path | Status | Classification |
| --- | --- | --- |
| `lab/dataset`, `lab/datasets`, `lab/reverse_dataset` | PASSIVE | Data/lab surfaces only; no dataset generation, reset, promotion, or validation run occurred. |
| `lab/reports` | PASSIVE | Observation/report artifacts; not benchmark proof, strength proof, or claim evidence. |
| `lab/gameplay_observation` | PASSIVE | Sandbox/non-canonical observation reports and examples. |
| `lab/telemetry`, `lab/tournaments`, `lab/experiments`, `lab/suites` | PASSIVE | Runtime/lab outputs or fixtures; not promoted by this audit. |
| `lab/agent_*`, `lab/decision_packets`, `lab/runtime_dry_run` | PASSIVE | Control-plane/agent/dry-run artifacts; no agent activation. |

## Schemas Inventory

| Path | Status | Inventory |
| --- | --- | --- |
| `schemas/*.schema.json` | PASSIVE | Agent profile/scorecard, audit event, authorization plan, block/freeze/forbidden surfaces, Studio state, StudioPilot packets/reviews/decisions/execution/director reports, HumanGate decisions, learning events, operator inbox, task packets, permission matrix, reward log, strike rules. |
| `docs/control-plane/fixtures/*` | PASSIVE | Fixture data for control-plane schema/dry-run validation; not runtime proof. |

## Scripts Tooling Inventory

| Path | Status | Inventory |
| --- | --- | --- |
| `scripts/studioV2` | PASSIVE | Benchmark wrappers, conversion suite builders/runners, claim gate checks, orchestration/status/report tools, local agent scripts, PR/operator tooling, workspace hygiene. |
| `scripts/studioV2/control_plane` | PASSIVE | Dry-run state delta, HumanGate decision candidate, inbox/mission/action-plan compilers, validators, StudioPilot loop smoke, in-memory loop test, prompt rendering/handoff tools. |
| `scripts/control_plane` | PASSIVE | Compatibility/top-level control-plane smoke and hygiene validators. |
| `tools` | PASSIVE/BLOCKED for execution | Local recovery/admin/security scripts are ignored by `.gitignore`; names observed only, not executed. |
| `.github/workflows` | PASSIVE | CI/operator workflow files observed; not triggered. |
| `.cargo/config.toml` | PASSIVE | Cargo config file exists; not executed. |

## Models Datasets Inventory

| Path | Status | Inventory |
| --- | --- | --- |
| `datasets` | PASSIVE | Shallow names: `blocked_future_sensitive`, `chess`, `cyberdefense`, `quarantine`, `tactical_core`, `telemetry_sanitized`; contents not parsed. |
| `models` | PASSIVE | Shallow names: `chess`, `lmstudio`, `quarantine`; contents not loaded. |
| `.gitignore` | PASSIVE | Ignores `datasets/`, `models/`, `runs/`, `secrets/`, `target/`, `.venv/`, `tmp/`, selected outputs, and `tools/`. |
| Promotion status | BLOCKED | No model/dataset promotion evidence was created or validated. |

## Secrets Boundary Status

| Item | Status | Evidence |
| --- | --- | --- |
| `secrets` path | BLOCKED | `Test-Path .\secrets` returned `True`; contents were not listed or read. |
| Secret patterns | BLOCKED | `.gitignore` excludes `.env`, key/cert patterns, and `secrets/`. |
| Inspection | BLOCKED | No secret content inspection occurred. |

## Stale Or Passive Paths

| Path/reference | Status | Treatment |
| --- | --- | --- |
| `C:/TACTICAL_CHESS_STUDIO/repos/games/studioV2` | NOT_FOUND | Stale for active-root decisions. |
| `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab` | NOT_FOUND | Stale for active-root decisions; some source-anchoring docs still name this path. |
| `C:/TACTICAL_CHESS_STUDIO/repos/games/studioV2_MIGRATED_HOLD` | PASSIVE | Migrated hold only. |
| `MASTER_DOCS/ARCHIVE/*` | PASSIVE | Historical/archive context only. |
| `LOCAL_ARCHIVE/*` references in docs | PASSIVE | Local-history only unless live path and promotion are separately verified. |
| `00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY` | PASSIVE | Legacy opening pipeline traceability only. |
| `lab/*`, `outputs/*`, `runs/*` | PASSIVE | Runtime/lab/generated outputs by default. |
| UxPilote prototype/Godot candidate paths | PASSIVE/DOCUMENTED_ONLY | Roadmap/prototype candidates, not active runtime or agent activation. |

## Doc Vs Code Drift

| Drift | Status | Evidence / impact |
| --- | --- | --- |
| Source anchoring names old repo-local `repos/games/TacticalChessPureLab` paths | DOCUMENTED_ONLY / NOT_FOUND | Current root has `AGENTS.md` and `docs/gpt-navigator/*`; old nested path was not found. Requires source-index/routing reconciliation before treating old anchors as current active paths. |
| Routing policy says repo docs/source indexes stay inside `repos/games/TacticalChessPureLab` | DOCUMENTED_ONLY / STALE_FOR_CURRENT_ROOT | Current active root has repo docs at root-level `docs` and `MASTER_DOCS`; old nested repo path absent. |
| `src/main.rs` contains historical hardcoded Stockfish candidate paths under `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab` | IMPLEMENTED / PASSIVE | Code fallback path may be stale for current root; not modified or executed. |
| README VLEF command examples mention `.\.venv\Scripts\python.exe`, while AGENTS requires `.\.venv312\Scripts\python.exe` | DOCUMENTED_ONLY / UNKNOWN | Potential Windows execution-doc drift; no Python command was run. |
| Docs report prior TESTED statuses | PASSIVE | This audit did not rerun tests. Prior reports/logs were not upgraded to current TESTED evidence. |

## Blocked Activation Claims

| Claim/action | Status |
| --- | --- |
| Runtime activation | BLOCKED |
| Agent activation | BLOCKED |
| Chess960 activation | BLOCKED |
| DecisionController activation | BLOCKED |
| SearchBackend active replacement | BLOCKED |
| Neural final authority | BLOCKED |
| Training | BLOCKED |
| Benchmark proof | BLOCKED |
| Dataset generation/reset/promotion | BLOCKED |
| Model/checkpoint creation or promotion | BLOCKED |
| `latest.json` creation | BLOCKED |
| `lab/runs/RUN_*` creation | BLOCKED |
| Elo, strength, scientific, promotion, or readiness claim | BLOCKED |

## Chess AI Truth Table

| Surface | Status | Evidence |
| --- | --- | --- |
| Classical chess runtime | IMPLEMENTED/PASSIVE | `src/engine/engine.rs`, `src/chess/*`; legality/castling/en-passant/fifty-move/threefold/insufficient-material references found. |
| Legal actions | IMPLEMENTED/PASSIVE | `src/engine/engine.rs` legal action functions and `src/chess/legal_action_adapter.rs`; tests exist but not run. |
| ActionId | IMPLEMENTED/PASSIVE | `src/core/action_id.rs` found. Dataset authority remains BLOCKED. |
| LegalAction | IMPLEMENTED/PASSIVE | `src/core/legal_action.rs` and adapter found. Full common route status not proven by this audit. |
| ActionMask | IMPLEMENTED/PASSIVE | `src/core/action_mask.rs` found. Not search authority; dataset authority BLOCKED. |
| ActionMask provenance | IMPLEMENTED/PASSIVE | `src/core/action_mask_provenance.rs` found. Dataset sufficiency not proven. |
| HumanGate metadata | IMPLEMENTED/PASSIVE | `src/core/human_gate.rs` found; promotion authority remains HumanGate-only. |
| Bots/agents | IMPLEMENTED/PASSIVE | `src/agents/random_agent.rs`, `heuristic_agent.rs`, `uci_agent.rs`, `neural_agent.rs`; no agent activation. |
| Simulation/selfplay/tournament | IMPLEMENTED/PASSIVE | `src/simulation/*`, `src/tournament/*`; not run. |
| Replay | UNKNOWN/PASSIVE | No dedicated active replay route was validated; only simulation/output/report surfaces observed. |
| Validation harness | PASSIVE | Tests and control-plane validators exist; none run. |
| Chess960 | IMPLEMENTED/PASSIVE with activation BLOCKED | `src/chess/chess960.rs`, `src/chess/chess_variant.rs`, prototype ruleset and docs exist; FEN contract remains fail-closed/gated. |

## Engine Rocky Search Neural Truth Table

| Surface | Status | Evidence |
| --- | --- | --- |
| Engine | IMPLEMENTED/PASSIVE | `src/engine/engine.rs` and related engine modules exist; not executed. |
| Rocky docs | DOCUMENTED_ONLY/PASSIVE | Rocky docs and evidence protocols exist; no Rocky runtime proof or activation claim made. |
| Search final authority | DOCUMENTED_ONLY plus source-route evidence | README/AGENTS doctrine and targeted source search show `search_authority_trace(...)` to `search_root_via_adapter(...)`; no runtime execution. |
| SearchBackend | PASSIVE | `src/ai/search_backend.rs` and `src/chess/search_backend_adapter.rs` exist; docs say adapter boundary does not make SearchBackend a general active replacement. |
| DecisionController | PASSIVE | `src/ai/decision_controller.rs` and `src/chess/decision_controller_adapter.rs` exist; activation BLOCKED. |
| Neural proposal/rerank | PASSIVE | Rust neural modules and Python inference script exist; no final-authority claim and no inference run. |
| Fusion docs | DOCUMENTED_ONLY | `ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` and related docs exist; docs-only. |
| Observability | IMPLEMENTED/PASSIVE/DOCUMENTED_ONLY | `src/chess/cost_search_observability.rs`, search diagnostics modules, telemetry modules, and Rocky observability docs exist; no observability run. |

## Recommended Next Audit Or Patch Candidates

1. Reconcile current-root source anchoring: update or supersede old `repos/games/TacticalChessPureLab` references through a HumanGate docs task.
2. Do a narrow read-only audit of `src/main.rs` hardcoded Stockfish fallback paths and Windows Python interpreter guidance drift.
3. Run a future tests-only validation packet, if HumanGate authorizes it, separating Rust tests, Python tests, and control-plane validators.
4. Produce a registry coverage audit for `00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml` against current root paths.
5. Audit replay/gameplay-output terminology separately before claiming any replay surface exists.
6. Keep models/datasets names-only unless a separate HumanGate data-boundary task authorizes content inspection.

## Status By Surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Inventoried but not modified or executed. |
| tests | PASSIVE | Inventoried but not run or modified. |
| artifacts_runtime_outputs | IMPLEMENTED | Exactly one routed passive audit report was created. |
| canonical_docs | PASSIVE | Existing docs were read only. |
| roadmap_docs_only | PASSIVE | Existing roadmap/prototype material was observed only. |
| inference | PASSIVE | Neural/ML/inference surfaces were inventoried only; no inference run. |
| lab | PASSIVE | Lab outputs observed by names/shallow inventory only. |
| schemas | PASSIVE | Schema files inventoried only. |
| scripts_tooling | PASSIVE | Tooling files inventoried only; no script execution. |
| models_datasets | PASSIVE | Shallow names only; no content read, validation, generation, or promotion. |
| secrets | BLOCKED | Path existence checked; contents not inspected. |

## Files Changed

| Path | Surface | Change status | Operation | Summary |
| --- | --- | --- | --- | --- |
| `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md` | artifacts_runtime_outputs | IMPLEMENTED | create | Created exactly one routed passive audit report. |

## Commands Run

| Command | Purpose | Result |
| --- | --- | --- |
| `Get-Location` | Report current directory. | PASSIVE: returned `C:\TACTICAL_CHESS_STUDIO`. |
| `git status --short --branch` | Report branch/worktree and pre-existing changes. | PASSIVE: `## master...origin/master`; pre-existing `?? AUDIT_01...`. |
| `git rev-parse HEAD` | Report HEAD. | PASSIVE: `d0ace5ba466ad4e3b07b4cde20dd237ca0a0a248`. |
| `git remote -v` | Report remote. | PASSIVE: origin GitHub fetch/push URL. |
| `Get-Content -Raw` for required sources | Load required AGENTS, README, MASTER_DOCS, GPT Navigator, Studio Control, current truth map, AUDIT-01, routing, anchoring, contract, and templates. | DOCUMENTED_ONLY: readback succeeded. |
| `Get-ChildItem -Force -Name -Directory` and `-File` | Inventory top-level root. | PASSIVE: root topology observed. |
| `Test-Path` stale paths | Check old nested root paths and boundaries. | `repos/games/studioV2=False`; `repos/games/TacticalChessPureLab=False`; `studioV2_MIGRATED_HOLD=True`; `secrets=True`; `latest.json=False`. |
| `Get-ChildItem -Force -Name .\repos\games` | Inspect stale/migrated repo names. | PASSIVE: `ChessTCG`, `studioV2_MIGRATED_HOLD`. |
| `rg --files src` | Active Rust source inventory. | PASSIVE: runtime source files listed. |
| `rg --files tests` | Tests inventory. | PASSIVE: Rust/Python tests and fixtures listed. |
| `rg --files ml` | ML/inference/tooling inventory. | PASSIVE: ML files listed. |
| `rg --files scripts tools schemas .github .cargo` | Tooling/schema/workflow inventory. | PASSIVE: scripts, schemas, workflows listed. |
| `Get-ChildItem -Force -Name` for `lab`, `lab/reports`, `lab/gameplay_observation`, `lab/runs`, `datasets`, `models`, `runs`, `outputs` | Shallow artifact/model/dataset inventory. | PASSIVE: names observed only; no content inspection for datasets/models/secrets. |
| `rg -n` targeted searches | Identify ActionId, LegalAction, ActionMask, HumanGate, DecisionController, Chess960, SearchBackend, neural, Rocky, observability, validation, simulation, agent surfaces. | PASSIVE: matches observed in source, tests, docs, and scripts. |
| `Get-Content -Raw Cargo.toml src/lib.rs src/main.rs .gitignore` | Inspect manifest/module entrypoints and ignore boundaries. | PASSIVE: readback succeeded. |
| `rg --files docs... MASTER_DOCS`, `rg --files 00_STUDIO_CONTROL` | Bounded docs/control inventory. | PASSIVE: representative docs/control files listed. |
| `rg --files . -g '*latest.json' -g 'latest.json' -g '!secrets/**' -g '!target/**'` | Check latest manifest-like files excluding secrets/build output. | PASSIVE: found `*_latest.json` report files, not root `latest.json`. |
| `rg --files . -g 'RUN_*' -g '!secrets/**' -g '!target/**'` | Check RUN_* names excluding secrets/build output. | PASSIVE: found docs/contract filenames only; no new `lab/runs/RUN_*` created. |
| `Test-Path` target report and bounded `05_STATUS` collision check | Route pre-write validation. | NOT_FOUND: target did not exist before write. |
| `Get-Content -Raw .../AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md` | Read back created report. | DOCUMENTED_ONLY: full readback succeeded. |
| `git diff --check` | Docs-only whitespace validation. | DOCUMENTED_ONLY: returned no output. |
| `git status --short --branch` | Final changed-file check. | PASSIVE: final status showed pre-existing `AUDIT_01...` plus new `AUDIT_02...`. |

## Skipped Validation

| Validation item | Surface | Status | Reason |
| --- | --- | --- | --- |
| `cargo test` | tests | BLOCKED | Runtime/test execution explicitly forbidden. |
| `pytest` / Python tests | tests | BLOCKED | Test execution explicitly forbidden. |
| Runtime commands / gameplay | active_runtime_code | BLOCKED | Runtime execution explicitly forbidden. |
| Benchmarks | artifacts_runtime_outputs | BLOCKED | Benchmarking explicitly forbidden and not proof. |
| Training/inference | inference | BLOCKED | Training and runtime inference explicitly forbidden. |
| Dataset generation/reset/validation | models_datasets | BLOCKED | Dataset mutation/validation explicitly forbidden. |
| Model/checkpoint loading or creation | models_datasets | BLOCKED | Model/checkpoint actions explicitly forbidden. |
| Secret inspection | secrets | BLOCKED | Only path existence was checked. |
| Git branch/commit/push/PR | canonical_docs | BLOCKED | Git mutations explicitly forbidden. |

## Risks

| Risk | Surface | Status | Mitigation |
| --- | --- | --- | --- |
| Old nested repo paths remain in some control docs | canonical_docs | DOCUMENTED_ONLY / NOT_FOUND | Treat as stale until HumanGate authorizes path reconciliation. |
| Prior TESTED claims in docs may be stale for current HEAD | tests | PASSIVE | This audit does not upgrade prior reports to current TESTED evidence. |
| Lab reports and benchmark summaries may be mistaken for proof | artifacts_runtime_outputs | BLOCKED | Classified PASSIVE; claim verdict remains NO_CLAIM_ALLOWED. |
| Model/dataset directories exist but contents were not inspected | models_datasets | UNKNOWN/PASSIVE | Names-only classification; future data-boundary task required for content work. |
| Secret path exists | secrets | BLOCKED | No content inspection. |
| Source inventories are broad but non-executing | active_runtime_code | PASSIVE | Active behavior requires future targeted validation. |

## Validation

| Validation item | Status | Evidence |
| --- | --- | --- |
| Report readback | DOCUMENTED_ONLY | `Get-Content -Raw` readback of this report succeeded. |
| Docs-only diff check | DOCUMENTED_ONLY | `git diff --check` returned no output. |
| Final file-change check | PASSIVE | `git status --short --branch` showed only pre-existing `AUDIT_01...` and new `AUDIT_02...` as untracked files. |

## Verdicts

software_verdict:

| Surface | Status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | IMPLEMENTED |
| canonical_docs | PASSIVE |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |
| lab | PASSIVE |
| schemas | PASSIVE |
| scripts_tooling | PASSIVE |
| models_datasets | PASSIVE |
| secrets | BLOCKED |

evidence_verdict:

| Surface | Status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | DOCUMENTED_ONLY |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |
| lab | PASSIVE |
| schemas | PASSIVE |
| scripts_tooling | PASSIVE |
| models_datasets | PASSIVE |
| secrets | BLOCKED |

claim_verdict:

| Surface | Status |
| --- | --- |
| active_runtime_code | NO_CLAIM_ALLOWED |
| tests | NO_CLAIM_ALLOWED |
| artifacts_runtime_outputs | NO_CLAIM_ALLOWED |
| canonical_docs | NO_CLAIM_ALLOWED |
| roadmap_docs_only | NO_CLAIM_ALLOWED |
| inference | NO_CLAIM_ALLOWED |
| lab | NO_CLAIM_ALLOWED |
| schemas | NO_CLAIM_ALLOWED |
| scripts_tooling | NO_CLAIM_ALLOWED |
| models_datasets | NO_CLAIM_ALLOWED |
| secrets | NO_CLAIM_ALLOWED |

No global ready or not-ready verdict is made.
