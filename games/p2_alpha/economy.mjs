export const STRUCTURE = {
  tick_ms: 100,
  budget_ticks_mesure: 72000,
  gain_clic_initial: 1000, // mR (1 R = 1000 mR)
  cost_base: [15000, 100000, 1100000, 12000000], // mR for G1..G4
  prod_per_sec: [100, 1000, 8000, 47000], // mR/s = [0.1, 1, 8, 47] R/s
  prod_per_tick: [10, 100, 800, 4700], // mR per 100ms tick
  growth: 1.12,
  thresholds: [100000, 1000000, 12000000, 150000000, 1000000000], // mR: S1..S5
  upgrades: {
    clic_x2: { cost: 100000, effect: 'clic_multiply_2', dispo: 'start' },
    clic_x4: { cost: 5000000, effect: 'clic_multiply_2', dispo: 'start', requires: 'clic_x2' },
    prod_g1_x2: { cost: 500000, effect: 'prod_multiply_2', tier: 0, dispo: 'S4' },
    prod_g2_x2: { cost: 1000000, effect: 'prod_multiply_2', tier: 1, dispo: 'S4' },
    prod_g3_x2: { cost: 30000000, effect: 'prod_multiply_2', tier: 2, dispo: 'S4' },
    prod_g4_x2: { cost: 200000000, effect: 'prod_multiply_2', tier: 3, dispo: 'S4' },
  }
};

export function createState() {
  return {
    solde_mR: 0, // milli-R integer
    cumul_mR: 0, // cumulative R produced
    generators: [
      { count: 0, prodMultiplier: 1 }, // G1
      { count: 0, prodMultiplier: 1 }, // G2
      { count: 0, prodMultiplier: 1 }, // G3
      { count: 0, prodMultiplier: 1 }, // G4
    ],
    gain_clic_mR: STRUCTURE.gain_clic_initial,
    upgrades_owned: new Set(),
    tick: 0,
  };
}

export function click(state) {
  if (!Number.isInteger(state.solde_mR)) throw new Error('solde_mR must be integer');
  state.solde_mR += state.gain_clic_mR;
  state.cumul_mR += state.gain_clic_mR;
  if (!Number.isInteger(state.solde_mR)) throw new Error('solde_mR is not integer after click');
}

export function applyProduction(state) {
  let prod = 0;
  for (let i = 0; i < 4; i++) {
    const tierProd = Math.floor(STRUCTURE.prod_per_tick[i] * state.generators[i].prodMultiplier);
    prod += state.generators[i].count * tierProd;
  }
  state.solde_mR += prod;
  state.cumul_mR += prod;
  if (!Number.isInteger(state.solde_mR)) throw new Error('solde_mR not integer after applyProduction');
}

export function getCost(generatorIndex, owned) {
  const base = STRUCTURE.cost_base[generatorIndex];
  const cost = Math.floor(base * Math.pow(STRUCTURE.growth, owned));
  if (!Number.isInteger(cost)) throw new Error('cost calculation error: not integer');
  return cost;
}

export function canAfford(state, generatorIndex) {
  const owned = state.generators[generatorIndex].count;
  const cost = getCost(generatorIndex, owned);
  return state.solde_mR >= cost;
}

export function buyGenerator(state, generatorIndex) {
  if (!canAfford(state, generatorIndex)) return false;
  const owned = state.generators[generatorIndex].count;
  const cost = getCost(generatorIndex, owned);
  state.solde_mR -= cost;
  state.generators[generatorIndex].count++;
  if (!Number.isInteger(state.solde_mR)) throw new Error('solde_mR not integer after buyGenerator');
  return true;
}

export function canBuyUpgrade(state, upgradeId) {
  if (state.upgrades_owned.has(upgradeId)) return false;
  const upgrade = STRUCTURE.upgrades[upgradeId];
  if (upgrade.requires && !state.upgrades_owned.has(upgrade.requires)) return false;

  // Un seul point de sortie par condition REELLE : pas de `return false` terminal
  // inatteignable (toute amelioration porte dispo 'start' ou 'S4'). Une branche
  // morte est un mutant intuable — donc une case de la table de decision que
  // AUCUN test ne peut prouver.
  const affordable = state.solde_mR >= upgrade.cost;
  if (upgrade.dispo === 'S4') return affordable && state.cumul_mR >= STRUCTURE.thresholds[3];
  return affordable;
}

