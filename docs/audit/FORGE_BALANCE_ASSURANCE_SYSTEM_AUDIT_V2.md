# Forge — Balance Assurance System (BAS) — AUDIT V2 (corrige V1)

- **Statut : PROPOSED — gate Pierre.** Date : 2026-07-20 · Auteur : Opus. La **V1** (`FORGE_BALANCE_ASSURANCE_SYSTEM_AUDIT.md`) reste au dossier ; cette V2 la **corrige sur trois points** signalés par le game master et cadre l'implémentation. Ancres repo réutilisées de V1, re-vérifiées où nécessaire.
- **Méthode** : file:line, NON TROUVÉ explicite, faits/hypothèses/recos séparés, rasoir 6 questions par reco, confrontation aux ratifications (R10/§4-B, Annexe, Consolidation). Audit-puis-spécification : AUCUN code, AUCUNE intégration.

## Doctrine imposée (verbatim, gravée)
> La Forge automatise l'équilibrage **mathématique**, jamais le fun. **« Un LLM peut casser une idée. Un moteur doit prouver qu'elle casse. L'humain décide si elle est amusante. »** Pont = le **SEED**. Déclenchement (seule constante universelle) : contenu/paramètres **INVENTÉS** seulement (Chess TCG/AutoBattler/Leviathan ; Belote/échecs HORS champ). Patron unique : la Forge impose le SCHÉMA, la Design Bible remplit les VALEURS, la gate refuse le vide. 3 lignes : L1 génération contrainte · L2 simulation calibrée · L3 adversarial. Calibration obligatoire AVANT toute mesure de vrai jeu.

## Les trois corrections apportées à V1 (actées)
1. **CORRECTION 1 — L1 n'est PAS la matrice Chess TCG.** V1 traitait la matrice `04_RNG_FORMULA_CANON.md` comme candidate à promouvoir. **Erreur.** Cette matrice est du **CONTENU d'avril (GPT) propre à Chess TCG** : ne pas la ressusciter, ne pas la promouvoir, ne pas s'en inspirer comme base générique. Le livrable L1 = **le PROCESS générique qui FABRIQUE une enveloppe par jeu**, à partir de la Design Bible du jeu courant, déclenché ssi le jeu produit du contenu paramétrique. Un jeu sans contenu inventé n'a pas de matrice — et c'est correct.
2. **CORRECTION 2 — L'agent-joueur est un RISQUE MAJEUR NON RÉSOLU.** V1 sous-estimait ceci. Le studio n'a **jamais** su fabriquer un agent qui **joue à niveau** un jeu. L2 ne peut être ni promise ni gatée tant que ce n'est pas prouvé. C'est le **premier test falsifiable de L2**, un chantier de recherche à **risque d'échec réel** — traité en P1 prioritaire.
3. **CORRECTION 3 — Deux natures de verdict, jamais fusionnées ; platitude = radar post-démo.** « bloque si skill plat » (V1/verbatim) était une **erreur de fusion**. Cassage prouvé-moteur = gate ; platitude/dominance soupçonnée = advisory, jamais `software_verdict`. De plus le radar de platitude **ne juge pas la première sortie** — il s'allume sur les **itérations du game master APRÈS la démo**.

---

## P0 — Remplir les Bibles (BLOQUANT — statut inchangé depuis V1, re-confirmé)
AutoBattler `games/auto_battler/bibles/` : schémas **excellents**, conformes au patron unique. **(a) phases** DÉCLARÉES (`03_DECISION_BIBLE.md` Flux L288-308 : Income→Shop→Preparation→Pairing→Combat→Resolution ; 8 DP + 5 sous-décisions). **(b) matrice-cible** DÉCLARÉE en forme, **valeurs vides** (`06_META_BIBLE.md` OBJ-1..10 + OBJ-E1..E3, quadruplets META-1 L41-46 ; seuils TBD QM-1..12). **(c) enveloppe** schéma déclaré, **valeurs vides** (`05_ECONOMY_BIBLE.md` L206-222, propriété Balance Bible P10).

**NON TROUVÉ (constat P0 majeur, re-vérifié Glob `bibles/*`)** : **Balance Bible, Simulation Bible, Content Bible n'existent pas** (seuls 01-07 numérotés). Elles sont les propriétaires désignés des VALEURS (Balance), des PROTOCOLES de mesure (Simulation) et du CONTENU chiffré (Content). **Sans elles, ni L1 (aucune borne) ni L2 (aucune cible, aucun protocole) ne sont spécifiables.** Chess TCG : ni Decision Bible ni Meta Bible structurées (NON TROUVÉ) ; enveloppe = canon papier DOCUMENTED_ONLY.

