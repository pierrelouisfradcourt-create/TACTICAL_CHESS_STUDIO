// check_artbible.test.mjs — oracle structurel de l'Art Director (contrat s2.5-artbible.yaml).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFrontmatter,
  splitSections,
  checkArtBibleMarkdown,
  checkAssetRequestsShape,
  checkArtBible,
} from './check_artbible.mjs';

const GOOD_BIBLE = `---
styles: [flat-top-down, gritty]
mood_keywords: [tense, industrial, minimal]
---

## 1. IDENTITÉ VISUELLE

Style top-down plat, palette froide desaturee, silhouettes lisibles à distance.
Références : Kenney top-down shooter pour la lisibilité des unités.

## 2. RATIONALE

Le product_snapshot decrit un jeu tactique de survie sous tension — la palette
froide et les silhouettes nettes servent la lisibilité tactique avant tout.
`;

function goodRequest(overrides = {}) {
  return {
    type: 'sprite',
    style: 'flat-top-down',
    references: [],
    constraints: { format: '2D', runtime: 'html', license_allowed: [], genre: ['tactical'], max_size_kb: null },
    acceptance_tests: [{ check: 'resolved' }],
    ...overrides,
  };
}

test('parseFrontmatter lit styles/mood_keywords en listes inline', () => {
  const fm = parseFrontmatter(GOOD_BIBLE);
  assert.deepEqual(fm.styles, ['flat-top-down', 'gritty']);
  assert.deepEqual(fm.mood_keywords, ['tense', 'industrial', 'minimal']);
});

test('parseFrontmatter retourne null si absent', () => {
  assert.equal(parseFrontmatter('## 1. IDENTITÉ VISUELLE\ntexte'), null);
});

test('splitSections trouve les 2 sections requises', () => {
  const sections = splitSections(GOOD_BIBLE);
  assert.ok(sections.has('identite_visuelle'));
  assert.ok(sections.has('rationale'));
});

test('checkArtBibleMarkdown : bible bien formee => aucun finding', () => {
  const { findings, styles } = checkArtBibleMarkdown(GOOD_BIBLE);
  assert.deepEqual(findings, []);
  assert.deepEqual(styles, ['flat-top-down', 'gritty']);
});

test('checkArtBibleMarkdown : frontmatter absent => finding', () => {
  const { findings } = checkArtBibleMarkdown('## 1. IDENTITÉ VISUELLE\ntexte suffisamment long pour passer le seuil minimal ici.\n\n## 2. RATIONALE\ntexte suffisamment long pour passer le seuil minimal aussi ici.');
  assert.ok(findings.some((f) => f.includes('frontmatter')));
});

test('checkArtBibleMarkdown : section trop courte => finding', () => {
  const bad = GOOD_BIBLE.replace(/Le product_snapshot[\s\S]*tactique avant tout\./, 'trop court');
  const { findings } = checkArtBibleMarkdown(bad);
  assert.ok(findings.some((f) => f.includes('trop courte')));
});

test('checkArtBibleMarkdown : placeholder detecte', () => {
  const bad = GOOD_BIBLE.replace('Rationale', 'Rationale').replace('tension', 'à définir');
  const { findings } = checkArtBibleMarkdown(bad);
  assert.ok(findings.some((f) => f.includes('placeholder')));
});

test('checkAssetRequestsShape : requete valide + style declare => aucun finding', () => {
  const doc = { requests: [goodRequest()], no_assets_needed: false, reason: null };
  const findings = checkAssetRequestsShape(doc, ['flat-top-down']);
  assert.deepEqual(findings, []);
});

test('checkAssetRequestsShape : style non declare dans la bible => finding', () => {
  const doc = { requests: [goodRequest({ style: 'pixel-art' })], no_assets_needed: false, reason: null };
  const findings = checkAssetRequestsShape(doc, ['flat-top-down']);
  assert.ok(findings.some((f) => f.includes('non declare')));
});

test('checkAssetRequestsShape : requete malformee remontee via validateRequestShape (pas duplique)', () => {
  const bad = goodRequest();
  delete bad.type;
  const doc = { requests: [bad], no_assets_needed: false, reason: null };
  const findings = checkAssetRequestsShape(doc, ['flat-top-down']);
  assert.ok(findings.some((f) => f.includes('requests[0]')));
});

test('checkAssetRequestsShape : no_assets_needed=true coherent (requests=[], reason rempli)', () => {
  const doc = { requests: [], no_assets_needed: true, reason: 'jeu textuel, aucun asset visuel requis' };
  assert.deepEqual(checkAssetRequestsShape(doc, []), []);
});

test('checkAssetRequestsShape : no_assets_needed=true mais requests non vide => incoherent', () => {
  const doc = { requests: [goodRequest()], no_assets_needed: true, reason: 'texte' };
  const findings = checkAssetRequestsShape(doc, ['flat-top-down']);
  assert.ok(findings.some((f) => f.includes('incoherente')));
});

test('checkAssetRequestsShape : requests vide sans declaration explicite => finding (pas un oubli silencieux)', () => {
  const doc = { requests: [], no_assets_needed: false, reason: null };
  const findings = checkAssetRequestsShape(doc, []);
  assert.ok(findings.some((f) => f.includes('declarez explicitement')));
});

test('checkArtBible bout-en-bout : bible+requests valides => pass, stats advisory calculees', async () => {
  const fakeCatalog = {
    catalog_version: 1,
    entries: [
      {
        entry_type: 'asset', asset_id: 'asset-t', source: 's', license: 'CC0-1.0',
        provenance_url: 'https://example.test', style: 'flat-top-down', genre: ['tactical'],
        biome: null, format: '2D', size_kb: 1, sha256: 'a'.repeat(64), runtime: 'html',
        ingested: true, path: 'knowledge_base/assets/characters/kenney_survivor1_stand.png',
        usage_examples: [], tier: 'candidate',
      },
    ],
  };
  const tmpDir = await import('node:os').then((m) => m.tmpdir());
  const { writeFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const biblePath = join(tmpDir, 'test_art_bible.md');
  const reqPath = join(tmpDir, 'test_asset_requests.json');
  await writeFile(biblePath, GOOD_BIBLE, 'utf-8');
  await writeFile(reqPath, JSON.stringify({ requests: [goodRequest()], no_assets_needed: false, reason: null }), 'utf-8');

  const result = await checkArtBible(biblePath, reqPath, fakeCatalog);
  assert.equal(result.pass, true);
  assert.equal(result.resolution_stats.total, 1);
  assert.equal(result.resolution_stats.ok, 1);
});

test('checkArtBible : fichier manquant => pass false, jamais une exception', async () => {
  const result = await checkArtBible('/inexistant/art_bible.md', '/inexistant/asset_requests.json', null);
  assert.equal(result.pass, false);
  assert.ok(result.findings[0].includes('illisible'));
});
