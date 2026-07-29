# Architecture Guess — Systems, Patterns & Reusable Bricks

## Overview

This document reverse-engineers the probable architecture of three snake games, identifying system boundaries, design patterns, and candidate bricks that the studio could reuse from `knowledge_base/` or the frozen Pong reference (`games/pong/`).

**Method**: Observable behavior → inferred system design. No source code examined; architecture is reconstructed from mechanics, latency, and feedback patterns.

---

## GAME 1: Nokia Snake

### Probable System Architecture

```
┌─────────────────────────────────────────────────┐
│             Game Loop (Main Thread)             │
│  Tick Rate: ~10 Hz (100ms per frame)            │
└──────────────┬──────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    ┌───▼────┐    ┌──▼────┐
    │ Input  │    │ Update│
    │ System │    │ System│
    └───┬────┘    └───┬───┘
        │             │
        │             │
    ┌───▼─────────────▼───────────────────┐
    │  Game State                         │
    │  - snake: [{x, y}, {x, y}, ...]     │
    │  - food: {x, y}                     │
    │  - score: int                       │
    │  - speed: float                     │
    │  - game_over: bool                  │
    └──────────┬────────────────────────┘
               │
        ┌──────┴─────────┐
        │                │
    ┌───▼────┐      ┌───▼─────┐
    │Collision│     │ Render  │
    │ System │     │ System  │
    └────────┘     └────────┘
```

### System Descriptions

#### 1. Input System
- **Responsibility**: Poll numpad; capture direction change.
- **Input Model**: Discrete 4-way (UP, DOWN, LEFT, RIGHT); **direct** input (no buffering).
- **Constraints**: Snake cannot reverse (cannot go down if moving up).
- **Event Output**: `{direction_change: Direction}` or no-op if no valid input.

**Pattern**: **Command Pattern** — each numpad press is a command that updates the `desired_direction` state.

#### 2. Update System (State Machine)
- **Responsibility**: Apply tick logic; move snake; resolve collisions; spawn food; update score.
- **Tick Sequence**:
  1. Dequeue input commands; validate (no reverse).
  2. Move snake: add head in `desired_direction`; remove tail.
  3. Check collision (wall, self); if collision → `game_over = true`.
  4. Check food collision; if yes → don't remove tail (grow); spawn new food; increment score.
  5. Update difficulty (speed increase at score threshold).
  6. Mark state dirty (for rendering).

**Pattern**: **State Machine** — distinct states: `PLAYING`, `PAUSED`, `GAME_OVER`.

#### 3. Collision System
- **Responsibility**: Detect wall hits, self-hits, and food hits.
- **Algorithm**: 
  - Wall collision: `head.x < 0 || head.x >= grid_width || head.y < 0 || head.y >= grid_height`.
  - Self-collision: `head in snake_body[1:]` (check if head position matches any body segment except the neck).
  - Food collision: `head == food_position`.
- **Performance**: O(n) where n = snake length. Acceptable for n < 50.

#### 4. Render System
- **Responsibility**: Draw grid, snake, food, HUD.
- **Output**: Bitmap or vector graphics to screen.
- **Assets**:
  - Grid cells (8×8 or 10×10 pixels typical).
  - Snake segment sprite or color rectangle.
  - Food sprite (apple or similar icon).
  - Score display (text rendering).
- **Optimization**: Dirty rectangle rendering (only redraw changed cells).

**Pattern**: **Observer** — render system subscribes to state changes; only redraws dirty regions.

#### 5. Scoring System
- **Responsibility**: Track score; check win conditions (level progression).
- **Data**: `{score: int, high_score: int, level: int, lines_cleared: int}`.
- **Events**: Score increment on food eaten; level up on score threshold.

### Probable Data Model

```gdscript
# Pseudocode (GDScript-like)
class SnakeGame:
    var snake_body: Array[Vector2] = []  # Head at index 0
    var food: Vector2 = Vector2.ZERO
    var desired_direction: Vector2 = Vector2.RIGHT
    var current_direction: Vector2 = Vector2.RIGHT
    var score: int = 0
    var speed: float = 1.0
    var game_over: bool = false
    var grid_width: int = 20
    var grid_height: int = 20
    var tick_count: int = 0

    func _on_input_direction_change(dir: Vector2) -> void:
        if dir != -current_direction:  # Prevent reverse
            desired_direction = dir

    func _on_tick() -> void:
        current_direction = desired_direction
        var head = snake_body[0] + current_direction
        
        if _is_wall_collision(head) or _is_self_collision(head):
            game_over = true
            return
        
        snake_body.insert(0, head)
        
        if _is_food_collision(head):
            score += 1
            food = _spawn_food()
        else:
            snake_body.pop_back()  # Remove tail if not growing
        
        if score % 10 == 0:
            speed += 0.1  # Difficulty ramp

    func _is_self_collision(pos: Vector2) -> bool:
        return pos in snake_body.slice(1)  # Exclude head
```

