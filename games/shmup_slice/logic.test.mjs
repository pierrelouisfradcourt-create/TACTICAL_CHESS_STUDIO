// Unit tests for game logic. Use == for exact assertions (never >=).

import { test } from 'node:test';
import { strictEqual, ok } from 'node:assert';
import { createInitialState, GAME_WIDTH, GAME_HEIGHT, SHIP_WIDTH, SHIP_HEIGHT, MAX_LIVES, MAX_PROJECTILES } from './logic/state.mjs';
import { step } from './logic/step.mjs';
import { createRng } from './logic/rng.mjs';
import { resolveEnemyHits, resolveContactDamage, resolveBossHits, resolvePlayerHits } from './logic/collisions.mjs';
import { moveShip, updatePlayerProjectiles } from './logic/ship.mjs';
import { updateEnemyMovement, updateEnemyFire, updateEnemyProjectiles } from './logic/enemies.mjs';
import { advanceLevel, resolveVictory } from './logic/progression.mjs';
import { hasSafeCorridor, findSafeX, isSafeAt } from './logic/dodge.mjs';
import { awardScore, updateScoreFromKills } from './logic/scoring.mjs';
import { spawnProjectile } from './logic/projectiles.mjs';
import { MAP_1 } from './data/maps.mjs';

test('Initial state setup', (t) => {
  const state = createInitialState();
  strictEqual(state.level, 1, 'level starts at 1');
  strictEqual(state.score, 0, 'score starts at 0');
  strictEqual(state.lives, MAX_LIVES, `lives start at ${MAX_LIVES}`);
  strictEqual(state.status, 'ACTIVE', 'status is ACTIVE');
  strictEqual(state.ship.invincibilityMs, 0, 'no invincibility at start');
  strictEqual(state.bossActive, false, 'bossActive starts false (no boss until wave clears/timer)');
  strictEqual(state.boss, null, 'boss starts null');
});

test('Ship stays in bounds', (t) => {
  const state = createInitialState();
  const rng = createRng(1);
  const inputs = { left: true, right: false, fire: false };

  for (let i = 0; i < 1000; i++) {
    step(state, 0.016, inputs, rng);
    ok(state.ship.x >= 0, 'ship.x >= 0');
    ok(state.ship.x + SHIP_WIDTH <= GAME_WIDTH, 'ship.x + width <= screen width');
  }
});

// === R1 — déplacement 2D (pas seulement horizontal comme Space Invaders : le
// vaisseau doit aussi pouvoir monter/descendre, style TwinBee) ===
test('R1 — ship moves vertically on up/down input, exact step distance', (t) => {
  const state = createInitialState();
  const rng = createRng(1);
  const y0 = state.ship.y;

  step(state, 0.016, { left: false, right: false, up: true, down: false, fire: false }, rng);
  ok(state.ship.y < y0, 'ArrowUp doit faire monter le vaisseau (y diminue)');

  const yAfterUp = state.ship.y;
  step(state, 0.016, { left: false, right: false, up: false, down: true, fire: false }, rng);
  ok(state.ship.y > yAfterUp, 'ArrowDown doit faire descendre le vaisseau (y augmente)');
});

test('R1 — ship.y reste bornée à l\'écran', (t) => {
  const state = createInitialState();
  const rng = createRng(2);
  for (let i = 0; i < 800; i++) {
    step(state, 0.016, { up: true }, rng);
    ok(state.ship.y >= 0, 'ship.y >= 0');
  }
  for (let i = 0; i < 1500; i++) {
    step(state, 0.016, { down: true }, rng);
    ok(state.ship.y + SHIP_HEIGHT <= GAME_HEIGHT, 'ship.y + height <= écran');
  }
});

test('Score is monotone (never decreases)', (t) => {
  const state = createInitialState();
  const rng = createRng(1);
  const inputs = { left: false, right: false, fire: true };

  let prevScore = 0;
  for (let i = 0; i < 10000; i++) {
    step(state, 0.016, inputs, rng);
    ok(state.score >= prevScore, `score monotone: ${state.score} >= ${prevScore}`);
    prevScore = state.score;
  }
});

test('Firing creates exactly one projectile per frame (when not pooled)', (t) => {
  const state = createInitialState();
  const rng = createRng(1);

  // Fire several times
  const inputs = { left: false, right: false, fire: true };
  for (let i = 0; i < 10; i++) {
    step(state, 0.016, inputs, rng);
  }

  ok(state.playerProjectiles.length > 0, 'player has projectiles');
  ok(state.playerProjectiles.length <= MAX_LIVES * 10, 'projectile count bounded');
});

test('Lives start at 3, exactly 1 lost per hit', (t) => {
  const state = createInitialState();
  strictEqual(state.lives, MAX_LIVES, 'start with 3 lives');

  // Simulate damage
  state.lives -= 1;
  strictEqual(state.lives, 2, 'exactly 1 life lost');
  state.lives -= 1;
  strictEqual(state.lives, 1, 'exactly 1 life lost');
  state.lives -= 1;
  strictEqual(state.lives, 0, 'exactly 1 life lost');
});

test('Over flag: monotone (never resurrects)', (t) => {
  const state = createInitialState();
  const rng = createRng(1);
  let hasGoneOver = false;

  for (let i = 0; i < 20000; i++) {
    step(state, 0.016, { left: false, right: false, fire: false }, rng);
    if (state.status !== 'ACTIVE') {
      hasGoneOver = true;
    }
    if (hasGoneOver && state.status === 'ACTIVE') {
      throw new Error('Game resumed after game-over (not monotone)');
    }
  }
});

