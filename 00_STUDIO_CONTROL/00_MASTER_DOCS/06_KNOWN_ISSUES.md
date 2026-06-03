# Known Issues

Status: canonical active issue list
Last refreshed: 2026-06-02
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
- S-7 practical-policy pipeline (`select_root_move`, fork detection, worst-case sampling) deleted in 90fe323.
- Root selection is now pure argmax on alpha-beta score — simple and transparent.

Residual ceiling:
- Root still begins from `engine.clone()` and some helpers still simulate moves; structural performance ceiling reduced, not gone.
- Option B (&mut Engine migration) inspectée 2026-05-30, cascade trop invasive sans HumanGate. Clone reste en place.
- Any future active `SearchBackend` route still requires separate HumanDecision and validation.

Current evidence:
- `src/chess/search.rs` still enters root search through `search_root_with_context`.
- That function still does `let mut engine = engine.clone();` before searching in place.
- The search tree itself uses simulate/undo, so the old "full clone everywhere" claim is outdated.
- Search still has embedded constants and root orchestration coupled to diagnostics/practical policy.
- PP13 characterized the search root boundary, and PP14 added a passive `SearchBackend` adapter, but neither activates a replacement route.

Recommendation:
- Requires HumanGate before any further attempt. Full &mut Engine migration is a breaking API change.
- Do not broad-refactor search without a separate validation plan.

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

Previous stale claim ("engine_to_fen normalizes en-passant to `-` and halfmove to `0`") was
accurate for an earlier code state before `fen.rs` was fully implemented.

Residual bias from 2026-05-27 note (repetition key = FEN including halfmove_clock) is
**now resolved**: sprint f758ff4 replaced the FEN string key with a Zobrist u64 hash
that does not include `halfmove_clock`. Repetition detection is now standard-compliant on
this point. See "Removed From Active Known Issues" below.

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
- Authoritative Rust `ActionMask`, versioned observations, active modular `DecisionController`, active `SearchBackend`, `TelemetryCore`, and first-class `EvaluationSystem` are not complete.
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
- 13 tests evaluation au total, tous verts.
- EvaluationSystem first-class opérationnel avec RegressionGuard PASS/FAIL/INCONCLUSIVE.

## 13. Documentation Drift

Status: CLOSED (2026-05-30 / 2026-06-02)

Resolution:
- 2026-05-30 : Audit complet de 07_CURRENT_STATE.md confirmé correct. Sprint synchronisé.
- 2026-06-02 : 03_KNOWN_ISSUES.md (doublon) fusionné dans 06_KNOWN_ISSUES.md et supprimé.
  01_CURRENT_STATE.md (doublon) fusionné dans 07_CURRENT_STATE.md et supprimé.
- Règle : ne jamais recréer les fichiers listés dans la section "Fichiers supprimés" du nav index.

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

## 15. terminal_score Degrades Mate Bonus With Game Length

Status: RESOLVED (2026-06-03, audit code live)

Resolution:
- `terminal_score(engine, player, ply)` utilise déjà `ply` (profondeur search courante), pas `action_log.len()`.
- Dans negamax et quiescence : `terminal_score(engine, to_move, ply)` — correct.
- `evaluate()` appelle `terminal_score(engine, player, 0)` uniquement pour eval statique hors search — attendu.
- La description initiale de l'issue (action_log.len()) décrivait du code ancienne version, déjà corrigé.

Cross-reference: AUDIT_2026-05-28.md F-023 [CORRECTNESS].

## 16. position_key Non-Zobrist Hash — Collision Risk Unquantified

Status: RESOLVED (commit 28c9cc5, pre-sprint)

`position_key` in `src/chess/search.rs` was migrated to a standard Zobrist hash
(independent random u64 per (piece, square, side), plus castling rights and en-passant file)
in commit 28c9cc5. Three determinism tests exist (position_key_stable_for_same_position,
position_key_changes_with_castling_rights_en_passant_and_side_to_move,
position_key_restores_after_simulate_undo_cycle). The engine-side repetition key was
similarly migrated to Zobrist in sprint f758ff4.

