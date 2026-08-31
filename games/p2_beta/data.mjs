// data — contenu et configuration statiques. FEUILLE du graphe de modules :
// n'importe RIEN (blueprint.deps_interdites interdit data->logic/render/input/main).
// Tue les nombres magiques et empêche la logique de fuir dans la donnée : ce fichier
// ne contient aucune décision, seulement des valeurs et des DESCRIPTEURS de condition
// que `logic` interprète (doctrine ratifiée : « aucune décision dans un commentaire —
// toute donnée qui influence un comportement est un champ structuré »).

// --- économie de base ------------------------------------------------------------
export const ECONOMY = {
  valueClick: 1, // unités gagnées par clic, avant multiplicateur de prestige
  costMultiplier: 1.15, // renchérissement de chaque exemplaire supplémentaire
};

// --- générateurs (revenu passif) --------------------------------------------------
// `yield` est un débit PAR TICK. Le tick de simulation vaut 16 ms côté main.mjs.
export const GENERATORS = [
  { id: 'g1', name: 'Collecteur', baseCost: 15, yield: 0.1 },
  { id: 'g2', name: 'Atelier', baseCost: 100, yield: 1.0 },
  { id: 'g3', name: 'Fonderie', baseCost: 1100, yield: 8.0 },
  { id: 'g4', name: 'Raffinerie', baseCost: 12000, yield: 47.0 },
  { id: 'g5', name: 'Grand Foyer', baseCost: 130000, yield: 260.0 },
];

// --- fin bornée -------------------------------------------------------------------
// Contrainte de charter : fin OBSERVABLE et BORNÉE (<= 72000 ticks). La jauge de fin
// ne mesure PAS le temps écoulé — un compteur de temps se remplirait tout seul, sans
// jouer, ce qui viderait de sens la décision d'allocation (R5) et la répétition de
// boucle (R12). Elle mesure le TOTAL RÉCOLTÉ SUR LA VIE (`lifetimeEarned`), grandeur
// que seules les actions du joueur (clics, générateurs achetés) font croître.
export const META = {
  tickBudget: 72000, // borne dure de la fin observable, en ticks
  numStages: 5,
  // Total récolté cumulé qui vaut 100 % de jauge. Calibré (voir logic.endGauge et
  // solvability.mjs) pour qu'un bot qui JOUE l'atteigne dans le budget de ticks,
  // et qu'un joueur inactif ne l'atteigne JAMAIS (inactif => récolte 0).
  victoryTarget: 5.0e6,
};

// Crans de stage, exprimés en FRACTION DE JAUGE (donc monotones comme elle).
export const STAGE_GATES = [0.2, 0.4, 0.6, 0.8];

// --- objectifs successifs ---------------------------------------------------------
// `condition` est un descripteur structuré évalué par `logic.objectiveSatisfied` —
// jamais une correspondance de sous-chaîne sur le TEXTE affiché (le texte est de la
// présentation ; le faire porter une règle est un couplage silencieux).
export const GOALS = [
  {
    id: 'goal_first_generator',
    text: 'Récolte de quoi acheter ton premier générateur',
    condition: { kind: 'generators_owned', value: 1 },
  },
  {
    id: 'goal_second_generator',
    text: 'Améliore ta production : un deuxième générateur',
    condition: { kind: 'generators_owned', value: 2 },
  },
  {
    id: 'goal_thousand',
    text: 'Récolte 1 000 unités au total',
    condition: { kind: 'lifetime', value: 1000 },
  },
  {
    id: 'goal_all_types',
    text: 'Débloque les 5 familles de générateurs',
    condition: { kind: 'generator_types', value: 5 },
  },
  {
    id: 'goal_three_quarters',
    text: 'Fais monter la jauge de fin à 75 %',
    condition: { kind: 'gauge', value: 0.75 },
  },
  {
    id: 'goal_victory',
    text: 'Atteins 100 % de la jauge de fin pour clore le cycle',
    condition: { kind: 'terminal' },
  },
];

// --- méta-boucle (prestige) -------------------------------------------------------
// Requalification assumée du prestige « sans fin » du genre en CONVERSION-VERS-LA-FIN :
// relancer échange l'économie courante (ressources + générateurs) contre un
// multiplicateur de clic permanent. La marche vers la fin (`lifetimeEarned`), elle,
// n'est jamais reprise — sinon la jauge de fin ne serait pas monotone.
export const PRESTIGE = {
  costThreshold: 1000, // ressources en main requises pour relancer
  resetMultiplier: 2.0, // multiplicateur de clic gagné par relance
  maxPrestigeCount: 3, // bornage de la méta-boucle (fin observable)
};

// --- identité visuelle ------------------------------------------------------------
// Palette FERME de l'Art Bible (lab/forge_runs/p2_beta/art_bible.md § palette).
export const PALETTE = {
  fieldDeep: '#1E1B18',
  panel: '#2A2622',
  separator: '#3A342E',
  value: '#F5A623', // ambre — production / valeur
  currency: '#FFCE54', // miel — monnaie
  clickable: '#3BB6A6', // sarcelle — affordance
  milestone: '#8E6FE0', // violet — jalon / palier / méta
  alert: '#E8604C', // corail — coût non payable / reset
  text: '#F3ECE2',
  textMuted: '#A79E92',
};

// Fichiers d'assets réellement livrés dans le jeu, adressés par `render`.
// Chemins RELATIFS au dossier du jeu (games/p2_beta) — jamais absolus.
export const ASSETS = {
  clickTarget: 'assets/click_target.svg',
  resourceCounterFrame: 'assets/resource_counter_frame.svg',
  generatorIcon: 'assets/generator_icon.svg',
  buyButton: 'assets/buy_button.svg',
  currencySymbol: 'assets/currency_symbol.svg',
  clickFeedbackVfx: 'assets/click_feedback_vfx.svg',
  progressEndIndicator: 'assets/progress_end_indicator.svg',
  victoryScreen: 'assets/victory_screen.svg',
  questTracker: 'assets/quest_tracker.svg',
  background: 'assets/background.svg',
  // Famille de 5 scènes : une par stage. Le franchissement d'un cran REMPLACE le
  // décor (Art Bible : « le joueur voit un NOUVEAU LIEU, pas un pourcentage »).
  stageScenes: [
    'assets/stage_scene_1.svg',
    'assets/stage_scene_2.svg',
    'assets/stage_scene_3.svg',
    'assets/stage_scene_4.svg',
    'assets/stage_scene_5.svg',
  ],
};

// Teinte dominante par stage (rotation chaude de l'Art Bible : ambre -> sarcelle-lean
// -> miel -> violet-lean -> clôture). Le chrome UI, lui, reste neutre et stable.
export const STAGE_TINTS = ['#F5A623', '#3BB6A6', '#FFCE54', '#8E6FE0', '#E8604C'];

export const STAGE_NAMES = [
  'Première braise',
  'Atelier ouvert',
  'Fonte continue',
  'Grand œuvre',
  'Clôture du cycle',
];
