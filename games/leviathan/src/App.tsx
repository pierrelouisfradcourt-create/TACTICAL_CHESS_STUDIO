import { useEffect, useRef, useState } from 'react'
import { Ticker } from 'pixi.js'
import { createStore, GameState, GameStore } from './store/gameStore'
import { advance } from './gameLoop'
import { createIdle } from './systems/idle'
import { initPixi } from './game/pixiApp'
import { createTitanScene } from './game/titanScene'
import { createCombatScene } from './game/combatScene'
import { mountFpsMeter } from './perf/fpsMeter'
import { Hud } from './ui/Hud'
import { ExpeditionButton } from './ui/ExpeditionButton'
import { UltimateButton } from './ui/UltimateButton'
import { StressDial } from './ui/StressDial'

const SAVE_KEY = 'leviathan.coeur-vivant.v1'
function wallClock(): number { return performance.timeOrigin + performance.now() }

function loadInitial(now: number): GameState {
  const base: GameState = { idle: createIdle(now), phase: 'idle', combat: null, ultimateQueued: false, stressLevel: 0, expeditionCount: 0, lastResult: 'none' }
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return base
    const p = JSON.parse(raw)
    if (typeof p.biomass === 'number' && typeof p.expeditionCount === 'number') {
      base.idle = { biomass: p.biomass, lastTick: typeof p.lastTick === 'number' ? p.lastTick : now }
      base.expeditionCount = p.expeditionCount
    }
  } catch { /* corrompu -> défauts */ }
  return base
}

export function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [store] = useState<GameStore>(() => createStore(loadInitial(wallClock())))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    const cleanups: Array<() => void> = []
    initPixi(hostRef.current!)
      .then((app) => {
        if (disposed) { app.destroy(true); return }
        const titan = createTitanScene(app)
        const combat = createCombatScene(app, store)
        app.stage.addChild(titan.container, combat.container)
        cleanups.push(mountFpsMeter(), () => titan.destroy(), () => combat.destroy(), () => app.destroy(true))
        cleanups.push(store.subscribe((s) => titan.setStress(s.stressLevel)))
        // reprise après arrière-plan : rAF pausé pendant que caché -> à la reprise, accrue rattrape
        // (dt = durée d'absence, borné par OFFLINE_CAP). Aucun reset de lastTick (sinon on jetterait le catch-up).
        const acc = { t: 0 }
        const loop = (ticker: Ticker) => advance(store, wallClock(), acc, ticker.deltaMS)
        app.ticker.add(loop)
        cleanups.push(() => app.ticker.remove(loop))
      })
      .catch((e) => setError(String(e)))

    // persistance périodique (write défensif : quota / private mode ne casse pas la session — Qwen #4)
    const save = setInterval(() => {
      const s = store.getState()
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ biomass: s.idle.biomass, lastTick: s.idle.lastTick, expeditionCount: s.expeditionCount }))
      } catch { /* ignore */ }
    }, 2000)
    cleanups.push(() => clearInterval(save))

    return () => { disposed = true; cleanups.forEach((c) => c()) }
  }, [store])

  if (error) {
    return <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, color: '#f88' }}>Rendu indisponible : {error}</div>
  }
  return (
    <>
      <div ref={hostRef} style={{ position: 'fixed', inset: 0 }} />
      <Hud store={store} />
      <StressDial store={store} />
      <ExpeditionButton store={store} />
      <UltimateButton store={store} />
    </>
  )
}
