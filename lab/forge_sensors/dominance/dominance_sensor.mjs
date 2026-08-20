// dominance_sensor.mjs — Capteur de dominance d'issue (annexe FORGE_V2 §4-B).
//
// ADVISORY STRICT. Ce module ne touche JAMAIS software_verdict. Il n'est jamais gating.
// Fail-open : toute erreur interne est capturée et rapportée comme `sensor_error`, jamais lancée
// vers l'appelant (le pipeline Forge ne doit jamais s'arrêter à cause de ce capteur).
//
// Lit `resolveCombat` (primitif pur, zéro RNG — CBT-9) et une liste d'UnitDef (forme de
// games/auto_battler/content/units.v0.mjs) puis construit des configs de board simples
// (unité seule vs unité seule) et mesure, sur K seeds et plusieurs POLITIQUES DE PLACEMENT
// hétérogènes, un taux de victoire par affrontement. Deux flags advisory :
//   (a) une config bat le champ > seuil (ex 70%) sur toutes les politiques qui s'accordent
//   (b) un miroir (même unité des deux côtés) dévie de 50% ± epsilon
//
// resolveCombat lui-même est déterministe à 100% (pas de RNG interne). La seule source de
// variance entre "seeds" ici est donc la politique de PLACEMENT du sensor elle-même : c'est du
// sensor, pas du jeu, que vient le rôle du seed — documenté explicitement pour ne jamais laisser
// croire que le combat aurait un aléa qu'il n'a pas.

import { resolveCombat } from '../../../games/auto_battler/combat/combat.mjs';
import { isValidCell, manhattan } from '../../../games/auto_battler/combat/cell.mjs';

const BOARD_WIDTH = 8;
const BOARD_HEIGHT = 8;
const CELL_COUNT = BOARD_WIDTH * BOARD_HEIGHT;

// Étoile 1 uniquement (v0) : les multiplicateurs d'étoile (params.v0.mjs) ne sont pas mêlés au
// capteur — ce serait une seconde variable non contrôlée. TODO [FOG] si un jour évalué à star>1.
const STAR = 1;

// ------------------------------------------------------------------------- RNG (self-contained)
// Mulberry32, séparé de engine/rng.mjs à dessein : le capteur ne doit dépendre d'AUCUN module
// hors combat/combat.mjs et combat/cell.mjs (lecture seule stricte du périmètre auto_battler).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --------------------------------------------------------------------- unit snapshot builder
/**
 * Construit UN CombatUnitSnapshot depuis un UnitDef (forme content/units.v0.mjs), star 1.
 * @param {Object} unitDef
 * @param {string} instanceId
 * @param {number} cell
 */
function toSnapshot(unitDef, instanceId, cell) {
  return {
    unit_instance_id: instanceId,
    unit_definition_ref: unitDef.id,
    star: STAR,
    cell,
    health: unitDef.hp,
    attack: unitDef.attack,
    attack_cadence: unitDef.attack_cadence,
    range: unitDef.range,
    move_speed: unitDef.move_speed,
    delivery: unitDef.delivery,
    keywords: Array.isArray(unitDef.keywords) ? unitDef.keywords : [],
    tribe: typeof unitDef.tribe === 'string' ? unitDef.tribe : null
  };
}

function buildSetup(combatRef, unitA, cellA, unitB, cellB) {
  return {
    combat_ref: combatRef,
    sides: [
      { side_ref: 'A', units: [toSnapshot(unitA, 'A_' + unitA.id, cellA)] },
      { side_ref: 'B', units: [toSnapshot(unitB, 'B_' + unitB.id, cellB)] }
    ]
  };
}

// ------------------------------------------------------------------------------- placements
// Deux cellules fixes, choisies pour laisser de la place au déplacement (BOARD 8x8, distance
// manhattan 7) — utilisées par les politiques SEED-INDÉPENDANTES.
const FIXED_CELL_A = fromXY(1, 3);
const FIXED_CELL_B = fromXY(6, 4);
const HEURISTIC_CELL_A = fromXY(2, 2);
const HEURISTIC_CELL_B = fromXY(5, 5);

function fromXY(x, y) { return y * BOARD_WIDTH + x; }

/**
 * Politique "random-seeded" : place les deux unités à des cellules distinctes tirées par le
 * rng seedé — seule politique dont le résultat varie réellement selon le seed.
 */
