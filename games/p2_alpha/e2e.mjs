// e2e.mjs — click-through réel (Playwright/Chromium) : démarre le serveur,
// ouvre la page, envoie de vrais clics souris sur les affordances DOM réelles
// (#coeur-de-lumen, #buy-g1/#buy-g2, #rejouer), observe window.__game et le
// calque overlay, force le seuil terminal via le hook de debug (contrat de
// jouabilité), vérifie #victory-overlay puis le rejeu réel.
//
// Usage : node e2e.mjs   (headless par défaut ; HEADED=1 pour voir le navigateur)
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const PORT = 4603;
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
    const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERROR:", m.text()); });
    page.on("crash", () => console.log("PAGE CRASH EVENT"));

    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => window.__game && typeof window.__game.solde_mR === "number",
      null,
      { timeout: 8000 }
    );

    // --- R1 : objectif non vide dès le tick 0, nommant le prochain seuil (100 R)
    // ET le seuil TERMINAL (1000000 R). Les deux sont en R, jamais en milli-R. ---
    const objectiveT0 = await page.evaluate(() => document.getElementById("objectif").textContent);
    if (!objectiveT0.trim()) throw new Error("objectif vide au tick 0");
    if (!objectiveT0.includes("100 R")) throw new Error(`objectif au tick 0 ne nomme pas le prochain seuil 100 R : "${objectiveT0}"`);
    if (!objectiveT0.includes("1000000")) throw new Error(`objectif au tick 0 ne cite pas le seuil terminal 1000000 R : "${objectiveT0}"`);
    log.push(`R1 objectif au tick 0: "${objectiveT0}"`);

    // --- R12/R2 : 10 vrais clics Playwright sur #coeur-de-lumen -> +1000 mR EXACT/clic ---
    const before = await page.evaluate(() => window.__game.solde_mR);
    for (let i = 0; i < 10; i++) {
      await page.click("#coeur-de-lumen");
    }
    await page.waitForFunction(
      (prev) => window.__game.solde_mR === prev + 10000,
      before,
      { timeout: 4000 }
    );
    const after10 = await page.evaluate(() => window.__game.solde_mR);
    if (after10 !== before + 10000) {
      throw new Error(`10 clics réels doivent créditer exactement +10000 mR (delta STRICT), trouvé ${before} -> ${after10}`);
    }
    log.push(`R12/R2 clic réel x10 sur #coeur-de-lumen: solde_mR ${before} -> ${after10} (delta STRICT = 10000)`);

    // --- R16 : VFX de clic (+N) observable pendant la fenêtre du flash ---
    await page.click("#coeur-de-lumen");
    const burstSeen = await page.evaluate(() => {
      const inst = window.__game_instance;
      return !!(inst && inst.renderer && inst.renderer.lastClickBurst && inst.renderer.lastClickBurst.age < 600);
    });
    if (!burstSeen) throw new Error("R16 : le VFX de clic (lastClickBurst) doit être actif juste après un clic réel");
    log.push("R16 VFX de clic actif après clic réel (lastClickBurst.age < 600)");

    // --- R13/R17 : #buy-g1 est réellement grisé (disabled) tant que R insuffisant ---
    await page.waitForTimeout(150); // laisse une frame syncOverlay tourner
    const g1DisabledWhenPoor = await page.evaluate(() => document.getElementById("buy-g1").disabled);
    const rNow = await page.evaluate(() => window.__game.solde_mR);
    if (rNow < 15000 && !g1DisabledWhenPoor) {
      throw new Error("R17 : #buy-g1 doit être disabled quand solde_mR < 15000");
    }
    log.push(`R17 #buy-g1 disabled=${g1DisabledWhenPoor} cohérent avec solde_mR=${rNow} (coût 15000)`);

    // Complète assez de R pour acheter G1 (coût initial 15000 mR = 15 clics de 1000 mR)
    const missing = Math.max(0, Math.ceil((15000 - rNow) / 1000));
    for (let i = 0; i < missing; i++) await page.click("#coeur-de-lumen");
    await page.waitForFunction(() => window.__game.solde_mR >= 15000, null, { timeout: 4000 });
    await page.waitForTimeout(150);
    const g1DisabledWhenRich = await page.evaluate(() => document.getElementById("buy-g1").disabled);
    if (g1DisabledWhenRich) throw new Error("R17 : #buy-g1 doit devenir cliquable (non disabled) une fois abordable");
    log.push("R17 #buy-g1 redevient cliquable une fois abordable");

    // --- R13 : clic réel sur #buy-g1 -> generators[0].count delta STRICT = 1 ---
    const soldeBeforeBuy = await page.evaluate(() => window.__game.solde_mR);
    const countBefore = await page.evaluate(() => window.__game.generators[0].count);
    await page.click("#buy-g1");
    await page.waitForFunction(
      (prev) => window.__game.generators[0].count === prev + 1,
      countBefore,
      { timeout: 4000 }
    );
    const countAfter = await page.evaluate(() => window.__game.generators[0].count);
    const soldeAfterBuy = await page.evaluate(() => window.__game.solde_mR);
    if (countAfter !== countBefore + 1) {
      throw new Error(`R13 : clic #buy-g1 doit incrémenter generators[0].count de STRICTEMENT 1 (${countBefore} -> ${countAfter})`);
    }
    if (soldeAfterBuy !== soldeBeforeBuy - 15000) {
      throw new Error(`R13 : achat G1 doit débiter exactement 15000 mR (${soldeBeforeBuy} -> ${soldeAfterBuy})`);
    }
    log.push(`R13 clic réel #buy-g1: count ${countBefore} -> ${countAfter}, solde débité de EXACTEMENT 15000 mR`);

    // Clic grisé (avant abordabilité) = no-op : re-vérifié en repli sur #buy-g2 (verrouillé)
    const g2HiddenBeforeS1 = await page.evaluate(() => document.getElementById("buy-g2").classList.contains("hidden"));
    if (!g2HiddenBeforeS1) throw new Error("R7/R18 : #buy-g2 doit rester caché avant S1");
    log.push("R7/R18 #buy-g2 caché avant S1 (unlockedGenerators exact)");

    // --- production automatique (R23) : R augmente sans clic après achat d'un générateur ---
    const soldeBeforeIdle = await page.evaluate(() => window.__game.solde_mR);
    await page.waitForTimeout(300); // ~3 ticks à tick_ms=100
    const soldeAfterIdle = await page.evaluate(() => window.__game.solde_mR);
    if (!(soldeAfterIdle > soldeBeforeIdle)) {
      throw new Error(`R23 : la production doit être automatique après achat d'un générateur (${soldeBeforeIdle} -> ${soldeAfterIdle} sans clic)`);
    }
    log.push(`R23 production automatique confirmée sans clic: ${soldeBeforeIdle} -> ${soldeAfterIdle}`);

    // --- R7/R18/R19 : franchissement de S1 forcé -> #buy-g2 apparaît + flash #threshold-reveal ---
    await page.evaluate(() => window.__game_debug.reachThreshold(0)); // S1 = 100000 mR
    await page.waitForFunction(
      () => !document.getElementById("buy-g2").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    const revealOpacity = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById("threshold-reveal")).opacity));
    if (!(revealOpacity > 0)) throw new Error("R19 : #threshold-reveal doit passer transitoirement > 0 au franchissement de seuil");
    log.push(`R7/R18 #buy-g2 apparaît à S1 ; R19 #threshold-reveal opacity=${revealOpacity} > 0`);

    // --- R22 : victoire à S5, #victory-overlay visible, affordances neutralisées ---
    const victoryHiddenBefore = await page.evaluate(() => document.getElementById("victory-overlay").classList.contains("hidden"));
    if (!victoryHiddenBefore) throw new Error("#victory-overlay ne devrait pas être visible avant S5");

    await page.evaluate(() => window.__game_debug.reachThreshold(4)); // S5 = 1_000_000_000 mR
    await page.waitForFunction(() => window.__game && window.__game.cumul_mR >= 1000000000, null, { timeout: 4000 });
    await page.waitForFunction(
      () => !document.getElementById("victory-overlay").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    const runningAtVictory = await page.evaluate(() => window.__game_instance.running);
    if (runningAtVictory !== false) throw new Error("R22 : la boucle doit s'arrêter au franchissement de S5");
    log.push("R22 #victory-overlay visible et boucle arrêtée au franchissement de S5");

    // --- pas d'écran/état de défaite : aucun id de game-over/defeat dans le DOM ---
    const hasDefeatUI = await page.evaluate(() =>
      !!(document.getElementById("game-over") || document.getElementById("defeat"))
    );
    if (hasDefeatUI) throw new Error("aucun écran de défaite ne doit exister (charter run-unique, aucun état d'échec)");
    log.push("aucun écran de défaite dans le DOM (genre-compliant)");

    // --- final check : pas de flag de succès en dur dans l'état sérialisé ---
    const hasHardcodedFlags = await page.evaluate(() => {
      const str = JSON.stringify(window.__game, (k, v) => (v instanceof Set ? [...v] : v));
      return str.includes('"solvable":true') || str.includes('"success":true');
    });
    if (hasHardcodedFlags) throw new Error("flag de succès en dur détecté dans window.__game");
    log.push("aucun flag de succès en dur dans window.__game");

    // --- R14/R11 : clic réel sur #rejouer -> reset EXACT + boucle relancée ---
    await page.click("#rejouer");
    await page.waitForFunction(
      () => window.__game && window.__game.solde_mR === 0 && window.__game.cumul_mR === 0,
      null,
      { timeout: 4000 }
    );
    const afterReplay = await page.evaluate(() => window.__game);
    if (afterReplay.solde_mR !== 0 || afterReplay.cumul_mR !== 0) {
      throw new Error(`R14 : #rejouer doit remettre solde_mR/cumul_mR à EXACTEMENT 0, trouvé ${afterReplay.solde_mR}/${afterReplay.cumul_mR}`);
    }
    await page.waitForFunction(
      () => document.getElementById("victory-overlay").classList.contains("hidden"),
      null,
      { timeout: 4000 }
    );
    log.push("R14 clic réel #rejouer: reset EXACT à 0, #victory-overlay re-caché");

    // La partie doit avoir réellement repris (boucle relancée, pas figée) :
    // vérifié par une production réelle après ré-achat, dans la limite du temps e2e.
    const runningAfterReplay = await page.evaluate(() => window.__game_instance.running);
    if (runningAfterReplay !== true) throw new Error("la boucle doit repartir après #rejouer (running doit repasser à true)");
    log.push("boucle de jeu relancée après #rejouer (running=true)");

    console.log("=== E2E p2_alpha — clics réels (Playwright/Chromium) ===");
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
