# AAA Tactical Core Architecture

Status: strategic architecture document  
Project: TacticalChessPureLab / Tactical Chess Studio  
Target: progressive migration from chess AI lab to reusable tactical card-game engine  
Rule: active runtime code remains the authority; this document is a roadmap, not proof of implementation.

---

## 1. Vision

TacticalChessPureLab must evolve from a chess-focused AI laboratory into a reusable tactical game engine foundation.

The target is not only a stronger chess bot. The long-term product direction is a deterministic Rust core that can power several tactical/card games:

- tactical turn-based board combat
- card/deck/hand/discard gameplay
- terrain and zone effects
- status, aura, trap, weather and rule-mutation systems
- AI opponent, ally AI, coach AI and adaptive profile
- deterministic simulation for balance and debugging
- content validation and generation tools
- future client integration through Godot, Unity, Flutter or native mobile/PC frontends

Rust remains the runtime truth. Python remains valuable for ML, dataset generation, analysis, batch experiments and training, but must not be required by the final game runtime.

---

## 2. Current Repo Reality

### 2.1 Active authority

Use this authority order:

1. active source code
2. build files, manifests and runtime outputs
3. current benchmark outputs
4. current docs
5. historical docs and archives only as context

If this document disagrees with active source code, source code wins.

### 2.2 Current active code families

Current active Rust entry/module surface:

```text
src/main.rs
src/agents/
src/chess/
src/engine/
src/prototype/
src/simulation/
src/tool/
src/tournament/
```

Current active ML/lab surface:

```text
ml/
models/
lab/
MASTER_DOCS/
```

### 2.3 Current runtime split

Rust currently owns:

- board state
- legal move generation
- chess rule enforcement
- search
- decision routing
- teacher generation
- tournament execution
- CLI runtime surface

Python currently owns:

- dataset loading
- dataset validation
- training
- checkpoint writing
- inference service for neural agent
- analysis/orchestration tooling

### 2.4 Current important files

Rust:

```text
src/main.rs
src/tool/cli.rs
src/engine/engine.rs
src/engine/mod.rs
src/chess/search.rs
src/chess/decision.rs
src/agents/neural_agent.rs
src/agents/retrieval.rs
src/simulation/simulation_runner.rs
src/simulation/neural_tournament_runner.rs
src/simulation/selfplay.rs
src/simulation/teacher_uci_runner.rs
src/tool/puzzle_eval.rs
src/tool/puzzle_rng.rs
src/tool/conversion_suite.rs
src/prototype/runtime_ruleset.rs
src/prototype/minimal_ruleset.rs
```

Python:

```text
ml/train.py
ml/dataset_loader.py
ml/export_dataset_check.py
ml/infer_policy.py
ml/move_vocab.py
```

Lab/contracts:

```text
lab/ACTIVE_DATASET.txt
lab/ACTIVE_EXPERIMENT.txt
lab/datasets/
lab/runs/
lab/experiments/
lab/reports/
models/latest.pt
models/best.pt
models/latest_run.json
```

---

## 3. Strategic Refactor Doctrine

Do not replace the chess engine directly.

The correct path is parallel extraction:

```text
existing chess runtime remains operational
        ↓
new generic tactical core grows beside it
        ↓
prototype card tactics validates the core
        ↓
chess adapter gradually maps chess concepts into generic interfaces
        ↓
AI/search/eval become rule-agnostic over stable interfaces
```

Forbidden approach:

```text
rewrite src/engine + src/chess in one large destructive refactor
```

Required approach:

```text
small modules
feature-gated or isolated prototypes
cargo test stays green
benchmarks remain runnable
puzzle_eval remains runnable
old chess lab remains valid until replacement is proven
```

---

## 4. Target Architecture

Long-term source shape:

```text
src/
├── core/
├── map/
├── cards/
├── effects/
├── rules/
├── ai/
├── simulation/
├── puzzle/
├── games/
├── ffi/
└── tool/
```

Migration note: current `src/engine` and `src/chess` should not be deleted. They become either:

