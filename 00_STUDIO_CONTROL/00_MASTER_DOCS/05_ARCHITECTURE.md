# Architecture

## Authority order

1. Active source code
2. Build files, manifests, latest runtime outputs
3. Current benchmark outputs
4. Current docs
5. Historical docs as archive only

If docs disagree with code, code wins.

Applied audit rule:

- latest committed artifacts beat older ledger claims, even when the latest artifact is a failure

## Roadmaps vs implementation

Strategic/roadmap documents (example: `AAA_TACTICAL_CORE_ARCHITECTURE.md`) can be used to guide long-term direction,
but they must not be read as implemented repo truth unless reflected in code + current artifacts.

Current idea-dump / roadmap buckets:

- `AAA_TACTICAL_CORE_ARCHITECTURE.md`: long-term reusable tactical core, cards/effects/rules/mutations, deterministic simulation, future frontend integration.
- `MASTER_DOCS/AUTOBATTLER_RELECTURE_2026_04_26/`: autobattler design extraction (draft, sideboard, controlled RNG, factions, terrain/effects, guardrails).
- `lab/project_genesis/`: raw genesis material and split extraction, useful for historical/product recovery only.

Implementation boundary:

- current implemented runtime remains chess-first
- generic tactical/card-game architecture should grow beside the chess runtime, not replace it in one destructive refactor
- Python remains acceptable for lab/training/orchestration; final game-runtime ambitions should prefer deterministic Rust-owned rules
- runtime/source truth outranks docs and roadmap fusion

## Recent PP9-PP19 consolidation

Verified on `main` through PP19 / PR #247:

| Surface | Current classification | Boundary |
| --- | --- | --- |
| engine/search/neural decomposition roadmap | docs-only | planning alignment only |
| engine/search/neural surface inventory | docs-only | active ownership map only |
| engine determinism characterization | tests-only | no runtime activation |
| `LegalAction` / `ActionId` adapter | passive | no action-flow replacement |
| search root boundary characterization | tests-only | no search tuning |
| `SearchBackend` adapter | passive | no active route replacement |
| decision routing contract plan | docs-only | no router mutation |
| `DecisionController` adapter | passive | no default routing activation |
| neural split inventory | docs-only | no neural mutation |
| `NeuralPolicyValue` | paper-only candidate | no implementation |
| master roadmap fusion | docs-only | no new control-plane or SSOT family |

Required invariants after this consolidation:

- Search remains final tactical authority.
- Neural never decides alone.
- `SearchBackend` remains passive.
- `DecisionController` remains passive.
- `NeuralPolicyValue` remains paper-only until a separate HumanDecision authorizes bounded implementation.
- `HumanDecision` remains final authority for activation, promotion, merge, reject, freeze, and claim status.
- Documentation is planning alignment, not proof.

## Studio Loop V1 Freeze

Status date: 2026-05-19.

Architecture status by surface:

| Surface | Status | Authority boundary |
| --- | --- | --- |
| active_runtime_code | IMPLEMENTED | Rust runtime truth remains Git-backed source code. |
| tests | TESTED | Validations are narrow and mechanical; no benchmark or strength proof. |
| tools_scripts | IMPLEMENTED | Studio loop dry-run/current-state/HumanGate/action-plan tooling is Git-backed. |
| artifacts_runtime_outputs | TESTED | Local state write and forbidden-output boundaries were tested; outputs are not canonical claims. |
| canonical_docs | DOCUMENTED_ONLY | Master docs record the freeze. |
| roadmap_docs_only | DOCUMENTED_ONLY | Future paths are planning surfaces only. |
| inference | PASSIVE | Neural proposes/reranks; Search remains final authority. |
| schemas | PASSIVE | Schemas constrain shape only. |
| runtime_activation | BLOCKED | No active Studio loop runtime or autonomous execution path. |
| dataset/training/benchmark/model | BLOCKED | No dataset generation/reset, training, benchmark proof, checkpoint creation, or promotion. |

Git-backed architecture surface:

- full loop in-memory harness
- current_state -> mission -> inbox -> HumanGate -> plan dry-run tooling
- control-plane schemas, fixtures, and docs
- docs stabilization commit `da0a86d0c922f79fa4fbbd955058b5a51df1fee9`

Local/passive architecture surface:

- `.studio_state/current_state.json` remains local ignored state.
- Local dry-run outputs and reports remain passive unless HumanGate promotes a narrower artifact.
- Local `current_state` still has `UNKNOWN` surfaces; this is documented drift, not an activation blocker by itself and not evidence of implementation beyond the tracked docs/tooling.

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

