// Valeurs de travail v0 — HumanGate 2026-07-19 (games/auto_battler/bibles/HUMANGATE_2026-07-19_VALUES_V0.md).
// PROVISOIRE : calibrable par Balance Bible dès les premières simulations (P7). Aucun claim de justesse.
// Non importé par engine-core (P11, content-agnostic) — réservé aux incréments Preparation/Combat futurs.

// Board geometry (ratifié, R11/RO-4)
export const BOARD_WIDTH = 8;
export const BOARD_HEIGHT = 8;
export const BOARD_ORIENTATION = "mirror"; // chaque Player occupe une moitié symétrique de la grille

// Economic parameters (R11, ratifié HumanGate 2026-07-19)
export const BENCH_CAPACITY = 9; // Banc — 9 places (TFT source, corrected from 8 in preparation.mjs:15)
export const SHOP_SIZE = 5; // Boutique — 5 emplacements (TFT source)
export const REROLL_COST = 2; // Rafraîchir coûte 2 or (TFT source, corrected from 1 in preparation.mjs:20)
export const INCOME_BASE = 3; // Revenu de base = min(3 + round_index, 10) — base seul (QE-4/QE-5)
export const TIMER_DURATION = 30; // Minuteur — 30 secondes (TFT source, R5/R11)

// Combat/Mana (unrelated to Preparation phase)
export const MANA_FALLOFF_AFTER_CAST = "zero"; // le Mana retombe entièrement à zéro après un Cast (QB-11)

export const TICK_LIMIT = 50; // v0 provisoire — calcul sourcé TFT (40s max / ~0.8s par Tick), cf. gate verbatim

// Economy fixtures EXTRACTED (not invented) from preparation/preparation.mjs, where they lived
// as inline literals before commande D. Same numbers, byte for byte — moved here so that a
// content set of 15 units does not require a 15-entry price table to be maintained by hand:
//   Buy cost  = rank (already documented in content/units.v0.mjs)
//   Sell credit = rank * SELL_STAR_MULTIPLIER[star - 1]
//     verified against the old table: unit_2 (rank 2) gave star1=2, star2=4, star3=12 = 2*[1,2,6]
export const SELL_STAR_MULTIPLIER = [1, 2, 6];
export const POOL_EXEMPLARS_PER_UNIT = 10; // fixture, was preparation.mjs:67 `initPool[id] = 10`

// Screen geometry (i2.5, s9-build) — presentation-only pixel constants for layout/layout.mjs
// and renderer/render_canvas.mjs. Explicitly called out as builder-added scope in
// blueprint.yaml ("géométrie de cellule pour layout/"). NOT a gameplay value: no Balance
// Bible source, no HumanGate ratification needed — arbitrary design choice, unlike the
// economic parameters above. Single site of declaration (R11 spirit), imported nowhere else.
export const CANVAS_SIZE_PX = 576;        // square canvas: 8x8 board + timer-ring frame
export const BOARD_MARGIN_PX = 40;        // inset between canvas edge (ring) and the grid
export const TIMER_RING_THICKNESS_PX = 8; // stroke width of the consuming chronometer border

// Combat playback (i2.5, s9-build commande D) — PRESENTATION ONLY, owned by the RENDERER (P2).
// Ratified verbatim, HUMANGATE_2026-07-19_VALUES_V0.md: "le temps réel par Tick est un choix
// RENDERER (P2), hors du moteur". These are therefore NOT gameplay values and need no Balance
// Bible source: no Event carries them, the engine never reads them, and changing them changes
// no simulation fact — only how long the log takes to play back on screen. app/ reads them to
// know when the playback is over and the next round may start; renderer/ reads them to place
// the animation inside a Tick.
export const TICK_DURATION_MS = 450;      // wall-clock length of ONE combat Tick on screen
export const COMBAT_RESULT_HOLD_MS = 2600; // how long the result stays readable before round N+1

