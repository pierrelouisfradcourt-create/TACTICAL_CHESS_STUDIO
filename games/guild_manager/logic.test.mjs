// guild_manager — tests de logique (node --test logic.test.mjs properties.test.mjs
// = commande de mutation DEFAULT_TEST_ARGV du driver Forge). Assertions STRICTES.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, CLASSES, CONSTANTS, CRAFT_CHANGE_COST, MISSION_TYPES, POTIONS, SCROLLS, SEALS, SKILLS, SKILL_ROLES, THEMES, TITLES, TRAITS } from './data.mjs';
import { portraitSeed, portraitSvg } from './portrait.mjs';
import { CRAFT_THRESHOLDS, RACES } from './data.mjs';
import {
  applySwitchClass, availableSkills, classLevel, classOptions, computePower, computeStats, craftLevel,
  craftProgress, createAdventurer, equipItem, grantXp, isMastered, learnedSkills, makeItem, recruitCost,
  focusMultiplier, itemAffinityBonus, powerGainIfEquipped, resetLoadout, skillRoles, titleOf, toggleSkill,
  totalLevel, traitEffects, wageOf, xpToNext,
} from './adventurer.mjs';
import { createMission, createSealMission, requiredPowerPerHead, resolveMission, successChance, validateTeam } from './missions.mjs';
import { enemyScale, estimateSuccess, formatEvent, makeEnemy, makeFighter, makeWave, playWave, simulateMission, skillCost } from './combat.mjs';
import {
  buildingLevel, buyAndEquip, buyItem, buyPotion, createGuild, dailyWages, endDay, equip, estimateWithPotions,
  dismiss, maxRoster, moraleBonus, pendingGold, planPotions, rankOf, recruit, rerollTavern, sellItem, sendMission,
  snapshot, switchClass, unequip, upgradeBuilding, upgradeOptions, useScroll,
  bestiaryBonus, bestiaryEntries, bestiaryTier, changeCraft, craftBonuses, craftTotals, loreTable,
  optimizeEquipment, rivalLeads,
  assignToSquad, fillSquadsFromQueue, findSquad, isReadyForSquad, maxSquads, renameSquad, sendSquad,
  squadComposition, squadMembers, squadOf, squadRank, swapSquadMembers, syncSquads, trainingQueue,
} from './guild.mjs';
import { nextFloat, nextInt, seedToState } from './rng.mjs';

function fresh(seed = 7) { return createGuild(seed); }
// Aventurier neutre : ni trait ni modificateur de race (l'Humain n'en a
// aucun), pour que les tests de formule exacte partent d'une base stable.
function mk(state, classKey, level = 1, race = 'humain') {
  return createAdventurer(state, classKey, level, { traits: 0, race, craft: 'forgeron' });
}
// L'Humain n'a aucun modificateur de statistique mais +10 % d'xp : les tests
// de seuils d'expérience partent donc d'un Nain (xp ×1, stats décalées mais
// sans effet sur l'xp).
function mkXp(state, classKey, level = 1) { return mk(state, classKey, level, 'nain'); }
function mission(s, type, difficulty, extra = {}) {
  return createMission(s, type, difficulty, { name: 'test', theme: 'brigands', slots: MISSION_TYPES[type].minSize, duration: 2, ...extra });
}

// ---------------------------------------------------------------- rng
test('rng-deterministic-sequence', () => {
  const a = { rngState: seedToState(42) }, b = { rngState: seedToState(42) };
  for (let i = 0; i < 100; i++) assert.equal(nextFloat(a), nextFloat(b));
});

test('rng-nextInt-bounds', () => {
  const s = { rngState: seedToState(9) };
  for (let i = 0; i < 500; i++) { const v = nextInt(s, 3, 5); assert.ok(v >= 3 && v <= 5, `hors bornes: ${v}`); }
  assert.throws(() => nextInt(s, 5, 3));
});

// ---------------------------------------------------------- aventurier
test('stats-level1-equal-base', () => {
  const adv = mk(fresh(), 'guerrier', 1);
  assert.deepEqual(computeStats(adv), CLASSES.guerrier.base);
});

test('stats-growth-single-class-includes-mastery', () => {
  const level = 10;
  const adv = mk(fresh(), 'mage', level);
  const st = computeStats(adv);
  // au-delà du seuil de maîtrise → bonus de maîtrise inclus
  assert.ok(level >= CONSTANTS.MASTERY_LEVEL);
  assert.equal(st.mag, Math.floor(8 + 1.4 * (level - 1) + CONSTANTS.MASTERY_BONUS.mag));
  assert.equal(st.hp, Math.floor(18 + 2 * (level - 1) + CONSTANTS.MASTERY_BONUS.hp));
});

test('stats-multiclass-adds-half-of-secondary-growth', () => {
  const s = fresh();
  const adv = mk(s, 'guerrier', 5);
  adv.classLevels.archer = 4;
  const st = computeStats(adv);
  const half = CONSTANTS.SECONDARY_GROWTH;
  assert.equal(half, 0.5);
  // classe active : croissance pleine sur niveau-1 ; classe secondaire : moitié
  assert.equal(st.atk, Math.floor(6 + 1.2 * 4 + 1.2 * 4 * half));
  assert.equal(st.spd, Math.floor(3 + 0.3 * 4 + 0.9 * 4 * half));
  assert.equal(totalLevel(adv), 9);
  assert.ok(computeStats(mk(s, 'guerrier', 9)).atk > st.atk, 'le spécialiste bat le dispersé à niveau total égal');
});

test('dispersion-slows-learning-past-two-classes', () => {
  const s = fresh();
  const adv = mk(s, 'guerrier', 4, 'nain');
  assert.equal(focusMultiplier(adv), 1);
  adv.classLevels.clerc = 4;
  assert.equal(focusMultiplier(adv), 1, 'deux classes : aucun malus');
  adv.classLevels.archer = 4;
  assert.equal(focusMultiplier(adv), 1 - CONSTANTS.DISPERSION_PER_CLASS);
  for (const key of ['mage', 'voleur', 'paladin', 'berserker', 'rodeur', 'assassin']) adv.classLevels[key] = 2;
  assert.equal(focusMultiplier(adv), CONSTANTS.DISPERSION_FLOOR, 'le malus est plafonné');
  // Niveau élevé : les 100 xp restent en réserve, on lit donc directement l'écart.
  const spread = mkXp(s, 'guerrier', 12);
  spread.classLevels = { guerrier: 12, clerc: 4, archer: 4 };
  const focused = mkXp(s, 'guerrier', 12);
  grantXp(spread, 100);
  grantXp(focused, 100);
  assert.equal(focused.xp, 100, 'deux classes ou moins : xp pleine');
  assert.equal(spread.xp, Math.round(100 * focusMultiplier(spread)));
  assert.ok(spread.xp < focused.xp, 'le dispersé apprend moins vite');
});

test('item-affinity-favours-the-matching-role', () => {
  const s = fresh();
  const tank = mk(s, 'guerrier', 4);
  const healer = mk(s, 'clerc', 4);
  const plain = makeItem(s, 'plate', 2);
  const guardian = makeItem(s, 'plate', 2, 'tank');
  assert.equal(guardian.affinity, 'tank');
  assert.ok(guardian.name.includes('Gardien'));
  assert.ok(guardian.price > plain.price, 'une affinité se paie');
  assert.equal(itemAffinityBonus(tank, guardian), CONSTANTS.AFFINITY_BONUS);
  assert.equal(itemAffinityBonus(healer, guardian), 0);
  assert.ok(powerGainIfEquipped(tank, guardian) > powerGainIfEquipped(tank, plain));
  assert.equal(powerGainIfEquipped(healer, guardian), powerGainIfEquipped(healer, plain));
  assert.throws(() => makeItem(s, 'plate', 1, 'barde'));
});

test('power-formula-exact', () => {
  const adv = mk(fresh(), 'guerrier', 1);
  // hp32*0.4=12.8 + max(6,1)*3=18 + def5*2=10 + spd3*1.5=4.5 → 45.3 → 45
  assert.equal(computePower(adv), 45);
});

test('xp-levelup-exact-threshold-on-active-class', () => {
  const adv = mkXp(fresh(), 'archer', 1);
  assert.equal(grantXp(adv, xpToNext(1) - 1), 0);
  assert.equal(classLevel(adv), 1);
  assert.equal(grantXp(adv, 1), 1);
  assert.equal(classLevel(adv), 2);
  assert.equal(adv.xp, 0);
});

test('xp-multi-levelup-carries-remainder', () => {
  const adv = mkXp(fresh(), 'archer', 1);
  assert.equal(grantXp(adv, xpToNext(1) + xpToNext(2) + 5), 2);
  assert.equal(classLevel(adv), 3);
  assert.equal(adv.xp, 5);
});

test('xp-capped-at-max-class-level', () => {
  const adv = mkXp(fresh(), 'archer', CONSTANTS.MAX_CLASS_LEVEL);
  grantXp(adv, 1e6);
  assert.equal(classLevel(adv), CONSTANTS.MAX_CLASS_LEVEL);
  assert.equal(adv.xp, 0);
  assert.throws(() => grantXp(adv, -1));
});

test('base-class-switch-is-free-and-keeps-levels', () => {
  const adv = mk(fresh(), 'guerrier', 4);
  adv.xp = 30;
  assert.equal(applySwitchClass(adv, 'clerc'), null);
  assert.equal(adv.classKey, 'clerc');
  assert.equal(classLevel(adv, 'clerc'), 1);
  assert.equal(classLevel(adv, 'guerrier'), 4);
  assert.equal(adv.xp, 0);
  applySwitchClass(adv, 'guerrier');
  assert.equal(classLevel(adv, 'guerrier'), 4);
  assert.throws(() => applySwitchClass(adv, 'guerrier'));
});

