# ROCKY_COST_SEARCH_OBSERVABILITY_V0

Status: IMPLEMENTED
Surface: roadmap_docs_only
Runtime authority: NONE
Implementation claim: BOUNDED_SIMULATION_OBSERVABILITY_ONLY
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Agent activation: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

Freeze status: CostSearch V0 is frozen in `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/COSTSEARCH_V0_FREEZE_STATUS.md`.

## 1. Purpose

Statut: DOCUMENTED_ONLY

Objectif: definir une observabilite legere du cout Search/Rocky.

Cette specification decrit comment observer ce que Rocky consomme et fait par decision: cout de recherche, cout neural, cout de simulation, source de decision et anomalies utiles.

Ce document est observation only:
- pas une preuve de benchmark;
- pas une donnee d'entrainement;
- pas une preuve de force;
- pas une revendication Elo;
- pas une activation runtime.

Doctrine:
- Rust = runtime truth;
- Python = ML / inference / tooling;
- Search reste autorite finale;
- Neural propose/rerank, ne decide pas seul.

## 2. Reference Signals For Future Verification

Statut: DOCUMENTED_ONLY

| Signal | Statut | Classification |
| --- | --- | --- |
| search nodes | PASSIVE | reference signal for future repo verification; no claim made by this doc |
| quiescence nodes | PASSIVE | reference signal for future repo verification; no claim made by this doc |
| search depth | PASSIVE | reference signal for future repo verification; no claim made by this doc |
| elapsed wall time / Instant nanos | PASSIVE | reference signal for future repo verification; no benchmark claim |
| move simulation nanos | PASSIVE | reference signal for future repo verification; no claim made by this doc |
| undo nanos | PASSIVE | reference signal for future repo verification; no claim made by this doc |
| legal move count | PASSIVE | reference signal for future repo verification; no claim made by this doc |
| root ordering diagnostics | PASSIVE | reference signal for future repo verification; no claim made by this doc |
| mirror ordering diagnostics | PASSIVE | reference signal for future repo verification; no proof claim |
| neural bridge timing | PASSIVE | reference signal for future repo verification; no claim made by this doc |
| neural fallback/rerank counters | PASSIVE | reference signal for future repo verification; no claim made by this doc |
| decision source | PASSIVE | reference signal for future repo verification; no authority claim |
| helper/writer | IMPLEMENTED / TESTED | `src/chess/cost_search_observability.rs` provides an observation-only JSONL writer helper |
| wiring preflight | DONE | safest feasible point identified as `src/simulation/simulation_runner.rs::run_match_from_engine_with_agents` after selected action / `DecisionTrace` exists |
| simulation_runner wiring | IMPLEMENTED / TESTED | opt-in `TCS_COST_SEARCH_OUTPUT_DIR`; default disabled; observes existing root search diagnostics only after selection |
| CLI wiring | PASSIVE / NOT_DONE | `run_search_profile` remains unwired because output shape risk is blocked for V0 |
| search.rs wiring | BLOCKED | no writer or side effect is added inside Search authority |
| tournament wiring | BLOCKED | benchmark/tournament paths remain unwired |
| per-game output | PASSIVE | only opt-in safe-route simulation detail can be emitted; no canonical/latest/lab run output |
| game-1-only report limiter | IMPLEMENTED / TESTED | `allows_cost_search_detail_report(game_id)` allows detailed report writing only for `game_id == 1` |
| safe output path | IMPLEMENTED / TESTED | route guard accepts only `lab/gameplay_observation/sandbox_outputs/rocky_cost_search/<run_id>/` |
| latest.json risk | IMPLEMENTED / TESTED | helper rejects `latest.json` and `latest` aliases |
| lab/runs/RUN_* risk | IMPLEMENTED / TESTED | helper rejects `lab/runs/RUN_*` paths |

Decalage code/docs maitres:
- Les signaux Search/Neural/Mirror sont des references passives a verifier dans une tache separee.
- Le contrat de sortie safe et la limitation detaillee game_id=1 sont implementes et testes dans un helper Rust.
- Le helper est connecte uniquement au chemin simulation opt-in apres selection du coup.
- La CLI, Search, selfplay et les tournois restent non connectes.
- Toute creation `latest.json` reste bloquee.
- Toute creation `lab/runs/RUN_*` reste bloquee.
- Gameplay authority changed: NO.
- Search authority changed: NO.
- Neural authority changed: NO.

## 3. A/B/C Report Model

Statut: DOCUMENTED_ONLY

