import { enemyBaseStats } from '../config/enemies.mjs';

// Gold invariant (R20): state.gold === 100 + bounty + wave_bonus + early_bonus - spend
// at every tick. Every gold-moving call in the codebase MUST go through
// applyGoldDelta so the ledger and the actual balance can never drift apart —
// see tests/economy_invariant.test.mjs, which replays a real match and checks
// the equality at every single tick, not just at the end.
export const GOLD_LEDGER_KINDS = ['bounty', 'wave_bonus', 'early_bonus', 'spend'];

export const initGoldLedger = () => ({ bounty: 0, wave_bonus: 0, early_bonus: 0, spend: 0 });

export const applyGoldDelta = (state, delta, kind) => {
  if (!GOLD_LEDGER_KINDS.includes(kind)) {
    throw new Error(`applyGoldDelta: unknown ledger kind "${kind}"`);
  }
  state.gold += delta;
  state.goldLedger[kind] += delta;
};

// R18: bonus awarded once per cleared wave = 20 + 5 * waveNum (exact, no RNG).
export const waveClearBonus = (waveNum) => 20 + 5 * waveNum;

// R19: early-call bonus rewards calling the wave before the prep countdown
// expires. `secondsRemaining` is real elapsed-vs-total prep time, capped at 30 gold.
export const earlyCallBonus = (secondsRemaining) => {
  const bonus = Math.min(30, 2 * Math.max(0, secondsRemaining));
  return Math.round(bonus * 100) / 100;
};

// R20: pure recomputation of the invariant from the ledger — used by tests to
// assert against state.gold independently of how the ledger was populated.
export const expectedGold = (goldLedger) =>
  100 + goldLedger.bounty + goldLedger.wave_bonus + goldLedger.early_bonus - goldLedger.spend;

// R13/R17: bounty paid the instant an enemy dies (8 Grunt / 6 Runner / 25 Brute,
// exact — see config/enemies.mjs). sim/combat.mjs#killEnemy is the only caller,
// so a bounty is never paid without a real kill.
export const awardBounty = (state, enemy) => {
  const bounty = enemyBaseStats(enemy.type).bounty;
  applyGoldDelta(state, bounty, 'bounty');
  return bounty;
};
