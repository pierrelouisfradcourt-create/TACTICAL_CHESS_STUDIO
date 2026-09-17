// guild_manager — tests de propriétés : invariants sur des parties jouées par
// le bot (node --test logic.test.mjs properties.test.mjs = DEFAULT_TEST_ARGV).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONSTANTS } from './data.mjs';
import { classLevel, computeStats, totalLevel } from './adventurer.mjs';
import { createGuild, maxRoster, snapshot } from './guild.mjs';
import { botPlayDay } from './bot.mjs';

const SEEDS = [1, 2, 3];
const DAYS = 80;

function checkInvariants(s, day) {
  assert.ok(s.gold >= 0, `or négatif au jour ${day}`);
  assert.ok(s.reputation >= 0, `réputation négative au jour ${day}`);
  assert.ok(s.roster.length <= maxRoster(s), `roster > max au jour ${day}`);
  for (const v of Object.values(s.potions)) assert.ok(v >= 0, 'stock de potions négatif');
  const ids = new Set();
  for (const a of s.roster) {
    assert.ok(!ids.has(a.id), `id dupliqué ${a.id}`); ids.add(a.id);
    for (const [k, l] of Object.entries(a.classLevels)) assert.ok(l >= 1 && l <= CONSTANTS.MAX_CLASS_LEVEL, `niveau ${k} hors bornes ${l}`);
    assert.ok(classLevel(a) >= 1, 'classe active sans niveau');
    assert.ok(a.xp >= 0, 'xp négative');
    assert.ok(['available', 'mission', 'injured'].includes(a.status), `statut inconnu ${a.status}`);
    if (a.status === 'mission') assert.ok(s.active.some((m) => m.team.includes(a.id)), `${a.name} en mission fantôme`);
    else assert.equal(a.missionId, null);
    for (const v of Object.values(computeStats(a))) assert.ok(v >= 0, 'stat négative');
  }
  for (const m of s.active) {
    assert.ok(m.daysLeft >= 1, 'mission active à 0 jour');
    for (const id of m.team) {
      const a = s.roster.find((x) => x.id === id);
      if (a) assert.equal(a.status, 'mission', `${a.name} listé dans une mission active sans y être`);
    }
  }
  // Le raid final et les sceaux de la chaîne d'éveil ne comptent pas dans le tableau.
  if (s.outcome === 'playing') assert.equal(s.board.filter((m) => !m.final && !m.seal).length, CONSTANTS.BOARD_SIZE);
  assert.ok(s.board.filter((m) => m.seal).length <= 1, 'un seul sceau à la fois');
  assert.ok(s.fragments.length <= CONSTANTS.ATTUNEMENT_THEMES.length);
  for (const n of Object.values(s.bestiary)) assert.ok(n >= 0, 'compteur de bestiaire négatif');
}

for (const seed of SEEDS) {
  test(`property-invariants-seed-${seed}`, () => {
    const s = createGuild(seed);
    let prevDay = s.day;
    let prevRep = s.reputation;
    for (let d = 0; d < DAYS && s.outcome === 'playing'; d++) {
      botPlayDay(s);
      assert.equal(s.day, prevDay + 1, 'le jour doit avancer de 1');
      assert.ok(s.reputation >= prevRep, 'la réputation ne régresse jamais');
      prevDay = s.day; prevRep = s.reputation;
      checkInvariants(s, s.day);
    }
  });
}

test('property-level-monotonic-per-adventurer', () => {
  const s = createGuild(11);
  const levels = new Map();
  for (let d = 0; d < DAYS && s.outcome === 'playing'; d++) {
    botPlayDay(s);
    for (const a of s.roster) {
      const prev = levels.get(a.id) ?? 0;
      assert.ok(totalLevel(a) >= prev, `${a.name} a perdu des niveaux`);
      levels.set(a.id, totalLevel(a));
    }
  }
});

test('property-snapshot-restore-replays-identically', () => {
  const s = createGuild(21);
  for (let d = 0; d < 20; d++) botPlayDay(s);
  const snap = snapshot(s);
  const a = structuredClone(snap);
  const b = structuredClone(snap);
  for (let d = 0; d < 20; d++) { botPlayDay(a); botPlayDay(b); }
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
