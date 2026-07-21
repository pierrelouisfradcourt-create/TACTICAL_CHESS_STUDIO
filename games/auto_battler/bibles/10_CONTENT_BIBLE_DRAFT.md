# Content Bible — Auto Battler (DRAFT)

**Statut : DRAFT PROPOSE-ONLY — cycle de gates Pierre requis avant toute opposabilité.**
Date : 2026-07-20 · Auteur : Opus (sous-agent) · Cycle : gate 1 BAS V2 (P0).
**Gabarit** : `00_TEMPLATE.md` · **Termes** : `00_VOCABULARY.md`.
**Source** : patron BAS (`FORGE_BALANCE_ASSURANCE_SYSTEM_AUDIT_V2.md` — le critère de
déclenchement = « le jeu produit-il du CONTENU PARAMÉTRIQUE ? ») ; `content/units.v0.mjs`
(le contenu réel) ; Meta Bible (le contenu s'écrit CONTRE les objectifs, P9) ; Balance Bible
DRAFT (tout contenu passe l'enveloppe 08).

---

# Objectif

Cette bible est propriétaire du **CONTENU chiffré** : les UnitDefinitions (stats, coûts,
mots-clés, tribus) et l'attribution de Rarity. Elle sert deux fonctions BAS :

1. **Le CRITÈRE DE DÉCLENCHEMENT.** Le BAS ne s'active que pour un jeu qui **produit du
   contenu paramétrique INVENTÉ** (audit : Chess TCG / AutoBattler / Leviathan oui ;
   Belote / échecs non). Cette bible **répond formellement à cette question** pour l'auto
   battler : OUI, il génère du contenu paramétrique (15 unités, 4 tribus, 7 mots-clés) ⇒
   **L1 (enveloppe) EST actif pour ce jeu.** C'est l'inventaire qui déclenche la ligne L1.
2. **La RÈGLE D'AJOUT.** Tout nouveau contenu passe l'enveloppe 08 (Balance) avant d'entrer.

Elle ne gouverne PAS : les **valeurs d'équilibrage** finales (Balance possède les
constantes — mais le contenu v0 les porte déjà, cf. Human Notes) ; les **règles** des
mots-clés (Combat/DSL) ; les **objectifs** (Meta).

# Invariants

- **CON-1 — Tout contenu est paramétrique et déclaratif.** Une UnitDefinition est un
  enregistrement de champs (id, name, rank, tribe, keywords, hp, attack, cadence, range,
  move_speed, delivery, description) ; le moteur ne voit qu'un `unit_def_id` opaque (P11,
  content-agnostic). Aucun comportement codé en dur par unité.
- **CON-2 — Tout contenu passe l'enveloppe (BAL-4/BAL-5).** Une UnitDefinition dont
  `power(u)` sort de la fenêtre de son rank, ou qui porte un combo interdit, est
  IRRECEVABLE — FAIL dur au build (déterministe). C'est le lien Content→L1.
- **CON-3 — Source unique de vérité.** Chaque valeur de contenu vit à UN endroit
  (`content/units.v0.mjs`) ; `rank === Buy cost` (dérivé, pas dupliqué). L'ajout d'une unité
  ne doit jamais exiger l'édition d'une seconde liste (Pool, odds, labels sont dérivés).
- **CON-4 — Le contenu s'écrit CONTRE les objectifs (P9).** Un ajout de contenu vise un
  objectif de méta déclaré (Meta OBJ-n), jamais l'inverse. Un contenu qui n'existe que « parce
  qu'il est cool » sans cible de méta est signalé (advisory).
- **CON-5 — Différenciation à rank égal.** À rank égal, les UnitDefinitions sont
  DIFFÉRENCIÉES (une lente résistante, une rapide fragile, une à distance) — asserté par test
  (`properties.i25*.test.mjs`), pas laissé aux bonnes intentions. Sans quoi un Reroll ne
  choisit rien (D1, `units.v0.mjs:12-17`).

# Concepts

- **Contenu PARAMÉTRIQUE (généré/inventé)** — ce qui déclenche le BAS : valeurs inventées
  qu'aucune règle officielle ne fixe. Pour ce jeu : stats d'unités, montants de mots-clés,
  compositions de tribu, tables d'odds.
- **Contenu FIXE (règle, non paramétrique)** — la sémantique des mots-clés, la géométrie du
  Board, la liste close des Events : hors champ BAS (ce sont des règles, propriété
  Combat/Core Rules/DSL).