**Statut P0** : la première tâche N'EST PAS de construire des agents — c'est de **créer Balance + Simulation + Content Bibles et remplir les valeurs TBD via le cycle P9, sous gate Pierre**. La gate « refuse le vide » est satisfaite au niveau SCHÉMA, **violée au niveau VALEURS**. Bloquant pour L1 et L2.

---

## P1 — Audit des AGENTS-JOUEURS (PRIORITAIRE — la brique la moins maîtrisée du studio)

**Distinction imposée, actée dans le vocabulaire** :
- **agent-qui-COMPLÈTE** — finit une partie en jouant légalement (bots de solvabilité). **PROUVÉ.**
- **agent-qui-JOUE-À-NIVEAU** — joue assez fort pour que `winrate` mesure du SKILL, pas du bruit. **Requis pour L2 (dominance/platitude). JAMAIS démontré au studio.**

| Candidat agent | Où (file:line) | Nature | Classement | Fait |
|---|---|---|---|---|
| Bot de solvabilité auto_battler | `games/auto_battler/solvability.mjs:70-107` (`cheapestShopCost`, `ownedTribeCounts`, synergie tribu) | greedy déterministe, un seul levier qualitatif | **IMPLEMENTED (complète) — PAS à-niveau** | Achète tribu possédée puis le moins cher ; conçu pour FINIR des parties, jamais pour jouer fort. L'oracle le dit : « seul levier qualitatif face au Ghost » (L34). |
| `role_sim.mjs` + rôles | `knowledge_base/role_sim.mjs` ; rôles `guardian-static`, `pursuer-mobile` | mesure bande de difficulté seedée | **IMPLEMENTED (mécanisme) — rôles-JOUETS uniquement** | Le mécanisme est bon (bande vs bande déclarée, reçu signé). Mais les `simulation_module` sont des micro-scénarios géométriques (poursuite, zone), **PAS un jeu réel**. Calibration gardien `[1,999]` (`proofs/role_sim_guardian_static_calibration.log:11`) = bande qui **ne peut pas rougir** → une « métrique à rejeter ». Ne « sait pas jouer » un vrai jeu. |
| Bots card_engine (Belote/Tarot) | `games/card_engine/solvability.mjs:21,40` | solver + playGame | **IMPLEMENTED (complète)** | Complètent des donnes ; règles OFFICIELLES figées → **hors champ BAS** de toute façon. |
| **Rocky (moteur+IA échecs)** — la tentative la plus aboutie | mémoire `imp234_depth_not_root_cause`, `league` skill (seuil **hybride−heuristique ≥ +20**) ; `lichess_oracle_stale` | recherche alpha-beta + tête neurale φ(T) | **BLOCKED / échec gelé** | La meilleure tentative moteur+IA du studio **échoue** : hybride−heuristique ≈ **+10**, **verdict FAIL**, seuil **+20 jamais atteint** ; « neural pas encore utile » (league). Post-mortem en attente. **NON TROUVÉ au repo** : la valeur exacte « +10 » en fichier bench (citée par le game master / post-mortem pending) — à re-confirmer via `bench/`/`league` avant tout claim chiffré. |

**Verdict agents-joueurs (honnête)** : le studio sait construire des agents **qui complètent** (prouvé, suffisant pour la solvabilité R9). Il **ne sait PAS** construire un agent **qui joue à niveau** — la seule tentative sérieuse (Rocky) est un **échec gelé**. Or L2 (skill par phase, matrice de dominance) **repose entièrement** sur l'agent-à-niveau. **Conséquence dure** : **L2 est bloquée en amont par un problème de recherche non résolu, à risque d'échec réel.** Ce n'est pas un détail d'implémentation — c'est le point qui peut faire **capoter L2**. `role_sim` ne sauve rien ici : il fournit le *cadre de mesure*, pas l'*agent qui joue*.

---

