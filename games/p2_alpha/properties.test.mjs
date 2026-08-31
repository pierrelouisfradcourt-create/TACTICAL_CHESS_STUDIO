// properties.test.mjs — render.mjs (R15-R22), input.mjs (R12-R14), main.mjs (R23),
// plus les propriétés de monotonie du présent.
//
// Ces trois modules pilotent le DOM et le canvas : sans harnais, ils ne sont
// jamais exécutés hors navigateur et AUCUNE de leurs décisions n'est prouvée.
// Le harnais ci-dessous est un double d'observation — il ENREGISTRE ce que le
// rendu dessine et ce que l'overlay écrit, au lieu de le supposer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createState, STRUCTURE, click, step, buyGenerator, reset, isVictory,
  getThresholdIndex, unlockedGenerators,
} from './economy.mjs';
import { createRenderer, renderFrame, syncOverlay, LAYOUT, CANVAS_WIDTH } from './render.mjs';
import {
  handleCoreClick, handleBuy, handleBuyUpgrade, handleReplay,
  setupInputHandlers, injectDebugApi,
} from './input.mjs';
import { initGame, startGame, stopGame, getGameInstance } from './main.mjs';

const S = STRUCTURE.thresholds;

// ─────────────────────────────────────────────────────────────────────────────
// Harnais DOM / canvas — double d'OBSERVATION, jamais de simulation de logique
// ─────────────────────────────────────────────────────────────────────────────

function fakeClassList() {
  const classes = new Set();
  return {
    classes,
    contains: (c) => classes.has(c),
    add: (c) => classes.add(c),
    remove: (c) => classes.delete(c),
    toggle: (c, force) => (force ? classes.add(c) : classes.delete(c)),
  };
}

function fakeElement(id = '', tag = 'div') {
  const listeners = new Map();
  const el = {
    id,
    tagName: tag.toUpperCase(),
    textContent: '',
    disabled: false,
    style: {},
    dataset: {},
    attributes: {},
    classList: fakeClassList(),
    children: [],
    parentNode: null,
    width: 800,
    height: 600,
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return this.attributes[k]; },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    // Un « clic réel » sur ce double : rejoue exactement les écouteurs posés par input.mjs.
    click(target = el) {
      for (const fn of listeners.get('click') || []) fn({ type: 'click', target });
    },
    listenerCount(type) { return (listeners.get(type) || []).length; },
    closest(selector) {
      let node = this;
      while (node) {
        if (selector === '[data-upgrade-id]' && node.dataset.upgradeId !== undefined) return node;
        node = node.parentNode;
      }
      return null;
    },
    getContext: () => el._ctx,
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this.children.map((c) => c.textContent).join(''); },
    set(v) { assert.equal(v, '', 'innerHTML n\'est utilisé que pour vider'); this.children = []; },
  });
  return el;
}

