// Suite de PROPRIÉTÉS — filet du gate mutation. Chaque propriété vise un endroit
// où une mutation (>= -> >, && -> ||, true -> false, += -> -=) changerait un
// comportement observable. Elles asservissent les couches que `logic.test.mjs` ne
// couvre pas : `render` et `main`, qui touchent `document`/`window` directement.
//
// Lancement : node properties.test.mjs

import { pathToFileURL } from 'node:url';
import * as Logic from './logic.mjs';
import * as Data from './data.mjs';
import * as Render from './render.mjs';
import * as Input from './input.mjs';

const G1 = Data.GENERATORS[0];

// --- faux DOM minimal --------------------------------------------------------------
// `render`/`main` sont les couches de présentation et de composition : elles parlent
// au DOM sans adaptateur injecté (c'est leur rôle). Pour les tester sans navigateur,
// on stube exactement la surface qu'elles utilisent, pas une de plus.
class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.id = '';
    this.className = '';
    this.textContent = '';
    this.src = '';
    this.alt = '';
    this.style = { cssText: '' };
    this.dataset = {};
    this.disabled = false;
    this.children = [];
    this.parent = null;
    this.listeners = {};
    const classSet = new Set();
    this.classList = {
      toggle: (name, force) => {
        const shouldHave = force === undefined ? !classSet.has(name) : !!force;
        if (shouldHave) classSet.add(name);
        else classSet.delete(name);
        return shouldHave;
      },
      contains: (name) => classSet.has(name),
    };
  }

  set innerHTML(v) {
    if (v === '') {
      for (const child of this.children) child.parent = null;
      this.children = [];
    }
  }

  get innerHTML() {
    return '';
  }

  appendChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }

  removeEventListener(type, fn) {
    if (this.listeners[type]) this.listeners[type] = this.listeners[type].filter((f) => f !== fn);
  }

  matches(selector) {
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector === '[data-generator-id]') return this.dataset.generatorId !== undefined;
    return false;
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches(selector)) return node;
      node = node.parent;
    }
    return null;
  }
}

function makeFakeDocument() {
  const stats = { createCount: 0, domContentLoadedRegistered: false };
  const registry = {};
  return {
    readyState: 'complete',
    body: new FakeElement('body'),
    stats,
    registry,
    createElement(tag) {
      stats.createCount += 1;
      return new FakeElement(tag);
    },
    getElementById(id) {
      return registry[id] || null;
    },
    addEventListener(type) {
      if (type === 'DOMContentLoaded') stats.domContentLoadedRegistered = true;
    },
  };
}

/** Cherche en profondeur le premier descendant portant cet id. */
function findById(node, id) {
  for (const child of node.children) {
    if (child.id === id) return child;
    const deep = findById(child, id);
    if (deep) return deep;
  }
  return null;
}

/** Collecte en profondeur tous les descendants satisfaisant un prédicat. */
function collect(node, predicate, out = []) {
  for (const child of node.children) {
    if (predicate(child)) out.push(child);
    collect(child, predicate, out);
  }
  return out;
}

/** Rend dans un conteneur neuf, sur un document stubé, puis nettoie le global. */
function withDOM(fn) {
  const doc = makeFakeDocument();
  globalThis.document = doc;
  try {
    return fn(doc);
  } finally {
    delete globalThis.document;
  }
}

/** Instance FRAÎCHE de main.mjs : il se câble à l'import, chaque scénario a besoin
 *  de sa propre évaluation de module (cache-buster sur l'URL). */
async function importFreshMain() {
  const url = `${new URL('./main.mjs', import.meta.url).href}?scenario=${Math.random()}`;
  return import(url);
}

// --- propriétés de logic (garde-fous supplémentaires) --------------------------------