- **UnitDefinition** *(Vocabulary)* — l'unité de contenu paramétrique.
- **Tribu** — regroupement de synergie ; modèle « meneur » (TRIBE_BOOST), PAS paliers de
  comptage (choix v0, HSBG, `units.v0.mjs:47-48`).

# Paramètres — inventaire du contenu (généré vs fixe)

## Contenu PARAMÉTRIQUE (généré/inventé) → SOUS enveloppe 08

Tout ce qui suit est **déjà en code** (`content/units.v0.mjs`), déclaré « v0 PROVISOIRE,
matière première à juger en jouant ». La proposition = le documenter et le soumettre à
l'enveloppe.

| Catégorie | Contenu réel v0 | Champs paramétriques | Source |
|---|---|---|---|
| **UnitDefinitions** | 15 unités (3 par rank 1..5) | hp, attack, attack_cadence, range, move_speed, delivery, keywords, tribe | DÉJÀ EN CODE `units.v0.mjs:140-375` |
| **Tribus** | 4 (Chevalerie, Sylve, Compagnie, Arcane) | nom, appartenance des unités | DÉJÀ EN CODE `units.v0.mjs:71-76` |
| **Mots-clés portés** | TAUNT, DIVINE_SHIELD, POISON, WINDFURY, REBORN, DEATHRATTLE_BUFF, TRIBE_BOOST | qui porte quoi, avec quels montants | DÉJÀ EN CODE `units.v0.mjs:89-118` + par unité |
| **Montants de synergie** | TRIBE_BOOST attack/health (ex. Éclaireur +5/+20 Sylve) | attack, health, tribe | DÉJÀ EN CODE (par unité) |
| **Table d'odds Shop** | `SHOP_ODDS_TABLE` (Level × Rank) | poids par rank par level | DÉJÀ EN CODE `params.v0.mjs:186` |
| **Attribution de Rarity** | `rank` de chaque unité (1..5) = Rarity = Buy cost | rank | DÉJÀ EN CODE `units.v0.mjs:10` |

**Inventaire chiffré rapide (extrait, pour la traçabilité)** :

| Unité | Rank | Tribu | hp | attack | cad. | range | move | mots-clés |
|---|---|---|---|---|---|---|---|---|
| Piquier | 1 | Chevalerie | 420 | 40 | 2 | 1 | 1 | Taunt |
| Éclaireur | 1 | Sylve | 260 | 30 | 1 | 1 | 2 | Meneur Sylve +5/+20 |
| Frondeur | 1 | Sylve | 300 | 35 | 2 | 3 | 1 | Râle +5/+20 |
| Arbalétrier | 2 | Compagnie | 340 | 55 | 2 | 4 | 1 | Meneur Compagnie +8/+40 |
| Hallebardier | 2 | Chevalerie | 560 | 45 | 3 | 2 | 1 | Taunt, Bouclier divin |
| Homme d'Armes | 2 | Compagnie | 380 | 50 | 1 | 1 | 2 | Venimeux |
| Chevalier | 3 | Chevalerie | 620 | 70 | 2 | 1 | 2 | Bouclier divin, Furie |
| Archer d'Élite | 3 | Compagnie | 400 | 65 | 2 | 5 | 1 | Meneur Compagnie +12/+60 |
| Templier | 3 | Chevalerie | 780 | 55 | 3 | 1 | 1 | Taunt, Meneur Chev. +8/+90 |
| Mage de Guerre | 4 | Arcane | 440 | 110 | 3 | 5 | 1 | Meneur Arcane +20/+80 |
| Chef de Guerre | 4 | Chevalerie | 700 | 85 | 2 | 1 | 2 | Meneur Chev. +18/+70, Renaissance |
| Rôdeur Sylvain | 4 | Sylve | 480 | 70 | 1 | 3 | 2 | Meneur Sylve +15/+90, Venimeux |
| Dragon Ancien | 5 | Sylve | 1100 | 150 | 2 | 3 | 2 | Furie, Meneur Sylve +30/+140 |
| Golem de Siège | 5 | Arcane | 1600 | 130 | 3 | 1 | 1 | Taunt, Renaissance |
| Archimage | 5 | Arcane | 620 | 175 | 3 | 6 | 1 | Meneur Arcane +35/+150, Râle +40/+160 |

**Observation advisory (CON-4/CON-5)** : distribution des tribus déséquilibrée (Chevalerie 6,
Sylve 4, Arcane 4, Compagnie 3). Non bloquant (le contenu est jugé en jouant), mais à signaler
au game master — une tribu à 3 unités a moins de profondeur d'archetype (OBJ-1).

