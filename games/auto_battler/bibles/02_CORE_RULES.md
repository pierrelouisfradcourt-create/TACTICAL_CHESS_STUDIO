# Core Rules Bible — Auto Battler

**Date** : 2026-07-18
**Source** : session Pierre × Claude (Fable 5) — dérivée de `00_ARCHITECTURE.md` (RATIFIÉ, P1–P9), de `SOURCE_GAME_BIBLE_V1_PIERRE.md` (notes brutes, jamais réécrites), de `HUMANGATE_2026-07-18_FOUNDATION.md` (ratification Pierre, verbatim — source autoritaire des décisions QC-1..QC-6 et INV-13) et de `HUMANGATE_2026-07-18_DECISIONS.md` (ratification Pierre, verbatim — source autoritaire d'INV-19, du Bench QD-5 et des précisions INV-16/INV-17) et de `HUMANGATE_2026-07-18_GATE3.md` (ratification Pierre, verbatim — source autoritaire de QB-9, QE-6, PairingResolved et de la règle de propriété étanche P10 : registre unique des Events tenu ici)
**Statut** : IMPLEMENTED (documentaire) — ratifié HumanGate 2026-07-18 (gates Foundation + Decisions + gate #3 intégrés)
**Gabarit** : `00_TEMPLATE.md` (11 sections, ordre figé) · **Termes** : `00_VOCABULARY.md`

---

# Objectif

Cette bible fixe les **invariants du jeu** : ce qui est toujours vrai, quel que soit le
contenu, le rendu ou la plateforme.

Elle gouverne :
- la **simulation pure** (P1) et le pipeline `GameState → Simulation → Event Log → Renderer` (P2) ;
- la **structure d'un Match** : N Seats, boucle de Round (Preparation State → Pairing →
  Combat Simulation → Round Resolution), Elimination, victoire ;
- **N** comme invariant de design (P3) ;
- les principes transverses : probabilités connues (P4), ordre total des décisions (P6),
  mécanisme des Thresholds de Synergy, conservation du Pool, liste close des Inputs,
  vocabulaire fermé des Events, terminaison garantie de tout Combat (INV-18), aucun état
  implicite (INV-19) ;
- le **REGISTRE UNIQUE des Events** (P10, ratifié HumanGate gate #3 — propriété étanche des
  concepts) : la liste close (INV-12) est tenue ICI ; chaque bible propriétaire définit les
  payloads de SES Events (voir Événements).

Elle ne gouverne PAS :
- la **résolution du Combat** (déplacement, Targeting, Mana, Abilities, payloads des Events
  de combat) → Combat Bible — le registre des NOMS reste ici (P10), chaque bible propriétaire
  ne définit que les payloads de ses Events ; y compris la **valeur de `tick_limit` et la formule exacte de résolution
  d'égalité** (le PRINCIPE « tout Combat termine » est core — INV-18 ; la formule → Combat Bible) ;
- l'énumération et l'ordre total de chaque **point de décision** automatique → Decision Bible ;
- l'**économie chiffrée** (Income, intérêts, probabilités de la Shop, taille du Pool, coûts,
  Levels) → Economy Bible ;
- l'incarnation des Seats (humains, Bots, réseau) et tout **timer d'interface** → Platform Bible.

# Invariants

Chaque invariant est falsifiable ; sa vérification mécanique est décrite en Oracle Hooks.
INV-1 à INV-13 : identifiants stables. INV-14 à INV-18 : ajoutés par le HumanGate 2026-07-18
(Foundation). INV-19 : ajouté par le HumanGate 2026-07-18 (Decisions,
`HUMANGATE_2026-07-18_DECISIONS.md`). Aucun id renuméroté.

- **INV-1 — Simulation pure.** `État(t) + Entrées(t) = État(t+1)` (formule P1 du contrat
  maître) : le GameState suivant est entièrement déterminé par le GameState courant et les
  Inputs appliqués. Aucune autre influence n'existe.
- **INV-2 — RNG dans l'état.** `rng_state` est une composante du GameState. Le Seed
  n'apparaît qu'à l'initialisation du Match ; aucun re-seed en cours de Match.
