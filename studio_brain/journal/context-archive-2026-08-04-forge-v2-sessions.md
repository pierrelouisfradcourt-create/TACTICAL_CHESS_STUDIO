# Archive de contexte — sessions Forge V2 (2026-08-03 → 2026-08-04)

*Archivé le 2026-08-05 à la clôture de la phase Forge V2 / Knowledge Runtime V1. Extrait de studio_brain/00_CURRENT_CONTEXT.md, qui dépassait le plafond de 100 lignes.*

## Session précédente : 2026-08-04 (Opus, suite 8) — MCTS_READY = false, et la raison exacte
**Rien de cree ce tour-ci.** Aucune mutation ajoutee, aucun probleme racine invente, aucune
lecon promue. Ce tour a rendu VISIBLE ce qui manquait.

### Mon premier audit disait `true` — il etait faux
J avais rempli `evaluation_context` depuis un gabarit PAR PROBLEME RACINE : les mutations
etaient donc « comparables » par construction de ma saisie, pas par fait mesure. Un test de
comparabilite qui verifie une donnee qu il a lui-meme derivee ne mesure rien.

### Le vrai blocage : la metrique OBJECTIF n a pas de valeur
| root_problem | objectif | mutations | ont la metrique | **ordonnables** |
|---|---|---|---|---|
| ORACLE_FALSE_NEGATIVE | detection_rate | 5 | **0** | **0** |
| DEFECT_DISPLACEMENT | residual_defect_rate | 4 | **0** | **0** |
| PROMPT_FIELD_OMISSION | artifact_completeness | 3 | 3 | **0** |
| REPAIR_NON_CONVERGENCE | problems_resolved_ratio | 6 | 5 | **4** |

**Trois causes distinctes** : (1) j ai mesure `false_positive_count` — une CONTRAINTE — sur tous
les oracles, jamais l OBJECTIF ; verifier qu un signal ne se trompe pas n est pas mesurer ce
qu il attrape. (2) PROMPT_FIELD_OMISSION a ses 3 valeurs reelles (0,67 / 0,33 / 0,67) mais
aucune preuve versionnee. (3) REPAIR_NON_CONVERGENCE est **pret** : 4 ordonnables.

### Ajoute
`measured_metrics` au schema V2, rempli AVEC DES VALEURS REELLES SEULEMENT (18 mutations),
absent partout ailleurs — jamais estime. `docs/forge/MCTS_READINESS_REPORT.md`.
7 noeuds isoles sur 22 dans le graphe. Lecons : 18/23 avec preuve, 5 sans -> restent memoire
narrative, aucune promue (promouvoir exige une campagne de mesure, pas une saisie).

### Deverrouillage, par cout croissant
1. Rejouer M-ws1/2/3 avec export propre -> PROMPT_FIELD_OMISSION passe de 0 a 3 ordonnables.
2. Mesurer `detection_rate` sur un echantillon a defauts connus -> debloque 5 mutations.
3. Definir comment mesurer `residual_defect_rate` — le plus dur : le defaut a migre dans un
   angle mort CHOISI, et on ne sait pas trancher mecaniquement.

### Tests
547 node (1 rouge pre-existant) · registre OK · 3 tests neufs : le graphe ne peut porter aucun
champ de preference, chaque metrique citee par un contrat est declaree, coherence readiness.

## Session précédente : 2026-08-04 (Opus, suite 7) — MUTATION GRAPH · la récompense appartient au problème
**Décision de principe (Pierre)** : la récompense n'appartient PAS au graphe, elle appartient
au `root_problem`. Le graphe porte le lignage et les faits ; le problème porte la politique.

```
root_problem → reward_contract → MCTS controller → sélection mutation
```

### Livré
- `root_problem.schema.json` + `root_problems.json` — **4 problèmes racines réels** :
  `ORACLE_FALSE_NEGATIVE` · `DEFECT_DISPLACEMENT` · `PROMPT_FIELD_OMISSION` ·
  `REPAIR_NON_CONVERGENCE`. Chacun déclare SA métrique, sa direction, ses contraintes
  **éliminatoires**, ses pénalités nommées et son `forbidden_aggregation`.
- `mutation_graph.schema.json` + `mutation_graph.json` — 22 nœuds, 11 arêtes.
  **Interdiction structurelle** : `additionalProperties:false` partout ⇒ aucun champ
  `reward`/`score`/`rank`/`weight` ne peut être ajouté sans modifier le schéma, donc sans
  apparaître dans un diff. L'interdit est une propriété, pas une consigne.
- Registre **V2** : `root_problem_id` · `reward_contract_ref` · `evaluation_context`
  (dataset/worker_model/temperature/oracle_version) · **cycle de vie 8 états**.
- `docs/forge/MCTS_CONTROLLER_CONTRACT.md` — aucun contrôleur écrit.

### Statuts dérivés (aucune requalification arbitraire)
`PRODUCTION` 5 · `ACCEPTED` 4 · `REPRODUCIBLE` 5 · `MEASURED` 4 · `OBSERVED` 4 (hors MCTS).

### Classification demandée
| mutation | root_problem | statut | verdict MCTS |
|---|---|---|---|
| `M-ws3` | PROMPT_FIELD_OMISSION | MEASURED | **manque une preuve reproductible** |
| `REPAIR-LOOP-V1` | REPAIR_NON_CONVERGENCE | PRODUCTION | **utilisable** |
| `M-Q5-A` | DEFECT_DISPLACEMENT | ACCEPTED | **utilisable** |
| `M-Q4-ANCRAGE` | ORACLE_FALSE_NEGATIVE | REPRODUCIBLE | **utilisable comme branche négative** (viole `false_positive ≤ 0`, éliminée à l'étape 1 — c'est une information) |

