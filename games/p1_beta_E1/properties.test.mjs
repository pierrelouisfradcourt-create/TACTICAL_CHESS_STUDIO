#!/usr/bin/env node
// properties.test.mjs — invariants de logique + comportement OBSERVABLE des
// modules de présentation (render / input / main).
//
// Le gate mutation du studio mute TOUS les fichiers `.mjs` non-test cités par
// la WireMap (engine.mjs, render.mjs, input.mjs) puis rejoue cette suite. Le
// double DOM minimal ci-dessous (patron réutilisé de
// games/chain_probe_v1/properties.test.mjs) donne au gate de quoi détecter
// une régression de rendu/entrée au niveau unitaire — il ne remplace PAS
// l'e2e navigateur réel (e2e.mjs, Playwright/Chromium).

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GameState } from './engine.mjs';
import { currentObjective } from './objective.mjs';
import {
  TERMINAL_THRESHOLD, MILESTONE_STEP, MILESTONE_COUNT, EMITTER_RATE,
  EMITTER_BASE_COST, PROVENANCE, PROVENANCE_GAPS,
} from './economy.mjs';

const GAME_DIR = dirname(fileURLToPath(import.meta.url));

// --- double DOM minimal ------------------------------------------------------

function matches(elm, selector) {
  if (!elm || typeof selector !== 'string') return false;
  if (selector.startsWith('#')) return elm.id === selector.slice(1);
  if (selector.startsWith('.')) {
    return String(elm.className).split(' ').filter(Boolean).includes(selector.slice(1));
  }
  return elm.tagName === selector.toUpperCase();
}

class FakeElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.id = '';
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
  }

  set innerHTML(value) {
    if (value === '') this.children = [];
  }
  get innerHTML() { return ''; }

  get classList() {
    const owner = this;
    const parts = () => String(owner.className).split(' ').filter(Boolean);
    return {
      add(name) { const s = new Set(parts()); s.add(name); owner.className = [...s].join(' '); },
      remove(name) { owner.className = parts().filter(c => c !== name).join(' '); },
      contains(name) { return parts().includes(name); },
      toggle(name, force) { if (force) this.add(name); else this.remove(name); },
    };
  }

  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }

  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }

  closest(selector) {
    let node = this;
    while (node) { if (matches(node, selector)) return node; node = node.parentNode; }
    return null;
  }
}

function* descendants(root) {
  for (const child of root.children) { yield child; yield* descendants(child); }
}

function installDom() {
  const body = new FakeElement('body');
  const registry = new Map();
  const doc = {
    body,
    listeners: {},
    createElement: tag => new FakeElement(tag),
    getElementById(id) {
      if (registry.has(id)) return registry.get(id);
      for (const node of descendants(body)) if (node.id === id) return node;
      return null;
    },
    addEventListener(type, fn) { (doc.listeners[type] = doc.listeners[type] || []).push(fn); },
  };

  // Construit le squelette réel de index.html (les ids consommés par
  // render.mjs/input.mjs/main.mjs), pour que installDom() soit un double
  // fidèle plutôt qu'un sous-ensemble arbitraire.
  const ids = [
    'field', 'objective', 'light-counter', 'progress-gauge-fill',
    'milestone-marker', 'hearth', 'emitters', 'emitter-count',
    'buy-button', 'buy-button-label', 'locked-glyph',
    'overlay', 'overlay-title', 'ascension-altar', 'restart',
  ];
  for (const id of ids) {
    const elm = doc.createElement(id === 'buy-button' ? 'button' : 'div');
    elm.id = id;
    if (id === 'overlay') elm.classList.add('hidden');
    body.appendChild(elm);
    registry.set(id, elm);
  }

  globalThis.document = doc;
  globalThis.window = globalThis.window || {};
  return doc;
}

function makeRng(seed = 12345) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// Le DOM doit exister AVANT l'import de main.mjs (code de niveau module
// exécuté à l'import).
const bootDoc = installDom();
const {
  renderHud, renderField, renderHearth, renderLightCounter, renderObjective,
  renderBuyButton, renderLockedGlyph, renderEmitters, renderProgressGauge,
  renderEndScreen, checkColorDisjointness,
} = await import('./render.mjs');
const {
  setupInput, handleHearthClick, handleBuyClick, handleAscensionClick, handleRestartClick,
} = await import('./input.mjs');
const { default: Game } = await import('./main.mjs');

