// e2e DOM — RANGER ≠ JOUER (Task 13, risque UX n°1).
// Vérifie : un glisser horizontal réordonne SANS jouer ; un tap joue une carte légale ;
// l'ordre choisi survit au render suivant (le jeu ne re-trie pas).
// Usage : node web/e2e.reorder.mjs
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4191;
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
    } else await page.waitForTimeout(120);
  }
  throw new Error("jamais arrivé au tour de l'humain");
}
const domIds = (page) => page.$$eval("#hand .handcard", (els) => els.map((e) => e.dataset.cardId));
const box = async (page, sel) => (await page.locator(sel).boundingBox());

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED });
  let fail = 0;
  const check = (n, ok) => { console.log(`  ${ok ? "✅" : "❌"} ${n}`); if (!ok) fail++; };
  try {
    const page = await browser.newPage({ viewport: { width: 820, height: 780 } });
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.fill("#seed", "3");
    await page.selectOption("#target", "501");
    await page.click("#newBtn");
    await reachPlay(page);

    const before = await domIds(page);
    const handLenBefore = await page.evaluate(() => window.__belote.handCounts[0]);
    const trickBefore = await page.evaluate(() => window.__belote.trick.length);

    // 1) GLISSER HORIZONTAL : carte 0 → position de la carte 4, à y constant (dans la bande main)
    const c0 = await box(page, "#hand .handcard:nth-child(1)");
    const c4 = await box(page, "#hand .handcard:nth-child(5)");
    const y = c0.y + c0.height / 2;
    await page.mouse.move(c0.x + c0.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(c4.x + c4.width / 2, y, { steps: 14 });
    await page.mouse.up();
    await page.waitForTimeout(80);

    const after = await domIds(page);
    const handLenAfter = await page.evaluate(() => window.__belote.handCounts[0]);
    const trickAfter = await page.evaluate(() => window.__belote.trick.length);
    check("l'ordre d'affichage a changé après le glisser horizontal", JSON.stringify(after) !== JSON.stringify(before));
    check("mêmes cartes (aucune perdue) après rangement", JSON.stringify([...after].sort()) === JSON.stringify([...before].sort()));
    check("AUCUNE carte jouée par le rangement (main toujours 8)", handLenAfter === handLenBefore && handLenBefore === 8);
    check("le pli n'a pas bougé pendant le rangement", trickAfter === trickBefore);
    await page.screenshot({ path: join(SHOTS, "reorder.png") });

    // 2) TAP sur une carte légale → JOUER
    const legal = page.locator("#hand .handcard.legal").first();
    const lb = await legal.boundingBox();
    const playedId = await legal.getAttribute("data-card-id");
    await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
    await page.mouse.down();
    await page.mouse.up(); // tap immobile
    await page.waitForFunction((cid) => window.__belote && !window.__belote.hand.some((c) => c.id === cid), playedId, { timeout: 8000 });
    check("un tap sur carte légale JOUE la carte (retirée de la main)", true);

    // 3) l'ordre choisi survit : les cartes restantes gardent l'ordre réorganisé (pas de re-tri)
    const remainingExpected = after.filter((id) => id !== playedId);
    const nowDom = await domIds(page);
    check("l'ordre réorganisé survit au render suivant (le jeu ne re-trie pas)",
      JSON.stringify(nowDom) === JSON.stringify(remainingExpected));
  } finally {
    await browser.close(); srv.kill();
  }
  console.log(fail === 0 ? "\nRESULT: PASS" : "\nRESULT: FAIL");
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