export function prop_accrueIsTheOnlyCredit() {
  const state = Logic.createState();
  // Un montant nul ou négatif ne crédite RIEN — pas de récompense fantôme.
  if (Logic.accrue(state, 0) !== 0 || state.lifetimeEarned !== 0) return false;
  if (Logic.accrue(state, -1) !== 0 || state.resourceCounter !== 0) return false;
  // Un achat DÉBITE sans jamais toucher au total récolté.
  Logic.accrue(state, 1000);
  const lifetime = state.lifetimeEarned;
  Logic.buyGenerator(state, G1.id);
  return state.lifetimeEarned === lifetime && state.resourceCounter === 1000 - G1.baseCost;
}

export function prop_gaugeNeverDecreasesAcrossPrestige() {
  const state = Logic.createState();
  let previous = 0;
  for (let i = 0; i < 1200; i++) {
    Logic.applyClick(state);
    if (Logic.canAfford(state, G1.id)) Logic.buyGenerator(state, G1.id);
    Logic.step(state, 1);
    if (state.resourceCounter >= Data.PRESTIGE.costThreshold) Logic.prestigeReset(state);
    const now = Logic.endGauge(state);
    if (now < previous) return false;
    previous = now;
  }
  return previous > 0;
}

export function prop_idleNeverWins() {
  const state = Logic.createState();
  for (let i = 0; i < 20000; i++) Logic.step(state, 1);
  return state.elapsedTicks === 20000 && Logic.endGauge(state) === 0 && !Logic.isVictory(state);
}

export function prop_victoryExactlyAtTarget() {
  const below = Logic.createState();
  Logic.accrue(below, Data.META.victoryTarget - 1);
  const at = Logic.createState();
  Logic.accrue(at, Data.META.victoryTarget);
  return !Logic.isVictory(below) && Logic.isVictory(at) && Logic.endGauge(at) === 1;
}

export function prop_prestigeBlockedAtCeiling() {
  const state = Logic.createState();
  state.prestigeCount = Data.PRESTIGE.maxPrestigeCount;
  Logic.accrue(state, Data.PRESTIGE.costThreshold * 10);
  const before = state.resourceCounter;
  return Logic.prestigeReset(state) === false && state.resourceCounter === before;
}

export function prop_stageGatesAreExact() {
  const state = Logic.createState();
  if (Logic.updateStage(state) !== 0) return false;
  for (let i = 0; i < Data.STAGE_GATES.length; i++) {
    const target = Math.pow(10, Data.STAGE_GATES[i] * Math.log10(1 + Data.META.victoryTarget)) - 1;
    const fresh = Logic.createState();
    Logic.accrue(fresh, target * 0.999);
    if (Logic.updateStage(fresh) !== i) return false;
    Logic.accrue(fresh, target - fresh.lifetimeEarned);
    if (Logic.updateStage(fresh) !== i + 1) return false;
  }
  return true;
}

// --- propriétés de render ------------------------------------------------------------

export function prop_formatNumberBoundaries() {
  const cases = [
    [0, '0'],
    [999, '999'],
    [1e3, '1.00K'],
    [1e6, '1.00M'],
    [1e9, '1.00B'],
    [1e12, '1.00T'],
  ];
  return cases.every(([input, expected]) => Render.formatNumber(input) === expected);
}

export function prop_stageHelpersClampToFamily() {
  const last = Data.META.numStages - 1;
  return (
    Render.stageSceneFor(0) === Data.ASSETS.stageScenes[0] &&
    Render.stageSceneFor(99) === Data.ASSETS.stageScenes[last] &&
    Render.stageTintFor(99) === Data.STAGE_TINTS[last] &&
    Render.stageNameFor(99) === Data.STAGE_NAMES[last]
  );
}

export function prop_renderNeedsAContainer() {
  return withDOM(() => Render.renderHTML(Logic.createState(), null) === null);
}

export function prop_renderShowsPlaySurfaceAndHidesOverlay() {
  return withDOM((doc) => {
    const container = doc.createElement('div');
    Render.renderHTML(Logic.createState(), container);
    const surface = findById(container, 'play-surface');
    const overlay = findById(container, 'overlay');
    return (
      !!surface &&
      !!overlay &&
      overlay.classList.contains('hidden') === true &&
      !!findById(container, 'goal-label') &&
      !!findById(container, 'resource-counter') &&
      !!findById(container, 'cps-readout') &&
      !!findById(container, 'generator-row') &&
      !!findById(container, 'end-gauge-bar')
    );
  });
}

