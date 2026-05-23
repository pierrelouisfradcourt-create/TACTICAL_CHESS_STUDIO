# Local History Roadmap Status

Status: DOCUMENTED_ONLY

Scope: local AM stack history and suspended publication state.

Claim verdict: NO_CLAIM_ALLOWED

This document is docs-only. It does not modify runtime code, tests, datasets, training, benchmarks, CI, GitHub state, publication flow, Chess960 runtime, DecisionController behavior, neural authority, or dataset label authority.

## Historical Note

PACK 9D was merged on GitHub.

After PACK 9D, local `main` accumulated 37 commits ahead of `origin/main` and 0 behind.

The local AM stack includes:

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

## AM Data Stack Frozen Locally

Status: DOCUMENTED_ONLY

- AM-DATA-10 completed locally.
- HEAD after AM-DATA-10: `eddf4fac`.
- Local `main` is 37 commits ahead of `origin/main` and 0 behind.
- GitHub main: NOT_FOUND for the local AM stack.
- GitHub main is NOT_FOUND for the local AM/Data stack.
- CI/PR/push are BLOCKED by money/CI constraints.

| Surface | Status | Notes |
| --- | --- | --- |
| Search decomposition | IMPLEMENTED_AND_TARGET_TESTED locally / frozen | Frozen after AM-SEARCH-12. |
| ActionId | IMPLEMENTED / TESTED locally | Standard runtime identity only. |
| LegalAction | IMPLEMENTED / TESTED locally | Minimal `action_id` + `action_key`. |
| Chess LegalAction adapter | IMPLEMENTED / TESTED locally | Standard helper path only. |
| ActionMask helper | IMPLEMENTED / TESTED locally | Helper only; not search authority. |
| ActionMaskProvenance | IMPLEMENTED / TESTED locally | Provenance carry helper only. |
| HumanGate metadata link | IMPLEMENTED / TESTED locally | Metadata link exists locally. |
| HumanGate promotion authority | BLOCKED | Requires explicit HumanDecision/HumanGate promotion path. |
| ActionMask dataset authority | BLOCKED | No dataset label authority. |
| Python `validate_am_dataset_admission(row)` | IMPLEMENTED / TESTED / fail-closed | Blocks unsafe rows locally; does not create training readiness. |
| AdmissionResult | IMPLEMENTED / TESTED | Local Python result type for admission decisions. |
| DatasetAdmissionError | IMPLEMENTED | Local fail-closed exception surface. |
| TeacherDataset admission gate | IMPLEMENTED_AND_TESTED | Boundary rejects inadmissible rows before training tensors/checkpoint writes. |
| `train.py` | PASSIVE unchanged | Protected by TeacherDataset boundary before checkpoint writes. |
| Python move_vocab standard helper | IMPLEMENTED / TESTED | Standard-UCI helper compatibility only; not a legality oracle. |
| Standard move-vocab parity | TESTED | Current Python helper policy only; not exhaustive Rust generator proof. |
| Rust-generated legal-action sample parity | IMPLEMENTED_AND_TESTED | Representative sample only; not exhaustive Rust generator proof and Not ActionMask authority. |
| Rust/Python standard move compatibility | TESTED_SAMPLE_ONLY | Sample position count: 5; Rust-generated key count: 16. |
| Policy index compatibility | TESTED_SAMPLE_ONLY | All sampled keys policy-encodable: YES; all sampled indices roundtrip: YES. |
| promotions covered | TESTED | Sample includes explicit promotion coverage. |
| castling covered | TESTED | Sample includes classical castling coverage. |
| captures covered | TESTED | Sample includes capture coverage. |
| debug fallback unencodable | TESTED fail-closed | Debug fallback stays unencodable and fail-closed. |
| legal_action_version | TESTED | `legal_action_v0`. |
| action_mask_version | TESTED | `action_mask_v0_skeleton`. |
| move_vocab size | TESTED | 4164 entries; fingerprint `690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c`. |
| coordinate entries | TESTED | 3988 entries. |
| promotion entries | TESTED | 176 entries. |
| classical castling keys | TESTED | `e1g1`, `e1c1`, `e8g8`, `e8c8`. |
| debug/malformed keys | TESTED fail-closed | Debug and malformed keys are rejected. |
| full Python vocab roundtrip | TESTED | Current Python vocabulary roundtrip passed locally. |
| duplicate indices | TESTED | None found. |
| Dataset admission | fail-closed / BLOCKED | No admissible dataset row path exists yet. |
| Non-UCI/debug/unencodable actions | fail-closed / TESTED | Covered by AM-CORE-6 local evidence. |
| Python `legal_mask` authority | PASSIVE helper / not authority | Rust/search remains authority. |
| Python legal_mask authority: PASSIVE | helper only / not authority | Rust/search remains authority. |
| Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED | UNKNOWN/BLOCKED | No compatibility contract authorizes dataset use. |
| Rust/Python ActionMask authority: BLOCKED/UNKNOWN | BLOCKED/UNKNOWN | Future authority requires a separate versioned compatibility contract. |
| Dataset label readiness | BLOCKED | Future rows require ActionId, LegalAction, ActionMask/provenance, HumanGate state, move_vocab_fingerprint, ruleset, variant, and contamination status. |
| Training readiness | BLOCKED | No training run is allowed now. |
| dataset/training | BLOCKED | No dataset generation/reset, promotion, or training authorized. |
| Chess960 runtime | BLOCKED | Requires explicit FEN/castling/action identity contracts. |
| Chess960 labels | BLOCKED | No Chess960 label authority. |
| Chess960 dataset/runtime | BLOCKED | No Chess960 dataset or runtime activation is authorized. |
| Neural authority | PASSIVE / proposal-rerank only | Neural proposes/reranks and never decides alone. |
| claim verdict | NO_CLAIM_ALLOWED | No strength, readiness, Elo, promotion, or scientific claim. |

