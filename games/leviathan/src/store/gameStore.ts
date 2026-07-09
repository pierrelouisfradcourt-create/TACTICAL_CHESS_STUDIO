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
