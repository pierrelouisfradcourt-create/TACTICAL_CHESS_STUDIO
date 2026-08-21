# Profil `full_godot_narratif` + sonde de traversée amont — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

*Date : 2026-08-21 · Source : session Fable (poste de commande), décision Pierre 2026-08-21 (choix (b), réf. Cookie Clicker + Neko Atsume, branche `master`).*

**Goal:** Permettre le run Kitten Clicker comme test d'autonomie de la Forge : un profil de chaîne qui fait **réellement consommer** Story Bible (s2.6) et GM World Scan (s2.7) par le Prisme (s1) et la décompo (s3), et une sonde déterministe qui **mesure** jusqu'où les 6 faits amont (conditions de victoire / défaite, objectifs joueur, progression, boucles de récompense, contraintes narratives) traversent Prisme → Grey Blocks → WireMap → Build.

**Architecture:** Aucune station neuve, aucun oracle assoupli. (1) Un tuple de plus dans `PROFILES` (composition d'étapes existantes). (2) Deux entrées étendues dans la table d'injection `_UPSTREAM_BY_STEP` (ses DEUX copies). (3) Le champ `reference` des exigences EXPECTED du Prisme devient **adressable** (`worldscan:…`, `story_bible:…`, `gm_worldscan:…`) — règle de contrat, validée par la sonde, pas par l'oracle (règle de variance : on mesure d'abord). (4) Une sonde Node déterministe `check_amont_traversal.mjs` qui suit la chaîne de provenance déjà existante `prisme.exigences[].reference → featuremap.leaf.source_ref → wiremap.lines[].couvre → fichiers`, attachée en **advisory** au reçu de `s10c-oracle-wiremap`.

**Tech Stack:** Python 3.12 (`.venv312`, pytest), Node (`node --test`), YAML contrats Forge.

## Global Constraints

- **Jamais `git commit`/`git push`** : gate Pierre explicite. Les étapes « commit » sont remplacées par une vérification `git diff --stat`.
- **Aucune nouvelle station / aucun nouveau contrat d'agent** (décision Pierre 2026-08-21).
- `claim_verdict: NO_CLAIM_ALLOWED` dans tout artefact produit.
- La sonde ne rend **jamais OK/FAIL** : `verdict: "ADVISORY"` — une métrique doit prouver sa variance avant de classer (ratifié 2026-07-21).
- Oracles existants (`check_decompo.mjs`, `upstream_schema.mjs`, `check_wiremap`) : **non modifiés**.
- `tests/**` racine = zone protégée (ne pas toucher) ; les tests de ce plan vivent dans `scripts/forge/tests/` (Python) et `scripts/forge/*.test.mjs` (Node), comme l'existant.
- Encodage : `encoding="utf-8"` explicite sur tout `open()` Python ; chemins relatifs au repo.
- Python : `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/<fichier> -q`. Node : `node --test scripts/forge/<fichier>.test.mjs`.
- Le dépôt est sur la branche `publish` ; tous les fichiers touchés sont **identiques** à `master` (vérifié 2026-08-21), les modifications traverseront le `checkout master` (fait par Pierre, sentinelle `.claude/HUMAN_GIT_OVERRIDE.json`).

---

## File Structure

| Fichier | Rôle |
|---|---|
| Modify `scripts/forge/dispatch.py` (~l.345 `PROFILES`, ~l.381 `PROFILE_STEP_TIMEOUTS_S`) | nouveau profil `full_godot_narratif` + timeout builder |
| Modify `scripts/forge/run_real.py:1448-1464` et `scripts/forge/context_manifest.py:61-85` | `_UPSTREAM_BY_STEP` : s1 et s3 reçoivent s2.6 + s2.7 (copies strictement identiques) |
| Modify `scripts/forge/contracts/s1-prisme.yaml` (`mandatory_read` l.17, `output_contract` l.110) | lit story_bible/gm_worldscan ; `reference` adressable |
| Modify `scripts/forge/contracts/s3-decompo.yaml` (`mandatory_read` l.22) | lit story_bible/gm_worldscan |
| Create `scripts/forge/check_amont_traversal.mjs` | sonde déterministe (lib + CLI) |
| Create `scripts/forge/check_amont_traversal.test.mjs` | tests de la sonde |
| Modify `scripts/forge/driver.py:2332-2355` (`_run_wiremap_oracle`) | attache `amont_traversal` advisory au détail de s10c |
| Create `scripts/forge/tests/test_profile_full_godot_narratif.py` | profil + table amont |
| Create `scripts/forge/tests/test_driver_amont_traversal_advisory.py` | câblage driver fail-soft |
| Create `lab/forge_runs/kitten_clicker/tasks.json` + `design_intent.md` | entrées du run (pas de lancement dans ce plan) |

---

### Task 1 : Profil `full_godot_narratif`

