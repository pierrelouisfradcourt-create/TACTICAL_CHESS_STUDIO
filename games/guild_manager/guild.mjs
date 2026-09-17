// guild_manager — ÉTAT DE GUILDE ET BOUCLE DE JOUR. Toute la logique de jeu
// passe par ici ; l'UI (render/input) ne fait qu'appeler ces fonctions.
// L'état est un objet JSON pur : snapshot = structuredClone, déterminisme
// garanti par state.rngState (voir rng.mjs).
import { BUILDINGS, CLASSES, CONSTANTS, CRAFTS, CRAFT_CHANGE_COST, POTIONS, RIVAL_NAME, SCROLLS, SEALS, SKILLS, SKILL_ROLES, THEMES, TRAINING_QUESTS, TRAITS } from './data.mjs';
import {
  BASE_CLASSES, applySwitchClass, canEquip, classLevel, classOptions, computePower, createAdventurer, powerGainIfEquipped,
  craftLevel, equipItem, grantXp, learnedSkills, randomItem, recruitCost, titleOf, totalLevel, traitEffects,
  unequipSlot, wageOf,
} from './adventurer.mjs';
import { createFinalRaid, createMission, createSealMission, resolveMission, successChance, validateTeam } from './missions.mjs';
import { nextFloat, nextInt, pick, seedToState } from './rng.mjs';

export function createGuild(seed = 12345) {
  const state = {
    seed,
    rngState: seedToState(seed),
    nextId: 1,
    day: 1,
    gold: CONSTANTS.START_GOLD,
    reputation: 0,
    roster: [],
    inventory: [],
    board: [],          // missions proposées
    active: [],         // missions en cours
    tavern: [],         // candidats au recrutement
    shop: [],           // objets en vente
    journal: [],
    reports: [],        // derniers comptes-rendus de combat (journal tour par tour)
    buildings: { quartier: 0, forge: 0, alchimiste: 0, scriptorium: 0, taverne: 0 },
    squads: [{ id: 1, rank: 0, name: CONSTANTS.SQUAD_RANKS[0].name, members: [] }],
    fragments: [],                     // thèmes dont le sceau est brisé
    bestiary: {},                      // espèce → nombre de proies
    rival: { name: RIVAL_NAME, reputation: 0, taken: 0 },
    nextSquadId: 2,
    potions: { soin: 0, grande: 0, elixir: 0 },
    stats: { missionsDone: 0, missionsFailed: 0, raidsDone: 0 },
    unpaidDays: 0,      // jours consécutifs de salaires impayés
    outcome: 'playing', // playing | victory | defeat
  };
  // Départ : un trio complet (tank, dégâts, soigneur) — les trois rôles du
  // combat sont ainsi jouables dès la première mission d'équipe.
  for (const classKey of ['guerrier', 'archer', 'clerc']) {
    const adv = createAdventurer(state, classKey, 1);
    state.roster.push(adv);
    state.squads[0].members.push(adv.id);
  }
  refreshTavern(state);
  refreshShop(state);
  refreshBoard(state);
  log(state, 'La guilde ouvre ses portes.');
  return state;
}

export function log(state, text) {
  state.journal.push({ day: state.day, text });
  if (state.journal.length > 200) state.journal.shift();
}

export function rankOf(state) {
  let rank = 1;
  CONSTANTS.RANK_THRESHOLDS.forEach((th, i) => { if (state.reputation >= th) rank = i + 1; });
  return rank;
}

// ----------------------------------------------------------------- bâtiments
export function buildingLevel(state, key) {
  return BUILDINGS[key].levels[state.buildings[key]];
}

export function maxRoster(state) {
  return buildingLevel(state, 'quartier').roster;
}

// ---------------------------------------------------------------- escouades
export function maxSquads(state) {
  return buildingLevel(state, 'quartier').squads;
}

// Aligne le nombre d'escouades sur le Quartier (une de plus à chaque palier).
export function syncSquads(state) {
  while (state.squads.length < maxSquads(state)) {
    const rank = state.squads.length;
    state.squads.push({ id: state.nextSquadId++, rank, name: CONSTANTS.SQUAD_RANKS[rank].name, members: [] });
  }
}

// Barème de l'escouade selon son rang (principale ou formation).
export function squadRank(squad) {
  return CONSTANTS.SQUAD_RANKS[squad.rank || 0];
}

export function findSquad(state, squadId) {
  return state.squads.find((sq) => sq.id === squadId) || null;
}

export function squadOf(state, advId) {
  return state.squads.find((sq) => sq.members.includes(advId)) || null;
}

export function squadMembers(state, squad) {
  return squad.members.map((id) => findAdventurer(state, id)).filter(Boolean);
}

// Affecte un aventurier à une escouade (squadId null = réserve).
export function assignToSquad(state, advId, squadId) {
  const adv = findAdventurer(state, advId);
  if (!adv) return { ok: false, reason: 'aventurier inconnu' };
  if (adv.status === 'mission') return { ok: false, reason: 'en mission' };
  const target = squadId == null ? null : findSquad(state, squadId);
  if (squadId != null && !target) return { ok: false, reason: 'escouade inconnue' };
  if (target && target.members.includes(advId)) return { ok: false, reason: 'déjà dans cette escouade' };
  if (target && target.members.length >= CONSTANTS.SQUAD_SIZE) return { ok: false, reason: `${CONSTANTS.SQUAD_SIZE} membres au maximum` };
  for (const sq of state.squads) sq.members = sq.members.filter((id) => id !== advId);
  if (target) target.members.push(advId);
  return { ok: true, squad: target };
}