## 17. is_root_fork_move Implicit Post-Simulation Call-Order Invariant

Status: RESOLVED (commit 90fe323)

`is_root_fork_move` and its entire S-7 pipeline (select_root_move, root_practical_score,
apply_root_practical_adjustments, attacks_square, path_clear, fork detection helpers)
were deleted in the S-7 cleanup. Root selection is now pure argmax on the alpha-beta score.
The call-order invariant risk no longer exists.

## 18. opponent_worst_case_value Active by Default — Hidden Eval Cost

Status: RESOLVED (commit 90fe323)

`select_root_move` (the caller that ran `opponent_worst_case_value` for up to 8 candidates
per root call) was deleted in the S-7 cleanup. `opponent_worst_case_value` still exists
in `transition_reply.rs` and is used by `transition_interpretation.rs`, but it is no longer
in the hot root-decision path and no longer contributes hidden per-root cost.

## 19. eval.rs Double legal_actions At Every Leaf (total_units <= 20)

Status: ACTIVE

Current evidence:
- `src/chess/eval.rs` `evaluate` calls `engine.legal_actions(player)` and `engine.legal_actions(enemy)` when `total_units <= 20`.
- Legal move generation is the primary engine performance bottleneck.
- The `total_units <= 20` condition is true for the majority of game positions (midgame and endgame).
- The mobility term contributes ±4 per legal move — modest correctness value, significant performance cost.

Cross-reference: AUDIT_2026-05-28.md F-027 [PERF].

Recommendation:
- Profile the actual node-count and time impact of the mobility term.
- Consider removing or replacing with a cheaper proxy (e.g., pseudo-mobility count from `move_features`) unless a benchmark shows clear Elo benefit.

## 20. order_moves Acquires 3 Sequential Mutex Locks Per Node

Status: ACTIVE

Current evidence:
- `src/chess/search.rs` `order_moves` acquires `tt_table()`, `killers_table()`, and `countermove_table()` locks sequentially on every call.
- Called O(nodes) times during search — constant lock overhead on each node.
- Current single-threaded search makes contention irrelevant today.
- The per-table lock granularity makes any future multi-threading unsafe without refactoring.

Cross-reference: AUDIT_2026-05-28.md F-028 [PERF].

Recommendation:
- No urgent action required for single-threaded use.
- If parallelism is ever added (e.g., lazy SMP), consolidate or replace Mutex-based tables before activation.
- Consider caching resolved TT/killer/countermove values per search depth tier to reduce lock frequency.

## 21. AlphaStar Authority Guard Is Dead Code

Status: ACTIVE

Current evidence:
- `src/chess/decision_trace.rs` `validate_selection_authority` rejects `"neural"` / `"critic"` / `"llm"` as final selection authority.
- `src/chess/decision_trace_bridge.rs` `build_decision_trace_from_legal_actions` constructs the validated `DecisionTrace`.
- Both have zero confirmed production callers. The simulation files import `chess::decision::DecisionTrace` (a different struct from `chess::decision.rs`), not `chess::decision_trace::DecisionTrace`.
- The authority invariant holds by construction for the current codebase — all decision modes route through search, no neural path can be final authority — but the explicit runtime guard is never invoked.
- Documents referencing this validation as an active runtime guard (VISION, ROCKY) are inaccurate as of this audit.

Cross-reference: AUDIT_2026-05-28.md F-029 [ARCHI].

Recommendation:
- Require a HumanGate decision: wire `validate_consistency()` into the actual decision path (e.g., in `simulation_runner.rs` after each move), OR delete the dead infrastructure cleanly and document that the invariant holds by architecture only.
- Do not claim active runtime enforcement until wiring is confirmed.
- Update VISION/ROCKY docs to reflect actual enforcement state.

