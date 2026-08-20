# Analyse — Périmètre `logic_files` du gate mutation (adaptateurs de présentation vs systèmes)

Date : 2026-07-27. Source : mission Forge `FORGE_DISPATCH:v3-analyse-perimetre-logic-files`.
Portée : LECTURE seule (dépôt entier), ÉCRITURE limitée à ce fichier. Aucun changement de
STANDARD, driver, contrat, oracle, `mutation_triage.json` ou verdict. Objet : préparer
l'arbitrage de Pierre, pas le rendre.

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED

---

## Résumé en une phrase

Les 7 adaptateurs de présentation entrent dans `logic_files` par un filtre générique
(« tout `.mjs` non-test ») qui n'a jamais été spécialisé pour exclure la catégorie
`system.adapter` — un effet de bord de réutilisation, pas une décision — et ils portent
**65 des 68 survivants** (0 mutant tué sur 65, contre 3 survivants déjà documentés-équivalents
sur les 3 fichiers systèmes qui, eux, scorent 58/61 = 95 %), parce que la suite scellée qui
sert de preuve de mutation (`07_TESTS/unit/*.test.mjs` + `solvability.mjs`) n'importe **aucun**
fichier de `06_RUNTIME/adapters/presentation/` — structurellement, pas par faiblesse de test.

---

## 1. Dérivation de `logic_files` — règle exacte, décision ou effet de bord

**Chaîne complète (2 fonctions, topologie STANDARD) :**

1. `scripts/forge/driver.py`, méthode `ForgeDriver._logic_files_from_wiremap_any`
   (lignes 878–910). Pour chaque `line` de la wiremap (`features[]` legacy ou `lines[]`
   STANDARD schéma 2), elle lit `fichiers[]` et, pour chaque entrée objet `{path, category}`,
   **exclut uniquement** les catégories dont le nom commence par `test.` (ligne 902 :
   `if str(f.get("category", "")).startswith("test."): continue`). Commentaire du code
   (lignes 895–901) : la justification donnée est exclusivement « `test.unit`/`test.oracle`/
   `test.solvability` sont de la PREUVE, jamais du code à muter » — **aucune ligne de
   raisonnement sur la catégorie `system.adapter`**. Le reste (y compris `system.adapter`)
   passe sans filtrage supplémentaire, puis la liste normalisée est transmise à la fonction 2.

2. `scripts/forge/mutation_proof.py`, fonction `logic_files_from_wiremap`
   (lignes 46–54) : formule héritée de la topologie LEGACY (commentaire ligne 47 : « formule
   skill.md »), qui garde tout fichier `f.endswith(".mjs") and "test" not in f` — un test de
   sous-chaîne sur le CHEMIN, indépendant de toute catégorie.

**Preuve empirique sur `games/pong/09_WIREMAP/wiremap.json`** : les lignes `core.exit`,
`core.render`, `core.audio` portent `"category": "system.adapter"` et pointent vers
`06_RUNTIME/adapters/presentation/{exit,draw,raster,capture_browser,capture_godot,audio,
browser/main}.mjs` (wiremap.json lignes 87–121). Aucune de ces catégories ne commence par
`test.` → rien ne les arrête à l'étape 1. Elles se terminent par `.mjs` et ne contiennent pas
la sous-chaîne `test` dans leur chemin → rien ne les arrête à l'étape 2. Elles atterrissent
dans `logic_files` exactement comme les 3 fichiers systèmes. Seul `06_RUNTIME/adapters/
presentation/godot/main.gd` (même ligne `core.render`, même catégorie `system.adapter`)
est exclu, mais uniquement parce qu'il ne se termine pas par `.mjs` — preuve supplémentaire
que le filtre ne raisonne jamais sur la catégorie `system.adapter` elle-même.

