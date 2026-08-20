// Phase 3 — REAL UX validation via Playwright (DOM-level, not just HTTP 200).
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

try {
  // 1. open the real page over http://
  const resp = await page.goto(BASE, { waitUntil: "load", timeout: 15000 });
  log(`goto ${BASE} -> HTTP ${resp?.status()}`);

  // 2. click "Charger exemple", verify the graph textarea fills
  await page.getByRole("button", { name: /Charger exemple/ }).click();
  await page.waitForFunction(() => document.getElementById("graphInput")?.value.includes("node-analyzer"), null, { timeout: 5000 });
  const graphVal = await page.locator("#graphInput").inputValue();
  log(`after Charger exemple: graphInput length=${graphVal.length}, has node-analyzer=${graphVal.includes("node-analyzer")}`);

  // 3. click "Exécuter", wait for results to render
  await page.getByRole("button", { name: /Exécuter/ }).click();
  await page.waitForFunction(() => {
    const r = document.getElementById("results");
    const s = document.getElementById("stateOutput");
    return r && r.style.display !== "none" && s && s.textContent && s.textContent.length > 20;
  }, null, { timeout: 15000 });

  // 4. read what is ACTUALLY rendered in the DOM
  const stateText = await page.locator("#stateOutput").textContent();
  const traceText = await page.locator("#traceOutput").textContent();
  const statusText = await page.locator("#status").textContent();
  log(`#status = ${JSON.stringify(statusText)}`);
  log(`#stateOutput length=${stateText?.length}`);
  log(`#traceOutput length=${traceText?.length}`);

  const checks = {
    "state shows node-analyzer": stateText?.includes("node-analyzer"),
    "state shows node-search": stateText?.includes("node-search"),
    "state shows routeKey": stateText?.includes("routeKey"),
    "trace shows node-search step": traceText?.includes("node-search"),
    "trace shows exact-match reason": traceText?.includes("exact-match"),
    "trace did NOT take node-chat": !traceText?.includes("node-chat"),
    "no console errors": consoleErrors.length === 0,
  };
  for (const [k, v] of Object.entries(checks)) log(`  [${v ? "OK" : "XX"}] ${k}`);
  out.checks = checks;
  out.consoleErrors = consoleErrors;
  out.stateExcerpt = stateText?.slice(0, 400);
  out.traceExcerpt = traceText?.replace(/\s+/g, " ").slice(0, 400);

  // 5. persistent screenshot
  await page.screenshot({ path: "ux_validation_screenshot.png", fullPage: true });
  log("screenshot saved -> ux_validation_screenshot.png");

  out.pass = Object.values(checks).every(Boolean);
  log(`\nUX VALIDATION: ${out.pass ? "PASS" : "FAIL"}`);
} catch (err) {
  out.error = String(err);
  log(`UX VALIDATION ERROR: ${err}`);
  try { await page.screenshot({ path: "ux_validation_screenshot.png", fullPage: true }); } catch {}
} finally {
  await browser.close();
  writeFileSync("ux_validation_result.json", JSON.stringify(out, null, 2));
}
process.exit(out.pass ? 0 : 1);
