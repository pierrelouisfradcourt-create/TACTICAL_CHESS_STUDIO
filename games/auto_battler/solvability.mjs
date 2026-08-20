// solvability.mjs — Oracle de SOLVABILITÉ (R9, Forge V2 §4-A, PRIORITAIRE — go Pierre
// docs/audit/FORGE_V2_CONSOLIDATION.md §4-A). Principe ratifié : « la Forge ne doit pas prouver
// qu'un jeu est amusant, elle doit empêcher de construire longtemps sur un système manifestement
// invalide ». Leçon fondatrice reformulée dans le contrat : « 0 or, combat jamais lancé — pattern
// maison jamais appliqué » (survival_arena/collect_runner : oracles verts, jeux injouables).
//
// LE CHEMIN RÉEL EXERCÉ ICI (celui de app/app.mjs, PAS un moteur parallèle) :
//   round.newGame → round.startRound (Income → Shop, R13) → [Preparation] input/submit.submitInput
//   (→ preparation.applyPreparationInput, l'entonnoir unique) → ConfirmPreparation → [Battle]
//   round.resolveBattle (→ combat/combat.mjs::resolveCombat, pur) → round.startNextRound
//   (→ Preparation du round suivant, ou 'Elimination').
// engine/transition.mjs, engine/replay.mjs, engine/match.mjs (SUPPRIMÉS, s9-build commande F/F2 —
// voir run-oracle.mjs) ne sont PAS ce chemin : ce fichier ne les importe jamais.
//
// LES 5 VOLETS (contrat, chacun un check nommé, FAIL indépendant — voir les 5 fonctions
// checkXxx ci-dessous, toutes PURES : elles ne prennent que des métriques déjà mesurées, jamais
// l'état du jeu directement. C'est ce qui permet à solvability.falsification.test.mjs de les
// faire ROUGIR avec des métriques FABRIQUÉES, sans jamais toucher au jeu) :
//   1. Boucle jouable          — checkPlayableLoop
//   2. Victoire atteignable    — checkVictoryReachable (voir note honnête ci-dessous)
//   3. Ressources disponibles  — checkResourcesAvailable (la panne historique exacte)
//   4. Simulation terminable   — checkSimulationTerminates
//   5. Mécaniques centrales    — checkCoreMechanicsActivate
//
// NOTE HONNÊTE (volet 2, TODO [FOG] déjà présent dans round/round.mjs::isMatchOver) : les règles
// actuelles NE DÉFINISSENT AUCUNE victoire DE PARTIE pour cette tranche 1-Seat-vs-Ghost — le
// Match est « joué jusqu'à la défaite » (Core Rules bible, isMatchOver : score = rounds tenus).
// Ce volet prouve donc l'atteignabilité de la victoire DE COMBAT (un Round gagné, Event Victory
// avec winner_side_ref === le joueur) — la seule notion de victoire qui existe aujourd'hui. Ce
// n'est pas maquillé en victoire de partie.
//
// LE BOT : une politique déterministe, raisonnable, PARAMÈTRE de ce fichier — jamais une
// modification du jeu. Achète en préférant la tribu déjà possédée (pour déclencher les synergies
// meneur/tribe_boost, seul levier qualitatif face à un Ghost qui mire le rang/nombre/star mais
// PAS la composition — combat/ghost.mjs), monte de niveau avec l'or restant, pose tout ce que la
// capacité de plateau permet, confirme. Aucune constante du jeu n'est réinventée ici : chaque
// limite (coût, capacité, tick_limit) est LUE depuis params.v0.mjs / content/units.v0.mjs.
//
// claim_verdict: NO_CLAIM_ALLOWED — oracle mécanique, il ne juge pas le fun.

import { newGame, startRound, resolveBattle, startNextRound } from './round/round.mjs';
import { submitInput } from './input/submit.mjs';
import * as board from './board/board.mjs';
import { getUnitRank, getUnitTribe } from './content/units.v0.mjs';
import { TICK_LIMIT, BOARD_WIDTH, BOARD_HEIGHT } from './params.v0.mjs';
import { fileURLToPath } from 'node:url';

export { TICK_LIMIT };

const SEAT_ID = 'player_0';

// K seeds distinctes (volet 2 : « sur K seeds, au moins une trajectoire atteint la victoire »).
export const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Garde-fou de LA BOUCLE DE L'ORACLE (pas une règle du jeu : round/round.mjs ne définit aucune
// fin de Match sur Life > floor — « joué jusqu'à la défaite », TODO [FOG] ci-dessus). Sert le
// volet 4 (aucune trajectoire ne doit nécessiter une boucle sans fin pour être mesurée).
export const ROUND_LIMIT = 30;