- **INV-3 — Moteur fonction pure.** Le moteur est une fonction pure `GameState → GameState` :
  pas de temps réel, pas de dépendance graphique, pas d'aléatoire caché, pas de logique côté
  interface. Tout « temps » s'exprime en Ticks. Corollaire ratifié (QC-5) : le moteur
  n'utilise JAMAIS de timer — toute transition résulte d'une entrée (entrée → transition).
- **INV-4 — Replay intégral.** Un Replay = GameState initial + journal d'Inputs, rien
  d'autre. Rejouer reproduit le même Match : même Event Log, même état final, au bit près.
- **INV-5 — Renderer aveugle.** Le Renderer ne lit JAMAIS le GameState. Il ne consomme que
  l'Event Log (P2). Changer tout le rendu ne change aucun test.
- **INV-6 — N Seats.** Un Match se joue à N Seats (paramétrable, référence N = 8). N
  appartient aux Core Rules (P3) et calibre pool, probabilités, durée, dégâts, contestations.
- **INV-7 — Conservation du Pool.** Le Pool est fini et partagé : aucune unité n'est créée ni
  détruite hors des règles explicites. L'inventaire total par type d'unité (Pool + Shops +
  possessions des Seats) est conservé par toute transaction, selon la règle de comptage de
  l'Economy Bible (Buy retire du Pool ; comptage exact de Sell et Merge → Economy Bible).
- **INV-8 — Probabilités connues.** Probabilités affichées = probabilités réelles (P4).
  L'affichage et le tirage lisent la même source de vérité.
- **INV-9 — Elimination et victoire.** Un Seat dont la Life (ressource du Player/Seat —
  Vocabulary, ratifié HumanGate 2026-07-18) atteint zéro est éliminé définitivement. Le
  dernier Seat non éliminé gagne le Match.
- **INV-10 — Ordre total partout.** Tout point de décision automatique possède un ordre
  total (P6) : jamais de « au hasard parmi les ex æquo » hors RNG d'état. État donné →
  décision unique. Énumération et ordres → Decision Bible.
- **INV-11 — Thresholds jamais linéaires.** Une Synergy ne produit d'Effect qu'à ses
  Thresholds : rien entre deux Thresholds. Ajouter une Unit sans atteindre le Threshold
  suivant ne change aucun Effect de Synergy.
- **INV-12 — Vocabulaire d'Events fermé.** Tout Event émis appartient à la liste close
  (voir Événements — registre unique tenu par cette bible, P10). Un nom d'Event hors liste
  = échec fail-hard, pas un avertissement.
- **INV-13 — Liste d'Inputs close** *(corrigé HumanGate 2026-07-18)*. Les Inputs autorisés
  sont exactement : **Buy, Sell, Reroll, Lock, LevelUp, Place, ConfirmPreparation** (liste
  close, cf. Vocabulary). `Merge` n'est PAS un Input : le merge est automatique — un acte du
  système (QC-3, INV-16), pas du Player. Les Inputs ne sont acceptés que pendant la
  Preparation State ; aucun Input pendant le Combat. Tout Input hors liste ou hors état est
  rejeté.
- **INV-14 — Une Unit ne perd jamais de Life.** Une Unit ne perd jamais de `Life`, seulement
  des `Health`. `Life` est une ressource du Player/Seat ; `Health` appartient aux Units
  (Vocabulary). *(ratifié HumanGate 2026-07-18)*
- **INV-15 — Life unique.** Un Player possède une et une seule Life. *(ratifié HumanGate
  2026-07-18)*
- **INV-16 — Merge = Star strictement supérieur.** Un Merge (automatique dès 3 Units
  identiques, QC-3) produit une Unit de Star strictement supérieur à celui des Units
  consommées, et émet `MergeTriggered` puis `MergeResolved` (voir Événements). « Identiques »
  précisé (Interprétation Merge ratifiée) : même **UnitDefinition** ET même **Star** —
  Archer ★1 + Archer ★1 + Archer ★1 → Archer ★2 ; Archer ★1 + Archer ★1 + Archer ★2 ≠ Merge.
  La Unit produite reçoit un NOUVEL `unit_instance_id` (QD-4). *(ratifié HumanGate
  2026-07-18 ; précisé HumanGate 2026-07-18 — Decisions)*
