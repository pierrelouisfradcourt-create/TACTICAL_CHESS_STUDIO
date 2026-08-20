// hygiene-board.mjs — vue LECTURE SEULE du capteur d'hygiène (endpoint /api/hygiene).
// Ne scanne rien : lit le rapport produit par hygiene-scan.mjs (llm-lego/hygiene_report.json).
// AUCUN LLM, AUCUNE écriture. Défauts sûrs si le rapport est absent (jamais de panneau qui ment :
// available=false + raison explicite). Expose `integrity` (Σ byCode == total) pour l'anti-mensonge.
import { readFileSync, existsSync } from "node:fs";

// Somme des compteurs par code — sert à prouver que le total affiché == somme des catégories.
function sumValues(obj) {
  return Object.values(obj || {}).reduce((a, n) => a + (Number(n) || 0), 0);
}

export function buildHygieneBoard({ reportPath }) {
  if (!reportPath || !existsSync(reportPath)) {
    return { available: false, reason: "aucun rapport — lance `node hygiene-scan.mjs`", writesLedger: false };
  }
  let rep;
  try { rep = JSON.parse(readFileSync(reportPath, "utf-8")); }
  catch (e) { return { available: false, reason: `rapport illisible : ${String((e && e.message) || e)}`, writesLedger: false }; }

  const rust = rep.rust || {};
  const todo = rep.todo || {};
  const rustByCodeSum = sumValues(rust.byCode);
  const todoTopSum = (todo.topFiles || []).reduce((a, f) => a + (Number(f.n) || 0), 0);

  return {
    available: true,
    generated: rep.generated || null,
    trigger: rep.trigger || "manual",
    writesLedger: false, // invariant : ce capteur ne crée jamais d'IMP (affichage seul, geste explicite = kaizen_loop)
    sources: rep.sources || {},
    rust: {
      available: rust.available === true,
      reason: rust.reason || null,
      total: rust.available === true ? (rust.total || 0) : null,
      byCode: rust.byCode || {},
      topFiles: rust.topFiles || [],
      samples: rust.samples || [],
    },
    todo: {
      gitOk: todo.gitOk !== false,
      orphans: todo.orphans || 0,
      filesScanned: todo.filesScanned || 0,
      topFiles: todo.topFiles || [],
      samples: todo.samples || [],
    },
    // Anti-mensonge : le total Rust affiché DOIT égaler la somme des catégories ; idem topFiles ≤ orphans.
    integrity: {
      rustTotalMatchesByCode: rust.available !== true || (rust.total || 0) === rustByCodeSum,
      rustByCodeSum,
      todoTopWithinOrphans: todoTopSum <= (todo.orphans || 0),
    },
  };
}
