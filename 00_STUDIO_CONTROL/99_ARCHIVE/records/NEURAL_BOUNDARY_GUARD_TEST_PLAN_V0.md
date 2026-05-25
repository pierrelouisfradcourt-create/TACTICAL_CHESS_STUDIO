# NEURAL_BOUNDARY_GUARD_TEST_PLAN_V0

## purpose

Create a docs-only plan for a future narrow test/static-check task guarding the Neural/Search authority boundary.

This plan does not run tests, modify runtime code, modify test files, activate agents, activate DecisionController, activate Chess960, create datasets, create models, run benchmarks, or authorize claims.

## preflight/source basis

- current_directory: `C:\TACTICAL_CHESS_STUDIO`
- branch: `master`
- HEAD: `5e48ed310a5047eb21bd4825da858e3a08e0c950`
- initial_worktree_status: dirty before this plan
- pre_existing_changes_observed:
  - untracked status reports under `00_STUDIO_CONTROL/05_STATUS/`
  - untracked `scripts/uxpilote/`
- exact_runtime_claim: BLOCKED; exact runtime identifier was not exposed.
- claim_posture: NO_CLAIM_ALLOWED

Sources read:

- `AGENTS.md`
- `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
- `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md`
- `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md`
- `00_STUDIO_CONTROL/05_STATUS/ENGINE_ROCKY_BOUNDARY_AUDIT_V0.md`
- `00_STUDIO_CONTROL/05_STATUS/NEURAL_AGENT_CALLGRAPH_AUDIT_V0.md`
- selected code/test/docs evidence:
  - `src/chess/decision.rs`
  - `tests/decision_authority_boundary_current.rs`
  - `tests/neural_policy_guide_passive_adapter.rs`
  - `tests/neural_agent_selection_boundary_current.rs`
  - `src/simulation/simulation_runner.rs`
  - `src/tool/cli.rs`
  - `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md`
  - `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`

Source state for this plan:

- created: yes
- registered: no
- loaded: no
- enforced: no
- evidenced: readback and docs-only validation only

## boundary to protect

Boundary rules:

1. Search remains final tactical authority for the current inspected Neural decision route.
2. Neural may propose, rank, rerank, provide candidate signals, or provide passive metadata.
3. `NeuralAgent::select_action` must not be reconnected as final move authority without HumanGate and matching code/tests.
4. `DecisionController` activation remains BLOCKED.
5. Chess960 activation remains BLOCKED.
6. Benchmarks, smoke games, tournaments, runtime traces, and selected moves are not proof of strength, readiness, label truth, or model quality.
7. Documentation, reports, and logs do not override active code/test evidence.

Protected active-code markers:

- `DecisionMode::Neural => search_authority_trace(engine, player, context, resolved_mode)`
- `selection_authority: SelectionAuthority::Search`
- `selected_action: root_search.best_action.clone()`
- `used_search: true`
- no active `NeuralAgent` import or `agent.select_action(` call inside `src/chess/decision.rs`

## current evidence summary

Status: PASSIVE static evidence only.

- `src/chess/decision.rs` defines `DecisionMode::Neural` and routes that branch through `search_authority_trace(...)`.
- `search_authority_trace(...)` calls `search_root_via_adapter(...)`, selects `root_search.best_action`, records `SelectionAuthority::Search`, and stores the root search result.
- `src/agents/neural_agent.rs` still defines `NeuralAgent::select_action(&self, engine: &Engine, _player: u32, actions: &[Action]) -> Action`.
- `src/simulation/simulation_runner.rs` imports `NeuralAgent` for neural runtime stats and purity-violation snapshots, while inspected non-`teacher_uci` move selection calls `choose_best_action_with_trace_and_context(...)`.
- `src/tool/cli.rs` instantiates `NeuralAgent` for `neural_pick`, `neural_tournament`, `neural_smoke`, and `benchmark` health checks; those runtime/benchmark commands were not executed.
- `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md` states `DecisionMode::Neural` routes to `SelectionAuthority::Search` and that `NeuralAgent::select_action` is no longer reached as final authority through `decision.rs`.
- `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md` contains older volatile language saying `DecisionMode::Neural` still selects through `NeuralAgent`; this is a docs-drift risk against current inspected code.

## risk summary

- Direct reconnection risk: future code could call `NeuralAgent::select_action` from `decision.rs`, CLI, simulation, or tournament paths as final move authority.
- Authority-tag drift risk: future edits could leave `DecisionMode::Neural` routed through Search while tagging `SelectionAuthority::Neural`, or vice versa.
- CLI/simulation adjacency risk: health-check and telemetry references are close to runtime command paths, so accidental final-selection use should be guarded.
- Documentation drift risk: older docs can conflict with current code and mislead future prompts.
- Test execution risk: existing guard tests were read but not run in this docs-only plan.

## existing tests inventory

Existing candidate tests/static guards observed:

- `tests/decision_authority_boundary_current.rs`
  - guards explicit `SelectionAuthority`
  - guards `SelectionAuthority::Search` in the shared helper
  - guards `DecisionMode::Neural` branch through `search_authority_trace(...)`
  - guards no `choose_neural(`, no `agent.select_action(`, and no `SelectionAuthority::Neural` in active Neural decision route
  - guards DecisionController remains absent from active decision route
- `tests/neural_policy_guide_passive_adapter.rs`
  - guards `NeuralProposal` cannot drive runtime
  - guards `NeuralProposal` is not final authority
  - guards Search authority is required
  - guards policy guide code does not reference NeuralAgent, Python bridge, SearchBackend, ActionMask, or DecisionController
- `tests/neural_agent_selection_boundary_current.rs`
  - preserves that standalone final selection/rerank/fallback behavior remains owned by `src/agents/neural_agent.rs`
  - helps prevent claims that NeuralAgent selection code does not exist
- `tests/decision_controller_passive_adapter.rs`
  - guards passive DecisionController posture and active decision-route separation
- `tests/search_backend_passive_adapter.rs`
  - guards Search adapter route and absence of DecisionController/ActionMask/NeuralAgent from active decision route
- `tests/observation_boundary_current.rs`
  - characterizes NeuralAgent engine consumption and Python/FEN observation boundaries

No test was executed during this plan.

## candidate guard tests

Candidate 1: keep Neural branch Search-final in `decision.rs`.

- Type: static source guard or unit/static test.
- Target: `src/chess/decision.rs`.
- Required assertions:
  - `DecisionMode::Neural =>` exists.
  - Neural branch body routes through `search_authority_trace(engine, player, context, resolved_mode)`.
  - shared helper records `selection_authority: SelectionAuthority::Search`.
  - shared helper selects `root_search.best_action.clone()`.
  - shared helper records `used_search: true`.
- Existing coverage: mostly covered by `tests/decision_authority_boundary_current.rs`.
- Future action: run existing targeted test first before adding new tests.

Candidate 2: prevent direct NeuralAgent final selection in active decision route.

- Type: static source guard.
- Target: `src/chess/decision.rs`.
- Required assertions:
  - does not contain `NeuralAgent`
  - does not contain `agent.select_action(`
  - does not contain `choose_neural(`
  - does not contain `SelectionAuthority::Neural` as the Neural branch final authority
- Existing coverage: covered by `tests/decision_authority_boundary_current.rs` and `tests/neural_policy_guide_passive_adapter.rs`.
- Future action: keep this guard in the narrow test set.

Candidate 3: prevent CLI/simulation final move selection through `NeuralAgent::select_action`.

- Type: static source guard.
- Targets:
  - `src/simulation/simulation_runner.rs`
  - `src/simulation/neural_tournament_runner.rs`
  - `src/tool/cli.rs`
- Required assertions:
  - simulation move-selection path for `"neural"` reaches `choose_best_action_with_trace_and_context(...)` or equivalent Search-authority route.
  - tournament runner delegates to simulation instead of directly invoking `NeuralAgent::select_action`.
  - CLI neural commands may health-check NeuralAgent, but must not use `NeuralAgent::select_action` as final game move selector.
- Existing coverage: partial; current tests focus strongly on `decision.rs`, policy guide, and search backend. A specific CLI/simulation static guard may be useful.
- Future action: add only if HumanGate approves a test-file edit task. Do not add in this docs-only plan.

Candidate 4: docs drift guard for stale Neural authority claims.

- Type: static docs check or docs audit test.
- Targets:
  - `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`
  - `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md`
  - relevant `00_STUDIO_CONTROL/05_STATUS/*` reports
- Required assertions:
  - stale statements are marked volatile, historical, or superseded when they conflict with current `decision.rs`.
  - docs distinguish standalone `NeuralAgent::select_action` from current `DecisionMode::Neural` Search-final routing.
  - docs avoid broad "Neural never selects" and broad "Neural is final authority" claims.
- Existing coverage: not clearly covered as an executable test.
- Future action: prefer docs cleanup or a lightweight static check only after HumanGate.

Candidate 5: keep DecisionController inactive.

- Type: static source guard.
- Target: `src/chess/decision.rs` plus `src/chess/decision_controller_adapter.rs`.
- Required assertions:
  - active decision route does not import `DecisionController`.
  - active decision route does not instantiate `PassiveDecisionControllerAdapter`.
  - DecisionController remains passive unless HumanGate explicitly opens an activation task.
- Existing coverage: `tests/decision_authority_boundary_current.rs`, `tests/decision_controller_passive_adapter.rs`, and `tests/search_backend_passive_adapter.rs`.

## candidate static checks

Recommended future narrow command set, if HumanGate approves test/static-check execution:

```powershell
cargo test --test decision_authority_boundary_current
cargo test --test neural_policy_guide_passive_adapter
cargo test --test search_backend_passive_adapter
cargo test --test decision_controller_passive_adapter
cargo test --test neural_agent_selection_boundary_current
```

Optional static-only file search checks:

```powershell
Select-String -Path src\chess\decision.rs -Pattern 'DecisionMode::Neural','search_authority_trace','SelectionAuthority::Search','NeuralAgent','agent.select_action','SelectionAuthority::Neural'
Select-String -Path src\simulation\simulation_runner.rs,src\simulation\neural_tournament_runner.rs,src\tool\cli.rs -Pattern 'NeuralAgent','select_action','choose_best_action_with_trace_and_context'
Select-String -Path docs\evidence\ROCKY_OBSERVATION_PROTOCOL_V0.md,docs\control-plane\ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md -Pattern 'DecisionMode::Neural','NeuralAgent','Search-final','final authority','SelectionAuthority::Search'
```

These are proposed future checks only. They were not run as validation of this plan, except for read-only source search/readback.

## future test-only task candidate

Task title:

`Run narrow Neural/Search boundary guard tests without runtime gameplay`

Mode:

`test_only_static_boundary_validation`

HumanGate requirement:

`human_gate_required: true`

Scope:

- Run only existing targeted static/boundary tests listed in this plan.
- If failures occur, report failures only; do not patch runtime or tests unless a separate HumanGate task authorizes it.
- Do not run gameplay, tournaments, smoke benchmarks, full benchmarks, training, dataset generation, model calls, or model promotion.
- Do not stage, unstage, restore, reset, commit, push, branch, or PR.

Candidate validation commands:

```powershell
cargo test --test decision_authority_boundary_current
cargo test --test neural_policy_guide_passive_adapter
cargo test --test search_backend_passive_adapter
cargo test --test decision_controller_passive_adapter
cargo test --test neural_agent_selection_boundary_current
git diff --check
git status --short --branch
```

Expected report:

- commands run and results
- skipped validation
- failing assertions if any
- whether Search authority guard remains supported by tests
- whether NeuralAgent standalone final-selection code remains distinguished from active decision authority
- software_verdict
- evidence_verdict
- claim_verdict
- no global ready/not-ready verdict

## blocked actions

- Do not modify runtime code.
- Do not modify tests.
- Do not modify scripts.
- Do not run runtime/gameplay commands.
- Do not run cargo test in this docs-only plan.
- Do not run pytest.
- Do not benchmark.
- Do not train.
- Do not generate or reset datasets.
- Do not create `latest.json`.
- Do not create `lab/runs/RUN_*`.
- Do not read model/checkpoint binary payloads.
- Do not create or promote models/checkpoints.
- Do not activate agents.
- Do not activate Chess960.
- Do not activate DecisionController.
- Do not inspect secrets or `.env` files.
- Do not stage, unstage, restore, reset, commit, push, branch, or PR.
- Do not claim runtime readiness, strength, Elo, benchmark proof, dataset truth, model proof, promotion, or global readiness.

## validation plan for future task

Minimum future HumanGate-gated validation:

1. Confirm branch, HEAD, and dirty worktree.
2. Read `AGENTS.md`, this plan, and the NeuralAgent callgraph audit.
3. Run only the listed targeted guard tests or static checks.
4. Do not run gameplay/tournament/benchmark/training/dataset/model commands.
5. Run `git diff --check`.
6. Report status by surface and preserve `NO_CLAIM_ALLOWED`.

Acceptance evidence for the future task:

- Existing guard tests pass, or failures are reported with exact failing assertions.
- No runtime code or tests are modified in a validation-only run.
- No benchmark, model, dataset, or gameplay output is produced.
- Final report separates active runtime code, tests, docs, artifacts, roadmap, inference, scripts, and secrets.

## HumanGate decision required

HumanGate must decide whether to:

- run the existing targeted static/boundary tests;
- add a new CLI/simulation static guard test;
- reconcile stale docs before test execution;
- keep this plan passive and untracked;
- track this plan locally later;
- prepare a separate future test-only task charter.

This plan does not make that decision.

## status_by_surface

- active_runtime_code: PASSIVE
- tests: DOCUMENTED_ONLY
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: PASSIVE
- inference: PASSIVE
- scripts_tooling: PASSIVE
- secrets: BLOCKED

## software_verdict

PASSIVE. No runtime code, tests, scripts, datasets, models, lab outputs, or activation surfaces were changed.

## evidence_verdict

DOCUMENTED_ONLY. Evidence is from static source reads, fallback text search, prior audit readback, and this plan readback. No tests were executed.

## claim_verdict

NO_CLAIM_ALLOWED. This plan authorizes no readiness, strength, Elo, benchmark, model, dataset, promotion, activation, or global ready/not-ready claim.

## no_global_ready_verdict

true
