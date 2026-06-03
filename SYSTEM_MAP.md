# SYSTEM_MAP — Tactical Chess Studio

> Généré le **2026-06-01** par cartographie exhaustive du dépôt.

---

## 1. Vue d'ensemble

| Métrique | Valeur |
|---|---|
| Crate | `tactical_chess_pure_lab` v0.1.0 |
| Edition Rust | 2021 |
| Fichiers `.rs` src | 106 |
| Lignes src (Rust) | 29 883 |
| Fichiers tests (`tests/`) | 28 |
| Lignes tests (Rust) | 6 830 |
| **Total Rust** | **36 713 lignes** |
| Fichiers Python (`lab/`) | 25 |
| Fichiers Markdown (hors dépendances) | 545 |
| Fichiers JSONL datasets | 6 |

**Langages présents** : Rust (dominant), Python (lab ML), YAML (control-plane), JSON (config/registry), JSONL (datasets), Markdown (docs/charters), TOML (Cargo).

---

## 2. Arbre des modules avec responsabilités

```
tactical_chess_pure_lab
├── src/lib.rs              — point d'entrée lib (exporte: ai, core, env, evaluation)
├── src/main.rs             — point d'entrée bin → run_cli()
│
├── src/chess/              — MOTEUR D'ÉCHECS
│   ├── search.rs           — negamax alpha-beta, timeout thread-local, search diagnostics
│   ├── eval.rs             — évaluation statique (matériel + structure)
│   ├── fen.rs              — parsing/sérialisation FEN + Chess960
│   ├── practical_policy.rs — policy pratique (move ordering, heuristics)
│   ├── opponent_response_mask.rs — masque des réponses adverses
│   ├── move_features.rs    — features vectorielles des coups
│   ├── puzzle.rs           — détection/vérification puzzles tactiques
│   ├── decision.rs         — arbre de décision racine
│   ├── decision_trace.rs   — traçage des décisions
│   ├── decision_trace_bridge.rs — pont trace ↔ format externe
│   ├── decision_controller_adapter.rs — adaptateur HumanGate ↔ moteur
│   ├── root_decision.rs    — sélection du coup à la racine
│   ├── transition_analysis.rs — analyse des transitions d'état
│   ├── transition_interpretation.rs — interprétation sémantique des transitions
│   ├── transition_reply.rs — réponse aux transitions
│   ├── cost_search_observability.rs — observabilité coût/profondeur
│   ├── legal_action_adapter.rs — adaptateur actions légales ↔ core
│   ├── search_backend_adapter.rs — adaptateur backend search ↔ ai::SearchBackend
│   ├── search_diagnostics.rs / _accumulators.rs / _builders.rs — métriques search
│   ├── search_mirror_ordering.rs / search_root_ordering.rs — ordonnancement coups
│   ├── castling_spec.rs    — règles de roque (Classical + Chess960)
│   ├── chess960.rs         — générateur positions Chess960
│   ├── chess_variant.rs    — enum variant (Classical / Chess960)
│   ├── uci.rs              — parsing commandes UCI
│   ├── opening_book.rs     — livre d'ouvertures minimal
│   └── piece_kind.rs       — enum PieceKind
│
├── src/engine/             — REPRÉSENTATION DU PLATEAU (générique)
│   ├── engine.rs           — Engine principal: plateau, règles, simulate_action_for_search
│   ├── board/              — Board, Cell, Terrain
│   ├── entity/             — Unit (pièce), Stats
│   ├── action/             — Action, Command
│   ├── event/              — EventQueue, Event
│   └── turn/               — TurnManager
│
├── src/agents/             — AGENTS (UCI + Neural)
│   ├── neural_agent.rs     — NeuralAgent: select_action, finish_bonus, anti_stall_bonus
│   ├── neural_bridge.rs    — communication processus Python (subprocess)
│   ├── neural_config.rs    — configuration chemins Python/modèles
│   ├── neural_context.rs   — contexte par partie
│   ├── neural_fallback.rs  — fallback quand neural indisponible
│   ├── neural_legal.rs     — filtrage légalité côté neural
│   ├── neural_protocol.rs  — protocole JSON ↔ Python
│   ├── neural_selection.rs — sélection du coup neural
│   ├── neural_telemetry.rs — métriques neural
│   ├── retrieval.rs        — index retrieval (k-NN dataset)
│   └── uci_agent.rs        — UciAgent: interface moteur UCI externe
│
├── src/simulation/         — SIMULATION & SELF-PLAY
│   ├── simulation_runner.rs    — SimulationRunner: self-play, random openings, observabilité
│   ├── teacher_uci_runner.rs   — génération données teacher (moteur référence)
│   ├── neural_tournament_runner.rs — tournois Neural vs moteurs
│   ├── cross_test_runner.rs    — tests croisés agents
│   ├── selfplay.rs             — run_one_game()
│   └── tournament_runner.rs    — runner tournoi générique
│
├── src/tool/               — CLI & OUTILS
│   ├── cli.rs              — run_cli(): dispatch toutes commandes (UCI, puzzle-eval, etc.)
│   ├── puzzle_eval.rs      — évaluateur puzzles tactiques (JSONL)
│   ├── conversion_suite.rs — conversion/validation datasets
│   ├── balance_tool.rs     — outil équilibrage datasets
│   ├── ruleset_generator.rs / ruleset_validator.rs — génération/validation rulesets
│   ├── experiment_paths.rs — résolution chemins lab
│   └── puzzle_rng.rs       — RNG puzzles
│
├── src/core/               — TYPES PARTAGÉS
│   ├── action_mask.rs      — ActionMask (vecteur 4096 bits)
│   ├── action_mask_provenance.rs — traçabilité provenance masques
│   ├── action_submission.rs — soumission d'action validée
│   ├── action_id.rs        — identifiant action stable
│   ├── dataset_admission.rs — admission/validation entrées dataset
│   ├── deterministic.rs    — garanties déterminisme
│   ├── episode_trace.rs    — trace complète d'une partie
│   ├── game_result.rs      — résultat de partie
│   ├── human_gate.rs       — HumanGate: barrière autorisation humain
│   ├── ids.rs              — types ID (GameId, EpisodeId)
│   ├── legal_action.rs     — LegalAction: action validée légale
│   ├── observation_encoder.rs — encodage observation → vecteur
│   ├── observation_view.rs — vue observation
│   └── shared_puzzle_candidate.rs — candidat puzzle partagé
│
├── src/ai/                 — ABSTRACTIONS IA
│   ├── policy_guide.rs     — PolicyGuide: interface haut niveau
│   ├── decision_controller.rs — DecisionController: autorité décision
│   ├── search_backend.rs   — SearchBackend: trait abstraction search
│   └── mod.rs
│
├── src/evaluation/         — ÉVALUATION & FIXTURES
│   ├── mod.rs              — fonctions evaluate(), métriques qualité
│   └── fixtures.rs         — positions test fixes
│
├── src/prototype/          — PROTOTYPES RULESETS
│   ├── minimal_ruleset.rs  — ruleset minimal (Chess + Chess960)
│   └── runtime_ruleset.rs  — ruleset runtime paramétrable
│
├── src/tournament/         — TOURNOIS
│   ├── elo.rs              — calcul ELO
│   └── export.rs           — export résultats tournois
│
└── src/env/                — ENVIRONNEMENT RL
    └── tactical_env.rs     — TacticalEnv: interface gym-like
```