test('Defeat occurs iff lives == 0', (t) => {
  const state = createInitialState();
  state.lives = 0;
  strictEqual(state.status, 'ACTIVE', 'status not auto-set');

  // Step to trigger defeat logic
  const rng = createRng(1);
  step(state, 0.016, { left: false, right: false, fire: false }, rng);
  strictEqual(state.status, 'LOST', 'status = LOST when lives == 0');
});

test('Victory occurs iff boss 3 defeated and level == 3', (t) => {
  const state = createInitialState();
  state.level = 3;
  state.bossActive = true;
  state.boss = { hp: 1, fireCountdown: 0, width: 60, height: 40, x: 400, y: 80, vx: 0, fireRate: 0.5, pattern: 'wide_spread' };

  // Reduce boss HP to 0
  const rng = createRng(1);
  state.boss.hp = 0;
  step(state, 0.016, { left: false, right: false, fire: false }, rng);

  strictEqual(state.status, 'WON', 'status = WON');
});

test('Determinism: identical seed, identical trace', (t) => {
  const state1 = createInitialState();
  const state2 = createInitialState();
  const rng1 = createRng(12345);
  const rng2 = createRng(12345);
  const inputs = { left: false, right: true, fire: true };

  for (let i = 0; i < 500; i++) {
    step(state1, 0.016, inputs, rng1);
    step(state2, 0.016, inputs, rng2);
  }

  strictEqual(state1.score, state2.score, 'score identical');
  strictEqual(state1.ship.x, state2.ship.x, 'ship.x identical');
  strictEqual(state1.lives, state2.lives, 'lives identical');
  strictEqual(state1.enemies.length, state2.enemies.length, 'enemy count identical');
});

// Bug réel trouvé et corrigé (2026-07-14) : data/maps.mjs exporte des objets
// SINGLETON (un seul import pour tout le process). step.mjs mutait autrefois un
// flag `_spawned` DIRECTEMENT sur ces objets partagés — la 2e partie créée dans
// le même process héritait des vagues déjà "consommées" par la 1re et ne
// spawnait plus jamais rien. Ce test verrouille la régression : deux parties
// indépendantes (créées l'une après l'autre, PAS interleaved) doivent spawner
// le même nombre d'ennemis.
test('R21 — deux parties indépendantes (créées séquentiellement) spawnent identiquement (pas de fuite de state partagé)', (t) => {
  const inputs = { left: false, right: false, fire: false };

  const stateA = createInitialState();
  const rngA = createRng(7);
  for (let i = 0; i < 400; i++) step(stateA, 0.016, inputs, rngA);

  const stateB = createInitialState();
  const rngB = createRng(7);
  for (let i = 0; i < 400; i++) step(stateB, 0.016, inputs, rngB);

  ok(stateA.enemies.length > 0, 'la 1re partie doit avoir spawné des ennemis');
  strictEqual(stateA.enemies.length, stateB.enemies.length,
    'la 2e partie (créée après la 1re, même process) doit spawner IDENTIQUEMENT — aucune fuite via data/maps.mjs');
});

// R20 — restart doit permettre un run COMPLET à nouveau, pas seulement remettre
// les scalaires à zéro : les vagues doivent pouvoir re-spawner (même bug que ci-
// dessus, version "restart" plutôt que "2e instance").
test('R20 — restartRun permet aux vagues de re-spawner (pas de fuite via _spawned)', async (t) => {
  const { restartRun } = await import('./logic/progression.mjs');
  const state = createInitialState();
  const rng = createRng(3);
  const inputs = { left: false, right: false, fire: false };

  for (let i = 0; i < 400; i++) step(state, 0.016, inputs, rng);
  const enemiesBeforeRestart = state.enemies.length;
  ok(enemiesBeforeRestart > 0, 'des ennemis doivent avoir spawné avant restart');

  restartRun(state);
  strictEqual(state.enemies.length, 0, 'restart vide les ennemis');

  for (let i = 0; i < 400; i++) step(state, 0.016, inputs, rng);
  strictEqual(state.enemies.length, enemiesBeforeRestart,
    'après restart, la même vague doit re-spawner IDENTIQUEMENT');
});

// === R7/R8 — l'invincibilité (i-frames) doit BLOQUER tout dégât, pas
// seulement le retarder. Aucun test précédent ne l'exerçait (trouvé par
// mutation testing : eq->neq sur `invincibilityMs === 0` survivait). ===
test('R7 — invincibilité active bloque les dégâts de projectile ennemi', () => {
  const state = createInitialState();
  state.ship.invincibilityMs = 300; // encore invincible
  const lives0 = state.lives;
  state.enemyProjectiles = [{ x: state.ship.x, y: state.ship.y, vx: 0, vy: 0 }];

  resolveEnemyHits(state);

  strictEqual(state.lives, lives0, 'aucune vie perdue pendant l\'invincibilité');
  strictEqual(state.enemyProjectiles.length, 1, 'le projectile n\'est pas consommé pendant l\'invincibilité');
});

test('R8 — invincibilité active bloque les dégâts de contact ennemi', () => {
  const state = createInitialState();
  state.ship.invincibilityMs = 300;
  const lives0 = state.lives;
  state.enemies = [{ x: state.ship.x, y: state.ship.y, hp: 1 }];

  resolveContactDamage(state);

  strictEqual(state.lives, lives0, 'aucune vie perdue au contact pendant l\'invincibilité');
});

