// Banc d'essai du prototype « guilde » — preuve par exécution.
// Usage : node test/harness.mjs [dossier_du_prototype]
// Sort avec le code 1 si un contrôle échoue. Aucune dépendance hors Playwright global.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const OUT = path.join(ROOT, 'test', 'out');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

function walkNumbers(v, pathStr, bad, depth = 0) {
  if (depth > 40) return;
  if (typeof v === 'number') {
    if (!Number.isInteger(v)) bad.push(`${pathStr}=${v}`);
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => walkNumbers(x, `${pathStr}[${i}]`, bad, depth + 1));
  } else if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) walkNumbers(v[k], `${pathStr}.${k}`, bad, depth + 1);
  }
}

// ---------- 1. Moteur pur sous node ----------
let sim = null, data = null;
try {
  sim = require(path.join(ROOT, 'sim.js'));
  data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
  check('sim.js chargeable sous node', typeof sim.newGame === 'function' && typeof sim.resolveDay === 'function'
    && typeof sim.hashState === 'function' && typeof sim.planDefaults === 'function'
    && typeof sim.validateAction === 'function',
    'API attendue : newGame, planDefaults, validateAction, resolveDay, hashState');
} catch (e) {
  check('sim.js chargeable sous node', false, String(e.message || e));
}

function runSeason(seed, days) {
  let state = sim.newGame(seed, data, {});
  const hashes = [], chronicles = [];
  for (let d = 0; d < days; d++) {
    const managers = sim.listManagers ? sim.listManagers(state) : state.managers.map(m => m.id);
    let actions = [];
    for (const m of managers) actions = actions.concat(sim.planDefaults(state, m));
    for (const a of actions) {
      const v = sim.validateAction(state, a);
      if (!v.ok) throw new Error(`action par défaut invalide jour ${d}: ${JSON.stringify(a)} -> ${v.reason}`);
    }
    const r = sim.resolveDay(state, actions);
    state = r.state;
    hashes.push(sim.hashState(state));
    chronicles.push(r.chronicle);
  }
  return { state, hashes, chronicles };
}

if (sim && data) {
  try {
    const t0 = Date.now();
    const A = runSeason(12345, 30);
    const dt = Date.now() - t0;
    const B = runSeason(12345, 30);
    const C = runSeason(777, 30);
    check('30 jours identiques (même graine, deux exécutions)', JSON.stringify(A.hashes) === JSON.stringify(B.hashes));
    check('chroniques identiques au caractère près', JSON.stringify(A.chronicles) === JSON.stringify(B.chronicles));
    check('graine différente => trajectoire différente', JSON.stringify(A.hashes) !== JSON.stringify(C.hashes));
    check('chaque jour a une chronique non vide', A.chronicles.every(c => c && JSON.stringify(c).length > 200));
    const bad = [];
    walkNumbers(A.state, 'state', bad);
    check('aucun nombre non entier dans l état', bad.length === 0, bad.slice(0, 5).join(', '));
    check('aucun NaN dans la sérialisation', !JSON.stringify(A.state).includes('null,null') && !/NaN|Infinity/.test(JSON.stringify(A.state)));
    check('30 jours calculés en moins de 5 s', dt < 5000, `${dt} ms`);
    fs.writeFileSync(path.join(OUT, 'season_12345.json'), JSON.stringify({ hashes: A.hashes, last: A.chronicles[29] }, null, 1));
    // Action invalide rejetée proprement
    const s0 = sim.newGame(1, data, {});
    const bogus = sim.validateAction(s0, { manager_id: 'nobody', day: 0, type: 'assign', payload: {} });
    check('action invalide rejetée avec raison', bogus && bogus.ok === false && typeof bogus.reason === 'string');
    // Journée sans aucune action : plan par défaut, pas de plantage
    const r0 = sim.resolveDay(s0, []);
    check('journée sans action ne plante pas', r0 && r0.state && r0.chronicle);
  } catch (e) {
    check('moteur : saison de 30 jours', false, String(e.stack || e));
  }
}

// ---------- 2. Page dans Chromium ----------
let pw = null;
const ENGINE_ONLY = process.env.ENGINE_ONLY === '1';
if (!ENGINE_ONLY) { try { pw = require('/opt/node22/lib/node_modules/playwright'); } catch { try { pw = require('playwright'); } catch {} } }
if (ENGINE_ONLY) {
  console.log('(mode moteur seul : navigateur ignoré)');
} else if (!pw) {
  check('playwright disponible', false);
} else {
  const browser = await pw.chromium.launch();
  const url = pathToFileURL(path.join(ROOT, 'index.html')).href;
  async function session(width, clicks, colorScheme = 'light') {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(url);
    await page.waitForSelector('[data-testid="btn-launch"]', { timeout: 10000 });
    for (let i = 0; i < clicks; i++) {
      await page.click('[data-testid="btn-launch"]');
      await page.waitForTimeout(150);
    }
    const hash = await page.textContent('[data-testid="state-hash"]');
    const day = await page.textContent('[data-testid="day-counter"]');
    const chronicle = await page.textContent('[data-testid="chronicle"]');
    const scroll = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    let replay = '';
    try {
      await page.click('[data-testid="btn-replay"]');
      await page.waitForTimeout(300);
      replay = await page.textContent('[data-testid="replay-result"]');
    } catch (e) { replay = 'ERREUR: ' + e.message; }
    await page.screenshot({ path: path.join(OUT, `shot_${width}_${clicks}_${colorScheme}.png`), fullPage: false });
    for (const tab of ['village', 'effectif', 'chronique', 'journal']) {
      try {
        await page.click(`[data-testid="tab-${tab}"]`, { timeout: 1500 });
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(OUT, `shot_${width}_${clicks}_${colorScheme}_${tab}.png`), fullPage: false });
      } catch { /* onglet absent : la revue UX le verra sur les captures manquantes */ }
    }
    await ctx.close();
    return { errors, hash, day, chronicle, scroll, replay };
  }
  try {
    const a = await session(1280, 5);
    const b = await session(1280, 5);
    const m = await session(400, 3);
    const dk = await session(1280, 2, 'dark');
    check('aucune erreur console/page (thème sombre)', dk.errors.length === 0, dk.errors.slice(0, 3).join(' | '));
    check('aucune erreur console/page (desktop)', a.errors.length === 0, a.errors.slice(0, 3).join(' | '));
    check('aucune erreur console/page (mobile 400px)', m.errors.length === 0, m.errors.slice(0, 3).join(' | '));
    check('hash affiché non vide', !!(a.hash && a.hash.trim()));
    check('deux sessions identiques après 5 journées', a.hash === b.hash && a.chronicle === b.chronicle, `${a.hash} vs ${b.hash}`);
    check('compteur de jour avance', /5|6/.test(a.day || ''), a.day);
    check('chronique visible non vide', (a.chronicle || '').trim().length > 200);
    check('rejeu déclaré IDENTIQUE', /IDENTIQUE/i.test(a.replay || ''), a.replay);
    check('pas de défilement horizontal à 400px', m.scroll.sw <= m.scroll.cw, JSON.stringify(m.scroll));
  } catch (e) {
    check('navigateur : session', false, String(e.stack || e));
  }
  await browser.close();
}

const fails = results.filter(r => !r.ok);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 1));
console.log(`\n${results.length - fails.length}/${results.length} contrôles passés`);
process.exit(fails.length ? 1 : 0);