**Files:**
- Modify: `scripts/forge/dispatch.py` (dict `PROFILES`, juste après l'entrée `"full_godot"`, ~l.360 ; dict `PROFILE_STEP_TIMEOUTS_S`, ~l.390)
- Test: `scripts/forge/tests/test_profile_full_godot_narratif.py`

**Interfaces:**
- Produces: `PROFILES["full_godot_narratif"]` (tuple de 16 étapes) ; `step_timeout_for("full_godot_narratif", "s9-build-godot-standard", default) == 5400.0`.

- [ ] **Step 1 : Écrire le test qui échoue**

```python
# scripts/forge/tests/test_profile_full_godot_narratif.py
"""Profil full_godot_narratif (décision Pierre 2026-08-21, choix (b)) : composition
d'étapes EXISTANTES pour que s2.6 (Story Bible) et s2.7 (GM World Scan) soient
produites AVANT le Prisme et la décompo, et injectées dans leurs prompts."""
from forge.dispatch import (
    DEDICATED_PROFILE_STEPS, ORDER, PROFILES, order_for_profile, step_timeout_for,
)


def test_le_profil_existe_et_compose_uniquement_des_etapes_existantes():
    steps = PROFILES["full_godot_narratif"]
    assert set(steps).issubset(set(ORDER) | set(DEDICATED_PROFILE_STEPS))


def test_s26_et_s27_precedent_s1_et_s3():
    steps = list(PROFILES["full_godot_narratif"])
    i = {s: steps.index(s) for s in steps}
    assert i["s2-worldscan"] < i["s2.6-story-bible"] < i["s1-prisme"]
    assert i["s2-worldscan"] < i["s2.7-gm-worldscan"] < i["s1-prisme"]
    assert i["s1-prisme"] < i["s3-decompo"] < i["s5-wiremap"]
    assert i["s0-contrat"] == 0  # charter AVANT s2.6 : mesuré 0/8 -> 7/8 GROUNDED (dispatch.py)


def test_le_profil_est_full_godot_plus_les_deux_stations_amont():
    attendu = list(PROFILES["full_godot"])
    k = attendu.index("s1-prisme")
    attendu[k:k] = ["s2.6-story-bible", "s2.7-gm-worldscan"]
    assert list(PROFILES["full_godot_narratif"]) == attendu
    assert order_for_profile("full_godot_narratif") == attendu


def test_le_builder_garde_le_timeout_mesure_de_full_godot():
    assert step_timeout_for("full_godot_narratif", "s9-build-godot-standard", 1.0) == 5400.0
    assert step_timeout_for("full_godot_narratif", "s3-decompo", 1.0) == 1.0
```

- [ ] **Step 2 : Vérifier qu'il échoue**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_profile_full_godot_narratif.py -q`
Expected: 4 FAIL avec `KeyError: 'full_godot_narratif'`.

- [ ] **Step 3 : Implémenter**

Dans `scripts/forge/dispatch.py`, immédiatement après le tuple `"full_godot": (...)`, ajouter :

```python
    # full_godot_narratif (décision Pierre 2026-08-21, choix (b)) — COMPOSITION, aucune
    # station neuve : `full_godot` + les deux stations amont dédiées s2.6 (Story Bible)
    # et s2.7 (GM World Scan), placées APRÈS s0+s2 (mesuré : charter+worldscan ->
    # 7/8 GROUNDED, cf. amont_narratif_charte) et AVANT s1-prisme, qui est « le
    # mécanisme qui transforme la connaissance externe en exigences ». Consommation :
    # `_UPSTREAM_BY_STEP` (run_real/context_manifest) injecte les deux artefacts dans
    # s1 ET s3 ; la traversée jusqu'au build est MESURÉE par check_amont_traversal.mjs
    # (advisory, attaché au reçu s10c) — jamais supposée.
    "full_godot_narratif": (
        "s0-contrat",
        "s2-worldscan",
        "s2.6-story-bible",
        "s2.7-gm-worldscan",
        "s1-prisme",
        "s3-decompo",
        "s4-archi",
        "s5-wiremap",
        "s6-redteam-plan",
        "s9-build-godot-standard",
        "s10a-oracle-code",
        "s10b-oracle-archi",
        "s10c-oracle-wiremap",
        "s10s-oracle-standard",
        "s11-redteam-code",
        "s12-verdict",
    ),
```

Dans `PROFILE_STEP_TIMEOUTS_S`, après la ligne `("full_godot", "s9-build-godot-standard"): 5400.0,` :

```python
    # full_godot_narratif : MÊME builder, MÊME point de mesure (breakout_v2-run1).
    ("full_godot_narratif", "s9-build-godot-standard"): 5400.0,
```

- [ ] **Step 4 : Vérifier que tout passe, y compris les invariants existants**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_profile_full_godot_narratif.py scripts/forge/tests/test_dispatch.py scripts/forge/tests/test_standard_step_wiring.py -q`
Expected: tout PASS (le CLI dérive ses `choices` de `PROFILES`, test_standard_step_wiring l.171-177).

- [ ] **Step 5 : Dry-run réel**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m forge.dispatch --dry-run --profile full_godot_narratif`
Expected: 16 étapes listées, aucune `ContractIncomplete`/`RoleUnresolved`.

- [ ] **Step 6 : Pas de commit** — `git diff --stat` doit ne montrer que `dispatch.py` + le nouveau test.

---

### Task 2 : s1 et s3 reçoivent Story Bible + GM World Scan

**Files:**
- Modify: `scripts/forge/run_real.py:1448-1464` (`_UPSTREAM_BY_STEP`)
- Modify: `scripts/forge/context_manifest.py:61-85` (copie stricte)
- Modify: `scripts/forge/contracts/s1-prisme.yaml` (`mandatory_read` l.17-19 ; `output_contract` l.110-112)
- Modify: `scripts/forge/contracts/s3-decompo.yaml` (`mandatory_read` l.22-26)
- Test: `scripts/forge/tests/test_profile_full_godot_narratif.py` (ajout)

**Interfaces:**
- Produces: `_UPSTREAM_BY_STEP["s1-prisme"] == ("artifacts/s2-worldscan.txt", "artifacts/s2.6-story-bible.txt", "artifacts/s2.7-gm-worldscan.txt")` ; `_UPSTREAM_BY_STEP["s3-decompo"]` = les 3 actuels + les 2 mêmes. Fichiers absents → omis (comportement existant de `upstream_artifacts_section`), donc les autres profils ne changent pas.
- Convention de `reference` (consommée par la sonde de la Task 3) : pour `source: EXPECTED`, `reference` commence par `worldscan:`, `story_bible:` ou `gm_worldscan:` suivi d'une adresse — chemin concret (`worldscan:games[0].objectives[0].victory_condition`, `worldscan:games[0].loops.minute_10`) ou raccourci par id (`gm_worldscan:progression`, `story_bible:stakes`).

- [ ] **Step 1 : Ajouter les tests qui échouent**

À la fin de `scripts/forge/tests/test_profile_full_godot_narratif.py` :

```python
from forge import context_manifest, run_real

_AMONT_NARRATIF = ("artifacts/s2.6-story-bible.txt", "artifacts/s2.7-gm-worldscan.txt")


def test_le_prisme_et_la_decompo_recoivent_story_bible_et_gm_worldscan():
    for table in (run_real._UPSTREAM_BY_STEP, context_manifest._UPSTREAM_BY_STEP):
        assert table["s1-prisme"] == ("artifacts/s2-worldscan.txt",) + _AMONT_NARRATIF
        assert table["s3-decompo"] == (
            "charter.yaml", "artifacts/s1-prisme.txt", "artifacts/s2-worldscan.txt",
        ) + _AMONT_NARRATIF
    assert run_real._UPSTREAM_BY_STEP == context_manifest._UPSTREAM_BY_STEP


def test_les_artefacts_amont_absents_sont_omis_sans_erreur(tmp_path):
    # un run `full` (sans s2.6/s2.7) ne doit pas changer : section construite
    # uniquement depuis ce qui existe.
    (tmp_path / "artifacts").mkdir()
    (tmp_path / "artifacts" / "s2-worldscan.txt").write_text("WS", encoding="utf-8")
    section = run_real.upstream_artifacts_section("s1-prisme", tmp_path)
    assert "s2-worldscan.txt" in section
    assert "s2.6-story-bible.txt" not in section


def test_les_contrats_s1_et_s3_declarent_la_lecture_des_deux_artefacts():
    from pathlib import Path
    import yaml
    for nom in ("s1-prisme", "s3-decompo"):
        c = yaml.safe_load(Path(f"scripts/forge/contracts/{nom}.yaml").read_text(encoding="utf-8"))
        joined = " ".join(c["mandatory_read"])
        assert "story_bible.json" in joined and "gm_worldscan.json" in joined, nom
    s1 = Path("scripts/forge/contracts/s1-prisme.yaml").read_text(encoding="utf-8")
    for prefixe in ("worldscan:", "story_bible:", "gm_worldscan:"):
        assert prefixe in s1, f"le contrat s1 doit rendre `reference` adressable ({prefixe})"
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_profile_full_godot_narratif.py -q`
Expected: 3 nouveaux FAIL (tuples différents / préfixes absents).

- [ ] **Step 3 : Étendre la table — dans les DEUX fichiers, texte identique**

Dans `scripts/forge/run_real.py` ET `scripts/forge/context_manifest.py`, remplacer les entrées `"s1-prisme"` et `"s3-decompo"` par :

```python
    # Choix (b) Pierre 2026-08-21 : le Prisme reçoit AUSSI la Story Bible (s2.6) et
    # le GM World Scan (s2.7) quand ils existent (profil full_godot_narratif) — c'est
    # par les exigences du Prisme que leur information atteint la décompo sans
    # assouplir la règle `source_ref -> exigence` de check_decompo. Fichier absent
    # (profil `full`) => omis par upstream_artifacts_section, comportement inchangé.
    "s1-prisme": ("artifacts/s2-worldscan.txt", "artifacts/s2.6-story-bible.txt",
                  "artifacts/s2.7-gm-worldscan.txt"),
    ...
    "s3-decompo": ("charter.yaml", "artifacts/s1-prisme.txt", "artifacts/s2-worldscan.txt",
                   "artifacts/s2.6-story-bible.txt", "artifacts/s2.7-gm-worldscan.txt"),
```

(Conserver les commentaires existants de chaque copie ; seules les valeurs des tuples changent, et elles doivent être **identiques** dans les deux fichiers — `test_context_manifest.py` porte le test d'égalité.)

- [ ] **Step 4 : Contrat s1-prisme**

`mandatory_read` (l.17-19) devient :

```yaml
mandatory_read:
  - scripts/forge/contracts/SCHEMA.md
  - "charter.yaml produit par l'étape 0"
  - "story_bible.json (s2.6) et gm_worldscan.json (s2.7) S'ILS SONT PRÉSENTS dans le run_dir : ce sont des SOURCES d'exigences au même titre que le World Scan (profil full_godot_narratif) ; absents => tu le dis, tu ne compenses pas"
```

Dans `output_contract`, remplacer la phrase des RÈGLES DURES sur `reference` (l.110-112, « `source` vaut EXPECTED (vu dans le World Scan -> `reference` = la source citée, non vide) ») par :

```
  RÈGLES DURES : `source` vaut EXPECTED (vu dans un artefact amont -> `reference`
  est une ADRESSE, jamais une prose : `worldscan:<chemin>` (ex.
  `worldscan:games[0].objectives[0].victory_condition`,
  `worldscan:games[0].loops.minute_10`), `story_bible:<id de section>` (ex.
  `story_bible:stakes`), `gm_worldscan:<id de dimension>` (ex.
  `gm_worldscan:progression`) — la sonde check_amont_traversal.mjs RÉSOUT chaque
  adresse dans l'artefact ; une adresse qui ne résout rien compte comme
  référence non résolue, mesurée et reportée) ou ADDITIONS (ta proposition ->
  `reference` vaut
```

(Garder la suite de la phrase existante telle quelle.)

- [ ] **Step 5 : Contrat s3-decompo**

`mandatory_read` (l.22-26) : ajouter une ligne :

```yaml
  - "story_bible.json (s2.6) et gm_worldscan.json (s2.7) S'ILS SONT PRÉSENTS dans le run_dir (profil full_godot_narratif) : les contraintes narratives et les dimensions de calibration (progression, economy, bonus…) y vivent — une feuille qui les réalise cite l'exigence du Prisme qui les porte (source_ref), jamais l'artefact directement"
```

- [ ] **Step 6 : Vérifier**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_profile_full_godot_narratif.py scripts/forge/tests/test_context_manifest.py scripts/forge/tests/test_contract_sync.py -q`
Expected: PASS. Puis `PYTHONPATH=scripts .venv312/Scripts/python.exe -m forge.dispatch --dry-run --profile full_godot_narratif` → toujours 16 étapes, aucun `ContractIncomplete` (le validateur de contrat relit les YAML).

- [ ] **Step 7 : Pas de commit** — `git diff --stat` : 4 fichiers modifiés + 1 test.

---

### Task 3 : Sonde `check_amont_traversal.mjs`

**Files:**
- Create: `scripts/forge/check_amont_traversal.mjs`
- Test: `scripts/forge/check_amont_traversal.test.mjs`

**Interfaces:**
- Consumes: `collectLeaves(doc)` de `./upstream_schema.mjs` (retourne `[{systeme, feature, leaf, loc}]`).
- Produces (lib) : `factAddresses(artifacts)`, `canonicalize(reference, artifacts)`, `traverse(artifacts, gameDir|null)`, `loadRunDir(runDir)`. `artifacts = {worldscan, story_bible, gm_worldscan, prisme, featuremap, wiremap}` (objets parsés ou `null`).
- Produces (CLI) : `node scripts/forge/check_amont_traversal.mjs <run_dir> [--game-dir <dir>] [--json]`, exit 0 toujours (2 = usage). Sortie JSON :
  `{facts: {<fait>: {produced, addresses[], exigences[], leaves[], lines[], files_present: bool|null, reached}}, references: {expected, adressables, resolues, non_resolues[{id, reference}]}, stages: [...], verdict: "ADVISORY", claim_verdict: "NO_CLAIM_ALLOWED"}`
  `reached ∈ NOT_PRODUCED | PRODUCED | PRISME | GREY_BLOCKS | WIREMAP | BUILD`.

- [ ] **Step 1 : Écrire les tests qui échouent**

```js
// scripts/forge/check_amont_traversal.test.mjs
// node --test scripts/forge/check_amont_traversal.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  factAddresses, canonicalize, traverse, loadRunDir, STAGES,
} from './check_amont_traversal.mjs';

function worldscan() {
  return { games: [{ game: 'Cookie Clicker', loops: { minute_1: 'click', minute_10: 'buy grandma' },
    objectives: [{ mode: 'endless', victory_condition: null, defeat_condition: null,
      player_goal: 'maximise cookies' },
      { mode: 'ascension', victory_condition: 'reach 1e12 cookies', defeat_condition: 'none', player_goal: 'prestige' }] }] };
}
function gm() {
  return { genre: 'clicker', games_observed: [], dimensions: [
    { id: 'progression', status: 'MEASURED', variables: [{ name: 'tiers', value: '10' }] },
    { id: 'bonus', status: 'NOT_MEASURED', variables: [] }] };
}
function story() {
  return { game_id: 'kc', inputs_recus: { worldscan: true, charter: true }, sections: [
    { id: 'stakes', status: 'GROUNDED', reason: null, elements: [{ statement: 'refuge', source: 'charter', ref: 'objectif', inferred: false }] },
    { id: 'chronology', status: 'NOT_GROUNDED', reason: 'rien', elements: [] }] };
}
function prisme(refs) {
  return { game_id: 'kc', exigences: refs.map((reference, i) => ({
    id: `EX${i}`, source: 'EXPECTED', source_role: 'gd', reference,
    observation: 'o', claim: 'c', enonce: 'e',
    expected_proof: { kind: 'oracle', statement: 's' }, destination: 's3-decompo' })) };
}
function featuremap(leafToEx) {
  return { game_id: 'kc', systemes: [{ id: 'S', features: [{ id: 'F', capacites:
    Object.entries(leafToEx).map(([id, source_ref]) => ({ id, capacite: id, source_ref,
      expected_proof: { kind: 'oracle', statement: 's' } })) }] }] };
}
function wiremapV2(lineToLeaves) {
  return { schema_version: 2, lines: Object.entries(lineToLeaves).map(([id, couvre]) => ({
    id, couvre, fichiers: [{ path: `05_SYSTEMS/${id}.gd`, category: 'system' }] })) };
}

test('factAddresses : 6 faits, adresses concretes, null/NOT_MEASURED ignores', () => {
  const f = factAddresses({ worldscan: worldscan(), gm_worldscan: gm(), story_bible: story() });
  assert.deepEqual(f.conditions_victoire, ['worldscan:games[0].objectives[1].victory_condition']);
  assert.deepEqual(f.conditions_defaite, ['worldscan:games[0].objectives[1].defeat_condition']);
  assert.equal(f.objectifs_joueur.length, 2);
  assert.deepEqual(f.progression, ['gm_worldscan:dimensions[0]']);
  assert.deepEqual(f.boucles_recompense, ['worldscan:games[0].loops.minute_1', 'worldscan:games[0].loops.minute_10']);
  assert.deepEqual(f.contraintes_narratives, ['story_bible:sections[0]']);
});

test('canonicalize : chemin concret, raccourci par id, prose et adresse fantome', () => {
  const a = { worldscan: worldscan(), gm_worldscan: gm(), story_bible: story() };
  assert.equal(canonicalize('worldscan:games[0].objectives[1].victory_condition', a), 'worldscan:games[0].objectives[1].victory_condition');
  assert.equal(canonicalize('gm_worldscan:progression', a), 'gm_worldscan:dimensions[0]');
  assert.equal(canonicalize('story_bible:stakes', a), 'story_bible:sections[0]');
  assert.equal(canonicalize('Cookie Clicker wiki, page Ascension', a), null);
  assert.equal(canonicalize('worldscan:games[7].objectives[0].victory_condition', a), null);
  assert.equal(canonicalize('worldscan:games[0].objectives[0].victory_condition', a), null, 'valeur null = rien de produit');
  assert.equal(canonicalize('gm_worldscan:progression', { gm_worldscan: null }), null);
});

test('traverse : chaine complete jusqu au BUILD', () => {
  const dir = mkdtempSync(join(tmpdir(), 'amont-'));
  mkdirSync(join(dir, '05_SYSTEMS'));
  writeFileSync(join(dir, '05_SYSTEMS', 'L1.gd'), 'x');
  const r = traverse({
    worldscan: worldscan(), gm_worldscan: gm(), story_bible: story(),
    prisme: prisme(['worldscan:games[0].objectives[1].victory_condition', 'gm_worldscan:progression']),
    featuremap: featuremap({ cap_win: 'EX0', cap_tiers: 'EX1' }),
    wiremap: wiremapV2({ L1: ['cap_win'], L2: ['cap_tiers'] }),
  }, dir);
  assert.equal(r.verdict, 'ADVISORY');
  assert.equal(r.claim_verdict, 'NO_CLAIM_ALLOWED');
  assert.equal(r.facts.conditions_victoire.reached, 'BUILD');
  assert.deepEqual(r.facts.conditions_victoire.exigences, ['EX0']);
  assert.deepEqual(r.facts.conditions_victoire.leaves, ['cap_win']);
  assert.deepEqual(r.facts.conditions_victoire.lines, ['L1']);
  assert.equal(r.facts.progression.reached, 'WIREMAP', 'L2.gd absent du game dir');
  assert.equal(r.facts.progression.files_present, false);
  assert.equal(r.facts.conditions_defaite.reached, 'PRODUCED', 'produit, aucune exigence ne le cite');
  assert.equal(r.facts.contraintes_narratives.reached, 'PRODUCED');
  assert.equal(r.references.expected, 2);
  assert.equal(r.references.resolues, 2);
  assert.deepEqual(STAGES, ['NOT_PRODUCED', 'PRODUCED', 'PRISME', 'GREY_BLOCKS', 'WIREMAP', 'BUILD']);
});

test('traverse : reference en prose = rupture au PRISME, comptee non resolue', () => {
  const r = traverse({
    worldscan: worldscan(), gm_worldscan: gm(), story_bible: story(),
    prisme: prisme(['Cookie Clicker wiki']),
    featuremap: featuremap({ cap_win: 'EX0' }), wiremap: wiremapV2({ L1: ['cap_win'] }),
  }, null);
  assert.equal(r.facts.conditions_victoire.reached, 'PRODUCED');
  assert.equal(r.references.adressables, 0);
  assert.deepEqual(r.references.non_resolues, [{ id: 'EX0', reference: 'Cookie Clicker wiki' }]);
});

test('traverse : sans game-dir le BUILD est NOT_MEASURED (files_present null), jamais invente', () => {
  const r = traverse({
    worldscan: worldscan(), gm_worldscan: gm(), story_bible: story(),
    prisme: prisme(['worldscan:games[0].objectives[1].victory_condition']),
    featuremap: featuremap({ cap_win: 'EX0' }), wiremap: wiremapV2({ L1: ['cap_win'] }),
  }, null);
  assert.equal(r.facts.conditions_victoire.reached, 'WIREMAP');
  assert.equal(r.facts.conditions_victoire.files_present, null);
});

test('traverse : artefact amont absent => NOT_PRODUCED, wiremap v1 acceptee', () => {
  const r = traverse({
    worldscan: worldscan(), gm_worldscan: null, story_bible: null,
    prisme: prisme(['worldscan:games[0].loops.minute_1']),
    featuremap: featuremap({ cap_loop: 'EX0' }),
    wiremap: { features: [{ feature: 'loop', couvre: ['cap_loop'], fichiers: ['src/loop.gd'], fonction: 'tick', preuve: 'p' }] },
  }, null);
  assert.equal(r.facts.progression.reached, 'NOT_PRODUCED');
  assert.equal(r.facts.contraintes_narratives.reached, 'NOT_PRODUCED');
  assert.equal(r.facts.boucles_recompense.reached, 'WIREMAP');
  assert.deepEqual(r.facts.boucles_recompense.lines, ['loop']);
});

test('loadRunDir : fichiers absents => null, jamais une exception', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'amont-run-'));
  writeFileSync(join(dir, 'worldscan.json'), JSON.stringify(worldscan()));
  writeFileSync(join(dir, 'prisme.json'), '{pas du json');
  const a = await loadRunDir(dir);
  assert.equal(a.worldscan.games[0].game, 'Cookie Clicker');
  assert.equal(a.prisme, null);
  assert.equal(a.story_bible, null);
});
```

- [ ] **Step 2 : Vérifier qu'ils échouent**

Run: `node --test scripts/forge/check_amont_traversal.test.mjs`
Expected: échec au chargement du module (`Cannot find module './check_amont_traversal.mjs'`).

- [ ] **Step 3 : Implémenter la sonde**

```js
#!/usr/bin/env node
// check_amont_traversal.mjs — SONDE déterministe non-LLM (décision Pierre 2026-08-21,
// choix (b)) : jusqu'où les faits produits EN AMONT (World Scan, Story Bible, GM World
// Scan) traversent-ils RÉELLEMENT la chaîne Prisme -> Grey Blocks (featuremap) ->
// WireMap -> Build ? Elle suit la provenance DÉJÀ présente dans les artefacts :
//   prisme.exigences[].reference (adresse amont)  ->  featuremap.leaf.source_ref (id
//   d'exigence)  ->  wiremap.lines[].couvre (ids de capacités)  ->  fichiers sur disque.
//
// ADVISORY, JAMAIS UN VERDICT : règle de variance (ratifiée 2026-07-21) — une métrique
// prouve d'abord qu'elle porte une information variable. Ce fichier MESURE et REPORTE ;
// il ne bloque rien. Un fait absent en amont est NOT_PRODUCED (pas un FAIL) ; un build
// non fourni est files_present=null (NOT_MEASURED), jamais inventé.
//
// Usage : node check_amont_traversal.mjs <run_dir> [--game-dir <dir>] [--json]
// Exit 0 toujours (2 = usage) — une sonde advisory ne fait échouer aucun appelant.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectLeaves } from './upstream_schema.mjs';

