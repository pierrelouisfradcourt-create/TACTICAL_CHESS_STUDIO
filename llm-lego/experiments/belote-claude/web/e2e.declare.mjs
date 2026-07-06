// e2e DOM — rituel d'annonces (Task 14) : bouton « Annoncer », exposition pli 2,
// et « annonce non déclarée = perdue » (sans aucune alerte). Seed 2 : l'humain a une annonce.
// Usage : node web/e2e.declare.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import { startServer, reachPlay, playOneDealDOM } from "./e2e-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4192;
const URL = `http://localhost:${PORT}/`;
const SHOTS = join(__dirname, "e2e-shots");

async function newGame(page, seed) {
  await page.evaluate(() => { window.__belote = null; });
  await page.fill("#seed", String(seed));
  await page.selectOption("#target", "501");
  await page.click("#newBtn");
  await reachPlay(page);
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const srv = await startServer(PORT);
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-gpu"] });
  let fail = 0, dialog = false;
  const check = (n, ok) => { console.log(`  ${ok ? "✅" : "❌"} ${n}`); if (!ok) fail++; };
  try {
    const page = await browser.newPage({ viewport: { width: 820, height: 780 } });
    page.on("dialog", (d) => { dialog = true; d.dismiss().catch(() => {}); }); // aucune alerte ne doit surgir

    // --- Scénario A : DÉCLARER ---
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await newGame(page, 2);
    const canA = await page.evaluate(() => window.__belote.canAnnonce);
    check("seed 2 : l'humain a une annonce à déclarer au pli 1", canA === true);
    check("le bouton « Annoncer » est visible", await page.locator("#annonceBtn:visible").count() === 1);
    const decl = await playOneDealDOM(page, { declareAnnonce: true });
    check("exposition pli 2 vue, avec cartes affichées (overlay)", decl.sawExpose && decl.exposeCards >= 3);
    const bonusDeclared = decl.lastDeal ? decl.lastDeal.annonceBonus[0] : -1;
    check(`équipe A marque son annonce quand déclarée (+${bonusDeclared})`, bonusDeclared > 0);
    await page.screenshot({ path: join(SHOTS, "declare.png") });

    // --- Scénario B : NE PAS déclarer → annonce perdue, silencieusement ---
    await newGame(page, 2);
    const noDecl = await playOneDealDOM(page, { declareAnnonce: false });
    const bonusForgotten = noDecl.lastDeal ? noDecl.lastDeal.annonceBonus[0] : -1;
    check(`équipe A ne marque PAS son annonce si non déclarée (${bonusForgotten})`, bonusForgotten === 0);
    check("aucune boîte de dialogue / alerte n'a surgi (perte silencieuse)", dialog === false);
    check("l'annonce déclarée rapporte STRICTEMENT plus que l'oubliée", bonusDeclared > bonusForgotten);
  } finally {
    await browser.close(); srv.kill();
  }
  console.log(fail === 0 ? "\nRESULT: PASS" : "\nRESULT: FAIL");
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
