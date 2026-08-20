// Consolidation des calques construits PAR Claude Code (pilotage UI) — owner "claude".
// Reconstitue FIDÈLEMENT les 5 calques depuis leurs specs SOURCES (mêmes noeuds/edges que
// les scripts de build d'origine) et les co-localise dans UN seul état localStorage pour que
// l'espace "Claude" du menu Calques les affiche tous ensemble. Aucun contenu inventé : les
// specs proviennent de layer-specs.mjs, roadmap-layer.mjs, build-living-layer.mjs et de la
// bibliothèque roadmap-chess-tcg-3d. Écrit un JSON injectable (pas de navigateur ici).
import { readFileSync, writeFileSync } from "node:fs";
import { SPECS } from "./experiments/belote-claude/tools/layer-specs.mjs";

const NOTE_W = 180, NOTE_H = 112;
// id de calque déterministe (pas de Date.now/random pour rester reproductible et propre)
const layerId = (slug) => `layer-claude-${slug}`;
const nowISO = new Date().toISOString();

// Convertit une spec {nodes:[{id,title,text}], edges:[{from,to,loop?,condition?}]} en calque.
function specToLayer({ slug, name, nodes, edges, cols = 4, dx = 210, dy = 175, ox = 40, oy = 40 }) {
  const canvasNodes = nodes.map((n, i) => ({
    id: n.id, type: "note",
    x: ox + (i % cols) * dx, y: oy + Math.floor(i / cols) * dy,
    width: NOTE_W, height: NOTE_H,
    data: { title: n.title, text: n.text },
  }));
  const canvasEdges = edges.map((e, i) => ({
    id: e.id || `e-${slug}-${i + 1}`, from: e.from, to: e.to,
    ...(e.loop ? { loop: true } : {}), ...(e.condition ? { condition: e.condition } : {}),
  }));
  return { id: layerId(slug), name, nodes: canvasNodes, edges: canvasEdges,
    createdAt: nowISO, layerOwner: "claude", humanNote: "", roadmapMilestoneRef: null };
}

// ---- 1 & 2 : Belote process + arch (specs importées telles quelles) ----
const beloteProcess = specToLayer({ slug: "belote-process", name: SPECS.process.layerName,
  nodes: SPECS.process.nodes, edges: SPECS.process.edges, cols: 6, dx: 200, dy: 150 });
const beloteArch = specToLayer({ slug: "belote-arch", name: SPECS.arch.layerName,
  nodes: SPECS.arch.nodes, edges: SPECS.arch.edges, cols: 4, dx: 210, dy: 175 });

// ---- 3 : Belote — Roadmap visuelle (8 jalons, source = roadmap-layer.mjs) ----
const BELOTE_MS = [
  ["J1 · Cartes & barèmes", "Jeu de 32 cartes, barèmes atout/non-atout, invariant 162."],
  ["J2 · Distribution", "Deal en 2 temps : 5 cartes + retournée, complément à 8 après prise."],
  ["J3 · Enchère", "2 tours : prise de la retournée puis couleur libre. Choix du preneur + atout."],
  ["J4 · Règles du pli", "Obligations : fournir, monter à l'atout, couper/surcouper, partenaire maître = libre."],
  ["J5 · Décompte", "Points cartes + dix de der + belote-rebelote + contrat (chute<82) + capot 250."],
  ["J6 · Moteur de partie", "Boucle donne→donne jusqu'à la cible, IA légale, déterministe par seed."],
  ["J7 · Interface jouable", "CLI : partie auto-jouée, résumé lisible, option --verbose."],
  ["J8 · Tests", "30 tests node:test verts (cartes, deal, règles, scoring, enchère, moteur)."],
];
const beloteRoadmap = specToLayer({ slug: "belote-roadmap", name: "Belote — Roadmap visuelle",
  nodes: BELOTE_MS.map(([title, text], i) => ({ id: `j${i + 1}`, title, text })),
  edges: BELOTE_MS.slice(1).map((_, i) => ({ from: `j${i + 1}`, to: `j${i + 2}` })), cols: 4 });

// ---- 4 : Chess TCG 3D — Roadmap visuelle (7 jalons, source = bibliothèque) ----
const roadmap = JSON.parse(readFileSync("./library/roadmap-chess-tcg-3d.json", "utf8"));
const goal = JSON.parse(readFileSync("./library/goal-chess-tcg-3d.json", "utf8"));
const chessMs = roadmap.payload?.milestones || roadmap.milestones || [];
const chessNodes = chessMs.map((m) => {
  let text = m.description || "";
  if (m.goalRef && m.goalRef === goal.id) text += `\n\n🎯 Lié à l'objectif : ${goal.name}`;
  return { id: `jalon-${chessMs.indexOf(m) + 1}`, title: m.title, text };
});
const chessRoadmap = specToLayer({ slug: "chess-tcg-roadmap",
  name: "Chess TCG 3D — Roadmap visuelle (7 jalons)",
  nodes: chessNodes, edges: chessNodes.slice(1).map((_, i) => ({ from: `jalon-${i + 1}`, to: `jalon-${i + 2}` })), cols: 4 });

// ---- 5 : Belote (Qwen-Coder) — Production en direct (source = build-living-layer.mjs) ----
const qwenNodes = [
  { id: "input", type: "agent", x: 60, y: 220, width: 200, height: 120,
    data: { role: "Input initial", title: "Input initial", model: "-",
      text: "{\"task\":\"Produire une Belote fonctionnelle en JavaScript\"}",
      prompt: "{\"task\":\"Produire une Belote fonctionnelle en JavaScript\"}" } },
  { id: "phase0", type: "note", x: 320, y: 60, width: 220, height: 130,
    data: { title: "Phase 0 — audit", text: "Modèle confirmé : qwen/qwen2.5-coder-14b (id exact). Loop edges OK. LIMITE : aucun nœud n'exécute du JS → test = oracle/hors-bande." } },
  { id: "gen1", type: "agent", x: 320, y: 300, width: 240, height: 140,
    data: { role: "Générateur de code (qwen-coder) — PREUVE", title: "Générateur de code (qwen-coder) — PREUVE",
      model: "qwen/qwen2.5-coder-14b", temperature: 0.2,
      text: "Écris buildDeck() ESM (32 cartes belote). [RÉEL exécuté /api/execute live → code valide produit]",
      prompt: "Écris buildDeck() ESM (32 cartes belote). [RÉEL exécuté /api/execute live → code valide produit]" } },
  { id: "mem", type: "note", x: 620, y: 160, width: 220, height: 120,
    data: { title: "Mémoire accumulée", text: "Historique des tentatives injecté dans les prompts suivants (grandit à chaque itération)." } },
];
const qwenProduction = { id: layerId("qwen-production"),
  name: "Belote (Qwen-Coder) — Production en direct",
  nodes: qwenNodes, edges: [{ id: "e-in-gen", from: "input", to: "gen1" }],
  createdAt: nowISO, layerOwner: "claude", humanNote: "", roadmapMilestoneRef: null };

const layers = [chessRoadmap, beloteProcess, beloteArch, beloteRoadmap, qwenProduction];
writeFileSync("claude_layers_consolidated.json", JSON.stringify(layers, null, 2), "utf8");
console.log("CALQUES CLAUDE consolidés :", layers.length);
layers.forEach((l) => console.log(`  · ${l.name}  (owner=${l.layerOwner}, ${l.nodes.length} nœuds, ${l.edges.length} edges)`));