export const PREFIXES = ['worldscan', 'story_bible', 'gm_worldscan'];
export const STAGES = ['NOT_PRODUCED', 'PRODUCED', 'PRISME', 'GREY_BLOCKS', 'WIREMAP', 'BUILD'];
export const FACTS = [
  'conditions_victoire', 'conditions_defaite', 'objectifs_joueur',
  'progression', 'boucles_recompense', 'contraintes_narratives',
];
// Dimensions GM qui portent une boucle de récompense (en plus des loops du World Scan).
const GM_REWARD_DIMENSIONS = new Set(['bonus', 'economy', 'rarity']);

function nonEmpty(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** Résout `a.b[0].c` dans un objet ; undefined si un maillon manque ou vaut null. */
export function resolvePath(root, path) {
  if (typeof path !== 'string' || !path) return undefined;
  const tokens = path.match(/[^.[\]]+|\[\d+\]/g);
  if (!tokens) return undefined;
  let cur = root;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    const key = t.startsWith('[') ? Number(t.slice(1, -1)) : t;
    cur = cur[key];
  }
  return nonEmpty(cur) ? cur : undefined;
}

/** Adresses concrètes (préfixées) portant chacun des 6 faits, depuis les artefacts amont. */
export function factAddresses(artifacts) {
  const out = Object.fromEntries(FACTS.map((f) => [f, []]));
  const games = Array.isArray(artifacts?.worldscan?.games) ? artifacts.worldscan.games : [];
  games.forEach((g, i) => {
    const objectives = Array.isArray(g?.objectives) ? g.objectives : [];
    objectives.forEach((o, j) => {
      const base = `worldscan:games[${i}].objectives[${j}]`;
      if (nonEmpty(o?.victory_condition)) out.conditions_victoire.push(`${base}.victory_condition`);
      if (nonEmpty(o?.defeat_condition)) out.conditions_defaite.push(`${base}.defeat_condition`);
      if (nonEmpty(o?.player_goal)) out.objectifs_joueur.push(`${base}.player_goal`);
    });
    const loops = g?.loops && typeof g.loops === 'object' ? g.loops : {};
    for (const k of Object.keys(loops)) {
      if (nonEmpty(loops[k])) out.boucles_recompense.push(`worldscan:games[${i}].loops.${k}`);
    }
  });
  const dims = Array.isArray(artifacts?.gm_worldscan?.dimensions) ? artifacts.gm_worldscan.dimensions : [];
  dims.forEach((d, k) => {
    if (d?.status !== 'MEASURED') return;
    const addr = `gm_worldscan:dimensions[${k}]`;
    if (d.id === 'progression') out.progression.push(addr);
    if (GM_REWARD_DIMENSIONS.has(d.id)) out.boucles_recompense.push(addr);
  });
  const sections = Array.isArray(artifacts?.story_bible?.sections) ? artifacts.story_bible.sections : [];
  sections.forEach((s, k) => {
    if (s?.status === 'GROUNDED' && Array.isArray(s.elements) && s.elements.length > 0) {
      out.contraintes_narratives.push(`story_bible:sections[${k}]`);
    }
  });
  return out;
}