---

## 3. Tableau des fichiers source

### Fichiers `src/` triés par taille

| Fichier | Lignes | Rôle | Complexité |
|---|---|---|---|
| `agents/neural_agent.rs` | 3 345 | Agent neural principal | ★★★★★ |
| `chess/search.rs` | 2 715 | Negamax alpha-beta + diagnostics | ★★★★★ |
| `engine/engine.rs` | 2 169 | Moteur plateau + règles légales | ★★★★★ |
| `simulation/simulation_runner.rs` | 2 117 | Self-play + tournament runner | ★★★★ |
| `chess/practical_policy.rs` | 1 986 | Move ordering + heuristics | ★★★★ |
| `tool/puzzle_eval.rs` | 1 213 | Évaluateur puzzles JSONL | ★★★ |
| `simulation/teacher_uci_runner.rs` | 1 013 | Génération données teacher | ★★★ |
| `tool/cli.rs` | 875 | Dispatch CLI toutes commandes | ★★★ |
| `simulation/neural_tournament_runner.rs` | 805 | Tournois neural | ★★★ |
| `chess/opponent_response_mask.rs` | 770 | Masque réponses adverses | ★★★ |
| `chess/move_features.rs` | 698 | Features vectorielles coups | ★★★ |
| `tool/conversion_suite.rs` | 607 | Conversion/validation datasets | ★★ |
| `chess/fen.rs` | 553 | Parsing FEN + Chess960 | ★★★ |
| `chess/eval.rs` | 552 | Évaluation statique | ★★★ |
| `chess/transition_interpretation.rs` | 513 | Interprétation sémantique transitions | ★★★ |
| `chess/puzzle.rs` | 508 | Détection puzzles tactiques | ★★★ |
| `core/human_gate.rs` | 472 | Barrière autorisation humain | ★★ |
| `chess/search_diagnostics_builders.rs` | 416 | Builders diagnostics search | ★★ |
| `evaluation/mod.rs` | 390 | Métriques évaluation | ★★ |
| `agents/retrieval.rs` | 370 | Index k-NN retrieval | ★★ |
| `agents/neural_bridge.rs` | 362 | Bridge subprocess Python | ★★★ |
| `chess/cost_search_observability.rs` | 328 | Observabilité coût search | ★★ |
| `chess/transition_analysis.rs` | 308 | Analyse transitions | ★★ |
| `simulation/selfplay.rs` | 306 | Boucle partie unique | ★★ |
| `prototype/minimal_ruleset.rs` | 284 | Ruleset Chess/Chess960 | ★★ |
| `chess/root_decision.rs` | 280 | Sélection coup racine | ★★ |
| `simulation/cross_test_runner.rs` | 276 | Tests croisés agents | ★★ |
| `agents/neural_config.rs` | 255 | Config chemins Python | ★★ |
| `ai/policy_guide.rs` | 253 | Interface PolicyGuide | ★★ |
| `chess/chess960.rs` | 239 | Générateur Chess960 | ★★ |
| `core/episode_trace.rs` | 230 | Trace épisode complet | ★★ |
| `core/action_mask_provenance.rs` | 207 | Traçabilité masques | ★★ |
| `agents/neural_telemetry.rs` | 205 | Métriques neural | ★ |
| `agents/uci_agent.rs` | 192 | Agent UCI externe | ★★ |
| `tournament/export.rs` | 184 | Export résultats tournois | ★ |
| `agents/neural_legal.rs` | 183 | Filtrage légalité neural | ★★ |
| `chess/decision.rs` | 172 | Arbre décision + trait | ★★ |
| `core/shared_puzzle_candidate.rs` | 168 | Candidat puzzle partagé | ★ |
| `agents/neural_protocol.rs` | 153 | Protocole JSON↔Python | ★★ |
| `agents/neural_fallback.rs` | 147 | Fallback neural | ★ |
| `chess/decision_trace.rs` | 147 | Traçage décisions | ★ |
| `chess/search_mirror_ordering.rs` | 142 | Ordonnancement miroir | ★★ |
| `engine/board/board.rs` | 141 | Plateau 8×8 | ★★ |
| `chess/search_diagnostics_accumulators.rs` | 139 | Accumulateurs diagnostics | ★★ |
| `core/dataset_admission.rs` | 135 | Admission entrées dataset | ★★ |
| `agents/neural_context.rs` | 134 | Contexte neural par partie | ★ |
| `core/action_mask.rs` | 127 | ActionMask 4096 bits | ★★ |
| `core/action_submission.rs` | 125 | Soumission action validée | ★★ |
| `agents/neural_selection.rs` | 119 | Sélection coup neural | ★ |
| `chess/search_diagnostics.rs` | 108 | Structs diagnostics | ★ |

