// guild_manager — MOTEUR DE COMBAT, déterministe. Une mission = `duration`
// vagues ; chaque vague = tours à l'initiative (SPD). Mécaniques : lignes
// avant/arrière · jet de toucher et de critique · mana et compétences à
// recharge (data.mjs SKILLS) · statuts · traits de caractère · moral de guilde ·
// types d'ennemis avec IA. Tout tirage passe par le porteur de rng.
//
// Le journal est une suite d'ÉVÉNEMENTS STRUCTURÉS (objets `{ t: … }`), pas du
// texte : le rejeu animé (replay.mjs) les met en scène, `formatEvent` les rend
// en français pour le journal écrit. Un seul enregistrement sert les deux.
import { CLASSES, CONSTANTS, POTIONS, SKILLS, STATUS_TEXT, THEMES } from './data.mjs';
import { classLevel, computeStats, learnedSkills, traitEffects } from './adventurer.mjs';
import { nextFloat, nextInt } from './rng.mjs';

const MAX_ROUNDS = 30;
const TAUNT_ABILITIES = new Set(['garde', 'garde_sacree', 'riposte']);
const CASTER_ABILITIES = new Set(['zone', 'drain', 'soin', 'soin_groupe']);
const HOLY_ABILITIES = new Set(['soin', 'soin_groupe']);
const FAVORED_MULT = 1.3;
const VARIANCE = 0.25;
const HIT_BASE = 0.85, HIT_MIN = 0.55, HIT_MAX = 0.98, HIT_PER_SPD = 0.015;
const CRIT_BASE = 0.05, CRIT_PER_SPD = 0.003, CRIT_MULT = 1.5, CRIT_ABILITY_CHANCE = 0.3;
const HEAL_THRESHOLD = 0.6;
const MP_REGEN_RATIO = 0.1;

// ------------------------------------------------------------ fabrication
export function enemyScale(difficulty) {
  const d = difficulty - 1;
  return { hp: Math.pow(1.34, d), atk: Math.pow(1.27, d), def: Math.pow(1.14, d), spd: Math.floor(d / 3) };
}

function baseFighter(side, name, stats, extra) {
  return {
    side, name, row: 'front',
    hp: stats.hp, maxHp: stats.hp, mp: stats.mp || 0, maxMp: stats.mp || 0,
    atk: stats.atk, mag: stats.mag || 0, def: stats.def, spd: stats.spd,
    statuses: [], cooldowns: {}, skills: [], ability: null, ai: null, boss: false,
    critBonus: 0, bossDmg: 0, healBonus: 0, secondWind: false, stunProof: false,
    poisonProof: false, hitBonus: 0, dodge: 0, bloodlust: 0, mpDiscount: 0, frenzy: 0,
    magicPower: 0, themeMult: 1, mpRegen: 1, partyAura: 0,
    downed: false, dealt: 0, healed: 0, taken: 0, kills: 0, bossKills: 0, revived: false, ...extra,
  };
}

export function makeEnemy(theme, difficulty, index, tpl, bossMult = null) {
  const s = enemyScale(difficulty);
  const stats = {
    hp: Math.round(tpl.hp * s.hp * (bossMult ? bossMult.hp : 1)),
    atk: Math.round(tpl.atk * s.atk * (bossMult ? bossMult.atk : 1)),
    mag: Math.round(tpl.mag * s.atk * (bossMult ? bossMult.atk : 1)),
    def: Math.round(tpl.def * s.def),
    spd: tpl.spd + s.spd,
    mp: tpl.mag ? 20 : 0,
  };
  const name = bossMult ? tpl.name : `${tpl.name} ${index + 1}`;
  return baseFighter('enemy', name, stats, { kind: tpl.key, row: tpl.row, ai: tpl.ai, onHit: tpl.onHit || null, spell: tpl.spell || null, boss: Boolean(bossMult), theme });
}

function pickWeighted(rng, list) {
  const total = list.reduce((s, e) => s + e.weight, 0);
  let r = nextFloat(rng) * total;
  for (const e of list) { r -= e.weight; if (r <= 0) return e; }
  return list[list.length - 1];
}

// Effectif d'une vague : référence + extra du type (+1 horde), composition
// tirée au sort parmi les types du thème, chef sur la dernière vague.
export function makeWave(mission, waveIndex, rng) {
  const theme = THEMES[mission.theme];
  const count = mission.slots + CONSTANTS.ENEMY_EXTRA[mission.type] + (theme.swarm ? 1 : 0);
  const enemies = [];
  for (let i = 0; i < count; i++) {
    const tpl = i === 0 ? theme.enemies[0] : pickWeighted(rng, theme.enemies);
    enemies.push(makeEnemy(mission.theme, mission.difficulty, i, tpl));
  }
  const boss = mission.difficulty < CONSTANTS.BOSS_FROM[mission.type] ? null : CONSTANTS.BOSS[mission.type];
  if (boss && waveIndex === mission.duration - 1) enemies.push(makeEnemy(mission.theme, mission.difficulty, count, theme.boss, boss));
  return enemies;
}