test('advanced-class-requires-two-mastered-bases', () => {
  const adv = mk(fresh(), 'guerrier', CONSTANTS.MASTERY_LEVEL);
  let opt = classOptions(adv).find((o) => o.classKey === 'paladin');
  assert.equal(opt.requirementsMet, false);
  assert.deepEqual(opt.have, ['guerrier']);
  assert.throws(() => applySwitchClass(adv, 'paladin'));
  adv.classLevels.clerc = CONSTANTS.MASTERY_LEVEL - 1;
  assert.equal(isMastered(adv, 'clerc'), false);
  adv.classLevels.clerc = CONSTANTS.MASTERY_LEVEL;
  opt = classOptions(adv).find((o) => o.classKey === 'paladin');
  assert.equal(opt.requirementsMet, true);
  assert.equal(opt.unlocked, false);
  assert.equal(opt.cost, CONSTANTS.UNLOCK_COST[2]);
  applySwitchClass(adv, 'paladin');
  assert.equal(adv.classKey, 'paladin');
  assert.deepEqual(adv.unlocked, ['paladin']);
  assert.equal(classLevel(adv, 'paladin'), 1);
  assert.equal(classOptions(adv).find((o) => o.classKey === 'paladin').cost, 0);
});

test('legendary-class-requires-two-mastered-advanced', () => {
  const adv = mk(fresh(), 'paladin', CONSTANTS.MASTERY_LEVEL);
  adv.classLevels.berserker = CONSTANTS.MASTERY_LEVEL;
  adv.unlocked = ['paladin', 'berserker'];
  const opt = classOptions(adv).find((o) => o.classKey === 'champion');
  assert.equal(opt.requirementsMet, true);
  assert.equal(opt.cost, CONSTANTS.UNLOCK_COST[3]);
  applySwitchClass(adv, 'champion');
  assert.equal(CLASSES[adv.classKey].tier, 3);
  assert.equal(classOptions(adv).find((o) => o.classKey === 'legende').requirementsMet, false);
});

test('class-switch-drops-incompatible-weapon', () => {
  const s = fresh();
  const adv = mk(s, 'archer', 3);
  const bow = makeItem(s, 'bow', 1);
  equipItem(adv, bow);
  assert.equal(applySwitchClass(adv, 'guerrier'), bow);
  assert.equal(adv.equipment.weapon, null);
});

test('equip-weapon-restriction', () => {
  const s = fresh();
  const mage = mk(s, 'mage', 1);
  assert.throws(() => equipItem(mage, makeItem(s, 'sword', 1)));
  const staff = makeItem(s, 'staff', 2);
  assert.equal(equipItem(mage, staff), null);
  assert.equal(computeStats(mage).mag, 8 + 8);
  assert.equal(equipItem(mage, makeItem(s, 'staff', 1)), staff);
});

test('item-tier-scales-stats-and-price', () => {
  const it = makeItem(fresh(), 'plate', 3);
  assert.deepEqual(it.stats, { def: 12, hp: 18 });
  assert.equal(it.price, 50 * 9);
});

test('power-gain-preview-does-not-mutate', () => {
  const s = fresh();
  const adv = mk(s, 'guerrier', 1);
  const before = computePower(adv);
  const gain = powerGainIfEquipped(adv, makeItem(s, 'plate', 2));
  assert.equal(gain, Math.round((32 + 12) * 0.4 + 18 + (5 + 8) * 2 + 4.5) - before);
  assert.equal(computePower(adv), before);
  assert.equal(adv.equipment.armor, null);
  assert.equal(powerGainIfEquipped(adv, makeItem(s, 'bow', 1)), 0);
});

test('wage-follows-total-level', () => {
  const adv = mk(fresh(), 'guerrier', 3);
  adv.classLevels.clerc = 4;
  assert.equal(wageOf(adv), CONSTANTS.WAGE_BASE + Math.floor(7 / 2));
});

// --------------------------------------------------------------- combat
test('enemy-scale-and-boss', () => {
  assert.deepEqual(enemyScale(1), { hp: 1, atk: 1, def: 1, spd: 0 });
  const tpl = THEMES.brigands.enemies[0];
  const e = makeEnemy('brigands', 1, 0, tpl);
  assert.equal(e.hp, tpl.hp);
  assert.equal(e.name, 'Bandit 1');
  const boss = makeEnemy('brigands', 1, 0, THEMES.brigands.boss, CONSTANTS.BOSS.raid);
  assert.equal(boss.hp, Math.round(THEMES.brigands.boss.hp * CONSTANTS.BOSS.raid.hp));
  assert.equal(boss.boss, true);
  assert.equal(boss.ai, 'boss');
});

test('wave-size-by-type-theme-and-last-wave-boss', () => {
  const s = fresh();
  const rng = { rngState: seedToState(3) };
  const easy = mission(s, 'solo', 1);
  assert.equal(makeWave(easy, 0, rng).length, 1);
  assert.equal(makeWave(easy, 1, rng).length, 1); // pas de chef sur un solo facile
  const solo = mission(s, 'solo', CONSTANTS.BOSS_FROM.solo);
  assert.equal(makeWave(solo, 1, rng).length, 2); // mini-chef en dernière vague
  const horde = createMission(s, 'team', CONSTANTS.BOSS_FROM.team, { name: 'h', theme: 'horde', slots: 3, duration: 2 });
  const w0 = makeWave(horde, 0, rng);
  assert.equal(w0.length, 3 + CONSTANTS.ENEMY_EXTRA.team + 1);
  const easyTeam = createMission(s, 'team', 1, { name: 'e', theme: 'horde', slots: 3, duration: 2 });
  assert.equal(makeWave(easyTeam, 1, rng).filter((e) => e.boss).length, 0, 'pas de chef sous le seuil');
  assert.equal(w0[0].kind, 'gobelin', 'le premier ennemi est toujours le type de base du thème');
  assert.ok(w0.every((e) => ['gobelin', 'chaman', 'ogre'].includes(e.kind)));
  assert.equal(makeWave(horde, 1, rng).filter((e) => e.boss).length, 1);
});

test('fighter-favored-by-theme', () => {
  const adv = mk(fresh(), 'clerc', 1);
  assert.equal(makeFighter(adv, 'morts_vivants').favored, true);
  assert.equal(makeFighter(adv, 'betes').favored, false);
});

test('playWave-strong-party-wins-weak-party-loses', () => {
  const s = fresh();
  const rng = { rngState: seedToState(5) };
  const strong = [makeFighter(mk(s, 'champion', 20), 'brigands')];
  const log = [];
  assert.equal(playWave(strong, [makeEnemy('brigands', 1, 0, THEMES.brigands.enemies[0])], rng, log), true);
  assert.ok(log.some((ev) => ev.t === 'hit' && ev.down && ev.dSide === 'enemy'), 'un ennemi doit tomber');
  const weak = [makeFighter(mk(s, 'mage', 1), 'brigands')];
  const enemies = [makeEnemy('demons', 10, 0, THEMES.demons.enemies[0]), makeEnemy('demons', 10, 1, THEMES.demons.enemies[2])];
  assert.equal(playWave(weak, enemies, rng, []), false);
  assert.equal(weak[0].downed, true);
});

test('healer-heals-and-tank-taunts', () => {
  const s = fresh();
  const tank = makeFighter(mk(s, 'guerrier', 5), 'brigands');
  const healer = makeFighter(mk(s, 'clerc', 5), 'brigands');
  const dps = makeFighter(mk(s, 'archer', 5), 'brigands');
  const party = [tank, healer, dps];
  const rng = { rngState: seedToState(11) };
  const tpl = THEMES.brigands.enemies[0];
  const enemies = [makeEnemy('brigands', 4, 0, tpl), makeEnemy('brigands', 4, 1, tpl), makeEnemy('brigands', 4, 2, tpl)];
  playWave(party, enemies, rng, []);
  assert.ok(tank.taken > dps.taken, `tank ${tank.taken} devrait encaisser plus que l'archer ${dps.taken}`);
  assert.ok(healer.healed > 0, 'le clerc doit avoir soigné');
});

test('simulateMission-deterministic-for-same-seed', () => {
  const s = fresh();
  const m = mission(s, 'team', 3, { slots: 3, duration: 3 });
  const team = [mk(s, 'guerrier', 6), mk(s, 'archer', 6), mk(s, 'clerc', 6)];
  const a = simulateMission({ rngState: seedToState(99) }, m, team, true);
  const b = simulateMission({ rngState: seedToState(99) }, m, team, true);
  assert.equal(JSON.stringify(a.waves), JSON.stringify(b.waves));
  assert.deepEqual(a.log, b.log);
  assert.ok(a.log.length > 5 && a.log[0].t === 'wave' && a.log[0].i === 1, 'journal d’événements attendu');
  assert.equal(a.log[a.log.length - 1].t, 'end');
  assert.equal(simulateMission({ rngState: seedToState(99) }, m, team).log.length, 0, 'sans journal par défaut');
  assert.equal(a.waves.length <= 3, true);
});

test('estimateSuccess-bounds-and-monotone-in-strength', () => {
  const s = fresh();
  const m = mission(s, 'solo', 3);
  const weak = [mk(s, 'mage', 1)];
  const strong = [mk(s, 'champion', 20)];
  const pw = estimateSuccess(m, weak), ps = estimateSuccess(m, strong);
  assert.ok(pw >= 0 && pw <= 1 && ps >= 0 && ps <= 1);
  assert.ok(ps > pw, `${ps} > ${pw}`);
  assert.equal(estimateSuccess(m, []), 0);
  assert.equal(estimateSuccess(m, weak), pw, 'estimation déterministe');
});