*Fichiers ≤ 100 lignes : 56 fichiers (glue, mods, types simples)*

### Fichiers `tests/` triés par taille

| Fichier test | Lignes | Couverture |
|---|---|---|
| `engine_legal_action_adapter.rs` | 761 | Adaptateur actions légales moteur |
| `deterministic_engine.rs` | 595 | Déterminisme moteur |
| `telemetry_prep.rs` | 447 | Télémétrie neural |
| `action_mask_provenance.rs` | 367 | Provenance masques |
| `search_backend_passive_adapter.rs` | 304 | Backend search passif |
| `observation_boundary_current.rs` | 296 | Frontière observation |
| `action_submission.rs` | 292 | Soumission actions |
| `observation_view.rs` | 277 | Vue observation |
| `decision_controller_passive_adapter.rs` | 277 | Contrôleur décision passif |
| `decision_trace_bridge.rs` | 276 | Pont trace décision |
| `neural_policy_guide_passive_adapter.rs` | 261 | Policy guide neural passif |

---

## 4. Inventaire des fonctions clés par module

### `chess/search.rs` — Recherche alpha-beta
- `pub fn negamax(...)` — cœur alpha-beta avec timeout SEARCH_DEADLINE
- `pub fn root_search(...)` — recherche à la racine avec diagnostics
- `fn best_move_uci(fen) -> String` — helper tests (ligne 1365)