// `morale` = bonus de guilde (Taverne) appliqué à l'ATK et à la DEF.
// Effets des compétences PASSIVES choisies : elles ne consomment pas de tour,
// elles modifient le combattant une fois pour toutes.
function passiveEffects(skills, theme) {
  const p = { hp: 1, atk: 1, def: 1, mag: 1, spd: 1, mp: 1, hit: 0, dodge: 0, crit: 0,
              heal: 0, magicPower: 0, themeMult: 1, mpRegen: 1, partyAura: 0 };
  for (const key of skills) {
    if (!SKILLS[key] || SKILLS[key].kind !== 'passive') continue;
    switch (key) {
      case 'endurance': p.hp *= 1.15; break;
      case 'precision': p.hit += 0.10; break;
      case 'arcanes': p.magicPower += 0.20; break;
      case 'foi': p.heal += 0.25; break;
      case 'esquive': p.dodge += 0.10; break;
      case 'serment': p.def *= 1.15; break;
      case 'fureur': p.atk *= 1.10; break;
      case 'pistage': if (theme === 'betes') p.themeMult *= 1.25; break;
      case 'ombre': p.crit += 0.15; break;
      case 'savoir': p.mp *= 1.30; break;
      case 'liturgie': p.mpRegen *= 2; break;
      case 'bravoure': for (const k of ['hp', 'atk', 'def', 'mag', 'spd']) p[k] *= 1.10; break;
      case 'aura_legendaire': p.partyAura += 0.10; break;
      default: break;
    }
  }
  return p;
}

export function makeFighter(adv, theme, morale = 0, lore = null) {
  const st = computeStats(adv);
  const cls = CLASSES[adv.classKey];
  const eff = traitEffects(adv);
  const skills = learnedSkills(adv).all;
  const pas = passiveEffects(skills, theme);
  const caster = CASTER_ABILITIES.has(cls.ability) || skills.some((k) => SKILLS[k].mp > 0);
  const mp = caster ? Math.round((10 + st.mag + classLevel(adv)) * pas.mp) : 0;
  return baseFighter('party', adv.name, {
    hp: Math.round(st.hp * pas.hp),
    mag: Math.round(st.mag * pas.mag),
    spd: Math.round(st.spd * pas.spd),
    mp,
    atk: Math.round(st.atk * pas.atk * (1 + morale)),
    def: Math.round(st.def * pas.def * (1 + morale)),
  }, {
    id: adv.id, classKey: adv.classKey, race: adv.race, ability: cls.ability, row: cls.row, skills,
    favored: THEMES[theme].favored.includes(adv.classKey), holy: HOLY_ABILITIES.has(cls.ability),
    magicBasic: cls.ability === 'zone' || cls.ability === 'drain', theme,
    potion: adv.potion || null, potionUsed: false, lore,
    critBonus: eff.crit + pas.crit, bossDmg: eff.bossDmg, healBonus: eff.heal + pas.heal,
    magicPower: pas.magicPower, themeMult: pas.themeMult, mpRegen: pas.mpRegen, partyAura: pas.partyAura,
    secondWind: eff.secondWind, stunProof: eff.stunProof, traits: [...(adv.traits || [])],
    poisonProof: eff.poisonProof, hitBonus: eff.hit + pas.hit, dodge: eff.dodge + pas.dodge,
    bloodlust: eff.bloodlust, mpDiscount: eff.mpDiscount,
  });
}

// ---------------------------------------------------------------- utilitaires
const alive = (list) => list.filter((x) => !x.downed && x.hp > 0);
// Les invocations combattent, mais une escouade entièrement à terre a perdu :
// seuls les aventuriers comptent pour tenir la vague.
const aliveHeroes = (party) => alive(party).filter((f) => !f.summon);
const lowestHp = (list) => alive(list).reduce((m, x) => (!m || x.hp < m.hp ? x : m), null);
const highestAtk = (list) => alive(list).reduce((m, x) => (!m || Math.max(x.atk, x.mag) > Math.max(m.atk, m.mag) ? x : m), null);
const hasStatus = (f, kind) => f.statuses.some((s) => s.kind === kind);
const statusValue = (f, kind) => f.statuses.filter((s) => s.kind === kind).reduce((s, x) => s + x.value, 0);
function roll(rng) { return 1 - VARIANCE + nextFloat(rng) * 2 * VARIANCE; }
function effAtk(f) { return f.atk * (1 + statusValue(f, 'atk_up') - statusValue(f, 'atk_down') + f.frenzy); }
function effDef(f) { return f.def * (1 + statusValue(f, 'def_up')); }

