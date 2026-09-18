// Banc Playwright de la V3 « âges du village + attaque de dragon ». Usage : node test/ui_v3_check.mjs
// 1) le moteur sous node (mêmes 5 managers que la page, lus dans index.html) donne les jours de présage / attaque de la graine 4242,
//    une graine avec issue « ravage » et une graine où le château est atteint ; 2) la page rejoue ces journées dans Chromium.
// Horloge simulée via page.clock (aucune attente réelle). Captures : test/out/v3_*.png. Code de sortie 1 si un contrôle échoue.
// Adapté V4 (2026-09-18) : (1) la page transmet désormais TOUT planDefaults(p1) (types gérés préremplis + types non gérés tels quels, point 8 de la
// mission V4), la prédiction sous node ne filtre donc plus les types ; (2) le bouton « Défendre le village » est devenu le préréglage #preset-defense
// en tête des préréglages, les 5 boutons d'activité sont remplacés par 3 cases. Les contrôles touchés sont marqués « V4 : ».
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const pw = require('/opt/node22/lib/node_modules/playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true });
const URL_FILE = pathToFileURL(path.join(ROOT, 'index.html')).href;
const sim = require(path.join(ROOT, 'sim.js'));
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
// V5 T4 : la page charge tactic.js et joue le raid ; la prédiction sous node joue donc le même moteur,
// raids ACTIFS (le bloc `data.raid.raid_enabled = false` de la T1 est retiré).
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MANAGERS = new Function('return [' + /var MANAGERS = \[([\s\S]*?)\];/.exec(html)[1] + '];')();
const AGE_NAMES = data.village_ages.map(a => a.name);
const OUTCOMES = ['vaincu', 'repoussé', 'ravage'];
// V5 T4 : le dragon de la forêt se joue en raid tactique ; sa journée de clôture n'a plus de section « Menace »
// dans la chronique mais une section « Raid » qui porte les mêmes méta (bâtiment touché, butin, légendaire).
const THREAT_SEC = '[data-testid="chronicle"] .chron-section.is-menace, [data-testid="chronicle"] .chron-section.is-raid';
// V4 : la page transmet tout planDefaults(p1) dans son ordre (plus de filtre de types) ; la prédiction sous node joue la même politique.
const PAGE_TYPES = null;

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const shot = async (page, name) => { await page.clock.runFor(1500); await page.screenshot({ path: path.join(OUT, `v3_${name}.png`), fullPage: false }); };
const tableau = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__tableau)));
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const visible = (page, sel) => page.isVisible(sel);
const text = async (page, sel) => ((await page.textContent(sel)) || '').trim();

/* ---- 1. Moteur sous node : calendrier des menaces ---- */
function season(seed) {
  let s = sim.newGame(seed, data, { managers: MANAGERS }); const days = [];
  for (let d = 0; d < 30; d++) {
    const vm = sim.viewModel(s, 'p1'); let a = []; for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m).filter(x => m !== 'p1' || !PAGE_TYPES || PAGE_TYPES.has(x.type)));
    const r = sim.resolveDay(s, a); s = r.state;
    days.push({ day: vm.day, age: vm.village.age_index, threat: vm.threat ? vm.threat.phase : null, outcome: r.chronicle.threat ? r.chronicle.threat.outcome : null, presage: r.chronicle.summary.presage, age_after: r.state.village_age, hit: r.chronicle.threat ? r.chronicle.threat.building_hit : null });
  }
  return days;
}
const S = season(4242);
const attack = S.filter(d => d.threat === 'today')[0], presage = S.filter(d => d.presage)[0];
check('moteur 4242 : présage la veille du premier jour d’attaque', attack && presage && presage.day === attack.day - 1, `présage j${presage && presage.day}, attaque j${attack && attack.day}, issue ${attack && attack.outcome}`);
let ravage = null, chateau = null, repousse = null;
for (let seed = 1; seed <= 80 && !(ravage && chateau && repousse); seed++) {
  const d = season(seed);
  if (!ravage) { const f = d.filter(x => x.outcome === 'ravage')[0]; if (f) ravage = { seed, day: f.day, hit: f.hit }; }
  if (!repousse) { const f = d.filter(x => x.outcome === 'repoussé')[0]; if (f) repousse = { seed, day: f.day }; }
  if (!chateau) { const f = d.filter(x => x.age_after === 4)[0]; if (f) chateau = { seed, day: f.day }; }
}
const chateau4242 = S.filter(x => x.age_after === 4)[0];
console.log('moteur : ravage', JSON.stringify(ravage), '· repoussé', JSON.stringify(repousse), '· château', JSON.stringify(chateau), '· château sur 4242', JSON.stringify(chateau4242 || null));