// Contexte 2D enregistreur : chaque appel de dessin et chaque style posé est conservé.
function recordingContext() {
  const ctx = {
    fills: [], strokes: [], rects: [], strokeRects: [], texts: [], arcs: [],
    _fillStyle: '', _strokeStyle: '',
    font: '', lineWidth: 0, textAlign: '', textBaseline: '',
    get fillStyle() { return this._fillStyle; },
    set fillStyle(v) { this._fillStyle = v; this.fills.push(typeof v === 'string' ? v : 'gradient'); },
    get strokeStyle() { return this._strokeStyle; },
    set strokeStyle(v) { this._strokeStyle = v; this.strokes.push(v); },
    fillRect(x, y, w, h) { this.rects.push({ x, y, w, h, style: this._fillStyle }); },
    strokeRect(x, y, w, h) { this.strokeRects.push({ x, y, w, h }); },
    fillText(t, x, y) { this.texts.push({ t: String(t), x, y }); },
    beginPath() {}, fill() {}, stroke() {},
    arc(x, y, r) { this.arcs.push({ x, y, r }); },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  return ctx;
}

// `render.syncOverlay` construit de vrais nœuds (colonne, boutons d'amélioration) :
// sans `document`, ces branches ne s'exécutent jamais. Le défaut ci-dessous vaut
// pour les tests qui n'installent pas de navigateur complet (voir `withBrowser`).
globalThis.document = {
  getElementById: () => null,
  createElement: (tag) => fakeElement('', tag),
};

function makeCanvas() {
  const canvas = fakeElement('game-canvas', 'canvas');
  canvas._ctx = recordingContext();
  return canvas;
}

// Le calque overlay tel que main.queryOverlay l'attend (mêmes ids qu'index.html).
const OVERLAY_IDS = [
  'coeur-de-lumen', 'buy-g1', 'buy-g2', 'buy-g3', 'buy-g4', 'upgrade-container',
  'rejouer', 'victory-overlay', 'r_counter', 'objectif', 'progress-meter',
  'colonne_generateurs', 'threshold-reveal',
];

function makeOverlay() {
  const byId = new Map(OVERLAY_IDS.map((id) => [id, fakeElement(id)]));
  return {
    byId,
    dom: {
      coeurDeLumen: byId.get('coeur-de-lumen'),
      buyButtons: ['buy-g1', 'buy-g2', 'buy-g3', 'buy-g4'].map((id) => byId.get(id)),
      upgradeContainer: byId.get('upgrade-container'),
      rejouer: byId.get('rejouer'),
      victoryOverlay: byId.get('victory-overlay'),
      rCounter: byId.get('r_counter'),
      objectif: byId.get('objectif'),
      progressMeter: byId.get('progress-meter'),
      colonneGenerateurs: byId.get('colonne_generateurs'),
      thresholdReveal: byId.get('threshold-reveal'),
    },
  };
}

// Installe un `document`/`window` globaux le temps d'un test (main.mjs et
// render.syncOverlay les utilisent réellement), puis les retire.
function withBrowser(fn) {
  const canvas = makeCanvas();
  const overlay = makeOverlay();
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.document = {
    getElementById: (id) => (id === 'game-canvas' ? canvas : overlay.byId.get(id) || null),
    createElement: (tag) => fakeElement('', tag),
  };
  globalThis.window = {};
  try {
    return fn({ canvas, ctx: canvas._ctx, overlay, dom: overlay.dom, window: globalThis.window });
  } finally {
    stopGame();
    globalThis.document = previous.document;
    globalThis.window = previous.window;
  }
}

// Rend une frame sur un état donné et retourne le contexte enregistré.
function frameFor(state, patchRenderer = () => {}) {
  const canvas = makeCanvas();
  const renderer = createRenderer(canvas, state);
  renderer.thresholdRevealOpacity = 0;
  patchRenderer(renderer);
  renderFrame(renderer, state);
  return { ctx: canvas._ctx, renderer };
}

// ─────────────────────────────────────────────────────────────────────────────
// R15 / R21 — compteur permanent et fond ascendant
// ─────────────────────────────────────────────────────────────────────────────

test('R15: le compteur affiche EXACTEMENT floor(solde_mR / 1000), du premier R au million', () => {
  const state = createState();
  for (const solde of [0, 999, 1000, 1999, 1_000_000_000]) {
    state.solde_mR = solde;
    const { ctx } = frameFor(state);
    const compteur = ctx.texts.find((t) => t.t.startsWith('R: '));
    assert.ok(compteur, 'le compteur R est dessiné à chaque frame');
    assert.equal(compteur.t, `R: ${Math.floor(solde / 1000).toLocaleString()}`);
  }
});

test('R15b: syncOverlay écrit le même compteur dans le DOM, sans muter l\'état', () => {
  const state = createState();
  state.solde_mR = 1999;
  const avant = JSON.stringify({ ...state, upgrades_owned: [...state.upgrades_owned] });
  const { dom } = makeOverlay();
  syncOverlay(dom, state, null);
  assert.equal(dom.rCounter.textContent, '1');
  assert.equal(
    JSON.stringify({ ...state, upgrades_owned: [...state.upgrades_owned] }), avant,
    'le rendu ne mute JAMAIS l\'état economy',
  );
});

test('R21: le fond s\'éclaircit d\'un cran par seuil franchi, jamais avant', () => {
  const state = createState();
  const paliers = [0, ...S].map((cumul) => {
    state.cumul_mR = cumul;
    const { ctx } = frameFor(state);
    return ctx.rects[0].style; // le fond est le premier rectangle de la frame
  });

  assert.equal(paliers.length, 6);
  assert.equal(new Set(paliers).size, 6, 'un cran DISTINCT par seuil, aucun palier dupliqué');
  assert.equal(paliers[0], '#0B0E17', 'bleu-nuit au départ');

  // Monotonie réelle sur la luminosité, pas sur un index.
  const luminance = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16)
    + parseInt(hex.slice(5, 7), 16);
  for (let i = 1; i < paliers.length; i++) {
    assert.ok(luminance(paliers[i]) > luminance(paliers[i - 1]),
      `le fond du palier ${i} doit être strictement plus clair que le précédent`);
  }

  // Un mR sous S1 : le fond est encore celui du départ.
  state.cumul_mR = S[0] - 1;
  assert.equal(frameFor(state).ctx.rects[0].style, '#0B0E17');
});

