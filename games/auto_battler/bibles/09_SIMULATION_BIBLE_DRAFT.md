# Simulation Bible — Auto Battler (DRAFT)

**Statut : DRAFT PROPOSE-ONLY — cycle de gates Pierre requis avant toute opposabilité.**
Date : 2026-07-20 · Auteur : Opus (sous-agent) · Cycle : gate 1 BAS V2 (P0, ligne L2).
**Gabarit** : `00_TEMPLATE.md` · **Termes** : `00_VOCABULARY.md`.
**Source** : patron BAS (`FORGE_BALANCE_ASSURANCE_SYSTEM_AUDIT_V2.md` — P3/P5, L2) pour la
structure d'agents-sondes et la calibration ; `06_META_BIBLE.md` (OBJ-1..10 + E1-E3, les
protocoles y sont RÉFÉRENCÉS et pré-enregistrés ICI) ; `03_DECISION_BIBLE.md` (phases,
DP-1..9) ; `knowledge_base/role_sim.mjs` (cadre de mesure réutilisé).

> **⚠️ AVERTISSEMENT STRUCTURANT (CORRECTION 2 de l'audit V2) :**
> **La ligne L2 entière est CONDITIONNÉE au chantier « agent-à-niveau », qui est un
> RISQUE DE RECHERCHE non résolu.** Le studio sait fabriquer des agents qui COMPLÈTENT une
> partie (solvabilité, prouvé) ; il n'a JAMAIS su fabriquer un agent qui JOUE À NIVEAU (la
> seule tentative sérieuse, Rocky, est un échec gelé). Or toute mesure de skill/dominance de
> cette bible REPOSE sur cet agent. **Rien ci-dessous n'est mesurable tant que le premier test
> falsifiable de L2 — « un agent plafond bat la baseline aléatoire d'un écart pré-déclaré sur
> un jeu-témoin » — n'est pas PROUVÉ.** Ce DRAFT spécifie les protocoles ; il ne promet pas
> qu'on saura les exécuter. L2 peut être reportée ou abandonnée (précédent Rocky).

---

# Objectif