function addStatus(f, kind, turns, value = 0) {
  if (kind === 'stun' && f.stunProof) return false;
  if (kind === 'poison' && f.poisonProof) return false;
  const existing = f.statuses.find((s) => s.kind === kind);
  if (existing) { existing.turns = Math.max(existing.turns, turns); existing.value = Math.max(existing.value, value); }
  else f.statuses.push({ kind, turns, value });
  return true;
}

function hitRoll(att, target, rng) {
  if (hasStatus(target, 'stun')) return true;
  const raw = HIT_BASE + (att.spd - target.spd) * HIT_PER_SPD + att.hitBonus - target.dodge;
  return nextFloat(rng) < Math.min(HIT_MAX, Math.max(HIT_MIN, raw));
}

function critRoll(att, rng) {
  const base = att.ability === 'critique' ? CRIT_ABILITY_CHANCE : CRIT_BASE + att.spd * CRIT_PER_SPD;
  return nextFloat(rng) < base + att.critBonus;
}

// ------------------------------------------------------------------ dégâts
function computeDamage(att, target, rng, { mult = 1, magic = false, holy = false, ratio = 1, pierce = 0 }) {
  const fav = att.favored ? FAVORED_MULT : 1;
  const undead = target.side === 'enemy' && THEMES[target.theme].undead;
  const holyMult = holy && undead ? 1.5 : 1;
  const bossMult = target.boss ? 1 + att.bossDmg : 1;
  const magicMult = magic ? 1 + att.magicPower : 1;
  // Bestiaire : ce que la guilde sait de l'espèce se paie en dégâts.
  const loreMult = att.side === 'party' && target.kind && att.lore ? 1 + (att.lore[target.kind] || 0) : 1;
  const base = (magic ? att.mag * ratio * mult : effAtk(att) * mult) * loreMult;
  const defPart = (magic ? effDef(target) * 0.25 : effDef(target) * 0.5) * (1 - pierce);
  return Math.max(1, Math.round(base * fav * holyMult * bossMult * magicMult * att.themeMult * roll(rng) - defPart));
}

// Abat une cible, en laissant sa chance au trait Teigneux (une fois par mission).
function knockDown(target, log) {
  target.hp = 0;
  if (target.secondWind && !target.revived) {
    target.revived = true;
    target.hp = Math.max(1, Math.round(target.maxHp * CONSTANTS.SECOND_WIND_HP));
    target.statuses = [];
    log.push({ t: 'secondWind', d: target.name, dSide: target.side, hp: target.hp, maxHp: target.maxHp });
    return false;
  }
  target.downed = true;
  return true;
}

function applyHit(att, target, dmg, log, action, crit) {
  target.hp -= dmg;
  target.taken += dmg;
  att.dealt += dmg;
  const down = target.hp <= 0 ? knockDown(target, log) : false;
  if (down) {
    att.kills += 1;
    if (target.boss) att.bossKills += 1;
    // Soif de sang (Orc) : chaque ennemi abattu renforce l'attaquant jusqu'à
    // la fin de la vague.
    if (att.bloodlust && target.side !== att.side) {
      att.frenzy += att.bloodlust;
      log.push({ t: 'frenzy', d: att.name, dSide: att.side, value: att.frenzy });
    }
  }
  log.push({ t: 'hit', a: att.name, aSide: att.side, d: target.name, dSide: target.side, dmg, crit, action, hp: Math.max(0, target.hp), maxHp: target.maxHp, down });
  if (target.side === 'party' && !target.downed && target.ability === 'riposte' && att.side === 'enemy') {
    const back = Math.max(1, Math.round(target.atk * 0.5));
    att.hp -= back; target.dealt += back;
    const attDown = att.hp <= 0 ? knockDown(att, log) : false;
    if (attDown) target.kills += 1;
    log.push({ t: 'hit', a: target.name, aSide: 'party', d: att.name, dSide: 'enemy', dmg: back, crit: false, action: 'Riposte', hp: Math.max(0, att.hp), maxHp: att.maxHp, down: attDown });
  }
  if (att.onHit === 'poison' && !target.downed && addStatus(target, 'poison', 3, Math.max(1, Math.round(att.atk * 0.3)))) {
    log.push({ t: 'status', d: target.name, dSide: target.side, kind: 'poison' });
  }
}

