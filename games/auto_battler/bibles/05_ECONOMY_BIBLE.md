# Economy Bible — Auto Battler

**Date** : 2026-07-18
**Source** : session Pierre × Claude (Fable 5) — dérivée de `00_ARCHITECTURE.md` (RATIFIÉ — P3, P4, P5, P9, P10), de `02_CORE_RULES.md` (INV-7 — règle de comptage du Pool déléguée ici ; INV-8 ; INV-13 ; INV-19 ; Bench QD-5), de `03_DECISION_BIBLE.md` (DP-2 ordre des Seats ; DP-4 Merge automatique ; DP-5 tirage de la Shop — tables et procédure de comptage déléguées ici), de `HUMANGATE_2026-07-18_FOUNDATION.md`, `HUMANGATE_2026-07-18_DECISIONS.md` et `HUMANGATE_2026-07-18_GATE3.md` (verbatim, jamais réécrits — GATE3 : ratification des QE-1..7 et de P10) et de `SOURCE_GAME_BIBLE_V1_PIERRE.md` (notes brutes, jamais réécrites — sections Économie, Boutique, Pool partagé, Niveaux)
**Statut** : DRAFT — décisions gate #3 intégrées ; ratification finale du document pending
**Gabarit** : `00_TEMPLATE.md` (11 sections, ordre figé) · **Termes** : `00_VOCABULARY.md`

---

# Objectif

