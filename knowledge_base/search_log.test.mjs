// search_log.test.mjs — tests de l'auto-journalisation de search.mjs (logSearchInvocation /
// searchLogSince). node --test, zéro réseau, zéro LLM. Fixtures éphémères dans un dossier
// tmp dédié (jamais knowledge_base/search_log.jsonl réel — on ne pollue pas le log de prod).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { logSearchInvocation, searchLogSince } from './search.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEARCH_MJS = resolve(__dirname, 'search.mjs');

function makeTmpDir() {
  return mkdtempSync(join(tmpdir(), 'kb-search-log-'));
}

test('logSearchInvocation : écrit une ligne JSONL avec query/matchCount/ts', () => {
  const dir = makeTmpDir();
  const logPath = join(dir, 'search_log.jsonl');
  logSearchInvocation('ennemi qui poursuit', 3, logPath);

  assert.ok(existsSync(logPath), 'le fichier de log doit exister après un appel');
  const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]);
  assert.equal(record.query, 'ennemi qui poursuit');
  assert.equal(record.matchCount, 3);
  assert.ok(record.ts, 'ts doit être présent');
  assert.equal(new Date(record.ts).toISOString(), record.ts, 'ts doit être ISO 8601');

  rmSync(dir, { recursive: true, force: true });
});

test('logSearchInvocation : appends (plusieurs appels = plusieurs lignes)', () => {
  const dir = makeTmpDir();
  const logPath = join(dir, 'search_log.jsonl');
  logSearchInvocation('a', 1, logPath);
  logSearchInvocation('b', 2, logPath);
  const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
  assert.equal(lines.length, 2);
  rmSync(dir, { recursive: true, force: true });
});

test('logSearchInvocation : écriture vers un chemin invalide ne lève jamais (silencieux)', () => {
  // Chemin sous un fichier existant (pas un dossier) : mkdirSync(dirname(...)) doit échouer,
  // et logSearchInvocation ne doit PAS propager l'exception — la recherche doit toujours
  // répondre même si le log échoue.
  const dir = makeTmpDir();
  const blockerFile = join(dir, 'not-a-dir');
  writeFileSync(blockerFile, 'x');
  const badLogPath = join(blockerFile, 'nested', 'search_log.jsonl');

  assert.doesNotThrow(() => logSearchInvocation('query', 0, badLogPath));

  rmSync(dir, { recursive: true, force: true });
});

test('searchLogSince : filtre correctement par date (avant exclu, après inclus)', () => {
  const dir = makeTmpDir();
  const logPath = join(dir, 'search_log.jsonl');
  const early = new Date(Date.now() - 60000).toISOString();
  appendFileSync(logPath, JSON.stringify({ query: 'vieille requete', matchCount: 1, ts: early }) + '\n');
  const threshold = new Date().toISOString();
  const later = new Date(Date.now() + 5000).toISOString();
  appendFileSync(logPath, JSON.stringify({ query: 'nouvelle requete', matchCount: 2, ts: later }) + '\n');

  const { count, entries } = searchLogSince(threshold, logPath);
  assert.equal(count, 1);
  assert.equal(entries[0].query, 'nouvelle requete');

  rmSync(dir, { recursive: true, force: true });
});

test('searchLogSince : fichier absent -> {count:0, entries:[]}, pas d\'exception', () => {
  const dir = makeTmpDir();
  const missing = join(dir, 'does-not-exist.jsonl');
  const result = searchLogSince(new Date().toISOString(), missing);
  assert.deepEqual(result, { count: 0, entries: [] });
  rmSync(dir, { recursive: true, force: true });
});

test('searchLogSince : ignore silencieusement une ligne JSON corrompue', () => {
  const dir = makeTmpDir();
  const logPath = join(dir, 'search_log.jsonl');
  writeFileSync(logPath, '{not valid json}\n' + JSON.stringify({ query: 'ok', matchCount: 1, ts: '2020-01-01T00:00:00.000Z' }) + '\n');
  const result = searchLogSince('2000-01-01T00:00:00.000Z', logPath);
  assert.equal(result.count, 1);
  assert.equal(result.entries[0].query, 'ok');
  rmSync(dir, { recursive: true, force: true });
});

test('appel CLI réel de search.mjs journalise bien une ligne dans le log', () => {
  const dir = makeTmpDir();
  const logPath = join(dir, 'search_log.jsonl');
  execFileSync(process.execPath, [SEARCH_MJS, 'zone de controle qui bloque un deplacement', '--log-path', logPath], {
    encoding: 'utf-8',
  });
  assert.ok(existsSync(logPath), 'le CLI doit avoir produit un fichier de log');
  const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
  assert.ok(lines.length >= 1);
  const record = JSON.parse(lines[lines.length - 1]);
  assert.equal(record.query, 'zone de controle qui bloque un deplacement');
  assert.ok(typeof record.matchCount === 'number');
  rmSync(dir, { recursive: true, force: true });
});