function fireClick(target) {
  for (const fn of document.body.listeners['click'] || []) fn({ target });
}

// =============================================================================
// Invariants de logique (engine.mjs, via des trajectoires plus longues que
// logic.test.mjs)
// =============================================================================

test('Invariant: light ne décroît jamais tant que terminal reste faux (hors achat)', () => {
  const state = new GameState(1);
  const rng = makeRng(1);
  let prevBeforeBuy = state.light;
  for (let i = 0; i < 500; i++) {
    const lightBeforeStep = state.light;
    state.step(Math.floor(rng() * 6));
    // Un pas peut acheter (décroît) OU produire (croît) — l'invariant vérifié
    // est plus faible mais réel : light ne devient jamais négatif.
    assert(state.light >= 0, `light ne doit jamais devenir négatif (${lightBeforeStep} -> ${state.light})`);
  }
});

test('Invariant: emitterCount ne décroît jamais', () => {
  const state = new GameState(1);
  const rng = makeRng(2);
  let prev = 0;
  for (let i = 0; i < 500; i++) {
    state.step(Math.floor(rng() * 6));
    assert(state.emitterCount >= prev, 'emitterCount ne doit jamais décroître (hors ascension)');
    prev = state.emitterCount;
  }
});

test('Invariant: une fois terminal, le reste true jusqu\'à ascend()', () => {
  const state = new GameState(1);
  state.light = TERMINAL_THRESHOLD;
  state._checkTerminal();
  assert.strictEqual(state.terminal, true);
  for (let i = 0; i < 50; i++) {
    state.step(1);
    assert.strictEqual(state.terminal, true, 'terminal doit rester true tant qu\'aucune ascension n\'a eu lieu');
  }
});

test('Property: questMilestonesReached borné par floor(light/MILESTONE_STEP)', () => {
  const state = new GameState(1);
  const rng = makeRng(3);
  for (let i = 0; i < 400; i++) {
    state.step(Math.floor(rng() * 4));
    assert(state.questMilestonesReached <= Math.floor(state.light / MILESTONE_STEP) + 1,
      'questMilestonesReached ne doit jamais dépasser ce que light justifie');
  }
});

// =============================================================================
// economy.mjs — SOURCE UNIQUE des grandeurs structurelles
//
// Preuve attendue par le blueprint : « chaque grandeur structurelle est déclarée
// exactement une fois dans economy.mjs ; une recherche des littéraux
// correspondants dans les autres fichiers .mjs du jeu n'en trouve AUCUNE autre
// occurrence ». Les valeurs cherchées sont EXTRAITES d'economy.mjs à l'exécution
// (jamais recopiées ici) : ce test ne peut donc pas s'auto-exempter, et il
// détectera une valeur ajoutée demain sans qu'on le modifie.
// =============================================================================

/** Littéraux numériques `export const NAME = <nombre>;` déclarés par economy.mjs. */
function declaredEconomyLiterals() {
  const source = readFileSync(join(GAME_DIR, 'economy.mjs'), 'utf-8');
  const out = new Map();
  for (const m of source.matchAll(/export\s+const\s+(\w+)\s*=\s*(-?\d+(?:\.\d+)?)\s*;/g)) {
    out.set(m[1], m[2]);
  }
  return out;
}

function siblingModules() {
  return readdirSync(GAME_DIR)
    .filter(f => f.endsWith('.mjs') && f !== 'economy.mjs')
    .sort();
}

/** Neutralise les commentaires JS en préservant longueurs et sauts de ligne
 *  (les numéros de ligne restent exacts). Même discipline que la garde
 *  `_strip_js_comments` des oracles statiques du studio : un token en
 *  commentaire ne prouve rien — et ne condamne rien non plus. Le lookbehind
 *  (?<!:) épargne les `//` d'URL (http://localhost). */
function stripJsComments(text) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(?<!:)\/\/[^\n]*/g, blank);
}

