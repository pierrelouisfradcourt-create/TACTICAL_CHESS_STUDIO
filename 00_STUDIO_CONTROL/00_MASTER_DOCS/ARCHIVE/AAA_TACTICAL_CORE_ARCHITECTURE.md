# AAA Tactical Core Architecture

Status: architecture consolidation pass after PP9-PP19 engine/search/neural roadmap fusion
Project: TacticalChessPureLab / Tactical Chess Studio
Scope: documentation-only alignment of architecture and migration priorities
Rule: active runtime code remains authority if this document and code disagree.

---

## 1. Purpose And Scope

This document consolidates architecture direction without rewriting runtime behavior.

Current operational truth to preserve:

- current chess runtime remains operational
- PP9-PP19 / PR #237-#247 are merged on `main`
- passive boundary extraction exists only as passive/docs-only scaffolding:
  - `LegalAction` / `ActionId` adapter remains passive
  - `SearchBackend` adapter remains passive
  - `DecisionController` adapter remains passive
  - `NeuralPolicyValue` remains paper-only
- runtime extraction now resumes as bounded, passive, fail-closed work
- claim_verdict remains `NO_CLAIM_ALLOWED`
- benchmarks, latest pointers, and local reports are not proof

This is not a claim that AAA tactical architecture is already implemented.

## Recent PP9-PP19 Consolidation

The PP9-PP19 track is documentation synchronization and passive-boundary progress only:

| Track | Classification | AAA interpretation |
| --- | --- | --- |
| PP9-PP10 | docs-only | decomposition roadmap and surface inventory |
| PP11, PP13 | tests-only | characterization without activation |
| PP12 | passive adapter | `LegalAction` / `ActionId` bridge, not action replacement |
| PP14 | passive adapter | `SearchBackend`, not active search routing |
| PP15 | docs-only | decision routing contract plan, not router mutation |
| PP16 | passive adapter | `DecisionController`, not active scheduler |
| PP17-PP18 | docs-only / paper-only | neural split and `NeuralPolicyValue` candidate only |
| PP19 | docs-only | roadmap fusion, not new control-plane |

Mandatory doctrine after this consolidation:

- Runtime/source truth outranks docs.
- Search remains final tactical authority.
- Neural never decides alone.
- `HumanDecision` remains final authority.
- No implementation is authorized by this docs update.

---

## 2. Current Repo Reality

### 2.1 Authority order

Use this authority order:

1. active source code
2. build/runtime outputs tied to active code
3. current docs
4. historical docs and archives as context only

If this document disagrees with code, code wins.

### 2.2 Active runtime surface (current)

Current Rust runtime remains centered on existing chess modules and CLI flows under `src/`.
Current Python surface remains for ML, dataset tooling, and analysis workflows under `ml/` and `lab/`.

No section in this document authorizes broad rewrites of active runtime modules.

---

## 3. Transition Statement

The architecture direction is now explicit:

- from: advanced chess engine focus
- toward: deterministic tactical simulation runtime with pluggable game adapters

This transition must keep chess running throughout migration.

Migration method is mandatory:

- extract
- isolate
- encapsulate
- stabilize
- redirect

Not allowed:

- one-shot rewrite of engine/runtime families
- breaking chess loop to "jump" to target architecture

---

## 4. 960-Ready Definition (Critical)

`960-ready` does not mean "supports random chess starts only."

`960-ready` means the runtime no longer assumes one hardcoded initial board configuration.

Architecture consequences:

- no hardcoded king start squares like `e1/e8` in core assumptions
- no hardcoded rook start files like `a/h` in core assumptions
- no hardcoded castling coordinates embedded as universal runtime truth
- no single canonical setup embedded directly in runtime core logic

Runtime must accept initial state through providers/factories/contracts so that it can support:

- classic chess setup
- chess960 setup
- generated setups
- scenario setups
- future tactical prototypes

---

## 5. Layered Architecture And Dependency Direction

The architecture is organized into five layers:

1. Runtime Core
2. Game Adapter Layer
3. Environment Boundary
4. Agent Layer
5. Automation / Dataset / Telemetry

Dependency direction is strict:

- runtime never depends on agents
- adapters depend on runtime contracts
- environment depends on runtime + adapter contracts
- agents depend on environment/runtime contracts only
- automation/dataset/telemetry depend on environment, replay, telemetry, and dataset contracts

No layer above may bypass contracts to mutate internals directly.

---

## 6. Runtime Core

Target runtime core is not chess-specific. Current active runtime still contains chess-specific modules. The migration goal is to extract generic runtime contracts beside the existing chess runtime.

Runtime core owns:

- deterministic state mutation
- entities and teams
- action application pipeline hooks
- event recording and replay support
- snapshots / restore points
- deterministic RNG usage path
- telemetry hooks

Runtime core does not own:

- neural systems
- MCTS/search implementations
- heuristics
- coach logic
- dataset generation policy
- benchmarking interpretation

---

## 7. Game Adapter Layer

Chess is an adapter over runtime contracts, not the runtime itself.

Adapter direction (architectural target):

- `ChessAdapter`
- `Chess960Adapter`
- `ScenarioAdapter`
- `FutureBattlerAdapter`

Adapters map game-specific rules, setup conventions, and legal-action semantics into runtime contracts while preserving determinism and replay.

