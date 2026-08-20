# RUNTIME_REALITY_LAYER_V0 — préparation, rien d'implémenté

> **CLOS le 2026-08-04, le jour même** — par `OBSERVER_RUNTIME_REALITY_AUDIT_V1.md`.
> **Cette couche ne doit pas être écrite.** L'Observer existant (`scripts/observer/`,
> 7 645 événements mesurés sur 4 projets) couvre **11/11 champs** de l'`EXECUTION_TRACE`
> décrit ici, avec preuve physique et taxonomie de preuve (95,2 % MECHANICAL).
> Il produit déjà les deux listes ci-dessous : 5 rôles `DÉCLARÉ_JAMAIS_OBSERVÉ`,
> 0 `OBSERVÉ_JAMAIS_DÉCLARÉ`.
>
> Ce document reste utile pour une seule raison : **ses trois pré-requis tiennent toujours**
> (définir l'observation, fixer la fenêtre, décider où vit la sortie) — ils s'appliquent
> désormais au branchement de l'Observer, pas à une couche neuve.

*2026-08-04. **Aucun code, aucun agent, aucun contrôleur.** Ce document existe pour que la
prochaine couche parte du bon problème, pas pour la commencer.*

---

## Le problème que cette session a mis à nu

```
architecture déclarée  ≠  architecture exécutée
```

Le studio documente depuis longtemps un mode de panne : **déclaré ≠ exécuté** — un mécanisme
inscrit quelque part que rien n'appelle. Cette session a montré que l'écart va aussi **dans
l'autre sens** :

| sens | exemple trouvé | conséquence |
|---|---|---|
| déclaré, non exécuté | rôle `orchestrator` — aucun code ne le résout, l'entrée est purement descriptive (documenté dans `roles.yaml`) | on croit qu'un réglage agit ; il ne touche rien |
| **exécuté, non déclaré** | `repair_step.mjs` : réparait des artefacts sur 5 étapes du driver, hors de tout registre de rôles, sans contrat | on croit qu'un comportement n'existe pas ; il tourne |

Le second est le plus coûteux : il ne produit **aucun symptôme visible**. Un rôle déclaré et
mort finit par se remarquer. Du code vivant et non déclaré, non.

Il a fallu un audit de câblage pour trouver celui-ci. Ce n'est pas une méthode : c'est un
coup de chance de calendrier.

---

## Ce que la couche mesurerait

Une seule question, dans les deux sens :

```
pour chaque rôle DÉCLARÉ    →  a-t-il été OBSERVÉ en exécution ?
pour chaque exécution OBSERVÉE →  correspond-elle à un rôle DÉCLARÉ ?
```

Sortie attendue : deux listes nommées, pas un score.

- **DÉCLARÉ_JAMAIS_OBSERVÉ** — candidat au gel ou à la suppression, jamais automatiquement.
- **OBSERVÉ_JAMAIS_DÉCLARÉ** — exactement ce qu'était `repair_runtime` avant aujourd'hui.

Sources d'observation déjà présentes dans le dépôt : `lab/forge_runs/` (états et étapes de
run), les blocs de mesure rendus par `run_real.py`, les reçus d'oracle. Rien à instrumenter
en plus pour un premier passage — et c'est un argument pour commencer petit.

---

## Ce que la couche ne doit pas devenir

- **Pas un score de santé.** « 12/16 rôles observés » ne dit rien d'utile : un rôle rare
  n'est pas un rôle mort.
- **Pas un nettoyeur automatique.** Supprimer un rôle non observé est une décision
  HumanGate. Le studio a déjà la règle : *gelé ≠ mort*.
- **Pas un agent.** Une lecture de fichiers existants suffit ; elle doit rester
  déterministe et rejouable.
- **Pas une fusion avec l'auto-audit.** `studio_selfaudit.mjs` compare **doc ↔ réalité**.
  Celle-ci comparerait **déclaration ↔ exécution**. Deux axes distincts ; les fusionner
  ferait perdre la lisibilité des deux.

---

## Pré-requis avant d'écrire quoi que ce soit

1. Définir ce qui compte comme **observation** (un run daté ? un reçu d'oracle ? une entrée
   de journal ?). Sans cette définition, « jamais observé » signifie « jamais cherché ».
2. Fixer la **fenêtre** : jamais observé *depuis quand*. Un absolu sur toute l'histoire du
   dépôt et un glissant à 30 jours ne racontent pas la même chose.
3. Décider où vit la sortie — proposition, jamais écriture durable directe.

Tant que ces trois points ne sont pas tranchés, cette couche n'a pas de contrat, et un
mécanisme sans contrat est exactement ce que la Forge refuse de faire tourner.
