# Design — Gate mutation de la forge (axe 3/3 : « 100% ou survivant justifié »)

- **Date** : 2026-07-11
- **Source** : session Claude Code, branche `feat/forge-oracle-gate`
- **Auteur** : Claude Code + Pierre (HumanGate sur les décisions de fond)
- **Statut** : design ratifié Pierre (go 2026-07-11), plan d'implémentation à écrire
- **Verdict discipline** : NO_CLAIM_ALLOWED — toute preuve = exécution mécanique
- **Amont** : axes 1 (gate e2e) et 2 (gel traçabilité) livrés+poussés sur `feat/forge-oracle-gate`.

## Contexte et problème

Le mutation testing existe déjà (`scripts/forge/mutation.py`) : `run_mutation_test(source,
test_argv, *, cwd, timeout, limit) -> {total, killed, survived, score, survivors:[{name,line}]}`
mute le code (`>=`→`>`, `&&`→`||`…) et rend le score de mutants tués + la liste des
**survivants** (bugs que les tests ne détectent pas). Mais c'est une **commande manuelle** :
le build ne la lance pas, aucun gate. L'audit de re-forge
(`journal/2026-07-10_reforge_experiment.md`) a mesuré des scores **67–80%** (jamais 100%) —
« oracle vert » ≠ « tests rigoureux ». Le legacy à 100% l'est parce qu'un humain a tué ses
survivants à la main cette session.

**Objectif ratifié Pierre (2026-07-11)** :
- Périmètre axe 3 = **gate mutation seul** (le « contenu » relève du spec produit et est
  déjà partiellement couvert par l'axe 2 — la traçabilité force les fonctions de contenu
  déclarées dans la WireMap à exister).
- Critère de passage = **« 100% ou survivant justifié »** : tous les mutants tués, OU chaque
  survivant explicitement trié comme **équivalent** avec justification (gestion honnête des
  mutants équivalents, impossibles à tuer par un test).

## Décisions de fond ratifiées

1. **Critère « 100% ou survivant justifié »** avec un fichier de triage par jeu.
2. **`total == 0` (aucun mutant généré) = échec** — pas de faux vert sur du vide (leçon de la
   revue de l'axe 2 : ensemble vide = faux vert à proscrire).

## Placement (raffinement d'implémentation)

Le *gate* `check_mutation_gate` (comparer survivants↔triage, déterministe) va dans
`scripts/forge/static_oracles.py` **avec les autres gardes** (`check_e2e_harness`,
`check_feature_set_frozen`), **pas** dans `mutation.py`. Raisons : (a) séparation moteur
(`run_mutation_test` reste dans `mutation.py`) vs gate ; (b) `mutation.py` porte une modif
non commitée hors-axe (durcissement `.mutbak`, « à trier ») — l'axe 3 ne doit pas la bundler.
Le gate ne dépend pas de `mutation.py` (il consomme le dict résultat en entrée).

## Composants

### C1 — Le gate (`static_oracles.py: check_mutation_gate`)

```
check_mutation_gate(mutation_result: dict, triage_entries: list[dict] | None) -> dict
  -> {"passed": bool, "checked": bool, "survivants_non_tries": [...], "triage_perimes": [...]}
```

- Un survivant `{name, line}` est **justifié** ssi une entrée de triage a même `(name, line)`
  ET une `justification` **non vide** (anti-triche : pas de blanc-seing).
- `passed = True` ssi tout survivant est justifié (`survivants_non_tries` vide) ET
  `total >= 1`.
- `mutation_result["total"] == 0` → `{"passed": False, "checked": False, ...}` : aucun mutant
  généré (source non mutable/vide) ⇒ le mutation testing n'a rien prouvé ⇒ jamais un faux vert.
- `triage_entries is None` → traité comme `[]` (aucun triage) : des survivants ⇒ FAIL.
- Entrée de triage qui ne matche aucun survivant → `triage_perimes` (informatif, non bloquant :
  le mutant a été tué ou a disparu du code).

### C2 — Fichier de triage (`games/<projet>/mutation_triage.json`)

Format : `[{"name": "<op>@L<line>", "line": <int>, "justification": "<pourquoi équivalent>"}]`.
Produit par le builder quand il juge un survivant équivalent ; la `justification` est obligatoire.
Loader (dans `static_oracles.py`, testable) :
- `load_mutation_triage(game_dir: Path | str) -> list[dict] | None` — lit
  `<game_dir>/mutation_triage.json`, `None` si absent/illisible/non-liste (utf-8 explicite).

### C3 — Branchement (skill `/forge` s10a + contrat s9)

- **s10a** : après l'oracle-code, pour un JEU, lance le moteur puis le gate :
  ```python
  from forge.mutation import run_mutation_test
  from forge.static_oracles import check_mutation_gate, load_mutation_triage
  mut = run_mutation_test("games/<projet>/game.mjs",
                          ["node", "--test", "logic.test.mjs", "properties.test.mjs"],
                          cwd="games/<projet>")
  mgate = check_mutation_gate(mut, load_mutation_triage("games/<projet>"))
  oracle_ok = code.ok and e2e_guard["passed"] and wire["passed"] and mgate["passed"]
  ```
- Survivant non justifié → **auto-correction** via la boucle d'escalade EXISTANTE (re-dispatch
  s9 avec le rapport « tue le survivant `name@line` par un test, OU triage-le équivalent avec
  justification »), cap `MAX_ESCALATIONS`. Fini le 68% qui passe en silence.