// Borne défensive des boucles bot (achat/niveau/pose) : très au-dessus des bornes RÉELLES du jeu
// (BENCH_CAPACITY=9, SHOP_SIZE=5, 10 niveaux max) — ne tronque jamais un tour légitime, protège
// seulement contre une boucle infinie si `accepted` restait vrai indéfiniment (bug hypothétique).
const BOT_LOOP_GUARD = 32;

// -----------------------------------------------------------------------------------------------
// Bot — politique déterministe (paramètre de l'oracle, jamais du jeu)
// -----------------------------------------------------------------------------------------------

/** Rang minimal achetable de la Shop courante (0/inconnu exclus). null si Shop vide. */
function cheapestShopCost(shop) {
  if (!Array.isArray(shop) || shop.length === 0) return null;
  let min = null;
  for (const defId of shop) {
    const cost = getUnitRank(defId);
    if (cost > 0 && (min === null || cost < min)) min = cost;
  }
  return min;
}

/** Combien d'unités de chaque Tribu le Player possède déjà (Bench + Board). */
function ownedTribeCounts(player) {
  const counts = {};
  for (const u of [...(player.bench || []), ...(player.board || [])]) {
    const tribe = getUnitTribe(u.unit_def_id);
    if (tribe) counts[tribe] = (counts[tribe] || 0) + 1;
  }
  return counts;
}

/**
 * Choisit le slot de Shop à acheter : préfère la Tribu déjà la plus possédée (synergie
 * tribe_boost, le seul levier qualitatif face au Ghost qui mire rang/nombre/star mais pas la
 * composition — combat/ghost.mjs), puis le moins cher (déterministe, jamais « au hasard »).
 * @returns {number} index de Shop, ou -1 si rien n'est achetable
 */
function pickBuyIndex(player) {
  const shop = Array.isArray(player.shop) ? player.shop : [];
  if (shop.length === 0) return -1;
  const tribeCounts = ownedTribeCounts(player);
  let best = -1;
  let bestSynergy = -1;
  let bestCost = Infinity;
  shop.forEach((defId, idx) => {
    const cost = getUnitRank(defId);
    if (cost <= 0 || cost > player.gold) return; // inconnu ou inabordable
    const tribe = getUnitTribe(defId);
    const synergy = tribe ? (tribeCounts[tribe] || 0) : 0;
    if (synergy > bestSynergy || (synergy === bestSynergy && cost < bestCost)) {
      best = idx; bestSynergy = synergy; bestCost = cost;
    }
  });
  return best;
}

/** Premier index de cellule libre dans la moitié de plateau DU joueur (board/board.mjs). */
function findFreeCellInOwnHalf(boardArr, seatId) {
  const total = BOARD_WIDTH * BOARD_HEIGHT;
  for (let idx = 0; idx < total; idx++) {
    if (board.isInPlayerHalf(idx, seatId) && board.isCellFree(boardArr, idx)) return idx;
  }
  return -1;
}

/** Achète tant qu'un slot est abordable ET que l'Input est accepté (bench plein → rejeté, R14). */
function botBuyLoop(state, seatId) {
  let s = state;
  for (let i = 0; i < BOT_LOOP_GUARD; i++) {
    const idx = pickBuyIndex(s.players[seatId]);
    if (idx === -1) break;
    const defId = s.players[seatId].shop[idx];
    const { state: next, accepted } = submitInput(s, {
      kind: 'Buy', seatId, unitDefId: defId, shop_index: idx
    });
    if (!accepted) break;
    s = next;
  }
  return s;
}

/** Monte de niveau avec l'or restant tant que c'est abordable (fait grandir boardCapacityForLevel
 * pour CE round — Place, appelé après, en profite immédiatement). S'arrête seule au niveau 10
 * (LEVEL_UP_COSTS n'a pas de clé au-delà — handleLevelUp refuse, `accepted` devient false). */
function botLevelUpLoop(state, seatId) {
  let s = state;
  for (let i = 0; i < BOT_LOOP_GUARD; i++) {
    const { state: next, accepted } = submitInput(s, { kind: 'LevelUp', seatId });
    if (!accepted) break;
    s = next;
  }
  return s;
}

