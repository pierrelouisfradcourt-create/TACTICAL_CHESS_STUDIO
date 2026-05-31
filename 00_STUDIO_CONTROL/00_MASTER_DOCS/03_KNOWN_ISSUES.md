# Known Issues

Status: canonical active issue list
Last refreshed: 2026-05-30
Merged source: `MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md`
Rule: this file is an engineering risk register, not proof of strength, Elo, promotion, or scientific progress.

Validation note:
- The 2026-05-06 refresh used targeted source inspection and targeted tests only.
- The 2026-05-11 refresh synchronized documentation against PP9-PP19 git history only.
- No benchmark, training run, dataset reset, holdout, `lab/runs/RUN_*`, or `latest.json` was created.
- Performance or gameplay artifacts must not be used as proof.

## Recent PP9-PP19 Consolidation Note

PP9-PP19 / PR #237-#247 are merged on `main` and reduce some architecture ambiguity, but they do not close the active issue list.

Current interpretation:

- PP11 and PP13 add characterization tests only.
- PP12 adds a passive `LegalAction` / `ActionId` adapter only.
- PP14 adds a passive `SearchBackend` adapter only.
- PP16 adds a passive `DecisionController` adapter only.
- PP17 and PP18 keep neural split and `NeuralPolicyValue` at docs-only / paper-only status.
- PP19 fuses the roadmap as docs-only alignment only.
- Search remains final tactical authority.
- Neural never decides alone.
- `HumanDecision` remains required before activation or claims.

## Local AM Stack Publication Gap

Status: ACTIVE / BLOCKED

Current evidence:
- PACK 9D is merged on GitHub.
- Active branch, HEAD, and ahead/behind state must be verified live with Git before any claim.
- Historical local-stack SHA and ahead-count examples are intentionally omitted from this active issue list because they became stale.
- GitHub/shared AM-stack availability is UNKNOWN until live verification.
- local archive exists at `LOCAL_ARCHIVE/AM_SYNC_3L_22_COMMITS_NO_CI/` as PASSIVE local archive only.
- CI, PR, and push are BLOCKED by money/CI constraints.

AM stack contents:
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
- Historical HEAD and ahead-count examples are local-history only.
- GitHub/shared AM/Data state is UNKNOWN until live verification.
- CI/PR/push are BLOCKED by money/CI constraints.

