// memory-graph-validate.mjs — preuve endpoint graphe, serveur+racines temp.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_GRAPH_PORT"] ?? "3120";
const BASE = `http://localhost:${PORT}`;
const brain = mkdtempSync(path.join(tmpdir(), "gv-brain-"));
const facts = mkdtempSync(path.join(tmpdir(), "gv-facts-"));
mkdirSync(path.join(brain, "doctrine"), { recursive: true });
writeFileSync(path.join(brain, "home.md"), "# Home\n\nvoir [[doctrine/rules]] et [[home]].", "utf-8"); // 1 lien valide + 1 self-link
writeFileSync(path.join(brain, "doctrine", "rules.md"), "# Rules\n\nfin.", "utf-8");

let pass = 0, fail = 0;
const check = (name, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${name}`); };
const j = (p) => fetch(BASE + p).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const server = spawn(process.execPath, ["demo-server.ts"], {
  cwd: __dirname, env: { ...process.env, TCS_BRAIN_DIR: brain, TCS_MEMORY_DIR: facts, PORT },
  stdio: ["ignore", "ignore", "inherit"],
});
let done = false;
function finish(code) { if (done) return; done = true; try { rmSync(brain, { recursive: true, force: true }); } catch {} try { rmSync(facts, { recursive: true, force: true }); } catch {} process.exit(code); }
function shutdown(code) {
  if (server.exitCode !== null || server.signalCode !== null) return finish(code);
  server.once("exit", () => finish(code));
  try { if (process.platform === "win32" && server.pid) spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" }); else server.kill(); } catch { return finish(code); }
  setTimeout(() => finish(code), 3000);
}

let exitCode = 0;
try {
  let ready = false;
  for (let i = 0; i < 40; i++) { try { const r = await fetch(BASE + "/api/memory"); if (r.ok) { ready = true; break; } } catch {} await new Promise((r) => setTimeout(r, 250)); }
  if (!ready) throw new Error(`serveur pas pret sur ${BASE}`);

  const g = await j("/api/memory/graph");
  check("graph 200 + forme {nodes,edges,dropped,ambiguous}", g.status === 200 && Array.isArray(g.body.nodes) && Array.isArray(g.body.edges) && typeof g.body.dropped === "number" && typeof g.body.ambiguous === "number");
  check("note sous-dossier presente comme noeud", g.body.nodes.some((n) => n.id === "brain/doctrine/rules"));
  check("arete home->doctrine/rules presente", g.body.edges.some((e) => e.source === "brain/home" && e.target === "brain/doctrine/rules"));
  check("self-link home->home absent", !g.body.edges.some((e) => e.source === e.target));

  console.log(`\n  memory-graph-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
  exitCode = fail === 0 ? 0 : 1;
} catch (e) { console.error(`  ❌ ${String((e && e.message) || e)}`); exitCode = 1; }
shutdown(exitCode);