## Local AM stack boundary

Live branch, HEAD, and ahead/behind truth must be verified with Git before relying on any local/GitHub split statement. Historical SHA and ahead-count examples are local-history only and are not repeated here as active architecture truth.

Local state:

- local HEAD: verify live with `git rev-parse HEAD`
- branch/ahead state: verify live with `git status --short --branch`
- tracked/staged/untracked changes: verify live before edits
- GitHub/shared state: verify live before publication or claim language
- publication is BLOCKED by money/CI constraints.
- local archive exists as PASSIVE local archive only at `LOCAL_ARCHIVE/AM_SYNC_3L_22_COMMITS_NO_CI/`.

The AM stack includes ActionMask authority docs, minimal Rust ActionMask skeleton, chess legal-action adapter, ActionId / LegalAction constants, ActionMask provenance snapshot, HumanGate contract and minimal core, opponent response mask helper, MirrorRiskSummary, bounded root mirror ordering, mirror/root ordering diagnostics, search mirror ordering extraction, root ordering extraction, search diagnostics structs extraction, search diagnostics accumulators extraction, search diagnostics builders/emission extraction through AM-SEARCH-12, AM helper stack fail-closed hardening through AM-CORE-6, Python dataset admission fail-closed gate through AM-DATA-5, standard Python move_vocab helper parity evidence through AM-DATA-8, and representative Rust-generated legal-action sample parity evidence through AM-DATA-10.

AM helper stack frozen locally:

- AM-DATA-10 completed locally.
- Historical HEAD and ahead-count examples are local-history only.
- GitHub/shared AM/Data state is UNKNOWN until live verification.
- CI/PR/push are BLOCKED by money/CI constraints.

Search decomposition status:

- search decomposition: IMPLEMENTED_AND_TARGET_TESTED locally through AM-SEARCH-12
- new module: `src/chess/search_diagnostics_builders.rs`
- moved responsibilities: `build_root_mate_diagnostics`, `build_root_diagnostics`, `maybe_emit_runtime_diagnostics`, `search_runtime_diagnostics_enabled`, and related diagnostics-local builders/helpers
- `src/chess/search.rs` retains public search entrypoints, root loop, negamax, quiescence, transposition table integration, killer/history heuristics, budget/depth/node guards, ordering calls, and result assembly
- diagnostics builders split: IMPLEMENTED / TESTED locally
- deeper search splits: DEFERRED unless explicitly reopened by a future HumanDecision
- negamax/quiescence/TT/killer-history splits: DEFERRED

Architecture status:

- active runtime code: IMPLEMENTED locally; shared/GitHub state requires live verification
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
- Python `validate_am_dataset_admission(row)`: IMPLEMENTED / TESTED / fail-closed
- AdmissionResult: IMPLEMENTED / TESTED
- DatasetAdmissionError: IMPLEMENTED
- TeacherDataset admission gate: IMPLEMENTED_AND_TESTED
- `train.py`: PASSIVE unchanged; protected by TeacherDataset boundary before checkpoint writes
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
- GitHub main local AM stack: UNKNOWN until live verification
- CI/PR/push: BLOCKED by money/CI constraints
- Dataset label readiness: BLOCKED
- Training readiness: BLOCKED
- Dataset admission: fail-closed / BLOCKED
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
- Future dataset admission requires explicit HumanDecision/HumanGate promotion path and Rust/Python compatibility contract.
- Future Rust/Python ActionMask authority requires a separate versioned compatibility contract and broader coverage.
- Future admissible rows must include ActionId, LegalAction, ActionMask/provenance, HumanGate state, move_vocab_fingerprint, ruleset, variant, and contamination status.
- Future Chess960 work requires explicit FEN/castling/action identity contracts.
- Rust-generated sample parity is frozen unless explicit HumanDecision reopens it.
- AM-DATA standard vocab parity is frozen unless explicit HumanDecision reopens it.
- AM-DATA runtime wiring is frozen after AM-DATA-8 unless explicitly reopened.
- Next safe actions are read-only audit for exhaustive Rust legal-action coverage feasibility, tests-only expansion if explicitly chosen, docs sync, or local archive if requested.
- Runtime patches for dataset admission allow-path, training, Chess960, or ActionMask authority remain BLOCKED unless explicitly authorized.

## Runtime split

Rust owns runtime truth.
Python owns ML and orchestration.

## Rust side

Core runtime:
- `src/engine/engine.rs`
- `src/chess/search.rs`
- `src/chess/decision.rs`
- `src/tool/cli.rs`

