// guild_manager — BOT GLOUTON déterministe (« régisseur ») : joue une journée
// via l'API publique de guild.mjs. Sert à la preuve de solvabilité, aux tests
// de propriétés et au bouton « Régisseur : 1 jour ».
import { CLASSES, CONSTANTS } from './data.mjs';
import { canEquip, classLevel, classOptions, computePower, isMastered, powerGainIfEquipped, recruitCost } from './adventurer.mjs';
import {
  assignToSquad, buyItem, buyPotion, dailyWages, endDay, equip, estimateWithPotions, fillSquadsFromQueue,
  isReadyForSquad, maxRoster, potionsForSale, recruit, sellItem, sendMission, sendSquad, squadMembers,
  switchClass, trainingQueue, upgradeBuilding, upgradeOptions,
} from './guild.mjs';

// Le régisseur remplit le Quartier ; la réserve d'or freine naturellement.
const MIN_SUCCESS = 0.6;
const FINAL_MIN_SUCCESS = 0.7;
const RESERVE_DAYS = 6;
const ESTIMATE_RUNS = 12;

function reserve(state) { return dailyWages(state) * RESERVE_DAYS; }
function byPowerDesc(a, b) { return computePower(b) - computePower(a); }

function botRecruit(state) {
  while (state.roster.length < maxRoster(state) && state.tavern.length) {
    const cands = [...state.tavern].sort(byPowerDesc);
    const best = cands.find((c) => state.gold - recruitCost(c) >= reserve(state));
    if (!best || !recruit(state, best.id).ok) return;
  }
}

function botEquipFromInventory(state) {
  for (const adv of state.roster) {
    if (adv.status === 'mission') continue;
    for (const item of [...state.inventory]) {
      if (powerGainIfEquipped(adv, item) > 0) equip(state, adv.id, item.id);
    }
  }
}

function botSellSurplus(state) {
  for (const item of [...state.inventory]) {
    if (state.gold >= reserve(state)) return;
    const useful = state.roster.some((a) => powerGainIfEquipped(a, item) > 0);
    if (!useful) sellItem(state, item.id);
  }
}

function botShop(state) {
  let progress = true;
  while (progress) {
    progress = false;
    let best = null;
    for (const item of state.shop) {
      if (state.gold - item.price < reserve(state)) continue;
      for (const adv of state.roster) {
        if (adv.status === 'mission' || !canEquip(adv, item)) continue;
        const gain = powerGainIfEquipped(adv, item) / item.price;
        if (gain > 0 && (!best || gain > best.gain)) best = { item, adv, gain };
      }
    }
    if (best && buyItem(state, best.item.id).ok) { equip(state, best.adv.id, best.item.id); progress = true; }
  }
}

// --- Plan de carrière (multiclasse) -------------------------------------
// Cible : la classe du palier suivant dont les prérequis contiennent la
// classe active. Prochaine étape vers une cible : la cible si ses prérequis
// sont remplis, sinon la première classe manquante (récursivement).
export function nextStepToward(adv, targetKey) {
  const cls = CLASSES[targetKey];
  if (!cls.requires) return targetKey;
  const missing = cls.requires.from.filter((k) => !isMastered(adv, k));
  const have = cls.requires.from.length - missing.length;
  if (have >= cls.requires.count) return targetKey;
  // Préférer la classe manquante déjà entamée (niveau le plus haut).
  missing.sort((a, b) => classLevel(adv, b) - classLevel(adv, a));
  return nextStepToward(adv, missing[0]);
}

export function careerTarget(adv) {
  const active = CLASSES[adv.classKey];
  const tier = active.tier;
  if (tier >= 3) return null;
  const candidates = Object.keys(CLASSES).filter((k) => CLASSES[k].tier === tier + 1 && CLASSES[k].requires.from.includes(adv.classKey));
  return candidates[0] || null;
}

function botCareer(state) {
  for (const adv of state.roster) {
    if (adv.status !== 'available') continue;
    // 1. Une classe d'un palier supérieur est ouvrable → y aller.
    const upgrade = classOptions(adv).find((o) => o.tier > CLASSES[adv.classKey].tier && o.requirementsMet && !o.active);
    if (upgrade) {
      if (upgrade.cost === 0 || state.gold - upgrade.cost >= reserve(state)) switchClass(state, adv.id, upgrade.classKey);
      continue;
    }
    // 2. Classe active maîtrisée → progresser vers la cible de carrière.
    if (!isMastered(adv, adv.classKey)) continue;
    const target = careerTarget(adv);
    if (!target) continue;
    const step = nextStepToward(adv, target);
    if (step !== adv.classKey) switchClass(state, adv.id, step);
  }
}

