# NEURAL_AGENT_CALLGRAPH_AUDIT_V0

## purpose

Read-only static audit of NeuralAgent references and neural decision paths, with focus on whether Neural remains proposal/rerank/helper only through the inspected current decision route and whether any surface suggests authority drift.

This report is a local status record only. It is not registration, loading, enforcement, promotion, readiness, benchmark proof, model proof, or runtime activation.

## preflight

- current_directory: `C:\TACTICAL_CHESS_STUDIO`
- branch: `master`
- HEAD: `5e48ed310a5047eb21bd4825da858e3a08e0c950`
- initial_worktree_status: dirty before this report
- pre_existing_changes_observed:
  - `?? 00_STUDIO_CONTROL/05_STATUS/AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md`
  - `?? 00_STUDIO_CONTROL/05_STATUS/AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md`
  - `?? 00_STUDIO_CONTROL/05_STATUS/AUDIT_03_STUDIO_DEV_WORKBENCH_UXPILOTE_REQUIREMENTS.md`
  - `?? 00_STUDIO_CONTROL/05_STATUS/AUDIT_04_STUDIOCTL_PHASE1_TASK_CHARTER.md`
  - `?? 00_STUDIO_CONTROL/05_STATUS/DRY_RUN_UXPILOTE_READ_ONLY_PIPELINE_V0.yaml`
  - `?? 00_STUDIO_CONTROL/05_STATUS/ENGINE_ROCKY_BOUNDARY_AUDIT_V0.md`
  - `?? 00_STUDIO_CONTROL/05_STATUS/LOCAL_LOGISTIC_AGENT_PIPELINE_CLOSURE_STATUS_V0.md`
  - `?? 00_STUDIO_CONTROL/05_STATUS/PIPELINE_FORMS_INTEGRATION_AUDIT_V0.md`
  - `?? 00_STUDIO_CONTROL/05_STATUS/PIPELINE_FORMS_REGISTRATION_READINESS_AUDIT_V0.md`
  - `?? 00_STUDIO_CONTROL/05_STATUS/UXPILOTE_READ_ONLY_PROTOTYPE_REPORT_V0.md`
  - `?? scripts/uxpilote/`
- runtime_execution: skipped, blocked by audit scope
- test_execution: skipped, blocked by audit scope
- secrets: not inspected
- git_mutation: no stage, unstage, restore, reset, commit, push, branch, or PR

## source_state

- `AGENTS.md`: read; doctrine requires Search final authority, Neural proposal/rerank posture, HumanGate for claims, and separate software/evidence/claim verdicts.
- `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`: read; status reports route to `00_STUDIO_CONTROL/05_STATUS` and remain passive until HumanGate.
- `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md`: read; created, registered, loaded, enforced, and evidenced are distinct states.
- requested `07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md`: NOT_FOUND at requested path.
- fallback `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md`: read; path correction applied and recorded.
- `00_STUDIO_CONTROL/05_STATUS/ENGINE_ROCKY_BOUNDARY_AUDIT_V0.md`: read; untracked prior audit used as passive status evidence only.
- optional control/docs sources read:
  - `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md`
  - `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md`
  - `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md`
  - `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`

Source anchoring status for this report:

- created: yes
- registered: no
- loaded: no
- enforced: no
- evidenced: static readback and git diff checks only

## route_check

- produced_file_type: read-only NeuralAgent call graph audit report
- intended_surface: canonical_docs/status report lane
- routed_destination: `00_STUDIO_CONTROL/05_STATUS/NEURAL_AGENT_CALLGRAPH_AUDIT_V0.md`
- registration_required: false
- project_source_upload_required: false
- promotion_gate: HumanGate
- route_status: DOCUMENTED_ONLY

The output routing policy marks status reports as passive local records unless a HumanGate action later tracks, registers, loads, or promotes them.

## search_method

