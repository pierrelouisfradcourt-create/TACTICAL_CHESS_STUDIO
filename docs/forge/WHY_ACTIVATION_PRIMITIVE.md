# Le WHY — évaluation comme primitive du contrat d'activation

- **Statut** : PROPOSED (évaluation architecturale, aucun code) — traité SÉPARÉMENT de Context Loop V2,
  conformément à la consigne Pierre 2026-07-25 : « une nouvelle primitive potentielle du système
  d'activation, pas une règle mémoire ».
- **Auteur** : Fable (Architecte du contexte agentique) · **Base** : cartographie du contrat réel (ce jour,
  lecture directe SCHEMA.md + s9-build.yaml + code de rendu), audits 24-25/07.

## 1. Cartographie du contrat d'activation ACTUEL (sans rien supposer)

| Dimension | Champ réel | Rendu dans le prompt ? | Porte la CAUSE d'activation ? |
|---|---|---|---|
| Rôle | `role` | OUI (contract.py:165) | non — identité |
| Objectif | `objectif` | OUI | non — résultat attendu (tâche, pas cause) |
| Scope | `in_scope` / `out_of_scope` | OUI | non |
| Sources | `mandatory_read` | liste seulement (E1) | non |
| Mémoire | `memoire` | **NON** (validé, jamais rendu) | non — décrit le flux de données consommé (« consomme le blueprint… »), pas la raison d'être |
| Contraintes | `permissions` / `gardeFou` | OUI (narratif) | non |
| Validation | `success_criteria` / `tests_oracles` / `output_contract` / `final_report` | OUI | non |
| **Traçabilité** | `delegation_context` | **NON** (Recommandé, validé si présent, jamais rendu) | **PRÉVU MAIS DÉGRADÉ** — SCHEMA.md:61 le définit comme « Pourquoi l'agent existe, qui l'a mandaté » ; le contenu réel est topologique : « Étape 9, en aval du Blueprint Gate (7)… » |
| Traçabilité (2) | `parent_agent` | — | **JAMAIS CODÉ** (grep vide hors SCHEMA.md, audit 25/07) |
| Point d'entrée décisionnel humain | — | — | **ABSENT du contrat** — la décision qui a causé un run vit dans `pending_review_decisions.jsonl` / le charter, sans lien mécanique avec le dispatch |
| Tâche par run | bloc « TÂCHE CONCRÈTE » (run_real, hors contrat) | OUI | non — c'est le QUOI de l'activation, pas le POURQUOI |
| Causes passées | pré-mortem (injecté) | OUI | adjacent — causes d'échecs PASSÉS, tourné vers l'arrière, pas la cause de CETTE activation |

**Conclusion de cartographie (FAIT OBSERVÉ)** : le WHY avait une case réservée dans le schéma du 09/07 et
a subi le mode de panne signature du studio (« déclaré ≠ exécuté ») en trois temps : (1) rempli avec de la
topologie au lieu d'une cause, (2) jamais transmis à l'agent, (3) à moitié jamais implémenté. **Aucun agent
Forge n'a jamais reçu la cause de son activation.**

## 2. Cadrage CORRIGÉ (Pierre, 2026-07-25) — primitive du CONTRAT D'ACTIVATION

**Correction ratifiée** : le WHY n'est ni une extension de Context Loop, ni une règle mémoire, ni un champ
de traçabilité. C'est une **primitive du contrat d'activation**, au même rang que ROLE (« qui es-tu ? »),
OBJECTIVE (« que dois-tu faire ? »), CONSTRAINTS (« quelles limites ? »), MEMORY (« quelles informations ? ») :

> **WHY — « Pourquoi cette activation existe maintenant ? »** Quelle intention humaine ou système a
> provoqué cette activation précise ; quelle conséquence cherche-t-on à corriger, produire ou éviter.