/** R11 : à la victoire la surface est REMPLACÉE, pas recouverte. */
export function prop_victoryReplacesPlaySurface() {
  return withDOM((doc) => {
    const state = Logic.createState();
    Logic.accrue(state, Data.META.victoryTarget);
    const container = doc.createElement('div');
    Render.renderHTML(state, container);
    const overlay = findById(container, 'overlay');
    return (
      findById(container, 'play-surface') === null &&
      !!overlay &&
      overlay.classList.contains('hidden') === false &&
      !!findById(container, 'overlayTitle') &&
      !!findById(container, 'restart') &&
      findById(container, 'final-totals').textContent.includes('5.00M')
    );
  });
}

/** R3 : flotteur +N ET animation d'appui, tous deux ABSENTS au tick précédent. */
export function prop_clickFeedbackAppearsOnlyOnTheClickTick() {
  return withDOM((doc) => {
    Render.resetRenderState();
    const state = Logic.createState();
    const container = doc.createElement('div');

    // Tick précédent : aucun des deux signaux.
    Render.renderHTML(state, container);
    const before = Render.feedbackSnapshot();
    const floatersBefore = collect(container, (n) => n.className === 'floater').length;
    const targetBefore = findById(container, 'click-target');
    const vfxBefore = collect(container, (n) => n.src === Data.ASSETS.clickFeedbackVfx).length;
    if (before.floaters !== 0 || before.pressed !== false) return false;
    if (floatersBefore !== 0 || vfxBefore !== 0 || targetBefore.className !== '') return false;

    // Tick du clic : les DEUX signaux apparaissent.
    const gained = Logic.applyClick(state);
    const after = Render.renderClickFeedback(state, container, gained);
    const floatersAfter = collect(container, (n) => n.className === 'floater');
    const targetAfter = findById(container, 'click-target');
    const vfxAfter = collect(container, (n) => n.src === Data.ASSETS.clickFeedbackVfx).length;

    return (
      after.floaters === 1 &&
      after.pressed === true &&
      floatersAfter.length === 1 &&
      floatersAfter[0].textContent === '+1' &&
      vfxAfter === 1 &&
      targetAfter.className === 'pressed'
    );
  });
}

export function prop_feedbackDecaysAtItsExactLifetime() {
  Render.resetRenderState();
  Render.addFloatingText(3);
  Render.renderState.pressTicks = Render.FEEDBACK.pressLife;

  Render.updateFloatingTexts(Render.FEEDBACK.pressLife);
  if (Render.feedbackSnapshot().pressed !== false) return false;

  // Le flotteur vit encore juste avant sa fin de vie...
  if (Render.feedbackSnapshot().floaters !== 1) return false;
  Render.updateFloatingTexts(Render.FEEDBACK.floaterLife - Render.FEEDBACK.pressLife - 1);
  if (Render.feedbackSnapshot().floaters !== 1) return false;
  // ...et disparaît EXACTEMENT à l'échéance.
  Render.updateFloatingTexts(1);
  const cleared = Render.feedbackSnapshot();
  Render.resetRenderState();
  return cleared.floaters === 0 && cleared.pressed === false;
}

export function prop_generatorTileAffordableAtExactCost() {
  return withDOM((doc) => {
    const state = Logic.createState();
    Logic.accrue(state, G1.baseCost - 1);
    const container = doc.createElement('div');
    Render.renderHTML(state, container);
    const locked = findById(container, `gen-${G1.id}`);
    if (!locked || locked.disabled !== true || locked.className !== 'generator locked') return false;

    Logic.accrue(state, 1); // exactement le coût, pas un de plus
    const container2 = doc.createElement('div');
    Render.renderHTML(state, container2);
    const open = findById(container2, `gen-${G1.id}`);
    return !!open && open.disabled === false && open.className === 'generator affordable';
  });
}