## Roadmap Status

- AM stack exists locally.
- AM-DATA-10 completed locally at HEAD `eddf4fac`.
- GitHub `main` does not yet contain this stack.
- GitHub main: NOT_FOUND for the local AM stack.
- clean clone PACK7B does not contain `eddf4fac`.
- publication is suspended because PR, push, and CI are blocked by money/CI constraints.
- local archive exists at `LOCAL_ARCHIVE/AM_SYNC_3L_22_COMMITS_NO_CI/` and is passive evidence only.

## AM Search Decomposition Status

Status: IMPLEMENTED_AND_TARGET_TESTED locally through AM-SEARCH-12.

New module:

- `src/chess/search_diagnostics_builders.rs`

Moved responsibilities:

- `build_root_mate_diagnostics`
- `build_root_diagnostics`
- `maybe_emit_runtime_diagnostics`
- `search_runtime_diagnostics_enabled`
- related diagnostics-local builders/helpers

`src/chess/search.rs` retains:

- public search entrypoints
- root loop
- negamax
- quiescence
- transposition table integration
- killer/history heuristics
- budget/depth/node guards
- ordering calls
- result assembly

Deeper search splits are DEFERRED unless explicitly reopened by a future HumanDecision. Negamax, quiescence, transposition-table, and killer/history splits are DEFERRED. Diagnostics builders split: IMPLEMENTED / TESTED locally.

## Surface Table

