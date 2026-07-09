# Leviathan — « Le Cœur Vivant » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prouver sur device Android réel que la boucle centrale de Leviathan (Titan idle + combat auto-battler à Ultime au timing) tient 60 FPS et est amusante, avant tout investissement contenu.

**Architecture:** Approche A — logique pure TypeScript (`systems/`, testable vitest) + rendu PixiJS (`game/`) + UI React (`ui/`), pontés par un store unique (`store/`). Un seul driver (`gameLoop`) avance la logique et écrit le store ; le rendu et l'UI ne font que lire l'état et émettre des inputs.

**Tech Stack:** React 18, TypeScript 5.6, Vite 6, PixiJS 8, Capacitor 7, Vitest. Cible `games/leviathan/`.

## Global Constraints

- **Stack figée (ADR-001 option B) :** React/TS + Vite + Capacitor + PixiJS. Aucune autre lib de jeu.
- **Logique pure isolée :** aucun import Pixi/React dans `systems/` ni `store/`. Aucune logique de jeu dans `game/` ni `ui/`.
- **Combat déterministe :** `combat.step` est une fonction pure, pas de temps FIXE (`FIXED_DT = 1/60`), PRNG seedé pur (`nextRand`). Même seed + mêmes inputs → même issue.
- **Portrait only**, jouable une main, safe-areas gérées (`viewport-fit=cover` + `env()`).
- **Exclu :** gacha, économie fine, 30 héros, 8 biomes, narratif, monétisation, backend, iOS, art final.
- **Device de mesure :** Redmi Note 15 Pro+ 5G, `adb` target `BYZL25032200106840`.
- **Gate :** FPS < 60 au baseline réaliste sur device → STOP, déclencher le fallback Godot (ADR-001).
- **Constantes de tuning** (valeurs de départ ci-dessous) : équilibrage réel = jugement Pierre, NO_CLAIM_ALLOWED.

---

## File Structure

```
games/leviathan/
  package.json · vite.config.ts · tsconfig.json · capacitor.config.ts · index.html · .gitignore
  vitest.config.ts
  src/
    main.tsx · App.tsx · index.css
    store/gameStore.ts · store/useGame.ts
    systems/rng.ts · systems/idle.ts · systems/combat.ts
    game/pixiApp.ts · game/titanScene.ts · game/combatScene.ts
    ui/Hud.tsx · ui/ExpeditionButton.tsx · ui/UltimateButton.tsx · ui/StressDial.tsx
    perf/fpsMeter.ts
    gameLoop.ts
    tests/idle.test.ts · tests/combat.test.ts · tests/gameLoop.test.ts
docs/leviathan/coeur-vivant-mesures.md   (créé en Task 12)
```

---

## Task 1: Scaffold du projet + outillage de test

**Files:**
- Create: `games/leviathan/package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `capacitor.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/systems/rng.ts`, `src/tests/rng.test.ts`

**Interfaces:**
- Produces: `nextRand(seed: number): { value: number; seed: number }` (dans `systems/rng.ts`)

- [ ] **Step 1: Créer les fichiers de config**

`games/leviathan/package.json` :
```json
{
  "name": "leviathan",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "cap:run": "vite build && npx cap sync android && npx cap run android"
  },
  "dependencies": {
    "@capacitor/android": "^7.0.0",
    "@capacitor/core": "^7.0.0",
    "pixi.js": "^8.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@capacitor/cli": "^7.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.3",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

`vite.config.ts` :
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], base: './', build: { outDir: 'dist' } })
```

`vitest.config.ts` :
```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node', include: ['src/tests/**/*.test.ts'] } })
```

`tsconfig.json` :
```json
{
  "compilerOptions": {
    "target": "ES2020", "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext", "moduleResolution": "bundler",
    "jsx": "react-jsx", "strict": true, "noEmit": true,
    "skipLibCheck": true, "types": ["vite/client"]
  },
  "include": ["src"]
}
```

`capacitor.config.ts` :
```ts
import type { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = { appId: 'com.wanderingoasis.leviathan', appName: 'Leviathan', webDir: 'dist' }
export default config
```

`index.html` :
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
    <title>Leviathan</title>
  </head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

`.gitignore` :
```
node_modules/
dist/
android/
*.log
```

`src/index.css` :
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #root { width: 100%; height: 100%; overflow: hidden; background: #0b0f14; color: #dfe; font-family: system-ui, sans-serif; }
#root { position: fixed; inset: 0; }
canvas { display: block; }
```

`src/App.tsx` (stub) :
```tsx
export function App() {
  return <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center' }}>Leviathan — boot</div>
}
```

`src/main.tsx` :
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
```

- [ ] **Step 2: Écrire le test du PRNG (échoue)**

`src/tests/rng.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { nextRand } from '../systems/rng'

describe('nextRand', () => {
  it('est déterministe pour un même seed', () => {
    expect(nextRand(42)).toEqual(nextRand(42))
  })
  it('renvoie une valeur dans [0,1)', () => {
    const { value } = nextRand(123)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThan(1)
  })
  it('avance : la valeur suivante diffère', () => {
    const a = nextRand(7)
    const b = nextRand(a.seed)
    expect(b.value).not.toEqual(a.value)
  })
})
```

- [ ] **Step 3: Lancer le test — il échoue**

Run: `cd games/leviathan && npm install && npm test`
Expected: FAIL — `Cannot find module '../systems/rng'`

- [ ] **Step 4: Implémenter `systems/rng.ts`**

`src/systems/rng.ts` :
```ts
// PRNG déterministe pur (mulberry32). nextRand(seed) -> { value in [0,1), seed suivant }.
export function nextRand(seed: number): { value: number; seed: number } {
  let a = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, seed: a }
}
```

- [ ] **Step 5: Lancer le test — il passe**

Run: `npm test`
Expected: PASS (3 tests rng)

- [ ] **Step 6: Vérifier le dev server (shell vide)**

Run: `npm run dev` puis ouvrir l'URL affichée.
Expected: page portrait « Leviathan — boot ». Arrêter (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add games/leviathan
git commit -m "feat(leviathan): scaffold projet + PRNG seede (Coeur Vivant Task 1)"
```

