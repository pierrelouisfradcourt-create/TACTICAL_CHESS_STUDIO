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

// ── Tuning (spec §11 — équilibrage = gate Pierre) ──
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

function firstAliveHero(h: Fighter[]): Fighter | undefined { return h.find((x) => x.hp > 0) }
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
    } else { enemy.hp -= HERO_ATK }
    ultimateCooldown = ULTIMATE_COOLDOWN
  }

  heroAtkTimer -= dt
  if (heroAtkTimer <= 0) {
    heroAtkTimer += ATK_INTERVAL
    const dmg = heroes.reduce((s, h) => s + (h.hp > 0 ? h.atk : 0), 0)
    const r = nextRand(rngSeed); rngSeed = r.seed
    enemy.hp -= dmg * (0.8 + 0.4 * r.value)
  }

  if (casting) {
    castElapsed += dt
    if (castElapsed >= CAST_DURATION) {
      const t = firstAliveHero(heroes); if (t) t.hp -= CAST_DAMAGE
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
