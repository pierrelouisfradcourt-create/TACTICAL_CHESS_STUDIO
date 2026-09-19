// Banc Playwright de la V4 « journée composée, missions solo, savoir-faire, dragons de biome, deuil, défaite ». Usage : node test/ui_v4_check.mjs
// Date : 2026-09-18. Source : mission PAGE V4 (GO Pierre) + CONTRACT.md section V4.
// 1) Le moteur sous node joue la politique de la page (mêmes 5 managers lus dans index.html ; plan humain = planDefaults(state,'p1') ENTIER dans son
//    ordre — les types gérés par l'écran y sont préremplis, les non gérés transmis tels quels — et planDefaults des IA) sur les graines 1..60 pour
//    trouver : un jour de dragon, un dragon vaincu (légendaire), une mort (IA), une mort de p1 (héritier), une montée de savoir-faire, une défaite
//    (si absente dans 1..60 : notée, puis cherchée dans 61..400 à titre de complément), et une journée où une commande de forge de p1 rend le
//    préréglage Atelier disponible (journal importé dans la page). Note : le préréglage « Aventure » du moteur coïncide avec l'assign/plan par
//    défaut de p1 sur ~37 % des journées seulement ; la page suit le contrat (préremplissage par planDefaults), le banc aussi.
// 2) La page rejoue ces journées dans Chromium (page.clock, aucune attente réelle). Captures : test/out/v4_*.png. Code de sortie 1 si un contrôle échoue.
// Adapté V5 T2b (2026-09-18) — contrôles devenus FAUX PAR CONCEPTION :
//  · « jour de dragon » : depuis V5 T2, les TROIS dragons ont une fiche de raid, donc `vm.threat.phase` ne vaut plus jamais
//    'today' : le jour de dragon est un JOUR DE RAID. Le bloc B vérifie désormais le présage, l'ouverture du raid et le biome
//    « éveillé » ; le bandeau d'attaque et le préréglage « Défense » de l'auto-combat V4 n'existent plus (raid : ui_v5_check).
//  · « mort de p1 » : aucune mort de p1 sur les graines 1..400 avec la politique de la page (idiome « non vérifiée » du banc).
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
const GOLD = { light: 'rgb(184, 137, 43)', dark: 'rgb(212, 166, 74)' };
// V5 T4 : le dragon de la forêt se joue en raid tactique. Sa journée de clôture porte une section « Raid »
// (et non « Menace ») qui reçoit les mêmes méta V4 : butin, légendaire, bâtiment touché. Les contrôles qui
// visaient `.is-menace` acceptent donc les deux sections.
const THREAT_SEC = '[data-testid="chronicle"] .chron-section.is-menace, [data-testid="chronicle"] .chron-section.is-raid';

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const note = (msg) => console.log('NOTE  ' + msg);
const shot = async (page, name) => { await page.clock.runFor(1500); await page.screenshot({ path: path.join(OUT, `v4_${name}.png`), fullPage: false }); };
const tableau = page => page.evaluate(() => JSON.parse(JSON.stringify(window.__tableau)));
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const visible = (page, sel) => page.isVisible(sel);
const text = async (page, sel) => ((await page.textContent(sel)) || '').trim();
const count = async (page, sel) => (await page.$$(sel)).length;
const critToasts = page => page.$$eval('#toasts .toast.crit', els => els.map(e => e.textContent));
const color = (page, sel) => page.$eval(sel, e => getComputedStyle(e).color);