/** Forme canonique `prefixe:chemin` d'une `reference` d'exigence, ou null si elle
 *  n'est pas adressable / ne résout rien dans l'artefact (prose, adresse fantôme,
 *  valeur null). Raccourcis : `gm_worldscan:<id dimension>`, `story_bible:<id section>`. */
export function canonicalize(reference, artifacts) {
  if (typeof reference !== 'string') return null;
  const m = reference.trim().match(/^([a-z_]+):(.+)$/);
  if (!m || !PREFIXES.includes(m[1])) return null;
  const [, prefix, rest0] = m;
  const rest = rest0.trim();
  const root = artifacts?.[prefix];
  if (!root || typeof root !== 'object') return null;
  if (prefix === 'gm_worldscan') {
    const k = (Array.isArray(root.dimensions) ? root.dimensions : []).findIndex((d) => d?.id === rest);
    if (k >= 0) return `gm_worldscan:dimensions[${k}]`;
  }
  if (prefix === 'story_bible') {
    const head = rest.split('/')[0];
    const k = (Array.isArray(root.sections) ? root.sections : []).findIndex((s) => s?.id === head);
    if (k >= 0) return `story_bible:sections[${k}]`;
  }
  return resolvePath(root, rest) !== undefined ? `${prefix}:${rest}` : null;
}