### Reusable Bricks

| Brick | Source | Applicability | Notes |
|-------|--------|----------------|-------|
| **Game Loop** | Pong (games/pong/) | ✅ Direct reuse | Same tick-driven architecture; snake just needs different tick logic |
| **Input Handler** | Pong (games/pong/) | ✅ Direct reuse | Pong uses arrow keys/paddle; snake needs direction commands; adapter minimal |
| **Collision Detector** | Pong (games/pong/) | ⚠️ Partial reuse | Pong detects ball-paddle & ball-wall; snake needs snake-self & snake-wall; rebuild for grid |
| **Canvas Renderer** | Pong (games/pong/) | ✅ Direct reuse | Both render to 2D canvas; snake just draws different entities |
| **Score Display** | Pong (games/pong/) | ✅ Direct reuse | Identical HUD counter logic |
| **Game Over Screen** | Pong (games/pong/) | ✅ Direct reuse | Same exit pattern; reuse screen template |
| **State Machine** | knowledge_base/ (if FSM bricks exist) | ⚠️ Partial reuse | Game states (PLAYING, PAUSED, GAME_OVER) are generic |
| **Grid Utility** | knowledge_base/ (if grid/tilemap bricks exist) | ✅ Reuse if available | Snake is grid-based; KB may have reusable grid wraparound logic |

**Conclusion**: Pong's core loop, input, render, and scoring are **directly reusable**. Collision detection needs specialization for grid + self-collision.

---

## GAME 2: slither.io

### Probable System Architecture

```
┌──────────────────────────────────────────────────────────┐
│             Multiplayer Server (Backend)                 │
│  - Authority: validates moves, detects collisions         │
│  - Broadcast: sends state updates to all clients          │
│  - Tick Rate: ~60 Hz (16ms per frame)                     │
└──────────────┬───────────────────────────────────────────┘
               │ Network (UDP/WebSocket)
        ┌──────┴──────────────────────────┐
        │                                 │
    ┌───▼────────────────────┐  ┌────────▼──────────────┐
    │  Client: Input         │  │  Server: World State  │
    │  - Mouse/touch steer   │  │  - All snakes         │
    │  - Boost activation    │  │  - All food particles │
    │  - Smooth prediction   │  │  - Leaderboard rank   │
    └─────────────────────────┘  └──────────────────────┘
            │                             │
            └─────────┬───────────────────┘
                      │
           ┌──────────▼──────────┐
           │  Render System      │
           │  (Client-side)      │
           │  - Draw snakes      │
           │  - Draw food        │
           │  - Draw HUD (rank)  │
           └────────────────────┘
```

### System Descriptions

#### 1. Input System (Client-Side)
- **Responsibility**: Capture mouse position or touch swipe; compute steering angle.
- **Input Model**: Continuous 2D heading (theta in radians, 0-2π).
- **Constraints**: Server applies angular velocity limit (max ±90° per tick).
- **Event Output**: `{heading: float, boost_active: bool}` streamed to server every tick.

**Pattern**: **Command Pattern** — steering input is a continuous stream of "look at this angle" commands.

#### 2. Network System (Serialization & Replication)
- **Responsibility**: Serialize and transmit snake state to other clients.
- **Bandwidth Optimization**: 
  - Only send **delta** (position, length, direction change).
  - Use quantization (e.g., 16-bit fixed-point for coordinates).
  - Coalesce multiple ticks if network lag present.
- **Latency Compensation**: Client predicts opponent positions; server corrections are smooth (interpolated).

**Pattern**: **Observer** (reactive) + **Command** (input replication).

#### 3. Server Physics/Movement System
- **Responsibility**: Authoritative movement; no client-side prediction allowed for collision.
- **Tick Sequence**:
  1. Receive input from all clients.
  2. Update snake positions (head + body segments).
  3. **Collision detection**: Check all snakes for mutual collisions.
  4. If collision: mark snake as dead; convert body segments to food particles.
  5. Spawn new food particles.
  6. Broadcast updated state to all clients.

**Pattern**: **Event Bus** (server publishes collision/death events to clients).

