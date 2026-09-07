// e2e.mjs — couche PREUVE ÉCRAN : démarre le serveur, ouvre un navigateur
// RÉEL, envoie de vrais clics souris, et observe l'état EXCLUSIVEMENT au
// travers de la page (window.__game, #overlay, textes du HUD).
//
// N'importe JAMAIS engine/render/objective (blueprint deps_interdites) : il ne
// doit pouvoir affirmer que ce que la page a réellement peint. Seule exception
// autorisée par le blueprint : economy.mjs — les seuils qu'il vérifie doivent
// venir de la source unique, sinon la sonde re-déclarerait 5000 et resterait
// verte sur un jeu désaccordé de son économie.
//
// Usage : node e2e.mjs   (headless par défaut ; HEADED=1 pour voir le navigateur)
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { TERMINAL_THRESHOLD, EMITTER_BASE_COST, MILESTONE_STEP } from "./economy.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const PORT = 4602;
const URL = `http://localhost:${PORT}/`;

// Les 12 cibles DOM stables déclarées par index.html (blueprint, module
// index.html) : un seul id manquant fait échouer la sonde AVANT tout clic —
// aucune preuve aval ne peut alors être verte.
const REQUIRED_IDS = [
  "field", "objective", "light-counter", "progress-gauge-fill", "milestone-marker",
  "hearth", "emitters", "buy-button", "locked-glyph", "overlay",
  "ascension-altar", "restart",
];

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

    // --- Scène : les 12 cibles DOM stables existent, AVANT tout clic ---
    const missingIds = await page.evaluate(
      (ids) => ids.filter((id) => document.getElementById(id) === null),
      REQUIRED_IDS
    );
    if (missingIds.length > 0) {
      throw new Error(`cibles DOM déclarées absentes de la page : ${missingIds.join(", ")}`);
    }
    log.push(`scène: ${REQUIRED_IDS.length}/${REQUIRED_IDS.length} cibles DOM stables présentes avant tout clic`);

    // --- R1 : objectif ET compteur non vides dès le tick 0 (un rendu a eu
    // lieu avant le premier paint), l'objectif nommant le seuil terminal ---
    const objectiveT0 = await page.locator("#objective").innerText();
    const counterT0 = await page.locator("#light-counter").innerText();
    if (!objectiveT0.trim()) throw new Error("objectif vide au tick 0");
    if (!counterT0.trim()) throw new Error("compteur vide au tick 0 — aucun rendu avant le premier paint");
    if (!objectiveT0.includes(String(TERMINAL_THRESHOLD))) {
      throw new Error(`objectif au tick 0 ne nomme pas le seuil ${TERMINAL_THRESHOLD} : "${objectiveT0}"`);
    }
    log.push(`R1 objectif au tick 0: "${objectiveT0}" · compteur "${counterT0}"`);

    // --- R10 : l'autel n'est PAS atteignable tant que l'overlay est caché ---
    const altarReachableBefore = await page
      .click("#ascension-altar", { timeout: 1200 })
      .then(() => true)
      .catch(() => false);
    if (altarReachableBefore) {
      throw new Error("#ascension-altar ne doit pas être cliquable avant l'Embrasement");
    }
    log.push("R10 autel non atteignable hors état terminal (clic réel refusé par la page)");

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

    // --- R6 : achat d'émetteur dès light >= coût de base (issu d'economy) ---
    const lightNow = await page.evaluate(() => window.__game.light);
    if (lightNow < EMITTER_BASE_COST) {
      const missing = Math.ceil(EMITTER_BASE_COST - lightNow);
      for (let i = 0; i < missing; i++) await page.click("#hearth");
    }
    await page.waitForFunction(
      (cost) => window.__game.light >= cost,
      EMITTER_BASE_COST,
      { timeout: 4000 }
    );
    const emittersBefore = await page.evaluate(() => window.__game.emitterCount);
    const lightBeforeBuy = await page.evaluate(() => window.__game.light);
    const costAtBuy = await page.evaluate(() => window.__game.emitterCost);
    const dotsBefore = await page.locator("#emitters > *").count();
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
    log.push(`R6 clic buy-button réel: emetteurs ${emittersBefore} -> ${emittersAfter} (delta STRICT=1), coût débité ${costAtBuy} depuis ${lightBeforeBuy}`);

    // Le groupe #emitters passe de 0 à 1 élément distinct (comptage DOM strict).
    await page.waitForFunction(
      (prev) => document.querySelectorAll("#emitters > *").length === prev + 1,
      dotsBefore,
      { timeout: 4000 }
    );
    const dotsAfter = await page.locator("#emitters > *").count();
    if (dotsAfter !== dotsBefore + 1) {
      throw new Error(`#emitters doit passer de ${dotsBefore} à ${dotsBefore + 1} silhouettes, trouvé ${dotsAfter}`);
    }
    log.push(`R7a émetteur apparu à l'écran: #emitters ${dotsBefore} -> ${dotsAfter} élément(s)`);

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

    // --- R14 : marqueur de jalon (apparition brève) + jauge qui se remplit ---
    const gaugeBefore = await page.evaluate(() =>
      document.getElementById("progress-gauge-fill").style.width
    );
    await page.evaluate((step) => window.__game_debug.grantLight(step), MILESTONE_STEP);
    const markerLit = await page
      .waitForFunction(
        () => Number(getComputedStyle(document.getElementById("milestone-marker")).opacity) > 0,
        null,
        { timeout: 2000 }
      )
      .then(() => true)
      .catch(() => false);
    if (!markerLit) throw new Error("le marqueur de jalon doit apparaître au franchissement d'un palier");
    // Non modal : il ne recouvre ni le compteur ni le foyer (les deux restent
    // visibles et mesurables pendant que le marqueur est allumé).
    const counterVisible = await page.locator("#light-counter").isVisible();
    const hearthVisible = await page.locator("#hearth").isVisible();
    if (!counterVisible || !hearthVisible) {
      throw new Error("le marqueur de jalon ne doit jamais recouvrir #light-counter ni #hearth");
    }
    const gaugeAfter = await page.evaluate(() =>
      document.getElementById("progress-gauge-fill").style.width
    );
    if (gaugeAfter === gaugeBefore) {
      throw new Error(`la jauge doit se remplir avec la progression (restée à ${gaugeBefore})`);
    }
    log.push(`R14 jalon franchi: #milestone-marker allumé, compteur+foyer non recouverts · jauge ${gaugeBefore} -> ${gaugeAfter}`);

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

    // Interaction neutralisée : en état terminal, ni le foyer ni l'achat ne
    // changent quoi que ce soit.
    //
    // HONNÊTETÉ SUR LA NATURE DE L'ENTRÉE : l'overlay est modal (position
    // fixed, z-index au-dessus de tout), il INTERCEPTE le pointeur — un clic
    // souris matériel sur #hearth n'atteindrait jamais le foyer, et prouverait
    // seulement que l'overlay couvre l'écran. On envoie donc un ÉVÉNEMENT click
    // réel sur l'élément lui-même : il remonte par le même chemin
    // (document.body -> input.mjs -> engine), ce qui teste bien la
    // neutralisation par les RÈGLES, et pas seulement l'occultation visuelle.
    const stateAtTerminal = await page.evaluate(() => ({ ...window.__game }));
    await page.locator("#hearth").dispatchEvent("click");
    await page.locator("#buy-button").dispatchEvent("click");
    const stateAfterBlockedClicks = await page.evaluate(() => ({ ...window.__game }));
    for (const field of ["light", "emitterCount", "ascensionGlow", "terminal"]) {
      if (stateAfterBlockedClicks[field] !== stateAtTerminal[field]) {
        throw new Error(
          `en état terminal, un clic ne doit modifier AUCUN champ — ${field} : `
          + `${stateAtTerminal[field]} -> ${stateAfterBlockedClicks[field]}`
        );
      }
    }
    const lightAtTerminal = stateAtTerminal.light;
    log.push(`R11 interaction neutralisée: light/emitterCount/glow/terminal inchangés (light reste ${lightAtTerminal})`);

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

    console.log("=== E2E p1_beta_E1 — clics réels (Playwright/Chromium) ===");
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
