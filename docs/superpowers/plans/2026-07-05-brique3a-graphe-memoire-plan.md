# Brique 3a — Graphe mémoire (vault) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la mémoire (2 racines) comme un graphe force-directed « cerveau » (nœuds=notes, arêtes=wikilinks) dans la vue Mémoire du builder, en rendant d'abord `memory-store` récursif (vue unique : graphe + recherche + recall voient les mêmes notes).

**Architecture:** `memory-store` devient récursif (ids = `root/relpath`, exclusion `journal/`). Un module `memory-graph.mjs` résout les wikilinks (relpath→basename→ambiguous/dropped, hygiène self-link/dédup) en `{nodes,edges,dropped,ambiguous}`, exposé via `/api/memory/graph`. Un composant `MemoryGraph` (SVG force-directed maison, converge-puis-fige) s'affiche via un toggle `liste|graphe` dans la modale Mémoire.

**Tech Stack:** Node ESM (`.mjs`), `node:fs`, vitest, React inline (builder.html), SVG.

## Global Constraints

- **A1 [fondation]** : `memory-store` récursif ; ids = `root/relpath-sans-.md` **partout** ; `journal/` **exclu** (`EXCLUDE_DIRS=['journal']`, un seul point).
- **A2** : résolution wikilink déterministe — relpath-exact (même racine) → basename-unique (cross-racine) → **`ambiguous` (>1)** / `dropped` (0).
- **A3** : self-link droppé ; arêtes dédupliquées ; `degree` sur arêtes dédupliquées.
- **Anti-traversée** : relpath découpé en segments ; rejet si `""`/`"."`/`".."` (400) ; résolu sous la racine.
- `.memory-index.json` = cache jetable (clés plates stables + ajout incrémental des sous-dossiers).
- **Lecture seule** (graphe). Aucune lib externe. `src/` (Rust) et `llm-lego/src/` intacts.
- **Aucun commit sans go Pierre.** Non-régression avant gate : `run-validators` + `vitest` verts ; CT-4 & brique 2 OK.

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `llm-lego/memory-store.mjs` | listNotes/readNote/safeFile **récursifs** + exclusion `journal/` | Modifier |
| `llm-lego/tests/memory.test.ts` | + cas récursif (sous-dossier, traversée, exclusion archive) | Modifier |
| `llm-lego/tests/memory-recall.test.ts` | + cas sous-dossier + incrémental racine-inchangée | Modifier |
| `llm-lego/memory-graph.mjs` | `buildGraph` : résolution A2 + hygiène A3 + degree | Créer |
| `llm-lego/tests/memory-graph.test.ts` | unit buildGraph | Créer |
| `llm-lego/demo-server.ts` | route `/api/memory/graph` | Modifier |
| `llm-lego/builder.html` | toggle `liste\|graphe` + composant `MemoryGraph` | Modifier |
| `llm-lego/memory-graph-validate.mjs` | validateur endpoint (serveur+racines temp) | Créer |

---

## Task 1 — memory-store récursif (U1)

**Files:**
- Modify: `llm-lego/memory-store.mjs`
- Test: `llm-lego/tests/memory.test.ts`

**Interfaces:**
- Produces: `listNotes(roots)` (récursif, `id=relpath`, exclut `journal/`), `readNote(roots,root,id)` (`id`=relpath, anti-traversée), `writeNote` (mkdir parent).

- [ ] **Step 1: Ajouter les tests récursifs** — append à `tests/memory.test.ts`

```ts
import { mkdirSync } from "node:fs";
it("listNotes descend dans les sous-dossiers (id = relpath)", () => {
  mkdirSync(path.join(roots.brain, "doctrine"), { recursive: true });
  writeFileSync(path.join(roots.brain, "doctrine", "studio-doctrine.md"), "# Doctrine\n\nregles.", "utf-8");
  const { notes } = listNotes(roots);
  expect(notes.some((n: any) => n.root === "brain" && n.id === "doctrine/studio-doctrine")).toBe(true);
});
it("readNote lit une note en sous-dossier par son relpath", () => {
  mkdirSync(path.join(roots.brain, "sub"), { recursive: true });
  writeFileSync(path.join(roots.brain, "sub", "x.md"), "# X\n\ncorps.", "utf-8");
  const n = readNote(roots, "brain", "sub/x");
  expect(n.id).toBe("sub/x");
  expect(n.body).toContain("corps");
});
it("readNote refuse la traversée imbriquée", () => {
  expect(() => readNote(roots, "brain", "a/../../b")).toThrowError();
});
it("le dossier journal/ (archive) est exclu partout", () => {
  mkdirSync(path.join(roots.brain, "journal", "old"), { recursive: true });
  writeFileSync(path.join(roots.brain, "journal", "old", "dead.md"), "# Dead\n\nperime.", "utf-8");
  const { notes } = listNotes(roots);
  expect(notes.some((n: any) => n.id.includes("journal"))).toBe(false);
});
```

