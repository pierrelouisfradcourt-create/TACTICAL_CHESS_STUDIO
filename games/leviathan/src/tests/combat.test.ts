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
  it('fenêtre d’interruption < durée du cast', () => {
    expect(INTERRUPT_WINDOW).toBeLessThan(CAST_DURATION)
  })
})
