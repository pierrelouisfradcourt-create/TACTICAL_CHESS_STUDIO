import { Application } from 'pixi.js'

export async function initPixi(container: HTMLElement): Promise<Application> {
  const app = new Application()
  await app.init({ resizeTo: container, background: '#0b0f14', antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 })
  container.appendChild(app.canvas)
  return app
}
