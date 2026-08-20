# Forge V2 — R10 : audit de la classe « oracles de santé ludique structurelle »

- **Statut : PROPOSED — audit falsifiable, gate Pierre.** Date : 2026-07-20 · Auteur : Opus (contradicteur).
- **Question centrale** : la classe d'oracles « santé ludique structurelle avant assets/UI » est-elle un VRAI
  manque du système Forge **post-§4-A** (R1-R9 câblés), ou une **duplication** de gardes existantes et de
  familles déjà ratifiées-abandonnées ?
- **Méthode** : chaque garde vérifiée au repo (file:line), jamais de mémoire. Rasoir 6 questions + statut typé
  par sous-oracle. Toute divergence avec une ratification antérieure est signalée EXPLICITEMENT.
- **Contrainte de vérité respectée** : les familles anti-impasse/anti-faux-choix/anti-atrophie sont ABANDONNÉES
  (Annexe §2-3, CONSOLIDATION §4-D) ; le capteur dégénérescence est une classe EXPÉRIMENTALE advisory
  conditionnée aux sondes P1.1 (Annexe §4-B) ; « empêcher le non-fun comme gate » = ABANDON triple-gate 0/3.

---

## §1 — Résumé exécutif

Post-§4-A, la surface que R10 prétend couvrir est **déjà occupée à ~80 %** : R9 (solvabilité 5 volets, câblée
GATING, falsifiée) couvre B ; le volet 5 de R9 couvre déjà l'activation des mécaniques cœur (D en version
binaire) ; le capteur C survivant est déjà classé §4-B (expérimental, conditionné aux sondes, jamais dans
`software_verdict`) ; E est ratifiée-abandonnée (contre-exemple Belote de Pierre lui-même). **La seule rupture
PROUVÉE et non couverte** est le sous-oracle A dans sa forme mécanique la plus étroite : R7 gate la
*déclaration* `plateforme_cible` au charter (s0), mais **rien ne vérifie que le BUILD est conforme à la
plateforme déclarée** (panne AutoBattler #5 : Godot posé nulle part, tout construit en HTML). **Recommandation
globale : ABANDON de R10 comme CLASSE** (duplication + familles abandonnées). Le seul survivant défendable est
une assertion déterministe minuscule (`plateforme_cible ⇒ artefact de build attendu présent`), greffée sur le
reçu s10 EXISTANT — pas une nouvelle étape, pas une nouvelle couche.

---

## §2 — Ce que Forge sait déjà empêcher (FAITS, garde par garde)

| Garde | file:line | Point d'enforcement | Nature | Ce qu'elle prouve |
|---|---|---|---|---|
| R9 solvabilité (5 volets) | `games/auto_battler/solvability.mjs:287-371` | s10a | **GATING** (`driver.py:519,564`) | boucle jouable · victoire de COMBAT atteignable · ressources R1 · terminaison · mécaniques cœur activées — sur 10 seeds, bot déterministe |
| R9 falsifiabilité | `solvability.falsification.test.mjs` | test | preuve | chaque volet PEUT rougir sur métrique fabriquée + témoin sain vert |
| `check_solvability_wired` | `static_oracles.py:390` | s10a | **GATING** | le harnais existe ET `run-oracle.mjs` l'invoque (`run-oracle.mjs:283-311`) |
| R1 anti-théâtre harnais | `static_oracles.py:481` | s10a | **GATING** (`driver.py:525,564-565`) | aucun flag de succès écrit en dur (`passed:true`) dans run-oracle/solvability/harness |
| e2e réel | `check_e2e_harness` `static_oracles.py:335` | s10a | **GATING** (`driver.py:513,564`) | navigateur réel + entrées réelles + ≥3 lectures d'état |
| mutation | `check_mutation_gate` `static_oracles.py:629` | s10a | **GATING** (`driver.py:564-565`) | 100 % tués OU survivant trié (exception tracée → HumanGate) |
| gel du jeu de règles | `check_feature_set_frozen` `static_oracles.py:584` | s10c | **STOP dur** (`driver.py:592-603`) | l'ensemble des features est identique au snapshot s5 (ni ajout ni retrait) |
| wiremap isomorphe | `check_wiremap` `static_oracles.py:262` | s10c | **GATING** | chaque feature pointe une fonction qui EXISTE (présence de nom) |
| archi (deps interdites) | `check_architecture` `static_oracles.py:197` | s10b | **GATING** | aucun import viole une dépendance interdite du blueprint |
| R7 charter design-intent | `check_charter` `static_oracles.py:707` | **s0** (skill `skill.md:48-55`) | GATING au charter | 7 champs remplis dont `plateforme_cible·reference_jeu·criteres_demo[]`, zéro « à définir » |
| R3 knowledge_trace | `verify_run.py:77-118` | verify_run | échec DUR si présente+falsifiée | lineage de lecture recoupé par tiers mécanique (`node knowledge_trace.mjs --verify`) |
| R6 packets | `s3-decompo.yaml:22-25`, `s4-archi.yaml:21-25` | dispatch s3/s4 | `mandatory_read` | le packet de recherche est routé en lecture obligatoire |
| R8 usage_examples | `knowledge_base/fill_usage_examples.mjs` (+ `check_search_consulted:528`, `check_reuse_ratio_wired:430`) | s10a | **ADVISORY** (`driver.py:530,536`) | usage réel des briques, mesuré, jamais gating |
| s10d visuel | `s10d-oracle-visual.yaml:5-8` | HORS chaîne | **ADVISORY** (non câblé driver) | familles A1/A2/A3/A5 sur défauts synthétiques, Breakout seul, sans généralisation |

**Limite structurelle connue (CONSOLIDATION §1, ligne « Citation-par-ID »)** : `check_wiremap` prouve la
présence d'une FONCTION, jamais que l'ID **résout vers la bible** ni que le corps implémente l'intention. La
conformité *sémantique* build↔design n'est vérifiée nulle part.

---

## §3 — Ce qu'AutoBattler révèle réellement (post-§4-A)

| Panne réelle (P1_AUTOPSIE) | Attrapée AUJOURD'HUI par | Preuve |
|---|---|---|
| « 0 or, combat jamais lancé » | **R9 volet 3** `checkResourcesAvailable` | `solvability.mjs:307-326` — LA panne historique exacte, câblée GATING |
| combat ne se lance pas / boucle cassée | **R9 volet 1** `checkPlayableLoop` (chemin réel round/input) | `solvability.mjs:287` |
| modèle Battlegrounds choisi unilatéralement | **R7** `reference_jeu` (choisi par Pierre) | `check_charter` + `skill.md:48-55` — **mais provenance non mécanisable** (fog HumanGate) |
| wiremap 21/53 fausse (5 builds hors chaîne) | **O4** (jamais de build hors chaîne) + `check_wiremap` en chaîne | orchestration, pas classe d'oracle |
| **plateforme Godot jamais posée, tout en HTML** | **R7 partiellement** : la déclaration est forcée | **TROU** : conformité build↔plateforme NON vérifiée |
| unités sans nom | **aucun oracle** (affichage/contenu) | → playtest (R2), pas oraclable |
| pose hors-zone jamais bloquée (règle ratifiée) | **aucun oracle mécanique** ; bot solvab joue légal | → red-team code s11 / playtest — trou de règle, pas de classe santé |
| Combat Bible = jeu à mana que le code n'a jamais eu | **aucun** (`check_wiremap` = présence de nom, pas résolution bible) | CONSOLIDATION §1 |

**Lecture** : sur 8 pannes, R9+R7+O4 en couvrent 4 mécaniquement. Les 4 restantes sont soit du **design/règle**
(pose hors-zone, victoire de partie), soit de la **conformité sémantique bible↔code** (mana), soit de la
**conformité plateforme** (#5). Aucune de ces 4 n'est un « non-fun structurel » que la classe R10 proposée
attraperait ; 3 sur 4 ne sont pas oraclables du tout (design/sémantique).

---

## §4 — Audit des 5 sous-oracles

### A) Intent Consistency Oracle — le BUILD est-il conforme au design-intent ?

- **FAITS EXISTANTS** : R7 gate la *déclaration* (7 champs, s0) ; `check_wiremap` prouve la présence de fonction ;
  le gel fige le jeu de règles ; R9 volet 1 prouve que la boucle réelle tourne.
- **TROU RESTANT (exemple mécanique concret)** : `plateforme_cible=godot` ⇒ `project.godot` existe — **non
  vérifié**. Un charter « godot » avec un build HTML passe TOUS les gates. Panne AutoBattler #5. La conformité
  *sémantique* (Combat Bible mana vs code sans mana, panne #6) est également invisible — mais elle n'est **pas
  oraclable** (nécessite de résoudre l'intention, pas la présence).
- **HYPOTHÈSES** : qu'un check déterministe « plateforme déclarée ⇒ artefact sentinelle » ait un coût faible et
  zéro faux positif — plausible mais non démontré.
- **Rasoir 6Q (sliver plateforme)** : connaissance = « l'artefact doit correspondre à la plateforme cible » ·
  forme = assertion token→fichier sentinelle · lecteur = reçu s10 (ou post-s0) · moment = post-build · comportement
  changé = un build sur la mauvaise plateforme rougit avant playtest 2 · preuve = fixture (charter godot +
  aucun project.godot → FAIL) · si échec = advisory HumanGate. **Répond intégralement pour le sliver plateforme
  UNIQUEMENT.** La forme « conformité sémantique » n'y répond pas (pas de lecteur mécanique) ⇒ HYPOTHÈSE.
- **STATUT** : déclaration = **IMPLEMENTED** (R7) · présence de fonction = **IMPLEMENTED** (wiremap) · conformité
  plateforme = **NOT_FOUND** (mais sliver oraclable) · conformité sémantique bible↔code = **NOT_FOUND & non
  oraclable**.

### B) Solvability

- **FAITS EXISTANTS** : R9 couvre exactement les 4 sous-checks proposés (victoire atteignable · boucle complète ·
  ressources · parties terminables) + volet 5. **IMPLEMENTED + TESTED + GATING**.
- **TROU RESTANT** : « victoire de PARTIE » indéfinie (`round.mjs:298-310` `isMatchOver` TODO [FOG] : « joué
  jusqu'à la défaite, score = rounds tenus »). **C'est un trou de DESIGN (owner Core Rules), PAS un trou
  d'oracle** — un oracle ne peut pas inventer une condition de victoire. Le volet 2 est honnête (victoire de
  COMBAT seulement, `solvability.mjs:296-303`).
- **Rasoir 6Q** : déjà satisfait par R9 (Annexe §4). Aucune extension d'oracle nécessaire.
- **STATUT** : **IMPLEMENTED + TESTED**. Extension = inutile. La victoire-de-partie se gate au **charter**
  (`criteres_demo`/Core Rules, décision Pierre), pas par une nouvelle classe.

### C) Anti-dominance (multi-bots, matrice winrate, concentration, diversité)

- **FAITS EXISTANTS** : aucun multi-bot. Le bot de solvabilité est UNE heuristique déterministe unique
  (`solvability.mjs:96-113`, préfère la tribu possédée puis le moins cher), **paramètre** de l'oracle. Le capteur
  survivant est déjà classé **§4-B** : dégénérescence d'ISSUE sur `resolveCombat`, flag > ~70 %, advisory,
  fail-open, jamais dans `software_verdict`, **conditionné aux sondes P1.1**.
- **TROU / DIVERGENCE** : la proposition R10 (bots aggro/éco/contrôle/hasard/heuristique + matrice + concentration
  + diversité, en gating potentiel) est **PLUS LARGE que ce que §4-B a délibérément coupé**. §4-B a réduit à UN
  capteur advisory précisément parce que la couche prép/éco exige un bot de jeu complet qui n'existe pas.
  **Ré-élargir = contredire une ratification** — je ne le recommande pas (aucune preuve nouvelle).
- **Goodhart / faux positifs** : le bot est juge (biais d'échantillon) ; les courbes de puissance légitimes
  rougissent à tort (Annexe §2.4, assumé).
- **STATUT** : version large = **DOCUMENTED_ONLY** (déjà tranchée §4-D) · sliver survivant = **BLOCKED sur les
  sondes P1.1** (PROPOSED expérimental, §4-B).

### D) Anti-contenu mort (usage, présence en parties gagnantes, diversité des chemins)

- **FAITS EXISTANTS** : le **volet 5** de R9 compte DÉJÀ l'activation des mécaniques cœur cumulée sur toutes les
  seeds (`checkCoreMechanicsActivate`, `solvability.mjs:361-371` : UnitBought/UnitPlaced/Attack/Damage/Death).
  `reuse_ratio` + `usage_examples` (`fill_usage_examples.mjs`) tracent l'usage réel des briques.
- **TROU RESTANT (exemple)** : le volet 5 est BINAIRE (chaque mécanique ≥ 1 fois), pas par-CONTENU (quelle
  unité/tribu n'apparaît jamais dans une compo gagnante). C'est de la **télémétrie**, pas un pass/fail.
- **Est-ce un oracle ou de la télémétrie ?** Télémétrie. Comme le note la mission, c'est une **extension de sortie
  advisory quasi gratuite** greffée sur les `eventCounts` déjà mesurés du volet 5.
- **Rasoir 6Q** : connaissance = usage réel du contenu · forme = table de comptage advisory · lecteur = Pierre au
  HumanGate · moment = post-oracle · comportement changé = un contenu à 0 usage est VU avant les assets · preuve =
  table + trace · si échec = le build continue (advisory). **Répond — mais en sortie télémétrique, pas en oracle.**
- **STATUT** : activation binaire = **IMPLEMENTED** (volet 5) · usage par contenu = **PASSIVE** (télémétrie
  advisory possible à coût quasi nul, jamais gating).

### E) Anti-faux choix

- **FAITS** : **ABANDONNÉE par ratification** (Annexe §2-3, CONSOLIDATION §4-D). Contre-exemple critique, **de
  Pierre lui-même** : Belote « obligation de suivre » = zéro choix, **c'est la règle** — même structure exacte
  que le bug `trickWinner` (card_engine, P1_AUTOPSIE 16:03:06), **verdicts opposés, indécidable sans intention**.
  Un détecteur de faux choix supprimerait un choix de design légitime (zugzwang, ouvertures scriptées).
- **STATUT** : **BLOCKED** (abandon ratifié). Documenté formellement ici. Aucune preuve nouvelle ne rouvre.

---

## §5 — Red-team obligatoire

- **2 cas où l'oracle déclarerait à tort un mauvais résultat** :
  1. Capteur C flaggerait un « round de boss » / pic de difficulté SCRIPTÉ (une config qui bat le champ > 70 %
     par intention — power-fantasy, tutoriel) comme dégénérescence.
  2. Capteur D flaggerait un hard-counter SITUATIONNEL (unité peu jouée, essentielle contre un seul archétype)
     comme contenu mort.
- **2 jeux connus où ces métriques trompent** :
  1. **Échecs** : la théorie d'ouverture concentre les premiers coups « de livre » → C voit de la concentration ;
     c'est du jeu optimal. Le zugzwang = coup forcé mauvais → faux positif anti-impasse (déjà cité, abandonné).
  2. **Belote / poker** : obligation de suivre = zéro choix par règle ; all-in préflop correct → « faux choix »
     se déclenche sur du design sain.
- **1 mécanique à faible utilisation pourtant essentielle** : une mécanique de **comeback/counter** (rarement
  déclenchée, mais sa valeur est la **dissuasion** — invisible à un compteur d'usage), ou une unité tier-5 qui
  définit la condition de victoire mais apparaît dans < 5 % des parties.
- **1 dominance temporaire qui est BONNE** : la domination aggro en early-game **intentionnellement contrée** en
  late (méta pierre-feuille-ciseaux saine) ; ou un build « power spike » de fenêtre de lancement qui tourne — la
  dominance temporaire est le MOTEUR d'une méta vivante, pas une pathologie.

---

## §6 — Décision Improve / Evolve / Hold + placement workflow

| Sous-oracle | Décision | Placement | Justification (rappel anti-couches) |
|---|---|---|---|
| A — conformité plateforme (sliver) | **Improve minimal** (borderline) | **Option B** : assertion sur le reçu s10 EXISTANT, advisory→HumanGate | ferme la panne #5 mécaniquement ; **jamais** une étape s7 (Option A = couche) |
| A — conformité sémantique bible↔code | **Hold** | Option C (playtest/HumanGate) | non oraclable (résoudre l'intention) |
| B — solvabilité | **Fait (Improve livré = R9)** | déjà s10a | rien à ajouter ; victoire-de-partie = gate charter (Pierre) |
| C — anti-dominance large | **Hold / Abandon** | — | contredit §4-B qui a déjà coupé au sliver ; version large = re-couche |
| C — dégénérescence d'issue (sliver) | **Improve conditionné** | Option B advisory (déjà §4-B) | attend les sondes P1.1 ; jamais dans `software_verdict` |
| D — usage par contenu | **Improve advisory (quasi gratuit)** | Option B, sortie sur volet 5 | greffe sur `eventCounts` existants ; jamais gating |
| E — anti-faux choix | **Abandon** | — | ratifié (contre-exemple Belote de Pierre) |

**Option A rejetée en bloc** (nouvelle étape s7 moteur→santé→assets) : ajoute une couche pour un contenu déjà
couvert (R9) / abandonné (B,C-large,E) / télémétrique (D). **Option C** (playtest humain seul) reste le juge du
feel et de la conformité sémantique — non oraclable, conforme à la doctrine T4.

---

## §7 — Proposition minimale (si validée)

**Une seule extension ferme une rupture PROUVÉE et oraclable** : la conformité de plateforme.

- **Quoi** : une assertion déterministe `plateforme_cible ⇒ artefact sentinelle présent` (ex. `godot ⇒
  project.godot`, `web/HTML ⇒ index.html`).
- **Où** : greffée sur le reçu du code oracle s10a EXISTANT (`driver._run_code_oracle`, à côté de
  `detail["solvability"]`), **advisory→HumanGate** (pas gating : une plateforme mixte peut être légitime). **PAS**
  une nouvelle étape, **PAS** une nouvelle classe d'oracle.
- **Qui** : capteur déterministe non-LLM (même famille que `check_solvability_wired`).
- **Preuve** : fixture — charter `plateforme_cible: godot` + aucun `project.godot` ⇒ le sliver rougit ; charter
  `web` + `index.html` présent ⇒ vert.
- **Honnêteté** : valeur FAIBLE. R7 force déjà Pierre à CHOISIR la plateforme ; le mismatch n'a été observé
  qu'une fois et pourrait aussi bien être une **ligne de checklist HumanGate**. À faire seulement si Pierre juge
  le coût (≈ 15 lignes + fixture) inférieur au risque de re-répétition. **Sinon : aucune.**

Tout le reste de R10 comme CLASSE = **ABANDON** (duplication de R9 / du §4-B / des familles abandonnées).

---

## §8 — Risques et limites

- **Auto-attestation** : cet audit relit des gardes et des ratifications produites dans la même mission Forge V2 ;
  mitigé par les file:line vérifiés et par le fait que le contradicteur (Opus) attaque la proposition, pas la
  défend.
- **Sondes P1.1 non rejouées ici** : le statut BLOCKED du capteur C repose sur la condition §4-B, pas sur un run
  de sonde exécuté dans cet audit.
- **Le sliver plateforme peut dériver** en catalogue de règles par-moteur (godot/unity/web/…) — le borner à UNE
  sentinelle par plateforme déclarée, advisory, sinon il devient la couche qu'on refuse.
- **« victoire de partie » reste un fog de DESIGN** (`round.mjs:298`) : aucun oracle ne le ferme ; seul Pierre au
  charter/Core Rules le pose.

---

**Classement R10 global (dans le vocabulaire imposé)** : la CLASSE « oracles de santé ludique structurelle » =
**DOCUMENTED_ONLY** (ses membres vivants sont soit **IMPLEMENTED** = R9, soit **BLOCKED/PROPOSED-expérimental** =
§4-B, soit **abandonnés** = B/C-large/E). Recommandation : **ABANDON de la classe** ; conserver un unique sliver
plateforme (sous-oracle A) et l'extension télémétrique advisory du volet 5 (sous-oracle D), tous deux Option B,
jamais dans `software_verdict`.

Statut par sous-oracle : **A** = IMPLEMENTED (déclaration) + NOT_FOUND (conformité, sliver oraclable) · **B** =
IMPLEMENTED + TESTED · **C** = DOCUMENTED_ONLY (large) / BLOCKED-sondes (sliver §4-B) · **D** = IMPLEMENTED
(binaire) + PASSIVE (par contenu) · **E** = BLOCKED (abandon ratifié).

Règle finale appliquée : une classe R10 qui n'ajoute pas de comportement futur observable au-delà de R9/§4-B est
rejetée par construction. Seuls survivent les deux slivers qui changent un comportement observable (un build
hors-plateforme rougit ; un contenu à 0 usage devient visible avant les assets).

---
software_verdict : OK — audit produit conforme au périmètre et à la structure ; toutes les gardes citées
vérifiées au repo (file:line). Aucun code écrit, aucune intégration.
evidence_verdict : MECHANICAL_VALIDATION_ONLY — recoupement en lecture seule (Read/Grep) sur static_oracles.py,
driver.py, verify_run.py, solvability.mjs, round.mjs, contrats s0/s3/s4/s10d, charter i1, P1_AUTOPSIE, Annexe,
CONSOLIDATION. Aucun oracle signé sur ce document.
claim_verdict : NO_CLAIM_ALLOWED
