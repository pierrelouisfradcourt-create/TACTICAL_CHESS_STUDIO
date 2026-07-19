# HumanGate préparation — Incrément 3 « Combat »

**Date** : 2026-07-19
**Statut** : PROPOSED — préparation documentaire uniquement. Ne contient AUCUNE règle Combat finale, aucune valeur, aucun choix de résolution. Sert de checklist d'entrée pour le futur gate Pierre qui autoriserait le dispatch Forge de l'incrément Combat.
**Ne remplace pas** `04_COMBAT_BIBLE.md` (DRAFT, non ratifié — cf. §5 ci-dessous) ni `HUMANGATE_2026-07-18_GATE3.md` (verbatim, jamais réécrit).

---

## 1. Dépendances nécessaires

Avant tout dispatch Forge sur l'incrément Combat, doivent exister et être VERTS :

- **Incrément 1 « engine-core »** : mergé et committé (`44592b3`) — mais **NON POUSSÉ** à ce jour (`git status` : branche `feat/forge-oracle-gate` locale). Le gate Pierre de merge a eu lieu ; le gate de push est distinct et non demandé.
- **Incrément 2 « preparation + economy »** : d'après `FORGE_PLAN_PROPOSAL.md §2`, c'est l'incrément 2 (Preparation State, Buy/Sell/Reroll/Lock/LevelUp/Place, Merge auto, Pool/Shop/Income) qui précède Combat dans le découpage à 4 incréments. **Aucune trace de run ou de code pour l'incrément 2** dans `lab/forge_runs/` ou `games/auto_battler/engine/` au-delà d'engine-core — statut : NOT_FOUND.
- **Profil Forge `increment`** (proposé en `FORGE_PLAN_PROPOSAL.md §5, R1`) : n'existe PAS dans `scripts/forge/dispatch.py::PROFILES` à ce jour (constaté par lecture — seuls `full`, `patch`, `review`, `micro`, `artbible` y figurent). Sans ce profil, l'incrément Combat devrait tourner en profil `full` (repli documenté, fonctionnel mais réintroduit s0-s2 déjà couverts par le corpus de bibles).
- **Convention `run_dir` par incrément** (`FORGE_PLAN_PROPOSAL.md §5, R2`) : proposée, pas ratifiée. Sans elle, le gel `wiremap_frozen.json` d'un run Combat pourrait entrer en collision avec celui d'engine-core.
- **HumanGate « valeurs de travail v0 »** (`FORGE_PLAN_PROPOSAL.md §5, R4`) : proposé, PAS tenu. Nécessaire avant Combat car plusieurs paramètres restent `TBD` propriété Balance (`tick_limit`, dimensions du Board, retombée du Mana après Cast) — un builder ne peut légalement pas les inventer (gardeFou du contrat s9, cf. `FORGE_PLAN_PROPOSAL.md §3`).

## 2. Invariants hérités (déjà verrouillés, Combat doit s'y conformer sans les redéfinir)

Ces invariants viennent d'engine-core (ratifié gate #4) et des gates #2/#3 — Combat les CONSOMME, ne les invente pas :

- **P1** — le moteur est une simulation pure `État(t) + Entrées(t) = État(t+1)` ; `rng_state` fait partie de `GameState`.
- **P10** — propriété étanche des concepts : Combat possède Tick/Attack/Death (règles + événements de résolution) ; Combat **ne définit jamais** un coefficient (Balance) ni une donnée DSL.
- **P11** — noyau content-agnostic : le moteur ne connaît aucun identifiant de contenu (`Warrior`, `Mage`, …), seulement des abstractions génériques.
- **INV-12** — registre fermé des Events, tenu par les Core Rules ; chaque bible propriétaire (Combat) définit les payloads de SES Events, jamais le registre lui-même.
- **QB-4** — Tick hybride : séquentiel dans l'exécution, simultané dans les effets. Pipeline `Intent → Validation → Resolution → Commit`.
- **QB-3** — `Movement → Targeting → Attack` (la cible est choisie après le déplacement).
- **QB-5** — `Damage → Death → Cleanup → Cast des survivants` ; une unité morte ne lance jamais son sort.
- **QB-8** — `deterministic_order` = la TieBreakChain unique (QD-1 : décision stratégique → priorité de règle → distance Manhattan → initiative de création → `unit_instance_id` → `seat_index`).
- **QB-9** — Events Combat étendus : `Heal`, `Shield`, `Buff`, `Debuff` — « pas davantage » sans gate.
- **QB-11** — Mana alimenté uniquement par attaque / dégâts reçus / effets DSL.
- **QB-16** — chaque Effect déclare `MaxTriggerPerTick` (garde-fou anti-boucle), validé par Combat.

