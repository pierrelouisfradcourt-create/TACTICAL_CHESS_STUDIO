// copypaste-validate.mjs — Copier/coller de blocs (Ctrl+C / Ctrl+V), Actif + Sandbox.
// Prouve : copie d'une sélection multiple (réutilise selectedIds/marquee) + edges internes,
// collage avec NOUVEAUX ids (idSeq partagé) + offset visuel, collage CROSS-ZONE (copie
// Actif → colle Sandbox), et copie d'un Agent composite (satellites + card edges + parentId
// remappé). Aucun write library (lecture seule) — compatible run-validators (BASE fourni)
// ou standalone (self-launch sur port isolé).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SELF = !process.env["BASE"];
const PORT = process.env["LEGO_CP_PORT"] ?? "3214";
const BASE = process.env["BASE"] ?? `http://localhost:${PORT}`;
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function ready(ms = 25000) { const dl = Date.now() + ms; while (Date.now() < dl) { try { const r = await fetch(`${BASE}/api/library`); if (r.ok) return true; } catch {} await wait(200); } return false; }

let server = null, serverErr = "";
if (SELF) { server = spawn(process.execPath, ["demo-server.ts"], { cwd: __dirname, env: { ...process.env, PORT }, stdio: ["ignore", "pipe", "pipe"] }); server.stderr.on("data", (d) => (serverErr += d)); server.stdout.on("data", () => {}); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1520, height: 980 } });
page.on("dialog", (d) => d.accept());
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

const lastNodeId = () => page.evaluate(() => window.__ui.nodes[window.__ui.nodes.length - 1].id);
const edgeCount = () => page.evaluate(() => window.__ui.edges.length);
const zones = () => page.evaluate(() => window.__zones());
async function dragNodeTo(id, tx, ty) {
  const b = await page.locator(`[data-node-id="${id}"] .nbody`).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 12 }); await page.mouse.up(); await wait(100);
}
async function drawEdge(from, to, fromSide, toSide) {
  const before = await edgeCount();
  const hf = await page.locator(`[data-handle-node="${from}"][data-handle-side="${fromSide}"]`).boundingBox();
  const ht = await page.locator(`[data-handle-node="${to}"][data-handle-side="${toSide}"]`).boundingBox();
  await page.mouse.move(hf.x + hf.width / 2, hf.y + hf.height / 2);
  await page.mouse.down();
  await page.mouse.move(hf.x + hf.width / 2 + 15, hf.y + hf.height / 2, { steps: 3 });
  await page.mouse.move(ht.x + ht.width / 2, ht.y + ht.height / 2, { steps: 12 });
  await page.mouse.up(); await wait(100);
  return (await edgeCount()) > before;
}

