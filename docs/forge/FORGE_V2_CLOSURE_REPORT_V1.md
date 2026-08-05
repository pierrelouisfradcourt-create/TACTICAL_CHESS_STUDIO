# FORGE_V2_CLOSURE_REPORT_V1

*2026-08-05. Clôture de la phase **Forge V2 / Knowledge Runtime V1**. Aucun nouveau
développement, aucun chantier ouvert. Documentation existante mise à jour, divergences
signalées sans être corrigées — sauf deux affirmations fausses de ma part, corrigées et
signalées comme telles.*

---

## 1. Résumé de la phase

La Forge est passée d'un système qui **exécute et prouve** à un système qui **décide,
exécute, et prouve que sa décision correspond à son exécution**.

```
root_problem → candidate_selector → execution_binding → mcts_selector
             → agent_factory (PLAN_ONLY | --execute) → execution_proof → MATCH / MISMATCH
```

Six commits : `d37f51b` (V2, tag `forge-v2`) · `d90ffc0` (`--execute`) · `d8f8143`
(Option C) · `901d1b5` (layers) · `8812a0c` (zone de décision) · `74f726e`
(SEARCH_USAGE).

## 2. État réel

| surface | statut | fait mesuré |
|---|---|---|
| plan de décision | **IMPLEMENTED + TESTED** | 5 modules, 3 MATCH sur 3 familles d'exécution |
| `--execute` | **IMPLEMENTED + TESTED** | 5 conditions appliquées dans le code, 12 tests |
| vocabulaire `layer` | **IMPLEMENTED + TESTED** | 13 zones, source unique, lue par 2 consommateurs |
| Knowledge Runtime | **IMPLEMENTED + TESTED** | `kb_tactics` = MEASURED, `consumed_refs=["sys-reachability"]` |
| politique de preuve | **IMPLEMENTED** | clone frais : `evidence_missing` 13 → 0, 4/13 exécutables |
| MCTS (arbre) | **DOCUMENTED_ONLY** | `branching_factor = 1` sur les 4 problèmes |
| mémoire causale | **BLOCKED** | 0 association certaine entre 18 leçons et 4 problèmes |

**Tests** : forge **717** (716 pass) · knowledge_base **150** (149 pass) · pytest **1404
pass**. Deux rouges **pré-existants**, vérifiés sur l'arbre commité *avant* la phase.

## 3. Documentation mise à jour

| document | changement |
|---|---|
| `docs/forge/STUDIO_MASTER_SCHEMA.html` | **Détail L** ajouté (plan de décision, runtimes, layers, Knowledge Runtime) ; `rev.` 2026-07-31 → 2026-08-05 |
| `docs/observer/OBSERVER_V1_5.md` | **§8** : `repair.result` et `drift.detected`, taxonomie 32 → 34 types, + la limite `_actor_kind_for_model` |
| `CLAUDE.md` (lane FORGE) | ligne « Plan de décision V2 » listant les 5 modules et les registres lus |
| `studio_brain/00_CURRENT_CONTEXT.md` | réécrit — **558 → 68 lignes** (plafond : 100) |
| `studio_brain/journal/context-archive-2026-08-04-forge-v2-sessions.md` | **créé** — 520 lignes archivées |

Aucune documentation parallèle créée.

## 4. Divergences détectées

### D1 — `studio_selfaudit` dit « STUDIO ALIGNÉ » et ne voit pas 8 modules neufs

`node scripts/forge/studio_selfaudit.mjs` → `VERDICT : STUDIO ALIGNE ✅`, `0 dérive`.
Or le Master Schéma ignorait **totalement** `candidate_selector`, `execution_binding`,
`mcts_selector`, `agent_factory`, `execution_proof`, `search_usage`, `layers.json`,
`repair_runtime` — vérifié : **0 occurrence de chacun** avant cette clôture.
L'auto-audit compare la doc **du contrat de système** à la réalité, pas la doc
d'architecture au code. Son « aligné » est vrai dans son périmètre et trompeur hors de
lui. **Non corrigé.**

### D2 — deux affirmations fausses de ma part, mesurées à la clôture

| j'avais écrit | mesuré |
|---|---|
| « **aucun** des 14 `run-oracle.mjs` n'invoque `reuse_ratio` » | **2 sur 14** le font (`kb_tactics`, `shmup_slice`), tous deux **MEASURED** |
| « les **5** layers ajoutées sont PASSIVE » | **8 sur 13** ne sont employées par aucune mutation : les 5 ajoutées **+ 3 antérieures** (`s3-decompo`, `s4-archi-contract`, `s5-wiremap-contract`) |

Les deux figuraient dans le message de commit `74f726e`, le Détail L et le handoff.
**Corrigées dans les docs, avec mention explicite.** Le commit, lui, reste faux — un
message de commit ne se réécrit pas.

### D3 — `search_log.jsonl` : la doc de `.gitignore` dit vrai, mon audit disait faux

`.gitignore:135` ignore le journal **avec sa justification écrite avant moi**. J'avais
écrit qu'il était « présent dans le dépôt ». Corrigé dans
`SEARCH_CONSUMPTION_PROPOSAL_V1`. La politique en vigueur **était déjà** l'Option C,
appliquée un mois plus tôt.

