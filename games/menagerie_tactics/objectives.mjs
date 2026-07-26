// objectives.mjs — évaluation PURE des objectifs de bataille (aucune dépendance,
// aucun état). Lit un view() (clone, jamais muté). Slice = 3 objectifs.
export const OBJECTIVE_KINDS = ["rout", "capture", "survive"];

function findBeast(view, id) {
  for (const b of view.beasts) {
    if (b.id === id) {
      return b;
    }
  }
  return null;
}

// spec.rout    = { kind:'rout' }
// spec.capture = { kind:'capture', targetId }
// spec.survive = { kind:'survive', turns }
// status ∈ 'active' | 'won' | 'lost'
export function evaluateObjective(spec, view) {
  if (spec.kind === "rout") {
    if (view.playerActive === 0) {
      return { kind: "rout", status: "lost" };
    }
    if (view.enemyActive === 0) {
      return { kind: "rout", status: "won" };
    }
    return { kind: "rout", status: "active" };
  }

  if (spec.kind === "capture") {
    const t = findBeast(view, spec.targetId);
    if (t && t.captured === true) {
      return { kind: "capture", status: "won" };
    }
    const targetLost = t && t.active === false && t.captured !== true;
    if (targetLost || view.playerActive === 0) {
      return { kind: "capture", status: "lost" };
    }
    return { kind: "capture", status: "active" };
  }

  if (spec.kind === "survive") {
    const progress = { current: view.turn, needed: spec.turns };
    if (view.playerActive === 0) {
      return { kind: "survive", status: "lost", progress };
    }
    return { kind: "survive", status: view.turn > spec.turns ? "won" : "active", progress };
  }

  return { kind: spec.kind, status: "active" };
}
