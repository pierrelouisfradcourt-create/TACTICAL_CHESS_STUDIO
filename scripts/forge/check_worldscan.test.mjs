// check_worldscan.test.mjs — oracle structurel du dossier d'observation World Scan
// (GAME_REFERENCE/). Patron : scripts/forge/check_artbible.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  REQUIRED_FILES,
  isValidHttpUrl,
  validateSource,
  validateLoops,
  validateGameEntry,
  validateManifest,
  checkNoLocalMedia,
  listFilesRecursive,
  checkWorldScan,
} from './check_worldscan.mjs';

function goodSource(overrides = {}) {
  return { url: 'https://example.test/article', type: 'article', ...overrides };
}

function goodLoops(overrides = {}) {
  return {
    minute_1: 'le joueur choisit une unite et un objectif proche',
    minute_10: 'premiere boucle de ressources bouclee, premier arbitrage',
    hour_5: 'build complet, premiere synergie decouverte',
    endgame: 'classement/leaderboard et rejouabilite via seed',
    ...overrides,
  };
}

function goodGame(overrides = {}) {
  return {
    game: 'Into the Breach',
    sources: [
      goodSource({ url: 'https://example.test/a' }),
      goodSource({ url: 'https://example.test/b', type: 'wiki' }),
      goodSource({ url: 'https://example.test/c', type: 'video', timestamp: '00:12:34' }),
    ],
    loops: goodLoops(),
    retention_answer: 'le joueur revient pour battre son propre score sur une seed connue',
    ...overrides,
  };
}

function goodManifest(overrides = {}) {
  return {
    games: [goodGame(), goodGame({ game: 'FTL' })],
    advisory: true,
    ...overrides,
  };
}

async function makeValidFolder(dir) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'mechanics_analysis.md'), '# Mecaniques\n\nAnalyse suffisamment longue et non triviale des mecaniques observees.', 'utf-8');
  await writeFile(join(dir, 'progression_map.md'), '# Progression\n\nCarte de progression du joueur, paliers et debloquages observes.', 'utf-8');
  await writeFile(join(dir, 'economy_map.md'), '# Economie\n\nRessources, sinks et sources observees dans le jeu de reference.', 'utf-8');
  await writeFile(join(dir, 'ux_flow.md'), '# UX Flow\n\nEcrans traverses, boucle de menu, onboarding observe.', 'utf-8');
  await writeFile(join(dir, 'architecture_guess.md'), '# Architecture (hypothese)\n\nHypothese d architecture technique deduite de l observation externe.', 'utf-8');
  await writeFile(join(dir, 'observation_manifest.json'), JSON.stringify(goodManifest(), null, 2), 'utf-8');
}

// --- helpers unitaires ---

test('isValidHttpUrl : accepte http/https, rejette le reste', () => {
  assert.equal(isValidHttpUrl('https://example.test'), true);
  assert.equal(isValidHttpUrl('http://example.test'), true);
  assert.equal(isValidHttpUrl('ftp://example.test'), false);
  assert.equal(isValidHttpUrl('pas une url'), false);
  assert.equal(isValidHttpUrl(''), false);
  assert.equal(isValidHttpUrl(undefined), false);
});

test('validateSource : source bien formee => aucun finding', () => {
  assert.deepEqual(validateSource(goodSource(), 0, 0), []);
});

test('validateSource : url absente => finding', () => {
  const findings = validateSource({ type: 'article' }, 0, 0);
  assert.ok(findings.some((f) => f.includes('url')));
});

test('validateSource : type inconnu => finding', () => {
  const findings = validateSource(goodSource({ type: 'tweet' }), 0, 0);
  assert.ok(findings.some((f) => f.includes('type invalide')));
});

test('validateSource : video sans timestamp => finding', () => {
  const findings = validateSource(goodSource({ type: 'video' }), 0, 0);
  assert.ok(findings.some((f) => f.includes('timestamp')));
});