export function prop_generatorTilesLiveInTheRow() {
  return withDOM((doc) => {
    const container = doc.createElement('div');
    Render.renderHTML(Logic.createState(), container);
    const row = findById(container, 'generator-row');
    const tiles = collect(row, (n) => n.dataset.generatorId !== undefined);
    return tiles.length === Data.GENERATORS.length;
  });
}

export function prop_generatorCountFallsBackToZero() {
  return withDOM((doc) => {
    const state = Logic.createState();
    delete state.generatorCounts[G1.id];
    const container = doc.createElement('div');
    Render.renderHTML(state, container);
    const tile = findById(container, `gen-${G1.id}`);
    const label = collect(tile, (n) => n.className === 'gen-label')[0];
    return !!label && label.textContent.includes('(0)') && !label.textContent.includes('NaN');
  });
}

export function prop_unaffordableCostStatesItsReason() {
  return withDOM((doc) => {
    const container = doc.createElement('div');
    Render.renderHTML(Logic.createState(), container);
    const tile = findById(container, `gen-${G1.id}`);
    const cost = collect(tile, (n) => n.className === 'gen-cost')[0];
    // Jamais un grisé muet : la raison du verrou est écrite (Art Bible).
    return !!cost && cost.textContent.includes('Il te faut') && cost.style.cssText.includes(Data.PALETTE.alert);
  });
}

export function prop_gaugeTurnsMilestoneExactlyAt90Percent() {
  return withDOM((doc) => {
    const below = Logic.createState();
    // Une jauge juste sous 0.9 reste ambre ; à 0.9 pile elle passe au violet jalon.
    Logic.accrue(below, Math.pow(10, 0.899 * Math.log10(1 + Data.META.victoryTarget)) - 1);
    const c1 = doc.createElement('div');
    Render.renderHTML(below, c1);
    const bar1 = findById(c1, 'end-gauge-bar');
    if (!bar1.style.cssText.includes(Data.PALETTE.value)) return false;

    const at = Logic.createState();
    Logic.accrue(at, Math.pow(10, 0.9 * Math.log10(1 + Data.META.victoryTarget)) - 1);
    const c2 = doc.createElement('div');
    Render.renderHTML(at, c2);
    const bar2 = findById(c2, 'end-gauge-bar');
    return bar2.style.cssText.includes(Data.PALETTE.milestone);
  });
}

export function prop_prestigeButtonAppearsOnlyWhenUsable() {
  return withDOM((doc) => {
    const below = Logic.createState();
    Logic.accrue(below, Data.PRESTIGE.costThreshold - 1);
    const c1 = doc.createElement('div');
    Render.renderHTML(below, c1);
    if (findById(c1, 'prestige-button') !== null) return false;

    const at = Logic.createState();
    Logic.accrue(at, Data.PRESTIGE.costThreshold);
    const c2 = doc.createElement('div');
    Render.renderHTML(at, c2);
    if (findById(c2, 'prestige-button') === null) return false;

    const capped = Logic.createState();
    Logic.accrue(capped, Data.PRESTIGE.costThreshold);
    capped.prestigeCount = Data.PRESTIGE.maxPrestigeCount;
    const c3 = doc.createElement('div');
    Render.renderHTML(capped, c3);
    return findById(c3, 'prestige-button') === null;
  });
}

export function prop_stageSceneFollowsTheStage() {
  return withDOM((doc) => {
    const state = Logic.createState();
    const c1 = doc.createElement('div');
    Render.renderHTML(state, c1);
    const banner1 = findById(c1, 'stage-banner').textContent;
    const scene1 = collect(c1, (n) => n.src === Data.ASSETS.stageScenes[0]).length;

    Logic.accrue(state, Data.META.victoryTarget * 0.5);
    Logic.syncProgress(state);
    const c2 = doc.createElement('div');
    Render.renderHTML(state, c2);
    const banner2 = findById(c2, 'stage-banner').textContent;
    const sceneLater = collect(c2, (n) => n.src === Data.ASSETS.stageScenes[state.currentStage]).length;

    return scene1 === 1 && sceneLater === 1 && banner1 !== banner2 && state.currentStage > 0;
  });
}