---

## Task 2: Système idle (biomasse) — pur, testé

**Files:**
- Create: `games/leviathan/src/systems/idle.ts`, `games/leviathan/src/tests/idle.test.ts`

**Interfaces:**
- Produces:
  - `interface IdleState { biomass: number; lastTick: number }`
  - `createIdle(now: number): IdleState`
  - `accrue(state: IdleState, now: number): IdleState`
  - `spend(state: IdleState, cost: number): { state: IdleState; ok: boolean }`
  - const `IDLE_RATE`, `OFFLINE_CAP_MS`

- [ ] **Step 1: Écrire les tests (échouent)**

`src/tests/idle.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { createIdle, accrue, spend, IDLE_RATE, OFFLINE_CAP_MS } from '../systems/idle'

describe('idle', () => {
  it('accrue = IDLE_RATE * secondes écoulées', () => {
    const s = accrue(createIdle(0), 1000)
    expect(s.biomass).toBeCloseTo(IDLE_RATE * 1)
  })
  it('dt=0 → inchangé', () => {
    const s = accrue(createIdle(500), 500)
    expect(s.biomass).toBe(0)
  })
  it('dt<0 (horloge en arrière) → biomasse inchangée', () => {
    const s = accrue({ biomass: 5, lastTick: 1000 }, 400)
    expect(s.biomass).toBe(5)
  })
  it('plafonne le catch-up offline', () => {
    const huge = OFFLINE_CAP_MS * 10
    const s = accrue(createIdle(0), huge)
    expect(s.biomass).toBeCloseTo((OFFLINE_CAP_MS / 1000) * IDLE_RATE)
  })
  it('spend réussit si solde suffisant', () => {
    const r = spend({ biomass: 30, lastTick: 0 }, 20)
    expect(r.ok).toBe(true)
    expect(r.state.biomass).toBe(10)
  })
  it('spend échoue si solde insuffisant (état inchangé)', () => {
    const r = spend({ biomass: 5, lastTick: 0 }, 20)
    expect(r.ok).toBe(false)
    expect(r.state.biomass).toBe(5)
  })
})
```

- [ ] **Step 2: Lancer — échoue**

Run: `npm test -- idle`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter `systems/idle.ts`**

```ts
export interface IdleState { biomass: number; lastTick: number }

// Tuning (spec §11) — équilibrage = gate Pierre.
export const IDLE_RATE = 4          // biomasse / seconde
export const OFFLINE_CAP_MS = 8 * 3600 * 1000  // 8 h de catch-up max

export function createIdle(now: number): IdleState { return { biomass: 0, lastTick: now } }

export function accrue(state: IdleState, now: number): IdleState {
  const dt = Math.min(Math.max(now - state.lastTick, 0), OFFLINE_CAP_MS)
  return { biomass: state.biomass + (dt / 1000) * IDLE_RATE, lastTick: now }
}

export function spend(state: IdleState, cost: number): { state: IdleState; ok: boolean } {
  if (state.biomass < cost) return { state, ok: false }
  return { state: { ...state, biomass: state.biomass - cost }, ok: true }
}
```

- [ ] **Step 4: Lancer — passe**

Run: `npm test -- idle`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add games/leviathan/src/systems/idle.ts games/leviathan/src/tests/idle.test.ts
git commit -m "feat(leviathan): systeme idle biomasse (Task 2)"
```

---

## Task 3: Système combat — pur, déterministe, testé

**Files:**
- Create: `games/leviathan/src/systems/combat.ts`, `games/leviathan/src/tests/combat.test.ts`

**Interfaces:**
- Consumes: `nextRand` (Task 1)
- Produces:
  - `interface Fighter { hp: number; maxHp: number; atk: number }`
  - `interface CombatState { heroes: Fighter[]; enemy: Fighter; rngSeed: number; heroAtkTimer: number; enemyAtkTimer: number; casting: boolean; castElapsed: number; castCooldown: number; ultimateCooldown: number; phase: 'fighting'|'won'|'lost'; lastInterrupt: 'none'|'success'|'missed' }`
  - `createCombat(seed: number): CombatState`
  - `step(prev: CombatState, dt: number, ultimatePressed: boolean): CombatState`
  - `interruptWindowOpen(s: CombatState): boolean`
  - `ultimateReady(s: CombatState): boolean`
  - const `CAST_DURATION`, `INTERRUPT_WINDOW` (+ autres constantes de tuning)

- [ ] **Step 1: Écrire les tests (échouent)**

`src/tests/combat.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { createCombat, step, interruptWindowOpen, CAST_DURATION, INTERRUPT_WINDOW } from '../systems/combat'

const DT = 1 / 60
function run(seed: number, ultimatePresses: number[]): ReturnType<typeof createCombat> {
  let s = createCombat(seed)
  for (let i = 0; i < 6000 && s.phase === 'fighting'; i++) {
    s = step(s, DT, ultimatePresses.includes(i))
  }
  return s
}

