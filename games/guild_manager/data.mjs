// guild_manager — DONNÉES DE JEU (classes, thèmes, ennemis, équipement,
// missions, constantes). Aucune logique ici : tables consultées par les règles.

export const CONSTANTS = Object.freeze({
  START_GOLD: 300,
  RECRUIT_BASE_COST: 50,
  RECRUIT_COST_PER_LEVEL: 12,
  WAGE_BASE: 3,              // salaire = WAGE_BASE + floor(niveau total / 2)
  UNPAID_DAYS_BEFORE_LEAVE: 3,
  XP_PER_LEVEL: 24,          // xp pour passer du niveau L à L+1 dans une classe = XP_PER_LEVEL × L
  MAX_CLASS_LEVEL: 20,
  MASTERY_LEVEL: 6,          // niveau de classe à partir duquel elle compte comme maîtrisée
  MAX_LEARNED_SKILLS: 5,     // compétences portées en combat (choisies par le joueur)
  SECONDARY_GROWTH: 0.5,     // une classe non active ne rend que la moitié de sa croissance
  DISPERSION_PER_CLASS: 0.12, // xp perdue par classe pratiquée au-delà de la 2e
  DISPERSION_FLOOR: 0.5,     // plancher du malus de dispersion
  AFFINITY_BONUS: 0.25,      // bonus des statistiques d'un objet au rôle de son porteur
  SQUAD_SIZE: 8,             // effectif maximum d'une escouade
  // Les trois escouades ne jouent pas le même rôle : la principale porte le
  // renom de la guilde, les secondes forment la relève.
  SQUAD_RANKS: [
    { name: 'Escouade principale', short: 'Principale', gold: 1.20, rep: 1.20, xp: 1.00,
      text: 'Porte le renom de la guilde : +20 % d’or et de réputation.' },
    { name: 'Seconde escouade',    short: 'Seconde',    gold: 1.00, rep: 1.00, xp: 1.25,
      text: 'Escouade de formation : +25 % d’expérience.' },
    { name: 'Troisième escouade',  short: 'Troisième',  gold: 1.00, rep: 1.00, xp: 1.25,
      text: 'Escouade de formation : +25 % d’expérience.' },
  ],
  // File d'entraînement : les aventuriers sans escouade partent en quête solo.
  TRAINING_XP: 22,           // expérience gagnée par jour de quête solo
  TRAINING_GOLD: 3,          // or rapporté par jour de quête solo
  TRAINING_INJURY: 0.08,     // risque quotidien de revenir blessé
  TRAINING_READY_LEVEL: 6,   // niveau total à partir duquel il est prêt pour une escouade
  UNLOCK_COST: { 2: 300, 3: 1000 }, // coût d'ouverture d'une classe avancée / légendaire
  MASTERY_BONUS: { hp: 6, atk: 1, mag: 1, def: 1, spd: 1 }, // par classe maîtrisée
  BOARD_SIZE: 6,
  BOARD_EXPIRY_DAYS: 3,
  POTION_THRESHOLD: 0.35,    // un aventurier boit sa potion sous cette fraction de PV
  CATCHUP_GAP: 3,            // niveau total sous la moyenne de la guilde → xp × CATCHUP_MULT
  CATCHUP_MULT: 1.5,
  MAX_STAT_SCROLLS: 3,       // parchemins de maîtrise par aventurier
  SECOND_WIND_HP: 0.25,      // PV rendus par le trait Teigneux quand il se relève
  CRAFT_CYCLE: 5,            // jours entre deux livraisons des alchimistes
  ESTIMATE_RUNS: 24,
  LOG_MAX_LINES: 400,        // lignes conservées par compte-rendu de combat
  REPORTS_KEPT: 8,           // comptes-rendus conservés dans l'état         // simulations pour estimer la réussite d'une mission
  WAVE_REST_RATIO: 0.5,      // PV récupérés entre deux vagues (fraction du max)
  TANK_TAUNT: 0.7,           // probabilité qu'un ennemi vise le tank
  ENEMY_EXTRA: { solo: 0, team: 1, raid: 2 },          // ennemis en plus de l'effectif de référence
  BOSS_FROM: { solo: 3, team: 3, raid: 1 }, // difficulté minimale pour qu'un chef apparaisse
  BOSS: { solo: { hp: 1.3, atk: 1.0 }, team: { hp: 1.5, atk: 1.1 }, raid: { hp: 2.0, atk: 1.2 } }, // chef de dernière vague
  LOOT_CHANCE: { solo: 0.25, team: 0.4, raid: 0.8 },
  // Chaîne d'éveil : trois sceaux à briser avant d'affronter le Léviathan.
  ATTUNEMENT_RANK: 3,                                  // rang à partir duquel les sceaux apparaissent
  ATTUNEMENT_THEMES: ['morts_vivants', 'horde', 'demons'],
  // Bestiaire : paliers de connaissance et bonus de dégâts contre l'espèce.
  BESTIARY_TIERS: [
    { kills: 10, name: 'Repéré',  bonus: 0.05 },
    { kills: 30, name: 'Étudié',  bonus: 0.10 },
    { kills: 75, name: 'Maîtrisé', bonus: 0.15 },
  ],
  // Guilde rivale : elle rafle les contrats laissés trop longtemps au tableau.
  RIVAL_POACH_CHANCE: 0.45,   // probabilité quotidienne qu'elle prenne un contrat
  RIVAL_MIN_AGE: 1,           // jours passés au tableau avant qu'elle puisse le prendre
  RIVAL_RECRUIT_PENALTY: 1.25, // surcoût de recrutement quand elle mène
  FINAL_RAID_RANK: 4,
  FINAL_RAID_DIFFICULTY: 10,
  MAX_DAYS: 365,
  RANK_THRESHOLDS: [0, 50, 150, 350, 700], // réputation → rang 1..5
});

