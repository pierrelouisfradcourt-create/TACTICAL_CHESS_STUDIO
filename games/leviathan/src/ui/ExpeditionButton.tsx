import type { GameStore } from '../store/gameStore'
import { useGame } from '../store/useGame'
import { launchExpedition, EXPEDITION_COST } from '../gameLoop'

export function ExpeditionButton({ store }: { store: GameStore }) {
  const phase = useGame(store, (s) => s.phase)
  const canGo = useGame(store, (s) => s.phase === 'idle' && s.idle.biomass >= EXPEDITION_COST)
  if (phase === 'combat') return null
  return (
    <button
      disabled={!canGo}
      onClick={() => launchExpedition(store)}
      style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom,16px) + 16px)', left: '50%', transform: 'translateX(-50%)', padding: '16px 28px', fontSize: 18, borderRadius: 16, border: 'none', color: '#04120d', background: canGo ? '#5ae08f' : '#33403a', opacity: canGo ? 1 : 0.6 }}
    >
      Lancer l’expédition ({EXPEDITION_COST})
    </button>
  )
}
