# Rapport red-team CODE — projet `tetris` (aveuglé)

- **Run** : `tetris-witness-20260803-175558` / étape `s11-redteam-code`
- **Posture** : auditeur adverse, contexte vierge, sans les justifications du builder.
- **Périmètre lu** : `games/tetris/**` (code s9 + wiremap 09 + contrat 00) ; `scripts/forge/mutation.py`
  lu **uniquement** pour ancrer une reproduction (comprendre ce que l'oracle de mutation mute réellement).
- **Nature** : ADVISORY. Le red-team CRITIQUE, les oracles PROUVENT. Aucun de ces findings n'entre
  dans `software_verdict`. Chaque finding porte une reproduction **exécutable par un oracle non-LLM** en aval.
- **Je ne conteste pas** les verts existants (constat non-LLM du build) : `run_tests.gd` 176/176 (exit 0),
  solvabilité 50/50, mutation 45/45 tués. Mes findings portent sur **ce que ces verts ne prouvent pas**.

---

## F1 — `Mutation … 0 mutant` est une preuve VIDE, pas une preuve de robustesse (HIGH)

**Angle** : fausses preuves / survivants de mutation dont l'équivalence n'est pas prouvée mécaniquement.

Le `preuve` de 4 lignes de la wiremap affiche « Mutation X 0 mutant » comme colonne de validation :
`params.gd` (l.62), `bag.gd` (l.147), `lock.gd` (l.307), `debug_state.gd` (l.521), résumé
`build_constat.mutation_brut` : « 4 fichiers à 0 mutant (aucun opérateur mutable) ».

C'est mécaniquement exact **mais trompeur**. `scripts/forge/mutation.py` ne mute QUE des tokens
relationnels/logiques/égalité/affectation-composée : `RULES` = `>= <= === !== && || += -=`,
`_WORD_RULES` = `true false and or`, `_EQ_RULES` = `== !=` (mutation.py:25-54). Il **ne mute jamais**
l'arithmétique nue (`+ - * / %`), le bitwise (`&`), les littéraux numériques ni l'affectation `=`.

Or `bag.gd` est fait EXACTEMENT de ces constructs non-mutés : LCG `(x * 1103515245 + 12345) & 0x7fffffff`
(l.32), `(seed_val & 0x7fffffff) + 1` (l.35), Fisher-Yates `rng % (i + 1)` (l.20-22),
`range(P.PIECE_COUNT - 1, 0, -1)`. Aucun `>=`, `==`, `and`, `true`… → **0 mutant généré**. Idem
`params.gd` (`type + 1`, `(rot % 4 + 4) % 4`, tables `Vector2i`), `lock.gd` (écriture grille), `debug_state.gd`.

Conséquence : le **générateur d'aléa/mélange déterministe — cœur du genre** (`genre.tetris.deterministic_bag`,
`seven_tetrominoes`) — a **zéro signal de mutation**. « 0 mutant » ne dit pas « robuste », il dit
« l'oracle est aveugle à ce fichier ». Sa justesse repose alors uniquement sur `test_piece_bag.gd`,
qui ne la couvre pas (cf. F5).

**Reproduction (oracle non-LLM)** :
1. Statique — `python -c "from scripts.forge.mutation import generate_mutants, comment_prefixes_for; import pathlib; p=pathlib.Path('games/tetris/05_SYSTEMS/piece_bag/bag.gd'); print(len(generate_mutants(p.read_text(encoding='utf-8'), comment_prefixes_for(p))))"` → imprime `0`. Le méta-oracle ne produit **aucun** mutant pour `bag.gd`.
2. Dynamique — remplacer le multiplicateur LCG `1103515245` par `0` dans `bag.gd` (`_lcg` devient
   la constante `12345`), puis `godot --headless --path games/tetris --script res://tests/run_tests.gd`.
   Attendu : exit **0**, 176/176. Toutes les graines produisent alors le MÊME ordre de pièces (la
   promesse « la graine ne change que l'ORDRE » et « `next_seed` évite qu'un sac se répète » est brisée),
   **et la suite reste verte**. C'est un mutant que `mutation.py` ne génère même pas.

---

## F2 — La géométrie des 7 tetrominos (la donnée qui DÉFINIT le genre) n'est épinglée par rien (MEDIUM)

**Angle** : état/donnée codé en dur non prouvé ; gameplay non observable.