// Échange deux aventuriers de place (l'un prend l'escouade de l'autre).
export function swapSquadMembers(state, aId, bId) {
  const a = findAdventurer(state, aId);
  const b = findAdventurer(state, bId);
  if (!a || !b) return { ok: false, reason: 'aventurier inconnu' };
  if (a.status === 'mission' || b.status === 'mission') return { ok: false, reason: 'en mission' };
  const sa = squadOf(state, aId);
  const sb = squadOf(state, bId);
  if (sa === sb) return { ok: false, reason: 'déjà dans la même escouade' };
  if (sa) sa.members = sa.members.map((id) => (id === aId ? bId : id));
  if (sb) sb.members = sb.members.map((id) => (id === bId ? aId : id));
  if (!sa) { if (sb) sb.members = sb.members.filter((id) => id !== bId); }
  if (!sb) { if (sa) sa.members = sa.members.filter((id) => id !== aId); }
  return { ok: true };
}

export function renameSquad(state, squadId, name) {
  const squad = findSquad(state, squadId);
  if (!squad) return { ok: false, reason: 'escouade inconnue' };
  const clean = String(name).trim().slice(0, 28);
  if (!clean) return { ok: false, reason: 'nom vide' };
  squad.name = clean;
  return { ok: true };
}

// Lecture de composition : rôles de classe et archétypes de compétences.
export function squadComposition(state, squad) {
  const members = squadMembers(state, squad);
  const classRoles = { tank: 0, dps: 0, healer: 0 };
  const roles = {};
  for (const key of Object.keys(SKILL_ROLES)) roles[key] = 0;
  const rows = ['front', 'back'].reduce((acc, r) => ({ ...acc, [r]: 0 }), {});
  for (const adv of members) {
    const cls = CLASSES[adv.classKey];
    classRoles[cls.role] += 1;
    rows[cls.row] += 1;
    for (const key of new Set(learnedSkills(adv).all)) roles[SKILLS[key].role] += 1;
  }
  const warnings = [];
  if (members.length) {
    if (!classRoles.tank) warnings.push('aucun tank : les coups tomberont sur l’arrière-garde');
    if (!classRoles.dps) warnings.push('aucune classe de dégâts : les vagues tomberont lentement');
    if (!classRoles.healer && !roles.soin) warnings.push('aucun soin : rien ne rendra de PV pendant les vagues');
    if (!roles.controle) warnings.push('aucun contrôle : les gros ennemis frapperont à chaque tour');
    if (!roles.buff && !roles.debuff) warnings.push('ni amélioration ni affaiblissement : les combats se joueront à la puissance brute');
    if (rows.front === 0) warnings.push('personne en première ligne');
  }
  return { members, classRoles, roles, rows, warnings, size: members.length, max: CONSTANTS.SQUAD_SIZE };
}

// Envoie une escouade entière : les membres disponibles, dans l'ordre, dans la
// limite de l'effectif de la mission.
export function sendSquad(state, missionId, squadId) {
  const squad = findSquad(state, squadId);
  if (!squad) return { ok: false, reason: 'escouade inconnue' };
  const mission = state.board.find((m) => m.id === missionId);
  if (!mission) return { ok: false, reason: 'mission inconnue' };
  const ready = squadMembers(state, squad).filter((a) => a.status === 'available');
  if (ready.length < mission.minSize) return { ok: false, reason: `${squad.name} n’a que ${ready.length} membre(s) disponible(s) sur ${mission.minSize} requis` };
  const sent = sendMission(state, missionId, ready.slice(0, mission.maxSize).map((a) => a.id));
  if (sent.ok) sent.mission.squadId = squad.id;
  return sent;
}

// ---------------------------------------------------------------- bestiaire
// Ce que la guilde a tué, elle l'a étudié : chaque palier donne un bonus de
// dégâts permanent contre l'espèce.
export function bestiaryTier(kills) {
  let tier = null;
  for (const step of CONSTANTS.BESTIARY_TIERS) if (kills >= step.kills) tier = step;
  return tier;
}

export function bestiaryBonus(state, kind) {
  const tier = bestiaryTier(state.bestiary[kind] || 0);
  return tier ? tier.bonus : 0;
}

// Table passée au combat : espèce → bonus de dégâts.
export function loreTable(state) {
  const table = {};
  for (const kind of Object.keys(state.bestiary)) table[kind] = bestiaryBonus(state, kind);
  return table;
}

// Toutes les espèces connues du jeu, avec l'état de connaissance de la guilde.
export function bestiaryEntries(state) {
  const entries = [];
  for (const [themeKey, theme] of Object.entries(THEMES)) {
    for (const tpl of [...theme.enemies, theme.boss]) {
      const kills = state.bestiary[tpl.key] || 0;
      const tier = bestiaryTier(kills);
      const next = CONSTANTS.BESTIARY_TIERS.find((step) => kills < step.kills);
      entries.push({ kind: tpl.key, name: tpl.name, theme: themeKey, themeName: theme.name, boss: tpl === theme.boss,
        kills, tier, next, bonus: tier ? tier.bonus : 0, tpl });
    }
  }
  return entries;
}