/** `addr` porte le fait situé à `factAddr` si elle lui est égale ou plus profonde. */
function covers(addr, factAddr) {
  return addr === factAddr || addr.startsWith(`${factAddr}.`) || addr.startsWith(`${factAddr}[`);
}

/** Lignes d'une WireMap v1 (`features[]`) ou v2 (`lines[]`) sous une forme unique. */
export function wiremapLines(wiremap) {
  const files = (arr) => (Array.isArray(arr) ? arr : [])
    .map((f) => (typeof f === 'string' ? f : f?.path)).filter((p) => typeof p === 'string' && p);
  if (wiremap?.schema_version === 2) {
    return (Array.isArray(wiremap.lines) ? wiremap.lines : []).filter((l) => l && typeof l === 'object')
      .map((l) => ({ id: String(l.id ?? ''), couvre: Array.isArray(l.couvre) ? l.couvre : [], fichiers: files(l.fichiers) }));
  }
  return (Array.isArray(wiremap?.features) ? wiremap.features : []).filter((f) => f && typeof f === 'object')
    .map((f) => ({ id: String(f.feature ?? ''), couvre: Array.isArray(f.couvre) ? f.couvre : [], fichiers: files(f.fichiers) }));
}

/** La mesure. `gameDir` null => étage BUILD non mesuré (files_present: null). */
export function traverse(artifacts, gameDir) {
  const facts = factAddresses(artifacts);
  const exigences = Array.isArray(artifacts?.prisme?.exigences) ? artifacts.prisme.exigences : [];
  const references = { expected: 0, adressables: 0, resolues: 0, non_resolues: [] };
  const exByAddr = [];
  for (const ex of exigences) {
    if (!ex || ex.source !== 'EXPECTED') continue;
    references.expected += 1;
    if (typeof ex.reference === 'string' && /^[a-z_]+:/.test(ex.reference.trim())) references.adressables += 1;
    const addr = canonicalize(ex.reference, artifacts);
    if (addr) { references.resolues += 1; exByAddr.push({ id: ex.id, addr }); }
    else references.non_resolues.push({ id: ex.id, reference: ex.reference ?? null });
  }
  const leaves = collectLeaves(artifacts?.featuremap ?? {});
  const lines = wiremapLines(artifacts?.wiremap);
  const out = {};
  for (const fact of FACTS) {
    const addrs = facts[fact];
    const r = { produced: addrs.length > 0, addresses: addrs, exigences: [], leaves: [], lines: [], files_present: null, reached: 'NOT_PRODUCED' };
    if (r.produced) {
      r.reached = 'PRODUCED';
      r.exigences = exByAddr.filter((e) => addrs.some((f) => covers(e.addr, f))).map((e) => e.id);
      if (r.exigences.length) {
        r.reached = 'PRISME';
        const exSet = new Set(r.exigences);
        r.leaves = leaves.filter((l) => exSet.has(l.leaf?.source_ref)).map((l) => l.leaf.id);
        if (r.leaves.length) {
          r.reached = 'GREY_BLOCKS';
          const leafSet = new Set(r.leaves);
          const hit = lines.filter((l) => l.couvre.some((c) => leafSet.has(c)));
          r.lines = hit.map((l) => l.id);
          if (hit.length) {
            r.reached = 'WIREMAP';
            if (gameDir) {
              const fichiers = hit.flatMap((l) => l.fichiers);
              r.files_present = fichiers.length > 0 && fichiers.every((f) => existsSync(join(gameDir, f)));
              if (r.files_present) r.reached = 'BUILD';
            }
          }
        }
      }
    }
    out[fact] = r;
  }
  return { facts: out, references, stages: STAGES, verdict: 'ADVISORY', claim_verdict: 'NO_CLAIM_ALLOWED' };
}

