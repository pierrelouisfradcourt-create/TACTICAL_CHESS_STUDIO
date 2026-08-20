# FVL_PROVENANCE_ADDENDUM_V0 — la contrainte d'évolutivité

> **Statut** : PROPOSED — ratification Pierre requise. Non commité.
> **Date** : 2026-07-29
> **Objet** : intégrer au plan FVL-V0 l'exigence « ne pas rendre impossible la future boucle
> d'évolution » (branches expérimentales de workflow à partir de l'historique des runs).
> **Nature de l'exigence** : non fonctionnelle. Elle ne demande rien à FVL-V0 en capacité ;
> elle lui interdit certaines omissions.
> **Complément de** : `FVL_GAP_ANALYSIS.md` (Phase 0).
> **Aucune implémentation de MCTS, aucune boucle d'amélioration, aucune migration.**

## Consommateurs

| Consommateur | Ce qu'il y lit | État |
|---|---|---|
| Phase 1 — grammaire minimale | les 2 attributs que chaque pièce doit porter dès V0 (§4.1) | à produire |
| Phase 2 — règles | les règles de provenance P-1 à P-6, en `status: DOCUMENTED_ONLY` | à produire |
| Phase 3 — schéma conceptuel | les 6 objets à ajouter au modèle abstrait (§4) | à produire |
| Phase 4 — prototype | le seul test falsifiable de cet addendum (§8) | à produire |
| Pierre (HumanGate) | la porte à sens unique du §3 | humain |

---

## 1. Ce que l'ajout change dans le plan — en une phrase

> FVL-V0 ne doit pas devenir capable d'apprendre. Il doit devenir **incapable de perdre ce qui
> permettra d'apprendre**. Ce sont deux exigences différentes, et la seconde coûte infiniment
> moins cher que la première — à condition d'être posée maintenant.

---

## 2. État mesuré de la provenance (2026-07-29)

L'arbre demandé, confronté au réel. Chaque ligne est adossée à une lecture ou à une exécution.

| Nœud demandé | Existe ? | Où | Limite mesurée |
|---|---|---|---|
| `RUN_ID` | **OUI** | `state.json`, verdict, télémétrie, audit, manifestes | présent partout, mais **sans lignée** : `snake-20260728-091302` et `snake-final2-20260729-174101` sont deux runs du même projet, rien ne les relie |
| `workflow_version` | **PARTIEL** | `profile` (nom) + `git_head` dans le verdict signé | le profil est un nom, pas une version ; `git_head` versionne **tout le dépôt d'un coup** — il ne distingue pas un changement de workflow d'un changement d'agent |
| `agents_versions` | **OUI en code, ABSENT en pratique** | `contract_sha256` dans la ligne de manifeste `kind: dispatch` | voir §2.1 — le mécanisme existe et ne produit rien sur les runs réels |
| ├ prompts utilisés | **PARTIEL** | `final_prompt_sha256`, `final_prompt_chars`, `premortem_sha256` (`kind: execution`) | **comparable, non rejouable** : l'empreinte est conservée, le texte non |
| ├ `mandatory_read` | **OUI en code, ABSENT en pratique** | champ `sources` de la ligne `dispatch` | idem §2.1 |
| ├ skills/plugins | **PARTIEL** | `allowed_tools` dans l'audit signé | contenu = **texte** des champs `skill`/`plugin` (trou I4) |
| └ outputs | **OUI** | `lab/forge_runs/<projet>/artifacts/<etape>.txt` | uniquement les étapes LLM ; conservation d'une seule version par étape |
| `wiremap_version` | **PARTIEL** | `wiremap.json` du run + `code_sha256` par fichier dans le reçu de mutation | empreintes par fichier, aucun numéro de version de la carte elle-même |
| `worldscan_version` | **NON** | dossier d'observation prévu (`observation_manifest.json`) | non relié au run, non empreint |
| `prism_version` | **NON** | sortie du Prisme produite | idem |
| artefacts produits | **OUI** | `artifacts/` + `evidence/` + reçus signés | — |
| erreurs rencontrées | **PARTIEL** | `forge_error_journal.jsonl` — `{error, etape, project, run_id, ts}` | ne consigne que ce qui a été **saisi** ; le chemin d'arrêt d'étape n'écrit pas de télémétrie (mission M1) |
| moment d'apparition | **NON** | — | rien ne date l'introduction d'un défaut |
| moment de détection | **OUI** | `ts` du journal et du reçu | — |
| moment où une détection **aurait été possible mais absente** | **NON** | — | seul nœud de l'arbre sans aucun analogue nulle part — voir §5 |
| verdicts + décisions humaines | **PARTIEL** | `verdict.json` signé (`git_head`, `nonce`, `hmac`, `decision`, `humangate_flags`) + `decision-log.md` | le lien verdict → décision humaine n'est pas un champ : ce sont deux fichiers que rien ne relie mécaniquement |
| coût / qualité | **CASSÉ, mesuré** | `forge_telemetry.jsonl` | voir §2.2 |

