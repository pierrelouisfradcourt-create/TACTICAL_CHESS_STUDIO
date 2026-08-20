// Chantier 1 — Split Active / Sandbox. Proves the two zones are the SAME component but
// fully independent, and that the Sandbox is NEVER seen by the engine:
//   - both zones render a working CanvasSurface (pose + drag in the Sandbox)
//   - a node posed in the Sandbox is ABSENT from "graphe envoyé au moteur" (toEngineGraph)
//   - posing in Active vs Sandbox lands in the right zone (focus follows last interaction)
//   - transfer Sandbox → Active moves the selection + its INTERNAL edges; an edge with only
//     one endpoint selected is DROPPED (no cross-zone orphan reaches the engine)
//   - the split bar is draggable and resizes both zones
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const out = { steps: [], checks: {}, pass: false };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = name; };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR: " + String(e)));
await page.goto(BASE + "/builder", { waitUntil: "networkidle" });

const AC = page.getByTestId("canvas-active");
const SB = page.getByTestId("canvas-sandbox");
const engine = async () => JSON.parse(await page.getByTestId("engine-graph").textContent());
const zoneNodeIds = (zone) => zone.locator("[data-node-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-node-id")));
// Focus a zone by clicking an empty spot in its .canvas (onMouseDownCapture → setFocused).
async function focusZone(zone) {
  const box = await zone.locator(".canvas").boundingBox();
  await page.mouse.click(box.x + 30, box.y + 24);
}
async function poseInto(zone, addTestid) { await focusZone(zone); await page.getByTestId(addTestid).click(); await page.waitForTimeout(120); }

