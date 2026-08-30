#!/usr/bin/env node
// properties.test.mjs — invariants de logique + comportement OBSERVABLE des
// modules de présentation (render / hud / main).
//
// Pourquoi une partie DOM ici : le gate mutation du studio mute TOUS les fichiers
// `.mjs` non-test cités par la WireMap (render.mjs, hud.mjs, main.mjs inclus) puis
// rejoue cette suite. Tant que la suite n'importait que logic.mjs, ces trois
// modules rendaient 13 mutants survivants par pure topologie : aucun test ne
// pouvait les voir. Le double DOM minimal ci-dessous ne remplace PAS l'e2e
// navigateur réel (e2e.mjs, Playwright/Chromium) — il donne au gate mutation de
// quoi détecter une régression de rendu au niveau unitaire, ce que la mesure
// exigeait et que la topologie interdisait.

import { test } from 'node:test';
import assert from 'node:assert';
import { GameState } from './logic.mjs';

// --- générateur déterministe -------------------------------------------------
// `Math.random()` rendait ces propriétés non reproductibles : sous mutation la
// suite est rejouée des dizaines de fois, et un mutant pouvait être « tué » par
// chance (ou survivre par chance). Un LCG à graine fixe rend chaque exécution
// identique — la preuve devient répétable.
function makeRng(seed = 12345) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- double DOM minimal ------------------------------------------------------

function matches(el, selector) {
  if (!el || typeof selector !== 'string') return false;
  if (selector.startsWith('#')) return el.id === selector.slice(1);
  if (selector.startsWith('.')) {
    return String(el.className).split(' ').filter(Boolean).includes(selector.slice(1));
  }
  const attrEq = selector.match(/^\[([\w-]+)="(.*)"\]$/);
  if (attrEq) {
    const key = attrEq[1].replace(/^data-/, '');
    return String(el.dataset[key]) === attrEq[2];
  }
  const attrAny = selector.match(/^\[([\w-]+)\]$/);
  if (attrAny) {
    const key = attrAny[1].replace(/^data-/, '');
    return el.dataset[key] !== undefined;
  }
  return el.tagName === selector.toUpperCase();
}

class FakeElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.id = '';
    this.className = '';
    this.textContent = '';
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
  }

  set innerHTML(value) {
    if (value === '') this.children = [];
  }

  get innerHTML() {
    return '';
  }

  get firstChild() {
    return this.children.length ? this.children[0] : null;
  }

  get classList() {
    const owner = this;
    const parts = () => String(owner.className).split(' ').filter(Boolean);
    return {
      add(name) {
        const set = new Set(parts());
        set.add(name);
        owner.className = [...set].join(' ');
      },
      remove(name) {
        owner.className = parts().filter(c => c !== name).join(' ');
      },
      contains(name) {
        return parts().includes(name);
      },
      toggle(name, force) {
        if (force) this.add(name);
        else this.remove(name);
      }
    };
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, ref) {
    child.parentNode = this;
    const at = ref ? this.children.indexOf(ref) : 0;
    this.children.splice(at < 0 ? 0 : at, 0, child);
    return child;
  }

  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }

  // Le double n'a pas de mise en page : l'origine du conteneur est (0,0), donc
  // clientX/clientY valent directement les coordonnées monde.
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 400, height: 300 };
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (matches(node, selector)) return node;
      node = node.parentNode;
    }
    return null;
  }

  querySelector(selector) {
    for (const node of descendants(this)) {
      if (matches(node, selector)) return node;
    }
    return null;
  }

  querySelectorAll(selector) {
    return [...descendants(this)].filter(node => matches(node, selector));
  }
}

function* descendants(root) {
  for (const child of root.children) {
    yield child;
    yield* descendants(child);
  }
}

function installDom() {
  const body = new FakeElement('body');
  const doc = {
    body,
    listeners: {},
    createElement: tag => new FakeElement(tag),
    getElementById(id) {
      for (const node of descendants(body)) if (node.id === id) return node;
      return null;
    },
    querySelector(selector) {
      for (const node of descendants(body)) if (matches(node, selector)) return node;
      return null;
    },
    querySelectorAll(selector) {
      return [...descendants(body)].filter(node => matches(node, selector));
    },
    addEventListener(type, fn) {
      (doc.listeners[type] = doc.listeners[type] || []).push(fn);
    }
  };
  globalThis.document = doc;
  globalThis.window = globalThis.window || {};
  return doc;
}

