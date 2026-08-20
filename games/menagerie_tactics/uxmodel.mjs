// uxmodel.mjs — modèle de PRÉSENTATION pur (aucun DOM). Lit une instance MenagerieBattle
// en LECTURE SEULE et en dérive : cases classées (move/attack/threat disjointes), aperçu
// d'attaque enrichi (DÉLÈGUE la maths à battle.previewAttack — pas de duplication),
// éligibilité de capture, description d'objectif. La maths de règle reste dans game.mjs.
export const MIN_ENCIRCLERS = 2; // miroir du moteur ; le drift est capté par le test de consistance
const MULT = { strong: 1.5, weak: 0.5, neutral: 1 };

export function reachableCells(battle, sel) {
  const set = new Set();
  for (let y = 0; y < battle.height; y++) {
    for (let x = 0; x < battle.width; x++) {
      const d = Math.abs(sel.x - x) + Math.abs(sel.y - y);
      if (d >= 1 && d <= sel.move && !battle.cellOccupied(x, y) && battle.terrainAt(x, y) !== "wall") {
        set.add(x + "," + y);
      }
    }
  }
  return set;
}

export function attackableCells(battle, sel) {
  const set = new Set();
  for (const b of battle.beasts) {
    if (b.active && battle.canAttack(sel, b)) {
      set.add(b.x + "," + b.y);
    }
  }
  return set;
}

// Buckets DISJOINTS avec précédence attack > threat > move.
export function classifyCells(battle, sel) {
  const threat = battle.threatenedCells("enemy");
  if (!sel) {
    return { move: new Set(), attack: new Set(), threat };
  }
  const move = reachableCells(battle, sel);
  const attack = attackableCells(battle, sel);
  const threatOut = new Set();
  for (const c of threat) {
    if (!attack.has(c)) {
      threatOut.add(c);
    }
  }
  const moveOut = new Set();
  for (const c of move) {
    if (!attack.has(c) && !threatOut.has(c)) {
      moveOut.add(c);
    }
  }
  return { move: moveOut, attack, threat: threatOut };
}

export function captureEligible(battle, beast) {
  return beast.side === "enemy" && beast.active
    && beast.hp < battle.captureThreshold
    && battle.encirclingAllies(beast) >= MIN_ENCIRCLERS;
}

// Aperçu enrichi. Délègue dmg/riposte/relation à battle.previewAttack (source unique de
// la maths) ; ajoute les champs de présentation. hpAfter/weakAfter dérivés localement.
export function previewAttack(battle, attacker, target) {
  const p = battle.previewAttack(attacker, target);
  const damage = p.dmg;
  const maitrisee = battle.isSubdued(target);
  // hpAfter respecte le plancher anti-KO d'une cible maîtrisée (1), comme resolveCombat.
  const hpAfter = Math.max(maitrisee ? 1 : 0, target.hp - damage);
  const lethal = !p.targetSurvives; // source unique : cohérent avec le moteur
  const weakAfter = hpAfter < battle.captureThreshold;
  const encircled = battle.encirclingAllies(target);
  const capturable = !lethal && weakAfter && encircled >= MIN_ENCIRCLERS;
  return {
    relation: p.relation,
    mult: MULT[p.relation],
    damage,
    hpAfter,
    lethal,
    weakAfter,
    encircled,
    capturable,
    maitrisee,
    canRetaliate: p.riposteDmg > 0,
    riposteDmg: p.riposteDmg,
  };
}

// Décrit l'objectif courant pour la bannière (label lisible + accompli ?).
export function describeObjective(view, objective) {
  if (objective.kind === "rout") {
    return { label: `Mettre en déroute — ennemis restants : ${view.enemyActive}`, done: view.enemyActive === 0 };
  }
  if (objective.kind === "capture") {
    const t = view.beasts.find((b) => b.id === objective.targetId);
    return { label: "Capturer la cible (affaiblir + encercler à ≥2)", done: Boolean(t && t.captured === true) };
  }
  if (objective.kind === "survive") {
    return { label: `Survivre ${view.turn - 1}/${objective.turns} tours`, done: view.turn > objective.turns };
  }
  return { label: objective.kind, done: false };
}
