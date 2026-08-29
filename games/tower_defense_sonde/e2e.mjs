#!/usr/bin/env node
// E2E — click-through of the SHIPPED page in a REAL Chromium (playability
// contract: scripts/forge/contracts/PLAYABLE_CONTRACT.md).
//
// Drives the game only through the DOM a player has: the tower buttons, a click
// on the canvas, #btn-upgrade, #btn-call-wave, #restart. It never calls a game
// function; window.__game is READ, never written. It reaches a real end of game
// (DEFEAT, driven under a virtualised clock so ~70s of game time costs
// milliseconds of wall clock), checks #overlay, then restarts.
//
// Two defects this file exists to close, both previously silent:
//   1. the former proofs/e2e.mjs DEFINED its test function and never CALLED it,
//      so the oracle's E2E gate exited 0 without ever opening a page;
//   2. Chromium refuses `<script type="module">` from a file:// origin unless
//      launched with --allow-file-access-from-files, so even when called it
//      could not have booted the game.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = resolve(__dirname, 'index.html');

const CANVAS_W = 640;
const CANVAS_H = 384;
const CELL_W = CANVAS_W / 20;
const CELL_H = CANVAS_H / 12;

const checks = [];

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  checks.push({ label, actual, expected, ok });
  console.log(`[E2E] ${ok ? 'OK  ' : 'FAIL'} ${label} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  if (!ok) throw new Error(`E2E check failed: ${label}`);
}

const readState = (page) => page.evaluate(() => ({
  phase: window.__game.phase,
  wave: window.__game.wave,
  gold: window.__game.gold,
  lives: window.__game.lives,
  leaks: window.__game.leaks,
  towers: window.__game.towers.map((t) => ({ x: t.x, y: t.y, type: t.type, level: t.level })),
  enemies: window.__game.enemies.length,
  result: window.__game.result
}));

const readDom = (page) => page.evaluate(() => ({
  gold: document.getElementById('stat-gold').textContent,
  lives: document.getElementById('stat-lives').textContent,
  overlayHidden: document.getElementById('overlay').classList.contains('hidden'),
  overlayResult: document.getElementById('overlay-result').textContent
}));

async function clickCell(page, x, y) {
  await page.click('#game-canvas', { position: { x: (x + 0.5) * CELL_W, y: (y + 0.5) * CELL_H } });
}

// One rendered frame under the faked clock, so the DOM read-outs catch up with
// the state the click just changed.
const settle = (page) => page.clock.runFor(50);

async function runE2ETest() {
  console.log('[E2E] Tower Defense Sonde — real browser click-through');
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(String(err.message)));

    console.log(`[E2E] Opening file://${INDEX_PATH}`);
    await page.goto(`file://${INDEX_PATH}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game !== undefined, { timeout: 15000 });
    await page.clock.install({ time: 0 });
    await settle(page);

    // --- 1. the shipped page boots on the exact opening position -------------
    const opening = await readState(page);
    check('opening lives', opening.lives, 20);
    check('opening gold', opening.gold, 100);
    check('opening phase', opening.phase, 'PREPARATION');
    check('opening towers', opening.towers, []);
    const openingDom = await readDom(page);
    check('opening #stat-gold', openingDom.gold, '100');
    check('opening #overlay is hidden', openingDom.overlayHidden, true);

    // --- 2. every anchor input.mjs and render.mjs need is really there -------
    for (const sel of ['#game-canvas', '#btn-gun', '#btn-frost', '#btn-cannon',
      '#btn-upgrade', '#btn-call-wave', '#restart', '#overlay']) {
      check(`DOM anchor ${sel}`, Boolean(await page.$(sel)), true);
    }

    // --- 3. buy a tower with real clicks: button, then canvas cell -----------
    await page.click('#btn-gun');
    await clickCell(page, 1, 1);
    await settle(page);
    const built = await readState(page);
    check('a Gun was placed at the clicked cell',
      built.towers, [{ x: 1, y: 1, type: 'gun', level: 1 }]);
    check('gold fell by exactly the Gun cost', built.gold, 50);
    check('the displayed gold followed', (await readDom(page)).gold, '50');

    // --- 4. an INVALID click (on the path) must change nothing ---------------
    await clickCell(page, 19, 0); // entry lane: not buildable
    await settle(page);
    const afterInvalid = await readState(page);
    check('clicking the path builds nothing', afterInvalid.towers.length, 1);
    check('clicking the path costs nothing', afterInvalid.gold, 50);

    // --- 5. upgrade through the DOM ------------------------------------------
    await page.click('#btn-upgrade');
    await settle(page);
    const upgraded = await readState(page);
    check('the tower rose to level 2', upgraded.towers[0].level, 2);
    check('gold fell by exactly the upgrade cost', upgraded.gold, 10);

    // --- 6. calling the wave through the DOM interrupts the countdown --------
    await page.click('#btn-call-wave');
    await settle(page);
    const called = await readState(page);
    check('the called wave is spawning', called.phase, 'SPAWNING');
    check('wave 1 put exactly 5 Grunts on the map', called.enemies, 5);

    // --- 7. restart puts the exact opening position back --------------------
    await page.click('#restart');
    await settle(page);
    const restarted = await readState(page);
    check('restart resets gold', restarted.gold, 100);
    check('restart clears the towers', restarted.towers, []);
    check('restart returns to PREPARATION', restarted.phase, 'PREPARATION');

    // --- 8. play an undefended run to a REAL end of game ---------------------
    let ended = null;
    for (let virtual = 0; virtual < 200000; virtual += 2000) {
      const snap = await readState(page);
      if (snap.result) { ended = snap; break; }
      if (snap.phase === 'PREPARATION') await page.click('#btn-call-wave').catch(() => {});
      await page.clock.runFor(2000);
    }
    if (!ended) ended = await readState(page);
    check('an undefended run really ends', ended.result, 'DEFEAT');
    check('defeat means exactly zero lives', ended.lives, 0);

    const endDom = await readDom(page);
    check('#overlay is shown at the end', endDom.overlayHidden, false);
    check('#overlay names the outcome', endDom.overlayResult, 'DEFEAT');

    // --- 9. restart from the overlay ----------------------------------------
    await page.click('#restart');
    await settle(page);
    const replay = await readState(page);
    check('restart clears the result', replay.result, null);
    check('restart gives the opening lives back', replay.lives, 20);
    check('#overlay is hidden again', (await readDom(page)).overlayHidden, true);

    check('zero console errors during the whole run', consoleErrors, []);

    console.log(`[E2E] ${checks.length} checks, ${checks.filter((c) => c.ok).length} satisfied`);
    return checks.every((c) => c.ok) && checks.length > 0;
  } finally {
    await browser.close();
  }
}

runE2ETest()
  .then((green) => {
    console.log(`RESULT: ${green ? 'PASS' : 'FAIL'}`);
    process.exitCode = green ? 0 : 1;
  })
  .catch((e) => {
    console.error('[E2E] aborted:', e && e.message ? e.message : e);
    console.log('RESULT: FAIL');
    process.exitCode = 1;
  });