Status:
- active runtime code: IMPLEMENTED locally / NOT_FOUND on GitHub main
- tests: TESTED only by previously reported targeted cargo commands
- artifacts/runtime outputs: PASSIVE local archive only
- canonical docs: DOCUMENTED_ONLY where applicable
- roadmap/docs-only: DOCUMENTED_ONLY
- inference: PASSIVE
- ActionId: IMPLEMENTED / TESTED locally for standard runtime identity; dataset labels BLOCKED
- LegalAction: IMPLEMENTED / TESTED locally; minimal `action_id` + `action_key`; no explicit actor/target/provenance fields
- Chess LegalAction adapter: IMPLEMENTED / TESTED locally
- ActionMask: IMPLEMENTED / TESTED Rust helper; not search authority; dataset authority BLOCKED
- ActionMaskProvenance: IMPLEMENTED / TESTED locally; dataset sufficiency BLOCKED
- HumanGate metadata link: IMPLEMENTED / TESTED locally
- HumanGate promotion authority: BLOCKED
- Python `legal_mask` authority: PASSIVE helper / not authority
- Python legal_mask authority: PASSIVE helper only / not authority
- Python validate_am_dataset_admission(row): IMPLEMENTED / TESTED / fail-closed
- AdmissionResult: IMPLEMENTED / TESTED
- DatasetAdmissionError: IMPLEMENTED
- TeacherDataset admission gate: IMPLEMENTED_AND_TESTED
- train.py: PASSIVE unchanged; protected by TeacherDataset boundary before checkpoint writes
- Python move_vocab standard helper: IMPLEMENTED / TESTED
- Standard move-vocab parity: TESTED for current Python helper policy
- Rust-generated legal-action sample parity: IMPLEMENTED_AND_TESTED
- Rust/Python standard move compatibility: TESTED_SAMPLE_ONLY
- Policy index compatibility: TESTED_SAMPLE_ONLY
- sample position count: 5
- Rust-generated key count: 16
- promotions covered: TESTED
- castling covered: TESTED
- captures covered: TESTED
- debug fallback unencodable: TESTED fail-closed
- all sampled keys policy-encodable: YES
- all sampled indices roundtrip: YES
- legal_action_version: legal_action_v0
- action_mask_version: action_mask_v0_skeleton
- move_vocab size: 4164
- move_vocab fingerprint: 690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c
- coordinate entries: 3988
- promotion entries: 176
- classical castling keys: TESTED
- debug/malformed keys: TESTED fail-closed
- full Python vocab roundtrip: TESTED
- duplicate indices: TESTED, none found
- Search boundary: IMPLEMENTED; search remains final authority
- Search decomposition: IMPLEMENTED_AND_TARGET_TESTED locally / frozen
- Dataset admission: fail-closed / BLOCKED
- Dataset label readiness: BLOCKED
- Training readiness: BLOCKED
- No admissible dataset row path exists yet.
- No training run is allowed now.
- No dataset generation/reset is allowed now.
- Non-UCI/debug/unencodable actions: fail-closed / TESTED
- dataset/training: BLOCKED
- Chess960 runtime: BLOCKED
- Chess960 labels: BLOCKED
- Chess960 dataset/runtime: BLOCKED
- ActionMask dataset authority: BLOCKED
- Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED
- Rust/Python ActionMask authority: BLOCKED/UNKNOWN
- Neural authority: PASSIVE / proposal-rerank only
- claim verdict: NO_CLAIM_ALLOWED

Warnings:
- Do not treat the local AM stack as shared canonical repo truth until push, PR, and merge are authorized.
- Local AM helper stack freeze does not mean shared GitHub main truth.
- This docs update does not promote local state to GitHub main truth.
- Local AM helper implementation does not equal shared GitHub main truth.
- Local AM helper implementation does not authorize dataset labels, training, Chess960 runtime, neural authority, readiness, or claims.
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
- Future dataset admission requires explicit HumanDecision/HumanGate promotion path and Rust/Python compatibility contract.
- Future Rust/Python ActionMask authority requires a separate versioned compatibility contract and broader coverage.
- Future admissible rows must include ActionId, LegalAction, ActionMask/provenance, HumanGate state, move_vocab_fingerprint, ruleset, variant, and contamination status.
- Future Chess960 work requires explicit FEN/castling/action identity contracts.
- Rust-generated sample parity is frozen unless explicit HumanDecision reopens it.
- AM-DATA standard vocab parity is frozen unless explicit HumanDecision reopens it.
- AM-DATA runtime wiring is frozen after AM-DATA-8 unless explicitly reopened.
- Next safe actions are read-only audit for exhaustive Rust legal-action coverage feasibility, tests-only expansion if explicitly chosen, docs sync, or local archive if requested.
- Runtime patches for dataset admission allow-path, training, Chess960, or ActionMask authority remain BLOCKED unless explicitly authorized.

Recommendation:
- Keep this as an active publication gap until GitHub state can be inspected after an authorized publication path.
- Do not use local-only archive or benchmark material as shared implementation proof.
- Do not treat AM-DATA-10 Rust-generated legal-action sample parity, AM-DATA-8 standard move-vocab parity, or AM-DATA-5 fail-closed admission as training readiness; dataset labels and training remain BLOCKED until an explicit HumanDecision/HumanGate promotion path and Rust/Python ActionMask compatibility contract exist.

## 1. Conversion / Draw Problem

Status: ACTIVE