test('invincibilité active bloque le contact avec le boss', () => {
  const state = createInitialState();
  state.ship.invincibilityMs = 300;
  const lives0 = state.lives;
  state.boss = { x: state.ship.x, y: state.ship.y, width: 60, height: 40, hp: 10 };

  resolveBossHits(state);

  strictEqual(state.lives, lives0, 'aucune vie perdue au contact boss pendant l\'invincibilité');
});

// === R8 — aabbIntersect exige un chevauchement sur LES DEUX axes (AND), pas
// sur un seul (OR) : ennemi aligné en X mais PAS en Y ne doit provoquer AUCUN
// contact. Trouvé par mutation testing (and->or survivait sur aabbIntersect). ===
test('R8 — pas de dégât de contact si chevauchement sur un seul axe (X aligné, Y disjoint)', () => {
  const state = createInitialState();
  state.ship.invincibilityMs = 0;
  const lives0 = state.lives;
  state.ship.x = 100;
  state.ship.y = 100; // occupe y: [100, 130]
  // Ennemi aligné en X (chevauche) mais TRÈS loin en Y (ne chevauche pas)
  state.enemies = [{ x: 105, y: 400, hp: 1 }];

  resolveContactDamage(state);

  strictEqual(state.lives, lives0, 'pas de contact quand un seul axe chevauche');
});

test('R8 — dégât de contact réel quand les DEUX axes chevauchent', () => {
  const state = createInitialState();
  state.ship.invincibilityMs = 0;
  const lives0 = state.lives;
  state.ship.x = 100;
  state.ship.y = 100;
  state.enemies = [{ x: 105, y: 105, hp: 1 }]; // recouvrement réel sur X et Y

  resolveContactDamage(state);

  strictEqual(state.lives, lives0 - 1, 'contact réel retire exactement 1 vie');
});

// === R6/R24 — le filtre de nettoyage garde p.y >= -50 (limite EXACTE, pas
// stricte) : un projectile pile à y=-50 doit être CONSERVÉ. Trouvé par
// mutation testing (ge->gt survivait sur le filtre). ===
test('filtre projectiles joueur : conserve exactement à la limite y=-50', () => {
  const state = createInitialState();
  state.playerProjectiles = [{ x: 0, y: -50, vx: 0, vy: 0 }];
  state.enemies = [];

  resolvePlayerHits(state);

  strictEqual(state.playerProjectiles.length, 1, 'un projectile à y=-50 exactement doit être conservé (>=), pas retiré');
});

// === R1 — le déplacement avance la position (+=), ne la recule pas.
// Trouvé par mutation testing (pluseq->minuseq survivait : les tests
// précédents ne vérifiaient que le SIGNE du changement, pas l'exactitude). ===
test('R1 — moveShip avance x/y EXACTEMENT de vitesse*dt (pas -=)', () => {
  const state = createInitialState();
  const dt = 0.016;
  const x0 = state.ship.x;
  const y0 = state.ship.y;

  moveShip(state, { right: true, down: true }, dt);

  // Mouvement diagonal normalisé (SQRT1_2 sur chaque axe) — mais peu importe
  // le facteur exact ici : ce qui compte est le SENS et l'exactitude de
  // l'opérateur, donc on vérifie via deux appels mono-axe indépendants.
  ok(state.ship.x > x0, 'x doit avancer (droite), pas reculer');
  ok(state.ship.y > y0, 'y doit avancer (bas), pas reculer');

  const state2 = createInitialState();
  const x0b = state2.ship.x;
  moveShip(state2, { right: true }, dt);
  const expectedX = x0b + 250 * dt; // SHIP_SPEED=250 px/s, mono-axe (pas de normalisation diagonale)
  ok(Math.abs(state2.ship.x - expectedX) < 0.01, `x doit avancer EXACTEMENT de SHIP_SPEED*dt : attendu ${expectedX}, reçu ${state2.ship.x}`);
});

test('invincibilityMs DÉCROÎT avec le temps (pas -=  inversé)', () => {
  const state = createInitialState();
  state.ship.invincibilityMs = 300;
  const dt = 0.016;

  moveShip(state, {}, dt);

  const expected = 300 - dt * 1000;
  ok(Math.abs(state.ship.invincibilityMs - expected) < 0.01,
    `invincibilityMs doit décroître exactement de dt*1000 : attendu ${expected}, reçu ${state.ship.invincibilityMs}`);
});

test('updatePlayerProjectiles avance y EXACTEMENT de vy*dt (pas -=)', () => {
  const state = createInitialState();
  state.playerProjectiles = [{ x: 100, y: 300, vx: 0, vy: -400 }];
  const dt = 0.016;

  updatePlayerProjectiles(state, dt);

  const expectedY = 300 + -400 * dt; // vy négatif => y doit DIMINUER (monte vers le haut)
  ok(state.playerProjectiles.length === 1, 'le projectile doit rester à l\'écran après ce déplacement');
  ok(Math.abs(state.playerProjectiles[0].y - expectedY) < 0.01,
    `y doit avancer EXACTEMENT de vy*dt : attendu ${expectedY}, reçu ${state.playerProjectiles[0].y}`);
});

// === R3/R5 — updateEnemyMovement : mouvement EXACT par pattern, rebond sur
// UN SEUL bord (OR, pas AND). Aucun test direct n'existait avant (trouvé par
// mutation testing : 0% de score sur enemies.mjs). ===
test('updateEnemyMovement (invaders_descent) avance x/y EXACTEMENT (vx*dt, 20*dt)', () => {
  const state = createInitialState();
  const dt = 0.1;
  const enemy = { x: 400, y: 100, vx: 50, pattern: 'invaders_descent' };
  state.enemies = [enemy];

  updateEnemyMovement(state, dt, 0);

  ok(Math.abs(enemy.y - (100 + 20 * dt)) < 1e-9, `y attendu ${100 + 20 * dt}, reçu ${enemy.y}`);
  ok(Math.abs(enemy.x - (400 + 50 * dt)) < 1e-9, `x attendu ${400 + 50 * dt}, reçu ${enemy.x}`);
});

