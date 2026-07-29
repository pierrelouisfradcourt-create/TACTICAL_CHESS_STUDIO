# PROPOSITION — périmètre de mutation multi-runtime (V1)

**Statut : PROPOSED — aucune ligne de code écrite.** Rédigé le 2026-07-28 par la session Fable
sur demande de Pierre (« fais une proposition d'architecture basée sur les capacités déclarées
du jeu (runtime/contrat), avec l'impact sur Pong et Snake. Je veux voir les options avant toute
modification »). Tous les chiffres sont mesurés, chaque affirmation porte sa source.
`claim_verdict: NO_CLAIM_ALLOWED`.

## 1. Le fait central : la donnée manquante existe déjà

Les instruments **devinent** le runtime d'un jeu (extension `.mjs`, chemins en dur) alors que
chaque jeu le **déclare** dans son contrat :

```
games/pong/00_CHARTER/game_contract.yaml   → runtimes: [rules, browser, godot]
games/snake/00_CHARTER/game_contract.yaml  → runtimes: [rules, godot]
```

Aucun des quatre verrous ci-dessous ne lit ce champ. C'est la forme commune des six pannes
rencontrées dans ce cycle : **un instrument qui suppose une topologie au lieu de la lire.**

## 2. Les quatre verrous, mesurés

| # | Verrou | Emplacement | Effet mesuré sur Snake |
|---|---|---|---|
| 1 | Périmètre filtré sur `.mjs` | `mutation_proof.py:105` | 0 fichier logique → `BLOCKED "fichiers logiques inconnus"` |
| 2 | Solvabilité exigée en `.mjs` | `static_oracles.py:403` (`07_TESTS/oracle/solvability.mjs`) | `passed: false` — **et ce volet est gatant** |
| 3 | `cwd` de la commande de test ignoré | `mutation_proof.py:206` impose `cwd=game_dir` ; `oracles.json` déclare `cwd: "."` | commande introuvable → baseline rouge → mutation jamais lancée |
| 4 | Scellement des fichiers de test | `mutation_proof.py:259` ne scelle que les arguments existant sous `game_dir` | commande wrapper (`godot_oracle.mjs`, hors du jeu) **non scellable** → refus dur |

**Conséquence à retenir : corriger le seul verrou 1 transforme un BLOCKED en un autre BLOCKED.**
Les quatre se traitent ensemble ou pas du tout.

## 3. Ce que dit la gouvernance déjà ratifiée

- Contrat `n2-perimetre-mutation-categorie` (RATIFIÉ 2026-07-27), garde-fou 1 : « la restriction
  se fait par **CATÉGORIE STRUCTURÉE**, **jamais** par heuristique de chemin ou de nom ».
  → Le filtre `.mjs` **est** une heuristique de chemin : il pré-date le contrat et le viole déjà.
- Garde-fou 2 du même contrat : « exclusion DÉCLARÉE, jamais silencieuse ».
  → Les `.gd` sont aujourd'hui rejetés **silencieusement** (ni dans `included`, ni dans
  `excluded`, ni dans les compteurs). Deuxième violation de fait.
- `repo_map.yaml` (table figée) pose déjà, pour `asset.*` et `test.*` : « l'extension n'est PAS
  figée dans le gabarit — c'est le NOM qui identifie, pas le format ».
- Décision U-2 : « logique testable → mutation · rendu/runtime → oracle produit ».

La doctrine existante **désigne donc déjà la catégorie comme critère**, et l'extension comme un
accident historique.

## 4. Impact mesuré du changement, par jeu

Seuls **2 jeux** ont une wiremap, donc seuls 2 passent par ce chemin.

**Snake** (71 entrées de fichiers, 100 % `.gd`) : 15 `system` entreraient dans le périmètre ·
18 `system.adapter` seraient exclus **et déclarés** (motif U-2) · 36 `test.*` déjà filtrés par
catégorie · **2 entrées non gouvernées** (`godot.project_root`, `godot.project_tests`) tomberaient
dans le périmètre par défaut — ce serait **muter la preuve elle-même**, exactement ce que le
filtre `test.*` interdit. À traiter explicitement, quelle que soit l'option.

**Pong** (jeu mixte : 22 `.mjs` + 1 `.gd`) : son unique `.gd`
(`06_RUNTIME/adapters/presentation/godot/main.gd`) est catégorisé `system.adapter`, donc **exclu**.
**Aucun score de mutation ne change.** En revanche la *structure* du reçu change :
`categories_exclues` passe de 7 à 8 entrées. Un reçu archivé reste vérifiable
(`code_sha256` inchangé) mais un re-run produirait un `detail` différent — à ne pas confondre
avec une falsification lors d'une comparaison manuelle.