export function prop_everyDeclaredAssetIsRendered() {
  return withDOM((doc) => {
    const state = Logic.createState();
    Logic.accrue(state, Data.PRESTIGE.costThreshold);
    const container = doc.createElement('div');
    Render.renderHTML(state, container);
    const srcs = new Set(collect(container, (n) => n.tagName === 'img').map((n) => n.src));
    const expected = [
      Data.ASSETS.stageScenes[0],
      Data.ASSETS.questTracker,
      Data.ASSETS.resourceCounterFrame,
      Data.ASSETS.currencySymbol,
      Data.ASSETS.clickTarget,
      Data.ASSETS.generatorIcon,
      Data.ASSETS.buyButton,
      Data.ASSETS.progressEndIndicator,
      Data.ASSETS.victoryScreen,
    ];
    return expected.every((src) => srcs.has(src));
  });
}

export function prop_renderConsoleReportsNoneWhenEmpty() {
  const originalLog = console.log;
  const lines = [];
  console.log = (msg) => lines.push(String(msg));
  try {
    Render.renderConsole(Logic.createState());
  } finally {
    console.log = originalLog;
  }
  const joined = lines.join('\n');
  return joined.includes('none') && !joined.includes('CYCLE CLOS');
}

export function prop_renderConsoleAnnouncesVictory() {
  const state = Logic.createState();
  Logic.accrue(state, Data.META.victoryTarget);
  state.generatorCounts[G1.id] = 1;
  const originalLog = console.log;
  const lines = [];
  console.log = (msg) => lines.push(String(msg));
  try {
    Render.renderConsole(state);
  } finally {
    console.log = originalLog;
  }
  const joined = lines.join('\n');
  return joined.includes('CYCLE CLOS') && joined.includes(`${G1.id}:1`) && !joined.includes('none');
}

// --- propriétés de main (composition) -----------------------------------------------

// AWAIT obligatoire : les scénarios `main` sont asynchrones (import dynamique du
// module frais). Un `finally` synchrone démonterait `document`/`window` AVANT que
// le scénario ait fini de s'en servir.
async function withWindow(fn) {
  const doc = makeFakeDocument();
  const win = {};
  globalThis.document = doc;
  globalThis.window = win;
  try {
    return await fn(doc, win);
  } finally {
    delete globalThis.document;
    delete globalThis.window;
  }
}

export async function prop_mainAutoSetupWhenDocumentReady() {
  return withWindow(async (doc) => {
    doc.readyState = 'complete';
    const main = await importFreshMain();
    main.stopGameLoop();
    return doc.stats.createCount > 0 && doc.stats.domContentLoadedRegistered === false;
  });
}

export async function prop_mainDefersSetupWhileLoading() {
  return withWindow(async (doc) => {
    doc.readyState = 'loading';
    const main = await importFreshMain();
    main.stopGameLoop();
    return doc.stats.createCount === 0 && doc.stats.domContentLoadedRegistered === true;
  });
}

export async function prop_mainPrefersTheRegisteredContainer() {
  return withWindow(async (doc) => {
    const registered = doc.createElement('div');
    registered.id = 'game-container';
    doc.registry['game-container'] = registered;
    const main = await importFreshMain();
    main.stopGameLoop();
    // Le rendu a atterri dans le conteneur déclaré, pas dans <body>.
    return registered.children.length > 0 && doc.body.children.length === 0;
  });
}

