// renderer/render_dom.mjs - HTML surface (R8): gold, level, boutique, verrou, banc, minuteur,
// boutons — texte et éléments DOM réels, jamais des pixels peints. Reads ONLY the view model
// built by viewmodel.mjs (never the Event Log directly, never GameState, never window.__game —
// R1/R10 note in blueprint.yaml).

import { REROLL_COST, BENCH_CAPACITY, SHOP_SIZE, SHOP_ODDS_TABLE, LIFE_INITIAL, LEVEL_UP_COSTS } from '../params.v0.mjs';
import { getUnitDef, getUnitRank, keywordName } from '../content/units.v0.mjs';

// G2/G4 (s9-build commande G): a synergy nobody can read before buying is not a synergy. Every
// unit surface therefore carries its TRIBE and its KEYWORDS, in French, next to the price —
// the moment the choice is made is the moment the information is needed.
// The wording comes from ONE place (content/units.v0.mjs::KEYWORD_LABELS, the same table the
// stat sheet uses); this module never spells a keyword out itself.
function unitTagLine(def) {
  if (!def) return '';
  const parts = [];
  if (def.tribe) parts.push(def.tribe);
  for (const kw of (def.keywords || [])) parts.push(keywordName(kw));
  return parts.join(' · ');
}

/** A unit button: the name on top, the tribe and keywords under it, the value on the right. */
function appendUnitLabel(doc, slot, def, fallbackId, valueText, valueClass) {
  const main = doc.createElement('span');
  main.className = 'unit-main';
  const nameEl = doc.createElement('span');
  nameEl.className = 'unit-name';
  nameEl.textContent = def ? def.name : fallbackId;
  main.appendChild(nameEl);
  const tags = unitTagLine(def);
  if (tags) {
    const tagEl = doc.createElement('span');
    tagEl.className = 'unit-tags';
    tagEl.textContent = tags;
    main.appendChild(tagEl);
  }
  const valueEl = doc.createElement('span');
  valueEl.className = valueClass;
  valueEl.textContent = valueText;
  slot.appendChild(main);
  slot.appendChild(valueEl);
}

// C2/ECO-2: SHOP_ODDS_TABLE is imported here by REFERENCE (the same array shop/shop.mjs reads
// for the draw, never a copy) — a single source of truth between what the player is told and
// what actually happens. Read directly off params.v0.mjs, never re-declared.

// C4 (s9-build playtest fix): every unit surface (shop, bench, board) now shows the unit's
// NAME (content/units.v0.mjs) instead of its raw unit_def_id fixture identifier.

// GENUINE GAP (flagged in the builder report): the Event Log only carries a Buy's gold_cost
// AFTER the purchase (UnitBought.gold_cost) — no Event exists that prices a Shop slot BEFORE
// it is bought. To show a price tag (so a refusal is predictable, not just explained after
// the fact), this screen must know the price rule.
// D1: the per-unit price table this file used to duplicate is GONE on both sides — the price is
// the unit's RANK, read from the one content module preparation.mjs derives it from too. The
// duplication that had to be "verified byte-identical" no longer exists.
const DISPLAY_BUY_COST = (unitDefId) => getUnitRank(unitDefId);
// F1 (s9-build commande F): no local copy of the LevelUp price table any more — this used to be
// its OWN duplicate `{1:1,2:2,3:3,4:4,5:5}`, a second source of truth that had to stay in sync
// with preparation.mjs by hand. Reads params.v0.mjs::LEVEL_UP_COSTS by the SAME reference
// preparation.mjs debits from (single source of truth, same motif as SHOP_ODDS_TABLE below).

function formatTimer(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return String(s).padStart(2, '0');
}

function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

/**
 * Render/update the DOM surface from a view model. Idempotent — safe to call every frame.
 * @param {Document} doc
 * @param {Object} vm - from viewmodel.buildViewModel
 * @param {number} secondsRemaining - injected by app/, derived from the frame counter, never
 *   a wall-clock read performed in this module (R2).
 */
export function renderDom(doc, vm, secondsRemaining, roundNumber = 0) {
  setText(doc.getElementById('gold'), String(vm.gold));
  setText(doc.getElementById('level'), String(vm.level));
  setText(doc.getElementById('timer'), formatTimer(secondsRemaining));
  setText(doc.getElementById('round'), roundNumber > 0 ? String(roundNumber) : '—');
  renderLife(doc, vm);
  renderBoardCapacity(doc, vm);

  renderShopOdds(doc, vm);
  renderShop(doc, vm);
  renderBench(doc, vm);
  renderLock(doc, vm);
  renderButtons(doc, vm);
  renderPhaseBanner(doc, vm);
  renderMergeBanner(doc, vm);
  hideCombatPanel(doc);
}