**Les 3 autres jeux Godot** (chess_tcg, grid_nav_probe, snake_survivor) n'ont pas de wiremap :
non affectés. `grid_nav_probe` prouve au passage que **le moteur de mutation sait déjà muter le
GDScript** — son `mutation_triage.json` porte deux survivants `.gd` triés, produits hors chaîne
wiremap via `--logic-files`/`--mutation-test-argv`.

## 5. Trois options

### Option A — ajouter `.gd` à la liste d'extensions
**Geste** : `mutation_proof.py:105` → `_EXTENSIONS_MUTABLES = (".mjs", ".gd")`.
**Coût** : ~5 lignes + 1 ligne d'un helper de test. Le plus faible.
**Ce qu'on gagne** : rien d'utilisable — les verrous 2, 3 et 4 bloquent toujours.
**Ce qu'on perd** : on inscrit dans le code une heuristique que le contrat ratifié interdit, et
chaque runtime futur (Rust, C#) exigera une nouvelle ratification.
**Verdict : à écarter.** Elle donne l'illusion d'un déblocage sans en produire un.

### Option B — périmètre gouverné par la CATÉGORIE seule
**Geste** : supprimer le test d'extension ; le périmètre devient « catégorie déclarée ∉
{`test.*`, `system.adapter`, `asset.*`, `godot.project_*`} ». Table des catégories jugeables
adossée à `repo_map.yaml`.
**Coût** : moyen. Casse 3-4 tests qui figent des valeurs `.mjs`, et exige de **conserver un
garde-fou d'extension pour la seule branche LEGACY** (wiremaps `features[]` sans catégorie, où
rien d'autre n'écarte `notes.md`/`style.css`).
**Ce qu'on gagne** : la conformité au garde-fou 1 déjà ratifié, et la fin des exclusions
silencieuses (les `.gd` seraient enfin *déclarés* exclus ou inclus). Neutre pour tout futur runtime.
**Ce qu'on perd** : ne débloque toujours pas Snake seule (verrous 2-4 intacts).

### Option C — descripteur de preuve déclaré par le jeu
**Geste** : le jeu déclare, dans son `game_contract.yaml` (qui porte déjà `runtimes:`) ou dans
son entrée `oracles.json` (qui porte déjà `cwd` et, depuis le 28-07, un bloc `solvability`) :
les catégories mutables, la commande de test de mutation **avec son `cwd`**, et les fichiers de
preuve à sceller. `mutation_proof.py` (argv, cwd, scellement) et `static_oracles.py:403`
(solvabilité) **lisent** ce descripteur au lieu de le deviner.
**Coût** : élevé — touche 3 modules, un schéma nouveau, et sort de l'`in_scope` du contrat n2
(donc exige une décision explicite).
**Ce qu'on gagne** : c'est la **seule option qui traite les quatre verrous**, et elle généralise
au prochain moteur sans nouvelle ratification.
**Ce qu'on perd / point non tranché** : sceller une commande *wrapper* qui vit **hors** du dossier
du jeu (`scripts/forge/godot_oracle.mjs`) change la sémantique de `code_sha256` — aujourd'hui « ce
qui a été muté et testé est scellé dans le jeu ». Il faut décider ce qu'on scelle : le wrapper,
le script Godot qu'il lance (`res://tests/run_tests.gd`, lui dans le jeu), ou les deux.

## 6. Recommandation

**B + C ensemble, dans cet ordre, et rien avant ta décision.**
- **B** rend le périmètre conforme à un contrat que tu as déjà ratifié (c'est une mise en
  conformité, pas une extension du système) ;
- **C** est la seule qui débloque réellement un jeu non-web, et elle repose sur une donnée que
  les jeux **déclarent déjà** — on ne crée pas une couche, on branche une déclaration existante.

**A est à écarter** : elle coûte peu et ne débloque rien, tout en gravant l'heuristique interdite.

## 7. Ce qui reste à trancher (questions ouvertes, pas des détails)

1. **Que scelle-t-on** pour une commande wrapper hors du jeu (verrou 4) ? C'est la seule question
   de conception réellement non résolue.
2. **`godot.project_root` / `godot.project_tests`** : catégories créées le 28-07, non gouvernées
   par le périmètre de mutation. Elles contiennent la preuve (`tests/run_tests.gd`) — donc à
   ranger explicitement du côté exclu, comme `test.*`.
3. **Coût d'exécution** : muter 15 fichiers `.gd` implique un lancement Godot headless par mutant.
   Aucun budget/`limit` n'est câblé depuis le driver (`mutation.py` expose `limit`, jamais passé).
   À chiffrer avant le premier run réel, sinon la mesure coûtera plus que le build.
4. **`games/snake/mutation_triage.json` n'existe pas** : le premier run réel produira des
   survivants non triés, donc un gate rouge légitime et une charge de justification.

---
software_verdict: OK (analyse ; aucun code) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
claim_verdict: NO_CLAIM_ALLOWED
