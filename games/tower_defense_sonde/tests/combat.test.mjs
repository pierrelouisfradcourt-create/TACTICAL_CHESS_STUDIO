import { strict as assert } from 'assert';
import { test } from 'node:test';
import {
  applyDamage, applySplashDamage, applyFrostSlow, updateFrostEffects,
  hasFrostEffect, activeFrostMult, killEnemy, resolveCombat, acquireTarget,
  spawnProjectile, ageProjectiles, PROJECTILE_LIFETIME_MS
} from '../sim/combat.mjs';
import { TOWER_TYPES } from '../config/towers.mjs';
import { ENEMY_TYPES } from '../config/enemies.mjs';
import { initGameState } from '../sim/state.mjs';

// ROOT of the simulation-core suite. The sealed mutation command names four
// entry points (see run-oracle.mjs); the sim sub-suites are imported here so
// they genuinely RUN under that command — an unexecuted test kills no mutant.
import './targeting.test.mjs';
import './movement.test.mjs';
import './economy.test.mjs';
import './waves_phase.test.mjs';
import './step.test.mjs';

const gun = (level = 1) => ({ id: 1, x: 0, y: 0, type: TOWER_TYPES.GUN, level, cooldownMs: 0 });
const cannon = (level = 1) => ({ id: 1, x: 0, y: 0, type: TOWER_TYPES.CANNON, level, cooldownMs: 0 });
const frost = (level = 1) => ({ id: 1, x: 0, y: 0, type: TOWER_TYPES.FROST, level, cooldownMs: 0 });
const enemy = (over = {}) => ({
  id: 1, type: ENEMY_TYPES.GRUNT, x: 0, y: 0, progress: 1, hp: 40,
  frosts: [], bountyAwarded: false, ...over
});

// --- damage / armor -------------------------------------------------------

test('R6: Gun L1 vs Brute armor 4 removes EXACTLY 2 hp', () => {
  const brute = enemy({ type: ENEMY_TYPES.BRUTE, hp: 50 });
  assert.equal(applyDamage(brute, gun()), 2, 'Gun 6 - Brute armor 4 = 2');
  assert.equal(brute.hp, 48);
});

test('R11: Cannon L1 vs Brute armor 4 removes EXACTLY 18 hp', () => {
  const brute = enemy({ type: ENEMY_TYPES.BRUTE, hp: 50 });
  assert.equal(applyDamage(brute, cannon()), 18, 'Cannon 22 - Brute armor 4 = 18');
  assert.equal(brute.hp, 32);
});

test('R15: armor is a FLAT subtraction with a floor of 1, and Gun L3 pierce beats it', () => {
  const brute = () => enemy({ type: ENEMY_TYPES.BRUTE, hp: 50 });
  assert.equal(applyDamage(brute(), gun(1)), 2, 'L1: 6 - 4');
  assert.equal(applyDamage(brute(), gun(2)), 5.6, 'L2: 9.6 - 4');
  assert.equal(applyDamage(brute(), gun(3)), 14.36, 'L3: 15.36 - pierced armor 1');
  // Only the GUN pierces. A Cannon L3 still faces the FULL armor 4 — it must
  // never read its own splash radius (1.8) as the target's armor.
  assert.equal(applyDamage(brute(), cannon(3)), 52.32, 'Cannon L3: 56.32 - full armor 4');
  assert.equal(applyDamage(brute(), cannon(1)), 18, 'Cannon L1: 22 - full armor 4');
  // Floor of 1: a Frost L1 (3 dmg) against armor 4 would go negative without it.
  assert.equal(applyDamage(brute(), frost(1)), 1, 'damage never drops below 1');
  const grunt = enemy({ hp: 40 });
  assert.equal(applyDamage(grunt, gun()), 6, 'zero armor: full damage lands');
  assert.equal(grunt.hp, 34);
});

test('R6b: hp is clamped at 0, never negative', () => {
  const dying = enemy({ hp: 2 });
  assert.equal(applyDamage(dying, gun()), 6);
  assert.equal(dying.hp, 0);
});