function recordKills(state, killsByKind) {
  for (const [kind, n] of Object.entries(killsByKind || {})) {
    const before = bestiaryTier(state.bestiary[kind] || 0);
    state.bestiary[kind] = (state.bestiary[kind] || 0) + n;
    const after = bestiaryTier(state.bestiary[kind]);
    if (after && after !== before) {
      const entry = bestiaryEntries(state).find((e) => e.kind === kind);
      log(state, `Bestiaire : ${entry ? entry.name : kind} — ${after.name} (+${Math.round(after.bonus * 100)} % de dégâts).`);
    }
  }
}

// ------------------------------------------------------------ guilde rivale
// Elle rafle les contrats laissés trop longtemps au tableau.
export function rivalLeads(state) {
  return state.rival.reputation > state.reputation;
}

function runRival(state) {
  if (state.outcome !== 'playing') return;
  const candidates = state.board.filter((m) => !m.final && !m.seal && m.expiresDay - CONSTANTS.BOARD_EXPIRY_DAYS <= state.day - CONSTANTS.RIVAL_MIN_AGE);
  if (!candidates.length || nextFloat(state) >= CONSTANTS.RIVAL_POACH_CHANCE) return;
  candidates.sort((a, b) => (b.rewardGold + b.rewardRep * 10) - (a.rewardGold + a.rewardRep * 10));
  const taken = candidates[0];
  state.board = state.board.filter((m) => m.id !== taken.id);
  state.rival.reputation += taken.rewardRep;
  state.rival.taken += 1;
  log(state, `${state.rival.name} rafle le contrat « ${taken.name} » (+${taken.rewardRep} rép. pour elle).`);
}

// -------------------------------------------------- file d'entraînement
// Les aventuriers sans escouade ne restent pas oisifs : ils enchaînent les
// quêtes solo, y gagnent de l'expérience et un peu d'or, et deviennent
// « prêts » quand ils ont assez d'expérience pour tenir leur place.
export function trainingQueue(state) {
  const assigned = new Set(state.squads.flatMap((sq) => sq.members));
  return state.roster.filter((a) => !assigned.has(a.id));
}

export function isReadyForSquad(adv) {
  return totalLevel(adv) >= CONSTANTS.TRAINING_READY_LEVEL;
}

function runTrainingQueue(state) {
  for (const adv of trainingQueue(state)) {
    if (adv.status !== 'available') continue;
    const wasReady = isReadyForSquad(adv);
    if (nextFloat(state) < CONSTANTS.TRAINING_INJURY) {
      adv.status = 'injured';
      adv.injuredDays = 1;
      log(state, `${adv.name} revient blessé d’une ${pick(state, TRAINING_QUESTS)}.`);
      continue;
    }
    state.gold += CONSTANTS.TRAINING_GOLD;
    adv.lore.missions += 0;
    const gained = grantXp(adv, CONSTANTS.TRAINING_XP);
    if (gained > 0) log(state, `${adv.name} progresse en quête solo : ${CLASSES[adv.classKey].name} niv. ${classLevel(adv)}.`);
    if (!wasReady && isReadyForSquad(adv)) log(state, `${adv.name} est prêt à rejoindre une escouade.`);
  }
}

// Complète les escouades avec les aventuriers prêts de la file (les plus
// puissants d'abord), sans jamais déloger personne.
export function fillSquadsFromQueue(state) {
  const ready = trainingQueue(state)
    .filter((a) => a.status !== 'mission' && isReadyForSquad(a))
    .sort((a, b) => computePower(b) - computePower(a));
  let placed = 0;
  for (const adv of ready) {
    const squad = state.squads.find((sq) => sq.members.length < CONSTANTS.SQUAD_SIZE);
    if (!squad) break;
    if (assignToSquad(state, adv.id, squad.id).ok) placed += 1;
  }
  return { ok: true, placed };
}

// ------------------------------------------------------------------ métiers
// Les niveaux de métier de TOUS les aventuriers se cumulent en bonus de guilde.
export function craftTotals(state) {
  const totals = {};
  for (const key of Object.keys(CRAFTS)) totals[key] = 0;
  for (const a of state.roster) totals[a.craft] = (totals[a.craft] || 0) + craftLevel(a);
  return totals;
}

export function craftBonuses(state) {
  const t = craftTotals(state);
  return {
    totals: t,
    forgeDiscount: Math.min(0.4, 0.03 * t.forgeron),
    forgeTier: Math.floor(t.forgeron / 3),
    potionsPerCycle: t.alchimiste,
    morale: 0.02 * t.cuisinier,
    xpMult: 1 + 0.04 * t.scribe,
    goldMult: 1 + 0.04 * t.negociant,
    rest: Math.floor(t.herboriste / 2),
  };
}