- [ ] **Step 2: Run, verify fail** — `cd llm-lego && ./node_modules/.bin/vitest run tests/memory.test.ts`
Expected: les 4 nouveaux échouent (listNotes plat ne descend pas).

- [ ] **Step 3: Rendre memory-store récursif** — remplacer dans `memory-store.mjs` :

Remplacer la constante `VALID_ID` et la fonction `safeFile` :
```js
const MD = /\.md$/i;
const EXCLUDE_DIRS = new Set(["journal"]); // A1/Q1 : archive exclue partout (un seul point)
```
```js
function safeFile(dir, id) {
  const rel = typeof id === "string" && id.endsWith(".md") ? id.slice(0, -3) : id;
  if (typeof rel !== "string" || rel === "") { const e = new Error(`id invalide: ${id}`); e.status = 400; throw e; }
  const segs = rel.split("/");
  if (segs.some((s) => s === "" || s === "." || s === "..")) { const e = new Error(`id invalide: ${id}`); e.status = 400; throw e; }
  const file = path.resolve(dir, ...segs) + ".md";
  if (!file.startsWith(path.resolve(dir) + path.sep)) { const e = new Error("chemin hors racine"); e.status = 400; throw e; }
  return file;
}
```
Remplacer `listNotes` (parcours récursif) :
```js
function walkDir(dir, relBase, out) {
  let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      walkDir(path.join(dir, e.name), relBase ? `${relBase}/${e.name}` : e.name, out);
    } else if (e.isFile() && MD.test(e.name)) {
      out.push(relBase ? `${relBase}/${e.name}` : e.name);
    }
  }
}
export function listNotes(roots) {
  const notes = [];
  for (const root of Object.keys(roots)) {
    const dir = roots[root];
    if (!existsSync(dir)) continue;
    const rels = []; walkDir(dir, "", rels);
    for (const rel of rels) {
      const full = path.join(dir, ...rel.split("/"));
      let st; try { st = statSync(full); } catch { continue; }
      if (!st.isFile()) continue;
      const p = parseNote(readFileSync(full, "utf-8"));
      const id = rel.replace(MD, "");
      notes.push({ root, id, relpath: rel, title: p.title || id, tags: p.tags, type: p.type, mtimeMs: st.mtimeMs });
    }
  }
  return { roots: { ...roots }, notes };
}
```
Remplacer `readNote` (id = relpath, préservé) :
```js
export function readNote(roots, root, id) {
  const dir = rootPath(roots, root);
  const file = safeFile(dir, id);
  if (!existsSync(file)) { const e = new Error(`introuvable: ${root}/${id}`); e.status = 404; throw e; }
  const st = statSync(file);
  const p = parseNote(readFileSync(file, "utf-8"));
  const rid = String(id).replace(MD, "");
  return { root, id: rid, relpath: `${rid}.md`, frontmatter: p.frontmatter, tags: p.tags, type: p.type, title: p.title || rid, wikilinks: p.wikilinks, body: p.body, mtimeMs: st.mtimeMs };
}
```
Dans `writeNote`, remplacer `if (!existsSync(dir)) mkdirSync(dir, { recursive: true });` par :
```js
  mkdirSync(path.dirname(file), { recursive: true });
```
Supprimer l'ancienne const `VALID_ID` et l'ancien `idOf` **s'ils ne sont plus utilisés** (garder `idOf` s'il est encore référencé — il ne l'est plus après ces remplacements ; retirer sa déclaration).

- [ ] **Step 4: Run, verify pass** — `cd llm-lego && ./node_modules/.bin/vitest run tests/memory.test.ts`
Expected: PASS (7 CT-4 + 4 nouveaux = 11).

- [ ] **Step 5: Non-régression vitest complète** — `cd llm-lego && ./node_modules/.bin/vitest run`
Expected: tous verts (CT-4 & brique2 inchangés, notes plates non impactées).

