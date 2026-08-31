import {
  STRUCTURE, unlockedGenerators, unlockedUpgrades, currentObjective, canAfford,
  isVictory, getThresholdIndex,
} from './economy.mjs';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Géométrie partagée du canvas — SEULE source de vérité pour le rendu ET pour le
// positionnement du calque DOM d'accessibilité/test (main.mjs, qui a le droit
// d'importer render.mjs). input.mjs ne peut PAS importer render.mjs (arête
// interdite du blueprint) : il consomme les événements DOM posés sur ce calque,
// jamais ces coordonnées pixel directement.
export const LAYOUT = {
  core: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, radius: 60 },
  buyButtons: { x: 50, y: CANVAS_HEIGHT - 120, width: 150, height: 40, spacing: 170 },
  upgradeButtons: { x: 50, y: CANVAS_HEIGHT - 60, width: 120, height: 30, spacing: 130 },
  replay: { width: 150, height: 50 }, // centré sur le canvas, voir renderVictory
  generatorColumn: { x: CANVAS_WIDTH - 150, y: CANVAS_HEIGHT / 2 - 100, width: 130, slotHeight: 50 },
  progressMeter: { width: 200, height: 20, marginRight: 20, y: 30 },
};

const COLORS = {
  backgrounds: [
    '#0B0E17', // S0 deep blue
    '#1a1f3a', // S1
    '#2a2f4a', // S2
    '#3a3f5a', // S3
    '#4a4f6a', // S4
    '#5a5f7a', // S5
  ],
  text: '#ffffff',
  button_enabled: '#4CAF50',
  button_disabled: '#cccccc',
  generator_g1: '#FFD700',
  generator_g2: '#FFA500',
  generator_g3: '#FF6347',
  generator_g4: '#8B008B',
  upgrade_enabled: '#7B5CFF',
  upgrade_disabled: '#3A3060',
};

export function createRenderer(canvas, state) {
  return {
    canvas,
    ctx: canvas.getContext('2d'),
    lastClickBurst: null,
    state,
  };
}

export function renderFrame(renderer, state) {
  const { canvas, ctx } = renderer;

  renderBackground(ctx, state, canvas);

  // Display R counter (top-left)
  renderRCounter(ctx, state);

  // Display objective (top-center)
  renderObjective(ctx, state);

  // Display progress meter (top-right)
  renderProgressMeter(ctx, state);

  // Draw core of light (center)
  renderCoreOfLight(ctx, state, renderer);

  // Draw generators column (right side)
  renderGeneratorColumn(ctx, state);

  // Draw buy buttons (bottom area)
  renderBuyButtons(ctx, state);

  // Draw upgrade buttons (if available)
  renderUpgradeButtons(ctx, state);

  // Victory screen overlay if won — la règle de victoire appartient à economy
  // (blueprint : render ne porte AUCUNE règle économique) ; la dupliquer ici
  // créait un second seuil de victoire pouvant diverger du premier.
  if (isVictory(state)) {
    renderVictory(ctx, canvas, state);
  }

  renderThresholdReveal(ctx, renderer, canvas);
}

// R21 — fond ascendant : un cran de clarté par SEUIL FRANCHI (COLORS.backgrounds[n]).
// `Math.floor(cumul / thresholds[0])` comptait des multiples de S1, pas des seuils :
// le fond atteignait son dernier cran à 500 R au lieu de 1 000 000 R.
function renderBackground(ctx, state, canvas) {
  const bgColor = COLORS.backgrounds[getThresholdIndex(state.cumul_mR)];
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// R19 — VFX de franchissement de seuil : flash blanc en fondu, déclenché par main.mjs
// (renderer.thresholdRevealOpacity = 1) au moment exact où cumul_mR franchit un seuil.
function renderThresholdReveal(ctx, renderer, canvas) {
  if (renderer.thresholdRevealOpacity > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${renderer.thresholdRevealOpacity * 0.5})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    renderer.thresholdRevealOpacity -= 0.05;
  }
}

function renderRCounter(ctx, state) {
  const displayR = Math.floor(state.solde_mR / 1000);
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'left';
  ctx.fillText(`R: ${displayR.toLocaleString()}`, 20, 50);
}

function renderObjective(ctx, state) {
  const objective = currentObjective(state);
  ctx.font = '16px Arial';
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.fillText(objective, CANVAS_WIDTH / 2, 50);
}

