# Current State

Date baseline: 2026-05-07 — last sprint update: 2026-05-30

## Sprint 2026-05-30

### Fixes committés

**c0ebf62 — fix(simulation): route neural agent through NeuralAgent::select_action**
- Neural infère réellement depuis ce commit. Avant : search jouait à la place de neural.
- selection_calls=20, successful_inferences=16, status=clean (smoke vérifié)
- Impact : tous les benchmarks précédents mesuraient heuristic_vs_heuristic

**T2 — feat(evaluation): EvalRunResult + RunIdentity + baseline snapshot**
- `src/evaluation/mod.rs` créé
- `lab/reports/eval_smoke_baseline.json` : première baseline traçable
- git=c0ebf62, draws=2, draw_rate=1.0

**T3/T4 — feat(evaluation): RegressionGuard PASS/FAIL/INCONCLUSIVE**
- GuardThresholds : min_games=10, draw_rate +20%, win_rate -15%, elo -30pts
- `lab/reports/guard_test_output.json`
- 6 tests de caractérisation, tous verts

**T5/T6 — feat(evaluation): fixtures CI + learning_progress v2**
- `src/evaluation/fixtures.rs` : 4 fixtures déterministes
- `lab/reports/learning_progress.json` : schema v2, generated_at 2026-05-30
- 13 tests evaluation au total, tous verts

**Charter A — fix(eval): reward calibration**
- repetition_signal : 1/2 → 120/60
- is_shuffle_move : suppression condition matériel (gate < 12 coups)
- mobilité active toute la partie (x2 ouverture, x4 finale)
- is_winning_endgame : ≤16 pièces / +100cp (était ≤10 / +180)

### Résultats mesurés (post-session)

- 160 parties neural vs heuristic : 0 victoires, 160 draws (draw_rate = 1.0)
- 300 parties heuristic vs heuristic : 100% draws → problème dans le search, pas neural
- ELO leaderboard (880 parties) : teacher_uci=1424 / heuristic=1200 / hybrid=1200 / neural=975
- Charter A n'a pas réduit le taux de nulles → le problème est structurel (symétrie initiale)

### Audits produits (lab/reports/)

- `audit_rocky.py` — script d'audit read-only repo
- `audit_reward_system.md` — analyse reward/incentives
- `audit_rocky_vs_alphazero.md` — comparaison vs AlphaZero/Leela
- `audit_reward_calibration.md` — calibration chiffrée vs Stockfish/Crafty

### État du dataset (2026-05-30)

- `lab/datasets/teacher_samples.jsonl` : 553 échantillons, 3 parties, 0% neural dans trainer_mix
- `result` toujours "1/2-1/2" (lab_hard_turn_cap) → value head entraînée sur draws uniquement
- Champs `aaa_*` tous null (Rocky non branché pendant génération)
- Dataset à reconstruire avec neural dans trainer_mix + vraies fins de partie

### Découvertes architecturales

- `src/simulation/selfplay.rs` = moteur prototype uniquement, pas chess self-play
- `src/simulation/neural_tournament_runner.rs` = système d'éval existant (mature)
- `src/tournament/elo.rs` = EloTable complète mais jamais instanciée (fixé dans T2)
- Value head calculée à chaque inférence mais jamais utilisée pour sélection
- 15 input channels sans historique → neural ne voit pas les répétitions

### Prochaine session — curriculum Lichess

- Source : https://database.lichess.org/#puzzles (3M puzzles CC0)
- Niveau 1 : mateIn1, hangingPiece (ELO < 1200)
- Niveau 2 : fork, pin, skewer, mateIn2 (ELO 1200–1800)
- Niveau 3 : anastasiasMate, promotion, rookEndgame (ELO > 1800)
- Infrastructure existante : `puzzle_eval.rs`, `PuzzleCase`, `engine_from_fen`
- À construire : importeur CSV Lichess → PuzzleCase + scoring par niveau

---

## Evidence-plane status

Date update: 2026-05-07