- [ ] **Step 6: Commit** *(gate)* — `git add llm-lego/memory-store.mjs llm-lego/tests/memory.test.ts && git commit -m "llm-lego: brique3a — memory-store récursif (ids relpath, exclusion journal/, anti-traversée)"`

---

## Task 2 — recherche & recall voient les sous-dossiers (U2)

**Files:**
- Modify: `llm-lego/tests/memory-recall.test.ts`

**Interfaces:** Consumes: `searchNotes` (déjà récursif via U1), `recall`/`buildOrUpdateIndex` (brique 2).

- [ ] **Step 1: Ajouter les tests** — append à `tests/memory-recall.test.ts`

```ts
import { writeFileSync as wf, mkdirSync as md } from "node:fs";
import { searchNotes } from "../memory-store.mjs";
it("recherche keyword et recall voient une note en sous-dossier", async () => {
  md(path.join(roots.brain, "sub"), { recursive: true });
  wf(path.join(roots.brain, "sub", "chess-notes.md"), "# Chess notes\n\nRocky chess elo.", "utf-8");
  const kw = searchNotes(roots, "chess");
  expect(kw.hits.some((h: any) => h.id === "sub/chess-notes")).toBe(true);
  const r = await recall(roots, "chess", { embed: mockEmbed, indexPath: idx, model: "m", k: 5 });
  expect(r.hits.some((h: any) => h.id === "sub/chess-notes")).toBe(true);
});
it("incrémental : ajouter une note sous-dossier ne ré-embeddée PAS les notes racine inchangées", async () => {
  await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m" });
  embedCalls = [];
  md(path.join(roots.facts, "deep"), { recursive: true });
  wf(path.join(roots.facts, "deep", "new.md"), "# New\n\nmemoire.", "utf-8");
  await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m" });
  const embedded = embedCalls.flat();
  expect(embedded.length).toBe(1);                 // seule la nouvelle note
  expect(embedded[0]).toContain("New");
});
```

- [ ] **Step 2: Run** — `cd llm-lego && ./node_modules/.bin/vitest run tests/memory-recall.test.ts`
Expected: PASS (8 = 6 brique2 + 2 nouveaux). (Le code U1 suffit : searchNotes/recall consomment listNotes récursif.)

- [ ] **Step 3: Commit** *(gate)* — `git add llm-lego/tests/memory-recall.test.ts && git commit -m "llm-lego: brique3a — tests recherche/recall récursifs (sous-dossiers) + incrémental stable"`

---

## Task 3 — `memory-graph.mjs` (U3)

**Files:**
- Create: `llm-lego/memory-graph.mjs`
- Test: `llm-lego/tests/memory-graph.test.ts`

**Interfaces:**
- Consumes: `listNotes`, `readNote` (U1).
- Produces: `buildGraph(roots) → { nodes:[{id,root,title,tags,degree}], edges:[{source,target}], dropped, ambiguous }` — `id` = `"root/relpath"`.

- [ ] **Step 1: Écrire les tests** — `llm-lego/tests/memory-graph.test.ts`

```ts
import { it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildGraph } from "../memory-graph.mjs";

let roots: { brain: string; facts: string };
beforeEach(() => {
  const brain = mkdtempSync(path.join(tmpdir(), "gb-"));
  const facts = mkdtempSync(path.join(tmpdir(), "gf-"));
  roots = { brain, facts };
});
afterEach(() => { rmSync(roots.brain, { recursive: true, force: true }); rmSync(roots.facts, { recursive: true, force: true }); });

it("arête créée depuis un [[lien]] résolu + degree", () => {
  writeFileSync(path.join(roots.brain, "a.md"), "# A\n\nvoir [[b]].", "utf-8");
  writeFileSync(path.join(roots.brain, "b.md"), "# B\n\nfin.", "utf-8");
  const g = buildGraph(roots);
  expect(g.edges).toContainEqual({ source: "brain/a", target: "brain/b" });
  expect(g.nodes.find((n: any) => n.id === "brain/a").degree).toBe(1);
  expect(g.nodes.find((n: any) => n.id === "brain/b").degree).toBe(1);
});
it("collision basename → ambiguous, pas d'arête", () => {
  mkdirSync(path.join(roots.brain, "d1")); mkdirSync(path.join(roots.brain, "d2"));
  writeFileSync(path.join(roots.brain, "d1", "dup.md"), "# Dup1", "utf-8");
  writeFileSync(path.join(roots.brain, "d2", "dup.md"), "# Dup2", "utf-8");
  writeFileSync(path.join(roots.brain, "src.md"), "# Src\n\nvers [[dup]].", "utf-8");
  const g = buildGraph(roots);
  expect(g.ambiguous).toBe(1);
  expect(g.edges.length).toBe(0);
});
it("self-link → aucune arête", () => {
  writeFileSync(path.join(roots.brain, "self.md"), "# Self\n\nje cite [[self]].", "utf-8");
  const g = buildGraph(roots);
  expect(g.edges.length).toBe(0);
});
it("lien dupliqué → une seule arête", () => {
  writeFileSync(path.join(roots.brain, "a.md"), "# A\n\n[[b]] et encore [[b]].", "utf-8");
  writeFileSync(path.join(roots.brain, "b.md"), "# B", "utf-8");
  const g = buildGraph(roots);
  expect(g.edges.length).toBe(1);
  expect(g.nodes.find((n: any) => n.id === "brain/b").degree).toBe(1);
});
it("wikilink introuvable → dropped", () => {
  writeFileSync(path.join(roots.brain, "a.md"), "# A\n\n[[nexistepas]].", "utf-8");
  const g = buildGraph(roots);
  expect(g.dropped).toBe(1);
  expect(g.edges.length).toBe(0);
});
```

