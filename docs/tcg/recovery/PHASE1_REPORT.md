# Chess TCG — RAPPORT PHASE 1 (STOP)

> 2026-07-06 · Mission « consolidation → équipe → premier code », Phase 1.
> Produit : inventaire (repo + machine) · liste des manquants · tableau de contradictions · avis council.
> **Rien n'est commité. Rien n'est réécrit. Aucun original hors repo n'a été modifié (copies lecture seule).**
> Note d'exécution : sweep en 2 vagues (limite de session à 19h). **Les 4 agents + conversion docx + scan La Cigogne = terminés.**

---

## ★ RÉCONCILIATION — le canon existe déjà (`repos/games/ChessTCG/`)

**Découverte structurante de la reprise** : une consolidation canonique existe déjà dans le repo, sous
`repos/games/ChessTCG/` (invisible aux audits car hors de leur scope). Elle est **plus avancée que ce sweep** sur le canon
et **doctrine-compliant** (`DOCUMENTED_ONLY`, `NO_CLAIM_ALLOWED`).

- `HISTORIQUE_AUDIT_2026_06_28.md` a **déjà** consolidé le core (budgets, matrices de coûts, dégâts validés 50 parties,
  6 factions dont **Maréchalat**, 13 statuts, combos interdits, séquence RNG 13 étapes, réparation 9 passes) et conclut
  « **80% documenté, prêt à coder après HumanGate** ».
