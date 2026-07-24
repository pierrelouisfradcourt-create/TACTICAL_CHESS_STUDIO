// Chess TCG 3D — CARTOGRAPHY pass validation (representation only, NO game code, NO LLM).
//
// Runs against a REAL-library server (like corrections-validate) because the 4 bricks
// live in the real library/ — the isolated library-test store does not contain them.
// Launched via run-chess-tcg.mjs. It proves:
//   1. the 4 representation bricks exist with the right kind/payload (Roadmap/Artefact/Goal/Chaîne);
//   2. the Wire Map llm-lego carries the cartography journal entry (entry-013, 13 total);
//   3. ZERO network call to LM Studio (:1234) / any LLM endpoint while browsing the builder,
//      and ZERO code execution (no /api/execute) — coherent with "aucune génération de jeu".
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond && !out.failed) out.failed = name; };
const api = async (p) => { const r = await fetch(BASE + p); return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) }; };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

// --- network guard: record EVERY request the page makes ----------------------
const reqUrls = [];
page.on("request", (r) => reqUrls.push(r.url()));
const isLlmCall = (u) =>
  /:1234\b/.test(u) || /\/v1\/(chat\/)?completions/.test(u) || /lmstudio|lm-studio|anthropic|openai/i.test(u);

try {
  // A) The 4 representation bricks exist in the (real) library with correct schema.
  const lib = await api("/api/library");
  const bricks = lib.json?.bricks || [];
  const byId = (id) => bricks.find((b) => b.id === id);
  check("Roadmap brick 'roadmap-chess-tcg-3d' exists (kind=roadmap)", byId("roadmap-chess-tcg-3d")?.kind === "roadmap");
  check("Artefact brick 'artefact-chess-tcg-3d' exists (kind=artefact)", byId("artefact-chess-tcg-3d")?.kind === "artefact");
  check("Goal brick 'goal-chess-tcg-3d' exists (kind=goal)", byId("goal-chess-tcg-3d")?.kind === "goal");
  check("Chaîne esquisse 'chain-chess-tcg-3d-esquisse' exists (kind=chain)", byId("chain-chess-tcg-3d-esquisse")?.kind === "chain");

  // Full docs → payload assertions.
  const roadmap = (await api("/api/library/roadmap-chess-tcg-3d")).json;
  const ms = roadmap?.payload?.milestones || [];
  check("Roadmap: 7 jalons, tous status=todo (rien de commencé)", ms.length === 7 && ms.every((m) => m.status === "todo"));
  check("Roadmap: category=produit", roadmap?.payload?.category === "produit");

  const artefact = (await api("/api/library/artefact-chess-tcg-3d")).json;
  check("Artefact: artefactType='jeu'", artefact?.payload?.artefactType === "jeu");
  check("Artefact: wiredStatus='unset' (rien n'est construit)", artefact?.wiredStatus === "unset");

  const goal = (await api("/api/library/goal-chess-tcg-3d")).json;
  check("Goal: payload.text non vide + category=produit", (goal?.payload?.text || "").length > 20 && goal?.payload?.category === "produit");

  const chain = (await api("/api/library/chain-chess-tcg-3d-esquisse")).json;
  const nodes = chain?.payload?.nodes || [];
  check("Chaîne esquisse: category=esquisse-projet + badge=demo + maturity=draft (non-exécutable)",
    chain?.payload?.category === "esquisse-projet" && chain?.badge === "demo" && chain?.maturity === "draft");
  check("Chaîne esquisse: contient un humangate (revue Pierre) + ≥5 nœuds agent DÉCRIVANT le processus",
    nodes.some((n) => n.type === "humangate") && nodes.filter((n) => n.type === "agent").length >= 5);

  // B) Wire Map journal entry for THIS cartography pass.
  const wm = await api("/api/wireframes/llm-lego");
  const entries = wm.json?.entries || [];
  const e13 = entries.find((e) => e.id === "entry-013");
  check("Wire Map llm-lego = 13 entrées (12 + cartographie)", entries.length === 13);
  check("Wire Map: entrée cartographie présente avec le bon libellé",
    !!e13 && /Cartographie Chess TCG 3D/.test(e13.function) && e13.test.status === "SKIP");

  // C) Browse the builder end-to-end → prove NO LLM call, NO execution.
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="tab-library"]', { timeout: 20000 });
  await page.getByTestId("tab-library").click();
  await page.waitForTimeout(200);
  // open the Wire Map view too (reads wireframes, never an LLM)
  await page.getByTestId("tab-wiremap").click().catch(() => {});
  await page.waitForTimeout(300);

  const llmCalls = reqUrls.filter(isLlmCall);
  const execCalls = reqUrls.filter((u) => /\/api\/execute/.test(u));
  check("ZÉRO appel réseau vers LM Studio / LLM pendant la passe", llmCalls.length === 0);
  if (llmCalls.length) log(`  LLM leaks: ${JSON.stringify(llmCalls)}`);
  check("ZÉRO exécution (/api/execute) — aucune génération déclenchée", execCalls.length === 0);
  if (execCalls.length) log(`  exec leaks: ${JSON.stringify(execCalls)}`);

  out.pass = Object.values(out.checks).every(Boolean);
  out.requestCount = reqUrls.length;
  log(out.pass ? "\n=== ALL CHESS-TCG CARTOGRAPHY CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("chess_tcg_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}
