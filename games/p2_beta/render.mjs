// render — présentation. OBSERVE l'état de `logic`, n'est jamais importé par
// `logic` ni par `input` (blueprint.deps_interdites : render -/-> input).
// Ne décide rien : toute règle vient de `logic`, tout contenu vient de `data`.

import * as Logic from './logic.mjs';
import * as Data from './data.mjs';

// Durée d'affichage, en ticks, du flotteur `+N` et de l'animation d'appui.
export const FEEDBACK = { floaterLife: 45, pressLife: 8 };

// État PUREMENT visuel (animations en cours). Aucune valeur de jeu ici : la
// simulation reste entièrement dans `logic`.
export const renderState = {
  floatingTexts: [],
  pressTicks: 0,
};

export function resetRenderState() {
  renderState.floatingTexts = [];
  renderState.pressTicks = 0;
}

/**
 * Capture observable du feedback de clic — ce que R3 compare entre deux ticks.
 * @returns {{floaters: number, pressed: boolean}}
 */
export function feedbackSnapshot() {
  return {
    floaters: renderState.floatingTexts.length,
    pressed: renderState.pressTicks > 0,
  };
}

export function addFloatingText(amount) {
  renderState.floatingTexts.push({ text: `+${formatNumber(amount)}`, age: 0 });
  return renderState.floatingTexts.length;
}

/**
 * R3 — feedback du clic : lève SIMULTANÉMENT le flotteur `+N` et l'animation
 * d'appui de la cible, puis redessine. Les deux sont absents tant que cette
 * fonction n'a pas été appelée (cf. `feedbackSnapshot`).
 */
export function renderClickFeedback(gameState, container, amount) {
  addFloatingText(amount);
  renderState.pressTicks = FEEDBACK.pressLife;
  renderHTML(gameState, container);
  return feedbackSnapshot();
}

/** Vieillit les animations. Le flotteur disparaît, la ressource gagnée reste. */
export function updateFloatingTexts(deltaTime = 1) {
  renderState.floatingTexts = renderState.floatingTexts
    .map((ft) => ({ ...ft, age: ft.age + deltaTime }))
    .filter((ft) => ft.age < FEEDBACK.floaterLife);
  if (renderState.pressTicks > 0) {
    renderState.pressTicks = Math.max(0, renderState.pressTicks - deltaTime);
  }
  return renderState.floatingTexts.length;
}

/** Abrégé au-delà de 1e3 pour garder une largeur bornée (Art Bible § ui_readability). */
export function formatNumber(value) {
  const units = [
    { limit: 1e12, suffix: 'T' },
    { limit: 1e9, suffix: 'B' },
    { limit: 1e6, suffix: 'M' },
    { limit: 1e3, suffix: 'K' },
  ];
  for (const { limit, suffix } of units) {
    if (value >= limit) return `${(value / limit).toFixed(2)}${suffix}`;
  }
  return String(Math.floor(value));
}

/** Scène du stage courant, bornée à la famille livrée. */
export function stageSceneFor(stage) {
  const scenes = Data.ASSETS.stageScenes;
  return scenes[Math.min(stage, scenes.length - 1)];
}

export function stageTintFor(stage) {
  return Data.STAGE_TINTS[Math.min(stage, Data.STAGE_TINTS.length - 1)];
}

export function stageNameFor(stage) {
  return Data.STAGE_NAMES[Math.min(stage, Data.STAGE_NAMES.length - 1)];
}

function el(tag, props = {}) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'style') node.style.cssText = value;
    else node[key] = value;
  }
  return node;
}

function img(src, alt, style) {
  return el('img', { src, alt, style });
}

// --- rendu principal ---------------------------------------------------------------

export function renderHTML(gameState, container) {
  if (!container) return null;
  container.innerHTML = '';

  const victory = Logic.isVictory(gameState);

  // R11 — à la victoire, la surface de jeu est RETIRÉE et remplacée par la scène
  // de fin : un vrai changement de scène, pas une couche posée par-dessus.
  if (!victory) {
    container.appendChild(buildPlaySurface(gameState));
  }
  container.appendChild(buildVictoryScene(gameState, victory));
  return container;
}