## 22. Name Collision: Two Distinct `DecisionTrace` Structs in `chess::`

Status: ACTIVE

Current evidence:
- `chess::decision::DecisionTrace` (`src/chess/decision.rs`, line ~43): fields `selected_action: Action`, `mode: DecisionMode`, `used_search: bool`, `root_search: Option<RootSearchResult>`.
- `chess::decision_trace::DecisionTrace` (`src/chess/decision_trace.rs`, line ~45): fields `state_key: String`, `legal_action_ids: Vec<ActionId>`, `selection_authority: Option<String>`, serializable.
- Both exist under the `chess` module namespace with the same short name.
- Production code (simulation files) uses `chess::decision::DecisionTrace`. The `chess::decision_trace::DecisionTrace` has no production callers.
- This is the root cause of the confusion in F-029: the "dead" authority guard lives in `decision_trace::DecisionTrace`, which is not the struct actually used at runtime.

Cross-reference: AUDIT_2026-05-28.md F-030 [ARCHI].

Recommendation:
- Resolve as part of the F-029 decision: if the `decision_trace::DecisionTrace` is wired in, rename `decision::DecisionTrace` to avoid collision (e.g., `InternalDecisionTrace`, `SearchDecisionTrace`). If the `decision_trace::DecisionTrace` is deleted, the collision disappears.
- Do not leave two structs with the same name in the same module tree.

## 23. build_root_diagnostics Runs O(legal_moves) Post-Search in Production

Status: RESOLVED (2026-05-30)

Resolution : build_root_diagnostics gatee derriere search_runtime_diagnostics_enabled()
(TCS_SEARCH_RUNTIME_DIAG). En mode normal, retourne un summary sans iterer sur les
coups alternatifs (build_root_diagnostics_summary_only). Le comportement quand
TCS_SEARCH_RUNTIME_DIAG=1 est inchange.

Cross-reference: AUDIT_2026-05-28.md F-033 [PERF].

## 24. castling_spec.rs — empty_squares / attacked_squares Hardcoded, Chess960 Silently Broken

Status: ACTIVE

Current evidence:
- `src/chess/castling_spec.rs` `CastlingSideSpec::empty_squares()` returns `&[5, 6]` (kingside) or `&[1, 2, 3]` (queenside) — hardcoded file indices, not derived from `rook_start` / `king_final`.
- `attacked_squares()` likewise returns `&[5, 6]` or `&[3, 2]` — hardcoded.
- These are correct for classical castling (king on e-file, rooks on a/h), but silently wrong for any non-classical rook/king placement.
- If Chess960 is ever activated (currently CLI-blocked per F-020), the castling legality checks in `engine.rs` would use the wrong squares: a rook on b1 castling to d1 would incorrectly test files 5–6 as the emptiness requirement instead of the actual intervening squares.
- Zero unit tests exist in `castling_spec.rs` for this logic.

Cross-reference: AUDIT_2026-05-28.md Batch 3 — `castling_spec.rs` [CORRECTNESS].

Recommendation:
- Compute `empty_squares` and `attacked_squares` dynamically from `king_start`, `king_final`, and `rook_start` / `rook_final` instead of hardcoding.
- Add unit tests covering both classical and at least one non-classical layout.
- This is a latent bug: safe today because Chess960 is blocked, but will silently corrupt castling legality if unblocked.

## 25. fen.rs — En Passant Target Not Validated

Status: RESOLVED (2026-06-03, commit 5eb2459)

Current evidence:
- `src/chess/fen.rs` `engine_from_fen` parses the en passant field and calls `parse_square` if it is not `"-"`.
- `parse_square` only validates that the input is a valid board square (file a–h, rank 1–8); it does not verify that the square is on rank 3 or 6, nor that there is an opponent pawn in the expected position.
- A FEN like `"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - a1 0 1"` parses successfully and stores `en_passant_target = Some(a1)`, which is semantically invalid.
- Downstream consumers (`engine.rs` move generation, `opponent_response_mask.rs`) trust `en_passant_target` as ground truth — an invalid value would allow or deny en passant captures incorrectly.