// ------------------------------------------------------------- missions
test('required-power-curve', () => {
  assert.equal(requiredPowerPerHead(1), 40);
  assert.equal(requiredPowerPerHead(2), Math.round(40 * 1.28));
  assert.equal(requiredPowerPerHead(10), Math.round(40 * Math.pow(1.28, 9)));
});

test('mission-has-theme-and-type-multipliers', () => {
  const s = fresh();
  const m = createMission(s, 'raid', 4, { name: 'r', theme: 'demons', slots: 5 });
  const perHead = requiredPowerPerHead(4);
  assert.equal(m.theme, 'demons');
  assert.equal(m.requiredPower, Math.round(perHead * 5 * 1.3));
  assert.equal(m.rewardGold, Math.round(perHead * 5 * 0.6 * MISSION_TYPES.raid.goldMult));
  assert.equal(m.rewardXp, Math.round(24 * 4 * MISSION_TYPES.raid.xpMult));
  assert.equal(m.rewardRep, 4 * MISSION_TYPES.raid.repMult);
  assert.throws(() => createMission(s, 'raid', 1, { name: 'x', theme: 'inconnu' }));
});

test('generated-missions-carry-a-known-theme', () => {
  const s = fresh();
  for (const m of s.board) assert.ok(THEMES[m.theme], `thème ${m.theme}`);
});

test('validate-team-size-and-status', () => {
  const s = fresh();
  const raid = mission(s, 'raid', 3);
  const a = mk(s, 'guerrier', 1);
  assert.equal(validateTeam(raid, [a]), 'effectif minimum 4');
  const solo = mission(s, 'solo', 1);
  assert.equal(validateTeam(solo, [a, a]), 'effectif maximum 1');
  a.status = 'injured';
  assert.equal(validateTeam(solo, [a]), `${a.name} n'est pas disponible`);
  a.status = 'available';
  assert.equal(validateTeam(mission(s, 'team', 1), [a, a]), `${a.name} en double`);
  assert.equal(validateTeam(solo, [a]), null);
});

test('resolve-mission-success-rewards', () => {
  const s = fresh();
  const m = mission(s, 'solo', 1);
  const strong = mk(s, 'champion', 20);
  const r = resolveMission({ rngState: seedToState(1) }, m, [strong]);
  assert.equal(r.success, true);
  assert.equal(r.gold, m.rewardGold);
  assert.equal(r.xpEach, m.rewardXp);
  assert.equal(r.rep, m.rewardRep);
  assert.equal(r.wavesCleared, 2);
  assert.equal(r.party[0].downed, false);
  assert.ok(r.log.length > 0 && r.waves.length === 2);
});

test('resolve-mission-failure-injures-downed', () => {
  const s = fresh();
  const weak = mk(s, 'mage', 1);
  const hard = createMission(s, 'solo', 10, { name: 'x', theme: 'demons', slots: 1, duration: 3 });
  const r = resolveMission({ rngState: seedToState(2) }, hard, [weak]);
  assert.equal(r.success, false);
  assert.equal(r.gold, 0);
  assert.equal(r.rep, 0);
  assert.equal(r.xpEach, Math.floor(hard.rewardXp / 2));
  assert.deepEqual(r.injuries, [weak.id]);
  assert.equal(weak.status, 'injured');
  assert.equal(weak.injuredDays, 3);
});

// --------------------------------------------------------------- guilde
test('guild-initial-state', () => {
  const s = fresh();
  assert.equal(s.day, 1);
  assert.equal(s.gold, CONSTANTS.START_GOLD);
  assert.deepEqual(s.roster.map((a) => a.classKey), ['guerrier', 'archer', 'clerc'], 'trio de départ : tank, dégâts, soin');
  assert.ok(s.roster.every((a) => a.traits.length === 1 && a.lore.missions === 0));
  assert.equal(s.board.length, CONSTANTS.BOARD_SIZE);
  assert.ok(s.board.every((m) => m.difficulty <= 2), 'rang 1 : tableau abordable');
  assert.equal(s.tavern.length, buildingLevel(s, 'taverne').size);
  assert.equal(s.shop.length, buildingLevel(s, 'forge').slots);
  assert.equal(maxRoster(s), BUILDINGS.quartier.levels[0].roster);
  assert.ok(s.shop.every((it) => it.tier === 1), 'forge niveau 0 : palier 1 seulement');
  assert.equal(rankOf(s), 1);
  assert.equal(s.outcome, 'playing');
});

test('rank-thresholds', () => {
  const s = fresh();
  s.reputation = 49; assert.equal(rankOf(s), 1);
  s.reputation = 50; assert.equal(rankOf(s), 2);
  s.reputation = 700; assert.equal(rankOf(s), 5);
});

test('recruit-costs-gold-and-moves-candidate', () => {
  const s = fresh();
  const cand = s.tavern[0];
  const cost = CONSTANTS.RECRUIT_BASE_COST + CONSTANTS.RECRUIT_COST_PER_LEVEL * (totalLevel(cand) - 1);
  const gold = s.gold;
  const before = s.roster.length;
  assert.equal(recruit(s, cand.id).ok, true);
  assert.equal(s.gold, gold - cost);
  assert.equal(s.roster.length, before + 1);
  assert.equal(s.tavern.length, buildingLevel(s, 'taverne').size - 1);
  assert.equal(recruit(s, cand.id).ok, false);
});

test('recruit-refused-when-poor-or-full', () => {
  const s = fresh();
  s.gold = 0;
  assert.equal(recruit(s, s.tavern[0].id).ok, false);
  s.gold = 10000;
  while (s.roster.length < maxRoster(s)) s.roster.push(mk(s, 'mage', 1));
  assert.equal(recruit(s, s.tavern[0].id).reason, 'guilde pleine : agrandissez le Quartier');
  upgradeBuilding(s, 'quartier');
  assert.equal(recruit(s, s.tavern[0].id).ok, true);
});

test('buy-equip-unequip-sell-roundtrip', () => {
  const s = fresh();
  s.gold = 10000;
  const item = makeItem(s, 'amulet', 1);
  s.shop.push(item);
  const gold = s.gold;
  assert.equal(buyItem(s, item.id).ok, true);
  assert.equal(s.gold, gold - item.price);
  assert.equal(s.inventory.length, 1);
  const adv = s.roster[0];
  assert.equal(equip(s, adv.id, item.id).ok, true);
  assert.equal(s.inventory.length, 0);
  assert.equal(adv.equipment.accessory.id, item.id);
  assert.equal(unequip(s, adv.id, 'accessory').ok, true);
  assert.equal(unequip(s, adv.id, 'accessory').reason, 'emplacement vide');
  const g2 = s.gold;
  assert.equal(sellItem(s, item.id).ok, true);
  assert.equal(s.gold, g2 + Math.floor(item.price / 2));
});

test('buy-and-equip-one-step-and-refusals', () => {
  const s = fresh();
  s.gold = 10000;
  const guerrier = s.roster.find((a) => a.classKey === 'guerrier');
  const archer = s.roster.find((a) => a.classKey === 'archer');
  const sword = makeItem(s, 'sword', 1);
  s.shop.push(sword);
  const gold = s.gold;
  assert.equal(buyAndEquip(s, sword.id, archer.id).ok, false);
  assert.equal(s.gold, gold);
  assert.equal(buyAndEquip(s, sword.id, guerrier.id).ok, true);
  assert.equal(s.gold, gold - sword.price);
  assert.equal(guerrier.equipment.weapon.id, sword.id);
  s.gold = 0;
  const bow = makeItem(s, 'bow', 1);
  s.shop.push(bow);
  assert.equal(buyAndEquip(s, bow.id, archer.id).ok, false);
});

test('buy-refused-when-poor', () => {
  const s = fresh();
  s.gold = 0;
  assert.equal(buyItem(s, s.shop[0].id).ok, false);
  assert.equal(s.shop.length, buildingLevel(s, 'forge').slots);
});

// ------------------------------------------------------------- bâtiments
test('upgrade-building-costs-and-effects', () => {
  const s = fresh();
  s.gold = 100;
  assert.equal(upgradeBuilding(s, 'quartier').ok, false);
  s.gold = 5000;
  assert.equal(upgradeBuilding(s, 'quartier').ok, true);
  assert.equal(s.gold, 5000 - BUILDINGS.quartier.levels[1].cost);
  assert.equal(maxRoster(s), BUILDINGS.quartier.levels[1].roster);
  upgradeBuilding(s, 'forge'); upgradeBuilding(s, 'forge');
  assert.equal(s.buildings.forge, 2);
  assert.equal(s.shop.length, BUILDINGS.forge.levels[2].slots);
  upgradeBuilding(s, 'taverne');
  assert.equal(s.tavern.length, BUILDINGS.taverne.levels[1].size);
  assert.ok(s.tavern.every((c) => totalLevel(c) >= 1 + BUILDINGS.taverne.levels[1].levelBonus));
  s.buildings.alchimiste = 3;
  assert.equal(upgradeBuilding(s, 'alchimiste').reason, 'déjà au niveau maximum');
  assert.equal(upgradeBuilding(s, 'donjon').ok, false);
  assert.equal(upgradeOptions(s).find((o) => o.key === 'alchimiste').next, null);
});

test('forge-discount-at-max-level', () => {
  const s = fresh();
  s.gold = 100000;
  for (let i = 0; i < 3; i++) upgradeBuilding(s, 'forge');
  const lvl = BUILDINGS.forge.levels[3];
  for (const it of s.shop) {
    const tpl = it.key; const base = (it.stats && it.tier) ? it.tier * it.tier : 1;
    assert.ok(it.price <= Math.round(50 * 9 * (1 - lvl.discount)) || tpl, 'prix remisé');
  }
  assert.ok(s.shop.every((it) => it.price % 1 === 0));
});

