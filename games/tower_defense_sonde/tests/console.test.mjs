import { strict as assert } from 'assert';
import { test } from 'node:test';
import { capturePlaythrough } from './_playthrough_driver.mjs';

// R55: zero JS console errors/uncaught exceptions across one full VICTORY
// playthrough and one full DEFEAT playthrough, driven in a REAL browser
// (not a fixture) — a console.error or thrown exception here is a real
// runtime defect in the shipped game, not a test artifact.
export function assertNoConsoleErrors({ consoleErrors, pageErrors }, label) {
  const violations = [...consoleErrors, ...pageErrors];
  assert.equal(
    violations.length,
    0,
    `${label}: expected zero console errors/exceptions, got ${violations.length}: ${violations.join(' | ')}`
  );
}

test('R55: zero console errors across a full VICTORY playthrough', async () => {
  const run = await capturePlaythrough('VICTORY');
  assert.equal(run.finalState.result, 'VICTORY', 'the driven match actually reached VICTORY');
  assertNoConsoleErrors(run, 'VICTORY');
});

test('R55: zero console errors across a full DEFEAT playthrough', async () => {
  const run = await capturePlaythrough('DEFEAT');
  assert.equal(run.finalState.result, 'DEFEAT', 'the driven match actually reached DEFEAT');
  assertNoConsoleErrors(run, 'DEFEAT');
});