| Surface | Status | Notes |
| --- | --- | --- |
| active runtime code | IMPLEMENTED locally / NOT_FOUND on GitHub main | Local runtime surfaces exist in the 37-commit AM/Data stack through AM-DATA-10 and freeze docs; GitHub `main` remains at `6a3314b573cb33350ad3a08a97112683d1ce4112`. |
| tests | TESTED only by previously reported targeted cargo commands / UNKNOWN for this docs update | This docs update runs no runtime tests. |
| artifacts/runtime outputs | PASSIVE local archive | Archive files are local outputs and do not prove shared repository state. |
| canonical docs | DOCUMENTED_ONLY | This file records local history status only. |
| roadmap/docs-only | DOCUMENTED_ONLY | Publication remains suspended. |
| inference | PASSIVE | No claim beyond local git/document inspection. |
| ActionId | IMPLEMENTED / TESTED locally | Standard runtime identity exists locally; dataset labels remain BLOCKED. |
| LegalAction | IMPLEMENTED / TESTED locally | Minimal `action_id` + `action_key`; no explicit actor/target/provenance fields. |
| Chess LegalAction adapter | IMPLEMENTED / TESTED locally | Adapter exists locally; GitHub main remains NOT_FOUND for this local AM stack. |
| ActionMask | IMPLEMENTED / TESTED locally | Rust helper only; not search authority and not dataset authority. |
| ActionMaskProvenance | IMPLEMENTED / TESTED locally | Rust provenance helper exists; dataset sufficiency remains BLOCKED. |
| HumanGate metadata link | IMPLEMENTED / TESTED locally | Metadata link exists locally; promotion authority remains BLOCKED. |
| HumanGate promotion authority | BLOCKED | Requires explicit HumanDecision/HumanGate promotion path. |
| Python `legal_mask` | PASSIVE | Helper only; not runtime legality authority. |
| Python move_vocab standard helper | IMPLEMENTED / TESTED | Standard-UCI helper compatibility only; not a legality oracle. |
| Standard move-vocab parity | TESTED | Current Python helper policy only; not exhaustive Rust generator proof. |
| Rust-generated legal-action sample parity | IMPLEMENTED_AND_TESTED | Representative sample only; not exhaustive Rust generator proof and Not ActionMask authority. |
| Rust/Python standard move compatibility | TESTED_SAMPLE_ONLY | sample position count: 5; Rust-generated key count: 16. |
| Policy index compatibility | TESTED_SAMPLE_ONLY | all sampled keys policy-encodable: YES; all sampled indices roundtrip: YES. |
| promotions/castling/captures covered | TESTED | Representative sample covers all three categories. |
| debug fallback unencodable | TESTED fail-closed | Debug fallback remains blocked from policy encoding. |
| legal_action_version | TESTED | `legal_action_v0`. |
| action_mask_version | TESTED | `action_mask_v0_skeleton`. |
| move_vocab size | TESTED | 4164 entries; fingerprint `690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c`. |
| coordinate entries | TESTED | 3988 entries. |
| promotion entries | TESTED | 176 entries. |
| classical castling keys | TESTED | `e1g1`, `e1c1`, `e8g8`, `e8c8`. |
| debug/malformed keys | TESTED fail-closed | Debug and malformed keys rejected. |
| full Python vocab roundtrip | TESTED | Current Python vocab roundtrip passed locally. |
| duplicate indices | TESTED | None found. |
| Python `validate_am_dataset_admission(row)` | IMPLEMENTED / TESTED / fail-closed | Local Python gate only; unsafe data is rejected. |
| AdmissionResult | IMPLEMENTED / TESTED | Local Python admission result. |
| DatasetAdmissionError | IMPLEMENTED | Local Python admission failure surface. |
| TeacherDataset admission gate | IMPLEMENTED_AND_TESTED | Protects `train.py` before checkpoint writes. |
| `train.py` | PASSIVE unchanged | Protected by TeacherDataset boundary before checkpoint writes. |
| Dataset label readiness | BLOCKED | No admissible dataset row path exists yet. |
| Training readiness | BLOCKED | No training run is allowed now. |
| Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED | UNKNOWN/BLOCKED | Compatibility contract is not established. |
| Rust/Python ActionMask authority: BLOCKED/UNKNOWN | BLOCKED/UNKNOWN | Separate versioned compatibility contract still required. |
| search decomposition | IMPLEMENTED_AND_TARGET_TESTED locally through AM-SEARCH-12 | Further risky splits are DEFERRED unless explicitly reopened. |
| diagnostics builders split | IMPLEMENTED / TESTED locally | Builders/emission moved to `src/chess/search_diagnostics_builders.rs`. |
| search boundary | IMPLEMENTED | Search remains final authority and does not consume ActionMask as authority. |
| dataset/training | BLOCKED | No dataset generation/reset, label promotion, or training is authorized. |
| Chess960 runtime | BLOCKED | No Chess960 runtime activation is authorized. |
| Chess960 labels | BLOCKED | No Chess960 label authority is authorized. |
| ActionMask dataset authority | BLOCKED | Dataset labels still require ActionId, LegalAction, ActionMask, provenance, and HumanGate. |
| Neural authority | PASSIVE / proposal-rerank only | Neural proposes/reranks and never decides alone. |
| claim verdict | NO_CLAIM_ALLOWED | No strength, readiness, Elo, promotion, or scientific claim is allowed. |

