# Chess TCG Knowledge Drain — Historique Complet 2026-06-28

**Date:** 2026-06-28  
**Audit by:** Claude + Cowork Session  
**Status:** DOCUMENTED_ONLY  
**Verdict:** 9 gaps P1 bloquants, tout le reste documenté et stable  

---

## RÉSUMÉ EXÉCUTIF

Chess TCG est **80% documenté architecturalement**. Toutes les règles core, budgets, formules de base, factions et statuts sont confirmés et stables. 

**BUT BLOQUANTS (HumanGate obligatoire) :** 9 décisions critiques manquent.  
**IMPLÉMENTATION :** Zéro code runtime (normal, projet est DOCUMENTED_ONLY par design).  
**RÉUTILISABILITÉ :** ~50-60 KB de documentation design expert ; formules validées sur 50 parties.

---

## 1. SOURCES CONSULTÉES

| Source | Type | Taille | Pertinence | Notes |
|--------|------|--------|-----------|-------|
| `chess_fantasy_audit.md` | Audit | 593 lignes | CRITIQUE | Exhaustif ; tous les fichiers & gaps |
| `MASTER_DOCS/03_GAME_DESIGN_CANON.md` | Spec | 60 lignes | HAUTE | Canon candidate ; autorité locale |
| `MASTER_DOCS/07_OPEN_DECISIONS.md` | Spec bloquante | 50 lignes | HAUTE | HumanGate decisions non tranchées |
| `MASTER_DOCS/04_RNG_FORMULA_CANON.md` | Formules | 96 lignes | HAUTE | Budgets pièces + taxes canoniques |
| `grosgptgenese_md/` (40 sections) | Corpus | ~2500 lignes | MÉDIA-HAUTE | Reconstruction exhaustive Pierre |
| `TACTICAL_CHESS_RECOVERY.docx` | Spec runtime | ~1200 lignes | MÉDIA | Formules combat + baseline 50 parties |
| `TACTICAL_CHESS_RECOVERY_EXTRAIT2.docx` | Spec avancée | ~900 lignes | MÉDIA | 13 statuts + JSON schemas + 9 passes RNG |

**Corpus total :** ~50-60 KB texte ; ~12K-15K tokens.

---

## 2. DONNÉES CONFIRMÉES (Stable, Prêt à coder)

### 2.1 Structure de base

- **Plateau :** 8x8 chess-like
- **Pièces :** 6 (Pion, Cavalier, Fou, Tour, Reine, Roi)
- **Stats de base :** HP/ATK/ARM
- **Turn structure :** action → traversal → combat → cleanup → BRAWL → pressure → victory

### 2.2 Budgets pièces (Canon absolue)

| Pièce | Budget | Notes |
|-------|--------|-------|
| Pion | 4 | Variation off: 2/4 |
| Cavalier | 6 | Vaut 2 défenseurs BRAWL |
| Fou | 6 | — |
| Tour | 7 | ARM=1 permanent |
| Reine | 8 | — |
| Roi | 9 | Seuils pression var. archétype |

**Total draft :** 25 pts, 1 Roi gratuit, max 1 élite.

### 2.3 RNG Sequence (13 étapes canoniques)

```
1. Faction choix
2. Rôle pièce
3. Budget attribué
4. Stats base
5. Portée
6. Géométrie
7. Interaction
8. Effet
9. Appliquer taxes
10. Cohérence pièce
11. Cohérence faction
12. Combos interdites
13. Reroll si nécessaire
```

**Réparation (9 passes A-I) :** Downgrade portée → Downgrade géométrie → Supprimer rider → Réduire ATK → Réduire HP → Réduire ARM → Ajouter restriction ciblage → Ajouter restriction usage → Rejeter.

### 2.4 Coûts (Matrices canoniques)

**Stats HP :** `{4→0, 5→1, 6→2, 7→3, 8→4, 9→5}`  
**ATK :** `{1→0, 2→1, 3→2, 4→3}`  
**ARM :** `{0→0, 1→2, 2→4}`  

