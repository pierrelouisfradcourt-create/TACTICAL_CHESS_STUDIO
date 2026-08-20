# ULTRA-PLAN — La méthode de fabrication de jeux du studio

Date : 2026-07-27 · Auteur : session Troisième Cerveau · Statut : **PROPOSED — décisions Pierre**.
Méthode d'analyse imposée par Pierre : **définir la méthode idéale d'abord, comparer au dépôt
ensuite** (parties I→V puis VI). Tous les états « réel » sont mesurés ce jour (P7).
`claim_verdict: NO_CLAIM_ALLOWED`.

> **Question centrale** : quelle chaîne de fabrication permet à une idée de devenir un jeu, puis
> permet à ce jeu d'améliorer la fabrication du prochain ?

---

# PARTIE I — LA MÉTHODE IDÉALE

## I.1 Les six postes de fabrication (taxonomie studio, pas web)

| Poste | Responsabilité | Ne fait PAS |
|---|---|---|
| **Recherche / Design** | genre, références, attentes joueurs, risques connus, règles de design | ne conçoit pas le jeu précis |
| **Game Designer / Gameplay Programmer** | boucle de jeu, fun, difficulté, progression, stratégie dominante, exploits, game feel | n'écrit pas le code du runtime |
| **Architecte du studio** | découpage en briques, réutilisation, API communes, bibliothèque, **build vs réutilise** | ne dessine pas des boîtes UML d'un jeu |
| **Runtime Programmer** | moteur réel, chargement, plateforme, performance, intégration, événements observables | ne décide pas des mécaniques |
| **Production Builder** | assemblage, implémentation, usage des briques, génération | ne décide rien de la conception |
| **Validation / Oracle** | prouver que le produit existe réellement | ne juge pas le goût ; ne décide pas merge/reject |

**Deux invariants de méthode, non négociables** : (a) les **oracles déterministes restent seuls
juges** — tout poste ci-dessus produit des propositions, jamais des verdicts ; (b) **Pierre décide**
merge / reject / freeze et ratifie toute écriture durable.

## I.2 La chaîne — sept étapes, sept réponses chacune

### 1. RECHERCHE
| | |
|---|---|
| **Rôle** | Recherche / Design |
| **Décision** | quel genre, quelles références font autorité, quels risques connus s'appliquent à CE jeu |
| **Entrée** | intention produit (charter) + position dans le rail du curriculum + Postmortem Bible des jeux passés |
| **Sortie** | World Scan sourcé → **distillé** en Genre Bible v.N |
| **Mémoire du studio** | **Genre Bible** (versionnée, provenance par règle) |
| **Oracle** | `check_genrebible` : forme + provenance réelle + **couverture** (chaque règle applicable au genre du jeu est citée ou refusée avec raison) |
| **Retour vers la fabrication suivante** | les findings des jeux du même genre deviennent des règles candidates |

### 2. CONCEPTION
| | |
|---|---|
| **Rôle** | Prisme multi-lentilles (Game Designer · Gameplay Programmer · Player Reviewer) + Gameplay Review |
| **Décision** | **aucune** — le Prisme n'arbitre pas, il **enrichit**. La décision appartient à l'architecte puis à Pierre |
| **Entrée** | charter + Genre Bible + bibles pertinentes + catalogue de briques + historique des runs |
| **Sortie** | dossier de conception : critiques · risques · questions ouvertes · **modifications proposées** · **preuves attendues** — chaque ligne portant son `source_role` |
| **Mémoire** | **Gameplay Bible** (ce qui rend ce type de jeu intéressant, courbes de difficulté, stratégies dominantes à éviter) |
| **Oracle** | `merge_prisme` (union mécanique, GAP explicites, zéro LLM-arbitre) + `proof_review` (chaque exigence a une preuve attendue observable) |
| **Retour** | compteurs `unique` / `retenues` par lentille ⇒ quelles expertises servent réellement |

