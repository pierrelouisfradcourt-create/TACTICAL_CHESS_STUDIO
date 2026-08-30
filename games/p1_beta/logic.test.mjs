#!/usr/bin/env node
// logic.test.mjs — tests de mécanique (engine.mjs) avec mutations.
// Jamais de >= tautologique sur un delta d'action. Delta STRICT, invariants
// vérifiés à l'égalité exacte partout où la mécanique le permet.

import { test } from 'node:test';
import assert from 'node:assert';
import {
  GameState, CORE_LIGHT_PER_STOKE, EMITTER_BASE_COST, EMITTER_GROWTH,
  EMITTER_RATE, ASCENSION_BONUS_PER_GLOW, TERMINAL_THRESHOLD, MILESTONE_STEP,
} from './engine.mjs';

test('GameState initialization', () => {
  const state = new GameState(1);
  assert.strictEqual(state.light, 0);
  assert.strictEqual(state.emitterCount, 0);
  assert.strictEqual(state.ascensionGlow, 0);
  assert.strictEqual(state.terminal, false);
  assert.strictEqual(state.questMilestonesReached, 0);
  assert.strictEqual(state.pendingStokeFlash, false, 'aucun flash en attente à la construction');
  assert.strictEqual(state.pendingMilestoneFlash, false, 'aucun jalon en attente à la construction');
});

// R4 — récompense stricte +1 lumiere par attisage (égalité stricte, jamais >=).
test('stoke(): N appels sans achat -> light === N exactement', () => {
  const state = new GameState(1);
  for (let i = 1; i <= 20; i++) {
    state.stoke();
    assert.strictEqual(state.light, i, `après ${i} attisages, light doit valoir exactement ${i}`);
  }
});

test('stoke(): lightPerStoke initial vaut exactement CORE_LIGHT_PER_STOKE', () => {
  const state = new GameState(1);
  assert.strictEqual(state.lightPerStoke, CORE_LIGHT_PER_STOKE);
});

test('stoke(): retourne true et arme pendingStokeFlash en cas de succès', () => {
  const state = new GameState(1);
  assert.strictEqual(state.pendingStokeFlash, false);
  const result = state.stoke();
  assert.strictEqual(result, true, 'stoke() doit retourner true sur un succès');
  assert.strictEqual(state.pendingStokeFlash, true, 'le flash d\'attisage doit être armé');
});

test('emitterCost: formule cost(n) = base * growth^n, arrondie', () => {
  const state = new GameState(1);
  assert.strictEqual(state.emitterCost, Math.round(EMITTER_BASE_COST * Math.pow(EMITTER_GROWTH, 0)));
  state.emitterCount = 3;
  assert.strictEqual(state.emitterCost, Math.round(EMITTER_BASE_COST * Math.pow(EMITTER_GROWTH, 3)));
});

// R6 — achat d'émetteur : delta STRICT sur light et emitterCount.
test('buyEmitter(): refuse sous le coût, accepte au coût exact, delta STRICT', () => {
  const state = new GameState(1);
  const cost = state.emitterCost;
  state.light = cost - 1;
  assert.strictEqual(state.buyEmitter(), false, 'achat refusé strictement sous le coût');
  assert.strictEqual(state.emitterCount, 0, 'aucun changement sur refus');

  state.light = cost;
  const result = state.buyEmitter();
  assert.strictEqual(result, true, 'achat accepté exactement au coût');
  assert.strictEqual(state.light, 0, 'light décrémenté du coût EXACT');
  assert.strictEqual(state.emitterCount, 1, 'emitterCount incrémenté de exactement 1');
});

test('buyEmitter(): coût croît à chaque achat successif (jamais constant, jamais décroissant)', () => {
  const state = new GameState(1);
  const costs = [];
  for (let i = 0; i < 5; i++) {
    costs.push(state.emitterCost);
    state.light = state.emitterCost;
    state.buyEmitter();
  }
  for (let i = 1; i < costs.length; i++) {
    assert(costs[i] > costs[i - 1], `le coût doit croître strictement: ${costs[i - 1]} -> ${costs[i]}`);
  }
});

// R8 — production passive : delta STRICT = emitterCount*EMITTER_RATE par tick.
test('applyEmitters(): incrémente light de exactement emitterCount*EMITTER_RATE par appel', () => {
  const state = new GameState(1);
  state.emitterCount = 4;
  const before = state.light;
  state.applyEmitters();
  assert.strictEqual(state.light, before + 4 * EMITTER_RATE);
});

test('applyEmitters(): sans émetteur, ne change rien (delta STRICT = 0)', () => {
  const state = new GameState(1);
  assert.strictEqual(state.applyEmitters(), false);
  assert.strictEqual(state.light, 0);
});

