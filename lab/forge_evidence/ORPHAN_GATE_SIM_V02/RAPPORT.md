# ORPHAN-GATE SIM V0.2 — mesure de l'amélioration du détecteur, aucun blocage réel

Date : 2026-08-07. Repo : C:\TACTICAL_CHESS_STUDIO. Prototype jetable dans
`lab/forge_evidence/ORPHAN_GATE_SIM_V02/orphan_gate_sim_v2.py`. Rien sous `scripts/forge/`,
`scripts/observer/`, `.claude/hooks/`, `games/`, `tests/` n'a été modifié. `ORPHAN_GATE_SIM_V01/`
n'a pas été touché (reste la baseline). Aucun git add/commit/push. Aucun registre créé.

## Les trois corrections implémentées

### Correction 1 — résolution qualifiée des consommateurs

Fini la recherche par nom nu. Pour chaque symbole candidat `S` défini dans `fichier F`, le détecteur
construit — une seule fois par fichier de production, en cache — une table de liaisons d'import :
- `import X[.Y.Z] [as W]` → `W` lié à tous les suffixes pointés de `X.Y.Z` (ex. `scripts.forge.audit`,
  `forge.audit`, `audit` — car ce dépôt importe en pratique `from forge.audit import ...`, cf.
  `driver.py:39`, avec `scripts/` sur `sys.path`).
- `from X import Y [as W]` → `W` lié à (candidats de module `X`, symbole d'origine `Y`) **ET** (fix
  appliqué après un faux négatif mesuré, cf. section Correction 1 — bug trouvé) traité en plus comme
  un lien vers le **sous-module** `X.Y`, car `from pkg import submodule` est une syntaxe Python valide
  qui lie `submodule` à l'objet module lui-même (cas réel : `observer/fleet.py:43` fait
  `from observer.adapters import forge_evidence, forge_run` puis `forge_run.collect(ctx)`).
- `from X import *` → traité explicitement : reste un lien qualifié (le nom nu est vraiment importé
  dans l'espace de noms du fichier), marqué `star_import` pour audit (preuve plus faible qu'un import
  nommé, mais valide).
- Pour les méthodes de classe (nouveau, ajouté après avoir trouvé 10 faux positifs sur
  `scripts/observer/sources.py`) : `ClassName.methode(...)` compte si `ClassName` est importé depuis le
  module de définition (`class_static_attr`) ; `var.methode(...)` compte si `var` est un paramètre
  annoté `var: ClassName` **quelque part dans le fichier appelant** et que `ClassName` est lui-même
  importé depuis le module de définition (`typed_instance_attr`, heuristique fichier-large — voir
  Limites). Sans ce second mécanisme, `ObserverContext.build/run_dir/read_json/iter_files/...`
  (9 méthodes, toutes réellement consommées via `ctx.read_json(...)` etc. où `ctx: ObserverContext`
  est le paramètre typé) auraient été signalées à tort.
- Pour les `.mjs` : `import { X } from './module.mjs'` résolu en chemin absolu réel (relatif au fichier
  importeur), comparé au fichier de définition ; `import * as ns from ...` + usage `ns.X` ; import par
  défaut. Usage vérifié hors commentaires (même stripper que V01).
