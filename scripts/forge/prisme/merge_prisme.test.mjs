// merge_prisme.test.mjs — jamais testé avant promotion (Tier 2 #6). Recombinaison
// mécanique du panel Prisme : union par critère charter cité, zéro LLM-arbitre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractCharterCriteria, citedTags, extractRulesSection, mergePrisme } from './merge_prisme.mjs';

const CHARTER = `objectif: >-
  Forger un jeu.

criteres_succes:
  - "SOLVABILITE PROUVEE : un bot gagne réellement."
  - "DETERMINISME : même seed, même résultat."
  - "PHYSIQUE STRICTE : rebond exact."

actions_interdites:
  - "Tricher."
`;

test('extractCharterCriteria extrait les 3 tags dans l\'ordre du charter', () => {
  const tags = extractCharterCriteria(CHARTER);
  assert.deepEqual(tags, ['SOLVABILITE PROUVEE', 'DETERMINISME', 'PHYSIQUE STRICTE']);
});

test('citedTags matche par sous-chaine insensible a la casse', () => {
  const tags = ['DETERMINISME', 'PHYSIQUE STRICTE'];
  const found = citedTags('Ce lens couvre le determinisme du jeu.', tags);
  assert.deepEqual(found, ['DETERMINISME']);
});

test('extractRulesSection isole le texte de la section 4 jusqu\'a Tracabilite', () => {
  const doc = `## 4. RÈGLES OBSERVABLES\n\n- **R1 — test.**\n\n## Traçabilité\n\nautre chose\n`;
  const rules = extractRulesSection(doc);
  assert.equal(rules, '- **R1 — test.**');
});

test('extractRulesSection retourne vide si section absente', () => {
  assert.equal(extractRulesSection('# rien ici'), '');
});

test('mergePrisme : couverture complete -> zero gap', () => {
  const { output, controlScopeTags, gaps } = mergePrisme({
    charterText: CHARTER,
    controlContent: 'Le controle couvre SOLVABILITE PROUVEE et DETERMINISME.',
    lenses: [
      { path: 'lens1.md', content: '## 4. RÈGLES OBSERVABLES\n\n- **R1 — solvabilite prouvee ici.**' },
      { path: 'lens2.md', content: '## 4. RÈGLES OBSERVABLES\n\n- **R2 — determinisme assure ici.**' },
    ],
  });
  assert.deepEqual(controlScopeTags, ['SOLVABILITE PROUVEE', 'DETERMINISME']);
  assert.deepEqual(gaps, []);
  assert.ok(output.includes('R1 — solvabilite'));
  assert.ok(output.includes('R2 — determinisme'));
});

test('mergePrisme : critere du controle non couvert par aucun lens -> GAP remonte, pas devine', () => {
  const { gaps, output } = mergePrisme({
    charterText: CHARTER,
    controlContent: 'Le controle couvre SOLVABILITE PROUVEE et PHYSIQUE STRICTE.',
    lenses: [
      { path: 'lens1.md', content: '## 4. RÈGLES OBSERVABLES\n\n- **R1 — solvabilite prouvee ici.**' },
    ],
  });
  assert.deepEqual(gaps, ['PHYSIQUE STRICTE']);
  assert.ok(output.includes('GAP'));
  assert.ok(output.includes('PHYSIQUE STRICTE'));
});

test('mergePrisme : un critere hors perimetre du controle n\'est jamais liste (pas de bruit)', () => {
  const { controlScopeTags } = mergePrisme({
    charterText: CHARTER,
    controlContent: 'Le controle ne couvre que SOLVABILITE PROUVEE.',
    lenses: [{ path: 'lens1.md', content: 'DETERMINISME et PHYSIQUE STRICTE ici aussi.' }],
  });
  assert.deepEqual(controlScopeTags, ['SOLVABILITE PROUVEE']);
});

test('mergePrisme : ne fusionne ni ne selectionne jamais un texte "meilleur" entre lenses (union verbatim)', () => {
  const { output } = mergePrisme({
    charterText: CHARTER,
    controlContent: 'SOLVABILITE PROUVEE.',
    lenses: [
      { path: 'lens-a.md', content: '## 4. RÈGLES OBSERVABLES\n\n- **R1 — version A du lens.**' },
      { path: 'lens-b.md', content: '## 4. RÈGLES OBSERVABLES\n\n- **R1 — version B, divergente, du lens.**' },
    ],
  });
  // les DEUX versions doivent survivre verbatim -- aucun arbitrage semantique.
  assert.ok(output.includes('version A du lens'));
  assert.ok(output.includes('version B, divergente'));
});
