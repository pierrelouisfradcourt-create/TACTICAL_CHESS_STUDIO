// e2e_synergies.mjs — s9-build commande G proof script. Plays a REAL game through the actual
// browser UI (Playwright/Chromium, real clicks on the same circuit a human uses: app ->
// input/gestures.mjs -> input/submit.mjs -> preparation.applyPreparationInput), buys a board of
// ONE TRIBE, and captures the two proofs the dispatch asks for:
//
//   e2e-shots/i25-12-synergies.png       — a unit sheet showing its TRIBE and its KEYWORDS in
//                                          clear French, with the shop showing the same tags on
//                                          every slot (readable BEFORE buying)
//   e2e-shots/i25-13-combat-motscles.png — a keyword effect visible ON THE BOARD during a fight
//
// Buying strategy: a pure CHEVALERIE board, and not before it holds a BOUCLIER DIVIN. Chevalerie
// spreads over ranks 1..4 (Piquier, Hallebardier, Chevalier, Templier, Chef de Guerre) and carries
// Provocation, Bouclier divin, Furie des vents and a Meneur — so the battle screen shows several
// keywords at once. The waiting condition is what makes the second capture REPRODUCIBLE rather
// than a lucky frame: the halo and the brackets are PERSISTENT marks, they do not last one frame.
//
// Usage: node e2e_synergies.mjs   (headless by default; HEADED=1 to watch)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { getUnitDef } from './content/units.v0.mjs';
import { KEYWORDS } from './combat/keywords.mjs';
import { TICK_DURATION_MS } from './params.v0.mjs';

const hasKw = (defId, id) => {
  const d = getUnitDef(defId);
  return !!d && (d.keywords || []).some(k => k.id === id);
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(__dirname, '..', '..', 'llm-lego', 'package.json'));
const { chromium } = require('playwright');

const PORT = Number(process.env.AUTO_BATTLER_PORT || 4523);
const SEED = process.env.SEED || '20260720';
const URL = `http://localhost:${PORT}/?seed=${SEED}`;
const SHOTS = join(__dirname, 'e2e-shots');
const TARGET_TRIBE = process.env.TARGET_TRIBE || 'Chevalerie';
const MAX_ROUNDS = 24;
const WANTED_BOARD = 3; // enough units for a leader + buffed allies to be visible at once

// Canvas geometry, mirrored from layout/layout.mjs (the script clicks pixels like a human does).
const CANVAS = 576;
const MARGIN = 40;
const CELL = (CANVAS - 2 * MARGIN) / 8;
const cellPoint = (index) => ({
  x: MARGIN + (index % 8) * CELL + CELL / 2,
  y: MARGIN + Math.floor(index / 8) * CELL + CELL / 2
});

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, 'web', 'server.mjs')], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, AUTO_BATTLER_PORT: String(PORT) }
  });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('serveur trop long à démarrer')), 8000);
    proc.stdout.on('data', (d) => {
      if (String(d).includes('interface jouable')) { clearTimeout(t); resolve(proc); }
    });
    proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
    proc.on('exit', (c) => reject(new Error('serveur a quitté, code ' + c)));
  });
}

const getState = (page) => page.evaluate(() => window.__game.getState());

/**
 * Wait, INSIDE the page, for the frame where a divine shield is drawn SWALLOWING a blow — then
 * freeze that exact frame so it can be photographed.
 *
 * Why in the page and not with `waitForTimeout` + `screenshot`: at 450 ms per Tick the window
 * where the halo is still lit AND the burst already reads BOUCLIER lasts about 60 ms
 * (renderer/combat_view.mjs::IMPACT_AT = 0.86 -> end of Tick). Every Playwright round trip costs
 * more than that, so aiming at a millisecond loses the frame — measured, twice. Detecting the
 * frame from a requestAnimationFrame loop inside the page costs nothing and cannot miss it.
 *
 * The detector is a PIXEL COUNT of the divine colour (#FFF3CD, render_canvas::COLOR_DIVINE): the
 * halo alone paints a thin ring, the absorption adds a wide circle, four spokes and a word. No
 * other colour of the palette falls in this window (parchment 232,223,200; arrow 240,217,160).
 *
 * The freeze is a CAPTURE HARNESS action, said out loud: the frame is copied into an <img> laid
 * over the canvas. Nothing in the game is modified — the game keeps playing underneath.
 */