- Usage dans le même fichier (`same_file`) reste valide comme consommateur (doctrine V01 inchangée),
  **mais** avec un bug corrigé : le nom du symbole apparaît toujours à sa propre ligne de définition
  (`export function checkSourceUrlStability(docs) {`) ; V01 comme V02-brouillon comptaient cette ligne
  comme sa propre preuve de consommation pour les `.mjs` (bug trouvé en calibration, voir plus bas —
  jamais présent côté Python, où l'exclusion de la ligne `def` existait déjà).

**Bug trouvé en cours de route (rapporté, pas caché) :** la première version de V02 comptait la ligne
`export function checkSourceUrlStability(docs) {` elle-même comme un "consommateur `same_file`",
parce que `mjs_identifier_lines` indexe tous les identifiants du fichier sans exclure la ligne de
définition (contrairement à l'indexeur Python qui exclut `def_names_at_line`). Résultat : le 2e cas de
calibration obligatoire (`checkSourceUrlStability`) échouait (`would_block: false` alors qu'il doit être
`true`). Corrigé en passant `def_line` à `find_consumers_mjs` et en l'excluant du même-fichier — comme
demandé par la règle de probité, ceci est documenté plutôt que masqué.

### Correction 2 — exclusions explicites, visibles, comptées

Quatre catégories mesurées sur ce run (comptées, pas devinées) :

| catégorie | motif | count (sweep worktree) | exemples vérifiés |
|---|---|---|---|
| `python_dunder` | `__x__` (Python) | 6 | `driver.py:__init__`, `events.py:__post_init__` |
| `framework_handler` | `do_GET/do_POST/.../log_message`, hooks `pytest_*`, `setUp/tearDown` | 6 | `observer/live.py` : les 6 méthodes de dispatch `BaseHTTPRequestHandler` |
| `test_support_path` | chemin `*_fixtures.*`, `conftest.py`, `*fixtures*.mjs`, `/fixtures/` | 16 | 16/16 = `scripts/forge/upstream_fixtures.mjs` (générateur de cas pour `*.test.mjs`, cas déjà cité par V01 comme mal classé) |
| `cli_main_entrypoint` | **4e catégorie, découverte empiriquement en cours de run** (absente de la liste de 4 imposée par la commande, ajoutée avec transparence) : fonction dont la seule auto-invocation est un appel nu dans le bloc `if __name__ == "__main__":` de son propre fichier | 43 | 30/43 nommées `main` (`dispatch.py`, `driver.py:run`, tous les `scripts/observer/*.py` CLI) |

`mock_or_fake`, `mock_support_file`, `migration_tool`, `pytest_fixture_decorator`,
`framework_route_decorator` : présentes dans le code (comptées à chaque run) mais **0 occurrence** sur
ce sweep — le dépôt n'a pas de mocks/migrations/fixtures pytest décorées hors des dossiers déjà exclus
par `tests/`. Compte affiché, pas masqué.

**Pourquoi `cli_main_entrypoint` a été ajoutée après coup, et pas pour gonfler le score :** la
correction 1 (résolution qualifiée) a arrêté de compter un `main` homonyme sans rapport comme
consommateur — ce qui a fait apparaître ~30 fonctions `main()` comme "orphelines", alors qu'elles sont
toutes invoquées par la convention standard `if __name__ == "__main__": main()`, exclue de la preuve de
consommation par construction (héritée de V01, correcte pour son objectif d'origine : éviter qu'un
script qui s'auto-teste ne masque un vrai orphelin). Vérifié à la main sur `scripts/forge/dispatch.py`
(`main()` défini l.463, appelé UNIQUEMENT l.492 dans le bloc `__main__`, aucun autre appelant dans tout
le dépôt). C'est la même famille de faux positif que `do_GET`/`__post_init__` (mécanisme de dispatch
non nommé explicitement) — même traitement, catégorie séparée pour audit.

### Correction 3 — amorçage sans registre (NOT_WIRED en prose)

Aucun registre créé. Pour chacun des 49 symboles finalement signalés `would_block: true` (sweep
worktree), le détecteur relit sa docstring + les commentaires `#`/`//` immédiatement au-dessus de la
définition et cherche des formulations réelles du dépôt (liste : « appelé à la main », « advisory »,
« propose-only », « pas encore branché », « NOT_WIRED », etc., normalisées sans accents).

**Résultat mesuré : 3/49 (6 %) portent déjà une auto-déclaration en prose équivalente à NOT_WIRED ;
46/49 (94 %) n'en portent aucune.**

Exemples verbatim :
- `scripts/forge/skipped_validation.py:59` `skipped_validation_status` — phrase détectée `advisory` —
  extrait : *« ... => "absent". Pur advisory — ne consulte ni ne modifie aucun verdi... »*
- `scripts/forge/studio_link.py:705` `propose_ledger_entry` — phrase détectée `propose-only` — extrait :
  *« ...sue d'un run Forge. PROPOSE-ONLY, lane AUDIT_REQUIRED. N'écrit JAMAIS l... »*
- `scripts/forge/studio_link.py:739` `propose_project_record` — phrase détectée `propose-only` —
  extrait : *« ...d'un projet forgé. PROPOSE-ONLY. N'écrit JAMAIS la liste des projets d... »*

**Réponse à la question posée :** une déclaration structurée ne serait **pas** bon marché au sens
"déjà là, il suffit de la lire" — 94 % des symboles signalés ne portent aucune trace de prose
équivalente. Les 6 % qui existent (`studio_link.py`, doctrine "propose-only" déjà ratifiée Pierre) sont
précisément les cas où la Mesure 4 de V01 jugeait "amorçage légitime, discutable" en lisant la date de
commit — donc le signal prose existe déjà pour EXACTEMENT les cas où l'intuition humaine hésitait,
mais il est **absent partout ailleurs**, y compris pour des cas eux aussi plausiblement légitimes
(`mutation_registry.mjs`, `reasoning_observability.py`, cf. Mesure 4 V01). Exiger le tag structuré
serait donc un vrai changement de comportement demandé aux auteurs, pas la formalisation d'un réflexe
déjà présent.

## Phase calibration

**4/4 orphelins connus détectés, seuil PASS :**
- `check_spawn_invariant` (`scripts/forge/audit.py:259`) → `would_block: true`
- `checkSourceUrlStability` (`scripts/forge/check_worldscan.mjs:401`) → `would_block: true`
  (uniquement après le fix du bug de ligne `def`, cf. Correction 1)
- `run_divergence_oracle` (`scripts/forge/product_oracle_godot.py:453`) → `would_block: true`
- `has_divergence_capacity` (`scripts/forge/product_oracle_godot.py:409`) → `would_block: true`

**Aucun des cas "ne doit pas bloquer" n'est bloqué :**
- `promote_manifest_lessons` (`learning_memory.py:479`) → `would_block: false`
- `_promote_manifest_lessons_best_effort` (`driver.py:426`) → `would_block: false`
- `checkFactConsistency` (`check_worldscan.mjs:363`) → `would_block: false`
- `verify_envelope` (`observer/signature.py:95`) → `would_block: false`

Calibration : **PASS, 4/4 + 4/4, aucun ajustement de règle fait pour "faire passer" un cas** — le seul
ajustement en cours de calibration a été la correction du bug de ligne `def` en `.mjs` (defect réel,
faisait échouer un cas OBLIGATOIRE, corrigé puis re-testé, pas une règle assouplie pour gonfler un
score).

## Phase historique

### Commit `04c14d9` (Asset Library V1 — le cas où V01 avait 74 candidats / 0 signalé)

**V01 : 74 candidats, 0 signalé (0 vrai positif possible, faux négatifs garantis — cf. RAPPORT V01
Mesure 2).**
**V02 : 74 candidats, 2 signalés, 7 exclus (`cli_main_entrypoint`), 0 faux positif détecté sur
l'échantillon vérifié.**

Les 2 signalés :
- `min_y` (`scripts/forge/asset_geometry/measure.py:56`) — propriété `@property` sur `MeshNode`.
  **Vérifié à la main** : `grep -rn "\.min_y" scripts/ lab/` (hors le fichier lui-même) → **zéro
  occurrence**, y compris dans le fichier de définition (le rapport texte utilise l'index de liste
  `m.union_min[1]`, jamais `.min_y`). **Vrai positif confirmé.**
- `max_y` (même fichier, ligne 60) — même vérification, même résultat. **Vrai positif confirmé.**

**C'est la mesure centrale de la commande : la correction 1 fait passer ce commit de 0 signalé (faux
négatif garanti, bug documenté par V01) à 2 signalés vérifiés vrais.** Delta : **+2** (de 0 à 2), les 5
faux "consommateurs" homonymes que V01 documentait (`main`/`classify`/`run`/`build`/`check` via
`games/auto_battler/*`, `autopilot.py`, etc.) ne réapparaissent plus — la résolution qualifiée n'a
trouvé aucun lien d'import réel entre `asset_geometry/measure.py` et ces fichiers, donc ces symboles
homonymes NE sont PLUS acceptés comme preuve. (Les 72 autres candidats du commit restent non-bloqués
parce qu'ils ont, cette fois, une vraie preuve qualifiée — non ré-auditée un par un ici, cf. échantillon
Mesure Historique ci-dessous pour la méthode.)

### État HEAD actuel (comparer aux 63 de V01)

**Sweep `scripts/forge/**` + `scripts/observer/**` lu depuis `git show HEAD:<path>` (pas le disque) :**
1428 candidats, **45 signalés**, 71 exclus.

### Dernier lot Forge — working tree courant

**Même sweep, lu depuis le disque (working tree, inclut les modifications non commitées listées dans le
`git status` de départ) :** 1450 candidats, **49 signalés**, 71 exclus.

**63 (V01) → 49 (V02) sur un périmètre comparable, soit −14 (−22 %).** La baisse n'est pas un
relâchement de la règle : elle vient de deux mécanismes vérifiés à la main (voir échantillon ci-dessous)
qui retirent des faux positifs déjà identifiés par V01 lui-même (Mesure 4) — `do_GET`/`__post_init__`
(6+6=... comptés séparément ci-dessus) et `upstream_fixtures.mjs` (16, déjà jugé "mal classé" par V01) —
**et** un mécanisme nouveau (`typed_instance_attr`) qui retire 9 faux positifs `ObserverContext.*`
jamais vus par V01 sous cette forme précise (V01 les "trouvait" par accident via collision de nom sur
des mots comme `build`/`run`, donc ne les affichait pas non plus, mais sans preuve valide). Dans le même
temps, la correction 1 **ajoute** des vrais positifs que V01 ne voyait pas (30 `main()` masqués par
collision de nom + les 2 de `04c14d9` + d'autres homonymes génériques du sweep). Le nombre net baisse
parce que les faux positifs retirés (do_GET/dunders/fixtures/ObserverContext ≈ 31) dépassent les vrais
positifs ajoutés par la levée de la collision de nom sur ce périmètre précis.

## Échantillon vérifié à la main (11 cas, mission en demandait ≥ 8)

| # | symbole | fichier | verdict V02 | vérification manuelle | jugement |
|---|---|---|---|---|---|
| 1-4 | 4 cas calibration | cf. ci-dessus | `would_block: true` (4/4) | déjà connus vrais positifs par la commande | **VRAI POSITIF ×4** |
| 5 | `collect` | `observer/adapters/forge_run.py:232` | `would_block: false` | `grep`: `observer/fleet.py:248` `forge_run.collect(ctx)`, import `from observer.adapters import forge_evidence, forge_run` (submodule-import) | **CORRECTEMENT non-bloqué** (bug de résolution des sous-modules corrigé en cours de run, cf. Correction 1) |
| 6 | `collect` | `observer/adapters/forge_evidence.py:79` | `would_block: false` | même mécanisme, `fleet.py:249` | **CORRECTEMENT non-bloqué** |
| 7 | `collect` | `observer/adapters/transcripts.py:84` | `would_block: true` | `grep`: **jamais appelé par un nom qualifié statique** ; mais `observer/adapters/__init__.py::load_adapters()` retourne `[forge_run, forge_evidence, transcripts]` et `observer/cli.py:55-58` fait `for module in load_adapters(): ... module.collect(ctx)` — un VRAI consommateur existe, via dispatch dynamique sur une liste de modules (boucle + variable, invisible à toute résolution statique par import qualifié) | **FAUX POSITIF résiduel, cause identifiée et documentée** — même famille que `do_GET` (V01 Mesure 3 cas 6) mais via un mécanisme différent (liste de modules + boucle, pas `getattr` par chaîne) |
| 8 | `build`, `run_dir`, `game_dir`, `evidence_dir`, `error_journal_dir`, `read_json`, `read_jsonl`, `iter_files`, `stat_size`, `git` | `observer/sources.py` (méthodes de `ObserverContext`) | 9/10 `would_block: false` après le fix `typed_instance_attr` | `grep -rn "\.iter_files(\|\.read_jsonl(\|\.read_json("` → des dizaines d'appels `ctx.method(...)` dans `command.py`, `pedagogy.py`, `prompt.py`, `system_artefacts.py`, etc., tous avec un paramètre annoté `ctx: ObserverContext` | **CORRECTEMENT non-bloqués (9/10)** — sans le fix `typed_instance_attr`, ces 9 auraient été des faux positifs purs |
| 9 | `game_dir` (le 10e) | `observer/sources.py:196` | `would_block: true` | `grep`: bien consommé (`system_artefacts.py:559`, `system_roadmap.py:905`) **mais** via un paramètre annoté `ctx: Any` dans ces deux fichiers précis (pas `ctx: ObserverContext`) — vérifié `sed -n` sur les deux définitions de fonction | **FAUX POSITIF résiduel, cause identifiée** — limite assumée de l'heuristique `typed_instance_attr` (dépend d'un typage honnête ; `Any` est un typage qui ne dit rien, donc le détecteur ne peut pas mieux faire sans inférence de type réelle) |
| 10-11 | `min_y`, `max_y` | `asset_geometry/measure.py:56/60` (commit `04c14d9`) | `would_block: true` | `grep -rn "\.min_y\|\.max_y"` sur tout `scripts/`+`lab/` → 0 occurrence, y compris dans le fichier lui-même | **VRAI POSITIF ×2** — exactement la mesure centrale de la commande (04c14d9 : 0→2) |
| 12 | `main` (échantillon de 3 sur 43 exclus) | `dispatch.py:463`, `driver.py:294`(`run`), `observer/cli.py:181` | `excluded: cli_main_entrypoint` | `grep -n "__main__\|^def main"` sur chacun : appelé UNIQUEMENT dans `if __name__ == "__main__":` | **CORRECTEMENT exclu** — même famille que `do_GET`, catégorie ajoutée en cours de run avec justification |

**Total échantillon vérifié à la main : 15 symboles individuels (au-delà des 4 de calibration),
regroupés en 12 lignes d'audit.** Sur ces 15 : **6 vrais positifs confirmés** (4 calibration + 2
`min_y`/`max_y`), **12 vrais négatifs confirmés** (2×`collect` submodule + 9×`ObserverContext.*` +
échantillon `main`), **2 faux positifs résiduels identifiés et expliqués** (`collect` de
`transcripts.py` — dispatch dynamique par liste ; `game_dir` — paramètre `Any`-typé). **0 faux positif
non expliqué.**