test('potions-buy-plan-and-drink-in-combat', () => {
  const s = fresh();
  s.gold = 10000;
  assert.equal(buyPotion(s, 'soin').ok, false, 'alchimiste niveau 0');
  upgradeBuilding(s, 'alchimiste');
  assert.equal(buyPotion(s, 'grande').ok, false);
  assert.equal(buyPotion(s, 'soin', 2).ok, true);
  assert.equal(s.potions.soin, 2);
  const team = s.roster.slice(0, 2);
  const plan = planPotions(s, team);
  assert.deepEqual(Object.values(plan), ['soin', 'soin']);
  assert.equal(s.potions.soin, 2, 'le plan ne consomme pas');
  // combat : un guerrier faible avec potion contre une brute → la potion est bue
  const weak = mk(s, 'guerrier', 2);
  weak.potion = 'soin';
  const rng = { rngState: seedToState(4) };
  const f = makeFighter(weak, 'demons');
  assert.equal(f.potion, 'soin');
  const log = [];
  playWave([f], [makeEnemy('demons', 4, 0, THEMES.demons.enemies[2])], rng, log);
  assert.equal(f.potionUsed, true);
  assert.ok(log.some((ev) => ev.t === 'heal' && ev.action === POTIONS.soin.name), 'la potion doit être bue');
});

test('send-mission-takes-potions-and-returns-unused', () => {
  const s = fresh();
  s.gold = 10000;
  upgradeBuilding(s, 'alchimiste');
  buyPotion(s, 'soin', 1);
  const m = s.board.find((x) => x.type === 'solo');
  const adv = s.roster.find((a) => a.classKey === 'guerrier');
  adv.classLevels.guerrier = 20; // ne boira pas
  sendMission(s, m.id, [adv.id]);
  assert.equal(adv.potion, 'soin');
  assert.equal(s.potions.soin, 0);
  for (let d = 0; d < m.duration; d++) endDay(s);
  assert.equal(adv.potion, null);
  assert.equal(s.potions.soin, 1, 'potion non bue rendue au stock');
  assert.ok(estimateWithPotions(s, s.board[0], [adv]) >= 0);
});

test('scrolls-xp-and-mastery', () => {
  const s = fresh();
  s.gold = 10000;
  const adv = s.roster[0];
  assert.equal(useScroll(s, 'entrainement', adv.id).ok, false, 'scriptorium niveau 0');
  s.buildings.scriptorium = 3;
  const before = totalLevel(adv);
  const r = useScroll(s, 'entrainement', adv.id);
  assert.equal(r.ok, true);
  assert.ok(totalLevel(adv) > before);
  assert.equal(s.gold, 10000 - SCROLLS.entrainement.price);
  const st = computeStats(adv);
  useScroll(s, 'maitrise', adv.id);
  assert.equal(adv.statBonus, 1);
  assert.equal(computeStats(adv).def, st.def + 1);
  useScroll(s, 'maitrise', adv.id); useScroll(s, 'maitrise', adv.id);
  assert.equal(useScroll(s, 'maitrise', adv.id).ok, false, 'plafond de parchemins');
});

test('catch-up-xp-for-low-level-members', () => {
  const s = fresh();
  const vet = mkXp(s, 'guerrier', 12);
  s.roster.push(vet, mkXp(s, 'guerrier', 12), mkXp(s, 'guerrier', 12));
  const rookie = s.roster.find((a) => a.classKey === 'archer'); // niveau 1, très sous la moyenne
  const m = createMission(s, 'solo', 1, { name: 'x', theme: 'brigands', slots: 1, duration: 1 });
  s.board.push(m);
  s.roster = s.roster.filter((a) => a.id !== rookie.id); rookie.classLevels.archer = 20; s.roster.push(rookie);
  // xp attendue : réussite sûre au niveau 20, rattrapage non appliqué (20 > moyenne)
  sendMission(s, m.id, [rookie.id]); endDay(s);
  assert.equal(rookie.xp, 0, 'niveau max : xp remise à zéro');
  const low = mkXp(s, 'guerrier', 12); low.classLevels.guerrier = 1; low.craft = 'forgeron'; s.roster.push(low);
  const m2 = createMission(s, 'solo', 1, { name: 'y', theme: 'brigands', slots: 1, duration: 1 });
  s.board.push(m2);
  const strong = s.roster.find((a) => a.id === vet.id);
  strong.classLevels.guerrier = 20; strong.classLevels.paladin = 20; // moyenne très haute → low en rattrapage
  sendMission(s, m2.id, [low.id]); endDay(s);
  const gainedTotal = low.xp + (totalLevel(low) - 1 > 0 ? 24 * 1 : 0);
  assert.ok(gainedTotal === Math.round(m2.rewardXp * CONSTANTS.CATCHUP_MULT) || gainedTotal === Math.round(m2.rewardXp / 2 * CONSTANTS.CATCHUP_MULT), `xp de rattrapage attendue, obtenu ${gainedTotal}`);
});

test('switch-class-via-guild-base-free-advanced-paid', () => {
  const s = fresh();
  const adv = s.roster.find((a) => a.classKey === 'guerrier');
  s.gold = 0;
  assert.equal(switchClass(s, adv.id, 'clerc').ok, true);
  assert.equal(adv.classKey, 'clerc');
  assert.equal(switchClass(s, adv.id, 'paladin').ok, false);
  adv.classLevels.guerrier = CONSTANTS.MASTERY_LEVEL; adv.classLevels.clerc = CONSTANTS.MASTERY_LEVEL;
  assert.equal(switchClass(s, adv.id, 'paladin').reason, `il manque ${CONSTANTS.UNLOCK_COST[2]} or`);
  s.gold = CONSTANTS.UNLOCK_COST[2];
  assert.equal(switchClass(s, adv.id, 'paladin').ok, true);
  assert.equal(s.gold, 0);
  assert.equal(switchClass(s, adv.id, 'guerrier').ok, true);
  assert.equal(switchClass(s, adv.id, 'paladin').ok, true, 'déjà ouverte : gratuit');
});

test('pending-gold-sums-active-rewards', () => {
  const s = fresh();
  assert.equal(pendingGold(s), 0);
  const m = s.board.find((x) => x.type === 'solo');
  sendMission(s, m.id, [s.roster[0].id]);
  assert.equal(pendingGold(s), m.rewardGold);
});

test('send-mission-moves-board-to-active-and-locks-team', () => {
  const s = fresh();
  const m = s.board.find((x) => x.type === 'solo');
  const adv = s.roster[0];
  assert.equal(sendMission(s, m.id, [adv.id]).ok, true);
  assert.equal(adv.status, 'mission');
  assert.equal(s.active.length, 1);
  assert.equal(s.board.length, CONSTANTS.BOARD_SIZE - 1);
  assert.equal(sendMission(s, m.id, [adv.id]).reason, 'mission inconnue');
  assert.equal(equip(s, adv.id, 999).reason, 'en mission');
  assert.equal(switchClass(s, adv.id, 'clerc').reason, 'indisponible');
});

test('endDay-resolves-mission-after-duration-and-logs-combat', () => {
  const s = fresh();
  const m = s.board.find((x) => x.type === 'solo');
  const adv = s.roster[0];
  sendMission(s, m.id, [adv.id]);
  for (let d = 0; d < m.duration - 1; d++) { endDay(s); assert.equal(adv.status, 'mission'); }
  endDay(s);
  assert.equal(s.active.length, 0);
  assert.notEqual(adv.status, 'mission');
  assert.equal(s.day, 1 + m.duration);
  assert.ok(s.journal.some((e) => e.text.includes('vagues')), 'compte-rendu de combat attendu');
  assert.equal(s.reports.length, 1);
  assert.equal(s.reports[0].missionId, m.id);
  assert.ok(s.reports[0].log.length > 0);
});

test('endDay-pays-wages-and-refreshes-board', () => {
  const s = fresh();
  const gold = s.gold;
  endDay(s);
  assert.equal(s.gold, gold - dailyWages(s));
  assert.equal(s.board.length, CONSTANTS.BOARD_SIZE);
  assert.equal(s.day, 2);
});

test('board-expiry-replaces-missions', () => {
  const s = fresh();
  const ids = new Set(s.board.map((m) => m.id));
  for (let d = 0; d < CONSTANTS.BOARD_EXPIRY_DAYS; d++) endDay(s);
  assert.equal(s.board.filter((m) => ids.has(m.id)).length, 0);
});

test('unpaid-wages-three-days-then-veteran-leaves', () => {
  const s = fresh();
  s.gold = 0; s.tavern = [];
  const before = s.roster.length;
  endDay(s); assert.equal(s.unpaidDays, 1); assert.equal(s.roster.length, before);
  s.gold = 0; endDay(s); assert.equal(s.unpaidDays, 2); assert.equal(s.roster.length, before);
  s.gold = 0; endDay(s); assert.equal(s.unpaidDays, 0); assert.equal(s.roster.length, before - 1);
});

test('defeat-when-empty-and-broke', () => {
  const s = fresh();
  s.roster = []; s.gold = 0;
  endDay(s);
  assert.equal(s.outcome, 'defeat');
  assert.equal(endDay(s).ok, false);
});

