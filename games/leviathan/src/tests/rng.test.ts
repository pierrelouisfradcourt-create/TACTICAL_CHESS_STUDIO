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