// Change le métier d'un aventurier : gratuit tant qu'il n'a rien appris,
// payant ensuite, et la progression repart de zéro.
export function changeCraft(state, advId, craftKey) {
  if (!CRAFTS[craftKey]) return { ok: false, reason: 'métier inconnu' };
  const adv = findAdventurer(state, advId);
  if (!adv) return { ok: false, reason: 'aventurier inconnu' };
  if (adv.craft === craftKey) return { ok: false, reason: 'déjà son métier' };
  const cost = adv.craftXp > 0 ? CRAFT_CHANGE_COST : 0;
  if (state.gold < cost) return { ok: false, reason: `il manque ${cost - state.gold} or` };
  state.gold -= cost;
  adv.craft = craftKey;
  adv.craftXp = 0;
  log(state, `${adv.name} se met au métier de ${CRAFTS[craftKey].name.toLowerCase()}${cost ? ` (${cost} or)` : ''}.`);
  return { ok: true, cost };
}

// Moral de guilde : Taverne + cuisiniers.
export function moraleBonus(state) {
  return buildingLevel(state, 'taverne').morale + craftBonuses(state).morale;
}

export function upgradeOptions(state) {
  return Object.keys(BUILDINGS).map((key) => {
    const level = state.buildings[key];
    const next = BUILDINGS[key].levels[level + 1] || null;
    return { key, name: BUILDINGS[key].name, level, max: BUILDINGS[key].levels.length - 1, next, cost: next ? next.cost : 0, affordable: Boolean(next) && state.gold >= next.cost };
  });
}

export function upgradeBuilding(state, key) {
  if (!BUILDINGS[key]) return { ok: false, reason: 'bâtiment inconnu' };
  const level = state.buildings[key];
  const next = BUILDINGS[key].levels[level + 1];
  if (!next) return { ok: false, reason: 'déjà au niveau maximum' };
  if (state.gold < next.cost) return { ok: false, reason: `il manque ${next.cost - state.gold} or` };
  state.gold -= next.cost;
  state.buildings[key] = level + 1;
  log(state, `${BUILDINGS[key].name} passe au niveau ${level + 1} (${next.cost} or).`);
  if (key === 'taverne') refreshTavern(state);
  if (key === 'forge') refreshShop(state);
  if (key === 'quartier') syncSquads(state);
  return { ok: true, level: level + 1 };
}

// ------------------------------------------------------------------ potions
export function potionsForSale(state) {
  return buildingLevel(state, 'alchimiste').potions;
}

export function buyPotion(state, key, qty = 1) {
  if (!POTIONS[key]) return { ok: false, reason: 'potion inconnue' };
  if (!potionsForSale(state).includes(key)) return { ok: false, reason: 'l’alchimiste ne la vend pas encore' };
  const cost = POTIONS[key].price * qty;
  if (state.gold < cost) return { ok: false, reason: `il manque ${cost - state.gold} or` };
  state.gold -= cost;
  state.potions[key] += qty;
  return { ok: true, cost };
}

// Meilleure potion disponible en stock (élixir > grande > soin).
function bestPotionInStock(stock) {
  for (const key of ['elixir', 'grande', 'soin']) if (stock[key] > 0) return key;
  return null;
}

// Plan d'attribution des potions à une équipe, sans mutation : advId → clé.
export function planPotions(state, team) {
  const stock = { ...state.potions };
  const plan = {};
  for (const a of team) {
    const key = bestPotionInStock(stock);
    plan[a.id] = key;
    if (key) stock[key] -= 1;
  }
  return plan;
}

// Estimation de réussite en tenant compte des potions que l'équipe emporterait.
export function estimateWithPotions(state, mission, team, runs) {
  const plan = planPotions(state, team);
  const withMorale = { ...mission, morale: moraleBonus(state), lore: loreTable(state) };
  return successChance(withMorale, team.map((a) => ({ ...a, potion: plan[a.id] })), runs);
}

// ---------------------------------------------------------------- parchemins
export function scrollsForSale(state) {
  return buildingLevel(state, 'scriptorium').scrolls;
}

export function useScroll(state, key, advId) {
  const scroll = SCROLLS[key];
  if (!scroll) return { ok: false, reason: 'parchemin inconnu' };
  if (!scrollsForSale(state).includes(key)) return { ok: false, reason: 'le scriptorium ne le vend pas encore' };
  const adv = findAdventurer(state, advId);
  if (!adv) return { ok: false, reason: 'aventurier inconnu' };
  if (adv.status === 'mission') return { ok: false, reason: 'en mission' };
  if (scroll.statBonus && adv.statBonus >= CONSTANTS.MAX_STAT_SCROLLS) return { ok: false, reason: `déjà ${CONSTANTS.MAX_STAT_SCROLLS} parchemins de maîtrise` };
  if (state.gold < scroll.price) return { ok: false, reason: `il manque ${scroll.price - state.gold} or` };
  state.gold -= scroll.price;
  if (scroll.xp) {
    const gained = grantXp(adv, scroll.xp);
    log(state, `${adv.name} étudie un ${scroll.name} (+${scroll.xp} xp${gained ? `, ${CLASSES[adv.classKey].name} niv. ${classLevel(adv)}` : ''}).`);
    return { ok: true, gained };
  }
  adv.statBonus += scroll.statBonus;
  log(state, `${adv.name} lit un ${scroll.name} : +${scroll.statBonus} à toutes ses statistiques.`);
  return { ok: true, gained: 0 };
}