// Bâtiments de la guilde : niveau 0..3, chaque niveau a un coût et des effets.
export const BUILDINGS = Object.freeze({
  quartier: { name: 'Quartier des aventuriers', icon: '🏠', text: 'Aventuriers logés et escouades que la guilde peut former.',
    levels: [
      { cost: 0,    roster: 8,  squads: 1 },
      { cost: 400,  roster: 14, squads: 2 },
      { cost: 1000, roster: 20, squads: 3 },
      { cost: 2200, roster: 24, squads: 3 },
    ] },
  forge: { name: 'Forge', icon: '⚒', text: 'Qualité et nombre des objets en vente, remise au dernier niveau.',
    levels: [{ cost: 0, tier: 1, slots: 4, discount: 0 }, { cost: 250, tier: 2, slots: 5, discount: 0 }, { cost: 600, tier: 3, slots: 6, discount: 0 }, { cost: 1500, tier: 3, slots: 8, discount: 0.2 }] },
  alchimiste: { name: 'Alchimiste', icon: '⚗', text: 'Potions emportées en mission, bues automatiquement sous 35 % de PV.',
    levels: [{ cost: 0, potions: [] }, { cost: 150, potions: ['soin'] }, { cost: 400, potions: ['soin', 'grande'] }, { cost: 1000, potions: ['soin', 'grande', 'elixir'] }] },
  scriptorium: { name: 'Scriptorium', icon: '📜', text: 'Parchemins d’expérience et de maîtrise.',
    levels: [{ cost: 0, scrolls: [] }, { cost: 200, scrolls: ['entrainement'] }, { cost: 500, scrolls: ['entrainement', 'etude'] }, { cost: 1200, scrolls: ['entrainement', 'etude', 'maitrise'] }] },
  taverne: { name: 'Taverne', icon: '🍺', text: 'Recrutement, infirmerie et moral de la guilde.',
    levels: [
      { cost: 0,    size: 3, levelBonus: 0, traits: 1, rest: 0, reroll: 0,  morale: 0 },
      { cost: 150,  size: 4, levelBonus: 2, traits: 1, rest: 1, reroll: 30, morale: 0 },
      { cost: 400,  size: 5, levelBonus: 5, traits: 2, rest: 1, reroll: 25, morale: 0.05 },
      { cost: 1000, size: 6, levelBonus: 9, traits: 2, rest: 2, reroll: 20, morale: 0.10 },
    ] },
});

// Races : modificateurs de statistiques (multiplicatifs) + une capacité de
// combat propre. `xp` agit sur l'expérience gagnée, `skillSlot` sur le nombre
// de compétences héritées portées en combat.
export const RACES = Object.freeze({
  humain:   { name: 'Humain',   icon: '🧑', mods: {}, xp: 1.10, skillSlot: 1,
              text: 'Polyvalent : +10 % d’expérience et une compétence héritée de plus.' },
  nain:     { name: 'Nain',     icon: '🧔', mods: { hp: 1.20, def: 1.15, spd: 0.85 }, combat: { poisonProof: true },
              text: '+20 % PV, +15 % DEF, −15 % SPD · insensible au poison.' },
  elfe:     { name: 'Elfe',     icon: '🧝', mods: { spd: 1.20, mag: 1.15, hp: 0.90 }, combat: { hit: 0.10 },
              text: '+20 % SPD, +15 % MAG, −10 % PV · +10 % de précision.' },
  orc:      { name: 'Orc',      icon: '👹', mods: { atk: 1.20, hp: 1.10, mag: 0.80 }, combat: { bloodlust: 0.20 },
              text: '+20 % ATK, +10 % PV, −20 % MAG · +20 % ATK après chaque ennemi abattu (cumulable dans la vague).' },
  halfelin: { name: 'Halfelin', icon: '🧒', mods: { spd: 1.25, atk: 0.90 }, combat: { dodge: 0.15 },
              text: '+25 % SPD, −10 % ATK · 15 % d’esquive.' },
  gnome:    { name: 'Gnome',    icon: '🧙', mods: { mag: 1.25, hp: 0.85 }, combat: { mpDiscount: 0.25 },
              text: '+25 % MAG, −15 % PV · sorts 25 % moins coûteux en mana.' },
});

// Artisanat : un métier par aventurier, qui progresse les jours passés à la
// guilde (hors mission). Les niveaux de TOUS les artisans se cumulent en
// bonus de guilde — garder quelqu'un au campement devient un vrai choix.
export const CRAFTS = Object.freeze({
  forgeron:   { name: 'Forgeron',   icon: '⚒',  text: '−3 % sur les prix de la Forge par niveau, +1 palier d’objet tous les 3 niveaux.' },
  alchimiste: { name: 'Alchimiste', icon: '⚗',  text: 'Produit 1 potion de soin par niveau tous les 5 jours.' },
  cuisinier:  { name: 'Cuisinier',  icon: '🍲', text: '+2 % de moral (ATK et DEF en mission) par niveau.' },
  scribe:     { name: 'Scribe',     icon: '📜', text: '+4 % d’expérience de mission pour toute la guilde par niveau.' },
  herboriste: { name: 'Herboriste', icon: '🌿', text: 'Convalescence raccourcie d’un jour tous les 2 niveaux.' },
  negociant:  { name: 'Négociant',  icon: '💰', text: '+4 % d’or de mission par niveau.' },
});