### `chess/eval.rs`
- `pub fn evaluate(engine, color) -> i32` — évaluation statique complète

### `chess/fen.rs`
- `pub fn engine_from_fen(fen: &str) -> Engine` — parsing FEN (150 lignes, Chess960 inclus)
- `pub fn engine_to_fen(engine) -> String` — sérialisation FEN (88 lignes)
- `fn parse_castling_field(...)` — parsing droits de roque (61 lignes)

### `engine/engine.rs` — Moteur plateau
- 17 `pub fn` dont : `legal_actions()`, `apply_move()` (145 l.), `execute()` (68 l.)
- `fn pawn_moves()` (109 l.), `fn king_moves()` (118 l.), `fn knight_moves()` (57 l.)
- `fn simulate_action_for_search_restores_state_for_normal_move()` — test interne (53 l.)

### `agents/neural_agent.rs` — Agent neural
- `pub fn select_action(...)` — sélection coup neural (358 lignes, RISQUE MAJEUR)
- `fn finish_bonus(...)` — bonus fin de partie (114 lignes)
- `fn anti_stall_bonus(...)` — anti-blocage (83 lignes)

### `core/human_gate.rs` — Barrière humain
- 17 `pub fn` : autorisation, journalisation, vérification frontières

### `ai/policy_guide.rs` — Interface IA
- 19 `pub fn`, 7 `pub struct`, 5 `pub enum`, 1 `pub trait`

### `core/action_mask_provenance.rs`
- 22 `pub fn` — traçabilité complète provenance masques (surface API la plus large)

### `core/action_submission.rs`
- 13 `pub fn`, 2 `pub struct`, 2 `pub enum`

### `core/episode_trace.rs`
- 17 `pub fn`, 2 `pub struct`, 3 `pub enum`

### `tool/cli.rs`
- `pub fn run_cli(args)` — dispatcher principal (216 lignes)
- `fn run_observe_fen(...)` (143 l.), `fn run_engine_validation(...)` (82 l.)
- `fn run_search_profile(...)` (66 l.), `fn run_play_fen(...)` (65 l.)

### `simulation/teacher_uci_runner.rs`
- `fn run_batch(...)` — génération batch données (313 lignes)

