# Chess TCG — INDEX de consolidation (récupération)

> Date : 2026-07-06 · Phase 1 « consolidation → équipe → premier code ».
> **Rien n'est réécrit en canon. Rien n'est commité. Aucun original hors repo touché (copies lecture seule).**

## ⚠ LE CANON EXISTE DÉJÀ — ne pas le doublonner

La Phase 1 a découvert qu'une **consolidation canonique existe déjà dans le repo** :

### 👉 `repos/games/ChessTCG/` = l'étagère canonique (fait foi)

| Doc | Rôle |
|---|---|
| `MASTER_DOCS/00_PROJECT_CHARTER.md` | Charte, `status: DOCUMENTED_ONLY`, runtime `NOT_FOUND` |
| `MASTER_DOCS/03_GAME_DESIGN_CANON.md` | Canon design (candidate) — lignée **T** (8x8, HP/ATK/ARM) |
| `MASTER_DOCS/04_RNG_FORMULA_CANON.md` | **Générateur consolidé** (budgets, coûts, taxes, anti-abus, repair order) |
| `MASTER_DOCS/05_CARD_ABILITY_TAXONOMY.md` | Taxonomie cartes/abilities (11 familles) |
| `MASTER_DOCS/06_SOURCE_INVENTORY.md` | Inventaire des sources (avec trust levels) |
| `MASTER_DOCS/07_OPEN_DECISIONS.md` | Décisions HumanGate non tranchées |
| `HISTORIQUE_AUDIT_2026_06_28.md` | **Audit du 28 juin** : 80% documenté, **9 gaps P1 bloquants**, plan 3 phases |
| `SOURCE_IMPORTS/…_github_main/` | Snapshot GitHub (project_genesis complet) |

**Cette étagère est plus avancée que mon sweep sur la consolidation du canon.** Elle est doctrine-compliant
(`DOCUMENTED_ONLY`, `NO_CLAIM_ALLOWED`, canonisation via HumanGate). **C'est là que doit vivre le canon**, pas ici.

## Rôle de `docs/tcg/` (ce dossier) : PROVENANCE, pas canon

Mon travail = la **couche récupération/provenance qui alimente** l'étagère ci-dessus. Ce que j'ajoute :
1. **Résolution d'une décision ouverte** : `07_OPEN_DECISIONS` listait « Crown v1 review : BLOCKED — role unknown ».
   → **Pierre a tranché : Crown = la première version** (lignée C : PV/ATK/**DEF/PM**, niveaux/classes, 25 pts, 50 cartes fixes).
   Le canon actuel (lignée **T**) en est le **successeur**. Voir `recovery/PHASE1_REPORT.md` §0.
2. **Provenance à jour** : le `06_SOURCE_INVENTORY` pointe des chemins `C:\Users\wazou\…` et `La Cigogne Gamer\…`
   aujourd'hui périmés. `recovery/incoming/` contient les **copies fraîches** des sources depuis la machine actuelle,
   tracées (`_inventory_desktop.md`, `_inventory_downloads.md`, `_inventory_legacy.md`, `_inventory_repo.md`).
3. **Verdict de récupération** : le **générateur en code**, le **simulateur v7** et un **SET T matérialisé** ne sont
   récupérables **nulle part en local** (Bureau, Downloads, TacticalChessPureLab, La Cigogne Gamer tous scannés).
   → à **coder à neuf** (déjà prévu comme Phase 3 du plan du 28 juin) ou à extraire du ChatGPT « chess data centralisation ».

## 👉 Implémentation de référence — prototype 3D v0 (`games/chess_tcg/`)

Depuis 2026-07-07, il existe un **prototype jouable** qui **fait tourner le canon de mai en réel** (Godot 4 / GDScript).
Il entre dans « ce qui fait foi » comme **implémentation de référence v0** — le code prime sur les docs en cas d'écart,
mais reste **DOCUMENTED_ONLY / prototype** (pas un produit).

| | |
|---|---|
| Emplacement | `games/chess_tcg/` (in-repo, convention `games/snake_survivor/`) |
| Stack | Godot 4.6 · GDScript · cœur de règles **pur, testable headless** |
| Implémente (canon mai/lignée T) | plateau 8×8, pièces HP/ATK/ARM, **dégâts `max(1,ATK−ARM)`**, mouvements d'échecs, **traversée + contre-attaques**, **riposte**, **BRAWL**, **pression du roi + fatigue**, victoire (roi PV≤0 **ou** pression), promotion, **IA** 1-ply, **4 cartes** (Affûtage/Renfort/Bastion/Frappe, 1/tour), UI 3D + fiche pièce + surbrillance portée |
| N'implémente PAS | générateur procédural, statuts persistants (burn/poison/gel…), deck/pioche, mécaniques de faction (factions = cosmétiques), summon/fusion, 6-faction content |
| Preuve | **83 assertions headless vertes** (`tests/run_tests.gd`) + garde anti-faux-vert + smoke UI |
| Limites connues (retour Pierre) | (a) **fiche de carte brouillonne** ; (b) **cascade de combat au déplacement peu lisible** — affichage-vs-règle à trancher (voir IMP-254/255) |

→ Détail et croisement manquants : `recovery/PHASE1_REPORT.md` §Prototype 3D.

## Structure
```
docs/tcg/
  INDEX.md                    ← ce fichier (pointe vers le canon repos/games/ChessTCG)
  recovery/
    PHASE1_REPORT.md          ← rapport STOP (2 lignées, règles implicites, 9 gaps, council)
    incoming/                 ← copies fraîches lecture seule (30 fichiers + docx convertis)
    _inventory_*.md           ← inventaires desktop / downloads / legacy / repo
  00_canon 10_generateur 20_runtime 90_archive   ← VIDES (le canon vit dans repos/games/ChessTCG)
```
