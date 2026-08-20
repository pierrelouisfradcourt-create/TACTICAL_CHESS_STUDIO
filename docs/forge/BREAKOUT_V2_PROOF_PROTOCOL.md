# PROTOCOLE DE PREUVE — CAMPAGNE BREAKOUT V2

Date : 2026-07-30. Statut : **PROPOSED** — soumis à HumanGate Pierre avant le run 1. Lecture
seule sur le code (aucune modification, aucun commit). Sources vérifiées citées §0 ; chaque
affirmation porte `[M]` (mesuré dans le dépôt) ou `[H]` (jugement de cette préparation).

Ce document répond à une question distincte de `docs/forge/BREAKOUT_V2_CAMPAIGN_PREP.md`
(qui pose les pré-requis produit) : **comment sait-on, mécaniquement, que le PIPELINE Forge V2
a réellement tourné pendant cette campagne** — pas seulement que Breakout est un jeu qui marche.

---

## 0. Sources vérifiées

- `scripts/forge/dispatch.py` — porte unique, profil `standard_godot`, `ORDER`/`PROFILES`. [M]
- `scripts/forge/standard_oracles.py` (1472 lignes) — 6 oracles du squelette + 2 volets R1
  advisory. [M]
- `scripts/forge/static_oracles.py` — `check_architecture`, `check_wiremap`,
  `check_reuse_ratio_wired`, `check_search_consulted`, `check_feature_set_frozen`,
  `check_mutation_gate`. [M]
