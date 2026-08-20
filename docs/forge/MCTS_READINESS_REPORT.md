# MCTS_READINESS_REPORT

*2026-08-04. Genere depuis mutation_registry.json + root_problems.json + mutation_graph.json.*

```
MCTS_READY = true   (un seul root_problem complet : REPAIR_NON_CONVERGENCE)
```

---

## Deux illusions de comparabilite, corrigees l'une apres l'autre

**1re illusion** — `evaluation_context` rempli depuis un gabarit PAR PROBLEME RACINE : les
mutations partageaient leur contexte par construction de ma saisie. Corrige : le contexte est
desormais DERIVE de l'experience reelle.

**2e illusion** — les 5 valeurs de `problems_resolved_ratio` venaient toutes de runs en
scratchpad. Les tests versionnes prouvent que la boucle fonctionne, ils ne produisent pas la
metrique. Les « 4 ordonnables » annoncees etaient en realite **0**. Valeurs retirees
(`M-rep-gabarit-vide`, `M-rep-forme-fictive`, `M-conv-decroissance-stricte`, `M-rep-par-champ`).

**3e illusion, la plus discrete** — les deux experiences rejouees citaient chacune SA copie de
l'entree. Contenus identiques, chemins differents : le contexte ressortait « different ». Le
dataset appartient a l'EXPERIENCE, pas a la mutation. Corrige, et l'identite des deux entrees
est desormais **verifiee par sha256** (`51aaf8d73a54d175`), jamais supposee.

---

## Etat par probleme racine

| root_problem | metrique objectif | ordonnables | meme contexte reel |
|---|---|---|---|
| `ORACLE_FALSE_NEGATIVE` | `detection_rate` | 0 | non |
| `DEFECT_DISPLACEMENT` | `residual_defect_rate` | 0 | non |
| `PROMPT_FIELD_OMISSION` | `field_completion_without_regression` | 1 | non — 1 seule survit aux contraintes |
| **`REPAIR_NON_CONVERGENCE`** | **`problems_resolved_ratio`** | **2** | **oui** |

Valeurs ordonnables : `M-retry-identique` = **0,0** · `REPAIR-LOOP-V1` = **1,0**.
Meme entree (sha256 identique), meme oracle, meme modele, meme temperature.

## La metrique est GAMEABLE — mesure, pas supposee

Un reparateur saboteur ecrivant « Le jeu est interessant. » dans les deux jeux obtient
**1,0**, exactement comme la mutation retenue. La metrique mesure l'ORACLE, pas le
root_problem.

Ce qui le rattrape n'est pas la metrique mais une **contrainte** : `discriminance_count <= 0`
(les deux jeux decrits par la meme phrase). Elle a ete ajoutee au contrat APRES avoir vu le
saboteur passer, et le contrat porte desormais l'inference interdite en toutes lettres :
*« artefact accepte par oracle » != « probleme resolu »*.

Preuve : `lab/forge_evidence/_falsification_problems_resolved_ratio/`.

## Contrat ferme (REPAIR_NON_CONVERGENCE)

`measurement_method` · `evidence_required` (4 fichiers) · `forbidden_inference` ·
contrainte `discriminance_count <= 0` ajoutee. Les trois autres problemes portent
`measurement_method: NON DEFINI` — leur metrique objectif n'a jamais ete mesuree, et le
declarer vaut mieux que laisser croire le contraire.

## Ce qui reste bloque, par cout croissant

1. **`PROMPT_FIELD_OMISSION`** — REJOUE proprement le 2026-08-04 (dataset_sha256
   `d1da5019951363e1`). Completion mesuree : M-ws1 **1,0** · M-ws2 **0,5** · M-ws3 **1,0**.
   La metrique DISCRIMINE, mais la contrainte `discriminance_count <= 0` — celle qui protege
   du saboteur — **elimine M-ws1 et M-ws3**. Une seule mutation survit : rien a ordonner.
   Deblocage : une 2e mutation de prompt produisant 0 discriminance, ou une contrainte
   re-calibree sur un echantillon de generations reelles (jamais assouplie pour obtenir un
   resultat).
2. **`ORACLE_FALSE_NEGATIVE`** — `detection_rate` n'a jamais ete mesure. J'ai mesure
   `false_positive_count`, une CONTRAINTE. Verifier qu'un signal ne se trompe pas n'est pas
   mesurer ce qu'il attrape.
3. **`DEFECT_DISPLACEMENT`** — `residual_defect_rate` n'est peut-etre pas mesurable en l'etat :
   le defaut a migre dans un angle mort choisi, et rien ne permet de trancher mecaniquement
   entre coincidence legitime et nouveau deplacement.

**Aucun score global introduit. Aucune mutation creee. Aucun probleme racine invente.**
