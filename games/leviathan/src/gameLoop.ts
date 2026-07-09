import { accrue, spend } from './systems/idle'
import { createCombat, step } from './systems/combat'
import type { GameStore } from './store/gameStore'

export const FIXED_DT = 1 / 60            // pas de sim combat (s)
export const MAX_FRAME_MS = 100           // clamp anti-spiral-of-death (Qwen red-team) : jamais > 100ms de sim/frame
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
  // clamp du dt réel : un hitch ou une mise en arrière-plan ne doit pas déclencher un catch-up massif.
  acc.t += Math.min(Math.max(dtMs, 0), MAX_FRAME_MS) / 1000
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