Current evidence:
- `lab/reports/latest_benchmark_summary.json` reports `benchmark_status: timeout`.
- `lab/reports/game_analysis/rocky_20game_decision_report.md` reports 16 draws in 20 self-play games.
- `lab/experiments/exp_003_aggressive/tournaments/match_conversion.csv` still contains rows where a clear material edge was not converted.
- `lab/reports/conversion_suite_v1_latest.json` reports 5/5 targeted conversion cases improved, but those cases are a targeted metric only.

Tests run:
- Not benchmark-tested during this refresh, by policy.
- Existing conversion report was inspected only.

Recommendation:
- Keep this issue active.
- Treat conversion-suite results as targeted behavioral evidence, not Elo or global strength evidence.
- Next safe work should improve conversion telemetry and failure classification before claiming behavioral progress.

## 2. Search Ceiling / Root Clone

Status: RESOLVED (2026-05-30, commit 9e17493)

Resolution:
- Root clone refactored. Search tree now uses simulate/undo throughout.
- The S-7 practical-policy pipeline (`select_root_move`, fork detection, worst-case sampling) deleted in 90fe323.
- Root selection is now pure argmax on alpha-beta score — simple and transparent.

Residual ceiling:
- Root still begins from `engine.clone()` and some helpers still simulate moves; structural performance ceiling reduced, not gone.
- Any future active `SearchBackend` route still requires separate HumanDecision and validation.

## 3. Dataset Router / Loader Semantic Mismatch

Status: ACTIVE AND REPRODUCED

Current evidence:
- `lab/ACTIVE_DATASET.txt` points to `lab/dataset`, a dataset root directory.
- `ml/dataset_loader.py` accepts a dataset directory and can load adaptive/phase mixes.
- `ml/dataset_decision_router.py` still treats an explicit directory input as a file-like JSONL surface.

Tests run:
- `.\.venv312\Scripts\python.exe` with `PYTHONPATH=...\ml` confirmed `dataset_loader.validate_training_dataset_path(Path('lab/dataset'))` accepts the directory.
- `.\.venv312\Scripts\python.exe ml\dataset_decision_router.py --input lab\dataset` failed with `Permission denied` on the directory path.

Recommendation:
- Fix router semantics before relying on curriculum/objective routing for active directory datasets.
- Router should either delegate row loading to `dataset_loader.load_dataset_rows` or explicitly branch for dataset roots.

## 4. Adaptive Dataset Proof Gap

Status: ACTIVE

Current evidence:
- Adaptive plumbing exists: weakness log, reverse dataset memory, priority training queue, phase-aware rows, adaptive weights.
- `lab/reports/learning_progress.json` currently reports `solved_weakness_count: 0` and `improvement_rate: 0.0`.
- The adaptive loop has operational evidence, but not repeated-error reduction evidence.

Tests run:
- No training or gameplay loop was run during this refresh.
- Existing `learning_progress.json` was inspected only.

Recommendation:
- Keep this issue active.
- Separate "adaptive loader works" from "adaptive learning improves behavior".
- A future validation packet needs repeated-error tracking across comparable runs, with fixed dataset/model identity and no strength claim.

## 5. AAA Proof Gap

Status: ACTIVE

Current evidence:
- AAA export/load/train fields exist in dataset and training surfaces.
- The available evidence supports plumbing and direction, not strength gain.
- AAA confidence signals exist, but they are not a scientific proof of improved play.

Tests run:
- No AAA training or export validation was run during this refresh.

Recommendation:
- Keep this issue active.
- Continue reporting AAA as operational unless a bounded evidence packet proves a narrower behavior.
- Never state that AAA proves strength gain.

## 6. Benchmark Interpretation Risk

Status: ACTIVE

Current evidence:
- `lab/reports/latest_benchmark_summary.json` currently reports `benchmark_status: timeout`.
- Older clean-smoke or valid-smoke notes must not override the latest committed/working benchmark summary.
- Smoke benchmark health is not playing strength.

Tests run:
- No benchmark was run during this refresh.