### 2.1 Le fait le plus important : la meilleure provenance de la Forge existe et ne se produit pas

Le code sait déjà écrire, pour **chaque activation d'étape**, une ligne signée contenant
exactement ce que l'arbre demande au niveau agent :

```
kind: dispatch  →  { run_id, etape, activation, ts, git_head,
                     model, provider,
                     contract_sha256,          ← la version de l'agent
                     payload_prompt_sha256,    ← la provenance du prompt
                     sources,                  ← la provenance du mandatory_read
                     hmac }
```

**Mesure du 2026-07-29** sur tous les manifestes des runs réels
(`lab/forge_runs/*/context/*.manifest.jsonl`) :

```
35 lignes  "kind": "execution"
 0 ligne   "kind": "dispatch"
```

Toutes les lignes `dispatch` du dépôt se trouvent sous `lab/forge_runs/_orphan_context/`,
c'est-à-dire pour des `run_id` dont le projet n'était pas dérivable.

**Cause non diagnostiquée.** Deux hypothèses plausibles, aucune vérifiée ici : le chemin réel
d'exécution des runs de projet ne passe pas par la porte qui écrit ce manifeste, ou l'écriture
échoue et est avalée par le `try/except` best-effort qui la protège. Le diagnostic n'appartient
pas à cet addendum ; **le fait, si.**

> Conséquence directe : la provenance par composant n'est pas un chantier à construire, c'est un
> **branchement à réparer**. C'est la sixième occurrence du mode de panne « déclaré ≠ exécuté »,
> et elle frappe précisément l'organe dont dépend toute la boucle d'évolution future.

### 2.2 Le coût est mesuré faux, pas seulement absent

Constats de la mission M1 (`MISSION_M1_TELEMETRIE_ECHEC.md`, **préparée, non lancée**) :

- la télémétrie n'est écrite qu'après un statut `OK` — le chemin d'arrêt d'étape retourne avant ;
- `cost_usd` est calculé puis **jeté** (le point d'écriture n'a pas de paramètre coût) ;
- le champ `model` porte le modèle **du contrat**, jamais celui réellement exécuté après escalade ;
- résultat mesuré : 3 533 362 tokens tracés, **tous sur des succès** ; 187 267 tokens de
  tentatives sans oracle vert invisibles ; « coût par succès » incalculable.

> Traduit dans le vocabulaire de l'addendum : **comparer deux branches sur le coût est aujourd'hui
> impossible — et pire, la comparaison produirait un chiffre plausible et faux**, puisqu'elle ne
> compterait que les chemins qui ont réussi. Une branche qui échoue trois fois puis réussit
> paraîtrait moins chère qu'une branche qui réussit du premier coup mais coûte cher.

---

> **SUPERSEDED 2026-07-29** — ce document est une **trace de raisonnement**, plus une source.
> Son contenu vivant a été redistribué : les règles d'évolution dans
> `docs/forge/FORGE_EVOLUTION_DOCTRINE_V0.md`, les chantiers dans `FVL_PHASE_0_5_CHARTER.md`.
> Conservé pour l'historique, à ne plus citer comme référence.

> **AMENDEMENT 2026-07-29 (postérieur, diagnostic exécuté)** — le §2.1 ci-dessus et le §3
> ci-dessous sont **partiellement faux**. Correction établie et sourcée dans
> `FVL_PHASE_0_5_CHARTER.md` §1 : la provenance par composant **est produite** (93 lignes
> `dispatch` signées sur 13 runs Snake), mais classée sous `_orphan_context/` par une dérivation
> de `run_dir` défaillante. Et l'empreinte de graphe est **dérivable** des lignes déjà scellées,
> donc la porte du §3 est moins fermée qu'annoncé. Lire le charter avant ces deux sections.

## 3. La porte à sens unique

Presque tout se rétro-ajoute. Deux choses, non.

