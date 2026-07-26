// campaign.test.mjs — carte de campagne + progression + garanties de generateEncounter
// (couvre la mutation du volet campagne de level.mjs). Fichier NEUF (hors zone protégée).
import test from "node:test";
import assert from "node:assert";
import { campaignMap, nodeById, isBoss, createRun, advanceRun, startEncounter } from "./campaign.mjs";
import { generateEncounter, TIERS } from "./level.mjs";
import { ENCOUNTERS } from "./encounters.mjs";
import { base } from "./bestiaire.mjs";

test("campaignMap : 6 nœuds, start/boss présents, boss atteignable, 1 seul boss, déterministe", () => {
  const map = campaignMap();
  assert.strictEqual(map.nodes.length, 6);
  assert.ok(nodeById(map.startId));
  assert.ok(nodeById(map.bossId));
  const bosses = map.nodes.filter((n) => n.kind === "boss");
  assert.strictEqual(bosses.length, 1);
  assert.strictEqual(bosses[0].id, map.bossId);
  // BFS : le boss est atteignable depuis le start
  const seen = new Set([map.startId]);
  const q = [map.startId];
  while (q.length > 0) {
    const n = nodeById(q.shift());
    for (const nx of n.next) { if (!seen.has(nx)) { seen.add(nx); q.push(nx); } }
  }
  assert.ok(seen.has(map.bossId));
  assert.strictEqual(JSON.stringify(campaignMap()), JSON.stringify(campaignMap()));
});

test("nodeById : trouve un nœud, null si inconnu", () => {
  assert.strictEqual(nodeById("n1").id, "n1");
  assert.strictEqual(nodeById("zzz"), null);
});

test("isBoss : vrai pour le boss uniquement", () => {
  assert.strictEqual(isBoss(campaignMap().bossId), true);
  assert.strictEqual(isBoss(campaignMap().startId), false);
});

test("advanceRun : nœud battle => pas de complétion ; nœud boss => région complète", () => {
  const run = createRun(1);
  assert.strictEqual(run.position, "n1");
  assert.strictEqual(run.complete, false); // un run neuf n'est pas complété
  const next = advanceRun(run);
  assert.strictEqual(next.position, "n2");
  assert.strictEqual(next.complete, false); // n1 n'est pas le boss
  const atBoss = { seed: 1, position: campaignMap().bossId, complete: false, step: 5 };
  const done = advanceRun(atBoss);
  assert.strictEqual(done.complete, true); // franchir le boss = région complète
});

test("generateEncounter capture : garantit un ennemi faible+immobile en coin (id === targetId), multi-seed", () => {
  for (let seed = 1; seed <= 6; seed++) {
    const setup = generateEncounter(ENCOUNTERS.capture_t1, seed);
    const target = setup.beasts.find((b) => b.id === setup.objective.targetId);
    assert.ok(target, `seed ${seed} : pas de cible`);
    assert.strictEqual(target.x, 0);
    assert.strictEqual(target.y, 0);
    assert.ok(target.hp < setup.captureThreshold, `seed ${seed} : cible pas faible`);
    assert.strictEqual(target.move, 0); // immobile
    // exactement une cible faible+immobile
    const weak = setup.beasts.filter((b) => b.side === "enemy" && b.hp < setup.captureThreshold && b.move === 0);
    assert.strictEqual(weak.length, 1);
  }
});

test("generateEncounter rout : aucun ennemi forcé faible/immobile, pas de targetId", () => {
  const setup = generateEncounter(ENCOUNTERS.rout_t1, 1);
  assert.strictEqual(setup.objective.targetId, undefined);
  const immobileWeak = setup.beasts.filter((b) => b.side === "enemy" && b.hp < setup.captureThreshold && b.move === 0);
  assert.strictEqual(immobileWeak.length, 0);
});

test("generateEncounter : ennemis générés actifs, non cicatrisés, non capturés ; tier 2 renforce les stats", () => {
  const t1 = generateEncounter(ENCOUNTERS.rout_t1, 3).beasts.find((b) => b.side === "enemy" && b.speciesId === "givrette");
  const t2 = generateEncounter(ENCOUNTERS.boss_t2, 3).beasts.find((b) => b.side === "enemy" && b.speciesId === "givrette");
  const g = base("givrette");
  assert.strictEqual(t1.active, true);
  assert.strictEqual(t1.scarred, false);
  assert.strictEqual(t1.captured, false);
  assert.strictEqual(t1.hp, g.hp); // tier 1 = base exact
  assert.strictEqual(t2.hp, Math.floor(g.hp * TIERS[2].hp)); // tier 2 = base renforcée
  assert.ok(t2.hp > t1.hp);
});

test("startEncounter : charge le setup + l'objectif du template", () => {
  const setup = startEncounter("capture_t1", 1);
  assert.strictEqual(setup.objective.kind, "capture");
  assert.ok(setup.beasts.some((b) => b.side === "player"));
});