Runtime responsibilities:
- board state
- legal move generation
- chess rule enforcement
- search
- decision routing
- teacher game generation
- tournament execution

FEN note:
- `src/chess/fen.rs` preserves board placement, side to move, and castling rights
- it currently normalizes en-passant to `-` and halfmove/fullmove to `0 1` on serialization
- therefore FEN serialization should not be treated as complete runtime truth for all state fields

## Python side

Core ML path:
- `ml/dataset_loader.py`
- `ml/export_dataset_check.py`
- `ml/train.py`
- `ml/infer_policy.py`
- `ml/move_vocab.py`

Python responsibilities:
- dataset validation
- dataset admission logic
- tensorization
- training
- model checkpoint writing
- neural inference service for Rust

Dataset path semantics:
- `ml/dataset_loader.py` accepts either a single JSONL file or a dataset directory
- the active dataset pointer can therefore reference an adaptive dataset root such as `lab/dataset/`

AM-DATA-8 local dataset and standard move-vocab evidence:
- `validate_am_dataset_admission(row)`: IMPLEMENTED / TESTED / fail-closed.
- `AdmissionResult`: IMPLEMENTED / TESTED.
- `DatasetAdmissionError`: IMPLEMENTED.
- `TeacherDataset admission gate`: IMPLEMENTED_AND_TESTED.
- `train.py`: PASSIVE unchanged; protected by TeacherDataset boundary before checkpoint writes.
- Dataset label readiness: BLOCKED.
- Training readiness: BLOCKED.
- No admissible dataset row path exists yet.
- Python `legal_mask` remains PASSIVE helper only and is not authority.
- Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED.
- Rust/Python ActionMask authority: BLOCKED/UNKNOWN.
- Python move_vocab standard helper: IMPLEMENTED / TESTED.
- Standard move-vocab parity: TESTED for current Python helper policy.
- Rust-generated legal-action sample parity: IMPLEMENTED_AND_TESTED.
- Rust/Python standard move compatibility: TESTED_SAMPLE_ONLY.
- Policy index compatibility: TESTED_SAMPLE_ONLY.
- sample position count: 5.
- Rust-generated key count: 16.
- promotions covered: TESTED.
- castling covered: TESTED.
- captures covered: TESTED.
- debug fallback unencodable: TESTED fail-closed.
- all sampled keys policy-encodable: YES.
- all sampled indices roundtrip: YES.
- legal_action_version: legal_action_v0.
- action_mask_version: action_mask_v0_skeleton.
- move_vocab size: 4164.
- move_vocab fingerprint: 690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c.
- coordinate entries: 3988.
- promotion entries: 176.
- classical castling keys: TESTED.
- debug/malformed keys: TESTED fail-closed.
- full Python vocab roundtrip: TESTED.
- duplicate indices: TESTED, none found.
- Standard move-vocab parity is standard-UCI helper compatibility only, not a legality oracle, and not exhaustive Rust generator proof.

## Bridge points

Teacher export:
- `src/simulation/teacher_uci_runner.rs`
- `src/ml/dataset_export.rs`

Neural runtime bridge:
- Rust caller: `src/agents/neural_agent.rs`
- Python callee: `ml/infer_policy.py`

Decision trace / AAA bridge:
- `src/chess/decision.rs`
- teacher export emits AAA metadata
- loader parses AAA metadata
- trainer reweights policy loss with `aaa_confidence`

## Data flow

1. Rust teacher produces game samples.
2. Export writes JSONL rows plus manifest data.
3. Python validation decides whether the dataset is admissible.
4. Training writes checkpoints and run manifests.
5. Rust neural agent loads the trained model through the Python bridge.
6. Tournament outputs become the benchmark surface.

## Current weak points in architecture

- search root still clones engine state
- search internals now use simulate/undo and have TT/killer/history/quiescence/LMR, so the remaining clone issue should be described precisely rather than as "full clone everywhere"
- conversion semantics are not clean in the promoted pedagogy pack
- benchmark interpretation remains risky and must not be used as strength proof
- doc authority drift existed until this SSOT rewrite
- dataset router semantics are not fully aligned with loader semantics for adaptive dataset-root operation
- adaptive loop is operational, but not scientifically proven as repeated improvement
- AAA plumbing is operational, but not scientifically proven as strength gain
- `SearchBackend`, `DecisionController`, and `LegalAction` / `ActionId` adapter work remains passive rather than active runtime replacement
- `NeuralPolicyValue` remains paper-only; no neural interface implementation is authorized by docs
