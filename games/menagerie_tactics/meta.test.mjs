// meta.test.mjs — transforms purs de la méta (roster/xp/harvest/deploy). Fichier NEUF
// (hors zone protégée). Bornes en triple + valeurs exactes pour tuer les mutants.
import test from "node:test";
import assert from "node:assert";
import {
  makeInstance, xpToPalier, effectiveStats, gainXp, deployable,
  harvest, completeRegion, buildDeploySetup, KENNEL_SLOTS, SCAR_DEPLOY_LIMIT, PALIER_BONUS,
} from "./meta.mjs";
import { base } from "./bestiaire.mjs";
import { generateBattle, DEPLOY_SLOTS } from "./level.mjs";

test("xpToPalier : bornes exactes (99->0, 100->1, 199->1, 200->2)", () => {
  assert.strictEqual(xpToPalier(99), 0);
  assert.strictEqual(xpToPalier(100), 1);
  assert.strictEqual(xpToPalier(199), 1);
  assert.strictEqual(xpToPalier(200), 2);
});

test("effectiveStats : palier 0 == base ; palier 2 == base + 2*bonus (valeurs exactes)", () => {
  const inst = makeInstance("embraseur", 1);
  const b = base("embraseur");
  const s0 = effectiveStats(inst);
  assert.strictEqual(s0.hp, b.hp);
  assert.strictEqual(s0.atk, b.atk);
  assert.strictEqual(s0.maxHp, b.hp);
  const s2 = effectiveStats({ ...inst, palier: 2 });
  assert.strictEqual(s2.hp, b.hp + 2 * PALIER_BONUS.hp);
  assert.strictEqual(s2.atk, b.atk + 2 * PALIER_BONUS.atk);
  assert.strictEqual(s2.speed, b.speed); // stat-only : speed/move/range inchangés
});

test("gainXp : IMMUTABLE, accumule, recalcule le palier", () => {
  const inst = makeInstance("golem", 1);
  const a = gainXp(inst, 60);
  const b = gainXp(a, 60);
  assert.strictEqual(inst.xp, 0); // original jamais muté
  assert.strictEqual(a.xp, 60);
  assert.strictEqual(a.palier, 0);
  assert.strictEqual(b.xp, 120); // accumulation (tue += -> =)
  assert.strictEqual(b.palier, 1);
});

test("deployable : borne cicatrices (limite-1 => true, limite => false)", () => {
  assert.strictEqual(deployable({ cicatrices: SCAR_DEPLOY_LIMIT - 1 }), true);
  assert.strictEqual(deployable({ cicatrices: SCAR_DEPLOY_LIMIT }), false);
});

test("harvest VICTOIRE : seules les bêtes capturées rejoignent la réserve", () => {
  const save = { schema_version: 1, roster: [], reserve: [], regionsDone: 0, nextUid: 5 };
  const view = { over: true, won: true, beasts: [
    { speciesId: "roncier", captured: true },
    { speciesId: "golem", captured: false },
  ] };
  const out = harvest(view, save);
  assert.strictEqual(out.reserve.length, 1);
  assert.strictEqual(out.reserve[0].species, "roncier");
  assert.strictEqual(out.reserve[0].uid, 5);
  assert.strictEqual(out.nextUid, 6);
});

test("harvest DÉFAITE : captures perdues (réserve inchangée)", () => {
  const save = { schema_version: 1, roster: [], reserve: [], regionsDone: 0, nextUid: 5 };
  const view = { over: true, won: false, beasts: [{ speciesId: "roncier", captured: true }] };
  const out = harvest(view, save);
  assert.deepStrictEqual(out.reserve, []);
  assert.strictEqual(out.nextUid, 5);
});

test("completeRegion : réserve versée au roster, réserve vidée, regionsDone+1", () => {
  const inst = makeInstance("roncier", 9);
  const save = { schema_version: 1, roster: [], reserve: [inst], regionsDone: 2, nextUid: 10 };
  const out = completeRegion(save);
  assert.deepStrictEqual(out.roster, [inst]);
  assert.deepStrictEqual(out.reserve, []);
  assert.strictEqual(out.regionsDone, 3);
});

function roster3() {
  return [makeInstance("embraseur", 1), makeInstance("ondine", 2), makeInstance("fulgor", 3)];
}

test("buildDeploySetup : plafond (KENNEL_SLOTS ok, +1 throw)", () => {
  const roster = roster3();
  assert.doesNotThrow(() => buildDeploySetup(roster, [1, 2, 3], 1));
  assert.throws(() => buildDeploySetup(roster, [1, 2, 3, 3], 1), /max/);
});

test("buildDeploySetup : refuse une bête cicatrisée (indéployable)", () => {
  const roster = [{ ...makeInstance("embraseur", 1), cicatrices: SCAR_DEPLOY_LIMIT }];
  assert.throws(() => buildDeploySetup(roster, [1], 1), /indéployable/);
});

test("buildDeploySetup : forme exacte (joueurs sur DEPLOY_SLOTS ; terrain+ennemis == generateBattle)", () => {
  const roster = roster3();
  const seed = 3;
  const setup = buildDeploySetup(roster, [1, 2, 3], seed);
  const gen = generateBattle(1, seed);
  const players = setup.beasts.filter((b) => b.side === "player");
  assert.strictEqual(players.length, 3);
  players.forEach((p, i) => {
    assert.strictEqual(p.x, DEPLOY_SLOTS[i].x);
    assert.strictEqual(p.y, DEPLOY_SLOTS[i].y);
    assert.strictEqual(p.active, true);
    assert.strictEqual(p.scarred, false); // déployé frais
    assert.strictEqual(p.captured, false);
    assert.strictEqual(p.hp, p.maxHp);
    assert.strictEqual(p.hp, effectiveStats(roster[i]).hp);
  });
  // terrain + ennemis identiques à la génération de base (le coin capturable est là)
  assert.deepStrictEqual(setup.terrain, gen.terrain);
  assert.deepStrictEqual(setup.beasts.filter((b) => b.side === "enemy"), gen.beasts.filter((b) => b.side === "enemy"));
  assert.strictEqual(setup.captureThreshold, gen.captureThreshold);
});