// --- splash ---------------------------------------------------------------

test('R10: Cannon splash hits every live enemy in radius for EXACTLY 22 each', () => {
  const target = enemy({ id: 1, x: 5, y: 6 });
  const others = [
    enemy({ id: 2, x: 5.5, y: 6 }),
    enemy({ id: 3, x: 5, y: 6.5 }),
    enemy({ id: 4, x: 5.5, y: 6.5 })
  ];
  applySplashDamage(cannon(), target, [target, ...others]);
  // The target is inside its own splash, so it takes 22 here as well.
  assert.equal(target.hp, 18);
  others.forEach((e) => assert.equal(e.hp, 18, `enemy ${e.id} took exactly 22 splash damage`));
});

test('R10b: splash includes an enemy EXACTLY on the radius and excludes one past it', () => {
  const target = enemy({ id: 1, x: 0, y: 0 });
  // Math.sqrt(1.2 ** 2) === 1.2 exactly in IEEE-754, so this is a true boundary
  // case: a `<=` flipped to `<` drops this enemy and fails the assertion below.
  const onRadius = enemy({ id: 2, x: 1.2, y: 0 });
  const beyond = enemy({ id: 3, x: 1.3, y: 0 });
  applySplashDamage(cannon(), target, [target, onRadius, beyond]);
  assert.equal(onRadius.hp, 18, 'an enemy exactly ON the splash radius is hit');
  assert.equal(beyond.hp, 40, 'an enemy past the radius is untouched');
});

test('R10c: splash never re-damages a corpse (0 writes to a dead enemy)', () => {
  // A corpse clamps back to 0 hp, so hp alone cannot witness a wrongful hit —
  // the spy setter counts WRITES, which is the observable that actually moves.
  let corpseWrites = 0;
  const corpse = {
    id: 2, type: ENEMY_TYPES.GRUNT, x: 0, y: 0, _hp: 0,
    get hp() { return this._hp; },
    set hp(v) { corpseWrites++; this._hp = v; }
  };
  const target = enemy({ id: 1, x: 0, y: 0 });
  applySplashDamage(cannon(), target, [target, corpse]);
  assert.equal(corpseWrites, 0, 'the dead enemy was never written to');
  assert.equal(corpse.hp, 0);
  assert.equal(target.hp, 18, 'the live target still took its exact 22');
});

test('R23b: Cannon L3 widens the splash to exactly 1.8 (reaches what L1 cannot)', () => {
  const build = () => [enemy({ id: 1, x: 0, y: 0 }), enemy({ id: 2, x: 1.5, y: 0 })];
  const [t1, far1] = build();
  applySplashDamage(cannon(1), t1, [t1, far1]);
  assert.equal(far1.hp, 40, 'L1 splash 1.2 cannot reach 1.5 cases away');

  const [t3, far3] = build();
  applySplashDamage(cannon(3), t3, [t3, far3]);
  assert.equal(far3.hp, 0, 'L3 splash 1.8 reaches it — 56.32 damage kills a 40 hp Grunt outright');

  // Same reach, on a target tough enough to survive it, so the exact L3 damage
  // (56.32, not merely "more than L1") is what the assertion pins down.
  const t3b = enemy({ id: 1, x: 0, y: 0, type: ENEMY_TYPES.BRUTE, hp: 200 });
  const far3b = enemy({ id: 2, x: 1.5, y: 0, type: ENEMY_TYPES.BRUTE, hp: 200 });
  applySplashDamage(cannon(3), t3b, [t3b, far3b]);
  assert.equal(far3b.hp, 147.68, 'exact L3 damage 56.32 minus Brute armor 4');
});

// --- frost ----------------------------------------------------------------

test('R7: Frost applies its exact slow stack, and only a FROST tower does', () => {
  const chilled = enemy();
  applyFrostSlow(chilled, frost(1));
  assert.deepEqual(chilled.frosts, [{ appliedAt: 0, duration: 1.0, mult: 0.55 }]);

  const untouched = enemy();
  applyFrostSlow(untouched, gun());
  assert.deepEqual(untouched.frosts, [], 'a Gun never chills');
  applyFrostSlow(untouched, cannon());
  assert.deepEqual(untouched.frosts, [], 'a Cannon never chills');
});

