// e2e DOM — belote/rebelote manuelles (Task 15) : oubli = perdu (+0), déclarée = +20.
// Seed 9 : l'humain (siège 0) détient Roi+Dame d'atout.
// Usage : node web/e2e.belote.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import { startServer, reachPlay, playOneDealDOM } from "./e2e-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4193;
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
  let fail = 0;
  const check = (n, ok) => { console.log(`  ${ok ? "✅" : "❌"} ${n}`); if (!ok) fail++; };
  try {
    const page = await browser.newPage({ viewport: { width: 820, height: 780 } });
    await page.goto(URL, { waitUntil: "domcontentloaded" });

    // Scénario OUBLI : jouer R/D d'atout sans cliquer → +0
    await newGame(page, 9);
    const forgotten = await playOneDealDOM(page, { declareBelote: false });
    const belForgotten = forgotten.lastDeal ? forgotten.lastDeal.score.belote[0] : -1;
    check(`belote OUBLIÉE → +0 (score.belote[0] = ${belForgotten})`, belForgotten === 0);

    // Scénario DÉCLARÉE : cliquer Belote puis Rebelote au bon moment → +20
    await newGame(page, 9);
    const declared = await playOneDealDOM(page, { declareBelote: true });
    const belDeclared = declared.lastDeal ? declared.lastDeal.score.belote[0] : -1;
    check(`belote DÉCLARÉE → +20 (score.belote[0] = ${belDeclared})`, belDeclared === 20);
    await page.screenshot({ path: join(SHOTS, "belote.png") });
  } finally {
    await browser.close(); srv.kill();
  }
  console.log(fail === 0 ? "\nRESULT: PASS" : "\nRESULT: FAIL");
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
