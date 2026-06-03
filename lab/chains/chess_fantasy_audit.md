# Chess Fantasy / TCG — Audit exhaustif
**Date :** 2026-06-01  
**Périmètre :** C:\TACTICAL_CHESS_STUDIO + C:\Users\Studio-Dev\Desktop\  
**Mots-clés cherchés :** fantasy, TCG, carte, card, matrice, generator, faction, budget, ATK, ARM, HP, effet, statut, draft, sideboard  
**Mode :** LECTURE SEULE — aucune modification  

---

## Fichiers trouvés (liste exhaustive)

### Projet principal : `repos/games/ChessTCG/`

#### MASTER_DOCS (7 fichiers canoniques)

| Fichier | Taille | Lignes | Statut | Résumé |
|---------|--------|--------|--------|--------|
| `MASTER_DOCS/00_PROJECT_CHARTER.md` | 1.51 KB | ~30 | COMPLET | Identité projet, frontières, statut composants. Règle : NO RUNTIME CODE |
| `MASTER_DOCS/01_DOCS_ONLY_ROADMAP.md` | 1.29 KB | ~45 | COMPLET | Roadmap documentation sans autorité d'implémentation |
| `MASTER_DOCS/02_SOURCE_BOUNDARY.md` | 0.92 KB | ~32 | COMPLET | Règles gestion source, politique références externes |
| `MASTER_DOCS/03_GAME_DESIGN_CANON.md` | 3.57 KB | ~45 | COMPLET | Règles du jeu : plateau 8x8, stats HP/ATK/ARM, statuts, capacités, système RNG/budget |
| `MASTER_DOCS/04_RNG_FORMULA_CANON.md` | 2.60 KB | ~96 | COMPLET | **FORMULES GÉNÉRATION CARTES** : budgets pièces, coûts stats, coûts effets, contraintes anti-broken, ordre de réparation |
| `MASTER_DOCS/05_CARD_ABILITY_TAXONOMY.md` | 2.08 KB | ~34 | COMPLET | Familles de capacités : triggered, active, passive, aura, trap, terrain, summon, buff/debuff, mouvement, économie, contrôle |
| `MASTER_DOCS/06_SOURCE_INVENTORY.md` | 4.01 KB | ~31 | COMPLET | Registre sources externes (passives, documentées, bloquées) |
| `MASTER_DOCS/07_OPEN_DECISIONS.md` | 1.74 KB | ~39 | COMPLET | Questions design non résolues en attente HumanGate |

#### SOURCE_IMPORTS — grosgptgenese_md (40 sections + 1 manifest)

Chemin racine : `SOURCE_IMPORTS/TacticalChessPureLab_github_main/lab/project_genesis/grosgptgenese_md/`  
Source : commit `2cb2863` du repo `pierrelouisfradcourt-create/TacticalChessPureLab`  
**Total :** ~95 KB, ~2 500 lignes