export function dailyWages(state) {
  return state.roster.reduce((s, a) => s + wageOf(a), 0);
}

// Or promis par les missions en cours si elles réussissent toutes.
export function pendingGold(state) {
  return state.active.reduce((s, m) => s + m.rewardGold, 0);
}

export function findAdventurer(state, id) {
  return state.roster.find((a) => a.id === id) || null;
}

// ---------------------------------------------------------------- recrutement
export function refreshTavern(state) {
  state.tavern = [];
  const rank = rankOf(state);
  const tav = buildingLevel(state, 'taverne');
  for (let i = 0; i < tav.size; i++) {
    const level = nextInt(state, 1 + tav.levelBonus, 1 + rank * 2 + tav.levelBonus);
    state.tavern.push(createAdventurer(state, pick(state, BASE_CLASSES), Math.min(level, CONSTANTS.MAX_CLASS_LEVEL), tav.traits));
  }
}

// Renouvelle les candidats contre or (débloqué par la Taverne niveau 1).
export function rerollTavern(state) {
  const cost = buildingLevel(state, 'taverne').reroll;
  if (!cost) return { ok: false, reason: 'améliorez la Taverne pour renouveler les candidats' };
  if (state.gold < cost) return { ok: false, reason: `il manque ${cost - state.gold} or` };
  state.gold -= cost;
  refreshTavern(state);
  return { ok: true, cost };
}

export function recruit(state, candidateId) {
  const idx = state.tavern.findIndex((c) => c.id === candidateId);
  if (idx < 0) return { ok: false, reason: 'candidat inconnu' };
  if (state.roster.length >= maxRoster(state)) return { ok: false, reason: 'guilde pleine : agrandissez le Quartier' };
  const cand = state.tavern[idx];
  const cost = Math.round(recruitCost(cand) * (rivalLeads(state) ? CONSTANTS.RIVAL_RECRUIT_PENALTY : 1));
  if (state.gold < cost) return { ok: false, reason: `il manque ${cost - state.gold} or` };
  state.gold -= cost;
  state.tavern.splice(idx, 1);
  state.roster.push(cand);
  const room = state.squads.find((sq) => sq.members.length < CONSTANTS.SQUAD_SIZE);
  if (room) room.members.push(cand.id);
  cand.lore.joinedDay = state.day;
  if (state.roster.some((a) => a.name === cand.name)) {
    const base = cand.name;
    let n = 2;
    while (state.roster.some((a) => a.name === `${base} ${'I'.repeat(n)}`)) n += 1;
    cand.name = `${base} ${'I'.repeat(n)}`;
  }
  const traits = cand.traits.map((k) => TRAITS[k].name).join(', ');
  log(state, `${cand.name} (${CLASSES[cand.classKey].name} niv. ${totalLevel(cand)}${traits ? `, ${traits}` : ''}) rejoint la guilde pour ${cost} or.`);
  return { ok: true, adventurer: cand };
}

export function dismiss(state, advId) {
  const adv = findAdventurer(state, advId);
  if (!adv) return { ok: false, reason: 'aventurier inconnu' };
  if (adv.status === 'mission') return { ok: false, reason: 'en mission' };
  for (const slot of Object.keys(adv.equipment)) {
    const item = unequipSlot(adv, slot);
    if (item) state.inventory.push(item);
  }
  state.roster = state.roster.filter((a) => a.id !== advId);
  for (const sq of state.squads) sq.members = sq.members.filter((id) => id !== advId);
  log(state, `${adv.name} quitte la guilde.`);
  return { ok: true };
}

// ------------------------------------------------------------------ boutique
export function refreshShop(state) {
  state.shop = [];
  const forge = buildingLevel(state, 'forge');
  const craft = craftBonuses(state);
  const tier = Math.min(3, forge.tier + craft.forgeTier);
  const discount = Math.min(0.6, forge.discount + craft.forgeDiscount);
  for (let i = 0; i < forge.slots; i++) {
    const item = randomItem(state, tier);
    item.price = Math.max(1, Math.round(item.price * (1 - discount)));
    state.shop.push(item);
  }
}

export function buyItem(state, itemId) {
  const idx = state.shop.findIndex((it) => it.id === itemId);
  if (idx < 0) return { ok: false, reason: 'objet inconnu' };
  const item = state.shop[idx];
  if (state.gold < item.price) return { ok: false, reason: `il manque ${item.price - state.gold} or` };
  state.gold -= item.price;
  state.shop.splice(idx, 1);
  state.inventory.push(item);
  return { ok: true, item };
}

// Achète ET équipe en un geste : refusé sans débit si l'objet est incompatible.
export function buyAndEquip(state, itemId, advId) {
  const adv = findAdventurer(state, advId);
  const item = state.shop.find((it) => it.id === itemId);
  if (!adv) return { ok: false, reason: 'aventurier inconnu' };
  if (!item) return { ok: false, reason: 'objet inconnu' };
  if (adv.status === 'mission') return { ok: false, reason: `${adv.name} est en mission` };
  if (!canEquip(adv, item)) return { ok: false, reason: `${item.name} incompatible avec ${CLASSES[adv.classKey].name}` };
  const bought = buyItem(state, itemId);
  if (!bought.ok) return bought;
  const eq = equip(state, advId, itemId);
  return { ok: true, item, previous: eq.previous, gold: item.price };
}

