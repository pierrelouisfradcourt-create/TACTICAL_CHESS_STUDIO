// p3_alpha — E2E click-through réel (Playwright/Chromium) : démarre le
// serveur, ouvre la page, envoie de vrais clics souris sur le canvas, observe
// window.__game, vérifie R1 (gain au clic exact), R2/R6 (achat de générateur
// -> production passive RÉELLEMENT connectée à l'affichage — la régression
// que les oracles logic/solvability ne peuvent PAS voir puisqu'ils pilotent
// GameEngine directement sans jamais passer par la composition d'index.html),
// et R14 (nouvelle partie).
//
// Usage : node e2e.mjs   (headless par défaut ; HEADED=1 pour voir le navigateur)
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const PORT = 4711;
const URL = `http://localhost:${PORT}/`;

// Layout constants mirrored from render.mjs (canvas 800x600) — used to click
// on real screen pixels, not to call APIs directly.
const CANVAS_W = 800, CANVAS_H = 600;
const CORE = { x: CANVAS_W / 2, y: CANVAS_H / 2 - 80 };
const G1_CARD = { x: CANVAS_W / 2 - 220 + 55, y: 300 + 60 + 30 }; // center of first generator card

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, "server.mjs")], {
    env: { ...process.env, P3ALPHA_PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolvePromise, reject) => {
    const t = setTimeout(() => reject(new Error("serveur trop long à démarrer")), 8000);
    proc.stdout.on("data", (d) => {
      if (String(d).includes("interface jouable")) { clearTimeout(t); resolvePromise(proc); }
    });
    proc.stderr.on("data", (d) => process.stderr.write("[srv] " + d));
    proc.on("exit", (c) => reject(new Error("serveur a quitté, code " + c)));
  });
}

async function clickCanvasAt(page, canvas, x, y) {
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + x, box.y + y);
}

