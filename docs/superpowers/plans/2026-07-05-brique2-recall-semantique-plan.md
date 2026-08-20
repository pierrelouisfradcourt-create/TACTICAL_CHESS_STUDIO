# Brique 2 — Recall sémantique — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un recall sémantique local (embeddings LM Studio nomic-embed) sur la mémoire CT-4, greffé sur `/api/memory/search?mode=semantic`, avec dégradation propre vers le mot-clé.

**Architecture:** Un module pur `memory-recall.mjs` (embedder injecté) embeddée les notes via LM Studio, cache les vecteurs dans `.memory-index.json` (incrémental + atomique), et classe par cosinus. `demo-server.ts` étend `/api/memory/search` avec `mode=semantic` + fail-soft. La vue Mémoire du builder gagne un toggle mot-clé/sémantique.

**Tech Stack:** Node ESM (`.mjs`, pas de build), `fetch` + `AbortController`, LM Studio `/v1/embeddings` (`text-embedding-nomic-embed-text-v1.5`), vitest, React inline (builder.html).

## Global Constraints

- **100 % local** : embeddings via LM Studio `:1234` uniquement. **Jamais d'API externe** (CLAUDE.md).
- **Fail-soft absolu** : LM Studio down / modèle non chargé / dimension incohérente / **timeout ~10 s** → **jamais d'erreur client**, toujours retomber sur le mot-clé.
- **Préfixes nomic-v1.5 OBLIGATOIRES** : doc = `"search_document: " + title + "\n" + body` (tronqué **4000** car.) ; requête = `"search_query: " + query`. Versionnés `prefixes: "v1"` → rebuild complet si changement.
- **Index atomique** : `.tmp` + `rename`, uniquement en fin de build réussi. Jamais d'index partiel. `.memory-index.json` **gitignoré**.
- `mode` défaut **`keyword`** → `/api/memory/search` de CT-4 **inchangé** (rétro-compat).
- **`src/` (Rust) et `llm-lego/src/` (TS)** intacts. Modifs : `demo-server.ts`, `builder.html` ; nouveaux `memory-recall.mjs`, `tests/memory-recall.test.ts`, `memory-recall-validate.mjs`, `.gitignore`.
- **Aucun commit sans go explicite Pierre.** Défauts §8 : `k=8`, pas de seuil, E2E gaté `TCS_RUN_EMBED=1`.

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `llm-lego/memory-recall.mjs` | cosine, index incrémental+atomique, recall, embedder LM Studio | Créer |
| `llm-lego/tests/memory-recall.test.ts` | unit (embed mocké) : cosine, index incrémental, recall, fail-soft | Créer |
| `llm-lego/demo-server.ts` | route `search?mode=semantic` + fail-soft + config embed | Modifier |
| `llm-lego/builder.html` | toggle mot-clé/sémantique + résultats classés dans la vue Mémoire | Modifier |
| `llm-lego/memory-recall-validate.mjs` | validateur fail-soft (serveur+racines temp, port embed mort) | Créer |
| `llm-lego/.gitignore` | ignorer `.memory-index.json` | Créer/Modifier |

---

## Task 1 — Module `memory-recall.mjs` : cosine + index + recall (U1+U2), embed mocké

**Files:**
- Create: `llm-lego/memory-recall.mjs`
- Test: `llm-lego/tests/memory-recall.test.ts`

**Interfaces:**
- Consumes: `listNotes`, `readNote` de `memory-store.mjs`.
- Produces:
  - `PREFIXES_VERSION: "v1"`, `cosine(a:number[], b:number[]) → number`
  - `buildOrUpdateIndex(roots, { embed, indexPath, model }) → Promise<{model,prefixes,dim,builtAt,entries}>`
  - `recall(roots, query, { embed, indexPath, model, k=8, rootFilter="all" }) → Promise<{model, hits:{root,id,title,snippet,score}[]}>`
  - `lmStudioEmbed(texts, {url,model,timeoutMs}) → Promise<number[][]>` (Task 2)

- [ ] **Step 1: Write failing tests** — `llm-lego/tests/memory-recall.test.ts`