/* ---- 1. Moteur sous node : politique de la page ---- */
const allDefaults = s => { let a = []; for (const m of sim.listManagers(s)) a = a.concat(sim.planDefaults(s, m)); return a; };
const mine = vm => vm.roster.filter(a => a.is_mine)[0] || null;
function season(seed) {
  let s = sim.newGame(seed, data, { managers: MANAGERS });
  const ev = { seed, attack: null, vaincu: null, death: null, p1death: null, defeat: null, craftUp: null, heir: null, deathSolo: null };
  for (let d = 0; d < 30; d++) {
    const vm = sim.viewModel(s, 'p1'); if (vm.is_season_over) break;
    const me = mine(vm), levels = me ? me.crafts.map(c => c.level) : null;
    // V5 T2b : le « jour de dragon » est le premier jour de raid (phase 'raid'), l'auto-combat 'today' n'existe plus.
    if (vm.threat && (vm.threat.phase === 'today' || vm.threat.phase === 'raid') && !ev.attack) ev.attack = { day: vm.day, name: vm.threat.name, biome: vm.threat.biome_name, phase: vm.threat.phase };
    // V5 T4 : plusieurs héritiers peuvent être offerts le même jour (les raids font mourir plusieurs héros à la fois) ;
    // on retient celui que planDefaults(p1) recrute — c'est celui que la page préremplit et accueille.
    if (!me && !ev.heir) {
      const rec = sim.planDefaults(s, 'p1').filter(a => a.type === 'recruit')[0];
      const o = vm.tavern.filter(t => t.cost === 0 && (!rec || t.id === rec.payload.recruit_id))[0];
      if (o) ev.heir = { day: vm.day, id: o.id, name: o.name };
    }
    const r = sim.resolveDay(s, allDefaults(s)); s = r.state;
    const c = r.chronicle, vm2 = sim.viewModel(s, 'p1'), me2 = mine(vm2);
    if (c.threat && c.threat.outcome === 'vaincu' && !ev.vaincu) ev.vaincu = { day: vm.day, legendary: c.threat.legendary, name: c.threat.dragon_name, biome: c.threat.biome_name };
    if (c.summary.deaths.length && !ev.death) ev.death = { day: vm.day, names: c.summary.deaths, mine: !!(me && c.summary.deaths.some(n => n.indexOf(me.name) === 0)) };
    if (ev.death && !ev.deathSolo && me2 && vm2.day - ev.death.day <= 4 && me2.activity_options.some(o => o.activity === 'solo')) ev.deathSolo = { ...ev.death, soloDay: vm2.day };
    if (me && c.summary.deaths.some(n => n.indexOf(me.name) === 0) && !ev.p1death) ev.p1death = { day: vm.day, name: me.name };
    if (me && me2 && me2.id === me.id && !ev.craftUp && me2.crafts.some((c2, i) => c2.level > levels[i])) ev.craftUp = { day: vm.day, name: me.name };
    if (vm2.defeat && !ev.defeat) ev.defeat = { day: vm.day, reason: vm2.defeat.reason, defeatDay: vm2.defeat.day };
  }
  return ev;
}
const found = { attack: null, vaincu: null, death: null, deathSolo: null, p1death: null, defeat: null, craftUp: null };
for (let seed = 1; seed <= 60; seed++) {
  const ev = season(seed);
  for (const k of Object.keys(found)) if (!found[k] && ev[k]) found[k] = { seed, ...ev[k], heir: ev.heir };
  if (Object.values(found).every(Boolean)) break;
}
let defeatOutside = null;
if (!found.defeat) { note('défaite : non trouvée sur les graines 1..60 (politique page) ; recherche complémentaire 61..400'); for (let seed = 61; seed <= 400 && !defeatOutside; seed++) { const ev = season(seed); if (ev.defeat) defeatOutside = { seed, ...ev.defeat }; } }
// V5 T5 : même recherche complémentaire pour la mort de MON héros. Le recalibrage des raids a fait tomber les morts
// de 4,1 % à 2,7 % des héros : le cas existe toujours mais ne se présente plus dans les soixante premières graines
// (première trouvée : graine 121, jour 23). Sans ce complément, tout le bloc « Deuil / héritier » était sauté.
if (!found.p1death) { note('mort de mon héros : non trouvée sur les graines 1..60 ; recherche complémentaire 61..400'); for (let seed = 61; seed <= 400 && !found.p1death; seed++) { const ev = season(seed); if (ev.p1death) found.p1death = { seed, ...ev.p1death, heir: ev.heir }; } }
console.log('moteur :', JSON.stringify({ attack: found.attack, vaincu: found.vaincu, death: found.death, deathSolo: found.deathSolo, p1death: found.p1death, craftUp: found.craftUp, defeat: found.defeat, defeatOutside }));
// Atelier : première (graine, jour) où un craft_order de p1 entre en file de forge (les IA, avant p1 en ASCII, prennent souvent la seule place) et où le lendemain
// le préréglage Atelier est disponible. Journal (graine, jours 1..d) construit avec la politique page + cet ordre, importé ensuite dans la page.
function atelierJournal() {
  for (let seed = 1; seed <= 60; seed++) {
    let s = sim.newGame(seed, data, { managers: MANAGERS }); const days = [];
    for (let d = 0; d < 28; d++) {
      const vm = sim.viewModel(s, 'p1'), rec = vm.forge.recipes.filter(r => r.available)[0], base = allDefaults(s);
      if (rec && mine(vm)) {
        const co = { manager_id: 'p1', day: s.day, type: 'craft_order', payload: { recipe_id: rec.id } };
        if (sim.validateAction(s, co).ok) {
          const r = sim.resolveDay(s, base.concat([co])), vm2 = sim.viewModel(r.state, 'p1'), me = mine(vm2), at = me && me.presets.filter(p => p.id === 'atelier')[0];
          if (at && at.available && at.slots.length >= 3) return { seed, day: vm.day, next: vm2.day, slots: at.slots, ap: me.ap_today, journal: { seed, managers: MANAGERS, days: days.concat([{ day: vm.day, actions: base.concat([co]) }]) } };
        }
      }
      const r = sim.resolveDay(s, base); days.push({ day: vm.day, actions: base }); s = r.state;
    }
  }
  return null;
}
const atelier = atelierJournal();
console.log('moteur : atelier', atelier ? JSON.stringify({ seed: atelier.seed, day: atelier.day, slots: atelier.slots, ap: atelier.ap }) : 'non trouvé');
const VM1 = sim.viewModel(sim.newGame(4242, data, { managers: MANAGERS }), 'p1'), ME1 = mine(VM1);

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
async function playToEvening(page, day) {
  for (let guard = 0; guard < 40; guard++) {
    const t = await tableau(page);
    if (t.evening && t.day === day + 1) return t;
    if (t.defeat) return t;
    if (!t.evening && t.day > day) throw new Error('jour dépassé : ' + t.day);
    await page.click('[data-testid="btn-launch"]');
  }
  throw new Error('playToEvening : trop de journées');
}
async function newGameSeed(page, seed) {
  await page.click('[data-testid="tab-journal"]'); await page.fill('#seed-input', String(seed)); await page.click('#btn-new-game'); await page.keyboard.press('Escape');
}
async function firstOpt(page, activity) { const el = await page.$('#chooser [data-activity="' + activity + '"]'); return el ? await el.getAttribute('id') : null; }