1. the first backend implementation feeding the generic architecture, or
2. a legacy chess adapter kept until `games/tactical_chess.rs` is mature.

---

## 5. Module Responsibilities

### 5.1 `core/`

Purpose: pure deterministic state and action foundation.

Target files:

```text
core/game_state.rs
core/player.rs
core/entity.rs
core/unit.rs
core/stats.rs
core/action.rs
core/action_log.rs
core/ids.rs
core/rng.rs
core/serialization.rs
core/deterministic.rs
```

Core types:

```rust
GameState
PlayerId
TeamId
EntityId
UnitId
CardInstanceId
Action
ActionLog
ActionOutcome
DeterministicRng
Snapshot
```

Rules:

- no UI
- no Python dependency
- no global mutable runtime state
- deterministic by seed
- every action must be loggable
- state must be clonable or reversible for AI simulation
- all IDs must be stable and explicit

### 5.2 `map/`

Purpose: board/grid/map, terrain, zones and movement helpers.

Target files:

```text
map/board.rs
map/coord.rs
map/tile.rs
map/terrain.rs
map/zone.rs
map/pathfinding.rs
map/line_of_sight.rs
```

Core types:

```rust
Board
Coord
Tile
TerrainDef
Zone
PathQuery
LineOfSightQuery
```

### 5.3 `cards/`

Purpose: data-driven card definitions and runtime card containers.

Target files:

```text
cards/card_def.rs
cards/card_instance.rs
cards/deck.rs
cards/hand.rs
cards/discard.rs
cards/card_loader.rs
cards/card_validator.rs
```

Core types:

```rust
CardDef
CardInstance
Deck
Hand
DiscardPile
ExhaustPile
CardDatabase
```

Card definitions must be content data, not hardcoded branches.

Forbidden:

```rust
if card_id == "fireball" { ... }
```

Required:

```rust
EffectResolver::resolve(effect_def, context)
```

### 5.4 `effects/`

Purpose: generic effect language and deterministic resolver.

Target files:

```text
effects/effect_def.rs
effects/effect_context.rs
effects/effect_resolver.rs
effects/targeting.rs
effects/condition.rs
effects/trigger.rs
effects/event.rs
effects/event_queue.rs
effects/status_effect.rs
```

Initial generic effects:

```text
Damage
Heal
DrawCard
DiscardCard
GainResource
SpendResource
SummonUnit
MoveUnit
Push
Pull
Teleport
Attack
ApplyStatus
RemoveStatus
ModifyStat
Shield
Silence
Stun
Root
Burn
Poison
Freeze
Transform
Destroy
Revive
CopyCard
GenerateCard
ModifyCost
ModifyRange
ModifyTerrain
SpawnTrap
CreateZone
AddRuleMutation
RemoveRuleMutation
```

Phase 3 must start with about 10 robust effects, not all 80 at once.

### 5.5 `rules/`

Purpose: ruleset, legality, turns, resources, victory and rule mutation runtime.

Target files:

```text
rules/ruleset.rs
rules/turn_system.rs
rules/resource_system.rs
rules/win_condition.rs
rules/legality.rs
rules/rule_mutation.rs
rules/rules_runtime.rs
```

Core interfaces:

```rust
RulesRuntime
LegalActionGenerator
RuleMutation
WinCondition
TurnSystem
ResourceSystem
```

The generic AI must ask this layer for legality and rule-modified values.

### 5.6 `ai/`

Purpose: rule-agnostic AI surfaces.

Target files:

```text
ai/agent.rs
ai/search.rs
ai/evaluation.rs
ai/policy.rs
ai/difficulty.rs
ai/adaptive_profile.rs
ai/coach.rs
ai/explanation.rs
ai/planner.rs
ai/simulation_ai.rs
```

Core AI modes:

```text
OpponentAI
AllyAI
CoachAI
SimulationAI
```

Coach output:

```rust
CoachExplanation {
    recommended_action,
    reason_short,
    tactical_motifs,
    risks,
    alternatives,
    confidence,
    player_skill_tag,
}
```