function attack(att, target, rng, log, opts = {}, action = 'Attaque') {
  if (!target) return 0;
  if (!hitRoll(att, target, rng)) { log.push({ t: 'miss', a: att.name, aSide: att.side, d: target.name, dSide: target.side, action }); return 0; }
  let dmg = computeDamage(att, target, rng, opts);
  const crit = critRoll(att, rng);
  if (crit) dmg = Math.round(dmg * (att.ability === 'critique' ? 2 : CRIT_MULT));
  applyHit(att, target, dmg, log, action, crit);
  return dmg;
}

function heal(src, target, amount, log, action = 'Soin') {
  const boosted = Math.round(amount * (1 + src.healBonus));
  const real = Math.min(boosted, target.maxHp - target.hp);
  if (real <= 0) return 0;
  target.hp += real; src.healed += real;
  log.push({ t: 'heal', a: src.name, aSide: src.side, d: target.name, dSide: target.side, amount: real, action, hp: target.hp, maxHp: target.maxHp });
  return real;
}

// ------------------------------------------------------------------ ciblage
function enemyTargetFor(f, enemies) {
  const front = alive(enemies).filter((e) => e.row === 'front');
  if (f.row === 'front' && front.length && !f.magicBasic) return lowestHp(front);
  return lowestHp(enemies);
}

function partyTargetFor(e, party, rng) {
  const living = alive(party);
  if (!living.length) return null;
  const taunting = living.filter((p) => hasStatus(p, 'taunt_all'));
  if (taunting.length) return taunting[nextInt(rng, 0, taunting.length - 1)];
  const front = living.filter((p) => p.row === 'front');
  const back = living.filter((p) => p.row === 'back');
  if (e.ai === 'ranged' && back.length && nextFloat(rng) < 0.7) return back[nextInt(rng, 0, back.length - 1)];
  if (e.ai === 'caster' || (e.ai === 'boss' && e.mag > e.atk)) return living[nextInt(rng, 0, living.length - 1)];
  const pool = front.length ? front : living;
  const tanks = pool.filter((p) => TAUNT_ABILITIES.has(p.ability));
  if (tanks.length && nextFloat(rng) < CONSTANTS.TANK_TAUNT) return tanks[nextInt(rng, 0, tanks.length - 1)];
  return pool[nextInt(rng, 0, pool.length - 1)];
}

// -------------------------------------------------------------- compétences
function canUse(f, key) {
  return (f.cooldowns[key] || 0) <= 0 && f.mp >= skillCost(f, key);
}

export function skillCost(f, key) {
  return Math.ceil(SKILLS[key].mp * (1 - (f.mpDiscount || 0)));
}

function spend(f, key) {
  const sk = SKILLS[key];
  f.mp -= skillCost(f, key);
  if (sk.cd > 0) f.cooldowns[key] = sk.cd + 1; // décrémenté en fin de tour
}

function skillWanted(f, key, party, enemies) {
  const living = alive(enemies);
  switch (key) {
    case 'rempart': return alive(party).length >= 2 && !alive(party).some((p) => hasStatus(p, 'def_up'));
    case 'second_souffle': return f.hp < f.maxHp * 0.6;
    case 'tempete_de_lames': return living.length >= 2;
    case 'soin': return alive(party).some((p) => p.hp < p.maxHp * HEAL_THRESHOLD);
    case 'soin_de_groupe': { const hurt = alive(party).filter((p) => p.hp < p.maxHp * HEAL_THRESHOLD); return hurt.length >= 2 || hurt.some((p) => p.hp < p.maxHp * 0.35); }
    case 'resurrection': return party.some((p) => p.downed);
    case 'benediction': return living.length >= 2 && !alive(party).some((p) => hasStatus(p, 'atk_up'));
    case 'malediction': return living.length >= 2 && !living.some((e) => hasStatus(e, 'atk_down'));
    case 'cri_de_guerre': return alive(party).length >= 2 && !hasStatus(f, 'taunt_all');
    case 'volee': case 'boule_de_feu': case 'meteore': case 'drain_de_vie': case 'cleave': return living.length >= 2;
    default:
      // Une invocation ne se relance pas tant que la précédente tient debout.
      if (SKILLS[key].summon) return living.length > 0 && !alive(party).some((p) => p.summon && p.kind === SKILLS[key].summon.kind);
      return living.length > 0;
  }
}

// Crée l'allié invoqué : ses statistiques dérivent de la MAG de l'invocateur.
function makeSummon(caster, spec) {
  const mag = Math.max(1, caster.mag);
  const hp = Math.round(mag * spec.hp + 10);
  return baseFighter('party', `${spec.name} de ${caster.name.split(' ')[0]}`, {
    hp, atk: Math.max(1, Math.round(mag * spec.atk)), mag: 0,
    def: Math.max(0, Math.round(mag * spec.def)), spd: spec.spd, mp: 0,
  }, { summon: true, kind: spec.kind, row: 'front', ability: spec.taunt ? 'garde' : null, theme: caster.theme });
}