// =============================================================================================
// E1/E2 — LIFE DU SEAT ET DÉGÂTS DE ROUND RESOLUTION (i2.5, s9-build commande E)
// v0 PROVISOIRE, propriété Balance Bible. SOURCE : Hearthstone Battlegrounds, transposition
// directe assumée — notre économie est déjà calquée sur la sienne (revenu 3 puis +1 par tour,
// plafonné à 10, cf. INCOME_BASE / computeIncome). Ratifié dans le dispatch s9-build commande E.
// Ces valeurs ne sont PAS inventées ici et ne sont pas non plus démontrées justes : elles sont
// SOURCÉES et provisoires, à recalibrer par la Balance Bible dès les premières simulations.
// =============================================================================================

// Life initiale d'un Seat. 02_CORE_RULES.md (table Paramètres) la donnait « TBD », propriétaire
// Core Rules, valeur à proposer par l'Economy Bible : 30, valeur HSBG (pas d'armure de héros —
// le concept n'existe pas ici, aucune valeur n'est donc ajoutée à 30).
export const LIFE_INITIAL = 30;

// Une Life ne descend jamais sous ce plancher : à ce plancher, le Seat est éliminé (INV-9).
export const LIFE_FLOOR = 0;

/**
 * E2 — Dégâts infligés à la Life du PERDANT après un Combat perdu.
 *
 *     dégâts = niveau du vainqueur + somme des RANGS de ses unités survivantes
 *
 * Transposition directe HSBG (« tavern tier du vainqueur + somme des tiers des serviteurs
 * survivants »). Chez nous le RANG d'une unité EST son coût d'achat (1..5, rank === Buy cost,
 * content/units.v0.mjs) et le niveau du joueur existe déjà — aucune notion nouvelle n'est créée.
 *
 * Propriétés voulues (et vérifiées par test, pas seulement écrites ici) :
 *   - perdre tôt coûte peu (niveau bas, peu d'unités survivantes) ;
 *   - perdre tard coûte cher (niveau haut, unités de rang élevé) ;
 *   - se faire balayer coûte STRICTEMENT plus que perdre de justesse (plus de survivants).
 *
 * SOURCE UNIQUE DE VÉRITÉ : cette fonction est appelée par round/round.mjs (qui l'APPLIQUE à
 * l'état) ET par renderer/viewmodel.mjs (qui la rejoue sur le seul Event Log — voir l'insuffisance
 * de payload signalée dans viewmodel.mjs). Changer la formule ici change les deux, par
 * construction : il n'y a pas de seconde copie.
 *
 * @param {number} winnerLevel - niveau du Seat vainqueur
 * @param {number[]} survivorRanks - rang de CHACUNE de ses unités encore vivantes
 * @returns {number} points de Life retirés au perdant (entier >= 0)
 */
export function computeLifeDamage(winnerLevel, survivorRanks) {
  const level = Number.isFinite(winnerLevel) ? Math.max(0, Math.floor(winnerLevel)) : 0;
  const ranks = Array.isArray(survivorRanks) ? survivorRanks : [];
  let sum = 0;
  for (const r of ranks) {
    if (Number.isFinite(r)) sum += Math.max(0, Math.floor(r));
  }
  return level + sum;
}

/**
 * L'adversaire fantôme (combat/ghost.mjs) n'est PAS un Seat : il n'a ni Life, ni Gold, ni Level.
 * La formule E2 a pourtant besoin du « niveau du vainqueur » quand c'est LUI qui gagne.
 * Choix v0 assumé : le fantôme est déjà construit comme un MIROIR du joueur (même nombre
 * d'unités, mêmes rangs, cases miroir, et depuis E3 mêmes Stars). Le miroir est simplement
 * étendu au niveau — le fantôme « joue au niveau du joueur ». Ce n'est pas un nombre inventé,
 * c'est la prolongation de la construction déjà ratifiée du fantôme provisoire.
 * TODO [FOG] — le vrai appariement (DP-3) donnera un adversaire qui a son PROPRE niveau ; cette
 * fonction disparaîtra avec le fantôme. Propriétaire : Decision Bible.
 * @param {number} playerLevel
 * @returns {number} le niveau que la Round Resolution attribue au fantôme
 */
export function ghostLevelFor(playerLevel) {
  return Number.isFinite(playerLevel) ? Math.max(0, Math.floor(playerLevel)) : 0;
}

