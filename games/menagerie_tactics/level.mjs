// level.mjs — génération PURE et déterministe d'une bataille (R13). N'importe ni
// render ni input ni game (aucun cycle). Même seed => bataille identique. Les stats
// des bêtes proviennent désormais du BESTIAIRE (identité par espèce), plus de tirage
// de type aléatoire — les matchups sont DÉSIGNÉS et donc reproductibles.
import { base } from "./bestiaire.mjs";

// RNG xorshift32 seedé — déterministe, sans dépendance. Les opérateurs bitwise
// (^= << >>> >>>=) ne sont pas mutés ; le garde `|| 1` (0 interdit pour xorshift)
// EST muté et tué par le test « seeds différents => batailles différentes ».
function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const WIDTH = 8;
const HEIGHT = 8;
const CAPTURE_THRESHOLD = 6;

// Slots SOLVABLES invariants (positions fixes) référençant une ESPÈCE. Seules les
// forêts cosmétiques varient avec le seed. L'ennemi de coin est override en faible+
// immobile (hp4<seuil6, move0) pour préserver l'invariant de capture, quelle que soit
// l'espèce choisie (exception CARVÉE, documentée — cf. autorité de tuning solvabilité).
export const PLAYER_SLOTS = [
  { id: 1, speciesId: "embraseur", x: 3, y: 7 },
  { id: 2, speciesId: "ondine", x: 2, y: 7 },
  { id: 3, speciesId: "fulgor", x: 4, y: 7 },
];

// Emplacements de déploiement de la meute (positions du squelette solvable). La couche
// méta y place les instances composées à la place des espèces par défaut.
export const DEPLOY_SLOTS = PLAYER_SLOTS.map((p) => ({ x: p.x, y: p.y }));
const ENEMY_SLOTS = [
  { id: 11, speciesId: "roncier", x: 0, y: 0, override: { hp: 4, maxHp: 4, move: 0 } }, // coin capturable
  { id: 12, speciesId: "givrette", x: 6, y: 1 },
  { id: 13, speciesId: "roncier", x: 5, y: 2 },
];

// Cases jamais boisées : le coin de capture et ses deux cases d'encerclement.
const PROTECTED = new Set(["0,0", "1,0", "0,1"]);

function pick(over, fallback) {
  return over === undefined ? fallback : over;
}

function buildBeast(slot, side) {
  const b = base(slot.speciesId);
  const ov = slot.override || {};
  return {
    id: slot.id,
    side,
    x: slot.x,
    y: slot.y,
    speciesId: b.id,
    type: b.type,
    hp: pick(ov.hp, b.hp),
    maxHp: pick(ov.maxHp, b.maxHp),
    atk: pick(ov.atk, b.atk),
    speed: pick(ov.speed, b.speed),
    move: pick(ov.move, b.move),
    range: pick(ov.range, b.range),
    active: true,
    scarred: false,
    captured: false,
  };
}

// Terrain seedé (forêt cosmétique), coin de capture jamais boisé. Partagé.
function buildTerrain(rng) {
  const terrain = [];
  for (let y = 0; y < HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < WIDTH; x++) {
      const key = x + "," + y;
      const roll = rng();
      if (roll < 0.14 && !PROTECTED.has(key)) {
        row.push("forest");
      } else {
        row.push("normal");
      }
    }
    terrain.push(row);
  }
  return terrain;
}

export function generateBattle(battleNumber, seed) {
  const rng = makeRng((seed >>> 0) + battleNumber * 1000);
  const terrain = buildTerrain(rng);
  const beasts = [];
  for (const slot of PLAYER_SLOTS) {
    beasts.push(buildBeast(slot, "player"));
  }
  for (const slot of ENEMY_SLOTS) {
    beasts.push(buildBeast(slot, "enemy"));
  }
  return { width: WIDTH, height: HEIGHT, terrain, beasts, captureThreshold: CAPTURE_THRESHOLD };
}

// Tiers de difficulté BORNÉS (multiplicateurs stat). Source unique.
export const TIERS = { 1: { hp: 1, atk: 1 }, 2: { hp: 1.2, atk: 1.1 } };
const ENEMY_POS = [[0, 0], [6, 1], [5, 2]];
const CORNER_HP = 4; // < CAPTURE_THRESHOLD : ennemi capturable garanti pour l'objectif capture

function buildEnemy(speciesId, pos, id, mult, weak) {
  const b = base(speciesId);
  const hp = weak ? CORNER_HP : Math.floor(b.hp * mult.hp);
  const atk = weak ? b.atk : Math.floor(b.atk * mult.atk);
  return {
    id,
    side: "enemy",
    x: pos[0],
    y: pos[1],
    speciesId: b.id,
    type: b.type,
    hp,
    maxHp: hp,
    atk,
    speed: b.speed,
    move: weak ? 0 : b.move,
    range: b.range,
    active: true,
    scarred: false,
    captured: false,
  };
}

// Génère une rencontre pilotée par un TEMPLATE {tier, enemies:[speciesId...], objective}.
// Joueurs = squelette solvable (la couche méta les remplace par la meute déployée).
// Pour l'objectif 'capture', garantit PAR CONSTRUCTION un ennemi faible+immobile en
// coin (id -> objective.targetId). generateBattle reste inchangé.
export function generateEncounter(template, seed) {
  const tier = template.tier === undefined ? 1 : template.tier;
  const mult = TIERS[tier] === undefined ? TIERS[1] : TIERS[tier];
  const rng = makeRng((seed >>> 0) + tier * 7919);
  const terrain = buildTerrain(rng);

  const beasts = [];
  for (const slot of PLAYER_SLOTS) {
    beasts.push(buildBeast(slot, "player"));
  }
  const objective = Object.assign({}, template.objective);
  template.enemies.forEach((speciesId, i) => {
    const id = 11 + i;
    const weak = objective.kind === "capture" && i === 0; // 1er ennemi = cible capturable
    const enemy = buildEnemy(speciesId, ENEMY_POS[i], id, mult, weak);
    beasts.push(enemy);
    if (weak) {
      objective.targetId = id;
    }
  });

  return { width: WIDTH, height: HEIGHT, terrain, beasts, captureThreshold: CAPTURE_THRESHOLD, objective };
}