### `simulation/cross_test_runner.rs`
- `fn run_cross_tests(...)` — tests croisés (204 lignes)

---

## 5. Baseline de tests

```
Exécution : cargo test — 2026-06-01 — durée 142.95s
───────────────────────────────────────────────────
Total  : 225 tests
Passing: 224 ✅
Failing:   1 ❌
Ignored:   0
```

### Test échouant (PRÉEXISTANT)

| Test | Module | Assertion |
|---|---|---|
| `search_root_diagnostics_shape_is_consistent_for_controlled_position` | `chess::search::tests` | `!diagnostics.principal_alternatives.is_empty()` |

> **Note baseline :** La mission documentait 218 total / 211 passing / 7 `chess::search` failing.
> L'état actuel est **225 total / 224 passing / 1 failing**. Les 7 tests `chess::search` mentionnés
> (dont `italian_position_depth4`, `regression_589s`, les 5 `mirror_ordering_*`) sont LENTS (>60s chacun)
> mais passent. Seul `search_root_diagnostics_shape_is_consistent_for_controlled_position` échoue.

### Tests lents chess::search (timeout >60s mais passing)
- `italian_position_depth4`
- `mirror_ordering_default_off_preserves_baseline_root_ordering`
- `mirror_ordering_diagnostics_count_enabled_root_evals`
- `mirror_ordering_diagnostics_stay_zero_when_flag_off`
- `mirror_ordering_does_not_prevent_mate_in_one_selection`
- `mirror_ordering_real_penalty_can_demote_dangerous_candidate_without_pruning`
- `regression_589s`

*Suite chess::search complète: 43 passing / 1 failing / durée totale 262.52s*

---

## 6. Dette technique

### Sévérité CRITIQUE — Fichiers monolithiques (> 2 000 lignes)

| Fichier | Lignes | Risque |
|---|---|---|
| `agents/neural_agent.rs` | 3 345 | `select_action` 358 lignes, complexité cyclomatique extrême |
| `chess/search.rs` | 2 715 | Tests >60s, 1 test failing, couplage fort avec diagnostics |
| `engine/engine.rs` | 2 169 | `apply_move` 145 l., `king_moves` 118 l., `pawn_moves` 109 l. |
| `simulation/simulation_runner.rs` | 2 117 | `run_batch` 313 l., method `run_n_matches_with_agents` jamais utilisée |

### Sévérité HAUTE — Fichiers volumineux (500–2 000 lignes)

| Fichier | Lignes |
|---|---|
| `chess/practical_policy.rs` | 1 986 |
| `tool/puzzle_eval.rs` | 1 213 |
| `simulation/teacher_uci_runner.rs` | 1 013 |
| `tool/cli.rs` | 875 |
| `simulation/neural_tournament_runner.rs` | 805 |
| `chess/opponent_response_mask.rs` | 770 |
| `chess/move_features.rs` | 698 |
| `tool/conversion_suite.rs` | 607 |
| `chess/fen.rs` | 553 |
| `chess/eval.rs` | 552 |
| `chess/transition_interpretation.rs` | 513 |
| `chess/puzzle.rs` | 508 |

### Sévérité MOYENNE — `unwrap()` non justifiés

| Fichier | Occurrences |
|---|---|
| `chess/search.rs` | 8 |
| `simulation/simulation_runner.rs` | 7 |
| `agents/uci_agent.rs` | 6 |
| `simulation/teacher_uci_runner.rs` | 5 |
| `agents/neural_bridge.rs` | 3 |
| `agents/neural_config.rs` | 3 |
| `simulation/neural_tournament_runner.rs` | 2 |
| `agents/neural_agent.rs` | 1 |
| **Total** | **35** |

### Sévérité MOYENNE — `panic!()` explicites (hors tests)