export const CRAFT_THRESHOLDS = Object.freeze([0, 5, 15, 30, 50, 80]); // points → niveau 0..5
export const CRAFT_MAX = CRAFT_THRESHOLDS.length - 1;
export const CRAFT_CHANGE_COST = 120;   // changer de métier : coût et remise à zéro

// Traits de caractère : tirés à la création, ils distinguent les aventuriers.
// `mods` multiplie une statistique · `combat` agit pendant le combat ·
// `xp`/`wage`/`recovery`/`loyal` agissent dans la gestion.
export const TRAITS = Object.freeze({
  brave:     { name: 'Brave',      icon: '🔥', text: '+10 % ATK, −5 % DEF',                     mods: { atk: 1.10, def: 0.95 } },
  prudent:   { name: 'Prudent',    icon: '🛡', text: '+15 % DEF, −5 % ATK',                     mods: { def: 1.15, atk: 0.95 } },
  robuste:   { name: 'Robuste',    icon: '💪', text: '+15 % PV',                                mods: { hp: 1.15 } },
  vif:       { name: 'Vif',        icon: '💨', text: '+20 % SPD',                               mods: { spd: 1.20 } },
  colosse:   { name: 'Colosse',    icon: '🗿', text: '+25 % PV, −10 % SPD',                     mods: { hp: 1.25, spd: 0.90 } },
  chanceux:  { name: 'Chanceux',   icon: '🍀', text: '+10 % de chances de critique',            combat: { crit: 0.10 } },
  feroce:    { name: 'Féroce',     icon: '⚔',  text: '+25 % de dégâts contre les chefs',        combat: { bossDmg: 0.25 } },
  benit:     { name: 'Béni',       icon: '✨', text: '+25 % aux soins qu’il prodigue',          combat: { heal: 0.25 } },
  teigneux:  { name: 'Teigneux',   icon: '🦴', text: 'Se relève une fois par mission à 25 % PV', combat: { secondWind: true } },
  vigilant:  { name: 'Vigilant',   icon: '👁', text: 'Ne peut pas être étourdi',                 combat: { stunProof: true } },
  erudit:    { name: 'Érudit',     icon: '📖', text: '+25 % d’expérience gagnée',               xp: 1.25 },
  frugal:    { name: 'Frugal',     icon: '🪙', text: '−30 % de salaire',                        wage: 0.70 },
  loyal:     { name: 'Loyal',      icon: '🤝', text: 'Ne quitte jamais la guilde, même impayé', loyal: true },
  eclaireur: { name: 'Éclaireur',  icon: '🗺', text: 'Guérit un jour plus vite de ses blessures', recovery: 1 },
});

// Titres gagnés par les actes (le premier rempli, dans cet ordre, est porté).
export const TITLES = Object.freeze([
  { key: 'invaincu',  name: 'l’Invaincu',      test: (l) => l.missions >= 12 && l.defeats === 0 },
  { key: 'fleau',     name: 'le Fléau',        test: (l) => l.kills >= 80 },
  { key: 'tueurchef', name: 'Brise-Chefs',     test: (l) => l.bossKills >= 5 },
  { key: 'boucher',   name: 'le Boucher',      test: (l) => l.kills >= 30 },
  { key: 'guerisseur',name: 'le Guérisseur',   test: (l) => l.healed >= 600 },
  { key: 'survivant', name: 'le Survivant',    test: (l) => l.revivals >= 3 },
  { key: 'veteran',   name: 'le Vétéran',      test: (l) => l.missions >= 25 },
  { key: 'eprouve',   name: 'l’Éprouvé',       test: (l) => l.missions >= 10 },
]);

export const POTIONS = Object.freeze({
  soin:   { name: 'Potion de soin',  price: 25,  heal: 0.4, cure: false },
  grande: { name: 'Grande potion',   price: 50,  heal: 0.6, cure: false },
  elixir: { name: 'Élixir',          price: 100, heal: 1.0, cure: true },
});

export const SCROLLS = Object.freeze({
  entrainement: { name: 'Parchemin d’entraînement', price: 80,  xp: 100 },
  etude:        { name: 'Parchemin d’étude',        price: 220, xp: 300 },
  maitrise:     { name: 'Parchemin de maîtrise',    price: 500, statBonus: 1 },
});

export const ROLES = Object.freeze({ tank: 'Tank', dps: 'Dégâts', healer: 'Soigneur' });