Recommendation:
- Keep this issue active.
- Label benchmark outputs as health/exploration unless a human-approved evidence protocol says otherwise.
- Do not use benchmark runs as proof.

## 7. FEN Serialization Is Not Full Runtime Truth

Status: RESOLVED (2026-05-27)

Resolution:
- `engine_to_fen` reads `engine.en_passant_target` and `engine.halfmove_clock` directly — no normalization.
- `apply_move` in `src/engine/engine.rs` maintains both fields correctly on every move:
  - `en_passant_target` set on double pawn push, cleared on all other moves.
  - `halfmove_clock` reset on pawn move or capture, incremented on quiet moves.
- `SearchMoveUndo` / `SearchNullMoveUndo` save and restore both fields correctly.
- Round-trip test `fen_round_trip_preserves_full_state_fields` passes with non-trivial values
  (`"... w KQkq d6 8 12"`), confirming parse→serialize symmetry.
- Engine tests `castling_execution_updates_fen_rights_*` verify halfmove_clock in live FEN output.

Residual note:
- Repetition key is the full FEN, which includes `halfmove_clock`. In standard chess, threefold
  repetition ignores the halfmove clock. This means two identical positions reached at different
  halfmove counts are treated as distinct for repetition purposes — a minor non-standard bias.
  Not a correctness bug; repetitions are missed conservatively, never overcounted.

Previous stale claim ("engine_to_fen normalizes en-passant to `-` and halfmove to `0`") was
accurate for an earlier code state before `fen.rs` was fully implemented.

## 8. Runtime / Python Bridge Stability

Status: ACTIVE, WITH PARTIAL IMPROVEMENT

Current evidence:
- The bridge has explicit startup logs such as `PYTHON_SELECTED|...` and `PYTHON_PATH_INVALID|...`.
- Startup path resolution still scans local Python candidates including `.venv312`, `.venv`, `.python312`, and `.venv312.venv312`.
- Runtime still depends on subprocess stdin/stdout, timeouts, environment stability and fallback handling.

Tests run:
- No neural bridge serve test was run during this refresh.
- Direct `.venv312\Scripts\python.exe` was used for dataset checks and worked.

Recommendation:
- Keep this issue active.
- Remove stale wording that says `.venv312` candidates were removed; that is not true in current code.
- Continue using direct interpreter execution on Windows instead of PowerShell activation.

## 9. Neural Quality And Selection Transparency

Status: ACTIVE

Current evidence:
- `src/agents/neural_agent.rs` remains monolithic: bridge, inference, rerank, fallback, telemetry and retrieval are mixed.
- Inference is request-oriented, not a stable batch scoring API.
- Rerank and fallback can obscure final move authority unless telemetry remains strict.

Tests run:
- No neural gameplay or inference quality test was run during this refresh.

Recommendation:
- Keep this issue active.
- Do not make quality or strength claims from neural activation.
- A safe future ticket is a read-only telemetry inventory or a split plan, not a broad neural refactor.

## 10. Data Reliability / Weakness Filtering

Status: ACTIVE, UPDATED

Current evidence:
- Negative and weakness-derived data remains partly heuristic.
- `ml/adaptive_dataset.py` now includes `weakness_training_filter`, confidence scoring and uncertainty flags.
- Therefore the old statement "no confidence filtering yet" is outdated.
- Filtering exists, but it does not prove semantic cleanliness or gameplay improvement.
- `dataset_audit.py` reads `termination_reason` and triages hard-cap rows.

Tests run:
- No dataset audit or export check was run during this refresh.

Recommendation:
- Keep the reliability issue active, but remove the stale "no confidence filtering" claim.
- Treat confidence filters as risk reduction, not validation.
- Do not reset datasets before stable action/observation contracts.

## 11. Architecture Contract Gaps

Status: ACTIVE

