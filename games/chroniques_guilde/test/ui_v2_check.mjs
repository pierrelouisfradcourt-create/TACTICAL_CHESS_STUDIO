// Banc Playwright de la V2 « tableau vivant ». Usage : node test/ui_v2_check.mjs
// Adapté V4 (2026-09-18) : les 5 boutons d'activité (#quick-<act>, #act-<act>, .act-btn) ont été remplacés par les préréglages du moteur
// (#quick-<preset>, #preset-<preset>) et trois cases (#slot-1..3). Seuls les contrôles qui en dépendaient changent, marqués « V4 : ».
// Contrôle l'horloge simulée via page.clock (aucune attente réelle), écrit les captures test/out/v2_*.png.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const pw = require('/opt/node22/lib/node_modules/playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true });
const URL_FILE = pathToFileURL(path.join(HERE, '..', 'index.html')).href;
const DATA = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'data.json'), 'utf8'));   // V5 T9 : les emplacements viennent des données
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `v2_${name}.png`), fullPage: false });
const tableau = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__tableau)));
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const visible = (page, sel) => page.isVisible(sel);

async function newPage(browser, width, colorScheme = 'light', ctxOpts = {}, useClock = true) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, ...ctxOpts });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  if (useClock) { const T0 = new Date('2026-09-18T08:00:00Z'); await page.clock.install({ time: T0 }); await page.clock.pauseAt(T0); }
  await page.goto(URL_FILE); await page.waitForSelector('[data-testid="btn-launch"]');
  return { ctx, page, errors };
}