## LIMITES DU PROTOTYPE V02 (mesurées, pas supposées)

1. **Dispatch dynamique par collection de modules/objets** (cas `transcripts.py::collect`) : un
   consommateur réel qui itère une liste retournée par une fonction (`for module in
   load_adapters(): module.collect(ctx)`) n'est visible par AUCUNE résolution d'import statique — le
   type de `module` n'est connu qu'à l'exécution. Même famille que `getattr(obj, name)` (déjà documentée
   par V01), mécanisme différent. Non corrigible sans exécution réelle ou inférence de type complète.
2. **Heuristique `typed_instance_attr` dépend d'un typage honnête** (cas `game_dir` via `ctx: Any`) :
   un paramètre annoté `Any` (au lieu du vrai type) rend le symbole invisible à la résolution, même si
   l'appel est réel. Le détecteur ne peut pas faire mieux que l'annotation fournie par l'auteur — c'est
   une limite du signal source, pas de l'algorithme.
3. **`typed_instance_attr` est fichier-large, pas par portée** : si un même nom de paramètre (`ctx`,
   `path`...) est annoté avec DEUX types différents dans le même fichier selon la fonction, le détecteur
   fusionne les deux — over-match théorique, non observé dans l'échantillon vérifié (ce dépôt nomme ses
   paramètres de façon cohérente avec leur type, conformément à `python-ml.md` : "Type hints
   obligatoires sur fonctions publiques"), mais non prouvé absent sur l'ensemble du dépôt.