Current evidence:
- The runtime remains chess-first.
- `src/engine/engine.rs` is chess-specific despite a generic module name.
- Passive `LegalAction` / `ActionId`, `SearchBackend`, and `DecisionController` adapter work exists from PP12, PP14, and PP16.
- Those adapters are not active runtime replacements.
- Authoritative Rust `ActionMask`, versioned observations, active modular `DecisionController`, active `SearchBackend`, and `TelemetryCore` are not complete. (EvaluationSystem first-class : CLOSED via #12, 2026-05-30.)
- `NeuralPolicyValue` remains a paper-only candidate from PP18.

Tests run:
- No architecture tests were run during the 2026-05-11 docs sync.
- PP9-PP19 git history was inspected for merged passive/docs-only status.

Recommendation:
- Keep this issue active as architecture debt, not a bug.
- Do not broad-refactor engine/search/neural.
- Grow generic tactical architecture beside chess only after identity, telemetry and evaluation boundaries are stable.

## 12. Evaluation System Gap

Status: CLOSED (2026-05-30, T2/T3/T4/T5/T6)

Resolution:
- `src/evaluation/mod.rs` créé : EvalRunResult, RunIdentity, RegressionGuard, GuardThresholds.
- `src/evaluation/fixtures.rs` : 4 fixtures déterministes pour CI.
- `lab/reports/eval_smoke_baseline.json` : première baseline traçable (git=c0ebf62).
- `lab/reports/guard_test_output.json` : 6 tests de caractérisation, tous verts.
- `lab/reports/learning_progress.json` : schema v2.
- 13 tests evaluation au total, tous verts.
- EvaluationSystem first-class opérationnel avec RegressionGuard PASS/FAIL/INCONCLUSIVE.

## 13. Documentation Drift

Status: CLOSED (2026-05-30)

Resolution:
- Audit complet de 07_CURRENT_STATE.md confirmé correct par inspection directe du repo.
- Sprint 2026-05-30 synchronisé : neural wiring, EvaluationSystem, reward calibration.
- 03_KNOWN_ISSUES.md mis à jour : #2 et #12 fermés, #NEW-01 à #NEW-05 ouverts.
- 00_VISION.md mis à jour : note architecture neural câblé + curriculum planifié.

## 14. Studio Loop V1 Freeze Gaps

Status: ACTIVE / DOCUMENTED_ONLY

Current evidence:
- Studio loop V1 is frozen in `MASTER_DOCS` as active_runtime_code IMPLEMENTED, tests TESTED, tools_scripts IMPLEMENTED, artifacts_runtime_outputs TESTED, canonical_docs DOCUMENTED_ONLY, roadmap_docs_only DOCUMENTED_ONLY, inference PASSIVE, schemas PASSIVE, runtime_activation BLOCKED, and dataset/training/benchmark/model BLOCKED.
- The evidence basis is the Git-backed full loop in-memory harness, tested current_state local write, tested current_state -> mission -> inbox -> HumanGate -> plan dry-run, validated artifacts smoke, and docs stabilization commit `da0a86d0c922f79fa4fbbd955058b5a51df1fee9`.
- `.studio_state/current_state.json` remains ignored local operational state and still records some surfaces as `UNKNOWN`.
- This is a docs freeze, not a local-state rewrite.

Blocked:
- runtime activation
- benchmark proof
- training proof
- dataset generation/reset
- model checkpoint creation or promotion
- public claim
- global ready verdict

Recommendation:
- Keep `claim_posture: NO_CLAIM_ALLOWED`.
- Keep `no_global_ready_verdict: true`.
- Treat the next phase as one of: freeze/stabilize, first HumanGate-approved Codex execution on docs/tooling only, or cost/observability plane.
- Do not use the freeze as evidence for runtime activation, benchmark proof, training proof, dataset generation, model promotion, or public claims.

## NEW-01 : Neural Wiring

Status: RESOLVED (2026-05-30, commit c0ebf62)

Symptôme : NeuralAgent::select_action jamais appelé en tournoi/benchmark.
Cause    : simulation_runner routait "neural" via choose_best_action_with_trace comme tous les autres agents non-teacher.
Fix      : branche explicite mode=="neural" → neural_agent.select_action().
Impact   : tous les benchmarks précédents mesuraient heuristic_vs_heuristic, pas neural.
Vérifié  : selection_calls=20, successful_inferences=16, status=clean (smoke post-commit).

## NEW-02 : Draw Structurel

Status: OPEN (ouvert 2026-05-30)

Symptôme : 100% draws heuristic vs heuristic (300 parties) ET neural vs heuristic (160 parties).
Cause    : search déterministe depuis position symétrique standard → mêmes coups, même répétition, même résultat.
Impact   : self-play impossible sans variété de positions. Reward calibration (Charter A) sans effet.
Fix      : ouverture aléatoire (déjà dans teacher_uci_runner, à activer dans benchmark).
Priorité : HIGH — bloque tout apprentissage réel.

## NEW-03 : Dataset Corrompu

Status: OPEN (ouvert 2026-05-30)

Symptôme : 553 échantillons, 3 parties, 0% neural dans trainer_mix, result="1/2-1/2" sur tout.
Cause    : trainer_mix sans neural, lab_hard_turn_cap déclenché avant fin réelle de partie.
Impact   : value head apprise sur signal draw uniquement. Champs aaa_* tous null.
Fix      : régénérer avec neural dans trainer_mix, 200+ parties, vraies fins de partie.
Priorité : HIGH — bloque tout training réel.

## NEW-04 : Value Head Inutilisée

Status: OPEN (ouvert 2026-05-30)

Symptôme : model(tensor) retourne (policy_logits, value), value jeté systématiquement.
Cause    : infer_policy.py utilise uniquement policy_logits pour score_legal_moves.
Impact   : value head entraînée mais n'influence aucune décision.
Fix      : combined_score = 0.75 * policy_logit + 0.25 * value_scalar (Charter B).
Priorité : MEDIUM — à faire après dataset reconstruit (#NEW-03).

## NEW-05 : Curriculum Absent

Status: OPEN (ouvert 2026-05-30)

Symptôme : Rocky ne connaît pas les motifs tactiques de base (fourchette, clouage, mat en 1).
Cause    : aucun dataset de puzzles structuré par compétence. Apprentissage uniquement par self-play sur position symétrique.
Fix      : intégrer Lichess puzzles (3M, CC0) en 3 niveaux de difficulté via importeur CSV → PuzzleCase.
          Infrastructure existante : puzzle_eval.rs, PuzzleCase, engine_from_fen.
Priorité : HIGH — chaînon manquant entre "infère" et "joue bien".

## Removed From Active Known Issues

These items are no longer active known issues after the 2026-05-06 refresh:

- Legal action ordering as HashMap-order risk: `legal_actions` now sorts by `action_key`, and targeted legal-action tests passed.
- "No confidence filtering yet": confidence scoring and uncertainty filtering now exist in `ml/adaptive_dataset.py`.
- "Python bridge no longer relies on `.venv312` candidates": removed because current code still scans `.venv312`.

Removed 2026-05-27:

- Issue #7 FEN en-passant / halfmove normalization: stale claim. `engine_to_fen` and `apply_move`
  correctly maintain and serialize `en_passant_target` and `halfmove_clock`. Round-trip test passes.
  Residual bias: repetition key includes halfmove_clock (non-standard, minor, conservative).

## Claim Control

- software_verdict may discuss code health only.
- evidence_verdict may discuss targeted mechanical evidence only.
- claim_verdict defaults to `NO_CLAIM_ALLOWED`.
- Automation/evidence-plane work is partial control-plane only, not a finished autonomous system.
- PP9-PP19 documentation and passive adapter work is planning/scaffold evidence only, not proof of strength, readiness, promotion, or scientific progress.
- No Elo, strength, promotion, or scientific proof claim is allowed from this document.
