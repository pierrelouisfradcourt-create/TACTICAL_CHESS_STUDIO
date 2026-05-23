# ENGINE SEARCH NEURAL SURFACE INVENTORY V0

Status: docs-only inventory
Scope: PatchPack 10 Phase 1 boundary inventory only
Primary source: PATCHPACK_10_PREFLIGHT_REPORT (provided for this phase)

## 1) Purpose and constraints

This document is a docs-only inventory of current engine/search/neural ownership surfaces.
It does not authorize implementation.
It prepares PP11 and PP12 planning handoff only.

Required constraints:
- implementation_allowed_now: NO
- claim_verdict: NO_CLAIM_ALLOWED
- master_roadmap_fusion_allowed_now: NO

## 2) Preflight snapshot

- branch: main
- main_synced: YES
- working_tree_clean_before: YES
- latest_main_sha: 954716367fabcd6fbe9a161783ba40922d75a47a
- PR_237_present: YES
- PP9_roadmap_present: YES

## 3) Active ownership map

Current active surfaces:
- engine: src/engine/engine.rs
- search: src/chess/search.rs
- search directory ambiguity: src/chess/search/ is not present on main
- decision routing: src/chess/decision.rs
- neural: src/agents/neural_agent.rs
- ML coupling:
- ml/infer_policy.py
- ml/move_vocab.py
- ml/dataset_loader.py
- ml/train.py
- ml/dataset_decision_router.py

## 4) Engine surface inventory

Primary authority:
- Board/state authority remains concentrated in src/engine/engine.rs via the central Engine state container.
- Unit/turn state and legality context are owned in the same surface (`units`, turn sequencing, and state mutation).
- Legal move generation relation remains direct (`legal_actions`, per-unit legal extraction, and state-validated transitions).

Search simulation boundary:
- Search relies on engine-owned simulation/rollback entry points, not a detached simulation layer.
- Required boundary methods:
- simulate_action_for_search
- undo_action_for_search
- Null-move pair is also engine-owned:
- simulate_null_move_for_search
- undo_null_move_for_search

Restoration and integrity risks:
- Repetition/FEN/castling restoration correctness is coupled to simulate/undo behavior.
- Repetition key tracking is tied to FEN shape and castling-right evolution; rollback errors can desync search state and game state.
- Castling-right restoration and repetition counts are restoration-critical for deterministic search behavior.

Refactor posture:
- This file must not be refactored in one shot because board authority, move legality, and simulation rollback are tightly coupled in active runtime paths.

## 5) Search surface inventory

Active search ownership remains in src/chess/search.rs (single-file on main).

Owned concerns:
- Root selection orchestration and selected move emission.
- Negamax/quiescence recursion stack and stopping conditions.
- TT/killer/history/countermove/root-policy state ownership and mutation.
- Diagnostics emission path (root counters/runtime/branching traces).
- Root decision hook integration with decision routing.
- Root clone/orchestration boundary for exploration and root-level selection control.

Main-branch shape note:
- Search is currently single-file on main.

## 6) Decision routing surface inventory

Active runtime router remains src/chess/decision.rs:
- Random / Heuristic / Neural / Minimax / Hybrid modes are active.
- Search-authority modes route through `search_authority_trace(...)`.
- `DecisionMode::Heuristic`, `DecisionMode::Neural`, `DecisionMode::Minimax`, and `DecisionMode::Hybrid` route to `SelectionAuthority::Search`.
- The Search-authority route calls `search_root_via_adapter(...)`, which uses `PassiveSearchBackendAdapter` as the active routing boundary to existing root search.
- `DecisionTrace` preserves the returned `RootSearchResult` in `root_search: Some(root_search)`.
- `DecisionMode::Random` remains `SelectionAuthority::Fallback`.

Relation to passive interfaces:
- DecisionController exists as a passive/interface surface in src/ai/decision_controller.rs.
- DecisionController is not the active runtime routing replacement today.
- `SearchBackend` trait/types remain passive contracts; the adapter boundary is active only as the decision-to-search routing wrapper.

Constraint:
- No activation change is allowed in this phase.

## 6A) Current Authority Exceptions

Current active `decision.rs` routing no longer supports Neural direct final selection or Hybrid heuristic final-selection exceptions.

- Selection authority evidence is IMPLEMENTED and TESTED in the active decision trace.
- Search authority is explicit for `DecisionMode::Minimax`, explicit `DecisionMode::Heuristic`, `DecisionMode::Hybrid`, and `DecisionMode::Neural`.
- These four Search-authority modes route through `search_root_via_adapter(...)` and retain `RootSearchResult` in `DecisionTrace`.
- `NeuralAgent` still exists, but `NeuralAgent::select_action` is no longer reached as final authority through `decision.rs`.
- Hybrid no longer gates final authority through `should_use_search(...)` and no longer has a heuristic final-selection fallback in `decision.rs`.
- Random mode is tagged `Fallback`.
- `Unknown` remains present as an explicit `SelectionAuthority` variant.
- `SearchBackend` trait/types remain PASSIVE; `PassiveSearchBackendAdapter` is the active routing boundary to existing root search.
- `DecisionController` remains PASSIVE.
- `PolicyGuide` / `NeuralProposal` remains PASSIVE.
- `ActionMask` authority remains PASSIVE; active search still consumes engine legal actions directly.
- Dataset admission, label truth, training readiness, benchmark proof, model promotion, and global readiness claims remain BLOCKED / NO_CLAIM_ALLOWED.

