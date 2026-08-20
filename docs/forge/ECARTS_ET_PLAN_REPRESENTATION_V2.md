# ÉCARTS ARCHITECTURE DESSINÉE ↔ RÉELLE · PLAN D'EXÉCUTION ORDONNÉ

**Statut : PROPOSED — aucun fichier de code ni le HTML canonique modifiés par cette mission.**
Date : 2026-07-30 (nuit) · Synthèse orchestrateur de 5 audits délégués · **chaque affirmation portée ici a été re-vérifiée contre le dépôt par l'orchestrateur** ; 2 affirmations d'agent ont été corrigées (§4).
Compagnons : `MASTER_SCHEMA_V2_PROPOSAL.md` (représentation cible + SVG) · `BREAKOUT_V2_CHARTER_PROPOSED.md` · `BREAKOUT_V2_PROOF_PROTOCOL.md` · `BREAKOUT_V2_CAMPAIGN_PREP.md`
`claim_verdict: NO_CLAIM_ALLOWED`

---

# 1. Le flux cible, flèche par flèche — la mesure qui commande tout

Flux proposé par Pierre, confronté au code. **4 mécaniques · 2 mixtes · 4 absentes ou mal nommées.**

| # | flèche | nature réelle | preuve |
|---|---|---|---|
| 1 | Intent → Charter (s0) | **MÉCANIQUE** | contrat s0 dans `ORDER` |
| 2 | Charter → KB (search obligatoire) | **MÉCANIQUE mais neuve** — clause §2bis présente dans **1 seul** contrat de build (Godot, posée cette nuit par CV-4) ; jamais encore exercée | `s9-build-godot-standard.yaml:57` |
| 3 | KB → Orchestration (le résultat guide le choix) | **DOCUMENTAIRE** — c'est l'agent LLM qui décide ; rien ne force la réutilisation | `check_search_consulted` advisory, ne gate jamais |
| 4 | Orchestration → Builders | **MÉCANIQUE** (porte + hook fail-closed) | `dispatch.prepare_dispatch` |
| 5 | Builders → Validation/Oracles | **MÉCANIQUE** | driver → s10a/s10s |
| 6 | Validation → HumanGate | **MIXTE** — verdict signé mécanique, lecture et décision humaines | `verdict.py` + `/gate` |
| 7 | **HumanGate → FailureEvent** | **MAL NOMMÉE** — le déclencheur réel est **échec d'étape → FailureEvent**, *en amont* du gate humain | `driver.py:840`, point de convergence de tous les arrêts |
| 8 | FailureEvent → Lessons | **ABSENTE** — curation humaine/CLI par doctrine (4 couches, écriture jamais ascendante) | docstring `learning_memory.py` |
| 9 | **Lessons → KB** | **ABSENTE** — aucune référence à `knowledge_base` dans `learning_memory.py` ; les leçons vivent dans `lab/reports/`, ne remontent jamais au catalogue | grep = 0 |
| 10 | KB → amélioration mesurable | **ABSENTE comme preuve** — aucun instrument ne mesure un delta de qualité attribuable à la KB | UNKNOWN assumé |

**Lecture : la chaîne de FABRICATION est solide (1→6). La boucle de RETOUR est ouverte en trois endroits (8, 9, 10) et une flèche (7) est dessinée au mauvais endroit.** Toute vue V2 qui dessine une boucle fermée mentirait.

**Correction à porter au flux de Pierre** : la flèche 7 doit devenir `Échec d'étape → FailureEvent`, branchée sur le driver et non sur le gate. C'est plus juste : un échec technique n'attend pas une décision humaine pour être enregistré.

---

# 2. Écarts entre l'architecture dessinée et l'architecture réelle

## 2.1 Écarts de représentation (le document ment par structure, pas par mauvaise foi)