## P2 — Process d'enveloppe PAR JEU (L1, corrigé)
Le livrable L1 est un **process générique**, jamais une matrice réutilisée. Spécification (statut = à construire) :
```
1. DÉTECTION contenu paramétrique   : le jeu déclare-t-il du contenu généré (unités/cartes à stats/coûts) ?
   → lecture de la Design Bible du jeu (schéma). NON → pas d'enveloppe, L1 inactif (correct).
2. GÉNÉRATION de l'enveloppe          : depuis la Design Bible DE CE JEU, dériver
   coût→puissance + combinaisons interdites (ex. AutoBattler : tables Economy/Balance ;
   autre jeu : ses propres axes). Jamais de valeurs importées d'un autre jeu.
3. GATE déterministe                  : contenu généré dont coût > budget / combo interdit
   → FAIL dur, au build. Famille `check_solvability_wired` (déterministe), reçu s10a.
```
La matrice Chess TCG d'avril n'est **ni source ni modèle** : c'est un cas particulier de sortie de l'étape 2 pour CE jeu-là, figé et non exécuté (`08_GENERATOR_UNIFIED_CANDIDATE.md:48` `NOT_FOUND` code). Le process ci-dessus la **remplacerait** s'il fallait un jour équilibrer Chess TCG — il ne la promeut pas.

**Faux positifs L1** : quasi nuls (assertion arithmétique). **Dépend de P0** (les budgets/valeurs doivent exister dans la Design Bible).

---

## P3 — Calibration (dépendante de P1 — chaîne de dépendances explicite)
Méthode réutilisée telle quelle : `knowledge_base/roles/SCHEMA.md` (bande déclarée AVANT validation, `proof_of_use` signé, 3-états) + `WORKFLOW_LAB_PROTOCOL.md` (anti-retuning post-lecture) + méthode P1_1 (sondes, sha gelé, seuils figés avant, témoins sain/truqué/neutre).

Protocole (spécification) : jeu-témoin à **profondeur connue** (sha gelé) ; **rejet d'agent** si l'agent « plafond » ne bat pas la baseline aléatoire d'un écart pré-déclaré ; **rejet de métrique** si elle ne rougit PAS sur pathologie plantée (unité ×10, OTK forcé, boucle ressource cassée) OU rougit sur le témoin sain. Sonde par phase : baseline + plafond + 1/phase ; `skill(phase_i)=winrate(sonde_i vs baseline)−50%`.

**Chaîne de dépendances (dure)** : `P0 valeurs remplies → P1 agent-à-niveau PROUVÉ → P3 calibration → L2 mesure`. **Si P1 échoue (on ne sait pas fabriquer l'agent), P3 est BLOQUÉE** : on ne peut pas calibrer une sonde qui ne joue pas, et une sonde non calibrée ne peut mesurer aucun vrai jeu. **La calibration n'est pas un préalable méthodologique optionnel — c'est le maillon qui tombe en premier si l'agent n'existe pas.**

---

## P4 — Rétrospective AutoBattler (prouvable uniquement — `FORGE_V2_P1_AUTOPSIE.md`)
Déjà couvert **avant BAS** : « 0 or / combat jamais lancé » = R9 volet 3 `checkResourcesAvailable` (`solvability.mjs:307`) ; boucle cassée = R9 volet 1 `checkPlayableLoop:287` ; modèle Battlegrounds unilatéral = R7 (intent) ; Godot jamais posé = R7/trou plateforme ; unités sans nom / hors-zone = playtest (R2). **Aucune de ces pannes n'est de l'équilibrage.**

**Ce que BAS aurait attrapé EN PLUS = RIEN de prouvable.** Le jeu ne démarrait pas ou l'intent était faux — le domaine de BAS (dominance/skill) n'a **jamais été atteint**. L'apport « matrice de dominance aurait vu une unité forte » est une **HYPOTHÈSE** : l'autopsie ne contient **aucune** instance d'unité dominante mesurée. **BAS ne se justifie pas par la rétrospective** — il couvre un stade (équilibrage d'un jeu à contenu inventé) que le studio **n'a jamais atteint**, aggravé par le fait (P1) qu'il ne sait pas encore fabriquer l'agent qui le mesurerait.

---