function buildPlaySurface(gameState) {
  const stage = gameState.currentStage;
  const surface = el('div', { id: 'play-surface' });

  // Décor de stage : change de LIEU à chaque cran franchi.
  surface.appendChild(
    img(stageSceneFor(stage), `Stage ${stage + 1} — ${stageNameFor(stage)}`, 'width:100%;display:block;border-radius:10px;')
  );
  surface.appendChild(
    el('div', {
      id: 'stage-banner',
      textContent: `Stage ${stage + 1}/${Data.META.numStages} — ${stageNameFor(stage)}`,
      style: `color:${stageTintFor(stage)};font-weight:700;letter-spacing:.04em;margin:8px 0;`,
    })
  );

  // Traqueur d'objectifs — distinct du total en position, forme et taille.
  const quest = el('div', { id: 'quest-tracker', style: 'position:relative;margin:10px 0;' });
  quest.appendChild(img(Data.ASSETS.questTracker, 'Objectif', 'width:100%;display:block;'));
  quest.appendChild(
    el('div', {
      id: 'goal-label',
      textContent: Logic.getCurrentGoalText(gameState),
      style: `position:absolute;inset:0;display:flex;align-items:center;padding-left:56px;color:${Data.PALETTE.text};font-weight:600;`,
    })
  );
  surface.appendChild(quest);

  // Total récolté — élément dominant du HUD.
  const panel = el('div', { id: 'resource-panel', style: 'position:relative;margin:10px 0;' });
  panel.appendChild(img(Data.ASSETS.resourceCounterFrame, '', 'width:100%;display:block;'));
  panel.appendChild(
    el('div', {
      id: 'resource-counter',
      textContent: formatNumber(gameState.resourceCounter),
      style: `position:absolute;left:34px;top:10px;font-size:34px;font-weight:800;color:${Data.PALETTE.value};font-variant-numeric:tabular-nums;`,
    })
  );
  panel.appendChild(img(Data.ASSETS.currencySymbol, 'unités', 'position:absolute;left:0px;bottom:8px;width:22px;'));
  panel.appendChild(
    el('div', {
      id: 'cps-readout',
      textContent: `${formatNumber(Logic.computeCPS(gameState))}/s`,
      style: `position:absolute;left:34px;bottom:8px;font-size:15px;color:${Data.PALETTE.textMuted};`,
    })
  );
  surface.appendChild(panel);

  // Zone de clic + couche de feedback.
  const zone = el('div', { id: 'click-zone', style: 'position:relative;text-align:center;margin:16px 0;' });
  const pressed = renderState.pressTicks > 0;
  const clickBtn = el('button', {
    id: 'click-target',
    className: pressed ? 'pressed' : '',
    style: `background:none;border:none;cursor:pointer;padding:0;transform:scale(${pressed ? 0.94 : 1});transition:transform .08s;`,
  });
  clickBtn.appendChild(img(Data.ASSETS.clickTarget, 'Récolter', 'width:180px;display:block;'));
  zone.appendChild(clickBtn);

  const fxLayer = el('div', {
    id: 'click-fx-layer',
    style: 'position:absolute;inset:0;pointer-events:none;',
  });
  if (pressed) {
    fxLayer.appendChild(
      img(Data.ASSETS.clickFeedbackVfx, '', 'position:absolute;left:50%;top:50%;width:210px;transform:translate(-50%,-50%);')
    );
  }
  for (const ft of renderState.floatingTexts) {
    fxLayer.appendChild(
      el('div', {
        className: 'floater',
        textContent: ft.text,
        style: `position:absolute;left:50%;top:40%;color:${Data.PALETTE.currency};font-weight:800;opacity:${(1 - ft.age / FEEDBACK.floaterLife).toFixed(3)};transform:translate(-50%,${-ft.age * 1.6}px);`,
      })
    );
  }
  zone.appendChild(fxLayer);
  surface.appendChild(zone);

  // Rangée `generateurs` — les tuiles sont RÉELLEMENT dans la rangée.
  const row = el('div', {
    id: 'generator-row',
    style: 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:16px 0;',
  });
  for (const gen of Data.GENERATORS) {
    const owned = gameState.generatorCounts[gen.id] || 0;
    const cost = Logic.generatorCost(gameState, gen.id);
    const affordable = Logic.canAfford(gameState, gen.id);
    const tile = el('button', {
      id: `gen-${gen.id}`,
      className: affordable ? 'generator affordable' : 'generator locked',
      disabled: !affordable,
      style: `display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;border:2px solid ${affordable ? Data.PALETTE.clickable : Data.PALETTE.separator};background:${Data.PALETTE.panel};color:${Data.PALETTE.text};opacity:${affordable ? 1 : 0.35};cursor:${affordable ? 'pointer' : 'not-allowed'};`,
    });
    tile.dataset.generatorId = gen.id;
    tile.appendChild(img(Data.ASSETS.generatorIcon, gen.name, 'width:34px;'));
    tile.appendChild(
      el('span', {
        className: 'gen-label',
        textContent: `${gen.name} (${owned}) +${gen.yield}/s`,
        style: 'font-size:13px;font-weight:600;',
      })
    );
    tile.appendChild(
      el('span', {
        className: 'gen-cost',
        // Coût en corail quand il n'est pas payable — raison explicite, jamais un
        // grisé muet (Art Bible § affordance_rules).
        textContent: affordable ? formatNumber(cost) : `Il te faut ${formatNumber(cost)}`,
        style: `font-size:13px;color:${affordable ? Data.PALETTE.currency : Data.PALETTE.alert};`,
      })
    );
    tile.appendChild(img(Data.ASSETS.buyButton, 'Acheter', 'height:22px;'));
    row.appendChild(tile);
  }
  surface.appendChild(row);

  // Jauge de fin — persistante, toujours visible, distincte du total.
  const gauge = Logic.endGauge(gameState);
  const gaugeBox = el('div', { id: 'end-gauge-container', style: 'position:relative;margin:16px 0;' });
  gaugeBox.appendChild(img(Data.ASSETS.progressEndIndicator, '', 'width:100%;display:block;'));
  gaugeBox.appendChild(
    el('div', {
      id: 'end-gauge-bar',
      style: `position:absolute;left:2px;top:3px;bottom:3px;width:calc((100% - 4px) * ${gauge});background:${gauge >= 0.9 ? Data.PALETTE.milestone : Data.PALETTE.value};border-radius:9px;`,
    })
  );
  gaugeBox.appendChild(
    el('div', {
      id: 'end-gauge-label',
      className: 'gauge-label',
      textContent: `Fin du cycle : ${(gauge * 100).toFixed(1)}%`,
      style: `position:absolute;right:10px;top:2px;font-size:12px;font-weight:700;color:${Data.PALETTE.text};`,
    })
  );
  surface.appendChild(gaugeBox);

  // Affordance de relance (méta-boucle) — présente UNIQUEMENT quand la relance est
  // réellement possible, pour ne jamais offrir un bouton qui ne fait rien.
  if (
    gameState.resourceCounter >= Data.PRESTIGE.costThreshold &&
    gameState.prestigeCount < Data.PRESTIGE.maxPrestigeCount
  ) {
    surface.appendChild(
      el('button', {
        id: 'prestige-button',
        textContent: `Relancer — clic x${Logic.prestigeMultiplier(gameState) * Data.PRESTIGE.resetMultiplier}`,
        style: `display:block;margin:8px auto;padding:10px 22px;border:2px solid ${Data.PALETTE.milestone};border-radius:8px;background:${Data.PALETTE.panel};color:${Data.PALETTE.milestone};font-weight:700;cursor:pointer;`,
      })
    );
  }

  return surface;
}