function summon(f, key, party, log) {
  const spec = SKILLS[key].summon;
  const unit = makeSummon(f, spec);
  party.push(unit);
  log.push({ t: 'summon', a: f.name, d: unit.name, kind: spec.kind, hp: unit.hp, maxHp: unit.maxHp, action: SKILLS[key].name });
}

function withAtk(f, value, fn) { const save = f.atk; f.atk = value; fn(); f.atk = save; }

function stunHit(f, target, rng, log, name, opts, kind) {
  if (!target) return;
  if (attack(f, target, rng, log, opts, name) && !target.downed && addStatus(target, 'stun', 1)) {
    log.push({ t: 'status', d: target.name, dSide: target.side, kind });
  }
}

function useSkill(f, key, party, enemies, rng, log) {
  const name = SKILLS[key].name;
  if (SKILLS[key].summon) return summon(f, key, party, log);
  switch (key) {
    case 'frappe_puissante': return attack(f, enemyTargetFor(f, enemies), rng, log, { mult: 2 }, name);
    case 'frappe_sacree': return withAtk(f, f.atk + f.mag * 0.5, () => attack(f, enemyTargetFor(f, enemies), rng, log, { mult: 1.2, holy: true }, name));
    case 'cleave': for (const t of alive(enemies).sort((a, b) => a.hp - b.hp).slice(0, 2)) attack(f, t, rng, log, { mult: 1.2 }, name); return;
    case 'volee': for (const t of alive(enemies)) attack(f, t, rng, log, { mult: 0.6 }, name); return;
    case 'piege': return stunHit(f, highestAtk(enemies), rng, log, name, {}, 'stun');
    case 'gel': return stunHit(f, highestAtk(enemies), rng, log, name, { magic: true, ratio: 1.2 }, 'stun');
    case 'lame_empoisonnee': { const t = enemyTargetFor(f, enemies); if (attack(f, t, rng, log, {}, name) && !t.downed && addStatus(t, 'poison', 3, Math.max(1, Math.round(f.atk * 0.3)))) log.push({ t: 'status', d: t.name, dSide: 'enemy', kind: 'poison' }); return; }
    case 'assassinat': { const t = lowestHp(enemies); return attack(f, t, rng, log, { mult: t && t.hp < t.maxHp * 0.4 ? 3 : 1.5 }, name); }
    case 'boule_de_feu': for (const t of alive(enemies)) attack(f, t, rng, log, { magic: true, ratio: 0.75 }, name); return;
    case 'meteore': for (const t of alive(enemies)) attack(f, t, rng, log, { magic: true, ratio: 1.0 }, name); return;
    case 'drain_de_vie': { let total = 0; for (const t of alive(enemies)) total += attack(f, t, rng, log, { magic: true, ratio: 0.6 }, name); if (total) heal(f, f, Math.round(total * 0.3), log, 'Drain'); return; }
    case 'malediction': for (const t of alive(enemies)) addStatus(t, 'atk_down', 3, 0.25); log.push({ t: 'aura', a: f.name, aSide: f.side, action: name, target: 'enemies', kind: 'atk_down' }); return;
    case 'soin': return heal(f, lowestHp(party), Math.round(f.mag * 1.0), log, name);
    case 'soin_de_groupe': for (const p of alive(party)) heal(f, p, Math.round(f.mag * 0.5), log, name); return;
    case 'resurrection': { const d = party.find((p) => p.downed); if (!d) return; d.downed = false; d.hp = Math.max(1, Math.round(d.maxHp * 0.3)); d.statuses = []; log.push({ t: 'revive', a: f.name, d: d.name, hp: d.hp, maxHp: d.maxHp }); return; }
    case 'benediction': for (const p of alive(party)) addStatus(p, 'atk_up', 3, 0.3); log.push({ t: 'aura', a: f.name, aSide: f.side, action: name, target: 'party', kind: 'atk_up' }); return;
    case 'chatiment': return attack(f, enemyTargetFor(f, enemies), rng, log, { magic: true, ratio: 0.8, holy: true }, name);
    case 'cri_de_guerre': addStatus(f, 'taunt_all', 2); addStatus(f, 'def_up', 3, 0.3); log.push({ t: 'aura', a: f.name, aSide: f.side, action: name, target: 'self', kind: 'taunt_all' }); return;
    case 'execution': return withAtk(f, Math.max(f.atk, f.mag), () => attack(f, lowestHp(enemies), rng, log, { mult: 2.5 }, name));
    case 'charge': return stunHit(f, enemyTargetFor(f, enemies), rng, log, name, { mult: 1.5 }, 'stun');
    case 'fleche_perforante': return attack(f, enemyTargetFor(f, enemies), rng, log, { mult: 1.4, pierce: 0.5 }, name);
    case 'poison_paralysant': {
      const t = enemyTargetFor(f, enemies);
      if (!attack(f, t, rng, log, { mult: 0.8 }, name) || t.downed) return;
      if (addStatus(t, 'poison', 3, Math.max(1, Math.round(f.atk * 0.3)))) log.push({ t: 'status', d: t.name, dSide: 'enemy', kind: 'poison' });
      if (addStatus(t, 'stun', 1)) log.push({ t: 'status', d: t.name, dSide: 'enemy', kind: 'stun' });
      return;
    }
    case 'frappe_decisive': {
      const front = alive(enemies).filter((e) => e.row === 'front');
      return attack(f, lowestHp(front.length ? front : enemies), rng, log, { mult: 2.5 }, name);
    }
    case 'rempart':
      for (const p of alive(party)) addStatus(p, 'def_up', 3, 0.5);
      log.push({ t: 'aura', a: f.name, aSide: 'party', action: name, target: 'party', kind: 'def_up' });
      return;
    case 'tempete_de_lames': for (const t of alive(enemies)) attack(f, t, rng, log, { mult: 0.9 }, name); return;
    case 'second_souffle':
      f.statuses = f.statuses.filter((st) => st.kind !== 'poison' && st.kind !== 'atk_down');
      return heal(f, f, Math.round(f.maxHp * 0.5), log, name);
    default: return attack(f, enemyTargetFor(f, enemies), rng, log, {}, name);
  }
}