describe('combat', () => {
  it('déterministe : même seed + mêmes inputs → même issue', () => {
    expect(run(1, [])).toEqual(run(1, []))
  })
  it('les auto-attaques baissent les HP de l’ennemi', () => {
    let s = createCombat(3)
    for (let i = 0; i < 120; i++) s = step(s, DT, false)
    expect(s.enemy.hp).toBeLessThan(s.enemy.maxHp)
  })
  it('un cast finit par s’ouvrir en fenêtre d’interruption', () => {
    let s = createCombat(3)
    let sawWindow = false
    for (let i = 0; i < 600 && !sawWindow; i++) { s = step(s, DT, false); sawWindow = interruptWindowOpen(s) }
    expect(sawWindow).toBe(true)
  })
  it('Ultime dans la fenêtre → interruption réussie', () => {
    let s = createCombat(3)
    let done = false
    for (let i = 0; i < 600 && !done; i++) {
      const press = interruptWindowOpen(s)
      s = step(s, DT, press)
      if (s.lastInterrupt === 'success') done = true
    }
    expect(done).toBe(true)
  })
  it('cast non interrompu → un héros encaisse (lastInterrupt=missed au moins une fois)', () => {
    let s = createCombat(3)
    let missed = false
    for (let i = 0; i < 900 && !missed; i++) { s = step(s, DT, false); if (s.lastInterrupt === 'missed') missed = true }
    expect(missed).toBe(true)
  })
  it('fenêtre d’interruption dure ~INTERRUPT_WINDOW en fin de cast', () => {
    expect(INTERRUPT_WINDOW).toBeLessThan(CAST_DURATION)
  })
})
```

- [ ] **Step 2: Lancer — échoue**

Run: `npm test -- combat`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter `systems/combat.ts`**

```ts
import { nextRand } from './rng'

export interface Fighter { hp: number; maxHp: number; atk: number }
export interface CombatState {
  heroes: Fighter[]; enemy: Fighter; rngSeed: number
  heroAtkTimer: number; enemyAtkTimer: number
  casting: boolean; castElapsed: number; castCooldown: number
  ultimateCooldown: number
  phase: 'fighting' | 'won' | 'lost'
  lastInterrupt: 'none' | 'success' | 'missed'
}

// Tuning (spec §11) — équilibrage = gate Pierre.
export const HERO_HP = 100, HERO_ATK = 8
export const ENEMY_HP = 220, ENEMY_ATK = 6
export const ATK_INTERVAL = 0.8
export const CAST_COOLDOWN = 4
export const CAST_DURATION = 2.0
export const INTERRUPT_WINDOW = 0.6
export const CAST_DAMAGE = 40
export const ULTIMATE_DAMAGE = 60
export const ULTIMATE_COOLDOWN = 3

export function createCombat(seed: number): CombatState {
  return {
    heroes: [ { hp: HERO_HP, maxHp: HERO_HP, atk: HERO_ATK }, { hp: HERO_HP, maxHp: HERO_HP, atk: HERO_ATK } ],
    enemy: { hp: ENEMY_HP, maxHp: ENEMY_HP, atk: ENEMY_ATK },
    rngSeed: seed >>> 0,
    heroAtkTimer: ATK_INTERVAL, enemyAtkTimer: ATK_INTERVAL,
    casting: false, castElapsed: 0, castCooldown: CAST_COOLDOWN,
    ultimateCooldown: 0, phase: 'fighting', lastInterrupt: 'none',
  }
}

function firstAliveHero(heroes: Fighter[]): Fighter | undefined { return heroes.find((h) => h.hp > 0) }
export function interruptWindowOpen(s: CombatState): boolean {
  return s.casting && s.castElapsed >= CAST_DURATION - INTERRUPT_WINDOW
}
export function ultimateReady(s: CombatState): boolean { return s.ultimateCooldown <= 0 }

export function step(prev: CombatState, dt: number, ultimatePressed: boolean): CombatState {
  if (prev.phase !== 'fighting') return prev
  const heroes = prev.heroes.map((h) => ({ ...h }))
  const enemy = { ...prev.enemy }
  let { rngSeed, heroAtkTimer, enemyAtkTimer, casting, castElapsed, castCooldown, ultimateCooldown } = prev
  let lastInterrupt: CombatState['lastInterrupt'] = 'none'

  ultimateCooldown = Math.max(0, ultimateCooldown - dt)

  if (ultimatePressed && ultimateCooldown <= 0) {
    if (casting && castElapsed >= CAST_DURATION - INTERRUPT_WINDOW) {
      casting = false; castElapsed = 0; castCooldown = CAST_COOLDOWN
      enemy.hp -= ULTIMATE_DAMAGE; lastInterrupt = 'success'
    } else {
      enemy.hp -= HERO_ATK // tap hors fenêtre : petit dégât, évite le spam gratuit
    }
    ultimateCooldown = ULTIMATE_COOLDOWN
  }

  heroAtkTimer -= dt
  if (heroAtkTimer <= 0) {
    heroAtkTimer += ATK_INTERVAL
    const dmg = heroes.reduce((sum, h) => sum + (h.hp > 0 ? h.atk : 0), 0)
    const r = nextRand(rngSeed); rngSeed = r.seed
    enemy.hp -= dmg * (0.8 + 0.4 * r.value)
  }

  if (casting) {
    castElapsed += dt
    if (castElapsed >= CAST_DURATION) {
      const target = firstAliveHero(heroes); if (target) target.hp -= CAST_DAMAGE
      casting = false; castElapsed = 0; castCooldown = CAST_COOLDOWN; lastInterrupt = 'missed'
    }
  } else {
    castCooldown -= dt; enemyAtkTimer -= dt
    if (enemyAtkTimer <= 0) { enemyAtkTimer += ATK_INTERVAL; const t = firstAliveHero(heroes); if (t) t.hp -= enemy.atk }
    if (castCooldown <= 0) { casting = true; castElapsed = 0 }
  }

  let phase: CombatState['phase'] = 'fighting'
  if (enemy.hp <= 0) phase = 'won'
  else if (!firstAliveHero(heroes)) phase = 'lost'

  return { heroes, enemy, rngSeed, heroAtkTimer, enemyAtkTimer, casting, castElapsed, castCooldown, ultimateCooldown, phase, lastInterrupt }
}
```

- [ ] **Step 4: Lancer — passe**

Run: `npm test -- combat`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add games/leviathan/src/systems/combat.ts games/leviathan/src/tests/combat.test.ts
git commit -m "feat(leviathan): systeme combat deterministe + Ultime interruption (Task 3)"
```

---

## Task 4: Store + boucle logique — pur, testé (invariance pas-de-temps-fixe)

**Files:**
- Create: `games/leviathan/src/store/gameStore.ts`, `games/leviathan/src/gameLoop.ts`, `games/leviathan/src/tests/gameLoop.test.ts`