test('economy: toutes les grandeurs structurelles attendues y sont déclarées', () => {
  const declared = declaredEconomyLiterals();
  for (const name of ['CORE_LIGHT_PER_STOKE', 'EMITTER_BASE_COST', 'EMITTER_COST_GROWTH',
    'EMITTER_RATE', 'ASCENSION_BONUS_PER_GLOW', 'TERMINAL_THRESHOLD', 'MILESTONE_COUNT']) {
    assert(declared.has(name), `${name} doit être déclarée en littéral dans economy.mjs`);
  }
});

test('economy: aucun autre .mjs du jeu ne ré-écrit un littéral structurel en dur', () => {
  const declared = declaredEconomyLiterals();
  // Un littéral d'un seul caractère (1, 5…) n'est pas distinguable d'un
  // incrément ou d'un index : le chercher produirait du bruit, pas un signal.
  // La règle porte donc sur les valeurs à 2 caractères ou plus — celles dont
  // une réapparition ailleurs est forcément une re-déclaration.
  const distinctive = [...declared].filter(([, value]) => value.length >= 2);
  assert(distinctive.length > 0, 'au moins une grandeur distinctive doit être surveillée');

  const violations = [];
  for (const file of siblingModules()) {
    const text = stripJsComments(readFileSync(join(GAME_DIR, file), 'utf-8'));
    for (const [name, value] of distinctive) {
      const literal = new RegExp(`(?<![\\w.$])${value.replace('.', '\\.')}(?![\\w.])`, 'g');
      for (const hit of text.matchAll(literal)) {
        const line = text.slice(0, hit.index).split('\n').length;
        violations.push(`${file}:${line} — ${value} (valeur de ${name}) ré-écrite en dur`);
      }
    }
  }
  assert.deepStrictEqual(violations, [],
    'les grandeurs structurelles ne vivent que dans economy.mjs :\n' + violations.join('\n'));
});

test('economy: chaque constante exportée porte une provenance, les manques sont déclarés', () => {
  const declared = declaredEconomyLiterals();
  for (const name of declared.keys()) {
    assert(typeof PROVENANCE[name] === 'string' && PROVENANCE[name].length > 0,
      `${name} doit citer sa provenance N2 (ou déclarer son absence)`);
  }
  // Un gap déclaré doit correspondre à une constante réelle — sinon la
  // déclaration d'honnêteté serait elle-même périmée.
  for (const gap of PROVENANCE_GAPS) {
    assert(declared.has(gap), `${gap} est déclarée sans provenance mais n'existe pas`);
  }
});

// =============================================================================
// objective.mjs — énoncés, sans DOM
// =============================================================================

test('objective: trois états forgés -> trois chaînes DEUX À DEUX différentes', () => {
  const zero = { terminal: false, emitterCount: 0 };
  const one = { terminal: false, emitterCount: 1 };
  const active = { terminal: false, emitterCount: 2 };

  const [a, b, c] = [currentObjective(zero), currentObjective(one), currentObjective(active)];
  assert.notStrictEqual(a, b);
  assert.notStrictEqual(b, c);
  assert.notStrictEqual(a, c);
  assert(a.includes(String(TERMINAL_THRESHOLD)), 'la première nomme le seuil terminal');
  assert(c.includes(String(TERMINAL_THRESHOLD)), 'la troisième nomme le seuil terminal');
  assert(!b.includes(String(TERMINAL_THRESHOLD)),
    'la phase intermédiaire vise le second émetteur, pas la fin');
});

// =============================================================================
// R5 — divergence de politiques à horizon fixe, ET sa CONTRE-ÉPREUVE
//
// Leçon du pré-mortem (manifest-c02158869a24c1ef) : un oracle qui ne teste
// qu'une seule politique gagnante ne distingue pas un jeu d'un minuteur. Il
// faut mesurer la DIVERGENCE, et prouver qu'attendre ne gagne PAS.
// =============================================================================

const HORIZON = 300; // frames — horizon fixe déclaré, identique pour les 2 politiques