- Attempted required `rg` search for `NeuralAgent|neural_agent|Neural|policy|rerank|propose|proposal|decision|Search|DecisionController`; `rg` was not available in this shell.
- Used static fallback searches with `git grep` and selected `Select-String`/`Get-Content` reads over non-secret text/source paths.
- Searched source, tests, docs, status/control docs, and scripts paths that were in audit scope.
- Did not read secrets, `.env` files, model/checkpoint binaries, dataset payloads, or runtime output payloads.
- Did not execute runtime/gameplay, benchmark, training, cargo test, or pytest.

## NeuralAgent definition

Status: IMPLEMENTED, active runtime code surface.

Evidence:

- `src/agents/mod.rs` exports `pub mod neural_agent;`.
- `src/agents/neural_agent.rs` defines `pub struct NeuralAgent`.
- `src/agents/neural_agent.rs` defines `pub fn select_action(&self, engine: &Engine, _player: u32, actions: &[Action]) -> Action`.
- `src/agents/neural_agent.rs` contains Python bridge and rerank/helper surfaces, including `query_python` and `select_move_with_rerank`.
- `src/agents/neural_agent.rs` exposes runtime telemetry and identity helpers such as `name() -> "neural"`.

Boundary classification:

- `NeuralAgent::select_action` is a callable final-selection function within the NeuralAgent module because it returns an `Action`.
- That fact is not the same as current top-level tactical authority. Current inspected decision routing does not call this function from `DecisionMode::Neural`.

## runtime references

Status: IMPLEMENTED, mixed authority surfaces.

Evidence:

- `src/chess/decision.rs` defines `DecisionMode::Neural`.
- `src/chess/decision.rs` routes `DecisionMode::Neural` through `search_authority_trace(...)`.
- `search_authority_trace(...)` calls `search_root_via_adapter(...)` and returns a `DecisionTrace` with:
  - `selected_action: root_search.best_action.clone()`
  - `selection_authority: SelectionAuthority::Search`
  - `used_search: true`
  - `root_search: Some(root_search)`
- `src/chess/decision.rs` does not import `NeuralAgent` in the inspected current source.
- `src/ai/policy_guide.rs` defines `NeuralProposal` and passive policy guide helpers. It reports:
  - `can_drive_runtime() == false`
  - `is_final_authority() == false`
  - `requires_search_authority() == true`
  - no dataset label authority
  - no training authority
  - no action mask authority

Runtime authority finding:

- Current inspected active decision route supports Search as final tactical authority for `DecisionMode::Neural`.
- Standalone `NeuralAgent::select_action` remains implemented and final-selection capable inside its own module, but no inspected active `decision.rs` branch reaches it as the final authority.

## CLI references

Status: IMPLEMENTED command surfaces, PASSIVE in this audit.

Evidence:

- `src/tool/cli.rs` imports `NeuralAgent`.
- CLI commands including `neural_pick`, `neural_tournament`, `neural_smoke`, and `benchmark` instantiate `NeuralAgent::new()` for `health_check()`.
- `neural_tournament`, `neural_smoke`, and `benchmark` then delegate to `NeuralTournamentRunner`.
- No CLI command was executed during this audit.

CLI authority finding:

- Static CLI evidence shows NeuralAgent health-check use and neural command wiring.
- The inspected CLI snippets do not prove `NeuralAgent::select_action` is final move authority.
- Benchmark/tournament/smoke execution is blocked in this audit, so dynamic authority behavior is UNKNOWN beyond static routing.

## simulation references

Status: IMPLEMENTED command/runtime surfaces, PASSIVE in this audit.

Evidence:

- `src/simulation/simulation_runner.rs` imports `NeuralAgent`.
- When either side is named `"neural"`, `SimulationRunner` calls NeuralAgent telemetry helpers such as reset/runtime stats/purity violation snapshots.
- The inspected move-selection path calls `choose_best_action_with_trace_and_context(&engine, player, mode, trace_context.as_ref())` for non-`teacher_uci` play.
- `src/simulation/neural_tournament_runner.rs` uses `"neural"` as an agent label and delegates matches to `SimulationRunner`.
- Static search did not show direct `NeuralAgent::select_action` invocation inside `neural_tournament_runner.rs`.

