import { strict as assert } from 'assert';
import { test } from 'node:test';
import { existsSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { capturePlaythrough } from './_playthrough_driver.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROOFS_DIR = resolve(__dirname, '../proofs');
const VICTORY_PATH = resolve(PROOFS_DIR, 'visual-victory.png');
const DEFEAT_PATH = resolve(PROOFS_DIR, 'visual-defeat.png');

// R54: captures come from a REAL browser render of the final page (real
// Chromium, file://, the actual index.html -> main.mjs -> render.mjs
// pipeline) driven all the way to a genuine VICTORY and a genuine DEFEAT —
// never a fixture, mock, or isolated-component render (see
// tests/_playthrough_driver.mjs for how the match is driven and why).
export async function captureFinalScreens() {
  const victory = await capturePlaythrough('VICTORY', { screenshotPath: VICTORY_PATH });
  const defeat = await capturePlaythrough('DEFEAT', { screenshotPath: DEFEAT_PATH });
  return { victory, defeat };
}

// One real capture pass, shared by both assertions below — each still
// checks the actual returned state and the actual file on disk, but the
// (expensive, real-browser) capture itself runs once per file, not once per
// assertion.
const screens = await captureFinalScreens();

test('R54: VICTORY screen is captured from a real completed match', () => {
  const { victory } = screens;

  assert.equal(victory.finalState.result, 'VICTORY', 'the driven match actually reached VICTORY');
  assert.equal(victory.finalState.phase, 'VICTORY', 'the real gameState phase reflects the win');
  assert.ok(existsSync(VICTORY_PATH), `screenshot file was written to ${VICTORY_PATH}`);
  assert.notEqual(statSync(VICTORY_PATH).size, 0, 'screenshot file is non-empty (a real capture, not a zero-byte stub)');
});

test('R54: DEFEAT screen is captured from a real completed match', () => {
  const { defeat } = screens;

  assert.equal(defeat.finalState.result, 'DEFEAT', 'the driven match actually reached DEFEAT');
  assert.equal(defeat.finalState.phase, 'DEFEAT', 'the real gameState phase reflects the loss');
  assert.equal(defeat.finalState.lives, 0, 'defeat happens at exactly 0 lives (R16/R35), never negative');
  assert.ok(existsSync(DEFEAT_PATH), `screenshot file was written to ${DEFEAT_PATH}`);
  assert.notEqual(statSync(DEFEAT_PATH).size, 0, 'screenshot file is non-empty (a real capture, not a zero-byte stub)');
});
