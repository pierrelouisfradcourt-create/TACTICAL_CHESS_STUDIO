# Progression Map — Four-Horizon Analysis

## GAME 1: Nokia Snake

### Minute 1: Boot
**Observable State**: Single snake (length 3) centered on grid; one food pellet; score: 0; speed: baseline.

**Player Action**: Learns the four-direction control. First food encounter happens within 5-10 seconds; snake grows to length 4. Player experiences immediate causality: "I ate, I grew."

**Feedback Loop**: Score display ticks up by 1; visual snake length increases. No penalty yet; collision risk is minimal at length 4 on a typical grid.

**Retention Hook**: "Let me eat one more." The loop is tight (action → growth) and the cost is zero.

**Source**: [Classic Snake Game](https://medium.com/@usmananwar9957/classic-snake-game-d31c3d174eba) (2026-07-28)

### Minute 10: Ramp
**Observable State**: Snake length 8-15; score 8-15; speed has increased 1-2 levels; space is noticeably tighter.

**Player Action**: Spatial awareness intensifies. Player must predict their tail position 2-3 moves ahead. First close calls with self-collision occur; player develops muscle memory for "wide turns."

**Difficulty Curve**: Speed increase is gradual. The difficulty does NOT spike; it's a steady pressure. This keeps frustration low and engagement steady.

**Retention Hook**: "I almost died but I'm still alive. How much further can I go?"

**Source**: [Nokia Snake Progression](https://theoriginalsnake.com/faq) (2026-07-28)

### Hour 5: Endgame
**Observable State**: Snake length 40+; score 40+; speed is 4-5 levels above baseline; grid is mostly occupied by player's own body.

**Player Action**: Game becomes a **pure spatial puzzle**. Each move is constrained to a few viable options. Success becomes rare; sessions end in self-collision after 30-60 seconds of high-tension play.

**Psychological State**: Player is in **deep focus**. Each keystroke carries weight. The tight space is the primary opponent, not the game mechanics.

**Retention Hook**: "I know I can do better. One more run."

**Source**: [Low-Level Design - Snake Game](https://www.lowleveldesign.io/LLD/GameDesign/SnakeGame) (2026-07-28)

### End State: Death
**Trigger**: Self-collision or wall hit; game displays "WASTED!" or score summary.

**Loop Reset**: Player can immediately restart; no penalty, no progression loss (classic arcade model).

**Why Restart?**: The short session length (5-10 minutes typical) combined with the clear, measurable goal (highest score) makes "just one more" compelling. No sunk-time cost barrier to re-entry.

**Source**: [Nokia Snake Wikipedia](https://nokia.fandom.com/wiki/Snake) (2026-07-28)

---

## GAME 2: slither.io

### Minute 1: Boot
**Observable State**: Tiny snake on a crowded map; hundreds of other players visible; pellets scattered everywhere; leaderboard shows top 10 snakes (some massive).

**Player Action**: Immediate survival mode. Player eats nearby pellets; avatar grows from length 1 to 3-5 within seconds. Early growth is fast and satisfying.

**Psychological Effect**: "Wow, there are a LOT of players here." The leaderboard visible at start creates a **clear goal hierarchy**. Player sees they are #2,847 out of thousands.

**Retention Hook**: "I want to climb that leaderboard."

**Source**: [slither.io Gameplay Mechanics](https://slitherio.fandom.com/wiki/Gameplay_Mechanics); [MDA Analysis](https://mechanicsofmagic.com/2022/04/11/mda-slither-io/) (2026-07-28)

### Minute 10: Mid-Game
**Observable State**: Player's snake is length 20-50; they've climbed to rank #1,000 on the server. Larger predators (length 100+) are visible; they move slowly but are lethal.

**Player Action**: **Foraging vs. Predation Trade-off** becomes visible. Player can:
- Farm pellets safely in edges (slow growth).
- Circle a large dead snake's corpse (risky but high-reward).

The **boost mechanic** enters play: hitting spacebar accelerates but consumes mass. Player learns this is a tool for escape, not sustainable growth.

**Retention Hook**: "I just outmaneuvered that bigger snake and stole their kill. I'm #500 now!"

**Source**: [MDA – Slither.io](https://mechanicsofmagic.com/2022/04/11/mda-slither-io/) (2026-07-28)

### Hour 5: Endgame (If Player Survives)
**Observable State**: Snake length 200+; player is rank #10-50 globally; map is dense with intense micro-wars; every move is tactical.

**Player Action**: Pure skill expression. Player reads other snakes' patterns, predicts boost windows, executes constriction tactics (trapping rivals in loops). Death is not a failure; it's a reset that refuels the leaderboard climb.

**Psychological State**: **Flow state**. PvP intensity is high; player is fully engaged in predator-prey dynamics.

**Retention Hook**: "The next session, I can rank higher. I understand the meta better now."

**Source**: [Emergent Gameplay - MDA Analysis](https://mechanicsofmagic.com/2022/04/11/mda-slither-io/) (2026-07-28)

### End State: Death & Reset
**Trigger**: Collision with any snake's body (including own).

**Loop Reset**: Instant respawn at length 1 on the same server. **No progression loss** (consistent with Nokia). Previous session's rank is forgotten; leaderboard is real-time.

**Why Replay Endlessly?**: The leaderboard is **addictive feedback**. Each session is a self-contained micro-narrative: "Am I better this run than last run?" Combined with the **0-friction restart** (instant), players chain sessions for hours.

**Source**: [slither.io App Review](https://marlvel.ai/intel-report/games/slither-io) (2026-07-28)

---

## GAME 3: Google Snake

### Minute 1: Boot
**Observable State**: Classic grid layout; single food; speed is slow (1 grid cell per 200ms). No complexity visible; rules are immediately intuitive.

**Player Action**: Arrow key or swipe to move. First food consumed in ~5 seconds. Visual feedback is snappy; snake visibly grows.

**Psychological State**: "This is easy. I got this."

**Retention Hook**: "Let me see how high I can score."

**Source**: [Google Snake Design](https://lakersgame.co.uk/google-doodle-games-snake/) (2026-07-28)

### Minute 10: Ramp
**Observable State**: Snake length 12-20; score 12-20; speed is still stable (no acceleration from Nokia-style scaling). Grid occupation is 15-20%.

**Player Action**: Spatial planning intensifies. Player must predict their tail position multiple moves ahead. First "close calls" happen (snake nearly collides with itself).

**Difficulty Mechanic**: Unlike Nokia (speed ramps), difficulty comes PURELY from **snake length**. The grid doesn't get faster; it just gets fuller.

**Retention Hook**: "I made a mistake but I'm recovering. Let me push a bit further."

**Source**: [Google Snake Difficulty Analysis](https://sites.google.com/site/populardoodlegames/google-snake/) (2026-07-28)

### Hour 5: Endgame
**Observable State**: Snake length 60+; score 60+; grid occupation 30-40% (typical grid is 20×20 or similar). Almost every move requires precise timing.

**Player Action**: **Extreme spatial mastery** required. Player must mentally model the tail's position, predict multi-move sequences, and execute with zero error margin. A single mistake (hitting self by 1 cell) ends the session.

**Psychological State**: **High cognitive load**. Player is in deep focus; no room for distraction. Sessions last 15-30 seconds once the snake is large.

**Retention Hook**: "I know the grid layout. One more run and I'll beat my score."

**Source**: [Google Snake Game](https://lakersgame.co.uk/google-doodle-games-snake/) (2026-07-28)

### End State: Death
**Trigger**: Self-collision or wall hit.

**Loop Reset**: Score summary displayed; instant restart available. **No penalty, no progression loss.**

**Why Replay?**: Personal score is the only leaderboard. Unlike slither.io (global rank), players compete against their own history. This creates a **personal mastery narrative**: "I can beat my PB of 47."

**Source**: [Google Snake Doodle](https://elgoog.im/snake/) (2026-07-28)

---

## Comparative Progression Model

| Horizon | Nokia Snake | slither.io | Google Snake |
|---------|------------|-----------|--------------|
| **Min 1** | Immediate food cycle; space is abundant | Survival among crowds; leaderboard visible | Intuitive controls; easy to score |
| **Min 10** | Speed ramps noticeably; tension builds | Predation-foraging trade-off; rank climbing | Space constraint tightens; planning required |
| **Hour 5** | Endgame: spatial puzzle, pure skill | Endgame: PvP mastery, flow state | Endgame: cognitive load extreme, single-error death |
| **Reset** | "One more run" (personal score chase) | "One more run" (rank climb) | "One more run" (personal PB) |

---

## Retention Mechanisms

### Why Players Return (Session Cohesion)

1. **Zero Penalty on Death**
   - All three games reset instantly with no persistent cost.
   - Session length is short (5-10 min typical); players feel they can "afford" another attempt.

2. **Clear, Measurable Progress Axis**
   - Nokia & Google: Score is visible; player sees improvement over time.
   - slither.io: Rank is visible in real-time; global leaderboard creates urgency.

3. **Skill Ladder Visibility**
   - All three make it obvious that **player skill** determines outcome, not RNG or grind.
   - This creates intrinsic motivation ("I can get better").

4. **Tight Feedback Loop**
   - Action (move) → Immediate Result (growth, rank change, space loss).
   - No delays; causality is instant and clear.

---

**Observation Date**: 2026-07-28  
**Horizons Analyzed**: 4 (minute 1, minute 10, hour 5, endgame)  
**Sources Cited**: 12
