// level.mjs — génération de niveau DÉTERMINISTE pour le breakout (WFL-01, pièce "variant").
//
// Contrat : logique PURE, zéro Math.random()/Date.now()/performance.now(), zéro accès
// DOM (document/window/canvas), zéro import de render.mjs ou input.mjs. À seed + levelIndex
// égaux, generateLevel() retourne TOUJOURS un résultat structurellement identique
// (RNG interne = xorshift32 seedé par un hash déterministe de (seed, levelIndex)).
//
// ─────────────────────────────────────────────────────────────────────────────────
// FORME DE L'OBJET RETOURNÉ PAR generateLevel(seed, levelIndex) — À LIRE PAR game.mjs
// ─────────────────────────────────────────────────────────────────────────────────
// {
//   seed,            // valeur seed telle que passée en entrée (number ou string)
//   levelIndex,      // index de niveau tel que passé en entrée (entier >= 0)
//   fieldWidth,       // largeur logique du terrain de jeu utilisée pour positionner les briques (800)
//   fieldHeight,      // hauteur logique du terrain de jeu (600) — les briques n'occupent que le haut
//   rows,             // nombre de rangées de briques pour ce niveau
//   cols,             // nombre de colonnes de briques (fixe : 10)
//   brickWidth,       // largeur d'une brique (px logiques)
//   brickHeight,      // hauteur d'une brique (px logiques, fixe : 20)
//   gapX,             // espacement horizontal entre briques
//   gapY,             // espacement vertical entre briques
//   marginX,          // marge gauche/droite avant la première/dernière colonne
//   marginTop,        // marge haut avant la première rangée
//   brickCount,        // nombre total de briques (destructibles + indestructibles)
//   destructibleCount, // nombre de briques CASSABLES — c'est CE compteur que la condition
//                       // de victoire (R13) doit suivre jusqu'à 0, pas brickCount.
//   bricks: [
//     {
//       id,           // identifiant stable "l{levelIndex}-r{row}c{col}"
//       row,          // index de rangée, 0-based, 0 = rangée la plus haute
//       col,          // index de colonne, 0-based, 0 = colonne la plus à gauche
//       x, y,         // coin haut-gauche de la brique, en coordonnées logiques du terrain
//       width, height,// dimensions de la brique (== brickWidth/brickHeight, dupliqué par brique
//                      // pour que game.mjs/render.mjs n'aient jamais besoin de relire les champs
//                      // de niveau pour dessiner/collisionner une brique individuelle)
//       destructible, // true = cassable (compte dans destructibleCount et dans R13/R8/R9)
//                      // false = indestructible (rebond mais ne se détruit jamais, ne compte
//                      // jamais dans la condition de victoire)
//       hp,           // 1 si destructible (un seul impact la détruit — pas de multi-hit,
//                      // hors_scope du charter) ; null si indestructible (non pertinent)
//       points,       // score attribué à la destruction (0 si indestructible)
//       alive: true,  // état initial — TOUTES les briques sont vivantes à la génération.
//                      // C'est game.mjs qui possède et mute l'état de jeu runtime (liste des
//                      // briques restantes) ; ce champ n'est qu'une valeur initiale de départ,
//                      // pas une source de vérité mutable partagée avec level.mjs.
//     },
//     ...
//   ],
// }
//
// Usage attendu par game.mjs : appeler generateLevel(seed, levelIndex) à la création de la
// partie et à chaque progression de niveau (R14), puis construire/remplacer sa propre liste
// de briques d'état de jeu à partir de `bricks` (copie défensive recommandée si game.mjs
// mute des champs comme `alive` — ce module ne réutilise jamais l'objet retourné en interne).

const COLS = 10;
const BASE_ROWS = 4;
const MAX_ROWS = 8;
const FIELD_WIDTH = 800;
const FIELD_HEIGHT = 600;
const BRICK_HEIGHT = 20;
const GAP_X = 4;
const GAP_Y = 6;
const MARGIN_X = 20;
const MARGIN_TOP = 50;

// Au-delà de ce niveau (0-based), des briques indestructibles peuvent apparaître.
const INDESTRUCTIBLE_START_LEVEL = 3;
// Probabilité max qu'une brique soit indestructible (plafonnée pour ne jamais menacer
// la solvabilité — la victoire ne dépend que des briques cassables, jamais nul).
const INDESTRUCTIBLE_MAX_PROB = 0.2;
const INDESTRUCTIBLE_STEP_PROB = 0.05;

// Valeur de repli si le hash de seed produit un état nul (xorshift32(0) reste bloqué à 0).
const NONZERO_FALLBACK_STATE = 0x9e3779b9;