function placementRandom(seed) {
  const rng = mulberry32(seed);
  let cellA = Math.floor(rng() * CELL_COUNT);
  let cellB = Math.floor(rng() * CELL_COUNT);
  let guard = 0;
  while (cellB === cellA && guard < 100) { cellB = Math.floor(rng() * CELL_COUNT); guard++; }
  if (cellB === cellA) cellB = (cellA + 1) % CELL_COUNT;
  return { cellA, cellB };
}

/** Politique "greedy-stats" : placement fixe à distance manhattan maximale du board (8x8=63 -> 7
 * cases de distance ici), seed-indépendante — teste la config elle-même, pas le placement. */
function placementGreedy(_seed) {
  return { cellA: FIXED_CELL_A, cellB: FIXED_CELL_B };
}

/** Politique "heuristic-mirror" : placement symétrique resserré, seed-indépendante — mesure la
 * config au contact plutôt qu'à distance. */
function placementHeuristic(_seed) {
  return { cellA: HEURISTIC_CELL_A, cellB: HEURISTIC_CELL_B };
}

export const POLICIES = Object.freeze({
  'random-seeded': { fn: placementRandom, seedDependent: true },
  'greedy-stats': { fn: placementGreedy, seedDependent: false },
  'heuristic-mirror': { fn: placementHeuristic, seedDependent: false }
});

// --------------------------------------------------------------------------- one match-up
/**
 * Joue un affrontement unitA vs unitB sur K seeds pour UNE politique.
 * @returns {{winRateA: number, seedsRun: number}}
 */
function runMatchupOnePolicy(unitA, unitB, policyName, K) {
  const policy = POLICIES[policyName];
  if (!policy) throw new Error(`Unknown policy: ${policyName}`);
  const seedsToRun = policy.seedDependent ? K : 1; // seed-indépendante -> un seul run suffit,
  // le résultat serait identique K fois (déterminisme du combat) — documenté dans PROTOCOL.md.
  let winsA = 0;
  let draws = 0;
  for (let s = 0; s < seedsToRun; s++) {
    const seed = s + 1; // seeds 1..K, jamais 0 (mulberry32(0) licite mais évité par convention)
    const { cellA, cellB } = policy.fn(seed);
    if (!isValidCell(cellA) || !isValidCell(cellB) || cellA === cellB) {
      throw new Error(`Invalid placement from policy ${policyName}, seed ${seed}: ${cellA}/${cellB}`);
    }
    const setup = buildSetup(`dominance_${unitA.id}_vs_${unitB.id}_${policyName}_${seed}`, unitA, cellA, unitB, cellB);
    const { result } = resolveCombat(setup);
    if (result.winner_side_ref === 'A') winsA += 1;
    else if (result.winner_side_ref === null) draws += 1;
  }
  return {
    winRateA: winsA / seedsToRun,
    drawRate: draws / seedsToRun,
    seedsRun: seedsToRun,
    effectiveK: policy.seedDependent ? K : 1
  };
}

// --------------------------------------------------------------------------------- full matrix
/**
 * Construit la matrice de win-rate complète (unité vs unité, i<=j) sur toutes les politiques.
 * @param {Object[]} units - liste d'UnitDef (forme content/units.v0.mjs UNITS)
 * @param {{K:number}} opts
 * @returns {Object} report
 */
export function runDominanceSensor(units, opts) {
  const K = opts && Number.isInteger(opts.K) && opts.K > 0 ? opts.K : 50;
  const policyNames = Object.keys(POLICIES);
  const matchups = []; // { unitA, unitB, byPolicy: {policyName: {winRateA, ...}} }

  for (let i = 0; i < units.length; i++) {
    for (let j = i; j < units.length; j++) {
      const unitA = units[i];
      const unitB = units[j];
      const byPolicy = {};
      for (const policyName of policyNames) {
        byPolicy[policyName] = runMatchupOnePolicy(unitA, unitB, policyName, K);
      }
      matchups.push({ unitAId: unitA.id, unitBId: unitB.id, mirror: unitA.id === unitB.id, byPolicy });
    }
  }

  return { units: units.map(u => u.id), K, policies: policyNames, matchups };
}

// --------------------------------------------------------------------------------- flags
/**
 * Évalue les flags advisory à partir du rapport brut de runDominanceSensor.
 * threshold: seuil de dominance vs champ (défaut 0.70)
 * epsilon: tolérance autour de 50% pour le miroir (défaut 0.10 — placements fixes non
 *   parfaitement symétriques au tie-break près, voir PROTOCOL.md)
 */