// tier 1 = base, 2 = avancée, 3 = légendaire.
// requires = { from: [...classes], count } : classes à MAÎTRISER pour ouvrir celle-ci.
// ability = mécanique de combat propre à la classe (voir combat.mjs).
export const CLASSES = Object.freeze({
  guerrier:     { name: 'Guerrier',     tier: 1, role: 'tank',   weapons: ['sword', 'axe'], ability: 'garde', row: 'front', skills: ['frappe_puissante', 'cri_de_guerre', 'endurance'],
                  base: { hp: 32, atk: 6, mag: 1, def: 5, spd: 3 }, growth: { hp: 4, atk: 1.2, mag: 0.1, def: 0.9, spd: 0.3 } },
  archer:       { name: 'Archer',       tier: 1, role: 'dps',    weapons: ['bow'], ability: 'tir_precis', row: 'back', skills: ['volee', 'piege', 'precision'],
                  base: { hp: 22, atk: 6, mag: 2, def: 3, spd: 6 }, growth: { hp: 2.5, atk: 1.2, mag: 0.2, def: 0.4, spd: 0.9 } },
  mage:         { name: 'Mage',         tier: 1, role: 'dps',    weapons: ['staff'], ability: 'zone', row: 'back', skills: ['boule_de_feu', 'gel', 'arcanes'],
                  base: { hp: 18, atk: 2, mag: 8, def: 2, spd: 4 }, growth: { hp: 2, atk: 0.2, mag: 1.4, def: 0.3, spd: 0.5 } },
  clerc:        { name: 'Clerc',        tier: 1, role: 'healer', weapons: ['mace', 'staff'], ability: 'soin', row: 'back', skills: ['soin', 'benediction', 'foi'],
                  base: { hp: 24, atk: 3, mag: 6, def: 4, spd: 3 }, growth: { hp: 3, atk: 0.5, mag: 1.0, def: 0.6, spd: 0.4 } },
  voleur:       { name: 'Voleur',       tier: 1, role: 'dps',    weapons: ['dagger', 'bow'], ability: 'critique', row: 'front', skills: ['lame_empoisonnee', 'assassinat', 'esquive'],
                  base: { hp: 20, atk: 5, mag: 2, def: 2, spd: 8 }, growth: { hp: 2.5, atk: 1.0, mag: 0.2, def: 0.3, spd: 1.1 } },

  paladin:      { name: 'Paladin',      tier: 2, role: 'tank',   weapons: ['sword', 'mace'], ability: 'garde_sacree', row: 'front', skills: ['frappe_sacree', 'esprit_gardien', 'serment'],
                  requires: { from: ['guerrier', 'clerc'], count: 2 },
                  base: { hp: 40, atk: 8, mag: 5, def: 8, spd: 3 }, growth: { hp: 5, atk: 1.3, mag: 0.6, def: 1.2, spd: 0.3 } },
  berserker:    { name: 'Berserker',    tier: 2, role: 'dps',    weapons: ['axe', 'sword'], ability: 'rage', row: 'front', skills: ['cleave', 'charge', 'fureur'],
                  requires: { from: ['guerrier', 'voleur'], count: 2 },
                  base: { hp: 38, atk: 11, mag: 0, def: 4, spd: 5 }, growth: { hp: 5, atk: 1.8, mag: 0, def: 0.5, spd: 0.6 } },
  rodeur:       { name: 'Rôdeur',       tier: 2, role: 'dps',    weapons: ['bow', 'dagger'], ability: 'tir_precis', row: 'back', skills: ['loup_spectral', 'fleche_perforante', 'pistage'],
                  requires: { from: ['archer', 'clerc'], count: 2 },
                  base: { hp: 30, atk: 9, mag: 3, def: 4, spd: 8 }, growth: { hp: 3.5, atk: 1.5, mag: 0.3, def: 0.6, spd: 1.0 } },
  assassin:     { name: 'Assassin',     tier: 2, role: 'dps',    weapons: ['dagger'], ability: 'critique', row: 'front', skills: ['execution', 'poison_paralysant', 'ombre'],
                  requires: { from: ['archer', 'voleur'], count: 2 },
                  base: { hp: 26, atk: 10, mag: 2, def: 3, spd: 11 }, growth: { hp: 3, atk: 1.6, mag: 0.2, def: 0.4, spd: 1.4 } },
  archimage:    { name: 'Archimage',    tier: 2, role: 'dps',    weapons: ['staff'], ability: 'zone', row: 'back', skills: ['meteore', 'elementaire', 'savoir'],
                  requires: { from: ['mage', 'guerrier'], count: 2 },
                  base: { hp: 26, atk: 3, mag: 13, def: 4, spd: 5 }, growth: { hp: 2.5, atk: 0.2, mag: 2.0, def: 0.4, spd: 0.5 } },
  necromancien: { name: 'Nécromancien', tier: 2, role: 'dps',    weapons: ['staff', 'dagger'], ability: 'drain', row: 'back', skills: ['drain_de_vie', 'malediction', 'squelette_servile'],
                  requires: { from: ['mage', 'voleur'], count: 2 },
                  base: { hp: 28, atk: 3, mag: 11, def: 4, spd: 4 }, growth: { hp: 3, atk: 0.3, mag: 1.7, def: 0.6, spd: 0.4 } },
  pretre:       { name: 'Prêtre',       tier: 2, role: 'healer', weapons: ['mace', 'staff'], ability: 'soin_groupe', row: 'back', skills: ['soin_de_groupe', 'resurrection', 'liturgie'],
                  requires: { from: ['clerc', 'mage'], count: 2 },
                  base: { hp: 32, atk: 4, mag: 10, def: 6, spd: 4 }, growth: { hp: 4, atk: 0.5, mag: 1.5, def: 0.8, spd: 0.4 } },

  champion:     { name: 'Champion',     tier: 3, role: 'tank',   weapons: ['sword', 'axe', 'mace'], ability: 'riposte', row: 'front', skills: ['frappe_decisive', 'rempart', 'bravoure'],
                  requires: { from: ['paladin', 'berserker', 'pretre'], count: 2 },
                  base: { hp: 55, atk: 12, mag: 6, def: 11, spd: 5 }, growth: { hp: 6, atk: 1.8, mag: 0.6, def: 1.4, spd: 0.5 } },
  legende:      { name: 'Légende',      tier: 3, role: 'dps',    weapons: ['bow', 'dagger', 'staff', 'sword'], ability: 'double', row: 'front', skills: ['tempete_de_lames', 'second_souffle', 'aura_legendaire'],
                  requires: { from: ['rodeur', 'assassin', 'archimage', 'necromancien'], count: 2 },
                  base: { hp: 40, atk: 12, mag: 12, def: 6, spd: 10 }, growth: { hp: 4, atk: 1.8, mag: 1.8, def: 0.7, spd: 1.2 } },
});