/**
 * Hash FNV-1a 32 bits d'une chaîne — déterministe, pas d'aléatoire, pas d'horloge.
 * @param {string} str
 * @returns {number} entier non signé 32 bits
 */
function fnv1aHash(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Combine seed + levelIndex en un état initial 32 bits déterministe pour le PRNG.
 * @param {number|string} seed
 * @param {number} levelIndex
 * @returns {number} entier non signé 32 bits, jamais 0
 */
function deriveState(seed, levelIndex) {
  const combined = `${String(seed)}::${String(levelIndex)}`;
  const state = fnv1aHash(combined);
  return state === 0 ? NONZERO_FALLBACK_STATE : state;
}

/**
 * Générateur xorshift32 seedé — déterministe, pur, aucune dépendance externe.
 * @param {number} seedState entier non signé 32 bits non nul
 * @returns {() => number} fonction next() retournant un float dans [0, 1)
 */
function createXorshift32(seedState) {
  let state = seedState >>> 0;
  return function next() {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    // >>> 0 puis division par 2^32 pour obtenir un float [0, 1) reproductible.
    return state / 4294967296;
  };
}

/**
 * Calcule le nombre de rangées de briques pour un niveau donné.
 * Croissance déterministe, purement fonction de levelIndex (pas de RNG nécessaire ici :
 * la variation "aléatoire" du niveau vient du placement destructible/indestructible,
 * pas du nombre de rangées).
 * @param {number} levelIndex
 * @returns {number}
 */
function computeRowCount(levelIndex) {
  const idx = Number.isFinite(levelIndex) && levelIndex >= 0 ? Math.floor(levelIndex) : 0;
  const rows = BASE_ROWS + Math.floor(idx / 2);
  return Math.min(Math.max(rows, BASE_ROWS), MAX_ROWS);
}

/**
 * Probabilité qu'une brique donnée soit indestructible pour ce niveau.
 * 0 avant INDESTRUCTIBLE_START_LEVEL, croît ensuite, plafonnée.
 * @param {number} levelIndex
 * @returns {number} probabilité dans [0, INDESTRUCTIBLE_MAX_PROB]
 */
function computeIndestructibleProb(levelIndex) {
  const idx = Number.isFinite(levelIndex) && levelIndex >= 0 ? Math.floor(levelIndex) : 0;
  if (idx < INDESTRUCTIBLE_START_LEVEL) return 0;
  const steps = idx - INDESTRUCTIBLE_START_LEVEL + 1;
  return Math.min(steps * INDESTRUCTIBLE_STEP_PROB, INDESTRUCTIBLE_MAX_PROB);
}

/**
 * Génère la disposition de briques pour (seed, levelIndex) — DÉTERMINISTE.
 * Le même couple (seed, levelIndex) produit toujours exactement le même résultat.
 *
 * @param {number|string} seed - graine de génération
 * @param {number} levelIndex - index de niveau, 0-based
 * @returns {object} voir le commentaire d'en-tête pour la forme complète
 */
export function generateLevel(seed, levelIndex) {
  const rng = createXorshift32(deriveState(seed, levelIndex));
  const rows = computeRowCount(levelIndex);
  const cols = COLS;
  const indestructibleProb = computeIndestructibleProb(levelIndex);

  const brickWidth = (FIELD_WIDTH - 2 * MARGIN_X - (cols - 1) * GAP_X) / cols;
  const brickHeight = BRICK_HEIGHT;

  const bricks = [];
  let destructibleCount = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Chaque brique consomme exactement un tirage RNG, dans un ordre fixe
      // (rangée puis colonne) : reproductibilité garantie quel que soit l'ordre
      // d'itération futur, tant que ce double-boucle reste identique.
      const roll = rng();
      const destructible = !(indestructibleProb > 0 && roll < indestructibleProb);
      const points = destructible ? (rows - row) * 10 : 0;

      if (destructible) destructibleCount++;

      bricks.push({
        id: `l${levelIndex}-r${row}c${col}`,
        row,
        col,
        x: MARGIN_X + col * (brickWidth + GAP_X),
        y: MARGIN_TOP + row * (brickHeight + GAP_Y),
        width: brickWidth,
        height: brickHeight,
        destructible,
        hp: destructible ? 1 : null,
        points,
        alive: true,
      });
    }
  }

  return {
    seed,
    levelIndex,
    fieldWidth: FIELD_WIDTH,
    fieldHeight: FIELD_HEIGHT,
    rows,
    cols,
    brickWidth,
    brickHeight,
    gapX: GAP_X,
    gapY: GAP_Y,
    marginX: MARGIN_X,
    marginTop: MARGIN_TOP,
    brickCount: bricks.length,
    destructibleCount,
    bricks,
  };
}
