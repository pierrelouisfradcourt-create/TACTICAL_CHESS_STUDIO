# Balance Bible — Auto Battler (DRAFT)

**Statut : DRAFT PROPOSE-ONLY — cycle de gates Pierre requis avant toute opposabilité.**
Date : 2026-07-20 · Auteur : Opus (sous-agent) · Cycle : gate 1 BAS V2 (P0, REC-0/REC-1).
**Gabarit** : `00_TEMPLATE.md` · **Termes** : `00_VOCABULARY.md`.
**Source** : patron BAS (`docs/audit/FORGE_BALANCE_ASSURANCE_SYSTEM_AUDIT_V2.md` — P2/P5, L1) pour
le SCHÉMA ; `params.v0.mjs` + `content/units.v0.mjs` pour les VALEURS réelles ; Economy/Meta
Bibles pour la propriété (P10 — « Balance possède coefficients, formules, constantes »).

---

# Objectif

Cette bible est le **propriétaire des VALEURS d'équilibrage** que les autres bibles déclarent
en schéma et laissent TBD (Economy P10, Core Rules, Combat). Elle produit surtout
l'**ENVELOPPE DE GÉNÉRATION opposable** : l'ensemble des bornes arithmétiques qu'un contenu
paramétrique (unités générées : stats, coûts, mots-clés, tribus) doit respecter pour être
recevable. C'est **l'entrée de la ligne L1** du BAS (P5 de l'audit) : contenu hors-enveloppe
⇒ **FAIL dur au build**, déterministe, faux positifs quasi nuls (assertion arithmétique).

Ce que l'enveloppe **n'est PAS** (CORRECTION 1 de l'audit V2) : ce n'est pas une matrice
importée d'un autre jeu ni la matrice Chess TCG d'avril. C'est une enveloppe **DÉRIVÉE DU
CONTENU RÉEL de CE jeu** (les 15 unités v0) et de ses axes de coût. Elle documente ce qui
existe déjà et le rend vérifiable ; elle ne prétend aucun équilibre « juste » — seulement des
bornes de recevabilité.

Elle ne gouverne PAS :
- les **objectifs** de méta (Meta Bible OBJ-n) — l'enveloppe borne la GÉNÉRATION, la Meta juge le MÉTA ;
- les **règles** (Core Rules, Combat, Decision) — l'enveloppe ne définit aucune règle, seulement des valeurs et des bornes ;
- les **budgets de création DSL** (DSL Bible) — l'enveloppe consomme les axes, la DSL les contraint en amont.

# Invariants

- **BAL-1 — Toute valeur d'équilibrage a un propriétaire unique et une source déclarée.**
  Chaque constante vit à UN seul endroit (INV-8 / ECO-2 : source unique de vérité) et porte
  sa source (code / TFT / HSBG / calcul / CHOIX DESIGN). Une valeur sans source est irrecevable.
- **BAL-2 — L'enveloppe est ARITHMÉTIQUE et déterministe.** Toute borne est une inégalité
  calculable sur les champs du contenu (rank, hp, attack, cadence, range, keywords). Aucun
  jugement, aucune LLM. Faux positifs quasi nuls (CORRECTION 3 : cassage prouvé-moteur = gate).
- **BAL-3 — Monotonie par palier de coût.** À l'intérieur d'un même axe, la puissance
  attendue est **monotone non décroissante** avec le rank : un rank supérieur ne doit pas être
  strictement plus faible sur TOUS les axes à la fois (sinon l'unité est morte-née — dominée).
- **BAL-4 — Puissance BORNÉE par palier.** Chaque axe a un plancher et un plafond par rank :
  une unité ne peut ni être hors-budget vers le haut (dépasser le plafond de son rank) ni
  sous le plancher (contenu inutile). Bornes = §Paramètres.
- **BAL-5 — Combinaisons interdites explicites.** Certaines conjonctions de mots-clés/stats
  sont interdites par construction (§Paramètres, table des combos). Un contenu qui les porte
  ⇒ FAIL dur.
- **BAL-6 — L'enveloppe est ADVISORY sur le MÉTA, GATE sur la GÉNÉRATION.** Dépasser
  l'enveloppe bloque le build (déterministe). Une suspicion de dominance en jeu (statistique)
  ne bloque JAMAIS via cette bible : elle remonte en advisory (L2, Meta Bible META-2).

# Concepts

- **Axe de coût** — une dimension mesurable de la puissance d'une unité, dérivée de ses
  champs de combat. Les axes de ce jeu (dérivés de `04_COMBAT_BIBLE.md` et du contenu v0) :
  **survie** (hp), **dégâts bruts** (attack), **débit** (attack / cadence), **portée**
  (range), **mobilité** (move_speed), **mots-clés** (poids par keyword), **synergie**
  (montants TRIBE_BOOST). Le RANG (1..5) est l'axe de coût maître : `rank === Buy cost`.
- **Enveloppe** — l'ensemble des bornes (plancher, plafond) par axe et par rank, plus la
  table des combinaisons interdites.
- **Budget de puissance d'un rank** — la fenêtre `[min, max]` admissible d'un score de
  puissance agrégé pour une unité de ce rank.

# Paramètres

**LE SCHÉMA VIENT DU PATRON BAS. LES VALEURS SONT PROPOSÉES depuis le contenu réel.** Toutes
les bornes ci-dessous sont des **PROPOSITIONS DRAFT** : elles sont dérivées des 15 unités v0
existantes (elles les englobent par construction) et restent calibrables par simulation.

## Score de puissance (proposition de forme, calibrable)

Score agrégé d'une unité, servant à BAL-3/BAL-4 (forme proposée, coefficients calibrables) :

```
power(u) = hp
         + attack × (base_ticks / attack_cadence)      # débit ~ dégâts sur une fenêtre
         + range × RANGE_WEIGHT
         + move_speed × MOVE_WEIGHT
         + Σ keyword_weight(k)                          # table des poids ci-dessous
         + Σ tribe_boost_amount                         # attack+health cédés à la tribu
```
Coefficients proposés (calibrables, DRAFT) : `base_ticks = 10`, `RANGE_WEIGHT = 40`,
`MOVE_WEIGHT = 30`. **Ces coefficients sont un point de départ** — la calibration (P3) les
ajuste ; leur seul rôle DRAFT est de rendre BAL-3/BAL-4 calculables.

## Poids des mots-clés (proposition, dérivée de la sémantique en code)

| Mot-clé (code) | Poids proposé | Justification |
|---|---|---|
| TAUNT (Provocation) | 30 | force le ciblage, survie d'équipe |
| DIVINE_SHIELD (Bouclier divin) | 60 | annule un coup entier |
| POISON (Venimeux) | 120 | tue n'importe quelle cible en un coup — le plus fort |
| WINDFURY (Furie des vents) | attack × 5 | double les attaques → proportionnel au débit |
| REBORN (Renaissance) | hp × 0.3 | seconde vie à 1 PV → survie partielle |
| DEATHRATTLE_BUFF | attack_bonus + health_bonus | valeur cédée à mort |
| TRIBE_BOOST (Meneur) | (attack+health) × alliés_tribu_max | valeur d'équipe, plafonnée par la taille de tribu |

Ces poids sont **PROPOSÉS** (aucune source externe ne les chiffre : CHOIX DESIGN calibrable) ;
ils existent pour que l'enveloppe soit calculable, pas pour prétendre un équilibre.

## Bornes de puissance par rank (enveloppe — DRAFT, englobe le contenu v0)

Fenêtres proposées `[plancher, plafond]` du score `power(u)` agrégé, dérivées des 15 unités
réelles (chaque unité v0 tombe dans la fenêtre de son rank par construction) :

| Rank (= coût) | Plancher | Plafond | Ancrage sur le contenu v0 réel |
|---|---|---|---|
| 1 | 300 | 700 | Piquier/Éclaireur/Frondeur (hp 260-420, attack 30-40) |
| 2 | 500 | 950 | Arbalétrier/Hallebardier/Homme d'Armes (hp 340-560) |
| 3 | 750 | 1300 | Chevalier/Archer d'Élite/Templier (hp 400-780) |
| 4 | 1050 | 1700 | Mage de Guerre/Chef de Guerre/Rôdeur (hp 440-700, attack 70-110) |
| 5 | 1500 | 2600 | Dragon/Golem/Archimage (hp 620-1600, attack 130-175) |

**Ces bornes sont des PROPOSITIONS** : elles sont volontairement larges (englobent le v0 avec
marge) et se resserrent par calibration. Leur usage L1 : une unité générée dont le score sort
de `[plancher_rank, plafond_rank]` ⇒ **FAIL dur au build**. Monotonie (BAL-3) vérifiée :
plancher et plafond croissent strictement avec le rank.

## Combinaisons interdites (BAL-5 — proposition)

| Combo interdit | Raison |
|---|---|
| POISON + range ≥ 4 + WINDFURY | tueur à distance qui frappe 2×/cycle = intouchable, casse le combat |
| DIVINE_SHIELD + REBORN + TAUNT sur rank ≤ 2 | mur quasi immortel à coût faible = dominance de tempo |
| TRIBE_BOOST cumulé > (plafond_rank × 0.5) sur une seule unité | un meneur qui vaut plus que la moitié de son plafond en synergie seule |
| power(u) hors `[plancher_rank, plafond_rank]` | hors budget (BAL-4) — le combo générique |

Ces interdits sont **PROPOSÉS** : le contenu v0 les respecte (à vérifier au gate). Ils sont
l'expression opérationnelle de « une idée casse » que le moteur doit prouver.

## Valeurs d'équilibrage possédées (renvoi VALUES_PROPOSAL)

Toutes les constantes économiques et de combat dont la Balance Bible est propriétaire
(Economy P10, Combat) sont **déjà en code** et documentées dans
`VALUES_PROPOSAL_2026-07-20.md` (tables 1-4). Cette bible ne les recopie pas : elle en est le
propriétaire déclaré et renvoie à ce document pour la liste chiffrée, sourcée ligne à ligne.

# Points de décision

**Néant** — la Balance Bible ne décide rien en partie (aucun DP moteur). Ses « décisions »
sont les **leviers de maintenance** appliqués APRÈS un advisory de méta, dans l'ordre ratifié
V1 : **comportements → interactions → statistiques** (jamais l'inverse). Ces leviers sont
humains (HumanGate), jamais automatiques.

# Flux

```text
Meta cible (OBJ-n)  →  Budgets DSL  →  Contenu généré
                                          │
                                          ▼
                        L1 : ENVELOPPE (cette bible) — power(u) ∈ [plancher, plafond] ?
                                          │  combos interdits ?
                              ┌───────────┴───────────┐
                          conforme                hors-enveloppe
                              │                        │
                        build continue           FAIL DUR au build (déterministe)
                              ▼
                     s10a oracles (solvabilité + mutation + gardes)
```

# Événements

**Néant** — la Balance Bible n'émet aucun Event (P10 : les valeurs ne sont pas des Events).
Elle fournit les nombres que les Events économiques/combat transportent, jamais un nom ni un
payload.

# Oracle Hooks (déterministes, non-LLM — l'entrée de L1)

- **BAL-4 — check enveloppe (fail-hard au build)** : pour chaque UnitDefinition générée,
  `power(u)` calculé ; hors `[plancher_rank, plafond_rank]` ⇒ FAIL. Fixture de contrôle :
  une unité à `power` = plafond+1 doit rougir ; une unité conforme doit passer.
- **BAL-3 — check monotonie** : plancher et plafond strictement croissants par rank ; un
  contenu où un rank N+1 a un plafond ≤ rank N ⇒ FAIL (enveloppe malformée).
- **BAL-5 — check combos interdits** : toute UnitDefinition portant un combo de la table ⇒
  FAIL. Fixture : une unité POISON+range5+WINDFURY doit rougir.
- **BAL-1 — lint de source** : toute constante d'équilibrage référencée sans source
  déclarée ⇒ défaut documentaire.

# Simulation Hooks

L'enveloppe est **calibrée** par les Campaigns (P3) : les bornes larges du DRAFT se resserrent
quand les simulations montrent qu'une fenêtre laisse passer un contenu cassé. Aucune Campaign
ne modifie une borne automatiquement (META-3 : seuils par gate).

# DSL Hooks

Les axes de coût de cette enveloppe sont exactement les attributs que la **DSL Bible** expose
en création (P8). Un attribut hors whitelist DSL ne peut pas entrer dans `power(u)` — les deux
bibles partagent la même liste close d'axes.

# Human Notes

- **L'enveloppe ne prouve pas le fun.** Elle prouve seulement qu'un contenu n'est pas
  arithmétiquement cassé. Un jeu entièrement dans l'enveloppe peut être plat — c'est le
  domaine du playtest et de la Meta (advisory), pas de cette gate.
- **Les coefficients et poids sont des intentions datées**, calibrables ; le DRAFT les pose
  larges exprès pour ne rien rejeter du v0 avant que Pierre ne resserre.
- **Contenu à contenu** : ajouter une unité = la faire passer par cette enveloppe (§Content
  Bible). L'enveloppe est le seul point d'entrée du contenu paramétrique.

---

*Fin du DRAFT PROPOSE-ONLY. Enveloppe dérivée des 15 unités v0 ; 6 invariants BAL-1..6 ;
bornes et poids PROPOSÉS et calibrables ; aucun claim d'équilibre.*
