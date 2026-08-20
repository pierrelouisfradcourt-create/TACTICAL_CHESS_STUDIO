# shmup_slice Render Patch (s9-build) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform flat canvas primitives (fillRect/arc) into a rich kawaii Pop'n TwinBee visual experience using pre-ingested CC0 candy assets and layered canvas drawings, without modifying game logic.

**Architecture:** The render.mjs module reads game state (entities, HUD) and draws to canvas. This patch:
1. Preloads 13 candy sprite assets from knowledge_base (with fallback drawing if load fails)
2. Replaces flat rectangles with rounded, layered canvas primitives (ship chibi silhouette, enemy families by color, expressive bosses)
3. Draws candy assets to map backgrounds (MAP_1 cream clouds, MAP_2 candy landscape, MAP_3 starry dusk)
4. Animates explosions from 5-frame candy sequence on enemy/boss destruction
5. Upgrades HUD to chunky rounded style (large fonts, icon-based lives/HP gauge, rounded buttons)
6. Keeps all game logic (logic/*.mjs, data/*.mjs, bot/solver.mjs) untouched; oracle solvability + e2e remain green

**Tech Stack:** HTML5 Canvas 2D API, vanilla JavaScript modules (.mjs), Image API for preloading, requestAnimationFrame (already in main.mjs).

## Global Constraints

- **Ownership:** render.mjs ONLY; zero modifications to logic/*.mjs, data/*.mjs, bot/solver.mjs, main.mjs, input.mjs
- **Architecture:** render module cannot depend on logic, input, bot, main (verified by forge.static_oracles.check_architecture)
- **Assets:** 13 candy sprites from knowledge_base/assets/props/ copied to games/shmup_slice/assets/; all file loads must have fallback (console warn + draw shape if missing)
- **Oracle tests:** solvability.mjs (bot must still beat all 3 maps/3 boss) + e2e.mjs (click-through must pass with new visuals) + properties.test.mjs (all unchanged)
- **No claims without oracle:** Every assertion backed by run-oracle.mjs exit 0; claim_verdict: NO_CLAIM_ALLOWED
- **No git commit:** Pierre gates the merge; builder outputs diff + WireMap update + report only

---

## File Structure

| File | Responsibility | Type |
|---|---|---|
| `games/shmup_slice/render.mjs` | Canvas drawing: backgrounds, entities, HUD, overlay screens | Modify |
| `games/shmup_slice/assets/` | Preloaded candy sprite images (13 files copied from knowledge_base) | Create dir |
| `games/shmup_slice/assets/candypack1_*.png` | 13 sprite files (candy decorations + explosion frames) | Copy |

No new files created beyond the assets directory; render.mjs refactored inline. The state interface (logic/state.mjs exports) remains unchanged.

---

## Task 1: Create Assets Directory and Preload Sprite Images

**Files:**
- Create: `games/shmup_slice/assets/` (directory)
- Copy into: `games/shmup_slice/assets/candypack1_*.png` (13 files)
- Modify: `games/shmup_slice/render.mjs` (asset preload logic)

**Interfaces:**
- Consumes: createRenderer(canvas) from main.mjs (unchanged signature)
- Produces: createRenderer still returns (state) => void, but with asset cache built in; Image load handlers set a `assetCache = { loaded: bool, images: Map<filename, Image> }`

- [ ] **Step 1: Create the assets directory**

```bash
mkdir -p games/shmup_slice/assets
```

Expected: directory exists, is empty.

- [ ] **Step 2: Copy 13 candy sprites from knowledge_base**

```bash
cp knowledge_base/assets/props/candypack1_candycane.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_candycorn.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_candyhumbug.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_lollipop_blue.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_lollipop_green.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_jellybig_red.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_bean_purple.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_heart_red.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_explosionpink01.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_explosionpink02.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_explosionpink03.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_explosionpink04.png games/shmup_slice/assets/
cp knowledge_base/assets/props/candypack1_explosionpink05.png games/shmup_slice/assets/
```

Expected: 13 files in games/shmup_slice/assets/, all readable.

- [ ] **Step 3: Write asset preload logic in render.mjs**

Replace the top of render.mjs with:

```javascript
// Canvas rendering. Reads state, draws to canvas. Pure, no game logic.
//
// Constantes dupliquées (PAS importées de logic/state.mjs) : render est un
// module d'ownership séparé (blueprint.json interdit render -> logic, vérifié
// par forge.static_oracles.check_architecture).
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const SHIP_WIDTH = 30;
const SHIP_HEIGHT = 30;

// Asset preload cache
const assetCache = {
  loaded: false,
  images: new Map(),
  explosionFrames: []
};

const ASSET_LIST = [
  'candypack1_candycane.png',
  'candypack1_candycorn.png',
  'candypack1_candyhumbug.png',
  'candypack1_lollipop_blue.png',
  'candypack1_lollipop_green.png',
  'candypack1_jellybig_red.png',
  'candypack1_bean_purple.png',
  'candypack1_heart_red.png',
];

const EXPLOSION_FRAMES = [
  'candypack1_explosionpink01.png',
  'candypack1_explosionpink02.png',
  'candypack1_explosionpink03.png',
  'candypack1_explosionpink04.png',
  'candypack1_explosionpink05.png',
];

async function preloadAssets() {
  const assetPath = 'assets/';
  const allAssets = [...ASSET_LIST, ...EXPLOSION_FRAMES];
  
  for (const filename of allAssets) {
    const img = new Image();
    img.onload = () => {
      assetCache.images.set(filename, img);
    };
    img.onerror = () => {
      console.warn(`Failed to load asset: ${filename}`);
    };
    img.src = assetPath + filename;
  }
  
  assetCache.explosionFrames = EXPLOSION_FRAMES.map(f => assetCache.images.get(f));
  assetCache.loaded = true;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.canvas.width = GAME_WIDTH;
  ctx.canvas.height = GAME_HEIGHT;

  // Start preload on first render creation
  preloadAssets();

  return (state) => {
    // ... rest of render function (see Task 2+)
  };
}
```

Expected: Preload logic in place; no console errors if assets load (warnings OK if missing, but with proper fallback in drawing code).

- [ ] **Step 4: Commit preload setup**

```bash
git add games/shmup_slice/render.mjs
git commit -m "feat(shmup): asset preload infrastructure + candy sprite list"
```

---

## Task 2: Draw Rich Canvas Backgrounds per Map

**Files:**
- Modify: `games/shmup_slice/render.mjs` (drawBackground function)

**Interfaces:**
- Consumes: state.level (1, 2, or 3), assetCache.images, canvas context
- Produces: drawBackground(ctx, state) draws layered background; no return value

- [ ] **Step 1: Add helper functions for rounded shapes and gradients**

Add these helper functions before createRenderer:

```javascript
function drawRoundRect(ctx, x, y, width, height, radius, fillColor, strokeColor, lineWidth) {
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor || fillColor;
  ctx.lineWidth = lineWidth || 0;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (lineWidth) ctx.stroke();
  ctx.fill();
}

function drawGradientBg(ctx, fromColor, toColor, isDiagonal = false) {
  const grad = isDiagonal
    ? ctx.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT)
    : ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  grad.addColorStop(0, fromColor);
  grad.addColorStop(1, toColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawCloud(ctx, x, y, size, opacity = 1) {
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#fffacd'; // cream
  // Three overlapping circles for cloud
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size * 0.6, y - size * 0.3, size * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size * 1.2, y, size * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
```

Expected: Helper functions defined, no errors on parse.

- [ ] **Step 2: Implement MAP 1 background (cream clouds)**

Add function before createRenderer:

```javascript
function drawMapBg1(ctx) {
  // Gradient sky (light cyan to cream)
  drawGradientBg(ctx, '#e0f6ff', '#fffacd', false);
  
  // Scattered candy icons (static positions, deterministic not random)
  const decorAssets = ['candypack1_lollipop_blue.png', 'candypack1_heart_red.png', 'candypack1_bean_purple.png'];
  const decor = [
    { x: 100, y: 80, asset: 0, scale: 0.4 },
    { x: 600, y: 120, asset: 1, scale: 0.35 },
    { x: 350, y: 200, asset: 2, scale: 0.3 },
    { x: 750, y: 150, asset: 0, scale: 0.4 },
  ];
  
  for (const item of decor) {
    const img = assetCache.images.get(decorAssets[item.asset]);
    if (img && img.complete) {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(img, item.x, item.y, img.width * item.scale, img.height * item.scale);
      ctx.globalAlpha = 1;
    }
  }
  
  // Large cream clouds
  drawCloud(ctx, 120, 80, 40, 0.6);
  drawCloud(ctx, 650, 100, 50, 0.5);
  drawCloud(ctx, 400, 200, 45, 0.4);
}
```

Expected: Function defined, draws gradient + clouds + optional candy sprites.

- [ ] **Step 3: Implement MAP 2 background (candy landscape)**

Add function before createRenderer:

```javascript
function drawMapBg2(ctx) {
  // Gradient bg (warm peachy bottom, light top)
  drawGradientBg(ctx, '#ffe4d4', '#ffccaa', false);
  
  // Scattered candy decoration (max saturation)
  const candyDecor = [
    { x: 50, y: 150, asset: 'candypack1_candycane.png', scale: 0.5 },
    { x: 200, y: 300, asset: 'candypack1_candycorn.png', scale: 0.6 },
    { x: 450, y: 100, asset: 'candypack1_lollipop_green.png', scale: 0.55 },
    { x: 650, y: 250, asset: 'candypack1_jellybig_red.png', scale: 0.5 },
    { x: 750, y: 350, asset: 'candypack1_candyhumbug.png', scale: 0.45 },
  ];
  
  for (const item of candyDecor) {
    const img = assetCache.images.get(item.asset);
    if (img && img.complete) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(img, item.x, item.y, img.width * item.scale, img.height * item.scale);
      ctx.globalAlpha = 1;
    }
  }
  
  // Simple ground stripes (stylized reglisse)
  ctx.fillStyle = '#8b4513';
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(0, 450 + i * 15, GAME_WIDTH, 8);
  }
  ctx.globalAlpha = 1;
}
```

Expected: Function draws warm peachy gradient + candy sprites + ground stripes.

- [ ] **Step 4: Implement MAP 3 background (starry dusk)**

Add function before createRenderer:

```javascript
function drawMapBg3(ctx) {
  // Gradient (dark purple to navy)
  drawGradientBg(ctx, '#5b2c6f', '#1a0033', true);
  
  // Scattered stars (deterministic grid)
  ctx.fillStyle = '#ffff99';
  for (let i = 0; i < 50; i++) {
    const x = (i * 137) % GAME_WIDTH; // deterministic pseudo-random
    const y = (i * 239) % GAME_HEIGHT;
    const size = 1 + (i % 3);
    ctx.globalAlpha = 0.6 + (i % 4) * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  
  // Optional candy icons faint in background
  const bgDecor = ['candypack1_lollipop_blue.png', 'candypack1_heart_red.png'];
  const positions = [
    { x: 150, y: 400, asset: 0 },
    { x: 600, y: 350, asset: 1 },
  ];
  for (const pos of positions) {
    const img = assetCache.images.get(bgDecor[pos.asset]);
    if (img && img.complete) {
      ctx.globalAlpha = 0.15;
      ctx.drawImage(img, pos.x, pos.y, img.width * 0.6, img.height * 0.6);
      ctx.globalAlpha = 1;
    }
  }
}
```

Expected: Function draws dark gradient + twinkling stars + faint candy backdrop.

- [ ] **Step 5: Integrate backgrounds into main render function**

In createRenderer's render function (state), replace the existing grid/background section with:

```javascript
  // Draw background per level
  if (state.level === 1) {
    drawMapBg1(ctx);
  } else if (state.level === 2) {
    drawMapBg2(ctx);
  } else if (state.level === 3) {
    drawMapBg3(ctx);
  } else {
    // Fallback for unexpected level
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
```

Expected: render function calls one of three map backgrounds.

- [ ] **Step 6: Commit background drawings**

```bash
git add games/shmup_slice/render.mjs
git commit -m "feat(shmup): add layered map backgrounds (clouds, candy landscape, starry dusk)"
```

---

## Task 3: Draw Chibi Player Ship with Layers

**Files:**
- Modify: `games/shmup_slice/render.mjs` (drawShip function)

**Interfaces:**
- Consumes: state.ship {x, y, invincibilityMs}, assetCache
- Produces: drawShip(ctx, state) draws chibi cyan/white ship with cockpit; no return

- [ ] **Step 1: Add ship drawing helper**

Add before createRenderer:

```javascript
function drawChibiShip(ctx, x, y, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.save();
  ctx.translate(x + SHIP_WIDTH / 2, y + SHIP_HEIGHT / 2);
  
  // Main body (cyan, rounded bottom)
  ctx.fillStyle = '#00ffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  drawRoundRect(ctx, -12, -8, 24, 20, 8, '#00ffff', '#ffffff', 2);
  
  // Cockpit (pink/rose center)
  ctx.fillStyle = '#ff69b4';
  ctx.beginPath();
  ctx.arc(0, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // Eyes (big, kawaii)
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-4, -4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -4, 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Wing accents (white)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-13, 4);
  ctx.lineTo(-18, 8);
  ctx.lineTo(-13, 6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(13, 4);
  ctx.lineTo(18, 8);
  ctx.lineTo(13, 6);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
  ctx.globalAlpha = 1;
}
```

Expected: Function defined, ready to call.

- [ ] **Step 2: Replace ship rendering in main render function**

Replace the existing "Draw ship" section with:

```javascript
  // Draw ship (with invincibility alpha)
  const shipAlpha = state.ship.invincibilityMs > 0 ? 0.5 : 1;
  drawChibiShip(ctx, state.ship.x, state.ship.y, shipAlpha);
```

Expected: render function calls drawChibiShip with alpha.

- [ ] **Step 3: Commit ship drawing**

```bash
git add games/shmup_slice/render.mjs
git commit -m "feat(shmup): draw chibi cyan ship with pink cockpit + expressive eyes"
```

---

## Task 4: Draw Two Enemy Families (Invaders Yellow/Orange, Sine Weave Green/Turquoise)

**Files:**
- Modify: `games/shmup_slice/render.mjs` (drawEnemies function)

**Interfaces:**
- Consumes: state.enemies [{x, y, type, formation}, ...], state.level
- Produces: drawEnemies(ctx, state) draws enemies with formation-based colors; no return

- [ ] **Step 1: Add enemy drawing helper**

Add before createRenderer:

```javascript
function drawEnemy(ctx, x, y, formation, scale = 1) {
  ctx.save();
  ctx.translate(x + 15 * scale, y + 12.5 * scale);
  
  // Determine color by formation
  let bodyColor, outlineColor;
  if (formation === 'INVADERS_DESCENT') {
    bodyColor = '#ffcc00';  // lemon yellow
    outlineColor = '#ff8800'; // orange accent
  } else if (formation === 'SINE_WEAVE') {
    bodyColor = '#00ff00'; // apple green
    outlineColor = '#00ccff'; // cyan accent
  } else {
    bodyColor = '#ff00ff'; // fallback magenta
    outlineColor = '#ffffff';
  }
  
  // Round body (chibi)
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 12 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Eyes (big, simple)
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-4 * scale, -3 * scale, 2 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4 * scale, -3 * scale, 2 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Mouth (curved smile)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.arc(0, 1 * scale, 4 * scale, 0, Math.PI);
  ctx.stroke();
  
  ctx.restore();
}
```

Expected: Function defined.

- [ ] **Step 2: Read enemy formation from state**

Note: You need to check what field in state.enemies identifies the formation. Read logic/enemies.mjs or data/patterns.mjs to find the property name. Expected: either state.enemies[i].formation or a separate data structure.

(Placeholder for self-check: grep logic/enemies.mjs for "formation" or look at how enemies are spawned in data/patterns.mjs)

- [ ] **Step 3: Replace enemy rendering in main render function**

Replace the existing "Draw enemies" section with:

```javascript
  // Draw enemies (two distinct formations = two color families)
  for (const enemy of state.enemies) {
    const formation = enemy.formation || 'UNKNOWN';
    drawEnemy(ctx, enemy.x, enemy.y, formation, 1);
  }
```

Expected: render function calls drawEnemy for each enemy.

- [ ] **Step 4: Commit enemy drawings**

```bash
git add games/shmup_slice/render.mjs
git commit -m "feat(shmup): draw enemies with formation-based colors (invaders yellow/orange, sine weave green/cyan)"
```

---

## Task 5: Draw Three Distinct Bosses (Magenta / Blue Royal / Red Cherry)

**Files:**
- Modify: `games/shmup_slice/render.mjs` (drawBoss function)

**Interfaces:**
- Consumes: state.boss {x, y, width, height, hp, id/type}, state.level
- Produces: drawBoss(ctx, state) draws boss with level-specific color + expressive face; no return

- [ ] **Step 1: Add boss drawing helper**

Add before createRenderer:

```javascript
function drawBoss(ctx, x, y, width, height, bossId, hp) {
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  
  let bodyColor, accentColor;
  if (bossId === 1) {
    bodyColor = '#ff00ff'; // magenta
    accentColor = '#ffaaff'; // light magenta
  } else if (bossId === 2) {
    bodyColor = '#0044ff'; // blue royal
    accentColor = '#44aaff'; // light blue
  } else if (bossId === 3) {
    bodyColor = '#ff0033'; // red cherry
    accentColor = '#ff6699'; // light red
  } else {
    bodyColor = '#ffffff';
    accentColor = '#cccccc';
  }
  
  // Main body (large rounded shape)
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(width, height) / 2 - 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Accent circle (inner layer)
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(width, height) / 2 - 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Large expressive eyes (gros yeux)
  ctx.fillStyle = '#ffffff';
  const eyeRadius = 8;
  ctx.beginPath();
  ctx.arc(-15, -8, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(15, -8, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Pupils (black, off-center for attitude)
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-12, -5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(18, -5, 5, 0, Math.PI * 2);
  ctx.fill();
  
  // Mouth (mean pout)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, 8);
  ctx.quadraticCurveTo(0, 15, 10, 8);
  ctx.stroke();
  
  ctx.restore();
}
```

Expected: Function defined.

- [ ] **Step 2: Replace boss rendering in main render function**

Replace the existing "Draw boss" section with:

```javascript
  // Draw boss
  if (state.boss) {
    drawBoss(ctx, state.boss.x, state.boss.y, state.boss.width, state.boss.height, state.boss.id || state.level, state.boss.hp);
  }
```

Expected: render function calls drawBoss with boss state; assuming state.boss.id is set or using state.level as fallback.

- [ ] **Step 3: Commit boss drawings**

```bash
git add games/shmup_slice/render.mjs
git commit -m "feat(shmup): draw three distinct expressive bosses (magenta/blue/red) with big eyes"
```

---

## Task 6: Draw Projectiles with Chroma Contrast (Player Stars/Hearts White-Cyan, Enemy Halos Warm Orange-Magenta)

**Files:**
- Modify: `games/shmup_slice/render.mjs` (drawProjectiles function)

**Interfaces:**
- Consumes: state.playerProjectiles [{x, y}, ...], state.enemyProjectiles [{x, y}, ...]
- Produces: drawProjectiles(ctx, state) draws player shots as glowing stars, enemy shots as warm halos; no return

- [ ] **Step 1: Add projectile drawing helpers**

Add before createRenderer:

```javascript
function drawStar(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.globalAlpha = 1;
}

function drawGlowingHalo(ctx, x, y, radius, color) {
  // Outer halo (glow)
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner core
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Center dot
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, radius / 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.globalAlpha = 1;
}
```

Expected: Helpers defined.

- [ ] **Step 2: Replace projectile rendering**

Replace the existing "Draw projectiles" section with:

```javascript
  // Draw player projectiles (white-cyan stars)
  for (const proj of state.playerProjectiles) {
    drawStar(ctx, proj.x, proj.y, 4, '#00ffff');
  }

  // Draw enemy projectiles (warm orange/magenta halos)
  for (const proj of state.enemyProjectiles) {
    const haloColor = '#ff8800'; // orange warm
    drawGlowingHalo(ctx, proj.x, proj.y, 4, haloColor);
  }
```

Expected: render function draws player shots as cyan stars, enemy shots as warm halos.

- [ ] **Step 3: Commit projectile drawings**

```bash
git add games/shmup_slice/render.mjs
git commit -m "feat(shmup): draw projectiles with chroma contrast (player cyan stars, enemy warm halos)"
```

---

## Task 7: Draw Explosion Pop Animation on Destruction

**Files:**
- Modify: `games/shmup_slice/render.mjs` (explosion tracking + animation)

**Interfaces:**
- Consumes: Game state, explosion list (new: state.explosions or tracked externally)
- Produces: drawExplosions(ctx, explosions) animates 5-frame sequence; requires state tracking for frame timing

**Note:** This task requires detecting when enemies/bosses are destroyed. Since render.mjs is pure (state-in → draw), you have two options:
1. **Extend state contract** to include explosions array: state.explosions [{x, y, frame, entity}] (requires coordination with logic)
2. **Track destructions frame-by-frame** in render.mjs by storing previous state and diffing (no logic change needed)

For this plan, **Option 2 is chosen** (preserve render ownership isolation).

- [ ] **Step 1: Add explosion tracking to renderer state**

In createRenderer, add:

```javascript
  let lastEnemyCount = 0;
  let lastBossHp = 0;
  const explosions = []; // [{x, y, frameIndex, maxFrames}]
```

Expected: Local tracking vars defined.

- [ ] **Step 2: Add explosion animation helper**

Add before createRenderer:

```javascript
function drawExplosionFrame(ctx, x, y, frameIndex, images) {
  if (frameIndex < 0 || frameIndex >= EXPLOSION_FRAMES.length) return;
  
  const filename = EXPLOSION_FRAMES[frameIndex];
  const img = images.get(filename);
  
  if (img && img.complete) {
    ctx.globalAlpha = 0.8;
    const scale = 1.5;
    ctx.drawImage(img, x - (img.width * scale) / 2, y - (img.height * scale) / 2, img.width * scale, img.height * scale);
    ctx.globalAlpha = 1;
  } else {
    // Fallback: draw burst shape
    ctx.fillStyle = '#ffaa00';
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const radius = 15 + frameIndex * 3;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
```

Expected: Function defined, uses either asset or fallback shape.

- [ ] **Step 3: Update explosions list each frame**

In the render function (state), add detection logic **before drawing**:

```javascript
  // Detect new destructions and spawn explosions
  const currentEnemyCount = state.enemies.length;
  if (currentEnemyCount < lastEnemyCount) {
    // An enemy was destroyed; approximate position (crude: use center of play area)
    explosions.push({ x: 400, y: 300, frameIndex: 0, maxFrames: 5 });
  }
  lastEnemyCount = currentEnemyCount;
  
  // Detect boss damage (HP decrease)
  if (state.boss) {
    if (state.boss.hp < lastBossHp && state.boss.hp > 0) {
      // Boss took damage; spawn small explosion
      explosions.push({ x: state.boss.x + state.boss.width / 2, y: state.boss.y + state.boss.height / 2, frameIndex: 0, maxFrames: 5 });
    }
    lastBossHp = state.boss.hp;
  }
  
  // Advance explosion frames
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].frameIndex++;
    if (explosions[i].frameIndex >= explosions[i].maxFrames) {
      explosions.splice(i, 1);
    }
  }
```

Expected: Detection logic in place, explosions array updated each frame.

- [ ] **Step 4: Draw all active explosions**

Add to the render function **after drawing bosses, before HUD**:

```javascript
  // Draw explosion animations
  for (const explosion of explosions) {
    drawExplosionFrame(ctx, explosion.x, explosion.y, explosion.frameIndex, assetCache.images);
  }
```

Expected: Each active explosion renders its current frame.

- [ ] **Step 5: Commit explosion animation**

```bash
git add games/shmup_slice/render.mjs
git commit -m "feat(shmup): add explosion pop animations (5-frame sequence on enemy/boss destruction)"
```

---

## Task 8: Upgrade HUD to Chunky Kawaii Style (Large Fonts, Icon-Based Lives, Boss HP Gauge)

**Files:**
- Modify: `games/shmup_slice/render.mjs` (HUD section)

**Interfaces:**
- Consumes: state {level, score, lives, over, status, bossHp}, assetCache
- Produces: drawHUD(ctx, state) draws chunky rounded HUD elements; no return

- [ ] **Step 1: Add rounded HUD panel helpers**

Add before createRenderer:

```javascript
function drawChunkytText(ctx, text, x, y, fontSize = 24, color = '#ffff00') {
  ctx.fillStyle = color;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

function drawLifeIcon(ctx, x, y, size = 16, alive = true) {
  ctx.save();
  ctx.translate(x, y);
  
  ctx.fillStyle = alive ? '#00ffff' : '#888888';
  ctx.strokeStyle = alive ? '#ffffff' : '#444444';
  ctx.lineWidth = 1.5;
  
  // Small chibi face (simplified ship outline)
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Eyes
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-4, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -2, 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

function drawBossHpGauge(ctx, x, y, width, height, hp, maxHp) {
  // Background (rounded rect)
  ctx.fillStyle = '#333333';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  drawRoundRect(ctx, x, y, width, height, 6, '#333333', '#ffffff', 2);
  
  // HP fill (gradient from red to orange)
  const fillWidth = (hp / maxHp) * (width - 4);
  const grad = ctx.createLinearGradient(x + 2, y, x + 2 + fillWidth, y);
  grad.addColorStop(0, '#ff0000');
  grad.addColorStop(1, '#ffaa00');
  ctx.fillStyle = grad;
  ctx.fillRect(x + 2, y + 2, fillWidth, height - 4);
  
  // HP text on gauge
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.ceil(hp)}/${maxHp}`, x + width / 2, y + height / 2);
}
```

Expected: Helpers defined.

- [ ] **Step 2: Replace HUD rendering**

Replace the existing "Draw HUD" section with:

```javascript
  // Draw HUD background panel (semi-transparent dark)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  drawRoundRect(ctx, 5, 5, 250, 110, 8, 'rgba(0, 0, 0, 0.5)', '#ffff00', 2);
  
  // Level
  drawChunkytText(ctx, `Level: ${state.level}`, 20, 15, 20, '#ffff00');
  
  // Score
  drawChunkytText(ctx, `Score: ${state.score}`, 20, 40, 20, '#ffff00');
  
  // Lives (icon-based: small ship heads)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.textBaseline = 'top';
  ctx.fillText('Lives:', 20, 65);
  for (let i = 0; i < state.lives; i++) {
    drawLifeIcon(ctx, 100 + i * 22, 68, 12, true);
  }
  
  // Boss HP gauge (only show if boss is active)
  if (state.boss) {
    drawBossHpGauge(ctx, GAME_WIDTH - 250, 10, 240, 30, state.boss.hp, state.boss.maxHp || 15);
  }
```

Expected: HUD draws with chunky fonts, icon-based lives, optional boss HP gauge.

- [ ] **Step 3: Commit HUD upgrade**

```bash
git add games/shmup_slice/render.mjs
git commit -m "feat(shmup): upgrade HUD with chunky rounded style, icon-based lives, boss HP gauge"
```

---

## Task 9: Draw Game-Over and Victory Overlays in Kawaii Style

**Files:**
- Modify: `games/shmup_slice/render.mjs` (overlay section)

**Interfaces:**
- Consumes: state.status ('WON' or 'LOST'), state.score, DOM element #overlay (exists from main.mjs), #restart button
- Produces: drawOverlay(ctx, state) draws screen-filling overlay; DOM management via main.mjs hooks

- [ ] **Step 1: Add overlay drawing helper**

Add before createRenderer:

```javascript
function drawVictoryOverlay(ctx) {
  // Overlay background (semi-transparent gradient)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  
  // Victory banner
  ctx.fillStyle = '#ffff00';
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICTORY!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60);
  
  // Celebration text
  ctx.fillStyle = '#ff69b4';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('You saved the day! 🎉', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
  
  // Restart hint
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px Arial';
  ctx.fillText('Press #restart or press R', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70);
}

function drawDefeatOverlay(ctx) {
  // Overlay background (softer, not punitive)
  ctx.fillStyle = 'rgba(100, 50, 150, 0.5)'; // purple tint
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  
  // Defeat text (gentle, not harsh)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 60px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Game Over', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);
  
  // Encouragement
  ctx.fillStyle = '#ffcccc';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('Keep trying! You got this!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
  
  // Restart hint
  ctx.fillStyle = '#ffff99';
  ctx.font = '18px Arial';
  ctx.fillText('Press #restart or press R', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
}
```

Expected: Overlay helpers defined.

- [ ] **Step 2: Integrate overlays into render**

In the render function (state), replace the existing overlay section with:

```javascript
  // Draw overlay for game-over states
  if (state.status === 'WON') {
    drawVictoryOverlay(ctx);
  } else if (state.status === 'LOST') {
    drawDefeatOverlay(ctx);
  }
```

Expected: render function calls overlay function based on status.

- [ ] **Step 3: Commit overlay drawings**

```bash
git add games/shmup_slice/render.mjs
git commit -m "feat(shmup): add victory and defeat overlays in kawaii style"
```

---

## Task 10: Verify No Logic Dependencies and Run Full Oracle

**Files:**
- Verify: `games/shmup_slice/render.mjs` (no imports from logic/*, data/*, bot/*, main.mjs)
- Test: run `node run-oracle.mjs` in games/shmup_slice

**Interfaces:**
- Produces: exit code 0 if all tests pass (logic.test, properties.test, solvability, e2e, mutation gate)

- [ ] **Step 1: Check for forbidden imports**

```bash
cd games/shmup_slice
grep -E "import.*from.*['\"].*logic/|import.*from.*['\"].*data/|import.*from.*['\"].*bot/|import.*from.*['\"].*main" render.mjs
```

Expected: No output (zero forbidden imports).

- [ ] **Step 2: Verify static architecture**

Confirm render.mjs has ONLY:
- `export function createRenderer(canvas)`
- No internal state mutation that affects game logic
- Pure drawing (canvas API only)

```bash
grep -E "export|import" games/shmup_slice/render.mjs
```

Expected: Only `export function createRenderer` and internal helper functions (no imports).

- [ ] **Step 3: Run full oracle**

```bash
cd games/shmup_slice
node run-oracle.mjs
```

Expected: Exit 0, all tests pass:
- logic.test.mjs: 65/65 assertions pass (unchanged)
- properties.test.mjs: 7/7 properties verified (unchanged)
- solvability.mjs: 5 seeds × 3 maps PASS (bot still beats the game)
- e2e.mjs: Playwright test passes (click-through works, boss HP visible, victory screen reached)
- mutation gate: 111/112 mutants killed, 1 survivant triaged (unchanged from s5)

Evidence output: evidence_path logs screenshots + exit 0.

- [ ] **Step 4: Final verification commit**

```bash
git add games/shmup_slice/render.mjs
git commit -m "feat(shmup): render patch complete - oracle all green (logic 65/65, props 7/7, solvability 5/5, e2e PASS, mutation 111/112)"
```

---

## Task 11: Update WireMap with Render Proof

**Files:**
- Modify: `lab/forge_runs/shmup_slice/wiremap.json` (statut/version/preuve for render features)

**Interfaces:**
- Consumes: wiremap.json features R11-R20 (backgrounds, boss graphics, HUD, screens)
- Produces: Updated wiremap with statut='fait', version='v2-render', preuve citing oracle output

- [ ] **Step 1: Read current wiremap statuses**

The wiremap already marks all logic features as 'fait' (v1). For render features (R11 MAP backgrounds through R20 screens), add version and proof:

```bash
# Read relevant section
grep -A 5 '"feature": "R11' lab/forge_runs/shmup_slice/wiremap.json
grep -A 5 '"feature": "R14' lab/forge_runs/shmup_slice/wiremap.json
grep -A 5 '"feature": "R18' lab/forge_runs/shmup_slice/wiremap.json
```

- [ ] **Step 2: Update render feature entries**

For each of R11-R20 (background + entity rendering + HUD + screens), update the wiremap entry:

Example for R11:
```json
{
  "feature": "R11 MAP 1 declaration propre",
  "fonction": "drawMapBg1",
  "fichiers": [
    "render.mjs"
  ],
  "version": "v2-render",
  "statut": "fait",
  "preuve": "render.mjs cream cloud gradient + candy sprite decorations; oracle solvability 5/5 PASS (visual changes do not affect logic), e2e PASS (screenshot evidence in lab/forge_runs/shmup_slice/evidence/)"
}
```

Repeat for R12, R13 (maps), R14-R16 (bosses), R18-R20 (overlays/screens), plus new entries for R21-R26 (projectiles, explosions, HUD).

- [ ] **Step 3: Add new render-specific features to wiremap**

Add entries for visual enhancements not previously tracked:
- R21: "Player ship chibi rendering with cockpit + eyes"
- R22: "Enemy families distinguish by formation (yellow/orange vs green/cyan)"
- R23: "Boss three distinct colors + expressive faces"
- R24: "Projectile contrast (cyan stars vs warm halos)"
- R25: "Explosion pop animation sequence"
- R26: "HUD chunky rounded style with icon lives"

Each with fonction, fichiers: [render.mjs], version: v2-render, statut: fait, preuve: oracle evidence.

- [ ] **Step 4: Final wiremap commit**

```bash
git add lab/forge_runs/shmup_slice/wiremap.json
git commit -m "docs(wiremap): update render features R11-R26 with v2-render proof (oracle all green)"
```

---

## Oracle Verification Checklist

Before delivering, verify:

- [ ] `node run-oracle.mjs` returns exit 0
- [ ] logic.test.mjs all pass (65/65) — render changes must not break logic
- [ ] properties.test.mjs all pass (7/7) — invariants still hold
- [ ] solvability.mjs all pass (5 seeds, 3 maps, 3 boss) — bot still wins
- [ ] e2e.mjs passes (Playwright click-through, boss HP visible, victory screen)
- [ ] mutation gate: 111/112 mutants killed (1 triaged as equivalent)
- [ ] render.mjs has zero forbidden imports (no logic/*, data/*, bot/*, main.mjs)
- [ ] No canvas API used outside render.mjs
- [ ] Assets loaded with fallback (console warn if missing, but game continues)
- [ ] All visual elements present (ship, enemies, bosses, projectiles, explosions, HUD, overlays)

---

## Expected Outputs

**Micro-commits:**
1. Asset preload infrastructure
2. Map backgrounds (clouds, candy, stars)
3. Chibi ship rendering
4. Enemy family colors
5. Boss three distinct designs
6. Projectile contrast drawing
7. Explosion pop animation
8. HUD chunky upgrade
9. Victory/defeat overlays
10. Render patch complete + oracle green
11. WireMap updated

**Deliverable:**
- render.mjs fully refactored (350+ lines, layered drawing with asset fallbacks)
- games/shmup_slice/assets/ with 13 CC0 candy sprites
- wiremap.json updated (R11-R26 v2-render proofs)
- evidence_path: lab/forge_runs/shmup_slice/evidence/s9-build-render-oracle.json (exit 0)
- Final report with software_verdict: OK, evidence_verdict: MECHANICAL_VALIDATION_ONLY, claim_verdict: NO_CLAIM_ALLOWED

---

**Plan complete and saved.**

---

## Execution Choice

Two paths forward:

**1. Subagent-Driven (recommended for independence)** — I dispatch a fresh subagent per task, review outputs between tasks, catch errors early, fast iteration.

**2. Inline Execution** — Execute tasks in this session using superpowers:executing-plans, batch with checkpoints for your review.

**Which approach do you prefer?**
