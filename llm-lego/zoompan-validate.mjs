// Canvas Zoom/Pan (Chantier 2) + alternative edge styles (Chantier 3) — DOM-level UX proof.
//
// Chantier 2:
//   - zoom controls (+/-/reset) present; wheel/buttons scale the WORLD, not the pointer math
//   - a node's on-screen size grows on zoom-in; drag + marquee still work at zoom != 1
//   - Space+drag pans (scrollLeft changes) WITHOUT changing zoom
//   - a 6-node graph becomes fully visible once zoomed out (no scroll needed)
// Chantier 3:
//   - an edge with no visualStyle renders as "arrow" (retro-compat)
//   - the 3 styles select + render differently (dash / animated class)
//   - visualStyle NEVER reaches the engine graph
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR: " + String(e)));

await page.goto(BASE + "/builder", { waitUntil: "networkidle" });

// The builder now has TWO canvas zones (Active + Sandbox), each with its own zoom/world.
// Scope every zoom/world/.canvas query to the ACTIVE zone so testids don't collide.
const A = page.getByTestId("canvas-active");
const canvasEl = A.locator(".canvas");
const loadExample = async (key) => { await page.getByTestId("example-dropdown").click(); await page.getByTestId("example-" + key).click(); };
const zlvl = async () => (await A.getByTestId("zoom-level").textContent()).trim();
const resetScroll = () => canvasEl.evaluate((el) => { el.scrollLeft = 0; el.scrollTop = 0; });

