// role_sim.test.mjs — tests du ROLE-SIM Oracle (GÉNÉRIQUE depuis le 2e rôle). node --test,
// zéro réseau, zéro LLM. measureDifficultyBand est maintenant agnostique à la mécanique de
// jeu — testé ici avec le scénario réel pursuer_scenario.mjs (même comportement que
// l'ancien role_sim.mjs monolithique, vérifié par extraction inchangée) ET un scénario
// factice minimal (pour prouver la généricité elle-même, pas seulement rejouer pursuer).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureDifficultyBand } from './role_sim.mjs';
import { runTrial as pursuerRunTrial } from './systems/ai/pursuer_scenario.mjs';

const PURSUER_CFG = { trials: 50, seed_start: 1, max_ticks: 60, arena_half_size: 20, catch_radius: 1, pursuer_speed: 2, evader_speed: 1 };

test('measureDifficultyBand : déterministe — deux appels identiques donnent le même résultat exact', () => {
  const a = measureDifficultyBand(PURSUER_CFG, pursuerRunTrial);
  const b = measureDifficultyBand(PURSUER_CFG, pursuerRunTrial);
  assert.deepEqual(a, b);
});

test('measureDifficultyBand : un poursuivant plus rapide (speed=2) capture presque toujours un fuyard plus lent (speed=1)', () => {
  const cfg = { ...PURSUER_CFG, trials: 100 };
  const result = measureDifficultyBand(cfg, pursuerRunTrial);
  assert.ok(result.successRate > 0.9, `success_rate doit être élevé quand pursuer_speed > evader_speed, got ${result.successRate}`);
});

test('measureDifficultyBand : un poursuivant à la MÊME vitesse que le fuyard ne le rattrape jamais en terrain ouvert', () => {
  const cfg = { ...PURSUER_CFG, trials: 30, pursuer_speed: 1, evader_speed: 1 };
  const result = measureDifficultyBand(cfg, pursuerRunTrial);
  assert.equal(result.successRate, 0, `à vitesse égale, le fuyard maintient toujours la distance, got successRate=${result.successRate}`);
});

test('measureDifficultyBand : ticksToSucceed est trié croissant et de longueur == succeeded', () => {
  const cfg = { ...PURSUER_CFG, trials: 80, seed_start: 5 };
  const result = measureDifficultyBand(cfg, pursuerRunTrial);
  assert.equal(result.ticksToSucceed.length, result.succeeded);
  for (let i = 1; i < result.ticksToSucceed.length; i += 1) {
    assert.ok(result.ticksToSucceed[i] >= result.ticksToSucceed[i - 1], 'ticksToSucceed doit être trié croissant');
  }
});

test('measureDifficultyBand : changer seed_start change l\'échantillon (pas les mêmes essais)', () => {
  const cfgA = { ...PURSUER_CFG, trials: 50, seed_start: 1 };
  const cfgB = { ...PURSUER_CFG, trials: 50, seed_start: 1000 };
  const a = measureDifficultyBand(cfgA, pursuerRunTrial);
  const b = measureDifficultyBand(cfgB, pursuerRunTrial);
  assert.notDeepEqual(a.ticksToSucceed, b.ticksToSucceed, 'deux plages de seeds disjointes ne doivent pas produire exactement la même trace');
});

// ---- Preuve de GÉNÉRICITÉ : un scénario factice, sans rapport avec la poursuite ----
test('measureDifficultyBand : est réellement agnostique au scénario — un runTrial factice fonctionne sans modification', () => {
  // Scénario trivial : "succès" ssi seed est pair, ticks = seed % 10.
  function toyRunTrial(seed) {
    return seed % 2 === 0 ? { succeeded: true, ticks: seed % 10 } : { succeeded: false, ticks: null };
  }
  const cfg = { trials: 20, seed_start: 1 };
  const result = measureDifficultyBand(cfg, toyRunTrial);
  assert.equal(result.succeeded, 10, '10 seeds pairs sur 20 essais consécutifs à partir de 1');
  assert.equal(result.successRate, 0.5);
});
