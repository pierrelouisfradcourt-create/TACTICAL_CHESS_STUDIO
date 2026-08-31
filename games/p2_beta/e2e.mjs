// P2 Beta — E2E click-through réel (Playwright/Chromium) : démarre un serveur
// statique, ouvre la page, clique de vrais boutons, observe window.__game,
// force la fin via window.__game_debug.forceEnd(), vérifie #overlay puis
// clique #restart. Conforme scripts/forge/contracts/PLAYABLE_CONTRACT.md.
//
// Usage : node e2e.mjs   (headless par défaut ; HEADED=1 pour voir le navigateur)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
// NODE_PATH n'est honoré que par la résolution CommonJS, pas par les imports ESM
// bare specifier — createRequire() résout "playwright" depuis les node_modules
// partagés (voir run-oracle.mjs, qui pose NODE_PATH avant de spawn ce fichier).
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const PORT = 4731;
const MIME = {
  '.html': 'text/html',
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

function startServer() {
  return new Promise((resolvePromise) => {
    const server = createServer(async (req, res) => {
      const path = req.url === '/' ? '/index.html' : req.url;
      try {
        const body = await readFile(join(__dirname, path));
        res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(PORT, () => {
      console.log('interface jouable');
      resolvePromise(server);
    });
  });
}

export async function runE2ETest() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED });
  const log = [];

  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && typeof window.__game.resourceCounter === 'number', null, { timeout: 8000 });

    // --- 1) objectif initial non vide ---
    const goalText = await page.locator('#goal-label').innerText();
    if (!goalText || goalText.length === 0) throw new Error('Goal label vide au frame 0');
    log.push(`objectif initial: "${goalText}"`);

    // --- 2) clic réel augmente resourceCounter (state ET DOM) ---
    const before = await page.evaluate(() => window.__game.resourceCounter);
    // 15 clics = exactement le coût du premier générateur : le clic seul doit
    // suffire à financer le premier achat (R2 -> R6 dans le vrai navigateur).
    for (let i = 0; i < 15; i++) {
      await page.click('#click-target');
    }
    await page.waitForFunction(
      (b) => window.__game.resourceCounter > b,
      before,
      { timeout: 4000 }
    );
    const afterClicks = await page.evaluate(() => window.__game.resourceCounter);
    log.push(`5 clics: resourceCounter ${before} -> ${afterClicks}`);

    // --- 3) achat d'un générateur si affordable : rangée + cps changent ---
    const genBtn = page.locator('[data-generator-id]').first();
    if ((await genBtn.count()) === 0) throw new Error('aucune tuile de générateur rendue');
    await genBtn.waitFor({ state: 'visible', timeout: 4000 });
    if (!(await genBtn.isEnabled())) {
      throw new Error('le premier générateur devrait être payable après 15 clics');
    }
    const textBefore = await genBtn.innerText();
    await genBtn.click();
    // Un achat doit produire un revenu passif RÉEL : cps strictement > 0.
    await page.waitForFunction(() => window.__game.resourceCounter > 0 && window.__game.lifetimeEarned > 15, null, { timeout: 4000 });
    const textAfter = await genBtn.innerText();
    if (textAfter === textBefore) throw new Error('la tuile de générateur n\'a pas changé après achat');
    log.push(`achat générateur: "${textBefore}" -> "${textAfter}"`);

    // La rangée `generateurs` existe réellement et contient les tuiles.
    const rowTiles = await page.evaluate(
      () => document.querySelectorAll('#generator-row [data-generator-id]').length
    );
    if (rowTiles === 0) throw new Error('les tuiles ne sont pas dans #generator-row');
    log.push(`rangée générateurs: ${rowTiles} tuile(s)`);

    // --- 4) les assets réels sont servis et chargés (pas des URLs mortes) ---
    const brokenAssets = await page.evaluate(() =>
      Array.from(document.images)
        .filter((i) => !i.complete || i.naturalWidth === 0)
        .map((i) => i.getAttribute('src'))
    );
    if (brokenAssets.length > 0) {
      throw new Error(`assets non chargés : ${brokenAssets.join(', ')}`);
    }
    const assetCount = await page.evaluate(() => document.images.length);
    log.push(`${assetCount} asset(s) chargé(s) sans erreur`);

    // --- 5) overlay caché ET surface de jeu présente avant la fin ---
    const overlayHiddenBefore = await page.evaluate(() =>
      document.getElementById('overlay').classList.contains('hidden')
    );
    if (!overlayHiddenBefore) throw new Error("#overlay ne devrait pas être visible avant la fin");
    const surfaceBefore = await page.evaluate(() => !!document.getElementById('play-surface'));
    if (!surfaceBefore) throw new Error('#play-surface doit exister avant la fin');

    // --- 6) force la fin via le hook de debug, observe window.__game.over ---
    await page.evaluate(() => window.__game_debug.forceEnd());
    await page.waitForFunction(() => window.__game && window.__game.over === true, null, { timeout: 4000 });
    await page.waitForFunction(
      () => !document.getElementById('overlay').classList.contains('hidden'),
      null,
      { timeout: 4000 }
    );
    const overState = await page.evaluate(() => window.__game);
    if (overState.over !== true) throw new Error(`over doit être true après forceEnd, trouvé ${overState.over}`);
    if (overState.endGauge < 1.0) throw new Error(`endGauge doit être 1.0 à la victoire, trouvé ${overState.endGauge}`);
    log.push(`fin forcée: over=${overState.over}, endGauge=${overState.endGauge}, ressources=${overState.resourceCounter.toFixed(1)}`);

    const overlayTitle = await page.locator('#overlayTitle').innerText();
    if (!overlayTitle) throw new Error('#overlayTitle vide');
    log.push(`overlay affiché: "${overlayTitle}"`);

    // R11 — la scène de fin REMPLACE réellement la surface de jeu : celle-ci est
    // retirée du DOM, ce n'est pas une couche posée par-dessus.
    const surfaceAfter = await page.evaluate(() => !!document.getElementById('play-surface'));
    if (surfaceAfter) {
      throw new Error('#play-surface encore présent à la victoire — overlay, pas changement de scène');
    }
    const totals = await page.locator('#final-totals').innerText();
    if (!totals) throw new Error('#final-totals vide sur la scène de victoire');
    log.push(`surface de jeu remplacée par la scène de fin — totaux: "${totals}"`);

    // --- 7) clic #restart : la partie repart proprement ---
    await page.click('#restart');
    await page.waitForFunction(() => window.__game && window.__game.over === false, null, { timeout: 4000 });
    await page.waitForFunction(
      () => document.getElementById('overlay').classList.contains('hidden'),
      null,
      { timeout: 4000 }
    );
    await page.waitForFunction(() => !!document.getElementById('play-surface'), null, { timeout: 4000 });
    const restarted = await page.evaluate(() => window.__game);
    if (restarted.over !== false) throw new Error('over devrait être false après #restart');
    if (restarted.endGauge !== 0) {
      throw new Error(`jauge devrait repartir de 0 au nouveau cycle, trouvé ${restarted.endGauge}`);
    }
    log.push(`redémarrage OK: resourceCounter=${restarted.resourceCounter}, jauge=${restarted.endGauge}, surface de jeu restaurée`);

    console.log('=== E2E p2_beta — clics réels + hook de debug ===');
    for (const l of log) console.log('• ' + l);
    console.log('\nRESULT: PASS');
    return { passed: true, checks: log };
  } finally {
    await browser.close();
    server.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runE2ETest()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('\nRESULT: FAIL —', e && e.message ? e.message : e);
      process.exit(1);
    });
}

export default { runE2ETest };