## 3. Surfaces interdites (rappel gate #4, s'appliquent identiquement à l'incrément Combat)

Explicitement hors périmètre tant que le gate Combat n'a pas eu lieu :
Economy · Shop · Pool · Bench · Mana (valeurs, pas le concept) · Meta · Balance (formules/constantes) · DSL runtime · Pairing · Ghost Board · Renderer · UI.

`deps_interdites` proposées pour Combat (jamais encore posées dans un `blueprint.oracle.json` réel — cf. `FORGE_FORMATS_REFERENCE.md §3`) : `combat ↛ bench`, `combat ↛ gold/economy/pool/shop`, `combat ↛ life` (Player), `combat ↛ rng` direct (seul `rng_state` du GameState, jamais un accès caché).

Si un développeur a besoin d'une de ces notions pour terminer l'incrément Combat, le périmètre a dérivé (règle du gate #4, transposée).

## 4. Questions bloquantes — `[QUESTION → Pierre]`, aucune résolution proposée ici

- **QB-6 — Anéantissement mutuel au même Tick — RATIFIÉE 2026-07-19.** Pierre a tranché en session : match nul, aucune perte de Life pour aucun des deux Players. Verbatim capturé dans `games/auto_battler/bibles/HUMANGATE_2026-07-19_QB6.md`, intégré dans `04_COMBAT_BIBLE.md` (Flux T10 cas 2, DP-7, table récapitulative, points différés). Détail structurel encore ouvert *(dérivé, pas un fork de design)* : le nom exact du `resolution_kind` (proposé `"draw"`) à confirmer à l'intégration DSL/Technical. Cette ligne reste dans le document pour traçabilité — ce n'est plus une question bloquante pour l'entrée en incrément Combat.
- **Tension P5 ↔ P10** — mentionnée dans `studio_brain/00_CURRENT_CONTEXT.md` (« P5↔P10 à clarifier ») comme reste ouvert. Aucun document du corpus ne détaille la nature exacte de cette tension à ce jour (recherche mécanique : aucune occurrence conjointe P5/P10 en dehors de cette ligne de contexte) — **remontée en fog**, pas résolue ici. Hypothèse de lecture non ratifiée (à confirmer ou infirmer par Pierre) : QB-7 fait porter `total_remaining_power` à la Balance Bible (cohérent P5 « budgets vivent dans Balance/Meta/DSL ») alors que P10 dit que Combat ne définit jamais un coefficient — la Combat Bible se contente de CITER la fonction sans la définir (ligne QB-7 du récapitulatif), ce qui semble cohérent en l'état, mais le point reste listé comme non clos par la mémoire studio.
- **Paramètres `TBD`, propriété Balance, non fixés** : `tick_limit` (existence actée QB-14, valeur TBD), dimensions/orientation du Board (Core Rules, gate futur), retombée du Mana après Cast (« retombe à zéro » proposé, jamais ratifié), articulation Shield ↔ Damage (Combat + DSL). Un builder Combat rencontrant l'une de ces valeurs doit remonter en fog HumanGate, jamais en inventer une (gardeFou identique à l'incrément 1).
- **Statut de ratification de `04_COMBAT_BIBLE.md` lui-même** : le document se déclare `Statut : DRAFT — décisions gate #3 intégrées ; ratification finale du document pending. Les invariants CBT-1..9 et le TickPipeline ne deviennent contrat moteur qu'après cette ratification.` — donc même les invariants CBT ne sont pas encore un contrat moteur opposable. `[QUESTION → Pierre]` implicite : ratifier `04_COMBAT_BIBLE.md` comme document avant de ratifier le dispatch de l'incrément Combat, ou les deux au même gate ?