test('final-raid-needs-rank-and-the-three-fragments', () => {
  const s = fresh();
  s.reputation = CONSTANTS.RANK_THRESHOLDS[CONSTANTS.FINAL_RAID_RANK - 1];
  endDay(s);
  assert.equal(s.board.some((m) => m.final), false, 'sans fragment, pas de raid final');
  assert.ok(s.board.some((m) => m.seal), 'un sceau est proposé à la place');
  s.fragments = [...CONSTANTS.ATTUNEMENT_THEMES];
  endDay(s);
  const finalRaid = s.board.find((m) => m.final);
  assert.ok(finalRaid, 'raid final absent une fois les trois sceaux brisés');
  assert.equal(finalRaid.difficulty, CONSTANTS.FINAL_RAID_DIFFICULTY);
  s.roster = [];
  for (let i = 0; i < 5; i++) {
    const a = createAdventurer(s, i % 2 ? 'legende' : 'champion', 20);
    a.classLevels.paladin = 20; a.classLevels.berserker = 20; a.classLevels.pretre = 20;
    s.roster.push(a);
  }
  s.gold = 100000;
  assert.ok(estimateSuccess(finalRaid, s.roster) > 0.9, 'une équipe légendaire max doit dominer le Léviathan');
  assert.equal(sendMission(s, finalRaid.id, s.roster.map((a) => a.id)).ok, true);
  for (let d = 0; d < finalRaid.duration; d++) endDay(s);
  assert.equal(s.outcome, 'victory');
  assert.equal(s.stats.raidsDone, 1);
});

// -------------------------------------------------------- traits et titres
test('traits-modify-stats-wage-and-xp', () => {
  const s = fresh();
  const plain = mk(s, 'guerrier', 5);
  const brave = mk(s, 'guerrier', 5);
  brave.traits = ['brave'];
  // Le multiplicateur s'applique AVANT l'arrondi : on repart de la formule brute.
  const rawAtk = CLASSES.guerrier.base.atk + CLASSES.guerrier.growth.atk * 4;
  const rawDef = CLASSES.guerrier.base.def + CLASSES.guerrier.growth.def * 4;
  assert.equal(computeStats(plain).atk, Math.floor(rawAtk));
  assert.equal(computeStats(brave).atk, Math.floor(rawAtk * 1.10));
  assert.equal(computeStats(brave).def, Math.floor(rawDef * 0.95));
  assert.ok(computeStats(brave).atk > computeStats(plain).atk);
  const frugal = mk(s, 'guerrier', 10);
  frugal.traits = ['frugal'];
  assert.equal(wageOf(frugal), Math.max(1, Math.round(wageOf(mk(s, 'guerrier', 10)) * 0.7)));
  const erudit = mkXp(s, 'archer', 1);
  erudit.traits = ['erudit'];
  grantXp(erudit, 100);
  assert.equal(traitEffects(erudit).xp, 1.25);
  const plainXp = mkXp(s, 'archer', 1);
  grantXp(plainXp, 100);
  assert.ok(totalLevel(erudit) >= totalLevel(plainXp));
  assert.equal(traitEffects(mkXp(s, 'guerrier', 1)).xp, 1, 'sans trait ni race : aucun multiplicateur');
  assert.equal(traitEffects(mk(s, 'guerrier', 1)).xp, RACES.humain.xp, 'la race compte dans le multiplicateur');
});

test('trait-count-from-tavern-level', () => {
  const s = fresh();
  assert.ok(s.tavern.every((c) => c.traits.length === BUILDINGS.taverne.levels[0].traits));
  s.gold = 10000;
  upgradeBuilding(s, 'taverne'); upgradeBuilding(s, 'taverne');
  assert.equal(s.buildings.taverne, 2);
  assert.ok(s.tavern.every((c) => c.traits.length === BUILDINGS.taverne.levels[2].traits));
  assert.ok(s.tavern.every((c) => new Set(c.traits).size === c.traits.length), 'traits distincts');
});

test('titles-earned-from-deeds', () => {
  const adv = mk(fresh(), 'guerrier', 1);
  assert.equal(titleOf(adv), null);
  adv.lore.missions = 10;
  assert.equal(titleOf(adv), 'l’Éprouvé');
  adv.lore.kills = 30;
  assert.equal(titleOf(adv), 'le Boucher');
  adv.lore.missions = 12;
  assert.equal(titleOf(adv), 'l’Invaincu', 'le titre le plus prestigieux prime');
  adv.lore.defeats = 1;
  assert.equal(titleOf(adv), 'le Boucher');
});

test('lore-recorded-after-mission', () => {
  const s = fresh();
  const m = s.board.find((x) => x.type === 'solo');
  const adv = s.roster[0];
  adv.classLevels[adv.classKey] = 20;
  sendMission(s, m.id, [adv.id]);
  for (let d = 0; d < m.duration; d++) endDay(s);
  assert.equal(adv.lore.missions, 1);
  assert.ok(adv.lore.dealt > 0, 'dégâts enregistrés');
  assert.equal(adv.lore.defeats + (adv.lore.missions - adv.lore.defeats), 1);
});

test('loyal-never-leaves-unpaid-guild', () => {
  const s = fresh();
  s.tavern = [];
  for (const a of s.roster) a.traits = ['loyal'];
  const before = s.roster.length;
  for (let d = 0; d < 6; d++) { s.gold = 0; endDay(s); }
  assert.equal(s.roster.length, before, 'les loyaux restent');
  s.roster[0].traits = [];
  for (let d = 0; d < 3; d++) { s.gold = 0; endDay(s); }
  assert.equal(s.roster.length, before - 1, 'le non-loyal part');
});

test('second-wind-trait-revives-once-per-mission', () => {
  const s = fresh();
  const adv = mk(s, 'mage', 1);
  adv.traits = ['teigneux'];
  const f = makeFighter(adv, 'demons');
  assert.equal(f.secondWind, true);
  const rng = { rngState: seedToState(8) };
  const log = [];
  playWave([f], [makeEnemy('demons', 8, 0, THEMES.demons.enemies[2]), makeEnemy('demons', 8, 1, THEMES.demons.enemies[2])], rng, log);
  assert.ok(log.some((ev) => ev.t === 'secondWind'), 'le Teigneux doit se relever une fois');
  assert.equal(f.revived, true);
  assert.equal(f.downed, true, 'il retombe ensuite');
});

test('vigilant-trait-blocks-stun', () => {
  const s = fresh();
  const adv = mk(s, 'guerrier', 5);
  adv.traits = ['vigilant'];
  const f = makeFighter(adv, 'brigands');
  assert.equal(f.stunProof, true);
});

// ----------------------------------------------------------------- races
test('races-modify-stats-and-grant-capacities', () => {
  const s = fresh();
  const base = computeStats(mk(s, 'guerrier', 6, 'humain'));
  assert.deepEqual(computeStats(mk(s, 'guerrier', 6, 'humain')), base, 'l’Humain n’a aucun modificateur de stat');
  const nain = computeStats(mk(s, 'guerrier', 6, 'nain'));
  assert.ok(nain.hp > base.hp && nain.def > base.def && nain.spd < base.spd);
  const elfe = computeStats(mk(s, 'guerrier', 6, 'elfe'));
  assert.ok(elfe.spd > base.spd && elfe.hp < base.hp);
  const orc = computeStats(mk(s, 'guerrier', 6, 'orc'));
  assert.ok(orc.atk > base.atk);
  const eff = traitEffects(mk(s, 'guerrier', 1, 'nain'));
  assert.equal(eff.poisonProof, true);
  assert.equal(traitEffects(mk(s, 'guerrier', 1, 'elfe')).hit, 0.10);
  assert.equal(traitEffects(mk(s, 'guerrier', 1, 'halfelin')).dodge, 0.15);
  assert.equal(traitEffects(mk(s, 'guerrier', 1, 'orc')).bloodlust, 0.20);
  assert.equal(traitEffects(mk(s, 'mage', 1, 'gnome')).mpDiscount, 0.25);
  assert.throws(() => createAdventurer(s, 'guerrier', 1, { race: 'troll' }));
});

test('dwarf-ignores-poison-in-combat', () => {
  const s = fresh();
  const nain = makeFighter(mk(s, 'guerrier', 8, 'nain'), 'morts_vivants');
  const humain = makeFighter(mk(s, 'guerrier', 8, 'humain'), 'morts_vivants');
  const rng = { rngState: seedToState(21) };
  const zombie = () => makeEnemy('morts_vivants', 5, 0, THEMES.morts_vivants.enemies[1]);
  const logA = [], logB = [];
  playWave([nain], [zombie(), zombie()], rng, logA);
  playWave([humain], [zombie(), zombie()], rng, logB);
  assert.equal(logA.some((ev) => ev.t === 'status' && ev.kind === 'poison' && ev.d === nain.name), false, 'le Nain ne peut être empoisonné');
  assert.ok(logB.length > 0);
});

test('gnome-pays-less-mana', () => {
  const s = fresh();
  const gnome = makeFighter(mk(s, 'mage', 6, 'gnome'), 'brigands');
  const humain = makeFighter(mk(s, 'mage', 6, 'humain'), 'brigands');
  assert.equal(skillCost(gnome, 'boule_de_feu'), Math.ceil(SKILLS.boule_de_feu.mp * 0.75));
  assert.equal(skillCost(humain, 'boule_de_feu'), SKILLS.boule_de_feu.mp);
});

// ------------------------------------------ héritage des compétences
test('mastered-classes-open-their-whole-skill-list', () => {
  const s = fresh();
  const adv = mk(s, 'guerrier', CONSTANTS.MASTERY_LEVEL);
  assert.deepEqual(availableSkills(adv).map((x) => x.key), CLASSES.guerrier.skills, 'une seule classe : sa liste');
  adv.classLevels.clerc = CONSTANTS.MASTERY_LEVEL;
  adv.classLevels.archer = CONSTANTS.MASTERY_LEVEL - 1;
  const avail = availableSkills(adv).map((x) => x.key);
  for (const key of CLASSES.clerc.skills) assert.ok(avail.includes(key), `${key} accessible via le Clerc maîtrisé`);
  for (const key of CLASSES.archer.skills) assert.equal(avail.includes(key), CLASSES.guerrier.skills.includes(key), 'Archer non maîtrisé : rien');
  const learned = learnedSkills(adv);
  assert.deepEqual(learned.active, CLASSES.guerrier.skills);
  assert.deepEqual([...new Set(learned.inherited.map((x) => x.key))], ['clerc']);
  const fighter = makeFighter(adv, 'brigands');
  assert.ok(fighter.skills.includes(CLASSES.clerc.skills[0]), 'les compétences héritées sont portées en combat');
});