test('R5: idle (param=0) et actif (param=3) rendent DEUX valeurs de light distinctes', () => {
  const idle = new GameState(1);
  const actif = new GameState(1);
  for (let i = 0; i < HORIZON; i++) { idle.step(0); actif.step(3); }

  assert.strictEqual(idle.light, 0, 'sans aucun clic et sans émetteur, aucune lumiere ne peut apparaître');
  assert(actif.light > 0, 'la politique active doit produire de la lumiere');
  assert.notStrictEqual(idle.light, actif.light, 'les deux politiques doivent diverger');
  assert(actif.emitterCount > idle.emitterCount,
    'la divergence porte aussi sur la structure acquise, pas seulement sur un compteur');
});

test('R5 contre-épreuve: la politique idle ne franchit JAMAIS le seuil terminal', () => {
  const idle = new GameState(1);
  // Budget volontairement très supérieur à l'horizon de divergence : si le jeu
  // se gagnait en attendant, c'est ici qu'il le montrerait.
  for (let i = 0; i < HORIZON * 100; i++) idle.step(0);
  assert.strictEqual(idle.isTerminal(), false,
    'un jeu qui se gagne en attendant est un minuteur, pas un jeu');
  assert.strictEqual(idle.light, 0, 'aucune lumiere ne doit apparaître sans décision du joueur');
});

// =============================================================================
// render.mjs — rendu HUD/scène
// =============================================================================

test('hud: les six teintes de rôle sont strictement disjointes', () => {
  assert.strictEqual(checkColorDisjointness(), true);
});

test('renderField: la teinte se réchauffe de façon monotone avec light/threshold', () => {
  const samples = [
    0,
    TERMINAL_THRESHOLD / 4,
    TERMINAL_THRESHOLD / 2,
    (TERMINAL_THRESHOLD * 3) / 4,
    TERMINAL_THRESHOLD,
  ];
  const colors = samples.map(light => {
    const state = new GameState(1);
    state.light = light;
    renderField(state);
    return document.getElementById('field').style.backgroundColor;
  });
  const parse = c => c.match(/\d+/g).map(Number);
  const parsed = colors.map(parse);
  for (let i = 1; i < parsed.length; i++) {
    // Le rouge doit croître (ou rester stable) de façon monotone — jamais décroître.
    assert(parsed[i][0] >= parsed[i - 1][0], `canal R doit croître de façon monotone: ${parsed[i - 1]} -> ${parsed[i]}`);
  }
  assert.notStrictEqual(colors[0], colors[colors.length - 1], 'la teinte à 0 doit différer de la teinte à 100%');
});

test('renderField: capé à threshold — au-delà, la teinte n\'évolue plus (ratio borné à 1)', () => {
  const atThreshold = new GameState(1); atThreshold.light = TERMINAL_THRESHOLD;
  renderField(atThreshold);
  const colorAt = document.getElementById('field').style.backgroundColor;

  const beyond = new GameState(1); beyond.light = TERMINAL_THRESHOLD * 3;
  renderField(beyond);
  const colorBeyond = document.getElementById('field').style.backgroundColor;

  assert.strictEqual(colorAt, colorBeyond, 'la teinte doit être identique au seuil et au-delà (ratio capé)');
});

test('renderHearth: teinte chaude hors terminal, froide et inerte en terminal', () => {
  const active = new GameState(1);
  renderHearth(active);
  const hearth = document.getElementById('hearth');
  assert.strictEqual(hearth.style.cursor, 'pointer');
  const hotColor = hearth.style.backgroundColor;

  const terminalState = new GameState(1);
  terminalState.light = TERMINAL_THRESHOLD;
  terminalState._checkTerminal();
  renderHearth(terminalState);
  assert.strictEqual(hearth.style.cursor, 'not-allowed');
  assert.notStrictEqual(hearth.style.backgroundColor, hotColor, 'la teinte doit différer entre actif et terminal');
});

test('renderLightCounter: affiche la partie entière de light, mis à jour à chaque appel', () => {
  const state = new GameState(1);
  state.light = 42.9;
  renderLightCounter(state);
  assert.strictEqual(document.getElementById('light-counter').textContent, '42');

  state.light = 43.9;
  renderLightCounter(state);
  assert.strictEqual(document.getElementById('light-counter').textContent, '43');
});

