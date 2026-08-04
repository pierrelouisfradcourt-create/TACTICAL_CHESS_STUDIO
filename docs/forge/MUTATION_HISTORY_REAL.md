# MUTATION_HISTORY_REAL

Toutes les mutations RÉELLEMENT testées, extraites du registre. **Aucune inventée.**
Généré depuis `scripts/forge/mutation_registry.json` — le registre est la source, ce
document est une vue. Si les deux divergent, c'est le registre qui a raison.

Régénérer / vérifier : `node scripts/forge/check_mutation_registry.mjs`

| | |
|---|---|
| mutations enregistrées | 22 |
| ACCEPTED | 12 |
| dont production_ready | 8 |
| preuve VERSIONED | 18 |

## PROMPT

| ID | Hypothèse | Preuves | Confiance dérivée | Statut |
|---|---|---|---|---|
| `M-ws1` | Nommer explicitement retention_answer dans les regles dures empeche son omission. | aucune (non versionnée) | UNKNOWN | rejetée · NOT_REPRODUCIBLE |
| `M-ws2` | Une regle cardinale generale remplace avantageusement l enumeration champ par champ. | aucune (non versionnée) | UNKNOWN | rejetée · NOT_REPRODUCIBLE |
| `M-ws3` | L invariant general et l enumeration sont complementaires, pas substituables. | aucune (non versionnée) | UNKNOWN | rejetée · NOT_REPRODUCIBLE |
| `M-rep-gabarit-vide` | Montrer la forme attendue aide le modele a rendre le bon format. | 2 fichier(s) | UNKNOWN | rejetée · REFUTED_FALSE_POSITIVE |
| `M-rep-forme-fictive` | Ne jamais montrer de valeur copiable supprime la recopie de gabarit. | 2 fichier(s) | UNKNOWN | **ACCEPTED · prod** |
| `M-rep-par-champ` | Le format de sortie le plus etroit est la contrainte la plus solide : a qui on demande une pair | 3 fichier(s) | 0.17 | **ACCEPTED · prod** |

## ORACLE

| ID | Hypothèse | Preuves | Confiance dérivée | Statut |
|---|---|---|---|---|
| `Q1-DISCRIMINANCE` | Une valeur repetee entre deux entrees porte zero information : la regle de variance des metriqu | 5 fichier(s) | 0.42 | **ACCEPTED** |
| `Q2-LANGUE` | Un champ dans une autre langue signale un contenu venu d ailleurs (recopie, reparation hors con | 2 fichier(s) | UNKNOWN | **ACCEPTED** |
| `Q3-RECOPIE` | Deux champs voisins qui se recouvrent au-dela d un seuil : le second n apporte rien. | 2 fichier(s) | 0.42 | **ACCEPTED** |
| `M-Q4-ANCRAGE` | Un champ qui ne partage aucun mot avec le reste de son entree parle d autre chose. | 2 fichier(s) | 0.37 | rejetée · REFUTED_FALSE_POSITIVE |
| `M-Q5-A` | Un champ qui reprend mot pour mot un AUTRE champ d une AUTRE entree ne decrit plus son entree : | 6 fichier(s) | 1 | **ACCEPTED** |
| `M-Q5-B` | Un seuil de similarite attrape aussi les contaminations reformulees, pas seulement les copies e | 3 fichier(s) | 1 | rejetée · NO_MEASURED_GAIN |
| `M-Q5-C` | Deux champs identiques dans le meme conteneur signalent une contamination. | 2 fichier(s) | UNKNOWN | rejetée · BLIND_TO_TESTED_DEFECT |
| `M-Q5-D` | Certaines paires de roles ne peuvent pas etre remplies par la meme phrase sans perte (ex. playe | 2 fichier(s) | UNKNOWN | rejetée · BLIND_TO_TESTED_DEFECT |

## REPAIR

| ID | Hypothèse | Preuves | Confiance dérivée | Statut |
|---|---|---|---|---|
| `M-retry-identique` | Un second essai identique peut passer la ou le premier a echoue. | aucune (non versionnée) | UNKNOWN | rejetée · NO_MEASURED_GAIN |
| `REPAIR-LOOP-V1` | Redemander uniquement les champs rejetes converge la ou la regeneration echoue, pour une fracti | 4 fichier(s) | 0.25 | **ACCEPTED · prod** |
| `M-conv-decroissance-stricte` | « Des champs ont ete ecrits » n est pas un signal de progres ; seul le compte de problemes en e | 2 fichier(s) | 0.08 | **ACCEPTED · prod** |

## SCHEMA

| ID | Hypothèse | Preuves | Confiance dérivée | Statut |
|---|---|---|---|---|
| `M-schema-artefacts-amont` | Un worker n est mesurable que s il materialise un artefact deterministe ; les 5 etapes non mesu | 2 fichier(s) | UNKNOWN | **ACCEPTED · prod** |
| `M-schema-claim` | Sans maillon intermediaire, on ne peut pas dire si une panne vient d une donnee fausse ou d une | 2 fichier(s) | UNKNOWN | **ACCEPTED · prod** |

## WORKFLOW

| ID | Hypothèse | Preuves | Confiance dérivée | Statut |
|---|---|---|---|---|
| `M-workflow-oracle-moment` | check_architecture n est pas casse : il est appele au mauvais moment. Sur un src vide il ne tro | 3 fichier(s) | 0.08 | **ACCEPTED · prod** |
| `M-workflow-capteur-pas-juge` | Changer la semantique d un verdict est une decision HumanGate, pas un effet de bord d un branch | 2 fichier(s) | UNKNOWN | **ACCEPTED · prod** |

## MODEL

| ID | Hypothèse | Preuves | Confiance dérivée | Statut |
|---|---|---|---|---|
| `M-model-rappel-vs-transformation` | La frontiere Claude/Qwen n est pas l etape mais le type de tache : la verite est-elle dans le p | 1 fichier(s) | UNKNOWN | rejetée · NOT_REPRODUCIBLE |

## Ce que ce tableau dit surtout

Les confiances sont **basses et honnêtes**. Elles se dérivent de `précision × couverture`,
et la couverture rapporte l'échantillon réel à la plus grande base connue-bonne dont on
dispose (12 artefacts). Une précision parfaite sur 1 cas ne vaut pas une précision parfaite
sur 12 — c'est ce qui empêche « 1/1 » de se présenter comme une certitude.

Toutes les mutations de PROMPT sur le World Scan sont **non reproductibles** : leur mesure
reposait sur des sorties de modèle non versionnées. La leçon est conservée en mémoire ;
la mesure, elle, est perdue et devra être rejouée avec export propre avant toute adoption.
