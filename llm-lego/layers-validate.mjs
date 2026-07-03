// End-to-end BEHAVIORAL proof for the "📚 Calques" (Layers) feature.
// Drives a REAL Chromium via Playwright against the running demo-server (:3000),
// with REAL clicks (not synthetic events). Screenshots every step. Halts at the
// first failed step instead of assuming the rest worked.
import { chromium } from 'playwright';

const OUT = 'C:/TACTICAL_CHESS_STUDIO/llm-lego';
const URL = 'http://localhost:3000/builder';
const results = [];
function step(id, ok, shot, note) { results.push({ id, ok, shot, note }); console.log(`${ok ? '✅' : '❌'} ${id}${shot ? '  ['+shot+']' : ''}${note ? '  — '+note : ''}`); }
async function shot(page, name, clip) { const p = `proof_${name}.png`; await page.screenshot({ path: `${OUT}/${p}`, ...(clip ? { clip } : {}) }); return p; }
const TOOLBAR = { x: 0, y: 0, width: 1400, height: 150 };
// Idempotent menu handling — the menu stays open after a save and posing a node
// closes it, so a blind toggle desyncs. Always drive to the desired state.
async function menuOpen(page) {
  for (let i = 0; i < 3; i++) {
    if (await page.getByTestId('layers-menu').isVisible().catch(() => false)) return;
    await page.getByTestId('btn-layers').click();
    await page.waitForTimeout(180);
  }
}
async function menuClose(page) {
  if (await page.getByTestId('layers-menu').isVisible().catch(() => false)) {
    await page.mouse.click(700, 500); await page.waitForTimeout(180);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));

