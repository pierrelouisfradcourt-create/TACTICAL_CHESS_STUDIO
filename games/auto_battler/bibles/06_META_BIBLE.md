# Meta Bible — Auto Battler

**Date** : 2026-07-18
**Source** : session Pierre × Claude (Fable 5) — dérivée de `00_ARCHITECTURE.md` (RATIFIÉ — P5 : Meta = objectifs ; P7 : oracle valide / simulation explore ; P9 : pipeline de contenu ; P10 : propriété étanche), de `01_GAME_BIBLE.md` (objectifs de design V1 ratifiés), de `02_CORE_RULES.md` et `03_DECISION_BIBLE.md` (invariants, N = 8), de `HUMANGATE_2026-07-18_FOUNDATION.md`, `HUMANGATE_2026-07-18_DECISIONS.md` et `HUMANGATE_2026-07-18_GATE3.md` (verbatim, jamais réécrits — QE-4 : pas d'Interest ; QE-5 : pas de streaks → mission « économie originale ») et de `00_VOCABULARY.md` (74 termes)
**Statut** : DRAFT — ratification Pierre pending
**Gabarit** : `00_TEMPLATE.md` (11 sections, ordre figé) · **Termes** : `00_VOCABULARY.md`

---

# Objectif

Cette bible fixe les **OBJECTIFS MESURABLES du méta-jeu** : ce que le jeu vivant doit
accomplir une fois les règles écrites et le contenu produit. C'est le document de référence
des **Campaigns d'équilibrage** (P7) et le point de départ du pipeline de contenu (P9 :
Méta cible → Budgets → Contenu → Simulation → Ajustement) — le contenu s'écrit CONTRE ces
objectifs, jamais l'inverse.

C'est aussi, de l'aveu des studios, le document qui manque le plus souvent : tout le monde
équilibre, personne n'a écrit VERS QUOI on équilibre. Ici, chaque objectif est un
**quadruplet falsifiable** (métrique + protocole + seuil + action — META-1) : on saura
toujours dire si le méta observé est celui qu'on visait.

Elle ne gouverne PAS :
- les **valeurs d'équilibrage** (coefficients, formules, constantes) → Balance Bible (P10 —
  la Meta ne définit ni constante ni règle) ;
- les **contraintes de création** (nombre max de capacités, coûts, complexité, vocabulaire)
  → DSL Bible (P5 — les budgets de création vivent là-bas) ;
- les **protocoles détaillés de mesure** → Simulation Bible (cette bible les RÉFÉRENCE ;
  la Simulation Bible les pré-enregistre et les exécute) ;
- les **règles du jeu** (invariants, résolution, économie) → Core Rules / Combat / Economy ;
- les **décisions d'intervention** : comparer une mesure à un seuil ne déclenche jamais rien
  automatiquement — l'action est TOUJOURS une décision HumanGate (P7, META-2).

# Invariants

Chaque invariant est falsifiable ; vérification mécanique en Oracle Hooks. Ils portent sur
la **FORME des objectifs** — jamais sur leurs valeurs (les seuils sont des décisions de
Pierre, pas des invariants).

- **META-1 — Tout objectif est un quadruplet complet.** Tout objectif du registre (section
  Paramètres) est défini par QUATRE champs : (1) une **métrique** à définition
  opérationnelle ; (2) un **protocole de mesure pré-enregistré**, référencé vers la
  Simulation Bible ; (3) un **seuil** ; (4) une **action en cas de dépassement**, qui
  renvoie au manuel de maintenance (Balance Bible). Un objectif auquel il manque un champ
  N'EXISTE PAS — il est irrecevable au registre. Un champ peut porter la valeur TBD tant
  que Pierre n'a pas ratifié, mais le champ lui-même doit être présent et identifié.
- **META-2 — Toute métrique méta est ADVISORY.** Aucune métrique de cette bible n'est
  jamais un `software_verdict` ni un gate de merge (P7 : l'Oracle valide, la Simulation
  explore). Une Campaign hors seuil informe le HumanGate ; elle ne bloque, ne merge et ne
  rejette rien.