Simulation authority finding:

- In the inspected simulation path, neural-labelled play flows into the decision layer, and the current decision layer routes `DecisionMode::Neural` through Search.
- NeuralAgent telemetry remains active around neural-labelled simulation runs.
- Runtime confirmation was not performed because gameplay/tournament/benchmark execution is blocked.

## test references

Status: TESTED by existing tests, not executed in this audit.

Observed test evidence:

- `tests/decision_authority_boundary_current.rs` statically asserts that `DecisionMode::Neural` routes through `search_authority_trace`, sets `SelectionAuthority::Search`, and does not call `choose_neural`, `agent.select_action`, or `SelectionAuthority::Neural`.
- `tests/neural_policy_guide_passive_adapter.rs` statically asserts that `NeuralProposal` cannot drive runtime, is not final authority, requires Search authority, and does not bridge to `NeuralAgent`, `ActionMask`, or `DecisionController`.
- `tests/neural_agent_selection_boundary_current.rs` statically preserves the boundary that final selection/rerank/fallback behavior remains owned by `src/agents/neural_agent.rs`, including `select_action`, `select_move_with_rerank`, and fallback/telemetry details.
- `tests/decision_controller_passive_adapter.rs` and `tests/search_backend_passive_adapter.rs` include static guards that current decision/search routing does not depend on `DecisionController`, `ActionMask`, or `NeuralAgent` as final authority.

Test authority finding:

- Existing tests distinguish current decision route from standalone NeuralAgent selection logic.
- Tests were not run in this audit, so their current pass/fail state is UNKNOWN.

## docs references

Status: DOCUMENTED_ONLY or PASSIVE depending on source.

Current-aligned docs evidence:

- `AGENTS.md` states Search remains final authority and Neural proposes/reranks.
- `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md` states Neural proposes/reranks and Search decides.
- `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md` documents that current `decision.rs` routes Neural/Hybrid/Minimax/Heuristic through Search authority and that `PolicyGuide`/`NeuralProposal` remain passive.
- `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` documents the intended future split where Search is final tactical authority and Neural does not decide alone.

Drift or stale-doc evidence:

- `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md` includes older volatile snapshot language indicating `DecisionMode::Neural` still selects through NeuralAgent and warning not to describe active routing as universally Search-final.
- That statement conflicts with the inspected current `src/chess/decision.rs` and newer boundary inventory.
- Treat this as stale or volatile documentation evidence, not active runtime proof.

## authority classification

- `src/agents/neural_agent.rs`: IMPLEMENTED. NeuralAgent can select and return an `Action` inside its own module.
- `src/chess/decision.rs`: IMPLEMENTED. Current `DecisionMode::Neural` routes through Search authority and returns `SelectionAuthority::Search`.
- `src/ai/policy_guide.rs`: IMPLEMENTED passive adapter. `NeuralProposal` is not final authority and cannot drive runtime.
- `src/tool/cli.rs`: IMPLEMENTED CLI surfaces. NeuralAgent is instantiated for health checks; runtime command execution was blocked.
- `src/simulation/simulation_runner.rs`: IMPLEMENTED simulation surface. NeuralAgent telemetry is referenced; inspected move selection goes through decision route.
- `src/simulation/neural_tournament_runner.rs`: IMPLEMENTED simulation/benchmark surface. Uses `"neural"` labels and delegates to `SimulationRunner`.
- `tests/*`: TESTED by static test sources present; not executed during this audit.
- `docs/control-plane/*`: DOCUMENTED_ONLY/PASSIVE planning and inventory evidence.
- `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`: PASSIVE evidence doc with stale/volatile drift risk.
- runtime/gameplay/benchmark behavior: UNKNOWN because execution was blocked.
- secrets/model/checkpoint/dataset payloads: BLOCKED by scope.

## Search authority cross-check

Status: IMPLEMENTED for inspected decision path.

The inspected current decision code supports the following boundary:

