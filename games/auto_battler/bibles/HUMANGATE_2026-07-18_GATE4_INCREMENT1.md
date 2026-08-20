<!-- GATE HUMAIN #4 — ratification de Pierre, collée en session le 2026-07-18. VERBATIM, JAMAIS RÉÉCRIT (règle studio). Source autoritaire pour le contrat de l'incrément 1 « engine-core » : périmètre strict, invariant content-agnostic (→ P11 du contrat maître), oracles minimaux. GO incrément 1 + GO commit du jalon documentaire (séparé du code). -->

Oui, je ratifierais le lancement de l'incrément 1, avec une condition importante : le contrat doit rester strictement limité au noyau de simulation.
Je définirais le périmètre ainsi.

In scope
Le moteur doit uniquement implémenter les invariants déjà verrouillés :
* `GameState`
* `rng_state`
* `EventLog`
* la liste close des `Inputs`
* la boucle de simulation
* la sérialisation/désérialisation de l'état
* le système de replay
* les transitions d'état
* les validations des invariants Core Rules concernés
* les hooks Oracle associés à INV-1..5, INV-12, INV-13 et INV-19

Le moteur ne doit connaître ni unité, ni combat, ni économie, ni contenu DSL.
Autrement dit, il doit pouvoir faire tourner une partie composée d'états et d'entrées, même si aucune règle de jeu n'est encore implémentée.

Explicitement hors périmètre
Le contrat devrait interdire toute implémentation de :
* Combat
* Economy
* Shop
* Pool
* Bench
* Mana
* Meta
* Balance
* DSL runtime
* Pairing
* Ghost Board
* Renderer
* UI

Si un développeur a besoin d'une de ces notions pour terminer l'incrément 1, cela signifie que le périmètre a dérivé.

Oracles minimaux
Avant de considérer l'incrément terminé, je demanderais au minimum ces validations automatiques :
1. Même état initial + même séquence d'Inputs ⇒ même `GameState` final au bit près.
2. Le replay reproduit exactement l'état final.
3. Deux exécutions sur deux machines donnent le même hash final de `GameState`.
4. Chaque `Input` produit une transition valide ou un rejet déterministe.
5. Le `rng_state` n'évolue que lorsqu'une règle autorisée le consomme.

Une précaution supplémentaire
J'ajouterais un invariant d'architecture au contrat d'incrément :
Aucune logique métier ne peut dépendre d'un type de contenu futur.
Par exemple, l'engine-core ne doit pas connaître :
* `Warrior`
* `Mage`
* `Origin`
* `Trait`
* `Item`
Il ne manipule que des abstractions génériques (`EntityId`, `PlayerId`, `Input`, `Event`, `State`, etc.). Cela évite que le premier incrément crée des dépendances vers les futures bibles.

Décision
Je ratifierais donc :
* Incrément 1 ("engine-core") : GO
* Commit du socle documentaire : GO, à condition qu'il soit clairement identifié comme un jalon documentaire et qu'il ne soit pas mélangé avec les premiers fichiers de code.

Je garderais les questions restantes (Combat, Meta, DSL détaillé) dans leurs incréments respectifs, puisqu'elles ne conditionnent pas ce noyau de simulation.

---

## Traduction en contrat (par l'orchestrateur, à ratifier implicitement par l'exécution)

- **In-scope → `in_scope`** : `games/auto_battler/engine/**`, tests du moteur, `run-oracle.mjs`. Rien d'autre.
- **Hors périmètre → `deps_interdites` / `out_of_scope`** : Combat, Economy, Shop, Pool, Bench, Mana, Meta, Balance, DSL runtime, Pairing, Ghost Board, Renderer, UI — aucun de ces modules n'existe à l'incrément 1. Toute nécessité de l'un d'eux = **dérive de périmètre = STOP**.
- **Invariant content-agnostic → P11 du contrat maître** (`00_ARCHITECTURE.md`) + `deps_interdites` : le noyau ne connaît aucun identifiant de contenu ; abstractions génériques uniquement.
- **Oracles minimaux (5) = critères de complétude**, en plus du gate mutation et de check_architecture/wiremap :
  1. déterminisme bit-à-bit (état initial + Inputs → GameState final identique) — INV-1/3 ;
  2. replay reproduit l'état final — INV-4 ;
  3. hash final identique sur deux machines — INV-19(1) : **gap machinerie connu**, volet même-machine + sérialisation canonique automatisé, volet cross-machine = fog HumanGate honnête tant qu'aucun runner secondaire n'existe (jamais claimé) ;
  4. chaque Input → transition valide OU rejet déterministe — INV-13 ;
  5. `rng_state` n'évolue que sur consommation par une règle autorisée — INV-2/19.