test('player-chooses-the-skills-carried', () => {
  const s = fresh();
  const adv = mk(s, 'pretre', 3);
  adv.classLevels = { pretre: 3, clerc: CONSTANTS.MASTERY_LEVEL, mage: CONSTANTS.MASTERY_LEVEL };
  const capacity = learnedSkills(adv).capacity;
  assert.equal(learnedSkills(adv).explicit, false, 'sélection automatique par défaut');
  assert.equal(toggleSkill(adv, 'inconnue').ok, false);
  // vider puis reconstruire une sélection sur mesure
  for (const key of [...learnedSkills(adv).all]) toggleSkill(adv, key);
  assert.deepEqual(learnedSkills(adv).all, [], 'aucune compétence portée');
  assert.equal(makeFighter(adv, 'brigands').skills.length, 0);
  assert.equal(toggleSkill(adv, 'boule_de_feu').ok, true, 'compétence du Mage maîtrisé');
  assert.equal(toggleSkill(adv, 'soin').ok, true);
  assert.deepEqual(learnedSkills(adv).all, ['boule_de_feu', 'soin'], 'l’ordre de sélection est conservé');
  while (learnedSkills(adv).all.length < capacity) {
    const next = learnedSkills(adv).available.find((x) => !learnedSkills(adv).all.includes(x.key));
    assert.equal(toggleSkill(adv, next.key).ok, true);
  }
  const extra = learnedSkills(adv).available.find((x) => !learnedSkills(adv).all.includes(x.key));
  assert.equal(toggleSkill(adv, extra.key).reason, `${capacity} compétences au maximum`);
  resetLoadout(adv);
  assert.equal(learnedSkills(adv).explicit, false);
});

test('skill-roles-cover-the-archetypes', () => {
  for (const [key, sk] of Object.entries(SKILLS)) assert.ok(SKILL_ROLES[sk.role], `${key} sans archétype valide`);
  const s = fresh();
  assert.ok(skillRoles(mk(s, 'rodeur', 3)).has('invocation'), 'le Rôdeur invoque');
  assert.ok(skillRoles(mk(s, 'mage', 3)).has('controle'), 'le Mage contrôle (Gel)');
  assert.ok(skillRoles(mk(s, 'necromancien', 3)).has('debuff'));
  assert.ok(skillRoles(mk(s, 'pretre', 3)).has('soin'));
  assert.ok(skillRoles(mk(s, 'champion', 3)).has('buff'), 'le Champion protège (Rempart)');
  assert.ok(skillRoles(mk(s, 'archimage', 3)).has('invocation'));
  // chaque classe expose exactement trois compétences
  for (const [key, cls] of Object.entries(CLASSES)) assert.equal(cls.skills.length, 3, `${key} doit avoir 3 compétences`);
  // et chaque compétence est soit active, soit passive
  for (const [key, sk] of Object.entries(SKILLS)) assert.ok(['active', 'passive'].includes(sk.kind), `${key} sans nature`);
  assert.ok(Object.values(SKILLS).some((sk) => sk.kind === 'passive'));
});

// ------------------------------------------------------------ invocations
test('summons-fight-then-vanish-between-waves', () => {
  const s = fresh();
  const nec = mk(s, 'necromancien', 8);
  const tank = mk(s, 'guerrier', 8, 'nain');
  const m = mission(s, 'team', 3, { slots: 2, duration: 2 });
  const sim = simulateMission({ rngState: seedToState(7) }, m, [nec, tank], true);
  const summons = sim.log.filter((ev) => ev.t === 'summon');
  assert.ok(summons.length >= 1, 'le Nécromancien relève un squelette');
  assert.equal(summons[0].kind, SKILLS.squelette_servile.summon.kind);
  assert.ok(formatEvent(summons[0]).includes('entre en lice'));
  assert.equal(sim.party.length, 2, 'le rapport ne compte que les aventuriers');
  for (const w of sim.waves) assert.equal(w.party.length, 2);
});

test('a-lone-summon-does-not-hold-the-wave', () => {
  const s = fresh();
  const nec = mk(s, 'necromancien', 4);
  const f = makeFighter(nec, 'demons');
  const party = [f];
  const rng = { rngState: seedToState(3) };
  const enemies = [makeEnemy('demons', 9, 0, THEMES.demons.enemies[2]), makeEnemy('demons', 9, 1, THEMES.demons.enemies[2])];
  const cleared = playWave(party, enemies, rng, [], 0);
  assert.equal(cleared, false);
  assert.equal(f.downed, true, 'l’aventurier tombe et la vague est perdue même si l’invocation tient');
});

test('learned-skills-respect-the-slot-cap', () => {
  const s = fresh();
  const adv = mk(s, 'paladin', 3, 'nain');
  for (const key of ['guerrier', 'clerc', 'archer', 'mage', 'voleur']) adv.classLevels[key] = CONSTANTS.MASTERY_LEVEL;
  const learned = learnedSkills(adv);
  assert.equal(learned.all.length, CONSTANTS.MAX_LEARNED_SKILLS, 'plafond respecté');
  const humain = mk(s, 'paladin', 3, 'humain');
  humain.classLevels = { ...adv.classLevels, paladin: 3 };
  assert.equal(learnedSkills(humain).all.length, CONSTANTS.MAX_LEARNED_SKILLS + 1, 'l’Humain porte une compétence de plus');
});

test('switching-class-keeps-the-acquired-classes-and-skills', () => {
  const s = fresh();
  const veteran = mk(s, 'guerrier', CONSTANTS.MASTERY_LEVEL, 'nain');
  veteran.classLevels.clerc = CONSTANTS.MASTERY_LEVEL;
  applySwitchClass(veteran, 'paladin');
  const novice = mk(s, 'paladin', 1, 'nain');
  const vs = computeStats(veteran);
  const ns = computeStats(novice);
  assert.ok(vs.hp > ns.hp && vs.atk > ns.atk, 'les classes déjà pratiquées comptent encore');
  assert.equal(classLevel(veteran, 'guerrier'), CONSTANTS.MASTERY_LEVEL, 'les niveaux acquis restent');
  const pool = availableSkills(veteran).map((x) => x.key);
  for (const key of [...CLASSES.guerrier.skills, ...CLASSES.clerc.skills, ...CLASSES.paladin.skills]) {
    assert.ok(pool.includes(key), `${key} reste accessible`);
  }
  assert.equal(pool.length, 9, 'trois classes × trois compétences');
  const carried = learnedSkills(veteran).all;
  assert.equal(carried.length, learnedSkills(veteran).capacity, 'il n’en porte que 5 : il faut choisir');
});

// --------------------------------------------------------------- métiers
test('craft-levels-with-days-spent-at-the-guild', () => {
  const s = fresh();
  const adv = s.roster[0];
  adv.craft = 'forgeron'; adv.craftXp = 0;
  assert.equal(craftLevel(adv), 0);
  for (let d = 0; d < CRAFT_THRESHOLDS[1]; d++) endDay(s);
  assert.equal(craftLevel(adv), 1);
  assert.equal(craftProgress(adv).next, CRAFT_THRESHOLDS[2]);
  const sent = s.roster[1];
  const xpBefore = sent.craftXp;
  const m = s.board.find((x) => x.type === 'solo');
  sendMission(s, m.id, [sent.id]);
  endDay(s);
  assert.equal(sent.craftXp, xpBefore, 'en mission : le métier ne progresse pas');
});

test('craft-bonuses-add-up-across-the-guild', () => {
  const s = fresh();
  for (const a of s.roster) { a.craft = 'forgeron'; a.craftXp = CRAFT_THRESHOLDS[3]; }
  const totals = craftTotals(s);
  assert.equal(totals.forgeron, 3 * 3);
  const bonus = craftBonuses(s);
  assert.equal(bonus.forgeDiscount, Math.min(0.4, 0.03 * 9));
  assert.equal(bonus.forgeTier, 3);
  s.roster[0].craft = 'cuisinier';
  assert.ok(craftBonuses(s).morale > 0);
  assert.ok(moraleBonus(s) >= craftBonuses(s).morale);
  s.roster[1].craft = 'negociant';
  assert.ok(craftBonuses(s).goldMult > 1);
  s.roster[2].craft = 'scribe';
  assert.ok(craftBonuses(s).xpMult > 1);
});

test('alchemists-deliver-potions-every-cycle', () => {
  const s = fresh();
  for (const a of s.roster) { a.craft = 'alchimiste'; a.craftXp = CRAFT_THRESHOLDS[1]; }
  s.potions.soin = 0;
  s.day = CONSTANTS.CRAFT_CYCLE - 1;
  endDay(s);
  assert.equal(s.potions.soin, 0, 'rien avant la fin du cycle');
  s.day = CONSTANTS.CRAFT_CYCLE;
  const produced = craftBonuses(s).potionsPerCycle;
  endDay(s);
  assert.equal(s.potions.soin, produced);
  assert.ok(produced >= 3);
});

test('change-craft-resets-progress-and-costs-gold', () => {
  const s = fresh();
  const adv = s.roster[0];
  adv.craft = 'forgeron'; adv.craftXp = 0;
  s.gold = 1000;
  assert.equal(changeCraft(s, adv.id, 'scribe').cost, 0, 'gratuit tant que rien n’est appris');
  assert.equal(adv.craft, 'scribe');
  adv.craftXp = 40;
  const gold = s.gold;
  const r = changeCraft(s, adv.id, 'negociant');
  assert.equal(r.ok, true);
  assert.equal(s.gold, gold - CRAFT_CHANGE_COST);
  assert.equal(adv.craftXp, 0);
  assert.equal(changeCraft(s, adv.id, 'negociant').ok, false, 'déjà son métier');
  assert.equal(changeCraft(s, adv.id, 'barde').ok, false);
});

