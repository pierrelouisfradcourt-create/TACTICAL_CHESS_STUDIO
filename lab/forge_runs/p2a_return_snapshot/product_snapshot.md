I've now read the oracle (`check_prisme_manifest.mjs`), its shared validator (`upstream_schema.mjs`), the contract SCHEMA, and the run's `worldscan.json` and `run.log`. Key findings before I produce the artefact:

- **No charter exists for this run.** `run.log` shows the driver started at `s2-worldscan`, then `s1-prisme` — **étape 0 never ran**. My `mandatory_read` (charter.yaml) is therefore unsatisfiable; I substitute the genre concept fully available from the World Scan (Tower Defense) + the project id `p2a_return_snapshot`. Flagged in SKIPPED_VALIDATION.
- **The prior failure was JSON materialization**, not content: `run.log:7` — *"aucun bloc  valide (1 bloc fenced inspecté)"*. So the single hard requirement is one clean, strictly-valid, terminal  block.
- I traced my manifest by hand against `upstream_schema.mjs`: chain `observation≠claim≠énoncé` (normalized), `EXPECTED⇒reference` anchored in a World Scan token (game name/URL substring), `ADDITIONS⇒reference:null`, `source_role` filled, `expected_proof{kind,statement}`, valid `destination`, unique ids, ≥1 actionnable. I **cannot execute** the oracle (`run: aucun`) — the executor's `check_prisme_manifest` run is the real gate.

---

# product_snapshot.md — `p2a_return_snapshot` (le produit fini)

> Genre établi par le World Scan : **Tower Defense**. Description du produit tel que le joueur le vit, pas du chemin pour le construire.

## 1. Ce que le joueur VOIT
- Une **arène 2D** avec un **chemin tracé** du point d'entrée jusqu'à la zone à défendre (le « core » / la maison).
- Des **ennemis** qui apparaissent au point d'entrée et **avancent le long du chemin**, un type visuellement distinct par comportement (rapide / blindé / essaim).
- Des **emplacements de tours** (cases/spots) et des **tours posées** qui **tirent des projectiles** vers les ennemis à portée.
- Un bandeau d'état permanent : **compteur d'argent**, **compteur de vies**, **indicateur de vague** (« Vague N / M »).
- Un **feedback immédiat** : projectile → impact → ennemi qui meurt → argent qui monte ; un ennemi qui franchit → une vie qui tombe.

## 2. Ce que le joueur FAIT
- **Pose des tours** avant et entre les vagues, en dépensant l'argent gagné.
- **Choisit le type de tour** contre le type d'ennemi (le geste tactique central : portée vs anti-blindage vs zone).
- **Place par rapport au chemin** pour maximiser le temps d'exposition des ennemis.
- **Anticipe / déclenche la vague suivante** et rééquilibre sa défense sous pression économique croissante.

## 3. Ce que le joueur RESSENT
- **Compréhension causale en < 30 s** : « je pose → ça tue → je gagne » — l'économie s'apprend sans tutoriel (ressenti observé sur les 4 jeux scannés : Bloons Dart Monkey/$1, PvZ sun, etc.).
- **Montée de pression** : tôt l'argent est abondant et le placement pardonne ; tard chaque dépense est un arbitrage douloureux (Bloons round 50-60, Kingdom Rush arbre d'étoiles).
- **Maîtrise progressive** : la découverte que certaines tours *massacrent* un type d'ennemi et sont *inutiles* contre un autre.
- **Tension terminale** : le frisson quand une vague force la ligne et que le compteur de vies vacille près de 0.

**Risques de design (angle demandé).** (a) *Boucle décorative* : si un ennemi qui passe ne coûte rien, le placement devient cosmétique — le genre s'effondre. (b) *Économie sans contrainte* : si poser ne débite pas exactement, la « pression de pressoir » — le cœur du jugement TD — disparaît. (c) *Injouable par construction* : un jeu peut passer tous les tests unitaires et rester **insolvable** (aucun bot ne gagne) ; d'où une règle de solvabilité dédiée.

**Originalité (angle demandé) — fog, décision Pierre.** Un TD *générique* (chemin → économie → tours → vagues) n'est pas original en soi. Le World Scan identifie le **modèle d'endgame** (borné niveau-par-niveau *vs* infini à difficulté rampante *vs* leaderboard à modificateurs) comme **le** différenciateur. Ce choix est un arbitrage produit : `s2-worldscan` l'a explicitement renvoyé à **HumanGate (Pierre)**, pas au Prisme. Je ne l'invente pas — je le signale comme `fog`.

