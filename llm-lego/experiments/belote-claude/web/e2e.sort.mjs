// e2e DOM — tri d'affichage de la main + préférence (Task 8).
// Vérifie : main triée par défaut (couleur), et « atouts d'abord » ouvre sur l'atout.
// Usage : node web/e2e.sort.mjs
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4190;
const URL = `http://localhost:${PORT}/`;
const SHOTS = join(__dirname, "e2e-shots");

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, "server.mjs")], {
    env: { ...process.env, BELOTE_PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("serveur trop long")), 8000);
    proc.stdout.on("data", (d) => { if (String(d).includes("interface jouable")) { clearTimeout(t); resolve(proc); } });
    proc.on("exit", (c) => reject(new Error("serveur a quitté, code " + c)));
  });
}

// Enchère : suit le conseil jusqu'à atteindre le 1er tour de l'humain (await_human).
async function reachPlay(page) {
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => window.__belote);
    if (s && s.phase === "await_human") return s;
    if (s && s.phase === "bid_await") {
      const hint = s.bidHint || { action: "pass" };
      if (hint.action === "take") {
        if (s.bidRound === 1) await page.click("#bidTake");
        else await page.click(`.bidbtn.color[data-suit="${hint.suit}"]`);
      } else await page.click("#bidPass");
      await page.waitForFunction(() => window.__belote && window.__belote.phase !== "bid_await", null, { timeout: 8000 });
    } else {
      await page.waitForTimeout(120);
    }
  }
  throw new Error("jamais arrivé au tour de l'humain");
}

const domIds = (page) => page.$$eval("#hand .handcard", (els) => els.map((e) => e.dataset.cardId));

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-gpu"] });
  let fail = 0;
  const check = (n, ok) => { console.log(`  ${ok ? "✅" : "❌"} ${n}`); if (!ok) fail++; };
  try {
    const page = await browser.newPage({ viewport: { width: 820, height: 780 } });
    // s'assurer que la préférence part de "couleur"
    await page.addInitScript(() => localStorage.setItem("belote.sortPref", "couleur"));
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.fill("#seed", "3");
    await page.selectOption("#target", "501");
    await page.click("#newBtn");
    await reachPlay(page);

    // 1) tri par défaut "couleur" : le DOM doit égaler sortHandForDisplay(main, atout, 'couleur')
    const dom = await domIds(page);
    const expected = await page.evaluate(() =>
      window.__sortHand(window.__belote.hand, window.__belote.atout, "couleur").map((c) => c.id));
    check("main triée par défaut = tri 'couleur' du moteur", JSON.stringify(dom) === JSON.stringify(expected));
    check("8 cartes affichées", dom.length === 8);

    // 2) "atouts d'abord" : la 1re carte affichée est de la couleur d'atout
    await page.selectOption("#sortPref", "atouts-d-abord");
    await page.waitForTimeout(60);
    const first = await page.evaluate(() => {
      const el = document.querySelector("#hand .handcard");
      const id = el && el.dataset.cardId;
      const c = window.__belote.hand.find((x) => x.id === id);
      return c ? c.suit : null;
    });
    const atout = await page.evaluate(() => window.__belote.atout);
    check(`« atouts d'abord » ouvre sur l'atout (${first} === ${atout})`, first === atout);

    await page.screenshot({ path: join(SHOTS, "sort.png") });
  } finally {
    await browser.close(); srv.kill();
  }
  console.log(fail === 0 ? "\nRESULT: PASS" : "\nRESULT: FAIL");
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