The repo has a dedicated evidence-plane / automation track and is now synced through PR #138.

Current required PR truth verified via `gh pr view`:

- PR #129 merged: passive `SearchBackend` boundary.
- PR #132 merged: passive `PolicyGuide` boundary.
- PR #133 merged: passive `DecisionController` boundary.
- PR #134 merged: `auto_merge_guard` self-modification hardening.
- PR #135 merged: `auto_merge_guard` verdict/check policy hardening.
- PR #136 closed: stale duplicate.
- PR #137 merged: passive `TacticalEnv` boundary.
- PR #138 merged: auto-merge forensic evidence comment support.

Current branch-level interpretation:

- Latest `main` includes the automation consolidation state through PR #138.
- Open PR list verification currently reports no open PRs.
- `auto_merge_guard` now supports the forensic comment marker `AUTO_MERGED_BY_GUARD`.
- Any skipped check now blocks guard auto-merge.
- Missing/invalid PR verdicts now block guard auto-merge.
- Protected control-plane scripts must stay on manual review/merge paths.

Known local tracked noise:

- `lab/reports/latest_benchmark_summary.json`
- Keep it unchanged when it appears as local tracked noise.
- Do not stage it as part of docs/control-plane updates.

Current evidence-plane doctrine:

- CI pass is mechanical only.
- Browser/GPT critique is non-canonical unless captured as an explicit repo artifact.
- PR-02 through PR-10 remain the control foundation.
- PR #134, #135, and #138 harden merge policy and forensic traceability.
- The three verdicts remain `software_verdict`, `evidence_verdict`, and `claim_verdict`.
- Default claim posture remains `claim_verdict: NO_CLAIM_ALLOWED`.
- No automation/control-plane PR authorizes scientific, performance, Elo, strength, or promotion claims.

## Local repo split and control-plane state

Date update: 2026-05-19

Live branch, HEAD, and ahead/behind truth must be checked with Git before relying on this file. Historical local-stack SHA and ahead-count examples were removed from this active state page because they became stale.

Current references:

- local HEAD: verify live with `git rev-parse HEAD`
- branch/ahead state: verify live with `git status --short --branch`
- tracked/staged/untracked changes: verify live before edits
- GitHub/shared state: verify live before publication or claim language
- local archive: `LOCAL_ARCHIVE/AM_SYNC_3L_22_COMMITS_NO_CI/`
- local history note: `MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md`

Publication status:

- PR creation: BLOCKED by money/CI constraints
- push: BLOCKED by money/CI constraints
- CI trigger: BLOCKED by money/CI constraints
- local archive: PASSIVE local archive only

## Studio Loop V1 Freeze

Status date: 2026-05-19.

Current surface status:

| Surface | Status | Current boundary |
| --- | --- | --- |
| active_runtime_code | IMPLEMENTED | Runtime code is Git-backed and unchanged by this freeze. |
| tests | TESTED | Narrow tooling/control-plane and prior targeted validations only. |
| tools_scripts | IMPLEMENTED | Studio loop dry-run and in-memory tooling is Git-backed. |
| artifacts_runtime_outputs | TESTED | `.studio_state/current_state.json` write boundary and forbidden-output boundaries were tested. |
| canonical_docs | DOCUMENTED_ONLY | Master docs record the freeze; they do not create evidence or activation authority. |
| roadmap_docs_only | DOCUMENTED_ONLY | Future options remain planning-only. |
| inference | PASSIVE | Neural remains proposal/rerank only; Search remains final authority. |
| schemas | PASSIVE | Schema validation is shape checking, not authority. |
| runtime_activation | BLOCKED | No Studio runtime, Codex execution lane, DecisionController activation, or SearchBackend activation is enabled by this freeze. |
| dataset/training/benchmark/model | BLOCKED | No dataset generation/reset, training, benchmark proof, checkpoint creation, or model promotion. |

Git-backed evidence:

- full loop in-memory harness exists in repo
- current_state -> mission -> inbox -> HumanGate -> plan dry-run tooling exists in repo
- control-plane docs, schemas, fixtures, and dry-run scripts are tracked
- docs stabilization commit: `da0a86d0c922f79fa4fbbd955058b5a51df1fee9`

Local/passive evidence:

- `.studio_state/current_state.json` is ignored local operational state.
- Current hash and content must be checked live before relying on it.
- Current local state still lists `tools_scripts`, `artifacts_runtime_outputs`, `canonical_docs`, `roadmap_docs_only`, and `inference` as `UNKNOWN`; this is a known local-state/documentation gap and does not override the canonical docs freeze.

Explicit non-claims:

- no runtime activation
- no benchmark proof
- no training proof
- no dataset generation
- no model promotion
- no public claim

Next phase options:

- freeze/stabilize
- first HumanGate-approved Codex execution on docs/tooling only
- cost/observability plane

Claim posture: `NO_CLAIM_ALLOWED`.

`no_global_ready_verdict: true`.

Local AM stack includes:

- ActionMask authority docs
- minimal Rust ActionMask skeleton
- chess legal-action adapter
- ActionId / LegalAction constants
- ActionMask provenance snapshot
- HumanGate contract and minimal core
- opponent response mask helper
- MirrorRiskSummary
- bounded root mirror ordering
- mirror/root ordering diagnostics
- search mirror ordering extraction
- root ordering extraction
- search diagnostics structs extraction
- search diagnostics accumulators extraction
- search diagnostics builders/emission extraction through AM-SEARCH-12
- AM helper stack fail-closed hardening through AM-CORE-6
- Python dataset admission fail-closed gate through AM-DATA-5
- standard Python move_vocab helper parity evidence through AM-DATA-8
- representative Rust-generated legal-action sample parity evidence through AM-DATA-10

AM helper stack frozen locally:

- AM-DATA-10 completed locally.
- Historical HEAD and ahead-count examples are local-history only and are not active truth.
- GitHub/shared publication state must be rechecked live before any publication or claim.
- GitHub main AM/Data availability is UNKNOWN until live verification.
- CI/PR/push are BLOCKED by money/CI constraints.

Local AM search decomposition status:

- search decomposition: IMPLEMENTED_AND_TARGET_TESTED locally through AM-SEARCH-12
- new module: `src/chess/search_diagnostics_builders.rs`
- moved responsibilities: `build_root_mate_diagnostics`, `build_root_diagnostics`, `maybe_emit_runtime_diagnostics`, `search_runtime_diagnostics_enabled`, and related diagnostics-local builders/helpers
- `src/chess/search.rs` retains public search entrypoints, root loop, negamax, quiescence, transposition table integration, killer/history heuristics, budget/depth/node guards, ordering calls, and result assembly
- diagnostics builders split: IMPLEMENTED / TESTED locally
- deeper search splits: DEFERRED unless explicitly reopened
- negamax/quiescence/TT/killer-history splits: DEFERRED

Surface status:

| Surface | Status |
| --- | --- |
| active runtime code | IMPLEMENTED locally; shared/GitHub state requires live verification |
| tests | TESTED only by previously reported targeted cargo commands |
| artifacts/runtime outputs | PASSIVE local archive only |
| canonical docs | DOCUMENTED_ONLY where applicable |
| roadmap/docs-only | DOCUMENTED_ONLY |
| inference | PASSIVE |
| ActionId | IMPLEMENTED / TESTED locally for standard runtime identity; dataset labels BLOCKED |
| LegalAction | IMPLEMENTED / TESTED locally; minimal `action_id` + `action_key`; no explicit actor/target/provenance fields |
| Chess LegalAction adapter | IMPLEMENTED / TESTED locally |
| ActionMask | IMPLEMENTED / TESTED Rust helper; not search authority |
| ActionMaskProvenance | IMPLEMENTED / TESTED locally; dataset sufficiency BLOCKED |
| HumanGate metadata link | IMPLEMENTED / TESTED locally |
| HumanGate promotion authority | BLOCKED |
| Python `legal_mask` authority | PASSIVE helper / not authority |
| Python legal_mask authority: PASSIVE | helper only / not authority |
| Python `validate_am_dataset_admission(row)` | IMPLEMENTED / TESTED / fail-closed |
| AdmissionResult | IMPLEMENTED / TESTED |
| DatasetAdmissionError | IMPLEMENTED |
| TeacherDataset admission gate | IMPLEMENTED_AND_TESTED |
| `train.py` | PASSIVE unchanged; protected by TeacherDataset boundary before checkpoint writes |
| Python move_vocab standard helper | IMPLEMENTED / TESTED |
| Standard move-vocab parity | TESTED for current Python helper policy |
| Rust-generated legal-action sample parity | IMPLEMENTED_AND_TESTED |
| Rust/Python standard move compatibility | TESTED_SAMPLE_ONLY |
| Policy index compatibility | TESTED_SAMPLE_ONLY |
| sample position count | 5 |
| Rust-generated key count | 16 |
| promotions covered | TESTED |
| castling covered | TESTED |
| captures covered | TESTED |
| debug fallback unencodable | TESTED fail-closed |
| all sampled keys policy-encodable | YES |
| all sampled indices roundtrip | YES |
| legal_action_version | legal_action_v0 |
| action_mask_version | action_mask_v0_skeleton |
| move_vocab size | 4164 |
| move_vocab fingerprint | 690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c |
| coordinate entries | 3988 |
| promotion entries | 176 |
| classical castling keys | TESTED |
| debug/malformed keys | TESTED fail-closed |
| full Python vocab roundtrip | TESTED |
| duplicate indices | TESTED, none found |
| Search boundary | IMPLEMENTED; search remains final authority |
| Search decomposition | IMPLEMENTED_AND_TARGET_TESTED locally / frozen |
| diagnostics builders split | IMPLEMENTED / TESTED locally |
| GitHub main local AM stack | UNKNOWN until live verification |
| CI/PR/push | BLOCKED by money/CI constraints |
| Dataset label readiness | BLOCKED |
| Training readiness | BLOCKED |
| dataset/training | BLOCKED |
| Chess960 runtime | BLOCKED |
| Chess960 labels | BLOCKED |
| Chess960 dataset/runtime | BLOCKED |
| ActionMask dataset authority | BLOCKED |
| Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED | UNKNOWN/BLOCKED |
| Rust/Python ActionMask authority: BLOCKED/UNKNOWN | BLOCKED/UNKNOWN |
| Dataset admission | fail-closed / BLOCKED |
| Non-UCI/debug/unencodable actions | fail-closed / TESTED |
| Neural authority | PASSIVE / proposal-rerank only |
| claim verdict | NO_CLAIM_ALLOWED |

Warnings:

- Do not treat the local AM stack as shared canonical repo truth until push, PR, and merge are authorized.
- Local AM helper stack freeze does not mean shared GitHub main truth.
- This docs update does not promote the local stack to shared GitHub main truth.
- This docs update does not promote local state to GitHub main truth.
- Local AM helper implementation does not equal shared GitHub main truth.
- Local AM helper implementation does not authorize dataset labels, training, Chess960 runtime, neural authority, or readiness claims.
- AM-DATA-8 does not authorize dataset labels, training, Chess960, neural authority, or product/scientific/strength/readiness claims.
- AM-DATA-10 does not authorize dataset labels, training, Chess960, neural authority, or product/scientific/strength/readiness claims.
- Rust-generated legal-action sample parity is representative sample only.
- Rust-generated legal-action sample parity is not exhaustive Rust generator proof.
- Rust-generated legal-action sample parity is Not ActionMask authority.
- Rust/Python standard move compatibility is TESTED_SAMPLE_ONLY.
- Policy index compatibility is TESTED_SAMPLE_ONLY.
- Local docs are not GitHub main truth until push/PR/merge is authorized.
- Standard move-vocab parity is standard-UCI helper compatibility only.
- Standard move-vocab parity is not a legality oracle.
- Standard move-vocab parity is not exhaustive Rust generator proof.
- The Python gate blocks unsafe data; it does not make training ready.
- Local test reports are local evidence only.
- Local archive/reports/logs remain passive evidence.
- Do not treat local archive, reports, logs, or benchmark summaries as implementation proof.
- Benchmark/log/report artifacts remain passive evidence only.
- Repo inspection remains required before future claims.
- No dataset label promotion, training, Chess960 runtime, neural authority, product/scientific/strength/readiness claim is authorized.
- Dataset/training: BLOCKED.
- No admissible dataset row path exists yet.
- No training run is allowed now.
- No dataset generation/reset is allowed now.
- Future dataset admission requires explicit HumanDecision/HumanGate promotion path and Rust/Python compatibility contract.
- Future Rust/Python ActionMask authority requires a separate versioned compatibility contract and broader coverage.
- Future admissible rows must include ActionId, LegalAction, ActionMask/provenance, HumanGate state, move_vocab_fingerprint, ruleset, variant, and contamination status.
- Future Chess960 work requires explicit FEN/castling/action identity contracts.
- Rust-generated sample parity is frozen unless explicit HumanDecision reopens it.
- AM-DATA standard vocab parity is frozen unless explicit HumanDecision reopens it.
- AM-DATA runtime wiring is frozen after AM-DATA-8 unless explicitly reopened.
- Next safe actions are read-only audit for exhaustive Rust legal-action coverage feasibility, tests-only expansion if explicitly chosen, docs sync, or local archive if requested.
- Runtime patches for dataset admission allow-path, training, Chess960, or ActionMask authority remain BLOCKED unless explicitly authorized.

## Engine status

- Active runtime root: `src/`
- Main chess runtime files:
  - `src/engine/engine.rs`
  - `src/chess/search.rs`
  - `src/chess/decision.rs`
  - `src/tool/cli.rs`
- Runtime now behaves as full chess, not a prototype.
- Search uses root cloning and simulate/undo deeper in the tree.
- `src/chess/search.rs` core features (stable as of 2026-05-30):
  - iterative deepening with time-budget guard (`TCS_MOVE_TIME_MS`)
  - aspiration windows (including mate-aware widening)
  - transposition table with stored best move
  - killer moves and history heuristic (`thread_local` tables, no Mutex on hot path)
  - bounded quiescence search (`TCS_Q_DEPTH`, default 3)
  - light LMR
  - search instrumentation for nodes / TT / undo profile
  - stalemate and threefold repetition return `draw_score()` — not `evaluate()`
  - negamax score convention unified on to_move perspective throughout the tree
  - Zobrist-hash position key for TT (standard per-(piece, square, side) vectors)
- Root selection: pure argmax on alpha-beta score. The S-7 practical-policy pipeline
  (`select_root_move`, fork detection, worst-case sampling) was deleted in 90fe323.
  Root decision is now simple and transparent.
- Important nuance: the root still begins from `engine.clone()` and some helpers still
  simulate moves; the structural performance ceiling is reduced, not gone.
- Tactical layer is integrated at root and rerank:
  - SEE-lite, hanging detection, mate urgency, trade sanity, reply scan
- Engine-side performance passes (sprint f758ff4):
  - `current_repetition_key` is now a Zobrist u64 (replaces FEN string, no halfmove_clock)
  - `Unit::template_name` is `Arc<str>` (zero allocation for Engine clones)
  - Legal action sort key uses integer tuples (no String allocation)
- FEN round-trip is faithful for all fields: castling rights, en-passant, halfmove clock
  are correctly maintained and serialized. Repetition key is Zobrist (excludes halfmove_clock),
  which is standard-compliant.

## AI / neural status