async function readJsonOrNull(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
}

/** Charge les 6 artefacts d'un run_dir ; chacun vaut null s'il est absent/illisible. */
export async function loadRunDir(runDir) {
  const names = ['worldscan', 'story_bible', 'gm_worldscan', 'prisme', 'featuremap', 'wiremap'];
  const entries = await Promise.all(names.map(async (n) => [n, await readJsonOrNull(join(runDir, `${n}.json`))]));
  return Object.fromEntries(entries);
}

async function main(argv) {
  const args = argv.slice(2);
  const runDir = args.find((a) => !a.startsWith('--'));
  if (!runDir) {
    process.stderr.write('usage: node check_amont_traversal.mjs <run_dir> [--game-dir <dir>] [--json]\n');
    return 2;
  }
  const gi = args.indexOf('--game-dir');
  const gameDir = gi >= 0 && args[gi + 1] ? resolve(args[gi + 1]) : null;
  const result = traverse(await loadRunDir(resolve(runDir)), gameDir);
  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 1)}\n`);
  } else {
    for (const [fact, r] of Object.entries(result.facts)) {
      process.stdout.write(`${fact.padEnd(24)} ${r.reached.padEnd(12)} exigences=${r.exigences.length} feuilles=${r.leaves.length} lignes=${r.lines.length}\n`);
    }
    const { expected, adressables, resolues, non_resolues } = result.references;
    process.stdout.write(`references EXPECTED=${expected} adressables=${adressables} resolues=${resolues} non_resolues=${non_resolues.length}\n`);
    process.stdout.write('verdict: ADVISORY · claim_verdict: NO_CLAIM_ALLOWED\n');
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv).then((code) => process.exit(code));
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

Run: `node --test scripts/forge/check_amont_traversal.test.mjs`
Expected: 7 tests PASS.

- [ ] **Step 5 : Confronter la sonde au réel (un run existant, aucune invention)**

Run: `node scripts/forge/check_amont_traversal.mjs lab/forge_runs/amont_narratif_probe`
Expected: chaque fait en `NOT_PRODUCED` ou `PRODUCED` (ce run n'a ni prisme ni featuremap), `references EXPECTED=0`, exit 0. Noter la sortie dans le rapport.

- [ ] **Step 6 : Pas de commit** — `git status --short scripts/forge/` : 2 nouveaux fichiers.

---

### Task 4 : Câblage driver — `amont_traversal` advisory sur le reçu s10c

**Files:**
- Modify: `scripts/forge/driver.py:2332-2355` (`_run_wiremap_oracle`) + nouvelle méthode `_amont_traversal_advisory` juste après.
- Test: `scripts/forge/tests/test_driver_amont_traversal_advisory.py`

**Interfaces:**
- Consumes: CLI de la Task 3 (`--json`).
- Produces: `detail["amont_traversal"]` sur le reçu `s10c-oracle-wiremap` — soit le JSON de la sonde, soit `{"status": "NOT_MEASURED", "reason": "..."}`. **Ne modifie jamais le statut** OK/FAIL/BLOCKED de l'étape.

Avant d'écrire : `grep -n "self.game_dir\|REPO_ROOT\|import subprocess" scripts/forge/driver.py | head` pour réutiliser les noms réels (attributs `run_dir`, `game_dir`, racine dépôt). Si `driver.py` appelle déjà `node` ailleurs (`grep -n '"node"' scripts/forge/driver.py scripts/forge/static_oracles.py`), réutiliser ce même mécanisme de résolution de l'exécutable.

- [ ] **Step 1 : Écrire le test qui échoue**

```python
# scripts/forge/tests/test_driver_amont_traversal_advisory.py
"""La sonde check_amont_traversal.mjs est attachée au reçu s10c en ADVISORY :
elle n'altère jamais le statut, et son absence/échec donne NOT_MEASURED, pas un
vert ni un rouge."""
import json
import subprocess
from pathlib import Path

import pytest

from forge.driver import ForgeDriver


def _driver_minimal(tmp_path: Path) -> ForgeDriver:
    d = ForgeDriver.__new__(ForgeDriver)   # pas de __init__ : on ne teste que la méthode
    d.run_dir = tmp_path
    d.game_dir = tmp_path / "game"
    return d


def test_la_sonde_est_attachee_en_advisory_quand_node_repond(tmp_path, monkeypatch):
    payload = {"facts": {"progression": {"reached": "PRISME"}}, "verdict": "ADVISORY"}

    def faux_run(cmd, **kw):
        assert "check_amont_traversal.mjs" in " ".join(map(str, cmd))
        assert "--json" in cmd and str(tmp_path) in map(str, cmd)
        return subprocess.CompletedProcess(cmd, 0, stdout=json.dumps(payload), stderr="")

    monkeypatch.setattr(subprocess, "run", faux_run)
    r = _driver_minimal(tmp_path)._amont_traversal_advisory()
    assert r == payload


@pytest.mark.parametrize("panne", [
    OSError("node introuvable"),
    subprocess.TimeoutExpired(cmd="node", timeout=60),
])
def test_une_panne_de_la_sonde_donne_NOT_MEASURED_jamais_une_exception(tmp_path, monkeypatch, panne):
    def faux_run(cmd, **kw):
        raise panne
    monkeypatch.setattr(subprocess, "run", faux_run)
    r = _driver_minimal(tmp_path)._amont_traversal_advisory()
    assert r["status"] == "NOT_MEASURED"
    assert r["reason"]


