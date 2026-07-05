// memory-validate.mjs — preuve bout-en-bout CT-4, serveur + racines TEMP (n'écrit jamais dans la vraie mémoire).
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_MEM_PORT"] ?? "3118";
const BASE = `http://localhost:${PORT}`;
const brain = mkdtempSync(path.join(tmpdir(), "mv-brain-"));
const facts = mkdtempSync(path.join(tmpdir(), "mv-facts-"));
writeFileSync(path.join(brain, "home.md"), "# Home\n#moc\n\nVoir [[doctrine]].", "utf-8");
writeFileSync(path.join(facts, "fact.md"), "---\nname: fact\nmetadata:\n  type: project\n---\nELO hybride 1211.", "utf-8");

let pass = 0, fail = 0;
// Convention run-validators : émettre ✅ par check réussi, ❌ UNIQUEMENT sur échec réel
// (le harnais compte les caractères ✅/❌ ; tout ❌ présent ⇒ suite FAIL).
const check = (name, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${name}`); };
const j = (p, opt) => fetch(BASE + p, opt).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const server = spawn(process.execPath, ["demo-server.ts"], {
  cwd: __dirname, env: { ...process.env, TCS_BRAIN_DIR: brain, TCS_MEMORY_DIR: facts, PORT },
  stdio: ["ignore", "ignore", "inherit"],
});
// Teardown robuste : sur Windows, server.kill() déclenche une assertion libuv
// (UV_HANDLE_CLOSING) → on tue l'enfant via taskkill (pas d'émulation de signal)
// et on ne process.exit() qu'une fois le handle de l'enfant réellement fermé.
let done = false;
function finish(code) {
  if (done) return; done = true;
  try { rmSync(brain, { recursive: true, force: true }); } catch {}
  try { rmSync(facts, { recursive: true, force: true }); } catch {}
  process.exit(code);
}
function shutdown(code) {
  if (server.exitCode !== null || server.signalCode !== null) return finish(code);
  server.once("exit", () => finish(code));
  try {
    if (process.platform === "win32" && server.pid) spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
    else server.kill();
  } catch { return finish(code); }
  setTimeout(() => finish(code), 3000); // fallback si l'event 'exit' ne vient pas
}

let exitCode = 0;
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(BASE + "/api/memory"); if (r.ok) { ready = true; break; } } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw new Error(`serveur pas prêt sur ${BASE}`);

  const list = await j("/api/memory");
  check("GET /api/memory couvre 2 racines", list.status === 200 && new Set(list.body.notes.map((n) => n.root)).size === 2);
  const read = await j("/api/memory/facts/fact");
  check("GET note round-trip (frontmatter+body)", read.status === 200 && read.body.type === "project" && read.body.body.includes("ELO"));
  const trav = await j("/api/memory/facts/" + encodeURIComponent("../escape"));
  check("traversée refusée (400)", trav.status === 400);
  const search = await j("/api/memory/search?q=elo");
  check("search mot-clé + snippet", search.status === 200 && search.body.hits.length === 1 && /elo/i.test(search.body.hits[0].snippet));
  const wBrain = await j("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: "brain", id: "x", body: "y", mode: "create" }) });
  check("POST brain refusé (403)", wBrain.status === 403);
  const wFacts = await j("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: "facts", id: "e2e", frontmatter: { type: "feedback" }, body: "e2e-marker", mode: "create" }) });
  check("POST facts crée la note", wFacts.status === 200 && wFacts.body.created === true);
  const onDisk = path.join(facts, "e2e.md");
  check("écriture visible sur disque (== face MCP)", existsSync(onDisk) && readFileSync(onDisk, "utf-8").includes("e2e-marker"));

  console.log(`\n  memory-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
  exitCode = fail === 0 ? 0 : 1;
} catch (e) {
  console.error(`  XX ${String((e && e.message) || e)}`);
  exitCode = 1;
}
shutdown(exitCode);