// R20 — proximité du PROCHAIN seuil : part du seuil précédent, arrive à 1 au suivant.
// Même correction de sémantique que le fond : l'index vient des seuils franchis,
// jamais d'un quotient par S1 (qui rendait la jauge fausse dès 100 R).
function progressMeterRatio(state) {
  const idx = getThresholdIndex(state.cumul_mR);
  if (idx >= STRUCTURE.thresholds.length) return 1;
  const currentThreshold = idx === 0 ? 0 : STRUCTURE.thresholds[idx - 1];
  const nextThreshold = STRUCTURE.thresholds[idx];
  return Math.max(0, Math.min(1, (state.cumul_mR - currentThreshold) / (nextThreshold - currentThreshold)));
}

function renderProgressMeter(ctx, state) {
  if (getThresholdIndex(state.cumul_mR) >= STRUCTURE.thresholds.length) return;

  const ratio = progressMeterRatio(state);
  const { width: meterWidth, height: meterHeight, marginRight, y } = LAYOUT.progressMeter;
  const x = CANVAS_WIDTH - meterWidth - marginRight;

  ctx.fillStyle = '#333333';
  ctx.fillRect(x, y, meterWidth, meterHeight);

  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x, y, meterWidth * ratio, meterHeight);

  ctx.strokeStyle = COLORS.text;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, meterWidth, meterHeight);
}

function renderCoreOfLight(ctx, state, renderer) {
  const { x: centerX, y: centerY, radius } = LAYOUT.core;

  // Core glow
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.5);
  gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Core
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  renderClickBurst(ctx, renderer, centerX, centerY, radius);
}