function basicAttack(f, enemies, rng, log) {
  const t = enemyTargetFor(f, enemies);
  const opts = f.magicBasic ? { magic: true, ratio: 1.0 } : f.holy ? { magic: true, ratio: 0.8, holy: true } : { mult: f.ability === 'tir_precis' ? 1.2 : 1 };
  if (f.ability === 'rage' && f.hp < f.maxHp * 0.5) opts.mult = (opts.mult || 1) * 1.5;
  const action = f.magicBasic ? 'Trait arcanique' : f.holy ? 'Frappe sacrée' : f.ability === 'rage' && f.hp < f.maxHp * 0.5 ? 'Rage' : 'Attaque';
  return attack(f, t, rng, log, opts, action);
}

function partyAct(f, party, enemies, rng, log) {
  if (f.potion && f.hp < f.maxHp * CONSTANTS.POTION_THRESHOLD) {
    const potion = POTIONS[f.potion];
    f.potionUsed = true; f.potion = null;
    if (potion.cure) f.statuses = f.statuses.filter((s) => ['atk_up', 'def_up', 'taunt_all'].includes(s.kind));
    heal(f, f, Math.round(f.maxHp * potion.heal), log, potion.name);
    return;
  }
  if (f.ability === 'garde_sacree' && f.hp < f.maxHp * 0.5) heal(f, f, Math.round(f.maxHp * 0.15), log, 'Garde sacrée');
  for (const key of f.skills) {
    if (SKILLS[key].kind === 'passive') continue;   // déjà appliquée en permanence
    if (canUse(f, key) && skillWanted(f, key, party, enemies)) { spend(f, key); useSkill(f, key, party, enemies, rng, log); return; }
  }
  basicAttack(f, enemies, rng, log);
}

// ------------------------------------------------------------ IA ennemie
function enemyAct(e, party, enemies, rng, log) {
  if (e.ai === 'support') {
    const hurt = alive(enemies).filter((x) => x !== e && x.hp < x.maxHp * 0.7);
    if (hurt.length) { const t = lowestHp(hurt); heal(e, t, Math.round(t.maxHp * 0.3), log, 'Incantation'); return; }
  }
  if (e.spell === 'malediction' && (e.cooldowns.malediction || 0) <= 0 && alive(party).length >= 2) {
    e.cooldowns.malediction = 5;
    for (const p of alive(party)) addStatus(p, 'atk_down', 3, 0.25);
    log.push({ t: 'aura', a: e.name, aSide: 'enemy', action: 'Malédiction', target: 'party', kind: 'atk_down' });
    return;
  }
  const target = partyTargetFor(e, party, rng);
  if (!target) return;
  const casts = e.ai === 'caster' || (e.ai === 'boss' && e.mag > e.atk);
  if (e.ai === 'boss' && (e.cooldowns.souffle || 0) <= 0 && alive(party).length >= 2) {
    e.cooldowns.souffle = 4;
    for (const p of alive(party)) attack(e, p, rng, log, casts ? { magic: true, ratio: 0.8 } : { mult: 0.8 }, 'Souffle');
    return;
  }
  if (e.ai === 'brute' && (e.cooldowns.frappe || 0) <= 0) { e.cooldowns.frappe = 4; attack(e, target, rng, log, { mult: 2 }, 'Écrasement'); return; }
  if (casts) { attack(e, target, rng, log, { magic: true, ratio: 1.0 }, 'Sort'); return; }
  attack(e, target, rng, log, {}, e.ai === 'ranged' ? 'Tir' : 'Attaque');
}

