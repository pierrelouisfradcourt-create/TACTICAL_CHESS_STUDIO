// memory-store.mjs — CT-4 couche d'accès mémoire (racines injectées, aucun build).
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const MD = /\.md$/i;
const EXCLUDE_DIRS = new Set(["journal"]); // A1/Q1 : dossier d'archive exclu partout (un seul point)

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
  const rel = typeof id === "string" && id.endsWith(".md") ? id.slice(0, -3) : id;
  if (typeof rel !== "string" || rel === "") { const e = new Error(`id invalide: ${id}`); e.status = 400; throw e; }
  const segs = rel.split("/");
  if (segs.some((s) => s === "" || s === "." || s === "..")) { const e = new Error(`id invalide: ${id}`); e.status = 400; throw e; }
  const file = path.resolve(dir, ...segs) + ".md";
  if (!file.startsWith(path.resolve(dir) + path.sep)) { const e = new Error("chemin hors racine"); e.status = 400; throw e; }
  return file;
}

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
export function readNote(roots, root, id) {
  const dir = rootPath(roots, root);
  const file = safeFile(dir, id);
  if (!existsSync(file)) { const e = new Error(`introuvable: ${root}/${id}`); e.status = 404; throw e; }
  const st = statSync(file);
  const p = parseNote(readFileSync(file, "utf-8"));
  const rid = String(id).replace(MD, "");
  return { root, id: rid, relpath: `${rid}.md`, frontmatter: p.frontmatter, tags: p.tags, type: p.type, title: p.title || rid, wikilinks: p.wikilinks, body: p.body, mtimeMs: st.mtimeMs };
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
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${serializeFrontmatter(frontmatter)}${body ?? ""}`, "utf-8");
  const rid = String(id).replace(MD, "");
  return { ok: true, root, id: rid, relpath: `${rid}.md`, created: !exists };
}