4. **`cli_main_entrypoint` est une 4e catégorie ajoutée après coup**, pas dans la liste imposée par la
   commande (dunders / handlers / test-support / mocks / migration). Justifiée et documentée
   ci-dessus, mais c'est un écart au périmètre initial qu'un futur lecteur doit pouvoir contester.
5. **`.mjs` reste un parseur regex, pas un vrai AST** — un template literal contenant des motifs
   `//`/`/* */` pourrait encore tromper l'extraction (non observé, non exclu, hérité de V01).
6. **Alias d'import profonds non testés** : `import a.b.c as x` puis `x.y.symbol` (accès à un
   sous-attribut d'un sous-module importé avec alias) n'a pas été rencontré dans l'échantillon vérifié ;
   la logique de candidats par suffixe devrait le couvrir mais ce n'est pas un cas testé à la main.
7. **`from X import *` reste une preuve plus faible** : toute utilisation du nom nu dans le fichier
   compte, sans vérifier qu'aucun autre `import *` du même fichier ne fournit le même nom (collision
   entre deux star-imports non départagée) — cas non rencontré dans l'échantillon, risque théorique.
8. **Classification par chemin toujours dérivée du dossier** (héritée de V01, hors périmètre de cette
   commande) : ne distingue toujours pas un vrai module de production d'un fichier utilitaire hébergé au
   même endroit, sauf pour `upstream_fixtures.mjs` qui bascule maintenant en exclusion nommée plutôt
   qu'en faux "signalé".

