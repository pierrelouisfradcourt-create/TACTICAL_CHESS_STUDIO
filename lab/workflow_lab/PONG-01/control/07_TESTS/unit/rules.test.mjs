// PONG — tests des regles pures. Chaque test cite la ligne de wiremap qu'il prouve.
// Lance : node --test games/pong/07_TESTS/unit/rules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FIELD, PADDLE, BALL, STATUS, SIDE, WINNING_SCORE,
  createInitialState, restart, evaluateEnd, stateViolations,
} from '../../05_SYSTEMS/game_state/state.mjs';
import { ACTION, normalizeAction, normalizeInputs } from '../../05_SYSTEMS/input/input.mjs';
import { boot, tick, EVENT } from '../../05_SYSTEMS/game_loop/loop.mjs';

// ---------- core.boot ----------
test('core.boot — le jeu atteint un etat initial valide', () => {
  const s = boot();
  assert.deepEqual(stateViolations(s), []);
  assert.equal(s.status, STATUS.PLAYING);
  assert.deepEqual(s.score, [0, 0]);
});

// ---------- core.main_loop ----------
test('core.main_loop — deterministe : memes entrees, meme etat suivant (200 ticks)', () => {
  let a = boot();
  let b = boot();
  const scenario = [ACTION.UP, ACTION.DOWN, ACTION.NONE, ACTION.UP];
  for (let i = 0; i < 200; i++) {
    const inputs = [scenario[i % 4], scenario[(i + 2) % 4]];
    a = tick(a, inputs);
    b = tick(b, inputs);
  }
  assert.deepEqual(a, b);
});

test('core.main_loop — le tick ne mute jamais l etat recu', () => {
  const s = boot();
  const copy = JSON.parse(JSON.stringify(s));
  tick(s, [ACTION.UP, ACTION.DOWN]);
  assert.deepEqual(s, copy);
});

// ---------- core.game_state ----------
test('core.game_state — le statut ne prend que des valeurs declarees', () => {
  let s = boot();
  const seen = new Set();
  for (let i = 0; i < 3000 && s.status === STATUS.PLAYING; i++) {
    s = tick(s, [ACTION.NONE, ACTION.NONE]);
    seen.add(s.status);
  }
  for (const v of seen) assert.ok(Object.values(STATUS).includes(v), `statut inconnu: ${v}`);
});

// ---------- core.end_condition ----------
test('core.end_condition — la partie se termine avec un vainqueur defini, jamais indefini', () => {
  const s = { score: [WINNING_SCORE, 2] };
  assert.deepEqual(evaluateEnd(s), { over: true, winner: SIDE.LEFT });
  assert.deepEqual(evaluateEnd({ score: [1, WINNING_SCORE] }), { over: true, winner: SIDE.RIGHT });
  assert.deepEqual(evaluateEnd({ score: [1, 1] }), { over: false, winner: null });
});

test('core.end_condition — une partie terminee ne repart pas toute seule', () => {
  let s = { ...boot(), status: STATUS.OVER, winner: SIDE.LEFT };
  const after = tick(s, [ACTION.UP, ACTION.UP]);
  assert.equal(after.status, STATUS.OVER);
  assert.equal(after.winner, SIDE.LEFT);
});

// ---------- core.restart ----------
test('core.restart — aucun residu de la partie precedente', () => {
  let s = boot();
  for (let i = 0; i < 500; i++) s = tick(s, [ACTION.UP, ACTION.NONE]);
  assert.notDeepEqual(s.score, [0, 0], 'le scenario doit avoir marque au moins un point');

  const fresh = restart();
  assert.deepEqual(fresh, createInitialState());
  assert.deepEqual(fresh.score, [0, 0]);
  assert.equal(fresh.winner, null);
  assert.equal(fresh.ticks, 0);
});

// ---------- play.paddle ----------
test('play.paddle — la raquette ne sort JAMAIS du terrain, meme entree maintenue', () => {
  let s = boot();
  for (let i = 0; i < 400; i++) {
    s = tick(s, [ACTION.UP, ACTION.DOWN]);          // les deux collent aux bords
    assert.ok(s.paddles[0].y >= 0, `raquette gauche sortie: ${s.paddles[0].y}`);
    assert.ok(s.paddles[1].y <= FIELD.HEIGHT - PADDLE.HEIGHT,
      `raquette droite sortie: ${s.paddles[1].y}`);
  }
});

// ---------- play.ball ----------
test('play.ball — la balle ne traverse JAMAIS une raquette, meme a vitesse elevee', () => {
  // Balle lancee a 20 px/tick vers la raquette gauche, alignee dessus.
  const base = boot();
  const paddleY = base.paddles[SIDE.LEFT].y;
  let s = {
    ...base,
    ball: { x: PADDLE.MARGIN + 40, y: paddleY + PADDLE.HEIGHT / 2, vx: -20, vy: 0 },
  };
  let bounced = false;
  for (let i = 0; i < 10 && !bounced; i++) {
    s = tick(s, [ACTION.NONE, ACTION.NONE]);
    if (s.events.includes(EVENT.BOUNCE_PADDLE)) bounced = true;
    assert.deepEqual(s.score, [0, 0], 'la balle a traverse la raquette : un point a ete marque');
  }
  assert.ok(bounced, 'aucun rebond detecte alors que la balle a franchi le plan de la raquette');
});

test('play.ball — rebond sur les bords haut et bas', () => {
  let s = { ...boot(), ball: { x: FIELD.WIDTH / 2, y: 1, vx: 0, vy: -3 } };
  s = tick(s, [ACTION.NONE, ACTION.NONE]);
  assert.ok(s.events.includes(EVENT.BOUNCE_WALL));
  assert.ok(s.ball.vy > 0, 'la balle doit repartir vers le bas');
  assert.ok(s.ball.y >= 0, 'la balle ne doit pas rester hors du terrain');
});

// ---------- play.score ----------
test('play.score — balle sortie a gauche => exactement un point a droite', () => {
  let s = { ...boot(), ball: { x: 1, y: FIELD.HEIGHT - 4, vx: -5, vy: 0 } };
  s = tick(s, [ACTION.NONE, ACTION.NONE]);
  assert.deepEqual(s.score, [0, 1]);
  assert.ok(s.events.includes(EVENT.SCORE));
});

// ---------- core.error_handling ----------
test('core.error_handling — entrees hors domaine : l etat reste toujours valide', () => {
  const garbage = [
    undefined, null, 42, 'gauche', {}, [], NaN, true,
    [ACTION.UP, ACTION.DOWN], [[ACTION.UP, ACTION.DOWN], null],
    Symbol.iterator, () => {}, [undefined, undefined],
  ];
  let s = boot();
  for (const g of garbage) {
    s = tick(s, g);
    assert.deepEqual(stateViolations(s), [], `etat invalide apres entree ${String(g)}`);
  }
});

test('core.error_handling — deux directions simultanees s annulent', () => {
  assert.equal(normalizeAction([ACTION.UP, ACTION.DOWN]), ACTION.NONE);
  assert.deepEqual(normalizeInputs('nimporte quoi'), [ACTION.NONE, ACTION.NONE]);
  assert.equal(normalizeAction('tourner'), ACTION.NONE);
});