def test_un_exit_non_nul_ou_une_sortie_non_json_donne_NOT_MEASURED(tmp_path, monkeypatch):
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kw: subprocess.CompletedProcess(cmd, 0, stdout="pas du json", stderr=""))
    assert _driver_minimal(tmp_path)._amont_traversal_advisory()["status"] == "NOT_MEASURED"
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kw: subprocess.CompletedProcess(cmd, 1, stdout="", stderr="boom"))
    r = _driver_minimal(tmp_path)._amont_traversal_advisory()
    assert r["status"] == "NOT_MEASURED" and "boom" in r["reason"]


def test_le_recu_s10c_porte_amont_traversal_sans_changer_le_statut(tmp_path, monkeypatch):
    """_run_wiremap_oracle : statut = check_wiremap seul ; amont_traversal = détail."""
    from forge import driver as drv
    (tmp_path / "wiremap.json").write_text(json.dumps({"features": []}), encoding="utf-8")
    d = _driver_minimal(tmp_path)
    d.src_root = tmp_path
    monkeypatch.setattr(drv, "check_feature_set_frozen", lambda w, f: {"passed": True, "checked": True})
    monkeypatch.setattr(drv, "load_frozen_features", lambda run_dir: [])
    monkeypatch.setattr(drv, "check_wiremap", lambda w, s: {"passed": False, "features_manquantes": ["x"]})
    monkeypatch.setattr(ForgeDriver, "_amont_traversal_advisory", lambda self: {"verdict": "ADVISORY"})
    captured = {}
    monkeypatch.setattr(ForgeDriver, "_finish_step", lambda self, state, entry, status, detail: captured.update(status=status, detail=detail))
    d._run_wiremap_oracle({}, {})
    assert captured["status"] == "FAIL"
    assert captured["detail"]["amont_traversal"] == {"verdict": "ADVISORY"}
    assert captured["detail"]["features_manquantes"] == ["x"]
```

- [ ] **Step 2 : Vérifier qu'il échoue**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_driver_amont_traversal_advisory.py -q`
Expected: FAIL `AttributeError: ... '_amont_traversal_advisory'`.

- [ ] **Step 3 : Implémenter**

Dans `_run_wiremap_oracle`, remplacer les deux dernières lignes :

```python
        wire = check_wiremap(wiremap, self.src_root)
        # Choix (b) Pierre 2026-08-21 : la traversée des faits amont (World Scan /
        # Story Bible / GM) jusqu'au build est MESURÉE ici, en ADVISORY — elle ne
        # change jamais le statut, qui reste celui de check_wiremap seul.
        wire["amont_traversal"] = self._amont_traversal_advisory()
        self._finish_step(state, entry, "OK" if wire["passed"] else "FAIL", wire)

    def _amont_traversal_advisory(self) -> dict:
        """Sonde déterministe `scripts/forge/check_amont_traversal.mjs` (Node, --json).
        ADVISORY : toute panne (node absent, timeout, exit != 0, sortie non-JSON) rend
        {"status": "NOT_MEASURED", "reason"} — jamais une exception, jamais un statut
        d'étape modifié. Le game_dir est passé s'il existe (étage BUILD), sinon la
        sonde rend files_present=null (non mesuré, non inventé)."""
        script = Path(__file__).resolve().parent / "check_amont_traversal.mjs"
        cmd = ["node", str(script), str(self.run_dir), "--json"]
        game_dir = getattr(self, "game_dir", None)
        if game_dir and Path(game_dir).is_dir():
            cmd += ["--game-dir", str(game_dir)]
        try:
            cp = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8",
                                errors="replace", timeout=60)
        except (OSError, subprocess.SubprocessError) as exc:
            return {"status": "NOT_MEASURED", "reason": f"sonde injoignable: {exc}"}
        if cp.returncode != 0:
            return {"status": "NOT_MEASURED",
                    "reason": f"exit {cp.returncode}: {(cp.stderr or '')[-400:]}"}
        try:
            return json.loads(cp.stdout)
        except (json.JSONDecodeError, ValueError) as exc:
            return {"status": "NOT_MEASURED", "reason": f"sortie non JSON: {exc}"}
```

(Vérifier que `subprocess`, `json`, `Path` sont déjà importés en tête de `driver.py` ; sinon les ajouter aux imports existants. Si le driver résout `node` autrement — ex. via `shutil.which` ou un helper —, utiliser ce helper à la place de la chaîne `"node"`.)

- [ ] **Step 4 : Vérifier**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_driver_amont_traversal_advisory.py -q`
Expected: 5 PASS.

- [ ] **Step 5 : Non-régression driver + suite forge complète**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests -q -x -p no:cacheprovider`
Expected: même compte de verts qu'avant (référence 2026-08-20 : 1910 / 1911, 0 rouge — un éventuel `skip` préexistant reste un skip). Puis `node --test scripts/forge/*.test.mjs` (référence : 821 / 821).

- [ ] **Step 6 : Pas de commit** — `git diff --stat` : driver.py + 1 test.

---

### Task 5 : Entrées du run Kitten Clicker (préparation, AUCUN lancement)

**Files:**
- Create: `lab/forge_runs/kitten_clicker/design_intent.md`
- Create: `lab/forge_runs/kitten_clicker/tasks.json`

**Interfaces:**
- Consumes: `run_real.py` CLI (`--tasks-file`, `--profile`, `--project`, `--run-id`, `--src-root`, `--is-game`, `--charter` : lire `scripts/forge/run_real.py:1979-2020` pour la sémantique exacte de `--charter` avec un profil qui COMMENCE par s0 — M4 `91f3a12` a rendu s0 producteur de `charter.yaml` ; vérifier si `--charter` reste exigé ou devient optionnel pour les profils commençant par `s0-contrat`).
- Produces: la **commande exacte** de lancement, rapportée à l'orchestrateur — le lancement lui-même est une gate (spawn réel = coût), hors de ce plan.

- [ ] **Step 1 : Écrire `design_intent.md`** (texte de Pierre, intact — « notes brutes jamais réécrites »)