### A - All Games Summary

Statut: DOCUMENTED_ONLY

Un enregistrement minimal par partie. Aucun trace per-move persiste pour toutes les parties.

Champs requis:

| Champ | Type | Unite | Description |
| --- | --- | --- | --- |
| schema_version | string | n/a | version stable du schema |
| report_mode | string | n/a | valeur requise: `observation_only` |
| game_id | integer | n/a | identifiant partie |
| result | string | n/a | resultat observe |
| moves | integer | plies ou coups selon convention runtime documentee | longueur partie |
| total_ms | number | ms | temps total observe |
| avg_move_ms | number | ms | moyenne par coup |
| max_move_ms | number | ms | maximum par coup |
| total_nodes | integer | nodes | total Search |
| max_depth | integer | plies/depth runtime | profondeur max observee |
| neural_calls | integer | appels | nombre d'appels neural |
| fallback_count | integer | occurrences | nombre de fallbacks |
| anomaly_count | integer | occurrences | anomalies detectees |

### B - Game 1 Detailed Report

Statut: DOCUMENTED_ONLY

Rapport lisible per-move. Active par defaut uniquement pour `game_id=1`.

Champs requis:

| Champ | Type | Unite | Description |
| --- | --- | --- | --- |
| schema_version | string | n/a | version stable du schema |
| report_mode | string | n/a | valeur requise: `observation_only` |
| game_id | integer | n/a | valeur par defaut detaillee: `1` |
| ply | integer | ply | demi-coup |
| side | string | n/a | camp au trait |
| legal_moves | integer | coups legaux | taille espace action legal |
| selected_move | string | n/a | coup joue, observation seulement |
| decision_source | string | n/a | source decisionnelle observee |
| search_depth | integer | depth runtime | profondeur Search |
| search_nodes | integer | nodes | noeuds Search |
| quiescence_nodes | integer | nodes | noeuds quiescence |
| elapsed_ms | number | ms | temps total decision |
| neural_ms | number | ms | temps neural |
| fallback_reason | string/null | n/a | raison fallback si presente |
| mirror_evals | integer | evaluations | cout diagnostic miroir |
| notes | string | n/a | note courte, pas de log brut |

### C - Anomaly Detail

Statut: DOCUMENTED_ONLY

Rapport detaille declenche uniquement par seuil. Nombre maximal par run obligatoire.

Exemples de declencheurs:
- `move_time_ms` au-dessus du seuil;
- `nodes` au-dessus du seuil;
- fallback repete;
- timeout neural;
- profondeur anormalement basse;
- cout mirror ordering eleve;
- desaccord Search/Neural;
- anomalie conversion/drawish.

Champs minimaux:

| Champ | Type | Unite | Description |
| --- | --- | --- | --- |
| schema_version | string | n/a | version stable du schema |
| report_mode | string | n/a | valeur requise: `observation_only` |
| run_id | string | n/a | correlation run |
| game_id | integer | n/a | partie concernee |
| ply | integer/null | ply | demi-coup si applicable |
| anomaly_type | string | n/a | type stable |
| threshold | number/string | unite du seuil | seuil declencheur |
| observed_value | number/string | unite du signal | valeur observee |
| bounded_context | object | n/a | extrait minimal utile |
| notes | string | n/a | hypothese non probante |

## 4. Anti-usine-a-gaz Limits

Statut: DOCUMENTED_ONLY

Limites obligatoires:
- aucun full trace pour chaque partie;
- maximum de rapports detailles par run;
- detail `game_id=1` active par defaut;
- plafond d'anomalies active par defaut;
- `schema_version` requis;
- unites requises pour les champs de cout;
- `report_mode = observation_only` requis;
- pas de spam de logs bruts;
- aucun benchmark claim;
- aucune promotion dataset;
- aucune inference de label truth depuis le coup selectionne.

Parametres V0 proposes:
- `max_game_detail_reports_per_run = 1`;
- `default_detailed_game_id = 1`;
- `max_anomaly_reports_per_run = 25`;
- `full_trace_all_games = false`.

## 5. Safe Output Contract

Statut: IMPLEMENTED / TESTED

Chemin futur autorise:

```text
lab/gameplay_observation/sandbox_outputs/rocky_cost_search/<run_id>/
```

Chemins interdits:

```text
lab/reports/*latest*
latest.json
lab/runs/RUN_*
datasets/
models/
```