- **META-3 — Les seuils ne bougent que par HumanGate, jamais post-hoc.** Toute création ou
  modification d'un seuil du registre passe par un gate HumanGate daté. Interdit absolu :
  ajuster un seuil APRÈS avoir vu les résultats d'une Campaign pour la faire « passer »
  (pré-enregistrement, P7). Une Campaign mesurée contre un seuil modifié après son
  lancement est irrecevable.
- **META-4 — Toute Campaign consigne version + force des Bots.** Le bot-méta n'est PAS le
  méta humain (P7) : toute mesure d'un objectif de ce registre est adossée à une Campaign
  dont le rapport consigne la version et la force des BotPolicies employées. Une Campaign
  sans ces champs est irrecevable comme mesure.
- **META-5 — Propriété étanche (P10).** Cette bible ne définit AUCUNE constante
  d'équilibrage, AUCUNE règle de jeu, AUCUN Event, AUCUNE contrainte DSL — uniquement des
  objectifs. Si un objectif semble exiger une règle ou une valeur, c'est un renvoi vers la
  bible propriétaire, jamais une définition locale.

# Concepts

Termes canoniques employés (renvoi `00_VOCABULARY.md`) : **Archetype**, **Pivot**,
**Campaign**, **Pool**, **Match**, **Placement**, **UnitDefinition**, **BotPolicy**, **Seed**.

- **Archetype** *(Vocabulary — propriétaire : Meta)* — composition-type reconnaissable
  visée par le méta ; l'unité de mesure de la diversité du jeu. La définition
  OPÉRATIONNELLE de « Archetype viable » (à partir de quand une composition compte-t-elle
  comme viable dans une Campaign ?) est à ratifier `[QUESTION → Pierre]` (QM-2).
- **Pivot** *(Vocabulary — propriétaire : Meta)* — changement d'Archetype par un Seat en
  cours de Match, en réaction au Lobby ou à la Shop. Sa fréquence est un objectif de ce
  registre (OBJ-5) : un jeu sans Pivot est un jeu où l'adaptation (pilier V1) ne paie pas.
- **Contestation du Pool** — notion déjà employée par les Core Rules (INV-6) et la
  Decision Bible (DP-2) : intensité de la compétition entre Seats sur les mêmes
  UnitDefinitions du Pool partagé. C'est le moteur de « l'adaptation, la lecture du Lobby,
  les contres » (V1) ; son niveau acceptable est un objectif (OBJ-6).
- **Variance inter-Matchs** — à quel point deux Matchs (Seeds différents) racontent des
  histoires différentes : trajectoires, Archetypes joués, ordres d'Elimination. Concrétise
  la vision V1 « Chaque Match doit raconter une histoire différente ». Objectif OBJ-4.
- **Méta vivant vs méta résolu** — un méta est VIVANT quand plusieurs Archetypes restent
  simultanément viables et que le choix dépend du Lobby (lecture, contres, Pivots) ; il est
  RÉSOLU quand une stratégie dominante permanente existe — l'anti-objectif V1 explicite
  (« Aucune stratégie dominante permanente »). Le registre entier (OBJ-1, OBJ-5, OBJ-6,
  OBJ-7) vise à détecter la résolution du méta AVANT les joueurs.

Nota (règle Vocabulary n° 2 — pas de terme fantôme) : « Contestation du Pool »,
« Variance inter-Matchs » et « méta vivant / méta résolu » sont décrits ici en prose ;
leurs identifiants canoniques éventuels (pour nommer les métriques dans les rapports de
Campaign) devront être ajoutés au Vocabulary avant emploi dans une autre bible
`[QUESTION → Pierre]` (QM-13).

# Paramètres

