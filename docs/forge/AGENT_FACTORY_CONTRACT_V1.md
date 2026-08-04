# AGENT_FACTORY_CONTRACT_V1

*2026-08-04. **Contrat seul. Aucune implémentation, aucun contrôleur, aucun agent permanent.***
Remplace le brouillon `agent_factory_contract.md`, qui raisonnait en mutations : on raisonne
désormais en **capacités composables**.

---

## Ce qui change par rapport au brouillon

Le brouillon faisait sélectionner des **mutations**. Une mutation est un fait historique — « on
a essayé ceci, voilà ce qu'on a mesuré ». Ce n'est pas quelque chose qu'on assemble.

Une **capacité** est une mutation prouvée, dotée d'un contrat d'entrée et de sortie. C'est cela
qui se compose. La preuve que la distinction est utile est mesurée : `M-ws6` a fermé
`PROMPT_FIELD_OMISSION` en **composant** deux capacités, là où cinq prompts monolithiques
avaient échoué.

---

## Entrée

```yaml
{
  problem:      # un root_problem_id existant. JAMAIS une description libre.
  constraints:  # budget tokens, latence, modèle imposé — des chiffres
  context:      # artefacts amont disponibles, chemins existants
}
```

## Sortie

```yaml
{
  capability_chain:  # suite ordonnée d'ids de capacités
  evidence_basis:    # les evidence_refs de chaque capacité de la chaîne
  expected_measure:  # la métrique locale du root_problem, et rien d'autre
}
```

**Une chaîne n'est pas un agent.** C'est une suite de capacités. La fabrique décrit, elle
n'exécute pas.

---

## Interdictions

L'Agent Factory ne peut **pas** :

- **inventer une compétence** — elle ne choisit que dans `capabilities.json` ;
- **sélectionner une capacité sans preuve** — `evidence_refs` non vide et fichiers existants ;
- **utiliser un score global** — `mutation_score`, `quality_score`, `global_score` sont bannis
  par chaque `root_problem.forbidden_aggregation` ;
- **classer par popularité** — le nombre d'usages n'est pas une mesure de qualité ;
- **créer un agent permanent** — la sortie est une description, pas un processus.

## Chemin de sélection imposé

```
root_problem  →  capability  →  evidence  →  métrique locale
```

Jamais :

```
capability  →  score global
```

Deux capacités qui servent des `root_problem` différents ne sont **jamais** comparées. C'est la
règle qui empêche la fabrique de redevenir un classement.

---

## Catalogue actuel — 4 capacités, 1 chaîne prouvée

| capacité | prouvée par | résout |
|---|---|---|
| `instance_separation` | `M-ws5` | `PROMPT_FIELD_OMISSION` |
| `targeted_field_repair` | `REPAIR-LOOP-V1` | `REPAIR_NON_CONVERGENCE` |
| `duplicate_content_detection` | `Q1-DISCRIMINANCE` | `ORACLE_FALSE_NEGATIVE` |
| `cross_field_copy_detection` | `M-Q5-A` | `DEFECT_DISPLACEMENT` |

**Chaîne prouvée** — `worldscan_complete_v1` : `instance_separation → targeted_field_repair`.
Mesurée : completion 0,889 → **1,0**, oracle FAIL → **OK**, 2 champs réparés, 0 régression,
70 tokens. Preuve : `lab/forge_evidence/PROMPT_FIELD_OMISSION/M-ws6/`.

---

## Ne pas confondre avec `capability_role`

`scripts/forge/contracts/roles.yaml` porte déjà `capability_role` (48 contrats l'utilisent) :
c'est une **résolution rôle → runtime** (quel modèle exécute l'étape). Le catalogue décrit ici
est une **compétence mesurée** (que sait-on faire, et prouvé comment). Deux notions distinctes
qui partagent un mot. Les fusionner ferait perdre les deux : on ne saurait plus si `prisme`
désigne un modèle à appeler ou une compétence démontrée.

---

## Données prêtes pour un MCTS futur (aucun contrôleur ici)

Chaque capacité déclare `state` · `action` · `expected_metric` · `constraints` · `evidence`.
Un MCTS pourra explorer :

```
problème → actions possibles → compositions possibles → résultats mesurés
```

Ce qu'il **ne trouvera pas** dans ces données : une récompense. Elle appartient au
`root_problem` via son `reward_contract`, et à lui seul.

---

## Limites à connaître avant d'implémenter quoi que ce soit

*Mises à jour le 2026-08-04.*

1. **4 capacités, 1 chaîne.** Le catalogue est un embryon. *(tient)*
2. ~~Deux capacités de détection ont une métrique objectif jamais mesurée.~~ **Levée** :
   `detection_rate = 1,0`, `false_positive_rate = 0` (n=12 et n=10, défauts injectés).
   Elles sont désormais ordonnables — mais restent **sans rôle runtime** et absentes de
   toute recette.
3. **`instance_separation` ne passe pas l'oracle seule.** Sa limitation est déclarée : elle
   laisse 2 champs sur 18 vides. C'est ce qui rend la composition nécessaire — et c'est
   exactement ce qu'une capacité doit dire d'elle-même.
4. **`targeted_field_repair` converge vers l'oracle, pas vers la qualité.** Mesuré à plusieurs
   reprises : elle écrit des valeurs non vides, pas forcément justes.
5. Aucun **`production_ready`** dans ce catalogue. Le passage en production reste une décision
   HumanGate.