Séparation ratifiée des deux notions (jamais fusionnées, `parent_agent` n'est PAS supprimé) :

- **Champ 16 — Traçabilité / origine** : `parent_agent` — QUI a déclenché cette activation, chaîne de
  délégation. (`delegation_context` répond « qui a mandaté » / position de chaîne.)
- **Champ 17 — Intention d'activation** : `why` — POURQUOI cet agent est activé maintenant, quelle
  conséquence est en jeu, quel contexte causal explique l'objectif.

**Cadrage final (précision Pierre, 2026-07-25)** : le WHY n'est pas une donnée injectée au dispatch —
le dispatch est seulement **l'endroit où sa valeur d'activation est résolue**. Le WHY appartient au
contrat d'activation au même niveau conceptuel que les autres primitives, avec une particularité : sa
valeur est **dynamique**. Spectre de stabilité des primitives :

```text
role      = identité stable          → « Pourquoi cette entité est-elle compétente ? »
skill     = capacité stable
memory    = sources stables          → « Quelles connaissances doivent guider son raisonnement ? »
objective = mission variable         → « Quelle action doit-elle réaliser ? »
why       = cause de CETTE activation → « Pourquoi cette action existe maintenant ? »
constraints = limites stables        → « Qu'est-ce qui ne doit pas être cassé ? »
```

Le WHY est une **ancre d'intention**, pas une information de contexte supplémentaire. Il ne se rattache
PAS à Context Loop : Context Loop répond « comment conserver et transmettre le contexte utile ? » ;
le WHY répond « quelle intention justifie que cet agent reçoive ce contexte et cette mission ? ».
Ensemble ils forment la chaîne :

```text
Intention humaine → WHY → OBJECTIVE → ROLE + SKILL → ACTION → CHECKPOINT / MEMORY
```

## 3. Schéma du champ 17 (format Pierre + garde-fou anti-théâtre)

```yaml
why:                       # champ 17 du contrat d'activation — valeur liée au dispatch
  type: decision | anomaly | continuation | directive
  text: >                  # la cause, dans les mots du mandant — pas un résumé de tâche
    "Cette activation existe car les résultats Fireball produisent une incohérence
    observée dans les simulations. Le but n'est pas seulement de modifier les dégâts,
    mais de restaurer la cohérence du système de combat."
  consequence: >           # ce qui se produit si on n'agit pas — ancre l'enjeu
    "Sans correction, les données futures d'équilibrage seront biaisées."
  ref: <pointeur falsifiable — optionnel mais recommandé>   # décision, erreur, checkpoint, charter
parent_agent: orchestrateur Pierre    # champ 16 — origine, conservé, séparé
```

Le `ref` falsifiable reste la protection anti-théâtre proposée par l'orchestrateur (validation mécanique :
`type=anomaly` ⇒ une anomalie référencée doit exister) — statut : à ratifier avec W1.

- **Rendu** : bloc `## POURQUOI CETTE ACTIVATION` dans le prompt (entre le contrat et la tâche concrète).
- **Signé** : champ du Context Manifest kind dispatch (le WHY donné est prouvable a posteriori).
- **Falsifiable** : validation mécanique anti-théâtre — `ref` doit exister (même philosophie que
  knowledge_trace/checkpoint) ; `type=anomaly` sans référence d'erreur/oracle ⇒ invalide.
- **Transmis** : le checkpoint (brique 4) gagne un 10e champ `why_recu` — A2 hérite de la cause telle
  quelle ; si la cause a changé entre A et A2, c'est un NOUVEAU dispatch avec un nouveau WHY (jamais une
  mutation silencieuse).
- **Navigable** : wiremap_nav répond alors à « pourquoi cette décision existe » par la chaîne
  feature → runs → WHY de chaque dispatch → décision/anomalie source — la chaîne causale complète
  demandée par la brique 6.

## 4. Ce que le WHY n'est pas (garde-fous de sémantique)

Pas un résumé de tâche (c'est « TÂCHE CONCRÈTE ») · pas une mémoire (le pré-mortem regarde en arrière,
le WHY explique le présent) · pas l'objectif reformulé (`objectif` = résultat attendu ; WHY = ce qui a
déclenché l'intervention) · pas la topologie (`delegation_context` reste ce qu'il est). Distinction
attendue en sortie : l'agent peut séparer symptôme (« Fireball -10 % vs Warrior ») / cause à enquêter /
objectif (corriger) — trois choses que le contrat actuel écrase en une.

## 5. Hypothèses à ÉPROUVER (pas à croire) au run observé

H1 : moins de drift quand la cause est connue · H2 : meilleure conservation de l'intention humaine à
travers A→A2 · H3 : meilleure distinction symptôme/cause/objectif dans les sorties. Protocole minimal,
digne de P1.1 : sur le run observé, écrire le WHY à la main pour chaque dispatch (aucun outillage requis) ;
comparer les sorties aux runs historiques équivalents sans WHY ; chercher activement le contre-exemple
(un WHY qui n'a rien changé, ou pire, qui a biaisé l'agent vers le symptôme). **Zéro claim avant ça.**

## 6. Risques

- **WHY-théâtre** : l'orchestrateur invente une cause plausible — mitigé par `ref` falsifiable obligatoire.
- **WHY périmé** : cause obsolète après refresh — mitigé : le WHY est par-activation, jamais hérité entre
  dispatchs distincts.
- **Biais d'ancrage** : un WHY mal formulé enferme l'agent sur le symptôme — c'est le contre-exemple à
  chercher en H3.
- **Friction** : un champ requis de plus à la porte — mitigé : `type=continuation` + ref checkpoint est
  auto-dérivable pour les reprises ; seuls les dispatchs initiaux exigent une cause écrite.

## 7. Décisions Pierre

- **W1 — RATIFIÉ 2026-07-25 (correction Pierre)** : WHY = champ 17 du contrat d'activation
  (`{type, text, consequence}`), séparé du champ 16 (`parent_agent` conservé — traçabilité/origine).
  Reste ouvert dans W1 : le `ref` falsifiable (recommandation orchestrateur, anti-théâtre).
- **W2** : pilote manuel au run observé (§5) avant tout outillage — oui/non.
- **W3** : le checkpoint passe à 10 champs (`why_recu`) — amende D4.
- **W4** : `delegation_context` conservé tel quel (« qui a mandaté » / position de chaîne) — tranché par
  la séparation 16/17 ; aucun renommage nécessaire.

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