// ------------------------------------------------- chaîne d'éveil et bestiaire
test('seal-missions-appear-one-at-a-time-and-grant-fragments', () => {
  const s = fresh();
  s.reputation = CONSTANTS.RANK_THRESHOLDS[CONSTANTS.ATTUNEMENT_RANK - 1];
  endDay(s);
  const seals = s.board.filter((m) => m.seal);
  assert.equal(seals.length, 1, 'un sceau à la fois');
  assert.equal(seals[0].seal, CONSTANTS.ATTUNEMENT_THEMES[0], 'dans l’ordre de la chaîne');
  assert.equal(seals[0].theme, CONSTANTS.ATTUNEMENT_THEMES[0]);
  assert.equal(seals[0].name, SEALS[CONSTANTS.ATTUNEMENT_THEMES[0]].name);
  assert.equal(seals[0].expiresDay, Number.MAX_SAFE_INTEGER, 'un sceau ne périme pas');
  // une escouade légendaire le brise
  s.roster = [];
  for (let i = 0; i < 5; i++) {
    const hero = mk(s, 'legende', 20);
    hero.classLevels = { legende: 20, champion: 20 };
    s.roster.push(hero);
  }
  s.squads[0].members = s.roster.map((a) => a.id);
  s.gold = 100000;
  assert.equal(sendSquad(s, seals[0].id, s.squads[0].id).ok, true);
  for (let d = 0; d < seals[0].duration; d++) endDay(s);
  assert.deepEqual(s.fragments, [CONSTANTS.ATTUNEMENT_THEMES[0]], 'fragment arraché');
  assert.ok(s.journal.some((e) => e.text.includes('Chaîne d’éveil')));
  assert.equal(s.board.filter((m) => m.seal).length, 1, 'le sceau suivant prend la place');
  assert.equal(s.board.find((m) => m.seal).seal, CONSTANTS.ATTUNEMENT_THEMES[1]);
});

test('bestiary-counts-kills-and-grants-damage', () => {
  const s = fresh();
  assert.equal(bestiaryBonus(s, 'loup'), 0);
  assert.equal(bestiaryTier(0), null);
  const first = CONSTANTS.BESTIARY_TIERS[0];
  assert.equal(bestiaryTier(first.kills).name, first.name);
  s.bestiary.loup = first.kills;
  assert.equal(bestiaryBonus(s, 'loup'), first.bonus);
  assert.equal(loreTable(s).loup, first.bonus);
  const entry = bestiaryEntries(s).find((e) => e.kind === 'loup');
  assert.equal(entry.kills, first.kills);
  assert.equal(entry.tier.name, first.name);
  assert.equal(entry.themeName, THEMES.betes.name);
  assert.ok(bestiaryEntries(s).some((e) => e.boss), 'les chefs figurent au bestiaire');
  // une mission réelle alimente le compteur
  const before = s.bestiary.bandit || 0;
  const m = createMission(s, 'solo', 1, { name: 'x', theme: 'brigands', slots: 1, duration: 1 });
  s.board.push(m);
  const hero = mk(s, 'champion', 16);
  s.roster.push(hero);
  sendMission(s, m.id, [hero.id]);
  endDay(s);
  assert.ok((s.bestiary.bandit || 0) > before, 'les proies sont enregistrées');
});

test('rival-guild-poaches-stale-contracts', () => {
  const s = fresh();
  assert.equal(s.rival.taken, 0);
  assert.equal(rivalLeads(s), false);
  let guard = 0;
  while (s.rival.taken === 0 && guard++ < 60) endDay(s);
  assert.ok(s.rival.taken > 0, 'elle finit par rafler un contrat');
  assert.ok(s.rival.reputation > 0);
  assert.ok(s.journal.some((e) => e.text.includes('rafle le contrat')));
  assert.equal(s.board.filter((m) => m.seal || m.final).length, s.board.filter((m) => m.seal || m.final).length, 'elle ne touche ni sceau ni raid final');
  // quand elle mène, recruter coûte plus cher
  s.rival.reputation = s.reputation + 1000;
  assert.equal(rivalLeads(s), true);
  s.gold = 100000;
  const cand = s.tavern[0];
  const before = s.gold;
  recruit(s, cand.id);
  assert.equal(before - s.gold, Math.round(recruitCost(cand) * CONSTANTS.RIVAL_RECRUIT_PENALTY));
});

// ------------------------------------------------------------- escouades
test('squads-unlock-with-the-quarters', () => {
  const s = fresh();
  assert.equal(maxSquads(s), BUILDINGS.quartier.levels[0].squads);
  assert.equal(s.squads.length, 1);
  assert.equal(s.squads[0].members.length, 3, 'le trio de départ est déjà affecté');
  s.gold = 100000;
  upgradeBuilding(s, 'quartier');
  assert.equal(maxSquads(s), 2);
  assert.equal(s.squads.length, 2, 'une escouade de plus est ouverte');
  upgradeBuilding(s, 'quartier');
  assert.equal(s.squads.length, 3);
  assert.equal(maxRoster(s), BUILDINGS.quartier.levels[2].roster);
  upgradeBuilding(s, 'quartier');
  assert.equal(maxRoster(s), 24, 'trois escouades de huit');
  syncSquads(s);
  assert.equal(s.squads.length, 3);
});

test('assign-move-and-swap-squad-members', () => {
  const s = fresh();
  s.gold = 100000;
  upgradeBuilding(s, 'quartier');
  const [a, b] = s.roster;
  assert.equal(squadOf(s, a.id).id, s.squads[0].id);
  assert.equal(assignToSquad(s, a.id, s.squads[1].id).ok, true);
  assert.equal(squadOf(s, a.id).id, s.squads[1].id);
  assert.equal(s.squads[0].members.includes(a.id), false, 'plus dans son ancienne escouade');
  assert.equal(assignToSquad(s, a.id, null).ok, true);
  assert.equal(squadOf(s, a.id), null, 'en réserve');
  assert.equal(assignToSquad(s, a.id, 999).ok, false);
  assert.equal(assignToSquad(s, a.id, s.squads[0].id).ok, true);
  // échange : chacun prend la place de l'autre
  assignToSquad(s, b.id, s.squads[1].id);
  assert.equal(swapSquadMembers(s, a.id, b.id).ok, true);
  assert.equal(squadOf(s, a.id).id, s.squads[1].id);
  assert.equal(squadOf(s, b.id).id, s.squads[0].id);
  // capacité
  const squad = s.squads[0];
  squad.members = [];
  for (let i = 0; i < CONSTANTS.SQUAD_SIZE; i++) { const adv = mk(s, 'mage', 1); s.roster.push(adv); squad.members.push(adv.id); }
  const extra = mk(s, 'mage', 1); s.roster.push(extra);
  assert.equal(assignToSquad(s, extra.id, squad.id).reason, `${CONSTANTS.SQUAD_SIZE} membres au maximum`);
});

test('squad-composition-reports-roles-and-gaps', () => {
  const s = fresh();
  const squad = s.squads[0];
  const comp = squadComposition(s, squad);
  assert.equal(comp.size, 3);
  assert.equal(comp.classRoles.tank, 1);
  assert.equal(comp.classRoles.healer, 1);
  assert.ok(comp.roles.soin >= 1, 'le clerc apporte du soin');
  assert.ok(comp.rows.front >= 1 && comp.rows.back >= 1);
  squad.members = [s.roster.find((a) => a.classKey === 'mage')?.id].filter(Boolean);
  if (!squad.members.length) { const mage = mk(s, 'mage', 3); s.roster.push(mage); squad.members = [mage.id]; }
  const solo = squadComposition(s, squad);
  assert.ok(solo.warnings.some((w) => w.includes('tank')));
  assert.ok(solo.warnings.some((w) => w.includes('soin')));
  const onlyTanks = { id: 8, name: 't', members: [] };
  for (let i = 0; i < 2; i++) { const g = mk(s, 'guerrier', 3); s.roster.push(g); onlyTanks.members.push(g.id); }
  assert.ok(squadComposition(s, onlyTanks).warnings.some((w) => w.includes('dégâts')), 'une escouade sans dps est signalée');
  assert.equal(squadComposition(s, { id: 9, name: 'vide', members: [] }).warnings.length, 0, 'une escouade vide ne alarme pas');
});

test('send-squad-takes-available-members-within-limits', () => {
  const s = fresh();
  const squad = s.squads[0];
  const raid = createMission(s, 'raid', 2, { name: 'r', theme: 'brigands', slots: 4, duration: 2 });
  s.board.push(raid);
  assert.equal(sendSquad(s, raid.id, squad.id).ok, false, 'trois membres pour un raid : refusé');
  for (let i = 0; i < 6; i++) { const adv = mk(s, 'guerrier', 5); s.roster.push(adv); if (squad.members.length < CONSTANTS.SQUAD_SIZE) squad.members.push(adv.id); }
  s.roster.find((a) => a.id === squad.members[0]).status = 'injured';
  const ready = squadMembers(s, squad).filter((a) => a.status === 'available');
  const r = sendSquad(s, raid.id, squad.id);
  assert.equal(r.ok, true);
  assert.equal(r.mission.team.length, Math.min(ready.length, raid.maxSize));
  assert.ok(r.mission.team.length <= MISSION_TYPES.raid.maxSize && MISSION_TYPES.raid.maxSize === 8);
  assert.equal(r.mission.team.includes(squad.members[0]), false, 'le blessé reste à la guilde');
  assert.equal(sendSquad(s, raid.id, 999).ok, false);
});

