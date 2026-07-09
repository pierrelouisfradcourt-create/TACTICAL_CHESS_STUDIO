import { Application, Container, Graphics, Ticker } from 'pixi.js'

export interface TitanScene { container: Container; setStress: (level: number) => void; destroy: () => void }
export const TITAN_BASE_PARTICLES = 80
export const TITAN_PARTICLES_PER_STRESS = 60
export const MAX_STRESS = 8 // cap (Qwen red-team #6) : borne la molette pour ne pas saturer le GPU

interface Mote { g: Graphics; x: number; y: number; vy: number }

export function createTitanScene(app: Application): TitanScene {
  const root = new Container()
  const W = () => app.screen.width, H = () => app.screen.height

  // Parallaxe : fond terne + collines qui défilent (le monde §14)
  const far = new Graphics().rect(0, 0, W(), H()).fill('#141d26')
  const hills = new Graphics()
  for (let i = 0; i < 8; i++) hills.circle(i * 200, H() * 0.72, 150).fill({ color: '#1d2c33', alpha: 0.6 })
  root.addChild(far, hills)

  // Titan : carapace arrondie luxuriante (premier plan §14) + lumière qui pulse
  const titan = new Container()
  const body = new Graphics().roundRect(-130, -90, 260, 180, 46).fill('#2f6d5b')
  const canopy = new Graphics().circle(-40, -70, 34).fill('#3fa07a').circle(50, -60, 40).fill('#348f6b')
  const light = new Graphics().circle(0, -10, 30).fill('#7fe9c4')
  titan.addChild(body, canopy, light)
  titan.x = W() / 2; titan.y = H() * 0.55
  root.addChild(titan)

  // Particules : pool de motes lumineuses montantes, count piloté par le stress
  const layer = new Container()
  root.addChild(layer)
  const pool: Mote[] = []
  const ensure = (count: number) => {
    while (pool.length < count) {
      const g = new Graphics().circle(0, 0, 2).fill('#bff5df')
      layer.addChild(g)
      pool.push({ g, x: Math.random() * W(), y: Math.random() * H(), vy: 20 + Math.random() * 45 })
    }
    while (pool.length > count) { const m = pool.pop()!; m.g.destroy() }
  }
  ensure(TITAN_BASE_PARTICLES)

  let t = 0
  const tick = (ticker: Ticker) => {
    t += ticker.deltaTime
    light.scale.set(1 + 0.18 * Math.sin(t * 0.1))
    titan.y = H() * 0.55 + Math.sin(t * 0.03) * 6
    hills.x -= 0.3 * ticker.deltaTime
    if (hills.x < -200) hills.x = 0
    for (const m of pool) {
      m.y -= (m.vy * ticker.deltaTime) / 60
      if (m.y < -4) { m.y = H() + 4; m.x = Math.random() * W() }
      m.g.x = m.x; m.g.y = m.y
    }
  }
  app.ticker.add(tick)

  return {
    container: root,
    setStress: (level: number) => ensure(TITAN_BASE_PARTICLES + Math.min(Math.max(level, 0), MAX_STRESS) * TITAN_PARTICLES_PER_STRESS),
    destroy: () => { app.ticker.remove(tick); root.destroy({ children: true }) },
  }
}