### 5.7 `simulation/`

Purpose: deterministic match execution and batch simulation.

Current simulation module exists and must remain compatible.

Future target files:

```text
simulation/simulator.rs
simulation/rollout.rs
simulation/batch_runner.rs
simulation/self_play.rs
simulation/scenario.rs
simulation/balance.rs
```

### 5.8 `puzzle/`

Purpose: puzzle generation, evaluation and reports.

Current puzzle tools exist through CLI. Do not break them.

Future target files:

```text
puzzle/puzzle.rs
puzzle/puzzle_generator.rs
puzzle/puzzle_eval.rs
puzzle/puzzle_report.rs
```

### 5.9 `games/`

Purpose: concrete game adapters built on the generic core.

Target files:

```text
games/tactical_chess.rs
games/prototype_card_tactics.rs
games/mod.rs
```

This is where chess-specific and prototype-card-tactics glue should live once the generic interfaces exist.

### 5.10 `ffi/`

Purpose: future client interface boundary.

Target files:

```text
ffi/c_api.rs
ffi/godot_bridge.rs
ffi/unity_bridge.rs
ffi/mobile_bridge.rs
```

Not priority until core/card/effect scenario is proven.

---

## 6. Public Engine Interface Target

The final Rust core should expose simple, frontend-safe calls:

```rust
load_card_database(path) -> Result<CardDatabase>
validate_content(database) -> ValidationReport
new_game(scenario, seed) -> GameHandle
list_legal_actions(game) -> Vec<LegalAction>
apply_action(game, action) -> ActionOutcome
undo_action(game) -> Result<()>
get_public_state(game, viewer) -> PublicGameState
get_ai_recommendation(game, agent_config) -> AiRecommendation
get_coach_hint(game, viewer, hint_level) -> CoachExplanation
save_state(game) -> SaveState
load_state(save) -> GameHandle
```

For UI clients, the Rust core must not own rendering, animation, drag/drop, audio, menus, shop, account, monetization or tactile UI.

---

## 7. Data-Driven Card/Effect Strategy

### 7.1 Card schema direction

Initial JSON-like shape:

```json
{
  "id": "fire_strike",
  "cost": 2,
  "target": { "kind": "enemy_unit", "range": 3 },
  "effects": [
    { "type": "damage", "amount": 4 },
    { "type": "apply_status", "status": "burn", "duration": 2 }
  ]
}
```

### 7.2 Content validation must catch

- missing card IDs
- duplicate card IDs
- invalid effect type
- missing effect parameters
- invalid target rule
- impossible cost
- invalid status reference
- invalid terrain reference
- recursion/infinite generation risk
- unsafe random behavior without seed path
- card too complex for target game mode

### 7.3 No hardcoded card behavior

The only acceptable hardcoded logic is generic effect semantics.

Example:

```text
Damage amount N to target
ApplyStatus status_id for duration D
DrawCard count N
ModifyTerrain terrain_id at coord
```

Card-specific combos must be content composition, not Rust branches.

---

## 8. Rule Mutation Strategy

Rule mutations are temporary or permanent modifiers that alter rules at runtime.

Examples:

```text
all cards cost -1 this turn
burned units take +1 damage
swamp terrain blocks dash
ranged attacks have -1 range
healing becomes damage
cards played twice trigger bonus
fallen units become obstacles
board changes at end of turn
```

Target API:

```rust
trait RuleMutation {
    fn id(&self) -> RuleMutationId;
    fn modify_cost(&self, input: CostQuery, ctx: &RulesContext) -> CostQuery;
    fn modify_damage(&self, input: DamageQuery, ctx: &RulesContext) -> DamageQuery;
    fn modify_range(&self, input: RangeQuery, ctx: &RulesContext) -> RangeQuery;
    fn modify_legal_targets(&self, input: TargetQuery, ctx: &RulesContext) -> TargetQuery;
    fn on_event(&self, event: &GameEvent, ctx: &mut RulesContext) -> Vec<EffectDef>;
}
```