- `scripts/forge/verdict.py` — `build_aggregate_verdict`, `is_clean_pass`, signature HMAC. [M]
- `scripts/forge/mutation_proof.py` — module présent mais **aucune fonction `check_*`/`validate_*`
  trouvée par grep** (`def check_|def validate_proof|class MutationProof|matchCount` → 0 match).
  Le régime de preuve mutation V1 est actuellement **documentation figée**
  (`docs/forge/CONTRAT_PREUVE_MUTATION_V1.md`, « aucune implémentation à ce stade », §8 : « la
  prochaine étape n'est pas du code Snake »). **[M] Fait à signaler explicitement en §2 et §5** :
  le contrat mutation V1 n'est PAS encore branché au driver — Breakout héritera du régime
  mutation *historique* (gate `check_mutation_gate`, static_oracles.py), pas du descripteur
  `proof:` scellé, sauf si ce chantier est fait avant le run 1.
- `scripts/forge/reference_guard.py` — détection de dérive sur arbres protégés
  (`reference_protected.yaml`), CLI `compute`/`record`/`verify`. [M]
- `scripts/forge/context_manifest.py` — manifeste `kind: dispatch`, champs `git_head`,
  `contract_sha256`, `model_executed`. [M]
- `docs/forge/BREAKOUT_V2_CAMPAIGN_PREP.md` — pré-requis produit (5 artefacts bloquants,
  protocole contamination, périmètre §4, risques §7). [M]
- `knowledge_base/search.mjs` — `logSearchInvocation(query, matchCount, logPath)`,
  `{query, matchCount, ts}`. [M]

Non lus en détail dans cette passe (existence confirmée par grep, contenu non audité) :
`scripts/forge/driver.py`, `scripts/forge/learning_hook.py`, `scripts/forge/learning_memory.py`,
`scripts/forge/verify_run.py` (fonction `verify_run` confirmée présente, contrôle git_head TOCTOU
confirmé ligne 9/310-311), `scripts/forge/run_real.py` (cache tokens confirmé présent),
`scripts/forge/tests/test_failure_event_producer_cv14.py` (confirme qu'un mécanisme
`failure_event` existe, câblé dans `driver.py` et `learning_memory.py` — contenu non lu). **[H]**
Si le run 1 doit s'appuyer sur le détail exact de ces mécanismes, une passe de lecture
complémentaire est recommandée avant le go — ce document donne le protocole de preuve au niveau
où les faits sont vérifiés, pas plus loin.

---

## 1. Gates de campagne, ordonnées

### Gate 0 — Pré-vol (avant tout appel payant)

| Vérification | Commande | Résultat attendu |
|---|---|---|
| Empreinte de référence disponible ou état déclaré | `python -m forge.reference_guard verify` | `NO_BASELINE` (légitime si jamais enregistré) OU `CLEAN`/`AUTORISE` — **jamais `DRIFT`/`INCOMPLET`/`ERROR`** avant de commencer [M] |
| `games/breakout/**` hors périmètre protégé (fait, pas une action) | `Get-Content scripts\forge\reference_protected.yaml` (ou lecture directe) | confirme l'absence de `games/breakout/**` dans `protected` — la campagne ne peut PAS compter sur ce mécanisme pour la contamination (cf. §5 et CAMPAIGN_PREP §3) [M] |
| Les 4 artefacts bloquants de CAMPAIGN_PREP §2 existent | `Test-Path lab/forge_runs/breakout/charter.yaml` (Godot, v2 ou neuf) · `Test-Path games/breakout/01_DESIGN/genre_bible.json` · `Test-Path scripts/forge/contracts/wm1-wiremap-breakout.yaml` · `Test-Path games/breakout/00_CHARTER/game_contract.yaml` | 4/4 présents, chacun avec go HumanGate distinct déjà donné (CAMPAIGN_PREP §5 Phase 0) [M dépend de l'état au moment du run — non vérifié ici, à revérifier avant le go] |
| Décision contamination tranchée | lecture de la ratification Pierre (chat ou fichier de décision) | une des options (a)/(b)/(c) de CAMPAIGN_PREP §3 explicitement choisie, pas laissée en silence |
| Squelette `standard_godot` prêt | `Get-ChildItem scripts/forge/standard/` | `capabilities.yaml`, `core_requirements.yaml`, `repo_map.yaml` présents (déjà confirmé gelé par CAMPAIGN_PREP) [M hérité] |
| Contrat builder validé | `python -c "from forge.contract import load_contract; load_contract('s9-build-godot-standard')"` | charge sans `ContractIncomplete` |

### Gates par étape du profil `standard_godot`

Le profil est fixé dans `dispatch.py` lignes 175-181 : `s9-build-godot-standard → s10a-oracle-code
→ s10s-oracle-standard → s11-redteam-code → s12-verdict`. [M]

| Étape | Preuve mécanique | Commande | Rouge quand |
|---|---|---|---|
| **s9-build-godot-standard** | dispatch préparé + payload borné, tracé en audit | `python -m forge.dispatch --dry-run --profile standard_godot` (avant le run réel — preuve de câblage) | `ContractIncomplete` si le contrat n'est pas validable ; refus si `etape` hors profil sans `allow_unprofiled` [M dispatch.py:244-250] |
| **s10a-oracle-code** | reçu signé, `status ∈ {OK,FAIL,BLOCKED}`, `evidence_path` non vide pour un statut non-SKIPPED | lire `run_dir/verdict.json` → `oracles.code` | `code.status != OK`, ou évidence absente/altérée (hash recalculé ≠ signé) [M verdict.py:344-359] |
| **s10s-oracle-standard** | 6 volets `{passed,...}` — `check_line_states`, `check_placement`, `check_collisions`, `check_index`, `check_contract_completeness`, `check_budget` — tous verts pour un gate dur ; 2 volets R1 (`check_observable_coverage`, `check_genre_coverage`) advisory | lire `run_dir/verdict.json` → `oracles.standard.detail` | tout volet à `passed:false` — le nom exact du volet rouge est cité (`_red_facets`, verdict.py:237-248) [M] |
| **s11-redteam-code** | `redteam_ran: bool`, `redteam_advisory: tuple` | lire `run_dir/verdict.json` → `redteam_ran`, `redteam_advisory` | jamais bloquant pour `software_verdict` — advisory pur ; `redteam_ran=false` pousse un flag « reviewer dégradé » [M verdict.py:413-417] |
| **s12-verdict** | signature HMAC vérifiable | `python -m forge.verify_run <run_dir>/verdict.json` | signature invalide, `git_head` divergent (TOCTOU), ou `provenance_ok=false` [M verify_run.py:9,225] |

**Distinction gate dur / advisory à ne pas perdre** : les 6 oracles du squelette ET
`oracles.code` (mutation/e2e/solvabilité, via `check_mutation_gate` etc.) entrent dans
`software_verdict`. `check_observable_coverage`, `check_genre_coverage`, le red-team et l'audit
`extra_advisory` n'y entrent **jamais** — ils poussent `decision` vers
`HUMANGATE_READY_WITH_OBJECTION`, jamais vers `BLOCKED` seuls. [M verdict.py:299-315,389-394]

---

## 2. Preuves que le PIPELINE a été exercé

C'est la question centrale de la mission : un `software_verdict: OK` peut exister sans que
les mécanismes V2 aient réellement tourné (théâtre de câblage). Chaque brique ci-dessous a
sa preuve d'exécution, distincte de sa preuve de résultat.

### KB consultée (`check_search_consulted`)
- **Preuve** : `knowledge_base/search_log.jsonl` gagne des lignes `{query, matchCount, ts}` avec
  `ts >= since_iso` (borne = début de la campagne). [M static_oracles.py:690-721]
- **Piège nommé par la mission, à traiter honnêtement** : `matchCount=0` sur une requête est un
  résultat honnête si le catalogue ne porte rien sur Breakout/physique continue — ce n'est PAS un
  signal d'échec de câblage. Le signal de câblage est **l'existence de la ligne**, pas la valeur
  de `matchCount`. `check_search_consulted` lui-même ne regarde QUE `count` de lignes (au moins
  une invocation), jamais la valeur de `matchCount` — c'est la bonne granularité pour cette
  preuve. [M ligne 717 : `if count == 0` — count = nombre d'invocations journalisées, pas la somme
  des matchCount]
- **Commande de vérification** : `python -c "from forge.static_oracles import check_search_consulted; import json; print(json.dumps(check_search_consulted('<ts_debut_campagne>')))"`.

### Provenance (manifestes `kind: dispatch`)
- **Preuve** : `lab/forge_runs/breakout/<run_id>/context/*.manifest.jsonl` contient des lignes
  `kind: dispatch` (une par étape) portant `git_head` (non null), `contract_sha256` (hash du
  fichier contrat réel au moment du dispatch), `model_executed`. [M context_manifest.py:254-263]
- **Signal d'échec de câblage, pas de contenu** : si le run apparaît sous
  `lab/forge_runs/_orphan_context/<run_id>/` au lieu de `lab/forge_runs/breakout/<run_id>/`,
  c'est que la résolution de `run_dir` a échoué à identifier le sujet — provenance dégradée mais
  **best-effort, non bloquante** (le bloc est enveloppé `try/except`, dispatch.py:272-283). Un
  run orphelin n'invalide pas le `software_verdict`, mais casse la trace de provenance de la
  campagne — à signaler à Pierre, pas à ignorer.
- **Commande de vérification** : `Get-Content lab/forge_runs/breakout/<run_id>/context/*.manifest.jsonl | ConvertFrom-Json | Where-Object {$_.kind -eq 'dispatch'} | Select-Object etape,git_head,contract_sha256,model_executed`.

### Cache tokens
- **Preuve** : `cache_creation_tokens`/`cache_read_tokens` non nuls dans l'état du driver
  (confirmé présent dans `driver.py` et `run_real.py` par grep — champ existant, contenu non
  audité dans cette passe). [M existence confirmée, H sur le détail exact du schéma]
- **Limite honnête** : sur une campagne à un seul run initial (pas de run préalable pour
  amorcer le cache), `cache_read_tokens=0` peut être un résultat attendu au premier appel d'un
  contexte encore froid — ne pas le lire comme un défaut de câblage sans comparer à un run 2+.

### `failure_event`
- **Preuve d'émission SI halt** : un mécanisme `failure_event` existe, câblé dans `driver.py` et
  `learning_memory.py` (confirmé par `tests/test_failure_event_producer_cv14.py`, contenu non lu
  dans cette passe). [M existence, H détail]
- **Preuve d'absence SI aucun halt** : l'absence de tout `failure_event` sur un run entièrement
  vert est elle-même une preuve positive — pas un silence suspect. **Ne pas confondre** avec
  l'absence d'un mécanisme qui n'a jamais tourné (cf. §5).
- **Commande de vérification** : chercher `failure_event` dans `run_dir/state.json` et dans les
  logs du driver — à préciser une fois `driver.py` lu en détail (hors périmètre de cette passe).

### Gel wiremap
- **Preuve** : `lab/forge_runs/breakout/<run_id>/wiremap_frozen.json` posé, non vide, contient
  `features`/`lines` (selon schéma v1/v2) que `check_feature_set_frozen` peut consommer
  (`load_frozen_features`). [M static_oracles.py:748-758,761-788]
- **Schéma v2 attendu pour Breakout** (comme Snake) : `lines[].id` porte l'identité de règle,
  pas `features[].feature` (legacy v1). [M static_oracles.py:740-745]
- **Commande de vérification** : `python -c "from forge.static_oracles import load_frozen_features; print(load_frozen_features('lab/forge_runs/breakout/<run_id>'))"` → liste non vide.

### Verdict signé
- **Preuve** : `python -m forge.verify_run lab/forge_runs/breakout/<run_id>/verdict.json` — code
  retour 0, signature HMAC valide, `git_head` signé == `git_head` courant (ou avertissement
  TOCTOU explicite si divergence). [M verify_run.py:9,225,310-311]
- **Provenance des reçus sous-jacents** : `build_aggregate_verdict` re-vérifie CHAQUE reçu
  d'oracle (signature + `run_id` concordant + hash d'évidence recalculé) avant de composer
  `software_verdict` — un verdict OK sans reçus vérifiables est structurellement impossible
  (provenance rompue → `BLOCKED`). [M verdict.py:320-360]

### Chaîne des leçons (`learning_curve.jsonl`)
- **État actuel** : `knowledge_base/learning_curve.jsonl` est modifié (`git status` en tête de
  session le montre déjà touché) — alimenté par un mécanisme (`learning_hook.py`/
  `learning_memory.py`/`backfill_learning_curve.mjs`, tous confirmés présents par grep, contenu
  non audité). [M existence, H détail du déclencheur exact]
- **Geste de fin de campagne à préciser avant le run 1** : cette mission n'a pas lu
  `learning_hook.py` en détail — **avant de clore Breakout, vérifier explicitement par quel
  geste (automatique au verdict, ou manuel post-campagne) la chaîne s'alimente**, pour ne pas
  supposer un branchement qui n'existe pas (c'est exactement le mode de panne nommé en §5).

