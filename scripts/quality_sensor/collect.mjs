// Driver de collecte du capteur qualité mécanique (advisory, hors pipeline Forge).
// Lance le jeu via son server.mjs, pilote un stimulus SEEDÉ (déterministe, non-LLM),
// mesure des signaux DÉTERMINISTES (contraste/tailles/densité/couleurs/réactivité +
// FTUE mécanique), et écrit un rapport BRUT par métrique sous lab/forge_sensors/.
// Aucun import de scripts/forge/*, aucun verdict, aucun agrégat. INTÉGRATION :
// validé par exécution réelle (le cœur pur est testé séparément : *.test.mjs).
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

import { makeInputSequence, evaluate, observation, buildReport } from "./sensor.mjs";
import {
  parseRgb, contrastRatio, emptyDensity, distinctColors, frameDiff, ftueMetrics,
} from "./analysis.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");
// playwright résolu depuis les node_modules belote-claude (réutilise l'e2e existant)
const beloteRequire = createRequire(
  join(REPO, "llm-lego", "experiments", "belote-claude", "package.json")
);
const { chromium } = beloteRequire("playwright");

// --- Configs par jeu (le driver reste agnostique ; chaque jeu déclare ses hooks) --

const CONFIGS = {
  breakout: {
    dir: join(REPO, "games", "breakout"),
    serverScript: "server.mjs",
    portEnv: "BREAKOUT_PORT",
    port: 4620,
    readyMarker: "interface jouable",
    urlPath: "/?seed=888",
    canvas: "#canvas",
    bg: [16, 16, 24], // #101018
    textTargets: ["#score", "#lives", "#level", ".hud-label", "#help", "#overlayTitle"],
    interactive: ["#restart"],
    input: { kind: "keyboard", alphabet: ["ArrowLeft", "ArrowRight"], holdMs: 120, steps: 40, seed: 1234 },
    // fns exécutées DANS le navigateur (vraies fns : Playwright sérialise leur source ;
    // aucune ne doit référencer une variable Node)
    readyFn: () => !!(window.__game && window.__game.paddle),
    sampleFn: () => { const g = window.__game; return { paddleX: g.paddle.x, score: g.score, lives: g.lives, status: g.status }; },
    forceOverlayFn: () => { const n = (window.__game && window.__game.lives) || 3; for (let i = 0; i < n; i++) window.__game_debug.loseLife(); },
    // fns exécutées dans Node sur les snapshots
    reward: (s) => s.score,
    salientChanged: (a, b) => a.paddleX !== b.paddleX || a.score !== b.score || a.lives !== b.lives,
  },

  // --- Fixtures P1 (ex-sondes P1.1, SUCCESS 2026-07-12 — promues fixtures permanentes
  // de non-régression du capteur, décision Pierre) : template breakout, seuls dir/port changent.
  p1_probe_contrast: {
    dir: join(REPO, "fixtures", "p1", "probe_contrast"),
    serverScript: "server.mjs",
    portEnv: "BREAKOUT_PORT",
    port: 4621,
    readyMarker: "interface jouable",
    urlPath: "/?seed=888",
    canvas: "#canvas",
    bg: [16, 16, 24],
    textTargets: ["#score", "#lives", "#level", ".hud-label", "#help", "#overlayTitle"],
    interactive: ["#restart"],
    input: { kind: "keyboard", alphabet: ["ArrowLeft", "ArrowRight"], holdMs: 120, steps: 40, seed: 1234 },
    readyFn: () => !!(window.__game && window.__game.paddle),
    sampleFn: () => { const g = window.__game; return { paddleX: g.paddle.x, score: g.score, lives: g.lives, status: g.status }; },
    forceOverlayFn: () => { const n = (window.__game && window.__game.lives) || 3; for (let i = 0; i < n; i++) window.__game_debug.loseLife(); },
    reward: (s) => s.score,
    salientChanged: (a, b) => a.paddleX !== b.paddleX || a.score !== b.score || a.lives !== b.lives,
  },

  p1_probe_tiny_target: {
    dir: join(REPO, "fixtures", "p1", "probe_tiny_target"),
    serverScript: "server.mjs",
    portEnv: "BREAKOUT_PORT",
    port: 4622,
    readyMarker: "interface jouable",
    urlPath: "/?seed=888",
    canvas: "#canvas",
    bg: [16, 16, 24],
    textTargets: ["#score", "#lives", "#level", ".hud-label", "#help", "#overlayTitle"],
    interactive: ["#restart"],
    input: { kind: "keyboard", alphabet: ["ArrowLeft", "ArrowRight"], holdMs: 120, steps: 40, seed: 1234 },
    readyFn: () => !!(window.__game && window.__game.paddle),
    sampleFn: () => { const g = window.__game; return { paddleX: g.paddle.x, score: g.score, lives: g.lives, status: g.status }; },
    forceOverlayFn: () => { const n = (window.__game && window.__game.lives) || 3; for (let i = 0; i < n; i++) window.__game_debug.loseLife(); },
    reward: (s) => s.score,
    salientChanged: (a, b) => a.paddleX !== b.paddleX || a.score !== b.score || a.lives !== b.lives,
  },

  p1_probe_invisible: {
    dir: join(REPO, "fixtures", "p1", "probe_invisible"),
    serverScript: "server.mjs",
    portEnv: "BREAKOUT_PORT",
    port: 4623,
    readyMarker: "interface jouable",
    urlPath: "/?seed=888",
    canvas: "#canvas",
    bg: [16, 16, 24],
    textTargets: ["#score", "#lives", "#level", ".hud-label", "#help", "#overlayTitle"],
    interactive: ["#restart"],
    input: { kind: "keyboard", alphabet: ["ArrowLeft", "ArrowRight"], holdMs: 120, steps: 40, seed: 1234 },
    readyFn: () => !!(window.__game && window.__game.paddle),
    sampleFn: () => { const g = window.__game; return { paddleX: g.paddle.x, score: g.score, lives: g.lives, status: g.status }; },
    forceOverlayFn: () => { const n = (window.__game && window.__game.lives) || 3; for (let i = 0; i < n; i++) window.__game_debug.loseLife(); },
    reward: (s) => s.score,
    salientChanged: (a, b) => a.paddleX !== b.paddleX || a.score !== b.score || a.lives !== b.lives,
  },

  p1_probe_overflow: {
    dir: join(REPO, "fixtures", "p1", "probe_overflow"),
    serverScript: "server.mjs",
    portEnv: "BREAKOUT_PORT",
    port: 4624,
    readyMarker: "interface jouable",
    urlPath: "/?seed=888",
    canvas: "#canvas",
    bg: [16, 16, 24],
    textTargets: ["#score", "#lives", "#level", ".hud-label", "#help", "#overlayTitle"],
    interactive: ["#restart"],
    input: { kind: "keyboard", alphabet: ["ArrowLeft", "ArrowRight"], holdMs: 120, steps: 40, seed: 1234 },
    readyFn: () => !!(window.__game && window.__game.paddle),
    sampleFn: () => { const g = window.__game; return { paddleX: g.paddle.x, score: g.score, lives: g.lives, status: g.status }; },
    forceOverlayFn: () => { const n = (window.__game && window.__game.lives) || 3; for (let i = 0; i < n; i++) window.__game_debug.loseLife(); },
    reward: (s) => s.score,
    salientChanged: (a, b) => a.paddleX !== b.paddleX || a.score !== b.score || a.lives !== b.lives,
  },

  p1_probe_clean: {
    dir: join(REPO, "fixtures", "p1", "probe_clean"),
    serverScript: "server.mjs",
    portEnv: "BREAKOUT_PORT",
    port: 4625,
    readyMarker: "interface jouable",
    urlPath: "/?seed=888",
    canvas: "#canvas",
    bg: [16, 16, 24],
    textTargets: ["#score", "#lives", "#level", ".hud-label", "#help", "#overlayTitle"],
    interactive: ["#restart"],
    input: { kind: "keyboard", alphabet: ["ArrowLeft", "ArrowRight"], holdMs: 120, steps: 40, seed: 1234 },
    readyFn: () => !!(window.__game && window.__game.paddle),
    sampleFn: () => { const g = window.__game; return { paddleX: g.paddle.x, score: g.score, lives: g.lives, status: g.status }; },
    forceOverlayFn: () => { const n = (window.__game && window.__game.lives) || 3; for (let i = 0; i < n; i++) window.__game_debug.loseLife(); },
    reward: (s) => s.score,
    salientChanged: (a, b) => a.paddleX !== b.paddleX || a.score !== b.score || a.lives !== b.lives,
  },

  menagerie_tactics: {
    dir: join(REPO, ".claude", "worktrees", "forge-menagerie-tactics", "games", "menagerie_tactics"),
    serverScript: "server.mjs",
    portEnv: "MENAGERIE_PORT",
    port: 4531,
    readyMarker: "interface jouable",
    urlPath: "/?seed=888",
    canvas: "#canvas",
    bg: [32, 35, 43], // #20232b
    textTargets: ["#turn", "#playerCount", "#enemyCount", "#captures", "#objective", "#legend", "#roster"],
    interactive: ["#endTurn"], // toujours visible (#restart est dans l'overlay masqué)
    input: { kind: "click", cell: 64, waitMs: 110, steps: 40, seed: 1234,
             alphabet: Array.from({ length: 64 }, (_, i) => `${i % 8},${Math.floor(i / 8)}`) },
    readyFn: () => !!(window.__game && Array.isArray(window.__game.beasts)),
    sampleFn: () => {
      const g = window.__game;
      return {
        turn: g.turn ?? null,
        enemiesAlive: g.beasts.filter((b) => b.side === "enemy" && b.active).length,
        enemiesDown: g.beasts.filter((b) => b.side === "enemy" && !b.active).length,
        playersAlive: g.beasts.filter((b) => b.side === "player" && b.active).length,
        hpSum: g.beasts.reduce((s, b) => s + (b.active ? b.hp : 0), 0),
        over: !!g.over,
      };
    },
    // pas de forceOverlayFn : #endTurn est déjà visible (mesure directe)
    reward: (s) => s.enemiesDown, // ennemis éliminés (démarre à 0, monte = progrès)
    salientChanged: (a, b) => a.hpSum !== b.hpSum || a.enemiesAlive !== b.enemiesAlive ||
                              a.playersAlive !== b.playersAlive || a.turn !== b.turn,
  },

  // Jeu ASSEMBLÉ depuis la Knowledge Base (mission ingestion). Run s10d ADVISORY :
  // le HUD (HP/TOUR/STATUT) est dessiné SUR le canvas, pas en DOM — seuls h1/.hint sont
  // du texte DOM mesurable ; #restart vit dans l'overlay (visible seulement en défaite).
  // Signal honnête sur la mismatch de genre (le capteur est calibré sur des jeux DOM).
  kb_tactics: {
    dir: join(REPO, "games", "kb_tactics"),
    serverScript: "server.mjs",
    portEnv: "KB_TACTICS_PORT",
    port: 4626,
    readyMarker: "interface jouable",
    urlPath: "/?seed=888",
    canvas: "#board",
    bg: [13, 15, 22], // #0d0f16
    textTargets: ["h1", ".hint"],
    interactive: ["#restart"],
    input: { kind: "keyboard", alphabet: ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"], holdMs: 60, steps: 40, seed: 1234 },
    readyFn: () => !!(window.__game && window.__game.player),
    sampleFn: () => { const g = window.__game; return { x: g.player.x, y: g.player.y, hp: g.player.hp, turn: g.turn, status: g.status }; },
    forceOverlayFn: () => { window.__game_debug.forceLose(); },
    reward: (s) => s.turn,
    salientChanged: (a, b) => a.x !== b.x || a.y !== b.y || a.hp !== b.hp || a.turn !== b.turn,
  },
};

async function applyInput(page, cfg, token) {
  if (cfg.input.kind === "keyboard") {
    await page.keyboard.down(token);
    await page.waitForTimeout(cfg.input.holdMs);
    await page.keyboard.up(token);
    await page.waitForTimeout(30);
  } else if (cfg.input.kind === "click") {
    const [c, r] = token.split(",").map(Number);
    const half = cfg.input.cell / 2;
    await page.locator(cfg.canvas).click({ position: { x: c * cfg.input.cell + half, y: r * cfg.input.cell + half } });
    await page.waitForTimeout(cfg.input.waitMs);
  }
}

// --- helpers navigateur -----------------------------------------------------------

function startServer(cfg) {
  const proc = spawn(process.execPath, [join(cfg.dir, cfg.serverScript)], {
    env: { ...process.env, [cfg.portEnv]: String(cfg.port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("serveur trop long")), 8000);
    proc.stdout.on("data", (d) => { if (String(d).includes(cfg.readyMarker)) { clearTimeout(t); resolve(proc); } });
    proc.on("exit", (c) => reject(new Error("serveur a quitté code " + c)));
  });
}

// pixels RGBA downsamplés du canvas (via un canvas offscreen — léger à sérialiser)
async function grabPixels(page, sel, w, h) {
  const arr = await page.evaluate(({ sel, w, h }) => {
    const c = document.querySelector(sel);
    if (!c) return null;
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    off.getContext("2d").drawImage(c, 0, 0, w, h);
    return Array.from(off.getContext("2d").getImageData(0, 0, w, h).data);
  }, { sel, w, h });
  return arr ? Uint8ClampedArray.from(arr) : null;
}

async function domTextMetrics(page, selectors) {
  return page.evaluate((sels) => {
    const opaque = (c) => c && c !== "transparent" && !/rgba\(.*,\s*0\s*\)/.test(c);
    const effBg = (el) => {
      let n = el;
      while (n) {
        const bg = getComputedStyle(n).backgroundColor;
        if (opaque(bg)) return bg;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const out = [];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) { out.push({ sel, available: false }); continue; }
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      out.push({ sel, available: true, color: cs.color, bg: effBg(el),
                 fontSize: parseFloat(cs.fontSize), w: r.width, h: r.height,
                 visible: r.width > 0 && r.height > 0 });
    }
    return out;
  }, selectors);
}

async function interactiveMetrics(page, selectors) {
  return page.evaluate((sels) => sels.map((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, available: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { sel, available: true, w: r.width, h: r.height, color: cs.color, bg: cs.backgroundColor };
  }), selectors);
}

// --- collecte principale ----------------------------------------------------------

async function collect(gameName) {
  const cfg = CONFIGS[gameName];
  if (!cfg) throw new Error("config inconnue: " + gameName);
  const outDir = join(REPO, "lab", "forge_sensors", gameName);
  const shots = join(outDir, "shots");
  await mkdir(shots, { recursive: true });

  const run = makeInputSequence(cfg.input.seed, cfg.input.steps, cfg.input.alphabet);
  const observations = [];
  const raw = [];
  const srv = await startServer(cfg);
  const browser = await chromium.launch({ headless: true, args: ["--disable-gpu", "--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 860 } });
    await page.goto(`http://localhost:${cfg.port}${cfg.urlPath}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(cfg.readyFn, null, { timeout: 8000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(shots, "01-active.png") });

    // A1 — contraste WCAG des textes toujours visibles
    const texts = await domTextMetrics(page, cfg.textTargets);
    for (const t of texts) {
      if (!t.available || !t.visible) { observations.push(rawUnavailable("A1_contrast", "readability", t.sel, join(shots, "01-active.png"))); continue; }
      const fg = parseRgb(t.color), bg = parseRgb(t.bg);
      const ratio = fg && bg ? Number(contrastRatio(fg, bg).toFixed(2)) : null;
      observations.push(observation({
        id: `A1_contrast:${t.sel}`, kind: "readability", measured: ratio,
        threshold: { value: 4.5, op: "<" }, justification: "WCAG AA texte normal = 4.5:1",
        raw: { color: t.color, bg: t.bg, fontSize: t.fontSize }, artifact: join(shots, "01-active.png"),
      }));
    }

    // A3 — densité d'écran vide (canvas) ; A4 — couleurs distinctes (signal BRUT)
    const px = await grabPixels(page, cfg.canvas, 200, 150);
    if (px) {
      const density = Number(emptyDensity(px, cfg.bg, 10).toFixed(3));
      observations.push(observation({
        id: "A3_empty_density", kind: "readability", measured: density,
        threshold: { value: 0.92, op: ">" }, justification: "hypothèse: >92% de fond = écran vide",
        raw: { downsample: "200x150", bg: cfg.bg }, artifact: join(shots, "01-active.png"),
      }));
      raw.push({ id: "A4_distinct_colors", value: distinctColors(px), note: "signal brut, sans seuil (cohérence palette = P2/art bible)" });
    }

    // A5 — débordement horizontal
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    observations.push(observation({
      id: "A5_h_overflow", kind: "readability", measured: overflow,
      threshold: { value: 0, op: ">" }, justification: "hypothèse: contenu ne doit pas déborder la fenêtre",
      raw: { scrollWidth_minus_innerWidth: overflow }, artifact: join(shots, "01-active.png"),
    }));

    // A6 — réactivité visuelle : le rendu bouge-t-il entre deux frames ?
    const f1 = await grabPixels(page, cfg.canvas, 400, 300);
    await page.waitForTimeout(200);
    const f2 = await grabPixels(page, cfg.canvas, 400, 300);
    if (f1 && f2) {
      const diff = Number(frameDiff(f1, f2).toFixed(4));
      observations.push(observation({
        id: "A6_render_alive", kind: "readability", measured: diff,
        threshold: { value: 0.001, op: "<" }, justification: "hypothèse: <0.1% de pixels changés sur 200ms = rendu figé",
        raw: { frames_200ms_apart: true }, artifact: join(shots, "01-active.png"),
      }));
    }

    // B — FTUE mécanique : stimulus seedé, échantillonnage d'état
    const samples = [];
    let prev = await page.evaluate(cfg.sampleFn);
    for (const token of run.tokens) {
      await applyInput(page, cfg, token);
      const cur = await page.evaluate(cfg.sampleFn);
      samples.push({ changed: cfg.salientChanged(prev, cur), reward: cfg.reward(cur) });
      prev = cur;
    }
    const m = ftueMetrics(samples);
    observations.push(reachObservation("B2_steps_to_first_reward", m.steps_to_first_reward,
      { value: 20, op: ">" }, "hypothèse: une récompense doit arriver en <20 inputs naïfs", join(shots, "01-active.png"), m));
    observations.push(observation({
      id: "B1_dead_input_rate", kind: "ftue", measured: Number(m.dead_input_rate.toFixed(3)),
      threshold: { value: 0.5, op: ">" }, justification: "hypothèse: >50% d'inputs sans effet = contrôles peu réactifs",
      raw: { dead_input_rate: m.dead_input_rate, steps: samples.length }, artifact: join(shots, "01-active.png"),
    }));
    observations.push(observation({
      id: "B3_longest_stall", kind: "ftue", measured: m.longest_stall,
      threshold: { value: 8, op: ">" }, justification: "hypothèse: >8 inputs consécutifs sans effet = blocage",
      raw: { longest_stall: m.longest_stall }, artifact: join(shots, "01-active.png"),
    }));

    // A2 — taille des cibles interactives (révéler l'overlay si le jeu le permet)
    if (cfg.forceOverlayFn) {
      await page.evaluate(cfg.forceOverlayFn);
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: join(shots, "02-overlay.png") });
    const inter = await interactiveMetrics(page, cfg.interactive);
    for (const it of inter) {
      if (!it.available || it.w === 0) { observations.push(rawUnavailable("A2_target_size", "readability", it.sel, join(shots, "02-overlay.png"))); continue; }
      observations.push(observation({
        id: `A2_target_size:${it.sel}`, kind: "readability", measured: Math.min(it.w, it.h),
        threshold: { value: 24, op: "<" }, justification: "hypothèse: cible interactive >= 24px (min tactile)",
        raw: { w: it.w, h: it.h }, artifact: join(shots, "02-overlay.png"),
      }));
      const fg = parseRgb(it.color), bg = parseRgb(it.bg);
      if (fg && bg) observations.push(observation({
        id: `A1_contrast:${it.sel}`, kind: "readability", measured: Number(contrastRatio(fg, bg).toFixed(2)),
        threshold: { value: 4.5, op: "<" }, justification: "WCAG AA (bouton)",
        raw: { color: it.color, bg: it.bg }, artifact: join(shots, "02-overlay.png"),
      }));
    }

    const report = buildReport({ game: gameName, run, observations, rawMeasurements: raw });
    await writeFile(join(outDir, "visual_mechanical.json"), JSON.stringify(report, null, 2), "utf-8");
    await writeFile(join(outDir, "visual_mechanical_report.md"), renderMd(report), "utf-8");
    console.log(`[${gameName}] rapport écrit : ${join(outDir, "visual_mechanical.json")}`);
    summarize(gameName, report);
    return report;
  } finally {
    await browser.close();
    srv.kill();
  }
}

// une observation "non mesurable" honnête (jamais un pass)
function rawUnavailable(id, kind, sel, artifact) {
  return { id: `${id}:${sel}`, kind, outcome: "metric_unavailable",
           measured: null, threshold: null, justification: "élément absent/masqué au moment de la mesure",
           raw: { selector: sel }, artifact };
}

// "steps to reach a good event" : null = JAMAIS atteint = signal_detected (pas unavailable)
function reachObservation(id, value, threshold, justification, artifact, m) {
  const outcome = value === null ? "signal_detected" : evaluate(value, threshold);
  return { id, kind: "ftue", outcome, measured: value,
           threshold: { value: threshold.value, op: threshold.op, status: "hypothesis" },
           justification, raw: { reached: value !== null, steps: value, ftue: m }, artifact };
}

function renderMd(r) {
  const lines = [`# Capteur qualité mécanique — ${r.game} (advisory)`, "",
    `Seed FTUE: \`${r.run.seed}\` · mode: \`${r.run.mode}\` · ${r.run.input_sequence.length} inputs (rejouable).`,
    "", "| id | outcome | mesuré | seuil(hyp.) | justification |", "|---|---|---|---|---|"];
  for (const o of r.observations) {
    const thr = o.threshold ? `${o.threshold.op} ${o.threshold.value}` : "—";
    lines.push(`| ${o.id} | ${o.outcome} | ${o.measured ?? "null"} | ${thr} | ${o.justification} |`);
  }
  lines.push("", "## Signaux bruts (sans seuil)");
  for (const rm of r.raw_measurements) lines.push(`- ${rm.id} = ${rm.value} (${rm.note})`);
  return lines.join("\n") + "\n";
}

function summarize(game, r) {
  const det = r.observations.filter((o) => o.outcome === "signal_detected");
  const abs = r.observations.filter((o) => o.outcome === "signal_absent").length;
  const un = r.observations.filter((o) => o.outcome === "metric_unavailable").length;
  console.log(`[${game}] observations: ${r.observations.length} | detected=${det.length} absent=${abs} unavailable=${un}`);
  for (const o of det) console.log(`   SIGNAL: ${o.id} = ${o.measured} (${o.threshold.op} ${o.threshold.value})`);
}

const games = process.argv.slice(2);
if (!games.length) { console.error("usage: node collect.mjs <jeu> [jeu...]"); process.exit(2); }
for (const g of games) { await collect(g); }