### 3. ARCHITECTURE
| | |
|---|---|
| **Rôle** | Architecte du studio |
| **Décision** | **la décision structurante du studio** : `brick_decision: new \| extend` · `cross_game_api` · quoi importer du catalogue |
| **Entrée** | dossier de conception + catalogue réel + Architecture Studio Bible |
| **Sortie** | blueprint studio + **wiremap V2 enrichie** + plan d'intégration |
| **Mémoire** | **Architecture Studio Bible** (briques, API communes, conventions, limites connues) |
| **Oracle** | graphe de dépendances + `brick_lookup` **résolu** contre le catalogue + budget d'empilement |
| **Retour** | `reuse_ratio` + briques déposées ⇒ la bibliothèque grandit, ou le jeu est jetable |

### 4. PLANIFICATION FABRICATION
| | |
|---|---|
| **Rôle** | Architecte + Runtime Programmer |
| **Décision** | quoi construire, dans quel ordre, sur quel runtime, avec quelle preuve exigée **par ligne**, sous quel budget |
| **Entrée** | wiremap V2 + runtime contract |
| **Sortie** | **wiremap GELÉE** + ordre de fabrication + `expected_proof` et `observable_by_player` par ligne + budget |
| **Mémoire** | **Runtime Bible** (contraintes de plateforme **prouvées** : la capture Godot exige une fenêtre GPU · aucun specifier `node:` atteignable depuis une entrée navigateur · …) |
| **Oracle** | oracles du standard **en mode « au gel »** + `proof_review` (fidélité · observabilité · densité · coût) — **avant** de payer un build |
| **Retour** | écart plan↔réel mesuré (tentatives, coût par ligne, lignes ratées) |

### 5. PRODUCTION
| | |
|---|---|
| **Rôle** | Production Builder (+ pool, escalade bornée) |
| **Décision** | aucune décision de conception — seulement l'implémentation du plan gelé |
| **Entrée** | wiremap gelée + briques importées + pré-mortem (leçons des runs passés) |
| **Sortie** | build + artefacts + rapports |
| **Mémoire** | **journal d'erreurs** (aujourd'hui la seule boucle mémoire réellement fermée du studio) |
| **Oracle** | oracle de code (mutation sur les catégories atteignables) + oracles du standard après build |
| **Retour** | pré-mortem du run suivant |

### 6. VALIDATION
| | |
|---|---|
| **Rôle** | Validation / Oracle **produit** + Red-team code + Verdict signé |
| **Décision** | le verdict mécanique. **merge / reject / freeze restent à Pierre** |
| **Entrée** | build réel exécuté dans son runtime réel |
| **Sortie** | preuves (partie automatique, captures, logs) + verdict signé + **findings structurés** |
| **Mémoire** | **Postmortem Bible** (ce qui a cassé, pourquoi, à quel prix) |
| **Oracle** | lui-même (déterministe) puis `verify_run` (intégrité re-vérifiée) |
| **Retour** | findings → règles candidates dans les bibles |