export function buyUpgrade(state, upgradeId) {
  if (!canBuyUpgrade(state, upgradeId)) return false;
  const upgrade = STRUCTURE.upgrades[upgradeId];
  state.solde_mR -= upgrade.cost;
  state.upgrades_owned.add(upgradeId);

  if (upgrade.effect === 'clic_multiply_2') {
    state.gain_clic_mR *= 2;
  } else if (upgrade.effect === 'prod_multiply_2') {
    state.generators[upgrade.tier].prodMultiplier *= 2;
  }
  if (!Number.isInteger(state.solde_mR)) throw new Error('solde_mR not integer after buyUpgrade');
  return true;
}

export function unlockedGenerators(state) {
  const unlocked = [0]; // G1 always available
  if (state.cumul_mR >= STRUCTURE.thresholds[0]) unlocked.push(1); // G2 at S1
  if (state.cumul_mR >= STRUCTURE.thresholds[1]) unlocked.push(2); // G3 at S2
  if (state.cumul_mR >= STRUCTURE.thresholds[2]) unlocked.push(3); // G4 at S3
  return unlocked;
}

export function unlockedUpgrades(state) {
  const unlocked = [];
  for (const [id, upgrade] of Object.entries(STRUCTURE.upgrades)) {
    if (state.upgrades_owned.has(id)) continue;

    if (upgrade.dispo === 'start') {
      if (!upgrade.requires || state.upgrades_owned.has(upgrade.requires)) {
        unlocked.push(id);
      }
    } else if (upgrade.dispo === 'S4') {
      if (state.cumul_mR >= STRUCTURE.thresholds[3]) {
        unlocked.push(id);
      }
    }
  }
  return unlocked;
}

// Nombre de seuils DEJA franchis == index du PROCHAIN seuil a atteindre (0..5).
// L'ancienne version rendait 4 dans DEUX situations distinctes (« S4 franchi,
// S5 en cours » et « tout franchi ») : l'objectif annoncait donc la victoire des
// S4, et le franchissement de S5 n'etait detectable par personne. Une valeur qui
// confond deux etats du monde ne peut fonder aucune decision.
export function getThresholdIndex(cumul_mR) {
  let crossed = 0;
  for (let i = 0; i < STRUCTURE.thresholds.length; i++) {
    if (cumul_mR >= STRUCTURE.thresholds[i]) crossed++;
  }
  return crossed;
}

export function isVictory(state) {
  return state.cumul_mR >= STRUCTURE.thresholds[4]; // S5 = 1 000 000 R
}

// Ce que chaque seuil S1..S5 débloque réellement (index = seuil franchi).
// S5 ne débloque rien : c'est l'objectif terminal lui-même.
const RECOMPENSE_PAR_SEUIL = ['G2', 'G3', 'G4', 'les améliorations', null];

// Affichage en R (l'état est en milli-R : 1 R == 1000 mR). L'ancienne version
// divisait par 1000 PUIS suffixait « k » — elle annonçait donc « 100k R » pour un
// seuil de 100 R, et « 1000.0M R » pour l'objectif terminal de 1 000 000 R : un
// facteur 1000 sur CHAQUE objectif montré au joueur.
export function currentObjective(state) {
  const terminalR = STRUCTURE.thresholds[STRUCTURE.thresholds.length - 1] / 1000;
  if (isVictory(state)) return `Victoire ! Objectif terminal ${terminalR} R atteint`;

  const idx = getThresholdIndex(state.cumul_mR);
  const prochainR = STRUCTURE.thresholds[idx] / 1000;
  const recompense = RECOMPENSE_PAR_SEUIL[idx];
  if (recompense === null) return `Atteindre ${prochainR} R : objectif final`;
  return `Atteindre ${prochainR} R pour débloquer ${recompense} — objectif final ${terminalR} R`;
}

export function reset(state) {
  state.solde_mR = 0;
  state.cumul_mR = 0;
  state.generators = [
    { count: 0, prodMultiplier: 1 },
    { count: 0, prodMultiplier: 1 },
    { count: 0, prodMultiplier: 1 },
    { count: 0, prodMultiplier: 1 },
  ];
  state.gain_clic_mR = STRUCTURE.gain_clic_initial;
  state.upgrades_owned = new Set();
  state.tick = 0;
}

export function step(state) {
  applyProduction(state);
  state.tick++;
}