// =============================================================================================
// E3 — MULTIPLICATEURS DE STAR (i2.5, s9-build commande E)
// v0 PROVISOIRE, propriété Balance Bible. SOURCE : Teamfight Tactics (vérifié par
// l'orchestrateur sur la source officielle), ratifié dans le dispatch s9-build commande E :
// par rapport au ★1, un ★2 a 150 % d'attaque et 180 % de vie, un ★3 225 % d'attaque et 324 %.
// Indexé par (star - 1). Avant E3, `star` était transporté jusqu'au snapshot de combat sans
// multiplier quoi que ce soit : fusionner trois corps en un seul AFFAIBLISSAIT le joueur.
// =============================================================================================
export const STAR_ATTACK_MULTIPLIER = [1, 1.5, 2.25];
export const STAR_HEALTH_MULTIPLIER = [1, 1.8, 3.24];

/** Arrondi commun aux deux échelles : les stats de combat sont des ENTIERS (04_COMBAT_BIBLE.md
 *  fixe leur forme ; un Health fractionnaire produirait des `target_health_after` illisibles
 *  dans le journal). Math.round, jamais floor — floor mangerait systématiquement du ★3. */
function scaleStat(base, table, star) {
  const s = Number.isInteger(star) && star >= 1 ? star : 1;
  const multiplier = table[s - 1];
  if (multiplier === undefined) return base; // Star hors table -> pas de bonus inventé
  return Math.round(base * multiplier);
}

/** @returns {number} Attack d'une unité de Star `star` dont l'Attack de base (★1) est `base`. */
export function starAttack(base, star) {
  return scaleStat(base, STAR_ATTACK_MULTIPLIER, star);
}

/** @returns {number} Health d'une unité de Star `star` dont la Health de base (★1) est `base`. */
export function starHealth(base, star) {
  return scaleStat(base, STAR_HEALTH_MULTIPLIER, star);
}

// =============================================================================================
// E4 — LE NIVEAU LIMITE LE NOMBRE D'UNITÉS POSÉES (i2.5, s9-build commande E)
// v0, SOURCE : Teamfight Tactics — « le nombre d'unités qu'un joueur peut avoir sur son plateau
// est égal à son niveau ». Avant E4, seule la demi-plateau (32 cases) contraignait : acheter
// était donc toujours strictement meilleur que monter de niveau. C'est ce paramètre qui crée le
// dilemme central du genre (renforcer maintenant vs aligner plus d'unités).
// =============================================================================================
export const BOARD_SLOTS_PER_LEVEL = 1; // 1 unité posée par point de niveau (TFT)

/**
 * @param {number} level - niveau du Seat (>= 1)
 * @returns {number} nombre MAXIMUM d'unités simultanément posées sur le plateau
 */
export function boardCapacityForLevel(level) {
  const l = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
  return l * BOARD_SLOTS_PER_LEVEL;
}

// =============================================================================================
// G1 — CONSTANTES DE RÈGLE DES MOTS-CLÉS (i2.5, s9-build commande G)
// v0, SOURCE : Hearthstone Battlegrounds, transposition directe assumée (le modèle de mots-clés
// déclenchés sur événement retenu par le dispatch, contre le modèle mana/sorts de TFT).
// Ce ne sont PAS des valeurs d'équilibrage par unité (celles-là vivent dans content/units.v0.mjs,
// propriété Balance Bible) : ce sont les deux nombres que la RÈGLE elle-même porte, et ils sont
// tous deux donnés par la source, pas inventés ici.
// =============================================================================================

// Furie des vents : l'unité attaque deux fois par cycle d'attaque au lieu d'une (HSBG, Windfury).
export const WINDFURY_ATTACKS_PER_CYCLE = 2;

// Renaissance : l'unité revient UNE seule fois, avec 1 point de vie (HSBG, Reborn).
export const REBORN_HEALTH = 1;