**Interfaces:**
- Consumes: `IdleState`, `accrue`, `spend`, `createIdle` (Task 2) ; `CombatState`, `createCombat`, `step` (Task 3)
- Produces:
  - `type Phase = 'idle' | 'combat'`
  - `interface GameState { idle: IdleState; phase: Phase; combat: CombatState | null; ultimateQueued: boolean; stressLevel: number; expeditionCount: number; lastResult: 'none'|'won'|'lost' }`
  - `createStore(initial: GameState)` → `{ getState, setState, subscribe }`, `type GameStore`
  - `advance(store: GameStore, nowMs: number, acc: { t: number }, dtMs: number): void`
  - `launchExpedition(store: GameStore): boolean`
  - const `FIXED_DT`, `EXPEDITION_COST`, `REWARD`

- [ ] **Step 1: Écrire les tests (échouent)**

`src/tests/gameLoop.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { createStore, GameState } from '../store/gameStore'
import { advance, launchExpedition, EXPEDITION_COST, REWARD } from '../gameLoop'
import { createIdle } from '../systems/idle'

function freshStore(biomass = 0): ReturnType<typeof createStore> {
  const init: GameState = { idle: { ...createIdle(0), biomass }, phase: 'idle', combat: null, ultimateQueued: false, stressLevel: 0, expeditionCount: 0, lastResult: 'none' }
  return createStore(init)
}

describe('store', () => {
  it('setState notifie les abonnés', () => {
    const s = freshStore(); let seen = -1
    s.subscribe((st) => { seen = st.idle.biomass })
    s.setState({ idle: { biomass: 42, lastTick: 0 } })
    expect(seen).toBe(42)
  })
})

describe('gameLoop', () => {
  it('en idle, advance accumule la biomasse', () => {
    const s = freshStore(); advance(s, 1000, { t: 0 }, 1000)
    expect(s.getState().idle.biomass).toBeGreaterThan(0)
  })
  it('launchExpedition échoue si biomasse < coût', () => {
    const s = freshStore(EXPEDITION_COST - 1)
    expect(launchExpedition(s)).toBe(false)
    expect(s.getState().phase).toBe('idle')
  })
  it('launchExpedition réussit, dépense, passe en combat', () => {
    const s = freshStore(EXPEDITION_COST + 5)
    expect(launchExpedition(s)).toBe(true)
    expect(s.getState().phase).toBe('combat')
    expect(s.getState().idle.biomass).toBeCloseTo(5)
    expect(s.getState().combat).not.toBeNull()
  })
  it('invariance pas-de-temps-fixe : 1×1000ms == 10×100ms (même combat)', () => {
    const a = freshStore(EXPEDITION_COST); launchExpedition(a)
    const b = freshStore(EXPEDITION_COST); launchExpedition(b)
    const accA = { t: 0 }; advance(a, 0, accA, 1000)
    const accB = { t: 0 }; for (let i = 0; i < 10; i++) advance(b, 0, accB, 100)
    expect(a.getState().combat).toEqual(b.getState().combat)
  })
  it('victoire crédite REWARD et revient en idle', () => {
    const s = freshStore(EXPEDITION_COST); launchExpedition(s)
    const acc = { t: 0 }
    for (let i = 0; i < 600 && s.getState().phase === 'combat'; i++) {
      s.setState({ ultimateQueued: true }); advance(s, 0, acc, 1000 / 60)
    }
    if (s.getState().lastResult === 'won') expect(s.getState().idle.biomass).toBeGreaterThanOrEqual(REWARD - 0.01)
  })
})
```

- [ ] **Step 2: Lancer — échoue**

Run: `npm test -- gameLoop`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Implémenter `store/gameStore.ts`**

```ts
import type { CombatState } from '../systems/combat'
import type { IdleState } from '../systems/idle'

export type Phase = 'idle' | 'combat'
export interface GameState {
  idle: IdleState
  phase: Phase
  combat: CombatState | null
  ultimateQueued: boolean
  stressLevel: number
  expeditionCount: number
  lastResult: 'none' | 'won' | 'lost'
}
type Listener = (s: GameState) => void

export function createStore(initial: GameState) {
  let state = initial
  const listeners = new Set<Listener>()
  return {
    getState: (): GameState => state,
    setState: (partial: Partial<GameState>): void => {
      state = { ...state, ...partial }
      listeners.forEach((l) => l(state))
    },
    subscribe: (l: Listener): (() => void) => { listeners.add(l); return () => { listeners.delete(l) } },
  }
}
export type GameStore = ReturnType<typeof createStore>
```

- [ ] **Step 4: Implémenter `gameLoop.ts`**

```ts
import { accrue, spend } from './systems/idle'
import { createCombat, step } from './systems/combat'
import type { GameStore } from './store/gameStore'

export const FIXED_DT = 1 / 60            // pas de sim combat (s)
export const EXPEDITION_COST = 20
export const REWARD = 35                  // > EXPEDITION_COST : boucle net-positive

// Avance la logique d'un frame réel. Ne touche QUE le store (rendu-agnostique).
export function advance(store: GameStore, nowMs: number, acc: { t: number }, dtMs: number): void {
  const s = store.getState()
  if (s.phase === 'idle') {
    store.setState({ idle: accrue(s.idle, nowMs) })
    return
  }
  if (!s.combat) return
  acc.t += dtMs / 1000
  let combat = s.combat
  let ultimateQueued = s.ultimateQueued
  while (acc.t >= FIXED_DT) {
    combat = step(combat, FIXED_DT, ultimateQueued)
    ultimateQueued = false            // input consommé une fois
    acc.t -= FIXED_DT
    if (combat.phase !== 'fighting') break
  }
  if (combat.phase === 'won') {
    store.setState({ combat: null, phase: 'idle', idle: { ...s.idle, biomass: s.idle.biomass + REWARD }, lastResult: 'won', ultimateQueued: false })
  } else if (combat.phase === 'lost') {
    store.setState({ combat: null, phase: 'idle', lastResult: 'lost', ultimateQueued: false })
  } else {
    store.setState({ combat, ultimateQueued })
  }
}

export function launchExpedition(store: GameStore): boolean {
  const s = store.getState()
  const res = spend(s.idle, EXPEDITION_COST)
  if (!res.ok) return false
  store.setState({
    idle: res.state, phase: 'combat',
    combat: createCombat(s.expeditionCount + 1),
    expeditionCount: s.expeditionCount + 1,
    ultimateQueued: false, lastResult: 'none',
  })
  return true
}
```

