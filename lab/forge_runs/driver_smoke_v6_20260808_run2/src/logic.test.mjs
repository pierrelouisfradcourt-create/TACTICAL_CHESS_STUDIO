import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp } from './logic.mjs';

test('clamp bounds a value above the range', () => {
  assert.equal(clamp(15, 0, 10), 10);
});

test('clamp bounds a value below the range', () => {
  assert.equal(clamp(-5, 0, 10), 0);
});

test('clamp leaves an in-range value untouched', () => {
  assert.equal(clamp(5, 0, 10), 5);
});