**LE REGISTRE DES OBJECTIFS.** Un tableau par objectif ; chaque tableau porte les quatre
champs META-1. AUCUN chiffre n'est inventé ici : les seuls chiffres présents sont les
ratifiés V1/architecture (durée 20–30 min ; Placement ≈ 30 % ; N = 8 en contexte). Tout le
reste est **TBD**, à ratifier par Pierre (tableau QM-n en fin de document). Toutes les
actions renvoient au même chemin : advisory → HumanGate → leviers du manuel Balance
(ordre ratifié V1 : comportements → interactions → statistiques, jamais l'inverse).

### OBJ-1 — Nombre d'Archetypes viables simultanés

| Champ | Contenu |
|---|---|
| Métrique | Nombre d'Archetypes distincts « viables » observés simultanément sur une Campaign. Définition opérationnelle de « viable » à ratifier `[QUESTION → Pierre]` (QM-2). |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD** `[QUESTION → Pierre]` (QM-1). Le « 8 » cité en exemple (P5 de `00_ARCHITECTURE.md`, entrée Archetype du Vocabulary) est un EXEMPLE illustratif, PAS une ratification. |
| Action | Advisory → HumanGate ; leviers → Balance Bible (comportements → interactions → statistiques). |

### OBJ-2 — Durée cible d'un Match

| Champ | Contenu |
|---|---|
| Métrique | Durée d'un Match. Deux mesures complémentaires : (a) minutes réelles en playtest humain ; (b) proxy Campaign en Rounds (hook Core Rules « Durée en Rounds ») — la correspondance Rounds ↔ minutes est un élément du protocole, TBD. |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **20–30 minutes** (ratifié V1 — `01_GAME_BIBLE.md`, pilier « Partie courte » ; propriétaire Meta confirmé par le tableau Paramètres des Core Rules). |
| Action | Advisory → HumanGate ; leviers → Balance Bible. |

### OBJ-3 — Part du Placement dans la victoire

| Champ | Contenu |
|---|---|
| Métrique | Part de la victoire attribuable au Placement. Proposition à valider : protocole de **permutation** — re-simuler les mêmes Combats en ne changeant QUE les Placements, toutes choses égales par ailleurs (possible grâce à P1/INV-4 : simulation pure, replay au bit près), et mesurer la proportion de résultats qui basculent `[QUESTION → Pierre]` (QM-7). |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **≈ 30 %** (ratifié V1 — `01_GAME_BIBLE.md`, requalifié objectif mesurable au Changelog V1.1, delta 6 : pas une constante magique du moteur). |
| Action | Advisory → HumanGate ; leviers → Balance Bible. |

### OBJ-4 — Variance inter-Matchs (« chaque Match raconte une histoire différente »)

| Champ | Contenu |
|---|---|
| Métrique | À PROPOSER `[QUESTION → Pierre]` (QM-3). Piste : mesure de diversité entre Matchs à Seeds différents — distribution des Archetypes joués, des trajectoires économiques, des ordres d'Elimination (hook Core Rules « Ordre d'Elimination ») ; deux Matchs identiques trait pour trait = variance nulle. |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD**. |
| Action | Advisory → HumanGate ; leviers → Balance Bible (et, si la variance vient du contenu, Content Bible via le cycle P9). |

### OBJ-5 — Fréquence de Pivot souhaitée

| Champ | Contenu |
|---|---|
| Métrique | Fréquence des Pivots (par Match et par Seat). Exige une définition MESURABLE du Pivot (à quel moment l'Archetype d'une Army a-t-il « changé » entre deux Rounds ?) `[QUESTION → Pierre]` (QM-4). |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD** — un plancher (l'adaptation doit payer — pilier V1) ET un plafond (un méta où tout le monde pivote sans cesse n'a plus d'identités d'Archetypes) sont envisageables ; à ratifier. |
| Action | Advisory → HumanGate ; leviers → Balance Bible. |

### OBJ-6 — Niveau de contestation du Pool acceptable

| Champ | Contenu |
|---|---|
| Métrique | Intensité de la contestation du Pool. À PROPOSER `[QUESTION → Pierre]` (QM-5). Piste : à partir des Events économiques (UnitBought, ShopRolled), mesurer la proportion des achats portant sur des UnitDefinitions déjà raréfiées par d'autres Seats. |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD** — plancher (le Pool partagé doit réellement créer adaptation et contres — V1) et plafond (une contestation écrasante rendrait les plans impossibles) ; à ratifier. |
| Action | Advisory → HumanGate ; leviers → Balance Bible (taille du Pool = valeur Economy, décidée par gate). |