## P5 — Architecture minimale (réutilise l'existant, aucune plateforme neuve)
```
Design Bible (Meta+Economy+Balance+Simulation+Content — P0 : créer+remplir d'abord)
  ▼ détection contenu paramétrique (P2)
L1 enveloppe PAR JEU   [À CONSTRUIRE — process, pas matrice]   coût≤budget/combos → GATE dur (build)
  ▼ s9 build (chaîne, O4)
s10a oracles EXISTANTS [IMPLEMENTED+GATING] solvabilité(5)+mutation+8 gardes static
  ▼
L3 adversarial         [PONT À CONSTRUIRE] finding red-team (s6/s11) → SEED → moteur rejoue → si CASSAGE PROUVÉ = GATE ; sinon advisory
  ▼ s12 verdict signé HMAC → HumanGate Pierre → DÉMO game master
  ▼
[APRÈS la démo] L2 radar de platitude/dominance  [BLOQUÉ sur P1 agent-à-niveau]
    calibré (P3) · skill(phase_i)/matrice win-rate · ADVISORY → humangate_flags
    S'ALLUME sur les ITÉRATIONS du game master (ajustements post-démo), PAS sur la 1re sortie
```
**Deux natures de verdict séparées (CORRECTION 3)** : (i) **cassage prouvé-moteur** (enveloppe dépassée L1, combo prouvé imbattable via seed L3) = déterministe, gate au build, bloque seul, faux positifs quasi nuls ; (ii) **platitude/dominance soupçonnée** (L2, statistique, brique agents non maîtrisée, faux positifs élevés) = advisory, jamais `software_verdict`, ne bloque jamais seul.

**Déclenchement post-démo de L2 (CORRECTION 3)** : le radar de platitude est un **garde-fou sur les itérations du game master**. Le game master ajuste une valeur après la démo → une Campaign advisory se relance → si un ajustement a **aplati** le skill d'une phase ou fait émerger une dominance, le radar le **sonne pour qu'il tranche**. Il n'est **pas** juge de la première sortie (où le jeu vient de naître et où l'agent-à-niveau n'existe peut-être pas encore).

**Réutilisé tel quel** : `mutation_proof.py` (HMAC), `verify_run.py`, chaîne s12, red-team s6/s11 (advisory), `role_sim.mjs` (cadre de mesure). **NON réutilisé** : `campaign_runner_v1.py` — **lane STUDIO GELÉE** (`scripts/studioV2/`, CLAUDE.md ratifié 2026-07-19) : ne pas réveiller sans HumanGate. Council→Factory : `studio/factory/` = pipeline de GÉNÉRATION de jeu avec `oracle_sim.py` déterministe (IMPLEMENTED, lane STUDIO) ; « Council » = skill LLM, **pas** un quatuor schéma/validateur/routeur/oracle (NON TROUVÉ sous ce nom). BAS reste dans la lane FORGE.

---

## P6 — Rasoir 6 questions
**REC-0 Créer+remplir Balance/Simulation/Content Bibles** — (1) débloque L1/L2 · (2) cycle P9, gate Pierre · (3) avant toute sonde · (4) fichiers créés + valeurs ratifiées · (5) OBJ-n chiffrés, tables Economy remplies · (6) échec = BAS reste théorique. **6/6 RECOMMANDATION.**
**REC-1 L1 process d'enveloppe par jeu, GATE** — (1) contenu hors-budget ingénérable · (2) reçu s10a · (3) au build · (4) fixture coût>budget→FAIL · (5) broken rougit avant démo · (6) FAIL dur. **6/6 RECOMMANDATION** (dépend REC-0). Ne rouvre aucune famille abandonnée (déterministe).
**REC-2 Agent-à-niveau = chantier de recherche préalable à L2** — (1) prouver qu'on sait fabriquer un agent qui joue fort AVANT de mesurer · (2) Pierre (gate recherche) · (3) avant P3/L2 · (4) agent bat baseline d'un écart pré-déclaré sur jeu-témoin · (5) reçu de calibration signé · (6) **échec possible et acté = L2 abandonnée ou reportée** (verdict Rocky = précédent). **6/6 mais RISQUE d'ÉCHEC — pas une promesse.**
**REC-3 L3 pont red-team→seed→moteur** — (1) une conjecture LLM est REJOUÉE, pas laissée en prose · (2) moteur (solvability/role_sim) · (3) après s11 · (4) fixture « combo X casse »→seed→confirme · (5) rupture confirmée = gate, sinon advisory · (6) advisory. **6/6 RECOMMANDATION** (incarne le SEED).
**REC-4 L2 = advisory strict, radar post-démo** — (1) préserve §4-B/META-2 ; sonne le game master sur SES itérations · (6) faux flag = un regard. **Contre-recommandation au « bloque si skill plat » : acté comme erreur de fusion.** **6/6 RECOMMANDATION.**

