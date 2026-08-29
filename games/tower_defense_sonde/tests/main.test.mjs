import { strict as assert } from 'assert';
import { test } from 'node:test';

// The composition root boots on import (`document.getElementById('game-canvas')`
// then startGame), so the DOM doubles have to exist BEFORE the dynamic import
// below. What is proven here is the one thing only this module owns: the
// real-time -> fixed-step boundary. The rAF callback is captured instead of
// scheduled, so the loop is driven frame by frame, deterministically.
const captured = { frames: [], ops: [] };

const stubCtx = () => new Proxy({}, {
  get: (_t, prop) => (...args) => captured.ops.push({ op: String(prop), args }),
  set: () => true
});

const stubElement = (id) => ({
  id,
  textContent: '',
  classList: {
    _set: new Set(['hidden']),
    add(c) { this._set.add(c); },
    remove(c) { this._set.delete(c); },
    contains(c) { return this._set.has(c); }
  },
  addEventListener: () => {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 384 }),
  getContext: () => stubCtx()
});

const elements = new Map();
globalThis.document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, stubElement(id));
    return elements.get(id);
  }
};
globalThis.window = {};
globalThis.requestAnimationFrame = (fn) => { captured.frames.push(fn); return captured.frames.length; };

const main = await import('../main.mjs');

// Drives exactly n frames of the real rAF loop the module registered.
const runFrames = (n) => {
  for (let i = 0; i < n; i++) {
    const next = captured.frames.pop();
    assert.ok(next, 'the loop must schedule its next frame');
    next(0);
  }
};

test('R31: the loop boots and schedules a frame from the shipped page anchors', () => {
  assert.equal(typeof main.startGame, 'function');
  assert.equal(captured.frames.length, 1, 'boot scheduled exactly one frame');
  assert.equal(typeof globalThis.window.__game, 'undefined', 'no state is published before a frame runs');
});

test('R31: each frame advances the sim by EXACTLY one fixed tick, never by the frame delta', () => {
  runFrames(1);
  assert.equal(globalThis.window.__game.tick, 1, 'one frame = one 16ms tick');
  runFrames(3);
  assert.equal(globalThis.window.__game.tick, 4, 'four frames = exactly four ticks');
  // Real-time frames are clamped to the fixed step: the accumulator can never
  // run several ticks per frame, and never fewer than one.
  runFrames(10);
  assert.equal(globalThis.window.__game.tick, 14);
});

test('R40: window.__game exposes the state as READ-ONLY scalars, with no cheat hook', () => {
  runFrames(1);
  const exposed = globalThis.window.__game;
  assert.deepEqual(Object.keys(exposed).sort(), [
    'enemies', 'gold', 'leaks', 'lives', 'phase', 'result', 'seed', 'tick', 'towers', 'wave'
  ]);
  assert.equal(exposed.seed, 1337);
  assert.equal(exposed.lives, 20);
  assert.equal(exposed.result, null);
  for (const [key, value] of Object.entries(exposed)) {
    assert.notEqual(typeof value, 'function', `window.__game.${key} must not be callable`);
  }
  assert.equal(typeof globalThis.window.__game_debug, 'undefined',
    'no debug/cheat surface is exposed on the page');
});

test('R40: the HTML read-outs follow the state the frame just computed', () => {
  runFrames(1);
  assert.equal(document.getElementById('stat-gold').textContent, '100');
  assert.equal(document.getElementById('stat-lives').textContent, '20');
  assert.equal(document.getElementById('stat-wave').textContent, '1');
  assert.equal(document.getElementById('stat-leaks').textContent, '0');
  assert.equal(document.getElementById('overlay').classList.contains('hidden'), true,
    'the end overlay stays hidden while the game runs');
});

test('R46: reaching a result shows the overlay, and a fresh state hides it again', () => {
  const state = main.getGameState();
  state.result = 'VICTORY';
  state.lives = 6;
  runFrames(1);
  const overlay = document.getElementById('overlay');
  assert.equal(overlay.classList.contains('hidden'), false, 'the overlay is shown');
  assert.equal(overlay.classList.contains('show'), true);
  assert.equal(document.getElementById('overlay-result').textContent, 'VICTORY');
  assert.equal(document.getElementById('stat-lives').textContent, '6');

  state.result = null;
  runFrames(1);
  assert.equal(overlay.classList.contains('hidden'), true, 'and hidden again when it is not over');
  assert.equal(overlay.classList.contains('show'), false);
});