/** Pose toutes les unités du Bench que la capacité de plateau du niveau courant permet
 * (boardCapacityForLevel, params.v0.mjs — appliqué par preparation.mjs, jamais réinventé ici :
 * un Place refusé fait juste `accepted=false` et arrête la boucle, R14). */
function botPlaceLoop(state, seatId) {
  let s = state;
  for (let i = 0; i < BOT_LOOP_GUARD; i++) {
    const player = s.players[seatId];
    const bench = Array.isArray(player.bench) ? player.bench : [];
    if (bench.length === 0) break;
    const cellIdx = findFreeCellInOwnHalf(player.board, seatId);
    if (cellIdx === -1) break;
    const { state: next, accepted } = submitInput(s, {
      kind: 'Place', seatId, unit_instance_id: bench[0].unit_instance_id, to_zone: 'board', to_index: cellIdx
    });
    if (!accepted) break;
    s = next;
  }
  return s;
}

/** Un tour de Preparation complet : achat → niveau → pose → ConfirmPreparation. */
function botPrepareAndConfirm(state, seatId) {
  let s = state;
  s = botBuyLoop(s, seatId);
  s = botLevelUpLoop(s, seatId);
  s = botPlaceLoop(s, seatId);
  const { state: confirmed } = submitInput(s, { kind: 'ConfirmPreparation', seatId });
  return confirmed;
}

// -----------------------------------------------------------------------------------------------
// Mesure — joue une seed jusqu'à ROUND_LIMIT ou Elimination, rapporte les métriques BRUTES
// consommées ensuite par les 5 checks (purs — voir plus bas).
// -----------------------------------------------------------------------------------------------

function tallyEventKinds(eventLog) {
  const counts = {};
  for (const ev of eventLog) counts[ev.kind] = (counts[ev.kind] || 0) + 1;
  return counts;
}

/**
 * Joue une seed du round 1 jusqu'à ROUND_LIMIT (ou Elimination). Ne modifie et n'importe RIEN
 * du moteur autrement que par le chemin réel (round/, input/submit.mjs). Capture toute
 * exception (volet 1 : « sans crash »).
 * @param {number} seed
 * @param {{seatId?: string, roundLimit?: number}} [opts]
 */
export function measureSeed(seed, opts = {}) {
  const seatId = opts.seatId || SEAT_ID;
  const roundLimit = opts.roundLimit ?? ROUND_LIMIT;

  const metrics = {
    seed,
    round1Gold: null,
    round1CheapestShopCost: null,
    roundsPlayed: 0,
    combats: [],       // [{round, ticksElapsed, resolutionKind, playerWon}]
    eventCounts: {},
    wonAnyCombat: false,
    terminatedBy: null, // 'elimination' | 'round_limit_reached_ongoing(N)'
    illegalState: null,
    crash: null
  };

  try {
    let s = newGame(seed, [seatId]);
    s = startRound(s); // R13 : le Match doit pouvoir démarrer — Income puis Shop (app.mjs)

    metrics.round1Gold = s.players[seatId].gold;
    metrics.round1CheapestShopCost = cheapestShopCost(s.players[seatId].shop);

    for (let round = 0; round < roundLimit; round++) {
      if (s.phase !== 'Preparation') {
        metrics.illegalState = `round ${round}: état attendu 'Preparation', obtenu '${s.phase}'`;
        break;
      }

      s = botPrepareAndConfirm(s, seatId);
      if (s.phase !== 'Battle') {
        metrics.illegalState =
          `round ${round}: ConfirmPreparation n'a pas fait transiter vers 'Battle' (phase='${s.phase}')`;
        break;
      }

      const beforeLen = s.eventLog.length;
      s = resolveBattle(s, seatId);
      const newEvents = s.eventLog.slice(beforeLen);
      const victoryEv = newEvents.find(e => e.kind === 'Victory');
      if (!victoryEv) {
        metrics.illegalState = `round ${round}: resolveBattle n'a émis aucun Event Victory`;
        break;
      }
      metrics.combats.push({
        round,
        ticksElapsed: victoryEv.ticks_elapsed,
        resolutionKind: victoryEv.resolution_kind,
        playerWon: victoryEv.winner_side_ref === seatId
      });
      if (victoryEv.winner_side_ref === seatId) metrics.wonAnyCombat = true;

      s = startNextRound(s);
      metrics.roundsPlayed = round + 1;

      if (s.phase === 'Elimination') { metrics.terminatedBy = 'elimination'; break; }
      if (s.phase !== 'Preparation') {
        metrics.illegalState = `round ${round}: startNextRound a produit une phase inattendue '${s.phase}'`;
        break;
      }
    }

    if (!metrics.terminatedBy && !metrics.illegalState) {
      metrics.terminatedBy = `round_limit_reached_ongoing(${roundLimit})`;
    }
    metrics.eventCounts = tallyEventKinds(s.eventLog);
  } catch (err) {
    metrics.crash = err && err.message ? err.message : String(err);
  }

  return metrics;
}