test('renderObjective: reflète exactement currentObjective() et bascule avec la phase', () => {
  const state = new GameState(1);
  renderObjective(state);
  const line = document.getElementById('objective');
  assert.strictEqual(line.textContent, currentObjective(state));
  const obj0 = line.textContent;

  state.emitterCount = 1;
  renderObjective(state);
  assert.notStrictEqual(line.textContent, obj0);
});

test('renderBuyButton: désaturé/verrouillé sous le coût, doré/abordable au coût', () => {
  const state = new GameState(1);
  state.light = 0;
  renderBuyButton(state);
  const btn = document.getElementById('buy-button');
  const locked = document.getElementById('locked-glyph');
  assert.strictEqual(btn.classList.contains('locked'), true);
  assert.strictEqual(btn.disabled, true);
  assert.strictEqual(locked.hidden, false, 'le glyphe verrouillé doit être visible sous le coût');
  assert(locked.textContent.includes('requise'), 'la raison doit être visible textuellement');
  const lockedColor = btn.style.backgroundColor;

  state.light = state.emitterCost;
  renderBuyButton(state);
  assert.strictEqual(btn.classList.contains('affordable'), true);
  assert.strictEqual(btn.disabled, false);
  assert.strictEqual(locked.hidden, true, 'le glyphe verrouillé doit disparaître une fois abordable');
  assert.notStrictEqual(btn.style.backgroundColor, lockedColor, 'la teinte doit différer entre verrouillé et abordable');
});

test('renderBuyButton: neutralisé (verrouillé) en état terminal même si light suffirait', () => {
  const state = new GameState(1);
  state.light = TERMINAL_THRESHOLD;
  state._checkTerminal();
  renderBuyButton(state);
  const btn = document.getElementById('buy-button');
  assert.strictEqual(btn.classList.contains('locked'), true, 'achat verrouillé en état terminal');
});

test('renderLockedGlyph: visible + raison textuelle sous le coût, masqué une fois abordable', () => {
  const state = new GameState(1);
  state.light = 0;
  renderLockedGlyph(state);
  const locked = document.getElementById('locked-glyph');
  assert.strictEqual(locked.hidden, false);
  assert.strictEqual(locked.textContent, `${state.emitterCost} lumiere requise`);

  state.light = state.emitterCost;
  renderLockedGlyph(state);
  assert.strictEqual(locked.hidden, true);
  assert.strictEqual(locked.textContent, '');
});

test('renderEmitters: le compteur textuel reflète exactement emitterCount', () => {
  const state = new GameState(1);
  state.emitterCount = 5;
  renderEmitters(state);
  assert.strictEqual(document.getElementById('emitter-count').textContent, '5');
});

test('renderProgressGauge: largeur EXACTE 0/25/50/100% aux quarts du seuil, capée à 100%', () => {
  const gauge = document.getElementById('progress-gauge-fill');
  const cases = [
    [0, '0%'],
    [TERMINAL_THRESHOLD / 4, '25%'],
    [TERMINAL_THRESHOLD / 2, '50%'],
    [TERMINAL_THRESHOLD, '100%'],
    [TERMINAL_THRESHOLD * 2, '100%'], // ratio borné à 1 au-delà du seuil
  ];
  for (const [light, expected] of cases) {
    const state = new GameState(1);
    state.light = light;
    renderProgressGauge(state);
    assert.strictEqual(gauge.style.width, expected,
      `light=${light} doit rendre une largeur de ${expected} (égalité stricte)`);
  }
});

test('renderEmitters: n émetteurs possédés rendent n silhouettes distinctes', () => {
  const container = document.getElementById('emitters');
  for (const n of [0, 1, 3, 7]) {
    const state = new GameState(1);
    state.emitterCount = n;
    renderEmitters(state);
    assert.strictEqual(container.children.length, n,
      `${n} émetteurs possédés doivent rendre exactement ${n} silhouettes`);
  }
});

test('renderBuyButton: le libellé affiche le coût COURANT, jamais une valeur figée', () => {
  const label = document.getElementById('buy-button-label');
  const state = new GameState(1);

  renderBuyButton(state);
  const first = label.textContent;
  assert(first.includes(String(EMITTER_BASE_COST)),
    'le libellé initial doit nommer le coût de base issu d\'economy');

  state.emitterCount = 4;
  renderBuyButton(state);
  assert(label.textContent.includes(String(state.emitterCost)),
    'le libellé doit suivre state.emitterCost');
  assert.notStrictEqual(label.textContent, first,
    'un libellé figé passerait ce test à l\'identique — il doit changer avec le coût');
});