## 7) Neural surface inventory

Active neural runtime surface is src/agents/neural_agent.rs, with Python-side policy service in ml/infer_policy.py.

Owned concerns:
- Python process lifecycle (spawn/readiness/query/restart/drop).
- Strict path/env resolution for python executable, script path, model path, and runtime flags.
- Bridge protocol I/O handling and timeout boundaries.
- Retry/fallback/rerank logic and legal fallback behavior.
- Runtime telemetry counters and runtime status emission.
- Transport and policy-shaping logic are mixed in one active surface.

Planning implication:
- This surface should be split on paper before code because transport control, fallback safety, rerank policy shaping, and telemetry are currently coupled.

## 8) Rust/Python protocol contract

Current protocol contract:
- Input line protocol: fen|move1|...
- Response contract: best_move|policy_index|shortlist(|memory_json)
- Shared move identity is coupled through ml/move_vocab.py.
- Coupling exists across ml/dataset_loader.py, ml/train.py, and ml/dataset_decision_router.py.

Ordering constraint:
- Stable ActionId/LegalAction/ActionMask must precede dataset/training work to avoid identity drift between runtime and data tooling.

## 9) Passive boundary inventory

Existing passive/interface surfaces:
- src/ai/search_backend.rs - SearchBackend trait/types
- src/ai/policy_guide.rs - PolicyGuide
- src/ai/decision_controller.rs - DecisionController
- src/core/action_id.rs - ActionId
- src/core/legal_action.rs - LegalAction
- src/chess/decision_trace_bridge.rs - trace helper

Clarification:
- `PassiveSearchBackendAdapter` is active as the decision-to-search routing boundary, but the `SearchBackend` contract is not a general runtime replacement surface.
- `DecisionController`, `PolicyGuide`, `ActionMask`, `LegalAction`, `ActionId`, and trace helper contracts do not become final runtime authority.

## 10) Highest-risk zones

- src/agents/neural_agent.rs
Reason: process lifecycle + protocol handling + fallback/rerank + telemetry are tightly mixed on live runtime path.

- src/chess/search.rs
Reason: root selection + negamax/quiescence + TT/ordering state + diagnostics are concentrated in one active file.

- src/engine/engine.rs
Reason: authority over legal action generation, state mutation, and simulate/undo restoration including repetition/FEN/castling state.

- ml/dataset_loader.py
Reason: dataset interpretation and field expectations are coupled to runtime move identity and protocol outputs.

- ml/train.py
Reason: training input assumptions depend on stable action identity and dataset contract continuity.

- ml/dataset_decision_router.py
Reason: decision-data shaping and fallback/selection fields are coupled to active runtime semantics.

## 11) Boundary ambiguities

- src/chess/search/ is missing on main.
- SearchBackend exists; active root search still lives in search.rs and is reached from decision.rs through `search_root_via_adapter(...)`.
- DecisionController exists but src/chess/decision.rs remains active router.
- LegalAction/ActionId exist but current action flow is not fully migrated.
- neural transport, policy shaping, telemetry, and fallback are mixed.
- ML action identity depends on move_vocab.py and must not be reset casually.

## 12) PP11 / PP12 handoff notes

PP11 (tests-only characterization):
- determinism characterization only
- legal action ordering
- simulate/undo restore
- FEN key shape
- standard castling invariants
- no behavior change

PP12 (passive adapter only):
- passive LegalAction/ActionId adapter
- narrow adapter only
- no replacement of Action
- no move generation replacement
- no execution replacement
- no search routing replacement

## 13) Stop conditions

Stop immediately if any of the following occurs:
- any non-doc file touched
- any src/ml/tests/scripts/schemas/workflows/lab change
- any parser/serializer work
- any runtime/search/neural/ML behavior change
- any benchmark/performance/readiness claim
- any PP11/PP12 implementation
- any roadmap fusion
- any HumanDecision ambiguity

## 14) Validation policy

Docs-safe validation only:
- git status --porcelain
- git diff --name-only
- git diff --name-only --cached
- git diff --check
- readback of docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md
- forbidden-surface check
- rg marker checks

Required marker checks:
- implementation_allowed_now: NO
- claim_verdict: NO_CLAIM_ALLOWED
- SearchBackend
- DecisionController
- LegalAction
- ActionId
- neural
- src/chess/search/ is not present
- master_roadmap_fusion_allowed_now: NO

## 15) Final verdicts

software_verdict: DOCS_ONLY_SURFACE_INVENTORY_ALLOWED
evidence_verdict: PLANNING_ALIGNMENT_ONLY
claim_verdict: NO_CLAIM_ALLOWED
human_gate_required: YES
implementation_allowed_now: NO
master_roadmap_fusion_allowed_now: NO