/** La délégation depuis le conteneur route chaque geste vers le bon handler. */
export async function prop_mainDelegatesEveryGesture() {
  return withWindow(async (doc) => {
    const registered = doc.createElement('div');
    registered.id = 'game-container';
    doc.registry['game-container'] = registered;
    const main = await importFreshMain();
    main.stopGameLoop();

    const fire = (target) => {
      for (const fn of registered.listeners.click || []) fn({ target });
    };

    // 1) clic sur la cible : le compteur monte d'exactement une valeur de clic.
    fire(findById(registered, 'click-target'));
    if (main.gameState.resourceCounter !== Data.ECONOMY.valueClick) return false;

    // 2) tuile non payable : le clic ne doit RIEN acheter.
    fire(findById(registered, `gen-${G1.id}`));
    if (main.gameState.generatorCounts[G1.id] !== 0) return false;

    // 3) tuile payable : l'achat passe.
    Logic.accrue(main.gameState, 1000);
    Render.renderHTML(main.gameState, registered);
    fire(findById(registered, `gen-${G1.id}`));
    if (main.gameState.generatorCounts[G1.id] !== 1) return false;

    // 4) relance : le compteur retombe EXACTEMENT à 0, le multiplicateur monte.
    Logic.accrue(main.gameState, Data.PRESTIGE.costThreshold);
    Render.renderHTML(main.gameState, registered);
    fire(findById(registered, 'prestige-button'));
    if (main.gameState.resourceCounter !== 0 || main.gameState.prestigeCount !== 1) return false;

    return true;
  });
}

/** #restart ouvre un NOUVEAU cycle en conservant la méta-progression. */
export async function prop_mainRestartOpensANewCycleKeepingPrestige() {
  return withWindow(async (doc) => {
    const registered = doc.createElement('div');
    registered.id = 'game-container';
    doc.registry['game-container'] = registered;
    const main = await importFreshMain();
    main.stopGameLoop();

    main.gameState.prestigeCount = 2;
    globalThis.window.__game_debug.forceEnd();
    if (globalThis.window.__game.over !== true) return false;
    if (findById(registered, 'play-surface') !== null) return false;

    for (const fn of registered.listeners.click || []) fn({ target: findById(registered, 'restart') });

    const after = globalThis.window.__game;
    return (
      after.over === false &&
      after.endGauge === 0 &&
      after.lifetimeEarned === 0 &&
      after.prestigeCount === 2 &&
      findById(registered, 'play-surface') !== null
    );
  });
}

/** Le hook de debug force une fin DÉTERMINISTE sans avancer l'horloge. */
export async function prop_mainForceEndCreditsRatherThanWaits() {
  return withWindow(async (doc) => {
    const registered = doc.createElement('div');
    registered.id = 'game-container';
    doc.registry['game-container'] = registered;
    const main = await importFreshMain();
    main.stopGameLoop();

    const ticksBefore = main.gameState.elapsedTicks;
    globalThis.window.__game_debug.forceEnd();
    const snapshot = globalThis.window.__game;
    return (
      snapshot.over === true &&
      snapshot.endGauge === 1 &&
      snapshot.lifetimeEarned === Data.META.victoryTarget &&
      snapshot.elapsedTicks === ticksBefore
    );
  });
}

/** Le tick fait avancer la simulation, et s'arrête net à la victoire. */
export async function prop_mainGameLoopStepsThenFreezesOnVictory() {
  return withWindow(async (doc) => {
    const registered = doc.createElement('div');
    registered.id = 'game-container';
    doc.registry['game-container'] = registered;
    const main = await importFreshMain();
    main.stopGameLoop();

    main.gameLoopTick();
    if (main.gameState.elapsedTicks !== 1) return false;

    globalThis.window.__game_debug.forceEnd();
    const frozenAt = main.gameState.elapsedTicks;
    main.gameLoopTick();
    main.gameLoopTick();
    // Une partie gagnée ne continue pas d'avancer.
    return main.gameState.elapsedTicks === frozenAt && globalThis.window.__game.over === true;
  });
}

