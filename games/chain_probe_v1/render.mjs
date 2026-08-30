// render.mjs — rendu DOM du monde. Lecture seule de logic.

// Dimensions du monde rendu. Constantes nommées (jamais de nombre magique répandu
// dans la boucle de grille) — miroir des bornes de logic.mjs, que render ne peut
// pas importer autrement sans créer une dépendance de rendu sur l'état.
const WORLD_WIDTH = 400;
const WORLD_HEIGHT = 300;

export function renderScene(state) {
  const container = document.getElementById('game-container');
  if (!container) return;

  container.innerHTML = '';
  container.style.width = WORLD_WIDTH + 'px';
  container.style.height = WORLD_HEIGHT + 'px';
  container.style.position = 'relative';
  container.style.border = '2px solid #333';
  container.style.backgroundColor = '#f5f5f5';
  container.style.overflow = 'hidden';

  // Espace exploré (grille)
  const gridLayer = document.createElement('div');
  gridLayer.style.position = 'absolute';
  gridLayer.style.top = '0';
  gridLayer.style.left = '0';
  gridLayer.style.width = '100%';
  gridLayer.style.height = '100%';
  gridLayer.style.opacity = '0.1';

  // Balayage PAR INDICE DE CELLULE (et non par pixel) : l'indice de grille est la
  // donnée première — c'est lui que `state.exploredCells` mémorise — et la position
  // pixel en est dérivée, plus l'inverse. Le nombre de cellules est donc borné par
  // construction, et l'oracle mécanique l'assert exactement (cf. properties.test.mjs
  // « renderScene: la grille rend exactement cols*rows cellules »).
  const cellSize = 50;
  const cols = Math.ceil(WORLD_WIDTH / cellSize);
  const rows = Math.ceil(WORLD_HEIGHT / cellSize);
  for (let i = 0; i < cols * rows; i++) {
    const cellX = i % cols;
    const cellY = Math.floor(i / cols);
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.style.position = 'absolute';
    cell.style.left = (cellX * cellSize) + 'px';
    cell.style.top = (cellY * cellSize) + 'px';
    cell.style.width = cellSize + 'px';
    cell.style.height = cellSize + 'px';
    cell.style.border = '1px solid #ccc';
    if (state.exploredCells.has(`${cellX},${cellY}`)) {
      cell.style.backgroundColor = '#e0e0e0';
    }
    gridLayer.appendChild(cell);
  }
  container.appendChild(gridLayer);

  // Objets interactifs (ambre)
  for (const obj of state.objects) {
    if (obj.visible || obj.active) {
      const el = document.createElement('div');
      el.className = 'game-object';
      el.dataset.id = obj.id;
      el.style.position = 'absolute';
      el.style.left = (obj.x - 15) + 'px';
      el.style.top = (obj.y - 15) + 'px';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = obj.active ? '#d4b500' : '#ffb600';
      el.style.border = '2px solid #ff9800';
      el.style.cursor = 'pointer';
      el.style.opacity = obj.active ? '0.5' : '1';
      el.style.transition = 'all 150ms ease';
      container.appendChild(el);
    }
  }

  // Terminal (émeraude)
  if (state.terminalState === 'AVAILABLE' || state.frameCount > 10) {
    const term = document.createElement('div');
    term.className = 'game-terminal';
    term.style.position = 'absolute';
    term.style.left = (state.terminalX - 20) + 'px';
    term.style.top = (state.terminalY - 20) + 'px';
    term.style.width = '40px';
    term.style.height = '40px';
    term.style.borderRadius = '50%';
    term.style.backgroundColor = state.terminalState === 'AVAILABLE' ? '#00c851' : '#ccc';
    term.style.border = '3px solid #004d33';
    term.style.cursor = state.terminalState === 'AVAILABLE' ? 'pointer' : 'not-allowed';
    container.appendChild(term);
  }

  // Avatar (bleu)
  const avatar = document.createElement('div');
  avatar.className = 'game-avatar';
  avatar.style.position = 'absolute';
  avatar.style.left = (state.avatarX - 12) + 'px';
  avatar.style.top = (state.avatarY - 12) + 'px';
  avatar.style.width = '24px';
  avatar.style.height = '24px';
  avatar.style.borderRadius = '50%';
  avatar.style.backgroundColor = '#2196F3';
  avatar.style.border = '2px solid #0d47a1';
  avatar.style.zIndex = '10';
  container.appendChild(avatar);
}

export function renderFeedback(objectId) {
  const obj = document.querySelector(`[data-id="${objectId}"]`);
  if (obj) {
    obj.style.transform = 'scale(1.3)';
    obj.style.boxShadow = '0 0 15px rgba(255, 150, 0, 0.8)';
    setTimeout(() => {
      obj.style.transform = 'scale(1)';
      obj.style.boxShadow = 'none';
    }, 150);
  }
}