```ts
import { it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cosine, buildOrUpdateIndex, recall, PREFIXES_VERSION } from "../memory-recall.mjs";

// Embedder mock : bag-of-words sur un vocab fixe → cosinus déterministe. Compte les appels.
const VOCAB = ["chess", "elo", "belote", "memoire"];
let embedCalls: string[][];
const mockEmbed = async (texts: string[]) => {
  embedCalls.push(texts);
  return texts.map((t) => VOCAB.map((w) => (t.toLowerCase().includes(w) ? 1 : 0)));
};

let roots: { brain: string; facts: string }, idx: string;
beforeEach(() => {
  const brain = mkdtempSync(path.join(tmpdir(), "rb-"));
  const facts = mkdtempSync(path.join(tmpdir(), "rf-"));
  writeFileSync(path.join(brain, "a.md"), "# Chess engine\n\nRocky ELO progresse.", "utf-8");
  writeFileSync(path.join(facts, "b.md"), "# Belote\n\nlaboratoire de methode.", "utf-8");
  roots = { brain, facts }; idx = path.join(facts, ".idx.json"); embedCalls = [];
});
afterEach(() => { rmSync(roots.brain, { recursive: true, force: true }); rmSync(roots.facts, { recursive: true, force: true }); });

it("cosine : identiques→1, orthogonaux→0", () => {
  expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
  expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
});
it("buildOrUpdateIndex embeddée les 2 notes avec prefixes v1", async () => {
  const index = await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m" });
  expect(index.prefixes).toBe(PREFIXES_VERSION);
  expect(Object.keys(index.entries).sort()).toEqual(["brain/a", "facts/b"]);
  // le texte doc porte bien le préfixe search_document:
  expect(embedCalls[0].every((t) => t.startsWith("search_document: "))).toBe(true);
});
it("réindex incrémental : note inchangée non ré-embeddée, note modifiée ré-embeddée", async () => {
  await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m" });
  embedCalls = [];
  writeFileSync(path.join(roots.brain, "a.md"), "# Chess engine v2\n\nRocky ELO monte.", "utf-8");
  await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m" });
  const embeddedTexts = embedCalls.flat();
  expect(embeddedTexts.length).toBe(1);
  expect(embeddedTexts[0]).toContain("Chess engine v2");
});
it("changement de model → rebuild complet", async () => {
  await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m1" });
  embedCalls = [];
  await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m2" });
  expect(embedCalls.flat().length).toBe(2); // les 2 re-embeddées
});
it("recall classe par similarité (requête préfixée search_query)", async () => {
  const r = await recall(roots, "chess elo", { embed: mockEmbed, indexPath: idx, model: "m", k: 2 });
  expect(r.hits[0].id).toBe("a");           // la note chess/elo sort 1ère
  expect(r.hits[0].score).toBeGreaterThan(r.hits[1].score);
  expect(embedCalls.some((c) => c.some((t) => t.startsWith("search_query: ")))).toBe(true);
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd llm-lego && npx vitest run tests/memory-recall.test.ts`
Expected: FAIL (`Cannot find module '../memory-recall.mjs'`).

- [ ] **Step 3: Implement `memory-recall.mjs`** (sans `lmStudioEmbed`, ajouté Task 2 — mais on l'importe comme défaut ; pour Task 1 les tests injectent `embed`, donc l'export par défaut peut déjà exister en stub. On écrit le fichier COMPLET ici, `lmStudioEmbed` inclus, pour éviter un fichier cassé.)