// =============================================================================================
// E1/E4 — THE STAKE, ON SCREEN AT ALL TIMES
// =============================================================================================

const LIFE_ALARM_FRACTION = 0.34; // last third of the starting Life: the plate turns alarm red

/**
 * The Seat's Life. `displayLife` lets the caller show the value from BEFORE the battle that is
 * currently being watched — the drop must land with the result, not before the first arrow flies.
 */
function renderLife(doc, vm, displayLife = vm.life) {
  const el = doc.getElementById('life');
  if (!el) return;
  setText(el, String(displayLife));
  el.classList.toggle('is-alarm', displayLife <= LIFE_INITIAL * LIFE_ALARM_FRACTION);
}

/**
 * E4: "unités posées / limite", permanently visible. Both numbers come from the view model, i.e.
 * from the journal (board contents) and from the ratified rule (boardCapacityForLevel, the very
 * function preparation/ enforces — no second rule written here).
 */
function renderBoardCapacity(doc, vm) {
  const el = doc.getElementById('board-capacity');
  if (!el) return;
  setText(el, `${vm.board_used} / ${vm.board_capacity}`);
  el.classList.toggle('is-alarm', vm.board_used >= vm.board_capacity);
}

/**
 * E1 — the end of the game. Reached from the journal alone: `PhaseChanged{to_phase:'Elimination'}`
 * is an EXISTING Event kind (no 23rd name was created). Shows the DEFEAT and the number of Rounds
 * held — the only score this slice has. There is deliberately no victory screen: with a single
 * Seat facing a placeholder army, "last one standing" would be an invented win condition
 * (round/round.mjs::isMatchOver, TODO [FOG]).
 */
export function renderEliminationDom(doc, vm, roundNumber = 0) {
  setText(doc.getElementById('gold'), String(vm.gold));
  setText(doc.getElementById('level'), String(vm.level));
  setText(doc.getElementById('timer'), '—');
  setText(doc.getElementById('round'), roundNumber > 0 ? String(roundNumber) : '—');
  renderLife(doc, vm);
  renderBoardCapacity(doc, vm);

  for (const id of ['btn-reroll', 'btn-levelup', 'btn-lock', 'btn-ready', 'btn-sell']) {
    const btn = doc.getElementById(id);
    if (btn) btn.disabled = true;
  }
  doc.querySelectorAll('.shop-slot, .bench-slot').forEach(el => { el.disabled = true; });

  const banner = doc.getElementById('phase-banner');
  if (banner) {
    banner.textContent = 'Partie terminée';
    banner.classList.add('is-visible');
  }

  const panel = doc.getElementById('combat-panel');
  if (!panel) return;
  panel.classList.add('has-content');
  panel.innerHTML = '';

  const title = doc.createElement('span');
  title.className = 'combat-verdict';
  title.textContent = 'DÉFAITE — votre vie est tombée à zéro';

  const lines = doc.createElement('div');
  lines.className = 'combat-lines';
  for (const [label, value] of [
    ['Tours survécus', String(roundNumber)],
    ['Vie', String(vm.life)],
    ['Niveau atteint', String(vm.level)]
  ]) {
    const row = doc.createElement('span');
    row.textContent = `${label} : ${value}`;
    lines.appendChild(row);
  }

  const next = doc.createElement('div');
  next.className = 'combat-next';
  next.textContent = 'Rechargez la page pour une nouvelle partie.';

  panel.appendChild(title);
  panel.appendChild(lines);
  panel.appendChild(next);
}

// =============================================================================================
// COMBAT DOM (D4) — the readable result. Fed ONLY by the combat frame folded from the Event Log.
// =============================================================================================

const RESOLUTION_LABEL = {
  elimination: 'par élimination',
  tick_limit: 'à la limite de temps',
  draw: 'anéantissement mutuel'
};

/**
 * @param {Document} doc
 * @param {Object} vm - view model (phase, gold, level... — for the plates that stay on screen)
 * @param {Object} frame - from renderer/combat_view.mjs::buildCombatFrame
 * @param {number} roundNumber - derived from the journal (see combat_view insufficiency #3)
 */