// ─────────────────────────────────────────────────────────────────────────────
// R16 — VFX de clic
// ─────────────────────────────────────────────────────────────────────────────

test('R16: le VFX de clic affiche +N et vieillit de 16 ms par frame', () => {
  const state = createState();
  const { ctx, renderer } = frameFor(state, (r) => { r.lastClickBurst = { gain: 3000, age: 0 }; });

  assert.ok(ctx.texts.some((t) => t.t === '+3'), 'le gain du clic est affiché en R');
  assert.equal(renderer.lastClickBurst.age, 16, 'l\'âge avance EXACTEMENT d\'une frame');
});

test('R16b: sans clic récent, aucun VFX n\'est dessiné et rien ne casse', () => {
  const state = createState();
  // Le libellé du VFX est « +N » nu ; « +0.1/s » est le débit de la colonne générateurs.
  const burst = (ctx) => ctx.texts.some((t) => /^\+\d+$/.test(t.t));

  const sansClic = frameFor(state); // lastClickBurst === null
  assert.equal(burst(sansClic.ctx), false);

  const expire = frameFor(state, (r) => { r.lastClickBurst = { gain: 1000, age: 600 }; });
  assert.equal(burst(expire.ctx), false, 'le VFX disparaît EXACTEMENT à 600 ms');
  assert.equal(expire.renderer.lastClickBurst.age, 600, 'un VFX expiré ne vieillit plus');
});

// ─────────────────────────────────────────────────────────────────────────────
// R17 / R18 — boutons d'achat et colonne des générateurs
// ─────────────────────────────────────────────────────────────────────────────

test('R17: le bouton d\'achat bascule grisé/actif à la frontière EXACTE du coût', () => {
  const state = createState();
  const { dom } = makeOverlay();

  state.solde_mR = 15000 - 1;
  syncOverlay(dom, state, null);
  assert.equal(dom.buyButtons[0].disabled, true, 'un mR sous le coût : grisé');
  assert.equal(dom.buyButtons[0].classList.contains('disabled'), true);

  state.solde_mR = 15000;
  syncOverlay(dom, state, null);
  assert.equal(dom.buyButtons[0].disabled, false, 'au coût EXACT : cliquable');
  assert.equal(dom.buyButtons[0].classList.contains('disabled'), false);
  assert.equal(dom.buyButtons[0].textContent, 'G1: 15R');
});

test('R18: G2 n\'apparaît dans la colonne et les boutons qu\'à S1 EXACTEMENT', () => {
  const state = createState();
  const { dom } = makeOverlay();

  state.cumul_mR = S[0] - 1;
  syncOverlay(dom, state, null);
  assert.equal(dom.colonneGenerateurs.children.length, 1, 'une seule silhouette avant S1');
  assert.equal(dom.buyButtons[1].classList.contains('hidden'), true);

  state.cumul_mR = S[0];
  syncOverlay(dom, state, null);
  assert.equal(dom.colonneGenerateurs.children.length, 2, 'une entrée auparavant ABSENTE apparaît');
  assert.equal(dom.colonneGenerateurs.children[1].textContent, 'G2: 0');
  assert.equal(dom.buyButtons[1].classList.contains('hidden'), false);

  state.cumul_mR = S[2];
  syncOverlay(dom, state, null);
  assert.equal(dom.colonneGenerateurs.children.length, 4);
});

