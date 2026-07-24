import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'
import type { GameStore } from '../store/gameStore'
import { interruptWindowOpen, CAST_DURATION } from '../systems/combat'

export interface CombatScene { container: Container; destroy: () => void }

export function createCombatScene(
  app: Application,
  store: GameStore,
  tex: { hero1: Texture; hero2: Texture; enemy: Texture },
): CombatScene {
  const root = new Container()
  const W = () => app.screen.width, H = () => app.screen.height
  const bg = new Graphics().roundRect(20, H() * 0.15, W() - 40, H() * 0.5, 16).fill({ color: '#10181f', alpha: 0.9 })

  // Vrais sprites (Kenney CC0) — ennemi en haut, 2 héros en bas
  const SC = 2.4
  const enemy = new Sprite(tex.enemy); enemy.anchor.set(0.5); enemy.scale.set(SC); enemy.x = W() / 2; enemy.y = H() * 0.29
  const hero1 = new Sprite(tex.hero1); hero1.anchor.set(0.5); hero1.scale.set(SC); hero1.x = W() * 0.4; hero1.y = H() * 0.52
  const hero2 = new Sprite(tex.hero2); hero2.anchor.set(0.5); hero2.scale.set(SC); hero2.x = W() * 0.6; hero2.y = H() * 0.52

  const enemyBar = new Graphics(), heroBar = new Graphics(), castBar = new Graphics(), cue = new Graphics()
  root.addChild(bg, enemy, hero1, hero2, enemyBar, heroBar, castBar, cue)

  const tick = () => {
    const st = store.getState()
    const c = st.combat
    root.visible = st.phase === 'combat' && !!c
    if (!c) return
    const w = W() - 80
    enemyBar.clear().rect(40, H() * 0.18, w * Math.max(0, c.enemy.hp / c.enemy.maxHp), 10).fill('#e05a5a')
    const hp = c.heroes.reduce((s, h) => s + Math.max(0, h.hp), 0)
    const maxHp = c.heroes.reduce((s, h) => s + h.maxHp, 0)
    heroBar.clear().rect(40, H() * 0.61, w * (hp / maxHp), 10).fill('#5ae08f')
    castBar.clear()
    if (c.casting) castBar.rect(40, H() * 0.23, w * (c.castElapsed / CAST_DURATION), 8).fill('#e0b85a')
    cue.clear()
    if (interruptWindowOpen(c)) cue.roundRect(36, H() * 0.215, w + 8, 14, 4).stroke({ color: '#ffffff', width: 3 })
    // feedback : héros KO grisé
    hero1.alpha = (c.heroes[0]?.hp ?? 0) > 0 ? 1 : 0.25
    hero2.alpha = (c.heroes[1]?.hp ?? 0) > 0 ? 1 : 0.25
  }
  app.ticker.add(tick)
  return { container: root, destroy: () => { app.ticker?.remove(tick); if (!root.destroyed) root.destroy({ children: true }) } }
}