## Contenu FIXE (règle — HORS champ BAS)

| Catégorie | Où | Nature | Pourquoi hors champ |
|---|---|---|---|
| Sémantique des mots-clés | `combat/keywords.mjs` | règle | comment un mot-clé agit = règle Combat, pas une valeur inventée |
| Géométrie du Board (8×8, mirror) | `params.v0.mjs:6-8` | règle ratifiée (R11) | topologie fixe, pas du contenu |
| Constantes de règle de mots-clés (Windfury=2, Reborn=1) | `params.v0.mjs:175,178` | règle | portées par la RÈGLE, pas par unité (HSBG) |
| Liste close des Events | Core Rules INV-12 | règle | registre unique, pas paramétrique |
| Multiplicateurs de Star | `params.v0.mjs:124-125` | règle d'échelle | s'applique à TOUT contenu, pas une valeur d'unité |

# Points de décision

**Néant** — le contenu ne décide rien dans le moteur. Les seules décisions liées : les
**ajouts/retraits de contenu**, humains (game master), soumis à l'enveloppe 08 (CON-2).

# Flux — règle d'ajout de contenu

```text
Nouveau contenu proposé (unité, tribu, mot-clé porté, odds)
   → vise un objectif de méta déclaré ? (CON-4 — sinon advisory)
   → power(u) ∈ enveloppe du rank ? combo interdit ? (CON-2 → L1/BAL-4/BAL-5)
        │ NON ──▶ FAIL DUR au build (rejeté)
        │ OUI
   → différencié à rank égal ? (CON-5, test)
   → source unique respectée ? (CON-3 — dérivations, pas duplications)
   → entre en v0 PROVISOIRE, jugé par simulation (L2 advisory) + playtest
```

# Événements

**Néant** — le contenu n'émet aucun Event ; il fournit les données que les Events
économiques/combat transportent (`unit_def_id`, stats). Le moteur ne connaît aucun nom d'unité
ni de tribu (P11).

# Oracle Hooks (déterministes)

- **CON-2 — passage enveloppe (renvoi BAL-4/BAL-5)** : chaque UnitDefinition testée contre
  l'enveloppe 08 au build ; hors budget / combo interdit ⇒ FAIL.
- **CON-3 — source unique** : audit qu'aucune valeur de contenu n'est dupliquée (Pool, odds,
  labels dérivés de la liste unique — `getAllUnitDefIds` source du Pool).
- **CON-5 — différenciation** : test que deux unités de même rank diffèrent sur ≥ 1 axe
  significatif (déjà `properties.i25g.test.mjs`).
- **CON-1 — cohérence keyword↔label** : tout id de `combat/keywords.mjs` a un libellé et
  réciproquement (déjà testé).

# Simulation Hooks

- Usage par UnitDefinition (OBJ-9) : aucune unité morte (≥ 5% présence proposée).
- Diversité de tribu jouée (OBJ-1) : les 4 tribus produisent-elles des archetypes viables ?
- Signal advisory : une unité jamais achetée / une tribu jamais montée = candidate à révision
  de contenu (levier Content, via le cycle P9, APRÈS advisory méta).

# DSL Hooks

Les champs paramétriques (keywords, montants, tribu) sont exactement ce que la **DSL Bible**
autorise en création (whitelist close, P8). Un mot-clé hors whitelist DSL ne peut pas être
porté par une UnitDefinition. Le contenu v0 n'utilise PAS de capacités DSL (mana/sorts) :
modèle HSBG « mots-clés déclenchés » précisément parce qu'il ne requiert aucune donnée DSL
(`units.v0.mjs:32-37`).

# Human Notes

- **Le contenu v0 porte déjà les valeurs.** Formellement la Balance Bible possède les
  constantes ; en pratique elles vivent dans `content/units.v0.mjs`, déclarées « propriété
  Balance Bible ». Ce DRAFT documente ce partage — il ne le change pas.
- **Le contenu est jugé en JOUANT.** L'enveloppe prouve seulement qu'il n'est pas cassé ; sa
  qualité (fun, lisibilité, identité de tribu) reste un jugement de Pierre et du playtest.
- **Déséquilibre de tribu (6/4/4/3) et différenciation** sont des observations advisory à
  porter au game master, pas des gates.

---

*Fin du DRAFT PROPOSE-ONLY. Inventaire 15 unités / 4 tribus / 7 mots-clés (paramétrique) vs
règles (fixe) ; critère de déclenchement BAS = OUI ; règle d'ajout = passage enveloppe 08.*