| # | Fichier | Taille | Statut | Résumé |
|---|---------|--------|--------|--------|
| 01 | `01_pr_ambule.md` | 0.62 KB | COMPLET | Préambule |
| 02 | `02_section_1_r_gles_exactes_et_wording_reconstruit.md` | 9.14 KB | COMPLET | **Reconstruction exacte règles & wording** — fichier le plus riche |
| 03 | `03_section_2_timings_et_ordre_de_r_solution.md` | 2.07 KB | COMPLET | Timings et ordre de résolution des effets |
| 04 | `04_section_3_historique_des_d_cisions_de_design.md` | 3.43 KB | COMPLET | Historique décisions design avec raisonnement |
| 05 | `05_section_4_historique_des_tests_bans_et_abus.md` | 3.51 KB | COMPLET | Tests, bans, abus documentés |
| 06 | `06_section_5_construction_des_co_ts.md` | 3.12 KB | COMPLET | **Construction des coûts** — logique de budget |
| 07 | `07_section_6_tables_num_riques_consolid_es.md` | 1.24 KB | COMPLET | Tables numériques consolidées |
| 08 | `08_section_7_matrice_rng_consolid_e.md` | 1.29 KB | COMPLET | **MATRICE RNG CONSOLIDÉE** : séquence génération, filtres, conditions de reroll |
| 09 | `09_section_8_matrice_des_interdits_et_garde_fous.md` | 1.24 KB | COMPLET | Combos interdites & garde-fous |
| 10 | `10_section_9_micro_sets_factions_et_production_de_contenu.md` | 1.15 KB | COMPLET | **6 factions, micro-sets, volume contenu** : cible 300-400 combos équilibrées |
| 11 | `11_section_10_draft_sideboard_et_conomie_des_options.md` | 0.55 KB | COMPLET | **Système draft & sideboard** |
| 12 | `12_section_11_promotion_fusion_sorts_version_finale_reconstruite.md` | 1.31 KB | COMPLET | Promotion/fusion/sorts version finale |
| 13 | `13_section_12_inventaire_des_r_gles_implicites_profondes.md` | 1.02 KB | COMPLET | Règles implicites profondes |
| 14 | `14_section_13_zones_floues_et_questions_reposer_si_n_cessaire.md` | 0.75 KB | COMPLET | Zones floues & questions ouvertes |
| 15 | `15_section_14_annexe_fichiers_exploitables.md` | 0.96 KB | COMPLET | Référence fichiers exploitables |
| 16 | `16_section_15_annexes_suppl_mentaires.md` | 13.51 KB | COMPLET | **ANNEXES MAJEURES** : table Pièce-Rôle, matrice autorisation Effet-Pièce, niveaux risque géométrie, erreurs design à éviter, "âmes" de design |
| 17 | `17_section_1_structure_statistique_du_syst_me_rng.md` | 2.56 KB | COMPLET | Structure statistique du système RNG |
| 18 | `18_section_2_distribution_de_puissance.md` | ~1.5 KB | COMPLET | Distribution de puissance |
| 19 | `19_section_3_structure_de_rarete.md` | ~1.5 KB | COMPLET | Structure de rareté |
| 20 | `20_section_4_matrice_de_co_t_simplifi_e.md` | ~1.5 KB | COMPLET | Matrice de coût simplifiée |
| 21 | `21_section_5_matrice_de_co_t_compl_te.md` | 2.50 KB | COMPLET | **Matrice de coût COMPLÈTE** — formules de référence |
| 22 | `22_section_6_statistiques_des_alt_rations.md` | 2.55 KB | COMPLET | Statistiques des altérations (statuts) |
| 23 | `23_section_7_matrice_de_g_om_trie.md` | ~1.5 KB | COMPLET | Matrice de géométrie |
| 24 | `24_section_8_statistiques_de_factions.md` | 0.94 KB | COMPLET | Statistiques par faction |
| 25 | `25_section_9_structure_des_sets.md` | ~1.5 KB | COMPLET | Structure des sets |
| 26 | `26_section_10_densit_des_effets.md` | ~1.5 KB | COMPLET | Densité des effets |
| 27 | `27_section_11_statistiques_de_g_n_ration_de_cartes.md` | 1.28 KB | COMPLET | Statistiques de génération de cartes |
| 28 | `28_section_12_limites_du_syst_me_rng.md` | ~1.2 KB | COMPLET | Limites du système RNG |
| 29 | `29_section_13_param_tres_cl_s.md` | ~1.0 KB | COMPLET | Paramètres clés |
| 30 | `30_section_14_heuristiques_num_riques.md` | ~1.0 KB | COMPLET | Heuristiques numériques |
| 31 | `31_section_15_param_tres_simulateur.md` | ~1.0 KB | COMPLET | Paramètres simulateur |
| 32 | `32_section_16_...md` | ~1.0 KB | COMPLET | Section 16 (dernier complet) |
| 33–36 | sections 1-4 (extraction connaissance) | ~12 KB total | DRAFT | Connaissances extraites — qualité variable, répétitions |
| 37–40 | sections 1-4 (doublons extraits) | ~12 KB total | DRAFT | Doublons des sections 33-36 — qualité inférieure |
| — | `_manifest.json` | 6.71 KB | COMPLET | Index des 40 sections avec titres et ordre |

#### Archive Autobattler (contexte itération antérieure)

Chemin : `SOURCE_IMPORTS/TacticalChessPureLab_github_main/MASTER_DOCS/ARCHIVE/CONTEXT/AUTOBATTLER_RELECTURE_2026_04_26/`

| Fichier | Taille | Statut | Résumé |
|---------|--------|--------|--------|
| `00_INDEX.md` | 2.42 KB | ARCHIVE | Index de la relecture autobattler |
| `01_UNIVERS_PITCH.md` | 1.83 KB | ARCHIVE | Pitch univers |
| `02_REGLES_CORE_AUTOBATTLER.md` | 1.86 KB | ARCHIVE | Règles core autobattler |
| `03_SYSTEMES_META_DRAFT_SIDEBOARD.md` | 2.03 KB | ARCHIVE | Meta, draft, sideboard |
| `04_RNG_GENERATION_GARDE_FOUS.md` | 2.08 KB | ARCHIVE | Génération RNG + garde-fous |
| `05_MATRICES_ET_TABLES_UTILES.md` | 1.26 KB | ARCHIVE | Matrices et tables utiles |

#### Fichiers racine ChessTCG

| Fichier | Taille | Statut | Résumé |
|---------|--------|--------|--------|
| `README.md` | 1.42 KB | COMPLET | Statut projet : DOCUMENTED_ONLY |
| `IMPORT_MANIFEST.md` | 4.90 KB | COMPLET | Suivi sources import, frontières |
| `SOURCE_IMPORTS/README.md` | 0.84 KB | COMPLET | Explication source_imports |