// Capacité PASSIVE de chaque classe (toujours active en combat).
export const ABILITY_TEXT = Object.freeze({
  garde: 'Garde : en première ligne, attire 70 % des coups de mêlée.',
  garde_sacree: 'Garde sacrée : attire les coups, se soigne de 15 % sous la moitié de ses PV.',
  tir_precis: 'Tir précis : agit en premier à chaque vague, +20 % de dégâts.',
  zone: 'Arcanes : ses attaques de base sont magiques (ignorent la moitié de la DEF).',
  soin: 'Dévotion : ses attaques de base sont sacrées (×1,5 contre les morts-vivants).',
  soin_groupe: 'Dévotion : ses attaques de base sont sacrées (×1,5 contre les morts-vivants).',
  critique: 'Critique : 30 % de chance de doubler les dégâts.',
  rage: 'Rage : +50 % de dégâts sous la moitié de ses PV.',
  drain: 'Arcanes : ses attaques de base sont magiques (ignorent la moitié de la DEF).',
  riposte: 'Riposte : attire les coups et rend 50 % de son ATK à chaque coup reçu.',
  double: 'Double action : agit deux fois par tour.',
});

// Compétences ACTIVES : coût en mana (mp), recharge (cd, en tours), cible.
// La logique d'effet est dans combat.mjs (useSkill).
// Archétypes : servent à lire la composition d'une escouade d'un coup d'œil.
export const SKILL_ROLES = Object.freeze({
  cac:        { name: 'Corps à corps', short: 'CAC',      icon: '⚔' },
  dist:       { name: 'Distance',      short: 'Distance', icon: '🏹' },
  invocation: { name: 'Invocation',    short: 'Invoc.',   icon: '🐺' },
  controle:   { name: 'Contrôle',      short: 'Contrôle', icon: '❄' },
  soin:       { name: 'Soin',          short: 'Soin',     icon: '✚' },
  buff:       { name: 'Amélioration',  short: 'Buff',     icon: '↑' },
  debuff:     { name: 'Affaiblissement', short: 'Debuff', icon: '↓' },
});