```js
// memory-recall.mjs — CT-4 brique 2 : recall sémantique (embedder injecté, aucun build).
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { listNotes, readNote } from "./memory-store.mjs";

export const PREFIXES_VERSION = "v1";
const DOC_PREFIX = "search_document: ";
const QUERY_PREFIX = "search_query: ";
const MAX_CHARS = 4000;
const DEFAULT_MODEL = "text-embedding-nomic-embed-text-v1.5";

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function docText(note) {
  return (DOC_PREFIX + (note.title || note.id) + "\n" + (note.body || "")).slice(0, MAX_CHARS);
}

// LM Studio embedder réel — POST /v1/embeddings, timeout, erreurs typées EMBED_UNAVAILABLE.
export async function lmStudioEmbed(texts, { url = "http://localhost:1234", model = DEFAULT_MODEL, timeoutMs = 10000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url.replace(/\/$/, "") + "/v1/embeddings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: texts }), signal: ctrl.signal,
    });
  } catch (e) {
    const err = new Error(`embeddings injoignable/timeout: ${e && e.message}`); err.code = "EMBED_UNAVAILABLE"; throw err;
  } finally { clearTimeout(timer); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.data)) {
    const err = new Error(`embeddings erreur: ${(data && data.error) || res.status}`); err.code = "EMBED_UNAVAILABLE"; throw err;
  }
  const vecs = data.data.map((d) => d.embedding);
  if (vecs.length !== texts.length || vecs.some((v) => !Array.isArray(v) || v.length === 0)) {
    const err = new Error("embeddings dimension incohérente"); err.code = "EMBED_UNAVAILABLE"; throw err;
  }
  return vecs;
}

function loadIndex(indexPath) {
  if (!existsSync(indexPath)) return null;
  try { return JSON.parse(readFileSync(indexPath, "utf-8")); } catch { return null; }
}
function saveIndexAtomic(indexPath, index) {
  const tmp = indexPath + ".tmp";
  writeFileSync(tmp, JSON.stringify(index), "utf-8");
  renameSync(tmp, indexPath); // atomique : jamais d'index partiel visible
}

export async function buildOrUpdateIndex(roots, { embed = lmStudioEmbed, indexPath, model = DEFAULT_MODEL } = {}) {
  const { notes } = listNotes(roots);
  const wanted = new Map(notes.map((n) => [`${n.root}/${n.id}`, n]));
  const prev = loadIndex(indexPath);
  const stale = !prev || prev.model !== model || prev.prefixes !== PREFIXES_VERSION;
  const entries = stale ? {} : { ...(prev.entries || {}) };

  for (const key of Object.keys(entries)) if (!wanted.has(key)) delete entries[key]; // notes disparues

  const todo = [];
  for (const [key, n] of wanted) {
    const c = entries[key];
    if (!c || c.mtimeMs !== n.mtimeMs) todo.push([key, n]);
  }
  if (todo.length) {
    const texts = todo.map(([, n]) => docText(readNote(roots, n.root, n.id)));
    const vecs = await embed(texts, { model }); // peut jeter EMBED_UNAVAILABLE
    todo.forEach(([key, n], i) => { entries[key] = { mtimeMs: n.mtimeMs, vector: vecs[i] }; });
  }
  const dim = (Object.values(entries)[0] || {}).vector?.length || 0;
  const next = { model, prefixes: PREFIXES_VERSION, dim, builtAt: Date.now(), entries };
  saveIndexAtomic(indexPath, next);
  return next;
}

export async function recall(roots, query, { embed = lmStudioEmbed, indexPath, model = DEFAULT_MODEL, k = 8, rootFilter = "all" } = {}) {
  const index = await buildOrUpdateIndex(roots, { embed, indexPath, model });
  const [qvec] = await embed([QUERY_PREFIX + String(query || "")], { model });
  const scored = [];
  for (const [key, e] of Object.entries(index.entries)) {
    const slash = key.indexOf("/");
    const root = key.slice(0, slash), id = key.slice(slash + 1);
    if (rootFilter !== "all" && root !== rootFilter) continue;
    scored.push({ root, id, score: cosine(qvec, e.vector) });
  }
  scored.sort((a, b) => b.score - a.score);
  const hits = scored.slice(0, k).map((s) => {
    const note = readNote(roots, s.root, s.id);
    return { root: s.root, id: s.id, title: note.title, snippet: note.body.replace(/\s+/g, " ").trim().slice(0, 120), score: Math.round(s.score * 1000) / 1000 };
  });
  return { model, hits };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `cd llm-lego && npx vitest run tests/memory-recall.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Full vitest** — `cd llm-lego && npx vitest run` → 68 passed (63 + 5) / 1 skipped.