/* ---- 2. Page ---- */
async function newPage(browser, width, colorScheme = 'light', ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, ...ctxOpts });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  const T0 = new Date('2026-09-18T08:00:00Z'); await page.clock.install({ time: T0 }); await page.clock.pauseAt(T0);
  await page.goto(URL_FILE); await page.waitForSelector('[data-testid="btn-launch"]');
  return { ctx, page, errors };
}
// Fin de journée jusqu'au soir du jour `day` (le bouton, depuis le soir, prépare lui-même le matin suivant).
async function playToEvening(page, day) {
  for (let guard = 0; guard < 40; guard++) {
    const t = await tableau(page);
    if (t.evening && t.day === day + 1) return t;
    if (!t.evening && t.day > day) throw new Error('jour dépassé : ' + t.day);
    await page.click('[data-testid="btn-launch"]');
  }
  throw new Error('playToEvening : trop de journées');
}
async function newGameSeed(page, seed) {
  await page.click('[data-testid="tab-journal"]');
  await page.fill('#seed-input', String(seed));
  await page.click('#btn-new-game');
  await page.keyboard.press('Escape');
}

const browser = await pw.chromium.launch();
// ---- A. Bureau 1280 clair : graine 4242, présage → attaque → défense → issue → château → rejeu
{
  const { ctx, page, errors } = await newPage(browser, 1280);
  let t = await tableau(page);
  check('jour 1 : __tableau.age = 0 (campement), threat null', t.age === 0 && t.threat === null && t.threat_outcome === null, JSON.stringify({ age: t.age, threat: t.threat }));
  check('jour 1 : titre du tableau « Campement — Jour 1 / 30 »', /^Campement — Jour 1 \/ 30$/.test(await text(page, '[data-testid="scene-title"]')), await text(page, '[data-testid="scene-title"]'));
  await shot(page, 'campement_matin');
  await page.click('[data-testid="tab-village"]');
  check('tiroir Village : carte d’âge avec nom, description et deux jauges', (await text(page, '#age-name')) === 'Campement' && (await page.$$('#age-gauges .age-gauge')).length === 2 && /Prestige/.test(await text(page, '#age-gauges')) && /Niveaux/.test(await text(page, '#age-gauges')));
  await page.keyboard.press('Escape');
  // soir du présage
  t = await playToEvening(page, presage.day);
  check('soir du présage : __tableau.threat = presage', t.threat === 'presage' && t.threat_outcome === null, JSON.stringify({ day: t.day, threat: t.threat }));
  check('soir du présage : bandeau présage visible', await visible(page, '[data-testid="banner-presage"]') && /Présage/.test(await text(page, '[data-testid="banner-presage"]')), await text(page, '[data-testid="banner-presage"]'));
  check('soir du présage : section Présage dans la chronique', (await page.$$('[data-testid="chronicle"] .chron-section.is-presage')).length === 1);
  await shot(page, 'presage_soir');
  // matin de l'attaque
  await page.click('#btn-next-day');
  t = await tableau(page);
  check('matin de l’attaque : __tableau.threat = today', t.threat === 'today' && t.day === attack.day, JSON.stringify({ day: t.day, threat: t.threat }));
  const alert = await text(page, '[data-testid="banner-threat"]');
  check('matin de l’attaque : bandeau d’alerte (défense estimée, défenseurs prévus)', await visible(page, '[data-testid="banner-threat"]') && /attaque aujourd/.test(alert) && /défense estimée \d+/.test(alert) && /défenseur/.test(alert), alert); // V4 : le bandeau nomme le dragon (« <dragon> attaque aujourd’hui — <biome> »)
  check('matin de l’attaque : aperçu widget « 🐉 Dragon aujourd’hui »', /Dragon aujourd/.test(await text(page, '#widget-l2')) && await page.$eval('#widget-l2', e => e.classList.contains('crit')), await text(page, '#widget-l2'));
  await shot(page, 'attaque_matin');
  await page.click('[data-testid="tab-heros"]');
  // V4 : « Défendre le village » = préréglage Défense en tête des préréglages ; les autres préréglages restent, plus 3 cases.
  const first = await page.$eval('#presets', e => e.querySelector('.preset-btn') ? e.querySelector('.preset-btn').id : '');
  check('Mon héros : préréglage « Défense » présent, en premier, mis en avant', first === 'preset-defense' && /Défense/.test(await text(page, '#preset-defense')) && await page.$eval('#preset-defense', e => e.classList.contains('is-defend') && !e.disabled), first);
  check('Mon héros : les autres préréglages restent (≥ 4 préréglages) et 3 cases', (await page.$$('#presets .preset-btn')).length >= 4 && (await page.$$('#slots .day-slot')).length === 3);
  await page.click('#preset-defense');
  t = await tableau(page);
  check('clic Défendre : __tableau.placed.p1 = defend, figurine devant la porte', t.placed.p1 === 'defend' && t.targets.p1.y > 400 && t.targets.p1.x > 540, JSON.stringify(t.targets.p1));
  check('clic Défendre : préréglage pressé, 3 cases verrouillées', (await page.getAttribute('#preset-defense', 'aria-pressed')) === 'true' && (await page.$$('#slots .day-slot.is-locked')).length === 3);
  await shot(page, 'heros_defend');
  await page.click('[data-testid="tab-tableau"]');
  // soir de l'attaque
  await page.click('[data-testid="btn-launch"]');
  t = await tableau(page);
  check('soir de l’attaque : __tableau.threat_outcome ∈ {vaincu, repoussé, ravage}', OUTCOMES.includes(t.threat_outcome) && t.threat === null, JSON.stringify({ outcome: t.threat_outcome, moteur: attack.outcome }));
  check('soir de l’attaque : issue identique à celle du moteur sous node', t.threat_outcome === attack.outcome);
  const oc = await text(page, '[data-testid="banner-outcome"]');
  const expect = { vaincu: /dragon est vaincu/, 'repoussé': /dragon est repoussé/, ravage: /Jour noir/ }[t.threat_outcome];
  check('soir de l’attaque : bandeau d’issue correspondant', await visible(page, '[data-testid="banner-outcome"]') && expect.test(oc), oc);
  check('soir de l’attaque : bloc Menace (ou Raid) mis en évidence + badge âge dans la chronique', (await page.$$(THREAT_SEC)).length === 1 && (await text(page, '#chron-age')) === AGE_NAMES[t.age] , await text(page, '#chron-age'));
  check('soir de l’attaque : « Qui a joué » toujours là (5 / 5)', /5 \/ 5 ont joué/.test(await text(page, '[data-testid="played-count"]')));
  const outcomeShot = t.threat_outcome === 'repoussé' ? 'repousse' : t.threat_outcome;
  await shot(page, 'soir_' + outcomeShot);
  // jusqu'au jour 30 : âge monotone, titre = nom de l'âge
  let ages = [t.age], titles = true, ageUpSeen = false, chateauShot = false;
  for (let guard = 0; guard < 40; guard++) {
    t = await tableau(page);
    if (!titles) break;
    const title = await text(page, '[data-testid="scene-title"]');
    if (!title.startsWith(AGE_NAMES[t.age] + ' — ')) { titles = false; console.log('titre inattendu :', title, 'âge', t.age); }
    if (t.evening && await visible(page, '[data-testid="banner-age"]')) {
      ageUpSeen = true; const b = await text(page, '[data-testid="banner-age"]');
      if (t.age === 2) { check('bandeau « Le village devient un Bourg »', /Le village devient un Bourg/.test(b), b); await shot(page, 'bourg_soir'); }
      if (t.age === 3) { check('bandeau « Le village devient une Ville fortifiée »', /Le village devient une Ville fortifiée/.test(b), b); await page.click('#btn-next-day'); await shot(page, 'ville_matin'); }
      if (t.age === 4 && !chateauShot) { chateauShot = true; await shot(page, 'chateau'); }
    }
    if (await page.$eval('[data-testid="btn-launch"]', e => e.disabled)) break;
    await page.click('[data-testid="btn-launch"]');
    t = await tableau(page); ages.push(t.age);
  }
  check('jusqu’au jour 30 : __tableau.age monotone', ages.every((a, i) => i === 0 || a >= ages[i - 1]), ages.join(''));
  check('jusqu’au jour 30 : le titre du tableau porte toujours le nom de l’âge', titles);
  check('un passage d’âge a affiché son bandeau', ageUpSeen);
  check('saison terminée', /Saison terminée/.test(await text(page, '[data-testid="day-counter"]')));
  t = await tableau(page);
  check('âge final de la page = âge prédit par le moteur (politique page)', t.age === S[29].age_after, 'page ' + t.age + ', moteur ' + S[29].age_after);
  if (chateau4242) check('château atteint sur 4242 (moteur) : capture v3_chateau prise, __tableau.age = 4', chateauShot && t.age === 4, 'moteur : château dès le jour ' + chateau4242.day);
  else console.log('château non atteint sur 4242 (politique page) ; graine trouvée :', JSON.stringify(chateau));
  // journal : âge par jour, export → import → rejeu
  await page.click('[data-testid="tab-journal"]');
  const rows = (await page.$$('#journal-rows li')).length, tags = (await page.$$('#journal-rows li .age-tag')).length;
  check('journal : un âge affiché à côté de chaque jour', rows === 30 && tags === 30, rows + ' jours, ' + tags + ' âges');
  const lastTag = await page.$eval('#journal-rows li:last-child .age-tag', e => e.textContent.trim());
  check('journal : âge du dernier jour = ' + AGE_NAMES[t.age], lastTag === AGE_NAMES[t.age], lastTag);
  await page.click('#btn-export');
  const json = await page.inputValue('#journal-json');
  const hashBefore = await text(page, '[data-testid="state-hash"]');
  await page.click('#btn-import');
  check('import : rejoué, même empreinte', /Importé/.test(await text(page, '#import-result')) && (await text(page, '[data-testid="state-hash"]')) === hashBefore && JSON.parse(json).days.length === 30);
  await page.click('[data-testid="btn-replay"]');
  check('export → import → Rejouer : IDENTIQUE', /IDENTIQUE/.test(await text(page, '[data-testid="replay-result"]')), await text(page, '[data-testid="replay-result"]'));
  await page.keyboard.press('Escape');
  check('bureau : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
// ---- B. Graine « ravage » (et « repoussé » si même graine) via Nouvelle partie
if (ravage) {
  const { ctx, page, errors } = await newPage(browser, 1280);
  await newGameSeed(page, ravage.seed);
  let t = await tableau(page);
  check('Nouvelle partie graine ' + ravage.seed + ' : jour 1, âge 0', t.day === 1 && t.age === 0 && new RegExp('graine ' + ravage.seed + '\\b').test(await text(page, '#journal-count')), await text(page, '#journal-count'));
  if (repousse && repousse.seed === ravage.seed && repousse.day < ravage.day) {
    t = await playToEvening(page, repousse.day);
    check('graine ' + ravage.seed + ' jour ' + repousse.day + ' : repoussé, bandeau « repoussé »', t.threat_outcome === 'repoussé' && /repoussé/.test(await text(page, '[data-testid="banner-outcome"]')), t.threat_outcome);
    await shot(page, 'soir_repousse');
  }
  t = await playToEvening(page, ravage.day);
  const oc = await text(page, '[data-testid="banner-outcome"]');
  check('graine ' + ravage.seed + ' jour ' + ravage.day + ' : ravage, bandeau « Jour noir : … a brûlé »', t.threat_outcome === 'ravage' && /Jour noir/.test(oc) && (!ravage.hit || oc.indexOf(ravage.hit) >= 0), oc);
  check('ravage : chronique signale le bâtiment touché', /Bâtiment touché/.test(await text(page, THREAT_SEC)));   // V5 T4 : section Menace ou Raid
  await shot(page, 'soir_ravage');
  check('ravage : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
} else check('graine avec issue « ravage » trouvée par le moteur (80 graines)', false);
if (repousse && !(ravage && repousse.seed === ravage.seed && repousse.day < ravage.day)) {
  const { ctx, page, errors } = await newPage(browser, 1280);
  await newGameSeed(page, repousse.seed);
  const t = await playToEvening(page, repousse.day);
  check('graine ' + repousse.seed + ' jour ' + repousse.day + ' : repoussé, bandeau « repoussé »', t.threat_outcome === 'repoussé' && /repoussé/.test(await text(page, '[data-testid="banner-outcome"]')), t.threat_outcome + ' · ' + errors.slice(0, 2).join(' | '));
  await shot(page, 'soir_repousse');
  await ctx.close();
}
if (chateau && !chateau4242) {
  const { ctx, page, errors } = await newPage(browser, 1280);
  await newGameSeed(page, chateau.seed);
  const t = await playToEvening(page, chateau.day);
  const b = await text(page, '[data-testid="banner-age"]');
  check('graine ' + chateau.seed + ' jour ' + chateau.day + ' : château atteint, bandeau « Le village devient un Château »', t.age === 4 && /Le village devient un Château/.test(b), b + ' · âge ' + t.age);
  check('château : titre du tableau « Château — … »', /^Château — /.test(await text(page, '[data-testid="scene-title"]')));
  await shot(page, 'chateau');
  await page.click('#btn-next-day');
  await shot(page, 'chateau_matin');
  await page.click('[data-testid="tab-village"]');
  check('château : carte d’âge sans âge suivant, aucune erreur', /ne grandira plus/.test(await text(page, '#age-gauges')) && errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
} else if (!chateau4242) check('graine où le château est atteint (politique page, 80 graines)', false);
// ---- C. Mobile 400 : jour d'attaque sans défilement horizontal
{
  const { ctx, page, errors } = await newPage(browser, 400);
  await playToEvening(page, presage.day);
  await page.click('#btn-next-day');
  const t = await tableau(page);
  check('mobile : matin de l’attaque (threat = today)', t.threat === 'today');
  check('mobile : pas de défilement horizontal avec le bandeau d’alerte', await noHScroll(page));
  await shot(page, 'mobile_attaque');
  await page.click('[data-testid="tab-heros"]');
  check('mobile : préréglage Défense pleine largeur, pas de défilement horizontal', await visible(page, '#preset-defense') && await noHScroll(page)); // V4
  await page.click('#preset-defense');
  await page.click('[data-testid="tab-tableau"]');
  await page.click('[data-testid="btn-launch"]');
  check('mobile : soir de l’attaque, pas de défilement horizontal', OUTCOMES.includes((await tableau(page)).threat_outcome) && await noHScroll(page));
  await page.click('[data-testid="tab-village"]');
  check('mobile : carte d’âge dans le tiroir', (await page.$$('#age-gauges .age-gauge')).length === 2 && await noHScroll(page));
  check('mobile : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
// ---- D. Sombre 1280 : matin de l'attaque + soir, aucune erreur
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'dark');
  await playToEvening(page, presage.day);
  await page.click('#btn-next-day');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('sombre : fond du body sombre, matin de l’attaque', bg === 'rgb(20, 26, 23)' && (await tableau(page)).threat === 'today', bg);
  await shot(page, 'sombre');
  await page.click('[data-testid="btn-launch"]');
  check('sombre : soir de l’attaque rendu, aucune erreur console/page', OUTCOMES.includes((await tableau(page)).threat_outcome) && errors.length === 0, errors.slice(0, 3).join(' | '));
  await shot(page, 'sombre_soir');
  await ctx.close();
}
// ---- E. prefers-reduced-motion : jour d'attaque statique sans erreur
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'light', { reducedMotion: 'reduce' });
  await playToEvening(page, presage.day);
  await page.click('#btn-next-day');
  await page.clock.runFor(1200);
  check('reduced-motion : matin de l’attaque rendu sans erreur', (await tableau(page)).threat === 'today' && errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close();
const fails = results.filter(r => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} contrôles passés`);
process.exit(fails.length ? 1 : 0);