export const SKILLS = Object.freeze({
  // --- actives (jouées en combat, dans l'ordre choisi par le joueur) -------
  frappe_puissante:  { name: 'Frappe puissante', kind: 'active', mp: 0,  cd: 3, role: 'cac',        text: '×2 dégâts sur un ennemi.' },
  cri_de_guerre:     { name: 'Cri de guerre',    kind: 'active', mp: 0,  cd: 4, role: 'controle',   text: 'Attire TOUS les coups 2 tours, +30 % DEF.' },
  volee:             { name: 'Volée',            kind: 'active', mp: 0,  cd: 3, role: 'dist',       text: 'Touche tous les ennemis (×0,6).' },
  piege:             { name: 'Piège',            kind: 'active', mp: 0,  cd: 4, role: 'controle',   text: 'Étourdit l’ennemi le plus dangereux 1 tour et le blesse.' },
  boule_de_feu:      { name: 'Boule de feu',     kind: 'active', mp: 6,  cd: 0, role: 'dist',       text: 'Zone : 75 % MAG sur tous les ennemis.' },
  gel:               { name: 'Gel',              kind: 'active', mp: 8,  cd: 3, role: 'controle',   text: '120 % MAG et étourdit 1 tour.' },
  soin:              { name: 'Soin',             kind: 'active', mp: 5,  cd: 0, role: 'soin',       text: 'Rend 100 % MAG à l’allié le plus blessé (si < 60 %).' },
  benediction:       { name: 'Bénédiction',      kind: 'active', mp: 8,  cd: 4, role: 'buff',       text: 'Alliés : +30 % ATK pendant 3 tours.' },
  lame_empoisonnee:  { name: 'Lame empoisonnée', kind: 'active', mp: 0,  cd: 3, role: 'debuff',     text: 'Frappe et empoisonne 3 tours (30 % ATK par tour).' },
  assassinat:        { name: 'Assassinat',       kind: 'active', mp: 0,  cd: 4, role: 'cac',        text: '×3 sur un ennemi sous 40 % de PV, sinon ×1,5.' },
  frappe_sacree:     { name: 'Frappe sacrée',    kind: 'active', mp: 4,  cd: 2, role: 'cac',        text: 'ATK + MAG/2, sacré, ×1,2.' },
  esprit_gardien:    { name: 'Esprit gardien',   kind: 'active', mp: 10, cd: 5, role: 'invocation', text: 'Invoque un esprit qui attire les coups à votre place.',
                       summon: { name: 'Esprit gardien', kind: 'esprit', hp: 2.6, atk: 0.5, def: 0.8, spd: 4, taunt: true } },
  cleave:            { name: 'Fauchage',         kind: 'active', mp: 0,  cd: 3, role: 'cac',        text: 'Frappe les 2 ennemis les plus faibles (×1,2).' },
  charge:            { name: 'Charge',           kind: 'active', mp: 0,  cd: 4, role: 'controle',   text: '×1,5 dégâts et l’ennemi touché perd son tour suivant.' },
  loup_spectral:     { name: 'Loup spectral',    kind: 'active', mp: 6,  cd: 4, role: 'invocation', text: 'Invoque un loup qui combat à vos côtés jusqu’à la fin de la vague.',
                       summon: { name: 'Loup spectral', kind: 'loup', hp: 2.2, atk: 0.9, def: 0.3, spd: 7 } },
  fleche_perforante: { name: 'Flèche perforante', kind: 'active', mp: 0, cd: 3, role: 'dist',       text: '×1,4 dégâts en ignorant la moitié de la défense.' },
  execution:         { name: 'Exécution',        kind: 'active', mp: 0,  cd: 3, role: 'cac',        text: '×2,5 (ATK ou MAG) sur l’ennemi le plus faible.' },
  poison_paralysant: { name: 'Poison paralysant', kind: 'active', mp: 4, cd: 4, role: 'debuff',     text: 'Empoisonne 3 tours et étourdit 1 tour.' },
  meteore:           { name: 'Météore',          kind: 'active', mp: 10, cd: 0, role: 'dist',       text: 'Zone : 100 % MAG sur tous les ennemis.' },
  elementaire:       { name: 'Élémentaire',      kind: 'active', mp: 12, cd: 5, role: 'invocation', text: 'Invoque un élémentaire de feu, puissant mais fragile.',
                       summon: { name: 'Élémentaire', kind: 'elementaire', hp: 2.0, atk: 1.3, def: 0.2, spd: 5 } },
  drain_de_vie:      { name: 'Drain de vie',     kind: 'active', mp: 6,  cd: 0, role: 'dist',       text: 'Zone : 60 % MAG, récupère 30 % des dégâts.' },
  malediction:       { name: 'Malédiction',      kind: 'active', mp: 8,  cd: 4, role: 'debuff',     text: 'Tous les ennemis : −25 % ATK pendant 3 tours.' },
  squelette_servile: { name: 'Squelette servile', kind: 'active', mp: 8, cd: 4, role: 'invocation', text: 'Relève un squelette qui encaisse et frappe pour vous.',
                       summon: { name: 'Squelette servile', kind: 'squelette', hp: 3.0, atk: 0.7, def: 0.6, spd: 3 } },
  soin_de_groupe:    { name: 'Soin de groupe',   kind: 'active', mp: 10, cd: 2, role: 'soin',       text: 'Rend 50 % MAG à tous les alliés (si 2 blessés ou 1 < 35 %).' },
  resurrection:      { name: 'Résurrection',     kind: 'active', mp: 15, cd: 6, role: 'soin',       text: 'Relève un allié à terre avec 30 % de ses PV.' },
  frappe_decisive:   { name: 'Frappe décisive',  kind: 'active', mp: 0,  cd: 3, role: 'cac',        text: '×2,5 dégâts sur la ligne avant ennemie.' },
  rempart:           { name: 'Rempart',          kind: 'active', mp: 6,  cd: 5, role: 'buff',       text: 'Toute l’escouade : +50 % DEF pendant 3 tours.' },
  tempete_de_lames:  { name: 'Tempête de lames', kind: 'active', mp: 0,  cd: 4, role: 'cac',        text: 'Frappe TOUS les ennemis (×0,9).' },
  second_souffle:    { name: 'Second souffle',   kind: 'active', mp: 8,  cd: 5, role: 'soin',       text: 'Se soigne de 50 % et dissipe poison et malédiction.' },

  // --- passives (toujours actives, ne consomment pas de tour) -------------
  endurance:         { name: 'Endurance',        kind: 'passive', mp: 0, cd: 0, role: 'cac',        text: '+15 % de points de vie.' },
  precision:         { name: 'Précision',        kind: 'passive', mp: 0, cd: 0, role: 'dist',       text: '+10 % de chances de toucher.' },
  arcanes:           { name: 'Arcanes',          kind: 'passive', mp: 0, cd: 0, role: 'dist',       text: '+20 % aux dégâts magiques.' },
  foi:               { name: 'Foi',              kind: 'passive', mp: 0, cd: 0, role: 'soin',       text: '+25 % aux soins prodigués.' },
  esquive:           { name: 'Esquive',          kind: 'passive', mp: 0, cd: 0, role: 'cac',        text: '+10 % d’esquive.' },
  serment:           { name: 'Serment',          kind: 'passive', mp: 0, cd: 0, role: 'buff',       text: '+15 % de défense.' },
  fureur:            { name: 'Fureur',           kind: 'passive', mp: 0, cd: 0, role: 'cac',        text: '+10 % d’attaque.' },
  pistage:           { name: 'Pistage',          kind: 'passive', mp: 0, cd: 0, role: 'dist',       text: '+25 % de dégâts contre les Bêtes.' },
  ombre:             { name: 'Ombre',            kind: 'passive', mp: 0, cd: 0, role: 'cac',        text: '+15 % de chances de critique.' },
  savoir:            { name: 'Savoir',           kind: 'passive', mp: 0, cd: 0, role: 'dist',       text: '+30 % de mana maximum.' },
  liturgie:          { name: 'Liturgie',         kind: 'passive', mp: 0, cd: 0, role: 'soin',       text: 'Régénération de mana doublée.' },
  bravoure:          { name: 'Bravoure',         kind: 'passive', mp: 0, cd: 0, role: 'buff',       text: '+10 % à toutes les statistiques.' },
  aura_legendaire:   { name: 'Aura légendaire',  kind: 'passive', mp: 0, cd: 0, role: 'buff',       text: 'Toute l’escouade : +10 % ATK et MAG.' },
});

