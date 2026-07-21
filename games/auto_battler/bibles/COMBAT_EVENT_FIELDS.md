# Champs d'Events requis par un Renderer AVEUGLE — Combat

**Date** : 2026-07-19
**Statut** : **v0 OPPOSABLE** — produit par l'orchestrateur, companion de `04_COMBAT_BIBLE.md`.
Provisoire, jugé par Pierre en jouant. Aucune décision HumanGate n'est prise ici.
**Objet** : la liste EXACTE des champs à ajouter pour que les trois animations demandées
soient jouables par un Renderer qui ne lit jamais le GameState (INV-5).
**Méthode** : chaque affirmation est vérifiée **deux fois par deux chemins** — (A) le texte
des bibles, (B) le code réel exécuté ou lu. Les divergences A↔B sont listées en §6, jamais
lissées.
**Interdit dans ce document** : toute valeur numérique de gameplay. Le TYPE d'un champ, oui ;
sa valeur, non.

---

## 0. Résultat le plus important, en tête

> **AUCUNE des trois animations n'exige un 23ᵉ nom d'Event.**
> Le registre reste CLOS à 22 noms. Tout ce qui manque est un CHAMP dans un payload
> existant, ou une DÉFINITION manquante d'un champ déjà nommé — jamais un Event nouveau.

La raison est structurelle, pas circonstancielle, et c'est elle qu'il faut retenir :

> **Le vol des projectiles est DÉCORATIF** (ratifié Pierre). Quand un Event `Attack` ou
> `Cast` est émis, **la résolution est déjà faite**. Il n'existe aucun état de simulation
> « projectile en vol » : rien ne peut rater, être intercepté, dévié ou annulé entre le
> départ et l'arrivée. Un `ProjectileLaunched` / `ProjectileHit` / `AttackMissed`
> décrirait un état qui n'existe pas.
> Les champs d'où / vers où / avec quelle apparence sont des **indications de rendu**, pas
> des faits de simulation. La **durée** du vol n'est pas un champ d'Event et ne doit pas le
> devenir : le temps réel par Tick est un choix Renderer — verbatim ratifié,
> `HUMANGATE_2026-07-19_VALUES_V0.md` : « le temps réel par Tick est un choix RENDERER (P2),
> hors du moteur ».

C'est exactement ce qui garde le registre fermé. Si un jour une règle rendait un projectile
interceptable, le vol cesserait d'être décoratif — et il faudrait alors un gate, pas un
champ.

---

## 1. Le registre réel des 22 Events — recompté

**Recomptage (chemin B, exécution)** — commande passée dans `games/auto_battler/` :

```
node -e "import('./engine/registry.mjs').then(m=>{console.log(m.EVENT_KINDS.length)})"
→ 22
```

**Recomptage (chemin A, documents)** : `02_CORE_RULES.md` §Événements annonce « 22 Events »
et en énumère 22 dans son tableau ; `00_VOCABULARY.md`, entrée *Event*, annonce
« 22 noms » et les énumère. Les trois sources concordent, y compris sur l'ordre et
l'orthographe. **Aucune divergence de registre.**

