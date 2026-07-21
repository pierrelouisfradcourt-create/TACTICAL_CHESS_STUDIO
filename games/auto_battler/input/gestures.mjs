// input/gestures.mjs - Listens to real clicks (buttons, shop slots, bench slots, canvas) and
// builds exactly ONE Input from the closed list (INV-13) per gesture, never two. Only this
// module decides how a click maps to a game Input; it never mutates state itself — that's
// submit.mjs's job, called through the `dispatch` callback.
//
// Board interaction model (click-to-select, no drag): click a bench unit or a board unit to
// select it; click an empty board cell to Place the selection there; click the bench area
// (background, not a slot) to send a selected board unit back to the bench; click "Vendre"
// to Sell the selection.

import { pointToCellIndex } from '../layout/layout.mjs';
import { getUnitDef, keywordName, keywordText } from '../content/units.v0.mjs';

const SEAT_ID = 'player_0'; // single-seat slice (product_snapshot.md: no opponents, no combat)

// D1: `range` is now a NUMBER of Manhattan Cells (ratified QB-1/QB-2), not the loose
// 'contact'/'distance' tag. Range 1 IS contact; anything above is reach, and the sheet says how
// far — the player can now compare an Arbalétrier (4) with an Archer d'Élite (5).
function rangeLabel(range) {
  return range <= 1 ? 'Contact' : `${range} cases`;
}

// D1: the cadence is expressed in TICKS BETWEEN TWO ATTACKS, because the combat runs in Ticks
// (04_COMBAT_BIBLE.md). The sheet used to say "1/s", which named a unit the engine does not
// have — a stat sheet lying about the unit of its own number.
function cadenceLabel(cadence) {
  return cadence === 1 ? 'chaque Tick' : `tous les ${cadence} Ticks`;
}

/**
 * C4 (s9-build playtest fix): #unit-card is ephemeral UI state (hover/selection), never part
 * of GameState or the Event Log — it belongs to input/, not renderer/ (R1: the renderer stays
 * BLIND to anything that isn't in the Event Log; hover/selection never is).
 * @param {Document} doc
 * @param {string|null} unitDefId
 */
function renderUnitCard(doc, unitDefId) {
  const el = doc.getElementById('unit-card');
  if (!el) return;
  const def = unitDefId ? getUnitDef(unitDefId) : null;
  if (!def) {
    el.textContent = '';
    el.classList.remove('has-content');
    return;
  }
  el.classList.add('has-content');
  el.innerHTML = '';

  const nameEl = doc.createElement('span');
  nameEl.className = 'unit-card-name';
  // G2: the tribe sits in the title line, beside the rank — it is an identity, not a statistic.
  nameEl.textContent = def.tribe
    ? `${def.name} — ${def.tribe}, rang ${def.rank}`
    : `${def.name} — rang ${def.rank}`;

  const statsEl = doc.createElement('div');
  statsEl.className = 'unit-card-stats';
  const stats = [
    ['PV', def.hp],
    ['Attaque', def.attack],
    ['Cadence', cadenceLabel(def.attack_cadence)],
    ['Portée', rangeLabel(def.range)],
    ['Déplacement', `${def.move_speed} case${def.move_speed > 1 ? 's' : ''}/Tick`]
  ];
  for (const [label, value] of stats) {
    const statEl = doc.createElement('span');
    statEl.textContent = `${label}: ${value}`;
    statsEl.appendChild(statEl);
  }

  // G1/G4: the keywords, in French, with their RULE spelled out and their real amounts — the
  // wording and the numbers both come from the keyword entry itself (content/units.v0.mjs), so
  // the sheet cannot advertise a bonus different from the one the combat applies.
  const kwEl = doc.createElement('div');
  kwEl.className = 'unit-card-keywords';
  for (const kw of (def.keywords || [])) {
    const line = doc.createElement('span');
    line.className = 'unit-card-keyword';
    const strong = doc.createElement('b');
    strong.textContent = keywordName(kw);
    line.appendChild(strong);
    line.appendChild(doc.createTextNode(` — ${keywordText(kw)}`));
    kwEl.appendChild(line);
  }

  const descEl = doc.createElement('div');
  descEl.className = 'unit-card-desc';
  descEl.textContent = def.description;

  el.appendChild(nameEl);
  el.appendChild(statsEl);
  if (kwEl.childNodes.length > 0) el.appendChild(kwEl);
  el.appendChild(descEl);
}

/**
 * Find the unit_def_id of a unit currently on this seat's Bench or Board (input/ is allowed
 * to see state — R1 restricts the RENDERER, not this layer).
 */
function unitDefIdOf(state, unitInstanceId) {
  if (!unitInstanceId) return null;
  const player = state.players[SEAT_ID];
  if (!player) return null;
  const onBench = player.bench.find(u => u.unit_instance_id === unitInstanceId);
  if (onBench) return onBench.unit_def_id;
  const onBoard = player.board.find(u => u.unit_instance_id === unitInstanceId);
  return onBoard ? onBoard.unit_def_id : null;
}

/**
 * @param {Document} doc
 * @param {HTMLCanvasElement} canvas
 * @param {() => Object} getState - returns the CURRENT GameState (input/ is allowed to see it)
 * @param {(input: Object) => void} dispatch - called with exactly one Input per gesture
 * @returns {{selectedUnitId: () => string|null}}
 */