### OBJ-7 — Win-rate maximal toléré par Archetype

| Champ | Contenu |
|---|---|
| Métrique | Win-rate par Archetype sur une Campaign (taux de victoire du Match ; la pertinence d'une mesure complémentaire par classement final — hook « Ordre d'Elimination » — est à trancher avec QM-2/QM-6). Concrétise « Aucune stratégie dominante permanente » (V1) : le garde-fou quantitatif du méta résolu. |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD** `[QUESTION → Pierre]` (QM-6) — le win-rate au-delà duquel une intervention d'équilibrage est examinée. |
| Action | Advisory → HumanGate ; leviers → Balance Bible. |

### OBJ-8 — « Les décisions expliquent davantage les victoires que la chance »

| Champ | Contenu |
|---|---|
| Métrique | À PROPOSER `[QUESTION → Pierre]` (QM-8). Piste : comparer la part du résultat expliquée par les DÉCISIONS à celle expliquée par le SEED — ex. corrélation (force de la BotPolicy ↔ classement final) vs corrélation (Seed ↔ classement final), BotPolicies versionnées de forces distinctes (META-4). La première doit dominer la seconde. |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD**. |
| Action | Advisory → HumanGate ; leviers → Balance Bible (et lecture croisée avec OBJ-4 : la variance doit venir des situations, pas des vainqueurs — « le hasard crée des situations nouvelles, jamais le vainqueur », V1). |

### OBJ-9 — Toutes les UnitDefinitions jouables

| Champ | Contenu |
|---|---|
| Métrique | Taux d'usage par UnitDefinition sur une Campaign (présence en Army finale, et/ou taux d'achat — définition exacte au protocole). Concrétise « Toutes les Units jouables » (V1) : aucune UnitDefinition morte. |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD** `[QUESTION → Pierre]` (QM-9) — taux d'usage minimal en deçà duquel une UnitDefinition est examinée. |
| Action | Advisory → HumanGate ; leviers → Balance Bible (comportements d'abord — V1) ou Content Bible via le cycle P9. |

### OBJ-10 — « L'économie aussi importante que le Combat »

| Champ | Contenu |
|---|---|
| Métrique | À PROPOSER `[QUESTION → Pierre]` (QM-10). Piste : part des résultats expliquée par les décisions ÉCONOMIQUES (Buy, Sell, Reroll, LevelUp, Lock — traçables par les Events QE-6 : GoldChanged, UnitBought, UnitSold, PlayerLevelUp, ShopRolled) comparée à celle expliquée par les décisions de Placement (OBJ-3) ; l'économie doit peser autant (V1). |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD**. |
| Action | Advisory → HumanGate ; leviers → Balance Bible. |

## Mission « économie originale » (conséquence ratifiée QE-4 / QE-5)

Le gate #3 (`HUMANGATE_2026-07-18_GATE3.md`, verbatim) a tranché : **PAS de mécanisme
d'Interest** (QE-4 — « Tu construis un jeu original. […] Le retirer oblige à créer une
économie différente. Cela évite aussi les stratégies passives. ») et **PAS de win/lose
streaks** en V1 (QE-5). Les deux piliers économiques standard du genre sont retirés : la
profondeur économique doit venir d'AILLEURS.

Cette bible ne conçoit PAS le mécanisme de remplacement (ce sera Economy Bible / DSL /
contenu, via le cycle P9) ; elle fixe les OBJECTIFS que ce mécanisme, quel qu'il soit,
devra atteindre. Trois objectifs sont registrés — même forme META-1, seuils et métriques
TBD :

### OBJ-E1 — Tension décisionnelle économique mesurable

| Champ | Contenu |
|---|---|
| Métrique | À PROPOSER `[QUESTION → Pierre]` (QM-12). Intention : chaque Round doit présenter de vrais arbitrages de Gold — « Chaque achat compte. […] Aucune action ne doit être "évidente" » (pilier 1, V1). Piste : mesurer la proportion de situations où des politiques économiques distinctes (BotPolicies versionnées) divergent réellement dans leurs Inputs — si toutes les politiques jouent pareil, la décision était évidente. |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD**. |
| Action | Advisory → HumanGate ; guide la conception Economy/DSL/Content (cycle P9). |