| Élément | Rétro-ajoutable ? | Pourquoi |
|---|---|---|
| Empreintes, coûts, journaux, métriques | **oui** | ce sont des mesures ; on peut commencer à les prendre demain, on perd juste l'avant |
| Contenu des prompts | oui | conservation supplémentaire, décision de volume |
| Classification des erreurs | oui | reconstruite après coup à partir des journaux |
| **Identité stable d'une pièce** | **NON** | si les pièces n'ont pas d'identité propre, deux graphes ne peuvent pas être comparés autrement que par leur texte. On ne peut pas attribuer rétroactivement une identité à une pièce d'un run passé sans réécrire l'histoire |
| **Empreinte canonique d'un graphe** | **NON** | elle doit être calculée **au moment** du run, sur le graphe réellement exécuté. Recalculée plus tard, elle mesure le graphe d'aujourd'hui, pas celui d'alors |

> **Donc le minimum absolu à poser dans FVL-V0 tient en une ligne** : chaque pièce porte une
> identité stable et une empreinte de définition, et chaque chaîne exécutée porte l'empreinte
> canonique du graphe qui l'a produite. Tout le reste peut attendre sans rien fermer.

---

## 4. Les cinq fondations, traduites en contraintes

### 4.1 Identité / version de chaque composant

Deux attributs distincts, à ne jamais confondre :

- `piece_id` — **survit aux modifications**. C'est ce qui permet de dire « le même agent, en v4 ».
- `definition_hash` — **change à chaque modification**. C'est ce qui permet de dire « ce n'est plus le même ».

Une pièce qui n'a que l'un des deux est inutilisable : avec l'identité seule, on ne sait pas
qu'elle a changé ; avec l'empreinte seule, on ne sait pas que c'est la même lignée.

`contract_sha256` fournit déjà le second pour les agents. Le premier n'existe nulle part.

### 4.2 Provenance des prompts et des résultats

Règle de conservation proposée, à deux niveaux :

- **obligatoire** : l'empreinte du prompt final, celle des sources lues, celle du contrat — déjà
  toutes présentes dans la ligne `dispatch` ;
- **optionnel, décidé par Pierre** : le texte du prompt. Sans lui, deux branches sont
  *comparables* mais pas *rejouables*. Avec lui, le volume croît linéairement avec les runs.

> Point de conception à ne pas rater : **l'empreinte suffit à comparer, elle ne suffit pas à
> comprendre.** Une branche dont on sait seulement que le prompt a changé, sans savoir en quoi,
> ne produit aucune leçon. La question du volume est donc une question de valeur d'apprentissage,
> pas une question de disque.

### 4.3 Historique des erreurs

Trois besoins, un seul couvert aujourd'hui :

| Besoin | État | Ce qui manque |
|---|---|---|
| qu'une erreur soit consignée | partiel | le journal existe ; l'arrêt d'étape n'écrit rien (M1) |
| que les tentatives soient conservées | **non** | l'état de run **écrase** le détail à chaque tentative — il ne peut pas servir de journal, c'est écrit noir sur blanc dans les pièges connus de M1 |
| qu'une erreur soit attribuable à une étape **amont** | **non** | aucun champ ne relie une erreur détectée à l'étape qui l'a introduite |

Le troisième est le cœur de la demande (« ne pas corriger uniquement le dernier maillon cassé »).
Il ne se résout pas par un champ mais par le §5.

### 4.4 Métriques de coût et de qualité

Bloqué en amont : voir §2.2. Toute comparaison de branches sur le coût est prématurée tant que
M1 n'a pas tourné. **À inscrire comme dépendance dure du plan, pas comme détail.**

### 4.5 Capacité à comparer deux chaînes sur un même dossier

C'est la fondation qui contraint le plus le modèle de données. Une comparaison n'est légitime
que si l'invariant de branche tient :

```
Deux runs sont comparables SI ET SEULEMENT SI :
  même objectif  ·  mêmes contraintes  ·  même dossier de preuve de départ
  ET exactement un delta entre leurs graphes.
```

**Le delta doit être calculé, jamais déclaré.** S'il est déclaré par l'humain (« j'ai changé la
wiremap »), on retombe exactement sur « déclaré ≠ exécuté » : rien ne garantit qu'une seconde
chose n'a pas bougé. Il se calcule par différence entre deux empreintes canoniques de graphe —
donc §3, donc maintenant.

### 4.6 Objets à ajouter au modèle abstrait (Phase 3)

```yaml
PieceVersion:      piece_id (stable) · definition_hash (volatil) · type · date
GraphSnapshot:     graph_hash canonique · [PieceVersion] · [Connection] · profil
RunLineage:        run_id · parent_run_id · hypothesis (le delta calculé) · baseline_run_id
ReceiptScope:      ce que le reçu a RÉELLEMENT couvert, et ce qu'il n'a pas couvert
DetectionDebt:     défaut · étape d'apparition présumée · étape de détection réelle
                   · oracles traversés entre les deux
Comparison:        [run_id] · dossier de départ commun · delta unique · métriques confrontées
```