/** Le rendu est étranglé : la simulation tourne à chaque tick, pas le DOM. */
export async function prop_mainRendersOnThrottleNotEveryTick() {
  return withWindow(async (doc) => {
    const registered = doc.createElement('div');
    registered.id = 'game-container';
    doc.registry['game-container'] = registered;
    const main = await importFreshMain();
    main.stopGameLoop();

    // Premier tick : l'étranglement est ouvert, le DOM est peint.
    main.gameLoopTick();
    const afterFirstTick = doc.stats.createCount;

    // Ticks suivants dans la même fenêtre de 100 ms : la SIMULATION avance, le
    // DOM ne se reconstruit PAS — c'est tout l'objet de l'étranglement.
    main.gameLoopTick();
    main.gameLoopTick();
    if (doc.stats.createCount !== afterFirstTick) return false;
    if (main.gameState.elapsedTicks !== 3) return false;

    // La victoire, elle, est peinte IMMÉDIATEMENT sans attendre l'étranglement.
    Logic.accrue(main.gameState, Data.META.victoryTarget);
    main.gameLoopTick();
    return doc.stats.createCount > afterFirstTick && findById(registered, 'overlay') !== null;
  });
}

/** L'étranglement rouvre EXACTEMENT à l'intervalle, pas une milliseconde plus tard.
 *  L'horloge est stubée : sans cela, la borne exacte n'est jamais observable. */
export async function prop_mainThrottleReopensAtTheExactInterval() {
  return withWindow(async (doc) => {
    const registered = doc.createElement('div');
    registered.id = 'game-container';
    doc.registry['game-container'] = registered;
    const main = await importFreshMain();
    main.stopGameLoop();

    const realNow = Date.now;
    try {
      Date.now = () => 1000;
      main.gameLoopTick(); // pose lastRenderAt = 1000
      const anchored = doc.stats.createCount;

      Date.now = () => 1099; // une ms trop tôt : pas de rendu
      main.gameLoopTick();
      if (doc.stats.createCount !== anchored) return false;

      Date.now = () => 1100; // pile à l'intervalle : rendu
      main.gameLoopTick();
      return doc.stats.createCount > anchored;
    } finally {
      Date.now = realNow;
    }
  });
}

/** La victoire atteinte au TOUT PREMIER tick est peinte immédiatement : l'état
 *  « a déjà gagné » démarre à faux, sinon l'écran de fin serait sauté. */
export async function prop_mainPaintsVictoryOnTheVeryFirstTick() {
  return withWindow(async (doc) => {
    const registered = doc.createElement('div');
    registered.id = 'game-container';
    doc.registry['game-container'] = registered;
    const main = await importFreshMain();
    main.stopGameLoop();

    Logic.accrue(main.gameState, Data.META.victoryTarget);
    const before = doc.stats.createCount;
    main.gameLoopTick();
    return doc.stats.createCount > before && findById(registered, 'overlay') !== null;
  });
}

/** `__game` est redéfinissable : un second montage sur la même fenêtre ne doit
 *  pas exploser (remount / rechargement à chaud). */
export async function prop_mainGameSnapshotIsRedefinable() {
  return withWindow(async () => {
    await importFreshMain();
    const second = await importFreshMain();
    second.stopGameLoop();
    return typeof globalThis.window.__game.resourceCounter === 'number';
  });
}

export async function prop_mainStartGameLoopIsIdempotent() {
  return withWindow(async (doc) => {
    const registered = doc.createElement('div');
    registered.id = 'game-container';
    doc.registry['game-container'] = registered;
    const main = await importFreshMain();
    main.startGameLoop();
    main.startGameLoop();
    main.stopGameLoop();
    main.stopGameLoop(); // un second arrêt ne doit pas lever
    return true;
  });
}

// --- exécution -----------------------------------------------------------------------

