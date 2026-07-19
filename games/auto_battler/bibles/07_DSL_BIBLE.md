# DSL Bible — Auto Battler

**Date** : 2026-07-18
**Source** : session Pierre × Claude (Fable 5) — dérivée de `00_ARCHITECTURE.md` (RATIFIÉ — P5 : DSL = contraintes de création ; P8 : monde fermé ; P9 : pipeline de contenu ; P10 : le DSL possède les DONNÉES, jamais une règle), de `00_VOCABULARY.md` (74 termes — DSL, Effect, Trigger, MaxTriggerPerTick, UnitDefinition, Trait, Synergy, Threshold, Item, Ability, Rarity, Oracle), de `02_CORE_RULES.md` (registre unique des 19 Events, INV-12, INV-13, INV-19), de `03_DECISION_BIBLE.md` (DP-6.1..6.5, TieBreakChain clé 1 = décision stratégique déclarée, DEC-3, DSL Hooks), de `04_COMBAT_BIBLE.md` (DSL Hooks — stats, Ability, critères, MaxTriggerPerTick ; Events Heal/Shield/Buff/Debuff), de `05_ECONOMY_BIBLE.md` (DSL Hooks — Rarity), de `06_META_BIBLE.md` (objectifs — seuils TBD, QM-n pending) et de `HUMANGATE_2026-07-18_FOUNDATION.md`, `HUMANGATE_2026-07-18_DECISIONS.md`, `HUMANGATE_2026-07-18_GATE3.md` (verbatim, jamais réécrits — gate #3 : QB-16 MaxTriggerPerTick obligatoire, P10)
**Statut** : DRAFT — ratification Pierre pending
**Gabarit** : `00_TEMPLATE.md` (11 sections, ordre figé) · **Termes** : `00_VOCABULARY.md`

Note de séquencement (gate #3, verbatim) : Pierre demandait de terminer la Meta Bible avant
de concevoir le DSL, « car elle fixe les budgets et les objectifs qui guideront ensuite la
conception du DSL et du contenu ». La Meta Bible (`06_META_BIBLE.md`) est écrite (DRAFT,
QM-n pending) : ce document fixe donc le CONTRAT (schémas, invariants, cycle de vie) et
laisse **toutes les valeurs de budgets TBD** en attendant la ratification Meta (QM-n) puis
Balance (P10). Aucune primitive n'est décidée ici : candidates proposées + question.

---

# Objectif

Cette bible est **LE CONTRAT entre les générateurs de contenu et le moteur**. Le DSL décrit
le CONTENU du jeu — UnitDefinitions, Traits/Synergies, Abilities, Items, Effects — dans un
**langage déclaratif fermé** (P8) : une whitelist de primitives, aucune échappatoire vers du
code arbitraire.

Le circuit est asymétrique et c'est sa raison d'être :
- le **générateur** (humain, outil ou LLM) produit des documents DSL — il ne touche JAMAIS
  le moteur ;
- le **validateur DSL** (un Oracle : déterministe, non-LLM, fail-hard — Vocabulary, P8) les
  vérifie ;
- le **moteur** les interprète — et lui seul.

Un générateur peut donc être n'importe quoi, y compris un LLM : la sûreté ne vient pas de
la confiance dans le générateur, elle vient du monde fermé et du validateur (P8). C'est le
mécanisme concret de la LiveOps PASSIVE : une saison = fichiers DSL nouveaux + fixtures
d'oracle, zéro changement moteur.

Elle gouverne :
- la **grammaire** du contenu déclarable (schémas des UnitDefinitions, Traits/Synergies,
  Abilities, Items, Effects, Triggers — section Concepts) ;
- la **whitelist de primitives** et son régime d'extension (gate HumanGate — P8) ;
- les **contraintes de création** (P5) : les budgets qui bornent tout document DSL
  (schémas ici, valeurs TBD — section Paramètres) ;
- le **validateur DSL** : ce qu'il vérifie, fail-hard (section Oracle Hooks) ;
- le **cycle de vie** du contenu, de la génération à l'intégration versionnée (section Flux).

Elle ne gouverne PAS (P10 — « le DSL ne définit jamais une règle ») :
- les **règles** du jeu : invariants, boucle, résolution du Combat, mécanismes de décision
  → Core Rules, Combat Bible, Decision Bible — le DSL déclare des données DANS leur cadre ;
- les **valeurs d'équilibrage** (coefficients, formules, constantes — y compris les valeurs
  finales des budgets de création) → Balance Bible (P10) ;
- les **objectifs** dont les budgets dérivent (cycle P9 : Méta cible → Budgets) → Meta
  Bible ;
- les **instances de contenu** elles-mêmes (les unités, objets et synergies réels du jeu,
  écrits CONTRE cette bible et la Meta) → Content Bible ;
- le **format machine définitif** (types exacts, encodage, structures mémoire) → Technical
  Bible — cette bible fixe des schémas STRUCTURELS (champs), pas des représentations.

# Invariants

Chaque invariant est falsifiable ; vérification mécanique en Oracle Hooks.

- **DSL-1 — Monde fermé.** Tout document DSL n'emploie que des primitives de la whitelist
  (P8). Toute primitive hors liste = **rejet fail-hard** du validateur, jamais un
  avertissement. Corollaire : la grammaire ne contient AUCUN constructeur d'exécution —
  pas de script, pas d'expression évaluée, pas d'échappatoire vers du code arbitraire.
- **DSL-2 — Nouvelle primitive = gate HumanGate.** Toute extension de la whitelist
  (primitive d'Effect, critère de décision, forme de Trigger) agrandit la surface du moteur
  (P8) : elle exige une ratification HumanGate datée. Une whitelist modifiée sans référence
  de gate = défaut.
- **DSL-3 — MaxTriggerPerTick obligatoire.** Tout Effect déclaré porte `MaxTriggerPerTick`
  (QB-16 — ratifié gate #3, `HUMANGATE_2026-07-18_GATE3.md`). Le validateur refuse
  fail-hard tout Effect sans borne ; le moteur Combat applique la borne à l'exécution
  (Combat Bible, DSL Hooks — « obligation de contrat »).
- **DSL-4 — Events du registre uniquement.** Un document DSL ne peut RÉFÉRENCER (Triggers,
  mapping des primitives) que des noms d'Events du registre unique tenu par les Core Rules
  (INV-12, P10 — liste close de 19 noms). Toute référence hors registre = rejet fail-hard.
- **DSL-5 — Tout contenu DSL est versionné.** Tout document DSL porte un identifiant de
  version ; toute modification de contenu change la version (analogue d'ECO-4) ; tout
  Match et toute Campaign consignent la version du contenu employé.
- **DSL-6 — Aucun état hors GameState.** Une déclaration DSL ne peut ni créer ni référencer
  un état hors du triplet autorisé par INV-19 (GameState, EventLog, DSL déclaré).
  L'interprétation d'un document DSL n'écrit que dans le GameState.
- **DSL-7 — Budgets vérifiés par le validateur.** Tout document DSL respecte les budgets de
  création (section Paramètres). Dès ratification des valeurs (Meta → Balance, P10), tout
  dépassement = rejet fail-hard ; tant que les valeurs sont TBD, le validateur vérifie la
  PRÉSENCE et la forme des champs budgétés (contrôle de schéma).
- **DSL-8 — Aucun aléatoire propre.** La grammaire DSL ne contient aucune construction de
  tirage : une déclaration ne peut ni consommer `rng_state` ni exprimer une probabilité
  d'effet. Le hasard du jeu reste confiné aux tirages déclarés du registre — DP-3 (Pairing)
  et DP-5 (Shop) — et à eux seuls (DEC-3 ; le module Combat ne lit pas `rng_state`, CBT-9).

# Concepts

Termes canoniques employés (tous au Vocabulary) : DSL, UnitDefinition, UnitInstance, Trait,
Origin, Class, Synergy, Threshold, Item, Ability, Effect, Trigger, Aura, MaxTriggerPerTick,
Rarity, Event, Oracle, GameState. Cette bible n'introduit aucun terme canonique nouveau ;
les notions de travail décrites en prose ci-dessous (« document DSL », « primitive »,
« whitelist ») devront recevoir leurs identifiants canoniques au Vocabulary avant emploi
dans une autre bible — règle n° 2, pas de terme fantôme `[QUESTION → Pierre]` (QL-7).

Les schémas ci-dessous sont STRUCTURELS et ILLUSTRATIFS : des champs, aucune valeur ; les
noms de champs exacts seront fixés avec le format concret `[QUESTION → Pierre]` (QL-1 —
YAML vs JSON ; identifiants canoniques en anglais, Q1) et la Technical Bible.

### Document DSL

L'unité de livraison du contenu : un fichier déclaratif validé et versionné (DSL-5), qui
contient des UnitDefinitions, des Synergies et des Items. Un document DSL est une DONNÉE :
il ne contient ni règle, ni formule, ni code (P10, DSL-1).

### UnitDefinition (schéma déclaratif)

```text
UnitDefinition:
  id                    # identité stable (anglais — Q1) ; le modèle, jamais l'occurrence
                        #   (UnitDefinition ≠ UnitInstance — ratifié HumanGate 2026-07-18)
  name                  # nom affiché (contenu — Content Bible)
  rarity                # Rarity déclarée (Economy Bible, DSL Hooks — lue par les tables
                        #   d'odds et de coûts ; attribution : Content)
  traits                # les Traits portés : 1+ Origin, 1+ Class (V1) — étiquettes
                        #   comptées pour l'activation des Synergies (Vocabulary)
  stats                 # stats de base : CHAMPS SANS VALEURS — candidats cités par la
                        #   Combat Bible (DSL Hooks) : Health, Range, vitesse de
                        #   déplacement, cadence d'Attack, Mana initial, seuil de Mana
                        #   plein, gains de Mana (par Attack / Damage reçu / Effect).
                        #   Liste exacte et complétude : QL-6 [QUESTION → Pierre]
  ability               # UNE Ability (Vocabulary : « la compétence d'une Unit ») —
                        #   schéma ci-dessous ; nombre max : budget (Paramètres)
  decision_criteria     # les critères déclarés des cinq sous-décisions DP-6.1..6.5,
                        #   choisis dans le vocabulaire FERMÉ de critères (QL-3) :
                        #     targeting_priority   (DP-6.1) — devient la CLÉ 1 de la
                        #                          TieBreakChain : « décision stratégique
                        #                          déclarée » (QD-1)
                        #     preferred_distance   (DP-6.2) — en Cells ; cohérence
                        #                          Range ↔ distance vérifiée par le
                        #                          validateur (Combat Bible, fail-hard)
                        #     movement_style       (DP-6.3)
                        #     cast_selection       (DP-6.4) — cible/zone de l'Ability
                        #     special_behavior     (DP-6.5) — monde fermé (P8)
```

### Trait / Synergy (schéma déclaratif)

Un Trait est une étiquette (Origin ou Class — Q5) ; une Synergy attache des Effects à des
Thresholds sur le comptage d'un Trait :

```text
Synergy:
  trait                 # le Trait compté (Origin ou Class)
  thresholds            # paliers STRICTEMENT croissants ; les Effects n'existent QU'AUX
                        #   paliers — rien entre deux Thresholds, jamais de bonus
                        #   linéaire (INV-11 ; structure imposée par le schéma)
    - count             # valeur du palier (donnée Content — TBD)
      effects           # les Effects du palier (souvent des Buffs — Vocabulary)
```

### Item (schéma déclaratif)

```text
Item:
  id, name
  effects               # Effects portés par l'Unit équipée (Vocabulary : « ses effets
                        #   sont des Effects définis en DSL ») ; l'exigence V1 — un Item
                        #   « doit modifier les décisions du joueur, pas seulement les
                        #   statistiques » — est un jugement de design : Human Notes
```

### Ability (schéma déclaratif)

```text
Ability:
  id, name
  cast                  # le déclenchement n'est PAS déclarable : Cast automatique à
                        #   Mana plein (Vocabulary ; DP-6.4 ne décide pas SI l'on cast)
  target_selection      # critère de sélection de cible/zone (DP-6.4, vocabulaire fermé)
  effects               # composition d'Effects — profondeur bornée (budget, Paramètres)
```

### Effect (schéma déclaratif) et primitives candidates

```text
Effect:
  primitive             # ∈ whitelist (DSL-1) — liste initiale : QL-2 [QUESTION → Pierre]
  params                # champs de la primitive (cible, montant…) — montants : données
                        #   Content ; calibrage : Balance (P10)
  trigger               # si Effect déclenché : grammaire des Triggers (QL-4) ;
                        #   absent pour un Effect appliqué directement par une Ability
  max_trigger_per_tick  # OBLIGATOIRE sur CHAQUE Effect (DSL-3, QB-16)
  aura_condition        # forme Aura : condition spatiale ou d'appartenance sous laquelle
                        #   l'Effect est appliqué/retiré (Vocabulary — Aura : « DSL
                        #   (définition) » ; recalcul en T2 : Combat, QB-13) — la forme
                        #   déclarative exacte appartient à la grammaire (QL-4)
```

**Primitives d'Effect candidates** — mappées une pour une sur les Events d'effet ratifiés
du registre (QB-9, « pas davantage ») ; AUCUNE n'est décidée ici, la liste initiale EXACTE
est une question `[QUESTION → Pierre]` (QL-2) :

| Primitive candidate | Event du registre visé (Core Rules) | Statut |
|---|---|---|
| Damage | `Damage` | candidate |
| Heal | `Heal` | candidate |
| Shield | `Shield` | candidate |
| Buff | `Buff` | candidate |
| Debuff | `Debuff` | candidate |

Exclusions explicites (non candidates sans gate) :
- **invocation** (Units créées par des Effects, Event `Spawn`) : aucun mécanisme défini —
  ses décisions devraient d'abord être enregistrées au registre (Decision Bible, note de
  périmètre, DEC-1) et son rapport à l'inventaire du Pool déclaré (Economy, ECO-1) ;
- **primitives économiques** : le DSL ne peut pas toucher Gold, odds, Pool, Bench (Economy
  Bible, DSL Hooks — seule la Rarity est déclarable) ;
- **Move / Attack / Cast** : des actes du moteur (TickPipeline), jamais des Effects.

### Trigger (grammaire des déclencheurs)

« Le Trigger écoute ; l'Event constate » (Vocabulary). Formes candidates, tirées des
exemples du Vocabulary et des entrées existantes — la grammaire exacte est une question
`[QUESTION → Pierre]` (QL-4) :

- **sur Event** : « à la mort » (`Death`), « à l'Attack » (`Attack`), « au Cast »
  (`Cast`) — toute forme sur Event ne peut référencer que le registre (DSL-4) ;
- **sur état** : « au seuil de Health » — toute forme sur état ne lit que le GameState
  (DSL-6/INV-19) ;
- **sur Synergy** : « au Threshold atteint » ;
- **continue** : condition d'Aura (spatiale ou d'appartenance), recalculée en T2 (QB-13).

Contraintes déjà ratifiées, quelle que soit la grammaire retenue : tout Effect déclenché
s'insère dans la ResolutionQueue de la phase courante sans réordonner le TickPipeline
(CBT-3, DP-6.5) et reste borné par son `MaxTriggerPerTick` (QB-16).

### Validateur DSL

L'oracle de cette bible : **déterministe, non-LLM, fail-hard** (P8 ; Vocabulary, entrée
Oracle : « le validateur DSL est lui-même un Oracle »). Il s'exécute AVANT toute
interprétation par le moteur ; un document qui ne passe pas n'existe pas pour le moteur.
Ses contrôles sont énumérés en Oracle Hooks.

# Paramètres

**Les budgets de création** (P5 : « DSL Bible = contraintes de création »). SCHÉMA
seulement : **toutes les valeurs sont TBD** — leur dérivation suit le cycle P9 (Méta cible
→ Budgets) à partir des objectifs de la Meta Bible (QM-n pending) ; les constantes finales
sont possédées par la Balance Bible (P10). Rien n'entre en vigueur sans ratification Pierre
`[QUESTION → Pierre]` (QL-5).

| Nom | Valeur | Unité | Propriétaire |
|---|---|---|---|
| Nombre max d'Abilities par UnitDefinition | TBD | Abilities | schéma : DSL Bible · dérivation : Meta (P9) · valeur : Balance (P10) |
| Coût de création max par Ability (unité de coût à définir avec la grammaire — QL-5) | TBD | — | schéma : DSL Bible · dérivation : Meta (P9) · valeur : Balance (P10) |
| Complexité max d'un document DSL (mesure à définir avec la grammaire — QL-5) | TBD | — | schéma : DSL Bible · dérivation : Meta (P9) · valeur : Balance (P10) |
| Profondeur max de composition d'Effects | TBD | niveaux | schéma : DSL Bible · dérivation : Meta (P9) · valeur : Balance (P10) |
| Nombre de Traits par UnitDefinition (1+ Origin, 1+ Class — V1 ; maximum TBD) | TBD | Traits | schéma : DSL Bible · valeur : Balance (P10) |
| Nombre max de Thresholds par Synergy | TBD | paliers | schéma : DSL Bible · valeurs des paliers : Content |
| Plage admissible de `MaxTriggerPerTick` (borne déclarée par Effect — DSL-3) | TBD | triggers/Tick | schéma : DSL Bible · valeur : Balance (P10) · validation à l'exécution : Combat (QB-16) |
| Identifiant de version d'un document DSL | requis (DSL-5) | — | schéma : DSL Bible · format exact : Technical Bible |
| Format concret des documents (YAML vs JSON) | TBD `[QUESTION → Pierre]` (QL-1) | — | DSL Bible (via gate) · encodage : Technical Bible |

# Points de décision

**Néant** — le DSL déclare, il ne décide pas. Justification :

- aucun choix automatique du moteur n'est effectué par cette bible : les critères déclarés
  en DSL (DP-6.1..6.5) ALIMENTENT les DecisionPoints de la Decision Bible — la décision
  elle-même reste au moteur, enregistrée au registre (DEC-1), départagée par la
  TieBreakChain (DEC-4) dont le critère déclaré est la clé 1 (QD-1) ;
- le **validateur** ne décide rien non plus : accepter ou refuser un document n'est pas un
  choix parmi des candidats mais l'application d'un prédicat déterministe fail-hard —
  même document, même verdict, toujours ;
- si une évolution future donnait au DSL un pouvoir de CHOIX (ex. une primitive
  conditionnelle exigeant un arbitrage du moteur), ses décisions devraient être
  enregistrées dans la Decision Bible AVANT implémentation (DEC-1, fail-hard) et
  l'extension de grammaire passerait par un gate (DSL-2).

# Flux

**Cycle de vie du contenu** (le générateur ne touche jamais le moteur ; le contenu s'écrit
CONTRE la Meta et les budgets — P9) :

```text
Génération              (générateur — humain, outil ou LLM — produit des documents DSL ;
                         AUCUN accès au moteur ; s'appuie sur Meta cible + budgets — P9)
  → Validation          (validateur DSL — oracle fail-hard, non-LLM : whitelist DSL-1,
                         schémas, MaxTriggerPerTick DSL-3, Events ∈ registre DSL-4,
                         budgets DSL-7, versionnage DSL-5 ; échec → retour génération,
                         rien n'atteint le moteur)
  → Fixtures jointes    (fixtures d'oracle accompagnant le contenu candidat — la Oracle
                         Bible consomme contenu + fixtures ensemble)
  → Simulation          (Campaigns sur contenu candidat — ADVISORY, jamais un gate de
                         merge ; protocoles pré-enregistrés — P7 ; voir Simulation Hooks)
  → Gate HumanGate      (Pierre ratifie le contenu — merge / reject / freeze ;
                         jamais un agent, jamais une Campaign)
  → Intégration         (versionnée — DSL-5 : le contenu entre avec son identifiant de
                         version ; Matchs et Campaigns consignent la version employée)
  → LiveOps PASSIVE     (une saison = fichiers DSL nouveaux + fixtures oracle,
                         ZÉRO changement moteur — P8)
```

**Frontière d'exécution** (rappel du circuit, P8) :

```text
Générateur → document DSL → Validateur (fail-hard) → moteur (interprétation)
                                  │
                                  └── rejet = le document n'existe pas pour le moteur
```

# Événements

**Néant** — le DSL n'émet rien. Justification :

- un document DSL est une DONNÉE : il ne s'exécute pas, il est interprété par le moteur ;
  ce sont les actes du moteur (Resolve des Effects, Combat, transactions) qui émettent les
  Events, tous du registre unique tenu par les Core Rules (INV-12, P10) ;
- le DSL **RÉFÉRENCE** des Events (Triggers « sur Event », mapping des primitives
  d'Effect) — il n'en possède aucun nom ni aucun payload (P10 : les payloads appartiennent
  aux bibles propriétaires — Combat, Economy, Decision, Core Rules) ;
- le validateur DSL est un outil hors moteur : ses verdicts sont des sorties d'oracle
  (`software_verdict`), pas des Events de simulation ;
- si un contenu exigeait un jour un Event nouveau, la demande suivrait la règle INV-12
  (Vocabulary + bible propriétaire + gate HumanGate) — et le propriétaire n'en serait
  jamais cette bible.

# Oracle Hooks

Le validateur DSL EST l'oracle de cette bible (déterministe, non-LLM, fail-hard — P7/P8) ;
ses contrôles sont consommés par la Oracle Bible. Une vérification par invariant :

- **DSL-1 (whitelist)** : fixture — document employant une primitive hors whitelist →
  rejet fail-hard ; audit d'architecture — l'interpréteur du moteur n'implémente QUE les
  primitives de la whitelist et n'offre aucun chemin d'évaluation de code depuis un
  document DSL (aucun eval, aucun plugin, aucune échappatoire).
- **DSL-2 (extension = gate)** : audit documentaire — tout diff de la whitelist référence
  un gate HumanGate daté ; une entrée sans référence de gate = défaut fail-hard.
- **DSL-3 (MaxTriggerPerTick)** : fixture — document contenant un Effect sans
  `MaxTriggerPerTick` → rejet fail-hard (QB-16) ; recoupe le hook CBT-3 de la Combat Bible
  (dépassement de la borne à l'exécution → échec fail-hard du run).
- **DSL-4 (Events du registre)** : fixture — document dont un Trigger ou une primitive
  référence un nom d'Event hors registre → rejet fail-hard (réutilise le hook INV-12).
- **DSL-5 (versionnage)** : audit de schéma — tout document porte un identifiant de
  version ; toute modification de contenu sans changement de version = défaut fail-hard
  (analogue du hook ECO-4).
- **DSL-6 (aucun état hors GameState)** : audit de grammaire — aucun constructeur d'état
  dans le schéma ; audit d'architecture — l'interprétation d'un document n'écrit que dans
  le GameState (recoupe le hook INV-19 : toute fonction de décision ne lit que GameState,
  EventLog, DSL déclaré).
- **DSL-7 (budgets)** : contrôle de schéma — les champs budgétés sont présents et bien
  formés ; dès ratification des valeurs (QL-5), fixture — document dépassant un budget
  (ex. profondeur de composition d'Effects trop grande) → rejet fail-hard.
- **DSL-8 (aucun aléatoire)** : audit de grammaire — aucune construction de tirage ni de
  probabilité dans le schéma ; audit d'architecture — l'interpréteur DSL n'accède jamais à
  `rng_state` (recoupe les audits DEC-3 et CBT-9).
- **Thresholds non linéaires** : fixture — Synergy déclarée avec des paliers non
  strictement croissants, ou avec un effet hors palier → rejet fail-hard (le schéma
  matérialise INV-11 côté déclaration ; le hook INV-11 des Core Rules le vérifie côté
  exécution).
- **Cohérences internes** : fixture — UnitDefinition dont la distance préférée est
  incohérente avec sa Range → rejet fail-hard (contrôle dû à la Combat Bible, DP-6.2) ;
  critère de décision hors du vocabulaire fermé → rejet fail-hard (DSL-1 appliqué aux
  critères).
- **Property-test d'interprétabilité** : tout document DSL VALIDE (accepté par le
  validateur) est interprétable sans erreur par le moteur — générer des documents valides,
  les charger, dérouler un Combat de fixture : aucune erreur d'interprétation, aucun Event
  hors registre, aucune violation de borne. Un document valide ininterprétable = défaut
  fail-hard du COUPLE validateur+moteur (le contrat est cassé d'un côté ou de l'autre).

# Simulation Hooks

Ce que le contenu DSL expose aux Campaigns (advisory, jamais gate de merge — P7) :

- **Contenu candidat simulable AVANT ratification** : tout document DSL validé (mais non
  encore ratifié) peut être chargé comme fixture de contenu candidate dans une Campaign —
  c'est l'étape Simulation du cycle de vie (Flux) qui informe le gate HumanGate. Protocoles
  pré-enregistrés, versions de contenu ET de BotPolicies consignées (META-4, DSL-5).
- **Usage réel des primitives et des critères déclarés** : fréquence d'emploi de chaque
  primitive d'Effect et de chaque critère du vocabulaire fermé dans les Combats simulés —
  une primitive ou un critère jamais employé est un signal design (poids mort de la
  whitelist), lecture Pierre.
- **Déclenchements vs bornes** : distribution des déclenchements d'Effects par Tick,
  rapportée aux `MaxTriggerPerTick` déclarés — des bornes jamais approchées ou toujours
  saturées informent le calibrage (valeurs : Balance).
- **Complexité observée** : distribution de la profondeur de composition d'Effects et de
  la taille des documents du contenu candidat — alimente la dérivation des budgets
  (Meta, P9) avant leur ratification (QL-5).
- **Alimentation des objectifs Meta** : les Campaigns sur contenu candidat produisent les
  mesures des OBJ-n de la Meta Bible (notamment OBJ-9 — toutes les UnitDefinitions
  jouables) ; lecture → Meta Bible, jugement → Pierre.

# DSL Hooks

**Auto-référence — cette bible EST le contrat.** La section existe par gabarit
(`00_TEMPLATE.md` : « ce que le DSL est AUTORISÉ à modifier dans ce système ») ; pour la
DSL Bible elle-même, la réponse est un renvoi : le DSL ne peut pas modifier son propre
contrat — grammaire, whitelist, budgets et validateur sont fermés au contenu, et toute
extension passe par un gate HumanGate (DSL-2, P8).

La surface totale autorisée au DSL est l'UNION des sections DSL Hooks des autres bibles
(récapitulatif de renvois — aucune autorisation nouvelle ici) :

| Bible | Ce que le DSL est autorisé à déclarer |
|---|---|
| Core Rules | Néant — fermée (aucune primitive ne touche un invariant core) |
| Decision | les VALEURS des cinq sous-décisions DP-6.1..6.5, depuis le vocabulaire fermé de critères (défini ici — QL-3) |
| Combat | les stats de combat (formes), l'Ability (Triggers + Effects), `MaxTriggerPerTick` sur chaque Effect, les critères DP-6.1..6.5 |
| Economy | la Rarity d'une UnitDefinition — rien d'autre |
| Meta | Néant — la Meta ne touche pas au DSL et réciproquement |

# Human Notes

Ce qui reste du ressort de Pierre, hors de portée du validateur :

- **La lisibilité du contenu généré.** Le validateur prouve qu'une Ability est VALIDE ;
  il ne prouve pas qu'un joueur qui la lit la COMPREND. « Le joueur doit comprendre
  pourquoi il gagne ou perd » (V1) s'applique au contenu : une Ability à la composition
  correcte mais au comportement opaque est un échec de design — jugement de playtest,
  mesures Simulation (usage, déclenchements) à l'appui.
- **Budgets verts ≠ contenu sobre.** Un document peut respecter tous les budgets et rester
  illisible (empilement d'Effects, Triggers en chaîne). La densité ACCEPTABLE de complexité
  est un jugement de Pierre — les budgets bornent, ils ne garantissent pas l'élégance.
- **Les Items doivent changer les DÉCISIONS.** L'exigence V1 — un Item « doit modifier les
  décisions du joueur, pas seulement les statistiques » — n'est pas vérifiable par le
  validateur (qui ne voit que la forme) : c'est un critère de review de contenu au gate,
  mesures de Campaign en appui (divergence de politiques — OBJ-E1).
- **Le naming du contenu généré.** Les identifiants sont canoniques et stables (Q1) ; les
  NOMS affichés (unités, objets, capacités) portent le ton du jeu — un générateur peut
  produire des noms valides et sans saveur. Relecture humaine avant ratification.
- **Un monde fermé se cultive.** Chaque primitive ajoutée (DSL-2) agrandit pour toujours la
  surface du moteur et de ses oracles : la parcimonie de la whitelist est une décision de
  design récurrente de Pierre, pas une contrainte technique.

---

## Questions ouvertes — récapitulatif `[QUESTION → Pierre]`

Aucun chiffre n'a été inventé dans ce document ; aucune primitive n'y est décidée. Chaque
QL-n attend une ratification HumanGate.

| Id | Question |
|---|---|
| QL-1 | Format concret des documents DSL : YAML ou JSON ? (identifiants canoniques anglais — Q1 ; encodage et types exacts → Technical Bible) |
| QL-2 | Liste EXACTE des primitives d'Effect initiales — candidates proposées : Damage, Heal, Shield, Buff, Debuff, mappées une pour une sur les Events ratifiés (QB-9) ; en manque-t-il, en faut-il moins ? |
| QL-3 | Vocabulaire fermé des critères de décision (les cinq familles DP-6.1..6.5) — exemples illustratifs cités par la Combat Bible : « la plus proche », « Health la plus basse » ; liste initiale à ratifier |
| QL-4 | Grammaire des Triggers — formes candidates : sur Event (« à la mort », « à l'Attack », « au Cast »), sur état (« au seuil de Health »), sur Synergy (« au Threshold atteint »), condition d'Aura ; forme déclarative exacte à ratifier |
| QL-5 | Valeurs des budgets de création (Paramètres) — dépend de la ratification Meta (QM-n) puis Balance (P10) ; y compris les unités de mesure « coût » et « complexité » |
| QL-6 | Schéma exact des stats de base d'une UnitDefinition — candidats cités par la Combat Bible (Health, Range, vitesse, cadence, Mana initial/seuil/gains) ; complétude à trancher (ex. : la donnée de dégâts d'Attack n'apparaît pas dans la liste citée) |
| QL-7 | Identifiants canoniques à ajouter au Vocabulary pour les notions de travail de cette bible (« document DSL », « primitive », « whitelist ») — règle n° 2, pas de terme fantôme |

*Fin du DRAFT — 8 invariants DSL-1..8, 7 questions QL-1..7 ; zéro valeur chiffrée, zéro
primitive décidée (candidates seulement) ; ratification Pierre pending.*
