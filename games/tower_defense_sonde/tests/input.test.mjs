import { strict as assert } from 'assert';
import { test } from 'node:test';
import { attachInputHandlers } from '../input/input.mjs';
import { initGameState } from '../sim/state.mjs';
import { pathCells } from '../config/geometry.mjs';

const CELL_W = 640 / 20;
const CELL_H = 384 / 12;

// Minimal DOM double: enough for the adapter to bind and for the test to FIRE the
// handlers it bound. No jsdom, no browser — the browser path is proven separately
// by e2e.mjs; what is proven here is the pixel -> cell -> intent translation.
const fakeDom = () => {
  const listeners = {};
  const element = (id) => ({
    id,
    addEventListener: (type, fn) => { listeners[`${id}:${type}`] = fn; }
  });
  const known = ['btn-gun', 'btn-frost', 'btn-cannon', 'btn-upgrade', 'btn-call-wave', 'restart'];
  const elements = Object.fromEntries(known.map((id) => [id, element(id)]));
  globalThis.document = { getElementById: (id) => elements[id] || null };

  const canvas = {
    ...element('game-canvas'),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 384 })
  };
  const fire = (key, event) => {
    assert.ok(listeners[key], `no handler was bound for ${key}`);
    listeners[key](event);
  };
  const clickCell = (x, y) => fire('game-canvas:click', {
    clientX: (x + 0.5) * CELL_W, clientY: (y + 0.5) * CELL_H
  });
  return { canvas, fire, clickCell, listeners };
};

test('R37/R38/R39/R29/R36: the adapter binds every control the page ships', () => {
  const state = initGameState(1337);
  const dom = fakeDom();
  attachInputHandlers(state, dom.canvas, {});
  assert.deepEqual(Object.keys(dom.listeners).sort(), [
    'btn-call-wave:click', 'btn-cannon:click', 'btn-frost:click', 'btn-gun:click',
    'btn-upgrade:click', 'game-canvas:click', 'restart:click'
  ]);
});

test('R38: a canvas click translates pixels into the EXACT grid cell', () => {
  const state = initGameState(1337);
  const dom = fakeDom();
  attachInputHandlers(state, dom.canvas, {});

  dom.fire('btn-gun:click');
  dom.clickCell(1, 1);
  assert.equal(state.towers.length, 1);
  assert.deepEqual([state.towers[0].x, state.towers[0].y], [1, 1], 'the clicked cell, exactly');
  assert.equal(state.gold, 50, 'and the gold cost was applied exactly once');

  // Pixel arithmetic, not luck: the last pixel of a cell still belongs to it.
  dom.clickCell(3.99 - 0.5, 3.99 - 0.5);
  assert.deepEqual([state.towers[1].x, state.towers[1].y], [3, 3]);
});

test('R37: each tower button selects exactly its own type', () => {
  const state = initGameState(1337);
  const dom = fakeDom();
  attachInputHandlers(state, dom.canvas, {});
  dom.fire('btn-frost:click');
  assert.equal(state.selectedTowerType, 'frost');
  dom.fire('btn-cannon:click');
  assert.equal(state.selectedTowerType, 'cannon');
  dom.fire('btn-gun:click');
  assert.equal(state.selectedTowerType, 'gun');
});

test('R41: a canvas click on the lane goes through the same refusal path, changing nothing', () => {
  const state = initGameState(1337);
  const dom = fakeDom();
  attachInputHandlers(state, dom.canvas, {});
  dom.fire('btn-gun:click');
  const [px, py] = pathCells()[0];
  dom.clickCell(px, py);
  assert.equal(state.towers.length, 0);
  assert.equal(state.gold, 100);
});

test('R39: the upgrade button upgrades an existing tower, and is inert with none', () => {
  const state = initGameState(1337);
  state.gold = 300;
  const dom = fakeDom();
  attachInputHandlers(state, dom.canvas, {});

  dom.fire('btn-upgrade:click');
  assert.equal(state.towers.length, 0, 'nothing to upgrade: nothing happens');
  assert.equal(state.gold, 300, 'and nothing is spent');

  dom.fire('btn-gun:click');
  dom.clickCell(1, 1);
  dom.fire('btn-upgrade:click');
  assert.equal(state.towers[0].level, 2);
  assert.equal(state.gold, 210, '300 - 50 - 40, exactly');
});

test('R29/R36: the wave and restart buttons drive the real intents', () => {
  const state = initGameState(1337);
  const dom = fakeDom();
  attachInputHandlers(state, dom.canvas, {});

  dom.fire('btn-call-wave:click');
  assert.equal(state.phase, 'SPAWNING');
  assert.equal(state.enemies.length, 5);

  dom.fire('restart:click');
  assert.equal(state.phase, 'PREPARATION');
  assert.equal(state.enemies.length, 0);
  assert.equal(state.gold, 100);
  assert.equal(state.lives, 20);
});

test('R41: the adapter binds without a canvas, and never touches the sim directly', () => {
  const state = initGameState(1337);
  fakeDom();
  assert.doesNotThrow(() => attachInputHandlers(state, null, {}),
    'a missing canvas must not crash the boot');
  assert.equal(state.towers.length, 0);
});
