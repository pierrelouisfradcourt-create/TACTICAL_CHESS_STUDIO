// imp-board.mjs — board interactif des IMP (projet × lane × blocage) pour le cockpit Accueil.
// LECTURE SEULE. Parser ligne-à-ligne (pas de lib YAML, cohérent avec cockpit.mjs).
// Source : lab/chains/IMPROVEMENT_LEDGER.yaml (champs project/theme ajoutés par IMP-256).
import { readFileSync, existsSync } from "node:fs";

const IMP_START = /^- id:\s*(IMP-\S+)/;
export const LANES = ["SAFE_AUTO", "AUDIT_REQUIRED", "HUMAN_REQUIRED"];
// Ordre d'affichage des sections ; les projets sans IMP non-clos sont omis.
export const PROJECT_ORDER = ["factory", "rocky", "chess_tcg", "belote", "auto_battler", "frosthaven"];

// Parse un bloc IMP démarrant à "- id: IMP-…". Gère : champs simples ligne unique,
// blocked_by en flow vide (`[]`), inline (`[IMP-x, IMP-y]`) ou liste bloc (`- IMP-x`),
// et notes multi-lignes (accumulation des lignes de continuation indentées).
export function parseLedger(text) {
  const blocks = [];
  let cur = null;
  let listKey = null;    // clé de liste bloc en cours (ex: "blocked_by")
  let contField = null;  // scalaire replié en cours d'accumulation : "title" | "notes" | null
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(IMP_START);
    if (m) {
      if (cur) blocks.push(cur);
      cur = { id: m[1], title: null, status: null, lane: null, project: null, theme: null, blocked_by: [], notes: null };
      listKey = null; contField = null;
      continue;
    }
    if (!cur) continue;

    // item de liste bloc : "  - IMP-x"
    const li = line.match(/^\s+-\s+(\S.*?)\s*$/);
    if (li) {
      if (listKey === "blocked_by") cur.blocked_by.push(li[1].trim());
      contField = null;
      continue;
    }

    // clé "  xxx: valeur"
    const kv = line.match(/^\s+([a-z_]+):\s?(.*)$/i);
    if (kv) {
      const k = kv[1].toLowerCase();
      const v = kv[2] || "";
      listKey = null; contField = null;
      if (k === "title" && cur.title == null) { cur.title = v; contField = "title"; }        // titre replié multi-ligne possible
      else if (k === "status" && cur.status == null) cur.status = v.trim();
      else if (k === "lane" && cur.lane == null) cur.lane = v.trim();
      else if (k === "project" && cur.project == null) cur.project = v.trim();
      else if (k === "theme" && cur.theme == null) cur.theme = v.trim();
      else if (k === "blocked_by") {
        const inline = v.trim();
        if (inline === "" ) { listKey = "blocked_by"; }            // liste bloc suit
        else if (inline === "[]") { cur.blocked_by = []; }         // flow vide
        else { cur.blocked_by = inline.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean); } // flow inline
      } else if (k === "notes" && cur.notes == null) { cur.notes = v; contField = "notes"; }  // notes repliées multi-ligne
      continue;
    }

    // ligne de continuation (indentée, ni clé ni tiret) → prolonge le scalaire replié courant
    if (contField) {
      const cont = line.trim();
      if (cont) cur[contField] = ((cur[contField] || "") + " " + cont).trim();
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

// Normalise un scalaire replié accumulé (notes) : retire une éventuelle quote d'ouverture/
// fermeture orpheline (scalaire YAML multi-ligne) et rétablit les quotes doublées.
function normScalar(s) {
  if (!s) return "";
  let t = s.trim();
  if (t.startsWith("'") && !t.startsWith("''")) t = t.slice(1);
  if (t.endsWith("'") && !t.endsWith("''")) t = t.slice(0, -1);
  if (t.startsWith('"')) t = t.slice(1);
  if (t.endsWith('"')) t = t.slice(0, -1);
  return t.replace(/''/g, "'").replace(/""/g, '"').trim();
}

// Dérive une phrase courte "pourquoi cette lane" à partir de lane + blocked_by (jamais du hasard).
function whyLane(lane, blockedBy) {
  const base = {
    SAFE_AUTO: "Automatisable (SAFE_AUTO) — aucun gate humain requis pour lancer.",
    AUDIT_REQUIRED: "Revue requise (AUDIT_REQUIRED) — audit avant merge.",
    HUMAN_REQUIRED: "Décision humaine requise (HUMAN_REQUIRED).",
  }[lane] || `Lane ${lane || "—"}.`;
  if (blockedBy && blockedBy.length) return base + ` Bloqué par ${blockedBy.join(", ")} — non déployable tant que non résolu(s).`;
  return base + " Aucun bloqueur (blocked_by vide).";
}

// Signal stratégique DÉTERMINISTE (capteur lecture seule, Phase 2) — dérivé de status+blockers+lane
// + dépendants aval (arêtes inverses de blocked_by). AUCUN LLM, AUCUNE écriture. `reasons` toujours explicites.
function deriveFeedback(card, dependents) {
  const blk = card.blocked_by;
  const reasons = [];
  let score = 0;
  if (card.status === "FAIL")   { score += 3; reasons.push("statut FAIL (échec courant)"); }
  if (card.status === "FROZEN") { score += 1; reasons.push("gelé (FROZEN)"); }
  if (blk.length)               { score += blk.length; reasons.push(`bloqué par ${blk.length} IMP (${blk.join(", ")})`); }
  if (dependents.length)        { score += dependents.length; reasons.push(`${dependents.length} dépendant(s) aval`); }
  if (!reasons.length) reasons.push("aucun bloqueur, aucun dépendant structuré");
  const level = score >= 3 ? "high" : score >= 1 ? "medium" : "low";

  let observation, recommendation;
  if (card.status === "FAIL") {
    observation = `Échec courant (FAIL)${dependents.length ? ` — bloque ${dependents.length} IMP en aval` : ""}.`;
    recommendation = "Traiter l'échec avant de débloquer la suite (HumanGate).";
  } else if (card.status === "FROZEN") {
    observation = `Gelé (FROZEN)${dependents.length ? ` — ${dependents.length} dépendant(s) en attente` : ""}.`;
    recommendation = dependents.length ? "Décision de dégel (HumanGate) si les dépendants sont prioritaires." : "Gelé — pas d'action tant que non dégelé.";
  } else if (blk.length) {
    observation = `Bloqué par ${blk.join(", ")} — dépendance amont non résolue${dependents.length ? ` ; ${dependents.length} dépendant(s) aval` : ""}.`;
    recommendation = `Résoudre d'abord ${blk.join(", ")}.`;
  } else if (card.deployable && dependents.length) {
    observation = `Déployable ; débloque ${dependents.length} dépendant(s) aval (${dependents.join(", ")}).`;
    recommendation = `Lancer en priorité — débloque ${dependents.length} dépendant(s).`;
  } else if (card.deployable) {
    observation = "Déployable — aucun bloqueur, aucun dépendant structuré.";
    recommendation = "Prêt, faible enjeu.";
  } else {
    observation = `Statut ${card.status}, lane ${card.lane}.`;
    recommendation = "Revue de statut.";
  }
  return { observation, risk: { level, score, reasons }, recommendation, impact: dependents };
}

// Agrège les IMP non-CLOSED en sections project × colonnes lane. LECTURE SEULE.
export function buildImpBoard({ ledgerPath }) {
  let blocks = [];
  if (ledgerPath && existsSync(ledgerPath)) {
    try { blocks = parseLedger(readFileSync(ledgerPath, "utf-8")); } catch { blocks = []; }
  }
  const wellFormed = blocks.filter((b) => b.status);           // sans status = malformé
  const skipped = blocks.length - wellFormed.length;
  const nonClosed = wellFormed.filter((b) => b.status !== "CLOSED");

  const cards = nonClosed.map((b) => {
    const blocked = Array.isArray(b.blocked_by) ? b.blocked_by : [];
    return {
      id: b.id,
      title: normScalar(b.title) || b.id,
      project: b.project || "factory",                          // défaut sûr si champ absent
      theme: b.theme || "—",
      lane: b.lane || "—",
      status: b.status,
      blocked_by: blocked,
      deployable: b.status === "OPEN" && blocked.length === 0,  // déployable = OPEN ET non bloqué (exclut FROZEN/REJECTED/FAIL/CLOSED)
      why: whyLane(b.lane, blocked),
      notes: normScalar(b.notes),
    };
  });

  // Arêtes inverses de blocked_by parmi les cartes AFFICHÉES → impact = dépendants aval. Lecture seule.
  const dependents = {};
  for (const c of cards) for (const dep of c.blocked_by) (dependents[dep] = dependents[dep] || []).push(c.id);
  for (const c of cards) c.feedback = deriveFeedback(c, dependents[c.id] || []);

  // groupement project -> lane -> [cards]
  const byProject = {};
  for (const c of cards) {
    const p = (byProject[c.project] = byProject[c.project] || { project: c.project, lanes: {}, total: 0, deployable: 0 });
    (p.lanes[c.lane] = p.lanes[c.lane] || []).push(c);
    p.total++; if (c.deployable) p.deployable++;
  }
  // ordre : PROJECT_ORDER connu d'abord, puis tout projet inattendu (alpha)
  const known = PROJECT_ORDER.filter((p) => byProject[p]);
  const extra = Object.keys(byProject).filter((p) => !PROJECT_ORDER.includes(p)).sort();
  const projects = [...known, ...extra].map((p) => byProject[p]);

  return {
    lanes: LANES,
    projects,
    counts: {
      total: wellFormed.length,
      nonClosed: nonClosed.length,
      deployable: cards.filter((c) => c.deployable).length,
      skipped,
    },
  };
}
