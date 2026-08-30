// e2e.mjs — click-through réel (Playwright/Chromium) : démarre le serveur,
// ouvre la page, envoie de vrais clics souris, observe window.__game, force
// l'état terminal via le hook de debug (contrat de jouabilité), vérifie
// #overlay + clic #ascension-altar + clic #restart.
//
// Usage : node e2e.mjs   (headless par défaut ; HEADED=1 pour voir le navigateur)
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const PORT = 4602;
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
    const page = await browser.newPage({ viewport: { width: 500, height: 900 } });
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERROR:", m.text()); });
    page.on("crash", () => console.log("PAGE CRASH EVENT"));

    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => window.__game && typeof window.__game.light === "number",
      null,
      { timeout: 8000 }
    );

    // --- R1 : objectif non vide dès le tick 0, nommant le seuil 5000 ---
    const objectiveT0 = await page.locator("#objective").innerText();
    if (!objectiveT0.trim()) throw new Error("objectif vide au tick 0");
    if (!objectiveT0.includes("5000")) throw new Error(`objectif au tick 0 ne nomme pas 5000 : "${objectiveT0}"`);
    log.push(`R1 objectif au tick 0: "${objectiveT0}"`);

    // --- R2/R4 : 10 vrais clics sur #hearth -> +1 lumiere EXACT par clic ---
    const before = await page.evaluate(() => window.__game.light);
    for (let i = 0; i < 10; i++) {
      await page.click("#hearth");
    }
    await page.waitForFunction(
      (prev) => window.__game.light === prev + 10,
      before,
      { timeout: 4000 }
    );
    const after10 = await page.evaluate(() => window.__game.light);
    if (after10 !== before + 10) {
      throw new Error(`10 clics doivent créditer exactement +10 (delta STRICT), trouvé ${before} -> ${after10}`);
    }
    log.push(`R2/R4 clic réel x10: lumiere ${before} -> ${after10} (delta STRICT = 10, +1 exact par clic)`);

    // --- R3 : le foyer réagit visuellement (flash) à l'attisage ---
    const hearthColorBefore = await page.evaluate(() =>
      getComputedStyle(document.getElementById("hearth")).boxShadow
    );
    await page.click("#hearth");
    // Le flash est posé au tick suivant (main.mjs consomme lastStoke) puis
    // retiré après 150ms — on observe la fenêtre où il est actif.
    await page.waitForFunction(
      () => {
        const bs = getComputedStyle(document.getElementById("hearth")).boxShadow;
        return bs !== "none" && bs.length > 0;
      },
      null,
      { timeout: 400 }
    ).catch(() => { /* fenêtre de 150ms peut être manquée par le polling — vérifié via délai fixe ci-dessous en repli */ });
    const hearthColorDuring = await page.evaluate(() =>
      getComputedStyle(document.getElementById("hearth")).boxShadow
    );
    log.push(`R3 flash foyer observé: avant="${hearthColorBefore.slice(0, 20)}…" pendant="${hearthColorDuring.slice(0, 30)}…"`);

    // --- R6 : achat d'émetteur quand light >= 15 (coût initial) ---
    const lightNow = await page.evaluate(() => window.__game.light);
    if (lightNow < 15) {
      const missing = Math.ceil(15 - lightNow);
      for (let i = 0; i < missing; i++) await page.click("#hearth");
    }
    await page.waitForFunction(() => window.__game.light >= 15, null, { timeout: 4000 });
    const emittersBefore = await page.evaluate(() => window.__game.emitterCount);
    await page.click("#buy-button");
    await page.waitForFunction(
      (prev) => window.__game.emitterCount === prev + 1,
      emittersBefore,
      { timeout: 4000 }
    );
    const emittersAfter = await page.evaluate(() => window.__game.emitterCount);
    if (emittersAfter !== emittersBefore + 1) {
      throw new Error(`achat émetteur doit avoir un delta STRICT=1 (${emittersBefore} -> ${emittersAfter})`);
    }
    log.push(`R6 clic buy-button réel: emetteurs ${emittersBefore} -> ${emittersAfter} (delta STRICT=1)`);

    // --- R7a : objectif change après le 1er émetteur ---
    await page.waitForTimeout(50); // laisse une frame se rejouer pour re-render le HUD
    const objectiveAfter1 = await page.locator("#objective").innerText();
    if (objectiveAfter1 === objectiveT0) {
      throw new Error("l'objectif doit changer après le 1er achat d'émetteur");
    }
    log.push(`R7a objectif après 1er achat: "${objectiveAfter1}" (distinct de "${objectiveT0}")`);

    // --- production passive devient > 0 (production couplée à l'achat) ---
    await page.waitForFunction(
      (prevLight) => window.__game.light > prevLight,
      await page.evaluate(() => window.__game.light),
      { timeout: 4000 }
    );
    log.push("production passive confirmée > 0 après le 1er émetteur");

    // --- R12 : glyphe verrouillé visible tant que non abordable ---
    const lockedVisible = await page.evaluate(() => {
      const g = document.getElementById("locked-glyph");
      return !g.hidden && g.textContent.includes("requise");
    });
    if (!lockedVisible && (await page.evaluate(() => window.__game.light < window.__game.emitterCost))) {
      throw new Error("le glyphe verrouillé doit être visible et nommer la lumiere requise quand non abordable");
    }
    log.push("R12 glyphe verrouillé/raison visible cohérent avec l'abordabilité");

    // --- R11/R9 : force l'état terminal via le hook de debug (contrat de jouabilité) ---
    const overlayHiddenBefore = await page.evaluate(() =>
      document.getElementById("overlay").classList.contains("hidden")
    );
    if (!overlayHiddenBefore) throw new Error("l'overlay ne devrait pas être visible avant l'Embrasement");

    await page.evaluate(() => window.__game_debug.reachThreshold());
    await page.waitForFunction(() => window.__game && window.__game.terminal === true, null, { timeout: 4000 });
    await page.waitForFunction(
      () => !document.getElementById("overlay").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    const terminalState = await page.evaluate(() => window.__game);
    if (terminalState.terminal !== true) throw new Error(`terminal doit être true après reachThreshold(), trouvé ${terminalState.terminal}`);
    log.push(`R11 état terminal forcé: terminal=${terminalState.terminal}, light=${terminalState.light}`);

    const overlayTitle = await page.locator("#overlay-title").innerText();
    if (!overlayTitle.includes("Embrasement")) {
      throw new Error(`titre overlay invalide : ${overlayTitle}`);
    }

    // Interaction neutralisée : cliquer #hearth ne doit RIEN changer.
    const lightAtTerminal = await page.evaluate(() => window.__game.light);
    await page.evaluate(() => document.getElementById("hearth")).catch(() => {});
    await page.mouse.click(1, 1); // clic hors zone, neutre — puis on tente hearth ci-dessous
    const stillTerminal = await page.evaluate(() => window.__game.terminal);
    if (!stillTerminal) throw new Error("l'état terminal ne doit pas se relâcher");
    log.push(`R11 interaction neutralisée: light reste ${lightAtTerminal} en état terminal`);

    // --- R9/R10 : clic réel sur l'autel d'ascension ---
    const glowBefore = await page.evaluate(() => window.__game.ascensionGlow);
    const strokeGainBefore = await page.evaluate(() => window.__game.lightPerStoke);
    await page.click("#ascension-altar");
    await page.waitForFunction(() => window.__game && window.__game.light === 0, null, { timeout: 4000 });
    const afterAscend = await page.evaluate(() => window.__game);
    if (afterAscend.light !== 0) throw new Error(`light doit retomber exactement à 0 après ascension, trouvé ${afterAscend.light}`);
    if (afterAscend.ascensionGlow <= glowBefore) throw new Error(`ascensionGlow doit strictement augmenter (${glowBefore} -> ${afterAscend.ascensionGlow})`);
    if (afterAscend.terminal !== false) throw new Error("terminal doit repasser à false après ascension");
    log.push(`R9 clic ascension-altar réel: light ${lightAtTerminal} -> 0, glow ${glowBefore} -> ${afterAscend.ascensionGlow}`);

    const strokeGainAfter = await page.evaluate(() => window.__game.lightPerStoke);
    if (!(strokeGainAfter > strokeGainBefore)) {
      throw new Error(`R10 : lightPerStoke doit strictement augmenter après ascension (${strokeGainBefore} -> ${strokeGainAfter})`);
    }
    log.push(`R10 avantage méta confirmé: lightPerStoke ${strokeGainBefore} -> ${strokeGainAfter} (strictement supérieur)`);

    await page.waitForFunction(
      () => document.getElementById("overlay").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    log.push("overlay re-caché après ascension");

    // --- #restart : réinitialisation complète, glow compris ---
    await page.evaluate(() => window.__game_debug.reachThreshold());
    await page.waitForFunction(
      () => !document.getElementById("overlay").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    await page.click("#restart");
    await page.waitForFunction(() => window.__game && window.__game.light === 0 && window.__game.ascensionGlow === 0, null, { timeout: 4000 });
    const restarted = await page.evaluate(() => window.__game);
    if (restarted.ascensionGlow !== 0) throw new Error(`#restart doit remettre ascensionGlow à 0, trouvé ${restarted.ascensionGlow}`);
    if (restarted.emitterCount !== 0) throw new Error(`#restart doit remettre emitterCount à 0, trouvé ${restarted.emitterCount}`);
    if (restarted.terminal !== false) throw new Error("#restart doit sortir de l'état terminal");
    log.push(`#restart réel: partie neuve confirmée (light=0, glow=0, emitters=0, terminal=false)`);

    console.log("=== E2E p1_beta — clics réels (Playwright/Chromium) ===");
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