try {
  // ---------------- Chantier 2 — zoom / pan ----------------
  check("zoom-controls present", (await A.getByTestId("zoom-controls").count()) === 1);
  check("world-scale wrapper present", (await A.getByTestId("world-scale").count()) === 1);
  check("default zoom = 100%", (await zlvl()) === "100%");

  // Fresh node at top-left (60,50) → predictable, stays reachable after scroll-reset.
  await page.getByTestId("add-llm").click();
  const nid = await page.$eval("[data-node-id]", (el) => el.getAttribute("data-node-id"));
  await resetScroll();
  const w0 = (await page.locator(`[data-node-id="${nid}"]`).boundingBox()).width;

  await A.getByTestId("zoom-in").click();
  await A.getByTestId("zoom-in").click();
  const zin = await zlvl();
  check("zoom-in raises level above 100%", parseInt(zin, 10) > 100);
  const zoomAttr = Number(await A.getByTestId("world-scale").getAttribute("data-zoom"));
  check("world-scale reflects zoom via transform", zoomAttr > 1.3 && zoomAttr < 1.6);
  await resetScroll();
  const w1 = (await page.locator(`[data-node-id="${nid}"]`).boundingBox()).width;
  check("zoom-in enlarges node on screen", w1 > w0 + 5);

  // Drag still works at zoom != 1 (toCanvas divides by zoom, so the node tracks the cursor).
  // Grab the node by its OVERALL CENTRE — clear of the 4 edge handles, whose generous
  // hit-rings scale with the node and would otherwise start an edge-draw near the top edge.
  await resetScroll();
  const before = await page.$eval(`[data-node-id="${nid}"]`, (el) => ({ l: el.style.left, t: el.style.top }));
  const nbox = await page.locator(`[data-node-id="${nid}"]`).boundingBox();
  const gx = nbox.x + nbox.width / 2, gy = nbox.y + nbox.height / 2;
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  await page.mouse.move(gx + 140, gy + 90, { steps: 12 });
  await page.mouse.up();
  const after = await page.$eval(`[data-node-id="${nid}"]`, (el) => ({ l: el.style.left, t: el.style.top }));
  check("node drag works at zoom != 1", after.l !== before.l || after.t !== before.t);

  // Marquee multi-select works at zoom != 1: pose a 2nd node, rubber-band both on empty space.
  await page.getByTestId("add-tool").click();
  await resetScroll();
  const cbox = await canvasEl.boundingBox();
  await page.mouse.move(cbox.x + 8, cbox.y + 8);
  await page.mouse.down();
  await page.mouse.move(cbox.x + cbox.width - 20, cbox.y + cbox.height - 20, { steps: 15 });
  await page.mouse.up();
  const selCount = await page.$$eval(".node.selected", (els) => els.length);
  check("marquee multi-select works at zoom != 1", selCount >= 2);

  // Pan: Space+drag changes scrollLeft but NOT zoom.
  const zBeforePan = await zlvl();
  const sl0 = await canvasEl.evaluate((el) => el.scrollLeft);
  await page.keyboard.down("Space");
  await page.mouse.move(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cbox.x + cbox.width / 2 - 220, cbox.y + cbox.height / 2 - 60, { steps: 12 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  const sl1 = await canvasEl.evaluate((el) => el.scrollLeft);
  check("pan (Space+drag) changes scrollLeft", Math.abs(sl1 - sl0) > 20);
  check("pan keeps zoom unchanged", (await zlvl()) === zBeforePan);

  // Reset.
  await A.getByTestId("zoom-reset").click();
  check("reset → 100%", (await zlvl()) === "100%");

  // Zoom-out fits a 6-node graph fully in the viewport (the idea→IMP-scale scenario).
  await loadExample("looped");
  await page.waitForSelector("[data-node-id]");
  for (let i = 0; i < 7; i++) await A.getByTestId("zoom-out").click();
  const cbox2 = await canvasEl.boundingBox();
  const boxes = await page.$$eval("[data-node-id]", (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }));
  const allVisible = boxes.length > 0 && boxes.every((b) => b.l >= cbox2.x - 1 && b.r <= cbox2.x + cbox2.width + 1 && b.t >= cbox2.y - 1 && b.b <= cbox2.y + cbox2.height + 1);
  check("6-node graph fully visible when zoomed out", boxes.length >= 6 && allVisible);
  await A.getByTestId("zoom-reset").click();

  // ---------------- Chantier 3 — edge visual styles ----------------
  await loadExample("routing");
  await page.waitForSelector('[data-testid="edge"]');
  const styleOf = () => page.locator('[data-testid="edge"] path[data-edge-style]').first().getAttribute("data-edge-style");
  const dashOf = () => page.locator('[data-testid="edge"] path[data-edge-style]').first().getAttribute("stroke-dasharray");

  check("edge without visualStyle renders as arrow (retro-compat)", (await styleOf()) === "arrow");
  const dashArrow = await dashOf();

  // Select the first edge via its mid-handle (plain click = select, no bend).
  await page.getByTestId("edge-mid").first().click();
  check("edge-style picker present in inspector", (await page.getByTestId("edge-style").count()) === 1);
  check("default active style = arrow", (await page.getByTestId("edge-style-arrow").getAttribute("data-active")) === "1");

  await page.getByTestId("edge-style-chain").click();
  check("chain style applied", (await styleOf()) === "chain");
  const dashChain = await dashOf();
  check("chain dash differs from arrow", !!dashChain && dashChain !== dashArrow);

  await page.getByTestId("edge-style-stream").click();
  check("stream style applied", (await styleOf()) === "stream");
  check("stream uses animated CSS class", (await page.locator("path.edge-stream").count()) >= 1);

  const eg = await page.getByTestId("engine-graph").textContent();
  check("visualStyle NEVER reaches engine graph", !eg.includes("visualStyle"));

  await page.getByTestId("edge-style-arrow").click();
  check("switch back to arrow", (await styleOf()) === "arrow");

  check("no console / page errors", errs.length === 0);
} catch (e) {
  log("EXCEPTION: " + String(e));
  out.exception = String(e);
}

out.pass = Object.keys(out.checks).length > 0 && Object.values(out.checks).every(Boolean);
if (errs.length) out.consoleErrors = errs;
writeFileSync("zoompan_validation_result.json", JSON.stringify(out, null, 2));
log(out.pass ? "PASS" : "FAIL: " + (out.failed || out.exception || "unknown"));
await browser.close();
process.exit(out.pass ? 0 : 1);
