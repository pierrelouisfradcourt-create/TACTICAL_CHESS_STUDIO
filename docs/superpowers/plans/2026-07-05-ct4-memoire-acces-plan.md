# CT-4 — Couche d'accès mémoire — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exposer les 2 racines mémoire (`studio_brain/` + `memory/`) via une face HTTP dans `demo-server.ts` et une face MCP filesystem, avec une vue « Mémoire » de preuve dans `builder.html`.

**Architecture:** Une lib pure `memory-store.mjs` (racines injectées) lit/liste/cherche/écrit les notes markdown des 2 racines. `demo-server.ts` monte les routes `/api/memory[...]` dessus (même origine que `builder.html`). Config MCP filesystem pour Claude Desktop. Vue « Mémoire » lecture seule dans le builder.

**Tech Stack:** Node ESM (`.mjs`, pas de build), `node:http`/`node:fs`/`node:path`, React (babel inline dans builder.html), vitest, MCP `@modelcontextprotocol/server-filesystem`.

## Global Constraints

- `src/` (moteur Rust) et `llm-lego/src/` (moteur TS) **intacts** — CT-4 ne touche que `demo-server.ts`, `builder.html`, un nouveau `memory-store.mjs`, un `tests/memory.test.ts`, un `memory-validate.mjs`, et la config MCP.
- **Aucun commit sans go explicite de Pierre** (règle CLAUDE.md). Les steps « Commit » sont préparés mais **exécutés seulement sur gate Pierre**.
- `encoding: "utf-8"` explicite sur tout `readFileSync`/`writeFileSync`.
- **Vault humain `brain` en lecture seule via HTTP** (POST root=brain → 403).
- **Anti-traversée** : `id` validé `^[A-Za-z0-9._-]+$`, refus de `..`, chemin résolu borné sous la racine.
- Racines surchargables par env `TCS_BRAIN_DIR` / `TCS_MEMORY_DIR` (pour tests isolés).
- Régression de sortie : `run-validators.mjs` 741 ✅ + `vitest` 56 ✅ restent verts.

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `llm-lego/memory-store.mjs` | Lib pure : parse/list/read/search/write des notes, garde-fous | Créer |
| `llm-lego/tests/memory.test.ts` | Tests unitaires de la lib (racines = dirs temp) | Créer |
| `llm-lego/demo-server.ts` | Monte `/api/memory[...]` sur la lib + config `MEM_ROOTS` | Modifier |
| `llm-lego/builder.html` | Vue « Mémoire » (modale lecture seule) + bouton toolbar | Modifier |
| `llm-lego/memory-validate.mjs` | Validateur bout-en-bout (serveur temp + racines temp) | Créer |
| `%APPDATA%\Claude\claude_desktop_config.json` | 2 entrées MCP filesystem (brain, facts) | Modifier (merge) |

---

## Task 1 — Lib mémoire `memory-store.mjs` (U1)

**Files:**
- Create: `llm-lego/memory-store.mjs`
- Test: `llm-lego/tests/memory.test.ts`

**Interfaces:**
- Produces:
  - `parseNote(text) → { frontmatter, tags:string[], type:string|null, title:string|null, wikilinks:string[], body:string }`
  - `listNotes(roots) → { roots, notes: {root,id,relpath,title,tags,type,mtimeMs}[] }`
  - `readNote(roots, root, id) → {root,id,relpath,frontmatter,tags,type,title,wikilinks,body,mtimeMs}` (throws `.status` 400/404)
  - `searchNotes(roots, q, rootFilter="all") → { q, hits:{root,id,title,snippet,score}[] }`
  - `writeNote(roots, {root,id,frontmatter,body,mode}) → {ok,root,id,relpath,created}` (throws `.status` 400/403/404/409)
  - `roots` shape: `{ brain:absPath, facts:absPath }`

- [ ] **Step 1: Write the failing tests** — `llm-lego/tests/memory.test.ts`

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseNote, listNotes, readNote, searchNotes, writeNote } from "../memory-store.mjs";