- [ ] **Step 2: Run, verify fail** — `cd llm-lego && ./node_modules/.bin/vitest run tests/memory-graph.test.ts`
Expected: FAIL (module absent).

- [ ] **Step 3: Écrire `memory-graph.mjs`**

```js
// memory-graph.mjs — brique 3a : graphe mémoire (nœuds=notes, arêtes=wikilinks).
import { listNotes, readNote } from "./memory-store.mjs";

function resolveWikilink(w, srcRoot, nodeKeys, basenameIndex) {
  const clean = String(w).replace(/\.md$/i, "").replace(/^\.\//, "").replace(/^(\.\.\/)+/, "");
  const relKey = `${srcRoot}/${clean}`;                 // (a) relpath exact, même racine
  if (nodeKeys.has(relKey)) return { key: relKey };
  const base = clean.split("/").pop();                  // (b) basename, cross-racine
  const matches = basenameIndex.get(base) || [];
  if (matches.length === 1) return { key: matches[0] };
  if (matches.length > 1) return { ambiguous: true };
  return { dropped: true };
}

export function buildGraph(roots) {
  const { notes } = listNotes(roots);
  const full = notes.map((n) => readNote(roots, n.root, n.id));
  const keyOf = (n) => `${n.root}/${n.id}`;
  const nodeKeys = new Set(full.map(keyOf));
  const basenameIndex = new Map();
  for (const n of full) {
    const base = String(n.id).split("/").pop();
    const arr = basenameIndex.get(base) || []; arr.push(keyOf(n)); basenameIndex.set(base, arr);
  }
  const edgeSet = new Set();
  let dropped = 0, ambiguous = 0;
  for (const n of full) {
    const srcKey = keyOf(n);
    for (const w of n.wikilinks || []) {
      const r = resolveWikilink(w, n.root, nodeKeys, basenameIndex);
      if (r.ambiguous) { ambiguous++; continue; }
      if (r.dropped) { dropped++; continue; }
      if (r.key === srcKey) continue;                   // A3 self-link
      edgeSet.add(`${srcKey} ${r.key}`);           // A3 dédup
    }
  }
  const degree = new Map();
  const edges = [...edgeSet].map((s) => {
    const [source, target] = s.split(" ");
    degree.set(source, (degree.get(source) || 0) + 1);
    degree.set(target, (degree.get(target) || 0) + 1);
    return { source, target };
  });
  const nodes = full.map((n) => ({ id: keyOf(n), root: n.root, title: n.title, tags: n.tags, degree: degree.get(keyOf(n)) || 0 }));
  return { nodes, edges, dropped, ambiguous };
}
```