### Desktop studioV2 — résultat

**Chemin :** `C:\Users\Studio-Dev\Desktop\studioV2\`  
**Conclusion :** Projet runtime actif (moteur Rust tactique), sans aucun fichier Chess Fantasy/TCG spécifique. Hors périmètre.

---

## Ce qui est complet (réutilisable P1)

| Élément | Fichier(s) source | Niveau |
|---------|-------------------|--------|
| Algorithme génération RNG (séquence 13 étapes) | `04_RNG_FORMULA_CANON.md`, section 08 | PRODUCTION-READY |
| Budgets pièces (Pion:4 … Roi:9) | `04_RNG_FORMULA_CANON.md` | PRODUCTION-READY |
| Matrice coûts stats (HP, ATK, ARM) | section 21 | PRODUCTION-READY |
| Matrice coûts géométrie & portée | section 21, section 23 | PRODUCTION-READY |
| Matrice coûts effets / statuts | section 22 | PRODUCTION-READY |
| Combos interdites (Freeze+Line, Charm+Zone…) | section 09 | PRODUCTION-READY |
| Ordre de réparation (downgrade → reject) | `04_RNG_FORMULA_CANON.md` | PRODUCTION-READY |
| 6 factions avec identité mécanique | section 10, section 24 | PRODUCTION-READY |
| Structure micro-sets par faction | section 10 | PRODUCTION-READY |
| Taxonomie capacités (11 familles) | `05_CARD_ABILITY_TAXONOMY.md` | PRODUCTION-READY |
| Table autorisation Rôle-Pièce | section 16 | PRODUCTION-READY |
| Draft & sideboard économie | section 11 | PRODUCTION-READY |
| Combinatoire cible : 300-400 cartes équilibrées | section 10, section 27 | PRODUCTION-READY |
| Rareté (Common 60% / Uncommon 30% / Rare 10%) | sections 19, 29 | PRODUCTION-READY |
| Variance (Faible 20% / Moy 60% / Fort 20%) | sections 17, 30 | PRODUCTION-READY |
| Historique bans & abus balancement | section 05 | DOCUMENTATION |

---

## Ce qui est partiel

| Élément | Problème | Fichier |
|---------|----------|---------|
| Wording exact tous statuts | Documenté mais dispersé, pas consolidé en une table | sections 02, 22 |
| Liste sorts complète | Cadre documenté, sorts non énumérés exhaustivement | section 12 |
| Règles promotion exactes | Structure OK, cas limites flous | section 12 |
| Mécaniques de fusion | Outline documenté, détails manquants | section 12 |
| Règles terrain sur plateau | Différé en "étape ultérieure" | `07_OPEN_DECISIONS.md` |
| Formule dégâts (conflit) | `max(1, ATK-ARM)` vs `max(0, dmg-armor)` — non tranché | sections 02, 04 |
| Formule pression (conflit) | Diviseur lab vs somme design — non tranché | `07_OPEN_DECISIONS.md` |
| Taille main / deck / ressources | Référencé sans valeurs fixes | `07_OPEN_DECISIONS.md` |

---

## Matrice de cartes (si trouvée)

### Budgets pièces

| Pièce | Budget de base |
|-------|---------------|
| Pion | 4 |
| Cavalier | 6 |
| Fou | 6 |
| Tour | 7 |
| Reine | 8 |
| Roi | 9 |

### Coûts stats

| Stat | Valeur | Coût |
|------|--------|------|
| HP | 4 | 0 |
| HP | 5 | 1 |
| HP | 6 | 2 |
| HP | 7 | 3 |
| HP | 8 | 4 |
| HP | 9 | 5 |
| ATK | 1 | 0 |
| ATK | 2 | 1 |
| ATK | 3 | 2 |
| ATK | 4 | 3 |
| ARM | 0 | 0 |
| ARM | 1 | 2 |
| ARM | 2 | 4 |

### Coûts effets / statuts

| Effet | Coût | Catégorie |
|-------|------|-----------|
| Brûlure | 1 | Léger |
| Poison | 1 | Léger |
| Saignement | 1 | Léger |
| Faiblesse | 1 | Léger |
| Armure cassée | 1 | Léger |
| Racines | 2 | Moyen |
| Peur | 2 | Moyen |
| Gel | 2-3 | Lourd |
| Désarmé | 2-3 | Lourd |
| Charme | 3 | Lourd |
| Stun | 3+ | Lourd |

### Coûts géométrie & portée

| Géométrie | Coût | Portée | Coût |
|-----------|------|--------|------|
| Adjacente/simple | 0 | 1 | 0 |
| Ligne 3 | 1 | 2 | 1 |
| Diagonale | 1 | 3 | 2 |
| Cône | 1 | 4+ | 3 |
| Croix/X | 2 | — | — |
| Ligne 5 | 2 | — | — |
| Petite zone | 2 | — | — |
| Ligne complète | 3 | — | — |
| Grande zone/explosion | 3 | — | — |

### Coûts multi-cible

| Type | Coût |
|------|------|
| Cible unique | 0 |
| 2 cibles | 1 |
| Ligne | 2 |
| Zone | 3 |

### Séquence RNG (13 étapes)

1. Choisir faction
2. Choisir rôle pièce
3. Assigner budget
4. Tirer stats de base
5. Tirer portée
6. Tirer géométrie
7. Tirer interaction
8. Tirer effet
9. Appliquer taxes
10. Vérifier cohérence pièce
11. Vérifier cohérence faction
12. Vérifier combos interdites
13. Reroll si nécessaire

### Combos interdites (liste noire)

- Freeze + Ligne complète → BANNI
- Charme + Zone → BANNI
- Stun + Portée > 3 → BANNI
- Double debuff majeur → BANNI
- Contrôle dur + Grande portée → BANNI
- Contrôle dur + Grande zone → BANNI

### 6 Factions

| Faction | Effets dominants | Rôle | Mécanique clé |
|---------|-----------------|------|---------------|
| Pirates | Brûlure, Faiblesse | Offense | Cartouches spéciales |
| Nuée | Poison, Invocation | Essaim | Cap d'invocation, propagation poison |
| Sylvestres | Racines | Contrôle/Terrain | Embuscade, verrouillage racines |
| Barbares | Saignement | Agression | Offense haute, peur rare |
| Empire Solaire | Faiblesse, Bouclier, Support | Support | Contrôle léger, soutien défensif |
| Maréchalat | Désarmé, Faiblesse | Précision | Neutralisation ciblée |

### Combinatoire

- Combinaisons théoriques : ~2 376 (18 formes attaque × 6 interactions × 22 effets)
- Avec tous paramètres : ~7 200 variations
- Après premier filtre : ~430
- Après filtre strict balance : ~310 (cible 300-400)

---

## Corpus réutilisable pour LoRA P1

**Total estimé :** ~50-60 KB — ~12 000-15 000 tokens de documentation design expert

### Tier 1 — Priorité absolue (raisonnement multi-turn, règles)

| Fichier | Taille | Valeur LoRA |
|---------|--------|-------------|
| `02_section_1_r_gles_exactes_et_wording_reconstruit.md` | 9.14 KB | Reconstruction règles exactes avec raisonnement |
| `16_section_15_annexes_suppl_mentaires.md` | 13.51 KB | Tables complètes Pièce-Rôle, Effet-Pièce, géométrie |
| `04_section_3_historique_des_d_cisions_de_design.md` | 3.43 KB | Historique décisions avec justification |
| `05_section_4_historique_des_tests_bans_et_abus.md` | 3.51 KB | Équilibre : ce qui a cassé le jeu et pourquoi |

### Tier 2 — Formules & matrices (knowledge structuré)

| Fichier | Taille | Valeur LoRA |
|---------|--------|-------------|
| `06_section_5_construction_des_co_ts.md` | 3.12 KB | Logique de construction des coûts |
| `21_section_5_matrice_de_co_t_compl_te.md` | 2.50 KB | Matrice de coût de référence |
| `17_section_1_structure_statistique_du_syst_me_rng.md` | 2.56 KB | Structure statistique RNG |
| `22_section_6_statistiques_des_alt_rations.md` | 2.55 KB | Statistiques statuts / altérations |
| `MASTER_DOCS/03_GAME_DESIGN_CANON.md` | 3.57 KB | Canon règles du jeu |
| `MASTER_DOCS/04_RNG_FORMULA_CANON.md` | 2.60 KB | Canon formules RNG |

### Tier 3 — Contexte & taxonomie

| Fichier | Taille | Valeur LoRA |
|---------|--------|-------------|
| `MASTER_DOCS/05_CARD_ABILITY_TAXONOMY.md` | 2.08 KB | Taxonomie 11 familles capacités |
| `08_section_7_matrice_rng_consolid_e.md` | 1.29 KB | Algorithme génération cartes |
| `10_section_9_micro_sets_factions_et_production_de_contenu.md` | 1.15 KB | Structure sets et factions |
| `24_section_8_statistiques_de_factions.md` | 0.94 KB | Stats par faction |
| `27_section_11_statistiques_de_g_n_ration_de_cartes.md` | 1.28 KB | Statistiques génération |

### Fichiers exclus du corpus LoRA

- Sections 33-40 : qualité DRAFT, répétitions — bruit d'entraînement
- Archive autobattler : itération antérieure, risque de contamination
- Docs gouvernance studioV2 : hors périmètre Chess TCG

---

## Ce qui manque

### Intentionnellement absent (projet DOCUMENTED_ONLY)

- Aucun code runtime (Rust, Python, autre)
- Aucune suite de tests
- Aucune base de données de cartes implémentée
- Aucun générateur de cartes exécutable
- Aucun modèle neuronal / checkpoint

### Questions ouvertes non tranchées (HumanGate requis)

- Formule dégâts exacte : `max(1, ATK-ARM)` ou `max(0, dmg-armor)` ?
- Formule pression exacte : diviseur ou somme ?
- Taille deck / main / ressources : valeurs fixes manquantes
- Conditions de victoire exactes
- Règles terrain sur plateau (différé)
- Mécaniques promotion complètes (cas limites)
- Mécaniques fusion complètes (détails)
- Liste sorts exhaustive (framework documenté mais sorts non énumérés)

### Infrastructure manquante pour implémentation P1

- Schéma base de données cartes
- Code générateur RNG (Rust ou Python)
- Système de validation / test de cartes générées
- Frontend / visualisation des cartes
- Système de draft interactif
- Simulateur de parties (test balance en pratique)

---

*Audit produit le 2026-06-01 — lecture seule, aucune modification effectuée.*

---

## Sources externes (desktop)

### Inventaire des 4 fichiers

| Fichier | Taille | Lignes | Statut | Nature |
|---------|--------|--------|--------|--------|
| `TACTICAL_CHESS_RECOVERY.docx` | ~120 KB | ~1 200 (texte extrait) | COMPLET | Document de récupération consolidé — design + moteur + labo ML |
| `TACTICAL_CHESS_RECOVERY_EXTRAIT2.docx` | ~90 KB | ~900 (texte extrait) | COMPLET | Complément : statuts, schémas runtime, IA scoring, refactor JS |
| `Tactical_Chess_AI_MEGA_CORPUS_PART_1.md` | >512 KB | ~6 480 388 | CORPUS IA | Corpus d'ingestion IA : Master Bible + Atlas Database + datasets CSV synthétiques |
| `Tactical_Chess_AI_MEGA_CORPUS_PART_2.md` | >512 KB | ~6 480 392 | CORPUS IA | Suite du corpus (mirror blocks 30+) — contenu identique à PART 1 |

---

### Fichier 1 — TACTICAL_CHESS_RECOVERY.docx

**De quoi ça parle :** Document de récupération complet de l'état du projet au 1er juin 2026. Couvre les deux branches du projet (Tactical Chess game design + TacticalChessPureLab ML), les formules canoniques runtime, le game design "Crown Tactics V1", le système RNG, l'architecture Rust/Python, et les règles implicites critiques.

#### Décisions stables (P1)

**Formules canoniques (toutes validées en simulation) :**

```
directDamage     = max(1, attackerATK - defenderARM)
retaliation      = max(1, defenderATK - attackerARM)
traversalDamage  = max(1, controllerATK - moverARM)
brawlDamage      = max(1, attackerATK - defenderARM)

