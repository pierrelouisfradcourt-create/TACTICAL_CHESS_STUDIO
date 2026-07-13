// reuse_ratio.test.mjs — tests de reuse_ratio.mjs, avec un fixture jetable (pas de
// dépendance à un vrai jeu du repo — déterministe, isolé).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { measureReuseRatio } from './reuse_ratio.mjs';

function makeFixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'reuse-ratio-test-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content, 'utf-8');
  }
  return dir;
}

test('zéro import knowledge_base -> reuse_ratio == 0', () => {
  const dir = makeFixture({
    'game.mjs': "import { foo } from './level.mjs';\nexport function bar(){}\n",
    'level.mjs': 'export function foo(){}\n',
  });
  const result = measureReuseRatio(dir);
  assert.equal(result.reuseRatio, 0);
  assert.equal(result.reusedModules.length, 0);
  rmSync(dir, { recursive: true, force: true });
});

test('tous les fichiers importent la bibliothèque -> ratio calculé correctement', () => {
  const dir = makeFixture({
    'game.mjs': "import { a } from '../../knowledge_base/systems/x/a.mjs';\nimport { b } from '../../knowledge_base/systems/y/b.mjs';\n",
  });
  const result = measureReuseRatio(dir);
  // 1 fichier de logique, 2 modules KB réutilisés -> 2 / (1+2) = 0.667
  assert.equal(result.logicFiles.length, 1);
  assert.equal(result.reusedModules.length, 2);
  assert.ok(Math.abs(result.reuseRatio - 2 / 3) < 1e-9);
  rmSync(dir, { recursive: true, force: true });
});

test('les fichiers de harnais (main/server/e2e/run-oracle/solvability) sont EXCLUS du scan', () => {
  const dir = makeFixture({
    'game.mjs': "import { a } from '../../knowledge_base/systems/x/a.mjs';\n",
    'main.mjs': "import { spy } from '../../knowledge_base/systems/should-not-count.mjs';\n",
    'server.mjs': "import { spy2 } from '../../knowledge_base/systems/should-not-count-2.mjs';\n",
    'e2e.mjs': "import { spy3 } from '../../knowledge_base/systems/should-not-count-3.mjs';\n",
  });
  const result = measureReuseRatio(dir);
  assert.deepEqual(result.logicFiles, ['game.mjs']);
  assert.deepEqual(result.reusedModules, ['../../knowledge_base/systems/x/a.mjs']);
  rmSync(dir, { recursive: true, force: true });
});

test('les fichiers *.test.mjs sont EXCLUS du scan', () => {
  const dir = makeFixture({
    'game.mjs': 'export function f(){}\n',
    'game.test.mjs': "import { spy } from '../../knowledge_base/systems/should-not-count.mjs';\n",
  });
  const result = measureReuseRatio(dir);
  assert.deepEqual(result.logicFiles, ['game.mjs']);
  assert.equal(result.reusedModules.length, 0);
  rmSync(dir, { recursive: true, force: true });
});

test('un import externe (npm, ni local ni knowledge_base) n\'est compté dans aucune des deux catégories', () => {
  const dir = makeFixture({
    'game.mjs': "import chalk from 'chalk';\nexport function f(){}\n",
  });
  const result = measureReuseRatio(dir);
  assert.equal(result.reusedModules.length, 0);
  const externalImport = result.imports.find((i) => i.specifier === 'chalk');
  assert.equal(externalImport.classification, 'external');
  rmSync(dir, { recursive: true, force: true });
});

test('déterminisme : deux appels sur le même dossier donnent le même résultat', () => {
  const dir = makeFixture({
    'game.mjs': "import { a } from '../../knowledge_base/systems/x/a.mjs';\nimport { b } from './level.mjs';\n",
    'level.mjs': 'export function b(){}\n',
  });
  const a = measureReuseRatio(dir);
  const b = measureReuseRatio(dir);
  assert.deepEqual(a, b);
  rmSync(dir, { recursive: true, force: true });
});

test('vérifié contre un vrai jeu du repo (kb_tactics) : reuse_ratio == 2/6 == 0.333...', () => {
  // Ancrage à la réalité (pas seulement des fixtures synthétiques) — kb_tactics est le
  // seul jeu du repo qui importe réellement depuis knowledge_base/ à ce jour.
  const result = measureReuseRatio('games/kb_tactics');
  assert.deepEqual(result.logicFiles.sort(), ['game.mjs', 'input.mjs', 'level.mjs', 'render.mjs']);
  assert.equal(result.reusedModules.length, 2);
  assert.ok(Math.abs(result.reuseRatio - 2 / 6) < 1e-9, `attendu ~0.333, got ${result.reuseRatio}`);
});
