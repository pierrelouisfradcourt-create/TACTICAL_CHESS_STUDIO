# MCTS_CONTROLLER — contrat (aucun contrôleur n'est écrit ici)

*2026-08-04. Décrit comment un contrôleur MCTS futur aura le droit de chercher dans le
graphe des mutations. Aucun contrôleur n'est livré : ce document fixe les règles avant que
quiconque ait la tentation de les inventer en codant.*

---

## La décision de principe

**La récompense n'appartient pas au graphe. Elle appartient au `root_problem`.**

```
root_problem  ──►  reward_contract  ──►  MCTS controller  ──►  sélection mutation
```

Le graphe porte le lignage et les faits observés. Il ne porte aucun score, et son schéma
l'interdit **structurellement** : `additionalProperties: false` partout signifie qu'aucun
champ `reward`, `score`, `rank`, `weight` ou `fitness` ne peut apparaître sur un nœud sans
modifier le fichier de schéma — donc sans que la décision soit visible dans un diff.
L'interdiction n'est pas une consigne, c'est une propriété.

---

## 1. Comment sélectionner les frères

Deux mutations sont **frères comparables** si et seulement si :

1. elles déclarent le **même `root_problem_id`** ;
2. leur `reward_contract_ref` pointe le **même contrat** ;
3. leur `evaluation_context` est **compatible** — même `dataset`, même `worker_model`, même
   `oracle_version`. Un taux obtenu à température 0 sur 3 jeux ne se compare pas à un taux
   obtenu ailleurs : ce serait mesurer le décor autant que la mutation.

Tout le reste est **incomparable**, et le contrôleur doit le refuser plutôt que d'estimer.

## 2. Comment appliquer la récompense locale

Dans l'ordre, sans réordonnancement possible :

1. **Éliminer** — toute mutation violant une `constraint` du contrat est écartée *avant*
   comparaison. Elle n'est pas « moins bonne », elle est hors-jeu. C'est ce qui empêche un
   gain spectaculaire de racheter un faux positif.
2. **Ordonner** — sur la seule `objective.metric`, dans la `direction` déclarée.
3. **Pénaliser** — les `penalties` nommées départagent les ex æquo. Jamais une pondération
   silencieuse : une pondération cachée est un score global qui n'ose pas dire son nom.
4. **S'arrêter** — si deux mutations restent à égalité après pénalités, le contrôleur rend
   **les deux** et remonte l'arbitrage. Il ne tranche pas au hasard.

## 3. Comment éviter les comparaisons invalides

| Interdit | Raison |
|---|---|
| Classer deux mutations de `root_problem` différents | On demanderait laquelle, de la clé ou du tournevis, est le meilleur outil |
| Comparer sous des `evaluation_context` incompatibles | On mesurerait le décor autant que la mutation |
| Utiliser une mutation `status: OBSERVED` | Aucun contrat applicable : elle est mémoire, pas candidate |
| Agréger plusieurs métriques en un chiffre | `forbidden_aggregation` l'interdit dans chaque contrat |
| Sélectionner sans `requires` transitifs | `REPAIR-LOOP-V1` sans `M-rep-forme-fictive` reproduit le bug du gabarit vide |
| Sélectionner deux mutations liées par `contradicts` | Elles s'annulent par construction |

## 4. Ce que le contrôleur doit propager, pas masquer

Les `known_blind_spots` des mutations retenues remontent dans le résultat. **Le défaut migre
vers ce que la mesure refuse de regarder** — observé trois fois le 2026-08-04. Un angle mort
qu'on ne propage pas est un angle mort qu'on croira absent.

Les branches de récompense **négative** restent dans le graphe (`derived_from` vers une
mutation pire que son parent, comme `M-ws2`). C'est précisément ce qui évite d'y retourner.

---

## 5. Classification des mutations demandées

| Mutation | `root_problem_id` | `status` | Verdict MCTS |
|---|---|---|---|
| `M-ws3` | `PROMPT_FIELD_OMISSION` | `MEASURED` | **manque une preuve reproductible** — contrat applicable, mais `evidence_status: UNKNOWN` |
| `REPAIR-LOOP-V1` | `REPAIR_NON_CONVERGENCE` | `PRODUCTION` | **utilisable MCTS** |
| `M-Q5-A` *(le « CROSS_FIELD_V2 » réel)* | `DEFECT_DISPLACEMENT` | `ACCEPTED` | **utilisable MCTS** |
| `M-Q4-ANCRAGE` | `ORACLE_FALSE_NEGATIVE` | `REPRODUCIBLE` | **utilisable MCTS** — comme branche **négative** : elle viole `false_positive_count ≤ 0` et sera éliminée à l'étape 1, ce qui est une information, pas un échec |

**Note de nommage** : il n'existe pas de mutation `CROSS_FIELD_V2` dans le registre. La
couche cross-field a été mesurée sous quatre stratégies (`M-Q5-A/B/C/D`) ; la seule retenue
est `M-Q5-A`. Je ne crée pas d'alias : un identifiant qui ne correspond à aucune mesure
serait exactement le genre d'entrée que ce registre existe pour empêcher.

---

## 6. État réel de l'arbre, à connaître avant d'automatiser

| statut | nombre |
|---|---|
| `PRODUCTION` | 5 |
| `ACCEPTED` | 4 |
| `REPRODUCIBLE` | 5 |
| `MEASURED` | 4 |
| `OBSERVED` (hors MCTS) | 4 |

22 nœuds, 11 arêtes, 4 problèmes racines. **C'est un arbre très maigre.** Le plus gros
sous-arbre comparable (`REPAIR_NON_CONVERGENCE`) compte 6 mutations, dont 3 seulement
partagent un `evaluation_context` compatible. Un MCTS lancé aujourd'hui explorerait un
espace de quelques nœuds : il donnerait la structure, pas le pouvoir de sélection.

**Le préalable n'est donc pas d'écrire le contrôleur, c'est d'élargir l'arbre** — et en
priorité de faire passer les mutations `PROMPT_FIELD_OMISSION` de `MEASURED` à
`REPRODUCIBLE`, puisque c'est le seul problème racine dont **aucune** mutation n'est
actuellement utilisable.

---

## 7. Une subtilité assumée : `accepted` ≠ « cherchable »

Trois mutations sont `accepted: true` mais `status: OBSERVED` — elles n'adressent aucun
problème racine déclaré (`M-schema-artefacts-amont`, `M-schema-claim`,
`M-workflow-capteur-pas-juge`). Conséquence voulue :

- **l'Agent Factory** peut les sélectionner (elle lit `accepted`) ;
- **le MCTS** ne peut pas les explorer (il lit `status` + `reward_contract_ref`).

Ce n'est pas une incohérence : ce sont deux questions différentes. « Cette mutation est-elle
retenue ? » et « Sur quel axe puis-je la comparer à une autre ? » n'ont aucune raison
d'avoir la même réponse.