export function runAllSeeds(seeds = SEEDS, opts = {}) {
  return seeds.map(seed => measureSeed(seed, opts));
}

// -----------------------------------------------------------------------------------------------
// Les 5 volets — fonctions PURES sur des métriques déjà mesurées (jamais l'état du jeu). C'est ce
// qui permet à solvability.falsification.test.mjs de forcer chaque volet à ROUGIR avec des
// métriques FABRIQUÉES, sans jamais toucher au jeu (mission : « via paramètres injectés de
// test, PAS en modifiant le jeu »).
// -----------------------------------------------------------------------------------------------

/** Volet 1 — Boucle jouable : N rounds sans état illégal ni crash, sur toutes les seeds. */
export function checkPlayableLoop(seedMetrics) {
  const failures = [];
  for (const m of seedMetrics) {
    if (m.crash) failures.push(`seed=${m.seed}: crash — ${m.crash}`);
    else if (m.illegalState) failures.push(`seed=${m.seed}: ${m.illegalState}`);
  }
  return { name: 'Boucle jouable', passed: failures.length === 0, failures };
}

/** Volet 2 — Victoire atteignable (de COMBAT ; voir note honnête en tête de fichier : aucune
 * victoire DE PARTIE n'est définie par les règles actuelles pour cette tranche). */
export function checkVictoryReachable(seedMetrics) {
  const anyWin = seedMetrics.some(m => m.wonAnyCombat);
  const failures = anyWin ? [] :
    [`aucune des ${seedMetrics.length} seeds n'a produit un Combat gagné par le joueur (Event Victory, winner_side_ref = seat du joueur)`];
  return { name: 'Victoire atteignable (combat)', passed: anyWin, failures };
}

/** Volet 3 — Ressources disponibles : round 1 doit donner de quoi AGIR (la panne historique
 * exacte : « 0 or, combat jamais lancé »). */
export function checkResourcesAvailable(seedMetrics) {
  const failures = [];
  for (const m of seedMetrics) {
    if (!(typeof m.round1Gold === 'number' && m.round1Gold > 0)) {
      failures.push(`seed=${m.seed}: or initial round 1 = ${m.round1Gold} (attendu > 0)`);
      continue;
    }
    if (m.round1CheapestShopCost === null) {
      failures.push(`seed=${m.seed}: Shop round 1 vide — aucun achat possible avec ${m.round1Gold} or`);
      continue;
    }
    if (m.round1CheapestShopCost > m.round1Gold) {
      failures.push(
        `seed=${m.seed}: l'achat le moins cher de la Shop round 1 coûte ${m.round1CheapestShopCost}, ` +
        `or disponible ${m.round1Gold}`
      );
    }
  }
  return { name: 'Ressources disponibles (round 1)', passed: failures.length === 0, failures };
}

/** Volet 4 — Simulation terminable : aucun Combat ne dépasse tick_limit, aucune trajectoire
 * bot n'exige plus de round_limit rounds sans terminer (Elimination ou fin de mesure propre). */
export function checkSimulationTerminates(seedMetrics, opts = {}) {
  const tickLimit = opts.tickLimit ?? TICK_LIMIT;
  const roundLimit = opts.roundLimit ?? ROUND_LIMIT;
  const failures = [];
  for (const m of seedMetrics) {
    for (const c of (m.combats || [])) {
      if (!(c.ticksElapsed <= tickLimit)) {
        failures.push(`seed=${m.seed} round=${c.round}: combat a dépassé tick_limit (${c.ticksElapsed} > ${tickLimit})`);
      }
    }
    if (m.roundsPlayed > roundLimit) {
      failures.push(`seed=${m.seed}: boucle de rounds a dépassé round_limit (${m.roundsPlayed} > ${roundLimit}) sans terminer`);
    }
  }
  return { name: 'Simulation terminable', passed: failures.length === 0, failures };
}

