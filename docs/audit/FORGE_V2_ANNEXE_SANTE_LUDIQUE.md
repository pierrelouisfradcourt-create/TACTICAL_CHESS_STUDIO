# Forge V2 — Annexe : la boucle de santé ludique (confrontation Fable × Opus)

- **Statut : RATIFIÉE AVEC RECLASSIFICATION (Pierre, 2026-07-20)** — l'annexe est conservée mais PAS comme garde-fou principal contre le non-fun : la santé ludique est une **classe d'oracle EXPÉRIMENTALE** (advisory uniquement · aucune décision automatique · aucun claim « jeu fun » · détection d'anomalies structurelles seulement). Leçon AutoBattler reformulée par Pierre : le problème n'était pas l'absence de mesure du fun, mais **l'absence de preuve minimale de viabilité avant accumulation de production** → R9 (solvabilité minimale obligatoire) est LA priorité.
- Date : 2026-07-20 · Hypothèse d'origine (Pierre) : « ne pas mesurer le fun ; détecter les pathologies qui rendent un jeu probablement non-fun » — 4 familles d'oracles (anti-dégénérescence · anti-impasse · anti-faux-choix · anti-atrophie).
- Méthode : analyse Fable (proposant) attaquée par Opus (contradicteur adversarial, ancré file:line) ; arbitrage final ci-dessous. Discipline : rasoir 6 questions, triple gate Evolve, faits/hypothèses/recos séparés.

## §1 — Position du proposant (Fable), et son erreur

Proposition initiale : 4 volets V0 dans l'oracle de jeu (s10a), advisory d'abord, validés par sondes P1.1 ; classification « nouvelle classe d'oracle, sœur de la solvabilité — pas un compilateur ». **Erreur d'ancrage reconnue et contre-vérifiée** : l'argument « la simulation massive est déjà gratuite » citait `engine/match.mjs` — ce module a été SUPPRIMÉ comme code mort (run-oracle.mjs:36, commande F des builds hors-chaîne) ; le primitif pur ne couvre que la feuille `resolveCombat`, PAS la couche préparation/économie où vit la dégénérescence réelle des auto-battlers. Aucun bot ne joue auto_battler.

## §2 — Verdicts du contradicteur (tous ancrés, tous contre-vérifiés sur les points porteurs)

1. **La prémisse tombe** : les pannes réelles du post-mortem AutoBattler (0 or au démarrage, unités sans nom, pose hors-zone, modèle Battlegrounds choisi unilatéralement, Godot jamais posé) ne sont PAS du « non-fun structurel non détecté ». Elles sont couvertes par des recos DÉJÀ dans la consolidation : R7 (design-intent), R2 (capture playtest), R1 (anti-théâtre). Le capteur proposé résolvait un problème que le repo n'a pas encore documenté.
2. **Le test qui aurait réellement attrapé AutoBattler** : (a) R7 — bloque le choix de modèle unilatéral ; (b) **solvabilité de démarrage** — un bot atteint le combat du round 1 depuis `initState` → aurait rougi sur « 0 or ». Le pattern maison existe (`solvability.template.mjs`, `check_solvability_wired`) mais **n'a jamais été appliqué à auto_battler** (contre-vérifié : aucun solvability.mjs, moteur de match supprimé). Le vrai miss est une non-application de l'existant — conséquence directe des builds hors-chaîne (règle O4).
3. **Familles B (anti-impasse), C (anti-faux-choix), D (anti-atrophie) : ABANDONNÉES.** Leurs faux positifs sont des choix de design légitimes — zugzwang, *obligation de suivre à la Belote* (zéro choix, c'est la règle — la même structure que le bug trickWinner, verdicts opposés, indécidable sans intention), ouvertures scriptées, mécaniques de comeback et counters dont la valeur est la dissuasion (invisibles à une sim d'équilibre). Mode d'échec = **suppression d'un choix de design** → rejet par le filtre D de la consolidation (rasoir Q6).
4. **Famille A (anti-dégénérescence) : survit, UNIQUEMENT en advisory non-gating** — dégénérescence d'ISSUE seulement (une config bat le champ), calculable sur `resolveCombat`. Trous assumés : le bot est le juge (biais d'échantillon), les courbes de puissance légitimes rougissent à tort, la couche prép reste hors de portée sans bot complet.
5. **Risques systémiques** : Goodhart/théâtre d'oracle (2 occurrences bi-projet déjà) → le capteur ne touche JAMAIS `software_verdict` ; sha du bot gelé (méthode P1.1) ; politiques hétérogènes (random + greedy + 1 heuristique), signal compté seulement si des bots divergents concordent, désaccord rapporté tel quel.