// Un conteneur de jeu neuf : chaque test DOM part d'une page vierge, sinon
// l'overlay/HUD d'un test précédent fausserait le suivant.
function freshPage() {
  const doc = installDom();
  const container = doc.createElement('div');
  container.id = 'game-container';
  doc.body.appendChild(container);
  return { doc, container };
}

// Le DOM doit exister AVANT l'import de main.mjs : son code de niveau module
// s'exécute à l'import (`if (typeof window !== 'undefined') …`). On garde une
// référence sur CE document-là : les tests suivants en installent d'autres, et
// c'est bien sur celui de l'import que main.mjs a dû s'enregistrer.
const bootDoc = installDom();
const { renderScene, renderFeedback } = await import('./render.mjs');
const { renderHud, checkColorDisjointness } = await import('./hud.mjs');
const { setupInput } = await import('./input.mjs');
const { default: Game } = await import('./main.mjs');

// Rejoue un clic capturé : le double n'a pas de propagation d'évènements, donc on
// invoque les écouteurs enregistrés par input.mjs avec un évènement minimal.
function fireClick(el, target, clientX = 0, clientY = 0) {
  for (const fn of el.listeners['click'] || []) fn({ target, clientX, clientY });
}

// =============================================================================
// Invariants de logique
// =============================================================================

test('Invariant: objectsActive is never > objectsRequired', () => {
  const state = new GameState(1);
  const rng = makeRng(1);
  for (let i = 0; i < 1000; i++) {
    state.step(rng() * 320);
    assert(state.objectsActive <= state.objectsRequired,
      `objectsActive (${state.objectsActive}) must never exceed objectsRequired (${state.objectsRequired})`);
  }
});

test('Invariant: terminal opens exactly at objectsRequired', () => {
  const state = new GameState(1);
  const rng = makeRng(2);
  let transitionFrame = -1;

  for (let i = 0; i < 1000 && !state.won; i++) {
    state.step(rng() * 320);
    if (state.terminalState === 'AVAILABLE' && transitionFrame === -1) {
      transitionFrame = i;
      assert.strictEqual(state.objectsActive, state.objectsRequired,
        'Terminal must open exactly when objectsActive === objectsRequired');
    }
  }
  assert.notStrictEqual(transitionFrame, -1,
    'le gate DOIT s\'ouvrir au moins une fois sur 1000 frames — sinon cet invariant ne mesure rien');
});

test('Invariant: explored cells only increase', () => {
  const state = new GameState(1);
  const rng = makeRng(3);
  let prev = state.exploredCells.size;

  for (let i = 0; i < 500; i++) {
    state.step(rng() * 320);
    const curr = state.exploredCells.size;
    assert(curr >= prev, `Explored cells must never decrease (${prev} -> ${curr})`);
    prev = curr;
  }
  assert(prev > 1, 'l\'exploration doit avoir strictement progressé sur 500 frames');
});

test('Invariant: once won, stays won', () => {
  const state = new GameState(1);
  // Fast-forward to winning state
  state.objectsActive = state.objectsRequired;
  state.terminalState = 'AVAILABLE';
  state.activateTerminal();

  assert.strictEqual(state.won, true, 'Game must be won');

  // Continue stepping
  for (let i = 0; i < 100; i++) {
    state.step(100);
    assert.strictEqual(state.won, true, 'Once won, must stay won');
  }
});

test('Property: avatar stays within bounds', () => {
  const state = new GameState(1);
  const rng = makeRng(4);
  for (let i = 0; i < 500; i++) {
    state.step(rng() * 320);
    assert(state.avatarX >= 0 && state.avatarX <= 400, `avatarX out of bounds: ${state.avatarX}`);
    assert(state.avatarY >= 0 && state.avatarY <= 300, `avatarY out of bounds: ${state.avatarY}`);
  }
});

test('revealObjects: rayon strict — un objet hors rayon n\'est jamais révélé', () => {
  const state = new GameState(1);
  state.avatarX = state.objects[0].x;
  state.avatarY = state.objects[0].y;
  state.objects[0].x += 500; // très au-delà du rayon de perception
  state.revealObjects();
  assert.strictEqual(state.objects[0].visible, false,
    'un objet hors rayon ne doit pas être révélé');
  assert.strictEqual(state.objectsVisible, 0);

  state.objects[0].x = state.avatarX; // ramené sur l'avatar
  state.revealObjects();
  assert.strictEqual(state.objects[0].visible, true, 'un objet dans le rayon DOIT être révélé');
  assert.strictEqual(state.objectsVisible, 1, 'delta STRICT = 1');
});

