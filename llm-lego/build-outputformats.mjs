// build-outputformats.mjs — seed the 3 "Sortie attendue" (kind:"outputformat") bricks,
// CONSTRUIT À LA SOURIS (Playwright UI). Persists into the REAL library/ (like the
// autopilot bricks), self-launching demo-server on an isolated port pointed at library/.
//
// HARD CONSTRAINT: the 3 bricks are created via UI gestures only (click / selectOption /
// fill / lib-save). No direct POST /api/library for content. Idempotent by NAME: a brick
// already present is left as-is, never duplicated. Read-only GET /api/library for checks.
//
// Usage:  node build-outputformats.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_OF_PORT"] ?? "3211";
const BASE = `http://localhost:${PORT}`;
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (p) => { const r = await fetch(BASE + p); return r.ok ? r.json() : null; };
const bricks = async () => (await getJson("/api/library"))?.bricks || [];
const byName = async (name) => (await bricks()).find((b) => b.name === name);

async function ready(ms = 25000) { const dl = Date.now() + ms; while (Date.now() < dl) { try { const r = await fetch(`${BASE}/api/library`); if (r.ok) return true; } catch {} await wait(200); } return false; }

// --- launch demo-server on the REAL library (no LEGO_LIBRARY_DIR override) -----
const server = spawn(process.execPath, ["demo-server.ts"], { cwd: __dirname, env: { ...process.env, PORT }, stdio: ["ignore", "pipe", "pipe"] });
let serverErr = ""; server.stderr.on("data", (d) => (serverErr += d)); server.stdout.on("data", () => {});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on("dialog", (d) => d.accept());

async function openLibraryNew(kindTestid) {
  await page.getByTestId("tab-library").click();
  await page.getByTestId("lib-new").click();
  await page.getByTestId(kindTestid).click();
  await page.waitForSelector('[data-testid="lib-editor"]', { timeout: 5000 });
}
async function setName(name) { await page.getByTestId("lib-name").fill(name); }
async function setBadge(b) { await page.getByTestId("lib-badge").selectOption(b); }
async function setMaturity(m) { await page.getByTestId("lib-maturity").selectOption(m); }
async function setSourceRef(s) { await page.getByTestId("lib-sourceref").fill(s); }
async function save() { await page.getByTestId("lib-save").click(); await page.waitForTimeout(400); }

// A brick is created only if no brick with this name exists yet (idempotent).
async function ensureBrick(name, build) {
  if (await byName(name)) { log(`↺ « ${name} » déjà présent — réutilisé`); return; }
  await build();
  await save();
}

try {
  if (!(await ready())) throw new Error("server not ready\n" + serverErr);
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="add-agent"]', { timeout: 20000 });

  // ── Brique 1 — Texte libre ────────────────────────────────────────────────
  await ensureBrick("Texte libre", async () => {
    await openLibraryNew("lib-new-outputformat");
    await setName("Texte libre");
    await setBadge("demo"); await setMaturity("draft");
    await page.getByTestId("lib-of-formatType").selectOption("free-text");
    await page.getByTestId("lib-of-description").fill("Description en prose de ce que l'agent doit produire : le résultat, ses limites, et les étapes de test à suivre.");
  });

  // ── Brique 2 — Structuré ──────────────────────────────────────────────────
  await ensureBrick("Structuré", async () => {
    await openLibraryNew("lib-new-outputformat");
    await setName("Structuré");
    await setBadge("demo"); await setMaturity("saved");
    await page.getByTestId("lib-of-formatType").selectOption("structured");
    await page.getByTestId("lib-of-outputFormat").selectOption("json");
    await page.getByTestId("lib-of-schema").fill('{"result": "string", "ok": "boolean", "notes": "string"}');
  });

  // ── Brique 3 — 3-Verdicts (canonique TCS) ─────────────────────────────────
  await ensureBrick("3-Verdicts (canonique TCS)", async () => {
    await openLibraryNew("lib-new-outputformat");
    await setName("3-Verdicts (canonique TCS)");
    await setBadge("real"); await setMaturity("saved");
    await setSourceRef("run_chain.py:48-56 (REQUIRED_FINAL_REPORT_FIELDS) + autopilot.py");
    // Selecting this template auto-seeds the canonical software/evidence/claim fields.
    await page.getByTestId("lib-of-formatType").selectOption("structured-verdicts");
    await page.waitForSelector('[data-testid="lib-of-verdicts"]', { timeout: 4000 });
  });

  // ── Verify the 3 bricks persisted in the real library/ --------------------
  await page.getByTestId("tab-library").click();
  const all = await bricks();
  const ofs = all.filter((b) => b.kind === "outputformat");
  check("Bibliothèque contient ≥ 3 briques kind:outputformat", ofs.length >= 3);
  for (const nm of ["Texte libre", "Structuré", "3-Verdicts (canonique TCS)"]) {
    const b = ofs.find((x) => x.name === nm);
    check(`brique « ${nm} » persistée (kind=outputformat)`, !!b);
    if (b) {
      const full = await getJson("/api/library/" + b.id);
      check(`  « ${nm} » payload.formatType présent`, !!full?.payload?.formatType);
      if (nm === "3-Verdicts (canonique TCS)") {
        const names = (full?.payload?.fields || []).map((f) => f.name);
        check("  3-Verdicts porte software_verdict/evidence_verdict/claim_verdict",
          names.includes("software_verdict") && names.includes("evidence_verdict") && names.includes("claim_verdict"));
        check("  claim_verdict autorise NO_CLAIM_ALLOWED",
          (full.payload.fields.find((f) => f.name === "claim_verdict")?.values || []).includes("NO_CLAIM_ALLOWED"));
      }
    }
  }

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== 3 BRIQUES OUTPUTFORMAT PRÊTES ===" : `\n=== FAILED at: ${out.failed} ===`);
} catch (e) {
  out.error = String(e && e.stack ? e.stack : e);
  log("EXCEPTION: " + out.error);
} finally {
  await browser.close();
  server.kill();
  await wait(600);
  writeFileSync(path.join(__dirname, "outputformat_seed_result.json"), JSON.stringify(out, null, 2));
  process.exit(out.pass ? 0 : 1);
}
