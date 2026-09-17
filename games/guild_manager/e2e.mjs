// guild_manager — E2E click-through réel (Playwright/Chromium) : démarre le
// serveur, ouvre la page, envoie de VRAIS clics sur les boutons rendus et
// observe window.__game (état réel de la page). Vérifie que la composition
// index.html → input → guild → render est câblée (ce que logic/solvability ne
// voient pas puisqu'ils pilotent guild.mjs directement).
// Usage : node e2e.mjs   (HEADED=1 pour voir le navigateur)
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const PORT = 4731;
const URL = `http://localhost:${PORT}/`;

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, 'server.mjs')], {
    env: { ...process.env, GUILD_PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolvePromise, reject) => {
    const t = setTimeout(() => reject(new Error('serveur trop long à démarrer')), 8000);
    proc.stdout.on('data', (d) => { if (String(d).includes('interface jouable')) { clearTimeout(t); resolvePromise(proc); } });
    proc.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
    proc.on('exit', (c) => reject(new Error('serveur a quitté, code ' + c)));
  });
}

async function runE2ETests() {
  const results = { oracle: 'e2e', tests: [], verdict: 'FAIL' };
  let srv, browser;
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (err) {
    console.log('E2E FAIL: playwright indisponible —', err.message);
    return results;
  }
  try {
    srv = await startServer();
    browser = await chromium.launch({ headless: !process.env.HEADED, args: ['--disable-gpu'] });
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', (e) => { pageErrors.push(e.message); console.log('PAGEERROR:', e.message); });
    page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE.ERROR:', m.text()); });

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && typeof window.__game.day === 'number', null, { timeout: 8000 });

    // (1) API + rendu initial
    const t1 = await page.evaluate(() => ({
      day: window.__game.day, gold: window.__game.gold,
      hudDay: document.querySelector('#hud-day').textContent, cards: document.querySelectorAll('.card.adv').length,
    }));
    results.tests.push({ test: 'initial_render', pass: t1.day === 1 && t1.hudDay === '1' && t1.cards === 3, ...t1 });

    // (2) clic réel "Fin de journée" → jour 2 dans l'état ET dans le HUD
    await page.click('#endday');
    const t2 = await page.evaluate(() => ({ day: window.__game.day, hud: document.querySelector('#hud-day').textContent }));
    results.tests.push({ test: 'end_day_click', pass: t2.day === 2 && t2.hud === '2', ...t2 });

    // (3) taverne : clic Recruter → roster +1, or décrémenté
    await page.click('[data-tab="tavern"]');
    const goldBefore = await page.evaluate(() => window.__game.gold);
    const recruitBtn = await page.$('[data-action="recruit"]:not([disabled])');
    if (recruitBtn) await recruitBtn.click();
    const t3 = await page.evaluate(() => ({ roster: window.__game.state.roster.length, gold: window.__game.gold, cards: document.querySelectorAll('.card.adv').length }));
    results.tests.push({ test: 'recruit_click', pass: Boolean(recruitBtn) && t3.roster === 4 && t3.cards === 4 && t3.gold < goldBefore, ...t3 });

    // (4) composition : Composer sur une mission solo → cocher un aventurier → Envoyer
    await page.click('[data-tab="missions"]');
    const soloBtn = await page.$('.card.mission.solo [data-action="compose"]');
    if (soloBtn) await soloBtn.click();
    const check = await page.$('.card.adv.available [data-action="toggle-select"]');
    if (check) await check.click();
    const chance = await page.evaluate(() => document.querySelector('#composer-chance')?.textContent || '');
    const sendBtn = await page.$('[data-action="send"]:not([disabled])');
    if (sendBtn) await sendBtn.click();
    const t4 = await page.evaluate(() => ({ active: window.__game.state.active.length, onMission: window.__game.state.roster.filter((a) => a.status === 'mission').length }));
    results.tests.push({ test: 'compose_and_send_click', pass: Boolean(soloBtn && check && sendBtn) && t4.active === 1 && t4.onMission === 1, chance, ...t4 });

    // (4b) boutique : « Acheter et équiper » via le select → or débité, objet porté
    await page.click('[data-tab="shop"]');
    const sel = await page.$('select[data-action="buy-equip"]');
    let t4b = { pass: false };
    if (sel) {
      const info = await sel.evaluate((el) => ({ item: Number(el.dataset.id), adv: Number(el.options[1].value) }));
      const goldPre = await page.evaluate(() => window.__game.gold);
      await sel.selectOption(String(info.adv));
      t4b = await page.evaluate(({ item, adv, goldPre }) => {
        const a = window.__game.state.roster.find((x) => x.id === adv);
        const worn = Object.values(a.equipment).some((it) => it && it.id === item);
        return { pass: worn && window.__game.gold < goldPre, worn, gold: window.__game.gold, goldPre, msg: document.querySelector('#message').textContent };
      }, { ...info, goldPre });
    }
    results.tests.push({ test: 'buy_and_equip_select', ...t4b });

    // (4c) changement de classe de base via le select → classe active changée, niveau conservé
    const cls = await page.$('select[data-action="switch-class"]');
    let t4c = { pass: false };
    if (cls) {
      const info = await cls.evaluate((el) => ({ adv: Number(el.dataset.id), target: [...el.options].find((o) => o.value && !o.disabled)?.value }));
      if (info.target) {
        await cls.selectOption(info.target);
        t4c = await page.evaluate(({ adv, target }) => {
          const a = window.__game.state.roster.find((x) => x.id === adv);
          return { pass: a.classKey === target && Object.keys(a.classLevels).length === 2, classKey: a.classKey, levels: a.classLevels };
        }, info);
      }
    }
    results.tests.push({ test: 'switch_class_select', ...t4c });

    // (4d) fiche de perso : clic sur le nom → fiche ouverte, « Équiper » depuis la fiche, fermeture
    await page.click('[data-tab="shop"]');
    const invBtn = await page.$('[data-action="buy"]:not([disabled])');
    if (invBtn) await invBtn.click(); // un objet en inventaire
    const nameBtn = await page.$('.card.adv.available [data-action="open-sheet"]');
    let t4d = { pass: false };
    if (nameBtn) {
      await nameBtn.click();
      const opened = await page.evaluate(() => !document.querySelector('#sheet').classList.contains('hidden') && Boolean(window.__game.ui.sheet));
      const eqBtn = await page.$('#sheet [data-action="equip-from-sheet"]');
      let equipped = null;
      if (eqBtn) {
        const info = await eqBtn.evaluate((el) => ({ adv: Number(el.dataset.id), item: Number(el.dataset.item) }));
        await eqBtn.click();
        equipped = await page.evaluate(({ adv, item }) => Object.values(window.__game.state.roster.find((a) => a.id === adv).equipment).some((it) => it && it.id === item), info);
      }
      await page.click('#sheet [data-action="close-sheet"]');
      const closed = await page.evaluate(() => document.querySelector('#sheet').classList.contains('hidden'));
      t4d = { pass: opened && closed && equipped !== false, opened, closed, equipped };
    }
    results.tests.push({ test: 'character_sheet', ...t4d });

    // (4e) guilde : améliorer un bâtiment (or garanti pour la mise en place)
    await page.evaluate(() => { window.__game.state.gold = 1200; });
    await page.click('[data-tab="guild"]');
    const upBtn = await page.$('[data-action="upgrade"]:not([disabled])');
    const goldUp = await page.evaluate(() => window.__game.gold);
    if (upBtn) await upBtn.click();
    const t4e = await page.evaluate((goldUp) => ({ pass: Object.values(window.__game.state.buildings).some((l) => l > 0) && window.__game.gold < goldUp, buildings: window.__game.state.buildings }), goldUp);
    results.tests.push({ test: 'upgrade_building_click', ...t4e });

    // (4f) fenêtre d'inventaire du personnage : achat, « Équiper au mieux »,
    // changement de métier depuis la fiche.
    // Or garanti pour la mise en place (le reste du scénario passe par l'UI).
    await page.evaluate(() => { window.__game.state.gold = 5000; });
    await page.click('[data-tab="guild"]');
    await page.click('[data-tab="shop"]');
    for (let i = 0; i < 3; i++) { const btn = await page.$('[data-action="buy"]:not([disabled])'); if (btn) await btn.click(); }
    const sheetBtn = await page.$('.card.adv.available [data-action="open-sheet"]');
    let t4f = { pass: false };
    if (sheetBtn) {
      await sheetBtn.click();
      const advId = await page.evaluate(() => window.__game.ui.sheet);
      // Le sac ne contient pas forcément une arme compatible : on bascule le
      // filtre pour que la fenêtre liste tout, ce qui teste aussi le filtre.
      const fitRows = await page.evaluate(() => document.querySelectorAll('#sheet .invrow').length);
      if (fitRows === 0) await page.click('#sheet [data-action="inv-filter"]');
      const diag = await page.evaluate(() => ({
        items: window.__game.state.inventory.length,
        rows: document.querySelectorAll('#sheet .invrow').length,
        status: (window.__game.state.roster.find((a) => a.id === window.__game.ui.sheet) || {}).status,
      }));
      const hasInv = diag.rows > 0;
      const equippedBefore = await page.evaluate((id) => Object.values(window.__game.state.roster.find((x) => x.id === id).equipment).filter(Boolean).length, advId);
      const optBtn = await page.$('#sheet [data-action="optimize"]');
      if (optBtn) await optBtn.click();
      const after = await page.evaluate((id) => ({
        equipped: Object.values(window.__game.state.roster.find((x) => x.id === id).equipment).filter(Boolean).length,
        msg: document.querySelector('#message').textContent,
      }), advId);
      const equipped = after.equipped >= equippedBefore && /équipé|Rien de mieux/.test(after.msg);
      const craftSel = await page.$('#sheet select[data-action="set-craft"]');
      let craftChanged = false;
      if (craftSel) {
        const target = await craftSel.evaluate((el) => [...el.options].find((o) => !o.selected).value);
        await craftSel.selectOption(target);
        craftChanged = await page.evaluate(({ id, target }) => window.__game.state.roster.find((x) => x.id === id).craft === target, { id: advId, target });
      }
      await page.click('#sheet [data-action="close-sheet"]');
      t4f = { pass: hasInv && equipped && craftChanged, hasInv, equipped, craftChanged, msg: after.msg, ...diag };
    }
    results.tests.push({ test: 'character_inventory_and_craft', ...t4f });

    // (5) régisseur : un clic joue une journée complète
    await page.click('[data-action="botday"]');
    const t5 = await page.evaluate(() => window.__game.day);
    results.tests.push({ test: 'bot_day_click', pass: t5 === 3, day: t5 });

    // (6) nouvelle partie remet l'état à zéro
    await page.click('[data-action="newgame"]');
    const t6 = await page.evaluate(() => ({ day: window.__game.day, roster: window.__game.state.roster.length }));
    results.tests.push({ test: 'new_game_click', pass: t6.day === 1 && t6.roster === 3, ...t6 });

    // (7) rejeu animé : envoyer une mission, terminer la journée → le rejeu
    // s'ouvre tout seul ; ⏭ Fin affiche le bilan ; ✕ referme.
    await page.click('[data-tab="missions"]');
    const compose2 = await page.$('.card.mission.solo [data-action="compose"]');
    if (compose2) await compose2.click();
    const pick2 = await page.$('.card.adv.available [data-action="toggle-select"]');
    if (pick2) await pick2.click();
    const send2 = await page.$('[data-action="send"]:not([disabled])');
    if (send2) await send2.click();
    let replayOpen = false;
    for (let i = 0; i < 3 && !replayOpen; i++) {
      await page.click('#endday');
      replayOpen = await page.evaluate(() => !document.querySelector('#replay').classList.contains('hidden'));
    }
    let cards = 0, result = false, closed = false;
    if (replayOpen) {
      cards = await page.evaluate(() => document.querySelectorAll('#replay .rp-card').length);
      await page.click('[data-rp="skip"]');
      result = await page.evaluate(() => {
        const el = document.querySelector('#rp-result');
        return Boolean(el) && !el.classList.contains('hidden') && /RÉUSSIE|ÉCHOUÉE/.test(el.textContent);
      });
      await page.click('#rp-result [data-rp="close"]');
      closed = await page.evaluate(() => document.querySelector('#replay').classList.contains('hidden'));
    }
    results.tests.push({ test: 'combat_replay', pass: replayOpen && cards >= 2 && result && closed, replayOpen, cards, result, closed });

    // (8) portraits et traits visibles sur les cartes d'aventurier
    const t8 = await page.evaluate(() => ({
      portraits: document.querySelectorAll('#roster svg.pf').length,
      traits: document.querySelectorAll('#roster .tr').length,
    }));
    results.tests.push({ test: 'portraits_and_traits', pass: t8.portraits >= 2 && t8.traits >= 1, ...t8 });

    // (9) races et métiers affichés sur les cartes
    const t9 = await page.evaluate(() => ({
      races: document.querySelectorAll('#roster .race').length,
      crafts: document.querySelectorAll('#roster .craft').length,
    }));
    results.tests.push({ test: 'races_and_crafts_shown', pass: t9.races >= 3 && t9.crafts >= 3, ...t9 });

    // (10) escouades : renommage, mise en réserve, retour dans l'escouade
    await page.click('[data-tab="squads"]');
    const nameInput = await page.$('.sqname');
    let t10 = { pass: false };
    if (nameInput) {
      await nameInput.fill('Les Lames');
      await nameInput.dispatchEvent('change');
      const renamed = await page.evaluate(() => window.__game.state.squads[0].name === 'Les Lames');
      const memberSel = await page.$('.squad .member select[data-action="assign"]');
      let moved = false, back = false;
      if (memberSel) {
        const advId = await memberSel.evaluate((el) => Number(el.dataset.id));
        await memberSel.selectOption('reserve');
        moved = await page.evaluate((id) => !window.__game.state.squads.some((sq) => sq.members.includes(id)), advId);
        const reserveSel = await page.$('.squad.queue .member select[data-action="assign"]');
        if (reserveSel) {
          const squadId = await page.evaluate(() => String(window.__game.state.squads[0].id));
          await reserveSel.selectOption(squadId);
          back = await page.evaluate((id) => window.__game.state.squads[0].members.includes(id), advId);
        }
      }
      const compo = await page.evaluate(() => document.querySelectorAll('.squad .rtag').length);
      // rang des escouades et file d'entraînement visibles
      const structure = await page.evaluate(() => ({
        ranks: document.querySelectorAll('.squad .rankbadge').length,
        queue: Boolean(document.querySelector('.squad.queue')),
        main: (document.querySelector('.squad.rank0 .rankbadge') || {}).textContent || '',
      }));
      t10 = { pass: renamed && moved && back && compo > 0 && structure.ranks >= 2 && structure.queue && /Principale/.test(structure.main), renamed, moved, back, compo, ...structure };
    }
    results.tests.push({ test: 'squad_management', ...t10 });

    // (11) choix des compétences depuis la fiche
    const skillSheetBtn = await page.$('.squad .member [data-action="open-sheet"]');
    let t11 = { pass: false };
    if (skillSheetBtn) {
      await skillSheetBtn.click();
      const advId = await page.evaluate(() => window.__game.ui.sheet);
      const before = await page.evaluate((id) => window.__game.state.roster.find((a) => a.id === id).loadout, advId);
      const box = await page.$('#sheet input[data-action="toggle-skill"]:checked');
      let changed = false, count = 0, passives = 0;
      if (box) {
        await box.click();   // clic simple : le re-rendu détache l’élément juste après
        const after = await page.evaluate((id) => window.__game.state.roster.find((a) => a.id === id).loadout, advId);
        changed = before === null && Array.isArray(after);
        count = await page.evaluate(() => document.querySelectorAll('#sheet .skrow').length);
        passives = await page.evaluate(() => document.querySelectorAll('#sheet .skrow.pass').length);
      }
      await page.click('#sheet [data-action="reset-skills"]');
      const reset = await page.evaluate((id) => window.__game.state.roster.find((a) => a.id === id).loadout === null, advId);
      await page.click('#sheet [data-action="close-sheet"]');
      t11 = { pass: changed && reset && count === 3 && passives >= 1, changed, reset, rows: count, passives };
    }
    results.tests.push({ test: 'skill_loadout', ...t11 });

    // (12) envoi d'une escouade entière sur une mission
    await page.click('[data-tab="missions"]');
    const squadBtn = await page.$('[data-action="send-squad"]:not([disabled])');
    let t12 = { pass: false };
    if (squadBtn) {
      const activeBefore = await page.evaluate(() => window.__game.state.active.length);
      await squadBtn.click();
      const t = await page.evaluate((n) => ({ active: window.__game.state.active.length, grew: window.__game.state.active.length > n }), activeBefore);
      t12 = { pass: t.grew, ...t };
    }
    results.tests.push({ test: 'send_squad', ...t12 });

    // (13) file d'entraînement : un solo progresse puis intègre une escouade
    await page.evaluate(() => {
      const s = window.__game.state;
      s.gold = 100000;
      // on vide l'escouade pour envoyer tout le monde en file
      s.squads[0].members = [];
    });
    await page.click('[data-tab="squads"]');
    const queued = await page.evaluate(() => document.querySelectorAll('.squad.queue .member').length);
    // 30 jours passés via l'API : ce qui est testé ici, c'est la file, pas le bouton.
    for (let i = 0; i < 30; i++) await page.evaluate(() => window.__game.endDay());
    const replayOpenNow = await page.$('#replay [data-rp="close"]');
    if (replayOpenNow) await replayOpenNow.click();
    await page.click('[data-tab="squads"]');
    const readyBefore = await page.evaluate(() => document.querySelectorAll('.squad.queue .member.ready').length);
    const fillBtn = await page.$('[data-action="fill-squads"]');
    if (fillBtn) await fillBtn.click();
    const t13 = await page.evaluate((queuedCount) => ({
      queued: queuedCount,
      placed: window.__game.state.squads[0].members.length,
    }), queued);
    results.tests.push({ test: 'training_queue', pass: t13.queued >= 1 && readyBefore >= 1 && t13.placed >= 1, readyBefore, ...t13 });

    // (14) chaîne d'éveil, guilde rivale et bestiaire
    await page.click('[data-tab="missions"]');
    const t14a = await page.evaluate(() => ({
      chain: Boolean(document.querySelector('.card.chain')),
      frags: document.querySelectorAll('.card.chain .frag').length,
      rival: (document.querySelector('.card.rival b') || {}).textContent || '',
    }));
    await page.click('[data-tab="bestiary"]');
    const t14b = await page.evaluate(() => ({
      rows: document.querySelectorAll('.bestrow').length,
      known: document.querySelectorAll('.bestrow:not(.unknown)').length,
      bosses: document.querySelectorAll('.bestrow.boss').length,
    }));
    results.tests.push({
      test: 'attunement_rival_bestiary',
      pass: t14a.chain && t14a.frags === 3 && /Corbeau/.test(t14a.rival) && t14b.rows >= 15 && t14b.known >= 1 && t14b.bosses === 5,
      ...t14a, ...t14b,
    });

    results.tests.push({ test: 'no_page_errors', pass: pageErrors.length === 0, errors: pageErrors });
    results.verdict = results.tests.every((t) => t.pass) ? 'PASS' : 'FAIL';
  } catch (err) {
    console.log('E2E ERREUR:', err.message);
    results.tests.push({ test: 'harness', pass: false, error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (srv) srv.kill('SIGTERM');
  }
  return results;
}

const results = await runE2ETests();
for (const t of results.tests) console.log(`${t.pass ? '✓' : '✗'} ${t.test}: ${JSON.stringify(t)}`);
console.log(`\nRESULT: ${results.verdict}`);
process.exit(results.verdict === 'PASS' ? 0 : 1);