// --- Missions ------------------------------------------------------------
function bestTeam(state, mission, available, minSuccess) {
  const pool = [...available].sort(byPowerDesc);
  for (let size = mission.minSize; size <= Math.min(mission.maxSize, pool.length); size++) {
    const team = pool.slice(0, size);
    if (estimateWithPotions(state, mission, team, ESTIMATE_RUNS) >= minSuccess) return team;
  }
  return null;
}

// Bâtiments : le niveau le plus bas d'abord, dans l'ordre de priorité, si l'or le permet.
const BUILD_PRIORITY = ['quartier', 'alchimiste', 'forge', 'taverne', 'scriptorium'];
function botBuild(state) {
  const opts = upgradeOptions(state).filter((o) => o.next);
  opts.sort((a, b) => a.level - b.level || BUILD_PRIORITY.indexOf(a.key) - BUILD_PRIORITY.indexOf(b.key));
  for (const o of opts) {
    if (state.gold - o.cost >= reserve(state) * 1.5) { upgradeBuilding(state, o.key); return; }
  }
}

// Potions : garder une potion de soin par aventurier quand l'alchimiste en vend.
function botPotions(state) {
  if (!potionsForSale(state).includes('soin')) return;
  const total = Object.values(state.potions).reduce((a, b) => a + b, 0);
  const missing = state.roster.length - total;
  for (let i = 0; i < missing; i++) {
    if (state.gold - 25 < reserve(state)) return;
    if (!buyPotion(state, 'soin').ok) return;
  }
}

function missionValue(m) { return m.rewardGold + m.rewardRep * 10 + (m.final ? 1e9 : 0); }

// Les escouades sont la colonne vertébrale : la principale reçoit les plus
// puissants, les secondes la relève, le reste s'entraîne en quêtes solo.
function botOrganizeSquads(state) {
  fillSquadsFromQueue(state);
  const ranked = state.roster.filter((a) => a.status !== 'mission').sort(byPowerDesc);
  const wanted = new Map();
  let index = 0;
  for (const squad of state.squads) {
    const busy = squadMembers(state, squad).filter((a) => a.status === 'mission').length;
    for (let slot = busy; slot < CONSTANTS.SQUAD_SIZE && index < ranked.length; slot++) {
      const adv = ranked[index++];
      if (!isReadyForSquad(adv) && state.roster.length > CONSTANTS.SQUAD_SIZE) continue;
      wanted.set(adv.id, squad.id);
    }
  }
  for (const [advId, squadId] of wanted) assignToSquad(state, advId, squadId);
}

function botMissions(state) {
  const missions = [...state.board].sort((a, b) => missionValue(b) - missionValue(a));
  for (const mission of missions) {
    const threshold = mission.final ? FINAL_MIN_SUCCESS : MIN_SUCCESS;
    // 1) d'abord les escouades, dans l'ordre : c'est ainsi que tourne la guilde.
    let sent = false;
    for (const squad of state.squads) {
      const ready = squadMembers(state, squad).filter((a) => a.status === 'available');
      if (ready.length < mission.minSize) continue;
      const team = ready.slice(0, mission.maxSize);
      if (estimateWithPotions(state, mission, team, ESTIMATE_RUNS) < threshold) continue;
      if (sendSquad(state, mission.id, squad.id).ok) { sent = true; break; }
    }
    if (sent) continue;
    // 2) à défaut, un groupe monté à la main parmi les disponibles.
    const available = state.roster.filter((a) => a.status === 'available');
    const team = bestTeam(state, mission, available, threshold);
    if (team) sendMission(state, mission.id, team.map((a) => a.id));
  }
}

export function botPlayDay(state) {
  botBuild(state);
  botRecruit(state);
  botPotions(state);
  botEquipFromInventory(state);
  botSellSurplus(state);
  botShop(state);
  botCareer(state);
  botOrganizeSquads(state);
  botMissions(state);
  return endDay(state);
}

export function botPlayUntilEnd(state, maxDays = CONSTANTS.MAX_DAYS) {
  const trajectory = [];
  while (state.outcome === 'playing' && state.day <= maxDays) {
    trajectory.push({ day: state.day, gold: state.gold, reputation: state.reputation, roster: state.roster.length });
    botPlayDay(state);
  }
  return { outcome: state.outcome, days: state.day, trajectory };
}