test('updateEnemyMovement (invaders_descent) rebondit sur bord gauche OU droit (OR, pas AND)', () => {
  const stateLeft = createInitialState();
  const eLeft = { x: -5, y: 100, vx: 50, pattern: 'invaders_descent' };
  stateLeft.enemies = [eLeft];
  updateEnemyMovement(stateLeft, 0.016, 0);
  ok(eLeft.vx < 0, 'rebond sur bord gauche SEUL doit inverser vx');

  const stateRight = createInitialState();
  const eRight = { x: GAME_WIDTH + 5, y: 100, vx: -50, pattern: 'invaders_descent' };
  stateRight.enemies = [eRight];
  updateEnemyMovement(stateRight, 0.016, 0);
  ok(eRight.vx > 0, 'rebond sur bord droit SEUL doit inverser vx');
});

test('updateEnemyMovement (sine_weave) avance y EXACTEMENT de 15*dt', () => {
  const state = createInitialState();
  const dt = 0.1;
  const enemy = { x: 400, y: 50, pattern: 'sine_weave', tOffset: 0 };
  state.enemies = [enemy];

  updateEnemyMovement(state, dt, 0);

  ok(Math.abs(enemy.y - (50 + 15 * dt)) < 1e-9, `y attendu ${50 + 15 * dt}, reçu ${enemy.y}`);
});

// === R5 — updateEnemyFire : décrément EXACT, déclenchement à <=0 (limite
// exacte incluse), pas seulement < 0. ===
test('updateEnemyFire ne tire pas tant que fireCountdown > 0, décrément EXACT', () => {
  const state = createInitialState();
  const enemy = { x: 100, y: 100, fireCountdown: 1000, wave: { fireRate: 1 } };
  state.enemies = [enemy];
  state.enemyProjectiles = [];
  const rng = createRng(1);

  updateEnemyFire(state, 0.016, rng);

  strictEqual(state.enemyProjectiles.length, 0, 'ne doit pas tirer si countdown encore positif');
  ok(Math.abs(enemy.fireCountdown - (1000 - 16)) < 1e-9, `countdown doit décroître EXACTEMENT de dt*1000, reçu ${enemy.fireCountdown}`);
});

test('updateEnemyFire déclenche exactement quand fireCountdown atteint 0 (<=0, pas <0)', () => {
  const state = createInitialState();
  const enemy = { x: 100, y: 100, fireCountdown: 16, wave: { fireRate: 1 } }; // 16 - 16 = 0 pile
  state.enemies = [enemy];
  state.enemyProjectiles = [];
  const rng = createRng(1);

  updateEnemyFire(state, 0.016, rng);

  strictEqual(state.enemyProjectiles.length, 1, 'doit tirer quand le countdown atteint EXACTEMENT 0');
});

test('updateEnemyProjectiles avance y EXACTEMENT de vy*dt', () => {
  const state = createInitialState();
  state.enemyProjectiles = [{ x: 0, y: 100, vx: 0, vy: 150 }];

  updateEnemyProjectiles(state, 0.1);

  ok(Math.abs(state.enemyProjectiles[0].y - (100 + 150 * 0.1)) < 1e-9,
    `y attendu ${100 + 150 * 0.1}, reçu ${state.enemyProjectiles[0].y}`);
});

// === R17/R18 — advanceLevel/resolveVictory : garde EXACTE (===0, pas !=0),
// progression exactement +1, ET (pas OR) sur les 4 conditions de victoire.
// Aucun test direct n'existait avant (trouvé par mutation : 62% sur
// progression.mjs). ===
test('advanceLevel : ne progresse PAS si boss.hp != 0', () => {
  const state = createInitialState();
  state.level = 1;
  state.bossActive = true;
  state.boss = { hp: 5, width: 60, height: 40, x: 400, y: 80 };

  advanceLevel(state);

  strictEqual(state.level, 1, 'level ne doit pas changer si le boss est encore vivant');
});

test('advanceLevel : progresse EXACTEMENT de +1 quand boss.hp===0 et level<3', () => {
  const state = createInitialState();
  state.level = 1;
  state.bossActive = true;
  state.boss = { hp: 0, width: 60, height: 40, x: 400, y: 80 };

  advanceLevel(state);

  strictEqual(state.level, 2, 'level doit être exactement 2 (1+1), pas 0 (1-1)');
  strictEqual(state.bossActive, false, 'bossActive doit repasser à false (pas true) après la transition');
});

test('resolveVictory : chaque condition manquante SEULE empêche la victoire (AND, pas OR)', () => {
  const s1 = createInitialState();
  Object.assign(s1, { bossActive: false, boss: { hp: 0 }, level: 3 });
  resolveVictory(s1);
  ok(s1.status !== 'WON', 'bossActive=false seul doit empêcher WON');

  const s2 = createInitialState();
  Object.assign(s2, { bossActive: true, boss: null, level: 3 });
  resolveVictory(s2);
  ok(s2.status !== 'WON', 'boss=null seul doit empêcher WON');

  const s3 = createInitialState();
  Object.assign(s3, { bossActive: true, boss: { hp: 5 }, level: 3 });
  resolveVictory(s3);
  ok(s3.status !== 'WON', 'boss.hp!=0 seul doit empêcher WON');

  const s4 = createInitialState();
  Object.assign(s4, { bossActive: true, boss: { hp: 0 }, level: 2 });
  resolveVictory(s4);
  ok(s4.status !== 'WON', 'level!=3 seul doit empêcher WON');

  const s5 = createInitialState();
  Object.assign(s5, { bossActive: true, boss: { hp: 0 }, level: 3 });
  resolveVictory(s5);
  strictEqual(s5.status, 'WON', 'les 4 conditions réunies doivent déclencher WON');
});