---

## 5. Le nœud impossible : « une détection aurait été possible mais absente »

C'est un **contrefactuel**. Il ne s'observe pas au moment du run : au moment où l'oracle passe,
personne ne sait qu'il rate quelque chose. Il ne peut être établi qu'**après coup**, quand un
défaut est attribué à une étape amont : on regarde alors quels oracles se trouvaient sur le
chemin entre l'apparition et la détection, et on demande à chacun s'il aurait pu le voir.

Cette question n'a de réponse que si **chaque reçu déclare son périmètre couvert**, pas seulement
son verdict.

> Le studio a déjà payé cette leçon, et elle est datée : sur la carte Snake, 44 lignes remplies en
> prose ont produit un reçu `{"couvertes": [], "passed": true}`. Un vert obtenu parce qu'il n'y
> avait rien à vérifier. Ce défaut n'a été **visible** que parce que le reçu listait ce qu'il
> avait couvert. Un reçu qui n'aurait dit que `passed: true` aurait rendu le contrefactuel
> indémontrable pour toujours.

**Fondation à poser maintenant, et elle est bon marché** : un reçu porte `couvert` **et**
`non couvert`. La discipline existe déjà côté agent (`SKIPPED_VALIDATION`, advisory) ; elle n'existe
pas côté oracle. C'est la seule addition du présent addendum qui touche un organe de preuve —
et elle est purement additive, jamais bloquante.

---

## 6. La classification des causes impose le versionnement par composant

La classification envisagée n'est pas un confort de rangement : elle **exige** que chaque cause
soit versionnable séparément.

| Classe d'erreur | Pièce mutée | Versionnable aujourd'hui ? |
|---|---|---|
| systémique répétée | wiremap / structure de connaissances | partiellement — empreintes par fichier, pas de version de carte |
| compréhension du monde ou du besoin | worldscan / prisme | **non** |
| production | agent codeur | oui **en code** (`contract_sha256`), **non en pratique** (§2.1) |
| orchestration | workflow / attelage | **non** — `git_head` versionne tout le dépôt d'un coup |

> Énoncé qui en découle, et qui est le vrai argument de tout cet addendum : **une classification
> des causes n'a de valeur que si chaque cause a sa propre version.** Avec un seul `git_head`,
> les quatre classes sont indiscernables — toute branche apparaîtrait comme « le dépôt a changé ».

---

## 7. Ce qui existe déjà et qu'il ne faut pas reconstruire

| Élément existant | Ce qu'il apporte à la boucle future |
|---|---|
| Détail E du schéma maître — « l'arbre : MCTS sur le workflow » | le concept d'exploration de branches est **déjà posé**, ratifié, dessiné. Cet addendum en est la condition de possibilité, pas une idée neuve |
| `ROADMAP_USINE_APPRENANTE_V1` · `SPEC_CHANTIER_USINE_APPRENANTE_V1` | le chantier « usine apprenante » a déjà un cadre |
| Mission M1 (préparée, non lancée) | ferme exactement la fondation 4.4 |
| `knowledge_base/learning_curve.jsonl` | mesure déjà par brique : `reuse_ratio`, `oracle_iterations`, `joust_delta`, note qualitative — c'est un embryon de métrique de qualité par composant |
| `/joust` — même tâche, deux modèles, worktrees isolés, même oracle | **le mécanisme de branche existe déjà** : une hypothèse changée, une preuve commune, l'oracle tranche. C'est la forme minimale de ce que l'arbre généralisera |
| Manifeste de contexte v1, signé | le format de provenance est écrit et testé |
| `verify_run` | sait déjà re-vérifier un dossier sans rejouer le workflow — condition d'une comparaison honnête |

> Lecture d'ensemble : **aucune des briques de la boucle d'évolution n'est à inventer.** Il manque
> une identité, une empreinte de graphe, une lignée, et un branchement réparé.

---

## 8. Impact phase par phase