#### 4. Collision System (Server-Side)
- **Responsibility**: Detect snake-vs-snake and snake-vs-self collisions.
- **Algorithm**: Spatial hash or quadtree for broad-phase (identify candidate collisions); then precise segment-hit test.
- **Constraints**: Must be authoritative; client predictions are advisory only.

#### 5. Rendering System (Client-Side)
- **Responsibility**: Smooth animation of all snakes; draw at higher frame rate than server tick (client interpolation).
- **Technique**: 
  - Receive server state at 60 Hz (or less).
  - Render at 60 Hz by interpolating between received positions.
  - Camera follows player's snake (player-centric viewport).
- **Assets**: Thematic skins; particle effects for death explosions.

### Probable Data Model

```gdscript
# Server-side state
class SnakeState:
    var id: String  # Player ID
    var head: Vector2
    var body_segments: Array[Vector2]
    var velocity: Vector2  # Direction (unit vector) * speed
    var mass: float  # Length
    var is_alive: bool = true
    var skin_id: String

class WorldState:
    var snakes: Dictionary  # id -> SnakeState
    var food_particles: Array[{pos: Vector2, mass: float}]
    var leaderboard: Array[{id: String, mass: float}]

# Client-side prediction
class LocalSnake:
    var server_state: SnakeState
    var predicted_position: Vector2  # Interpolated between ticks
    var visual_heading: float  # Smoothly animated toward input heading
```

### Reusable Bricks

| Brick | Source | Applicability | Notes |
|-------|--------|----------------|-------|
| **Game Loop** | Pong (games/pong/) | ⚠️ Not directly | Pong is single-player; snake needs multiplayer server loop + client render loop |
| **Input Handler** | knowledge_base/ (if analog steering bricks exist) | ⚠️ Partial reuse | Snake uses continuous heading; mouse/touch abstraction needed |
| **Collision Detector** | knowledge_base/ (if spatial hash/quadtree exists) | ✅ Reuse if available | Multiplayer collision is complex; reusing a proven spatial structure saves time |
| **Network Replication** | knowledge_base/ (if networking briques exist) | ⚠️ Partial reuse | Generic network replication; needs snake-specific schema |
| **Render System** | Pong (games/pong/) | ⚠️ Partial reuse | Pong renders 2D; slither needs sprite-based rendering + skin system + particle effects |
| **Leaderboard Display** | knowledge_base/ (if social/UI bricks exist) | ✅ Reuse if available | Standard leaderboard rendering; slither just needs rank update logic |
| **State Machine** | knowledge_base/ (if FSM exists) | ✅ Reuse | Snake states (ALIVE, DEAD) are generic |

**Conclusion**: slither.io is **architecture-heavy** (multiplayer server, network replication). Pong's single-player loop is insufficient; knowledge_base should provide networking bricks. Collision detection is critical and should reuse proven spatial structures.

---

## GAME 3: Google Snake

### Probable System Architecture

```
┌──────────────────────────────────────┐
│        Game Loop (Main Thread)       │
│  Tick Rate: ~10 Hz (100ms per frame) │
└────────────┬─────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
  ┌───▼────┐    ┌──▼────┐
  │ Input  │    │ Update│
  │ System │    │ System│
  └───┬────┘    └───┬───┘
      │             │
      │ ┌───────────┼────────────────────┐
      │ │ Game State                     │
      │ │ - snake: [{x, y}, ...]         │
      │ │ - food: {x, y}                 │
      │ │ - score: int                   │
      │ │ - power_up: Power | null       │
      │ │ - game_over: bool              │
      │ └────────┬─────────────────────┘
      │          │
      └──────────┼──────────┐
               │ │          │
           ┌───▼─▼───┐   ┌──▼─────┐
           │Collision│  │ Render  │
           │ System  │  │ System  │
           └────────┘   └────────┘
```

### System Descriptions

#### 1. Input System
- **Responsibility**: Poll arrow keys or touch swipe; queue direction command.
- **Input Model**: Discrete 4-way (UP, DOWN, LEFT, RIGHT); **buffered** (queued for next tick).
- **Buffering**: If player presses "UP" while moving right, the input is queued and executed on the next tick. This improves perceived responsiveness.
- **Event Output**: `{direction_queued: Direction | null}` or dequeue if buffer has pending command.

**Pattern**: **Command Pattern** with **queue** (improves latency perception).

#### 2. Update System (State Machine)
- **Responsibility**: Apply tick logic; similar to Nokia, but with power-up support.
- **Tick Sequence**:
  1. Dequeue input; validate.
  2. Move snake; check collisions.
  3. Check food; check power-ups.
  4. Update power-up timers (if active).
  5. Mark dirty.

