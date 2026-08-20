import type { GameStore } from '../store/gameStore'
import { useGame } from '../store/useGame'
import { MAX_STRESS } from '../game/titanScene'

export function StressDial({ store }: { store: GameStore }) {
  const level = useGame(store, (s) => s.stressLevel)
  return (
    <div style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top,10px) + 28px)', left: 8, padding: '6px 8px', background: 'rgba(16,24,31,.55)', backdropFilter: 'blur(8px)', borderRadius: 10, font: '11px monospace', color: '#9fe' }}>
      <div>stress: {level}/{MAX_STRESS}</div>
      <button onClick={() => store.setState({ stressLevel: Math.max(0, level - 1) })}>−</button>
      <button onClick={() => store.setState({ stressLevel: Math.min(MAX_STRESS, level + 1) })}>+</button>
    </div>
  )
}
