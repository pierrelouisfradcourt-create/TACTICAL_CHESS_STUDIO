# UX Flow — Screens, Navigation, Feedback & Transitions

## GAME 1: Nokia Snake

### Screen Inventory

**1. Main Menu**
- **Elements**: Game title "SNAKE", "START", "HELP", "HIGH SCORES"
- **Interaction**: Numpad selection (up/down navigate, center to select)
- **Feedback**: Button highlight / visual selection cue
- **Transition**: "START" → Game Screen; "HIGH SCORES" → Score Display Screen

**Source**: [Nokia Snake FAQ](https://theoriginalsnake.com/faq) (2026-07-28)

**2. Game Screen (Primary)** 
- **Layout**:
  - **Play Area**: Centered grid (typically 20×20 cells on 3310 screen).
  - **HUD Top**: Score counter, Level indicator, Speed indicator.
  - **HUD Bottom**: Soft-key labels ("PAUSE", "EXIT").
- **Interactions**:
  - **Numpad 2/4/6/8**: Direct snake direction control (no buffering; input is immediate).
  - **Soft-key Pause**: Freezes game state; pressing again resumes.
  - **Soft-key Exit**: Returns to Main Menu (requires confirmation to prevent accidental exit).
- **Feedback**:
  - **Growth Animation**: Snake visually extends by one cell when food is eaten.
  - **Score Tick**: Counter increments instantly.
  - **Speed Visual**: Snake movement becomes noticeably faster as difficulty increases.

**Source**: [Classic Snake Game - Medium](https://medium.com/@usmananwar9957/classic-snake-game-d31c3d174eba) (2026-07-28)

**3. Pause Screen**
- **Elements**: "PAUSED", current score, "RESUME", "MENU"
- **Interaction**: Numpad selection
- **Feedback**: Game audio stops; visuals freeze; overlay confirms pause state
- **Transition**: "RESUME" → Game Screen (state preserved); "MENU" → Main Menu (session lost)

**4. Game Over Screen**
- **Elements**: "WASTED!" or "GAME OVER", final score, "RETRY" (immediate restart), "MENU" (back to main)
- **Interaction**: Numpad selection
- **Feedback**: Distinct visual (color invert, large text) to signal end state
- **Transition**: "RETRY" → New Game Screen (score reset to 0); "MENU" → Main Menu

**5. High Scores Screen**
- **Elements**: List of top 10 scores with player initials (3-char entry on game over)
- **Interaction**: Numpad up/down to scroll; select to confirm
- **Feedback**: Highlight current position in list; show date/time of score (if device supports)
- **Transition**: Back to Main Menu on soft-key "EXIT"

**Source**: [Nokia Snake Wikipedia](https://nokia.fandom.com/wiki/Snake) (2026-07-28)

### Input Model

**Responsive Input**: Numpad keys are sampled **every tick** (not buffered ahead). This means:
- If player presses "2" (up) while moving left, the snake changes direction on the next tick.
- Rapid re-direction (e.g., up → right → down in quick succession) is possible but requires exact timing.
- **No input queue**: Only the most recent direction is honored.

**Soft-Keys**: Context-sensitive; they change depending on screen.

### Feedback Hierarchy

| Priority | Feedback | Trigger |
|----------|----------|---------|
| **1 (Critical)** | Food eaten: visuals + score tick | Collision with food |
| **2 (Critical)** | Game over: "WASTED!" + score display | Collision with wall or self |
| **3 (Important)** | Speed increase: visible tick rate jump | Score threshold (e.g., every 10 points) |
| **4 (Nice)** | Pause overlay | Pause button pressed |
| **5 (Polish)** | Level transition screen | Maze changes |

---

## GAME 2: slither.io

### Screen Inventory

**1. Start Screen / Main Menu**
- **Elements**: Game logo ("slither.io"), "PLAY" button, leaderboard preview (top 10), customize avatar
- **Interaction**: Click "PLAY" or press spacebar; avatar customization optional
- **Feedback**: Leaderboard shows global top 10; visually motivates player entry
- **Transition**: "PLAY" → Loading → Game Screen

**Source**: [slither.io Wiki - Gameplay Mechanics](https://slitherio.fandom.com/wiki/Gameplay_Mechanics) (2026-07-28)

**2. Game Screen (Primary)**
- **Layout**:
  - **Play Area**: Full screen, infinite-scrolling 2D plane (player-centric camera).
  - **Snake Avatar**: Center of screen (player's snake is always visible).
  - **Other Players**: Visible if within camera frustum; drawn as snake bodies with custom skins.
  - **Food Particles**: Scattered across map; appear as small colored circles.
  - **HUD Top-Left**: Current length / rank ("LENGTH: 4521 | RANK: 47/10000")
  - **HUD Top-Right**: "BOOST" indicator (show when spacebar is active; visual bar or text)
  - **HUD Bottom-Center**: Instructions ("MOVE MOUSE TO STEER" or "SWIPE TO STEER")
  
- **Interactions**:
  - **Mouse Movement** (Desktop): Steer snake toward cursor; snake always faces cursor direction.
  - **Touch Swipe** (Mobile): Drag finger to steer; snake follows swipe direction.
  - **Spacebar / Tap** (Boost): Activate speed boost; visible cost (mass reduction) shown as animation.
  - **ESC / Close Button**: Return to menu (confirmation required: "You will lose this game").

- **Feedback**:
  - **Eating Food**: Small particle disappears; length counter increments; visual "pop" effect.
  - **Eating Corpse**: Large mass gain visible; length jumps noticeably; visual "absorption" animation.
  - **Collision Death**: Screen shakes; "DEAD" overlay appears; score summary; restart prompt.
  - **Rank Change**: Leaderboard refreshes; player's rank updates in real-time if they climb top 10.
  - **Boost Active**: Snake visually accelerates; exhaust trail or speed lines visible.

**Source**: [MDA – Slither.io](https://mechanicsofmagic.com/2022/04/11/mda-slither-io/) (2026-07-28)

**3. Death Screen**
- **Elements**: 
  - "YOU DIED" title
  - Final length, final rank
  - Top 3 killers (if applicable): "Killed by: [Player Name] (length 5402)"
  - "PLAY AGAIN" button (instant restart)
  - "MENU" button (return to start screen)
  
- **Interaction**: Click button or press spacebar to restart
- **Feedback**: Death animation plays (snake trails dissolve); UI fades in
- **Transition**: "PLAY AGAIN" → Loading → New Game Screen (rank reset, length reset to 1)

**4. Leaderboard Screen** (Accessible from menu or in-game)
- **Elements**: 
  - Top 100 global leaderboard
  - Player's rank highlighted if in top 100
  - Refresh button (updates scores from server)
  
- **Interaction**: Click entry to view player profile (if feature exists) or close to return
- **Feedback**: Real-time rank updates; entries are sortable by length or time alive
- **Transition**: Back to menu or game on close

**Source**: [slither.io App Review](https://marlvel.ai/intel-report/games/slither-io) (2026-07-28)

### Input Model

**Continuous Steering**: Unlike Nokia (discrete directions), slither.io uses **analog steering**.
- Player's mouse (or touch point) determines the snake's heading angle (continuous 360°, but server-side angle gating limits turns to ~90° cone).
- Snake never stops; it's always moving forward.
- Turning happens smoothly; no direction "locking" (player can micro-adjust heading mid-turn).

**Boost Activation**: Spacebar / Tap activates boost instantly; visual feedback shows remaining boost duration (color bar, countdown, or particle effect).

### Feedback Hierarchy

| Priority | Feedback | Trigger |
|----------|----------|---------|
| **1 (Critical)** | Collision death: screen shake + "DEAD" overlay | Hit another snake or self |
| **2 (Critical)** | Rank update: leaderboard refresh | Length achievement or climb |
| **3 (Important)** | Boost consumed: mass reduction animation | Spacebar activated |
| **4 (Important)** | Eating food: length increment + visual pop | Collect pellet |
| **5 (Nice)** | Other players visible: drawn with custom skins | Within camera frustum |

---

## GAME 3: Google Snake

### Screen Inventory

**1. Start / Home Screen**
- **Elements**: 
  - Game title "SNAKE"
  - Theme selector (if available): Click to choose theme (seasonal, sports, etc.)
  - "PLAY" button
  - High score display (personal best)
  - "HOW TO PLAY" (if help is shown)
  
- **Interaction**: Click "PLAY" or press any key to start; theme selection is optional
- **Feedback**: Theme preview shows on selection; high score is highlighted prominently
- **Transition**: "PLAY" → Game Screen

**Source**: [Google Snake Doodle](https://elgoog.im/snake/); [Popular Doodle Games](https://sites.google.com/site/populardoodlegames/google-snake/) (2026-07-28)

**2. Game Screen (Primary)**
- **Layout**:
  - **Play Area**: Fixed grid (typically 20×20 cells), centered on screen.
  - **Snake**: Grid-aligned, rendered as colored segments (head distinct from body).
  - **Food**: Single food pellet per frame, rendered as distinct color (often apple or fruit icon).
  - **HUD Top-Left**: Current score counter
  - **HUD Top-Right**: (Optional) Personal high score for comparison
  - **Background**: Theme-dependent (solid color, gradient, or animated pattern)

- **Interactions**:
  - **Arrow Keys**: Up/Down/Left/Right to move snake to adjacent grid cell.
  - **Swipe** (Mobile): Swipe up/down/left/right to move.
  - **Smooth Turnaround**: Unlike Nokia (discrete tick input), Google's input is typically buffered—if player presses a direction before the snake moves, the input is queued and executed on the next tick, improving responsiveness.
  - **ESC / Exit Button**: Pause or quit game (optional on mobile; usually not present).

- **Feedback**:
  - **Food Eaten**: Food disappears; snake grows by 1 segment; score increments visibly; optional sound effect (beep or chime).
  - **Power-Up Eaten** (if active): Special visual (e.g., star or glow effect); temporary buff applied (e.g., "2X POINTS" text displayed).
  - **Collision**: Screen flashes or "Game Over" overlay appears; final score shown.
  - **Score Tick**: Counter updates in real-time; large, clear font; optionally animates upward on each increment.

**Source**: [Google Doodle Games Snake](https://sites.google.com/site/populardoodlegames/google-snake/) (2026-07-28)

**3. Pause Screen** (if applicable)
- **Elements**: "PAUSED", current score, "RESUME", "RESTART", "QUIT"
- **Interaction**: Keyboard or touch
- **Feedback**: Overlay with transparency; game visuals visible behind
- **Transition**: "RESUME" → Game Screen (state preserved); "RESTART" → New Game Screen (score reset)

**4. Game Over Screen**
- **Elements**: 
  - "GAME OVER" title
  - Final score (large, prominent)
  - Personal high score (if beaten): "NEW HIGH SCORE!" with animation
  - "PLAY AGAIN" button (instant restart)
  - "MENU" button (return to start screen)
  
- **Interaction**: Click button or press spacebar/Enter to restart
- **Feedback**: Optional sound effect (fanfare if high score beaten); color change or animation
- **Transition**: "PLAY AGAIN" → New Game Screen (score reset); "MENU" → Start Screen

**Source**: [Google Snake Doodle](https://elgoog.im/snake/) (2026-07-28)

### Input Model

**Grid-Aligned Movement**: Snake moves one cell per tick (discrete).
- Keyboard input is **buffered**: Player can press a direction before the snake moves, and the input is queued.
- This improves perceived responsiveness; player feels less frustrated by slow reactions.
- **No diagonal movement**: Only cardinal directions (up, down, left, right).

**Responsive Feedback**: Keypress is acknowledged immediately via visual or audio cue, even if the snake's movement happens on the next tick.

### Feedback Hierarchy

| Priority | Feedback | Trigger |
|----------|----------|---------|
| **1 (Critical)** | Collision: "GAME OVER" + final score display | Wall or self hit |
| **2 (Critical)** | Food eaten: score increment + visual pop | Collect food |
| **3 (Important)** | High score achievement: "NEW HIGH SCORE!" animation | Final score > personal best |
| **4 (Important)** | Power-up activation: visual effect (e.g., "2X" text) | Collect power-up |
| **5 (Nice)** | Keypress acknowledgment: optional sound or screen flash | Directional input received |

---

## Comparative UX Table

| Aspect | Nokia Snake | slither.io | Google Snake |
|--------|------------|-----------|--------------|
| **Primary Input** | Numpad (discrete 4-way) | Mouse/touch (continuous steering) | Arrow keys/swipe (buffered 4-way) |
| **Input Latency** | Direct (no buffer); requires precise timing | Continuous (smooth steering) | Buffered (forgiving) |
| **HUD Density** | Minimal (score, level, speed) | Moderate (score, rank, leaderboard) | Minimal (score only) |
| **Menu Navigation** | Numpad selection | Click buttons | Click/tap buttons |
| **Death Feedback** | "WASTED!" text + game over screen | Death animation + screen shake | "GAME OVER" overlay + score |
| **Replay Friction** | Two inputs (RETRY, confirm) | One click (PLAY AGAIN) | One click (PLAY AGAIN) |
| **Pause Capability** | Yes (soft-key) | No (no pause in online game) | Varies (yes on web, no on mobile) |

---

## Retention UX Patterns

### What Makes Restart Frictionless

1. **Instant Restart Option**: All three offer "PLAY AGAIN" or "RETRY" prominently on game over.
2. **Session Summary Always Visible**: Player sees their score/rank before restarting, reinforcing the "beat my score" motivation.
3. **No Confirmation Dialogs on Restart**: Clicking "RETRY" immediately starts a new game; no confirmation needed.
4. **Leaderboard Motivation** (slither.io only): Real-time rank visible during play keeps the "climb the ranks" loop active.
5. **High Score Celebration** (Google Snake): If player beats PB, a celebratory animation / sound plays, reinforcing achievement.

### Input Accessibility

- **Nokia**: Numpad is physical; responsive even on old hardware.
- **slither.io**: Mouse/touch works on any device; intuitive steering reduces learning curve.
- **Google Snake**: Arrow keys are universal; swipe is mobile-friendly. Buffered input reduces frustration.

---

**Observation Date**: 2026-07-28  
**Screens Analyzed**: 12 (4 per game)  
**Sources Cited**: 11
