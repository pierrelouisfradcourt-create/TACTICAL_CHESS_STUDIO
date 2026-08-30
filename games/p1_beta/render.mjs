// render.mjs — rendu DOM (scène + HUD + overlay). Lecture seule de l'état.
// Aucun import de engine/input/main (deps_interdites du blueprint) : les
// constantes nécessaires au rendu sont dupliquées, jamais re-dérivées de
// l'engine (même patron que chain_probe_v1/render.mjs).

const TERMINAL_THRESHOLD = 5000;

// Teintes de rôle STRICTEMENT disjointes (checkColorDisjointness) : le chaud
// (foyer/attisage) n'est jamais emprunté par un état verrouillé/froid.
const COLOR_HEARTH_COLD = '#3a2a55';
const COLOR_HEARTH_HOT = '#ff8a3d';
const COLOR_EMITTER = '#8fd9ff';
const COLOR_LOCKED = '#5a5a66';
const COLOR_AFFORDABLE = '#ffc93c';
const COLOR_ASCENSION = '#e6d9ff';

// Interpolation linéaire monotone indigo -> violet chaud (R14). `t` = ratio
// light/threshold borné à [0,1].
const FIELD_START = { r: 20, g: 14, b: 46 };   // indigo profond
const FIELD_END = { r: 214, g: 92, b: 96 };    // violet chaud / braise

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function fieldColor(t) {
  const r = lerp(FIELD_START.r, FIELD_END.r, t);
  const g = lerp(FIELD_START.g, FIELD_END.g, t);
  const b = lerp(FIELD_START.b, FIELD_END.b, t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function checkColorDisjointness() {
  const colors = new Set([
    COLOR_HEARTH_COLD, COLOR_HEARTH_HOT, COLOR_EMITTER,
    COLOR_LOCKED, COLOR_AFFORDABLE, COLOR_ASCENSION,
  ]);
  return colors.size === 6;
}

function el(id) {
  return document.getElementById(id);
}

// R14 — ambiance du champ, se réchauffe avec la progression.
export function renderField(state) {
  const field = el('field');
  if (!field) return;
  const ratio = Math.min(1, state.light / TERMINAL_THRESHOLD);
  field.style.backgroundColor = fieldColor(ratio);
}

// R3/gb_hearth — foyer central, réactif à l'attisage.
export function renderHearth(state) {
  const hearth = el('hearth');
  if (!hearth) return;
  hearth.style.backgroundColor = state.terminal ? COLOR_HEARTH_COLD : COLOR_HEARTH_HOT;
  hearth.style.cursor = state.terminal ? 'not-allowed' : 'pointer';
  hearth.style.opacity = state.terminal ? '0.4' : '1';
}

// R3 — flash bref (<200ms) détectable image à image, déclenché par
// main.mjs UNE fois par attisage consommé (pendingStokeFlash).
export function renderStokeFlash() {
  const hearth = el('hearth');
  if (!hearth) return;
  hearth.style.boxShadow = '0 0 40px 12px rgba(255, 200, 120, 0.9)';
  hearth.style.transform = 'scale(1.12)';
  setTimeout(() => {
    hearth.style.boxShadow = 'none';
    hearth.style.transform = 'scale(1)';
  }, 150);
}

// R13/gb_light_counter — compteur HUD, plus gros élément textuel, chasse
// tabulaire, jamais recouvert.
export function renderLightCounter(state) {
  const counter = el('light-counter');
  if (!counter) return;
  counter.textContent = Math.floor(state.light).toString();
}

// R1/R7a/R7b — ligne d'objectif.
export function renderObjective(state) {
  const line = el('objective');
  if (!line) return;
  line.textContent = state.currentObjective();
}

// R5/R6/gb_buy_button — bouton d'achat d'émetteur : or si abordable,
// désaturé sinon (jamais le chaud ni un halo).
export function renderBuyButton(state) {
  const btn = el('buy-button');
  const label = el('buy-button-label');
  if (!btn) return;
  const cost = state.emitterCost;
  const affordable = !state.terminal && state.light >= cost;

  if (label) label.textContent = `Émetteur — ${cost} lumiere`;
  btn.classList.toggle('affordable', affordable);
  btn.classList.toggle('locked', !affordable);
  btn.style.backgroundColor = affordable ? COLOR_AFFORDABLE : COLOR_LOCKED;
  btn.style.opacity = affordable ? '1' : '0.5';
  btn.style.cursor = affordable ? 'pointer' : 'not-allowed';
  btn.disabled = !affordable;

  renderLockedGlyph(state, cost, affordable);
}

// R12/gb_locked_glyph — glyphe d'état verrouillé : désaturé, sans glow,
// raison textuelle visible ("X lumiere requise") ; masqué une fois l'émetteur
// abordable — jamais le chaud ni un halo.
export function renderLockedGlyph(state, cost = state.emitterCost, affordable = (!state.terminal && state.light >= cost)) {
  const locked = el('locked-glyph');
  if (!locked) return;
  locked.hidden = affordable;
  locked.textContent = affordable ? '' : `${cost} lumiere requise`;
}

// gb_emitter — silhouette froide par émetteur possédé, ring layout autour du
// foyer. Plafonné (rendu, jamais l'état) pour rester lisible à grand nombre.
const MAX_RENDERED_EMITTERS = 24;

export function renderEmitters(state) {
  const container = el('emitters');
  if (!container) return;
  container.innerHTML = '';
  const n = Math.min(state.emitterCount, MAX_RENDERED_EMITTERS);
  for (let i = 0; i < n; i++) {
    const angle = (i / Math.max(1, state.emitterCount)) * Math.PI * 2;
    const dot = document.createElement('div');
    dot.className = 'emitter-dot';
    dot.style.position = 'absolute';
    dot.style.left = (120 + 90 * Math.cos(angle)) + 'px';
    dot.style.top = (120 + 90 * Math.sin(angle)) + 'px';
    dot.style.width = '10px';
    dot.style.height = '10px';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = COLOR_EMITTER;
    container.appendChild(dot);
  }
  const count = el('emitter-count');
  if (count) count.textContent = String(state.emitterCount);
}

// gb_constellation — jauge de progression light/threshold, remplissage
// proportionnel.
export function renderProgressGauge(state) {
  const gauge = el('progress-gauge-fill');
  if (!gauge) return;
  const ratio = Math.min(1, state.light / TERMINAL_THRESHOLD);
  gauge.style.width = (ratio * 100) + '%';
}

// gb_quest_milestone — marqueur ponctuel, apparition brève puis fondu, non
// modal, ne recouvre jamais compteur ni foyer.
export function renderMilestoneFlash(state) {
  const marker = el('milestone-marker');
  if (!marker) return;
  marker.textContent = `Palier ${state.questMilestonesReached}`;
  marker.style.opacity = '1';
  setTimeout(() => { marker.style.opacity = '0'; }, 900);
}

// R11/gb_end_screen — écran d'embrasement, neutralise l'interaction visuelle
// (l'engine neutralise déjà la mécanique). R9/gb_ascension_altar — autel
// visible uniquement une fois l'embrasement atteint.
export function renderEndScreen(state) {
  const overlay = el('overlay');
  if (!overlay) return;
  overlay.classList.toggle('hidden', !state.terminal);
}

export function renderHud(state) {
  renderField(state);
  renderHearth(state);
  renderLightCounter(state);
  renderObjective(state);
  renderBuyButton(state);
  renderEmitters(state);
  renderProgressGauge(state);
  renderEndScreen(state);
}