- [ ] **Step 6: Commit** *(gate Pierre)* — `git add llm-lego/memory-recall.mjs llm-lego/tests/memory-recall.test.ts && git commit -m "llm-lego: brique2 — memory-recall.mjs (cosine, index incrémental atomique, recall)"`

---

## Task 2 — Preuve fail-soft de `lmStudioEmbed` (U3)

**Files:**
- Modify: `llm-lego/tests/memory-recall.test.ts` (ajouter 1 test)

**Interfaces:**
- Consumes: `lmStudioEmbed` (déjà écrit Task 1).

- [ ] **Step 1: Add failing test** (port mort → `EMBED_UNAVAILABLE`, timeout court)

```ts
import { lmStudioEmbed } from "../memory-recall.mjs";
it("lmStudioEmbed sur port mort → EMBED_UNAVAILABLE (rapide)", async () => {
  await expect(
    lmStudioEmbed(["x"], { url: "http://127.0.0.1:59999", timeoutMs: 1500 })
  ).rejects.toMatchObject({ code: "EMBED_UNAVAILABLE" });
});
```

- [ ] **Step 2: Run** — `cd llm-lego && npx vitest run tests/memory-recall.test.ts` → PASS (le code Task 1 gère déjà ce cas ; ce test le verrouille). 6 tests.

- [ ] **Step 3: Commit** *(gate)* — `git add llm-lego/tests/memory-recall.test.ts && git commit -m "llm-lego: brique2 — test fail-soft lmStudioEmbed (port mort)"`

---

## Task 3 — Route `/api/memory/search?mode=semantic` + fail-soft (U4)

**Files:**
- Modify: `llm-lego/demo-server.ts` (imports + config embed + remplacer la route search)

**Interfaces:**
- Consumes: `recall`, `lmStudioEmbed` de Task 1 ; `searchNotes` existant.
- Produces: `GET /api/memory/search?q&root&mode&k` → `{q,mode,hits,degraded?}`.

- [ ] **Step 1: Ajouter imports + config** (près des imports memory-store et de `MEM_ROOTS`)

```ts
import { recall, lmStudioEmbed } from "./memory-recall.mjs";
```
Après `MEM_ROOTS` :
```ts
const MEM_INDEX_PATH = path.join(__dirname, ".memory-index.json");
const EMBED_URL = process.env["TCS_EMBED_URL"] || "http://localhost:1234";
const EMBED_MODEL = process.env["TCS_EMBED_MODEL"] || "text-embedding-nomic-embed-text-v1.5";
const embedFn = (texts: string[]) => lmStudioEmbed(texts, { url: EMBED_URL, model: EMBED_MODEL });
```

- [ ] **Step 2: Remplacer la route search** (celle de CT-4)

Remplacer :
```ts
if (pathname === "/api/memory/search" && req.method === "GET") {
  try { sendJson(res, 200, searchNotes(MEM_ROOTS, url.searchParams.get("q") || "", url.searchParams.get("root") || "all")); }
  catch (e) { sendJson(res, (e as any).status || 500, { error: String((e as any).message || e) }); }
  return;
}
```
par :
```ts
if (pathname === "/api/memory/search" && req.method === "GET") {
  const q = url.searchParams.get("q") || "";
  const root = url.searchParams.get("root") || "all";
  const mode = url.searchParams.get("mode") || "keyword";
  const k = Number(url.searchParams.get("k")) || 8;
  if (mode !== "semantic") {
    try { sendJson(res, 200, { ...searchNotes(MEM_ROOTS, q, root), mode: "keyword" }); }
    catch (e) { sendJson(res, (e as any).status || 500, { error: String((e as any).message || e) }); }
    return;
  }
  void (async () => {
    try {
      const r = await recall(MEM_ROOTS, q, { embed: embedFn, indexPath: MEM_INDEX_PATH, model: EMBED_MODEL, k, rootFilter: root });
      sendJson(res, 200, { q, mode: "semantic", hits: r.hits });
    } catch (e) { // fail-soft → mot-clé
      sendJson(res, 200, { ...searchNotes(MEM_ROOTS, q, root), mode: "keyword-fallback", degraded: { reason: String((e as any).message || e) } });
    }
  })();
  return;
}
```

