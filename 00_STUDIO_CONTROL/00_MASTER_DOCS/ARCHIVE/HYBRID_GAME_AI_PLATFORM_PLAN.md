# Hybrid Game AI Platform Plan

Status: implementation control document  
Project: TacticalChessPureLab / Tactical Chess Studio  
Scope: ordered roadmap for engine/search/neural/training/evaluation evolution  
Rule: roadmap only; active source code remains the implementation authority.

---

## 1. Objective

Single objective:

```text
Stabilize current chess system
-> validate bounded decision behavior
-> extend toward modular hybrid AI
```

The working chess runtime is not a disposable prototype. It remains operational while the generic tactical core, AI boundaries, telemetry, evaluation and training systems grow beside it.

This document controls implementation order. It does not claim that the target contracts already exist.

---

## 2. Relationship With AAA Tactical Core Architecture

`MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md` is the long-term product and tactical-core architecture document. It describes the future reusable engine direction: tactical board games, cards, effects, rule mutation, deterministic simulation, adapters and future client boundaries.

This document is narrower and more operational. It defines the implementation order for stabilizing the current chess engine/search/neural/training/evaluation stack before broader AAA migration.

Authority order:

1. active source code
2. build files, manifests and runtime outputs
3. current benchmark outputs
4. current docs
5. archives and historical docs

Shared doctrine:

- active chess runtime remains operational
- generic tactical core grows beside the chess runtime
- chess adapter migration is gradual
- no destructive rewrite of `src/engine`, `src/chess`, `src/agents`, `ml`, `src/simulation` or `src/tournament`
- Python remains acceptable for lab/training/orchestration, but is not mandatory for the final runtime

---

## 3. Current Implementation Reality

Current source audit summary:

- `src/engine/engine.rs` owns board state, units, turn state, repetition tracking, halfmove clock, castling rights, chess legal move generation, search simulation and undo helpers.
- `src/chess/search.rs` owns negamax/quiescence/root search, move ordering, transposition/history/countermove state, root diagnostics and practical root policy integration.
- `src/chess/root_decision.rs` has already been simplified from the older selector-heavy root path. It no longer uses root `CandidateMove`, `MoveSelector`, root `pattern_score`, root `evaluate()`, root `engine.clone()`, or selector final/rerank/normalized/rejection fields. Root ranking is now deterministic by `worst_case`, then `search_score`, then `transition_score`, then UCI tie-break.
- `src/chess/decision.rs` is a mode router, not a true modular scheduler.
- `src/agents/neural_agent.rs` is monolithic: Python process management, policy inference, rerank, fallback, retrieval hooks, counters and runtime log emission live together.
- `src/simulation/` and `src/tournament/` provide self-play, match execution, neural tournament/benchmark outputs, teacher sample export and Elo/CSV reporting.
- `ml/` provides dataset loading, admission, tensorization, policy/value training, legal masks, inference service, move vocabulary and export checks.
- `lab/` holds active dataset pointers, datasets, reports, tournament outputs and audit artifacts.

Current gaps:

- no fully active common `LegalAction` route; passive adapter work exists only
- no fully active stable `ActionId` system; passive adapter work exists only
- no complete `ActionMask` or versioned observation contract
- no active modular `DecisionController`; passive adapter work exists only
- no first-class evaluation system directory
- no final-runtime neural inference boundary independent of Python
- no dataset reset should happen until action/observation identity is stable

Current extraction status note after PP9-PP19 / PR #237-#247:

- PP9 and PP10 are docs-only roadmap/inventory alignment.
- PP11 and PP13 are characterization tests only.
- PP12 merged a passive `LegalAction` / `ActionId` adapter.
- PP14 merged a passive `SearchBackend` adapter.
- PP15 is a docs-only decision routing contract plan.
- PP16 merged a passive `DecisionController` adapter.
- PP17 is a docs-only neural split inventory and gate packet.
- PP18 keeps `NeuralPolicyValue` as a paper-only candidate.
- PP19 fuses the roadmap as docs-only alignment.
- this is scaffolding and planning progress only, not full hybrid-platform implementation
- no active runtime route, neural route, ML route, or control-plane authority is created by this track