---

## 3. Métriques

### Discrètes — hors bande de bruit ~20 % (une seule mesure suffit)
- **Build atteint** : binaire — le projet Godot compile et s'ouvre.
- **6 oracles du squelette `standard_godot`** : `line_states`, `placement`, `collisions`,
  `index`, `contract_completeness`, `budget` — chacun `passed: true/false`, lu directement dans
  `oracles.standard.detail`.
- **Score de mutation** : catégorie `system` uniquement (adaptateurs présentation/physique-rendu
  exclus — même discipline que Snake, `categories_exclues`). **[M/H mixte]** — le régime mutation
  V1 scellé (`CONTRAT_PREUVE_MUTATION_V1.md`) n'est **pas implémenté** (§0) : sur ce run, la
  mesure vient du gate historique `check_mutation_gate` (static_oracles.py:806-851), pas du
  descripteur `proof.mutation` scellé. **Seuils fixés avant campagne** : 100 % des mutants tués,
  OU chaque survivant trié avec justification non vide (`exception: true` dans ce cas — jamais
  un OK propre, `is_clean_pass` l'exclut via `decision != HUMANGATE_READY`).
- **Solvabilité** : binaire SOLVABLE/INJOUABLE, code retour de l'oracle produit — le seuil
  numérique (nombre d'essais) est fixé dans le charter AVANT le run (`trials`, cf. CAMPAIGN_PREP
  §7 : le bot Breakout doit intercepter une balle en mouvement, pas suivre une heuristique
  chanceuse — `oracle_solvability_lesson.md`).
- **Itérations jusqu'au vert** : compte des tentatives (`attempt` dans `DispatchRecord`,
  dispatch.py:211,263) avant `software_verdict: OK`.