| Fichier | Occurrences | Contexte |
|---|---|---|
| `agents/neural_config.rs` | 3 | Python path manquant (startup) |
| `agents/neural_legal.rs` | 2 | Move action attendue non trouvée |
| `agents/neural_selection.rs` | 2 | Action sélectionnée non trouvée |
| `engine/engine.rs` | 2 | Unité ou coup attendu absent |
| `chess/search.rs` | 1 | Cas impossible (bug guard) |
| `chess/fen.rs` | 1 | Test interne (rook files invalides) |
| `chess/opponent_response_mask.rs` | 1 | Action légale absente |
| **Total** | **12** |

### Sévérité BASSE — Marqueurs dette absents ✅

| Marqueur | Occurrences |
|---|---|
| `todo!()` | 0 |
| `unimplemented!()` | 0 |
| `// TODO` / `// FIXME` / `// HACK` | 0 |

### Fonctions > 50 lignes (36 au total)

Fonctions critiques (> 100 lignes) :

| Fonction | Fichier | Lignes | Risque |
|---|---|---|---|
| `select_action` | `agents/neural_agent.rs` | 358 | Logique décision neural monolithique |
| `run_batch` | `simulation/teacher_uci_runner.rs` | 313 | Génération données, peu testée |
| `run_cross_tests` | `simulation/cross_test_runner.rs` | 204 | Tests croisés complexes |
| `run_puzzle_eval` | `tool/puzzle_eval.rs` | 246 | Pipeline évaluation |
| `evaluate_case` | `tool/puzzle_eval.rs` | 195 | Cas individuel puzzles |
| `run_cli` | `tool/cli.rs` | 216 | Dispatcher CLI principal |
| `run_observe_fen` | `tool/cli.rs` | 143 | Mode observation FEN |
| `engine_from_fen` | `chess/fen.rs` | 150 | Parsing FEN complet |
| `mirror_ordering_real_penalty...` | `chess/search.rs` | 135 | Test de 135 lignes |
| `apply_move` | `engine/engine.rs` | 145 | Application coup (état mutable) |
| `king_moves` | `engine/engine.rs` | 118 | Génération mouvements roi |
| `finish_bonus` | `agents/neural_agent.rs` | 114 | Bonus fin de partie |
| `evaluate` | `evaluation/mod.rs` | 100 | Évaluation statique complète |

### Dead code signalé par le compilateur

- `field terrain` dans `RuntimeRuleset` — jamais lu
- `method run_n_matches_with_agents` dans `SimulationRunner` — jamais appelée

---

## 7. Flux de données principal

### Flux UCI (moteur classique)

```
stdin UCI
  └─► tool/cli.rs : run_cli()
        └─► chess/uci.rs : parse_uci_command()
              └─► chess/search.rs : root_search()
                    ├─► chess/search.rs : negamax()          ← alpha-beta récursif
                    │     ├─► engine/engine.rs : legal_actions()
                    │     ├─► engine/engine.rs : apply_move()
                    │     ├─► chess/eval.rs : evaluate()     ← score i32
                    │     └─► engine/engine.rs : undo_move()
                    └─► chess/search_diagnostics_builders.rs : build_diagnostics()
stdout "bestmove <uci>"
```

### Flux Neural Agent

```
simulation/simulation_runner.rs : run_one_game()
  └─► agents/neural_agent.rs : select_action()
        ├─► agents/neural_bridge.rs : query_python()        ← subprocess JSON
        │     └─► Python ML model (lab/models/)
        ├─► agents/neural_legal.rs : filter_legal()
        ├─► agents/neural_selection.rs : pick_move()
        └─► core/action_submission.rs : submit()
              └─► engine/engine.rs : apply_move()
```

### Flux Puzzle Eval

```
tool/cli.rs : run_cli("puzzle-eval")
  └─► tool/puzzle_eval.rs : run_puzzle_eval()
        ├─► lab/datasets/*.jsonl  ← chargement cases
        ├─► puzzle_eval.rs : evaluate_case()
        │     └─► chess/search.rs : root_search()    ← depth configurée
        └─► puzzle_eval.rs : render_markdown_report()
```