- [ ] **Step 3: Prouver** (redémarrer :3000, `TCS_EMBED_URL` mort → fallback déterministe)

```bash
cd llm-lego
# tuer l'instance :3000 puis relancer avec un embed URL mort pour forcer le fallback
netstat -ano | grep ':3000' | grep LISTENING   # noter le PID, taskkill /F /PID <pid>
TCS_EMBED_URL=http://127.0.0.1:59999 node demo-server.ts &
sleep 1
echo "--- keyword (défaut, inchangé) ---"; curl -s "http://localhost:3000/api/memory/search?q=elo" | head -c 120
echo; echo "--- semantic avec embed mort → keyword-fallback ---"; curl -s "http://localhost:3000/api/memory/search?q=elo&mode=semantic" | head -c 160
```
Expected: 1er → `"mode":"keyword"` ; 2e → `"mode":"keyword-fallback"` + `"degraded"`. (Le sémantique réel se teste avec LM Studio + nomic chargé, cf. Task 5.)

- [ ] **Step 4: Commit** *(gate)* — `git add llm-lego/demo-server.ts && git commit -m "llm-lego: brique2 — route search?mode=semantic + fail-soft"`

---

## Task 4 — Toggle sémantique dans la vue Mémoire (U5)

**Files:**
- Modify: `llm-lego/builder.html` (composant `MemoryModal`)

**Interfaces:**
- Consumes: `GET /api/memory/search?mode=semantic&q&k`.
- Produces (testids): `mem-mode-keyword`, `mem-mode-semantic`, `mem-hit`, `mem-degraded`.

- [ ] **Step 1: Étendre `MemoryModal`** — ajouter état + recherche sémantique. Remplacer le début du composant (les hooks + le calcul `filtered`) par :

```jsx
function MemoryModal({ onClose }) {
  const [notes, setNotes] = useState(null);
  const [err, setErr] = useState(null);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('keyword');     // 'keyword' | 'semantic'
  const [results, setResults] = useState(null);    // hits sémantiques ({root,id,title,snippet,score}) ou null
  const [degraded, setDegraded] = useState(null);
  useEffect(() => {
    fetch('/api/memory').then((r) => r.json())
      .then((d) => setNotes(d.notes || [])).catch((e) => setErr(String(e)));
  }, []);
  const open = (n) => fetch(`/api/memory/${n.root}/${encodeURIComponent(n.id)}`)
    .then((r) => r.json()).then(setSel).catch((e) => setErr(String(e)));
  const runSemantic = () => {
    if (!q.trim()) { setResults(null); setDegraded(null); return; }
    fetch(`/api/memory/search?mode=semantic&k=8&q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => { setResults(d.hits || []); setDegraded(d.mode === 'keyword-fallback' ? (d.degraded || { reason: '' }) : null); })
      .catch((e) => setErr(String(e)));
  };
  const filtered = (notes || []).filter((n) =>
    !q || (`${n.title} ${n.id} ${(n.tags || []).join(' ')}`).toLowerCase().includes(q.toLowerCase()));
  const group = (root) => filtered.filter((n) => n.root === root);
  const showResults = mode === 'semantic' && results !== null;
```

- [ ] **Step 2: Remplacer la barre de recherche** (le `div` contenant `mem-search` + fermer) par la barre avec toggle :

```jsx
          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <input data-testid="mem-search" placeholder={mode === 'semantic' ? 'question… (Entrée)' : 'filtrer…'}
              value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && mode === 'semantic') runSemantic(); }} style={{ flex: 1, minWidth: 120 }} />
            <button className="ghost" data-testid="mem-close" onClick={onClose}>fermer</button>
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button data-testid="mem-mode-keyword" className={mode === 'keyword' ? '' : 'ghost'}
              onClick={() => { setMode('keyword'); setResults(null); setDegraded(null); }} style={{ fontSize: 10, padding: '3px 8px' }}>mot-clé</button>
            <button data-testid="mem-mode-semantic" className={mode === 'semantic' ? '' : 'ghost'}
              onClick={() => setMode('semantic')} style={{ fontSize: 10, padding: '3px 8px' }}>sémantique</button>
            {mode === 'semantic' && <button className="ghost" onClick={runSemantic} style={{ fontSize: 10, padding: '3px 8px' }}>chercher</button>}
          </div>
          {degraded && <div data-testid="mem-degraded" style={{ fontSize: 10, color: '#fbbf24', marginBottom: 6 }}>⚠ mode mot-clé — embeddings indispo ({String(degraded.reason).slice(0, 40)})</div>}