**`CROSS_FIELD_V2` n'existe pas** dans le registre : la couche a été mesurée sous 4 stratégies
(`M-Q5-A/B/C/D`), seule A est retenue. Pas d'alias créé — un identifiant sans mesure est
exactement ce que ce registre existe pour empêcher.

### Deux points d'honnêteté
1. **L'arbre est très maigre.** Le plus gros sous-arbre comparable (REPAIR_NON_CONVERGENCE)
   a 6 mutations dont 3 seulement partagent un `evaluation_context` compatible. Un MCTS
   lancé aujourd'hui donnerait la structure, pas le pouvoir de sélection.
2. **`accepted` ≠ « cherchable »** : 3 mutations sont acceptées mais `OBSERVED` (aucun
   problème racine déclaré). L'Agent Factory peut les prendre, le MCTS ne peut pas les
   explorer. Deux questions différentes, deux réponses — c'est voulu, et le checker le fait
   respecter dans les deux sens.

### Tests
544 node (1 rouge pré-existant d'environnement) · registre **OK** · pytest inchangé (aucun
`.py` touché ce tour-ci).

## Session précédente : 2026-08-04 (Opus, suite 6) — MUTATION_REGISTRY_V1
**La Forge memorise desormais ses propres experiences.** 22 mutations reellement testees,
aucune inventee. `node scripts/forge/check_mutation_registry.mjs` -> **OK**.

| | |
|---|---|
| mutations enregistrees | 22 |
| ACCEPTED | 12 |
| dont production_ready | 8 |
| preuve VERSIONED | 18 |

### Regles ratifiees Pierre, appliquees telles quelles
- `evidence_refs` **typees** (artifacts / tests / reports / telemetry / commits) + table
  d'autorite : versionne = recevable, **scratchpad et conversation = jamais**.
- **Le scratchpad n'est pas une preuve.** Les preuves ont ete **reconstruites proprement**
  dans `lab/forge_evidence/<ID>/` (before / after / metrics / diff), pas recopiees du temporaire.
- `rejected_reason: {code, note}` — la machine lit le code, l'humain lit la note.
- `confidence: AUTO` — **derivee**, jamais saisie : `precision x couverture`.
- `accepted` != `production_ready` · `requires` / `conflicts` · `reproducibility {command,
  inputs, expected_outputs, deterministic}`.
- Les 2 gardes : ACCEPTED sans preuve -> FAIL · **chaque reference doit exister sur disque** -> FAIL.

### Deux defauts trouves en EXECUTANT le checker sur le registre reel
1. **Ma formule de confiance recompensait le silence** : M-Q5-C et M-Q5-D, qui n'ont RIEN
   detecte (TP=0, FP=0), ressortaient a **1,00**. Un detecteur muet n'a pas une precision
   parfaite : il n'a pas de precision. Corrige -> `UNKNOWN`.
2. Statut de preuve incoherent sur M-model (refs listees mais `UNKNOWN`).

### Ce que le registre dit surtout
Les confiances vont de **0,08 a 1,00**, la plupart sur des echantillons de 1 a 12. **Toutes les
mutations de PROMPT du World Scan sont NOT_REPRODUCIBLE** : leur mesure reposait sur des sorties
de modele non versionnees. La lecon est en memoire, la mesure est perdue. Le registre dit surtout
ce qu'on ne sait pas encore — c'est sa valeur.

### Genome + fabrique
`agent_genome.mjs` etendu : **identifiants seulement** (le registre est la source unique),
`repair_stack`, `known_blind_spots`, `confidence_profile: AUTO`. `validateMutation` retiree du
genome — deux endroits qui valident la meme chose divergent.
`docs/forge/agent_factory_contract.md` : la fabrique ne selectionnera que des `accepted`,
**aucune experimentation pendant la generation**. Aucune fabrique ecrite.

### Tests
`19` registre + `20` cross-field/genome · suites **544 node / 1378 pytest**, 2 rouges
pre-existants inchanges.

## Session précédente : 2026-08-04 (Opus, suite 5) — CROSS-FIELD V2 · le défaut se déplace 3 fois
**Livré** : `cross_field_quality.mjs` (4 stratégies, 1 active) · `agent_genome.mjs` (SCHÉMA seul,
aucune fabrique) · Repair V3 (DEFECT_CLASS/SOURCE/TARGET/ACTION, source protégée).

### Calibration — la mesure tranche, pas l'intuition
| stratégie | faux positifs (12 connus-bons) | vrais positifs | verdict |
|---|---|---|---|
| **A** égalité normalisée, entre entrées différentes | **0** | **1** | **RETENUE, active** |
| B Jaccard 0,7, entre entrées | 0 | 1 | disponible, **pas active** (seuil non payé) |
| C champs frères | 0 | 0 | aveugle au défaut mesuré |
| D graphe de rôles incompatibles | 0 | 0 | aveugle ici (attrape autre chose, testé) |

### Preuve V3 (vrai Qwen)
`WARNING_CROSS_FIELD_COPY → PASS` · SOURCE `games[0].player_goal` **protégée** · TARGET
`games[1].victory_condition` seule réécrite · oracle mécanique toujours OK · 0 rollback.

