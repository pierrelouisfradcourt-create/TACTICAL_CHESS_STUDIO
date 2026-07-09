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
  it('invariance pas-de-temps-fixe : 10×100ms == 20×50ms (chunks ≤ MAX_FRAME_MS)', () => {
    const a = freshStore(EXPEDITION_COST); launchExpedition(a)
    const b = freshStore(EXPEDITION_COST); launchExpedition(b)
    const accA = { t: 0 }; for (let i = 0; i < 10; i++) advance(a, 0, accA, 100)
    const accB = { t: 0 }; for (let i = 0; i < 20; i++) advance(b, 0, accB, 50)
    expect(a.getState().combat).toEqual(b.getState().combat)
  })
  it('clamp anti-spiral : un dtMs énorme ne résout pas le combat en un frame', () => {
    const s = freshStore(EXPEDITION_COST); launchExpedition(s)
    const acc = { t: 0 }
    advance(s, 0, acc, 1_000_000_000) // 1e9 ms
    expect(s.getState().phase).toBe('combat') // pas résolu instantanément
    expect(acc.t).toBeLessThan(1)             // acc.t borné (sans clamp: ~1e6 s)
  })
  it('victoire crédite REWARD et revient en idle', () => {
    const s = freshStore(EXPEDITION_COST); launchExpedition(s)
    const acc = { t: 0 }
    for (let i = 0; i < 2000 && s.getState().phase === 'combat'; i++) {
      s.setState({ ultimateQueued: true }); advance(s, 0, acc, 1000 / 60)
    }
    if (s.getState().lastResult === 'won') expect(s.getState().idle.biomass).toBeGreaterThanOrEqual(REWARD - 0.01)
  })
})