### Flux Self-Play Teacher

```
tool/cli.rs : run_cli("teacher")
  └─► simulation/teacher_uci_runner.rs : run_batch()
        ├─► agents/uci_agent.rs : request_top_moves()   ← moteur UCI externe
        ├─► chess/practical_policy.rs : score_move()
        └─► lab/datasets/*.jsonl  ← écriture échantillons
```

---

## 8. Zones à risque identifiées

### RISQUE 1 — `agents/neural_agent.rs::select_action` (358 lignes)
- Fonction monolithique unique gérant toute la logique de sélection neural
- Mélange : subprocess I/O, parsing JSON, filtrage légal, fallback, télémétrie
- Un seul point de défaillance pour tout le pipeline neural

### RISQUE 2 — `chess/search.rs` — Tests lents & test failing
- 7 tests dépassent 60s chacun → suite complète >262s
- `search_root_diagnostics_shape_is_consistent_for_controlled_position` : assertion `!diagnostics.principal_alternatives.is_empty()` échoue
- 8 `unwrap()` dans du code de production (pas de gestion d'erreur)

### RISQUE 3 — Conflit linker Windows sur tests concurrents
- Erreur observée : `LNK1104: impossible d'ouvrir .exe` lors de `cargo test chess::search` lancé pendant un test en cours
- Cause : Windows verrouille l'exécutable test pendant l'exécution
- Impact : impossible de lancer deux suites de tests en parallèle sur cette machine

### RISQUE 4 — `agents/neural_config.rs` — Panics au démarrage
- 3 `panic!()` si le chemin Python n'est pas résolu
- Pas de graceful degradation : crash immédiat sans fallback

### RISQUE 5 — `simulation/simulation_runner.rs::run_n_matches_with_agents`
- Méthode publique (17 pub fn dans la struct) jamais appelée → dead code
- Risque de divergence avec l'API réelle

### RISQUE 6 — `chess/practical_policy.rs` (1 986 lignes, 42 fn)
- Module central pour le move ordering, peu de tests directs
- Heuristiques complexes sans observabilité

### RISQUE 7 — Dépendance subprocess Python
- `agents/neural_bridge.rs` lance un sous-processus Python sans timeout explicite
- Si Python freeze → partie bloquée indéfiniment

---

## 9. Dépendances externes

```
tactical_chess_pure_lab v0.1.0
├── chrono v0.4.44          — dates/timestamps (sérialisation JSONL)
│   ├── num-traits v0.2.19
│   └── serde v1.0.228 (*)
├── rand v0.8.5             — RNG (Chess960, ouvertures aléatoires, shuffles)
│   ├── rand_chacha v0.3.1
│   └── rand_core v0.6.4
├── serde v1.0.228          — sérialisation/désérialisation
│   └── serde_derive v1.0.228 (proc-macro)
├── serde_json v1.0.149     — JSON (protocole neural, datasets, config)
│   └── zmij v1.0.21
└── uuid v1.23.0            — identifiants GameId, EpisodeId
    └── getrandom v0.4.2
```

**Surface de dépendances : minimale.** Pas de framework async (tokio/async-std), pas d'HTTP, pas de base de données. Toutes les communications externes passent par subprocess Python ou fichiers JSONL.

---

## 10. Datasets lab

| Fichier | Lignes | Rôle |
|---|---|---|
| `teacher_samples.jsonl` | 7 422 | Échantillons teacher principaux |
| `teacher_solid.jsonl` | 6 696 | Positions solides |
| `teacher_tactical.jsonl` | 6 601 | Positions tactiques |
| `teacher_samples_553rows_baseline.jsonl` | 553 | Baseline référence |
| `teacher_finisher.jsonl` | 1 145 | Finales |
| `teacher_positional.jsonl` | 970 | Positions positionnelles |

---

*Fin de cartographie — SYSTEM_MAP.md généré automatiquement le 2026-06-01*
