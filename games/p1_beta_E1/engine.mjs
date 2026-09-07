// engine.mjs — couche RÈGLES : état + transitions. Source de vérité unique.
//
// Zéro DOM, zéro chaîne d'interface, zéro littéral structurel : TOUTES les
// grandeurs viennent d'economy.mjs (blueprint `engine.dependances: [economy]`).
// Aucune dépendance vers render/input/main/objective/server/e2e/solvability/
// run-oracle (blueprint deps_interdites). Deltas STRICTS partout.

import {
  CORE_LIGHT_PER_STOKE,
  EMITTER_BASE_COST,
  EMITTER_COST_GROWTH,
  EMITTER_RATE,
  ASCENSION_BONUS_PER_GLOW,
  TERMINAL_THRESHOLD,
  MILESTONE_STEP,
} from './economy.mjs';

export class GameState {
  constructor(seed = 1) {
    this.seed = seed;
    this.reset();
  }

  // Réinitialisation COMPLÈTE (bouton #restart) : remet aussi le glow
  // d'ascension à zéro — partie neuve, pas une simple ascension.
  reset() {
    this.light = 0;
    this.emitterCount = 0;
    this.ascensionGlow = 0;
    this.questMilestonesReached = 0;
    this.terminal = false;
    this.frameCount = 0;

    // Signaux transitoires consommés par main.mjs (un tick, jamais rejoués
    // deux fois) — même patron que chain_probe_v1.lastActivation.
    this.pendingStokeFlash = false;
    this.pendingMilestoneFlash = false;
  }

  // Gain de lumiere par attisage, rehaussé durablement par le glow
  // d'ascension (economy: formula ascension_bonus).
  get lightPerStoke() {
    return CORE_LIGHT_PER_STOKE * (1 + ASCENSION_BONUS_PER_GLOW * this.ascensionGlow);
  }

  // Coût du (emitterCount+1)-ième émetteur (economy: formula emitter_cost).
  get emitterCost() {
    return Math.round(EMITTER_BASE_COST * Math.pow(EMITTER_COST_GROWTH, this.emitterCount));
  }

  // R2/R4 — entrée+récompense attisage : +lightPerStoke exactement, jamais
  // pendant l'état terminal (interaction neutralisée, R11).
  stoke() {
    if (this.terminal) return false;
    this.light += this.lightPerStoke;
    this.pendingStokeFlash = true;
    this._checkMilestones();
    this._checkTerminal();
    return true;
  }

  // R6 — achat d'un émetteur : décrémente light du coût EXACT, incrémente
  // emitterCount de 1 exactement. Neutralisé en état terminal (R11).
  buyEmitter() {
    if (this.terminal) return false;
    const cost = this.emitterCost;
    if (this.light < cost) return false;
    this.light -= cost;
    this.emitterCount += 1;
    return true;
  }

  // R8 — production passive : incrémente light de emitterCount*EMITTER_RATE
  // exactement, à chaque tick, tant que l'état n'est pas terminal.
  applyEmitters() {
    if (this.terminal) return false;
    if (this.emitterCount <= 0) return false;
    this.light += this.emitterCount * EMITTER_RATE;
    this._checkMilestones();
    this._checkTerminal();
    return true;
  }

  // Franchissement de seuils intermédiaires (gb_quest_milestone) — boucle
  // (pas un simple if) pour rester correct même si un gros incrément saute
  // plusieurs paliers d'un coup (ex. debug hook grantLight).
  _checkMilestones() {
    while (this.light >= (this.questMilestonesReached + 1) * MILESTONE_STEP) {
      this.questMilestonesReached += 1;
      this.pendingMilestoneFlash = true;
    }
  }

  // R11 — règle terminale déterministe : light >= threshold => terminal.
  // Jamais réévalué à la baisse (once terminal, stays terminal — ascend()
  // est la SEULE sortie explicite).
  _checkTerminal() {
    if (!this.terminal && this.light >= TERMINAL_THRESHOLD) {
      this.terminal = true;
    }
  }

  isTerminal() {
    return this.terminal;
  }

  // R9/R10 — ascension : SEULE action valide en état terminal. Convertit la
  // progression en +1 glow d'ascension permanent (rehausse lightPerStoke,
  // R10), remet light/emitterCount à zéro (nouvelle boucle), quitte l'état
  // terminal. Neutralisée hors état terminal (autel non encore disponible).
  ascend() {
    if (!this.terminal) return false;
    this.ascensionGlow += 1;
    this.light = 0;
    this.emitterCount = 0;
    this.questMilestonesReached = 0;
    this.terminal = false;
    return true;
  }

  // R5 — divergence de décision : policyParam=0 => jamais de clic (politique
  // idle, cf. loop.json). policyParam>0 => clique tous les N=policyParam
  // frames (politique actif, cf. loop.json every_frames:3), avec achat
  // automatique d'émetteur dès que possible (comportement passif du genre,
  // pas une variable de politique). Utilisée par properties.test.mjs (horizon
  // fixe) ET par solvability.mjs (bot qui doit GAGNER).
  step(policyParam = 0) {
    this.frameCount += 1;
    if (this.terminal) return;

    if (policyParam > 0 && this.frameCount % policyParam === 0) {
      this.stoke();
    }
    this.applyEmitters();
    if (!this.terminal && this.light >= this.emitterCost) {
      this.buyEmitter();
    }
  }
}