test('applyEmitters(): retourne true en cas de succès (production réellement appliquée)', () => {
  const state = new GameState(1);
  state.emitterCount = 1;
  assert.strictEqual(state.applyEmitters(), true);
});

test('applyEmitters(): déterministe au rejeu (même état initial => même trajectoire)', () => {
  const a = new GameState(1); a.emitterCount = 3;
  const b = new GameState(1); b.emitterCount = 3;
  for (let i = 0; i < 50; i++) { a.applyEmitters(); b.applyEmitters(); }
  assert.strictEqual(a.light, b.light);
});

// Paliers intermédiaires (gb_quest_milestone) — delta STRICT, même en cas de
// saut qui franchit plusieurs paliers d'un coup.
test('paliers: questMilestonesReached incrémente de exactement 1 par MILESTONE_STEP franchi', () => {
  const state = new GameState(1);
  state.light = MILESTONE_STEP - 1;
  state.stoke(); // franchit exactement 1 palier
  assert.strictEqual(state.questMilestonesReached, 1);

  state.light = MILESTONE_STEP * 3.5; // saut qui franchit 2 paliers d'un coup
  state._checkMilestones();
  assert.strictEqual(state.questMilestonesReached, 3, 'un saut qui franchit N paliers doit tous les compter, pas 1 seul');
});

test('_checkMilestones(): arme pendingMilestoneFlash à true au franchissement d\'un palier', () => {
  const state = new GameState(1);
  assert.strictEqual(state.pendingMilestoneFlash, false);
  state.light = MILESTONE_STEP;
  state._checkMilestones();
  assert.strictEqual(state.pendingMilestoneFlash, true);
});

// R11 — règle terminale déterministe : light >= threshold => terminal, jamais avant.
test('terminal: bascule EXACTEMENT au franchissement du seuil, jamais avant', () => {
  const state = new GameState(1);
  state.light = TERMINAL_THRESHOLD - 1;
  state._checkTerminal();
  assert.strictEqual(state.terminal, false, 'sous le seuil : pas encore terminal');

  state.light = TERMINAL_THRESHOLD;
  state._checkTerminal();
  assert.strictEqual(state.terminal, true, 'au seuil exact : terminal');
});

test('terminal: neutralise stoke/buyEmitter/applyEmitters (aucun effet)', () => {
  const state = new GameState(1);
  state.light = TERMINAL_THRESHOLD;
  state.emitterCount = 2;
  state._checkTerminal();
  assert.strictEqual(state.terminal, true);

  const lightBefore = state.light;
  assert.strictEqual(state.stoke(), false, 'stoke() neutralisé en état terminal');
  assert.strictEqual(state.light, lightBefore, 'aucun changement de light via stoke() en état terminal');

  assert.strictEqual(state.buyEmitter(), false, 'buyEmitter() neutralisé en état terminal');
  assert.strictEqual(state.applyEmitters(), false, 'applyEmitters() neutralisé en état terminal');
  assert.strictEqual(state.light, lightBefore, 'aucun changement de light en état terminal');
});

// R9/R10 — ascension : SEULE action valide en terminal, delta STRICT sur glow,
// reset EXACT de light/emitterCount, avantage méta strictement supérieur.
test('ascend(): refusé hors état terminal', () => {
  const state = new GameState(1);
  assert.strictEqual(state.ascend(), false);
  assert.strictEqual(state.ascensionGlow, 0);
});

test('ascend(): en état terminal, +1 glow EXACT, light et emitterCount remis à 0 EXACT, terminal levé', () => {
  const state = new GameState(1);
  state.light = TERMINAL_THRESHOLD;
  state.emitterCount = 5;
  state._checkTerminal();

  const result = state.ascend();
  assert.strictEqual(result, true);
  assert.strictEqual(state.ascensionGlow, 1, 'delta STRICT = 1 sur ascensionGlow');
  assert.strictEqual(state.light, 0, 'light remis à exactement 0');
  assert.strictEqual(state.emitterCount, 0, 'emitterCount remis à exactement 0');
  assert.strictEqual(state.terminal, false, 'état terminal levé après ascension');
});

test('ascend(): lightPerStoke strictement supérieur au gain initial après ascension (R10)', () => {
  const state = new GameState(1);
  const initialStoke = state.lightPerStoke; // mesure R2 : gain de base
  state.light = TERMINAL_THRESHOLD;
  state._checkTerminal();
  state.ascend();
  assert(state.lightPerStoke > initialStoke,
    `lightPerStoke doit strictement augmenter (${initialStoke} -> ${state.lightPerStoke})`);
  assert.strictEqual(state.lightPerStoke, CORE_LIGHT_PER_STOKE * (1 + ASCENSION_BONUS_PER_GLOW * 1));
});

