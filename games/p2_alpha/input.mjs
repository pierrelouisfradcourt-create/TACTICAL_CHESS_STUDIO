import { buyGenerator, buyUpgrade, click } from './economy.mjs';

// R12 — clic réel sur le Coeur de Lumen : traduit en gain_clic via economy.click.
export function handleCoreClick(state, callbacks) {
  click(state);
  if (callbacks.onCoreClick) callbacks.onCoreClick(state.gain_clic_mR);
  if (callbacks.onStateChanged) callbacks.onStateChanged(state);
}

// R13 — clic réel sur un bouton d'achat de générateur (#buy-g1..#buy-g4).
export function handleBuy(state, callbacks, generatorIndex) {
  const bought = buyGenerator(state, generatorIndex);
  if (bought && callbacks.onStateChanged) callbacks.onStateChanged(state);
  return bought;
}

// Achat d'amélioration (upgrade-container, boutons dynamiques data-upgrade-id).
export function handleBuyUpgrade(state, callbacks, upgradeId) {
  const bought = buyUpgrade(state, upgradeId);
  if (bought && callbacks.onStateChanged) callbacks.onStateChanged(state);
  return bought;
}

// R14 — clic réel sur #rejouer depuis l'écran de victoire.
export function handleReplay(callbacks) {
  if (callbacks.onReplay) callbacks.onReplay();
}

// Câblage des vrais éléments DOM (posés par main.mjs sur le calque overlay,
// géométrie fournie par render.mjs.LAYOUT) vers les intentions economy.
// input.mjs ne connaît jamais la géométrie pixel du canvas (arête render->input
// interdite du blueprint) : il consomme des événements DOM, jamais des coordonnées.
export function setupInputHandlers(dom, state, callbacks) {
  dom.coeurDeLumen.addEventListener('click', () => handleCoreClick(state, callbacks));

  dom.buyButtons.forEach((btn, genIdx) => {
    btn.addEventListener('click', () => handleBuy(state, callbacks, genIdx));
  });

  // Délégation : les boutons d'amélioration sont recréés à chaque frame par
  // render.syncOverlay (leur nombre/liste varie avec l'état) — un seul listener
  // sur le conteneur survit à ces recréations, jamais de ré-attachement manuel.
  dom.upgradeContainer.addEventListener('click', (evt) => {
    const btn = evt.target.closest('[data-upgrade-id]');
    if (!btn) return;
    handleBuyUpgrade(state, callbacks, btn.dataset.upgradeId);
  });

  dom.rejouer.addEventListener('click', () => handleReplay(callbacks));
}

export function injectDebugApi(state, mainGame) {
  if (typeof window !== 'undefined') {
    window.__game_debug = {
      reachThreshold: (thresholdIdx) => {
        const targets = [100000, 1000000, 12000000, 150000000, 1000000000];
        if (thresholdIdx >= 0 && thresholdIdx < targets.length) {
          state.cumul_mR = targets[thresholdIdx];
          state.solde_mR = targets[thresholdIdx];
        }
      },
      setState: (newState) => Object.assign(state, newState),
      getState: () => state,
    };
  }
}
