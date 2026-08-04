# CAPABILITY_COMPOSITION_CONTRACT_V1

*2026-08-04. **Contrat seul.** Aucun composeur, aucun orchestrateur, aucune génération
automatique, aucun agent permanent.*

---

## Le principe

Un agent n'est pas une entité fixe. C'est une mission résolue :

```
MISSION → ROOT_PROBLEM → CAPABILITY_CHAIN → RUNTIME_ASSIGNMENT → EXECUTION → EVIDENCE
```

C'est pourquoi rien ici ne s'appelle `WorldScanAgent`. Nommer un agent crée une entité qu'on
finit par entretenir ; nommer une **recette** décrit une configuration qu'on assemble quand on
en a besoin, et qu'on jette ensuite.

---

## Les deux mots qu'il ne faut jamais fusionner

| | signifie | vit dans | exemples |
|---|---|---|---|
| `capability_role` | **quel runtime exécute** | `scripts/forge/contracts/roles.yaml` (48 contrats) | `worldscan` · `architect` · `builder` |
| `capability` | **quelle compétence est prouvée** | `scripts/forge/capabilities.json` | `instance_separation` · `targeted_field_repair` |

**Un rôle runtime n'est jamais une preuve de compétence.** Il dit qui exécute, pas ce qui est
démontré. Les fusionner ferait perdre les deux : on ne saurait plus si `worldscan` désigne un
modèle à appeler ou une capacité mesurée.

---

## Entrée du composeur

```yaml
{
  mission:            # ce qu'on veut obtenir, en clair
  root_problem_id:    # un id EXISTANT de root_problems.json — jamais une description libre
  constraints:        # budget tokens, latence, modèle imposé — des chiffres
  required_evidence:  # niveau de preuve exigé (VERSIONED obligatoire)
}
```

## Recherche

Le composeur retient une capacité si, et seulement si, **les quatre** conditions tiennent :

1. elle déclare le `root_problem_id` demandé dans son `solves` ;
2. ses `evidence_refs` sont non vides **et les fichiers existent physiquement** ;
3. ses `constraints` sont compatibles avec celles de la mission ;
4. aucun conflit connu avec une capacité déjà retenue (`conflicts` du registre).

Il ne compare **jamais** deux capacités servant des `root_problem` différents. C'est la règle
qui empêche la composition de redevenir un classement.

## Sortie

```yaml
capability_chain:
  - capability: instance_separation
    evidence:   M-ws5
  - capability: targeted_field_repair
    evidence:   REPAIR-LOOP-V1
```

Une chaîne n'est pas un agent : c'est une suite de capacités, chacune adossée à la mutation qui
la prouve.

---

## Règle fondamentale

**Interdit** — créer une capacité parce qu'elle *semble* utile.

**Autorisé** — créer une capacité si et seulement si :

```
expérience + mesure + preuve versionnée + root_problem associé
```

Les quatre. Trois sur quatre donne une intention bien rangée, pas une capacité.

---

## État réel — ce que le composeur pourrait assembler aujourd'hui

**1 recette prouvée** : `world_scan_repair_v1`, tracée de bout en bout.

```
mission          → produire un World Scan complet, sans champ manquant ni doublon
root_problem     → PROMPT_FIELD_OMISSION
capability_chain → instance_separation → targeted_field_repair
preuves          → M-ws5 · REPAIR-LOOP-V1   (3 fichiers, tous présents)
runtime_roles    → worldscan · AUCUN (déclaré absent)
validation       → field_completion_without_regression
                   sous discriminance_count ≤ 0
proven           → true (chaîne réellement exécutée : 0,889 → 1,0, oracle FAIL → OK)
```

**Un trou trouvé en écrivant cette recette** : `roles.yaml` déclare 15 rôles runtime — tous de
génération, d'architecture ou de revue. **Aucun rôle de réparation n'existe.**
`targeted_field_repair` porte donc `capability_role: null`, déclaré absent plutôt qu'inventé.
Le composeur peut assembler la chaîne ; il ne peut pas encore dire *qui* exécute la réparation.

---

## Ce que le composeur ne fera pas

- **Composer une chaîne non mesurée.** `proven: false` reste une hypothèse, pas une recette.
  Exemple concret : ajouter `duplicate_content_detection` à cette chaîne est plausible — cette
  capacité existe et est prouvée — mais **la chaîne à trois n'a jamais été exécutée**. Elle
  n'est donc pas dans le catalogue.
- **Utiliser un score global.** Interdit par `forbidden_aggregation` de chaque root_problem.
- **Classer par popularité.** Le nombre d'usages n'est pas une mesure.
- **Créer un agent permanent.** La sortie est une description.
- **Prendre un `capability_role` pour une preuve.** Un runtime assigné ne démontre rien.

---

## Critère de sortie de cette phase

La traçabilité est complète et **vérifiée mécaniquement** :

```
Mission → Root problem → Capability graph → Capability chain
       → Agent recipe → Runtime assignment → Evidence
```

Validation : 0 capacité sans preuve · 0 preuve sans fichier physique · 0 recette sans
root_problem · 0 rôle runtime utilisé comme preuve de compétence · 0 score global.

## Limites à connaître avant de construire la fabrique

*Mises à jour le 2026-08-04 — deux limites levées, deux qui tiennent.*

1. **1 recette.** Une chaîne prouvée ne fait pas un catalogue de compositions. *(tient)*
2. ~~Aucun rôle de réparation dans `roles.yaml`.~~ **Levée** : `repair_runtime` déclaré le
   2026-08-04 (accepté sous condition). La recette a désormais un exécutant pour chacun de
   ses maillons — `worldscan` et `repair_runtime`.
3. ~~Deux capacités reposent sur leur contrainte, pas sur leur objectif.~~ **Levée** :
   `detection_rate = 1,0` et `false_positive_rate = 0` mesurés sur défauts injectés
   (n=12 et n=10). Elles restent sans rôle runtime et sans recette qui les emploie.
4. `targeted_field_repair` converge vers l'**oracle**, pas vers la qualité. Une recette qui
   l'emploie hérite de cette limite — d'où `quality_not_proven: true` porté par la recette
   elle-même. *(tient, et c'est la limite structurante)*