Implementation rule:

- Phase 4 starts with a small enum-based mutation set.
- Later versions can load declarative mutations from content data.
- Mutations must be ordered deterministically.
- Conflicts must be logged and testable.

---

## 9. Determinism Strategy

Every simulation must be reproducible.

Requirements:

- one deterministic RNG type in Rust
- seed recorded in scenario/replay/report
- no hidden OS randomness in runtime decisions
- deterministic ordering for maps, units, effects and triggers
- stable action IDs where possible
- all random effects consume RNG through explicit context
- replay file can reproduce a bug
- AI batch simulation can restore exact states

Avoid:

- unordered `HashMap` iteration for gameplay decisions unless sorted before use
- global mutable state
- wall-clock time in gameplay logic
- Python subprocess dependency in final game runtime

---

## 10. AI Strategy

### 10.1 OpponentAI

Uses:

- legal action generation
- heuristic evaluation
- shallow simulation/search
- policy/rerank layer
- difficulty controls
- adaptive profile constraints

Must not cheat invisibly. Any adaptation should be player-readable and tunable.

### 10.2 AllyAI

Goals:

- assist the player
- create combos
- protect player plans
- avoid stealing all agency
- explain suggestions when asked

AllyAI requires a cooperation policy, not just strongest-move search.

### 10.3 CoachAI

Coach explains decisions without necessarily playing.

Coach should expose:

- best action
- safe alternative
- aggressive alternative
- threat warning
- combo hint
- risk summary
- confidence
- player skill tag

### 10.4 AdaptiveProfile

Tracks:

```text
player style
skill level
aggression
risk tolerance
favorite cards/units
frequent mistakes
missed combos
decision time
puzzle success
ideal difficulty
```

Can adjust:

```text
enemy difficulty
search depth
deck composition
puzzle type
hint frequency
AI aggression
mechanic complexity
rule introduction speed
```

Hard rule: adaptation must improve learning/fun, not punish the player invisibly.

---

## 11. Mobile/PC Strategy

Rust core must be presentation-agnostic.

Client responsibilities:

- rendering
- animation
- sound
- VFX
- input/touch
- drag/drop
- camera
- menus
- progression
- shop
- online/social

Rust responsibilities:

- validate content
- create game
- list legal actions
- apply actions
- emit events
- expose public state
- produce AI/coach recommendations
- serialize saves/replays

Bridge order:

1. CLI JSON protocol for development
2. C ABI or static library prototype
3. Godot/Unity/Flutter bridge only after stable core API
4. mobile release profile after performance and serialization tests

---

## 12. Testing and Benchmark Strategy

### 12.1 Always preserve current validation commands

Current important commands:

```bash
cargo test
cargo build
cargo build --release
cargo run -- puzzle_eval --input lab/puzzles/puzzle_rng_mate1_seed42.jsonl --agent hybrid
cargo run -- bench
```

Current CLI surface also includes:

```bash
cargo run -- simulate N
cargo run -- analyze N
cargo run -- selfplay N
cargo run -- selfplay_teacher N
cargo run -- neural_pick
cargo run -- neural_tournament N
cargo run -- neural_smoke
cargo run -- benchmark --smoke --games 2
cargo run -- engine_validation N
cargo run -- search_profile D
cargo run -- conversion_case
cargo run -- conversion_suite N
cargo run -- puzzle_rng --theme mate1 --count N --seed N
cargo run -- puzzle_eval --input <path> --agent search|hybrid|heuristic
```

If `bench` is not wired in the current branch, use `benchmark`, `engine_validation`, `search_profile`, and `conversion_suite` as the active substitutes until a real `bench` command exists.

### 12.2 New tests required for tactical core

Phase 2 tests:

```text
core_action_log_records_actions
core_snapshot_restore_roundtrip
core_rng_same_seed_same_result
core_legal_actions_stable_order
core_apply_action_reversible
```

Phase 3 tests:

```text
effect_damage_reduces_hp
effect_heal_caps_at_max_hp
effect_draw_card_moves_deck_to_hand
effect_apply_status_records_duration
event_queue_fifo_or_priority_order_is_deterministic
card_validator_rejects_unknown_effect
card_validator_rejects_duplicate_ids
scenario_card_tactics_runs_to_completion
```

Phase 4 tests:

```text
rule_mutation_cost_minus_one_applies_this_turn_only
rule_mutation_burn_damage_bonus_applies_conditionally
rule_mutation_order_is_deterministic
rule_mutation_event_hook_emits_effect
```

### 12.3 Benchmark rules

For performance/AI claims:

- record model/dataset/seed/opponents/settings
- compare against baseline
- do not use smoke tests as strength proof
- do not promote result without reproducibility
- keep chess benchmark separate from tactical-card prototype benchmark

---

## 13. Migration Plan

### Phase 1 — Stabilize current chess lab

Goal: preserve the existing lab.

Tasks:

- keep `cargo test` green
- keep `cargo build` green
- keep puzzle eval runnable
- keep benchmark/neural tournament commands runnable
- document active modules
- avoid large refactors in `src/chess/search.rs` unless directly tied to current conversion recovery
- mark chess-specific logic that can later be abstracted

Exit criteria:

- current chess runtime still works
- current ML bridge still works
- architecture doc exists
- no feature regression

### Phase 2 — Extract generic core skeleton

Goal: create generic modules without taking over runtime.

Add:

```text
src/core/mod.rs
src/core/ids.rs
src/core/rng.rs
src/core/action.rs
src/core/action_log.rs
src/core/game_state.rs
src/map/mod.rs
src/map/coord.rs
src/map/board.rs
```

Do not yet rewire chess.

Exit criteria:

- generic core compiles
- unit tests pass
- no chess behavior changed

### Phase 3 — Cards/effects prototype

Goal: prove data-driven cards.

Add:

```text
src/cards/
src/effects/
lab/content/cards/prototype_card_tactics.json
lab/scenarios/prototype_card_tactics_seed42.json
```

Prototype content:

- 20 cards
- 10 effects
- 5 statuses
- 3 terrains
- 3 units
- 1 scenario

CLI:

```bash
cargo run -- validate_content lab/content/cards/prototype_card_tactics.json
cargo run -- simulate_card_scenario lab/scenarios/prototype_card_tactics_seed42.json
```

Exit criteria:

- content validation works
- scenario simulation works deterministically
- EffectResolver tests pass
- no card-specific hardcoding

### Phase 4 — RuleMutation minimal runtime

Goal: prove mutable rules without chaos.

Add:

- cost mutation
- damage mutation
- range mutation
- event hook mutation

Exit criteria:

- deterministic ordering
- tests for each mutation
- mutation report in action log
- no mutation leaks across scenario reset

### Phase 5 — Generic AI boundary

Goal: define rule-agnostic AI interfaces.

Add:

```text
src/ai/agent.rs
src/ai/evaluation.rs
src/ai/search.rs
src/ai/coach.rs
```

Do not replace chess AI immediately. Wrap current chess decision/search behind adapter interfaces.

Exit criteria:

- prototype card tactics can ask AI for legal-action recommendation
- coach explanation can describe one simple tactical decision
- chess AI remains unaffected

### Phase 6 — Chess adapter migration

Goal: map current chess runtime to generic concepts.

Tasks:

- define `games/tactical_chess.rs`
- map chess pieces to UnitDef/UnitKind
- map chess moves to generic Action
- map chess legal generation to LegalActionGenerator
- preserve existing chess-specific rules until adapter is proven

Exit criteria:

- chess adapter can run smoke scenarios
- current chess lab still runs
- no benchmark truth contamination

### Phase 7 — Production tools

Add tools for:

- content validation
- effect validation
- infinite combo detection
- batch simulation
- balance reports
- card stats
- replay reproduction
- schema export
- documentation generation

Target reports:

```text
lab/reports/balance_latest.json
lab/reports/card_stats_latest.json
lab/reports/ai_profile_latest.json
lab/reports/puzzle_eval_latest.json
lab/reports/simulation_summary_latest.md
```