## 5. Critères d'entrée dans l'incrément Combat

Tous les critères suivants doivent être VRAIS avant tout `prepare_dispatch` marqué Combat :

1. `04_COMBAT_BIBLE.md` ratifié comme document (pas seulement DRAFT avec décisions intégrées) — ou décision explicite de Pierre de dispatcher sur la base du DRAFT actuel (à son choix, pas le nôtre).
2. ~~QB-6 tranchée par Pierre~~ — **FAIT** (2026-07-19, `HUMANGATE_2026-07-19_QB6.md`) : match nul, aucune perte de Life. Reste un détail non bloquant : nommage exact de `resolution_kind` à l'intégration DSL/Technical.
3. Incrément 2 (« preparation + economy ») livré et son gate franchi, OU décision explicite de Pierre de réordonner/paralléliser (le découpage à 4 incréments de `FORGE_PLAN_PROPOSAL.md` n'a lui-même reçu qu'un statut `PROPOSED`, jamais ratifié formellement en tant que séquence obligatoire).
4. Décision infra sur le profil Forge à utiliser : `increment` (à créer, gate Pierre car modification sous `scripts/`) ou repli `full`.
5. Convention `run_dir` par incrément ratifiée (au minimum : nom du prochain run, ex. `auto_battler_i3`, pour éviter toute collision de gel avec `auto_battler_i1`).
6. HumanGate « valeurs de travail v0 » tenu pour au moins les paramètres bloquants listés en §4, avec statut explicitement provisoire dans `params.mjs` (proposition déjà écrite dans `FORGE_PLAN_PROPOSAL.md §5, R4`).
7. `oracles.json` mis à jour si nécessaire (l'entrée `auto_battler` existe déjà : `"cwd": "games/auto_battler", "command": ["node", "run-oracle.mjs"]` — à vérifier qu'elle couvre bien les futurs tests Combat, pas de changement de structure requis a priori).

---

## Sources

| Élément | created | registered | loaded | enforced | evidenced |
|---|---|---|---|---|---|
| Invariants hérités (§2) | Gates HumanGate 2026-07-18 (#2, #3, #4) | `games/auto_battler/bibles/00_ARCHITECTURE.md`, `04_COMBAT_BIBLE.md` | mandatory_read des futurs contrats s9 | PAS ENCORE — Combat non dispatché | verbatim `HUMANGATE_2026-07-18_GATE3.md` / `GATE4_INCREMENT1.md` |
| Surfaces interdites (§3) | Gate #4 verbatim | `HUMANGATE_2026-07-18_GATE4_INCREMENT1.md` | contrat s9 (`out_of_scope`) | OUI pour engine-core (`deps_interdites` vérifiées vertes) ; PAS ENCORE posé pour Combat | `lab/forge_runs/auto_battler_i1/blueprint.oracle.json` (réel, module `combat` déjà listé côté engine) |
| QB-6 (§4) | Gate dédié 2026-07-19 (chat Pierre) | `games/auto_battler/bibles/HUMANGATE_2026-07-19_QB6.md` (verbatim) + `04_COMBAT_BIBLE.md` (intégré : Flux T10, DP-7, récapitulatif) | contrat s9 Combat (à venir) | pas encore — Combat non dispatché | verbatim + intégration relue ligne par ligne dans ce document |
| Critères d'entrée (§5) | ce document, 2026-07-19 | aucun (PROPOSED) | aucun | NON — nécessite ratification Pierre | — |

```
software_verdict: BLOCKED   (aucun dispatch Combat possible : critères d'entrée non tous remplis — comportement attendu à ce stade)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
