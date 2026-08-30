// hud.mjs — chrome périphérique : ligne d'objectif, overlay de fin, couleurs.
// Lecture seule de logic. Couleurs strictement disjointes des rôles.

export function renderObjective(state) {
  let hud = document.getElementById('hud-objective');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'hud-objective';
    hud.style.padding = '10px';
    hud.style.backgroundColor = '#f0f0f0';
    hud.style.fontFamily = 'sans-serif';
    hud.style.fontSize = '14px';
    hud.style.borderBottom = '1px solid #ddd';
    document.body.insertBefore(hud, document.body.firstChild);
  }
  hud.textContent = state.currentObjective();
}

export function renderHud(state) {
  renderObjective(state);
  renderEndScreen(state);
}

// L'overlay est créé UNE fois (idempotent) puis seulement montré/caché via la
// classe 'hidden' (contrat de jouabilité : #overlay avec classe hidden quand
// caché). Ne jamais recréer/retirer l'élément — un click-through réel doit
// pouvoir observer #restart de façon stable entre deux frames.
function ensureOverlay() {
  let overlay = document.getElementById('overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.className = 'hidden';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '999';

  const inner = document.createElement('div');
  inner.style.backgroundColor = 'white';
  inner.style.padding = '30px';
  inner.style.borderRadius = '8px';
  inner.style.textAlign = 'center';
  inner.style.fontFamily = 'sans-serif';

  const title = document.createElement('h2');
  title.id = 'overlayTitle';
  title.textContent = 'Victoire!';
  title.style.color = '#004d33';
  title.style.margin = '0 0 20px 0';
  inner.appendChild(title);

  const btn = document.createElement('button');
  btn.id = 'restart';
  btn.textContent = 'Rejouer';
  btn.style.padding = '10px 20px';
  btn.style.fontSize = '14px';
  btn.style.cursor = 'pointer';
  inner.appendChild(btn);

  overlay.appendChild(inner);
  document.body.appendChild(overlay);
  return overlay;
}

function renderEndScreen(state) {
  const overlay = ensureOverlay();
  overlay.classList.toggle('hidden', !state.won);
}

export function checkColorDisjointness() {
  const colors = {
    player: '#2196F3', // bleu
    interactive: '#ffb600', // ambre
    terminal: '#00c851'  // émeraude
  };
  const s = new Set(Object.values(colors));
  return s.size === 3; // Trois couleurs disjointes
}