### D4 — `KNOWLEDGE_RUNTIME_AUDIT_V1` affirmait un moteur « jamais consulté »

29 recherches réelles existaient. Corrigé en tête du document, l'argument du reste tient.

### D5 — deux rouges permanents dans les suites

`studio_selfaudit.test.mjs:177` (PATH Python dans le fixture) et
`knowledge_base/search.test.mjs` (« mots vides »). **Antérieurs à la phase**, vérifiés
par exécution sur l'arbre commité. Personne ne les a ouverts.

---

## 5. Bugs

| # | défaut | impact | reproductibilité | priorité |
|---|---|---|---|---|
| B1 | `search.test.mjs` — une requête en phrase naturelle fuit en faux positif sur des mots vides | le moteur de recherche rend un résultat non pertinent ; **advisory**, ne gate rien | **100 %**, `node --test knowledge_base/search.test.mjs` | moyenne |
| B2 | `studio_selfaudit.test.mjs:177` rouge sur PATH Python | l'auto-audit *réel* passe ; seul son **test** échoue → le filet est troué | **100 %** | moyenne |
| B3 | interaction entre fichiers de test `knowledge_base` — `fill_usage_examples` écrit le vrai `catalog.json` | un test peut rougir selon **l'ordre d'exécution** | intermittente (lot mixte forge+kb) | basse |
| B4 | `_actor_kind_for_model` classe tout modèle non-Claude en `unknown` | Qwen apparaît `unknown` même dans les reçus signés | **100 %** | basse (contournement documenté) |

Aucun de ces quatre n'est causé par la phase. B1–B3 sont antérieurs, B4 est un défaut
d'origine de l'Observer.

## 6. Travaux incomplets

1. **`--execute` n'a jamais tourné hors des trois preuves.** Ouvert, testé, exercé sur
   3 chemins ; aucune campagne réelle ne l'utilise.
2. **`repair_runtime` accepté SOUS CONDITION** — les conditions sont inscrites dans les
   trois fichiers, mais la case de décision d'`AGENT_FACTORY_EXECUTE_V1_CONTRACT` reste
   ouverte.
3. **Les builders ne déclarent pas leur `caller`.** Les contrats `s9-build-*.yaml`
   ordonnent de chercher en prompt ; aucun ne passe `--caller s9-build`. Le maillon
   « Question » reste donc à moitié attribué.
4. **12 des 14 `run-oracle.mjs`** n'invoquent pas `reuse_ratio` : leur chaîne qualité ne
   mesure pas d'elle-même sa réutilisation.

## 7. PASSIVE — présents, sans consommateur