function buildVictoryScene(gameState, victory) {
  // #overlay / #restart : sélecteurs imposés par
  // scripts/forge/contracts/PLAYABLE_CONTRACT.md. La classe `hidden` est le
  // signal de visibilité lu par l'e2e.
  const overlay = el('div', { id: 'overlay' });
  overlay.classList.toggle('hidden', !victory);
  overlay.style.cssText = `position:fixed;inset:0;display:${victory ? 'flex' : 'none'};flex-direction:column;align-items:center;justify-content:center;z-index:1000;background:${Data.PALETTE.fieldDeep};`;

  overlay.appendChild(
    img(Data.ASSETS.victoryScreen, '', 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;')
  );
  overlay.appendChild(
    el('div', {
      id: 'overlayTitle',
      textContent: 'CYCLE CLOS',
      style: `position:relative;font-size:64px;font-weight:800;color:${Data.PALETTE.currency};`,
    })
  );
  overlay.appendChild(
    el('div', {
      id: 'final-totals',
      textContent: `Total récolté ${formatNumber(gameState.lifetimeEarned)} · ${gameState.prestigeCount} relance(s) · ${gameState.elapsedTicks} ticks`,
      style: `position:relative;margin-top:14px;color:${Data.PALETTE.text};font-size:18px;`,
    })
  );
  overlay.appendChild(
    el('button', {
      id: 'restart',
      textContent: 'Rejouer',
      style: `position:relative;margin-top:22px;padding:12px 28px;font-size:17px;font-weight:700;border:none;border-radius:8px;background:${Data.PALETTE.currency};color:${Data.PALETTE.fieldDeep};cursor:pointer;`,
    })
  );
  return overlay;
}

// --- rendu console (headless) -------------------------------------------------------

export function renderConsole(gameState) {
  const owned = Data.GENERATORS.filter((g) => (gameState.generatorCounts[g.id] || 0) > 0)
    .map((g) => `${g.id}:${gameState.generatorCounts[g.id]}`)
    .join(', ');

  console.log('----- ÉTAT -----');
  console.log(`Objectif   : ${Logic.getCurrentGoalText(gameState)}`);
  console.log(`Ressources : ${formatNumber(gameState.resourceCounter)} (${formatNumber(Logic.computeCPS(gameState))}/s)`);
  console.log(`Récolté    : ${formatNumber(gameState.lifetimeEarned)}`);
  console.log(`Ticks      : ${gameState.elapsedTicks} / ${Data.META.tickBudget}`);
  console.log(`Jauge      : ${(Logic.endGauge(gameState) * 100).toFixed(1)}%`);
  console.log(`Stage      : ${gameState.currentStage + 1}/${Data.META.numStages} — ${stageNameFor(gameState.currentStage)}`);
  console.log(`Générateurs: ${owned || 'none'}`);
  if (Logic.isVictory(gameState)) console.log('CYCLE CLOS');
}
