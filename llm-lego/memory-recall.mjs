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
