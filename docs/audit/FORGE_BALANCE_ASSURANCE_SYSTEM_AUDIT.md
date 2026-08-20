# Forge — Balance Assurance System (BAS) : audit-puis-spécification

- **Statut : PROPOSED — gate Pierre.** Date : 2026-07-20 · Auteur : Opus (audit BAS, ratifié Pierre : audit-puis-spécification, AUCUN code, AUCUNE intégration).
- **Méthode** : chaque garde/outil vérifié au repo (file:line), jamais de mémoire. Faits / hypothèses / recommandations séparés. NON TROUVÉ explicite. Rasoir 6 questions par recommandation. Confrontation obligatoire aux ratifications antérieures (R10, Annexe santé ludique, Consolidation §4).
- **Périmètre** : le « Balance Assurance System » = équilibrage **mathématique** automatisé du CONTENU INVENTÉ par la Forge, générique à travers les jeux. Ce document AUDITE l'existant puis SPÉCIFIE ; il ne construit rien.

---

## 0. Doctrine imposée (verbatim Pierre — gravée en tête, non négociable)

> - La Forge automatise l'équilibrage **mathématique**, JAMAIS le fun (verdict humain du game master, après build).
> - LLM = générateur de conjectures/contraintes · moteur+simulation = preuve · humain = jugement final du fun.
>   **« Un LLM peut casser une idée. Un moteur doit prouver qu'elle casse. L'humain décide si elle est amusante. »**
>   Le pont = le **SEED** : toute conjecture LLM doit être traduisible en scénario reproductible que le moteur — seul oracle — tranche.
> - **Critère de déclenchement (seule constante universelle)** : BAS ne s'applique qu'aux jeux à contenu/paramètres **INVENTÉS** (Chess TCG, AutoBattler, Leviathan). Jeux à règles officielles figées (Belote, échecs) = HORS périmètre (conformité aux règles seulement). Détection : le jeu déclare-t-il du contenu paramétrique généré ?
> - **Patron unique** : la Forge impose le SCHÉMA (types d'invariants, jamais de valeurs/noms/seuils en dur) ; la Design Bible du jeu remplit les VALEURS ; la gate REFUSE LE VIDE.
> - **3 lignes de défense** : L1 génération contrainte (enveloppe de la Bible) · L2 simulation (agents calibrés vs matrices-cible + skill par phase) · L3 adversarial (LLM conjecture → seed → moteur tranche).
> - **Calibration = fondation obligatoire AVANT toute mesure de vrai jeu** : agents sur jeu-témoin à profondeur connue ; métriques sur pathologies PLANTÉES.
> - **Gate de livrable** : bloque si enveloppe violée OU matrice-cible violée OU skill plat OU rupture confirmée moteur.

**Réserve de cohérence portée dès l'en-tête (développée §Coherence)** : deux des quatre conditions de blocage du « gate de livrable » (« matrice-cible violée », « skill plat ») portent sur des mesures de SIMULATION qui, par ratification antérieure (META-2, R10/§4-B), sont **advisory et jamais `software_verdict`**. Ce document ne peut pas les traiter comme gating sans contredire une ratification Pierre — il le signale explicitement et propose la réconciliation (L1 et L3 gatent ; L2 reste advisory).

---

## Coherence avec les ratifications antérieures (obligation : jamais de glissement silencieux)

Sources confrontées : `docs/audit/FORGE_V2_R10_HEALTH_ORACLE_AUDIT.md`, `FORGE_V2_ANNEXE_SANTE_LUDIQUE.md`, `FORGE_V2_CONSOLIDATION.md` (§4).

Ce que ces documents ont **ratifié** (rappel factuel) :
- **R10 §7 / §6** : la classe « santé ludique structurelle » = ABANDON comme classe ; anti-dominance **large** = Hold/Abandon ; le seul survivant de la dominance = **sliver §4-B advisory, conditionné aux sondes P1.1, jamais dans `software_verdict`**.
- **Annexe §2-3 / §6** : familles anti-impasse / anti-faux-choix / anti-atrophie **ABANDONNÉES** (faux positifs = choix de design légitime). Contre-exemple critique de Pierre : **Belote « obligation de suivre » = zéro choix, c'est la règle** — même structure exacte qu'un bug, verdicts opposés, indécidable sans intention.
- **Consolidation §4-B/§4-D + principe de viabilité** : R9 (solvabilité) = priorité ; un capteur advisory unique survit ; « empêcher le non-fun comme gate » = ABANDON (triple gate 0/3).

### Là où BAS ROUVRE une famille gatée — argument EXPLICITE contre le dossier

**(a) Le critère de déclenchement (contenu inventé) neutralise-t-il le contre-exemple Belote ?**
**OUI, partiellement — et c'est un vrai gain, mais borné.** Le contre-exemple Belote frappait un oracle de santé ludique **générique appliqué à TOUS les jeux**. BAS pose une **constante universelle de déclenchement** : Belote (règles officielles figées, aucun contenu inventé) est **EXCLUE par construction** — elle n'est jamais soumise à BAS. Donc « obligation de suivre = zéro choix » ne peut plus produire de faux positif : BAS ne regarde pas Belote. Ce critère isolé **change le verdict** sur les jeux à règles figées : ils sortent du champ, la famille anti-faux-choix n'a plus à les protéger.

**MAIS le dossier survit à l'intérieur du périmètre.** Le contre-exemple Belote n'était qu'une INSTANCE d'un principe plus large que R10 §5 documente et que le déclenchement ne touche pas : **un jeu à contenu inventé contient lui aussi des dominances/faux-choix de design LÉGITIMES**. R10 §5 (red-team) cite, dans le périmètre inventé : le **round de boss / power-spike scripté** (une config bat le champ >70 % par intention), le **hard-counter situationnel** (unité rare mais essentielle contre un archétype), la **mécanique de comeback** dont la valeur est la dissuasion (invisible à un compteur d'usage). Ces trois-là sont des auto-battlers / TCG à contenu **inventé** — donc DANS le périmètre BAS — et restent des faux positifs. **Le déclenchement rétrécit la surface, il ne referme pas le trou de faux positifs à l'intérieur.**

**(b) La calibration-d'abord (pathologies plantées) est-elle la falsification exigée par le contradicteur ?**
**OUI pour une direction, NON pour l'autre.** Le protocole P1.1 (repris par BAS) exige DEUX témoins : un **témoin truqué qui DOIT rougir** (falsifie « la métrique ne détecte rien ») ET un **témoin sain qui NE DOIT PAS rougir** (falsifie « la métrique rougit sur du design sain »). La calibration-d'abord de BAS traite la première : une métrique qui ne rougit pas sur une pathologie plantée est **rejetée**. Elle **n'élimine pas** la seconde : rien ne garantit qu'un power-spike scripté légitime ne rougira pas. Or c'est précisément la seconde qui a tué les familles B/C/D. **Conclusion de cohérence** : la calibration-d'abord **améliore** la rigueur (elle interdit une métrique aveugle) mais **ne rouvre pas** le droit de GATER sur la dominance — le risque de faux positif « sain rougit » demeure et impose le maintien advisory ratifié en §4-B.

### Verdict de cohérence (résultat)
BAS **ne contredit pas** les ratifications **si et seulement si** :
1. **L2 (simulation : matrice-cible, skill-par-phase, dominance) reste ADVISORY** — flag HumanGate, jamais `software_verdict`, exactement §4-B / META-2 / META-4. La condition de blocage « matrice-cible violée OU skill plat » de la doctrine imposée doit être relue comme **« flag advisory au HumanGate »**, pas comme gate mécanique. **C'est un point d'arbitrage Pierre** (le verbatim dit « bloque » ; la ratification dit « advisory ») — signalé, non tranché ici.
2. **L1 (enveloppe de génération) et L3 (rupture confirmée par le moteur sur seed) PEUVENT gater** — car ce sont des assertions **déterministes** (coût ≤ budget ; le moteur rejoue le seed et tranche), de la même famille que R9/solvabilité, PAS des jugements de simulation d'équilibre. Gater là ne rouvre aucune famille abandonnée.
Cette partition (L1/L3 gatent, L2 advisory) est la seule lecture de BAS compatible avec R10, l'Annexe et la Consolidation.

---

## P0 — Prérequis Design Bible (statue par section)

**Principe du patron unique** : par section absente, la première tâche est d'**imposer le SCHÉMA à la Bible** (la gate refuse le vide) — PAS de construire des agents. Un agent-sonde sans matrice-cible déclarée mesure contre du néant.

### AutoBattler — `games/auto_battler/bibles/`

Fichiers doctrine présents (Glob) : `01_GAME_BIBLE`, `02_CORE_RULES`, `03_DECISION_BIBLE`, `04_COMBAT_BIBLE`, `05_ECONOMY_BIBLE`, `06_META_BIBLE`, `07_DSL_BIBLE` (+ `00_*` template/vocab/archi + `HUMANGATE_*`).

| Prérequis BAS | Déclaré ? | Preuve (file:line) | Statut |
|---|---|---|---|
| **(a) Phases de décision** | **OUI** | `03_DECISION_BIBLE.md` : registre de 8 DP + 5 sous-décisions ; le **Flux** (L288-308) énumère les phases du Round : Income → Tirage Shop → Preparation (Merge DP-4, Bots DP-8) → Pairing → Combat (DP-6/DP-7) → Round Resolution. Chaque phase a un point de décision nommé. `06_META_BIBLE.md` OBJ-E3 (L226-233) exige explicitement une mesure « par phase de Match ». | **DÉCLARÉES** (schéma) |
| **(b) Matrices-cible de méta** | **OUI (registre), valeurs TBD** | `06_META_BIBLE.md` = LE registre : OBJ-1..10 + OBJ-E1..E3, chacun un quadruplet falsifiable (métrique·protocole·seuil·action, META-1 L41-46). OBJ-7 (L159-166) = « win-rate maximal toléré par Archetype » = la matrice-cible de dominance. **Tous les seuils = TBD** (QM-1..12, L379-393). | **SCHÉMA DÉCLARÉ, VALEURS VIDES** |
| **(c) Enveloppe de génération** | **PARTIEL — schéma oui, valeurs vides, propriétaire absent** | `05_ECONOMY_BIBLE.md` : Paramètres L206-222 = schéma complet des tables (coûts, odds, Pool, Bench) **toutes VALEURS = TBD** ; propriété déléguée à la **Balance Bible (P10)**. `07_DSL_BIBLE` déclare le monde fermé des critères (budgets de création). | **SCHÉMA DÉCLARÉ, VALEURS VIDES** |

**NON TROUVÉ — constat P0 majeur (AutoBattler)** : les bibles **Balance Bible**, **Simulation Bible** et **Content Bible** sont RÉFÉRENCÉES comme propriétaires des VALEURS et des PROTOCOLES (`06_META` L24-32 ; `05_ECONOMY` P10 partout ; `03_DECISION` DP-8→Simulation Bible) mais **n'existent PAS comme fichiers** (Glob `bibles/*` : seuls 01-07 numérotés). Conséquence directe pour BAS :
- La matrice-cible existe en **forme** (Meta Bible) mais **aucun seuil n'est rempli** → L2 n'a rien à comparer.
- L'enveloppe existe en **forme** (Economy schéma) mais **aucune valeur ni budget chiffré** → L1 n'a aucune borne à imposer.
- Le protocole de mesure (Simulation Bible) **n'existe pas** → aucune Campaign calibrée n'est spécifiable.

**Statut P0 AutoBattler** : les schémas sont **excellents et déjà conformes au patron unique** (la Forge a bien imposé le SCHÉMA, les bibles refusent d'inventer des valeurs). Mais BAS est **bloqué en amont par le vide de valeurs** : la première tâche N'EST PAS de construire des agents — c'est de **remplir Balance Bible + Simulation Bible + Content Bible via le cycle P9 (Méta cible → Budgets → Contenu → Simulation → Ajustement), sous gate Pierre**. La gate BAS « refuse le vide » est déjà satisfaite au niveau schéma ; elle est **violée au niveau valeurs** — et c'est là qu'il faut agir d'abord.

### Chess TCG — `repos/games/ChessTCG/` (canon) + `games/chess_tcg/` (Godot)

| Prérequis BAS | Déclaré ? | Preuve (file:line) | Statut |
|---|---|---|---|
| **(a) Phases de décision** | **NON (comme bibles structurées)** | Canon = `MASTER_DOCS/03_GAME_DESIGN_CANON.md`, `05_CARD_ABILITY_TAXONOMY.md` (règles), pas de registre de points de décision au format bibles. | **NON TROUVÉ** (pas de Decision Bible équivalente) |
| **(b) Matrices-cible de méta** | **NON** | Aucun document type Meta Bible (objectifs win-rate/diversité/archétypes falsifiables). Le draft/sideboard est décrit en prose (`SOURCE_IMPORTS/.../03_SYSTEMES_META_DRAFT_SIDEBOARD.md`). | **NON TROUVÉ** |
| **(c) Enveloppe de génération** | **OUI en DOC, statut DOCUMENTED_ONLY** | `04_RNG_FORMULA_CANON.md` : budgets pièce (Pion4…Roi9), tables de coûts stats/géométrie/effets, **combos interdits** (L79-87 : freeze+ligne complète, charme+zone, stun+portée>3, double debuff majeur), **repair order** (L88-99), **reject conditions** (L100-112). `08_GENERATOR_UNIFIED_CANDIDATE.md` = pipeline candidat « B propose, A dispose ». | **DOC seul — voir NON TROUVÉ code ci-dessous** |

**NON TROUVÉ — constat P0 majeur (Chess TCG), corrobore la mémoire studio** : `08_GENERATOR_UNIFIED_CANDIDATE.md` L48-52 le dit lui-même : *« `NOT_FOUND` — aucun code. Ni A ni B n'ont jamais existé en exécutable. »* Vérifié par l'inventaire : `games/chess_tcg/` (Godot) contient un **simulateur de match jouable** (`core/match.gd`, `rules.gd`, `ai.gd`) et un **catalogue de cartes/pièces aux stats CODÉES EN DUR** (`core/piece_defs.gd` : QUEEN 8/4/0, KING 10/2/2 ; `core/cards.gd` : effets qui mutent les stats, `p.atk += 1`), **mais AUCUN générateur qui calcule stats/coûts procéduralement**. La matrice budget:coût/effets/anti-abus de la mémoire studio **existe en tant que canon documentaire, JAMAIS en code exécutable**.

**Statut P0 Chess TCG** : pour BAS, Chess TCG est un jeu à contenu inventé **sans les prérequis structurés** — ni phases de décision formalisées, ni matrice-cible de méta, et son enveloppe de génération est un canon papier non exécuté. **Première tâche BAS pour Chess TCG** = imposer le schéma des trois sections (a/b/c) au projet AVANT toute sonde. Le générateur unifié (08) reste, de l'aveu du canon, **hors du chemin critique du moteur de règles**.

---

## P1 — Audit de l'existant (classement typé)

Vocabulaire : IMPLEMENTED / TESTED / DOCUMENTED_ONLY / PASSIVE / BLOCKED / NOT_FOUND / UNKNOWN.

| Surface BAS | Où (file:line) | Classement | Fait |
|---|---|---|---|
| **Matrices de génération (L1) — Chess TCG en CODE** | `repos/games/ChessTCG/MASTER_DOCS/04_RNG_FORMULA_CANON.md`, `08_GENERATOR_UNIFIED_CANDIDATE.md:48-52` | **DOCUMENTED_ONLY** (code = **NOT_FOUND**) | Budgets/coûts/combos interdits/repair order tous en doc `status: DOCUMENTED_ONLY` ; générateur exécutable inexistant (aveu du canon). Godot = stats hardcodées, pas de générateur. |
| **Matrice de génération — llm-lego / KB** | `knowledge_base/catalog.json` (30 entrées, 2 `usage_examples`) | **NOT_FOUND** (pour la génération contrainte de contenu) | Le catalogue KB indexe des briques logiques advisory ; aucune matrice budget→carte exécutable. |
| **Red-team s6 (plan)** | `scripts/forge/contracts/s6-redteam-plan.yaml` (LLM Qwen ; L54 « jamais de LLM-as-judge ») | **IMPLEMENTED** · **ADVISORY** | Attaque plan (archi+wiremap), prose, jamais juge du code. |
| **Red-team s11 (code)** | `scripts/forge/contracts/s11-redteam-code.yaml:20,53,63` | **IMPLEMENTED** · **ADVISORY** | Sous-agent aveugle ; « Advisory : ne remplace pas les oracles » ; écrit `rapport_redteam_code.md`. Entre au verdict via `driver.py:611-615` `extra_advisory`, jamais gating. |
| **Playtests (capture)** | — | **NOT_FOUND** | 0 fichier de playtest (P1_AUTOPSIE §4 ; R2 encore PROPOSED). Le juge du fun (game master) n'a aucun canal structuré. |
| **Solvabilité (R9)** | `games/auto_battler/solvability.mjs:287,298,307,330,361` (5 volets) ; `check_solvability_wired` `static_oracles.py:390` ; `driver.py:519,564` | **IMPLEMENTED + TESTED + GATING** | 5 volets : `checkPlayableLoop`, `checkVictoryReachable`, `checkResourcesAvailable`, `checkSimulationTerminates`, `checkCoreMechanicsActivate`. Falsifié par `solvability.falsification.test.mjs`. card_engine = 2 checks seulement (`games/card_engine/solvability.mjs:21,40`). |
| **Mutation** | `scripts/forge/mutation_proof.py` (reçu HMAC) ; `check_mutation_gate` `static_oracles.py:629` ; `driver.py:550-580` | **IMPLEMENTED + TESTED + GATING** | 100 % tués OU triage tracé ; reçu signé re-vérifié. |
| **Oracles static (8 gardes + R1)** | `static_oracles.py` : `check_architecture:197`, `check_wiremap:262`, `check_e2e_harness:335`, `check_solvability_wired:390`, `check_harness_no_hardcoded_flags:481` (R1), `check_feature_set_frozen:584`, `check_mutation_gate:629`, `check_charter:707` | **IMPLEMENTED + GATING** (sauf `check_reuse_ratio_wired:430` et `check_search_consulted:528` = **ADVISORY**) | Détail GATING/ADVISORY confirmé par usage `driver.py`. |
| **Fuzzing / property-tests** | Déclarés en Oracle Hooks des bibles (`05_ECONOMY` ECO-1..8 L354-382 : property-tests de conservation) ; non construits | **DOCUMENTED_ONLY** | Les property-tests d'économie sont spécifiés, pas encore codés (moteur auto_battler incomplet). |
| **Simulation / agents de jeu — `role_sim.mjs`** | `knowledge_base/role_sim.mjs` (PAS `scripts/forge/` — la mission s'attendait à `scripts/forge/role_sim.mjs`) ; schéma `knowledge_base/roles/SCHEMA.md` ; preuves `knowledge_base/proofs/role_sim_*_{calibration,validation}.log` | **IMPLEMENTED + TESTED — mais ORPHELIN des vrais jeux** | Mesure une **BANDE DE DIFFICULTÉ** sur N essais seedés vs bande DÉCLARÉE (pas un booléen — c'est le rôle de solvability). Générique depuis le 2e rôle (charge `simulation_module` dynamiquement). Reçu `proof_of_use` signé, tiers `candidate`/`validated`, garde 3-états. **Appliqué UNIQUEMENT à des rôles-jouets** (`role-guardian-static`, `role-pursuer-mobile`), **JAMAIS à auto_battler ni Chess TCG**. |
| **`role_sim` — qualité de calibration** | `knowledge_base/proofs/role_sim_guardian_static_calibration.log:11` | **FAIBLE (exemple négatif utile)** | La bande déclarée du gardien = `[1, 999]` : une bande si large qu'elle **ne peut jamais rougir** (mesuré 11, borne 999). C'est exactement la « métrique rejetée » que la calibration-d'abord doit interdire (P3). |
| **`pool.py` best-of-N** | `scripts/forge/pool.py` (`DEFAULT_POOL_SIZE=2`) ; wiré `driver._maybe_escalate` | **IMPLEMENTED · hors sujet balance** | Retente le BUILD sur oracle FAIL avant d'escalader le modèle ; tie-break = 1er candidat dont l'oracle RÉEL passe. Ne mesure aucun équilibrage. |
| **Skill `/balance-check`** | `.claude/skills/balance-check/skill.md` (9 lignes) | **DOCUMENTED_ONLY** | Stub prose : « invariants : pas de stratégie dominante ; feeling → Pierre ». Aucun oracle, aucun calcul, aucune sonde. |
| **Pipeline « Factory » (mémoire : Council→Factory)** | `studio/factory/` : `ir_schema_v1.json`, `template_engine.py`, `llm_logic_engine.py`, `oracle_sim.py`, `factory_loop.py`, `registry/` ; `studio_core/factory/manifest.py` | **IMPLEMENTED · GÉNÉRATION de jeu (pas balance), lane STUDIO** | Factory = pipeline IR→scaffold→logique LLM→**oracle_sim déterministe** (exit 0/1/2)→registry HMAC. C'est un **générateur de jeu** avec oracle exit-code, PAS un système d'équilibrage de contenu. « Council » = skill de délégation LLM (`.claude/skills/council/`), **NON** un quatuor schéma/validateur/routeur/oracle (NON TROUVÉ sous ce nom). |
| **`campaign_runner_v1.py`** | `scripts/studioV2/campaign_runner_v1.py` (matrice `VARIANT_MATRIX` de flags de règles × matchups) | **IMPLEMENTED — mais en LANE GELÉE** | Fait tourner une matrice de variantes et agrège des stats — le plus proche parent d'un « runner de Campaign ». **MAIS `scripts/studioV2/` est GELÉ (CLAUDE.md, ratifié 2026-07-19)** : inextensible sans HumanGate. À NE PAS réveiller par BAS sans décision Pierre. |
| **KB catalog** | `knowledge_base/catalog.json` | **PASSIVE** | 30 entrées, 2 `usage_examples` remplis (Consolidation §5 baseline). |

### Réponse aux deux questions imposées
- **« Comment ce jeu peut-il être cassé ? » AVANT build** : **NON (mécaniquement).** L'enveloppe qui empêcherait de créer le broken (L1) existe en DOC (Chess TCG canon) mais **n'est ni exécutable ni une obligation Forge** ; côté auto_battler, aucune valeur n'est remplie. Le seul « avant » réel est le red-team LLM (s6), **advisory et en prose** — il conjecture une cassure mais **ne la prouve jamais** (pas de pont seed→moteur).
- **APRÈS build** : **PARTIEL.** La **viabilité/mécanique** est couverte et gatée (solvabilité 5 volets + mutation + 8 gardes static). L'**équilibrage** (dominance, skill-par-phase, matrice-cible) n'est **PAS** couvert : le capteur de dégénérescence est **BLOCKED sur les sondes P1.1** (§4-B), et `role_sim` — le primitif qui saurait le faire — **n'a jamais été branché sur un vrai jeu**.

---

## P2 — Les 3 lignes sur l'existant

| Ligne | Manque réel / duplication / extension / évolution | Preuve |
|---|---|---|
| **L1 — génération contrainte (enveloppe)** | **MANQUE RÉEL en code + non-obligation.** La matrice Chess TCG (budget→coût, combos interdits, repair order, reject) est un **canon complet mais DOCUMENTED_ONLY** ; auto_battler n'a aucune valeur d'enveloppe remplie. À construire depuis le canon — ce n'est l'extension d'aucun outil existant. | `04_RNG_FORMULA_CANON.md` (doc) vs `08_GENERATOR_UNIFIED_CANDIDATE.md:48` (`NOT_FOUND` code) |
| **L2 — simulation (agents calibrés)** | **EXTENSION d'un outil existant (orphelin).** `role_sim.mjs` EST le primitif exact : bande de difficulté seedée vs bande déclarée, calibration-d'abord, reçu signé, anti-post-hoc. Il lui manque (i) un `simulation_module` qui **joue un vrai jeu** (auto_battler/Chess TCG) — or le moteur de match auto_battler a été **supprimé comme code mort** (Annexe §1, `run-oracle.mjs:36`) ; (ii) la matrice-cible remplie (P0). | `knowledge_base/role_sim.mjs`, `roles/SCHEMA.md` ; Annexe §1 |
| **L3 — adversarial (LLM→seed→moteur)** | **MANQUE RÉEL, petit et net.** Les deux briques existent séparément : red-team LLM (s6/s11) **conjecture**, et solvability/role_sim **tranchent sur seed**. Le **PONT** — traduire une conjecture red-team en **fixture seedée que le moteur rejoue** — n'existe pas. Aujourd'hui un finding red-team finit en **prose advisory**, jamais en seed exécuté. C'est exactement le « SEED » de la doctrine. | s11 écrit `rapport_redteam_code.md` (prose) ; aucun connecteur finding→fixture |

**Où la matrice Chess TCG existe en code, et pourquoi elle n'était pas une obligation Forge** : elle **n'existe PAS en code** (`08:48` `NOT_FOUND`). Raison documentée : le canon la classe **hors du chemin critique du moteur de règles** (« après que le moteur de règles pur soit codé et testé ») ; et la lane Chess TCG a été conduite en mode **docs-only / import de sources** (charter `01_DOCS_ONLY_ROADMAP.md`), jamais jusqu'à un générateur exécutable soumis à oracle. La Forge n'a donc jamais eu de sortie exécutable à gater — l'enveloppe est restée un document d'intention.

---

## P3 — Calibration (protocole obligatoire AVANT toute mesure de vrai jeu)

**La méthode maison existe déjà et doit être RÉUTILISÉE telle quelle** : `knowledge_base/roles/SCHEMA.md` (bande déclarée AVANT mesure de validation, `difficulty_target` figé, reçu `proof_of_use` signé, garde 3-états) + `docs/forge/WORKFLOW_LAB_PROTOCOL.md` (interdit le retuning post-lecture) + `memory/P1_1_PROTOCOL` (sondes, sha gelé, seuils figés avant, témoins sain/truqué/neutre). BAS n'invente pas de méthode de calibration — il **applique celle-ci à des agents de jeu réels**.

**Protocole jeu-témoin (spécification, à ratifier)** :
1. **Jeu-témoin à profondeur connue** : un mini-jeu (ou une configuration figée du jeu cible) dont la **hiérarchie de skill est connue a priori** — ex. un auto-battler jouet où « acheter la meilleure unité » domine trivialement une politique aléatoire. Sha du jeu-témoin gelé.
2. **Critère de REJET d'un agent** : un agent-sonde qui **n'atteint pas la profondeur attendue** sur le jeu-témoin (ex. l'agent « plafond/optimal » ne bat pas l'agent « baseline aléatoire » d'un écart significatif pré-déclaré) est **REJETÉ** — il ne mesurera aucun vrai jeu. (Un agent trop faible mesure du bruit, pas du skill.)
3. **Critère de REJET d'une métrique** : une métrique est validée **ssi** elle **rougit sur une pathologie PLANTÉE** (témoin truqué : une unité ×10 stats, une boucle de ressource cassée, un OTK forcé) **ET ne rougit PAS sur le témoin sain**. L'échec de l'une OU l'autre condition **rejette la métrique**. Contre-exemple concret déjà au repo : la bande gardien `[1,999]` (`role_sim_guardian_static_calibration.log:11`) est une **métrique à rejeter** — elle ne peut pas rougir.
4. **Seuils et sha figés AVANT le run** (META-3 pré-enregistrement) ; comptage mécanique ; toute bande déclarée après lecture d'une calibration reste légitime **comme tuning de design**, mais est figée avant la mesure de VALIDATION (`SCHEMA.md:38-44`).

**Sonde générique par phase déclarée** (la Bible déclare les phases — jamais codées en dur) : baseline + plafond + 1 sonde/phase = **2+n agents**. Mesure falsifiable : `skill(phase_i) = winrate(sonde_i vs baseline) − 50 %`. Interprétation (advisory) : `skill ≈ 0` sur une phase = phase **décorative** ; `skill` plat partout = jeu **sans profondeur**. Ambiguïté (skill plat = jeu plat OU sonde ratée ?) levée par l'**ordre calibration→validation** : une sonde qui a passé la calibration sur le jeu-témoin ne peut plus être l'explication d'un skill plat sur le vrai jeu.

**Garde dure** : sans ce protocole exécuté et ses reçus signés, **AUCUNE mesure de vrai jeu n'est autorisée** — exactement la discipline `role_sim` (tier `validated` exige `proof_of_use` non-null).

---

## P4 — Rétrospective AutoBattler (claims prouvables uniquement — source `FORGE_V2_P1_AUTOPSIE.md`)

Discipline : ne PAS réécrire l'histoire. Les pannes P1 étaient **surtout intent/solvabilité**, déjà couvertes R7/R9. Question honnête : qu'aurait attrapé BAS **EN PLUS**, preuve à l'appui ?

| Panne réelle (P1_AUTOPSIE §3) | Ligne BAS candidate | Aurait-elle attrapé ? — verdict prouvable |
|---|---|---|
| « 0 or, combat jamais lancé » | L1 génération / solvabilité | **DÉJÀ couvert R9 volet 3** `checkResourcesAvailable` (`solvability.mjs:307`). BAS n'ajoute RIEN. |
| combat ne se lance pas / boucle cassée | solvabilité | **DÉJÀ couvert R9 volet 1** `checkPlayableLoop:287`. |
| modèle Battlegrounds choisi unilatéralement | (aucune ligne BAS) | **Couvert R7** (design-intent au charter). Hors BAS (c'est de l'intent, pas de l'équilibrage). |
| Godot jamais posé, tout en HTML | (aucune ligne BAS) | **Trou plateforme** (R10 §7 sliver), hors BAS. |
| unités sans nom / placement hors-zone | (aucune ligne BAS) | Contenu/règle → **playtest (R2)**, non oraclable. Hors BAS. |
| Combat Bible = jeu à mana que le code n'a jamais eu | conformité sémantique | **NON oraclable** (R10 §4-A). Hors BAS. |

**Ce que BAS aurait attrapé EN PLUS — réponse honnête** : **RIEN de prouvable sur l'autopsie AutoBattler.** Les pannes documentées sont toutes en amont de l'équilibrage (le jeu ne démarrait pas, ou l'intent était faux) — le domaine de BAS (dominance, skill-par-phase, matrice-cible) **n'a jamais été atteint** : on ne peut pas mesurer l'équilibre d'un jeu qui ne se lance pas. Le seul apport **hypothétique** (non prouvé par l'autopsie) : SI le jeu avait démarré ET les valeurs remplies ET un bot existant, la matrice de dominance (advisory) aurait pu voir une unité dominante avant le playtest. Mais l'autopsie ne contient **aucune instance** de « unité dominante mesurée » — donc c'est une **HYPOTHÈSE**, pas une preuve. **BAS ne se justifie pas par la rétrospective AutoBattler** ; il se justifie (si tant est) par le fait que le studio n'a **jamais encore mené un jeu à contenu inventé jusqu'au stade équilibrage** — un manque de couverture prospectif, pas une panne passée.

---

## P5 — Architecture minimale (si justifiée) — réutilise l'existant, AUCUNE nouvelle plateforme

Intégration dans la chaîne Forge existante, chaque pièce avec son statut :

```
Design Bible (Meta+Economy+Balance+Simulation+Content — P0 : REMPLIR les valeurs d'abord)
   │  matrice-cible (Meta) · enveloppe (Economy/Balance) · phases (Decision) · protocoles (Simulation)
   ▼
L1  génération contrainte           [À CONSTRUIRE — depuis 04_RNG canon (Chess TCG) / tables Economy (AB)]
     coût ≤ budget · combos interdits · repair/reject           → GATE dur (déterministe, famille solvabilité)
   ▼
s9  build (en chaîne — O4)
   ▼
s10a oracles code EXISTANTS         [IMPLEMENTED] solvabilité(5) + mutation + 8 gardes static
   ▼
L2  simulation calibrée             [role_sim.mjs EXISTANT — à brancher sur un simulation_module de vrai jeu]
     calibration-d'abord (P3) · skill(phase_i) · matrice win-rate vs matrice-cible
     reçu proof_of_use signé          → ADVISORY → humangate_flags  (JAMAIS software_verdict — §4-B/META-2)
   ▼
L3  adversarial                     [PONT À CONSTRUIRE — petit]
     finding red-team (s6/s11 EXISTANTS) → SEED/fixture → moteur rejoue (solvability/role_sim tranche)
     rupture CONFIRMÉE par le moteur   → GATE dur (déterministe) ; conjecture non confirmée → advisory
   ▼
s12 verdict signé (HMAC) EXISTANT → HumanGate Pierre → PLAYTEST game master (R2, capture)
```

| Pièce | Réutilise | Statut | À faire |
|---|---|---|---|
| Matrice-cible | `06_META_BIBLE.md` (registre OBJ-n) | SCHÉMA prêt, valeurs vides | Remplir seuils (gate Pierre, cycle P9) |
| Enveloppe | `05_ECONOMY` + `04_RNG canon` | schéma / doc | Remplir valeurs (AB) ; coder l'enveloppe (Chess TCG) |
| L1 gate | famille `check_solvability_wired` (déterministe) | à construire | Assertion coût ≤ budget, greffée reçu s10a |
| L2 sonde | `knowledge_base/role_sim.mjs` + `roles/SCHEMA.md` | IMPLEMENTED, orphelin | `simulation_module` de vrai jeu + calibration P3 ; sortie advisory |
| L3 pont | s6/s11 + solvability/role_sim | briques séparées | connecteur finding→fixture seedée |
| Reçus/ledger/HumanGate | `mutation_proof.py` (HMAC), `verify_run.py`, chaîne s12 | IMPLEMENTED | réutiliser tel quel |
| Playtest (juge du fun) | R2 (`error_journal domain=playtest`) | PROPOSED | canal de capture |

**Aucune nouvelle plateforme** : L1 = une assertion dans le reçu s10a ; L2 = un `simulation_module` de plus pour un outil qui existe ; L3 = un connecteur. `campaign_runner_v1.py` (lane gelée) n'est PAS réutilisé — BAS reste dans la lane FORGE.

---

## P6 — Rasoir 6 questions par recommandation

Format : (1) comportement futur changé · (2) consommateur · (3) moment · (4) preuve d'usage · (5) résultat observable · (6) devenir de l'échec. Sans les 6 → **HYPOTHÈSE**.

**REC-0 — Remplir Balance/Simulation/Content Bibles (prérequis P0)** — (1) BAS cesse d'être bloqué sur du vide de valeurs · (2) le cycle P9, sous gate Pierre · (3) avant toute sonde · (4) fichiers bibles créés avec valeurs ratifiées · (5) OBJ-n ont des seuils, tables Economy chiffrées · (6) échec = pas de mesure possible, BAS reste théorique. **6/6 — RECOMMANDATION.**

**REC-1 — L1 enveloppe de génération, GATE déterministe** — (1) un contenu hors-budget/combo-interdit **ne peut plus être généré** · (2) reçu oracle s10a · (3) à la génération / post-build · (4) fixture : carte au coût > budget → FAIL, carte conforme → PASS · (5) un broken impossible à créer rougit avant le playtest · (6) échec = FAIL dur (famille solvabilité). **6/6 — RECOMMANDATION** (dépend de REC-0 pour les valeurs). Ne rouvre aucune famille abandonnée (déterministe, pas simulation d'équilibre).

**REC-2 — L2 brancher `role_sim` sur un vrai jeu, calibration-d'abord, ADVISORY** — (1) une dominance/phase décorative devient VISIBLE avant le playtest · (2) Pierre au HumanGate (`humangate_flags`), jamais le driver · (3) post-oracle, pré-playtest · (4) reçu `proof_of_use` signé + témoins sain/truqué passés (P3) · (5) matrice win-rate + skill-par-phase advisory · (6) échec = le build continue (advisory, faux flag = un regard). **6/6 sur la FORME advisory.** **HYPOTHÈSE sur la valeur tant que** (a) aucun bot ne joue auto_battler (moteur de match supprimé), (b) le jeu-témoin de calibration n'existe pas. **RECOMMANDATION conditionnée** aux sondes (identique au statut §4-B).

**REC-3 — L3 pont red-team→seed→moteur** — (1) une conjecture LLM cesse de mourir en prose ; elle est REJOUÉE · (2) le moteur (solvability/role_sim) sur la fixture · (3) après s11 · (4) fixture : un finding « combo X casse » → seed → moteur confirme/infirme · (5) une rupture CONFIRMÉE gate ; non confirmée = advisory · (6) échec = advisory. **6/6 — RECOMMANDATION.** C'est l'incarnation directe du « SEED » de la doctrine (« un moteur doit prouver qu'elle casse »).

**REC-4 — NE PAS gater L2 sur matrice-cible/skill-plat** — (1) préserve la cohérence avec §4-B/META-2 · (6) — . Formellement une **contre-recommandation** au verbatim « gate de livrable bloque si matrice-cible violée OU skill plat » : **arbitrage Pierre requis** (le verbatim veut gater ; la ratification veut advisory). **Signalé, non tranché.**

---

## Verdict par ligne (synthèse)

| Ligne | Manque / duplication | Improve / Evolve | Position workflow | Risque faux positif | 1er test falsifiable |
|---|---|---|---|---|---|
| **L1 génération contrainte** | MANQUE réel (code) ; Chess TCG canon DOCUMENTED_ONLY, générateur NOT_FOUND | **Evolve** (construire depuis canon) | à la génération / reçu s10a — **GATE** | Faible (déterministe : coût ≤ budget) | carte coût>budget → FAIL ; carte conforme → PASS |
| **L2 simulation calibrée** | EXTENSION de `role_sim.mjs` (orphelin des vrais jeux) | **Improve conditionné** (brancher + calibrer) | post-oracle, pré-playtest — **ADVISORY** | ÉLEVÉ (power-spike/comeback légitimes → §4-B) | témoin truqué (unité ×10) DOIT rougir ; témoin sain NE DOIT PAS |
| **L3 adversarial** | MANQUE réel (le PONT seed) ; briques existent | **Improve** (connecteur) | après s11 — GATE si confirmé, sinon advisory | Faible (le moteur tranche, pas le LLM) | finding « combo X casse » → seed → moteur confirme |

**Le critère de déclenchement est-il correctement isolé comme seule constante universelle ?** **OUI, et c'est la meilleure idée du dossier.** « Le jeu déclare-t-il du contenu paramétrique généré ? » est une **question mécanique, déterministe, générique** — elle sépare proprement Chess TCG/AutoBattler/Leviathan (dans le champ) de Belote/échecs (hors champ, conformité aux règles seulement). Elle **désamorce le contre-exemple Belote** de l'Annexe pour les jeux à règles figées. **Réserve** : elle **ne rend pas** les jeux à contenu inventé immunisés aux faux positifs de dominance légitime (power-spike, hard-counter, comeback — R10 §5) ; à l'intérieur du champ, L2 doit rester advisory. Le critère est la bonne **porte d'entrée** ; il n'est pas un permis de gater la simulation.

---

## Rapport final

```
preflight: {source_state: "audit lecture seule ; role_sim.mjs+SCHEMA+logs, 4 bibles AB, canon Chess TCG, static_oracles/driver via inventaire délégué, R10/Annexe/Consolidation/P1_AUTOPSIE relus",
            created: "docs/audit/FORGE_BALANCE_ASSURANCE_SYSTEM_AUDIT.md (unique livrable)",
            registered: "non (PROPOSED — gate Pierre)",
            loaded: "non (aucun câblage)",
            enforced: "non (aucun oracle branché, aucun code écrit)",
            evidenced: "file:line sur chaque garde/outil ; NON TROUVÉ explicite (générateur Chess TCG, Balance/Simulation/Content Bibles, playtests, role_sim sur vrai jeu)"}
route_check:
  files_changed: docs/audit/FORGE_BALANCE_ASSURANCE_SYSTEM_AUDIT.md (le seul livrable)
  commands_run: Glob/Grep/Read (lecture seule) + 1 sous-agent Explore (inventaire read-only)
  skipped_validation: aucun oracle exécuté (audit-puis-spécification ; aucun code à valider)
  risks: (1) verbatim doctrine « gate si matrice-cible/skill plat » CONTREDIT META-2/§4-B → arbitrage Pierre ;
         (2) L2 sans bot de vrai jeu ni jeu-témoin = HYPOTHÈSE ; (3) campaign_runner_v1.py en lane GELÉE, ne pas réveiller
  status_by_surface: solvabilité/mutation/8-gardes=IMPLEMENTED+GATING · role_sim=IMPLEMENTED-orphelin ·
         red-team s6/s11=IMPLEMENTED-ADVISORY · matrice Chess TCG=DOCUMENTED_ONLY(code NOT_FOUND) ·
         Balance/Simulation/Content Bibles=NOT_FOUND · playtests=NOT_FOUND · balance-check skill=DOCUMENTED_ONLY ·
         Factory=IMPLEMENTED(génération, lane STUDIO) · campaign_runner=IMPLEMENTED(lane GELÉE)
software_verdict: OK — audit produit conforme au périmètre et à la structure ; toutes gardes/outils cités vérifiés
         au repo (file:line) ou par inventaire délégué recoupé. Aucun code écrit, aucune intégration.
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```