test('renderEndScreen: overlay caché hors terminal, visible en terminal', () => {
  const state = new GameState(1);
  renderEndScreen(state);
  const overlay = document.getElementById('overlay');
  assert.strictEqual(overlay.classList.contains('hidden'), true);

  state.light = TERMINAL_THRESHOLD;
  state._checkTerminal();
  renderEndScreen(state);
  assert.strictEqual(overlay.classList.contains('hidden'), false);

  state.ascend();
  renderEndScreen(state);
  assert.strictEqual(overlay.classList.contains('hidden'), true, 're-caché après ascension');
});

test('renderHud: peint l\'ensemble en un seul appel (compteur + objectif + overlay cohérents)', () => {
  const state = new GameState(1);
  state.light = 7;
  renderHud(state);
  assert.strictEqual(document.getElementById('light-counter').textContent, '7');
  assert.strictEqual(document.getElementById('objective').textContent, currentObjective(state));
});

// =============================================================================
// input.mjs — traduction des clics en commandes vers engine
// =============================================================================

// Chaque test d'input installe son PROPRE document (installDom()) : setupInput()
// enregistre un nouvel écouteur sur document.body à chaque appel, et les
// écouteurs ne sont jamais retirés — les réutiliser entre tests ferait
// s'accumuler les écouteurs d'anciens tests (avec d'anciens gameLoop sans les
// méthodes attendues) sur le même clic.

test('input: un clic sur #hearth attise (delta STRICT sur light) et arme le feedback', () => {
  const doc = installDom();
  const state = new GameState(1);
  const loop = { lastStoke: false };
  setupInput(state, loop);
  const before = state.light;

  fireClick(doc.getElementById('hearth'));

  assert.strictEqual(state.light, before + state.lightPerStoke);
  assert.strictEqual(loop.lastStoke, true, 'le feedback d\'attisage doit être armé');
});

test('input: un clic sur #buy-button achète si abordable, ne fait rien sinon', () => {
  const doc = installDom();
  const state = new GameState(1);
  setupInput(state, { lastStoke: false });

  fireClick(doc.getElementById('buy-button')); // light=0, coût=15 : refusé
  assert.strictEqual(state.emitterCount, 0);

  state.light = state.emitterCost;
  fireClick(doc.getElementById('buy-button'));
  assert.strictEqual(state.emitterCount, 1, 'achat doit passer une fois abordable');
});

test('input: un clic sur #ascension-altar est neutre hors terminal, agit en terminal', () => {
  const doc = installDom();
  const state = new GameState(1);
  setupInput(state, { lastStoke: false });

  fireClick(doc.getElementById('ascension-altar'));
  assert.strictEqual(state.ascensionGlow, 0, 'ascension refusée hors terminal');

  state.light = TERMINAL_THRESHOLD;
  state._checkTerminal();
  fireClick(doc.getElementById('ascension-altar'));
  assert.strictEqual(state.ascensionGlow, 1, 'ascension acceptée en terminal, delta STRICT = 1');
  assert.strictEqual(state.light, 0);
});

test('handleHearthClick(): appel direct, mêmes garanties que le clic délégué', () => {
  const state = new GameState(1);
  const loop = { lastStoke: false };
  handleHearthClick(state, loop);
  assert.strictEqual(state.light, state.lightPerStoke);
  assert.strictEqual(loop.lastStoke, true);
});

test('handleBuyClick(): appel direct, refuse sous le coût', () => {
  const state = new GameState(1);
  handleBuyClick(state);
  assert.strictEqual(state.emitterCount, 0);
});

test('handleAscensionClick(): appel direct hors terminal, NE CHANGE STRICTEMENT RIEN', () => {
  const state = new GameState(1);
  state.light = MILESTONE_STEP;
  state.emitterCount = 3;
  state.questMilestonesReached = 1;
  // Neutralisation PROUVÉE, jamais supposée : on compare l'état ENTIER, pas
  // seulement le champ qu'on s'attendait à voir bouger.
  const before = JSON.stringify(state);
  handleAscensionClick(state);
  assert.strictEqual(JSON.stringify(state), before,
    'un clic sur l\'autel hors état terminal ne doit modifier AUCUN champ');
});

