// role_sim.test.mjs — tests du ROLE-SIM Oracle. node --test, zéro réseau, zéro LLM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureDifficultyBand } from './role_sim.mjs';

test('measureDifficultyBand : déterministe — deux appels identiques donnent le même résultat exact', () => {
  const cfg = { trials: 50, seed_start: 1, max_ticks: 60, arena_half_size: 20, catch_radius: 1, pursuer_speed: 2, evader_speed: 1 };
  const a = measureDifficultyBand(cfg);
  const b = measureDifficultyBand(cfg);
  assert.deepEqual(a, b);
});

test('measureDifficultyBand : un poursuivant plus rapide (speed=2) capture presque toujours un fuyard plus lent (speed=1)', () => {
  const cfg = { trials: 100, seed_start: 1, max_ticks: 60, arena_half_size: 20, catch_radius: 1, pursuer_speed: 2, evader_speed: 1 };
  const result = measureDifficultyBand(cfg);
  assert.ok(result.catchRate > 0.9, `catch_rate doit être élevé quand pursuer_speed > evader_speed, got ${result.catchRate}`);
});

test('measureDifficultyBand : un poursuivant à la MÊME vitesse que le fuyard ne le rattrape jamais en terrain ouvert (invariant de fuite pure)', () => {
  const cfg = { trials: 30, seed_start: 1, max_ticks: 60, arena_half_size: 20, catch_radius: 1, pursuer_speed: 1, evader_speed: 1 };
  const result = measureDifficultyBand(cfg);
  assert.equal(result.catchRate, 0, `à vitesse égale, le fuyard maintient toujours la distance en terrain ouvert non borné, got catchRate=${result.catchRate}`);
});

test('measureDifficultyBand : un poursuivant plus LENT que le fuyard ne le rattrape jamais', () => {
  const cfg = { trials: 30, seed_start: 1, max_ticks: 60, arena_half_size: 20, catch_radius: 1, pursuer_speed: 1, evader_speed: 2 };
  const result = measureDifficultyBand(cfg);
  assert.equal(result.catchRate, 0);
});

test('measureDifficultyBand : ticksToCatch est trié croissant et de longueur == caught', () => {
  const cfg = { trials: 80, seed_start: 5, max_ticks: 60, arena_half_size: 20, catch_radius: 1, pursuer_speed: 2, evader_speed: 1 };
  const result = measureDifficultyBand(cfg);
  assert.equal(result.ticksToCatch.length, result.caught);
  for (let i = 1; i < result.ticksToCatch.length; i += 1) {
    assert.ok(result.ticksToCatch[i] >= result.ticksToCatch[i - 1], 'ticksToCatch doit être trié croissant');
  }
});

test('measureDifficultyBand : changer seed_start change l\'échantillon (pas les mêmes essais)', () => {
  const cfgA = { trials: 50, seed_start: 1, max_ticks: 60, arena_half_size: 20, catch_radius: 1, pursuer_speed: 2, evader_speed: 1 };
  const cfgB = { trials: 50, seed_start: 1000, max_ticks: 60, arena_half_size: 20, catch_radius: 1, pursuer_speed: 2, evader_speed: 1 };
  const a = measureDifficultyBand(cfgA);
  const b = measureDifficultyBand(cfgB);
  assert.notDeepEqual(a.ticksToCatch, b.ticksToCatch, 'deux plages de seeds disjointes ne doivent pas produire exactement la même trace');
});