test('validateSource : video avec timestamp => aucun finding', () => {
  const findings = validateSource(goodSource({ type: 'video', timestamp: '00:01:00' }), 0, 0);
  assert.deepEqual(findings, []);
});

test('validateLoops : 4 cles non vides => aucun finding', () => {
  assert.deepEqual(validateLoops(goodLoops(), 0), []);
});

test('validateLoops : une cle vide => finding cible', () => {
  const findings = validateLoops(goodLoops({ hour_5: '' }), 0);
  assert.ok(findings.some((f) => f.includes('hour_5')));
});

test('validateLoops : objet absent => finding', () => {
  const findings = validateLoops(null, 0);
  assert.ok(findings.length > 0);
});

test('validateGameEntry : jeu bien forme => aucun finding', () => {
  assert.deepEqual(validateGameEntry(goodGame(), 0), []);
});

test('validateGameEntry : moins de 3 sources => finding', () => {
  const findings = validateGameEntry(goodGame({ sources: [goodSource()] }), 0);
  assert.ok(findings.some((f) => f.includes('sources')));
});

test('validateGameEntry : retention_answer vide => finding', () => {
  const findings = validateGameEntry(goodGame({ retention_answer: '' }), 0);
  assert.ok(findings.some((f) => f.includes('retention_answer')));
});

test('validateManifest : manifest bien forme => aucun finding', () => {
  assert.deepEqual(validateManifest(goodManifest()), []);
});

test('validateManifest : moins de 2 jeux => finding', () => {
  const findings = validateManifest(goodManifest({ games: [goodGame()] }));
  assert.ok(findings.some((f) => f.includes('minimum 2')));
});

test('validateManifest : advisory absent ou false => finding', () => {
  const findingsAbsent = validateManifest(goodManifest({ advisory: undefined }));
  assert.ok(findingsAbsent.some((f) => f.includes('advisory')));
  const findingsFalse = validateManifest(goodManifest({ advisory: false }));
  assert.ok(findingsFalse.some((f) => f.includes('advisory')));
});

test('checkNoLocalMedia : detecte les extensions interdites, ignore le reste', () => {
  const files = ['mechanics_analysis.md', 'ref/shot.png', 'notes.txt', 'clip.mp4'];
  const found = checkNoLocalMedia(files);
  assert.deepEqual(found.sort(), ['clip.mp4', 'ref/shot.png']);
});

// --- bout-en-bout : checkWorldScan sur un vrai dossier temporaire ---

