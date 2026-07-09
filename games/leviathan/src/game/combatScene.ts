import { Application, Container, Graphics } from 'pixi.js'
import type { GameStore } from '../store/gameStore'
import { interruptWindowOpen, CAST_DURATION } from '../systems/combat'

export interface CombatScene { container: Container; destroy: () => void }

export function createCombatScene(app: Application, store: GameStore): CombatScene {
  const root = new Container()
  const W = () => app.screen.width, H = () => app.screen.height
  const bg = new Graphics().roundRect(20, H() * 0.15, W() - 40, H() * 0.5, 16).fill({ color: '#10181f', alpha: 0.9 })
  const enemyBar = new Graphics(), heroBar = new Graphics(), castBar = new Graphics(), cue = new Graphics()
  root.addChild(bg, enemyBar, heroBar, castBar, cue)

  const tick = () => {
    const st = store.getState()
    const c = st.combat
    root.visible = st.phase === 'combat' && !!c
    if (!c) return
    const w = W() - 80
    enemyBar.clear().rect(40, H() * 0.2, w * Math.max(0, c.enemy.hp / c.enemy.maxHp), 14).fill('#e05a5a')
    const hp = c.heroes.reduce((s, h) => s + Math.max(0, h.hp), 0)
    const maxHp = c.heroes.reduce((s, h) => s + h.maxHp, 0)
    heroBar.clear().rect(40, H() * 0.58, w * (hp / maxHp), 14).fill('#5ae08f')
    castBar.clear()
    if (c.casting) castBar.rect(40, H() * 0.32, w * (c.castElapsed / CAST_DURATION), 8).fill('#e0b85a')
    cue.clear()
    if (interruptWindowOpen(c)) cue.roundRect(36, H() * 0.30, w + 8, 14, 4).stroke({ color: '#ffffff', width: 3 })
  }
  app.ticker.add(tick)
  return { container: root, destroy: () => { app.ticker.remove(tick); root.destroy({ children: true }) } }
}
