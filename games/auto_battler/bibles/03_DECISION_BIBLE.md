# Decision Bible — Auto Battler

**Date** : 2026-07-18
**Source** : session Pierre × Claude (Fable 5) — dérivée de `00_ARCHITECTURE.md` (RATIFIÉ — P6 est le principe directeur de cette bible), de `02_CORE_RULES.md` (INV-10, INV-18, INV-19 ; trois points de décision core délégués ici), de `HUMANGATE_2026-07-18_FOUNDATION.md` (verbatim — QC-3 Merge automatique, QC-4 Ghost Board, QC-6 chaîne d'égalité), de `HUMANGATE_2026-07-18_DECISIONS.md` (verbatim — ratification QD-1..6, interprétation Merge, INV-19) et de `SOURCE_GAME_BIBLE_V1_PIERRE.md` (notes brutes, jamais réécrites — taxonomie des décisions d'Unit)
**Statut** : IMPLEMENTED (documentaire) — ratifié HumanGate 2026-07-18 (QD-1..6 intégrées) + DP-9 ajouté HumanGate 2026-07-19 (`HUMANGATE_2026-07-19_DP9.md`) ; document VERROUILLÉ, toute modification repasse par HumanGate
**Gabarit** : `00_TEMPLATE.md` (11 sections, ordre figé) · **Termes** : `00_VOCABULARY.md`

---

# Objectif

Cette bible est le **registre exhaustif des points de décision automatiques** du jeu, et
définit pour chacun son **ordre total** (P6) : périmètre ratifié par Pierre — Units, Shop,
Bots, Events, invocations, priorités, tie-breaks, sélections de cibles.

Tout choix que le moteur fait sans Input d'un Player est un point de décision : il doit
être enregistré ici (identifiant DP-n), posséder un ordre total, et devenir un invariant
Oracle « état donné → décision unique » (P6, INV-10). Jamais de « au hasard parmi les
ex æquo » hors RNG d'état.

Elle ne gouverne PAS :
- les **VALEURS** des priorités d'une Unit (quelle Unit préfère quelle cible, à quelle
  distance) → Content Bible (données) et Combat Bible (résolution), fournies via le DSL ;
- les **formules** de résolution (déplacement, Range, Mana, formule d'égalité au
  `tick_limit`, damage de Round Resolution) → Combat Bible ;
- les **politiques de Bots avancées** (contenu des stratégies, force, versions de
  Campaign) → Simulation Bible ; seule l'interface « politique → Inputs » est définie ici ;
- les **probabilités** du tirage de la Shop → Economy Bible (tables, INV-8).

# Invariants

Chaque invariant est falsifiable ; vérification mécanique en Oracle Hooks.

Fondement des DEC-n : **INV-19 — Aucun état implicite** (défini dans `02_CORE_RULES.md`,
ratifié HumanGate 2026-07-18) — toute donnée nécessaire à une décision appartient
explicitement au GameState, à l'Event Log ou au DSL déclaré ; jamais une variable cachée,
un état du renderer, une dépendance machine, un ordre mémoire ou un timestamp système.
Chaque DEC-n ci-dessous en est une concrétisation au niveau du registre.

- **DEC-1 — Registre exhaustif, fail-hard.** Tout point de décision automatique du moteur
  est enregistré dans cette bible sous un identifiant DP-n. Un site de décision présent
  dans le code sans DP-n déclaré est un défaut **fail-hard** (au même titre qu'un Event
  hors liste close, INV-12) — pas un avertissement.