// R16 — VFX de clic (+N) sur le Cœur de Lumen : anneau + texte flottant, retiré après ~600ms.
function renderClickBurst(ctx, renderer, centerX, centerY, radius) {
  if (renderer.lastClickBurst && renderer.lastClickBurst.age < 600) {
    const age = renderer.lastClickBurst.age;
    const lifespan = 600;
    const ratio = 1 - age / lifespan;
    const burstRadius = radius + 40 * ratio;
    const opacity = ratio * 0.5;
    ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, burstRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${(renderer.lastClickBurst.gain / 1000).toFixed(0)}`, centerX, centerY - 40 * ratio);

    renderer.lastClickBurst.age += 16; // Approximate frame time
  }
}

function renderGeneratorColumn(ctx, state) {
  const { x: columnX, y: columnY, slotHeight } = LAYOUT.generatorColumn;
  const generatorNames = ['G1', 'G2', 'G3', 'G4'];
  const generatorColors = [
    COLORS.generator_g1,
    COLORS.generator_g2,
    COLORS.generator_g3,
    COLORS.generator_g4,
  ];

  const unlocked = unlockedGenerators(state);
  for (let i = 0; i < unlocked.length; i++) {
    const genIdx = unlocked[i];
    const y = columnY + i * slotHeight;

    // Background
    ctx.fillStyle = '#333333';
    ctx.fillRect(columnX, y, 130, 45);

    // Color indicator
    ctx.fillStyle = generatorColors[genIdx];
    ctx.fillRect(columnX, y, 10, 45);

    // Text
    ctx.font = '12px Arial';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText(`${generatorNames[genIdx]}: ${state.generators[genIdx].count}`, columnX + 15, y + 15);
    ctx.font = '10px Arial';
    ctx.fillText(`+${(STRUCTURE.prod_per_sec[genIdx] * state.generators[genIdx].prodMultiplier / 1000).toFixed(1)}/s`, columnX + 15, y + 30);
  }
}

function renderBuyButtons(ctx, state) {
  const { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight, spacing } = LAYOUT.buyButtons;
  const generatorNames = ['G1', 'G2', 'G3', 'G4'];

  const unlocked = unlockedGenerators(state);
  for (let idx = 0; idx < unlocked.length; idx++) {
    const genIdx = unlocked[idx];
    const x = buttonX + idx * spacing;
    const affordable = canAfford(state, genIdx);

    // Button background
    ctx.fillStyle = affordable ? COLORS.button_enabled : COLORS.button_disabled;
    ctx.fillRect(x, buttonY, buttonWidth, buttonHeight);

    // Button text
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = affordable ? '#000000' : '#666666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cost = calculateCost(state, genIdx);
    ctx.fillText(`Buy ${generatorNames[genIdx]}\n${(cost / 1000).toFixed(0)}R`, x + buttonWidth / 2, buttonY + buttonHeight / 2);
  }
}

function renderUpgradeButtons(ctx, state) {
  if (state.cumul_mR < STRUCTURE.thresholds[3]) return; // S4 not reached

  const { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight, spacing } = LAYOUT.upgradeButtons;

  const unlocked = unlockedUpgrades(state);
  for (let idx = 0; idx < Math.min(unlocked.length, 4); idx++) {
    const upgradeId = unlocked[idx];
    const upgrade = STRUCTURE.upgrades[upgradeId];
    const x = buttonX + idx * spacing;
    const affordable = state.solde_mR >= upgrade.cost;

    // Teintes PROPRES aux améliorations : réutiliser '#FF6347' (COLORS.generator_g3)
    // rendait les deux états du bouton indistinguables de la colonne générateurs
    // — pour l'œil comme pour toute observation du rendu.
    ctx.fillStyle = affordable ? COLORS.upgrade_enabled : COLORS.upgrade_disabled;
    ctx.fillRect(x, buttonY, buttonWidth, buttonHeight);

    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(upgradeId, x + buttonWidth / 2, buttonY + buttonHeight / 2);
  }
}

function renderVictory(ctx, canvas, state) {
  // Victory overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICTORY!', canvas.width / 2, canvas.height / 2 - 40);

  ctx.font = '24px Arial';
  ctx.fillText(`You reached ${(state.cumul_mR / 1000000).toFixed(1)}M R`, canvas.width / 2, canvas.height / 2 + 20);

  // Replay button
  const { width: rw, height: rh } = LAYOUT.replay;
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(canvas.width / 2 - rw / 2, canvas.height / 2 + 70, rw, rh);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Rejouer', canvas.width / 2, canvas.height / 2 + 70 + rh / 2);
}

// --- calque DOM d'accessibilité/test (R12-R22) --------------------------------
// Lecture SEULE de l'état economy, écriture SEULE du DOM — même contrat que le
// rendu canvas. Ne mute jamais `state`. `dom` est construit par main.mjs
// (propriétaire d'index.html) à partir des ids réels posés sur le calque overlay.
export function syncOverlay(dom, state, renderer) {
  if (!dom) return;

  if (renderer) {
    dom.thresholdReveal.style.opacity = String(Math.max(0, renderer.thresholdRevealOpacity || 0));
  }

  dom.rCounter.textContent = String(Math.floor(state.solde_mR / 1000));
  dom.objectif.textContent = currentObjective(state);

  const ratio = progressMeterRatio(state);
  dom.progressMeter.style.width = `${Math.round(ratio * 100)}%`;
  dom.progressMeter.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));

  const unlocked = unlockedGenerators(state);
  for (let genIdx = 0; genIdx < dom.buyButtons.length; genIdx++) {
    const btn = dom.buyButtons[genIdx];
    const isUnlocked = unlocked.includes(genIdx);
    btn.classList.toggle('hidden', !isUnlocked);
    if (!isUnlocked) continue;
    const affordable = canAfford(state, genIdx);
    btn.classList.toggle('disabled', !affordable);
    btn.disabled = !affordable;
    btn.textContent = `G${genIdx + 1}: ${(calculateCost(state, genIdx) / 1000).toFixed(0)}R`;
  }

  dom.colonneGenerateurs.innerHTML = '';
  for (const genIdx of unlocked) {
    const slot = document.createElement('div');
    slot.className = 'gen-slot';
    slot.dataset.gen = String(genIdx);
    slot.textContent = `G${genIdx + 1}: ${state.generators[genIdx].count}`;
    dom.colonneGenerateurs.appendChild(slot);
  }

  dom.upgradeContainer.innerHTML = '';
  const unlockedUpg = unlockedUpgrades(state);
  dom.upgradeContainer.classList.toggle('hidden', unlockedUpg.length === 0);
  for (const upgradeId of unlockedUpg) {
    const upgrade = STRUCTURE.upgrades[upgradeId];
    const btn = document.createElement('button');
    btn.dataset.upgradeId = upgradeId;
    btn.disabled = state.solde_mR < upgrade.cost;
    btn.textContent = `${upgradeId}: ${(upgrade.cost / 1000).toFixed(0)}R`;
    dom.upgradeContainer.appendChild(btn);
  }

  const won = isVictory(state);
  dom.victoryOverlay.classList.toggle('hidden', !won);
}

function calculateCost(state, generatorIndex) {
  const base = STRUCTURE.cost_base[generatorIndex];
  const owned = state.generators[generatorIndex].count;
  return Math.floor(base * Math.pow(STRUCTURE.growth, owned));
}