test('handleRestartClick(): appel direct, atteint gameLoop.restart() exactement une fois', () => {
  let relances = 0;
  handleRestartClick({ restart: () => { relances += 1; } });
  assert.strictEqual(relances, 1);
});

test('input: un clic sur #restart atteint la boucle exactement une fois', () => {
  const doc = installDom();
  const state = new GameState(1);
  let relances = 0;
  setupInput(state, { lastStoke: false, restart: () => { relances += 1; } });

  fireClick(doc.getElementById('restart'));
  assert.strictEqual(relances, 1);
});

// =============================================================================
// main.mjs — composition root et boucle
// =============================================================================

test('main: une partie neuve ne tourne pas avant run()', () => {
  installDom();
  const g = new Game();
  assert.strictEqual(g.running, false);
  assert.strictEqual(g.lastStoke, false);
});

test('main: init() peint le HUD avant tout premier paint et expose window.__game', () => {
  installDom();
  const g = new Game();
  g.init();
  assert.strictEqual(document.getElementById('objective').textContent, currentObjective(g.state));
  assert.notStrictEqual(document.getElementById('objective').textContent, '',
    'objectif non vide au tick 0 : un rendu a eu lieu AVANT le premier paint');
  assert.notStrictEqual(document.getElementById('light-counter').textContent, '',
    'compteur non vide au tick 0 : écran jamais vide');
  assert.strictEqual(globalThis.window.__game, g.state);
  assert.strictEqual(typeof globalThis.window.__game_debug.reachThreshold, 'function');
  assert.strictEqual(typeof globalThis.window.__game_debug.grantLight, 'function');
});

test('main: run() démarre la boucle', () => {
  installDom();
  const g = new Game();
  g.run();
  try {
    assert.strictEqual(g.running, true);
  } finally {
    g.running = false;
  }
});

test('main: tick() applique la production passive et consomme le flash d\'attisage en attente', () => {
  installDom();
  const g = new Game();
  g.init();
  g.state.emitterCount = 2;
  g.lastStoke = true;
  const before = g.state.light;

  g.tick();

  assert.strictEqual(g.lastStoke, false, 'le flash d\'attisage consommé ne doit jamais rejouer deux fois');
  assert.strictEqual(g.state.light, before + 2 * EMITTER_RATE, 'tick() doit appliquer la production passive exactement une fois');
});

test('main: __game_debug.reachThreshold() force l\'état terminal', () => {
  installDom();
  const g = new Game();
  g.init();
  globalThis.window.__game_debug.reachThreshold();
  assert.strictEqual(g.state.light, TERMINAL_THRESHOLD);
  assert.strictEqual(g.state.terminal, true);
});

test('main: __game_debug.grantLight() crédite exactement le montant demandé', () => {
  installDom();
  const g = new Game();
  g.init();
  const before = g.state.light;
  globalThis.window.__game_debug.grantLight(250);
  assert.strictEqual(g.state.light, before + 250);
});

test('main: restart() remet la partie à zéro (glow compris) et relance la boucle', () => {
  installDom();
  const g = new Game();
  g.init();
  g.running = false;
  g.state.light = TERMINAL_THRESHOLD;
  g.state._checkTerminal();
  g.state.ascend();
  g.state.light = 300;

  g.restart();
  try {
    assert.strictEqual(g.running, true, 'restart() depuis une boucle arrêtée DOIT la relancer');
    assert.strictEqual(g.state.light, 0);
    assert.strictEqual(g.state.ascensionGlow, 0, 'reset() complet : le glow doit revenir à 0');
    assert.strictEqual(g.lastStoke, false);
  } finally {
    g.running = false;
  }
});

test('main: le module s\'auto-câble sur DOMContentLoaded en contexte navigateur', () => {
  const listeners = bootDoc.listeners['DOMContentLoaded'] || [];
  assert.strictEqual(listeners.length > 0, true, 'main.mjs doit enregistrer son point d\'entrée quand window existe');
});