// ----------------------------------------------------------------- tours
function initiative(party, enemies, round) {
  const actors = [
    ...alive(party).map((f) => ({ f, key: f.spd + (round === 1 && f.ability === 'tir_precis' ? 100 : 0) })),
    ...alive(enemies).map((f) => ({ f, key: f.spd })),
  ];
  actors.sort((a, b) => b.key - a.key || (a.f.side === 'party' ? -1 : 1));
  return actors.map((a) => a.f);
}

function startTurn(f, log) {
  const poison = f.statuses.find((s) => s.kind === 'poison');
  if (poison) {
    f.hp -= poison.value; f.taken += poison.value;
    const down = f.hp <= 0 ? knockDown(f, log) : false;
    log.push({ t: 'poison', d: f.name, dSide: f.side, dmg: poison.value, hp: Math.max(0, f.hp), maxHp: f.maxHp, down });
    if (down) return false;
  }
  if (f.maxMp) f.mp = Math.min(f.maxMp, f.mp + Math.ceil(f.maxMp * MP_REGEN_RATIO * (f.mpRegen || 1)));
  if (hasStatus(f, 'stun')) { log.push({ t: 'stunned', d: f.name, dSide: f.side }); return false; }
  return true;
}

function endTurn(f) {
  for (const s of f.statuses) s.turns -= 1;
  f.statuses = f.statuses.filter((s) => s.turns > 0);
  for (const k of Object.keys(f.cooldowns)) if (f.cooldowns[k] > 0) f.cooldowns[k] -= 1;
}

function act(f, party, enemies, rng, log) {
  if (!startTurn(f, log)) { endTurn(f); return; }
  const actions = f.ability === 'double' ? 2 : 1;
  for (let i = 0; i < actions; i++) {
    if (!alive(enemies).length || !aliveHeroes(party).length) break;
    if (f.side === 'party') partyAct(f, party, enemies, rng, log); else enemyAct(f, party, enemies, rng, log);
  }
  endTurn(f);
}

function snapshotSide(list) {
  return list.map((f) => ({ name: f.name, hp: f.hp, maxHp: f.maxHp, downed: f.downed, kind: f.kind || null, classKey: f.classKey || null, race: f.race || null, id: f.id ?? null, boss: f.boss, row: f.row, summon: Boolean(f.summon) }));
}

function startWave(party, enemies, waveIndex, log) {
  // Les invocations ne survivent pas à la vague qui les a vues naître.
  for (let i = party.length - 1; i >= 0; i--) if (party[i].summon) party.splice(i, 1);
  for (const p of party) { p.cooldowns = {}; p.statuses = []; p.revived = false; p.frenzy = 0; }
  // Aura légendaire : passive d'escouade, posée une fois par vague.
  const aura = alive(party).find((p) => p.partyAura > 0);
  if (aura) {
    for (const q of alive(party)) addStatus(q, 'atk_up', 99, aura.partyAura);
    log.push({ t: 'aura', a: aura.name, aSide: 'party', action: 'Aura légendaire', target: 'party', kind: 'atk_up' });
  }
  log.push({ t: 'wave', i: waveIndex + 1, enemies: snapshotSide(enemies), party: snapshotSide(party) });
}

// Joue une vague ; renvoie true si elle est nettoyée.
export function playWave(party, enemies, rng, log, waveIndex = 0) {
  startWave(party, enemies, waveIndex, log);
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    log.push({ t: 'round', n: round });
    for (const f of initiative(party, enemies, round)) {
      if (f.downed || f.hp <= 0) continue;
      act(f, party, enemies, rng, log);
      if (!alive(enemies).length) { log.push({ t: 'waveEnd', cleared: true }); return true; }
      if (!aliveHeroes(party).length) { log.push({ t: 'waveEnd', cleared: false }); return false; }
    }
  }
  log.push({ t: 'waveEnd', cleared: false, stalled: true });
  return false;
}

function rest(party, log) {
  for (const p of alive(party)) {
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * CONSTANTS.WAVE_REST_RATIO));
    if (p.maxMp) p.mp = Math.min(p.maxMp, p.mp + Math.round(p.maxMp * 0.5));
    if (p.hp > before) log.push({ t: 'rest', d: p.name, dSide: 'party', amount: p.hp - before, hp: p.hp, maxHp: p.maxHp });
  }
}