try {
  if (SELF && !(await ready())) throw new Error("server not ready\n" + serverErr);
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-llm"]', { timeout: 20000 });

  // ═══ 1) Copie d'une sélection multiple reliée (Actif) ═══════════════════════
  await page.getByTestId("btn-clear").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 0);
  await page.getByTestId("add-llm").click(); const a = await lastNodeId(); await dragNodeTo(a, 260, 250);
  await page.getByTestId("add-llm").click(); const b = await lastNodeId(); await dragNodeTo(b, 460, 250);
  await page.getByTestId("add-llm").click(); const c = await lastNodeId(); await dragNodeTo(c, 660, 250);
  await drawEdge(a, b, "right", "left");
  await drawEdge(b, c, "right", "left");
  const edges0 = await edgeCount();
  check("setup: 3 nœuds reliés (2 edges internes)", edges0 === 2);
  // marquee pour sélectionner les 3
  await page.mouse.move(200, 150); await page.mouse.down(); await page.mouse.move(820, 340, { steps: 16 }); await page.mouse.up();
  const sel = await page.evaluate(() => window.__ui.selectedIds);
  check("sélection multiple (marquee) = 3 nœuds", sel.length === 3);
  // Ctrl+C réel
  await page.keyboard.press("Control+c");
  const clip = await page.evaluate(() => window.__clipboard());
  check("Ctrl+C : presse-papier = 3 nœuds + 2 edges internes", clip && clip.nodes.length === 3 && clip.edges.length === 2);

  // ═══ 2) Collage (Actif) — nouveaux ids, offset, edges internes préservés ════
  const beforePaste = await page.evaluate(() => window.__zones().active.nodes.map((n) => n.id));
  await page.keyboard.press("Control+v");
  await wait(200);
  const az = (await zones()).active;
  check("Ctrl+V : 6 nœuds sur l'Actif (3 originaux + 3 collés)", az.nodes.length === 6);
  const pasted = az.nodes.filter((n) => !beforePaste.includes(n.id));
  check("collage : 3 nouveaux nœuds avec NOUVEAUX ids", pasted.length === 3 && pasted.every((n) => !beforePaste.includes(n.id)));
  check("collage : 4 edges (2 originaux + 2 internes collés)", az.edges.length === 4);
  const pastedIds = new Set(pasted.map((n) => n.id));
  const pastedEdges = az.edges.filter((e) => pastedIds.has(e.from) && pastedIds.has(e.to));
  check("collage : edges internes préservés entre nœuds collés (2)", pastedEdges.length === 2);
  // offset : chaque nœud collé décalé de +30/+30 vs un original (topologie identique)
  const orig = az.nodes.filter((n) => beforePaste.includes(n.id)).sort((p, q) => p.x - q.x);
  const past = pasted.slice().sort((p, q) => p.x - q.x);
  const offsetOk = past.every((n, i) => Math.round(n.x - orig[i].x) === 30 && Math.round(n.y - orig[i].y) === 30);
  check("collage : offset visuel +30/+30 appliqué", offsetOk);
  check("collage : nœuds collés sélectionnés (selectedIds)", (await page.evaluate(() => window.__ui.selectedIds)).length === 3);

  // ═══ 3) Cross-zone : copie faite dans l'Actif, collée dans le Sandbox ═══════
  // focus le Sandbox (clic sur sa zone vide → onActivate) puis Ctrl+V
  const sandboxPane = page.locator('.split-pane').last();
  const sb = await sandboxPane.boundingBox();
  await page.mouse.click(sb.x + sb.width / 2, sb.y + sb.height - 40);
  await wait(150);
  const focusedNow = (await zones()).focused;
  check("focus basculé sur le Sandbox", focusedNow === "sandbox");
  await page.keyboard.press("Control+v");
  await wait(200);
  const z = await zones();
  check("cross-zone : 3 nœuds collés dans le Sandbox (copie venue de l'Actif)", z.sandbox.nodes.length === 3);
  const sIds = new Set(z.sandbox.nodes.map((n) => n.id));
  check("cross-zone : 2 edges internes préservés dans le Sandbox", z.sandbox.edges.filter((e) => sIds.has(e.from) && sIds.has(e.to)).length === 2);
  const aIds = new Set(z.active.nodes.map((n) => n.id));
  check("cross-zone : ids uniques entre zones (aucun id partagé Actif/Sandbox)", [...sIds].every((id) => !aIds.has(id)));

  // ═══ 4) Agent composite : satellites + card edges + parentId remappé ════════
  // re-focus Actif
  const activePane = page.locator('.split-pane').first();
  const ab = await activePane.boundingBox();
  await page.mouse.click(ab.x + ab.width / 2, ab.y + 30);
  await page.getByTestId("btn-clear").click();
  await page.waitForFunction(() => (window.__ui?.nodes || []).length === 0);
  await page.getByTestId("add-agent").click();
  await page.getByTestId("import-empty").click().catch(() => {});
  await wait(150);
  const compBefore = await page.evaluate(() => { const ns = window.__ui.nodes; const central = ns.find((n) => n.type === "agent"); const sats = ns.filter((n) => n.type === "agent-component"); return { centralId: central?.id, sats: sats.length, ids: ns.map((n) => n.id) }; });
  check("setup: Agent composite = 1 central + 8 satellites", compBefore.sats === 8);
  // Sélectionner le central (clic DOM) — copySelection étend AUTOMATIQUEMENT aux satellites.
  await page.locator(`[data-node-id="${compBefore.centralId}"]`).click({ position: { x: 8, y: 8 } });
  await wait(120);
  await page.keyboard.press("Control+c");
  const clipC = await page.evaluate(() => window.__clipboard());
  check("composite : Ctrl+C capture le composite ENTIER (9 nœuds + 8 card edges)", clipC && clipC.nodes.length === 9 && clipC.edges.length === 8);
  await page.keyboard.press("Control+v");
  await wait(250);
  const azc = (await zones()).active;
  check("composite collé : 18 nœuds (2 agents + 16 satellites)", azc.nodes.filter((n) => n.type === "agent").length === 2 && azc.nodes.filter((n) => n.type === "agent-component").length === 16);
  const newAgents = azc.nodes.filter((n) => n.type === "agent" && !compBefore.ids.includes(n.id));
  check("composite collé : nouvel agent central avec nouvel id", newAgents.length === 1);
  const newAid = newAgents[0]?.id;
  const newSats = azc.nodes.filter((n) => n.type === "agent-component" && n.data.parentId === newAid);
  check("composite collé : 8 satellites repointent vers le NOUVEAU parentId (remap)", newSats.length === 8);
  const cardEdges = azc.edges.filter((e) => e.from === newAid && e._cardEdge);
  check("composite collé : 8 card edges remappés vers le nouvel agent", cardEdges.length === 8);
  const oldAid = compBefore.centralId;
  check("composite collé : aucun satellite collé ne pointe encore vers l'ancien agent", !azc.nodes.some((n) => n.type === "agent-component" && n.data.parentId === oldAid && !compBefore.ids.includes(n.id)));

  check("aucune erreur console pendant la passe", consoleErrors.length === 0);
  if (consoleErrors.length) log("console errors: " + consoleErrors.slice(0, 3).join(" | "));

  out.pass = !out.failed;
  log(out.pass ? "\n=== ALL COPY/PASTE CHECKS PASSED ===" : `\n=== FAILED at: ${out.failed} ===`);
} catch (e) {
  out.error = String(e && e.stack ? e.stack : e);
  log("EXCEPTION: " + out.error);
} finally {
  await page.screenshot({ path: path.join(__dirname, "builder_copypaste.png"), fullPage: false }).catch(() => {});
  await browser.close();
  if (server) { server.kill(); await wait(500); }
  writeFileSync(path.join(__dirname, "copypaste_validation_result.json"), JSON.stringify(out, null, 2), "utf-8");
  process.exit(out.pass ? 0 : 1);
}