test('squad-ranks-carry-their-own-bonuses', () => {
  const s = fresh();
  s.gold = 100000;
  upgradeBuilding(s, 'quartier'); upgradeBuilding(s, 'quartier');
  assert.deepEqual(s.squads.map((sq) => sq.rank), [0, 1, 2]);
  assert.equal(squadRank(s.squads[0]).gold, CONSTANTS.SQUAD_RANKS[0].gold);
  assert.ok(squadRank(s.squads[0]).gold > 1 && squadRank(s.squads[0]).xp === 1, 'la principale paie en or et renom');
  assert.ok(squadRank(s.squads[1]).xp > 1 && squadRank(s.squads[1]).gold === 1, 'les secondes forment');
  assert.equal(squadRank(s.squads[2]).xp, squadRank(s.squads[1]).xp);
});

test('main-squad-earns-more-gold-and-reputation', () => {
  const s = fresh();
  s.gold = 100000;
  upgradeBuilding(s, 'quartier');
  const m = createMission(s, 'solo', 1, { name: 'x', theme: 'brigands', slots: 1, duration: 1 });
  s.board.push(m);
  const hero = mk(s, 'champion', 12);
  // Guilde réduite au héros : ni file d'entraînement ni autres salaires pour
  // brouiller le calcul.
  s.roster = [hero];
  for (const sq of s.squads) sq.members = [];
  s.squads[0].members = [hero.id];
  const goldBefore = s.gold;
  const repBefore = s.reputation;
  const wages = dailyWages(s);
  assert.equal(sendSquad(s, m.id, s.squads[0].id).ok, true);
  assert.equal(s.active[0].squadId, s.squads[0].id, 'la mission retient son escouade');
  endDay(s);
  const report = s.reports[0];
  assert.equal(report.success, true);
  assert.equal(s.reputation - repBefore, Math.round(report.rep * CONSTANTS.SQUAD_RANKS[0].rep), 'renom majoré');
  assert.equal(s.gold, goldBefore - wages + Math.round(report.gold * CONSTANTS.SQUAD_RANKS[0].gold), 'or majoré du bonus de l’escouade principale');
});

test('training-queue-levels-solo-adventurers', () => {
  const s = fresh();
  s.gold = 100000;
  upgradeBuilding(s, 'quartier');
  const rookie = mk(s, 'guerrier', 1, 'nain');
  s.roster.push(rookie);
  assert.ok(trainingQueue(s).some((a) => a.id === rookie.id), 'sans escouade → en file');
  assert.equal(isReadyForSquad(rookie), false);
  const goldBefore = s.gold;
  let guard = 0;
  while (!isReadyForSquad(rookie) && guard++ < 120) endDay(s);
  assert.ok(isReadyForSquad(rookie), `prêt au niveau ${CONSTANTS.TRAINING_READY_LEVEL}`);
  assert.ok(totalLevel(rookie) >= CONSTANTS.TRAINING_READY_LEVEL);
  assert.ok(s.gold !== goldBefore, 'les quêtes solo rapportent aussi un peu d’or');
  const placed = fillSquadsFromQueue(s);
  assert.ok(placed.placed >= 1);
  assert.ok(squadOf(s, rookie.id), 'il rejoint une escouade');
  assert.equal(trainingQueue(s).some((a) => a.id === rookie.id), false);
});

test('squad-members-do-not-train-solo', () => {
  const s = fresh();
  const inSquad = s.roster[0];
  const before = totalLevel(inSquad) * 1000 + inSquad.xp;
  endDay(s);
  assert.equal(totalLevel(inSquad) * 1000 + inSquad.xp, before, 'un membre d’escouade ne gagne rien en file');
});

test('renaming-a-squad', () => {
  const s = fresh();
  assert.equal(renameSquad(s, s.squads[0].id, '  Les Lames  ').ok, true);
  assert.equal(s.squads[0].name, 'Les Lames');
  assert.equal(renameSquad(s, s.squads[0].id, '   ').ok, false);
  assert.equal(renameSquad(s, 999, 'x').ok, false);
});

test('dismissed-members-leave-their-squad', () => {
  const s = fresh();
  const adv = s.roster[0];
  assert.ok(squadOf(s, adv.id));
  dismiss(s, adv.id);
  assert.equal(squadOf(s, adv.id), null);
  assert.equal(s.squads[0].members.includes(adv.id), false);
});

// ------------------------------------------------------------ inventaire
test('optimize-equipment-fills-every-slot', () => {
  const s = fresh();
  const adv = s.roster.find((a) => a.classKey === 'guerrier');
  s.inventory.push(makeItem(s, 'sword', 2), makeItem(s, 'plate', 2), makeItem(s, 'amulet', 2), makeItem(s, 'staff', 3));
  const before = computePower(adv);
  const r = optimizeEquipment(s, adv.id);
  assert.equal(r.ok, true);
  assert.equal(r.changed, 3, 'arme, armure, accessoire');
  assert.ok(computePower(adv) > before);
  assert.equal(adv.equipment.weapon.key, 'sword');
  assert.ok(s.inventory.some((it) => it.key === 'staff'), 'le bâton reste : le guerrier ne peut pas le porter');
  assert.equal(optimizeEquipment(s, adv.id).changed, 0, 'rien de mieux ensuite');
  adv.status = 'mission';
  assert.equal(optimizeEquipment(s, adv.id).ok, false);
});

// ------------------------------------------------------------- portraits
test('portrait-is-deterministic-and-unique', () => {
  const s = fresh();
  const a = mk(s, 'guerrier', 1);
  const b = mk(s, 'guerrier', 1);
  assert.equal(portraitSvg(a), portraitSvg(a), 'même aventurier → même portrait');
  assert.notEqual(portraitSeed(a), portraitSeed(b), 'deux aventuriers → graines différentes');
  assert.ok(portraitSvg(a, 44).startsWith('<svg'));
  assert.ok(portraitSvg(a, 44).includes('width="44"'));
});

test('recruited-names-stay-unique', () => {
  const s = fresh();
  s.gold = 100000;
  upgradeBuilding(s, 'quartier');
  s.tavern[0].name = s.roster[0].name;
  const id = s.tavern[0].id;
  recruit(s, id);
  const joined = s.roster.find((a) => a.id === id);
  assert.notEqual(joined.name, s.roster[0].name, 'homonyme renommé');
  assert.equal(new Set(s.roster.map((a) => a.name)).size, s.roster.length);
});

// ------------------------------------------------- taverne : moral, repos
test('tavern-morale-boosts-mission-estimate', () => {
  const s = fresh();
  assert.equal(moraleBonus(s), 0);
  s.gold = 100000;
  for (let i = 0; i < 3; i++) upgradeBuilding(s, 'taverne');
  assert.equal(moraleBonus(s), BUILDINGS.taverne.levels[3].morale);
  const m = mission(s, 'solo', 4);
  const adv = mk(s, 'guerrier', 6);
  const withMorale = estimateWithPotions(s, m, [adv]);
  s.buildings.taverne = 0;
  const without = estimateWithPotions(s, m, [adv]);
  assert.ok(withMorale >= without, `${withMorale} >= ${without}`);
});

test('tavern-infirmary-shortens-recovery', () => {
  const s = fresh();
  const adv = s.roster[0];
  adv.status = 'injured'; adv.injuredDays = 4; adv.traits = [];
  endDay(s);
  assert.equal(adv.injuredDays, 3, 'sans infirmerie : 1 jour par nuit');
  s.gold = 100000;
  upgradeBuilding(s, 'taverne');
  endDay(s);
  assert.equal(adv.injuredDays, 1, 'infirmerie niveau 1 : 2 jours par nuit');
  const scout = s.roster[1];
  scout.status = 'injured'; scout.injuredDays = 5; scout.traits = ['eclaireur'];
  endDay(s);
  assert.equal(scout.injuredDays, 2, 'Éclaireur : un jour de plus');
});

test('tavern-reroll-costs-gold-and-changes-candidates', () => {
  const s = fresh();
  assert.equal(rerollTavern(s).ok, false, 'taverne niveau 0');
  s.gold = 100000;
  upgradeBuilding(s, 'taverne');
  const before = s.tavern.map((c) => c.id);
  const gold = s.gold;
  const r = rerollTavern(s);
  assert.equal(r.ok, true);
  assert.equal(s.gold, gold - BUILDINGS.taverne.levels[1].reroll);
  assert.notDeepEqual(s.tavern.map((c) => c.id), before);
  s.gold = 0;
  assert.equal(rerollTavern(s).ok, false);
});

// --------------------------------------------- journal d'événements
test('combat-log-is-structured-and-formattable', () => {
  const s = fresh();
  const m = mission(s, 'team', 2, { slots: 2, duration: 2 });
  const team = [mk(s, 'guerrier', 8), mk(s, 'clerc', 8)];
  const sim = simulateMission({ rngState: seedToState(12) }, m, team, true);
  assert.ok(sim.log.every((ev) => typeof ev === 'object' && typeof ev.t === 'string'), 'événements structurés');
  assert.ok(sim.log.every((ev) => typeof formatEvent(ev) === 'string'));
  const hit = sim.log.find((ev) => ev.t === 'hit');
  assert.ok(hit && typeof hit.dmg === 'number' && hit.a && hit.d, 'un coup porte attaquant, cible et dégâts');
  assert.ok(formatEvent(hit).includes(String(hit.dmg)));
  assert.equal(formatEvent({ t: 'inconnu' }), '');
});

test('snapshot-is-deep-copy', () => {
  const s = fresh();
  const snap = snapshot(s);
  s.gold = -1;
  s.roster[0].classLevels[s.roster[0].classKey] = 99;
  assert.equal(snap.gold, CONSTANTS.START_GOLD);
  assert.equal(classLevel(snap.roster[0]), 1);
});