- **DEC-2 — Décision unique et reproductible.** Pour tout DP : état donné → décision
  unique. Rejouer le même GameState deux fois produit la même décision, au bit près.
  (Concrétisation d'INV-10 / P6 au niveau de chaque DP.)
- **DEC-3 — Le hasard n'existe que là où la règle définit un tirage.** `rng_state` n'est
  consommé QUE par les DP qui définissent explicitement un tirage (à ce jour : DP-5,
  tirage de la Shop, et DP-3, tirage du Pairing — ratifié HumanGate 2026-07-18, QD-2).
  Aucun DP n'emploie JAMAIS le hasard pour départager des ex æquo —
  les ex æquo relèvent exclusivement de DEC-4.
- **DEC-4 — Tie-break Chain unique.** Toute décision confrontée à des ex æquo applique la
  **chaîne de tie-break canonique** (voir Concepts) : mêmes clés, même ordre, documentées
  ici, implémentées en un seul endroit du moteur. Jamais d'ordre ad hoc local.
- **DEC-5 — Mécanisme ici, valeurs ailleurs.** Cette bible possède les mécanismes et les
  ordres totaux ; elle ne contient AUCUNE valeur (priorité d'Unit, probabilité, formule).
  Les valeurs appartiennent à leur bible propriétaire (Content, Economy, Combat) et, pour
  les Units, arrivent par le DSL (voir DSL Hooks).

# Concepts

Notions introduites par cette bible — `DecisionPoint`, `TieBreakChain` et `BotPolicy`
ratifiés au Vocabulary (HumanGate 2026-07-18, `HUMANGATE_2026-07-18_DECISIONS.md` ;
règle d'usage n° 2 du Vocabulary : pas de terme fantôme). Identifiants canoniques en
anglais (Q1) :

- **Decision Point** (`DecisionPoint`, DP-n) — un choix automatique du moteur, enregistré
  au registre avec : déclencheur, état lu, sortie, ordre total, propriétaire des valeurs.
  Chaque DP devient un invariant Oracle (P6).
- **Decision Registry** (`DecisionRegistry`) — le registre lui-même : la section « Points
  de décision » de cette bible. Le code moteur doit lui correspondre exactement (DEC-1).
- **Tie-break Chain** (`TieBreakChain`) — la chaîne de tie-break canonique : une suite
  ordonnée de **clés stables issues de l'état**, appliquées successivement jusqu'à ce
  qu'un seul candidat reste. Chaîne canonique — ratifié HumanGate 2026-07-18 (QD-1,
  `HUMANGATE_2026-07-18_DECISIONS.md`) :
  1. **décision stratégique déclarée** — la préférence de gameplay explicitement
     déclarée par la règle ou par les données déclarées de l'acteur (DSL) ; la logique
     de gameplay passe avant l'identité technique ;
  2. **priorité de règle** — la priorité que la règle propriétaire du DP attache aux
     candidats (ordre défini par sa bible propriétaire) ;
  3. **distance Manhattan** — clé spatiale de gameplay : la plus courte distance
     Manhattan prend le pas ; son sens contextuel en Combat (distance mesurée entre
     quoi et quoi) → Combat Bible — aucune formule n'est fixée ici ;
  4. **initiative de création** — l'ancienneté d'entrée en jeu : le candidat créé le
     plus tôt prend le pas — dernière clé de gameplay avant l'identité technique ;
  5. **`unit_instance_id`** (croissant — attribué à la création, jamais réutilisé) —
     DERNIER RECOURS : il garantit l'unicité, il ne porte aucune stratégie ;
  6. **`seat_index`** (croissant) — départage uniquement les cas totalement identiques.
  Principe ratifié : un tie-break peut utiliser l'identité technique pour **garantir
  l'unicité**, jamais pour créer une **stratégie cachée**. Le tie-break ne commence pas
  par la géométrie du Board — les coordonnées en première clé créaient des comportements
  artificiels (proposition initiale rejetée, QD-1).
  Propriétés exigées : chaque clé est déterministe, lisible dans le GameState, totale
  sur son domaine ; la dernière clé départage toujours ; la chaîne est unique pour tout
  le moteur (DEC-4).
- **Bot Policy** (`BotPolicy`) — politique de décision d'un Bot : un Bot est un Player
  automatique (Q2) dont les Inputs sortent d'une **politique versionnée**. Version et
  force consignées avec chaque Campaign (P7). Interface : DP-8 ; contenu avancé →
  Simulation Bible.

Termes existants employés : Targeting, Merge, Star, Ghost Board, Pool, Shop, Seat,
Player, Input, `rng_state`, Tick — tous au Vocabulary.

# Paramètres

Aucune valeur nouvelle n'est fixée ici (DEC-5) : mécanismes ratifiés (HumanGate
2026-07-18), valeurs chiffrées TBD chez leur propriétaire.

| Nom | Valeur | Unité | Propriétaire |
|---|---|---|---|
| Clés exactes de la Tie-break Chain | chaîne canonique à 6 clés, voir Concepts — ratifié HumanGate 2026-07-18 (QD-1) | — | Decision Bible |
| Ordre canonique des Seats (DP-2) | `seat_index` croissant, FIXE tout le Match, pas de rotation — ratifié HumanGate 2026-07-18 (QD-6) | — | Decision Bible |
| Algorithme de Pairing (DP-3) | déterministe, tirage uniforme via `rng_state`, jamais soi-même, rematches autorisés — ratifié HumanGate 2026-07-18 (QD-2) | — | Decision Bible |
| Règle de sélection du Ghost Board (DP-3) | snapshot du dernier Board validé de l'adversaire (après `ConfirmPreparation`, avant Combat) — ratifié HumanGate 2026-07-18 (QD-3) | — | Decision Bible |
| Ordre de consommation du Merge à 4+ copies (DP-4) | ordre de création — les 3 copies les plus anciennes ; nouvelle Unit = nouvel `unit_instance_id` — ratifié HumanGate 2026-07-18 (QD-4) | — | Decision Bible |
| Tables de probabilités du tirage de la Shop (DP-5) | TBD | — | Economy Bible (INV-8) |
| Valeurs de priorités des Units (DP-6) | — (jamais ici) | — | Content Bible, via DSL |
| `tick_limit` et formule d'égalité (DP-7) | TBD | Ticks | Combat Bible (principe : INV-18) |
| Versionnement des Bot Policies (DP-8) | requis — version + force consignées par Campaign (P7, ratifié) | — | Simulation Bible |

# Points de décision

Le registre. Chaque DP : **Déclencheur · État lu (tranche de GameState) · Sortie · Ordre
total · Propriétaire des valeurs**. Les trois premiers DP sont les points délégués par les
Core Rules (section « Points de décision » de `02_CORE_RULES.md`).

### DP-1 — Ordre de résolution des faits simultanés *(délégué par Core Rules, pt 1)*
- **Déclencheur** : deux faits (ou plus) produits au même Tick ou par le même Input.
- **État lu** : l'ensemble des faits en attente de Resolve au même instant.
- **Sortie** : une séquence totale unique — l'ordre d'application au GameState et
  d'émission dans l'Event Log.
- **Ordre total** : à deux étages. (a) L'ordre **entre types d'actions** au sein d'un
  Tick appartient à la Combat Bible (la séquence V1 « Déplacement → Recherche de cible →
  Attaque → Gain de mana → Lancement des compétences » en est la graine). (b) Entre faits
  **de même type**, la Tie-break Chain (DEC-4) ordonne les acteurs.
- **Propriétaire des valeurs** : Combat Bible (ordre des types) · Decision Bible (chaîne).

### DP-2 — Ordre des Seats *(délégué par Core Rules, pt 2)*
- **Déclencheur** : toute opération où le moteur itère sur les Seats « en même temps » —
  Income, tirage des Shops (DP-5), contestation du Pool, et toute itération analogue.
- **État lu** : la liste des Seats actifs (non éliminés).
- **Sortie** : une permutation totale des Seats, appliquée à l'opération.
- **Ordre total** : `seat_index` croissant, FIXE pour tout le Match — pas de rotation —
  ratifié HumanGate 2026-07-18 (QD-6, `HUMANGATE_2026-07-18_DECISIONS.md`). Motifs
  ratifiés : simplifie les replays, les logs et les oracles ; l'équité vient du Pairing
  et du RNG contrôlé (DP-3), pas d'un déplacement artificiel des identités.
  Nota (lecture d'INV-4, pas une règle nouvelle) : les Inputs, eux, sont déjà totalement
  ordonnés par le journal d'Inputs — la contestation du Pool entre deux Buy est donc
  tranchée par l'ordre du journal ; DP-2 gouverne les opérations engagées par le moteur
  lui-même.
- **Propriétaire des valeurs** : Decision Bible (ordre) · Economy Bible (contenu d'Income
  et du tirage).

### DP-3 — Pairing par Round, sélection du Ghost Board incluse *(délégué par Core Rules, pt 3)*
- **Déclencheur** : transition vers Pairing, quand chaque Player actif a soumis
  `ConfirmPreparation` (QC-5).
- **État lu** : LobbyState (Seats actifs) ; RoundIndex ; `rng_state` (tirage déclaré —
  DEC-3) ; dernier Board validé de chaque adversaire (candidat Ghost Board, QC-4/QD-3).
- **Sortie** : `PairingResult` — un ensemble de paires de Seats ; si le nombre de Seats
  actifs est impair, le Player surnuméraire + le Ghost Board choisi (copie figée,
  immuable — INV-17). Le résultat est enregistré dans l'Event Log (nom de l'Event :
  voir Événements).
- **Ordre total** : ratifié HumanGate 2026-07-18 (QD-2 et QD-3,
  `HUMANGATE_2026-07-18_DECISIONS.md`). Pairing déterministe :
  `LobbyState + rng_state + RoundIndex → PairingResult` ; le hasard passe par
  `rng_state` UNIQUEMENT (DEC-3) ; distribution uniforme ; impossible de s'affronter
  soi-même ; **rematches AUTORISÉS** — chercher à les éviter ajoute une contrainte
  artificielle qui peut créer des biais (anti-rematch rejeté). Sélection du Ghost
  Board : snapshot du **dernier Board validé** de l'adversaire — après
  `ConfirmPreparation`, avant Combat ; jamais un état intermédiaire, un état
  post-Combat ni un état mutable — une photographie immuable (INV-17 précisé, voir
  `02_CORE_RULES.md`). Même état + même `rng_state` → appariement unique (DEC-2).
- **Propriétaire des valeurs** : Decision Bible (algorithme) · Core Rules (principe Ghost
  Board, QC-4/INV-17).

### DP-4 — Merge automatique : déclenchement, cascades, consommation
- **Déclencheur** : pendant la Preparation State, dès que 3 Units identiques sont réunies
  chez un Player (QC-3 — acte du système, jamais un Input, INV-13). Identiques = même
  **UnitDefinition** + même **Star** — ratifié HumanGate 2026-07-18 (Archer ★1 + ★1 + ★1
  = Archer ★2 ; Archer ★1 + ★1 + ★2 ≠ Merge). Cohérent avec INV-16 (« Star strictement
  supérieur à celui des Units consommées »).
- **État lu** : les Units du Player (type, Star, `unit_instance_id`, emplacements).
- **Sortie** : consommation de 3 Units, production d'une Unit de Star strictement
  supérieur (INV-16), émission de `MergeTriggered` puis `MergeResolved` (QC-3, replay).
- **Ordre total** :
  - *Cascades* : le produit d'un Merge peut compléter un nouveau triplet → le Merge
    suivant se déclenche immédiatement, avant tout nouvel Input ; chaque étape émet sa
    paire d'Events. La cascade est déterministe et finie (chaque Merge réduit le nombre
    d'Units du Player).
  - *Plusieurs triplets prêts simultanément* : traités dans l'ordre de la Tie-break
    Chain appliquée aux triplets (via leur plus ancien `unit_instance_id`, selon la
    chaîne ratifiée QD-1).
  - *4+ copies* : consommation par **ordre de création** — les 3 copies les plus
    anciennes sont consommées, les suivantes restent (Wolf A + B + C consommés, D
    reste) ; la nouvelle Unit reçoit un **nouvel `unit_instance_id`** — ratifié
    HumanGate 2026-07-18 (QD-4). Motifs ratifiés : pas de préférence cachée,
    reproductible, facile à debugger.
  - *Emplacement du produit du Merge* : la zone hors Board existe — le **Bench**,
    concept Core Rules ratifié HumanGate 2026-07-18 (QD-5) : une Unit achetée vit dans
    Shop → Purchased → {Board | Bench} ; capacité du Bench → Economy/Balance Bible ;
    voir `02_CORE_RULES.md`. La règle d'emplacement exacte du produit n'est pas fixée
    ici.
- **Propriétaire des valeurs** : Core Rules (règle du Merge, 3 copies) · Content Bible
  (résultats chiffrés du Star supérieur).

### DP-5 — Tirage de la Shop *(tirage déclaré — DEC-3, avec le Pairing DP-3)*
- **Déclencheur** : début de Round (héritage V1 — sauf Shop conservée par Lock) ; Input
  `Reroll`.
- **État lu** : Pool (disponibilités réelles), Level du Player, tables Rarity/probabilités
  (Economy Bible), `rng_state`.
- **Sortie** : le contenu de la nouvelle Shop ; `rng_state` avancé ; comptage
  Pool/Shop selon la règle de conservation (INV-7, comptage exact → Economy Bible).
- **Ordre total** : le tirage est défini PAR la règle, VIA `rng_state` (DEC-3) — c'est un
  hasard légitime car déclaré, reproductible au Replay (INV-4). Probabilités affichées =
  probabilités réelles, même source de vérité (INV-8). Ordre entre Seats : DP-2.
  Procédure détaillée du tirage (retrait/remise vis-à-vis du Pool) → Economy Bible.
- **Propriétaire des valeurs** : Economy Bible (tables, coûts, procédure de comptage).

### DP-6 — Décisions d'Unit en Combat *(taxonomie V1, cadre déterministe)*
Chaque Unit décide seule en Combat (« Aucune micro-gestion par le joueur » — V1). La V1
énumère cinq familles ; chacune est une sous-décision enregistrée :
- **DP-6.1 « Priorité de cible »** → Targeting : ordre total sur les cibles candidates.
- **DP-6.2 « Distance préférée »** → paramètre de Targeting et de déplacement (Range).
- **DP-6.3 « Style de déplacement »** → choix de la case de déplacement à chaque Tick :
  ordre total sur les cases candidates.
- **DP-6.4 « Utilisation des compétences »** → politique de Cast : le Cast est
  automatique à Mana plein (Vocabulary) ; la sélection de la cible/zone de l'Ability est
  une décision ordonnée.
- **DP-6.5 « Comportement spécial »** → comportements définis en DSL (monde fermé, P8),
  résolus déterministes.
- **Déclencheur** : chaque Tick de la Combat Simulation, selon la séquence de la Combat
  Bible. **État lu** : le Board du Combat (Units, coordonnées, Health, Mana, Effects).
  **Sortie** : une cible / une case / un Cast — unique par Tick et par Unit.
- **Ordre total** : chaque sous-décision est une fonction déterministe état → choix ;
  jamais de `rng_state` (DEC-3) ; tout ex æquo (deux cibles à égalité de priorité, deux
  cases équivalentes) est départagé par la Tie-break Chain (DEC-4).
- **Propriétaire des valeurs** : Content Bible (les valeurs de chaque Unit, fournies via
  le DSL — voir DSL Hooks) · Combat Bible (formules de résolution, séquence du Tick).
  AUCUNE valeur ici (DEC-5).

### DP-7 — Résolution d'égalité au `tick_limit`
- **Déclencheur** : la Combat Simulation atteint `tick_limit` sans vainqueur (INV-18).
- **État lu** : l'état final du Combat (Units survivantes des deux camps).
- **Sortie** : un résultat unique (vainqueur du Combat).
- **Ordre total** : principe ratifié INV-18/QC-6 — chaîne d'exemple ratifiée :
  `total_remaining_power` puis `units_remaining` puis `deterministic_order`. La formule
  exacte est propriété de la Combat Bible ; le registre exige seulement qu'elle soit une
  chaîne de clés déterministes conforme à DEC-2/DEC-4.
- **Propriétaire des valeurs** : Combat Bible (formule) · Core Rules (principe, INV-18).

### DP-8 — Décisions de Bot *(interface : politique → Inputs)*
- **Déclencheur** : Preparation State d'un Seat occupé par un Bot (un Bot EST un Player —
  Q2 ; le moteur ne distingue pas Bot et humain).