---

## Verdict par ligne
| Ligne | Manque/dup. | Improve/Evolve | Position workflow | Faux positifs | 1er test falsifiable | **Risque agents-joueurs** |
|---|---|---|---|---|---|---|
| **L1 enveloppe (process/jeu)** | MANQUE réel (process inexistant ; matrice Chess TCG = contenu, pas base) | **Evolve** | build — **GATE dur** | quasi nuls (arithmétique) | carte coût>budget→FAIL, conforme→PASS | **AUCUN** (pas d'agent requis) |
| **L2 simulation calibrée** | EXTENSION de `role_sim` (cadre) + **manque l'agent-à-niveau** | **Improve conditionné** (recherche) | **post-démo**, itérations game master — **ADVISORY** | ÉLEVÉS (§4-B) | **agent-à-niveau bat baseline sur jeu-témoin** (avant toute mesure d'équilibre) | **CRITIQUE — non résolu, échec Rocky, peut capoter L2** |
| **L3 adversarial** | MANQUE réel (le PONT seed) | **Improve** | après s11 — GATE si cassage prouvé, sinon advisory | faibles (moteur tranche) | finding→seed→moteur confirme | **Faible** (bots-qui-complètent suffisent à rejouer un seed) |

**Confrontation ratifications** : L2 advisory strict = **conforme** §4-B/R10/META-2 ; le déclenchement « contenu inventé » exclut Belote (désamorce le contre-exemple de l'Annexe) mais **ne rend pas** les jeux du champ immunisés aux faux positifs de dominance légitime (R10 §5 : power-spike, hard-counter, comeback) → advisory maintenu. Aucune famille abandonnée n'est rouverte.

---

## Rapport final
```
preflight: {source_state: "V1 réutilisée + re-vérif : solvability.mjs:70-107 (bot greedy=complète), role_sim rôles-jouets, bibles AB, Rocky via mémoire/league (échec gelé), campaign_runner lane gelée",
            created: "docs/audit/FORGE_BALANCE_ASSURANCE_SYSTEM_AUDIT_V2.md (unique livrable ; V1 conservée)",
            registered: "non (PROPOSED — gate Pierre)",
            loaded: "non",
            enforced: "non (aucun code, aucune intégration)",
            evidenced: "file:line ; NON TROUVÉ explicite (Balance/Simulation/Content Bibles ; agent-à-niveau ; valeur +10 Rocky en fichier bench=post-mortem pending ; générateur Chess TCG)"}
route_check:
  files_changed: docs/audit/FORGE_BALANCE_ASSURANCE_SYSTEM_AUDIT_V2.md (le seul livrable)
  commands_run: Grep/Read lecture seule (re-vérif ciblée V2)
  skipped_validation: aucun oracle exécuté (audit-puis-spécification)
  risks: (1) L2 BLOQUÉE sur agent-à-niveau NON RÉSOLU (précédent Rocky FAIL) — risque d'échec réel ;
         (2) P3 calibration bloquée si P1 échoue ; (3) P0 valeurs vides bloque L1 ET L2 ;
         (4) verbatim « bloque si skill plat » = erreur de fusion, corrigée en advisory ;
         (5) campaign_runner_v1.py en lane GELÉE, ne pas réveiller ;
         (6) valeur chiffrée Rocky (+10) non re-confirmée en fichier — à vérifier avant claim
  status_by_surface: L1 process=NOT_FOUND(à construire) · enveloppe valeurs=NOT_FOUND(P0) ·
         agent-qui-complète=IMPLEMENTED · agent-à-niveau=NOT_FOUND/BLOCKED(échec Rocky) ·
         role_sim=IMPLEMENTED(cadre, rôles-jouets) · solvabilité/mutation/8-gardes=IMPLEMENTED+GATING ·
         red-team s6/s11=IMPLEMENTED+ADVISORY · L3 pont=NOT_FOUND(à construire) ·
         Balance/Simulation/Content Bibles=NOT_FOUND · playtests=NOT_FOUND · campaign_runner=IMPLEMENTED(GELÉ)
software_verdict: OK — audit V2 conforme au périmètre et aux trois corrections ; ancres vérifiées file:line
         ou re-confirmées. Aucun code écrit, aucune intégration.
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```
