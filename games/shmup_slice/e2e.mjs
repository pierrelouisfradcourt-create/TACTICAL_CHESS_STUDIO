// Shmup Slice — E2E click-through réel (Playwright/Chromium) : démarre le
// serveur, ouvre la page, joue RÉELLEMENT la map 1 au clavier, puis utilise
// window.__game_debug pour visiter les maps 2/3 et combattre les 3 boss
// (bossHp observé décroissant), vérifie l'écran de victoire (forceWin), l'écran
// de défaite (forceLose) et #restart (état EXACT {level:1,score:0,lives:3}).
//
// Usage : node e2e.mjs   (headless par défaut ; HEADED=1 pour voir le navigateur)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 8765;
const URL = `http://localhost:${PORT}/?seed=888`;
const SHOTS = join(__dirname, 'e2e-shots');

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, 'server.mjs')], {
    stdio: ['ignore', 'pipe', 'pipe'],
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

async function pressHeld(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

// Combat un boss via les hooks debug : pilote RÉELLEMENT le vaisseau vers
// bossX (tir droit vers le haut, donc il faut être sous le boss pour toucher),
// tire en continu, observe bossHp jusqu'à ce qu'il descende (ou soit vaincu)
// ou que le budget de temps réel soit épuisé. Retourne {initialHp, finalHp,
// defeated}. « defeated » se détecte par un changement de LEVEL (ou victoire),
// pas seulement bossHp===0 : si CE boss est vaincu, le jeu enchaîne
// naturellement sur la map/le boss suivant, dont le hp n'a plus rien à voir
// avec `n` — comparer bossHp après coup comparerait deux boss différents.
async function fightBoss(page, n, { budgetMs }) {
  await page.evaluate((lvl) => window.__game_debug.spawnBoss(lvl), n);
  await page.waitForTimeout(100);
  const initialHp = await page.evaluate(() => window.__game?.bossHp);
  const initialLevel = await page.evaluate(() => window.__game?.level);

  await page.keyboard.down('Space');
  const deadline = Date.now() + budgetMs;
  let finalHp = initialHp;
  let defeated = false;
  let lastDir = null;
  while (Date.now() < deadline) {
    const g = await page.evaluate(() => ({
      status: window.__game?.status, level: window.__game?.level, bossHp: window.__game?.bossHp,
      shipX: window.__game?.shipX, bossX: window.__game?.bossX,
    }));
    if (g.level !== initialLevel || (g.status !== 'ACTIVE' && g.status !== 'BOSS')) {
      // Ce boss est vaincu (transition de niveau ou victoire) — n'importe quel
      // bossHp lu APRÈS ce point appartiendrait à un autre boss.
      defeated = true;
      finalHp = 0;
      break;
    }
    if (g.bossHp !== null && g.bossHp !== undefined) finalHp = g.bossHp;
    if (g.bossHp === 0) { defeated = true; break; }

    // Piste RÉELLEMENT le boss : se déplace vers bossX tant qu'on n'est pas
    // sous lui (tolérance = demi-largeur boss/vaisseau).
    const dx = (g.bossX ?? g.shipX) - g.shipX;
    const wantDir = dx > 8 ? 'ArrowRight' : dx < -8 ? 'ArrowLeft' : null;
    if (wantDir !== lastDir) {
      if (lastDir) await page.keyboard.up(lastDir);
      if (wantDir) await page.keyboard.down(wantDir);
      lastDir = wantDir;
    }
    await page.waitForTimeout(80);
  }
  if (lastDir) await page.keyboard.up(lastDir);
  await page.keyboard.up('Space');

  return { initialHp, finalHp, defeated };
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ['--disable-gpu'] });
  const log = [];
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
    page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
    page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE.ERROR:', m.text()); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && typeof window.__game.level === 'number', null, { timeout: 8000 });

    console.log('--- (1) Page chargée, vérification des hooks de jouabilité ---');
    const hasHooks = await page.evaluate(() => ({
      hasGame: !!window.__game,
      hasDebug: !!window.__game_debug,
      hasOverlay: !!document.getElementById('overlay'),
      hasRestart: !!document.getElementById('restart'),
    }));
    console.log(`Hooks : ${JSON.stringify(hasHooks)}`);
    if (!Object.values(hasHooks).every(Boolean)) throw new Error('Hooks manquants !');

    // --- (2) Map 1 jouée RÉELLEMENT au clavier : au moins 1 ennemi détruit,
    // score observé (R6/R9, e2e réel — pas debug) ---
    console.log('\n--- (2) Jouer la map 1 au clavier (mouvement + tir réel) ---');
    const initialScore = await page.evaluate(() => window.__game?.score);
    const initialLevel = await page.evaluate(() => window.__game?.level);
    log.push(`map 1 : score initial=${initialScore}, level initial=${initialLevel}`);
    if (initialLevel !== 1) throw new Error(`le jeu doit démarrer sur la map 1, reçu level=${initialLevel}`);

    await page.keyboard.down('Space');
    for (let i = 0; i < 60; i++) {
      const dir = i % 6 < 3 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(dir);
      await page.waitForTimeout(120);
      await page.keyboard.up(dir);
    }
    await page.keyboard.up('Space');

    const scoreAfterPlay = await page.evaluate(() => window.__game?.score);
    log.push(`map 1 après jeu réel : score=${scoreAfterPlay}`);
    if (!(scoreAfterPlay > initialScore)) {
      throw new Error(`le score n'a pas augmenté en jouant réellement (${initialScore} -> ${scoreAfterPlay}) — aucun ennemi détruit`);
    }
    console.log(`✓ Score augmenté en jeu réel : ${initialScore} -> ${scoreAfterPlay}`);
    await page.screenshot({ path: join(SHOTS, '01-map1-playing.png') });

    // --- (3) Boss 1 — combat réel via debug spawn, bossHp décroissant, budget
    // large (le boss est censé être vaincu dans ce budget — cf. solvability.mjs) ---
    console.log('\n--- (3) Boss 1 : spawn debug + combat réel, bossHp décroissant ---');
    const boss1 = await fightBoss(page, 1, { budgetMs: 75000 });
    log.push(`boss 1 : hp ${boss1.initialHp} -> ${boss1.finalHp} (defeated=${boss1.defeated})`);
    if (!(boss1.finalHp < boss1.initialHp)) throw new Error(`boss 1 hp n'a pas diminué (${boss1.initialHp} -> ${boss1.finalHp})`);
    console.log(`✓ Boss 1 hp décroissant : ${boss1.initialHp} -> ${boss1.finalHp} (defeated=${boss1.defeated})`);
    await page.screenshot({ path: join(SHOTS, '02-boss1.png') });

    // --- (4) Visite map 2 + boss 2 via debug (bossHp décroissant observé) ---
    console.log('\n--- (4) Map 2 + boss 2 via __game_debug ---');
    await page.evaluate(() => window.__game_debug.setLevel(2));
    await page.waitForTimeout(100);
    const level2 = await page.evaluate(() => window.__game?.level);
    log.push(`setLevel(2) -> level=${level2}`);
    if (level2 !== 2) throw new Error(`setLevel(2) n'a pas mené à level=2, reçu ${level2}`);
    console.log(`✓ Map 2 visitée (level=${level2})`);

    const boss2 = await fightBoss(page, 2, { budgetMs: 20000 });
    log.push(`boss 2 : hp ${boss2.initialHp} -> ${boss2.finalHp} (defeated=${boss2.defeated})`);
    if (!(boss2.finalHp < boss2.initialHp)) throw new Error(`boss 2 hp n'a pas diminué (${boss2.initialHp} -> ${boss2.finalHp})`);
    console.log(`✓ Boss 2 hp décroissant : ${boss2.initialHp} -> ${boss2.finalHp} (defeated=${boss2.defeated})`);

    // --- (5) Visite map 3 + boss 3 via debug (bossHp décroissant observé) ---
    console.log('\n--- (5) Map 3 + boss 3 via __game_debug ---');
    await page.evaluate(() => window.__game_debug.setLevel(3));
    await page.waitForTimeout(100);
    const level3 = await page.evaluate(() => window.__game?.level);
    log.push(`setLevel(3) -> level=${level3}`);
    if (level3 !== 3) throw new Error(`setLevel(3) n'a pas mené à level=3, reçu ${level3}`);
    console.log(`✓ Map 3 visitée (level=${level3})`);

    const boss3 = await fightBoss(page, 3, { budgetMs: 20000 });
    log.push(`boss 3 : hp ${boss3.initialHp} -> ${boss3.finalHp} (defeated=${boss3.defeated})`);
    if (!(boss3.finalHp < boss3.initialHp)) throw new Error(`boss 3 hp n'a pas diminué (${boss3.initialHp} -> ${boss3.finalHp})`);
    console.log(`✓ Boss 3 hp décroissant : ${boss3.initialHp} -> ${boss3.finalHp} (defeated=${boss3.defeated})`);
    await page.screenshot({ path: join(SHOTS, '03-boss3.png') });

    // --- (6) Écran de victoire (R18) ---
    console.log('\n--- (6) Écran de victoire (forceWin) ---');
    await page.evaluate(() => window.__game_debug.forceWin());
    await page.waitForTimeout(150);
    const statusWon = await page.evaluate(() => window.__game?.status);
    log.push(`forceWin -> status=${statusWon}`);
    if (statusWon !== 'WON') throw new Error(`status devrait être WON, reçu ${statusWon}`);
    const overlayVisibleWon = await page.evaluate(() => {
      const el = document.getElementById('overlay');
      return el ? !el.classList.contains('hidden') : false;
    });
    if (!overlayVisibleWon) throw new Error('#overlay doit être visible après victoire');
    console.log('✓ Écran de victoire affiché');
    await page.screenshot({ path: join(SHOTS, '04-victory.png') });

    // --- (7) #restart remet le run ENTIER à {level:1, score:0, lives:3} (R20) ---
    console.log('\n--- (7) #restart : état EXACT {level:1, score:0, lives:3} ---');
    await page.click('#restart');
    await page.waitForTimeout(150);
    const afterRestart = await page.evaluate(() => ({
      level: window.__game.level, score: window.__game.score,
      lives: window.__game.lives, status: window.__game.status,
    }));
    log.push(`après restart: ${JSON.stringify(afterRestart)}`);
    if (afterRestart.level !== 1) throw new Error(`level après restart doit être 1, reçu ${afterRestart.level}`);
    if (afterRestart.score !== 0) throw new Error(`score après restart doit être 0, reçu ${afterRestart.score}`);
    if (afterRestart.lives !== 3) throw new Error(`lives après restart doit être 3, reçu ${afterRestart.lives}`);
    if (afterRestart.status !== 'ACTIVE') throw new Error(`status après restart doit être ACTIVE, reçu ${afterRestart.status}`);
    const overlayHiddenAfterRestart = await page.evaluate(() => {
      const el = document.getElementById('overlay');
      return el ? el.classList.contains('hidden') : false;
    });
    if (!overlayHiddenAfterRestart) throw new Error('#overlay doit redevenir caché après restart');
    console.log('✓ Restart a remis le run entier à zéro : ' + JSON.stringify(afterRestart));
    await page.screenshot({ path: join(SHOTS, '05-restart.png') });

    // --- (8) Écran de défaite (R19, forceLose) ---
    console.log('\n--- (8) Écran de défaite (forceLose) ---');
    await page.evaluate(() => window.__game_debug.forceLose());
    await page.waitForTimeout(150);
    const afterLose = await page.evaluate(() => ({
      status: window.__game.status, lives: window.__game.lives,
    }));
    log.push(`forceLose -> ${JSON.stringify(afterLose)}`);
    if (afterLose.status !== 'LOST') throw new Error(`status devrait être LOST, reçu ${afterLose.status}`);
    if (afterLose.lives !== 0) throw new Error(`lives devrait être 0, reçu ${afterLose.lives}`);
    const overlayVisibleLost = await page.evaluate(() => {
      const el = document.getElementById('overlay');
      return el ? !el.classList.contains('hidden') : false;
    });
    if (!overlayVisibleLost) throw new Error('#overlay doit être visible après défaite');
    console.log('✓ Écran de défaite affiché');
    await page.screenshot({ path: join(SHOTS, '06-defeat.png') });

    // --- Résumé ---
    console.log('\n=== RÉSUMÉ E2E ===');
    for (const entry of log) console.log(`  ${entry}`);
    console.log('\nRESULT: PASS');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ E2E FAIL:', err.message);
    console.log('\nRESULT: FAIL');
    process.exit(1);
  } finally {
    await browser.close();
    srv.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