export const STATUS_TEXT = Object.freeze({
  poison: 'Poison', stun: 'Étourdi', atk_up: 'Béni', def_up: 'Protégé', atk_down: 'Maudit', rage: 'Enragé', taunt_all: 'Provocation',
});

export const WEAPON_NAMES = Object.freeze({
  sword: 'Épée', axe: 'Hache', bow: 'Arc', staff: 'Bâton', mace: 'Masse', dagger: 'Dague',
});

// Thèmes de mission : plusieurs types d'ennemis (ai : melee | ranged | support
// | brute), un chef propre, et les classes favorisées (dégâts × 1.3).
// `weight` = fréquence relative dans une vague.
export const THEMES = Object.freeze({
  betes: {
    name: 'Bêtes', favored: ['archer', 'rodeur'], undead: false,
    enemies: [
      { key: 'loup', name: 'Loup', hp: 14, atk: 5, mag: 0, def: 2, spd: 7, ai: 'melee', row: 'front', weight: 5 },
      { key: 'ours', name: 'Ours', hp: 26, atk: 7, mag: 0, def: 3, spd: 3, ai: 'brute', row: 'front', weight: 2 },
      { key: 'harpie', name: 'Harpie', hp: 12, atk: 5, mag: 0, def: 1, spd: 8, ai: 'ranged', row: 'back', weight: 2 },
    ],
    boss: { key: 'alpha', name: 'Loup alpha', hp: 40, atk: 8, mag: 0, def: 3, spd: 8, ai: 'boss', row: 'front' },
  },
  morts_vivants: {
    name: 'Morts-vivants', favored: ['clerc', 'pretre', 'paladin'], undead: true,
    enemies: [
      { key: 'squelette', name: 'Squelette', hp: 16, atk: 4, mag: 0, def: 5, spd: 2, ai: 'melee', row: 'front', weight: 5 },
      { key: 'zombie', name: 'Zombie', hp: 24, atk: 4, mag: 0, def: 2, spd: 1, ai: 'melee', row: 'front', weight: 3, onHit: 'poison' },
      { key: 'spectre', name: 'Spectre', hp: 12, atk: 0, mag: 6, def: 2, spd: 6, ai: 'caster', row: 'back', weight: 2 },
    ],
    boss: { key: 'liche', name: 'Liche', hp: 36, atk: 3, mag: 9, def: 4, spd: 4, ai: 'boss', row: 'back' },
  },
  brigands: {
    name: 'Brigands', favored: ['voleur', 'assassin'], undead: false,
    enemies: [
      { key: 'bandit', name: 'Bandit', hp: 15, atk: 5, mag: 0, def: 3, spd: 5, ai: 'melee', row: 'front', weight: 5 },
      { key: 'archer_brigand', name: 'Archer brigand', hp: 11, atk: 5, mag: 0, def: 1, spd: 6, ai: 'ranged', row: 'back', weight: 3 },
      { key: 'brute', name: 'Brute', hp: 24, atk: 7, mag: 0, def: 2, spd: 3, ai: 'brute', row: 'front', weight: 2 },
    ],
    boss: { key: 'capitaine', name: 'Capitaine', hp: 38, atk: 7, mag: 0, def: 5, spd: 6, ai: 'boss', row: 'front' },
  },
  horde: {
    name: 'Horde', favored: ['mage', 'archimage', 'necromancien'], undead: false, swarm: true,
    enemies: [
      { key: 'gobelin', name: 'Gobelin', hp: 9, atk: 4, mag: 0, def: 1, spd: 5, ai: 'melee', row: 'front', weight: 6 },
      { key: 'chaman', name: 'Chaman', hp: 10, atk: 2, mag: 5, def: 1, spd: 4, ai: 'support', row: 'back', weight: 2 },
      { key: 'ogre', name: 'Ogre', hp: 30, atk: 8, mag: 0, def: 2, spd: 2, ai: 'brute', row: 'front', weight: 1 },
    ],
    boss: { key: 'roi_gobelin', name: 'Roi gobelin', hp: 34, atk: 6, mag: 0, def: 4, spd: 6, ai: 'boss', row: 'front' },
  },
  demons: {
    name: 'Démons', favored: ['guerrier', 'berserker', 'champion'], undead: false,
    enemies: [
      { key: 'diablotin', name: 'Diablotin', hp: 15, atk: 6, mag: 0, def: 3, spd: 5, ai: 'melee', row: 'front', weight: 5 },
      { key: 'succube', name: 'Succube', hp: 13, atk: 2, mag: 6, def: 2, spd: 6, ai: 'caster', row: 'back', weight: 2, spell: 'malediction' },
      { key: 'demon', name: 'Démon', hp: 28, atk: 8, mag: 0, def: 4, spd: 3, ai: 'brute', row: 'front', weight: 2 },
    ],
    boss: { key: 'seigneur', name: 'Seigneur démon', hp: 44, atk: 9, mag: 5, def: 5, spd: 5, ai: 'boss', row: 'front' },
  },
});