## Fichiers produits

- `lab/forge_evidence/ORPHAN_GATE_SIM_V02/orphan_gate_sim_v2.py` — le prototype (3 modes : `commit <sha>`,
  `sweep_worktree`, `sweep_head`)
- `resultats_sweep_worktree.json` — sweep working tree (1450 candidats, 49 signalés, 71 exclus)
- `resultats_sweep_head.json` — sweep git HEAD (1428 candidats, 45 signalés, 71 exclus)
- `resultats_commit_04c14d9.json` — rejeu du commit historique (74 candidats, 2 signalés, 7 exclus)
- `newly_blocked_61.txt` — trace intermédiaire de travail (diff V01→V02 avant le fix `main`-guard),
  conservée pour audit de la démarche
- `*.err` — stderr des exécutions (warnings de syntaxe Python pré-existants dans le dépôt, sans rapport
  avec le détecteur)

## DECISION

**Précision insuffisante pour passer en WARN automatique sur les nouveaux commits — V03 nécessaire,
mais le gain V01→V02 est réel et mesuré, pas cosmétique.**

Chiffres : **63 → 49 signalements** sur le périmètre comparable (sweep worktree scripts/forge +
scripts/observer), soit **−22 %**, obtenus en retirant des faux positifs déjà identifiés par V01
(do_GET/dunders : 12, upstream_fixtures : 16, ObserverContext mal résolu : 9) tout en AJOUTANT de vrais
positifs qu'un bare-name search ne pouvait pas voir (2 confirmés sur `04c14d9`, plusieurs dizaines de
`main()` démasqués sur le sweep mais reclassés `cli_main_entrypoint` après vérification qu'ils sont
légitimes). Sur les 15 symboles individuels vérifiés à la main hors calibration : **13/15 corrects
(87 %), 2/15 faux positifs résiduels expliqués (13 %)**. C'est un échantillon dirigé (pas un tirage
aléatoire — choisi pour couvrir les mécanismes nouveaux de V02), donc ce ratio ne doit pas être lu comme
un taux de précision représentatif du dépôt entier ; il montre seulement que chaque correction proposée
tient face à une vérification indépendante, et que les deux résidus trouvés ont une cause identifiée
plutôt qu'un mystère.

