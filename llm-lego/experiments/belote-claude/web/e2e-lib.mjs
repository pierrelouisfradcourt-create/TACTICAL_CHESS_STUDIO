// Helpers partagés pour les e2e DOM (démarrage serveur, enchère, jeu d'une donne).
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function startServer(port) {
  const proc = spawn(process.execPath, [join(__dirname, "server.mjs")], {
    env: { ...process.env, BELOTE_PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("serveur trop long")), 8000);
    proc.stdout.on("data", (d) => { if (String(d).includes("interface jouable")) { clearTimeout(t); resolve(proc); } });
    proc.on("exit", (c) => reject(new Error("serveur a quitté, code " + c)));
  });
}

// Suit l'enchère (conseil) jusqu'au 1er tour de l'humain.
export async function reachPlay(page) {
  for (let i = 0; i < 60; i++) {
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

// Joue UNE donne entière par clics DOM, avec hooks de déclaration. Retourne des observations.
// hooks: { declareAnnonce, declareBelote } (bool). Renvoie { lastDeal, sawExpose, exposeCards }.
export async function playOneDealDOM(page, { declareAnnonce = false, declareBelote = false } = {}) {
  let sawExpose = false, exposeCards = 0, guard = 0;
  const startDeals = await page.evaluate(() => window.__belote.dealsPlayed);
  for (;;) {
    if (++guard > 4000) throw new Error("donne trop longue");
    const s = await page.evaluate(() => window.__belote);
    if (!s) { await page.waitForTimeout(60); continue; }
    if (s.phase === "game_over") break;
    if (s.phase === "deal_done") { // capturé une fois : la donne vient de se terminer
      return { lastDeal: s.lastDeal, sawExpose, exposeCards };
    }
    if (s.phase === "bid_await") {
      const hint = s.bidHint || { action: "pass" };
      if (hint.action === "take") {
        if (s.bidRound === 1) await page.click("#bidTake");
        else await page.click(`.bidbtn.color[data-suit="${hint.suit}"]`);
      } else await page.click("#bidPass");
      await page.waitForFunction(() => window.__belote && window.__belote.phase !== "bid_await", null, { timeout: 8000 }).catch(() => {});
    } else if (s.phase === "await_human") {
      if (s.trickIndex === 0 && s.canAnnonce && declareAnnonce) await page.click("#annonceBtn");
      const card = page.locator("#hand .handcard.legal").first();
      await card.waitFor({ state: "visible", timeout: 8000 });
      const id = await card.getAttribute("data-card-id");
      await card.click();
      await page.waitForFunction((cid) => window.__belote && !window.__belote.hand.some((c) => c.id === cid), id, { timeout: 8000 }).catch(() => {});
      if (declareBelote) {
        const v = await page.evaluate(() => window.__belote);
        if (v.canBelote) await page.click("#beloteBtn");
        else if (v.canRebelote) await page.click("#rebeloteBtn");
      }
    } else if (s.phase === "annonce_expose") {
      sawExpose = true;
      exposeCards = await page.locator("#annoncePanel .card").count();
      await page.waitForFunction(() => window.__belote && window.__belote.phase !== "annonce_expose", null, { timeout: 8000 }).catch(() => {});
    } else {
      await page.waitForTimeout(90); // bid_step / trick_done → auto-continue du client
    }
    if ((await page.evaluate(() => window.__belote.dealsPlayed)) > startDeals) {
      const s2 = await page.evaluate(() => window.__belote);
      return { lastDeal: s2.lastDeal || (s2.deals && s2.deals[startDeals]), sawExpose, exposeCards };
    }
  }
  const end = await page.evaluate(() => window.__belote);
  return { lastDeal: end.deals && end.deals[startDeals], sawExpose, exposeCards };
}
