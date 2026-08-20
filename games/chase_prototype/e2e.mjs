// Chase Prototype — E2E click-through réel (Playwright/Chromium) : démarre le serveur,
// ouvre la page, envoie de vraies touches clavier, observe window.__game, force la
// défaite puis la victoire via les hooks de debug, vérifie l'overlay + clic #restart.
//
// Usage : node e2e.mjs   (headless par défaut ; HEADED=1 pour voir le navigateur)
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
// NODE_PATH n'est honoré que par la résolution CommonJS, pas par les imports ESM bare
// specifier — on passe donc par createRequire() pour résoudre "playwright" depuis les
// node_modules de belote-claude (voir run-oracle.mjs qui pose NODE_PATH avant de spawn).
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const PORT = 4503;
const URL = `http://localhost:${PORT}/`;
const SHOTS = join(__dirname, "e2e-shots");

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, "server.mjs")], {
    env: { ...process.env, RUNNER_PORT: String(PORT) },
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

async function pressHeld(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-gpu"] });
  const log = [];
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 820 } });
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERROR:", m.text()); });
    page.on("crash", () => console.log("PAGE CRASH EVENT"));

    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__game && typeof window.__game.player === "object", null, { timeout: 8000 });

    // --- 1) le joueur bouge selon de vraies touches clavier (droite) ---
    const before = await page.evaluate(() => ({ x: window.__game.player.x, y: window.__game.player.y }));
    await pressHeld(page, "ArrowRight", 350);
    await page.waitForTimeout(80);
    const afterRight = await page.evaluate(() => ({ x: window.__game.player.x, y: window.__game.player.y }));
    if (!(afterRight.x > before.x)) throw new Error(`ArrowRight n'a pas déplacé le joueur (${before.x} -> ${afterRight.x})`);
    log.push(`déplacement droite: x ${before.x.toFixed(1)} -> ${afterRight.x.toFixed(1)}`);

    await page.screenshot({ path: join(SHOTS, "01-movement.png") });

    // --- 2) l'ennemi poursuit réellement (se rapproche du joueur au fil du temps) ---
    const dist = (v) => Math.hypot(v.player.x - v.enemy.x, v.player.y - v.enemy.y);
    const d0 = await page.evaluate(() => window.__game);
    await page.waitForTimeout(400);
    const d1 = await page.evaluate(() => window.__game);
    if (!(dist(d1) < dist(d0))) {
      throw new Error(`l'ennemi devrait se rapprocher avec le temps (${dist(d0).toFixed(1)} -> ${dist(d1).toFixed(1)})`);
    }
    log.push(`poursuite réelle: distance ${dist(d0).toFixed(1)} -> ${dist(d1).toFixed(1)}`);

    await page.screenshot({ path: join(SHOTS, "02-chase.png") });

    // --- 3) déclenche la défaite via le hook de debug, vérifie l'overlay ---
    const overlayHiddenBefore = await page.evaluate(() => document.getElementById("overlay").classList.contains("hidden"));
    if (!overlayHiddenBefore) throw new Error("l'overlay ne devrait pas être visible avant la fin de partie");

    await page.evaluate(() => window.__game_debug.hit());
    await page.waitForFunction(() => window.__game && window.__game.over === true, null, { timeout: 4000 });
    await page.waitForFunction(
      () => !document.getElementById("overlay").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    const overState = await page.evaluate(() => window.__game);
    if (overState.over !== true) throw new Error(`over doit être true après debugHit, trouvé ${overState.over}`);
    const overlayTitleDefeat = await page.locator("#overlayTitle").innerText();
    if (!overlayTitleDefeat.includes("DÉFAITE")) throw new Error(`titre overlay défaite invalide : ${overlayTitleDefeat}`);
    log.push(`défaite forcée: over=${overState.over}, titre="${overlayTitleDefeat}"`);
    await page.screenshot({ path: join(SHOTS, "03-defeat.png") });

    // --- 4) clique #restart, vérifie que la partie repart proprement ---
    await page.click("#restart");
    await page.waitForFunction(() => window.__game && window.__game.over === false, null, { timeout: 4000 });
    await page.waitForFunction(
      () => document.getElementById("overlay").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    const restarted = await page.evaluate(() => window.__game);
    if (restarted.over !== false) throw new Error("over devrait être false après restart");
    // tolérance : la boucle requestAnimationFrame peut avoir tické une fois entre le
    // clic et la lecture — elapsedMs proche de 0, pas nécessairement exactement 0.
    if (!(restarted.elapsedMs < 100)) throw new Error(`elapsedMs devrait être proche de 0 après restart, trouvé ${restarted.elapsedMs}`);
    log.push(`redémarrage OK: over=${restarted.over}, elapsedMs=${restarted.elapsedMs}`);

    // --- 5) déclenche la victoire via le hook de debug, vérifie l'overlay victoire ---
    await page.evaluate(() => window.__game_debug.win());
    await page.waitForFunction(() => window.__game && window.__game.won === true, null, { timeout: 4000 });
    await page.waitForFunction(
      () => !document.getElementById("overlay").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    const wonState = await page.evaluate(() => window.__game);
    const overlayTitleVictory = await page.locator("#overlayTitle").innerText();
    if (!overlayTitleVictory.includes("VICTOIRE")) throw new Error(`titre overlay victoire invalide : ${overlayTitleVictory}`);
    log.push(`victoire forcée: won=${wonState.won}, titre="${overlayTitleVictory}"`);
    await page.screenshot({ path: join(SHOTS, "04-victory.png") });

    console.log("=== E2E Chase Prototype — clics + clavier réels ===");
    for (const l of log) console.log("• " + l);
    console.log("captures: e2e-shots/{01-movement,02-chase,03-defeat,04-victory}.png");
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