- [ ] **Step 5: Lancer — passe**

Run: `npm test`
Expected: PASS (tous : rng, idle, combat, store, gameLoop)

- [ ] **Step 6: Commit**

```bash
git add games/leviathan/src/store/gameStore.ts games/leviathan/src/gameLoop.ts games/leviathan/src/tests/gameLoop.test.ts
git commit -m "feat(leviathan): store unique + boucle logique invariante au fps (Task 4)"
```

---

## Task 5: Pixi app + overlay FPS + hook React

**Files:**
- Create: `games/leviathan/src/game/pixiApp.ts`, `games/leviathan/src/perf/fpsMeter.ts`, `games/leviathan/src/store/useGame.ts`

**Interfaces:**
- Consumes: `GameStore`, `GameState` (Task 4)
- Produces:
  - `initPixi(container: HTMLElement): Promise<Application>`
  - `mountFpsMeter(): () => void` (retourne un cleanup)
  - `useGame<T>(store: GameStore, sel: (s: GameState) => T): T`

Vérification = manuelle/device (pas d'unit test : nécessite WebGL/DOM).

- [ ] **Step 1: Implémenter `game/pixiApp.ts`**

```ts
import { Application } from 'pixi.js'
export async function initPixi(container: HTMLElement): Promise<Application> {
  const app = new Application()
  await app.init({ resizeTo: container, background: '#0b0f14', antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 })
  container.appendChild(app.canvas)
  return app
}
```

- [ ] **Step 2: Implémenter `perf/fpsMeter.ts`**

```ts
// Rig de mesure du critère (a) : FPS via requestAnimationFrame, overlay on-screen.
export function mountFpsMeter(): () => void {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;top:env(safe-area-inset-top,8px);left:8px;z-index:9999;' +
    'font:12px/1.4 monospace;color:#9fe;background:rgba(0,0,0,.55);padding:4px 8px;border-radius:6px;pointer-events:none'
  document.body.appendChild(el)
  let frames = 0, last = performance.now(), raf = 0
  const loop = (now: number) => {
    frames++
    if (now - last >= 500) { el.textContent = `${Math.round((frames * 1000) / (now - last))} fps`; frames = 0; last = now }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => { cancelAnimationFrame(raf); el.remove() }
}
```

- [ ] **Step 3: Implémenter `store/useGame.ts`**

```ts
import { useSyncExternalStore } from 'react'
import type { GameStore, GameState } from './gameStore'
export function useGame<T>(store: GameStore, sel: (s: GameState) => T): T {
  return useSyncExternalStore(store.subscribe, () => sel(store.getState()))
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add games/leviathan/src/game/pixiApp.ts games/leviathan/src/perf/fpsMeter.ts games/leviathan/src/store/useGame.ts
git commit -m "feat(leviathan): init Pixi + overlay FPS + hook useGame (Task 5)"
```

---

## Task 6: Scène Titan (parallaxe + Titan + particules + stress)

**Files:**
- Create: `games/leviathan/src/game/titanScene.ts`

**Interfaces:**
- Consumes: `Application` (pixi.js)
- Produces:
  - `interface TitanScene { container: Container; setStress: (level: number) => void; destroy: () => void }`
  - `createTitanScene(app: Application): TitanScene`
  - const `TITAN_BASE_PARTICLES`, `TITAN_PARTICLES_PER_STRESS`

Vérification = manuelle/device (Task 8 puis Task 11).

- [ ] **Step 1: Implémenter `game/titanScene.ts`**

```ts
import { Application, Container, Graphics } from 'pixi.js'

export interface TitanScene { container: Container; setStress: (level: number) => void; destroy: () => void }
export const TITAN_BASE_PARTICLES = 80
export const TITAN_PARTICLES_PER_STRESS = 60

interface Mote { g: Graphics; x: number; y: number; vy: number }

export function createTitanScene(app: Application): TitanScene {
  const root = new Container()
  const W = () => app.screen.width, H = () => app.screen.height

  // Parallaxe : fond terne + collines qui défilent (le monde §14)
  const far = new Graphics().rect(0, 0, W(), H()).fill('#141d26')
  const hills = new Graphics()
  for (let i = 0; i < 8; i++) hills.circle(i * 200, H() * 0.72, 150).fill({ color: '#1d2c33', alpha: 0.6 })
  root.addChild(far, hills)

  // Titan : carapace arrondie luxuriante (premier plan §14) + lumière qui pulse
  const titan = new Container()
  const body = new Graphics().roundRect(-130, -90, 260, 180, 46).fill('#2f6d5b')
  const canopy = new Graphics().circle(-40, -70, 34).fill('#3fa07a').circle(50, -60, 40).fill('#348f6b')
  const light = new Graphics().circle(0, -10, 30).fill('#7fe9c4')
  titan.addChild(body, canopy, light)
  titan.x = W() / 2; titan.y = H() * 0.55
  root.addChild(titan)

  // Particules : pool de motes lumineuses montantes, count piloté par le stress
  const layer = new Container()
  root.addChild(layer)
  const pool: Mote[] = []
  const ensure = (count: number) => {
    while (pool.length < count) {
      const g = new Graphics().circle(0, 0, 2).fill('#bff5df')
      layer.addChild(g)
      pool.push({ g, x: Math.random() * W(), y: Math.random() * H(), vy: 20 + Math.random() * 45 })
    }
    while (pool.length > count) { const m = pool.pop()!; m.g.destroy() }
  }
  ensure(TITAN_BASE_PARTICLES)

  let t = 0
  const tick = (ticker: { deltaTime: number }) => {
    t += ticker.deltaTime
    light.scale.set(1 + 0.18 * Math.sin(t * 0.1))
    titan.y = H() * 0.55 + Math.sin(t * 0.03) * 6
    hills.x -= 0.3 * ticker.deltaTime
    if (hills.x < -200) hills.x = 0
    for (const m of pool) {
      m.y -= (m.vy * ticker.deltaTime) / 60
      if (m.y < -4) { m.y = H() + 4; m.x = Math.random() * W() }
      m.g.x = m.x; m.g.y = m.y
    }
  }
  app.ticker.add(tick)

  return {
    container: root,
    setStress: (level: number) => ensure(TITAN_BASE_PARTICLES + Math.max(0, level) * TITAN_PARTICLES_PER_STRESS),
    destroy: () => { app.ticker.remove(tick); root.destroy({ children: true }) },
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add games/leviathan/src/game/titanScene.ts
git commit -m "feat(leviathan): scene Titan parallaxe+particules+stress (Task 6)"
```

---

## Task 7: Scène combat (arène, HP, barre de cast, indice interruption)

**Files:**
- Create: `games/leviathan/src/game/combatScene.ts`

**Interfaces:**
- Consumes: `Application` (pixi), `GameStore` (Task 4), `interruptWindowOpen`, `CAST_DURATION` (Task 3)
- Produces:
  - `interface CombatScene { container: Container; destroy: () => void }`
  - `createCombatScene(app: Application, store: GameStore): CombatScene`

- [ ] **Step 1: Implémenter `game/combatScene.ts`**

```ts
import { Application, Container, Graphics } from 'pixi.js'
import type { GameStore } from '../store/gameStore'
import { interruptWindowOpen, CAST_DURATION } from '../systems/combat'

export interface CombatScene { container: Container; destroy: () => void }

export function createCombatScene(app: Application, store: GameStore): CombatScene {
  const root = new Container()
  const W = () => app.screen.width, H = () => app.screen.height
  const bg = new Graphics().roundRect(20, H() * 0.15, W() - 40, H() * 0.5, 16).fill({ color: '#10181f', alpha: 0.9 })
  const enemyBar = new Graphics(), heroBar = new Graphics(), castBar = new Graphics(), cue = new Graphics()
  root.addChild(bg, enemyBar, heroBar, castBar, cue)

  const tick = () => {
    const st = store.getState()
    const c = st.combat
    root.visible = st.phase === 'combat' && !!c
    if (!c) return
    const w = W() - 80
    enemyBar.clear().rect(40, H() * 0.2, w * Math.max(0, c.enemy.hp / c.enemy.maxHp), 14).fill('#e05a5a')
    const hp = c.heroes.reduce((s, h) => s + Math.max(0, h.hp), 0)
    const maxHp = c.heroes.reduce((s, h) => s + h.maxHp, 0)
    heroBar.clear().rect(40, H() * 0.58, w * (hp / maxHp), 14).fill('#5ae08f')
    castBar.clear()
    if (c.casting) castBar.rect(40, H() * 0.32, w * (c.castElapsed / CAST_DURATION), 8).fill('#e0b85a')
    cue.clear()
    if (interruptWindowOpen(c)) cue.roundRect(36, H() * 0.30, w + 8, 14, 4).stroke({ color: '#ffffff', width: 3 })
  }
  app.ticker.add(tick)
  return { container: root, destroy: () => { app.ticker.remove(tick); root.destroy({ children: true }) } }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add games/leviathan/src/game/combatScene.ts
git commit -m "feat(leviathan): scene combat (arene, HP, cast, interruption) (Task 7)"
```

---

## Task 8: UI React (HUD, expédition, Ultime, molette stress)

**Files:**
- Create: `games/leviathan/src/ui/Hud.tsx`, `ui/ExpeditionButton.tsx`, `ui/UltimateButton.tsx`, `ui/StressDial.tsx`

**Interfaces:**
- Consumes: `useGame` (Task 5), `GameStore` (Task 4), `interruptWindowOpen`, `ultimateReady` (Task 3), `launchExpedition`, `EXPEDITION_COST` (Task 4)
- Produces: 4 composants React prenant `{ store: GameStore }` en prop.

- [ ] **Step 1: Implémenter `ui/Hud.tsx`**

```tsx
import type { GameStore } from '../store/gameStore'
import { useGame } from '../store/useGame'

export function Hud({ store }: { store: GameStore }) {
  const biomass = useGame(store, (s) => Math.floor(s.idle.biomass))
  const phase = useGame(store, (s) => s.phase)
  const result = useGame(store, (s) => s.lastResult)
  return (
    <div style={{ position: 'fixed', top: 'env(safe-area-inset-top,10px)', right: 10, padding: '8px 12px',
      background: 'rgba(16,24,31,.55)', backdropFilter: 'blur(8px)', borderRadius: 12, font: '14px system-ui', color: '#dfe' }}>
      <div>Biomasse : <b>{biomass}</b></div>
      <div style={{ opacity: .7, fontSize: 12 }}>{phase === 'combat' ? 'Expédition…' : result === 'won' ? 'Victoire !' : result === 'lost' ? 'Défaite' : 'Repos'}</div>
    </div>
  )
}
```

- [ ] **Step 2: Implémenter `ui/ExpeditionButton.tsx`**

```tsx
import type { GameStore } from '../store/gameStore'
import { useGame } from '../store/useGame'
import { launchExpedition, EXPEDITION_COST } from '../gameLoop'

export function ExpeditionButton({ store }: { store: GameStore }) {
  const canGo = useGame(store, (s) => s.phase === 'idle' && s.idle.biomass >= EXPEDITION_COST)
  if (useGame(store, (s) => s.phase) === 'combat') return null
  return (
    <button disabled={!canGo} onClick={() => launchExpedition(store)}
      style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom,16px) + 16px)', left: '50%', transform: 'translateX(-50%)',
        padding: '16px 28px', fontSize: 18, borderRadius: 16, border: 'none', color: '#04120d',
        background: canGo ? '#5ae08f' : '#33403a', opacity: canGo ? 1 : .6 }}>
      Lancer l’expédition ({EXPEDITION_COST})
    </button>
  )
}
```

- [ ] **Step 3: Implémenter `ui/UltimateButton.tsx`**

```tsx
import type { GameStore } from '../store/gameStore'
import { useGame } from '../store/useGame'
import { interruptWindowOpen, ultimateReady } from '../systems/combat'

export function UltimateButton({ store }: { store: GameStore }) {
  const inCombat = useGame(store, (s) => s.phase === 'combat')
  const armed = useGame(store, (s) => !!s.combat && interruptWindowOpen(s.combat) && ultimateReady(s.combat))
  if (!inCombat) return null
  return (
    <button onClick={() => store.setState({ ultimateQueued: true })}
      style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom,16px) + 16px)', left: '50%', transform: 'translateX(-50%)',
        padding: '20px 34px', fontSize: 20, borderRadius: 20, border: 'none', color: '#150a02',
        background: armed ? '#ffd35a' : '#3a3320', boxShadow: armed ? '0 0 24px #ffd35a' : 'none', transition: 'background .1s' }}>
      ULTIME
    </button>
  )
}
```

- [ ] **Step 4: Implémenter `ui/StressDial.tsx`**

```tsx
import type { GameStore } from '../store/gameStore'
import { useGame } from '../store/useGame'

export function StressDial({ store }: { store: GameStore }) {
  const level = useGame(store, (s) => s.stressLevel)
  return (
    <div style={{ position: 'fixed', top: 'env(safe-area-inset-top,10px)', left: 10, padding: '6px 8px',
      background: 'rgba(16,24,31,.55)', backdropFilter: 'blur(8px)', borderRadius: 10, font: '11px monospace', color: '#9fe' }}>
      <div>stress: {level}</div>
      <button onClick={() => store.setState({ stressLevel: Math.max(0, level - 1) })}>−</button>
      <button onClick={() => store.setState({ stressLevel: level + 1 })}>+</button>
    </div>
  )
}
```

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` → aucune erreur.
```bash
git add games/leviathan/src/ui
git commit -m "feat(leviathan): UI React HUD/expedition/Ultime/stress (Task 8)"
```

---

## Task 9: Intégration App + persistance + boucle de rendu (navigateur)

**Files:**
- Modify: `games/leviathan/src/App.tsx` (remplace le stub)

**Interfaces:**
- Consumes: tout ce qui précède (`createStore`, `advance`, `initPixi`, `createTitanScene`, `createCombatScene`, `mountFpsMeter`, les 4 composants UI, `createIdle`)
- Produces: l'app jouable (aucune interface publique nouvelle)

- [ ] **Step 1: Implémenter `App.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { createStore, GameState, GameStore } from './store/gameStore'
import { advance } from './gameLoop'
import { createIdle } from './systems/idle'
import { initPixi } from './game/pixiApp'
import { createTitanScene } from './game/titanScene'
import { createCombatScene } from './game/combatScene'
import { mountFpsMeter } from './perf/fpsMeter'
import { Hud } from './ui/Hud'
import { ExpeditionButton } from './ui/ExpeditionButton'
import { UltimateButton } from './ui/UltimateButton'
import { StressDial } from './ui/StressDial'

const SAVE_KEY = 'leviathan.coeur-vivant.v1'

function loadInitial(now: number): GameState {
  const base: GameState = { idle: createIdle(now), phase: 'idle', combat: null, ultimateQueued: false, stressLevel: 0, expeditionCount: 0, lastResult: 'none' }
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (typeof p.biomass === 'number' && typeof p.expeditionCount === 'number') {
      base.idle = { biomass: p.biomass, lastTick: p.lastTick ?? now }
      base.expeditionCount = p.expeditionCount
    }
  } catch { /* corrompu → défauts */ }
  return base
}

