# Combat Bible — Auto Battler

**Date** : 2026-07-18
**Source** : session Pierre × Claude (Fable 5) — dérivée de `00_ARCHITECTURE.md` (RATIFIÉ — P1, P2, P6, P7, P8, **P10**), de `02_CORE_RULES.md` (INV-3, INV-12, INV-13, INV-17, INV-18, INV-19), de `03_DECISION_BIBLE.md` (DEC-1..5 ; DP-1, DP-6.1..6.5, DP-7 — délégations explicites à cette bible), de `HUMANGATE_2026-07-18_FOUNDATION.md` (verbatim — QC-6), `HUMANGATE_2026-07-18_DECISIONS.md` (verbatim — QD-1, QD-3), **`HUMANGATE_2026-07-18_GATE3.md` (verbatim — ratification des QB-1..5, QB-7..16 et de P10)**, et de `SOURCE_GAME_BIBLE_V1_PIERRE.md` (notes brutes, jamais réécrites — déroulé de combat, Mana, Placement)
**Statut** : **DRAFT — décisions gate #3 + QB-6 (gate 2026-07-19) intégrées ; ratification finale du document pending**
**Gabarit** : `00_TEMPLATE.md` (11 sections, ordre figé) · **Termes** : `00_VOCABULARY.md`

Convention du document : les 16 forks QB-1..16 des versions antérieures sont TRANCHÉS par le
HumanGate #3 — chaque décision est intégrée inline avec la mention « ratifié gate #3, QB-n »,
qui renvoie au verbatim `HUMANGATE_2026-07-18_GATE3.md` (ratifié HumanGate 2026-07-18, gate #3).
Exception : **QB-6 n'apparaissait PAS dans le verbatim du gate #3** — elle a été tranchée
séparément par un gate dédié le 2026-07-19 (`HUMANGATE_2026-07-19_QB6.md`, ratifié : match nul,
aucune perte de Life pour aucun des deux Players). Les conséquences purement
structurelles d'une décision ratifiée sont marquées *(dérivé)* ; les points différés à un gate
futur portent leur propriétaire (récapitulatif en fin de document).

---

# Objectif

Cette bible est le **contrat de résolution du Combat** : elle régit la résolution
DÉTERMINISTE d'un Combat en Ticks — depuis le snapshot des deux Boards (pris après
`ConfirmPreparation` ; l'un des deux peut être un GhostBoard, QD-3) jusqu'au résultat
(`CombatResult`) et au segment d'Event Log correspondant. Elle fige l'ordre de traitement
intra-Tick (le TickPipeline), le sens des distances en Combat, la mécanique du Mana et des
Casts, la structure des payloads d'Events de combat, et l'ancrage de la chaîne de
résolution d'égalité au `tick_limit` (DP-7, principe INV-18 — la fonction de puissance
appartient à Balance, P10).

Elle APPLIQUE la TieBreakChain (QD-1) partout où des ex æquo apparaissent ; elle ne la
possède pas.