### OBJ-E2 — Absence de stratégie économique passive dominante

| Champ | Contenu |
|---|---|
| Métrique | À PROPOSER `[QUESTION → Pierre]` (QM-12). Intention : la raison d'être du rejet de l'Interest (QE-4 : « évite les stratégies passives »). Piste : win-rate d'une BotPolicy de référence économiquement PASSIVE (thésauriser, dépenser au minimum) comparé aux politiques actives — la passive ne doit pas dominer. |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD**. |
| Action | Advisory → HumanGate ; guide la conception Economy/DSL/Content (cycle P9). |

### OBJ-E3 — Arbitrages de Gold visibles

| Champ | Contenu |
|---|---|
| Métrique | À PROPOSER `[QUESTION → Pierre]` (QM-12). Intention : le Gold doit avoir plusieurs usages réellement concurrents (acheter, Reroll, LevelUp — V1). Piste : distribution de la dépense de Gold entre ses usages (traçable par GoldChanged) — aucun usage ne doit être systématiquement écrasant ni systématiquement mort, sur l'ensemble des Rounds ET par phase de Match. |
| Protocole | → Simulation Bible (pré-enregistré) — TBD. |
| Seuil | **TBD**. |
| Action | Advisory → HumanGate ; guide la conception Economy/DSL/Content (cycle P9). |

Questions de design ouvertes par cette mission — posées, PAS tranchées ici :
- `[QUESTION → Pierre]` (QM-11) : quelle est la ou les SOURCES de profondeur économique de
  remplacement, maintenant que l'Interest et les streaks sont exclus ? (À concevoir dans
  l'Economy Bible / le DSL / le contenu, guidé par OBJ-E1..E3 — pas ici.)
- `[QUESTION → Pierre]` (QM-12) : ratification des métriques et seuils d'OBJ-E1..E3 —
  ces trois objectifs suffisent-ils à qualifier une « économie originale » réussie, ou
  faut-il en registrer d'autres ?

# Points de décision

**Néant** — la Meta ne décide rien en partie : elle ne possède aucun choix automatique du
moteur (aucun DP-n à enregistrer au registre de la Decision Bible — DEC-1 sans objet ici).
Les seules « décisions » liées à cette bible sont les **interventions d'équilibrage**
consécutives à un dépassement de seuil : elles sont hors moteur, humaines par invariant
(META-2, META-3 — HumanGate), et leur mode d'emploi appartient à la Balance Bible.

# Flux