function waitForAbsorptionFrame(page, budgetMs) {
  return page.evaluate(async (budget) => {
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const count = () => {
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] >= 242 && d[i + 1] >= 230 && d[i + 1] <= 255 && d[i + 2] >= 186 && d[i + 2] <= 228) n++;
      }
      return n;
    };
    const baseline = count();
    const deadline = performance.now() + budget;
    let peak = baseline;
    return new Promise((resolve) => {
      const step = () => {
        const n = count();
        if (n > peak) peak = n;
        if (n > baseline * 1.4 && n > baseline + 120) {
          const img = document.createElement('img');
          img.src = canvas.toDataURL();
          const r = canvas.getBoundingClientRect();
          img.style.cssText = `position:absolute;left:${r.left + window.scrollX}px;top:${r.top + window.scrollY}px;` +
            `width:${r.width}px;height:${r.height}px;z-index:99`;
          document.body.appendChild(img);
          resolve({ frozen: true, baseline, n });
          return;
        }
        if (performance.now() > deadline) { resolve({ frozen: false, baseline, peak }); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, budgetMs);
}

async function waitForPhase(page, phase, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = await getState(page);
    if (s.phase === phase) return s;
    await page.waitForTimeout(80);
  }
  throw new Error(`timeout waiting for phase ${phase}`);
}

/** The shop, as the PLAYER sees it: what the DOM slots actually say. */
async function readShop(page) {
  return page.$$eval('.shop-slot[data-unit-def-id]', (nodes) => nodes.map((n, i) => ({
    index: i,
    defId: n.dataset.unitDefId,
    disabled: n.disabled,
    name: n.querySelector('.unit-name') ? n.querySelector('.unit-name').textContent : '',
    tags: n.querySelector('.unit-tags') ? n.querySelector('.unit-tags').textContent : ''
  })));
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const server = await startServer();
  console.log('server up on port', PORT);

  const browser = await chromium.launch({ headless: !process.env.HEADED });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const log = [];

  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && typeof window.__game.getState === 'function', { timeout: 8000 });

    // ---------------------------------------------------------------- build a one-tribe board
    let round = 0;
    let ready = false;
    while (round < MAX_ROUNDS && !ready) {
      const before = await waitForPhase(page, 'Preparation', 10000);
      const player = before.players.player_0;
      log.push(`round=${before.round_index} level=${player.level} gold=${player.gold} board=${player.board.length}`);

      // Level up while the board can hold fewer units than we want (capacity === level, E4).
      while (player.level < WANTED_BOARD) {
        const btn = page.locator('#btn-levelup');
        if (await btn.isDisabled()) break;
        await btn.click();
        await page.waitForTimeout(40);
        player.level = (await getState(page)).players.player_0.level;
      }

      // Buy every affordable slot of the target tribe; reroll when none is offered.
      for (let attempt = 0; attempt < 6; attempt++) {
        const shop = await readShop(page);
        const wanted = shop.filter(s => !s.disabled && getUnitDef(s.defId) &&
          getUnitDef(s.defId).tribe === TARGET_TRIBE);
        if (wanted.length > 0) {
          for (const slot of wanted) {
            const el = page.locator(`.shop-slot[data-shop-index="${slot.index}"]`);
            if (await el.count() === 0 || await el.isDisabled()) continue;
            await el.click();
            log.push(`  ACHAT ${slot.name} [${slot.tags}]`);
            await page.waitForTimeout(60);
            break; // the shop rebuilds after a purchase — re-read it
          }
          continue;
        }
        const reroll = page.locator('#btn-reroll');
        if (await reroll.isDisabled()) break;
        await reroll.click();
        await page.waitForTimeout(60);
      }

      // Place every bench unit on a free cell of our own half (bottom half, rows 4..7).
      let guard = 0;
      while (guard++ < 12) {
        const s = await getState(page);
        const p = s.players.player_0;
        if (p.bench.length === 0 || p.board.length >= p.level) break;
        const used = new Set(p.board.map(x => x.board_index));
        const free = [52, 53, 51, 54, 44, 45, 43, 46, 60, 61].find(i => !used.has(i));
        if (free === undefined) break;
        const benchSlot = page.locator(`.bench-slot[data-unit-instance-id="${p.bench[0].unit_instance_id}"]`);
        if (await benchSlot.count() === 0) break;
        await benchSlot.click();
        await page.waitForTimeout(40);
        const pt = cellPoint(free);
        await page.locator('#board').click({ position: pt });
        await page.waitForTimeout(60);
      }

      const now = await getState(page);
      const board = now.players.player_0.board;
      const tribes = board.map(x => getUnitDef(x.unit_def_id).tribe);
      log.push(`  board=${board.map(x => getUnitDef(x.unit_def_id).name).join(', ')} tribus=${[...new Set(tribes)].join('/')}`);
      // Wait for a board that is (a) full for this level, (b) ONE tribe, and (c) carries at least
      // one Bouclier divin and one Provocation — the two persistent marks the capture must show.
      const hasShield = board.some(x => hasKw(x.unit_def_id, KEYWORDS.DIVINE_SHIELD));
      const hasTaunt = board.some(x => hasKw(x.unit_def_id, KEYWORDS.TAUNT));
      if (board.length >= WANTED_BOARD && tribes.every(t => t === TARGET_TRIBE) && hasShield && hasTaunt) {
        ready = true;
        break;
      }

      await page.locator('#btn-ready').click();
      // A battle can run to TICK_LIMIT (50 Ticks x TICK_DURATION_MS) plus the result screen —
      // a tanky board reaches it regularly, so the wait must cover the whole playback.
      const deadline = Date.now() + 45000;
      let next = null;
      while (Date.now() < deadline) {
        const s = await getState(page);
        if (s.phase === 'Preparation' && s.round_index > before.round_index) { next = s; break; }
        await page.waitForTimeout(80);
      }
      if (!next) throw new Error('timeout waiting for next round');
      round++;
    }

    const armed = await getState(page);
    const armedBoard = armed.players.player_0.board;
    if (armedBoard.length === 0) throw new Error('aucune unité posée: la preuve serait vide');

    // -------------------------------------------------- SHOT 12: the sheet, tribe + keywords
    // Hover a placed unit on the canvas — exactly the gesture a player makes to read a unit.
    // The RICHEST unit is chosen (most keywords), so the sheet proves the whole layout, not the
    // easy case of a single line.
    const first = [...armedBoard].sort((a, b) =>
      (getUnitDef(b.unit_def_id).keywords || []).length - (getUnitDef(a.unit_def_id).keywords || []).length)[0];
    await page.locator('#board').hover({ position: cellPoint(first.board_index) });
    await page.waitForTimeout(200);
    const cardText = await page.locator('#unit-card').textContent();
    log.push(`FICHE affichée: ${cardText.replace(/\s+/g, ' ').trim()}`);
    await page.screenshot({ path: join(SHOTS, 'i25-12-synergies.png'), fullPage: false });
    log.push('SCREENSHOT i25-12-synergies.png');

    // -------------------------------------------------- SHOT 13: a keyword effect, in combat
    const beforeBattle = await getState(page);
    await page.locator('#btn-ready').click();

    // The whole combat is a pure function computed in ONE frame (CBT-1), so the journal is
    // complete as soon as the phase changes. Poll hard for that instant: it is the playback
    // anchor app/ uses, and knowing it is what lets the capture be AIMED at a Tick instead of
    // taken blind.
    const previousRef = (() => {
      const last = [...beforeBattle.eventLog].reverse().find(e => e.combat_ref);
      return last ? last.combat_ref : null;
    })();
    let anchorMs = 0;
    let segment = [];
    const battleDeadline = Date.now() + 8000;
    while (Date.now() < battleDeadline) {
      const s = await getState(page);
      const last = [...s.eventLog].reverse().find(e => e.combat_ref);
      // The phase flips one frame BEFORE app/ resolves the battle, so "the log grew" is not
      // enough: wait for a segment that is NEW and already carries its Victory (CBT-1 — the whole
      // fight is computed at once). Otherwise the capture would be aimed at the PREVIOUS round's
      // combat, and the journal printed below would describe a fight nobody watched.
      if (s.phase === 'Battle' && last && last.combat_ref !== previousRef) {
        const candidate = s.eventLog.filter(e => e.combat_ref === last.combat_ref);
        if (candidate.some(e => e.kind === 'Victory')) {
          anchorMs = Date.now();
          segment = candidate;
          break;
        }
      }
      await page.waitForTimeout(10);
    }
    if (segment.length === 0) throw new Error('aucun segment de combat dans le journal');

    // Aim at the Tick where a divine shield is BROKEN (a fully absorbed blow) — the single most
    // legible keyword moment: the halo vanishes, the burst reads "BOUCLIER", and the Provocation
    // brackets plus the tribe chevrons are on screen at the same time. If no shield breaks in
    // this fight, fall back to an early Tick where the persistent marks are still all there.
    const shieldBreak = segment.find(e => e.kind === 'Damage' && e.amount > 0 &&
      e.absorbed_by_shield === e.amount);
    const aimTick = shieldBreak ? shieldBreak.tick : 2;
    log.push(shieldBreak
      ? `VISÉE tick ${aimTick} — un bouclier divin encaisse ${shieldBreak.amount} points sans en laisser passer un seul`
      : `VISÉE tick ${aimTick} — aucun bouclier brisé dans ce combat, marques persistantes seules`);

    // Get to the START of that Tick (the halo alone is on screen: that is the baseline), then
    // hand the detection over to the page.
    const startMs = (aimTick - 1 + 0.10) * TICK_DURATION_MS;
    await page.waitForTimeout(Math.max(0, Math.round(startMs - (Date.now() - anchorMs))));
    const shot = await waitForAbsorptionFrame(page, Math.round(TICK_DURATION_MS * 1.1));
    log.push(shot.frozen
      ? `ABSORPTION CAPTURÉE: ${shot.baseline} px « divins » (halo seul) -> ${shot.n} px (halo + éclat BOUCLIER)`
      // Fallback said out loud rather than silently: the persistent marks (halo, brackets,
      // chevrons, venin) are still on screen and are themselves keyword effects.
      : `ÉCLAT NON CAPTURÉ (base ${shot.baseline} px, pic ${shot.peak} px) — marques persistantes seules`);
    await page.screenshot({ path: join(SHOTS, 'i25-13-combat-motscles.png'), fullPage: false });
    log.push('SCREENSHOT i25-13-combat-motscles.png');

    // What the JOURNAL says happened — the same source the screen drew from.
    const counts = {};
    for (const e of segment) counts[e.kind] = (counts[e.kind] || 0) + 1;

    console.log('--- RUN LOG ---');
    for (const line of log) console.log(line);
    console.log('--- JOURNAL DU COMBAT CAPTURÉ ---');
    console.log(JSON.stringify(counts, null, 2));
    for (const e of segment.filter(x => ['Shield', 'Buff', 'Debuff', 'Heal'].includes(x.kind)).slice(0, 10)) {
      console.log('  ' + JSON.stringify(e));
    }
    console.log('--- SPAWNS (tribu + mots-clés portés par le journal) ---');
    for (const e of segment.filter(x => x.kind === 'Spawn')) {
      console.log(`  ${e.unit_instance_id} ${e.unit_definition_ref} tribu=${e.tribe} keywords=[${(e.keywords || []).join(',')}] side=${e.side_ref}`);
    }

    const keywordEvents = segment.filter(x => ['Shield', 'Buff', 'Debuff', 'Heal'].includes(x.kind));
    if (keywordEvents.length === 0) {
      console.error('FAIL: aucun Event de mot-clé dans le combat capturé — la preuve serait creuse');
      process.exitCode = 1;
    } else {
      console.log(`OK: ${keywordEvents.length} Event(s) de mot-clé dans le combat capturé`);
    }
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((e) => {
  console.error('E2E FAILED:', e);
  process.exitCode = 1;
});
