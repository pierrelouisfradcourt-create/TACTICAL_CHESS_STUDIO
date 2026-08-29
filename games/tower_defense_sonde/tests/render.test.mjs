import { strict as assert } from 'assert';
import { test } from 'node:test';
import { renderGame } from '../render/render.mjs';
import { pathCells } from '../config/geometry.mjs';
import { initGameState } from '../sim/state.mjs';
import { ENEMY_TYPES } from '../config/enemies.mjs';
import { TOWER_TYPES } from '../config/tower_types.mjs';

const PATH_LENGTH = pathCells().length; // 47

// A recording 2D context: every draw call is captured WITH the style in force at
// the moment of the call, so the assertions below are about what a player would
// actually see, not merely that some function was called.
const recordingCtx = () => {
  const ops = [];
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textAlign: '', textBaseline: ''
  };
  for (const name of ['fillRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'arc', 'fill', 'fillText']) {
    ctx[name] = (...args) => ops.push({ op: name, args, fill: ctx.fillStyle, stroke: ctx.strokeStyle });
  }
  ctx.ops = ops;
  return ctx;
};

const opsOf = (ctx, name) => ctx.ops.filter((o) => o.op === name);
const enemyArcs = (ctx) => opsOf(ctx, 'arc').filter((o) => o.args[2] === 6);
const towerArcs = (ctx) => opsOf(ctx, 'arc').filter((o) => o.args[2] === 8);

test('R1: the lane is stroked as ONE polyline — a single moveTo, then every other cell', () => {
  const ctx = recordingCtx();
  renderGame(ctx, initGameState(1337));
  assert.equal(opsOf(ctx, 'moveTo').length, 1, 'exactly one pen-down');
  assert.equal(opsOf(ctx, 'lineTo').length, PATH_LENGTH - 1, 'exactly 46 segments for 47 cells');
  assert.deepEqual(opsOf(ctx, 'moveTo')[0].args, [(19 + 0.5) * 32, (0 + 0.5) * 32],
    'the pen goes down on the entry cell');
});

test('R42/R45: each tower type is drawn in its own exact colour, with its level on it', () => {
  const state = initGameState(1337);
  state.towers = [
    { id: 1, x: 1, y: 1, type: TOWER_TYPES.GUN, level: 1 },
    { id: 2, x: 1, y: 3, type: TOWER_TYPES.FROST, level: 2 },
    { id: 3, x: 3, y: 3, type: TOWER_TYPES.CANNON, level: 3 }
  ];
  const ctx = recordingCtx();
  renderGame(ctx, state);

  const arcs = towerArcs(ctx);
  assert.equal(arcs.length, 3, 'three towers, three discs');
  assert.deepEqual(arcs.map((a) => a.fill), ['#0f0', '#00f', '#f00'],
    'gun green, frost blue, cannon red — the type really drives the colour');
  assert.deepEqual(
    opsOf(ctx, 'fillText').map((o) => o.args[0]), ['1', '2', '3'],
    'each tower shows its exact level');
});

test('R42: a live enemy is drawn with a health bar; a corpse is drawn not at all', () => {
  const state = initGameState(1337);
  state.enemies = [
    { id: 1, type: ENEMY_TYPES.GRUNT, x: 5, y: 5, hp: 40, frosts: [] },
    { id: 2, type: ENEMY_TYPES.GRUNT, x: 6, y: 5, hp: 0, frosts: [] }
  ];
  const ctx = recordingCtx();
  renderGame(ctx, state);
  assert.equal(enemyArcs(ctx).length, 1, 'exactly one enemy disc: the corpse is skipped');
  // 1 background fillRect + 2 health-bar rects (red backing + green fill) for the
  // single live enemy.
  assert.equal(opsOf(ctx, 'fillRect').length, 3);
});

test('R44: a chilled enemy is recoloured, and each type keeps its own exact colour', () => {
  const state = initGameState(1337);
  state.enemies = [
    { id: 1, type: ENEMY_TYPES.GRUNT, x: 5, y: 5, hp: 40, frosts: [] },
    { id: 2, type: ENEMY_TYPES.RUNNER, x: 6, y: 5, hp: 30, frosts: [] },
    { id: 3, type: ENEMY_TYPES.GRUNT, x: 7, y: 5, hp: 40, frosts: [{ mult: 0.55, duration: 1, appliedAt: 0 }] }
  ];
  const ctx = recordingCtx();
  renderGame(ctx, state);
  assert.deepEqual(enemyArcs(ctx).map((a) => a.fill), ['#888', '#aaa', '#8ac'],
    'grunt grey, runner light grey, chilled enemy blue — the chill is visible');
});

test('R46: the end overlay names the outcome, in the exact colour of that outcome', () => {
  for (const [result, colour] of [['VICTORY', '#0f0'], ['DEFEAT', '#f00']]) {
    const state = initGameState(1337);
    state.result = result;
    state.lives = 7;
    state.wave = 9;
    const ctx = recordingCtx();
    renderGame(ctx, state);

    const texts = opsOf(ctx, 'fillText');
    assert.equal(texts[0].args[0], result, `the overlay says ${result}`);
    assert.equal(texts[0].fill, colour, `${result} is drawn in ${colour}`);
    assert.deepEqual(texts.slice(1).map((t) => t.args[0]), ['Lives: 7', 'Wave: 9']);
  }
});