- **s9 durci** : pour un JEU, le build DOIT atteindre 100% mutation OU fournir un
  `mutation_triage.json` justifié.

## Flux de données

1. s10a exécute l'oracle-code (run-oracle.mjs). 2. Pour un JEU : `run_mutation_test(game.mjs,
   tests)` → `mut`. 3. `check_mutation_gate(mut, load_mutation_triage(game_dir))` → `mgate`.
4. `oracle_ok` combine les 4 gardes ; survivant non justifié → escalade ; sinon continue.

## Limites connues (revue 2026-07-11)

- **Justification = revue humaine, pas machine** : le gate exige une justification **non vide**
  (anti-blanc-seing), mais n'en juge pas la pertinence. C'est HumanGate qui lit les
  justifications au verdict — cohérent avec la posture des axes 1&2 (builders non-adversariaux,
  HumanGate terminal).
- **Clé `(name, line)` non unique** : `name` = la règle de mutation (ex. `ge->gt`), `line` sans
  colonne. Deux mutants sur la même ligne partagent la clé. Le gate **refuse de les trier**
  (marqués « ambigu » → non justifiés) plutôt que de laisser un triage en masquer un vrai. Fix
  amont propre = index d'occurrence dans `mutation.generate_mutants` (hors périmètre axe 3, à filer).
- **Fichiers mutés** : le skill mute **les fichiers logiques déclarés par la WireMap** (pas
  seulement `game.mjs` — la logique est répartie), et agrège survivants + total. `total==0`
  (aucun fichier logique mutable) → escalade-guidée « déclare/mute les vrais fichiers », jamais un vert.

## Gestion d'erreur

- **`total == 0`** : `checked=False` → non-prouvable → pas un vert ; escalade-guidée (pas un STOP dur).
- **Triage absent** : `None` → aucun survivant justifié → des survivants ⇒ FAIL (auto-correction).
- **Coût** : `run_mutation_test` relance les tests une fois par mutant. Timeout par mutant
  déjà présent (`timeout=60`) ; un mutant qui boucle = détecté (killed). Le `limit` existant
  borne le nombre de mutants si besoin (non utilisé par le gate par défaut : couverture pleine).

## Comment on prouve que ça marche (exécution, pas existence)

1. **Unitaire C1** : survivors vide + total≥1 → PASS ; 1 survivant sans triage → FAIL
   (`survivants_non_tries` non vide) ; survivant triagé+justifié → PASS ; triagé mais
   justification vide → FAIL ; `total==0` → `passed=False, checked=False` ; entrée de triage
   sans survivant correspondant → `triage_perimes` non vide, non bloquant.
2. **Unitaire C2** : `load_mutation_triage` lit un fichier valide ; `None` si absent / JSON
   corrompu / non-liste.
3. **Intégration réelle** : un vrai `run_mutation_test` sur une mini-source `.mjs` en tmp
   (avec un test node minimal) → alimente `check_mutation_gate` de bout en bout — prouve que
   le gate consomme la **vraie** sortie du mutateur (pas un dict fabriqué). Node requis : skip
   explicite si absent (jamais un faux vert). `limit` borne le coût.

## Hors périmètre (cohérent avec « un axe à la fois »)

- Richesse de **contenu** (`level.mjs`, nombre de niveaux) — relève du spec produit ; partie
  déjà couverte par l'axe 2 (traçabilité force les fonctions de contenu déclarées à exister).
- Traçabilité jusqu'à la **preuve-test** (chaque R-n → un test réel qui passe) — axe 2-bis.

## Fichiers touchés (prévision)

- `scripts/forge/static_oracles.py` — `check_mutation_gate` + `load_mutation_triage` (C1/C2).
- `scripts/forge/tests/test_mutation_gate.py` (nouveau, preuve 1/2).
- `scripts/forge/tests/test_mutation_gate_integration.py` (nouveau, preuve 3, node-guarded).
- `.claude/skills/forge/skill.md` — s10a : lancer moteur + gate, fold dans `oracle_ok` (C3).
- `scripts/forge/contracts/s9-build.yaml` — exiger 100% mutation OU triage justifié (C3).
  **Zone protégée `tests/**` non touchée. `mutation.py` non touché (évite le bundle `.mutbak`).**
