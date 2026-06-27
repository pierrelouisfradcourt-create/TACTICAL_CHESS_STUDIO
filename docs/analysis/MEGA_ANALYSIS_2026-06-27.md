# MEGA ANALYSIS — Tactical Chess Studio

**Date :** 2026-06-27 · **Méthode :** 6 sous-agents AAA en parallèle, lecture seule, preuves `fichier:ligne` (code réel, jamais la doc seule). Branche `master`.
**Verdicts globaux :** `software_verdict: BLOCKED` (P0 confirmés non corrigés) · `evidence_verdict: MECHANICAL_VALIDATION_ONLY` · `claim_verdict: NO_CLAIM_ALLOWED`

> Source : audit complet (`docs/audit/AUDIT_COMPLET_2026-06-27.md`) + plan 100 actions (`docs/roadmap/PLAN_100_ACTIONS_2026-06-27.md`). Ce document fusionne 6 analyses ciblées : branchements manquants, UX cockpit, flux Studio OS, handoff Rocky→Godot, opportunités cachées, gaps factory.

## Corrections de prémisse (honnêteté méthodo)
- **« 36 fetch sans catch »** → FAUX. Mesure réelle : **81 `fetch(`, 77 protégés, 4 réellement non gérés** (`autopilot.py:4747, 5988, 6023, 6034`). La vraie dette = **~50 `catch(e){}` silencieux** qui avalent l'erreur sans la signaler.
- **`neural_bridge.py` / `neural_protocol.py`** → n'existent pas en Python ; le bridge est en **Rust** (`src/agents/neural_bridge.rs`, `neural_protocol.rs`), pipe stdin/stdout (pas de socket/HTTP dans tout `src/`).
- **`studio/factory/`** → n'existe pas (`Glob` vide). La factory réelle vit sous **`studio_core/`**.
- **L'IR « compiler »** → ne compile rien : `compile()` est un passe-plat (`ir_compiler.py:66-67`) ; les `condition`/`effect` des règles sont des **strings jamais parsées** (`game_ir_schema.json:36` promet des callables non implémentés).

---

# PARTIE A — Les 6 analyses (condensé probant)

## SA1 — Branchements manquants (42 identifiés, cible ≥30 dépassée)

Tout ce qui existe mais n'alimente rien. Top par ROI :

| Composant A → B | Coupure | Preuve | Effort | ROI |
|---|---|---|---|---|
| `director_schedule.json` → exécution du 1er IMP | cron lance `--schedule` sans `--dispatch-execute` | `director.py:645` vs `crontab.director:25` | S | Très haut |
| `train.py latest.pt` (chaque epoch) → gate ELO `candidate.pt` | `candidate.pt` jamais produit | `train.py:961` vs `learning_loop.sh:43,109` | M | **P0** |
| backbone `current_state.json` → état affiché UI | UI lit `studio_meta_latest.json` (autre source) | `ingest_event.py:51` vs `autopilot.py:1715` | M | Haut (double vérité) |
| `kaizen_autoloop` → exécution réelle | forcé `dry_run=True` | `autopilot.py:7570` | S | Haut |
| `golden_examples.jsonl` → LoRA | `lora_train_devstral.py` lit un autre fichier | `golden_collector.py:130` vs `lora_train_devstral.py:30` | M | Moyen |
| 2 trainers → `models/latest.pt` (sans provenance) | load aveugle | `train.py:961`+`run_selfplay_training.py:241` vs `infer_policy.py:76` | M | Haut |
| `variants/snake_*.json` (10) → sweep balance | 0 réf code | `variants/` vs `headless_sim.py:117` | S/M | Élevé |
| `state_validator.validate_all()` → boot/tick | jamais appelé | `state_validator.py:93` vs `start_studio.sh:112` | S | Moyen |