export function renderCombatDom(doc, vm, frame, roundNumber = 0) {
  setText(doc.getElementById('gold'), String(vm.gold));
  setText(doc.getElementById('level'), String(vm.level));
  setText(doc.getElementById('timer'), '—');
  setText(doc.getElementById('round'), roundNumber > 0 ? String(roundNumber) : '—');
  // E1: the journal already holds the WHOLE battle (it is computed at once, CBT-1), so the fold
  // already knows the Life it will cost. Showing the new value before the fight has been WATCHED
  // would spoil its own result — the plate holds the pre-combat value until the playback ends.
  renderLife(doc, vm, frame.finished ? vm.life : vm.life_before_last_combat);
  renderBoardCapacity(doc, vm);

  // Every Preparation control is inert during a battle: the player is a SPECTATOR (INV-13,
  // CBT-7 — the Combat consumes no Input at all).
  for (const id of ['btn-reroll', 'btn-levelup', 'btn-lock', 'btn-ready', 'btn-sell']) {
    const btn = doc.getElementById(id);
    if (btn) btn.disabled = true;
  }
  doc.querySelectorAll('.shop-slot, .bench-slot').forEach(el => { el.disabled = true; });

  const banner = doc.getElementById('phase-banner');
  if (banner) {
    const alive = frame.units.filter(u => u.alive);
    const mine = alive.filter(u => u.is_viewer).length;
    const theirs = alive.length - mine;
    banner.textContent = frame.finished
      ? 'Bataille terminée'
      : `Bataille — tick ${frame.tick}/${frame.last_tick} · vos unités ${mine} · adverses ${theirs}`;
    banner.classList.add('is-visible');
  }

  const panel = doc.getElementById('combat-panel');
  if (!panel) return;
  if (!frame.finished || !frame.result) {
    panel.classList.remove('has-content');
    panel.innerHTML = '';
    return;
  }

  const r = frame.result;
  const verdict = r.resolution_kind === 'draw'
    ? 'MATCH NUL'
    : (r.viewer_won ? 'VICTOIRE' : 'DÉFAITE');

  panel.classList.add('has-content');
  panel.innerHTML = '';
  const title = doc.createElement('span');
  title.className = 'combat-verdict';
  title.textContent = `${verdict} — ${RESOLUTION_LABEL[r.resolution_kind] || r.resolution_kind}`;

  const lines = doc.createElement('div');
  lines.className = 'combat-lines';
  // Two DIFFERENT quantities, deliberately shown side by side (they were confusable before E1):
  //   "Dégâts subis"  = Health your UNITS lost, summed off the Damage Events (INV-14).
  //   "Vie perdue"    = the Life YOU lost, the Round Resolution's consequence (E1/E2) — the
  //                     ratified formula, level of the winner + ranks of its survivors.
  const rows = [
    ['Vie perdue', String(vm.last_life_damage)],
    ['Vie restante', String(vm.life)],
    ['Dégâts subis', String(frame.damage_taken)],
    ['Dégâts infligés', String(frame.damage_dealt)],
    ['Ticks', String(r.ticks_elapsed)],
    ['Survivants', String(r.survivors.length)]
  ];
  for (const [label, value] of rows) {
    const row = doc.createElement('span');
    row.textContent = `${label} : ${value}`;
    lines.appendChild(row);
  }

  const next = doc.createElement('div');
  next.className = 'combat-next';
  next.textContent = 'Tour suivant dans un instant…';

  panel.appendChild(title);
  panel.appendChild(lines);
  panel.appendChild(next);
}

function hideCombatPanel(doc) {
  const panel = doc.getElementById('combat-panel');
  if (!panel) return;
  if (panel.classList.contains('has-content')) {
    panel.classList.remove('has-content');
    panel.innerHTML = '';
  }
}

// The render loop runs every animation frame (~60/s via app/'s requestAnimationFrame), but
// the Event Log only changes on an accepted Input — full innerHTML rebuilds on every frame
// would replace live DOM nodes out from under a real user click before the click completes
// (observed: Playwright's click on #shop intermittently hit a just-detached button). Skip
// the rebuild entirely when nothing relevant to THIS section changed since the last frame.
// C2/ECO-2: reads SHOP_ODDS_TABLE by the SAME reference shop/shop.mjs draws from (imported
// once, at module load, from params.v0.mjs — never copied). Tells the player, in plain
// French, exactly what the draw at their current level can produce.
function renderShopOdds(doc, vm) {
  const el = doc.getElementById('shop-odds');
  if (!el) return;
  const levelIndex = Math.min(vm.level, SHOP_ODDS_TABLE.length) - 1;
  const weights = SHOP_ODDS_TABLE[levelIndex] || [];
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const parts = weights
    .map((w, i) => (w > 0 ? `rang ${i + 1} ${Math.round((w / total) * 100)}%` : null))
    .filter(Boolean);
  const text = `Niveau ${vm.level} — ${parts.join(' · ')}`;
  setText(el, text);
}