**Pourquoi pas WARN aujourd'hui :** les deux faux positifs résiduels trouvés (dispatch dynamique par
liste de modules ; paramètre `Any`-typé) touchent des patterns d'architecture courants dans ce dépôt
précis (`observer/adapters` charge ses adaptateurs par liste, plusieurs fonctions `observer/system_*.py`
typent leur contexte en `Any`) — un WARN sur 45-49 signalements avec ces deux classes non filtrées
générerait un bruit non négligeable sur exactement les fichiers `observer/*` où le studio investit le
plus. Une V03 devrait au minimum : (a) reconnaître le pattern "liste de modules chargés dynamiquement
puis itérés" comme un 3e mécanisme de consommation valide (à charge de le nommer, pas de le deviner),
et (b) accepter de dégrader `Any` en signal faible plutôt qu'en absence totale de preuve.

**La question centrale de la commande — le système distingue-t-il une capacité expérimentale incomplète
d'une capacité opérationnelle incohérente ?** Réponse mesurée : **partiellement**. La classification
`class` (OPERATIONAL/EXPERIMENT/OBSERVATION) reste dérivée du chemin seule (hors périmètre de cette
commande, limite 8 ci-dessus) donc ne distingue toujours PAS "incomplet" de "incohérent" par elle-même.
Ce que la Correction 3 apporte est différent et plus modeste : elle mesure qu'**aujourd'hui, la prose
ne porte quasiment jamais ce signal** (6 %) — donc le système ACTUEL ne peut PAS faire cette distinction
de façon fiable, ni par la classe de chemin, ni par la prose existante. Un marqueur structuré
(`NOT_WIRED` explicite, vocabulaire déjà ratifié dans `search_usage.mjs`) resterait nécessaire pour
répondre réellement à la question posée — cette mesure documente le vide, elle ne le comble pas.

