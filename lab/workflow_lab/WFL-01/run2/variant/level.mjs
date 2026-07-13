// level.mjs — génération de niveau PURE (WFL-01, rollout run2, branche "variant",
// pièce écrite en isolation d'agent : seuls shared/blueprint.yaml et
// shared/product_snapshot.md R10/R14 ont été consultés — aucun fichier de run1, aucun
// fichier de run2/control).
//
// Contrat : generateLevel(seed, levelIndex) déterministe (R10). INTERDIT : Math.random(),
// Date.now(), performance.now(), toute API DOM, tout import de render/input/server.

const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 600;
const COLS = 9;
const ROWS_BASE = 3;
const ROWS_GROWTH_EVERY = 2;
const ROWS_MAX = 7;
const BRICK_HEIGHT = 20;
const GAP = 5;
const MARGIN_SIDE = 25;
const MARGIN_TOP = 48;
const BASE_POINTS = 12;

/**
 * Hash 32 bits déterministe (variante Jenkins one-at-a-time) — aucune source système.
 * @param {string} str
 * @returns {number}
 */
function jenkinsHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h += str.charCodeAt(i);
    h += h << 10;
    h ^= h >>> 6;
  }
  h += h << 3;
  h ^= h >>> 11;
  h += h << 15;
  return h >>> 0;
}

/**
 * PRNG xorshift32 — pur, déterministe.
 * @param {number} seedInt entier non nul
 * @returns {() => number}
 */
function xorshift32(seedInt) {
  let s = seedInt >>> 0 || 0x2545f491;
  return function next() {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * Génère la disposition de briques du niveau `levelIndex` pour `seed`, DÉTERMINISTE.
 * @param {number|string} seed
 * @param {number} levelIndex 0-based
 * @returns {{seed:(number|string), levelIndex:number, fieldWidth:number, fieldHeight:number,
 *   rows:number, cols:number, brickWidth:number, brickHeight:number, destructibleCount:number,
 *   bricks:Array<{id:string,row:number,col:number,x:number,y:number,width:number,height:number,
 *   destructible:boolean,hp:(number|null),points:number,alive:boolean}>}}
 */
export function generateLevel(seed, levelIndex) {
  const idx = Number.isFinite(levelIndex) && levelIndex >= 0 ? Math.floor(levelIndex) : 0;
  const rng = xorshift32(jenkinsHash(`${String(seed)}#run2-variant#${idx}`));

  const rows = Math.min(ROWS_BASE + Math.floor(idx / ROWS_GROWTH_EVERY), ROWS_MAX);
  const cols = COLS;
  const brickWidth = (FIELD_WIDTH - 2 * MARGIN_SIDE - (cols - 1) * GAP) / cols;

  const bricks = [];
  let destructibleCount = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const roll = rng(); // un tirage par brique — ordre fixe (rangée puis colonne)
      void roll; // run2/variant : toutes les briques sont cassables (parité de flux RNG conservée)
      const destructible = true;
      if (destructible) destructibleCount += 1;

      bricks.push({
        id: `l${idx}-r${row}c${col}`,
        row,
        col,
        x: MARGIN_SIDE + col * (brickWidth + GAP),
        y: MARGIN_TOP + row * (BRICK_HEIGHT + GAP),
        width: brickWidth,
        height: BRICK_HEIGHT,
        destructible,
        hp: destructible ? 1 : null,
        points: destructible ? BASE_POINTS * (rows - row) : 0,
        alive: true,
      });
    }
  }

  return {
    seed,
    levelIndex: idx,
    fieldWidth: FIELD_WIDTH,
    fieldHeight: FIELD_HEIGHT,
    rows,
    cols,
    brickWidth,
    brickHeight: BRICK_HEIGHT,
    destructibleCount,
    bricks,
  };
}