`params._build_shapes()` (params.gd:61-104) est la donnée la plus identitaire du jeu : les offsets
des 7 pièces × 4 orientations. Aucun test n'assère un seul offset : `test_params.gd` ne vérifie que
la **cardinalité** (`P.shape(t,r).size() == 4`, l.22-24). `mutation.py` ne mute pas les littéraux
`Vector2i`. Résultat : la forme réelle des pièces n'a **ni test ni mutation**.

Un `S` transformé en `O`, un offset décalé, une pièce dégénérée — passent les 176 assertions. La
solvabilité s'y adapterait (le bot rejoue la logique). Le genre `seven_tetrominoes` est prouvé sur
l'*ensemble* {0..6} (via `bag`), jamais sur la *forme*.

**Reproduction (oracle non-LLM)** : corrompre un `Vector2i` dans `_build_shapes` (ex. `s_p` rot0
`Vector2i(1, 0)` → `Vector2i(0, 0)`), puis `godot --headless --path games/tetris --script res://tests/run_tests.gd`
→ exit **0**, 176/176. La corruption de forme survit.

---

## F3 — Dérive contrat↔code sur la solvabilité (décision « ouverte » fermée en dur, `max_ticks` 200 vs 20000) (MEDIUM)

**Angle** : écart entre ce que le contrat déclare et ce que le code fait.

`00_CHARTER/game_contract.yaml` (proof.solvability, l.75-84) déclare `max_ticks: 20000`, `trials: 50`,
et dit explicitement que le critère de succès est une « **DÉCISION OUVERTE à trancher avant s9** ». La
wiremap `fog` (09/wiremap.json:530) répète « La solvabilité reste à définir ».

`solvability.gd` fige pourtant en dur : `N_SURVIVE = 8`, `MAX_TICKS_DEFAUT = 200` (l.22-23) et le
critère `survived >= 8 and lines_cleared >= 1` (l.50). Deux écarts :
- `MAX_TICKS_DEFAUT = 200` contredit d'un facteur **100×** le `max_ticks: 20000` du contrat. Si l'oracle
  aval n'injecte pas `--max_ticks`, le bot ne dispose que de 200 ticks au lieu des 20000 contractés.
- Le seuil `N_SURVIVE = 8` n'a **aucun** pendant dans le contrat (ni ratifié, ni tracé) ; la « décision
  ouverte » est refermée silencieusement, sans que le contrat/wiremap soient mis à jour.

Fermer la décision en code est le rôle de s9 ; **la divergence numérique et l'absence de trace** sont
la faille. (Je ne peux PAS voir `solvability_godot.mjs` — hors périmètre diff — donc j'ignore quel
`max_ticks` est réellement passé : cf. fog / SKIPPED_VALIDATION.)

**Reproduction (ancre statique)** : diff des deux valeurs — `game_contract.yaml:82` (`max_ticks: 20000`)
vs `solvability.gd:23` (`MAX_TICKS_DEFAUT: 200`), et `N_SURVIVE: 8` (`solvability.gd:22`) sans clé
correspondante dans `game_contract.yaml`. Dynamique : `godot --headless --path games/tetris --script res://solvability.gd`
sans `--max_ticks` → le reçu `FORGE_TRIAL` s'exécute sur 200 ticks, pas 20000.

---

## F4 — L'oracle de solvabilité réutilise les briques testées dans son planificateur, contre son propre commentaire (MEDIUM)

**Angle** : preuve factice / indépendance de l'oracle.

`solvability.gd:83` affirme « Le générateur d'instances ne consulte JAMAIS la brique testée : le bot
rejoue la logique réelle (drop + lock + clear), il ne devine pas ». Or `_compute_plan` appelle
**directement les briques sous test** pour évaluer les placements : `Lock.lock_piece` (l.93) et
`LineClear.clear_lines` (l.94) — les mêmes modules que `Loop.step` exécute ensuite.

Donc un bug PARTAGÉ par `Lock`/`LineClear` apparaît à l'identique dans le planificateur ET dans
l'exécution : le critère `lines_cleared >= 1` peut rester vert sur une logique de clear fautive
(ex. un `_row_full` qui accepterait une rangée non pleine — le bot la « viserait » et la « nettoierait »
de façon cohérente des deux côtés). L'oracle de solvabilité n'est donc **pas** un contrôle indépendant
de `Lock`/`LineClear` ; son indépendance réelle est reportée sur les tests unitaires + mutation (eux-mêmes
troués, cf. F1/F2). Le commentaire l.83 est factuellement faux.

