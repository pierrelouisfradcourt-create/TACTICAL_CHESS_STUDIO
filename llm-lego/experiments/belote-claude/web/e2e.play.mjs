// Belote — test de bout en bout : une PARTIE COMPLÈTE jouée par de vrais clics souris
// dans un vrai navigateur (Chromium via Playwright), pas de commande tapée.
//
// Démarre le serveur, ouvre la page, clique « Nouvelle partie », puis à chaque tour de
// l'humain clique une carte légale de la main — jusqu'à la fin de partie. Vérifie que le
// score final s'affiche. Prend des captures d'écran comme preuve.
//
// Usage : node web/e2e.play.mjs   (headless par défaut ; HEADED=1 pour voir le navigateur)
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4188;
const URL = `http://localhost:${PORT}/`;
const SHOTS = join(__dirname, "e2e-shots");

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, "server.mjs")], {
    env: { ...process.env, BELOTE_PORT: String(PORT) },
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

async function playOneHuman(page) {
  const card = page.locator(".handcard.legal").first();
  await card.waitFor({ state: "visible", timeout: 8000 });
  const id = await card.getAttribute("data-card-id");
  await card.click(); // vrai clic souris
  // attendre que le coup soit pris en compte (carte retirée de la main)
  await page.waitForFunction(
    (cid) => window.__belote && !window.__belote.hand.some((c) => c.id === cid),
    id,
    { timeout: 8000 }
  );
  return id;
}

const phaseOf = (page) => page.evaluate(() => (window.__belote ? window.__belote.phase : null));

// L'"humain" enchérit en suivant le conseil (= heuristique du moteur), par vrais clics.
async function playOneBid(page) {
  const s = await page.evaluate(() => window.__belote);
  const hint = s.bidHint || { action: "pass" };
  if (hint.action === "take") {
    if (s.bidRound === 1) await page.click("#bidTake");
    else await page.click(`.bidbtn.color[data-suit="${hint.suit}"]`);
  } else {
    await page.click("#bidPass");
  }
  await page.waitForFunction(() => window.__belote && window.__belote.phase !== "bid_await", null, { timeout: 8000 });
  return hint;
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-gpu"] });
  const log = [];
  try {
    const page = await browser.newPage({ viewport: { width: 820, height: 780 } });
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERROR:", m.text()); });
    page.on("crash", () => console.log("PAGE CRASH EVENT"));
    await page.goto(URL, { waitUntil: "domcontentloaded" });

    // 1) démarrer une partie déterministe
    await page.fill("#seed", "3");
    await page.click("#newBtn");
    await page.waitForFunction(
      () => window.__belote && ["bid_await", "await_human", "bid_step"].includes(window.__belote.phase),
      null, { timeout: 8000 }
    );

    // 2) enchère + jeu, entièrement par clics
    let humanMoves = 0, humanBids = 0, iter = 0, bidShot = false, playShot = false, dealShot = false, annShot = false;
    for (;;) {
      if (++iter > 9000) throw new Error("boucle test trop longue (pas de fin de partie)");
      const s = await page.evaluate(() => window.__belote);
      const phase = s ? s.phase : null;
      if (phase === "game_over") break;

      if (phase === "bid_await") {
        if (!bidShot) {
          if (!(await page.locator("#turnup:not(.hidden)").count())) throw new Error("carte retournée non affichée");
          if (!(await page.locator("#bidbar #bidPass").count())) throw new Error("barre d'enchère absente");
          await page.screenshot({ path: join(SHOTS, "01-bidding.png") });
          bidShot = true;
          log.push(`enchère visible: carte retournée ${s.turnUp.rank}${s.turnUp.suit}, tour ${s.bidRound}`);
        }
        await playOneBid(page); humanBids++;
      } else if (phase === "await_human") {
        if (!playShot) {
          const hc = await page.locator("#hand .handcard").count();
          const lc = await page.locator("#hand .handcard.legal").count();
          if (hc === 0) throw new Error("aucune carte affichée dans la main");
          if (lc === 0) throw new Error("aucune carte légale cliquable");
          await page.screenshot({ path: join(SHOTS, "02-play.png") });
          playShot = true;
          log.push(`jeu: main ${hc} cartes, ${lc} légales`);
        }
        await playOneHuman(page); humanMoves++;
      } else if (phase === "annonce_expose") {
        if (!annShot && s.annonceExpose) {
          await page.waitForSelector("#annoncePanel:not(.hidden)", { timeout: 4000 });
          await page.screenshot({ path: join(SHOTS, "05-annonces.png") });
          annShot = true;
          const w = s.annonceExpose.winnerTeam;
          log.push(`annonce exposée: ${s.annonceExpose.best.label} → équipe ${w === 0 ? "A" : "B"} +${s.annonceExpose.bonus[w]}`);
        }
        await page.waitForTimeout(110);
      } else if (phase === "deal_done") {
        if (!dealShot) { await page.screenshot({ path: join(SHOTS, "03-deal-done.png") }); dealShot = true; }
        await page.waitForTimeout(150);
      } else {
        await page.waitForTimeout(110); // bid_step / trick_done → auto-continue du client
      }
    }

    // 3) vérifier l'affichage final
    await page.waitForSelector("#gamePanel:not(.hidden)", { timeout: 8000 });
    const finalState = await page.evaluate(() => window.__belote);
    const winnerText = (await page.locator("#gamePanel .win").innerText()).trim();
    await page.screenshot({ path: join(SHOTS, "04-game-over.png") });

    if (finalState.phase !== "game_over") throw new Error("phase finale != game_over");
    if (!(finalState.totals[0] >= 501 || finalState.totals[1] >= 501)) throw new Error("aucune équipe n'a atteint la cible");
    if (humanMoves !== finalState.dealsPlayed * 8) throw new Error(`coups humains ${humanMoves} != ${finalState.dealsPlayed}×8`);
    if (!bidShot) throw new Error("l'humain n'a jamais enchéri (phase bid_await jamais atteinte)");

    log.push(`enchères humaines (clics prendre/passer): ${humanBids}`);
    log.push(`coups humains (clics cartes): ${humanMoves}`);
    log.push(`donnes jouées: ${finalState.dealsPlayed}`);
    log.push(`score final: A=${finalState.totals[0]} B=${finalState.totals[1]} (winner ${finalState.winner})`);
    log.push(`bannière finale: "${winnerText}"`);

    console.log("=== E2E Belote — clics réels (enchère + jeu) ===");
    for (const l of log) console.log("• " + l);
    console.log("captures: web/e2e-shots/{01-bidding,02-play,03-deal-done,04-game-over}.png");
    console.log("\nRESULT: PASS");
  } finally {
    await browser.close();
    srv.kill();
  }
}

main().catch((e) => {
  console.error("\nRESULT: FAIL —", e.message);
  process.exit(1);
});