- **INV-17 — Ghost Board immuable.** Un Ghost Board (copie figée d'un adversaire, QC-4) est
  une donnée historique IMMUABLE : il ne change jamais. Précision ratifiée (QD-3) : le
  GhostBoard est le snapshot du DERNIER board validé de l'adversaire — pris après
  `ConfirmPreparation`, avant Combat ; jamais un état intermédiaire, jamais un état
  post-combat, jamais un état mutable. *(ratifié HumanGate 2026-07-18 ; précisé HumanGate
  2026-07-18 — Decisions)*
- **INV-18 — Tout Combat termine.** Un Combat possède toujours un résultat : `tick_limit`
  (nombre maximal de Ticks) + résolution d'égalité déterministe (chaîne d'exemple ratifiée :
  `total_remaining_power` puis `units_remaining` puis `deterministic_order`). La formule
  exacte est propriété de la Combat Bible ; le PRINCIPE est un invariant core. *(ratifié
  HumanGate 2026-07-18, QC-6)*
- **INV-19 — Aucun état implicite.** Toute donnée nécessaire à une décision appartient
  explicitement à : **GameState**, **EventLog** ou **DSL déclaré**. Interdits : variable
  cachée ; état renderer ; dépendance machine ; ordre mémoire ; timestamp système.
  *Note de placement : demandé par le HumanGate pour la Decision Bible ; placé ici pour
  garder le registre INV-n unique, cité par la Decision Bible (DEC-n).* *(ratifié HumanGate
  2026-07-18 — Decisions, « Ajout important »)*

# Concepts

Tous définis dans `00_VOCABULARY.md` (les Core Rules n'introduisent aucun terme nouveau ;
l'ex-« Récompenses » de la V1 est supprimée — QC-1, remplacée par Round Resolution).

- **GameState** — l'état complet de la simulation à l'instant t. Composition illustrative
  (structure finale = Technical Bible) : `boards`, `seats`, `shops`, `pool`, `rng_state`,
  `combat_queue`, `round_index`… Rien n'existe hors GameState (INV-1/INV-3).
- **Seed** — graine unique initialisant `rng_state` à la création du Match (INV-2).
- **Input** — action d'un Player appliquée au GameState pendant la Preparation State ;
  liste close INV-13. Le journal d'Inputs sert au Replay (INV-4).
- **Event / Event Log** — fait accompli émis par la Simulation, dans un vocabulaire fermé
  (INV-12) ; le journal ordonné des Events est la seule interface vers le Renderer (INV-5).
- **Lobby → Seat → Player → Army** — hiérarchie ratifiée (HumanGate 2026-07-18, renvoi
  Vocabulary) : le Lobby contient N Seats ; le Seat est la place dans le Lobby ; le
  **Player** est l'occupant logique d'un Seat — humain, bot ou IA de simulation, sans
  distinction pour le moteur ; l'Army appartient au Player.
- **Preparation State** (QC-2, renvoi Vocabulary) — fenêtre unique de préparation, sans
  phases rigides ; Inputs autorisés = liste INV-13 ; le Player réorganise librement avant
  validation. Le Merge y survient AUTOMATIQUEMENT (système, pas un Input). Se termine
  uniquement par l'Input `ConfirmPreparation` (QC-5).
- **Bench** (QD-5, ratifié HumanGate 2026-07-18 — Decisions, renvoi Vocabulary) — états
  d'une Unit achetée : `Shop → Purchased → {Board | Bench}`. Le Bench appartient au Player,
  conserve les Units entre les Rounds, sert la préparation, et n'intervient PAS directement
  dans le Combat. Capacité du Bench : TBD (→ Paramètres, propriétaire Economy/Balance Bible).
- **Ghost Board** (QC-4, renvoi Vocabulary) — copie figée d'un adversaire, opposée à un
  Player lors d'un appariement impair ; snapshot du dernier board validé (QD-3) ; donnée
  historique immuable (INV-17).
- **Round Resolution** (QC-1, renvoi Vocabulary) — résolution de fin de Round ; peut
  produire rewards, damage, progression — sous-systèmes de résolution, PAS des phases.
- **Merge / Star, Life / Health** — termes canoniques ratifiés, renvoi Vocabulary
  (Merge = action système, Star = rang résultant ; Life = Player/Seat, Health = Unit).
- **UnitDefinition / UnitInstance** (ratifiés HumanGate 2026-07-18 — Decisions, renvoi
  Vocabulary) — partout où ces Core Rules disent « Unit » sans distinction, la distinction
  ratifiée s'applique : **UnitDefinition** = le modèle de l'unité ; **UnitInstance** =
  une occurrence réelle en partie, porte `unit_instance_id`, Star et Health. Définitions
  complètes → `00_VOCABULARY.md`.
- **Round / Match** — un cycle complet de la boucle principale / la totalité, du premier
  Round à la victoire du dernier Seat survivant.
- **Tick** — pas de temps discret de la Simulation de Combat ; seule notion de temps du
  moteur (INV-3).

# Paramètres

Aucun chiffre nouveau n'est fixé ici : seules les valeurs déjà ratifiées (architecture,
HumanGate) ou présentes dans la V1 apparaissent ; tout le reste est TBD chez son propriétaire.

