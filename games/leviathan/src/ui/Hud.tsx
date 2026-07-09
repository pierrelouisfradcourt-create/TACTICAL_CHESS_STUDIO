import type { GameStore } from '../store/gameStore'
import { useGame } from '../store/useGame'

export function Hud({ store }: { store: GameStore }) {
  const biomass = useGame(store, (s) => Math.floor(s.idle.biomass))
  const phase = useGame(store, (s) => s.phase)
  const result = useGame(store, (s) => s.lastResult)
  return (
    <div style={{ position: 'fixed', top: 'env(safe-area-inset-top,10px)', right: 10, padding: '8px 12px', background: 'rgba(16,24,31,.55)', backdropFilter: 'blur(8px)', borderRadius: 12, font: '14px system-ui', color: '#dfe' }}>
      <div>Biomasse : <b>{biomass}</b></div>
      <div style={{ opacity: 0.7, fontSize: 12 }}>{phase === 'combat' ? 'Expédition…' : result === 'won' ? 'Victoire !' : result === 'lost' ? 'Défaite' : 'Repos'}</div>
    </div>
  )
}
