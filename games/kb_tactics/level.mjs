// kb_tactics — génération de niveau SEEDÉE et déterministe.
// CONSOMME sys-reachability (import réel) pour GARANTIR l'atteignabilité de la sortie
// (pattern cité pat-full-reachability). Un niveau où la sortie est isolée est REJETÉ et
// régénéré (borné). Aucun Math.random : xorshift32 seedé.

import { isLevelReachable } from "../../knowledge_base/systems/procgen/reachability.mjs";

// xorshift32 déterministe (même RNG seedé que les autres jeux du studio).
function makeRng(seed) {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0xffffffff;
  };
}

const OBSTACLE_DENSITY = 0.16;
const ENEMY_COUNT = 2;
const MAX_ATTEMPTS = 40; // régénération bornée (pat-full-reachability : réparation bornée)
const isBlockedCell = (c) => c === 1;

/**
 * @returns {{grid:number[][], start:{x,y}, exit:{x,y}, enemies:{x,y}[]}}
 */
export function generateLevel(seed, w, h) {
  const start = { x: 0, y: 0 };
  const exit = { x: w - 1, y: h - 1 };

  let grid = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = makeRng((seed + attempt * 0x1000193) >>> 0);
    const g = Array.from({ length: h }, () => Array.from({ length: w }, () => (rng() < OBSTACLE_DENSITY ? 1 : 0)));
    // start, exit et leurs abords immédiats toujours libres
    for (const cell of [start, exit]) g[cell.y][cell.x] = 0;
    g[start.y][start.x + 1] = 0;
    g[exit.y][exit.x - 1] = 0;
    // Garantie d'atteignabilité (sys-reachability) : sinon on régénère
    if (isLevelReachable(g, start, [exit], isBlockedCell).ok) {
      grid = g;
      break;
    }
  }
  // Fallback borné : grille vide (toujours atteignable) si aucune tentative n'a réussi
  if (grid === null) {
    grid = Array.from({ length: h }, () => Array.from({ length: w }, () => 0));
  }

  // Placement des ennemis : cases libres seedées, ni sur start/exit, ni adjacentes au start.
  const rng = makeRng((seed ^ 0x5bd1e995) >>> 0);
  const enemies = [];
  let guard = 0;
  while (enemies.length < ENEMY_COUNT && guard < 1000) {
    guard++;
    const x = Math.floor(rng() * w);
    const y = Math.floor(rng() * h);
    if (isBlockedCell(grid[y][x])) continue;
    if (x === exit.x && y === exit.y) continue;
    // pas de spawn-kill : distance >= 3 du départ (couvre aussi la case de départ elle-même)
    if (Math.abs(x - start.x) + Math.abs(y - start.y) <= 2) continue;
    if (enemies.some((e) => e.x === x && e.y === y)) continue;
    enemies.push({ x, y });
  }

  return { grid, start, exit, enemies };
}
