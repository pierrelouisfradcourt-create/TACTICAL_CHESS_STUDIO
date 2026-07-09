import { describe, it, expect } from 'vitest'
import { createIdle, accrue, spend, IDLE_RATE, OFFLINE_CAP_MS } from '../systems/idle'

describe('idle', () => {
  it('accrue = IDLE_RATE * secondes écoulées', () => {
    expect(accrue(createIdle(0), 1000).biomass).toBeCloseTo(IDLE_RATE * 1)
  })
  it('dt=0 → inchangé', () => { expect(accrue(createIdle(500), 500).biomass).toBe(0) })
  it('dt<0 (horloge en arrière) → inchangé', () => {
    expect(accrue({ biomass: 5, lastTick: 1000 }, 400).biomass).toBe(5)
  })
  it('plafonne le catch-up offline', () => {
    const s = accrue(createIdle(0), OFFLINE_CAP_MS * 10)
    expect(s.biomass).toBeCloseTo((OFFLINE_CAP_MS / 1000) * IDLE_RATE)
  })
  it('spend réussit si solde suffisant', () => {
    const r = spend({ biomass: 30, lastTick: 0 }, 20)
    expect(r.ok).toBe(true)
    expect(r.state.biomass).toBe(10)
  })
  it('spend échoue si solde insuffisant (inchangé)', () => {
    const r = spend({ biomass: 5, lastTick: 0 }, 20)
    expect(r.ok).toBe(false)
    expect(r.state.biomass).toBe(5)
  })
})
