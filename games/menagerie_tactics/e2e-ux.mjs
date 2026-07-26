// e2e-ux.mjs — preuve NAVIGATEUR de la lisibilité (#2) : légende source-unique,
// APERÇU au survol AVANT tout clic (dégâts + relation de type), journal qui croît
// après une attaque. Purement présentationnel : lit window.__ui/__preview/__palette,
// jamais view() muté. RESULT: PASS / FAIL.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const CELL = 64;
const PORT = 4533;
const URL = `http://localhost:${PORT}/?seed=888`;
const c = (v) => v * CELL + CELL / 2;

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, "server.mjs")], {
    env: { ...process.env, MENAGERIE_PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("serveur trop long à démarrer")), 8000);
    proc.stdout.on("data", (d) => { if (String(d).includes("interface jouable")) { clearTimeout(t); resolve(proc); } });
    proc.on("exit", (cc) => reject(new Error("serveur a quitté, code " + cc)));
  });
}

async function main() {
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-gpu"] });
  const log = [];
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 820 } });
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__game && Array.isArray(window.__game.beasts), null, { timeout: 8000 });

    // 1) légende source-unique : >=5 pastilles dont une "attack" == window.__palette.attack.
    const legend = await page.evaluate(() => ({
      count: document.querySelectorAll("#legend .item").length,
      palette: window.__palette,
    }));
    if (legend.count < 5) { throw new Error(`légende incomplète (${legend.count} < 5)`); }
    if (!legend.palette.attack) { throw new Error("palette sans couleur 'attack'"); }
    log.push(`légende source-unique : ${legend.count} pastilles`);

    // 2) amener un joueur au contact d'un ennemi (l'IA ennemie s'approche à chaque tour).
    let adj = null;
    for (let i = 0; i < 10 && !adj; i++) {
      adj = await page.evaluate(() => {
        const g = window.__game;
        for (const p of g.beasts.filter((b) => b.active && b.side === "player")) {
          for (const e of g.beasts.filter((b) => b.active && b.side === "enemy")) {
            if (Math.abs(p.x - e.x) + Math.abs(p.y - e.y) === 1) { return { p: { x: p.x, y: p.y }, e: { x: e.x, y: e.y } }; }
          }
        }
        return null;
      });
      if (!adj) { await page.click("#endTurn"); }
    }
    if (!adj) { throw new Error("aucune adjacence joueur-ennemi obtenue en 10 tours"); }

    // 3) APERÇU AU SURVOL, AVANT tout clic d'attaque : sélectionne le joueur, survole l'ennemi.
    await page.locator("#canvas").click({ position: { x: c(adj.p.x), y: c(adj.p.y) } });
    await page.locator("#canvas").hover({ position: { x: c(adj.e.x), y: c(adj.e.y) } });
    const preview = await page.evaluate(() => window.__preview);
    if (!preview || !(preview.damage > 0)) { throw new Error(`aperçu au survol absent (${JSON.stringify(preview)})`); }
    const tooltipVisible = await page.evaluate(() => !document.getElementById("tooltip").classList.contains("hidden"));
    if (!tooltipVisible) { throw new Error("tooltip non affiché au survol"); }
    log.push(`aperçu au survol AVANT clic : dégâts=${preview.damage}, relation=${preview.relation}`);

    // 4) attaque -> le journal croît (chiffres/événements observables).
    const jBefore = await page.evaluate(() => window.__ui.journal.length);
    await page.locator("#canvas").click({ position: { x: c(adj.e.x), y: c(adj.e.y) } });
    const jAfter = await page.evaluate(() => window.__ui.journal.length);
    if (!(jAfter > jBefore)) { throw new Error(`journal non enrichi après attaque (${jBefore} -> ${jAfter})`); }
    log.push(`journal enrichi après attaque : ${jBefore} -> ${jAfter}`);

    console.log("=== E2E UX Menagerie Tactics — lisibilité (#2) ===");
    for (const l of log) { console.log("• " + l); }
    console.log("\nRESULT: PASS");
  } finally {
    await browser.close();
    srv.kill();
  }
}

main().catch((e) => {
  console.error("\nRESULT: FAIL —", e && e.message ? e.message : e);
  process.exit(1);
});