**Verdict de nature : EFFET DE BORD, pas décision explicite.** `repo_map.yaml` (lignes 61–63)
distingue structurellement `system` (`05_SYSTEMS/{id}/`) de `system.adapter`
(`06_RUNTIME/adapters/{id}/`) — la table qui pourrait servir de base à une exclusion
existe déjà et est déjà lue ailleurs dans le driver (`check_placement`). Mais aucun code,
commentaire ou contrat lu (driver.py, mutation_proof.py, `core_requirements.yaml`,
`repo_map.yaml`) ne motive explicitement l'inclusion ou l'exclusion de `system.adapter`
dans le gate mutation. Le filtre a été écrit pour un seul souci documenté (ne pas muter la
preuve elle-même) et hérite, sans discussion, de la formule LEGACY qui ne connaissait pas
cette distinction de catégorie (schéma STANDARD v2 seulement).

**Second effet structurel, indépendant de la dérivation des fichiers** : le `test_argv` utilisé
pour juger chaque mutant est la commande d'oracle du projet (`scripts/forge/oracles.json`,
entrée `pong`, lignes 77–86 : `node --test 07_TESTS/unit/{input,loop,state}.test.mjs
07_TESTS/oracle/solvability.mjs`), réutilisée telle quelle pour TOUS les fichiers de
`logic_files` (driver.py lignes 814–824, décision explicite documentée en commentaire :
« la commande qui SERT DE PREUVE est la sémantique même du gate mutation »). Vérification
directe des imports des 4 fichiers de test scellés (`grep import` sur
`games/pong/07_TESTS/unit/*.test.mjs` et `07_TESTS/oracle/solvability.mjs`) : ils
n'importent QUE `05_SYSTEMS/{game_loop/loop,input/input,game_state/state}.mjs` — jamais un
fichier de `06_RUNTIME/adapters/presentation/`. Conséquence mathématique, pas empirique :
**aucun mutant introduit dans un adaptateur de présentation ne peut jamais être tué par cette
commande**, quelle que soit la qualité du code testé — ce n'est pas une observation sur ce run,
c'est une garantie structurelle tant que ce couplage (logic_files large + test_argv étroit)
reste en l'état.

---

## 2. Répartition des 68 survivants par fichier

**Source : `lab/forge_runs/pong/evidence/mutation_pong_r2.json`, clé
`mutation_result.per_file`** (evidence_sha256 du reçu signé :
`1e82b167b9c78f6055a41f76f8b141c0ca478524224e227708561d85d70f1164`, `lab/forge_runs/pong/
verdict.json` ligne 153). **Reconstituable intégralement** — cette clé n'était pas dans le
reçu signé lui-même (`verdict.json`) mais dans son fichier d'évidence référencé par
`evidence_path`, qui porte le hash vérifiable.

| Fichier | catégorie | tués | total | **survécus** |
|---|---|---:|---:|---:|
| `05_SYSTEMS/game_loop/loop.mjs` | system | 14 | 15 | **1** |
| `05_SYSTEMS/game_state/state.mjs` | system | 29 | 29 | **0** |
| `05_SYSTEMS/input/input.mjs` | system | 15 | 17 | **2** |
| **sous-total systèmes** | | **58** | **61** | **3 (95 %)** |
| `06_RUNTIME/adapters/presentation/audio.mjs` | system.adapter | 0 | 11 | **11** |
| `06_RUNTIME/adapters/presentation/browser/main.mjs` | system.adapter | 0 | 4 | **4** |
| `06_RUNTIME/adapters/presentation/capture_browser.mjs` | system.adapter | 0 | 5 | **5** |
| `06_RUNTIME/adapters/presentation/capture_godot.mjs` | system.adapter | 0 | 23 | **23** |
| `06_RUNTIME/adapters/presentation/draw.mjs` | system.adapter | 0 | 3 | **3** |
| `06_RUNTIME/adapters/presentation/exit.mjs` | system.adapter | 0 | 10 | **10** |
| `06_RUNTIME/adapters/presentation/raster.mjs` | system.adapter | 0 | 9 | **9** |
| **sous-total adaptateurs** | | **0** | **65** | **65 (0 %)** |
| **TOTAL** | | **58** | **126** | **68** |

Recoupement de cohérence (mécanique, pas une estimation) : 58+0=58 tués (= `killed` du reçu
signé) ; 61+65=126 total (= `total` du reçu signé) ; 3+65=68 survécus (= `survived` du reçu
signé). Les trois totaux du reçu HMAC-signé sont donc intégralement expliqués par ce tableau,
sans reste.