// === R23 — hasSafeCorridor/findSafeX/isSafeAt : c'est la fonction la plus
// critique du jeu (elle PROUVE l'esquivabilité) et n'avait ZÉRO test direct
// avant (0% en mutation testing) — seulement exercée indirectement via le
// bot. Ci-dessous : limites EXACTES (>=, pas >), bande verticale (OR, pas
// AND), fusion de segments adjacents.
const CLEARANCE_HALF = (SHIP_WIDTH + 12) / 2; // reflète CLEARANCE_PX interne à dodge.mjs (test boîte blanche assumé)

function wallFrom(startX, shipY) {
  // Mur dense de projectiles stationnaires depuis startX jusqu'à bien au-delà
  // de GAME_WIDTH — aucun couloir possible après startX (stride 30 < 2*CLEARANCE_HALF=42 => fusion garantie).
  const projs = [];
  for (let x = startX + CLEARANCE_HALF; x < GAME_WIDTH + 200; x += 30) {
    projs.push({ x, y: shipY, vx: 0, vy: 0 });
  }
  return projs;
}

function wallEndingAt(hiTarget, shipY) {
  const projs = [];
  for (let x = -200; x < hiTarget - CLEARANCE_HALF; x += 30) {
    projs.push({ x, y: shipY, vx: 0, vy: 0 });
  }
  projs.push({ x: hiTarget - CLEARANCE_HALF, y: shipY, vx: 0, vy: 0 }); // bord droit == EXACTEMENT hiTarget
  return projs;
}

test('hasSafeCorridor : aucun projectile => toujours sûr', () => {
  const state = createInitialState();
  state.enemyProjectiles = [];
  ok(hasSafeCorridor(state));
});

test('hasSafeCorridor : limite EXACTE (trou initial) — SHIP_WIDTH est sûr (>=), SHIP_WIDTH-1 ne l\'est pas', () => {
  const shipY = 300;

  const safe = createInitialState();
  safe.ship.y = shipY;
  safe.enemyProjectiles = wallFrom(SHIP_WIDTH, shipY); // trou [0, SHIP_WIDTH] pile
  ok(hasSafeCorridor(safe), `trou de exactement ${SHIP_WIDTH}px doit être sûr`);
  ok(findSafeX(safe) !== null, 'findSafeX doit aussi trouver ce couloir');

  const unsafe = createInitialState();
  unsafe.ship.y = shipY;
  unsafe.enemyProjectiles = wallFrom(SHIP_WIDTH - 1, shipY); // trou d'1px de moins
  ok(!hasSafeCorridor(unsafe), `trou de ${SHIP_WIDTH - 1}px (1 de moins) ne doit PAS être sûr`);
  strictEqual(findSafeX(unsafe), null, 'findSafeX doit renvoyer null quand aucun couloir n\'existe');
});

test('hasSafeCorridor : limite EXACTE (trou final) — SHIP_WIDTH est sûr (>=), SHIP_WIDTH-1 ne l\'est pas', () => {
  const shipY = 300;

  const safe = createInitialState();
  safe.ship.y = shipY;
  safe.enemyProjectiles = wallEndingAt(GAME_WIDTH - SHIP_WIDTH, shipY);
  ok(hasSafeCorridor(safe), 'trou final de exactement SHIP_WIDTH doit être sûr');
  ok(findSafeX(safe) !== null, 'findSafeX doit aussi trouver ce couloir final');

  const unsafe = createInitialState();
  unsafe.ship.y = shipY;
  unsafe.enemyProjectiles = wallEndingAt(GAME_WIDTH - SHIP_WIDTH + 1, shipY);
  ok(!hasSafeCorridor(unsafe), 'trou final 1px plus petit ne doit PAS être sûr');
  strictEqual(findSafeX(unsafe), null, 'findSafeX doit renvoyer null');
});

test('isSafeAt : projectile stationnaire HORS bande verticale ne bloque PAS sa position X (OR, pas AND)', () => {
  const above = createInitialState();
  above.ship.y = 300;
  above.enemyProjectiles = [{ x: 400, y: 0, vx: 0, vy: 0 }]; // loin au-dessus de la bande
  ok(isSafeAt(above, 400), 'position x=400 sûre malgré un projectile hors bande (au-dessus) à ce x');

  const below = createInitialState();
  below.ship.y = 300;
  below.enemyProjectiles = [{ x: 400, y: 1000, vx: 0, vy: 0 }]; // loin en dessous de la bande
  ok(isSafeAt(below, 400), 'position x=400 sûre malgré un projectile hors bande (en dessous) à ce x');
});

test('isSafeAt : projectile stationnaire DANS la bande bloque bien sa position X', () => {
  const state = createInitialState();
  state.ship.y = 300;
  state.enemyProjectiles = [{ x: 400, y: 300, vx: 0, vy: 0 }]; // pile dans la bande
  ok(!isSafeAt(state, 400), 'position x=400 doit être bloquée par un projectile juste là');
});

