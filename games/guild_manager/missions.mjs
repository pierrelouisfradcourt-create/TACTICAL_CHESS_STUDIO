// guild_manager — RÈGLES MISSION : génération (type, thème, difficulté),
// validation d'équipe, résolution par combat simulé (combat.mjs),
// récompenses et blessures.
import { CONSTANTS, FINAL_RAID_NAME, FINAL_RAID_THEME, MISSION_NAMES, MISSION_TYPES, SEALS, THEMES } from './data.mjs';
import { computePower } from './adventurer.mjs';
import { estimateSuccess, simulateMission } from './combat.mjs';
import { nextFloat, nextInt, pick } from './rng.mjs';

// Puissance CONSEILLÉE par tête pour une difficulté d (1..10) — indicatif ;
// les missions de groupe affrontent plus d'ennemis, d'où un multiplicateur.
const ADVISED_MULT = { solo: 1, team: 1.15, raid: 1.3 };

export function requiredPowerPerHead(difficulty) {
  return Math.round(40 * Math.pow(1.28, difficulty - 1));
}

export function createMission(state, type, difficulty, opts = {}) {
  const t = MISSION_TYPES[type];
  if (!t) throw new Error(`type de mission inconnu: ${type}`);
  const slots = opts.slots ?? nextInt(state, t.minSize, t.maxSize);
  const perHead = requiredPowerPerHead(difficulty);
  const [name, theme] = opts.name ? [opts.name, opts.theme] : pick(state, MISSION_NAMES[type]);
  if (!THEMES[theme]) throw new Error(`thème inconnu: ${theme}`);
  return {
    id: state.nextId++,
    type,
    name,
    theme,
    difficulty,
    slots,
    minSize: t.minSize,
    maxSize: t.maxSize,
    requiredPower: Math.round(perHead * slots * ADVISED_MULT[type]),
    duration: opts.duration ?? nextInt(state, t.duration[0], t.duration[1]),
    rewardGold: Math.round(perHead * slots * 0.6 * t.goldMult),
    rewardXp: Math.round(24 * difficulty * t.xpMult),   // par aventurier
    rewardRep: difficulty * t.repMult,
    expiresDay: state.day + CONSTANTS.BOARD_EXPIRY_DAYS,
    final: Boolean(opts.final),
    seal: opts.seal || null,
    team: [],
    daysLeft: 0,
  };
}

// Mission de sceau : un verrou de la chaîne d'éveil, sur un thème imposé.
export function createSealMission(state, theme, difficulty) {
  const seal = SEALS[theme];
  if (!seal) throw new Error(`sceau inconnu: ${theme}`);
  const m = createMission(state, 'raid', difficulty, {
    name: seal.name, theme, slots: 5, duration: 4, seal: theme,
  });
  m.expiresDay = Number.MAX_SAFE_INTEGER;
  m.rewardGold = Math.round(m.rewardGold * 1.5);
  m.rewardRep = Math.round(m.rewardRep * 1.5);
  return m;
}

export function createFinalRaid(state) {
  return createMission(state, 'raid', CONSTANTS.FINAL_RAID_DIFFICULTY, {
    name: FINAL_RAID_NAME, theme: FINAL_RAID_THEME, slots: 5, duration: 6, final: true,
  });
}

export function teamPower(team) {
  return team.reduce((sum, a) => sum + computePower(a), 0);
}

// Probabilité estimée par simulation (déterministe pour une équipe donnée).
export function successChance(mission, team, runs) {
  return estimateSuccess(mission, team, runs);
}

export function validateTeam(mission, team) {
  if (team.length < mission.minSize) return `effectif minimum ${mission.minSize}`;
  if (team.length > mission.maxSize) return `effectif maximum ${mission.maxSize}`;
  const ids = new Set();
  for (const a of team) {
    if (a.status !== 'available') return `${a.name} n'est pas disponible`;
    if (ids.has(a.id)) return `${a.name} en double`;
    ids.add(a.id);
  }
  return null;
}

// Résout une mission terminée par un combat RÉEL (rng de la partie).
// Mutations : statut/blessures des membres. Retourne un compte-rendu.
export function resolveMission(state, mission, team) {
  const sim = simulateMission(state, mission, team, true);
  const injuries = [];
  for (const f of sim.party) {
    const adv = team.find((a) => a.id === f.id);
    if (f.downed) { adv.status = 'injured'; adv.injuredDays = mission.duration; injuries.push(adv.id); }
  }
  const lootRoll = nextFloat(state);
  const loot = sim.success && lootRoll < CONSTANTS.LOOT_CHANCE[mission.type];
  const wavesCleared = sim.waves.filter((w) => w.cleared).length;
  return {
    missionId: mission.id,
    name: mission.name,
    success: sim.success,
    wavesCleared,
    wavesTotal: mission.duration,
    gold: sim.success ? mission.rewardGold : 0,
    xpEach: sim.success ? mission.rewardXp : Math.floor(mission.rewardXp / 2),
    rep: sim.success ? mission.rewardRep : 0,
    injuries,
    loot,
    final: mission.final,
    party: sim.party.map((f) => ({ id: f.id, name: f.name, classKey: f.classKey, hp: f.hp, maxHp: f.maxHp, downed: f.downed, dealt: f.dealt, healed: f.healed, taken: f.taken, kills: f.kills, bossKills: f.bossKills, revived: f.revived, potionUsed: f.potionUsed, traits: f.traits })),
    waves: sim.waves,
    killsByKind: sim.killsByKind,
    seal: mission.seal || null,
    log: sim.log.slice(0, CONSTANTS.LOG_MAX_LINES),
    theme: mission.theme,
  };
}