| Phase | Ce que l'addendum ajoute | Coût |
|---|---|---|
| **1 — grammaire minimale** | chaque pièce retenue porte `piece_id` + `definition_hash`. Aucune pièce nouvelle | nul en pièces, deux attributs |
| **2 — règles** | six règles de provenance P-1..P-6, toutes `status: DOCUMENTED_ONLY`, toutes advisory | rédaction |
| **3 — schéma** | les six objets du §4.6 + l'invariant de comparabilité du §4.5 | rédaction |
| **4 — prototype** | deux fonctions et pas une de plus : *exporter l'empreinte canonique du graphe* et *afficher le diff de deux graphes* | faible — et c'est **le seul test falsifiable de tout cet addendum** |
| **5 — test pédagogique** | un scénario ajouté : « l'utilisateur compare deux chaînes et voit qu'elles diffèrent d'exactement une hypothèse » | un scénario |
| **6 — décision A/B/C** | un critère de plus : quelle option porte le mieux le versionnement par composant. **Ne tranche rien ici** | — |
| **7 — implémentation** | l'identité de pièce entre en **V0.1**, jamais plus tard : elle ne se rétro-ajoute pas (§3) | contrainte d'ordre |

### Règles de provenance à instruire en Phase 2

```
P-1  toute pièce posée porte une identité stable et une empreinte de définition
P-2  toute chaîne exécutée porte l'empreinte canonique du graphe exécuté
P-3  tout run déclare son parent et le delta unique qui l'en sépare — delta CALCULÉ
P-4  tout reçu déclare ce qu'il a couvert ET ce qu'il n'a pas couvert
P-5  toute tentative — réussie ou non — laisse une trace de coût et d'issue
P-6  deux runs ne sont comparables que sur un dossier de départ commun
```

Aucune n'est bloquante en V0. Toutes sont des exigences d'**observation**.

---

## 9. Questions ouvertes

1. **Le texte des prompts est-il conservé ?** Empreinte seule = comparable mais muet. Texte =
   volume linéaire. Décision de valeur d'apprentissage, pas de disque.
2. **Qui possède la lignée d'un run ?** Aujourd'hui personne : le nom de run est libre, deux runs
   du même projet ne se connaissent pas. Le builder, le driver, ou un index ?
3. **La comparaison appartient-elle au builder ou au moteur ?** Question jumelle de celle du
   §9.1 du gap analysis, et elle pèse sur la décision A/B/C.
4. **Que fait-on d'une branche perdante ?** Une branche qui échoue est la donnée la plus
   instructive de l'arbre. Rien aujourd'hui ne conserve un échec autrement que comme absence.
5. **Le delta « une seule hypothèse » est-il vérifiable ?** Il l'est si le graphe est empreint.
   Il ne l'est pas pour ce qui vit hors du graphe (contenu d'un fichier de connaissances, par
   exemple). Où passe la frontière de ce que le graphe couvre ?
6. **Faut-il réparer le manifeste `dispatch` avant la Phase 1 ?** Argument pour : sans lui, aucune
   des fondations n'a de producteur, et FVL spécifierait dans le vide. Argument contre : c'est
   une correction de la V1, hors périmètre FVL. **Décision Pierre.**

---

## Rapport de charter

- **software_verdict: OK** — addendum produit. Aucune modification de la V1, aucun code, aucune
  migration, aucun MCTS. Un fichier créé, statut PROPOSED, non commité.
- **evidence_verdict: MECHANICAL_VALIDATION_ONLY** — les constats du §2 s'appuient sur des
  comptages réellement exécutés le 2026-07-29 (35 lignes `execution` / 0 ligne `dispatch` dans les
  runs de projet ; inventaire des clés de `verdict.json`, `state.json`, du journal d'erreurs, de
  `learning_curve.jsonl`) et sur la lecture de `context_manifest.py` et de la mission M1.
- **claim_verdict: NO_CLAIM_ALLOWED** — aucune affirmation que la boucle d'évolution fonctionnerait,
  ni que les fondations proposées suffiraient. L'addendum énonce une condition **nécessaire**,
  jamais suffisante.

**SKIPPED_VALIDATION**

- *Cause de l'absence des lignes `dispatch`* — statut : non diagnostiquée. Le fait est mesuré,
  l'explication est une hypothèse. Ne pas la traiter comme acquise.
- *Mission M1* — statut : non rejouée. Ses chiffres (3 533 362 / 187 267 tokens) sont cités depuis
  le document de mission, non recalculés ici.
- *Exhaustivité du comptage des manifestes* — statut : partiel. Comptage sur
  `lab/forge_runs/*/context/*.manifest.jsonl` ; les sous-dossiers de profondeur supérieure et les
  runs archivés hors de cette arborescence n'ont pas été balayés.
- *Coût de stockage de la provenance* — statut : non estimé. Aucune mesure de volume n'a été faite.
- *`/joust` comme mécanisme de branche* — statut : non exécuté. Sa description est reprise de la
  définition du skill, pas d'un run observé.