```

- [ ] **Step 3: Rendre la liste classée quand `showResults`** — remplacer le bloc `{['brain','facts'].map(...)}` par :

```jsx
          {showResults ? (
            <div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#6366f1', letterSpacing: 1, margin: '6px 0 4px' }}>résultats sémantiques · {results.length}</div>
              {results.map((h) => (
                <button key={h.root + h.id} data-testid="mem-hit" className="palette" style={{ width: '100%', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}
                  onClick={() => open(h)} title={h.snippet}>
                  <span>{h.title}</span><span style={{ color: '#64748b', fontSize: 10 }}>{h.score}</span>
                </button>
              ))}
              {results.length === 0 && <div style={{ color: '#64748b', fontSize: 11 }}>aucun résultat.</div>}
            </div>
          ) : ['brain', 'facts'].map((root) => (
            <div key={root}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#6366f1', letterSpacing: 1, margin: '10px 0 4px' }}>
                {root === 'brain' ? 'studio_brain (humain)' : 'memory (machine)'} · {group(root).length}
              </div>
              {group(root).map((n) => (
                <button key={root + n.id} data-testid="mem-note" className="palette" style={{ width: '100%', marginBottom: 3 }}
                  onClick={() => open(n)} title={(n.tags || []).map((t) => '#' + t).join(' ')}>
                  {n.title}
                </button>
              ))}
            </div>
          ))}
```

- [ ] **Step 4: Prouver (DOM)** — recharger `/builder`, ouvrir 🧠 Mémoire :

```js
document.querySelector('[data-testid="btn-memory"]').click();
document.querySelector('[data-testid="mem-mode-semantic"]').click();
const inp = document.querySelector('[data-testid="mem-search"]'); inp.value = 'moteur echecs';
inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
// après ~1s : mem-hit (si LM Studio+nomic chargé) OU mem-degraded (sinon) — les deux = succès UI
```
Expected : toggle présent ; en sémantique, soit `mem-hit` classés (embeddings up), soit `mem-degraded` (fail-soft). Capture `memory-semantic`.

- [ ] **Step 5: Régression validateurs** — `cd llm-lego && node run-validators.mjs` → attendu ✅749 ❌0 (la vue Mémoire garde ses testids CT-4).

- [ ] **Step 6: Commit** *(gate)* — `git add llm-lego/builder.html && git commit -m "llm-lego: brique2 — toggle sémantique + résultats classés dans la vue Mémoire"`

---

## Task 5 — Validateur fail-soft + gitignore (U6)

**Files:**
- Create: `llm-lego/memory-recall-validate.mjs`
- Create/Modify: `llm-lego/.gitignore`

**Interfaces:**
- Consumes: démarre `demo-server.ts` avec racines temp + `TCS_EMBED_URL` mort + `PORT` dédié.

- [ ] **Step 1: `.gitignore`** — ajouter `.memory-index.json` et `.memory-index.json.tmp`.

```
.memory-index.json
.memory-index.json.tmp
```

- [ ] **Step 2: Écrire `memory-recall-validate.mjs`** (calqué sur `memory-validate.mjs` : serveur+racines temp, teardown taskkill, convention ✅/❌)

```js
// memory-recall-validate.mjs — preuve fail-soft brique 2, serveur+racines temp, embed URL mort.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_RECALL_PORT"] ?? "3119";
const BASE = `http://localhost:${PORT}`;
const brain = mkdtempSync(path.join(tmpdir(), "rv-brain-"));
const facts = mkdtempSync(path.join(tmpdir(), "rv-facts-"));
writeFileSync(path.join(brain, "chess.md"), "# Chess engine\n\nRocky ELO.", "utf-8");
writeFileSync(path.join(facts, "belote.md"), "# Belote\n\nlabo.", "utf-8");

let pass = 0, fail = 0;
const check = (name, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${name}`); };
const j = (p) => fetch(BASE + p).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

// embed URL mort → force le fail-soft ; racines temp → n'écrit rien de réel.
const server = spawn(process.execPath, ["demo-server.ts"], {
  cwd: __dirname,
  env: { ...process.env, TCS_BRAIN_DIR: brain, TCS_MEMORY_DIR: facts, TCS_EMBED_URL: "http://127.0.0.1:59999", PORT },
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

  const kw = await j("/api/memory/search?q=elo");
  check("keyword (défaut) → mode keyword", kw.status === 200 && kw.body.mode === "keyword");
  const sem = await j("/api/memory/search?q=elo&mode=semantic");
  check("semantic + embed mort → keyword-fallback", sem.status === 200 && sem.body.mode === "keyword-fallback" && !!sem.body.degraded);
  check("fallback renvoie quand même des hits (jamais cassé)", Array.isArray(sem.body.hits));

  console.log(`\n  memory-recall-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
  exitCode = fail === 0 ? 0 : 1;
} catch (e) { console.error(`  ❌ ${String((e && e.message) || e)}`); exitCode = 1; }
shutdown(exitCode);
```

- [ ] **Step 3: Lancer** — `cd llm-lego && node memory-recall-validate.mjs` → `✅ 3/3 PASS`, exit 0.

- [ ] **Step 4: Régression finale** — `cd llm-lego && node run-validators.mjs && npx vitest run`
Expected : run-validators ✅752 ❌0 (35 validateurs : +memory-recall-validate 3 ✅) ; vitest 68 ✅.

- [ ] **Step 5: Commit** *(gate)* — `git add llm-lego/memory-recall-validate.mjs llm-lego/.gitignore && git commit -m "llm-lego: brique2 — validateur fail-soft + gitignore .memory-index.json"`

---

## Task 6 — (manuel, gate Pierre) Preuve E2E sémantique réelle

**Files:** aucun. Étape opérateur.

- [ ] **Step 1:** Dans LM Studio, **charger** `text-embedding-nomic-embed-text-v1.5`.
- [ ] **Step 2:** `cd llm-lego && TCS_RUN_EMBED=1 node -e 'import("./memory-recall.mjs").then(async m=>{const r=await m.recall({brain:"../studio_brain",facts:process.env.USERPROFILE+"/.claude/projects/C--TACTICAL-CHESS-STUDIO/memory"}, "reglage de difficulte du moteur", {indexPath:".memory-index.json",k:5});console.log(r.hits.map(h=>h.id+" "+h.score))})'`
- [ ] **Step 3:** Vérifier qu'une note pertinente (ex. `imp234_depth_not_root_cause`) remonte en top-k là où `elo`/mot-clé échouerait. Capture. (Non exécuté en régression par défaut — gaté.)

---

## Self-Review (fait)

- **Couverture spec** : §3.1 module → T1+T2 ; §3.2 index (prefixes/atomique) → T1 (tests incrémental/model/atomic via renameSync) ; §3.3 route+fail-soft → T3 ; §3.4 UX → T4 ; §4 garde-fous (fail-soft, timeout, atomique, local, index jetable) → T1/T3/T5 ; §5 preuve → T1-T5 + T6 E2E ; §7 U1-U6 → T1-T5. ✅
- **Placeholders** : aucun (code complet). Les `"…"` du spec ne sont pas dans le plan.
- **Cohérence types** : `buildOrUpdateIndex/recall({embed,indexPath,model,k,rootFilter})`, `PREFIXES_VERSION="v1"`, `EMBED_UNAVAILABLE`, testids `mem-mode-*/mem-hit/mem-degraded` — cohérents T1↔T3↔T4↔T5. ✅
- **Ordre** : T1→T2→T3→(T4 ∥ T5)→T6(manuel). T3 dépend de T1 ; T4/T5 dépendent de T3.