| # | écart | preuve |
|---|---|---|
| **R1** | **La notion de PROFIL n'apparaît dans aucune vue.** La carte principale (Coupe B) dessine 13 étapes ; le chemin réellement emprunté est `standard_godot` = **5 étapes**, 16 runs sur 24. La carte décrit un chemin parcouru **une fois**. | `dispatch.py:175` vs distribution mesurée |
| **R2** | **La légende n'a que 2 états** (cyan EXISTE / ambre CIBLE) pour une réalité qui en compte 6. `PASSIVE` — du code écrit, testé, hors du chemin — n'est représentable nulle part : il finit peint en cyan (faux) ou en ambre (faux). **C'est la cause structurelle des contradictions internes.** | légende l.34-35 |
| **R3** | **Le cartouche dit `rev. 2026-07-26`** alors que le document porte une section datée **2026-07-30**. On ajoute par la fin, on ne touche jamais la tête — la trace mécanique de l'accrétion. | vérifié |
| **R4** | **Les correctifs sont plus bas que ce qu'ils corrigent** : K corrige A/C/G, L corrige K/A/B/C. La distance lecteur→vérité croît à chaque session. | structure |
| **R5** | **Contradiction Pong non tranchée** : « HALTED » (Détail H) et « TÉMOIN GELÉ, le jeu boote » (Détail K) coexistent. 4 occurrences de HALTED. | vérifié |
| **R6** | Ordre des sections A·B·C·**F·E**·G·H·H-bis·I·J·K·L, **pas de Détail D**. Le sommaire ne peut pas être suivi. | vérifié |
| **R7** | Le Prisme est décrit de **4 façons incompatibles** dans le même fichier. | audit délégué |

**Verdict sur la question centrale — « le schéma explique-t-il la Forge à un nouvel arrivant ? »** : **0 réponse correcte sur 5 questions, 2 partielles.** La plus grave est Q1 (« que se passe-t-il quand je lance /forge ? »), à cause de R1.

## 2.2 Écarts de statut — mécanismes livrés, jamais exercés

| composant | dessiné comme | réel | preuve |
|---|---|---|---|
| **Lessons** | boucle d'apprentissage existante (Détail F) | **BLOCKED** — `lab/reports/lessons.jsonl` **n'existe pas** ; le pré-mortem tourne sur 3 leçons legacy de fallback | fichier absent |
| **FailureEvent** | — (absent du canon) | **IMPLEMENTED + TESTED, jamais déclenché** — `failure_events.jsonl` n'existe pas : aucun halt depuis le câblage de cette nuit. *Attendu pour un producteur neuf, pas une anomalie ; mais la boucle ④→② n'a jamais bouclé une fois.* | fichier absent |
| **Calibration** | mécanisme | **DOCUMENTED_ONLY** — `scripts/forge/calibration.py` n'existe pas ; c'est un protocole écrit, pas un composant | fichier absent |
| **s10d oracle visuel** | annexe (advisory) | **BLOCKED structurellement** — absent de `ORDER`, de `DEDICATED_PROFILE_STEPS` **et** de `DEDICATED_DETERMINISTIC_STEPS` : la porte ne peut pas le dispatcher. Contrat et code existent. **C'est le capteur qui aurait dû attraper « Snake ne démarre pas ».** | résolution ensembliste |
| **Knowledge Runtime** | brique du flux | **N'EST PAS UN COMPOSANT** — 0 occurrence dans le dépôt. Nom d'ensemble pour 5 pièces non enchaînées : catalogue · `search.mjs` · `propose_brick` · file de revue · `apply_decisions` | grep = 0 |
| **Prisme / worldscan / s10b / s10c / s6** | chaîne principale | **PASSIVE** — réservés à `full`/`increment`, au mieux 1 exécution réelle | PROFILES |
| **Resolver** | — | **TESTED, déclenchement humain** — câblé dans `/gate` cette nuit, `--apply` jamais exécuté ; 10 décisions ratifiées en attente | dry-run vérifié |
| **Mutation, régime descripteur V1** | contrat ratifié | **ÉVALUATION DE FORME seulement** — `evaluate_proof_descriptor` branché, mais **aucun module n'exécute** la commande d'un descripteur pour un runtime arbitraire ; le driver le déclare lui-même hors périmètre | `driver.py:1343-1350` |
| **KB réutilisation** | bibliothèque vivante | **hors index** — 2 des 3 artefacts réutilisés par Snake sont absents du catalogue (`godot_trial.mjs` totalement, `run_tests.gd` comme simple valeur de champ) | catalogue |

---

# 3. Plan d'exécution ordonné

**Principe : la représentation se corrige AVANT d'être re-remplie. Sinon on redessine une carte fausse.**