test('updateGate: n\'ouvre le terminal QU\'au compte exact requis', () => {
  const state = new GameState(1);
  state.objectsActive = state.objectsRequired - 1;
  state.updateGate();
  assert.strictEqual(state.terminalState, 'LOCKED', 'un objet manquant => gate fermé');

  state.objectsActive = state.objectsRequired;
  state.updateGate();
  assert.strictEqual(state.terminalState, 'AVAILABLE', 'compte exact => gate ouvert');
});

// =============================================================================
// hud.mjs — chrome périphérique
// =============================================================================

test('hud: les trois teintes de rôle sont strictement disjointes', () => {
  assert.strictEqual(checkColorDisjointness(), true,
    'checkColorDisjointness doit rendre exactement true (3 teintes distinctes)');
});

test('hud: la ligne d\'objectif nomme l\'état courant et bascule avec le gate', () => {
  const { doc } = freshPage();
  const state = new GameState(1);

  renderHud(state);
  const line = doc.getElementById('hud-objective');
  assert.notStrictEqual(line, null, 'la ligne d\'objectif doit exister à t0');
  assert.strictEqual(line.textContent, state.currentObjective());
  assert(line.textContent.includes('Activer'), 'objectif initial : activer les objets');

  state.objectsActive = state.objectsRequired;
  state.updateGate();
  renderHud(state);
  assert(line.textContent.includes('terminal'), 'objectif bascule une fois le gate ouvert');
});

test('hud: l\'overlay de fin reste caché tant que la partie n\'est pas gagnée', () => {
  const { doc } = freshPage();
  const state = new GameState(1);

  renderHud(state);
  const overlay = doc.getElementById('overlay');
  assert.notStrictEqual(overlay, null, 'l\'overlay doit être créé une fois pour toutes');
  assert.strictEqual(overlay.classList.contains('hidden'), true, 'caché tant que won=false');

  state.won = true;
  renderHud(state);
  assert.strictEqual(overlay.classList.contains('hidden'), false, 'montré quand won=true');
  assert.strictEqual(doc.getElementById('restart') !== null, true,
    'le bouton #restart doit être accessible dans l\'overlay');

  state.won = false;
  renderHud(state);
  assert.strictEqual(overlay.classList.contains('hidden'), true, 're-caché quand won repasse à false');
});

// =============================================================================
// render.mjs — rendu de la scène
// =============================================================================

test('renderScene: la grille rend exactement cols*rows cellules, l\'explorée seule est teintée', () => {
  const { doc } = freshPage();
  const state = new GameState(1);

  renderScene(state);
  const cells = doc.querySelectorAll('.grid-cell');
  assert.strictEqual(cells.length, 8 * 6,
    'grille 400x300 en cellules de 50px => exactement 48 cellules');

  // L'avatar démarre en (200,150) => cellule (4,3).
  const teintees = cells.filter(c => c.style.backgroundColor === '#e0e0e0');
  assert.strictEqual(teintees.length, 1, 'une seule cellule explorée à t0');
  assert.strictEqual(teintees[0].style.left, (4 * 50) + 'px');
  assert.strictEqual(teintees[0].style.top, (3 * 50) + 'px');
});

test('renderScene: la scène n\'est jamais vide au boot (avatar présent)', () => {
  const { doc } = freshPage();
  renderScene(new GameState(1));
  const avatar = doc.querySelector('.game-avatar');
  assert.notStrictEqual(avatar, null, 'un avatar doit être rendu dès la première frame');
  assert.strictEqual(avatar.style.backgroundColor, '#2196F3', 'teinte joueur = bleu');
});

test('renderScene: un objet ACTIF mais non révélé reste rendu (visible OU actif)', () => {
  const { doc } = freshPage();
  const state = new GameState(1);
  state.activateObject(0);           // actif, jamais révélé
  assert.strictEqual(state.objects[0].visible, false);

  renderScene(state);
  const el = doc.querySelector('[data-id="0"]');
  assert.notStrictEqual(el, null,
    'un objet activé doit rester à l\'écran même s\'il n\'a jamais été « révélé »');
  assert.strictEqual(el.style.opacity, '0.5', 'état rendu d\'un objet actif : atténué');

  const inerte = doc.querySelector('[data-id="1"]');
  assert.strictEqual(inerte, null, 'un objet ni visible ni actif ne doit PAS être rendu');
});