## 4. Règles observables (testables — deviennent les exigences ci-dessous)
1. En < 30 s, poser une tour + tuer un ennemi ⇒ gain d'argent **strictement** visible.
2. Chaque kill crédite un montant **> 0** (compteur strictement croissant, jamais `>=` tautologique).
3. Un ennemi qui atteint la zone défendue retire **≥ 1** vie, de façon déterministe et visible.
4. `vies == 0` ⇒ état terminal **defeat** (l'arène cesse d'accepter des placements).
5. Pose sous-financée ⇒ **refus** sans débit, aucune tour fantôme, feedback de refus.
6. Une tour n'inflige de dégâts qu'aux ennemis **dans son rayon** déclaré.
7. Survivre à la dernière vague ⇒ état terminal **victory**, distinct de « en cours » et de « defeat » — et **un bot doit pouvoir l'atteindre** (solvabilité).
8. La vague N+1 ne démarre qu'après résolution de la vague N (ou déclenchement joueur).

---

## RAPPORT FINAL

**Ancre / charter** : charter.yaml **absent** (driver démarré à `s2-worldscan`, cf. `run.log:2-6`) — substitué par le genre du World Scan (`worldscan.json`, 4 jeux réels cités) + project id. Signalé, non bloquant : le concept produit est entièrement déterminé.

**Oracle cité** : `node scripts/forge/check_prisme_manifest.mjs <run_dir>/prisme.json --worldscan <run_dir>/worldscan.json`. Manifeste construit et **tracé à la main** contre `upstream_schema.mjs` (chaîne obs≠claim≠énoncé, provenance EXPECTED ancrée / ADDITIONS `reference:null`, `expected_proof`, `destination`, ids uniques, ≥1 actionnable). **Non exécuté ici** (`permissions.run: aucun`) → l'exécution de l'oracle par l'exécuteur est le gate réel.

- **Exigences classées non actionnables** : aucune (les 8 portent `expected_proof` valide + `destination` valide).
- **Références non ancrées** : aucune attendue (chaque EXPECTED cite un nom de jeu du World Scan verbatim + son URL).

software_verdict: BLOCKED — artefact produit et tracé conforme, mais l'oracle mécanique n'a **pas** été exécuté dans ce périmètre (`run: aucun`) ; je ne certifie pas une conformité que je n'ai pas fait tourner.
evidence_verdict: MECHANICAL_VALIDATION_ONLY — pour les seuls faits adossés à un fichier lu (`run.log`, `worldscan.json`, `upstream_schema.mjs`).
claim_verdict: NO_CLAIM_ALLOWED — la conformité `prisme.json` ⇒ oracle vert reste à prouver par l'exécuteur ; l'originalité/endgame est un `fog` → HumanGate Pierre.

**SKIPPED_VALIDATION** :
- item: exécution de `check_prisme_manifest.mjs` · où: `p2a_return_snapshot/prisme.json` · statut: non fait · raison: `permissions.run: aucun` — le Prisme ne lance pas d'oracle ; gate délégué à l'exécuteur.
- item: lecture du `mandatory_read` charter.yaml · où: `run_dir` · statut: non fait · raison: étape 0 non exécutée dans ce run (`run.log`), fichier inexistant ; substitué par le World Scan + project id.

**RETURN LINEAGE** (FORGE_CAUSAL_LINEAGE_V2 §3)
- **why_task_existed** — *problem*: le run précédent de `s1-prisme` a HALTED, `prisme.json` non matérialisable (`run.log:7`). *oracle*: `run_real.py extract_json_payload` (aucun bloc  valide). *root_cause*: sortie LLM sans bloc  terminal strictement valide unique. *action_reason*: reproduire le snapshot **avec** un unique bloc  terminal valide, conforme au schéma `upstream_schema.mjs`.
- **result**: product_snapshot.md (4 sections + risques + originalité-fog) + manifeste de 8 exigences (6 EXPECTED ancrées, 2 ADDITIONS `reference:null`), tracé conforme à la main.
- **proof**: fichiers lus — `check_prisme_manifest.mjs`, `upstream_schema.mjs`, `worldscan.json`, `run.log` ; trace manuelle des invariants. Aucune commande exécutée (`run: aucun`).
- **learning**: l'échec de matérialisation se prévient par une seule règle mécanique — **un** bloc  fencé, strictement valide, dernier bloc fencé de la sortie, aucun autre fence json ailleurs ; la ligne `RETURN_REASON` (non fencée) ne compte pas comme bloc.
- **next_reason**: chaîne **fermée** côté Prisme si l'oracle de l'exécuteur passe. Si `check_prisme_manifest` FAIL, la cause sera dans le manifeste ci-dessous (unique cause résiduelle) — escalade non requise, correction locale possible.