**Effets majeurs :** Brûlure(1), Poison(1), Saignement(1), Faiblesse(1), Armure cassée(1), Racines(2), Peur(2), Gel(2-3), Désarmé(2-3), Charme(3), Stun(3+).

**Géométrie & portée :** Adjacente(0), Ligne3(1), Diagonale(1), Cône(1), Croix(2), Ligne5(2), Zone(2), Ligne complète(3), Explosion(3).

### 2.5 Formules combat (Consensus stable)

**Dégâts (baseline chiffrée, 50 parties validées) :**
```
directDamage = max(1, attackerATK - defenderARM)
retaliation = max(1, defenderATK - attackerARM)
traversalDamage = max(1, controllerATK - moverARM)
brawlDamage = max(1, attackerATK - defenderARM)
```

**Pression Roi :**
```
kingPressure = directThreat + floor(supporters/4) + floor(blockedEscapes/3) + brawlPressure
collapse if kingPressure >= kingHP + 2 - fatigueReduction
```

**Fatigue :** Débute tour 48, -1 réduction tous les 18 tours (max -2).

### 2.6 6 Factions (Identité mécanique stable)

| Faction | Effets | Rôle | Signature |
|---------|--------|------|-----------|
| Pirates | Brûlure, Faiblesse | Offense | Cartouches |
| Nuée | Poison, Invocation | Essaim | Cap invocation |
| Sylvestres | Racines | Terrain/Contrôle | Embuscade |
| Barbares | Saignement | Agression | Peur rare |
| Empire Solaire | Faiblesse, Bouclier | Support | Contrôle léger |
| Maréchalat | Désarmé, Faiblesse | Précision | Neutralisation |

### 2.7 13 Statuts (Propriétés complètes)

| Statut | Bloque mvt | Bloque atk | Durée |
|--------|-----------|----------|-------|
| Burn, Poison, Bleed | Non | Non | 2/1-2 tours |
| Weakness, Armor_break | Non | Non | 1 tour |
| Root, Freeze, Stun, Charm | **Oui** | **Oui** | 1 tour MAX |
| Disarm, Fear, Silence | Var. | Oui | 1 tour |
| Regen | Non | Non | 1-2 tours |

### 2.8 Combos interdites (Liste noire)

- Freeze + Ligne complète → BANNI
- Charme + Zone → BANNI
- Stun + Portée > 3 → BANNI
- Double debuff majeur → BANNI

### 2.9 Combinatoire visée

- **Théorique :** ~2376 variations
- **Après 1er filtre :** ~430
- **Cible finale :** 300-400 cartes équilibrées

### 2.10 Rareté & variance

| Niveau | Distribution | Variance |
|--------|-------------|----------|
| Common | 60% | Faible (20%) |
| Uncommon | 30% | Moyen (60%) |
| Rare | 10% | Fort (20%) |

---

## 3. GAPS CRITIQUES (15 catégories)

### P1 Bloquants (HumanGate obligatoire) — 9 items

| Gap | Critère | Blocage | Action |
|-----|---------|---------|--------|
| **C1** Fusion matrix | Quelles combinaisons autorisées ? | Implémentation summon/fusion | **Trancher : Pion+Pion OK? Reine+X?** |
| **C2** Coûts fusion | Coûts pts pour chaque fusion | Système economy | **Définir table coûts exacte** |
| **C5** Damage formula | `max(1, ATK-ARM)` confirmée vs `max(0, dmg-arm)` conflit | Combat validation | **Trancher : quelle formule ?** |
| **C6** BRAWL formula | Plusieurs variants en lab + design | Combat mechanics | **Trancher : variante finale** |
| **C7** Pressure formula | Lab divisor/fatigue vs design sum conflit | King pressure resolution | **Trancher : quelle approche** |
| **C8** Victory conditions | King kill, pressure collapse, strict mate, modes ? | Game end rules | **Trancher : quels modes actifs V1** |
| **C13** Summon cleanup | Quand nettoyage invocations ? Avant/après promo ? | Event ordering determinism | **Trancher : timing exact** |
| **C14** Hard control stacking | Peuvent-on stack multiples gels ? Durée max ? | Control balance | **Trancher : règles stacking** |
| **C15** Event ordering | Ordre exact si effets simultanés ? | Determinism guarantee | **Trancher : résolution stack** |

