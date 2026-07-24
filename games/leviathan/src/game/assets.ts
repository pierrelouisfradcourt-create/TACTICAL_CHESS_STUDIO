import { Assets, Texture } from 'pixi.js'

export interface GameTextures { titan: Texture; hero1: Texture; hero2: Texture; enemy: Texture }

// Charge les vrais assets CC0 (voir CREDITS.md). Chemins relatifs (base './' pour Capacitor).
export async function loadTextures(): Promise<GameTextures> {
  const [titan, hero1, hero2, enemy] = await Promise.all([
    Assets.load('assets/titan_turtle.png') as Promise<Texture>,
    Assets.load('assets/survivor1_stand.png') as Promise<Texture>,
    Assets.load('assets/manBlue_stand.png') as Promise<Texture>,
    Assets.load('assets/zoimbie1_stand.png') as Promise<Texture>,
  ])
  for (const t of [titan, hero1, hero2, enemy]) t.source.scaleMode = 'nearest' // pixel art net
  return { titan, hero1, hero2, enemy }
}