// Shop odds table (C2, s9-build playtest fix) — v0 PROVISOIRE, propriété Balance Bible.
// Integer weights per unit rank [rank1, rank2, rank3, rank4, rank5], indexed by player level
// (clamped to SHOP_ODDS_TABLE.length for levels beyond the table). Rank 0 weight means that
// rank NEVER appears at that level — verified by test (no rank-5 unit at level 1).
// SINGLE SOURCE OF TRUTH (ECO-2/INV-8): shop/shop.mjs reads this array directly for the draw;
// renderer/render_dom.mjs imports the SAME reference for display. Neither module copies it.
export const SHOP_ODDS_TABLE = [
  [100, 0, 0, 0, 0],    // level 1 — only rank 1 exists in the shop
  [75, 25, 0, 0, 0],    // level 2
  [55, 30, 15, 0, 0],   // level 3
  [40, 30, 20, 10, 0],  // level 4
  [25, 25, 25, 15, 10], // level 5 — first level where rank 5 can appear
  [15, 20, 25, 20, 20]  // level 6+ (clamp)
];

// =============================================================================================
// F1 — COÛT DE MONTÉE DE NIVEAU JUSQU'AU NIVEAU 10 (i2.5, s9-build commande F)
// v0 PROVISOIRE, propriété Balance Bible. Résout le TODO [FOG] laissé par commande E
// (preparation.mjs, "coût des paliers au-delà de 5 (et niveau MAXIMUM du Seat), aucune source").
//
// SOURCE : Teamfight Tactics, table XP officielle (wiki.leagueoflegends.com/en-us/TFT:Experience
// et tft-lab.com/en/handbook/xp, consultées 2026-07-20) — coût XP pour ATTEINDRE le niveau N :
// N=3:2, N=4:6, N=5:10, N=6:20, N=7:36, N=8:60, N=9:68, N=10:68. Dans TFT, 1 XP == 1 or (rachat
// "4 or pour 4 XP") : cette table EST donc une table de coût en or, pas seulement d'XP.
//
// TRANSPOSITION, pas copie littérale : les paliers 2..5 existaient déjà ici (ratifiés commande E,
// cost = niveau : 2, 3, 4, 5 or) et ne sont eux-mêmes PAS des nombres TFT littéraux — copier les
// nombres TFT bruts à partir du niveau 6 (20, 36, 60, 68 or) exploserait l'échelle face à un
// revenu plafonné à 10/tour (computeIncome, round/round.mjs) et romprait la continuité avec les
// paliers déjà ratifiés. Les niveaux 6..10 sont donc obtenus en appliquant les RATIOS réels de la
// table TFT (le facteur de croissance d'un palier au suivant) au dernier coût ratifié (niveau 5 =
// 5 or) — même méthode de transposition que STAR_ATTACK_MULTIPLIER/STAR_HEALTH_MULTIPLIER plus
// haut dans ce fichier (rapports préservés, pas les valeurs absolues), arrondie à l'entier :
//   niveau 6  = 5  * (20/10) = 5  * 2.000 = 10
//   niveau 7  = 10 * (36/20) = 10 * 1.800 = 18
//   niveau 8  = 18 * (60/36) = 18 * 1.667 = 30
//   niveau 9  = 30 * (68/60) = 30 * 1.133 = 34
//   niveau 10 = 34 * (68/68) = 34 * 1.000 = 34
// Le plateau 9->10 (34, 34) reproduit fidèlement le plateau réel de TFT (68, 68) : passé un
// certain point, TFT elle-même arrête de faire monter le coût — ce n'est pas un arrondi qui
// tombe juste par hasard, c'est la forme de la courbe source qui est préservée.
//
// SOURCE UNIQUE DE VÉRITÉ (ECO-2/INV-8, même motif que SHOP_ODDS_TABLE juste au-dessus) :
// preparation.mjs lit CE tableau pour DÉBITER l'or, renderer/render_dom.mjs lit la MÊME
// référence pour l'AFFICHER — aucun des deux ne recopie les nombres. Absence de clé (niveau 11
// et au-delà) => aucun coût déclaré => handleLevelUp REFUSE l'Input (R14) : jamais un repli à 0,
// jamais un niveau inventé au-delà de 10. Le niveau 10 est donc le PLAFOND de ce v0.
// =============================================================================================
export const LEVEL_UP_COSTS = Object.freeze({
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 10,
  7: 18,
  8: 30,
  9: 34,
  10: 34
});