## Rapport final

STATUS: DONE
VERSION_SIM: V0.2
FILES_CHANGED: aucun fichier existant modifié hors `lab/forge_evidence/ORPHAN_GATE_SIM_V02/**` (nouveau dossier)
FILES_NOT_CHANGED: scripts/forge/**, scripts/observer/**, .claude/hooks/**, games/**, tests/**, ORPHAN_GATE_SIM_V01/** (baseline intacte)
METHOD: résolution qualifiée des imports (Python: import/from-import/from-import-de-sous-module/star-import/attribut-de-classe/paramètre-typé ; .mjs: import nommé/étoile/défaut résolu en chemin réel) + 4 catégories d'exclusion comptées (dunders, handlers de framework, chemins de support de test, points d'entrée CLI `if __name__=="__main__"`) + détection de prose auto-déclarée NOT_WIRED sans création de registre
CANDIDATES_TOTAL: 1450 (sweep worktree) / 1428 (sweep HEAD) / 74 (commit 04c14d9)
TRUE_POSITIVES: 6 confirmés à la main sur l'échantillon dirigé (4 calibration + min_y/max_y sur 04c14d9) sur 15 vérifiés hors calibration pure
FALSE_POSITIVES: 2 confirmés et expliqués sur l'échantillon dirigé (collect/transcripts.py via dispatch dynamique par liste ; game_dir via paramètre Any-typé) — non extrapolable à un taux global sans échantillon aléatoire
FALSE_NEGATIVES: 0 mesuré sur cet échantillon dirigé ; non exhaustif — les limites 1/2/3/5/6/7 ci-dessus restent des sources possibles non quantifiées
CALIBRATION: PASS — 4/4 orphelins connus détectés (dont 1 après correction d'un bug de ligne def en .mjs, documenté), 4/4 cas connus-consommés non bloqués
4_KNOWN_ORPHANS: (detected: check_spawn_invariant, checkSourceUrlStability, run_divergence_oracle, has_divergence_capacity / missed: aucun)
KNOWN_CONSUMED: (blocked: aucun / accepted: promote_manifest_lessons, _promote_manifest_lessons_best_effort, checkFactConsistency, verify_envelope)
NOT_WIRED_CASES: 3/49 (6%) signalements portent une auto-déclaration en prose équivalente à NOT_WIRED (skipped_validation.py, studio_link.py ×2) ; 46/49 (94%) n'en portent aucune — une déclaration structurée ne serait pas bon marché, ce serait un vrai changement de pratique
RISKS: dispatch dynamique par liste de modules invisible (transcripts.py) ; heuristique typed_instance_attr dépendante d'un typage honnête (Any dégrade silencieusement) et fichier-large non scopée par fonction ; catégorie cli_main_entrypoint ajoutée hors périmètre initial de la commande, à faire challenger ; classification OPERATIONAL/EXPERIMENT toujours dérivée du seul chemin
DECISION: V03 nécessaire avant WARN automatique. V01→V02 : 63 → 49 signalements (-22%) sur le périmètre comparable, gain mesuré et vérifié à la main (13/15 corrects sur l'échantillon dirigé, 2/15 résidus expliqués), mais deux classes de faux positifs récurrentes et prévisibles (dispatch par liste, typage Any) restent non couvertes — assez pour resserrer le signal humain (revue), pas assez pour bloquer ou avertir automatiquement sans filtrer ces deux classes d'abord.

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
