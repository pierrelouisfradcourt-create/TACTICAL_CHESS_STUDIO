// cockpit.mjs — brique 4b : agrégats studio (ledger + mémoire) pour le cockpit Accueil. LECTURE SEULE.
import { readFileSync, existsSync } from "node:fs";
import { listNotes } from "./memory-store.mjs";

const IMP_START = /^- id:\s*(IMP-\S+)/;

// Parse ligne-à-ligne : un bloc IMP démarre à "- id: IMP-…". Pas de lib YAML.
export function parseLedger(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(IMP_START);
    if (m) { if (cur) blocks.push(cur); cur = { id: m[1], title: null, status: null, lane: null }; continue; }
    if (!cur) continue;
    const t = line.match(/^\s+title:\s*(.+)$/); if (t && cur.title == null) cur.title = t[1].trim();
    const s = line.match(/^\s+status:\s*(\S+)/); if (s && cur.status == null) cur.status = s[1].trim();
    const l = line.match(/^\s+lane:\s*(\S+)/); if (l && cur.lane == null) cur.lane = l[1].trim();
  }
  if (cur) blocks.push(cur);
  return blocks;
}

export function buildCockpit({ ledgerPath, roots }) {
  let blocks = [];
  if (ledgerPath && existsSync(ledgerPath)) {
    try { blocks = parseLedger(readFileSync(ledgerPath, "utf-8")); } catch { blocks = []; }
  }
  const wellFormed = blocks.filter((b) => b.status);           // A1 : malformé (sans status) = skipped
  const skipped = blocks.length - wellFormed.length;           // invariant : wellFormed + skipped == blocks
  const closed = wellFormed.filter((b) => b.status === "CLOSED").length;
  const fail = wellFormed.filter((b) => b.status === "FAIL").length;
  const open = wellFormed.length - closed - fail;
  const openImps = wellFormed.filter((b) => b.status !== "CLOSED")
    .map((b) => ({ id: b.id, title: b.title || b.id, status: b.status, lane: b.lane || "—" }));
  const byLane = {};                                           // A2 : dynamique, lanes réellement présentes
  for (const b of openImps) { const k = b.lane || "—"; (byLane[k] = byLane[k] || { open: 0 }).open++; }
  let recentNotes = [];
  try {
    recentNotes = listNotes(roots).notes
      .slice().sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 8)
      .map((n) => ({ root: n.root, id: n.id, title: n.title, mtimeMs: n.mtimeMs }));
  } catch { recentNotes = []; }
  return { ledger: { total: wellFormed.length, closed, open, fail, skipped }, byLane, openImps, recentNotes };
}