**Pattern**: **State Machine** (PLAYING, PAUSED, GAME_OVER) + **Timer** (power-up duration).

#### 3. Power-Up System
- **Responsibility**: Spawn, track, and apply temporary buffs.
- **Types**: Double Points, Slow-Motion, Invincibility.
- **Mechanics**:
  - **Double Points**: Next food eaten grants 2 score; expires after 1 food or 10 seconds.
  - **Slow-Motion**: Reduce tick rate by 50% for 5 seconds.
  - **Invincibility**: Ignore collisions for 3 seconds.
- **Spawn Logic**: Random chance (e.g., 10% per food eaten) to spawn power-up at food location.

**Pattern**: **Buff/Debuff System** (temporary state modifiers).

#### 4. Collision System
- **Responsibility**: Detect wall hits, self-hits, food hits, power-up hits.
- **Algorithm**: Same as Nokia (O(n) self-check).

#### 5. Render System
- **Responsibility**: Draw grid, snake, food, power-ups, HUD.
- **Theme Support**: Background, snake colors, food icon vary by theme.
- **Assets**: Theme-specific sprite sheet or CSS variables for colors.

### Probable Data Model

```gdscript
class PowerUp:
    enum Type { DOUBLE_POINTS, SLOW_MOTION, INVINCIBILITY }
    var type: Type
    var remaining_time: float
    var position: Vector2  # For rendering
    var consumed: bool = false

class SnakeGame:
    var snake_body: Array[Vector2]
    var food: Vector2
    var score: int = 0
    var high_score: int = 0
    var active_power_up: PowerUp | null = null
    var power_up_available: PowerUp | null = null  # Spawned but not consumed
    var slow_motion_active: bool = false
    var invincibility_active: bool = false
    var game_over: bool = false
    var tick_rate: float = 1.0  # Reduced to 0.5 if SLOW_MOTION active

    func _on_tick() -> void:
        # Input, movement, collision (same as Nokia)
        # + new: power-up handling
        if active_power_up and active_power_up.remaining_time <= 0:
            _deactivate_power_up()
        if power_up_available and _is_food_collision(snake_body[0]):
            _activate_power_up()
```

### Reusable Bricks

| Brick | Source | Applicability | Notes |
|-------|--------|----------------|-------|
| **Game Loop** | Pong (games/pong/) | ✅ Direct reuse | Identical tick-driven architecture |
| **Input Handler (Buffered)** | knowledge_base/ (if exists) | ✅ Reuse if available | Buffering improves UX; should exist in KB |
| **Collision Detector** | Pong (games/pong/) or Nokia | ✅ Reuse | Reuse or adapt from Nokia analysis above |
| **Canvas Renderer** | Pong (games/pong/) | ✅ Direct reuse | Same 2D grid rendering |
| **Buff/Debuff System** | knowledge_base/ (if status effect bricks exist) | ✅ Reuse if available | Generic temporary modifier system; power-ups fit this pattern |
| **Timer Manager** | Pong (games/pong/) or knowledge_base/ | ✅ Reuse | Power-up durations need timer ticks |
| **Score Display** | Pong (games/pong/) | ✅ Direct reuse | Identical HUD counter |
| **Theme/Skinning System** | knowledge_base/ (if skinning bricks exist) | ✅ Reuse if available | Google Snake uses themes; generic skinning system would fit |

**Conclusion**: Google Snake is **very similar to Nokia**; Pong's core loop is directly reusable. The main addition is the power-up system, which should reuse a generic buff/debuff brick if available in knowledge_base.

---

## Cross-Game Pattern Analysis

### Design Patterns Observed

| Pattern | Nokia | slither.io | Google | Applicability |
|---------|-------|-----------|--------|----------------|
| **State Machine** | ✅ (PLAYING, PAUSED, GAME_OVER) | ✅ (ALIVE, DEAD) | ✅ (PLAYING, PAUSED, GAME_OVER) | **Universal**; reuse from KB or Pong |
| **Command Pattern** | ✅ (direction input) | ✅ (steering + boost) | ✅ (direction + buffered) | **Universal**; input is always a command stream |
| **Event Bus** | ⚠️ (implicit) | ✅ (multiplayer events) | ⚠️ (implicit) | **Recommended** for clean architecture |
| **Observer (Render)** | ✅ (dirty rect rendering) | ✅ (client-side) | ✅ (dirty rect) | **Universal**; render subscribes to state |
| **Object Pool** | ⚠️ (food particles) | ✅ (heavy use for corpse particles) | ⚠️ (power-ups) | **Important for performance** if many objects |
| **Spatial Partitioning** | ✗ (not needed; grid is small) | ✅ (critical; 100+ snakes) | ✗ (not needed) | **Conditional**; only for multiplayer or large worlds |

