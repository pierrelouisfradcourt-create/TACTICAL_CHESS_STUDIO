// level.mjs — génération de niveau PURE (WFL-01, rollout run2, branche "control").
// Contrat (shared/blueprint.yaml, shared/product_snapshot.md R10) : generateLevel(seed,
// levelIndex) est déterministe — même (seed, levelIndex) => même disposition, à chaque
// appel. INTERDIT : Math.random(), Date.now(), performance.now(), toute API DOM, tout
// import de render.mjs/input.mjs/server.mjs.
//
// Écrit indépendamment de run1/control et run1/variant (nouvelle tentative, run2 —
// protocole WFL-01, règle N>=2 : ce fichier n'a pas été copié depuis run1).

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const LEVEL_COUNT = 3;

const COLS = 8;
const ROWS_BASE = 4;
const ROWS_MAX = 7;
const BRICK_HEIGHT = 18;
const BRICK_GAP_X = 8;
const BRICK_GAP_Y = 8;
const TOP_MARGIN = 64;
const SIDE_MARGIN = 30;
const SCORE_PER_BRICK = 15;

/**
 * Hash déterministe 32 bits (djb2 variant) — pas d'aléa système.
 * @param {string} str
 * @returns {number}
 */
function hash32(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * PRNG splitmix32 — déterministe, dérivé uniquement de l'entier de graine fourni.
 * @param {number} seedInt
 * @returns {() => number} générateur [0,1)
 */
function splitmix32(seedInt) {
  let state = seedInt >>> 0;
  return function next() {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    return z / 4294967296;
  };
}

/**
 * Génère la disposition de briques du niveau `levelIndex` pour `seed` — DÉTERMINISTE.
 * @param {number|string} seed
 * @param {number} levelIndex 0-based
 * @returns {{seed:string, levelIndex:number, rows:number, cols:number, brickWidth:number,
 *   brickHeight:number, bricks:Array<{x:number,y:number,width:number,height:number,
 *   destructible:boolean,hp:(number|null),score:number,alive:boolean}>}}
 */
export function generateLevel(seed, levelIndex) {
  const idx = Number.isFinite(levelIndex) && levelIndex >= 0 ? Math.floor(levelIndex) : 0;
  const rand = splitmix32(hash32(`wfl01-run2::${String(seed)}::${idx}`));

  const rows = Math.min(ROWS_BASE + Math.floor(idx / 2), ROWS_MAX);
  const cols = COLS;
  const brickWidth = (GAME_WIDTH - 2 * SIDE_MARGIN - (cols - 1) * BRICK_GAP_X) / cols;

  const bricks = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      // Chaque brique consomme un tirage — ordre fixe (rangée puis colonne).
      const roll = rand();
      const destructible = true; // run2/control : toutes les briques sont cassables
      // `roll` reste consommé pour préserver la trajectoire du flux déterministe si
      // une variante ultérieure introduit des briques indestructibles (parité avec
      // le contrat, sans effet observable ici).
      void roll;

      bricks.push({
        x: SIDE_MARGIN + col * (brickWidth + BRICK_GAP_X),
        y: TOP_MARGIN + row * (BRICK_HEIGHT + BRICK_GAP_Y),
        width: brickWidth,
        height: BRICK_HEIGHT,
        destructible,
        hp: destructible ? 1 : null,
        score: SCORE_PER_BRICK,
        alive: true,
      });
    }
  }

  return {
    seed: String(seed),
    levelIndex: idx,
    rows,
    cols,
    brickWidth,
    brickHeight: BRICK_HEIGHT,
    bricks,
  };
}