test('R18b: chaque palier de la colonne a une silhouette de couleur distincte', () => {
  const state = createState();
  state.cumul_mR = S[2]; // G1..G4 déverrouillés
  const { ctx } = frameFor(state);
  const couleurs = ['#FFD700', '#FFA500', '#FF6347', '#8B008B'];
  for (const c of couleurs) {
    assert.ok(ctx.rects.some((r) => r.style === c && r.w === 10),
      `le repère coloré ${c} doit être dessiné`);
  }
  assert.equal(new Set(couleurs).size, 4);
});

// ─────────────────────────────────────────────────────────────────────────────
// R19 / R20 — flash de seuil et jauge de proximité
// ─────────────────────────────────────────────────────────────────────────────

test('R19: le flash de seuil s\'estompe d\'un cran par frame et se voit dans l\'overlay', () => {
  const state = createState();
  const { renderer } = frameFor(state, (r) => { r.thresholdRevealOpacity = 1; });
  assert.equal(renderer.thresholdRevealOpacity, 1 - 0.05, 'l\'opacité DÉCROÎT à chaque frame');

  const { dom } = makeOverlay();
  syncOverlay(dom, state, { thresholdRevealOpacity: 0.5 });
  assert.equal(dom.thresholdReveal.style.opacity, '0.5', 'l\'opacité réelle est reportée telle quelle');

  syncOverlay(dom, state, { thresholdRevealOpacity: 0 });
  assert.equal(dom.thresholdReveal.style.opacity, '0');
});

test('R20: la jauge est monotone entre deux seuils et pleine une fois tout franchi', () => {
  const state = createState();
  const { dom } = makeOverlay();
  const largeur = () => {
    syncOverlay(dom, state, null);
    return parseInt(dom.progressMeter.style.width, 10);
  };

  state.cumul_mR = 0;
  assert.equal(largeur(), 0, 'vide juste après un seuil');
  state.cumul_mR = S[0] / 2;
  assert.equal(largeur(), 50, 'à mi-chemin de S1 : 50 %');
  state.cumul_mR = S[0] - 1;
  assert.equal(largeur(), 100, 'juste avant S1 : pleine');

  // Palier suivant : la jauge repart du seuil précédent, pas de zéro absolu.
  state.cumul_mR = S[0];
  assert.equal(largeur(), 0, 'S1 franchi : la jauge repart vers S2');
  state.cumul_mR = S[0] + (S[1] - S[0]) / 2;
  assert.equal(largeur(), 50);

  state.cumul_mR = S[4];
  assert.equal(largeur(), 100, 'tout franchi : pleine, jamais NaN');

  // Monotonie À L'INTÉRIEUR d'un palier : au seuil, la jauge repart à 0 par
  // construction — l'inclure mesurerait la remise à zéro, pas la monotonie.
  let precedente = -1;
  for (let cumul = 0; cumul < S[0]; cumul += S[0] / 20) {
    state.cumul_mR = cumul;
    const w = largeur();
    assert.ok(w >= precedente, 'la jauge ne décroît jamais dans un palier');
    precedente = w;
  }
});

test('R20b: la jauge n\'est plus dessinée une fois le dernier seuil franchi', () => {
  const state = createState();
  state.cumul_mR = S[4] - 1;
  assert.equal(frameFor(state).ctx.strokeRects.length, 1, 'un mR sous S5 : la jauge est là');

  state.cumul_mR = S[4];
  assert.equal(frameFor(state).ctx.strokeRects.length, 0, 'à S5 EXACTEMENT : plus rien à viser');
});

// ─────────────────────────────────────────────────────────────────────────────
// R22 — écran de victoire, aucun état d'échec
// ─────────────────────────────────────────────────────────────────────────────

test('R22: l\'écran de victoire s\'affiche à S5 EXACTEMENT, jamais avant', () => {
  const state = createState();
  const victoire = (ctx) => ctx.texts.some((t) => t.t === 'VICTORY!');

  state.cumul_mR = S[4] - 1;
  assert.equal(victoire(frameFor(state).ctx), false, 'un mR sous S5 : pas d\'écran de victoire');

  state.cumul_mR = S[4];
  const { ctx } = frameFor(state);
  assert.equal(victoire(ctx), true);
  assert.ok(ctx.texts.some((t) => t.t === 'Rejouer'), 'le bouton Rejouer est proposé');

  const { dom } = makeOverlay();
  state.cumul_mR = S[4] - 1;
  syncOverlay(dom, state, null);
  assert.equal(dom.victoryOverlay.classList.contains('hidden'), true);
  state.cumul_mR = S[4];
  syncOverlay(dom, state, null);
  assert.equal(dom.victoryOverlay.classList.contains('hidden'), false);
});