**Cycle P9 — pipeline de contenu** (le contenu est une conséquence des objectifs de méta,
jamais l'inverse — `00_ARCHITECTURE.md`) :

```text
Méta cible                (CETTE bible — le registre des objectifs OBJ-n)
  → Budgets               (DSL Bible — contraintes de création dérivées des objectifs)
  → Contenu               (Content Bible — écrit CONTRE les objectifs et les budgets)
  → Simulation            (Campaigns — protocoles pré-enregistrés, Simulation Bible ;
                           version + force des Bots consignées — META-4)
  → Ajustement            (advisory → HumanGate → leviers Balance Bible ;
                           retour éventuel sur la Méta cible = gate HumanGate — META-3)
```

**Cycle de vie d'un objectif du registre** :

```text
Défini                    (quadruplet complet — META-1 ; seuil ratifié par gate — META-3)
  → Protocole enregistré  (Simulation Bible, PRÉ-enregistré — avant toute mesure)
  → Mesuré en Campaign    (rapport : version + force des Bots — META-4)
  → Comparé au seuil      (résultat ADVISORY — META-2 ; jamais un gate de merge)
  → Action HumanGate      (Pierre décide ; leviers → Balance Bible ;
                           jamais d'action automatique, jamais de seuil retouché post-hoc)
```

# Événements

**Néant** — la Meta n'émet rien dans le moteur. Le registre UNIQUE des Events est tenu par
les Core Rules (P10, INV-12) et cette bible n'est propriétaire d'aucun nom ni d'aucun
payload : ses métriques se CALCULENT à partir des sorties existantes (Event Log, journal
d'Inputs, snapshots — Simulation Hooks des autres bibles), hors moteur, en aval des
Campaigns. Si une métrique exigeait un jour un Event nouveau, la demande suivrait la règle
INV-12 (Vocabulary + bible propriétaire + gate HumanGate) — et le propriétaire n'en serait
pas la Meta (META-5).

# Oracle Hooks

Vérifications de FORME uniquement (les valeurs des objectifs ne sont jamais jugées par un
oracle — META-2). Déterministes, non-LLM (P7) ; consommées par la Oracle Bible.

- **META-1 — lint du registre, fail-hard documentaire** : un validateur parcourt la section
  Paramètres ; chaque OBJ-n doit posséder ses 4 champs (Métrique, Protocole, Seuil, Action)
  présents et identifiés — TBD est une valeur admise en DRAFT, un champ ABSENT est un échec
  fail-hard (l'objectif « n'existe pas »).
- **META-2 — séparation advisory/gate vérifiable** : audit d'architecture de la chaîne de
  validation — aucune métrique méta (aucun OBJ-n) n'apparaît comme condition d'un
  `software_verdict` ni d'un gate de merge ; toute sortie de Campaign est étiquetée
  advisory. Un OBJ-n référencé dans une condition de verdict = défaut fail-hard.
- **META-3 — traçabilité des seuils** : audit documentaire — toute modification d'un champ
  Seuil du registre référence un gate HumanGate daté ; un diff de seuil sans référence de
  gate = défaut. Recoupement : la date du gate précède le lancement de toute Campaign
  mesurée contre ce seuil (pré-enregistrement).
- **META-4 — schéma des rapports de Campaign** : validation de schéma — tout rapport de
  Campaign cité par un objectif du registre contient les champs version et force des
  BotPolicies (concept ratifié — Decision Bible DP-8, P7) ; rapport sans ces champs =
  irrecevable, la mesure est nulle.
- **META-5 — audit de propriété** : audit documentaire de cette bible — aucune constante
  d'équilibrage, aucune formule, aucune règle de jeu, aucun Event, aucune primitive DSL
  définie ici ; toute occurrence = défaut de propriété (P10).

# Simulation Hooks

La liste des métriques que la **Simulation Bible devra savoir produire** (une ligne par
objectif du registre ; protocoles pré-enregistrés là-bas ; tout est advisory — P7) :

- **OBJ-1** : comptage des Archetypes viables simultanés par Campaign (selon la définition
  « viable » ratifiée — QM-2).
- **OBJ-2** : durée des Matchs — en Rounds (hook Core Rules) + correspondance minutes
  (protocole), croisée avec les playtests humains.
- **OBJ-3** : part du Placement par protocole de permutation (re-simulation à Placements
  permutés, P1/INV-4).
- **OBJ-4** : mesure de variance inter-Matchs (trajectoires, Archetypes, ordres
  d'Elimination — métrique QM-3).
- **OBJ-5** : détection et comptage des Pivots (définition mesurable QM-4).
- **OBJ-6** : intensité de la contestation du Pool (à partir des Events économiques —
  métrique QM-5).
- **OBJ-7** : win-rate par Archetype (et classement final par Archetype).
- **OBJ-8** : corrélations décisions ↔ résultat vs Seed ↔ résultat (BotPolicies de forces
  distinctes, versions consignées).
- **OBJ-9** : taux d'usage par UnitDefinition (Army finale, achats).
- **OBJ-10** : poids relatif des décisions économiques vs décisions de Placement dans les
  résultats.
- **OBJ-E1** : divergence des politiques économiques sur situations identiques (tension
  décisionnelle).
- **OBJ-E2** : win-rate d'une BotPolicy économiquement passive de référence vs politiques
  actives.
- **OBJ-E3** : distribution de la dépense de Gold entre ses usages, par Round et par phase
  de Match.

# DSL Hooks

**Néant** — la Meta ne touche pas au DSL. Le DSL est un monde fermé (P8) dont les
contraintes de création (« budgets ») appartiennent à la **DSL Bible** (P5) ; le cycle P9
relie la Méta cible aux Budgets SANS que cette bible définisse un budget : elle fournit les
objectifs dont la DSL Bible dérive ses contraintes, et rien d'autre (META-5). Aucune
primitive, aucun attribut, aucune whitelist n'est définie ni modifiée ici.

# Human Notes

Ce qui reste du ressort de Pierre, hors de portée d'un oracle comme d'une Campaign :

- **Le méta est un JUGEMENT autant qu'une mesure.** Le ressenti de Pierre et des playtests
  PRIME sur un chiffre vert : un registre entièrement dans les seuils ne prouve pas que le
  jeu est bon, et un objectif hors seuil peut être toléré si le jeu est meilleur ainsi.
  Les métriques informent le jugement ; elles ne le remplacent jamais.
- **Bot-méta ≠ méta humain** (P7) : même avec versions et forces consignées (META-4), ce
  que des BotPolicies découvrent n'est pas ce que des humains joueront. La transférabilité
  d'une conclusion de Campaign au méta humain est un jugement, pas une déduction.
- **« Chaque Match raconte une histoire »** est d'abord un ressenti : OBJ-4 en propose une
  ombre mesurable, mais deux Matchs statistiquement distincts peuvent se RESSEMBLER en jeu
  (et l'inverse). La frontière entre variance vécue et variance mesurée appartient au
  playtest.
- **Méta vivant vs méta résolu** : les seuils (OBJ-1, OBJ-7) détectent la résolution
  grossière ; un méta peut être techniquement varié et pourtant ENNUYEUX, ou dominé et
  pourtant amusant un temps. Décider quand intervenir est un acte de design, pas un
  déclenchement de seuil (META-2).
- **Les seuils sont des intentions datées, pas des vérités** : Pierre peut les faire
  évoluer (par gate — META-3) à mesure que le jeu lui apprend ce qu'il est en train de
  devenir.

---

## Questions ouvertes — récapitulatif `[QUESTION → Pierre]`

Aucun chiffre n'a été inventé dans ce document ; chaque QM-n attend une ratification
HumanGate (META-3 pour les seuils).

| Id | Question |
|---|---|
| QM-1 | Seuil d'OBJ-1 : combien d'Archetypes viables simultanés vise-t-on ? (le « 8 » de P5 était un exemple, pas une ratification) |
| QM-2 | Définition opérationnelle d'« Archetype viable » (métrique d'OBJ-1, base d'OBJ-7) |
| QM-3 | Métrique de variance inter-Matchs (OBJ-4) — proposition « diversité des trajectoires » à valider |
| QM-4 | Définition mesurable du Pivot + seuil de fréquence cible (OBJ-5 : plancher seul, ou plancher ET plafond ?) |
| QM-5 | Métrique et seuil de contestation du Pool (OBJ-6) |
| QM-6 | Seuil de win-rate maximal toléré par Archetype (OBJ-7) |
| QM-7 | Protocole de permutation du Placement (OBJ-3) — validation du principe de mesure |
| QM-8 | Métrique « décisions > chance » (OBJ-8) — proposition par corrélations comparées à valider |
| QM-9 | Seuil de taux d'usage minimal des UnitDefinitions (OBJ-9) |
| QM-10 | Métrique « économie aussi importante que le Combat » (OBJ-10) — proposition à valider |
| QM-11 | Mission économie originale : quelles sources de profondeur économique de remplacement (post QE-4/QE-5) ? — design à mener en Economy/DSL/Content, guidé par OBJ-E1..E3 |
| QM-12 | Ratification des métriques et seuils OBJ-E1..E3 ; cette liste de trois objectifs suffit-elle ? |
| QM-13 | Ajout au Vocabulary des identifiants candidats pour les notions de cette bible (contestation du Pool, variance inter-Matchs, méta résolu) — règle « pas de terme fantôme » |

*Fin du DRAFT — registre de 13 objectifs (OBJ-1..10 + OBJ-E1..E3), 5 invariants de forme
META-1..5 ; seuls chiffres cités : 20–30 min et ≈ 30 % (ratifiés V1), N = 8 (Core Rules,
contexte) ; ratification Pierre pending.*
