// kb_tactics — E2E click-through réel (Playwright/Chromium) : démarre le serveur, ouvre la page,
// presse de vraies touches, observe window.__game, PROUVE que les assets ingérés (Kenney) sont
// chargés dans le navigateur, force la défaite, vérifie overlay + clic #restart.
//
// Usage : node e2e.mjs   (headless par défaut ; HEADED=1 pour voir le navigateur)
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const PORT = 4611;
const URL = `http://localhost:${PORT}/?seed=888`;
const SHOTS = join(__dirname, "e2e-shots");

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, "server.mjs")], {
    env: { ...process.env, KB_TACTICS_PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("serveur trop long à démarrer")), 8000);
    proc.stdout.on("data", (d) => {
      if (String(d).includes("interface jouable")) { clearTimeout(t); resolve(proc); }
    });
    proc.stderr.on("data", (d) => process.stderr.write("[srv] " + d));
    proc.on("exit", (c) => reject(new Error("serveur a quitté, code " + c)));
  });
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-gpu"] });
  const log = [];
  try {
    const page = await browser.newPage({ viewport: { width: 560, height: 460 } });
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERROR:", m.text()); });

    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__game && typeof window.__game.player === "object", null, { timeout: 8000 });

    console.log("--- (1) Page chargée, vérification des hooks ---");
    const hooks = await page.evaluate(() => ({
      hasGame: !!window.__game,
      hasDebug: !!window.__game_debug,
      hasOverlay: !!document.getElementById("overlay"),
      hasRestart: !!document.getElementById("restart"),
    }));
    console.log(`Hooks : ${JSON.stringify(hooks)}`);
    if (!Object.values(hooks).every(Boolean)) throw new Error("Hooks manquants !");

    // (2) PREUVE de consommation des assets ingérés : les sprites Kenney sont-ils chargés ?
    console.log("\n--- (2) Assets ingérés chargés dans le navigateur ---");
    const assets = await page.evaluate(() => window.__game_debug.assetsLoaded);
    console.log(`Assets : ${JSON.stringify(assets)}`);
    if (!assets.player || !assets.enemy) throw new Error("Sprites Kenney ingérés NON chargés (asset non consommé)");
    log.push(`assets Kenney chargés: joueur=${assets.player}, ennemi=${assets.enemy}`);

    // (3) Déplacement réel : ArrowRight => la case (1,0) est garantie libre (level.mjs)
    console.log("\n--- (3) Déplacement joueur (ArrowRight) ---");
    const x0 = await page.evaluate(() => window.__game.player.x);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(40);
    const x1 = await page.evaluate(() => window.__game.player.x);
    log.push(`déplacement droite: x ${x0} -> ${x1}`);
    if (!(x1 > x0)) throw new Error("ArrowRight n'a pas déplacé le joueur");
    console.log(`✓ joueur déplacé : x ${x0} -> ${x1}`);

    const turnAfterMove = await page.evaluate(() => window.__game.turn);
    if (turnAfterMove < 1) throw new Error("le compteur de tour n'a pas avancé");
    await page.screenshot({ path: join(SHOTS, "01-active.png") });

    // (4) Overlay caché pendant la partie
    console.log("\n--- (4) Overlay caché en jeu ---");
    const hiddenInGame = await page.evaluate(() => document.getElementById("overlay").classList.contains("hidden"));
    if (!hiddenInGame) throw new Error("overlay visible pendant la partie");
    console.log("✓ overlay caché en jeu");

    // (5) Forcer défaite via hook debug
    console.log("\n--- (5) Forcer défaite (hook debug) ---");
    await page.evaluate(() => window.__game_debug.forceLose());
    await page.waitForTimeout(40);
    const status = await page.evaluate(() => window.__game.status);
    log.push(`après forceLose: status=${status}`);
    if (status !== "LOST") throw new Error(`status attendu LOST, obtenu ${status}`);
    const overlayShown = await page.evaluate(() => !document.getElementById("overlay").classList.contains("hidden"));
    if (!overlayShown) throw new Error("overlay non visible après défaite");
    console.log("✓ défaite + overlay visible");
    await page.screenshot({ path: join(SHOTS, "02-lost.png") });

    // (6) Restart
    console.log("\n--- (6) Restart ---");
    await page.click("#restart");
    await page.waitForTimeout(40);
    const after = await page.evaluate(() => ({ status: window.__game.status, hp: window.__game.player.hp, turn: window.__game.turn }));
    log.push(`après restart: ${JSON.stringify(after)}`);
    if (after.status !== "ACTIVE") throw new Error("status non ACTIVE après restart");
    if (after.turn !== 0) throw new Error("turn non réinitialisé après restart");
    const hiddenAfter = await page.evaluate(() => document.getElementById("overlay").classList.contains("hidden"));
    if (!hiddenAfter) throw new Error("overlay non caché après restart");
    console.log("✓ restart a réinitialisé la partie");
    await page.screenshot({ path: join(SHOTS, "03-restart.png") });

    console.log("\n=== RÉSUMÉ E2E ===");
    for (const e of log) console.log(`  ${e}`);
    console.log("\nRESULT: PASS");
    process.exit(0);
  } catch (err) {
    console.error("\n✗ E2E FAIL:", err.message);
    console.log("\nRESULT: FAIL");
    process.exit(1);
  } finally {
    await browser.close();
    srv.kill();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