**Le chiffre qui tranche l'importance du sujet** : le score global 46 % (58/126) ne dit RIEN
sur la qualité des tests de logique de jeu — ceux-ci scorent 95 % (58/61) — et TOUT sur le fait
que 100 % des mutants de présentation survivent, par construction (§1). Confondre les deux
sous la même moyenne masque un signal excellent (systèmes) derrière un signal structurellement
nul (adaptateurs), qui n'est pas amélioration possible sans changer ce qui est mesuré et
comment (§3, option C).

**Recoupement avec le triage existant** : `games/pong/mutation_triage.json` (fichier modifié,
non commité au moment de cette analyse) documente 3 mutants équivalents-prouvés-par-lecture-
du-garde : `ge->gt@L114` (`loop.mjs`), `or->and@L19` et `or->and@L20` (`input.mjs`) — exactement
les 3 survivants des fichiers systèmes, aucun adaptateur. Le reçu signé (`verdict.json`,
`triaged_survivors: []`) ne les compte PAS comme triés dans son champ dédié, alors que la
liste `survivants_non_tries` du même reçu ne contient déjà plus ces 3 entrées (57 entrées
listées, contre 60 couples (nom, ligne) uniques parmi les 68 survivants bruts — écart de 3,
exactement ces trois). **Observation factuelle à signaler à Pierre, hors périmètre de cette
mission** : le champ `triaged_survivors` du reçu signé semble désynchronisé de l'effet réel du
triage (la liste affichée l'a déjà appliqué, le compteur dédié dit `[]`) — un audit ou correctif
séparé, pas traité ici (aucune modification de `verdict.json`/`mutation_proof.py` n'a été
faite). Conséquence pour cette analyse : **les 65 survivants d'adaptateurs sont, eux,
entièrement non triés — zéro justification d'équivalence n'existe pour aucun d'entre eux.**

---

## 3. Les trois options — protège / expose / coût / effet chiffré sur `pong_r2`

### Option A — Tout conserver (statu quo)

- **Protège** : garde les 7 adaptateurs visibles dans le reçu signé — le déficit de preuve
  (0/65 tué) reste écrit noir sur blanc à chaque run, impossible à oublier. N'exige aucun
  changement de code.
- **Expose** : le score agrégé (46 %) reste un signal trompeur qui mélange deux régimes de
  preuve différents (test unitaire scellé vs artifact/pixel/bot_action ad hoc, cf. `core_
  requirements.yaml` lignes 74–87) sous une seule note. Un futur lecteur pressé du reçu (ou
  une règle d'automatisation future basée sur le score) traiterait un système à 95 % de la
  même façon qu'un système à 0 % — exactement la confusion que la doctrine de variance des
  métriques (mémoire `forge_metric_variance_rule`) met en garde de ne pas produire côté
  lecture, même si côté écriture le chiffre lui-même n'est pas falsifié.
- **Coût** : nul en ingénierie ; coût récurrent = tout futur run STANDARD avec adaptateurs de
  présentation échouera structurellement le gate mutation tant qu'aucun test scellé n'importe
  ces fichiers — improbable sans reconfigurer le couplage `logic_files`/`test_argv` (§1).
- **Effet chiffré sur `pong_r2`** : aucun changement — le reçu reste tel quel : `code` oracle
  `status: FAIL` (`mutation.receipt.status: FAIL`, `gate.passed: false`, 57 sites non triés).

### Option B — Exclure les adaptateurs (catégorie `system.adapter`) de `logic_files`

- **Protège** : aligne le score de mutation sur ce que la suite scellée peut réellement
  prouver — les 3 fichiers systèmes (95 %, 3 survivants déjà documentés-équivalents) — un
  signal honnête sur la logique de jeu pure.
- **Expose** — **franchement, sans édulcorer** : cesse de mesurer, pour toujours et pour tout
  futur jeu STANDARD, tout ce qui vit dans `06_RUNTIME/adapters/presentation/` sous mutation.
  Ni `draw.mjs`, ni `capture_godot.mjs`, ni `audio.mjs`, ni `exit.mjs`, ni `raster.mjs` ne
  seraient plus jamais soumis à un mutant qui doit être tué par un test automatisé — ils
  resteraient prouvés uniquement par les scripts ad hoc (`node audio.mjs`, `node
  capture_browser.mjs`, re-exécutés manuellement/en session, cf. wiremap.json lignes 107 et
  119, où le volet Godot du critère pixel est déjà noté « NON re-executable » sur ce poste).
  C'est précisément la classe de bug déjà vécue et nommée dans la mémoire du studio
  (`forge_mechanical_ok_visually_dead` : « oracle Forge ne teste QUE la mécanique, pas le
  feel ») — exclure les adaptateurs du gate mutation retire un des rares mécanismes qui
  aurait pu, en principe, détecter une régression silencieuse dans le rendu ou la capture.
  Cette option touche aussi la garde-fou anti-complaisance : si elle est motivée seulement
  par « le score est mauvais », c'est exactement « rendre une mesure gênante triviale » —
  elle n'est défendable QUE par l'argument structurel du §1 (couplage `test_argv`/
  `logic_files`), jamais par le chiffre seul.
- **Coût** : modification de `driver.py` (`_logic_files_from_wiremap_any`, filtrer aussi
  `system.adapter`, ou du côté STANDARD `repo_map.yaml`) — hors périmètre de cette mission,
  nécessite un contrat validé (doctrine ADR-002) avant tout agent d'exécution.
- **Effet chiffré sur `pong_r2`** (projection mécanique à partir du tableau §2, pas une
  ré-exécution) : `total=61, killed=58, survived=3`, les 3 survivants déjà couverts par
  `games/pong/mutation_triage.json` → `survivants_non_tries` attendu = 0 → `gate.passed`
  passerait probablement à `true` et `mutation.receipt.status` à `OK`. Le composant `code`
  de l'oracle (qui exige aussi `e2e_ok`, `solvability.passed`, `harness_no_hardcoded_flags.
  passed` — tous déjà vrais dans le reçu actuel) passerait vraisemblablement de `FAIL` à `OK`.
  **Mais** le `decision` global du run `pong_r2` resterait probablement `BLOCKED`/`FAIL` :
  l'oracle `standard` échoue indépendamment sur `budget.promis_non_depose: ["game_loop"]`
  (`verdict.json` lignes 191–201), et les `humangate_flags` (archi/wiremap sautés, red-team
  dégradé) sont eux aussi indépendants de la question logic_files. Cette option ne « sauve »
  donc que le volet mutation, pas le run entier — à ne pas présenter comme plus qu'elle n'est.

### Option C — Politiques distinctes par catégorie (system vs system.adapter)

- **Protège** : garde les adaptateurs SOUS MESURE (contrairement à B) tout en cessant de les
  juger avec un test_argv qui ne peut structurellement pas les couvrir — ouvre un chemin vers
  un vrai gate pour la présentation, aligné sur les `proof_kind` déjà déclarés par le CORE
  (`artifact`/`pixel`/`bot_action`, `core_requirements.yaml` lignes 74–87) plutôt que forcé
  dans le moule `test`. C'est la seule option qui ne renonce à rien de ce que A protège ni de
  ce que B expose.
- **Expose** : n'existe dans AUCUN code lu (driver.py, mutation_proof.py, `repo_map.yaml`,
  `core_requirements.yaml`) — c'est une conception à faire, pas un bouton à tourner. Tant
  qu'elle n'est pas construite, elle a un effet nul sur tout run réel, y compris `pong_r2`.
  Risque de sur-ingénierie signalé par la doctrine du dépôt elle-même (mémoire
  `knowledge_resolver_direction` : rasoir anti-couches) si le gate par catégorie est ajouté
  sans qu'un deuxième cas d'usage (au-delà de Pong) prouve le besoin.
- **Coût** : le plus élevé des trois — nouveau champ de schéma (catégorie → politique de
  mutation), nouvelle logique dans `run_mutation_for_game`/`emit_mutation_receipt` pour
  porter un `test_argv` distinct par catégorie, mise à jour de `repo_map.yaml`/`core_
  requirements.yaml`, tests dédiés — une mission de la taille d'un contrat Forge à part
  entière (doctrine ADR-002 : aucun agent sans contrat validé sur ce périmètre).
- **Effet chiffré sur `pong_r2`** : **aucun, mesurable aujourd'hui** — rien à chiffrer sans
  la construire ; un nouveau run (`pong_r3` ou équivalent) serait nécessaire une fois le
  mécanisme livré.

---

## 4. La 4ᵉ voie déjà outillée — triage des survivants justifié par équivalence

**Faisabilité mécanique confirmée** par le précédent `games/grid_nav_probe/mutation_triage.json`
(2 mutants `true->false` triés en 2026-07-21, justifiés par lecture du garde consommateur —
`visited.has()` ne lit jamais la valeur stockée — puis re-vérifiés après un changement de
lignes) et par le fait que 3 des 68 survivants de `pong_r2` (tous dans les fichiers systèmes,
§2) sont déjà documentés selon ce même format dans `games/pong/mutation_triage.json`.

**Chiffrage de l'effort restant, par sous-ensemble** :

- **Fichiers systèmes (3 survivants)** : déjà fait — 0 effort supplémentaire, mais la
  désynchronisation `triaged_survivors: []` observée au §2 mérite une vérification (hors
  périmètre de cette mission) avant de compter ces 3 comme définitivement clos dans un
  futur reçu signé.
- **Adaptateurs de présentation (65 survivants bruts, 57 sites uniques (nom, ligne))** :
  **non faisable en masse, honnêtement.** Le précédent (`grid_nav_probe`) portait sur un
  cas étroit et prouvable — une valeur écrite mais jamais lue par aucun consommateur. Les
  survivants d'adaptateurs couvrent des opérateurs (`&&`/`||`, `===`/`!==`, `true`/`false`,
  `+=`) au cœur de branchements de détection d'OS/backend (`capture_godot.mjs`, 23 sites),
  de déclenchement de rendu (`draw.mjs`, `raster.mjs`), de sortie propre (`exit.mjs`) et de
  déclenchement audio (`audio.mjs`) — des points où muter le comportement change très
  probablement un résultat OBSERVABLE (couleur dessinée, code de sortie, cue sonore déclenché),
  simplement jamais observé par la suite scellée actuelle. Trier ces 57 sites comme
  « équivalents » sans preuve individuelle par lecture du code consommateur reviendrait à
  fabriquer un vert, exactement le geste que la garde-fou anti-complaisance de cette mission
  interdit d'euphémiser. Un triage honnête de ce sous-ensemble exigerait, site par site, la
  même preuve que le précédent (lecture du consommateur + justification écrite +
  re-vérification) — un effort de l'ordre de 57 preuves individuelles, dont la plupart
  aboutiraient vraisemblablement à « non équivalent, vrai trou de test » plutôt qu'à une
  clôture, ce qui ne réduit pas le score mais RÉVÈLE le besoin de tests d'adaptateur réels
  (proche de l'option C plus qu'un raccourci de triage).

**Conclusion de la 4ᵉ voie** : faisable et déjà en usage pour les 3 sites systèmes ; pas un
raccourci praticable pour les 65 sites d'adaptateurs — leur volume et leur nature (branches de
comportement observable, pas des écritures mortes) en font un mauvais candidat au triage
d'équivalence, et un bon indicateur que le vrai sujet est la question posée en §3 (quelle
politique de preuve pour la présentation), pas une liste à cocher.

---

## Ce qui reste à décider par Pierre

1. La nature de l'inclusion des adaptateurs (§1) est un effet de bord non discuté — est-ce
   que cela doit rester ainsi, ou la distinction `system`/`system.adapter` déjà présente dans
   `repo_map.yaml` doit-elle devenir une décision explicite (quelle que soit l'option choisie
   ensuite) ?
2. Entre A (statu quo, score trompeur mais rien ne change), B (exclusion, honnête sur les
   systèmes mais renonce à toute mesure automatisée de la présentation) et C (politiques
   distinctes, protège le plus mais coûte le plus et n'existe pas) — quelle direction, et sur
   quel horizon (Pong seul ou tout le curriculum STANDARD) ?
3. La désynchronisation observée entre `triaged_survivors: []` du reçu signé et l'effet réel
   du triage sur `survivants_non_tries` (§2) — à investiguer séparément, avant de compter le
   triage des 3 sites systèmes comme acquis dans un futur run.
4. Si un chantier d'adaptateurs est engagé (Option C ou triage site-par-site), il relève du
   périmètre Forge (ADR-002) : aucun sous-agent sans contrat validé.

---

## SKIPPED_VALIDATION

- Aucun oracle relancé (gate mutation, `forge_gate`, `verify_run`) — conforme au périmètre
  de cette mission (« ne pas relancer le gate mutation »), le reçu signé et son fichier
  d'évidence (hash vérifié par lecture, non recalculé) sont la seule source utilisée.
- La désynchronisation `triaged_survivors: []` vs effet observé du triage (§2) n'a pas été
  investiguée plus loin (hors périmètre — aucune modification de `verdict.json` ni de
  `scripts/forge/mutation_proof.py`).
- `games/pong/mutation_triage.json` est un fichier modifié en arbre de travail (non commité)
  au moment de cette lecture — son contenu a été lu tel quel sur disque, pas depuis HEAD git ;
  signalé pour traçabilité, aucune modification apportée par cette mission.

SKIPPED_VALIDATION: voir liste ci-dessus (3 éléments) — rien d'autre sauté.

---

## Contrat de sortie (résumé structuré)

```
resume_1_phrase: "Les 7 adaptateurs de présentation entrent dans logic_files par un filtre
  générique jamais spécialisé (effet de bord), et portent 65 des 68 survivants (0% tué,
  structurellement — la suite scellée ne les importe jamais) contre 3 survivants déjà
  documentés-équivalents sur les 3 fichiers systèmes (95% tué)."
derivation:
  regle: "logic_files = fichiers .mjs de la wiremap dont la catégorie ne commence pas par
    'test.' (driver.py) ET dont le chemin ne contient pas 'test' (mutation_proof.py) —
    aucun filtre sur la catégorie system.adapter."
  fichier_ligne:
    - "scripts/forge/driver.py:878-910 (_logic_files_from_wiremap_any, filtre test.* ligne 902)"
    - "scripts/forge/mutation_proof.py:46-54 (logic_files_from_wiremap, formule legacy .mjs non-test)"
    - "scripts/forge/oracles.json:77-86 (test_argv du projet pong, réutilisé pour tous les
      logic_files — driver.py:814-824)"
  nature: "effet_de_bord"
  preuve: "aucune ligne de code/commentaire lue ne motive l'inclusion de system.adapter ;
    repo_map.yaml:61-63 distingue déjà system/system.adapter sans que ce filtre l'utilise ;
    grep des imports des 4 tests scellés de pong ne référence aucun fichier adapters/presentation"
fichiers_concernes:
  - "05_SYSTEMS/game_loop/loop.mjs (system)"
  - "05_SYSTEMS/game_state/state.mjs (system)"
  - "05_SYSTEMS/input/input.mjs (system)"
  - "06_RUNTIME/adapters/presentation/audio.mjs (system.adapter)"
  - "06_RUNTIME/adapters/presentation/browser/main.mjs (system.adapter)"
  - "06_RUNTIME/adapters/presentation/capture_browser.mjs (system.adapter)"
  - "06_RUNTIME/adapters/presentation/capture_godot.mjs (system.adapter)"
  - "06_RUNTIME/adapters/presentation/draw.mjs (system.adapter)"
  - "06_RUNTIME/adapters/presentation/exit.mjs (system.adapter)"
  - "06_RUNTIME/adapters/presentation/raster.mjs (system.adapter)"
repartition_survivants:
  par_fichier:
    "05_SYSTEMS/game_loop/loop.mjs": {killed: 14, total: 15, survived: 1}
    "05_SYSTEMS/game_state/state.mjs": {killed: 29, total: 29, survived: 0}
    "05_SYSTEMS/input/input.mjs": {killed: 15, total: 17, survived: 2}
    "06_RUNTIME/adapters/presentation/audio.mjs": {killed: 0, total: 11, survived: 11}
    "06_RUNTIME/adapters/presentation/browser/main.mjs": {killed: 0, total: 4, survived: 4}
    "06_RUNTIME/adapters/presentation/capture_browser.mjs": {killed: 0, total: 5, survived: 5}
    "06_RUNTIME/adapters/presentation/capture_godot.mjs": {killed: 0, total: 23, survived: 23}
    "06_RUNTIME/adapters/presentation/draw.mjs": {killed: 0, total: 3, survived: 3}
    "06_RUNTIME/adapters/presentation/exit.mjs": {killed: 0, total: 10, survived: 10}
    "06_RUNTIME/adapters/presentation/raster.mjs": {killed: 0, total: 9, survived: 9}
  source: "lab/forge_runs/pong/evidence/mutation_pong_r2.json:mutation_result.per_file
    (référencé par verdict.json evidence_path/evidence_sha256, hash cohérent)"
  reconstituable: true
options:
  - nom: "A — tout conserver"
    protege: "visibilité du déficit de preuve des adaptateurs à chaque run, zéro coût"
    expose: "score agrégé 46% trompeur, mélange deux régimes de preuve différents"
    cout: "nul en ingénierie ; coût récurrent = gate mutation structurellement rouge tant
      qu'aucun test scellé n'importe les adaptateurs"
    effet_chiffre_pong_r2: "aucun changement — code oracle FAIL, gate.passed false, 57 sites non triés"
  - nom: "B — exclure system.adapter de logic_files"
    protege: "score honnête sur la logique de jeu pure (95%, 3 survivants déjà documentés)"
    expose: "aucun mutant de présentation plus jamais jugé par un test automatisé — retire
      un des seuls mécanismes pouvant détecter une régression silencieuse de rendu/capture
      (cf. précédent studio 'mécaniquement OK, visuellement mort')"
    cout: "modification driver.py/repo_map.yaml, hors périmètre, contrat requis (ADR-002)"
    effet_chiffre_pong_r2: "projection: total=61 killed=58 survived=3 (déjà triés) -> code
      oracle probablement FAIL->OK ; decision globale du run resterait probablement BLOCKED
      (budget standard oracle FAIL indépendant, humangate_flags indépendants)"
  - nom: "C — politiques distinctes par catégorie"
    protege: "mesure les adaptateurs SOUS un régime de preuve adapté (artifact/pixel/bot_action)
      au lieu de les juger avec un test_argv qui ne peut structurellement pas les couvrir"
    expose: "n'existe dans aucun code lu — conception à faire, risque de sur-ingénierie sans
      un 2e cas d'usage prouvant le besoin"
    cout: "le plus élevé — nouveau schéma + nouvelle logique driver/mutation_proof + contrat dédié"
    effet_chiffre_pong_r2: "aucun, mesurable aujourd'hui — nécessiterait un nouveau run"
voie_triage:
  faisable: "oui pour les 3 sites systèmes (déjà fait, format conforme au précédent
    grid_nav_probe) ; NON praticable en masse pour les 65 sites d'adaptateurs (branches de
    comportement observable, pas des écritures mortes — la plupart aboutiraient
    vraisemblablement à 'non équivalent' plutôt qu'à une clôture)"
  effort: "3 sites systèmes: 0 (déjà fait, sous réserve de la désynchronisation
    triaged_survivors observée) ; 57 sites uniques d'adaptateurs: ~57 preuves individuelles
    (lecture du consommateur + justification + vérification), ordre de grandeur x28 le
    précédent grid_nav_probe (2 sites) — non recommandé comme raccourci"
rapport_path: "docs/audit/ANALYSE_PERIMETRE_LOGIC_FILES_2026-07-26.md"
git_status_final: "aucun fichier modifié par cette mission hors la création de ce rapport ;
  git status --porcelain montrait déjà, avant cette mission, des modifications non liées
  (wiremap.json, mutation_triage.json, driver.py et autres — travail d'autres sessions en
  cours dans ce dépôt, non touché ici)"
skipped_validation:
  - "gate mutation non relancé (hors périmètre explicite de la mission)"
  - "désynchronisation triaged_survivors:[] vs effet observé du triage non investiguée (hors périmètre)"
  - "games/pong/mutation_triage.json lu depuis l'arbre de travail (non commité), pas depuis HEAD"
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