- [ ] **Step 4: Run, verify pass** — `cd llm-lego && ./node_modules/.bin/vitest run tests/memory-graph.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit** *(gate)* — `git add llm-lego/memory-graph.mjs llm-lego/tests/memory-graph.test.ts && git commit -m "llm-lego: brique3a — memory-graph.mjs (résolution wikilink A2 + hygiène A3 + degree)"`

---

## Task 4 — endpoint `/api/memory/graph` (U4)

**Files:**
- Modify: `llm-lego/demo-server.ts`

**Interfaces:** Consumes `buildGraph` (U3). Produces `GET /api/memory/graph`.

- [ ] **Step 1: Import** (près des autres imports memory-*)
```ts
import { buildGraph } from "./memory-graph.mjs";
```

- [ ] **Step 2: Ajouter la route** (juste après la route `/api/memory/search`)
```ts
  if (pathname === "/api/memory/graph" && req.method === "GET") {
    try { sendJson(res, 200, buildGraph(MEM_ROOTS)); }
    catch (e) { sendJson(res, 500, { error: String((e as any).message || e) }); }
    return;
  }
```

- [ ] **Step 3: Prouver** (redémarrer :3000)
```bash
cd llm-lego
PID=$(netstat -ano | grep ':3000' | grep LISTENING | head -1 | awk '{print $NF}'); MSYS_NO_PATHCONV=1 taskkill /F /PID "$PID" >/dev/null 2>&1; sleep 1
node demo-server.ts & sleep 2.5
curl -s "http://localhost:3000/api/memory/graph" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const g=JSON.parse(s);console.log("nodes:",g.nodes.length,"edges:",g.edges.length,"dropped:",g.dropped,"ambiguous:",g.ambiguous)})'
```
Expected: `nodes` > 20 (sous-dossiers `brain` désormais inclus), `edges` ≥ 1, `dropped`/`ambiguous` numériques.

- [ ] **Step 4: Commit** *(gate)* — `git add llm-lego/demo-server.ts && git commit -m "llm-lego: brique3a — endpoint /api/memory/graph"`

---

## Task 5 — `MemoryGraph` + toggle liste|graphe (U5)

**Files:**
- Modify: `llm-lego/builder.html`

**Interfaces:** Consumes `GET /api/memory/graph`. Produces (testids): `mem-view-list`, `mem-view-graph`, `mem-graph-svg`, `mem-graph-node`.

- [ ] **Step 1: Ajouter le composant `MemoryGraph`** (avant `function MemoryModal`)

```jsx
    function MemoryGraph({ onOpen }) {
      const [data, setData] = useState(null);
      const [err, setErr] = useState(null);
      const posRef = useRef({});
      const [tick, setTick] = useState(0);
      const [view, setView] = useState({ x: 0, y: 0, k: 1 });
      const dragRef = useRef(null);
      const CX = 320, CY = 240;
      useEffect(() => {
        fetch('/api/memory/graph').then((r) => r.json()).then((g) => {
          const N = g.nodes.length, pos = {};
          g.nodes.forEach((n, i) => { const a = 2 * Math.PI * i / Math.max(1, N); pos[n.id] = { x: CX + 200 * Math.cos(a), y: CY + 200 * Math.sin(a), vx: 0, vy: 0 }; });
          for (let it = 0; it < 150; it++) {
            for (let i = 0; i < N; i++) { const a = pos[g.nodes[i].id]; for (let j = i + 1; j < N; j++) { const b = pos[g.nodes[j].id]; let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy || 1, d = Math.sqrt(d2), f = 1600 / d2; a.vx += f * dx / d; a.vy += f * dy / d; b.vx -= f * dx / d; b.vy -= f * dy / d; } }
            for (const e of g.edges) { const a = pos[e.source], b = pos[e.target]; if (!a || !b) continue; let dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = 0.02 * (d - 70); a.vx += f * dx / d; a.vy += f * dy / d; b.vx -= f * dx / d; b.vy -= f * dy / d; }
            for (const n of g.nodes) { const p = pos[n.id]; p.vx += (CX - p.x) * 0.005; p.vy += (CY - p.y) * 0.005; p.x += p.vx * 0.85; p.y += p.vy * 0.85; p.vx *= 0.6; p.vy *= 0.6; }
          }
          posRef.current = pos; setData(g);
        }).catch((e) => setErr(String(e)));
      }, []);
      if (err) return <div style={{ color: '#fca5a5', fontSize: 11, padding: 12 }}>{err}</div>;
      if (!data) return <div style={{ color: '#64748b', fontSize: 11, padding: 12 }}>calcul du graphe…</div>;
      if (!data.nodes.length) return <div style={{ color: '#64748b', fontSize: 12, padding: 12 }}>aucune note.</div>;
      const pos = posRef.current;
      const colorOf = (n) => n.root === 'brain' ? '#8b5cf6' : '#22d3ee';
      const onWheel = (e) => { e.preventDefault(); const f = e.deltaY < 0 ? 1.1 : 1 / 1.1; setView((v) => ({ ...v, k: Math.max(0.3, Math.min(3, v.k * f)) })); };
      const startBg = (e) => { dragRef.current = { bg: true, sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }; };
      const startNode = (e, id) => { e.stopPropagation(); dragRef.current = { id, sx: e.clientX, sy: e.clientY, px: pos[id].x, py: pos[id].y }; };
      const onMove = (e) => { const d = dragRef.current; if (!d) return; if (d.bg) { setView((v) => ({ ...v, x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) })); } else { pos[d.id].x = d.px + (e.clientX - d.sx) / view.k; pos[d.id].y = d.py + (e.clientY - d.sy) / view.k; setTick((t) => t + 1); } };
      const endDrag = () => { dragRef.current = null; };
      return (
        <svg data-testid="mem-graph-svg" width="100%" height="100%" style={{ cursor: 'grab', background: '#0b0f19' }}
          onWheel={onWheel} onMouseDown={startBg} onMouseMove={onMove} onMouseUp={endDrag} onMouseLeave={endDrag}>
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {data.edges.map((e, i) => { const a = pos[e.source], b = pos[e.target]; if (!a || !b) return null; return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#334155" strokeWidth="1" />; })}
            {data.nodes.map((n) => { const p = pos[n.id]; if (!p) return null; const r = 4 + Math.min(10, n.degree * 1.5); return (
              <g key={n.id} data-testid="mem-graph-node" transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }}
                onMouseDown={(e) => startNode(e, n.id)} onClick={() => onOpen({ root: n.root, id: n.id.slice(n.root.length + 1) })}>
                <circle r={r} fill={colorOf(n)} stroke="#0b0f19" strokeWidth="1.5" />
                {view.k > 1.1 && <text x={r + 2} y="3" fill="#cbd5e1" fontSize={9 / view.k}>{n.title}</text>}
                <title>{n.title} ({n.degree})</title>
              </g>
            ); })}
          </g>
          <text x="8" y="16" fill="#64748b" fontSize="10">{data.nodes.length} notes · {data.edges.length} liens · {data.dropped} droppés · {data.ambiguous} ambigus</text>
        </svg>
      );
    }
