export interface IdleState { biomass: number; lastTick: number }

// Tuning (spec §11) — équilibrage = gate Pierre.
export const IDLE_RATE = 4                      // biomasse / seconde
export const OFFLINE_CAP_MS = 8 * 3600 * 1000   // 8 h de catch-up max

export function createIdle(now: number): IdleState { return { biomass: 0, lastTick: now } }

export function accrue(state: IdleState, now: number): IdleState {
  const dt = Math.min(Math.max(now - state.lastTick, 0), OFFLINE_CAP_MS)
  return { biomass: state.biomass + (dt / 1000) * IDLE_RATE, lastTick: now }
}

export function spend(state: IdleState, cost: number): { state: IdleState; ok: boolean } {
  if (state.biomass < cost) return { state, ok: false }
  return { state: { ...state, biomass: state.biomass - cost }, ok: true }
}
