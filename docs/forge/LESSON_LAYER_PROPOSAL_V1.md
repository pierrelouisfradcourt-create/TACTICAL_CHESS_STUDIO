# LESSON_LAYER_PROPOSAL_V1

*2026-08-04. **Proposition seule.** Aucun champ ajouté, aucune leçon modifiée,
`root_problems.json` non touché. La décision appartient à Pierre.*

---

## Pourquoi ce champ, et pas un algorithme

Mesuré dans `ROOT_PROBLEM_LINK_PROPOSAL_V1` : trois critères fondés sur la preuve donnent
**zéro** association entre les 18 leçons validées et les 4 problèmes racines. Le troisième
critère n'a même pas pu s'exécuter :

```
lesson.layer  ∩  root_problem.layer   ->  impossible : le champ n'existe pas cote lecon
```

`root_problem` déclare `layer`. `mutation` déclare `layer`. **La leçon est le seul maillon
de la chaîne causale qui ne dit pas où elle s'applique.** Il ne manque pas une méthode de
rapprochement : il manque une déclaration à la source.

## Valeurs autorisées

L'énumération **existe déjà** — `mutation_registry.schema.json`, `definitions.mutation.layer` :

```
s1-prisme · s2-worldscan · s3-decompo · s4-archi-contract · s5-wiremap-contract
repair · quality · driver
```

Valeurs réellement employées aujourd'hui :

```
root_problems   quality · repair · s2-worldscan
mutations       driver · quality · repair · s1-prisme · s2-worldscan
```

**Proposition : réutiliser cette énumération telle quelle**, sans en créer une seconde.
Deux vocabulaires pour la même notion divergeraient — c'est le doublon
`proven_chains`/`agent_recipes` résolu il y a deux jours.

**Un trou à assumer** : les 18 leçons validées portent sur la chaîne de production de jeux
(builder Godot, oracle produit, wiremap, entrypoint, statut de run). Aucune de ces couches
n'est dans l'énumération — elle décrit la chaîne **amont**. Deux issues possibles, et c'est
la vraie question de cette proposition :

| issue | conséquence |
|---|---|
| **A. étendre l'énumération** (`build`, `oracle-produit`, `wiremap`, `dispatch`…) | les leçons deviennent classables, mais l'énumération cesse de décrire une seule chaîne |
| **B. laisser l'énumération telle quelle** | les leçons de jeu porteraient `layer: null` — le champ existerait et resterait vide, ce qui ne résout rien |

**Je recommande A**, à une condition : que l'extension soit faite en nommant les couches
qui existent réellement dans le driver (`_STEP_ORDER`, `roles.yaml`), pas en inventant une
taxonomie.

## Impact

| surface | effet |
|---|---|
| `learning_memory.record_lesson_event()` | +1 paramètre optionnel `layer`, par défaut `None` |
| `fold_lessons()` | replie le champ comme les autres ; une leçon sans événement portant `layer` rend `null` |
| `premortem_lessons()` | **aucun changement de comportement** — le filtrage reste sur `status`. Le champ ne devient un filtre que si quelqu'un le branche |
| `lessons.jsonl` | journal **append-only** : les 23 leçons existantes ne sont pas réécrites |
| `root_problems.json` | **aucun changement** — c'est déjà lui qui porte `layer` |
| tests | `test_learning_memory.py` : ajouter un cas « leçon sans layer → `null` » |

## Migration — l'historique n'est pas modifié

Le journal est **append-only** et `fold_lessons` replie à la lecture. Trois voies, par ordre
de conservatisme :

1. **Rien** — les 23 leçons existantes rendent `layer: null`. Le champ ne sert qu'aux
   nouvelles. *Aucune réécriture, aucune perte.*
2. **Événements d'annotation** — pour une leçon dont la couche est **certaine**, ajouter un
   nouvel événement portant `layer`. L'historique reste intact (l'ancien événement est
   toujours lisible via `read_lesson_history`), et la décision est datée et attribuable.
3. **Réécriture du fichier** — **à exclure**. Elle effacerait la trace de ce qui était
   connu à quel moment.

**Proposition : voie 1 maintenant, voie 2 au cas par cas et sur décision humaine.**

## Risques

1. **Le champ pourrait rester vide.** Un champ déclaré et jamais rempli est le motif
   *« déclaré ≠ exécuté »* que cette lane traque. Si `layer` s'ajoute, il faut décider
   **qui** le remplit — l'auteur de la leçon au moment où il l'écrit, sinon personne ne le
   fera après coup.
2. **Il pourrait servir à fabriquer le lien qu'on refuse.** Rattacher une leçon à une
   couche puis en déduire un `root_problem` par identité de couche resterait une
   **inférence**, pas une preuve : plusieurs problèmes racines partagent une couche
   (`quality` en porte deux). Le champ rapproche les candidats ; il ne tranche pas.
3. **L'énumération va devoir grandir** (issue A), et une énumération qui grandit à chaque
   nouvelle leçon n'est plus une taxonomie mais une liste.
4. **Aucun consommateur mécanique aujourd'hui.** Tant que rien ne lit `lesson.layer`, il
   entre dans la catégorie `PASSIVE` que l'audit Consumers First a mesurée. **Le remplir
   sans lecteur ne serait pas un progrès.**

## Décision demandée

☐ **Ajouter `lesson.layer`** en réutilisant l'énumération existante, **étendue** aux
  couches réelles de la chaîne de production *(recommandé — avec le point de risque 1 tranché)*
☐ **Ajouter `lesson.root_problem_id`** à la place — plus direct, mais exige que l'auteur
  connaisse le problème racine au moment où il écrit la leçon
☐ **Ne rien ajouter** — la mémoire causale reste en deux univers disjoints, et le vide de
  `lesson_ids` reste l'information
☐ **Autre**

Tant qu'aucune case n'est cochée, le schéma de leçon reste inchangé.
