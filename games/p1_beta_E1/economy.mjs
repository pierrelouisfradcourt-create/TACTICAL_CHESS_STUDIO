// economy.mjs — couche DONNÉES : SOURCE UNIQUE des grandeurs structurelles.
//
// Module feuille : n'importe RIEN, ne décide rien, ne rend rien (blueprint
// `economy.dependances: []`). Toutes les autres couches (engine, objective,
// render, input, main, e2e, solvability, tests) LISENT ces constantes ; aucune
// ne re-déclare la valeur. C'est ce qui ferme la duplication mesurée entre
// engine.mjs et render.mjs (le seuil terminal y vivait DEUX fois, chacun
// pouvant dériver sans que rien ne le détecte) — et sa réapparition est
// désormais détectable mécaniquement : properties.test.mjs extrait les valeurs
// déclarées ici et vérifie qu'aucun autre .mjs du jeu ne les ré-écrit en dur.
//
// PROVENANCE — chaque grandeur cite l'artefact amont N2 du run qui la fixe
// (lab/forge_runs/p1_beta_E1/economy.json). Le charter EXIGE la provenance
// N2 ; il ne fixe pas les valeurs. Une grandeur sans source amont est déclarée
// telle quelle dans PROVENANCE_GAPS ci-dessous — jamais blanchie en silence.

/** Rendement de l'action-cœur : lumiere créditée par attisage, hors bonus. */
export const CORE_LIGHT_PER_STOKE = 1;

/** Coût du PREMIER émetteur (porte d'achat initiale). */
export const EMITTER_BASE_COST = 15;

/** Croissance géométrique du coût : cost(n) = base * growth^n. */
export const EMITTER_COST_GROWTH = 1.18;

/** Production passive d'UN émetteur, par tick. */
export const EMITTER_RATE = 0.5;

/** Bonus permanent de lumiere/attisage par glow d'ascension (fraction). */
export const ASCENSION_BONUS_PER_GLOW = 0.05;

/** Seuil terminal : light >= seuil => Embrasement (fin observable). */
export const TERMINAL_THRESHOLD = 5000;

/** Nombre de jalons intermédiaires sur la course vers le seuil terminal. */
export const MILESTONE_COUNT = 5;

/** Pas de jalon — DÉRIVÉ du seuil terminal, jamais écrit en dur : un seuil
 *  intermédiaire ne peut pas dériver indépendamment de la fin qu'il jalonne. */
export const MILESTONE_STEP = TERMINAL_THRESHOLD / MILESTONE_COUNT;

/**
 * Provenance N2 par constante — lue par les tests, pas par le jeu.
 * Clé = nom de la constante ; valeur = l'ancre amont exacte qui la fixe.
 */
export const PROVENANCE = {
  CORE_LIGHT_PER_STOKE:
    'economy.json invariants[id=core_light_per_stoke].value — rendement de base de '
    + "l'action-cœur, fixé pour que l'incrément du compteur soit lisible et le rejeu "
    + 'seedé comparable ; forme héritée de la grammaire de genre worldscan:games[0].loops.minute_1',
  EMITTER_BASE_COST:
    'economy.json invariants[id=economy_first_emitter_cost].value ET '
    + 'formulas[id=emitter_cost].params.base — porte d\'achat initiale',
  EMITTER_COST_GROWTH:
    'economy.json formulas[id=emitter_cost].params.growth — cost(n) = base * growth^n',
  EMITTER_RATE:
    'economy.json formulas[id=emitter_output].params.base_rate — output_passif = somme des taux',
  ASCENSION_BONUS_PER_GLOW:
    'economy.json invariants[id=meta_ascension_bonus].value (5 % exprimé en fraction) ET '
    + 'formulas[id=ascension_bonus].params.per_glow',
  TERMINAL_THRESHOLD:
    'economy.json invariants[id=progression_threshold_light].value ET '
    + 'formulas[id=terminal_condition].params.threshold — seuil terminal choisi ATTEIGNABLE '
    + 'par une sonde déterministe dans un budget de ticks fixe (charter:condition_de_victoire)',
  MILESTONE_COUNT:
    'AUCUNE SOURCE N2 — featuremap.json gb_quest_milestone exige « un seuil intermédiaire '
    + 'de lumiere » sans en fixer la valeur, et economy.json ne porte aucun invariant de jalon. '
    + 'Grandeur décidée ICI, en aval. Voir PROVENANCE_GAPS.',
  MILESTONE_STEP:
    'DÉRIVÉE — TERMINAL_THRESHOLD / MILESTONE_COUNT. Aucune valeur propre : elle hérite de la '
    + 'provenance du seuil terminal et du gap de MILESTONE_COUNT.',
};

/**
 * Grandeurs structurelles SANS source amont N2 — inventées en aval de la chaîne.
 * Le charter l'interdit (« NE JAMAIS inventer une grandeur structurelle en aval
 * sans source tracée au charter (N2 / M2) »). On ne peut pas rendre une source
 * qui n'existe pas ; on la DÉCLARE, pour que la mesure M2 constate le manque au
 * lieu de le rater. Point de jugement HumanGate, pas un verdict logiciel.
 */
export const PROVENANCE_GAPS = ['MILESTONE_COUNT'];