test('renderScene: activer un objet change son état rendu', () => {
  const { doc } = freshPage();
  const state = new GameState(1);
  state.objects[0].visible = true;

  renderScene(state);
  const avant = doc.querySelector('[data-id="0"]').style.backgroundColor;

  state.activateObject(0);
  renderScene(state);
  const apres = doc.querySelector('[data-id="0"]').style.backgroundColor;

  assert.notStrictEqual(avant, apres, 'l\'état rendu doit différer avant/après activation');
  assert.strictEqual(avant, '#ffb600');
  assert.strictEqual(apres, '#d4b500');
});

test('renderScene: le terminal apparaît dès qu\'il est AVAILABLE, sans attendre une frame', () => {
  const { doc } = freshPage();
  const state = new GameState(1);
  state.objectsActive = state.objectsRequired;
  state.updateGate();
  assert.strictEqual(state.frameCount, 0, 'cas limite : gate ouvert AVANT toute frame');

  renderScene(state);
  const term = doc.querySelector('.game-terminal');
  assert.notStrictEqual(term, null,
    'un terminal ouvert doit être rendu même à frameCount=0');
  assert.strictEqual(term.style.backgroundColor, '#00c851', 'teinte terminal ouvert = émeraude');
  assert.strictEqual(term.style.cursor, 'pointer', 'terminal ouvert = cliquable');
});

test('renderScene: le terminal verrouillé est rendu inerte (teinte et curseur distincts)', () => {
  const { doc } = freshPage();
  const state = new GameState(1);
  state.frameCount = 11; // au-delà du seuil de révélation du terminal
  assert.strictEqual(state.terminalState, 'LOCKED');

  renderScene(state);
  const term = doc.querySelector('.game-terminal');
  assert.notStrictEqual(term, null, 'le terminal verrouillé est visible mais inerte');
  assert.strictEqual(term.style.backgroundColor, '#ccc', 'verrouillé => gris, jamais émeraude');
  assert.strictEqual(term.style.cursor, 'not-allowed', 'verrouillé => non cliquable');
});

test('renderScene: aucun terminal tant qu\'il est verrouillé et non encore révélé', () => {
  const { doc } = freshPage();
  const state = new GameState(1);
  state.frameCount = 0;
  renderScene(state);
  assert.strictEqual(doc.querySelector('.game-terminal'), null,
    'terminal ni ouvert ni révélé => absent de la scène');
});

test('renderFeedback: le flash s\'applique à l\'objet cliqué', () => {
  const { doc } = freshPage();
  const state = new GameState(1);
  state.objects[0].visible = true;
  renderScene(state);

  const el = doc.querySelector('[data-id="0"]');
  assert.strictEqual(el.style.transform, undefined, 'aucun flash avant activation');

  renderFeedback(0);
  assert.strictEqual(el.style.transform, 'scale(1.3)', 'flash appliqué dans la même frame');
  assert(String(el.style.boxShadow).includes('rgba'), 'halo ambre appliqué');
});

// =============================================================================
// input.mjs — traduction des clics en commandes vers logic
// =============================================================================

test('input: un clic dans le vide déplace l\'avatar et élargit l\'exploration', () => {
  const { doc, container } = freshPage();
  const state = new GameState(1);
  setupInput(state, { lastActivation: null });
  renderScene(state);

  const exploredAvant = state.exploredCells.size;
  fireClick(container, doc.querySelector('.grid-cell'), 140, 79);

  assert.strictEqual(state.avatarX, 140, 'la destination cliquée devient la position');
  assert.strictEqual(state.avatarY, 79);
  assert.strictEqual(state.exploredCells.size, exploredAvant + 1,
    'l\'espace exploré augmente de exactement 1 cellule');
});