test('checkWorldScan : dossier complet et valide => OK, exit implicite 0', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worldscan_valid_'));
  try {
    await makeValidFolder(dir);
    const result = await checkWorldScan(dir);
    assert.equal(result.verdict, 'OK');
    assert.equal(result.ok, true);
    assert.deepEqual(result.problems, []);
    assert.equal(result.stats.games, 2);
    assert.equal(result.stats.sources_total, 6);
    assert.equal(result.stats.files_checked, REQUIRED_FILES.length);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkWorldScan : fichier requis manquant => FAIL', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worldscan_missingfile_'));
  try {
    await makeValidFolder(dir);
    await rm(join(dir, 'economy_map.md'));
    const result = await checkWorldScan(dir);
    assert.equal(result.verdict, 'FAIL');
    assert.ok(result.problems.some((p) => p.includes('economy_map.md')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkWorldScan : fichier requis present mais vide => FAIL', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worldscan_emptyfile_'));
  try {
    await makeValidFolder(dir);
    await writeFile(join(dir, 'ux_flow.md'), '   \n  ', 'utf-8');
    const result = await checkWorldScan(dir);
    assert.equal(result.verdict, 'FAIL');
    assert.ok(result.problems.some((p) => p.includes('ux_flow.md') && p.includes('vide')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkWorldScan : observation_manifest.json JSON invalide => FAIL', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worldscan_badjson_'));
  try {
    await makeValidFolder(dir);
    await writeFile(join(dir, 'observation_manifest.json'), '{ceci n\'est pas du json}', 'utf-8');
    const result = await checkWorldScan(dir);
    assert.equal(result.verdict, 'FAIL');
    assert.ok(result.problems.some((p) => p.includes('JSON invalide')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkWorldScan : moins de 2 jeux analyses => FAIL', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worldscan_onegame_'));
  try {
    await makeValidFolder(dir);
    await writeFile(join(dir, 'observation_manifest.json'), JSON.stringify(goodManifest({ games: [goodGame()] })), 'utf-8');
    const result = await checkWorldScan(dir);
    assert.equal(result.verdict, 'FAIL');
    assert.ok(result.problems.some((p) => p.includes('minimum 2')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkWorldScan : source sans url => FAIL', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worldscan_nourl_'));
  try {
    await makeValidFolder(dir);
    const badGame = goodGame({ sources: [goodSource({ url: undefined }), goodSource({ url: 'https://example.test/b' }), goodSource({ url: 'https://example.test/c' })] });
    await writeFile(join(dir, 'observation_manifest.json'), JSON.stringify(goodManifest({ games: [badGame, goodGame({ game: 'FTL' })] })), 'utf-8');
    const result = await checkWorldScan(dir);
    assert.equal(result.verdict, 'FAIL');
    assert.ok(result.problems.some((p) => p.includes('url manquante ou invalide')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkWorldScan : source video sans timestamp => FAIL', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worldscan_novideots_'));
  try {
    await makeValidFolder(dir);
    const badGame = goodGame({ sources: [goodSource({ type: 'video' }), goodSource({ url: 'https://example.test/b' }), goodSource({ url: 'https://example.test/c' })] });
    await writeFile(join(dir, 'observation_manifest.json'), JSON.stringify(goodManifest({ games: [badGame, goodGame({ game: 'FTL' })] })), 'utf-8');
    const result = await checkWorldScan(dir);
    assert.equal(result.verdict, 'FAIL');
    assert.ok(result.problems.some((p) => p.includes('timestamp')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkWorldScan : loops vide => FAIL', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worldscan_emptyloops_'));
  try {
    await makeValidFolder(dir);
    const badGame = goodGame({ loops: goodLoops({ minute_1: '', minute_10: '', hour_5: '', endgame: '' }) });
    await writeFile(join(dir, 'observation_manifest.json'), JSON.stringify(goodManifest({ games: [badGame, goodGame({ game: 'FTL' })] })), 'utf-8');
    const result = await checkWorldScan(dir);
    assert.equal(result.verdict, 'FAIL');
    assert.ok(result.problems.some((p) => p.includes('loops') && p.includes('minute_1')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkWorldScan : media local present (png) => FAIL, meme si le manifest est valide', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worldscan_media_'));
  try {
    await makeValidFolder(dir);
    await mkdir(join(dir, 'shots'), { recursive: true });
    await writeFile(join(dir, 'shots', 'capture.png'), Buffer.from([137, 80, 78, 71]), 'utf-8');
    const result = await checkWorldScan(dir);
    assert.equal(result.verdict, 'FAIL');
    assert.ok(result.problems.some((p) => p.includes('media local interdit') && p.includes('capture.png')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkWorldScan : dossier inexistant => FAIL, jamais une exception', async () => {
  const result = await checkWorldScan(join(tmpdir(), 'worldscan_does_not_exist_xyz'));
  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.ok, false);
  assert.ok(result.problems[0].includes('illisible'));
});

test('listFilesRecursive : liste les fichiers en sous-dossiers', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'worldscan_listfiles_'));
  try {
    await mkdir(join(dir, 'sub'), { recursive: true });
    await writeFile(join(dir, 'a.md'), 'x', 'utf-8');
    await writeFile(join(dir, 'sub', 'b.md'), 'y', 'utf-8');
    const files = await listFilesRecursive(dir);
    assert.deepEqual(files.sort(), ['a.md', 'sub/b.md']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