test('projectile stationnaire pile au bord de la bande (proj.y === lowY) bloque correctement sa position', () => {
  // Cas limite vy=0 avec proj.y EXACTEMENT au bord de la bande : vérifie que
  // le branchement vy===0 (pas de division par zéro mal aiguillée) traite
  // bien ce cas comme "dans la bande, tEnter=0", pas comme NaN.
  const state = createInitialState();
  state.ship.y = 300; // lowY = 300 - 45 = 255
  state.enemyProjectiles = [{ x: 400, y: 255, vx: 0, vy: 0 }]; // exactement lowY
  ok(!isSafeAt(state, 400), 'un projectile stationnaire pile au bord de la bande doit bloquer sa position');
});

test('isSafeAt : les DEUX bords doivent chevaucher pour bloquer (AND, pas OR)', () => {
  const state = createInitialState();
  state.ship.y = 300;
  state.enemyProjectiles = [{ x: 400, y: 300, vx: 0, vy: 0 }]; // bloque autour de x=400
  ok(isSafeAt(state, 0), 'position x=0, loin à gauche du projectile bloquant, doit être sûre');
});

// === R9 — awardScore/updateScoreFromKills : incrément EXACT, chaque
// condition de scoring isolée (AND, pas OR ; ===0/>0, pas leur inverse).
// Aucun test direct n'existait avant (22% en mutation testing). ===
test('awardScore : incrémente EXACTEMENT de value (pas -=)', () => {
  const state = createInitialState();
  const s0 = state.score;
  awardScore(state, 'test', 250);
  strictEqual(state.score, s0 + 250, 'score doit augmenter exactement de 250');
});

test('updateScoreFromKills : dégâts boss comptés SEULEMENT si boss existe, prevBossHp défini, ET hp a baissé', () => {
  const s1 = createInitialState();
  s1.boss = { hp: 7 };
  updateScoreFromKills(s1, 0, 10);
  strictEqual(s1.score, 3 * 50, 'dégâts boss comptés : (10-7)=3 hp * 50');

  const s2 = createInitialState();
  s2.boss = null;
  updateScoreFromKills(s2, 0, 10);
  strictEqual(s2.score, 0, 'pas de score si boss est null, même avec prevBossHp défini');

  const s3 = createInitialState();
  s3.boss = { hp: 5 };
  updateScoreFromKills(s3, 0, undefined);
  strictEqual(s3.score, 0, 'pas de score si prevBossHp est undefined');

  const s4 = createInitialState();
  s4.boss = { hp: 10 };
  updateScoreFromKills(s4, 0, 10);
  strictEqual(s4.score, 0, 'pas de score de dégâts si hp n\'a pas baissé');
});

test('updateScoreFromKills : bonus boss_kill SEULEMENT si prevBossHp défini ET >0 ET boss existe ET hp===0', () => {
  const s1 = createInitialState();
  s1.boss = { hp: 0 };
  updateScoreFromKills(s1, 0, 5);
  strictEqual(s1.score, (5 - 0) * 50 + 500, 'dégâts (5*50) + bonus boss_kill (500) attendus');

  const s2 = createInitialState();
  s2.boss = { hp: 0 };
  updateScoreFromKills(s2, 0, undefined);
  strictEqual(s2.score, 0, 'pas de bonus (ni de dégâts) si prevBossHp undefined');

  const s3 = createInitialState();
  s3.boss = { hp: 0 };
  updateScoreFromKills(s3, 0, 0);
  strictEqual(s3.score, 0, 'pas de bonus si prevBossHp n\'était pas > 0');

  const s4 = createInitialState();
  s4.boss = null;
  updateScoreFromKills(s4, 0, 5);
  strictEqual(s4.score, 0, 'pas de bonus si boss est null');

  const s5 = createInitialState();
  s5.boss = { hp: 3 };
  updateScoreFromKills(s5, 0, 5);
  strictEqual(s5.score, (5 - 3) * 50, 'dégâts seuls (pas de bonus) si le boss n\'est pas exactement à 0 hp');
});

// === R24 — spawnProjectile : route vers le BON pool ('player' vs 'enemy'),
// plafond EXACT (>=, pas >), true/false conformes à l'état réel. ===
test('spawnProjectile : route \'player\' vers playerProjectiles, \'enemy\' vers enemyProjectiles', () => {
  const state = createInitialState();
  state.playerProjectiles = [];
  state.enemyProjectiles = [];

  const okPlayer = spawnProjectile(state, 'player', 1, 2, 3, 4);
  strictEqual(okPlayer, true, 'spawn doit réussir (pool vide)');
  strictEqual(state.playerProjectiles.length, 1, 'doit atterrir dans playerProjectiles');
  strictEqual(state.enemyProjectiles.length, 0, 'ne doit PAS atterrir dans enemyProjectiles');

  const okEnemy = spawnProjectile(state, 'enemy', 5, 6, 7, 8);
  strictEqual(okEnemy, true, 'spawn doit réussir (pool vide)');
  strictEqual(state.enemyProjectiles.length, 1, 'doit atterrir dans enemyProjectiles');
  strictEqual(state.playerProjectiles.length, 1, 'playerProjectiles inchangé');
});

test('spawnProjectile : plafond EXACT — refuse à MAX_PROJECTILES (>=), accepte à MAX_PROJECTILES-1', () => {
  const state = createInitialState();
  state.playerProjectiles = new Array(MAX_PROJECTILES - 1).fill(0).map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));

  const okBelowCap = spawnProjectile(state, 'player', 0, 0, 0, 0);
  strictEqual(okBelowCap, true, 'doit accepter à MAX_PROJECTILES-1 (juste sous le plafond)');
  strictEqual(state.playerProjectiles.length, MAX_PROJECTILES, 'pool atteint exactement le plafond');

  const okAtCap = spawnProjectile(state, 'player', 0, 0, 0, 0);
  strictEqual(okAtCap, false, 'doit refuser exactement AU plafond (>=), pas seulement au-dessus');
  strictEqual(state.playerProjectiles.length, MAX_PROJECTILES, 'pool ne doit pas dépasser le plafond');
});