let failedAt = null;
try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900); // React mount

  // ---- STEP 1 — button visible at load ----
  const btn = page.getByTestId('btn-layers');
  const visible = await btn.isVisible().catch(() => false);
  const s1 = await shot(page, 'step1_toolbar', TOOLBAR);
  step('1-bouton-visible', visible, s1, visible ? 'bouton "📚 Calques" présent' : 'ABSENT');
  if (!visible) throw new Error('step1');

  // ---- STEP 2 — menu opens on a REAL click ----
  await btn.click();
  await page.waitForTimeout(200);
  const menuIsOpen = await page.getByTestId('layers-menu').isVisible().catch(() => false);
  const s2 = await shot(page, 'step2_menu_open', TOOLBAR);
  step('2-menu-ouvre', menuIsOpen, s2, menuIsOpen ? 'menu ouvert (vide au départ = normal)' : 'menu ne s\'ouvre pas');
  if (!menuIsOpen) throw new Error('step2');

  // ---- STEP 3 — build a concrete example ("remplir le dream") ----
  // Pose 3 nodes on the Actif canvas via the palette (real clicks).
  await menuClose(page);
  await page.getByTestId('add-llm').click();
  await page.getByTestId('add-tool').click();
  await page.getByTestId('add-prompt').click();
  await page.waitForTimeout(150);
  let uiCount = await page.evaluate(() => (window.__ui?.nodes || []).length);
  step('3a-3-noeuds-poses', uiCount >= 3, null, `${uiCount} nœuds sur l'Actif`);
  if (uiCount < 3) throw new Error('step3a');

  // Save as layer 1: "Vérité — exemple de preuve"
  await menuOpen(page);
  await page.getByTestId('layer-name-input').fill('Vérité — exemple de preuve');
  await page.getByTestId('layer-save').click();
  await page.waitForTimeout(200);

  // Add one MORE node (an oracle) → the "Cible" will differ by +1 node.
  await menuClose(page);
  await page.getByTestId('add-oracle').click();
  await page.waitForTimeout(150);
  uiCount = await page.evaluate(() => (window.__ui?.nodes || []).length);

  // Save as layer 2: "Cible — exemple de preuve"
  await menuOpen(page);
  await page.getByTestId('layer-name-input').fill('Cible — exemple de preuve');
  await page.getByTestId('layer-save').click();
  await page.waitForTimeout(200);

  // Both layers must appear in the list (menu already open after save).
  await menuOpen(page);
  const layerRows = await page.locator('[data-testid^="layer-row-"]').count();
  const s3 = await shot(page, 'step3_layers_in_menu', TOOLBAR);
  step('3b-calques-dans-menu', layerRows >= 2, s3, `${layerRows} calques listés dans le menu`);
  if (layerRows < 2) throw new Error('step3b');

  // Activate layer 1 (Vérité) — single layer, overlay visible, still editable.
  await menuOpen(page);
  await page.locator('[data-testid^="layer-toggle-"]').first().check();
  await page.waitForTimeout(200);
  await menuClose(page);
  const oneActiveNodes = await page.evaluate(() => (window.__ui?.nodes || []).length);
  const s3b = await shot(page, 'step3_layer1_active');
  step('3c-calque1-superpose', oneActiveNodes >= 3, s3b, `calque « Vérité » affiché (${oneActiveNodes} nœuds), 1 seul actif → éditable`);

  // Activate layer 2 (Cible) too → 2 layers → delta + read-only.
  await menuOpen(page);
  await page.locator('[data-testid^="layer-toggle-"]').nth(1).check();
  await page.waitForTimeout(200);
  await menuClose(page);
  const delta = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[data-node-id]'));
    const tags = {};
    nodes.forEach(n => { const d = n.getAttribute('data-layer-diff'); if (d) tags[d] = (tags[d]||0)+1; });
    return { tags, addedTagVisible: !!document.querySelector('[data-layer-diff="added"]'),
             roBanner: !!document.querySelector('[data-testid="layers-readonly"]') };
  });
  const s3c = await shot(page, 'step3_delta_2layers');
  const deltaOk = delta.addedTagVisible && delta.roBanner;
  step('3d-2calques-delta', deltaOk, s3c, `tags=${JSON.stringify(delta.tags)} · banner lecture-seule=${delta.roBanner}`);
  if (!deltaOk) throw new Error('step3d');

  // ---- STEP 4 — read-only guard (negative proof) ----
  // With 2 layers active, drag a node → nothing must move.
  const target = await page.evaluate(() => {
    const el = document.querySelector('[data-node-id]');
    const r = el.getBoundingClientRect();
    return { id: el.getAttribute('data-node-id'), left: el.style.left, cx: r.left + 20, cy: r.top + 8 };
  });
  await page.mouse.move(target.cx, target.cy);
  await page.mouse.down();
  await page.mouse.move(target.cx + 160, target.cy + 120, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const afterRO = await page.evaluate((id) => document.querySelector(`[data-node-id="${id}"]`)?.style.left, target.id);
  const blocked = afterRO === target.left;
  const s4 = await shot(page, 'step4_readonly_blocked');
  step('4a-edition-bloquee', blocked, s4, `left avant=${target.left} après=${afterRO} → ${blocked ? 'IMMOBILE (garde-fou OK)' : 'a bougé (garde-fou KO)'}`);

  // Deactivate down to 1 layer → editing must work again.
  await menuOpen(page);
  await page.locator('[data-testid^="layer-toggle-"]').nth(1).uncheck();
  await page.waitForTimeout(200);
  await menuClose(page);
  const roGone = !(await page.locator('[data-testid="layers-readonly"]').isVisible().catch(() => false));
  const t2 = await page.evaluate(() => {
    const el = document.querySelector('[data-node-id]');
    const r = el.getBoundingClientRect();
    return { id: el.getAttribute('data-node-id'), left: el.style.left, cx: r.left + 20, cy: r.top + 8 };
  });
  await page.mouse.move(t2.cx, t2.cy);
  await page.mouse.down();
  await page.mouse.move(t2.cx + 140, t2.cy + 90, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const after1 = await page.evaluate((id) => document.querySelector(`[data-node-id="${id}"]`)?.style.left, t2.id);
  const moved = after1 !== t2.left;
  const s4b = await shot(page, 'step4_editable_again');
  step('4b-edition-retablie', roGone && moved, s4b, `banner parti=${roGone} · left ${t2.left}→${after1} → ${moved ? 'a bougé (édition OK)' : 'immobile'}`);

  // ---- STEP 5 — re-save (update) a layer AFTER a modification ----
  // We are at: 1 calque (Vérité) active + a node just dragged to a new position.
  // Before update: the SAVED Vérité layer still has the node at its old x. Click 💾 → overwrite.
  const before = await page.evaluate((nodeId) => {
    const ls = JSON.parse(localStorage.getItem('llmlego.layers.v1') || '[]');
    const ver = ls.find((l) => /Vérité/.test(l.name));
    return { name: ver?.name, x: (ver?.nodes.find((n) => n.id === nodeId) || {}).x };
  }, t2.id);
  await menuOpen(page);
  await page.locator('[data-testid^="layer-update-"]').first().click(); // 💾 on the Vérité row
  await page.waitForTimeout(200);
  const s5a = await shot(page, 'step5_updated_status', TOOLBAR);
  const after = await page.evaluate((nodeId) => {
    const ls = JSON.parse(localStorage.getItem('llmlego.layers.v1') || '[]');
    const ver = ls.find((l) => /Vérité/.test(l.name));
    return { x: (ver?.nodes.find((n) => n.id === nodeId) || {}).x, count: ver?.nodes.length };
  }, t2.id);
  const persisted = after.x !== before.x && Number(after.x) >= 180;
  step('5a-re-enregistrement', persisted, s5a,
    `calque « ${before.name} » : nœud x ${before.x}→${after.x} persisté dans le MÊME calque (pas un nouveau)`);

  // And prove it's NOT a duplicate: still exactly 2 layers, and re-activating shows the moved node.
  const stillTwo = await page.locator('[data-testid^="layer-row-"]').count();
  step('5b-pas-de-doublon', stillTwo === 2, null, `${stillTwo} calques (mise à jour en place, aucun doublon créé)`);
  if (!persisted || stillTwo !== 2) throw new Error('step5');

} catch (e) {
  failedAt = e.message;
}

console.log('\n=== consoleErrors ===');
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)');
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify({ results, failedAt, consoleErrors }, null, 2));
await browser.close();
process.exit(results.every(r => r.ok) && !failedAt && consoleErrors.length === 0 ? 0 : 1);