const projectile = (over = {}) => ({
  id: 20000, tower_id: 1, kind: 'gun', x: 1, y: 1,
  target_id: 10000, target_x: 5, target_y: 5, elapsed: 0, ...over
});

test('R43: every live shot is drawn, from its tower to where its target was', () => {
  const state = initGameState(1337);
  state.towers = [
    { id: 1, x: 1, y: 1, type: TOWER_TYPES.GUN, level: 1 },
    { id: 2, x: 3, y: 3, type: TOWER_TYPES.CANNON, level: 1 }
  ];
  state.projectiles = [
    projectile({ id: 20000, tower_id: 1, kind: 'gun', x: 1, y: 1, target_x: 5, target_y: 5 }),
    projectile({ id: 20001, tower_id: 2, kind: 'cannon', x: 3, y: 3, target_x: 6, target_y: 2 })
  ];
  const ctx = recordingCtx();
  renderGame(ctx, state);

  // The lane stroke is drawn first; the shots follow, one stroke each.
  const strokes = opsOf(ctx, 'stroke');
  assert.equal(strokes.length, 4, 'lane + two shots + the cannon area ring');
  assert.deepEqual(strokes.slice(1, 3).map((s) => s.stroke), ['#0f0', '#f00'],
    'each shot is drawn in the colour of the tower that fired it');

  const moves = opsOf(ctx, 'moveTo');
  assert.deepEqual(moves[1].args, [(1 + 0.5) * 32, (1 + 0.5) * 32], 'the shot leaves its tower');
  assert.deepEqual(opsOf(ctx, 'lineTo').at(-2).args, [5 * 32, 5 * 32], 'and reaches its target');
});

test('R43: with no shot in flight, nothing extra is drawn', () => {
  const state = initGameState(1337);
  state.projectiles = [];
  const ctx = recordingCtx();
  renderGame(ctx, state);
  assert.equal(opsOf(ctx, 'stroke').length, 1, 'the lane stroke, and nothing else');
});

test('R45: a Cannon shot draws its area ring at the EXACT splash radius of its level', () => {
  const build = (level) => {
    const state = initGameState(1337);
    state.towers = [
      { id: 1, x: 3, y: 3, type: TOWER_TYPES.CANNON, level },
      { id: 2, x: 5, y: 5, type: TOWER_TYPES.CANNON, level: 1 }
    ];
    state.projectiles = [projectile({ tower_id: 1, kind: 'cannon', x: 3, y: 3, target_x: 6, target_y: 2 })];
    const ctx = recordingCtx();
    renderGame(ctx, state);
    return ctx;
  };

  const l1 = build(1);
  const ring1 = opsOf(l1, 'arc').filter((a) => a.stroke === '#f80');
  assert.equal(ring1.length, 1, 'exactly one area ring for one Cannon shot');
  assert.deepEqual(ring1[0].args.slice(0, 3), [6 * 32, 2 * 32, 1.2 * 32], 'L1 radius 1.2');

  const l3 = build(3);
  const ring3 = opsOf(l3, 'arc').filter((a) => a.stroke === '#f80');
  assert.deepEqual(ring3[0].args.slice(0, 3), [6 * 32, 2 * 32, 1.8 * 32],
    'L3 widens the ring to 1.8 — the ring reads the FIRING tower, not just any tower');
});

test('R45: a Gun shot draws no area ring — the ring means splash, nothing else', () => {
  const state = initGameState(1337);
  state.towers = [{ id: 1, x: 1, y: 1, type: TOWER_TYPES.GUN, level: 1 }];
  state.projectiles = [projectile({ tower_id: 1, kind: 'gun' })];
  const ctx = recordingCtx();
  renderGame(ctx, state);
  assert.deepEqual(opsOf(ctx, 'arc').filter((a) => a.stroke === '#f80'), []);
});

test('R42: the health bar is scaled to the enemy OWN maximum, at exact widths', () => {
  const state = initGameState(1337);
  state.enemies = [
    { id: 1, type: ENEMY_TYPES.RUNNER, x: 1, y: 1, hp: 30, frosts: [] }, // full: 30/30
    { id: 2, type: ENEMY_TYPES.BRUTE, x: 2, y: 1, hp: 25, frosts: [] }   // half: 25/50
  ];
  const ctx = recordingCtx();
  renderGame(ctx, state);
  const greenBars = opsOf(ctx, 'fillRect').filter((o) => o.fill === '#0f0');
  assert.deepEqual(greenBars.map((o) => o.args[2]), [20, 10],
    'a full-health Runner shows a FULL bar; a half-health Brute shows exactly half');
});

test('R46: no overlay is drawn while the game is still running', () => {
  const ctx = recordingCtx();
  renderGame(ctx, initGameState(1337));
  assert.deepEqual(opsOf(ctx, 'fillText'), [], 'nothing is written over a live game');
  assert.equal(opsOf(ctx, 'fillRect').length, 1, 'only the background clear');
});