- Heuristic, Neural, Minimax, and Hybrid decision modes all call `search_authority_trace(...)`.
- `search_authority_trace(...)` calls the Search adapter and selects `root_search.best_action`.
- The resulting trace records `SelectionAuthority::Search`.
- No inspected current `decision.rs` code imports or calls `NeuralAgent`.

Conclusion:

- Search is final tactical authority in the inspected current decision route.
- This does not erase the existence of standalone NeuralAgent selection code; it only classifies the active decision route.

## DecisionController cross-check

Status: DOCUMENTED_ONLY/PASSIVE in inspected authority route.

Evidence:

- `src/ai/decision_controller.rs` and `src/chess/decision_controller_adapter.rs` exist as passive surfaces.
- Existing tests assert `decision.rs` does not depend on `DecisionController` for current routing.
- Static search did not identify `DecisionController` as active final authority for NeuralAgent decisions in the inspected current decision path.

Conclusion:

- DecisionController is not active final authority in the inspected Neural decision path.
- Any activation would require separate HumanGate and code/test audit.

## authority drift risks

1. Standalone NeuralAgent selection exists.
   - `NeuralAgent::select_action` returns `Action`.
   - If future CLI/simulation/runtime code calls it directly for move choice, Neural could become final tactical authority outside the Search-governed decision route.

2. CLI and simulation surfaces instantiate or reference NeuralAgent.
   - Current static evidence shows health checks and telemetry, but these are still near runtime entrypoints.
   - Future edits could accidentally reconnect these surfaces to `select_action`.

3. Older docs conflict with current code.
   - `ROCKY_OBSERVATION_PROTOCOL_V0.md` contains volatile language that can be read as NeuralAgent still controlling `DecisionMode::Neural`.
   - Newer code and newer inventory disagree.

4. Tests are static guardrails only unless run.
   - Existing boundary tests are useful, but this audit did not execute them.

5. Broad claims are unsafe.
   - "Neural can never select moves" is false because `NeuralAgent::select_action` exists.
   - "Neural is final authority" is unsupported for the inspected current decision route.
   - The defensible statement is narrower: current inspected `decision.rs` Neural mode routes final tactical selection through Search.

## unknowns

- Dynamic runtime behavior was not executed.
- Existing tests were not executed.
- `rg` was unavailable, so fallback static search was used.
- External Python/model behavior behind `query_python` was not executed or inspected as a binary/model payload.
- Model/checkpoint and dataset payloads were not read.
- Secrets and `.env` files were not inspected.
- Untracked `scripts/uxpilote/` content was not used as runtime proof.
- Full transitive call graph is static-inferred, not dynamically traced.

## recommended next tasks

1. HumanGate may approve a narrow test-only validation run for the existing static boundary tests, excluding runtime/gameplay/benchmark/training.
2. Add or maintain a static guard that no active decision/simulation tournament move-selection path calls `NeuralAgent::select_action` directly unless explicitly gated.
3. Reconcile or supersede stale documentation in `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md` so old volatile observations are not mistaken for current code truth.
4. Keep future Neural work on a separate lane from status-report tracking, governance/forms work, and studioctl tooling.
5. If CLI/runtime authority is audited later, inspect command call chains without executing gameplay, benchmark, or model payloads unless HumanGate explicitly opens that validation lane.

## status_by_surface

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: PASSIVE
- inference: PASSIVE
- scripts_tooling: PASSIVE
- secrets: BLOCKED

## software_verdict

PASSIVE. Static code evidence shows current `src/chess/decision.rs` routes `DecisionMode::Neural` through Search authority, while `src/agents/neural_agent.rs` still implements standalone action selection/rerank/fallback behavior.

## evidence_verdict

DOCUMENTED_ONLY/PASSIVE. Evidence is from static reads and fallback text search only. No runtime, tests, benchmarks, model calls, datasets, or secret paths were executed or inspected.

## claim_verdict

NO_CLAIM_ALLOWED. This audit does not authorize readiness, strength, Elo, benchmark proof, model proof, promotion, runtime activation, or global ready/not-ready claims.

## no_global_ready_verdict

true