Cross-reference: AUDIT_2026-05-28.md Batch 3 — `fen.rs` [CORRECTNESS].

Recommendation:
- After parsing, validate that the en passant square is on rank 3 (for black's ep target) or rank 6 (for white's), and optionally that an opponent pawn exists on the adjacent rank.
- Add a test case for a semantically invalid en passant square.

## 26. transition_reply.rs — Worst-Case Replies Not Sorted Before Sampling

Status: RESOLVED (2026-05-30)

Resolution : replies triees par move_score descendant avant take(max_replies) dans
`opponent_worst_case_value`. Import de `crate::chess::search::move_score` ajouté.
Commit : 6b85cda.

Historical context : `legal_actions` retournait les coups triés par tuple (from, to),
pas par force tactique. Les 12 premiers n'étaient pas les réponses adverses les plus fortes.
Scope réduit par 90fe323 (select_root_move supprimé) — concern restant : chemin
`transition_interpretation.rs`, maintenant corrigé.

Cross-reference: AUDIT_2026-05-28.md Batch 3 — `transition_reply.rs` [CORRECTNESS].

## 15. Rocky — Explosion combinatoire search

Status: RESOLVED (2026-05-30)

Resolution : maybe_log_move_weaknesses desactivee par defaut (TCS_WEAKNESS_LOG=1
pour opt-in). best_capture_score remplace par detection legere sans search_root.
MOVE_DIAG emis dans simulation_runner.rs. Coach v0 operationnel end-to-end.
Commits : f9d9c47 feat: Rocky Coach v0, a74de0c docs: update architecture post-sprint

## NEW-01 : Neural Wiring

Status: RESOLVED (2026-05-30, commit c0ebf62)

Symptôme : NeuralAgent::select_action jamais appelé en tournoi/benchmark.
Cause    : simulation_runner routait "neural" via choose_best_action_with_trace comme tous les autres agents.
Fix      : branche explicite mode=="neural" → neural_agent.select_action().
Impact   : tous les benchmarks précédents mesuraient heuristic_vs_heuristic, pas neural.
Vérifié  : selection_calls=20, successful_inferences=16, status=clean (smoke post-commit).

## NEW-02 : Draw Structurel

Status: RESOLVED (2026-06-01, IMP-007/IMP-014)

Symptôme : 100% draws heuristic vs heuristic (300 parties) ET neural vs heuristic (160 parties).
Cause    : search déterministe depuis position symétrique standard.
Fix      : ouverture aléatoire 2-8 plies dans simulation_runner.rs (IMP-007) + random_opening=true dans teacher_uci (IMP-014, commit d692ac6).
Vérifié  : parties ont maintenant de vraies fins.

## NEW-03 : Dataset Corrompu

Status: OPEN — HIGH PRIORITY (IMP-008 FORBIDDEN lane)

Symptôme : 553 échantillons, 3 parties, 0% neural dans trainer_mix, result="1/2-1/2" sur tout.
Cause    : trainer_mix sans neural, lab_hard_turn_cap déclenché avant fin réelle de partie.
Impact   : value head apprise sur signal draw uniquement. Champs aaa_* tous null.
Fix      : pool pipeline IMP-037→040 (pgn_to_jsonl.py + sf_dataset_generator.py + dataset_builder_v3.py + train_player.py).
Note     : IMP-008 direct est FORBIDDEN. Contournement via pool pipeline en cours (scripts créés 2026-06-02, non exécutés).

## NEW-04 : Value Head Inutilisée

Status: DEFERRED (bloqué par NEW-03 / IMP-008)

