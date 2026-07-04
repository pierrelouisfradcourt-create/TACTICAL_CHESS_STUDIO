// Nœud "chat" — conversation multi-tours entre 2 voix LLM (2 Qwen, personas distincts).
// Prouve : pose UI, config inspecteur, run MOCK (transcript [mock], zéro appel réel), run RÉEL
// (LM Studio, transcript alterné A/B), plafond maxTurns, arrêt propre si LM Studio injoignable.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env["BASE"] ?? "http://localhost:3000";
const DOWN_BASE = process.env["CHAT_DOWN_BASE"]; // serveur avec LMSTUDIO_URL mort (optionnel)
const out = { steps: [], checks: {}, pass: false, transcripts: {} };
const log = (m) => { console.log(m); out.steps.push(m); };
const check = (name, cond) => { out.checks[name] = !!cond; log(`${cond ? "✅" : "❌"} ${name}`); if (!cond) out.failed = out.failed || name; };

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

const chatOut = () => page.evaluate(() => {
  const r = window.__result && window.__result();
  const c = window.__ui.nodes.find((n) => n.type === "chat");
  return r && r.state && c ? r.state.nodes[c.id] : null;
});
const setLive = (on) => page.evaluate((v) => {
  const cb = document.querySelector('[data-testid="live-toggle"]');
  if (cb && cb.checked !== v) cb.click();
}, on);

