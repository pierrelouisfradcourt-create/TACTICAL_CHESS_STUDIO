// e2e.mjs — click-through NAVIGATEUR RÉEL (Playwright/chromium). Pilote l'UI par de
// VRAIS clics souris (canvas + boutons) une partie COMPLÈTE jusqu'à la VICTOIRE :
// déplacement, attaque (PV ennemi baisse), CAPTURE par encerclement (compteur 0->>=1),
// victoire réelle — puis prouve le chemin DÉFAITE via window.__game_debug + #restart.
// Conforme à scripts/forge/contracts/PLAYABLE_CONTRACT.md, câblé dans run-oracle.mjs.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const CELL = 64;
const PORT = 4531;
const SEED = 888; // prouvé gagnable+capturable par la politique un-clic (cf. solvability)
const URL = `http://localhost:${PORT}/?seed=${SEED}`;
const SHOTS = join(__dirname, "e2e-shots");

function startServer() {
  const proc = spawn(process.execPath, [join(__dirname, "server.mjs")], {
    env: { ...process.env, MENAGERIE_PORT: String(PORT) },
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

const center = (c) => c * CELL + CELL / 2;

// Politique un-clic pour UNE bête (calculée côté page depuis window.__game) : mêmes
// décisions que le bot de solvabilité, exprimées en cases cliquables.
function beastActionInPage() {
  return (arg) => {
    const id = arg.id;
    const pounce = arg.pounce; // décision de fondre, calculée UNE fois par tour (état de début de tour)
    const g = window.__game;
    const b = g.beasts.find((x) => x.id === id && x.active);
    if (!b) { return null; }
    const enemies = g.beasts.filter((e) => e.active && e.side === "enemy");
    const occupied = new Set(g.beasts.filter((z) => z.active).map((z) => z.x + "," + z.y));
    const inB = (x, y) => x >= 0 && x < g.width && y >= 0 && y < g.height;
    const wall = (x, y) => g.terrain[y] && g.terrain[y][x] === "wall";
    const bestCell = (tx, ty, avoid) => {
      let best = { x: b.x, y: b.y, d: Math.abs(b.x - tx) + Math.abs(b.y - ty) };
      for (let y = 0; y < g.height; y++) {
        for (let x = 0; x < g.width; x++) {
          const md = Math.abs(b.x - x) + Math.abs(b.y - y);
          const free = md === 0 || (!occupied.has(x + "," + y) && !wall(x, y) && inB(x, y));
          // évite les cases interdites (ex. adjacentes à la cible de capture pendant le staging)
          const banned = avoid && (Math.abs(x - avoid.x) + Math.abs(y - avoid.y)) <= avoid.r;
          if (md <= b.move && free && !banned) {
            const d = Math.abs(x - tx) + Math.abs(y - ty);
            if (d < best.d) { best = { x, y, d }; }
          }
        }
      }
      return best;
    };
    const near = (pool) => {
      let best = null;
      for (const e of pool) {
        const d = Math.abs(e.x - b.x) + Math.abs(e.y - b.y);
        if (best === null || d < best.d || (d === best.d && e.id < best.e.id)) { best = { e, d }; }
      }
      return best ? best.e : null;
    };
    const mobile = enemies.filter((e) => e.move > 0);
    if (mobile.length > 0) {
      const t = near(mobile);
      const c = bestCell(t.x, t.y);
      const canHit = Math.abs(c.x - t.x) + Math.abs(c.y - t.y) <= b.range;
      return { select: [b.x, b.y], move: [c.x, c.y], attack: canHit ? [t.x, t.y] : null };
    }
    const weakList = enemies.filter((e) => e.move === 0 && e.hp < g.captureThreshold);
    if (weakList.length > 0) {
      const w = weakList[0];
      const enc = [[w.x + 1, w.y], [w.x - 1, w.y], [w.x, w.y + 1], [w.x, w.y - 1]]
        .filter(([x, y]) => inB(x, y) && !wall(x, y));
      // staging + pounce : les 2 encercleurs se postent hors de portée puis fondent le
      // MÊME tour (décision `pounce` calculée une fois/tour), sinon la cible attaque un
      // encercleur isolé et meurt de la riposte.
      const stage = enc.map(([x, y]) => [x + (x - w.x), y + (y - w.y)]);
      const players = g.beasts.filter((z) => z.active && z.side === "player");
      const idx = players.findIndex((z) => z.id === id);
      const n = Math.min(2, enc.length);
      if (idx > -1 && idx < n) {
        // pounce : on marche sur l'enc (adjacent). staging : on évite toute case
        // adjacente à la cible (rayon 1) pour ne jamais être un encercleur isolé.
        const c = pounce ? bestCell(enc[idx][0], enc[idx][1]) : bestCell(stage[idx][0], stage[idx][1], { x: w.x, y: w.y, r: 1 });
        return { select: [b.x, b.y], move: [c.x, c.y] };
      }
    }
    return { select: [b.x, b.y] };
  };
}

async function clickCell(page, x, y) {
  await page.locator("#canvas").click({ position: { x: center(x), y: center(y) } });
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-gpu"] });
  const log = [];
  try {
    const page = await browser.newPage({ viewport: { width: 620, height: 760 } });
    page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
    page.on("console", (m) => { if (m.type() === "error") { console.log("CONSOLE.ERROR:", m.text()); } });

    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__game && Array.isArray(window.__game.beasts), null, { timeout: 8000 });

    const enemyHpStart = await page.evaluate(() => {
      const g = window.__game;
      return g.beasts.filter((b) => b.side === "enemy").reduce((s, b) => s + b.hp, 0);
    });

    // --- Partie COMPLÈTE au clic jusqu'à la victoire ---
    let sawAttack = false;
    let sawCapture = false;
    let firstMove = null;
    for (let round = 0; round < 24; round++) {
      const over = await page.evaluate(() => window.__game.over);
      if (over) { break; }
      const ids = await page.evaluate(() => window.__game.beasts.filter((b) => b.active && b.side === "player").map((b) => b.id));
      // Décision de fondre : calculée UNE fois par tour depuis l'état de DÉBUT de tour,
      // pour que les 2 encercleurs pouncent ENSEMBLE (jamais un encercleur isolé).
      const pounce = await page.evaluate(() => {
        const g = window.__game;
        const enemies = g.beasts.filter((e) => e.active && e.side === "enemy");
        if (enemies.some((e) => e.move > 0)) { return false; } // pas encore la phase de capture
        const w = enemies.filter((e) => e.move === 0 && e.hp < g.captureThreshold)[0];
        if (!w) { return false; }
        const enc = [[w.x + 1, w.y], [w.x - 1, w.y], [w.x, w.y + 1], [w.x, w.y - 1]]
          .filter(([x, y]) => x >= 0 && x < g.width && y >= 0 && y < g.height && g.terrain[y][x] !== "wall");
        const stage = enc.map(([x, y]) => [x + (x - w.x), y + (y - w.y)]);
        const players = g.beasts.filter((z) => z.active && z.side === "player");
        const n = Math.min(2, enc.length);
        for (let i = 0; i < n; i++) {
          const p = players[i];
          const atPost = p && ((p.x === stage[i][0] && p.y === stage[i][1]) || (p.x === enc[i][0] && p.y === enc[i][1]));
          if (!atPost) { return false; }
        }
        return true;
      });
      for (const id of ids) {
        const enemyHpBefore = await page.evaluate(() => window.__game.beasts.filter((b) => b.side === "enemy" && b.active).reduce((s, b) => s + b.hp, 0));
        const action = await page.evaluate(beastActionInPage(), { id, pounce });
        if (!action) { continue; }
        await clickCell(page, action.select[0], action.select[1]);
        if (action.move && (action.move[0] !== action.select[0] || action.move[1] !== action.select[1])) {
          await clickCell(page, action.move[0], action.move[1]);
          if (!firstMove) {
            const moved = await page.evaluate((mid) => { const b = window.__game.beasts.find((x) => x.id === mid); return { x: b.x, y: b.y }; }, id);
            firstMove = `bête ${id} déplacée au clic -> (${moved.x},${moved.y})`;
          }
        }
        if (action.attack) {
          await clickCell(page, action.attack[0], action.attack[1]);
          const enemyHpAfter = await page.evaluate(() => window.__game.beasts.filter((b) => b.side === "enemy" && b.active).reduce((s, b) => s + b.hp, 0));
          if (enemyHpAfter < enemyHpBefore) { sawAttack = true; }
        }
      }
      await page.click("#endTurn");
      const capturesNow = await page.evaluate(() => window.__game.captures);
      if (capturesNow >= 1) { sawCapture = true; }
      if (process.env.E2E_TRACE) {
        const snap = await page.evaluate(() => window.__game.beasts.map((x) => `${x.side[0]}${x.id}@${x.x},${x.y}h${x.hp}${x.active ? "" : "X"}${x.captured ? "C" : ""}`).join(" "));
        console.log(`r${round} pounce=${pounce ? 1 : 0} cap=${capturesNow} | ${snap}`);
      }
    }

    const end = await page.evaluate(() => ({ over: window.__game.over, won: window.__game.won, captures: window.__game.captures, playerActive: window.__game.playerActive, enemyActive: window.__game.enemyActive }));
    if (!firstMove) { throw new Error("aucun déplacement au clic observé"); }
    if (!sawAttack) { throw new Error("aucune attaque observée (PV ennemi jamais réduit par un clic)"); }
    if (end.captures < 1) { throw new Error(`aucune capture observée (captures=${end.captures}, over=${end.over}, won=${end.won}, joueurs=${end.playerActive}, ennemis=${end.enemyActive})`); }
    if (!end.over || !end.won) { throw new Error(`victoire non atteinte au clic (over=${end.over}, won=${end.won})`); }
    const enemyHpEnd = await page.evaluate(() => window.__game.beasts.filter((b) => b.side === "enemy" && b.active).reduce((s, b) => s + b.hp, 0));
    log.push(firstMove);
    log.push(`attaque prouvée: PV ennemis totaux ${enemyHpStart} -> ${enemyHpEnd}`);
    log.push(`capture prouvée: ${end.captures} bête(s) capturée(s) au clic`);
    log.push(`victoire réelle au clic: over=${end.over}, won=${end.won}`);

    // OBJECTIF de campagne (#5) : le nœud est une bataille CAPTURE ; il doit être ATTEINT.
    const obj = await page.evaluate(() => window.__objective);
    if (obj.status !== "won") { throw new Error(`objectif de campagne non atteint : ${obj.status}`); }
    const title = await page.locator("#overlayTitle").innerText();
    if (!title.includes("OBJECTIF") && !title.includes("VICTOIRE") && !title.includes("RÉGION")) {
      throw new Error(`overlay de fin de nœud inattendu : "${title}"`);
    }
    log.push(`objectif de campagne atteint (${title})`);
    await page.screenshot({ path: join(SHOTS, "01-objective.png") });

    // PAYOFF (#4) + anti-snowball (#5) : la capture rejoint la RÉSERVE (pas encore le
    // roster), et la campagne AVANCE de nœud.
    const meta = await page.evaluate(() => window.__meta);
    if (meta.reserve.filter((r) => r.species === "roncier").length < 1) {
      throw new Error(`capture non versée en réserve (reserve=${meta.reserve.length})`);
    }
    const runState = await page.evaluate(() => window.__run);
    if (runState.position === "n1") { throw new Error("la campagne n'a pas avancé après l'objectif"); }
    log.push(`payoff: capture en réserve (anti-snowball) ; campagne avance -> ${runState.position}`);

    // « Continuer » -> nœud suivant déployé.
    await page.click("#restart");
    await page.waitForFunction(() => window.__game.over === false && window.__game.turn === 1, null, { timeout: 4000 });
    const next = await page.evaluate(() => ({ over: window.__game.over, turn: window.__game.turn, pos: window.__run.position }));
    if (next.over !== false || next.turn !== 1) { throw new Error(`nœud suivant invalide: ${JSON.stringify(next)}`); }
    log.push(`nœud suivant déployé: ${next.pos}, tour=${next.turn}`);

    // --- Chemin DÉFAITE via hook debug (assertion STRICTE : DÉFAITE, won=false) ---
    const hiddenBefore = await page.evaluate(() => document.getElementById("overlay").classList.contains("hidden"));
    if (!hiddenBefore) { throw new Error("l'overlay ne devrait pas être visible après restart"); }
    await page.evaluate(() => window.__game_debug.hit());
    await page.waitForFunction(() => window.__game.over === true, null, { timeout: 4000 });
    await page.waitForFunction(() => !document.getElementById("overlay").classList.contains("hidden"), null, { timeout: 4000 });
    const defeat = await page.evaluate(() => ({ won: window.__game.won, title: document.getElementById("overlayTitle").textContent }));
    if (defeat.won !== false || !defeat.title.includes("DÉFAITE")) {
      throw new Error(`défaite forcée invalide: won=${defeat.won}, titre="${defeat.title}" (attendu DÉFAITE)`);
    }
    log.push(`défaite forcée: won=false, overlay="${defeat.title}"`);
    await page.screenshot({ path: join(SHOTS, "02-defeat.png") });

    console.log("=== E2E Menagerie Tactics — partie complète au clic (victoire + capture) ===");
    for (const l of log) { console.log("• " + l); }
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