export function evaluateFlags(report, { threshold = 0.70, epsilon = 0.10 } = {}) {
  const policyNames = report.policies;
  const unitIds = report.units;

  // win-rate d'une unité EN TANT QUE A contre une autre EN TANT QUE B ; pour "vs le champ" on a
  // besoin du taux dans les deux rôles (A et B), car la matrice n'est stockée qu'une fois (i<=j).
  function winRateOf(unitId, opponentId, policyName) {
    if (unitId === opponentId) {
      const m = report.matchups.find(m => m.mirror && m.unitAId === unitId);
      return m ? m.byPolicy[policyName].winRateA : null;
    }
    const asA = report.matchups.find(m => m.unitAId === unitId && m.unitBId === opponentId);
    if (asA) return asA.byPolicy[policyName].winRateA;
    const asB = report.matchups.find(m => m.unitAId === opponentId && m.unitBId === unitId);
    if (asB) return 1 - asB.byPolicy[policyName].winRateA - asB.byPolicy[policyName].drawRate;
    return null;
  }

  const dominance = [];
  for (const unitId of unitIds) {
    const perPolicyFieldRate = {};
    for (const policyName of policyNames) {
      const rates = unitIds
        .filter(o => o !== unitId)
        .map(o => winRateOf(unitId, o, policyName))
        .filter(r => r !== null);
      perPolicyFieldRate[policyName] = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
    }
    const values = Object.values(perPolicyFieldRate).filter(v => v !== null);
    const min = Math.min(...values);
    const max = Math.max(...values);
    let status = 'clean';
    if (min > threshold) status = 'dominant_agreed';
    else if (max > threshold) status = 'dominant_uncertain'; // désaccord entre politiques
    if (status !== 'clean') {
      dominance.push({ unitId, perPolicyFieldRate, status });
    }
  }

  // Miroir : la mesure honnête n'est PAS |winRateA - 0.5| — une paire identique qui s'annihile
  // mutuellement à CHAQUE seed produit winRateA=0 ET winRateB=0 (100% draw), ce qui est le
  // résultat SYMÉTRIQUE attendu, pas une dominance de B. La bonne mesure est la déviation entre
  // winRateA et winRateB (winRateA - (1 - winRateA - drawRate)) : un draw pèse pour rien, un vrai
  // biais de camp (A gagne plus souvent que B ou l'inverse) pèse pleinement.
  const mirrorFlags = [];
  for (const unitId of unitIds) {
    const perPolicy = {};
    for (const policyName of policyNames) {
      const m = report.matchups.find(mm => mm.mirror && mm.unitAId === unitId);
      const stats = m ? m.byPolicy[policyName] : null;
      if (!stats) { perPolicy[policyName] = null; continue; }
      const winRateB = 1 - stats.winRateA - stats.drawRate;
      perPolicy[policyName] = { winRateA: stats.winRateA, winRateB, drawRate: stats.drawRate, asymmetry: stats.winRateA - winRateB };
    }
    const deviations = Object.entries(perPolicy)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => ({ policy: k, asymmetry: v.asymmetry, deviation: Math.abs(v.asymmetry) }));
    const agreeing = deviations.filter(d => d.deviation > epsilon);
    if (agreeing.length === deviations.length && deviations.length > 0) {
      mirrorFlags.push({ unitId, perPolicy, status: 'mirror_deviation_agreed' });
    } else if (agreeing.length > 0) {
      mirrorFlags.push({ unitId, perPolicy, status: 'mirror_deviation_uncertain' });
    }
  }

  return { threshold, epsilon, dominance, mirrorFlags };
}

// -------------------------------------------------------------------------------- fail-open
/**
 * Point d'entrée fail-open : ne lance JAMAIS. Toute exception interne devient sensor_error.
 * C'est la forme que le pipeline Forge doit appeler (jamais runDominanceSensor directement).
 */
export function runDominanceSensorSafe(units, opts) {
  try {
    const report = runDominanceSensor(units, opts);
    const flags = evaluateFlags(report, opts);
    return { advisory: true, ok: true, report, flags };
  } catch (err) {
    return { advisory: true, ok: false, sensor_error: String(err && err.stack || err) };
  }
}