| élément | lecteurs de code | note |
|---|---|---|
| `mutation_graph.json` | **aucun** | schéma + données, jamais lus |
| `capability_graph.schema.json` | **aucun** | idem |
| `agent_genome.mjs` | lui-même seul | validateur **sans aucune donnée à valider** |
| `root_problem.lesson_ids` | `observer/evidence.py` (lecture d'affichage) | vide sur les 4 problèmes |
| 8 layers sur 13 | validées, jamais employées | 5 ajoutées + 3 antérieures |
| `runtime_contracts` | 2 rôles sur 16 | les 14 autres ont leur contrat d'étape |

## 8. NOT_WIRED — boucles prévues, non câblées

1. **`reuse_ratio` → `run-oracle.mjs`** : 12 projets sur 14. C'est le `NOT_WIRED` que le
   Knowledge Runtime rend désormais **visible et nommé** au lieu de silencieux.
2. **`drift.detected` → décision** : le signal est émis et affiché ; **rien ne le
   consomme en aval**.
3. **Rapport du Runtime Inventory** : le JSON sur stdout n'a aucun lecteur machine.
4. **`lesson` → `root_problem`** : le champ existe des deux côtés, le lien est vide, et
   trois critères fondés sur la preuve disent qu'il **doit** le rester en l'état.

## 9. Améliorations possibles — *ce ne sont pas des défauts*

- **Un `layer` sur les leçons** (`LESSON_LAYER_PROPOSAL_V1`) rendrait le lien
  leçon↔problème mécanique. Proposé, non adopté ; **risque connu** : un champ de plus
  sans personne pour le remplir.
- **Un second consommateur de l'Observer** hors de l'Observer lui-même.
- **Énoncer une fois la politique des 239 `.jsonl` suivis** (95,5 Mo) au lieu de la
  trancher fichier par fichier.
- **Isoler les fixtures de test `knowledge_base`** du vrai `catalog.json` (règlerait B3).

## 10. Hypothèses — *pas des faits*

- **H1.** Je *suppose* que les 12 `run-oracle.mjs` non câblés le sont par omission de
  gabarit et non par choix. **Aucune preuve** : je n'ai pas retrouvé de décision écrite.
- **H2.** Je *suppose* que `branching_factor = 1` vient du petit nombre de recettes, et
  qu'il monterait avec la production de jeux. **Non vérifié** — il pourrait rester à 1
  pour une raison structurelle que je ne vois pas.
- **H3.** Je *suppose* que B1 (mots vides) est une régression du scoreur et non un test
  écrit trop strict. **Je n'ai pas ouvert le sujet.**
- **H4.** Je *suppose* que les 3 layers amont vides (`s3`, `s4`, `s5`) le sont parce
  qu'aucune expérience n'a encore porté sur ces étapes, pas parce qu'elles seraient
  mal découpées.

---

## 11. Retour critique sur mes propres décisions

### C1 — J'ai déclaré `repair_runtime` avant d'avoir la preuve d'exécution

Ordre suivi : déclarer le rôle → puis prouver que le plan correspond à l'exécution. Le
`MATCH` est arrivé **après**. Meilleur ordre : produire la trace d'abord, déclarer
ensuite. Sans conséquence ici (le MATCH est venu), mais si le premier run avait
divergé, un rôle faux aurait été inscrit dans `roles.yaml` — et l'y retirer coûte plus
cher que de ne pas l'y mettre.

### C2 — J'ai ajouté 5 layers dont 5 restent vides

Le critère « une zone où une boucle peut casser » est bon, l'adossement aux leçons aussi.
Mais j'ai déclaré des zones **aval** (`build`, `oracle-produit`) alors que toutes les
mutations du registre sont **amont**. J'ai écrit dans la proposition que c'était un
risque, puis je les ai adoptées quand même sur ratification. Approche préférable : ne
déclarer une zone qu'au moment où une mutation l'emploie — la 3ᵉ option de la décision
(« n'adopter que les zones déjà exercées ») était la meilleure et je ne l'ai pas
suffisamment défendue.

### C3 — La 4ᵉ priorité du sélecteur (zone) a un effet mesuré très étroit

Elle n'a mordu que sur **1 problème sur 4** (4 ex aequo → 3). C'est un vrai effet, mais
je l'ai présenté comme la preuve que `layer` n'est plus passif — alors qu'il s'agit d'un
seul cas. Formulation plus juste : *le champ a un consommateur ; son influence reste
marginale à ce jour.*

### C4 — J'ai laissé passer deux affirmations fausses jusqu'à la clôture

« Aucun des 14 » et « les 5 layers » (§4/D2). Les deux étaient vérifiables en une
commande, et je ne l'ai pas passée avant de les écrire — y compris dans un **message de
commit**, qui ne se corrige pas. C'est la faute la plus sérieuse de la phase : j'ai
produit une couche entière dont le but est de distinguer le déclaré du mesuré, tout en
déclarant sans mesurer.

### C5 — Le tag `forge-v2` ne se relance pas

J'ai posé le tag **avant** de trancher la politique de preuve. Résultat mesuré : sur un
clone frais du tag, **0 mutation sur 13** est exécutable. Le commit suivant (`d8f8143`)
corrige l'état, pas le tag. Meilleur ordre évident : trancher la politique, **puis**
taguer.

### C6 — Ce que je referais à l'identique

Refuser d'écrire `--execute` avant trois MATCH ; refuser de remplir `lesson_ids` par
ressemblance ; nommer `feedback-loop` plutôt qu'`orchestration` ; joindre par le
catalogue plutôt que par le nom de fichier. Ces quatre décisions ont chacune coûté du
temps et évité une fausseté durable.

---

## 12. Risques

1. **Le tag `forge-v2` est inexécutable hors de cette machine.** Corrigé au commit
   suivant ; le tag reste tel quel.
2. **`--execute` existe et n'a jamais servi en campagne.** Un pouvoir ouvert et non
   exercé s'atrophie ou surprend.
3. **L'observation est bornée au scope déclaré** — une écriture hors périmètre annoncé
   n'est pas signalée, elle n'est pas vue.
4. **8 layers vides** peuvent faire croire à une taxonomie riche là où la matière est
   mince.
5. **Deux MATCH sur trois passent par le même runtime** (`repair_runtime`). Le troisième,
   `deterministic`, est le **moins contraignant** : deux de ses sept vérifications
   passent sans rien affirmer (`root_problem_id` et `mutation_used` non échotés).

## 13. Recommandation pour le prochain chantier

**Rouvrir la production de jeux.** C'est la seule chose qui remplirait les 8 layers
vides, ferait monter le facteur de branchement au-dessus de 1, produirait des mutations
aval, et donnerait aux leçons un `layer` naturel — sans qu'on ait à ajouter le moindre
champ.

Le studio a passé cette phase à construire **de quoi mesurer**. Il lui manque
maintenant **de la matière à mesurer**.

Si un chantier d'infrastructure est préféré, le plus rentable est le plus petit :
**câbler `reuse_ratio` dans les 12 `run-oracle.mjs` restants**. Rien à écrire — deux
projets sur quatorze montrent déjà comment. Cela ferait passer 12 projets de `NOT_WIRED`
à `MEASURED` et fermerait le seul `NOT_WIRED` que cette phase a rendu visible sans le
résoudre.

**À ne pas faire maintenant** : le MCTS (rien à explorer, mesuré), un RAG (le lien causal
n'existe pas), une Agent Factory V2 (la V1 n'a jamais servi en campagne).

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```