```

- [ ] **Step 2: Ajouter l'état de vue + le toggle dans `MemoryModal`** — après `const [degraded, setDegraded] = useState(null);`, ajouter :
```jsx
      const [memView, setMemView] = useState('list'); // 'list' | 'graph'
```
Dans la barre de mode (après le bloc des boutons `mem-mode-*`), ajouter le toggle liste/graphe :
```jsx
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <button data-testid="mem-view-list" className={memView === 'list' ? '' : 'ghost'}
                  onClick={() => setMemView('list')} style={{ fontSize: 10, padding: '3px 8px' }}>≣ liste</button>
                <button data-testid="mem-view-graph" className={memView === 'graph' ? '' : 'ghost'}
                  onClick={() => setMemView('graph')} style={{ fontSize: 10, padding: '3px 8px' }}>🕸️ graphe</button>
              </div>
```

- [ ] **Step 3: Rendre le graphe quand `memView==='graph'`** — remplacer le conteneur grille de la modale. Repérer la ligne du conteneur interne :
`<div style={{ width: 900, maxWidth: '95vw', height: '82vh', background: '#0b0f19', border: '1px solid #1e293b', borderRadius: 10, display: 'grid', gridTemplateColumns: '300px 1fr', overflow: 'hidden' }} onMouseDown={(e) => e.stopPropagation()}>`
et remplacer `gridTemplateColumns: '300px 1fr'` par `gridTemplateColumns: memView === 'graph' ? '1fr 300px' : '300px 1fr'`.

Puis, juste avant le bloc `{showResults ? (` (la liste), envelopper la colonne de gauche : quand `memView==='graph'`, afficher le graphe à la place de la liste. Remplacer l'ouverture de la colonne gauche :
`<div style={{ borderRight: '1px solid #1e293b', overflow: 'auto', padding: 10 }}>`
… reste inchangé, mais ajouter AVANT `{showResults ? (` :
```jsx
              {memView === 'graph' ? <MemoryGraph onOpen={open} /> : (<>
```
et FERMER le fragment juste après la fin du bloc liste (après le `))}` de `['brain','facts'].map`) par :
```jsx
              </>)}
```
(La barre de recherche + toggles restent visibles au-dessus ; le graphe occupe la zone de liste.)

- [ ] **Step 4: Prouver (DOM)** — recharger `/builder`, ouvrir 🧠 Mémoire, cliquer 🕸️ graphe :
```js
document.querySelector('[data-testid="btn-memory"]').click();
await new Promise(r=>setTimeout(r,500));
document.querySelector('[data-testid="mem-view-graph"]').click();
await new Promise(r=>setTimeout(r,800));
const svg = document.querySelector('[data-testid="mem-graph-svg"]');
const nodes = document.querySelectorAll('[data-testid="mem-graph-node"]');
nodes[0] && nodes[0].dispatchEvent(new MouseEvent('click',{bubbles:true}));
await new Promise(r=>setTimeout(r,400));
({ svg: !!svg, nodeCount: nodes.length, noteOpened: !!document.querySelector('[data-testid="mem-note-body"]') })
```
Expected: `svg` true, `nodeCount` > 20, clic nœud → `mem-note-body` présent (note ouverte). Capture `memory-graph`.

- [ ] **Step 5: Régression validateurs** — `cd llm-lego && node run-validators.mjs` → verts (testids Mémoire CT-4 intacts).

- [ ] **Step 6: Commit** *(gate)* — `git add llm-lego/builder.html && git commit -m "llm-lego: brique3a — MemoryGraph (force-directed SVG) + toggle liste|graphe"`

---

## Task 6 — validateur graphe + non-régression finale (U6)

**Files:**
- Create: `llm-lego/memory-graph-validate.mjs`

**Interfaces:** démarre demo-server avec racines temp (dont un sous-dossier + un lien) + port dédié.

- [ ] **Step 1: Écrire `memory-graph-validate.mjs`**

```js
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
  if (!ready) throw new Error(`serveur pas prêt sur ${BASE}`);

  const g = await j("/api/memory/graph");
  check("graph 200 + forme {nodes,edges,dropped,ambiguous}", g.status === 200 && Array.isArray(g.body.nodes) && Array.isArray(g.body.edges) && typeof g.body.dropped === "number" && typeof g.body.ambiguous === "number");
  check("note sous-dossier présente comme nœud", g.body.nodes.some((n) => n.id === "brain/doctrine/rules"));
  check("arête home→doctrine/rules présente", g.body.edges.some((e) => e.source === "brain/home" && e.target === "brain/doctrine/rules"));
  check("self-link home→home absent", !g.body.edges.some((e) => e.source === e.target));

  console.log(`\n  memory-graph-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
  exitCode = fail === 0 ? 0 : 1;
} catch (e) { console.error(`  ❌ ${String((e && e.message) || e)}`); exitCode = 1; }
shutdown(exitCode);
```

- [ ] **Step 2: Lancer** — `cd llm-lego && node memory-graph-validate.mjs` → `✅ 4/4 PASS`, exit 0.

- [ ] **Step 3: Régression finale** — `cd llm-lego && node run-validators.mjs && ./node_modules/.bin/vitest run`
Expected : run-validators ✅ (36 validateurs, +memory-graph-validate) ❌0 ; vitest tous verts (memory +4, memory-recall +2, memory-graph +5).

- [ ] **Step 4: Commit** *(gate)* — `git add llm-lego/memory-graph-validate.mjs && git commit -m "llm-lego: brique3a — memory-graph-validate.mjs + non-régression"`

---

## Self-Review (fait)

- **Couverture spec** : A1 (récursif/ids/exclusion) → T1 ; A1-conséquences recherche → T2 ; A2/A3 (résolution+hygiène+degree) → T3 ; endpoint §3.3 → T4 ; rendu+toggle §3.4/3.5 → T5 ; preuve §5 (sous-dossier trouvé, ambiguous, self-link, doublon, dropped, incrémental stable, endpoint, UI) → T1-T6. ✅
- **Placeholders** : aucun (code complet).
- **Cohérence types** : `id="root/relpath"` ; `buildGraph→{nodes:[{id,root,title,tags,degree}],edges:[{source,target}],dropped,ambiguous}` ; `onOpen({root,id})` où `id`=relpath (dérivé `n.id.slice(root.length+1)`) → cohérent T3↔T4↔T5. ✅
- **Ordre** : T1→T2→T3→T4→T5→T6.