```markdown
# Kitten Clicker — design intent (Pierre, 2026-08-21)

reference_jeu : Cookie Clicker (boucle incrémentale / progression / paliers) + Neko Atsume (collection de chatons / attractivité / identité mignonne)
plateforme_cible : Godot 4.6.3 (desktop, fenêtre GPU)

## Demande
Produis un petit clicker de chatons mignons, jouable plusieurs heures, avec une boucle de
progression et une méta-progression cohérentes.

## Concept
Le joueur nourrit une colonie de chatons en cliquant sur une grosse pelote de laine /
pâtée / coussin central. Chaque action produit des ronrons.
CLICK → RONRONS → CHATONS → PRODUCTION AUTOMATIQUE → AMÉLIORATIONS → NOUVEAUX CHATONS /
LIEUX → META-PROGRESSION

## Ce que la Forge doit démontrer
- World Scan : boucle principale du genre clicker, conditions de progression, objectifs
  joueur, boucles de récompense, références visuelles, conventions du genre, risques de
  monotonie. Il doit produire explicitement : conditions_victoire, conditions_defaite,
  objectifs_joueur, progression, boucles_recompense — et ces informations doivent être
  CONSOMMÉES en aval, pas seulement présentes dans le document.
- Histoire / monde : refuge de chatons, personnages, lieux, objets, petites quêtes,
  descriptions assez précises pour générer les assets.
- Game Master : Grey Blocks — click, production, upgrades, déblocages, événements,
  quêtes, méta-progression, contraintes de jouabilité. Plusieurs compétences doivent être
  réellement reconnaissables, pas seulement déclarées.
- WireMap : réconcilie intention visuelle ↔ architecture technique ↔ données ↔ runtime Godot.
- Builder : réutilise les composants existants de la Forge quand ils sont compatibles.

## Ce que le run mesure
Que conditions de victoire/défaite, objectifs joueur, progression et contraintes
narratives produites en amont atteignent réellement les Grey Blocks, la WireMap, le
Builder et les oracles (sonde check_amont_traversal.mjs, advisory).
```

- [ ] **Step 2 : Écrire `tasks.json`**

```json
{
  "s0-contrat": "Projet kitten_clicker. Lis lab/forge_runs/kitten_clicker/design_intent.md (design-intent de Pierre, 2026-08-21). reference_jeu = « Cookie Clicker + Neko Atsume » (donné par Pierre, ne pas inventer), plateforme_cible = Godot 4.6.3 desktop. Produis charter.yaml complet (7 champs R7), criteres_demo[] observables (ex. : un bot atteint le palier N de ronrons en T ticks ; la courbe de progression porte >= 2 valeurs distinctes non triviales — règle de variance).",
  "s2-worldscan": "Genre : clicker / idle incremental. Jeux observés : Cookie Clicker, Neko Atsume (références Pierre), plus ce que les sources fiables imposent. Pour CHAQUE jeu observé, objectives[] doit porter victory_condition, defeat_condition, player_goal NON null quand le jeu en a (un clicker sans défaite : has_defeat_state=false et defeat_condition=null, jamais une invention) et loops{minute_1, minute_10, hour_5, endgame} remplis.",
  "s9-build-godot-standard": "Construis kitten_clicker dans games/kitten_clicker/ selon wiremap.json. Réutilise RÉELLEMENT (import, pas copie) ce que knowledge_base/search.mjs rend de pertinent ; déclare reused_from sur chaque ligne réutilisée.",
  "s11-redteam-code": "Red-team du build kitten_clicker : cherche ce qui contredit le charter (jouable plusieurs heures, méta-progression) et ce que la wiremap promet sans le prouver."
}
```

- [ ] **Step 3 : Établir la commande de lancement sans la lancer**

Lire `scripts/forge/run_real.py:1979-2020` et `:2001` (`--charter`). Exécuter uniquement :

`PYTHONPATH=scripts .venv312/Scripts/python.exe -m forge.dispatch --dry-run --profile full_godot_narratif`

puis rapporter la commande complète présumée, de la forme :

`PYTHONPATH=scripts .venv312/Scripts/python.exe scripts/forge/run_real.py --project kitten_clicker --run-id kitten_clicker-<YYYYMMDD-HHMM> --profile full_godot_narratif --src-root games/kitten_clicker --is-game --tasks-file lab/forge_runs/kitten_clicker/tasks.json [--charter … si exigé]`

avec, pour chaque option, la ligne de `run_real.py` qui la justifie. **Ne pas exécuter run_real.py** : le spawn réel est une gate de l'orchestrateur.

- [ ] **Step 4 : Pas de commit** — `git status --short lab/forge_runs/kitten_clicker/` : 2 nouveaux fichiers.

**Résultat du Step 3 (mesuré par l'orchestrateur, 2026-08-21) :**

- `--charter` n'est PAS une entrée de s0 : il bascule s1-prisme sur le **panel** (`run_real.py:2108-2116` → `forge.panel.panel_prisme_executor`). Ce panel (a) lit `charter_path` **à la construction** (`panel.py:66`), c'est-à-dire AVANT que s0 n'ait écrit `charter.yaml` (M4, `run_real.py:1247`) → pointer vers le futur fichier ferait échouer le lancement ; (b) appelle `claude_call(payload.prompt, …)` (`panel.py:71,79`) **sans** `upstream_artifacts_section`, qui n'est appelée que par l'exécuteur simple (`run_real.py:1618`) → sous le panel, s1 ne recevrait NI worldscan NI story_bible NI gm_worldscan. Défaut préexistant (le panel n'a jamais reçu le World Scan malgré FORGE_PRISME_V2), **mesuré, documenté, non corrigé ici** (doctrine de sortie 2026-08-20 : pas un nouveau lot).
- Conséquence : le run se lance **sans `--charter`** (exécuteur simple à s1, injection amont active). Le panel 5 lentilles est perdu pour ce run — assumé.
- `run_dir` = `lab/forge_runs/<project>` (`run_real.py:2055`), d'où le choix du nom de projet `kitten_clicker` (les fichiers `design_intent.md`/`tasks.json` y sont déjà).

Commande (à lancer UNIQUEMENT sur go de l'orchestrateur, depuis `master`) :

```bash
PYTHONPATH=scripts .venv312/Scripts/python.exe scripts/forge/run_real.py --project kitten_clicker --run-id kitten_clicker-20260821 --profile full_godot_narratif --src-root games/kitten_clicker --is-game --tasks-file lab/forge_runs/kitten_clicker/tasks.json
```

(`--project`/`--run-id` l.1979-1980 · `--profile` l.1986 · `--src-root` l.1988 · `--tasks-file` l.1997 · `--is-game` l.2017 arme e2e/mutation/solvabilité · `--step-timeout` laissé au défaut, le builder Godot a son timeout de profil 5400 s.)

---

## Self-Review

- **Couverture** : (b) composition sans station neuve → Task 1 ; consommation réelle par s1/s3 → Task 2 ; mesure « atteignent réellement Grey Blocks / WireMap / Builder / oracles » → Tasks 3-4 (la sonde est attachée à un oracle, s10c) ; exigence de Pierre sur les 5 champs du World Scan → Task 2 (contrat s1 adressable) + Task 5 (`tasks.json` s2-worldscan) + sonde (faits `conditions_victoire`/`conditions_defaite`/`objectifs_joueur`/`progression`/`boucles_recompense`, + `contraintes_narratives`) ; références Cookie Clicker + Neko Atsume → Task 5.
- **Hors périmètre, dit explicitement** : la sémantique de victoire de l'oracle de solvabilité reste codée par jeu en GDScript (`verdict.gd`) — le run le mesurera (`reached` de `conditions_victoire`), il ne le corrige pas. Lancement du run = gate.
- **Types** : `traverse()` → `{facts, references, stages, verdict, claim_verdict}` ; `_amont_traversal_advisory()` retourne ce dict ou `{"status","reason"}` ; `reached` ∈ `STAGES` — cohérent entre Tasks 3, 4.
- **Placeholders** : aucun « TBD » ; le seul point à établir par lecture est la sémantique de `--charter` (Task 5 Step 3), et le plan dit exactement où lire.