// Modèles d'objets : stats × palier (1..3), prix × palier².
export const ITEM_TEMPLATES = Object.freeze([
  { key: 'sword',  slot: 'weapon', kind: 'sword',  name: 'Épée',     stats: { atk: 4 },          price: 40 },
  { key: 'axe',    slot: 'weapon', kind: 'axe',    name: 'Hache',    stats: { atk: 5, spd: -1 }, price: 45 },
  { key: 'bow',    slot: 'weapon', kind: 'bow',    name: 'Arc',      stats: { atk: 3, spd: 1 },  price: 40 },
  { key: 'staff',  slot: 'weapon', kind: 'staff',  name: 'Bâton',    stats: { mag: 4 },          price: 40 },
  { key: 'mace',   slot: 'weapon', kind: 'mace',   name: 'Masse',    stats: { atk: 2, mag: 2 },  price: 40 },
  { key: 'dagger', slot: 'weapon', kind: 'dagger', name: 'Dague',    stats: { atk: 2, spd: 2 },  price: 40 },
  { key: 'plate',  slot: 'armor',  kind: 'armor',  name: 'Plates',   stats: { def: 4, hp: 6 },   price: 50 },
  { key: 'leather', slot: 'armor', kind: 'armor',  name: 'Cuir',     stats: { def: 2, spd: 1, hp: 4 }, price: 40 },
  { key: 'robe',   slot: 'armor',  kind: 'armor',  name: 'Robe',     stats: { def: 1, mag: 2, hp: 3 }, price: 40 },
  { key: 'ring',   slot: 'accessory', kind: 'accessory', name: 'Anneau', stats: { atk: 1, mag: 1 }, price: 35 },
  { key: 'amulet', slot: 'accessory', kind: 'accessory', name: 'Amulette', stats: { hp: 8, def: 1 }, price: 35 },
  { key: 'boots',  slot: 'accessory', kind: 'accessory', name: 'Bottes',   stats: { spd: 2 },       price: 30 },
]);

export const TIER_NAMES = Object.freeze({ 1: 'de fer', 2: 'd’acier', 3: 'runique' });

// Types de mission : effectif, durée (= nombre de vagues), multiplicateurs.
export const MISSION_TYPES = Object.freeze({
  solo: { name: 'Solo',   minSize: 1, maxSize: 1, duration: [1, 2], xpMult: 1.0, goldMult: 1.0, repMult: 1 },
  team: { name: 'Équipe', minSize: 2, maxSize: 4, duration: [2, 3], xpMult: 1.2, goldMult: 1.3, repMult: 2 },
  raid: { name: 'Raid',   minSize: 4, maxSize: 8, duration: [4, 6], xpMult: 1.6, goldMult: 2.0, repMult: 5 },
});

// Noms de mission par type, chacun lié à un thème.
export const MISSION_NAMES = Object.freeze({
  solo: [
    ['Escorte de marchand', 'brigands'], ['Chasse aux loups', 'betes'], ['Rat géant à la cave', 'horde'],
    ['Patrouille de nuit', 'brigands'], ['Tombe profanée', 'morts_vivants'], ['Feu follet du marais', 'demons'],
  ],
  team: [
    ['Nettoyer la mine', 'horde'], ['Bandits de la route', 'brigands'], ['Crypte oubliée', 'morts_vivants'],
    ['Nid de harpies', 'betes'], ['Tour du sorcier', 'demons'], ['Village assiégé', 'horde'],
  ],
  raid: [
    ['Antre du troll', 'betes'], ['Forteresse gobeline', 'horde'], ['Cathédrale profanée', 'morts_vivants'],
    ['Citadelle des ombres', 'demons'], ['Camp des pillards', 'brigands'],
  ],
});

export const FINAL_RAID_NAME = 'Le Cœur du Léviathan';

// Sceaux de la chaîne d'éveil, un par thème.
export const SEALS = Object.freeze({
  morts_vivants: { name: 'Le Sceau d’Ossuaire', fragment: 'Fragment d’os' },
  horde:         { name: 'Le Sceau de la Horde', fragment: 'Fragment de tambour' },
  demons:        { name: 'Le Sceau de Braise',   fragment: 'Fragment de braise' },
});

export const RIVAL_NAME = 'la Compagnie du Corbeau';
export const FINAL_RAID_THEME = 'demons';

// Patronymes : « Zara » devient « Zara Ferlame » — deux recrues ne se
// confondent plus, ni à l'écran ni dans le journal de combat.
export const SURNAMES = Object.freeze([
  'Ferlame', 'Brisecrâne', 'Ombrelune', 'Vaillecœur', 'Tissesort', 'Pierrefroide', 'Sangnoir', 'Clairbois',
  'Vent-du-Nord', 'Marteaulourd', 'Plumegrise', 'Aubedor', 'Roncevive', 'Longuevue', 'Cendrefeu', 'Taillevent',
  'Solveig', 'Corbenuit', 'Rochebrune', 'Fildargent',
]);

// Quêtes solo de la file d'entraînement : uniquement du décor pour le journal.
export const TRAINING_QUESTS = Object.freeze([
  'garde d’un convoi', 'chasse aux nuisibles', 'ronde sur les remparts', 'course de messagerie',
  'cueillette en forêt profonde', 'entraînement à la salle d’armes', 'traque d’un voleur de poules',
  'escorte d’un pèlerin', 'relevé de cartes', 'veille au sanctuaire',
]);

export const FIRST_NAMES = Object.freeze([
  'Aldric', 'Brenna', 'Cedric', 'Dalia', 'Ewan', 'Freya', 'Garin', 'Hilde', 'Isolde', 'Joran',
  'Kaela', 'Lorcan', 'Maeve', 'Niall', 'Orla', 'Perrin', 'Quill', 'Rowan', 'Sigrid', 'Tormund',
  'Una', 'Varek', 'Wren', 'Xenia', 'Yorick', 'Zara',
]);