test('R7b: Frost initialises the stack on an enemy that has no frosts field yet', () => {
  const bare = { id: 9, type: ENEMY_TYPES.GRUNT, hp: 40 }; // no `frosts` property
  applyFrostSlow(bare, frost(1));
  assert.deepEqual(bare.frosts, [{ appliedAt: 0, duration: 1.0, mult: 0.55 }]);
});

test('R23c: Frost L3 stacks a stronger, longer slow than L1', () => {
  const chilled = enemy();
  applyFrostSlow(chilled, frost(3));
  assert.deepEqual(chilled.frosts, [{ appliedAt: 0, duration: 2.2, mult: 0.4 }]);
});

test('R7c: frost stacks expire on their exact duration, and the strongest wins', () => {
  assert.equal(hasFrostEffect({ frosts: [] }), false, 'an empty stack is no effect');
  assert.equal(hasFrostEffect({ frosts: [{ appliedAt: 0, duration: 1, mult: 0.55 }] }), true);
  assert.equal(activeFrostMult({ frosts: [] }), 1, 'no stack = no slow');
  assert.equal(activeFrostMult({ frosts: [{ mult: 0.55 }, { mult: 0.4 }] }), 0.4, 'strongest slow wins');

  const chilled = enemy();
  applyFrostSlow(chilled, frost(1)); // duration 1.0s = 1000ms
  updateFrostEffects(chilled, 999);
  assert.equal(chilled.frosts.length, 1, 'still chilled 1ms before expiry');
  updateFrostEffects(chilled, 1);
  assert.equal(chilled.frosts.length, 0, 'expires exactly at its duration');
  assert.equal(hasFrostEffect(chilled), false);
});

// --- kill / bounty --------------------------------------------------------

test('R13: killEnemy pays the bounty EXACTLY once (idempotent on a corpse)', () => {
  const state = initGameState(1337);
  const grunt = enemy({ hp: 5 });
  assert.equal(killEnemy(state, grunt), 8, 'Grunt bounty is exactly 8');
  assert.equal(grunt.hp, 0);
  assert.equal(grunt.bountyAwarded, true);
  assert.equal(killEnemy(state, grunt), 0, 'a corpse is never paid a second time');
  assert.equal(state.gold, 108);
  assert.equal(state.goldLedger.bounty, 8);
});

// --- resolveCombat (one tick of tower fire) --------------------------------

test('R14: resolveCombat respects cadence — a Gun fires EXACTLY once in 3 ticks', () => {
  const state = initGameState(1337);
  state.towers = [gun()];
  state.enemies = [enemy({ hp: 40 })];
  resolveCombat(state, 16);
  resolveCombat(state, 16);
  resolveCombat(state, 16);
  // 2 shots/s = one shot every 500ms; three 16ms ticks fit exactly one shot.
  assert.equal(state.enemies[0].hp, 34, 'exactly one 6-damage shot in 48ms');
  assert.equal(state.towers[0].cooldownMs, 468, '500ms cooldown minus two elapsed ticks');
});

test('R14b: resolveCombat applies the Frost on-hit effect for a Frost tower', () => {
  const state = initGameState(1337);
  state.towers = [frost()];
  state.enemies = [enemy({ hp: 40 })];
  resolveCombat(state, 16);
  assert.equal(state.enemies[0].hp, 37, 'Frost L1 deals exactly 3');
  assert.deepEqual(state.enemies[0].frosts, [{ appliedAt: 0, duration: 1.0, mult: 0.55 }]);
});