export function sellItem(state, itemId) {
  const idx = state.inventory.findIndex((it) => it.id === itemId);
  if (idx < 0) return { ok: false, reason: 'objet absent de l’inventaire' };
  const item = state.inventory[idx];
  const price = Math.floor(item.price / 2);
  state.inventory.splice(idx, 1);
  state.gold += price;
  return { ok: true, gold: price };
}

export function equip(state, advId, itemId) {
  const adv = findAdventurer(state, advId);
  if (!adv) return { ok: false, reason: 'aventurier inconnu' };
  if (adv.status === 'mission') return { ok: false, reason: 'en mission' };
  const idx = state.inventory.findIndex((it) => it.id === itemId);
  if (idx < 0) return { ok: false, reason: 'objet absent de l’inventaire' };
  const item = state.inventory[idx];
  if (!canEquip(adv, item)) return { ok: false, reason: `${item.name} incompatible avec ${CLASSES[adv.classKey].name}` };
  state.inventory.splice(idx, 1);
  const prev = equipItem(adv, item);
  if (prev) state.inventory.push(prev);
  return { ok: true, previous: prev };
}

// Équipe automatiquement le meilleur de l'inventaire dans les trois
// emplacements (les objets remplacés retournent au sac).
export function optimizeEquipment(state, advId) {
  const adv = findAdventurer(state, advId);
  if (!adv) return { ok: false, reason: 'aventurier inconnu' };
  if (adv.status === 'mission') return { ok: false, reason: 'en mission' };
  let changed = 0;
  for (let guard = 0; guard < 12; guard++) {
    let best = null;
    for (const item of state.inventory) {
      const gain = powerGainIfEquipped(adv, item);
      if (gain > 0 && (!best || gain > best.gain)) best = { item, gain };
    }
    if (!best) break;
    if (!equip(state, advId, best.item.id).ok) break;
    changed += 1;
  }
  return { ok: true, changed };
}

export function unequip(state, advId, slot) {
  const adv = findAdventurer(state, advId);
  if (!adv) return { ok: false, reason: 'aventurier inconnu' };
  if (adv.status === 'mission') return { ok: false, reason: 'en mission' };
  const item = unequipSlot(adv, slot);
  if (!item) return { ok: false, reason: 'emplacement vide' };
  state.inventory.push(item);
  return { ok: true, item };
}

// ------------------------------------------------------- changement de classe
// Passe un aventurier à une autre classe. Classes de base : libre. Classe
// avancée / légendaire : prérequis (deux classes maîtrisées) + coût d'ouverture
// la première fois.
export function switchClass(state, advId, targetKey) {
  const adv = findAdventurer(state, advId);
  if (!adv) return { ok: false, reason: 'aventurier inconnu' };
  if (adv.status !== 'available') return { ok: false, reason: 'indisponible' };
  const opt = classOptions(adv).find((o) => o.classKey === targetKey);
  if (!opt) return { ok: false, reason: 'classe inconnue' };
  if (opt.active) return { ok: false, reason: 'déjà sa classe' };
  if (!opt.requirementsMet) {
    const missing = opt.from.filter((k) => !opt.have.includes(k)).map((k) => `${CLASSES[k].name} ${classLevel(adv, k)}/${CONSTANTS.MASTERY_LEVEL}`);
    return { ok: false, reason: `il faut maîtriser ${opt.need} classes parmi : ${missing.join(', ')}` };
  }
  if (state.gold < opt.cost) return { ok: false, reason: `il manque ${opt.cost - state.gold} or` };
  state.gold -= opt.cost;
  const oldName = CLASSES[adv.classKey].name;
  const dropped = applySwitchClass(adv, targetKey);
  if (dropped) state.inventory.push(dropped);
  const verb = opt.cost ? `ouvre la voie de ${CLASSES[targetKey].name} (${opt.cost} or)` : `devient ${CLASSES[targetKey].name} niv. ${classLevel(adv)}`;
  log(state, `${adv.name} ${verb} (était ${oldName}).`);
  return { ok: true, dropped, cost: opt.cost };
}

// ------------------------------------------------------------------ missions
export function refreshBoard(state) {
  const rank = rankOf(state);
  state.board = state.board.filter((m) => m.expiresDay > state.day);
  // Chaîne d'éveil : un sceau à la fois, dans l'ordre, dès le rang requis.
  const nextSeal = CONSTANTS.ATTUNEMENT_THEMES.find((t) => !state.fragments.includes(t));
  const sealOnBoard = state.board.some((m) => m.seal) || state.active.some((m) => m.seal);
  if (nextSeal && !sealOnBoard && rank >= CONSTANTS.ATTUNEMENT_RANK && state.outcome === 'playing') {
    state.board.push(createSealMission(state, nextSeal, Math.min(9, rank * 2)));
    log(state, `${SEALS[nextSeal].name} apparaît au tableau : brisez-le pour arracher son ${SEALS[nextSeal].fragment.toLowerCase()}.`);
  }
  const hasFinal = state.board.some((m) => m.final) || state.active.some((m) => m.final);
  if (rank >= CONSTANTS.FINAL_RAID_RANK && state.fragments.length >= CONSTANTS.ATTUNEMENT_THEMES.length && !hasFinal && state.outcome === 'playing') {
    const finalRaid = createFinalRaid(state);
    finalRaid.expiresDay = Number.MAX_SAFE_INTEGER;
    state.board.push(finalRaid);
  }
  // Le raid final ne compte pas dans la taille du tableau.
  while (state.board.filter((m) => !m.final && !m.seal).length < CONSTANTS.BOARD_SIZE) {
    const roll = nextInt(state, 1, 10);
    const type = rank >= 2 && roll <= 2 ? 'raid' : roll <= 5 ? 'team' : 'solo';
    // Rang 1 : difficulté 1–2 seulement, pour que le tableau de départ soit jouable.
    const difficulty = Math.min(9, nextInt(state, Math.max(1, rank * 2 - 2), rank === 1 ? 2 : rank * 2 + 1));
    state.board.push(createMission(state, type, difficulty));
  }
}

