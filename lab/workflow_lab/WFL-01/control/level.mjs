// level.mjs — génération de niveau PURE (aucun DOM, aucun rendu, aucun input).
// Contrat WFL-01 : generateLevel(seed, levelIndex) est déterministe (R10) :
// même seed + même levelIndex => même disposition de briques, à chaque appel.
// INTERDIT ICI : Math.random(), Date.now(), performance.now(), document, window,
// canvas, addEventListener, requestAnimationFrame, import de render.mjs/input.mjs.

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

export const LEVEL_COUNT = 3;

const BRICK_COLS = 10;
const BRICK_ROWS_MIN = 3;
const BRICK_ROWS_MAX = 6;
const BRICK_WIDTH = 70;
const BRICK_HEIGHT = 22;
const BRICK_GAP = 6;
const BOARD_TOP = 60;
const BRICK_SCORE = 10;

// Palette purement cosmétique — n'affecte jamais la jouabilité ni la solvabilité.
const PALETTE = ['#e63946', '#f1a208', '#2a9d8f', '#457b9d', '#6a4c93', '#ff6f91'];

/**
 * Hash de chaîne 32 bits (FNV-1a) — déterministe, pas d'aléatoire système.
 * @param {string} str
 * @returns {number} entier non signé 32 bits
 */
function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * PRNG mulberry32 — flux déterministe entièrement dérivé de `seedInt`.
 * Aucune source d'aléatoire système utilisée (pas de Math.random()).
 * @param {number} seedInt
 * @returns {() => number} générateur [0,1)
 */
function mulberry32(seedInt) {
  let a = seedInt | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Génère la disposition de briques d'un niveau, de façon déterministe.
 * @param {string|number} seed
 * @param {number} levelIndex index de niveau 0-based
 * @returns {{seed:string, levelIndex:number, rows:number, cols:number,
 *   brickWidth:number, brickHeight:number, offsetLeft:number, offsetTop:number,
 *   bricks:Array<object>}}
 */
export function generateLevel(seed, levelIndex) {
  const seedStr = `${String(seed)}::${Number(levelIndex)}`;
  const rand = mulberry32(hashSeed(seedStr));

  const rows = Math.min(BRICK_ROWS_MIN + Math.max(0, Number(levelIndex) || 0), BRICK_ROWS_MAX);
  const cols = BRICK_COLS;

  const totalWidth = cols * BRICK_WIDTH + (cols - 1) * BRICK_GAP;
  const offsetLeft = Math.round((GAME_WIDTH - totalWidth) / 2);
  const offsetTop = BOARD_TOP;

  const bricks = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const colorIndex = Math.floor(rand() * PALETTE.length);
      const x = offsetLeft + col * (BRICK_WIDTH + BRICK_GAP);
      const y = offsetTop + row * (BRICK_HEIGHT + BRICK_GAP);
      bricks.push({
        row,
        col,
        x,
        y,
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        destructible: true,
        hp: 1,
        alive: true,
        score: BRICK_SCORE,
        color: PALETTE[colorIndex],
      });
    }
  }

  return {
    seed: String(seed),
    levelIndex: Number(levelIndex),
    rows,
    cols,
    brickWidth: BRICK_WIDTH,
    brickHeight: BRICK_HEIGHT,
    offsetLeft,
    offsetTop,
    bounds: { width: GAME_WIDTH, height: GAME_HEIGHT },
    bricks,
  };
}