const browser = await pw.chromium.launch();
// ---- 1. Bureau 1280 clair : la journée simulée de bout en bout
{
  const { ctx, page, errors } = await newPage(browser, 1280);
  let t = await tableau(page);
  check('au repos : 0 / 5 ont joué', t.played === 0 && t.total === 5 && Object.keys(t.placed).length === 0, JSON.stringify(t.placed));
  check('au repos : texte « 0 / 5 ont joué »', /0 \/ 5 ont joué/.test(await page.textContent('[data-testid="played-count"]')));
  check('au repos : 5 silhouettes grises (aucune figurine placée, aucun ami révélé)', t.revealed.length === 0 && t.chosen === false && t.hour === 8);
  check('aperçu widget présent', await visible(page, '#widget-tile') && /0\/5 ont joué/.test(await page.textContent('#widget-l1')));
  check('aperçu widget : « Tu n’as pas encore joué » en orange', /pas encore joué/.test(await page.textContent('#widget-l2')) && await page.$eval('#widget-l2', e => e.classList.contains('warn')));
  const dims = await page.$eval('#widget-tile', e => ({ w: e.offsetWidth, h: e.offsetHeight }));
  check('aperçu widget : tuile carrée de 160 px', dims.w === 160 && dims.h === 160, JSON.stringify(dims));
  await shot(page, 'tableau_matin');
  const idleP1 = t.targets.p1;
  await page.click('#quick-aventure'); // V4 : préréglage Aventure = expédition (jour 1, graine 4242)
  t = await tableau(page);
  check('clic Expédition : placed.p1 = expedition, played = 1', t.placed.p1 === 'expedition' && t.played === 1 && t.chosen === true, JSON.stringify(t.placed));
  check('clic Expédition : figurine déplacée vers la route', t.targets.p1.x !== idleP1.x && t.targets.p1.x > 500, JSON.stringify([idleP1, t.targets.p1]));
  check('clic Expédition : texte « 1 / 5 ont joué »', /1 \/ 5 ont joué/.test(await page.textContent('[data-testid="played-count"]')));
  check('bouton Expédition pressé sur le raccourci', (await page.getAttribute('#quick-aventure', 'aria-pressed')) === 'true'); // V4 : préréglage
  await page.clock.runFor(300);
  t = await tableau(page);
  check('horloge : après 0,3 s un premier ami (8h) est révélé', t.revealed.length >= 1 && t.played === 2, JSON.stringify({ hour: t.hour, revealed: t.revealed, hours: t.hours }));
  await page.clock.runFor(900);
  t = await tableau(page);
  check('horloge : à 9h, trois amis révélés, 4 / 5 ont joué', t.hour >= 9 && t.revealed.length === 3 && t.played === 4, JSON.stringify({ hour: t.hour, revealed: t.revealed }));
  check('texte « 4 / 5 ont joué »', /4 \/ 5 ont joué/.test(await page.textContent('[data-testid="played-count"]')));
  await shot(page, 'tableau_reveles');
  await page.click('#btn-skip');
  t = await tableau(page);
  check('Passer : 20h, 5 / 5 ont joué', t.hour === 20 && t.played === 5 && t.revealed.length === 4, JSON.stringify(t));
  check('Passer : texte « 5 / 5 ont joué »', /5 \/ 5 ont joué/.test(await page.textContent('[data-testid="played-count"]')));
  check('Passer : le bouton disparaît à 20h', !(await visible(page, '#btn-skip')));
  const dayBefore = await page.textContent('[data-testid="day-counter"]');
  await page.click('[data-testid="btn-launch"]');
  t = await tableau(page);
  check('Fin de journée : canvas en mode soir', t.evening === true && t.phase === 'evening');
  check('Fin de journée : le jour avance', /Jour 1/.test(dayBefore) && /Jour 2/.test(await page.textContent('[data-testid="day-counter"]')));
  const instant = (await page.textContent('#instant-text')).trim();
  const headline = await page.$eval('[data-testid="chronicle"] .chron-headline', e => e.textContent.trim()).catch(() => '');
  check('Fin de journée : l’instant du jour affiché sous l’image', await visible(page, '#instant') && instant.length > 5 && instant === headline, instant);
  check('aperçu widget : 5/5 et l’instant du jour', /5\/5 ont joué/.test(await page.textContent('#widget-l1')) && (await page.textContent('#widget-l2')).trim() === instant);
  check('chronique : texte complet présent', (await page.textContent('[data-testid="chronicle"]')).trim().length > 200);
  check('soir : bouton Jour suivant visible, raccourcis masqués', await visible(page, '#btn-next-day') && !(await visible(page, '#quick')));
  await page.clock.runFor(100);
  await shot(page, 'tableau_soir');
  // Jour suivant : retour au matin, figurines grises
  await page.click('#btn-next-day');
  t = await tableau(page);
  check('Jour suivant : matin, 0 / 5, personne révélé', t.evening === false && t.played === 0 && t.revealed.length === 0 && t.hour === 8);
  // Mon héros
  await page.click('[data-testid="tab-heros"]');
  check('Mon héros : carte + préréglages + 3 cases (V4 : remplace les 5 boutons)', await visible(page, '#hero-card') && (await page.$$('#presets .preset-btn')).length >= 3 && (await page.$$('#slots .day-slot')).length === 3);
  check('Mon héros : 3 cartes de quête au plus', (await page.$$('#quest-cards .quest-card')).length <= 3 && (await page.$$('#quest-cards .quest-card')).length > 0);
  // V5 T9 : une ligne par emplacement DÉCLARÉ, plus un nombre en dur. La fiche n'en proposait que deux — la
  // babiole et la fiole étaient hors de portée du joueur — et les données en déclarent six depuis la cape et
  // l'anneau. Le contrôle lit `slots` pour ne plus avoir à être retouché au prochain emplacement.
  check('Mon héros : une ligne d\'équipement par emplacement déclaré (' + DATA.slots.length + ')',
    (await page.$$('#equip-rows .equip-row')).length === DATA.slots.length,
    (await page.$$('#equip-rows .equip-row')).length + ' lignes pour ' + DATA.slots.map(x => x.id).join(', '));
  // V4 : la cible se choisit dans le chooser d'une case (activity_options du moteur), plus dans une rangée de puces sous un bouton.
  await page.click('[data-testid="slot-1"]');
  // Le jour 2 de la graine 4242 le héros revient blessé (forge ou repos seulement, règle moteur) : on prend la première activité à cibles que le moteur propose.
  let chipIds = await page.$$eval('#chooser [data-activity="gather"][data-target]', els => els.map(e => e.id)), act = 'gather';
  if (!chipIds.length) { const first = await page.$('#chooser [data-target]'); if (first) { act = await first.getAttribute('data-activity'); chipIds = await page.$$eval('#chooser [data-activity="' + act + '"][data-target]', els => els.map(e => e.id)); } }
  if (chipIds.length) {
    check('cibles : le chooser de la case 1 propose des cibles (' + act + ')', await visible(page, '#chooser') && chipIds.length >= 1);
    await page.click('#' + chipIds[Math.min(1, chipIds.length - 1)]);
    t = await tableau(page);
    check('cibles : la case 1 porte l’activité et sa cible, chooser refermé', t.slots[0] === act && (await page.textContent('[data-testid="slot-1"]')).trim().length > 8 && !(await visible(page, '#chooser')));
    check('cibles : figurine placée sur le lieu de l’activité (lisière ou forge, x < 300)', t.placed.p1 === act && t.targets.p1.x < 300, JSON.stringify(t.targets.p1));
  } else check('Une activité à cibles disponible pour le test du chooser', false, 'héros indisponible ce jour');
  const qid = '#' + (await page.$$eval('#quest-cards .quest-card', els => els.map(e => e.id)))[0];
  const pressed0 = (await page.getAttribute(qid, 'aria-pressed')) === 'true';
  await page.click(qid);
  const pressed1 = (await page.getAttribute(qid, 'aria-pressed')) === 'true';
  await page.click(qid);
  check('vote quête : un tap bascule mon vote (retrait puis vote, ou l’inverse)', pressed1 !== pressed0 && ((await page.getAttribute(qid, 'aria-pressed')) === 'true') === pressed0);
  if (!pressed0) await page.click(qid);
  await shot(page, 'heros');
  // Tiroir
  await page.click('[data-testid="tab-village"]');
  check('tiroir : Village ouvert', await visible(page, '#drawer') && await visible(page, '#drawer-village') && (await page.$$('#bld-list .bld-row')).length === 8);
  const vote = await page.$('#bld-list [data-act="vote-build"]');
  if (vote) { await vote.click(); check('tiroir : vote du chantier en un geste', (await vote.getAttribute('aria-pressed')) === 'true' && /Mon vote/.test(await page.textContent('#vote-line'))); }
  await page.click('[data-testid="tab-effectif"]');
  check('tiroir : Compagnons = 5 héros', await visible(page, '#drawer-effectif') && (await page.$$('#effectif-list .adv-card')).length === 5);
  await page.click('[data-testid="tab-journal"]');
  check('tiroir : Journal ouvert', await visible(page, '#drawer-journal') && (await page.$$('#journal-rows li')).length === 1);
  await page.click('#btn-export');
  const json = await page.inputValue('#journal-json');
  let doc = null; try { doc = JSON.parse(json); } catch {}
  check('export : JSON {seed, managers, days}', doc && doc.seed === 4242 && Array.isArray(doc.managers) && doc.managers.length === 5 && doc.days.length === 1 && doc.days[0].hash);
  const hashBefore = await page.textContent('[data-testid="state-hash"]');
  await page.click('#btn-import');
  check('import : rejoué', /Importé/.test(await page.textContent('#import-result')), await page.textContent('#import-result'));
  check('import : même empreinte', (await page.textContent('[data-testid="state-hash"]')) === hashBefore);
  await page.click('[data-testid="btn-replay"]');
  check('rejeu après import : IDENTIQUE', /IDENTIQUE/.test(await page.textContent('[data-testid="replay-result"]')));
  await page.keyboard.press('Escape');
  check('tiroir : Échap ferme', !(await visible(page, '#drawer')));
  check('bureau : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
// ---- 2. Mobile 400 : pas de défilement horizontal, chronique présente dans le DOM même cachée
{
  const { ctx, page, errors } = await newPage(browser, 400);
  check('mobile : pas de défilement horizontal au repos', await noHScroll(page));
  await page.click('#quick-cueillette'); // V4 : préréglage Cueillette (récolte × PA)
  await page.clock.runFor(1200);
  await shot(page, 'mobile');
  await page.click('[data-testid="btn-launch"]');
  check('mobile : chronique dans le DOM avec le texte complet (parent [hidden])', (await page.textContent('[data-testid="chronicle"]')).trim().length > 200 && !(await visible(page, '[data-testid="chronicle"]')));
  await page.click('[data-testid="tab-chronique"]');
  check('mobile : onglet Chronique visible', await visible(page, '[data-testid="chronicle"]'));
  check('mobile : pas de défilement horizontal après une journée', await noHScroll(page));
  await page.click('[data-testid="tab-village"]');
  check('mobile : tiroir ouvert plein écran', await visible(page, '#drawer-village'));
  await page.click('#btn-drawer-close');
  const barH = await page.$eval('#topbar', e => e.offsetHeight);
  check('mobile : en-tête compact (< 130 px)', barH < 130, barH + ' px');
  check('mobile : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
// ---- 3. Sombre 1280 : soir + aucune erreur
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'dark');
  await page.click('#quick-aventure'); // V4 : préréglage Aventure
  await page.click('[data-testid="btn-launch"]');
  await page.clock.runFor(100);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('sombre : fond du body sombre', bg === 'rgb(20, 26, 23)', bg);
  await shot(page, 'sombre');
  check('sombre : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
// ---- 4. prefers-reduced-motion : rendu sans boucle rAF, horloge qui avance quand même
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'light', { reducedMotion: 'reduce' });
  await page.clock.runFor(1200);
  const t = await tableau(page);
  check('reduced-motion : l’horloge avance et révèle', t.hour >= 9 && t.revealed.length >= 1);
  check('reduced-motion : aucune erreur', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
// ---- 5. Sauvegarde locale : rechargement → partie restaurée par rejeu
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL_FILE); await page.waitForSelector('[data-testid="btn-launch"]');
  await page.click('[data-testid="btn-launch"]'); await page.click('[data-testid="btn-launch"]');
  const h = await page.textContent('[data-testid="state-hash"]');
  await page.reload(); await page.waitForSelector('[data-testid="btn-launch"]');
  check('localStorage : partie restaurée (même empreinte, jour 3)', (await page.textContent('[data-testid="state-hash"]')) === h && /Jour 3/.test(await page.textContent('[data-testid="day-counter"]')));
  check('localStorage : aucune erreur', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
await browser.close();
const fails = results.filter(r => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} contrôles passés`);
process.exit(fails.length ? 1 : 0);