export function sendMission(state, missionId, advIds) {
  if (state.outcome !== 'playing') return { ok: false, reason: 'partie terminée' };
  const idx = state.board.findIndex((m) => m.id === missionId);
  if (idx < 0) return { ok: false, reason: 'mission inconnue' };
  const mission = state.board[idx];
  const team = advIds.map((id) => findAdventurer(state, id));
  if (team.some((a) => !a)) return { ok: false, reason: 'aventurier inconnu' };
  const err = validateTeam(mission, team);
  if (err) return { ok: false, reason: err };
  state.board.splice(idx, 1);
  mission.morale = moraleBonus(state);
  mission.lore = loreTable(state);
  mission.team = team.map((a) => a.id);
  mission.daysLeft = mission.duration;
  const plan = planPotions(state, team);
  for (const a of team) {
    a.status = 'mission'; a.missionId = mission.id;
    a.potion = plan[a.id];
    if (a.potion) state.potions[a.potion] -= 1;
  }
  state.active.push(mission);
  log(state, `${mission.name} : ${team.map((a) => a.name).join(', ')} partent pour ${mission.duration} j.`);
  return { ok: true, mission };
}

function applyReport(state, mission, team, report) {
  state.reports.unshift({
    day: state.day, missionId: mission.id, name: mission.name, type: mission.type, theme: mission.theme, difficulty: mission.difficulty,
    success: report.success, wavesCleared: report.wavesCleared, wavesTotal: report.wavesTotal,
    gold: report.gold, rep: report.rep, xpEach: report.xpEach, loot: report.loot,
    party: report.party, waves: report.waves, log: report.log,
  });
  if (state.reports.length > CONSTANTS.REPORTS_KEPT) state.reports.length = CONSTANTS.REPORTS_KEPT;
  const craft = craftBonuses(state);
  const squad = mission.squadId ? findSquad(state, mission.squadId) : null;
  const bonus = squad ? squadRank(squad) : { gold: 1, rep: 1, xp: 1 };
  state.gold += Math.round(report.gold * craft.goldMult * bonus.gold);
  state.reputation += Math.round(report.rep * bonus.rep);
  const avgLevel = state.roster.reduce((sum, a) => sum + totalLevel(a), 0) / Math.max(1, state.roster.length);
  for (const a of team) {
    const fighter = report.party.find((p) => p.id === a.id);
    if (a.potion && fighter && !fighter.potionUsed) state.potions[a.potion] += 1; // potion non bue → retour au stock
    a.potion = null;
    // Faits d'armes : nourrissent les titres affichés sur la fiche.
    if (fighter) {
      const before = titleOf(a);
      a.lore.missions += 1;
      if (!report.success) a.lore.defeats += 1;
      a.lore.kills += fighter.kills;
      a.lore.bossKills += fighter.bossKills;
      a.lore.dealt += fighter.dealt;
      a.lore.healed += fighter.healed;
      if (fighter.revived) a.lore.revivals += 1;
      const after = titleOf(a);
      if (after && after !== before) log(state, `${a.name} gagne son titre : ${after} !`);
    }
    // Rattrapage : un aventurier nettement sous la moyenne de la guilde gagne plus d'xp.
    const catchup = totalLevel(a) < avgLevel - CONSTANTS.CATCHUP_GAP ? CONSTANTS.CATCHUP_MULT : 1;
    const gained = grantXp(a, Math.round(report.xpEach * catchup * craft.xpMult * bonus.xp));
    if (gained > 0) log(state, `${a.name} passe ${CLASSES[a.classKey].name} niv. ${classLevel(a)}.`);
    if (a.status === 'mission') a.status = 'available';
    a.missionId = null;
  }
  const bilan = report.party.map((p) => `${p.name} ${p.downed ? 'à terre' : `${p.hp}/${p.maxHp} PV`} (${p.dealt} dégâts${p.healed ? `, ${p.healed} soins` : ''})`).join(' · ');
  log(state, `${mission.name} — ${report.wavesCleared}/${report.wavesTotal} vagues : ${bilan}.`);
  if (report.loot) {
    const item = randomItem(state, Math.min(3, Math.ceil(mission.difficulty / 3)));
    state.inventory.push(item);
    log(state, `Butin : ${item.name}.`);
  }
  recordKills(state, report.killsByKind);
  if (report.success && report.seal && !state.fragments.includes(report.seal)) {
    state.fragments.push(report.seal);
    const left = CONSTANTS.ATTUNEMENT_THEMES.length - state.fragments.length;
    log(state, `${SEALS[report.seal].fragment} arraché ! Chaîne d’éveil : ${state.fragments.length}/${CONSTANTS.ATTUNEMENT_THEMES.length}${left ? '' : ' — le Cœur du Léviathan peut être atteint.'}`);
  }
  if (report.success) {
    state.stats.missionsDone += 1;
    if (mission.type === 'raid') state.stats.raidsDone += 1;
    log(state, `${mission.name} : SUCCÈS (+${report.gold} or, +${report.rep} rép.).`);
    if (mission.final) { state.outcome = 'victory'; log(state, 'Le Léviathan est vaincu. La guilde entre dans la légende !'); }
  } else {
    state.stats.missionsFailed += 1;
    const hurt = team.filter((a) => report.injuries.includes(a.id)).map((a) => a.name);
    log(state, `${mission.name} : ÉCHEC à la vague ${report.wavesCleared + 1}${hurt.length ? ` — blessés : ${hurt.join(', ')}` : ''}.`);
  }
}