test('R14c: resolveCombat applies the Cannon splash to a second enemy', () => {
  const state = initGameState(1337);
  state.towers = [cannon()];
  state.enemies = [enemy({ id: 1, x: 0, y: 0, progress: 2 }), enemy({ id: 2, x: 0.5, y: 0, progress: 1 })];
  resolveCombat(state, 16);
  // Target takes the direct hit AND its own splash (22 + 22, clamped at 0),
  // the neighbour takes the splash only.
  assert.equal(state.enemies[0].hp, 0);
  assert.equal(state.enemies[1].hp, 18, 'the neighbour took exactly one 22-damage splash');
  assert.equal(state.gold, 108, 'the dead target paid its bounty exactly once');
});

test('R27: resolveCombat pays a bounty at EXACTLY 0 hp, and never for a live enemy', () => {
  const state = initGameState(1337);
  state.towers = [gun()];
  state.enemies = [
    enemy({ id: 1, x: 0, y: 0, progress: 3, hp: 6 }),      // dies to exactly 0 hp
    enemy({ id: 2, x: 10, y: 10, progress: 1, hp: 40 })    // out of range, alive
  ];
  resolveCombat(state, 16);
  assert.equal(state.enemies[0].hp, 0, 'the shot lands the enemy on exactly 0 hp');
  assert.equal(state.enemies[0].bountyAwarded, true);
  assert.equal(state.enemies[1].hp, 40, 'a live out-of-range enemy is untouched');
  assert.equal(state.enemies[1].bountyAwarded, false, 'a live enemy is never paid out');
  assert.equal(state.gold, 108, 'exactly one 8-gold bounty was paid');
  assert.equal(state.goldLedger.bounty, 8);
});

// --- projectiles (the visible trace of a shot) -----------------------------

test('R43: firing records a shot with the exact tower and target it came from', () => {
  const state = initGameState(1337);
  spawnProjectile(state, cannon(3), enemy({ id: 77, x: 4, y: 9 }));
  assert.deepEqual(state.projectiles, [{
    id: 20000, tower_id: 1, kind: TOWER_TYPES.CANNON, x: 0, y: 0,
    target_id: 77, target_x: 4, target_y: 9, elapsed: 0
  }]);
});

test('R43: a shot on a state with no projectile list still records cleanly', () => {
  const state = initGameState(1337);
  delete state.projectiles;
  spawnProjectile(state, gun(), enemy({ id: 5 }));
  assert.equal(state.projectiles.length, 1);
  ageProjectiles(state, 1);
  assert.equal(state.projectiles.length, 1);
});

test('R43: a shot lives for EXACTLY its lifetime, then disappears', () => {
  const state = initGameState(1337);
  spawnProjectile(state, gun(), enemy({ id: 5 }));
  ageProjectiles(state, PROJECTILE_LIFETIME_MS - 1);
  assert.equal(state.projectiles.length, 1, 'still visible 1ms before expiry');
  assert.equal(state.projectiles[0].elapsed, PROJECTILE_LIFETIME_MS - 1);
  ageProjectiles(state, 1);
  assert.deepEqual(state.projectiles, [], 'gone exactly at its lifetime');
});

test('R43: resolveCombat produces one shot per tower that actually fires', () => {
  const state = initGameState(1337);
  state.towers = [gun(), { ...cannon(), id: 2, x: 10, y: 10 }];
  state.enemies = [enemy({ hp: 40 })]; // only the Gun is in range of it
  resolveCombat(state, 16);
  assert.equal(state.projectiles.length, 1, 'the out-of-range Cannon fires nothing');
  assert.equal(state.projectiles[0].tower_id, 1);
  assert.equal(state.projectiles[0].kind, TOWER_TYPES.GUN);
});

test('R12: acquireTarget picks the most advanced enemy in range', () => {
  const tower = { type: TOWER_TYPES.GUN, level: 1, x: 10, y: 6 };
  const target = acquireTarget(tower, [
    enemy({ id: 1, progress: 5, x: 9, y: 6 }),
    enemy({ id: 2, progress: 8, x: 8.5, y: 6 }),
    enemy({ id: 3, progress: 3, x: 11, y: 6 })
  ]);
  assert.equal(target.id, 2, 'targets the most advanced enemy inside the range');
});