**Branchements morts les plus coûteux (simulent une feature) :** boucle autonome complète sur papier mais chaque arête « agir/ingérer » gatée derrière un flag ; pipeline train→deploy (datasets A/B/C/D, holdout, reverse-curriculum, priority queue, gate ELO) dont rien n'est chargé par un trainer ; gates PR04/05/07 (PR07 = **0 code, fantôme**) ; chaîne fusion/route/chain_executor/validate sans orchestrateur ; couche `ai/` Rust (traits neural prior / arbitrage / search backend) 0 appelant prod.

## SA2 — UX cockpit AAA

**3 UIs disjointes :** `autopilot.py` (cockpit, port 7331), `studio/studio_canvas.html` (canvas oracle, port 8766), `viewer.html`+`lab/ui/play.html` (échiquier). Aucune ne consomme les données des autres.

**Données disponibles NON affichées** (existent, jamais rendues en HTML) : ELO live (`elo_match_latest.json` verdict FAIL Δ+10) ; puzzles L1/L2/L3 solved_pct (`lichess_eval_latest.json`, L2/L3 4.5% FAIL) ; `global_verdict`/`blockers`/`pending_gates` (`studio_meta_latest.json`, lu seulement pour rafraîchir `studio_state.json`) ; statut services up/down (`director_status.json:services[]`) ; thèmes d'échecs ratés (`puzzle_analysis_L2.json`) ; profil perf moteur (`search_profile_latest.json`) ; `velocity` (φ history, calculé mais affiché « — »).

**Panels factory manquants** (lane JEUX **non instrumentée**, tout est table statique avec pills `NOT_STARTED`) : games registry, galerie/lancement, statut Godot/UCI (probe), sweep/balance dashboard, éditeur d'IR. `grep sweep|balance` côté factory = **0**.

**4 fetch réellement non gérés** + fix :
| Ligne | Appel | Fix |
|---|---|---|
| `4747` | `fetch('/api/logs',DELETE)` (`clearLogs`) | `.catch(showToast)` |
| `5988` | `fetch('/api/autoloop-start')` | `try/catch` → state error |
| `6023` | `fetch('/api/autoloop-stop')` | `try/catch` |
| `6034` | `fetch('/api/autoloop-stop')` (`try/finally` sans catch) | ajouter `catch` |
Fix systémique : wrappers `apiGet/apiPost` + traiter les ~50 `catch(e){}` silencieux.

**Extraction estimée : ~3350 / 4020 lignes (~83 %)** → `/static/` (315 CSS + ~830 HTML/partials + ~2200 JS). **⚠ HumanGate** : viole la règle CLAUDE.md « pas de fichier HTML séparé / boutons dans les strings Python ».

## SA3 — Studio OS : flux réel vs voulu