### ⚠⚠ LE résultat : le défaut s'est déplacé une TROISIÈME fois
Après réparation V3, `player_goal` et `victory_condition` de l'entrée 1 sont **identiques
(jaccard 1,000)** — c'est-à-dire dans l'angle mort **que j'ai choisi** : la stratégie A ignore
volontairement les coïncidences intra-entrée, parce qu'à Bomberman le but du joueur EST la
condition de victoire, et que les signaler produirait des fausses alertes.
**Mécaniquement, je ne peux pas dire si c'est légitime ou si c'est un 4e déplacement.**

**La loi, sous sa forme la plus nette : le défaut migre vers ce que la mesure refuse de regarder —
y compris les angles morts choisis délibérément pour éviter les faux positifs. Éviter une fausse
alerte, c'est créer un endroit où se cacher.** Ce n'est pas un argument pour tout mesurer (M-Q4 et
son faux positif l'ont montré) : c'est un argument pour **savoir où sont ses angles morts et les
inspecter à la main**, plutôt que de croire un vert.

### Tests
`18` cross_field+genome · suites **523 node / 1378 pytest**, 2 rouges pré-existants inchangés.
Bug de câblage trouvé en EXÉCUTANT : la mesure V2 était enfermée dans la branche « il y a des
signaux V1 » — or un déplacement peut exister sans aucun signal V1, c'est précisément le cas
motivant. `phaseQualite` refondue à sortie unique.

## Session précédente : 2026-08-04 (Opus, suite 4) — ORACLE QUALITY LAYER V1 (advisory)
**Le problème** : la boucle converge vers ce que l'oracle mesure. Un oracle de non-vacuité fait
écrire des valeurs non vides, pas justes.

### Trois signaux mécaniques, aucun juge LLM, aucun score global
`DISCRIMINANCE` (deux entrées décrites par la MÊME phrase = information nulle — la règle de
variance ratifiée appliquée au contenu) · `LANGUE` (champ rédigé dans une autre langue que
l'artefact) · `RECOPIE` (un champ qui reformule son voisin sans rien ajouter).

### Falsification AVANT adoption
| | faux positifs (5 références) | vrais positifs (artefacts Qwen) |
|---|---|---|
| DISCRIMINANCE · LANGUE · RECOPIE | **0** | **5/5 worldscans**, dont **3 déclarés OK par l'oracle** |
| M-Q4 « ancrage interne » (testée) | **1** | 8 signaux dont la plupart légitimes → **REJETÉE** |
Ma propre règle appliquée à ma propre mutation : un signal qui crie sur la référence est du bruit.

### Repair V2 — la stratégie dépend de la CLASSE du défaut
A (structure/provenance) → réparation de champ · B (langue/recopie) → consigne sémantique ciblée ·
C (discriminance) → on **garde la 1re occurrence** et on montre au modèle *la phrase à ne pas
répéter* + l'entité à décrire. Invariant dur : après chaque écriture sémantique, l'oracle
mécanique est rejoué, **rollback s'il tombe** — le signal en plus n'a pas le droit de coûter l'acquis.

### Preuve : un artefact VERT amélioré sur un axe que l'oracle ne voit pas
`m3_bomberman` (oracle **OK**) → 4 DISCRIMINANCE → **FAIL → PASS**, 4 champs différenciés,
0 perdu, jeu 0 intact, oracle toujours vert, aucun rollback.

### ⚠ LE résultat qui compte, et il est gênant
La réparation a satisfait le signal **par DÉPLACEMENT** : `games[1].victory_condition` est devenu
« Survivre et éliminer les autres joueurs » — mot pour mot le `player_goal` du jeu 0. La
duplication a migré vers une paire de champs que le contrôle ne compare pas (il compare le même
champ entre entrées, pas deux champs différents).
**C'est la même loi qu'aux étages précédents : durcir un axe pousse le défaut sur un axe non
mesuré.** Ma couche de qualité y est soumise comme le reste. Corollaire : un signal ne prouve
jamais la qualité, il ferme un trou nommé — et il faut mesurer où le défaut est parti.

### Tests
`16` oracle_quality · suites complètes **505 node / 1378 pytest**, 2 rouges pré-existants inchangés.
Régime **ADVISORY** : mesuré, remonté, ne fait basculer aucun verdict tant que le taux de fausse
alerte n'est pas ratifié.

## Session précédente : 2026-08-04 (Opus, suite 3) — LA FORGE SE CORRIGE ELLE-MÊME (câblé)
**REPAIR_LOOP_V1 est une capacité native.** Branchée dans `run_real.claude_executor`, juste après
`_materialize_artifact` — le seul instant où l'artefact existe et où rien n'est encore bâti dessus.

### Preuve, vrai modèle, vraie CLI, sur les DEUX natures de tâche
| étape | nature | problèmes | tokens | cycles | temps | régressions |
|---|---|---|---|---|---|---|
| `s2-worldscan` | RAPPEL | **2 → 0** | 66 | 1 | 1,2 s | 0 |
| `s1-prisme` | TRANSFORMATION | **1 → 0** | 41 | 1 | 0,8 s | 0 |
⇒ **le gain n'est pas limité aux tâches de rappel** (c'était l'objectif du test imposé).
Diff structurel : exactement 2 chemins modifiés, **0 perdu**, 41 → 43 feuilles.

### Architecture retenue
`scripts/forge/repair_step.mjs` = **point d'entrée unique** (oracle + réparation + mesure), appelé
en sous-processus par Python. Les 5 oracles amont sont en Node : porter la boucle en Python aurait
créé deux implémentations de la même règle, donc deux vérités qui divergent.
- 5 étapes branchées : `s2-worldscan · s1-prisme · s3-decompo · s4-archi-contract · s5-wiremap-contract`.
- `s4`/`s5` portent un nom DIFFÉRENT de l'étape driver, à dessein : l'oracle branché est celui
  d'AVANT build. `check_architecture` / `check_wiremap` (preuve finale) **intouchés**.
- Prompt par CHAMP : `FIELD_TO_REPAIR / FAILURE_REASON / VALID_CONTEXT / FORBIDDEN` → `{path, value}`.
  Le `path` rendu est re-vérifié contre le chemin demandé : une paire mal adressée n'entre pas.
- **Rollback si régression** (ajouté) : la liste blanche l'empêche, mais si elle laissait passer
  quelque chose, l'artefact revient au snapshot. Une garantie qui signale sa propre violation
  sans l'annuler n'est pas une garantie.
- **Capteur, pas juge** : la réparation modifie réellement le fichier, mais le verdict ok/fail de
  l'étape n'est PAS modifié — changer la sémantique d'un verdict est une décision HumanGate.
- Dégradation sûre : node absent / réparateur injoignable / sortie illisible ⇒ `None`, l'étape se
  comporte comme avant. Interrupteur `FORGE_REPAIR=0`.

### ⚠ LA limite, démontrée par l'exécution
La boucle converge sur **l'ORACLE**, pas sur la qualité. Réparation réelle de `retention_answer`
Pac-Man : « **Proceed with caution near ghosts.** » — hors sujet (ce n'est pas ce qui fait revenir
un joueur) et en anglais. L'oracle ne vérifie que la non-vacuité, donc il accepte. Un run antérieur
avait produit une bien meilleure valeur : **la qualité de réparation varie sans que l'oracle le
voie**. La boucle industrialise ce que l'oracle sait mesurer — y compris ses angles morts.
Conséquence : **durcir les oracles est désormais le levier n°1**, avant tout autre chantier.

### Tests
`21` repair_loop · `9` repair_step · `15` câblage Python · suites complètes **489 node / 1378 pytest**,
2 rouges pré-existants inchangés (auto-audit dépendant du PATH Python, ordre des étapes).
Corrigé au passage : `process.exit()` pendant un `fetch` ouvert faisait planter libuv en sortie —
un composant appelé par le driver ne doit pas se terminer sur un crash après avoir écrit un
résultat correct, l'appelant ne peut plus distinguer les deux.

## Session précédente : 2026-08-04 (Opus, suite 2) — REPAIR_LOOP_V1 : 2/3 → 3/3 pour 71 tokens
**Livré** : `scripts/forge/repair_loop.mjs` + 19 tests. Boucle générique
GENERATE → VALIDATE → CLASSIFY → REPAIR (champs fautifs SEULS) → VALIDATE.
`valider` et `appelerModele` sont **injectés** : le module n'appelle jamais ni oracle ni modèle,
donc il se teste entièrement hors-ligne.

### Expérience contrôlée (World Scan gelé M-ws3, 3 jeux, vrai oracle, vrai Qwen via LM Studio HTTP)
| | taux oracle | cycles | tokens | régressions | temps |
|---|---|---|---|---|---|
| Qwen seul | **2/3** | — | — | — | — |
| Qwen + REPAIR_LOOP_V1 | **3/3** | 1 | **71** | **0** | 1,2 s |
Diff structurel prouvé sur le jeu réparé : **exactement 2 chemins modifiés, 0 perdu** (41→43).
La boucle a tourné **sans opérateur dans la chaîne** (appel HTTP direct au port 1234).

### La garantie est dans le CODE, pas dans le prompt
« Ne touche pas aux champs valides » demandé à un modèle est un vœu. Ici le patch est filtré par
une **liste blanche de chemins dérivée des findings** : toute clé hors liste est rejetée et
comptée. Un test le prouve en envoyant un patch qui tente de réécrire un champ déjà valide.
La non-régression est **calculée** (diff des chemins-feuilles avant/après), jamais supposée.

### Deux défauts trouvés en exécutant, pas en relisant
1. **Mon gabarit de réparation `{"champ": ""}` était recopié verbatim par Qwen** — le mode de
   panne que j'avais documenté 2 h plus tôt (M-ws2). Résultat : 3 cycles, 81 tokens, 0 problème
   résolu. Correctif : ne jamais montrer de valeur copiable, décrire la FORME avec un exemple
   explicitement fictif. Après correctif : 1 cycle, 71 tokens, convergence.
2. **« Des champs ont été écrits » ≠ « ça progresse ».** Un champ réparé avec une valeur elle-même
   invalide comptait comme réparé. Ajout du critère honnête : **décroissance STRICTE du nombre de
   problèmes**, sinon arrêt motivé. Sans lui la boucle payait `maxCycles` appels pour rien.

### Limite à ne pas oublier
La boucle converge sur **l'ORACLE, pas sur la qualité**. Les `retention_answer` réparées sont
plausibles mais parlent de stratégie plutôt que de rétention : l'oracle vérifie la présence, pas la
pertinence. La boucle ferme exactement le trou que l'oracle sait voir — ni plus.

### Trou d'architecture confirmé (grep)
**Aucun code Python n'exécute les 5 oracles amont.** Ils ne vivent que dans les contrats, c.-à-d.
dans une consigne donnée à un agent. Le point d'injection du second appel n'existait nulle part —
`repair_loop.mjs` est le mécanisme, son câblage dans `driver.py` reste à faire.

## Session précédente : 2026-08-04 (Opus, suite) — QWEN MESURÉ SUR 2 ÉTAPES × 3 JEUX
**Le résultat central** : Qwen n'a pas UN niveau, il a **deux régimes selon la NATURE de la tâche**.
- **RAPPEL** (s2-worldscan : citer des sources réelles) → **plafond ~2/3**, jamais 3/3 en 4 mutations
  de prompt. Dérive de citation à température 0 : **5 à 7 URLs distinctes** là où 3 sont attendues.
  Cite `dQw4w9WgXcQ` (**le Rickroll**) comme source Pac-Man : preuve de fabrication sans réseau.
- **TRANSFORMATION** (s1-prisme : convertir un World Scan gelé en exigences) → **3/3 du premier
  coup**, 15/15 exigences actionnables, chaîne `observation→claim→enonce` distincte sur 14/15.
⇒ **La frontière Claude/Qwen n'est pas l'étape, c'est le type de tâche.** Ne pas confier à Qwen une
tâche dont la vérité est HORS du prompt.

### Mesures (toutes reproductibles, artefacts en scratchpad)
| Mutation prompt (s2-worldscan) | cookie | pacman | bomberman | oracle |
|---|---|---|---|---|
| run0 schéma seul | OK | FAIL | FAIL | 1/3 |
| M-ws1 + énumération partielle | **FAIL** | OK | OK | 2/3 |
| M-ws2 invariant général SANS énumération | FAIL | OK | FAIL | 1/3 |
| M-ws3 cardinale + énumération exhaustive | OK | FAIL | OK | 2/3 |
- **Durcir un champ déplace le silence sur un autre** (Cookie : OK→FAIL→FAIL→OK). Jeu de taupes.
- **L'invariant général NE REMPLACE PAS l'énumération** (M-ws2 est la pire) : il faut les deux.
- **Le retry identique ne converge pas** : à temp 0, rejouer M-ws3/pacman redonne le MÊME échec.
- **La réparation CIBLÉE converge** : 86 tokens pour le seul champ manquant → 3/3. Contre ~700 tokens
  de régénération qui, elle, échoue. **C'est là qu'est le débit, pas dans le tuning de prompt.**
- Qwen **recopie verbatim les phrases d'exemple** du prompt (M-ws2) → prudence avec la variante P2.
- **0 ADDITIONS sur 15 exigences** : Qwen transforme, il ne propose jamais rien de son propre chef.

### Ajout au schéma : `claim`
Chaîne portée à `observation → claim → enonce` (+ preuve + destination), les 3 maillons devant
DIFFÉRER — sinon on ne sait pas si une panne vient d'une donnée fausse ou d'une déduction fausse.
Câblé : `upstream_schema.validateChaine`, oracle, comparateur, contrat s1. 70 tests node verts.
**Limite mesurée** : la règle ne rejette que l'égalité EXACTE ; 1/15 quasi-recopie (jaccard 0,526)
passe. Un seuil ~0,45 marcherait sur cet échantillon, mais n=15 est trop mince pour l'imposer.

### Non atteint (annoncé, pas masqué)
s3-decompo / s4-archi / s5-wiremap **non exécutés** sur les 3 jeux — la session s'est arrêtée après
s2 et s1. Aucune baseline Claude produite sous contrat identique : **la comparaison Claude/Qwen reste
NON COMPARABLE** au sens de ta règle. Rien de commité.

## Session précédente : 2026-08-04 (Opus) — COUCHE D'ÉVALUATION CONSTRUITE · la mesure avant l'optimisation
**Mission (GO Pierre)** : construire de quoi répondre « quel worker est meilleur pour quelle étape ».
**Livré et vert** : 68 tests node + 11 pytest neufs, suite Forge 1363 passed (seul rouge = le test
rouge pré-existant `test_full_profile_is_untouched`, NON touché comme annoncé). **Rien de commité.**

### Ce qui existe maintenant
- `scripts/forge/upstream_schema.mjs` — vocabulaire partagé. **Aligné sur le standard existant**
  (`source`/`source_role`/`reference`/`expected_proof` = la ligne wiremap v2, SCHEMA.md §3) :
  le Prisme est le **producteur qui manquait** à `check_line_states` (ferme « validateur sans producteur »).
- 4 oracles d'avant-build : `check_prisme_manifest` · `check_decompo` · `check_blueprint_contract` ·
  `check_wiremap_contract`. `check_architecture` et `check_wiremap` **intouchés** (oracles d'après-build).
- `compare_artifacts.mjs` — CONVERGENCE / LOSS / ADDITION + 4 métriques séparées, **aucun score agrégé**.
- `upstream_fixtures.mjs` — référence + 11 variantes dégradées (contrôles).
- Câblage : `prisme.json` + `featuremap.json` dans `_ARTIFACT_BY_STEP` ; contrats s1/s3/s4/s5 réécrits
  (bloc ```json``` terminal exigé, `responsabilites[]` sur s4, `couvre[]` sur s5).

### Preuves d'exécution (pas de preuve d'existence)
- Le blueprint historique **82 octets** : `passed: True` sous `check_architecture` (avant build, src vide)
  → **FAIL** sous `check_blueprint_contract`, 6 findings nommés. La discrimination est démontrée.
- **Vrai appel Qwen** (`qwen2.5-14b-instruct`, temp 0, 3000 tok, 624 completion) sur Cookie Clicker,
  contrat structuré : **artefact valide au 1er coup**, oracle **OK**, 4/4 actionnables, 4/4 références
  ancrées. Qwen passe l'étape s1-prisme **sur reçu**, plus sur préférence.

### ⚠ LA découverte — le repli par similarité est INERTE (mesuré, contre mon hypothèse)
Sur la vraie paire Claude/Qwen : Jaccard croisé **max 0,194** pour un seuil à 0,6. `ex.achat` et
`cc-02` décrivent la MÊME exigence et ne s'alignent pas. Ce n'est PAS la règle de provenance qui
bloque (je l'ai cru puis mesuré) : deux formulations françaises différentes sont lexicalement
distantes, point. **Conséquence : la convergence est mesurée par `source_ref` SEUL.**
- Corollaire mesuré : Qwen cite **1 URL distincte pour 4 exigences**, la référence en cite 4 →
  couverture 0,25. C'est le signal fort, et il porte sur la **provenance**, pas sur le contenu.
- Chantier qui en découle : le World Scan doit exposer un **id par OBSERVATION**
  (`games[0].loops.minute_1`), pas seulement des URLs de source. Une page de wiki entière est une
  ancre trop grossière pour que « convergence » veuille dire quelque chose.
- Honnêteté variance : sur cette paire réelle (n=1), **3 métriques sur 4 valent 1,0 des deux côtés** —
  seule `couverture` a discriminé. Leur variance est prouvée sur contrôles construits, PAS encore
  sur des paires de workers réelles.

### Trous connus, non refermés (assumés, pas masqués)
- `s1-prisme` n'est matérialisée que sur le chemin exécuteur standard : le chemin **panel**
  (`panel.py`) appelle `claude_call` en direct, sans `_materialize_artifact` → lancé par le panel,
  s1 n'écrit toujours pas `prisme.json`. Déboucher le panel reste un chantier distinct.
- `--amont worldscan.json` est **sans effet** sur une comparaison de prisme (`idsAmontDe` ne connaît
  pas les URLs) : c'est `check_prisme_manifest --worldscan` qui vérifie l'ancrage.
- La référence utilisée pour la comparaison est une fixture **rédigée en session**, pas issue d'un run
  driver. La mesure par ORACLE de Qwen est pleine et entière ; la mesure COMPARATIVE attend une
  référence Claude produite sous le même contrat par un vrai run (gate 1 de Pierre, non consommée).

### Prochaine étape
Produire la référence Claude par un run réel sous le contrat structuré, puis rejouer le comparateur.
Avant cela : trancher l'ancrage par observation (ci-dessus) — sans lui la couverture reste grossière.

## Session précédente : 2026-08-04 (Fable poste de commande) — SUBSTITUTION QWEN : LES ORACLES MANQUENT
**Mission** : déterminer où Qwen peut remplacer Claude sans perdre la qualité.
**Conclusion de session : impossible à trancher aujourd'hui — 5 workers sur 6 n'ont pas d'oracle
qui les mesure.** Une substitution sans oracle n'est pas une mesure, c'est une préférence déguisée.

### Acquis mesurés (fiables)
- **World Scan par Qwen : VALIDE.** `qwen2.5-14b-instruct`, JSON strict, temp 0 → 746 tokens,
  9,9 s, stabilité 1,00, validé par le VRAI `check_worldscan.mjs`. Seul worker proprement mesuré.
- **Format structuré > format libre** : le format libre donne **0 exigence** sur 3 protocoles
  successifs et 2 familles de modèles (Claude et Qwen). Considéré comme établi.
- Température basse préférable · pénalités frequency/presence : aucun gain, jamais · budget de
  tokens = **seuil binaire** (trop bas ⇒ troncature silencieuse qui ANNULE la mesure, ne la dégrade
  pas) · la provenance déclarée par un modèle doit être vérifiée mécaniquement.
- **Découverte majeure** : la précision de provenance passe de **0,125 à 1,00** selon le format.
  Cause : une liste fermée force le modèle à sourcer des sujets qu'on lui impose. Conséquence —
  **les exigences CORE ne doivent jamais transiter par le modèle** : leur origine est `core_list`
  par construction, vérifiable mécaniquement.

### Oracles cassés — LE chantier bloquant
- `check_architecture` accepte `{"modules":["gen","spawn"],"deps_interdites":[["gen","spawn"]]}`
  (82 octets, 2 modules inventés) → **34/34 runs passent : oracle non discriminant**.
- `check_wiremap` mélange contrat d'avant-build et preuve d'après-build (il compare la carte au code
  réel : c'est l'oracle de `s10c`, pas de `s5`).
- Prisme / Décompo / Red-team : **aucun oracle Forge n'existe**. Ceux que j'ai improvisés
  **recalent aussi les artefacts de Claude** (n=0 sur une décompo de 19 280 c qui a pourtant nourri
  toute la chaîne) → ils mesurent eux-mêmes, pas le producteur.
- **Critère de validité posé** : un oracle doit accepter l'artefact de référence de Claude, sinon il
  mesure autre chose que ce qu'il prétend.

### Prisme — le tuyau est bouché (mesuré)
Le panel a réellement tourné : 6 artefacts, **36 Ko**. Mais `artifacts/s1-prisme.txt`, le seul que
`s3-decompo` consomme, fait **1 882 octets** et dit 5× « (section vide ou introuvable) ».
`lens_prompt` ne demande AUCUNE section, `check_prisme` en exige 4, `merge_prisme` en extrait 1 —
3 formats, aucun producteur. Le merger échoue en **silence**.

### Prochaines étapes (ordre imposé par les mesures)
1. **Construire le comparateur Claude/Qwen** et **réparer les oracles critiques** — prérequis de
   tout le reste.
2. Faire porter le format de sortie par `lens_prompt` (débouche le Prisme).
3. Puis seulement : un jeu complet (Cookie Clicker recommandé), puis substitution worker par worker.

### Commits du jour
`7b9b170` doctrine FORGE_PRISME_V2 · `d8a5464` inversion World Scan→Prisme + World Scan sans écriture
· `c4c5159` tranche amont + contre-audit des gels + archives de runs.

**⚠ TEST ROUGE ASSUMÉ, DÉCISION PIERRE EN ATTENTE** :
`scripts/forge/tests/test_standard_step_wiring.py::test_full_profile_is_untouched` fige l'ANCIEN
ordre des étapes. Son intention (aucune étape ajoutée) est toujours satisfaite ; c'est la séquence
qu'il fige en plus, sans le revendiquer. **Non touché** : réécrire l'assertion d'un test pour qu'il
accepte son propre changement est le geste le plus suspect de cette discipline.

**Note** : `lab/reports/observer/` a été commité dans `c4c5159` (c'était un geste qui t'était réservé).

## Session précédente : 2026-08-03 (Fable poste de commande) — BREAKOUT V2 CLOS ET GELÉ · cap Tetris
- **Ratification Pierre (verbatim : « Je ratifie les trois points Breakout »)** → entrée
  `BREAKOUT_V2_FREEZE_V1` au `studio_brain/decisions/decision-log.md` (la validation du 2026-07-31
  ne vivait que dans ce handoff et dans un message de commit — trou fermé).
- **Verdict re-vérifié** par `python -m forge.verify_run lab/forge_runs/breakout_v2/verdict.json` :
  HMAC OK · évidence intacte · mutation intacte · **INTÉGRITÉ AUTHENTIQUE**, exit 0. Seule réserve
  attendue : dérive git TOCTOU (signé `2b38702`, courant `c078a87`).
- **5/5 lessons promues à la KB** via `forge.kb_proposal --apply --ratifie-par "Pierre"` :
  catalogue **37 entrées**, `kb-validate.mjs` PASS 0 violation. Ferme le drift
  `lecon_routee_sans_consommateur` (×5). Le point 2 de la liste de gestes ci-dessous est donc clos.
- **Breakout V2 = témoin de régression gelé**, comme Pong. Ne se rouvre que sur preuve issue d'un
  projet ultérieur (consigne Pierre). Aucun tag git : **la Forge n'outille aucune convention de
  baseline** (`grep "git tag" scripts/forge/ docs/forge/` → 0) — le decision-log EST l'état de référence.
- **Observer examiné** (le point 1 ci-dessous n'est plus une inconnue) : 30 modules Python réels,
  4 493 événements / 32 types sur le run Breakout, `proof: MECHANICAL`. Capture bien tokens
  (`llm.usage` ×1136), lectures de fichiers (`file.read` ×275, chemin + `tool_use_id`), écritures,
  outils, contexte et contrat injectés. **Manquent vraiment** : prompt système réel du sous-agent
  (0 occurrence de `system_prompt`) et skills chargés. Post-hoc uniquement — aucun hook
  `.claude/settings.json` ne l'appelle, aucun skill ne le lance, et **aucun de ses artefacts n'a de
  lecteur hors `scripts/observer/`**. C'est là qu'est le chantier, pas dans la capture.
- **Drifts** : le chiffre « 57 » n'existe nulle part dans le dépôt. Comptes réels — breakout_v2 :
  55 occurrences brutes / 56 lignes de vue / **34 `drift_id` uniques** ; p5_gridnav : 17 uniques ;
  union 38. `docs/observer/OBSERVER_V1_5.md:76,107` affirme 43 : chiffre périmé, lui-même un drift.

## Session précédente : 2026-07-31 (Fable→Sonnet orchestrateur) — Breakout V2 validée Pierre + lessons L1-L5 entrées en mémoire
- **Breakout V2 validée Pierre** : « jeu volontairement simple, mais il remplit son rôle ». Pas
  de suite ouverte cette session ; prochain jeu = autre session, propre contexte/campagne.
- **Lessons L1-L5 validées et écrites dans `lab/reports/lessons.jsonl`** (1re écriture réelle du
  mécanisme `forge.learning_memory`, jamais exercé avant) : 5/5 ACCEPTER, statut `validated`,
  génération 2, chacune citant sa preuve (`fail-59097e0c915c4646` pour L1, expériences run 1/3
  pour L2-L5). Détail : `docs/forge/BREAKOUT_V2_LESSONS_VALIDATION_2026-07-31.md`. DESTINATION =
  tag de routage (standard/schema/wiremap) pour un chantier futur, AUCUNE mutation de surface
  exécutée cette session (L1/L2/L5→standard/, L3→wiremap/, L4→schema/).

## Session antérieure : 2026-07-31 matin (Fable orchestrateur) — clôture V2 commitée + campagne Breakout V2 JOUÉE EN ENTIER
- **5 commits de clôture** (319e9a2→ddc4194) : lots dégel 1+2, verrous deny, canon refondu,
  10 décisions ratifiées APPLIQUÉES (apply_decisions --apply : card_engine ACCEPTED, briques
  promues), calibration N=3 archivée. Baseline référence ré-armée (verify CLEAN).
- **GATES VALIDÉES Pierre (verbatim) 2026-07-31** → commit 2b38702 : GATE 1 charter Breakout
  révision 3 (F13 décompte→10 params, F3 points_par_brique ajouté, F2 flottants stricts
  légitimés par le pas fixe, core.audio DEFERRED + mono-niveau ratifiés, node: 3) ; GATE 2
  registre +7 capacités DÉRIVÉES des provides wiremap. Preuves : check_charter,
  check_contract_completeness, check_collisions tous passed.
- **CAMPAGNE JOUÉE EN ENTIER — 3 runs, verdict final OK / HUMANGATE_READY** (dossier de gate :
  `docs/forge/BREAKOUT_V2_CAMPAIGN_REPORT_2026-07-31.md`). Run 1 : timeout s9 (1800 s trop court
  pour greenfield) + oracle non enregistré + orphelin main.gd + mutation 59/73 → verdict BLOCKED
  honnête. Run 2 : correctif → chaîne verte 1er coup, **mutation 73/73**. Run 3 : fix F1
  (accumulateur pas fixe) + protocole FORGE_ORACLE des sondes → **verdict signé OK, verify_run
  overall=True**. Solvabilité 50/50, 305 assertions, jeu DÉMARRE et se joue à l'écran (captures
  GPU envoyées à Pierre, `lab/forge_runs/breakout_v2/playtest/`). Boucle apprentissage exercée en
  prod pour la 1re fois : pool retry, reprise pilotée ×3, failure_event CV-14 réel, pré-mortem
  inter-tentatives, dispatch avec sections cognitives P1 + manifests P4.
- **Commits finaux** : `2b38702` (gates) + `e2cc913` (jeu+preuves+vues, 142 fichiers). Baseline
  référence ré-armée 2× après commit (CLEAN, 367 fichiers). `project.godot` header restauré
  (la capture playtest a fait tourner l'éditeur Godot, qui a re-sérialisé le fichier et écrasé
  le commentaire documenté — aucune clé fonctionnelle touchée, corrigé sans commit).

## ⚠️ URGENT / GESTES PIERRE EN ATTENTE (rien d'autre ne bloque techniquement)
1. **Observer : examiné le 2026-08-03** (voir session courante). Reste un geste Pierre : décider du
   commit de `scripts/observer/` + `docs/observer/` + `lab/reports/observer/`. Chantier identifié —
   porte d'entrée (aucun skill ne le lance), consommateur (aucun artefact n'est lu), capture du
   prompt système et des skills. Le temps réel via hook vient APRÈS : le post-hoc suffit pour Tetris.
2. ~~5 chantiers routés par les lessons~~ **CLOS le 2026-08-03** : les 5 propositions sont
   `APPLIQUEE` au catalogue KB (37 entrées, kb-validate PASS). Les chantiers de surface
   (standard/ · wiremap/ · schema/) restent à ouvrir individuellement, mais la leçon a désormais
   un consommateur.
3. **D-b** clore la calibration Snake (N=3 fait, dépasse le seuil 20% → règle prescrit N=5).
4. **CV-9** : deny posées (auto-verrouillantes), ratification toujours en attente.
5. **D-e/f/g/i/j** (Prisme dans standard_godot · lentille marché · déclassements Opus→Sonnet ·
   learning_curve lecteur/journal-only · catalogue provides/requires) — non urgents, non bloquants.
6. ~~Amendement F-A/F17 (`fixed_step_accumulator`)~~ **RATIFIÉ Pierre le 2026-08-03**, consigné au
   decision-log (`BREAKOUT_V2_FREEZE_V1`).

## Ce qui reste à faire (pas de gate, juste du travail futur)
- **Campagne Tetris (nœud 4) — OUVERTE le 2026-08-03** sur go Pierre : workflow standard
  World Scan → Genre Bible → Charter → Wiremap → Production. Tous les contrats d'étape existent
  déjà (génériques + `scripts/forge/contracts/wm1-wiremap-tetris.yaml`).
  Trois points à traiter en entrée de campagne : (a) 4 décisions de genre non tranchées
  (wall kick · hold · aperçu next · fin haute) — ce sont des faits documentés du Tetris Guideline,
  à résoudre par World Scan, PAS à remonter à Pierre ; (b) **la solvabilité n'a pas de définition**
  (marathon sans état gagné → l'oracle « un bot gagne » ne s'applique pas, il faut un critère de
  survie) — seul vrai arbitrage Pierre de la campagne ; (c) valeurs `A_CALIBRER` du charter
  (budget mutation, max_ticks) recopiées de Breakout, non ratifiées.
- **Gel wiremap** : le profil `standard_godot` n'émet aucun événement de gel (`driver.py:889
  _freeze_rules` ne suit que `s5-wiremap`, absente de la topologie `driver.py:140`). Accepté comme
  non bloquant pour Breakout ; Tetris possède une wiremap et son contrat dédié, c'est là que le
  trou doit se fermer.
- Les chantiers de surface routés par les lessons attendent d'être ouverts individuellement.