function renderShop(doc, vm) {
  const shopEl = doc.getElementById('shop');
  if (!shopEl) return;
  const sig = JSON.stringify(vm.shop) + '|' + vm.gold + '|' + vm.phase;
  if (shopEl.dataset.sig === sig) return;
  shopEl.dataset.sig = sig;

  shopEl.innerHTML = '';
  vm.shop.forEach((unitDefId, i) => {
    const cost = DISPLAY_BUY_COST(unitDefId);
    const def = getUnitDef(unitDefId);
    const slot = doc.createElement('button');
    slot.type = 'button';
    slot.className = 'shop-slot';
    slot.dataset.shopIndex = String(i);
    slot.dataset.unitDefId = unitDefId;
    slot.disabled = vm.phase !== 'Preparation' || vm.gold < cost;
    appendUnitLabel(doc, slot, def, unitDefId, `${cost} or`, 'unit-cost');
    shopEl.appendChild(slot);
  });
  for (let i = vm.shop.length; i < SHOP_SIZE; i++) {
    const empty = doc.createElement('div');
    empty.className = 'shop-slot shop-slot--empty';
    shopEl.appendChild(empty);
  }
}

function renderBench(doc, vm) {
  const benchEl = doc.getElementById('bench');
  if (!benchEl) return;
  // The phase is part of the signature: renderCombatDom disables every bench slot during a
  // battle, so coming back to Preparation with an UNCHANGED bench must still rebuild them —
  // otherwise the bench stays dead for the rest of the game.
  const sig = JSON.stringify(vm.bench.map(u => [u.unit_instance_id, u.star])) + '|' + vm.phase;
  if (benchEl.dataset.sig === sig) return;
  benchEl.dataset.sig = sig;

  benchEl.innerHTML = '';
  vm.bench.forEach(unit => {
    const def = getUnitDef(unit.unit_def_id);
    const slot = doc.createElement('button');
    slot.type = 'button';
    slot.className = 'bench-slot';
    slot.dataset.unitInstanceId = unit.unit_instance_id;
    slot.dataset.unitDefId = unit.unit_def_id;
    appendUnitLabel(doc, slot, def, unit.unit_def_id, '★'.repeat(unit.star), 'unit-star');
    benchEl.appendChild(slot);
  });
  for (let i = vm.bench.length; i < BENCH_CAPACITY; i++) {
    const empty = doc.createElement('div');
    empty.className = 'bench-slot bench-slot--empty';
    benchEl.appendChild(empty);
  }
}

function renderLock(doc, vm) {
  const btn = doc.getElementById('btn-lock');
  if (!btn) return;
  btn.textContent = vm.shop_locked ? 'Verrouillé' : 'Verrouiller';
  btn.classList.toggle('is-active', vm.shop_locked);
  btn.disabled = vm.phase !== 'Preparation';
}

function renderButtons(doc, vm) {
  const rerollBtn = doc.getElementById('btn-reroll');
  if (rerollBtn) {
    rerollBtn.textContent = `Rafraîchir — ${REROLL_COST} or`;
    rerollBtn.disabled = vm.phase !== 'Preparation' || vm.gold < REROLL_COST;
  }

  const levelBtn = doc.getElementById('btn-levelup');
  if (levelBtn) {
    const nextLevel = vm.level + 1;
    const cost = LEVEL_UP_COSTS[nextLevel];
    if (cost === undefined) {
      // Mirrors preparation.mjs::handleLevelUp: no ratified price beyond the table, so the Input
      // is refused. The button says so instead of advertising a free level (it used to read
      // "Monter de niveau — 0 or" and worked, which was the display of an invented price).
      levelBtn.textContent = 'Niveau maximum atteint';
      levelBtn.disabled = true;
    } else {
      levelBtn.textContent = `Monter de niveau — ${cost} or`;
      levelBtn.disabled = vm.phase !== 'Preparation' || vm.gold < cost;
    }
  }

  const readyBtn = doc.getElementById('btn-ready');
  if (readyBtn) {
    readyBtn.disabled = vm.phase !== 'Preparation';
  }
}

// D4: the "combat hors périmètre" banner is GONE — the combat is now in the perimeter, and
// while it runs the banner is written by renderCombatDom. In Preparation it stays empty.
function renderPhaseBanner(doc, vm) {
  const el = doc.getElementById('phase-banner');
  if (!el) return;
  el.textContent = '';
  el.classList.remove('is-visible');
}

function renderMergeBanner(doc, vm) {
  const el = doc.getElementById('merge-banner');
  if (!el) return;
  el.textContent = vm.last_merge
    ? `Fusion — ${vm.last_merge.unit_def_id} → ${'★'.repeat(vm.last_merge.star)}`
    : '';
}