export async function runMutationTests() {
  const properties = [
    { name: 'accrue est le seul crédit', test: prop_accrueIsTheOnlyCredit },
    { name: 'jauge non décroissante à travers les relances', test: prop_gaugeNeverDecreasesAcrossPrestige },
    { name: 'un joueur inactif ne gagne jamais', test: prop_idleNeverWins },
    { name: 'victoire exactement à la cible', test: prop_victoryExactlyAtTarget },
    { name: 'relance bloquée au plafond', test: prop_prestigeBlockedAtCeiling },
    { name: 'crans de stage exacts', test: prop_stageGatesAreExact },
    { name: 'format des nombres aux bornes', test: prop_formatNumberBoundaries },
    { name: 'helpers de stage bornés à la famille', test: prop_stageHelpersClampToFamily },
    { name: 'render exige un conteneur', test: prop_renderNeedsAContainer },
    { name: 'surface de jeu rendue, overlay caché', test: prop_renderShowsPlaySurfaceAndHidesOverlay },
    { name: 'la victoire REMPLACE la surface de jeu', test: prop_victoryReplacesPlaySurface },
    { name: 'feedback de clic absent au tick précédent', test: prop_clickFeedbackAppearsOnlyOnTheClickTick },
    { name: 'le feedback expire à son échéance exacte', test: prop_feedbackDecaysAtItsExactLifetime },
    { name: 'tuile payable au coût exact', test: prop_generatorTileAffordableAtExactCost },
    { name: 'les tuiles vivent dans la rangée', test: prop_generatorTilesLiveInTheRow },
    { name: 'compteur de générateur absent -> 0', test: prop_generatorCountFallsBackToZero },
    { name: 'le coût verrouillé énonce sa raison', test: prop_unaffordableCostStatesItsReason },
    { name: 'jauge violette exactement à 90 %', test: prop_gaugeTurnsMilestoneExactlyAt90Percent },
    { name: 'bouton de relance seulement s\'il sert', test: prop_prestigeButtonAppearsOnlyWhenUsable },
    { name: 'la scène suit le stage', test: prop_stageSceneFollowsTheStage },
    { name: 'chaque asset déclaré est rendu', test: prop_everyDeclaredAssetIsRendered },
    { name: 'console: none quand rien n\'est possédé', test: prop_renderConsoleReportsNoneWhenEmpty },
    { name: 'console: annonce la victoire', test: prop_renderConsoleAnnouncesVictory },
    { name: 'main: montage auto si le document est prêt', test: prop_mainAutoSetupWhenDocumentReady },
    { name: 'main: montage différé pendant le chargement', test: prop_mainDefersSetupWhileLoading },
    { name: 'main: conteneur déclaré préféré au body', test: prop_mainPrefersTheRegisteredContainer },
    { name: 'main: délégation de chaque geste', test: prop_mainDelegatesEveryGesture },
    { name: 'main: #restart ouvre un nouveau cycle', test: prop_mainRestartOpensANewCycleKeepingPrestige },
    { name: 'main: forceEnd crédite au lieu d\'attendre', test: prop_mainForceEndCreditsRatherThanWaits },
    { name: 'main: la boucle gèle à la victoire', test: prop_mainGameLoopStepsThenFreezesOnVictory },
    { name: 'main: rendu étranglé, victoire immédiate', test: prop_mainRendersOnThrottleNotEveryTick },
    { name: 'main: l\'étranglement rouvre à l\'intervalle exact', test: prop_mainThrottleReopensAtTheExactInterval },
    { name: 'main: victoire peinte dès le premier tick', test: prop_mainPaintsVictoryOnTheVeryFirstTick },
    { name: 'main: l\'instantané __game est redéfinissable', test: prop_mainGameSnapshotIsRedefinable },
    { name: 'main: startGameLoop idempotent', test: prop_mainStartGameLoopIsIdempotent },
  ];

  const results = [];
  let failures = 0;

  for (const prop of properties) {
    try {
      const outcome = await prop.test();
      results.push({ property: prop.name, outcome });
      if (outcome === true) {
        console.log(`✓ ${prop.name}`);
      } else {
        console.log(`✗ ${prop.name}`);
        failures += 1;
      }
    } catch (error) {
      console.log(`✗ ${prop.name}: ${error.message}`);
      results.push({ property: prop.name, outcome: false, error: error.message });
      failures += 1;
    }
  }

  if (failures > 0) {
    throw new Error(`${failures} propriété(s) en échec sur ${properties.length}`);
  }

  console.log(`\n${properties.length} propriétés vérifiées`);
  return { properties: results, failures };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMutationTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

export default { runMutationTests };