---

## 8. InitialStateFactory

Initial setup generation is isolated from runtime assumptions.

`InitialStateFactory` is the provider boundary for creating starting state.

Factory examples:

- `ClassicChessFactory`
- `Chess960Factory`
- `ScenarioFactory`

Purpose:

- remove hardcoded single-start assumptions
- centralize setup generation and validation
- preserve deterministic setup reproduction by seed/config

---

## 9. Action System

Action architecture is formalized around four core concepts:

- `Action`
- `LegalAction`
- `ActionOutcome`
- `ActionIntent`

Official pipeline:

`Action` -> legality validation -> event generation -> runtime mutation -> replay/telemetry

Meaning:

- action request is explicit
- legality is validated through contract
- mutation happens through runtime pipeline
- outcomes are recorded for replay and observability

`ActionIntent` is a light forward-compatible semantic layer for tactical systems (not a rewrite mandate).

Illustrative intent categories:

- Move
- Attack
- Protect
- Retreat
- Pressure

---

## 10. Event-Driven Mutation Model

Target runtime model is event-driven:

`Action` -> `Event(s)` -> state mutation

not:

action handlers mutating arbitrary state directly across modules.

Examples:

- `MoveAction` -> `UnitMovedEvent`
- `AttackAction` -> `DamageEvent` -> `UnitKilledEvent` (when applicable)

Why this direction matters:

- deterministic replay
- rollback and debugability
- telemetry clarity
- coach explainability
- future multiplayer synchronization paths
- stable dataset extraction boundaries

---

## 11. Environment Boundary (Inspired Pattern)

Architecture adopts an environment boundary inspired by modern simulation/game interfaces (including concepts similar to OpenSpiel abstractions), without claiming OpenSpiel integration.

Boundary functions:

- `reset()`
- `legal_actions()`
- `step()`
- `observation()`
- `is_done()`

Contract rule:

- agents never mutate runtime state directly
- agents submit actions through boundary methods only

---

## 12. Observation Boundary

Neural/search systems must never consume raw `RuntimeState` directly.

They consume:

- `ObservationView`
- `ObservationEncoder` outputs

Benefits:

- fog-of-war compatible views
- spectator and coach views
- dataset schema stability
- telemetry isolation
- multi-agent compatibility

---

## 13. Legal Actions Contract

`legal_actions()` is a critical contract, not a convenience helper.

It is required for:

- action masking
- replay validation
- deterministic testing
- search stability
- self-play consistency
- future neural integration safety

Legal action ordering and determinism must be explicit and testable.

---

## 14. Agent Layer

Agents are external systems relative to runtime core.

Representative agent types:

- `RandomAgent`
- `HeuristicAgent`
- `SearchAgent`
- `NeuralAgent`
- `CoachAgent`
- `HumanAgent`

All agents operate only through:

- observations
- legal actions
- action submission

No agent receives authority to mutate runtime internals directly.

---

## 15. Automation / Dataset / Telemetry Layer

Automation should progressively stop depending directly on chess runtime internals. Current automation may still observe chess-specific surfaces until env/replay/telemetry contracts are available.

They should depend on:

- environment contracts
- replay APIs
- telemetry APIs
- dataset APIs

This is required for:

- stable self-play orchestration
- adapter portability beyond chess-only assumptions
- reproducible runs

Control-plane cleanup closure (PR67 / #126) does not imply architecture migration completion.

---

## 16. Determinism And Replay Baseline

Architecture baseline remains:

- deterministic RNG path
- stable action/event ordering
- replayability from recorded inputs
- snapshot/recovery compatibility

Benchmarks, latest pointers, and local reports remain diagnostic artifacts, not proof claims.

---

## 17. Memory/Context Preparation (Future-Oriented, Not Implemented)

Architecture should remain compatible with future bounded additions such as:

- tactical memory
- recent event history views
- objective tracking
- threat tracking

This section is preparation only, not implementation or behavior claim.

---

## 18. Phase Priorities (Updated)

### Phase 1

- contracts
- runtime cleanup
- 960 readiness
- initial state isolation

### Phase 2

- legal actions stabilization
- observation boundary
- event cleanup

### Phase 3

- adapter isolation
- replay stabilization
- automation stabilization

### Phase 4

- self-play
- search
- neural
- league

Ordering is intentional. Phase 4 systems must not drive premature architecture shortcuts in phases 1-3.

---

## 19. Migration Guardrails

Absolute constraints for migration:

- no massive rewrite
- keep current chess loop operational during extraction
- keep extraction bounded and fail-closed
- prefer small, verifiable interface moves over broad structural churn
- do not treat documentation updates as implementation completion

If architecture docs and runtime diverge, runtime remains authority until code migration lands.

---

## 20. Risk Posture And Claims

Primary risks during this consolidation phase:

- overclaiming progress from documentation changes
- coupling automation flows to chess internals
- leaking runtime internals directly into search/neural consumers
- breaking determinism while extracting contracts

Claim posture remains fixed:

- software_verdict and evidence_verdict are reported per change scope
- claim_verdict defaults to `NO_CLAIM_ALLOWED`
- no Elo/strength/promotion/scientific-proof claims from this document

This architecture pass is documentation consolidation only.