### Phase 8 — Runtime library readiness

Goal: package Rust as reusable core.

Tasks:

- split library from CLI if needed
- expose stable API
- audit dependencies
- add serialization contract
- add replay contract
- add release build profile
- prototype FFI only after API stabilizes

---

## 14. Risks

### 14.1 Biggest risk: mixing active truth with archives

The repo contains active code, old docs, patches, archives, and historical plans. Never treat archived docs as runtime truth without source confirmation.

### 14.2 Biggest engineering risk: destructive refactor

A broad rewrite would likely break the working chess lab, ML pipeline and benchmark surface.

Mitigation:

- build new modules beside old modules
- migrate through adapters
- test every step

### 14.3 Biggest design risk: over-generic abstraction too early

A universal engine built before one card-tactics scenario works will become abstract junk.

Mitigation:

- first prove one small card scenario
- then generalize only repeated patterns

### 14.4 Biggest content risk: hardcoded card logic

Hardcoding cards will kill scalability.

Mitigation:

- keep Rust generic effect semantics only
- require content validation
- reject card-specific branches in review

### 14.5 Biggest AI risk: strength claims without benchmark proof

Pipeline existence is not strength.

Mitigation:

- keep benchmark truth separate
- record seeds/settings/results
- promote only reproducible gains

### 14.6 Biggest mobile risk: letting UI concerns invade core

Mitigation:

- Rust core emits events/state
- client renders everything
- no engine dependency on UI framework

---

## 15. Coding Conventions

- deterministic first
- explicit IDs
- small modules
- no hidden randomness
- no global mutable gameplay state
- stable iteration order for gameplay decisions
- data-driven content
- no card-specific Rust branches
- tests before broad migration
- reports in `lab/reports/`
- docs in `MASTER_DOCS/`
- examples in `lab/`
- Rust runtime independent from Python for final product

---

## 16. First Implementation Batch Recommendation

First safe Codex patch should be documentation + skeleton only:

Files to add:

```text
MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md
src/core/mod.rs
src/core/ids.rs
src/core/rng.rs
src/core/action.rs
src/core/action_log.rs
src/map/mod.rs
src/map/coord.rs
src/map/board.rs
```

Files to edit lightly:

```text
src/main.rs
```

Only add module declarations if the skeleton compiles cleanly.

Do not edit:

```text
src/chess/search.rs
src/engine/engine.rs
src/agents/neural_agent.rs
ml/train.py
```

for the first architecture skeleton patch unless a compile error requires a tiny import/module fix.

Validation:

```bash
cargo fmt
cargo test
cargo build
cargo run -- benchmark --smoke --games 2
```

If neural bridge is unavailable locally, record that benchmark was skipped and run:

```bash
cargo run -- engine_validation 1
cargo run -- puzzle_rng --theme mate1 --count 3 --seed 42
cargo run -- puzzle_eval --input lab/puzzles/puzzle_rng_mate1_seed42.jsonl --agent hybrid --limit 3
```

---

## 17. Definition of Done for the First Great Step

The first great step is complete when the repo contains:

- this architecture document
- generic core skeleton
- generic card/effect skeleton
- prototype content files
- content validation CLI
- deterministic scenario simulation
- EffectResolver unit tests
- EventQueue tests
- one simple RuleMutation test
- migration report explaining how current chess runtime maps to the new tactical core

Not required yet:

- full card game
- all 80 effects
- mobile bridge
- RL/MCTS
- replacing current chess engine
- deleting old modules

---

## 18. Final Doctrine

Build as if the project must live 10 years.

That means:

- preserve the working lab
- isolate experimental architecture
- make every simulation reproducible
- make every action explainable
- make every content rule validatable
- make every AI claim benchmarked
- make every frontend replaceable

The next evolution is not “more files”.

The next evolution is a stable tactical core that can interpret data-driven content, simulate deterministically, and let AI reason over rules without being hardcoded to chess or to one card.