## §3 — Arbitrage Fable (j'accepte les verdicts)

Le contradicteur gagne sur la prémisse, sur B/C/D, sur le placement (advisory, jamais gate) et sur mon ancre. Nuance unique conservée : la dégénérescence de la couche décision exige un bot de jeu complet — c'est déjà une EXIGENCE de la doctrine solvabilité. Donc l'ordre est : **R9 d'abord** (solvabilité auto_battler, pattern existant), **capteur A ensuite** (une fois un bot réel disponible et les sondes passées), **B/C/D jamais** — réouvrables seulement sur signal répété documenté + protocole dédié.

## §4 — Proposition d'intégration (le livrable demandé)

| # | Élément | Phase | Oracle minimum viable | Métrique | Gate associée | Statut |
|---|---|---|---|---|---|---|
| R9 | **Solvabilité auto_battler câblée** (le vrai miss) | s10a | `solvability.mjs` : bot déterministe atteint le combat R1 depuis `initState` et complète N rounds | exit 0/1 | `check_solvability_wired` (EXISTANT) | pattern IMPLEMENTED · application **PROPOSED** |
| A | **Capteur dégénérescence d'issue** (advisory) | post-oracle, pré-playtest | matrice win-rate des match-ups `resolveCombat` sur K seeds, politiques hétérogènes, sha gelé | domination d'une config > ~70 % vs le champ ; miroir ≠ ~50 % | AUCUNE — flag `humangate_flags` + table sous `lab/forge_sensors/` ; fail-open | **PROPOSED**, conditionné aux sondes §5 |
| B/C/D | anti-impasse · anti-faux-choix · anti-atrophie | — | — | — | — | **ABANDONNÉES** (faux positifs = choix de design) |
| — | checklist pathologies au red-team plan s6 | s6 | prose advisory | — | — | HYPOTHÈSE (preuve d'usage non démontrable) |

**Rasoir 6 questions — R9** : connaissance = « un jeu doit démarrer et se jouer » (leçon playtest 1) · forme = solvability câblée · lecteur = driver s10a · moment = chaque oracle-code · comportement changé = un jeu qui ne démarre pas rougit AVANT playtest · preuve = garde existante verte · si échec = FAIL dur (comme tout jeu).
**Rasoir — capteur A** : connaissance = domination d'issue · forme = table win-rate signée advisory · lecteur = toi au HumanGate (jamais le driver) · moment = pré-playtest · comportement changé = une config dégénérée est vue avant ta séance · preuve = flag + table + trace · **si échec = le build continue** (un faux flag coûte un regard, jamais un blocage).

## §5 — Preuve requise AVANT branchement du capteur A (méthode P1.1)

Témoin positif : card_engine/Belote (jeu sain, bot réel) ne rougit PAS · témoin négatif : fixture truquée (`units.v0` copié, une unité ×10 stats) DOIT rougir · témoin neutre : contenu intact passe. Sha capteur et seuils figés AVANT le run, comptage mécanique. Truqué non détecté ou sain rougi → on n'intègre pas.

## §6 — Réponses aux questions finales

- **Compilateur d'actif ? Non.** Classe d'oracle (production d'évidence, pas d'actifs) — et en l'état, UN SEUL capteur advisory de cette classe est justifié.
- **Improve / Evolve / abandon ?** « Empêcher le non-fun comme gate avant assets » : **ABANDON** (triple gate 0/3 — problème non prouvé, solutions existantes R7/R2/R1, feel non-oraclable T4). R9 : **Improve immédiat**. Capteur A : **Improve conditionné aux sondes**. Aucun Evolve.
- La gate d'investissement avant assets reste ce qu'elle est déjà : verdict propre + design-intent (R7) + ton playtest (R2).

---
software_verdict : s'appliquera à R9/capteur A une fois câblés et sondés, pas à ce document.
evidence_verdict : MECHANICAL_VALIDATION_ONLY (claims du contradicteur contre-vérifiés : suppression match.mjs, absence solvability auto_battler)
claim_verdict : NO_CLAIM_ALLOWED
