import { strict as assert } from 'assert';
import { test } from 'node:test';
import { acquireTarget } from '../sim/targeting.mjs';
import { TOWER_TYPES } from '../config/tower_types.mjs';
import { ENEMY_TYPES } from '../config/enemies.mjs';

const gun = { id: 1, x: 0, y: 0, type: TOWER_TYPES.GUN, level: 1 }; // range 2.5
const foe = (over) => ({ type: ENEMY_TYPES.GRUNT, x: 0, y: 0, progress: 1, hp: 40, ...over });

test('R12: "first" targeting returns the MOST ADVANCED live enemy in range', () => {
  const target = acquireTarget(gun, [
    foe({ id: 1, progress: 5, x: 1, y: 0 }),
    foe({ id: 2, progress: 8, x: 2, y: 0 }),
    foe({ id: 3, progress: 3, x: 0, y: 1 })
  ]);
  assert.equal(target.id, 2);
});

test('R12: an empty field, or a field of corpses, yields NO target', () => {
  assert.equal(acquireTarget(gun, []), null);
  assert.equal(
    acquireTarget(gun, [foe({ id: 1, progress: 99, hp: 0 })]), null,
    'a corpse is not a target, however far along the path it lies'
  );
});

test('R12: a corpse never outranks a live enemy, even at maximum progress', () => {
  const corpse = foe({ id: 1, progress: 99, hp: 0 });
  const live = foe({ id: 2, progress: 1, hp: 40 });
  assert.equal(acquireTarget(gun, [corpse, live]).id, 2);
  assert.equal(acquireTarget(gun, [live, corpse]).id, 2, 'array order does not matter');
});

test('R12: the range boundary is INCLUSIVE at exactly the declared range', () => {
  // Math.sqrt(2.5 ** 2) === 2.5 exactly in IEEE-754 — a true boundary case, so
  // a `<=` flipped to `<` drops `onEdge` and this assertion fails.
  const onEdge = foe({ id: 1, progress: 1, x: 2.5, y: 0 });
  const justOut = foe({ id: 2, progress: 99, x: 2.6, y: 0 });
  assert.equal(acquireTarget(gun, [onEdge]).id, 1, 'exactly at range 2.5: acquired');
  assert.equal(acquireTarget(gun, [justOut]), null, 'at 2.6: out of range');
  assert.equal(
    acquireTarget(gun, [onEdge, justOut]).id, 1,
    'the more advanced enemy is ignored because it is out of range'
  );
});

test('R12: an equal-progress tie breaks deterministically on the LOWEST id', () => {
  const enemies = [foe({ id: 9, progress: 5 }), foe({ id: 2, progress: 5 })];
  assert.equal(acquireTarget(gun, enemies).id, 2, 'lowest id wins an exact tie');
  assert.equal(acquireTarget(gun, [...enemies].reverse()).id, 2,
    'the tie-break does not depend on array order (R32 determinism rests on this)');
});

test('R12: range is read from the tower LEVEL, not hardcoded', () => {
  const at290 = foe({ id: 1, progress: 1, x: 2.9, y: 0 });
  assert.equal(acquireTarget({ ...gun, level: 1 }, [at290]), null, 'L1 range 2.5 cannot reach 2.9');
  assert.equal(acquireTarget({ ...gun, level: 3 }, [at290]).id, 1, 'L3 range 3.03 can');
});