Regles:
- le writer helper implemente doit refuser tout chemin interdit;
- aucune sortie ne doit ecraser un rapport canonique;
- aucun alias `latest` ne doit etre cree;
- aucune ecriture dataset/model ne doit exister dans ce flux.
- aucune generation d'artefact runtime n'est autorisee par cette tache de synchronisation documentaire.

Etat V0 implemente:
- `CostSearchReportWriter` existe comme helper Rust observation-only;
- `validate_cost_search_output_dir` garde la route safe;
- `latest.json` et l'alias `latest` sont rejetes;
- `lab/runs/RUN_*` est rejete;
- les details sont bornes par defaut a `game_id=1`;
- les autres parties restent summary-only pour le detail writer;
- simulation_runner wiring: IMPLEMENTED / TESTED;
- gameplay authority changed: NO;
- search authority changed: NO;
- neural authority changed: NO;
- CLI wiring: PASSIVE / NOT_DONE.

## 6. Future AI Loop

Statut: DOCUMENTED_ONLY

Flux autorise futur:

```text
Rocky run
-> A summaries
-> B game 1 detail
-> C anomaly detail
-> AI reads reports
-> AI proposes hypotheses
-> human validates
-> Codex patch bounded
-> tests
```

Interdictions:
- pas d'entrainement autonome;
- pas de promotion modele;
- pas de promotion de label dataset;
- pas de DecisionController active par ce flux;
- HumanGate obligatoire avant toute promotion.

## 7. Relationship With Auto-Puzzle

Statut: DOCUMENTED_ONLY

Separation:
- Cost Search observe le comportement decision/cout.
- Error-to-Puzzle convertit des echecs reels selectionnes en puzzles rejouables.
- Le rapport de cout peut aider a prioriser les erreurs candidates.
- Le rapport de cout n'est pas un puzzle.
- Le rapport de cout n'est pas un dataset.
- Le rapport de cout n'est pas un label d'entrainement.

## 8. Future Implementation Lanes

Statut: DOCUMENTED_ONLY

Ne pas implementer maintenant.

Lanes futures possibles:

| Lane | Statut V0 | Description |
| --- | --- | --- |
| docs-only spec | DOCUMENTED_ONLY | present document |
| tests-only schema fixture | DOCUMENTED_ONLY | fixture JSON minimale future |
| output safety tests | IMPLEMENTED / TESTED | tests des chemins interdits |
| small command/env flag default OFF | IMPLEMENTED / TESTED | `TCS_COST_SEARCH_OUTPUT_DIR` active uniquement le writer simulation apres validation helper |
| safe report writer | IMPLEMENTED / TESTED | ecriture bornee dans chemin autorise |
| game-1-only detail | IMPLEMENTED / TESTED | detail par defaut uniquement game_id=1 |
| anomaly detector | DOCUMENTED_ONLY | seuils bornes, cap par run |
| AI analysis prompt later | DOCUMENTED_ONLY | lecture rapport et hypotheses uniquement |

## 9. Guardrails

Statut: DOCUMENTED_ONLY

Guardrails:
- le rapport est observation only;
- le coup selectionne n'est pas une verite de label;
- le coup Search n'est pas automatiquement une verite de label;
- le coup Neural n'est pas une autorite;
- les logs/reports/latest ne sont pas une preuve;
- simulation_runner wiring est IMPLEMENTED / TESTED et reste opt-in;
- gameplay authority changed: NO;
- search authority changed: NO;
- neural authority changed: NO;
- CLI wiring reste PASSIVE / NOT_DONE;
- search.rs wiring reste BLOCKED;
- tournament wiring reste BLOCKED;
- runtime artifact generation reste BLOCKED dans cette tache;
- training reste BLOCKED;
- benchmark reste BLOCKED;
- dataset generation reste BLOCKED;
- agent activation reste BLOCKED;
- dataset promotion reste BLOCKED;
- Chess960 activation reste BLOCKED sans demande explicite;
- DecisionController activation reste BLOCKED sans demande explicite;
- HumanGate est requis avant toute promotion;
- ActionId, LegalAction, ActionMask, provenance et HumanGate restent requis pour des labels dataset.

## 10. Final Status Block

```text
software_verdict: ROCKY_COST_SEARCH_OBSERVABILITY_SIMULATION_WIRING_IMPLEMENTED_CLI_SEARCH_TOURNAMENT_BLOCKED
evidence_verdict: SAFE_ROUTE_LATEST_JSON_LAB_RUNS_GAME_ID_1_LIMITER_AND_SIMULATION_WIRING_TESTED
claim_verdict: NO_CLAIM_ALLOWED
```