### 7. APPRENTISSAGE ↺
| | |
|---|---|
| **Rôle** | Troisième cerveau (analyse, propose) + Pierre (ratifie) |
| **Décision** | quelles règles candidates deviennent des règles de bible · quelles lentilles et quelles briques sont **retirées** |
| **Entrée** | verdict + findings + télémétrie + courbe d'apprentissage + **playtest de Pierre** |
| **Sortie** | propositions de bibles v+1 · briques déposées · lentilles évaluées |
| **Mémoire** | bibles v+1 + catalogue + courbe d'apprentissage |
| **Oracle** | `citations résolues / revendiquées` (valeur d'une bible) · `reuse_ratio` (valeur d'une brique) · `retenues` (valeur d'une lentille) |
| **Retour** | **c'est LE retour** : il alimente la RECHERCHE du jeu suivant |

---

# PARTIE II — LA BOUCLE DE CONNAISSANCE : créée · perdue · à relire · propriétaire

| Donnée | Créée où | Perdue où (mesuré) | Devrait être relue par | Propriétaire de son évolution |
|---|---|---|---|---|
| Pratiques du genre | World Scan (s2, 6 runs) | reste un packet advisory ; **aucune distillation** | le Prisme, puis l'architecte | Recherche |
| Règles de gameplay | nulle part aujourd'hui (**pas de Gameplay Review**) | — | le builder + l'oracle produit | Game Designer |
| Contraintes de runtime | découvertes **par accident** (fenêtre GPU 22-07, `node:` 26-07) | jamais consignées comme contraintes réutilisables | la planification + l'oracle produit | Runtime Programmer |
| Décisions de brique | `s4-archi` (8 runs) mais mandat « blueprint de jeu » | pas de trace de « pourquoi neuf plutôt que réutiliser » | l'architecte du jeu suivant | Architecte du studio |
| Critiques du plan | `s6-redteam-plan` (**14 dispatches, 8 runs**) | **absent du profil du curriculum** + Qwen indisponible | l'architecte (retour prévu, jamais exercé sur le rail) | Red-team |
| Critiques du code | `s11` (tourne) | **findings non pliés** dans le verdict (F1 vitesse + F6 exit morts dans 14 Ko) | l'architecte + les bibles | Red-team |
| Retour joueur | **`record_playtest` existe + CLI** | **0 entrée** dans les journaux ⇒ ton playtest d'aujourd'hui s'évapore, exactement ce que son docstring décrit | le pré-mortem du run suivant | Pierre → 3ᵉ cerveau |
| Mesures de run | télémétrie (M1, hier) + `learning_curve` | **`learning_curve` n'a aucun lecteur** | l'apprentissage | 3ᵉ cerveau |
| Briques | `propose_brick` **branché hier** (V4) | ne dépose que si le reçu code est OK ⇒ Pong bloque | l'architecte du jeu suivant | Architecte |

**Le patron unique de toutes les pertes** : un écrivain sans appelant, ou un lecteur sans données.
**Six occurrences prouvées.** D'où la règle de gouvernance : *aucune flèche n'entre sans écrivain,
lecteur nommé, et mesure mécanique qu'elle a tiré.*

---

# PARTIE III — LE PRISME COMME ÉTAPE DE CONCEPTION

Le Prisme cesse d'être « une critique » pour devenir **l'étape de conception multi-expertise**. Il
**ne décide pas** : il **enrichit la wiremap**.

Chaque lentille produit les **cinq mêmes livrables**, ce qui les rend comparables :
`critiques` · `risques` · `questions ouvertes` · `modifications proposées` · `preuves attendues`.

| Lentille | Sa question propre |
|---|---|
| **Game Designer** | qu'est-ce qui rend ce jeu intéressant, et quelle compétence teste-t-il ? |
| **Gameplay Programmer** | boucle, difficulté, progression, exploits, game feel |
| **Runtime Programmer** | moteur, chargement, performance, plateforme, intégration réelle |
| **Player Reviewer** | compréhension, onboarding, friction, lisibilité |
| **Architecte du dépôt** | **⚠ voir la réserve ci-dessous** |

**Réserve argumentée sur l'architecte comme lentille** : une lentille critique *en parallèle* des
autres et ne décide rien ; or l'architecte doit **décider** (`new` vs `extend`) et sa décision a
besoin de consommer les critiques des autres. Je le recommande donc **en étape, après le merge**,
pas en lentille. Contre-argument honnête, à ta main : en lentille il donnerait un signal précoce
(« ça sent une brique existante »). Mon avis : ce signal ne vaut pas un passage supplémentaire
tant qu'un seul jeu du dépôt a réutilisé une brique (`reuse_ratio` = 0,333 sur `kb_tactics`).

**Mesure de ce que chaque lentille apporte** (prérequis : `source_role` par ligne, jamais
implémenté). **Trois compteurs, pas deux — raffinement ratifié Pierre (U-6)** :

| Compteur | Définition | Pourquoi il est nécessaire |
|---|---|---|
| `unique` | lignes qu'elle seule a produites sur un critère donné | mesure la diversité réelle apportée |
| `retenues directes` | ses lignes survivant telles quelles dans la wiremap V2 | mesure l'adoption directe |
| **`influence indirecte`** | ses lignes **citées comme motif** d'une décision d'architecture ou d'une autre ligne retenue | **une lentille peut avoir `retenues = 0` parce que l'architecte a intégré son idée dans une autre décision** — sans ce compteur, on supprimerait une expertise utile |

**Règle de sortie posée d'avance** : une lentille à **zéro sur les trois compteurs** pendant
3 jeux consécutifs est retirée, pas améliorée. La mesure de l'influence indirecte suppose que les
décisions d'architecture citent leur motif — c'est une exigence du contrat de l'architecte
(§ARCHITECTURE), pas une inférence sémantique.

---

# PARTIE IV — LES BIBLES COMME MÉMOIRE INDUSTRIELLE

Règle obligatoire : **une bible qu'aucun jeu suivant n'utilise n'est pas une connaissance active.**
Métrique unique : `citations résolues / citations revendiquées`.

| Bible | Créateur | Lecteur | Moment de lecture | Mise à jour | Preuve d'utilisation réelle |
|---|---|---|---|---|---|
| **Genre** | Recherche (distillation du World Scan) | Prisme, Architecte | avant conception | findings post-run ratifiés | citations résolues ; règle applicable citée **ou refusée** |
| **Gameplay** | Game Designer + Gameplay Programmer | Builder (règles), Oracle produit (métriques attendues) | au gel, puis à la validation | playtest + oracle produit | métriques mesurées vs attendues |
| **Runtime** | Runtime Programmer | Planification, Builder, Oracle produit | au gel et au build | échecs de runtime réels | contrainte citée par le code ou par un oracle |
| **Architecture studio** | Architecte du dépôt | Architecte du jeu **suivant**, Builder | à l'architecture | briques déposées, API stabilisées | `reuse_ratio` + citations |
| **Art** | Art Director (s2.5) | production d'assets, oracle visuel | après conception | assets rejetés | **déjà mécanique** : chaque besoin `required:true` doit avoir sa requête |
| **Postmortem** | Apprentissage (3ᵉ cerveau propose, Pierre ratifie) | Recherche + pré-mortem du run suivant | fin de run, puis début du suivant | chaque run | le pré-mortem cite des entrées réelles |

**Le patron à répliquer est l'Art Bible**, la filière la plus mûre du studio (contrat s2.5 +
`check_artbible.mjs` 369 lignes + 8 dispatches + sondes adversariales). Ses cinq propriétés
transposables : frontmatter structuré non vide (→ **provenance vérifiable**) · sections
obligatoires non triviales · **bloc JSON lisible par machine dans le markdown** (→ règles à `id`
citables) · **vérification de couverture** (→ le mécanisme anti-théâtre) · **statistique advisory
strictement séparée du pass/fail**. Vocabulaire repris tel quel : `FAIL` = malformée · `BLOCKED` =
bien formée mais **non couverte** · `OK` = conforme et couverte.

