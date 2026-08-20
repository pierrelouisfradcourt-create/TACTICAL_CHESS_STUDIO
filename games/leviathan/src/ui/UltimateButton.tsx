import type { GameStore } from '../store/gameStore'
import { useGame } from '../store/useGame'
import { interruptWindowOpen, ultimateReady } from '../systems/combat'

export function UltimateButton({ store }: { store: GameStore }) {
  const inCombat = useGame(store, (s) => s.phase === 'combat')
  const armed = useGame(store, (s) => !!s.combat && interruptWindowOpen(s.combat) && ultimateReady(s.combat))
  if (!inCombat) return null
  return (
    <button
      onClick={() => store.setState({ ultimateQueued: true })}
      style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom,16px) + 16px)', left: '50%', transform: 'translateX(-50%)', padding: '20px 34px', fontSize: 20, borderRadius: 20, border: 'none', color: '#150a02', background: armed ? '#ffd35a' : '#3a3320', boxShadow: armed ? '0 0 24px #ffd35a' : 'none', transition: 'background .1s' }}
    >
      ULTIME
    </button>
  )
}
