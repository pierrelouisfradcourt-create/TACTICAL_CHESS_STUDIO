// A1 re-test EN CONDITIONS RÉELLES : live-toggle → run réel sur LM Studio local (:1234).
// Prouve que l'adaptateur réel (A1) n'est pas cassé : un run live produit une complétion
// LM Studio réelle (≠ chaîne mock), et le serveur route bien vers lmStudio(REAL).
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const PORT = "3213"; const BASE = `http://localhost:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function ready(ms=25000){const dl=Date.now()+ms;while(Date.now()<dl){try{const r=await fetch(`${BASE}/api/library`);if(r.ok)return true;}catch{}await wait(200);}return false;}
const out = { checks: {}, pass: false };
const check = (n,c)=>{out.checks[n]=!!c;console.log(`${c?"✅":"❌"} ${n}`);if(!c)out.failed=out.failed||n;};
const server = spawn(process.execPath,["demo-server.ts"],{cwd:process.cwd(),env:{...process.env,PORT},stdio:["ignore","pipe","pipe"]});
let serverLog=""; server.stdout.on("data",d=>serverLog+=d); server.stderr.on("data",d=>serverLog+=d);
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1500,height:950}});
page.on("dialog",d=>d.accept());
try{
  if(!(await ready())) throw new Error("server not ready\n"+serverLog);
  // confirm LM Studio reachable
  const models = await fetch("http://localhost:1234/v1/models").then(r=>r.json()).catch(()=>null);
  check("LM Studio :1234 joignable (qwen2.5-14b présent)", !!models && JSON.stringify(models).includes("qwen2.5-14b"));
  await page.goto(`${BASE}/builder`,{waitUntil:"load",timeout:20000});
  await page.waitForSelector('[data-testid="add-llm"]',{timeout:20000});
  await page.getByTestId("btn-clear").click();
  // one llm node with a small prompt
  await page.getByTestId("add-llm").click();
  const id = await page.evaluate(()=>window.__ui.nodes.slice(-1)[0].id);
  await page.locator(`[data-node-id="${id}"]`).click({position:{x:8,y:8}});
  // give the node a real prompt by attaching a library prompt brick (llm-attach-prompt)
  await page.waitForSelector('[data-testid="llm-attach-prompt"]',{timeout:5000});
  const opts = await page.$$eval('[data-testid="llm-attach-prompt"] option', os=>os.map(o=>({v:o.value,t:o.textContent})));
  const target = opts.find(o=>/fusion diff-based/.test(o.t)) || opts.find(o=>o.v);
  await page.getByTestId("llm-attach-prompt").selectOption(target.v);
  await page.waitForSelector('[data-testid="llm-attached-prompt"]',{timeout:4000});
  check("A1: prompt réel attaché au nœud (data.prompt non vide)", await page.evaluate((i)=>{const n=window.__ui.nodes.find(x=>x.id===i);return String(n?.data?.prompt||"").length>0;}, id));
  // check the A1 live toggle
  await page.getByTestId("live-toggle").check();
  const live = await page.getByTestId("live-toggle").isChecked();
  check("A1: live-toggle coché (opt-in exécution réelle)", live);
  // execute (real)
  await page.getByTestId("btn-execute").click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-testid="trace-step"]').length>0 && !((document.querySelector('[data-testid="status"]')?.textContent||"").includes("⏳")),null,{timeout:60000});
  const state = await page.getByTestId("state-output").textContent();
  const notMock = !/mock completion for/.test(state||"");
  check("A1: le run réel ne renvoie PAS la complétion mock", notMock);
  check("A1: état final non vide (complétion LM Studio réelle)", (state||"").length > 20);
  await wait(500);
  const routedReal = /adapter=lmStudio\(REAL\)/.test(serverLog) || /live=true/.test(serverLog);
  check("A1: serveur a routé vers lmStudio(REAL) (log live=true)", routedReal);
  out.stateSample = (state||"").slice(0,300);
  out.pass = !out.failed;
  console.log(out.pass ? "\n=== A1 RE-TEST RÉEL: PASS ===" : `\n=== A1 FAILED: ${out.failed} ===`);
}catch(e){ out.error=String(e); console.log("EXCEPTION:",out.error); }
finally{
  await page.screenshot({path:"builder_a1_retest.png"}).catch(()=>{});
  await browser.close(); server.kill(); await wait(600);
  writeFileSync("a1_retest_result.json", JSON.stringify(out,null,2));
  process.exit(out.pass?0:1);
}
