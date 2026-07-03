// Central view selector validation — replaces the fixed routing/gate/looped
// buttons with one dropdown carrying démo/réel/cible maturity badges.
// Proves: old buttons gone, dropdown present, 3 badged options, each loads its
// graph + updates the "✅ … chargé" indicator, and the search/chat double-run
// (the project's critical regression) still flips on input.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });

async function openMenu() {
  // Idempotent: only click to open if the menu isn't already showing (the
  // dropdown button toggles, so a blind click could close an open menu).
  if ((await page.locator('[data-testid="example-menu"]').count()) === 0) {
    await page.getByTestId("example-dropdown").click();
  }
  await page.waitForSelector('[data-testid="example-menu"]', { timeout: 4000 });
}
async function pick(key) {
  await openMenu();
  await page.getByTestId("example-" + key).click();
}
async function statusText() { return (await page.getByTestId("status").textContent()) || ""; }

try {
  const resp = await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  log(`goto ${BASE}/builder -> HTTP ${resp?.status()}`);
  await page.waitForSelector('[data-testid="example-dropdown"]', { timeout: 20000 });

  // 1) the 3 fixed buttons no longer exist.
  const oldBtns = await page.$$eval(
    '[data-testid="btn-example"], [data-testid="btn-council-loop"], [data-testid="btn-council-gate"]',
    (els) => els.length,
  );
  check("3 fixed buttons removed (routing/looped/gate)", oldBtns === 0);
  check("dropdown selector visible in toolbar", await page.getByTestId("example-dropdown").isVisible());

  // 2) opening the dropdown shows exactly 3 options, each with a maturity badge.
  await openMenu();
  await page.waitForSelector('[data-testid="example-menu"]', { timeout: 4000 });
  const items = await page.$$eval('[data-testid="example-menu"] .pal-menu-i', (els) => els.length);
  check("dropdown lists exactly 3 options", items === 3);
  const badges = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    return {
      demo: q('[data-testid="example-routing"] .badge-demo')?.textContent,
      real: q('[data-testid="example-gate"] .badge-real')?.textContent,
      target: q('[data-testid="example-looped"] .badge-target')?.textContent,
    };
  });
  check("routing option → [démo] badge", badges.demo === "démo");
  check("gate option → [réel] badge", badges.real === "réel");
  check("looped option → [cible] badge", badges.target === "cible");
  await page.screenshot({ path: "builder_selector_dropdown.png", fullPage: false });
  log("screenshot -> builder_selector_dropdown.png (dropdown open, 3 badges)");

  // 3) selecting each option loads its graph + updates the indicator.
  await pick("gate");
  await page.waitForSelector('[data-node-id="PLAN_REVIEW"]', { timeout: 8000 });
  check("select gate v1 → graph loaded (PLAN_REVIEW node)", true);
  check("indicator shows gate v1 loaded", (await statusText()).includes("Council gate v1 chargé"));

  await pick("looped");
  await page.waitForSelector('[data-node-id="reviewer"]', { timeout: 8000 });
  check("select looped → graph loaded (reviewer node)", true);
  check("indicator shows looped loaded", (await statusText()).includes("Council looped"));
  check("button label reflects loaded example", ((await page.getByTestId("example-dropdown").textContent()) || "").includes("looped"));

  // 4) CRITICAL REGRESSION: routing double-run must still flip search -> chat.
  await pick("routing");
  await page.waitForSelector('[data-node-id="node-search"]', { timeout: 8000 });
  async function runWith(query) {
    await page.getByTestId("input-json").fill(JSON.stringify({ query }, null, 2));
    await page.getByTestId("btn-execute").click();
    await page.waitForFunction(() => {
      const steps = document.querySelectorAll('[data-testid="trace-step"]');
      const st = document.querySelector('[data-testid="status"]')?.textContent || "";
      return steps.length > 0 && !st.includes("⏳");
    }, null, { timeout: 15000 });
    return page.$$eval('[data-testid="trace-step"]', (els) => els.map((e) => e.getAttribute("data-node-id")));
  }
  const r1 = await runWith("Search for climate news");
  const r2 = await runWith("Tell me a story about a cat");
  log(`run1: ${r1.join(" -> ")} | run2: ${r2.join(" -> ")}`);
  check("REGRESSION: search branch runs node-search", r1.includes("node-search") && !r1.includes("node-chat"));
  check("REGRESSION: chat branch flips to node-chat", r2.includes("node-chat") && !r2.includes("node-search"));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n=== ALL SELECTOR CHECKS PASSED ===" : `\n=== FAILED: ${out.failed} ===`);
} catch (e) {
  out.error = String(e);
  log("💥 " + e);
} finally {
  writeFileSync("selector_validation_result.json", JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(out.pass ? 0 : 1);
}