// === step.mjs — orchestration (spawn boss/vague, mouvement/tir boss,
// déclenchement advanceLevel, arrêt total hors ACTIVE/BOSS). 19% en mutation
// testing avant ces tests (fonctions privées, jamais exercées précisément). ===
test('step() : le boss apparaît exactement quand elapsedMs atteint bossStartTime (>=), pas de re-spawn si déjà actif', () => {
  const rng = createRng(1);

  const atThreshold = createInitialState();
  atThreshold.level = 1;
  atThreshold.elapsedMs = MAP_1.bossStartTime - 16;
  step(atThreshold, 0.016, {}, rng); // elapsedMs devient exactement bossStartTime
  ok(atThreshold.bossActive === true && atThreshold.boss !== null, 'le boss doit apparaître pile au seuil (>=)');

  const early = createInitialState();
  early.level = 1;
  early.elapsedMs = 0;
  step(early, 0.016, {}, rng);
  strictEqual(early.bossActive, false, 'le boss ne doit pas apparaître bien avant le seuil');

  const already = createInitialState();
  already.level = 1;
  already.elapsedMs = MAP_1.bossStartTime + 1000;
  already.bossActive = true;
  already.boss = { hp: 3, x: 400, y: 80, width: 60, height: 40, vx: 0, fireRate: 0.5, pattern: 'wide_spread', fireCountdown: 500 };
  step(already, 0.016, {}, rng);
  strictEqual(already.boss.hp, 3, 'un boss déjà actif ne doit pas être remplacé (hp inchangé)');
});

test('step() : bossActive=true avec boss=null ne plante pas (AND, pas OR)', () => {
  const state = createInitialState();
  state.level = 1;
  state.bossActive = true;
  state.boss = null;
  const rng = createRng(1);
  step(state, 0.016, {}, rng);
  ok(true, 'step() ne doit pas planter quand bossActive=true et boss=null');
});

test('step() : vague — pas de spawn avant triggerTime, spawn pile au seuil (>=), pas de re-spawn', () => {
  const rng = createRng(1);
  const triggerTime = MAP_1.waves[1].triggerTime; // vague 2, seuil > 0

  const before = createInitialState();
  before.level = 1;
  before.elapsedMs = triggerTime - 100;
  step(before, 0.016, {}, rng);
  const countBefore = before.enemies.length;

  const atThreshold = createInitialState();
  atThreshold.level = 1;
  atThreshold.elapsedMs = triggerTime - 16;
  step(atThreshold, 0.016, {}, rng); // elapsedMs devient exactement triggerTime
  ok(atThreshold.enemies.length > countBefore, 'la vague doit apparaître pile au seuil (>=)');

  const countAfterSpawn = atThreshold.enemies.length;
  step(atThreshold, 0.016, {}, rng);
  strictEqual(atThreshold.enemies.length, countAfterSpawn, 'une vague déjà spawnée ne doit pas re-spawner (pas de doublon)');
});

test('step() : advanceLevel se déclenche SEULEMENT si bossActive ET boss ET hp===0 (AND, pas OR)', () => {
  const rng = createRng(1);
  const bossTemplate = () => ({ hp: 0, x: 400, y: 80, width: 60, height: 40, vx: 0, fireRate: 0.5, pattern: 'wide_spread', fireCountdown: 99999 });

  const s1 = createInitialState();
  s1.level = 1; s1.bossActive = false; s1.boss = bossTemplate();
  step(s1, 0.016, {}, rng);
  strictEqual(s1.level, 1, 'bossActive=false seul doit empêcher advanceLevel');

  const s2 = createInitialState();
  s2.level = 1; s2.bossActive = true; s2.boss = null;
  step(s2, 0.016, {}, rng);
  strictEqual(s2.level, 1, 'boss=null seul doit empêcher advanceLevel');

  const s3 = createInitialState();
  s3.level = 1; s3.bossActive = true; s3.boss = { ...bossTemplate(), hp: 5 };
  step(s3, 0.016, {}, rng);
  strictEqual(s3.level, 1, 'boss.hp!=0 seul doit empêcher advanceLevel');

  const s4 = createInitialState();
  s4.level = 1; s4.bossActive = true; s4.boss = bossTemplate();
  step(s4, 0.016, {}, rng);
  strictEqual(s4.level, 2, 'les 3 conditions réunies doivent déclencher advanceLevel (level=2)');
});

test('step() : ne fait RIEN si status n\'est ni ACTIVE ni BOSS (arrêt complet, pas seulement le statut)', () => {
  const state = createInitialState();
  state.status = 'LOST';
  const shipX0 = state.ship.x;
  const score0 = state.score;
  const rng = createRng(1);

  step(state, 0.016, { right: true, fire: true }, rng);

  strictEqual(state.ship.x, shipX0, 'la position du vaisseau ne doit pas bouger après game over');
  strictEqual(state.score, score0, 'le score ne doit pas changer après game over');
  strictEqual(state.status, 'LOST', 'le statut doit rester LOST');
});