function advanceMissions(state) {
  const still = [];
  for (const mission of state.active) {
    mission.daysLeft -= 1;
    if (mission.daysLeft > 0) { still.push(mission); continue; }
    const team = mission.team.map((id) => findAdventurer(state, id)).filter(Boolean);
    const report = resolveMission(state, mission, team);
    applyReport(state, mission, team, report);
  }
  state.active = still;
}

function payWages(state) {
  const wages = dailyWages(state);
  if (state.gold >= wages) { state.gold -= wages; state.unpaidDays = 0; return; }
  state.gold = 0;
  state.unpaidDays += 1;
  log(state, `Salaires impayés (${wages} or dus, ${state.unpaidDays}/${CONSTANTS.UNPAID_DAYS_BEFORE_LEAVE} j).`);
  if (state.unpaidDays < CONSTANTS.UNPAID_DAYS_BEFORE_LEAVE) return;
  const leavers = state.roster.filter((a) => a.status !== 'mission' && !traitEffects(a).loyal);
  if (!leavers.length) return;
  // Le mieux payé part en premier : les salaires impayés font fuir les vétérans.
  leavers.sort((a, b) => wageOf(b) - wageOf(a));
  state.unpaidDays = 0;
  dismiss(state, leavers[0].id);
}

// Les aventuriers restés à la guilde travaillent leur métier.
function workCrafts(state) {
  for (const a of state.roster) {
    if (a.status === 'mission') continue;
    const before = craftLevel(a);
    a.craftXp = (a.craftXp || 0) + 1;
    const after = craftLevel(a);
    if (after > before) log(state, `${a.name} progresse : ${CRAFTS[a.craft].name} niveau ${after}.`);
  }
  // Les alchimistes livrent leur production tous les CRAFT_CYCLE jours.
  if (state.day % CONSTANTS.CRAFT_CYCLE === 0) {
    const produced = craftBonuses(state).potionsPerCycle;
    if (produced > 0) { state.potions.soin += produced; log(state, `Les alchimistes de la guilde livrent ${produced} potion${produced > 1 ? 's' : ''} de soin.`); }
  }
}

function healInjured(state) {
  const rest = buildingLevel(state, 'taverne').rest + craftBonuses(state).rest;
  for (const a of state.roster) {
    if (a.status !== 'injured') continue;
    a.injuredDays -= 1 + rest + traitEffects(a).recovery;
    if (a.injuredDays <= 0) { a.status = 'available'; a.injuredDays = 0; log(state, `${a.name} est rétabli.`); }
  }
}

function checkDefeat(state) {
  if (state.outcome !== 'playing') return;
  const cheapest = state.tavern.length ? Math.min(...state.tavern.map(recruitCost)) : Infinity;
  if (state.roster.length === 0 && state.gold < cheapest) { state.outcome = 'defeat'; log(state, 'Guilde ruinée : plus personne, plus d’or.'); }
  else if (state.day > CONSTANTS.MAX_DAYS) { state.outcome = 'defeat'; log(state, 'Le Léviathan a dévoré le royaume : temps écoulé.'); }
}

// Fin de journée : ordre fixe, déterministe.
export function endDay(state) {
  if (state.outcome !== 'playing') return { ok: false, reason: 'partie terminée' };
  // Le travail d'atelier passe AVANT la résolution des missions : ceux qui
  // rentrent le soir ont passé la journée dehors, pas à la forge.
  workCrafts(state);
  runTrainingQueue(state);
  runRival(state);
  advanceMissions(state);
  payWages(state);
  healInjured(state);
  state.day += 1;
  refreshTavern(state);
  refreshShop(state);
  refreshBoard(state);
  checkDefeat(state);
  return { ok: true, day: state.day, outcome: state.outcome };
}

// ------------------------------------------------------------- persistance
export function snapshot(state) {
  return structuredClone(state);
}

export function restore(snap) {
  return structuredClone(snap);
}

export function guildPower(state) {
  return state.roster.reduce((s, a) => s + computePower(a), 0);
}