Recent confirmed simplification:

```text
src/chess/root_decision.rs
  root ranking: worst_case -> search_score -> transition_score -> UCI
  transition_score: practical adjustment + root_goal_bonus + anti_shuffle_score
  validation reported: cargo check, cargo test root_decision, conversion_suite 5, fast smoke benchmark
```

This reduces root decision complexity, but it does not activate `SearchBackend` or `DecisionController`.

Recent PP9-PP19 consolidation status:

| Surface | Status | Active route impact |
| --- | --- | --- |
| `LegalAction` / `ActionId` adapter | passive | none |
| `SearchBackend` adapter | passive | none |
| `DecisionController` adapter | passive | none |
| `NeuralPolicyValue` | paper-only candidate | none |
| PP19 master roadmap fusion | docs-only | none |

Preserved authority:

- Runtime/source truth outranks docs.
- Search remains final tactical authority.
- Neural never decides alone.
- `HumanDecision` remains required for activation, implementation, promotion, and claim status.
- `claim_verdict` remains `NO_CLAIM_ALLOWED`.

---

## 4. Corrected Target Architecture

Target architecture:

```text
DeterministicRuntime
  Engine + legacy search runtime truth

RuleExecutor
  produces LegalAction

ActionSystem
  stable ActionId + normalization

ObservationSystem
  versioned observation + action mask

DecisionController
  scheduler only

SearchBackend
  final decision authority

NeuralPolicyValue
  batch scoring and guidance only

AgentStrategyLayer
  bounded influence, added later

TrainingSystem
  search-guided policy/value learning

EvaluationSystem
  benchmark, rating and regression validation

TelemetryCore
  cross-cutting evidence layer across all systems

ExplorationSystem
  late meta-breaker, novelty and diversity layer
```

Pipeline:

```text
GameState
-> RuleExecutor
-> Vec<LegalAction>
-> Observation + ActionMask
-> DecisionController
   -> Neural top-k guidance
   -> tactical filter
   -> SearchBackend final decision
-> Action
-> TelemetryCore
-> EvaluationSystem
-> TrainingSystem, later
```

---

## 5. Critical Design Rules

- Engine remains world authority.
- Search remains decision authority.
- Neural never decides alone.
- Stable `ActionId` exists before dataset and training work.
- Telemetry exists before training work.
- Evaluation exists before League work.
- `AgentStrategyLayer` is bounded and cannot override forced tactical truth.
- Python bridge is acceptable for lab work but not mandatory for final runtime.
- Determinism is strict.
- Benchmarks must be reproducible.
- No destructive rewrite of the legacy chess runtime.
- No broad refactor without a phase-specific exit criterion.
- No dataset reset until stable action and observation schemas exist.

Search authority rule:

```text
if search_gap > threshold:
    final = search_best
else:
    bounded adjustments allowed
```

Any threshold must be documented, benchmarked and traceable.

---

## 6. Critical Contracts

These are target contracts. They should be introduced gradually and only when each phase needs them.

### 6.1 LegalAction

```rust
pub struct LegalAction<A> {
    pub id: ActionId,
    pub action: A,
    pub actor: Option<EntityId>,
    pub target: Option<TargetRef>,
    pub tags: ActionTags,
    pub cost: ActionCost,
    pub source: RuleSource,
}
```

### 6.2 DecisionContext

```rust
pub struct DecisionContext {
    pub budget: DecisionBudget,
    pub seed: u64,
    pub trace_enabled: bool,
}
```

### 6.3 DecisionBudget

```rust
pub struct DecisionBudget {
    pub max_depth: Option<u32>,
    pub max_nodes: Option<u64>,
    pub max_time_ms: Option<u64>,
}
```

### 6.4 DecisionModule