test('input: un clic sur un objet ambre l\'active (delta STRICT=1) et arme le feedback', () => {
  const { doc, container } = freshPage();
  const state = new GameState(1);
  const loop = { lastActivation: null };
  setupInput(state, loop);

  state.objects[0].visible = true;
  renderScene(state);

  fireClick(container, doc.querySelector('[data-id="0"]'));

  assert.strictEqual(state.objectsActive, 1, 'delta STRICT = 1 sur activation');
  assert.strictEqual(state.objects[0].active, true);
  assert.strictEqual(loop.lastActivation, 0, 'le feedback de l\'objet cliqué est armé');
  assert.strictEqual(state.avatarX, 200,
    'un clic sur un objet ne doit PAS être aussi interprété comme un déplacement');
});

test('input: un clic sur le terminal ouvert déclenche la victoire', () => {
  const { doc, container } = freshPage();
  const state = new GameState(1);
  setupInput(state, { lastActivation: null });

  state.objectsActive = state.objectsRequired;
  state.updateGate();
  renderScene(state);

  fireClick(container, doc.querySelector('.game-terminal'));
  assert.strictEqual(state.won, true, 'terminal ouvert + avatar à portée => victoire');
});

test('input: un clic sur #restart relance la partie via la boucle', () => {
  const { doc } = freshPage();
  const state = new GameState(1);
  let relances = 0;
  setupInput(state, { lastActivation: null, restart: () => { relances += 1; } });

  state.won = true;
  renderHud(state); // matérialise l'overlay et son bouton #restart

  fireClick(doc.body, doc.getElementById('restart'));
  assert.strictEqual(relances, 1, '#restart doit atteindre la boucle exactement une fois');
});

// =============================================================================
// main.mjs — composition root et boucle
// =============================================================================

test('main: une partie neuve ne tourne pas avant run()', () => {
  freshPage();
  const g = new Game();
  assert.strictEqual(g.running, false, 'la boucle ne démarre jamais à la construction');
  assert.strictEqual(g.lastActivation, null);
});

test('main: init() peint la scène ET le HUD avant tout premier paint', () => {
  const { doc } = freshPage();
  const g = new Game();
  g.init();

  assert.notStrictEqual(doc.querySelector('.game-avatar'), null, 'scène peinte par init()');
  assert.notStrictEqual(doc.getElementById('hud-objective'), null, 'HUD peint par init()');
  assert.strictEqual(globalThis.window.__game, g.state, 'état exposé pour l\'e2e');
});

test('main: run() démarre la boucle', () => {
  freshPage();
  const g = new Game();
  g.run();
  try {
    assert.strictEqual(g.running, true, 'run() DOIT armer la boucle');
  } finally {
    g.running = false; // arrête la boucle : un test ne laisse pas tourner le jeu
  }
});

test('main: tick() consomme exactement une activation en attente', () => {
  const { doc } = freshPage();
  const g = new Game();
  g.init();
  g.state.objects[0].visible = true;
  g.state.activateObject(0);
  g.lastActivation = 0;

  g.tick();

  assert.strictEqual(g.lastActivation, null,
    'le feedback en attente doit être joué PUIS remis à null (jamais rejoué deux fois)');
  assert.notStrictEqual(doc.querySelector('[data-id="0"]'), null, 'la scène est re-rendue');
});

test('main: restart() remet la partie à zéro et relance la boucle', () => {
  const { doc } = freshPage();
  const g = new Game();
  g.init();
  g.running = false;

  g.state.objects[0].visible = true;
  g.state.activateObject(0);
  g.state.won = true;
  assert.strictEqual(g.state.objectsActive, 1);

  g.restart();
  try {
    assert.strictEqual(g.running, true, 'restart() depuis une boucle arrêtée DOIT la relancer');
    assert.strictEqual(g.state.objectsActive, 0, 'compteur remis à zéro');
    assert.strictEqual(g.state.terminalState, 'LOCKED', 'gate refermé');
    assert.strictEqual(g.state.won, false, 'partie non gagnée');
    assert.strictEqual(g.lastActivation, null, 'aucun feedback résiduel');
    assert.strictEqual(doc.getElementById('overlay').classList.contains('hidden'), true,
      'overlay de fin re-caché après restart');
  } finally {
    g.running = false;
  }
});

test('main: le module s\'auto-câble sur DOMContentLoaded en contexte navigateur', () => {
  const listeners = bootDoc.listeners['DOMContentLoaded'] || [];
  assert.strictEqual(listeners.length > 0, true,
    'main.mjs doit enregistrer son point d\'entrée quand window existe');
});
