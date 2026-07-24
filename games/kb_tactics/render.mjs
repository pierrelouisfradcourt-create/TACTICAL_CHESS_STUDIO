// kb_tactics — rendu canvas 2D. AUCUNE règle de jeu : lit uniquement game.view().
// CONSOMME des ASSETS ingérés (import réel de leur URL servie /knowledge_base/assets/...) :
//   - asset-kenney-survivor1-stand  -> joueur
//   - asset-kenney-zombie1-stand    -> ennemis
// (Kenney « Top-down Shooter », CC0 — voir knowledge_base/catalog.json.)

import { CELL, GRID_W, GRID_H } from "./game.mjs";

const HUD_H = 44;
export const CANVAS_W = GRID_W * CELL;
export const CANVAS_H = GRID_H * CELL + HUD_H;

// URLs servies par server.mjs (routes /knowledge_base/assets/...). Import réel de l'asset ingéré.
const ASSET_PLAYER = "/knowledge_base/assets/characters/kenney_survivor1_stand.png";
const ASSET_ENEMY = "/knowledge_base/assets/creatures/kenney_zombie1_stand.png";

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // dégrade en forme pleine si l'asset manque
    img.src = src;
  });
}

export async function createRenderer(canvas) {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  const [playerImg, enemyImg] = await Promise.all([loadImage(ASSET_PLAYER), loadImage(ASSET_ENEMY)]);
  return { assetsLoaded: { player: !!playerImg, enemy: !!enemyImg }, draw: (g) => draw(ctx, g, playerImg, enemyImg) };
}

function drawSpriteOrDisc(ctx, img, cx, cy, color) {
  if (img) {
    const s = CELL - 8;
    ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL / 2 - 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw(ctx, g, playerImg, enemyImg) {
  const v = g.view();
  const dbg = g.readDebug();
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Fond damier
  for (let y = 0; y < v.gridH; y++) {
    for (let x = 0; x < v.gridW; x++) {
      const blocked = v.grid[y][x] === 1;
      ctx.fillStyle = blocked ? "#2b2f3a" : (x + y) % 2 === 0 ? "#161922" : "#1b1f2a";
      ctx.fillRect(x * CELL, HUD_H + y * CELL, CELL, CELL);
    }
  }
  // Sortie
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(v.exit.x * CELL + 6, HUD_H + v.exit.y * CELL + 6, CELL - 12, CELL - 12);
  ctx.fillStyle = "#0b3d22";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EXIT", v.exit.x * CELL + CELL / 2, HUD_H + v.exit.y * CELL + CELL / 2);

  // Ennemis
  for (const e of v.enemies) {
    drawSpriteOrDisc(ctx, enemyImg, e.x * CELL + CELL / 2, HUD_H + e.y * CELL + CELL / 2, "#e74c3c");
  }
  // Joueur
  drawSpriteOrDisc(ctx, playerImg, v.player.x * CELL + CELL / 2, HUD_H + v.player.y * CELL + CELL / 2, "#3498db");

  // HUD
  ctx.fillStyle = "#0d0f16";
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.fillStyle = "#e8eef5";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`HP ${dbg.hp}`, 12, HUD_H / 2);
  ctx.fillText(`TOUR ${dbg.turn}`, 120, HUD_H / 2);
  ctx.fillText(`STATUT ${v.status}`, 240, HUD_H / 2);
}