Cette bible fixe les **mécanismes économiques** du jeu : les sources et les usages du Gold,
la Shop et ses tables de probabilités, le Pool et sa règle de conservation comptable, le
Level (coûts et effets d'accès) et le Bench (capacité). « L'économie doit être aussi
importante que le combat » (V1) : cette bible définit les mécanismes qui rendent cet
objectif possible — et mesurable (Simulation Hooks).

Elle gouverne :
- le **schéma complet** des tables économiques (Income, coûts, odds, tailles) — les
  VALEURS restent TBD : leur remplissage suit le pipeline
  `Méta cible → Budgets → Contenu → Simulation → Ajustement` (P9), leur propriétaire
  est la Balance Bible (P10 — gate #3) et rien n'entre dans une table versionnée que
  par ratification Pierre ;
- la **règle de comptage** de la conservation du Pool (délégation explicite d'INV-7 et de
  DP-5 : « procédure de comptage » → Economy Bible) — règle tranchée par le gate #3
  (QE-1/QE-2, voir ECO-1) ;
- les **payloads structurels** des cinq Events économiques `GoldChanged`, `ShopRolled`,
  `UnitBought`, `UnitSold`, `PlayerLevelUp` (QE-6 — P10 : chaque bible propriétaire
  définit les payloads de SES Events ; le REGISTRE de la liste close reste aux Core
  Rules) ;
- l'application économique de **P4/INV-8** : probabilités affichées = probabilités réelles.

Elle ne gouverne PAS :
- les **valeurs finales** des paramètres (constantes, coûts, probabilités) : schémas
  ici, VALEURS possédées par la Balance Bible (P10 — « Balance possède : coefficients,
  formules, constantes ») ; objectifs et budgets = Meta Bible (P9) ; P5 reste vrai —
  la Balance Bible possède des valeurs, jamais des règles ni des événements ;
- la **résolution du Combat** et le damage à la Life après un Combat perdu (formule) →
  Combat Bible et Core Rules ;
- les **mécanismes de décision automatique** (ordres totaux, tirage déclaré) → Decision
  Bible (DP-2, DP-4, DP-5) — cette bible fournit contenus, tables et comptages, jamais
  les ordres ;
- l'**attribution de la Rarity** à chaque UnitDefinition → Content Bible, via le DSL
  (voir DSL Hooks) ;
- l'incarnation des Seats et tout timer d'interface → Platform Bible.

# Invariants

Chaque invariant est falsifiable ; vérification mécanique en Oracle Hooks. Les deux
forks de design qui conditionnaient la règle de comptage d'ECO-1 (QE-1, QE-2) sont
tranchés — ratifiés HumanGate 2026-07-18 (gate #3, `HUMANGATE_2026-07-18_GATE3.md`) :
la règle de comptage exacte est fixée ci-dessous.

- **ECO-1 — Conservation comptable du Pool.** Concrétisation d'INV-7 (Core Rules), dont
  la règle de comptage est déléguée à cette bible. **Principe ratifié (QE-1, gate #3) :
  le Pool représente des EXEMPLAIRES PHYSIQUES, jamais une abstraction.** L'inventaire
  se compte en exemplaires physiques par UnitDefinition ; l'inventaire total —
  Pool + Shops (exemplaires réservés) + possessions des Seats (Board et Bench) — est
  conservé par toute transaction, selon la règle de comptage ratifiée :
  - **Tirage (DP-5)** : la Shop RÉSERVE les exemplaires tirés (QE-2) — un exemplaire
    affiché dans une Shop n'est pas tirable par les autres Seats tant qu'il y est ; la
    réservation n'est PAS un débit ;
  - **Buy** : le Pool est décrémenté au Buy, jamais au Place (QE-2) ; le Bench n'a
    AUCUN impact sur le Pool ;
  - **Reroll / renouvellement de Round sans Lock** : les exemplaires non achetés
    retournent au tirage — la réserve est levée (conséquence dérivée de QE-2) ;
  - **Sell** : rend au Pool les exemplaires physiques que l'Unit représente. Ratifié :
    `Sell ★2 → Pool += 3` — une ★2 représente toujours trois exemplaires (QE-1).
    Généralisation (dérivée du principe « exemplaires physiques ») : une Unit de Star k
    rend au Pool le nombre d'exemplaires physiques consommés pour la produire. Le Sell
    crédite en outre du Gold (QE-3 — ECO-3) ;
  - **Merge** (action système, DP-4) : consomme 3 Units identiques et produit une Unit
    de Star strictement supérieur (INV-16) — comptablement un COMPACTAGE (dérivé du
    principe « exemplaires physiques ») : la Unit produite REPRÉSENTE les exemplaires
    consommés ; aucun exemplaire n'est créé, détruit ni rendu au Pool au
    `MergeResolved` — les exemplaires restent la possession du Seat, incarnés dans la
    Unit fusionnée.
  Rien d'autre ne crée ni ne détruit d'exemplaires (INV-7 : « aucune unité n'est créée
  ni détruite hors des règles explicites »). Si un mécanisme d'invocation apparaît un
  jour (Event `Spawn` — note de périmètre de la Decision Bible), son rapport à
  l'inventaire du Pool devra être déclaré ici avant implémentation.

  **Résolution de la tension QE-2 (INV-7 vs Vocabulary/DP-2)** — les deux lectures qui
  étaient en tension se réconcilient dans le modèle ratifié : la Shop est bien un lieu
  d'inventaire — ses exemplaires sont RÉSERVÉS, et la somme conservée d'INV-7 compte
  « Pool + Shops + possessions » (l'énoncé de l'invariant appartient aux Core Rules :
  toute question sur sa formulation s'y renvoie) — ET l'entrée Pool du Vocabulary
  (« chaque achat retire l'unité du Pool ») reste exacte : le DÉBIT a lieu au Buy. Une
  Shop affichée — a fortiori sous Lock (ECO-8) — prive les autres Seats des exemplaires
  qu'elle contient ; il n'existe donc pas de Buy rejeté pour « Unit déjà partie »
  (l'exemplaire affiché est réservé) ; le seul refus de Buy est la politique de Bench
  plein (QE-7 — ECO-7).
  — ratifié HumanGate 2026-07-18 (gate #3) : `HUMANGATE_2026-07-18_GATE3.md` (QE-1,
  QE-2).

- **ECO-2 — Probabilités affichées = probabilités réelles.** Application d'INV-8/P4. Il
  existe UNE SEULE table d'odds par version ; l'affichage et le tirage (DP-5) lisent
  cette même table — jamais deux sources de vérité. Toute divergence entre ce qui est
  montré et ce qui est tiré est un défaut fail-hard.
- **ECO-3 — Le Gold ne naît et ne meurt que par transactions déclarées.** Concrétisation
  d'INV-19. La liste CLOSE des mouvements de Gold est : **Income** (crédit, début de
  Round — revenu de base seul), **Buy** (débit), **Reroll** (débit), **LevelUp**
  (débit), **Sell** (crédit — ratifié QE-3 ; montants = table TBD, valeurs possédées
  par la Balance Bible — P10), **rewards de Round Resolution** (crédit éventuel —
  schéma QC-1). Aucune source ni aucun puits implicite ; tout mouvement de Gold hors
  liste est un défaut fail-hard. **Interest : REJETÉ (QE-4). Primes de série (win/lose
  streak) : REJETÉES, au moins en V1 (QE-5).** Réintroduire l'un ou l'autre — ou
  ajouter tout autre mouvement — étend cette liste close : gate HumanGate. — ratifié
  HumanGate 2026-07-18 (gate #3).
- **ECO-4 — Toute table de probabilité est fonction (Level, Rarity) et versionnée.** La
  table d'odds de la Shop est indexée exhaustivement par (Level, Rarity) et par rien
  d'autre — jamais par le Seat, jamais par un historique de tirages hors `rng_state`
  (un mécanisme correctif type « pity » serait une mécanique nouvelle : gate). Toute
  modification de contenu change l'identifiant de version ; tout Match et toute Campaign
  consignent la version employée.
- **ECO-5 — Tirages économiques déterministes.** Tout tirage économique (contenu de la
  Shop) passe par `rng_state` et par lui seul (DEC-3, DP-5) : à GameState identique,
  Shop identique — reproductible au Replay (INV-4), identique entre machines (INV-19).
- **ECO-6 — Le Level ne dégrade jamais l'accès.** Propriété de schéma sur les tables
  (valeurs TBD), dérivée de la V1 (« monter de niveau augmente la taille de l'équipe,
  débloque des unités rares, améliore les probabilités ») : (a) la taille d'Army
  déployable est non décroissante en Level ; (b) une Rarity accessible à un Level reste
  accessible à tout Level supérieur (un déblocage ne se reverrouille jamais).
  L'« amélioration des probabilités » des Rarity hautes est un objectif de design évalué
  à la ratification des valeurs (Meta/Human), pas un invariant mécanique.
- **ECO-7 — Le Bench est borné et déclaré.** La capacité du Bench est un paramètre
  déclaré (concept : Core Rules QD-5 ; schéma : cette bible ; valeur : Balance Bible —
  P10), jamais une constante implicite ni une zone illimitée. **Politique de Bench
  plein, ratifiée (QE-7) : le Buy est REFUSÉ ; aucune destruction automatique.**
  Aucune exception n'est ratifiée (une exception « l'achat complète un Merge » serait
  une règle nouvelle : gate). Le comportement reste une règle déclarée — jamais un
  comportement émergent de l'implémentation. Le Bench n'a aucun impact sur le Pool
  (QE-2). — ratifié HumanGate 2026-07-18 (gate #3).
- **ECO-8 — Lock conservatif.** Une Shop sous Lock est conservée À L'IDENTIQUE au Round
  suivant : même contenu, aucun re-tirage, aucune consommation de `rng_state` pour cette
  Shop (Vocabulary, entrée Lock). Le Lock n'a pas de coût en Gold — dérivé de la liste
  d'usages de la V1 (« L'or sert à : acheter, relancer, monter de niveau », liste qui ne
  contient pas le Lock) ; lui donner un coût étendrait la liste close ECO-3 (gate).

# Concepts

Cette bible n'introduit AUCUN terme canonique nouveau : tous les termes viennent de
`00_VOCABULARY.md` (Gold, Income, Shop, Reroll, Lock, Pool, Bench, Level, Rarity ; Buy,
Sell, LevelUp — Inputs de la liste close INV-13 ; Merge, Star ; UnitDefinition,
UnitInstance). L'inventaire du Pool se compte en **exemplaires physiques** par
**UnitDefinition** (QE-1 — ECO-1) ; les possessions des Seats sont des
**UnitInstances**.

- **Income** — Gold reçu par un Seat en début de Round (Vocabulary). Schéma : un revenu
  de base fonction du RoundIndex — et RIEN d'autre. L'entrée Income du Vocabulary
  évoquait « intérêts » et « primes éventuelles définies par l'Economy Bible » : cette
  délégation est tranchée — ratifié HumanGate 2026-07-18 (gate #3) :
  - **Interest : NON (QE-4).** Raison de Pierre : le jeu est original ; l'intérêt est
    devenu un standard du genre ; le retirer oblige à créer une économie différente et
    évite les stratégies passives. Conséquence design : l'économie originale à
    concevoir est un OBJECTIF pour la Meta Bible (renvoi — budgets et objectifs de
    méta, P9).
  - **Primes de série (win streak / lose streak) : NON, au moins en V1 (QE-5).** Le
    moteur sera plus simple.
  Income = revenu de base seul dans tout schéma ; toute réintroduction étend la liste
  close ECO-3 (gate HumanGate).
- **Transactions** — les mouvements économiques portés par des Inputs (liste close
  INV-13), totalement ordonnés par le journal d'Inputs (INV-4, nota DP-2) :
  - **Buy** — acheter une Unit de la Shop ; coût fonction de la Rarity (Vocabulary,
    entrée Rarity : la Rarity « conditionne son coût ») ; débit du Pool AU BUY, jamais
    au Place (QE-2 — ratifié gate #3) ; Bench plein → Buy REFUSÉ (QE-7 — ECO-7) ;
    l'Unit achetée suit `Shop → Purchased → {Board | Bench}` (QD-5) ;
  - **Sell** — vendre une Unit possédée ; rend au Pool les exemplaires physiques que
    l'Unit représente (`Sell ★2 → Pool += 3` — QE-1, ECO-1) ; crédite du Gold (QE-3 —
    ratifié gate #3) ; montants = schéma (Rarity × Star), table TBD, valeurs possédées
    par la Balance Bible (P10) ;
  - **Reroll** — payer du Gold pour re-tirer le contenu de la Shop (DP-5) ; les
    exemplaires non achetés retournent au tirage (réserve levée — dérivé de QE-2) ;
    coût TBD (valeur : Balance Bible — P10) ;
  - **LevelUp** — payer du Gold pour monter le Level du Player ; coût par Level cible
    TBD (valeur : Balance Bible — P10) ;
  - **Lock** — conserver la Shop courante au Round suivant (ECO-8) ; sans coût en Gold.
  Le **Merge** n'est PAS une transaction (action automatique du système — QC-3, jamais
  un Input) ; comptablement, c'est un COMPACTAGE sans effet sur le Pool (dérivé de
  QE-1 — ECO-1).
- **Table d'odds de la Shop** — fonction (Level, Rarity) → distribution de tirage ;
  versionnée (ECO-4) ; source unique lue par l'affichage et le tirage (ECO-2/INV-8) ;
  valeurs TBD.
- **Pool** — inventaire fini et partagé du Lobby, compté en EXEMPLAIRES PHYSIQUES par
  UnitDefinition, jamais une abstraction (QE-1 — ratifié gate #3) ; taille par Rarity
  calibrée sur N (P3 : N calibre « taille du pool, probabilités de boutique, …,
  pression économique ») ; moteur de l'adaptation, de la lecture du Lobby et des
  contres (V1).
- **Bench** — zone du Player hors Board (QD-5) ; conserve les Units entre les Rounds ;
  n'intervient pas directement dans le Combat ; AUCUN impact sur le Pool (QE-2) ;
  capacité = paramètre dont le schéma est ici et la valeur à la Balance Bible (P10) ;
  Bench plein → Buy REFUSÉ, aucune destruction automatique (QE-7 — ratifié gate #3).
- **Level** — réservé au Player (Q4). Gouverne : la taille d'Army déployable sur le
  Board (lecture V1 « augmente la taille de l'équipe » — le Bench a sa propre capacité,
  distincte), l'accès aux Rarity hautes et les odds de la Shop (V1).

# Paramètres

Le SCHÉMA complet des tables économiques. **Toutes les valeurs sont TBD** — aucun
chiffre n'est fixé ni suggéré ici : le remplissage suit P9 (Méta cible → Budgets →
Contenu → Simulation → Ajustement), chaque table entre en vigueur versionnée (ECO-4) et
ratifiée par Pierre. **Propriété (P10 — gate #3) : cette bible possède les SCHÉMAS de
ses tables ; les VALEURS (constantes, coûts, probabilités) sont possédées par la
Balance Bible.** La colonne Propriétaire distingue donc schéma / valeurs.

| Nom | Valeur | Unité | Propriétaire |
|---|---|---|---|
| Gold initial d'un Seat | TBD | Gold | schéma : Economy Bible · valeurs : Balance Bible (P10) |
| Income de base par Round (courbe fonction du RoundIndex) | TBD | Gold/Round | schéma : Economy Bible · valeurs : Balance Bible (P10) |
| Composantes additionnelles d'Income (Interest, primes de série) | AUCUNE — REJETÉES, QE-4/QE-5 — ratifié HumanGate 2026-07-18 (gate #3) ; réintroduction = gate | — | — |
| Coût d'un Buy, par Rarity | TBD | Gold | schéma : Economy Bible · valeurs : Balance Bible (P10) · attribution des Rarity : Content Bible |
| Contrepartie d'un Sell, par Rarity × Star | existence ratifiée (QE-3, gate #3) ; montants TBD | Gold | schéma : Economy Bible · valeurs : Balance Bible (P10) |
| Coût d'un Reroll | TBD | Gold | schéma : Economy Bible · valeurs : Balance Bible (P10) |
| Coût d'un LevelUp, par Level cible | TBD | Gold | schéma : Economy Bible · valeurs : Balance Bible (P10) |
| Level initial / Level maximal du Player | TBD | Level | schéma : Economy Bible · valeurs : Balance Bible (P10) |
| Taille d'Army par Level (plafond de déploiement sur le Board) | TBD | Units | schéma : Economy Bible · valeurs : Balance Bible (P10) |
| Nombre d'Units proposées par Shop | TBD | Units | schéma : Economy Bible · valeurs : Balance Bible (P10) |
| Table d'odds de la Shop — fonction (Level, Rarity), versionnée | TBD | probabilités | schéma : Economy Bible (ECO-2, ECO-4) · valeurs : Balance Bible (P10) |
| Taille du Pool par Rarity (par UnitDefinition) — calibrée sur N (P3) | TBD | exemplaires physiques (QE-1) | schéma : Economy Bible · valeurs : Balance Bible (P10) |
| Capacité du Bench | TBD | places | concept : Core Rules (QD-5) · schéma : Economy Bible · valeur : Balance Bible (P10) |
| Rewards de Round Resolution (nature et montants — schéma QC-1) | TBD | — | schéma : Economy Bible (composantes Gold) · mécanisme : Core Rules · valeurs : Balance Bible (P10) |
| Life initiale du Seat (valeur à PROPOSER par cette bible — table Paramètres des Core Rules) | TBD | points | Core Rules (propriétaire) — proposition préparée ici |

# Points de décision

Aucun point de décision automatique NOUVEAU n'est enregistré par cette bible : tout
nouveau site devrait l'être dans la Decision Bible (DEC-1), jamais ici. Les DP
existants qui touchent l'économie :

- **DP-2 — Ordre des Seats** (Decision Bible) : l'Income et le tirage des Shops itèrent
  sur les Seats en `seat_index` croissant, fixe (QD-6). Cette bible fournit le CONTENU
  (montants, tables), jamais l'ordre.
- **DP-5 — Tirage de la Shop** (Decision Bible) : le mécanisme et le caractère déclaré
  du tirage (DEC-3, via `rng_state`) appartiennent au registre ; les tables d'odds, les
  coûts et la procédure de comptage vis-à-vis du Pool appartiennent à cette bible
  (délégation explicite de DP-5). La procédure est ratifiée (QE-2, gate #3) :
  RÉSERVATION des exemplaires au tirage, DÉBIT du Pool au Buy, retour au tirage
  (réserve levée) au Reroll ou à la fin du Round sans Lock — voir ECO-1.
- **DP-4 — Merge automatique** (Decision Bible) : ordre de consommation ratifié (QD-4) ;
  l'effet COMPTABLE du Merge est fixé (dérivé de QE-1, gate #3) : COMPACTAGE — aucun
  exemplaire créé, détruit ni rendu au Pool (ECO-1).
- **À enregistrer** : la politique de Bench plein ratifiée (QE-7 — Buy REFUSÉ, aucune
  destruction automatique) introduit un rejet automatique par le moteur : ce site devra
  être enregistré sous un DP-n dans la Decision Bible AVANT implémentation (DEC-1,
  fail-hard). Aucune exception (ex. complétion d'un Merge) n'est ratifiée — en ajouter
  une serait une règle nouvelle : gate.

# Flux

**Séquence économique d'un Round** (s'insère dans la boucle ratifiée des Core Rules ;
ordonnancement intra-Round Income → tirage → Preparation State ratifié avec la Decision
Bible) :

```text
Round start
  → Income                (crédit de Gold — revenu de base seul : Interest et primes
                           de série REJETÉS, QE-4/QE-5 gate #3 ; itération sur les
                           Seats : ordre DP-2)
  → Tirage des Shops      (DP-5 — tirage déclaré via rng_state, DEC-3 ; tables
                           Level×Rarity de cette bible — ECO-2/ECO-4 ; exemplaires
                           tirés RÉSERVÉS, pas débités — QE-2 ; Shop sous Lock :
                           conservée, aucun re-tirage — ECO-8 ; ordre entre Seats : DP-2)
  → Preparation State     (transactions par Inputs — Buy, Sell, Reroll, Lock, LevelUp ;
                           ordre total = journal d'Inputs, INV-4 ; Buy = débit du Pool,
                           Bench plein → refus — QE-2/QE-7 ; Merge automatique DP-4 —
                           compactage sans effet Pool, QE-1)
  → ConfirmPreparation    (clôt les transactions du Round — QC-5 ; aucun Input, donc
                           aucune transaction, pendant le Combat — INV-13)
  → Pairing → Combat Simulation → Round Resolution
                          (rewards éventuels — schéma TBD ; toute composante en Gold
                           est une transaction déclarée — ECO-3)
  → Life update → Repeat
```

**Flux du Pool** (règle de comptage ratifiée QE-1/QE-2, gate #3 — voir ECO-1) :

```text
         tirage (DP-5)              Buy                  Place
         = RÉSERVATION              = DÉBIT du Pool      (aucun effet Pool)
  Pool ───────────────▶ Shop ───────────────▶ Purchased ─────▶ {Board | Bench}   (QD-5)
   ▲                     │                                          │
   │   Reroll / fin de   │                                          │  Sell
   │   Round sans Lock : │                                          │  (rend les exemplaires
   │   réserve levée,    │                                          │   physiques — ★2 → +3,
   │   retour au tirage  │                                          │   QE-1 ; crédite du
   │                     │                                          │   Gold, QE-3)
   └─────────────────────┴──────────────────────────────────────────┘
              Merge (automatique, DP-4) : 3 Units identiques → 1 Unit de Star
              supérieur — COMPACTAGE : aucun exemplaire créé, détruit ni rendu au
              Pool (dérivé QE-1) ; le Bench n'a AUCUN impact sur le Pool (QE-2)
```

# Événements

Vocabulaire FERMÉ (P2, INV-12). Le REGISTRE canonique de la liste close des Events est
tenu par les Core Rules (P10 : « la LISTE close des Events est un registre unique tenu
par les Core Rules ; chaque bible propriétaire définit les payloads de SES Events ») —
toute question sur la liste elle-même s'y renvoie.

**Cinq Events économiques sont créés — ratifié HumanGate 2026-07-18 (gate #3, QE-6)** :

```text
GoldChanged
ShopRolled
UnitBought
UnitSold
PlayerLevelUp
```

Conséquence ratifiée : l'interface de la Preparation State devient un **Renderer pur**
au sens P2 — elle lit les Events, jamais le GameState. La tension avec INV-5 relevée
par l'analyse QE-6 est levée : c'est l'extension de la liste close qui est ratifiée,
avec ces cinq noms ; l'inscription des noms au registre vit dans les Core Rules
(renvoi — P10).

**Payloads structurels** — cette bible est PROPRIÉTAIRE des payloads de ces cinq
Events (P10). Champs STRUCTURELS uniquement — aucune valeur :

- `GoldChanged` — { `seat_id` ; `delta` ; `new_gold` ; `source` : l'un des mouvements
  de la liste close ECO-3 (Income, Buy, Reroll, LevelUp, Sell, reward) ; `input_ref` :
  référence à l'Input du journal — absente pour les mouvements système (Income,
  rewards) }.
- `ShopRolled` — { `seat_id` ; `shop_content` : liste ordonnée des UnitDefinition
  proposées ; `odds_table_version` (ECO-4) ; `cause` : début de Round ou Reroll }.
  Une Shop sous Lock n'émet pas de `ShopRolled` (aucun re-tirage — ECO-8, dérivé).
- `UnitBought` — { `seat_id` ; `unit_definition` ; `shop_slot` ; `gold_cost` (débité) }.
  Le placement ultérieur (`Purchased → {Board | Bench}`, QD-5) n'est pas porté par cet
  Event.
- `UnitSold` — { `seat_id` ; `unit_instance` ; `unit_definition` ; `star` ;
  `pool_returned` : nombre d'exemplaires physiques rendus au Pool (ECO-1) ;
  `gold_credited` }.
- `PlayerLevelUp` — { `seat_id` ; `old_level` ; `new_level` ; `gold_cost` (débité) }.

Ces payloads portent des CHAMPS, jamais des valeurs : montants, coûts et tailles
restent TBD (valeurs : Balance Bible — P10). La sémantique d'émission exacte (quels
Events pour quel Input — ex. un Buy émet-il `UnitBought` ET `GoldChanged`) sera fixée
avec les structures du moteur ; seuls les payloads ci-dessus sont contractuels ici.
Toute extension (nouvel Event, champ porteur d'une sémantique nouvelle) = gate
HumanGate (INV-12).

# Oracle Hooks

Déterministes, non-LLM (P7) ; consommés par la Oracle Bible. La règle de comptage
d'ECO-1 est ratifiée (QE-1/QE-2, gate #3) : le grand-livre des hooks est fixé.

- **ECO-1** : property-test — pour toute séquence d'Inputs valide, l'inventaire total
  en exemplaires physiques par UnitDefinition (Pool + Shops réservées + possessions)
  est invariant modulo la règle de comptage ratifiée (réservation au tirage, débit au
  Buy, `Sell ★2 → Pool += 3`, Merge = compactage). Alimente le hook INV-7 des Core
  Rules. Fixtures ciblées : Buy (débit au Buy, pas au Place) ; Sell d'une ★1 ; Sell
  d'une ★2 → Pool += 3 ; Reroll (réserve levée, retour au tirage) ; cascade de Merge
  (DP-4 — aucun retour au Pool) ; exemplaire réservé en Shop intirable par un autre
  Seat.
- **ECO-2** : audit d'architecture — une seule table d'odds, lue par l'affichage ET par
  le tirage (aucune seconde source) ; test à Seed fixe — fréquences de tirage sur grand
  échantillon conformes à la table (déterministe car Seed fixe). Reprend le hook INV-8.
- **ECO-3** : property-test — pour toute transition `GameState → GameState`, le delta de
  Gold de chaque Seat est exactement la somme algébrique des transactions déclarées du
  journal (Income, Buy, Sell, Reroll, LevelUp, rewards) ; audit statique — aucun site
  d'écriture du Gold hors du module de transactions (INV-19).
- **ECO-4** : audit de schéma — toute table d'odds est indexée exhaustivement par
  (Level, Rarity) et porte un identifiant de version ; toute modification de contenu
  sans changement de version = défaut fail-hard.
- **ECO-5** : fixture — même GameState (même `rng_state`) → même Shop, deux runs, bit à
  bit (recoupe DP-5/DEC-2) ; même tirage sur deux machines différentes (INV-19).
- **ECO-6** : test de propriété sur les tables remplies (applicable dès ratification des
  valeurs) — taille d'Army non décroissante en Level ; aucune Rarity débloquée à un
  Level n'est reverrouillée à un Level supérieur.
- **ECO-7** : audit — la capacité du Bench est lue depuis le paramètre déclaré (aucune
  constante en dur) ; fixture « Bench plein » (politique ratifiée QE-7) : Buy → REFUS —
  aucune Unit détruite, aucun débit de Gold, aucun débit du Pool.
- **ECO-8** : fixture — Lock posé au Round r → Shop du Round r+1 identique bit à bit,
  aucune consommation de `rng_state` pour cette Shop ; les Units sous Lock restent
  comptées dans l'inventaire conservé (ECO-1).

# Simulation Hooks

Ce que l'économie expose aux Campaigns (advisory, jamais gate de merge — P7 ;
protocoles pré-enregistrés, pas de tuning post-hoc) :

- **Courbes de Gold** : Gold par Seat par Round (distribution, médiane) ; Gold épargné
  vs Gold dépensé par Round.
- **Contestation du Pool** : épuisement de l'inventaire (en exemplaires physiques) par
  UnitDefinition et par Rarity au fil des Rounds ; fréquence des raréfactions au tirage
  (exemplaires réservés ou possédés indisponibles — QE-2) et des Buy refusés pour
  Bench plein (QE-7).
- **Tempo** : Round de chaque LevelUp par Seat ; trajectoires (montée de Level rapide vs
  Gold épargné) et leur corrélation au classement final.
- **Usage des transactions** : fréquence de Reroll, Lock, Sell par Round et par Seat.
- **« L'économie doit être aussi importante que le combat » (V1)** : objectif Meta
  mesurable — part de la variance du classement final expliquée par les décisions
  économiques, comparée à celle du Placement (~30 % visé par la V1, propriété Meta
  Bible). Protocole de mesure → Simulation Bible ; lecture → Meta Bible ; jugement →
  Pierre (Human Notes).

# DSL Hooks

Le DSL est AUTORISÉ à :
- déclarer la **Rarity** d'une UnitDefinition (donnée de contenu, lue par les tables
  d'odds et de coûts de cette bible).

Le DSL ne peut JAMAIS :
- toucher les tables d'odds, les coûts, l'Income, la taille du Pool, la capacité du
  Bench, ni les règles de conservation/comptage (ECO-1) ;
- introduire une source ou un puits de Gold (ECO-3) ni un tirage économique (DEC-3).

Toute extension de cette frontière = gate HumanGate (P8 : agrandit la surface du
moteur).

# Human Notes

Ce qui reste du ressort de Pierre, hors de portée d'un Oracle :

- **« Chaque achat compte. Chaque vente compte. »** (V1) — la tension économique se joue
  au feel : un Gold trop abondant tue le dilemme, un Gold trop rare tue les options.
  L'Oracle prouve la conservation, pas la tension.
- **« Aucune action ne doit être "évidente" »** (V1) — dépenser (tempo immédiat) vs
  garder (options futures) doit rester un arbitrage perçu, jamais une ligne de conduite
  unique. Les mesures tempo (Simulation Hooks) informent ; le jugement est de playtest.
- **Lecture du Lobby via le Pool** : la raréfaction doit être RESSENTIE par le joueur
  (adaptation, contres — V1). Un Pool mathématiquement contesté mais invisible au feel
  est un échec de design, pas d'implémentation.
- **Équilibre économie/combat** : « aussi importante que le combat » est un objectif de
  la V1 dont la mesure est définie (Simulation Hooks) mais dont le verdict est humain.
- **Granularité des valeurs** : des coûts petits et lisibles (comptables de tête) sont
  une intention de design à porter au moment de la ratification des tables — pas une
  contrainte mécanique.

---

## Décisions ratifiées — récapitulatif (QE-n)

Les 7 questions QE-1..7 de ce document sont tranchées — ratifiées HumanGate 2026-07-18
(gate #3) ; verbatim de Pierre : `HUMANGATE_2026-07-18_GATE3.md` (jamais réécrit).
Zéro question ouverte restante. Le point de décision automatique créé (refus de Buy à
Bench plein) reste à enregistrer dans la Decision Bible (DEC-1).

| Id | Décision ratifiée | Section |
|---|---|---|
| QE-1 | Le Pool représente des EXEMPLAIRES PHYSIQUES, jamais une abstraction ; `Sell ★2 → Pool += 3` (une ★2 = toujours trois exemplaires) ; généralisation dérivée : une Unit de Star k rend les exemplaires consommés pour la produire — ratifié HumanGate 2026-07-18 (gate #3) | Invariants (ECO-1) |
| QE-2 | Débit du Pool au Buy, jamais au Place ; la Shop RÉSERVE déjà les exemplaires ; le Bench n'a aucun impact ; réserve levée au Reroll / fin de Round (dérivé) — ratifié HumanGate 2026-07-18 (gate #3) | Invariants (ECO-1) |
| QE-3 | Le Sell crédite du Gold ; montants = table TBD (valeurs : Balance Bible — P10) — ratifié HumanGate 2026-07-18 (gate #3) | Invariants (ECO-3) · Concepts |
| QE-4 | PAS de mécanisme d'Interest — jeu original : l'intérêt est un standard du genre, son retrait force une économie différente et évite les stratégies passives ; économie originale à concevoir = objectif Meta Bible — ratifié HumanGate 2026-07-18 (gate #3) | Concepts (Income) |
| QE-5 | Pas de win streak, pas de lose streak (au moins en V1) — moteur plus simple — ratifié HumanGate 2026-07-18 (gate #3) | Concepts (Income) |
| QE-6 | Cinq Events économiques créés : `GoldChanged`, `ShopRolled`, `UnitBought`, `UnitSold`, `PlayerLevelUp` ; l'UI de préparation devient un Renderer pur (P2) ; payloads ici, registre de la liste close = Core Rules (P10) — ratifié HumanGate 2026-07-18 (gate #3) | Événements |
| QE-7 | Bench plein → Buy REFUSÉ ; aucune destruction automatique — ratifié HumanGate 2026-07-18 (gate #3) | Invariants (ECO-7) |

*Fin du DRAFT — 8 invariants ECO-n, 7 décisions QE-n ratifiées (gate #3,
`HUMANGATE_2026-07-18_GATE3.md`), zéro valeur chiffrée nouvelle, zéro question
ouverte ; ratification finale du document pending.*
