import { validateAndApply } from '../actions/actions.mjs';
import { step } from '../sim/step.mjs';
import { tripleCoverageCells } from '../config/geometry.mjs';

const TICK_MS = 16;
const MAX_TICKS = Math.floor(600000 / TICK_MS); // 10 minute hard cap

// Exported so the policy primitives can be proven directly (tests/bots.test.mjs)
// instead of only through whole-match outcomes: a guard that is only ever
// exercised end-to-end is a guard no test can pin down.
export const build = (state, towerType, x, y) => {
  if (state.towers.some(t => t.x === x && t.y === y)) return false;
  if (!validateAndApply(state, { type: 'SELECT_TOWER', towerType })) return false;
  return validateAndApply(state, { type: 'PLACE_TOWER', x, y, towerType });
};

export const upgradeAllGuns = (state) => {
  state.towers
    .filter(t => t.type === 'gun' && t.level < 3)
    .forEach(tower => {
      const cost = tower.level === 1 ? 40 : 80;
      if (state.gold >= cost) validateAndApply(state, { type: 'UPGRADE_TOWER', towerId: tower.id });
    });
};

// Entry-lane sentinel: a buildable cell adjacent to the long approach lane
// (y=0, x=8..19) so towers hit enemies well before they reach the pin.
const ENTRY_SENTINEL = [8, 1];
const PIN = tripleCoverageCells(); // [[1,1],[1,3],[3,3],[5,3],[5,5],[7,1]]

// Competent: garrisons every pin cell plus the entry lane FIRST (breadth —
// no single choke can carry the whole map once cadence is respected), then
// spends every idle gold cycle upgrading Gun towers to L3 (pierce beats
// Brute armor). Waits for its full garrison before calling the first wave.
export const botCompetent = (state) => {
  if (state.phase === 'PREPARATION') {
    const spots = [ENTRY_SENTINEL, ...PIN];
    spots.forEach(([x, y]) => {
      if (state.gold >= 50) build(state, 'gun', x, y);
    });
  }

  upgradeAllGuns(state);

  const garrisoned = state.towers.length >= 7;
  if (state.phase === 'PREPARATION' && (garrisoned || state.wavePhaseTime > 8000)) {
    validateAndApply(state, { type: 'CALL_WAVE' });
  }
};

// Naive: builds Cannons far from any lane (dead zones of the spiral map),
// never upgrades, and rushes waves immediately — effectively zero real
// coverage, must lose.
export const botNaive = (state) => {
  if (state.wave <= 3 && state.gold >= 100 && state.phase === 'PREPARATION') {
    const deadZones = [[15, 3], [15, 9], [12, 6]];
    deadZones.forEach(([x, y]) => {
      if (state.gold >= 100) build(state, 'cannon', x, y);
    });
  }

  if (state.phase === 'PREPARATION' && state.wavePhaseTime > 100) {
    validateAndApply(state, { type: 'CALL_WAVE' });
  }
};

// Tall: ONE chokepoint tower, held at L1 forever — minimal investment, no
// breadth (the long entry lane is left completely unguarded).
export const botTall = (state) => {
  if (state.phase === 'PREPARATION' && state.wave === 1) {
    build(state, 'gun', PIN[2][0], PIN[2][1]); // [3,3] — single tower, never upgraded
  }
  if (state.phase === 'PREPARATION' && state.wavePhaseTime > 6000) {
    validateAndApply(state, { type: 'CALL_WAVE' });
  }
};

// Wide: garrisons every pin cell plus the entry sentinel with a cheap L1
// tower each, and never spends gold on upgrades — breadth over depth.
export const botWide = (state) => {
  if (state.phase === 'PREPARATION') {
    const spots = [ENTRY_SENTINEL, ...PIN];
    spots.forEach(([x, y]) => {
      if (state.gold >= 50) build(state, 'gun', x, y);
    });
  }
  if (state.phase === 'PREPARATION' && state.wavePhaseTime > 4000) {
    validateAndApply(state, { type: 'CALL_WAVE' });
  }
};

// Tempo: builds the same footprint as Competent but calls every wave the
// instant it can (maximising the early-call gold bonus) instead of waiting
// for towers to be in place first — an economy-first strategy.
export const botTempo = (state) => {
  if (state.phase === 'PREPARATION') {
    if (state.wave === 1) {
      build(state, 'gun', ENTRY_SENTINEL[0], ENTRY_SENTINEL[1]);
      build(state, 'gun', PIN[2][0], PIN[2][1]);
    }
    if (state.wave === 2) build(state, 'gun', PIN[3][0], PIN[3][1]);
  }
  upgradeAllGuns(state);
  if (state.phase === 'PREPARATION') {
    validateAndApply(state, { type: 'CALL_WAVE' }); // as early as possible, every wave
  }
};

export const BOT_PANEL = {
  competent: botCompetent,
  naive: botNaive,
  tall: botTall,
  wide: botWide,
  tempo: botTempo
};

export const collectMetrics = (state) => ({
  lives_final: state.lives,
  wave_reached: state.wave,
  leaks_total: state.leaks,
  gold_spent_total: -state.goldLedger.spend
});

// R49: ranks bot names by one metric, descending (higher = better), ties
// broken by name for determinism. Two metrics that reorder the SAME set of
// bots differently (see tests/variance.test.mjs) prove the panel's outcomes
// are multidimensional — no single metric reduces every bot to one order.
export const rankBots = (results, metricKey) =>
  [...results]
    .sort((a, b) => (b.metrics[metricKey] - a.metrics[metricKey]) || a.name.localeCompare(b.name))
    .map((r) => r.name);

export const playMatch = (state, botAI) => {
  for (let t = 0; t < MAX_TICKS; t++) {
    if (state.result) break;
    botAI(state);
    step(state, TICK_MS);
  }

  return {
    result: state.result || 'TIMEOUT',
    metrics: collectMetrics(state),
    final_state: state
  };
};