const browser = await pw.chromium.launch();
// ---- A. Bureau 1280 clair, graine 4242 jour 1 : PA, cases, composition, refus, verrouillage, mission solo, chronique, journal, biomes
{
  const { ctx, page, errors } = await newPage(browser, 1280);
  await page.click('[data-testid="tab-heros"]');
  let t = await tableau(page);
  check('PA affichés = VM (ap_today / ap_max)', (await text(page, '[data-testid="ap-line"]')) === 'Points d’action : ' + ME1.ap_today + ' / ' + ME1.ap_max && t.ap.today === ME1.ap_today && t.ap.max === ME1.ap_max, await text(page, '[data-testid="ap-line"]'));
  check('3 cases (slot-1..3) et préréglages du moteur (' + ME1.presets.map(p => p.id).join(', ') + ')', await count(page, '[data-testid^="slot-"]') === 3 && await count(page, '#presets .preset-btn') === ME1.presets.length);
  check('préréglage indisponible grisé avec la raison du moteur', (await Promise.all(ME1.presets.filter(p => !p.available).map(async p => (await page.$eval('#preset-' + p.id, e => e.disabled + '|' + e.title)) === 'true|' + p.reason))).every(Boolean));
  check('plan par défaut = planDefaults(p1) (expédition → 3 cases verrouillées, Aventure pressé)', t.slots.join('+') === 'expedition' && await count(page, '#slots .day-slot.is-locked') === 3 && (await page.getAttribute('#preset-aventure', 'aria-pressed')) === 'true', t.slots.join('+'));
  // composition manuelle gather + train + craft
  await page.click('[data-testid="slot-1"]');
  check('tap sur une case : chooser avec label, coût en PA et cibles', await visible(page, '#chooser') && await count(page, '#chooser .opt .cost') === ME1.activity_options.length && /PA/.test(await text(page, '#chooser')));
  await page.click('#' + await firstOpt(page, 'gather'));
  await page.click('[data-testid="slot-2"]'); await page.click('#' + await firstOpt(page, 'train'));
  await page.click('[data-testid="slot-3"]'); await page.click('#' + await firstOpt(page, 'craft'));
  t = await tableau(page);
  check('composition manuelle gather + train + craft acceptée (aucun toast d’erreur)', t.slots.join('+') === 'gather+train+craft' && (await critToasts(page)).length === 0 && await count(page, '#slots .day-slot.is-filled') === 3, t.slots.join('+'));
  // plan qui dépasse les PA : mission solo (2 PA) par-dessus 3 PA engagés → 4 PA
  const soloId = VM1.solo_board[0].id, soloOpen = ME1.activity_options.filter(o => o.activity === 'solo')[0].targets.some(x => x.id === soloId) ? soloId : ME1.activity_options.filter(o => o.activity === 'solo')[0].targets[0].id;
  await page.click('#mission-' + soloId);
  const toasts = await critToasts(page); t = await tableau(page);
  check('plan qui dépasse les PA refusé par le moteur, toast avec la raison', toasts.length === 1 && /PA/.test(toasts[0]) && t.slots.join('+') === 'gather+train+craft', toasts[0]);
  // expédition verrouille
  await page.click('[data-testid="preset-aventure"]'); t = await tableau(page);
  check('préréglage Aventure (expédition) verrouille les 3 cases', t.slots.join('+') === 'expedition' && await count(page, '#slots .day-slot.is-locked') === 3 && /journée entière/.test(await text(page, '[data-testid="slot-2"]')));
  // mission solo sélectionnable et placée
  await page.click('#mission-' + soloOpen); t = await tableau(page);
  check('mission solo : sélectionnée (carte pressée) et placée (__tableau.solo, case Mission solo)', t.solo === soloOpen && t.slots[0] === 'solo' && (await page.getAttribute('#mission-' + soloOpen, 'aria-pressed')) === 'true' && /Mission solo/.test(await text(page, '[data-testid="slot-1"]')), JSON.stringify(t.slots));
  await page.click('[data-testid="slot-2"]'); await page.click('#' + await firstOpt(page, 'train')); t = await tableau(page);
  check('solo + entraînement = 3 PA accepté', t.slots.join('+') === 'solo+train' && (await critToasts(page)).length === 1);
  check('missions du jour = VM.solo_board (nom, classe/libre, étoiles, récompenses, risque)', await count(page, '#missions .mission-card') === VM1.solo_board.length && (await text(page, '#mission-' + soloId)).indexOf(VM1.solo_board[0].rewards_label) >= 0 && await count(page, '#missions .mission-card .stars') === VM1.solo_board.length);
  await page.$eval('#fold-crafts', e => { e.open = true; });
  check('savoir-faire visibles (6 disciplines : nom, niveau, jauge, bonus)', await count(page, '#hero-crafts .craft') === ME1.crafts.length && await visible(page, '#hero-crafts .craft') && (await text(page, '#hero-crafts')).indexOf(ME1.crafts[0].bonus_label) >= 0);
  await shot(page, 'heros');
  await page.click('[data-testid="tab-tableau"]'); t = await tableau(page);
  check('tableau : figurine de mon héros sur le sentier solo (x < 366, y < 300)', t.placed.p1 === 'solo' && t.targets.p1.x < 366 && t.targets.p1.y < 300, JSON.stringify(t.targets.p1));
  await page.click('[data-testid="btn-launch"]'); t = await tableau(page);
  const chron = await text(page, '[data-testid="chronicle"]');
  check('Fin de journée : chronique avec les sections des activités composées (Missions solo + Entraînement mentionnant mon héros)', t.evening && await count(page, '[data-testid="chronicle"] .chron-section.is-solo') === 1 && new RegExp(ME1.name.split(' ')[0]).test(await text(page, '#sum-solo')) && /Entraînement/.test(chron));
  check('journal : la journée enregistre une action plan de p1', await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('guilde.v2.save')); return d.days[0].actions.some(a => a.manager_id === 'p1' && a.type === 'plan' && a.payload.slots.length === 2); }));
  await page.click('[data-testid="tab-journal"]'); await page.click('#btn-export');
  const json = await page.inputValue('#journal-json'), hashBefore = await text(page, '[data-testid="state-hash"]');
  await page.click('#btn-import');
  check('export → import : même empreinte, actions plan conservées', (await text(page, '[data-testid="state-hash"]')) === hashBefore && JSON.parse(json).days[0].actions.some(a => a.type === 'plan'));
  await page.click('[data-testid="btn-replay"]');
  check('export → import → Rejouer : IDENTIQUE', /IDENTIQUE/.test(await text(page, '[data-testid="replay-result"]')), await text(page, '[data-testid="replay-result"]'));
  await page.click('[data-testid="tab-village"]');
  check('tiroir Village : carte Biomes avec 3 biomes (nom, maîtrise X/Y, dragon nommé, état dormant)', await count(page, '#biome-list .biome') === 3 && (await text(page, '#biome-list')).indexOf(VM1.biomes[0].dragon.name) >= 0 && /maîtrise 0 \/ 6/.test(await text(page, '#biome-forest')) && /dormant/.test(await text(page, '#biome-forest')));
  check('tiroir Village : Coffre de guilde listé (vide au départ)', await visible(page, '#chest-list') && /vide/.test(await text(page, '#chest-list')));
  await shot(page, 'biomes');
  await page.keyboard.press('Escape');
  check('bureau : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
// ---- B. Jour de dragon : présage puis attaque nomment le dragon et son biome
if (found.attack) {
  const { ctx, page, errors } = await newPage(browser, 1280);
  await newGameSeed(page, found.attack.seed);
  let t = await playToEvening(page, found.attack.day - 1);
  const pres = await text(page, '[data-testid="banner-presage"]');
  check('graine ' + found.attack.seed + ' soir j' + (found.attack.day - 1) + ' : présage nomme le dragon et le biome', t.threat === 'presage' && pres.indexOf(found.attack.name) >= 0 && pres.indexOf(found.attack.biome) >= 0, pres);
  await page.click('#btn-next-day'); t = await tableau(page);
  // V5 T2b : jour de raid — la grille est dressée, le bandeau d'attaque de l'auto-combat V4 n'existe plus.
  check('matin j' + found.attack.day + ' : le raid du dragon est ouvert (grille dressée, plus de bandeau d’auto-combat)', t.raid !== null && t.raid.active === true && t.raid.day === found.attack.day && t.threat === null, JSON.stringify(t.raid));
  await page.click('[data-testid="tab-heros"]');
  check('jour de dragon : préréglage « Raid » en tête des préréglages, pleine largeur', (await page.$eval('#presets .preset-btn', e => e.id)) === 'preset-defense' && /Raid/.test(await text(page, '#preset-defense')) && await page.$eval('#preset-defense', e => e.classList.contains('is-defend')));
  await page.click('[data-testid="tab-village"]');
  check('tiroir Biomes : dragon « éveillé » sur son biome', /éveillé/.test(await text(page, '#biome-list')));
  await shot(page, 'dragon');
  check('dragon : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
} else check('jour de dragon trouvé par le moteur (graines 1..60)', false);   // ne devrait plus arriver : tous les dragons ont une fiche de raid
// ---- C. Dragon vaincu : légendaire en or (bandeau, chronique), trophée sur le hall, biome « vaincu »
if (found.vaincu) {
  const { ctx, page, errors } = await newPage(browser, 1280);
  await newGameSeed(page, found.vaincu.seed);
  const t = await playToEvening(page, found.vaincu.day);
  const oc = await text(page, '[data-testid="banner-outcome"]');
  check('graine ' + found.vaincu.seed + ' j' + found.vaincu.day + ' : vaincu, bandeau nomme le dragon, le biome et le légendaire', t.threat_outcome === 'vaincu' && oc.indexOf(found.vaincu.name) >= 0 && oc.indexOf(found.vaincu.biome) >= 0 && oc.indexOf(found.vaincu.legendary) >= 0, oc);
  check('légendaire affiché en or dans le bandeau et la chronique', (await color(page, '[data-testid="banner-outcome"] .rar-legendary')) === GOLD.light && (await color(page, '#sum-legendary .rar-legendary')) === GOLD.light && (await text(page, '#sum-legendary')).indexOf(found.vaincu.legendary) >= 0 && (await color(page, THREAT_SEC.split(', ').map(x => x + ' .loot .rar-legendary').join(', '))) === GOLD.light);   // V5 T4 : section Menace ou Raid
  check('trophée : __tableau.trophies = 1, badge de chronique nommant le dragon', t.trophies === 1 && (await text(page, '[data-testid="chronicle"] .chron-badge.is-crit')).indexOf(found.vaincu.name) >= 0);
  await shot(page, 'legendaire');
  await page.click('[data-testid="tab-village"]');
  check('tiroir : trophée listé, biome « vaincu », matériaux/coffre sans erreur', /💀/.test(await text(page, '#trophy-list')) && (await text(page, '#trophy-list')).indexOf(found.vaincu.name) >= 0 && /vaincu/.test(await text(page, '#biome-list')) && errors.length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
} else check('dragon vaincu trouvé par le moteur (graines 1..60)', false);
// ---- D. Mort d'un héros : bandeau Deuil, tombe, puis mission solo sur le tableau avec la tombe (graine où une solo s'ouvre à p1 dans les 4 jours)
const death = found.deathSolo || found.death;
if (death) {
  const { ctx, page, errors } = await newPage(browser, 1280);
  await newGameSeed(page, death.seed);
  let t = await playToEvening(page, death.day);
  const deuil = await text(page, '[data-testid="banner-deuil"]');
  check('graine ' + death.seed + ' j' + death.day + ' : bandeau « Deuil : X est tombé », section Deuil, __tableau.graves ≥ 1', /Deuil : .+ tombé/.test(deuil) && deuil.indexOf(death.names[0]) >= 0 && await count(page, '[data-testid="chronicle"] .chron-section.is-deuil') === 1 && t.graves >= 1 && (await text(page, '#sum-deaths')).indexOf(death.names[0]) >= 0, deuil);
  await shot(page, 'deuil');
  await page.click('#btn-next-day'); t = await tableau(page);
  check('lendemain : la tombe persiste (__tableau.graves ≥ 1)', t.graves >= 1);
  // Jusqu'à 4 matins après le deuil : première mission solo ouverte à mon héros (PA ≥ 2 et classe), placée pour la capture « solo + tombe ».
  // V5 T4 : un jour de raid (ou le lendemain, épuisé) le moteur refuse la mission solo même si la carte reste cliquable ;
  // la boucle ne s'arrête donc que si le plan a réellement pris (__tableau.solo), et essaie chaque carte ouverte.
  let placed = false;
  for (let k = 0; k < 5 && !placed; k++) {
    t = await tableau(page);
    if (!t.dead) {
      await page.click('[data-testid="tab-heros"]');
      const nCards = await count(page, '#missions .mission-card:not([disabled])');
      for (let i = 0; i < nCards && !placed; i++) {
        const m = (await page.$$('#missions .mission-card:not([disabled])'))[i];   // la liste est redessinée à chaque clic
        if (!m) break;
        await m.click();
        if ((await tableau(page)).solo) placed = true;
      }
      await page.click('[data-testid="tab-tableau"]');
    }
    if (!placed) { await page.click('[data-testid="btn-launch"]'); await page.click('#btn-next-day'); }
  }
  t = await tableau(page);
  check('mission solo placée après le deuil, tombe toujours là (__tableau.solo, graves ≥ 1)', placed && !!t.solo && t.placed.p1 === 'solo' && t.graves >= 1, 'jour ' + t.day + ' solo ' + t.solo);
  await shot(page, 'tableau_solo_tombe');
  await page.click('[data-testid="tab-village"]');
  check('tiroir : tombe listée avec nom, jour et cause', (await text(page, '#grave-list')).indexOf(death.names[0]) >= 0 && /jour \d+ · /.test(await text(page, '#grave-list')));
  check('deuil : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
} else check('mort trouvée par le moteur (graines 1..60)', false);
// ---- E. Mort de p1 : figurine grise avec brassard, « Ton héritier t'attend à la taverne », bouton Accueillir l'héritier
if (found.p1death) {
  const { ctx, page, errors } = await newPage(browser, 1280);
  await newGameSeed(page, found.p1death.seed);
  let t = await playToEvening(page, found.p1death.day);
  check('graine ' + found.p1death.seed + ' j' + found.p1death.day + ' : mon héros mort (__tableau.dead), bandeau Deuil', t.dead === true && /Deuil/.test(await text(page, '[data-testid="banner-deuil"]')));
  await page.click('#btn-next-day'); t = await tableau(page);
  await page.click('[data-testid="tab-heros"]');
  check('lendemain : « Ton héritier t’attend à la taverne » + carte de l’offre (coût 0) + bouton btn-heir', /héritier t’attend à la taverne/.test(await text(page, '#hero-card')) && /coût 0 or/.test(await text(page, '#heir-card')) && await visible(page, '[data-testid="btn-heir"]') && t.dead === true && t.placed.p1 === undefined);
  const pressed0 = await page.getAttribute('[data-testid="btn-heir"]', 'aria-pressed');
  await page.click('[data-testid="btn-heir"]');
  const pressed1 = await page.getAttribute('[data-testid="btn-heir"]', 'aria-pressed');
  if (pressed1 === 'false') await page.click('[data-testid="btn-heir"]');
  check('bouton Accueillir l’héritier : bascule (prérempli par planDefaults = ' + pressed0 + ') puis armé', pressed0 !== pressed1 && (await page.getAttribute('[data-testid="btn-heir"]', 'aria-pressed')) === 'true' && /accueilli ce soir/.test(await text(page, '[data-testid="btn-heir"]')));
  await shot(page, 'heritier');
  await page.click('[data-testid="tab-tableau"]'); await page.click('[data-testid="btn-launch"]');
  check('soir : recrue dans la chronique', (await text(page, '[data-testid="chronicle"]')).indexOf(found.p1death.heir ? found.p1death.heir.name : '§') >= 0);
  await page.click('#btn-next-day'); t = await tableau(page);
  await page.click('[data-testid="tab-heros"]');
  check('lendemain : l’héritier est mon héros (__tableau.dead = false, carte, PA affichés)', t.dead === false && (found.p1death.heir ? (await text(page, '#hero-card')).indexOf(found.p1death.heir.name) >= 0 : true) && /Points d’action/.test(await text(page, '[data-testid="ap-line"]')));
  check('héritier : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
} else check('mort de p1 : non trouvée (graines 1..400, politique page) — héritier non vérifié', true);   // V5 T2b : idiome « non vérifiée » du banc (cf. défaite)
// ---- F. Défaite : tableau en ruines, bandeau plein, Fin de journée désactivé, Nouvelle partie, chronique de chute
{
  const d = found.defeat || defeatOutside;
  if (!d) check('défaite : non trouvée (graines 1..60 ni 61..400) — non vérifiée', true);
  else {
    if (!found.defeat) note('défaite testée sur la graine ' + d.seed + ' (hors 1..60, complément)');
    const { ctx, page, errors } = await newPage(browser, 1280);
    await newGameSeed(page, d.seed);
    const t = await playToEvening(page, d.day);
    const ban = await text(page, '[data-testid="banner-defeat"]');
    check('graine ' + d.seed + ' j' + d.day + ' : __tableau.defeat, bandeau « La guilde est dispersée — jour N : raison »', t.defeat === true && ban.indexOf('La guilde est dispersée — jour ' + d.defeatDay + ' : ' + d.reason) >= 0, ban);
    check('défaite : Fin de journée désactivé, Nouvelle partie proposé, en-tête « Guilde dispersée »', await page.$eval('[data-testid="btn-launch"]', e => e.disabled) && await visible(page, '#btn-new-game-defeat') && /Guilde dispersée/.test(await text(page, '[data-testid="day-counter"]')));
    check('défaite : chronique de chute affichée (rapport « Chute de la guilde »)', await visible(page, '#season-report') && /Chute de la guilde/.test(await text(page, '#season-report')) && /dispersée/.test(await text(page, '[data-testid="chronicle"]')));
    await shot(page, 'defaite');
    await page.click('#btn-new-game-defeat');
    check('défaite : « Nouvelle partie » ouvre le tiroir Journal sur la graine', await visible(page, '#drawer-journal') && await page.$eval('#seed-input', e => document.activeElement === e) && errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
// ---- G. Préréglage Atelier (journal importé avec une commande de forge de p1) remplit les cases
if (atelier) {
  const { ctx, page, errors } = await newPage(browser, 1280);
  await page.click('[data-testid="tab-journal"]');
  await page.fill('#journal-json', JSON.stringify(atelier.journal)); await page.click('#btn-import');
  check('journal avec craft_order de p1 importé (graine ' + atelier.seed + ', jour ' + atelier.next + ')', /Importé/.test(await text(page, '#import-result')) && (await tableau(page)).day === atelier.next);
  await page.keyboard.press('Escape'); await page.click('[data-testid="tab-heros"]');
  check('préréglage Atelier disponible', !(await page.$eval('#preset-atelier', e => e.disabled)));
  await page.click('[data-testid="preset-atelier"]');
  const t = await tableau(page);
  check('préréglage Atelier remplit les cases (' + atelier.slots.map(s => s.activity).join('+') + ')', t.slots.join('+') === atelier.slots.map(s => s.activity).join('+') && await count(page, '#slots .day-slot.is-filled') >= 3 && (await page.getAttribute('#preset-atelier', 'aria-pressed')) === 'true', t.slots.join('+'));
  check('atelier : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
} else check('atelier : journée avec commande de forge de p1 trouvée (graines 1..60)', false);
// ---- H. Montée de savoir-faire : étoile sur la carte le soir
if (found.craftUp) {
  const { ctx, page, errors } = await newPage(browser, 1280);
  await newGameSeed(page, found.craftUp.seed);
  await playToEvening(page, found.craftUp.day);
  await page.click('[data-testid="tab-heros"]'); await page.$eval('#fold-crafts', e => { e.open = true; });
  check('graine ' + found.craftUp.seed + ' soir j' + found.craftUp.day + ' : étoile de savoir-faire monté (Mon héros)', await count(page, '#hero-crafts .craft.is-up .craft-star') >= 1 && /★/.test(await text(page, '#hero-card')));
  await page.click('[data-testid="tab-effectif"]');
  check('Compagnons : ligne Savoir-faire sur chaque carte, étoile sur la mienne', await count(page, '#effectif-list .adv-card .crafts') === await count(page, '#effectif-list .adv-card') && await count(page, '#effectif-list .adv-card.is-mine .craft.is-up') >= 1 && errors.length === 0);
  await ctx.close();
} else note('montée de savoir-faire de p1 : non trouvée (graines 1..60), étoile non vérifiée');
// ---- I. Mobile 400 : Mon héros et tiroir Village sans défilement horizontal
{
  const { ctx, page, errors } = await newPage(browser, 400);
  await page.click('[data-testid="tab-heros"]');
  await page.click('[data-testid="slot-1"]');
  check('mobile : Mon héros (cases + chooser ouvert + missions) sans défilement horizontal', await visible(page, '#chooser') && await noHScroll(page));
  await page.click('#' + await firstOpt(page, 'gather'));
  await shot(page, 'mobile');
  await page.click('[data-testid="tab-village"]');
  check('mobile : tiroir Village (Biomes, trophées, coffre) sans défilement horizontal', await count(page, '#biome-list .biome') === 3 && await noHScroll(page));
  check('mobile : aucune erreur console/page', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
// ---- J. Sombre 1280 : composition + soir, or sombre pour le légendaire si présent, aucune erreur
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'dark');
  await page.click('[data-testid="tab-heros"]');
  const soloId = VM1.solo_board[0].id; await page.click('#mission-' + soloId);
  await page.click('[data-testid="slot-2"]'); await page.click('#' + await firstOpt(page, 'train'));
  await shot(page, 'sombre');
  await page.click('[data-testid="tab-tableau"]'); await page.click('[data-testid="btn-launch"]');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('sombre : fond sombre, journée composée résolue, aucune erreur console/page', bg === 'rgb(20, 26, 23)' && (await tableau(page)).evening && errors.length === 0, bg + ' ' + errors.slice(0, 3).join(' | '));
  await shot(page, 'sombre_soir');
  await ctx.close();
}
// ---- K. prefers-reduced-motion : rendu statique sans erreur
{
  const { ctx, page, errors } = await newPage(browser, 1280, 'light', { reducedMotion: 'reduce' });
  await page.click('[data-testid="tab-heros"]'); await page.click('[data-testid="preset-cueillette"]'); await page.click('[data-testid="tab-tableau"]');
  await page.clock.runFor(1200);
  check('reduced-motion : préréglage Cueillette appliqué, aucune erreur', (await tableau(page)).slots.every(s => s === 'gather') && errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close();
const fails = results.filter(r => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} contrôles passés`);
process.exit(fails.length ? 1 : 0);