kingPressure = directThreat
             + floor(supportingAttackers / support_divisor)
             + floor(blockedEscapes / blocked_escape_divisor)
             + brawlPressureContribution

collapse if kingPressure >= kingHP + pressure_threshold_bonus - fatigueReduction
```

**Baseline officielle (50 parties) :**

| Paramètre | Valeur retenue |
|-----------|---------------|
| pressure_threshold_bonus | 2 |
| blocked_escape_divisor | 3 |
| support_divisor | 4 |
| brawl_pressure_value | 1 |
| max_turns | 100 |
| ai_depth | 2 |
| opening_random_plies | 4 |
| fatigue_start_turn | 48 |
| fatigue_step | 18 |
| fatigue_max_reduction | 2 |

Résultats baseline : p1 46% / p2 52% / draws 2% — mean_turns 65.14 — 37 victoires pression / 8 kills / 4 timeouts

**Action Resolution Pipeline (17 étapes) :**
1. validateAction → 2. buildPath → 3. generateTraversalEvents → 4. resolveTraversalCounterattacks → 5. arrival → 6. resolveAttack → 7. retaliation → 8. triggerProcessing → 9. markDeaths → 10. cleanupDead → 11. promotionCheck → 12. summonCleanup → 13. passiveRefresh → 14. brawlResolution → 15. cleanupDead → 16. pressureRecompute → 17. victoryCheck

**Règles implicites critiques :**
- Ordre exact : calcul dégâts → application → suppression si HP≤0 → attaquant prend la case → kills++ → check promotion
- Promotion : résolue immédiatement ; `canAttack=false, canBrawl=true, canControl=true` — canAttack=true au tour suivant
- Stack buff/debuff : 1 seul buff de même nature, 1 seul debuff de même nature (sinon ligne de pions → moteur dominant)
- Invocation : case libre adjacente uniquement ; si case occupée avant validation → échec ; invocations ne peuvent pas être promues (même en fond de plateau ou par kill)
- Root/Cavalier : root bloque l'agir, jamais le pattern du cavalier

**Crown Tactics V1 — factions (version simplifiée, différente des 6 factions grosgptgenese) :**

| Faction | Budget | Unité elite | Bonus faction |
|---------|--------|-------------|---------------|
| Chevaliers | 25 pts | Paladin (6) | +1 DEF premier combat |
| Démons | 25 pts | Démon majeur (6) | +1 ATK si blessé |
| Glace | 25 pts | Seigneur du givre (6) | Adjacents -1 PM |

Budget draft V1 : 25 pts / 1 Roi gratuit / max 1 élite / max 2 spéciaux / min 4 unités

**Contrat critique move_vocab.py** : source de vérité système — tout changement de représentation de coup doit rester compatible entre teacher_uci_runner.rs, dataset_loader.py, train.py, infer_policy.py, neural_agent.rs. Violation = corruption silencieuse de l'apprentissage.

#### Réutilisable LoRA P1

- Formules de combat avec justification causale (attrition garantie, positional compounding)
- Règles implicites critiques (cas limites promotion, invocation, stack)
- Baseline officielle avec résultats numériques (multi-turn raisonnement quantitatif)
- Pipeline complet 17 étapes avec sémantique de chaque étape

---

### Fichier 2 — TACTICAL_CHESS_RECOVERY_EXTRAIT2.docx

**De quoi ça parle :** Complément du Recovery.docx. Couvre la vision en 3 couches architecturales, les règles canoniques hors prototype (stats de calibration pièces, contrôle de case, contre-attaques détaillées), le système roi avancé avec archétypes, BRAWL avancé, les définitions complètes des 13 statuts, les schémas runtime JSON complets, le pipeline de résolution de tours, les heuristiques IA/scoring, la logique de réparation RNG (9 passes), et un plan de refactor JS V1.

#### Décisions stables (P1)

**Vision 3 couches :**

| Couche | Nom | Contenu | Statut |
|--------|-----|---------|--------|
| 1 | Cœur Tactical Chess | HP/ATK/ARM/contre-attaques/BRAWL/pression — jeu autonome sans draft | PRIORITÉ ACTUELLE |
| 2 | Asymétrie | Factions, rois/reines de set, pions variantes, draft | Futur proche |
| 3 | Magic Mode | Sorts avancés, mana, logique TCG complète | Long terme |

**Stats de calibration pièces (base simulation, non définitifs) :**

| Pièce | HP | ATK | ARM | Notes |
|-------|-----|-----|-----|-------|
| Pion (équilibre) | 3 | 3 | 0 | variante off: 2/4 ; def: 4/2 |
| Cavalier | ≈6 | 3 | 0 | 2 défenseurs BRAWL |
| Fou | 5-6 | 3 | 0 | — |
| Tour | 7 | 3 | 1 | armure permanente |
| Reine | 7-8 | 4 | 0 | — |
| Roi mage | var. | var. | 0 | seuil pression ≈ 5 |
| Roi hybride | var. | var. | 0 | seuil pression ≈ 7 |
| Roi guerrier | var. | var. | 0 | seuil pression ≈ 8 |

**Contrôle de case :** une pièce contrôle exactement les cases où elle pourrait capturer une pièce ennemie. Le pion ne contrôle que ses diagonales d'attaque (pas la case devant lui). Pièces glissantes s'arrêtent à la première pièce rencontrée.

**Cavalier :** contrôle normalement ses cases de capture — contre-attaque comme toute pièce — ignore les menaces PENDANT la traversée — subit les contre-attaques sur la case FINALE uniquement — vaut 2 défenseurs BRAWL.

**Définitions complètes des 13 statuts :**

| Statut | Bloque mvt | Bloque atk | Bloque CA | Bloque BRAWL | Durée |
|--------|-----------|-----------|----------|-------------|-------|
| poison | Non | Non | Non | Non | 2 tours |
| burn | Non | Non | Non | Non | 1-2 tours |
| bleed | Non | Non | Non | Non | 2 tours |
| weakness | Non | Non | Partiel | Partiel | 1 tour |
| armor_break | Non | Non | Non | Non | 1-2 tours |
| regen | Non | Non | Non | Non | 1-2 tours |
| root | Oui | Oui | Oui* | Oui* | 1 tour |
| silence | Non | Non (base) | Partiel | Partiel | 1 tour |
| disarm | Non | Oui | Oui | Offensif | 1 tour |
| freeze | Oui | Oui | Oui | Oui | 1 tour |
| fear | Partiel | Oui | Oui | Offensif | 1 tour |
| stun | Oui | Oui | Oui | Oui | 1 tour MAX |
| charm | Oui* | Oui* | Oui | Oui | 1 tour MAX |
| destroy | N/A | N/A | N/A | N/A | Instant |

Règle stack : non-stack par défaut (reapplication = refresh). Couleur/camp immuable. ID pièce immuable.

**Schémas runtime JSON complets documentés :** Piece, Status, Ability, Trigger, Card definition, MatchState, Telemetry, Set definition, DraftPool.

**Pipeline résolution tour (complet avec end_turn) :**
start_turn → ticks → action active → chemin → contre-attaques traversée → attaque → on_hit → on_death → cleanup → promotion → fusion → cleanup invocations → BRAWL → cleanup → pression roi → victory check → end_turn triggers → end_turn status ticks → échange tour

**Logique de réparation RNG (9 passes A→I) :**
A. Downgrade portée premium → B. Downgrade géométrie majeure → C. Supprimer rider/effet secondaire → D. Réduire ATK → E. Réduire HP → F. Réduire ARM → G. Ajouter restriction ciblage → H. Ajouter restriction usage → I. Rejeter

Nombre de passes max recommandé : 2-3, puis reroll ou rejet total.

**Paramètres numériques implicites :**

| Paramètre | Valeur | Type |
|-----------|--------|------|
| Limite sorts / tour | 1 | Explicite |
| Limite sorts / partie | 3 | Explicite |
| Limite invocations / pièce | 1 | Explicite |
| Invocations simultanées max / joueur | 3-5 | Hypothèse plausible |
| Durée partie classique | 40-80 demi-tours | Simulation |
| Croissance visuelle par kill | +8% par kill, cap +40% | Prototype |
| Variation puissance par rareté | C=base, U=+10-15%, R=+20-30% | Recommandation |
| Effets max / carte Common | 0-1 | Recommandation |
| Effets max / carte Uncommon | 1 | Recommandation |
| Effets max / carte Rare | 1 principal + 1 modificateur | Recommandation |

**Plan de refactor JS V1 :** 12 modules identifiés (constants, pieceModel, boardState, movementRules, combatRules, spellRules, summonRules, promotionRules, brawlRules, cleanupValidation, draftGeneration, armyBuilding, aiSimulation, telemetry, gameLoop, uiAdapter) avec ordre d'implémentation en 12 étapes et tests clés.

**Heuristiques IA :**
- materialScore = baseValue × (currentHP / maxHP)
- Score total = material + center − danger + kingPressureInflicted×(5-12) − ownKingPressure×(5-12) + supportNetwork + defendedAttackerBonus + escapeDenial + promotionPotential + summonUtility + fusionValue + retreatSafety

**Fusions :**
- Pion + Pion → Sergeant (front renforcé)
- Pion + Évêque → Acolyte (harasseur diagonal)
- Pion + Tour → Lancer (percée / garde lourde)
- Pion + Reine → à limiter (menace fine)
- Interdites : pièces lourdes complètes entre elles / Roi+Reine (réservé alien uniquement)

#### Réutilisable LoRA P1

- Définitions complètes des 13 statuts (règles précises × 6 dimensions) — table de référence dense
- Schémas JSON runtime complets (structure de données + sémantique de chaque champ)
- Logique de réparation RNG avec justification par étape (raisonnement structuré)
- Heuristiques IA avec poids indicatifs et justifications causales
- Vision 3 couches avec statuts clairs (priorité / futur / long terme)

---

### Fichiers 3 & 4 — Tactical_Chess_AI_MEGA_CORPUS_PART_1 & PART_2.md

**De quoi ça parle :** Deux fichiers massifs (~512 KB chacun, ~6,48 millions de lignes chacun) conçus pour l'ingestion IA. Contiennent les mêmes 3 sources texte embedées (Master Bible Improved, Atlas Database Improved, GOD TIER MASTER BIBLE FULLDATA) répétées dans des "Mirror Blocks" numérotés (PART 1 : blocs 1-29, PART 2 : blocs 30+), suivies de datasets CSV synthétiques.

**Nature du corpus :** répétition volontaire pour couvrir les fenêtres de contexte IA, pas du contenu additionnel.

**Datasets CSV présents (synthétiques générés) :**

| Dataset | Lignes | Colonnes | Contenu |
|---------|--------|----------|---------|
| ability_execution_catalogue.csv | 2 999 | 2 | execution_id, stage (validate/spawn/apply_damage/apply_status/cleanup/target) |
| ability_parameters.csv | — | — | paramètres de capacités |
| ability_status_matrix.csv | — | — | matrice capacité × statut |
| combat_resolution_states.csv | — | — | états de résolution combat |
| effects_database.csv | 300 | 5 | ID, Name, Category, Tags, Formula (ATK×N.N) |
| mechanic_matrix.csv | 64 | 3 | System_A, System_B, Result (cancel/amplify/trigger/stack/reduce) |
| status_library.csv | 200 | 3 | status_id, type (buff/debuff/control/dot), power (1-5) |
| threat_weights.csv | — | — | poids de menaces |
| unit_templates.csv | 200 | 8 | ID, Name, Role, HP, ATK, ARM, Move, Range |
| ability_library_*.csv | 1K/2K/5K/10K | — | bibliothèques de capacités à large échelle |
| status_library_*.csv | 500/1K/4K | — | bibliothèques de statuts à large échelle |
| unit_ability_bindings_10000.csv | 10 000 | — | liaisons unité-capacité |
| status_propagation_models.csv | — | — | modèles de propagation statuts |
| mechanic_matrix (large) | — | — | matrice mécanique étendue |

**Formule de dégâts dans MEGA CORPUS :** `damage = max(1, ATK - ARM)` — conforme à RECOVERY.docx.

**Formule KingPressure dans MEGA CORPUS :**
```
kingPressure = directThreat + floor(support/4) + floor(blockedEscapes/3) + brawlPressure
```
Correspond à la baseline RECOVERY.docx (support_divisor=4, blocked_escape_divisor=3).

**Rôles unit_templates observés :** DPS, Tank, Siege, Support — 4 rôles génériques dans les données synthétiques.

**Mechanic matrix — interactions clés :**
- Burn + Freeze → amplify (bidirectionnel)
- Burn + Poison → amplify
- Freeze + Root → amplify
- Burn/Freeze/Poison + Shield → reduce
- Burn/Freeze + Teleport → reduce/cancel

#### Réutilisable LoRA P1

- Contenu sémantique : les 3 sources texte (Master Bible, Atlas Database) — environ 150-200 lignes utiles par miroir
- Données synthétiques CSV : utiles pour fine-tuning de schémas et completion de tables, mais **bruit potentiel** si les IDs synthétiques (UNT00001, EFF00001…) contaminent le modèle
- Recommandation : extraire uniquement les sections texte (PART 1 — CANON RULESET, PART 2 — ENGINE ARCHITECTURE) et exclure les CSV synthétiques du corpus LoRA

---

### Conflits non tranchés (sources externes vs repo)

| Conflit | RECOVERY.docx | EXTRAIT2.docx | MEGA CORPUS | Verdict |
|---------|--------------|---------------|-------------|---------|
| Formule dégâts (minimum) | `max(1, ATK-ARM)` | `max(0, dmg-armor)` section contre-attaques | `max(1, ATK-ARM)` | **NON TRANCHÉ** — 2 contre 1 en faveur de max(1) |
| KingPressure — diviseur support | floor(support/4) | ceil(support/2) | floor(support/4) | **NON TRANCHÉ** — formule EXTRAIT2 ajoute kingDebuffs |
| KingPressure — composante debuffs | absent | +kingDebuffs | absent | **NON TRANCHÉ** — EXTRAIT2 seul à l'inclure |
| Factions V1 vs factions canon | 3 factions Crown Tactics (Chevaliers/Démons/Glace) | — | — | COMPATIBLES — V1 est simplification de conception antérieure aux 6 factions |
| Budget draft | 25 pts (Crown Tactics V1) | — | — | Version différente (jouable sans draft) vs draft TCG |
| Charm | charm = contrôle complet | charm = "non stabilisé, traiter comme stun en V1" | — | **NON TRANCHÉ** — implémentation à confirmer |
| Destroy | destroy = statut possible | destroy = jamais en BRAWL rider, prohibé sur roi | — | EXTRAIT2 plus restrictif — à retenir pour V1 |

### Apport net des sources externes au corpus P1

| Élément apporté | Source | Valeur |
|----------------|--------|--------|
| Formules runtime complètes avec baseline chiffrée | RECOVERY.docx | HAUTE |
| Action Resolution Pipeline 17 étapes nommées | RECOVERY.docx | HAUTE |
| Règles implicites critiques (ordre mort/case, invocation, stack) | RECOVERY.docx | HAUTE |
| Crown Tactics V1 factions jouables (draft simplifié 25 pts) | RECOVERY.docx | MOYENNE |
| Contrat critique move_vocab.py | RECOVERY.docx | HAUTE (ML) |
| Table 13 statuts × 6 propriétés complète | EXTRAIT2.docx | HAUTE |
| Schémas JSON runtime complets (9 objets) | EXTRAIT2.docx | HAUTE |
| Stats calibration pièces (non définitifs) | EXTRAIT2.docx | MOYENNE |
| Archétypes roi (mage/hybride/guerrier) + seuils pression | EXTRAIT2.docx | MOYENNE |
| Logique réparation RNG 9 passes A-I | EXTRAIT2.docx | HAUTE |
| Plan refactor JS V1 (12 modules + 12 étapes) | EXTRAIT2.docx | MOYENNE |
| Mechanic matrix (64 interactions système × système) | MEGA CORPUS | MOYENNE |
| Datasets CSV synthétiques (10K+ lignes par type) | MEGA CORPUS | FAIBLE (bruit LoRA) |

*Section ajoutée le 2026-06-01 — lecture seule sur les fichiers desktop.*