test('ascend() successifs : le bonus s\'accumule (chaque ascension augmente encore lightPerStoke)', () => {
  const state = new GameState(1);
  const gains = [state.lightPerStoke];
  for (let i = 0; i < 3; i++) {
    state.light = TERMINAL_THRESHOLD;
    state._checkTerminal();
    state.ascend();
    gains.push(state.lightPerStoke);
  }
  for (let i = 1; i < gains.length; i++) {
    assert(gains[i] > gains[i - 1], `chaque ascension doit strictement augmenter le gain (${gains[i - 1]} -> ${gains[i]})`);
  }
});

// R1/R7a/R7b — trois énoncés d'objectif TEXTUELLEMENT distincts.
test('currentObjective(): trois phases distinctes, la première et la troisième nomment le seuil', () => {
  const state = new GameState(1);
  const obj0 = state.currentObjective();
  assert(obj0.includes(String(TERMINAL_THRESHOLD)), 'objectif au tick 0 doit nommer le seuil terminal');

  state.emitterCount = 1;
  const obj1 = state.currentObjective();
  assert.notStrictEqual(obj1, obj0, 'objectif après 1er achat doit différer du tick 0');

  state.emitterCount = 2;
  const obj2 = state.currentObjective();
  assert.notStrictEqual(obj2, obj0, 'objectif à production active doit différer du tick 0');
  assert.notStrictEqual(obj2, obj1, 'objectif à production active doit différer de la phase intermédiaire');
  assert(obj2.includes(String(TERMINAL_THRESHOLD)), 'objectif à production active doit (re)nommer le seuil terminal');
});

test('currentObjective(): en état terminal, énoncé distinct orienté ascension', () => {
  const state = new GameState(1);
  state.light = TERMINAL_THRESHOLD;
  state._checkTerminal();
  const objT = state.currentObjective();
  assert(objT.toLowerCase().includes('ascension'), 'objectif en état terminal doit orienter vers l\'ascension');
});

// R5 — divergence de décision : deux politiques produisent des trajectoires
// de lumiere mesurablement distinctes et non triviales à horizon fixe.
test('step(): politique idle (param=0) vs actif (param=3) divergent à 300 frames', () => {
  const idle = new GameState(1);
  const actif = new GameState(1);
  for (let i = 0; i < 300; i++) { idle.step(0); actif.step(3); }

  assert.strictEqual(idle.light, 0, 'la politique idle ne doit produire aucune lumiere (jamais de clic)');
  assert(actif.light > 0, 'la politique actif doit produire de la lumiere');
  assert.notStrictEqual(idle.light, actif.light, 'les deux politiques doivent diverger');
});

test('step(): cadence EXACTE — attise seulement au multiple de policyParam, pas plus, pas moins', () => {
  const state = new GameState(1);
  for (let i = 0; i < 9; i++) state.step(3); // clics attendus aux frames 3,6,9 -> exactement 3
  assert.strictEqual(state.light, 3 * CORE_LIGHT_PER_STOKE,
    'seuls les frames multiples de policyParam doivent déclencher un attisage');
});

test('step(): achat automatique déclenché à light === emitterCost EXACTEMENT (>=, jamais >)', () => {
  const state = new GameState(1);
  state.light = state.emitterCost; // exactement au coût, avant tout step
  state.step(0); // aucun clic ; applyEmitters no-op (emitterCount=0) ; vérifie l'achat
  assert.strictEqual(state.emitterCount, 1,
    'achat auto doit se déclencher dès light === cost (>=), pas seulement strictement au-dessus (>)');
});

test('step(): frameCount incrémente de exactement 1 par appel', () => {
  const state = new GameState(1);
  state.step(0);
  assert.strictEqual(state.frameCount, 1);
  state.step(0);
  assert.strictEqual(state.frameCount, 2);
});

test('step(): neutralisé une fois l\'état terminal atteint (frameCount continue, rien d\'autre ne bouge)', () => {
  const state = new GameState(1);
  state.light = TERMINAL_THRESHOLD;
  state._checkTerminal();
  const lightBefore = state.light;
  state.step(1);
  assert.strictEqual(state.light, lightBefore, 'aucune progression de light une fois terminal');
});

// reset() — utilisé par #restart : remise à zéro COMPLÈTE, glow compris.
test('reset(): remet TOUT à zéro, y compris le glow d\'ascension', () => {
  const state = new GameState(1);
  state.light = 2500;
  state.emitterCount = 7;
  state.ascensionGlow = 3;
  state.questMilestonesReached = 2;
  state.terminal = false;

  state.reset();
  assert.strictEqual(state.light, 0);
  assert.strictEqual(state.emitterCount, 0);
  assert.strictEqual(state.ascensionGlow, 0, 'reset() doit remettre le glow à 0 (contrairement à ascend())');
  assert.strictEqual(state.questMilestonesReached, 0);
  assert.strictEqual(state.terminal, false);
});
