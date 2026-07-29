# Economy Map — Resource Systems & Progression Rewards

## GAME 1: Nokia Snake

### Resource System
**Primary Currency**: Score (accumulated).
- **Source**: Eating food pellets (1 score per pellet).
- **Sink**: Score is **not spent**; it only accumulates. Game ends on death; score is lost (no carryover).
- **Display**: Real-time score counter on HUD.

**Source**: [Nokia Snake FAQ](https://theoriginalsnake.com/faq); [Classic Snake Game](https://medium.com/@usmananwar9957/classic-snake-game-d31c3d174eba) (2026-07-28)

### Secondary Progression: Levels (N-Gage/Snake II)
**Unlock Mechanism**: Score thresholds trigger maze progression.
- **Level 1-5**: Simple square grid, no obstacles.
- **Level 6-20**: Added barriers (walls within the grid).
- **Level 21+**: Hex grids, wrap edges (toroidal topology).

**Reward Structure**: Unlocking a new level is the reward; new maze topology is the incentive to continue. No cosmetic or mechanical unlock system beyond this.

**Source**: [Snake II - Wikipedia](https://en.wikipedia.org/wiki/Snake_II); [Snakes N-Gage](https://www.retrogamesreview.co.uk/2024/05/snakes-nokia-n-gage-review.html) (2026-07-28)

### Economy Simplicity
Nokia Snake has **zero inflation, zero meta-progression, zero cosmetics**. The economy is:
- **Closed**: Score has no external value; it's purely session-local.
- **Non-Tradeable**: No player-to-player transfers.
- **Non-Persistent**: Death resets score to 0.

This design choice is intentional: simplicity keeps cognitive load low, making the game accessible.

**Source**: [Low-Level Design](https://www.lowleveldesign.io/LLD/GameDesign/SnakeGame) (2026-07-28)

---

## GAME 2: slither.io

### Resource System: Cosmetics & Optional Currency

**Primary Economy**: **Mass** (snake length).
- **Source**: Eating ground food (`pellets`), killing enemy snakes (corpse becomes `food_particles`).
- **Sink**: Boost mechanic (spacebar) consumes mass at ~10% per second of boost.
- **Dynamics**: Mass is **not persistent**; each death resets to length 1. No carryover between sessions.

**Source**: [slither.io Gameplay Mechanics](https://slitherio.fandom.com/wiki/Gameplay_Mechanics); [MDA Analysis](https://mechanicsofmagic.com/2022/04/11/mda-slither-io/) (2026-07-28)

### Secondary Currency: Cosmetics (Premium)
**Skins**: Appearance-only cosmetics purchased with real money (gems, coins, tokens).
- **Prices**: Skins typically $1-5 USD per cosmetic.
- **No Balance Impact**: Skins grant zero gameplay advantage; purely aesthetic.
- **Collection Drive**: Players can purchase multiple skins to "express personality" on the leaderboard.

**Source**: [slither.io with Money Guide](https://www.playsnakeiogame.com/slither-io-with-money/) (2026-07-28)

### Leaderboard as Implicit Economy
**Rank** is the implicit "currency" of slither.io:
- **Source**: Length achieved before death; higher length → higher rank.
- **Sink**: Rank resets to starting position on death.
- **Display**: Real-time leaderboard (top 10 visible in-game; global rank visible in UI).

**Retention Mechanic**: The leaderboard creates a **daily grind incentive**. Players chase "rank X" or "mass 10,000" as milestones.

**Source**: [slither.io Review](https://marlvel.ai/intel-report/games/slither-io) (2026-07-28)

### Economy Assessment
slither.io's economy is:
- **Cosmetic-Based Monetization**: Only cosmetics are monetized; core gameplay is free-to-play.
- **Session-Stateless**: No meta-progression; each session is independent.
- **Leaderboard-Driven**: Rank creates the psychological reward loop, not cosmetics.

The cosmetic system is *optional* and *non-essential* for gameplay; this avoids pay-to-win accusations and keeps accessibility high.

**Source**: [slither.io Competitors Analysis](https://ahrefs.com/websites/slither.io/competitors) (2026-07-28)

---

## GAME 3: Google Snake

### Resource System

**Primary Currency**: Score (accumulated, session-local).
- **Source**: Eating food pellets (1 point per pellet).
- **Sink**: Score is never spent; it accumulates until death.
- **Persistence**: Score **does not carry between sessions**; it's reset to 0 on death.

**Source**: [Google Snake Doodle](https://elgoog.im/snake/); [Popular Doodle Games](https://sites.google.com/site/populardoodlegames/google-snake/) (2026-07-28)

### Secondary Progression: Power-Ups

**Power-Up Types** (Random Spawns):
1. **Double Points**: Next food eaten awards 2 points instead of 1 (temporary buff, ~5 sec).
2. **Slow-Motion**: Temporarily reduces tick rate (game feels slower; player reaction time improves).
3. **Invincibility**: Brief window (2-3 sec) where collisions are ignored; useful for risky maneuvers.

**Reward Structure**: Power-ups are **free** and **random**. They appear during play with no unlock or purchase mechanism.

**Source**: [Google Snake Power-Ups](https://lakersgame.co.uk/google-doodle-games-snake/) (2026-07-28)

### Cosmetics: Themes

**Theme System**: Google periodically releases Snake Doodle variants with custom themes (holiday editions, sports editions, etc.).
- **Examples**: Seasonal skins, character-themed grids, animated backgrounds.
- **Monetization**: Unknown; themes may be bundled with Google Doodle marketing (free) or cosmetic purchases.

**Mechanics Impact**: Themes are **purely visual**; no gameplay differences.

**Source**: [Google Doodle Games](https://googledoodle-games.com/snake-games/) (2026-07-28)

### Economy Assessment
Google Snake's economy is:
- **Minimal & Transparent**: Score is the only persistent metric; power-ups are windfalls.
- **Free-to-Play**: No monetization visible in core game (though cosmetics may exist on some platforms).
- **Accessible**: No grind, no cosmetics gatekeeping; everyone plays under the same rules.

---

## Comparative Economy Table

| Aspect | Nokia Snake | slither.io | Google Snake |
|--------|------------|-----------|--------------|
| **Primary Currency** | Score (1 per food) | Mass (length) | Score (1 per food) |
| **Secondary Progression** | Maze unlocks (levels) | Rank (leaderboard) | Power-ups (random) |
| **Cosmetics** | None | Skins ($1-5 per item) | Themes (mostly free) |
| **Monetization** | None | Cosmetics only (optional) | Unknown (likely cosmetics) |
| **Persistence** | Session-local; reset on death | Session-local; rank resets | Session-local; reset on death |
| **Economy Inflation** | None (score only) | None (rank reset per session) | None (score only) |
| **Player-to-Player Trade** | None | None | None |

---

## Retention Through Economy

### What Keeps Players Returning?

1. **Personal Score / Rank Chasing**
   - Nokia & Google: "Beat my personal best."
   - slither.io: "Climb the global leaderboard."

2. **Zero Pressure to Spend**
   - All three are fully playable without paying.
   - slither.io's cosmetics are **opt-in, non-competitive**.
   - This avoids "pay-to-win" perception and keeps casual players engaged.

3. **Session-Stateless Design**
   - No Fear of FOMO (fear of missing out): Players can take breaks without losing progress.
   - No Sunk-Cost Trap: Players don't feel obligated to play daily to "protect" an investment.
   - High Re-Entry Rate: Players return when they choose, not when "rent" is due.

### Economy Simplicity as a Strength

All three games deliberately avoid:
- **Crafting systems** (too complex for arcade-style gameplay).
- **Gear progression** (would require grinding or spending).
- **Daily login bonuses** (would create obligation).
- **Seasonal passes** (would fragment the player base).

This simplicity is **not a limitation**; it's a **feature**. The economy gets out of the way, letting **skill and effort** be the only progression gate.

---

## Candidate Reuse Patterns for Snake

If building a snake variant, the studio should consider:

1. **Session-Local Economy**: No persistent progression simplifies architecture and avoids pay-to-win concerns.
2. **Score as Primary Feedback**: Score is the primary hook; it should tick visibly and immediately.
3. **Cosmetic-Optional Monetization**: If monetizing, cosmetics-only avoids balance complexity.
4. **Leaderboard for Social Motivation** (optional): If multiplayer, a simple leaderboard is a powerful retention lever.
5. **No Sunk-Cost Loops**: Avoid daily quests, login bonuses, or seasonal passes that pressure players to continue.

---

**Observation Date**: 2026-07-28  
**Games Analyzed**: 3  
**Sources Cited**: 13