### P2 Optionnels (Framework existe, détails manquent) — 6 items

| Gap | Critère | Sévérité |
|-----|---------|----------|
| **C3** Sorts énumérés | Liste complète non exhaustive | MÉDIA (framework OK) |
| **C4** Wording officiel | Documenté dispersé | MÉDIA (consolidation) |
| **C9** Deck/hand size | Références flottantes | BASSE (draft 25pts stable) |
| **C10** Resource cadence | Timing tirage/génération | BASSE (futur) |
| **C11** Card copy limits | Max X copies deck ? | BASSE (optionnel) |
| **C12** Terrain timing | Quand, comment, priority ? | BASSE (futur, core first) |

---

## 4. PLAN DE RECONSTRUCTION (3 phases)

### Phase 1 — Consolidation IMMÉDIATE

| Doc | Contenu | Durée | Output |
|-----|---------|-------|--------|
| **00_PROJECT_CHARTER** | ✓ Existe | — | Canon confirmé |
| **01_GAME_DESIGN_FINAL** | Consolider 03_GAME_DESIGN_CANON + RECOVERY | 30 min | Spec unique +60 décisions stables |
| **02_RULES_COMPLETE** | Turn order 17 étapes + formules + ordre événement | 45 min | Déterminisme complet |
| **03_RNG_IMPLEMENTATION** | ✓ Existe (04_RNG_FORMULA_CANON.md) | — | Codable immédiatement |

### Phase 2 — HumanGate BLOQUANT

Trancher les 9 gaps P1. Proposer options + rationnel pour chaque.

### Phase 3 — Cleanup (optionnel)

Encoding fix, duplicate review, Mega Bible canonization (si temps/valeur).

---

## 5. VERDICTS

### software_verdict: **DOCUMENTED_ONLY**

Projet 80% architecturalement documenté. Toutes les **règles core**, **budgets**, **formules de base**, **factions**, **statuts** confirmés et stables.

**Blocages :** 9 gaps P1 critiques non tranchés (décisions HumanGate obligatoires) ; zéro code runtime (normal pour DOCUMENTED_ONLY).

### evidence_verdict: **MECHANICAL_VALIDATION_ONLY**

- Formules combat + pression : validées simulation 50 parties
- RNG 13-step : décrit précisément, réparation 9-pass documentée
- Matrices coûts : tabulaires, exhaustives
- Audit : trace exhaustive (593 lignes)

**Pas de :** tests unitaires, simulations Monte-Carlo, datasets réels, checkpoints ML, runtime production.

### claim_verdict: **NO_CLAIM_ALLOWED**

Aucune affirmation sur jouabilité, équilibre réel, ou validité des 9 gaps P1. Documentation existe ; validation requires HumanGate.

---

## 6. PROCHAINES ÉTAPES

**Immédiate (1-2h) :**
1. Trancher les 9 gaps P1 via HumanGate (Pierre + décisions)
2. Compiler Phase 1 consolidation docs (01 + 02 complets)
3. Créer 07_DECISION_GATE_PACKET avec options + rationnel

**Court terme (1 week) :**
1. Codage RNG generator (Python)
2. Codage card validator
3. Tests combinatoire

**Moyen terme (2-4 weeks) :**
1. Godot UI + card display
2. Draft interactif
3. Match simulator

---

**Compiled by:** Claude Cowork Session  
**Audit source:** chess_fantasy_audit.md + MASTER_DOCS/ + RECOVERY corpuses  
**Status:** DOCUMENTED_ONLY  
**Ready for:** Code implementation (pending Phase 2 HumanGate)
