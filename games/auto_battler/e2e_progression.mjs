// e2e_progression.mjs — s9-build commande F (F1) proof script. Plays a REAL long game through
// the actual browser UI (Playwright/Chromium, real clicks — same input circuit a human uses:
// app -> input/gestures.mjs -> input/submit.mjs -> preparation.applyPreparationInput), spending
// every round's Income on LevelUp as soon as it is affordable, until the level climbs past 5
// (the old ceiling) and the "Niveau maximum atteint" button only appears once level 10 is truly
// reached.
//
// Board is deliberately kept EMPTY throughout: an empty board vs. an empty ghost board is a
// proven, tested draw (properties.combat.test.mjs, "an empty board on both sides is a draw, not
// a win for anyone") — zero Life-loss risk, fast combat playback (tick 0), so the run stays
// entirely about proving the LEVEL/board-capacity mechanic, not combat balance.
//
// Usage: node e2e_progression.mjs   (headless by default; HEADED=1 to watch)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
// playwright is not installed at the repo root; resolve it via a workspace that does have it
// (llm-lego/package.json declares "playwright": "^1.61.1"), same trick other studio tooling uses.
const require = createRequire(join(__dirname, '..', '..', 'llm-lego', 'package.json'));
const { chromium } = require('playwright');

const PORT = Number(process.env.AUTO_BATTLER_PORT || 4521);
const URL = `http://localhost:${PORT}/?seed=20260720`;
const SHOTS = join(__dirname, 'e2e-shots');
const TARGET_LEVEL = Number(process.env.TARGET_LEVEL || 7); // dispatch requirement: capture a level >= 7
const MAX_ROUNDS = 40; // safety cap — reaching level 10 needs ~17-20 rounds of pure income
const SHOT_NAME = process.env.SHOT_NAME || 'i25-10-progression.png';

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

async function getState(page) {
  return page.evaluate(() => window.__game.getState());
}

async function waitForPhase(page, phase, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = await getState(page);
    if (s.phase === phase) return s;
    await page.waitForTimeout(100);
  }
  throw new Error(`timeout waiting for phase ${phase}`);
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const server = await startServer();
  console.log('server up on port', PORT);

  const browser = await chromium.launch({ headless: !process.env.HEADED });
  const page = await browser.newPage({ viewport: { width: 1200, height: 820 } });
  const log = [];

  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && typeof window.__game.getState === 'function', { timeout: 8000 });

    let round = 0;
    let reachedLevel = 0;
    let done = false;

    while (round < MAX_ROUNDS && !done) {
      const before = await waitForPhase(page, 'Preparation', 10000);
      const player = before.players['player_0'];
      log.push(`round_index=${before.round_index} phase=Preparation level=${player.level} gold=${player.gold}`);

      // Spend every affordable LevelUp — click while the button is enabled and not the
      // "Niveau maximum atteint" terminal state.
      let clicks = 0;
      while (clicks < 10) {
        const btn = page.locator('#btn-levelup');
        const disabled = await btn.isDisabled();
        if (disabled) break;
        await btn.click();
        clicks++;
        await page.waitForTimeout(30);
      }

      const afterLevelUps = await getState(page);
      reachedLevel = Math.max(reachedLevel, afterLevelUps.players['player_0'].level);

      if (reachedLevel >= TARGET_LEVEL && !done) {
        // Capture the proof screenshot BEFORE ending preparation, while the level/board-capacity
        // plates are visible and the phase is still 'Preparation' (readable UI, not mid-combat).
        await page.screenshot({ path: join(SHOTS, SHOT_NAME), fullPage: false });
        log.push(`SCREENSHOT captured at level=${reachedLevel}`);
        done = true;
        break;
      }

      // End preparation for this round (click "Prêt" — same Input the timer would emit).
      await page.locator('#btn-ready').click();

      // Wait through Battle back to Preparation (or Elimination, which would be a hard failure
      // for this proof — an empty-vs-empty board is a proven draw, so this should never fire).
      const deadline = Date.now() + 15000;
      let next = null;
      while (Date.now() < deadline) {
        const s = await getState(page);
        if (s.phase === 'Elimination') {
          throw new Error(`unexpected Elimination at round_index=${s.round_index}, level=${s.players['player_0'].level}`);
        }
        if (s.phase === 'Preparation' && s.round_index > before.round_index) { next = s; break; }
        await page.waitForTimeout(100);
      }
      if (!next) throw new Error('timeout waiting for next round');
      round++;
    }

    if (!done) {
      // Safety net: didn't cross TARGET_LEVEL within MAX_ROUNDS — still capture final state.
      await page.screenshot({ path: join(SHOTS, SHOT_NAME), fullPage: false });
      log.push(`SAFETY CAP reached without hitting level ${TARGET_LEVEL}: reachedLevel=${reachedLevel}`);
    }

    const finalState = await getState(page);
    const finalPlayer = finalState.players['player_0'];
    console.log('--- RUN LOG ---');
    for (const line of log) console.log(line);
    console.log('--- FINAL STATE ---');
    console.log(JSON.stringify({
      round_index: finalState.round_index,
      phase: finalState.phase,
      level: finalPlayer.level,
      gold: finalPlayer.gold,
      life: finalPlayer.life,
      board_used: finalPlayer.board.length
    }, null, 2));

    const levelText = await page.locator('#level').textContent();
    const capText = await page.locator('#board-capacity').textContent();
    console.log(`DOM #level = "${levelText}"`);
    console.log(`DOM #board-capacity = "${capText}"`);

    if (finalPlayer.level < TARGET_LEVEL) {
      console.error(`FAIL: final level ${finalPlayer.level} did not reach target ${TARGET_LEVEL}`);
      process.exitCode = 1;
    } else {
      console.log(`OK: reached level ${finalPlayer.level} (target was >= ${TARGET_LEVEL})`);
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