### Bruitées — N≥5 requis avant toute affirmation
- **Coût** (tokens/appels LLM par run).
- **Durée** (temps mur du run).
- Bande de bruit ~20 % reprise de la calibration Snake N=3 (`lab/forge_runs/snake/_run_cal{1,2,3}_20260730/`),
  citée dans `docs/forge/MASTER_SCHEMA_TRUTH_AUDIT_2026-07-30.md` [H — non relu dans cette passe,
  hérité de CAMPAIGN_PREP §6 qui le cite comme fait établi]. **Un seul run Breakout (run 1) ne
  peut affirmer AUCUNE conclusion sur coût/durée** — seulement les enregistrer comme premier
  point d'une série à constituer.

**Seuils fixés AVANT la campagne, jamais après** — ce protocole même EST le lieu où les fixer :
- Mutation : 100 % ou survivant trié+justifié (repris du gate historique, inchangé).
- Solvabilité : `trials` fixé dans `game_contract.yaml`/charter avant s9, pas ajusté après un
  résultat rouge.
- Bande de bruit coût/durée : ~20 %, héritée de Snake — **si un seuil différent est voulu pour
  Breakout (physique continue, cf. §7 CAMPAIGN_PREP), il doit être déclaré ici, avant le run,
  pas après avoir vu le premier résultat.**