### Architecture Layers

All three games follow a **layered architecture**:

```
┌──────────────────────┐
│  Presentation Layer  │  Render, UI, Sound
├──────────────────────┤
│  Domain Layer        │  Game rules, state, collision
├──────────────────────┤
│  Input/Output Layer  │  Input handling, network (slither only)
└──────────────────────┘
```

**Benefit**: Separation of concerns. Game logic is independent of rendering; collision detection can be tested without graphics.

---

## Candidate Reusable Bricks Summary

### From Pong (games/pong/)

These are **directly reusable** with minimal adaptation:

1. **Game Loop** — Tick-driven main loop; just swap the update function
2. **Input Handler** — Direction command abstraction; buffer for Google Snake
3. **Canvas Renderer** — 2D drawing to canvas/screen
4. **Score Display HUD** — Counter rendering and update
5. **Game Over Screen** — Exit screen template
6. **State Machine (basic)** — PLAYING, PAUSED, GAME_OVER states

**Reuse Ratio**: ~70% of code for a single-player snake (Nokia/Google).

### From knowledge_base/ (Assumed Available)

These should be searched before building:

1. **Collision Detection (Grid)** — If KB has grid-based collision, reuse; saves O(n²) bugs
2. **Buff/Debuff System** — Generic temporary modifier system; power-ups fit naturally
3. **Timer Manager** — Countdown timers for power-ups, difficulty ramps
4. **Input Buffering** — Queued input abstraction; improves perceived latency
5. **Spatial Partitioning** (Optional) — If multiplayer is planned; slither.io uses for collision
6. **Leaderboard System** (Optional) — Generic score ranking and display
7. **Skinning/Theme System** (Optional) — Google Snake uses themes; generic system would help

**Assumption**: If these exist in KB, reuse them. If not, create them and catalog in KB for the next project.

---

## Architecture Recommendations for Studio Snake

### For a Single-Player Snake (Nokia/Google-style)

**Recommended Approach**:
1. Reuse Pong's game loop and input handler.
2. Reuse Pong's canvas renderer.
3. Implement grid-based collision (search KB first; if not found, write and catalog).
4. Implement power-up system using KB's buff/debuff if available.
5. Use Pong's score display and game over screen.

**Estimated Reuse Ratio**: ~70%

### For a Multiplayer Snake (slither.io-style)

**Recommended Approach**:
1. Use Pong's client-side render loop as a foundation.
2. Implement a multiplayer server authority model (likely custom; no snake-specific KB exists).
3. Implement network replication (search KB for generic networking brick).
4. Use spatial partitioning for collision (search KB; if not found, use quadtree library).
5. Implement leaderboard (search KB).

**Estimated Reuse Ratio**: ~40% (multiplayer adds significant complexity)

---

## Critical Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **Collision Detection Bugs** (especially self-collision) | Write comprehensive unit tests; reuse proven KB brick if available |
| **Input Latency Perception** (player feels unresponsive) | Use input buffering (Google Snake model); test on target hardware |
| **Performance on Low-End Devices** (mobile, old hardware) | Profile early; use object pooling for particles; avoid dynamic allocation in tick loop |
| **Multiplayer Server Load** (slither.io-style) | Implement spatial hashing; compress network packets; rate-limit client updates |
| **Cosmetic System Scope Creep** | Define upfront: cosmetics are skins only; no gameplay impact |

---

## Observable vs. Hidden Systems

Per the FORGE_ARCHITECT_MANUAL (principle: `observable_by_player` is a design constraint), here's what the player sees:

| System | Observable? | Why? |
|--------|------------|------|
| Game Loop | Partially (via tick rate) | Player sees smooth/choppy movement |
| Input Handling | ✅ Yes | Player sees immediate response to input |
| Collision Detection | ✅ Yes | Player sees snake die on collision |
| Rendering | ✅ Yes | Player sees all visuals |
| Scoring | ✅ Yes | Player sees score counter |
| Power-Up System | ✅ Yes (if present) | Player sees buff activate |
| Network Replication | Partially (via lag) | Player sees smooth vs. laggy movement |
| Spatial Partitioning | ✗ No | Hidden optimization; player doesn't see it |

**All systems have an observable layer.** None can be hidden indefinitely.

---

**Observation Date**: 2026-07-28  
**Games Analyzed**: 3  
**Patterns Identified**: 6  
**Reusable Brick Candidates**: 15+  
**Critical Dependency Chains**: Input → Update → Collision → Render