let roots: { brain: string; facts: string };
beforeEach(() => {
  const brain = mkdtempSync(path.join(tmpdir(), "brain-"));
  const facts = mkdtempSync(path.join(tmpdir(), "facts-"));
  writeFileSync(path.join(brain, "000_HOME.md"), "# 🧠 Home\n#moc #reference\n\nVoir [[doctrine/studio-doctrine]].", "utf-8");
  writeFileSync(path.join(facts, "proj.md"), "---\nname: proj\nmetadata:\n  type: project\n---\n\nELO hybride 1211.", "utf-8");
  roots = { brain, facts };
});
afterEach(() => { rmSync(roots.brain, { recursive: true, force: true }); rmSync(roots.facts, { recursive: true, force: true }); });

it("parseNote extrait frontmatter, tags inline, wikilinks, titre", () => {
  const p = parseNote("# 🧠 Home\n#moc #reference\n\nVoir [[a/b]] et [[c|alias]].");
  expect(p.title).toBe("🧠 Home");
  expect(p.tags).toEqual(["moc", "reference"]);
  expect(p.wikilinks).toEqual(["a/b", "c"]);
});
it("parseNote lit metadata.type du frontmatter", () => {
  const p = parseNote("---\nname: proj\nmetadata:\n  type: project\n---\nbody");
  expect(p.type).toBe("project");
  expect(p.title).toBe("proj");
});
it("listNotes couvre les 2 racines", () => {
  const { notes } = listNotes(roots);
  expect(notes.map(n => n.root).sort()).toEqual(["brain", "facts"]);
  expect(notes.find(n => n.root === "facts")!.type).toBe("project");
});
it("readNote round-trip d'une note", () => {
  const n = readNote(roots, "facts", "proj");
  expect(n.title).toBe("proj");
  expect(n.body).toContain("ELO hybride");
});
it("readNote refuse la traversée de chemin", () => {
  expect(() => readNote(roots, "facts", "../secret")).toThrowError();
});
it("searchNotes trouve par mot-clé et renvoie un snippet", () => {
  const r = searchNotes(roots, "elo");
  expect(r.hits.length).toBe(1);
  expect(r.hits[0].snippet.toLowerCase()).toContain("elo");
});
it("writeNote crée dans facts et refuse brain (403)", () => {
  const w = writeNote(roots, { root: "facts", id: "new-note", frontmatter: { type: "feedback" }, body: "hello", mode: "create" });
  expect(w.created).toBe(true);
  expect(existsSync(path.join(roots.facts, "new-note.md"))).toBe(true);
  expect(readFileSync(path.join(roots.facts, "new-note.md"), "utf-8")).toContain("hello");
  expect(() => writeNote(roots, { root: "brain", id: "x", body: "y", mode: "create" })).toThrowError(/lecture seule/);
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd llm-lego && npx vitest run tests/memory.test.ts`
Expected: FAIL (`Cannot find module '../memory-store.mjs'`).

- [ ] **Step 3: Implement `memory-store.mjs`**

```js
// memory-store.mjs — CT-4 couche d'accès mémoire (racines injectées, aucun build).
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const MD = /\.md$/i;
const VALID_ID = /^[A-Za-z0-9._-]+$/;

function coerce(v) {
  const arr = v.match(/^\[(.*)\]$/);
  if (arr) return arr[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  return v.replace(/^["']|["']$/g, "");
}
export function parseFrontmatter(src) {
  const out = {}; let parent = null;
  for (const raw of src.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const indented = /^\s+/.test(raw);
    const m = raw.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1], val = m[2].trim();
    if (indented && parent) out[parent][key] = coerce(val);
    else if (val === "") { out[key] = {}; parent = key; }
    else { out[key] = coerce(val); parent = null; }
  }
  return out;
}
export function parseNote(text) {
  let frontmatter = {}, body = text;
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fm) { frontmatter = parseFrontmatter(fm[1]); body = text.slice(fm[0].length); }
  let tags = [];
  if (Array.isArray(frontmatter.tags)) tags = frontmatter.tags.map(String);
  else tags = (body.match(/(?:^|\s)#([A-Za-z0-9_\/-]+)/g) || []).map((t) => t.trim().replace(/^#/, ""));
  const type = (frontmatter.metadata && frontmatter.metadata.type) || frontmatter.type || null;
  const heading = body.match(/^#\s+(.+)$/m);
  const title = frontmatter.name || (heading ? heading[1].trim() : null);
  const wikilinks = [...body.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map((m) => m[1].trim());
  return { frontmatter, tags, type, title, wikilinks, body };
}
function rootPath(roots, root) {
  const p = roots[root];
  if (!p) { const e = new Error(`racine inconnue: ${root}`); e.status = 400; throw e; }
  return p;
}
function safeFile(dir, id) {
  const base = typeof id === "string" && id.endsWith(".md") ? id.slice(0, -3) : id;
  if (typeof base !== "string" || !VALID_ID.test(base) || base.includes("..")) {
    const e = new Error(`id invalide: ${id}`); e.status = 400; throw e;
  }
  const file = path.resolve(dir, `${base}.md`);
  if (!file.startsWith(path.resolve(dir) + path.sep)) { const e = new Error("chemin hors racine"); e.status = 400; throw e; }
  return file;
}
const idOf = (f) => f.replace(MD, "");

export function listNotes(roots) {
  const notes = [];
  for (const root of Object.keys(roots)) {
    const dir = roots[root];
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!MD.test(f)) continue;
      const full = path.join(dir, f);
      let st; try { st = statSync(full); } catch { continue; }
      if (!st.isFile()) continue;
      const p = parseNote(readFileSync(full, "utf-8"));
      notes.push({ root, id: idOf(f), relpath: f, title: p.title || idOf(f), tags: p.tags, type: p.type, mtimeMs: st.mtimeMs });
    }
  }
  return { roots: { ...roots }, notes };
}
export function readNote(roots, root, id) {
  const dir = rootPath(roots, root);
  const file = safeFile(dir, id);
  if (!existsSync(file)) { const e = new Error(`introuvable: ${root}/${id}`); e.status = 404; throw e; }
  const st = statSync(file);
  const p = parseNote(readFileSync(file, "utf-8"));
  const rid = idOf(path.basename(file));
  return { root, id: rid, relpath: path.basename(file), frontmatter: p.frontmatter, tags: p.tags, type: p.type, title: p.title || rid, wikilinks: p.wikilinks, body: p.body, mtimeMs: st.mtimeMs };
}
export function searchNotes(roots, q, rootFilter = "all") {
  const needle = String(q || "").toLowerCase();
  if (!needle) return { q: "", hits: [] };
  const { notes } = listNotes(roots);
  const hits = [];
  for (const n of notes) {
    if (rootFilter !== "all" && n.root !== rootFilter) continue;
    const full = readNote(roots, n.root, n.id);
    const hay = `${full.title}\n${full.tags.join(" ")}\n${full.body}`.toLowerCase();
    const idx = hay.indexOf(needle);
    if (idx === -1) continue;
    const score = hay.split(needle).length - 1;
    const snippet = full.body.replace(/\s+/g, " ").slice(Math.max(0, idx - 40), idx + needle.length + 40).trim();
    hits.push({ root: n.root, id: n.id, title: full.title, snippet, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return { q: String(q), hits };
}
function serializeFrontmatter(fm) {
  if (!fm || typeof fm !== "object" || !Object.keys(fm).length) return "";
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.join(", ")}]`);
    else if (v && typeof v === "object") { lines.push(`${k}:`); for (const [k2, v2] of Object.entries(v)) lines.push(`  ${k2}: ${v2}`); }
    else lines.push(`${k}: ${v}`);
  }
  lines.push("---", "");
  return lines.join("\n");
}
export function writeNote(roots, { root, id, frontmatter, body, mode = "create" }) {
  if (root === "brain") { const e = new Error("vault humain en lecture seule"); e.status = 403; throw e; }
  const dir = rootPath(roots, root);
  const file = safeFile(dir, id);
  const exists = existsSync(file);
  if (mode === "create" && exists) { const e = new Error(`déjà existant: ${id}`); e.status = 409; throw e; }
  if (mode === "update" && !exists) { const e = new Error(`inexistant: ${id}`); e.status = 404; throw e; }
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(file, `${serializeFrontmatter(frontmatter)}${body ?? ""}`, "utf-8");
  return { ok: true, root, id: idOf(path.basename(file)), relpath: path.basename(file), created: !exists };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `cd llm-lego && npx vitest run tests/memory.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Full vitest regression**

Run: `cd llm-lego && npx vitest run`
Expected: 64 passed (56 existants + 8 nouveaux) / 1 skipped.

- [ ] **Step 6: Commit** *(gate Pierre)*

```bash
git add llm-lego/memory-store.mjs llm-lego/tests/memory.test.ts
git commit -m "llm-lego: CT-4 — lib mémoire memory-store.mjs (list/read/search/write, garde-fous)"
```

---

## Task 2 — Routes HTTP dans `demo-server.ts` (U2)

**Files:**
- Modify: `llm-lego/demo-server.ts` (imports en tête ; config `MEM_ROOTS` ; bloc de routes après le routing `/api/library`)

**Interfaces:**
- Consumes: `listNotes/readNote/searchNotes/writeNote` de Task 1, `sendJson(res,status,payload)` existant.
- Produces (routes) : `GET /api/memory`, `GET /api/memory/search?q=&root=`, `GET /api/memory/:root/:id`, `POST /api/memory`.

- [ ] **Step 1: Ajouter les imports** (près des autres `import` en tête)

```ts
import os from "node:os";
import { listNotes, readNote, searchNotes, writeNote } from "./memory-store.mjs";
```

- [ ] **Step 2: Ajouter la config `MEM_ROOTS`** (après la ligne `const __dirname = …`)

```ts
// CT-4 — racines mémoire (surchargables par env pour tests isolés).
const MEM_ROOTS = {
  brain: process.env["TCS_BRAIN_DIR"] ? path.resolve(process.env["TCS_BRAIN_DIR"]) : path.join(__dirname, "..", "studio_brain"),
  facts: process.env["TCS_MEMORY_DIR"] ? path.resolve(process.env["TCS_MEMORY_DIR"]) : path.join(os.homedir(), ".claude", "projects", "C--TACTICAL-CHESS-STUDIO", "memory"),
};
```

- [ ] **Step 3: Ajouter le bloc de routes** (après le routing `/api/library`, avant le 404 final ; `url`/`pathname` sont déjà calculés plus haut)

```ts
// ---- CT-4 : face HTTP mémoire (mêmes fichiers que la face MCP) ----
if (pathname === "/api/memory" && req.method === "GET") {
  try { sendJson(res, 200, listNotes(MEM_ROOTS)); }
  catch (e) { sendJson(res, (e as any).status || 500, { error: String((e as any).message || e) }); }
  return;
}
if (pathname === "/api/memory/search" && req.method === "GET") {
  try { sendJson(res, 200, searchNotes(MEM_ROOTS, url.searchParams.get("q") || "", url.searchParams.get("root") || "all")); }
  catch (e) { sendJson(res, (e as any).status || 500, { error: String((e as any).message || e) }); }
  return;
}
if (pathname === "/api/memory" && req.method === "POST") {
  let body = "";
  req.on("data", (c) => (body += c.toString()));
  req.on("end", () => {
    try { sendJson(res, 200, writeNote(MEM_ROOTS, JSON.parse(body || "{}"))); }
    catch (e) { sendJson(res, (e as any).status || 400, { error: String((e as any).message || e) }); }
  });
  return;
}
{
  const mem = pathname.match(/^\/api\/memory\/([A-Za-z]+)\/(.+)$/);
  if (mem && req.method === "GET") {
    try { sendJson(res, 200, readNote(MEM_ROOTS, mem[1], decodeURIComponent(mem[2]))); }
    catch (e) { sendJson(res, (e as any).status || 500, { error: String((e as any).message || e) }); }
    return;
  }
}
```

- [ ] **Step 4: Redémarrer le serveur et prouver les routes**

Run (redémarre l'instance :3000 avec le nouveau code) :
```bash
cd llm-lego
# tuer l'instance existante puis relancer en arrière-plan
node demo-server.ts &   # (ou via le lanceur studio)
sleep 1
curl -s http://localhost:3000/api/memory | head -c 300
curl -s "http://localhost:3000/api/memory/facts/project_overview" | head -c 200
curl -s "http://localhost:3000/api/memory/search?q=elo" | head -c 200
curl -s -X POST http://localhost:3000/api/memory -H "Content-Type: application/json" -d '{"root":"brain","id":"x","body":"y","mode":"create"}'
```
Expected: liste JSON avec `brain`+`facts` ; note lue ; hits de recherche ; POST brain → `{"error":"vault humain en lecture seule"}` (403).

- [ ] **Step 5: Commit** *(gate Pierre)*

```bash
git add llm-lego/demo-server.ts
git commit -m "llm-lego: CT-4 — face HTTP /api/memory sur demo-server (list/read/search/write)"
```

---

## Task 3 — Vue « Mémoire » dans `builder.html` (U4)

**Files:**
- Modify: `llm-lego/builder.html` (composant `MemoryModal` + état `memOpen` + bouton toolbar `🧠 Mémoire`)

**Interfaces:**
- Consumes: `GET /api/memory`, `GET /api/memory/:root/:id` (Task 2). Réutilise les classes CSS `.wm-modal`, `.box`, `.ghost`.
- Produces (testids): `btn-memory`, `memory-modal`, `mem-search`, `mem-note`, `mem-open`, `mem-note-body`.

- [ ] **Step 1: Ajouter le composant `MemoryModal`** (près des autres composants React, ex. avant `function App()`)

```jsx
function MemoryModal({ onClose }) {
  const [notes, setNotes] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [sel, setSel] = React.useState(null);
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    fetch('/api/memory').then(r => r.json())
      .then(d => setNotes(d.notes || [])).catch(e => setErr(String(e)));
  }, []);
  const open = (n) => fetch(`/api/memory/${n.root}/${encodeURIComponent(n.id)}`)
    .then(r => r.json()).then(setSel).catch(e => setErr(String(e)));
  const filtered = (notes || []).filter(n =>
    !q || (`${n.title} ${n.id} ${(n.tags || []).join(' ')}`).toLowerCase().includes(q.toLowerCase()));
  const group = (root) => filtered.filter(n => n.root === root);
  return (
    <div className="wm-modal" data-testid="memory-modal" onMouseDown={onClose}>
      <div className="box" style={{ width: 900, height: '82vh', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, overflow: 'hidden' }} onMouseDown={e => e.stopPropagation()}>
        <div style={{ borderRight: '1px solid #1e293b', overflow: 'auto', padding: 10 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input data-testid="mem-search" placeholder="filtrer…" value={q} onChange={e => setQ(e.target.value)} />
            <button className="ghost" onClick={onClose}>fermer</button>
          </div>
          {err && <div style={{ color: '#fca5a5', fontSize: 11 }}>{err}</div>}
          {notes === null && !err && <div style={{ color: '#64748b', fontSize: 11 }}>chargement…</div>}
          {['brain', 'facts'].map(root => (
            <div key={root}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#6366f1', letterSpacing: 1, margin: '10px 0 4px' }}>
                {root === 'brain' ? 'studio_brain (humain)' : 'memory (machine)'} · {group(root).length}
              </div>
              {group(root).map(n => (
                <button key={root + n.id} data-testid="mem-note" className="palette" style={{ width: '100%', marginBottom: 3 }}
                  onClick={() => open(n)} title={(n.tags || []).map(t => '#' + t).join(' ')}>
                  {n.title}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div style={{ overflow: 'auto', padding: 16 }}>
          {!sel && <div style={{ color: '#64748b', fontSize: 12 }}>Sélectionne une note.</div>}
          {sel && (
            <div>
              <div style={{ fontSize: 15, color: '#e0e7ff', marginBottom: 6 }}>{sel.title}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{sel.root}/{sel.id}</div>
              {(sel.tags || []).length > 0 && <div style={{ marginBottom: 8 }}>{sel.tags.map(t => (
                <span key={t} style={{ fontSize: 10, background: '#1e293b', color: '#a5b4fc', padding: '1px 6px', borderRadius: 4, marginRight: 4 }}>#{t}</span>))}</div>}
              {(sel.wikilinks || []).length > 0 && <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>→ {sel.wikilinks.join(' · ')}</div>}
              <pre data-testid="mem-note-body" style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{sel.body}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ajouter l'état + le bouton toolbar** (dans le composant qui rend la barre d'outils, à côté de `btn-roadmap`)

État (près des autres `useState` du composant hôte) :
```jsx
const [memOpen, setMemOpen] = React.useState(false);
```
Bouton (à côté du bouton Roadmap) :
```jsx
<button className="ghost" data-testid="btn-memory" onClick={() => setMemOpen(true)}>🧠 Mémoire</button>
```
Rendu de la modale (près du rendu de `roadmap-modal`) :
```jsx
{memOpen && <MemoryModal onClose={() => setMemOpen(false)} />}
```

- [ ] **Step 3: Prouver la vue (DOM, serveur :3000 lancé)**

Ouvrir `http://localhost:3000/builder`, cliquer « 🧠 Mémoire ». Vérifier via DOM :
```js
// dans la console / javascript_tool
document.querySelector('[data-testid="btn-memory"]').click();
// après ouverture :
document.querySelectorAll('[data-testid="mem-note"]').length; // > 0
document.querySelector('[data-testid="mem-note"]').click();
document.querySelector('[data-testid="mem-note-body"]').textContent.length; // > 0
```
Expected: bouton présent, ≥1 note listée, corps de note affiché. Capture nommée `memory-view`.

- [ ] **Step 4: Régression validateurs**

Run: `cd llm-lego && node run-validators.mjs`
Expected: 741 ✅ / 0 ❌ (la modale n'ajoute pas de testid en conflit).

- [ ] **Step 5: Commit** *(gate Pierre)*

```bash
git add llm-lego/builder.html
git commit -m "llm-lego: CT-4 — vue Mémoire (modale lecture seule) branchée sur /api/memory"
```

---

## Task 4 — Validateur bout-en-bout `memory-validate.mjs` (U5)

**Files:**
- Create: `llm-lego/memory-validate.mjs`

**Interfaces:**
- Consumes: démarre `demo-server.ts` avec `TCS_BRAIN_DIR`/`TCS_MEMORY_DIR` = dirs temp + `PORT` dédié ; tape les routes HTTP.
- Produces: sortie `✅N ❌0` + code de sortie 0/1 (format des autres `*-validate.mjs`).

- [ ] **Step 1: Écrire `memory-validate.mjs`**

```js
// memory-validate.mjs — preuve bout-en-bout CT-4, serveur + racines TEMP (n'écrit jamais dans la vraie mémoire).
import { spawn } from "node:child_process";
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
const check = (name, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "OK " : "XX "} ${name}`); };
const j = (p, opt) => fetch(BASE + p, opt).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const server = spawn(process.execPath, ["demo-server.ts"], {
  cwd: __dirname, env: { ...process.env, TCS_BRAIN_DIR: brain, TCS_MEMORY_DIR: facts, PORT },
  stdio: ["ignore", "ignore", "inherit"],
});
const cleanup = () => { try { server.kill(); } catch {} rmSync(brain, { recursive: true, force: true }); rmSync(facts, { recursive: true, force: true }); };

try {
  let ready = false;
  for (let i = 0; i < 40; i++) { try { const r = await fetch(BASE + "/api/memory"); if (r.ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 250)); }
  if (!ready) throw new Error(`serveur pas prêt sur ${BASE}`);

  const list = await j("/api/memory");
  check("GET /api/memory couvre 2 racines", list.status === 200 && new Set(list.body.notes.map(n => n.root)).size === 2);
  const read = await j("/api/memory/facts/fact");
  check("GET note round-trip (frontmatter+body)", read.status === 200 && read.body.type === "project" && read.body.body.includes("ELO"));
  const trav = await j("/api/memory/facts/" + encodeURIComponent("../escape"));
  check("traversée refusée (400)", trav.status === 400);
  const search = await j("/api/memory/search?q=elo");
  check("search mot-clé + snippet", search.status === 200 && search.body.hits.length === 1);
  const wBrain = await j("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: "brain", id: "x", body: "y", mode: "create" }) });
  check("POST brain refusé (403)", wBrain.status === 403);
  const wFacts = await j("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root: "facts", id: "e2e", frontmatter: { type: "feedback" }, body: "e2e-marker", mode: "create" }) });
  check("POST facts crée la note", wFacts.status === 200 && wFacts.body.created === true);
  // preuve croisée : le fichier existe sur disque (== ce que la face MCP filesystem servirait)
  const onDisk = path.join(facts, "e2e.md");
  check("écriture visible sur disque (== face MCP)", existsSync(onDisk) && readFileSync(onDisk, "utf-8").includes("e2e-marker"));

  console.log(`\n  memory-validate: ✅${pass} ❌${fail}`);
} finally {
  cleanup();
}
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: Lancer le validateur**

Run: `cd llm-lego && node memory-validate.mjs`
Expected: `✅7 ❌0`, exit 0.

- [ ] **Step 3: Régression complète finale**

Run: `cd llm-lego && node run-validators.mjs && npx vitest run`
Expected: run-validators 741+ ✅ / 0 ❌ (34 validateurs — memory-validate ignore le BASE partagé et gère son propre serveur temp) ; vitest 64 ✅.

- [ ] **Step 4: Commit** *(gate Pierre)*

```bash
git add llm-lego/memory-validate.mjs
git commit -m "llm-lego: CT-4 — memory-validate.mjs (preuve bout-en-bout, serveur+racines temp)"
```

---

## Task 5 — Config MCP filesystem (U3) *(gate Pierre — touche %APPDATA%)*

**Files:**
- Modify: `%APPDATA%\Claude\claude_desktop_config.json` (merge non destructif ; backup avant)

**Interfaces:**
- Consumes: chemins des 2 racines. Prérequis : Node installé (fournit `npx`).

- [ ] **Step 1: Backup + merge**

Lire le fichier s'il existe, sauvegarder `claude_desktop_config.json.bak-2026-07-05`, fusionner dans `mcpServers` sans écraser l'existant :
```json
{
  "mcpServers": {
    "tcs-brain": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\TACTICAL_CHESS_STUDIO\\studio_brain"] },
    "tcs-facts": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\<utilisateur>\\.claude\\projects\\C--TACTICAL-CHESS-STUDIO\\memory"] }
  }
}
```

- [ ] **Step 2: Valider le JSON écrit**

Vérifier que le fichier reste un JSON valide et que les clés existantes sont préservées (diff avec le backup).

- [ ] **Step 3: Vérification manuelle (Pierre)**

Redémarrer Claude Desktop → confirmer que l'assistant lit une note de `tcs-brain` et une de `tcs-facts` via MCP. *(Ne peut pas être vérifié depuis Claude Code — nécessite le redémarrage de Desktop. Reste un pas manuel Pierre.)*

- [ ] **Step 4: Clore IMP-178** via `kaizen_loop.py` (jamais éditer le ledger à la main), une fois la vérif manuelle OK.

---

## Self-Review (fait)

- **Couverture spec** : §3.1 données → Task 2 config MEM_ROOTS ; §3.2 MCP → Task 5 ; §3.3 HTTP → Task 2 ; §3.4 interface → Task 3 ; §4 garde-fous → Task 1 (safeFile, brain 403) + testés Task 1/4 ; §5 preuve → Task 4 ; §7 unités U1-U5 → Tasks 1-4/5. ✅
- **Placeholders** : aucun (code complet partout).
- **Cohérence des types** : `roots={brain,facts}`, `writeNote({root,id,frontmatter,body,mode})`, testids stables (`mem-note`, `mem-note-body`, `btn-memory`) — cohérents Task 1↔2↔3↔4. ✅
- **Ordre** : U1(T1) → U2(T2) → U4(T3) ∥ U5(T4) → MCP(T5). T3 dépend de T2 (serveur), T4 dépend de T2.