## Required Warning

Do not treat this roadmap/history update as proof of shared repository state.

This docs update does not promote the local stack to shared GitHub main truth.

This docs update does not promote local state to GitHub main truth.

Local AM helper stack freeze does not mean shared GitHub main truth.

Local AM helper implementation does not authorize dataset labels, training, Chess960 runtime, neural authority, or readiness claims.

Local test reports are local evidence only.

AM-DATA-10 does not authorize dataset labels, training, Chess960, neural authority, or product/scientific/strength/readiness claims.

Rust-generated legal-action sample parity is representative sample only; it is not exhaustive Rust generator proof.

Rust-generated legal-action sample parity is Not ActionMask authority.

Rust/Python standard move compatibility is TESTED_SAMPLE_ONLY.

Policy index compatibility is TESTED_SAMPLE_ONLY.

Standard move-vocab parity is standard-UCI helper compatibility only; it is not a legality oracle and not exhaustive Rust generator proof.

The Python gate blocks unsafe data; it does not make training ready.

Do not treat local archive, benchmark, logs, or reports as implementation proof.

Benchmark/log/report artifacts remain passive evidence only.

Repo inspection remains required before future claims.

No dataset/training/Chess960/neural authority/readiness claim is authorized.

Dataset/training: BLOCKED.

Future dataset admission requires explicit HumanDecision/HumanGate promotion path and Rust/Python compatibility contract.

Future Rust/Python ActionMask authority requires a separate versioned compatibility contract and broader coverage.

Future admissible rows must include ActionId, LegalAction, ActionMask/provenance, HumanGate state, move_vocab_fingerprint, ruleset, variant, and contamination status.

Future Chess960 work requires explicit FEN/castling/action identity contracts.

Rust-generated sample parity is frozen unless explicit HumanDecision reopens it.

AM-DATA standard vocab parity is frozen unless explicit HumanDecision reopens it.

AM-DATA runtime wiring is frozen after AM-DATA-8 unless explicitly reopened.

Next safe actions are read-only audit for exhaustive Rust legal-action coverage feasibility, tests-only expansion if explicitly chosen, docs sync, or local archive if requested.

Runtime patches for dataset admission allow-path, training, Chess960, or ActionMask authority remain BLOCKED unless explicitly authorized.

## Publication Boundary

- PR_CREATION_ALLOWED_NOW: NO
- PUSH_ALLOWED_NOW: NO
- CI_ALLOWED_NOW: NO
- TRAINING_ALLOWED_NOW: NO
- DATASET_LABEL_PROMOTION_ALLOWED_NOW: NO
- CHESS960_RUNTIME_ALLOWED_NOW: NO

## Verdicts

- docs_update_status: DOCUMENTED_ONLY
- local_am_helper_stack_status: IMPLEMENTED / TESTED locally through AM-DATA-10; NOT_FOUND on GitHub main
- standard_move_vocab_parity_status: TESTED for current Python helper policy
- rust_generated_legal_action_sample_parity_status: IMPLEMENTED_AND_TESTED
- rust_python_standard_move_compatibility: TESTED_SAMPLE_ONLY
- policy_index_compatibility: TESTED_SAMPLE_ONLY
- python_dataset_admission_gate_status: IMPLEMENTED / TESTED / fail-closed
- dataset_label_readiness: BLOCKED
- training_readiness: BLOCKED
- rust_python_actionmask_compatibility: UNKNOWN/BLOCKED
- chess960_dataset_readiness: BLOCKED
- actionmask_dataset_authority_status: BLOCKED
- humangate_promotion_authority_status: BLOCKED
- search_boundary_status: IMPLEMENTED; search remains final authority
- search_decomposition_status: IMPLEMENTED_AND_TARGET_TESTED locally through AM-SEARCH-12
- software_verdict: DOCUMENTED_ONLY
- evidence_verdict: PASSIVE_LOCAL_HISTORY_NOTE
- claim_verdict: NO_CLAIM_ALLOWED