| # | Event | Ligne source `engine/registry.mjs` | Payload réellement émis par le code | Payload documentaire |
|---|---|---|---|---|
| 1 | `Spawn` | 7 | ⚠ `{kind, inputKind}` — **placeholder explicite**, `engine/transition.mjs:38-41` | `{unit_instance_id, unit_definition_ref, side_ref, cell, star, health_initial, mana_initial}` — `04_COMBAT_BIBLE.md` |
| 2 | `Move` | 8 | **jamais émis** | `{unit_instance_id, from_cell, to_cell}` |
| 3 | `Attack` | 9 | **jamais émis** | `{attacker_unit_instance_id, target_unit_instance_id}` (+ champs v0 §4) |
| 4 | `Cast` | 10 | **jamais émis** | `{caster_unit_instance_id, ability_ref, targets \| zone}` (+ champs v0 §4) |
| 5 | `Damage` | 11 | **jamais émis** | `{source_kind, source_ref, target_unit_instance_id, amount, target_health_after}` (+ champs v0 §4) |
| 6 | `Death` | 12 | **jamais émis** | `{unit_instance_id, source_ref}` |
| 7 | `Victory` | 13 | **jamais émis** | `{winner_side_ref, resolution_kind, ticks_elapsed, survivors[]}` |
| 8 | `Heal` | 14 | **jamais émis** | `{source_kind, source_ref, target_unit_instance_id, amount, target_health_after}` |
| 9 | `Shield` | 15 | **jamais émis** | `{source_kind, source_ref, target_unit_instance_id, amount}` (+ `target_shield_after` v0) |
| 10 | `Buff` | 16 | **jamais émis** | `{target_unit_instance_id, source_ref, effect_ref}` |
| 11 | `Debuff` | 17 | **jamais émis** | `{target_unit_instance_id, source_ref, effect_ref}` |
| 12 | `MergeTriggered` | 18 | `{seat_id, unit_def_id, star, consumed_count}` — `preparation/preparation.mjs:723` | idem — `02_CORE_RULES.md` |
| 13 | `MergeResolved` | 19 | `{seat_id, unit_def_id, new_star, produced_unit_id, to_zone, to_index}` — `preparation.mjs:732` | idem |
| 14 | `PairingResolved` | 20 | **jamais émis** | payload : propriétaire Decision Bible — **non spécifié** |
| 15 | `GoldChanged` | 21 | `{seat_id, delta, new_gold, source}` — `preparation.mjs:200, 304, 401, 497` | Economy Bible |
| 16 | `ShopRolled` | 22 | `{seat_id, shop_content, odds_table_version, cause}` — `preparation.mjs:411` | Economy Bible |
| 17 | `UnitBought` | 23 | `{seat_id, unit_definition, shop_slot, gold_cost, unit_instance_id, bench_index}` — `preparation.mjs:228` | Economy + gate RENDERER |
| 18 | `UnitSold` | 24 | `{seat_id, unit_instance, unit_definition, star, pool_returned, gold_credited, from_zone, from_index}` — `preparation.mjs:331` | Economy + gate RENDERER |
| 19 | `PlayerLevelUp` | 25 | `{seat_id, old_level, new_level, gold_cost}` — `preparation.mjs:506` | Economy Bible |
| 20 | `UnitPlaced` | 26 | `{seat_id, unit_instance_id, from_zone, from_index, to_zone, to_index}` — `preparation.mjs:630` | gate RENDERER |
| 21 | `ShopLocked` | 27 | `{seat_id, locked}` — `preparation.mjs:455` | gate RENDERER |
| 22 | `PhaseChanged` | 28 | `{from_phase, to_phase}` — `preparation.mjs:667` (`'Preparation' → 'Battle'`) | gate RENDERER |

