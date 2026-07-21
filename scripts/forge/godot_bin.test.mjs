import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveGodotBin } from './godot_bin.mjs';

test('GODOT_BIN dans l env a la priorite', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gb-'));
  const fake = join(dir, 'godot.exe');
  writeFileSync(fake, 'x');
  const got = resolveGodotBin({ env: { GODOT_BIN: fake }, configPath: join(dir, 'absent.json') });
  assert.equal(got, fake);
});

test('fallback sur le fichier de config', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gb-'));
  const fake = join(dir, 'godot.exe');
  writeFileSync(fake, 'x');
  const cfg = join(dir, 'godot.config.json');
  writeFileSync(cfg, JSON.stringify({ godot_bin: fake }), 'utf-8');
  const got = resolveGodotBin({ env: {}, configPath: cfg });
  assert.equal(got, fake);
});

test('binaire declare mais absent du disque -> erreur actionnable', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gb-'));
  const cfg = join(dir, 'godot.config.json');
  writeFileSync(cfg, JSON.stringify({ godot_bin: join(dir, 'nope.exe') }), 'utf-8');
  assert.throws(
    () => resolveGodotBin({ env: {}, configPath: cfg }),
    /introuvable sur le disque/
  );
});

test('aucune source de configuration -> erreur qui explique quoi faire', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gb-'));
  assert.throws(
    () => resolveGodotBin({ env: {}, configPath: join(dir, 'absent.json') }),
    /GODOT_BIN|godot\.config\.json/
  );
});
