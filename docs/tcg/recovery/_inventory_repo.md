# TCG — Inventaire repo (Phase 1, complément)

> 2026-07-06 · Complète `PHASE1_REPORT.md` (§4 reste-à-faire pts 2). Lecture seule.
> Couvre : (A) ce que les audits attendent/inventorient du TCG, (B) résumé des 40 sections project_genesis, (C) zones floues §14 + missing_systems §35/§39.

---

## A. Ce que les audits attendent/inventorient (TCG)

**Constat central : le TCG (jeu de cartes « Crown Tactics ») est ABSENT des audits stratégiques.**
« Tactical Chess Studio » y désigne le *studio* (moteur d'échecs Rust + factory + Snake), pas le jeu de cartes.
Aucun audit n'inventorie de GDD/bible/générateur/set TCG comme devant exister. Le TCG est **dormant / hors-radar** dans toute la doc stratégique de fin juin–juillet.

Mentions pertinentes (les seules qui touchent le TCG) :
- **P0-4 (AUDIT_COMPLET §196, ROADMAP_ROI §143)** — `repos/games/TacticalChessPureLab/` **cité par 89 fichiers .md mais INEXISTANT** (topologie morte). C'est exactement le `TacticalChessPureLab` legacy que le recovery cherche (proto v7 + générateur). Les audits le classent « chemin mort à réécrire », pas « artefact TCG à récupérer » → **personne côté audit ne sait que ce dossier portait le proto TCG**. Recommandation audit : réécrire la carte vers `src/`+`autopilot.py` et auditer les 89 md.
- **STUDIO_OS_ARCHITECTURE §78/§194/§235** — prévoit une « architecture tactique/cartes générique » qui doit **croître *à côté* du runtime échecs, non-destructive, croissance latérale**. Seul endroit où une brique « cartes/effets » est planifiée — mais comme extension future, pas comme actif existant.
- **MASTER_PROMPT_CLAUDE_CODE §14/§35** — priorité jeu = **Snake HTML (revenu)**, Godot archivé. TCG non mentionné. Confirme : le TCG n'est pas dans le plan de build courant.
- **00_SYNTHESE_VISION §63** — « Roguelike deckbuilder : ❌ Éviter (fatigue post-Balatro) ». Signal marché défavorable aux jeux de cartes — à noter pour l'arbitrage priorité du TCG.
- **MEGA_ANALYSIS / UX / STAFF** — parlent factory générique, oracle qualité réutilisable, « premier jeu publié = Snake ». Aucun oracle/dataset/gate TCG. P0-E (MEGA §220) : « aucun oracle qualité réutilisable hors Snake/échecs » → **un TCG arriverait sans gate mécanique** (viole doctrine verdict-adossé-oracle).

**Artefacts TCG que les audits mentionnent comme devant exister :** essentiellement **un seul** = le code sous `TacticalChessPureLab/` (P0-4), et une **brique cartes générique future** (STUDIO_OS). Tout le reste (générateur, SET 1, simulateur, GDD, bible) n'est **référencé que par les sources de design/recovery, pas par les audits** → la « liste des manquants » du TCG vient du design (§genesis + recovery), pas des audits.

---

## B. project_genesis — 40 sections

| Fichier | Résumé 1 ligne | Catégorie |
|---|---|---|
| 01_pr_ambule | Préambule + méthode de reconstruction (distingue explicite/reconstruit) | AUTRE |
| 02_§1 règles exactes | Plateau ≤64 cases / 8×8 symétrique, wording reconstruit du moteur | RÈGLES |
| 03_§2 timings & ordre résolution | « Pas un ordre verrouillé, plusieurs versions convergent » (déplacement→attaque…) | RÈGLES / FLOU |
| 04_§3 historique décisions | Genèse : échecs → figurines/cartes/factions | AUTRE |
| 05_§4 historique tests/bans/abus | Combos abusifs (gel/tour/ligne longue) et réponses | RÈGLES |
| 06_§5 construction des coûts | Budget = puissance embarquable ; table Pion4/Cav6/Fou6… | COÛTS |
| 07_§6 tables numériques consolidées | Budgets par pièce, niveaux de confiance | COÛTS / STATS |
| 08_§7 matrice RNG consolidée | Axes de génération : pièce/budget/stats/portée | RNG |
| 09_§8 matrice interdits/garde-fous | Combinaisons interdites (tour+gel, cavalier+contrôle fort) | RÈGLES |
| 10_§9 micro-sets/factions/production | Héros + noyau cohérent de pièces ; structure ~18 cartes/faction | FACTIONS |
| 11_§10 draft/sideboard | Draft choisit pièces + side (promotions, sorts) | RÈGLES |
| 12_§11 promotion/fusion/sorts | Version finale reconstruite promotion classique + intégration rois | RÈGLES |
| 13_§12 règles implicites profondes | « Échecs enrichi, pas jeu de pouvoirs » ; silhouette, lisibilité, altérations rares | IMPLICITE |
| 14_§13 zones floues / questions | Liste des flous Critique/Important/Confort (voir §C) | FLOU |
| 15_§14 annexe fichiers exploitables | Règles consolidées + fichiers annexes | AUTRE |
| 16_§15 annexes supplémentaires | 639 l : historique brut de la conversation (idée→factions→draft) | AUTRE |
| 17_§1 structure statistique RNG | Axes d'une carte générée (type/budget/PV…) | STATS / RNG |
| 18_§2 répartition puissance/pièce | Budgets [Explicite] par pièce | STATS |
| 19_§3 degrés de rareté | Commune60/Unco30/Rare10 [Explicite] | STATS |
| 20_§4 distribution de la RNG | Faible20/Moyenne60/… [Explicite] | RNG |
| 21_§5 matrice de coût complète | Tables coût ATK/PV/ARM plausibles | COÛTS |
| 22_§6 statistiques des altérations | Coût/durée/rareté/porteurs des status (gel, brûlure…) | STATS |
| 23_§7 matrice des géométries | Poids par forme (mêlée35/ligne3=20…) | STATS |
| 24_§8 statistiques de factions | Effets dominants + mécanique signature par faction | FACTIONS |
| 25_§9 structure statistique des sets | 2 structures set (compacte franchise vs élargie), 3 héros×6 | STATS |
| 26_§10 densité des effets/partie | 1 sort/tour, densité effets partie moyenne | STATS |
| 27_§11 statistiques génération cartes | Combinatoire explicite de cartes générables (volume) | GÉNÉRATEUR |
| 28_§12 limites du moteur RNG | Non-fixés : couvée, résurrection ~1PV rare | RNG |
| 29_§13 paramètres clés du moteur | Liste exhaustive inputs moteur (type/classe roi/faction…) | GÉNÉRATEUR |
| 30_§14 heuristiques numériques | Portée longue=taxe, contrôle fort=rareté haute, amélioration=perte stats | STATS / RÈGLES |
| 31_§15 table paramètres simulateur | Table Pièce→Budget prête pour simulateur | GÉNÉRATEUR |
| 32_§16 compléments numériques | Densité saine/carte, ratio stats/effet | STATS |
| 33_§1 extracted_knowledge (stub) | En-tête template (3 l) | AUTRE |
| 34_§2 system_improvements (stub) | En-tête template (3 l) | AUTRE |
| 35_§3 missing_systems (stub) | En-tête template vide (3 l) — voir §39 pour le contenu réel | MISSING |
| 36_§4 idea_dump (stub) | En-tête + règle « un seul doc » | AUTRE |
| 37_§1 extracted_knowledge (LLM) | 214 l : synthèse « Tactical Chess = generate→simulate→analyze→optimize », 4 couches d'éval carte | IMPLICITE / AUTRE |
| 38_§2 system_improvements (LLM) | 224 l : schéma générateur canonique recommandé (piece_type/role_tag…) | GÉNÉRATEUR |
| 39_§3 missing_systems (LLM) | 165 l : 10 systèmes manquants formels (voir §C) | MISSING |
| 40_§4 idea_dump (LLM) | 160 l : idées spéculatives (heatmaps danger/pression) | AUTRE |

Note : sections 33–36 = **templates vides** ; le contenu réel « missing/improvements » est dans 37–40 (générés LLM, à traiter comme propositions, pas canon).

---

## C. Zones floues (§14) + missing_systems (§35/§39)

### C.1 — Zones floues à reposer (project_genesis §13, fichier 14) — texte intégral
**Critique :** wording définitif du moteur de combat · ordre exact de résolution complet · **Brawl : version finale ou suppression partielle** · timing définitif des promotions · structure finale exacte des micro-sets · tables de coût numériques finales · matrice finale des reines · liste finale des mots-clés.
**Important :** wording final de la pression du roi · timing exact des fusions pendant la partie · wording définitif du contresort · cap officiel des invocations · cap officiel des résurrections · politique de rareté finale.
**Confort :** structure des sets A/B par faction · nombre de plateaux compétitifs actifs à la fois · politique de rotation / format officiel.

### C.2 — Missing systems (§35 = stub vide ; §39 = contenu réel, 10 systèmes)
1. **Matrice de légalité de génération** (quels types de pièce peuvent rouler quels tiers de status, quelles géométries coexistent, quels traversals légaux par classe, quelles combos par rareté) — *le plus important*.
2. **Framework de rareté** : distribution complète, deltas de budget de puissance/rareté, budget de complexité/rareté, poids de génération — essentiel pour modèle franchise.
3. **Système de terrain** : tags terrain, types de blocage, timing hazard, durée terrain temporaire, interaction ligne de vue / dégâts de traversée.
4. **Système de promotion** : trigger, source de la pièce promue, pools procéduraux ?, conservation des status ?, promotion liée à la faction ? — *système majeur manquant*.
5. **Framework draft/sideboard** : flow de draft, génération de pool, règles de sideboard, pièces side invocables ?, interaction cartes procédurales.
6. **Framework fusion/combinaison** : paires légales, timing, règles de taille, recalcul de stats, héritage de status, contraintes anti-abus.
7. **Taxonomie portée/géométrie** : liste des géométries, règles de ciblage/visibilité/arrêt, interaction traversée.
8. **Modèle évaluateur IA** : score positionnel, sécurité du roi, pression, contrôle de couloir, tempo, pénalité d'entropie, score lisibilité/complexité des cartes générées.
9. **Contraintes d'équilibrage au niveau set** : caps densité status/portée/invocation par set, caps overlap de faction, cibles de diversité d'ouverture.
10. **Liste de mots-clés canonique** : Burn/Poison/Root/Disarm/Fear/Charm/Piercing/Splash/Traversal/Pressure… — crucial pour scaler.

---

## Résumé (pour les manquants + questions HumanGate)

**Ce que les audits disaient devoir exister et qui manque (TCG) :** presque rien — le TCG n'est **pas** inventorié par les audits stratégiques. Le seul artefact TCG qu'ils touchent est **`repos/games/TacticalChessPureLab/`** (P0-4 : cité par 89 md, INEXISTANT, classé « topologie morte à réécrire » — les audits ignorent qu'il portait le proto TCG). STUDIO_OS ne prévoit qu'une brique « cartes générique » **future, latérale**. Donc la liste des manquants durs reste celle du recovery (générateur code, SET 1 réel, simulateur), **non couverte par les audits**. Signaux stratégiques à peser : audits priorisent Snake (revenu), 00_SYNTHESE déconseille le deckbuilder (fatigue marché), P0-E = aucun oracle qualité hors échecs/Snake → un TCG arriverait **sans gate mécanique** (viole la doctrine verdict/oracle).

**Zones floues / questions ouvertes d'avril (utiles aux 5 questions HumanGate) :** §14 liste par priorité — Critique : formule/ordre de combat définitif, **sort du Brawl (garder ou couper)**, tables de coût finales, matrice des reines, mots-clés. Important : caps invocations/résurrections, timing fusions, pression du roi, politique de rareté. §39 (LLM) confirme les **gros trous formels** : matrice de légalité de génération (n°1), promotion, terrain, taxonomie de géométrie, évaluateur IA, keyword list canonique. Candidats naturels pour les 5 questions HumanGate : (1) Brawl in/out, (2) une échelle de stats unique ou deux couches assumées (rappel contradiction §9 du PHASE1_REPORT), (3) 6ᵉ faction Maréchalat vs Mystiques, (4) ratifier ou non les décisions de mai (dégâts/pipeline) comme canon, (5) matrice de légalité générateur à formaliser avant tout code.