test('R22b: le conteneur d\'améliorations est visible dès qu\'une amélioration existe', () => {
  const state = createState();
  const { dom } = makeOverlay();

  syncOverlay(dom, state, null);
  assert.equal(dom.upgradeContainer.classList.contains('hidden'), false,
    'clic_x2 est disponible dès le départ : le conteneur est visible');
  assert.equal(dom.upgradeContainer.children.length, 1);
  assert.equal(dom.upgradeContainer.children[0].disabled, true, 'grisée tant que le solde manque');

  state.solde_mR = STRUCTURE.upgrades.clic_x2.cost;
  syncOverlay(dom, state, null);
  assert.equal(dom.upgradeContainer.children[0].disabled, false, 'au coût EXACT : cliquable');

  // Aucune amélioration disponible => conteneur masqué.
  state.upgrades_owned.add('clic_x2');
  state.upgrades_owned.add('clic_x4');
  syncOverlay(dom, state, null);
  assert.equal(dom.upgradeContainer.children.length, 0);
  assert.equal(dom.upgradeContainer.classList.contains('hidden'), true);
});

test('R22c: le bouton d\'amélioration distingue visuellement ses deux états', () => {
  const state = createState();
  state.cumul_mR = S[3];
  state.solde_mR = STRUCTURE.upgrades.clic_x2.cost - 1;
  assert.equal(frameFor(state).ctx.rects.some((r) => r.style === '#7B5CFF'), false,
    'un mR sous le coût : aucun bouton d\'amélioration actif');

  state.solde_mR = STRUCTURE.upgrades.clic_x2.cost;
  const { ctx } = frameFor(state);
  assert.ok(ctx.rects.some((r) => r.style === '#7B5CFF'), 'au coût EXACT : état actif');
  assert.ok(ctx.rects.some((r) => r.style === '#3A3060'), 'les autres restent grisées');
});

// ─────────────────────────────────────────────────────────────────────────────
// R12 / R13 / R14 — entrées
// ─────────────────────────────────────────────────────────────────────────────

test('R12: un clic sur le Cœur crédite le gain et notifie une seule fois', () => {
  const state = createState();
  const gains = [];
  let changements = 0;
  handleCoreClick(state, {
    onCoreClick: (gain) => gains.push(gain),
    onStateChanged: () => { changements++; },
  });
  assert.equal(state.solde_mR, 1000);
  assert.deepEqual(gains, [1000]);
  assert.equal(changements, 1);
});

test('R13: un achat refusé ne notifie AUCUN changement d\'état', () => {
  const state = createState();
  let changements = 0;
  const callbacks = { onStateChanged: () => { changements++; } };

  state.solde_mR = 15000 - 1;
  assert.equal(handleBuy(state, callbacks, 0), false);
  assert.equal(changements, 0, 'un refus ne déclenche aucun re-rendu');
  assert.equal(state.generators[0].count, 0);

  state.solde_mR = 15000;
  assert.equal(handleBuy(state, callbacks, 0), true);
  assert.equal(changements, 1);
  assert.equal(state.generators[0].count, 1);
});

test('R13b: une amélioration refusée ne notifie AUCUN changement d\'état', () => {
  const state = createState();
  let changements = 0;
  const callbacks = { onStateChanged: () => { changements++; } };

  state.solde_mR = STRUCTURE.upgrades.clic_x2.cost - 1;
  assert.equal(handleBuyUpgrade(state, callbacks, 'clic_x2'), false);
  assert.equal(changements, 0);
  assert.equal(state.gain_clic_mR, 1000);

  state.solde_mR = STRUCTURE.upgrades.clic_x2.cost;
  assert.equal(handleBuyUpgrade(state, callbacks, 'clic_x2'), true);
  assert.equal(changements, 1);
  assert.equal(state.gain_clic_mR, 2000);
});

