import { validateAndApply } from '../actions/actions.mjs';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 384;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 12;
const CELL_WIDTH = CANVAS_WIDTH / GRID_WIDTH;
const CELL_HEIGHT = CANVAS_HEIGHT / GRID_HEIGHT;

export const attachInputHandlers = (state, canvas, actionHandlers) => {
  // Tower type buttons
  document.getElementById('btn-gun')?.addEventListener('click', () => {
    validateAndApply(state, { type: 'SELECT_TOWER', towerType: 'gun' });
  });

  document.getElementById('btn-frost')?.addEventListener('click', () => {
    validateAndApply(state, { type: 'SELECT_TOWER', towerType: 'frost' });
  });

  document.getElementById('btn-cannon')?.addEventListener('click', () => {
    validateAndApply(state, { type: 'SELECT_TOWER', towerType: 'cannon' });
  });

  // Canvas placement
  canvas?.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;

    const gridX = Math.floor(pixelX / CELL_WIDTH);
    const gridY = Math.floor(pixelY / CELL_HEIGHT);

    validateAndApply(state, { type: 'PLACE_TOWER', x: gridX, y: gridY });
  });

  // Upgrade button
  document.getElementById('btn-upgrade')?.addEventListener('click', () => {
    // Upgrade first selected tower (simplified)
    if (state.towers.length > 0) {
      validateAndApply(state, { type: 'UPGRADE_TOWER', towerId: state.towers[0].id });
    }
  });

  // Call wave button
  document.getElementById('btn-call-wave')?.addEventListener('click', () => {
    validateAndApply(state, { type: 'CALL_WAVE' });
  });

  // Restart button
  document.getElementById('restart')?.addEventListener('click', () => {
    validateAndApply(state, { type: 'RESTART' });
  });
};
