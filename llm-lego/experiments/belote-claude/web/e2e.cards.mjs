// e2e — preuve VISUELLE du swap de cartes (Task 16, gate §4.5 : tester à taille réelle).
// Rend les 32 cartes candidates (SVG-cards LGPL) à 60 px et capture pour décision Pierre.
// Usage : node web/e2e.cards.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import { startServer } from "./e2e-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4194;
const SHOTS = join(__dirname, "e2e-shots");

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const srv = await startServer(PORT);
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-gpu"] });
  let fail = 0;
  const check = (n, ok) => { console.log(`  ${ok ? "✅" : "❌"} ${n}`); if (!ok) fail++; };
  try {
    const page = await browser.newPage({ viewport: { width: 560, height: 900 } });
    await page.goto(`http://localhost:${PORT}/assets/preview.html`, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(600);
    const count = await page.evaluate(() => window.__cardCount);
    check("32 cartes candidates rendues", count === 32);
    // le <use> externe s'est résolu → chaque svg a une bbox non vide
    const rendered = await page.$$eval(".card svg", (svgs) =>
      svgs.filter((s) => { const b = s.getBoundingClientRect(); return b.width > 10 && b.height > 10; }).length);
    check(`les figures se rendent via <use> externe (${rendered}/32 non vides)`, rendered === 32);
    await page.screenshot({ path: join(SHOTS, "cards-preview.png"), fullPage: true });
    console.log("  capture: web/e2e-shots/cards-preview.png (à juger à 60 px — décision Pierre)");
  } finally {
    await browser.close(); srv.kill();
  }
  console.log(fail === 0 ? "\nRESULT: PASS" : "\nRESULT: FAIL");
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
