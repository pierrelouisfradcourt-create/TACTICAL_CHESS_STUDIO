// Chain Probe V1 — E2E click-through réel (Playwright/Chromium) : démarre le
// serveur, ouvre la page, envoie de vrais clics souris, observe window.__game,
// force la victoire via le hook de debug, vérifie l'overlay + clic #restart.
//
// Usage : node e2e.mjs   (headless par défaut ; HEADED=1 pour voir le navigateur)
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
// NODE_PATH n'est honoré que par la résolution CommonJS, pas par les imports
// ESM bare specifier — createRequire() résout "playwright" depuis les
// node_modules injectés par run-oracle.mjs (aucune copie locale dupliquée).
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const PORT = 4601;
const URL = `http://localhost:${PORT}/`;

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, "server.mjs")], {
    env: { ...process.env, PROBE_PORT: String(PORT) },
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

async function main() {
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-gpu"] });
  const log = [];
  try {
    const page = await browser.newPage({ viewport: { width: 700, height: 500 } });
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERROR:", m.text()); });
    page.on("crash", () => console.log("PAGE CRASH EVENT"));

    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => window.__game && typeof window.__game.avatarX === "number",
      null,
      { timeout: 8000 }
    );

    // --- 1) un vrai clic déplace l'avatar (l'exploration augmente) ---
    const before = await page.evaluate(() => ({
      x: window.__game.avatarX,
      y: window.__game.avatarY,
      explored: window.__game.exploredCells.size,
    }));

    const container = page.locator("#game-container");
    const box = await container.boundingBox();
    if (!box) throw new Error("#game-container introuvable / non rendu");
    // Clic à (140,80) dans le référentiel du conteneur : distance depuis le
    // centre initial (200,150) ≈ 92px (sous la limite de déplacement 150px)
    // ET distance à l'objet 0 (100,80) = 40px (sous le rayon de révélation
    // 120px) — déplace ET révèle l'objet 0, SANS que l'avatar (hitbox 24px,
    // z-index 10) ne recouvre le point de clic de l'objet (hitbox 30px) au
    // pas suivant, ce qui bloquerait le clic d'activation à l'étape 2.
    await page.mouse.click(box.x + 140, box.y + 80);
    await page.waitForFunction(
      (prevExplored) => window.__game.exploredCells.size > prevExplored,
      before.explored,
      { timeout: 4000 }
    );
    const afterMove = await page.evaluate(() => ({
      x: window.__game.avatarX,
      y: window.__game.avatarY,
      explored: window.__game.exploredCells.size,
    }));
    if (!(afterMove.explored > before.explored)) {
      throw new Error(`le clic n'a pas augmenté l'exploration (${before.explored} -> ${afterMove.explored})`);
    }
    log.push(`clic destination réel: avatar (${before.x.toFixed(0)},${before.y.toFixed(0)}) -> (${afterMove.x.toFixed(0)},${afterMove.y.toFixed(0)}), explored ${before.explored} -> ${afterMove.explored}`);

    // --- 2) un vrai clic sur l'objet révélé l'active (delta STRICT = 1) ---
    // Clic bas-niveau par coordonnées (mouse.click), pas un clic par
    // locator: render.mjs reconstruit tout le sous-arbre DOM à chaque frame
    // (16ms) — un clic par sélecteur peut échouer sur un noeud détaché entre
    // sa résolution et l'action ; un clic par coordonnées reste valide quel
    // que soit le noeud DOM sous le curseur au moment du clic.
    await page.waitForFunction(
      () => window.__game.objects[0].visible === true,
      null,
      { timeout: 4000 }
    );
    const activeBefore = await page.evaluate(() => window.__game.objectsActive);
    // Objet 0 à (100,80) dans le référentiel du conteneur (cf. logic.mjs) —
    // l'avatar vient de s'y déplacer, le centre du clic coïncide. render.mjs
    // reconstruit tout le sous-arbre DOM au tick suivant (16ms) après le
    // changement d'état ; on attend que le NOEUD existe réellement (pas
    // seulement l'état) avant de cliquer, sinon le clic peut tomber sur une
    // cellule de grille encore affichée (course état/rendu).
    await page.waitForSelector('[data-id="0"]', { timeout: 4000 });
    await page.mouse.click(box.x + 100, box.y + 80);
    await page.waitForFunction(
      (prev) => window.__game.objectsActive === prev + 1,
      activeBefore,
      { timeout: 4000 }
    );
    const activeAfter = await page.evaluate(() => window.__game.objectsActive);
    if (activeAfter !== activeBefore + 1) {
      throw new Error(`activation par clic doit avoir un delta STRICT=1 (${activeBefore} -> ${activeAfter})`);
    }
    log.push(`clic activation réel: objectsActive ${activeBefore} -> ${activeAfter} (delta STRICT=1)`);

    // --- 3) déclenche la victoire via le hook de debug, vérifie l'overlay ---
    const overlayHiddenBefore = await page.evaluate(() =>
      document.getElementById("overlay") === null ||
      document.getElementById("overlay").classList.contains("hidden")
    );
    if (!overlayHiddenBefore) throw new Error("l'overlay ne devrait pas être visible avant la victoire");

    await page.evaluate(() => window.__game_debug.win());
    await page.waitForFunction(() => window.__game && window.__game.won === true, null, { timeout: 4000 });
    await page.waitForFunction(
      () => !document.getElementById("overlay").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    const wonState = await page.evaluate(() => window.__game);
    if (wonState.won !== true) throw new Error(`won doit être true après window.__game_debug.win(), trouvé ${wonState.won}`);
    log.push(`victoire forcée: won=${wonState.won}, objectsActive=${wonState.objectsActive}/${wonState.objectsRequired}`);

    // --- 4) clique #restart, vérifie que la partie repart proprement ---
    const overlayTitle = await page.locator("#overlayTitle").innerText();
    if (!overlayTitle.includes("Victoire")) {
      throw new Error(`titre overlay invalide : ${overlayTitle}`);
    }
    await page.click("#restart");
    await page.waitForFunction(() => window.__game && window.__game.won === false, null, { timeout: 4000 });
    await page.waitForFunction(
      () => document.getElementById("overlay").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    const restarted = await page.evaluate(() => window.__game);
    if (restarted.objectsActive !== 0) throw new Error(`objectsActive devrait être 0 après restart, trouvé ${restarted.objectsActive}`);
    if (restarted.terminalState !== "LOCKED") throw new Error(`terminalState devrait être LOCKED après restart, trouvé ${restarted.terminalState}`);
    if (restarted.won !== false) throw new Error("won devrait être false après restart");
    log.push(`redémarrage OK: objectsActive=${restarted.objectsActive}, terminalState=${restarted.terminalState}, won=${restarted.won}`);

    console.log("=== E2E Chain Probe V1 — clics réels (Playwright/Chromium) ===");
    for (const l of log) console.log("• " + l);
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