**Fait à retenir : les 11 Events de combat ne sont émis nulle part.** Aucun module Combat
n'existe (`ls engine/` : `eventlog · inputs · match · registry · replay · rng · serialize ·
state · transition · types` — aucun fichier de combat). Le seul `kind: 'Spawn'` du dépôt est
un placeholder de l'incrément 1, commenté comme tel. Ce document décrit donc un contrat à
implémenter, **pas un constat sur du code existant** — distinction que la suite n'oublie
jamais.

---

## 2. Le contrat « Renderer aveugle », vérifié

**Chemin A** — `02_CORE_RULES.md`, INV-5 : « Le Renderer ne lit JAMAIS le GameState. Il ne
consomme que l'Event Log ». `HUMANGATE_2026-07-19_RENDERER.md` a ratifié 3 Events + 6 champs
précisément parce que l'écran de préparation était indessinable sans eux.

**Chemin B** — `renderer/viewmodel.mjs:1-24` : le module se déclare aveugle, part de
conditions initiales connues et replie l'Event Log. Il n'importe aucun module moteur.

**Conséquence pour ce document — le critère de « manque »** : un champ manque si, sans lui,
le Renderer doit soit deviner, soit **ré-implémenter une règle du moteur**. Ce second cas
n'est pas théorique : `renderer/viewmodel.mjs:93-116` rejoue la règle de
`merge/merge.mjs::detectMerge` pour retrouver les 3 unités consommées, faute d'un champ, et
le commentaire du fichier qualifie lui-même la situation de « GENUINE GAP ». C'est le
précédent qui justifie de préférer un champ explicite à une reconstitution — et c'est aussi
pourquoi la simple « dérivabilité » d'un champ n'est PAS un argument suffisant pour l'omettre.

Trois niveaux sont donc distingués dans tout ce qui suit :

| Niveau | Signification |
|---|---|
| **MANQUE (dur)** | L'information est absente ET non reconstituable → l'animation est impossible |
| **MANQUE (mou)** | Reconstituable, mais seulement en rejouant une règle moteur ou en tenant un état → dette de type « GENUINE GAP » |
| **EXISTE** | Présent dans le payload documentaire |

---

## 3. Décomposition par animation

Hypothèse commune, valable pour les trois : le Renderer consomme le **segment de log d'UN
Combat**, qui commence par ses `Spawn` (phase C1 du CombatSetup, `04_COMBAT_BIBLE.md` Flux).
Il peut donc tenir une table `unit_instance_id → (cell, unit_definition_ref, side)` en
repliant `Spawn` puis `Move`. Tout ce qui est marqué « MANQUE (mou) » ci-dessous s'appuie sur
cette table.

### 3.A — Un archer tire, et on voit la flèche arriver dans celui qui la reçoit

| Besoin d'animation | Champ | Statut | Commentaire |
|---|---|---|---|
| Qui tire | `Attack.attacker_unit_instance_id` | EXISTE | |
| Qui reçoit | `Attack.target_unit_instance_id` | EXISTE | |
| D'où part la flèche | `Attack.attacker_cell` | MANQUE (mou) | reconstituable via `Spawn.cell` + `Move` du même segment |
| Où elle arrive | `Attack.target_cell` | MANQUE (mou) | idem |
| **Est-ce une flèche ou un coup ?** | `Attack.delivery` | **MANQUE (dur)** | rien dans le payload ne distingue distant et contact. Le Renderer devrait inférer la Range depuis la distance Manhattan entre les deux Cells — c'est-à-dire ré-encoder une règle de gameplay dans le rendu, exactement ce qu'INV-5 interdit en esprit |
| **Quand la flèche « arrive »** | `Damage.source_ref` | **MANQUE (dur)** | voir ci-dessous |
| Combien de temps elle vole | — | **NE DOIT PAS EXISTER** | choix Renderer (verbatim `VALUES_V0`) |
| Effet à l'impact (recul, chiffre) | `Damage.amount`, `Damage.target_health_after` | EXISTE | |

**Le point dur, démontré.** `Damage` porte déjà `source_kind` et `source_ref`
(`04_COMBAT_BIBLE.md`, payload `Damage`). Mais **aucun document du corpus ne dit ce que
`source_ref` référence** — ni la Combat Bible, ni les Core Rules, ni le Vocabulary
(vérifié par recherche sur les quatre documents). Or, sans cette définition, le cas suivant
est indécidable : deux archers attaquent la MÊME cible au MÊME Tick. Le log contient deux
`Attack` et deux `Damage`, tous quatre portant le même `target_unit_instance_id`. Le
Renderer ne peut appairer ni flèche ni impact — les deux flèches atterrissent au hasard de
son implémentation, ce qui casse le déterminisme visuel.
**Résolution v0** (portée en `04_COMBAT_BIBLE.md`) : `source_ref` = l'identité
`(combat_ref, tick, seq)` de l'Event causal. C'est une **définition due**, pas un champ
nouveau, et elle suppose que l'enveloppe `(combat_ref, tick, seq)` existe réellement — ce
qui n'est aujourd'hui le cas dans aucun Event émis (§6).

### 3.B — Une boule de feu explose

| Besoin d'animation | Champ | Statut | Commentaire |
|---|---|---|---|
| Qui lance | `Cast.caster_unit_instance_id` | EXISTE | |
| Quel sort (donc quel visuel) | `Cast.ability_ref` | EXISTE | c'est la clé de la table d'assets du Renderer — elle porte déjà « à quoi ça ressemble » |
| D'où part la boule | `Cast.caster_cell` | MANQUE (mou) | |
| **Où l'explosion a lieu** | `Cast.zone` ou `Cast.targets` | EXISTE, mais **inhomogène** | le payload documente « l'un des deux » : `zone` = ensemble de Cells (directement dessinable), `targets` = liste d'`unit_instance_id` (le Renderer doit résoudre chaque id → Cell). D'où `impact_cells`, forme unique |
| Forme unifiée de l'impact | `Cast.impact_cells` | MANQUE (mou) | égal à `zone` si zonale, aux Cells des `targets` sinon |
| La boule voyage-t-elle, ou apparaît-elle ? | `Cast.delivery` | MANQUE (mou) | dérivable de `ability_ref` via la table d'assets — contrairement à `Attack`, `Cast` porte déjà une clé de contenu. **Champ de confort, pas de nécessité** |
| Le moment de l'explosion | `Damage.source_ref` (`source_kind: Ability`) | **MANQUE (dur)** | même point qu'en 3.A |
| Qui est touché, combien | `Damage.*` par cible | EXISTE | un `Damage` par cible, tous rattachés au même `Cast` par `source_ref` |
| Ce qui meurt dans l'explosion | `Death` | EXISTE (nom) | `Death.source_ref` a le même besoin de définition |

Note de fidélité : l'ordre visuel « la boule part, puis explose, puis les cibles tombent »
est déjà porté par le pipeline lui-même — `Cast` en T9, ses `Damage` résolus dans la
ResolutionQueue de la phase, et les `Death` correspondants en **T7 du Tick suivant**
(`04_COMBAT_BIBLE.md`, note de flux : « aucune passe de Death n'existe après T9 »). Le
Renderer n'a rien à inventer ; il doit seulement accepter que le mort tombe au Tick d'après.
C'est un fait de simulation ratifié (QB-5), pas un artefact — et c'est un point de
**playtest** : à l'écran, cela peut se ressentir comme un retard.

### 3.C — Une unité joue une animation d'attaque au corps à corps

| Besoin d'animation | Champ | Statut | Commentaire |
|---|---|---|---|
| Qui frappe / qui encaisse | `Attack.attacker_unit_instance_id`, `.target_unit_instance_id` | EXISTE | |
| **Contact plutôt que projectile** | `Attack.delivery` | **MANQUE (dur)** | même champ qu'en 3.A, même raison |
| Orientation du coup | `Attack.attacker_cell`, `.target_cell` | MANQUE (mou) | il faut les deux Cells pour orienter le swing |
| Impact / hit-flash sur la cible | `Damage` rattaché | **MANQUE (dur)** (`source_ref`) | |
| Le coup peut-il rater ? | — | **N/A, et c'est un fait** | aucun tirage n'existe en Combat (CBT-9 : « Pas de hasard en Combat ») : une `Attack` de T5 produit toujours son `Damage` en T6. Aucun Event d'échec n'est nécessaire — c'est un des piliers de la fermeture du registre |
| Coup absorbé par un bouclier | `Damage.absorbed_by_shield`, `.target_shield_after` | MANQUE (dur pour le rendu) | sans eux, un coup entièrement absorbé est indiscernable d'un coup à 0 dégât : même `target_health_after`. Le Renderer ne peut pas montrer « le bouclier a tenu » |
| Déplacement vers la cible avant le coup | `Move.from_cell`, `.to_cell` | EXISTE | le CHEMIN entre les deux n'est pas simulé (v0, `04_COMBAT_BIBLE.md`) : le Renderer choisit sa trajectoire, c'est une liberté assumée, pas un manque |

---

## 4. La liste finale

Tous ces champs s'ajoutent à des Events **déjà au registre**. Aucun nom nouveau.
Types exprimés en formes structurelles — aucune valeur de gameplay.

| Event | Champ | Type | Pourquoi |
|---|---|---|---|
| `Attack` | `delivery` | énumération FERMÉE `{melee, projectile}` — **décoratif** | seul moyen pour un Renderer aveugle de choisir entre coup au contact et projectile sans ré-encoder la Range. N'affecte aucune résolution |
| `Attack` | `attacker_cell` | `Cell` (couple d'entiers `(x, y)`) | origine du trait / orientation du coup |
| `Attack` | `target_cell` | `Cell` | point d'impact visé |
| `Cast` | `caster_cell` | `Cell` | origine du sort |
| `Cast` | `impact_cells` | ensemble de `Cell` | forme UNIQUE de la surface d'impact, quelle que soit la forme déclarée (`targets` ou `zone`) — rend l'explosion dessinable sans résoudre chaque cible |
| `Cast` | `delivery` | énumération FERMÉE `{instant, projectile}` — **décoratif** | confort : `ability_ref` peut déjà porter l'information via la table d'assets. À retenir ou à couper selon le goût de Pierre |
| `Damage` | `source_ref` | identité d'Event `(combat_ref, tick, seq)` — **définition, pas ajout** | rattacher l'impact à son acte. Sans elle, deux attaques simultanées sur la même cible sont indiscernables |
| `Damage` | `source_unit_instance_id` | identifiant d'UnitInstance | l'auteur du coup, explicite — évite de remonter le log à chaque impact |
| `Damage` | `absorbed_by_shield` | entier ≥ 0 | distinguer « absorbé » de « encaissé » à l'écran |
| `Damage` | `target_shield_after` | entier ≥ 0 | jauge de bouclier dessinable — symétrique exact de `target_health_after`, déjà accepté |
| `Shield` | `target_shield_after` | entier ≥ 0 | même raison, à l'octroi |
| `Death` · `Heal` · `Shield` · `Buff` · `Debuff` | `source_ref` | identité d'Event | **même définition manquante** que `Damage.source_ref` — à fixer une seule fois pour les six |
| **tous les Events de combat** | `combat_ref`, `tick`, `seq` | identifiant · entier · entier | enveloppe déjà spécifiée par la bible, **implémentée nulle part** (§6). Sans `tick`, un Renderer ne peut même pas cadencer l'animation |

**Champs explicitement REFUSÉS** — les nommer est aussi utile que nommer les retenus :

| Champ refusé | Raison |
|---|---|
| durée de vol, vitesse du projectile, durée d'animation | le temps réel par Tick est un choix Renderer (verbatim `VALUES_V0`). Un moteur qui le fixerait sortirait de P1/P2 |
| trajectoire / points de passage d'un projectile | le vol est décoratif : aucune règle ne lit la trajectoire |
| `path` d'un `Move` | idem — aucune règle ne lit le chemin (v0 `04_COMBAT_BIBLE.md`). Le jour où une règle le lirait (attaque d'opportunité, terrain), ce serait un fait de simulation → gate |
| `is_critical`, `is_dodged`, `is_blocked` | aucun tirage n'existe en Combat (CBT-9). Ces champs décriraient une mécanique qui n'a jamais été ratifiée |
| un champ de « niveau sonore », « intensité », « écran qui tremble » | pur Renderer, hors Event Log |

---

## 5. Verdict explicite

**Une animation exige-t-elle un Event entièrement nouveau ? NON.**

Détail du raisonnement, animation par animation :

| Animation | Event nouveau requis ? | Ce qu'il faut à la place |
|---|---|---|
| Archer, flèche visible à l'arrivée | **NON** | `Attack.delivery` + 2 Cells + définition de `Damage.source_ref` |
| Boule de feu qui explose | **NON** | `Cast.impact_cells` (+ `caster_cell`) + définition de `Damage.source_ref` |
| Attaque au corps à corps | **NON** | `Attack.delivery` + 2 Cells + définition de `Damage.source_ref` (+ champs de Shield pour un coup absorbé) |

**Le registre reste CLOS à 22 noms.** La raison est que le vol des projectiles est
décoratif : il n'y a rien à observer entre l'acte et sa conséquence, donc rien à
journaliser. Le seul manque réellement bloquant n'est pas un Event ni même un champ neuf :
c'est la **définition de `source_ref`**, un champ déjà nommé dans la bible depuis le gate #3
et jamais spécifié.

Ce verdict tomberait si — et seulement si — une décision future rendait un projectile
interceptable, esquivable ou annulable en vol. Ce serait une décision de design, donc un
gate Pierre, jamais un ajout de champ.

---

## 6. Là où la documentation est MUETTE — signalé, pas comblé

Points où le corpus ne dit rien. Aucun n'est comblé ici par une réponse plausible.

1. **Ce que référence `source_ref`** — le champ apparaît dans six payloads
   (`Damage`, `Death`, `Heal`, `Shield`, `Buff`, `Debuff`) de `04_COMBAT_BIBLE.md` depuis le
   gate #3, et **aucun document ne dit ce qu'il pointe** : un Event ? une UnitInstance ? une
   Ability ? un Effect ? *(v0 par cohérence proposé en §3.A et porté dans la bible ; reste
   une résolution d'orchestrateur, pas une ratification.)*
2. **Forme exacte de `side_ref`** — `Spawn.side_ref` est décrit comme « `seat_index` du
   Player, ou référence de GhostBoard (`ghost_of_seat_index`) ; forme exacte → Technical
   Bible ». **La Technical Bible n'existe pas** (`ls bibles/` : aucun fichier Technical).
3. **Type concret d'une `Cell`** — la bible fixe « coordonnées entières `(x, y)` » (QB-1)
   mais jamais l'encodage (couple ? index linéaire ?). À noter : le code de Preparation
   utilise déjà un `board_index` **linéaire** (`preparation.mjs:630`, `to_index`), ce qui
   n'est pas la même chose qu'un couple `(x, y)`. **NON DOCUMENTÉ** — et potentiellement
   contradictoire.
4. **Un `Attack` produit-il toujours exactement un `Damage` ?** Le pipeline dit « les Events
   Damage des Attacks de T5 » (T6), sans le quantifier. Une Attack à montant nul, ou une
   Attack multi-cible, n'est ni prévue ni exclue. **NON DOCUMENTÉ.**
5. **Expiration d'un Shield / d'un Buff / d'un Debuff** — aucun Event de retrait n'existe et
   QB-9 dit « pas davantage ». Un Renderer ne peut donc PAS retirer une icône de buff : il
   la verrait apparaître sans jamais la voir disparaître. Conséquence connue et assumée,
   symétrique de la jauge de Mana (Human Notes de la Combat Bible). **NON DOCUMENTÉ.**
6. **Payload de `PairingResolved`** — propriétaire Decision Bible, qui l'annonce
   (« payload structurel : propriétaire Decision Bible, format → Technical Bible ») sans
   jamais le spécifier. **NON DOCUMENTÉ.**
7. **Nom de la phase qui suit un Combat** — `PhaseChanged` porte `'Preparation' → 'Battle'`
   (`preparation.mjs:663-669`) ; rien ne documente la sortie de `'Battle'`, et
   `transition.mjs:46` n'en sort jamais. **NON DOCUMENTÉ**, propriétaire Core Rules.
8. **Où `combat_ref` est attribué** — l'enveloppe l'exige (« identifiant du Combat dans le
   Round ») ; aucun document ne dit qui le fabrique ni sous quelle forme. **NON DOCUMENTÉ.**

### Divergences déclaré ↔ implémenté (chemin A vs chemin B)

| # | Déclaré (bibles) | Implémenté (code) | Gravité |
|---|---|---|---|
| D1 | Enveloppe d'Event : champ `event` (`04_COMBAT_BIBLE.md`, version antérieure) | discriminant `kind` — `engine/eventlog.mjs:11`, `engine/registry.mjs:45-53`, et les 13 sites d'émission de `preparation/preparation.mjs` (comptés : `grep -c "kind: '"` → 13) | **corrigée dans la bible v0** (le code est mergé et poussé ; la bible s'aligne) |
| D2 | Enveloppe `combat_ref` / `tick` / `seq` obligatoire sur tout Event de combat | **aucun Event émis ne les porte** | à implémenter — pas une contradiction, un reste à faire. `seq` matérialise l'ordre total DP-1 : sans lui, CBT-3 n'est pas vérifiable |
| D3 | `Spawn` = payload de combat en 7 champs | `engine/transition.mjs:38-41` émet `{kind:'Spawn', inputKind}` — **aucun champ commun** | placeholder assumé de l'incrément 1 (commenté « Placeholder event »), mais il **passe le contrôle fail-hard** : `assertKnownEvent` ne valide que le NOM, jamais le payload. CBT-5 (« payload non conforme = échec fail-hard ») n'a donc **aucune implémentation** à ce jour |
| D4 | `Cell` = couple d'entiers `(x, y)` (QB-1) | `board_index` linéaire côté Preparation (`preparation.mjs:630`) | à réconcilier avant le premier `Move` |
| D5 | Bench = 9 places (gate RENDERER) | `params.v0.mjs:11` `BENCH_CAPACITY = 9`, importé par `preparation.mjs:15` | **résolue** — vérifiée, l'alignement demandé par le gate est fait |

D3 est le point le plus lourd pour la suite : **la validation de payload n'existe pas**.
`appendEvent` (`engine/eventlog.mjs:9-15`) appelle `assertKnownEvent(event.kind)` et rien
d'autre. Tous les champs listés en §4 sont donc, en l'état, non contrôlables par le moteur —
ils dépendent d'un oracle qui reste à écrire (hook CBT-5).

---

## Sources

| Affirmation | Chemin A (documents) | Chemin B (code / exécution) |
|---|---|---|
| Registre = 22 noms | `02_CORE_RULES.md` §Événements · `00_VOCABULARY.md` entrée *Event* | `node -e` sur `engine/registry.mjs` → 22 |
| Registre passé de 19 à 22 | `HUMANGATE_2026-07-19_RENDERER.md` (verbatim Pierre) | commentaire `engine/registry.mjs:4-5` |
| Renderer aveugle | `02_CORE_RULES.md` INV-5 | `renderer/viewmodel.mjs:1-24` (aucun import moteur) |
| Coût d'un champ omis | — | `renderer/viewmodel.mjs:93-116` (« GENUINE GAP ») |
| Aucun Event de combat émis | `COMBAT_GATE_PREP.md` §1 (incrément Combat non dispatché) | `grep "kind: '"` sur `preparation/` + `engine/` → 13 sites, aucun de combat |
| Temps réel = choix Renderer | `HUMANGATE_2026-07-19_VALUES_V0.md` (verbatim + calcul) | — |
| Pas de hasard en Combat | `04_COMBAT_BIBLE.md` CBT-9 · `03_DECISION_BIBLE.md` DEC-3 | — |
| Noms de phase | gate RENDERER | `preparation/preparation.mjs:663-669`, `engine/transition.mjs:46` |
| Payload non validé | `04_COMBAT_BIBLE.md` CBT-5 (exigence) | `engine/eventlog.mjs:9-15` (nom seul) |

```
software_verdict: OK          (document produit ; registre recompté par exécution = 22 ; 5 divergences déclaré↔implémenté relevées, 1 déjà résolue)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