**Reproduction (ancre statique)** : `solvability.gd:93-94` invoquent `Lock.lock_piece` /
`LineClear.clear_lines`, contredisant le commentaire l.83. Grep `Lock\.\|LineClear\.` sur `solvability.gd` → présents.

---

## F5 — `test_piece_bag.gd` n'assère jamais « graines différentes → suites différentes » (MEDIUM)

**Angle** : test vert par le mauvais chemin causal / propriété de genre non couverte.

`test_piece_bag.gd` vérifie : ensemble `== {0..6}` (l.14), multiplicité 1 (l.16), déterminisme
`generate_bag(1) == generate_bag(1)` (l.18), `next_seed(1) != 1` (l.20). Il ne vérifie **jamais** que
deux graines DIFFÉRENTES donnent des ordres différents, ni que `next_seed` change effectivement l'ordre
du sac suivant. Ce sont pourtant les promesses explicites du code (`bag.gd:10` « la graine ne change que
l'ORDRE » ; `bag.gd:26` `next_seed` « évite qu'un sac se répète à l'identique »). Un sac constant
(cf. mutant F1) satisfait toutes les assertions présentes. `next_seed(1) != 1` teste que la graine
bouge, pas que la SUITE de pièces en dépende.

**Reproduction (oracle non-LLM)** : ajouter à `test_piece_bag.gd` l'assertion manquante
`h.ok(Bag.generate_bag(1) != Bag.generate_bag(2), "graines distinctes -> sacs distincts")`, puis
appliquer le mutant LCG de F1 (`* 1103515245` → `* 0`) : cette nouvelle assertion échoue alors que
l'actuelle suite reste verte — preuve que la propriété n'est aujourd'hui **pas** épinglée.

---

## F6 — Rendu et sortie propre : NON MESURÉS par un oracle (LOW→MEDIUM)

**Angle** : gameplay non observable.

`core.render` (kind `pixel`) et `core.exit` sont vérifiés « par lecture » seulement. La wiremap amont
le déclare : `core.render.oracle` = capture GPU vulkan « **NOT_MEASURED en headless** », `core.exit.oracle`
= « requires_gpu_window (non mesuré en headless) ». Aucun reçu de capture/pixel n'existe dans ce run.
Le « jeu jouable/visible » de R9 repose donc sur `godot_oracle.mjs ALL CHECKS PASSED` (lançabilité +
solvabilité mécaniques), **pas** sur une preuve que l'écran change avec l'état ni que ESC quitte
proprement. C'est **honnêtement divulgué** (fog) — d'où la sévérité basse — mais reste une zone non prouvée,
exactement le risque « mécaniquement OK, visuellement mort » du studio.

**Reproduction (ancre statique)** : wiremap `fog` + descripteurs `core.render`/`core.exit` (`oracle` =
NOT_MEASURED / requires_gpu_window) ; aucun artefact pixel/capture dans le run_dir. Dynamique possible en
aval : capture GPU `--rendering-driver vulkan --position -3000,-3000`, comparer deux états ⇒ diff non nul,
aucune image monochrome.

---

## F7 — `EXPECTED_ASSERTS = 176` codé en dur : casse dès que le jeu grandit (LOW)

**Angle** : état attendu codé en dur qui casserait si le jeu grandit.

`run_tests.gd:11` fige `const EXPECTED_ASSERTS := 176` et force un échec si `passed + failed != 176`
(l.64-66). C'est un garde-fou anti-faux-vert **volontaire et aujourd'hui exact** (j'ai recompté les 12
fichiers : 40+47+14+6+7+11+7+8+7+8+7+14 = **176**). Mais c'est un couplage fragile : ajouter/retirer UNE
seule assertion, ou un test, fait passer toute la suite au ROUGE via le méta-check — même si chaque
assertion réelle est verte. Le signal « rouge » devient alors ambigu (régression réelle vs simple
croissance de la suite).

**Reproduction (oracle non-LLM)** : ajouter un `h.ok(true, "sonde")` dans n'importe quel `test_*.gd`,
puis `godot --headless --path games/tetris --script res://tests/run_tests.gd` → exit **1**, message
« META: 177/176 assertions ». Aucune régression fonctionnelle, suite rouge.

---

## Notes défensives (PAS des findings — aucune reproduction déclenchable dans le code actuel)

- `lock.gd:16` écrit `g[c.y][c.x] = color` sans garde de bornes ; en GDScript un `y` négatif indexerait
  par la fin (corruption silencieuse plutôt que crash). **Non retenu** : `active` n'est jamais posé que
  sur une pièce ayant passé `piece_fits` (toujours dans les bornes), et `SPAWN=(3,0)` sans zone tampon
  au-dessus ⇒ aucun `y<0` atteignable aujourd'hui. Deviendrait exploitable si une zone de spawn masquée
  (buffer rows) était ajoutée. Signalé comme dette de robustesse, pas comme faille prouvée.

---

## RAPPORT FINAL (verdicts séparés)

- **software_verdict : OK** — porte UNIQUEMENT sur les oracles existants, constat non-LLM non contesté :
  `run_tests.gd` 176/176 (exit 0), solvabilité 50/50, mutation 45/45 tués. Je ne conteste aucun de ces verts.
- **evidence_verdict : MECHANICAL_VALIDATION_ONLY** — mes findings s'appuient sur des **ancres statiques**
  directement lues dans les artefacts (`mutation.py` RULES, `bag.gd`, `params.gd`, `solvability.gd`,
  `game_contract.yaml`, `run_tests.gd`, wiremap). Les reproductions **dynamiques** sont fournies mais
  **non exécutées par moi** (permission `run: aucun`) : elles sont destinées à un oracle non-LLM aval.
- **claim_verdict : NO_CLAIM_ALLOWED** — red-team advisory ; aucune faille n'entre dans `software_verdict` ;
  aucune affirmation auto-certifiée. Ce qui exige un run/oracle indisponible ici est remonté en **fog** ci-dessous.

### fog → HumanGate (Pierre)
- Quel `max_ticks` `solvability_godot.mjs` passe-t-il réellement (200 par défaut de `solvability.gd`, ou
  20000 du contrat) ? Non vérifiable ici (`.mjs` hors périmètre diff). **Décision** : réconcilier
  contrat↔code, ou ratifier `N_SURVIVE=8`/critère de solvabilité comme fermeture officielle de la décision ouverte.
- Faut-il élargir `mutation.py` aux opérateurs arithmétiques/bitwise/littéraux, ou assumer que `params`/`bag`/
  `lock`/`debug_state` sont couverts **uniquement** par tests unitaires (à durcir, cf. F2/F5) ? Choix de conception.
- Le rendu (F6) doit-il devenir un oracle bloquant (capture GPU) ou rester advisory ? Décision produit.

### SKIPPED_VALIDATION
- **Exécution des reproductions dynamiques** — *où* : F1(2), F2, F3(dyn), F5, F6(dyn), F7 — *statut* : NON FAIT —
  *raison* : permission `run: aucun`. Reproductions rédigées pour exécution par un oracle non-LLM aval ; le
  mutant LCG de F1 est tracé À LA MAIN (logique déterministe), non exécuté.
- **Lecture de `solvability_godot.mjs` / `godot_oracle.mjs`** — *où* : F3 — *statut* : NON FAIT — *raison* :
  hors périmètre du diff s9 (contexte aveuglé). Impact : `max_ticks` réellement passé indéterminé → remonté en fog.
- **Vérification de l'invocation réelle de `mutation.py` dans le build** (`build_constat.mutation_brut`) — *où* :
  F1 — *statut* : PARTIEL — *raison* : j'ai lu le code de `mutation.py` (règles de mutation) et déduit la cause
  du « 0 mutant » ; je n'ai pas rejoué la commande de mutation du run.
- **Oracle visuel / pixel** — *où* : F6 — *statut* : NON FAIT (hérité) — *raison* : `requires_gpu_window`,
  texture nulle en headless ; poste GPU requis, non disponible en audit lecture seule.
- **Truncation wiremap amont** — *où* : lignes `core.line_clear`/`end_condition` du prompt tronquées —
  *statut* : PARTIEL — *raison* : j'ai lu le fichier complet `09_WIREMAP/wiremap.json` du dépôt (non tronqué),
  qui couvre les 12 systèmes ; findings établis dessus.
