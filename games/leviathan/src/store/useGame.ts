import { useSyncExternalStore } from 'react'
import type { GameStore, GameState } from './gameStore'

export function useGame<T>(store: GameStore, sel: (s: GameState) => T): T {
  return useSyncExternalStore(store.subscribe, () => sel(store.getState()))
}