test('R14: handleReplay délègue au rappel de rejeu, et ne casse pas sans rappel', () => {
  let rejeux = 0;
  handleReplay({ onReplay: () => { rejeux++; } });
  assert.equal(rejeux, 1);
  assert.doesNotThrow(() => handleReplay({}));
});

test('R12-R14: setupInputHandlers câble les affordances réelles du calque DOM', () => {
  const state = createState();
  const { dom } = makeOverlay();
  let rejeux = 0;
  setupInputHandlers(dom, state, { onReplay: () => { rejeux++; } });

  dom.coeurDeLumen.click();
  assert.equal(state.solde_mR, 1000, 'le clic sur le Cœur passe par economy');

  state.solde_mR = 15000;
  dom.buyButtons[0].click();
  assert.equal(state.generators[0].count, 1);
  assert.equal(state.solde_mR, 0);

  dom.rejouer.click();
  assert.equal(rejeux, 1);

  // Délégation : un bouton d'amélioration recréé à chaque frame reste actif.
  state.solde_mR = STRUCTURE.upgrades.clic_x2.cost;
  syncOverlay(dom, state, null);
  const bouton = dom.upgradeContainer.children[0];
  assert.equal(bouton.dataset.upgradeId, 'clic_x2');
  dom.upgradeContainer.click(bouton);
  assert.equal(state.gain_clic_mR, 2000, 'un seul écouteur survit aux recréations');
  assert.equal(dom.upgradeContainer.listenerCount('click'), 1);
});

test('injectDebugApi n\'expose le hook que sous un vrai window, et borne son index', () => {
  const state = createState();
  const precedent = globalThis.window;
  globalThis.window = {};
  try {
    injectDebugApi(state, {});
    assert.equal(typeof globalThis.window.__game_debug, 'object',
      'le hook doit exister quand window existe');

    globalThis.window.__game_debug.reachThreshold(0);
    assert.equal(state.cumul_mR, S[0], 'index 0 : premier seuil EXACT');

    globalThis.window.__game_debug.reachThreshold(4);
    assert.equal(state.cumul_mR, S[4]);

    globalThis.window.__game_debug.reachThreshold(99);
    assert.equal(state.cumul_mR, S[4], 'index hors bornes : état INCHANGÉ');
    globalThis.window.__game_debug.reachThreshold(-1);
    assert.equal(state.cumul_mR, S[4]);

    assert.equal(globalThis.window.__game_debug.getState(), state);
  } finally {
    globalThis.window = precedent;
  }
});