- **État lu** : la tranche de GameState accessible au Player selon les règles (toutes les
  règles et probabilités sont connues — P4).
- **Sortie** : une séquence d'Inputs de la liste close INV-13, terminée par
  `ConfirmPreparation` — rien d'autre. Un Bot n'a AUCUN accès privilégié au moteur : ses
  Inputs passent par le même journal que ceux d'un humain (INV-4).
- **Ordre total** : une Bot Policy versionnée est déterministe à version donnée : même
  état → mêmes Inputs (DEC-2 s'applique à l'interface). Version et force consignées avec
  chaque Campaign (P7, ratifié).
- **Propriétaire des valeurs** : Simulation Bible (contenu des politiques avancées) ·
  Platform Bible (incarnation des Seats).

### DP-9 — Refus de Buy à Bench plein *(ratifié HumanGate 2026-07-19, `HUMANGATE_2026-07-19_DP9.md`)*
- **Déclencheur** : Input `Buy` reçu pendant la Preparation State, Bench du Player à
  capacité pleine (paramètre déclaré ECO-7 — Economy Bible ; valeur : Balance Bible).
- **État lu** : occupation du Bench du Player (nombre d'UnitInstances vs capacité
  déclarée).
- **Sortie** : rejet déterministe de l'Input — aucun débit de Gold, aucun débit du Pool,
  aucune Unit détruite (QE-7, ratifié gate #3). Distinct d'INV-13 : l'Input `Buy` fait
  partie de la liste close, seul son EFFET est refusé pour cause d'état.
- **Ordre total** : binaire — Bench plein → refus ; sinon → transaction normale (débit
  du Pool au Buy, QE-2). Aucun ex æquo possible, la TieBreakChain n'intervient pas.
- **Aucune exception ratifiée** (ECO-7) : pas d'exception « l'achat complète un Merge » —
  en ajouter une serait une règle nouvelle, gate séparé.
- **Propriétaire des valeurs** : Economy Bible (schéma du refus) · Balance Bible
  (capacité chiffrée du Bench).

### Note de périmètre — invocations
Le périmètre ratifié inclut les **invocations** (Units créées par des Effects — Event
`Spawn`). Aucun mécanisme d'invocation n'est défini par les entrées actuelles : aucun DP
n'est donc enregistré. Le jour où la Combat/DSL Bible en définit un, ses décisions
(position d'apparition, ordre, propriétaire) devront être enregistrées ici — DEC-1
s'applique.

# Flux

Où chaque DP s'insère dans la boucle de Round ratifiée (`02_CORE_RULES.md`, Flux) :

```text
Round start
  → Income                  (itération sur les Seats : ordre DP-2)
  → Tirage des Shops        (DP-5 — tirage déclaré via rng_state, DEC-3 ;
                             ordre entre Seats : DP-2)
  → Preparation State       (Inputs INV-13, totalement ordonnés par le journal — INV-4 ;
                             Merge automatique DP-4, cascades résolues immédiatement ;
                             Seats occupés par des Bots : DP-8 produit leurs Inputs)
  → ConfirmPreparation      (chaque Player — QC-5)
  → Pairing                 (DP-3 — tirage déclaré via rng_state, DEC-3 ;
                             impair → sélection du Ghost Board)
  → Combat Simulation       (DP-6 à chaque Tick ; DP-1 ordonne les faits simultanés ;
                             DP-7 si tick_limit atteint — INV-18)
  → Round Resolution        (aucun DP enregistré à ce jour — formules → Combat/Economy ;
                             tout futur départage passera par DEC-4 et sera enregistré)
  → Life update
  → Repeat
```

Ordonnancement intra-Round délégué par les Core Rules (« notes de flux ») : Income, puis
tirage des Shops, puis ouverture de la Preparation State — ratifié avec cette bible
(HumanGate 2026-07-18).

# Événements

Un Event est requis par la ratification : le résultat du Pairing (DP-3, `PairingResult`)
est **enregistré dans l'Event Log** — ratifié HumanGate 2026-07-18 (QD-2). Son nom est
**`PairingResolved`** — ratifié HumanGate 2026-07-18 (gate #3, `HUMANGATE_2026-07-18_GATE3.md`) ;
inscrit au registre de la liste close (Core Rules, INV-12/P10) ; payload structurel :
propriétaire Decision Bible (ce DP), format → Technical Bible.

Pour le reste, les décisions ne créent aucun Event nouveau. Justification : un DP
**choisit** ; ce sont les actes choisis qui émettent les Events, tous déjà dans la liste
close (INV-12) :
le Merge automatique (DP-4) émet `MergeTriggered`/`MergeResolved` (propriété Core Rules,
QC-3) ; les décisions de Combat (DP-6, DP-7) produisent `Move`, `Attack`, `Cast`,
`Damage`, `Death`, `Victory` (payloads → Combat Bible). Si un futur DP exigeait un Event
nouveau : ajout au Vocabulary + bible propriétaire + gate HumanGate (règle INV-12).

# Oracle Hooks

Déterministes, non-LLM (P7) ; consommés par la Oracle Bible.

- **Replay par DP (DEC-2, alimente le hook INV-10 des Core Rules)** : pour CHAQUE DP-n du
  registre, au moins une fixture « état donné → décision unique », rejouée 2× → même
  sortie bit à bit. Fixtures spécifiques minimales :
  - DP-1 : deux faits simultanés de même type → même séquence d'Event Log aux deux runs ;
  - DP-2 : même ensemble de Seats → même permutation ;
  - DP-3 : même LobbyState + même `rng_state` + même RoundIndex → même `PairingResult`
    et même Ghost Board (tirage ratifié — QD-2) ;
  - DP-4 : état à cascade (un Merge en déclenche un autre) rejoué 2× → même séquence
    `MergeTriggered`/`MergeResolved` ; état à 4+ copies → mêmes 3 copies consommées ;
  - DP-5 : même `rng_state` → même Shop (et fréquences conformes aux tables à Seed fixe —
    hook INV-8) ;
  - DP-6 : même Board de Combat → même cible, même case, même Cast par Unit et par Tick ;
  - DP-7 : fixture d'égalité au `tick_limit` rejouée 2× → même vainqueur (hook INV-18) ;
  - DP-8 : même état + même version de Bot Policy → même séquence d'Inputs.
- **Test de registre (DEC-1)** : audit d'architecture — tout site de sélection/départage
  du code moteur référence un identifiant DP-n déclaré ici ; un site sans DP-n → échec
  fail-hard du run. (Symétrique : un DP-n déclaré sans site correspondant = dérive
  doc↔code, signalée.)
- **DEC-3** : audit d'architecture — aucun accès à `rng_state` hors des DP à tirage
  déclaré (à ce jour : DP-5 et DP-3 — ratifié HumanGate 2026-07-18) ; fixture :
  rejouer un départage d'ex æquo avec deux
  `rng_state` différents → même sortie (prouve que le tie-break n'en dépend pas).
- **DEC-4** : audit — une implémentation UNIQUE de la Tie-break Chain, référencée par
  tous les sites de départage ; fixture par clé : deux candidats égaux sur la clé k →
  départagés par la clé k+1 ; la dernière clé départage toujours (jamais d'ex æquo
  résiduel).
- **DEC-5** : audit — aucune constante de priorité d'Unit dans le module de décision ;
  les valeurs sont lues depuis les données Content/DSL.

# Simulation Hooks

Ce que le registre expose aux Campaigns (advisory, jamais gate de merge — P7) :

- **Fréquence d'activation par DP-n** (par Round, par Match) — un DP jamais activé est
  un poids mort ou un bug de registre.
- **Profondeur de la Tie-break Chain** : distribution des clés réellement utilisées pour
  départager. Signal design ratifiable : une clé JAMAIS utilisée (clé morte) ou TOUJOURS
  utilisée (clé écrasante qui masque les précédentes) mérite un regard de Pierre.
- **DP-3** : fréquence des Ghost Boards ; distribution des rematches (rematches
  autorisés — ratifié QD-2 ; mesure advisory de l'équité perçue, voir Human Notes).
- **DP-4** : fréquence et profondeur des cascades de Merge.
- **DP-5** : fréquences de tirage observées vs tables affichées (recoupe INV-8).
- **DP-6** : distribution des cibles choisies par « Priorité de cible » — mesure de la
  lisibilité réelle du Targeting.
- **DP-8** : distribution des Inputs par version de Bot Policy, consignée avec chaque
  Campaign (P7).

# DSL Hooks

Le DSL est AUTORISÉ à :
- fournir les **VALEURS** des cinq sous-décisions d'une Unit (DP-6.1 à DP-6.5 — sa
  priorité de Targeting, sa distance préférée, son style de déplacement, sa politique de
  Cast, son comportement spécial) depuis un **vocabulaire FERMÉ de critères**, à définir
  dans la DSL Bible (whitelist, P8).

Le DSL ne peut JAMAIS :
- modifier le mécanisme d'un DP, la Tie-break Chain, le registre ou son caractère
  fail-hard (DEC-1) ;
- toucher DP-1, DP-2, DP-3, DP-5, DP-7, DP-8 (ordres du moteur — fermés) ;
- consommer `rng_state` ni introduire un départage aléatoire (DEC-3).

Toute extension du vocabulaire de critères = gate HumanGate (P8 : agrandit la surface du
moteur).

# Human Notes

Ce qui reste du ressort de Pierre, hors de portée d'un Oracle :

- **Prédictibilité humaine ≠ déterminisme.** L'Oracle prouve « même état → même
  décision » ; il ne prouve pas qu'un Player peut PRÉDIRE la décision en regardant le
  Board. Un Targeting déterministe mais illisible est un échec de design — jugement de
  playtest, mesures DP-6 (Simulation Hooks) à l'appui.
- **Lisible avant optimal.** Héritage V1 (« combats lisibles », « Aucune micro-gestion
  par le joueur ») : entre un comportement d'Unit plus fort et un comportement plus
  lisible, l'arbitrage est un jugement de Pierre, pas une métrique.
- **Équité perçue du Pairing et du Ghost Board** : même parfaitement déterministe, un
  appariement peut être RESSENTI comme injuste (rematches, Ghost d'un Board trop fort).
  Les mesures DP-3 informent ; Pierre tranche.
- **Bots crédibles** : une Bot Policy peut être correcte (DEC-2) et pourtant sembler
  stupide ou robotique — le feel des Bots relève du playtest, versions consignées (P7).

---

## Décisions ratifiées — récapitulatif (HumanGate 2026-07-18)

Les six questions QD-1..6 sont tranchées — source verbatim :
`HUMANGATE_2026-07-18_DECISIONS.md`. Toute réouverture repasse par HumanGate.

| # | Décision — ratifié HumanGate 2026-07-18 | DP concerné |
|---|---|---|
| QD-1 | **TieBreakChain canonique** à 6 clés : décision stratégique déclarée → priorité de règle → distance Manhattan → initiative de création → `unit_instance_id` → `seat_index` (voir Concepts ; gameplay avant identité technique) | DEC-4, tous DP |
| QD-2 | **Pairing déterministe** : tirage uniforme via `rng_state` uniquement, jamais soi-même, rematches autorisés (anti-rematch rejeté) ; `LobbyState + rng_state + RoundIndex → PairingResult`, enregistré dans l'Event Log | DP-3, DEC-3 |
| QD-3 | **Ghost Board** = snapshot immuable du dernier Board validé de l'adversaire — après `ConfirmPreparation`, avant Combat ; jamais intermédiaire, post-Combat ni mutable | DP-3 |
| QD-4 | **Merge à 4+ copies** : consommation par ordre de création (les 3 copies les plus anciennes ; Wolf A+B+C consommés, D reste) ; nouvelle Unit = nouvel `unit_instance_id` ; identiques = même UnitDefinition + même Star | DP-4 |
| QD-5 | **Bench** — concept Core Rules : Shop → Purchased → {Board \| Bench} ; capacité → Economy/Balance Bible (voir `02_CORE_RULES.md`) | DP-4, DP-6, Core Rules |
| QD-6 | **`seat_index` FIXE**, pas de rotation ; l'équité vient du Pairing et du RNG contrôlé | DP-2 |

### Question restante

Aucune. Le nom `PairingResolved` a été ratifié au gate #3 (HumanGate 2026-07-18,
`HUMANGATE_2026-07-18_GATE3.md`) — voir Événements.

*Fin du registre — 8 DP + 5 sous-décisions d'Unit ; QD-1..6 ratifiées HumanGate
2026-07-18 ; document VERROUILLÉ.*