Elle ne gouverne PAS :
- les **VALEURS** des stats et des Abilities (Health, Range, cadences, contenus d'Effects)
  → Content Bible (données) et DSL Bible (contraintes de création, vocabulaire fermé) ;
- les **coefficients, formules et constantes d'équilibrage** → Balance Bible (P10, ratifié
  gate #3) : cette bible CITE `total_remaining_power` et l'existence du `tick_limit`,
  elle ne définit JAMAIS leurs contenus chiffrés ;
- la **politique des décisions** : le registre des DecisionPoints, la TieBreakChain et son
  ordre canonique → Decision Bible (DEC-1..5) ; cette bible fournit seulement l'ancrage de
  DP-1, DP-6.x et DP-7 dans le TickPipeline, et les définitions déléguées (sens contextuel
  de la distance Manhattan) ;
- le **registre de la liste close d'Events** (INV-12) → Core Rules (P10, corollaire) ;
  cette bible définit les payloads de SES Events, jamais la liste elle-même ;
- l'**économie** et les **conséquences du Combat sur le Match** : damage à la Life, rewards,
  progression → Round Resolution (Core Rules, QC-1 ; formule des dégâts au Seat : TBD,
  propriétaire Core Rules/Economy). Le Combat fournit uniquement le `CombatResult` ;
- la **sélection** du GhostBoard et le Pairing → DP-3 (Decision Bible) ; le Combat reçoit
  deux snapshots, il ne choisit jamais ses adversaires ;
- la **restitution visuelle** (animations, « spectaculaire ») → Renderer (P2), UX/UI et
  Visual Bibles.

# Invariants

Chaque invariant est falsifiable ; vérification mécanique en Oracle Hooks.

- **CBT-1 — Le Combat est une fonction pure.** Entrée : les snapshots des deux Boards
  (+ `rng_state` si et seulement si un tirage déclaré existait en Combat — voir CBT-9 :
  aucun à ce jour). Sortie : `CombatResult` + segment d'Event Log de combat. Même entrée →
  même sortie, au bit près, sur toute machine (INV-19). Aucune autre influence n'existe.
- **CBT-2 — Terminaison bornée.** Tout Combat émet un résultat en ≤ `tick_limit` Ticks
  (application d'INV-18) : soit par élimination d'un camp, soit par la chaîne d'égalité
  DP-7 au `tick_limit`. Cette bible définit l'EXISTENCE du `tick_limit` ; sa VALEUR
  appartient à la Balance Bible (ratifié gate #3, QB-14 — P10).
- **CBT-3 — Pipeline intra-Tick FIGÉ.** L'ordre de traitement intra-Tick est un ordre
  total unique — le TickPipeline documenté en section Flux — implémenté en UN SEUL endroit
  du moteur. Toute modification de cet ordre = gate HumanGate. Aucun contenu (DSL) ne peut
  le réordonner.
- **CBT-4 — Aucune décision hors registre.** Toute décision automatique prise pendant un
  Combat correspond à un DecisionPoint enregistré dans la Decision Bible : DP-1 (faits
  simultanés), DP-6.1..6.5 (décisions d'Unit), DP-7 (égalité). Un site de décision du
  module Combat sans DP-n déclaré = défaut fail-hard (concrétisation de DEC-1).
- **CBT-5 — Events de combat dans la liste close, payloads validés.** Tout Event émis par
  le Combat appartient à la liste close (INV-12 — REGISTRE tenu par les Core Rules, P10)
  et son payload est conforme au schéma structurel de la section Événements. Nom hors
  liste OU payload non conforme = échec fail-hard, pas un avertissement.
- **CBT-6 — Étanchéité hors-combat.** Le Combat ne lit ni ne modifie JAMAIS l'état
  hors-combat : Bench, Gold, Pool, Shop, Life, Level. Il produit un `CombatResult` ; SEULE
  la Round Resolution applique les conséquences (QC-1). Corollaire : une Unit ne perd
  jamais de Life pendant un Combat (INV-14).
- **CBT-7 — Zéro Input pendant le Combat.** Le Combat ne consomme aucun Input (application
  d'INV-13 : « aucun Input pendant le Combat »). Les Units décident seules (DP-6).
- **CBT-8 — Symétrie des camps.** La résolution ne distingue pas un snapshot issu d'un
  Board vivant d'un GhostBoard : même TickPipeline, mêmes DP, mêmes Events. Le GhostBoard
  d'entrée reste immuable (INV-17) — le Combat travaille sur des copies.
- **CBT-9 — Pas de hasard en Combat (état actuel).** Aucun DecisionPoint de Combat n'est
  un tirage déclaré : `rng_state` n'est consommé que par DP-3 et DP-5 (DEC-3, ratifié). Le
  module Combat ne lit pas `rng_state`. Introduire un tirage en Combat = gate HumanGate +
  enregistrement au registre (DEC-1/DEC-3).

# Concepts

Termes canoniques employés (tous au Vocabulary) : Combat, Board, GhostBoard, Placement,
Unit, UnitDefinition, UnitInstance, Attack, Ability, Cast, Mana, Damage, Health, Targeting,
Range, Tick, Resolve, Trigger, Effect, Buff, Debuff, Heal, Shield, Aura, Event, Event Log,
TieBreakChain, DecisionPoint.

**Termes NOUVEAUX introduits par cette bible** — ratifiés (gate #3, QB-15) ; leur
inscription au Vocabulary relève de `00_VOCABULARY.md` (mise à jour parallèle, hors de ce
document) : `TickPipeline`, `CombatSetup`, `ResolutionQueue`, `CombatResult`, `Cell`,
`Side`.

- **TickPipeline** — la séquence FIGÉE de phases appliquée à chaque Tick du Combat
  (section Flux, T1–T10). C'est la partie (a) de DP-1 que la Decision Bible délègue ici :
  « l'ordre entre types d'actions au sein d'un Tick appartient à la Combat Bible ».
- **Sémantique hybride du Tick** (ratifié gate #3, QB-4) — le Tick est **séquentiel dans
  son exécution, simultané dans ses effets**. Concrètement : le Tick est une suite de
  PHASES séquentielles ; AU SEIN de chaque phase s'applique le cycle ratifié
  `Intent → Validation → Resolution → Commit` — toutes les Units prennent leurs décisions
  sur le MÊME état (celui du dernier Commit), et les conséquences de la phase sont
  appliquées ENSEMBLE au Commit. Aucun effet de priorité artificiel intra-phase. Cette
  lecture réconcilie QB-4 avec la séquence de fin de Tick QB-5 : `Damage`, `Death`,
  `Cleanup` et `Casts des survivants` sont des PHASES séquentielles distinctes, chacune
  simultanée dans ses effets.
- **CombatSetup** — la séquence d'entrée en Combat, AVANT le premier Tick : instanciation
  des deux snapshots (Spawns), application des Buffs initiaux (V1 : « Début → Buffs
  initiaux » ; ordre ratifié gate #3, QB-12), initialisation du Mana. Section Flux, C1–C3.
- **ResolutionQueue** — la file du cycle de phase : les Intents sont collectés sur le même
  état, validés ensemble (conflits départagés par la TieBreakChain, DP-1(b)), résolus,
  puis commités ENSEMBLE (ratifié gate #3, QB-4). Les Effects déclenchés par Trigger à la
  phase k s'insèrent dans la file de la phase k (cycles supplémentaires Intent → Commit)
  et sont résolus avant l'entrée en phase k+1 ; chaque Effect est borné par son
  `MaxTriggerPerTick` (ratifié gate #3, QB-16).
- **CombatResult** — la valeur de sortie du Combat, consommée par la Round Resolution :
  camp vainqueur, survivants avec Health restante, nombre de Ticks écoulés, mode de
  résolution (élimination ou DP-7). Structure : payload de l'Event Victory (section
  Événements) ; représentation mémoire → Technical Bible.
- **Géométrie du Board — ratifiée** (gate #3, QB-1) : le Board de Combat est une grille
  **ORTHOGONALE** de **Cells** discrètes à coordonnées entières `(x, y)`, **distance
  Manhattan**, **AUCUNE diagonale implicite** ; une Unit au plus par Cell. Les notions V1
  « Première ligne / Deuxième ligne / Arrière / Coins / Centre » s'y projettent
  naturellement, en cohérence avec la clé 3 de la TieBreakChain (QD-1). Les DIMENSIONS du
  Board (et l'orientation des deux camps) sont **v0 = 8×8, miroir** (ratifiées
  `HUMANGATE_2026-07-19_VALUES_V0.md`) — propriétaire Core Rules, valeur provisoire.
- **Distances en Combat** (ratifié gate #3, QB-2) — une métrique UNIQUE, **Manhattan**,
  pour la Range, le déplacement et les tie-breaks (cohérence QD-1). Sens contextuel par
  usage : départage de **cibles** candidates = distance entre la Cell de l'Unit qui décide
  et la Cell de chaque candidate ; départage de **Cells** candidates = distance entre la
  Cell candidate et la Cell de la cible courante ; départage d'**acteurs** d'une même
  phase = distance entre chaque acteur et sa cible courante.
- **Buffs initiaux** (V1) — les Effects appliqués pendant le CombatSetup, avant le premier
  Tick. Leur CONTENU vient du DSL/Content ; leur ORDRE d'application entre sources est
  ratifié (gate #3, QB-12) : `Origin → Class → Items → Temporary`. Les Auras ne relèvent
  PAS des Buffs initiaux : elles sont recalculées au début de chaque Tick (QB-13),
  première évaluation au Tick 1.
- **Mana** (ratifié gate #3, QB-11) — le Mana se remplit UNIQUEMENT par : **attaque**,
  **dégâts reçus**, **effets DSL**. Le crédit « avec le temps » cité dans les notes V1 est
  SUPPRIMÉ — delta V1 assumé (les notes brutes restent inchangées ; le gate prime). À Mana
  plein : Cast automatique (Vocabulary). Retombée du Mana après un Cast : règle due ici,
  proposition « retombe à zéro » maintenue — décision via gate futur, propriétaire :
  Combat Bible (hors périmètre du gate #3, qui ratifiait les sources uniquement).
- **Cadence d'Attack** *(proposé)* — l'Attack est « récurrente » (Vocabulary) ; la forme
  proposée est une cadence exprimée en Ticks entre deux Attacks, déclarée par
  UnitDefinition (valeurs → Content/DSL). Aucune valeur ici.

# Paramètres

AUCUN chiffre nouveau n'est fixé ici. Toute valeur est TBD chez son propriétaire.
Rappel P10 (ratifié gate #3) : cette bible ne définit JAMAIS un coefficient, une formule
ou une constante d'équilibrage — toute valeur de calibrage → Balance Bible.

| Nom | Valeur | Unité | Propriétaire |
|---|---|---|---|
| `tick_limit` (Ticks max d'un Combat) | **v0 = 50, PROVISOIRE** — existence : cette bible (CBT-2) ; valeur : Balance Bible (ratifié gate #3, QB-14 — P10) ; calcul sourcé TFT (40 s max de combat ÷ ~0,8 s/Tick équivalent), ratifié gate `HUMANGATE_2026-07-19_VALUES_V0.md`, calibrable dès les premières simulations (P7) | Ticks | Combat Bible (existence) · Balance Bible (valeur) |
| Dimensions du Board (largeur × profondeur) et orientation des camps | **v0 = 8×8, orientation miroir** (ratifié `HUMANGATE_2026-07-19_VALUES_V0.md`) | Cells | Core Rules (dimensions — Vocabulary « Board ») · Combat Bible (géométrie) |
| Géométrie | **ratifié** : orthogonale, coordonnées entières, aucune diagonale implicite (gate #3, QB-1) | — | Combat Bible (géométrie) |
| Occupation d'une Cell | 1 Unit au plus (modèle orthogonal ratifié — gate #3, QB-1) | Unit/Cell | Combat Bible |
| Métrique de distance (Range, déplacement, clé 3) | **ratifié** : Manhattan unique (gate #3, QB-2) | Cells | Combat Bible (délégation Decision Bible, clé 3) |
| Vitesse de déplacement | TBD | Cells/Tick | Content Bible (valeur par UnitDefinition, via DSL) · Combat Bible (forme) · Balance (calibrage, P10) |
| Cadence d'Attack | TBD | Ticks/Attack | Content Bible (valeurs, via DSL) · Combat Bible (forme) · Balance (calibrage, P10) |
| Mana initial en début de Combat | TBD | Mana | Combat Bible (règle) · Content/DSL (valeurs par UnitDefinition) · Balance (calibrage, P10) |
| Gains de Mana (par Attack / par Damage reçu / par Effect DSL) | sources **ratifiées** (gate #3, QB-11) ; montants TBD | Mana | Combat Bible (moments de crédit) · Content/DSL (montants, données) · Balance (calibrage, P10) |
| Seuil de Mana plein (déclenche le Cast) | TBD | Mana | Content Bible (par UnitDefinition, via DSL) |
| Retombée du Mana après Cast | **ratifié : retombe à zéro** (`HUMANGATE_2026-07-19_VALUES_V0.md`) | — | Combat Bible |
| `total_remaining_power` (clé 1 de DP-7) | **fonction canonique définie par la Balance Bible** — CITÉE ici, jamais définie (ratifié gate #3, QB-7 — P10) | — | Balance Bible |
| `deterministic_order` (clé 3 de DP-7) | **ratifié** : la TieBreakChain, unique, aucun autre ordre (gate #3, QB-8) | — | Decision Bible (QD-1) |
| Garde-fou des cascades d'Effects intra-Tick | **ratifié** : `MaxTriggerPerTick` par Effect, déclaré dans le DSL, VALIDÉ par le Combat (gate #3, QB-16) | Triggers/Tick | DSL Bible (déclaration) · Combat Bible (validation à l'exécution) |

# Points de décision

Le REGISTRE appartient à la Decision Bible (DEC-1) — aucun DP nouveau n'est créé ici.
Cette section spécifie, pour chaque DP délégué au Combat : son ancrage dans le
TickPipeline, ce que le DSL déclare, et le recours à la TieBreakChain. Rappel DEC-5 :
mécanismes ici, AUCUNE valeur.

### DP-1 — Ordre des faits simultanés (part Combat)
- **(a) Entre types d'actions** : l'ordre est le TickPipeline lui-même (section Flux),
  que cette bible fige (CBT-3) — recomposé selon les décisions du gate #3 : QB-3
  (Movement → Targeting → Attack, ordre V1 restauré), QB-5 (Damage → Death → Cleanup →
  Casts des survivants), QB-13 (Auras en tête de Tick), QB-11 (aucun crédit temporel de
  Mana).
- **(b) Entre faits de même type** : sémantique hybride ratifiée (gate #3, QB-4) — la
  TieBreakChain (DEC-4, ordre canonique QD-1) départage les CONFLITS à la Validation du
  cycle de phase et fixe le rang `seq` de chaque Event au Commit ; elle ne confère JAMAIS
  d'avantage d'état (aucun acteur n'agit sur un état plus frais qu'un autre au sein d'une
  phase). L'ordre total reste matérialisé dans l'Event Log par le champ `seq` — rejouable
  et auditable.
- **Sens de la clé 3 (distance Manhattan)** : défini en Concepts (« Distances en
  Combat »), ratifié gate #3, QB-2.

### DP-6.1 — Priorité de cible (Targeting)
- **Déclenchement** : phase T4 du TickPipeline — APRÈS le Movement (ratifié gate #3,
  QB-3 : une Unit choisit sa cible après avoir atteint sa nouvelle position ; l'inversion
  Targeting-avant-Movement proposée dans les versions antérieures de ce document est
  CORRIGÉE). Acquisition initiale, et ré-acquisition pour toute Unit dont la cible est
  morte (« Mort → Nouvelle cible », V1) ou invalide. Une cible est CONSERVÉE tant qu'elle
  est vivante (Health > 0) et valide — pas de ré-évaluation opportuniste à chaque Tick
  (sauf comportement spécial DP-6.5 déclaré) *(dérivé V1)*.
- **Déclaration DSL** : un critère de priorité par UnitDefinition, choisi dans un
  vocabulaire FERMÉ de critères à définir en DSL Bible (exemples purement illustratifs,
  non normatifs : « la plus proche », « Health la plus basse »). Ce critère EST la clé 1
  de la chaîne (« décision stratégique déclarée », QD-1).
- **Dernier recours** : TieBreakChain complète (clé 3 au sens QB-2, ratifié) — deux
  candidates à égalité parfaite sont départagées sans jamais consommer `rng_state`
  (CBT-9).

### DP-6.2 — Distance préférée
- **Nature** : une DONNÉE déclarée, pas une décision en soi — elle paramètre DP-6.1
  (candidates atteignables) et DP-6.3 (position désirée relative à la cible).
- **Déclenchement** : lue à la phase T3 (Movement), et T4 si le critère de Targeting y
  fait appel.
- **Déclaration DSL** : distance préférée par UnitDefinition (en Cells). La cohérence
  Range ↔ distance préférée est vérifiée par le validateur DSL (fail-hard, P8).

### DP-6.3 — Style de déplacement
- **Déclenchement** : phase T3 — toute Unit hors de sa Range (ou hors de sa distance
  préférée, selon ce que son style déclare) choisit UNE Cell et s'y déplace (Event Move),
  relativement à sa cible COURANTE (celle du Targeting précédent). Une Unit SANS cible
  courante ne se déplace pas à ce Tick — elle acquiert sa cible en T4 et se déplacera au
  Tick suivant *(dérivé de l'ordre ratifié QB-3 : le déplacement est relatif à la cible
  courante)*.
- **Déclaration DSL** : un style par UnitDefinition depuis le vocabulaire fermé (DSL
  Bible) ; le style ordonne les Cells candidates.
- **Dernier recours** : TieBreakChain sur les Cells candidates (clé 3 au sens QB-2 :
  distance à la cible courante). Conflits entre Units convoitant la même Cell :
  départagés à la Validation du cycle de phase (ratifié gate #3, QB-4) — la Cell est
  attribuée à l'Unit que la TieBreakChain désigne ; l'intention perdante est invalidée et
  l'Unit ne se déplace pas à ce Tick *(dérivé : aucune seconde décision sur état frais
  intra-phase)*.

### DP-6.4 — « Utilisation des compétences » (V1) — politique de Cast
- **Déclenchement** : phase T9 (Casts des survivants). Le Cast est AUTOMATIQUE à Mana
  plein (Vocabulary) — ce DP ne décide PAS si l'on cast : il sélectionne la cible ou la
  zone de l'Ability. Une Unit morte ne lance JAMAIS son sort (ratifié gate #3, QB-5).
  Attack et Cast au même Tick : CUMULABLES (ratifié gate #3, QB-10).
- **Déclaration DSL** : critères de sélection de cible/zone de l'Ability, vocabulaire
  fermé (DSL Bible).
- **Dernier recours** : TieBreakChain.

### DP-6.5 — Comportement spécial
- **Déclenchement** : aux points d'ancrage du TickPipeline où le Trigger déclaré devient
  vrai (« le Trigger écoute ; l'Event constate » — Vocabulary). Un comportement spécial
  S'INSÈRE dans les phases existantes via la ResolutionQueue ; il ne réordonne JAMAIS le
  TickPipeline (CBT-3) et reste borné par le `MaxTriggerPerTick` de ses Effects (ratifié
  gate #3, QB-16).
- **Déclaration DSL** : comportements du monde fermé (P8), résolus déterministes.
- **Dernier recours** : TieBreakChain pour tout ex æquo interne.

### DP-7 — Résolution d'égalité au `tick_limit`
- **Déclenchement** : phase T10 du Tick numéro `tick_limit`, si aucun camp n'est éliminé.
- **Chaîne ratifiée** (INV-18/QC-6) : `total_remaining_power` puis `units_remaining` puis
  `deterministic_order`. Définitions des trois clés :
  - **`total_remaining_power`** — **fonction canonique définie par la Balance Bible** ;
    cette bible la CITE et ne la définit jamais (ratifié gate #3, QB-7 — P10 : la
    puissance est un concept d'équilibrage, pas de simulation). Contrainte d'interface,
    seule part Combat : la fonction est évaluée UNIQUEMENT sur l'état final du Combat —
    aucune donnée économique ne lui est fournie (CBT-6 préservé).
  - **`units_remaining`** — le NOMBRE d'UnitInstances vivantes (Health > 0) du camp au
    terme du dernier Tick. Définition d'état de simulation pur : propriétaire Combat
    (P10) — aucun coefficient.
  - **`deterministic_order`** — **la TieBreakChain, unique — aucun autre ordre** (ratifié
    gate #3, QB-8). Propriétaire : Decision Bible (QD-1) ; sa dernière clé garantit un
    départage total, donc un vainqueur unique, sans jamais consommer `rng_state` (CBT-9).
- **Sortie** : un vainqueur unique (jamais d'ex æquo résiduel — DEC-2/DEC-4). Le cas
  distinct de l'anéantissement MUTUEL avant `tick_limit` reste un fork séparé : QB-6
  (ratifié 2026-07-19 : match nul, aucune Life perdue — voir Flux T10). DP-7 lui-même ne
  produit jamais de match nul ; seul le fork QB-6 le peut, et uniquement avant `tick_limit`.

# Flux

Ordre d'exécution FIGÉ (CBT-3), recomposé selon les décisions du gate #3. Rappels
globaux : aucun Input (CBT-7), aucun `rng_state` (CBT-9).

**Cycle de phase** (ratifié gate #3, QB-4) — CHAQUE étape ci-dessous (C1–C3, T1–T10) est
une PHASE, et chaque phase applique le cycle :

```text
Intent      — toutes les Units concernées calculent leur intention sur le MÊME état :
              celui du dernier Commit (aucune lecture d'état intermédiaire)
Validation  — les intentions sont validées ENSEMBLE ; les conflits sont départagés par
              la TieBreakChain (DP-1(b)) ; une intention invalidée n'est pas rejouée
Resolution  — les conséquences du lot sont calculées
Commit      — les conséquences sont appliquées ENSEMBLE ; chaque Event du lot reçoit
              son rang `seq`
```

Aucun effet de priorité artificiel intra-phase : la TieBreakChain départage les conflits
et ordonne le log, elle ne donne jamais accès à un état plus frais.

**CombatSetup (avant le premier Tick)** :

```text
C1. Spawns              — instanciation des deux snapshots sur le Board de Combat :
                          un Event Spawn par UnitInstance ; ordre du log : DP-1(b).
                          (Camps indistinguables : Board vivant ou GhostBoard — CBT-8.)
C2. Buffs initiaux      — V1 : « Début → Buffs initiaux ». Ordre d'application RATIFIÉ
                          (gate #3, QB-12) : Origin → Class → Items → Temporary.
                          (Les Auras n'apparaissent pas ici : recalcul en T2 — QB-13.)
C3. Mana initial        — initialisation du Mana de chaque Unit (valeur : Paramètres).
```

**TickPipeline (chaque Tick, T1 → T10)** :

```text
T1.  Début de Tick      — incrément du compteur de Ticks. AUCUN crédit de Mana ici :
                          le crédit « avec le temps » de la V1 est SUPPRIMÉ (ratifié
                          gate #3, QB-11 — delta V1 assumé).
T2.  Auras              — recalculées au DÉBUT de chaque Tick, jamais en continu
                          (ratifié gate #3, QB-13 — étape déplacée en tête du Tick) :
                          application/retrait selon les conditions vraies à cet instant.
T3.  Movement (DP-6.3, guidé par DP-6.2)
                        — ordre V1 RESTAURÉ (ratifié gate #3, QB-3) : le déplacement
                          PRÉCÈDE le Targeting. Toute Unit hors de sa Range choisit une
                          Cell → Event Move ; vitesse en Cells/Tick : TBD (Paramètres).
T4.  Targeting (DP-6.1) — une Unit choisit sa cible APRÈS avoir atteint sa nouvelle
                          position (ratifié gate #3, QB-3 — corrige l'inversion proposée
                          antérieurement). Acquisition/ré-acquisition pour toute Unit
                          sans cible valide (« Mort → Nouvelle cible », V1).
T5.  Attack             — toute Unit dans sa Range, cadence prête → Event Attack sur sa
                          cible (l'Attack constate l'acte ; les points arrivent en T6).
T6.  Damage             — Events Damage des Attacks de T5, appliqués ENSEMBLE au Commit ;
                          crédits de Mana « en attaquant » (attaquant) et « en recevant
                          des dégâts » (cible) au MÊME Commit (ratifié gate #3, QB-11 ;
                          simultanéité : QB-4).
T7.  Death              — toute Unit à Health ≤ 0 → Event Death. Une Unit morte ne lance
                          JAMAIS son sort (ratifié gate #3, QB-5). Triggers « à la mort »
                          (DSL) résolus via la ResolutionQueue au sein de la phase,
                          bornés par MaxTriggerPerTick (QB-16).
T8.  Cleanup            — retrait des UnitInstances mortes du Board ; invalidation des
                          cibles et références qui les visaient (ratifié gate #3, QB-5).
T9.  Casts des survivants (DP-6.4)
                        — toute Unit VIVANTE à Mana plein → Event Cast ; Effects de
                          l'Ability résolus via la ResolutionQueue. Une même Unit peut
                          avoir attaqué en T5 PUIS caster ici (ratifié gate #3, QB-10 :
                          cumulables). Retombée du Mana : retombe à zéro (v0, ratifié
                          `HUMANGATE_2026-07-19_VALUES_V0.md`).
T10. Fin de Tick        — vérifications, dans cet ordre :
                          (1) un camp sans Unit vivante (Health > 0) → Event Victory
                              (élimination) ;
                          (2) les DEUX camps sans Unit vivante (anéantissement mutuel) →
                              MATCH NUL (ratifié QB-6, gate 2026-07-19) : Event Victory
                              émis avec `resolution_kind: "draw"` *(dérivé)*, AUCUNE perte
                              de Life pour aucun des deux Players sur ce round ;
                          (3) compteur = tick_limit sans vainqueur → DP-7 → Event Victory
                              (mode tick_limit).
                          Sinon : Tick suivant (T1).
```

Notes de flux :
- La séquence de fin de Tick est la séquence RATIFIÉE (gate #3, QB-5) :
  `Damage → Death → Cleanup → Casts des survivants` (T6 → T9).
- Aucune passe de Death n'existe après T9 *(séquence ratifiée QB-5)* : une Unit amenée à
  Health ≤ 0 par un Cast voit son Event Death émis à la phase T7 du Tick suivant ; entre
  temps elle n'est ni acteur ni cible valide (Health > 0 requis), et la vérification T10
  ne la compte pas vivante *(dérivé)*.
- La ResolutionQueue garantit qu'AUCUN fait n'est appliqué hors du cycle de phase ; le
  champ `seq` des Events matérialise l'ordre total DP-1 dans le log.
- Les Effects déclenchés par Trigger à la phase k sont résolus avant l'entrée en phase
  k+1 ; leur finitude est GARANTIE par `MaxTriggerPerTick` (ratifié gate #3, QB-16).

# Événements

Vocabulaire FERMÉ (INV-12) — le REGISTRE de la liste close est tenu par les **Core Rules**
(P10, corollaire — `02_CORE_RULES.md`, extension gate #3 intégrée en parallèle) ; cette
bible définit les payloads de SES Events. Le Combat émet exclusivement :
`Spawn, Move, Attack, Cast, Damage, Death, Victory, Heal, Shield, Buff, Debuff` — les
quatre derniers ratifiés gate #3 (QB-9), « pas davantage ».
(`MergeTriggered`/`MergeResolved` appartiennent à la Preparation State — jamais émis en
Combat.)

Payloads STRUCTURELS — des CHAMPS, aucune valeur. Types exacts et encodage → Technical
Bible ; validation fail-hard (CBT-5).

**Enveloppe commune** — champs présents sur tout Event de combat :

```text
{ event,          # nom, liste close (INV-12 — registre : Core Rules)
  combat_ref,     # identifiant du Combat dans le Round (rattache le segment de log)
  tick,           # numéro de Tick (0 = CombatSetup)
  seq }           # rang dans le Tick — matérialise l'ordre total DP-1
```

**Payloads spécifiques (champs en sus de l'enveloppe)** :

- `Spawn`    : `{ unit_instance_id, unit_definition_ref, side_ref, cell, star,
               health_initial, mana_initial }`
  — `side_ref` identifie le camp : `seat_index` du Player, ou référence de GhostBoard
  (`ghost_of_seat_index`) ; forme exacte → Technical Bible.
- `Move`     : `{ unit_instance_id, from_cell, to_cell }`
- `Attack`   : `{ attacker_unit_instance_id, target_unit_instance_id }`
  — l'Attack CONSTATE l'acte ; les points retirés arrivent par l'Event Damage (séparation
  acte/conséquence, nécessaire aux Triggers « à l'Attack »).
- `Cast`     : `{ caster_unit_instance_id, ability_ref, targets | zone }`
  — `targets` : liste d'`unit_instance_id` ; `zone` : ensemble de Cells ; l'un des deux
  selon la forme déclarée de l'Ability (DSL).
- `Damage`   : `{ source_kind (Attack | Ability | Effect), source_ref,
               target_unit_instance_id, amount, target_health_after }`
  — `target_health_after` (proposé) : redondant mais rend le log lisible et auditable
  sans rejouer ; à confirmer avec la Technical Bible.

**Payloads des quatre Events ratifiés gate #3 (QB-9 — « pas davantage »)** :

- `Heal`     : `{ source_kind (Ability | Effect), source_ref, target_unit_instance_id,
               amount, target_health_after }`
  — un gain de Health n'est JAMAIS représenté par un Event Damage.
- `Shield`   : `{ source_kind (Ability | Effect), source_ref, target_unit_instance_id,
               amount }`
  — constate l'octroi d'une protection ; l'articulation exacte Shield ↔ Damage est une
  règle Combat due lors de l'entrée du premier contenu qui l'emploie (gate futur,
  propriétaire : Combat Bible ; montants : données DSL).
- `Buff`     : `{ target_unit_instance_id, source_ref, effect_ref }`
  — constate l'application d'un Effect bénéfique (Buffs initiaux C2, Auras T2,
  Abilities/Effects en Tick) ; catégorisation fine de la source → Technical Bible.
- `Debuff`   : `{ target_unit_instance_id, source_ref, effect_ref }`
  — même structure que `Buff` ; Effect défavorable.
- `Death`    : `{ unit_instance_id, source_ref }`
- `Victory`  : `{ winner_side_ref, resolution_kind (elimination | tick_limit),
               ticks_elapsed, survivors: [ { unit_instance_id, health_remaining } ] }`
  — ce payload EST la matérialisation du `CombatResult` : `survivors` alimente la formule
  V1 des dégâts au Seat (« les dégâts dépendent des survivants + niveau de la manche » —
  formule TBD, propriétaire Core Rules/Economy). Le `resolution_kind` gagne une valeur
  supplémentaire pour l'anéantissement mutuel (ratifié QB-6, gate 2026-07-19 : match nul,
  proposé `"draw"` *(dérivé, nom à confirmer à l'intégration DSL/Technical)*).

Note « pas davantage » (gate #3, QB-9) : ni `ManaChanged`, ni `BuffApplied`/`BuffExpired`
distincts n'existent — les besoins de restitution correspondants sont couverts par
`Buff`/`Debuff` ou assumés absents (jauge de Mana → Human Notes). Toute extension future
de la liste close = gate HumanGate via le registre des Core Rules (INV-12, P10).

# Oracle Hooks

Déterministes, non-LLM (P7) ; consommés par la Oracle Bible. Une vérification par CBT-n.

- **CBT-1** : replay bit à bit — deux exécutions du même couple de snapshots → même
  `CombatResult` et même segment d'Event Log, bit à bit ; exécution sur DEUX machines
  différentes → identique (réutilise le hook INV-19).
- **CBT-2** : property-test — pour tout couple de snapshots généré, le Combat émet un
  Event Victory en ≤ `tick_limit` Ticks. **Fixture d'égalité** (obligatoire) : un couple
  de snapshots construit pour atteindre le `tick_limit` sans élimination → DP-7 s'applique,
  rejouée 2× → même vainqueur (alimente le hook INV-18 des Core Rules).
- **CBT-3** : audit d'architecture — UNE seule implémentation du TickPipeline, aucun
  second chemin de résolution ; fixture d'ordre (golden) : scénario canonique dont la
  séquence attendue des Events (champs `tick`/`seq`, ordre T1→T10) est figée en fixture —
  toute divergence = échec. Inclut une fixture de cascade : un Effect dépassant son
  `MaxTriggerPerTick` déclaré → échec fail-hard du run (QB-16).
- **CBT-4** : audit de registre (partagé avec le hook DEC-1) — tout site de
  sélection/départage du module Combat référence DP-1, DP-6.1..6.5 ou DP-7 ; site sans
  DP-n → échec fail-hard.
- **CBT-5** : validation de schéma de chaque payload de combat — champ manquant, champ
  inconnu, type invalide, ou nom d'Event hors liste close (registre : Core Rules) → échec
  fail-hard du run (réutilise le hook INV-12).
- **CBT-6** : fixture — sérialiser l'état hors-combat (Bench, Gold, Pool, Shop, Life,
  Level de tous les Seats) avant et après un Combat → identique bit à bit ; audit de
  dépendances — le module Combat n'importe aucun type Bench/Gold/Pool/Shop/Life.
- **CBT-7** : fixture — tout Input soumis pendant un Combat est rejeté (réutilise le hook
  INV-13).
- **CBT-8** : fixture — Combat(A, snapshot vivant de B) et Combat(A, GhostBoard au contenu
  identique) → Event Logs identiques bit à bit ; fixture INV-17 (le GhostBoard sérialisé
  avant/après le Combat est identique) réutilisée.
- **CBT-9** : audit — aucun accès à `rng_state` depuis le module Combat (partagé avec
  l'audit DEC-3) ; fixture — le même Combat exécuté avec deux `rng_state` différents →
  même `CombatResult`, même Event Log.

# Simulation Hooks

Ce que le Combat expose aux Campaigns (advisory, jamais gate de merge — P7) :

- **Durée des Combats en Ticks** : distribution par Round et par Match (alimente le
  calibrage du `tick_limit` — valeur : Balance Bible, QB-14 ratifié — et l'objectif
  « combats rapides », V1).
- **Distribution des Damages** (et des Heals/Shields, ratifiés QB-9) : par `source_kind`,
  par UnitDefinition, par Tick — profil temporel d'un Combat.
- **Fréquence des résolutions DP-7** : proportion de Combats conclus au `tick_limit` —
  un taux élevé est un signal design pour Pierre (voir Human Notes), pas un bug.
- **Fréquence des anéantissements mutuels (matchs nuls)** — QB-6 ratifiée (match nul, sans
  perte de Life) ; cette métrique nourrit désormais un signal Balance/Meta (fréquence des
  nuls trop haute/basse), pas une décision de résolution.
- **Courbe de Mana et nombre de Casts** par Combat et par UnitDefinition (sources
  ratifiées QB-11 : Attack, Damage reçu, Effects DSL).
- **Survivants par Combat** (nombre, Health restante) — donnée d'entrée de la formule de
  damage de la Round Resolution (propriétaire Core Rules/Economy).
- **Protocole de mesure « Placement ≈ 30 % »** (objectif V1, propriétaire Meta Bible ;
  protocole détaillé → Simulation Bible). Points de branchement exposés ICI :
  1. **Rejouabilité hors Match** : CBT-1 fait du Combat une fonction pure
     `(snapshot A, snapshot B) → CombatResult` — une Campaign peut donc l'appeler
     directement, sans Match ni économie ;
  2. **Permutation de Placements à armées constantes** : mêmes multisets d'UnitInstances
     (mêmes UnitDefinitions, Stars, Items), seules les positions (Cells) permutées, tout
     le reste constant ;
  3. **Sorties** : `CombatResult` par permutation → part de variance du résultat
     attribuable au Placement seul.
  Échantillonnage, statistique retenue et seuils = Simulation Bible (protocole
  pré-enregistré, jamais de tuning post-hoc — P7).

# DSL Hooks

Le DSL est AUTORISÉ à déclarer, par UnitDefinition (vocabulaire FERMÉ, whitelist P8 —
détail → DSL Bible) :
- les **stats de combat** consommées par cette bible (Health, Range, vitesse de
  déplacement, cadence d'Attack, seuil et gains de Mana par Attack / Damage reçu /
  Effect — la LISTE exacte des stats appartient à la DSL/Content Bible ; cette bible
  n'en consomme que les formes) ;
- l'**Ability** : Triggers + Effects depuis la whitelist de primitives ;
- **`MaxTriggerPerTick` sur CHAQUE Effect** (ratifié gate #3, QB-16) : la DÉCLARATION
  appartient au DSL ; le Combat la VALIDE à l'exécution (garde-fou dur anti-boucle) ;
- les **critères des cinq sous-décisions** DP-6.1..6.5 (priorité de cible, distance
  préférée, style de déplacement, sélection de cible/zone du Cast, comportement spécial),
  depuis le vocabulaire fermé de critères — à définir en DSL Bible.

Le DSL ne peut JAMAIS :
- modifier le **TickPipeline** (ordre, phases, insertion de phases — CBT-3) ;
- toucher la **TieBreakChain** (DEC-4) ni le registre des DP (DEC-1) ;
- émettre un Event hors liste close ni en étendre le vocabulaire (INV-12, registre Core
  Rules, CBT-5) ;
- consommer `rng_state` (CBT-9, DEC-3) ;
- contourner `tick_limit` ou la chaîne DP-7 ;
- omettre `MaxTriggerPerTick` sur un Effect (QB-16 — refus fail-hard du validateur) ;
- lire ou écrire l'état hors-combat (CBT-6).

Obligation de contrat (ratifiée gate #3, QB-16) : chaque Effect porte `MaxTriggerPerTick`
déclaré dans le DSL ; le validateur DSL (oracle fail-hard, P8) refuse tout Effect sans
borne ; le moteur Combat applique la borne à l'exécution — tout dépassement = échec
fail-hard du run, jamais un avertissement. Toute extension du vocabulaire de critères ou
de primitives = gate HumanGate (P8).

# Human Notes

Ce qui reste du ressort de Pierre, hors de portée d'un Oracle :

- **« Le joueur doit comprendre pourquoi il gagne ou perd »** (V1) : l'Oracle prouve le
  déterminisme, pas la lisibilité. Un TickPipeline correct mais illisible à l'écran est un
  échec de design — jugement de playtest, mesures Simulation (Targeting, Damages) à
  l'appui.
- **« Rapides, lisibles, spectaculaires — mais déterministes »** (V1) : le SPECTACULAIRE
  appartient intégralement au Renderer (P2) — rien dans cette bible ne le produit ni ne le
  limite ; changer toutes les animations ne change aucun test. Le FEEL du combat (rythme
  des Ticks à l'écran, poids des coups) = playtest Pierre.
- **DP-7 vécu comme un anticlimax** : un Combat conclu par formule au `tick_limit` est
  mécaniquement correct mais peut être RESSENTI comme volé. Si la fréquence DP-7 monte
  (Simulation Hooks), c'est un signal design — leviers chez Balance (valeur du
  `tick_limit`, calibrage des Damages), décision Pierre, jamais automatique.
- **La géométrie est ratifiée, les dimensions sont v0 = 8×8** (QB-1, `HUMANGATE_2026-07-19_VALUES_V0.md`) :
  « lignes, coins, centre » (V1) doivent rester lisibles sur un écran mobile — la valeur
  reste PROVISOIRE, ajustable par Pierre au playtest si 8×8 ne rend pas bien à l'écran.
- **« Dying breath » — tranché** (gate #3, QB-5) : aucun acte posthume — une Unit morte
  ne lance jamais son sort. Si la dramaturgie manque au playtest, c'est un signal design
  à remonter en gate, pas une règle à contourner.
- **Jauge de Mana non restituable en continu** : « pas davantage » (gate #3, QB-9)
  implique qu'aucun Event `ManaChanged` n'existe ; le Renderer (P2, lecteur d'événements)
  ne peut donc pas afficher une jauge de Mana continue en l'état. Si la lisibilité en
  pâtit au playtest, la demande d'extension passe par le registre des Core Rules
  (INV-12, gate HumanGate).

---

## Décisions ratifiées — récapitulatif (HumanGate 2026-07-18, gate #3 + QB-6 2026-07-19)

Source verbatim : `HUMANGATE_2026-07-18_GATE3.md` (QB-1..16 sauf QB-6) +
`HUMANGATE_2026-07-19_QB6.md` (QB-6, gate dédié). Toutes les décisions sont intégrées
inline dans le corps du document. **Toutes les questions QB-1..16 sont désormais tranchées.**

| ID | Décision ratifiée | Section |
|---|---|---|
| QB-1 | Grille ORTHOGONALE, coordonnées entières, distance Manhattan, AUCUNE diagonale implicite ; dimensions/orientation → TBD Paramètres (propriétaire Core Rules, gate futur) | Concepts, Paramètres |
| QB-2 | Métrique UNIQUE Manhattan (Range, déplacement, clé 3) + sens contextuels par usage | Concepts, DP-1 |
| QB-3 | Ordre V1 restauré : `Movement → Targeting → Attack` — la cible est choisie APRÈS la nouvelle position (corrige l'inversion proposée) | Flux T3–T5, DP-6.1 |
| QB-4 | Sémantique HYBRIDE : Tick séquentiel dans l'exécution, simultané dans les effets — phases séquentielles, cycle `Intent → Validation → Resolution → Commit` par phase, décisions sur le même état, conséquences commitées ensemble | Concepts, Flux, DP-1 |
| QB-5 | Fin de Tick : `Damage → Death → Cleanup → Casts des survivants` — une Unit morte ne lance JAMAIS son sort | Flux T6–T9, DP-6.4 |
| QB-6 | Anéantissement mutuel au même Tick → **MATCH NUL** : aucune perte de Life pour aucun des deux Players (ratifié gate dédié 2026-07-19, `HUMANGATE_2026-07-19_QB6.md` — non couverte par le verbatim du gate #3) | Flux T10, DP-7 |
| QB-7 | `total_remaining_power` = fonction canonique définie par la Balance Bible — CITÉE ici, jamais définie (P10) | DP-7, Paramètres |
| QB-8 | `deterministic_order` = la TieBreakChain, unique, aucun autre ordre | DP-7, Paramètres |
| QB-9 | Events étendus : `Heal`, `Shield`, `Buff`, `Debuff` — « pas davantage » ; registre de la liste close : Core Rules (P10) | Événements |
| QB-10 | Attack PUIS Cast au même Tick : cumulables | Flux T5/T9, DP-6.4 |
| QB-11 | Mana : attaque, dégâts reçus, effets DSL — UNIQUEMENT ; crédit « avec le temps » supprimé (delta V1 assumé) | Concepts, Flux T1/T6, Paramètres |
| QB-12 | Buffs initiaux : `Origin → Class → Items → Temporary` | Concepts, Flux C2 |
| QB-13 | Auras recalculées au DÉBUT de chaque Tick, jamais en continu | Flux T2 |
| QB-14 | La Combat Bible définit l'EXISTENCE du `tick_limit` ; sa VALEUR appartient à Balance | Invariants CBT-2, Paramètres |
| QB-15 | Termes nouveaux ratifiés — inscription au Vocabulary (mise à jour parallèle de `00_VOCABULARY.md`) | Concepts |
| QB-16 | Chaque Effect déclare `MaxTriggerPerTick` dans le DSL ; le Combat le VALIDE (garde-fou anti-boucle) | DSL Hooks, Flux, Paramètres |

Points DIFFÉRÉS à un gate futur, propriétaire assigné (hors périmètre du gate #3 et du gate
QB-6 du 2026-07-19) : dimensions et orientation du Board (Core Rules) ; retombée du Mana
après Cast (« retombe à zéro » proposé — Combat Bible) ; articulation Shield ↔ Damage
(Combat Bible, avec la DSL Bible) ; valeurs de tous les Paramètres TBD (propriétaires en
table, calibrage Balance — P10) ; nom exact du `resolution_kind` du match nul (proposé
`"draw"`, détail structurel à confirmer à l'intégration DSL/Technical, pas un fork de design).

*Fin du document — Combat Bible. Statut : DRAFT — décisions gate #3
(`HUMANGATE_2026-07-18_GATE3.md`) et QB-6 (`HUMANGATE_2026-07-19_QB6.md`) intégrées ;
ratification finale du document pending. Les
invariants CBT-1..9 et le TickPipeline ne deviennent contrat moteur qu'après cette
ratification.*
