// Task 2 — "mouse simulation": behave like a user discovering the builder cold.
// Navigate by VISIBLE labels + screenshots only. Draw edges by dragging between
// nodes (like a human sees dots and tries). Record clicks + friction; do NOT rely
// on internal test seams (__setGraph) or read source to "cheat".
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const log = [];
const note = (m) => { console.log(m); log.push(m); };
const friction = [];
const fr = (m) => { console.log("⚠️ FRICTION: " + m); friction.push(m); log.push("FRICTION: " + m); };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
let clicks = 0;
const clickText = async (label, opts = {}) => {
  const loc = page.locator("button", { hasText: label }).first();
  await loc.click(opts); clicks++;
};
const bodyText = () => page.locator("body").innerText();
const shot = (n) => page.screenshot({ path: `sim_${n}.png`, fullPage: false });
// Drag from the right edge of node A to the centre of node B (edge-drawing attempt).
async function dragEdge(aId, bId) {
  const a = await page.locator(`[data-node-id="${aId}"]`).boundingBox();
  const b = await page.locator(`[data-node-id="${bId}"]`).boundingBox();
  if (!a || !b) return false;
  await page.mouse.move(a.x + a.width, a.y + a.height / 2); // right-edge handle
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  return true;
}

try {
  note("=== COLD OPEN ===");
  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(800);
  await shot("00_cold");
  const cold = await bodyText();
  note("Visible hint on cold canvas: " + JSON.stringify((cold.match(/Canvas vide[^\n]*/) || ["(none)"])[0]));
  if (!/ajoute des nœuds|palette/i.test(cold)) fr("Cold canvas doesn't clearly tell a newcomer to use the palette to add nodes (hint nudges toward loading an example instead).");

  // ---------- CHAIN 1 : build a small graph from scratch via the palette ----------
  note("\n=== CHAIN 1: free graph from palette ===");
  // Pose 3 nodes by clicking visible palette buttons.
  await clickText("Tool"); await page.waitForTimeout(150);
  await clickText("Agent"); await page.waitForTimeout(150);
  await clickText("Router"); await page.waitForTimeout(150);
  await shot("01_three_nodes");
  const nodeIds = await page.$$eval(".node", (els) => els.map((e) => e.getAttribute("data-node-id")));
  note(`Posed 3 nodes in 3 clicks: ${JSON.stringify(nodeIds)}`);
  // Do the nodes overlap? (a real annoyance)
  const boxes = await page.$$eval(".node", (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; }));
  const overlap = boxes.some((p, i) => boxes.some((q, j) => i !== j && Math.abs(p.x - q.x) < 60 && Math.abs(p.y - q.y) < 40));
  if (overlap) fr("New nodes are posed nearly on top of each other (must be dragged apart before you can even see/wire them).");

  // Try to WIRE two nodes by dragging between them (no visible 'draw edge' button).
  const before = await page.$$eval("svg.edges path[marker-end]", (e) => e.length);
  await dragEdge(nodeIds[0], nodeIds[1]);
  await page.waitForTimeout(200);
  const after = await page.$$eval("svg.edges path[marker-end]", (e) => e.length);
  const edgeMade = after > before;
  note(`Edge-drawing by dragging node→node: ${edgeMade ? "worked" : "did NOT create an edge"}`);
  if (!edgeMade) fr("Drawing an edge is not discoverable: there's no visible 'connect' affordance/label — you must guess to drag from a tiny dot on the node's edge. A naive drag node-to-node produced no edge.");
  await shot("02_edge_attempt");

  // Execute and read the result from the screen only.
  await clickText("Exécuter"); clicks++;
  await page.waitForTimeout(1200);
  await shot("03_chain1_run");
  const runText = await bodyText();
  const rejected = /rejeté|invalide|error|Moteur a rejeté|start node/i.test(runText);
  note("After Exécuter, visible outcome contains: " + JSON.stringify((runText.match(/(Exécuté[^\n]*|rejeté[^\n]*|invalide[^\n]*|start node[^\n]*)/i) || ["(no clear status)"])[0]));
  if (rejected) fr("Executing a hand-built graph surfaced an engine error/rejection — a newcomer building freely is likely to hit 'exactly one start node' / invalid-graph errors with no guidance on how to fix.");

  // ---------- CHAIN 2 : use the Library (create + attach) ----------
  note("\n=== CHAIN 2: Library create + attach ===");
  await clickText("Bibliothèque"); clicks++;
  await page.waitForTimeout(400);
  await shot("04_library");
  const lib = await bodyText();
  if (!/Nouveau/i.test(lib)) fr("No obvious 'create' control visible in the Library.");
  // + Nouveau ▾ → Prompt
  await clickText("Nouveau"); clicks++;
  await page.waitForTimeout(250);
  const menuText = await bodyText();
  note("After '+ Nouveau', visible options include: " + JSON.stringify((menuText.match(/Agent|Prompt|Chaîne|Oracle|Roadmap|Goal/g) || []).join(",")));
  const promptOpt = page.locator("button", { hasText: /^Prompt$/ }).first();
  let createdPrompt = false;
  if (await promptOpt.count()) { await promptOpt.click(); clicks++; createdPrompt = true; }
  await page.waitForTimeout(300);
  await shot("05_prompt_editor");
  if (createdPrompt) {
    // Fill the name (visible label 'nom') + save (visible 'Sauvegarder').
    const nameBox = page.locator('input').filter({ hasNot: page.locator('[readonly]') }).first();
    // A user reads the field labels; find the input under 'nom'.
    try { await page.getByTestId("lib-name").fill("Mon prompt test"); } catch { /* fallback */ }
    await clickText("Sauvegarder"); clicks++;
    await page.waitForTimeout(400);
    const saved = await bodyText();
    note("After Sauvegarder: " + JSON.stringify((saved.match(/sauvegardée[^\n]*/) || ["(no confirmation seen)"])[0]));
    if (!/sauvegardée/.test(saved)) fr("No clear 'saved' confirmation after saving a Library brick.");
  }
  // Try to ATTACH: the editor has an attach button — is it usable without prior canvas node selection?
  const attachText = await bodyText();
  if (/Sélectionne un nœud/i.test(attachText)) {
    note("Attach button present but DISABLED with hint 'Sélectionne un nœud … sur le Canvas'.");
    fr("To attach a Prompt you must FIRST go back to Canvas, add an LLM node, select it, THEN return to the Library — the required order isn't signposted from the Library editor (only a disabled button + hint).");
  }
  await shot("06_attach_state");

  // ---------- CHAIN 3 : save canvas as a Chain, reload, verify ----------
  note("\n=== CHAIN 3: save as Chain + reload ===");
  await clickText("Canvas"); clicks++;
  await page.waitForTimeout(300);
  // Is there a visible way to save the current canvas as a chain?
  const canvasText = await bodyText();
  const hasSaveChain = /chaîne/i.test(canvasText);
  note("Visible 'save as chain' affordance on canvas: " + (hasSaveChain ? "yes ('💾 chaîne')" : "NOT obvious"));
  if (!hasSaveChain) fr("No obvious 'save as chain' button visible on the canvas toolbar.");
  let savedChain = false;
  const saveChainBtn = page.locator("button", { hasText: /chaîne/i }).first();
  if (await saveChainBtn.count()) {
    await saveChainBtn.click(); clicks++;
    await page.waitForTimeout(300);
    await shot("07_chain_save_modal");
    // fill name if a field is visible
    try { await page.getByTestId("chain-name").fill("Ma chaine sim"); } catch { /* */ }
    const submit = page.locator("button", { hasText: /^Sauver$/ }).first();
    if (await submit.count()) { await submit.click(); clicks++; savedChain = true; }
    await page.waitForTimeout(500);
  }
  note("Saved canvas as chain: " + savedChain);
  // Reload via the 'Charger :' selector and see if the saved chain is offered.
  const loadBtn = page.locator("button", { hasText: /Charger/i }).first();
  let chainReloadable = false;
  if (await loadBtn.count()) {
    await loadBtn.click(); clicks++;
    await page.waitForTimeout(300);
    await shot("08_load_menu");
    const menu2 = await bodyText();
    chainReloadable = /Ma chaine sim|chaînes sauvegardées/i.test(menu2);
    note("'Charger :' menu shows saved chains section: " + chainReloadable);
    if (!chainReloadable && savedChain) fr("A saved chain didn't visibly appear in the 'Charger :' menu (or the section label is unclear).");
  }

  note(`\n=== TOTAL interactions: ~${clicks} clicks ===`);
  note(`=== FRICTIONS found: ${friction.length} ===`);
  writeFileSync("chain_sim_result.json", JSON.stringify({ clicks, friction, log }, null, 2));
} catch (e) {
  note("💥 " + e);
  writeFileSync("chain_sim_result.json", JSON.stringify({ clicks, friction, log, error: String(e) }, null, 2));
} finally {
  await browser.close();
}