- Il a isolé **9 gaps P1 bloquants** = le **vrai paquet de décision** (plus précis que le tableau §2 que j'avais re-dérivé) :

| Gap | Décision à trancher |
|---|---|
| **C1** Matrice de fusion | quelles combinaisons autorisées (Pion+Pion ? Reine+X ?) |
| **C2** Coûts de fusion | table de coûts exacte |
| **C5** Formule de dégâts | `max(1, ATK−ARM)` vs `max(0, dmg−ARM)` |
| **C6** Formule BRAWL | variante finale (plusieurs coexistent) |
| **C7** Formule de pression | lab (divisor/fatigue) vs design (somme) |
| **C8** Conditions de victoire | king kill / pressure collapse / mat strict / par mode |
| **C13** Summon cleanup | timing nettoyage invocations (avant/après promo) |
| **C14** Stacking hard-control | peut-on empiler gels ? durée max ? |
| **C15** Event ordering | ordre exact si effets simultanés |

**Ce que MON sweep ajoute à cette étagère (valeur nette) :**
1. **Résout la décision ouverte `07_OPEN_DECISIONS → Crown v1 : role unknown`** → **Crown = la 1ʳᵉ version** (Pierre),
   lignée **C**, remplacée par le canon lignée **T**. Voir §0.
2. **Provenance fraîche** : `06_SOURCE_INVENTORY` pointe des chemins `wazou\…` / `La Cigogne Gamer\…` périmés ;
   `recovery/incoming/` = copies à jour depuis la machine actuelle, tracées.
3. **Verdict récupération** : générateur-code + simulateur v7 + SET lignée T **introuvables en local** (tout scanné) →
   à coder à neuf (= Phase 3 du plan du 28 juin) ou à extraire du ChatGPT « chess data centralisation ».
4. Extraction en clair des **règles implicites** (§0.1) et cadrage **deux lignées** (§0) — absents de l'audit du 28 juin.

> **Conséquence pour la suite** : la Phase 2 ne repart pas de zéro. Elle = (a) ratifier via HumanGate les **9 gaps P1**
> ci-dessus, (b) acter Crown=v1 dans `07_OPEN_DECISIONS`, (c) découper le moteur de règles pur (lignée T) en tranches
> à oracle — en réglant d'abord **P0-E** (aucun oracle hors échecs/Snake, §3.1). Le reste du rapport ci-dessous est le
> détail probant qui soutient cette réconciliation.

---

## 0. ⚠ DÉCOUVERTE MAJEURE — il y a DEUX lignées de design, pas « deux versions »

La conversion des binaires (surtout `Crown_v1.odt` et `TACTICAL_CHESS_RECOVERY.docx` du 1er juin) change le cadre.
Le projet contient **deux jeux mécaniquement incompatibles** sous le même nom-parapluie :

| | **Lignée T — « Tactical Chess » (attrition/siège)** | **Lignée C — « Crown Tactics » (D&D × échecs)** |
|---|---|---|
| Stats | HP / ATK / **ARM** | PV / ATK / **DEF / PM** |
| Dégâts | `max(1, ATK − ARM)` | `ATK − DEF (min 1)` |
| Systèmes | traversée, BRAWL, pression du roi, fatigue | niveaux 1→3, classes, fusions, focus rule |
| Contenu | **générateur procédural** par budget de puissance (Pion4…Roi9) | **50 cartes concrètes à stats fixes**, draft **25 points** |
| Factions | Pirates / Nuée / Sylvestres / Barbares / Empire / Maréchalat‑Mystiques | Chevaliers / Démons / Glace (+ Forêt + Désert) |
| Victoire | mort du roi / collapse pression | échec et mat / annihilation |
| Preuve | **proto labo v7 jouable** (baseline 50 parties) | règles + 50 fiches, proto « sans code » (Construct 3) — pas de moteur |
| Sources | project_genesis (avril), formula_bible, EXTRAIT2, RECOVERY §3/§5/§6/§8 | `Crown_v1.odt`, RECOVERY §4 |

`TACTICAL_CHESS_RECOVERY.docx` (1er juin) **juxtapose les deux sans les réconcilier** (§4 = Crown Tactics, §5 = générateur T,
§3/§6/§8 = moteur T). C'est la source la plus complète mais elle **n'a pas tranché** quelle lignée est le produit.

> **La vraie question n°1 pour Pierre (avant les 5 questions CERFA de Phase 2)** : le produit n°2, c'est **Tactical Chess (T)**,
> **Crown Tactics (C)**, ou **C = le v1 simple jouable et T = la cible long terme** ? Note : la mission nomme « Crown Tactics »,
> mais le seul **proto qui tourne** et le corpus le plus riche sont sur la lignée **T**. Le nom mémorisé ≠ ce qui existe en code.

### 0.1 Règles implicites critiques retrouvées (RECOVERY.docx §8) — lignée T
Bloc à traiter comme canon pour un futur moteur T (Phase 3) :
- **Ordre attaque→mort→prise de case** : 1) calcul dégâts, 2) application, 3) si HP≤0 suppression cible, 4) attaquant prend la case, 5) +1 kill, 6) check promotion. **Si la cible survit : pas de prise de case.**
- **Promotion** : résolue immédiatement à l'événement déclencheur ; nouvelle pièce remplace le pion ; état initial `canAttack=false, canBrawl=true, canControl=true` ; `canAttack=true` au tour suivant.
- **Stacking** : `attaque finale = base + bonus alliés − malus ennemis` (min 1) ; **un seul buff et un seul debuff de même nature comptent** (sinon la ligne de pions domine).
- **Invocation** : case libre adjacente à l'invocateur uniquement ; échec si la case devient occupée ; les invocations **ne peuvent pas être promues**.
- **Root / Cavalier** : root bloque l'action/mouvement mais **n'altère pas le pattern** du cavalier (empêcher d'agir = OK ; modifier pattern/portée = interdit).
- **Flags dissociés** par pièce : `canAttack / canBrawl / canControl` gérés séparément.

---

## ★★ PROTOTYPE 3D v0 (2026-07-07) — le canon de mai TOURNE en jouable

Un **prototype jouable** a été produit (session codage à distance/locale) : `games/chess_tcg/` (Godot 4 / GDScript).
Il devient l'**implémentation de référence v0** (le code prime sur les docs en cas d'écart ; reste prototype, pas produit).

**Ce qu'il PROUVE** : le canon **lignée T de mai** est exécutable et cohérent en réel —
`max(1,ATK−ARM)`, pipeline traversée→arrivée→attaque→riposte→BRAWL→pression→victoire, fatigue, promotion,
cartes (1/tour), IA. **83 assertions headless vertes.** La décision #3 (canon mai) n'est donc plus théorique.