// Simule la mission. `rng` porte rngState (partie ou estimation).
// withLog = true conserve les événements (résolution réelle).
export function simulateMission(rng, mission, team, withLog = false) {
  const party = team.map((a) => makeFighter(a, mission.theme, mission.morale || 0, mission.lore || null));
  const killsByKind = {};
  const waves = [];
  const log = withLog ? [] : { push() {} };
  let success = true;
  for (let w = 0; w < mission.duration; w++) {
    const enemies = makeWave(mission, w, rng);
    const cleared = playWave(party, enemies, rng, log, w);
    for (const e of enemies) if (e.downed && e.kind) killsByKind[e.kind] = (killsByKind[e.kind] || 0) + 1;
    waves.push({
      index: w + 1, cleared, enemies: enemies.length, killed: enemies.filter((e) => e.downed).length,
      partyAlive: aliveHeroes(party).length,
      party: party.filter((p) => !p.summon).map((p) => ({ name: p.name, hp: p.hp, maxHp: p.maxHp, downed: p.downed })),
    });
    if (!cleared) { success = false; break; }
    if (w < mission.duration - 1) rest(party, log);
  }
  log.push({ t: 'end', success });
  return { success, waves, killsByKind, party: party.filter((f) => !f.summon), log: withLog ? log : [] };
}

// Estimation déterministe : N simulations sans journal sur un rng dérivé de la
// mission et de l'équipe (même équipe → même chiffre).
export function estimateSuccess(mission, team, runs = CONSTANTS.ESTIMATE_RUNS) {
  if (!team.length) return 0;
  const seed = (mission.id * 7919 + team.reduce((s, a) => s + a.id * 131, 0) + mission.difficulty) >>> 0;
  const rng = { rngState: seed || 1 };
  let wins = 0;
  for (let i = 0; i < runs; i++) if (simulateMission(rng, mission, team).success) wins += 1;
  return wins / runs;
}

// ------------------------------------------------- rendu texte d'un événement
const STATUS_VERB = { poison: 'est empoisonné', stun: 'est étourdi', atk_down: 'est maudit', atk_up: 'est béni', def_up: 'est protégé' };

export function formatEvent(ev) {
  switch (ev.t) {
    case 'wave': return `— Vague ${ev.i} : ${ev.enemies.map((e) => `${e.name} (${e.maxHp} PV${e.boss ? ', chef' : ''})`).join(', ')}.`;
    case 'round': return `· Tour ${ev.n}`;
    case 'hit': return `${ev.a} — ${ev.action}${ev.crit ? ' CRITIQUE' : ''} sur ${ev.d} : ${ev.dmg}${ev.down ? ` — ${ev.dSide === 'party' ? 'à terre !' : 'vaincu !'}` : ` (${ev.hp}/${ev.maxHp})`}`;
    case 'miss': return `${ev.a} — ${ev.action} : rate ${ev.d}.`;
    case 'heal': return `${ev.a} — ${ev.action} : +${ev.amount} PV à ${ev.d} (${ev.hp}/${ev.maxHp}).`;
    case 'poison': return `${ev.d} souffle du poison (−${ev.dmg})${ev.down ? ' et succombe' : ` (${ev.hp}/${ev.maxHp})`}.`;
    case 'stunned': return `${ev.d} est étourdi et perd son tour.`;
    case 'status': return `${ev.d} ${STATUS_VERB[ev.kind] || STATUS_TEXT[ev.kind] || ev.kind}.`;
    case 'aura': return `${ev.a} — ${ev.action} : ${ev.target === 'party' ? 'le groupe' : ev.target === 'enemies' ? 'les ennemis' : 'lui-même'}.`;
    case 'secondWind': return `${ev.d} refuse de tomber et se relève (${ev.hp}/${ev.maxHp}) !`;
    case 'summon': return `${ev.a} — ${ev.action} : ${ev.d} entre en lice (${ev.maxHp} PV).`;
    case 'frenzy': return `${ev.d} entre en soif de sang (+${Math.round(ev.value * 100)} % ATK).`;
    case 'revive': return `${ev.a} relève ${ev.d} (${ev.hp}/${ev.maxHp}) !`;
    case 'rest': return `${ev.d} se repose : +${ev.amount} PV (${ev.hp}/${ev.maxHp}).`;
    case 'waveEnd': return ev.cleared ? '— Vague nettoyée.' : ev.stalled ? '— Le combat s’enlise : vague perdue.' : '— Vague perdue.';
    case 'end': return ev.success ? '— Mission réussie.' : '— Mission échouée.';
    default: return '';
  }
}

export { STATUS_TEXT };