```rust
pub trait DecisionModule<R: GameRuntime> {
    fn propose(
        &mut self,
        runtime: &R,
        observation: &R::Observation,
        legal_actions: &[LegalAction<R::Action>],
        mask: &ActionMask,
        ctx: &DecisionContext,
    ) -> ModuleProposal<R::Action>;
}
```

### 6.5 Neural Batch Scoring API

```rust
fn score_actions_batch(
    &mut self,
    observation: &Observation,
    actions: &[LegalAction<Action>],
    mask: &ActionMask,
    ctx: &InferenceContext,
) -> Result<PolicyValueBatch, InferenceError>;
```

---

## 7. Telemetry Minimum

`TelemetryCore` is cross-cutting. It must exist before training claims and before League work.

Minimum decision fields:

```text
state_key
legal_action_ids
selected_action_id
decision_mode
used_search
used_neural
neural_latency_ms
search_nodes
search_depth
fallback_reason
```

Telemetry requirements:

- stable enough for commit-to-commit comparison
- explicit about fallback and contamination
- able to separate search, neural, rerank and diagnostics latency
- able to prove deterministic replay or expose deterministic failure

---

## 8. Phase Order, Exit Criteria and Likely Files

### Phase 0 - Baseline

Purpose: freeze current truth before changing behavior.

Likely files:

```text
MASTER_DOCS/
lab/reports/
scripts/
```

Work:

- run tests/build
- capture benchmark smoke
- capture neural smoke if Python/model are available
- capture search profile
- capture docs snapshot

Exit criteria:

- current validation commands and failures are documented
- no runtime behavior changed
- baseline artifacts are named with date/seed/settings

### Phase 1 - Deterministic Engine

Purpose: prove stable legality and reversible search simulation.

Likely files:

```text
src/engine/engine.rs
src/chess/fen.rs
src/chess/uci.rs
MASTER_DOCS/03_KNOWN_ISSUES.md
```

Work:

- tests for deterministic `legal_actions` ordering
- tests for simulate/undo restoring board/FEN-equivalent state, turn, repetition, halfmove and castling rights
- stable `ActionId` investigation only
- fix ordering only if tests prove instability

Exit criteria:

- tests prove whether `HashMap` iteration affects action ordering
- simulate/undo state restoration coverage exists
- no neural refactor
- no search refactor beyond test-only access if unavoidable

### Phase 2 - Core Minimal

Likely files:

```text
src/core/ids.rs
src/core/action_id.rs
src/core/game_result.rs
src/core/deterministic.rs
src/core/mod.rs
```

Exit criteria:

- minimal IDs and determinism helpers compile
- no chess runtime rewiring
- unit tests cover stable identity helpers

### Phase 3 - Telemetry

Likely files:

```text
src/chess/decision_trace.rs
src/chess/decision.rs
src/chess/search.rs
src/simulation/simulation_runner.rs
src/tournament/export.rs
```

Exit criteria:

- minimal decision fields are emitted or capturable
- telemetry format is stable
- fallback reasons are explicit

### Phase 4 - Search Context

Likely files:

```text
src/chess/search.rs
src/chess/root_decision.rs
```

Exit criteria:

- search budget/config moves toward explicit context
- existing search strength behavior is preserved
- diagnostics remain available

### Phase 5 - AI Boundary

Likely files:

```text
src/ai/
src/chess/decision.rs
src/chess/decision_trace.rs
src/engine/
```

Exit criteria:

- target `GameRuntime`, `Observation` and `ActionMask` boundaries are documented or skeletonized
- chess adapter boundary is explicit
- current chess modes still run

### Phase 6 - DecisionController

Likely files:

```text
src/chess/decision.rs
src/ai/
src/agents/
```

Exit criteria:

- scheduler responsibilities are separated from modules
- budget/fallback/trace path is explicit
- search remains final authority
- any active route change requires separate HumanDecision

### Phase 7 - Neural Split

Likely files:

```text
src/agents/neural_agent.rs
src/agents/
ml/infer_policy.py
```

Exit criteria:

- bridge, policy selection, rerank, fallback and telemetry have clear boundaries
- no strength claim without benchmark
- Python bridge remains available for lab
- `NeuralPolicyValue` remains guidance-only and paper-only until separately authorized

### Phase 8 - Batch Inference

Likely files:

```text
src/agents/
ml/infer_policy.py
ml/model.py
```

Exit criteria:

- batch protocol is explicit
- latency is measured
- fallback remains deterministic

### Phase 9 - Hybrid Search

Likely files:

```text
src/chess/search.rs
src/chess/root_decision.rs
src/agents/
```

Exit criteria:

- neural is ordering/guidance only
- search selects final move unless bounded gate allows adjustment
- all non-search influence is traceable

### Phase 10 - Dataset / Training

Likely files:

```text
src/simulation/teacher_uci_runner.rs
ml/dataset_loader.py
ml/train.py
ml/move_vocab.py
ml/export_dataset_check.py
lab/datasets/
```

Exit criteria:

- observation schema is versioned
- `ActionId`/mask semantics are stable
- replay buffer contract exists
- dataset reset decision is explicit

### Phase 11 - Evaluation System

Likely files:

```text
src/evaluation/
src/simulation/
src/tournament/
benchmark_runner.py
scripts/
```

Exit criteria:

- arena, benchmark suite, rating and regression guard are separated
- metrics include winrate, Elo, conversion rate, blunder rate, latency, determinism failures and draw rate
- evaluation is required before League

### Phase 12 - Bounded AgentStrategy

Likely files:

```text
src/ai/
src/chess/decision.rs
src/chess/root_decision.rs
```

Exit criteria:

- objective/risk/style/temperature are bounded
- forced tactics cannot be overridden
- no novelty/meta-breaker/league influence yet

### Phase 13 - League

Likely files:

```text
src/tournament/
src/evaluation/
lab/experiments/
```

Exit criteria:

- population and matchmaking are evaluation-backed
- ratings integrate with regression gates

### Phase 14 - Tactical Core

Likely files:

```text
src/core/
src/rules/
src/map/
src/effects/
```

Exit criteria:

- minimal non-chess rules/map/effects scenario exists
- chess runtime remains unchanged unless adapter work is explicitly scoped

### Phase 15 - Chess Adapter + Variants

Likely files:

```text
src/games/
src/chess/chess960.rs
src/chess/castling_spec.rs
src/chess/fen.rs
```

Exit criteria:

- adapter can map chess actions into generic action boundary
- Chess960 waits for castling/FEN/benchmark/dataset coverage

### Phase 16 - Cards / Effects

Likely files:

```text
src/cards/
src/effects/
lab/content/
lab/scenarios/
```

Exit criteria:

- data-driven card/effect prototype runs deterministically
- no card-specific Rust branches

### Phase 17 - Exploration System

Likely files:

```text
src/ai/
src/evaluation/
src/tournament/
```

Exit criteria:

- novelty/diversity is bounded by evaluation
- no regression gate bypass

### Phase 18 - Real-Time

Likely files:

```text
src/ai/
src/core/
src/simulation/
```

Exit criteria:

- tick scheduler and anytime decision semantics exist
- `DecisionBudget` handles time/node/depth constraints

---

## 9. Validation Commands

Minimum docs-only validation:

```bash
git status --short
```

Minimum code-change validation:

```bash
cargo test
cargo build
```

Recommended baseline validation when available:

```bash
cargo run -- neural_smoke
cargo run -- benchmark --smoke --games 2
cargo run -- engine_validation 1
cargo run -- search_profile 2
```

Dataset/training validation, only after schema stability:

```bash
python ml/export_dataset_check.py --input <dataset.jsonl>
python ml/train.py --input <dataset.jsonl> --epochs 1 --batch-size 64
```

If Python/model dependencies are unavailable, record the skip explicitly. Do not treat smoke tests as strength proof.