## Phase A — Représentation (aucune dépendance, aucun coût d'inférence)
| # | action | risque |
|---|---|---|
| **A1** | **Trancher la contradiction Pong** (HALTED vs témoin gelé) — vérification ou décision, pas une édition d'agent | nul |
| **A2** | Sortir les 3 blocs `⚠ MISE À JOUR` vers `STUDIO_MASTER_SCHEMA_HISTORY.md` ; le canon ne garde qu'une ligne `rev.` | faible |
| **A3** | **Table de correspondance ancienne→nouvelle vue** en tête de HISTORY.md — non optionnelle : « Détail L » et « Coupe B » sont cités nommément dans ≥3 documents vivants | **c'est le point de rupture** |
| **A4** | Étendre la légende à 6 statuts (le statut en toutes lettres à côté du composant, pas seulement une couleur) — lève R2, donc la cause des contradictions | faible |
| **A5** | Insérer la vue **V1 « Forge V2 — architecture actuelle »** (SVG prêt dans `MASTER_SCHEMA_V2_PROPOSAL.md`), avec le profil `standard_godot` explicite et la flèche 7 corrigée | moyen (relecture visuelle requise) |
| **A6** | Absorber Détail L et le bloc U-9 dans les vues ; supprimer les sections devenues redondantes | moyen |
| **A7** | Poser la **règle anti-accrétion** en tête : *toute nouveauté modifie une vue ou n'entre pas · l'historique vit ailleurs, une seule date ici · un correctif ne survit pas à son application* + le test des 5 questions avant fermeture | nul |

## Phase B — Rendre la KB consommable (préalable à toute campagne qui prétend l'exercer)
| # | action | dépend de |
|---|---|---|
| **B1** | `node scripts/forge/apply_decisions.mjs --apply` — 10 décisions ratifiées, dry-run vérifié (0 conflit) | geste Pierre |
| **B2** | Cataloguer manuellement `run_tests.gd` et `godot_trial.mjs` — déjà prouvés réutilisables, aujourd'hui introuvables par `search.mjs` | B1 |
| **B3** | Vérifier que `search.mjs "collision paddle ball" --runtime godot` rend ≥1 résultat après B2 — sinon la clause §2bis de Breakout produira un 0 honnête et rien d'autre | B2 |

## Phase C — Campagne Breakout V2
| # | action | dépend de |
|---|---|---|
| **C1** | Ratifier le charter (`BREAKOUT_V2_CHARTER_PROPOSED.md`) + trancher les 2 questions HumanGate ouvertes (statut `core.audio`, périmètre multi-niveaux) | — |
| **C2** | Produire Genre Bible Breakout (.md + `genre_bible.json`) et `game_contract.yaml` | C1 |
| **C3** | Créer le contrat `wm1-wiremap-breakout` (calqué sur `wm1-wiremap-snake`) — rappel : **le régime STANDARD n'a pas d'étape wiremap**, c'est un contrat ad hoc par jeu | C1 |
| **C4** | Pré-vol selon `BREAKOUT_V2_PROOF_PROTOCOL.md`, puis run 1 | B3, C2, C3 |
| **C5** | Vérifier les preuves de pipeline (search_log alimenté · manifestes signés dans le run_dir · cache tokens non nuls · gel wiremap posé · verdict re-vérifié · démarrage produit en fenêtre GPU) | C4 |

## Phase D — Écarts structurels révélés (à arbitrer, pas à faire dans l'élan)
| # | question ouverte |
|---|---|
| **D1** | **s10d oracle visuel** : le rendre dispatchable, ou l'assumer mort et le retirer du canon ? C'est le capteur du défaut Snake. |
| **D2** | **Exécuteur de mutation par descripteur** : le construire, ou acter que le régime V1 reste une évaluation de forme ? |
| **D3** | **Flèches 8-9-10** (FailureEvent→Lessons→KB→amélioration) : les fermer mécaniquement, ou assumer la curation humaine et le dessiner comme tel ? |
| **D4** | **Profils quasi morts** (Prisme, worldscan, s10b/s10c, s6) : les intégrer à `standard_godot`, ou les représenter comme un chemin alternatif rarement pris ? |

---

# 4. Corrections apportées aux rapports d'agents (traçabilité)

1. **Agent validation** — affirmait « `mutation_proof.py` : zéro fonction `check_*`/`validate_*` ⇒ contrat V1 non implémenté ». **Faux négatif de motif de nommage** : 16 fonctions existent, dont `evaluate_proof_descriptor`, `run_mutation_from_descriptor`, `emit/verify_descriptor_mutation_receipt`, toutes importées par `driver.py:52`. Le fond de l'alerte est néanmoins juste sous un autre libellé, retenu en §2.2 (évaluation de forme seule).
2. **Agent KB** — présentait l'absence de trace de recherche dans le rapport de Snake comme une clause ignorée. **La clause §2bis a été ajoutée cette nuit (CV-4) ; Snake a tourné avant.** Statut correct : *posée, jamais encore exercée*.

`software_verdict: n/a — document de synthèse et de pilotage`
`evidence_verdict: MECHANICAL_VALIDATION_ONLY`
`claim_verdict: NO_CLAIM_ALLOWED`