---

## 4. Critère produit non négociable — le jeu démarre et affiche

Leçon ratifiée 2026-07-29 (`proof_never_replaces_product_run.md`) : un projet peut satisfaire
tous ses oracles et ne pas démarrer. Ce test est **hors chaîne d'oracles**, exécuté séparément.

**Protocole exact pour Godot** :
1. Lancer le projet avec fenêtre GPU réelle : `Godot_bin --rendering-driver vulkan --path
   games/breakout --position -3000,-3000` (fenêtre positionnée hors écran visible mais **avec**
   pipeline de rendu réel). **Jamais `--headless`** — `--headless` utilise un driver de rendu
   `dummy` qui produit une texture NULLE, mesuré 2026-07-22 (`godot_capture_requires_gpu_window.md`).
2. Capturer un screenshot après un délai d'attente (~1,2 s mesuré sur Snake — même ordre de
   grandeur attendu, à confirmer sur ce run).
3. Vérifier VISUELLEMENT (pas seulement « le process n'a pas crashé ») que l'écran affiche du
   contenu du jeu (balle, raquette, briques) — pas un écran noir/vide, qui passerait un test
   « process exit 0 » à tort.
4. Fermer proprement le process (le driver ne doit pas laisser un processus Godot orphelin).

**Invariant à déclarer dans le charter, pas seulement à exécuter** (deuxième leçon de clôture
Snake) : ce test doit être vérifié **HORS présence de bug ET en présence d'un bug** — c'est-à-dire
que le charter doit nommer ce point d'entrée comme un invariant qui reste vrai même quand tout le
reste casse, pas une case cochée une fois puis oubliée. Concrètement pour Breakout : ce test
tourne à chaque run (pas seulement au run 1), et son échec est un signal **produit**, distinct
d'un oracle rouge — cf. §5.

---

## 5. Ce qui peut faire échouer la campagne sans être un échec du jeu

C'est la distinction qui a coûté le plus cher au cycle Snake (`proof_never_replaces_product_run.md`).
Modes de panne du PIPELINE à distinguer explicitement d'un défaut produit :

| Mode de panne PIPELINE | Signal mécanique | Comment le distinguer d'un défaut produit |
|---|---|---|
| **Contrat non activable** | `ContractIncomplete` levée par `load_contract`/`prepare_dispatch` avant tout spawn | Aucun code de jeu n'a été touché — l'échec est antérieur à s9. Le `software_verdict` n'existe même pas encore. |
| **Manifeste orphelin** | Le run apparaît sous `_orphan_context/<run_id>` au lieu de `breakout/<run_id>` | Provenance dégradée (best-effort, jamais bloquante pour le verdict) — mais casse la traçabilité de CETTE campagne spécifiquement. Ne dit rien sur si le jeu marche. |
| **Régime mutation V1 non branché** | Le reçu code porte le gate mutation *historique*, pas `proof_chain` scellée (§0/§3) | Le score de mutation reste une mesure valide (gate historique inchangé, CONTRAT §7 point 2), mais la campagne NE PEUT PAS prétendre exercer le régime V1 scellé tant qu'il n'est pas implémenté — à ne pas confondre avec « la mutation Breakout est mauvaise ». |
| **Oracle qui suppose une topologie web** | `check_reuse_ratio_wired`/`check_search_consulted` cherchent `run-oracle.mjs`/patterns JS ; un projet Godot peut ne pas avoir cette forme | Un `passed: false` de ces oracles ADVISORY sur un projet Godot peut être un faux négatif de FORME (l'oracle suppose du JS), pas une absence réelle de recherche/réutilisation — vérifier le contenu réel avant de le lire comme un défaut de câblage. Ces oracles restent advisory (n'affectent jamais `oracle_ok`), donc n'invalident pas `software_verdict`, mais peuvent fausser la lecture des preuves §2. |
| **Contamination de lecture** (CAMPAIGN_PREP §3) | Aucun signal mécanique disponible — `games/breakout/**` n'est pas dans `reference_protected.yaml`, et le mécanisme est un détecteur de MODIFICATION, pas d'exclusion de LECTURE | Si le builder produit un code GDScript étrangement proche de la logique JS de `games/breakout/game.mjs`, ce n'est PAS un signal d'oracle — c'est un jugement humain sur la ressemblance, à faire au moment de la revue verdict, jamais automatisable dans ce protocole. Nommé explicitement pour que Pierre sache qu'aucune gate mécanique ne le détecte. |
| **Physique continue non déterministe** | Réplication de replay non bit-exacte — un `check_*` dédié n'existe pas encore de manière visible dans les sources lues ici | Si le déterminisme casse, c'est un défaut d'IMPLÉMENTATION du builder (pas de pas de temps fixe déclaré) — donc un vrai défaut produit, MAIS sa détection dépend d'un test que le contrat doit explicitement exiger (CAMPAIGN_PREP §7) ; son absence dans le contrat est un défaut de PIPELINE (contrat incomplet), pas de produit. |
| **Garde de référence (Pong) en DRIFT/INCOMPLET** | `reference_guard verify` retourne autre chose que `CLEAN`/`AUTORISE`/`NO_BASELINE` | Concerne le témoin Pong, sans rapport direct avec Breakout — mais si actif, bloque la confiance dans TOUTE campagne en cours (le témoin de régression n'est plus fiable), pas seulement Breakout. |
| **`failure_event` jamais émis alors qu'un halt a eu lieu** | Écart entre `state.json` (statut HALTED/erreur) et absence de `failure_event` dans les logs | Signal de PIPELINE cassé (le mécanisme d'alerte n'a pas tourné), distinct du fait que le halt lui-même peut être légitime (contrat qui refuse un run mal formé). |

---

## 6. Ce qui reste à trancher avant le run 1 (récapitulatif, hors mandat de ce document)

- Les 5 pré-requis bloquants de `BREAKOUT_V2_CAMPAIGN_PREP.md` §2 (charter Godot, Genre Bible,
  contrat wiremap, game_contract, décision contamination) — non recréés ici, ce protocole les
  suppose résolus.
- Le statut réel du branchement `proof.mutation` V1 (§0/§3/§5) : à vérifier explicitement — soit
  brancher avant le run 1 (chantier séparé, hors mandat de cette mission), soit documenter
  explicitement dans le charter Breakout que le run 1 utilise le gate mutation historique, pas
  le régime scellé V1.
- Le geste exact d'alimentation de `learning_curve.jsonl` en fin de campagne (§2, dernier point).

---

## Marqueurs

`[M]` fait vérifié directement dans le code cité · `[H]` jugement/recommandation de cette
mission, à valider HumanGate · aucune commande listée n'a été exécutée dans cette mission
(lecture seule).

software_verdict: n/a (document de protocole, pas de code produit) ·
evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
claim_verdict: NO_CLAIM_ALLOWED