Cette bible **pré-enregistre les protocoles de mesure** que la Meta Bible référence (META-1,
champ « Protocole »). Elle définit : (a) la **structure d'agents-sondes**, (b) les
**matrices-cible de méta** avec les valeurs OBJ-n proposées et leurs **bandes attendues**,
(c) le **protocole de calibration** (rejet d'agent, rejet de métrique). Toute sortie est
**ADVISORY** (META-2 / P7 : l'Oracle valide, la Simulation explore). Elle ne gate jamais un
merge.

# Invariants

- **SIM-1 — Pré-enregistrement strict (META-3).** Tout protocole et tout seuil sont figés
  (sha gelé) AVANT la Campaign. Une métrique lue puis un seuil ajusté = irrecevable.
- **SIM-2 — Tout rapport consigne version + force des Bots (META-4).** Une Campaign sans ces
  champs est nulle comme mesure.
- **SIM-3 — Advisory strict (META-2).** Aucune sortie de cette bible n'est un `software_verdict`.
- **SIM-4 — Calibration obligatoire AVANT toute mesure de vrai jeu (P3).** Une sonde
  non calibrée (n'a pas passé le rejet-d'agent + rejet-de-métrique) ne mesure rien.
- **SIM-5 — L2 conditionnée à l'agent-à-niveau.** Si le test falsifiable « plafond bat
  baseline » échoue, la chaîne P3→L2 est BLOQUÉE ; aucun résultat de skill n'est produit.

# Concepts

- **BotPolicy** *(Vocabulary)* — politique de décision d'un Seat automatisé (DP-8). Versionnée,
  de force déclarée (META-4).
- **Agent-qui-COMPLÈTE** vs **Agent-qui-JOUE-À-NIVEAU** (distinction imposée par l'audit V2) :
  le premier finit une partie légalement (prouvé — `solvability.mjs`) ; le second joue assez
  fort pour que le winrate mesure du SKILL, pas du bruit (JAMAIS démontré au studio).
- **Sonde (probe)** — une BotPolicy dont on a volontairement **ablé** la compétence d'UNE phase
  pour isoler la contribution de cette phase au résultat.
- **Campaign** *(Vocabulary)* — batch de Matchs à Seeds déclarés, produisant les métriques
  advisory.

# Paramètres

## Structure d'agents-sondes : `2 + n_phases` (patron BAS)

Les **phases de décision déclarées** (dérivées de `03_DECISION_BIBLE.md` §Flux L288-308, où
un Seat DÉCIDE) sont **3** :

| Phase | Décisions du Seat | DP concernés | Objectif méta associé |
|---|---|---|---|
| **P-ÉCO** (économie) | Buy, Sell, Reroll, LevelUp, Lock | DP-5, DP-9 | OBJ-10, OBJ-E1..E3 |
| **P-COMP** (composition) | quelles Units garder, cibles de Merge, synergie de tribu | DP-4 | OBJ-1, OBJ-5, OBJ-9 |
| **P-PLACE** (placement) | positions sur le Board | (aucun DP — choix Player) | OBJ-3 |

Donc **`2 + 3 = 5` agents-sondes** :

1. **BASELINE** — BotPolicy qui joue des Inputs LÉGAUX ALÉATOIRES (complète, ne joue pas). Le
   plancher de bruit. **Existe déjà en substance** (`solvability.mjs` bot greedy en est proche).
2. **PLAFOND** — la meilleure BotPolicy heuristique atteignable (économie + composition +
   placement compétents). **C'est l'agent-à-niveau — le chantier de recherche à risque.**
3. **SONDE-ÉCO** — plafond SAUF sur P-ÉCO (décisions éco aléatoires). Isole le skill économique.
4. **SONDE-COMP** — plafond SAUF sur P-COMP. Isole le skill de composition.
5. **SONDE-PLACE** — plafond SAUF sur P-PLACE (placement aléatoire). Isole le skill de placement.

**Métrique de skill par phase** (pré-enregistrée) :
```
skill(phase_i) = winrate(PLAFOND vs BASELINE) − winrate(SONDE_i vs BASELINE)
```
Une phase dont le skill ≈ 0 est une phase où jouer bien ne paie pas (décision « évidente » —
anti-objectif OBJ-E1). Une phase au skill dominant écrase les autres.

> **Note L2 :** cette métrique n'a de sens que si PLAFOND bat significativement BASELINE. Si
> `winrate(PLAFOND vs BASELINE) ≈ 50%`, l'agent plafond ne joue pas mieux que le hasard ⇒
> **rejet d'agent (SIM-4), L2 bloquée** — exactement le point de risque de la CORRECTION 2.

## Matrices-cible de méta — valeurs OBJ-n PROPOSÉES et bandes attendues

Valeurs proposées (détail et sources : `VALUES_PROPOSAL_2026-07-20.md` table 5). **ADVISORY**.
Les seuils sont des **cibles de mesure**, jamais des constantes de jeu. « Bande attendue » =
la fourchette où l'on JUGE le méta sain ; hors bande = advisory → HumanGate.

| OBJ | Métrique | Cible proposée | Bande attendue | Nature de la valeur |
|---|---|---|---|---|
| OBJ-1 | # archetypes viables simultanés | ≥ 4 | [4, 8] | SOURCE (4 tribus) + design sur seuil |
| OBJ-2 | durée du Match | 20–30 min | [18, 32] min | Ratifié V1 |
| OBJ-3 | part du Placement (permutation) | ≈ 30% | [20%, 40%] | Ratifié V1 |
| OBJ-5 | Pivots / Match (médian) | ≥ 1, ≤ 3 | [1, 3] | CHOIX DESIGN PUR |
| OBJ-7 | winrate max / archetype | ≤ 25% | [12.5%, 25%] | CALCUL (1/8 = espérance) + design |
| OBJ-9 | usage min / UnitDefinition | ≥ 5% présence armée finale | ≥ 5% | CHOIX DESIGN PUR |
| OBJ-10 | poids éco vs placement | comparable | skill(P-ÉCO) ≈ skill(P-PLACE) à ±10 pts | CHOIX DESIGN (métrique via sondes) |
| OBJ-E1 | tension décisionnelle éco | politiques divergent | divergence ≥ seuil TBD | CHOIX DESIGN, conditionné L2 |
| OBJ-E2 | dominance passive | passive ne domine pas | winrate(passive) ≤ winrate(active) | CHOIX DESIGN, conditionné L2 |
| OBJ-E3 | répartition dépense Gold | aucun usage écrasant/mort | chaque usage ∈ [10%, 60%] de la dépense | CHOIX DESIGN PUR |

## Matrice de dominance (win-rate par archetype × archetype)

Structure pré-enregistrée (valeurs produites par Campaign, non inventées) : une matrice
`archetype_i vs archetype_j → winrate`. Signal de méta RÉSOLU : une ligne dont tous les
winrates > OBJ-7 (dominance permanente, anti-objectif V1). **ADVISORY** — sonne le game master
sur ses itérations post-démo (CORRECTION 3), ne juge pas la première sortie.

# Points de décision

**Néant** — la Simulation ne décide rien dans le moteur (comme la Meta). Ses « décisions »
sont les rejets méthodologiques (rejet d'agent / rejet de métrique), humains et pré-déclarés.

# Flux

```text
P0 valeurs remplies (VALUES_PROPOSAL, gate Pierre)
   → P1 : agent-à-niveau PROUVÉ ?  ── NON ──▶ L2 BLOQUÉE / reportée (SIM-5, précédent Rocky)
        │ OUI
        ▼
   P3 : calibration (rejet d'agent + rejet de métrique, sha gelé)
        ▼
   Campaign (BASELINE + PLAFOND + 3 sondes, versions/forces consignées — SIM-2)
        ▼
   Métriques OBJ-n + matrice de dominance  ──ADVISORY──▶ HumanGate (jamais un gate de merge)
        ▼
   [POST-DÉMO] radar de platitude sur les itérations du game master (CORRECTION 3)
```

# Événements

**Néant** — la Simulation n'émet aucun Event moteur. Ses métriques se CALCULENT en aval, sur
l'Event Log existant (GoldChanged, UnitBought, ShopRolled, Move, Attack, Death, Victory,
PairingResolved…) et les snapshots (P1/INV-4, replay bit-exact — cf. knowledge_packet :
Event Sourcing + Deterministic Replay).

# Oracle Hooks (déterministes — la calibration, P3)

- **SIM-4a — REJET D'AGENT** : sur un jeu-témoin à profondeur connue (sha gelé), si le
  PLAFOND ne bat pas la BASELINE d'un écart **pré-déclaré** (proposition DRAFT : ≥ +15 points
  de winrate au-dessus de l'espérance), l'agent est REJETÉ. **C'est le premier test
  falsifiable de L2.** Sans lui, aucune mesure de skill n'est recevable.
- **SIM-4b — REJET DE MÉTRIQUE** : une métrique doit **rougir** sur une pathologie plantée
  (unité ×10 de stats, OTK forcé, boucle Gold cassée) ET **rester verte** sur le témoin sain.
  Une métrique qui ne rougit jamais (ex. bande `[1,999]` du role_sim gardien — une « métrique
  à rejeter » citée par l'audit) est éliminée.
- **SIM-1 — audit de pré-enregistrement** : tout seuil mesuré référence un sha figé antérieur
  au lancement de la Campaign.
- **SIM-2 — schéma de rapport** : version + force des BotPolicies présentes, sinon rapport nul.

# Simulation Hooks (les métriques à savoir produire — miroir Meta L313-339)

Une ligne par objectif du registre Meta ; toutes advisory. Reprises telles quelles des
Simulation Hooks de `06_META_BIBLE.md` (OBJ-1..10, E1..E3) — cette bible en est l'exécutant.
Le protocole OBJ-3 (permutation des Placements, re-sim à Placements permutés) est rendu
possible par P1/INV-4 (simulation pure, replay bit-exact — knowledge_packet, Redux/lockstep).

# Human Notes

- **Le méta est un jugement autant qu'une mesure** (Meta Bible) : une matrice entièrement dans
  les bandes ne prouve pas que le jeu est bon.
- **Bot-méta ≠ méta humain** : ce que des BotPolicies découvrent n'est pas ce que des humains
  joueront. La transférabilité est un jugement, pas une déduction.
- **Le risque L2 est réel et acté** : si l'agent-à-niveau ne se fabrique pas, cette bible reste
  un plan non exécuté — et c'est une issue admissible (l'honnêteté de l'audit V2), pas un échec
  de la Forge. Ne jamais présenter une métrique de skill produite par un agent non calibré.

---

*Fin du DRAFT PROPOSE-ONLY. Structure 2+3 sondes ; matrices OBJ-n avec cibles PROPOSÉES et
bandes ; calibration rejet-agent/rejet-métrique. L2 explicitement conditionnée au chantier
agent-à-niveau (risque de recherche non résolu).*