| Nom | Valeur | Unité | Propriétaire |
|---|---|---|---|
| N (Seats par Lobby) | **8** (référence, paramétrable) | Seats | Core Rules — ratifié (P3) |
| Durée cible d'un Match | 20–30 (objectif V1) | minutes | Meta Bible |
| Units identiques requises pour un Merge | 3 (V1, confirmé QC-3) | Units | Core Rules |
| Part du Placement dans la victoire | ~30 % (objectif V1) | % | Meta Bible |
| Life initiale du Seat | TBD | points | Core Rules (valeur proposée par Economy Bible) |
| Dégâts au Seat après Combat perdu | TBD — dépendent des survivants + niveau du Round (V1) | points | Core Rules (formule TBD) |
| Capacité du Bench (places) | TBD | Units | Economy/Balance Bible (concept : Core Rules, QD-5) |
| Income, intérêts, coûts, probabilités Shop, taille du Pool | TBD | — | Economy Bible |
| Valeurs des Thresholds de Synergy (ex. V1 : 2/4/6/8) | TBD | Units | Content Bible (valeurs) — mécanisme : Core Rules (INV-11) |
| tick_limit (Ticks max d'un Combat) | TBD | Ticks | Combat Bible (principe « tout Combat termine » : Core Rules, INV-18) |
| Fin de la Preparation State | Input explicite `ConfirmPreparation` — jamais de timer moteur (QC-5, ratifié) ; un timer d'interface relève de Platform/UX | — | Core Rules (mécanisme) · Platform Bible (timer UI éventuel) |

# Points de décision

Au niveau core, trois points ; leur ordre total est **à spécifier dans la Decision Bible**
(chacun deviendra un invariant Oracle « état donné → décision unique », P6).

1. **Ordre de résolution des Events simultanés** — deux faits produits au même Tick ou par
   le même Input : ordre total à spécifier dans Decision Bible.
2. **Ordre des Seats** — dans toute phase où les Seats agissent « en même temps »
   (application des Inputs, contestation du Pool, Income) : ordre total à spécifier dans
   Decision Bible.
3. **Appariement (Pairing) des Seats par Round** — qui affronte qui à chaque Round. Le cas
   d'un nombre impair de survivants est TRANCHÉ (QC-4, ratifié) : le Player surnuméraire
   affronte un **Ghost Board** (copie figée d'un adversaire, INV-17). Le choix de
   l'adversaire copié et l'ordre total d'appariement restent à spécifier dans Decision Bible.

# Flux

Ordre d'exécution figé. Boucle ratifiée par le HumanGate 2026-07-18 (« Simulation »).

**Boucle de Round** (ratifiée) :

```text
Initialize Lobby            (Seed, N Seats — Round 1 uniquement)
  → Players prepare         (Preparation State — fenêtre unique ; Inputs INV-13 ;
                             Merge automatique par le système, émet MergeTriggered/MergeResolved)
  → ConfirmPreparation      (Input explicite de chaque Player — jamais de timer moteur, QC-5)
  → Pairing                 (appariement ; impair → Ghost Board, QC-4)
  → Combat Simulation       (automatique, en Ticks, zéro Input, borné par tick_limit — INV-18 ;
                             résolution → Combat Bible)
  → Round Resolution        (peut produire rewards, damage, progression — sous-systèmes de
                             résolution, pas des phases — QC-1)
  → Life update             (Life à zéro → Elimination — INV-9)
  → Repeat                  (Round suivant)
```

Notes de flux :
- Pendant la Preparation State, l'Input `Place` déplace les Units entre Bench et Board
  (QD-5) ; détails de placement → Decision Bible / UX.
- L'Income et le tirage de la Shop (Economy Bible) alimentent la Preparation State en début
  de Round (héritage V1) ; leur ordonnancement exact → Decision Bible.
- Le moteur ne possède aucun timer : toute transition résulte d'une entrée (QC-5, INV-3).
  Un éventuel timer d'interface (mobile) est une affaire de Platform/UX, pas du moteur.

**Cycle de Match** :

```text
Init(Seed, N Seats) → Round 1 → Round 2 → … → Eliminations successives
  → dernier Seat survivant → Victory → fin du Match
```

**Pipeline de restitution** (P2) :

```text
GameState → Simulation → Event Log → Renderer
```

# Événements — REGISTRE UNIQUE de la liste close

Principe : vocabulaire **FERMÉ** (P2, INV-12) et **registre UNIQUE tenu ICI** (P10, ratifié
HumanGate 2026-07-18, gate #3) : les Core Rules tiennent la liste close des NOMS d'Events ;
chaque bible propriétaire définit les payloads de SES Events — jamais l'inverse.

Liste close ratifiée — **19 Events** (graine architecture + gates Foundation + gate #3) :

| Event | Bible propriétaire du payload | Ratification |
|---|---|---|
| **Spawn** | Combat | graine architecture |
| **Move** | Combat | graine architecture |
| **Attack** | Combat | graine architecture |
| **Cast** | Combat | graine architecture |
| **Damage** | Combat | graine architecture |
| **Death** | Combat | graine architecture |
| **Victory** | Combat | graine architecture |
| **Heal** | Combat | QB-9, gate #3 (« pas davantage ») |
| **Shield** | Combat | QB-9, gate #3 (« pas davantage ») |
| **Buff** | Combat | QB-9, gate #3 (« pas davantage ») |
| **Debuff** | Combat | QB-9, gate #3 (« pas davantage ») |
| **MergeTriggered** | Core Rules / Decision | QC-3, gate Foundation |
| **MergeResolved** | Core Rules / Decision | QC-3, gate Foundation |
| **PairingResolved** | Decision | gate #3 (« Je valide ce nom ») |
| **GoldChanged** | Economy | QE-6, gate #3 |
| **ShopRolled** | Economy | QE-6, gate #3 |
| **UnitBought** | Economy | QE-6, gate #3 |
| **UnitSold** | Economy | QE-6, gate #3 |
| **PlayerLevelUp** | Economy | QE-6, gate #3 |

- **MergeTriggered / MergeResolved** *(ratifiés HumanGate 2026-07-18, QC-3)* : émis par le
  système de merge automatique pendant la Preparation State — `MergeTriggered` quand 3 Units
  identiques sont réunies, `MergeResolved` quand la Unit de Star supérieur est produite
  (INV-16). Requis pour le replay et le Renderer. Payloads : TBD.
- Les **payloads détaillés** de chaque Event sont définis par sa bible propriétaire (colonne
  ci-dessus — P10) : Events de combat → Combat Bible, Events économiques → Economy Bible,
  PairingResolved → Decision Bible. Aucune bible ne définit le payload d'un Event qu'elle
  ne possède pas.
- Règle inchangée : **aucun Event hors registre**. Un nom d'Event hors registre = échec
  **fail-hard** (INV-12), pas un avertissement. Toute extension du registre = ajout au
  Vocabulary + bible propriétaire + gate HumanGate.
- L'Event Log est distinct du journal d'Inputs : l'un sert au Renderer (INV-5), l'autre au
  Replay (INV-4).

# Oracle Hooks

Une vérification mécanique par invariant (consommées par la Oracle Bible ; déterministes,
non-LLM, P7).

- **INV-1 / INV-3** : appliquer 2× le moteur au même GameState + mêmes Inputs → GameStates
  résultants identiques bit à bit ; audit d'architecture : aucune horloge, aucun timer,
  aucun accès graphique, aucune source d'aléa hors `rng_state` dans le module moteur.
- **INV-2** : la sérialisation du GameState contient `rng_state` ; aucune API de re-seed
  exposée ; fixture : sérialiser en cours de Match, restaurer, continuer → identique au run
  ininterrompu.
- **INV-4** : rejouer 2× le même GameState initial + même journal d'Inputs → Event Logs et
  états finaux identiques bit à bit.
- **INV-5** : audit de dépendances : le module Renderer n'importe ni ne référence le type
  GameState ; son unique interface d'entrée est l'Event Log.
- **INV-6** : initialiser un Match avec N = 8 → exactement 8 Seats ; initialiser avec un
  autre N → le Match se construit avec ce N.
- **INV-7** : property-test : pour toute séquence d'Inputs, l'inventaire total par type
  d'unité (Pool + Shops + Seats) est conservé selon la règle de comptage de l'Economy Bible.
- **INV-8** : audit d'architecture : une seule table de probabilités, lue à la fois par
  l'affichage et par le tirage ; test à Seed fixe : fréquences de tirage sur grand
  échantillon conformes à la table (déterministe car Seed fixe).
- **INV-9** : fixture : Life d'un Seat amenée à zéro → Seat éliminé, plus aucun Input
  accepté de lui ; fixture : avant-dernier Seat éliminé → Event Victory émis, Match terminé.
- **INV-10** : pour chaque point de décision énuméré par la Decision Bible, fixture « état
  donné → décision unique », rejouée 2× → même décision.
- **INV-11** : fixture : équipe entre deux Thresholds → Effects de Synergy strictement
  identiques à ceux du Threshold inférieur ; ajouter une Unit sans franchir de Threshold ne
  change aucun Effect.
- **INV-12** : validation de schéma de l'Event Log : tout nom d'Event hors liste close →
  échec fail-hard du run.
- **INV-13** : fixtures de rejet : Input hors liste close → rejeté — y compris un Input
  « Merge » soumis par un Player (le merge est système) ; tout Input soumis pendant le
  Combat → rejeté ; fixture : la Preparation State ne se termine que sur
  `ConfirmPreparation`, jamais par écoulement de temps.
- **INV-14** : audit de schéma : le type Unit ne possède aucun champ `Life` ; property-test :
  les Events `Damage` d'un Combat ne diminuent que des `Health` de Units, jamais une `Life`.
- **INV-15** : audit de schéma : exactement un champ `Life` par Player ; property-test :
  pour toute séquence d'Inputs, chaque Player possède toujours exactement une Life.
- **INV-16** : property-test : tout `MergeResolved` produit une Unit de Star strictement
  supérieur à celui des Units consommées ; fixture : 3 Units identiques réunies →
  `MergeTriggered` puis `MergeResolved` émis sans aucun Input.
- **INV-17** : fixture : sérialisation d'un Ghost Board avant et après le Combat qui
  l'utilise → identique bit à bit.
- **INV-18** : property-test : toute Combat Simulation émet un résultat en ≤ `tick_limit`
  Ticks ; fixture d'égalité au `tick_limit` rejouée 2× → même vainqueur (chaîne de
  tie-break déterministe, formule → Combat Bible).
- **INV-19** : (1) replay du même Match (GameState initial + journal d'Inputs) exécuté sur
  DEUX machines différentes → Event Log identique au bit près (attrape dépendance machine,
  ordre mémoire, timestamp système) ; (2) audit statique : toute fonction de décision du
  moteur ne lit que (tranche de GameState, EventLog, DSL déclaré) — tout autre accès =
  défaut fail-hard.

# Simulation Hooks

Ce que le core expose aux Campaigns (advisory, jamais gate de merge — P7) :

- **Durée en Rounds** de chaque Match (et durée en Ticks de chaque Combat).
- **Journal complet** : journal d'Inputs + Event Log intégral, exportables.
- **Snapshots de GameState** aux frontières de Round (état complet sérialisé, `rng_state` inclus).
- **Ordre d'Elimination** des Seats (classement final du Match).

# DSL Hooks

Néant — les Core Rules sont fermées au DSL : aucune primitive de contenu ne peut modifier un
invariant core. Le DSL définit des Abilities, Items et Synergies (P8) DANS le cadre des
invariants ci-dessus ; il ne touche ni la boucle, ni N, ni le RNG, ni le vocabulaire d'Events,
ni la liste d'Inputs. Toute extension de cette frontière = gate HumanGate.

# Human Notes

Ce qui reste du ressort de Pierre, hors de portée d'un Oracle :

- **Feel de la durée** : 20–30 minutes est un objectif chiffré (Meta Bible), mais « le Match
  ne traîne pas / ne se bâcle pas » est un jugement de playtest.
- **Lisibilité de la boucle** : le rythme Preparation → Combat → Round Resolution doit être
  ressenti comme une respiration, pas une checklist. L'Oracle vérifie l'ordre, pas la sensation.
- **« Chaque Match raconte une histoire »** (vision V1) : la variance créée par le RNG doit
  produire des situations nouvelles, jamais décider directement du vainqueur — la frontière
  entre les deux est un jugement humain, mesures Simulation à l'appui (advisory).
- **Timer d'interface (mobile)** : le moteur reste entrée → transition (QC-5) ; décider si,
  quand et comment l'interface propose un timer est un jugement produit/UX (Platform Bible).

---

## Résolutions HumanGate 2026-07-18 (ex-Questions ouvertes)

Les six questions core QC-1..QC-6 sont TRANCHÉES — source verbatim :
`HUMANGATE_2026-07-18_FOUNDATION.md`. Aucune question core ne reste ouverte.

| # | Question (résumé) | Décision (une ligne) |
|---|---|---|
| QC-1 | Contenu et propriétaire de la phase « Récompenses » | Phase supprimée → **Round Resolution**, qui peut produire rewards/damage/progression (sous-systèmes de résolution, pas des phases) |
| QC-2 | Phases séquentielles ou fenêtre unique | **Preparation State** : fenêtre unique sans phases rigides ; Inputs = liste INV-13 ; réorganisation libre avant validation ; le Merge y est automatique (système, pas un Input — réconciliation avec la « remarque importante ») |
| QC-3 | Merge automatique ou déclenché | **Automatique** dès 3 Units identiques ; émet `MergeTriggered` puis `MergeResolved` (replay) |
| QC-4 | Appariement impair | **Ghost Board** : copie figée d'un adversaire ; donnée historique immuable (INV-17) |
| QC-5 | Fin de la préparation sans temps réel | Input explicite **`ConfirmPreparation`** ; le moteur n'utilise jamais de timer (entrée → transition) ; timer d'interface = Platform/UX |
| QC-6 | Combat potentiellement infini | Invariant core **« tout Combat termine »** (INV-18) : `tick_limit` + égalité déterministe (`total_remaining_power` puis `units_remaining` puis `deterministic_order`) ; formule exacte → Combat Bible |

*Fin du DRAFT — décisions HumanGate 2026-07-18 intégrées ; ratification finale pending.*