La chaîne `director → dispatch_bridge → kaizen_autoloop → governor → kaizen_loop → ingest → reducers → current_state` est **physiquement câblée bout-à-bout**, mais **3 verrous la maintiennent ouverte** :
1. **Aucun ordonnanceur sur la plateforme réelle (Windows)** — `crontab.director` est WSL-only, install manuelle (`crontab.director:25`).
2. **Double opt-in anti-Skynet** — `--dispatch` + `--dispatch-execute`, `execute=False`/`dry_run=True` par défaut (`director.py:661-662`, `dispatch_bridge.py:224`, `autopilot.py:7570`).
3. **`current_state.json` = puits mort** — produit par les reducers, lu par aucune couche de décision ; `studio_meta` (gate d'entrée autoloop) court-circuite en lisant les JSON oracle directement (`studio_meta.py:181`).
+ **Fragilité d'exécution** : `execute_via_claude_code` retombe sur `input()` → EOF en sous-process → rapport vide → IMP reste OPEN (`kaizen_autoloop.py:219-243,266`).

**Événements non capturés :** IMP fermé hors autoloop (`kaizen_loop.py:199` n'émet aucun event) ; oracle via `bench/*.sh` direct (pas d'ingestion) ; `studio_meta` exécuté (aucun event) ; dataset/modèle/commit (FORBIDDEN listés mais aucun émetteur ne détecte l'occurrence).

**Flux réel (résumé ASCII) :**
```
[pas de scheduler Windows ✗] → director --schedule (observe) → schedule.json
   _maybe_dispatch ✗(--dispatch) → dispatch ✗(execute=False) → [rien lancé]
UI bouton → /autoloop-start (dry_run=True) → Popen kaizen_autoloop   (chemin // humain)
/smoke-check(humain) → run_oracle.sh → ingest ✗(ne rafraîchit pas studio_meta)
reducers → current_state.json → ✗ puits mort (0 lecteur décisionnel)
```

**Delta = 15 connexions** (top) : scheduler Windows→director (S) ; schedule→dispatch armé par oracle vert (M) ; `run_oracle.sh`→studio_meta (S) ; `ingest_event`→studio_meta (S) ; `kaizen_loop close`→backbone tout chemin (M) ; `studio_meta` lit `current_state` (M) ; `current_state`→scheduler director (M) ; oracle rouge→freeze enforcé en code (S) ; `execute_via_claude_code` headless fiable (L).

## SA4 — Rocky → Godot handoff AAA

**Bridge existant (réel) :** Rust → process Python long-vécu via pipes. Spawn `Command::new(python) -u infer_policy.py --serve`, `env_clear` + venv isolé (`neural_bridge.rs:89-118`) ; process gardé `Mutex<Option<NeuralProcess>>` (pas de respawn/coup) ; reader thread + `sync_channel(8)` (`:279`) ; handshake `READY` (`:138`, `infer_policy.py:246`) ; timeouts query 5 s / startup 60 s (`:246-260`) ; retry once (`neural_agent.rs:535`).

**Format des messages :**
- Rust→Python : `{fen}|{uci1}|{uci2}|...\n` (coups légaux, `neural_bridge.rs:194`).
- Python→Rust : `{best}|{policy_index}|{value:.6f}|{mv:idx,...}[|{memory_json}]` (`infer_policy.py:288`).
- Parsing Rust `splitn(5,'|')` → `PythonPrediction` (`neural_protocol.rs:17`). UCI produit par `action_to_uci` (`uci.rs:16`). **Protocole UCI-like maison sur pipe, PAS l'UCI standard** (pas de `position/go/bestmove`).

**Chemin minimal Rocky→Godot (étapes 1-7 existent, 8-10 manquent) :**
| # | Étape | Existe ? |
|---|---|---|
| 1-4 | binaire+FEN→Engine, coups joués, légaux | ✅ `cli.rs:208,729,737,438` |
| 5 | choisir coup (search_root ou neural) | ✅ `cli.rs:763` / `simulation_runner.rs:1275` |
| 6-7 | coup→UCI+JSON one-shot stdout | ✅ `cli.rs:772-778` |
| 8 | **transport persistant process↔frontend** | ❌ aucun serveur (respawn/coup) — M |
| 9 | **frontend échiquier interactif** | ❌ `viewer.html` = replay CSV read-only — L |
| 10 | **boucle joueur→moteur→render** | ❌ seul game-loop = simulation (moteur vs moteur) — M |

**Ce qui manque :** serveur de coup persistant (le pattern `--serve` existe déjà côté `infer_policy.py:231` à répliquer) ; UI interactive (drag/drop, saisie de coup) ; game-loop humain. **`viewer.html` non réutilisable tel quel** (entrée = CSV collé, 0 fetch).

**Pattern dual-layer réutilisable (factory) :** Layer 1 core natif autoritatif (état sérialisé ⇄ action) ne connaît jamais le frontend ; Layer 2 bridge = process long-vécu handshake+timeout+retry, contrat ligne `|`-séparé symétrique ; Layer 3 frontend pure présentation+saisie. **Asymétrie actuelle :** pleinement réalisé pour Rust↔modèle-Python ; le couple Rust↔frontend n'a que la version one-shot CLI.

## SA5 — Opportunités cachées (25 quick connections)

Top 10 (valeur décroissante) :
| # | A → B | Valeur | Effort |
|---|---|---|---|
| 1 | `variants/*.json` (orphelins) → `headless_sim.py:117/219` | batterie de tuning balance auto sur 10 variants | S |
| 2 | `golden_collector.py:90` → `lora_train_devstral.py:30` | entraîner la LoRA sur le corpus réellement collecté | S |
| 3 | `dataset_builder_v3.py:109..` → `ACTIVE_DATASET.txt` | 4 pools construits jamais entraînés | S |
| 4 | `state_validator.py:93` → `director.py:493/706` | garde schema-drift à chaque tick | S |
| 5 | `ingest_event.py:235 verify_event_log` → `bench/*.sh .hmac` | ferme le fail-open HMAC | M |
| 6 | `governor.check` → `director.schedule_next_imps` | gate fail-closed sur l'assignation | M |
| 7 | `validate_corpus.py:32` → `golden_collector.py:90` | valider le corpus après chaque collecte | S |
| 8 | `FORBIDDEN_MISSIONS` ×3 → constante unique | fin du drift (governor/ingest/bootstrap) | S |
| 9 | 6 écrivains de `latest.pt` → registre single-writer | traçabilité + fin des races | M |
| 10 | 3 trainers → harnais entraînement partagé | fin des 3 réimplémentations Dataset/epoch | M |

**Datasets orphelins :** `dataset_a/b/c/d`, `pool_sf`, `lab/selfplay/results.csv`, `lab/data/opening_book.jsonl`, `lab/puzzles/level_all.jsonl` (27 Mo), `ml/golden_examples.jsonl` (doublon), `linked_pedagogy/*`.
**Fonctions mortes :** `Decision.__bool__` (governor:55), `state_validator.validate_all`, `validate_corpus`, types `ai/` Rust, oracle `headless_sim` (print-only, 0 retour).
**Duplications :** double Zobrist (`search.rs:1102` vs `engine.rs:26`), FORBIDDEN_MISSIONS ×3, lane colors Python/CSS, subprocess Rust (`neural_bridge.rs:89` vs `uci_agent.rs:27`).

## SA6 — Factory gaps techniques

**Tableau réutilisabilité :**
| Fichier | Verdict | Preuve |
|---|---|---|
| `ir_compiler.py` | **Wrapper needed** | `:14-15` enum Snake ; `:66-67` no-op compile |
| `game_ir_schema.json` | Wrapper needed | `:29` enum type figé Snake |
| `variants/*.json` (10) | **Réutilisable tel quel** (data) | IR valides ; refs=0 |
| `runtime/engine.py` | Réutilisable (Snake) | `:14-52` data-driven |
| `games/snake_survivor_v1.py` | **Réutilisable tel quel** | `:71-247` boucle pygame |
| `factory/manifest.py` | **À créer par genre** | `:122-215` règles=strings, asserts 12/11 |
| `sim/headless_sim.py` | Wrapper needed | bon *pattern* gate, couplé Snake (`:233-245`) |
| `ml/model.py` | **À réécrire** | 8×8 figé `:58,67`, vocab échecs |
| `lab/datasets/*` | **À créer** | 100 % échecs, aucun dataset « qualité de jeu » |

**Plan factory 8 étapes :** (1) statuer racine `studio_core/` vs `studio/factory/` ; (2) `--ir PATH` au CLI (débloque variants, S) ; (3) registre de jeux (M) ; (4) abstraire `headless_sim` en gate générique (M) ; (5) dumper métriques sim en JSONL (S) ; (6) vrai dispatch règle→callable (L) ; (7) pont Chess↔Godot↔Rust (L) ; (8) décider rôle `model.py` (oracle échecs only).

**3 risques P0 factory :** (P0-1) IR décoratif → faux sentiment de généricité ; (P0-2) `studio_core/` en **3 copies divergentes** (worktrees) ; (P0-3) **aucun oracle qualité réutilisable hors Snake/échecs** → tout nouveau jeu arrive sans gate mécanique (contredit la doctrine « verdict adossé à un oracle non-LLM »).

---

# PARTIE B — Consolidation

## 1. Top 20 actions immédiates classées ROI (Quick Win S en tête)

| Rang | Action | Effort | Source | Valeur |
|---|---|---|---|---|
| 1 | **`--ir PATH` au CLI** (`main.py`) + forward `run_simulation(ir_path)` → 10 variants vivants | S | SA6/SA5/SA1 | Débloque variants + sweep |
| 2 | **Sweep balance** : boucler l'oracle `headless_sim` sur `variants/*.json` | S | SA5#1 | Batterie tuning auto |
| 3 | **LoRA lit `golden_examples.jsonl`** (corriger `DATASET_PATH`) | S | SA5#2 | Corpus enfin entraîné |
| 4 | **`run_oracle.sh` → refresh `studio_meta`** (1 ligne après ingest) | S | SA3 Δ#3 | Verdict à jour |
| 5 | **`state_validator.validate_all()` au boot + tick director** | S | SA1#11/SA5#4 | Drift détecté auto |
| 6 | **`FORBIDDEN_MISSIONS` source unique** (governor/ingest/bootstrap) | S | SA5#8 | Fin du drift gate |
| 7 | **Brancher `dataset_a/b/c/d` builder sur `ACTIVE_DATASET`** | S | SA5#3/SA1#28 | 4 datasets ressuscités |
| 8 | **4 fetch non gérés + wrappers `apiGet/apiPost`** | S | SA2#4 | Fin panneaux figés |
| 9 | **`viewer.html` → `/api/selfplay-trace`** | S | SA2 | Visu échiquier réelle |
| 10 | **Lane colors source unique** (Python+CSS) | S | SA5#14 | Cohérence |
| 11 | **Afficher ELO/puzzles live + verdict global dans le cockpit** | S/M | SA2#1 | Données existantes invisibles |
| 12 | **`headless_sim` retourne verdict + exit code** (+ dump JSONL) | S | SA5#20/SA6#5 | Oracle câblable en gate |
| 13 | **Scheduler Windows pour director** (Task Scheduler) | S | SA3 Δ#1 | Plateforme réelle |
| 14 | **`kaizen_loop close` → `ingest_event` (tout chemin)** | M | SA3 Δ#6/SA1#7 | IMP fermés journalisés |
| 15 | **Réparer le gate `candidate.pt`** (train.py écrit candidate, pas latest) | M | SA1#25 | **P0 — closed-loop** |
| 16 | **`studio_meta` lit `current_state.json`** (réconcilier double vérité) | M | SA3 Δ#7/SA1#44 | Boucle se referme |
| 17 | **Registre modèle single-writer** (6 écrivains de latest.pt) | M | SA5#9 | Provenance modèle |
| 18 | **Serveur de coup Rocky persistant** (`--serve` style infer_policy) | M | SA4#8 | Débloque play-vs-Rocky |
| 19 | **Abstraire `headless_sim` en gate générique** (protocole `run(env)->metrics`) | M | SA6#4 | Gate qualité multi-jeux |
| 20 | **`execute_via_claude_code` headless fiable** (plus d'`input()` EOF) | L | SA3 Δ#10 | Autoloop ferme en daemon |

## 2. Top 5 décisions HumanGate bloquantes

1. **Extraction HTML/JS du cockpit vers `/static/`** (~83 % de 4020 lignes) — **viole la règle CLAUDE.md** « pas de fichier HTML séparé / boutons dans les strings Python ». Sans décision, l'UX ne peut pas scaler. *Recommandé : autoriser l'extraction, mettre à jour la règle.*
2. **Activer la boucle semi-autonome** (scheduler Windows + armement du dispatch gardé par oracle vert) — lève le verrou anti-Skynet. Décision de gouvernance (cap + kill-switch + dry-run conservés).
3. **Racine factory canonique** : statuer `studio_core/` (réel) vs `studio/factory/` (annoncé, inexistant) ET geler les 3 copies worktrees avant d'industrialiser.
4. **IR exécutable vs « 1 moteur par genre »** : implémenter le dispatch règle→callable (`ir_compiler.py:66`) OU retirer la promesse « compiled to callables » du schéma et assumer un moteur Python par genre.
5. **CI réelle** (`cargo test` + `pytest` sur PR `src/**`/`ml/**`) — zone `.github/` sensible (CODEOWNERS). Sans elle, produire N jeux = N régressions silencieuses. *(retrain/model-deploy restent FORBIDDEN/HumanGate.)*

## 3. Graphe de dépendances critique (ASCII)

```
                       ┌─────────────────── LEVIER RACINE ───────────────────┐
                       │  A01  IR générique (sortir REQUIRED_ENTITIES :15)    │
                       │       + dispatch règle→callable (ir_compiler:66)     │
                       └───────┬─────────────────────────────┬───────────────┘
                               │ débloque                     │ débloque
                 ┌─────────────▼──────────┐        ┌──────────▼─────────────┐
                 │ FACTORY MULTI-GENRE     │        │ ORACLE QUALITÉ GÉNÉRIQUE│
                 │ --ir CLI · registre jeu │        │ headless_sim abstrait   │
                 │ variants vivants(#1,#2) │◄───────│ verdict+exit+JSONL(#12) │
                 └─────────────┬──────────┘  gate   └──────────┬─────────────┘
                               │                                │ gate qualité
                               ▼                                ▼
                 ┌──────────────────────────┐        ┌────────────────────────┐
                 │ NOUVEAUX JEUX + Rocky play│        │ CI réelle (cargo/pytest│
                 │ serveur coup persistant#18│        │  + balance) — HumanGate │
                 └─────────────┬────────────┘        └────────────────────────┘
                               │
   ┌───────────────────────────▼──────────────────────────────────────────┐
   │ BOUCLE STUDIO OS (fermer les 3 verrous)                               │
   │  scheduler Windows(#13) → director → dispatch armé(oracle vert) →     │
   │  kaizen_autoloop(exec fiable #20) → close → ingest → current_state    │
   │            ▲                                          │                │
   │            └──── studio_meta lit current_state(#16) ◄─┘  (referme)     │
   └──────────────────────────────────────────────────────────────────────┘
                               │ alimente
                 ┌─────────────▼───────────────┐
                 │ PIPELINE ML (réparer P0)     │
                 │ candidate.pt(#15) · single-  │
                 │ writer(#17) · datasets(#7)   │
                 └──────────────────────────────┘

CHEMIN CRITIQUE : A01 (IR générique) → factory + oracle générique → CI/nouveaux jeux.
                  En parallèle : fermer la boucle Studio OS (#13,#16,#20) et réparer le P0 ML (#15).
```

## 4. Registre de risques P0 consolidé

| ID | Risque | Preuve | Impact | Mitigation |
|---|---|---|---|---|
| **P0-A** | Gate de déploiement modèle court-circuité (`latest.pt` écrasé avant éval, `candidate.pt` jamais produit) | `train.py:961` vs `learning_loop.sh:43,109` | Modèle servi régresse sans garde-fou | train.py→`candidate.pt`, deploy après éval (#15) |
| **P0-B** | `current_state.json` = puits mort (pipeline causal ne pilote rien) | `ingest_event.py:51` produit, 0 lecteur décisionnel ; `studio_meta.py:181` court-circuite | Boucle jamais fermée, autonomie illusoire | studio_meta + director lisent current_state (#16) |
| **P0-C** | IR décoratif (compiler no-op, règles = strings) → fausse généricité | `ir_compiler.py:66-67` ; `game_ir_schema.json:36` | Ajouter un genre = recoder un pipeline | dispatch règle→callable OU assumer 1 moteur/genre |
| **P0-D** | Factory `studio_core/` en 3 copies divergentes (worktrees) | `Glob **/ir_compiler.py` ×3 | Dérive silencieuse de la factory naissante | geler racine canonique, exclure worktrees |
| **P0-E** | Aucun oracle qualité réutilisable hors Snake/échecs | `headless_sim` couplé Snake `:233-245` ; `model.py` 8×8 figé ; `lab/datasets/*` 100 % échecs | Nouveau jeu sans gate mécanique (viole doctrine) | abstraire gate sim (#19) avant d'ajouter des jeux |
| **P0-F** | CI ne teste pas le code ; gate PR07 = 0 code (fantôme) | audit P0-2 ; `check PR07` introuvable | Régressions silencieuses à l'échelle | CI réelle (HumanGate #5) |
| **P0-G** | `execute_via_claude_code` → `input()` EOF en sous-process → autoloop ne ferme jamais en daemon | `kaizen_autoloop.py:219-243,266` | Boucle autonome inopérante même armée | mode headless garanti (#20) |

## 5. Roadmap 30 jours réaliste

**Semaine 1 — Câblage à coût nul (que des S, valeur immédiate).**
Actions 1-12 du Top 20 : `--ir` CLI + sweep variants, LoRA→golden, datasets→ACTIVE_DATASET, run_oracle→studio_meta, state_validator au tick, FORBIDDEN unique, lane colors unique, 4 fetch + wrappers, viewer→backend, ELO/puzzles live au cockpit, headless_sim verdict+JSONL.
*Livrable : 10 variants jouables+mesurés, corpus LoRA entraîné, données live visibles, oracle balance câblable.*

**Semaine 2 — Factory générique + oracle (lever P0-C/E + le levier racine).**
Sortir `REQUIRED_ENTITIES` vers un registre d'archétypes ; abstraire `headless_sim` en gate générique (`run(env)->metrics`, flags paramétrés) ; registre de jeux ; geler la racine factory canonique (P0-D) ; décider IR exécutable vs 1-moteur/genre.
*Livrable : un 2e « genre » minimal validable par l'oracle ; factory non plus mono-Snake.*

**Semaine 3 — Fermer la boucle Studio OS + réparer le P0 ML.**
Scheduler Windows→director ; `kaizen_loop close`→ingest (tout chemin) ; `studio_meta` lit `current_state` (P0-B) ; oracle rouge→freeze enforcé en code ; réparer `candidate.pt` + registre modèle single-writer (P0-A).
*Livrable : boucle observe→agir→ingère→décide refermée (en mode armé-supervisé) ; déploiement modèle sûr.*

**Semaine 4 — Produit jouable + qualité à l'échelle (sous HumanGate).**
Serveur de coup Rocky persistant (`--serve`) + glue frontend → premier « play vs Rocky » ; `execute_via_claude_code` headless fiable (P0-G) ; CI réelle `cargo test`+`pytest`+balance (HumanGate #5) ; décision extraction `/static/` (HumanGate #1) puis extraction CSS/JS si go.
*Livrable : 1 jeu réellement jouable bout-à-bout + filet CI sur le code.*

> **Garde-fous transverses :** conserver cap + kill-switch + dry-run par défaut ; toute mutation `IMPROVEMENT_LEDGER.yaml` via `kaizen_loop.py` ; zones `tests/ eval/ oracle/ bench/ puzzles/` protégées ; retrain/model-deploy = HumanGate.

---

*Consolidation de 6 analyses lecture seule (preuves `fichier:ligne`). Aucun code modifié par cette analyse. Chaque action majeure mérite son propre `/plan` avant exécution. Les prémisses du brief corrigées par les agents sont signalées en tête (fetch, bridge Rust, studio/factory inexistant, IR no-op).*

claim_verdict: NO_CLAIM_ALLOWED · evidence_verdict: MECHANICAL_VALIDATION_ONLY · software_verdict: BLOCKED