async function runE2ETests() {
  const results = { oracle: "e2e", tests: [], verdict: "FAIL" };
  const log = [];
  let srv, browser;

  try {
    srv = await startServer();
    browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-gpu"] });
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERROR:", m.text()); });

    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__game && typeof window.__game.solde_mR === "number", null, { timeout: 8000 });
    const canvas = await page.$("#gameCanvas");

    // --- (1) window.__game API exists ---
    const apiCheck = await page.evaluate(() => {
      const required = ["solde_mR", "cumul_mR", "tick_count", "clickCore", "buyGenerator", "newGame", "reset"];
      return required.filter((k) => !(k in window.__game));
    });
    const t1 = { test: "window_game_api_exists", pass: apiCheck.length === 0, missing: apiCheck };
    results.tests.push(t1);
    log.push(`(1) window.__game API: ${t1.pass ? "OK" : "MISSING " + apiCheck.join(",")}`);
    if (!t1.pass) throw new Error("window.__game API incomplete: " + apiCheck.join(","));

    // --- (2) R1: N real mouse clicks on the core -> solde_mR == N * 1000 mR EXACTLY.
    //     Also the regression test for the per-frame `{once:true}` listener leak:
    //     if listeners stacked across frames, spaced-out clicks would over-count.
    const before2 = await page.evaluate(() => window.__game.solde_mR);
    const N_CLICKS = 5;
    for (let i = 0; i < N_CLICKS; i++) {
      await clickCanvasAt(page, canvas, CORE.x, CORE.y);
      await page.waitForTimeout(150); // let several rAF frames pass between clicks
    }
    const after2 = await page.evaluate(() => window.__game.solde_mR);
    const gain = after2 - before2;
    const t2 = { test: "R1_click_gain_exact_no_listener_leak", pass: gain === N_CLICKS * 1000, before2, after2, gain, expected: N_CLICKS * 1000 };
    results.tests.push(t2);
    log.push(`(2) ${N_CLICKS} clics réels -> gain=${gain} mR (attendu ${N_CLICKS * 1000})`);
    if (!t2.pass) throw new Error(`Gain de clic incorrect: ${gain} != ${N_CLICKS * 1000} (fuite de listener ou régression R1 ?)`);

    // --- (3) R6/R18: real click on G1 card buys generator 0 when affordable ---
    // Bring balance above G1 cost (15000 mR) with more real clicks.
    for (let i = 0; i < 15; i++) await clickCanvasAt(page, canvas, CORE.x, CORE.y);
    await page.waitForTimeout(50);
    const soldeBeforeBuy = await page.evaluate(() => window.__game.solde_mR);
    const genBefore = await page.evaluate(() => window.__game.snapshot().state.generators_owned[0]);
    await clickCanvasAt(page, canvas, G1_CARD.x, G1_CARD.y);
    await page.waitForTimeout(50);
    const soldeAfterBuy = await page.evaluate(() => window.__game.solde_mR);
    const genAfter = await page.evaluate(() => window.__game.snapshot().state.generators_owned[0]);
    const t3 = { test: "R6_R18_real_click_buys_generator", pass: genAfter === genBefore + 1 && soldeAfterBuy < soldeBeforeBuy, genBefore, genAfter, soldeBeforeBuy, soldeAfterBuy };
    results.tests.push(t3);
    log.push(`(3) achat G1 par clic réel: generators_owned ${genBefore}->${genAfter}, solde ${soldeBeforeBuy}->${soldeAfterBuy}`);
    if (!t3.pass) throw new Error("Le clic réel sur la carte G1 n'a pas acheté le générateur");

    // --- (4) THE critical regression test: after buying G1 via the real click
    // path, does passive production (engine.tick(), running on its own
    // requestAnimationFrame loop) actually reach the SAME state object the
    // player sees? If index.html held two disconnected GameState instances
    // (the bug this build fixes), cumul_mR would stay frozen here.
    const cumulBeforeWait = await page.evaluate(() => window.__game.cumul_mR);
    await page.waitForTimeout(1200); // >=12 ticks at TICK_MS=100 while owning 1x G1 (0.1 R/s = 100 mR/s)
    const cumulAfterWait = await page.evaluate(() => window.__game.cumul_mR);
    const delta = cumulAfterWait - cumulBeforeWait;
    const t4 = { test: "R2_passive_production_reaches_displayed_state", pass: delta > 0, cumulBeforeWait, cumulAfterWait, delta_mR: delta };
    results.tests.push(t4);
    log.push(`(4) production passive après achat G1: cumul_mR +${delta} sur 1.2s (attendu > 0)`);
    if (!t4.pass) throw new Error("Production passive déconnectée de l'état affiché (engine.state != state du joueur)");

    // --- (5) Canvas actually renders (2d context alive) ---
    const canRender = await page.evaluate(() => {
      const c = document.getElementById("gameCanvas");
      return !!(c && c.getContext("2d"));
    });
    const t5 = { test: "canvas_render", pass: canRender };
    results.tests.push(t5);
    log.push(`(5) canvas rendu: ${canRender}`);
    if (!t5.pass) throw new Error("Canvas non rendu");

    // --- (6) R14/R20: window.__game.reset() zeroes state AND the object
    // identity stays valid for further real clicks (regression test for the
    // `new GameState()` reassignment bug fixed in engine.mjs reset()).
    await page.evaluate(() => window.__game.reset());
    await page.waitForTimeout(50);
    const afterReset = await page.evaluate(() => ({ solde: window.__game.solde_mR, cumul: window.__game.cumul_mR }));
    await clickCanvasAt(page, canvas, CORE.x, CORE.y);
    await page.waitForTimeout(50);
    const soldeAfterResetClick = await page.evaluate(() => window.__game.solde_mR);
    const t6 = {
      test: "R14_new_game_resets_and_stays_live",
      pass: afterReset.solde === 0 && afterReset.cumul === 0 && soldeAfterResetClick === 1000,
      afterReset, soldeAfterResetClick,
    };
    results.tests.push(t6);
    log.push(`(6) reset -> solde=${afterReset.solde} cumul=${afterReset.cumul}; clic post-reset -> solde=${soldeAfterResetClick}`);
    if (!t6.pass) throw new Error("Reset n'a pas remis l'état à zéro ou l'objet réinitialisé n'est plus câblé aux clics");

    results.verdict = results.tests.every((t) => t.pass) ? "PASS" : "FAIL";

    console.log("\n=== RÉSUMÉ E2E ===");
    for (const entry of log) console.log(`  ${entry}`);
    console.log(`\nRESULT: ${results.verdict}`);
    return results;
  } catch (err) {
    results.verdict = "FAIL";
    results.error = err.message;
    console.error("\n✗ E2E FAIL:", err.message);
    console.log("\nRESULT: FAIL");
    return results;
  } finally {
    if (browser) await browser.close();
    if (srv) srv.kill();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = await runE2ETests();
  process.exit(result.verdict === "PASS" ? 0 : 1);
}

export { runE2ETests };