export function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [store] = useState<GameStore>(() => createStore(loadInitial(performance.timeOrigin + performance.now())))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    const cleanups: Array<() => void> = []
    initPixi(hostRef.current!).then((app) => {
      if (disposed) { app.destroy(true); return }
      const titan = createTitanScene(app)
      const combat = createCombatScene(app, store)
      app.stage.addChild(titan.container, combat.container)
      cleanups.push(mountFpsMeter(), () => titan.destroy(), () => combat.destroy(), () => app.destroy(true))

      // molette stress → scène Titan
      const unsubStress = store.subscribe((s) => titan.setStress(s.stressLevel))
      cleanups.push(unsubStress)

      // boucle : advance la logique chaque frame (dt réel via ticker)
      const acc = { t: 0 }
      const loop = (ticker: { deltaMS: number }) => advance(store, wallClock(), acc, ticker.deltaMS)
      app.ticker.add(loop)
      cleanups.push(() => app.ticker.remove(loop))
    }).catch((e) => setError(String(e)))

    // pause/reprise : le ticker Pixi s'arrête seul quand l'onglet est caché ; on force un accrue à la reprise
    const onVis = () => { if (!document.hidden) store.setState({ idle: { ...store.getState().idle, lastTick: wallClock() } }) }
    document.addEventListener('visibilitychange', onVis)
    cleanups.push(() => document.removeEventListener('visibilitychange', onVis))

    // persistance périodique
    const save = setInterval(() => {
      const s = store.getState()
      localStorage.setItem(SAVE_KEY, JSON.stringify({ biomass: s.idle.biomass, lastTick: s.idle.lastTick, expeditionCount: s.expeditionCount }))
    }, 2000)
    cleanups.push(() => clearInterval(save))

    return () => { disposed = true; cleanups.forEach((c) => c()) }
  }, [store])

  if (error) return <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, color: '#f88' }}>Rendu indisponible : {error}</div>
  return (
    <>
      <div ref={hostRef} style={{ position: 'fixed', inset: 0 }} />
      <Hud store={store} />
      <StressDial store={store} />
      <ExpeditionButton store={store} />
      <UltimateButton store={store} />
    </>
  )
}