**Ce qu'il QUESTIONNE (retour test Pierre)** :
- (a) **Fiche de carte brouillonne** → lisibilité de l'info carte. IMP-254.
- (b) **Cascade de combat au déplacement peu lisible** : à élucider — **problème d'affichage** (tout se résout d'un coup
  sans montrer les étapes) **ou problème de règle** (trop de conséquences par geste : traversée + riposte + BRAWL) ?
  → **c'est le risque design n°1** de la lignée T. IMP-255.
  *(État : une refonte d'affichage étape-par-étape + effets a été amorcée dans le proto ; le verdict affichage-vs-règle de Pierre reste à consigner.)*

**Croisement avec les 3 trous durs de la Phase 1** :
| Trou dur | Statut après prototype |
|---|---|
| **Générateur de cartes en code** | ❌ toujours absent — le proto a des stats **codées en dur** par type, pas de génération procédurale. |
| **SET 1 de cartes réelles** | 🟡 **partiel** — une mise en place fixe (stats par pièce) + 4 sorts = un mini-set *de facto*, mais **pas** le set canonique généré. |
| **Simulateur baseline 50 parties** | 🟡 **partiel** — moteur déterministe + IA + harnais headless = **fondation** pour batcher, mais pas de simulateur de balance dédié 50 parties. |

→ **Reformulation des manquants** : les 3 trous ne sont plus « à récupérer » mais « **à construire par-dessus le proto** »
(le moteur pur est la base). Le générateur (matrice A+B, `08_GENERATOR_UNIFIED_CANDIDATE`) reste le gros morceau.

**Décision #3 (canon de mai)** : passe de *« à ratifier »* à **« canon provisoire — RISQUE n°1 NOMMÉ : lisibilité de la
cascade de déplacement (affichage-vs-règle), à lever via le prototype (IMP-255) »**.

**Décision #4 (NOUVELLE, en attente de Pierre) — Moteur = Godot 4** : choix **de facto du prototype, jamais instruit
formellement**. À **ratifier ou contester** : ça engage **les 3 jeux de la gamme** + la **stratégie de distribution
web/natif** (Godot 4.6 : GDScript exporte web, **C# non**). Décision structurante, pas un détail technique.

**Reste-à-faire Phase 1** : ✅ terminé — docx/odt convertis (RECOVERY, EXTRAIT2, MASTER_BIBLE=stub, Crown v1) + sweep
`TacticalChessPureLab` (LOCAL_ARCHIVE + `AUTOBATTLER_RELECTURE_2026_04_26`). Rien de neuf ne renverse le tableau §2.

---

## 1. Inventaire — vue consolidée

### 1.1 Dans le repo (canon existant)
- **`lab/project_genesis/grosgptgenese_md/`** — 40 sections (mine ~avril, extraite de ChatGPT). Le corpus de design le plus riche : règles exactes (§1), timings/ordre de résolution (§2), historique décisions (§3), tests/bans/abus (§4), construction des coûts (§5-6), matrice RNG (§7), interdits/garde-fous (§8), micro-sets/factions (§9-10), draft/sideboard (§11), promotion/fusion/sorts (§12), **règles implicites profondes (§13)**, **zones floues / questions à reposer (§14)**, puis 16 sections « structure statistique » (coûts, raretés, géométries, factions, génération de cartes §27, table paramètres simulateur §31) + 2 blocs `extracted_knowledge/system_improvements/missing_systems/idea_dump`.
- **`llm-lego/` artefacts `chess-tcg-3d`** — passe *cartographie de méthode* (juillet) : Roadmap/Artefact/Goal/Chaîne + Wire Map. **Le jeu n'a pas été construit** — c'est une carto, pas du code.

### 1.2 Sur la machine (récupéré → `recovery/incoming/`, 26 fichiers)
Voir `_inventory_desktop.md` et `_inventory_downloads.md`. Points saillants :
- **Version décidée du noyau (mai)** : `formula_bible` (engine spec + pipeline 17 étapes), `MAJ_complete_formula` (Formula Bible proto labo **v7** : dégâts `max(1,ATK-ARM)`, pression roi, fatigue, timeout, **baseline calibrée sur 50 parties**), `game_desi` (générateur RNG « version studio »).
- **Architecture de frontière** : `AAA_TACTICAL_CORE_ARCHITECTURE.md` (migration lab échecs → moteur tactique réutilisable).
- **Docs binaires à convertir** : `TACTICAL_CHESS_RECOVERY.docx`, `EXTRAIT2.docx`, `MASTER_BIBLE.docx`, `Crown_v1.odt`.
- **⚠ Contenu LLM synthétique** : `mega_bible_V1.md` + `max_knowledge_drain_part2.md` = bases d'abilities auto-générées (`f(context,target)`, 261+ entrées génériques). Volume ≠ canon.
- **Non copié (indexé)** : 4× `MEGA_CORPUS_PART_1/2.md` (136 Mo, 2 uniques + 2 doublons exacts).

### 1.3 Archives PureLab + Bureau du poste studio (pointeurs Pierre, reprise 2)
Vérifiés à la demande de Pierre :
- **`TacticalChessPureLab/MASTER_DOCS/ARCHIVE/CONTEXT/AUTOBATTLER_RELECTURE_2026_04_26/`** (copié → `incoming/autobattler_relecture_2026-04-26/`, 6 docs). Relecture structurée **entièrement dérivée de project_genesis** (chaque point cite sa section). Lignée T. **Valeur nette** :
  - **Mode produit candidat « autobattler »** : phase stratégique (draft + placement + éventuel 1 sort) puis **combats auto-résolus** — déplace la charge du micro-exécution vers draft/placement. → option forte pour la décision **C8 / product mode** (et pour le CERFA « expérience joueur »).
  - **Garde-fous d'auto-résolution** : bannir hard-control + longue portée + ligne complète ; taxer/raréfier zone+contrôle ; forcer spécialisation par pièce (reine offensive, fou contrôle).
  - **Fusion/sideboard** (informe C1/C2) : fusion roi/reine **seulement avant partie**, roque interdit, « certaines fusions coûtent un sort » ; **1 sort/tour** ; promotion ≤ 1 par niveau ; sideboard = « shop » d'options entre rounds.
- **`TacticalChessPureLab/LOCAL_ARCHIVE/`** : bundles git + rapports de migration (Kenpachi/AM_DATA/cleanup). **Zéro design TCG.**
- **`Desktop/studioV2/`** : **repo studio antérieur** (pas de `repos/games/ChessTCG` → snapshot d'avant l'étagère canonique) ; `lab/project_genesis` en **doublon**. Rien de net-nouveau TCG.
- **Confirmation renforcée** : générateur-code + simulateur v7 + SET lignée T **toujours introuvables** après ces 2 pointeurs. Le verdict « à coder à neuf ou dans le ChatGPT » tient.

---

## 2. Tableau de contradictions (avril vs mai/juin)

> **La contradiction dominante est cross-lignée (T vs C) — voir §0.** Elle prime sur tout le reste : tant que Pierre n'a pas
> choisi la lignée, arbitrer les détails internes est prématuré.
> Le tableau ci-dessous ne concerne QUE l'**intérieur de la lignée T** (avril vs mai) : là, pas de conflit de fond —
> même colonne vertébrale, mai *tranche* les ambiguïtés d'avril, plus 2 vraies divergences internes.

| # | Sujet | Version A — avril (project_genesis) | Version B — mai/juin (recovery) | Plus aboutie | Verdict |
|---|---|---|---|---|---|
| 1 | Budgets par pièce | P4 / C6 / F6 / T7 / Q8 / K9 | **identiques** | = | ✅ pas de conflit |
| 2 | Coûts PV / ATK / ARM | PV 4→0…9→5 · ATK 1→0…4→3 · ARM 0/1/2 → 0/2/4 | **identiques** | = | ✅ pas de conflit |
| 3 | Rareté | commune 60 / unco 30 / rare 10, rare = budget +1 | **identiques** | = | ✅ pas de conflit |
| 4 | Structure de set | ~18 cartes/faction, 3 héros (combat/tacticien/mage) | **identiques** | = | ✅ pas de conflit |
| 5 | **Formule de dégâts** | **non tranché** : `max(1,ATK-ARM)` *vs* `max(0,dmg-ARM)` (conflit ouvert) | **tranché** : `max(1,ATK-ARM)` | **B** | ⚠ B décide — à ratifier |
| 6 | **Ordre de résolution** | **ouvert** : « plusieurs versions convergent » ; BRAWL/promotions/invocations non verrouillés (§2, §13) | **verrouillé** : pipeline 17 étapes (traversal→arrivée→attaque→riposte→cleanup→BRAWL→cleanup→pression→victoire) | **B** | ⚠ B décide — à ratifier |
| 7 | **6ᵉ faction** | **Maréchalat** (désarmé / faiblesse, neutralisation) | **Mystiques** (gel) | ambigu | 🔴 DIVERGENCE réelle — arbitrage |
| 8 | Faction Empire | Empire **Solaire** : faiblesse / support / bouclier | Empire : buff / bouclier | A plus détaillée | 🟠 B abrège A |
| 9 | **Stats de la pièce de base** | générateur : Pion **PV6 / ATK2 / ARM0** | proto labo : Pion **3HP / 3ATK / 0ARM** | couches ≠ | 🔴 DIVERGENCE de COUCHE — le proto joue hors de la table de coûts du générateur |
| 10 | Portée / géométrie | « deux versions ont coexisté » (ambiguïté assumée) | table unique simplifiée | B | 🟠 B simplifie |
| 11 | Bases d'abilities | absentes (design par principes) | `mega_bible`/`drain` = 261+ abilities générées | — | ⚠ B = bruit LLM, à écarter du canon |
| 12 | Milestone projet | TCG = produit à construire | `MASTER_TRUTH_MAP` : « vrai milestone = PURE CHESS AI LAB » | — | 🟠 tension de priorité (≠ décision Pierre actuelle : TCG = produit n°2) |

**Arbitrages** : d'abord **§0 (T vs C)** ; puis, si lignée T retenue : ligne 7 (Maréchalat vs Mystiques), ligne 9 (échelle de stats générateur vs proto), lignes 5+6 (ratifier les décisions de mai). Si lignée C retenue, la plupart de ces lignes deviennent sans objet (C a ses propres stats fixes).

---

## 3. Liste des manquants (ce que les sources référencent mais qu'on n'a PAS retrouvé)

Référencé par le *Knowledge Transmission Protocol*, le *Starter Pack V5*, et les docs de design :

| Manquant | Référencé par | Retrouvé ? | Où chercher |
|---|---|---|---|
| **Le générateur de cartes (code/script)** | 03_JEUX, game_desi (« existait sur ancien disque dur, à récupérer ») | ❌ NON | ancien disque dur / archives ChatGPT / `TacticalChessPureLab` |
| **SET 1 officiel jouable** (liste de vraies cartes) | game_desi §11, « SET 1 officiel jouable » | ❌ NON (règles oui, cartes non) | archives ChatGPT |
| **Code du proto labo v7** (qui a produit la baseline 50 parties) | MAJ_complete_formula | ⏳ probable dans `TacticalChessPureLab/` | **sweep legacy à finir** |
| **Simulateur batch / 1M parties** | game_desi, formula_bible §Simulation | ❌ NON | proto labo / archives |
| `01_MASTER_BIBLE` (autorité design structurée) | Transmission Protocol §2 | 🟠 partiel = `MASTER_BIBLE.docx` (binaire non lu) | conversion docx |
| `02_SYSTEM_DATABASE` (tables data structurées) | Transmission Protocol §2 | ❌ NON (mega_bible synthétique ne compte pas) | archives / proto |
| Contenu des **.docx / .odt** (RECOVERY, EXTRAIT2, MASTER_BIBLE, Crown v1) | — | ⏳ copiés, non convertis | conversion à faire |
| Croisement **audits** (ce que les audits inventoriaient) | AUDIT_COMPLET, STAFF_ENGINEER, UX, MEGA_ANALYSIS | ⏳ non extrait (agent repo coupé) | **inventaire repo à finir** |

> **Mise à jour après conversion docx/odt** : le **SET 1 de cartes réelles EST RETROUVÉ** pour la lignée C —
> `Crown_v1.odt` contient **50 fiches d'unités complètes** (stats fixes, factions, coûts, classes). Il reste manquant
> pour la lignée **T** (le générateur procédural n'a pas de set matérialisé).
> **Pour Pierre → archives ChatGPT** : ne reste que (1) le **générateur de cartes en CODE** (lignée T) et (2) le **simulateur/proto v7 en code** — tous deux probablement dans le legacy `TacticalChessPureLab` (sweep en cours).

### 3.0 ⭐ MISE À JOUR (ChatGPT récupéré) — le générateur n'est pas « perdu », il n'a jamais été codé
Récupéré depuis ChatGPT (projet « chess data centralisation », conv. « Matrice création carte RNG ») →
`incoming/chatgpt_mega_matrice_generation_carte_rng.md`. Deux faits qui **clôturent la question des manquants** :
- **Le générateur = design, pas code.** ChatGPT (qui a accès aux sources de Pierre) le dit explicitement :
  « toute la partie autobattler / cartes / RNG contrôlé est aujourd'hui **roadmap / idea dump, pas vérité runtime** ».
  Donc il n'y a **jamais eu** de générateur de cartes exécutable à récupérer — ce qui explique pourquoi tous les
  sweeps locaux l'ont classé introuvable. **Rien n'est perdu** : la conception est retrouvée, la coder = Phase 3 (prévu).
- **La conception est même plus riche que le canon actuel.** C'est une **3ᵉ version, "AAA / Graphe Sémantique"** :
  génération **name-driven** (le nom pilote le gameplay via des **tags** → bonus), ~40-60 matrices interconnectées
  (Général, Identité, Dictionnaire de Tags, Couleurs/Titres/Matières/Organes/Adjectifs/Éléments/Lieux, Synergies
  double/triple/quadruple, Interdictions, Familles, Évolution, Capacités, Cosmétique, IA, Personnalité, Culture).
  Principe clé : **le moteur produit des TAGS, pas des stats** (mots indépendants des règles).
- **Le "simulateur 50 parties" ≠ simulateur de cartes** : la baseline vient du **proto Rust d'échecs** (règles cœur
  lignée T : traversée/BRAWL/pression), `simulation_runner.rs` **déjà dans le repo**. Pas un manquant.
- **Traces restantes à vérifier** (citées par ChatGPT) : `tactical_chess_rng_bible.md` + `ability_library_5000/10000.csv`
  dans le corpus `ULTRA_FUSED` = **probablement les `MEGA_CORPUS_PART_1/2.md` 136 Mo** du Bureau (à grepper si on veut
  les listes d'abilities matérialisées — mais ce sont des idea-dumps, pas du canon).

**→ Conclusion manquants : il ne reste AUCUN trou dur.** Design générateur = retrouvé (2 versions : budget-de-puissance
consolidée + graphe sémantique AAA). Code générateur/simulateur = n'a jamais existé → à créer (Phase 3). SET lignée C =
retrouvé (50 cartes Crown). SET lignée T = à générer une fois le générateur codé.

### 3.1 Croisement avec les audits (agent repo) — signal stratégique fort
- **Le jeu TCG est ABSENT des audits.** Dans AUDIT_COMPLET, STAFF_ENGINEER, UX, MEGA_ANALYSIS, ROADMAP_ROI, STUDIO_OS, MASTER_PROMPT : « Tactical Chess Studio » désigne **le studio** (moteur d'échecs Rust + factory + Snake), **jamais** le jeu de cartes. **Aucun audit n'inventorie de GDD/bible/générateur/set/simulateur TCG** comme devant exister → la liste des manquants durs ci-dessus n'est **pas** couverte par les audits.
- **P0-4** : `repos/games/TacticalChessPureLab/` est cité par **89 fichiers .md mais est INEXISTANT dans le repo** — les audits le classent « chemin mort à réécrire » sans savoir qu'il portait le proto TCG. C'est exactement le legacy que le sweep cherche (côté machine, `Desktop/TacticalChessPureLab`).
- **P0-E** 🔴 : **aucun oracle qualité hors échecs/Snake**. Un TCG arriverait **sans gate mécanique** → viole la doctrine verdict/oracle. À traiter en Phase 2 (chaque tranche du moteur doit apporter son oracle).
- Signaux à peser : audits priorisent **Snake** (revenu) ; `00_SYNTHESE` **déconseille explicitement le deckbuilder** (fatigue post-Balatro). Le TCG comme produit n°2 est une **décision de Pierre qui va à contre-courant des audits** — assumé, mais à savoir.

### 3.2 Zones floues (avril §14) + systèmes manquants formels (§39)
Utile pour les 5 questions HumanGate de Phase 2 :
- **§14 critique** : formule/ordre de combat · **sort du BRAWL (garder ou couper)** · tables de coût finales · matrice des reines · liste de mots-clés canonique. **Important** : caps invocations/résurrections · timing des fusions · pression du roi · politique de rareté.
- **§39 (10 systèmes manquants, généré LLM → propositions)** : matrice de **légalité de génération** (n°1) · rareté · terrain · promotion · draft/sideboard · fusion · taxonomie géométrie · évaluateur IA · caps set-level · keyword list canonique.

---

## 4. Reste-à-faire Phase 1
1. ✅ **Extraction audits** — fait (§3.1). 2. ✅ **Conversion .docx/.odt** — fait (a révélé §0, la découverte majeure). 3. ✅ **Council RED_TEAM** — fait (§5).
4. ⏳ **Sweep legacy `TacticalChessPureLab/`** (côté machine) — SEUL reste : y trouver le **générateur en code** + **simulateur/proto v7** (les 2 derniers manquants durs). En cours.

---

## 5. Council RED_TEAM — EXÉCUTÉ

`scripts/council.py --task-id tcg-reconciliation-phase1` lancé sur LM Studio local (Qwen 14B, port 1234, **hors quota
Anthropic**). Artefacts dans `lab/council/`.

**Statut technique** : council **collapsé sur 1 modèle** (`distinct_models: 1`, `collapsed: true`) — LM Studio est
mono-instance et les 3 rôles concurrents se sont marché dessus (RED_TEAM et DIVERGENCE `role_unavailable`, seul
PLAN_REVIEW/Qwen a abouti). Un **appel RED_TEAM direct séquentiel** a ensuite récupéré la substance.

**Verdict council : `ESCALADE` / `requires_humangate: true` / `claim_posture: NO_CLAIM_ALLOWED`.**
Voix PLAN_REVIEW : « clarifier les divergences avant de coder le moteur de règles pur, sous peine d'erreurs coûteuses ;
prudence face à la complexité et aux ambiguïtés ».

**RED_TEAM (Qwen, appel direct) — angles morts :**
- **Q1** — Des nombres identiques (PV/ATK/ARM) peuvent masquer un **conflit sémantique** : même valeur, sens différent selon l'ordre de résolution et la formule de dégâts. La convergence des tables ne *prouve* pas « même système ».
- **Q2** — Les décisions de mai (dégâts, pipeline) doivent être traitées comme **hypothèses proto à re-valider**, pas ratifiées comme canon sans validation approfondie (risque d'incohérences futures).
- **Q3** — `Pion PV6 (générateur)` vs `Pion 3HP (proto)` = **piège d'implémentation** si non documenté/assumé explicitement : casse le branchement générateur→moteur si c'est une erreur de conception plutôt qu'un choix de couche.
- **Q4** — Plus grand risque : **coder directement la version mai en ignorant les divergences non résolues** → incompatibilités majeures et re-travail d'une grande partie.
- **Q5** — Les manquants (générateur en **code**, **SET 1** de cartes réelles, **simulateur**) rendent l'affirmation de réconciliation **prématurée et risquée**.

**Convergence pré-avis ↔ council** : les deux pointent la **ligne 9 (échelles de stats)** comme le vrai piège, et
demandent de **trancher avant de coder**. Le council **ne valide PAS** la réconciliation en l'état — il **escalade à Pierre**.