try {
  await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
  await page.waitForSelector('[data-testid="btn-organic"]', { timeout: 20000 });

  // ── 1. Poser un nœud chat + configurer via l'inspecteur ──
  await page.getByTestId("add-chat").click();
  await page.waitForTimeout(300);
  const chatId = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "chat").id);
  await page.evaluate((id) => window.__selectNode(id), chatId);
  await page.waitForTimeout(200);
  check("inspecteur chat ouvert (topic, voix A/B, maxTurns)", await page.evaluate(() =>
    !!document.querySelector('[data-testid="inspector-chat"]') &&
    !!document.querySelector('[data-testid="chat-topic"]') &&
    !!document.querySelector('[data-testid="chat-voiceA"]') &&
    !!document.querySelector('[data-testid="chat-voiceB"]') &&
    !!document.querySelector('[data-testid="chat-maxturns"]')));
  await page.fill('[data-testid="chat-topic"]', "Faut-il ajouter un HumanGate avant chaque merge ?");
  await page.fill('[data-testid="chat-voiceA-name"]', "Optimiste");
  await page.fill('[data-testid="chat-voiceA-persona"]', "Tu es optimiste et orienté solutions : tu défends l'automatisation et la vitesse.");
  await page.fill('[data-testid="chat-voiceB-name"]', "Critique");
  await page.fill('[data-testid="chat-voiceB-persona"]', "Tu es critique et cherches les failles : tu insistes sur les risques et le contrôle humain.");
  await page.fill('[data-testid="chat-maxturns"]', "4");
  await page.waitForTimeout(200);
  await page.screenshot({ path: "chat_inspector_config.png" });
  check("nœud chat visuel distinct sur le canvas (bulles A ⇄ B)", await page.evaluate((id) =>
    !!document.querySelector(`[data-testid="chat-body-${id}"] .chat-bubble-a`) &&
    !!document.querySelector(`[data-testid="chat-body-${id}"] .chat-bubble-b`), chatId));

  // ── 2. Plafond maxTurns : 99 → plafonné à 12 proprement ──
  await page.fill('[data-testid="chat-maxturns"]', "99");
  await page.waitForTimeout(150);
  const cap = await page.evaluate(() => window.__ui.nodes.find((n) => n.type === "chat").data.maxTurns);
  check("maxTurns au-delà du plafond → plafonné à 12", cap === 12);
  await page.fill('[data-testid="chat-maxturns"]', "4"); // remets 4 pour la suite
  await page.waitForTimeout(150);

  // ── 3. MODE MOCK : transcript minimal labellisé [mock], pas de vraie conversation ──
  await setLive(false);
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => {
    const r = window.__result && window.__result();
    return r && r.state && Object.keys(r.state.nodes).length > 0;
  }, null, { timeout: 15000 });
  const mock = await chatOut();
  out.transcripts.mock = mock && mock.transcript;
  check("MOCK : transcript produit, flag mock=true", !!mock && mock.mock === true && Array.isArray(mock.transcript) && mock.transcript.length >= 1);
  check("MOCK : chaque message labellisé [mock] (zéro appel réel par construction)", !!mock && mock.transcript.every((m) => /\[mock\]/.test(m.text)));
  await page.evaluate((id) => window.__selectNode(id), chatId);
  await page.waitForTimeout(200);
  check("MOCK : transcript consultable dans l'inspecteur (voix identifiées)", await page.evaluate(() =>
    document.querySelectorAll('[data-testid="chat-transcript"] .chat-msg').length >= 1 &&
    !!document.querySelector('[data-testid="chat-msg-0"][data-voice="A"]')));
  await page.screenshot({ path: "chat_mock_transcript.png" });

  // ── 4. MODE RÉEL (LM Studio) : conversation alternée A/B, contenu cohérent ──
  await setLive(true);
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(() => {
    const r = window.__result && window.__result();
    if (!r || !r.state) return false;
    const c = window.__ui.nodes.find((n) => n.type === "chat");
    const o = c && r.state.nodes[c.id];
    return o && Array.isArray(o.transcript) && o.transcript.length >= 2 && o.mock !== true;
  }, null, { timeout: 90000 });
  const real = await chatOut();
  out.transcripts.real = real && real.transcript;
  const tr = (real && real.transcript) || [];
  check("RÉEL : transcript ≥ 2 échanges, NON mock", tr.length >= 2 && real.mock !== true);
  check("RÉEL : voix alternées A/B", tr.length >= 2 && tr[0].voice === "A" && tr[1].voice === "B");
  check("RÉEL : contenu non vide et non-[mock] pour chaque tour", tr.every((m) => m.text && m.text.trim().length > 0 && !/\[mock\]/.test(m.text)));
  check("RÉEL : respecte le plafond maxTurns=4 (≤ 4 échanges)", tr.length <= 4);
  // Transcript imprimé pour vérification HUMAINE du contenu (persona-cohérence).
  log("\n──── TRANSCRIPT RÉEL (vérification humaine du contenu) ────");
  tr.forEach((m) => log(`  [${m.voice}] ${m.name}: ${String(m.text).slice(0, 220)}`));
  log("──────────────────────────────────────────────────────────\n");
  await page.evaluate((id) => window.__selectNode(id), chatId);
  await page.waitForTimeout(200);
  await page.screenshot({ path: "chat_real_transcript.png" });

  // ── 5. LM STUDIO ÉTEINT (serveur avec LMSTUDIO_URL mort) : arrêt propre, message clair ──
  if (DOWN_BASE) {
    const graph = { nodes: [{ id: "c", type: "chat", data: { topic: "X", voiceA: { name: "A" }, voiceB: { name: "B" }, maxTurns: 6 } }], edges: [] };
    const t0 = Date.now();
    const res = await (await fetch(DOWN_BASE + "/api/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ graph, initialInput: {}, live: true }) })).json();
    const dt = Date.now() - t0;
    const o = (res.trace || []).find((s) => s.nodeId === "c");
    const otr = (o && o.output && o.output.transcript) || [];
    check("ÉTEINT : arrêt PROPRE (stoppedReason=error, message clair, pas de blocage)",
      o && o.output && o.output.stoppedReason === "error" && otr.length >= 1 && /indisponible|unreachable|LM Studio/i.test(otr[0].text) && dt < 20000);
    log(`   (LM Studio éteint : arrêt en ${dt}ms, message: "${otr[0] ? otr[0].text.slice(0, 80) : ""}")`);
  } else {
    log("ℹ️ CHAT_DOWN_BASE non fourni — cas « LM Studio éteint » couvert par Vitest (chat.test.ts).");
  }

  check("aucune erreur console/page pendant le parcours", errs.length === 0);
  if (errs.length) log("ERRORS: " + JSON.stringify(errs.slice(0, 4)));

  out.pass = Object.values(out.checks).every(Boolean);
  log(out.pass ? "\n✅ CHAT — tous les checks passent" : `\n❌ CHAT — échec: ${out.failed}`);
} catch (e) {
  out.error = String((e && e.stack) || e);
  log("💥 " + out.error);
} finally {
  await browser.close();
  writeFileSync("chat_validation_result.json", JSON.stringify(out, null, 2));
  log(`checks: ${Object.values(out.checks).filter(Boolean).length}/${Object.keys(out.checks).length}`);
  process.exit(out.pass ? 0 : 1);
}
