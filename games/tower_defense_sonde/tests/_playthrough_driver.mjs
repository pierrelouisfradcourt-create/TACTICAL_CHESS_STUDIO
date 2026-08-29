// Shared internal helper for real-browser playthroughs, used by
// tests/visual_capture.mjs and tests/console.test.mjs — not itself a
// WireMap-listed proof file, just the delta needed to avoid duplicating a
// ~100-line Playwright driver in both (§2bis: write only the delta).
//
// DISCOVERED (see build report): Chromium refuses to load
// `<script type="module">` from a file:// origin unless launched with
// --allow-file-access-from-files (a genuine, well-known Chromium CORS
// restriction, not specific to this game — confirmed by 5/5 minimal
// reproductions without the flag, 0/5 failures with it). proofs/e2e.mjs
// passes neither this flag NOR ever calls its own `runE2ETest()` — so
// run-oracle.mjs's E2E gate has been reporting PASS without ever opening
// the page. Out of this module's ownership (proofs/ is not a blueprint
// module); reported, not silently patched.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { tripleCoverageCells } from '../config/geometry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INDEX_PATH = resolve(ROOT, 'index.html');

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 384;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 12;
const CELL_W = CANVAS_WIDTH / GRID_WIDTH;
const CELL_H = CANVAS_HEIGHT / GRID_HEIGHT;

// Mirrors bots/bots.mjs#ENTRY_SENTINEL + the PIN (tripleCoverageCells): a
// 7-tower Gun garrison, never upgraded — the pure-sim botWide strategy,
// confirmed by direct execution (build report) to reach VICTORY at seed
// 1337 (lives_final=9, wave_reached=11). Driving through real DOM clicks
// instead of the internal bot API sidesteps input.mjs's #btn-upgrade
// limitation (it only ever upgrades towers[0]), which a strategy needing
// multi-tower upgrades (botCompetent) could not replicate through the DOM.
const ENTRY_SENTINEL = [8, 1];
const GARRISON_SPOTS = [ENTRY_SENTINEL, ...tripleCoverageCells()];

async function openPage(browser) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(`file://${INDEX_PATH}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game !== undefined, { timeout: 10000 });
  await page.clock.install({ time: 0 });

  return { page, consoleErrors, pageErrors };
}

async function clickCell(page, [x, y]) {
  await page.click('#btn-gun');
  await page.click('#game-canvas', { position: { x: (x + 0.5) * CELL_W, y: (y + 0.5) * CELL_H } });
}

// Drives one real playthrough entirely through the DOM (button + canvas
// clicks, exactly like a player would) under a virtualized clock, so the
// ~5.4 real minutes of simulated time botWide needs (322416ms — build
// report) costs milliseconds of wall-clock instead of minutes.
export async function drivePlaythrough(page, { garrison, stepMs, maxVirtualMs }) {
  let elapsed = 0;
  let result = null;

  while (elapsed < maxVirtualMs) {
    const snapshot = await page.evaluate(() => ({
      phase: window.__game.phase,
      gold: window.__game.gold,
      towers: window.__game.towers.map((t) => [t.x, t.y]),
      result: window.__game.result
    }));

    if (snapshot.result) { result = snapshot.result; break; }

    if (garrison && snapshot.phase === 'PREPARATION') {
      for (const [x, y] of garrison) {
        const built = snapshot.towers.some(([tx, ty]) => tx === x && ty === y);
        if (!built && snapshot.gold >= 50) await clickCell(page, [x, y]);
      }
    }
    if (snapshot.phase === 'PREPARATION') {
      await page.click('#btn-call-wave').catch(() => {});
    }

    await page.clock.runFor(stepMs);
    elapsed += stepMs;
  }

  if (!result) result = await page.evaluate(() => window.__game.result);
  const finalState = await page.evaluate(() => window.__game);
  return { result, finalState, elapsed };
}

// VICTORY plan: garrison every PIN cell + the entry sentinel, call every
// wave as soon as it is available (proven to win — see module comment).
// DEFEAT plan: build nothing at all and just call every wave — a real,
// wholly undefended run (confirmed by direct execution to reach DEFEAT at
// wave 3, virtual_ms=73072 — no bot fiction needed for a loss).
export const PLAYTHROUGHS = {
  VICTORY: { garrison: GARRISON_SPOTS, stepMs: 2000, maxVirtualMs: 360000 },
  DEFEAT: { garrison: null, stepMs: 2000, maxVirtualMs: 100000 }
};

export async function capturePlaythrough(outcome, { screenshotPath } = {}) {
  const plan = PLAYTHROUGHS[outcome];
  if (!plan) throw new Error(`capturePlaythrough: unknown outcome "${outcome}"`);

  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  try {
    const { page, consoleErrors, pageErrors } = await openPage(browser);
    const { result, finalState, elapsed } = await drivePlaythrough(page, plan);

    const screenshotBuffer = await page.screenshot(
      screenshotPath ? { path: screenshotPath, fullPage: true } : { fullPage: true }
    );

    return { outcome, result, finalState, elapsed, consoleErrors, pageErrors, screenshotBuffer, screenshotPath: screenshotPath || null };
  } finally {
    await browser.close();
  }
}