---

## 10. Forbidden Changes

Forbidden in this roadmap unless a later phase explicitly authorizes them:

- broad rewrite of `src/engine/engine.rs`
- broad rewrite of `src/chess/search.rs`
- broad rewrite of `src/agents/neural_agent.rs`
- deleting or bypassing current chess runtime
- making neural the sole final decision maker
- resetting datasets before stable action/observation schema
- changing Python training semantics while engine identity is unstable
- introducing League before evaluation/regression guard
- adding novelty/meta-breaker before bounded strategy and evaluation
- using unordered map iteration as a gameplay decision surface without deterministic ordering
- changing public behavior without tests and validation output

---

## 11. Risk List

- `Engine` is chess-specific despite living under `src/engine`.
- `legal_actions` now sorts by `action_key`, but stable action identity remains a contract gap.
- simulate/undo correctness is critical because search mutates state repeatedly.
- FEN serialization may not represent every runtime field unless tests assert additional state directly.
- Search has partial context extraction, but root search still mixes search, practical policy, diagnostics and root decision.
- Root decision can choose within a practical margin; the search authority rule must remain explicit.
- `neural_agent.rs` is monolithic and can hide latency, fallback and rerank behavior.
- Python bridge is acceptable for lab but a final runtime dependency risk.
- Batch inference is not the current protocol, so latency can scale poorly with per-position calls.
- Telemetry exists in multiple forms but not yet as a clean cross-cutting contract.
- Evaluation exists through tournament/benchmark surfaces but not yet as a first-class system.
- Dataset/training surfaces already consume legal masks and AAA metadata, so schema churn could invalidate runs.
- Passive PP9-PP19 adapters can be mistaken for activation unless docs keep the active/passive distinction explicit.

---

## 12. Known Blockers

- Stable `ActionId` contract is not complete as an active common route.
- `LegalAction` is not yet the common active legality surface.
- `ActionMask` and versioned observation are not yet authoritative.
- `DecisionController` is not yet active modular routing.
- `SearchBackend` is not yet active routing.
- `NeuralPolicyValue` is not implemented.
- Search budget/config is not fully explicit.
- Evaluation/regression guard is not separated from simulation/tournament code.
- Final-runtime neural backend is undecided.
- Dataset reset is blocked by action/observation schema stability.

---

## 13. Codex Implementation Rules

- one phase per PR
- no broad refactors
- include validation commands
- include modified files summary
- include behavior risk summary
- keep `cargo test` and `cargo build` green for code changes
- keep docs-only changes markdown-only
- do not modify Rust/Python during docs/audit tasks
- prefer tests before behavior changes
- do not touch `src/agents/neural_agent.rs` in Phase 1
- do not touch `src/chess/search.rs` in Phase 1 unless strictly needed for tests

---

## 14. First Implementation Ticket

Phase 1 only:

- deterministic `legal_actions` ordering tests
- simulate/undo restoration tests
- stable `ActionId` investigation
- no neural refactor
- no search refactor
- no dataset reset

Exit criteria:

- tests document current behavior
- instability is fixed only if proven
- validation commands are reported
- any unassertable state fields are listed

---

## 15. Final One-Line Roadmap

```text
Baseline
-> deterministic engine
-> core minimal
-> telemetry
-> search context
-> AI boundary
-> DecisionController
-> neural split + batch
-> hybrid search
-> dataset/training
-> evaluation
-> bounded strategy
-> league
-> tactical core
-> variants/cards
-> exploration
-> real-time
```

Final doctrine:

```text
Engine -> truth
RuleExecutor -> legality
ActionSystem -> stability
ObservationSystem -> learning interface
DecisionController -> orchestration
SearchBackend -> correctness
NeuralPolicyValue -> intuition
AgentStrategyLayer -> bounded intention
TelemetryCore -> evidence
EvaluationSystem -> validation
TrainingSystem -> improvement
League -> evolution
ExplorationSystem -> diversity
```