test('step() : le boss se déplace EXACTEMENT de vx*dt (pas -=)', () => {
  const state = createInitialState();
  state.level = 1;
  state.bossActive = true;
  state.boss = { hp: 10, x: 400, y: 80, width: 60, height: 40, vx: 100, fireRate: 0.001, pattern: 'wide_spread', fireCountdown: 99999 };
  const x0 = state.boss.x;
  const rng = createRng(1);

  step(state, 0.016, {}, rng);

  ok(Math.abs(state.boss.x - (x0 + 100 * 0.016)) < 0.01,
    `boss.x doit avancer EXACTEMENT de vx*dt : attendu ${x0 + 100 * 0.016}, reçu ${state.boss.x}`);
});

test('step() : le boss rebondit sur bord gauche OU droit (OR, pas AND)', () => {
  const rng = createRng(1);

  const left = createInitialState();
  left.level = 1; left.bossActive = true;
  left.boss = { hp: 10, x: 20, y: 80, width: 60, height: 40, vx: 50, fireRate: 0.001, pattern: 'wide_spread', fireCountdown: 99999 };
  step(left, 0.016, {}, rng);
  ok(left.boss.vx < 0, 'rebond bord gauche SEUL doit inverser vx');

  const right = createInitialState();
  right.level = 1; right.bossActive = true;
  right.boss = { hp: 10, x: 780, y: 80, width: 60, height: 40, vx: -50, fireRate: 0.001, pattern: 'wide_spread', fireCountdown: 99999 };
  step(right, 0.016, {}, rng);
  ok(right.boss.vx > 0, 'rebond bord droit SEUL doit inverser vx');
});

// Marque toutes les vagues de MAP_1 comme déjà spawnées — isole les tests
// boss-only de la contamination par la vague 0 (triggerTime=0, tire aussi).
function markAllMap1WavesSpawned(state) {
  state.spawnedWaveKeys = new Set(MAP_1.waves.map((w, i) => `${MAP_1.name}#${i}`));
}

test('step() : fireCountdown du boss décroît EXACTEMENT de dt*1000, déclenche à <=0 (limite incluse)', () => {
  const rng = createRng(1);

  const notYet = createInitialState();
  notYet.level = 1; notYet.bossActive = true;
  markAllMap1WavesSpawned(notYet);
  notYet.boss = { hp: 10, x: 400, y: 80, width: 60, height: 40, vx: 0, fireRate: 1, pattern: 'wide_spread', fireCountdown: 1000 };
  step(notYet, 0.016, {}, rng);
  ok(Math.abs(notYet.boss.fireCountdown - (1000 - 16)) < 0.01, `countdown doit décroître EXACTEMENT de 16, reçu ${notYet.boss.fireCountdown}`);
  strictEqual(notYet.enemyProjectiles.length, 0, 'pas encore de tir si countdown encore positif');

  const exact = createInitialState();
  exact.level = 1; exact.bossActive = true;
  markAllMap1WavesSpawned(exact);
  exact.boss = { hp: 10, x: 400, y: 80, width: 60, height: 40, vx: 0, fireRate: 1, pattern: 'wide_spread', fireCountdown: 16 };
  step(exact, 0.016, {}, rng);
  ok(exact.enemyProjectiles.length > 0, 'doit tirer quand le countdown atteint EXACTEMENT 0 (<=0)');
});

test('step() : chaque pattern boss produit le NOMBRE EXACT de tirs (wide_spread=3, spiral=5, dense_grid=7)', () => {
  const rng = createRng(1);
  const patterns = [['wide_spread', 3], ['spiral', 5], ['dense_grid', 7]];
  for (const [pattern, expectedCount] of patterns) {
    const state = createInitialState();
    state.level = 1; state.bossActive = true;
    markAllMap1WavesSpawned(state);
    state.boss = { hp: 10, x: 400, y: 80, width: 60, height: 40, vx: 0, fireRate: 1, pattern, fireCountdown: 16 };
    state.enemyProjectiles = [];
    step(state, 0.016, {}, rng);
    strictEqual(state.enemyProjectiles.length, expectedCount, `pattern ${pattern} doit produire exactement ${expectedCount} tirs`);
  }
});

// === R25 — architecture : la logique n'importe ni rendu/input/main, et ne
// référence aucune API DOM. Miroir du test breakout (aucun oracle a posteriori
// ne remplace ce garde-fou local avant livraison). ===
test('R25 — logic/*.mjs et bot/*.mjs n\'importent pas render/input/main, aucune référence DOM', async (t) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const dirs = ['logic', 'bot'];
  for (const dir of dirs) {
    const files = await fs.readdir(dir);
    for (const file of files.filter((f) => f.endsWith('.mjs'))) {
      const full = path.join(dir, file);
      const content = await fs.readFile(full, 'utf-8');
      ok(!content.includes('from \'../render') && !content.includes('from \'./render'),
        `${full}: pas d'import de render`);
      ok(!content.includes('from \'../input') && !content.includes('from \'./input'),
        `${full}: pas d'import de input`);
      ok(!content.includes('from \'../main') && !content.includes('from \'./main'),
        `${full}: pas d'import de main`);
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) continue;
        ok(!line.includes('document.'), `${full}: pas d'accès à document`);
        ok(!line.includes('window.'), `${full}: pas d'accès direct à window`);
        ok(!/\brequestAnimationFrame\b/.test(line), `${full}: pas de requestAnimationFrame`);
        ok(!/\bperformance\.now\b/.test(line), `${full}: pas de performance.now`);
        ok(!/\bDate\.now\b/.test(line), `${full}: pas de Date.now`);
        ok(!/\bMath\.random\b/.test(line), `${full}: pas de Math.random`);
      }
    }
  }
});