- Neural bridge exists in `src/agents/neural_agent.rs`.
- Bridge now uses a stable payload format: `fen|move1|move2|...`.
- Bridge includes:
  - timeout detection
  - retry
  - fallback move selection
  - graceful shutdown
- Neural runtime is operational, but strength remains low.

## Dataset status

- Active dataset pointer: `lab/ACTIVE_DATASET.txt`
- Active dataset pointer currently resolves to `lab/dataset`
- Adaptive dataset system now exists:
  - phase split (opening / midgame / endgame)
  - positive / negative samples
  - mirror samples
  - reverse dataset under `lab/reverse_dataset/`
  - weakness log (`weakness_log.jsonl`)
  - priority training queue
- Dataset is no longer static; it is now driven by logged weaknesses.
- The active dataset can now be an adaptive dataset root directory, not only a single JSONL file.
- In current code, `ml/dataset_loader.py` accepts either a single JSONL or a dataset directory and can produce `adaptive_mix`.
- Dataset audit has become termination-aware:
  - `termination_reason`
  - `termination_counts`
  - `hard_cap_draw_rows`
  - `hard_cap_draw_ratio`
  - termination-aware `KEEP` / `WEAK_KEEP` / `REJECT` triage

## Benchmark truth

- Current benchmark artifact is `lab/reports/latest_benchmark_summary.json`.
- Current result is a smoke benchmark timeout dated `2026-05-05T14:57:03+00:00`.
- Reported fields in that artifact:
  - `benchmark_status=timeout`
  - `benchmark_mode=run`
  - `run_classification=exploration_only`
  - `promotion_eligible=false`
  - `games=2`
  - `timeout_seconds=180`
  - partial output found under `lab/smoke_benchmark/tournaments/`
  - error: `Benchmark timed out after 180s: cargo run -- benchmark --smoke`
- This timeout artifact overrides older doc wording that treated the latest smoke benchmark as clean success.
- Smoke benchmark remains a health surface, not a strength metric.
- Conversion suite still shows positive signal, but is not an Elo metric.
- Latest committed conversion suite artifact is `lab/reports/conversion_suite_v1_latest.json`:
  - total `5`
  - improved `5`
  - stagnated `0`
  - regressed `0`
- This remains a targeted conversion metric, not an Elo claim.

## Known ceilings

- Conversion remains weak in practical play.
- Neural decisions are still low quality compared to classical engines.
- Adaptive loop exists but has not yet demonstrated measurable improvement across runs.
- Runtime stability is improved but still not fully hardened under long runs.
- AAA plumbing is operational, but strength gain from AAA is not supported.
- Dataset router semantics may still mismatch loader semantics when the active dataset is a directory/adaptive root.
- Python `validate_am_dataset_admission(row)` and TeacherDataset fail-closed admission exist locally, but no admissible AM dataset row path exists yet and training readiness remains BLOCKED.
- The next true engine-performance ceiling is not another search-only patch; it is likely `engine.rs` move application architecture (`make_move` / `unmake_move` or equivalent), after benchmark evidence justifies the risk.

## Current interpretation

The project has moved from a static chess engine to an adaptive system with learning capabilities.

However:

- learning loop effectiveness is not yet demonstrated
- strength gains are not yet demonstrated
- system still needs stabilization and validation
- conversion suite should not be used as Elo evidence
- smoke benchmark health should not be read as strength evidence
- PR-10 dry-run runtime packets should not be read as runtime evidence

The next phase is not broad feature building. It is one bounded runtime-under-gates theme at a time.

## Current next steps

1. Keep documentation and control-plane truth synced through PR #138.
2. Keep passive-boundary automation lanes constrained by `auto_merge_guard` policy gates.
3. Resume bounded runtime work with passive `InitialStateFactory` boundary (960-readiness prep) under human review.

## Evidence Gaps

- adaptive loop not demonstrated by repeated improvement yet
- AAA not supported as strength gain yet
- conversion suite correlation with Elo not established
- smoke benchmark health != strength
- PR-08/09/10 controls are governance infrastructure, not evidence of runtime behavior