export function attachGestures(doc, canvas, getState, dispatch) {
  let selectedUnitId = null;
  let hoveredUnitDefId = null;

  // Hover always wins the card while active; releasing hover falls back to the selection
  // (or clears, if nothing is selected either).
  function showCard(unitDefId) {
    hoveredUnitDefId = unitDefId;
    renderUnitCard(doc, unitDefId);
  }
  function clearHover() {
    hoveredUnitDefId = null;
    renderUnitCard(doc, unitDefIdOf(getState(), selectedUnitId));
  }

  function setSelected(id) {
    selectedUnitId = id;
    doc.querySelectorAll('[data-unit-instance-id]').forEach(el => {
      el.classList.toggle('is-selected', el.dataset.unitInstanceId === id);
    });
    const sellBtn = doc.getElementById('btn-sell');
    if (sellBtn) sellBtn.disabled = !id;
    if (!hoveredUnitDefId) {
      renderUnitCard(doc, unitDefIdOf(getState(), id));
    }
  }

  const shopEl = doc.getElementById('shop');
  if (shopEl) {
    shopEl.addEventListener('click', (e) => {
      const slot = e.target.closest('[data-shop-index]');
      if (!slot) return;
      dispatch({
        kind: 'Buy',
        seatId: SEAT_ID,
        unitDefId: slot.dataset.unitDefId,
        shop_index: Number(slot.dataset.shopIndex)
      });
    });
    // C4: hover a shop slot -> show its stat sheet in #unit-card.
    shopEl.addEventListener('mouseover', (e) => {
      const slot = e.target.closest('[data-unit-def-id]');
      if (slot) showCard(slot.dataset.unitDefId);
    });
    shopEl.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget || !shopEl.contains(e.relatedTarget)) clearHover();
    });
  }

  const benchEl = doc.getElementById('bench');
  if (benchEl) {
    benchEl.addEventListener('click', (e) => {
      const slot = e.target.closest('[data-unit-instance-id]');
      if (slot) {
        setSelected(slot.dataset.unitInstanceId === selectedUnitId ? null : slot.dataset.unitInstanceId);
        return;
      }
      // Clicked bench background (an empty slot, or the container) with a selection active:
      // return the selected unit to the bench (board -> bench, or a no-op bench -> bench).
      if (selectedUnitId) {
        dispatch({ kind: 'Place', seatId: SEAT_ID, unit_instance_id: selectedUnitId, to_zone: 'bench', to_index: 0 });
        setSelected(null);
      }
    });
    // C4: hover a bench slot -> show its stat sheet in #unit-card.
    benchEl.addEventListener('mouseover', (e) => {
      const slot = e.target.closest('[data-unit-def-id]');
      if (slot) showCard(slot.dataset.unitDefId);
    });
    benchEl.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget || !benchEl.contains(e.relatedTarget)) clearHover();
    });
  }

  function cellIndexFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return pointToCellIndex(x, y);
  }

  canvas.addEventListener('click', (e) => {
    const cellIndex = cellIndexFromEvent(e);
    if (cellIndex < 0) return;

    const state = getState();
    const player = state.players[SEAT_ID];
    const board = player ? player.board : [];
    const occupant = board.find(u => u.board_index === cellIndex);

    if (occupant && !selectedUnitId) {
      setSelected(occupant.unit_instance_id);
      return;
    }

    if (selectedUnitId) {
      dispatch({
        kind: 'Place',
        seatId: SEAT_ID,
        unit_instance_id: selectedUnitId,
        to_zone: 'board',
        to_index: cellIndex
      });
      setSelected(null);
    }
  });

  // C4: hover a placed unit on the board canvas -> show its stat sheet in #unit-card.
  canvas.addEventListener('mousemove', (e) => {
    const cellIndex = cellIndexFromEvent(e);
    if (cellIndex < 0) {
      if (hoveredUnitDefId) clearHover();
      return;
    }
    const state = getState();
    const player = state.players[SEAT_ID];
    const board = player ? player.board : [];
    const occupant = board.find(u => u.board_index === cellIndex);
    if (occupant) {
      if (hoveredUnitDefId !== occupant.unit_def_id) showCard(occupant.unit_def_id);
    } else if (hoveredUnitDefId) {
      clearHover();
    }
  });
  canvas.addEventListener('mouseleave', () => {
    if (hoveredUnitDefId) clearHover();
  });

  const rerollBtn = doc.getElementById('btn-reroll');
  if (rerollBtn) rerollBtn.addEventListener('click', () => dispatch({ kind: 'Reroll', seatId: SEAT_ID }));

  const levelBtn = doc.getElementById('btn-levelup');
  if (levelBtn) levelBtn.addEventListener('click', () => dispatch({ kind: 'LevelUp', seatId: SEAT_ID }));

  const lockBtn = doc.getElementById('btn-lock');
  if (lockBtn) lockBtn.addEventListener('click', () => dispatch({ kind: 'Lock', seatId: SEAT_ID }));

  const readyBtn = doc.getElementById('btn-ready');
  if (readyBtn) readyBtn.addEventListener('click', () => dispatch({ kind: 'ConfirmPreparation', seatId: SEAT_ID }));

  const sellBtn = doc.getElementById('btn-sell');
  if (sellBtn) {
    sellBtn.addEventListener('click', () => {
      if (!selectedUnitId) return;
      dispatch({ kind: 'Sell', seatId: SEAT_ID, unit_instance_id: selectedUnitId });
      setSelected(null);
    });
  }

  return { selectedUnitId: () => selectedUnitId };
}

export const SEAT_ID_DEFAULT = SEAT_ID;