**Prérequis technique n°1** : aujourd'hui la citation-par-ID ne vérifie que **la présence d'un nom
de fonction** (118 citations, 8/11 bibles « vivantes » — l'audit P2 dit lui-même que « *vivante*
surévalue »). Sans résolution réelle des ID, toute la couche bible reposerait sur une mesure creuse.

---

# PARTIE V — LES BOUCLES DE REVIEW

| Review | Entrée | Sortie | Lecteur | Action déclenchée |
|---|---|---|---|---|
| **Avant — World Review** | World Scan brut | Genre Bible validée (sources réelles, confiance) | Prisme | refus d'une source non vérifiable ⇒ la règle bascule en hypothèse |
| **Avant — Gameplay Review** | charter + Genre Bible | réponses obligatoires : boucle · difficulté · progression · blocage · stratégie dominante · durée · débutant/expert | Architecte | lignes de wiremap ajoutées ou refusées |
| **Avant — Architecture Review** | dossier de conception + catalogue | `brick_decision` + `cross_game_api` | Planification | import d'une brique OU justification d'une neuve |
| **Avant — Risk Review** | tout ce qui précède | risques classés + hypothèses non vérifiées | Pierre | arbitrage : simplifier, différer, accepter |
| **Pendant — Code Review** | build | findings structurés | verdict + bibles | **pliés dans le verdict** (aujourd'hui perdus) |
| **Pendant — Runtime Review** | build + runtime réel | contraintes de plateforme constatées | Runtime Bible | contrainte consignée, réutilisée au jeu suivant |
| **Pendant — Asset Review** | art bible + assets | couverture besoin↔requête | production | **déjà mécanique** (`check_artbible`) |
| **Après — Oracle Review** | jeu exécuté | preuves + verdict signé | Pierre | merge / reject / freeze |
| **Après — Player Review** | jeu joué par Pierre | `constat` → `règle observable` | **pré-mortem du run suivant** | contrainte imposée au prochain build (`record_playtest`, **existe, 0 usage**) |
| **Après — Postmortem** | verdict + findings + coûts | leçons + règles candidates | bibles v+1 | ratification Pierre puis lecture par la Recherche |

---

# PARTIE VI — COMPARAISON AU DÉPÔT RÉEL (mesurée ce jour)

Légende : **E** existe et fonctionne · **E/NB** existe mais **non branché** · **A** absent.

| Élément | Existe | Connecté | Mesuré | Action (priorité : reconnecter > fermer > mesurer > créer) |
|---|---|---|---|---|
| **World Scan** | E (s2, 6 runs) | **non** — absent du profil du curriculum ; packets advisory | non | **reconnecter** + distiller en Genre Bible |
| **Bibles** | E (10 bibles auto_battler · Art Bible mûre · template Project Bible) | **partiel** — lecteur `project_bible` branché **mais à s0 seulement** (absent de standard) ; écrivain `propose_bible_entry` **0 appelant** | **non** (ID non résolus) | **brancher l'écrivain** + **durcir la résolution des ID** + créer la Genre Bible |
| **Prisme** | E (s1, 6 runs) + `merge_prisme` mécanique | **non** — absent du curriculum | non (`source_role` absent) | **reconnecter** + lentilles studio + `source_role` |
| **Architecte dépôt** | E/NB — s4 existe (8 runs) mais **mandat blueprint-de-jeu** (zéro mention de bibliothèque/brique/API) | non | `reuse_ratio` existe | **re-spécifier** (pas créer) |
| **Gameplay Review** | **A** | — | — | **créer** — l'unique création réellement nécessaire |
| **Runtime** | E/NB (adaptateurs, `godot_oracle`, `godot_bin`, contrainte GPU **prouvée**) | non — aucun gate n'appelle les captures | non | **brancher** + Runtime Bible |
| **Oracle produit** | **A** (captures existent, jamais appelées ; e2e sauté par décision ; s10d jamais branché) | — | — | **créer minimal** (3 volets, sans Playwright) |
| **Bibliothèque** | E (`knowledge_base`, catalogue, `reuse_ratio`, `propose_brick` **branché hier**) | oui depuis hier | oui, faiblement (0,333 sur 1 jeu) | **mesurer sur N jeux** |
| **Player Review** | E (`record_playtest` + CLI) | canal `error_journal → pré-mortem` **prouvé** | **0 entrée** | **consigner ton playtest du 27-07** — action de 5 minutes |
| **Red-team plan (s6)** | E (14 dispatches, 8 runs, « RE-ENTRÉE de la boucle » dans son contrat) | **non** — hors curriculum · **Qwen DOWN** · exige un `blueprint.yaml` inexistant en standard | non | **débloquer** (3 verrous) |
| **Red-team code (s11)** | E, tourne | **findings non pliés** | non | **fermer la boucle** (½ j) |
| **Boucle d'apprentissage** | E (`learning_curve`, `subject{type,id}`) | **0 lecteur** | non | **fermer** (dossier architecte) |
| **Pyramide d'agents** | **E** — vérifiée au travail sur pong_r2 | oui | oui (coût, tentatives, escalade) | **conserver, ne rien toucher** |

**Lecture** : sur 13 éléments, **1 seul est réellement absent** (Gameplay Review) et un second est
à créer sous forme minimale (oracle produit). Tout le reste **existe** : 6 sont non branchés, 1 est
mal spécifié, 3 fonctionnent. Le chantier est un chantier de **plomberie et de mesure**, pas de
construction.

---

# PARTIE VII — LA BOUCLE DE FABRICATION DU STUDIO

*(chapitre ajouté sur demande de Pierre, 2026-07-27 — il précède volontairement les lots
techniques : les lots ne valent que par ce qu'ils servent.)*

## VII.1 Ce que le studio cherche à prouver

Le livrable recherché n'est **pas** « faire fonctionner Pong ». C'est :

> **prouver qu'une idée peut entrer dans une chaîne, devenir un jeu, produire des preuves,
> enrichir les bibles, et améliorer le jeu suivant.**

Pong n'est pas l'objectif : c'est le **banc de test** de la chaîne. Un run vert sur Pong ne vaut
que comme démonstration qu'un vert **signifie** quelque chose.

## VII.2 La boucle centrale (ratifiée Pierre 2026-07-27)

```
World Scan  ──►  Genre Bible  ──►  Prisme  ──►  Gameplay Review  ──►  Architecture Studio
                                                                              │
                                                                              ▼
   World Scan suivant  ◄──  Bibles v+1  ◄──  Postmortem  ◄──  Oracle produit  ◄──  Production
                                                                              ▲
                                                                    Wiremap gelée
```

Les six grandes flèches, qui manquent au schéma maître actuel (décision U-9) :

| Flèche | Ce qu'elle transporte | Sans elle |
|---|---|---|
| connaissance → conception | pratiques du genre, pièges connus, attentes joueurs | on redécouvre à chaque jeu ce qu'on savait déjà |
| conception → architecture | critiques, risques, preuves attendues | l'architecture décide sans savoir ce qui compte |
| architecture → production | briques, API, plan d'intégration, budget | chaque jeu repart de zéro (collection, pas usine) |
| production → preuve | build exécuté dans son runtime réel | « les tests passent » remplace « le jeu existe » |
| preuve → apprentissage | findings, coûts, écarts plan↔réel | l'échec est payé deux fois |
| apprentissage → connaissance | règles candidates ratifiées, briques déposées | l'usine ne devient jamais meilleure |

## VII.3 Le critère de bouclage — ce qui définit le prochain run

**Le prochain run doit être le premier cycle COMPLET de cette boucle, même imparfait**
(exigence Pierre). « Complet » ne veut pas dire « excellent » : il veut dire qu'**aucune flèche
n'est coupée**. Traduction falsifiable, à vérifier après le run :

| # | Preuve de bouclage attendue | Instrument |
|---|---|---|
| 1 | une connaissance de genre a été **lue** avant la conception | citation résolue depuis la wiremap |
| 2 | une critique de conception a **modifié** la wiremap | diff V1→V2 attribué à un `source_role` |
| 3 | une décision d'architecture a été **prise et tracée** | `brick_decision` renseigné (`new` ou `extend`) |
| 4 | le jeu a été **exécuté** et observé, pas seulement compilé | reçu d'oracle produit (partie automatique + captures) |
| 5 | un finding a été **converti** en règle candidate | ≥1 ligne dans `forge_bible_proposals.jsonl` |
| 6 | le playtest humain est **entré** dans la mémoire | ≥1 entrée `domain=playtest` relue par le pré-mortem suivant |

Un cycle qui coche 6/6, même avec un jeu médiocre, **vaut plus** qu'un verdict vert qui n'en
coche aucune. C'est le renversement de priorité que Pierre demande : *le socle de preuve n'est
pas le but, c'est le moyen de savoir si la boucle tourne.*

## VII.4 Conséquence sur la hiérarchie des travaux

- **Niveau 1** = **socle de preuve** (et non chantier principal) : il rend le vert signifiant,
  donc rend les flèches 4 et 6 mesurables. Pong y sert de banc.
- **Niveau 2** = **la boucle elle-même** : il installe les flèches 1, 2, 3, 5.
- **Niveau 3** = **la surveillance de la boucle** : les mesures qui disent si elle apprend.

---

# PARTIE VIII — LE PLAN À TROIS NIVEAUX

## Niveau 1 — Minimum pour un run propre (avant Pong) — ≈3 j + 1 run

Inchangé par rapport au [plan run propre](PLAN_RUN_PROPRE_V1.md), **plus un item que cet
ultra-plan a fait apparaître** :

0. **Consigner ton playtest** via `record_playtest` (4 constats → 4 règles observables) — **~5 min**,
   et ça contraint mécaniquement le pré-mortem du prochain build. Sans ça, tes constats
   s'évaporent (c'est écrit dans le docstring de la fonction, et il y a 0 entrée).
1. Findings red-team **audibles** (pliés dans le verdict) — ½ j.
2. **Mutation cohérente** (périmètre par catégorie : la logique jugée par la mutation, la
   présentation par l'oracle produit) — ½ j + ton arbitrage.
3. **Oracle produit minimal**, 3 volets déterministes sans Playwright : sûreté du graphe d'import
   navigateur (attrape *exactement* les 2 bugs d'hier) · partie automatique (score évolue, partie
   finit, aucune exception, durée bornée) · captures (existent, à appeler) — 1-1,5 j.
4. **Wiremap corrigée** : les 5 lignes de jouabilité, ratifiées par toi — ½ j.
5. Commit par lots, puis `pong_r3` — ½ j + run.

**Critère de réussite du niveau 1** : un verdict vert signifie *se charge · se joue · score ·
finit*. Pas « les tests passent ».

## Niveau 2 — Méthode de fabrication V1 (ce qui transforme la Forge en studio) — ≈9-11 j

**Ordre RATIFIÉ PIERRE 2026-07-27 (U-4)** — il diffère de ma proposition initiale : Pierre place
la reconnexion du **début** de la fabrication (World Scan, Prisme) avant les lots aval, « parce
que le World Scan et le Prisme sont le début de la fabrication ; aujourd'hui ils existent mais
ils flottent ».

| Ordre | Lot | Pourquoi à cette place |
|---|---|---|
| **1** | **Résolution des ID + `source_role`** | les deux mesures avant les machines qu'elles jugent — sinon on ne saura pas si le niveau 2 a servi (et ce serait la 7ᵉ occurrence du mode de panne). Inclut le branchement du Bible Writer, sans lequel la flèche 6 reste coupée |
| **2** | **Reconnexion World Scan → Genre Bible** | le début de la chaîne ; transforme une dépense de recherche en actif versionné |
| **3** | **Reconnexion Prisme → Genre Bible + Gameplay Review** | la conception lit enfin la connaissance ; la Gameplay Review est l'unique création du niveau |
| **4** | **Reconnexion Architecte → bibliothèque / briques** | la décision `new` vs `extend` devient tracée et mesurée (`reuse_ratio`) |
| **5** | **Runtime Bible** | les contraintes découvertes par accident (fenêtre GPU, `node:`) deviennent réutilisables |
| **6** | **Boucle findings → bibles** | ferme la boucle d'apprentissage (flèches 5 et 6) |
| **7** | **s6 red-team du plan** | traité comme **déblocage technique, pas priorité d'architecture** (U-8) : le contrat doit accepter **reviewer local · reviewer humain · autre modèle** — la méthode ne doit pas dépendre d'un outil. Ne pas attendre Qwen pour fermer la boucle |

**Test le moins cher du niveau 2, à faire dès N2-4** : passer le Prisme multi-lentilles sur la
wiremap **Pong actuelle**, avec la Genre Bible en entrée. **Critère posé d'avance** : il ressort
l'adversaire manquant, la vitesse injouable, la lisibilité du score et le quitter infidèle — tes
4 constats, dont la vérité est **déjà connue**. Coût : un run de conception, **zéro build**. S'il
ressort autre chose, on révise avant d'engager la suite.

## Niveau 3 — Vision long terme : chaque jeu rend le suivant meilleur

Ce niveau n'est **pas** une liste de nouvelles briques : c'est l'ensemble des **mesures** qui
rendent la phrase vraie ou fausse. On ne le « construit » pas, on le **surveille**.

| Mesure | Question à laquelle elle répond | Seuil de décision |
|---|---|---|
| `citations résolues / revendiquées` par bible | cette connaissance est-elle active ? | bible non citée après N jeux ⇒ requalifier ou supprimer |
| `reuse_ratio` par jeu | fabrique-t-on une usine ou une collection de jeux jetables ? | tendance plate sur 3 jeux ⇒ l'architecte du dépôt ne fait pas son travail |
| `unique` · `retenues directes` · **`influence indirecte`** par lentille | cette expertise apporte-t-elle quelque chose ? | 0 sur les **trois** compteurs pendant 3 jeux ⇒ lentille retirée |
| coût par jeu vert (télémétrie M1) | la méthode devient-elle moins chère ? | hausse continue ⇒ la méthode s'alourdit au lieu d'apprendre |
| findings convertis en règles | l'usine apprend-elle de ses échecs ? | 0 conversion ⇒ la boucle est de nouveau coupée |

**Explicitement différé au niveau 3, et assumé** : la réconciliation complète du Détail G (4
sources d'exigence) · l'arbre MCTS sur les workflows (Détail E) · les lentilles au-delà des 3
premières (aucune nouvelle avant que celles-là aient prouvé `retenues > 0`) · une bible par
famille de jeu au-delà du genre.

---

# PARTIE IX — DÉCISIONS — **TOUTES TRANCHÉES PAR PIERRE LE 2026-07-27**

**Renversement de priorité prononcé par Pierre, qui gouverne tout le reste** : « le but n'est pas
seulement d'obtenir un run vert, mais de reconnecter la chaîne complète de fabrication. Le niveau 1
reste nécessaire, mais il devient un **socle de preuve**, pas le chantier principal. »

| # | Décision de Pierre | Effet sur le plan |
|---|---|---|
| **U-1** | **GO niveau 1**, objectif = « un run où le vert signifie quelque chose ». Pas d'amélioration de Pong pour lui-même : **Pong = banc de test**. Obligatoires : record du playtest → règle observable · findings red-team → verdict · oracle produit minimal · wiremap corrigée | niveau 1 requalifié en socle ; les 4 items sont impératifs, pas optionnels |
| **U-2** | **Accord** sur le découpage : logique testable → mutation · rendu/runtime → oracle produit. « Sinon on fabrique un faux indicateur » | l'arbitrage suspendu depuis le 26-07 est **rendu** |
| **U-3** | **Oui** aux 5 lignes (adversaire · vitesse jouable · score visible · quitter · fin/rejouer) — « la première démonstration du passage **constat joueur → règle de fabrication** » | les 5 lignes deviennent le prototype du mécanisme, pas un correctif de Pong |
| **U-4** | **Oui** niveau 2, **ordre modifié** : 1 résolution ID + `source_role` · 2 World Scan→Genre Bible · 3 Prisme→Bible + Gameplay Review · 4 Architecte→bibliothèque · 5 Runtime Bible · 6 findings→bibles · 7 s6 | ordre appliqué au §Niveau 2 : le **début** de la fabrication d'abord, « ils existent mais ils flottent » |
| **U-5** | **Architecte = ÉTAPE**, pas lentille principale. « Les lentilles donnent des signaux. L'architecte prend les décisions. Sinon personne n'est responsable du graphe » | ma recommandation validée ; les lentilles restent 3 (+ Game Designer) |
| **U-6** | **Oui** à la métrique, **mais 3 compteurs** : `unique` · `retenues directes` · **`influence indirecte`** — « une lentille peut avoir retenues=0 parce que l'architecte a intégré son idée ailleurs » | corrigé au §PRISME ; exige que les décisions d'architecture **citent leur motif** |
| **U-7** | **Oui** : `citations résolues / revendiquées`. « Une connaissance qui n'est jamais utilisée n'est pas un actif » | critère de valeur d'une bible acté |
| **U-8** | **Déblocage technique, pas priorité d'architecture.** Le contrat de review doit accepter **reviewer local · reviewer humain · autre modèle**. « Ne pas attendre Qwen pour fermer la boucle. Sinon la méthode dépend d'un outil » | s6 passe en position 7 ; son contrat devra ouvrir le rôle de reviewer |
| **U-9** | **Oui** — et **demande explicite** : ajouter un chapitre « Boucle de fabrication du studio » **avant les lots techniques** (fait : PARTIE VII), avec les 6 grandes flèches absentes du schéma maître | PARTIE VII ajoutée ; mise à jour du schéma maître à faire |

## Exigence de bouclage pour le prochain run

> « Le prochain run doit être le premier cycle complet de cette boucle, même imparfait. »

Traduction opérationnelle : les **6 preuves de bouclage** du §VII.3 sont les critères du prochain
run — un cycle 6/6 avec un jeu médiocre vaut plus qu'un vert qui n'en coche aucune.