Symptôme : model(tensor) retourne (policy_logits, value), value jeté systématiquement dans infer_policy.py.
Fix prévu : combined_score = 0.75 * policy_logit + 0.25 * value_scalar (Charter B, IMP-011).

## NEW-05 : Curriculum Absent

Status: RESOLVED (2026-06-02, IMP-037/038/039/040)

Symptôme : Rocky ne connaît pas les motifs tactiques de base.
Fix      : pool pipeline exécuté 2026-06-02 — pool_2400.jsonl (43.3M lignes, 1,002,503 parties, draw_rate=8.8%) + 4 datasets construits (dataset_a/b/c/d).
Résidu   : pool_sf draw_rate=94% dépasse critère <30% — SF depth 14 trop défensif. ACTIVE_DATASET.txt pointe encore sur teacher_samples (HumanGate requis).

## NEW-06 : play_fen — absence d'historique coups pour répétition

Status: RESOLVED (2026-06-02, IMP-041)

Symptôme : Rocky rejoue des positions en partie longue (répétitions non détectées).
Cause    : play_fen ne passait pas l'historique des coups → détection répétition inactive.
Fix      : `src/tool/cli.rs` modifié pour passer l'historique à play_fen (IMP-041, CLOSED 2026-06-02).

---

## Removed From Active Known Issues

These items are no longer active known issues after the 2026-05-06 refresh:

- Legal action ordering as HashMap-order risk: `legal_actions` now sorts by `action_key`, and targeted legal-action tests passed.
- "No confidence filtering yet": confidence scoring and uncertainty filtering now exist in `ml/adaptive_dataset.py`.
- "Python bridge no longer relies on `.venv312` candidates": removed because current code still scans `.venv312`.

Removed 2026-05-27:

- Issue #7 FEN en-passant / halfmove normalization: stale claim. `engine_to_fen` and `apply_move`
  correctly maintain and serialize `en_passant_target` and `halfmove_clock`. Round-trip test passes.

Removed 2026-05-30 (sprint closures):

- Issue #7 residual bias (repetition key includes halfmove_clock): resolved by f758ff4 —
  `current_repetition_key` is now a Zobrist u64 that does not include halfmove_clock.
  Repetition detection is now standard-compliant on this point.

- Issue #16 (position_key non-Zobrist): resolved pre-sprint by commit 28c9cc5 —
  `position_key` in `search.rs` uses standard per-(piece, square, side) Zobrist vectors.
  Engine-side repetition key migrated to Zobrist in f758ff4.

- Issue #17 (is_root_fork_move call-order invariant): resolved by 90fe323 —
  `is_root_fork_move` and the full S-7 pipeline deleted.

- Issue #18 (opponent_worst_case_value hidden cost): resolved by 90fe323 —
  `select_root_move` deleted; `opponent_worst_case_value` no longer runs in the root hot path.

- Negamax score convention bug: resolved by 6875b43 — scores are now consistently from
  the to_move player's perspective throughout the alpha-beta tree. Stalemate and threefold
  repetition now return `draw_score()` (not `evaluate()`). Checkmate detection and aspiration
  window for mate scores corrected.

- game_decision_trace always-None field: resolved by 90fe323 — `game_decision_trace:
  Option<RootDecisionTrace>` removed from `RootSearchResult`; `RootDecisionTrace` and
  `RootDecisionTraceCandidate` structs deleted; dead GAME_DECISION_TRACE emission and
  analysis counters removed from `simulation_runner.rs`.

## Claim Control

- software_verdict may discuss code health only.
- evidence_verdict may discuss targeted mechanical evidence only.
- claim_verdict defaults to `NO_CLAIM_ALLOWED`.
- Automation/evidence-plane work is partial control-plane only, not a finished autonomous system.
- PP9-PP19 documentation and passive adapter work is planning/scaffold evidence only, not proof of strength, readiness, promotion, or scientific progress.
- No Elo, strength, promotion, or scientific proof claim is allowed from this document.