/** Volet 5 — Mécaniques centrales activables (02_CORE_RULES.md) : achat, pose, combat, dégâts,
 * élimination doivent chacun se déclencher au moins une fois, cumulés sur toutes les seeds.
 * « élimination » est comptée au niveau de l'Unit (Event Death, T7 de la TickPipeline) — la seule
 * élimination qu'un Match borné à ROUND_LIMIT rounds est garanti d'observer ; l'Elimination de
 * Seat (INV-9) est un sur-ensemble optionnel, non requise ici (round_limit peut être atteint
 * avant qu'un Seat ne meure, sans que ce soit un FAIL — TODO [FOG] round.mjs::isMatchOver). */
export const CORE_MECHANIC_EVENTS = Object.freeze({
  UnitBought: 'achat',
  UnitPlaced: 'pose',
  Attack: 'combat',
  Damage: 'dégâts',
  Death: 'élimination (unité)'
});

export function checkCoreMechanicsActivate(seedMetrics, requiredKinds = Object.keys(CORE_MECHANIC_EVENTS)) {
  const totals = {};
  for (const k of requiredKinds) totals[k] = 0;
  for (const m of seedMetrics) {
    for (const k of requiredKinds) totals[k] += (m.eventCounts && m.eventCounts[k]) || 0;
  }
  const failures = requiredKinds
    .filter(k => totals[k] === 0)
    .map(k => `mécanique "${k}" (${CORE_MECHANIC_EVENTS[k] || k}) jamais déclenchée sur ${seedMetrics.length} seeds`);
  return { name: 'Mécaniques centrales activables', passed: failures.length === 0, failures, totals };
}

// -----------------------------------------------------------------------------------------------
// Point d'entrée
// -----------------------------------------------------------------------------------------------

function main() {
  console.log('=== ORACLE DE SOLVABILITÉ — auto_battler (R9, Forge V2 §4-A) ===');
  console.log('chemin réel : round.newGame -> round.startRound -> input/submit.submitInput ' +
    '(-> preparation.applyPreparationInput) -> round.resolveBattle (-> combat/combat.mjs::resolveCombat) ' +
    '-> round.startNextRound');
  console.log(`${SEEDS.length} seeds [${SEEDS.join(', ')}], round_limit=${ROUND_LIMIT}, tick_limit=${TICK_LIMIT}\n`);

  const seedMetrics = runAllSeeds();

  const checks = [
    checkPlayableLoop(seedMetrics),
    checkVictoryReachable(seedMetrics),
    checkResourcesAvailable(seedMetrics),
    checkSimulationTerminates(seedMetrics),
    checkCoreMechanicsActivate(seedMetrics)
  ];

  let allPassed = true;
  checks.forEach((c, i) => {
    console.log(`--- Volet ${i + 1}/5 : ${c.name} ---`);
    console.log(c.passed ? '  PASS' : '  FAIL');
    for (const f of c.failures) console.log(`    - ${f}`);
    if (c.totals) console.log(`    totaux cumulés: ${JSON.stringify(c.totals)}`);
    if (!c.passed) allPassed = false;
  });

  console.log(
    "\nNote honnête (volet 2, TODO [FOG] déjà présent dans round/round.mjs::isMatchOver) : les règles " +
    "actuelles NE DÉFINISSENT AUCUNE victoire DE PARTIE pour cette tranche 1-Seat-vs-Ghost — le Match " +
    "est « joué jusqu'à la défaite » (score = rounds tenus). Le volet 2 prouve donc l'atteignabilité de " +
    "la victoire DE COMBAT (un Round gagné), seule notion de victoire qui existe aujourd'hui."
  );

  console.log('\nDétail par seed :');
  for (const m of seedMetrics) {
    console.log(
      `  seed=${m.seed} rounds=${m.roundsPlayed} terminatedBy=${m.terminatedBy} ` +
      `wonAnyCombat=${m.wonAnyCombat} round1Gold=${m.round1Gold} round1CheapestShopCost=${m.round1CheapestShopCost}` +
      (m.crash ? ` crash=${m.crash}` : '') + (m.illegalState ? ` illegalState=${m.illegalState}` : '')
    );
  }

  console.log(`\n=== VERDICT SOLVABILITÉ : ${allPassed ? 'SOLVABLE (5/5 volets verts)' : 'INJOUABLE (au moins un volet rouge)'} ===`);
  process.exit(allPassed ? 0 : 1);
}

// N'exécute main() que lancé directement (node solvability.mjs), jamais quand importé par le
// fichier de falsification (qui appelle les checkXxx directement sans déclencher process.exit()).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