test('injectDebugApi ne lève rien lorsqu\'aucun window n\'existe (hors navigateur)', () => {
  const precedent = globalThis.window;
  delete globalThis.window;
  try {
    assert.doesNotThrow(() => injectDebugApi(createState(), {}));
  } finally {
    globalThis.window = precedent;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// R23 — orchestration : boucle, exposition, transitions
// ─────────────────────────────────────────────────────────────────────────────

test('R23: initGame expose window.__game et laisse la boucle À L\'ARRÊT', () => {
  withBrowser(({ window }) => {
    const jeu = initGame('game-canvas');
    assert.equal(jeu.running, false, 'initGame ne démarre PAS la boucle');
    assert.equal(getGameInstance(), jeu);
    assert.equal(window.__game, jeu.state, 'l\'état est exposé pour l\'observation externe');
    assert.equal(jeu.state.tick, 0);
    assert.equal(jeu.tick_ms, 100);
  });
});

test('R23b: startGame lance la boucle et avance l\'état d\'un tick, sans clic', () => {
  withBrowser(() => {
    const jeu = initGame('game-canvas');
    jeu.state.generators[0].count = 1;
    startGame();
    assert.equal(jeu.running, true, 'la boucle tourne après startGame');
    assert.equal(jeu.state.tick, 1, 'un tick de logique a été exécuté');
    assert.equal(jeu.state.solde_mR, 10, 'production automatique : aucun clic requis');
    stopGame();
    assert.equal(jeu.running, false, 'stopGame arrête réellement la boucle');
    const tickArret = jeu.state.tick;
    startGame();
    assert.equal(jeu.state.tick, tickArret + 1, 'la boucle peut repartir');
  });
});

test('R23c: le franchissement de seuil déclenche le flash à un tick QUELCONQUE', () => {
  withBrowser(({ overlay }) => {
    const jeu = initGame('game-canvas');
    jeu.state.generators[0].count = 1;
    jeu.state.cumul_mR = S[0] - 10; // un tick de production suffit à franchir S1
    assert.equal(jeu.renderer.thresholdRevealOpacity, 0);

    startGame();
    assert.equal(getThresholdIndex(jeu.state.cumul_mR), 1, 'S1 franchi par la production seule');
    assert.ok(jeu.renderer.thresholdRevealOpacity > 0, 'le flash est armé sans aucun clic');
    assert.ok(parseFloat(overlay.dom.thresholdReveal.style.opacity) > 0);
  });
});

test('R23d: la victoire arrête la boucle ; le rejeu remet à zéro et la relance', () => {
  withBrowser(({ overlay, window }) => {
    const evenements = [];
    const jeu = initGame('game-canvas', (e) => evenements.push(e));
    jeu.state.cumul_mR = S[4];

    startGame();
    assert.equal(isVictory(jeu.state), true);
    assert.equal(jeu.running, false, 'la boucle DOIT s\'arrêter à la victoire');
    assert.deepEqual(evenements, ['victory']);
    assert.equal(overlay.dom.victoryOverlay.classList.contains('hidden'), false);

    overlay.dom.rejouer.click();
    assert.equal(jeu.state.solde_mR, 0, 'reset EXACT du solde');
    assert.equal(jeu.state.cumul_mR, 0);
    assert.equal(window.__game, jeu.state, 'la référence exposée reste valide après reset');
    assert.deepEqual(evenements, ['victory', 'replay']);
    assert.equal(overlay.dom.victoryOverlay.classList.contains('hidden'), true);
    assert.equal(jeu.running, true, 'le rejeu relance la partie, ne la laisse pas figée');
  });
});

test('R23e: initGame refuse un canvas inexistant plutôt que de tourner à vide', () => {
  withBrowser(() => {
    assert.throws(() => initGame('canvas-absent'), /not found/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Propriétés transverses
// ─────────────────────────────────────────────────────────────────────────────

test('Propriété: cumul_mR ne décroît jamais, solde décroît UNIQUEMENT à l\'achat', () => {
  const state = createState();
  let achats = 0;
  for (let i = 0; i < 400; i++) {
    const cumulAvant = state.cumul_mR;
    const soldeAvant = state.solde_mR;
    click(state);
    step(state);
    assert.ok(state.cumul_mR > cumulAvant, 'un clic fait toujours croître le cumul');
    assert.ok(state.solde_mR > soldeAvant);

    const avantAchat = state.solde_mR;
    if (buyGenerator(state, 0)) {
      achats++;
      assert.ok(state.solde_mR < avantAchat, 'seul un achat fait décroître le solde');
    }
  }
  assert.ok(achats > 0, 'la propriété est réellement exercée');
});

test('Propriété: les seuils sont strictement croissants et cohérents avec l\'affichage', () => {
  for (let i = 1; i < S.length; i++) {
    assert.ok(S[i] > S[i - 1], `S${i + 1} doit dépasser S${i}`);
  }
  assert.equal(S[4], 1_000_000_000, 'objectif terminal : 1 000 000 R en milli-R');
  assert.equal(LAYOUT.core.x, CANVAS_WIDTH / 2, 'le Cœur est centré');
});

test('Propriété: reset ramène le présent à son état de départ', () => {
  const state = createState();
  const { dom } = makeOverlay();
  state.cumul_mR = S[2];
  state.solde_mR = S[2];
  syncOverlay(dom, state, null);
  assert.equal(dom.colonneGenerateurs.children.length, 4);
  assert.deepEqual(unlockedGenerators(state), [0, 1, 2, 3]);

  reset(state);
  syncOverlay(dom, state, null);
  assert.equal(dom.colonneGenerateurs.children.length, 1, 'le présent suit le reset');
  assert.equal(dom.rCounter.textContent, '0');
  assert.equal(dom.victoryOverlay.classList.contains('hidden'), true);
});