function wallClock(): number { return performance.timeOrigin + performance.now() }
```

- [ ] **Step 2: Vérifier la boucle dans le navigateur**

Run: `npm run dev`, ouvrir l'URL (dans le navigateur desktop, juste pour valider la logique — la perf se mesure sur device en Task 11-12).
Expected : Titan animé + particules ; biomasse monte ; à ≥ coût, bouton « Lancer l’expédition » actif → combat (barres HP + cast) ; l’Ultime s’allume dans la fenêtre ; victoire/défaite → retour idle + biomasse mise à jour ; recharger la page conserve la biomasse. Overlay FPS visible. Molette stress ± change la densité de particules.

- [ ] **Step 3: Typecheck + commit**

Run: `npm run typecheck` → aucune erreur.
```bash
git add games/leviathan/src/App.tsx
git commit -m "feat(leviathan): integration boucle jouable + persistance (Task 9)"
```

---

## Task 10: Build Capacitor + run sur device Android réel

**Files:**
- Modify: `games/leviathan/` (génère `android/` via Capacitor — non versionné, cf. `.gitignore`)

- [ ] **Step 1: Build web + ajout de la plateforme Android**

Run:
```bash
cd games/leviathan
npm run build
npx cap add android
```
Expected : `dist/` généré, dossier `android/` créé. Si Gradle réclame `platforms;android-35` : `sdkmanager "platforms;android-35"` (cmdline-tools déjà installés).

Puis **verrouiller le portrait** (§7.6) : dans `android/app/src/main/AndroidManifest.xml`, ajouter `android:screenOrientation="portrait"` à l'`<activity>` principale (`.MainActivity`).

- [ ] **Step 2: Lancer sur le Redmi**

Run: `npx cap run android --target BYZL25032200106840`
Expected : l’app se compile, s’installe et **se lance sur le Redmi** ; on voit le Titan animé + l’overlay FPS **sur le téléphone**.

- [ ] **Step 3: Vérifier la boucle sur device**

Sur le tel : biomasse monte → expédition → combat → Ultime au timing → retour idle. La boucle est jouable **à une main en portrait**.
Expected : aucun crash, tout est réactif.

- [ ] **Step 4: Commit (config seulement)**

```bash
git add games/leviathan/capacitor.config.ts games/leviathan/.gitignore
git commit -m "chore(leviathan): build Capacitor Android + run device (Task 10)"
```

---

## Task 11: Mesure de perf sur device + verdict (le GATE)

**Files:**
- Create: `docs/leviathan/coeur-vivant-mesures.md`

- [ ] **Step 1: Confirmer les specs du device**

Run: `adb -s BYZL25032200106840 shell getprop ro.product.model; adb -s BYZL25032200106840 shell getprop ro.soc.model; adb -s BYZL25032200106840 shell dumpsys display | grep -i fps`
Consigner : modèle, SoC, refresh écran.

- [ ] **Step 2: Mesurer le FPS baseline (Titan idle) sur ~5-10 min**

- Overlay rAF affiché sur le tel (lecture live).
- Chrome desktop → `chrome://inspect` → « inspect » le WebView Leviathan → Performance : enregistrer un profil de ~30 s sur l’écran Titan idle, luminosité 50 %.
- Relever le **FPS médian soutenu**.