try {
  check("both zones present (Active + Sandbox)", (await AC.count()) === 1 && (await SB.count()) === 1);
  check("split bar present", (await page.getByTestId("split-bar").count()) === 1);
  check("transfer control present", (await page.getByTestId("sandbox-transfer").count()) === 1);

  // ---- Sandbox is a working CanvasSurface: pose + drag ----
  await poseInto(SB, "add-llm");
  let sbIds = await zoneNodeIds(SB);
  check("pose lands in the Sandbox zone", sbIds.length === 1);
  check("nothing leaked into Active", (await zoneNodeIds(AC)).length === 0);

  // Drag the Sandbox node (works because CanvasSurface is a real instance there).
  const nbox0 = await SB.locator(`[data-node-id="${sbIds[0]}"]`).boundingBox();
  const before = await SB.locator(`[data-node-id="${sbIds[0]}"]`).evaluate((el) => el.style.left);
  await page.mouse.move(nbox0.x + nbox0.width / 2, nbox0.y + nbox0.height / 2);
  await page.mouse.down();
  await page.mouse.move(nbox0.x + nbox0.width / 2 + 120, nbox0.y + nbox0.height / 2 + 10, { steps: 10 });
  await page.mouse.up();
  const after = await SB.locator(`[data-node-id="${sbIds[0]}"]`).evaluate((el) => el.style.left);
  check("drag works inside the Sandbox", before !== after);

  // ---- Isolation: the Sandbox node is NOT in the engine graph ----
  let eg = await engine();
  check("Sandbox node ABSENT from engine graph", eg.nodes.length === 0);

  // ---- Pose into Active → shows up in engine graph; Sandbox still isolated ----
  await poseInto(AC, "add-tool");
  check("Active node present in its zone", (await zoneNodeIds(AC)).length === 1);
  eg = await engine();
  check("engine graph has ONLY the Active node", eg.nodes.length === 1 && eg.nodes[0].type === "tool");

  // ---- Transfer Sandbox → Active, internal edge preserved ----
  // Fresh Sandbox pair A→B, wired, both selected, transferred together.
  // (Clear the earlier single Sandbox node first by transferring it away is overkill; just
  // pose two more and select only those two via a marquee that also grabs the first — we
  // instead reset by working with whatever is in the Sandbox and asserting on counts.)
  await poseInto(SB, "add-llm"); // second sandbox node
  sbIds = await zoneNodeIds(SB);
  check("Sandbox now holds 2 nodes", sbIds.length === 2);
  // Separate them so handles are clickable, then wire A(right)→B(left).
  const [A, B] = sbIds;
  const drag = async (id, dx, dy) => {
    const b = await SB.locator(`[data-node-id="${id}"]`).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 8 }); await page.mouse.up();
  };
  await drag(A, -140, 0); await drag(B, 180, 0);
  const hFrom = await SB.locator(`[data-handle-node="${A}"][data-handle-side="right"]`).boundingBox();
  const hTo = await SB.locator(`[data-handle-node="${B}"][data-handle-side="left"]`).boundingBox();
  await page.mouse.move(hFrom.x + hFrom.width / 2, hFrom.y + hFrom.height / 2);
  await page.mouse.down();
  await page.mouse.move(hTo.x + hTo.width / 2, hTo.y + hTo.height / 2, { steps: 12 });
  await page.mouse.up();
  const sbEdges1 = await SB.locator('[data-testid="edge"]').count();
  check("edge drawn inside Sandbox", sbEdges1 === 1);

  // Marquee-select BOTH sandbox nodes, then transfer.
  const sbBox = await SB.locator(".canvas").boundingBox();
  await page.mouse.move(sbBox.x + 4, sbBox.y + 4);
  await page.mouse.down();
  await page.mouse.move(sbBox.x + sbBox.width - 6, sbBox.y + sbBox.height - 6, { steps: 12 });
  await page.mouse.up();
  const selCount = await SB.locator(".node.selected").count();
  check("both Sandbox nodes selected for transfer", selCount === 2);
  const acNodesBefore = (await zoneNodeIds(AC)).length;
  await page.getByTestId("sandbox-transfer").click();
  await page.waitForTimeout(150);
  check("transferred nodes left the Sandbox", (await zoneNodeIds(SB)).length === 0);
  check("transferred nodes arrived in Active", (await zoneNodeIds(AC)).length === acNodesBefore + 2);
  eg = await engine();
  const egEdges = eg.edges.length;
  check("internal edge preserved into Active engine graph", egEdges === 1);

  // ---- Orphan-edge rule: transfer only ONE end of an edge → edge dropped ----
  // Pose + separate ONE node at a time (grabbing the header) so freshly-cascaded nodes never
  // overlap when the next is dragged — otherwise the center-grab would hit the wrong node.
  const dragByHeader = async (id, dx) => {
    const b = await SB.locator(`[data-node-id="${id}"] .nhead`).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down(); await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
  };
  await poseInto(SB, "add-llm");
  const C = (await zoneNodeIds(SB))[0];
  await dragByHeader(C, -150);
  await poseInto(SB, "add-tool");
  const D = (await zoneNodeIds(SB)).find((id) => id !== C);
  await dragByHeader(D, 170);
  const hF = await SB.locator(`[data-handle-node="${C}"][data-handle-side="right"]`).boundingBox();
  const hT = await SB.locator(`[data-handle-node="${D}"][data-handle-side="left"]`).boundingBox();
  await page.mouse.move(hF.x + hF.width / 2, hF.y + hF.height / 2);
  await page.mouse.down(); await page.mouse.move(hT.x + hT.width / 2, hT.y + hT.height / 2, { steps: 12 }); await page.mouse.up();
  check("Sandbox has the C→D edge", (await SB.locator('[data-testid="edge"]').count()) === 1);
  // Select ONLY C (plain click), then transfer.
  const cbox = await SB.locator(`[data-node-id="${C}"]`).boundingBox();
  await page.mouse.click(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2);
  const selNow = await SB.locator(".node.selected").count();
  check("only one Sandbox node selected", selNow === 1);
  const egEdgesBefore = (await engine()).edges.length;
  await page.getByTestId("sandbox-transfer").click();
  await page.waitForTimeout(150);
  check("orphan edge DROPPED (not added to engine)", (await engine()).edges.length === egEdgesBefore);
  check("D stayed in the Sandbox", (await zoneNodeIds(SB)).some((id) => id === D));
  check("Sandbox has no dangling edge after transfer", (await SB.locator('[data-testid="edge"]').count()) === 0);

  // ---- Split bar drag resizes both zones ----
  const acH0 = (await AC.boundingBox()).height;
  const bar = await page.getByTestId("split-bar").boundingBox();
  await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
  await page.mouse.down();
  await page.mouse.move(bar.x + bar.width / 2, bar.y - 160, { steps: 12 });
  await page.mouse.up();
  const acH1 = (await AC.boundingBox()).height;
  check("split bar drag shrinks the Active zone", acH1 < acH0 - 60);

  check("no console / page errors", errs.length === 0);
} catch (e) {
  log("EXCEPTION: " + String(e));
  out.exception = String(e);
}

out.pass = Object.keys(out.checks).length > 0 && Object.values(out.checks).every(Boolean);
if (errs.length) out.consoleErrors = errs;
writeFileSync("sandbox_validation_result.json", JSON.stringify(out, null, 2));
log(out.pass ? "=== ALL SANDBOX CHECKS PASSED ===" : "FAIL: " + (out.failed || out.exception || "unknown"));
await browser.close();
process.exit(out.pass ? 0 : 1);