- [ ] **Step 3: Balayage de stress**

Monter la molette stress (0 → 1 → 2 → …) et relever le FPS à chaque cran jusqu’à passer **sous 60**. Noter le cran de bascule = **la marge**.

- [ ] **Step 4: Mesurer la batterie**

Run: `adb -s BYZL25032200106840 shell dumpsys batterystats --reset` puis jouer ~15 min actif (luminosité 50 %), puis `adb -s BYZL25032200106840 shell dumpsys batterystats | grep -i "Estimated power"` (ou relever le % batterie avant/après). Convertir en **%/h**.

- [ ] **Step 5: Stabilité**

Laisser tourner ~10 min + enchaîner ~10 expéditions. Noter tout crash / perte de contexte WebGL.

- [ ] **Step 6: Consigner + verdict**

`docs/leviathan/coeur-vivant-mesures.md` :
```markdown
# Leviathan — Cœur Vivant — Mesures perf device

- Date : <date>
- Device : Redmi Note 15 Pro+ 5G — SoC <…> — RAM <…> — refresh <…> Hz
  (rappel : probablement ≥ plancher §16 Galaxy A54 → pass nécessaire mais non suffisant)
- Build : Capacitor <ver> / Pixi <ver>

## FPS
- Baseline (Titan idle, lumino 50%) : <médian> fps
- Combat : <médian> fps
- Balayage stress : cran 0=<fps> · 1=<fps> · 2=<fps> · … · bascule sous 60 au cran <n> → marge = <n> crans

## Batterie
- <%/h> sur 15 min actif, lumino 50%

## Stabilité
- <crashs / pertes de contexte sur 10 min + 10 expéditions>

## Verdict (§16 : 60 fps constants, ≤15 %/h)
- FPS baseline ≥ 60 ? <OUI/NON>
- **GATE :** NON → déclencher fallback Godot (ADR-001). OUI → continuer sur Web (B).
- Fun/feel : jugement Pierre (NO_CLAIM_ALLOWED).
```

- [ ] **Step 7: Commit**

```bash
git add docs/leviathan/coeur-vivant-mesures.md
git commit -m "docs(leviathan): mesures perf device + verdict gate (Task 11)"
```

---

## Definition of Done (rappel spec §9)

vitest verts (rng, idle, combat, store, gameLoop) · boucle jouable de bout en bout **sur le Redmi** · perf **mesurée + consignée** (baseline + marge + batterie + stabilité) · jugement fun = Pierre. **FPS < 60 baseline → fallback Godot (ADR-001).**
